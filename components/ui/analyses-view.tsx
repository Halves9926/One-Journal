'use client';

import { useDeferredValue, useMemo, useState } from 'react';

import AnalysisCard from '@/components/ui/analysis-card';
import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useUserAnalyses } from '@/components/ui/use-user-analyses';
import { getAnalysisSearchText } from '@/lib/analyses';

export default function AnalysesView() {
  const { loading: authLoading, supabase, user } = useAuth();
  const {
    activeAccount,
    accounts,
    error: accountsError,
    loading: accountsLoading,
  } = useAccounts();
  const analysesState = useUserAnalyses({
    accountId: activeAccount?.id ?? null,
    enabled: Boolean(user && activeAccount),
    limit: null,
  });
  const [searchValue, setSearchValue] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
  const filteredAnalyses = useMemo(() => {
    if (!deferredSearchValue) {
      return analysesState.items;
    }

    return analysesState.items.filter((analysis) =>
      getAnalysisSearchText(analysis).includes(deferredSearchValue),
    );
  }, [analysesState.items, deferredSearchValue]);

  async function handleDeleteAnalysis(analysisId: string) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', user.id);

    if (error) {
      return { error: error.message };
    }

    analysesState.refresh();
    return { error: null };
  }

  if (authLoading || !supabase || accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading analyses...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Analyses locked"
          description="Sign in to open the journal analyses workspace."
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
              title="Create an account before logging analyses"
              description="Analyses are attached to the active account. Create the first account to start logging pre-trade context."
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
                  No active account yet. Create one and the analysis journal will follow that workspace.
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
              eyebrow="analyses"
              title={`${activeAccount.name} analyses`}
              description="Thesis logs, market context and execution plans for the active account."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/analyses/new" size="lg" variant="primary">
                    New Analysis
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="secondary">
                    Dashboard
                  </ButtonLink>
                </div>
              }
            />
          </Panel>
        </Reveal>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}
        {analysesState.error ? (
          <MessageBanner
            message={`Analyses query error: ${analysesState.error}`}
            tone="error"
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Reveal delay={0.02}>
            <MetricCard
              label="Active account"
              value={activeAccount.name}
              caption={activeAccount.type}
              tone="accent"
            />
          </Reveal>
          <Reveal delay={0.04}>
            <MetricCard
              label="Analyses"
              value={String(analysesState.items.length)}
              caption="saved for this account"
              tone="neutral"
            />
          </Reveal>
          <Reveal delay={0.06}>
            <MetricCard
              label="Matches"
              value={String(filteredAnalyses.length)}
              caption={deferredSearchValue ? 'filtered results' : 'visible results'}
              tone="success"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <MetricCard
              label="Accounts"
              value={String(accounts.length)}
              caption="switch from top bar"
              tone="neutral"
            />
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="search"
              title="Find analyses"
              description="Search symbol, date, session, bias, context, confluences, levels or notes."
            />
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-4 shadow-[0_18px_42px_-34px_var(--shadow-color)]">
                <label className="block">
                  <span className="sr-only">Search analyses</span>
                  <input
                    type="search"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search symbol, bias, session, confluences, levels..."
                    className="w-full rounded-[20px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                  />
                </label>
              </div>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.14}>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="list"
              title="Journal analyses"
              description={
                deferredSearchValue
                  ? `Showing ${filteredAnalyses.length} matching analyses.`
                  : 'Most recent thesis logs first.'
              }
            />
            <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
              {analysesState.loading ? (
                <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                  Loading analyses...
                </div>
              ) : null}

              {!analysesState.loading &&
              !analysesState.error &&
              analysesState.items.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  No analyses yet for this account. Save the first thesis and it will appear here.
                </div>
              ) : null}

              {!analysesState.loading &&
              !analysesState.error &&
              analysesState.items.length > 0 &&
              filteredAnalyses.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-5 py-6 text-sm leading-7 text-[var(--muted)]">
                  No analyses match the current search.
                </div>
              ) : null}

              {!analysesState.loading &&
              !analysesState.error &&
              filteredAnalyses.length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredAnalyses.map((analysis, index) => (
                    <AnalysisCard
                      key={analysis.id}
                      analysis={analysis}
                      index={index}
                      editHref={`/analyses/${analysis.id}/edit`}
                      onDelete={handleDeleteAnalysis}
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
