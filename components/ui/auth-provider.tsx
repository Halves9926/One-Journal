'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from '@/lib/supabase';

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  supabase: ReturnType<typeof getSupabaseBrowserClient> | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(
    () => (typeof window === 'undefined' ? null : getSupabaseBrowserClient()),
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const currentSupabase = supabase;
    let ignore = false;

    async function loadSession() {
      const { data } = await currentSupabase.auth.getSession();

      if (ignore) {
        return;
      }

      setSession(data.session ?? null);
      setLoading(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = currentSupabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
