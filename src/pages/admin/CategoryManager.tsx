import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  BookOpen, GraduationCap, Check, X, AlertCircle,
  RefreshCw, Search, Hash, Layers, Eye, EyeOff,
} from 'lucide-react';
import {
  adminLogout,
  getAdminSession,
  adminGetDepartments,
  adminCreateDepartment,
  adminUpdateDepartment,
  adminDeleteDepartment,
  adminGetCourses,
  adminCreateCourse,
  adminUpdateCourse,
  adminDeleteCourse,
  adminBulkImportCourses,
} from '../../lib/supabase.js';
import { departments as staticDepts } from '../../data/courses.js';

// ── Design tokens ────────────────────────────────────────────────
const S = {
  card:      { borderRadius: 24, background: '#d6dae8', boxShadow: '8px 8px 16px #b0b8cc,-8px -8px 16px #ffffff' },
  cardSm:    { borderRadius: 16, background: '#d6dae8', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' },
  inset:     { borderRadius: 12, background: '#d6dae8', boxShadow: 'inset 6px 6px 10px #b0b8cc,inset -6px -6px 10px #ffffff' },
  insetDeep: { borderRadius: 12, background: '#d6dae8', boxShadow: 'inset 10px 10px 20px #b0b8cc,inset -10px -10px 20px #ffffff' },
  font:      { fontFamily: "'DM Sans',sans-serif" },
  display:   { fontFamily: "'Plus Jakarta Sans',sans-serif" },
};
const btn = {
  primary: 'bg-[#5B4FE9] text-white rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8]',
  ghost:   'rounded-2xl px-3 py-2 text-sm font-medium text-[#64748B] transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]',
  danger:  'bg-red-500 text-white rounded-2xl px-3 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-400',
  success: 'bg-[#10B981] text-white rounded-2xl px-3 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 focus:outline-none',
  icon:    'w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#5B4FE9] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]',
};
const SEM_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700',
  'bg-red-100 text-red-700', 'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700',
];

// ── Build a flat merged list from static data ─────────────────────
// key = dept name, value = { semesters: { [sem]: course[] } }
interface StaticCourse { code: string; name: string; ch: number }
interface MergedDept {
  id: string | null;        // null = not yet in Supabase
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  fromStatic: boolean;
  semesters: Record<number, StaticCourse[]>;
}

