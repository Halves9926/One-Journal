'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import AccountSwitcher from '@/components/ui/account-switcher';
import { useAccounts } from '@/components/ui/accounts-provider';
import { useAuth } from '@/components/ui/auth-provider';
import BrandMark from '@/components/ui/brand-mark';
import { ButtonLink, buttonVariants } from '@/components/ui/button';
import ThemeToggle from '@/components/ui/theme-toggle';
import {
  normalizeProfile,
  PROFILE_SELECT,
  PROFILES_TABLE,
} from '@/lib/profiles';
import type { ProfileRow } from '@/lib/supabase';
import { cx } from '@/lib/utils';

const PROFILE_CHANGE_EVENT = 'one-journal:profile-change';

const primaryNavigationItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/analyses', label: 'Analyses' },
];

const secondaryNavigationItems = [
  { href: '/accounts', label: 'Accounts' },
  { href: '/trades', label: 'Trades' },
  { href: '/trades/new', label: 'New Trade' },
  { href: '/profile', label: 'Profile' },
  { href: '/settings', label: 'Settings' },
];

const protectedHrefs = new Set([
  '/accounts',
  '/analyses',
  '/analytics',
  '/dashboard',
  '/profile',
  '/settings',
  '/trades',
  '/trades/new',
]);

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" strokeLinecap="round" />
      <path d="M4.25 17.25a5.75 5.75 0 0 1 11.5 0" strokeLinecap="round" />
    </svg>
  );
}

function isNavigationItemActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function getNavigationLinkClassName(pathname: string, href: string) {
  const isActive = isNavigationItemActive(pathname, href);

  return cx(
    'shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-[linear-gradient(135deg,var(--accent-gradient-start),var(--accent-gradient-end))] text-[var(--accent-button-text)] shadow-[0_14px_30px_-20px_var(--accent-button-shadow)]'
      : 'border border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
  );
}

export default function Topbar() {
  const pathname = usePathname();
  const { loading, supabase, user } = useAuth();
  const { activeAccount } = useAccounts();
  const topbarRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileIdentity, setProfileIdentity] = useState<{
    label: string | null;
    userId: string;
  } | null>(null);
  const primaryNavigation = useMemo(
    () =>
      primaryNavigationItems.filter(
        (item) => !protectedHrefs.has(item.href) || Boolean(user),
      ),
    [user],
  );
  const secondaryNavigation = useMemo(
    () =>
      secondaryNavigationItems.filter(
        (item) => !protectedHrefs.has(item.href) || Boolean(user),
      ),
    [user],
  );
  const menuNavigation = useMemo(
    () => [...primaryNavigation, ...secondaryNavigation],
    [primaryNavigation, secondaryNavigation],
  );
  const userLabel = loading
    ? 'Syncing'
    : user
      ? profileIdentity?.userId === user.id
        ? profileIdentity.label ?? activeAccount?.name ?? 'Profile'
        : activeAccount?.name ?? 'Profile'
      : 'Guest';
  const secondaryActive = secondaryNavigation.some((item) =>
    isNavigationItemActive(pathname, item.href),
  );

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

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    const currentSupabase = supabase;
    const currentUser = user;
    let ignore = false;

    async function loadProfileLabel() {
      const { data } = await currentSupabase
        .from(PROFILES_TABLE)
        .select(PROFILE_SELECT)
        .eq('user_id', currentUser.id)
        .limit(1)
        .overrideTypes<ProfileRow[], { merge: false }>();

      if (ignore) {
        return;
      }

      const profile = data?.[0] ? normalizeProfile(data[0], currentUser.id) : null;

      setProfileIdentity({
        label: profile?.displayName ?? profile?.username ?? null,
        userId: currentUser.id,
      });
    }

    void loadProfileLabel();

    function handleProfileChange() {
      void loadProfileLabel();
    }

    window.addEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);

    return () => {
      ignore = true;
      window.removeEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
    };
  }, [supabase, user]);

  if (pathname.startsWith('/share/')) {
    return null;
  }

  return (
    <div
      ref={topbarRef}
      className="one-journal-topbar pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5"
    >
      <div className="mx-auto flex max-w-7xl justify-center">
        <motion.header
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto w-full rounded-[28px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] px-3 py-3 shadow-[0_24px_68px_-42px_var(--shadow-color)] backdrop-blur-2xl sm:px-4"
          initial={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
              <span className="relative flex h-10 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-1.5 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.36)]">
                <BrandMark title="One Journal brand mark" />
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
                  One Journal
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  execution workspace
                </span>
              </span>
            </Link>

            <div className="flex min-w-0 shrink-0 items-center gap-2">
              {user ? (
                <Link
                  className="hidden max-w-[190px] items-center gap-2 rounded-[18px] border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-2.5 py-2 text-left shadow-[0_14px_30px_-26px_var(--accent-button-shadow)] transition hover:border-[color:var(--accent-border-strong)] lg:inline-flex"
                  href="/profile"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--accent-text)]">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      Profile
                    </span>
                    <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                      {userLabel}
                    </span>
                  </span>
                </Link>
              ) : null}
              <ThemeToggle />
              {user ? (
                <ButtonLink
                  className="hidden md:inline-flex"
                  href="/trades/new"
                  size="sm"
                  variant="primary"
                >
                  New Trade
                </ButtonLink>
              ) : (
                <Link
                  className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                  href="/login"
                >
                  Login
                </Link>
              )}
              {user ? (
                <button
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  className={cx(
                    'inline-flex h-11 w-11 items-center justify-center rounded-full border text-[var(--muted-strong)] transition hover:text-[var(--foreground)]',
                    menuOpen || secondaryActive
                      ? 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]'
                      : 'border-[color:var(--border-color)] bg-[var(--surface-raised)] hover:border-[color:var(--border-strong)]',
                  )}
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                >
                  {menuOpen ? (
                    <CloseIcon className="h-4 w-4" />
                  ) : (
                    <MenuIcon className="h-4 w-4" />
                  )}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 hidden min-w-0 grid-cols-[minmax(0,1fr)_minmax(220px,300px)] items-center gap-3 xl:grid">
            <nav className="flex min-w-0 flex-wrap items-center gap-2">
              {primaryNavigation.map((item) => (
                <Link
                  key={item.href}
                  className={getNavigationLinkClassName(pathname, item.href)}
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {user ? (
              <div className="min-w-0">
                <AccountSwitcher variant="compact" />
              </div>
            ) : null}
          </div>

          {menuOpen ? (
            <div className="mt-3 rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-3 shadow-[0_18px_42px_-34px_var(--shadow-color)]">
              {user ? (
                <div className="mb-3 xl:hidden">
                  <AccountSwitcher />
                </div>
              ) : null}
              <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {menuNavigation.map((item) => (
                  <Link
                    key={item.href}
                    className={getNavigationLinkClassName(pathname, item.href)}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </motion.header>
      </div>
    </div>
  );
}
