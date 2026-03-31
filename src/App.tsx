import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';
import SubmitPage from './pages/SubmitPage';
import SearchPage from './pages/SearchPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ContactPage from './pages/ContactPage';

/** Scroll to top on route change (including query params) */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Use 'instant' behavior to avoid smooth scrolling conflicts during navigation
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

/** Public layout — with Navbar + Footer */
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#d6dae8] flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** 404 page */
function NotFound() {
  return (
    <div className="min-h-screen bg-[#d6dae8] flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-4xl"
          style={{ boxShadow: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)' }}
        >
          🔍
        </div>
        <h1
          className="text-3xl font-extrabold text-[#1a1d2e] mb-3 tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Page Not Found
        </h1>
        <p className="text-[#64748B] mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          className="px-6 py-3 rounded-2xl text-white font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background: '#5B4FE9',
            boxShadow: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

/** Detects if current route is an admin route */
function useIsAdmin() {
  const location = useLocation();
  return location.pathname.startsWith('/admin');
}

/** Root — decides which shell to render based on route */
function Root() {
  const isAdmin = useIsAdmin();

  if (isAdmin) {
    // Admin routes — no Navbar, no Footer, dark background
    return (
      <div style={{ minHeight: '100vh', background: '#0F1117' }}>
        <Routes>
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    );
  }

  // Public routes
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/browse" element={<PublicLayout><BrowsePage /></PublicLayout>} />
      <Route path="/submit" element={<PublicLayout><SubmitPage /></PublicLayout>} />
      <Route path="/search" element={<PublicLayout><SearchPage /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Root />
    </BrowserRouter>
  );
}
