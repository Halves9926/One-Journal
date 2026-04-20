create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'
    and username !~ '(\\.\\.|__|--)'
  ),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) <= 80
  )
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username));

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'profiles_set_updated_at'
  ) then
    create trigger profiles_set_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at_timestamp();
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy profiles_insert_own
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy profiles_update_own
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy profiles_delete_own
  on public.profiles
  for delete
  using (auth.uid() = user_id);

alter table public.analyses
  add column if not exists share_enabled boolean not null default false,
  add column if not exists share_token text,
  add column if not exists share_created_at timestamptz,
  add column if not exists share_updated_at timestamptz,
  add column if not exists tags text[] not null default array[]::text[];

update public.analyses
set tags = array[]::text[]
where tags is null;

create unique index if not exists analyses_share_token_unique_idx
  on public.analyses (share_token)
  where share_token is not null;

create index if not exists analyses_public_share_idx
  on public.analyses (share_token)
  where share_enabled is true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analyses_share_token_format'
      and conrelid = 'public.analyses'::regclass
  ) then
    alter table public.analyses
      add constraint analyses_share_token_format
      check (
        share_token is null
        or share_token ~ '^[A-Za-z0-9_-]{16,128}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'analyses_tags_allowed'
      and conrelid = 'public.analyses'::regclass
  ) then
    alter table public.analyses
      add constraint analyses_tags_allowed
      check (
        tags <@ array[
          'respected',
          'not respected',
          'partially respected',
          'invalidated',
          'followed plan',
          'broke plan',
          'missed setup',
          'late entry',
          'emotional trade'
        ]::text[]
      );
  end if;
end $$;

create or replace function public.set_analysis_share_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.share_enabled is true then
      new.share_created_at = coalesce(new.share_created_at, now());
      new.share_updated_at = coalesce(new.share_updated_at, now());
    end if;
    return new;
  end if;

  if (
    new.share_enabled is distinct from old.share_enabled
    or new.share_token is distinct from old.share_token
  ) then
    new.share_updated_at = now();

    if new.share_enabled is true then
      new.share_created_at = coalesce(new.share_created_at, now());
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'analyses_set_share_timestamps'
  ) then
    create trigger analyses_set_share_timestamps
      before insert or update on public.analyses
      for each row execute function public.set_analysis_share_timestamps();
  end if;
end $$;

create or replace function public.get_public_shared_analysis(
  analysis_share_token text
)
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
    coalesce(analysis_row.tags, array[]::text[]) as tags,
    analysis_row.share_updated_at,
    analysis_row.created_at,
    coalesce(nullif(profile_row.username, ''), 'one-journal-user') as author_username,
    nullif(profile_row.display_name, '') as author_display_name
  from public.analyses analysis_row
  left join public.profiles profile_row
    on profile_row.user_id = analysis_row.user_id
  where analysis_row.share_enabled is true
    and analysis_row.share_token = analysis_share_token
  limit 1;
$$;

revoke all on function public.get_public_shared_analysis(text) from public;
grant execute on function public.get_public_shared_analysis(text) to anon;
grant execute on function public.get_public_shared_analysis(text) to authenticated;

notify pgrst, 'reload schema';
