export type AccountScopeOptions = {
  fallbackToAllWhenEmpty?: boolean;
  includeUnassigned?: boolean;
};

export function normalizeAccountId(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

export function matchesAccountScope(
  recordAccountId: string | null | undefined,
  accountId: string | null | undefined,
  { includeUnassigned = false }: AccountScopeOptions = {},
) {
  const normalizedAccountId = normalizeAccountId(accountId);

  if (!normalizedAccountId) {
    return true;
  }

  const normalizedRecordAccountId = normalizeAccountId(recordAccountId);

  return (
    normalizedRecordAccountId === normalizedAccountId ||
    (includeUnassigned && normalizedRecordAccountId === null)
  );
}

export function scopeRecordsToAccount<T extends { accountId: string | null | undefined }>(
  records: T[],
  accountId: string | null | undefined,
  {
    fallbackToAllWhenEmpty = false,
    includeUnassigned = false,
  }: AccountScopeOptions = {},
) {
  const normalizedAccountId = normalizeAccountId(accountId);

  if (!normalizedAccountId) {
    return {
      items: records,
      usedFallback: false,
    };
  }

  const scopedRecords = records.filter((record) =>
    matchesAccountScope(record.accountId, normalizedAccountId, {
      includeUnassigned,
    }),
  );

  if (fallbackToAllWhenEmpty && scopedRecords.length === 0 && records.length > 0) {
    return {
      items: records,
      usedFallback: true,
    };
  }

  return {
    items: scopedRecords,
    usedFallback: false,
  };
}
