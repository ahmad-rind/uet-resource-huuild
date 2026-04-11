import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-semibold max-w-[360px]"
              style={{
                background: 'var(--neu-bg)',
                boxShadow: 'var(--neu-shadow-extruded)',
                color: 'var(--neu-fg)',
                fontFamily: "'DM Sans', sans-serif",
                border: '1px solid var(--neu-border)',
              }}
            >
              <div className="shrink-0">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-[#10B981]" />}
                {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-[#EF4444]" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-[#5B4FE9]" />}
              </div>
              <span className="flex-1 min-w-0">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--neu-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
