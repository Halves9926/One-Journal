'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  mapAccountFormToUpdate,
  normalizeAccount,
  type AccountFormInput,
  type AccountView,
  mapAccountFormToInsert,
} from '@/lib/accounts';
import type { AccountRow, AccountUpdate } from '@/lib/supabase';
import type { TradeFieldPreferences } from '@/lib/trade-form-preferences';

type AccountsContextValue = {
  accounts: AccountView[];
  activeAccount: AccountView | null;
  createAccount: (input: AccountFormInput) => Promise<{ error: string | null }>;
  deleteAccount: (accountId: string) => Promise<{ error: string | null }>;
  error: string | null;
  loading: boolean;
  markAccountFunded: (accountId: string) => Promise<{ error: string | null }>;
  markPhasePassed: (accountId: string) => Promise<{ error: string | null }>;
  refreshAccounts: () => Promise<void>;
  setActiveAccount: (accountId: string) => Promise<{ error: string | null }>;
  startNextPhase: (accountId: string) => Promise<{ error: string | null }>;
  updateAccountFieldSettings: (
    accountId: string,
    settings: {
      analysisFieldSettings?: Record<string, boolean>;
      tradeFieldSettings?: TradeFieldPreferences;
    },
  ) => Promise<{ error: string | null }>;
  updateAccount: (
    accountId: string,
    input: AccountFormInput,
  ) => Promise<{ error: string | null }>;
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

function getActiveAccountStorageKey(userId: string) {
  return `one-journal.active-account-id.${userId}`;
}

export function AccountsProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, supabase, user } = useAuth();
  const [state, setState] = useState<AccountsState>(initialState);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);

  function persistActiveAccountId(accountId: string | null) {
    setActiveAccountIdState(accountId);

    if (!user || typeof window === 'undefined') {
      return;
    }

    const storageKey = getActiveAccountStorageKey(user.id);

    if (accountId) {
      window.localStorage.setItem(storageKey, accountId);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }

  const loadAccessibleAccounts = useCallback(async function loadAccessibleAccounts(
    client = supabase,
    currentUser = user,
  ): Promise<{ accounts: AccountView[]; error: string | null }> {
    if (!client || !currentUser) {
      return { accounts: [], error: null };
    }

    const rpcResult = await client
      .rpc('get_accessible_accounts')
      .overrideTypes<AccountRow[], { merge: false }>();

    if (!rpcResult.error) {
      const rpcRows = Array.isArray(rpcResult.data)
        ? (rpcResult.data as AccountRow[])
        : [];

      return {
        accounts: rpcRows.map((account, index) =>
          normalizeAccount(account, index, currentUser.id),
        ),
        error: null,
      };
    }

    const fallbackResult = await client
      .from(ACCOUNTS_TABLE)
      .select(ACCOUNT_SELECT)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })
      .overrideTypes<AccountRow[], { merge: false }>();

    if (fallbackResult.error) {
      return {
        accounts: [],
        error: fallbackResult.error.message || rpcResult.error.message,
      };
    }

    return {
      accounts: (fallbackResult.data ?? []).map((account, index) =>
        normalizeAccount(account, index, currentUser.id),
      ),
      error: null,
    };
  }, [supabase, user]);

  async function refreshAccounts() {
    if (!supabase || !user) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      loading: true,
    }));

    const { accounts, error } = await loadAccessibleAccounts();

    if (error) {
      setState({
        accounts: [],
        error,
        loading: false,
      });
      return;
    }

    setState({
      accounts,
      error: null,
      loading: false,
    });
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let animationFrame = 0;

    if (!user) {
      animationFrame = window.requestAnimationFrame(() => {
        setActiveAccountIdState(null);
      });
      return () => {
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
        }
      };
    }

    animationFrame = window.requestAnimationFrame(() => {
      setActiveAccountIdState(
        window.localStorage.getItem(getActiveAccountStorageKey(user.id)),
      );
    });

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [user]);

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
      const { accounts, error } = await loadAccessibleAccounts(
        currentSupabase,
        currentUser,
      );

      if (ignore) {
        return;
      }

      if (error) {
        setState({
          accounts: [],
          error,
          loading: false,
        });
        return;
      }

      setState({
        accounts,
        error: null,
        loading: false,
      });
    }

    void loadInitialAccounts();

    return () => {
      ignore = true;
    };
  }, [authLoading, loadAccessibleAccounts, supabase, user]);

  async function applyAccountUpdate(accountId: string, payload: AccountUpdate) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const { error } = await supabase
      .from(ACCOUNTS_TABLE)
      .update(payload)
      .eq('id', accountId);

    if (error) {
      return { error: error.message };
    }

    await refreshAccounts();
    return { error: null };
  }

  async function updateAccount(accountId: string, input: AccountFormInput) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    if (!account.canManageAccount) {
      return { error: 'You do not have permission to edit this account.' };
    }

    return applyAccountUpdate(accountId, mapAccountFormToUpdate(input, account));
  }

  async function createAccount(input: AccountFormInput) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const payload = mapAccountFormToInsert(input, user.id);
    const shouldActivate = state.accounts.length === 0;
    const accountPayload = {
      ...payload,
      is_active: shouldActivate,
    };
    const rpcResult = await supabase
      .rpc('create_account', { account_payload: accountPayload })
      .overrideTypes<string, { merge: false }>();

    if (!rpcResult.error) {
      await refreshAccounts();

      if (shouldActivate && rpcResult.data) {
        persistActiveAccountId(String(rpcResult.data));
      }

      return { error: null };
    }

    const isMissingCreateAccountRpc =
      rpcResult.error.code === 'PGRST202' ||
      rpcResult.error.message.toLowerCase().includes('create_account');

    if (!isMissingCreateAccountRpc) {
      return { error: rpcResult.error.message };
    }

    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .insert(accountPayload)
      .select('id')
      .single();

    if (error) {
      return { error: error.message };
    }

    await refreshAccounts();

    if (shouldActivate && data?.id) {
      persistActiveAccountId(String(data.id));
      return { error: null };
    }

    return { error: null };
  }

  async function deleteAccount(accountId: string) {
    if (!supabase || !user) {
      return { error: 'Supabase client unavailable.' };
    }

    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    if (!account.canDeleteAccount) {
      return { error: 'Only the owner can delete this account.' };
    }

    const { count, error: tradeCountError } = await supabase
      .from('Trades')
      .select('ID', { count: 'exact', head: true })
      .eq('account_id', accountId);

    if (tradeCountError) {
      return { error: tradeCountError.message };
    }

    if ((count ?? 0) > 0) {
      const { error: deleteTradesError } = await supabase
        .from('Trades')
        .delete()
        .eq('account_id', accountId);

      if (deleteTradesError) {
        return { error: deleteTradesError.message };
      }
    }

    const fallbackAccountId =
      account.isActive
        ? state.accounts.find((item) => item.id !== accountId)?.id ?? null
        : null;
    const { error } = await supabase
      .from(ACCOUNTS_TABLE)
      .delete()
      .eq('id', accountId);

    if (error) {
      return { error: error.message };
    }

    if (fallbackAccountId) {
      return setActiveAccount(fallbackAccountId);
    }

    await refreshAccounts();
    return { error: null };
  }

  async function setActiveAccount(accountId: string) {
    if (!user) {
      return { error: 'Sign in to switch accounts.' };
    }

    if (!state.accounts.some((account) => account.id === accountId)) {
      return { error: 'Account not found or no longer available.' };
    }

    persistActiveAccountId(accountId);
    return { error: null };
  }

  async function updateAccountFieldSettings(
    accountId: string,
    settings: {
      analysisFieldSettings?: Record<string, boolean>;
      tradeFieldSettings?: TradeFieldPreferences;
    },
  ) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    if (!account.canManageAccount) {
      return { error: 'You do not have permission to edit this account.' };
    }

    const payload: AccountUpdate = {};

    if (settings.tradeFieldSettings) {
      payload.trade_field_settings = settings.tradeFieldSettings;
    }

    if (settings.analysisFieldSettings) {
      payload.analysis_field_settings = settings.analysisFieldSettings;
    }

    return applyAccountUpdate(accountId, payload);
  }

  async function markPhasePassed(accountId: string) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    return applyAccountUpdate(accountId, buildPropPhasePassUpdate(account));
  }

  async function startNextPhase(accountId: string) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    return applyAccountUpdate(accountId, buildPropAdvancePhaseUpdate(account));
  }

  async function markAccountFunded(accountId: string) {
    const account = state.accounts.find((item) => item.id === accountId);

    if (!account) {
      return { error: 'Account not found.' };
    }

    return applyAccountUpdate(accountId, buildPropFundedUpdate(account));
  }

  const resolvedAccounts = useMemo(() => {
    if (!supabase || !user) {
      return initialState.accounts;
    }

    if (state.accounts.length === 0) {
      return state.accounts;
    }

    const selectedActiveId =
      activeAccountId && state.accounts.some((account) => account.id === activeAccountId)
        ? activeAccountId
        : state.accounts.find((account) => account.isActive)?.id ?? state.accounts[0]?.id ?? null;

    return state.accounts.map((account) => ({
      ...account,
      isActive: selectedActiveId === account.id,
    }));
  }, [activeAccountId, state.accounts, supabase, user]);
  const activeAccount =
    resolvedAccounts.find((account) => account.isActive) ?? resolvedAccounts[0] ?? null;
  const value: AccountsContextValue = {
    accounts: resolvedAccounts,
    activeAccount,
    createAccount,
    deleteAccount,
    error: !supabase || !user ? null : state.error,
    loading: authLoading || (Boolean(supabase && user) ? state.loading : false),
    markAccountFunded,
    markPhasePassed,
    refreshAccounts,
    setActiveAccount,
    startNextPhase,
    updateAccountFieldSettings,
    updateAccount,
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
