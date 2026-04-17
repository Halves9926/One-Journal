'use client';

import { useMemo, useState } from 'react';

import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import AccountCard from '@/components/ui/account-card';
import { MessageBanner } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useUserTrades } from '@/components/ui/use-user-trades';
import { buildAccountMetrics, getTradesForAccount } from '@/lib/accounts';
import { formatSignedNumber } from '@/lib/trades';

type Feedback = {
  message: string;
  tone: 'error' | 'success';
} | null;

export default function AccountsView() {
  const { loading: authLoading, supabase, user } = useAuth();
  const {
    accounts,
    activeAccount,
    error: accountsError,
    loading: accountsLoading,
    markAccountFunded,
    markPhasePassed,
    setActiveAccount,
    startNextPhase,
  } = useAccounts();
  const tradesState = useUserTrades({
    enabled: Boolean(user),
    limit: null,
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const accountEntries = useMemo(
    () =>
      accounts.map((account) => {
        const trades = getTradesForAccount(tradesState.items, account.id);
        const metrics = buildAccountMetrics(account, trades);

        return {
          account,
          metrics,
        };
      }),
    [accounts, tradesState.items],
  );
  const fundedAccounts = accounts.filter((account) => account.isFunded).length;
  const totalNetPnl = accountEntries.reduce(
    (total, entry) => total + entry.metrics.summary.netPnl,
    0,
  );

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
              value={formatSignedNumber(totalNetPnl)}
              caption="across every account"
              tone={totalNetPnl < 0 ? 'danger' : 'accent'}
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
          <div className="grid gap-6 xl:grid-cols-2">
            {accountEntries.map((entry, index) => (
              <Reveal key={entry.account.id} delay={index * 0.05}>
                <AccountCard
                  account={entry.account}
                  metrics={entry.metrics}
                  busyAction={busyAction}
                  onActivate={async (accountId) => {
                    await runAction(
                      `${accountId}:activate`,
                      'Active account updated.',
                      () => setActiveAccount(accountId),
                    );
                  }}
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
                  onStartNextPhase={async (accountId) => {
                    await runAction(
                      `${accountId}:next-phase`,
                      'Next phase started.',
                      () => startNextPhase(accountId),
                    );
                  }}
                />
              </Reveal>
            ))}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
