-- ============================================================
-- UET TAXILA RESOURCE HUB — CATEGORIES MANAGEMENT SQL
-- Run this in: https://supabase.com/dashboard/project/vhhmbhmpejfioaqgntcz/sql/new
-- ============================================================

-- ── 1. DEPARTMENTS TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.departments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  description text        NOT NULL DEFAULT '',
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. COURSES TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   uuid        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  department_name text        NOT NULL,
  semester        integer     NOT NULL CHECK (semester BETWEEN 1 AND 8),
  code            text        NOT NULL,
  name            text        NOT NULL,
  credit_hours    integer     NOT NULL DEFAULT 3,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id, semester, code)
);

-- ── 3. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_dept_id   ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_semester  ON public.courses(semester);
CREATE INDEX IF NOT EXISTS idx_courses_dept_sem  ON public.courses(department_id, semester);
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(is_active);

-- ── 4. ENABLE RLS (deny all direct access) ───────────────────
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses     ENABLE ROW LEVEL SECURITY;

-- Drop old policies first
DROP POLICY IF EXISTS "dept_public_read"   ON public.departments;
DROP POLICY IF EXISTS "course_public_read" ON public.courses;

-- Public can READ active departments & courses
CREATE POLICY "dept_public_read" ON public.departments
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "course_public_read" ON public.courses
  FOR SELECT TO anon USING (is_active = true);

-- ── 5. UPDATED_AT TRIGGER ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_courses_updated_at ON public.courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. RPC: GET ALL DEPARTMENTS (public) ─────────────────────
DROP FUNCTION IF EXISTS public.get_departments();
CREATE OR REPLACE FUNCTION public.get_departments()
RETURNS SETOF public.departments
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT * FROM public.departments WHERE is_active = true ORDER BY sort_order, name;
$$;
GRANT EXECUTE ON FUNCTION public.get_departments() TO anon, authenticated;

-- ── 7. RPC: GET COURSES FOR A DEPT+SEMESTER (public) ─────────
DROP FUNCTION IF EXISTS public.get_courses(uuid, integer);
CREATE OR REPLACE FUNCTION public.get_courses(
  p_department_id uuid,
  p_semester      integer DEFAULT NULL
)
RETURNS SETOF public.courses
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT * FROM public.courses
  WHERE department_id = p_department_id
    AND is_active = true
    AND (p_semester IS NULL OR semester = p_semester)
  ORDER BY semester, code;
$$;
GRANT EXECUTE ON FUNCTION public.get_courses(uuid, integer) TO anon, authenticated;

-- ── 8. ADMIN: GET ALL DEPARTMENTS (with counts) ───────────────
DROP FUNCTION IF EXISTS public.admin_get_departments();
CREATE OR REPLACE FUNCTION public.admin_get_departments()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id',             d.id,
      'name',           d.name,
      'description',    d.description,
      'is_active',      d.is_active,
      'sort_order',     d.sort_order,
      'created_at',     d.created_at,
      'updated_at',     d.updated_at,
      'course_count',   (SELECT COUNT(*) FROM public.courses c WHERE c.department_id = d.id AND c.is_active = true),
      'semester_count', (SELECT COUNT(DISTINCT semester) FROM public.courses c WHERE c.department_id = d.id AND c.is_active = true)
    ) ORDER BY d.sort_order, d.name
  ) INTO v_result FROM public.departments d;
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_departments() TO anon, authenticated;

-- ── 9. ADMIN: CREATE DEPARTMENT ──────────────────────────────
DROP FUNCTION IF EXISTS public.admin_create_department(text, text, integer);
CREATE OR REPLACE FUNCTION public.admin_create_department(
  p_name        text,
  p_description text    DEFAULT '',
  p_sort_order  integer DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.departments WHERE LOWER(name) = LOWER(TRIM(p_name))
  ) INTO v_exists;

  IF v_exists THEN
    RETURN json_build_object('success', false, 'error', 'Department with this name already exists');
  END IF;

  INSERT INTO public.departments(name, description, sort_order)
  VALUES(TRIM(p_name), TRIM(COALESCE(p_description, '')), COALESCE(p_sort_order, 0))
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_department(text, text, integer) TO anon, authenticated;

