export const ANALYTICS_LAYOUT_STORAGE_PREFIX = 'one-journal:analytics-layout:v1';
export const ANALYTICS_LAYOUT_VERSION = 1;

export type AnalyticsLayoutPreference = {
  metricIds: string[];
  updatedAt: string;
  version: typeof ANALYTICS_LAYOUT_VERSION;
};

function getStorageScopeValue(accountId: string | null) {
  return accountId?.trim() ? `account:${accountId.trim()}` : 'all-accounts';
}

export function buildAnalyticsLayoutStorageKey({
  accountId,
  userId,
}: {
  accountId: string | null;
  userId: string;
}) {
  return `${ANALYTICS_LAYOUT_STORAGE_PREFIX}:${userId}:${getStorageScopeValue(accountId)}`;
}

export function parseAnalyticsLayoutPreference(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as Partial<AnalyticsLayoutPreference>;

    if (
      parsedValue.version !== ANALYTICS_LAYOUT_VERSION ||
      !Array.isArray(parsedValue.metricIds)
    ) {
      return null;
    }

    return {
      metricIds: parsedValue.metricIds.filter(
        (metricId): metricId is string => typeof metricId === 'string',
      ),
      updatedAt:
        typeof parsedValue.updatedAt === 'string'
          ? parsedValue.updatedAt
          : new Date().toISOString(),
      version: ANALYTICS_LAYOUT_VERSION,
    } satisfies AnalyticsLayoutPreference;
  } catch {
    return null;
  }
}

export function readAnalyticsLayoutPreference(storageKey: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseAnalyticsLayoutPreference(window.localStorage.getItem(storageKey));
}

export function writeAnalyticsLayoutPreference(
  storageKey: string,
  metricIds: string[],
) {
  if (typeof window === 'undefined') {
    return;
  }

  const preference: AnalyticsLayoutPreference = {
    metricIds,
    updatedAt: new Date().toISOString(),
    version: ANALYTICS_LAYOUT_VERSION,
  };

  window.localStorage.setItem(storageKey, JSON.stringify(preference));
}
