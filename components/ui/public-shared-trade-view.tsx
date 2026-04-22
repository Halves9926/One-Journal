'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import {
  EMPTY_VALUE,
  formatCompactNumber,
  formatPercentValue,
  formatPnl,
  formatTradeDate,
  formatTradeTime,
  getPnlBadgeClassName,
  getPnlTextClassName,
  normalizePublicSharedTrade,
  parseTradeNotes,
  type PublicSharedTradeRow,
  type PublicSharedTradeView as PublicSharedTrade,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

type PublicSharedTradeState = {
  error: string | null;
  item: PublicSharedTrade | null;
  loading: boolean;
};

const initialState: PublicSharedTradeState = {
  error: null,
  item: null,
  loading: true,
};

function getDirectionToneClassName(direction: string | null) {
  if (direction === 'Long') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (direction === 'Short') {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  }

  return 'border-[color:var(--border-color)] bg-[var(--surface-raised)] text-[var(--muted-strong)]';
}

function PublicMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: 'pnl';
  value: string | null;
}) {
  if (!value || value === EMPTY_VALUE) {
    return null;
  }

  return (
    <div
      className={cx(
        'rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-4 py-4 shadow-[0_16px_34px_-28px_var(--shadow-color)]',
        tone === 'pnl' && 'bg-[var(--surface)]',
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={cx(
          'mt-2 text-lg font-semibold tracking-tight text-[var(--foreground)]',
          tone === 'pnl' && getPnlTextClassName(Number(value.replace(/[^0-9.-]/g, ''))),
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PublicTextBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <section className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_18px_42px_-34px_var(--shadow-color)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-strong)]">
        {value}
      </p>
    </section>
  );
}

export default function PublicSharedTradeView({ token }: { token: string }) {
  const { loading: authLoading, supabase } = useAuth();
  const [state, setState] = useState<PublicSharedTradeState>(initialState);
  const trade = state.item;
  const parsedNotes = parseTradeNotes(trade?.notes ?? null);
  const authorLabel = useMemo(() => {
    if (!trade) {
      return 'One Journal trader';
    }

    return (
      trade.authorDisplayName ||
      (trade.authorUsername ? `@${trade.authorUsername}` : null) ||
      'One Journal trader'
    );
  }, [trade]);

  useEffect(() => {
    if (authLoading || !supabase) {
      return;
    }

    const currentSupabase = supabase;
    let ignore = false;

    async function loadSharedTrade() {
      const { data, error } = await currentSupabase.rpc('get_public_shared_trade', {
        trade_share_token: token,
      });

      if (ignore) {
        return;
      }

      if (error) {
        setState({
          error: error.message,
          item: null,
          loading: false,
        });
        return;
      }

      const rows = (data ?? []) as PublicSharedTradeRow[];
      const row = rows[0] ?? null;

      setState({
        error: row ? null : 'This shared trade is unavailable.',
        item: row ? normalizePublicSharedTrade(row) : null,
        loading: false,
      });
    }

    void loadSharedTrade();

    return () => {
      ignore = true;
    };
  }, [authLoading, supabase, token]);

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-10rem] top-[-10rem] -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,var(--accent-panel-glow),transparent_62%)]"
      />

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[#0f1013] shadow-[0_18px_30px_-22px_rgba(15,23,42,0.36)]">
            <Image
              alt="One Journal"
              className="h-full w-full object-contain p-1.5"
              height={44}
              sizes="44px"
              src="/brand/one-journal-mark.png"
              width={44}
            />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              One Journal
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
              shared trade
            </p>
          </div>
        </div>
        <ButtonLink href="/" size="sm" variant="secondary">
          Open One Journal
        </ButtonLink>
      </header>

      {state.loading ? (
        <section className="rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_30px_68px_-42px_var(--shadow-color)] sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading shared trade...</p>
        </section>
      ) : null}

      {!state.loading && (!trade || state.error) ? (
        <section className="rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_30px_68px_-42px_var(--shadow-color)] sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
            Unavailable
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Shared trade not found
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            The link may be disabled, expired or mistyped.
          </p>
        </section>
      ) : null}

      {trade ? (
        <article className="space-y-5">
          <section className="overflow-hidden rounded-[34px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_34px_90px_-46px_var(--shadow-color)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-text)]">
                    {trade.symbol || 'Trade'}
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
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                  {trade.symbol ? `${trade.symbol} trade` : 'Shared trade'}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted-strong)]">
                  <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                    By {authorLabel}
                  </span>
                  {trade.date ? (
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      {formatTradeDate(trade.date)}
                    </span>
                  ) : null}
                  {trade.openTime ? (
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      Open {formatTradeTime(trade.openTime)}
                    </span>
                  ) : null}
                  {trade.closeTime ? (
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      Close {formatTradeTime(trade.closeTime)}
                    </span>
                  ) : null}
                </div>
              </div>
              <div
                className={cx(
                  'rounded-[24px] border px-5 py-4 shadow-[0_18px_42px_-32px_var(--shadow-color)] lg:min-w-[180px]',
                  getPnlBadgeClassName(trade.pnl),
                )}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--muted)]">
                  PnL
                </p>
                <p
                  className={cx(
                    'mt-2 text-3xl font-semibold tracking-tight',
                    getPnlTextClassName(trade.pnl),
                  )}
                >
                  {trade.pnl === null ? 'Open' : formatPnl(trade.pnl)}
                </p>
              </div>
            </div>

            {trade.tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {trade.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1.5 text-sm text-[var(--accent-text)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {trade.screenshotUrl ? (
            <a
              className="block overflow-hidden rounded-[30px] border border-[color:var(--border-color)] bg-[var(--surface)] shadow-[0_24px_56px_-38px_var(--shadow-color)]"
              href={trade.screenshotUrl}
              rel="noreferrer"
              target="_blank"
            >
              <div className="aspect-[16/9] bg-[var(--surface-raised)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${trade.symbol || 'Shared'} trade screenshot`}
                  className="h-full w-full object-cover"
                  src={trade.screenshotUrl}
                />
              </div>
            </a>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <PublicMetric label="Entry" value={formatCompactNumber(trade.entryPrice)} />
            <PublicMetric label="Stop loss" value={formatCompactNumber(trade.stoploss)} />
            <PublicMetric
              label="Take profit"
              value={formatCompactNumber(trade.takeProfit)}
            />
            <PublicMetric label="Risk" value={formatPercentValue(trade.riskPercent)} />
            <PublicMetric label="RR" value={formatCompactNumber(trade.rr)} />
            <PublicMetric label="PnL" tone="pnl" value={formatPnl(trade.pnl)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PublicTextBlock label="Strategy" value={parsedNotes.strategy} />
            <PublicTextBlock label="Session" value={parsedNotes.session} />
            <div className="md:col-span-2">
              <PublicTextBlock label="Notes" value={parsedNotes.notes} />
            </div>
          </div>
        </article>
      ) : null}
    </main>
  );
}
