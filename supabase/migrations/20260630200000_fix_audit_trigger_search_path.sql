-- Fix audit_trigger search_path: SECURITY DEFINER RPCs (match_providers, next_ref)
-- run with search_path='' so unqualified audit_logs fails on quote INSERT.
-- Idempotent.

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  begin
    v_actor := auth.uid();
  exception
    when others then v_actor := null;
  end;

  if tg_op = 'DELETE' then
    insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (v_actor, 'DELETE', tg_table_name, (old.id)::text, to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (v_actor, 'UPDATE', tg_table_name, (new.id)::text, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
    values (v_actor, 'INSERT', tg_table_name, (new.id)::text, null, to_jsonb(new));
    return new;
  end if;
end;
$$;
