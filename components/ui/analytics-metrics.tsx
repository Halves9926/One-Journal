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
import { Panel } from '@/components/ui/panel';
import WinRateWidget, {
  type WinRateWidgetVariant,
} from '@/components/ui/win-rate-widget';
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

export const NET_PNL_WIDGET_VARIANTS = ['compact', 'visual'] as const;

export type NetPnlWidgetVariant = (typeof NET_PNL_WIDGET_VARIANTS)[number];

export type AnalyticsMetricVariant = WinRateWidgetVariant | NetPnlWidgetVariant;

export type AnalyticsMetricRenderContext = {
  analytics: AnalyticsSnapshot;
  filters: AnalyticsFilters;
  metricVariants: AnalyticsMetricVariantMap;
  scopeLabel: string;
  totalTradesAvailable: number;
};

export type AnalyticsMetricVisualOption = {
  description: string;
  id: AnalyticsMetricVariant;
  label: string;
};

export type AnalyticsMetricVariantMap = Partial<
  Record<AnalyticsMetricId, AnalyticsMetricVariant>
>;

export type AnalyticsMetricDefinition = {
  category: AnalyticsMetricCategory;
  defaultVariant?: AnalyticsMetricVariant;
  description: string;
  id: AnalyticsMetricId;
  name: string;
  render: (context: AnalyticsMetricRenderContext) => ReactNode;
  requiredData?: string[];
  size: AnalyticsWidgetSize;
  visualOptions?: AnalyticsMetricVisualOption[];
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

export const DEFAULT_ANALYTICS_METRIC_VARIANTS = {
  'net-pnl': 'compact',
  'win-rate': 'radial',
} satisfies AnalyticsMetricVariantMap;

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
  const toneClassNames = {
    accent:
      'border-[color:var(--accent-border-soft)] bg-[radial-gradient(circle_at_top_right,var(--accent-primary-glow),transparent_48%),linear-gradient(180deg,var(--surface-raised),var(--surface))]',
    danger:
      'border-[color:color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--danger)_14%,transparent),transparent_48%),linear-gradient(180deg,var(--surface-raised),var(--surface))]',
    neutral:
      'border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))]',
    success:
      'border-[color:var(--pnl-positive-border)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--chart-positive)_14%,transparent),transparent_48%),linear-gradient(180deg,var(--surface-raised),var(--surface))]',
  } satisfies Record<NonNullable<typeof tone>, string>;
  const barClassNames = {
    accent:
      'bg-[linear-gradient(90deg,var(--accent-gradient-start),var(--accent-gradient-mid),var(--accent-gradient-end))]',
    danger:
      'bg-[linear-gradient(90deg,var(--chart-negative),color-mix(in_srgb,var(--chart-negative)_56%,var(--surface-raised)))]',
    neutral:
      'bg-[linear-gradient(90deg,var(--chart-neutral),color-mix(in_srgb,var(--chart-neutral)_52%,var(--surface-raised)))]',
    success:
      'bg-[linear-gradient(90deg,var(--chart-positive),color-mix(in_srgb,var(--chart-positive)_56%,var(--surface-raised)))]',
  } satisfies Record<NonNullable<typeof tone>, string>;

  return (
    <article
      className={cx(
        'relative isolate flex h-full min-h-[164px] flex-col overflow-hidden rounded-[28px] border p-5 shadow-[0_24px_48px_-34px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-border-soft)] hover:shadow-[0_28px_54px_-34px_var(--shadow-color)]',
        toneClassNames[tone],
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-[-18%] top-[-42%] -z-10 h-44 rounded-full bg-[radial-gradient(circle,var(--accent-panel-glow),transparent_64%)] blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <span
          className={cx(
            'mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_22px_currentColor]',
            tone === 'success'
              ? 'text-[var(--chart-positive)]'
              : tone === 'danger'
                ? 'text-[var(--chart-negative)]'
                : tone === 'accent'
                  ? 'text-[var(--accent-solid)]'
                  : 'text-[var(--chart-neutral)]',
          )}
        />
      </div>
      <p
        className={cx(
          'mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]',
          valueClassName,
        )}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{caption}</p>
      ) : null}
      <div className="mt-auto pt-5">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
          <div className={cx('h-full w-2/3 rounded-full', barClassNames[tone])} />
        </div>
      </div>
    </article>
  );
}

