'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { useAuth } from '@/components/ui/auth-provider';
import { Button } from '@/components/ui/button';
import { MessageBanner } from '@/components/ui/form-fields';
import type { AccountView } from '@/lib/accounts';
import {
  ACCOUNT_MEMBER_SELECT,
  COOP_DISCLAIMER,
  getAccountRoleLabel,
  normalizeAccountMember,
  type AccountMemberRole,
  type AccountMemberView,
} from '@/lib/coop';
import {
  normalizeProfile,
  PROFILE_SELECT,
  PROFILES_TABLE,
  validateUsername,
} from '@/lib/profiles';
import type { AccountMemberRow, ProfileRow } from '@/lib/supabase';
import { cx } from '@/lib/utils';

type AccountCoopButtonProps = {
  account: AccountView;
  className?: string;
  onChanged?: () => Promise<void> | void;
};

type Feedback = {
  message: string;
  tone: 'error' | 'success' | 'neutral';
} | null;

const OWNER_ROLE_OPTIONS: AccountMemberRole[] = ['viewer', 'member', 'admin'];
const ADMIN_ROLE_OPTIONS: AccountMemberRole[] = ['viewer', 'member'];

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7.75 9.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" strokeLinecap="round" />
      <path d="M2.75 17a5 5 0 0 1 10 0" strokeLinecap="round" />
      <path d="M14 8.5a2.25 2.25 0 1 0 0-4.5" strokeLinecap="round" />
      <path d="M14.75 17a4.2 4.2 0 0 0-2.1-3.62" strokeLinecap="round" />
    </svg>
  );
}

function getRoleBadgeClassName(role: AccountMemberRole) {
  if (role === 'owner') {
    return 'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]';
  }

  if (role === 'admin') {
    return 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }

  if (role === 'member') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  return 'border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)]';
}

function getProfileLabel(member: AccountMemberView) {
  return member.displayName ?? member.username ?? 'One Journal user';
}

function canManageMember(
  accountRole: AccountMemberRole,
  member: AccountMemberView,
) {
  if (member.role === 'owner') {
    return false;
  }

  if (accountRole === 'owner') {
    return true;
  }

  return accountRole === 'admin' && (member.role === 'member' || member.role === 'viewer');
}

