'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/ui/auth-provider';
import { scopeRecordsToAccount } from '@/lib/account-scope';
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
  loading: true,
};

type UseUserAnalysesOptions = {
  accountId?: string | null;
  enabled?: boolean;
  fallbackToAllWhenScopedEmpty?: boolean;
  includeUnassigned?: boolean;
  limit?: number | null;
};

export function useUserAnalyses({
  accountId,
  enabled = true,
  fallbackToAllWhenScopedEmpty = false,
  includeUnassigned = true,
  limit = 24,
}: UseUserAnalysesOptions = {}) {
  const { loading: authLoading, supabase, user } = useAuth();
  const [state, setState] = useState<UserAnalysesState>(initialState);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(function refresh() {
    setRefreshCounter((current) => current + 1);
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!supabase || !user || !enabled) {
      return;
    }

    const currentSupabase = supabase;
    const currentAccountId = accountId?.trim() ? accountId.trim() : null;
    let ignore = false;

    async function runAnalysesQuery() {
      let query = currentSupabase
        .from('analyses')
        .select(ANALYSIS_SELECT)
        .order('analysis_date', { ascending: false })
        .order('updated_at', { ascending: false });

      if (currentAccountId && !includeUnassigned) {
        query = query.eq('account_id', currentAccountId);
      }

      if (
        !currentAccountId &&
        typeof limit === 'number' &&
        Number.isFinite(limit) &&
        limit > 0
      ) {
        query = query.limit(limit);
      }

      return query.overrideTypes<AnalysisRow[], { merge: false }>();
    }

    async function loadAnalyses() {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      const { data, error } = await runAnalysesQuery();

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

      const rows = data ?? [];

      const normalizedAnalyses = rows.map((analysis, index) =>
        normalizeAnalysis(analysis, index),
      );
      const { items: scopedAnalyses } = scopeRecordsToAccount(
        normalizedAnalyses,
        currentAccountId,
        {
          fallbackToAllWhenEmpty: fallbackToAllWhenScopedEmpty,
          includeUnassigned,
        },
      );
      const limitedAnalyses =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0
          ? scopedAnalyses.slice(0, limit)
          : scopedAnalyses;

      setState({
        error: null,
        items: limitedAnalyses,
        loading: false,
      });
    }

    void loadAnalyses();

    return () => {
      ignore = true;
    };
  }, [
    accountId,
    authLoading,
    enabled,
    fallbackToAllWhenScopedEmpty,
    includeUnassigned,
    limit,
    refreshCounter,
    supabase,
    user,
  ]);

  const resolvedState =
    !supabase || !user
      ? { ...initialState, loading: authLoading || Boolean(enabled) }
      : !enabled
        ? { ...initialState, loading: true }
        : state;

  return {
    authLoading,
    ...resolvedState,
    refresh,
  };
}
