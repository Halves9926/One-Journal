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
    const storedTheme = window.localStorage.getItem('oj-theme');
    const storedAccentTheme = window.localStorage.getItem('oj-accent-theme');
    const preferredTheme =
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    const preferredAccentTheme =
      storedAccentTheme === 'red' ||
      storedAccentTheme === 'white' ||
      storedAccentTheme === 'pink'
        ? storedAccentTheme
        : 'red';
    const storedPnlVisualEmphasis = window.localStorage.getItem(
      'oj-pnl-visual-emphasis',
    );
    const preferredPnlVisualEmphasis =
      storedPnlVisualEmphasis === 'off' ? 'off' : 'on';
    const root = document.documentElement;
    root.dataset.theme = preferredTheme;
    root.dataset.accent = preferredAccentTheme;
    root.dataset.pnlVisualEmphasis = preferredPnlVisualEmphasis;
    root.style.colorScheme = preferredTheme;
    root.classList.toggle('dark', preferredTheme === 'dark');
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
      data-accent="red"
      data-pnl-visual-emphasis="on"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] antialiased">
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
