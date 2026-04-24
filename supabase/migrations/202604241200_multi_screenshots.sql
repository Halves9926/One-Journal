alter table public."Trades"
  add column if not exists screenshot_urls jsonb not null default '[]'::jsonb;

update public."Trades"
set screenshot_urls = to_jsonb(array["ScreenShotURL"])
where "ScreenShotURL" is not null
  and btrim("ScreenShotURL") <> ''
  and (
    screenshot_urls = '[]'::jsonb
    or screenshot_urls is null
  );

alter table public.analyses
  add column if not exists screenshot_urls jsonb not null default '[]'::jsonb;

update public.analyses
set screenshot_urls = to_jsonb(array[screenshot_url])
where screenshot_url is not null
  and btrim(screenshot_url) <> ''
  and (
    screenshot_urls = '[]'::jsonb
    or screenshot_urls is null
  );

create or replace function public.get_public_shared_trade(trade_share_token text)
returns table (
  trade_id text,
  trade_date text,
  symbol text,
  direction text,
  open_time text,
  close_time text,
  entry_price double precision,
  stop_loss double precision,
  take_profit double precision,
  risk_percent double precision,
  rr double precision,
  pnl double precision,
  notes text,
  screenshot_url text,
  screenshot_urls jsonb,
  tags text[],
  shared_at timestamptz,
  created_at timestamptz,
  author_username text,
  author_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    trade_row."ID"::text as trade_id,
    trade_row."Date"::text as trade_date,
    trade_row."Symbol" as symbol,
    trade_row."Bias" as direction,
    trade_row.open_time::text as open_time,
    trade_row.close_time::text as close_time,
    trade_row."Entry Price"::double precision as entry_price,
    trade_row."Stoploss"::double precision as stop_loss,
    trade_row."Take Profit"::double precision as take_profit,
    trade_row."Risk %"::double precision as risk_percent,
    trade_row."RrisktoRewardRatio"::double precision as rr,
    trade_row."PnL"::double precision as pnl,
    trade_row."Notes" as notes,
    trade_row."ScreenShotURL" as screenshot_url,
    coalesce(trade_row.screenshot_urls, '[]'::jsonb) as screenshot_urls,
    coalesce(trade_row.tags, array[]::text[]) as tags,
    trade_row.shared_at,
    trade_row.created_at,
    coalesce(nullif(profile_row.username, ''), 'one-journal-user') as author_username,
    nullif(profile_row.display_name, '') as author_display_name
  from public."Trades" trade_row
  left join public.profiles profile_row on profile_row.user_id = trade_row.user_id
  where trade_row.share_enabled is true
    and trade_row.share_token = trade_share_token
  limit 1;
$$;

create or replace function public.get_public_shared_analysis(analysis_share_token text)
returns table (
  analysis_date date,
  bias text,
  confluences text,
  market_context text,
  key_levels text,
  liquidity_notes text,
  entry_plan text,
  invalidation text,
  session text,
  symbol text,
  timeframe text,
  notes text,
  screenshot_url text,
  screenshot_urls jsonb,
  tags text[],
  share_updated_at timestamptz,
  created_at timestamptz,
  author_username text,
  author_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    analysis_row.analysis_date,
    analysis_row.bias,
    analysis_row.confluences,
    analysis_row.market_context,
    analysis_row.key_levels,
    analysis_row.liquidity_notes,
    analysis_row.entry_plan,
    analysis_row.invalidation,
    analysis_row.session,
    analysis_row.symbol,
    analysis_row.timeframe,
    analysis_row.notes,
    analysis_row.screenshot_url,
    coalesce(analysis_row.screenshot_urls, '[]'::jsonb) as screenshot_urls,
    coalesce(analysis_row.tags, array[]::text[]) as tags,
    analysis_row.share_updated_at,
    analysis_row.created_at,
    coalesce(nullif(profile_row.username, ''), 'one-journal-user') as author_username,
    nullif(profile_row.display_name, '') as author_display_name
  from public.analyses analysis_row
  left join public.profiles profile_row on profile_row.user_id = analysis_row.user_id
  where analysis_row.share_enabled is true
    and analysis_row.share_token = analysis_share_token
  limit 1;
$$;

revoke all on function public.get_public_shared_trade(text) from public;
grant execute on function public.get_public_shared_trade(text) to anon;
grant execute on function public.get_public_shared_trade(text) to authenticated;

revoke all on function public.get_public_shared_analysis(text) from public;
grant execute on function public.get_public_shared_analysis(text) to anon;
grant execute on function public.get_public_shared_analysis(text) to authenticated;

notify pgrst, 'reload schema';
