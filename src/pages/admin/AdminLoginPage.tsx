import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertTriangle, ArrowRight, Shield, Key, Mail } from 'lucide-react';
import { adminLogin, adminLogout, getAdminSession } from '../../lib/supabase.js';

type Role = 'admin' | 'moderator';

export default function AdminLoginPage() {
  const [role, setRole]             = useState<Role>('admin');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [accessKey, setAccessKey]   = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [attempts, setAttempts]     = useState(0);
  const [locked, setLocked]         = useState(false);
  const [lockTimer, setLockTimer]   = useState(0);
  const [checking, setChecking]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const s = getAdminSession();
      if (s.loggedIn && Date.now() - s.loginAt <= 8 * 60 * 60 * 1000) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        if (s.loggedIn) await adminLogout();
        setChecking(false);
      }
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      setLockTimer(t => {
        if (t <= 1) { setLocked(false); setAttempts(0); clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || loading) return;

    if (role === 'admin') {
      if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    } else {
      if (!accessKey.trim()) { setError('Access key is required.'); return; }
    }

    setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 400));

    try {
      const result = role === 'admin'
        ? await adminLogin(email.trim(), password)
        : await adminLogin(null, accessKey.trim());

      setLoading(false);
      if (result.success) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        const n = attempts + 1;
        setAttempts(n);
        if (role === 'admin') setPassword('');
        else setAccessKey('');

        if (n >= 5) {
          setLocked(true); setLockTimer(30);
          setError('Too many attempts. Locked for 30 seconds.');
        } else {
          const errMsg = result.error || '';
          if (result.errorType === 'network' || errMsg.toLowerCase().includes('network')) {
            setError('Connection error. Please check your internet and try again.');
          } else if (errMsg.includes('Email not confirmed')) {
            setError('Admin account not yet confirmed. Check Supabase Dashboard.');
          } else if (errMsg.includes('Invalid login credentials') || errMsg.includes('invalid_credentials')) {
            setError(`Incorrect credentials. ${5 - n} attempt${5 - n !== 1 ? 's' : ''} remaining.`);
          } else {
            setError(`Login failed. ${5 - n} attempt${5 - n !== 1 ? 's' : ''} remaining.`);
          }
        }
      }
    } catch {
      setLoading(false);
      setError('Connection error. Please check your internet and try again.');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#d6dae8]">
        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-[9px_9px_16px_#b0b8cc,-9px_-9px_16px_#ffffff]">
          <div className="w-5 h-5 border-2 border-[#5B4FE9] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative"
      style={{
        background: '#e2e6f2', // Slightly cooler background for contrast from the main site
        fontFamily: "'DM Sans', sans-serif"
      }}>

      <Link to="/" className="absolute top-4 left-4 md:top-6 md:left-6 neu-back-btn flex items-center gap-2 z-50 transition-all duration-200 focus:outline-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="neu-icon-well flex items-center justify-center">
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        </div>
        <span className="neu-back-label">BACK</span>
      </Link>
      <style>{`
        /* Neumorphic specific utilities for this view */
        .neu-back-btn {
          background: #e0e5ec;
          padding: 6px 16px 6px 6px;
          border-radius: 50px;
          box-shadow: 6px 6px 12px #b8bec8, -6px -6px 12px #ffffff;
          text-decoration: none;
        }
        .neu-back-btn:hover {
          box-shadow: inset 4px 4px 8px #b8bec8, inset -4px -4px 8px #ffffff;
          transform: translateY(1px);
        }
        .neu-icon-well {
          width: 28px;
          height: 28px;
          background: #e0e5ec;
          border-radius: 50%;
          color: #5b4fcf;
          box-shadow: inset 3px 3px 6px #b8bec8, inset -3px -3px 6px #ffffff;
        }
        .neu-back-label {
          color: #5b4fcf;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.15em;
          margin-left: 2px;
        }
        
        .admin-card {
          background: #d6dae8;
          box-shadow: 18px 18px 36px #c1c6d8, -18px -18px 36px #ffffff;
        }
        .admin-inset {
          box-shadow: inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff;
        }
        .admin-outset {
          box-shadow: 5px 5px 10px #b0b8cc, -5px -5px 10px #ffffff;
        }
        .admin-divider {
          background: linear-gradient(to bottom, transparent, rgba(176,184,204,0.4) 15%, rgba(176,184,204,0.4) 85%, transparent);
        }
        
        /* Attempt dots animation */
        @keyframes fadePulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .red-dot { background: #EF4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
        .gray-dot { background: transparent; box-shadow: inset 2px 2px 4px #b0b8cc, inset -2px -2px 4px #ffffff; }
      `}</style>

      {/* Main Split Layout Container */}
      <div className="w-full max-w-[760px] rounded-[40px] admin-card flex flex-col md:flex-row relative z-10 overflow-hidden">
        
        {/* LEFT PANEL - Branding & Roles */}
        <div className="w-full md:w-[320px] p-6 md:p-12 flex flex-col justify-between relative bg-[#d6dae8]">
          {/* Subtle right divider for desktop */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[1px] admin-divider" />
          
          <div className="flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-0 md:text-center text-left">
            {/* Logo Badge */}
            <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-2xl flex items-center justify-center md:mb-6 bg-[#d6dae8] admin-outset transition-all duration-300 hover:scale-105 p-2 md:p-3 shrink-0">
              <img src="/uettaxilalogo.png" alt="UET Logo" className="w-full h-full object-contain opacity-90" />
            </div>

            <div className="flex flex-col md:items-center">
              {/* University Tag - Hidden on mobile for brevity */}
              <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full admin-inset mb-5">
                <Shield className="w-3 h-3 text-[#64748B]" />
                <span className="text-[10px] font-bold tracking-widest text-[#64748B] uppercase" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  UET TAXILA
                </span>
              </div>

              <h1 className="text-[20px] md:text-[32px] font-extrabold text-[#1a1d2e] leading-tight tracking-tight md:mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Admin <span className="md:hidden">Panel</span>
                <span className="hidden md:inline"><br/>Panel</span>
              </h1>
              
              <div className="hidden md:block w-8 h-1 rounded-full bg-[#5B4FE9] my-4 shadow-[0_2px_8px_rgba(91,79,233,0.4)]" />

              <p className="hidden md:block text-[13px] text-[#64748B] leading-relaxed max-w-[200px] mb-8 md:mb-0">
                Manage resources, review submissions, and control platform access.
              </p>
            </div>
          </div>

          {/* Role Selectors stacked vertically - horizontal on mobile */}
          <div className="flex flex-row md:flex-col gap-3 mt-6 md:mt-20 md:mt-auto pt-4 md:pt-4">
            {(['admin', 'moderator'] as Role[]).map((r) => {
              const isActive = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); setError(''); }}
                  className={`relative flex items-center w-full h-12 px-5 rounded-[16px] transition-all duration-300 focus:outline-none ${isActive ? 'admin-inset' : 'admin-outset hover:scale-[1.02]'}`}
                >
                  <div className="flex items-center gap-3 w-full">
                    {r === 'admin' 
                      ? <Shield className={`w-4 h-4 ${isActive ? 'text-[#5B4FE9]' : 'text-[#64748B]'}`} />
                      : <Key className={`w-4 h-4 ${isActive ? 'text-[#5B4FE9]' : 'text-[#64748B]'}`} />
                    }
                    <span className={`text-[13px] font-bold ${isActive ? 'text-[#5B4FE9]' : 'text-[#64748B]'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {r === 'admin' ? 'Admin' : 'Moderator'}
                    </span>
                  </div>
                  
                  {/* Active Indicator Dot */}
                  <div className={`absolute right-4 w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-[#5B4FE9] shadow-[0_0_6px_rgba(91,79,233,0.5)] scale-100' : 'bg-[#b0b8cc] scale-0'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL - Form Fields */}
        <div className="flex-1 p-6 md:p-12 bg-[#ebedf4] flex flex-col justify-center md:rounded-r-[40px] shadow-[inset_12px_0_24px_-12px_rgba(176,184,204,0.3)]">
          
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-0.5 bg-[#5B4FE9] rounded-full shadow-[0_0_4px_rgba(91,79,233,0.4)]" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#64748B] uppercase h-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                SECURE ACCESS
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-[#1a1d2e] tracking-tight mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Sign in to continue
            </h2>
            <p className="text-[13px] text-[#64748B]">
              Enter your credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6 flex-1 flex flex-col justify-center">
            
            <div key={role} className="space-y-5 animate-fadeIn">
              {role === 'admin' ? (
                <>
                  {/* Email Box */}
                  <div>
                    <label className="block mb-2 text-[10px] font-bold tracking-[0.1em] text-[#64748B] uppercase ml-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      EMAIL ADDRESS
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                        <Mail className="w-full h-full text-[#64748B] opacity-50" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        placeholder="admin@uettaxila.edu.pk"
                        autoComplete="email"
                        disabled={locked || loading}
                        className="w-full h-[54px] rounded-[16px] text-[14px] bg-[#d6dae8] text-[#1a1d2e] placeholder:text-[#64748B]/70 pl-[44px] pr-4 outline-none disabled:opacity-50 transition-all focus:ring-2 focus:ring-[#5B4FE9]/30"
                        style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff' }}
                      />
                    </div>
                  </div>

                  {/* Password Box */}
                  <div>
                    <label className="block mb-2 text-[10px] font-bold tracking-[0.1em] text-[#64748B] uppercase ml-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      PASSWORD
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                        <Lock className="w-full h-full text-[#64748B] opacity-50" />
                      </div>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        placeholder={locked ? `Locked — wait ${lockTimer}s` : 'Enter your password'}
                        autoComplete="current-password"
                        disabled={locked || loading}
                        className="w-full h-[54px] rounded-[16px] text-[14px] bg-[#d6dae8] text-[#1a1d2e] placeholder:text-[#64748B]/70 pl-[44px] pr-12 outline-none disabled:opacity-50 transition-all focus:ring-2 focus:ring-[#5B4FE9]/30"
                        style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] opacity-50 hover:opacity-100 transition-opacity focus:outline-none"
                        title={showPwd ? 'Hide password' : 'Show password'}
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Access Key Box */
                <div>
                  <label className="block mb-2 text-[10px] font-bold tracking-[0.1em] text-[#64748B] uppercase ml-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    MODERATOR KEY
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                      <Key className="w-full h-full text-[#64748B] opacity-50" />
                    </div>
                    <input
                      type="text"
                      value={accessKey}
                      onChange={e => { setAccessKey(e.target.value); setError(''); }}
                      placeholder={locked ? `Locked — wait ${lockTimer}s` : 'MODE-XXXXXX'}
                      disabled={locked || loading}
                      className="w-full h-[54px] rounded-[16px] text-[14px] font-mono tracking-wider bg-[#d6dae8] text-[#1a1d2e] placeholder:text-[#64748B]/50 pl-[44px] pr-4 outline-none disabled:opacity-50 transition-all focus:ring-2 focus:ring-[#5B4FE9]/30 uppercase"
                      style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 mt-4 text-xs font-bold text-red-500 bg-red-500/10 px-4 py-3 rounded-[12px] border border-red-500/20">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {/* Attempt dots rendering under input section if relevant */}
            {attempts > 0 && !locked && (
              <div className="flex gap-2 justify-center py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 max-w-[12px] rounded-full transition-colors duration-300 ${i < attempts ? 'red-dot' : 'gray-dot'}`} />
                ))}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || locked}
              className="w-full mt-2 flex items-center justify-center gap-2.5 text-white transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] disabled:scale-100 disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/50"
              style={{
                height: 56,
                borderRadius: 16,
                background: locked ? '#9CA3AF' : '#5B4FE9',
                boxShadow: locked ? 'none' : '6px 6px 14px rgba(91,79,233,0.3), inset 2px 2px 6px rgba(255,255,255,0.2)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Verifying...</>
              ) : locked ? (
                <><Lock className="w-4 h-4" /> Locked ({lockTimer}s)</>
              ) : (
                <>Access Dashboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