-- ── 10. ADMIN: UPDATE DEPARTMENT ─────────────────────────────
DROP FUNCTION IF EXISTS public.admin_update_department(uuid, text, text, integer, boolean);
CREATE OR REPLACE FUNCTION public.admin_update_department(
  p_id          uuid,
  p_name        text,
  p_description text    DEFAULT '',
  p_sort_order  integer DEFAULT 0,
  p_is_active   boolean DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.departments WHERE id = p_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN json_build_object('success', false, 'error', 'Department not found');
  END IF;

  UPDATE public.departments SET
    name        = TRIM(p_name),
    description = TRIM(COALESCE(p_description, '')),
    sort_order  = COALESCE(p_sort_order, 0),
    is_active   = COALESCE(p_is_active, true)
  WHERE id = p_id;

  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_department(uuid, text, text, integer, boolean) TO anon, authenticated;

-- ── 11. ADMIN: DELETE DEPARTMENT ─────────────────────────────
DROP FUNCTION IF EXISTS public.admin_delete_department(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_department(p_id uuid)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_resource_count integer; v_dept_name text;
BEGIN
  SELECT name INTO v_dept_name FROM public.departments WHERE id = p_id;
  IF v_dept_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Department not found');
  END IF;

  SELECT COUNT(*) INTO v_resource_count
  FROM public.resources
  WHERE department = v_dept_name;

  IF v_resource_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Cannot delete: %s resources are linked to this department', v_resource_count)
    );
  END IF;

  DELETE FROM public.departments WHERE id = p_id;
  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_department(uuid) TO anon, authenticated;

-- ── 12. ADMIN: GET COURSES FOR DEPT ──────────────────────────
DROP FUNCTION IF EXISTS public.admin_get_courses(uuid);
CREATE OR REPLACE FUNCTION public.admin_get_courses(p_department_id uuid DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id',              c.id,
      'department_id',   c.department_id,
      'department_name', c.department_name,
      'semester',        c.semester,
      'code',            c.code,
      'name',            c.name,
      'credit_hours',    c.credit_hours,
      'is_active',       c.is_active,
      'created_at',      c.created_at,
      'updated_at',      c.updated_at
    ) ORDER BY c.semester, c.code
  ) INTO v_result
  FROM public.courses c
  WHERE (p_department_id IS NULL OR c.department_id = p_department_id);

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_courses(uuid) TO anon, authenticated;

-- ── 13. ADMIN: CREATE COURSE ─────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_create_course(uuid, integer, text, text, integer);
CREATE OR REPLACE FUNCTION public.admin_create_course(
  p_department_id uuid,
  p_semester      integer,
  p_code          text,
  p_name          text,
  p_credit_hours  integer DEFAULT 3
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id uuid; v_dept_name text; v_exists boolean;
BEGIN
  SELECT name INTO v_dept_name FROM public.departments WHERE id = p_department_id;
  IF v_dept_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Department not found');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.courses
    WHERE department_id = p_department_id
      AND semester = p_semester
      AND LOWER(code) = LOWER(TRIM(p_code))
  ) INTO v_exists;

  IF v_exists THEN
    RETURN json_build_object('success', false, 'error', 'Course code already exists in this semester');
  END IF;

  INSERT INTO public.courses(department_id, department_name, semester, code, name, credit_hours)
  VALUES(
    p_department_id,
    v_dept_name,
    p_semester,
    UPPER(TRIM(p_code)),
    TRIM(p_name),
    COALESCE(p_credit_hours, 3)
  )
  RETURNING id INTO v_id;

  RETURN json_build_object('success', true, 'id', v_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_course(uuid, integer, text, text, integer) TO anon, authenticated;

-- ── 14. ADMIN: UPDATE COURSE ─────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_update_course(uuid, integer, text, text, integer, boolean);
CREATE OR REPLACE FUNCTION public.admin_update_course(
  p_id           uuid,
  p_semester     integer,
  p_code         text,
  p_name         text,
  p_credit_hours integer DEFAULT 3,
  p_is_active    boolean DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.courses WHERE id = p_id) INTO v_exists;
  IF NOT v_exists THEN
    RETURN json_build_object('success', false, 'error', 'Course not found');
  END IF;

  UPDATE public.courses SET
    semester     = p_semester,
    code         = UPPER(TRIM(p_code)),
    name         = TRIM(p_name),
    credit_hours = COALESCE(p_credit_hours, 3),
    is_active    = COALESCE(p_is_active, true)
  WHERE id = p_id;

  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_course(uuid, integer, text, text, integer, boolean) TO anon, authenticated;

-- ── 15. ADMIN: DELETE COURSE ─────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_delete_course(uuid);
CREATE OR REPLACE FUNCTION public.admin_delete_course(p_id uuid)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_resource_count integer; v_code text; v_dept text;
BEGIN
  SELECT c.code, c.department_name INTO v_code, v_dept
  FROM public.courses c WHERE id = p_id;

  IF v_code IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Course not found');
  END IF;

  SELECT COUNT(*) INTO v_resource_count
  FROM public.resources
  WHERE course_code = v_code AND department = v_dept;

  IF v_resource_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Cannot delete: %s resources linked to this course', v_resource_count)
    );
  END IF;

  DELETE FROM public.courses WHERE id = p_id;
  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_course(uuid) TO anon, authenticated;

