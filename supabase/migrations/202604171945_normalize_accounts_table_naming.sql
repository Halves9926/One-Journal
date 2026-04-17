create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.accounts') is null
     and to_regclass('public."Accounts"') is not null then
    alter table public."Accounts" rename to accounts;
  end if;
end $$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (
    type in (
      'Demo Account',
      'Propfirm Account',
      'Live Account',
      'Backtest Account'
    )
  ),
  initial_equity numeric(18, 2) not null default 0,
  current_equity numeric(18, 2) not null default 0,
  is_active boolean not null default false,
  phases_enabled boolean not null default false,
  phase_count integer not null default 1 check (phase_count >= 1 and phase_count <= 10),
  current_phase integer not null default 1 check (current_phase >= 1 and current_phase <= 10),
  passed_phase_count integer not null default 0 check (passed_phase_count >= 0 and passed_phase_count <= 10),
  phase_status text not null default 'active' check (
    phase_status in ('active', 'passed', 'funded')
  ),
  phase_start_equity numeric(18, 2),
  phase_started_at timestamptz not null default now(),
  is_funded boolean not null default false,
  max_drawdown numeric(18, 2),
  daily_drawdown_max numeric(18, 2),
  prop_target numeric(18, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts
  add column if not exists user_id uuid,
  add column if not exists name text,
  add column if not exists type text,
  add column if not exists initial_equity numeric(18, 2) not null default 0,
  add column if not exists current_equity numeric(18, 2) not null default 0,
  add column if not exists is_active boolean not null default false,
  add column if not exists phases_enabled boolean not null default false,
  add column if not exists phase_count integer not null default 1,
  add column if not exists current_phase integer not null default 1,
  add column if not exists passed_phase_count integer not null default 0,
  add column if not exists phase_status text not null default 'active',
  add column if not exists phase_start_equity numeric(18, 2),
  add column if not exists phase_started_at timestamptz not null default now(),
  add column if not exists is_funded boolean not null default false,
  add column if not exists max_drawdown numeric(18, 2),
  add column if not exists daily_drawdown_max numeric(18, 2),
  add column if not exists prop_target numeric(18, 2),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_user_id_fkey'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end $$;

do $$
begin
  if to_regclass('public."Accounts"') is not null
     and to_regclass('public.accounts') is not null
     and to_regclass('public."Accounts"')::text <> to_regclass('public.accounts')::text then
    insert into public.accounts (
      id,
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
      created_at,
      updated_at
    )
    select
      legacy.id,
      legacy.user_id,
      legacy.name,
      legacy.type,
      legacy.initial_equity,
      legacy.current_equity,
      legacy.is_active,
      legacy.phases_enabled,
      legacy.phase_count,
      legacy.current_phase,
      legacy.passed_phase_count,
      legacy.phase_status,
      legacy.phase_start_equity,
      legacy.phase_started_at,
      legacy.is_funded,
      legacy.max_drawdown,
      legacy.daily_drawdown_max,
      legacy.prop_target,
      legacy.created_at,
      legacy.updated_at
    from public."Accounts" legacy
    on conflict (id) do update
    set
      user_id = excluded.user_id,
      name = excluded.name,
      type = excluded.type,
      initial_equity = excluded.initial_equity,
      current_equity = excluded.current_equity,
      is_active = excluded.is_active,
      phases_enabled = excluded.phases_enabled,
      phase_count = excluded.phase_count,
      current_phase = excluded.current_phase,
      passed_phase_count = excluded.passed_phase_count,
      phase_status = excluded.phase_status,
      phase_start_equity = excluded.phase_start_equity,
      phase_started_at = excluded.phase_started_at,
      is_funded = excluded.is_funded,
      max_drawdown = excluded.max_drawdown,
      daily_drawdown_max = excluded.daily_drawdown_max,
      prop_target = excluded.prop_target,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;
  end if;
end $$;

alter table public."Trades"
  add column if not exists account_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.accounts
set
  name = coalesce(nullif(name, ''), 'Primary Account'),
  type = coalesce(nullif(type, ''), 'Demo Account'),
  initial_equity = coalesce(initial_equity, 0),
  current_equity = coalesce(current_equity, initial_equity, 0),
  phase_start_equity = coalesce(phase_start_equity, initial_equity, 0),
  phase_started_at = coalesce(phase_started_at, created_at, now()),
  phase_status = case
    when is_funded then 'funded'
    when phase_status in ('active', 'passed', 'funded') then phase_status
    else 'active'
  end;

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
  phase_started_at
)
select
  source.user_id,
  'Primary Account',
  'Demo Account',
  0,
  0,
  true,
  false,
  1,
  1,
  0,
  'active',
  0,
  now()
