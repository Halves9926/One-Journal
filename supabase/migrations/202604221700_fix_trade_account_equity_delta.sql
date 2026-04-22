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
  affected_rows integer;
begin
  if target_account_id is null or equity_delta = 0 then
    return;
  end if;

  update public.accounts account_row
  set current_equity = coalesce(account_row.current_equity, account_row.initial_equity, 0) + equity_delta
  where account_row.id = target_account_id
    and account_row.user_id = target_user_id;

  get diagnostics affected_rows = row_count;

  if affected_rows = 0 then
    raise exception 'Account equity sync failed for account %. The account does not belong to the trade owner.', target_account_id
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
    perform 1
    from public.accounts account_row
    where account_row.id = new_account_id
      and account_row.user_id = new_owner_id;

    if not found then
      raise exception 'Trade account % does not belong to the trade owner.', new_account_id
        using errcode = '23503';
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

revoke all on function public.safe_trade_pnl_numeric(text) from public;
revoke all on function public.apply_account_current_equity_delta(uuid, uuid, numeric) from public;
revoke all on function public.sync_account_current_equity() from public;

notify pgrst, 'reload schema';
