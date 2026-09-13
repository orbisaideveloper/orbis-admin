begin;

create schema if not exists orbis_identity;

revoke all on schema orbis_identity from public;
alter default privileges in schema orbis_identity
  revoke all on tables from public;
alter default privileges in schema orbis_identity
  revoke all on sequences from public;
alter default privileges in schema orbis_identity
  revoke all on functions from public;

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
  constraint identities_display_id_subject_kind_check
    check (
      (subject_kind = 'person' and display_id like 'ORB-U-%')
      or
      (subject_kind = 'organization' and display_id like 'ORB-O-%')
    ),
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
  revoked_at timestamptz,
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
  constraint product_references_revocation_time_check
    check (revoked_at is null or revoked_at >= created_at)
);

create unique index product_references_active_local_entity_unique_idx
  on orbis_identity.product_references (
    project_id,
    local_entity_type,
    local_entity_id
  )
  where revoked_at is null;

create index product_references_identity_id_idx
  on orbis_identity.product_references (orbis_identity_id);

create index product_references_project_identity_idx
  on orbis_identity.product_references (project_id, orbis_identity_id);

create table orbis_identity.identity_actions (
  orbis_action_id uuid primary key,
  source_project_id text not null,
  idempotency_key text not null,
  action_kind text not null,
  actor_kind text not null,
  actor_reference text not null,
  status text not null default 'pending',
  resolved_orbis_identity_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint identity_actions_source_project_id_check
    check (length(btrim(source_project_id)) > 0),
  constraint identity_actions_idempotency_key_check
    check (length(btrim(idempotency_key)) > 0),
  constraint identity_actions_kind_check
    check (
      action_kind in (
        'resolve_observation',
        'link_identifier',
        'verify_identifier',
        'revoke_identifier',
        'link_product_reference',
        'unlink_product_reference',
        'merge_identity'
      )
    ),
  constraint identity_actions_actor_kind_check
    check (actor_kind in ('product_service', 'admin_service', 'system')),
  constraint identity_actions_actor_reference_check
    check (length(btrim(actor_reference)) > 0),
  constraint identity_actions_status_check
    check (status in ('pending', 'completed', 'review_required', 'rejected')),
  constraint identity_actions_completed_state_check
    check (
      (status = 'pending' and completed_at is null)
      or
      (status <> 'pending' and completed_at is not null)
    ),
  constraint identity_actions_resolved_identity_fkey
    foreign key (resolved_orbis_identity_id)
    references orbis_identity.identities (orbis_identity_id)
    on update restrict
    on delete restrict,
  constraint identity_actions_source_idempotency_unique
    unique (source_project_id, idempotency_key)
);

create index identity_actions_resolved_identity_idx
  on orbis_identity.identity_actions (
    resolved_orbis_identity_id,
    created_at desc
  )
  where resolved_orbis_identity_id is not null;

create table orbis_identity.identity_audit_events (
  orbis_identity_event_id uuid primary key,
  orbis_action_id uuid not null,
  orbis_identity_id uuid not null,
  event_kind text not null,
  target_type text not null,
  target_reference text not null,
  event_details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint identity_audit_events_action_fkey
    foreign key (orbis_action_id)
    references orbis_identity.identity_actions (orbis_action_id)
    on update restrict
    on delete restrict,
  constraint identity_audit_events_identity_fkey
    foreign key (orbis_identity_id)
    references orbis_identity.identities (orbis_identity_id)
    on update restrict
    on delete restrict,
  constraint identity_audit_events_kind_check
    check (
      event_kind in (
        'identity_created',
        'identifier_linked',
        'identifier_verified',
        'identifier_revoked',
        'product_reference_linked',
        'product_reference_unlinked',
        'identity_merged'
      )
    ),
  constraint identity_audit_events_target_type_check
    check (length(btrim(target_type)) > 0),
  constraint identity_audit_events_target_reference_check
    check (length(btrim(target_reference)) > 0),
  constraint identity_audit_events_details_check
    check (jsonb_typeof(event_details) = 'object'),
  constraint identity_audit_events_action_event_unique
    unique (
      orbis_action_id,
      event_kind,
      target_type,
      target_reference
    )
);

create index identity_audit_events_identity_occurred_idx
  on orbis_identity.identity_audit_events (
    orbis_identity_id,
    occurred_at desc
  );

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
  constraint merge_records_action_fkey
    foreign key (orbis_action_id)
    references orbis_identity.identity_actions (orbis_action_id)
    on update restrict
    on delete restrict,
  constraint merge_records_distinct_identities_check
    check (source_orbis_identity_id <> target_orbis_identity_id),
  constraint merge_records_reason_check
    check (length(btrim(reason)) > 0)
);

create index merge_records_source_identity_idx
  on orbis_identity.merge_records (
    source_orbis_identity_id,
    created_at desc
  );

create index merge_records_target_identity_idx
  on orbis_identity.merge_records (
    target_orbis_identity_id,
    created_at desc
  );

create function orbis_identity.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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

