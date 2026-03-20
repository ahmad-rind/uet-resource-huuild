# UET Taxila Resource Hub — Full Backend Security & Functionality Overhaul

> **Instructions for Antigravity:** Read this entire document before touching any file. Every section is interconnected. Do not apply fixes partially — complete all parts. Where a fix is already done, skip it and move to the next one. Do not change any UI components, page layouts, or styling. Only modify `supabase.js`, `.env`, and produce the SQL blocks to run in the Supabase SQL editor.

---

## Context

This is a React + Vite + Supabase project. The frontend is complete. This document covers backend security vulnerabilities, missing database tables, broken RPC signatures, a broken trigger, and missing API functions that need to be created. After reading this document, Antigravity will know exactly what to fix, where, and why.

---

## PART 1 — SQL CHANGES (Run in Supabase SQL Editor)

### 1A. Fix the Broken Stats Trigger

The `STATS_OPTIMIZATION.sql` file has a typo — `AFTEER` instead of `AFTER` — which means the trigger was never successfully created. The `site_stats` table exists but is never updated, so the resource count and contributor count on the homepage are always stale.

Run this in the Supabase SQL editor:

```sql
DROP TRIGGER IF EXISTS tr_update_site_stats ON public.resources;
CREATE TRIGGER tr_update_site_stats
AFTER INSERT OR UPDATE OR DELETE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.update_site_stats_on_change();
```

Then reinitialize the stats to correct values:

```sql
UPDATE public.site_stats
SET value = (SELECT COUNT(*) FROM public.resources WHERE status = 'approved'),
    updated_at = NOW()
WHERE key = 'total_resources';

UPDATE public.site_stats
SET value = (SELECT COUNT(DISTINCT uploaded_by) FROM public.resources WHERE status = 'approved'),
    updated_at = NOW()
WHERE key = 'total_contributors';
```

---

### 1B. Revoke anon Access From All Admin RPCs

**This is the most critical security fix.** Every admin RPC is currently callable by anonymous users with no authentication. Anyone on the internet can call `admin_delete_resource`, `admin_approve_resource`, `admin_create_department`, etc. directly from a browser console with zero credentials.

Run this in the Supabase SQL editor to revoke all public access from admin functions:

```sql
REVOKE EXECUTE ON FUNCTION public.admin_get_all_resources() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_resources_by_status(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_resource(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_resource(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_resource(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_dept_breakdown() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_departments() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_department(text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_department(uuid, text, text, integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_department(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_courses(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_course(uuid, integer, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_course(uuid, integer, text, text, integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_course(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_bulk_import_courses(uuid, json) FROM anon;
```

Also revoke these once they are created in steps 1C, 1D, and 1E below:

```sql
REVOKE EXECUTE ON FUNCTION public.admin_get_contact_submissions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_contact_submission(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_submission_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_moderators() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_moderator(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_moderator(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_dismiss_flags(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_resource(uuid,text,text,text,integer,text,text,text,text) FROM anon;
```

---

### 1C. Create the Missing contact_submissions Table and RPCs

These functions are called in `supabase.js` but the table and RPCs have no SQL definition anywhere. This means the Contact page form and the admin Submissions Manager are both completely broken in production.

```sql
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL CHECK (char_length(trim(name)) >= 2),
  email      text        NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  type       text        NOT NULL DEFAULT 'Other' CHECK (type IN ('Suggestion', 'Issue', 'Other')),
  subject    text        NOT NULL CHECK (char_length(trim(subject)) >= 2),
  message    text        NOT NULL CHECK (char_length(trim(message)) >= 5),
  is_read    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public submit
CREATE OR REPLACE FUNCTION public.submit_contact_request(
  p_name    text,
  p_email   text,
  p_type    text    DEFAULT 'Other',
  p_subject text    DEFAULT '',
  p_message text    DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF char_length(trim(p_name)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Name too short');
  END IF;
  IF p_email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN json_build_object('success', false, 'error', 'Invalid email address');
  END IF;
  IF char_length(trim(p_subject)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Subject too short');
  END IF;
  IF char_length(trim(p_message)) < 5 THEN
    RETURN json_build_object('success', false, 'error', 'Message too short');
  END IF;

  INSERT INTO public.contact_submissions(name, email, type, subject, message)
  VALUES (
    trim(p_name),
    lower(trim(p_email)),
    COALESCE(NULLIF(trim(p_type), ''), 'Other'),
    trim(p_subject),
    trim(p_message)
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION public.submit_contact_request(text,text,text,text,text) TO anon, authenticated;

-- Admin get all
CREATE OR REPLACE FUNCTION public.admin_get_contact_submissions()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(s) ORDER BY s.created_at DESC)
  INTO v_result
  FROM public.contact_submissions s;
  RETURN COALESCE(v_result, '[]'::json);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_get_contact_submissions() TO authenticated;

-- Admin delete
CREATE OR REPLACE FUNCTION public.admin_delete_contact_submission(p_id uuid)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.contact_submissions WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found');
  END IF;
  RETURN json_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_delete_contact_submission(uuid) TO authenticated;

-- Admin mark read
CREATE OR REPLACE FUNCTION public.admin_mark_submission_read(p_id uuid)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.contact_submissions SET is_read = true WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found');
  END IF;
  RETURN json_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_mark_submission_read(uuid) TO authenticated;
```

