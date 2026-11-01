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

create function orbis_customer.admin_customer_observability(p_auth_user_id uuid,p_session_id uuid,p_after uuid default null,p_project text default null,p_customer uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 result jsonb;
 identity_key constant text := 'orbisIdentityId';
begin
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
   where s.id=p_session_id and s.user_id=p_auth_user_id and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now()) and (s.not_after is null or s.not_after>now())) then
  raise exception 'ADMIN_LIVE_SESSION_REQUIRED';
 end if;
 insert into orbis_customer.directory_audit(actor_auth_user_id,session_id) values(p_auth_user_id,p_session_id);
 with products as (
  select b.orbis_identity_id,b.project_id,b.environment from orbis_customer.product_bindings b where b.disabled_at is null
  union
  select r.orbis_identity_id,r.project_id,'reference' from orbis_identity.product_references r
   where r.revoked_at is null and (r.local_entity_type='user' or (r.project_id='orbis-khata' and r.local_entity_type='ledger-owner'))
 ), customers as (
  select u.id,a.orbis_identity_id,i.display_id,coalesce(p.name,i.display_name,'Orbis customer') as name,u.email,u.phone,
   case when u.banned_until>now() then 'blocked' else coalesce(i.lifecycle,'unlinked') end as status,
   u.created_at,u.last_sign_in_at,
   coalesce((select jsonb_agg(jsonb_build_object('projectId',v.project_id,'environment',v.environment) order by v.project_id,v.environment)
    from products v where v.orbis_identity_id=a.orbis_identity_id),'[]'::jsonb) as products
  from auth.users u left join orbis_customer.accounts a on a.auth_user_id=u.id
   left join orbis_identity.identities i on i.orbis_identity_id=a.orbis_identity_id
   left join orbis_customer.profiles p on p.orbis_identity_id=a.orbis_identity_id
  where u.deleted_at is null and (p_customer is null or u.id=p_customer)
   and (p_project is null or exists(select 1 from products v where v.orbis_identity_id=a.orbis_identity_id and v.project_id=p_project))
 ), page as (
  select * from customers where p_after is null or id>p_after order by id limit 51
 ), shown as (select * from page order by id limit 50), events as (
  select l.event_id as id,l.occurred_at as at,l.action,l.outcome,l.code,l.duration_ms,l.project_id,l.orbis_identity_id
  from orbis_customer.login_activity l where l.occurred_at>=now()-interval '24 hours'
 ), scoped_events as (
  select e.* from events e where (p_project is null or e.project_id=p_project)
   and (p_customer is null or exists(select 1 from orbis_customer.accounts a where a.auth_user_id=p_customer and a.orbis_identity_id=e.orbis_identity_id))
 ), ranked_events as (
  select e.*,row_number() over(partition by e.outcome order by e.at desc,e.id desc) as outcome_position from scoped_events e
 ), selected_events as (select * from ranked_events where outcome_position<=50
 )
 select jsonb_build_object('version','orbis.admin.customers.v1','checkedAt',now(),
  'total',(select count(*) from customers),'unlinked',(select count(*) from customers where orbis_identity_id is null),
  'customers',coalesce((select jsonb_agg(jsonb_build_object('authUserId',s.id,identity_key,s.orbis_identity_id,
   'displayId',s.display_id,'name',s.name,'email',s.email,'phone',nullif(s.phone,''),'status',s.status,
   'registeredAt',s.created_at,'lastSignInAt',s.last_sign_in_at,'products',s.products) order by s.id) from shown s),'[]'::jsonb),
  'nextCursor',case when (select count(*) from page)>50 then (select id from shown order by id desc limit 1) else null end,
  'loginTotals',jsonb_build_object('success',(select count(*) from scoped_events where action='login' and outcome='success'),'failure',(select count(*) from scoped_events where action='login' and outcome='failure')),
  'activity',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'at',e.at,'action',e.action,'outcome',e.outcome,'code',e.code,
   'projectId',e.project_id,identity_key,e.orbis_identity_id,'contactHint',null,'durationMs',e.duration_ms) order by e.at desc,e.id desc) from selected_events e),'[]'::jsonb)) into result;
 return result;
end;
$$;
create function public.orbis_admin_customer_observability(p_auth_user_id uuid,p_session_id uuid,p_after uuid default null,p_project text default null,p_customer uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select orbis_customer.admin_customer_observability(p_auth_user_id,p_session_id,p_after,p_project,p_customer);
$$;
revoke all on function orbis_customer.record_login_activity(jsonb),public.orbis_admin_record_login_activity(jsonb),orbis_customer.admin_customer_observability(uuid,uuid,uuid,text,uuid),public.orbis_admin_customer_observability(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
grant usage on schema orbis_customer to service_role;
grant execute on function orbis_customer.record_login_activity(jsonb),public.orbis_admin_record_login_activity(jsonb),orbis_customer.admin_customer_observability(uuid,uuid,uuid,text,uuid),public.orbis_admin_customer_observability(uuid,uuid,uuid,text,uuid) to service_role;
commit;
