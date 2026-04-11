import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!location.pathname.startsWith('/search')) {
      setSearchQuery('');
    }
    setIsSearchExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isSearchExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSearchExpanded) {
      setIsSearchExpanded(true);
      return;
    }
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMenuOpen(false);
      setIsSearchExpanded(false);
    } else {
      setIsSearchExpanded(false);
    }
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/browse', label: 'Browse' },
    { to: '/submit', label: 'Submit Resource' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-4 z-50 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div
          className="rounded-[28px] relative"
          style={{
            background: 'var(--neu-bg)',
            boxShadow: 'var(--neu-shadow-extruded)',
            border: '1px solid var(--neu-border)',
          }}
        >
          <div className="px-4 md:px-8">
            <div className="flex items-center h-16 relative">
              {/* Left: Logo */}
              <div className="flex-1 flex items-center transition-all duration-150">
                <Link to="/" className="flex items-center group focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 rounded-xl shrink-0" style={{ '--tw-ring-offset-color': 'var(--neu-bg)' } as React.CSSProperties}>
                  <div
                    className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center transition-all duration-150 group-hover:-translate-y-0.5 overflow-hidden p-1.5 md:p-2 shrink-0"
                    style={{ boxShadow: 'var(--neu-shadow-extruded-sm)', background: 'var(--neu-bg)' }}
                  >
                    <img src="/uettaxilalogo.webp" alt="University of Engineering and Technology Taxila official logo" className="w-full h-full object-contain" width="44" height="44" />
                  </div>
                  <div className={`flex flex-col justify-center transition-all duration-150 whitespace-nowrap overflow-hidden ${isSearchExpanded ? 'max-w-0 opacity-0 ml-0 sm:max-w-[200px] sm:opacity-100 sm:ml-3' : 'max-w-[200px] opacity-100 ml-3'}`}>
                    <span className="font-bold text-[12px] sm:text-sm leading-tight block uppercase tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>UET Taxila</span>
                    <span className="text-[8px] sm:text-[10px] leading-tight block opacity-80" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>Resource Hub</span>
                  </div>
                </Link>
              </div>

              {/* Center: Desktop Nav Links */}
              <div className="hidden md:flex flex-none items-center justify-center gap-2">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`h-11 px-5 flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] whitespace-nowrap ${isActive(link.to)
                      ? ''
                      : 'hover:-translate-y-0.5'
                      }`}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      color: isActive(link.to) ? 'var(--neu-accent)' : 'var(--neu-fg)',
                      boxShadow: isActive(link.to)
                        ? 'var(--neu-shadow-inset-sm)'
                        : 'var(--neu-shadow-extruded-sm)',
                      background: 'var(--neu-bg)',
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Right: Actions & Search */}
              <div className="flex-1 flex items-center justify-end gap-2 md:gap-3">
                {/* Unified Search Form */}
                <form ref={searchRef} onSubmit={handleSearch} className="flex items-center m-0 p-0">
                  <div
                    className={`flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden h-10 md:h-11 ${isSearchExpanded
                      ? 'md:w-64 w-[160px] sm:w-48 px-3 mr-2 opacity-100 translate-x-0'
                      : 'w-0 px-0 mr-0 opacity-0 translate-x-4 pointer-events-none'
                      }`}
                    style={{
                      borderRadius: '16px',
                      boxShadow: 'var(--neu-shadow-inset-sm)',
                      background: 'var(--neu-bg)',
                    }}
                  >
                    <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--neu-muted)' }} />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent text-sm placeholder-[#94A3B8] outline-none w-full focus:ring-0"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-fg)' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-2xl text-white transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                    style={{ background: 'var(--neu-btn)', boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                    title={isSearchExpanded ? "Perform Search" : "Open Search"}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>

                {/* Dark Mode Toggle (Desktop) */}
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="hidden md:flex w-11 h-11 items-center justify-center rounded-2xl transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] group"
                  style={{ boxShadow: 'var(--neu-shadow-extruded-sm)', background: 'var(--neu-bg)' }}
                >
                  {theme === 'dark'
                    ? <Sun className="w-4 h-4 group-hover:text-yellow-400 transition-colors duration-150" style={{ color: 'var(--neu-muted)' }} />
                    : <Moon className="w-4 h-4 group-hover:text-[#5B4FE9] transition-colors duration-150" style={{ color: 'var(--neu-muted)' }} />
                  }
                </button>

                {/* Admin Panel Button (Desktop) */}
                <Link
                  to="/admin/login"
                  title="Admin Panel"
                  className="hidden md:flex w-11 h-11 items-center justify-center rounded-2xl transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] group"
                  style={{ boxShadow: 'var(--neu-shadow-extruded-sm)', background: 'var(--neu-bg)' }}
                >
                  <ShieldCheck className="w-4 h-4 group-hover:text-[#4A3FD8] transition-colors duration-150" style={{ color: 'var(--neu-muted)' }} />
                </Link>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl transition-all duration-150 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                  style={{ boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                  aria-label="Toggle menu"
                >
                  {menuOpen ? <X className="w-5 h-5" style={{ color: 'var(--neu-fg)' }} /> : <Menu className="w-5 h-5" style={{ color: 'var(--neu-fg)' }} />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Overlay */}
            {menuOpen && (
              <div className="fixed inset-0 z-[100] md:hidden flex justify-center items-start p-4 bg-black/40 backdrop-blur-sm sm:items-center">
                <style>{`
                  @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                  }
                  .mobile-menu-modal {
                    animation: scaleIn 0.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                  }
                `}</style>
                {/* Backdrop Click Handler Area */}
                <div 
                  className="absolute inset-0" 
                  onClick={() => setMenuOpen(false)} 
                />
                
                {/* Menu Modal */}
                <div 
                  className="relative w-full max-w-sm rounded-[32px] p-6 flex flex-col gap-4 mobile-menu-modal mx-auto"
                  style={{ 
                    background: 'var(--neu-bg)',
                    boxShadow: 'var(--neu-shadow-extruded-lg)',
                    border: '1px solid var(--neu-border)'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                       {/* Logo */}
                       <div className="w-10 h-10 rounded-2xl flex items-center justify-center p-1.5 shrink-0" style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded-sm)' }}>
                          <img src="/uettaxilalogo.webp" alt="logo" className="w-full h-full object-contain" />
                       </div>
                       <div className="flex flex-col">
                          <span className="font-bold text-[13px] uppercase leading-tight tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--neu-fg)' }}>UET TAXILA</span>
                          <span className="text-[10px] leading-tight opacity-80" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--neu-muted)' }}>Resource Hub</span>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => { 
                           setMenuOpen(false); 
                           setIsSearchExpanded(true); 
                           setTimeout(() => inputRef.current?.focus(), 100); 
                         }} 
                         className="w-10 h-10 rounded-2xl flex items-center justify-center text-white transition-transform active:scale-95" 
                         style={{ background: 'var(--neu-btn)', boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                       >
                         <Search className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => setMenuOpen(false)} 
                         className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform active:scale-95" 
                         style={{ background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-extruded-sm)', color: 'var(--neu-fg)' }}
                       >
                         <X className="w-5 h-5" />
                       </button>
                    </div>
                  </div>

                  {/* Menu Items Stack */}
                  <div className="flex flex-col gap-3.5 mt-2">
                     <button 
                       onClick={() => { toggleTheme(); setMenuOpen(false); }} 
                       className="flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-[14px] transition-transform active:scale-95 text-left" 
                       style={{ fontFamily: "'DM Sans', sans-serif", background: 'var(--neu-bg)', color: 'var(--neu-fg)', boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                     >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ boxShadow: 'var(--neu-shadow-inset-sm)' }}>
                           {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" style={{ color: 'var(--neu-accent)' }} />}
                        </div>
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                     </button>

                     <Link 
                       onClick={() => setMenuOpen(false)} 
                       to="/admin/login" 
                       className="flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-[14px] transition-transform active:scale-95" 
                       style={{ fontFamily: "'DM Sans', sans-serif", background: 'var(--neu-bg)', color: 'var(--neu-fg)', boxShadow: 'var(--neu-shadow-extruded-sm)' }}
                     >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ boxShadow: 'var(--neu-shadow-inset-sm)' }}>
                           <ShieldCheck className="w-4 h-4 text-[#4A3FD8]" style={{ color: 'var(--neu-accent)' }} />
                        </div>
                        Admin Panel
                     </Link>

                     <div className="h-px w-full my-0 opacity-50" style={{ background: 'var(--neu-border)' }} />

                     {navLinks.map(link => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setMenuOpen(false)}
                          className="px-5 py-4 rounded-2xl font-bold text-[14px] transition-transform active:scale-95"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            color: isActive(link.to) ? 'var(--neu-accent)' : 'var(--neu-fg)',
                            boxShadow: isActive(link.to) ? 'var(--neu-shadow-inset-sm)' : 'var(--neu-shadow-extruded-sm)'
                          }}
                        >
                          {link.label}
                        </Link>
                     ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