---

### 1D. Create the Missing moderators Table and RPCs

Same situation — these are called in `supabase.js` and in `ModeratorsManager.tsx` but no SQL definition exists anywhere. The entire Moderators section of the admin panel is broken.

```sql
CREATE TABLE IF NOT EXISTS public.moderators (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL DEFAULT '',
  access_key text        NOT NULL UNIQUE,
  department text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;

-- Admin get all moderators
CREATE OR REPLACE FUNCTION public.admin_get_moderators()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_agg(row_to_json(m) ORDER BY m.created_at DESC)
  INTO v_result
  FROM public.moderators m;
  RETURN COALESCE(v_result, '[]'::json);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_get_moderators() TO authenticated;

-- Admin create moderator
CREATE OR REPLACE FUNCTION public.admin_create_moderator(
  p_key  text,
  p_dept text,
  p_name text DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF EXISTS(SELECT 1 FROM public.moderators WHERE access_key = trim(p_key)) THEN
    RETURN json_build_object('success', false, 'error', 'Access key already exists');
  END IF;

  INSERT INTO public.moderators(name, access_key, department)
  VALUES (trim(COALESCE(p_name, '')), trim(p_key), trim(p_dept))
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'id', v_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_create_moderator(text, text, text) TO authenticated;

-- Admin delete moderator
CREATE OR REPLACE FUNCTION public.admin_delete_moderator(p_id uuid)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.moderators WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Moderator not found');
  END IF;
  RETURN json_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_delete_moderator(uuid) TO authenticated;

-- Check moderator key (called during login — must be accessible to anon)
CREATE OR REPLACE FUNCTION public.check_moderator_key(p_key text)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mod RECORD;
BEGIN
  SELECT name, department INTO v_mod
  FROM public.moderators
  WHERE access_key = trim(p_key)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '[]'::json;
  END IF;

  RETURN json_build_array(
    json_build_object('name', v_mod.name, 'department', v_mod.department)
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.check_moderator_key(text) TO anon, authenticated;
```

---

### 1E. Create the Missing admin_dismiss_flags RPC

This function is called in `supabase.js` at `adminDismissFlags()` and in `AdminDashboard.tsx` but does not exist in any SQL file. The "Clear Flags" button on flagged resources is silently broken.

```sql
CREATE OR REPLACE FUNCTION public.admin_dismiss_flags(p_resource_id uuid)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.resources
  SET report_count = 0
  WHERE id = p_resource_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Resource not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_dismiss_flags(uuid) TO authenticated;
```

---

### 1F. Fix RPC Signature Mismatches Between supabase.js and SQL

The frontend calls several RPCs with parameters the SQL does not accept. This causes silent failures. Fix each SQL function to match what the frontend sends. Always update SQL to match JS — never the other way around.

**Fix 1: `admin_get_all_resources`**
Called with `{ p_dept: dept }` but SQL takes no parameters.

```sql
CREATE OR REPLACE FUNCTION public.admin_get_all_resources(p_dept text DEFAULT NULL)
RETURNS SETOF public.resources
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.resources
  WHERE (p_dept IS NULL OR department = p_dept)
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_all_resources(text) TO authenticated;
```

**Fix 2: `admin_get_resources_by_status`**
Called with `{ filter_status, p_dept }` but SQL only takes `filter_status`.

```sql
CREATE OR REPLACE FUNCTION public.admin_get_resources_by_status(
  filter_status text,
  p_dept        text DEFAULT NULL
)
RETURNS SETOF public.resources
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.resources
  WHERE status = filter_status
    AND (p_dept IS NULL OR department = p_dept)
  ORDER BY created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_resources_by_status(text, text) TO authenticated;
```

