import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

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
