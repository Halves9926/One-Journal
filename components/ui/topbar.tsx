'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ButtonLink, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/components/ui/auth-provider';
import { cx } from '@/lib/utils';

const navigationItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trades/new', label: 'New Trade' },
  { href: '/settings', label: 'Settings' },
];

export default function Topbar() {
  const pathname = usePathname();
  const { loading, user } = useAuth();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl justify-center">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto flex w-full items-center justify-between rounded-[30px] border border-neutral-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(252,250,248,0.82))] px-4 py-3 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.22)] backdrop-blur-2xl sm:px-5"
        >
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-[linear-gradient(135deg,#9f1239,#7f1d1d)] text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(127,29,29,0.36)]">
              OJ
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold tracking-tight text-neutral-950">
                One Journal
              </span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                execution workspace
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navigationItems.map((item) => {
              const isProtected =
                item.href === '/dashboard' ||
                item.href === '/trades/new' ||
                item.href === '/settings';

              if (isProtected && !user) {
                return null;
              }

              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-[linear-gradient(135deg,#9f1239,#7f1d1d)] text-white shadow-[0_14px_30px_-20px_rgba(127,29,29,0.36)]'
                      : 'text-neutral-600 hover:bg-white hover:text-neutral-950',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-neutral-200 bg-white/80 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-500 md:inline-flex">
              {loading
                ? 'syncing'
                : user?.email
                  ? user.email
                  : 'account'}
            </span>
            {user ? (
              <ButtonLink href="/dashboard" size="sm" variant="secondary">
                Dashboard
              </ButtonLink>
            ) : (
              <Link
                href="/login"
                className={buttonVariants({ size: 'sm', variant: 'secondary' })}
              >
                Login
              </Link>
            )}
          </div>
        </motion.header>
      </div>
    </div>
  );
}