**Fix 3: `admin_get_stats`**
Called with `{ p_dept: dept }` but SQL takes no parameters.

```sql
CREATE OR REPLACE FUNCTION public.admin_get_stats(p_dept text DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total    BIGINT := 0;
  v_approved BIGINT := 0;
  v_pending  BIGINT := 0;
  v_rejected BIGINT := 0;
  v_flagged  BIGINT := 0;
  v_daily    JSON;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.resources WHERE (p_dept IS NULL OR department = p_dept);
  SELECT COUNT(*) INTO v_approved FROM public.resources WHERE status = 'approved' AND (p_dept IS NULL OR department = p_dept);
  SELECT COUNT(*) INTO v_pending  FROM public.resources WHERE status = 'pending'  AND (p_dept IS NULL OR department = p_dept);
  SELECT COUNT(*) INTO v_rejected FROM public.resources WHERE status = 'rejected' AND (p_dept IS NULL OR department = p_dept);
  SELECT COUNT(*) INTO v_flagged  FROM public.resources WHERE report_count > 0    AND (p_dept IS NULL OR department = p_dept);

  SELECT json_agg(d ORDER BY d.raw_day) INTO v_daily
  FROM (
    SELECT
      TO_CHAR(created_at::DATE, 'Dy') AS day,
      created_at::DATE                AS raw_day,
      COUNT(*)::INTEGER               AS count
    FROM public.resources
    WHERE created_at >= NOW() - INTERVAL '7 days'
      AND (p_dept IS NULL OR department = p_dept)
    GROUP BY created_at::DATE
  ) d;

  RETURN json_build_object(
    'total',    v_total,
    'approved', v_approved,
    'pending',  v_pending,
    'rejected', v_rejected,
    'flagged',  v_flagged,
    'daily',    COALESCE(v_daily, '[]'::JSON)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('total', 0, 'approved', 0, 'pending', 0, 'rejected', 0, 'flagged', 0, 'daily', '[]'::JSON);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_get_stats(text) TO authenticated;
```

**Fix 4: `search_approved_resources`**
Called with `{ p_query, p_type, p_dept, p_semester, p_course }` but SQL only takes `p_query`. All filtering happens in JS after a full fetch, which is inefficient.

```sql
CREATE OR REPLACE FUNCTION public.search_approved_resources(
  p_query    text    DEFAULT NULL,
  p_type     text    DEFAULT NULL,
  p_dept     text    DEFAULT NULL,
  p_semester integer DEFAULT NULL,
  p_course   text    DEFAULT NULL
)
RETURNS SETOF public.resources
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.resources
  WHERE status = 'approved'
    AND (p_type     IS NULL OR type        = p_type)
    AND (p_dept     IS NULL OR department  = p_dept)
    AND (p_semester IS NULL OR semester    = p_semester)
    AND (p_course   IS NULL OR course_code = p_course)
    AND (
      p_query IS NULL OR
      title       ILIKE '%' || p_query || '%' OR
      course_name ILIKE '%' || p_query || '%' OR
      course_code ILIKE '%' || p_query || '%' OR
      department  ILIKE '%' || p_query || '%' OR
      type        ILIKE '%' || p_query || '%' OR
      description ILIKE '%' || p_query || '%'
    )
  ORDER BY created_at DESC
  LIMIT 200;
$$;
GRANT EXECUTE ON FUNCTION public.search_approved_resources(text, text, text, integer, text) TO anon, authenticated;
```

**Fix 5: `get_approved_resources`**
Called with a `p_type` parameter but SQL does not accept it.

```sql
CREATE OR REPLACE FUNCTION public.get_approved_resources(
  p_department  text    DEFAULT NULL,
  p_semester    integer DEFAULT NULL,
  p_course_code text    DEFAULT NULL,
  p_type        text    DEFAULT NULL,
  p_limit       integer DEFAULT 100
)
RETURNS SETOF public.resources
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.resources
  WHERE status = 'approved'
    AND (p_department  IS NULL OR department  = p_department)
    AND (p_semester    IS NULL OR semester    = p_semester)
    AND (p_course_code IS NULL OR course_code = p_course_code)
    AND (p_type        IS NULL OR type        = p_type)
  ORDER BY created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 100), 500);
$$;
GRANT EXECUTE ON FUNCTION public.get_approved_resources(text, integer, text, text, integer) TO anon, authenticated;
```

