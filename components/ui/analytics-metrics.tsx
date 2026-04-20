'use client';

import type { ReactNode } from 'react';

import {
  DistributionAnalyticsCard,
  DrawdownCurveAnalyticsCard,
  DurationScatterAnalyticsCard,
  EquityCurveAnalyticsCard,
  LongShortAnalyticsCard,
  PnlByDayAnalyticsCard,
  RecentTrendAnalyticsCard,
  SessionPerformanceAnalyticsCard,
  WeekdayPerformanceAnalyticsCard,
} from '@/components/ui/analytics-charts';
import { MetricCard, Panel } from '@/components/ui/panel';
import {
  formatBreakdownSummary,
  formatRatioMetric,
  type AnalyticsBreakdownItem,
  type AnalyticsFilters,
  type AnalyticsSnapshot,
} from '@/lib/analytics';
import {
  formatCompactNumber,
  formatCurrency,
  formatPnl,
  getPnlCardClassName,
  getPnlTextClassName,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

export const ANALYTICS_METRIC_IDS = [
  'net-pnl',
  'win-rate',
  'total-trades',
  'average-rr',
  'profit-factor',
  'expectancy',
  'average-win',
  'average-loss',
  'best-trade',
  'worst-trade',
  'max-drawdown',
  'current-drawdown',
  'win-streak',
  'loss-streak',
  'best-session',
  'worst-session',
  'best-symbol',
  'worst-symbol',
  'long-vs-short',
  'rr-distribution',
  'pnl-distribution',
  'equity-curve',
  'drawdown-curve',
  'pnl-by-day',
  'pnl-by-session',
  'weekday-performance',
  'trade-duration',
  'risk-average',
  'recent-performance',
] as const;

export type AnalyticsMetricId = (typeof ANALYTICS_METRIC_IDS)[number];

export type AnalyticsMetricCategory =
  | 'Core'
  | 'Risk'
  | 'Edge'
  | 'Breakdown'
  | 'Distribution'
  | 'Timeline';

export type AnalyticsWidgetSize = 'compact' | 'medium' | 'wide' | 'full';

export type AnalyticsMetricRenderContext = {
  analytics: AnalyticsSnapshot;
  filters: AnalyticsFilters;
  scopeLabel: string;
  totalTradesAvailable: number;
};

export type AnalyticsMetricDefinition = {
  category: AnalyticsMetricCategory;
  description: string;
  id: AnalyticsMetricId;
  name: string;
  render: (context: AnalyticsMetricRenderContext) => ReactNode;
  requiredData?: string[];
  size: AnalyticsWidgetSize;
};

export const DEFAULT_ANALYTICS_METRIC_IDS: AnalyticsMetricId[] = [
  'net-pnl',
  'win-rate',
  'equity-curve',
  'average-rr',
  'profit-factor',
  'best-session',
  'worst-session',
  'recent-performance',
];

const analyticsMetricIdSet = new Set<string>(ANALYTICS_METRIC_IDS);

const analyticsWidgetSizeClassNames: Record<AnalyticsWidgetSize, string> = {
  compact: 'sm:col-span-1 xl:col-span-4',
  medium: 'sm:col-span-2 xl:col-span-6',
  wide: 'sm:col-span-2 xl:col-span-8',
  full: 'sm:col-span-2 xl:col-span-12',
};

const analyticsWidgetShellClassNames: Record<AnalyticsWidgetSize, string> = {
  compact: 'min-h-[164px]',
  medium: 'min-h-[430px]',
  wide: 'min-h-[430px]',
  full: 'min-h-[430px]',
};

function SummaryWidget({
  caption,
  className,
  label,
  tone = 'neutral',
  value,
  valueClassName,
}: {
  caption?: string;
  className?: string;
  label: string;
  tone?: 'accent' | 'danger' | 'neutral' | 'success';
  value: string;
  valueClassName?: string;
}) {
  return (
    <MetricCard
      caption={caption}
      className={cx('h-full', className)}
      label={label}
      tone={tone}
      value={value}
      valueClassName={valueClassName}
    />
  );
}

function BreakdownWidget({
  emptyCaption,
  eyebrow,
  item,
  title,
}: {
  emptyCaption: string;
  eyebrow: string;
  item: AnalyticsBreakdownItem | null;
  title: string;
}) {
  return (
    <Panel className="h-full p-6 sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-5 truncate text-3xl font-semibold tracking-tight text-[var(--foreground)]">
        {item?.label ?? '--'}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {item ? formatBreakdownSummary(item) : emptyCaption}
      </p>
      {item ? (
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-[var(--muted)]">
          <span className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2">
            {item.count} trades
          </span>
          <span className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2">
            {item.winRate === null ? '--' : `${formatCompactNumber(item.winRate, 0)}%`}
          </span>
          <span className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2">
            RR {formatRatioMetric(item.avgRr, 1)}
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

export const analyticsMetricRegistry = [
  {
    category: 'Core',
    description: 'Aggregate result across the current filters.',
    id: 'net-pnl',
    name: 'Net PnL',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="aggregate result"
        className={getPnlCardClassName(analytics.summary.netPnl)}
        label="Net PnL"
        tone={analytics.summary.netPnl < 0 ? 'danger' : 'accent'}
        value={formatPnl(analytics.summary.netPnl, 0)}
        valueClassName={getPnlTextClassName(analytics.summary.netPnl)}
      />
    ),
  },
  {
    category: 'Core',
    description: 'Winning trades as a percentage of the sample.',
    id: 'win-rate',
    name: 'Win Rate',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption={`${analytics.summary.wins} wins / ${analytics.summary.losses} losses`}
        label="Win rate"
        tone="success"
        value={
          analytics.summary.winRate === null
            ? '--'
            : `${formatCompactNumber(analytics.summary.winRate, 0)}%`
        }
      />
    ),
  },
  {
    category: 'Core',
    description: 'Number of trades inside the live dataset.',
    id: 'total-trades',
    name: 'Total Trades',
    size: 'compact',
    render: ({ analytics, totalTradesAvailable }) => (
      <SummaryWidget
        caption={`${totalTradesAvailable} trades available across the journal`}
        label="Total trades"
        value={String(analytics.totalTrades)}
      />
    ),
  },
  {
    category: 'Edge',
    description: 'Average recorded risk-reward ratio.',
    id: 'average-rr',
    name: 'Average RR',
    requiredData: ['RR'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="risk to reward captured"
        label="Average RR"
        value={formatRatioMetric(analytics.summary.avgRr, 2)}
      />
    ),
  },
  {
    category: 'Edge',
    description: 'Gross wins divided by gross losses.',
    id: 'profit-factor',
    name: 'Profit Factor',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="gross wins vs gross losses"
        label="Profit factor"
        value={formatRatioMetric(analytics.profitFactor, 2)}
      />
    ),
  },
  {
    category: 'Edge',
    description: 'Average expected outcome per trade.',
    id: 'expectancy',
    name: 'Expectancy',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="average outcome per trade"
        className={getPnlCardClassName(analytics.expectancy)}
        label="Expectancy"
        tone={(analytics.expectancy ?? 0) < 0 ? 'danger' : 'accent'}
        value={formatPnl(analytics.expectancy, 0)}
        valueClassName={getPnlTextClassName(analytics.expectancy)}
      />
    ),
  },
  {
    category: 'Edge',
    description: 'Average profit on winning trades.',
    id: 'average-win',
    name: 'Average Win',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption={`${analytics.summary.wins} winning trades`}
        className={getPnlCardClassName(analytics.summary.avgWin)}
        label="Average win"
        tone="success"
        value={formatPnl(analytics.summary.avgWin, 0)}
        valueClassName={getPnlTextClassName(analytics.summary.avgWin)}
      />
    ),
  },
  {
    category: 'Edge',
    description: 'Average loss on losing trades.',
    id: 'average-loss',
    name: 'Average Loss',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption={`${analytics.summary.losses} losing trades`}
        className={getPnlCardClassName(analytics.summary.avgLoss)}
        label="Average loss"
        tone="danger"
        value={formatPnl(analytics.summary.avgLoss, 0)}
        valueClassName={getPnlTextClassName(analytics.summary.avgLoss)}
      />
    ),
  },
  {
    category: 'Edge',
    description: 'Largest single winning outcome.',
    id: 'best-trade',
    name: 'Best Trade',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="largest positive outcome"
        className={getPnlCardClassName(analytics.summary.bestTrade)}
        label="Best trade"
        tone="success"
        value={formatPnl(analytics.summary.bestTrade, 0)}
        valueClassName={getPnlTextClassName(analytics.summary.bestTrade)}
      />
    ),
  },
  {
    category: 'Edge',
    description: 'Largest single losing outcome.',
    id: 'worst-trade',
    name: 'Worst Trade',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="largest negative outcome"
        className={getPnlCardClassName(analytics.summary.worstTrade)}
        label="Worst trade"
        tone="danger"
        value={formatPnl(analytics.summary.worstTrade, 0)}
        valueClassName={getPnlTextClassName(analytics.summary.worstTrade)}
      />
    ),
  },
  {
    category: 'Risk',
    description: 'Largest peak-to-trough pressure in the sample.',
    id: 'max-drawdown',
    name: 'Max Drawdown',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="largest equity pullback"
        label="Max drawdown"
        tone="danger"
        value={formatCurrency(analytics.maxDrawdown, 0)}
      />
    ),
  },
  {
    category: 'Risk',
    description: 'Current distance from the equity peak.',
    id: 'current-drawdown',
    name: 'Current Drawdown',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="latest equity pullback"
        label="Current drawdown"
        tone={(analytics.currentDrawdown ?? 0) > 0 ? 'danger' : 'neutral'}
        value={formatCurrency(analytics.currentDrawdown, 0)}
      />
    ),
  },
  {
    category: 'Risk',
    description: 'Longest run of consecutive winners.',
    id: 'win-streak',
    name: 'Win Streak',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="consecutive wins"
        label="Longest win streak"
        tone="success"
        value={String(analytics.longestWinStreak)}
      />
    ),
  },
  {
    category: 'Risk',
    description: 'Longest run of consecutive losers.',
    id: 'loss-streak',
    name: 'Loss Streak',
    requiredData: ['PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="consecutive losses"
        label="Longest loss streak"
        tone="danger"
        value={String(analytics.longestLossStreak)}
      />
    ),
  },
  {
    category: 'Breakdown',
    description: 'Most profitable session tag.',
    id: 'best-session',
    name: 'Best Session',
    requiredData: ['Session', 'PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <BreakdownWidget
        emptyCaption="Session tags required."
        eyebrow="session"
        item={analytics.mostProfitableSession}
        title="Best session"
      />
    ),
  },
  {
    category: 'Breakdown',
    description: 'Weakest session tag by net result.',
    id: 'worst-session',
    name: 'Worst Session',
    requiredData: ['Session', 'PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <BreakdownWidget
        emptyCaption="Session tags required."
        eyebrow="session"
        item={analytics.worstSession}
        title="Worst session"
      />
    ),
  },
  {
    category: 'Breakdown',
    description: 'Best performing symbol by net result.',
    id: 'best-symbol',
    name: 'Best Symbol',
    requiredData: ['Symbol', 'PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <BreakdownWidget
        emptyCaption="Symbol data required."
        eyebrow="symbol"
        item={analytics.bestSymbol}
        title="Best symbol"
      />
    ),
  },
  {
    category: 'Breakdown',
    description: 'Weakest symbol by net result.',
    id: 'worst-symbol',
    name: 'Worst Symbol',
    requiredData: ['Symbol', 'PnL'],
    size: 'compact',
    render: ({ analytics }) => (
      <BreakdownWidget
        emptyCaption="Symbol data required."
        eyebrow="symbol"
        item={analytics.worstSymbol}
        title="Worst symbol"
      />
    ),
  },
  {
    category: 'Breakdown',
    description: 'Directional performance across long and short trades.',
    id: 'long-vs-short',
    name: 'Long vs Short',
    requiredData: ['Direction', 'PnL'],
    size: 'medium',
    render: ({ analytics }) => (
      <LongShortAnalyticsCard
        longStats={analytics.directionPerformance.long}
        shortStats={analytics.directionPerformance.short}
      />
    ),
  },
  {
    category: 'Distribution',
    description: 'Trade count grouped by risk-reward buckets.',
    id: 'rr-distribution',
    name: 'RR Distribution',
    requiredData: ['RR'],
    size: 'medium',
    render: ({ analytics }) => (
      <DistributionAnalyticsCard
        caption="Trade count grouped by risk-reward buckets."
        eyebrow="rr"
        items={analytics.rrDistribution}
        mode="rr"
        title="RR distribution"
      />
    ),
  },
  {
    category: 'Distribution',
    description: 'Outcome dispersion across the filtered set.',
    id: 'pnl-distribution',
    name: 'PnL Distribution',
    requiredData: ['PnL'],
    size: 'medium',
    render: ({ analytics }) => (
      <DistributionAnalyticsCard
        caption="Outcome dispersion across the filtered trade set."
        eyebrow="distribution"
        items={analytics.pnlDistribution}
        mode="pnl"
        title="PnL distribution"
      />
    ),
  },
  {
    category: 'Timeline',
    description: 'Cumulative PnL across the filtered trade stream.',
    id: 'equity-curve',
    name: 'Equity Curve',
    requiredData: ['PnL', 'Date'],
    size: 'wide',
    render: ({ analytics }) => (
      <EquityCurveAnalyticsCard
        currentDrawdown={analytics.currentDrawdown}
        maxDrawdown={analytics.maxDrawdown}
        points={analytics.equityCurve}
      />
    ),
  },
  {
    category: 'Risk',
    description: 'Peak-to-trough pressure over time.',
    id: 'drawdown-curve',
    name: 'Drawdown Curve',
    requiredData: ['PnL', 'Date'],
    size: 'medium',
    render: ({ analytics }) => (
      <DrawdownCurveAnalyticsCard
        currentDrawdown={analytics.currentDrawdown}
        maxDrawdown={analytics.maxDrawdown}
        points={analytics.drawdownCurve}
      />
    ),
  },
  {
    category: 'Timeline',
    description: 'Daily net outcome across the current filters.',
    id: 'pnl-by-day',
    name: 'PnL by Day',
    requiredData: ['PnL', 'Date'],
    size: 'medium',
    render: ({ analytics }) => <PnlByDayAnalyticsCard points={analytics.pnlByDay} />,
  },
  {
    category: 'Breakdown',
    description: 'Net outcome grouped by session.',
    id: 'pnl-by-session',
    name: 'PnL by Session',
    requiredData: ['Session', 'PnL'],
    size: 'medium',
    render: ({ analytics }) => (
      <SessionPerformanceAnalyticsCard items={analytics.pnlBySession} />
    ),
  },
  {
    category: 'Breakdown',
    description: 'Performance mapped across weekdays.',
    id: 'weekday-performance',
    name: 'Weekday Performance',
    requiredData: ['Date', 'PnL'],
    size: 'medium',
    render: ({ analytics }) => (
      <WeekdayPerformanceAnalyticsCard items={analytics.weekdayPerformance} />
    ),
  },
  {
    category: 'Timeline',
    description: 'Holding time plotted against trade result.',
    id: 'trade-duration',
    name: 'Trade Duration',
    requiredData: ['Open time', 'Close time', 'PnL'],
    size: 'full',
    render: ({ analytics }) => (
      <DurationScatterAnalyticsCard
        averageHoldingMinutes={analytics.averageHoldingMinutes}
        points={analytics.tradeDurationVsPnl}
      />
    ),
  },
  {
    category: 'Risk',
    description: 'Average risk field value in the trade sample.',
    id: 'risk-average',
    name: 'Risk Average',
    requiredData: ['Risk'],
    size: 'compact',
    render: ({ analytics }) => (
      <SummaryWidget
        caption="average risk field value"
        label="Risk average"
        value={formatRatioMetric(analytics.riskAverage, 2)}
      />
    ),
  },
  {
    category: 'Timeline',
    description: 'Rolling five-trade performance trend.',
    id: 'recent-performance',
    name: 'Recent Performance',
    requiredData: ['PnL', 'Date'],
    size: 'medium',
    render: ({ analytics }) => <RecentTrendAnalyticsCard points={analytics.recentTrend} />,
  },
] satisfies AnalyticsMetricDefinition[];

export const analyticsMetricMap = new Map<AnalyticsMetricId, AnalyticsMetricDefinition>(
  analyticsMetricRegistry.map((metric) => [metric.id, metric]),
);

export function getAnalyticsMetricById(id: AnalyticsMetricId) {
  return analyticsMetricMap.get(id) ?? null;
}

export function getAnalyticsMetricGridClassName(size: AnalyticsWidgetSize) {
  return analyticsWidgetSizeClassNames[size];
}

export function getAnalyticsMetricShellClassName(size: AnalyticsWidgetSize) {
  return analyticsWidgetShellClassNames[size];
}

export function isAnalyticsMetricId(value: string): value is AnalyticsMetricId {
  return analyticsMetricIdSet.has(value);
}

export function normalizeAnalyticsMetricIds(values: string[]) {
  const seenMetricIds = new Set<AnalyticsMetricId>();
  const metricIds: AnalyticsMetricId[] = [];

  for (const value of values) {
    if (!isAnalyticsMetricId(value) || seenMetricIds.has(value)) {
      continue;
    }

    seenMetricIds.add(value);
    metricIds.push(value);
  }

  return metricIds;
}