// ── Toast ────────────────────────────────────────────────────────
interface Toast { id: number; msg: string; type: 'success' | 'error' | 'info' }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((msg: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  return { toasts, add };
}

interface ConfirmState { show: boolean; title: string; msg: string; onConfirm: () => void }

// ════════════════════════════════════════════════════════════════
export default function CategoryManager() {
  const navigate = useNavigate();
  const { toasts, add: toast } = useToast();

  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    const checkAndGuardSession = async () => {
      const session = getAdminSession();
      if (!session.loggedIn || Date.now() - session.loginAt > 8 * 60 * 60 * 1000) {
        await adminLogout();
        navigate('/admin/login', { replace: true });
        return;
      }
      setAuthChecked(true);
    };
    checkAndGuardSession();
  }, [navigate]);

  // Supabase data
  const [dbDepts, setDbDepts]   = useState<any[]>([]);
  const [dbCourses, setDbCourses] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);

  // UI
  const [activeTab, setActiveTab]         = useState<'departments' | 'courses'>('departments');
  const [selectedDeptName, setSelectedDeptName] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [expandedDept, setExpandedDept]   = useState<string | null>(null);
  const [searchDept, setSearchDept]       = useState('');
  const [searchCourse, setSearchCourse]   = useState('');
  const [showInactive, setShowInactive]   = useState(true);

  // Modals
  const [deptModal, setDeptModal]     = useState<{ open: boolean; mode: 'create'|'edit'; data: any }>({ open: false, mode: 'create', data: null });
  const [courseModal, setCourseModal] = useState<{ open: boolean; mode: 'create'|'edit'; data: any; deptName: string }>({ open: false, mode: 'create', data: null, deptName: '' });
  const [confirm, setConfirm]         = useState<ConfirmState>({ show: false, title: '', msg: '', onConfirm: () => {} });

  // ── Fetch Supabase ─────────────────────────────────────────────
  const fetchDb = useCallback(async () => {
    setLoading(true);
    const [dRes, cRes] = await Promise.all([adminGetDepartments(), adminGetCourses(null)]);
    setDbDepts(dRes.data || []);
    setDbCourses(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (authChecked) fetchDb(); }, [authChecked, fetchDb]);

  // ── Merge static + db data ─────────────────────────────────────
  // Build unified department list: static data is always shown,
  // enriched with Supabase metadata (id, is_active, etc.) if available.
  const mergedDepts: MergedDept[] = useMemo(() => {
    const staticNames = Object.keys(staticDepts as Record<string, any>);

    // Start with all static depts
    const result: MergedDept[] = staticNames.map((name, idx) => {
      const dbMatch = dbDepts.find(d => d.name === name);
      const semData = (staticDepts as Record<string, any>)[name] as Record<string, StaticCourse[]>;
      const semesters: Record<number, StaticCourse[]> = {};
      Object.entries(semData).forEach(([sem, courses]) => {
        semesters[Number(sem)] = courses as StaticCourse[];
      });
      return {
        id: dbMatch?.id || null,
        name,
        description: dbMatch?.description || '',
        is_active: dbMatch?.is_active ?? true,
        sort_order: dbMatch?.sort_order ?? idx + 1,
        fromStatic: true,
        semesters,
      };
    });

    // Add any db-only depts (custom ones not in static data)
    dbDepts.forEach(d => {
      if (!result.find(r => r.name === d.name)) {
        result.push({
          id: d.id,
          name: d.name,
          description: d.description || '',
          is_active: d.is_active ?? true,
          sort_order: d.sort_order ?? 99,
          fromStatic: false,
          semesters: {},
        });
      }
    });

    return result.sort((a, b) => a.sort_order - b.sort_order);
  }, [dbDepts]);

  // For a selected dept: merge static courses + db courses
  const mergedCourses = useMemo(() => {
    if (!selectedDeptName) return [];
    const dbDept = dbDepts.find(d => d.name === selectedDeptName);
    const semData = (staticDepts as Record<string, any>)[selectedDeptName] as Record<string, StaticCourse[]> | undefined;

    // Static courses for this dept
    const staticList: any[] = [];
    if (semData) {
      Object.entries(semData).forEach(([sem, courses]) => {
        (courses as StaticCourse[]).forEach(c => {
          staticList.push({
            id: null,
            department_id: dbDept?.id || null,
            semester: Number(sem),
            code: c.code,
            name: c.name,
            credit_hours: c.ch,
            is_active: true,
            fromStatic: true,
          });
        });
      });
    }

    // Db courses for this dept
    const dbList = dbDept ? dbCourses.filter(c => c.department_id === dbDept.id) : [];

    // Merge: db overrides static by code
    const merged = [...staticList];
    dbList.forEach(dc => {
      const idx = merged.findIndex(s => s.code === dc.code && s.semester === dc.semester);
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...dc, fromStatic: true };
      } else {
        merged.push({ ...dc, fromStatic: false });
      }
    });

    return merged.sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
  }, [selectedDeptName, dbDepts, dbCourses]);

  const filteredDepts = useMemo(() =>
    mergedDepts.filter(d =>
      d.name.toLowerCase().includes(searchDept.toLowerCase()) &&
      (showInactive || d.is_active)
    ), [mergedDepts, searchDept, showInactive]);

  const filteredCourses = useMemo(() =>
    mergedCourses.filter(c =>
      (selectedSemester === null || c.semester === selectedSemester) &&
      (showInactive || c.is_active) &&
      (searchCourse === '' ||
        c.name.toLowerCase().includes(searchCourse.toLowerCase()) ||
        c.code.toLowerCase().includes(searchCourse.toLowerCase()))
    ), [mergedCourses, selectedSemester, searchCourse, showInactive]);

  const selectedDeptObj = useMemo(() =>
    mergedDepts.find(d => d.name === selectedDeptName) || null,
    [mergedDepts, selectedDeptName]);

  const semestersForSelected = useMemo(() => {
    if (!selectedDeptName) return [];
    return [...new Set(mergedCourses.map(c => c.semester))].sort((a, b) => a - b);
  }, [mergedCourses, selectedDeptName]);

  // ── Ensure dept exists in Supabase before course ops ───────────
  const ensureDeptInDb = async (deptName: string): Promise<string | null> => {
    const existing = dbDepts.find(d => d.name === deptName);
    if (existing) return existing.id;
    // Auto-create in Supabase
    const idx = Object.keys(staticDepts as Record<string, any>).indexOf(deptName);
    const res = await adminCreateDepartment(deptName, '', idx + 1);
    if (res.success && res.data) {
      await fetchDb();
      return res.data.id;
    }
    return null;
  };

  // ── Dept CRUD ──────────────────────────────────────────────────
  const saveDept = async (formData: any) => {
    const { name, description, sort_order, is_active } = formData;
    let res;
    if (deptModal.mode === 'create') {
      res = await adminCreateDepartment(name, description, sort_order);
    } else {
      if (!deptModal.data.id) {
        // First time saving a static-only dept to Supabase
        res = await adminCreateDepartment(deptModal.data.name, description, sort_order);
      } else {
        res = await adminUpdateDepartment(deptModal.data.id, name, description, sort_order, is_active);
      }
    }
    if (res.success) {
      toast(deptModal.mode === 'create' ? 'Department created!' : 'Department updated!', 'success');
      setDeptModal({ open: false, mode: 'create', data: null });
      fetchDb();
    } else {
      toast(res.error || 'Failed to save', 'error');
    }
  };

  const deleteDept = (dept: MergedDept) => {
    if (dept.fromStatic) {
      toast('Built-in departments cannot be deleted — they are part of the university curriculum.', 'error');
      return;
    }
    setConfirm({
      show: true,
      title: 'Delete Department',
      msg: `Delete "${dept.name}" and all its custom courses? This cannot be undone.`,
      onConfirm: async () => {
        if (!dept.id) { setConfirm(p => ({ ...p, show: false })); return; }
        const res = await adminDeleteDepartment(dept.id);
        setConfirm(p => ({ ...p, show: false }));
        if (res.success) {
          toast('Department deleted', 'success');
          if (selectedDeptName === dept.name) setSelectedDeptName(null);
          fetchDb();
        } else toast(res.error || 'Failed to delete', 'error');
      },
    });
  };

  // ── Course CRUD ────────────────────────────────────────────────
  const saveCourse = async (formData: any) => {
    const { semester, code, name, credit_hours, is_active, department_name } = formData;
    const deptId = await ensureDeptInDb(department_name);
    if (!deptId) { toast('Could not sync department to database', 'error'); return; }

    let res;
    if (courseModal.mode === 'create') {
      res = await adminCreateCourse(deptId, semester, code, name, credit_hours);
    } else if (courseModal.data.id) {
      res = await adminUpdateCourse(courseModal.data.id, semester, code, name, credit_hours, is_active);
    } else {
      // Static course being edited for the first time — create in DB
      res = await adminCreateCourse(deptId, semester, code, name, credit_hours);
    }
    if (res.success) {
      toast(courseModal.mode === 'create' ? 'Course created!' : 'Course updated!', 'success');
      setCourseModal({ open: false, mode: 'create', data: null, deptName: '' });
      fetchDb();
    } else toast(res.error || 'Failed to save course', 'error');
  };

  const deleteCourse = (course: any) => {
    if (course.fromStatic && !course.id) {
      toast('Built-in courses cannot be deleted — they are part of the university curriculum.', 'error');
      return;
    }
    setConfirm({
      show: true,
      title: 'Delete Course',
      msg: `Delete "${course.code} – ${course.name}"? This cannot be undone.`,
      onConfirm: async () => {
        const res = await adminDeleteCourse(course.id);
        setConfirm(p => ({ ...p, show: false }));
        if (res.success) { toast('Course deleted', 'success'); fetchDb(); }
        else toast(res.error || 'Failed to delete', 'error');
      },
    });
  };

  // ── Bulk import all static courses for a dept ──────────────────
  const bulkImportAll = async (deptName: string) => {
    const deptId = await ensureDeptInDb(deptName);
    if (!deptId) { toast('Could not sync department to database', 'error'); return; }
    const semData = (staticDepts as Record<string, any>)[deptName] as Record<string, StaticCourse[]>;
    if (!semData) { toast('No static data for this department', 'error'); return; }
    const allCourses: any[] = [];
    Object.entries(semData).forEach(([sem, list]) => {
      (list as StaticCourse[]).forEach(c => allCourses.push({
        semester: Number(sem), code: c.code, name: c.name, credit_hours: c.ch || 3,
      }));
    });
    const res = await adminBulkImportCourses(deptId, allCourses);
    if (res.success) {
      toast(`Synced ${res.inserted} courses to database (${res.skipped} already existed)`, 'success');
      fetchDb();
    } else toast(res.error || 'Sync failed', 'error');
  };

  if (!authChecked) return (
    <div className="min-h-screen bg-[#d6dae8] flex items-center justify-center" style={S.font}>
      <div className="w-12 h-12 rounded-full border-4 border-[#5B4FE9] border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#d6dae8]" style={S.font}>

      {/* Toast */}
      <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium text-white shadow-xl"
            style={{ background: t.type === 'success' ? '#10B981' : t.type === 'error' ? '#ef4444' : '#5B4FE9' }}>
            {t.type === 'success' ? <Check size={14}/> : t.type === 'error' ? <X size={14}/> : <AlertCircle size={14}/>}
            {t.msg}
          </div>
        ))}
      </div>

      {/* Confirm */}
      {confirm.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(26,29,46,0.4)', backdropFilter: 'blur(8px)' }}>
          <div className="max-w-sm w-full p-6 rounded-[24px]" style={S.card}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500"/>
            </div>
            <h3 className="text-lg font-bold text-[#1a1d2e] text-center mb-2" style={S.display}>{confirm.title}</h3>
            <p className="text-sm text-[#64748B] text-center mb-6">{confirm.msg}</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-[#64748B]" style={S.cardSm}
                onClick={() => setConfirm(p => ({ ...p, show: false }))}>Cancel</button>
              <button className={`flex-1 py-2.5 ${btn.danger}`} onClick={confirm.onConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 px-4 md:px-6 py-4" style={{ background: '#d6dae8', boxShadow: '0 4px 20px #b0b8cc' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/dashboard')}
              className={`${btn.icon}`} style={S.cardSm} title="Back to Dashboard">
              <ArrowLeft size={18}/>
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-[#1a1d2e] tracking-tight" style={S.display}>
                Category Manager
              </h1>
              <p className="text-xs text-[#64748B]">
                {mergedDepts.length} departments · {mergedCourses.length || '—'} courses shown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowInactive(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all`}
              style={S.cardSm}
              title={showInactive ? 'Hide inactive' : 'Show inactive'}>
              {showInactive ? <Eye size={13} className="text-[#5B4FE9]"/> : <EyeOff size={13} className="text-[#A0AEC0]"/>}
              <span className={showInactive ? 'text-[#5B4FE9]' : 'text-[#A0AEC0]'}>
                {showInactive ? 'All' : 'Active only'}
              </span>
            </button>
            <button onClick={fetchDb}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[#64748B]`}
              style={S.cardSm} title="Refresh from Supabase">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* Tab toggle */}
        <div className="flex gap-2 mb-6 p-1.5 rounded-2xl w-fit" style={S.inset}>
          {(['departments', 'courses'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-300 ${
                activeTab === tab ? 'text-white' : 'text-[#64748B] hover:text-[#1a1d2e]'
              }`}
              style={activeTab === tab ? { background: '#5B4FE9', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' } : {}}>
              {tab === 'departments'
                ? <span className="flex items-center gap-1.5"><GraduationCap size={14}/>{tab}</span>
                : <span className="flex items-center gap-1.5"><BookOpen size={14}/>{tab}</span>}
            </button>
          ))}
        </div>

        {/* ══ DEPARTMENTS TAB ══════════════════════════════════════ */}
        {activeTab === 'departments' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"/>
                <input value={searchDept} onChange={e => setSearchDept(e.target.value)}
                  placeholder="Search departments…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm text-[#1a1d2e] placeholder-[#A0AEC0] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all rounded-2xl"
                  style={S.inset}/>
              </div>
              <button onClick={() => setDeptModal({ open: true, mode: 'create', data: null })}
                className={`${btn.primary} flex items-center gap-2`}
                style={{ boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' }}>
                <Plus size={14}/> Add Department
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Total', value: mergedDepts.length, color: '#5B4FE9' },
                { label: 'Active', value: mergedDepts.filter(d => d.is_active).length, color: '#10B981' },
                { label: 'In DB', value: dbDepts.length, color: '#F59E0B' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-[20px] text-center" style={S.cardSm}>
                  <div className="text-2xl font-extrabold" style={{ color: s.color, ...S.display }}>{s.value}</div>
                  <div className="text-xs text-[#64748B] font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {filteredDepts.map(dept => {
                const isExpanded = expandedDept === dept.name;
                const totalCourses = Object.values(dept.semesters).flat().length;
                const inDb = !!dept.id;

                return (
                  <div key={dept.name} className="rounded-[24px] overflow-hidden transition-all duration-300" style={S.card}>
                    {/* Row */}
                    <div className="flex items-center gap-3 p-4">
                      <button onClick={() => setExpandedDept(isExpanded ? null : dept.name)}
                        className={`${btn.icon}`} style={S.inset}>
                        {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                      </button>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={S.inset}>
                        <GraduationCap size={18} style={{ color: dept.is_active ? '#5B4FE9' : '#A0AEC0' }}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#1a1d2e] truncate" style={S.display}>{dept.name}</span>
                          {!dept.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-500">Inactive</span>
                          )}
                          {dept.fromStatic && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-600">Built-in</span>
                          )}
                          {inDb ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-600">✓ In DB</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-600">Not synced</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-[#A0AEC0]">
                          <span><strong className="text-[#64748B]">{totalCourses}</strong> courses</span>
                          <span><strong className="text-[#64748B]">{Object.keys(dept.semesters).length}</strong> semesters</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Sync to DB */}
                        {!inDb && (
                          <button onClick={() => bulkImportAll(dept.name)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#10B981] transition-all hover:-translate-y-0.5"
                            style={S.cardSm} title="Sync to Supabase">
                            Sync
                          </button>
                        )}
                        <button onClick={() => setDeptModal({ open: true, mode: 'edit', data: dept })}
                          className={btn.icon} style={S.cardSm} title="Edit">
                          <Pencil size={13}/>
                        </button>
                        {!dept.fromStatic && (
                          <button onClick={() => deleteDept(dept)}
                            className={`${btn.icon} hover:text-red-500`} style={S.cardSm} title="Delete">
                            <Trash2 size={13}/>
                          </button>
                        )}
                        <button onClick={() => { setSelectedDeptName(dept.name); setActiveTab('courses'); setSelectedSemester(null); }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#5B4FE9] transition-all hover:-translate-y-0.5"
                          style={S.cardSm} title="View courses">
                          Courses →
                        </button>
                      </div>
                    </div>

                    {/* Expanded: semester grid */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="p-3 rounded-[18px]" style={S.inset}>
                          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                            Semester Overview
                          </p>
                          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            {[1,2,3,4,5,6,7,8].map(sem => {
                              const count = (dept.semesters[sem] || []).length;
                              return (
                                <button key={sem}
                                  onClick={() => { setSelectedDeptName(dept.name); setActiveTab('courses'); setSelectedSemester(sem); }}
                                  className={`p-2 rounded-xl text-center transition-all hover:-translate-y-0.5 ${count > 0 ? '' : 'opacity-40'}`}
                                  style={S.cardSm}>
                                  <div className={`text-xs font-bold mb-0.5 ${SEM_COLORS[(sem-1) % 8].split(' ')[1]}`}>S{sem}</div>
                                  <div className="text-sm font-extrabold text-[#1a1d2e]">{count}</div>
                                  <div className="text-[10px] text-[#A0AEC0]">courses</div>
                                </button>
                              );
                            })}
                          </div>
                          {inDb && (
                            <button onClick={() => bulkImportAll(dept.name)}
                              className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-[#10B981] flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5"
                              style={S.cardSm}>
                              <RefreshCw size={12}/> Re-sync all courses to Supabase
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ COURSES TAB ══════════════════════════════════════════ */}
        {activeTab === 'courses' && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: dept selector */}
            <div className="lg:w-72 flex-shrink-0">
              <div className="p-4 rounded-[24px] sticky top-24" style={S.card}>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
                  Select Department
                </p>
                <div className="relative mb-3">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"/>
                  <input value={searchDept} onChange={e => setSearchDept(e.target.value)}
                    placeholder="Filter departments…"
                    className="w-full pl-8 pr-3 py-2 text-xs text-[#1a1d2e] placeholder-[#A0AEC0] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all rounded-xl"
                    style={S.inset}/>
                </div>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredDepts.map(dept => {
                    const totalCourses = Object.values(dept.semesters).flat().length;
                    const isSelected = selectedDeptName === dept.name;
                    return (
                      <button key={dept.name}
                        onClick={() => { setSelectedDeptName(dept.name); setSelectedSemester(null); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                        style={isSelected
                          ? { background: '#5B4FE9', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff', borderRadius: 14 }
                          : S.cardSm}>
                        <div className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-[#1a1d2e]'}`}>
                          {dept.name}
                        </div>
                        <div className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-[#A0AEC0]'}`}>
                          {totalCourses} courses
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: course list */}
            <div className="flex-1 min-w-0">
              {!selectedDeptName ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-[24px]" style={S.card}>
                  <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4" style={S.inset}>
                    <Layers size={28} className="text-[#A0AEC0]"/>
                  </div>
                  <p className="text-[#64748B] font-semibold">Select a department</p>
                  <p className="text-sm text-[#A0AEC0] mt-1">Choose from the left panel to view its courses</p>
                </div>
              ) : (
                <>
                  {/* Course toolbar */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]"/>
                      <input value={searchCourse} onChange={e => setSearchCourse(e.target.value)}
                        placeholder="Search courses…"
                        className="w-full pl-9 pr-4 py-2.5 text-sm text-[#1a1d2e] placeholder-[#A0AEC0] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all rounded-2xl"
                        style={S.inset}/>
                    </div>
                    <button
                      onClick={() => setCourseModal({ open: true, mode: 'create', data: null, deptName: selectedDeptName })}
                      className={`${btn.primary} flex items-center gap-2`}
                      style={{ boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' }}>
                      <Plus size={14}/> Add Course
                    </button>
                  </div>

                  {/* Dept info bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4 p-3 rounded-[20px]" style={S.cardSm}>
                    <div>
                      <span className="font-bold text-[#1a1d2e] text-sm" style={S.display}>{selectedDeptName}</span>
                      <span className="text-xs text-[#A0AEC0] ml-2">
                        {filteredCourses.length} of {mergedCourses.length} courses
                        {selectedDeptObj && !selectedDeptObj.id && (
                          <span className="ml-2 text-yellow-600 font-medium">· Not synced to DB</span>
                        )}
                      </span>
                    </div>
                    {selectedDeptObj && (
                      <button onClick={() => bulkImportAll(selectedDeptName)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#10B981] transition-all hover:-translate-y-0.5"
                        style={S.cardSm}>
                        <RefreshCw size={11}/> Sync to DB
                      </button>
                    )}
                  </div>

                  {/* Semester filter pills */}
                  <div className="flex gap-2 flex-wrap mb-4">
                    <button
                      onClick={() => setSelectedSemester(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedSemester === null ? 'text-white' : 'text-[#64748B]'}`}
                      style={selectedSemester === null
                        ? { background: '#5B4FE9', boxShadow: '4px 4px 8px #b0b8cc,-4px -4px 8px #ffffff', borderRadius: 12 }
                        : S.cardSm}>
                      All Semesters
                    </button>
                    {semestersForSelected.map(sem => (
                      <button key={sem}
                        onClick={() => setSelectedSemester(sem)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${selectedSemester === sem ? 'text-white' : 'text-[#64748B]'}`}
                        style={selectedSemester === sem
                          ? { background: '#5B4FE9', boxShadow: '4px 4px 8px #b0b8cc,-4px -4px 8px #ffffff', borderRadius: 12 }
                          : S.cardSm}>
                        Sem {sem}
                      </button>
                    ))}
                  </div>

                  {/* Course cards */}
                  {filteredCourses.length === 0 ? (
                    <div className="text-center py-12 rounded-[24px]" style={S.card}>
                      <BookOpen size={32} className="text-[#A0AEC0] mx-auto mb-2"/>
                      <p className="text-[#64748B] font-medium">No courses found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredCourses.map((course, idx) => (
                        <div key={`${course.code}-${course.semester}-${idx}`}
                          className="flex items-center gap-3 p-3 rounded-[20px] transition-all duration-300 hover:-translate-y-0.5"
                          style={S.card}>
                          {/* Sem badge */}
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${SEM_COLORS[(course.semester-1) % 8]}`}>
                            S{course.semester}
                          </div>
                          {/* Code icon */}
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={S.inset}>
                            <Hash size={12} className="text-[#5B4FE9]"/>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#5B4FE9]">{course.code}</span>
                              <span className="font-semibold text-[#1a1d2e] text-sm truncate">{course.name}</span>
                              {!course.is_active && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-200 text-gray-500">Inactive</span>
                              )}
                              {course.fromStatic && !course.id && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-500">Built-in</span>
                              )}
                              {course.id && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-600">✓ DB</span>
                              )}
                            </div>
                            <div className="text-xs text-[#A0AEC0]">{course.credit_hours} credit hrs</div>
                          </div>
                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => setCourseModal({ open: true, mode: 'edit', data: course, deptName: selectedDeptName })}
                              className={`${btn.icon}`} style={S.cardSm} title="Edit">
                              <Pencil size={12}/>
                            </button>
                            {(!course.fromStatic || course.id) && (
                              <button onClick={() => deleteCourse(course)}
                                className={`${btn.icon} hover:text-red-500`} style={S.cardSm} title="Delete">
                                <Trash2 size={12}/>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Dept Modal ───────────────────────────────────────────── */}
      {deptModal.open && (
        <DeptModal
          mode={deptModal.mode}
          initial={deptModal.data}
          onSave={saveDept}
          onClose={() => setDeptModal({ open: false, mode: 'create', data: null })}
        />
      )}

      {/* ── Course Modal ─────────────────────────────────────────── */}
      {courseModal.open && (
        <CourseModal
          mode={courseModal.mode}
          initial={courseModal.data}
          deptName={courseModal.deptName}
          allDeptNames={mergedDepts.map(d => d.name)}
          onSave={saveCourse}
          onClose={() => setCourseModal({ open: false, mode: 'create', data: null, deptName: '' })}
        />
      )}
    </div>
  );
}

// ── Dept Modal ────────────────────────────────────────────────────
function DeptModal({ mode, initial, onSave, onClose }:
  { mode: 'create'|'edit'; initial: any; onSave: (d:any)=>void; onClose: ()=>void }) {
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    description: initial?.description || '',
    sort_order:  initial?.sort_order  ?? 99,
    is_active:   initial?.is_active   ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isBuiltIn = initial?.fromStatic && mode === 'edit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const Inp = { borderRadius: 12, background: '#d6dae8', boxShadow: 'inset 6px 6px 10px #b0b8cc, inset -6px -6px 10px #ffffff' };
  const InpD = { borderRadius: 12, background: '#d6dae8', boxShadow: 'inset 10px 10px 20px #b0b8cc, inset -10px -10px 20px #ffffff' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(26,29,46,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-lg w-full p-6 rounded-[24px]"
        style={{ borderRadius: 24, background: '#d6dae8', boxShadow: '8px 8px 16px #b0b8cc,-8px -8px 16px #ffffff' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {mode === 'create' ? 'Add Department' : `Edit: ${initial?.name}`}
            </h2>
            {isBuiltIn && <p className="text-xs text-amber-600 mt-0.5">Built-in department — name cannot be changed</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B]"
            style={{ borderRadius: 12, background: '#d6dae8', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' }}>
            <X size={16}/>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Department Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Computer Science (BSc)" required
              disabled={isBuiltIn}
              className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] placeholder-[#A0AEC0] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all disabled:opacity-60"
              style={InpD}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of the program"
              className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] placeholder-[#A0AEC0] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all"
              style={Inp}/>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all"
                style={Inp}/>
            </div>
            {mode === 'edit' && (
              <div className="flex-1">
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Status</label>
                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={Inp}>
                  <span className="w-9 h-5 rounded-full relative transition-colors duration-300"
                    style={{ background: form.is_active ? '#10B981' : '#D1D5DB' }}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                      style={{ left: form.is_active ? '18px' : '2px' }}/>
                  </span>
                  <span style={{ color: form.is_active ? '#10B981' : '#A0AEC0' }}>{form.is_active ? 'Active' : 'Inactive'}</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-[#64748B] transition-all"
              style={{ borderRadius: 16, background: '#d6dae8', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{ background: '#5B4FE9', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create Department' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Course Modal ──────────────────────────────────────────────────
function CourseModal({ mode, initial, deptName, allDeptNames, onSave, onClose }:
  { mode: 'create'|'edit'; initial: any; deptName: string; allDeptNames: string[]; onSave: (d:any)=>void; onClose: ()=>void }) {
  const [form, setForm] = useState({
    department_name: deptName || allDeptNames[0] || '',
    semester:     initial?.semester     || 1,
    code:         initial?.code         || '',
    name:         initial?.name         || '',
    credit_hours: initial?.credit_hours || 3,
    is_active:    initial?.is_active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const isBuiltInStatic = initial?.fromStatic && !initial?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const Inp = { borderRadius: 12, background: '#d6dae8', boxShadow: 'inset 6px 6px 10px #b0b8cc,inset -6px -6px 10px #ffffff' };
  const InpD = { borderRadius: 12, background: '#d6dae8', boxShadow: 'inset 10px 10px 20px #b0b8cc,inset -10px -10px 20px #ffffff' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(26,29,46,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="max-w-lg w-full p-6 rounded-[24px]"
        style={{ borderRadius: 24, background: '#d6dae8', boxShadow: '8px 8px 16px #b0b8cc,-8px -8px 16px #ffffff' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {mode === 'create' ? 'Add Course' : 'Edit Course'}
            </h2>
            {isBuiltInStatic && (
              <p className="text-xs text-blue-600 mt-0.5">Editing built-in course — will save override to database</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B]"
            style={{ borderRadius: 12, background: '#d6dae8', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' }}>
            <X size={16}/>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Department *</label>
            <select value={form.department_name} onChange={e => setForm(p => ({ ...p, department_name: e.target.value }))}
              disabled={mode === 'edit'}
              className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all disabled:opacity-60"
              style={Inp}>
              {allDeptNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Semester *</label>
              <select value={form.semester} onChange={e => setForm(p => ({ ...p, semester: Number(e.target.value) }))}
                disabled={isBuiltInStatic}
                className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all disabled:opacity-60"
                style={Inp}>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Credit Hours</label>
              <input type="number" min={1} max={6} value={form.credit_hours}
                onChange={e => setForm(p => ({ ...p, credit_hours: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all"
                style={Inp}/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Course Code *</label>
            <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. CS-101" required
              disabled={isBuiltInStatic}
              className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] placeholder-[#A0AEC0] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all disabled:opacity-60"
              style={InpD}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Course Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Programming Fundamentals" required
              className="w-full px-4 py-2.5 text-sm text-[#1a1d2e] placeholder-[#A0AEC0] bg-[#d6dae8] border-0 outline-none focus:ring-2 focus:ring-[#5B4FE9] transition-all"
              style={InpD}/>
          </div>
          {mode === 'edit' && !isBuiltInStatic && (
            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">Status</label>
              <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={Inp}>
                <span className="w-9 h-5 rounded-full relative transition-colors duration-300"
                  style={{ background: form.is_active ? '#10B981' : '#D1D5DB' }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                    style={{ left: form.is_active ? '18px' : '2px' }}/>
                </span>
                <span style={{ color: form.is_active ? '#10B981' : '#A0AEC0' }}>{form.is_active ? 'Active' : 'Inactive'}</span>
              </button>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-[#64748B] transition-all"
              style={{ borderRadius: 16, background: '#d6dae8', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.code.trim() || !form.name.trim()}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{ background: '#5B4FE9', boxShadow: '5px 5px 10px #b0b8cc,-5px -5px 10px #ffffff', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create Course' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
