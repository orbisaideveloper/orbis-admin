insert into auth.users(id,email,phone) values('11111111-1111-4111-8111-111111111111','legacy@example.test',null),('22222222-2222-4222-8222-222222222222','other@example.test',null);
insert into auth.sessions values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',null),('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222',null);
insert into orbis_identity.identities(orbis_identity_id,display_id,subject_kind,lifecycle,display_name) values('55555555-5555-7555-8555-555555555555','ORB-U-23456789','person','active','Legacy');
insert into orbis_identity.product_references(orbis_product_reference_id,orbis_identity_id,project_id,local_entity_type,local_entity_id,roles) values(gen_random_uuid(),'55555555-5555-7555-8555-555555555555','orbis-foundation','user','66666666-6666-4666-8666-666666666666',array['user']);
do $$
declare result jsonb;
begin
 result:=public.orbis_customer_link_legacy('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','orbis-foundation','production','66666666-6666-4666-8666-666666666666');
 if result->>'orbisIdentityId'<>'55555555-5555-7555-8555-555555555555' or result->>'localAuthUserId'<>'66666666-6666-4666-8666-666666666666' then raise exception 'TEST_ID_CHANGED';end if;
 if result<>public.orbis_customer_link_legacy('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','orbis-foundation','production','66666666-6666-4666-8666-666666666666') then raise exception 'TEST_IDEMPOTENCY';end if;
 begin
  perform public.orbis_customer_link_legacy('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','orbis-foundation','production','66666666-6666-4666-8666-666666666666');
  raise exception 'TEST_OTHER_ACCOUNT_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_IDENTITY_ALREADY_BOUND' then raise;end if;end;
 begin
  perform public.orbis_customer_link_legacy('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','orbis-foundation','staging','66666666-6666-4666-8666-666666666666');
  raise exception 'TEST_ENVIRONMENT_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_LEGACY_REFERENCE_REQUIRED' then raise;end if;end;
 begin
  perform public.orbis_customer_link_legacy('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','orbis-foundation','production','66666666-6666-4666-8666-666666666666');
  raise exception 'TEST_WRONG_SESSION_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_LIVE_SESSION_REQUIRED' then raise;end if;end;
 update orbis_customer.product_bindings set disabled_at=now();
 begin
  perform public.orbis_customer_link_legacy('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','orbis-foundation','production','66666666-6666-4666-8666-666666666666');
  raise exception 'TEST_DISABLED_ALLOWED';
 exception when others then if sqlerrm<>'CUSTOMER_PRODUCT_BINDING_CONFLICT' then raise;end if;end;
 if has_function_privilege('anon','public.orbis_customer_link_legacy(uuid,uuid,text,text,uuid)','EXECUTE') or has_function_privilege('authenticated','public.orbis_customer_link_legacy(uuid,uuid,text,text,uuid)','EXECUTE') then raise exception 'TEST_PUBLIC_EXECUTE';end if;
 if has_table_privilege('service_role','orbis_customer.link_audit','SELECT') then raise exception 'TEST_DIRECT_AUDIT_ACCESS';end if;
 raise notice 'LEGACY_LINK_CHECKS=PASS; stable IDs/idempotency/conflict/session/environment/disabled/permissions';
end $$;
