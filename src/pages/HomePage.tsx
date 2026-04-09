import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Library, ChevronRight, Building2, Leaf, Zap, Cpu, Settings, Bot, Factory, Laptop, Brain, Monitor, Signal, Mouse, Calculator, Atom, Upload } from 'lucide-react';
import { getRecentResources, getTotalResourceCount, getContributorCount, prefetchCoursesData } from '../lib/supabase.js';
import ResourceCard from '../components/ResourceCard.js';
import ResourceDetailModal from '../components/ResourceDetailModal.js';
import { Reveal } from '../components/Reveal.js';
import { ScrollProgress } from '../components/ScrollProgress.js';
import { Helmet } from 'react-helmet-async';

export const deptIcons: Record<string, React.ReactNode> = {
  'Civil Engineering (BSc)': <Building2 className="w-6 h-6 text-[#F59E0B]" />,
  'Environmental Engineering (BSc)': <Leaf className="w-6 h-6 text-[#10B981]" />,
  'Electrical Engineering (BSc)': <Zap className="w-6 h-6 text-[#EAB308]" />,
  'Electronics Engineering (BSc)': <Cpu className="w-6 h-6 text-[#3B82F6]" />,
  'Mechanical Engineering (BSc)': <Settings className="w-6 h-6 text-[#475569]" />,
  'Mechatronics Engineering (BSc)': <Bot className="w-6 h-6 text-[#8B5CF6]" />,
  'Industrial & Manufacturing Engineering (BSc)': <Factory className="w-6 h-6 text-[#F97316]" />,
  'Computer Engineering (BSc)': <Laptop className="w-6 h-6 text-[#0EA5E9]" />,
  'Artificial Intelligence (BS)': <Brain className="w-6 h-6 text-[#EC4899]" />,
  'Software Engineering (BSc)': <Monitor className="w-6 h-6 text-[#14B8A6]" />,
  'Telecommunication Engineering (BSc)': <Signal className="w-6 h-6 text-[#06B6D4]" />,
  'Computer Science (BSc)': <Mouse className="w-6 h-6 text-[#6366F1]" />,
  'Mathematics (BS)': <Calculator className="w-6 h-6 text-[#EF4444]" />,
  'Physics (BS)': <Atom className="w-6 h-6 text-[#8B5CF6]" />,
};

