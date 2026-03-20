import { createClient } from '@supabase/supabase-js';

// SECURITY: NEVER hardcode secrets. Always use environment variables.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase configuration missing in environment variables.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ── Row normaliser: DB snake_case → UI camelCase ──────────────────────────────
function normalise(row) {
  if (!row) return null;
  return {
    id:          row.id,
    title:       row.title        || '',
    type:        row.type         || '',
    department:  row.department   || '',
    semester:    Number(row.semester || 0),
    courseCode:  row.course_code  || '',
    courseName:  row.course_name  || '',
    link:        row.link         || '',
    uploadedBy:  row.uploaded_by  || 'Anonymous',
    uploadedAt:  row.created_at   || new Date().toISOString(),
    description: row.description  || '',
    reportCount: Number(row.report_count || 0),
    status:      row.status       || 'pending',
    adminNote:   row.admin_note   || '',
    reviewedAt:  row.reviewed_at  || null,
  };
}

function unwrapArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return [data];
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export async function submitResource(data) {
  try {
    const { data: result, error } = await supabase.rpc('submit_resource', {
      p_title:       String(data.title       || '').trim(),
      p_type:        String(data.type        || '').trim(),
      p_department:  String(data.department  || '').trim(),
      p_semester:    Number(data.semester),
      p_course_code: String(data.courseCode  || '').trim(),
      p_course_name: String(data.courseName  || '').trim(),
      p_link:        String(data.link        || '').trim(),
      p_uploaded_by: String(data.uploadedBy  || 'Anonymous').trim() || 'Anonymous',
      p_description: String(data.description || '').trim(),
    });

    if (error) {
      console.error('submitResource RPC error:', error);
      return { success: false, error: error.message || 'Database error. Please try again.' };
    }

    const res = typeof result === 'string' ? JSON.parse(result) : result;
    if (!res || !res.success) {
      return { success: false, error: res?.error || 'Submission failed. Please try again.' };
    }
    return { success: true, id: res.id };
  } catch (err) {
    console.error('submitResource unexpected error:', err);
    return { success: false, error: 'Unexpected error. Please check your connection.' };
  }
}

export async function getResources(filters = {}) {
  try {
    const { data, error } = await supabase.rpc('get_approved_resources', {
      p_department:  filters.department  || null,
      p_semester:    filters.semester    ? Number(filters.semester) : null,
      p_course_code: filters.courseCode  || null,
      p_type:        filters.type        || null,
      p_limit:       filters.limitCount  ? Number(filters.limitCount) : 100,
    });

    if (error) { 
      // SECURITY: Generic error message to client
      console.error('getResources RPC error:', error); 
      return []; 
    }
    return unwrapArray(data).map(normalise);
  } catch (err) {
    console.error('getResources unexpected error:', err);
    return [];
  }
}


export async function getRecentResources(count = 6) {
  try {
    const { data, error } = await supabase.rpc('get_recent_approved', { p_count: count });
    if (error) { console.error('getRecentResources RPC error:', error); return []; }
    return unwrapArray(data).map(normalise);
  } catch (err) {
    console.error('getRecentResources unexpected error:', err);
    return [];
  }
}

export async function searchResources(query, filters = {}) {
  try {
    const q = String(query || '').trim();
    // Use enhanced search function with filters if possible, or fallback to simple search
    const { data, error } = await supabase.rpc('search_approved_resources', { 
      p_query: q || null,
      p_type: filters.type || null,
      p_dept: filters.department || null,
      p_semester: filters.semester ? Number(filters.semester) : null,
      p_course: filters.courseCode || null
    });

    if (error) {
      // SECURITY: Generic error
      console.error('searchResources RPC error:', error);
      return [];
    }
    return unwrapArray(data).map(normalise);
  } catch (err) {
    console.error('searchResources unexpected error:', err);
    return [];
  }
}

export async function reportResource(id) {
  try {
    const { error } = await supabase.rpc('increment_report', { p_resource_id: id });
    if (error) { console.error('reportResource RPC error:', error); return false; }
    return true;
  } catch (err) {
    console.error('reportResource unexpected error:', err);
    return false;
  }
}

export async function getDeptResourceCounts() {
  try {
    const { data, error } = await supabase.rpc('get_dept_resource_counts');
    if (error) { console.error('getDeptResourceCounts RPC error:', error); return {}; }
    const counts = {};
    unwrapArray(data).forEach(row => { counts[row.department] = Number(row.cnt || 0); });
    return counts;
  } catch (err) {
    console.error('getDeptResourceCounts unexpected error:', err);
    return {};
  }
}

