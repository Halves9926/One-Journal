'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/components/ui/auth-provider';
import {
  ACCOUNT_SELECT,
  ACCOUNTS_TABLE,
  buildPropAdvancePhaseUpdate,
  buildPropFundedUpdate,
  buildPropPhasePassUpdate,
  normalizeAccount,
  type AccountFormInput,
  type AccountView,
  mapAccountFormToInsert,
} from '@/lib/accounts';
import type { AccountRow, AccountUpdate } from '@/lib/supabase';

type AccountsContextValue = {
  accounts: AccountView[];
  activeAccount: AccountView | null;
  createAccount: (input: AccountFormInput) => Promise<{ error: string | null }>;
  error: string | null;
  loading: boolean;
  markAccountFunded: (accountId: string) => Promise<{ error: string | null }>;
  markPhasePassed: (accountId: string) => Promise<{ error: string | null }>;
  refreshAccounts: () => Promise<void>;
  setActiveAccount: (accountId: string) => Promise<{ error: string | null }>;
  startNextPhase: (accountId: string) => Promise<{ error: string | null }>;
};

const AccountsContext = createContext<AccountsContextValue | undefined>(undefined);

type AccountsState = {
  accounts: AccountView[];
  error: string | null;
  loading: boolean;
};

const initialState: AccountsState = {
  accounts: [],
  error: null,
  loading: true,
};

export function AccountsProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, supabase, user } = useAuth();
  const [state, setState] = useState<AccountsState>(initialState);

  async function refreshAccounts() {
    if (!supabase || !user) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      loading: true,
    }));

    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .select(ACCOUNT_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .overrideTypes<AccountRow[], { merge: false }>();

    if (error) {
      setState({
        accounts: [],
        error: error.message,
        loading: false,
      });
      return;
    }

    setState({
      accounts: (data ?? []).map((account, index) => normalizeAccount(account, index)),
      error: null,
      loading: false,
    });
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!supabase || !user) {
      return;
    }

    const currentSupabase = supabase;
    const currentUser = user;
    let ignore = false;

    async function loadInitialAccounts() {
      const { data, error } = await currentSupabase
        .from(ACCOUNTS_TABLE)
        .select(ACCOUNT_SELECT)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true })
        .overrideTypes<AccountRow[], { merge: false }>();

      if (ignore) {
        return;
      }

      if (error) {
        setState({
          accounts: [],
          error: error.message,
          loading: false,
        });
        return;
      }

      setState({
        accounts: (data ?? []).map((account, index) => normalizeAccount(account, index)),
        error: null,
        loading: false,
      });
    }

    void loadInitialAccounts();

    return () => {
      ignore = true;
    };
  }, [authLoading, supabase, user]);

  async function updateAccount(accountId: string, payload: AccountUpdate) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const { error } = await supabase
      .from(ACCOUNTS_TABLE)
      .update(payload)
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) {
      return { error: error.message };
    }

    await refreshAccounts();
    return { error: null };
  }

  async function createAccount(input: AccountFormInput) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const payload = mapAccountFormToInsert(input, user.id);
    const shouldActivate = state.accounts.length === 0;

    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .insert({
        ...payload,
        is_active: shouldActivate,
      })
      .select('id')
      .single();

    if (error) {
      return { error: error.message };
    }

    await refreshAccounts();

    if (shouldActivate && data?.id) {
      return { error: null };
    }

    return { error: null };
  }

  async function setActiveAccount(accountId: string) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const deactivateResult = await supabase
      .from(ACCOUNTS_TABLE)
      .update({ is_active: false })
      .eq('user_id', user.id);

    if (deactivateResult.error) {
      return { error: deactivateResult.error.message };
    }

    const activateResult = await supabase
      .from(ACCOUNTS_TABLE)
      .update({ is_active: true })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (activateResult.error) {
      return { error: activateResult.error.message };
    }

    await refreshAccounts();
    return { error: null };
  }

  async function markPhasePassed(accountId: string) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    return updateAccount(accountId, buildPropPhasePassUpdate(account));
  }

  async function startNextPhase(accountId: string) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    return updateAccount(accountId, buildPropAdvancePhaseUpdate(account));
  }

  async function markAccountFunded(accountId: string) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    return updateAccount(accountId, buildPropFundedUpdate(account));
  }

  const resolvedAccounts = !supabase || !user ? initialState.accounts : state.accounts;
  const activeAccount =
    resolvedAccounts.find((account) => account.isActive) ?? resolvedAccounts[0] ?? null;
  const value: AccountsContextValue = {
    accounts: resolvedAccounts,
    activeAccount,
    createAccount,
    error: !supabase || !user ? null : state.error,
    loading: authLoading || (Boolean(supabase && user) ? state.loading : false),
    markAccountFunded,
    markPhasePassed,
    refreshAccounts,
    setActiveAccount,
    startNextPhase,
  };

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);

  if (!context) {
    throw new Error('useAccounts must be used within AccountsProvider.');
  }

  return context;
}
