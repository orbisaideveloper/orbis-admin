begin;

create schema if not exists orbis_identity;

revoke all on schema orbis_identity from public;

create table orbis_identity.identities (
  orbis_identity_id uuid primary key,
  display_id text not null unique,
  subject_kind text not null,
  lifecycle text not null default 'provisional',
  display_name text not null,
  merged_into_orbis_identity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identities_subject_kind_check
    check (subject_kind in ('person', 'organization')),
  constraint identities_lifecycle_check
    check (lifecycle in ('provisional', 'active', 'suspended', 'merged')),
  constraint identities_display_name_check
    check (length(btrim(display_name)) > 0),
  constraint identities_display_id_check
    check (display_id ~ '^ORB-[UO]-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'),
  constraint identities_merge_state_check
    check (
      (lifecycle = 'merged' and merged_into_orbis_identity_id is not null)
      or
      (lifecycle <> 'merged' and merged_into_orbis_identity_id is null)
    ),
  constraint identities_not_merged_into_self_check
    check (merged_into_orbis_identity_id is distinct from orbis_identity_id),
  constraint identities_merged_into_fkey
    foreign key (merged_into_orbis_identity_id)
    references orbis_identity.identities (orbis_identity_id)
    on update restrict
    on delete restrict
);

create index identities_merged_into_idx
  on orbis_identity.identities (merged_into_orbis_identity_id)
  where merged_into_orbis_identity_id is not null;

create index identities_lifecycle_created_at_idx
  on orbis_identity.identities (lifecycle, created_at desc);

create table orbis_identity.identifiers (
  orbis_identifier_id uuid primary key,
  orbis_identity_id uuid not null,
  kind text not null,
  normalized_value text not null,
  assurance text not null default 'observed',
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint identifiers_identity_fkey
    foreign key (orbis_identity_id)
    references orbis_identity.identities (orbis_identity_id)
    on update restrict
    on delete restrict,
  constraint identifiers_kind_check
    check (kind in ('email', 'phone')),
  constraint identifiers_assurance_check
    check (assurance in ('observed', 'verified')),
  constraint identifiers_normalized_value_check
    check (length(btrim(normalized_value)) > 0),
  constraint identifiers_verification_state_check
    check (
      (assurance = 'verified' and verified_at is not null)
      or
      (assurance = 'observed' and verified_at is null)
    ),
  constraint identifiers_revocation_time_check
    check (revoked_at is null or revoked_at >= created_at)
);

create index identifiers_identity_id_idx
  on orbis_identity.identifiers (orbis_identity_id);

create index identifiers_active_lookup_idx
  on orbis_identity.identifiers (kind, normalized_value)
  where revoked_at is null;

create unique index identifiers_verified_active_unique_idx
  on orbis_identity.identifiers (kind, normalized_value)
  where assurance = 'verified' and revoked_at is null;

create table orbis_identity.product_references (
  orbis_product_reference_id uuid primary key,
  orbis_identity_id uuid not null,
  project_id text not null,
  local_entity_type text not null,
  local_entity_id text not null,
  roles text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_references_identity_fkey
    foreign key (orbis_identity_id)
    references orbis_identity.identities (orbis_identity_id)
    on update restrict
    on delete restrict,
  constraint product_references_project_id_check
    check (length(btrim(project_id)) > 0),
  constraint product_references_local_entity_type_check
    check (length(btrim(local_entity_type)) > 0),
  constraint product_references_local_entity_id_check
    check (length(btrim(local_entity_id)) > 0),
  constraint product_references_roles_check
    check (cardinality(roles) > 0),
  constraint product_references_local_entity_unique
    unique (project_id, local_entity_type, local_entity_id)
);

create index product_references_identity_id_idx
  on orbis_identity.product_references (orbis_identity_id);

create index product_references_project_identity_idx
  on orbis_identity.product_references (project_id, orbis_identity_id);

create table orbis_identity.merge_records (
  orbis_merge_id uuid primary key,
  source_orbis_identity_id uuid not null,
  target_orbis_identity_id uuid not null,
  orbis_action_id uuid not null unique,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint merge_records_source_identity_fkey
    foreign key (source_orbis_identity_id)
    references orbis_identity.identities (orbis_identity_id)
    on update restrict
    on delete restrict,
  constraint merge_records_target_identity_fkey
    foreign key (target_orbis_identity_id)
    references orbis_identity.identities (orbis_identity_id)
    on update restrict
    on delete restrict,
  constraint merge_records_distinct_identities_check
    check (source_orbis_identity_id <> target_orbis_identity_id),
  constraint merge_records_reason_check
    check (length(btrim(reason)) > 0)
);

create index merge_records_source_identity_idx
  on orbis_identity.merge_records (source_orbis_identity_id, created_at desc);

create index merge_records_target_identity_idx
  on orbis_identity.merge_records (target_orbis_identity_id, created_at desc);

create function orbis_identity.protect_identity_keys()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.orbis_identity_id <> old.orbis_identity_id then
    raise exception 'orbis_identity_id is immutable';
  end if;

  if new.display_id <> old.display_id then
    raise exception 'display_id is immutable';
  end if;

  return new;
end;
$$;

create trigger identities_protect_keys
before update on orbis_identity.identities
for each row execute function orbis_identity.protect_identity_keys();

create function orbis_identity.protect_merge_records()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'identity merge records are append-only';
end;
$$;

create trigger merge_records_append_only
before update or delete on orbis_identity.merge_records
for each row execute function orbis_identity.protect_merge_records();

alter table orbis_identity.identities enable row level security;
alter table orbis_identity.identities force row level security;
alter table orbis_identity.identifiers enable row level security;
alter table orbis_identity.identifiers force row level security;
alter table orbis_identity.product_references enable row level security;
alter table orbis_identity.product_references force row level security;
alter table orbis_identity.merge_records enable row level security;
alter table orbis_identity.merge_records force row level security;

revoke all on all tables in schema orbis_identity from public;
revoke all on all functions in schema orbis_identity from public;

comment on schema orbis_identity is
  'Private central ORBIS identity registry; no direct browser access.';

comment on table orbis_identity.identities is
  'Canonical person and organization identities with immutable ORBIS IDs.';

comment on table orbis_identity.identifiers is
  'Mutable phone/email identifiers with observed or verified assurance.';

comment on table orbis_identity.product_references is
  'Cross-product references without cross-database foreign keys.';

comment on table orbis_identity.merge_records is
  'Append-only evidence for manually approved identity merges.';

commit;
