'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
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
  formatCompactNumber,
  formatCurrency,
  formatPnl,
  getPnlBadgeClassName,
  getPnlTextClassName,
  type TradeView,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type ChartTooltipProps = {
  active?: boolean;
  formatter?: (value: number) => string;
  label?: string;
  valueTone?: 'neutral' | 'pnl';
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number | string;
  }>;
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

function ChartTooltip({
  active,
  formatter = (value) => formatCompactNumber(value),
  label,
  payload,
  valueTone = 'neutral',
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none max-w-[220px] rounded-[20px] border border-[color:var(--border-strong)] bg-[var(--surface-raised)] px-4 py-3 shadow-[0_24px_48px_-32px_var(--shadow-color)] backdrop-blur">
      {label ? (
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          {label}
        </p>
      ) : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((entry, index) => (
          <div
            key={`${entry.name ?? 'item'}-${entry.color ?? 'none'}-${index}`}
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
                ? formatter(entry.value)
                : entry.value ?? '--'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildEquityData(trades: TradeView[], baselineEquity = 0) {
  const sortedTrades = [...trades].sort((a, b) => {
    const left = a.date ? new Date(a.date).valueOf() : 0;
    const right = b.date ? new Date(b.date).valueOf() : 0;
    return left - right;
  });

  let cumulative = baselineEquity;
  const points = trades.length > 0
    ? [
        {
          equity: Number(cumulative.toFixed(2)),
          label: 'Start',
        },
      ]
    : [];

  sortedTrades.forEach((trade, index) => {
    cumulative += trade.pnl ?? 0;

    points.push({
      equity: Number(cumulative.toFixed(2)),
      label: trade.date
        ? new Date(trade.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          })
        : `T${index + 1}`,
    });
  });

  return points;
}

function buildPerformanceData(trades: TradeView[]) {
  return trades
    .slice(0, 12)
    .reverse()
    .map((trade, index) => ({
      chartKey: trade.id
        ? `${trade.id}-${index}`
        : `${trade.date ?? 'undated'}-${trade.pnl ?? 0}-${index}`,
      label: trade.date
        ? new Date(trade.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          })
        : `T${index + 1}`,
      pnl: Number((trade.pnl ?? 0).toFixed(2)),
    }));
}

function buildRecentWindowValue(trades: TradeView[], limit = 5) {
  if (trades.length === 0) {
    return null;
  }

  return trades
    .slice(0, Math.min(limit, trades.length))
    .reduce((total, trade) => total + (trade.pnl ?? 0), 0);
}

export function EquitySparkline({
  baselineEquity = 0,
  className,
  trades,
}: {
  baselineEquity?: number;
  className?: string;
  trades: TradeView[];
}) {
  const gradientId = useId().replace(/:/g, '');
  const data = buildEquityData(trades, baselineEquity);
  const yScale = getSmartYAxisDomain(
    data.map((point) => point.equity),
    {
      includeZero: false,
      minRange: Math.max(Math.abs(baselineEquity) * 0.002, 1),
      paddingRatio: 0.18,
      tickCount: 3,
    },
  );

  if (trades.length === 0) {
    return (
      <div
        className={cx(
          'flex h-full items-center justify-center rounded-[24px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] text-sm text-[var(--muted)]',
          className,
        )}
      >
        Add trades to unlock the curve
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={chartColors.accentSoft} />
              <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: chartColors.accentSoft, strokeDasharray: '4 6' }}
            content={<ChartTooltip formatter={(value) => formatChartCurrencyTick(value)} />}
          />
          <YAxis hide domain={yScale.domain} />
          {baselineEquity >= yScale.domain[0] && baselineEquity <= yScale.domain[1] ? (
            <ReferenceLine
              y={baselineEquity}
              stroke={chartColors.neutral}
              strokeDasharray="3 6"
              strokeOpacity={0.5}
            />
          ) : null}
          <Area
            type="natural"
            dataKey="equity"
            stroke={chartColors.accent}
            strokeWidth={2.5}
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
    </div>
  );
}

export function EquityCurveCard({
  baselineEquity = 0,
  trades,
}: {
  baselineEquity?: number;
  trades: TradeView[];
}) {
  const gradientId = useId().replace(/:/g, '');
  const data = buildEquityData(trades, baselineEquity);
  const latestValue = data.at(-1)?.equity ?? baselineEquity;
  const latestDelta = latestValue - baselineEquity;
  const recentWindowValue = buildRecentWindowValue(trades);
  const yScale = getSmartYAxisDomain(
    data.map((point) => point.equity),
    {
      includeZero: false,
      minRange: Math.max(Math.abs(baselineEquity) * 0.002, 1),
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <Panel className="h-full p-6 sm:p-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            Equity
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Curve
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
              {trades.length} tracked trades
            </span>
            {recentWindowValue !== null ? (
              <span
                className={cx(
                  'rounded-full border px-3 py-1.5 text-xs',
                  getPnlBadgeClassName(recentWindowValue),
                )}
              >
                Last 5 {formatPnl(recentWindowValue)}
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={cx(
            'text-sm font-medium',
            getPnlTextClassName(latestDelta),
          )}
        >
          Current {formatCurrency(latestValue)}
        </span>
      </div>

      <div className="h-[300px] pt-5">
        {trades.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 6, right: 18, top: 12, bottom: 10 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.accentSoft} />
                  <stop offset="52%" stopColor={chartColors.accent} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--border-color)"
                strokeDasharray="4 8"
                vertical={false}
              />
              {baselineEquity >= yScale.domain[0] && baselineEquity <= yScale.domain[1] ? (
                <ReferenceLine
                  y={baselineEquity}
                  stroke={chartColors.neutral}
                  strokeDasharray="3 6"
                  strokeOpacity={0.55}
                />
              ) : null}
              <XAxis
                dataKey="label"
                axisLine={false}
                tick={axisTickStyle}
                tickLine={false}
                tickMargin={12}
                minTickGap={28}
                height={38}
                padding={{ left: 12, right: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                domain={yScale.domain}
                tick={axisTickStyle}
                tickLine={false}
                tickFormatter={(value: number) => formatChartCurrencyTick(value)}
                tickMargin={12}
                ticks={yScale.ticks}
                width={92}
              />
              <Tooltip
                cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 6' }}
                content={<ChartTooltip formatter={(value) => formatChartCurrencyTick(value)} />}
              />
              <Area
                type="natural"
                dataKey="equity"
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
          <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] text-sm text-[var(--muted)]">
            Add trades to render the curve
          </div>
        )}
      </div>
    </Panel>
  );
}

export function PnlBarsCard({ trades }: { trades: TradeView[] }) {
  const data = buildPerformanceData(trades);
  const yScale = getSmartYAxisDomain(
    data.map((point) => point.pnl),
    {
      includeZero: true,
      paddingRatio: 0.18,
      tickCount: 5,
    },
  );

  return (
    <Panel className="h-full p-6 sm:p-7">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
          Performance
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Outcomes
        </h3>
      </div>

      <div className="h-[300px] pt-5">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 8, right: 18, top: 12, bottom: 10 }}>
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
                minTickGap={22}
                height={38}
                padding={{ left: 12, right: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                domain={yScale.domain}
                tick={axisTickStyle}
                tickLine={false}
                tickFormatter={(value: number) =>
                  formatChartCurrencyTick(value, { signed: true })
                }
                tickMargin={12}
                ticks={yScale.ticks}
                width={92}
              />
              <Tooltip
                cursor={{ fill: 'var(--accent-soft-bg)' }}
                content={<ChartTooltip formatter={(value) => formatPnl(value)} valueTone="pnl" />}
              />
              <Bar dataKey="pnl" radius={[12, 12, 12, 12]} maxBarSize={26}>
                {data.map((entry) => (
                  <Cell
                    key={entry.chartKey}
                    fill={entry.pnl < 0 ? chartColors.negative : chartColors.positive}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] text-sm text-[var(--muted)]">
            No outcomes yet
          </div>
        )}
      </div>
    </Panel>
  );
}

export function WinLossCard({
  breakeven = 0,
  losses,
  wins,
}: {
  breakeven?: number;
  losses: number;
  wins: number;
}) {
  const outcomeData = [
    { fill: chartColors.positive, label: 'Wins', value: wins },
    { fill: chartColors.negative, label: 'Losses', value: losses },
    { fill: chartColors.neutral, label: 'Breakevens', value: breakeven },
  ].filter((entry) => entry.value > 0);
  const total = wins + losses + breakeven;
  const hasOutcomes = total > 0;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const chartData = hasOutcomes
    ? outcomeData
    : [{ fill: chartColors.neutral, label: 'Waiting', value: 1 }];
  const statCards = [
    { fill: chartColors.positive, label: 'Wins', value: wins },
    { fill: chartColors.negative, label: 'Losses', value: losses },
    { fill: chartColors.neutral, label: 'BE', value: breakeven },
  ];

  return (
    <Panel className="h-full p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
            Outcome
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Win rate
          </h3>
        </div>
        <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
          {total} outcomes
        </span>
      </div>

      <div className="mt-5 rounded-[32px] border border-[color:var(--border-color)] bg-[radial-gradient(circle_at_top,var(--chart-accent-soft),transparent_62%),linear-gradient(180deg,var(--surface-raised),var(--surface))] px-4 py-5 shadow-[0_28px_62px_-40px_var(--shadow-color)] sm:px-5 sm:py-6">
        <div className="mx-auto flex max-w-[336px] flex-col items-center">
          <div className="relative aspect-square w-full max-w-[292px]">
            <div className="pointer-events-none absolute inset-[-10%] rounded-full bg-[radial-gradient(circle,var(--chart-accent-soft),transparent_72%)] blur-[40px]" />
            <div className="pointer-events-none absolute inset-[7%] rounded-full border border-[color:var(--border-color)] bg-[radial-gradient(circle,rgba(255,255,255,0.04),transparent_74%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ label: 'Track', value: 100 }]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="90%"
                  isAnimationActive={false}
                  fill="rgba(255,255,255,0.06)"
                  stroke="transparent"
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  startAngle={110}
                  endAngle={-250}
                  innerRadius="68%"
                  outerRadius="90%"
                  paddingAngle={hasOutcomes ? 5 : 0}
                  cornerRadius={12}
                  stroke="var(--surface-strong)"
                  strokeWidth={6}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`${entry.label}-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                {hasOutcomes ? (
                  <Tooltip content={<ChartTooltip formatter={(value) => `${value}`} />} />
                ) : null}
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="flex aspect-square w-[54%] flex-col items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-5 text-center shadow-[0_24px_48px_-30px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.12)]">
                <span className="text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
                  Win Rate
                </span>
                <p className="mt-2 text-[2.65rem] font-semibold leading-none tracking-[-0.06em] text-[var(--foreground)]">
                  {winRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {statCards.map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-[22px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-3 py-3 text-center shadow-[0_18px_36px_-30px_var(--shadow-color)]"
              >
                <div className="flex min-w-0 items-center justify-center gap-2">
                  <span
                    className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <p className="min-w-0 break-words text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] sm:text-[11px] sm:tracking-[0.24em]">
                    {item.label}
                  </p>
                </div>
                <p className="mt-2.5 break-words text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
