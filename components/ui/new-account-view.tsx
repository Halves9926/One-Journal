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
  SwitchField,
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
import {
  ACCOUNT_TYPES,
  createInitialAccountFormValues,
  mapAccountToFormValues,
  type AccountFormInput,
} from '@/lib/accounts';
import { formatCurrency } from '@/lib/trades';

type FieldErrors = Partial<Record<keyof AccountFormInput, string>>;
type ToastState = {
  items: string[];
  message: string;
  tone: 'error' | 'success' | 'neutral';
  title: string;
} | null;

type NewAccountViewProps = {
  accountId?: string;
  mode?: 'create' | 'edit';
};

function formatPreviewCurrency(value: string) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? formatCurrency(parsedValue) : '$0';
}

export default function NewAccountView({
  accountId,
  mode = 'create',
}: NewAccountViewProps) {
  const router = useRouter();
  const { loading, supabase, user } = useAuth();
  const isClient = useClientReady();
  const {
    accounts,
    createAccount,
    error: accountsError,
    loading: accountsLoading,
    updateAccount,
  } = useAccounts();
  const isEditMode = mode === 'edit';
  const draftStorageKey =
    isEditMode && accountId
      ? `one-journal.account-form.edit.${accountId}.v1`
      : 'one-journal.account-form.create.v1';
  const accountToEdit = useMemo(
    () => (accountId ? accounts.find((account) => account.id === accountId) ?? null : null),
    [accountId, accounts],
  );
  const initialValues = useMemo(
    () =>
      isEditMode && accountToEdit
        ? mapAccountToFormValues(accountToEdit)
        : createInitialAccountFormValues(),
    [accountToEdit, isEditMode],
  );
  const [draftValues, setDraftValues] = useState<AccountFormInput | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSnapshotVersion, setDraftSnapshotVersion] = useState(0);
  const restoredDraftValues = useMemo(() => {
    void draftSnapshotVersion;

    if (!isClient || loading || !supabase || !user) {
      return null;
    }

    if (isEditMode && accountsLoading && !accountToEdit) {
      return null;
    }

    return readFormDraft(draftStorageKey, initialValues);
  }, [
    accountToEdit,
    accountsLoading,
    draftStorageKey,
    draftSnapshotVersion,
    initialValues,
    isClient,
    isEditMode,
    loading,
    supabase,
    user,
  ]);
  const values = draftValues ?? restoredDraftValues ?? initialValues;
  const isPropAccount = values.type === 'Propfirm Account';
  const showFundedLimits = isPropAccount && values.is_funded;
  const showPhaseToggle = isPropAccount && !values.is_funded;
  const showPhaseFields = showPhaseToggle && values.phases_enabled;

  function clearDraft() {
    clearFormDraft(draftStorageKey);
    setDraftSnapshotVersion((current) => current + 1);
  }

  useEffect(() => {
    if (!isClient || !draftValues) {
      return;
    }

    writeFormDraft(draftStorageKey, draftValues);
  }, [draftStorageKey, draftValues, isClient]);

  function updateValue<Key extends keyof AccountFormInput>(
    key: Key,
    value: AccountFormInput[Key],
  ) {
    setDraftValues((current) => ({
      ...(current ?? values),
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

    const nextErrors: FieldErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = 'Account name is required.';
    }

    if (!values.initial_equity.trim()) {
      nextErrors.initial_equity = 'Initial equity is required.';
    } else if (!Number.isFinite(Number(values.initial_equity))) {
      nextErrors.initial_equity = 'Initial equity must be a valid number.';
    }

    if (!values.current_equity.trim()) {
      nextErrors.current_equity = 'Current equity is required.';
    } else if (!Number.isFinite(Number(values.current_equity))) {
      nextErrors.current_equity = 'Current equity must be a valid number.';
    }

    if (isPropAccount && showPhaseFields) {
      if (values.phase_count.trim() && !Number.isFinite(Number(values.phase_count))) {
        nextErrors.phase_count = 'Phase count must be a valid number.';
      }

      if (values.current_phase.trim() && !Number.isFinite(Number(values.current_phase))) {
        nextErrors.current_phase = 'Current phase must be a valid number.';
      }

      if (values.prop_target.trim() && !Number.isFinite(Number(values.prop_target))) {
        nextErrors.prop_target = 'Prop target must be a valid number.';
      }
    }

    if (isPropAccount) {
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
      setToast({
        title: 'Check highlighted fields',
        message: isEditMode
          ? 'Check the highlighted fields before saving the account.'
          : 'Check the highlighted fields before creating the account.',
        items: Object.keys(nextErrors).map((key) =>
          key.replaceAll('_', ' '),
        ),
        tone: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    const result =
      isEditMode && accountId
        ? await updateAccount(accountId, values)
        : await createAccount(values);

    setIsSubmitting(false);

    if (result.error) {
      setToast({
        title: isEditMode ? 'Account save failed' : 'Account creation failed',
        message: result.error,
        items: [],
        tone: 'error',
      });
      return;
    }

    clearDraft();
    setDraftValues(null);
    setToast({
      title: isEditMode ? 'Account updated' : 'Account created',
      message: isEditMode
        ? 'Account updated successfully.'
        : 'Account created successfully.',
      items: [],
      tone: 'success',
    });
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    router.replace('/accounts');
  }

  if (loading || !supabase || (isEditMode && accountsLoading && !accountToEdit)) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">
            {isEditMode ? 'Loading account...' : 'Loading session...'}
          </p>
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

  if (isEditMode && !accountToEdit) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">
            Account not found or no longer available.
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (isEditMode && accountToEdit && !accountToEdit.canManageAccount) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">
            You can view this account, but only owners and admins can edit account settings.
          </p>
        </Panel>
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
              eyebrow="accounts"
              title={isEditMode ? 'Edit account' : 'New account'}
              description={
                isEditMode
                  ? 'Update the account setup, balances and prop rules without breaking the active workspace.'
                  : 'Create a separate workspace for demo, propfirm, live or backtest trading.'
              }
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
          id="account-form"
          onSubmit={handleSubmit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="space-y-6">
            <Reveal delay={0.03}>
              <Panel className="overflow-hidden">
                <PanelHeader
                  eyebrow="basics"
                  title={isEditMode ? 'Account details' : 'Account setup'}
                  description={
                    isEditMode
                      ? 'Refine the naming, type and balances for this account.'
                      : 'Name the account and define both the starting and current balance.'
                  }
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

                  <InputField
                    label="Current equity"
                    type="number"
                    step="0.01"
                    required
                    value={values.current_equity}
                    error={fieldErrors.current_equity}
                    onChange={(event) =>
                      updateValue('current_equity', event.target.value)
                    }
                    placeholder="10450"
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
                    description={
                      values.is_funded
                        ? 'Funded account selected: only the live risk limits stay visible.'
                        : 'Configure phases, targets and drawdown rules for the prop account.'
                    }
                  />
                  <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
                    <SwitchField
                      checked={values.is_funded}
                      onCheckedChange={(checked) => updateValue('is_funded', checked)}
                      label="Already funded"
                      description="Use this when the account has already passed evaluation and is funded."
                      wrapperClassName="md:col-span-2"
                    />

                    {showPhaseToggle ? (
                      <div className="animate-rise md:col-span-2">
                        <SwitchField
                          checked={values.phases_enabled}
                          onCheckedChange={(checked) =>
                            updateValue('phases_enabled', checked)
                          }
                          label="Active phases"
                          description="Enable phase-aware tracking and progression for this prop account."
                        />
                      </div>
                    ) : null}

                    {showPhaseFields ? (
                      <>
                        <InputField
                          label="Number of phases"
                          type="number"
                          step="1"
                          value={values.phase_count}
                          error={fieldErrors.phase_count}
                          onChange={(event) =>
                            updateValue('phase_count', event.target.value)
                          }
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
                          onChange={(event) =>
                            updateValue('prop_target', event.target.value)
                          }
                          placeholder="800"
                          wrapperClassName="md:col-span-2"
                        />
                      </>
                    ) : null}

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

                    {showFundedLimits ? (
                      <div className="animate-rise rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 md:col-span-2">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          Funded account mode
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          Phase count, current phase and target are hidden because this account starts directly as funded.
                        </p>
                      </div>
                    ) : null}
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
                      {formatPreviewCurrency(values.initial_equity.trim() || '0')}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Current equity</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {formatPreviewCurrency(
                        values.current_equity.trim() || values.initial_equity.trim() || '0',
                      )}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface-raised)] p-4 shadow-[0_14px_28px_-24px_var(--shadow-color)]">
                    <p className="text-sm text-[var(--muted)]">Phase state</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {isPropAccount
                        ? values.is_funded
                          ? 'Funded account'
                          : values.phases_enabled
                            ? `Phase ${values.current_phase || '1'} / ${values.phase_count || '2'}`
                            : 'Prop with limits only'
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
                    {isSubmitting
                      ? isEditMode
                        ? 'Saving...'
                        : 'Creating...'
                      : isEditMode
                        ? 'Save Account'
                        : 'Create Account'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setDraftValues(null);
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
