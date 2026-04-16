'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { HoverLift, Reveal } from '@/components/ui/reveal';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import {
  EquityCurveCard,
  PnlBarsCard,
  WinLossCard,
} from '@/components/ui/trade-charts';
import {
  TRADE_SELECT,
  formatCompactNumber,
  formatSignedNumber,
  formatTradeDate,
  normalizeTrade,
  type TradeView,
} from '@/lib/trades';
import type { TradeRow } from '@/lib/supabase';

type TradesState = {
  error: string | null;
  items: TradeView[];
  loading: boolean;
};

function pnlToneClassName(value: number | null) {
  if (value === null || value === 0) {
    return 'text-neutral-950';
  }

  return value < 0 ? 'text-rose-700' : 'text-neutral-950';
}

function getMostFrequentSymbol(trades: TradeView[]) {
  const map = new Map<string, number>();

  for (const trade of trades) {
    const key = trade.symbol.trim();

    if (!key) {
      continue;
    }

    map.set(key, (map.get(key) ?? 0) + 1);
  }

  let bestSymbol: string | null = null;
  let bestCount = 0;

  for (const [symbol, count] of map.entries()) {
    if (count > bestCount) {
      bestSymbol = symbol;
      bestCount = count;
    }
  }

  return bestSymbol ?? 'n/d';
}

