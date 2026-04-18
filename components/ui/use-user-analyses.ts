'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/ui/auth-provider';
import {
  ANALYSIS_SELECT,
  normalizeAnalysis,
  type AnalysisView,
} from '@/lib/analyses';
import type { AnalysisRow } from '@/lib/supabase';

export type UserAnalysesState = {
  error: string | null;
  items: AnalysisView[];
  loading: boolean;
};

const initialState: UserAnalysesState = {
  error: null,
  items: [],
  loading: false,
};

type UseUserAnalysesOptions = {
  accountId?: string | null;
  enabled?: boolean;
  limit?: number | null;
};

export function useUserAnalyses({
  accountId,
  enabled = true,
  limit = 24,
}: UseUserAnalysesOptions = {}) {
  const { loading: authLoading, supabase, user } = useAuth();
  const [state, setState] = useState<UserAnalysesState>(initialState);
  const [refreshCounter, setRefreshCounter] = useState(0);

  function refresh() {
    setRefreshCounter((current) => current + 1);
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!supabase || !user || !enabled) {
      return;
    }

    const currentSupabase = supabase;
    const currentUserId = user.id;
    const currentAccountId = accountId?.trim() ? accountId.trim() : null;
    let ignore = false;

    async function loadAnalyses() {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      let query = currentSupabase
        .from('analyses')
        .select(ANALYSIS_SELECT)
        .eq('user_id', currentUserId)
        .order('analysis_date', { ascending: false })
        .order('updated_at', { ascending: false });

      if (currentAccountId) {
        query = query.eq('account_id', currentAccountId);
      }

      if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query.overrideTypes<AnalysisRow[], { merge: false }>();

      if (ignore) {
        return;
      }

      if (error) {
        setState({
          error: error.message,
          items: [],
          loading: false,
        });
        return;
      }

      setState({
        error: null,
        items: (data ?? []).map((analysis, index) =>
          normalizeAnalysis(analysis, index),
        ),
        loading: false,
      });
    }

    void loadAnalyses();

    return () => {
      ignore = true;
    };
  }, [accountId, authLoading, enabled, limit, refreshCounter, supabase, user]);

  const resolvedState = !supabase || !user || !enabled ? initialState : state;

  return {
    authLoading,
    ...resolvedState,
    refresh,
  };
}
