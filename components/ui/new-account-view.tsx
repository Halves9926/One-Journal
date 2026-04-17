'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAccounts } from '@/components/ui/accounts-provider';
import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import {
  CheckboxField,
  InputField,
  MessageBanner,
  SelectField,
} from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import {
  ACCOUNT_TYPES,
  createInitialAccountFormValues,
  type AccountFormInput,
} from '@/lib/accounts';

type FieldErrors = Partial<Record<keyof AccountFormInput, string>>;

export default function NewAccountView() {
  const router = useRouter();
  const { loading, supabase, user } = useAuth();
  const { accounts, createAccount, error: accountsError } = useAccounts();
  const [values, setValues] = useState<AccountFormInput>(() =>
    createInitialAccountFormValues(),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'error' | 'success';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPropAccount = values.type === 'Propfirm Account';

  function updateValue<Key extends keyof AccountFormInput>(
    key: Key,
    value: AccountFormInput[Key],
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

    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = 'Account name is required.';
    }

    if (!values.initial_equity.trim()) {
      nextErrors.initial_equity = 'Initial equity is required.';
    } else if (!Number.isFinite(Number(values.initial_equity))) {
      nextErrors.initial_equity = 'Initial equity must be a valid number.';
    }

    if (isPropAccount) {
      if (values.phase_count.trim() && !Number.isFinite(Number(values.phase_count))) {
        nextErrors.phase_count = 'Phase count must be a valid number.';
      }

      if (values.current_phase.trim() && !Number.isFinite(Number(values.current_phase))) {
        nextErrors.current_phase = 'Current phase must be a valid number.';
      }

      if (values.prop_target.trim() && !Number.isFinite(Number(values.prop_target))) {
        nextErrors.prop_target = 'Prop target must be a valid number.';
      }

      if (
        values.max_drawdown.trim() &&
        !Number.isFinite(Number(values.max_drawdown))
      ) {
        nextErrors.max_drawdown = 'Max drawdown must be a valid number.';
      }

      if (
        values.daily_drawdown_max.trim() &&
        !Number.isFinite(Number(values.daily_drawdown_max))
      ) {
        nextErrors.daily_drawdown_max =
          'Daily drawdown max must be a valid number.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFeedback({
        message: 'Check the highlighted fields before creating the account.',
        tone: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const result = await createAccount(values);

    setIsSubmitting(false);

    if (result.error) {
      setFeedback({
        message: result.error,
        tone: 'error',
      });
      return;
    }

    setFeedback({
      message: 'Account created successfully.',
      tone: 'success',
    });
    router.replace('/accounts');
  }

  if (loading || !supabase) {
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
          title="Create account locked"
          description="Sign in to create trading accounts."
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
              title="New account"
              description="Create a separate workspace for demo, propfirm, live or backtest trading."
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
        {feedback ? <MessageBanner message={feedback.message} tone={feedback.tone} /> : null}

        <form
          id="account-form"
          onSubmit={handleSubmit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <Reveal delay={0.03}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="basics"
                  title="Account setup"
                  description="Name the account and define its starting balance."
                />
                <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                  <InputField
                    label="Account name"
                    required
                    value={values.name}
                    error={fieldErrors.name}
                    onChange={(event) => updateValue('name', event.target.value)}
                    placeholder="FTMO Swing / Nasdaq Demo / Main Live"
                  />

                  <SelectField
                    label="Account type"
                    required
                    value={values.type}
                    onChange={(event) =>
                      updateValue('type', event.target.value as AccountFormInput['type'])
                    }
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </SelectField>

                  <InputField
                    label="Initial equity"
                    type="number"
                    step="0.01"
                    required
                    value={values.initial_equity}
                    error={fieldErrors.initial_equity}
                    onChange={(event) =>
                      updateValue('initial_equity', event.target.value)
                    }
                    placeholder="10000"
                  />

                  <div className="rounded-[26px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] px-5 py-4 shadow-[0_18px_42px_-34px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Activation rule</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {accounts.length === 0
                        ? 'First account becomes active'
                        : 'Switch from header or accounts page'}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            {isPropAccount ? (
              <Reveal delay={0.08}>
                <Panel className="overflow-hidden">
                  <PanelHeader
                    eyebrow="prop rules"
                    title="Propfirm logic"
                    description="Configure phases, targets and drawdown rules for the prop account."
                  />
                  <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                    <CheckboxField
                      checked={values.phases_enabled}
                      onChange={(event) =>
                        updateValue('phases_enabled', event.target.checked)
                      }
                      label="Active phases"
                      description="Enable phase-aware tracking and progression for this prop account."
                      wrapperClassName="md:col-span-2"
                    />

                    <CheckboxField
                      checked={values.is_funded}
                      onChange={(event) =>
                        updateValue('is_funded', event.target.checked)
                      }
                      label="Already funded"
                      description="Use this when the account has already passed evaluation and is funded."
                      wrapperClassName="md:col-span-2"
                    />

                    <InputField
                      label="Number of phases"
                      type="number"
                      step="1"
                      value={values.phase_count}
                      error={fieldErrors.phase_count}
                      onChange={(event) => updateValue('phase_count', event.target.value)}
                      placeholder="2"
                    />

                    <InputField
                      label="Current phase"
                      type="number"
                      step="1"
                      value={values.current_phase}
                      error={fieldErrors.current_phase}
                      onChange={(event) =>
                        updateValue('current_phase', event.target.value)
                      }
                      placeholder="1"
                    />

                    <InputField
                      label="Prop target"
                      type="number"
                      step="0.01"
                      value={values.prop_target}
                      error={fieldErrors.prop_target}
                      onChange={(event) => updateValue('prop_target', event.target.value)}
                      placeholder="800"
                    />

                    <InputField
                      label="Max drawdown"
                      type="number"
                      step="0.01"
                      value={values.max_drawdown}
                      error={fieldErrors.max_drawdown}
                      onChange={(event) =>
                        updateValue('max_drawdown', event.target.value)
                      }
                      placeholder="1000"
                    />

                    <InputField
                      label="Daily drawdown max"
                      type="number"
                      step="0.01"
                      value={values.daily_drawdown_max}
                      error={fieldErrors.daily_drawdown_max}
                      onChange={(event) =>
                        updateValue('daily_drawdown_max', event.target.value)
                      }
                      placeholder="500"
                    />
                  </div>
                </Panel>
              </Reveal>
            ) : null}
          </div>

          <div className="space-y-6 xl:sticky xl:top-32 xl:self-start">
            <Reveal delay={0.1}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                  Preview
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Account name</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.name.trim() || 'Untitled Account'}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                      {values.type}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Initial equity</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {values.initial_equity.trim() || '0'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Phase state</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {isPropAccount
                        ? values.is_funded
                          ? 'Funded'
                          : values.phases_enabled
                            ? `Phase ${values.current_phase || '1'} / ${values.phase_count || '2'}`
                            : 'Prop without phases'
                        : 'Standard account'}
                    </p>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.14}>
              <Panel className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                  Actions
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    type="submit"
                    form="account-form"
                    disabled={isSubmitting}
                    size="lg"
                    variant="primary"
                    className="w-full"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setValues(createInitialAccountFormValues());
                      setFieldErrors({});
                      setFeedback(null);
                    }}
                    className="w-full"
                  >
                    Reset
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