export default function HomePage() {

  const [recentResources, setRecentResources] = useState<any[]>([]);
  const [stats, setStats] = useState(() => {
    const cached = localStorage.getItem('uet_site_stats');
    return cached ? JSON.parse(cached) : { total: 0, contributors: 0 };
  });
  const [loading, setLoading] = useState(true);
  const departmentList = Object.keys(deptIcons); // Fixed 14 departments
  const [previewResource, setPreviewResource] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const [recent, totalCount, contributorCount] = await Promise.all([
          getRecentResources(4),
          getTotalResourceCount(),
          getContributorCount(),
        ]);

        const newStats = { total: totalCount, contributors: contributorCount };

        setRecentResources(recent);
        setStats(newStats);

        // Cache for next load
        localStorage.setItem('uet_site_stats', JSON.stringify(newStats));
        // Pre-warm courses cache so Browse page loads instantly
        prefetchCoursesData();
      } catch (err) {
        console.error('HomePage load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);



  return (
    <div className="min-h-screen bg-[#d6dae8]">
      <Helmet>
        <title>UET Taxila Resource Hub | Free Past Papers, Notes & Study Materials</title>
        <meta name="description" content="Free past papers, notes, assignments, and study materials for UET Taxila students. Browse by department, semester, and subject. Community-driven academic hub." />
        <link rel="canonical" href="https://uetresourcehub.app/" />
        <meta property="og:title" content="UET Taxila Resource Hub | Free Past Papers & Notes" />
        <meta property="og:description" content="Access free past papers, notes, and study materials for all UET Taxila departments." />
        <meta property="og:url" content="https://uetresourcehub.app/" />
      </Helmet>
      <ScrollProgress />
      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 px-6 md:px-8 max-w-5xl mx-auto flex flex-col items-center">
        <div className="text-center w-full mb-20">

            {/* Badge — small, refined, subtle */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-10 bg-[#d6dae8]"
              style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff', border: '1px solid rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE9]" />
              <span className="text-[10px] font-semibold tracking-[0.18em] text-[#475569] uppercase">
                UET Taxila
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-[2.75rem] md:text-[4.25rem] font-bold leading-[1.08] tracking-[-0.025em] mb-8 text-[#1a1d2e]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              The Ultimate{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] drop-shadow-sm">Resource Hub</span>
            </h1>

            {/* Subheadline — capped at ~600px */}
            <p className="text-base md:text-lg text-[#475569] mx-auto mb-0 leading-[1.7] font-normal"
              style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: '580px' }}>
              Access past papers, notes, lab manuals &amp; study materials — curated by students, for students.
            </p>
          </div>

        {/* Stat Cards — sleek, horizontal, minimal */}
        <Reveal delay={0.3} yOffset={50}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
            {[
              { icon: <Library className="w-[18px] h-[18px] text-[#4A3FD8]" />, value: stats.total, label: 'Resources', glow: 'rgba(91, 79, 233, 0.15)' },
              { icon: <BookOpen className="w-[18px] h-[18px] text-[#0EA5E9]" />, value: departmentList.length, label: 'Departments', glow: 'rgba(14, 165, 233, 0.15)' },
              { icon: <Users className="w-[18px] h-[18px] text-[#8B5CF6]" />, value: stats.contributors, label: 'Contributors', glow: 'rgba(139, 92, 246, 0.15)' },
            ].map((stat, i) => (
              <div key={i}
                className="flex items-center gap-4 rounded-[24px] px-6 py-5 bg-[#d6dae8]"
                style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#d6dae8] relative overflow-hidden"
                  style={{ boxShadow: 'inset 3px 3px 6px #b0b8cc, inset -3px -3px 6px #ffffff' }}>
                  <div className="absolute inset-0 opacity-20 blur-xl scale-150" style={{ backgroundColor: stat.glow }}></div>
                  <div className="relative z-10">{stat.icon}</div>
                </div>
                <div>
                  <p className="font-bold text-2xl text-[#1a1d2e] tabular-nums leading-none mb-1"
                    style={{ fontFamily: "'Inter', sans-serif" }}>{stat.value}</p>
                  <p className="text-[11px] text-[#475569] font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'Inter', sans-serif" }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Departments Grid */}
      <Reveal delay={0.2}>
        <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 md:mb-10 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1d2e] tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Browse by Department
            </h2>
            <Link to="/browse"
              className="flex items-center gap-1 text-sm text-[#4A3FD8] font-semibold hover:gap-2 transition-all duration-200 focus:outline-none whitespace-nowrap shrink-0"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departmentList.map((dept) => (
                <Link
                  key={dept}
                  to={`/browse?department=${encodeURIComponent(dept)}`}
                  className="rounded-[20px] p-4 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] group focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] bg-[#d6dae8]"
                  style={{ boxShadow: '6px 6px 12px #b0b8cc, -6px -6px 12px #ffffff' }}
                >
                  <div
                    className="w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center transition-all duration-300 bg-[#d6dae8] [&>svg]:w-5 [&>svg]:h-5 [&>svg]:opacity-80 group-hover:[&>svg]:opacity-100 group-hover:[&>svg]:scale-110"
                    style={{ boxShadow: 'inset 3px 3px 6px #b0b8cc, inset -3px -3px 6px #ffffff' }}
                  >
                    {deptIcons[dept] || <BookOpen className="text-[#475569]" />}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h3
                      className="font-bold text-[#1a1d2e] text-[13px] sm:text-[15px] leading-snug group-hover:text-[#4A3FD8] transition-colors duration-200 line-clamp-2"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      title={dept}
                    >
                      {dept.replace(/\s*\(BS[C]?\)$/i, '')}
                    </h3>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                    <ArrowRight className="w-4 h-4 text-[#4A3FD8]" />
                  </div>
                </Link>
              ))}
            </div>
        </section>
      </Reveal>

      {/* Recent Submissions */}
      <Reveal delay={0.2}>
        <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 md:mb-10 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1d2e] tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Recent Submissions
            </h2>
            <Link to="/browse"
              className="flex items-center gap-1 text-sm text-[#4A3FD8] font-semibold hover:gap-2 transition-all duration-200 focus:outline-none whitespace-nowrap shrink-0"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Browse all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-[24px] h-64 animate-pulse bg-[#d6dae8]"
                  style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}
                />
              ))}
            </div>
          ) : recentResources.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentResources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} onPreview={setPreviewResource} />
              ))}
            </div>
          ) : (
            <div
              className="rounded-[24px] p-12 text-center bg-[#d6dae8]"
              style={{ boxShadow: 'inset 8px 8px 16px #b0b8cc, inset -8px -8px 16px #ffffff' }}
            >
              <BookOpen className="w-12 h-12 text-[#4A3FD8] mx-auto mb-5" />
              <h3 className="font-bold text-[#1a1d2e] text-lg mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                No approved resources yet
              </h3>
              <p className="text-[#475569] text-sm mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Be the first to share academic resources with your fellow students!
              </p>
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white text-sm font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(91,79,233,0.4)] focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8]"
                style={{ background: '#5B4FE9', boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
              >
                Submit First Resource
              </Link>
            </div>
          )}
        </section>
      </Reveal>

      {/* CTA Banner */}
      <Reveal delay={0.2} yOffset={40}>
        <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto pb-0">
          <div
            className="rounded-[24px] p-10 md:p-16 text-center bg-[#d6dae8]"
            style={{ boxShadow: '12px 12px 24px #b0b8cc, -12px -12px 24px #ffffff' }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-8 bg-[#d6dae8]"
              style={{ boxShadow: 'inset 6px 6px 12px #b0b8cc, inset -6px -6px 12px #ffffff' }}
            >
              <Upload className="w-10 h-10 text-[#4A3FD8]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a1d2e] mb-4 tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Have study materials?
            </h2>
            <p className="text-[#475569] mb-10 max-w-md mx-auto text-base md:text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Help your fellow students by sharing past papers, notes, lab manuals, and more.
            </p>
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 px-9 py-4.5 rounded-2xl text-white font-bold text-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(91,79,233,0.5)] active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8]"
              style={{ background: '#5B4FE9', boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
            >
              Submit a Resource <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </Reveal>
      {previewResource && (
        <ResourceDetailModal resource={previewResource} onClose={() => setPreviewResource(null)} />
      )}
    </div>
  );
}
