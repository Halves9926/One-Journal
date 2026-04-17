'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import AccountSwitcher from '@/components/ui/account-switcher';
import { ButtonLink, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/components/ui/auth-provider';
import ThemeToggle from '@/components/ui/theme-toggle';
import { cx } from '@/lib/utils';

const navigationItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/trades/new', label: 'New Trade' },
  { href: '/settings', label: 'Settings' },
];

export default function Topbar() {
  const pathname = usePathname();
  const { loading, user } = useAuth();
  const navigation = navigationItems.filter((item) => {
    const isProtected =
      item.href === '/dashboard' ||
      item.href === '/accounts' ||
      item.href === '/trades/new' ||
      item.href === '/settings';

    return !isProtected || Boolean(user);
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex max-w-7xl justify-center">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto w-full rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] px-4 py-3.5 shadow-[0_28px_76px_-42px_var(--shadow-color)] backdrop-blur-2xl sm:px-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200/40 bg-[linear-gradient(135deg,#9f1239,#7f1d1d)] text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(127,29,29,0.36)]">
                OJ
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

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      ? 'bg-[linear-gradient(135deg,#9f1239,#7f1d1d)] text-white shadow-[0_14px_30px_-20px_rgba(127,29,29,0.36)]'
                      : 'border border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--muted-strong)] hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {user ? (
            <div className="mt-4">
              <AccountSwitcher />
            </div>
          ) : null}
        </motion.header>
      </div>
    </div>
  );
}
