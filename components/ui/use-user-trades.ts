'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/ui/auth-provider';
import { scopeRecordsToAccount } from '@/lib/account-scope';
import { TRADE_SELECT, normalizeTrade, type TradeView } from '@/lib/trades';
import type { TradeRow } from '@/lib/supabase';

export type UserTradesState = {
  error: string | null;
  items: TradeView[];
  loading: boolean;
};

const initialState: UserTradesState = {
  error: null,
  items: [],
  loading: false,
};

type UseUserTradesOptions = {
  accountId?: string | null;
  enabled?: boolean;
  fallbackToAllWhenScopedEmpty?: boolean;
  includeUnassigned?: boolean;
  limit?: number | null;
};

export function useUserTrades({
  accountId,
  enabled = true,
  fallbackToAllWhenScopedEmpty = false,
  includeUnassigned = true,
  limit = 24,
}: UseUserTradesOptions = {}) {
  const { loading: authLoading, supabase, user } = useAuth();
  const [state, setState] = useState<UserTradesState>(initialState);
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
    const currentAccountId = accountId?.trim() ? accountId.trim() : null;
    let ignore = false;

    async function runTradesQuery() {
      let query = currentSupabase
        .from('Trades')
        .select(TRADE_SELECT)
        .order('Date', { ascending: false });

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

      return query.overrideTypes<TradeRow[], { merge: false }>();
    }

    async function loadTrades() {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      const { data, error } = await runTradesQuery();

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

      const normalizedTrades = rows.map((trade, index) =>
        normalizeTrade(trade, index),
      );
      const { items: scopedTrades } = scopeRecordsToAccount(
        normalizedTrades,
        currentAccountId,
        {
          fallbackToAllWhenEmpty: fallbackToAllWhenScopedEmpty,
          includeUnassigned,
        },
      );
      const limitedTrades =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0
          ? scopedTrades.slice(0, limit)
          : scopedTrades;

      setState({
        error: null,
        items: limitedTrades,
        loading: false,
      });
    }

    void loadTrades();

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
