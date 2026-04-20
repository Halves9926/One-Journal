export function readFormDraft<T extends Record<string, unknown>>(
  storageKey: string,
  defaults: T,
) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    const candidate = parsedValue as Record<string, unknown>;
    const nextValues = { ...defaults };

    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const defaultValue = defaults[key];
      const candidateValue = candidate[key as string];

      if (typeof defaultValue === 'boolean') {
        if (typeof candidateValue === 'boolean') {
          nextValues[key] = candidateValue as T[keyof T];
        }

        continue;
      }

      if (typeof defaultValue === 'string') {
        if (typeof candidateValue === 'string') {
          nextValues[key] = candidateValue as T[keyof T];
        }

        continue;
      }

      if (Array.isArray(defaultValue)) {
        if (
          Array.isArray(candidateValue) &&
          candidateValue.every((item) => typeof item === 'string')
        ) {
          nextValues[key] = candidateValue as T[keyof T];
        }

        continue;
      }
    }

    return nextValues;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function writeFormDraft<T extends Record<string, unknown>>(
  storageKey: string,
  value: T,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function clearFormDraft(storageKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
