'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'dark' | 'light';
export type AccentTheme = 'pink' | 'red' | 'white';

type ThemeContextValue = {
  accentTheme: AccentTheme;
  pnlVisualEmphasis: boolean;
  setPnlVisualEmphasis: (enabled: boolean) => void;
  setAccentTheme: (accentTheme: AccentTheme) => void;
  setTheme: (theme: Theme) => void;
  theme: Theme;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'oj-theme';
const ACCENT_STORAGE_KEY = 'oj-accent-theme';
const PNL_VISUAL_EMPHASIS_STORAGE_KEY = 'oj-pnl-visual-emphasis';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.classList.toggle('dark', theme === 'dark');
}

function applyAccentTheme(accentTheme: AccentTheme) {
  document.documentElement.dataset.accent = accentTheme;
}

function applyPnlVisualEmphasis(enabled: boolean) {
  document.documentElement.dataset.pnlVisualEmphasis = enabled ? 'on' : 'off';
}

function getResolvedTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const rootTheme = document.documentElement.dataset.theme;

  if (rootTheme === 'dark' || rootTheme === 'light') {
    return rootTheme;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getResolvedAccentTheme(): AccentTheme {
  if (typeof window === 'undefined') {
    return 'red';
  }

  const rootAccentTheme = document.documentElement.dataset.accent;

  if (
    rootAccentTheme === 'red' ||
    rootAccentTheme === 'white' ||
    rootAccentTheme === 'pink'
  ) {
    return rootAccentTheme;
  }

  const storedAccentTheme = window.localStorage.getItem(ACCENT_STORAGE_KEY);

  if (
    storedAccentTheme === 'red' ||
    storedAccentTheme === 'white' ||
    storedAccentTheme === 'pink'
  ) {
    return storedAccentTheme;
  }

  return 'red';
}

function getResolvedPnlVisualEmphasis() {
  if (typeof window === 'undefined') {
    return true;
  }

  const rootPreference = document.documentElement.dataset.pnlVisualEmphasis;

  if (rootPreference === 'on' || rootPreference === 'off') {
    return rootPreference === 'on';
  }

  const storedPreference = window.localStorage.getItem(
    PNL_VISUAL_EMPHASIS_STORAGE_KEY,
  );

  if (storedPreference === 'on' || storedPreference === 'off') {
    return storedPreference === 'on';
  }

  return true;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getResolvedTheme());
  const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() =>
    getResolvedAccentTheme(),
  );
  const [pnlVisualEmphasis, setPnlVisualEmphasisState] = useState<boolean>(() =>
    getResolvedPnlVisualEmphasis(),
  );

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);

    if (typeof document !== 'undefined') {
      applyTheme(nextTheme);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  }

  function setAccentTheme(nextAccentTheme: AccentTheme) {
    setAccentThemeState(nextAccentTheme);

    if (typeof document !== 'undefined') {
      applyAccentTheme(nextAccentTheme);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, nextAccentTheme);
    }
  }

  function setPnlVisualEmphasis(enabled: boolean) {
    setPnlVisualEmphasisState(enabled);

    if (typeof document !== 'undefined') {
      applyPnlVisualEmphasis(enabled);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        PNL_VISUAL_EMPHASIS_STORAGE_KEY,
        enabled ? 'on' : 'off',
      );
    }
  }

  const value: ThemeContextValue = {
    accentTheme,
    pnlVisualEmphasis,
    setPnlVisualEmphasis,
    setAccentTheme,
    setTheme,
    theme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider.');
  }

  return context;
}
