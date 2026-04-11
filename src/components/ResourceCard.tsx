import { ArrowUpRight } from 'lucide-react';

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

interface ResourceCardProps {
  resource: Resource;
  onPreview?: (resource: Resource) => void;
}

function FileIcon({ className, style }: { className?: string, style?: React.CSSProperties }) { return (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path 
      d="M13 2H9C5 2 3 4 3 8V16C3 20 5 22 9 22H15C19 22 21 20 21 16V10L13 2Z" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path 
      d="M13 2V7C13 9 14 10 16 10H21" 
      stroke="currentColor" 
      strokeWidth="1.8" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <path d="M7 13H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7 17H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
}

export default function ResourceCard({ resource, onPreview }: ResourceCardProps) {

  // Color mapping based on resource type
  const getTypeStyles = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('past paper')) return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
    if (t.includes('template')) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' };
    if (t.includes('lab')) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' };
    return { bg: 'rgba(91, 79, 233, 0.15)', text: '#5B4FE9' };
  };

  const typeStyle = getTypeStyles(resource.type);

  return (
    <div
      onClick={() => onPreview?.(resource)}
      className="relative rounded-[32px] overflow-hidden transition-all duration-150 hover:-translate-y-1.5 group flex flex-row h-[120px] md:h-[130px] cursor-pointer"
      style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded)' }}
    >
      {/* Left Sidebar */}
      <div 
        className="w-[68px] md:w-[76px] shrink-0 flex flex-col items-center justify-center gap-2.5 py-4 px-1.5 text-center"
        style={{ backgroundColor: typeStyle.bg }}
      >
        <div 
          className="w-10 h-10 md:w-11 md:h-11 rounded-[16px] md:rounded-[20px] flex items-center justify-center shrink-0"
          style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-inset-sm)' }}
        >
          <FileIcon className="w-4 h-4 md:w-5 md:h-5 opacity-90" style={{ color: typeStyle.text }} />
        </div>

        <span 
          className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-widest break-words w-full"
          style={{ color: typeStyle.text }}
        >
          SEM {resource.semester}
        </span>
      </div>

      {/* Right Content */}
      <div className="flex-1 flex flex-col p-3.5 md:p-4 min-w-0 justify-between">
        <div>
          <h3
            className="font-extrabold text-[13px] md:text-[14px] leading-snug mb-1 line-clamp-2 pr-2"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}
            title={resource.title}
          >
            {resource.title}
          </h3>
          
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium line-clamp-1 leading-snug" style={{ color: 'var(--neu-muted)' }}>
              {resource.courseName}
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <div 
            className="px-3 py-1 rounded-full text-[9px] font-extrabold whitespace-nowrap uppercase tracking-wider"
            style={{ 
              backgroundColor: typeStyle.bg, 
              color: typeStyle.text,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            {resource.type}
          </div>
        </div>
      </div>

      {/* Hover Arrow Overlay */}
      <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-150 translate-x-1 group-hover:translate-x-0">
        <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--neu-accent)' }} />
      </div>
    </div>
  );
}
