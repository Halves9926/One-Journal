import type { AccountMemberRow } from '@/lib/supabase';

export const ACCOUNT_MEMBER_ROLES = [
  'owner',
  'admin',
  'member',
  'viewer',
] as const;

export type AccountMemberRole = (typeof ACCOUNT_MEMBER_ROLES)[number];

export const ACCOUNT_MEMBER_SELECT = [
  'id',
  'account_id',
  'user_id',
  'role',
  'invited_by',
  'created_at',
  'updated_at',
].join(',');

export const COOP_DISCLAIMER =
  'Co-op is for sharing journal workspaces only. It is not advice or encouragement to share broker, prop firm, exchange, or trading platform credentials where that is not allowed.';

export type AccountMemberView = {
  accountId: string;
  createdAt: string | null;
  displayName: string | null;
  id: string;
  invitedBy: string | null;
  role: AccountMemberRole;
  updatedAt: string | null;
  userId: string;
  username: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function normalizeAccountMemberRole(
  value: unknown,
  fallback: AccountMemberRole = 'viewer',
): AccountMemberRole {
  return ACCOUNT_MEMBER_ROLES.includes(value as AccountMemberRole)
    ? (value as AccountMemberRole)
    : fallback;
}

export function getAccountRoleLabel(role: AccountMemberRole) {
  return role === 'owner'
    ? 'Owner'
    : role === 'admin'
      ? 'Admin'
      : role === 'member'
        ? 'Member'
        : 'Viewer';
}

export function canRoleManageAccount(role: AccountMemberRole) {
  return role === 'owner' || role === 'admin';
}

export function canRoleDeleteAccount(role: AccountMemberRole) {
  return role === 'owner';
}

export function canRoleManageMembers(role: AccountMemberRole) {
  return role === 'owner' || role === 'admin';
}

export function canRoleWriteJournal(role: AccountMemberRole) {
  return role === 'owner' || role === 'admin' || role === 'member';
}

export function normalizeAccountMember(
  row: AccountMemberRow,
  profile?: { displayName: string | null; username: string | null },
): AccountMemberView {
  return {
    accountId: cleanText(row.account_id) ?? '',
    createdAt: cleanText(row.created_at),
    displayName: profile?.displayName ?? null,
    id: cleanText(row.id) ?? '',
    invitedBy: cleanText(row.invited_by),
    role: normalizeAccountMemberRole(row.role),
    updatedAt: cleanText(row.updated_at),
    userId: cleanText(row.user_id) ?? '',
    username: profile?.username ?? null,
  };
}
