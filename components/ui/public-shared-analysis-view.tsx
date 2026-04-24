'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/ui/auth-provider';
import BrandMark from '@/components/ui/brand-mark';
import { ButtonLink } from '@/components/ui/button';
import {
  formatAnalysisDate,
  normalizePublicSharedAnalysis,
  type PublicSharedAnalysisRow,
  type PublicSharedAnalysisView,
} from '@/lib/analyses';

type PublicSharedAnalysisState = {
  error: string | null;
  item: PublicSharedAnalysisView | null;
  loading: boolean;
};

const initialState: PublicSharedAnalysisState = {
  error: null,
  item: null,
  loading: true,
};

function PublicField({
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

export default function PublicSharedAnalysisView({ token }: { token: string }) {
  const { loading: authLoading, supabase } = useAuth();
  const [state, setState] = useState<PublicSharedAnalysisState>(initialState);
  const analysis = state.item;
  const authorLabel = useMemo(() => {
    if (!analysis) {
      return 'One Journal user';
    }

    return (
      analysis.authorDisplayName ||
      (analysis.authorUsername ? `@${analysis.authorUsername}` : null) ||
      'One Journal user'
    );
  }, [analysis]);

  useEffect(() => {
    if (authLoading || !supabase) {
      return;
    }

    const currentSupabase = supabase;
    let ignore = false;

    async function loadSharedAnalysis() {
      const { data, error } = await currentSupabase.rpc(
        'get_public_shared_analysis',
        {
          analysis_share_token: token,
        },
      );

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

      const rows = (data ?? []) as PublicSharedAnalysisRow[];
      const row = rows[0] ?? null;

      setState({
        error: row ? null : 'This shared analysis is unavailable.',
        item: row ? normalizePublicSharedAnalysis(row) : null,
        loading: false,
      });
    }

    void loadSharedAnalysis();

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
          <span className="relative flex h-11 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-1.5 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.36)]">
            <BrandMark title="One Journal" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              One Journal
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
              shared analysis
            </p>
          </div>
        </div>
        <ButtonLink href="/" size="sm" variant="secondary">
          Open One Journal
        </ButtonLink>
      </header>

      {state.loading ? (
        <section className="rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_30px_68px_-42px_var(--shadow-color)] sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading shared analysis...</p>
        </section>
      ) : null}

      {!state.loading && (!analysis || state.error) ? (
        <section className="rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_30px_68px_-42px_var(--shadow-color)] sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
            Unavailable
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Shared analysis not found
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            The link may be disabled, expired or mistyped.
          </p>
        </section>
      ) : null}

      {analysis ? (
        <article className="space-y-5">
          <section className="overflow-hidden rounded-[34px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_34px_90px_-46px_var(--shadow-color)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
                  {analysis.symbol ?? 'Analysis'}
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
                  {analysis.symbol
                    ? `${analysis.symbol} ${analysis.bias ?? 'analysis'}`
                    : analysis.bias ?? 'Shared analysis'}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted-strong)]">
                  <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                    By {authorLabel}
                  </span>
                  {analysis.analysisDate ? (
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      {formatAnalysisDate(analysis.analysisDate)}
                    </span>
                  ) : null}
                  {analysis.timeframe ? (
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      {analysis.timeframe}
                    </span>
                  ) : null}
                  {analysis.session ? (
                    <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-3 py-1.5">
                      {analysis.session}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {analysis.tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {analysis.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] px-3 py-1.5 text-sm capitalize text-[var(--accent-text)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {analysis.screenshotUrls.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.screenshotUrls.map((url, index) => (
                <a
                  key={`${url}-${index}`}
                  className="block overflow-hidden rounded-[30px] border border-[color:var(--border-color)] bg-[var(--surface)] shadow-[0_24px_56px_-38px_var(--shadow-color)]"
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div className="aspect-[16/9] bg-[var(--surface-raised)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`${analysis.symbol ?? 'Shared'} analysis screenshot ${index + 1}`}
                      className="h-full w-full object-cover"
                      src={url}
                    />
                  </div>
                </a>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <PublicField label="Confluences" value={analysis.confluences} />
            <PublicField label="Market context" value={analysis.marketContext} />
            <PublicField label="Key levels" value={analysis.keyLevels} />
            <PublicField label="Liquidity notes" value={analysis.liquidityNotes} />
            <PublicField label="Entry plan" value={analysis.entryPlan} />
            <PublicField label="Invalidation" value={analysis.invalidation} />
            <div className="md:col-span-2">
              <PublicField label="Notes" value={analysis.notes} />
            </div>
          </div>
        </article>
      ) : null}
    </main>
  );
}
