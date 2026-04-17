'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/ui/auth-provider';
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
  limit?: number | null;
};

export function useUserTrades({
  accountId,
  enabled = true,
  limit = 24,
}: UseUserTradesOptions = {}) {
  const { loading: authLoading, supabase, user } = useAuth();
  const [state, setState] = useState<UserTradesState>(initialState);

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

    async function loadTrades() {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      let query = currentSupabase
        .from('Trades')
        .select(TRADE_SELECT)
        .eq('user_id', currentUserId)
        .order('Date', { ascending: false });

      if (currentAccountId) {
        query = query.eq('account_id', currentAccountId);
      }

      if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query.overrideTypes<TradeRow[], { merge: false }>();

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
        items: (data ?? []).map((trade, index) => normalizeTrade(trade, index)),
        loading: false,
      });
    }

    void loadTrades();

    return () => {
      ignore = true;
    };
  }, [accountId, authLoading, enabled, limit, supabase, user]);

  const resolvedState = !supabase || !user || !enabled ? initialState : state;

  return {
    authLoading,
    ...resolvedState,
  };
}
