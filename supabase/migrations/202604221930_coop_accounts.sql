create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (
        username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'
        and username !~ '(\.\.|__|--)'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (display_name is null or char_length(display_name) <= 80);
  end if;
end $$;

create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, user_id)
);

create index if not exists account_members_account_id_idx
  on public.account_members (account_id);

create index if not exists account_members_user_id_idx
  on public.account_members (user_id);

create index if not exists account_members_role_idx
  on public.account_members (role);

insert into public.account_members (
  account_id,
  user_id,
  role,
  invited_by
)
select
  account_row.id,
  account_row.user_id,
  'owner',
  account_row.user_id
from public.accounts account_row
where account_row.user_id is not null
on conflict (account_id, user_id) do update
set
  role = 'owner',
  updated_at = now();

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists account_members_set_updated_at on public.account_members;
create trigger account_members_set_updated_at
  before update on public.account_members
  for each row execute function public.set_updated_at_timestamp();

create or replace function public.create_account_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    insert into public.account_members (
      account_id,
      user_id,
      role,
      invited_by
    )
    values (
      new.id,
      new.user_id,
      'owner',
      new.user_id
    )
    on conflict (account_id, user_id) do update
    set
      role = 'owner',
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_create_owner_member on public.accounts;
create trigger accounts_create_owner_member
  after insert on public.accounts
  for each row execute function public.create_account_owner_member();

