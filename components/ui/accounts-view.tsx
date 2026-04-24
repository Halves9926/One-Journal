'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import AccountCard from '@/components/ui/account-card';
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
import { useWidgetPreferences } from '@/components/ui/widget-preferences';
import { buildAccountMetrics, getTradesForAccount } from '@/lib/accounts';
import { formatPnl, getPnlCardClassName, getPnlTextClassName } from '@/lib/trades';
import { cx } from '@/lib/utils';

type Feedback = {
  message: string;
  tone: 'error' | 'success';
} | null;

export default function AccountsView() {
  const router = useRouter();
  const { loading: authLoading, supabase, user } = useAuth();
  const {
    accounts,
    activeAccount,
    deleteAccount,
    error: accountsError,
    loading: accountsLoading,
    markAccountFunded,
    markPhasePassed,
    refreshAccounts,
    setActiveAccount,
    startNextPhase,
  } = useAccounts();
  const tradesState = useUserTrades({
    enabled: Boolean(user),
    limit: null,
  });
  const { preferences } = useListViewPreferences();
  const { preferences: widgetPreferences } = useWidgetPreferences();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const accountEntries = useMemo(
    () =>
      accounts.map((account) => {
        const trades = getTradesForAccount(tradesState.items, account.id, {
          fallbackToAllWhenEmpty: false,
          includeUnassigned: account.id === activeAccount?.id,
        });
        const metrics = buildAccountMetrics(account, trades);

        return {
          account,
          metrics,
          trades,
        };
      }),
    [accounts, activeAccount?.id, tradesState.items],
  );
  const activeAccountTrades =
    accountEntries.find((entry) => entry.account.id === activeAccount?.id)?.trades ??
    tradesState.items;
  const visibleAccountTrades =
    preferences.trades === 'calendar'
      ? activeAccountTrades
      : activeAccountTrades.slice(0, 6);
  const fundedAccounts = accounts.filter((account) => account.isFunded).length;
  const totalNetPnl = accountEntries.reduce(
    (total, entry) => total + entry.metrics.summary.netPnl,
    0,
  );
  const accountListMode = preferences.accounts;

  async function runAction(
    key: string,
    message: string,
    action: () => Promise<{ error: string | null }>,
  ) {
    setBusyAction(key);
    setFeedback(null);

    const result = await action();

    setBusyAction(null);

    if (result.error) {
      setFeedback({
        message: result.error,
        tone: 'error',
      });
      return;
    }

    setFeedback({
      message,
      tone: 'success',
    });
  }

  async function openAccountDashboard(accountId: string) {
    if (activeAccount?.id === accountId) {
      router.push('/dashboard');
      return;
    }

    setBusyAction(`${accountId}:open`);
    setFeedback(null);

    const result = await setActiveAccount(accountId);

    setBusyAction(null);

    if (result.error) {
      setFeedback({
        message: result.error,
        tone: 'error',
      });
      return;
    }

    router.push('/dashboard');
  }

  async function handleDeleteAccount(accountId: string) {
    setFeedback(null);
    const targetEntry = accountEntries.find((entry) => entry.account.id === accountId);

    const result = await deleteAccount(accountId);

    if (result.error) {
      return result;
    }

    setFeedback({
      message:
        targetEntry && targetEntry.metrics.summary.totalTrades > 0
          ? `Account deleted successfully. ${targetEntry.metrics.summary.totalTrades} linked ${
              targetEntry.metrics.summary.totalTrades === 1 ? 'trade was' : 'trades were'
            } removed too.`
          : 'Account deleted successfully.',
      tone: 'success',
    });
    return result;
  }

  if (authLoading || !supabase || accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading accounts...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Accounts locked"
          description="Sign in to manage trading accounts."
        />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <Reveal>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="accounts"
              title="Trading accounts"
              description="Create separate demo, propfirm, live and backtest workspaces. The active account drives home, dashboard and new trade."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/accounts/new" size="lg" variant="primary">
                    New Account
                  </ButtonLink>
                  <ButtonLink href="/trades/new" size="lg" variant="secondary">
                    New Trade
                  </ButtonLink>
                </div>
              }
            />
          </Panel>
        </Reveal>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}
        {tradesState.error ? (
          <MessageBanner message={`Trades query error: ${tradesState.error}`} tone="error" />
        ) : null}
        {feedback ? <MessageBanner message={feedback.message} tone={feedback.tone} /> : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--muted-strong)]">
            View: {getListViewModeLabel(accountListMode)}
          </span>
        </div>

        {accounts.length > 0 ? (
          <div
            className={cx(
              'grid gap-6',
              accountListMode === 'stacked'
                ? 'grid-cols-1'
                : accountListMode === 'compact'
                  ? 'grid-cols-1'
                  : 'xl:grid-cols-2',
            )}
          >
            {accountEntries.map((entry, index) => (
              <Reveal key={entry.account.id} delay={index * 0.05}>
                <AccountCard
                  account={entry.account}
                  metrics={entry.metrics}
                  busyAction={busyAction}
                  editHref={
                    entry.account.canManageAccount
                      ? `/accounts/${entry.account.id}/edit`
                      : undefined
                  }
                  hasFallbackAccount={accounts.some(
                    (account) => account.id !== entry.account.id,
                  )}
                  linkedTradesCount={entry.metrics.summary.totalTrades}
                  onActivate={async (accountId) => {
                    await runAction(
                      `${accountId}:activate`,
                      'Active account updated.',
                      () => setActiveAccount(accountId),
                    );
                  }}
                  onCoopUpdated={refreshAccounts}
                  onMarkFunded={async (accountId) => {
                    await runAction(
                      `${accountId}:funded`,
                      'Account marked as funded.',
                      () => markAccountFunded(accountId),
                    );
                  }}
                  onMarkPhasePassed={async (accountId) => {
                    await runAction(
                      `${accountId}:pass`,
                      'Phase marked as passed.',
                      () => markPhasePassed(accountId),
                    );
                  }}
                  onOpenDashboard={openAccountDashboard}
                  onStartNextPhase={async (accountId) => {
                    await runAction(
                      `${accountId}:next-phase`,
                      'Next phase started.',
                      () => startNextPhase(accountId),
                    );
                  }}
                  onDelete={
                    entry.account.canDeleteAccount ? handleDeleteAccount : undefined
                  }
                  variant={
                    accountListMode === 'stacked'
                      ? 'stacked'
                      : accountListMode === 'compact'
                        ? 'compact'
                        : undefined
                  }
                  winRateVariant={widgetPreferences.defaultWinRateVariant}
                />
              </Reveal>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Reveal delay={0.02}>
            <MetricCard
              label="Total accounts"
              value={String(accounts.length)}
              caption="tracked workspaces"
              tone="neutral"
            />
          </Reveal>
          <Reveal delay={0.04}>
            <MetricCard
              label="Active account"
              value={activeAccount?.name ?? 'No active account'}
              caption={activeAccount?.type ?? 'Create one to begin'}
              tone="accent"
            />
          </Reveal>
          <Reveal delay={0.06}>
            <MetricCard
              label="Funded props"
              value={String(fundedAccounts)}
              caption="prop accounts currently funded"
              tone="success"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <MetricCard
              label="Tracked PnL"
              value={formatPnl(totalNetPnl)}
              caption="across every account"
              tone={totalNetPnl < 0 ? 'danger' : 'accent'}
              className={getPnlCardClassName(totalNetPnl)}
              valueClassName={getPnlTextClassName(totalNetPnl)}
            />
          </Reveal>
        </div>

        {accounts.length === 0 ? (
          <Reveal delay={0.1}>
            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                No accounts yet. Create the first one and the whole journal becomes account-aware automatically.
              </div>
            </Panel>
          </Reveal>
        ) : null}

        {accounts.length > 0 ? (
          <Reveal delay={0.1}>
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="trades"
                title="Active account trades"
                description={`${activeAccountTrades.length} trades loaded for ${activeAccount?.name ?? 'the active account'}.`}
                action={
                  <ButtonLink href="/trades/new" size="lg" variant="secondary">
                    Add Trade
                  </ButtonLink>
                }
              />
              <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
                {tradesState.loading ? (
                  <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                    Loading trades...
                  </div>
                ) : null}

                {!tradesState.loading && !tradesState.error && visibleAccountTrades.length === 0 ? (
                  <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                    No trades are visible for the active account.
                  </div>
                ) : null}

                {!tradesState.loading && !tradesState.error && visibleAccountTrades.length > 0 ? (
                  preferences.trades === 'calendar' ? (
                    <TradeCalendarView
                      trades={visibleAccountTrades}
                      emptyMessage="No active account trades available for this calendar."
                    />
                  ) : (
                    <div className="grid items-start gap-4">
                      {visibleAccountTrades.map((trade, index) => (
                        <TradeCard
                          key={`account-visible-trade-${trade.id}`}
                          trade={trade}
                          index={index}
                          compact
                          editHref={`/trades/${trade.id}/edit`}
                          variant="stacked"
                        />
                      ))}
                    </div>
                  )
                ) : null}
              </div>
            </Panel>
          </Reveal>
        ) : null}

      </div>
    </PageShell>
  );
}