export default function DashboardView() {
  const router = useRouter();
  const { loading, supabase, user } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [tradesState, setTradesState] = useState<TradesState>({
    error: null,
    items: [],
    loading: false,
  });

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    const currentSupabase = supabase;
    const currentUserId = user.id;
    let ignore = false;

    async function loadTrades() {
      setTradesState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      const { data, error } = await currentSupabase
        .from('Trades')
        .select(TRADE_SELECT)
        .eq('user_id', currentUserId)
        .order('Date', { ascending: false })
        .limit(24)
        .overrideTypes<TradeRow[], { merge: false }>();

      if (ignore) {
        return;
      }

      if (error) {
        setTradesState({
          error: error.message,
          items: [],
          loading: false,
        });
        return;
      }

      setTradesState({
        error: null,
        items: (data ?? []).map((trade, index) => normalizeTrade(trade, index)),
        loading: false,
      });
    }

    void loadTrades();

    return () => {
      ignore = true;
    };
  }, [supabase, user]);

  async function handleLogout() {
    if (!supabase) {
      setLogoutError('Supabase client unavailable.');
      return;
    }

    setLogoutError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setLogoutError(error.message);
      return;
    }

    router.replace('/login');
  }

  const summary = useMemo(() => {
    const trades = tradesState.items;
    const wins = trades.filter((trade) => (trade.pnl ?? 0) > 0).length;
    const losses = trades.filter((trade) => (trade.pnl ?? 0) < 0).length;
    const breakeven = trades.length - wins - losses;
    const netPnl = trades.reduce((total, trade) => total + (trade.pnl ?? 0), 0);
    const avgRr =
      trades.length > 0
        ? trades.reduce((total, trade) => total + (trade.rr ?? 0), 0) / trades.length
        : null;
    const avgPnl =
      trades.length > 0
        ? trades.reduce((total, trade) => total + (trade.pnl ?? 0), 0) / trades.length
        : null;
    const bestTrade =
      trades.length > 0
        ? Math.max(...trades.map((trade) => trade.pnl ?? Number.NEGATIVE_INFINITY))
        : null;
    const worstTrade =
      trades.length > 0
        ? Math.min(...trades.map((trade) => trade.pnl ?? Number.POSITIVE_INFINITY))
        : null;
    const longCount = trades.filter((trade) => trade.bias === 'Long').length;
    const shortCount = trades.filter((trade) => trade.bias === 'Short').length;
    const riskAverage =
      trades.length > 0
        ? trades.reduce((total, trade) => total + (trade.riskPercent ?? 0), 0) /
          trades.length
        : null;

    return {
      avgPnl,
      avgRr,
      bestSymbol: getMostFrequentSymbol(trades),
      bestTrade:
        bestTrade === Number.NEGATIVE_INFINITY ? null : bestTrade,
      breakeven,
      longCount,
      losses,
      netPnl,
      riskAverage,
      shortCount,
      totalTrades: trades.length,
      winRate:
        trades.length > 0 ? `${Math.round((wins / trades.length) * 100)}%` : 'n/d',
      wins,
      worstTrade:
        worstTrade === Number.POSITIVE_INFINITY ? null : worstTrade,
    };
  }, [tradesState.items]);

  if (loading || !supabase) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-neutral-500">Loading session...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Dashboard locked"
          description="Sign in to open the workspace."
        />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel>
            <PanelHeader
              eyebrow="one journal"
              title="Dashboard"
              description={user.email ?? 'Active session'}
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/trades/new" size="lg" variant="primary">
                    New Trade
                  </ButtonLink>
                  <ButtonLink href="/settings" size="lg" variant="secondary">
                    Settings
                  </ButtonLink>
                  <Button
                    type="button"
                    size="lg"
                    variant="ghost"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              }
            />

            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2 sm:px-8 sm:pb-8 xl:grid-cols-4">
              <HoverLift>
                <MetricCard
                  label="Total Trades"
                  value={String(summary.totalTrades)}
                  tone="accent"
                />
              </HoverLift>
              <HoverLift>
                <MetricCard label="Win Rate" value={summary.winRate} tone="success" />
              </HoverLift>
              <HoverLift>
                <MetricCard
                  label="PnL"
                  value={formatSignedNumber(summary.netPnl)}
                  tone={summary.netPnl < 0 ? 'danger' : 'accent'}
                />
              </HoverLift>
              <HoverLift>
                <MetricCard
                  label="Avg RR"
                  value={formatCompactNumber(summary.avgRr)}
                  tone="neutral"
                />
              </HoverLift>
            </div>

            {logoutError ? (
              <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                <MessageBanner message={logoutError} tone="error" />
              </div>
            ) : null}
          </Panel>
        </Reveal>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="grid gap-6">
            <Reveal delay={0.04}>
              <EquityCurveCard trades={tradesState.items} />
            </Reveal>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Reveal delay={0.08}>
                <PnlBarsCard trades={tradesState.items} />
              </Reveal>

              <Reveal delay={0.12}>
                <Panel className="p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-500">
                    Snapshot
                  </p>
                  <div className="mt-5 grid gap-3">
                    {[
                      {
                        label: 'Best trade',
                        value: formatSignedNumber(summary.bestTrade),
                      },
                      {
                        label: 'Worst trade',
                        value: formatSignedNumber(summary.worstTrade),
                      },
                      {
                        label: 'Avg PnL',
                        value: formatSignedNumber(summary.avgPnl),
                      },
                      {
                        label: 'Best symbol',
                        value: summary.bestSymbol,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)]"
                      >
                        <p className="text-sm text-neutral-500">{item.label}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-neutral-500">
                        <span>Long bias</span>
                        <span>{summary.longCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#18181b,#7f1d1d)]"
                          style={{
                            width: `${
                              ((summary.longCount /
                                Math.max(summary.longCount + summary.shortCount, 1)) *
                                100)
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-neutral-500">
                        <span>Short bias</span>
                        <span>{summary.shortCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#fb7185,#9f1239)]"
                          style={{
                            width: `${
                              ((summary.shortCount /
                                Math.max(summary.longCount + summary.shortCount, 1)) *
                                100)
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Panel>
              </Reveal>
            </div>

            <Reveal delay={0.16}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="recent trades"
                  title="Execution"
                  action={
                    <ButtonLink href="/trades/new" variant="secondary">
                      Add Trade
                    </ButtonLink>
                  }
                />

                <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                  {tradesState.loading ? (
                    <p className="text-sm text-neutral-500">Loading trades...</p>
                  ) : null}

                  {tradesState.error ? (
                    <MessageBanner
                      message={`Trades query error: ${tradesState.error}`}
                      tone="error"
                    />
                  ) : null}

                  {!tradesState.loading &&
                  !tradesState.error &&
                  tradesState.items.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
                      No trades yet.
                    </div>
                  ) : null}

                  {!tradesState.loading &&
                  !tradesState.error &&
                  tradesState.items.length > 0 ? (
                    <div className="space-y-4">
                      {tradesState.items.map((trade, index) => (
                        <motion.article
                          key={trade.id}
                          initial={{ opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{
                            delay: index * 0.03,
                            duration: 0.46,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          whileHover={{ y: -4 }}
                          className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)]"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-rose-700">
                                  {trade.symbol}
                                </span>
                                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs uppercase tracking-[0.24em] text-neutral-600">
                                  {trade.bias ?? 'n/d'}
                                </span>
                                <span className="text-sm text-neutral-500">
                                  {formatTradeDate(trade.date)}
                                </span>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-700">
                                <span className="rounded-full border border-neutral-200 px-3 py-1">
                                  RR {formatCompactNumber(trade.rr)}
                                </span>
                                <span className="rounded-full border border-neutral-200 px-3 py-1">
                                  Entry {formatCompactNumber(trade.entryPrice)}
                                </span>
                                <span className="rounded-full border border-neutral-200 px-3 py-1">
                                  Stop {formatCompactNumber(trade.stoploss)}
                                </span>
                                <span className="rounded-full border border-neutral-200 px-3 py-1">
                                  Take {formatCompactNumber(trade.takeProfit)}
                                </span>
                                <span className="rounded-full border border-neutral-200 px-3 py-1">
                                  Risk {formatCompactNumber(trade.riskPercent)}%
                                </span>
                              </div>

                              {trade.notes ? (
                                <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-neutral-600">
                                  {trade.notes}
                                </p>
                              ) : null}

                              {trade.screenshotUrl ? (
                                <Link
                                  href={trade.screenshotUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-4 inline-flex text-sm text-neutral-500 transition hover:text-neutral-950"
                                >
                                  Screenshot
                                </Link>
                              ) : null}
                            </div>

                            <div className="shrink-0 rounded-[24px] border border-neutral-200 bg-neutral-50 px-4 py-3 lg:min-w-[150px]">
                              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                                PnL
                              </p>
                              <p
                                className={`mt-2 text-2xl font-semibold tracking-tight ${pnlToneClassName(trade.pnl)}`}
                              >
                                {formatSignedNumber(trade.pnl)}
                              </p>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Panel>
            </Reveal>
          </div>

          <div className="grid gap-6">
            <Reveal delay={0.1}>
              <WinLossCard
                wins={summary.wins}
                losses={summary.losses}
                breakeven={summary.breakeven}
              />
            </Reveal>

            <Reveal delay={0.14}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-neutral-500">
                  Pulse
                </p>
                <div className="mt-5 grid gap-3">
                  {[
                    {
                      label: 'Risk avg',
                      value: `${formatCompactNumber(summary.riskAverage)}%`,
                    },
                    {
                      label: 'Breakeven',
                      value: String(summary.breakeven),
                    },
                    {
                      label: 'Recent flow',
                      value: tradesState.items[0]?.symbol ?? 'n/d',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.14)]"
                    >
                      <p className="text-sm text-neutral-500">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold text-neutral-950">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <ButtonLink href="/trades/new" variant="primary" size="lg">
                    Capture Trade
                  </ButtonLink>
                  <ButtonLink href="/settings" variant="secondary" size="lg">
                    Open Settings
                  </ButtonLink>
                  <Link
                    href="/"
                    className="text-sm text-neutral-500 transition hover:text-neutral-950"
                  >
                    Back home
                  </Link>
                </div>
              </Panel>
            </Reveal>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
