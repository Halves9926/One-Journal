'use client';

import { useEffect, useMemo, useState } from 'react';

import AuthRequired from '@/components/ui/auth-required';
import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { InputField, MessageBanner } from '@/components/ui/form-fields';
import PageShell from '@/components/ui/page-shell';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal } from '@/components/ui/reveal';
import {
  createInitialProfileFormValues,
  getProfileFallbackName,
  mapProfileFormToUpsert,
  normalizeProfile,
  PROFILE_SELECT,
  PROFILES_TABLE,
  validateUsername,
  type ProfileFormInput,
  type ProfileView,
} from '@/lib/profiles';
import type { ProfileRow } from '@/lib/supabase';

type SaveState = {
  message: string;
  tone: 'error' | 'success' | 'neutral';
} | null;

const PROFILE_CHANGE_EVENT = 'one-journal:profile-change';

export default function ProfileView() {
  const { loading, supabase, user } = useAuth();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [values, setValues] = useState<ProfileFormInput>(() =>
    createInitialProfileFormValues({
      email: null,
      profile: null,
    }),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [loadedProfileUserId, setLoadedProfileUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const email = user?.email ?? null;
  const usernamePreview = useMemo(() => {
    const result = validateUsername(values.username);

    return result.username ?? values.username.trim().replace(/^@+/, '').toLowerCase();
  }, [values.username]);
  const authorLabel =
    values.displayName.trim() || usernamePreview || getProfileFallbackName(email);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!supabase || !user) {
      return;
    }

    const currentSupabase = supabase;
    const currentUser = user;
    let ignore = false;

    async function loadProfile() {
      setIsLoadingProfile(true);
      setSaveState(null);

      const { data, error } = await currentSupabase
        .from(PROFILES_TABLE)
        .select(PROFILE_SELECT)
        .eq('user_id', currentUser.id)
        .limit(1)
        .overrideTypes<ProfileRow[], { merge: false }>();

      if (ignore) {
        return;
      }

      if (error) {
        setSaveState({
          message: error.message,
          tone: 'error',
        });
        setIsLoadingProfile(false);
        setLoadedProfileUserId(currentUser.id);
        return;
      }

      const nextProfile = data?.[0] ? normalizeProfile(data[0], currentUser.id) : null;

      setProfile(nextProfile);
      setValues(
        createInitialProfileFormValues({
          email: currentUser.email,
          profile: nextProfile,
        }),
      );
      setFieldError(null);
      setIsLoadingProfile(false);
      setLoadedProfileUserId(currentUser.id);
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [loading, supabase, user]);

  function updateValue<Key extends keyof ProfileFormInput>(
    key: Key,
    value: ProfileFormInput[Key],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
    setFieldError(null);
    setSaveState(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !user) {
      setSaveState({
        message: 'Sign in to save your profile.',
        tone: 'error',
      });
      return;
    }

    const mappedProfile = mapProfileFormToUpsert(values, user.id);

    if (mappedProfile.error || !mappedProfile.payload) {
      setFieldError(mappedProfile.error ?? 'Review the username.');
      return;
    }

    setIsSaving(true);
    setSaveState(null);

    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .upsert(mappedProfile.payload, { onConflict: 'user_id' })
      .select(PROFILE_SELECT)
      .single()
      .overrideTypes<ProfileRow, { merge: false }>();

    if (error) {
      setSaveState({
        message:
          error.code === '23505'
            ? 'That username is already taken.'
            : error.message,
        tone: 'error',
      });
      setIsSaving(false);
      return;
    }

    const nextProfile = normalizeProfile(data, user.id);

    setProfile(nextProfile);
    setValues(
      createInitialProfileFormValues({
        email,
        profile: nextProfile,
      }),
    );
    setSaveState({
      message: 'Profile saved.',
      tone: 'success',
    });
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVENT));
    setIsSaving(false);
  }

  if (
    loading ||
    (Boolean(user) && (isLoadingProfile || loadedProfileUserId !== user?.id))
  ) {
    return (
      <PageShell>
        <Panel className="p-6 sm:p-8">
          <p className="text-sm text-[var(--muted)]">Loading profile...</p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <AuthRequired
          title="Profile locked"
          description="Sign in to edit your One Journal identity."
        />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Reveal>
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="profile"
                title="Account profile"
                description="Choose the name shown on public shared analyses."
                action={
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink href="/analyses" size="lg" variant="secondary">
                      Analyses
                    </ButtonLink>
                    <ButtonLink href="/settings" size="lg" variant="ghost">
                      Settings
                    </ButtonLink>
                  </div>
                }
              />
            </Panel>
          </Reveal>

          {saveState ? (
            <MessageBanner message={saveState.message} tone={saveState.tone} />
          ) : null}

          <Reveal delay={0.04}>
            <Panel className="overflow-hidden">
              <PanelHeader
                eyebrow="identity"
                title="Public author name"
                description="Username is used for shared analysis pages. Email stays private."
              />
              <form
                className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2"
                onSubmit={handleSubmit}
              >
                <InputField
                  label="Username"
                  required
                  value={values.username}
                  error={fieldError ?? undefined}
                  onChange={(event) => updateValue('username', event.target.value)}
                  placeholder="your-name"
                />
                <InputField
                  label="Display name"
                  value={values.displayName}
                  onChange={(event) => updateValue('displayName', event.target.value)}
                  placeholder="Optional"
                />
                <InputField
                  label="Email"
                  value={email ?? ''}
                  readOnly
                  inputClassName="cursor-not-allowed opacity-75"
                  wrapperClassName="md:col-span-2"
                />
                <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row">
                  <Button disabled={isSaving} size="lg" type="submit" variant="primary">
                    {isSaving ? 'Saving...' : 'Save profile'}
                  </Button>
                  <Button
                    size="lg"
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setValues(
                        createInitialProfileFormValues({
                          email,
                          profile,
                        }),
                      );
                      setFieldError(null);
                      setSaveState(null);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </Panel>
          </Reveal>
        </div>

        <div className="space-y-6 xl:sticky xl:top-32 xl:self-start">
          <Reveal delay={0.08}>
            <Panel className="p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">
                Public preview
              </p>
              <div className="mt-4 rounded-[24px] border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface))] p-5 shadow-[0_18px_42px_-34px_var(--shadow-color)]">
                <p className="text-sm text-[var(--muted)]">Author</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {authorLabel}
                </p>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  @{usernamePreview || 'username'}
                </p>
              </div>
              <div className="mt-4 rounded-[24px] border border-[color:var(--border-color)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
                Shared analysis pages show this author name without exposing your email.
              </div>
            </Panel>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}
