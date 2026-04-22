'use client';

import { useMemo, type ReactNode } from 'react';
import Image from 'next/image';

import { useAccounts } from '@/components/ui/accounts-provider';
import { useAuth } from '@/components/ui/auth-provider';
import BrandMark from '@/components/ui/brand-mark';
import { ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import { HomeLayoutWorkspace } from '@/components/ui/home-layout-workspace';
import { useListViewPreferences } from '@/components/ui/list-view-preferences';
import PageShell from '@/components/ui/page-shell';
import { EquitySparkline } from '@/components/ui/trade-charts';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useUserTrades } from '@/components/ui/use-user-trades';
import {
  buildAccountMetrics as getAccountMetrics,
  isPropAccount,
} from '@/lib/accounts';
import {
  buildTradeSummary,
  formatCurrency,
  formatPnl,
  formatPercentValue,
  formatTradeDate,
  getPnlBadgeClassName,
  getPnlCardClassName,
  getPnlTextClassName,
  type TradeView,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

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

  return `${streak} breakeven trades`;
}

function getAccountContextLabel() {
  return 'Account overview';
}

function buildMomentumBars(trades: TradeView[], limit = 8) {
  const recentValues = trades
    .slice(0, limit)
    .reverse()
    .map((trade, index) => ({
      id: `${trade.id}-${index}`,
      value: trade.pnl ?? 0,
    }));
  const maxMagnitude = Math.max(
    1,
    ...recentValues.map((entry) => Math.abs(entry.value)),
  );

  return recentValues.map((entry) => ({
    ...entry,
    heightPercent:
      entry.value === 0
        ? 14
        : Math.max((Math.abs(entry.value) / maxMagnitude) * 100, 22),
  }));
}

function HeroBrandBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-3 rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1.5">
      <span className="relative flex h-8 w-11 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-raised)] px-1.5 shadow-[0_12px_22px_-18px_rgba(15,23,42,0.34)]">
        <BrandMark />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
        {label}
      </span>
    </span>
  );
}