-- ── 16. ADMIN: BULK IMPORT COURSES (FIXED) ───────────────────
-- NOTE: GET DIAGNOSTICS must assign to a plain variable, then we add manually
DROP FUNCTION IF EXISTS public.admin_bulk_import_courses(uuid, json);
CREATE OR REPLACE FUNCTION public.admin_bulk_import_courses(
  p_department_id uuid,
  p_courses       json  -- array of {semester, code, name, credit_hours}
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dept_name   text;
  v_inserted    integer := 0;
  v_skipped     integer := 0;
  v_row_count   integer := 0;
  v_course      json;
BEGIN
  SELECT name INTO v_dept_name FROM public.departments WHERE id = p_department_id;
  IF v_dept_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Department not found');
  END IF;

  FOR v_course IN SELECT * FROM json_array_elements(p_courses) LOOP
    BEGIN
      INSERT INTO public.courses(department_id, department_name, semester, code, name, credit_hours)
      VALUES(
        p_department_id,
        v_dept_name,
        (v_course->>'semester')::integer,
        UPPER(TRIM(v_course->>'code')),
        TRIM(v_course->>'name'),
        COALESCE((v_course->>'credit_hours')::integer, 3)
      )
      ON CONFLICT (department_id, semester, code) DO NOTHING;

      -- GET DIAGNOSTICS assigns to a plain variable only (no expressions)
      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      v_inserted := v_inserted + v_row_count;
      IF v_row_count = 0 THEN
        v_skipped := v_skipped + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'success',  true,
    'inserted', v_inserted,
    'skipped',  v_skipped
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_bulk_import_courses(uuid, json) TO anon, authenticated;

-- ── 17. SEED DEPARTMENTS FROM STATIC DATA ────────────────────
INSERT INTO public.departments(name, description, sort_order, is_active) VALUES
  ('Civil Engineering (BSc)',                      'BSc program in Civil Engineering',                   1,  true),
  ('Environmental Engineering (BSc)',              'BSc program in Environmental Engineering',           2,  true),
  ('Electrical Engineering (BSc)',                 'BSc program in Electrical Engineering',              3,  true),
  ('Electronics Engineering (BSc)',                'BSc program in Electronics Engineering',             4,  true),
  ('Mechanical Engineering (BSc)',                 'BSc program in Mechanical Engineering',              5,  true),
  ('Mechatronics Engineering (BSc)',               'BSc program in Mechatronics Engineering',            6,  true),
  ('Industrial & Manufacturing Engineering (BSc)', 'BSc program in Industrial & Manufacturing Engg',     7,  true),
  ('Computer Engineering (BSc)',                   'BSc program in Computer Engineering',                8,  true),
  ('Artificial Intelligence (BS)',                 'BS program in Artificial Intelligence',              9,  true),
  ('Software Engineering (BSc)',                   'BSc program in Software Engineering',               10,  true),
  ('Telecommunication Engineering (BSc)',          'BSc program in Telecommunication Engineering',       11,  true),
  ('Computer Science (BSc)',                       'BSc program in Computer Science',                   12,  true),
  ('Mathematics (BS)',                             'BS program in Mathematics',                         13,  true),
  ('Physics (BS)',                                 'BS program in Physics',                             14,  true)
ON CONFLICT (name) DO NOTHING;

-- ── 18. VERIFICATION ─────────────────────────────────────────
SELECT
  routine_name,
  '✅ Created' AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_departments',
    'get_courses',
    'admin_get_departments',
    'admin_create_department',
    'admin_update_department',
    'admin_delete_department',
    'admin_get_courses',
    'admin_create_course',
    'admin_update_course',
    'admin_delete_course',
    'admin_bulk_import_courses'
  )
ORDER BY routine_name;

SELECT name, is_active, sort_order, '✅ Seeded' AS status
FROM public.departments
ORDER BY sort_order;