from (
  select distinct user_id
  from public."Trades"
  where user_id is not null
) source
where not exists (
  select 1
  from public.accounts account_row
  where account_row.user_id = source.user_id
);

with default_accounts as (
  select distinct on (account_row.user_id)
    account_row.user_id,
    account_row.id
  from public.accounts account_row
  order by account_row.user_id, account_row.is_active desc, account_row.created_at asc
)
update public."Trades" trade_row
set account_id = default_accounts.id
from default_accounts
where trade_row.user_id = default_accounts.user_id
  and trade_row.account_id is null;

update public."Trades" trade_row
set account_id = null
where trade_row.account_id is not null
  and not exists (
    select 1
    from public.accounts account_row
    where account_row.id = trade_row.account_id
  );

update public.accounts account_row
set
  is_active = default_selection.is_primary
from (
  select
    account_list.id,
    row_number() over (
      partition by account_list.user_id
      order by account_list.is_active desc, account_list.created_at asc
    ) = 1 as is_primary
  from public.accounts account_list
) as default_selection
where account_row.id = default_selection.id;

create unique index if not exists accounts_one_active_per_user_idx
  on public.accounts (user_id)
  where is_active;

create index if not exists accounts_user_id_idx
  on public.accounts (user_id);

create index if not exists trades_account_id_idx
  on public."Trades" (account_id);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'trades_account_id_fkey'
      and conrelid = 'public."Trades"'::regclass
  ) then
    alter table public."Trades"
      drop constraint trades_account_id_fkey;
  end if;
end $$;

alter table public."Trades"
  add constraint trades_account_id_fkey
  foreign key (account_id) references public.accounts (id) on delete set null;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_account_current_equity()
returns trigger
language plpgsql
as $$
declare
  next_account_id uuid;
  previous_account_id uuid;
begin
  next_account_id := case
    when tg_op in ('INSERT', 'UPDATE') then new.account_id
    else null
  end;

  previous_account_id := case
    when tg_op in ('UPDATE', 'DELETE') then old.account_id
    else null
  end;

  if previous_account_id is not null then
    update public.accounts account_row
    set current_equity = coalesce(account_row.initial_equity, 0) + coalesce((
      select sum(coalesce(trade_row."PnL", 0))
      from public."Trades" trade_row
      where trade_row.account_id = previous_account_id
    ), 0)
    where account_row.id = previous_account_id;
  end if;

  if next_account_id is not null then
    update public.accounts account_row
    set current_equity = coalesce(account_row.initial_equity, 0) + coalesce((
      select sum(coalesce(trade_row."PnL", 0))
      from public."Trades" trade_row
      where trade_row.account_id = next_account_id
    ), 0)
    where account_row.id = next_account_id;
  end if;

  return coalesce(new, old);
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'accounts_set_updated_at'
  ) then
    create trigger accounts_set_updated_at
      before update on public.accounts
      for each row execute function public.set_updated_at_timestamp();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trades_set_updated_at'
  ) then
    create trigger trades_set_updated_at
      before update on public."Trades"
      for each row execute function public.set_updated_at_timestamp();
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trades_sync_account_current_equity'
  ) then
    create trigger trades_sync_account_current_equity
      after insert or update or delete on public."Trades"
      for each row execute function public.sync_account_current_equity();
  end if;
end $$;

update public.accounts account_row
set current_equity = coalesce(account_row.initial_equity, 0) + coalesce(account_totals.net_pnl, 0)
from (
  select
    trade_row.account_id,
    sum(coalesce(trade_row."PnL", 0)) as net_pnl
  from public."Trades" trade_row
  where trade_row.account_id is not null
  group by trade_row.account_id
) as account_totals
where account_row.id = account_totals.account_id;

alter table public.accounts enable row level security;

drop policy if exists "Accounts are viewable by owner" on public.accounts;
drop policy if exists "Accounts are insertable by owner" on public.accounts;
drop policy if exists "Accounts are updatable by owner" on public.accounts;
drop policy if exists "Accounts are deletable by owner" on public.accounts;
drop policy if exists accounts_select_own on public.accounts;
drop policy if exists accounts_insert_own on public.accounts;
drop policy if exists accounts_update_own on public.accounts;
drop policy if exists accounts_delete_own on public.accounts;

create policy accounts_select_own
  on public.accounts
  for select
  using (auth.uid() = user_id);

create policy accounts_insert_own
  on public.accounts
  for insert
  with check (auth.uid() = user_id);

create policy accounts_update_own
  on public.accounts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy accounts_delete_own
  on public.accounts
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
