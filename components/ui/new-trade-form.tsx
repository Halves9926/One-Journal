'use client';

import { useEffect, useState } from 'react';
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
import { useTradePreferences } from '@/components/ui/trade-preferences-provider';
import {
  clearFormDraft,
  readFormDraft,
  writeFormDraft,
} from '@/lib/form-drafts';
import {
  TRADE_FIELD_DEFINITIONS,
  TRADE_FIELD_SECTIONS,
  type TradeFieldDefinition,
  type TradeFieldKey,
} from '@/lib/trade-form-preferences';
import type { TradeRow } from '@/lib/supabase';
import {
  TRADE_SELECT,
  createInitialTradeFormValues,
  formatPnl,
  getTradeTimeRangeLabel,
  mapTradeFormToInsert,
  mapTradeFormToUpdate,
  mapTradeToFormValues,
  normalizeTrade,
  type TradeFormInput,
} from '@/lib/trades';

type ToastState = {
  items: string[];
  message: string;
  tone: 'error' | 'success' | 'neutral';
  title: string;
} | null;

type FieldErrors = Partial<Record<TradeFieldKey | 'account_id', string>>;

type NewTradeFormProps = {
  mode?: 'create' | 'edit';
  tradeId?: string;
};

function validateNumericField(rawValue: string, label: string) {
  if (!rawValue.trim()) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue)
    ? null
    : `Field "${label}" must contain a valid number.`;
}

function isFieldFilled(field: TradeFieldDefinition, value: TradeFormInput[TradeFieldKey]) {
  if (field.control === 'checkbox') {
    return typeof value === 'boolean';
  }

  return String(value).trim().length > 0;
}

function buildTradeDraftStorageKey(mode: 'create' | 'edit', tradeId?: string) {
  return mode === 'edit' && tradeId
    ? `one-journal.trade-form.edit.${tradeId}.v1`
    : 'one-journal.trade-form.create.v1';
}

function getTradeSaveError(error: unknown) {
  const fallbackMessage = 'Trade save failed. Review the fields and try again.';

  if (!error || typeof error !== 'object') {
    return {
      items: [] as string[],
      message: fallbackMessage,
      title: 'Save failed',
    };
  }

  const candidate = error as {
    code?: string;
    details?: string;
    hint?: string;
    message?: string;
  };
  const rawMessage = candidate.message?.trim() || fallbackMessage;
  const detailItems = [candidate.details, candidate.hint].filter(
    (item): item is string => Boolean(item && item.trim()),
  );

  if (
    candidate.code === '23503' &&
    (rawMessage.includes('account_id') || candidate.details?.includes('account_id'))
  ) {
    return {
      field: 'account_id' as const,
      items: ['Select a valid account and retry the save.'],
      message: 'The selected account is no longer available.',
      title: 'Account required',
    };
  }

  if (candidate.code === '42501') {
    return {
      items: detailItems,
      message: 'You do not have permission to save this trade right now.',
      title: 'Permission issue',
    };
  }

  if (candidate.code === '23502') {
    return {
      items: detailItems,
      message: 'One of the required trade fields is still missing.',
      title: 'Missing field',
    };
  }

  return {
    items: detailItems,
    message: rawMessage,
    title: 'Save failed',
  };
}

