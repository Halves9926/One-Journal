'use client';

import { useEffect, useState } from 'react';

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
  loading: false,
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
  fallbackToAllWhenScopedEmpty = true,
  includeUnassigned = true,
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

    function rowBelongsToCurrentUser(row: AnalysisRow) {
      const rowUserId =
        typeof row.user_id === 'string' && row.user_id.trim()
          ? row.user_id.trim()
          : null;

      return rowUserId === null || rowUserId === currentUserId;
    }

    async function runAnalysesQuery(withUserFilter: boolean) {
      let query = currentSupabase
        .from('analyses')
        .select(ANALYSIS_SELECT)
        .order('analysis_date', { ascending: false })
        .order('updated_at', { ascending: false });

      if (withUserFilter) {
        query = query.eq('user_id', currentUserId);
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

      const { data, error } = await runAnalysesQuery(true);

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

      let rows = data ?? [];

      if (rows.length === 0) {
        const fallbackResult = await runAnalysesQuery(false);

        if (ignore) {
          return;
        }

        if (!fallbackResult.error && fallbackResult.data && fallbackResult.data.length > 0) {
          rows = fallbackResult.data.filter(rowBelongsToCurrentUser);
        }
      }

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

  const resolvedState = !supabase || !user || !enabled ? initialState : state;

  return {
    authLoading,
    ...resolvedState,
    refresh,
  };
}
