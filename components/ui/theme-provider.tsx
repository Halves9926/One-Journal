'use client';

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

type Theme = 'dark' | 'light';

export type AccentColors = {
  primary: string;
  secondary: string;
};

export const DEFAULT_ACCENT_COLORS: AccentColors = {
  primary: '#9f1239',
  secondary: '#8a244a',
};

type ThemeContextValue = {
  accentColors: AccentColors;
  pnlVisualEmphasis: boolean;
  resetAccentColors: () => void;
  setAccentColors: (colors: Partial<AccentColors>) => void;
  setPnlVisualEmphasis: (enabled: boolean) => void;
  setPrimaryAccentColor: (color: string) => void;
  setSecondaryAccentColor: (color: string) => void;
  setTheme: (theme: Theme) => void;
  theme: Theme;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'oj-theme';
const ACCENT_COLORS_STORAGE_KEY = 'oj-accent-colors';
const LEGACY_ACCENT_STORAGE_KEY = 'oj-accent-theme';
const PNL_VISUAL_EMPHASIS_STORAGE_KEY = 'oj-pnl-visual-emphasis';
const THEME_CHANGE_EVENT = 'one-journal:theme-change';
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const LEGACY_ACCENT_COLORS: Record<string, AccentColors> = {
  pink: {
    primary: '#d9468a',
    secondary: '#8a244a',
  },
  red: DEFAULT_ACCENT_COLORS,
  white: {
    primary: '#d4cdc3',
    secondary: '#8c857c',
  },
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function subscribeToThemePreference(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorageChange(event: StorageEvent) {
    if (
      event.key === THEME_STORAGE_KEY ||
      event.key === ACCENT_COLORS_STORAGE_KEY ||
      event.key === LEGACY_ACCENT_STORAGE_KEY ||
      event.key === PNL_VISUAL_EMPHASIS_STORAGE_KEY
    ) {
      if (
        event.key === ACCENT_COLORS_STORAGE_KEY ||
        event.key === LEGACY_ACCENT_STORAGE_KEY
      ) {
        applyAccentColors(readStoredAccentColors() ?? readLegacyAccentColors());
      }

      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

function dispatchThemePreferenceChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim());
}

function normalizeHexColor(value: unknown, fallback: string) {
  return isHexColor(value) ? value.trim().toLowerCase() : fallback;
}

function normalizeAccentColors(colors?: Partial<AccentColors> | null) {
  return {
    primary: normalizeHexColor(colors?.primary, DEFAULT_ACCENT_COLORS.primary),
    secondary: normalizeHexColor(
      colors?.secondary,
      DEFAULT_ACCENT_COLORS.secondary,
    ),
  };
}

function serializeAccentColors(colors: AccentColors) {
  return `${colors.primary}|${colors.secondary}`;
}

function parseAccentColorSnapshot(snapshot: string): AccentColors {
  const [primary, secondary] = snapshot.split('|');

  return normalizeAccentColors({
    primary,
    secondary,
  });
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, DEFAULT_ACCENT_COLORS.primary);
  const value = Number.parseInt(normalized.slice(1), 16);

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function getReadableTextColor(hex: string) {
  const { b, g, r } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.58 ? '#151821' : '#ffffff';
}

function getAccentTokenValues(colors: AccentColors) {
  return {
    '--accent-primary': colors.primary,
    '--accent-secondary': colors.secondary,
    '--accent-primary-soft':
      'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
    '--accent-primary-glow':
      'color-mix(in srgb, var(--accent-primary) 18%, transparent)',
    '--accent-secondary-soft':
      'color-mix(in srgb, var(--accent-secondary) 10%, transparent)',
    '--accent-secondary-glow':
      'color-mix(in srgb, var(--accent-secondary) 14%, transparent)',
    '--accent-solid': 'var(--accent-primary)',
    '--accent-strong':
      'color-mix(in srgb, var(--accent-primary) 58%, var(--foreground))',
    '--accent-gradient':
      'linear-gradient(135deg, var(--accent-gradient-start), var(--accent-gradient-mid) 60%, var(--accent-gradient-end))',
    '--accent-gradient-start': 'var(--accent-primary)',
    '--accent-gradient-mid':
      'color-mix(in srgb, var(--accent-primary) 72%, var(--accent-secondary))',
    '--accent-gradient-end':
      'color-mix(in srgb, var(--accent-secondary) 78%, var(--accent-primary))',
    '--accent-soft-bg':
      'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
    '--accent-soft-bg-strong':
      'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
    '--accent-border-soft':
      'color-mix(in srgb, var(--accent-primary) 20%, transparent)',
    '--accent-border-strong':
      'color-mix(in srgb, var(--accent-primary) 34%, transparent)',
    '--accent-text':
      'color-mix(in srgb, var(--accent-primary) 68%, var(--foreground))',
    '--accent-text-strong':
      'color-mix(in srgb, var(--accent-primary) 48%, var(--foreground))',
    '--accent-button-text': getReadableTextColor(colors.primary),
    '--accent-button-shadow':
      'color-mix(in srgb, var(--accent-primary) 42%, transparent)',
    '--accent-focus-ring':
      'color-mix(in srgb, var(--accent-primary) 24%, transparent)',
    '--accent-glow-top':
      'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
    '--accent-glow-side':
      'color-mix(in srgb, var(--accent-secondary) 14%, transparent)',
    '--accent-panel-glow':
      'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
    '--accent-panel-glow-soft':
      'color-mix(in srgb, var(--accent-secondary) 8%, transparent)',
    '--chart-accent': 'var(--accent-primary)',
    '--chart-accent-soft':
      'color-mix(in srgb, var(--accent-secondary) 22%, transparent)',
    '--chart-secondary': 'var(--accent-secondary)',
    '--ring': 'var(--accent-focus-ring)',
  };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.classList.toggle('dark', theme === 'dark');
}

function applyAccentColors(colors: Partial<AccentColors> | null = null) {
  const normalizedColors = normalizeAccentColors(colors);
  const root = document.documentElement;

  root.dataset.accent = 'custom';

  Object.entries(getAccentTokenValues(normalizedColors)).forEach(
    ([property, value]) => {
      root.style.setProperty(property, value);
    },
  );
}

function applyPnlVisualEmphasis(enabled: boolean) {
  document.documentElement.dataset.pnlVisualEmphasis = enabled ? 'on' : 'off';
}

function readStoredAccentColors() {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedColors = window.localStorage.getItem(ACCENT_COLORS_STORAGE_KEY);

  if (!storedColors) {
    return null;
  }

  try {
    const parsedColors = JSON.parse(storedColors) as Partial<AccentColors>;

    return normalizeAccentColors(parsedColors);
  } catch {
    return null;
  }
}

function readLegacyAccentColors() {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCENT_COLORS;
  }

  const storedAccentTheme = window.localStorage.getItem(
    LEGACY_ACCENT_STORAGE_KEY,
  );

  return LEGACY_ACCENT_COLORS[storedAccentTheme ?? ''] ?? DEFAULT_ACCENT_COLORS;
}

function readRootAccentColors() {
  if (typeof window === 'undefined') {
    return null;
  }

  const root = document.documentElement;
  const styles = window.getComputedStyle(root);
  const primary =
    root.style.getPropertyValue('--accent-primary') ||
    styles.getPropertyValue('--accent-primary');
  const secondary =
    root.style.getPropertyValue('--accent-secondary') ||
    styles.getPropertyValue('--accent-secondary');

  if (!isHexColor(primary) || !isHexColor(secondary)) {
    return null;
  }

  return normalizeAccentColors({
    primary,
    secondary,
  });
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

function getServerThemeSnapshot(): Theme {
  return 'light';
}

function getResolvedAccentColorSnapshot() {
  if (typeof window === 'undefined') {
    return serializeAccentColors(DEFAULT_ACCENT_COLORS);
  }

  return serializeAccentColors(
    readStoredAccentColors() ??
      readRootAccentColors() ??
      readLegacyAccentColors(),
  );
}

function getServerAccentColorSnapshot() {
  return serializeAccentColors(DEFAULT_ACCENT_COLORS);
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

function getServerPnlVisualEmphasisSnapshot() {
  return true;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToThemePreference,
    getResolvedTheme,
    getServerThemeSnapshot,
  );
  const accentColorSnapshot = useSyncExternalStore(
    subscribeToThemePreference,
    getResolvedAccentColorSnapshot,
    getServerAccentColorSnapshot,
  );
  const pnlVisualEmphasis = useSyncExternalStore(
    subscribeToThemePreference,
    getResolvedPnlVisualEmphasis,
    getServerPnlVisualEmphasisSnapshot,
  );
  const accentColors = parseAccentColorSnapshot(accentColorSnapshot);

  function persistAccentColors(colors: AccentColors) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      ACCENT_COLORS_STORAGE_KEY,
      JSON.stringify(colors),
    );
    window.localStorage.removeItem(LEGACY_ACCENT_STORAGE_KEY);
    dispatchThemePreferenceChange();
  }

  function setTheme(nextTheme: Theme) {
    if (typeof document !== 'undefined') {
      applyTheme(nextTheme);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      dispatchThemePreferenceChange();
    }
  }

  function setAccentColors(nextColors: Partial<AccentColors>) {
    const normalizedColors = normalizeAccentColors({
      ...accentColors,
      ...nextColors,
    });

    if (typeof document !== 'undefined') {
      applyAccentColors(normalizedColors);
    }

    persistAccentColors(normalizedColors);
  }

  function resetAccentColors() {
    if (typeof document !== 'undefined') {
      applyAccentColors(DEFAULT_ACCENT_COLORS);
    }

    persistAccentColors(DEFAULT_ACCENT_COLORS);
  }

  function setPnlVisualEmphasis(enabled: boolean) {
    if (typeof document !== 'undefined') {
      applyPnlVisualEmphasis(enabled);
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        PNL_VISUAL_EMPHASIS_STORAGE_KEY,
        enabled ? 'on' : 'off',
      );
      dispatchThemePreferenceChange();
    }
  }

  const value: ThemeContextValue = {
    accentColors,
    pnlVisualEmphasis,
    resetAccentColors,
    setAccentColors,
    setPnlVisualEmphasis,
    setPrimaryAccentColor: (color: string) =>
      setAccentColors({ primary: color }),
    setSecondaryAccentColor: (color: string) =>
      setAccentColors({ secondary: color }),
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
