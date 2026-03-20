import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Key, 
  GraduationCap, 
  RefreshCw,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { adminGetModerators, adminCreateModerator, adminDeleteModerator, adminGetDepartments } from '../../lib/supabase.js';

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

interface Moderator {
  id: string;
  name: string;
  access_key: string;
  department: string;
  created_at: string;
}

export default function ModeratorsManager() {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newDept, setNewDept] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, dRes] = await Promise.all([
        adminGetModerators(),
        adminGetDepartments()
      ]);
      setModerators(mRes.data || []);
      setDepartments(dRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newKey.trim() || !newDept) {
      setError('Name, Key, and Department are required.');
      return;
    }
    setProcessing('create');
    setError('');
    try {
      const res = await adminCreateModerator(newKey.trim(), newDept, newName.trim());
      if (res.success) {
        setNewName('');
        setNewKey('');
        setNewDept('');
        setShowAdd(false);
        await loadData();
      } else {
        setError(res.error || 'Failed to create moderator key.');
      }
    } catch (err) {
      setError('An error occurred.');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessing(id);
    try {
      await adminDeleteModerator(id);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight" style={{ color: S.fg, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          Moderator Management
        </h2>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5"
          style={{ background: S.accent, boxShadow: S.small }}
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Cancel' : 'Add Moderator'}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-[32px] p-6 mb-6" style={{ background: S.bg, boxShadow: S.extruded }}>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: S.muted }}>Moderator Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: S.muted }}>Access Key</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newKey} 
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="e.g. CS-2024-X"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
                />
                <button 
                  type="button"
                  onClick={() => {
                     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                     let res = 'ADMIN-';
                     for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
                     setNewKey(res);
                  }}
                  className="px-3 rounded-xl transition-all"
                  style={{ background: S.bg, boxShadow: S.small, color: S.accent }}
                  title="Generate random key"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: S.muted }}>Department</label>
              <select 
                value={newDept} 
                onChange={e => setNewDept(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: S.bg, boxShadow: S.insetDeep, color: S.fg }}
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                type="submit"
                disabled={processing === 'create'}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: S.accent, boxShadow: S.small }}
              >
                {processing === 'create' ? 'Creating...' : 'Register Access Key'}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-500 text-xs font-bold">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-[24px] flex items-center justify-center" style={{ boxShadow: S.extruded }}>
            <div className="w-6 h-6 border-2 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : moderators.length === 0 ? (
        <div className="rounded-[32px] p-16 text-center" style={{ background: S.bg, boxShadow: S.extruded }}>
          <ShieldCheck className="w-16 h-16 text-[#A3B1C6] mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2" style={{ color: S.fg }}>No Moderators Defined</h3>
          <p className="text-sm" style={{ color: S.muted }}>Assign Access Keys to department heads to decentralize resource review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moderators.map(m => (
            <div key={m.id} className="rounded-[32px] p-6 animate-fadeIn" style={{ background: S.bg, boxShadow: S.extruded }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ boxShadow: S.inset, color: S.accent }}>
                  <Key className="w-5 h-5" />
                </div>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-red-500 transition-all hover:scale-110"
                  style={{ boxShadow: S.small }}
                >
                  {processing === m.id ? (
                    <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
              <h4 className="font-extrabold text-sm mb-1" style={{ color: S.fg }}>{m.name || 'Unnamed Moderator'}</h4>
              <p className="text-[11px] font-mono mb-2" style={{ color: S.accent }}>{m.access_key}</p>
              <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: S.muted }}>
                <GraduationCap className="w-3.5 h-3.5" /> {m.department}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200/50 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold" style={{ color: S.muted }}>
                 <span>Created</span>
                 <span>{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
