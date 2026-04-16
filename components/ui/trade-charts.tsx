'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_20px_42px_-28px_rgba(15,23,42,0.2)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
        {label}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.color}`}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex items-center gap-2 text-neutral-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color ?? '#ffffff' }}
              />
              {entry.name}
            </span>
            <span className="font-medium text-neutral-950">
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

export function EquityCurveCard({ trades }: { trades: TradeView[] }) {
  const data = buildEquityData(trades);
  const latestValue = data.at(-1)?.equity ?? 0;

  return (
    <Panel className="h-full">
      <div className="border-b border-neutral-200 px-6 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
          Equity
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-tight text-neutral-950">
            Curve
          </h3>
          <span
            className={cx(
              'text-sm font-medium',
              latestValue < 0 ? 'text-rose-700' : 'text-neutral-950',
            )}
          >
            {formatSignedNumber(latestValue)}
          </span>
        </div>
      </div>

      <div className="h-[280px] px-3 py-4 sm:px-5">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ left: -16, right: 8, top: 12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="equityFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(159,18,57,0.18)" />
                  <stop offset="55%" stopColor="rgba(190,24,93,0.08)" />
                  <stop offset="100%" stopColor="rgba(190,24,93,0)" />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgba(24,24,27,0.08)"
                strokeDasharray="4 8"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(82,82,91,0.92)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: 'rgba(82,82,91,0.88)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#7f1d1d"
                strokeWidth={2.5}
                fill="url(#equityFill)"
                activeDot={{
                  r: 5,
                  stroke: '#ffffff',
                  strokeWidth: 2,
                  fill: '#9f1239',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
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
    <Panel className="h-full">
      <div className="border-b border-neutral-200 px-6 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
          Performance
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
          Outcomes
        </h3>
      </div>

      <div className="h-[280px] px-3 py-4 sm:px-5">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ left: -16, right: 8, top: 12, bottom: 0 }}
            >
              <CartesianGrid
                stroke="rgba(24,24,27,0.08)"
                strokeDasharray="4 8"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(82,82,91,0.92)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={18}
              />
              <YAxis
                tick={{ fill: 'rgba(82,82,91,0.88)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="pnl" radius={[10, 10, 10, 10]} barSize={20}>
                {data.map((entry) => (
                  <Cell
                    key={`${entry.label}-${entry.pnl}`}
                    fill={entry.pnl < 0 ? '#e11d48' : '#111827'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
            No performance data
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
    { fill: '#111827', label: 'Wins', value: wins },
    { fill: '#9f1239', label: 'Losses', value: losses },
    { fill: '#d4d4d8', label: 'Flat', value: breakeven },
  ].filter((entry) => entry.value > 0);

  const total = wins + losses + breakeven;
  const rate =
    total > 0 ? `${Math.round((wins / Math.max(total, 1)) * 100)}%` : '0%';

  return (
    <Panel className="h-full">
      <div className="border-b border-neutral-200 px-6 py-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
          Outcome
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
          Win / loss
        </h3>
      </div>

      <div className="grid gap-6 px-6 py-6">
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
                  stroke="#faf7f2"
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
            <div className="flex h-full items-center justify-center rounded-full border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-500">
              No data
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center rounded-full bg-white/86 px-5 py-4 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.18)]">
              <span className="text-3xl font-semibold tracking-tight text-neutral-950">
                {rate}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                win rate
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Wins', value: wins, tone: 'text-neutral-950' },
            { label: 'Losses', value: losses, tone: 'text-rose-700' },
            { label: 'Flat', value: breakeven, tone: 'text-neutral-500' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-neutral-200 bg-white p-4 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.16)]"
            >
              <p className="text-sm text-neutral-500">{item.label}</p>
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
