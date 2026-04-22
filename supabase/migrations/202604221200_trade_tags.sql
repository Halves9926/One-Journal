alter table public."Trades"
  add column if not exists tags text[] not null default array[]::text[];

update public."Trades"
set tags = array[]::text[]
where tags is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trades_tags_allowed'
      and conrelid = 'public."Trades"'::regclass
  ) then
    alter table public."Trades"
      add constraint trades_tags_allowed
      check (
        tags <@ array[
          'Missed',
          'Executed',
          'Late',
          'Early',
          'Emotional',
          'Followed Plan',
          'Broke Plan',
          'News',
          'Revenge',
          'High Quality',
          'Low Quality'
        ]::text[]
      );
  end if;
end $$;

create index if not exists trades_tags_idx
  on public."Trades" using gin (tags);

notify pgrst, 'reload schema';
