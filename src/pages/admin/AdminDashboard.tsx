import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Clock, CheckCircle, XCircle, Flag, Trash2,
  RefreshCw, Search, BarChart3,
  Check, X, AlertTriangle, User, BookOpen,
  Bell, ArrowUpRight, Layers, Copy, Pencil,
  FolderTree, ChevronDown, Home, Menu, PartyPopper, Inbox, ShieldCheck
} from 'lucide-react';
import { resourceTypeBadgeColors, resourceTypes } from '../../data/courses.js';
import {
  adminLogout,
  adminGetResources, adminGetStats,
  adminApproveResource, adminRejectResource, adminDeleteResource,
  adminDismissFlags, adminUpdateResource,
  adminGetContactSubmissions,
  getAdminSession,
} from '../../lib/supabase.js';
import SubmissionsManager from './SubmissionsManager';
import ModeratorsManager from './ModeratorsManager';
import CategoryManager from './CategoryManager';
import { Reveal } from '../../components/Reveal.js';

// ── Design tokens ─────────────────────────────────────────────────────────────
const S = {
  bg:           '#d6dae8',
  fg:           '#1a1d2e',
  muted:        '#475569',
  accent:       '#5B4FE9',
  accentLight:  '#8B84FF',
  extruded:     '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff',
  extrudedHover:'12px 12px 20px #b0b8cc, -12px -12px 20px #ffffff',
  inset:        'inset 6px 6px 10px #b0b8cc, inset -6px -6px 10px #ffffff',
  insetDeep:    'inset 10px 10px 20px #b0b8cc, inset -10px -10px 20px #ffffff',
  small:        '5px 5px 10px #b0b8cc, -5px -5px 10px #ffffff',
  smallInset:   'inset 3px 3px 6px #b0b8cc, inset -3px -3px 6px #ffffff',
  glass:        'rgba(255, 255, 255, 0.4)',
  glassHover:   'rgba(255, 255, 255, 0.6)',
  glassActive:  'rgba(255, 255, 255, 0.2)',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type TabType   = 'pending' | 'approved' | 'rejected' | 'flagged' | 'all' | 'submissions' | 'moderators' | 'categories';
type SortField = 'date' | 'title' | 'reports';
type SortDir   = 'asc' | 'desc';

interface Resource {
  id: string; title: string; type: string; department: string;
  semester: number; courseCode: string; courseName: string;
  link: string; uploadedBy: string; uploadedAt: string;
  description: string; reportCount: number; status: string;
  adminNote: string; reviewedAt?: string;
}
interface Stats {
  pending: number; approved: number; rejected: number;
  flagged: number; total: number;
  daily: { day?: string; count: number; raw_day?: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtRelative(d?: string | null) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getSessionExpiry() {
  try {
    for (const key of ['uet_admin_v3', 'uet_admin_v2']) {
      const s = JSON.parse(localStorage.getItem(key) || '{}');
      if (s.loggedIn) {
        const left = s.expires ? (s.expires - Date.now()) : (8 * 3600000 - (Date.now() - s.loginAt));
        if (left <= 0) continue;
        return `${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m`;
      }
    }
  } catch { /* noop */ }
  return null;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const colors = { success: '#10B981', error: '#EF4444', info: S.accent }[type];
  const icons  = {
    success: <CheckCircle className="w-4 h-4" />,
    error:   <AlertTriangle className="w-4 h-4" />,
    info:    <Bell className="w-4 h-4" />,
  }[type];
  return (
    <div className="fixed top-5 right-5 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl text-white text-sm font-semibold"
      style={{ background: colors, boxShadow: S.extruded, fontFamily: "'DM Sans',sans-serif", maxWidth: 360, animation: 'slideInRight .3s ease-out' }}>
      {icons}<span>{message}</span>
    </div>
  );
}



// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ resource, onClose, onApprove, onReject, onDismissFlags, processing }: {
  resource: Resource; onClose: () => void;
  onApprove: (id: string, note: string) => void;
  onReject:  (id: string, note: string) => void;
  onDismissFlags: (id: string) => void;
  processing: string | null;
}) {
  const [note, setNote] = useState(resource.adminNote || '');
  const colors = (resourceTypeBadgeColors as Record<string, { bg: string; text: string }>)[resource.type]
    ?? (resourceTypeBadgeColors as Record<string, { bg: string; text: string }>)['Other'];
  const isProc = processing === resource.id;
  const ref    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const isApproved = resource.status === 'approved';

  return (
    <div ref={ref} onClick={e => { if (e.target === ref.current) onClose(); }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{ background: 'rgba(26,29,46,0.3)', backdropFilter: 'blur(12px)' }}
      />
      
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] relative z-10" 
        style={{ background: S.bg, boxShadow: S.extruded }}
      >
        
        {/* Header Section */}
        <div className="p-7 pb-5 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#d6dae8]"
                style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
              >
                <FileIcon className="w-6 h-6 text-[#4A3FD8]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold text-[#1a1d2e] tracking-tight leading-tight mb-0.5"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {resource.title}
                </h3>
                <p className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                  {resource.courseCode} · {resource.courseName}
                </p>
              </div>
            </div>
            
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{ boxShadow: S.small, color: S.muted, background: S.bg }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest ${colors.bg} ${colors.text}`}>
              {resource.type}
            </span>
            <div className="px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5"
              style={{ background: S.bg, boxShadow: S.smallInset, color: isApproved ? '#10B981' : resource.status === 'rejected' ? '#EF4444' : '#F59E0B' }}>
              {isApproved ? <CheckCircle className="w-3 h-3" /> : resource.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {resource.status}
            </div>
          </div>
        </div>

        {/* Metadata Multi-col Stripe */}
        <div className="bg-[#ced4e0] border-y border-[#b0b8cc]/50 grid grid-cols-4 px-2 shrink-0 shadow-[inset_0_4px_12px_rgba(0,0,0,0.03)]">
          {[
            { label: 'DEPT', value: resource.department.split(' ')[0] },
            { label: 'SEM',  value: `Sem ${resource.semester}` },
            { label: 'BY',   value: (resource.uploadedBy || 'Anon').split(' ')[0] },
            { label: 'TIME', value: fmtRelative(resource.uploadedAt) },
          ].map((item, idx) => (
            <div key={idx} className={`py-4 px-3 text-center ${idx < 3 ? 'border-r border-[#b0b8cc]/40' : ''}`}>
              <p className="text-[8px] font-extrabold text-[#4A3FD8] uppercase tracking-[0.1em] mb-1">{item.label}</p>
              <p className="text-[11px] font-extrabold text-[#1a1d2e] truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Body Content (Scrollable if needed) */}
        <div className="p-7 space-y-6 overflow-y-auto no-scrollbar">
          {/* External Link */}
          <div>
            <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#475569]/70 mb-2 flex items-center gap-1.5">
              <ArrowUpRight className="w-2.5 h-2.5" /> External Link
            </label>
            <div className="flex items-center p-1.5 rounded-xl bg-[#d6dae8]" 
              style={{ boxShadow: S.insetDeep }}>
              <div className="flex-1 px-3 py-1.5 text-[11px] font-medium text-[#1a1d2e] truncate font-mono opacity-80">
                {resource.link}
              </div>
              <a href={resource.link} target="_blank" rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-lg text-[11px] font-extrabold text-[#4A3FD8] transition-all duration-300 hover:bg-white/20 active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                Open <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#475569]/70 mb-2 flex items-center gap-1.5">
               Admin Note <span className="normal-case opacity-50 ml-1 font-bold">(optional)</span>
            </label>
            <textarea 
              value={note} 
              onChange={e => setNote(e.target.value)}
              placeholder="Add a review note..." 
              rows={3}
              className="w-full px-4 py-3 rounded-2xl text-[12px] outline-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]/20 resize-none leading-relaxed"
              style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2.5 items-end pt-2">
            {!isApproved ? (
              <button 
                onClick={() => { onApprove(resource.id, note); onClose(); }} 
                disabled={isProc}
                className="flex-1 py-3.5 rounded-2xl bg-[#10B981] text-white text-[12px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isProc ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve
              </button>
            ) : (
              <button 
                onClick={() => { onReject(resource.id, note); onClose(); }} 
                disabled={isProc}
                className="flex-1 py-3.5 rounded-2xl bg-[#EF4444] text-white text-[12px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(239,68,68,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isProc ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject
              </button>
            )}
          </div>

          {/* Flag Dismiss Link/Button */}
          {resource.reportCount > 0 && (
            <button 
              onClick={() => { onDismissFlags(resource.id); onClose(); }} 
              disabled={isProc}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-extrabold text-orange-600 uppercase tracking-widest transition-all duration-300 hover:bg-orange-50/50 disabled:opacity-60"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Clear Flags
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Edit Resource Modal ───────────────────────────────────────────────────────
function EditResourceModal({ resource, onClose, onSave }: {
  resource: Resource;
  onClose: () => void;
  onSave: (id: string, data: Record<string, any>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: resource.title,
    type: resource.type,
    department: resource.department,
    semester: resource.semester,
    courseCode: resource.courseCode,
    courseName: resource.courseName,
    link: resource.link,
    description: resource.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave(resource.id, form);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update resource');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} onClick={e => { if (e.target === ref.current) onClose(); }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0"
        style={{ background: 'rgba(26,29,46,0.3)', backdropFilter: 'blur(12px)' }}
      />

      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] relative z-10" 
        style={{ background: S.bg, boxShadow: S.extruded }}
      >
        
        {/* Header Section */}
        <div className="p-6 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#d6dae8]"
                style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
              >
                <Pencil className="w-6 h-6 text-[#4A3FD8]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold text-[#1a1d2e] tracking-tight leading-tight mb-0.5"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Edit Resource
                </h3>
                <p className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                  Updating details for "{resource.title}"
                </p>
              </div>
            </div>
            
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{ boxShadow: S.small, color: S.muted, background: S.bg }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Stripe (Read Only) */}
        <div className="bg-[#ced4e0] border-y border-[#b0b8cc]/50 grid grid-cols-4 px-2 shrink-0 shadow-[inset_0_4px_12px_rgba(0,0,0,0.03)]">
          {[
            { label: 'DEPT', value: resource.department.split(' ')[0] },
            { label: 'SEM',  value: `Sem ${resource.semester}` },
            { label: 'CODE', value: resource.courseCode },
            { label: 'TYPE', value: resource.type },
          ].map((item, idx) => (
            <div key={idx} className={`py-3 px-3 text-center ${idx < 3 ? 'border-r border-[#b0b8cc]/40' : ''}`}>
              <p className="text-[8px] font-extrabold text-[#4A3FD8] uppercase tracking-[0.1em] mb-1">{item.label}</p>
              <p className="text-[11px] font-extrabold text-[#1a1d2e] truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#4A3FD8] mb-1.5">Title</label>
            <input 
              type="text"
              value={form.title} 
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Resource title..." 
              required
              className="w-full px-4 py-2.5 rounded-2xl text-[12px] font-medium outline-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]/20"
              style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
            />
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#4A3FD8] mb-1.5">Resource Type</label>
            <div className="relative group">
              <select 
                value={form.type} 
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-2xl text-[12px] font-medium appearance-none outline-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]/20 cursor-pointer"
                style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
              >
                {(resourceTypes as string[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] pointer-events-none transition-transform group-focus-within:rotate-180" />
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#4A3FD8] mb-1.5 flex items-center gap-1.5">
              <ArrowUpRight className="w-2.5 h-2.5" /> External Link
            </label>
            <input 
              type="url"
              value={form.link} 
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              placeholder="https://..." 
              required
              className="w-full px-4 py-2.5 rounded-2xl text-[12px] font-mono outline-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]/20"
              style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
            />
          </div>

          {/* Description */}
          <div>
             <label className="block text-[9px] font-extrabold uppercase tracking-widest text-[#4A3FD8] mb-1.5">Description</label>
             <textarea 
               value={form.description} 
               onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
               placeholder="Add a description..." 
               rows={3}
               className="w-full px-4 py-2.5 rounded-2xl text-[12px] outline-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]/20 resize-none leading-relaxed"
               style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
             />
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-[11px] font-bold border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          {/* Footer Save Button */}
          <div className="pt-2">
            <button type="submit" disabled={saving}
              className="w-full py-4 rounded-2xl bg-[#5B4FE9] text-white text-[12px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(91,79,233,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const FileIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
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

// ── Resource Card ─────────────────────────────────────────────────────────────
function ResourceCard({ resource, onApprove, onReject, onPreview, onDelete, onDismissFlags, onEdit, processing, deleteConfirm }: {
  resource: Resource;
  onApprove: (id: string, note: string) => void;
  onReject:  (id: string, note: string) => void;
  onPreview: (r: Resource) => void;
  onDelete:  (id: string) => void;
  onDismissFlags: (id: string) => void;
  onEdit:    (r: Resource) => void;
  processing:    string | null;
  deleteConfirm: string | null;
}) {
  const [note, setNote]       = useState('');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]   = useState(false);
  const isProc      = processing    === resource.id;
  const needsConfirm= deleteConfirm === resource.id;

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { navigator.clipboard.writeText(resource.link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* noop */ }
  };

  const statusMap = {
    approved: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', label: 'Approved', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> },
    pending:  { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', label: 'Pending', icon: <Clock className="w-3 h-3" /> }
  };
  const status = statusMap[resource.status as keyof typeof statusMap] || statusMap.pending;

  return (
    <div className="rounded-[24px] p-4.5 transition-all duration-300 hover:-translate-y-1 group bg-[#d6dae8] relative flex flex-col h-full"
      style={{ boxShadow: S.extruded }}>
      
      {/* Quick Actions (Top Right) */}
      <div className="absolute top-4.5 right-4.5 flex items-center gap-1">
        <button 
          onClick={copyLink}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
          style={{ 
            boxShadow: S.small, 
            background: S.bg,
            color: copied ? '#10B981' : S.muted 
          }}
          title="Copy Link"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
        <button 
          onClick={() => onPreview(resource)}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
          style={{ boxShadow: S.small, background: S.bg, color: S.muted }}
          title="Open Link"
        >
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-start gap-2.5 mb-2.5 max-w-[calc(100%-75px)]">
        {/* Icon Badge */}
        <div 
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#d6dae8]"
          style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff' }}
        >
          <FileIcon className="w-5.5 h-5.5 text-[#4A3FD8]" />
        </div>

        {/* Title & Stats Meta */}
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-[#1a1d2e] leading-tight tracking-tight mb-1 line-clamp-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {resource.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-bold text-[#475569]/60 uppercase tracking-widest">
            <span className="flex items-center gap-1"><BookOpen className="w-2.5 h-2.5" />{resource.department.split(' ')[0]}</span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1"><Layers className="w-2.5 h-2.5" />S{resource.semester}</span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{(resource.uploadedBy || 'Anon').split(' ')[0]}</span>
          </div>
        </div>
      </div>

      {/* Main Status & Flag Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        <div className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest uppercase flex items-center gap-1.5"
          style={{ backgroundColor: status.bg, color: status.text }}>
          {status.icon} {status.label}
        </div>
        {resource.reportCount > 0 && (
          <div className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest uppercase flex items-center gap-1.5 text-orange-600 bg-orange-50/50"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(234, 88, 12, 0.1)' }}>
            <Flag className="w-2.5 h-2.5" /> {resource.reportCount}
          </div>
        )}
      </div>

      <div className="h-[1px] w-full bg-[#1a1d2e]/5 mb-3.5" />

      {/* Review Section */}
      <div className="mb-4 flex-1">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[9px] font-extrabold text-[#4A3FD8] uppercase tracking-widest transition-opacity hover:opacity-80"
        >
          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          Review & note
        </button>
        {expanded && (
          <div className="mt-2.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            {resource.description && (
              <div className="p-2.5 rounded-lg text-[11px] leading-relaxed text-[#475569] font-medium" 
                style={{ background: S.bg, boxShadow: 'inset 2px 2px 4px #b0b8cc, inset -2px -2px 4px #ffffff' }}>
                {resource.description}
              </div>
            )}
            <textarea 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="Add review note..." 
              rows={1}
              className="w-full px-2.5 py-1.5 rounded-lg text-[11px] outline-none resize-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]/20"
              style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }} 
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto flex items-center justify-between gap-2">
        {/* Primary Action (Approve/Reject) */}
        <div className="flex-1">
          {resource.status === 'pending' ? (
            <button 
              onClick={() => onApprove(resource.id, note)}
              disabled={isProc}
              className="w-full py-2 rounded-lg text-white text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{ 
                background: 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' 
              }}
            >
              {isProc ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Approve
            </button>
          ) : (
            <button 
              onClick={() => (resource.status === 'approved' ? onReject(resource.id, note) : onApprove(resource.id, note))}
              disabled={isProc}
              className="w-full py-2 rounded-lg text-white text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              style={{ 
                background: resource.status === 'approved' ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: resource.status === 'approved' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 4px 12px rgba(16, 185, 129, 0.15)'
              }}
            >
              {isProc ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (resource.status === 'approved' ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />)}
              {resource.status === 'approved' ? 'Reject' : 'Approve'}
            </button>
          )}
        </div>

        {/* Secondary Actions (Edit/Delete) */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => onEdit(resource)}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            style={{ boxShadow: S.small, color: S.accent, background: S.bg }}
            title="Edit Resource"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onDelete(resource.id)}
            disabled={isProc}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            style={{ 
              boxShadow: needsConfirm ? 'inset 2px 2px 4px #b0b8cc, inset -2px -2px 4px #ffffff' : S.small, 
              background: needsConfirm ? '#EF4444' : S.bg,
              color: needsConfirm ? '#fff' : '#EF4444'
            }}
            title="Delete Resource"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Flag Dismiss Link/Button */}
      {resource.reportCount > 0 && (
        <button 
          onClick={() => onDismissFlags(resource.id)}
          disabled={isProc}
          className="w-full mt-2.5 flex items-center justify-center gap-1 py-1 rounded text-[8px] font-extrabold text-orange-600 uppercase tracking-widest transition-all duration-300 hover:bg-orange-50/50 disabled:opacity-60"
        >
          <ShieldCheck className="w-2.5 h-2.5" /> Clear Flags
        </button>
      )}
    </div>
  );
}

// ── Sidebar Nav Item ──────────────────────────────────────────────────────────
function SideNavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active?: boolean;
  onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] group ${active ? 'scale-[1.02]' : 'hover:translate-x-1'}`}
      style={{
        background: active ? S.glassHover : 'transparent',
        boxShadow: active ? S.small : 'none',
        color: active ? S.accent : S.fg,
        fontFamily: "'DM Sans',sans-serif",
      }}>
      <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full text-white"
          style={{ 
            background: active ? S.accent : '#F59E0B', 
            minWidth: 18, 
            textAlign: 'center', 
            boxShadow: active ? '0 2px 8px rgba(108, 99, 255, 0.4)' : '0 2px 8px rgba(245, 158, 11, 0.3)' 
          }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [adminSession, setAdminSession] = useState<any>({});
  const [resources, setResources]     = useState<Resource[]>([]);
  const [stats, setStats]             = useState<Stats>({ pending: 0, approved: 0, rejected: 0, flagged: 0, total: 0, daily: [] });
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<TabType>('pending');
  const [submissionCount, setSubmissionCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField]     = useState<SortField>('date');
  const [sortDir, setSortDir]         = useState<SortDir>('desc');
  const [processing, setProcessing]   = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [toast, setToast]             = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sessionExpiry                 = getSessionExpiry();

  // Auth guard
  useEffect(() => {
    const checkAndGuardSession = async () => {
      const session = getAdminSession();
      const isExpired = session.expires ? (Date.now() > session.expires) : (Date.now() - session.loginAt > 8 * 60 * 60 * 1000);
      
      if (!session.loggedIn || isExpired) {
        await adminLogout();
        navigate('/admin/login', { replace: true });
        return;
      }
      setAdminSession(session);
      setAuthChecked(true);
    };
    checkAndGuardSession();
  }, [navigate]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const sess = getAdminSession();
      const isMod = sess.role === 'moderator';
      const dept = isMod ? sess.department : null;

      const [{ data: rows }, statsData] = await Promise.all([
        adminGetResources('all', dept),
        adminGetStats(dept),
      ]);
      setResources(((rows || []) as Resource[]).filter(r => r !== null));
      setStats(statsData);
      
      // Load submission count for badge (Super Admin Only)
      if (!isMod) {
        const { data: subs } = await adminGetContactSubmissions();
        setSubmissionCount(subs?.filter((s: any) => !s.is_read).length || 0);
      }
    } catch {
      if (!silent) showToast('Failed to load data from Supabase', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authChecked) loadData(); }, [authChecked, loadData]);
  useEffect(() => {
    if (!authChecked) return;
    const t = setInterval(() => loadData(true), 60_000);
    return () => clearInterval(t);
  }, [authChecked, loadData]);

  // Handlers
  const handleApprove = async (id: string, note: string) => {
    setProcessing(id);
    try {
      const res = await adminApproveResource(id, note);
      if (res?.success !== false) { showToast('Resource approved ✓', 'success'); await loadData(true); }
      else showToast(res?.error || 'Approval failed', 'error');
    } catch { showToast('Approval failed', 'error'); }
    finally { setProcessing(null); }
  };

  const handleReject = async (id: string, note: string) => {
    setProcessing(id);
    try {
      const res = await adminRejectResource(id, note);
      if (res?.success !== false) { showToast('Resource rejected', 'info'); await loadData(true); }
      else showToast(res?.error || 'Rejection failed', 'error');
    } catch { showToast('Rejection failed', 'error'); }
    finally { setProcessing(null); }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    setDeleteConfirm(null);
    setProcessing(id);
    try {
      const res = await adminDeleteResource(id);
      if (res?.success !== false) { showToast('Resource deleted', 'info'); await loadData(true); }
      else showToast(res?.error || 'Delete failed', 'error');
    } catch { showToast('Delete failed', 'error'); }
    finally { setProcessing(null); }
  };

  const handleDismissFlags = async (id: string) => {
    setProcessing(id);
    try {
      const res = await adminDismissFlags(id);
      if (res?.success !== false) { showToast('Flags cleared ✓', 'success'); await loadData(true); }
      else showToast(res?.error || 'Failed to clear flags', 'error');
    } catch { showToast('Failed to clear flags', 'error'); }
    finally { setProcessing(null); }
  };

  const handleLogout = async () => { await adminLogout(); navigate('/admin/login', { replace: true }); };

  const handleEditSave = async (id: string, data: Record<string, any>) => {
    const res = await adminUpdateResource(id, data);
    if (res?.success === false) throw new Error(res?.error || 'Update failed');
    showToast('Resource updated ✓', 'success');
    await loadData(true);
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'pending',  label: 'Pending Review', icon: <Clock className="w-4 h-4" />,        badge: stats.pending  },
    { id: 'approved', label: 'Approved',        icon: <CheckCircle className="w-4 h-4" />,  badge: stats.approved },
    { id: 'rejected', label: 'Rejected',        icon: <XCircle className="w-4 h-4" />,      badge: stats.rejected },
    { id: 'flagged',  label: 'Flagged',         icon: <Flag className="w-4 h-4" />,         badge: stats.flagged  },
    { id: 'all',      label: 'All Resources',   icon: <BarChart3 className="w-4 h-4" />,    badge: stats.total    },
    ...(adminSession.role === 'super_admin' ? [
      { id: 'submissions' as TabType, label: 'User Submissions', icon: <Inbox className="w-4 h-4" />,    badge: submissionCount }
    ] : []),
  ];

  const filtered = resources
    .filter(r => {
      if (activeTab === 'flagged') return r.reportCount >= 1;
      if (activeTab !== 'all')    return r.status === activeTab;
      return true;
    })
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q)
        || r.courseCode.toLowerCase().includes(q)
        || r.courseName.toLowerCase().includes(q)
        || r.department.toLowerCase().includes(q)
        || r.uploadedBy.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date')    cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      if (sortField === 'title')   cmp = a.title.localeCompare(b.title);
      if (sortField === 'reports') cmp = a.reportCount - b.reportCount;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
        <div className="w-14 h-14 rounded-[32px] flex items-center justify-center" style={{ boxShadow: S.extruded }}>
          <div className="w-6 h-6 border-2 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="flex flex-col h-full px-3 py-4 gap-3 overflow-y-auto no-scrollbar glass-sidebar" style={{ background: S.bg }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-1">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ boxShadow: S.small, background: S.glass }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden p-0.5">
            <img src="/uettaxilalogo.webp" alt="University of Engineering and Technology Taxila official logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-xs tracking-tight truncate" style={{ color: S.fg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Admin Panel</p>
          <p className="text-[10px]" style={{ color: S.muted }}>UET Taxila</p>
        </div>
      </div>

      {/* Resources nav */}
      <div className="space-y-1">
        <p className="text-[9px] font-bold uppercase tracking-widest px-3 mb-1 opacity-60" style={{ color: S.muted }}>Resources</p>
        <div className="space-y-0.5">
          {navItems.map(item => (
            <SideNavItem key={item.id} icon={item.icon} label={item.label}
              active={activeTab === item.id} badge={item.badge}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} />
          ))}
        </div>
      </div>

      {/* Management (Super Admin Only) */}
      {adminSession.role === 'super_admin' && (
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-widest px-3 mb-1 opacity-60" style={{ color: S.muted }}>Management</p>
          <div className="space-y-0.5">
            <SideNavItem 
              icon={<FolderTree className="w-4 h-4" />} 
              label="Departments" 
              active={activeTab === 'categories'} 
              onClick={() => { setActiveTab('categories'); setSidebarOpen(false); }} 
            />
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 hover:bg-[rgba(255,255,255,0.4)]"
              style={{ color: S.fg, fontFamily: "'DM Sans',sans-serif" }}>
              <Home className="w-4 h-4" /> <span className="flex-1 truncate">Public Site</span>
            </a>
          </div>
        </div>
      )}

      {/* Moderators (Super Admin Only) - Integrated in flow */}
      {adminSession.role === 'super_admin' && (
        <SideNavItem 
          icon={<ShieldCheck className="w-4 h-4" />} 
          label="Moderators" 
          active={activeTab === 'moderators'} 
          onClick={() => { setActiveTab('moderators'); setSidebarOpen(false); }} 
        />
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Session + logout */}
      <div className="space-y-2 mt-auto pt-2 border-t border-white/20">
        {sessionExpiry && (
          <div className="px-3 py-2 rounded-xl text-[10px] flex items-center gap-2"
            style={{ background: S.glass, color: S.muted }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="truncate">
              {adminSession.role === 'super_admin' ? 'Super Admin' : `Mod: ${adminSession.department}`}
            </span>
          </div>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 transition-all duration-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
          style={{ fontFamily: "'DM Sans',sans-serif" }}>
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: S.bg, fontFamily: "'DM Sans',sans-serif" }}>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <AnimatePresence>
        {previewResource && (
          <PreviewModal resource={previewResource} onClose={() => setPreviewResource(null)}
            onApprove={handleApprove} onReject={handleReject} onDismissFlags={handleDismissFlags} processing={processing} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editResource && (
          <EditResourceModal resource={editResource} onClose={() => setEditResource(null)} onSave={handleEditSave} />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 shrink-0 flex-col h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <div className="w-64 h-full flex flex-col overflow-y-auto" style={{ background: S.bg, boxShadow: S.extruded }}>
            <Sidebar />
          </div>
          <div className="flex-1" style={{ background: 'rgba(61,72,82,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 h-16 flex items-center justify-between px-4 md:px-6"
          style={{ background: S.bg, boxShadow: '0 4px 12px #b0b8cc' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
              style={{ boxShadow: S.small, color: S.muted }}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold tracking-tight" style={{ color: S.fg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {activeTab === 'categories' ? 'Departments' : activeTab === 'moderators' ? 'Moderators' : (navItems.find(n => n.id === activeTab)?.label ?? 'Dashboard')}
              </h1>
              <p className="text-xs" style={{ color: S.muted }}>
                {activeTab === 'submissions' 
                  ? `${submissionCount} new submission${submissionCount !== 1 ? 's' : ''}`
                  : activeTab === 'categories'
                    ? 'Manage departments and courses'
                    : activeTab === 'moderators'
                      ? 'Manage platform moderators'
                      : `${filtered.length} resource${filtered.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stats.pending > 0 && (
              <button onClick={() => setActiveTab('pending')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none"
                style={{ background: S.bg, boxShadow: S.small }}>
                <Bell className="w-3.5 h-3.5" /> {stats.pending} pending
              </button>
            )}
            <button onClick={() => loadData()} disabled={loading}
              className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
              style={{ boxShadow: S.small, color: S.muted }}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className={`flex-1 overflow-y-auto ${activeTab === 'categories' ? 'p-0' : 'p-4 md:p-6 space-y-6'}`}>

          {/* Stats row */}
          {!['submissions', 'moderators', 'categories'].includes(activeTab) && (
            <Reveal delay={0.1} yOffset={20}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total',    value: stats.total,    icon: <BarChart3 className="w-5 h-5" />,      accent: S.accent,    tab: 'all'      as TabType },
                  { label: 'Approved', value: stats.approved, icon: <CheckCircle className="w-5 h-5" />,    accent: '#10B981',   tab: 'approved' as TabType },
                  { label: 'Pending',  value: stats.pending,  icon: <Clock className="w-5 h-5" />,          accent: '#F59E0B',   tab: 'pending'  as TabType },
                  { label: 'Flagged',  value: stats.flagged,  icon: <AlertTriangle className="w-5 h-5" />,  accent: '#F97316',   tab: 'flagged'  as TabType },
                ].map(s => (
                  <div key={s.label} onClick={() => setActiveTab(s.tab)}
                    className="rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1"
                    style={{ background: S.bg, boxShadow: activeTab === s.tab ? S.inset : S.extruded }}>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
                      style={{ boxShadow: S.inset, color: s.accent }}>
                      {React.cloneElement(s.icon as React.ReactElement<any>, { className: 'w-4 h-4 sm:w-5 sm:h-5' })}
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: S.fg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{s.value}</p>
                    <p className="text-[10px] sm:text-xs font-semibold mt-1" style={{ color: S.muted }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* Search + sort */}
          {!['submissions', 'moderators', 'categories'].includes(activeTab) && (
            <Reveal delay={0.2} yOffset={15}>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1 min-w-0 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#5B4FE9]"
                  style={{ background: S.bg, boxShadow: S.insetDeep }}>
                  <Search className="w-4 h-4 shrink-0" style={{ color: S.muted }} />
                  <input type="text" placeholder="Search title, course, department..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none" style={{ color: S.fg }} />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')}
                      className="shrink-0 focus:outline-none" style={{ color: S.muted }}>
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-semibold" style={{ color: S.muted }}>Sort:</span>
                  {(['date','title','reports'] as SortField[]).map(f => (
                    <button key={f} onClick={() => {
                      if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                      else { setSortField(f); setSortDir('desc'); }
                    }}
                      className="px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold capitalize transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                      style={{
                        background: S.bg,
                        boxShadow: sortField === f ? S.inset : S.small,
                        color: sortField === f ? S.accent : S.muted,
                      }}>
                      {f}{sortField === f ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* Resource grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div className="w-16 h-16 rounded-[32px] flex items-center justify-center" style={{ boxShadow: S.extruded }}>
                <div className="w-7 h-7 border-2 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-medium" style={{ color: S.muted }}>Loading content...</p>
            </div>
          ) : activeTab === 'submissions' ? (
            <SubmissionsManager />
          ) : activeTab === 'moderators' ? (
            <ModeratorsManager />
          ) : activeTab === 'categories' ? (
            <CategoryManager isEmbedded={true} />
          ) : filtered.length === 0 ? (
            <div className="rounded-[32px] p-16 text-center" style={{ background: S.bg, boxShadow: S.extruded }}>
              <div className="mb-4">
                {activeTab === 'pending' ? <PartyPopper className="w-12 h-12 text-[#10B981] mx-auto" /> : activeTab === 'flagged' ? <Flag className="w-12 h-12 text-[#F97316] mx-auto" /> : searchQuery ? <Search className="w-12 h-12 text-[#4A3FD8] mx-auto" /> : <Inbox className="w-12 h-12 text-[#4A3FD8] mx-auto" />}
              </div>
              <h3 className="font-extrabold text-xl mb-2 tracking-tight" style={{ color: S.fg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : activeTab === 'pending'
                    ? 'Queue is clear!'
                    : `No ${activeTab} resources`}
              </h3>
              <p className="text-sm" style={{ color: S.muted }}>
                {activeTab === 'pending' && !searchQuery
                  ? 'All submissions have been reviewed. Great work!'
                  : 'Try a different filter or search query.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(r => (
                <ResourceCard key={r.id} resource={r}
                  onApprove={handleApprove} onReject={handleReject}
                  onPreview={setPreviewResource} onDelete={handleDelete}
                  onDismissFlags={handleDismissFlags} onEdit={setEditResource}
                  processing={processing} deleteConfirm={deleteConfirm} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
