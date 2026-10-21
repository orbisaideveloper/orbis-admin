-- Ordinary Maya AI enrollment only. No administrator role is created.
alter table orbis_membership.maya_service_keys
  add column if not exists auth_issuer text check(auth_issuer ~ '^https://[^/]+$'),
  add column if not exists enroll_users boolean not null default false;

create or replace function orbis_membership.enroll_maya_user(
  p_key_hash text, p_auth_issuer text, p_user_id uuid
) returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare
  v_source text; v_request jsonb; v_result jsonb; v_identity uuid;
  v_random text; v_uuid uuid; v_display text;
begin
  select source_project_id into v_source from orbis_membership.maya_service_keys
    where key_hash=p_key_hash and revoked_at is null and enroll_users
      and auth_issuer=p_auth_issuer;
  if v_source is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('maya-enroll:'||v_source||':'||p_user_id::text,0));
  -- Revoked references must not be replaced by automatic onboarding.
  if exists(select 1 from orbis_identity.product_references
    where project_id=v_source and local_entity_type='user' and local_entity_id=p_user_id::text
      and revoked_at is not null)
    and not exists(select 1 from orbis_identity.product_references
      where project_id=v_source and local_entity_type='user' and local_entity_id=p_user_id::text
        and revoked_at is null) then return null; end if;
  v_random:=replace(gen_random_uuid()::text,'-','');
  v_uuid:=(lpad(to_hex(floor(extract(epoch from clock_timestamp())*1000)::bigint),12,'0')
    ||'7'||substr(v_random,1,3)||'8'||substr(v_random,5,15))::uuid;
  v_display:='ORB-U-'||translate(upper(substr(v_random,1,8)),'01','GH');
  v_request:=jsonb_build_object(
    'source_project_id',v_source,
    'idempotency_key','maya:user:'||p_auth_issuer||':'||p_user_id::text||':identity-v1',
    'actor_kind','product_service','actor_reference','maya-authenticated-onboarding',
    'subject_kind','person','display_name','Maya user','identifiers','[]'::jsonb,
    'source',jsonb_build_object('project_id',v_source,'local_entity_type','user',
      'local_entity_id',p_user_id::text,'roles',jsonb_build_array('user')));
  v_result:=orbis_identity.resolve_observation_write(gen_random_uuid(),v_request,
    encode(sha256(convert_to(v_request::text,'UTF8')),'hex'),v_uuid,v_display);
  if v_result->>'outcome' not in ('match','create_provisional')
    or v_result->>'lifecycle' not in ('active','provisional') then return null; end if;
  v_identity:=(v_result->>'orbisIdentityId')::uuid;
  if not exists(select 1 from orbis_identity.identities
    where orbis_identity_id=v_identity and lifecycle in ('active','provisional')
      and subject_kind='person') then return null; end if;
  insert into orbis_membership.maya_grants
    (source_project_id,auth_issuer,auth_user_id,orbis_identity_id,project_id,capability,enabled,expires_at)
    select v_source,p_auth_issuer,p_user_id,v_identity,'orbis-maya',capability,true,
      now()+interval '1 year'
    from unnest(array['general.chat','dream.analysis','astro.interpretation']) as capability
    on conflict(source_project_id,auth_issuer,auth_user_id,project_id,capability) do nothing;
  return v_identity;
end;
$$;
revoke all on function orbis_membership.enroll_maya_user(text,text,uuid) from public,anon,authenticated,service_role;
-- Enable only the owner's previously registered, scoped gateway key.
update orbis_membership.maya_service_keys
  set auth_issuer='https://xcpcncicglruawkgbepy.supabase.co',enroll_users=true
  where service_key_id='01a114f6-5c67-7b80-bd9c-09f49234141d'
    and source_project_id='orbis-foundation' and revoked_at is null;
