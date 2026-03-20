-- ================================================================
-- UET TAXILA RESOURCE HUB — NUCLEAR RESET + FULL SETUP
-- Project: https://supabase.com/dashboard/project/vhhmbhmpejfioaqgntcz/sql/new
-- PASTE THIS ENTIRE FILE AND CLICK RUN
-- ================================================================

-- ─── STEP 1: NUCLEAR DROP (drops EVERYTHING with exact signatures) ────────────

DROP TABLE IF EXISTS public.resources CASCADE;

-- Drop all possible function variants
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT ns.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.oid
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.proname IN (
        'submit_resource',
        'get_approved_resources',
        'get_resource_by_id',
        'get_recent_approved',
        'search_approved_resources',
        'get_dept_resource_counts',
        'increment_report',
        'admin_get_all_resources',
        'admin_get_resources_by_status',
        'admin_approve_resource',
        'admin_reject_resource',
        'admin_delete_resource',
        'admin_get_stats',
        'admin_get_dept_breakdown'
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_record.proname, func_record.args);
    RAISE NOTICE 'Dropped function: %.%(%)', func_record.nspname, func_record.proname, func_record.args;
  END LOOP;
END $$;

-- ─── STEP 2: CREATE TABLE ─────────────────────────────────────────────────────

CREATE TABLE public.resources (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL CHECK (char_length(trim(title)) >= 2),
  type         TEXT        NOT NULL CHECK (type IN (
                              'Past Paper','Study Material','Lab Manual',
                              'Document Template','Assignment','Notes','Other'
                           )),
  department   TEXT        NOT NULL CHECK (char_length(trim(department)) >= 2),
  semester     INTEGER     NOT NULL CHECK (semester BETWEEN 1 AND 8),
  course_code  TEXT        NOT NULL CHECK (char_length(trim(course_code)) >= 2),
  course_name  TEXT        NOT NULL CHECK (char_length(trim(course_name)) >= 2),
  link         TEXT        NOT NULL CHECK (link ~* '^https?://'),
  uploaded_by  TEXT        NOT NULL DEFAULT 'Anonymous',
  description  TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected')),
  report_count INTEGER     NOT NULL DEFAULT 0,
  admin_note   TEXT        NOT NULL DEFAULT '',
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_res_status      ON public.resources(status);
CREATE INDEX idx_res_dept        ON public.resources(department);
CREATE INDEX idx_res_semester    ON public.resources(semester);
CREATE INDEX idx_res_course_code ON public.resources(course_code);
CREATE INDEX idx_res_created_at  ON public.resources(created_at DESC);

-- ─── STEP 3: RLS — DENY ALL DIRECT TABLE ACCESS ───────────────────────────────
-- All reads/writes go through SECURITY DEFINER functions below.
-- The table itself is locked down completely.

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- No policies = deny all direct access (whitelist via functions only)

-- ─── STEP 4: PUBLIC FUNCTION — submit_resource ────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_resource(
  p_title       TEXT,
  p_type        TEXT,
  p_department  TEXT,
  p_semester    INTEGER,
  p_course_code TEXT,
  p_course_name TEXT,
  p_link        TEXT,
  p_uploaded_by TEXT DEFAULT 'Anonymous',
  p_description TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Validation
  IF char_length(trim(p_title)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Title must be at least 2 characters');
  END IF;

  IF p_type NOT IN ('Past Paper','Study Material','Lab Manual','Document Template','Assignment','Notes','Other') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid resource type');
  END IF;

  IF p_semester NOT BETWEEN 1 AND 8 THEN
    RETURN json_build_object('success', false, 'error', 'Semester must be between 1 and 8');
  END IF;

  IF p_link !~* '^https?://' THEN
    RETURN json_build_object('success', false, 'error', 'Link must be a valid URL starting with http:// or https://');
  END IF;

  IF char_length(trim(p_department)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Department is required');
  END IF;

  IF char_length(trim(p_course_code)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Course code is required');
  END IF;

  -- Insert
  INSERT INTO public.resources (
    title, type, department, semester, course_code,
    course_name, link, uploaded_by, description,
    status, report_count, admin_note
  )
  VALUES (
    trim(p_title),
    p_type,
    trim(p_department),
    p_semester,
    trim(p_course_code),
    trim(p_course_name),
    trim(p_link),
    COALESCE(NULLIF(trim(p_uploaded_by), ''), 'Anonymous'),
    COALESCE(trim(p_description), ''),
    'pending',
    0,
    ''
  )
  RETURNING id INTO new_id;

  RETURN json_build_object('success', true, 'id', new_id::TEXT);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── STEP 5: PUBLIC FUNCTION — get_approved_resources ────────────────────────

CREATE OR REPLACE FUNCTION public.get_approved_resources(
  p_department  TEXT    DEFAULT NULL,
  p_semester    INTEGER DEFAULT NULL,
  p_course_code TEXT    DEFAULT NULL,
  p_limit       INTEGER DEFAULT 100
)
RETURNS SETOF public.resources
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.resources
  WHERE status = 'approved'
    AND (p_department  IS NULL OR department  = p_department)
    AND (p_semester    IS NULL OR semester    = p_semester)
    AND (p_course_code IS NULL OR course_code = p_course_code)
  ORDER BY created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 100), 500);
$$;

-- ─── STEP 6: PUBLIC FUNCTION — get_resource_by_id ────────────────────────────

CREATE OR REPLACE FUNCTION public.get_resource_by_id(p_id UUID)
RETURNS SETOF public.resources
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.resources
  WHERE id = p_id
  LIMIT 1;
$$;

-- ─── STEP 7: PUBLIC FUNCTION — get_recent_approved ───────────────────────────

CREATE OR REPLACE FUNCTION public.get_recent_approved(p_count INTEGER DEFAULT 6)
RETURNS SETOF public.resources
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.resources
  WHERE status = 'approved'
  ORDER BY created_at DESC
  LIMIT LEAST(COALESCE(p_count, 6), 50);
$$;

-- ─── STEP 8: PUBLIC FUNCTION — search_approved_resources ─────────────────────

CREATE OR REPLACE FUNCTION public.search_approved_resources(p_query TEXT)
RETURNS SETOF public.resources
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.resources
  WHERE status = 'approved'
    AND (
      title       ILIKE '%' || p_query || '%' OR
      course_name ILIKE '%' || p_query || '%' OR
      course_code ILIKE '%' || p_query || '%' OR
      department  ILIKE '%' || p_query || '%' OR
      type        ILIKE '%' || p_query || '%' OR
      uploaded_by ILIKE '%' || p_query || '%' OR
      description ILIKE '%' || p_query || '%'
    )
  ORDER BY created_at DESC
  LIMIT 200;
$$;

-- ─── STEP 9: PUBLIC FUNCTION — get_dept_resource_counts ──────────────────────

CREATE OR REPLACE FUNCTION public.get_dept_resource_counts()
RETURNS TABLE(department TEXT, cnt BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department, COUNT(*)::BIGINT AS cnt
  FROM public.resources
  WHERE status = 'approved'
  GROUP BY department
  ORDER BY cnt DESC;
$$;

-- ─── STEP 10: PUBLIC FUNCTION — increment_report ─────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_report(p_resource_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resources
  SET report_count = report_count + 1
  WHERE id = p_resource_id;
$$;

-- ─── STEP 11: ADMIN FUNCTION — admin_get_all_resources ───────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_all_resources()
RETURNS SETOF public.resources
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.resources
  ORDER BY created_at DESC;
$$;

-- ─── STEP 12: ADMIN FUNCTION — admin_get_resources_by_status ─────────────────

CREATE OR REPLACE FUNCTION public.admin_get_resources_by_status(filter_status TEXT)
RETURNS SETOF public.resources
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.resources
  WHERE status = filter_status
  ORDER BY created_at DESC;
$$;

-- ─── STEP 13: ADMIN FUNCTION — admin_approve_resource ────────────────────────

CREATE OR REPLACE FUNCTION public.admin_approve_resource(
  resource_id UUID,
  note        TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resources
  SET
    status      = 'approved',
    admin_note  = COALESCE(note, ''),
    reviewed_at = NOW()
  WHERE id = resource_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Resource not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── STEP 14: ADMIN FUNCTION — admin_reject_resource ─────────────────────────

CREATE OR REPLACE FUNCTION public.admin_reject_resource(
  resource_id UUID,
  note        TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.resources
  SET
    status      = 'rejected',
    admin_note  = COALESCE(note, ''),
    reviewed_at = NOW()
  WHERE id = resource_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Resource not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── STEP 15: ADMIN FUNCTION — admin_delete_resource ─────────────────────────

CREATE OR REPLACE FUNCTION public.admin_delete_resource(resource_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.resources WHERE id = resource_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Resource not found');
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── STEP 16: ADMIN FUNCTION — admin_get_stats ───────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total    BIGINT := 0;
  v_approved BIGINT := 0;
  v_pending  BIGINT := 0;
  v_rejected BIGINT := 0;
  v_flagged  BIGINT := 0;
  v_daily    JSON;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.resources;
  SELECT COUNT(*) INTO v_approved FROM public.resources WHERE status = 'approved';
  SELECT COUNT(*) INTO v_pending  FROM public.resources WHERE status = 'pending';
  SELECT COUNT(*) INTO v_rejected FROM public.resources WHERE status = 'rejected';
  SELECT COUNT(*) INTO v_flagged  FROM public.resources WHERE report_count > 0;

  SELECT json_agg(d ORDER BY d.raw_day)
  INTO v_daily
  FROM (
    SELECT
      TO_CHAR(created_at::DATE, 'Dy') AS day,
      created_at::DATE                AS raw_day,
      COUNT(*)::INTEGER               AS count
    FROM public.resources
    WHERE created_at >= NOW() - INTERVAL '7 days'
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
  RETURN json_build_object(
    'total', 0, 'approved', 0, 'pending', 0,
    'rejected', 0, 'flagged', 0, 'daily', '[]'::JSON
  );
END;
$$;

-- ─── STEP 17: ADMIN FUNCTION — admin_get_dept_breakdown ──────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_dept_breakdown()
RETURNS TABLE(department TEXT, total BIGINT, approved BIGINT, pending BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    department,
    COUNT(*)                                     AS total,
    COUNT(*) FILTER (WHERE status = 'approved')  AS approved,
    COUNT(*) FILTER (WHERE status = 'pending')   AS pending
  FROM public.resources
  GROUP BY department
  ORDER BY total DESC;
$$;

-- ─── STEP 18: GRANT EXECUTE TO anon ROLE ─────────────────────────────────────
-- Critical: without this, the JS client (using anon key) can't call any function

-- SECURITY: Admin functions must NOT be granted to the 'anon' role.
-- Admin functions should only be accessible by trusted roles or via middleware.
-- For now, we only grant public functions to 'anon'.
GRANT EXECUTE ON FUNCTION public.submit_resource(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT)          TO anon;
GRANT EXECUTE ON FUNCTION public.get_approved_resources(TEXT, INTEGER, TEXT, INTEGER)                              TO anon;
GRANT EXECUTE ON FUNCTION public.get_resource_by_id(UUID)                                                          TO anon;
GRANT EXECUTE ON FUNCTION public.get_recent_approved(INTEGER)                                                      TO anon;
GRANT EXECUTE ON FUNCTION public.search_approved_resources(TEXT)                                                   TO anon;
GRANT EXECUTE ON FUNCTION public.get_dept_resource_counts()                                                        TO anon;
GRANT EXECUTE ON FUNCTION public.increment_report(UUID)                                                            TO anon;

-- Also grant to authenticated role just in case
GRANT EXECUTE ON FUNCTION public.submit_resource(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approved_resources(TEXT, INTEGER, TEXT, INTEGER)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resource_by_id(UUID)                                                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_approved(INTEGER)                                                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_approved_resources(TEXT)                                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dept_resource_counts()                                                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_report(UUID)                                                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_resources()                                                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_resources_by_status(TEXT)                                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_resource(UUID, TEXT)                                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_resource(UUID, TEXT)                                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_resource(UUID)                                                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_stats()                                                                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_dept_breakdown()                                                        TO authenticated;

-- ─── STEP 19: INSERT SAMPLE DATA (optional, for testing) ─────────────────────

INSERT INTO public.resources (title, type, department, semester, course_code, course_name, link, uploaded_by, description, status)
VALUES
  ('Mid Term 2023 Paper', 'Past Paper', 'Computer Science (BSc)', 3, 'CS-201', 'Data Structures and Algorithms', 'https://drive.google.com/sample1', 'Ali Hassan', 'Mid term paper from 2023 with solutions', 'approved'),
  ('Complete Notes Chapter 1-5', 'Notes', 'Electrical Engineering (BSc)', 2, 'EE-121', 'Electronic Devices & Circuits', 'https://drive.google.com/sample2', 'Sara Khan', 'Comprehensive notes covering first 5 chapters', 'approved'),
  ('Lab Manual Spring 2024', 'Lab Manual', 'Civil Engineering (BSc)', 4, 'CE-209', 'Mechanics of Solids-I', 'https://drive.google.com/sample3', 'Ahmed Raza', 'Full lab manual with experiments', 'approved'),
  ('Final Exam 2022', 'Past Paper', 'Software Engineering (BSc)', 5, 'SE-301', 'Software Quality Engineering', 'https://drive.google.com/sample4', 'Fatima Malik', 'Final exam paper 2022', 'approved'),
  ('Assignment 2 Solution', 'Assignment', 'Artificial Intelligence (BS)', 4, 'CS-209', 'Machine Learning', 'https://drive.google.com/sample5', 'Usman Ali', 'Detailed solution for assignment 2', 'approved'),
  ('Pending Resource Test', 'Study Material', 'Mathematics (BS)', 1, 'MTH-111', 'Calculus and Analytic Geometry', 'https://drive.google.com/sample6', 'Test User', 'This is a pending resource', 'pending');

-- ─── STEP 20: VERIFICATION ───────────────────────────────────────────────────

SELECT
  '✅ ' || routine_name AS function_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'submit_resource',
    'get_approved_resources',
    'get_resource_by_id',
    'get_recent_approved',
    'search_approved_resources',
    'get_dept_resource_counts',
    'increment_report',
    'admin_get_all_resources',
    'admin_get_resources_by_status',
    'admin_approve_resource',
    'admin_reject_resource',
    'admin_delete_resource',
    'admin_get_stats',
    'admin_get_dept_breakdown'
  )
ORDER BY routine_name;

-- Show table
SELECT '✅ resources table' AS object, COUNT(*) AS row_count FROM public.resources;