export async function getSiteStats() {
  try {
    const { data, error } = await supabase.rpc('get_site_stats');
    if (error) {
      console.error('getSiteStats RPC error:', error);
      return { total_resources: 0, total_contributors: 0 };
    }
    return data;
  } catch (err) {
    console.error('getSiteStats unexpected error:', err);
    return { total_resources: 0, total_contributors: 0 };
  }
}

export async function getTotalResourceCount() {
  try {
    const stats = await getSiteStats();
    return Number(stats.total_resources || 0);
  } catch {
    return 0;
  }
}

export async function getContributorCount() {
  try {
    const stats = await getSiteStats();
    return Number(stats.total_contributors || 0);
  } catch {
    return 0;
  }
}

// ── ADMIN API ─────────────────────────────────────────────────────────────────

export async function adminGetResources(status = 'all', dept = null) {
  try {
    let data, error;
    if (status === 'all') {
      ({ data, error } = await supabase.rpc('admin_get_all_resources', { p_dept: dept }));
    } else {
      ({ data, error } = await supabase.rpc('admin_get_resources_by_status', { filter_status: status, p_dept: dept }));
    }
    if (error) { console.error('adminGetResources RPC error:', error); return { data: [], error: error.message }; }
    return { data: unwrapArray(data).map(normalise), error: null };
  } catch (err) {
    console.error('adminGetResources unexpected error:', err);
    return { data: [], error: String(err) };
  }
}

