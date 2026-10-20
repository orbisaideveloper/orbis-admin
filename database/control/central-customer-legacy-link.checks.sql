-- Disposable database fixture only. No production execution.
-- All fixture writes are rolled back, including the disabled binding.
begin;
do $$
declare
 result jsonb;
 affected_rows integer;
 fixture_user constant uuid := '11111111-1111-4111-8111-111111111111';
 other_user constant uuid := '22222222-2222-4222-8222-222222222222';
 fixture_session constant uuid := '33333333-3333-4333-8333-333333333333';
 other_session constant uuid := '44444444-4444-4444-8444-444444444444';
 fixture_identity constant uuid := '55555555-5555-7555-8555-555555555555';
 fixture_local_user constant uuid := '66666666-6666-4666-8666-666666666666';
 fixture_project constant text := 'orbis-foundation';
 fixture_environment constant text := 'production';
begin
insert into auth.users(id,email,phone) values(fixture_user,'legacy@example.test',null),(other_user,'other@example.test',null);
insert into auth.sessions values(fixture_session,fixture_user,null),(other_session,other_user,null);
insert into orbis_identity.identities(orbis_identity_id,display_id,subject_kind,lifecycle,display_name) values(fixture_identity,'ORB-U-23456789','person','active','Legacy');
insert into orbis_identity.product_references(orbis_product_reference_id,orbis_identity_id,project_id,local_entity_type,local_entity_id,roles) values(gen_random_uuid(),fixture_identity,fixture_project,'user',fixture_local_user::text,array['user']);
 result:=public.orbis_customer_link_legacy(fixture_user,fixture_session,fixture_project,fixture_environment,fixture_local_user);
 if result->>'orbisIdentityId'<>fixture_identity::text or result->>'localAuthUserId'<>fixture_local_user::text then raise exception 'TEST_ID_CHANGED';end if;
 if result<>public.orbis_customer_link_legacy(fixture_user,fixture_session,fixture_project,fixture_environment,fixture_local_user) then raise exception 'TEST_IDEMPOTENCY';end if;
 begin
  perform public.orbis_customer_link_legacy(other_user,other_session,fixture_project,fixture_environment,fixture_local_user);
  raise exception 'TEST_OTHER_ACCOUNT_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_IDENTITY_ALREADY_BOUND' then raise;end if;end;
 begin
  perform public.orbis_customer_link_legacy(fixture_user,fixture_session,fixture_project,'staging',fixture_local_user);
  raise exception 'TEST_ENVIRONMENT_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_LEGACY_REFERENCE_REQUIRED' then raise;end if;end;
 begin
  perform public.orbis_customer_link_legacy(fixture_user,other_session,fixture_project,fixture_environment,fixture_local_user);
  raise exception 'TEST_WRONG_SESSION_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_LIVE_SESSION_REQUIRED' then raise;end if;end;
 update orbis_customer.product_bindings set disabled_at=now()
 where orbis_identity_id=fixture_identity and project_id=fixture_project
 and environment=fixture_environment and local_auth_user_id=fixture_local_user;
 get diagnostics affected_rows = row_count;
 if affected_rows<>1 then raise exception 'TEST_BINDING_COUNT';end if;
 begin
  perform public.orbis_customer_link_legacy(fixture_user,fixture_session,fixture_project,fixture_environment,fixture_local_user);
  raise exception 'TEST_DISABLED_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_PRODUCT_BINDING_CONFLICT' then raise;end if;end;
 if has_function_privilege('anon','public.orbis_customer_link_legacy(uuid,uuid,text,text,uuid)','EXECUTE') or has_function_privilege('authenticated','public.orbis_customer_link_legacy(uuid,uuid,text,text,uuid)','EXECUTE') then raise exception 'TEST_PUBLIC_EXECUTE';end if;
 if has_table_privilege('service_role','orbis_customer.link_audit','SELECT') then raise exception 'TEST_DIRECT_AUDIT_ACCESS';end if;
 raise notice 'LEGACY_LINK_CHECKS=PASS; stable IDs/idempotency/conflict/session/environment/disabled/permissions';
end $$;
rollback;
