-- DISPOSABLE DATABASE ONLY. Minimal auth/identity contracts, no real customers.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema orbis_customer; create schema orbis_identity;
create table auth.users(id uuid primary key,email text,phone text,created_at timestamptz default now(),last_sign_in_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create table orbis_customer.accounts(auth_user_id uuid,orbis_identity_id uuid);
create table orbis_customer.profiles(orbis_identity_id uuid,name text);
create table orbis_identity.identities(orbis_identity_id uuid,display_id text,display_name text,lifecycle text);
create table orbis_customer.product_bindings(orbis_identity_id uuid,project_id text,environment text,disabled_at timestamptz);
create table orbis_identity.product_references(orbis_identity_id uuid,project_id text,local_entity_type text,revoked_at timestamptz);
create table orbis_customer.directory_audit(actor_auth_user_id uuid,session_id uuid);
insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','owner@example.test'),('22222222-2222-4222-8222-222222222222','customer@example.test');
insert into auth.sessions values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',null);
insert into orbis_customer.accounts values('22222222-2222-4222-8222-222222222222','44444444-4444-7444-8444-444444444444');
insert into orbis_identity.identities values('44444444-4444-7444-8444-444444444444','ORB-U-23456789','Customer','active');
insert into orbis_customer.product_bindings values('44444444-4444-7444-8444-444444444444','orbis-khata','production',null);

