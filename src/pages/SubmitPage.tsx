import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  BookOpen, 
  Type, Link as LinkIcon, User, Send, ChevronRight, ChevronLeft, ChevronDown,
  FileText, FlaskConical, ClipboardList, PenTool, Layout, Layers
} from 'lucide-react';
import { submitResource } from '../lib/supabase.js';
import { departments, departmentList, resourceTypes } from '../data/courses.js';
import { deptIcons } from './HomePage.js';

interface FormData {
  department: string;
  semester: string;
  courseCode: string;
  courseName: string;
  title: string;
  type: string;
  externalLink: string;
  contributorName: string;
  description: string;
}

const outsetStyle = {
  boxShadow: '8px 8px 16px #b0b8cc, -8px -8px 16px #ffffff',
};

const insetStyle = {
  boxShadow: 'inset 6px 6px 10px #b0b8cc, inset -6px -6px 10px #ffffff',
};

// --- Icons & Helpers ---


const getResourceTypeIcon = (type: string) => {
  const props = { className: "w-5 h-5", style: { stroke: "#5B4FE9" } };
  const t = type.toLowerCase();
  if (t.includes('paper')) return <FileText {...props} />;
  if (t.includes('material')) return <BookOpen {...props} />;
  if (t.includes('manual')) return <FlaskConical {...props} />;
  if (t.includes('template')) return <Layout {...props} />;
  if (t.includes('assignment')) return <ClipboardList {...props} />;
  if (t.includes('notes')) return <PenTool {...props} />;
  return <Layers {...props} />;
};

