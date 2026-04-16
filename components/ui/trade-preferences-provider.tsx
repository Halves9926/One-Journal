'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  DEFAULT_TRADE_FIELD_PREFERENCES,
  TRADE_PREFERENCES_STORAGE_KEY,
  mergeTradeFieldPreferences,
  type TradeFieldKey,
  type TradeFieldPreferences,
} from '@/lib/trade-form-preferences';

type TradePreferencesContextValue = {
  preferences: TradeFieldPreferences;
  ready: boolean;
  resetPreferences: () => void;
  setFieldPreference: (field: TradeFieldKey, value: boolean) => void;
  toggleFieldPreference: (field: TradeFieldKey) => void;
};

const TradePreferencesContext = createContext<
  TradePreferencesContextValue | undefined
>(undefined);

function subscribeToHydration() {
  return () => {};
}

function readStoredPreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_TRADE_FIELD_PREFERENCES;
  }

  const storedValue = window.localStorage.getItem(TRADE_PREFERENCES_STORAGE_KEY);

  if (!storedValue) {
    return DEFAULT_TRADE_FIELD_PREFERENCES;
  }

  try {
    return mergeTradeFieldPreferences(JSON.parse(storedValue));
  } catch {
    return DEFAULT_TRADE_FIELD_PREFERENCES;
  }
}

export function TradePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preferences, setPreferences] =
    useState<TradeFieldPreferences>(readStoredPreferences);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== TRADE_PREFERENCES_STORAGE_KEY) {
        return;
      }

      if (!event.newValue) {
        setPreferences(DEFAULT_TRADE_FIELD_PREFERENCES);
        return;
      }

      try {
        setPreferences(mergeTradeFieldPreferences(JSON.parse(event.newValue)));
      } catch {
        setPreferences(DEFAULT_TRADE_FIELD_PREFERENCES);
      }
    }

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(
      TRADE_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  }, [preferences, ready]);

  const value = useMemo<TradePreferencesContextValue>(
    () => ({
      preferences,
      ready,
      resetPreferences() {
        setPreferences(DEFAULT_TRADE_FIELD_PREFERENCES);
      },
      setFieldPreference(field, value) {
        setPreferences((current) => ({
          ...current,
          [field]: value,
        }));
      },
      toggleFieldPreference(field) {
        setPreferences((current) => ({
          ...current,
          [field]: !current[field],
        }));
      },
    }),
    [preferences, ready],
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