---

### 1G. Create the Missing admin_update_resource RPC

Admins currently cannot edit a resource — they can only approve, reject, or delete. There is no way to fix a typo, a broken link, or a wrong course code without deleting and re-submitting. This RPC is also needed for a future edit UI.

```sql
CREATE OR REPLACE FUNCTION public.admin_update_resource(
  p_id          uuid,
  p_title       text,
  p_type        text,
  p_department  text,
  p_semester    integer,
  p_course_code text,
  p_course_name text,
  p_link        text,
  p_description text DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_link !~* '^https?://' THEN
    RETURN json_build_object('success', false, 'error', 'Link must start with http:// or https://');
  END IF;

  UPDATE public.resources SET
    title       = trim(p_title),
    type        = p_type,
    department  = trim(p_department),
    semester    = p_semester,
    course_code = trim(p_course_code),
    course_name = trim(p_course_name),
    link        = trim(p_link),
    description = trim(COALESCE(p_description, ''))
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Resource not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_update_resource(uuid,text,text,text,integer,text,text,text,text) TO authenticated;
```

---

## PART 2 — supabase.js Changes

### 2A. Remove Exposed Credentials

The current `supabase.js` has this line:

```js
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
```

Any variable prefixed with `VITE_` is bundled into the public JavaScript by Vite. Anyone visiting the site can open DevTools and read this password. Delete this line and every reference to `ADMIN_PASSWORD` throughout the file.

Also update the Supabase client initialization at the top of the file. Change:

```js
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

To:

```js
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```

---

### 2B. Replace the Fake sessionStorage Auth With Real Supabase Auth

Delete the entire Auth Session section of `supabase.js` (the block starting at `const ADMIN_PASSWORD` down to the end of the `getAdminSession` function) and replace it with the following. The exported function names stay the same so no other file needs to change.

```js
// ── ADMIN AUTH ────────────────────────────────────────────────────────────────
// Super admin logs in via Supabase Auth (real JWT session).
// Moderators log in via access key checked against the moderators table.
// IMPORTANT: The admin email is never stored in this file.
// Create the admin user manually in Supabase Dashboard → Authentication → Users.

const SESSION_KEY    = 'uet_admin_v3';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function adminLogin(password) {
  // 1. Try super admin via Supabase Auth
  // The admin email must be set in Supabase Dashboard → Auth → Users
  // Replace the email below with whatever email you used when creating the admin user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@uettaxila.edu.pk', // ← change to match email set in Supabase Dashboard
    password: password,
  });

  if (!authError && authData?.session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      loggedIn: true,
      loginAt:  Date.now(),
      role:     'super_admin',
    }));
    return true;
  }

  // 2. Try moderator access key
  try {
    const { data, error } = await supabase.rpc('check_moderator_key', { p_key: password });
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (!error && Array.isArray(parsed) && parsed.length > 0) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        loggedIn:   true,
        loginAt:    Date.now(),
        role:       'moderator',
        department: parsed[0].department,
        name:       parsed[0].name,
      }));
      return true;
    }
  } catch (err) {
    console.error('Moderator login error:', err);
  }

  return false;
}

export async function adminLogout() {
  await supabase.auth.signOut();
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAdminLoggedIn() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    if (!s.loggedIn) return false;
    if (Date.now() - s.loginAt > SESSION_TTL_MS) { adminLogout(); return false; }
    return true;
  } catch {
    return false;
  }
}

