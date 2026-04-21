'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { EquitySparkline } from '@/components/ui/trade-charts';
import { Panel } from '@/components/ui/panel';
import WinRateWidget from '@/components/ui/win-rate-widget';
import type { WinRateWidgetVariant } from '@/components/ui/win-rate-widget';
import type { AccountMetrics, AccountView } from '@/lib/accounts';
import {
  formatCurrency,
  formatPnl,
  getPnlCardClassName,
  getPnlTextClassName,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type AccountCardProps = {
  account: AccountView;
  busyAction: string | null;
  editHref?: string;
  hasFallbackAccount?: boolean;
  linkedTradesCount?: number;
  metrics: AccountMetrics;
  onActivate: (accountId: string) => Promise<void>;
  onDelete?: (accountId: string) => Promise<{ error: string | null }>;
  onMarkFunded: (accountId: string) => Promise<void>;
  onMarkPhasePassed: (accountId: string) => Promise<void>;
  onOpenDashboard: (accountId: string) => Promise<void>;
  onStartNextPhase: (accountId: string) => Promise<void>;
  variant?: 'compact' | 'stacked';
  winRateVariant?: WinRateWidgetVariant;
};

function getStatusClassName(account: AccountView) {
  if (account.isFunded) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (account.type === 'Propfirm Account') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  return 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted)]';
}

