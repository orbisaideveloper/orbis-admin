-- Disposable fixtures only; never run this file on a live database.
do $$
declare snapshot jsonb; event jsonb;
begin
 if has_function_privilege('anon','public.orbis_admin_customer_observability(uuid,uuid,uuid,text,uuid)','execute')
 or has_function_privilege('authenticated','public.orbis_admin_record_login_activity(jsonb)','execute')
 or has_table_privilege('service_role','orbis_customer.login_activity','insert') then raise exception 'Access leaked';end if;
 begin
  perform public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000000');
  raise exception 'Session guard bypassed';
 exception when raise_exception then if sqlerrm<>'ADMIN_LIVE_SESSION_REQUIRED' then raise;end if;end;
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',null,'orbis-khata');
 if (snapshot->>'total')::int<>1 or snapshot->'customers'->0->>'displayId'<>'ORB-U-23456789' then raise exception 'Product scope incorrect';end if;
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333');
 if (snapshot->>'total')::int<>2 or (snapshot->>'unlinked')::int<>1 then raise exception 'Missing incomplete identity';end if;
 event:=jsonb_build_object('id','55555555-5555-7555-8555-555555555555','action','login','outcome','failure','code','CUSTOMER_AUTH_FAILED','durationMs',250,'origin','https://orbis-khata.onrender.com','password','must-never-store');
 perform public.orbis_admin_record_login_activity(event);perform public.orbis_admin_record_login_activity(event);
 if (select count(*) from orbis_customer.login_activity)<>1 then raise exception 'Duplicate telemetry';end if;
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',null,'orbis-khata');
 if snapshot->'activity'->0->>'code'<>'CUSTOMER_AUTH_FAILED' or snapshot::text like '%must-never-store%' then raise exception 'Unsafe telemetry';end if;
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',null,null,'22222222-2222-4222-8222-222222222222');
 if (snapshot->>'total')::int<>1 or jsonb_array_length(snapshot->'activity')<>0 then raise exception 'Unknown failure falsely assigned';end if;
 -- Product-local ledger ownership references provide visibility, not auth bindings.
 delete from orbis_customer.product_bindings;
 insert into orbis_identity.product_references values('44444444-4444-7444-8444-444444444444','orbis-khata','ledger-owner',null);
 insert into orbis_identity.product_references values('44444444-4444-7444-8444-444444444444','orbis-maya','ledger-owner',null);
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',null,'orbis-khata');
 if (snapshot->>'total')::int<>1 then raise exception 'Verified Khata reference not visible';end if;
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',null,'orbis-maya');
 if (snapshot->>'total')::int<>0 then raise exception 'Cross-product reference leaked';end if;
 -- Counts cover all scoped login requests, not only the bounded recent lists.
 insert into orbis_customer.login_activity(event_id,action,outcome,code,duration_ms,project_id,orbis_identity_id)
 select gen_random_uuid(),'login','success','OK',25,'orbis-khata','44444444-4444-7444-8444-444444444444' from generate_series(1,60);
 perform public.orbis_admin_record_login_activity(event||jsonb_build_object('id','88888888-8888-4888-8888-888888888888','action','signup','outcome','success'));
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',null,'orbis-khata');
 if snapshot->'loginTotals'<>jsonb_build_object('success',60,'failure',1) or jsonb_array_length(snapshot->'activity')<>51 then raise exception 'Full-window totals or per-outcome limits incorrect';end if;
 delete from orbis_customer.login_activity where outcome='success';
 -- More than one page, without altering any existing customer.
 insert into auth.users(id,email) select ('66666666-6666-4666-8666-'||lpad(n::text,12,'0'))::uuid,'fixture'||n||'@example.test' from generate_series(1,51) n;
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333');
 if jsonb_array_length(snapshot->'customers')<>50 or snapshot->>'nextCursor' is null then raise exception 'Pagination incorrect';end if;
 snapshot:=public.orbis_admin_customer_observability('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',(snapshot->>'nextCursor')::uuid);
 if jsonb_array_length(snapshot->'customers')<>3 or snapshot->>'nextCursor' is not null then raise exception 'Next page incorrect';end if;
 delete from auth.users where email like 'fixture%@example.test';
 update orbis_customer.login_activity set occurred_at=now()-interval '31 days';
 perform public.orbis_admin_record_login_activity(event||jsonb_build_object('id','77777777-7777-7777-8777-777777777777','origin','https://unknown.test','outcome','success','orbisIdentityId','44444444-4444-7444-8444-444444444444'));
 if (select count(*) from orbis_customer.login_activity)<>1 then raise exception 'Retention cleanup incorrect';end if;
end;
$$;
