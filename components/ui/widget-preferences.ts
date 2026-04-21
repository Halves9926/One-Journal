'use client';

import { useSyncExternalStore } from 'react';

import {
  WIN_RATE_WIDGET_VARIANTS,
  type WinRateWidgetVariant,
} from '@/components/ui/win-rate-widget';

export type WidgetPreferences = {
  defaultWinRateVariant: WinRateWidgetVariant;
};

const WIDGET_PREFERENCES_STORAGE_KEY = 'oj-widget-preferences';
const WIDGET_PREFERENCES_CHANGE_EVENT = 'one-journal:widget-preferences-change';

export const DEFAULT_WIDGET_PREFERENCES: WidgetPreferences = {
  defaultWinRateVariant: 'radial',
};

export const winRateVariantLabels: Record<WinRateWidgetVariant, string> = {
  compact: 'Compact',
  radial: 'Radial',
};

function isWinRateVariant(value: unknown): value is WinRateWidgetVariant {
  return (
    typeof value === 'string' &&
    (WIN_RATE_WIDGET_VARIANTS as readonly string[]).includes(value)
  );
}

function normalizeWidgetPreferences(value: unknown): WidgetPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_WIDGET_PREFERENCES;
  }

  const input = value as Partial<Record<keyof WidgetPreferences, unknown>>;

  return {
    defaultWinRateVariant: isWinRateVariant(input.defaultWinRateVariant)
      ? input.defaultWinRateVariant
      : DEFAULT_WIDGET_PREFERENCES.defaultWinRateVariant,
  };
}

function readWidgetPreferences() {
  if (typeof window === 'undefined') {
    return DEFAULT_WIDGET_PREFERENCES;
  }

  const storedPreferences = window.localStorage.getItem(
    WIDGET_PREFERENCES_STORAGE_KEY,
  );

  if (!storedPreferences) {
    return DEFAULT_WIDGET_PREFERENCES;
  }

  try {
    return normalizeWidgetPreferences(JSON.parse(storedPreferences));
  } catch {
    return DEFAULT_WIDGET_PREFERENCES;
  }
}

function getWidgetPreferencesSnapshot() {
  return JSON.stringify(readWidgetPreferences());
}

function getServerWidgetPreferencesSnapshot() {
  return JSON.stringify(DEFAULT_WIDGET_PREFERENCES);
}

function subscribeToWidgetPreferences(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === WIDGET_PREFERENCES_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(WIDGET_PREFERENCES_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(WIDGET_PREFERENCES_CHANGE_EVENT, onStoreChange);
  };
}

function writeWidgetPreferences(preferences: WidgetPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    WIDGET_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event(WIDGET_PREFERENCES_CHANGE_EVENT));
}

export function useWidgetPreferences() {
  const snapshot = useSyncExternalStore(
    subscribeToWidgetPreferences,
    getWidgetPreferencesSnapshot,
    getServerWidgetPreferencesSnapshot,
  );
  const preferences = normalizeWidgetPreferences(JSON.parse(snapshot));

  function setDefaultWinRateVariant(variant: WinRateWidgetVariant) {
    writeWidgetPreferences({
      ...preferences,
      defaultWinRateVariant: variant,
    });
  }

  function resetWidgetPreferences() {
    writeWidgetPreferences(DEFAULT_WIDGET_PREFERENCES);
  }

  return {
    preferences,
    resetWidgetPreferences,
    setDefaultWinRateVariant,
  };
}
