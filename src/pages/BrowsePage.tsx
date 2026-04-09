import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, ChevronDown, Upload, Loader, Search, SearchX } from 'lucide-react';
import { getResources, getLiveCoursesData } from '../lib/supabase.js';
import { departments as staticDepartments, departmentList as staticDepartmentList } from '../data/courses.js';
import ResourceCard from '../components/ResourceCard.js';
import ResourceDetailModal from '../components/ResourceDetailModal.js';
import { ScrollProgress } from '../components/ScrollProgress.js';
import { Reveal } from '../components/Reveal.js';
import { Pagination } from '../components/Pagination.js';
import { Helmet } from 'react-helmet-async';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDept, setSelectedDept] = useState(searchParams.get('department') || '');
  const [selectedSemester, setSelectedSemester] = useState(searchParams.get('semester') || '');
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('course') || '');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewResource, setPreviewResource] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const [departments, setDepartments] = useState<any>(staticDepartments);
  const [departmentList, setDepartmentList] = useState<string[]>(staticDepartmentList);

  useEffect(() => {
    getLiveCoursesData().then(data => {
      setDepartments(data.departments);
      setDepartmentList(data.departmentList);
    });
  }, []);

  const semesterOptions = selectedDept 
    ? ['1', '2', '3', '4', '5', '6', '7', '8']
    : [];

  const dynamicCourses = selectedDept && selectedSemester && departments[selectedDept]
    ? (departments[selectedDept] || {})[selectedSemester]
    : null;

  const staticCourses = selectedDept && selectedSemester && staticDepartments[selectedDept as keyof typeof staticDepartments]
    ? staticDepartments[selectedDept as keyof typeof staticDepartments][selectedSemester as keyof typeof staticDepartments[keyof typeof staticDepartments]] || []
    : [];

  const courseOptions = (dynamicCourses && dynamicCourses.length > 0)
    ? dynamicCourses
    : staticCourses;

  // Sync state with URL params on mount or URL change
  useEffect(() => {
    const dept = searchParams.get('department') || '';
    const sem = searchParams.get('semester') || '';
    const course = searchParams.get('course') || '';

    if (dept !== selectedDept) setSelectedDept(dept);
    if (sem !== selectedSemester) setSelectedSemester(sem);
    if (course !== selectedCourse) setSelectedCourse(course);
    
    // Auto-load if at least department is selected
    if (dept) {
      loadResources(dept, sem, course);
    }
  }, [searchParams]);

  const loadResources = async (dept: string, sem: string, course: string) => {
    setLoading(true);

    const cacheKey = 'resources_browse_cache';
    const specificKey = `${dept}_${sem}_${course}`;

    try {
      const cachedString = sessionStorage.getItem(cacheKey);
      if (cachedString) {
        const cacheObj = JSON.parse(cachedString);
        const cachedItem = cacheObj[specificKey];
        // 5 minutes TTL
        if (cachedItem && Date.now() - cachedItem.timestamp < 5 * 60 * 1000) {
          setResources(cachedItem.data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }

    const filters: Record<string, any> = {};
    if (dept) filters.department = dept;
    if (sem) filters.semester = Number(sem);
    if (course) filters.courseCode = course;
    
    const data = await getResources(filters);
    setResources(data);

    try {
      const cachedString = sessionStorage.getItem(cacheKey);
      const cacheObj = cachedString ? JSON.parse(cachedString) : {};
      cacheObj[specificKey] = {
        timestamp: Date.now(),
        data: data
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheObj));
    } catch (e) {
      console.warn('Cache write error:', e);
    }

    setLoading(false);
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    setSearchParams(newParams);
  };

  const handleDeptChange = (dept: string) => {
    const newParams = new URLSearchParams();
    if (dept) newParams.set('department', dept);
    setSearchParams(newParams);
    // Local state will be updated by the useEffect tracking searchParams
    if (!dept) setResources([]);
  };

  const handleSemesterChange = (sem: string) => {
    updateSearchParams({ semester: sem, course: '' });
  };

  const handleCourseChange = (courseCode: string) => {
    updateSearchParams({ course: courseCode });
  };

  const filteredResources = resources.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.title.toLowerCase().includes(q) ||
           r.courseCode.toLowerCase().includes(q) ||
           r.courseName.toLowerCase().includes(q) ||
           r.description?.toLowerCase().includes(q);
  });

  const filterActive = selectedDept || selectedSemester || selectedCourse;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDept, selectedSemester, selectedCourse, searchQuery]);

  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#d6dae8]">
      <Helmet>
        <title>Browse UET Taxila Resources | Past Papers & Notes by Department</title>
        <meta name="description" content="Browse free past papers, notes, and study materials for all UET Taxila departments. Filter by CS, EE, ME, CE, SE and semester." />
        <link rel="canonical" href="https://uetresourcehub.app/browse" />
        <meta property="og:title" content="Browse Resources — UET Taxila Resource Hub" />
        <meta property="og:url" content="https://uetresourcehub.app/browse" />
      </Helmet>
      <ScrollProgress />
      {/* ── Hero-style Header ────────────────────────────────────────────── */}
      <Reveal delay={0.05}>
      <section className="pt-10 pb-6 px-6 md:px-8 max-w-7xl mx-auto">
        <div className="text-left w-full mb-2">
          {/* Badge — small, refined, subtle */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 bg-[#d6dae8]"
            style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff', border: '1px solid rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE9]" />
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[#475569] uppercase">
              Academic Library
            </span>
          </div>

          <h1 className="text-[2.25rem] md:text-[3rem] font-bold leading-tight tracking-tight mb-2 text-[#1a1d2e]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Browse <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C63FF] to-[#A78BFA]">Resources</span>
          </h1>
          <p className="text-base text-[#475569] max-w-xl leading-relaxed"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Explore the complete repository of academic excellence. Use the unified filtering system to pinpoint specific study materials.
          </p>
        </div>
      </section>
      </Reveal>

      <Reveal delay={0.1}>
      <div className="max-w-7xl mx-auto px-6 md:px-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-10 lg:items-start">
          {/* Filters Sidebar */}
          <aside className="lg:w-72 shrink-0 w-full lg:sticky lg:top-28 z-10">
            <div
              className="rounded-[32px] p-8 max-h-[calc(100vh-8rem)] overflow-y-auto bg-[#d6dae8] scrollbar-thin scrollbar-thumb-[#b0b8cc] scrollbar-track-transparent"
              style={{ boxShadow: '12px 12px 24px #b0b8cc, -12px -12px 24px #ffffff' }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#d6dae8]"
                  style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
                >
                  <Filter className="w-5 h-5 text-[#4A3FD8]" />
                </div>
                <h3 className="font-bold text-[#1a1d2e] text-[15px] uppercase tracking-wider" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Refine By
                </h3>
              </div>

              <div className="space-y-6">
                {/* Department */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDept}
                      onChange={e => handleDeptChange(e.target.value)}
                      className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer"
                      style={{
                        boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff',
                        fontFamily: "'DM Sans', sans-serif"
                      }}
                    >
                      <option value="">Select Department</option>
                      {departmentList.map((dept: string) => (
                        <option key={dept} value={dept}>{dept.replace(/\s*\(BS[C]?\)$/i, '')}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] pointer-events-none" />
                  </div>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Semester
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSemester}
                      onChange={e => handleSemesterChange(e.target.value)}
                      disabled={!selectedDept}
                      className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:grayscale"
                      style={{
                        boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff',
                        fontFamily: "'DM Sans', sans-serif"
                      }}
                    >
                      <option value="">All Semesters</option>
                      {semesterOptions.map((sem: string) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] pointer-events-none" />
                  </div>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-[11px] font-bold text-[#475569] mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Course Reference
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCourse}
                      onChange={e => handleCourseChange(e.target.value)}
                      disabled={!selectedSemester}
                      className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:grayscale"
                      style={{
                        boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff',
                        fontFamily: "'DM Sans', sans-serif"
                      }}
                    >
                      <option value="">All Courses</option>
                      {courseOptions.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] pointer-events-none" />
                  </div>
                </div>

                {filterActive && (
                  <button
                    onClick={() => { setSelectedDept(''); setSelectedSemester(''); setSelectedCourse(''); setResources([]); }}
                    className="w-full py-3.5 rounded-2xl text-[13px] text-[#475569] font-bold transition-all duration-300 hover:text-[#4A3FD8] hover:-translate-y-0.5"
                    style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Results Area */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div
                  className="w-20 h-20 rounded-[28px] flex items-center justify-center bg-[#d6dae8]"
                  style={{ boxShadow: '12px 12px 24px #b0b8cc, -12px -12px 24px #ffffff' }}
                >
                  <Loader className="w-8 h-8 text-[#4A3FD8] animate-spin" />
                </div>
              </div>
            ) : !filterActive ? (
              <div
                className="rounded-[40px] p-16 text-center bg-[#d6dae8]"
                style={{ boxShadow: 'inset 12px 12px 24px #b0b8cc, inset -12px -12px 24px #ffffff' }}
              >
                <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-[#d6dae8]"
                  style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}>
                  <Search className="w-10 h-10 text-[#4A3FD8]" />
                </div>
                <h3 className="font-bold text-[#1a1d2e] text-2xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Ready to Start?
                </h3>
                <p className="text-[#475569] text-base max-w-sm mx-auto leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Choose your department from the sidebar to begin exploring the academic repository.
                </p>
              </div>
            ) : resources.length === 0 ? (
              <div
                className="rounded-[40px] p-16 text-center bg-[#d6dae8]"
                style={{ boxShadow: 'inset 12px 12px 24px #b0b8cc, inset -12px -12px 24px #ffffff' }}
              >
                <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-[#d6dae8]"
                  style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}>
                  <SearchX className="w-10 h-10 text-[#4A3FD8]" />
                </div>
                <h3 className="font-bold text-[#1a1d2e] text-2xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Nothing here yet
                </h3>
                <p className="text-[#475569] text-base mb-10 max-w-sm mx-auto leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  We don't have resources for this selection yet. Help colleagues by being the first to contribute!
                </p>
                <Link
                  to={`/submit?department=${encodeURIComponent(selectedDept)}&semester=${selectedSemester}&course=${selectedCourse}`}
                  className="inline-flex items-center gap-3 px-10 py-4 rounded-[20px] text-white text-[15px] font-bold transition-all duration-300 hover:-translate-y-1"
                  style={{ background: '#5B4FE9', boxShadow: '8px 8px 20px rgba(91, 79, 233, 0.3)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Upload className="w-5 h-5" />
                  Become a Contributor
                </Link>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <p className="text-[15px] font-bold text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Showing <span className="text-[#4A3FD8]">{filteredResources.length}</span> results
                    </p>
                    <p className="text-xs text-[#475569] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      In {selectedDept.replace(/\s*\(BS[C]?\)$/i, '')}
                    </p>
                  </div>
                  
                  <div className="w-full sm:w-80 relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Search className="w-4 h-4 text-[#4A3FD8]" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search within results..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-5 py-3.5 rounded-2xl text-sm text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300"
                      style={{ boxShadow: 'inset 6px 6px 12px #b0b8cc, inset -6px -6px 12px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                </div>

                {filteredResources.length === 0 ? (
                  <div
                    className="rounded-[40px] p-20 text-center bg-[#d6dae8]"
                    style={{ boxShadow: 'inset 12px 12px 24px #b0b8cc, inset -12px -12px 24px #ffffff' }}
                  >
                    <Search className="w-12 h-12 text-[#475569] opacity-50 mx-auto mb-6" />
                    <h3 className="font-bold text-[#1a1d2e] text-xl mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      No exact matches
                    </h3>
                    <p className="text-[#475569] text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      We couldn't find matches for "{searchQuery}". Try broadening your filters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {paginatedResources.map(resource => (
                        <ResourceCard key={resource.id} resource={resource} onPreview={setPreviewResource} />
                      ))}
                    </div>
                    {filteredResources.length > 0 && (
                      <Pagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={setCurrentPage} 
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
      </Reveal>
      {previewResource && (
        <ResourceDetailModal resource={previewResource} onClose={() => setPreviewResource(null)} />
      )}
    </div>
  );
}
