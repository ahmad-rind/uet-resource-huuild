import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  CheckCircle, 
  BookOpen, 
  Type, Link as LinkIcon, User, Send, ChevronRight, ChevronLeft, ChevronDown,
  FileText, FlaskConical, ClipboardList, PenTool, Layout, Layers
} from 'lucide-react';
import { submitResource, getLiveCoursesData } from '../lib/supabase.js';
import { resourceTypes, departments as staticDepartments } from '../data/courses.js';
import { deptIcons } from './HomePage.js';
import { ScrollProgress } from '../components/ScrollProgress.js';

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



const resourceTypeDescriptors: Record<string, string> = {
  "Past Paper": "Official exams from previous years.",
  "Study Material": "Helpful books, slides, or guides.",
  "Lab Manual": "Instructions for practical experiments.",
  "Document Template": "Standardized formats and reports.",
  "Assignment": "Problems sets and project tasks.",
  "Notes": "Handwritten or typed lecture summaries.",
  "Other": "Miscellaneous useful resources."
};

const formatDeptName = (dept: string) => {
  const name = dept.replace(/\s*\(BS[C]?\)$/i, '');
  switch(name) {
    case 'Civil Engineering': return 'Civil\nEngineering';
    case 'Environmental Engineering': return 'Environmental\nEngineering';
    case 'Electrical Engineering': return 'Electrical\nEngineering';
    case 'Electronics Engineering': return 'Electronics\nEngineering';
    case 'Mechanical Engineering': return 'Mechanical\nEngineering';
    case 'Mechatronics Engineering': return 'Mechatronics\nEngineering';
    case 'Industrial & Manufacturing Engineering': return 'Industrial\nEngineering';
    case 'Computer Engineering': return 'Computer\nEngineering';
    case 'Artificial Intelligence': return 'Artificial\nIntelligence';
    case 'Software Engineering': return 'Software\nEngineering';
    case 'Telecommunication Engineering': return 'Telecom\nEngineering';
    case 'Computer Science': return 'Computer\nScience';
    case 'Mathematics': return 'Mathematics';
    case 'Physics': return 'Physics';
    default: return name;
  }
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

  const [departments, setDepartments] = useState<Record<string, any>>(staticDepartments);
  const [departmentList, setDepartmentList] = useState<string[]>(Object.keys(staticDepartments));

  useEffect(() => {
    getLiveCoursesData().then(data => {
      setDepartments(data.departments);
      setDepartmentList(data.departmentList);
    });
  }, []);

  const semesterOptions = form.department 
    ? ['1', '2', '3', '4', '5', '6', '7', '8']
    : [];

  const dynamicCourses = form.department && form.semester && departments[form.department]
    ? departments[form.department][form.semester]
    : null;

  const staticCourses = form.department && form.semester && (staticDepartments as Record<string, any>)[form.department]
    ? (staticDepartments as Record<string, any>)[form.department][form.semester] || []
    : [];

  const semesterCourses = (dynamicCourses && dynamicCourses.length > 0) 
    ? dynamicCourses 
    : staticCourses;

  useEffect(() => {
    if (form.courseCode && semesterCourses.length) {
      const course = semesterCourses.find((c: any) => c.code === form.courseCode);
      if (course) setForm(f => ({ ...f, courseName: course.name }));
    }
  }, [form.courseCode, form.semester, semesterCourses]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
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
          <h2 className="text-2xl font-black text-[#1a1d2e] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Resource Submitted!</h2>
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
    <div className="flex flex-col items-center justify-center bg-[#d6dae8] py-6 px-4 md:px-8 min-h-[calc(100vh-80px)]">
      <ScrollProgress />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #b0b8cc; border-radius: 10px; }
      `}</style>
      
      <main className="max-w-3xl mx-auto w-full px-2 sm:px-0">
        <div className="flex flex-col items-center justify-center w-full">
          <div className="w-full">
            <form onSubmit={handleSubmit} noValidate className="w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 relative overflow-hidden w-full" 
                style={outsetStyle}
              >
                
                {/* New Tabbed Progress Header */}
                <div className="mb-6 lg:mb-8">
                  <div className="flex justify-between items-center mb-4 pb-2">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                      {['Department', 'Course', 'Type', 'Details', 'Finish'].map((stepName, idx) => {
                        const stepNum = idx + 1;
                        const isActive = currentStep === stepNum;
                        const isCompleted = currentStep > stepNum;
                        
                        let statusClasses = 'text-[#94a3b8]';
                        if (isActive) statusClasses = 'bg-[#5B4FE9] text-white shadow-sm';
                        else if (isCompleted) statusClasses = 'bg-[#5B4FE9]/10 text-[#5B4FE9]';
                        
                        return (
                          <div key={stepName} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${statusClasses}`}>
                            {stepName}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Percentage */}
                    <div className="text-sm lg:text-base font-black text-[#5B4FE9] shrink-0 ml-4">
                      {Math.round((currentStep/5)*100)}%
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="h-1 w-full bg-[#b0b8cc]/40 rounded-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-[#5B4FE9] transition-all duration-700" style={{ width: `${(currentStep/5)*100}%` }} />
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  {/* Step 1: Department */}
                  {currentStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 sm:space-y-5"
                    >
                    <div className="text-center sm:text-left mb-4">
                      <h2 className="text-xl lg:text-2xl font-black text-[#1a1d2e] mb-1.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Select <span className="text-[#5B4FE9]">Department</span>
                      </h2>
                      <p className="text-[#64748B] text-[10px] sm:text-xs font-medium">Choose the department where your resource belongs</p>
                    </div>
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 lg:gap-x-5 lg:gap-y-5 pt-2">
                        {departmentList.map((dept) => {
                        const isSelected = form.department === dept;
                        return (
                          <button key={dept} type="button" onClick={() => {
                              if (dept !== form.department) {
                                setForm(prev => ({ ...prev, department: dept, semester: '', courseCode: '', courseName: '' }));
                              }
                            }} 
                             className="group flex flex-col items-center gap-2 w-[64px] sm:w-[76px] transition-all duration-300 hover:-translate-y-1 focus:outline-none" 
                          >
                             
                             <div 
                               className={`w-12 h-12 sm:w-[60px] sm:h-[60px] shrink-0 rounded-full flex items-center justify-center transition-all duration-300 bg-[#d6dae8] [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 ${isSelected ? 'ring-2 ring-[#5B4FE9] ring-offset-[3px] ring-offset-[#d6dae8]' : '[&>svg]:opacity-80 group-hover:[&>svg]:opacity-100 group-hover:[&>svg]:scale-110'}`}
                               style={isSelected ? insetStyle : outsetStyle}
                             >
                               {deptIcons[dept] || <BookOpen className="text-[#64748B]" />}
                             </div>
                             
                             <div className="w-full text-center">
                               <span className={`block font-bold text-[9px] sm:text-[10px] leading-[1.1] whitespace-pre-wrap transition-colors duration-300 ${isSelected ? 'text-[#5B4FE9]' : 'text-[#1a1d2e]'}`}
                                 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                 {formatDeptName(dept)}
                               </span>
                             </div>
                           </button>
                        );
                       })}
                      </div>
                    <div className="flex justify-end mt-8">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        disabled={!form.department}
                        className="h-12 px-8 rounded-full bg-[#5B4FE9] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
                        style={outsetStyle}
                      >
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Semester & Course */}
                {currentStep === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 sm:space-y-5"
                  >
                <div className="flex items-center gap-3">
                  <button onClick={prevStep} type="button" className="p-2 rounded-xl transition-transform hover:scale-105 active:scale-95" style={outsetStyle}><ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-[#5B4FE9]" /></button>
                  <h2 className="text-lg lg:text-xl font-black text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}><span className="text-[#5B4FE9]">Semester</span> & Course</h2>
                </div>

                <div>
                  <label className="text-[10px] lg:text-xs font-black text-[#1a1d2e] uppercase tracking-widest pl-1 block mb-3 lg:mb-4">Select <span className="text-[#5B4FE9]">Semester</span></label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 lg:gap-3">
                    {semesterOptions.map((sem) => (
                      <button key={sem} type="button" onClick={() => { setForm(f => ({ ...f, semester: sem, courseCode: '' })); }}
                        className="h-9 lg:h-10 rounded-xl flex flex-col items-center justify-center transition-all hover:-translate-y-1 active:scale-95" 
                        style={form.semester === sem ? insetStyle : outsetStyle}>
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className={`text-xs font-black uppercase tracking-widest ${form.semester === sem ? 'text-[#5B4FE9]' : 'text-[#64748B]'}`}>SEM</span>
                          <span className={`text-lg font-black leading-none ${form.semester === sem ? 'text-[#5B4FE9]' : 'text-[#1a1d2e]'}`}>{sem}</span>
                        </div>
                      </button>
                    ))}
                  </div>
               </div>

                {form.semester && (
                  <div>
                    <label className="text-[10px] lg:text-xs font-black text-[#1a1d2e] uppercase tracking-widest pl-1 block mb-3 lg:mb-4">Choose <span className="text-[#5B4FE9]">Course</span></label>
                    <div className="relative">
                      <select
                        value={form.courseCode}
                        onChange={e => {
                          const code = e.target.value;
                          const course = semesterCourses.find((c: any) => c.code === code);
                          if (course) {
                            setForm(f => ({ ...f, courseCode: course.code, courseName: course.name }));
                          } else {
                            setForm(f => ({ ...f, courseCode: '', courseName: '' }));
                          }
                        }}
                        disabled={!form.semester}
                        className="w-full appearance-none px-4 py-3.5 rounded-2xl text-[13px] font-medium text-[#1a1d2e] bg-[#d6dae8] outline-none focus:ring-2 focus:ring-[#5B4FE9]/20 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:grayscale"
                        style={{ boxShadow: 'inset 5px 5px 10px #b0b8cc, inset -5px -5px 10px #ffffff', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <option value="">Select a course...</option>
                        {semesterCourses.map((c: any) => (
                          <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] pointer-events-none" />
                    </div>
                    <div className="flex justify-end mt-8">
                      <button type="button" onClick={nextStep} disabled={!form.courseCode}
                        className="h-10 px-8 rounded-full bg-[#5B4FE9] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
                        style={outsetStyle}>
                        Continue <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Resource Type */}
            {currentStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 sm:space-y-5"
              >
                <div className="flex items-center gap-3">
                  <button onClick={prevStep} type="button" className="p-2 rounded-xl transition-transform hover:scale-105 active:scale-95" style={outsetStyle}><ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-[#5B4FE9]" /></button>
                  <h2 className="text-lg lg:text-xl font-black text-[#1a1d2e]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Resource <span className="text-[#5B4FE9]">Type</span></h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {resourceTypes.map((type) => (
                    <button key={type} type="button" onClick={() => handleStepSelection('type', type)}
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
                <div className="flex justify-end mt-4">
                  <button type="button" onClick={nextStep} disabled={!form.type}
                    className="h-10 px-8 rounded-full bg-[#5B4FE9] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
                    style={outsetStyle}>
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Link & Title */}
            {currentStep === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 sm:space-y-5"
              >
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
                <div className="flex justify-end mt-4">
                  <button type="button" onClick={nextStep} disabled={!form.title || !form.externalLink}
                    className="h-10 px-8 rounded-full bg-[#5B4FE9] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
                    style={outsetStyle}>
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Finalize */}
            {currentStep === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 sm:space-y-5"
              >
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
                    <div className="relative">
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
                <div className="flex justify-end mt-6">
                  <button type="submit" disabled={submitting}
                    className="h-10 px-8 rounded-full bg-[#5B4FE9] text-white font-black text-sm flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform disabled:opacity-50"
                    style={outsetStyle}>
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4" /> Submit Resource</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
            {submitError && <div className="text-red-500 text-xs text-center font-bold animate-shake mt-2">{submitError}</div>}
            </motion.div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
