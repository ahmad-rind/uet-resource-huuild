import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, Loader, ChevronDown, SearchX, Upload } from 'lucide-react';
import { resourceTypes } from '../data/courses.js';
import ResourceCard from '../components/ResourceCard.js';
import ResourceDetailModal from '../components/ResourceDetailModal.js';
import { searchResources, getLiveCoursesData } from '../lib/supabase.js';
import { ScrollProgress } from '../components/ScrollProgress.js';
import { Reveal } from '../components/Reveal.js';
import { Pagination } from '../components/Pagination.js';
import BackToTop from '../components/BackToTop.js';
import { Helmet } from 'react-helmet-async';

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
  const [inlineQuery, setInlineQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const [departments, setDepartments] = useState<any>({});
  const [departmentList, setDepartmentList] = useState<string[]>([]);

  useEffect(() => {
    getLiveCoursesData().then(data => {
      setDepartments(data.departments);
      setDepartmentList(data.departmentList);
    });
  }, []);

  const semesterOptions = filterDept && departments[filterDept]
    ? Object.keys(departments[filterDept] || {}).sort((a, b) => Number(a) - Number(b))
    : [];

  const courseOptions = filterDept && filterSemester && departments[filterDept]
    ? (departments[filterDept] || {})[filterSemester] || []
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
    setInlineQuery('');
    load();
  }, [query, filterType, filterDept, filterSemester, filterCourse]);

  const filteredResults = results.filter(r => {
    if (!inlineQuery) return true;
    const q = inlineQuery.toLowerCase();
    return r.title.toLowerCase().includes(q) ||
           r.courseCode.toLowerCase().includes(q) ||
           r.courseName.toLowerCase().includes(q) ||
           r.description?.toLowerCase().includes(q);
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams({ q: searchInput });
  };

  const handleTypeChange = (type: string) => updateSearchParams({ type });
  const handleDeptChange = (dept: string) => updateSearchParams({ dept, semester: '', course: '' });
  const handleSemesterChange = (semester: string) => updateSearchParams({ semester, course: '' });
  const handleCourseChange = (course: string) => updateSearchParams({ course });

  const clearFilters = () => {
    const newParams = new URLSearchParams();
    if (query) newParams.set('q', query);
    setSearchParams(newParams);
  };

  const updateSearchParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    setSearchParams(newParams);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterType, filterDept, filterSemester, filterCourse, inlineQuery]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectStyle = {
    background: 'var(--neu-bg)',
    color: 'var(--neu-fg)',
    boxShadow: 'var(--neu-shadow-inset)',
    fontFamily: "'DM Sans', sans-serif"
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--neu-bg)' }}>
      <Helmet>
        <title>{query ? `${query} — Search UET Taxila Resources` : 'Search UET Taxila Study Materials | Past Papers, Notes'}</title>
        <meta name="description" content={query ? `Search results for "${query}" in UET Taxila resources.` : 'Search and find UET Taxila past papers, notes, assignments across all departments.'} />
        <link rel="canonical" href={`https://uetresourcehub.app/search${query ? `?q=${encodeURIComponent(query)}` : ''}`} />
        <meta property="og:title" content={query ? `${query} — UET Taxila Resources` : 'Search — UET Taxila Resource Hub'} />
        <meta property="og:url" content={`https://uetresourcehub.app/search${query ? `?q=${encodeURIComponent(query)}` : ''}`} />
      </Helmet>
      <ScrollProgress />

      <Reveal delay={0.05}>
      <section className="pt-10 pb-6 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-left w-full mb-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4"
            style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded-sm)', border: '1px solid var(--neu-border)', fontFamily: "'DM Sans', sans-serif" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--neu-accent)' }} />
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--neu-muted)' }}>
              Digital Library
            </span>
          </div>

          <h1 className="text-[2.25rem] md:text-[3rem] font-bold leading-tight tracking-tight mb-2"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>
            Search <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--neu-gradient-accent)' }}>Results</span>
          </h1>
          {query ? (
            <p className="text-base max-w-xl leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>
              Showing curated matching for <strong style={{ color: 'var(--neu-fg)' }}>"{query}"</strong> across all academic departments.
            </p>
          ) : (
            <p className="text-base max-w-xl leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>
              Our engine covers past papers, notes, and manuals. Start typing to explore the repository.
            </p>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mt-5 sm:mt-6 max-w-2xl w-full">
          <div
            className="flex-1 min-w-0 flex items-center gap-3 px-5 py-4 rounded-2xl"
            style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-inset-deep)' }}
          >
            <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--neu-accent)' }} />
            <input
              type="text"
              placeholder="Search title, course, or department..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-fg)' }}
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold text-[15px] transition-all duration-150 hover:scale-[1.02] active:scale-95 shrink-0"
            style={{ background: 'var(--neu-btn)', fontFamily: "'DM Sans', sans-serif", boxShadow: 'var(--neu-shadow-extruded)' }}
          >
            Find
          </button>
        </form>
      </section>
      </Reveal>

      <Reveal delay={0.08}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
        <div className="flex flex-col lg:flex-row gap-10 lg:items-start">
          {/* Filters Sidebar */}
          <aside className="lg:w-72 shrink-0 w-full lg:sticky lg:top-28 z-10">
            <div
              className="rounded-[32px] p-6 lg:p-8 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-track-transparent"
              style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded-lg)' }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-inset-sm)' }}>
                  <Filter className="w-5 h-5" style={{ color: 'var(--neu-accent)' }} />
                </div>
                <h3 className="font-bold text-[15px] uppercase tracking-wider" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>
                  Refine
                </h3>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Type', value: filterType, onChange: handleTypeChange, disabled: false,
                    options: resourceTypes.map((t: string) => ({ value: t, label: t })) },
                  { label: 'Department', value: filterDept, onChange: handleDeptChange, disabled: false,
                    options: departmentList.map((d: string) => ({ value: d, label: d.replace(/\s*\(BS[C]?\)$/i, '') })) },
                  { label: 'Semester', value: filterSemester, onChange: handleSemesterChange, disabled: !filterDept,
                    options: semesterOptions.map((s: string) => ({ value: s, label: `Semester ${s}` })) },
                  { label: 'Course', value: filterCourse, onChange: handleCourseChange, disabled: !filterSemester,
                    options: courseOptions.map((c: any) => ({ value: c.code, label: `${c.code} — ${c.name}` })) },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[11px] font-bold mb-3 uppercase tracking-[0.15em]"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>
                      {f.label}
                    </label>
                    <div className="relative">
                      <select
                        value={f.value}
                        onChange={e => f.onChange(e.target.value)}
                        disabled={f.disabled}
                        className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:grayscale"
                        style={selectStyle}
                      >
                        <option value="">All {f.label}s</option>
                        {f.options.map((o: { value: string; label: string }) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--neu-muted)' }} />
                    </div>
                  </div>
                ))}

                {(filterType || filterDept || filterSemester || filterCourse) && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-150 hover:-translate-y-0.5"
                    style={{ boxShadow: 'var(--neu-shadow-extruded)', fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)', background: 'var(--neu-bg)' }}
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
                <div className="w-20 h-20 rounded-[28px] flex items-center justify-center"
                  style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded-lg)' }}>
                  <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--neu-accent)' }} />
                </div>
              </div>
            ) : !query && !filterType && !filterDept ? (
              <div className="rounded-[40px] p-16 text-center"
                style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-inset)' }}>
                <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8"
                  style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded)' }}>
                  <Search className="w-10 h-10" style={{ color: 'var(--neu-accent)' }} />
                </div>
                <h3 className="font-bold text-2xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>
                  Ready to Search?
                </h3>
                <p className="text-base max-w-sm mx-auto leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>
                  Enter a keyword or use the filters to explore our student-powered library.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-[40px] p-16 text-center"
                style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-inset)' }}>
                <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8"
                  style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded)' }}>
                  <SearchX className="w-10 h-10" style={{ color: 'var(--neu-accent)' }} />
                </div>
                <h3 className="font-bold text-2xl mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>
                  No match found
                </h3>
                <p className="text-base mb-10 max-w-sm mx-auto leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>
                  We couldn't find items for "{query}". Try broadening your filters or contribute if you have it!
                </p>
                <Link
                  to="/submit"
                  className="inline-flex items-center gap-3 px-10 py-4 rounded-[20px] text-white text-[15px] font-bold transition-all duration-150 hover:-translate-y-1"
                  style={{ background: 'var(--neu-btn)', fontFamily: "'DM Sans', sans-serif", boxShadow: 'var(--neu-shadow-extruded)' }}
                >
                  <Upload className="w-5 h-5" />
                  Submit Resource
                </Link>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                  <div>
                    <p className="text-[15px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>
                      Showing <span style={{ color: 'var(--neu-accent)' }}>{filteredResults.length}</span> results
                    </p>
                    {query && (
                      <p className="text-xs font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>
                        For "{query}"
                      </p>
                    )}
                  </div>
                  <div className="w-full sm:w-80 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Search className="w-4 h-4" style={{ color: 'var(--neu-accent)' }} />
                    </div>
                    <input
                      type="text"
                      placeholder="Filter shown results..."
                      value={inlineQuery}
                      onChange={(e) => setInlineQuery(e.target.value)}
                      className="w-full pl-11 pr-5 py-3.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-150"
                      style={{ background: 'var(--neu-bg)', color: 'var(--neu-fg)', boxShadow: 'var(--neu-shadow-inset)', fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedResults.map(resource => (
                    <ResourceCard key={resource.id} resource={resource} onPreview={setPreviewResource} />
                  ))}
                </div>
                {filteredResults.length > 0 && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                  />
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
      <BackToTop />
    </div>
  );
}
