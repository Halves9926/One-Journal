export const HOME_LAYOUT_STORAGE_PREFIX = 'one-journal:home-layout:v1';
export const HOME_LAYOUT_VERSION = 1;

export type HomeLayoutPreference = {
  updatedAt: string;
  version: typeof HOME_LAYOUT_VERSION;
  widgetIds: string[];
  widgetDisplayModes: Record<string, string>;
  widgetVariants: Record<string, string>;
};

function getStorageScopeValue(accountId: string | null) {
  return accountId?.trim() ? `account:${accountId.trim()}` : 'all-accounts';
}

export function buildHomeLayoutStorageKey({
  accountId,
  userId,
}: {
  accountId: string | null;
  userId: string;
}) {
  return `${HOME_LAYOUT_STORAGE_PREFIX}:${userId}:${getStorageScopeValue(accountId)}`;
}

export function parseHomeLayoutPreference(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as Partial<HomeLayoutPreference>;

    if (
      parsedValue.version !== HOME_LAYOUT_VERSION ||
      !Array.isArray(parsedValue.widgetIds)
    ) {
      return null;
    }

    return {
      updatedAt:
        typeof parsedValue.updatedAt === 'string'
          ? parsedValue.updatedAt
          : new Date().toISOString(),
      version: HOME_LAYOUT_VERSION,
      widgetIds: parsedValue.widgetIds.filter(
        (widgetId): widgetId is string => typeof widgetId === 'string',
      ),
      widgetDisplayModes:
        parsedValue.widgetDisplayModes &&
        typeof parsedValue.widgetDisplayModes === 'object' &&
        !Array.isArray(parsedValue.widgetDisplayModes)
          ? Object.fromEntries(
              Object.entries(parsedValue.widgetDisplayModes).filter(
                (entry): entry is [string, string] =>
                  typeof entry[0] === 'string' && typeof entry[1] === 'string',
              ),
            )
          : {},
      widgetVariants:
        parsedValue.widgetVariants &&
        typeof parsedValue.widgetVariants === 'object' &&
        !Array.isArray(parsedValue.widgetVariants)
          ? Object.fromEntries(
              Object.entries(parsedValue.widgetVariants).filter(
                (entry): entry is [string, string] =>
                  typeof entry[0] === 'string' && typeof entry[1] === 'string',
              ),
            )
          : {},
    } satisfies HomeLayoutPreference;
  } catch {
    return null;
  }
}

export function writeHomeLayoutPreference(
  storageKey: string,
  widgetIds: string[],
  widgetVariants: Record<string, string> = {},
  widgetDisplayModes: Record<string, string> = {},
) {
  if (typeof window === 'undefined') {
    return;
  }

  const preference: HomeLayoutPreference = {
    updatedAt: new Date().toISOString(),
    version: HOME_LAYOUT_VERSION,
    widgetIds,
    widgetDisplayModes,
    widgetVariants,
  };

  window.localStorage.setItem(storageKey, JSON.stringify(preference));
}
