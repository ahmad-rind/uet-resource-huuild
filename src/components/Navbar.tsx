import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.pathname.startsWith('/search')) {
      setSearchQuery('');
    }
    // Automatically collapse search on route change
    setIsSearchExpanded(false);
  }, [location.pathname]);

  // Handle focus when search expands
  useEffect(() => {
    if (isSearchExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Collapse search on click outside
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
        <div className="bg-[#d6dae8] rounded-[28px] border border-white/20 relative" style={{ boxShadow: '0 4px 6px #b0b8cc, 0 -2px 4px #ffffff' }}>
          <div className="px-4 md:px-8">
            <div className="flex items-center h-16 relative">
              {/* Left: Logo */}
              <div className="flex-1 flex items-center transition-all duration-300">
                <Link to="/" className="flex items-center group focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8] rounded-xl shrink-0">
                  <div
                    className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:-translate-y-0.5 overflow-hidden p-1.5 md:p-2 shrink-0"
                    style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff', background: '#d6dae8' }}
                  >
                    <img src="/uettaxilalogo.webp" alt="University of Engineering and Technology Taxila official logo" className="w-full h-full object-contain" width="44" height="44" />
                  </div>
                  <div className={`flex flex-col justify-center transition-all duration-300 whitespace-nowrap overflow-hidden ${isSearchExpanded ? 'max-w-0 opacity-0 ml-0 sm:max-w-[200px] sm:opacity-100 sm:ml-3' : 'max-w-[200px] opacity-100 ml-3'}`}>
                    <span className="font-bold text-[#1a1d2e] text-[12px] sm:text-sm leading-tight block uppercase tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>UET Taxila</span>
                    <span className="text-[#475569] text-[8px] sm:text-[10px] leading-tight block opacity-80" style={{ fontFamily: "'DM Sans', sans-serif" }}>Resource Hub</span>
                  </div>
                </Link>
              </div>

              {/* Center: Desktop Nav Links */}
              <div className="hidden md:flex flex-none items-center justify-center gap-2">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`h-11 px-5 flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8] whitespace-nowrap ${isActive(link.to)
                      ? 'text-[#4A3FD8]'
                      : 'text-[#1a1d2e] hover:-translate-y-0.5'
                      }`}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      boxShadow: isActive(link.to)
                        ? 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff'
                        : '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff',
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
                    className={`flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden h-10 md:h-11 ${isSearchExpanded
                      ? 'md:w-64 w-[160px] sm:w-48 px-3 mr-2 opacity-100 translate-x-0 bg-[#d6dae8]'
                      : 'w-0 px-0 mr-0 opacity-0 translate-x-4 pointer-events-none bg-[#d6dae8]'
                      }`}
                    style={{
                      borderRadius: '16px',
                      boxShadow: 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff'
                    }}
                  >
                    <Search className="w-4 h-4 text-[#475569] shrink-0" />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent text-sm text-[#1a1d2e] placeholder-[#94A3B8] outline-none w-full focus:ring-0"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-2xl text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8]"
                    style={{ background: '#5B4FE9', boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff' }}
                    title={isSearchExpanded ? "Perform Search" : "Open Search"}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </form>

                {/* Admin Panel Button (Desktop) */}
                <Link
                  to="/admin/login"
                  title="Admin Panel"
                  className="hidden md:flex w-11 h-11 items-center justify-center rounded-2xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8] group"
                  style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff', background: '#d6dae8' }}
                >
                  <ShieldCheck className="w-4 h-4 text-[#475569] group-hover:text-[#4A3FD8] transition-colors duration-300" />
                </Link>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]"
                  style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff' }}
                  aria-label="Toggle menu"
                >
                  {menuOpen ? <X className="w-5 h-5 text-[#1a1d2e]" /> : <Menu className="w-5 h-5 text-[#1a1d2e]" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
              <div className="md:hidden pb-4 space-y-2">
                {/* Show Admin Button in Menu on Mobile */}
                <Link
                  to="/admin/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#1a1d2e] font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] mb-3"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff',
                    background: '#d6dae8'
                  }}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ boxShadow: 'inset 3px 3px 6px #b0b8cc, inset -3px -3px 6px #ffffff' }}>
                    <ShieldCheck className="w-4 h-4 text-[#4A3FD8]" />
                  </div>
                  Admin Panel
                </Link>

                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] ${isActive(link.to) ? 'text-[#4A3FD8]' : 'text-[#1a1d2e]'
                      }`}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      boxShadow: isActive(link.to)
                        ? 'inset 4px 4px 8px #b0b8cc, inset -4px -4px 8px #ffffff'
                        : '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff',
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
