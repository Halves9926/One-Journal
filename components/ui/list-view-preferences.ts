'use client';

import { useSyncExternalStore } from 'react';

export const LIST_VIEW_MODES = ['compact', 'cards', 'stacked'] as const;

export type ListViewMode = (typeof LIST_VIEW_MODES)[number];
export type ListViewTarget = 'accounts' | 'analyses' | 'trades';

export type ListViewPreferences = Record<ListViewTarget, ListViewMode>;

const LIST_VIEW_STORAGE_KEY = 'oj-list-view-preferences';
const LIST_VIEW_CHANGE_EVENT = 'one-journal:list-view-preferences-change';

export const DEFAULT_LIST_VIEW_PREFERENCES: ListViewPreferences = {
  accounts: 'cards',
  analyses: 'cards',
  trades: 'cards',
};

const modeLabels: Record<ListViewMode, string> = {
  cards: 'Cards',
  compact: 'Compact',
  stacked: 'Stacked Preview',
};

function isListViewMode(value: unknown): value is ListViewMode {
  return (
    typeof value === 'string' &&
    (LIST_VIEW_MODES as readonly string[]).includes(value)
  );
}

function normalizeListViewPreferences(value: unknown): ListViewPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_LIST_VIEW_PREFERENCES;
  }

  const input = value as Partial<Record<ListViewTarget, unknown>>;

  return {
    accounts: isListViewMode(input.accounts)
      ? input.accounts
      : DEFAULT_LIST_VIEW_PREFERENCES.accounts,
    analyses: isListViewMode(input.analyses)
      ? input.analyses
      : DEFAULT_LIST_VIEW_PREFERENCES.analyses,
    trades: isListViewMode(input.trades)
      ? input.trades
      : DEFAULT_LIST_VIEW_PREFERENCES.trades,
  };
}

function readListViewPreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_LIST_VIEW_PREFERENCES;
  }

  const storedPreferences = window.localStorage.getItem(LIST_VIEW_STORAGE_KEY);

  if (!storedPreferences) {
    return DEFAULT_LIST_VIEW_PREFERENCES;
  }

  try {
    return normalizeListViewPreferences(JSON.parse(storedPreferences));
  } catch {
    return DEFAULT_LIST_VIEW_PREFERENCES;
  }
}

function getListViewSnapshot() {
  return JSON.stringify(readListViewPreferences());
}

function getServerListViewSnapshot() {
  return JSON.stringify(DEFAULT_LIST_VIEW_PREFERENCES);
}

function subscribeToListViewPreferences(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === LIST_VIEW_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(LIST_VIEW_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(LIST_VIEW_CHANGE_EVENT, onStoreChange);
  };
}

function writeListViewPreferences(preferences: ListViewPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    LIST_VIEW_STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event(LIST_VIEW_CHANGE_EVENT));
}

export function getListViewModeLabel(mode: ListViewMode) {
  return modeLabels[mode];
}

export function useListViewPreferences() {
  const snapshot = useSyncExternalStore(
    subscribeToListViewPreferences,
    getListViewSnapshot,
    getServerListViewSnapshot,
  );
  const preferences = normalizeListViewPreferences(JSON.parse(snapshot));

  function setListViewMode(target: ListViewTarget, mode: ListViewMode) {
    writeListViewPreferences({
      ...preferences,
      [target]: mode,
    });
  }

  function resetListViewPreferences() {
    writeListViewPreferences(DEFAULT_LIST_VIEW_PREFERENCES);
  }

  return {
    preferences,
    resetListViewPreferences,
    setListViewMode,
  };
}
