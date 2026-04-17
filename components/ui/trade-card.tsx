'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import {
  formatCompactNumber,
  formatPercentValue,
  formatSignedNumber,
  formatTradeDate,
  type TradeView,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type TradeCardProps = {
  className?: string;
  compact?: boolean;
  featured?: boolean;
  index?: number;
  trade: TradeView;
};

function getPnlToneClassName(value: number | null) {
  if (value === null || value === 0) {
    return 'text-[var(--foreground)]';
  }

  return value < 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]';
}

function getDirectionToneClassName(direction: string | null) {
  if (direction === 'Long') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (direction === 'Short') {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  }

  return 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted)]';
}

function getNotesPreview(notes: string | null, compact: boolean) {
  if (!notes) {
    return null;
  }

  const flattenedNotes = notes.replace(/\s*\n+\s*/g, ' / ').trim();
  const limit = compact ? 112 : 180;

  if (flattenedNotes.length <= limit) {
    return flattenedNotes;
  }

  return `${flattenedNotes.slice(0, limit - 3).trimEnd()}...`;
}

function TradeCover({
  className,
  compact = false,
  screenshotUrl,
  symbol,
}: {
  className?: string;
  compact?: boolean;
  screenshotUrl: string | null;
  symbol: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!screenshotUrl || imageFailed) {
    return null;
  }

  return (
    <a
      href={screenshotUrl}
      target="_blank"
      rel="noreferrer"
      className={cx(
        'group/cover relative block overflow-hidden rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] shadow-[0_22px_48px_-34px_var(--shadow-color)] transition duration-300 lg:hover:border-[color:var(--border-strong)] lg:hover:shadow-[0_26px_56px_-34px_var(--shadow-color)]',
        className,
      )}
    >
      <div
        className={cx(
          'overflow-hidden bg-[radial-gradient(circle_at_top,rgba(190,24,93,0.14),transparent_58%),linear-gradient(180deg,var(--surface-strong),var(--surface))]',
          compact ? 'aspect-[16/8.5]' : 'aspect-[16/9]',
        )}
      >
        {/* Native img keeps remote screenshots flexible without remotePatterns coupling. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt={`${symbol} trade screenshot`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 lg:group-hover/cover:scale-[1.02]"
          onError={() => setImageFailed(true)}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(10,12,16,0.78))] px-4 py-3 text-sm text-white">
        Screenshot preview
      </div>
    </a>
  );
}

export default function TradeCard({
  className,
  compact = false,
  featured = false,
  index = 0,
  trade,
}: TradeCardProps) {
  const hasScreenshot = Boolean(trade.screenshotUrl);
  const details = useMemo(
    () =>
      [
        trade.rr !== null ? { label: 'RR', value: formatCompactNumber(trade.rr) } : null,
        trade.entryPrice !== null
          ? { label: 'Entry', value: formatCompactNumber(trade.entryPrice) }
          : null,
        trade.stoploss !== null
          ? { label: 'Stop', value: formatCompactNumber(trade.stoploss) }
          : null,
        trade.takeProfit !== null
          ? { label: 'Take', value: formatCompactNumber(trade.takeProfit) }
          : null,
        trade.riskPercent !== null
          ? { label: 'Risk', value: formatPercentValue(trade.riskPercent) }
          : null,
      ].filter((detail): detail is { label: string; value: string } => Boolean(detail)),
    [
      trade.entryPrice,
      trade.riskPercent,
      trade.rr,
      trade.stoploss,
      trade.takeProfit,
    ],
  );

  const symbolLabel = trade.symbol || 'Saved trade';
  const notesPreview = getNotesPreview(trade.notes, compact);
  const shouldShowInlineCover = !featured || !hasScreenshot;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        delay: index * 0.04,
        duration: 0.46,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cx(
        'group overflow-hidden rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-4 shadow-[0_30px_68px_-42px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 lg:hover:-translate-y-1 lg:hover:border-rose-400/24 lg:hover:shadow-[0_34px_74px_-42px_var(--shadow-color)] sm:p-5',
        featured &&
          'bg-[linear-gradient(180deg,var(--surface-raised),rgba(127,29,29,0.045))] shadow-[0_36px_82px_-42px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.1)]',
        compact && 'p-4',
        className,
      )}
    >
      <div
        className={cx(
          'flex h-full flex-col gap-4',
          featured &&
            hasScreenshot &&
            'xl:grid xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,360px)] xl:items-start',
        )}
      >
        <div className="flex h-full flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-rose-700 dark:text-rose-200">
                  {symbolLabel}
                </span>
                {trade.bias ? (
                  <span
                    className={cx(
                      'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em]',
                      getDirectionToneClassName(trade.bias),
                    )}
                  >
                    {trade.bias}
                  </span>
                ) : null}
                {featured ? (
                  <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
                    recent execution
                  </span>
                ) : null}
              </div>

              {trade.date ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {formatTradeDate(trade.date)}
                </p>
              ) : null}
            </div>

            <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-3 shadow-[0_18px_36px_-30px_var(--shadow-color)] md:min-w-[148px]">
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--muted)]">
                PnL
              </p>
              <p
                className={cx(
                  'mt-2 text-2xl font-semibold tracking-tight',
                  getPnlToneClassName(trade.pnl),
                )}
              >
                {trade.pnl === null ? 'Awaiting' : formatSignedNumber(trade.pnl)}
              </p>
            </div>
          </div>

          {shouldShowInlineCover ? (
            <TradeCover
              screenshotUrl={trade.screenshotUrl}
              symbol={symbolLabel}
              compact={compact}
            />
          ) : null}

          {details.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {details.map((detail) => (
                <span
                  key={detail.label}
                  className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <span className="mr-1 text-[var(--muted)]">{detail.label}</span>
                  <span className="text-[var(--foreground)]">{detail.value}</span>
                </span>
              ))}
            </div>
          ) : null}

          {notesPreview ? (
            <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                Notes
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                {notesPreview}
              </p>
            </div>
          ) : null}
        </div>

        {featured && hasScreenshot ? (
          <TradeCover
            screenshotUrl={trade.screenshotUrl}
            symbol={symbolLabel}
            className="xl:h-full"
          />
        ) : null}
      </div>
    </motion.article>
  );
}
