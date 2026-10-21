-- Reviewed additive source; NOT applied by the Termux patch.
-- Customer AI permissions are separate from owner/deploy controls.
begin;
create schema orbis_membership;
revoke all on schema orbis_membership from public, anon, authenticated;
create table orbis_membership.maya_grants (
  source_project_id text not null,
  auth_issuer text not null check(auth_issuer ~ '^https://[^/]+$'),
  auth_user_id uuid not null,
  orbis_identity_id uuid not null references orbis_identity.identities(orbis_identity_id),
  project_id text not null default 'orbis-maya' check(project_id='orbis-maya'),
  capability text not null check(capability in ('general.chat','dream.analysis')),
  enabled boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(source_project_id,auth_issuer,auth_user_id,project_id,capability)
);
create index maya_grants_identity_idx on orbis_membership.maya_grants(orbis_identity_id);
alter table orbis_membership.maya_grants enable row level security;
alter table orbis_membership.maya_grants force row level security;
revoke all on orbis_membership.maya_grants from public,anon,authenticated;
grant usage on schema orbis_membership to service_role;
grant select on orbis_membership.maya_grants to service_role;
commit;
