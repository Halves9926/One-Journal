create extension if not exists pgcrypto;

create table if not exists public."Accounts" (
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

alter table public."Accounts"
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

alter table public."Trades"
  add column if not exists account_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trades_account_id_fkey'
  ) then
    alter table public."Trades"
      add constraint trades_account_id_fkey
      foreign key (account_id) references public."Accounts" (id) on delete set null;
  end if;
end $$;

create unique index if not exists accounts_one_active_per_user_idx
  on public."Accounts" (user_id)
  where is_active;

create index if not exists accounts_user_id_idx
  on public."Accounts" (user_id);

create index if not exists trades_account_id_idx
  on public."Trades" (account_id);

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
    update public."Accounts" account_row
    set current_equity = coalesce(account_row.initial_equity, 0) + coalesce((
      select sum(coalesce(trade_row."PnL", 0))
      from public."Trades" trade_row
      where trade_row.account_id = previous_account_id
    ), 0)
    where account_row.id = previous_account_id;
  end if;

  if next_account_id is not null then
    update public."Accounts" account_row
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
      before update on public."Accounts"
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

insert into public."Accounts" (
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
  from public."Accounts" account_row
  where account_row.user_id = source.user_id
);

update public."Accounts"
set
  name = coalesce(nullif(name, ''), 'Primary Account'),
  type = coalesce(nullif(type, ''), 'Demo Account'),
  phase_start_equity = coalesce(phase_start_equity, initial_equity),
  phase_started_at = coalesce(phase_started_at, created_at, now()),
  current_equity = coalesce(current_equity, initial_equity),
  phase_status = case
    when is_funded then 'funded'
    when phase_status in ('active', 'passed', 'funded') then phase_status
    else 'active'
  end;

with default_accounts as (
  select distinct on (account_row.user_id)
    account_row.user_id,
    account_row.id
  from public."Accounts" account_row
  order by account_row.user_id, account_row.is_active desc, account_row.created_at asc
)
update public."Trades" trade_row
set account_id = default_accounts.id
from default_accounts
where trade_row.user_id = default_accounts.user_id
  and trade_row.account_id is null;

update public."Accounts" account_row
set
  is_active = default_selection.is_primary
from (
  select
    account_list.id,
    row_number() over (
      partition by account_list.user_id
      order by account_list.is_active desc, account_list.created_at asc
    ) = 1 as is_primary
  from public."Accounts" account_list
) as default_selection
where account_row.id = default_selection.id;

update public."Accounts" account_row
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

alter table public."Accounts" enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'Accounts'
      and policyname = 'Accounts are viewable by owner'
  ) then
    create policy "Accounts are viewable by owner"
      on public."Accounts"
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'Accounts'
      and policyname = 'Accounts are insertable by owner'
  ) then
    create policy "Accounts are insertable by owner"
      on public."Accounts"
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'Accounts'
      and policyname = 'Accounts are updatable by owner'
  ) then
    create policy "Accounts are updatable by owner"
      on public."Accounts"
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'Accounts'
      and policyname = 'Accounts are deletable by owner'
  ) then
    create policy "Accounts are deletable by owner"
      on public."Accounts"
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