export default function NewTradeForm({
  mode = 'create',
  tradeId,
}: NewTradeFormProps) {
  const router = useRouter();
  const { loading, supabase, user } = useAuth();
  const {
    accounts,
    activeAccount,
    error: accountsError,
    loading: accountsLoading,
    refreshAccounts,
  } = useAccounts();
  const { preferences, ready } = useTradePreferences();
  const isEditMode = mode === 'edit' && Boolean(tradeId);
  const draftStorageKey = buildTradeDraftStorageKey(mode, tradeId);
  const [values, setValues] = useState<TradeFormInput>(() =>
    createInitialTradeFormValues(activeAccount?.id ?? ''),
  );
  const [initialValues, setInitialValues] = useState<TradeFormInput>(() =>
    createInitialTradeFormValues(activeAccount?.id ?? ''),
  );
  const [toast, setToast] = useState<ToastState>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTrade, setIsLoadingTrade] = useState(isEditMode);
  const [tradeLoadError, setTradeLoadError] = useState<string | null>(null);
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
    if (!isEditMode) {
      return;
    }

    if (!supabase || !user || !ready || !tradeId) {
      return;
    }

    const currentSupabase = supabase;
    const currentUser = user;
    const currentTradeId = tradeId;
    let ignore = false;

    async function loadTrade() {
      setIsLoadingTrade(true);
      setTradeLoadError(null);

      const { data, error } = await currentSupabase
        .from('Trades')
        .select(TRADE_SELECT)
        .eq('ID', currentTradeId)
        .eq('user_id', currentUser.id)
        .single()
        .overrideTypes<TradeRow, { merge: false }>();

      if (ignore) {
        return;
      }

      if (error || !data) {
        setTradeLoadError(error?.message ?? 'Trade not found.');
        setIsLoadingTrade(false);
        return;
      }

      const nextValues = mapTradeToFormValues(
        normalizeTrade(data, 0),
        activeAccount?.id ?? '',
      );
      const restoredDraft = readFormDraft(draftStorageKey, nextValues);
      const hydratedValues = restoredDraft ?? nextValues;

      setInitialValues(nextValues);
      setValues(hydratedValues);
      setFieldErrors({});
      setToast(null);
      setIsLoadingTrade(false);
      setShouldPersistDraft(Boolean(restoredDraft));
      setHasHydratedDraft(true);
    }

    void loadTrade();

    return () => {
      ignore = true;
    };
  }, [activeAccount?.id, draftStorageKey, isEditMode, ready, supabase, tradeId, user]);

  useEffect(() => {
    if (isEditMode || hasHydratedDraft || loading || !ready || accountsLoading) {
      return;
    }

    const baseValues = createInitialTradeFormValues(activeAccount?.id ?? '');
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
    isEditMode,
    loading,
    ready,
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

  function updateValue<Key extends keyof TradeFormInput>(
    key: Key,
    value: TradeFormInput[Key],
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
        message: 'Sign in to save a trade.',
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

    if (!values.account_id.trim()) {
      setFieldErrors((current) => ({
        ...current,
        account_id: 'Select an account before saving.',
      }));
      setToast({
        title: 'Select account',
        message: 'Every trade must belong to an account.',
        items: ['Account'],
        tone: 'error',
      });
      window.requestAnimationFrame(() => {
        document.getElementById('field-account_id')?.focus();
      });
      return;
    }

    const visibleFields = TRADE_FIELD_DEFINITIONS.filter(
      (field) => preferences[field.key],
    );
    const requiredFields = visibleFields.filter((field) => field.requiredWhenVisible);
    const missingFields = requiredFields.filter((field) =>
      !isFieldFilled(field, values[field.key]),
    );

    if (missingFields.length > 0) {
      const nextErrors = missingFields.reduce<FieldErrors>((accumulator, field) => {
        accumulator[field.key] = 'Required field.';
        return accumulator;
      }, {});

      setFieldErrors(nextErrors);
      setToast({
        title: 'Complete required fields',
        message: 'Fill every active required field before saving.',
        items: missingFields.map((field) => field.label),
        tone: 'error',
      });

      const firstField = missingFields[0];
      window.requestAnimationFrame(() => {
        document.getElementById(`field-${firstField.key}`)?.focus();
      });
      return;
    }

    const numericFields = visibleFields.filter((field) => field.type === 'number');
    const numericErrors = numericFields.reduce<FieldErrors>((accumulator, field) => {
      const errorMessage = validateNumericField(
        values[field.key] as string,
        field.label,
      );

      if (errorMessage) {
        accumulator[field.key] = errorMessage;
      }

      return accumulator;
    }, {});

    if (Object.keys(numericErrors).length > 0) {
      setFieldErrors(numericErrors);
      setToast({
        title: 'Check numeric fields',
        message: 'One or more numeric values are invalid.',
        items: Object.keys(numericErrors).map(
          (key) =>
            TRADE_FIELD_DEFINITIONS.find((field) => field.key === key)?.label ?? key,
        ),
        tone: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      const submissionValues = values;

      const payload = isEditMode
        ? mapTradeFormToUpdate(submissionValues, user.id)
        : mapTradeFormToInsert(submissionValues, user.id);
      const query = isEditMode
        ? supabase
            .from('Trades')
            .update(payload)
            .eq('ID', tradeId ?? '')
            .eq('user_id', user.id)
        : supabase.from('Trades').insert(payload);
      const { error } = await query;

      if (error) {
        throw error;
      }

      await refreshAccounts();

      clearDraft();
      setFieldErrors({});
      const resetValues = isEditMode
        ? submissionValues
        : createInitialTradeFormValues(submissionValues.account_id);
      setInitialValues(resetValues);
      setValues(resetValues);
      setToast({
        title: isEditMode ? 'Trade updated' : 'Trade saved',
        message: isEditMode
          ? 'The trade changes were saved successfully.'
          : 'The trade was saved successfully.',
        items: [],
        tone: 'success',
      });
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      router.replace('/dashboard');
    } catch (error) {
      console.error('Trade save failed', {
        error,
        isEditMode,
        payload: values,
        tradeId,
        userId: user.id,
      });

      const resolvedError = getTradeSaveError(error);

      if (resolvedError.field) {
        setFieldErrors((current) => ({
          ...current,
          [resolvedError.field]: resolvedError.message,
        }));
      }

      setToast({
        title: resolvedError.title,
        message: resolvedError.message,
        items: resolvedError.items,
        tone: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading || !supabase || !ready || accountsLoading || isLoadingTrade) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">
            {isEditMode ? 'Loading trade...' : 'Loading session...'}
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Trade capture locked"
          description="Sign in to write to Trades."
        />
      </PageShell>
    );
  }

  if (tradeLoadError) {
    return (
      <PageShell>
        <Panel className="overflow-hidden">
          <PanelHeader
            eyebrow="trade"
            title="Trade unavailable"
            description="The requested trade could not be loaded for editing."
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/dashboard" size="lg" variant="secondary">
                  Dashboard
                </ButtonLink>
                <ButtonLink href="/trades/new" size="lg" variant="primary">
                  New Trade
                </ButtonLink>
              </div>
            }
          />
          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <MessageBanner message={tradeLoadError} tone="error" />
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
              title="Create an account before saving trades"
              description="Every trade now belongs to an account. Create one account first, then trade capture becomes account-aware automatically."
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
                  No accounts available yet. Create a demo, propfirm, live or backtest account to start saving trades.
                </div>
              )}
            </div>
          </Panel>
        </Reveal>
      </PageShell>
    );
  }

  const visibleFieldCount = Object.values(preferences).filter(Boolean).length;

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
              eyebrow="one journal"
              title={isEditMode ? 'Edit Trade' : 'New Trade'}
              description={isEditMode ? 'Update the saved execution without breaking account awareness.' : 'Fast capture, account-aware.'}
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  {isEditMode ? (
                    <ButtonLink
                      href={`/trades/new`}
                      size="lg"
                      variant="secondary"
                    >
                      New Trade
                    </ButtonLink>
                  ) : null}
                  <ButtonLink href="/accounts" size="lg" variant="secondary">
                    Accounts
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
          id="trade-form"
          onSubmit={handleSubmit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <Reveal delay={0.02}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="context"
                  title="Trade context"
                  description="Choose the target account or keep the active one selected."
                />
                <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                  <SelectField
                    label="Account"
                    required
                    error={fieldErrors.account_id}
                    value={values.account_id}
                    onChange={(event) => updateValue('account_id', event.target.value)}
                    id="field-account_id"
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.type}
                      </option>
                    ))}
                  </SelectField>

                  <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-5 py-4 shadow-[0_18px_42px_-34px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Selected account</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {selectedAccount?.name ?? 'No account selected'}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
                      {selectedAccount?.type ?? 'Assign this trade before saving'}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            {TRADE_FIELD_SECTIONS.map((section, sectionIndex) => {
              const fields = TRADE_FIELD_DEFINITIONS.filter(
                (field) => field.section === section.key && preferences[field.key],
              );

              if (fields.length === 0) {
                return null;
              }

              return (
                <Reveal key={section.key} delay={(sectionIndex + 1) * 0.05}>
                  <Panel className="overflow-hidden">
                    <PanelHeader eyebrow={section.key} title={section.label} />
                    <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                      {fields.map((field) => {
                        const fieldValue = values[field.key];
                        const error = fieldErrors[field.key];

                        if (field.control === 'select') {
                          return (
                            <SelectField
                              key={field.key}
                              label={field.label}
                              required={field.requiredWhenVisible}
                              error={error}
                              value={String(fieldValue)}
                              onChange={(event) =>
                                updateValue(field.key, event.target.value)
                              }
                              id={`field-${field.key}`}
                            >
                              <option value="">Select</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </SelectField>
                          );
                        }

                        if (field.control === 'textarea') {
                          return (
                            <TextareaField
                              key={field.key}
                              label={field.label}
                              required={field.requiredWhenVisible}
                              error={error}
                              value={String(fieldValue)}
                              onChange={(event) =>
                                updateValue(field.key, event.target.value)
                              }
                              placeholder={field.placeholder}
                              wrapperClassName="md:col-span-2"
                              id={`field-${field.key}`}
                            />
                          );
                        }

                        return (
                          <InputField
                            key={field.key}
                            type={field.type}
                            step={field.step}
                            label={field.label}
                            required={field.requiredWhenVisible}
                            error={error}
                            value={String(fieldValue)}
                            onChange={(event) =>
                              updateValue(field.key, event.target.value)
                            }
                            placeholder={field.placeholder}
                            id={`field-${field.key}`}
                          />
                        );
                      })}
                    </div>
                  </Panel>
                </Reveal>
              );
            })}
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
                    <p className="text-sm text-[var(--muted)]">Symbol</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.symbol.trim() || 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Direction</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.direction || 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">RR / PnL</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.rr || '0'} /{' '}
                      {values.pnl.trim() && Number.isFinite(Number(values.pnl))
                        ? formatPnl(Number(values.pnl))
                        : '$0'}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.12}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                  Context
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Visible</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                      {visibleFieldCount}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Date / Time</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.trade_date || 'Pending'}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                      {getTradeTimeRangeLabel({
                        openTime: values.open_time || null,
                        closeTime: values.close_time || null,
                      }) ?? 'Timing pending'}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.16}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                  Actions
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    type="submit"
                    form="trade-form"
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
                        : 'Save Trade'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setValues(
                        isEditMode
                          ? initialValues
                          : createInitialTradeFormValues(activeAccount?.id ?? ''),
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
