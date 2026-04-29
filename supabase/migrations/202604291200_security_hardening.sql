create or replace function public.profile_is_visible_to_user(
  target_user_id uuid,
  viewer_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when target_user_id is null or viewer_user_id is null then false
    when target_user_id = viewer_user_id then true
    when exists (
      select 1
      from public.account_members viewer_member
      join public.account_members target_member
        on target_member.account_id = viewer_member.account_id
      where viewer_member.user_id = viewer_user_id
        and target_member.user_id = target_user_id
    ) then true
    else false
  end;
$$;

create or replace function public.find_profile_by_username(target_username text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile_row.user_id,
    profile_row.username,
    profile_row.display_name,
    profile_row.created_at,
    profile_row.updated_at
  from public.profiles profile_row
  where auth.uid() is not null
    and lower(profile_row.username) = lower(btrim(target_username))
  limit 1;
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_visible on public.profiles;

create policy profiles_select_visible
  on public.profiles
  for select
  to authenticated
  using (public.profile_is_visible_to_user(user_id, auth.uid()));

revoke all on function public.profile_is_visible_to_user(uuid, uuid) from public;
revoke all on function public.find_profile_by_username(text) from public;
grant execute on function public.find_profile_by_username(text) to authenticated;

create or replace function public.prevent_account_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Account owner cannot be changed.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_prevent_owner_change on public.accounts;
create trigger accounts_prevent_owner_change
  before update on public.accounts
  for each row execute function public.prevent_account_owner_change();

revoke all on function public.prevent_account_owner_change() from public;

update storage.buckets
set public = false
where id = 'journal-screenshots';

create or replace function public.storage_url_matches_object(
  candidate_url text,
  target_bucket_id text,
  target_object_name text
)
returns boolean
language sql
immutable
as $$
  select candidate_url is not null
    and (
      candidate_url = target_object_name
      or candidate_url like ('%/' || target_bucket_id || '/' || target_object_name)
      or candidate_url like ('%/' || target_bucket_id || '/' || target_object_name || '?%')
    );
$$;

create or replace function public.storage_object_is_attached_to_accessible_journal(
  target_bucket_id text,
  target_object_name text,
  viewer_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_bucket_id = 'journal-screenshots'
    and (
      exists (
        select 1
        from public."Trades" trade_row
        where (
          (viewer_user_id is not null and (
            (
              trade_row.account_id is not null
              and public.can_view_account(trade_row.account_id, viewer_user_id)
            )
            or (
              trade_row.account_id is null
              and trade_row.user_id = viewer_user_id
            )
          ))
          or trade_row.share_enabled is true
        )
        and (
          public.storage_url_matches_object(trade_row."ScreenShotURL", target_bucket_id, target_object_name)
          or exists (
            select 1
            from jsonb_array_elements_text(coalesce(trade_row.screenshot_urls, '[]'::jsonb)) screenshot_url(value)
            where public.storage_url_matches_object(screenshot_url.value, target_bucket_id, target_object_name)
          )
        )
      )
      or exists (
        select 1
        from public.analyses analysis_row
        where (
          (viewer_user_id is not null and (
            (
              analysis_row.account_id is not null
              and public.can_view_account(analysis_row.account_id, viewer_user_id)
            )
            or (
              analysis_row.account_id is null
              and analysis_row.user_id = viewer_user_id
            )
          ))
          or analysis_row.share_enabled is true
        )
        and (
          public.storage_url_matches_object(analysis_row.screenshot_url, target_bucket_id, target_object_name)
          or exists (
            select 1
            from jsonb_array_elements_text(coalesce(analysis_row.screenshot_urls, '[]'::jsonb)) screenshot_url(value)
            where public.storage_url_matches_object(screenshot_url.value, target_bucket_id, target_object_name)
          )
        )
      )
    );
$$;

drop policy if exists journal_screenshots_insert_own on storage.objects;
drop policy if exists journal_screenshots_select_own on storage.objects;
drop policy if exists journal_screenshots_select_accessible on storage.objects;
drop policy if exists journal_screenshots_update_own on storage.objects;
drop policy if exists journal_screenshots_delete_own on storage.objects;

create policy journal_screenshots_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'journal-screenshots'
    and owner_id = auth.uid()::text
  );

create policy journal_screenshots_select_accessible
  on storage.objects
  for select
  to authenticated, anon
  using (
    bucket_id = 'journal-screenshots'
    and (
      owner_id = auth.uid()::text
      or public.storage_object_is_attached_to_accessible_journal(bucket_id, name, auth.uid())
    )
  );

create policy journal_screenshots_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'journal-screenshots'
    and owner_id = auth.uid()::text
  )
  with check (
    bucket_id = 'journal-screenshots'
    and owner_id = auth.uid()::text
  );

create policy journal_screenshots_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'journal-screenshots'
    and owner_id = auth.uid()::text
  );

revoke all on function public.storage_url_matches_object(text, text, text) from public;
revoke all on function public.storage_object_is_attached_to_accessible_journal(text, text, uuid) from public;

notify pgrst, 'reload schema';
