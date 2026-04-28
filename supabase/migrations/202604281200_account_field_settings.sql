alter table public.accounts
  add column if not exists trade_field_settings jsonb,
  add column if not exists analysis_field_settings jsonb;

alter table public.accounts
  alter column trade_field_settings set default '{
    "trade_date": true,
    "open_time": true,
    "close_time": true,
    "symbol": true,
    "direction": true,
    "entry_price": true,
    "stop_loss": true,
    "take_profit": true,
    "risk_amount": true,
    "position_size": false,
    "pnl": true,
    "rr": true,
    "strategy": false,
    "session": false,
    "mistake": false,
    "notes": true,
    "screenshot_url": true
  }'::jsonb,
  alter column analysis_field_settings set default '{}'::jsonb;

drop function if exists public.get_accessible_accounts();

create or replace function public.get_accessible_accounts()
returns table (
  id uuid,
  user_id uuid,
  name text,
  type text,
  initial_equity numeric,
  current_equity numeric,
  is_active boolean,
  phases_enabled boolean,
  phase_count integer,
  current_phase integer,
  passed_phase_count integer,
  phase_status text,
  phase_start_equity numeric,
  phase_started_at timestamptz,
  is_funded boolean,
  max_drawdown numeric,
  daily_drawdown_max numeric,
  prop_target numeric,
  trade_field_settings jsonb,
  analysis_field_settings jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  coop_role text,
  coop_member_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    account_row.id,
    account_row.user_id,
    account_row.name,
    account_row.type,
    account_row.initial_equity,
    account_row.current_equity,
    account_row.is_active,
    account_row.phases_enabled,
    account_row.phase_count,
    account_row.current_phase,
    account_row.passed_phase_count,
    account_row.phase_status,
    account_row.phase_start_equity,
    account_row.phase_started_at,
    account_row.is_funded,
    account_row.max_drawdown,
    account_row.daily_drawdown_max,
    account_row.prop_target,
    account_row.trade_field_settings,
    account_row.analysis_field_settings,
    account_row.created_at,
    account_row.updated_at,
    public.get_account_member_role(account_row.id, auth.uid()) as coop_role,
    (
      select count(*)::integer
      from public.account_members member_count_row
      where member_count_row.account_id = account_row.id
    ) as coop_member_count
  from public.accounts account_row
  where auth.uid() is not null
    and public.can_view_account(account_row.id, auth.uid())
  order by account_row.created_at asc;
$$;

grant execute on function public.get_accessible_accounts() to authenticated;
