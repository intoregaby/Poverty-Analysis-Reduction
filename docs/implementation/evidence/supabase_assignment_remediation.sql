-- Fail closed for missing profiles and subjectless callers. Service-role automation is explicit.
create or replace function public.assign_agent(p_member uuid)
returns uuid language plpgsql security definer set search_path = ''
as $function$
begin
  if current_setting('role', true) is distinct from 'service_role'
     and not coalesce(auth.uid() is not null and ((select private.is_admin())
                         or (select private.my_role()) = 'programme_owner'), false) then
    raise insufficient_privilege using message = 'Not allowed';
  end if;
  return private.assign_agent_core(p_member, null, 'auto_assigned');
end
$function$;

create or replace function public.reassign_agent(p_agent uuid, p_reason text default 'agent_unavailable')
returns integer language plpgsql security definer set search_path = ''
as $function$
declare r record; n int := 0;
begin
  if current_setting('role', true) is distinct from 'service_role'
     and not coalesce(auth.uid() is not null and ((select private.is_admin())
                         or (select private.my_role()) = 'programme_owner'), false) then
    raise insufficient_privilege using message = 'Not allowed';
  end if;
  update public.agents set status = 'On leave' where id = p_agent;
  for r in select member_id from public.agent_assignments where agent_id = p_agent and is_current loop
    perform private.assign_agent_core(r.member_id, p_agent, p_reason);
    n := n + 1;
  end loop;
  insert into public.admin_audit_log (actor, action, target, detail)
    values (auth.uid(), 'agent.reassign', p_agent::text, jsonb_build_object('moved', n, 'reason', p_reason));
  return n;
end
$function$;

-- Preserve existing signed-in RPC clients and trusted worker access.
revoke execute on function public.assign_agent(uuid) from public, anon;
revoke execute on function public.reassign_agent(uuid,text) from public, anon;
grant execute on function public.assign_agent(uuid) to authenticated, service_role;
grant execute on function public.reassign_agent(uuid,text) to authenticated, service_role;