export default function AccountCoopButton({
  account,
  className,
  onChanged,
}: AccountCoopButtonProps) {
  const { supabase, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<AccountMemberView[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<AccountMemberRole>('member');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const roleOptions = account.coopRole === 'owner' ? OWNER_ROLE_OPTIONS : ADMIN_ROLE_OPTIONS;
  const canManageCoop = account.canManageMembers;
  const currentMember = useMemo(
    () => members.find((member) => member.userId === user?.id) ?? null,
    [members, user?.id],
  );

  async function refreshAfterChange(message: string) {
    await loadMembers();
    await onChanged?.();
    setFeedback({ message, tone: 'success' });
  }

  async function loadMembers() {
    if (!supabase || !user) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    const { data, error } = await supabase
      .from('account_members')
      .select(ACCOUNT_MEMBER_SELECT)
      .eq('account_id', account.id)
      .order('created_at', { ascending: true })
      .overrideTypes<AccountMemberRow[], { merge: false }>();

    if (error) {
      setMembers([]);
      setFeedback({
        message: error.message,
        tone: 'error',
      });
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const userIds = Array.from(
      new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))),
    );
    const profilesById = new Map<
      string,
      { displayName: string | null; username: string | null }
    >();

    if (userIds.length > 0) {
      const profilesResult = await supabase
        .from(PROFILES_TABLE)
        .select(PROFILE_SELECT)
        .in('user_id', userIds)
        .overrideTypes<ProfileRow[], { merge: false }>();

      if (!profilesResult.error) {
        for (const row of profilesResult.data ?? []) {
          const profile = normalizeProfile(row, String(row.user_id ?? ''));
          profilesById.set(profile.userId, {
            displayName: profile.displayName,
            username: profile.username,
          });
        }
      }
    }

    setMembers(
      rows.map((row) =>
        normalizeAccountMember(
          row,
          profilesById.get(String(row.user_id ?? '')),
        ),
      ),
    );
    setLoading(false);
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !user || !canManageCoop) {
      setFeedback({
        message: 'You do not have permission to manage this Co-op.',
        tone: 'error',
      });
      return;
    }

    const usernameResult = validateUsername(inviteUsername);

    if (usernameResult.error || !usernameResult.username) {
      setFeedback({
        message: usernameResult.error ?? 'Enter a valid username.',
        tone: 'error',
      });
      return;
    }

    setBusyAction('invite');
    setFeedback(null);

    const profileResult = await supabase
      .rpc('find_profile_by_username', {
        target_username: usernameResult.username,
      })
      .overrideTypes<ProfileRow[], { merge: false }>();

    const profileRow = Array.isArray(profileResult.data)
      ? profileResult.data[0] ?? null
      : null;

    if (profileResult.error || !profileRow?.user_id) {
      setFeedback({
        message: profileResult.error?.message ?? 'No user found with that username.',
        tone: 'error',
      });
      setBusyAction(null);
      return;
    }

    if (profileRow.user_id === user.id) {
      setFeedback({
        message: 'You are already a member of this account.',
        tone: 'neutral',
      });
      setBusyAction(null);
      return;
    }

    const { error } = await supabase.from('account_members').insert({
      account_id: account.id,
      invited_by: user.id,
      role: inviteRole,
      user_id: profileRow.user_id,
    });

    if (error) {
      setFeedback({
        message:
          error.code === '23505'
            ? 'That user is already in this Co-op.'
            : error.message,
        tone: 'error',
      });
      setBusyAction(null);
      return;
    }

    setInviteUsername('');
    await refreshAfterChange('Co-op member added.');
    setBusyAction(null);
  }

  async function handleRoleChange(member: AccountMemberView, role: AccountMemberRole) {
    if (!supabase || !canManageMember(account.coopRole, member) || role === member.role) {
      return;
    }

    setBusyAction(`${member.id}:role`);
    setFeedback(null);

    const { error } = await supabase
      .from('account_members')
      .update({ role })
      .eq('id', member.id);

    if (error) {
      setFeedback({ message: error.message, tone: 'error' });
      setBusyAction(null);
      return;
    }

    await refreshAfterChange('Role updated.');
    setBusyAction(null);
  }

  async function handleRemove(member: AccountMemberView) {
    if (!supabase) {
      return;
    }

    const isLeaving = member.userId === user?.id && member.role !== 'owner';

    if (!isLeaving && !canManageMember(account.coopRole, member)) {
      setFeedback({
        message: 'You do not have permission to remove this member.',
        tone: 'error',
      });
      return;
    }

    setBusyAction(`${member.id}:remove`);
    setFeedback(null);

    const { error } = await supabase
      .from('account_members')
      .delete()
      .eq('id', member.id);

    if (error) {
      setFeedback({ message: error.message, tone: 'error' });
      setBusyAction(null);
      return;
    }

    await refreshAfterChange(isLeaving ? 'You left the Co-op.' : 'Member removed.');
    setBusyAction(null);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadMembers();

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
    // loadMembers is intentionally scoped to the modal/account snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account.id]);

  return (
    <>
      <button
        className={cx(
          'inline-flex min-h-9 items-center gap-2 rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[color:var(--accent-border-soft)] hover:text-[var(--foreground)]',
          account.isCoop &&
            'border-[color:var(--accent-border-soft)] bg-[var(--accent-soft-bg)] text-[var(--accent-text)]',
          className,
        )}
        type="button"
        onClick={() => setOpen(true)}
      >
        <TeamIcon className="h-4 w-4" />
        Co-op
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[95] flex items-end justify-center overflow-x-hidden px-3 py-4 sm:items-center sm:px-6">
              <button
                aria-label="Close Co-op"
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                type="button"
                onClick={() => setOpen(false)}
              />
              <section
                aria-modal="true"
                className="relative z-10 flex max-h-[88svh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-[color:var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] shadow-[0_34px_90px_-36px_rgba(0,0,0,0.52)]"
                role="dialog"
              >
                <div className="border-b border-[color:var(--border-color)] px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent-text)]">
                        account co-op
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                        {account.name}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {COOP_DISCLAIMER}
                      </p>
                    </div>
                    <button
                      aria-label="Close"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] text-[var(--muted-strong)] transition hover:border-[color:var(--border-strong)] hover:text-[var(--foreground)]"
                      type="button"
                      onClick={() => setOpen(false)}
                    >
                      x
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  {feedback ? (
                    <MessageBanner message={feedback.message} tone={feedback.tone} />
                  ) : null}

                  <div className="mt-4 grid gap-3">
                    {loading ? (
                      <div className="rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                        Loading Co-op members...
                      </div>
                    ) : null}

                    {!loading && members.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)]">
                        No Co-op members found yet. Run the Co-op SQL if this is the first time enabling shared accounts.
                      </div>
                    ) : null}

                    {members.map((member) => {
                      const manageable = canManageMember(account.coopRole, member);
                      const isLeaving = member.userId === user?.id && member.role !== 'owner';
                      const availableRoles =
                        account.coopRole === 'owner' ? OWNER_ROLE_OPTIONS : ADMIN_ROLE_OPTIONS;

                      return (
                        <div
                          key={member.id || member.userId}
                          className="grid gap-3 rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <p className="truncate text-base font-semibold text-[var(--foreground)]">
                                {getProfileLabel(member)}
                              </p>
                              <span
                                className={cx(
                                  'rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]',
                                  getRoleBadgeClassName(member.role),
                                )}
                              >
                                {getAccountRoleLabel(member.role)}
                              </span>
                              {member.userId === user?.id ? (
                                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-sm text-[var(--muted)]">
                              @{member.username ?? member.userId.slice(0, 8)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {manageable ? (
                              <select
                                aria-label={`Change role for ${getProfileLabel(member)}`}
                                className="min-h-9 rounded-full border border-[color:var(--border-color)] bg-[var(--surface)] px-3 text-xs text-[var(--foreground)] outline-none transition focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                                disabled={busyAction === `${member.id}:role`}
                                value={member.role}
                                onChange={(event) => {
                                  void handleRoleChange(
                                    member,
                                    event.target.value as AccountMemberRole,
                                  );
                                }}
                              >
                                {availableRoles.map((role) => (
                                  <option key={role} value={role}>
                                    {getAccountRoleLabel(role)}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                            {manageable || isLeaving ? (
                              <button
                                className="inline-flex min-h-9 items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-medium text-rose-700 transition hover:border-rose-500/34 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300"
                                disabled={busyAction === `${member.id}:remove`}
                                type="button"
                                onClick={() => {
                                  void handleRemove(member);
                                }}
                              >
                                {busyAction === `${member.id}:remove`
                                  ? 'Updating...'
                                  : isLeaving
                                    ? 'Leave'
                                    : 'Remove'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {canManageCoop ? (
                    <form
                      className="mt-5 rounded-[26px] border border-[color:var(--accent-border-soft)] bg-[linear-gradient(180deg,var(--accent-soft-bg),var(--surface))] p-4"
                      onSubmit={handleInvite}
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-text)]">
                        invite by username
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                            Username
                          </span>
                          <input
                            className="min-h-11 w-full rounded-[20px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                            placeholder="@username"
                            value={inviteUsername}
                            onChange={(event) => setInviteUsername(event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                            Role
                          </span>
                          <select
                            className="min-h-11 w-full rounded-[20px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[color:var(--accent-border-strong)] focus:ring-2 focus:ring-[color:var(--accent-focus-ring)]"
                            value={inviteRole}
                            onChange={(event) =>
                              setInviteRole(event.target.value as AccountMemberRole)
                            }
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {getAccountRoleLabel(role)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          disabled={busyAction === 'invite'}
                          size="sm"
                          type="submit"
                          variant="primary"
                        >
                          {busyAction === 'invite' ? 'Adding...' : 'Add'}
                        </Button>
                      </div>
                    </form>
                  ) : currentMember?.role === 'viewer' ? (
                    <p className="mt-5 rounded-[22px] border border-[color:var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                      Viewer access is read-only. Ask the owner for a higher role if you need to contribute.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
