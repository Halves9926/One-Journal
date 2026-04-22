create extension if not exists pgcrypto;

alter table public."Trades"
  add column if not exists share_enabled boolean not null default false,
  add column if not exists share_token text,
  add column if not exists shared_at timestamptz,
  add column if not exists tags text[] default array[]::text[];

update public."Trades"
set tags = array[]::text[]
where tags is null;

alter table public."Trades"
  alter column tags set default array[]::text[],
  alter column tags set not null;

create unique index if not exists trades_share_token_unique_idx
  on public."Trades" (share_token)
  where share_token is not null;

create index if not exists trades_public_share_idx
  on public."Trades" (share_token)
  where share_enabled is true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trades_share_token_format'
      and conrelid = 'public."Trades"'::regclass
  ) then
    alter table public."Trades"
      add constraint trades_share_token_format
      check (
        share_token is null
        or share_token ~ '^[A-Za-z0-9_-]{16,128}$'
      );
  end if;
end $$;

create or replace function public.set_trade_share_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.share_enabled is true then
      new.shared_at = coalesce(new.shared_at, now());
    end if;
    return new;
  end if;

  if (
    new.share_enabled is distinct from old.share_enabled
    or new.share_token is distinct from old.share_token
  ) then
    if new.share_enabled is true then
      new.shared_at = coalesce(new.shared_at, now());
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trades_set_share_timestamps'
  ) then
    create trigger trades_set_share_timestamps
      before insert or update on public."Trades"
      for each row execute function public.set_trade_share_timestamps();
  end if;
end $$;

create or replace function public.get_public_shared_trade(
  trade_share_token text
)
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
    coalesce(trade_row.tags, array[]::text[]) as tags,
    trade_row.shared_at,
    trade_row.created_at,
    coalesce(nullif(profile_row.username, ''), 'one-journal-user') as author_username,
    nullif(profile_row.display_name, '') as author_display_name
  from public."Trades" trade_row
  left join public.profiles profile_row
    on profile_row.user_id = trade_row.user_id
  where trade_row.share_enabled is true
    and trade_row.share_token = trade_share_token
  limit 1;
$$;

revoke all on function public.get_public_shared_trade(text) from public;
grant execute on function public.get_public_shared_trade(text) to anon;
grant execute on function public.get_public_shared_trade(text) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'journal-screenshots',
  'journal-screenshots',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists journal_screenshots_insert_own on storage.objects;
drop policy if exists journal_screenshots_select_own on storage.objects;
drop policy if exists journal_screenshots_update_own on storage.objects;
drop policy if exists journal_screenshots_delete_own on storage.objects;

do $$
declare
  owner_clause text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'objects'
      and column_name = 'owner_id'
  ) then
    owner_clause := 'owner_id = auth.uid()::text';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'objects'
      and column_name = 'owner'
  ) then
    owner_clause := 'owner = auth.uid()';
  else
    owner_clause := 'true';
  end if;

  execute format(
    'create policy journal_screenshots_insert_own on storage.objects for insert to authenticated with check (bucket_id = %L and %s)',
    'journal-screenshots',
    owner_clause
  );

  execute format(
    'create policy journal_screenshots_select_own on storage.objects for select to authenticated using (bucket_id = %L and %s)',
    'journal-screenshots',
    owner_clause
  );

  execute format(
    'create policy journal_screenshots_update_own on storage.objects for update to authenticated using (bucket_id = %L and %s) with check (bucket_id = %L and %s)',
    'journal-screenshots',
    owner_clause,
    'journal-screenshots',
    owner_clause
  );

  execute format(
    'create policy journal_screenshots_delete_own on storage.objects for delete to authenticated using (bucket_id = %L and %s)',
    'journal-screenshots',
    owner_clause
  );
end $$;

notify pgrst, 'reload schema';
