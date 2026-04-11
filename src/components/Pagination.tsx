import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-12 mb-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
        style={{
          background: 'var(--neu-bg)',
          color: 'var(--neu-muted)',
          boxShadow: currentPage === 1 
            ? 'var(--neu-shadow-inset-sm)'
            : 'var(--neu-shadow-extruded)',
        }}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="px-6 py-3 rounded-2xl" style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-inset)' }}>
        <span className="text-[14px] font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>
          Page <span style={{ color: 'var(--neu-accent)' }}>{currentPage}</span> of {totalPages}
        </span>
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
        style={{
          background: 'var(--neu-bg)',
          color: 'var(--neu-muted)',
          boxShadow: currentPage === totalPages
            ? 'var(--neu-shadow-inset-sm)'
            : 'var(--neu-shadow-extruded)',
        }}
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