function NetPnlWidget({
  analytics,
  variant,
}: {
  analytics: AnalyticsSnapshot;
  variant: NetPnlWidgetVariant;
}) {
  const netPnl = analytics.summary.netPnl;
  const recentPoints = analytics.equityCurve
    .slice(-8)
    .filter((point) => Number.isFinite(point.pnl));
  const maxMagnitude = Math.max(
    1,
    ...recentPoints.map((point) => Math.abs(point.pnl)),
  );
  const tone = netPnl < 0 ? 'danger' : netPnl > 0 ? 'success' : 'accent';
  const recentPnl =
    recentPoints.length > 0
      ? recentPoints.reduce((total, point) => total + point.pnl, 0)
      : null;

  if (variant === 'visual') {
    return (
      <article
        className={cx(
          'relative isolate flex h-full min-h-[190px] flex-col overflow-hidden rounded-[28px] border p-5 shadow-[0_24px_48px_-34px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-border-soft)]',
          netPnl < 0
            ? 'border-[color:var(--pnl-negative-border)] bg-[radial-gradient(circle_at_top_right,var(--pnl-negative-surface),transparent_48%),linear-gradient(180deg,var(--surface-raised),var(--surface))]'
            : 'border-[color:var(--pnl-positive-border)] bg-[radial-gradient(circle_at_top_right,var(--pnl-positive-surface),transparent_48%),linear-gradient(180deg,var(--surface-raised),var(--surface))]',
        )}
      >
        <div className="pointer-events-none absolute inset-x-[-18%] top-[-44%] -z-10 h-44 rounded-full bg-[radial-gradient(circle,var(--accent-panel-glow),transparent_64%)] blur-2xl" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
              Net PnL
            </p>
            <p
              className={cx(
                'mt-3 text-4xl font-semibold leading-none tracking-[-0.06em]',
                getPnlTextClassName(netPnl),
              )}
            >
              {formatPnl(netPnl, 0)}
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
            {analytics.totalTrades} trades
          </span>
        </div>

        <div className="relative mt-6 h-20">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[linear-gradient(90deg,transparent,var(--border-strong),transparent)]" />
          {recentPoints.length > 0 ? (
            <div className="grid h-full grid-cols-8 items-center gap-2">
              {recentPoints.map((point, index) => {
                const height = point.pnl === 0
                  ? 12
                  : Math.max((Math.abs(point.pnl) / maxMagnitude) * 88, 18);

                return (
                  <span
                    key={`${point.tradeId}-${index}`}
                    className={cx(
                      'relative h-full rounded-full',
                      point.pnl > 0
                        ? 'bg-[linear-gradient(180deg,var(--chart-positive),color-mix(in_srgb,var(--chart-positive)_54%,white))]'
                        : point.pnl < 0
                          ? 'bg-[linear-gradient(180deg,var(--chart-negative),color-mix(in_srgb,var(--chart-negative)_54%,white))]'
                          : 'bg-[var(--chart-neutral)]',
                    )}
                    style={{
                      alignSelf: point.pnl >= 0 ? 'end' : 'start',
                      height: `${height}%`,
                      opacity: point.pnl === 0 ? 0.45 : 1,
                    }}
                    title={`${point.label}: ${formatPnl(point.pnl)}`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] text-sm text-[var(--muted)]">
              No outcomes yet
            </div>
          )}
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          {recentPnl === null ? 'Waiting for executions.' : `Recent flow ${formatPnl(recentPnl, 0)}.`}
        </p>
      </article>
    );
  }

  return (
    <SummaryWidget
      caption={`${analytics.totalTrades} matched trades`}
      className={getPnlCardClassName(netPnl)}
      label="Net PnL"
      tone={tone}
      value={formatPnl(netPnl, 0)}
      valueClassName={getPnlTextClassName(netPnl)}
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
        {item?.label ?? 'No data'}
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
            {item.winRate === null ? 'No rate' : `${formatCompactNumber(item.winRate, 0)}%`}
          </span>
          <span className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-2">
            RR {item.avgRr === null ? 'No RR' : formatRatioMetric(item.avgRr, 1)}
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

function formatMetricRatio(
  value: number | null,
  digits = 2,
  fallback = 'No data',
) {
  return value === null ? fallback : formatRatioMetric(value, digits);
}

export const analyticsMetricRegistry = [
  {
    category: 'Core',
    defaultVariant: 'compact',
    description: 'Aggregate result across the current filters.',
    id: 'net-pnl',
    name: 'Net PnL',
    requiredData: ['PnL'],
    size: 'compact',
    visualOptions: [
      {
        description: 'Small value-first card for dense layouts.',
        id: 'compact',
        label: 'Compact',
      },
      {
        description: 'Mini visual pulse with recent PnL flow.',
        id: 'visual',
        label: 'Visual',
      },
    ],
    render: ({ analytics, metricVariants }) => (
      <NetPnlWidget
        analytics={analytics}
        variant={
          metricVariants['net-pnl'] === 'visual' ? 'visual' : 'compact'
        }
      />
    ),
  },
  {
    category: 'Core',
    description: 'Winning trades as a percentage of the sample.',
    defaultVariant: 'radial',
    id: 'win-rate',
    name: 'Win Rate',
    requiredData: ['PnL'],
    size: 'medium',
    visualOptions: [
      {
        description: 'Large radial gauge with outcome breakdown.',
        id: 'radial',
        label: 'Radial',
      },
      {
        description: 'Smaller horizontal card for dense layouts.',
        id: 'compact',
        label: 'Compact',
      },
    ],
    render: ({ analytics, metricVariants }) => {
      const variant = metricVariants['win-rate'];

      return (
        <WinRateWidget
          breakeven={analytics.summary.breakeven}
          caption={`${analytics.summary.totalTrades} tracked outcome${analytics.summary.totalTrades === 1 ? '' : 's'}`}
          losses={analytics.summary.losses}
          variant={variant === 'compact' || variant === 'radial' ? variant : 'radial'}
          wins={analytics.summary.wins}
        />
      );
    },
  },
  {
    category: 'Core',
    description: 'Number of trades inside the live dataset.',
    id: 'total-trades',
    name: 'Total Trades',
    size: 'compact',
    render: ({ analytics, totalTradesAvailable }) => (
      <SummaryWidget
        caption={`${totalTradesAvailable} trades in the current journal view`}
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
        value={formatMetricRatio(analytics.summary.avgRr, 2, 'No RR')}
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
        tone={
          analytics.profitFactor !== null && analytics.profitFactor >= 1
            ? 'accent'
            : 'neutral'
        }
        value={
          analytics.profitFactor === Number.POSITIVE_INFINITY
            ? 'Perfect'
            : formatMetricRatio(analytics.profitFactor, 2)
        }
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
        value={analytics.expectancy === null ? 'No data' : formatPnl(analytics.expectancy, 0)}
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
        value={analytics.summary.avgWin === null ? 'No wins' : formatPnl(analytics.summary.avgWin, 0)}
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
        value={analytics.summary.avgLoss === null ? 'No losses' : formatPnl(analytics.summary.avgLoss, 0)}
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
        value={analytics.summary.bestTrade === null ? 'No trade' : formatPnl(analytics.summary.bestTrade, 0)}
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
        value={analytics.summary.worstTrade === null ? 'No trade' : formatPnl(analytics.summary.worstTrade, 0)}
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
        value={analytics.maxDrawdown === null ? 'No trades' : formatCurrency(analytics.maxDrawdown, 0)}
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
        value={analytics.currentDrawdown === null ? 'No trades' : formatCurrency(analytics.currentDrawdown, 0)}
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
        value={formatMetricRatio(analytics.riskAverage, 2, 'No risk')}
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

export function isAnalyticsMetricVariant(
  metric: AnalyticsMetricDefinition,
  value: string,
): value is AnalyticsMetricVariant {
  return Boolean(
    metric.visualOptions?.some((option) => option.id === value),
  );
}

export function normalizeAnalyticsMetricVariants(
  values: Record<string, string> | null | undefined,
) {
  const metricVariants: AnalyticsMetricVariantMap = {};

  if (!values) {
    return metricVariants;
  }

  for (const metric of analyticsMetricRegistry) {
    if (!metric.visualOptions || metric.visualOptions.length === 0) {
      continue;
    }

    const value = values[metric.id];

    if (!value || !isAnalyticsMetricVariant(metric, value)) {
      continue;
    }

    metricVariants[metric.id] = value;
  }

  return metricVariants;
}

export function getAnalyticsMetricVariant(
  metric: AnalyticsMetricDefinition,
  metricVariants: AnalyticsMetricVariantMap,
) {
  return metricVariants[metric.id] ?? metric.defaultVariant ?? null;
}
