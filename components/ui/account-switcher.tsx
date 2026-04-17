'use client';

import Link from 'next/link';

import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import { useAccounts } from '@/components/ui/accounts-provider';
import { cx } from '@/lib/utils';

export default function AccountSwitcher() {
  const { user } = useAuth();
  const { accounts, activeAccount, loading, setActiveAccount } = useAccounts();

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-11 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-4 text-sm text-[var(--muted)] shadow-[0_14px_28px_-24px_var(--shadow-color)]">
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
        <select
          value={activeAccount?.id ?? ''}
          onChange={(event) => {
            if (!event.target.value) {
              return;
            }

            void setActiveAccount(event.target.value);
          }}
          className="min-h-11 w-full rounded-[16px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[0_14px_28px_-24px_var(--shadow-color)] outline-none transition focus:border-rose-300/55 focus:ring-2 focus:ring-rose-300/18"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} - {account.type}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
