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
import { ScrollProgress } from '../components/ScrollProgress.js';
import { Reveal } from '../components/Reveal.js';
import { Helmet } from 'react-helmet-async';

// Neumorphic Design Tokens
const S = {
  bg: '#d6dae8',
  fg: '#1a1d2e',
  muted: '#475569',
  accent: '#5B4FE9',
  extruded: '12px 12px 24px #b0b8cc, -12px -12px 24px #ffffff',
  inset: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff',
  small: '6px 6px 12px #b0b8cc, -6px -6px 12px #ffffff',
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
    <div className="min-h-screen bg-[#d6dae8] flex items-center justify-center py-12 md:py-0">
      <Helmet>
        <title>Contact Us | UET Taxila Resource Hub</title>
        <meta name="description" content="Get in touch with UET Taxila Resource Hub. Report issues, suggest improvements, or ask questions." />
        <link rel="canonical" href="https://uetresourcehub.app/contact" />
        <meta property="og:title" content="Contact Us — UET Taxila Resource Hub" />
        <meta property="og:url" content="https://uetresourcehub.app/contact" />
      </Helmet>
      <ScrollProgress />
      <div className="max-w-7xl w-full mx-auto px-6 md:px-8">
      <Reveal delay={0.15} yOffset={40}>
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-8 lg:py-0">
          
          {/* ── Left Column: Information ── */}
          <div className="lg:w-1/2 text-left space-y-8 order-2 lg:order-1">
            <div className="space-y-6">
              {/* Badge */}
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#d6dae8] w-fit"
                style={{ boxShadow: '4px 4px 8px #b0b8cc, -4px -4px 8px #ffffff', border: '1px solid rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5B4FE9]" />
                <span className="text-[10px] font-semibold tracking-[0.18em] text-[#475569] uppercase">
                  Support Desk
                </span>
              </div>

              <h1 className="text-[2.25rem] md:text-[3.5rem] lg:text-[4rem] font-bold leading-tight tracking-tight text-[#1a1d2e]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C63FF] to-[#A78BFA]">Touch</span>
              </h1>
              
              <p className="text-lg text-[#475569] max-w-lg leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Have a suggestion to improve the hub? Or found an issue that needs fixing? 
                Our team is ready to help you thrive.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-5 rounded-3xl bg-[#d6dae8]" style={{ boxShadow: S.small }}>
                <h4 className="text-[11px] font-bold text-[#4A3FD8] uppercase tracking-wider mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Response Time</h4>
                <p className="text-sm font-semibold text-[#1a1d2e]">Under 24 Hours</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#d6dae8]" style={{ boxShadow: S.small }}>
                <h4 className="text-[11px] font-bold text-[#4A3FD8] uppercase tracking-wider mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Community Led</h4>
                <p className="text-sm font-semibold text-[#1a1d2e]">Volunteer Based</p>
              </div>
            </div>
          </div>

          {/* ── Right Column: Form Card ── */}
          <div className="lg:w-1/2 w-full order-1 lg:order-2">
            <div className="rounded-[48px] p-8 md:p-10 bg-[#d6dae8]" style={{ boxShadow: S.extruded }}>
              
              {status === 'success' ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 bg-[#d6dae8]"
                    style={{ boxShadow: S.small }}>
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Success!</h3>
                  <p className="text-[#475569] mb-10 text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>Message received. We'll get back to you soon.</p>
                  <button 
                    onClick={() => setStatus('idle')}
                    className="px-10 py-4 rounded-2xl text-white font-bold text-[15px] transition-all duration-300 hover:-translate-y-1 active:scale-95"
                    style={{ background: S.accent, boxShadow: '8px 8px 20px rgba(91, 79, 233, 0.3)', fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 text-[#475569]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3B1C6] transition-colors group-focus-within:text-[#4A3FD8]" />
                        <input
                          required
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          className="w-full pl-11 pr-5 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10 shadow-[inset_4px_4px_8px_#b0b8cc,_inset_-4px_-4px_8px_#ffffff]"
                          style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif" }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 text-[#475569]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3B1C6] transition-colors group-focus-within:text-[#4A3FD8]" />
                        <input
                          required
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="hello@example.com"
                          className="w-full pl-11 pr-5 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10 shadow-[inset_4px_4px_8px_#b0b8cc,_inset_-4px_-4px_8px_#ffffff]"
                          style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 text-[#475569]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Feedback Type</label>
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
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 text-[#475569]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Subject</label>
                    <input
                      required
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="Brief topic"
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10 shadow-[inset_4px_4px_8px_#b0b8cc,_inset_-4px_-4px_8px_#ffffff]"
                      style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] px-1 text-[#475569]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Message Details</label>
                    <textarea
                      required
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Describe in detail..."
                      rows={3}
                      className="w-full px-5 py-3.5 rounded-2xl text-sm font-medium outline-none resize-none transition-all duration-300 focus:ring-4 focus:ring-[#5B4FE9]/10 shadow-[inset_4px_4px_8px_#b0b8cc,_inset_-4px_-4px_8px_#ffffff]"
                      style={{ background: S.bg, color: S.fg, fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>

                  {status === 'error' && (
                    <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 text-[11px] font-bold" style={{ border: '1px solid rgba(220, 38, 38, 0.1)' }}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <button
                    disabled={status === 'loading'}
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 py-4.5 rounded-[20px] text-white text-[15px] font-bold transition-all duration-300 hover:-translate-y-1 active:translate-y-0.5 disabled:opacity-50"
                    style={{ 
                      background: S.accent,
                      boxShadow: '8px 8px 24px rgba(91, 79, 233, 0.3)',
                      fontFamily: "'DM Sans', sans-serif",
                      paddingTop: '1rem',
                      paddingBottom: '1rem'
                    }}
                  >
                    {status === 'loading' ? (
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Message
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
