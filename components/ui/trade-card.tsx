'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import {
  formatCompactNumber,
  formatPercentValue,
  formatPnl,
  formatTradeDate,
  formatTradeTime,
  getTradeTimeRangeLabel,
  getPnlBadgeClassName,
  getPnlTextClassName,
  type TradeView,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type TradeCardProps = {
  className?: string;
  compact?: boolean;
  editHref?: string;
  featured?: boolean;
  index?: number;
  onDelete?: (tradeId: string) => Promise<{ error: string | null }>;
  trade: TradeView;
};

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
  editHref,
  featured = false,
  index = 0,
  onDelete,
  trade,
}: TradeCardProps) {
  const hasScreenshot = Boolean(trade.screenshotUrl);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const details = useMemo(
    () =>
      [
        trade.openTime !== null
          ? { label: 'Open', value: formatTradeTime(trade.openTime) }
          : null,
        trade.closeTime !== null
          ? { label: 'Close', value: formatTradeTime(trade.closeTime) }
          : null,
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
      trade.closeTime,
      trade.riskPercent,
      trade.rr,
      trade.stoploss,
      trade.takeProfit,
      trade.openTime,
    ],
  );

  const symbolLabel = trade.symbol || 'Saved trade';
  const notesPreview = getNotesPreview(trade.notes, compact);
  const tradeTimeRangeLabel = getTradeTimeRangeLabel(trade);
  const shouldShowInlineCover = !featured || !hasScreenshot;
  const hasActions = Boolean(editHref || onDelete);

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    setIsDeleting(true);
    setActionError(null);

    const result = await onDelete(trade.id);

    if (result.error) {
      setActionError(result.error);
      setIsDeleting(false);
      return;
    }

    setIsDeleteConfirmOpen(false);
    setIsDeleting(false);
  }

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
        'group overflow-hidden rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-4 shadow-[0_30px_68px_-42px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 lg:hover:-translate-y-1 lg:hover:border-[color:var(--accent-border-soft)] lg:hover:shadow-[0_34px_74px_-42px_var(--shadow-color)] sm:p-5',
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
                <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
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
                  {tradeTimeRangeLabel ? ` • ${tradeTimeRangeLabel}` : ''}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              {hasActions ? (
                <div className="flex items-center gap-2 self-start md:self-end">
                  {editHref ? (
                    <Link
                      href={editHref}
                      className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                    >
                      Edit
                    </Link>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setIsDeleteConfirmOpen((current) => !current);
                      }}
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 text-rose-700 transition hover:border-rose-500/34 hover:bg-rose-500/16 dark:text-rose-300"
                      aria-label="Delete trade"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4.75 6h10.5" strokeLinecap="round" />
                        <path d="M8 6V4.75h4V6" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M6.25 6l.6 8.02a1 1 0 0 0 1 .93h4.3a1 1 0 0 0 1-.93L13.75 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div
                className={cx(
                  'rounded-[22px] border px-4 py-3 shadow-[0_18px_36px_-30px_var(--shadow-color)] md:min-w-[148px]',
                  getPnlBadgeClassName(trade.pnl),
                )}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--muted)]">
                  PnL
                </p>
                <p
                  className={cx(
                    'mt-2 text-2xl font-semibold tracking-tight',
                    getPnlTextClassName(trade.pnl),
                  )}
                >
                  {trade.pnl === null ? 'Awaiting' : formatPnl(trade.pnl)}
                </p>
              </div>
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

          {onDelete && (isDeleteConfirmOpen || actionError) ? (
            <div className="rounded-[22px] border border-rose-500/18 bg-[linear-gradient(180deg,rgba(127,29,29,0.08),var(--surface))] px-4 py-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    Delete this trade?
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    This removes the execution from the journal and updates account metrics.
                  </p>
                  {actionError ? (
                    <p className="mt-2 text-sm text-[var(--danger)]">{actionError}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      setActionError(null);
                    }}
                    className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      void handleDelete();
                    }}
                    className="inline-flex min-h-10 items-center rounded-full border border-[#7a1c30]/26 bg-[linear-gradient(135deg,#7a1c30,#541224)] px-4 text-sm font-medium text-white shadow-[0_20px_42px_-28px_rgba(122,28,48,0.52)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
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
