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
  TRADE_FIELD_DEFINITIONS,
  TRADE_FIELD_SECTIONS,
  type TradeFieldDefinition,
  type TradeFieldKey,
} from '@/lib/trade-form-preferences';
import { mapTradeFormToInsert, type TradeFormInput } from '@/lib/trades';

type Feedback = {
  type: 'error' | 'success';
  text: string;
} | null;

type ToastState = {
  items: string[];
  message: string;
  tone: 'error' | 'success' | 'neutral';
  title: string;
} | null;

type FieldErrors = Partial<Record<TradeFieldKey | 'account_id', string>>;

function getTodayValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function createInitialTradeFormValues(accountId = ''): TradeFormInput {
  return {
    account_id: accountId,
    direction: '',
    entry_price: '',
    mistake: '',
    notes: '',
    pnl: '',
    position_size: '',
    risk_amount: '',
    rr: '',
    screenshot_url: '',
    session: '',
    stop_loss: '',
    strategy: '',
    symbol: '',
    take_profit: '',
    trade_date: getTodayValue(),
  };
}

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

export default function NewTradeForm() {
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
  const [values, setValues] = useState<TradeFormInput>(() =>
    createInitialTradeFormValues(activeAccount?.id ?? ''),
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedAccount =
    accounts.find((account) => account.id === values.account_id) ?? activeAccount ?? null;

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
      setFeedback({
        type: 'error',
        text: 'Sign in to save a trade.',
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
      setFeedback({
        type: 'error',
        text: 'Supabase client unavailable. Reload and retry.',
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
      setFeedback(null);
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
      setFeedback(null);

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
      setFeedback(null);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setToast(null);

    try {
      const sanitizedValues = TRADE_FIELD_DEFINITIONS.reduce<TradeFormInput>(
        (accumulator, field) => {
          accumulator[field.key] = preferences[field.key] ? values[field.key] : '';
          return accumulator;
        },
        { ...values },
      );

      const payload = mapTradeFormToInsert(sanitizedValues, user.id);
      const { error } = await supabase.from('Trades').insert(payload);

      if (error) {
        throw error;
      }

      await refreshAccounts();

      setFeedback({
        type: 'success',
        text: 'Trade saved. Redirecting...',
      });
      setFieldErrors({});
      setValues(createInitialTradeFormValues(sanitizedValues.account_id));
      router.replace('/dashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Trade save failed.';

      setFeedback({
        type: 'error',
        text: message,
      });
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

  if (loading || !supabase || !ready || accountsLoading) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading session...</p>
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
              title="New Trade"
              description="Fast capture, account-aware."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
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
                      {values.rr || '0'} / {values.pnl || '0'}
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
                    <p className="text-sm text-[var(--muted)]">Date</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.trade_date || 'Pending'}
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
                    {isSubmitting ? 'Saving...' : 'Save Trade'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setValues(createInitialTradeFormValues(activeAccount?.id ?? ''));
                      setFeedback(null);
                      setFieldErrors({});
                      setToast(null);
                    }}
                    className="w-full"
                  >
                    Reset
                  </Button>
                </div>

                {feedback ? (
                  <div className="mt-4">
                    <MessageBanner message={feedback.text} tone={feedback.type} />
                  </div>
                ) : null}
              </Panel>
            </Reveal>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
