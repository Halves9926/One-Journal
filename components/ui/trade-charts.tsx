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
  formatCompactNumber,
  formatSignedNumber,
  type TradeView,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
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

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
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
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.color}`}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex items-center gap-2 text-[var(--muted-strong)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? '#ffffff' }}
              />
              {entry.name}
            </span>
            <span className="font-medium text-[var(--foreground)]">
              {typeof entry.value === 'number'
                ? formatCompactNumber(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildEquityData(trades: TradeView[]) {
  const sortedTrades = [...trades].sort((a, b) => {
    const left = a.date ? new Date(a.date).valueOf() : 0;
    const right = b.date ? new Date(b.date).valueOf() : 0;
    return left - right;
  });

  let cumulative = 0;

  return sortedTrades.map((trade, index) => {
    cumulative += trade.pnl ?? 0;

    return {
      equity: Number(cumulative.toFixed(2)),
      label: trade.date
        ? new Date(trade.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          })
        : `T${index + 1}`,
    };
  });
}

function buildPerformanceData(trades: TradeView[]) {
  return trades
    .slice(0, 12)
    .reverse()
    .map((trade, index) => ({
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
  className,
  trades,
}: {
  className?: string;
  trades: TradeView[];
}) {
  const gradientId = useId().replace(/:/g, '');
  const data = buildEquityData(trades);

  if (data.length <= 1) {
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
              <stop offset="100%" stopColor="rgba(190,24,93,0)" />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: chartColors.accentSoft, strokeDasharray: '4 6' }}
            content={<ChartTooltip />}
          />
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

export function EquityCurveCard({ trades }: { trades: TradeView[] }) {
  const gradientId = useId().replace(/:/g, '');
  const data = buildEquityData(trades);
  const latestValue = data.at(-1)?.equity ?? 0;
  const recentWindowValue = buildRecentWindowValue(trades);

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
              <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
                Last 5 {formatSignedNumber(recentWindowValue)}
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={cx(
            'text-sm font-medium',
            latestValue < 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]',
          )}
        >
          Current {formatSignedNumber(latestValue)}
        </span>
      </div>

      <div className="h-[300px] pt-5">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 6, right: 18, top: 12, bottom: 10 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.accentSoft} />
                  <stop offset="52%" stopColor="rgba(190,24,93,0.12)" />
                  <stop offset="100%" stopColor="rgba(190,24,93,0)" />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--border-color)"
                strokeDasharray="4 8"
                vertical={false}
              />
              <ReferenceLine y={0} stroke={chartColors.neutral} strokeDasharray="3 6" />
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
                tick={axisTickStyle}
                tickLine={false}
                tickFormatter={(value: number) => formatCompactNumber(value, 1)}
                tickMargin={12}
                width={76}
              />
              <Tooltip
                cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 6' }}
                content={<ChartTooltip />}
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
              <ReferenceLine y={0} stroke={chartColors.neutral} strokeDasharray="3 6" />
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
                tick={axisTickStyle}
                tickLine={false}
                tickFormatter={(value: number) => formatCompactNumber(value, 1)}
                tickMargin={12}
                width={76}
              />
              <Tooltip
                cursor={{ fill: 'rgba(190,24,93,0.06)' }}
                content={<ChartTooltip />}
              />
              <Bar dataKey="pnl" radius={[12, 12, 12, 12]} maxBarSize={26}>
                {data.map((entry) => (
                  <Cell
                    key={`${entry.label}-${entry.pnl}`}
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
  const data = [
    { fill: chartColors.positive, label: 'Wins', value: wins },
    { fill: chartColors.negative, label: 'Losses', value: losses },
    { fill: chartColors.neutral, label: 'Flat', value: breakeven },
  ].filter((entry) => entry.value > 0);

  const total = wins + losses + breakeven;
  const rate = total > 0 ? `${Math.round((wins / Math.max(total, 1)) * 100)}%` : '0%';

  return (
    <Panel className="h-full p-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
          Outcome
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Win / loss
        </h3>
      </div>

      <div className="grid gap-6 pt-5">
        <div className="relative mx-auto aspect-square w-full max-w-[248px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius="64%"
                  outerRadius="86%"
                  paddingAngle={4}
                  stroke="var(--background)"
                  strokeWidth={4}
                >
                  {data.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-full border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] text-sm text-[var(--muted)]">
              No outcomes yet
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-5 py-4 shadow-[0_18px_34px_-24px_var(--shadow-color)]">
              <span className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {rate}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                win rate
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Wins', value: wins, tone: 'text-[var(--foreground)]' },
            { label: 'Losses', value: losses, tone: 'text-[var(--danger)]' },
            { label: 'Flat', value: breakeven, tone: 'text-[var(--muted)]' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_26px_-24px_var(--shadow-color)]"
            >
              <p className="text-sm text-[var(--muted)]">{item.label}</p>
              <p className={cx('mt-2 text-2xl font-semibold', item.tone)}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