const getOrdinalSuffix = (n: string) => {
  const s = ["th", "st", "nd", "rd"];
  const v = Number(n) % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const resourceTypeDescriptors: Record<string, string> = {
  "Past Paper": "Official exams from previous years.",
  "Study Material": "Helpful books, slides, or guides.",
  "Lab Manual": "Instructions for practical experiments.",
  "Document Template": "Standardized formats and reports.",
  "Assignment": "Problems sets and project tasks.",
  "Notes": "Handwritten or typed lecture summaries.",
  "Other": "Miscellaneous useful resources."
};

export default function SubmitPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormData>({
    department: searchParams.get('department') || '',
    semester: searchParams.get('semester') || '',
    courseCode: searchParams.get('course') || '',
    courseName: '',
    type: '',
    title: '',
    externalLink: '',
    contributorName: '',
    description: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  const semesterOptions = form.department
    ? Object.keys((departments as any)[form.department] || {}).sort(
        (a, b) => Number(a) - Number(b)
      )
    : [];

  const semesterCourses =
    form.department && form.semester
      ? ((departments as any)[form.department] || {})[form.semester] || []
      : [];

  useEffect(() => {
    if (form.courseCode && semesterCourses.length) {
      const course = semesterCourses.find((c: any) => c.code === form.courseCode);
      if (course) setForm(f => ({ ...f, courseName: course.name }));
    }
  }, [form.courseCode, form.semester, semesterCourses]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    setIsCourseDropdownOpen(false);
  }, [currentStep]);

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.department) errs.department = 'Required';
    if (!form.semester) errs.semester = 'Required';
    if (!form.courseCode) errs.courseCode = 'Required';
    if (!form.title.trim()) errs.title = 'Required';
    if (!form.type) errs.type = 'Required';
    if (!form.externalLink.trim()) {
      errs.externalLink = 'Required';
    } else {
      let linkStr = form.externalLink.trim();
      if (!/^https?:\/\//i.test(linkStr)) linkStr = 'https://' + linkStr;
      try { new URL(linkStr); } catch { errs.externalLink = 'Invalid URL'; }
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Find which step failed to show a helpful message
      let step = 4;
      if (errs.department || errs.semester || errs.courseCode) step = 1;
      else if (errs.type) step = 3;
      setSubmitError(`Please go back to Step ${step} and fix the errors.`);
      return false;
    }
    setSubmitError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    
    let finalLink = form.externalLink.trim();
    if (!/^https?:\/\//i.test(finalLink)) finalLink = 'https://' + finalLink;

    try {
      const result = await submitResource({
        department: form.department,
        semester: Number(form.semester),
        courseCode: form.courseCode,
        courseName: form.courseName,
        title: form.title.trim(),
        type: form.type,
        link: finalLink,
        uploadedBy: form.contributorName.trim() || 'Anonymous',
        description: form.description.trim(),
      });
      if (result.success) setSuccess({ ...form, id: result.id });
      else setSubmitError(result.error || 'Submission failed.');
    } catch (err: any) {
      setSubmitError(err?.message || 'Error occurred.');
    } finally { setSubmitting(false); }
  };

  const handleStepSelection = (field: keyof FormData, value: string, nextStepVal?: number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (nextStepVal) setCurrentStep(nextStepVal);
  };

  const nextStep = () => {
    if (currentStep === 4) {
      if (!form.title.trim()) {
        setErrors({ title: 'Title is required' });
        return;
      }
      let linkStr = form.externalLink.trim();
      if (!/^https?:\/\//i.test(linkStr)) linkStr = 'https://' + linkStr;
      try { 
        new URL(linkStr); 
      } catch { 
        setErrors({ externalLink: 'Invalid URL format' });
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      setErrors({});
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const resetForm = () => {
    setSuccess(null);
    setForm({ department: '', semester: '', courseCode: '', courseName: '', title: '', type: '', externalLink: '', contributorName: '', description: '' });
    setCurrentStep(1);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#d6dae8] py-10 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full rounded-[32px] p-10 text-center" style={outsetStyle}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={outsetStyle}>
            <CheckCircle className="w-10 h-10 text-[#10B981]" />
          </div>
          <h2 className="text-2xl font-black text-[#1a1d2e] mb-2">Resource Submitted!</h2>
          <p className="text-[#64748B] text-sm mb-6">Thank you for contributing to our community.</p>
          <div className="rounded-2xl p-5 mb-8 text-left space-y-2.5" style={insetStyle}>
             <div className="text-xs text-[#64748B]"><strong>Title:</strong> {success.title}</div>
             <div className="text-xs text-[#64748B]"><strong>Course:</strong> {success.courseCode}</div>
             <div className="text-xs text-[#64748B]"><strong>Link:</strong> <a href={success.externalLink} target="_blank" className="text-[#5B4FE9] hover:underline">View Resource</a></div>
          </div>
          <div className="flex gap-4">
            <button onClick={resetForm} className="flex-1 py-3 rounded-2xl font-bold" style={outsetStyle}>Submit Another</button>
            <Link to="/browse" className="flex-1 py-3 rounded-2xl bg-[#5B4FE9] text-white font-bold" style={outsetStyle}>Browse</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#d6dae8] pt-8 pb-32 lg:pt-16 lg:pb-[240px] px-4 md:px-8">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        .animate-section { animation: fadeInUp 0.4s ease forwards; }
        .animate-pop { animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
      
      <main className="max-w-3xl mx-auto w-full">
        <div className="flex flex-col items-center justify-center min-h-[75vh] lg:min-h-[0] gap-6 lg:gap-8">
          
          {/* Header - Centered Above Form */}
          <div className="text-center animate-section w-full">
            <h1 className="text-4xl md:text-5xl font-black text-[#1a1d2e] leading-tight mb-2 md:mb-3">
              Submit a <span className="text-[#5B4FE9]">Resource</span>
            </h1>
            <p className="text-[#64748B] text-sm md:text-base font-medium leading-relaxed max-w-md mx-auto">
              Join 5 steps to share your knowledge with the UET community.
            </p>
          </div>

          {/* Form & Progress Content */}
          <div className="w-full">
            {/* Minimal Progress Bar */}
            <div className="mb-6 px-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-[#5B4FE9] tracking-widest uppercase">Step {currentStep} / {totalSteps}</span>
                <span className="text-[10px] font-black text-[#5B4FE9]">{Math.round((currentStep/totalSteps)*100)}%</span>
              </div>
              <div className="h-0.5 w-full bg-[#b0b8cc]/40 rounded-full relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-[#5B4FE9] transition-all duration-700" style={{ width: `${(currentStep/totalSteps)*100}%` }} />
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="rounded-[32px] p-6 lg:p-8" style={outsetStyle}>
                
                {/* Step 1: Department */}
                {currentStep === 1 && (
                  <div className="space-y-4 lg:space-y-6 animate-section">
                    <h2 className="text-lg lg:text-xl font-black text-[#1a1d2e]">Select <span className="text-[#5B4FE9]">Department</span></h2>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
                      {departmentList.map((dept) => {
                        const isSelected = form.department === dept;
                        return (
                          <button key={dept} type="button" onClick={() => {
                              if (dept !== form.department) {
                                setForm(prev => ({ ...prev, department: dept, semester: '', courseCode: '', courseName: '' }));
                              } else {
                                handleStepSelection('department', dept, 2);
                              }
                              setCurrentStep(2);
                            }} 
                             className="group relative flex flex-col items-center p-3 rounded-2xl transition-all hover:-translate-y-1 focus:outline-none" style={isSelected ? insetStyle : outsetStyle}>
                             {isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#5B4FE9] rounded-full animate-pop" />}
                             
                             <div 
                               className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 mb-2 lg:mb-3 [&>svg]:w-4 [&>svg]:h-4 lg:[&>svg]:w-5 lg:[&>svg]:h-5"
                               style={isSelected ? outsetStyle : insetStyle}
                             >
                               {deptIcons[dept] || <BookOpen className="w-5 h-5 text-[#64748B]" />}
                             </div>
                             
                             <span className={`text-[9px] lg:text-[10px] font-black text-center uppercase tracking-tight leading-tight ${isSelected ? 'text-[#5B4FE9]' : 'text-[#64748B]'}`}>
                               {dept.replace(/\s*\(BS[C]?\)$/i, '')}
                             </span>
                           </button>
                        );
                      })}
                    </div>
                  </div>
                )}

            {/* Step 2: Semester & Course */}
            {currentStep === 2 && (
              <div className="space-y-4 lg:space-y-6 animate-section">
                <div className="flex items-center gap-3">
                  <button onClick={prevStep} type="button" className="p-2 rounded-xl transition-transform hover:scale-105 active:scale-95" style={outsetStyle}><ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-[#5B4FE9]" /></button>
                  <h2 className="text-lg lg:text-xl font-black text-[#1a1d2e]"><span className="text-[#5B4FE9]">Semester</span> & Course</h2>
                </div>

                <div>
                  <label className="text-[10px] lg:text-xs font-black text-[#1a1d2e] uppercase tracking-widest pl-1 block mb-3 lg:mb-4">Select <span className="text-[#5B4FE9]">Semester</span></label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 lg:gap-3">
                    {semesterOptions.map((sem) => (
                      <button key={sem} type="button" onClick={() => { setForm(f => ({ ...f, semester: sem, courseCode: '' })); setIsCourseDropdownOpen(false); }}
                        className="h-10 lg:h-12 rounded-xl flex flex-col items-center justify-center transition-all hover:-translate-y-1 active:scale-95" 
                        style={form.semester === sem ? insetStyle : outsetStyle}>
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-base lg:text-lg font-black leading-none ${form.semester === sem ? 'text-[#5B4FE9]' : 'text-[#1a1d2e]'}`}>{sem}</span>
                          <span className={`text-[7px] font-black uppercase tracking-tighter ${form.semester === sem ? 'text-[#5B4FE9]' : 'text-[#64748B]'}`}>
                            {getOrdinalSuffix(sem).slice(-2)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
               </div>

                {form.semester && (
                  <div className="animate-section">
                    <label className="text-[10px] lg:text-xs font-black text-[#1a1d2e] uppercase tracking-widest pl-1 block mb-3 lg:mb-4">Choose <span className="text-[#5B4FE9]">Course</span></label>
                    <div className="relative z-50">
                      <div 
                        onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                        className="w-full h-12 lg:h-[50px] pl-10 pr-6 rounded-xl bg-transparent flex items-center justify-between cursor-pointer" 
                        style={outsetStyle}
                      >
                        <span className={`text-xs lg:text-sm font-bold truncate ${form.courseCode ? 'text-[#1a1d2e]' : 'text-[#64748B] opacity-80'}`}>
                          {form.courseCode ? `${form.courseCode} - ${form.courseName}` : 'Select a course...'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                      <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B4FE9] pointer-events-none" />
                      
                      {isCourseDropdownOpen && (
                        <div className="absolute top-[58px] left-0 w-full rounded-xl bg-[#d6dae8] max-h-[160px] lg:max-h-[200px] overflow-y-auto animate-section origin-top p-1.5 custom-scrollbar" style={outsetStyle}>
                          <style>{`
                            .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #b0b8cc transparent; }
                            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin: 4px; }
                            .custom-scrollbar::-webkit-scrollbar-thumb { background: #b0b8cc; border-radius: 10px; }
                            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748B; }
                          `}</style>
                          {semesterCourses.map((c: any) => (
                             <button
                               key={c.code}
                               type="button"
                               className="w-full text-left px-4 py-2 text-xs md:text-sm font-semibold text-[#1a1d2e] hover:bg-[#b0b8cc]/40 transition-colors rounded-lg mb-0.5 last:mb-0 focus:outline-none focus:bg-[#c2c6d4]"
                               onClick={() => {
                                  const course = semesterCourses.find((x: any) => x.code === c.code);
                                  if (course) {
                                    handleStepSelection('courseCode', course.code); 
                                    handleStepSelection('courseName', course.name, 3);
                                  }
                                  setIsCourseDropdownOpen(false);
                               }}
                             >
                               <span className="font-bold">{c.code}</span> - {c.name}
                             </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Resource Type */}
            {currentStep === 3 && (
              <div className="space-y-4 lg:space-y-6 animate-section">
                <div className="flex items-center gap-3">
                  <button onClick={prevStep} type="button" className="p-2 rounded-xl transition-transform hover:scale-105 active:scale-95" style={outsetStyle}><ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-[#5B4FE9]" /></button>
                  <h2 className="text-lg lg:text-xl font-black text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Resource <span className="text-[#5B4FE9]">Type</span></h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {resourceTypes.map((type) => (
                    <button key={type} type="button" onClick={() => handleStepSelection('type', type, 4)}
                      className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all hover:scale-[1.02]" style={form.type === type ? insetStyle : outsetStyle}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={form.type === type ? insetStyle : outsetStyle}>
                        <div className="[&>svg]:w-4 [&>svg]:h-4">{getResourceTypeIcon(type)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] lg:text-xs font-bold text-[#1a1d2e] truncate">{type}</div>
                        <div className="text-[9px] leading-tight text-[#64748B] truncate">{resourceTypeDescriptors[type]}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Link & Title */}
            {currentStep === 4 && (
              <div className="space-y-4 lg:space-y-6 animate-section">
                <div className="flex items-center gap-3">
                  <button onClick={prevStep} type="button" className="p-2 rounded-xl transition-transform hover:scale-105 active:scale-95" style={outsetStyle}><ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-[#5B4FE9]" /></button>
                  <h2 className="text-lg lg:text-xl font-black text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Resource <span className="text-[#5B4FE9]">Details</span></h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="relative">
                      <input type="text" placeholder="Title*" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        className={`w-full h-12 rounded-xl bg-transparent pl-10 focus:outline-none text-xs lg:text-sm font-bold ${errors.title ? 'ring-2 ring-red-500/50' : ''}`} style={outsetStyle} />
                      <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B4FE9]" />
                    </div>
                    {errors.title && <p className="text-[9px] text-red-500 font-black tracking-wide ml-2">REQUIRED</p>}
                  </div>
                  <div className="space-y-1">
                    <div className="relative">
                      <input type="url" placeholder="External Link*" value={form.externalLink} onChange={e => setForm(f => ({ ...f, externalLink: e.target.value }))}
                        className={`w-full h-12 rounded-xl bg-transparent pl-10 focus:outline-none text-xs lg:text-sm font-bold ${errors.externalLink ? 'ring-2 ring-red-500/50' : ''}`} style={outsetStyle} />
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B4FE9]" />
                    </div>
                    {errors.externalLink && <p className="text-[9px] text-red-500 font-black tracking-wide ml-2 uppercase">{errors.externalLink}</p>}
                  </div>
                </div>
                <button type="button" onClick={nextStep} disabled={!form.title || !form.externalLink}
                  className="w-full h-12 rounded-xl bg-[#5B4FE9] text-white font-black text-xs lg:text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] transition-transform" style={outsetStyle}>
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 5: Finalize */}
            {currentStep === 5 && (
              <div className="space-y-4 lg:space-y-6 animate-section">
                <div className="flex items-center gap-3">
                  <button onClick={prevStep} type="button" className="p-2 rounded-xl transition-transform hover:scale-105 active:scale-95" style={outsetStyle}><ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-[#5B4FE9]" /></button>
                  <h2 className="text-lg lg:text-xl font-black text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Final <span className="text-[#5B4FE9]">Touches</span></h2>
                </div>
                <div className="space-y-4">
                  {/* Anonymous Toggle */}
                  <div 
                    className="flex items-center justify-between p-3.5 lg:p-4 rounded-[20px] cursor-pointer"
                    style={outsetStyle}
                    onClick={() => {
                      setIsAnonymous(!isAnonymous);
                      if (!isAnonymous) setForm(f => ({ ...f, contributorName: '' }));
                    }}
                  >
                    <div>
                      <h3 className="text-[11px] lg:text-xs font-bold text-[#1a1d2e]">Submit anonymously</h3>
                      <p className="text-[9px] text-[#64748B] mt-0.5">Your name won't appear publicly</p>
                    </div>
                    <div className="w-10 h-5 rounded-full relative transition-all duration-300 flex items-center p-1" style={insetStyle}>
                      <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isAnonymous ? 'translate-x-5 bg-[#5B4FE9]' : 'translate-x-0 bg-[#b0b8cc]'}`} />
                    </div>
                  </div>

                  {!isAnonymous && (
                    <div className="relative animate-section">
                      <input type="text" placeholder="Your Name (Optional)" value={form.contributorName} onChange={e => setForm(f => ({ ...f, contributorName: e.target.value }))}
                        className="w-full h-12 rounded-xl bg-transparent pl-10 focus:outline-none text-xs lg:text-sm font-bold" style={outsetStyle} />
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B4FE9]" />
                    </div>
                  )}
                  <div className="relative">
                    <textarea placeholder="Description (Optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full p-3.5 lg:p-4 pl-10 lg:pl-10 rounded-xl bg-transparent focus:outline-none min-h-[80px] text-xs lg:text-sm font-bold resize-none custom-scrollbar" style={outsetStyle} />
                    <FileText className="absolute left-3.5 top-[14px] lg:top-[16px] w-4 h-4 text-[#5B4FE9]" />
                  </div>
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full h-12 lg:h-[54px] rounded-xl bg-[#5B4FE9] text-white font-black text-xs lg:text-sm flex items-center justify-center gap-3 hover:scale-[1.01] transition-transform" style={outsetStyle}>
                  {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-4 h-4" /> Submit Resource</>}
                </button>
              </div>
            )}

            {submitError && <div className="text-red-500 text-xs text-center font-bold animate-shake mt-2">{submitError}</div>}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