create or replace function public.get_account_member_role(
  target_account_id uuid,
  target_user_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_account_id is null or target_user_id is null then null
    when exists (
      select 1
      from public.accounts account_row
      where account_row.id = target_account_id
        and account_row.user_id = target_user_id
    ) then 'owner'
    else (
      select member_row.role
      from public.account_members member_row
      where member_row.account_id = target_account_id
        and member_row.user_id = target_user_id
      limit 1
    )
  end;
$$;

create or replace function public.can_view_account(
  target_account_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_account_member_role(target_account_id, target_user_id)
    in ('owner', 'admin', 'member', 'viewer');
$$;

create or replace function public.can_manage_account(
  target_account_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_account_member_role(target_account_id, target_user_id)
    in ('owner', 'admin');
$$;

create or replace function public.can_manage_account_members(
  target_account_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_account_member_role(target_account_id, target_user_id)
    in ('owner', 'admin');
$$;

create or replace function public.can_write_account_journal(
  target_account_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_account_member_role(target_account_id, target_user_id)
    in ('owner', 'admin', 'member');
$$;

create or replace function public.can_edit_journal_entry(
  target_account_id uuid,
  entry_user_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.get_account_member_role(target_account_id, target_user_id)
      in ('owner', 'admin') then true
    when public.get_account_member_role(target_account_id, target_user_id) = 'member'
      and entry_user_id = target_user_id then true
    else false
  end;
$$;

create or replace function public.validate_account_member_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  owner_id uuid;
begin
  if tg_op = 'INSERT' then
    select account_row.user_id
      into owner_id
    from public.accounts account_row
    where account_row.id = new.account_id;

    actor_role := public.get_account_member_role(new.account_id, actor_id);

    if new.role = 'owner' then
      if new.user_id is distinct from owner_id then
        raise exception 'Only the account owner can have owner role.'
          using errcode = '42501';
      end if;

      return new;
    end if;

    if actor_role = 'owner' then
      return new;
    end if;

    if actor_role = 'admin' and new.role in ('member', 'viewer') then
      return new;
    end if;

    raise exception 'You do not have permission to add this Co-op member.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    actor_role := public.get_account_member_role(old.account_id, actor_id);

    if old.role = 'owner' or new.role = 'owner' then
      raise exception 'Owner role cannot be reassigned from Co-op.'
        using errcode = '42501';
    end if;

    if actor_role = 'owner' then
      return new;
    end if;

    if actor_role = 'admin'
       and old.role in ('member', 'viewer')
       and new.role in ('member', 'viewer') then
      return new;
    end if;

    raise exception 'You do not have permission to update this Co-op member.'
      using errcode = '42501';
  end if;

  return old;
end;
$$;

drop trigger if exists account_members_validate_write on public.account_members;
create trigger account_members_validate_write
  before insert or update on public.account_members
  for each row execute function public.validate_account_member_write();

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

create or replace function public.safe_trade_pnl_numeric(raw_value text)
returns numeric
language plpgsql
stable
as $$
begin
  if raw_value is null or btrim(raw_value) = '' then
    return null;
  end if;

  return raw_value::numeric;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    return null;
end;
$$;

create or replace function public.apply_account_current_equity_delta(
  target_account_id uuid,
  target_user_id uuid,
  equity_delta numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  affected_rows integer;
begin
  if target_account_id is null or equity_delta = 0 then
    return;
  end if;

  if not (
    public.can_write_account_journal(target_account_id, actor_id)
    or public.can_manage_account(target_account_id, actor_id)
    or public.can_write_account_journal(target_account_id, target_user_id)
  ) then
    raise exception 'Account equity sync failed for account %. The actor cannot write to this account.', target_account_id
      using errcode = '42501';
  end if;

  update public.accounts account_row
  set current_equity = coalesce(account_row.current_equity, account_row.initial_equity, 0) + equity_delta
  where account_row.id = target_account_id;

  get diagnostics affected_rows = row_count;

  if affected_rows = 0 then
    raise exception 'Account equity sync failed for account %. Account not found.', target_account_id
      using errcode = '23503';
  end if;
end;
$$;

create or replace function public.sync_account_current_equity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_owner_id uuid;
  new_owner_id uuid;
  old_account_id uuid;
  new_account_id uuid;
  old_pnl numeric := 0;
  new_pnl numeric := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_account_id := old.account_id;
    old_owner_id := old.user_id;
    old_pnl := coalesce(public.safe_trade_pnl_numeric(to_jsonb(old)->>'PnL'), 0);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    new_account_id := new.account_id;
    new_owner_id := new.user_id;
    new_pnl := coalesce(public.safe_trade_pnl_numeric(to_jsonb(new)->>'PnL'), 0);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new_account_id is not null then
    if not (
      public.can_write_account_journal(new_account_id, auth.uid())
      or public.can_write_account_journal(new_account_id, new_owner_id)
    ) then
      raise exception 'Trade account % is not writable for this user.', new_account_id
        using errcode = '42501';
    end if;
  end if;

  if tg_op = 'INSERT' then
    perform public.apply_account_current_equity_delta(
      new_account_id,
      new_owner_id,
      new_pnl
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.apply_account_current_equity_delta(
      old_account_id,
      old_owner_id,
      -old_pnl
    );
    return old;
  end if;

  if old_account_id is not distinct from new_account_id
     and old_owner_id is not distinct from new_owner_id then
    perform public.apply_account_current_equity_delta(
      new_account_id,
      new_owner_id,
      new_pnl - old_pnl
    );
  else
    perform public.apply_account_current_equity_delta(
      old_account_id,
      old_owner_id,
      -old_pnl
    );
    perform public.apply_account_current_equity_delta(
      new_account_id,
      new_owner_id,
      new_pnl
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trades_sync_account_current_equity on public."Trades";
drop trigger if exists trades_sync_account_current_equity_insert_delete on public."Trades";
drop trigger if exists trades_sync_account_current_equity_update on public."Trades";

create trigger trades_sync_account_current_equity_insert_delete
  after insert or delete on public."Trades"
  for each row execute function public.sync_account_current_equity();

create trigger trades_sync_account_current_equity_update
  after update of account_id, "PnL" on public."Trades"
  for each row execute function public.sync_account_current_equity();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public."Trades" enable row level security;
alter table public.analyses enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy profiles_delete_own
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Accounts are viewable by owner" on public.accounts;
drop policy if exists "Accounts are insertable by owner" on public.accounts;
drop policy if exists "Accounts are updatable by owner" on public.accounts;
drop policy if exists "Accounts are deletable by owner" on public.accounts;
drop policy if exists accounts_select_own on public.accounts;
drop policy if exists accounts_insert_own on public.accounts;
drop policy if exists accounts_update_own on public.accounts;
drop policy if exists accounts_delete_own on public.accounts;
drop policy if exists accounts_select_accessible on public.accounts;
drop policy if exists accounts_insert_owner on public.accounts;
drop policy if exists accounts_update_owner_admin on public.accounts;
drop policy if exists accounts_delete_owner on public.accounts;

create policy accounts_select_accessible
  on public.accounts
  for select
  to authenticated
  using (public.can_view_account(id, auth.uid()));

create policy accounts_insert_owner
  on public.accounts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy accounts_update_owner_admin
  on public.accounts
  for update
  to authenticated
  using (public.can_manage_account(id, auth.uid()))
  with check (public.can_manage_account(id, auth.uid()));

create policy accounts_delete_owner
  on public.accounts
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists account_members_select_accessible on public.account_members;
drop policy if exists account_members_insert_managers on public.account_members;
drop policy if exists account_members_update_managers on public.account_members;
drop policy if exists account_members_delete_managers_or_self on public.account_members;

create policy account_members_select_accessible
  on public.account_members
  for select
  to authenticated
  using (public.can_view_account(account_id, auth.uid()));

create policy account_members_insert_managers
  on public.account_members
  for insert
  to authenticated
  with check (
    role <> 'owner'
    and public.can_manage_account_members(account_id, auth.uid())
    and (
      public.get_account_member_role(account_id, auth.uid()) = 'owner'
      or (
        public.get_account_member_role(account_id, auth.uid()) = 'admin'
        and role in ('member', 'viewer')
      )
    )
  );

create policy account_members_update_managers
  on public.account_members
  for update
  to authenticated
  using (
    role <> 'owner'
    and public.can_manage_account_members(account_id, auth.uid())
    and (
      public.get_account_member_role(account_id, auth.uid()) = 'owner'
      or (
        public.get_account_member_role(account_id, auth.uid()) = 'admin'
        and role in ('member', 'viewer')
      )
    )
  )
  with check (
    role <> 'owner'
    and public.can_manage_account_members(account_id, auth.uid())
    and (
      public.get_account_member_role(account_id, auth.uid()) = 'owner'
      or (
        public.get_account_member_role(account_id, auth.uid()) = 'admin'
        and role in ('member', 'viewer')
      )
    )
  );

create policy account_members_delete_managers_or_self
  on public.account_members
  for delete
  to authenticated
  using (
    role <> 'owner'
    and (
      user_id = auth.uid()
      or (
        public.get_account_member_role(account_id, auth.uid()) = 'owner'
      )
      or (
        public.get_account_member_role(account_id, auth.uid()) = 'admin'
        and role in ('member', 'viewer')
      )
    )
  );

drop policy if exists trades_select_own on public."Trades";
drop policy if exists trades_insert_own on public."Trades";
drop policy if exists trades_update_own on public."Trades";
drop policy if exists trades_delete_own on public."Trades";
drop policy if exists "Users can view their own trades" on public."Trades";
drop policy if exists "Users can insert their own trades" on public."Trades";
drop policy if exists "Users can update their own trades" on public."Trades";
drop policy if exists "Users can delete their own trades" on public."Trades";
drop policy if exists trades_select_accessible_accounts on public."Trades";
drop policy if exists trades_insert_writable_accounts on public."Trades";
drop policy if exists trades_update_writable_accounts on public."Trades";
drop policy if exists trades_delete_writable_accounts on public."Trades";

create policy trades_select_accessible_accounts
  on public."Trades"
  for select
  to authenticated
  using (
    (
      account_id is not null
      and public.can_view_account(account_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  );

create policy trades_insert_writable_accounts
  on public."Trades"
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      account_id is null
      or public.can_write_account_journal(account_id, auth.uid())
    )
  );

create policy trades_update_writable_accounts
  on public."Trades"
  for update
  to authenticated
  using (
    (
      account_id is not null
      and public.can_edit_journal_entry(account_id, user_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  )
  with check (
    (
      account_id is not null
      and public.can_edit_journal_entry(account_id, user_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  );

create policy trades_delete_writable_accounts
  on public."Trades"
  for delete
  to authenticated
  using (
    (
      account_id is not null
      and public.can_edit_journal_entry(account_id, user_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  );

drop policy if exists analyses_select_own on public.analyses;
drop policy if exists analyses_insert_own on public.analyses;
drop policy if exists analyses_update_own on public.analyses;
drop policy if exists analyses_delete_own on public.analyses;
drop policy if exists "Users can view their own analyses" on public.analyses;
drop policy if exists "Users can insert their own analyses" on public.analyses;
drop policy if exists "Users can update their own analyses" on public.analyses;
drop policy if exists "Users can delete their own analyses" on public.analyses;
drop policy if exists analyses_select_accessible_accounts on public.analyses;
drop policy if exists analyses_insert_writable_accounts on public.analyses;
drop policy if exists analyses_update_writable_accounts on public.analyses;
drop policy if exists analyses_delete_writable_accounts on public.analyses;

create policy analyses_select_accessible_accounts
  on public.analyses
  for select
  to authenticated
  using (
    (
      account_id is not null
      and public.can_view_account(account_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  );

create policy analyses_insert_writable_accounts
  on public.analyses
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      account_id is null
      or public.can_write_account_journal(account_id, auth.uid())
    )
  );

create policy analyses_update_writable_accounts
  on public.analyses
  for update
  to authenticated
  using (
    (
      account_id is not null
      and public.can_edit_journal_entry(account_id, user_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  )
  with check (
    (
      account_id is not null
      and public.can_edit_journal_entry(account_id, user_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  );

create policy analyses_delete_writable_accounts
  on public.analyses
  for delete
  to authenticated
  using (
    (
      account_id is not null
      and public.can_edit_journal_entry(account_id, user_id, auth.uid())
    )
    or (
      account_id is null
      and user_id = auth.uid()
    )
  );

revoke all on function public.get_account_member_role(uuid, uuid) from public;
revoke all on function public.can_view_account(uuid, uuid) from public;
revoke all on function public.can_manage_account(uuid, uuid) from public;
revoke all on function public.can_manage_account_members(uuid, uuid) from public;
revoke all on function public.can_write_account_journal(uuid, uuid) from public;
revoke all on function public.can_edit_journal_entry(uuid, uuid, uuid) from public;
revoke all on function public.validate_account_member_write() from public;
revoke all on function public.create_account_owner_member() from public;
revoke all on function public.apply_account_current_equity_delta(uuid, uuid, numeric) from public;
revoke all on function public.sync_account_current_equity() from public;

grant execute on function public.get_accessible_accounts() to authenticated;

notify pgrst, 'reload schema';
