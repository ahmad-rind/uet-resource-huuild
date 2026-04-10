import { useState } from 'react';
import { 
  Mail, 
  User, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  LifeBuoy,
  Lightbulb,
  Info
} from 'lucide-react';
import { submitContactRequest } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ScrollProgress } from '../components/ScrollProgress.js';
import { Reveal } from '../components/Reveal.js';
import { Helmet } from 'react-helmet-async';

// Neumorphic Design Tokens — now referencing CSS variables
const S = {
  bg: 'var(--neu-bg)',
  fg: 'var(--neu-fg)',
  muted: 'var(--neu-muted)',
  accent: 'var(--neu-accent)',
  extruded: 'var(--neu-shadow-extruded-lg)',
  inset: 'var(--neu-shadow-inset)',
  small: 'var(--neu-shadow-extruded-sm)',
};

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'Suggestion',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await submitContactRequest(formData);
      if (res.success) {
        setStatus('success');
        setFormData({ name: '', email: '', type: 'Suggestion', subject: '', message: '' });
        showToast('Message sent successfully!', 'success');
      } else {
        setStatus('error');
        setErrorMsg(res.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-8 md:py-0" style={{ background: S.bg }}>
      <Helmet>
        <title>Contact Us | UET Taxila Resource Hub</title>
        <meta name="description" content="Get in touch with UET Taxila Resource Hub. Report issues, suggest improvements, or ask questions." />
        <link rel="canonical" href="https://uetresourcehub.app/contact" />
        <meta property="og:title" content="Contact Us — UET Taxila Resource Hub" />
        <meta property="og:url" content="https://uetresourcehub.app/contact" />
      </Helmet>
      <ScrollProgress />
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8">
      <Reveal delay={0.15} yOffset={40}>
        <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-12 lg:gap-20 py-4 md:py-8 lg:py-0">
          
          {/* ── Left Column: Information ── */}
          <div className="lg:w-1/2 text-left space-y-5 md:space-y-8 order-1 lg:order-1">
            <div className="space-y-6">
              {/* Badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full w-fit"
                style={{ background: S.bg, boxShadow: S.small, border: '1px solid var(--neu-border)', fontFamily: "'DM Sans', sans-serif" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: S.accent }} />
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: S.muted }}>
                  Support Desk
                </span>
              </div>

              <h1 className="text-[1.75rem] md:text-[3.5rem] lg:text-[4rem] font-bold leading-tight tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: S.fg }}>
                Get in <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--neu-gradient-accent)' }}>Touch</span>
              </h1>
              
              <p className="text-base md:text-lg max-w-lg leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", color: S.muted }}>
                Have a suggestion to improve the hub? Or found an issue that needs fixing? 
                Our team is ready to help you thrive.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <div className="p-4 md:p-5 rounded-2xl md:rounded-3xl" style={{ background: S.bg, boxShadow: S.small }}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: S.accent }}>Response Time</h4>
                <p className="text-sm font-semibold" style={{ color: S.fg }}>Under 24 Hours</p>
              </div>
              <div className="p-4 md:p-5 rounded-2xl md:rounded-3xl" style={{ background: S.bg, boxShadow: S.small }}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: S.accent }}>Community Led</h4>
                <p className="text-sm font-semibold" style={{ color: S.fg }}>Volunteer Based</p>
              </div>
            </div>
          </div>

          {/* ── Right Column: Form Card ── */}
          <div className="lg:w-1/2 w-full order-2 lg:order-2">
            <div className="rounded-[28px] md:rounded-[48px] p-5 md:p-10" style={{ background: S.bg, boxShadow: S.extruded }}>
              
              {status === 'success' ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8"
                    style={{ background: S.bg, boxShadow: S.small }}>
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: S.fg }}>Success!</h3>
                  <p className="mb-10 text-base" style={{ fontFamily: "'DM Sans', sans-serif", color: S.muted }}>Message received. We'll get back to you soon.</p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="px-10 py-4 rounded-2xl text-white font-bold text-[15px] transition-all duration-300 hover:-translate-y-1 active:scale-95"
                    style={{ background: S.accent, boxShadow: '8px 8px 20px rgba(91, 79, 233, 0.3)', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1" style={{ fontFamily: "'DM Sans', sans-serif", color: S.muted }}>Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors group-focus-within:!text-[#5B4FE9]" style={{ color: S.muted }} />
                        <input
                          required
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          className="w-full pl-11 pr-5 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10"
                          style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif", boxShadow: S.inset }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1" style={{ fontFamily: "'DM Sans', sans-serif", color: S.muted }}>Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors group-focus-within:!text-[#5B4FE9]" style={{ color: S.muted }} />
                        <input
                          required
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="hello@example.com"
                          className="w-full pl-11 pr-5 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10"
                          style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif", boxShadow: S.inset }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1" style={{ fontFamily: "'DM Sans', sans-serif", color: S.muted }}>Feedback Type</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'Suggestion', icon: Lightbulb },
                        { id: 'Issue',      icon: LifeBuoy },
                        { id: 'Other',      icon: Info },
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, type: item.id }))}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all duration-300 ${formData.type === item.id ? 'translate-y-0.5' : 'hover:-translate-y-0.5'}`}
                          style={{ 
                            background: S.bg, 
                            boxShadow: formData.type === item.id ? S.inset : S.small,
                            color: formData.type === item.id ? S.accent : S.muted,
                            fontFamily: "'DM Sans', sans-serif"
                          }}
                        >
                          <item.icon className="w-3 h-3" /> {item.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1" style={{ fontFamily: "'DM Sans', sans-serif", color: S.muted }}>Subject</label>
                    <input
                      required
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Brief topic"
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10"
                      style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif", boxShadow: S.inset }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1" style={{ fontFamily: "'DM Sans', sans-serif", color: S.muted }}>Message Details</label>
                    <textarea
                      required
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Describe in detail..."
                      rows={3}
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium outline-none resize-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10"
                      style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif", boxShadow: S.inset }}
                    />
                  </div>

                  {status === 'error' && (
                    <div className="flex items-center gap-2 p-4 rounded-2xl text-[11px] font-bold" style={{ background: S.bg, color: '#EF4444', border: '1px solid #EF4444', boxShadow: S.inset }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <style>{`
                    .contact-send-btn {
                      display: flex;
                      align-items: center;
                      overflow: hidden;
                      transition: all 0.2s;
                    }
                    .contact-send-btn span.send-text {
                      display: block;
                      margin-left: 0.3em;
                      transition: all 0.3s ease-in-out;
                    }
                    .contact-send-btn svg.send-icon {
                      display: block;
                      transform-origin: center center;
                      transition: transform 0.3s ease-in-out;
                    }
                    /* Changed hover from the button selector to apply to children */
                    .contact-send-btn:hover .svg-wrapper {
                      animation: fly-1 0.6s ease-in-out infinite alternate;
                    }
                    .contact-send-btn:hover svg.send-icon {
                      transform: translateX(3em) rotate(45deg) scale(1.1);
                    }
                    .contact-send-btn:hover span.send-text {
                      transform: translateX(12em);
                    }
                    .contact-send-btn:active {
                      transform: scale(0.95);
                    }
                    @keyframes fly-1 {
                      from { transform: translateY(0.1em); }
                      to { transform: translateY(-0.1em); }
                    }
                  `}</style>
                  
                  <button
                    disabled={status === 'loading'}
                    type="submit"
                    className="w-fit ml-auto px-6 py-3 flex items-center justify-center gap-2 rounded-2xl text-white text-[15px] font-bold disabled:opacity-50 contact-send-btn"
                    style={{ 
                      background: status === 'loading' ? S.muted : S.accent,
                      boxShadow: 'var(--neu-shadow-extruded)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {status === 'loading' ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <div className="svg-wrapper flex items-center justify-center">
                          <Send className="w-4 h-4 send-icon" />
                        </div>
                        <span className="send-text">Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Reveal>
      </div>
    </div>
  );
}