export async function adminApproveResource(id, note = '') {
  try {
    const { data, error } = await supabase.rpc('admin_approve_resource', { resource_id: id, note: note || '' });
    if (error) { console.error('adminApproveResource RPC error:', error); return { success: false, error: error.message }; }
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminRejectResource(id, note = '') {
  try {
    const { data, error } = await supabase.rpc('admin_reject_resource', { resource_id: id, note: note || '' });
    if (error) { console.error('adminRejectResource RPC error:', error); return { success: false, error: error.message }; }
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminDeleteResource(id) {
  try {
    const { data, error } = await supabase.rpc('admin_delete_resource', { resource_id: id });
    if (error) { console.error('adminDeleteResource RPC error:', error); return { success: false, error: error.message }; }
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminDismissFlags(id) {
  try {
    const { data, error } = await supabase.rpc('admin_dismiss_flags', { p_resource_id: id });
    if (error) { console.error('adminDismissFlags RPC error:', error); return { success: false, error: error.message }; }
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

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

export async function adminGetStats(dept = null) {
  try {
    const { data, error } = await supabase.rpc('admin_get_stats', { p_dept: dept });
    if (error) { console.error('adminGetStats RPC error:', error); return { pending: 0, approved: 0, rejected: 0, flagged: 0, total: 0, daily: [] }; }
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { pending: 0, approved: 0, rejected: 0, flagged: 0, total: 0, daily: [] };
  } catch (err) {
    console.error('adminGetStats unexpected error:', err);
    return { pending: 0, approved: 0, rejected: 0, flagged: 0, total: 0, daily: [] };
  }
}


// ── CONTACT SUBMISSIONS API ───────────────────────────────────────────────────

export async function submitContactRequest(data) {
  try {
    const { data: result, error } = await supabase.rpc('submit_contact_request', {
      p_name:    String(data.name    || '').trim(),
      p_email:   String(data.email   || '').trim(),
      p_type:    String(data.type    || 'Other').trim(),
      p_subject: String(data.subject || '').trim(),
      p_message: String(data.message || '').trim(),
    });

    if (error) {
      console.error('submitContactRequest error:', error);
      return { success: false, error: error.message };
    }
    return result || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminGetContactSubmissions() {
  try {
    const { data, error } = await supabase.rpc('admin_get_contact_submissions');
    if (error) {
      console.error('adminGetContactSubmissions error:', error);
      return { data: [], error: error.message };
    }
    return { data: unwrapArray(data), error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

export async function adminDeleteContactSubmission(id) {
  try {
    const { data, error } = await supabase.rpc('admin_delete_contact_submission', { p_id: id });
    if (error) return { success: false, error: error.message };
    return data || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminMarkSubmissionRead(id) {
  try {
    const { data, error } = await supabase.rpc('admin_mark_submission_read', { p_id: id });
    if (error) return { success: false, error: error.message };
    return data || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── CATEGORY MANAGEMENT API ───────────────────────────────────────────────────

export async function adminGetDepartments() {
  try {
    const { data, error } = await supabase.rpc('admin_get_departments');
    if (error) { console.error('adminGetDepartments error:', error); return { data: [], error: error.message }; }
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return { data: Array.isArray(parsed) ? parsed : [], error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

export async function adminCreateDepartment(name, description = '', sortOrder = 0) {
  try {
    const { data, error } = await supabase.rpc('admin_create_department', {
      p_name: String(name).trim(),
      p_description: String(description).trim(),
      p_sort_order: Number(sortOrder) || 0,
    });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: false, error: 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminUpdateDepartment(id, name, description = '', sortOrder = 0, isActive = true) {
  try {
    const { data, error } = await supabase.rpc('admin_update_department', {
      p_id: id,
      p_name: String(name).trim(),
      p_description: String(description).trim(),
      p_sort_order: Number(sortOrder) || 0,
      p_is_active: Boolean(isActive),
    });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: false, error: 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminDeleteDepartment(id) {
  try {
    const { data, error } = await supabase.rpc('admin_delete_department', { p_id: id });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: false, error: 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminGetCourses(departmentId = null) {
  try {
    const { data, error } = await supabase.rpc('admin_get_courses', { p_department_id: departmentId || null });
    if (error) { console.error('adminGetCourses error:', error); return { data: [], error: error.message }; }
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return { data: Array.isArray(parsed) ? parsed : [], error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

export async function adminCreateCourse(departmentId, semester, code, name, creditHours = 3) {
  try {
    const { data, error } = await supabase.rpc('admin_create_course', {
      p_department_id: departmentId,
      p_semester: Number(semester),
      p_code: String(code).trim().toUpperCase(),
      p_name: String(name).trim(),
      p_credit_hours: Number(creditHours) || 3,
    });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: false, error: 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminUpdateCourse(id, semester, code, name, creditHours = 3, isActive = true) {
  try {
    const { data, error } = await supabase.rpc('admin_update_course', {
      p_id: id,
      p_semester: Number(semester),
      p_code: String(code).trim().toUpperCase(),
      p_name: String(name).trim(),
      p_credit_hours: Number(creditHours) || 3,
      p_is_active: Boolean(isActive),
    });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: false, error: 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminDeleteCourse(id) {
  try {
    const { data, error } = await supabase.rpc('admin_delete_course', { p_id: id });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: false, error: 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminBulkImportCourses(departmentId, courses) {
  try {
    const { data, error } = await supabase.rpc('admin_bulk_import_courses', {
      p_department_id: departmentId,
      p_courses: courses,
    });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: false, error: 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── MODERATOR MANAGEMENT API ───────────────────────────────────────────────────

export async function adminGetModerators() {
  try {
    const { data, error } = await supabase.rpc('admin_get_moderators');
    if (error) { console.error('adminGetModerators error:', error); return { data: [], error: error.message }; }
    return { data: unwrapArray(data), error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

export async function adminCreateModerator(key, dept, name = '') {
  try {
    const { data, error } = await supabase.rpc('admin_create_moderator', { 
      p_key: key, 
      p_dept: dept,
      p_name: name || ''
    });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function adminDeleteModerator(id) {
  try {
    const { data, error } = await supabase.rpc('admin_delete_moderator', { p_id: id });
    if (error) return { success: false, error: error.message };
    const res = typeof data === 'string' ? JSON.parse(data) : data;
    return res || { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}


// ── ADMIN AUTH ────────────────────────────────────────────────────────────────
// Super admin logs in via Supabase Auth (real JWT session).
// Moderators log in via access key checked against the moderators table.
// IMPORTANT: The admin email is never stored in this file.
// Create the admin user manually in Supabase Dashboard → Authentication → Users.

const SESSION_KEY    = 'uet_admin_v3';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function adminLogin(email, password) {
  // 1. Try super admin via Supabase Auth
  let authErrorMsg = '';
  if (email) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (!authError && authData?.session) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          loggedIn: true,
          loginAt:  Date.now(),
          role:     'super_admin',
        }));
        return { success: true };
      }
      authErrorMsg = authError?.message || '';
    } catch (err) {
      return { success: false, error: String(err), errorType: 'network' };
    }
  }

  // 2. Try moderator access key (uses password param as the key)
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
      return { success: true };
    }
  } catch (err) {
    console.error('Moderator login error:', err);
    return { success: false, error: String(err), errorType: 'network' };
  }

  return { success: false, error: authErrorMsg || 'Invalid access key', errorType: authErrorMsg ? 'auth' : 'key' };
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
