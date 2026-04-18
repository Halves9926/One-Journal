'use client';

import { useMemo, useState } from 'react';

import {
  DistributionAnalyticsCard,
  DrawdownCurveAnalyticsCard,
  DurationScatterAnalyticsCard,
  EquityCurveAnalyticsCard,
  LongShortAnalyticsCard,
  PnlByDayAnalyticsCard,
  RecentTrendAnalyticsCard,
  SessionPerformanceAnalyticsCard,
  SymbolWinRateAnalyticsCard,
  WeekdayPerformanceAnalyticsCard,
} from '@/components/ui/analytics-charts';
import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { InputField, MessageBanner, SelectField } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useUserTrades } from '@/components/ui/use-user-trades';
import {
  buildAnalyticsFilterOptions,
  buildAnalyticsSnapshot,
  describeAnalyticsRange,
  enrichTradesForAnalytics,
  filterAnalyticsTrades,
  formatBreakdownSummary,
  formatHoldingTime,
  formatRatioMetric,
  getAnalyticsEmptyMessage,
} from '@/lib/analytics';
import {
  formatCompactNumber,
  formatCurrency,
  formatPnl,
  getPnlCardClassName,
  getPnlTextClassName,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

function AnalyticsMiniMetric({
  label,
  value,
  caption,
  valueClassName,
}: {
  caption?: string;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-4 py-4 shadow-[0_18px_38px_-30px_var(--shadow-color)]">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{label}</p>
      <p
        className={cx(
          'mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]',
          valueClassName,
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{caption}</p>
      ) : null}
    </div>
  );
}

function InsightCard({
  detail,
  title,
}: {
  detail: string;
  title: string;
}) {
  return (
    <div className="rounded-[26px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_22px_48px_-34px_var(--shadow-color)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
        Insight
      </p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function buildAccountLabel(accountName: string | null) {
  return accountName ?? 'All accounts';
}

export default function AnalyticsView() {
  const { loading: authLoading, supabase, user } = useAuth();
  const {
    activeAccount,
    accounts,
    error: accountsError,
    loading: accountsLoading,
  } = useAccounts();
  const tradesState = useUserTrades({
    enabled: Boolean(user),
    limit: null,
  });
  const [accountScope, setAccountScope] = useState<'active' | 'all' | string>('active');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [direction, setDirection] = useState('all');
  const [session, setSession] = useState('all');
  const [strategy, setStrategy] = useState('all');
  const [symbol, setSymbol] = useState('all');

  const analyticsTrades = useMemo(
    () => enrichTradesForAnalytics(tradesState.items),
    [tradesState.items],
  );
  const resolvedAccountId =
    accountScope === 'active'
      ? activeAccount?.id ?? null
      : accountScope === 'all'
        ? null
        : accountScope;
  const accountScopedTrades = useMemo(
    () =>
      resolvedAccountId
        ? analyticsTrades.filter((trade) => trade.accountId === resolvedAccountId)
        : analyticsTrades,
    [analyticsTrades, resolvedAccountId],
  );
  const filterOptions = useMemo(
    () => buildAnalyticsFilterOptions(accountScopedTrades),
    [accountScopedTrades],
  );
  const resolvedDirection =
    direction === 'all' || filterOptions.directions.includes(direction)
      ? direction
      : 'all';
  const resolvedSession =
    session === 'all' || filterOptions.sessions.includes(session)
      ? session
      : 'all';
  const resolvedStrategy =
    strategy === 'all' || filterOptions.strategies.includes(strategy)
      ? strategy
      : 'all';
  const resolvedSymbol =
    symbol === 'all' || filterOptions.symbols.includes(symbol) ? symbol : 'all';
  const filters = useMemo(
    () => ({
      accountId: resolvedAccountId,
      dateFrom,
      dateTo,
      direction: resolvedDirection,
      session: resolvedSession,
      strategy: resolvedStrategy,
      symbol: resolvedSymbol,
    }),
    [
      dateFrom,
      dateTo,
      resolvedAccountId,
      resolvedDirection,
      resolvedSession,
      resolvedStrategy,
      resolvedSymbol,
    ],
  );

  const hasInvalidDateRange =
    Boolean(filters.dateFrom) &&
    Boolean(filters.dateTo) &&
    filters.dateFrom > filters.dateTo;
  const filteredTrades = useMemo(
    () => (hasInvalidDateRange ? [] : filterAnalyticsTrades(analyticsTrades, filters)),
    [analyticsTrades, filters, hasInvalidDateRange],
  );
  const analytics = useMemo(
    () => buildAnalyticsSnapshot(filteredTrades),
    [filteredTrades],
  );
  const selectedAccount = accounts.find((account) => account.id === resolvedAccountId) ?? null;
  const scopeLabel =
    accountScope === 'all'
      ? 'All accounts'
      : buildAccountLabel(selectedAccount?.name ?? activeAccount?.name ?? null);
  const scopeTypeLabel =
    accountScope === 'all'
      ? 'Cross-account aggregate'
      : selectedAccount?.type ?? activeAccount?.type ?? 'Account-aware analytics';
  const emptyMessage = getAnalyticsEmptyMessage(analytics.totalTrades);
  const limitedSample = analytics.totalTrades > 0 && analytics.totalTrades < 5;

  function resetFilters() {
    setAccountScope('active');
    setDateFrom('');
    setDateTo('');
    setDirection('all');
    setSession('all');
    setStrategy('all');
    setSymbol('all');
  }

  if (authLoading || !supabase || accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading analytics workspace...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Analytics locked"
          description="Sign in to open the advanced analytics workspace."
        />
      </PageShell>
    );
  }

  if (!activeAccount && accounts.length === 0) {
    return (
      <PageShell size="wide">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8">
            <PanelHeader
              eyebrow="analytics"
              title="Create an account before opening advanced analytics"
              description="Analytics follow the active account workspace. Create the first account and the data view will light up automatically."
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
          </Panel>
        </Reveal>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="analytics"
              title="Advanced analytics"
              description="Premium execution intelligence for the current journal scope."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/trades/new" size="lg" variant="primary">
                    Add Trade
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="secondary">
                    Dashboard
                  </ButtonLink>
                </div>
              }
            />
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8 sm:pb-8">
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Scope
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {scopeLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {scopeTypeLabel}
                </p>
              </div>
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Range
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {describeAnalyticsRange(filters)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Filters update metrics, charts and insights live.
                </p>
              </div>
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Matched trades
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {analytics.totalTrades}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {tradesState.items.length} trades available across the journal.
                </p>
              </div>
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_24px_48px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Data quality
                </p>
                <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  {analytics.holdingTradesCount} timed trades
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {limitedSample
                    ? 'Limited sample. Insights stay conservative until the journal grows.'
                    : 'Open and close times are included when present for duration analytics.'}
                </p>
              </div>
            </div>
          </Panel>
        </Reveal>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}
        {tradesState.error ? (
          <MessageBanner
            message={`Trades query error: ${tradesState.error}`}
            tone="error"
          />
        ) : null}
        {hasInvalidDateRange ? (
          <MessageBanner
            message="Date range invalid: the start date must be earlier than the end date."
            tone="error"
          />
        ) : null}
        {limitedSample ? (
          <MessageBanner
            message="Not enough data yet for stable insights. Metrics still render, but keep the sample size in mind."
            tone="neutral"
          />
        ) : null}

        <Reveal delay={0.04}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="filters"
              title="Refine the dataset"
              description="Account, date, symbol, session, direction and strategy all update the analytics workspace in real time."
              action={
                <Button type="button" variant="secondary" size="md" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8 sm:pb-8">
              <SelectField
                label="Account"
                value={accountScope}
                onChange={(event) => setAccountScope(event.target.value || 'all')}
              >
                <option value="active">Active account</option>
                <option value="all">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </SelectField>

              <InputField
                label="Date from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />

              <InputField
                label="Date to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />

              <SelectField
                label="Symbol"
                value={resolvedSymbol}
                onChange={(event) => setSymbol(event.target.value)}
              >
                <option value="all">All symbols</option>
                {filterOptions.symbols.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Session"
                value={resolvedSession}
                onChange={(event) => setSession(event.target.value)}
              >
                <option value="all">All sessions</option>
                {filterOptions.sessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Direction"
                value={resolvedDirection}
                onChange={(event) => setDirection(event.target.value)}
              >
                <option value="all">All directions</option>
                {filterOptions.directions.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Strategy"
                value={resolvedStrategy}
                onChange={(event) => setStrategy(event.target.value)}
              >
                <option value="all">All strategies</option>
                {filterOptions.strategies.map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {strategy}
                  </option>
                ))}
              </SelectField>

              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 py-5 shadow-[0_18px_42px_-34px_var(--shadow-color)]">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Live scope
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {analytics.totalTrades}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Filtered trades powering metrics, charts and insights.
                </p>
              </div>
            </div>
          </Panel>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Reveal delay={0.06}>
            <MetricCard
              label="Total trades"
              value={String(analytics.totalTrades)}
              caption="sample size inside current filters"
              tone="neutral"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <MetricCard
              label="Win rate"
              value={
                analytics.summary.winRate === null
                  ? '--'
                  : `${formatCompactNumber(analytics.summary.winRate, 0)}%`
              }
              caption={`${analytics.summary.wins} wins / ${analytics.summary.losses} losses`}
              tone="success"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <MetricCard
              label="Net PnL"
              value={formatPnl(analytics.summary.netPnl, 0)}
              caption="aggregate result"
              tone={analytics.summary.netPnl < 0 ? 'danger' : 'accent'}
              className={getPnlCardClassName(analytics.summary.netPnl)}
              valueClassName={getPnlTextClassName(analytics.summary.netPnl)}
            />
          </Reveal>
          <Reveal delay={0.12}>
            <MetricCard
              label="Average RR"
              value={formatRatioMetric(analytics.summary.avgRr, 2)}
              caption="risk to reward captured"
              tone="neutral"
            />
          </Reveal>
          <Reveal delay={0.14}>
            <MetricCard
              label="Profit factor"
              value={formatRatioMetric(analytics.profitFactor, 2)}
              caption="gross wins vs gross losses"
              tone="neutral"
            />
          </Reveal>
          <Reveal delay={0.16}>
            <MetricCard
              label="Expectancy"
              value={formatPnl(analytics.expectancy, 0)}
              caption="average outcome per trade"
              tone={((analytics.expectancy ?? 0) < 0) ? 'danger' : 'accent'}
              className={getPnlCardClassName(analytics.expectancy)}
              valueClassName={getPnlTextClassName(analytics.expectancy)}
            />
          </Reveal>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
          <Reveal delay={0.18}>
            <Panel className="overflow-hidden p-6 sm:p-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                  trade quality
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Outcomes and edge quality
                </h2>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <AnalyticsMiniMetric
                  label="Average win"
                  value={formatPnl(analytics.summary.avgWin, 0)}
                  valueClassName={getPnlTextClassName(analytics.summary.avgWin)}
                />
                <AnalyticsMiniMetric
                  label="Average loss"
                  value={formatPnl(analytics.summary.avgLoss, 0)}
                  valueClassName={getPnlTextClassName(analytics.summary.avgLoss)}
                />
                <AnalyticsMiniMetric
                  label="Best trade"
                  value={formatPnl(analytics.summary.bestTrade, 0)}
                  valueClassName={getPnlTextClassName(analytics.summary.bestTrade)}
                />
                <AnalyticsMiniMetric
                  label="Worst trade"
                  value={formatPnl(analytics.summary.worstTrade, 0)}
                  valueClassName={getPnlTextClassName(analytics.summary.worstTrade)}
                />
                <AnalyticsMiniMetric
                  label="Breakeven"
                  value={String(analytics.breakevenCount)}
                  caption="flat outcomes"
                />
                <AnalyticsMiniMetric
                  label="Risk average"
                  value={formatRatioMetric(analytics.riskAverage, 2)}
                  caption="average risk field value"
                />
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.2}>
            <Panel className="overflow-hidden p-6 sm:p-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                  risk
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Drawdown and streaks
                </h2>
              </div>
              <div className="mt-5 grid gap-3">
                <AnalyticsMiniMetric
                  label="Max drawdown"
                  value={formatCurrency(analytics.maxDrawdown, 0)}
                />
                <AnalyticsMiniMetric
                  label="Current drawdown"
                  value={formatCurrency(analytics.currentDrawdown, 0)}
                />
                <AnalyticsMiniMetric
                  label="Longest win streak"
                  value={String(analytics.longestWinStreak)}
                  caption="consecutive wins"
                />
                <AnalyticsMiniMetric
                  label="Longest loss streak"
                  value={String(analytics.longestLossStreak)}
                  caption="consecutive losses"
                />
                <AnalyticsMiniMetric
                  label="Average holding"
                  value={formatHoldingTime(analytics.averageHoldingMinutes)}
                  caption={`${analytics.holdingTradesCount} timed trades`}
                />
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.22}>
            <Panel className="overflow-hidden p-6 sm:p-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                  edges
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  Best and worst pockets
                </h2>
              </div>
              <div className="mt-5 grid gap-3">
                <AnalyticsMiniMetric
                  label="Best day"
                  value={analytics.mostProfitableDay?.label ?? '--'}
                  caption={formatBreakdownSummary(analytics.mostProfitableDay)}
                />
                <AnalyticsMiniMetric
                  label="Worst day"
                  value={analytics.worstDay?.label ?? '--'}
                  caption={formatBreakdownSummary(analytics.worstDay)}
                />
                <AnalyticsMiniMetric
                  label="Best session"
                  value={analytics.mostProfitableSession?.label ?? '--'}
                  caption={formatBreakdownSummary(analytics.mostProfitableSession)}
                />
                <AnalyticsMiniMetric
                  label="Best symbol"
                  value={analytics.bestSymbol?.label ?? '--'}
                  caption={formatBreakdownSummary(analytics.bestSymbol)}
                />
                <AnalyticsMiniMetric
                  label="Worst symbol"
                  value={analytics.worstSymbol?.label ?? '--'}
                  caption={formatBreakdownSummary(analytics.worstSymbol)}
                />
              </div>
            </Panel>
          </Reveal>
        </div>

        <Reveal delay={0.24}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="insights"
              title="Insights"
              description="Simple interpretations generated only from the current filtered data."
            />
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              {analytics.insights.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {analytics.insights.map((insight) => (
                    <InsightCard
                      key={insight.title}
                      detail={insight.detail}
                      title={insight.title}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  Not enough data yet. Add more trades or widen the filters to unlock stable insights.
                </div>
              )}
            </div>
          </Panel>
        </Reveal>

        {analytics.totalTrades === 0 ? (
          <Reveal delay={0.26}>
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="empty"
                title="No analytics in this scope yet"
                description={emptyMessage ?? 'No trades available for the current filter combination.'}
                action={
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/trades/new" size="lg" variant="primary">
                      Add Trade
                    </ButtonLink>
                    <Button type="button" size="lg" variant="secondary" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  </div>
                }
              />
            </Panel>
          </Reveal>
        ) : (
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8">
              <Reveal delay={0.26}>
                <EquityCurveAnalyticsCard
                  currentDrawdown={analytics.currentDrawdown}
                  maxDrawdown={analytics.maxDrawdown}
                  points={analytics.equityCurve}
                />
              </Reveal>
            </div>
            <div className="xl:col-span-4">
              <Reveal delay={0.28}>
                <DrawdownCurveAnalyticsCard
                  currentDrawdown={analytics.currentDrawdown}
                  maxDrawdown={analytics.maxDrawdown}
                  points={analytics.drawdownCurve}
                />
              </Reveal>
            </div>

            <div className="xl:col-span-7">
              <Reveal delay={0.3}>
                <PnlByDayAnalyticsCard points={analytics.pnlByDay} />
              </Reveal>
            </div>
            <div className="xl:col-span-5">
              <Reveal delay={0.32}>
                <RecentTrendAnalyticsCard points={analytics.recentTrend} />
              </Reveal>
            </div>

            <div className="xl:col-span-6">
              <Reveal delay={0.34}>
                <SessionPerformanceAnalyticsCard items={analytics.pnlBySession} />
              </Reveal>
            </div>
            <div className="xl:col-span-6">
              <Reveal delay={0.36}>
                <WeekdayPerformanceAnalyticsCard items={analytics.weekdayPerformance} />
              </Reveal>
            </div>

            <div className="xl:col-span-6">
              <Reveal delay={0.38}>
                <SymbolWinRateAnalyticsCard items={analytics.winRateBySymbol} />
              </Reveal>
            </div>
            <div className="xl:col-span-6">
              <Reveal delay={0.4}>
                <LongShortAnalyticsCard
                  longStats={analytics.directionPerformance.long}
                  shortStats={analytics.directionPerformance.short}
                />
              </Reveal>
            </div>

            <div className="xl:col-span-6">
              <Reveal delay={0.42}>
                <DistributionAnalyticsCard
                  eyebrow="rr"
                  title="RR distribution"
                  caption="Trade count grouped by risk-reward buckets."
                  items={analytics.rrDistribution}
                  mode="rr"
                />
              </Reveal>
            </div>
            <div className="xl:col-span-6">
              <Reveal delay={0.44}>
                <DistributionAnalyticsCard
                  eyebrow="distribution"
                  title="PnL distribution"
                  caption="Outcome dispersion across the filtered trade set."
                  items={analytics.pnlDistribution}
                  mode="pnl"
                />
              </Reveal>
            </div>

            <div className="xl:col-span-12">
              <Reveal delay={0.46}>
                <DurationScatterAnalyticsCard
                  averageHoldingMinutes={analytics.averageHoldingMinutes}
                  points={analytics.tradeDurationVsPnl}
                />
              </Reveal>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
