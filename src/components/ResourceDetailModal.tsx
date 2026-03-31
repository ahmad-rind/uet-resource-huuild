import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Copy, Flag, Check, BookOpen } from 'lucide-react';
import { reportResource } from '../lib/supabase.js';

interface Resource {
  id: string;
  title: string;
  type: string;
  department: string;
  semester: number;
  courseCode: string;
  courseName: string;
  link: string;
  uploadedBy?: string;
  uploadedAt?: string;
  description?: string;
  reportCount?: number;
}

interface ResourceDetailModalProps {
  resource: Resource;
  onClose: () => void;
}


function fmtDate(d?: string) {
  if (!d) return 'Unknown';
  try {
    return new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return 'Unknown';
  }
}

export default function ResourceDetailModal({ resource, onClose }: ResourceDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Escape key to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(resource.link); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReport = async () => {
    if (reported) return;
    await reportResource(resource.id);
    setReported(true);
  };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fadeIn"
      style={{ 
        background: 'rgba(26,29,46,0.3)', 
        backdropFilter: 'blur(10px)',
        animation: 'modalBackdropFade 0.4s ease-out forwards'
      }}
    >
      <style>{`
        @keyframes modalBackdropFade {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(10px); }
        }
        @keyframes modalContainerScale {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden relative"
        style={{ 
          background: '#d6dae8',
          boxShadow: '20px 20px 40px #b0b8cc, -20px -20px 40px #ffffff, 0 0 30px rgba(91, 79, 233, 0.15)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          animation: 'modalContainerScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        <div className="p-8 space-y-6">
          {/* Header Section */}
          <header className="flex justify-between items-start gap-4">
            <div className="space-y-1 flex-1">
              <h1 className="text-2xl font-extrabold text-[#1a1d2e] tracking-tight">
                {resource.title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#5B4FE9]">
                  {resource.courseCode}
                </span>
                <span className="w-1 h-1 bg-[#1a1d2e]/20 rounded-full"></span>
                <span className="text-xs font-semibold text-[#1a1d2e]/60">
                  {resource.courseName}
                </span>
              </div>
            </div>
            
            {/* Icon Badge */}
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-[#5B4FE9] bg-[#d6dae8]"
              style={{ boxShadow: '4px 4px 10px #b0b8cc, -4px -4px 10px #ffffff' }}
            >
              <BookOpen className="w-7 h-7" />
            </div>
          </header>

          <div className="h-[1px] w-full bg-[#1a1d2e]/10"></div>

          {/* Body Section */}
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-[#1a1d2e] opacity-80 font-medium">
              {resource.description || "No description provided."}
            </p>
          </div>

          {/* Info List */}
          <div className="space-y-1 pt-2">
            <div className="grid grid-cols-[110px_1fr] items-center py-2 px-1">
              <span className="text-[10px] font-bold text-[#1a1d2e]/50 uppercase tracking-widest">Department</span>
              <span className="text-sm font-bold text-[#1a1d2e] text-right">{resource.department.replace(/\s*\(BS[C]?\)$/i, '')}</span>
            </div>
            
            <div 
              className="grid grid-cols-[110px_1fr] items-center py-3 px-4 -mx-3 rounded-xl bg-[#d6dae8]"
              style={{ boxShadow: 'inset 4px 4px 10px #b0b8cc, inset -4px -4px 10px #ffffff' }}
            >
              <span className="text-[10px] font-bold text-[#1a1d2e]/50 uppercase tracking-widest">Contributor</span>
              <span className="text-sm font-bold text-[#1a1d2e] text-right">{resource.uploadedBy || 'Anonymous'}</span>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-center py-2 px-1">
              <span className="text-[10px] font-bold text-[#454652]/60 uppercase tracking-widest">Date Added</span>
              <span className="text-sm font-bold text-[#191c1e] text-right">{fmtDate(resource.uploadedAt)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4">
            <div className="flex items-center gap-3 w-full">
              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-grow h-14 flex items-center justify-center gap-2 bg-gradient-to-br from-[#5B4FE9] to-[#493fdf] text-white rounded-xl font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-indigo-200"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Download</span>
              </a>

              <button
                onClick={handleCopy}
                className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#d6dae8] text-[#64748B] transition-all duration-300 hover:text-[#5B4FE9] group active:scale-95"
                style={{ 
                  boxShadow: '4px 4px 10px #949db2, -4px -4px 10px #ffffff'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #949db2, inset -3px -3px 6px #ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '4px 4px 10px #949db2, -4px -4px 10px #ffffff';
                }}
                title="Copy Link"
              >
                {copied ? <Check className="w-5 h-5 text-[#10B981]" /> : <Copy className="w-5 h-5" />}
              </button>

              <button
                onClick={handleReport}
                disabled={reported}
                className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#d6dae8] text-[#64748B] transition-all duration-300 hover:text-[#5B4FE9] active:scale-95 disabled:opacity-50"
                style={{ 
                  boxShadow: '4px 4px 10px #949db2, -4px -4px 10px #ffffff'
                }}
                onMouseOver={(e) => {
                  if (!reported) e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #949db2, inset -3px -3px 6px #ffffff';
                }}
                onMouseOut={(e) => {
                  if (!reported) e.currentTarget.style.boxShadow = '4px 4px 10px #949db2, -4px -4px 10px #ffffff';
                }}
                title="Report"
              >
                <Flag className="w-5 h-5" style={{ color: reported ? '#ef4444' : 'inherit' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
