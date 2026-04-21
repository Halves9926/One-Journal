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
  parseTradeNotes,
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
  variant?: 'stacked';
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
  placeholder = false,
  screenshotUrl,
  symbol,
}: {
  className?: string;
  compact?: boolean;
  placeholder?: boolean;
  screenshotUrl: string | null;
  symbol: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if ((!screenshotUrl || imageFailed) && !placeholder) {
    return null;
  }

  if (!screenshotUrl || imageFailed) {
    return (
      <div
        className={cx(
          'relative grid overflow-hidden rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[radial-gradient(circle_at_22%_18%,var(--accent-primary-glow),transparent_42%),linear-gradient(135deg,var(--surface-raised),var(--surface))] shadow-[0_22px_48px_-34px_var(--shadow-color)]',
          compact ? 'min-h-[120px]' : 'min-h-[220px]',
          className,
        )}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent-border-soft),transparent)]" />
        <div className="grid place-items-center p-6 text-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
              {symbol}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              No screenshot attached. Trade details stay available below.
            </p>
          </div>
        </div>
      </div>
    );
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
          'overflow-hidden bg-[radial-gradient(circle_at_top,var(--accent-primary-glow),transparent_58%),linear-gradient(180deg,var(--surface-strong),var(--surface))]',
          compact ? 'aspect-[16/8.5]' : 'aspect-[16/10] min-h-[220px]',
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
  variant,
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
  const parsedNotes = parseTradeNotes(trade.notes);
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

  if (compact && variant !== 'stacked') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        transition={{
          delay: index * 0.02,
          duration: 0.26,
          ease: [0.22, 1, 0.36, 1],
        }}
        viewport={{ once: true, amount: 0.2 }}
        whileInView={{ opacity: 1, y: 0 }}
        className={cx(
          'group rounded-[20px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-3 py-2.5 shadow-[0_14px_30px_-28px_var(--shadow-color)] transition hover:border-[color:var(--accent-border-soft)] sm:px-4',
          className,
        )}
      >
        <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(120px,0.95fr)_minmax(120px,0.8fr)_minmax(120px,0.72fr)_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
                {symbolLabel}
              </span>
              {trade.bias ? (
                <span
                  className={cx(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]',
                    getDirectionToneClassName(trade.bias),
                  )}
                >
                  {trade.bias}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {formatTradeDate(trade.date)}
              {tradeTimeRangeLabel ? ` / ${tradeTimeRangeLabel}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs text-[var(--muted-strong)]">
            {trade.rr !== null ? (
              <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-2 py-1">
                RR {formatCompactNumber(trade.rr)}
              </span>
            ) : null}
            {trade.riskPercent !== null ? (
              <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-2 py-1">
                Risk {formatPercentValue(trade.riskPercent)}
              </span>
            ) : null}
            {parsedNotes.mistake ? (
              <span className="max-w-[12rem] truncate rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
                {parsedNotes.mistake}
              </span>
            ) : null}
          </div>

          <p
            className={cx(
              'text-lg font-semibold tracking-tight md:text-right',
              getPnlTextClassName(trade.pnl),
            )}
          >
            {trade.pnl === null ? 'Open' : formatPnl(trade.pnl)}
          </p>

          {hasActions ? (
            <div className="flex items-center gap-2 md:justify-end">
              {editHref ? (
                <Link
                  className="inline-flex min-h-8 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  href={editHref}
                >
                  Edit
                </Link>
              ) : null}
              {onDelete ? (
                <button
                  aria-label="Delete trade"
                  className="inline-flex min-h-8 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 text-xs font-medium text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)]"
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setIsDeleteConfirmOpen((current) => !current);
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {onDelete && (isDeleteConfirmOpen || actionError) ? (
          <div className="mt-2 rounded-[18px] border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,transparent),var(--surface))] px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Delete this trade?
                </p>
                {actionError ? (
                  <p className="mt-1 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setActionError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,black))] px-3 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </motion.article>
    );
  }

  if (variant === 'stacked') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        transition={{
          delay: index * 0.03,
          duration: 0.32,
          ease: [0.22, 1, 0.36, 1],
        }}
        viewport={{ once: true, amount: 0.2 }}
        whileInView={{ opacity: 1, y: 0 }}
        className={cx(
          'group relative overflow-hidden rounded-[28px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 pl-8 shadow-[0_22px_48px_-36px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-300 hover:border-[color:var(--accent-border-soft)] sm:p-5 sm:pl-10',
          className,
        )}
      >
        <span className="absolute bottom-5 left-4 top-5 w-px bg-[linear-gradient(180deg,var(--accent-border-soft),var(--border-color),transparent)] sm:left-5" />
        <span
          className={cx(
            'absolute left-[0.68rem] top-6 h-3 w-3 rounded-full border-2 border-[var(--surface)] sm:left-[0.93rem]',
            (trade.pnl ?? 0) > 0
              ? 'bg-[var(--chart-positive)]'
              : (trade.pnl ?? 0) < 0
                ? 'bg-[var(--chart-negative)]'
                : 'bg-[var(--chart-neutral)]',
          )}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] lg:items-stretch">
          <div className="min-w-0">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
              {formatTradeDate(trade.date)}
              {tradeTimeRangeLabel ? ` / ${tradeTimeRangeLabel}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-text)]">
                {symbolLabel}
              </span>
              {trade.bias ? (
                <span
                  className={cx(
                    'rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em]',
                    getDirectionToneClassName(trade.bias),
                  )}
                >
                  {trade.bias}
                </span>
              ) : null}
              <span
                className={cx(
                  'rounded-full border px-3 py-1 text-xs font-medium',
                  getPnlBadgeClassName(trade.pnl),
                )}
              >
                {trade.pnl === null ? 'PnL open' : formatPnl(trade.pnl)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
              {trade.rr !== null ? <span>RR {formatCompactNumber(trade.rr)}</span> : null}
              {trade.riskPercent !== null ? (
                <span>Risk {formatPercentValue(trade.riskPercent)}</span>
              ) : null}
              {parsedNotes.strategy ? <span>Strategy {parsedNotes.strategy}</span> : null}
              {parsedNotes.session ? <span>Session {parsedNotes.session}</span> : null}
            </div>

            {notesPreview ? (
              <p className="mt-4 max-h-12 overflow-hidden text-sm leading-6 text-[var(--muted-strong)]">
                {notesPreview}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">No notes yet.</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {editHref ? (
                <Link
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  href={editHref}
                >
                  Edit
                </Link>
              ) : null}
              {onDelete ? (
                <button
                  aria-label="Delete trade"
                  className="inline-flex min-h-9 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] px-3 text-xs font-medium text-[var(--danger)] transition hover:border-[color:color-mix(in_srgb,var(--danger)_34%,transparent)]"
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setIsDeleteConfirmOpen((current) => !current);
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>

          {trade.screenshotUrl ? (
            <a
              className="relative min-h-[170px] overflow-hidden rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)]"
              href={trade.screenshotUrl}
              rel="noreferrer"
              target="_blank"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${symbolLabel} trade screenshot`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                loading="lazy"
                src={trade.screenshotUrl}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(10,12,16,0.78))] px-4 py-3 text-sm text-white">
                Screenshot
              </div>
            </a>
          ) : (
            <div className="grid min-h-[150px] place-items-center rounded-[22px] border border-dashed border-[color:var(--border-color)] bg-[radial-gradient(circle_at_top,var(--accent-primary-glow),transparent_62%),var(--surface)] px-4 text-center text-sm text-[var(--muted)]">
              No screenshot
            </div>
          )}
        </div>

        {onDelete && (isDeleteConfirmOpen || actionError) ? (
          <div className="mt-4 rounded-[22px] border border-[color:color-mix(in_srgb,var(--danger)_20%,transparent)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--danger)_8%,transparent),var(--surface))] px-4 py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Delete this trade?
                </p>
                {actionError ? (
                  <p className="mt-2 text-sm text-[var(--danger)]">{actionError}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                  type="button"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setActionError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex min-h-10 items-center rounded-full border border-[color:color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[linear-gradient(135deg,var(--danger),color-mix(in_srgb,var(--danger)_72%,black))] px-4 text-sm font-medium text-white shadow-[0_20px_42px_-28px_color-mix(in_srgb,var(--danger)_40%,transparent)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </motion.article>
    );
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
          'bg-[linear-gradient(180deg,var(--surface-raised),var(--accent-primary-soft))] shadow-[0_36px_82px_-42px_var(--shadow-color),inset_0_1px_0_rgba(255,255,255,0.1)]',
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
              placeholder
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
