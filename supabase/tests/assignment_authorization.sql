-- Hosted regression: real database roles and JWT claims, no real user impersonation.
-- All calls are rolled back, including an unexpected regression that writes data.
begin;
set local statement_timeout = '10s';
do $$ begin
  if exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001') then
    raise exception 'Reserved fixture subject unexpectedly exists';
  end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  begin
    perform public.assign_agent('00000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: missing-profile caller entered assign_agent';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reassign_agent('00000000-0000-4000-8000-000000000002', 'authorization-regression-fixture');
    raise exception 'FAIL: missing-profile caller entered reassign_agent';
  exception when insufficient_privilege then null;
  end;
end $$;
-- A role alone must not authorize a subjectless authenticated request.
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
do $$ begin
  begin
    perform public.assign_agent('00000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: subjectless caller entered assign_agent';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reassign_agent('00000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: subjectless caller entered reassign_agent';
  exception when insufficient_privilege then null;
  end;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin
    perform public.assign_agent('00000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: anonymous caller entered assign_agent';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reassign_agent('00000000-0000-4000-8000-000000000002');
    raise exception 'FAIL: anonymous caller entered reassign_agent';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
