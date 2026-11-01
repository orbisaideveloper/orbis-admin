-- Prepared release for Admin project aqcwhqdzniruvoqwfsij ONLY.
-- Apply once through managed migration workflow after review; never to Khata.
begin;
create table orbis_customer.login_activity (
 event_id uuid primary key,
 occurred_at timestamptz not null default now(),
 action text not null check(action in ('login','signup')),
 outcome text not null check(outcome in ('success','failure')),
 code text not null check(length(code) between 1 and 80),
 duration_ms integer not null check(duration_ms between 0 and 3600000),
 project_id text,
 orbis_identity_id uuid
);
create index login_activity_time_idx on orbis_customer.login_activity(occurred_at desc);
create index login_activity_identity_time_idx on orbis_customer.login_activity(orbis_identity_id,occurred_at desc);
alter table orbis_customer.login_activity enable row level security;
alter table orbis_customer.login_activity force row level security;
revoke all on orbis_customer.login_activity from public,anon,authenticated,service_role;

create function orbis_customer.record_login_activity(p_event jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare
 event_action text := p_event->>'action';
 event_outcome text := p_event->>'outcome';
begin
 if event_action not in ('login','signup') or event_outcome not in ('success','failure') then
  raise exception 'INVALID_LOGIN_ACTIVITY';
 end if;
 insert into orbis_customer.login_activity(event_id,action,outcome,code,duration_ms,project_id,orbis_identity_id)
 values((p_event->>'id')::uuid,event_action,event_outcome,p_event->>'code',(p_event->>'durationMs')::integer,
  case p_event->>'origin' when 'https://orbis-khata.onrender.com' then 'orbis-khata'
   when 'https://orbis-maya-development.onrender.com' then 'orbis-maya' else null end,
  (p_event->>'orbisIdentityId')::uuid)
 on conflict(event_id) do nothing;
 -- Bounded opportunistic cleanup; an idle deployment may retain older rows until the next event.
 delete from orbis_customer.login_activity where event_id in (select event_id from orbis_customer.login_activity where occurred_at<now()-interval '30 days' order by occurred_at limit 1000);
end;
$$;
create function public.orbis_admin_record_login_activity(p_event jsonb) returns void
language sql security invoker set search_path='' as $$ select orbis_customer.record_login_activity(p_event); $$;

revoke all on function orbis_customer.record_login_activity(jsonb),public.orbis_admin_record_login_activity(jsonb) from public,anon,authenticated;
grant usage on schema orbis_customer to service_role;
grant execute on function orbis_customer.record_login_activity(jsonb),public.orbis_admin_record_login_activity(jsonb) to service_role;
commit;
