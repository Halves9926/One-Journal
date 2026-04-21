'use client';

import Link from 'next/link';

import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import { useAccounts } from '@/components/ui/accounts-provider';
import type { AccountView } from '@/lib/accounts';
import { cx } from '@/lib/utils';

type AccountSwitcherProps = {
  variant?: 'default' | 'compact';
};

function getAccountStatusLabel(activeAccount: AccountView | null) {
  if (!activeAccount) {
    return 'No active account';
  }

  if (activeAccount.isFunded) {
    return 'Funded';
  }

  if (activeAccount.type === 'Propfirm Account') {
    return `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`;
  }

  return 'Active';
}

export default function AccountSwitcher({ variant = 'default' }: AccountSwitcherProps) {
  const { user } = useAuth();
  const { accounts, activeAccount, loading, setActiveAccount } = useAccounts();

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-11 min-w-0 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-4 text-sm text-[var(--muted)] shadow-[0_14px_28px_-24px_var(--shadow-color)]">
        <p className="truncate text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
          Account
        </p>
        <span className="ml-3 text-sm text-[var(--muted)]">Loading...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <ButtonLink
        href="/accounts/new"
        size="sm"
        variant="secondary"
        className="w-full sm:w-auto"
      >
        Create Account
      </ButtonLink>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="min-w-0 rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-2 shadow-[0_14px_30px_-26px_var(--shadow-color)]">
        <label className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span className="sr-only">Switch active account</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-4 text-[var(--foreground)]">
              {activeAccount?.name ?? 'Account'}
            </span>
            <span className="block truncate text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              {getAccountStatusLabel(activeAccount)}
            </span>
          </span>
          <span className="relative min-w-0">
            <select
              aria-label="Switch active account"
              className="h-8 max-w-[9.5rem] appearance-none rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] pl-3 pr-8 text-xs font-medium text-[var(--foreground)] outline-none transition focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
              value={activeAccount?.id ?? ''}
              onChange={(event) => {
                if (!event.target.value) {
                  return;
                }

                void setActiveAccount(event.target.value);
              }}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--muted)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M4.25 6.5 8 10.25 11.75 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        </label>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 xl:min-w-[290px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 sm:max-w-[220px]">
          <p className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
            {activeAccount?.name ?? 'Account'}
          </p>
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
            {activeAccount?.type ?? 'No active account'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={cx(
              'rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em]',
              activeAccount?.isFunded
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : activeAccount?.type === 'Propfirm Account'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted)]',
            )}
          >
            {activeAccount?.isFunded
              ? 'Funded'
              : activeAccount?.type === 'Propfirm Account'
                ? `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`
                : 'Active'}
          </span>
          <Link
            href="/accounts"
            className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            Manage
          </Link>
        </div>
      </div>

      <label className="block">
        <span className="sr-only">Switch active account</span>
        <div className="relative">
          <select
            value={activeAccount?.id ?? ''}
            onChange={(event) => {
              if (!event.target.value) {
                return;
              }

              void setActiveAccount(event.target.value);
            }}
            className="min-h-11 w-full appearance-none rounded-[16px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] shadow-[0_14px_28px_-24px_var(--shadow-color)] outline-none transition focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} - {account.type}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[var(--muted)]">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M4.25 6.5 8 10.25 11.75 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </label>
    </div>
  );
}
