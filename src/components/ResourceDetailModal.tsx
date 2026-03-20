import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Copy, Flag, Check, User, Calendar, X, BookOpen, Layers } from 'lucide-react';
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

const S = {
  bg:       '#d6dae8',
  fg:       '#1a1d2e',
  muted:    '#64748B',
  accent:   '#5B4FE9',
};

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
        className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-[32px] p-8 md:p-10 hide-scrollbar"
        style={{ 
          background: S.bg, 
          boxShadow: '9px 9px 18px #b0b8cc, -9px -9px 18px #ffffff',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          animation: 'modalContainerScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div 
              className="px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest text-[#5B4FE9] uppercase"
              style={{ 
                background: S.bg, 
                boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff' 
              }}
            >
              {resource.type}
            </div>
            <span className="text-xs font-bold text-[#64748B]/60 tracking-wide">
              Semester {resource.semester}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-2xl text-[#64748B] transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title Section */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1d2e] mb-2 leading-tight">
            {resource.title}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#5B4FE9]">{resource.courseCode}</span>
            <span className="text-[#64748B]/30">•</span>
            <span className="text-[13px] font-medium text-[#64748B]">{resource.courseName}</span>
          </div>
        </div>

        {/* Meta Grid (Inset Container) */}
        <div 
          className="grid grid-cols-2 md:grid-cols-4 gap-6 rounded-[24px] p-7 mb-8"
          style={{ 
            boxShadow: 'inset 6px 6px 12px #b0b8cc, inset -6px -6px 12px #ffffff',
            background: S.bg 
          }}
        >
          {[
            { label: 'Department', value: resource.department, icon: <BookOpen className="w-3.5 h-3.5" /> },
            { label: 'Semester', value: `Semester ${resource.semester}`, icon: <Layers className="w-3.5 h-3.5" /> },
            { label: 'Contributor', value: resource.uploadedBy || 'Anonymous', icon: <User className="w-3.5 h-3.5" /> },
            { label: 'Date Added', value: fmtDate(resource.uploadedAt), icon: <Calendar className="w-3.5 h-3.5" /> },
          ].map(m => (
            <div key={m.label} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold text-[#64748B]/50 uppercase tracking-widest flex items-center gap-1.5">
                {m.icon}
                {m.label}
              </span>
              <span className="text-[13px] font-bold text-[#1a1d2e] leading-snug">
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Description */}
        {resource.description && (
          <div className="mb-8">
            <p className="text-[10px] font-extrabold text-[#64748B]/50 uppercase tracking-widest mb-3 px-1">
              Description
            </p>
            <div 
              className="text-[14px] leading-relaxed rounded-2xl p-5 text-[#1a1d2e] opacity-90"
              style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
            >
              {resource.description}
            </div>
          </div>
        )}

        {/* Resource Link Title */}
        <div className="mb-3 px-1">
          <span className="text-[10px] font-extrabold text-[#64748B]/50 uppercase tracking-widest">
            Resource Link
          </span>
        </div>

        {/* Link Field (Inset) */}
        <div 
          className="px-5 py-4 rounded-2xl mb-10 overflow-hidden"
          style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
        >
          <span className="text-[13px] font-mono text-[#1a1d2e] break-all opacity-80">
            {resource.link}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={resource.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-[20px] bg-[#5B4FE9] text-white text-[14px] font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-[6px_6px_14px_rgba(91,79,233,0.3)] hover:shadow-[8px_8px_18px_rgba(91,79,233,0.4)]"
          >
            <ExternalLink className="w-5 h-5" />
            Download / View Resource
          </a>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-4 px-6 rounded-[20px] text-[#1a1d2e] text-[14px] font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95"
              style={{ boxShadow: '6px 6px 12px #b0b8cc, -6px -6px 12px #ffffff' }}
            >
              {copied ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={handleReport}
              disabled={reported}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-4 px-6 rounded-[20px] text-[14px] font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{ 
                boxShadow: '6px 6px 12px #b0b8cc, -6px -6px 12px #ffffff',
                color: reported ? '#ef4444' : '#64748B'
              }}
            >
              <Flag className="w-4 h-4" />
              {reported ? 'Reported' : 'Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