create function orbis_identity.enforce_identity_merge()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.lifecycle = 'merged' and new.lifecycle <> 'merged' then
    raise exception 'a merged identity cannot be restored in place';
  end if;

  if old.lifecycle = 'merged'
    and new.merged_into_orbis_identity_id
      is distinct from old.merged_into_orbis_identity_id then
    raise exception 'a merged identity redirect is immutable';
  end if;

  if new.lifecycle = 'merged' and old.lifecycle <> 'merged' then
    if not exists (
      select 1
      from orbis_identity.identities as target_identity
      where target_identity.orbis_identity_id
        = new.merged_into_orbis_identity_id
        and target_identity.lifecycle = 'active'
    ) then
      raise exception 'a merge target must be an active identity';
    end if;

    if not exists (
      select 1
      from orbis_identity.merge_records as merge_record
      join orbis_identity.identity_audit_events as audit_event
        on audit_event.orbis_action_id = merge_record.orbis_action_id
      where merge_record.source_orbis_identity_id = old.orbis_identity_id
        and merge_record.target_orbis_identity_id
          = new.merged_into_orbis_identity_id
        and audit_event.orbis_identity_id = old.orbis_identity_id
        and audit_event.event_kind = 'identity_merged'
        and audit_event.target_type = 'identity'
        and audit_event.target_reference
          = new.merged_into_orbis_identity_id::text
    ) then
      raise exception 'a merge requires matching append-only audit evidence';
    end if;
  end if;

  return new;
end;
$$;

create function orbis_identity.protect_identifier_keys()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.orbis_identifier_id <> old.orbis_identifier_id
    or new.orbis_identity_id <> old.orbis_identity_id
    or new.kind <> old.kind
    or new.normalized_value <> old.normalized_value then
    raise exception 'identifier ownership and normalized value are immutable';
  end if;

  if old.assurance = 'verified'
    and (
      new.assurance <> old.assurance
      or new.verified_at is distinct from old.verified_at
    ) then
    raise exception 'verified identifier assurance is immutable';
  end if;

  if old.revoked_at is not null
    and new.revoked_at is distinct from old.revoked_at then
    raise exception 'identifier revocation is immutable';
  end if;

  return new;
end;
$$;

create function orbis_identity.protect_product_reference_keys()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.orbis_product_reference_id <> old.orbis_product_reference_id
    or new.orbis_identity_id <> old.orbis_identity_id
    or new.project_id <> old.project_id
    or new.local_entity_type <> old.local_entity_type
    or new.local_entity_id <> old.local_entity_id then
    raise exception 'product reference ownership and local key are immutable';
  end if;

  if old.revoked_at is not null
    and new.revoked_at is distinct from old.revoked_at then
    raise exception 'product reference revocation is immutable';
  end if;

  return new;
end;
$$;

create function orbis_identity.prevent_identity_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'identities are never physically deleted';
end;
$$;

create function orbis_identity.prevent_identifier_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'identifiers are never physically deleted';
end;
$$;

create function orbis_identity.prevent_product_reference_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'product references are never physically deleted';
end;
$$;

create function orbis_identity.protect_identity_audit_events()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'identity audit events are append-only';
end;
$$;

create function orbis_identity.protect_merge_records()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'identity merge records are append-only';
end;
$$;

create trigger identities_enforce_merge
before update on orbis_identity.identities
for each row execute function orbis_identity.enforce_identity_merge();

create trigger identities_protect_keys
before update on orbis_identity.identities
for each row execute function orbis_identity.protect_identity_keys();

create trigger identities_prevent_delete
before delete on orbis_identity.identities
for each row execute function orbis_identity.prevent_identity_delete();

create trigger identities_set_updated_at
before update on orbis_identity.identities
for each row execute function orbis_identity.set_updated_at();

create trigger identifiers_protect_keys
before update on orbis_identity.identifiers
for each row execute function orbis_identity.protect_identifier_keys();

create trigger identifiers_prevent_delete
before delete on orbis_identity.identifiers
for each row execute function orbis_identity.prevent_identifier_delete();

create trigger product_references_protect_keys
before update on orbis_identity.product_references
for each row execute function orbis_identity.protect_product_reference_keys();

create trigger product_references_prevent_delete
before delete on orbis_identity.product_references
for each row execute function orbis_identity.prevent_product_reference_delete();

create trigger product_references_set_updated_at
before update on orbis_identity.product_references
for each row execute function orbis_identity.set_updated_at();

create trigger identity_audit_events_append_only
before update or delete on orbis_identity.identity_audit_events
for each row execute function orbis_identity.protect_identity_audit_events();

create trigger merge_records_append_only
before update or delete on orbis_identity.merge_records
for each row execute function orbis_identity.protect_merge_records();

alter table orbis_identity.identities enable row level security;
alter table orbis_identity.identities force row level security;
alter table orbis_identity.identifiers enable row level security;
alter table orbis_identity.identifiers force row level security;
alter table orbis_identity.product_references enable row level security;
alter table orbis_identity.product_references force row level security;
alter table orbis_identity.identity_actions enable row level security;
alter table orbis_identity.identity_actions force row level security;
alter table orbis_identity.identity_audit_events enable row level security;
alter table orbis_identity.identity_audit_events force row level security;
alter table orbis_identity.merge_records enable row level security;
alter table orbis_identity.merge_records force row level security;

revoke all on all tables in schema orbis_identity from public;
revoke all on all sequences in schema orbis_identity from public;
revoke all on all functions in schema orbis_identity from public;

comment on schema orbis_identity is
  'Private central ORBIS identity registry; no direct browser access.';

comment on table orbis_identity.identities is
  'Canonical person and organization identities with immutable ORBIS IDs.';

comment on table orbis_identity.identifiers is
  'Mutable phone/email identifiers with observed or verified assurance.';

comment on table orbis_identity.product_references is
  'Cross-product references without cross-database foreign keys.';

comment on table orbis_identity.identity_actions is
  'Idempotent server-side identity commands keyed by source project and request key.';

comment on table orbis_identity.identity_audit_events is
  'Append-only identity action evidence; event details must not contain secrets or raw identifiers.';

comment on table orbis_identity.merge_records is
  'Append-only evidence for manually approved identity merges.';

commit;
