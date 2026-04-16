'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

type FieldErrors = Partial<Record<TradeFieldKey, string>>;

function getTodayValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function createInitialTradeFormValues(): TradeFormInput {
  return {
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
  const { preferences, ready } = useTradePreferences();
  const [values, setValues] = useState<TradeFormInput>(() =>
    createInitialTradeFormValues(),
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      setFeedback({
        type: 'success',
        text: 'Trade saved. Redirecting...',
      });
      setFieldErrors({});
      setValues(createInitialTradeFormValues());
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

  if (loading || !supabase || !ready) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-neutral-500">Loading session...</p>
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
              description="Fast capture."
              action={
                <div className="flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/settings" size="lg" variant="secondary">
                    Settings
                  </ButtonLink>
                  <ButtonLink href="/dashboard" size="lg" variant="ghost">
                    Dashboard
                  </ButtonLink>
                </div>
              }
            />
          </Panel>
        </Reveal>

        <form
          id="trade-form"
          onSubmit={handleSubmit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            {TRADE_FIELD_SECTIONS.map((section, sectionIndex) => {
              const fields = TRADE_FIELD_DEFINITIONS.filter(
                (field) => field.section === section.key && preferences[field.key],
              );

              if (fields.length === 0) {
                return null;
              }

              return (
                <Reveal key={section.key} delay={sectionIndex * 0.05}>
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
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                  Preview
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-500">Symbol</p>
                    <p className="mt-2 text-lg font-semibold text-neutral-950">
                      {values.symbol.trim() || 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-500">Direction</p>
                    <p className="mt-2 text-lg font-semibold text-neutral-950">
                      {values.direction || 'Pending'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-500">RR / PnL</p>
                    <p className="mt-2 text-lg font-semibold text-neutral-950">
                      {values.rr || '0'} / {values.pnl || '0'}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.12}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
                  Columns
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-500">Visible</p>
                    <p className="mt-2 text-2xl font-semibold text-neutral-950">
                      {visibleFieldCount}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-500">Date</p>
                    <p className="mt-2 text-lg font-semibold text-neutral-950">
                      {values.trade_date || 'Pending'}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.16}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
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
                      setValues(createInitialTradeFormValues());
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
