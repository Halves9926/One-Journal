'use client';

import { useId, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Panel } from '@/components/ui/panel';
import {
  formatChartCurrencyTick,
  getSmartYAxisDomain,
  shouldShowZeroLine,
} from '@/lib/chart-scale';
import {
  formatDistributionBucketLabel,
  formatHoldingAxisValue,
  formatHoldingTime,
  formatRatioMetric,
  type AnalyticsBreakdownItem,
  type AnalyticsDirectionStats,
  type DistributionBucket,
  type EquityPoint,
  type PnlByDayPoint,
  type ScatterPoint,
  type TrendPoint,
} from '@/lib/analytics';
import {
  formatCompactNumber,
  formatCurrency,
  formatPnl,
  getPnlBadgeClassName,
  getPnlTextClassName,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type ChartTooltipEntry = {
  color?: string;
  dataKey?: string;
  name?: string;
  payload?: Record<string, unknown>;
  value?: number | string;
};

type AnalyticsTooltipProps = {
  active?: boolean;
  formatLabel?: (label: string | number | undefined) => string | null;
  formatValue?: (value: number, entry?: ChartTooltipEntry) => string;
  label?: string | number;
  payload?: ChartTooltipEntry[];
  valueTone?: 'neutral' | 'pnl';
};

const axisTickStyle = {
  fill: 'var(--muted)',
  fontSize: 11,
};

const chartColors = {
  accent: 'var(--chart-accent)',
  accentSoft: 'var(--chart-accent-soft)',
  negative: 'var(--chart-negative)',
  neutral: 'var(--chart-neutral)',
  positive: 'var(--chart-positive)',
  surface: 'var(--surface-raised)',
};

function AnalyticsTooltip({
  active,
  formatLabel,
  formatValue = (value) => formatCompactNumber(value, 2),
  label,
  payload,
  valueTone = 'neutral',
}: AnalyticsTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const resolvedLabel = formatLabel ? formatLabel(label) : String(label ?? '');

  return (
    <div className="pointer-events-none max-w-[240px] rounded-[20px] border border-[color:var(--border-strong)] bg-[var(--surface-raised)] px-4 py-3 shadow-[0_24px_48px_-32px_var(--shadow-color)] backdrop-blur">
      {resolvedLabel ? (
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          {resolvedLabel}
        </p>
      ) : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((entry, index) => (
          <div
            key={`${entry.name ?? 'item'}-${entry.dataKey ?? 'value'}-${entry.color ?? 'none'}-${index}`}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex items-center gap-2 text-[var(--muted-strong)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? '#ffffff' }}
              />
              {entry.name}
            </span>
            <span
              className={cx(
                'font-medium text-[var(--foreground)]',
                valueTone === 'pnl' &&
                  typeof entry.value === 'number' &&
                  Number.isFinite(entry.value) &&
                  getPnlTextClassName(entry.value),
              )}
            >
              {typeof entry.value === 'number' && Number.isFinite(entry.value)
                ? formatValue(entry.value, entry)
                : entry.value ?? '--'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 text-center text-sm leading-7 text-[var(--muted)]">
      {message}
    </div>
  );
}

function ChartShell({
  title,
  eyebrow,
  caption,
  badges,
  children,
  className,
}: {
  badges?: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Panel className={cx('h-full p-6 sm:p-7', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            {eyebrow}
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </h3>
          {caption ? (
            <div className="mt-3 text-sm leading-6 text-[var(--muted)]">{caption}</div>
          ) : null}
        </div>
        {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
      </div>
      <div className="h-[320px] pt-5">{children}</div>
    </Panel>
  );
}

export function EquityCurveAnalyticsCard({
  currentDrawdown,
  maxDrawdown,
  points,
}: {
  currentDrawdown: number | null;
  maxDrawdown: number | null;
  points: EquityPoint[];
}) {
  const gradientId = useId().replace(/:/g, '');
  const latestEquity = points.at(-1)?.equity ?? 0;
  const yScale = getSmartYAxisDomain(
    points.map((point) => point.equity),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <ChartShell
      eyebrow="equity"
      title="Equity curve"
      caption="Cumulative PnL across the filtered trade set."
      badges={
        <>
          <span
            className={cx(
              'rounded-full border px-3 py-1.5 text-xs',
              getPnlBadgeClassName(latestEquity),
            )}
          >
            Net {formatPnl(latestEquity, 0)}
          </span>
          {maxDrawdown !== null ? (
            <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
              Max DD {formatCurrency(maxDrawdown, 0)}
            </span>
          ) : null}
          {currentDrawdown !== null ? (
            <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
              Current DD {formatCurrency(currentDrawdown, 0)}
            </span>
          ) : null}
        </>
      }
    >
      {points.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: 6, right: 18, top: 12, bottom: 10 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartColors.accentSoft} />
                <stop offset="50%" stopColor={chartColors.accent} stopOpacity={0.12} />
                <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            {shouldShowZeroLine(yScale.domain) ? (
              <ReferenceLine
                y={0}
                stroke={chartColors.neutral}
                strokeDasharray="3 6"
                strokeOpacity={0.72}
              />
            ) : null}
            <XAxis
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              minTickGap={24}
              height={38}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              domain={yScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatChartCurrencyTick(value, { signed: true })
              }
              tickLine={false}
              tickMargin={12}
              ticks={yScale.ticks}
              width={88}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 6' }}
              content={
                <AnalyticsTooltip
                  formatLabel={(label) => String(label ?? '')}
                  formatValue={(value) => formatPnl(value, 0)}
                  valueTone="pnl"
                />
              }
            />
            <Area
              type="monotone"
              dataKey="equity"
              name="Equity"
              stroke={chartColors.accent}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 6,
                stroke: chartColors.surface,
                strokeWidth: 2,
                fill: chartColors.accent,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Add at least two trades to unlock the curve." />
      )}
    </ChartShell>
  );
}

export function PnlByDayAnalyticsCard({ points }: { points: PnlByDayPoint[] }) {
  const yScale = getSmartYAxisDomain(
    points.map((point) => point.netPnl),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <ChartShell
      eyebrow="calendar"
      title="PnL by day"
      caption="Daily net outcome across the current filter set."
    >
      {points.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ left: 8, right: 18, top: 12, bottom: 10 }}>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            {shouldShowZeroLine(yScale.domain) ? (
              <ReferenceLine y={0} stroke={chartColors.neutral} strokeDasharray="3 6" />
            ) : null}
            <XAxis
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              minTickGap={18}
              height={38}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              domain={yScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatChartCurrencyTick(value, { signed: true })
              }
              tickLine={false}
              tickMargin={12}
              ticks={yScale.ticks}
              width={88}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft-bg)' }}
              content={
                <AnalyticsTooltip
                  formatValue={(value) => formatPnl(value, 0)}
                  valueTone="pnl"
                />
              }
            />
            <Bar dataKey="netPnl" name="PnL" radius={[12, 12, 12, 12]} maxBarSize={26}>
              {points.map((point, index) => (
                <Cell
                  key={`${point.date}-${index}`}
                  fill={point.netPnl < 0 ? chartColors.negative : chartColors.positive}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="No dated trades yet inside this filter scope." />
      )}
    </ChartShell>
  );
}

export function SessionPerformanceAnalyticsCard({
  items,
}: {
  items: AnalyticsBreakdownItem[];
}) {
  const xScale = getSmartYAxisDomain(
    items.map((item) => item.netPnl),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <ChartShell
      eyebrow="session"
      title="PnL by session"
      caption="Which trading session is actually paying you."
    >
      {items.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} layout="vertical" margin={{ left: 10, right: 18, top: 12, bottom: 10 }}>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              horizontal={false}
            />
            {shouldShowZeroLine(xScale.domain) ? (
              <ReferenceLine x={0} stroke={chartColors.neutral} strokeDasharray="3 6" />
            ) : null}
            <XAxis
              type="number"
              domain={xScale.domain}
              axisLine={false}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatChartCurrencyTick(value, { signed: true })
              }
              tickLine={false}
              tickMargin={12}
              ticks={xScale.ticks}
            />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              width={92}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft-bg)' }}
              content={
                <AnalyticsTooltip
                  formatValue={(value, entry) => {
                    if (entry?.dataKey === 'count') {
                      return `${value} trades`;
                    }

                    return formatPnl(value, 0);
                  }}
                  valueTone="pnl"
                />
              }
            />
            <Bar dataKey="netPnl" name="Net PnL" radius={[12, 12, 12, 12]} maxBarSize={24}>
              {items.map((item, index) => (
                <Cell
                  key={`${item.label}-${index}`}
                  fill={item.netPnl < 0 ? chartColors.negative : chartColors.positive}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Session analytics unlock once trades include session tags." />
      )}
    </ChartShell>
  );
}

export function SymbolWinRateAnalyticsCard({
  items,
}: {
  items: AnalyticsBreakdownItem[];
}) {
  return (
    <ChartShell
      eyebrow="symbol"
      title="Win rate by symbol"
      caption="Top symbols by conversion rate within the filtered sample."
    >
      {items.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} margin={{ left: 8, right: 18, top: 12, bottom: 10 }}>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              height={38}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tick={axisTickStyle}
              tickFormatter={(value: number) => `${formatCompactNumber(value, 0)}%`}
              tickLine={false}
              tickMargin={12}
              width={62}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft-bg)' }}
              content={
                <AnalyticsTooltip
                  formatValue={(value, entry) => {
                    if (entry?.dataKey === 'winRate') {
                      return `${formatCompactNumber(value, 1)}%`;
                    }

                    return `${value} trades`;
                  }}
                />
              }
            />
            <Bar dataKey="winRate" name="Win rate" radius={[12, 12, 12, 12]} fill={chartColors.accent} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Add more symbol diversity to compare conversion properly." />
      )}
    </ChartShell>
  );
}

