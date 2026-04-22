'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import {
  formatPnl,
  formatTradeDate,
  getPnlBadgeClassName,
  getPnlTextClassName,
  type TradeView,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type CalendarDaySummary = {
  bestTrade: TradeView | null;
  breakeven: number;
  count: number;
  date: Date;
  dateKey: string;
  losses: number;
  netPnl: number;
  trades: TradeView[];
  wins: number;
  worstTrade: TradeView | null;
};

type TradeCalendarViewProps = {
  className?: string;
  emptyMessage?: string;
  trades: TradeView[];
};

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getTradeDateKey(trade: TradeView) {
  const directDate = trade.date?.trim();

  if (directDate) {
    const isoDate = directDate.match(/^(\d{4}-\d{2}-\d{2})/);

    if (isoDate) {
      return isoDate[1];
    }

    const parsedDirectDate = new Date(directDate);

    if (!Number.isNaN(parsedDirectDate.valueOf())) {
      return toDateKey(parsedDirectDate);
    }
  }

  const fallbackDate = trade.createdAt ?? trade.updatedAt;

  if (!fallbackDate) {
    return null;
  }

  const parsedFallbackDate = new Date(fallbackDate);

  return Number.isNaN(parsedFallbackDate.valueOf())
    ? null
    : toDateKey(parsedFallbackDate);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDates(monthDate: Date) {
  const monthStart = startOfMonth(monthDate);
  const startOffset = (monthStart.getDay() + 6) % 7;
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    return date;
  });
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  });
}

function buildDaySummary(dateKey: string, trades: TradeView[]) {
  const sortedTrades = [...trades].sort((leftTrade, rightTrade) => {
    const leftPnl = leftTrade.pnl ?? 0;
    const rightPnl = rightTrade.pnl ?? 0;

    return rightPnl - leftPnl;
  });
  const wins = trades.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const losses = trades.filter((trade) => (trade.pnl ?? 0) < 0).length;
  const parsedDate = parseDateKey(dateKey) ?? new Date();

  return {
    bestTrade: sortedTrades[0] ?? null,
    breakeven: trades.length - wins - losses,
    count: trades.length,
    date: parsedDate,
    dateKey,
    losses,
    netPnl: trades.reduce((total, trade) => total + (trade.pnl ?? 0), 0),
    trades,
    wins,
    worstTrade: sortedTrades[sortedTrades.length - 1] ?? null,
  } satisfies CalendarDaySummary;
}