export function getAdminSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}
```

---

### 2C. Add the Missing adminUpdateResource Function

Add this function to `supabase.js` after the `adminDismissFlags` function:

```js
export async function adminUpdateResource(id, data) {
  try {
    const { data: result, error } = await supabase.rpc('admin_update_resource', {
      p_id:          id,
      p_title:       String(data.title       || '').trim(),
      p_type:        String(data.type        || '').trim(),
      p_department:  String(data.department  || '').trim(),
      p_semester:    Number(data.semester),
      p_course_code: String(data.courseCode  || '').trim(),
      p_course_name: String(data.courseName  || '').trim(),
      p_link:        String(data.link        || '').trim(),
      p_description: String(data.description || '').trim(),
    });
    if (error) return { success: false, error: error.message };
    const res = typeof result === 'string' ? JSON.parse(result) : result;
    return res || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

---

## PART 3 — .env File Changes

The `.env` file currently contains two dangerous variables that must be removed:

```
VITE_ADMIN_PASSWORD=uet-admin-2024       ← DELETE THIS LINE
VITE_SUPABASE_SERVICE_KEY=sb_secret_...  ← DELETE THIS LINE
```

The final `.env` file should contain exactly these two lines and nothing else:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Why:** Any variable prefixed with `VITE_` is injected into the public JavaScript bundle by Vite at build time. This means anyone visiting the site can open browser DevTools, go to Sources, and read the admin password and the service key. The service key has full database access and bypasses all Row Level Security policies.

---

## PART 4 — One Manual Step Required in Supabase Dashboard

After all code and SQL changes are done, the developer must do this once manually:

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add User**
3. Create a user with:
   - Email: `admin@uettaxila.edu.pk` (or any email you prefer — just make sure it matches the email in the `adminLogin` function in `supabase.js`)
   - Password: a strong password (this is now the admin panel password — store it securely, it is never in any code file)
4. That is the only step. No code changes needed.

---

## PART 5 — Verification Checklist

After completing all parts, verify every item in this list before considering the work done:

**Environment:**
- [ ] `.env` has exactly 2 variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] The string `VITE_ADMIN_PASSWORD` does not appear anywhere in any `.js`, `.ts`, or `.tsx` file
- [ ] The string `VITE_SUPABASE_SERVICE_KEY` does not appear anywhere in any `.js`, `.ts`, or `.tsx` file

**supabase.js:**
- [ ] Supabase client has `persistSession: true` and `autoRefreshToken: true`
- [ ] `adminLogin` uses `supabase.auth.signInWithPassword` for super admin
- [ ] `adminLogout` calls `supabase.auth.signOut()`
- [ ] `adminUpdateResource` function exists and is exported
- [ ] No reference to `ADMIN_PASSWORD` variable anywhere in the file

**SQL / Database:**
- [ ] Trigger `tr_update_site_stats` exists on `resources` table with correct `AFTER` spelling
- [ ] `site_stats` values have been reinitialized with correct counts
- [ ] All admin RPCs have `GRANT ... TO authenticated` only — no `TO anon`
- [ ] `check_moderator_key` and `submit_contact_request` are the only sensitive functions still granted to `anon`
- [ ] `contact_submissions` table exists with RLS enabled
- [ ] `moderators` table exists with RLS enabled
- [ ] All 5 previously missing RPCs now exist: `admin_dismiss_flags`, `submit_contact_request`, `admin_get_contact_submissions`, `admin_delete_contact_submission`, `admin_mark_submission_read`
- [ ] All 4 moderator RPCs now exist: `admin_get_moderators`, `admin_create_moderator`, `admin_delete_moderator`, `check_moderator_key`
- [ ] `admin_update_resource` RPC exists
- [ ] `admin_get_all_resources` accepts `p_dept text DEFAULT NULL`
- [ ] `admin_get_resources_by_status` accepts `p_dept text DEFAULT NULL`
- [ ] `admin_get_stats` accepts `p_dept text DEFAULT NULL`
- [ ] `search_approved_resources` accepts `p_type`, `p_dept`, `p_semester`, `p_course` parameters
- [ ] `get_approved_resources` accepts `p_type text DEFAULT NULL`

---

## Summary of What Was Wrong and Why It Matters

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | All admin RPCs callable by anyone with zero auth | 🔴 Critical | Full database can be deleted by anyone |
| 2 | Admin password in public JS bundle via VITE_ prefix | 🔴 Critical | Password readable in browser DevTools |
| 3 | Service key in public JS bundle via VITE_ prefix | 🔴 Critical | Full DB access bypassing all RLS |
| 4 | Auth is a client-side sessionStorage boolean | 🔴 Critical | Bypassed in one line via browser console |
| 5 | Stats trigger has typo — never ran | 🟡 High | Homepage stats always show 0 or stale data |
| 6 | contact_submissions table and RPCs missing | 🟡 High | Contact form and Submissions Manager broken |
| 7 | moderators table and RPCs missing | 🟡 High | Entire Moderators panel broken |
| 8 | admin_dismiss_flags RPC missing | 🟡 High | Clear Flags button silently fails |
| 9 | 5 RPC signature mismatches | 🟡 High | Filters silently ignored, wrong data returned |
| 10 | admin_update_resource RPC missing | 🟢 Medium | Admins cannot edit resource details |
