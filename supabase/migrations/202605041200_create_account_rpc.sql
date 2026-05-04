create or replace function public.create_account(account_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  inserted_account_id uuid;
  target_user_id uuid;
begin
  target_user_id := nullif(account_payload->>'user_id', '')::uuid;

  if actor_id is null then
    raise exception 'Sign in to create an account.'
      using errcode = '42501';
  end if;

  if target_user_id is distinct from actor_id then
    raise exception 'You can only create accounts for your own user.'
      using errcode = '42501';
  end if;

  insert into public.accounts (
    user_id,
    name,
    type,
    initial_equity,
    current_equity,
    is_active,
    phases_enabled,
    phase_count,
    current_phase,
    passed_phase_count,
    phase_status,
    phase_start_equity,
    phase_started_at,
    is_funded,
    max_drawdown,
    daily_drawdown_max,
    prop_target,
    trade_field_settings,
    analysis_field_settings
  )
  values (
    target_user_id,
    nullif(btrim(account_payload->>'name'), ''),
    account_payload->>'type',
    coalesce(nullif(account_payload->>'initial_equity', '')::numeric, 0),
    coalesce(nullif(account_payload->>'current_equity', '')::numeric, 0),
    coalesce((account_payload->>'is_active')::boolean, false),
    coalesce((account_payload->>'phases_enabled')::boolean, false),
    coalesce(nullif(account_payload->>'phase_count', '')::integer, 1),
    coalesce(nullif(account_payload->>'current_phase', '')::integer, 1),
    coalesce(nullif(account_payload->>'passed_phase_count', '')::integer, 0),
    coalesce(nullif(account_payload->>'phase_status', ''), 'active'),
    nullif(account_payload->>'phase_start_equity', '')::numeric,
    coalesce(nullif(account_payload->>'phase_started_at', '')::timestamptz, now()),
    coalesce((account_payload->>'is_funded')::boolean, false),
    nullif(account_payload->>'max_drawdown', '')::numeric,
    nullif(account_payload->>'daily_drawdown_max', '')::numeric,
    nullif(account_payload->>'prop_target', '')::numeric,
    coalesce(
      nullif(account_payload->'trade_field_settings', 'null'::jsonb),
      '{
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
      }'::jsonb
    ),
    coalesce(
      nullif(account_payload->'analysis_field_settings', 'null'::jsonb),
      '{}'::jsonb
    )
  )
  returning id into inserted_account_id;

  return inserted_account_id;
end;
$$;

revoke all on function public.create_account(jsonb) from public;
grant execute on function public.create_account(jsonb) to authenticated;

notify pgrst, 'reload schema';