function HeroBannerCard({
  alt,
  children,
}: {
  alt: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] shadow-[0_22px_48px_-34px_var(--shadow-color)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src="/brand/one-journal-hero-banner.png"
          alt={alt}
          fill
          preload
          sizes="(max-width: 1280px) 100vw, 380px"
          className="object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,12,0.04),rgba(9,10,12,0.16))]" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function HomeView() {
  const { supabase, user } = useAuth();
  const {
    activeAccount,
    accounts,
    error: accountsError,
    loading: accountsLoading,
    refreshAccounts,
  } = useAccounts();
  const tradesState = useUserTrades({
    accountId: activeAccount?.id ?? null,
    enabled: Boolean(user && activeAccount),
    limit: 24,
  });
  const { preferences: listViewPreferences } = useListViewPreferences();
  const accountMetrics = useMemo(
    () =>
      activeAccount ? getAccountMetrics(activeAccount, tradesState.items) : null,
    [activeAccount, tradesState.items],
  );
  const summary = accountMetrics?.summary ?? buildTradeSummary([]);
  const tradeListMode = listViewPreferences.trades;
  const recentTrades =
    tradeListMode === 'calendar' ? tradesState.items : tradesState.items.slice(0, 4);
  const displayEquity =
    activeAccount && accountMetrics
      ? isPropAccount(activeAccount) &&
        activeAccount.phasesEnabled &&
        !activeAccount.isFunded
        ? accountMetrics.currentPhaseEquity
        : accountMetrics.overallCurrentEquity
      : null;
  const momentumBars = useMemo(
    () => buildMomentumBars(tradesState.items),
    [tradesState.items],
  );
  const overviewStatus = activeAccount
    ? isPropAccount(activeAccount) && activeAccount.phasesEnabled
      ? activeAccount.isFunded
        ? 'Funded account'
        : accountMetrics && accountMetrics.phaseTargetRemaining !== null
          ? `Target ${formatCurrency(accountMetrics.phaseTargetRemaining)} left`
          : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`
      : getStreakLabel(summary.currentStreakDirection, summary.currentStreak)
    : '';
  const overviewStatusMeta = activeAccount
    ? isPropAccount(activeAccount) && activeAccount.phasesEnabled
      ? activeAccount.isFunded
        ? 'Live limits only'
        : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`
      : summary.winRate === null
        ? 'Awaiting first outcome'
        : `Win ${Math.round(summary.winRate)}%`
    : '';
  const overviewStatusProgress = activeAccount
    ? isPropAccount(activeAccount) &&
      activeAccount.phasesEnabled &&
      !activeAccount.isFunded
      ? accountMetrics?.phaseTargetProgress ?? 0
      : Math.max(0, Math.min(summary.winRate ?? 0, 100))
    : 0;
  async function handleDeleteTrade(tradeId: string) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const { error } = await supabase
      .from('Trades')
      .delete()
      .eq('ID', tradeId);

    if (error) {
      return { error: error.message };
    }

    tradesState.refresh();
    await refreshAccounts();
    return { error: null };
  }

  if (!user) {
    return (
      <PageShell size="wide">
        <div className="space-y-6">
          <Reveal>
            <Panel className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px] xl:items-stretch">
                <div className="flex flex-col justify-between gap-6">
                  <div className="max-w-3xl">
                    <HeroBrandBadge label="one journal" />
                    <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                      Trading workspace, not landing page.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
                      Login to open account-aware metrics, recent trade previews and a cleaner workspace overview.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/login" size="lg" variant="primary">
                      Login
                    </ButtonLink>
                    <ButtonLink href="/dashboard" size="lg" variant="secondary">
                      Dashboard
                    </ButtonLink>
                  </div>
                </div>

                <HeroBannerCard alt="One Journal hero banner">
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                        Brand visual
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                        One Journal workspace
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                        Sign in to turn this hero into your live account-aware overview.
                      </p>
                    </div>
                    <ButtonLink href="/login" variant="secondary" size="lg">
                      Unlock Workspace
                    </ButtonLink>
                  </div>
                </HeroBannerCard>
              </div>
            </Panel>
          </Reveal>
        </div>
      </PageShell>
    );
  }

  if (accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading accounts...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!activeAccount) {
    return (
      <PageShell size="wide">
        <div className="space-y-6">
          <Reveal>
            <Panel className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
              <PanelHeader
                eyebrow="accounts"
                title="Create your first account"
                description="One Journal is now account-aware. Create a demo, propfirm, live or backtest account to unlock account-specific recap, charts and trade capture."
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
                    No active account yet. Once you create one, home becomes the overview for that selected account only.
                  </div>
                )}
              </div>
            </Panel>
          </Reveal>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px] xl:items-stretch">
              <div className="flex flex-col justify-between gap-6">
                <div className="max-w-3xl">
                  <HeroBrandBadge label={getAccountContextLabel()} />
                  <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                    {activeAccount.name}
                  </h1>
                  <p className="mt-3 text-sm uppercase tracking-[0.28em] text-[var(--muted)]">
                    {activeAccount.type}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--muted-strong)]">
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      {accounts.length} account{accounts.length === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      Initial equity {formatCurrency(activeAccount.initialEquity)}
                    </span>
                    {isPropAccount(activeAccount) ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-300">
                        {activeAccount.isFunded
                          ? 'Funded'
                          : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`}
                      </span>
                    ) : null}
                    {summary.bestSymbol ? (
                      <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                        Focus symbol {summary.bestSymbol}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(220px,0.9fr)]">
                    <div
                      className={cx(
                        'rounded-[28px] border bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_26px_56px_-38px_var(--shadow-color)]',
                        getPnlCardClassName(summary.netPnl),
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                            PnL pulse
                          </p>
                          <p
                            className={cx(
                              'mt-3 text-3xl font-semibold tracking-tight',
                              getPnlTextClassName(summary.netPnl),
                            )}
                          >
                            {formatPnl(summary.netPnl)}
                          </p>
                        </div>
                        {summary.recentWindowNetPnl !== null ? (
                          <span
                            className={cx(
                              'rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.24em]',
                              getPnlBadgeClassName(summary.recentWindowNetPnl),
                            )}
                          >
                            5T {formatPnl(summary.recentWindowNetPnl)}
                          </span>
                        ) : null}
                      </div>

                      {momentumBars.length > 0 ? (
                        <div className="relative mt-5 h-20">
                          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[linear-gradient(90deg,transparent,var(--border-strong),transparent)]" />
                          <div className="grid h-full grid-cols-8 items-center gap-2">
                            {momentumBars.map((entry) => (
                              <div
                                key={entry.id}
                                className="relative h-full"
                              >
                                <span
                                  className={cx(
                                    'absolute inset-x-0 rounded-full',
                                    entry.value > 0
                                      ? 'bg-[linear-gradient(180deg,var(--chart-positive),color-mix(in_srgb,var(--chart-positive)_54%,white))]'
                                      : entry.value < 0
                                        ? 'bg-[linear-gradient(180deg,var(--chart-negative),color-mix(in_srgb,var(--chart-negative)_54%,white))]'
                                        : 'bg-[var(--chart-neutral)]',
                                  )}
                                  style={{
                                    height: `${Math.max(entry.heightPercent / 2, 8)}%`,
                                    bottom: entry.value >= 0 ? '50%' : undefined,
                                    opacity: entry.value === 0 ? 0.45 : 1,
                                    top: entry.value < 0 ? '50%' : undefined,
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 flex h-20 items-center justify-center rounded-[22px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] text-sm text-[var(--muted)]">
                          Waiting for first executions
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_18px_42px_-32px_var(--shadow-color)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                              Last trade
                            </p>
                            <p className="mt-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">
                              {summary.lastTrade?.symbol || 'Waiting'}
                            </p>
                            <p className="mt-1 text-sm text-[var(--muted)]">
                              {summary.lastTrade?.date
                                ? formatTradeDate(summary.lastTrade.date)
                                : 'No trade yet'}
                            </p>
                          </div>
                          {summary.lastTrade?.pnl !== null &&
                          summary.lastTrade?.pnl !== undefined ? (
                            <span
                              className={cx(
                                'rounded-full border px-3 py-1.5 text-xs font-medium',
                                getPnlBadgeClassName(summary.lastTrade.pnl),
                              )}
                            >
                              {formatPnl(summary.lastTrade.pnl)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_18px_42px_-32px_var(--shadow-color)]">
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
                          {isPropAccount(activeAccount) ? 'Account status' : 'Session status'}
                        </p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">
                          {overviewStatus}
                        </p>
                        <div className="mt-3 h-2 rounded-full bg-[var(--surface-soft)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--chart-accent),var(--chart-positive))]"
                            style={{
                              width:
                                overviewStatusProgress > 0
                                  ? `${Math.max(overviewStatusProgress, 10)}%`
                                  : '0%',
                            }}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                          <span>{overviewStatusMeta}</span>
                          <span>
                            {summary.riskAverage === null
                              ? 'Risk not tracked'
                              : `Risk ${formatPercentValue(summary.riskAverage)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/trades/new" size="lg" variant="primary">
                    New Trade
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="secondary">
                    Open Dashboard
                  </ButtonLink>
                  <ButtonLink href="/accounts" size="lg" variant="ghost">
                    Accounts
                  </ButtonLink>
                </div>
              </div>

              <HeroBannerCard alt="One Journal dashboard banner">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                        {isPropAccount(activeAccount) &&
                        activeAccount.phasesEnabled &&
                        !activeAccount.isFunded
                          ? 'Phase equity'
                          : 'Current equity'}
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                        {displayEquity === null
                          ? 'No trades yet'
                          : formatCurrency(displayEquity)}
                      </p>
                    </div>
                    <span
                      className={cx(
                        'rounded-full border px-3 py-1.5 text-xs',
                        getPnlBadgeClassName(summary.netPnl),
                      )}
                    >
                      {formatPnl(summary.netPnl)}
                    </span>
                  </div>

                  <div className="h-24">
                    <EquitySparkline
                      baselineEquity={accountMetrics?.equityBaseline ?? 0}
                      trades={tradesState.items}
                      className="h-full"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                      <p className="text-sm text-[var(--muted)]">Best trade</p>
                      <p
                        className={cx(
                          'mt-2 text-lg font-semibold text-[var(--foreground)]',
                          getPnlTextClassName(summary.bestTrade),
                        )}
                      >
                        {summary.bestTrade === null
                          ? 'No trades yet'
                          : formatPnl(summary.bestTrade)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                      <p className="text-sm text-[var(--muted)]">Worst trade</p>
                      <p
                        className={cx(
                          'mt-2 text-lg font-semibold text-[var(--foreground)]',
                          getPnlTextClassName(summary.worstTrade),
                        )}
                      >
                        {summary.worstTrade === null
                          ? 'No trades yet'
                          : formatPnl(summary.worstTrade)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 sm:col-span-2">
                      <p className="text-sm text-[var(--muted)]">
                        {isPropAccount(activeAccount) && activeAccount.phasesEnabled
                          ? 'Phase state'
                          : 'Current streak'}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {isPropAccount(activeAccount) && activeAccount.phasesEnabled
                          ? activeAccount.isFunded
                            ? 'Funded account'
                            : accountMetrics &&
                                accountMetrics.phaseTargetRemaining !== null
                              ? `Target remaining ${formatCurrency(accountMetrics.phaseTargetRemaining)}`
                              : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`
                          : getStreakLabel(
                              summary.currentStreakDirection,
                              summary.currentStreak,
                            )}
                      </p>
                    </div>
                  </div>
                </div>
              </HeroBannerCard>
            </div>
          </Panel>
        </Reveal>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}

        <Reveal delay={0.08}>
          <HomeLayoutWorkspace
            accountId={activeAccount.id}
            activeAccountName={activeAccount.name}
            onDeleteTrade={handleDeleteTrade}
            recentTrades={recentTrades}
            summary={summary}
            tradeListMode={tradeListMode}
            tradesError={tradesState.error}
            tradesLoading={tradesState.loading}
            userId={user.id}
          />
        </Reveal>
      </div>
    </PageShell>
  );
}
