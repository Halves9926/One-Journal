'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import FeedbackToast from '@/components/ui/feedback-toast';
import {
  InputField,
  MessageBanner,
  SelectField,
  TextareaField,
} from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import { useClientReady } from '@/components/ui/use-client-ready';
import {
  clearFormDraft,
  readFormDraft,
  writeFormDraft,
} from '@/lib/form-drafts';
import type { AnalysisRow } from '@/lib/supabase';
import {
  ANALYSIS_SELECT,
  createInitialAnalysisFormValues,
  formatAnalysisDate,
  mapAnalysisFormToInsert,
  mapAnalysisFormToUpdate,
  mapAnalysisToFormValues,
  normalizeAnalysis,
  type AnalysisFormInput,
} from '@/lib/analyses';

type ToastState = {
  items: string[];
  message: string;
  tone: 'error' | 'success' | 'neutral';
  title: string;
} | null;

type FieldErrors = Partial<Record<keyof AnalysisFormInput, string>>;

type NewAnalysisFormProps = {
  analysisId?: string;
  mode?: 'create' | 'edit';
};

function buildAnalysisDraftStorageKey(mode: 'create' | 'edit', analysisId?: string) {
  return mode === 'edit' && analysisId
    ? `one-journal.analysis-form.edit.${analysisId}.v1`
    : 'one-journal.analysis-form.create.v1';
}