export function LongShortAnalyticsCard({
  longStats,
  shortStats,
}: {
  longStats: AnalyticsDirectionStats;
  shortStats: AnalyticsDirectionStats;
}) {
  const data = [longStats, shortStats];
  const pnlScale = getSmartYAxisDomain(
    data.map((item) => item.netPnl),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );
  const winRateScale = getSmartYAxisDomain(
    data.map((item) => item.winRate),
    {
      maxValue: 100,
      minRange: 10,
      minValue: 0,
      paddingRatio: 0.18,
      tickCount: 4,
    },
  );

  return (
    <ChartShell
      eyebrow="direction"
      title="Long vs short"
      caption="Directional performance, net PnL and trade count side by side."
    >
      {data.some((item) => item.count > 0) ? (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 18, top: 12, bottom: 10 }}>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            {shouldShowZeroLine(pnlScale.domain) ? (
              <ReferenceLine
                yAxisId="left"
                y={0}
                stroke={chartColors.neutral}
                strokeDasharray="3 6"
              />
            ) : null}
            <XAxis
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              height={38}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              domain={pnlScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatChartCurrencyTick(value, { signed: true })
              }
              tickLine={false}
              tickMargin={12}
              ticks={pnlScale.ticks}
              width={84}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              domain={winRateScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) => `${formatCompactNumber(value, 0)}%`}
              tickLine={false}
              tickMargin={12}
              ticks={winRateScale.ticks}
              width={64}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft-bg)' }}
              content={
                <AnalyticsTooltip
                  formatValue={(value, entry) => {
                    if (entry?.dataKey === 'winRate') {
                      return `${formatCompactNumber(value, 1)}%`;
                    }

                    return formatPnl(value, 0);
                  }}
                  valueTone="pnl"
                />
              }
            />
            <Bar yAxisId="left" dataKey="netPnl" name="Net PnL" radius={[12, 12, 12, 12]} maxBarSize={42}>
              {data.map((item, index) => (
                <Cell
                  key={`${item.label}-${index}`}
                  fill={item.netPnl < 0 ? chartColors.negative : chartColors.positive}
                />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="winRate"
              name="Win rate"
              stroke={chartColors.accent}
              strokeWidth={2.5}
              dot={{ fill: chartColors.accent, r: 4 }}
              activeDot={{ fill: chartColors.accent, r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Direction analytics appear once trades are tagged long or short." />
      )}
    </ChartShell>
  );
}

export function DistributionAnalyticsCard({
  items,
  mode,
  title,
  eyebrow,
  caption,
}: {
  caption: string;
  eyebrow: string;
  items: DistributionBucket[];
  mode: 'pnl' | 'rr';
  title: string;
}) {
  const data = items.map((item) => ({
    ...item,
    displayLabel: mode === 'rr' ? item.label : formatDistributionBucketLabel(item, mode),
  }));

  return (
    <ChartShell eyebrow={eyebrow} title={title} caption={caption}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 18, top: 12, bottom: 18 }}>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <XAxis
              dataKey="displayLabel"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              minTickGap={12}
              height={46}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              width={60}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft-bg)' }}
              content={
                <AnalyticsTooltip
                  formatLabel={(label) => String(label ?? '')}
                  formatValue={(value, entry) => {
                    if (entry?.dataKey === 'count') {
                      return `${value} trades`;
                    }

                    return mode === 'rr'
                      ? formatRatioMetric(value, 2)
                      : formatPnl(value, 0);
                  }}
                  valueTone={mode === 'pnl' ? 'pnl' : 'neutral'}
                />
              }
            />
            <Bar dataKey="count" name="Trades" radius={[12, 12, 12, 12]} fill={chartColors.accent} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState
          message={
            mode === 'rr'
              ? 'RR distribution needs trades with valid RR values.'
              : 'PnL distribution appears once filtered trades have outcomes.'
          }
        />
      )}
    </ChartShell>
  );
}

