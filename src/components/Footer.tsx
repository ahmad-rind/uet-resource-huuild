import { Link } from 'react-router-dom';
import {
  Github,
  Instagram,
  Mail,
  MessageSquare
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="w-[calc(100%-64px)] max-w-7xl bg-[#d6dae8] rounded-[28px] mx-auto"
      style={{
        position: 'relative',
        marginTop: '48px',
        marginBottom: '24px',
        padding: '20px 28px',
        boxShadow: '10px 10px 22px #b0b8cc, -10px -10px 22px #ffffff, inset 0 0 0 1px rgba(255, 255, 255, 0.20)',
        animation: 'footerSlideUp 0.6s 0.2s cubic-bezier(0.22, 0.8, 0.36, 1) both'
      }}
    >
      <style>{`
        @keyframes footerSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .footer-col + .footer-col::before {
          content: '';
          position: absolute;
          left: 0; top: 8%; height: 84%; width: 1px;
          background: linear-gradient(to bottom, transparent, #b0b8cc 30%, #b0b8cc 70%, transparent);
        }
        .social-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #d6dae8;
          box-shadow: 3px 3px 8px #b0b8cc, -3px -3px 8px #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          transition: all 0.2s ease;
        }
        .social-btn:hover {
          box-shadow: inset 2px 2px 6px #b0b8cc, inset -2px -2px 6px #ffffff;
          color: #5B4FE9;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        @media (min-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1.7fr 1fr 1.5fr;
            gap: 0;
          }
        }
      `}</style>

      <div className="footer-grid">
        {/* Brand & Social Section */}
        <div className="footer-col relative lg:pr-8 flex flex-col justify-center">
          <Link to="/" className="flex items-center gap-3 mb-4 group focus:outline-none focus:ring-2 focus:ring-[#5B4FE9] focus:ring-offset-2 focus:ring-offset-[#d6dae8] rounded-xl shrink-0 w-max">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:-translate-y-0.5 p-2 shrink-0 bg-[#d6dae8]"
              style={{
                boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff'
              }}
            >
              <img 
                src="/uettaxilalogo.webp" 
                alt="University of Engineering and Technology Taxila official logo" 
                className="w-full h-full object-contain"
                width="44" height="44"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-bold text-[#1a1d2e] text-sm leading-tight block uppercase tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>UET Taxila</span>
              <span className="text-[#475569] text-[10px] leading-tight block opacity-80" style={{ fontFamily: "'DM Sans', sans-serif" }}>Resource Hub</span>
            </div>
          </Link>

          <p className="text-[13px] text-[#475569] leading-[1.6] mb-5 max-w-[280px] font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            The definitive digital ecosystem for UET Taxila students. Share, discover, and excel.
          </p>

          <div className="flex gap-4">
            {[
              { icon: Github, href: 'https://github.com/ahmad-rind', label: 'GitHub' },
              { icon: Instagram, href: 'https://www.instagram.com/ahmad_rind49/', label: 'Instagram' },
              { icon: Mail, href: 'mailto:ahmadrind20@gmail.com', label: 'Email' }
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
                aria-label={item.label}
              >
                <item.icon className="w-4 h-4 transition-transform duration-300" />
              </a>
            ))}
          </div>
          
          <p className="text-[10px] text-[#475569] font-medium mt-5 md:mt-8 ml-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            © {currentYear} UET Taxila Resource Hub
          </p>
        </div>

        {/* Quick Explore Section */}
        <div className="footer-col relative lg:px-8 flex flex-col justify-center">
          <h4 className="font-bold text-[#1a1d2e] text-[11px] uppercase tracking-[0.2em] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Quick Explore
          </h4>
          <ul className="space-y-3">
            {[
              { to: '/browse', label: 'All Resources' },
              { to: '/search?type=Past Paper', label: 'Past Papers' },
              { to: '/search?type=Notes', label: 'Academic Notes' },
              { to: '/search?type=Lab Manual', label: 'Lab Manuals' },
            ].map(link => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="group flex items-center gap-3 text-[13px] text-[#475569] hover:text-[#1a1d2e] transition-all duration-300 font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b0b8cc] transition-all duration-300 group-hover:w-3 group-hover:bg-[#5B4FE9] group-hover:shadow-[0_0_8px_rgba(91,79,233,0.4)]" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact/CTA Section */}
        <div className="footer-col relative lg:pl-8 flex flex-col justify-center">
          <h4 className="font-bold text-[#1a1d2e] text-[11px] uppercase tracking-[0.2em] mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Join the Mission
          </h4>
          <div
            className="p-[14px] rounded-[18px] bg-[#d6dae8] flex flex-col gap-4"
            style={{ boxShadow: 'inset 8px 8px 16px #b0b8cc, inset -8px -8px 16px #ffffff' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 bg-[#d6dae8]"
                style={{ boxShadow: '3px 3px 6px #b0b8cc, -3px -3px 6px #ffffff' }}>
                <MessageSquare className="w-4 h-4 text-[#4A3FD8]" />
              </div>
              <p className="text-xs text-[#475569] leading-snug font-medium">
                Contribute your knowledge or get technical support directly from our student team.
              </p>
            </div>

            <Link
              to="/contact"
              className="group flex items-center justify-center gap-2 px-6 py-3 rounded-[12px] text-white text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#5B4FE9]/20"
              style={{
                background: 'linear-gradient(145deg, #746cff, #6159e6)',
                boxShadow: '8px 8px 20px rgba(108, 99, 255, 0.25)',
                fontFamily: "'DM Sans', sans-serif"
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              Get in Touch
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

