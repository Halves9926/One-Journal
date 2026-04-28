'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  DEFAULT_LIST_VIEW_PREFERENCES,
  LIST_VIEW_MODES,
  type ListViewMode,
} from '@/components/ui/list-view-preferences';

const WIDGET_TRADE_VIEW_PREFIX = 'one-journal:widget-trade-view:v1';
const WIDGET_TRADE_VIEW_CHANGE_EVENT = 'one-journal:widget-trade-view-change';

function isListViewMode(value: unknown): value is ListViewMode {
  return (
    typeof value === 'string' &&
    (LIST_VIEW_MODES as readonly string[]).includes(value)
  );
}

function getStorageKey(widgetKey: string) {
  return `${WIDGET_TRADE_VIEW_PREFIX}:${widgetKey}`;
}

function subscribeToWidgetTradeView(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key?.startsWith(WIDGET_TRADE_VIEW_PREFIX)) {
      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(WIDGET_TRADE_VIEW_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(WIDGET_TRADE_VIEW_CHANGE_EVENT, onStoreChange);
  };
}

function getServerSnapshot() {
  return null;
}

export function useWidgetTradeViewMode(
  widgetKey: string,
  defaultMode: ListViewMode = DEFAULT_LIST_VIEW_PREFERENCES.trades,
) {
  const storageKey = useMemo(() => getStorageKey(widgetKey), [widgetKey]);
  const snapshot = useSyncExternalStore(
    subscribeToWidgetTradeView,
    () =>
      typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey),
    getServerSnapshot,
  );
  const mode = isListViewMode(snapshot) ? snapshot : defaultMode;
  const setMode = useCallback(
    (nextMode: ListViewMode) => {
      if (typeof window === 'undefined') {
        return;
      }

      window.localStorage.setItem(storageKey, nextMode);
      window.dispatchEvent(new Event(WIDGET_TRADE_VIEW_CHANGE_EVENT));
    },
    [storageKey],
  );

  return [mode, setMode] as const;
}