export function WeekdayPerformanceAnalyticsCard({
  items,
}: {
  items: AnalyticsBreakdownItem[];
}) {
  const yScale = getSmartYAxisDomain(
    items.map((item) => item.netPnl),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <ChartShell
      eyebrow="weekday"
      title="Weekday performance"
      caption="Net PnL mapped across the trading week."
    >
      {items.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} margin={{ left: 8, right: 18, top: 12, bottom: 10 }}>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            {shouldShowZeroLine(yScale.domain) ? (
              <ReferenceLine y={0} stroke={chartColors.neutral} strokeDasharray="3 6" />
            ) : null}
            <XAxis
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              height={38}
              interval={0}
            />
            <YAxis
              axisLine={false}
              domain={yScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatChartCurrencyTick(value, { signed: true })
              }
              tickLine={false}
              tickMargin={12}
              ticks={yScale.ticks}
              width={86}
            />
            <Tooltip
              cursor={{ fill: 'var(--accent-soft-bg)' }}
              content={
                <AnalyticsTooltip
                  formatValue={(value) => formatPnl(value, 0)}
                  valueTone="pnl"
                />
              }
            />
            <Bar dataKey="netPnl" name="Net PnL" radius={[12, 12, 12, 12]} maxBarSize={28}>
              {items.map((item, index) => (
                <Cell
                  key={`${item.label}-${index}`}
                  fill={item.netPnl < 0 ? chartColors.negative : chartColors.positive}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Weekday performance unlocks once trades have valid dates." />
      )}
    </ChartShell>
  );
}

export function DrawdownCurveAnalyticsCard({
  currentDrawdown,
  maxDrawdown,
  points,
}: {
  currentDrawdown: number | null;
  maxDrawdown: number | null;
  points: EquityPoint[];
}) {
  const gradientId = useId().replace(/:/g, '');
  const yScale = getSmartYAxisDomain(
    points.map((point) => point.drawdown),
    {
      includeZero: true,
      minValue: 0,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <ChartShell
      eyebrow="risk"
      title="Drawdown curve"
      caption="Peak-to-trough pressure across the filtered trade stream."
      badges={
        <>
          {maxDrawdown !== null ? (
            <span className="rounded-full border border-[color:var(--pnl-negative-border)] bg-[var(--pnl-negative-surface)] px-3 py-1.5 text-xs text-[color:var(--pnl-negative-text)]">
              Max {formatCurrency(maxDrawdown, 0)}
            </span>
          ) : null}
          {currentDrawdown !== null ? (
            <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
              Current {formatCurrency(currentDrawdown, 0)}
            </span>
          ) : null}
        </>
      }
    >
      {points.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: 6, right: 18, top: 12, bottom: 10 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartColors.negative} stopOpacity={0.26} />
                <stop offset="100%" stopColor={chartColors.negative} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            <ReferenceLine
              y={0}
              stroke={chartColors.neutral}
              strokeDasharray="3 6"
              strokeOpacity={0.72}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              minTickGap={24}
              height={38}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              domain={yScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) => formatChartCurrencyTick(value)}
              tickLine={false}
              tickMargin={12}
              ticks={yScale.ticks}
              width={86}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 6' }}
              content={
                <AnalyticsTooltip
                  formatValue={(value) => formatCurrency(value, 0)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="drawdown"
              name="Drawdown"
              stroke={chartColors.negative}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                stroke: chartColors.surface,
                strokeWidth: 2,
                fill: chartColors.negative,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Drawdown appears after at least two trades." />
      )}
    </ChartShell>
  );
}

export function DurationScatterAnalyticsCard({
  averageHoldingMinutes,
  points,
}: {
  averageHoldingMinutes: number | null;
  points: ScatterPoint[];
}) {
  const pnlScale = getSmartYAxisDomain(
    points.map((point) => point.pnl),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <ChartShell
      eyebrow="duration"
      title="Trade duration vs PnL"
      caption="Holding time plotted against actual result."
      badges={
        averageHoldingMinutes !== null ? (
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
            Avg hold {formatHoldingTime(averageHoldingMinutes)}
          </span>
        ) : null
      }
    >
      {points.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 8, right: 18, top: 12, bottom: 10 }}>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
            />
            {shouldShowZeroLine(pnlScale.domain) ? (
              <ReferenceLine y={0} stroke={chartColors.neutral} strokeDasharray="3 6" />
            ) : null}
            <XAxis
              type="number"
              dataKey="durationMinutes"
              name="Duration"
              axisLine={false}
              tick={axisTickStyle}
              tickFormatter={(value: number) => formatHoldingAxisValue(value)}
              tickLine={false}
              tickMargin={12}
              height={38}
            />
            <YAxis
              type="number"
              dataKey="pnl"
              name="PnL"
              axisLine={false}
              domain={pnlScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatChartCurrencyTick(value, { signed: true })
              }
              tickLine={false}
              tickMargin={12}
              ticks={pnlScale.ticks}
              width={86}
            />
            <Tooltip
              cursor={{ strokeDasharray: '4 6', stroke: 'var(--border-strong)' }}
              content={
                <AnalyticsTooltip
                  formatLabel={(label) => String(label ?? '')}
                  formatValue={(value, entry) => {
                    if (entry?.dataKey === 'durationMinutes') {
                      return formatHoldingTime(value);
                    }

                    return formatPnl(value, 0);
                  }}
                  valueTone="pnl"
                />
              }
            />
            <Scatter data={points} name="Trades" fill={chartColors.accent}>
              {points.map((point, index) => (
                <Cell
                  key={`${point.tradeId}-${index}`}
                  fill={point.pnl < 0 ? chartColors.negative : chartColors.positive}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Duration scatter needs at least two trades with open and close time." />
      )}
    </ChartShell>
  );
}

export function RecentTrendAnalyticsCard({ points }: { points: TrendPoint[] }) {
  const gradientId = useId().replace(/:/g, '');
  const yScale = getSmartYAxisDomain(
    points.map((point) => point.rollingPnl),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <ChartShell
      eyebrow="trend"
      title="Recent performance trend"
      caption="Rolling five-trade net PnL to show current momentum."
    >
      {points.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: 6, right: 18, top: 12, bottom: 10 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartColors.accentSoft} />
                <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border-color)"
              strokeDasharray="4 8"
              vertical={false}
            />
            {shouldShowZeroLine(yScale.domain) ? (
              <ReferenceLine y={0} stroke={chartColors.neutral} strokeDasharray="3 6" />
            ) : null}
            <XAxis
              dataKey="label"
              axisLine={false}
              tick={axisTickStyle}
              tickLine={false}
              tickMargin={12}
              minTickGap={14}
              height={38}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              domain={yScale.domain}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatChartCurrencyTick(value, { signed: true })
              }
              tickLine={false}
              tickMargin={12}
              ticks={yScale.ticks}
              width={86}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 6' }}
              content={
                <AnalyticsTooltip
                  formatValue={(value, entry) => {
                    if (entry?.dataKey === 'rollingWinRate') {
                      return `${formatCompactNumber(value, 1)}%`;
                    }

                    return formatPnl(value, 0);
                  }}
                  valueTone="pnl"
                />
              }
            />
            <Area
              type="monotone"
              dataKey="rollingPnl"
              name="Rolling PnL"
              stroke={chartColors.accent}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                stroke: chartColors.surface,
                strokeWidth: 2,
                fill: chartColors.accent,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState message="Recent trend needs a small run of trades before it becomes useful." />
      )}
    </ChartShell>
  );
}
