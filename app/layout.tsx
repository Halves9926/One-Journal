import type { Metadata } from 'next';

import { fontMono, fontSans } from '@/app/fonts';
import { AuthProvider } from '@/components/ui/auth-provider';
import { TradePreferencesProvider } from '@/components/ui/trade-preferences-provider';
import Topbar from '@/components/ui/topbar';

import './globals.css';

export const metadata: Metadata = {
  title: 'One Journal',
  description: 'Trading workspace.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="min-h-screen bg-[#f8f5f2] font-sans text-neutral-900 antialiased">
        <AuthProvider>
          <TradePreferencesProvider>
            <Topbar />
            {children}
          </TradePreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
