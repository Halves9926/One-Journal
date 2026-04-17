'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'dark' | 'light';

type ThemeContextValue = {
  setTheme: (theme: Theme) => void;
  theme: Theme;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'oj-theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') {
      return 'light';
    }

    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      setTheme,
      theme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider.');
  }

  return context;
}
