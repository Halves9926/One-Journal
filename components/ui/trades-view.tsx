'use client';

import { useDeferredValue, useMemo, useState } from 'react';

import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import {
  getListViewModeLabel,
  useListViewPreferences,
} from '@/components/ui/list-view-preferences';
import PageShell from '@/components/ui/page-shell';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import TradeCalendarView from '@/components/ui/trade-calendar-view';
import TradeCard from '@/components/ui/trade-card';
import { useUserTrades } from '@/components/ui/use-user-trades';
import {
  buildTradeSummary,
  formatPnl,
  getPnlCardClassName,
  getPnlTextClassName,
  getTradeSearchText,
} from '@/lib/trades';
import { cx } from '@/lib/utils';

export default function TradesView() {
  const { loading: authLoading, supabase, user } = useAuth();
  const {
    activeAccount,
    accounts,
    error: accountsError,
    loading: accountsLoading,
    refreshAccounts,
  } = useAccounts();
  const tradesState = useUserTrades({
    accountId: activeAccount?.id ?? null,
    enabled: Boolean(user && activeAccount),
    limit: null,
  });
  const { preferences } = useListViewPreferences();
  const [searchValue, setSearchValue] = useState('');
  const tradeListMode = preferences.trades;
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
  const filteredTrades = useMemo(() => {
    if (!deferredSearchValue) {
      return tradesState.items;
    }

    return tradesState.items.filter((trade) =>
      getTradeSearchText(trade).includes(deferredSearchValue),
    );
  }, [deferredSearchValue, tradesState.items]);
  const summary = useMemo(
    () => buildTradeSummary(filteredTrades),
    [filteredTrades],
  );

  async function handleDeleteTrade(tradeId: string) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const { error } = await supabase
      .from('Trades')
      .delete()
      .eq('ID', tradeId)
      .eq('user_id', user.id);

    if (error) {
      return { error: error.message };
    }

    tradesState.refresh();
    await refreshAccounts();
    return { error: null };
  }

  if (authLoading || !supabase || accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading trades...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Trades locked"
          description="Sign in to open your trade journal."
        />
      </PageShell>
    );
  }

  if (!activeAccount) {
    return (
      <PageShell size="wide">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8">
            <PanelHeader
              eyebrow="accounts"
              title="Create an account before reviewing trades"
              description="Trades are scoped to the active account. Create one account to unlock the full trade list."
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
                  No active account yet.
                </div>
              )}
            </div>
          </Panel>
        </Reveal>
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="trades"
              title={`${activeAccount.name} trades`}
              description="Search, review and switch list modes for the active account."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/trades/new" size="lg" variant="primary">
                    New Trade
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="secondary">
                    Dashboard
                  </ButtonLink>
                </div>
              }
            />
          </Panel>
        </Reveal>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--muted-strong)]">
            View: {getListViewModeLabel(tradeListMode)}
          </span>
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--muted-strong)]">
            {accounts.length} account{accounts.length === 1 ? '' : 's'}
          </span>
        </div>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}
        {tradesState.error ? (
          <MessageBanner message={`Trades query error: ${tradesState.error}`} tone="error" />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Reveal delay={0.02}>
            <MetricCard
              label="Trades"
              value={String(filteredTrades.length)}
              caption={
                deferredSearchValue ? 'matching current search' : 'visible account scope'
              }
              tone="neutral"
            />
          </Reveal>
          <Reveal delay={0.04}>
            <MetricCard
              label="Net PnL"
              value={formatPnl(summary.netPnl)}
              caption="filtered result"
              tone={summary.netPnl < 0 ? 'danger' : 'accent'}
              className={getPnlCardClassName(summary.netPnl)}
              valueClassName={getPnlTextClassName(summary.netPnl)}
            />
          </Reveal>
          <Reveal delay={0.06}>
            <MetricCard
              label="Wins"
              value={String(summary.wins)}
              caption={`${summary.losses} losses / ${summary.breakeven} BE`}
              tone="success"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <MetricCard
              label="Screenshots"
              value={String(summary.screenshotCount)}
              caption={
                summary.screenshotRate === null
                  ? 'no trades yet'
                  : `${Math.round(summary.screenshotRate)}% coverage`
              }
              tone="neutral"
            />
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="list"
              title="All trades"
              description={
                deferredSearchValue
                  ? `Showing ${filteredTrades.length} matching trades.`
                  : 'Most recent executions first.'
              }
            />
            <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
              <label className="mb-5 block">
                <span className="sr-only">Search trades</span>
                <input
                  className="min-h-12 w-full rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-5 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                  placeholder="Search symbol, date, bias, session, notes, tags..."
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </label>

              {tradesState.loading ? (
                <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                  Loading trades...
                </div>
              ) : null}

              {!tradesState.loading && !tradesState.error && tradesState.items.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  No trades yet for this account.
                </div>
              ) : null}

              {!tradesState.loading &&
              !tradesState.error &&
              tradesState.items.length > 0 &&
              filteredTrades.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  No trades match the current search.
                </div>
              ) : null}

              {!tradesState.loading && !tradesState.error && filteredTrades.length > 0 ? (
                tradeListMode === 'calendar' ? (
                  <TradeCalendarView
                    trades={filteredTrades}
                    emptyMessage="No trades match this calendar."
                  />
                ) : (
                  <div
                    className={cx(
                      'grid gap-4',
                      tradeListMode === 'stacked' || tradeListMode === 'compact'
                        ? 'grid-cols-1'
                        : 'xl:grid-cols-2',
                    )}
                  >
                    {filteredTrades.map((trade, index) => (
                      <TradeCard
                        key={trade.id}
                        trade={trade}
                        index={index}
                        compact={tradeListMode === 'compact'}
                        editHref={`/trades/${trade.id}/edit`}
                        onDelete={handleDeleteTrade}
                        variant={tradeListMode === 'stacked' ? 'stacked' : undefined}
                      />
                    ))}
                  </div>
                )
              ) : null}
            </div>
          </Panel>
        </Reveal>
      </div>
    </PageShell>
  );
}
