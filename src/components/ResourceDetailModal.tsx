import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Copy, Flag, Check, BookOpen } from 'lucide-react';
import { reportResource } from '../lib/supabase.js';
import { useToast } from './Toast';

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
  const { showToast } = useToast();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    return () => { 
      document.body.style.overflow = originalOverflow; 
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(resource.link); } catch { /* noop */ }
    setCopied(true);
    showToast('Link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReport = async () => {
    if (reported) return;
    await reportResource(resource.id);
    setReported(true);
    showToast('Resource reported — thank you', 'info');
  };

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-fadeIn"
      style={{ 
        background: 'rgba(26,29,46,0.3)', 
        backdropFilter: 'blur(10px)',
        animation: 'modalBackdropFade 0.2s ease-out forwards'
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
          background: 'var(--neu-bg)',
          boxShadow: 'var(--neu-shadow-extruded-lg), 0 0 30px rgba(91, 79, 233, 0.15)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          animation: 'modalContainerScale 0.2s ease-out forwards'
        }}
      >
        <div className="p-8 space-y-6">
          {/* Header Section */}
          <header className="flex justify-between items-start gap-4">
            <div className="space-y-1 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--neu-fg)' }}>
                {resource.title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: 'var(--neu-accent)' }}>
                  {resource.courseCode}
                </span>
                <span className="w-1 h-1 rounded-full" style={{ background: 'var(--neu-muted)', opacity: 0.3 }}></span>
                <span className="text-xs font-semibold" style={{ color: 'var(--neu-muted)' }}>
                  {resource.courseName}
                </span>
              </div>
            </div>
            
            {/* Icon Badge */}
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded-sm)', color: 'var(--neu-accent)' }}
            >
              <BookOpen className="w-7 h-7" />
            </div>
          </header>

          <div className="h-[1px] w-full" style={{ background: 'var(--neu-border)' }}></div>

          {/* Body Section */}
          <div className="space-y-2">
            <p className="text-sm leading-relaxed opacity-80 font-medium" style={{ color: 'var(--neu-fg)' }}>
              {resource.description || "No description provided."}
            </p>
          </div>

          {/* Info List */}
          <div className="space-y-1 pt-2">
            <div className="grid grid-cols-[110px_1fr] items-center py-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--neu-muted)', opacity: 0.7 }}>Department</span>
              <span className="text-sm font-bold text-right" style={{ color: 'var(--neu-fg)' }}>{resource.department.replace(/\s*\(BS[C]?\)$/i, '')}</span>
            </div>
            
            <div 
              className="grid grid-cols-[110px_1fr] items-center py-3 px-4 -mx-3 rounded-xl"
              style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-inset-sm)' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--neu-muted)', opacity: 0.7 }}>Contributor</span>
              <span className="text-sm font-bold text-right" style={{ color: 'var(--neu-fg)' }}>{resource.uploadedBy || 'Anonymous'}</span>
            </div>

            <div className="grid grid-cols-[110px_1fr] items-center py-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--neu-muted)', opacity: 0.7 }}>Date Added</span>
              <span className="text-sm font-bold text-right" style={{ color: 'var(--neu-fg)' }}>{fmtDate(resource.uploadedAt)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4">
            <div className="flex items-center gap-3 w-full">
              <a
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-grow h-14 flex items-center justify-center gap-2 text-white rounded-xl font-bold text-sm transition-all duration-150 hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: 'var(--neu-btn)',
                  boxShadow: 'var(--neu-shadow-extruded)',
                }}
              >
                <ExternalLink className="w-5 h-5" />
                <span>Download</span>
              </a>

              <button
                onClick={handleCopy}
                className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                style={{ 
                  background: 'var(--neu-bg)',
                  boxShadow: 'var(--neu-shadow-extruded-sm)',
                  color: 'var(--neu-muted)',
                }}
                title="Copy Link"
              >
                {copied ? <Check className="w-5 h-5 text-[#10B981]" /> : <Copy className="w-5 h-5" />}
              </button>

              <button
                onClick={handleReport}
                disabled={reported}
                className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50"
                style={{ 
                  background: 'var(--neu-bg)',
                  boxShadow: 'var(--neu-shadow-extruded-sm)',
                  color: 'var(--neu-muted)',
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
