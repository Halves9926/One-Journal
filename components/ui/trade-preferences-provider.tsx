'use client';

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { useAccounts } from '@/components/ui/accounts-provider';
import {
  DEFAULT_TRADE_FIELD_PREFERENCES,
  TRADE_PREFERENCES_STORAGE_KEY,
  mergeTradeFieldPreferences,
  type TradeFieldKey,
  type TradeFieldPreferences,
} from '@/lib/trade-form-preferences';

type TradePreferencesContextValue = {
  getTradePreferencesForAccount: (
    accountId: string | null | undefined,
  ) => TradeFieldPreferences;
  preferences: TradeFieldPreferences;
  ready: boolean;
  resetPreferences: () => void;
  setFieldPreference: (field: TradeFieldKey, value: boolean) => void;
  toggleFieldPreference: (field: TradeFieldKey) => void;
};

const TradePreferencesContext = createContext<
  TradePreferencesContextValue | undefined
>(undefined);
const TRADE_PREFERENCES_CHANGE_EVENT = 'one-journal:trade-preferences-change';

function subscribeToHydration() {
  return () => {};
}

function parseStoredPreferences(storedValue: string | null) {
  if (!storedValue) {
    return DEFAULT_TRADE_FIELD_PREFERENCES;
  }

  try {
    return mergeTradeFieldPreferences(JSON.parse(storedValue));
  } catch {
    return DEFAULT_TRADE_FIELD_PREFERENCES;
  }
}

function getTradePreferencesSnapshot() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TRADE_PREFERENCES_STORAGE_KEY);
}

function getServerTradePreferencesSnapshot() {
  return null;
}

function subscribeToTradePreferences(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === TRADE_PREFERENCES_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener(TRADE_PREFERENCES_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(TRADE_PREFERENCES_CHANGE_EVENT, onStoreChange);
  };
}

function writeTradePreferences(preferences: TradeFieldPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    TRADE_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event(TRADE_PREFERENCES_CHANGE_EVENT));
}

export function TradePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { activeAccount, accounts, updateAccountFieldSettings } = useAccounts();
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToTradePreferences,
    getTradePreferencesSnapshot,
    getServerTradePreferencesSnapshot,
  );
  const preferences = useMemo(
    () => parseStoredPreferences(preferencesSnapshot),
    [preferencesSnapshot],
  );
  const accountPreferenceMap = useMemo(
    () =>
      new Map(
        accounts.map((account) => [
          account.id,
          account.tradeFieldSettings ?? preferences,
        ]),
      ),
    [accounts, preferences],
  );
  const activePreferences =
    activeAccount?.tradeFieldSettings ??
    (activeAccount ? preferences : DEFAULT_TRADE_FIELD_PREFERENCES);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const value = useMemo<TradePreferencesContextValue>(
    () => ({
      preferences: activePreferences,
      getTradePreferencesForAccount(accountId) {
        if (!accountId) {
          return activePreferences;
        }

        return accountPreferenceMap.get(accountId) ?? preferences;
      },
      ready,
      resetPreferences() {
        if (activeAccount?.id && activeAccount.canManageAccount) {
          void updateAccountFieldSettings(activeAccount.id, {
            tradeFieldSettings: DEFAULT_TRADE_FIELD_PREFERENCES,
          });
          return;
        }

        writeTradePreferences(DEFAULT_TRADE_FIELD_PREFERENCES);
      },
      setFieldPreference(field, value) {
        if (activeAccount?.id && activeAccount.canManageAccount) {
          void updateAccountFieldSettings(activeAccount.id, {
            tradeFieldSettings: {
              ...activePreferences,
              [field]: value,
            },
          });
          return;
        }

        writeTradePreferences({
          ...preferences,
          [field]: value,
        });
      },
      toggleFieldPreference(field) {
        if (activeAccount?.id && activeAccount.canManageAccount) {
          void updateAccountFieldSettings(activeAccount.id, {
            tradeFieldSettings: {
              ...activePreferences,
              [field]: !activePreferences[field],
            },
          });
          return;
        }

        writeTradePreferences({
          ...preferences,
          [field]: !preferences[field],
        });
      },
    }),
    [
      accountPreferenceMap,
      activeAccount,
      activePreferences,
      preferences,
      ready,
      updateAccountFieldSettings,
    ],
  );

  return (
    <TradePreferencesContext.Provider value={value}>
      {children}
    </TradePreferencesContext.Provider>
  );
}

export function useTradePreferences() {
  const context = useContext(TradePreferencesContext);

  if (!context) {
    throw new Error(
      'useTradePreferences must be used within TradePreferencesProvider.',
    );
  }

  return context;
}
