import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogOut, Clock, CheckCircle, XCircle, Flag, Trash2,
  ExternalLink, RefreshCw, Search, BarChart3,
  Check, X, AlertTriangle, User, Calendar, BookOpen,
  Bell, ArrowUpRight, Layers, Copy, Pencil,
  FolderTree, ChevronDown, Home, Menu, PartyPopper, Inbox, ShieldCheck, FileText
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
import { Reveal } from '../../components/Reveal.js';

// ── Design tokens ─────────────────────────────────────────────────────────────
const S = {
  bg:           '#d6dae8',
  fg:           '#1a1d2e',
  muted:        '#64748B',
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
type TabType   = 'pending' | 'approved' | 'rejected' | 'flagged' | 'all' | 'submissions' | 'moderators';
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
      const s = JSON.parse(sessionStorage.getItem(key) || '{}');
      if (s.loggedIn) {
        const left = 8 * 3600000 - (Date.now() - s.loginAt);
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

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    pending:  { color: '#F59E0B', icon: <Clock className="w-3 h-3" /> },
    approved: { color: '#10B981', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { color: '#EF4444', icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: S.bg, boxShadow: S.smallInset, color: s.color, fontFamily: "'DM Sans',sans-serif" }}>
      {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
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

  return (
    <div ref={ref} onClick={e => { if (e.target === ref.current) onClose(); }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,29,46,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] p-8"
        style={{ background: S.bg, boxShadow: S.extruded }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}>{resource.type}</span>
            <StatusBadge status={resource.status} />
            {resource.reportCount >= 1 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-orange-500"
                style={{ background: S.bg, boxShadow: S.smallInset }}>
                <Flag className="w-3 h-3" /> {resource.reportCount} flags
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
            style={{ boxShadow: S.small, color: S.muted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="text-xl font-extrabold mb-1 tracking-tight" style={{ color: S.fg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          {resource.title}
        </h2>
        <p className="text-sm mb-6" style={{ color: S.muted }}>{resource.courseCode} · {resource.courseName}</p>

        {/* Meta grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-2xl p-5 mb-6"
          style={{ boxShadow: S.inset, background: S.bg }}>
          {[
            { label: 'Department', value: resource.department, icon: <BookOpen className="w-3 h-3" /> },
            { label: 'Semester',   value: `Semester ${resource.semester}`, icon: <Layers className="w-3 h-3" /> },
            { label: 'Contributor',value: resource.uploadedBy || 'Anonymous', icon: <User className="w-3 h-3" /> },
            { label: 'Submitted',  value: fmtRelative(resource.uploadedAt), icon: <Calendar className="w-3 h-3" /> },
          ].map(m => (
            <div key={m.label}>
              <p className="text-xs flex items-center gap-1 mb-1 font-semibold uppercase tracking-wide" style={{ color: S.muted }}>{m.icon}{m.label}</p>
              <p className="text-sm font-bold break-words" style={{ color: S.fg }}>{m.value}</p>
            </div>
          ))}
        </div>

        {resource.description && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>Description</p>
            <p className="text-sm leading-relaxed rounded-2xl px-4 py-3" style={{ color: S.fg, boxShadow: S.inset, background: S.bg }}>{resource.description}</p>
          </div>
        )}

        {/* Link */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>External Link</p>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ boxShadow: S.inset, background: S.bg }}>
            <span className="text-xs break-all flex-1 font-mono" style={{ color: S.fg }}>{resource.link}</span>
            <a href={resource.link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold transition-colors shrink-0 hover:underline"
              style={{ color: S.accent }}>
              Open <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Admin note */}
        <div className="mb-7">
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>
            Admin Note <span className="normal-case font-normal opacity-60">(optional)</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a review note..." rows={3}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2"
            style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg, fontFamily: "'DM Sans',sans-serif" }} />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {resource.status !== 'approved' && (
            <button onClick={() => { onApprove(resource.id, note); onClose(); }} disabled={isProc}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
              style={{ background: 'linear-gradient(135deg,#10B981,#34D399)', boxShadow: S.small }}>
              {isProc ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Approve
            </button>
          )}
          {resource.status !== 'rejected' && (
            <button onClick={() => { onReject(resource.id, note); onClose(); }} disabled={isProc}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#EF4444]"
              style={{ background: 'linear-gradient(135deg,#EF4444,#F87171)', boxShadow: S.small }}>
              {isProc ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
              Reject
            </button>
          )}
        </div>
        
        {resource.reportCount > 0 && (
          <button onClick={() => { onDismissFlags(resource.id); onClose(); }} disabled={isProc}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            style={{ background: 'linear-gradient(135deg,#F97316,#FB923C)', boxShadow: S.small }}>
            <ShieldCheck className="w-4 h-4" /> Keep & Clear Flags
          </button>
        )}
      </div>
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

  const editableField = (label: string, name: keyof typeof form, type: string = 'text', extra?: React.ReactNode) => (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>{label}</label>
      {extra || (
        <input
          type={type}
          value={form[name]}
          onChange={e => setForm(f => ({ ...f, [name]: type === 'number' ? Number(e.target.value) : e.target.value }))}
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]"
          style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg, fontFamily: "'DM Sans',sans-serif" }}
          {...(type === 'number' ? { min: 1, max: 8 } : {})}
        />
      )}
    </div>
  );

  const readOnlyField = (label: string, value: string | number) => (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>{label}</label>
      <div className="w-full px-4 py-3 rounded-2xl text-sm"
        style={{ background: S.bg, boxShadow: S.inset, color: S.muted, fontFamily: "'DM Sans',sans-serif" }}>
        {value}
      </div>
    </div>
  );

  return (
    <div ref={ref} onClick={e => { if (e.target === ref.current) onClose(); }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,29,46,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] p-8"
        style={{ background: S.bg, boxShadow: S.extruded }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold tracking-tight" style={{ color: S.fg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Edit Resource</h2>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
            style={{ boxShadow: S.small, color: S.muted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {editableField('Title', 'title')}

          <div className="grid grid-cols-2 gap-4">
            {editableField('Type', 'type', 'text', (
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]"
                style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg, fontFamily: "'DM Sans',sans-serif" }}>
                {(resourceTypes as string[]).map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ))}
            {readOnlyField('Department', form.department)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {readOnlyField('Semester', form.semester)}
            {readOnlyField('Course Code', form.courseCode)}
          </div>

          {readOnlyField('Course Name', form.courseName)}
          {editableField('Link', 'link')}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: S.muted }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]"
              style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg, fontFamily: "'DM Sans',sans-serif" }}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl text-sm text-red-500 font-medium"
              style={{ boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff', background: S.bg }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2"
            style={{ background: S.accent, boxShadow: S.extruded, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}

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

  const copyLink = () => {
    try { navigator.clipboard.writeText(resource.link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* noop */ }
  };

  const statusColors = {
    approved: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
    rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
    pending:  { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' }
  }[resource.status] || { bg: 'rgba(91, 79, 233, 0.15)', text: '#5B4FE9' };

  return (
    <div className="rounded-[32px] p-5 transition-all duration-300 hover:-translate-y-1.5 group bg-[#d6dae8] flex flex-col h-full relative"
      style={{ boxShadow: S.extruded }}>

      {/* Top Header Section: Icon + Title/Meta */}
      <div className="flex gap-4 mb-4">
        {/* Icon Container - Neuomorphic Inset */}
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[#d6dae8]"
          style={{ boxShadow: S.smallInset }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#d6dae8] shadow-[2px_2px_5px_#b0b8cc,-2px_-2px_5px_#ffffff]">
            <FileText className="w-6 h-6 text-[#1a1d2e] opacity-80" />
          </div>
        </div>

        {/* Title and Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-extrabold text-[#1a1d2e] text-[15px] leading-tight tracking-tight line-clamp-1"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {resource.title}
            </h3>
            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={copyLink} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" style={{ color: copied ? '#10B981' : S.muted }}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => onPreview(resource)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" style={{ color: S.muted }}>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-[#64748B]/60 uppercase tracking-widest">
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{resource.department.split(' ')[0]}</span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />Sem {resource.semester}</span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{resource.uploadedBy || 'Anon'}</span>
          </div>
        </div>
      </div>

      {/* Status Badge Group */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1.5"
          style={{ backgroundColor: statusColors.bg, color: statusColors.text }}>
          {resource.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : resource.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {resource.status}
        </div>
        {resource.reportCount > 0 && (
          <div className="px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1.5 text-orange-600 bg-orange-50/50">
            <Flag className="w-3 h-3" /> {resource.reportCount} Flags
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-[1px] w-full bg-[#b0b8cc]/30 mb-5" />

      {/* Review Section Toggle */}
      <div className="mb-5">
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[11px] font-extrabold text-[#5B4FE9] uppercase tracking-widest transition-opacity hover:opacity-80">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          Review & note
        </button>
        {expanded && (
          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {resource.description && (
              <div className="p-4 rounded-[20px] text-[13px] leading-relaxed text-[#64748B]" style={{ background: S.bg, boxShadow: S.smallInset }}>
                {resource.description}
              </div>
            )}
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add review note..." rows={2}
              className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none resize-none transition-all duration-300 focus:ring-2 focus:ring-[#5B4FE9]/30"
              style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }} />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto flex items-center gap-3">
        {resource.status === 'pending' ? (
          <div className="flex-1 flex gap-2">
            <button onClick={() => onApprove(resource.id, note)} disabled={isProc}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#10B981] text-white text-[12px] font-extrabold transition-all duration-300 hover:scale-[1.02] shadow-[4px_4px_10px_rgba(16,185,129,0.3)] disabled:opacity-50">
              {isProc ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Approve
            </button>
            <button onClick={() => onReject(resource.id, note)} disabled={isProc}
              className="px-4 flex items-center justify-center rounded-2xl bg-[#EF4444] text-white transition-all duration-300 hover:scale-[1.02] shadow-[4px_4px_10px_rgba(239,68,68,0.3)]">
              {isProc ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <button onClick={() => (resource.status === 'approved' ? onReject(resource.id, note) : onApprove(resource.id, note))} disabled={isProc}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-[12px] font-extrabold transition-all duration-300 hover:scale-[1.02] shadow-[4px_4px_10px_rgba(0,0,0,0.1)] disabled:opacity-50 ${resource.status === 'approved' ? 'bg-[#EF4444]' : 'bg-[#10B981]'}`}>
            {isProc ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (resource.status === 'approved' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />)}
            {resource.status === 'approved' ? 'Reject' : 'Approve'}
          </button>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(resource)} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-105" style={{ boxShadow: S.small, color: S.muted }}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(resource.id)} disabled={isProc}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-105"
            style={{ boxShadow: needsConfirm ? 'inset 2px 2px 4px #b0b8cc' : S.small, background: needsConfirm ? '#EF4444' : 'transparent', color: needsConfirm ? '#fff' : '#EF4444' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {resource.reportCount > 0 && (
        <button onClick={() => onDismissFlags(resource.id)} disabled={isProc}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-extrabold text-orange-600 uppercase tracking-widest transition-all duration-300 hover:bg-orange-50 disabled:opacity-60"
          style={{ background: S.bg, boxShadow: S.small }}>
          <ShieldCheck className="w-3.5 h-3.5" /> Clear Flags
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
      if (!session.loggedIn || Date.now() - session.loginAt > 8 * 60 * 60 * 1000) {
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
            <img src="/uettaxilalogo.png" alt="Logo" className="w-full h-full object-contain" />
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
            <Link to="/admin/categories"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:translate-x-1 hover:bg-[rgba(255,255,255,0.4)] focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
              style={{ color: S.fg, fontFamily: "'DM Sans',sans-serif" }}>
              <FolderTree className="w-4 h-4" /> <span className="flex-1 truncate">Categories</span>
            </Link>
            <a href="/#/" target="_blank" rel="noopener noreferrer"
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
      {previewResource && (
        <PreviewModal resource={previewResource} onClose={() => setPreviewResource(null)}
          onApprove={handleApprove} onReject={handleReject} onDismissFlags={handleDismissFlags} processing={processing} />
      )}
      {editResource && (
        <EditResourceModal resource={editResource} onClose={() => setEditResource(null)} onSave={handleEditSave} />
      )}

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
                {navItems.find(n => n.id === activeTab)?.label ?? 'Dashboard'}
              </h1>
              <p className="text-xs" style={{ color: S.muted }}>
                {activeTab === 'submissions' 
                  ? `${submissionCount} new submission${submissionCount !== 1 ? 's' : ''}`
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Stats row */}
          {!['submissions', 'moderators'].includes(activeTab) && (
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
          {!['submissions', 'moderators'].includes(activeTab) && (
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
          ) : filtered.length === 0 ? (
            <div className="rounded-[32px] p-16 text-center" style={{ background: S.bg, boxShadow: S.extruded }}>
              <div className="mb-4">
                {activeTab === 'pending' ? <PartyPopper className="w-12 h-12 text-[#10B981] mx-auto" /> : activeTab === 'flagged' ? <Flag className="w-12 h-12 text-[#F97316] mx-auto" /> : searchQuery ? <Search className="w-12 h-12 text-[#5B4FE9] mx-auto" /> : <Inbox className="w-12 h-12 text-[#5B4FE9] mx-auto" />}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
