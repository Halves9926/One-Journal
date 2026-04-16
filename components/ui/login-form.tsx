'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/ui/auth-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { InputField, MessageBanner } from '@/components/ui/form-fields';
import { Panel } from '@/components/ui/panel';

type AuthMode = 'login' | 'signup';
type Feedback = {
  type: 'error' | 'success';
  text: string;
} | null;

export default function LoginForm() {
  const router = useRouter();
  const { loading, supabase, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setFeedback({
        type: 'error',
        text: 'Enter email and password.',
      });
      return;
    }

    if (!supabase) {
      setFeedback({
        type: 'error',
        text: 'Supabase client unavailable. Reload and retry.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        setFeedback({
          type: 'success',
          text: 'Login complete. Redirecting...',
        });
        router.replace('/dashboard');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setFeedback({
          type: 'success',
          text: 'Account created. Redirecting...',
        });
        router.replace('/dashboard');
        return;
      }

      setFeedback({
        type: 'success',
        text: 'Check your email to confirm the account.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Request failed. Retry.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading || !supabase) {
    return (
      <Panel className="p-6 sm:p-8 animate-rise-delay-1">
        <p className="text-sm text-neutral-500">Loading session...</p>
      </Panel>
    );
  }

  if (user) {
    return (
      <Panel className="p-6 sm:p-8 animate-rise-delay-1">
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.28em] text-rose-700">
          active session
        </span>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-neutral-950">
          Session active
        </h2>
        <p className="mt-4 text-sm leading-7 text-neutral-600">
          {user.email}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/dashboard" size="lg" variant="primary">
            Dashboard
          </ButtonLink>
          <ButtonLink href="/trades/new" size="lg" variant="secondary">
            New trade
          </ButtonLink>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden p-6 sm:p-8 animate-rise-delay-1">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-neutral-500">
          access
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Workspace access
        </h2>
      </div>

      <div className="flex gap-2 rounded-full border border-neutral-200 bg-neutral-100/80 p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            mode === 'login'
              ? 'bg-[linear-gradient(135deg,rgba(127,29,29,0.95),rgba(95,16,32,0.94),rgba(36,11,17,0.98))] text-white shadow-[0_18px_36px_-20px_rgba(127,29,29,0.9)]'
              : 'text-neutral-600 hover:bg-white hover:text-neutral-950'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            mode === 'signup'
              ? 'bg-[linear-gradient(135deg,rgba(127,29,29,0.95),rgba(95,16,32,0.94),rgba(36,11,17,0.98))] text-white shadow-[0_18px_36px_-20px_rgba(127,29,29,0.9)]'
              : 'text-neutral-600 hover:bg-white hover:text-neutral-950'
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <InputField
          type="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <InputField
          type="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {feedback ? (
          <MessageBanner message={feedback.text} tone={feedback.type} />
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          variant="primary"
          className="w-full"
        >
          {isSubmitting
            ? 'Loading...'
            : mode === 'login'
              ? 'Enter'
              : 'Create account'}
        </Button>
      </form>

      <div className="mt-6 border-t border-neutral-200 pt-5 text-sm text-neutral-500">
        <Link href="/" className="transition hover:text-neutral-950">
          Back home
        </Link>
      </div>
    </Panel>
  );
}
