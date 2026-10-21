-- REVIEW CANDIDATE ONLY. Not applied; create a managed migration after validation.
-- Admin aqcwhqdzniruvoqwfsij only. Never run against product accounting databases.
begin;
create schema if not exists orbis_customer;
revoke all on schema orbis_customer from public, anon, authenticated;
create table orbis_customer.accounts (
 auth_user_id uuid primary key references auth.users(id) on delete restrict,
 orbis_identity_id uuid not null unique references orbis_identity.identities(orbis_identity_id) on delete restrict,
 created_at timestamptz not null default now()
);
alter table orbis_customer.accounts enable row level security;
alter table orbis_customer.accounts force row level security;
revoke all on orbis_customer.accounts from public,anon,authenticated,service_role;

create or replace function public.orbis_customer_bootstrap(p_auth_user_id uuid,p_session_id uuid,p_name text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 v_identity uuid;v_display text;v_email text;v_phone text;v_random text;v_name text;
begin
 -- Only the central Auth authority can provision a customer. Remote token checks
 -- happen in the Admin server before it calls this private service-only RPC.
 perform pg_advisory_xact_lock(hashtextextended('central-customer:'||p_auth_user_id::text,0));
 if not exists(select 1 from auth.sessions where id=p_session_id and user_id=p_auth_user_id
   and (not_after is null or not_after>now())) then raise exception 'CUSTOMER_LIVE_SESSION_REQUIRED';end if;
 select lower(email),regexp_replace(phone,'[^0-9]','','g') into v_email,v_phone from auth.users where id=p_auth_user_id and deleted_at is null;
 if not found then raise exception 'CUSTOMER_AUTH_USER_REQUIRED';end if;
 select a.orbis_identity_id,i.display_id into v_identity,v_display
 from orbis_customer.accounts a join orbis_identity.identities i using(orbis_identity_id)
 where a.auth_user_id=p_auth_user_id and i.subject_kind='person' and i.lifecycle in ('active','provisional');
 if found then return jsonb_build_object('orbisIdentityId',v_identity,'displayId',v_display);end if;
 if exists(select 1 from orbis_customer.accounts where auth_user_id=p_auth_user_id) then
  raise exception 'CUSTOMER_ACCOUNT_DISABLED';
 end if;
 -- Never auto-merge legacy identities by unverified email/phone. A proof-backed
 -- import/link must bind the old identity first, preserving its existing ID.
 if exists(select 1 from orbis_identity.identifiers where revoked_at is null and
    ((kind='email' and normalized_value=v_email) or
     (kind='phone' and regexp_replace(normalized_value,'[^0-9]','','g')=v_phone))) then
  raise exception 'CUSTOMER_LEGACY_LINK_REQUIRED';
 end if;
 v_random:=replace(gen_random_uuid()::text,'-','');
 v_identity:=(lpad(to_hex(floor(extract(epoch from clock_timestamp())*1000)::bigint),12,'0')||'7'||substr(v_random,1,3)||'8'||substr(v_random,5,15))::uuid;
 v_display:='ORB-U-'||translate(upper(substr(v_random,1,8)),'01','GH');
 v_name:=left(coalesce(nullif(btrim(p_name),''),'Orbis customer'),120);
 insert into orbis_identity.identities(orbis_identity_id,display_id,subject_kind,lifecycle,display_name)
 values(v_identity,v_display,'person','provisional',v_name);
 insert into orbis_customer.accounts(auth_user_id,orbis_identity_id) values(p_auth_user_id,v_identity);
 insert into orbis_identity.product_references(orbis_product_reference_id,orbis_identity_id,project_id,local_entity_type,local_entity_id,roles)
 values(gen_random_uuid(),v_identity,'orbis-admin','user',p_auth_user_id::text,array['customer']::text[]);
 return jsonb_build_object('orbisIdentityId',v_identity,'displayId',v_display);
end;
$$;
revoke all on function public.orbis_customer_bootstrap(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.orbis_customer_bootstrap(uuid,uuid,text) to service_role;
commit;

-- Additional REVIEW-ONLY product mapping. Existing IDs are operator-imported only
-- after proof-backed legacy reconciliation. No financial ownership ID is updated.
begin;
create table orbis_customer.product_bindings (
 orbis_identity_id uuid not null references orbis_identity.identities(orbis_identity_id) on delete restrict,
 project_id text not null check(project_id in ('orbis-foundation','orbis-maya','orbis-khata')),
 environment text not null check(environment in ('production','staging','development')),
 local_auth_user_id uuid not null,
 local_account_id uuid,
 disabled_at timestamptz,
 primary key(orbis_identity_id,project_id,environment),
 unique(project_id,environment,local_auth_user_id)
);
alter table orbis_customer.product_bindings enable row level security;
alter table orbis_customer.product_bindings force row level security;
revoke all on orbis_customer.product_bindings from public,anon,authenticated,service_role;
create or replace function public.orbis_customer_product_binding(
 p_auth_user_id uuid,p_session_id uuid,p_project_id text,p_environment text
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_result jsonb;
begin
 if not exists(select 1 from auth.sessions where id=p_session_id and user_id=p_auth_user_id
   and (not_after is null or not_after>now())) then raise exception 'CUSTOMER_LIVE_SESSION_REQUIRED';end if;
 select jsonb_build_object('projectId',b.project_id,'environment',b.environment,
  'orbisIdentityId',b.orbis_identity_id,'localAuthUserId',b.local_auth_user_id,'localAccountId',b.local_account_id)
 into v_result from orbis_customer.accounts a
 join orbis_identity.identities i using(orbis_identity_id)
 join orbis_customer.product_bindings b using(orbis_identity_id)
 where a.auth_user_id=p_auth_user_id and i.subject_kind='person' and i.lifecycle in ('active','provisional')
 and b.project_id=p_project_id and b.environment=p_environment and b.disabled_at is null;
 return v_result;
end;
$$;
revoke all on function public.orbis_customer_product_binding(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.orbis_customer_product_binding(uuid,uuid,text,text) to service_role;
commit;

-- REVIEW ONLY: common customer profile, owned by the Admin authority.
begin;
create table orbis_customer.profiles (
 orbis_identity_id uuid primary key references orbis_identity.identities(orbis_identity_id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 120),
 address text check(length(address)<=1000),
 alternate_phone text check(alternate_phone ~ '^\+[1-9][0-9]{7,14}$'),
 date_of_birth date check(date_of_birth >= date '1900-01-01'),
 gender text check(gender in ('male','female','other','prefer-not-to-say')),
 updated_at timestamptz not null default now()
);
alter table orbis_customer.profiles enable row level security;
alter table orbis_customer.profiles force row level security;
revoke all on orbis_customer.profiles from public,anon,authenticated,service_role;
create or replace function public.orbis_customer_profile(p_auth_user_id uuid,p_session_id uuid,p_patch jsonb default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_identity uuid;v_name text;v_result jsonb;
begin
 if not exists(select 1 from auth.sessions where id=p_session_id and user_id=p_auth_user_id and (not_after is null or not_after>now())) then raise exception 'CUSTOMER_LIVE_SESSION_REQUIRED';end if;
 select a.orbis_identity_id,i.display_name into v_identity,v_name from orbis_customer.accounts a join orbis_identity.identities i using(orbis_identity_id)
 where a.auth_user_id=p_auth_user_id and i.subject_kind='person' and i.lifecycle in ('active','provisional');
 if not found then raise exception 'CUSTOMER_ACCOUNT_REQUIRED';end if;
 if p_patch is not null then
  if jsonb_typeof(p_patch)<>'object' then raise exception 'CUSTOMER_PROFILE_INVALID';end if;
  if p_patch='{}'::jsonb or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('name','address','alternatePhone','dateOfBirth','gender')) then raise exception 'CUSTOMER_PROFILE_INVALID';end if;
  if exists(select 1 from jsonb_each(p_patch) e where jsonb_typeof(e.value) not in ('string','null')) then raise exception 'CUSTOMER_PROFILE_INVALID';end if;
  if p_patch ? 'name' and (p_patch->>'name' is null or length(btrim(p_patch->>'name')) not between 1 and 120) then raise exception 'CUSTOMER_PROFILE_INVALID';end if;
  if p_patch ? 'dateOfBirth' and p_patch->>'dateOfBirth' is not null and ((p_patch->>'dateOfBirth') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (p_patch->>'dateOfBirth')::date>current_date) then raise exception 'CUSTOMER_PROFILE_INVALID';end if;
 end if;
 insert into orbis_customer.profiles(orbis_identity_id,name) values(v_identity,left(coalesce(nullif(btrim(v_name),''),'Orbis customer'),120)) on conflict do nothing;
 if p_patch is not null then
  update orbis_customer.profiles set
   name=case when p_patch ? 'name' then btrim(p_patch->>'name') else name end,
   address=case when p_patch ? 'address' then nullif(btrim(p_patch->>'address'),'') else address end,
   alternate_phone=case when p_patch ? 'alternatePhone' then p_patch->>'alternatePhone' else alternate_phone end,
   date_of_birth=case when p_patch ? 'dateOfBirth' then (p_patch->>'dateOfBirth')::date else date_of_birth end,
   gender=case when p_patch ? 'gender' then p_patch->>'gender' else gender end, updated_at=now()
  where orbis_identity_id=v_identity;
  if p_patch ? 'name' then update orbis_identity.identities set display_name=btrim(p_patch->>'name') where orbis_identity_id=v_identity;end if;
 end if;
 select jsonb_build_object('name',name,'address',address,'alternatePhone',alternate_phone,'dateOfBirth',date_of_birth,'gender',gender) into v_result from orbis_customer.profiles where orbis_identity_id=v_identity;
 return v_result;
end;
$$;
revoke all on function public.orbis_customer_profile(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.orbis_customer_profile(uuid,uuid,jsonb) to service_role;
commit;

-- Owner-only directory: API verifies explicit immutable owner binding + capability.
begin;
create table orbis_customer.directory_audit (
 event_id uuid primary key default gen_random_uuid(),
 actor_auth_user_id uuid not null references auth.users(id),
 session_id uuid not null,
 occurred_at timestamptz not null default now()
);
alter table orbis_customer.directory_audit enable row level security;
alter table orbis_customer.directory_audit force row level security;
revoke all on orbis_customer.directory_audit from public,anon,authenticated,service_role;
create or replace function public.orbis_customer_directory(p_auth_user_id uuid,p_session_id uuid,p_after uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_result jsonb;
begin
 if not exists(select 1 from auth.sessions where id=p_session_id and user_id=p_auth_user_id and (not_after is null or not_after>now())) then raise exception 'OWNER_LIVE_SESSION_REQUIRED';end if;
 insert into orbis_customer.directory_audit(actor_auth_user_id,session_id) values(p_auth_user_id,p_session_id);
 select coalesce(jsonb_agg(row_data order by identity_id),'[]'::jsonb) into v_result from (
  select i.orbis_identity_id as identity_id,jsonb_build_object('orbisIdentityId',i.orbis_identity_id,'displayId',i.display_id,
   'name',coalesce(p.name,i.display_name),'email',u.email,'phone',u.phone) as row_data
  from orbis_customer.accounts a join orbis_identity.identities i using(orbis_identity_id)
  join auth.users u on u.id=a.auth_user_id left join orbis_customer.profiles p using(orbis_identity_id)
  where u.deleted_at is null and i.subject_kind='person' and (p_after is null or i.orbis_identity_id>p_after)
  order by i.orbis_identity_id limit 51
 ) page;
 return v_result;
end;
$$;
revoke all on function public.orbis_customer_directory(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.orbis_customer_directory(uuid,uuid,uuid) to service_role;
commit;
