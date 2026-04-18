'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import AccountSwitcher from '@/components/ui/account-switcher';
import { ButtonLink, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/components/ui/auth-provider';
import ThemeToggle from '@/components/ui/theme-toggle';
import { cx } from '@/lib/utils';

const navigationItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/analyses', label: 'Analyses' },
  { href: '/trades/new', label: 'New Trade' },
  { href: '/settings', label: 'Settings' },
];

export default function Topbar() {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const navigation = navigationItems.filter((item) => {
    const isProtected =
      item.href === '/dashboard' ||
      item.href === '/analytics' ||
      item.href === '/accounts' ||
      item.href === '/analyses' ||
      item.href === '/trades/new' ||
      item.href === '/settings';

    return !isProtected || Boolean(user);
  });

  useEffect(() => {
    const topbarElement = topbarRef.current;

    if (!topbarElement || typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const updateOffset = () => {
      const topbarHeight = Math.ceil(topbarElement.getBoundingClientRect().height);
      root.style.setProperty('--topbar-offset', `${topbarHeight}px`);
    };

    updateOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateOffset();
    });

    resizeObserver.observe(topbarElement);
    window.addEventListener('resize', updateOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, []);

  return (
    <div
      ref={topbarRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5"
    >
      <div className="mx-auto flex max-w-7xl justify-center">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto w-full rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] px-4 py-3.5 shadow-[0_28px_76px_-42px_var(--shadow-color)] backdrop-blur-2xl sm:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[#0f1013] shadow-[0_18px_30px_-22px_rgba(15,23,42,0.36)]">
                <Image
                  src="/brand/one-journal-mark.png"
                  alt="One Journal brand mark"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain p-1.5"
                  sizes="44px"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
                  One Journal
                </span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                  execution workspace
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)] xl:inline-flex">
                {loading ? 'syncing' : user?.email ? user.email : 'guest mode'}
              </span>
              <ThemeToggle />
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
          </div>

          <div
            className={cx(
              'mt-4 flex flex-col gap-3',
              user && 'xl:flex-row xl:items-end xl:justify-between',
            )}
          >
            <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:flex-1">
              {navigation.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      'shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-[linear-gradient(135deg,var(--accent-gradient-start),var(--accent-gradient-end))] text-[var(--accent-button-text)] shadow-[0_14px_30px_-20px_var(--accent-button-shadow)]'
                        : 'border border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {user ? (
              <div className="xl:w-[312px] xl:flex-none">
                <AccountSwitcher />
              </div>
            ) : null}
          </div>
        </motion.header>
      </div>
    </div>
  );
}
