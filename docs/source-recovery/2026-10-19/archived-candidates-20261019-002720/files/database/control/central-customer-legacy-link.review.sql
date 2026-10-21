-- REVIEW SOURCE. Apply only after the base customer schema and proof verification.
-- No email/phone matching and no financial ownership changes. Service-only RPC.
begin;
create table orbis_customer.link_audit (
 event_id uuid primary key default gen_random_uuid(),
 auth_user_id uuid not null references auth.users(id),
 orbis_identity_id uuid not null references orbis_identity.identities(orbis_identity_id),
 project_id text not null,
 environment text not null,
 local_auth_user_id uuid not null,
 occurred_at timestamptz not null default now()
);
alter table orbis_customer.link_audit enable row level security;
alter table orbis_customer.link_audit force row level security;
revoke all on orbis_customer.link_audit from public,anon,authenticated,service_role;

create or replace function public.orbis_customer_link_legacy(
 p_auth_user_id uuid,p_session_id uuid,p_project_id text,p_environment text,
 p_local_auth_user_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_identity uuid;v_current uuid;v_source text;v_count integer;v_binding orbis_customer.product_bindings;
begin
 -- The invoking backend must first verify the live central session AND the
 -- product's independent live legacy session. Public clients cannot call this.
 if p_project_id not in ('orbis-foundation','orbis-maya','orbis-khata') or
    p_environment not in ('production','staging','development') or p_local_auth_user_id is null then
  raise exception 'CUSTOMER_PRODUCT_INVALID';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('central-customer:'||p_auth_user_id::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_project_id||':'||p_environment||':'||p_local_auth_user_id::text,0));
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
  where s.id=p_session_id and s.user_id=p_auth_user_id and u.deleted_at is null
  and (s.not_after is null or s.not_after>now())) then raise exception 'CUSTOMER_LIVE_SESSION_REQUIRED';end if;
 v_source:=case when p_environment='production' then p_project_id else p_project_id||'-'||p_environment end;
 select count(*),min(r.orbis_identity_id::text)::uuid into v_count,v_identity
 from orbis_identity.product_references r join orbis_identity.identities i using(orbis_identity_id)
 where r.project_id=v_source and r.local_entity_type='user' and r.local_entity_id=p_local_auth_user_id::text
 and r.revoked_at is null and i.subject_kind='person' and i.lifecycle in ('active','provisional');
 if v_count<>1 then raise exception 'CUSTOMER_LEGACY_REFERENCE_REQUIRED';end if;
 select orbis_identity_id into v_current from orbis_customer.accounts where auth_user_id=p_auth_user_id;
 if found and v_current<>v_identity then raise exception 'CUSTOMER_IDENTITY_CONFLICT';end if;
 if exists(select 1 from orbis_customer.accounts where orbis_identity_id=v_identity and auth_user_id<>p_auth_user_id) then
  raise exception 'CUSTOMER_IDENTITY_ALREADY_BOUND';end if;
 select * into v_binding from orbis_customer.product_bindings where orbis_identity_id=v_identity
 and project_id=p_project_id and environment=p_environment;
 if found and (v_binding.local_auth_user_id<>p_local_auth_user_id or v_binding.disabled_at is not null) then
  raise exception 'CUSTOMER_PRODUCT_BINDING_CONFLICT';end if;
 insert into orbis_customer.accounts(auth_user_id,orbis_identity_id) values(p_auth_user_id,v_identity)
 on conflict(auth_user_id) do nothing;
 insert into orbis_customer.product_bindings(orbis_identity_id,project_id,environment,local_auth_user_id)
 values(v_identity,p_project_id,p_environment,p_local_auth_user_id) on conflict do nothing;
 select * into v_binding from orbis_customer.product_bindings where orbis_identity_id=v_identity
 and project_id=p_project_id and environment=p_environment;
 if not found or v_binding.local_auth_user_id<>p_local_auth_user_id or v_binding.disabled_at is not null then
  raise exception 'CUSTOMER_PRODUCT_BINDING_CONFLICT';end if;
 insert into orbis_customer.link_audit(auth_user_id,orbis_identity_id,project_id,environment,local_auth_user_id)
 values(p_auth_user_id,v_identity,p_project_id,p_environment,p_local_auth_user_id);
 return jsonb_build_object('orbisIdentityId',v_identity,'projectId',p_project_id,'environment',p_environment,
  'localAuthUserId',p_local_auth_user_id,'localAccountId',v_binding.local_account_id);
end;
$$;
revoke all on function public.orbis_customer_link_legacy(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.orbis_customer_link_legacy(uuid,uuid,text,text,uuid) to service_role;
commit;
