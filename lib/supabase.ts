import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

export type AccountRow = {
  id?: string | null;
  user_id?: string | null;
  name?: string | null;
  type?: string | null;
  initial_equity?: number | string | null;
  current_equity?: number | string | null;
  is_active?: boolean | null;
  phases_enabled?: boolean | null;
  phase_count?: number | string | null;
  current_phase?: number | string | null;
  passed_phase_count?: number | string | null;
  phase_status?: string | null;
  phase_start_equity?: number | string | null;
  phase_started_at?: string | null;
  is_funded?: boolean | null;
  max_drawdown?: number | string | null;
  daily_drawdown_max?: number | string | null;
  prop_target?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export type AccountInsert = Partial<Omit<AccountRow, 'id'>> & {
  user_id: string;
};

export type AccountUpdate = Partial<Omit<AccountInsert, 'user_id'>> & {
  user_id?: string;
};

export type TradeRow = {
  ID?: string | number | null;
  Date?: string | null;
  Symbol?: string | null;
  Bias?: string | null;
  'Entry Price'?: number | string | null;
  Stoploss?: number | string | null;
  'Take Profit'?: number | string | null;
  'Risk %'?: number | string | null;
  RrisktoRewardRatio?: number | string | null;
  PnL?: number | string | null;
  Notes?: string | null;
  ScreenShotURL?: string | null;
  account_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: string | null;
  [key: string]: unknown;
};

export type TradeInsert = Partial<Omit<TradeRow, 'ID'>> & {
  user_id: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      );
    }

    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

export type AuthSession = Session | null;
export type AuthUser = User | null;
