-- Managed migration applied to Admin on 2026-10-16; provider-assigned version 20261016154208.
-- Additive account-owned birth profiles: five explicit slots; no chat/ledger data.
-- The API verifies the central token before passing its sub/session_id here.
create table orbis_customer.maya_birth_profiles (
 orbis_identity_id uuid primary key references orbis_identity.identities(orbis_identity_id),
 revision integer not null default 0 check(revision between 0 and 1000000001),
 profiles jsonb not null default '[]'::jsonb check(jsonb_typeof(profiles)='array' and jsonb_array_length(profiles)<=5),
 updated_at timestamptz not null default now()
);
alter table orbis_customer.maya_birth_profiles enable row level security;
alter table orbis_customer.maya_birth_profiles force row level security;
revoke all on orbis_customer.maya_birth_profiles from public,anon,authenticated,service_role;

create function orbis_customer.validate_maya_birth_entry(p_entry jsonb)
returns void language plpgsql security invoker set search_path=pg_catalog as $$
declare v_profile jsonb;v_location jsonb;v_key text;v_text text;
begin
 if jsonb_typeof(p_entry) is distinct from 'object' or
    (select count(*) from jsonb_object_keys(p_entry))<>3 or
    exists(select 1 from jsonb_object_keys(p_entry) k where k not in ('slot','relation','profile')) or
    p_entry->'slot' not in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb) or not(p_entry ? 'slot') then raise exception 'MAYA_PROFILE_INVALID';end if;
 if jsonb_typeof(p_entry->'relation') is distinct from 'string' or length(p_entry->>'relation')>100 or (p_entry->>'relation') ~ '[[:cntrl:]]' then raise exception 'MAYA_PROFILE_INVALID';end if;
 v_profile:=p_entry->'profile';
 if jsonb_typeof(v_profile) is distinct from 'object' or
    not(v_profile ?& array['name','birthDate','birthTime','birthPlace']) or
    exists(select 1 from jsonb_object_keys(v_profile) k where k not in ('name','birthDate','birthTime','birthPlace','birthLocation')) then raise exception 'MAYA_PROFILE_INVALID';end if;
 foreach v_key in array array['name','birthDate','birthTime','birthPlace'] loop
  v_text:=v_profile->>v_key;
  if jsonb_typeof(v_profile->v_key) is distinct from 'string' or v_text ~ '[[:cntrl:]]' then raise exception 'MAYA_PROFILE_INVALID';end if;
 end loop;
 if length(btrim(v_profile->>'name')) not between 1 and 100 or length(v_profile->>'birthPlace')>200 then raise exception 'MAYA_PROFILE_INVALID';end if;
 if v_profile->>'birthDate'<>'' and ((v_profile->>'birthDate') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or
    (v_profile->>'birthDate')::date>current_date or to_char((v_profile->>'birthDate')::date,'YYYY-MM-DD')<>v_profile->>'birthDate') then raise exception 'MAYA_PROFILE_INVALID';end if;
 if v_profile->>'birthTime'<>'' and (v_profile->>'birthTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'MAYA_PROFILE_INVALID';end if;
 if v_profile ? 'birthLocation' then
  v_location:=v_profile->'birthLocation';
  if jsonb_typeof(v_location) is distinct from 'object' or
     (select count(*) from jsonb_object_keys(v_location))<>4 or
     not(v_location ?& array['label','latitude','longitude','timezone']) then raise exception 'MAYA_PROFILE_INVALID';end if;
  if jsonb_typeof(v_location->'label') is distinct from 'string' or v_location->>'label'<>v_profile->>'birthPlace' or v_profile->>'birthPlace'='' or
     jsonb_typeof(v_location->'latitude') is distinct from 'number' or jsonb_typeof(v_location->'longitude') is distinct from 'number' then raise exception 'MAYA_PROFILE_INVALID';end if;
  if abs((v_location->>'latitude')::numeric)>90 or abs((v_location->>'longitude')::numeric)>180 then raise exception 'MAYA_PROFILE_INVALID';end if;
  if jsonb_typeof(v_location->'timezone') is distinct from 'string' or length(v_location->>'timezone')>100 or
     not exists(select 1 from pg_timezone_names where name=v_location->>'timezone') then raise exception 'MAYA_PROFILE_INVALID';end if;
 end if;
end;
$$;
revoke all on function orbis_customer.validate_maya_birth_entry(jsonb) from public,anon,authenticated,service_role;

create function orbis_customer.maya_birth_profiles_rpc(p_auth_user_id uuid,p_session_id uuid,p_patch jsonb default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_identity uuid;v_revision integer:=0;v_profiles jsonb:='[]'::jsonb;v_entry jsonb;v_expected integer;v_slot integer;
begin
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
   where s.id=p_session_id and s.user_id=p_auth_user_id and u.deleted_at is null and (s.not_after is null or s.not_after>now())) then raise exception 'CUSTOMER_LIVE_SESSION_REQUIRED';end if;
 select a.orbis_identity_id into v_identity from orbis_customer.accounts a
 join orbis_identity.identities i using(orbis_identity_id)
 where a.auth_user_id=p_auth_user_id and i.subject_kind='person' and i.lifecycle in ('active','provisional');
 if not found then raise exception 'CUSTOMER_ACCOUNT_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('maya-birth-profiles:'||v_identity::text,0));
 select revision,profiles into v_revision,v_profiles from orbis_customer.maya_birth_profiles where orbis_identity_id=v_identity;
 if not found then v_revision:=0;v_profiles:='[]'::jsonb;end if;
 if p_patch is not null then
  if jsonb_typeof(p_patch) is distinct from 'object' or
     (select count(*) from jsonb_object_keys(p_patch))<>4 or
     not(p_patch ?& array['expectedRevision','slot','relation','profile']) or
     jsonb_typeof(p_patch->'expectedRevision') is distinct from 'number' or
     (p_patch->>'expectedRevision') !~ '^[0-9]{1,10}$' then raise exception 'MAYA_PROFILE_INVALID';end if;
  if (p_patch->>'expectedRevision')::numeric>1000000000 then raise exception 'MAYA_PROFILE_INVALID';end if;
  v_expected:=(p_patch->>'expectedRevision')::integer;
  v_entry:=p_patch-'expectedRevision';
  perform orbis_customer.validate_maya_birth_entry(v_entry);
  v_slot:=(v_entry->>'slot')::integer;
  if v_expected<>v_revision then raise exception using errcode='40001',message='MAYA_PROFILE_CONFLICT';end if;
  select coalesce(jsonb_agg(entry order by (entry->>'slot')::integer),'[]'::jsonb) into v_profiles from (
   select entry from jsonb_array_elements(v_profiles) entry where (entry->>'slot')::integer<>v_slot
   union all select v_entry
  ) values_to_save;
  v_revision:=v_revision+1;
  insert into orbis_customer.maya_birth_profiles(orbis_identity_id,revision,profiles)
  values(v_identity,v_revision,v_profiles) on conflict(orbis_identity_id)
  do update set revision=excluded.revision,profiles=excluded.profiles,updated_at=now();
 end if;
 return jsonb_build_object('revision',v_revision,'profiles',v_profiles);
end;
$$;
revoke all on function orbis_customer.maya_birth_profiles_rpc(uuid,uuid,jsonb) from public,anon,authenticated;
grant usage on schema orbis_customer to service_role;
grant execute on function orbis_customer.maya_birth_profiles_rpc(uuid,uuid,jsonb) to service_role;

-- Public API wrapper is an invoker, not a privileged public definer.
create function public.orbis_maya_birth_profiles(p_auth_user_id uuid,p_session_id uuid,p_patch jsonb default null)
returns jsonb language sql security invoker set search_path=pg_catalog as $$
 select orbis_customer.maya_birth_profiles_rpc(p_auth_user_id,p_session_id,p_patch);
$$;
revoke all on function public.orbis_maya_birth_profiles(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.orbis_maya_birth_profiles(uuid,uuid,jsonb) to service_role;
