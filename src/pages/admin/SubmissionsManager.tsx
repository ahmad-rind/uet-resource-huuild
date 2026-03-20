import { useState, useEffect } from 'react';
import { 
  Inbox, 
  Trash2, 
  Mail, 
  User, 
  CheckCircle, 
  X,
  RefreshCw,
  Search,
  MessageSquare,
  Clock
} from 'lucide-react';
import { adminGetContactSubmissions, adminDeleteContactSubmission, adminMarkSubmissionRead } from '../../lib/supabase.js';

const S = {
  bg: '#d6dae8',
  fg: '#1a1d2e',
  muted: '#64748B',
  accent: '#5B4FE9',
  extruded: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff',
  small: '5px 5px 10px #b0b8cc, -5px -5px 10px #ffffff',
  inset: 'inset 6px 6px 10px #b0b8cc, inset -6px -6px 10px #ffffff',
  insetDeep: 'inset 10px 10px 20px #b0b8cc, inset -10px -10px 20px #ffffff',
};

interface Submission {
  id: string;
  name: string;
  email: string;
  type: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function SubmissionsManager() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Suggestion' | 'Issue' | 'Other'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await adminGetContactSubmissions();
      setSubmissions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    setDeleteConfirm(null);
    setProcessing(id);
    try {
      await adminDeleteContactSubmission(id);
      await loadData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await adminMarkSubmissionRead(id);
      await loadData(true);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = submissions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      s.name.toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q) || 
      s.subject.toLowerCase().includes(q) || 
      s.message.toLowerCase().includes(q);
    
    const matchesFilter = filter === 'all' || s.type === filter;
    
    return matchesSearch && matchesFilter;
  });

  const typeStyles: Record<string, string> = {
    Suggestion: 'text-blue-500 bg-blue-50',
    Issue:      'text-red-500 bg-red-50',
    Other:      'text-gray-500 bg-gray-50'
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1 max-w-md w-full"
          style={{ background: S.bg, boxShadow: S.insetDeep }}>
          <Search className="w-4 h-4 text-[#A3B1C6]" />
          <input 
            type="text" 
            placeholder="Search submissions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none" 
            style={{ color: S.fg }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#A3B1C6]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'Suggestion', 'Issue', 'Other'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${filter === f ? 'translate-y-0.5' : ''}`}
              style={{ 
                background: S.bg, 
                boxShadow: filter === f ? S.inset : S.small, 
                color: filter === f ? S.accent : S.muted 
              }}
            >
              {f}
            </button>
          ))}
          <button 
            onClick={() => loadData()}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
            style={{ boxShadow: S.small, color: S.muted }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-[24px] flex items-center justify-center" style={{ boxShadow: S.extruded }}>
            <div className="w-6 h-6 border-2 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium" style={{ color: S.muted }}>Loading feedback...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[32px] p-16 text-center" style={{ background: S.bg, boxShadow: S.extruded }}>
          <Inbox className="w-16 h-16 text-[#A3B1C6] mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2" style={{ color: S.fg }}>No Submissions Found</h3>
          <p className="text-sm" style={{ color: S.muted }}>All clear! No pending feedback or issues at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(sub => (
            <div 
              key={sub.id}
              onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              className="rounded-[32px] p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{ 
                background: S.bg, 
                boxShadow: expandedId === sub.id ? S.inset : S.extruded,
                borderLeft: sub.is_read ? 'none' : `4px solid ${S.accent}`
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeStyles[sub.type] || 'bg-gray-100 text-gray-500'}`}>
                      {sub.type}
                    </span>
                    {!sub.is_read && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-500">
                        New
                      </span>
                    )}
                    <span className="text-xs font-bold" style={{ color: S.fg }}>{sub.subject}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs font-medium" style={{ color: S.muted }}>
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{sub.name}</span>
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{sub.email}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(sub.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!sub.is_read && (
                    <button 
                      onClick={(e) => handleMarkRead(sub.id, e)}
                      title="Mark as read"
                      className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                      style={{ boxShadow: S.small, color: '#10B981', background: S.bg }}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => handleDelete(sub.id, e)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                    style={{ 
                      boxShadow: deleteConfirm === sub.id ? 'none' : S.small, 
                      background: deleteConfirm === sub.id ? 'linear-gradient(135deg,#DC2626,#EF4444)' : S.bg,
                      color: deleteConfirm === sub.id ? '#FFF' : '#EF4444'
                    }}
                  >
                    {processing === sub.id ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedId === sub.id && (
                <div className="mt-6 pt-6 border-t border-gray-200 animate-fadeIn">
                  <div className="flex items-start gap-3 p-5 rounded-2xl" style={{ background: S.bg, boxShadow: S.inset }}>
                    <MessageSquare className="w-5 h-5 mt-1 shrink-0" style={{ color: S.accent }} />
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: S.fg }}>
                      {sub.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
