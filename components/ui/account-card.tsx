'use client';

import { Button } from '@/components/ui/button';
import { EquitySparkline } from '@/components/ui/trade-charts';
import { Panel } from '@/components/ui/panel';
import type { AccountMetrics, AccountView } from '@/lib/accounts';
import { formatCompactNumber, formatSignedNumber } from '@/lib/trades';
import { cx } from '@/lib/utils';

type AccountCardProps = {
  account: AccountView;
  busyAction: string | null;
  metrics: AccountMetrics;
  onActivate: (accountId: string) => Promise<void>;
  onMarkFunded: (accountId: string) => Promise<void>;
  onMarkPhasePassed: (accountId: string) => Promise<void>;
  onStartNextPhase: (accountId: string) => Promise<void>;
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
  metrics,
  onActivate,
  onMarkFunded,
  onMarkPhasePassed,
  onStartNextPhase,
}: AccountCardProps) {
  const isProp = account.type === 'Propfirm Account';
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

  return (
    <Panel className="h-full p-6 sm:p-7">
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {account.name}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{account.type}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {account.isActive ? (
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-rose-700 dark:text-rose-200">
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

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-4 shadow-[0_20px_40px_-32px_var(--shadow-color)]">
            <p className="text-sm text-[var(--muted)]">
              {isProp && account.phasesEnabled && !account.isFunded
                ? 'Phase equity'
                : 'Current equity'}
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {formatCompactNumber(displayEquity)}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Net PnL {formatSignedNumber(metrics.summary.netPnl)}
            </p>
          </div>

          <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-4">
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

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">Best trade</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {metrics.summary.bestTrade === null
                ? 'No trades yet'
                : formatSignedNumber(metrics.summary.bestTrade)}
            </p>
          </div>
          <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">Worst trade</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {metrics.summary.worstTrade === null
                ? 'No trades yet'
                : formatSignedNumber(metrics.summary.worstTrade)}
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
                    ? formatCompactNumber(metrics.phaseTargetRemaining)
                    : 'No target'
                : formatCompactNumber(metrics.currentDrawdown)}
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
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {formatSignedNumber(metrics.currentPhaseNetPnl)}
              </p>
            </div>
            {account.maxDrawdown !== null ? (
              <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-3">
                <p className="text-sm text-[var(--muted)]">Max drawdown rule</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {formatCompactNumber(account.maxDrawdown)}
                </p>
              </div>
            ) : null}
            {account.dailyDrawdownMax !== null ? (
              <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-3">
                <p className="text-sm text-[var(--muted)]">Daily drawdown rule</p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  {formatCompactNumber(account.dailyDrawdownMax)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant={account.isActive ? 'secondary' : 'primary'}
            size="lg"
            disabled={account.isActive || busyAction === `${account.id}:activate`}
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
    </Panel>
  );
}