export default function NewAnalysisForm({
  analysisId,
  mode = 'create',
}: NewAnalysisFormProps) {
  const router = useRouter();
  const isClient = useClientReady();
  const { loading, supabase, user } = useAuth();
  const { accounts, activeAccount, error: accountsError, loading: accountsLoading } =
    useAccounts();
  const isEditMode = mode === 'edit' && Boolean(analysisId);
  const draftStorageKey = buildAnalysisDraftStorageKey(mode, analysisId);
  const [values, setValues] = useState<AnalysisFormInput>(() =>
    createInitialAnalysisFormValues(activeAccount?.id ?? ''),
  );
  const [initialValues, setInitialValues] = useState<AnalysisFormInput>(() =>
    createInitialAnalysisFormValues(activeAccount?.id ?? ''),
  );
  const [toast, setToast] = useState<ToastState>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(isEditMode);
  const [analysisLoadError, setAnalysisLoadError] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [shouldPersistDraft, setShouldPersistDraft] = useState(false);
  const selectedAccount =
    accounts.find((account) => account.id === values.account_id) ?? activeAccount ?? null;

  function clearDraft() {
    clearFormDraft(draftStorageKey);
    setShouldPersistDraft(false);
  }

  useEffect(() => {
    if (!activeAccount?.id || accounts.length === 0) {
      return;
    }

    setValues((current) => {
      if (
        current.account_id &&
        accounts.some((account) => account.id === current.account_id)
      ) {
        return current;
      }

      return {
        ...current,
        account_id: activeAccount.id,
      };
    });
  }, [accounts, activeAccount?.id]);

  useEffect(() => {
    if (!isEditMode || !isClient || !supabase || !user || !analysisId) {
      return;
    }

    const currentSupabase = supabase;
    const currentUser = user;
    const currentAnalysisId = analysisId;
    let ignore = false;

    async function loadAnalysis() {
      setIsLoadingAnalysis(true);
      setAnalysisLoadError(null);

      const { data, error } = await currentSupabase
        .from('analyses')
        .select(ANALYSIS_SELECT)
        .eq('id', currentAnalysisId)
        .eq('user_id', currentUser.id)
        .single()
        .overrideTypes<AnalysisRow, { merge: false }>();

      if (ignore) {
        return;
      }

      if (error || !data) {
        setAnalysisLoadError(error?.message ?? 'Analysis not found.');
        setIsLoadingAnalysis(false);
        return;
      }

      const nextValues = mapAnalysisToFormValues(
        normalizeAnalysis(data, 0),
        activeAccount?.id ?? '',
      );
      const restoredDraft = readFormDraft(draftStorageKey, nextValues);
      const hydratedValues = restoredDraft ?? nextValues;

      setInitialValues(nextValues);
      setValues(hydratedValues);
      setFieldErrors({});
      setToast(null);
      setIsLoadingAnalysis(false);
      setShouldPersistDraft(Boolean(restoredDraft));
      setHasHydratedDraft(true);
    }

    void loadAnalysis();

    return () => {
      ignore = true;
    };
  }, [activeAccount?.id, analysisId, draftStorageKey, isClient, isEditMode, supabase, user]);

  useEffect(() => {
    if (!isClient || isEditMode || hasHydratedDraft || loading || accountsLoading) {
      return;
    }

    const baseValues = createInitialAnalysisFormValues(activeAccount?.id ?? '');
    const restoredDraft = readFormDraft(draftStorageKey, baseValues);

    setInitialValues(baseValues);
    setValues(restoredDraft ?? baseValues);
    setShouldPersistDraft(Boolean(restoredDraft));
    setHasHydratedDraft(true);
  }, [
    accountsLoading,
    activeAccount?.id,
    draftStorageKey,
    hasHydratedDraft,
    isClient,
    isEditMode,
    loading,
  ]);

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    if (!shouldPersistDraft) {
      clearFormDraft(draftStorageKey);
      return;
    }

    writeFormDraft(draftStorageKey, values);
  }, [draftStorageKey, hasHydratedDraft, shouldPersistDraft, values]);

  function updateValue<Key extends keyof AnalysisFormInput>(
    key: Key,
    value: AnalysisFormInput[Key],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));

    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });

    setShouldPersistDraft(true);
    setToast(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setToast({
        title: 'Access required',
        message: 'Sign in to save an analysis.',
        items: [],
        tone: 'error',
      });
      return;
    }

    if (!supabase) {
      setToast({
        title: 'Connection issue',
        message: 'Supabase client unavailable. Reload and retry.',
        items: [],
        tone: 'error',
      });
      return;
    }

    const nextErrors: FieldErrors = {};

    if (!values.account_id.trim()) {
      nextErrors.account_id = 'Select an account before saving.';
    }

    if (!values.analysis_date.trim()) {
      nextErrors.analysis_date = 'Analysis date is required.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setToast({
        title: 'Complete required fields',
        message: 'Pick the account and analysis date before saving.',
        items: Object.keys(nextErrors).map((key) => key.replaceAll('_', ' ')),
        tone: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      const payload = isEditMode
        ? mapAnalysisFormToUpdate(values, user.id)
        : mapAnalysisFormToInsert(values, user.id);
      const query = isEditMode
        ? supabase
            .from('analyses')
            .update(payload)
            .eq('id', analysisId ?? '')
            .eq('user_id', user.id)
        : supabase.from('analyses').insert(payload);
      const { error } = await query;

      if (error) {
        throw error;
      }

      clearDraft();
      setFieldErrors({});
      const resetValues = isEditMode
        ? values
        : createInitialAnalysisFormValues(values.account_id);
      setInitialValues(resetValues);
      setValues(resetValues);
      setToast({
        title: isEditMode ? 'Analysis updated' : 'Analysis saved',
        message: isEditMode
          ? 'The analysis changes were saved successfully.'
          : 'The analysis was saved successfully.',
        items: [],
        tone: 'success',
      });
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      router.replace('/analyses');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Analysis save failed. Review the fields and try again.';

      setToast({
        title: 'Save failed',
        message,
        items: [],
        tone: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const notePreview = useMemo(
    () =>
      (
        values.confluences ||
        values.market_context ||
        values.entry_plan ||
        values.notes ||
        'No thesis written yet.'
      ).slice(0, 180),
    [values.confluences, values.entry_plan, values.market_context, values.notes],
  );

  if (loading || !supabase || accountsLoading || isLoadingAnalysis || !isClient) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">
            {isEditMode ? 'Loading analysis...' : 'Loading session...'}
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Analysis journal locked"
          description="Sign in to write analyses."
        />
      </PageShell>
    );
  }

  if (analysisLoadError) {
    return (
      <PageShell>
        <Panel className="overflow-hidden">
          <PanelHeader
            eyebrow="analysis"
            title="Analysis unavailable"
            description="The requested analysis could not be loaded for editing."
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/analyses" size="lg" variant="secondary">
                  Analyses
                </ButtonLink>
                <ButtonLink href="/analyses/new" size="lg" variant="primary">
                  New Analysis
                </ButtonLink>
              </div>
            }
          />
          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <MessageBanner message={analysisLoadError} tone="error" />
          </div>
        </Panel>
      </PageShell>
    );
  }

  if (accounts.length === 0) {
    return (
      <PageShell size="wide">
        <Reveal>
          <Panel className="px-6 py-7 sm:px-8 sm:py-8">
            <PanelHeader
              eyebrow="accounts"
              title="Create an account before saving analyses"
              description="Each analysis is account-aware. Create an account first, then attach the thesis log to it."
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
                  No accounts available yet. Create one and the analysis journal becomes account-aware automatically.
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
      <FeedbackToast
        visible={Boolean(toast)}
        title={toast?.title ?? ''}
        message={toast?.message ?? ''}
        items={toast?.items}
        tone={toast?.tone}
        onClose={() => setToast(null)}
      />

      <div className="space-y-6">
        <Reveal>
          <Panel className="overflow-hidden">
            <PanelHeader
              eyebrow="analyses"
              title={isEditMode ? 'Edit Analysis' : 'New Analysis'}
              description={
                isEditMode
                  ? 'Update the saved thesis without breaking account awareness.'
                  : 'Log a thesis, levels and execution plan for the active account.'
              }
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/analyses" size="lg" variant="secondary">
                    Analyses
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="ghost">
                    Dashboard
                  </ButtonLink>
                </div>
              }
            />
          </Panel>
        </Reveal>

        {accountsError ? <MessageBanner message={accountsError} tone="error" /> : null}

        <form
          id="analysis-form"
          onSubmit={handleSubmit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <Reveal delay={0.02}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="context"
                  title="Analysis context"
                  description="Attach the thesis to the right account, date and market frame."
                />
                <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                  <SelectField
                    label="Account"
                    required
                    value={values.account_id}
                    error={fieldErrors.account_id}
                    onChange={(event) => updateValue('account_id', event.target.value)}
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.type}
                      </option>
                    ))}
                  </SelectField>

                  <InputField
                    label="Analysis date"
                    type="date"
                    required
                    value={values.analysis_date}
                    error={fieldErrors.analysis_date}
                    onChange={(event) =>
                      updateValue('analysis_date', event.target.value)
                    }
                  />

                  <InputField
                    label="Symbol"
                    value={values.symbol}
                    onChange={(event) => updateValue('symbol', event.target.value)}
                    placeholder="ES, NQ, EURUSD, BTCUSD"
                  />

                  <InputField
                    label="Timeframe"
                    value={values.timeframe}
                    onChange={(event) => updateValue('timeframe', event.target.value)}
                    placeholder="M5, H1, Daily"
                  />

                  <InputField
                    label="Session"
                    value={values.session}
                    onChange={(event) => updateValue('session', event.target.value)}
                    placeholder="London, New York"
                  />

                  <SelectField
                    label="Bias"
                    value={values.bias}
                    onChange={(event) => updateValue('bias', event.target.value)}
                  >
                    <option value="">Select bias</option>
                    <option value="Bullish">Bullish</option>
                    <option value="Bearish">Bearish</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Wait">Wait</option>
                  </SelectField>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.06}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="thesis"
                  title="Context and confluence"
                  description="Write the higher timeframe read, key levels and liquidity map."
                />
                <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                  <TextareaField
                    label="Confluences"
                    value={values.confluences}
                    onChange={(event) =>
                      updateValue('confluences', event.target.value)
                    }
                    placeholder="HTF direction, structure, imbalance, correlation..."
                  />
                  <TextareaField
                    label="Market context"
                    value={values.market_context}
                    onChange={(event) =>
                      updateValue('market_context', event.target.value)
                    }
                    placeholder="Trend state, macro tone, session condition..."
                  />
                  <TextareaField
                    label="Key levels"
                    value={values.key_levels}
                    onChange={(event) =>
                      updateValue('key_levels', event.target.value)
                    }
                    placeholder="PDH, PDL, weekly high, range edges..."
                  />
                  <TextareaField
                    label="Liquidity notes"
                    value={values.liquidity_notes}
                    onChange={(event) =>
                      updateValue('liquidity_notes', event.target.value)
                    }
                    placeholder="Sweeps, resting liquidity, expected raid..."
                  />
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.1}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="plan"
                  title="Execution plan"
                  description="Keep the plan actionable and compact."
                />
                <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                  <TextareaField
                    label="Entry plan"
                    value={values.entry_plan}
                    onChange={(event) =>
                      updateValue('entry_plan', event.target.value)
                    }
                    placeholder="Trigger, confirmation, execution trigger..."
                  />
                  <TextareaField
                    label="Invalidation"
                    value={values.invalidation}
                    onChange={(event) =>
                      updateValue('invalidation', event.target.value)
                    }
                    placeholder="What breaks the thesis?"
                  />
                  <TextareaField
                    label="Notes"
                    value={values.notes}
                    onChange={(event) => updateValue('notes', event.target.value)}
                    placeholder="Anything extra worth remembering..."
                    wrapperClassName="md:col-span-2"
                  />
                  <InputField
                    label="Screenshot URL"
                    type="url"
                    value={values.screenshot_url}
                    onChange={(event) =>
                      updateValue('screenshot_url', event.target.value)
                    }
                    placeholder="https://..."
                    wrapperClassName="md:col-span-2"
                  />
                </div>
              </Panel>
            </Reveal>
          </div>

          <div className="space-y-6 xl:sticky xl:top-32 xl:self-start">
            <Reveal delay={0.08}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                  Preview
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Account</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {selectedAccount?.name ?? 'Pending'}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                      {selectedAccount?.type ?? 'Select account'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Instrument</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.symbol.trim() || 'Pending'}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                      {values.timeframe.trim() || 'Timeframe pending'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Bias</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.bias || 'Pending'}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                      {values.session || formatAnalysisDate(values.analysis_date)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Lead note</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">
                      {notePreview}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.12}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                  Actions
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    type="submit"
                    form="analysis-form"
                    disabled={isSubmitting}
                    size="lg"
                    variant="primary"
                    className="w-full"
                  >
                    {isSubmitting
                      ? isEditMode
                        ? 'Saving changes...'
                        : 'Saving...'
                      : isEditMode
                        ? 'Save Changes'
                        : 'Save Analysis'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setValues(
                        isEditMode
                          ? initialValues
                          : createInitialAnalysisFormValues(activeAccount?.id ?? ''),
                      );
                      clearDraft();
                      setFieldErrors({});
                      setToast(null);
                    }}
                    className="w-full"
                  >
                    {isEditMode ? 'Reset Changes' : 'Reset'}
                  </Button>
                </div>
              </Panel>
            </Reveal>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
