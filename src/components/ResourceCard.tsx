import { FileText, Download, ArrowUpRight } from 'lucide-react';

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

export default function ResourceCard({ resource, onPreview }: ResourceCardProps) {

  // Color mapping based on resource type
  const getTypeStyles = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('past paper')) return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
    if (t.includes('template')) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' };
    if (t.includes('lab')) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' };
    return { bg: 'rgba(91, 79, 233, 0.15)', text: '#5B4FE9' }; // Default (Study Material / Notes)
  };

  const typeStyle = getTypeStyles(resource.type);

  // Helper to guess file type from link or title
  const getFileType = () => {
    const link = resource.link.toLowerCase();
    if (link.endsWith('.pdf')) return 'PDF';
    if (link.endsWith('.docx') || link.endsWith('.doc')) return 'DOCX';
    if (link.endsWith('.pptx') || link.endsWith('.ppt')) return 'PPTX';
    if (link.endsWith('.zip') || link.endsWith('.rar')) return 'ZIP';
    return 'LINK';
  };

  return (
    <div
      onClick={() => onPreview?.(resource)}
      className="rounded-[32px] p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[12px_12px_24px_#b0b8cc,-12px_-12px_24px_#ffffff] group bg-[#d6dae8] flex flex-col h-full cursor-pointer"
      style={{ boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff' }}
    >
      {/* Top Section: Icon + Header Info */}
      <div className="flex gap-4 mb-4">
        {/* Icon Container - Neuomorphic Inset */}
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[#d6dae8]"
          style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#d6dae8] shadow-[2px_2px_5px_#b0b8cc,-2px_-2px_5px_#ffffff]">
            <FileText className="w-6 h-6 text-[#1a1d2e] opacity-80" />
          </div>
        </div>

        {/* Title and Metadata */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-extrabold text-[#1a1d2e] text-[15px] leading-[1.3] mb-1.5 line-clamp-2"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {resource.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[#64748B] tracking-tight">
            <span>{resource.department.split(' ')[0]}</span>
            <span className="opacity-30">•</span>
            <span>Sem {resource.semester}</span>
            <span className="opacity-30">•</span>
            <span className="truncate max-w-[80px]">{resource.uploadedBy || 'Anonymous'}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] w-full bg-[#b0b8cc]/30 mb-5" />

      {/* Bottom Section: Tags + Download Count */}
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Main Category Tag */}
          <div 
            className="px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap"
            style={{ 
              backgroundColor: typeStyle.bg, 
              color: typeStyle.text,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            {resource.type}
          </div>
          
          {/* File Type Tag */}
          <div 
            className="px-3 py-1 rounded-full text-[10px] font-bold text-[#64748B] bg-[#d6dae8] whitespace-nowrap"
            style={{ 
              boxShadow: 'inset 2px 2px 4px #b0b8cc, inset -2px -2px 4px #ffffff',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            {getFileType()}
          </div>
        </div>

        {/* Download Count (Mocked as data doesn't have it yet) */}
        <div className="flex items-center gap-1.5 text-[#64748B] text-[11px] font-bold whitespace-nowrap shrink-0">
          <Download className="w-3.5 h-3.5" />
          <span>{Math.floor(Math.random() * 900) + 100}</span>
        </div>
      </div>

      {/* Hover Arrow Overlay */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
        <ArrowUpRight className="w-4 h-4 text-[#5B4FE9]" />
      </div>
    </div>
  );
}
