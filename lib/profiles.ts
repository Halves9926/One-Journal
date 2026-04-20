import type { ProfileInsert, ProfileRow, ProfileUpdate } from '@/lib/supabase';

export const PROFILES_TABLE = 'profiles';

export const PROFILE_SELECT = [
  'user_id',
  'username',
  'display_name',
  'created_at',
  'updated_at',
].join(',');

export type ProfileView = {
  createdAt: string | null;
  displayName: string | null;
  updatedAt: string | null;
  userId: string;
  username: string;
};

export type ProfileFormInput = {
  displayName: string;
  username: string;
};

export type UsernameValidationResult =
  | {
      error: string;
      username: null;
    }
  | {
      error: null;
      username: string;
    };

function cleanText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function getProfileFallbackName(email: string | null | undefined) {
  const emailPrefix = cleanText(email)?.split('@')[0]?.trim();

  if (emailPrefix && emailPrefix.length >= 2) {
    return emailPrefix;
  }

  return 'One Journal user';
}

export function validateUsername(value: string): UsernameValidationResult {
  const username = value.trim().replace(/^@+/, '').toLowerCase();

  if (!username) {
    return {
      error: 'Username is required.',
      username: null,
    };
  }

  if (username.length < 3 || username.length > 30) {
    return {
      error: 'Username must be between 3 and 30 characters.',
      username: null,
    };
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(username)) {
    return {
      error: 'Use letters, numbers, dots, underscores or hyphens. Start with a letter or number.',
      username: null,
    };
  }

  if (username.includes('..') || username.includes('__') || username.includes('--')) {
    return {
      error: 'Avoid repeated separators.',
      username: null,
    };
  }

  return {
    error: null,
    username,
  };
}

export function normalizeDisplayName(value: string) {
  const displayName = value.trim().replace(/\s+/g, ' ');

  if (!displayName) {
    return null;
  }

  return displayName.slice(0, 80);
}

export function normalizeProfile(row: ProfileRow, fallbackUserId: string): ProfileView {
  return {
    createdAt: cleanText(row.created_at),
    displayName: cleanText(row.display_name),
    updatedAt: cleanText(row.updated_at),
    userId: cleanText(row.user_id) ?? fallbackUserId,
    username: cleanText(row.username) ?? 'one-journal-user',
  };
}

export function createInitialProfileFormValues({
  email,
  profile,
}: {
  email: string | null | undefined;
  profile: ProfileView | null;
}): ProfileFormInput {
  return {
    displayName: profile?.displayName ?? '',
    username: profile?.username ?? getProfileFallbackName(email),
  };
}

export function mapProfileFormToUpsert(
  input: ProfileFormInput,
  userId: string,
): { error: string | null; payload: ProfileInsert | null } {
  const usernameResult = validateUsername(input.username);

  if (usernameResult.error || !usernameResult.username) {
    return {
      error: usernameResult.error,
      payload: null,
    };
  }

  return {
    error: null,
    payload: {
      display_name: normalizeDisplayName(input.displayName),
      user_id: userId,
      username: usernameResult.username,
    },
  };
}

export function mapProfileFormToUpdate(
  input: ProfileFormInput,
): { error: string | null; payload: ProfileUpdate | null } {
  const usernameResult = validateUsername(input.username);

  if (usernameResult.error || !usernameResult.username) {
    return {
      error: usernameResult.error,
      payload: null,
    };
  }

  return {
    error: null,
    payload: {
      display_name: normalizeDisplayName(input.displayName),
      username: usernameResult.username,
    },
  };
}
