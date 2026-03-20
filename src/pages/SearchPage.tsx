import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Loader, ChevronDown, SearchX, Upload } from 'lucide-react';
import { departmentList, resourceTypes, departments } from '../data/courses.js';
import ResourceCard from '../components/ResourceCard';
import ResourceDetailModal from '../components/ResourceDetailModal';
import { searchResources } from '../lib/supabase.js';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const filterType = searchParams.get('type') || '';
  const filterDept = searchParams.get('dept') || '';
  const filterSemester = searchParams.get('semester') || '';
  const filterCourse = searchParams.get('course') || '';

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [previewResource, setPreviewResource] = useState<any>(null);

  const semesterOptions = filterDept
    ? Object.keys(departments[filterDept as keyof typeof departments] || {}).sort((a, b) => Number(a) - Number(b))
    : [];

  const courseOptions = filterDept && filterSemester
    ? (departments[filterDept as keyof typeof departments] as any)?.[filterSemester] || []
    : [];

  useEffect(() => {
    async function load() {
      if (!query && !filterType && !filterDept) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const filters: any = {};
        if (filterType) filters.type = filterType;
        if (filterDept) filters.department = filterDept;
        if (filterSemester) filters.semester = Number(filterSemester);
        if (filterCourse) filters.courseCode = filterCourse;
        
        const data = await searchResources(query, filters);
        setResults(data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [query, filterType, filterDept, filterSemester, filterCourse]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams({ q: searchInput });
  };

  const handleTypeChange = (type: string) => updateSearchParams({ type });
  const handleDeptChange = (dept: string) => updateSearchParams({ dept, semester: '', course: '' });
  const handleSemesterChange = (semester: string) => updateSearchParams({ semester, course: '' });
  const handleCourseChange = (course: string) => updateSearchParams({ course });

  const clearFilters = () => {
    setSearchParams({ q: query });
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-[#d6dae8]">
      {/* ── Hero-style Header ────────────────────────────────────────────── */}
      <section className="pt-10 pb-6 px-6 md:px-8 max-w-7xl mx-auto">
        <div className="text-left w-full mb-2">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 bg-[#d6dae8]"
            style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff', border: '1px solid rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE9]" />
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[#64748B] uppercase">
              Digital Library
            </span>
          </div>

          <h1 className="text-[2.25rem] md:text-[3rem] font-bold leading-tight tracking-tight mb-2 text-[#1a1d2e]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Search <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C63FF] to-[#A78BFA]">Results</span>
          </h1>
          {query ? (
            <p className="text-base text-[#64748B] max-w-xl leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Showing curated matching for <strong className="text-[#1a1d2e]">"{query}"</strong> across all academic departments.
            </p>
          ) : (
            <p className="text-base text-[#64748B] max-w-xl leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Our engine covers past papers, notes, and manuals. Start typing to explore the repository.
            </p>
          )}
        </div>

        {/* Search Bar — Refined Neumorphic */}
        <form onSubmit={handleSearch} className="flex gap-4 mt-6 max-w-2xl">
          <div
            className="flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#d6dae8]"
            style={{ boxShadow: 'inset 10px 10px 20px #b0b8cc, inset -10px -10px 20px #ffffff' }}
          >
            <Search className="w-5 h-5 text-[#5B4FE9]" />
            <input
              type="text"
              placeholder="Search by title, course, or department..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="flex-1 bg-transparent text-[#1a1d2e] placeholder-[#64748B]/60 outline-none text-[15px] font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <button
            type="submit"
            className="px-8 py-4 rounded-2xl text-white font-bold text-[15px] transition-all duration-300 hover:scale-[1.02] active:scale-95"
            style={{ background: '#5B4FE9', fontFamily: "'DM Sans', sans-serif", boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}
          >
            Find
          </button>
        </form>
      </section>

      <div className="max-w-7xl mx-auto px-6 md:px-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Filters Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div
              className="rounded-[32px] p-8 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto bg-[#d6dae8]"
              style={{ boxShadow: '12px 12px 24px #b0b8cc, -12px -12px 24px #ffffff' }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#d6dae8]"
                  style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
                >
                  <Filter className="w-5 h-5 text-[#5B4FE9]" />
                </div>
                <h3 className="font-bold text-[#1a1d2e] text-[15px] uppercase tracking-wider" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Refine
                </h3>
              </div>

              <div className="space-y-6">
                {/* Type Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Type
                  </label>
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={e => handleTypeChange(e.target.value)}
                      className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer"
                      style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <option value="">All Types</option>
                      {resourceTypes.map((t: string) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                {/* Department Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={filterDept}
                      onChange={e => handleDeptChange(e.target.value)}
                      className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer"
                      style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <option value="">All Departments</option>
                      {departmentList.map((dept: string) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                {/* Semester Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Semester
                  </label>
                  <div className="relative">
                    <select
                      value={filterSemester}
                      onChange={e => handleSemesterChange(e.target.value)}
                      disabled={!filterDept}
                      className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:grayscale"
                      style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <option value="">All Semesters</option>
                      {semesterOptions.map((sem: string) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                {/* Course Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] mb-3 uppercase tracking-[0.15em]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Course
                  </label>
                  <div className="relative">
                    <select
                      value={filterCourse}
                      onChange={e => handleCourseChange(e.target.value)}
                      disabled={!filterSemester}
                      className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:grayscale"
                      style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <option value="">All Courses</option>
                      {courseOptions.map((c: any) => (
                        <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                  </div>
                </div>

                {(filterType || filterDept || filterSemester || filterCourse) && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-3.5 rounded-2xl text-[13px] text-[#64748B] font-bold transition-all duration-300 hover:text-[#5B4FE9] hover:-translate-y-0.5"
                    style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Clear All
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
                  <Loader className="w-8 h-8 text-[#5B4FE9] animate-spin" />
                </div>
              </div>
            ) : !query && !filterType && !filterDept ? (
              <div
                className="rounded-[40px] p-16 text-center bg-[#d6dae8]"
                style={{ boxShadow: 'inset 12px 12px 24px #b0b8cc, inset -12px -12px 24px #ffffff' }}
              >
                <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-[#d6dae8]"
                  style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}>
                  <Search className="w-10 h-10 text-[#5B4FE9]" />
                </div>
                <h3 className="font-bold text-[#1a1d2e] text-2xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Ready to Search?
                </h3>
                <p className="text-[#64748B] text-base max-w-sm mx-auto leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Enter a keyword or use the filters to explore our student-powered library.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div
                className="rounded-[40px] p-16 text-center bg-[#d6dae8]"
                style={{ boxShadow: 'inset 12px 12px 24px #b0b8cc, inset -12px -12px 24px #ffffff' }}
              >
                <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-[#d6dae8]"
                  style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}>
                  <SearchX className="w-10 h-10 text-[#5B4FE9]" />
                </div>
                <h3 className="font-bold text-[#1a1d2e] text-2xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  No match found
                </h3>
                <p className="text-[#64748B] text-base mb-10 max-w-sm mx-auto leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  We couldn't find items for "{query}". Try broadening your filters or contribute if you have it!
                </p>
                <Link
                  to="/submit"
                  className="inline-flex items-center gap-3 px-10 py-4 rounded-[20px] text-white text-[15px] font-bold transition-all duration-300 hover:-translate-y-1"
                  style={{ background: '#5B4FE9', fontFamily: "'DM Sans', sans-serif", boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}
                >
                  <Upload className="w-5 h-5" />
                  Submit Resource
                </Link>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="flex items-center justify-between mb-8">
                  <p className="text-[17px] font-bold text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Found <span className="text-[#5B4FE9]">{results.length}</span> results
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {results.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} onPreview={setPreviewResource} />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      {previewResource && (
        <ResourceDetailModal resource={previewResource} onClose={() => setPreviewResource(null)} />
      )}
    </div>
  );
}
