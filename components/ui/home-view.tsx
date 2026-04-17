'use client';

import { useMemo } from 'react';

import { useAccounts } from '@/components/ui/accounts-provider';
import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { EquitySparkline } from '@/components/ui/trade-charts';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import TradeCard from '@/components/ui/trade-card';
import { useUserTrades } from '@/components/ui/use-user-trades';
import {
  buildAccountMetrics as getAccountMetrics,
  isPropAccount,
} from '@/lib/accounts';
import {
  buildTradeSummary,
  formatCompactNumber,
  formatSignedNumber,
  formatTradeDate,
} from '@/lib/trades';

function getStreakLabel(
  direction: 'flat' | 'loss' | 'win' | null,
  streak: number,
) {
  if (!direction || streak === 0) {
    return 'No streak yet';
  }

  if (direction === 'win') {
    return `${streak} trade win streak`;
  }

  if (direction === 'loss') {
    return `${streak} trade loss streak`;
  }

  return `${streak} flat trades`;
}

function getAccountContextLabel() {
  return 'Account overview';
}

export default function HomeView() {
  const { user } = useAuth();
  const {
    activeAccount,
    accounts,
    error: accountsError,
    loading: accountsLoading,
  } = useAccounts();
  const tradesState = useUserTrades({
    accountId: activeAccount?.id ?? null,
    enabled: Boolean(user && activeAccount),
    limit: 24,
  });
  const accountMetrics = useMemo(
    () =>
      activeAccount ? getAccountMetrics(activeAccount, tradesState.items) : null,
    [activeAccount, tradesState.items],
  );
  const summary = accountMetrics?.summary ?? buildTradeSummary([]);
  const recentTrades = tradesState.items.slice(0, 4);
  const displayEquity =
    activeAccount && accountMetrics
      ? isPropAccount(activeAccount) &&
        activeAccount.phasesEnabled &&
        !activeAccount.isFunded
        ? accountMetrics.currentPhaseEquity
        : accountMetrics.overallCurrentEquity
      : null;
  const overviewCards = activeAccount
    ? [
        {
          caption: 'for the active account',
          label: 'Total trades',
          tone: 'neutral' as const,
          value: String(summary.totalTrades),
        },
        {
          caption: `${summary.wins} wins / ${summary.losses} losses`,
          label: 'Win rate',
          tone: 'success' as const,
          value:
            summary.winRate === null ? 'No trades yet' : `${Math.round(summary.winRate)}%`,
        },
        {
          caption: 'net performance on this account',
          label: 'Net PnL',
          tone: summary.netPnl < 0 ? ('danger' as const) : ('accent' as const),
          value: formatSignedNumber(summary.netPnl),
        },
        {
          caption: 'average risk-to-reward captured',
          label: 'Average RR',
          tone: 'neutral' as const,
          value:
            summary.avgRr === null
              ? 'Not enough history'
              : formatCompactNumber(summary.avgRr),
        },
        {
          caption: summary.lastTrade?.date
            ? formatTradeDate(summary.lastTrade.date)
            : 'No trades yet',
          label: 'Last trade',
          tone: 'accent' as const,
          value: summary.lastTrade?.symbol || 'Waiting for first trade',
        },
      ]
    : [];

  if (!user) {
    return (
      <PageShell size="wide">
        <div className="space-y-6">
          <Reveal>
            <Panel className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px] xl:items-stretch">
                <div className="flex flex-col justify-between gap-6">
                  <div className="max-w-3xl">
                    <span className="inline-flex items-center rounded-full border border-rose-500/18 bg-rose-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.32em] text-rose-700 dark:text-rose-200">
                      one journal
                    </span>
                    <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                      Trading workspace, not landing page.
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
                      Login to open account-aware metrics, recent trade previews and a cleaner workspace overview.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/login" size="lg" variant="primary">
                      Login
                    </ButtonLink>
                    <ButtonLink href="/dashboard" size="lg" variant="secondary">
                      Dashboard
                    </ButtonLink>
                  </div>
                </div>

                <div className="rounded-[30px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_22px_48px_-34px_var(--shadow-color)]">
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                        Journal pulse
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                        Waiting for session
                      </p>
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                        Once you sign in, this block becomes the live view of your active trading account.
                      </p>
                    </div>
                    <ButtonLink href="/login" variant="secondary" size="lg">
                      Unlock Workspace
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </Panel>
          </Reveal>
        </div>
      </PageShell>
    );
  }

  if (accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading accounts...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!activeAccount) {
    return (
      <PageShell size="wide">
        <div className="space-y-6">
          <Reveal>
            <Panel className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
              <PanelHeader
                eyebrow="accounts"
                title="Create your first account"
                description="One Journal is now account-aware. Create a demo, propfirm, live or backtest account to unlock account-specific recap, charts and trade capture."
                action={
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/accounts/new" size="lg" variant="primary">
                      New Account
                    </ButtonLink>
                    <ButtonLink href="/accounts" size="lg" variant="secondary">
                      Open Accounts
                    </ButtonLink>
                  </div>
                }
              />
              <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                {accountsError ? (
                  <MessageBanner message={accountsError} tone="error" />
                ) : (
                  <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                    No active account yet. Once you create one, home becomes the overview for that selected account only.
                  </div>
                )}
              </div>
            </Panel>
          </Reveal>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px] xl:items-stretch">
              <div className="flex flex-col justify-between gap-6">
                <div className="max-w-3xl">
                  <span className="inline-flex items-center rounded-full border border-rose-500/18 bg-rose-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.32em] text-rose-700 dark:text-rose-200">
                    {getAccountContextLabel()}
                  </span>
                  <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl lg:text-6xl">
                    {activeAccount.name}
                  </h1>
                  <p className="mt-3 text-sm uppercase tracking-[0.28em] text-[var(--muted)]">
                    {activeAccount.type}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--muted-strong)]">
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      {accounts.length} account{accounts.length === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      Initial equity {formatCompactNumber(activeAccount.initialEquity)}
                    </span>
                    {isPropAccount(activeAccount) ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-300">
                        {activeAccount.isFunded
                          ? 'Funded'
                          : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`}
                      </span>
                    ) : null}
                    {summary.bestSymbol ? (
                      <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                        Focus symbol {summary.bestSymbol}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/trades/new" size="lg" variant="primary">
                    New Trade
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="secondary">
                    Open Dashboard
                  </ButtonLink>
                  <ButtonLink href="/accounts" size="lg" variant="ghost">
                    Accounts
                  </ButtonLink>
                </div>
              </div>

              <div className="rounded-[30px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_22px_48px_-34px_var(--shadow-color)]">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                        {isPropAccount(activeAccount) &&
                        activeAccount.phasesEnabled &&
                        !activeAccount.isFunded
                          ? 'Phase equity'
                          : 'Current equity'}
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                        {displayEquity === null
                          ? 'No trades yet'
                          : formatCompactNumber(displayEquity)}
                      </p>
                    </div>
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted-strong)]">
                      {formatSignedNumber(summary.netPnl)}
                    </span>
                  </div>

                  <div className="h-28">
                    <EquitySparkline trades={tradesState.items} className="h-full" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                      <p className="text-sm text-[var(--muted)]">Best trade</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {summary.bestTrade === null
                          ? 'No trades yet'
                          : formatSignedNumber(summary.bestTrade)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3">
                      <p className="text-sm text-[var(--muted)]">Worst trade</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {summary.worstTrade === null
                          ? 'No trades yet'
                          : formatSignedNumber(summary.worstTrade)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 sm:col-span-2">
                      <p className="text-sm text-[var(--muted)]">
                        {isPropAccount(activeAccount) && activeAccount.phasesEnabled
                          ? 'Phase state'
                          : 'Current streak'}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                        {isPropAccount(activeAccount) && activeAccount.phasesEnabled
                          ? activeAccount.isFunded
                            ? 'Funded account'
                            : accountMetrics &&
                                accountMetrics.phaseTargetRemaining !== null
                              ? `Target remaining ${formatCompactNumber(accountMetrics.phaseTargetRemaining)}`
                              : `Phase ${activeAccount.currentPhase}/${activeAccount.phaseCount}`
                          : getStreakLabel(
                              summary.currentStreakDirection,
                              summary.currentStreak,
                            )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}

        {activeAccount ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {overviewCards.map((card, index) => (
              <Reveal key={card.label} delay={index * 0.04}>
                <MetricCard
                  label={card.label}
                  value={card.value}
                  tone={card.tone}
                  caption={card.caption}
                />
              </Reveal>
            ))}
          </div>
        ) : null}

        <Reveal delay={0.08}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="recent trades"
              title={`${activeAccount.name} recap`}
              description="Featured previews first, compact cards after. Screenshots stay embedded when available."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/dashboard" variant="secondary">
                    Full Dashboard
                  </ButtonLink>
                  <ButtonLink href="/accounts" variant="ghost">
                    Manage Accounts
                  </ButtonLink>
                </div>
              }
            />

            <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
              {tradesState.loading ? (
                <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                  Loading recent trades...
                </div>
              ) : null}

              {tradesState.error ? (
                <MessageBanner
                  message={`Trades query error: ${tradesState.error}`}
                  tone="error"
                />
              ) : null}

              {!tradesState.loading && !tradesState.error && recentTrades.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  No trades yet for this account. Save the first execution and home becomes a real account recap.
                </div>
              ) : null}

              {!tradesState.loading && !tradesState.error && recentTrades.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {recentTrades.map((trade, index) => (
                    <TradeCard
                      key={trade.id}
                      trade={trade}
                      index={index}
                      featured={index === 0}
                      compact={index > 0}
                      className={index === 0 ? 'xl:col-span-2' : ''}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </Panel>
        </Reveal>
      </div>
    </PageShell>
  );
}
