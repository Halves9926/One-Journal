'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import {
  EquityCurveCard,
  EquitySparkline,
  PnlBarsCard,
  WinLossCard,
} from '@/components/ui/trade-charts';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import TradeCard from '@/components/ui/trade-card';
import { useUserTrades } from '@/components/ui/use-user-trades';
import {
  buildAccountMetrics,
  isPropAccount,
} from '@/lib/accounts';
import {
  buildTradeSummary,
  formatCompactNumber,
  formatPercentValue,
  formatSignedNumber,
} from '@/lib/trades';

function getStreakLabel(
  direction: 'flat' | 'loss' | 'win' | null,
  streak: number,
) {
  if (!direction || streak === 0) {
    return 'No streak yet';
  }

  if (direction === 'win') {
    return `${streak} trade win streak`;
  }

  if (direction === 'loss') {
    return `${streak} trade loss streak`;
  }

  return `${streak} flat trades`;
}

function renderDistributionWidth(value: number, total: number) {
  if (total <= 0 || value <= 0) {
    return '0%';
  }

  return `${Math.max((value / total) * 100, 8)}%`;
}

export default function DashboardView() {
  const router = useRouter();
  const { loading: authLoading, supabase, user } = useAuth();
  const {
    activeAccount,
    accounts,
    error: accountsError,
    loading: accountsLoading,
  } = useAccounts();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const tradesState = useUserTrades({
    accountId: activeAccount?.id ?? null,
    enabled: Boolean(user && activeAccount),
    limit: 24,
  });
  const accountMetrics = useMemo(
    () =>
      activeAccount ? buildAccountMetrics(activeAccount, tradesState.items) : null,
    [activeAccount, tradesState.items],
  );
  const summary = accountMetrics?.summary ?? buildTradeSummary([]);
  const recentTrades = tradesState.items.slice(0, 7);
  const directionalTotal = summary.longCount + summary.shortCount;
  const currentEquity =
    activeAccount && accountMetrics
      ? isPropAccount(activeAccount) &&
        activeAccount.phasesEnabled &&
        !activeAccount.isFunded
        ? accountMetrics.currentPhaseEquity
        : accountMetrics.overallCurrentEquity
      : null;
  const metricCards = activeAccount
    ? [
        {
          caption: 'active account balance',
          label: 'Current equity',
          tone: 'accent' as const,
          value:
            currentEquity === null
              ? formatCompactNumber(activeAccount.initialEquity)
              : formatCompactNumber(currentEquity),
        },
        {
          caption: 'aggregate result on this account',
          label: 'Net PnL',
          tone: summary.netPnl < 0 ? ('danger' as const) : ('accent' as const),
          value: formatSignedNumber(summary.netPnl),
        },
        {
          caption: `${summary.wins} wins / ${summary.losses} losses`,
          label: 'Win rate',
          tone: 'success' as const,
          value:
            summary.winRate === null ? 'No trades yet' : `${Math.round(summary.winRate)}%`,
        },
        {
          caption: 'risk to reward captured',
          label: 'Average RR',
          tone: 'neutral' as const,
          value:
            summary.avgRr === null
              ? 'Not enough history'
              : formatCompactNumber(summary.avgRr),
        },
        {
          caption: 'observed from account equity path',
          label: 'Drawdown',
          tone: accountMetrics && accountMetrics.currentDrawdown > 0
            ? ('danger' as const)
            : ('neutral' as const),
          value:
            accountMetrics === null
              ? 'No trades yet'
              : formatCompactNumber(accountMetrics.currentDrawdown),
        },
        {
          caption:
            isPropAccount(activeAccount) && activeAccount.phasesEnabled
              ? activeAccount.isFunded
                ? 'account already funded'
                : 'remaining to phase target'
              : 'average positive outcome',
          label:
            isPropAccount(activeAccount) && activeAccount.phasesEnabled
              ? 'Phase target'
              : 'Average win',
          tone:
            isPropAccount(activeAccount) && activeAccount.phasesEnabled
              ? ('accent' as const)
              : ('success' as const),
          value:
            isPropAccount(activeAccount) && activeAccount.phasesEnabled
              ? activeAccount.isFunded
                ? 'Funded'
                : accountMetrics && accountMetrics.phaseTargetRemaining !== null
                  ? formatCompactNumber(accountMetrics.phaseTargetRemaining)
                  : 'No target'
              : summary.avgWin === null
                ? 'No winning trades yet'
                : formatSignedNumber(summary.avgWin),
        },
      ]
    : [];
  const snapshotItems = activeAccount
    ? [
        {
          label: 'Account type',
          value: activeAccount.type,
        },
        {
          label: 'Initial equity',
          value: formatCompactNumber(activeAccount.initialEquity),
        },
        summary.bestTrade !== null
          ? { label: 'Best trade', value: formatSignedNumber(summary.bestTrade) }
          : null,
        summary.worstTrade !== null
          ? { label: 'Worst trade', value: formatSignedNumber(summary.worstTrade) }
          : null,
        summary.profitFactor !== null
          ? { label: 'Profit factor', value: formatCompactNumber(summary.profitFactor, 2) }
          : null,
        summary.screenshotRate !== null
          ? {
              label: 'Screenshot coverage',
              value: `${Math.round(summary.screenshotRate)}%`,
            }
          : null,
      ].filter((item): item is { label: string; value: string } => Boolean(item))
    : [];

  async function handleLogout() {
    if (!supabase) {
      setLogoutError('Supabase client unavailable.');
      return;
    }

    setLogoutError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutError(error.message);
      return;
    }

    router.replace('/login');
  }

  if (authLoading || !supabase || accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">
            {accountsLoading ? 'Loading active account...' : 'Loading session...'}
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Dashboard locked"
          description="Sign in to open the workspace."
        />
      </PageShell>
    );
  }

  if (!activeAccount) {
    return (
      <PageShell size="wide">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8">
            <PanelHeader
              eyebrow="accounts"
              title="Create an account before trading"
              description="Dashboard is now account-aware. Create the first account to unlock isolated metrics, charts and trade capture."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/accounts/new" size="lg" variant="primary">
                    New Account
                  </ButtonLink>
                  <ButtonLink href="/accounts" size="lg" variant="secondary">
                    Open Accounts
                  </ButtonLink>
                </div>
              }
            />
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              {accountsError ? (
                <MessageBanner message={accountsError} tone="error" />
              ) : (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  No active account yet. Create one and the dashboard will switch to that account automatically.
                </div>
              )}
            </div>
          </Panel>
        </Reveal>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px] xl:items-stretch">
              <div className="flex flex-col justify-between gap-6">
                <div className="max-w-3xl">
                  <span className="inline-flex items-center rounded-full border border-rose-500/18 bg-rose-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.32em] text-rose-700 dark:text-rose-200">
                    account dashboard
                  </span>
                  <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
                    {activeAccount.name}
                  </h1>
                  <p className="mt-3 text-sm uppercase tracking-[0.28em] text-[var(--muted)]">
                    {activeAccount.type}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--muted-strong)]">
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      {accounts.length} account{accounts.length === 1 ? '' : 's'}
                    </span>
                    {summary.bestSymbol ? (
                      <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                        Focus symbol {summary.bestSymbol}
                      </span>
                    ) : null}
                    {summary.recentWindowNetPnl !== null ? (
                      <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                        Last 5 {formatSignedNumber(summary.recentWindowNetPnl)}
                      </span>
                    ) : null}
                    {isPropAccount(activeAccount) ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-300">
                        {activeAccount.isFunded
                          ? 'Funded'
                          : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <ButtonLink href="/trades/new" size="lg" variant="primary">
                    New Trade
                  </ButtonLink>
                  <ButtonLink href="/accounts" size="lg" variant="secondary">
                    Accounts
                  </ButtonLink>
                  <ButtonLink href="/settings" size="lg" variant="ghost">
                    Settings
                  </ButtonLink>
                  <Button type="button" size="lg" variant="ghost" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>

              <div className="rounded-[30px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_22px_48px_-34px_var(--shadow-color)]">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                        {isPropAccount(activeAccount) &&
                        activeAccount.phasesEnabled &&
                        !activeAccount.isFunded
                          ? 'Phase pulse'
                          : 'Session pulse'}
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                        {currentEquity === null
                          ? formatCompactNumber(activeAccount.initialEquity)
                          : formatCompactNumber(currentEquity)}
                      </p>
                    </div>
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
                      {getStreakLabel(
                        summary.currentStreakDirection,
                        summary.currentStreak,
                      )}
                    </span>
                  </div>

                  <div className="h-28">
                    <EquitySparkline trades={tradesState.items} className="h-full" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                      <p className="text-sm text-[var(--muted)]">Profit factor</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {summary.profitFactor === null
                          ? 'Not enough history'
                          : formatCompactNumber(summary.profitFactor, 2)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                      <p className="text-sm text-[var(--muted)]">Peak equity</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {accountMetrics === null
                          ? formatCompactNumber(activeAccount.initialEquity)
                          : formatCompactNumber(accountMetrics.peakEquity)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 sm:col-span-2">
                      <p className="text-sm text-[var(--muted)]">
                        {isPropAccount(activeAccount) && activeAccount.phasesEnabled
                          ? 'Phase status'
                          : 'Latest screenshot-ready trade'}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {isPropAccount(activeAccount) && activeAccount.phasesEnabled
                          ? activeAccount.isFunded
                            ? 'Funded account'
                            : accountMetrics &&
                                accountMetrics.phaseTargetRemaining !== null
                              ? `Target remaining ${formatCompactNumber(accountMetrics.phaseTargetRemaining)}`
                              : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`
                          : summary.latestTradeWithScreenshot?.symbol ?? 'No screenshots yet'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {accountsError ? (
              <div className="mt-5">
                <MessageBanner message={accountsError} tone="error" />
              </div>
            ) : null}

            {logoutError ? (
              <div className="mt-5">
                <MessageBanner message={logoutError} tone="error" />
              </div>
            ) : null}
          </Panel>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card, index) => (
            <Reveal key={card.label} delay={index * 0.04}>
              <MetricCard
                label={card.label}
                value={card.value}
                tone={card.tone}
                caption={card.caption}
              />
            </Reveal>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.42fr)_360px]">
          <div className="grid gap-6">
            <Reveal delay={0.04}>
              <EquityCurveCard trades={tradesState.items} />
            </Reveal>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_0.92fr]">
              <Reveal delay={0.08}>
                <PnlBarsCard trades={tradesState.items} />
              </Reveal>

              <Reveal delay={0.12}>
                <Panel className="p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                    Snapshot
                  </p>

                  {snapshotItems.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {snapshotItems.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-4 shadow-[0_18px_36px_-30px_var(--shadow-color)]"
                        >
                          <p className="text-sm text-[var(--muted)]">{item.label}</p>
                          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[24px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                      Save a few trades to unlock a more detailed snapshot.
                    </div>
                  )}

                  {isPropAccount(activeAccount) ? (
                    <div className="mt-5 grid gap-3">
                      <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                        <p className="text-sm text-[var(--muted)]">Current phase</p>
                        <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                          {activeAccount.isFunded
                            ? 'Funded'
                            : `${activeAccount.currentPhase} / ${activeAccount.phaseCount}`}
                        </p>
                      </div>
                      {activeAccount.maxDrawdown !== null ? (
                        <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                          <p className="text-sm text-[var(--muted)]">Max drawdown rule</p>
                          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                            {formatCompactNumber(activeAccount.maxDrawdown)}
                          </p>
                        </div>
                      ) : null}
                      {activeAccount.dailyDrawdownMax !== null ? (
                        <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                          <p className="text-sm text-[var(--muted)]">Daily drawdown rule</p>
                          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                            {formatCompactNumber(activeAccount.dailyDrawdownMax)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : directionalTotal > 0 ? (
                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
                          <span>Long flow</span>
                          <span>{summary.longCount}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--surface-soft)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--chart-positive),var(--chart-accent))]"
                            style={{
                              width: renderDistributionWidth(summary.longCount, directionalTotal),
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
                          <span>Short flow</span>
                          <span>{summary.shortCount}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--surface-soft)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--chart-negative),var(--chart-accent))]"
                            style={{
                              width: renderDistributionWidth(summary.shortCount, directionalTotal),
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </Panel>
              </Reveal>
            </div>

            <Reveal delay={0.16}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="recent trades"
                  title="Execution recap"
                  description="Featured trade first, compact cards after. Screenshots stay embedded when available."
                  action={
                    <div className="flex items-center gap-3">
                      <span className="hidden text-sm text-[var(--muted)] sm:inline">
                        Showing {recentTrades.length} recent trades
                      </span>
                      <ButtonLink href="/trades/new" variant="secondary">
                        Add Trade
                      </ButtonLink>
                    </div>
                  }
                />

                <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
                  {tradesState.loading ? (
                    <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                      Loading trades...
                    </div>
                  ) : null}

                  {tradesState.error ? (
                    <MessageBanner
                      message={`Trades query error: ${tradesState.error}`}
                      tone="error"
                    />
                  ) : null}

                  {!tradesState.loading &&
                  !tradesState.error &&
                  recentTrades.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                      No trades yet for this account. Save one and the execution recap will build itself.
                    </div>
                  ) : null}

                  {!tradesState.loading &&
                  !tradesState.error &&
                  recentTrades.length > 0 ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {recentTrades.map((trade, index) => (
                        <TradeCard
                          key={trade.id}
                          trade={trade}
                          index={index}
                          featured={index === 0}
                          compact={index > 0}
                          className={index === 0 ? 'xl:col-span-2' : ''}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </Panel>
            </Reveal>
          </div>

          <div className="grid gap-6 xl:sticky xl:top-36 xl:self-start">
            <Reveal delay={0.1}>
              <WinLossCard
                wins={summary.wins}
                losses={summary.losses}
                breakeven={summary.breakeven}
              />
            </Reveal>

            <Reveal delay={0.14}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                  Execution profile
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Recent symbol</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {summary.recentSymbol ?? 'No trades yet'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Average risk</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {summary.riskAverage === null
                        ? 'Not tracked yet'
                        : formatPercentValue(summary.riskAverage)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Max observed drawdown</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                      {accountMetrics === null
                        ? 'No trades yet'
                        : formatCompactNumber(accountMetrics.maxObservedDrawdown)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <ButtonLink href="/trades/new" variant="primary" size="lg">
                    Capture Trade
                  </ButtonLink>
                  <ButtonLink href="/accounts" variant="secondary" size="lg">
                    Manage Accounts
                  </ButtonLink>
                  <Link
                    href="/"
                    className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Back home
                  </Link>
                </div>
              </Panel>
            </Reveal>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
