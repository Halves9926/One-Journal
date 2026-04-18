create extension if not exists pgcrypto;

alter table public."Trades"
  add column if not exists open_time time,
  add column if not exists close_time time;

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  analysis_date date not null default current_date,
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.analyses
  add column if not exists user_id uuid,
  add column if not exists account_id uuid,
  add column if not exists analysis_date date not null default current_date,
  add column if not exists bias text,
  add column if not exists confluences text,
  add column if not exists market_context text,
  add column if not exists key_levels text,
  add column if not exists liquidity_notes text,
  add column if not exists entry_plan text,
  add column if not exists invalidation text,
  add column if not exists session text,
  add column if not exists symbol text,
  add column if not exists timeframe text,
  add column if not exists notes text,
  add column if not exists screenshot_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analyses_user_id_fkey'
      and conrelid = 'public.analyses'::regclass
  ) then
    alter table public.analyses
      add constraint analyses_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analyses_account_id_fkey'
      and conrelid = 'public.analyses'::regclass
  ) then
    alter table public.analyses
      add constraint analyses_account_id_fkey
      foreign key (account_id) references public.accounts (id) on delete cascade;
  end if;
end $$;

create index if not exists analyses_user_id_idx
  on public.analyses (user_id);

create index if not exists analyses_account_id_idx
  on public.analyses (account_id);

create index if not exists analyses_account_date_idx
  on public.analyses (account_id, analysis_date desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'analyses_set_updated_at'
  ) then
    create trigger analyses_set_updated_at
      before update on public.analyses
      for each row execute function public.set_updated_at_timestamp();
  end if;
end $$;

alter table public.analyses enable row level security;

drop policy if exists analyses_select_own on public.analyses;
drop policy if exists analyses_insert_own on public.analyses;
drop policy if exists analyses_update_own on public.analyses;
drop policy if exists analyses_delete_own on public.analyses;

create policy analyses_select_own
  on public.analyses
  for select
  using (auth.uid() = user_id);

create policy analyses_insert_own
  on public.analyses
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.accounts account_row
      where account_row.id = account_id
        and account_row.user_id = auth.uid()
    )
  );

create policy analyses_update_own
  on public.analyses
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.accounts account_row
      where account_row.id = account_id
        and account_row.user_id = auth.uid()
    )
  );

create policy analyses_delete_own
  on public.analyses
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