export default function AccountCard({
  account,
  busyAction,
  editHref,
  hasFallbackAccount = false,
  linkedTradesCount = 0,
  metrics,
  onActivate,
  onDelete,
  onMarkFunded,
  onMarkPhasePassed,
  onOpenDashboard,
  onStartNextPhase,
  variant,
  winRateVariant = 'compact',
}: AccountCardProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isProp = account.type === 'Propfirm Account';
  const hasLinkedTrades = linkedTradesCount > 0;
  const displayEquity =
    isProp && account.phasesEnabled && !account.isFunded
      ? metrics.currentPhaseEquity
      : metrics.overallCurrentEquity;
  const showPassPhaseAction =
    isProp &&
    account.phasesEnabled &&
    !account.isFunded &&
    metrics.phaseTargetReached &&
    account.phaseStatus === 'active' &&
    account.currentPhase < account.phaseCount;
  const showNextPhaseAction =
    isProp &&
    account.phasesEnabled &&
    !account.isFunded &&
    account.phaseStatus === 'passed' &&
    account.currentPhase < account.phaseCount;
  const showFundedAction =
    isProp &&
    !account.isFunded &&
    ((account.phasesEnabled &&
      metrics.phaseTargetReached &&
      account.currentPhase >= account.phaseCount &&
      account.phaseStatus === 'active') ||
      (account.phaseStatus === 'passed' && account.currentPhase >= account.phaseCount));
  const deleteDescriptionParts = [
    hasLinkedTrades
      ? `Deleting this account will also permanently delete ${linkedTradesCount} linked ${
          linkedTradesCount === 1 ? 'trade' : 'trades'
        }.`
      : 'This removes the account workspace permanently.',
    account.isActive
      ? hasFallbackAccount
        ? 'The next available account will become active automatically.'
        : 'No active account will remain after deletion.'
      : null,
  ].filter((part): part is string => Boolean(part));

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    const result = await onDelete(account.id);

    if (result.error) {
      setActionError(result.error);
      setIsDeleting(false);
      return;
    }

    setIsDeleteConfirmOpen(false);
    setIsDeleting(false);
  }

  if (variant === 'compact') {
    return (
      <Panel
        className={cx(
          'px-4 py-3 transition duration-300 hover:border-[color:var(--accent-border-soft)]',
          getPnlCardClassName(metrics.summary.netPnl),
        )}
      >
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(140px,0.7fr)_minmax(130px,0.58fr)_auto] lg:items-center">
          <button
            className="min-w-0 rounded-[18px] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--accent-focus-ring)]"
            disabled={busyAction === `${account.id}:open`}
            type="button"
            onClick={() => {
              void onOpenDashboard(account.id);
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
                {account.name}
              </p>
              {account.isActive ? (
                <span className="shrink-0 rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[var(--accent-text)]">
                  Active
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {account.type}
            </p>
          </button>

          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1">
            <span className="truncate text-[var(--muted)]">
              Equity <span className="font-medium text-[var(--foreground)]">{formatCurrency(displayEquity)}</span>
            </span>
            <span className="truncate text-[var(--muted)]">
              Trades <span className="font-medium text-[var(--foreground)]">{metrics.summary.totalTrades}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-1 lg:text-right">
            <span
              className={cx(
                'font-semibold',
                getPnlTextClassName(metrics.summary.netPnl),
              )}
            >
              {formatPnl(metrics.summary.netPnl)}
            </span>
            <span className="text-[var(--muted)]">
              WR {metrics.summary.winRate === null ? 'New' : `${Math.round(metrics.summary.winRate)}%`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {editHref ? (
              <Link
                className="inline-flex min-h-8 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                href={editHref}
              >
                Edit
              </Link>
            ) : null}
            <Button
              disabled={
                account.isActive ||
                busyAction === `${account.id}:activate` ||
                busyAction === `${account.id}:open`
              }
              size="sm"
              type="button"
              variant={account.isActive ? 'secondary' : 'primary'}
              onClick={() => {
                void onActivate(account.id);
              }}
            >
              {account.isActive
                ? 'Active'
                : busyAction === `${account.id}:activate`
                  ? 'Switching'
                : 'Set Active'}
            </Button>
            {onDelete ? (
              <button
                className="inline-flex min-h-8 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 text-xs font-medium text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)]"
                type="button"
                onClick={() => {
                  setActionError(null);
                  setIsDeleteConfirmOpen((current) => !current);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>

        {onDelete && (isDeleteConfirmOpen || actionError) ? (
          <div className="mt-3 rounded-[18px] border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,transparent),var(--surface))] px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Delete this account?
                </p>
                {actionError ? (
                  <p className="mt-1 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setActionError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,black))] px-3 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>
    );
  }

  if (variant === 'stacked') {
    return (
      <Panel
        className={cx(
          'p-4 transition duration-300 hover:border-[color:var(--accent-border-soft)] sm:p-5',
          getPnlCardClassName(metrics.summary.netPnl),
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_minmax(220px,280px)] xl:items-stretch">
          <button
            className="min-w-0 rounded-[24px] border border-transparent p-1 text-left transition hover:border-[color:var(--accent-border-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-focus-ring)]"
            disabled={busyAction === `${account.id}:open`}
            type="button"
            onClick={() => {
              void onOpenDashboard(account.id);
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {account.isActive ? (
                <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--accent-text)]">
                  Active
                </span>
              ) : null}
              <span
                className={cx(
                  'rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em]',
                  getStatusClassName(account),
                )}
              >
                {account.isFunded
                  ? 'Funded'
                  : isProp
                    ? `Phase ${account.currentPhase}/${account.phaseCount}`
                    : 'Ready'}
              </span>
            </div>

            <p className="mt-4 truncate text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {account.name}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{account.type}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted-strong)]">
              <span>{linkedTradesCount} trades</span>
              <span
                className={cx(
                  getPnlTextClassName(metrics.summary.netPnl),
                )}
              >
                {formatPnl(metrics.summary.netPnl)}
              </span>
            </div>
          </button>

          <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4">
            <p className="text-sm text-[var(--muted)]">
              {isProp && account.phasesEnabled && !account.isFunded
                ? 'Phase equity'
                : 'Current equity'}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {formatCurrency(displayEquity)}
            </p>
            <div className="mt-4 h-20">
              <EquitySparkline trades={metrics.phaseTrades} className="h-full" />
            </div>
          </div>

          <WinRateWidget
            breakeven={metrics.summary.breakeven}
            caption={`${metrics.summary.totalTrades} trades`}
            className={winRateVariant === 'compact' ? 'min-h-[150px]' : 'min-h-[250px]'}
            losses={metrics.summary.losses}
            variant={winRateVariant}
            wins={metrics.summary.wins}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {editHref ? (
              <Link
                className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                href={editHref}
              >
                Edit
              </Link>
            ) : null}
            {onDelete ? (
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 text-sm font-medium text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)]"
                type="button"
                onClick={() => {
                  setActionError(null);
                  setIsDeleteConfirmOpen((current) => !current);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              disabled={
                account.isActive ||
                busyAction === `${account.id}:activate` ||
                busyAction === `${account.id}:open`
              }
              size="lg"
              type="button"
              variant={account.isActive ? 'secondary' : 'primary'}
              onClick={() => {
                void onActivate(account.id);
              }}
            >
              {account.isActive
                ? 'Active Account'
                : busyAction === `${account.id}:activate`
                  ? 'Switching...'
                  : 'Set Active'}
            </Button>
            {showPassPhaseAction ? (
              <Button
                disabled={busyAction === `${account.id}:pass`}
                size="lg"
                type="button"
                variant="secondary"
                onClick={() => {
                  void onMarkPhasePassed(account.id);
                }}
              >
                {busyAction === `${account.id}:pass` ? 'Updating...' : 'Pass Phase'}
              </Button>
            ) : null}
            {showNextPhaseAction ? (
              <Button
                disabled={busyAction === `${account.id}:next-phase`}
                size="lg"
                type="button"
                variant="secondary"
                onClick={() => {
                  void onStartNextPhase(account.id);
                }}
              >
                {busyAction === `${account.id}:next-phase`
                  ? 'Updating...'
                  : `Start Phase ${Math.min(account.currentPhase + 1, account.phaseCount)}`}
              </Button>
            ) : null}
            {showFundedAction ? (
              <Button
                disabled={busyAction === `${account.id}:funded`}
                size="lg"
                type="button"
                variant="secondary"
                onClick={() => {
                  void onMarkFunded(account.id);
                }}
              >
                {busyAction === `${account.id}:funded` ? 'Updating...' : 'Mark Funded'}
              </Button>
            ) : null}
          </div>
        </div>

        {onDelete && (isDeleteConfirmOpen || actionError) ? (
          <div className="mt-4 rounded-[24px] border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,transparent),var(--surface))] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Delete this account?
                </p>
                <div className="mt-1 space-y-1">
                  {deleteDescriptionParts.map((part, index) => (
                    <p key={`${part}-${index}`} className="text-sm leading-6 text-[var(--muted)]">
                      {part}
                    </p>
                  ))}
                </div>
                {actionError ? (
                  <p className="mt-2 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setActionError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,black))] px-4 text-sm font-medium text-white shadow-[0_20px_42px_-28px_color-mix(in_srgb,var(--danger)_40%,transparent)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>
    );
  }

  return (
    <Panel
      className={cx(
        'h-full p-6 transition duration-300 hover:border-[color:var(--accent-border-soft)] hover:shadow-[0_38px_82px_-44px_var(--shadow-color)] sm:p-7',
        getPnlCardClassName(metrics.summary.netPnl),
      )}
    >
      <div className="flex h-full flex-col gap-5">
        <button
          type="button"
          disabled={busyAction === `${account.id}:open`}
          onClick={() => {
            void onOpenDashboard(account.id);
          }}
          className="group/card flex flex-1 flex-col gap-5 rounded-[28px] border border-transparent p-1.5 text-left outline-none transition hover:border-[color:var(--accent-border-soft)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-focus-ring)] disabled:cursor-wait"
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0 pr-1">
              <p className="truncate text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {account.name}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{account.type}</p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)] transition group-hover/card:text-[var(--muted-strong)]">
                Open account dashboard
                <span className="text-sm transition group-hover/card:translate-x-0.5">{'->'}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {account.isActive ? (
                <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
                  Active
                </span>
              ) : null}
              <span
                className={cx(
                  'rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em]',
                  getStatusClassName(account),
                )}
              >
                {account.isFunded
                  ? 'Funded'
                  : isProp
                    ? `Phase ${account.currentPhase}/${account.phaseCount}`
                    : 'Ready'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_172px]">
            <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-4 shadow-[0_20px_40px_-32px_var(--shadow-color)] transition duration-300 group-hover/card:border-[color:var(--border-strong)] group-hover/card:shadow-[0_24px_48px_-32px_var(--shadow-color)]">
              <p className="text-sm text-[var(--muted)]">
                {isProp && account.phasesEnabled && !account.isFunded
                  ? 'Phase equity'
                  : 'Current equity'}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {formatCurrency(displayEquity)}
              </p>
              <p
                className={cx(
                  'mt-2 text-sm',
                  getPnlTextClassName(metrics.summary.netPnl),
                )}
              >
                Net PnL {formatPnl(metrics.summary.netPnl)}
              </p>
            </div>

            <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-4 transition duration-300 group-hover/card:border-[color:var(--border-strong)]">
              <p className="text-sm text-[var(--muted)]">Win rate</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {metrics.summary.winRate === null
                  ? 'No trades yet'
                  : `${Math.round(metrics.summary.winRate)}%`}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {metrics.summary.totalTrades} trades
              </p>
            </div>
          </div>

          <div className="h-28">
            <EquitySparkline trades={metrics.phaseTrades} className="h-full" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
              <p className="text-sm text-[var(--muted)]">Best trade</p>
              <p
                className={cx(
                  'mt-2 text-lg font-semibold text-[var(--foreground)]',
                  getPnlTextClassName(metrics.summary.bestTrade),
                )}
              >
                {metrics.summary.bestTrade === null
                  ? 'No trades yet'
                  : formatPnl(metrics.summary.bestTrade)}
              </p>
            </div>
            <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
              <p className="text-sm text-[var(--muted)]">Worst trade</p>
              <p
                className={cx(
                  'mt-2 text-lg font-semibold text-[var(--foreground)]',
                  getPnlTextClassName(metrics.summary.worstTrade),
                )}
              >
                {metrics.summary.worstTrade === null
                  ? 'No trades yet'
                  : formatPnl(metrics.summary.worstTrade)}
              </p>
            </div>
            <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
              <p className="text-sm text-[var(--muted)]">
                {isProp ? 'Target remaining' : 'Drawdown'}
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {isProp && account.phasesEnabled
                  ? account.isFunded
                    ? 'Funded'
                    : metrics.phaseTargetRemaining !== null
                      ? formatCurrency(metrics.phaseTargetRemaining)
                      : 'No target'
                  : formatCurrency(metrics.currentDrawdown)}
              </p>
            </div>
          </div>

          {isProp ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-3">
                <p className="text-sm text-[var(--muted)]">Phase state</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {account.isFunded ? 'Funded' : account.phaseStatus}
                </p>
              </div>
              <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-3">
                <p className="text-sm text-[var(--muted)]">Phase PnL</p>
                <p
                  className={cx(
                    'mt-2 text-lg font-semibold text-[var(--foreground)]',
                    getPnlTextClassName(metrics.currentPhaseNetPnl),
                  )}
                >
                  {formatPnl(metrics.currentPhaseNetPnl)}
                </p>
              </div>
              {account.maxDrawdown !== null ? (
                <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-3">
                  <p className="text-sm text-[var(--muted)]">Max drawdown rule</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {formatCurrency(account.maxDrawdown)}
                  </p>
                </div>
              ) : null}
              {account.dailyDrawdownMax !== null ? (
                <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-3">
                  <p className="text-sm text-[var(--muted)]">Daily drawdown rule</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    {formatCurrency(account.dailyDrawdownMax)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </button>

        <div className="mt-auto space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {editHref ? (
                <Link
                  href={editHref}
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                >
                  Edit
                </Link>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setIsDeleteConfirmOpen((current) => !current);
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 text-sm font-medium text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--danger)_14%,transparent)]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4.75 6h10.5" strokeLinecap="round" />
                    <path d="M8 6V4.75h4V6" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d="M6.25 6l.6 8.02a1 1 0 0 0 1 .93h4.3a1 1 0 0 0 1-.93L13.75 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Delete
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant={account.isActive ? 'secondary' : 'primary'}
                size="lg"
                disabled={
                  account.isActive ||
                  busyAction === `${account.id}:activate` ||
                  busyAction === `${account.id}:open`
                }
                onClick={() => {
                  void onActivate(account.id);
                }}
              >
                {account.isActive
                  ? 'Active Account'
                  : busyAction === `${account.id}:activate`
                    ? 'Switching...'
                    : 'Set Active'}
              </Button>

              {showPassPhaseAction ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={busyAction === `${account.id}:pass`}
                  onClick={() => {
                    void onMarkPhasePassed(account.id);
                  }}
                >
                  {busyAction === `${account.id}:pass` ? 'Updating...' : 'Pass Phase'}
                </Button>
              ) : null}

              {showNextPhaseAction ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={busyAction === `${account.id}:next-phase`}
                  onClick={() => {
                    void onStartNextPhase(account.id);
                  }}
                >
                  {busyAction === `${account.id}:next-phase`
                    ? 'Updating...'
                    : `Start Phase ${Math.min(account.currentPhase + 1, account.phaseCount)}`}
                </Button>
              ) : null}

              {showFundedAction ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={busyAction === `${account.id}:funded`}
                  onClick={() => {
                    void onMarkFunded(account.id);
                  }}
                >
                  {busyAction === `${account.id}:funded` ? 'Updating...' : 'Mark Funded'}
                </Button>
              ) : null}
            </div>
          </div>

          {onDelete && (isDeleteConfirmOpen || actionError) ? (
            <div className="rounded-[24px] border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,transparent),var(--surface))] px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Delete this account?
                  </p>
                  <div className="mt-1 space-y-1">
                    {deleteDescriptionParts.map((part, index) => (
                      <p key={`${part}-${index}`} className="text-sm leading-6 text-[var(--muted)]">
                        {part}
                      </p>
                    ))}
                  </div>
                  {actionError ? (
                    <p className="mt-2 text-sm text-[var(--danger)]">{actionError}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      setActionError(null);
                    }}
                    className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      void handleDelete();
                    }}
                    className="inline-flex min-h-10 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,black))] px-4 text-sm font-medium text-white shadow-[0_20px_42px_-28px_color-mix(in_srgb,var(--danger)_40%,transparent)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
