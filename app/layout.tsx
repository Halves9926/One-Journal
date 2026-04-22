import type { Metadata } from 'next';

import { AccountsProvider } from '@/components/ui/accounts-provider';
import { fontMono, fontSans } from '@/app/fonts';
import { AuthProvider } from '@/components/ui/auth-provider';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { TradePreferencesProvider } from '@/components/ui/trade-preferences-provider';
import Topbar from '@/components/ui/topbar';

import './globals.css';

export const metadata: Metadata = {
  title: 'One Journal',
  description: 'Trading workspace.',
};

const themeScript = `
(() => {
  try {
    const defaultAccentColors = {
      primary: '#9f1239',
      secondary: '#8a244a',
    };
    const legacyAccentColors = {
      pink: {
        primary: '#d9468a',
        secondary: '#8a244a',
      },
      red: defaultAccentColors,
      white: {
        primary: '#d4cdc3',
        secondary: '#8c857c',
      },
    };
    const isHexColor = (value) =>
      typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
    const normalizeHexColor = (value, fallback) =>
      isHexColor(value) ? value.trim().toLowerCase() : fallback;
    const normalizeAccentColors = (colors) => ({
      primary: normalizeHexColor(colors?.primary, defaultAccentColors.primary),
      secondary: normalizeHexColor(
        colors?.secondary,
        defaultAccentColors.secondary,
      ),
    });
    const readAccentColors = () => {
      const storedAccentColors = window.localStorage.getItem('oj-accent-colors');

      if (storedAccentColors) {
        try {
          return normalizeAccentColors(JSON.parse(storedAccentColors));
        } catch (_) {}
      }

      const storedAccentTheme = window.localStorage.getItem('oj-accent-theme');

      return legacyAccentColors[storedAccentTheme] || defaultAccentColors;
    };
    const hexToRgb = (hex) => {
      const value = Number.parseInt(
        normalizeHexColor(hex, defaultAccentColors.primary).slice(1),
        16,
      );

      return {
        b: value & 255,
        g: (value >> 8) & 255,
        r: (value >> 16) & 255,
      };
    };
    const getReadableTextColor = (hex) => {
      const { b, g, r } = hexToRgb(hex);
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      return luminance > 0.58 ? '#151821' : '#ffffff';
    };
    const applyAccentColors = (colors) => {
      const normalizedColors = normalizeAccentColors(colors);
      const tokens = {
        '--accent-primary': normalizedColors.primary,
        '--accent-secondary': normalizedColors.secondary,
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
        '--accent-button-text': getReadableTextColor(normalizedColors.primary),
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
        '--brand-mark-primary':
          'color-mix(in srgb, var(--accent-primary) 72%, var(--foreground))',
        '--brand-mark-secondary':
          'color-mix(in srgb, var(--accent-secondary) 64%, var(--accent-primary))',
        '--chart-accent': 'var(--accent-primary)',
        '--chart-accent-soft':
          'color-mix(in srgb, var(--accent-secondary) 22%, transparent)',
        '--chart-secondary': 'var(--accent-secondary)',
        '--ring': 'var(--accent-focus-ring)',
      };

      Object.entries(tokens).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    };
    const storedTheme = window.localStorage.getItem('oj-theme');
    const preferredTheme =
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    const storedPnlVisualEmphasis = window.localStorage.getItem(
      'oj-pnl-visual-emphasis',
    );
    const preferredPnlVisualEmphasis =
      storedPnlVisualEmphasis === 'off' ? 'off' : 'on';
    const root = document.documentElement;
    root.dataset.theme = preferredTheme;
    root.dataset.accent = 'custom';
    root.dataset.pnlVisualEmphasis = preferredPnlVisualEmphasis;
    root.style.colorScheme = preferredTheme;
    root.classList.toggle('dark', preferredTheme === 'dark');
    applyAccentColors(readAccentColors());
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      data-scroll-behavior="smooth"
      data-accent="custom"
      data-pnl-visual-emphasis="on"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans text-[var(--foreground)] antialiased">
        <ThemeProvider>
          <AuthProvider>
            <AccountsProvider>
              <TradePreferencesProvider>
                <Topbar />
                {children}
              </TradePreferencesProvider>
            </AccountsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
