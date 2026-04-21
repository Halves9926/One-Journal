'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import AnalysisCard from '@/components/ui/analysis-card';
import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import {
  getListViewModeLabel,
  useListViewPreferences,
} from '@/components/ui/list-view-preferences';
import PageShell from '@/components/ui/page-shell';
import { MetricCard, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useUserAnalyses } from '@/components/ui/use-user-analyses';
import { getAnalysisSearchText } from '@/lib/analyses';
import { cx } from '@/lib/utils';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="m14.2 14.2 3.05 3.05M8.75 15.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

function AnalysisSearchDrawer({
  matchesCount,
  onClose,
  onReset,
  onSearchChange,
  open,
  searchValue,
}: {
  matchesCount: number;
  onClose: () => void;
  onReset: () => void;
  onSearchChange: (value: string) => void;
  open: boolean;
  searchValue: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center overflow-x-hidden px-3 py-4 sm:items-center sm:px-6">
      <button
        aria-label="Close analysis search"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        type="button"
        onClick={onClose}
      />
      <div
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] shadow-[0_34px_90px_-36px_rgba(0,0,0,0.48)]"
        role="dialog"
      >
        <div className="border-b border-[color:var(--border-color)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
                Search
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                Find analyses
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Symbol, date, session, bias, confluences, levels and notes.
              </p>
            </div>
            <button
              aria-label="Close"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
              type="button"
              onClick={onClose}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <label className="block">
            <span className="sr-only">Search analyses</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                autoFocus
                className="min-h-12 w-full rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                placeholder="Search symbol, bias, session, confluences, notes..."
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          </label>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--muted-strong)]">
              {matchesCount} match{matchesCount === 1 ? '' : 'es'}
            </span>
            <div className="flex gap-2">
              <Button
                disabled={!searchValue.trim()}
                size="sm"
                type="button"
                variant="secondary"
                onClick={onReset}
              >
                Reset
              </Button>
              <Button size="sm" type="button" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

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
  const { preferences } = useListViewPreferences();
  const [searchValue, setSearchValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
  const analysisListMode = preferences.analyses;
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
                  <Button
                    size="lg"
                    type="button"
                    variant="secondary"
                    onClick={() => setSearchOpen(true)}
                  >
                    <SearchIcon className="h-4 w-4" />
                    Search
                  </Button>
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--muted-strong)]">
            View: {getListViewModeLabel(analysisListMode)}
          </span>
          {searchValue.trim() ? (
            <>
              <span className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1.5 text-sm text-[var(--accent-text)]">
                Search: {searchValue.trim()}
              </span>
              <button
                className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                type="button"
                onClick={() => setSearchValue('')}
              >
                Reset
              </button>
            </>
          ) : null}
        </div>

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
                <div
                  className={cx(
                    'grid gap-4',
                    analysisListMode === 'stacked'
                      ? 'grid-cols-1'
                      : analysisListMode === 'compact'
                        ? 'grid-cols-1'
                        : 'xl:grid-cols-2',
                  )}
                >
                  {filteredAnalyses.map((analysis, index) => (
                    <AnalysisCard
                      key={analysis.id}
                      analysis={analysis}
                      index={index}
                      compact={analysisListMode === 'compact'}
                      editHref={`/analyses/${analysis.id}/edit`}
                      onDelete={handleDeleteAnalysis}
                      onShareUpdated={analysesState.refresh}
                      variant={analysisListMode === 'stacked' ? 'stacked' : undefined}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </Panel>
        </Reveal>

        <AnalysisSearchDrawer
          matchesCount={filteredAnalyses.length}
          onClose={() => setSearchOpen(false)}
          onReset={() => setSearchValue('')}
          onSearchChange={setSearchValue}
          open={searchOpen}
          searchValue={searchValue}
        />
      </div>
    </PageShell>
  );
}
