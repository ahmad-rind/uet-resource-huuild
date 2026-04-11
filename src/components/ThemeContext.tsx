import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = 'uet_theme';
const TRANSITION_DURATION = 600; // ms — matches CSS transition duration

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const transitionTimer = useRef<ReturnType<typeof setTimeout>>();

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch { /* noop */ }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch { /* noop */ }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;

    // Clear any previous transition timer
    if (transitionTimer.current) clearTimeout(transitionTimer.current);

    // Enable global smooth transition
    root.classList.add('theme-transitioning');

    // Toggle theme on next frame so the transition class is painted first
    requestAnimationFrame(() => {
      setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    });

    // Remove transition class after animation completes
    transitionTimer.current = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, TRANSITION_DURATION);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

