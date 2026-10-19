-- Separate Fitness data; existing Trecker tables and authentication settings are untouched.
create table public.fitness_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload)='object' and payload->>'version'='1' and octet_length(payload::text)<=8388608),
  revision bigint not null default 1 check (revision>0),
  updated_at timestamptz not null default now()
);
alter table public.fitness_sync_state enable row level security;
revoke all on public.fitness_sync_state from anon;
grant select,insert,update on public.fitness_sync_state to authenticated;
create policy fitness_owner_select on public.fitness_sync_state for select to authenticated using ((select auth.uid())=user_id);
create policy fitness_owner_insert on public.fitness_sync_state for insert to authenticated with check ((select auth.uid())=user_id);
create policy fitness_owner_update on public.fitness_sync_state for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create function public.fitness_write_state(p_payload jsonb,p_expected bigint)
returns public.fitness_sync_state
language plpgsql security invoker set search_path=''
as $$
declare saved public.fitness_sync_state;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_expected=0 then
    insert into public.fitness_sync_state(user_id,payload) values(auth.uid(),p_payload)
    on conflict(user_id) do nothing returning * into saved;
  else
    update public.fitness_sync_state set payload=p_payload,revision=revision+1,updated_at=now()
    where user_id=auth.uid() and revision=p_expected returning * into saved;
  end if;
  if saved.user_id is null then raise exception 'Cloud state changed on another device' using errcode='40001'; end if;
  return saved;
end;
$$;
revoke all on function public.fitness_write_state(jsonb,bigint) from public,anon;
grant execute on function public.fitness_write_state(jsonb,bigint) to authenticated;
