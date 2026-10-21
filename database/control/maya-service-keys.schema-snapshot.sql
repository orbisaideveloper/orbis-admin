-- Catalog reconstruction, Admin aqcwhqdzniruvoqwfsij, 2026-10-11.
-- REVIEW / DISPOSABLE DATABASE ONLY. Already exists live. NOT original migration.
-- Requires the existing orbis_membership schema. No credentials or seed rows.
begin;
create table orbis_membership.maya_service_keys (
 service_key_id uuid primary key,
 source_project_id text not null check(length(btrim(source_project_id)) > 0),
 key_hash text not null unique check(key_hash ~ '^[0-9a-f]{64}$'),
 label text not null check(length(btrim(label)) > 0),
 created_at timestamptz not null default now(),
 revoked_at timestamptz,
 auth_issuer text check(auth_issuer ~ '^https://[^/]+$'),
 enroll_users boolean not null default false
);
alter table orbis_membership.maya_service_keys enable row level security;
alter table orbis_membership.maya_service_keys force row level security;
revoke all on orbis_membership.maya_service_keys from public,anon,authenticated;
grant select on orbis_membership.maya_service_keys to service_role;
commit;