function ArrowIcon({
  className,
  direction,
}: {
  className?: string;
  direction: 'left' | 'right';
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 20 20"
    >
      {direction === 'left' ? (
        <path d="m12 4-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m8 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function TradeMiniRow({ trade }: { trade: TradeView }) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {trade.symbol || 'Saved trade'}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {trade.bias ?? 'No bias'} / {formatTradeDate(trade.date)}
          </p>
        </div>
        <span
          className={cx(
            'shrink-0 text-sm font-semibold',
            getPnlTextClassName(trade.pnl),
          )}
        >
          {trade.pnl === null ? 'Open' : formatPnl(trade.pnl)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {trade.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-2 py-1 text-[11px] text-[var(--muted-strong)]"
          >
            {tag}
          </span>
        ))}
        {trade.shareEnabled ? (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">
            Shared
          </span>
        ) : null}
        <Link
          className="ml-auto rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
          href={`/trades/${trade.id}/edit`}
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

export default function TradeCalendarView({
  className,
  emptyMessage = 'No trades available for this calendar.',
  trades,
}: TradeCalendarViewProps) {
  const summariesByDate = useMemo(() => {
    const groups = new Map<string, TradeView[]>();

    for (const trade of trades) {
      const dateKey = getTradeDateKey(trade);

      if (!dateKey) {
        continue;
      }

      groups.set(dateKey, [...(groups.get(dateKey) ?? []), trade]);
    }

    return new Map(
      [...groups.entries()].map(([dateKey, groupedTrades]) => [
        dateKey,
        buildDaySummary(dateKey, groupedTrades),
      ]),
    );
  }, [trades]);
  const initialMonth = useMemo(() => {
    const firstSummary = [...summariesByDate.values()].sort(
      (leftSummary, rightSummary) =>
        rightSummary.date.valueOf() - leftSummary.date.valueOf(),
    )[0];

    return startOfMonth(firstSummary?.date ?? new Date());
  }, [summariesByDate]);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    summariesByDate.has(toDateKey(initialMonth)) ? toDateKey(initialMonth) : null,
  );
  const monthDates = useMemo(
    () => buildCalendarDates(visibleMonth),
    [visibleMonth],
  );
  const monthSummaries = useMemo(
    () =>
      [...summariesByDate.values()]
        .filter(
          (summary) =>
            summary.date.getFullYear() === visibleMonth.getFullYear() &&
            summary.date.getMonth() === visibleMonth.getMonth(),
        )
        .sort(
          (leftSummary, rightSummary) =>
            leftSummary.date.valueOf() - rightSummary.date.valueOf(),
        ),
    [summariesByDate, visibleMonth],
  );
  const selectedSummary =
    (selectedDateKey ? summariesByDate.get(selectedDateKey) : null) ??
    monthSummaries[monthSummaries.length - 1] ??
    null;
  const monthlyPnl = monthSummaries.reduce(
    (total, summary) => total + summary.netPnl,
    0,
  );
  const monthlyTradeCount = monthSummaries.reduce(
    (total, summary) => total + summary.count,
    0,
  );

  function moveMonth(amount: number) {
    const nextMonth = addMonths(visibleMonth, amount);
    const nextMonthSummaries = [...summariesByDate.values()]
      .filter(
        (summary) =>
          summary.date.getFullYear() === nextMonth.getFullYear() &&
          summary.date.getMonth() === nextMonth.getMonth(),
      )
      .sort(
        (leftSummary, rightSummary) =>
          rightSummary.date.valueOf() - leftSummary.date.valueOf(),
      );

    setVisibleMonth(nextMonth);
    setSelectedDateKey(nextMonthSummaries[0]?.dateKey ?? null);
  }

  if (trades.length === 0) {
    return (
      <div
        className={cx(
          'rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]',
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cx('space-y-4', className)}>
      <div className="flex flex-col gap-3 rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_20px_46px_-36px_var(--shadow-color)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
            Calendar
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {getMonthLabel(visibleMonth)}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cx(
              'rounded-full border px-3 py-1.5 text-sm font-semibold',
              getPnlBadgeClassName(monthlyPnl),
            )}
          >
            {formatPnl(monthlyPnl)}
          </span>
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--muted-strong)]">
            {monthlyTradeCount} trades
          </span>
          <button
            aria-label="Previous month"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
            type="button"
            onClick={() => moveMonth(-1)}
          >
            <ArrowIcon className="h-4 w-4" direction="left" />
          </button>
          <button
            aria-label="Current month"
            className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
            type="button"
            onClick={() => {
              const currentMonth = startOfMonth(new Date());
              setVisibleMonth(currentMonth);
              setSelectedDateKey(null);
            }}
          >
            Today
          </button>
          <button
            aria-label="Next month"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
            type="button"
            onClick={() => moveMonth(1)}
          >
            <ArrowIcon className="h-4 w-4" direction="right" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="hidden overflow-hidden rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] shadow-[0_24px_54px_-40px_var(--shadow-color)] md:block">
          <div className="grid grid-cols-7 border-b border-[color:var(--border-color)] bg-[var(--surface-raised)]">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="px-3 py-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDates.map((date) => {
              const dateKey = toDateKey(date);
              const summary = summariesByDate.get(dateKey) ?? null;
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedSummary?.dateKey === dateKey;

              return (
                <button
                  key={dateKey}
                  className={cx(
                    'min-h-[112px] border-b border-r border-[color:var(--border-color)] bg-[var(--surface)] p-3 text-left transition hover:bg-[var(--surface-raised)]',
                    !isCurrentMonth && 'opacity-40',
                    isSelected &&
                      'bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))] ring-1 ring-inset ring-[color:var(--accent-border-soft)]',
                  )}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {date.getDate()}
                    </span>
                    {summary ? (
                      <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] text-[var(--muted-strong)]">
                        {summary.count}
                      </span>
                    ) : null}
                  </div>
                  {summary ? (
                    <div className="mt-3 space-y-2">
                      <p
                        className={cx(
                          'truncate text-sm font-semibold',
                          getPnlTextClassName(summary.netPnl),
                        )}
                      >
                        {formatPnl(summary.netPnl)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {summary.wins > 0 ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                            W {summary.wins}
                          </span>
                        ) : null}
                        {summary.losses > 0 ? (
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300">
                            L {summary.losses}
                          </span>
                        ) : null}
                        {summary.breakeven > 0 ? (
                          <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] text-[var(--muted-strong)]">
                            BE {summary.breakeven}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          {monthSummaries.length > 0 ? (
            monthSummaries.map((summary) => {
              const isSelected = selectedSummary?.dateKey === summary.dateKey;

              return (
                <button
                  key={summary.dateKey}
                  className={cx(
                    'rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[color:var(--border-strong)]',
                    isSelected &&
                      'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)]',
                  )}
                  type="button"
                  onClick={() => setSelectedDateKey(summary.dateKey)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {getDayLabel(summary.date)}
                    </span>
                    <span
                      className={cx(
                        'text-sm font-semibold',
                        getPnlTextClassName(summary.netPnl),
                      )}
                    >
                      {formatPnl(summary.netPnl)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {summary.count} trades / W {summary.wins} / L {summary.losses} / BE{' '}
                    {summary.breakeven}
                  </p>
                </button>
              );
            })
          ) : (
            <div className="rounded-[22px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
              No trades in this month.
            </div>
          )}
        </div>

        <aside className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_22px_48px_-38px_var(--shadow-color)]">
          {selectedSummary ? (
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
                Day detail
              </p>
              <h4 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                {getDayLabel(selectedSummary.date)}
              </h4>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                  <p className="text-xs text-[var(--muted)]">Daily PnL</p>
                  <p
                    className={cx(
                      'mt-1 text-lg font-semibold',
                      getPnlTextClassName(selectedSummary.netPnl),
                    )}
                  >
                    {formatPnl(selectedSummary.netPnl)}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                  <p className="text-xs text-[var(--muted)]">Trades</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    {selectedSummary.count}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                  <p className="text-xs text-[var(--muted)]">Best</p>
                  <p
                    className={cx(
                      'mt-1 text-sm font-semibold',
                      getPnlTextClassName(selectedSummary.bestTrade?.pnl ?? null),
                    )}
                  >
                    {selectedSummary.bestTrade
                      ? formatPnl(selectedSummary.bestTrade.pnl)
                      : '--'}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-3">
                  <p className="text-xs text-[var(--muted)]">Worst</p>
                  <p
                    className={cx(
                      'mt-1 text-sm font-semibold',
                      getPnlTextClassName(selectedSummary.worstTrade?.pnl ?? null),
                    )}
                  >
                    {selectedSummary.worstTrade
                      ? formatPnl(selectedSummary.worstTrade.pnl)
                      : '--'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300">
                  Wins {selectedSummary.wins}
                </span>
                <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-rose-700 dark:text-rose-300">
                  Losses {selectedSummary.losses}
                </span>
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[var(--muted-strong)]">
                  BE {selectedSummary.breakeven}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {selectedSummary.trades.map((trade) => (
                  <TradeMiniRow key={trade.id} trade={trade} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
              Select a highlighted day to inspect its trades.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
