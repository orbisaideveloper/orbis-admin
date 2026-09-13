begin;

alter table orbis_identity.identity_actions
  add column request_fingerprint text not null,
  add column result jsonb;

alter table orbis_identity.identity_actions
  add constraint identity_actions_request_fingerprint_check
    check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  add constraint identity_actions_result_state_check
    check (
      (status = 'pending' and result is null)
      or
      (status <> 'pending' and result is not null and jsonb_typeof(result) = 'object')
    );

create table orbis_identity.service_keys (
  service_key_id uuid primary key,
  project_id text not null,
  key_hash text not null unique,
  label text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint service_keys_project_id_check
    check (length(btrim(project_id)) > 0),
  constraint service_keys_key_hash_check
    check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint service_keys_label_check
    check (length(btrim(label)) > 0),
  constraint service_keys_revocation_time_check
    check (revoked_at is null or revoked_at >= created_at)
);

create index service_keys_project_active_idx
  on orbis_identity.service_keys (project_id)
  where revoked_at is null;

create or replace function orbis_identity.protect_identity_action_keys()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.orbis_action_id <> old.orbis_action_id
    or new.source_project_id <> old.source_project_id
    or new.idempotency_key <> old.idempotency_key
    or new.action_kind <> old.action_kind
    or new.actor_kind <> old.actor_kind
    or new.actor_reference <> old.actor_reference
    or new.request_fingerprint <> old.request_fingerprint then
    raise exception 'identity action request context is immutable';
  end if;

  if old.status <> 'pending' then
    raise exception 'a completed identity action is immutable';
  end if;

  if new.status = 'pending' then
    raise exception 'an identity action must reach a terminal outcome';
  end if;

  return new;
end;
$$;

create function orbis_identity.protect_service_key()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.service_key_id <> old.service_key_id
    or new.project_id <> old.project_id
    or new.key_hash <> old.key_hash
    or new.label <> old.label then
    raise exception 'service key identity is immutable';
  end if;

  if old.revoked_at is not null
    and new.revoked_at is distinct from old.revoked_at then
    raise exception 'service key revocation is immutable';
  end if;

  return new;
end;
$$;

create function orbis_identity.prevent_service_key_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'service keys are never physically deleted';
end;
$$;

create trigger service_keys_protect
before update on orbis_identity.service_keys
for each row execute function orbis_identity.protect_service_key();

create trigger service_keys_prevent_delete
before delete on orbis_identity.service_keys
for each row execute function orbis_identity.prevent_service_key_delete();

create function orbis_identity.canonical_identity_id(
  p_orbis_identity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_identity_id uuid := p_orbis_identity_id;
  next_identity_id uuid;
  seen_identity_ids uuid[] := '{}'::uuid[];
begin
  loop
    if current_identity_id = any(seen_identity_ids) then
      return current_identity_id;
    end if;

    seen_identity_ids := array_append(
      seen_identity_ids,
      current_identity_id
    );

    select identity_row.merged_into_orbis_identity_id
      into next_identity_id
    from orbis_identity.identities as identity_row
    where identity_row.orbis_identity_id = current_identity_id;

    if not found or next_identity_id is null then
      return current_identity_id;
    end if;

    current_identity_id := next_identity_id;
  end loop;
end;
$$;

create function orbis_identity.resolve_observation_write(
  p_action_id uuid,
  p_request jsonb,
  p_request_fingerprint text,
  p_new_identity_id uuid,
  p_new_display_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  source_project_id text := nullif(
    btrim(p_request->>'source_project_id'),
    ''
  );
  idempotency_key text := nullif(
    btrim(p_request->>'idempotency_key'),
    ''
  );
  actor_kind text := nullif(
    btrim(p_request->>'actor_kind'),
    ''
  );
  actor_reference text := nullif(
    btrim(p_request->>'actor_reference'),
    ''
  );
  subject_kind text := nullif(
    btrim(p_request->>'subject_kind'),
    ''
  );
  display_name text := nullif(
    btrim(p_request->>'display_name'),
    ''
  );
  source_project_reference text := nullif(
    btrim(p_request#>>'{source,project_id}'),
    ''
  );
  local_entity_type text := nullif(
    btrim(p_request#>>'{source,local_entity_type}'),
    ''
  );
  local_entity_id text := nullif(
    btrim(p_request#>>'{source,local_entity_id}'),
    ''
  );
  source_roles text[];
  existing_action orbis_identity.identity_actions%rowtype;
  identifier_record record;
  matched_identity_id uuid;
  canonical_id uuid;
  local_reference_identity_id uuid;
  resolved_identity_id uuid;
  resolved_display_id text;
  resolved_lifecycle text;
  resolved_subject_kind text;
  candidate_identity_ids uuid[] := '{}'::uuid[];
  verified_identifier_count integer := 0;
  candidate_count integer := 0;
  outcome text;
  reason text;
  result_payload jsonb;
  target_reference text;
  inserted_identifier_id uuid;
  inserted_reference_id uuid;
begin
  if source_project_id is null
    or idempotency_key is null
    or actor_reference is null
    or display_name is null
    or source_project_reference is null
    or local_entity_type is null
    or local_entity_id is null then
    raise exception 'identity_request_invalid';
  end if;

  if actor_kind not in ('product_service', 'admin_service', 'system') then
    raise exception 'identity_request_invalid_actor_kind';
  end if;

  if subject_kind not in ('person', 'organization') then
    raise exception 'identity_request_invalid_subject_kind';
  end if;

  if source_project_id <> source_project_reference then
    raise exception 'identity_request_project_mismatch';
  end if;

  if p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'identity_request_invalid_fingerprint';
  end if;

  if jsonb_typeof(p_request->'identifiers') <> 'array'
    or jsonb_typeof(p_request#>'{source,roles}') <> 'array' then
    raise exception 'identity_request_invalid_collections';
  end if;

  select coalesce(array_agg(role_value), '{}'::text[])
    into source_roles
  from (
    select distinct nullif(btrim(value), '') as role_value
    from jsonb_array_elements_text(p_request#>'{source,roles}')
  ) as roles
  where role_value is not null;

  if cardinality(source_roles) = 0 then
    raise exception 'identity_request_roles_required';
  end if;

  for identifier_record in
    select *
    from jsonb_to_recordset(p_request->'identifiers')
      as identifier_row(
        kind text,
        normalized_value text,
        assurance text
      )
  loop
    if identifier_record.kind not in ('email', 'phone')
      or nullif(btrim(identifier_record.normalized_value), '') is null
      or identifier_record.assurance not in ('observed', 'verified') then
      raise exception 'identity_request_invalid_identifier';
    end if;
  end loop;

  perform pg_advisory_xact_lock(
    hashtextextended(
      source_project_id || ':' || idempotency_key,
      0
    )
  );

  select *
    into existing_action
  from orbis_identity.identity_actions
  where identity_actions.source_project_id = source_project_id
    and identity_actions.idempotency_key = idempotency_key;

  if found then
    if existing_action.orbis_action_id <> p_action_id
      or existing_action.request_fingerprint <> p_request_fingerprint then
      raise exception 'identity_idempotency_conflict';
    end if;

    if existing_action.status = 'pending'
      or existing_action.result is null then
      raise exception 'identity_action_pending';
    end if;

    return jsonb_set(
      existing_action.result,
      '{replayed}',
      'true'::jsonb,
      true
    );
  end if;

  insert into orbis_identity.identity_actions (
    orbis_action_id,
    source_project_id,
    idempotency_key,
    action_kind,
    actor_kind,
    actor_reference,
    status,
    request_fingerprint
  )
  values (
    p_action_id,
    source_project_id,
    idempotency_key,
    'resolve_observation',
    actor_kind,
    actor_reference,
    'pending',
    p_request_fingerprint
  );

  select product_reference.orbis_identity_id
    into local_reference_identity_id
  from orbis_identity.product_references as product_reference
  where product_reference.project_id = source_project_id
    and product_reference.local_entity_type = local_entity_type
    and product_reference.local_entity_id = local_entity_id
    and product_reference.revoked_at is null
  limit 1;

  if local_reference_identity_id is not null then
    local_reference_identity_id :=
      orbis_identity.canonical_identity_id(
        local_reference_identity_id
      );
  end if;

  for identifier_record in
    select *
    from jsonb_to_recordset(p_request->'identifiers')
      as identifier_row(
        kind text,
        normalized_value text,
        assurance text
      )
  loop
    if identifier_record.assurance = 'verified' then
      verified_identifier_count :=
        verified_identifier_count + 1;

      for matched_identity_id in
        select distinct identifier_row.orbis_identity_id
        from orbis_identity.identifiers as identifier_row
        where identifier_row.kind = identifier_record.kind
          and identifier_row.normalized_value =
            identifier_record.normalized_value
          and identifier_row.assurance = 'verified'
          and identifier_row.revoked_at is null
      loop
        canonical_id :=
          orbis_identity.canonical_identity_id(
            matched_identity_id
          );

        if not canonical_id = any(candidate_identity_ids) then
          candidate_identity_ids :=
            array_append(candidate_identity_ids, canonical_id);
        end if;
      end loop;
    end if;
  end loop;

  candidate_count := cardinality(candidate_identity_ids);

  if local_reference_identity_id is not null then
    select
      identity_row.display_id,
      identity_row.lifecycle,
      identity_row.subject_kind
    into
      resolved_display_id,
      resolved_lifecycle,
      resolved_subject_kind
    from orbis_identity.identities as identity_row
    where identity_row.orbis_identity_id =
      local_reference_identity_id;

    if resolved_subject_kind is distinct from subject_kind then
      outcome := 'review_required';
      reason := 'subject_kind_conflict';
    elsif resolved_lifecycle not in ('provisional', 'active') then
      outcome := 'review_required';
      reason := 'lifecycle_conflict';
    elsif exists (
      select 1
      from unnest(candidate_identity_ids)
        as candidate(candidate_identity_id)
      where candidate.candidate_identity_id <>
        local_reference_identity_id
    ) then
      outcome := 'review_required';
      reason := 'product_reference_conflict';
    else
      outcome := 'match';
      reason := 'product_reference_match';
      resolved_identity_id := local_reference_identity_id;
    end if;
  elsif verified_identifier_count = 0 then
    outcome := 'create_provisional';
    reason := 'no_strong_identifier';
  elsif candidate_count = 0 then
    outcome := 'create_provisional';
    reason := 'no_match';
  elsif candidate_count > 1 then
    outcome := 'review_required';
    reason := 'multiple_identifier_matches';
  else
    resolved_identity_id := candidate_identity_ids[1];

    select
      identity_row.display_id,
      identity_row.lifecycle,
      identity_row.subject_kind
    into
      resolved_display_id,
      resolved_lifecycle,
      resolved_subject_kind
    from orbis_identity.identities as identity_row
    where identity_row.orbis_identity_id =
      resolved_identity_id;

    if resolved_subject_kind is distinct from subject_kind then
      outcome := 'review_required';
      reason := 'subject_kind_conflict';
      resolved_identity_id := null;
    elsif resolved_lifecycle <> 'active' then
      outcome := 'review_required';
      reason := 'lifecycle_conflict';
      resolved_identity_id := null;
    else
      outcome := 'match';
      reason := 'single_identifier_match';
    end if;
  end if;

  if outcome = 'review_required' then
    result_payload := jsonb_build_object(
      'outcome', outcome,
      'orbisIdentityId', null,
      'displayId', null,
      'lifecycle', null,
      'candidateOrbisIdentityIds',
        to_jsonb(candidate_identity_ids),
      'reason', reason,
      'replayed', false
    );

    update orbis_identity.identity_actions
    set
      status = 'review_required',
      completed_at = now(),
      result = result_payload
    where orbis_action_id = p_action_id;

    return result_payload;
  end if;

  if outcome = 'create_provisional' then
    resolved_identity_id := p_new_identity_id;
    resolved_display_id := p_new_display_id;
    resolved_lifecycle := 'provisional';

    insert into orbis_identity.identities (
      orbis_identity_id,
      display_id,
      subject_kind,
      lifecycle,
      display_name
    )
    values (
      resolved_identity_id,
      resolved_display_id,
      subject_kind,
      resolved_lifecycle,
      display_name
    );

    insert into orbis_identity.identity_audit_events (
      orbis_identity_event_id,
      orbis_action_id,
      orbis_identity_id,
      event_kind,
      target_type,
      target_reference,
      event_details
    )
    values (
      gen_random_uuid(),
      p_action_id,
      resolved_identity_id,
      'identity_created',
      'identity',
      resolved_identity_id::text,
      jsonb_build_object(
        'displayId', resolved_display_id,
        'subjectKind', subject_kind
      )
    );
  end if;

  for identifier_record in
    select *
    from jsonb_to_recordset(p_request->'identifiers')
      as identifier_row(
        kind text,
        normalized_value text,
        assurance text
      )
  loop
    inserted_identifier_id := null;
    target_reference :=
      identifier_record.kind || ':' ||
      identifier_record.normalized_value;

    select identifier_row.orbis_identifier_id
      into inserted_identifier_id
    from orbis_identity.identifiers as identifier_row
    where identifier_row.orbis_identity_id =
      resolved_identity_id
      and identifier_row.kind = identifier_record.kind
      and identifier_row.normalized_value =
        identifier_record.normalized_value
      and identifier_row.revoked_at is null
    limit 1;

    if inserted_identifier_id is null then
      inserted_identifier_id := gen_random_uuid();

      insert into orbis_identity.identifiers (
        orbis_identifier_id,
        orbis_identity_id,
        kind,
        normalized_value,
        assurance,
        verified_at
      )
      values (
        inserted_identifier_id,
        resolved_identity_id,
        identifier_record.kind,
        identifier_record.normalized_value,
        identifier_record.assurance,
        case
          when identifier_record.assurance = 'verified'
            then now()
          else null
        end
      );

      insert into orbis_identity.identity_audit_events (
        orbis_identity_event_id,
        orbis_action_id,
        orbis_identity_id,
        event_kind,
        target_type,
        target_reference,
        event_details
      )
      values (
        gen_random_uuid(),
        p_action_id,
        resolved_identity_id,
        'identifier_linked',
        'identifier',
        target_reference,
        jsonb_build_object(
          'assurance',
          identifier_record.assurance
        )
      );

      if identifier_record.assurance = 'verified' then
        insert into orbis_identity.identity_audit_events (
          orbis_identity_event_id,
          orbis_action_id,
          orbis_identity_id,
          event_kind,
          target_type,
          target_reference,
          event_details
        )
        values (
          gen_random_uuid(),
          p_action_id,
          resolved_identity_id,
          'identifier_verified',
          'identifier',
          target_reference,
          '{}'::jsonb
        );
      end if;
    elsif identifier_record.assurance = 'verified' then
      if exists (
        select 1
        from orbis_identity.identifiers as identifier_row
        where identifier_row.orbis_identifier_id =
          inserted_identifier_id
          and identifier_row.assurance = 'observed'
      ) then
        update orbis_identity.identifiers
        set
          assurance = 'verified',
          verified_at = now()
        where orbis_identifier_id =
          inserted_identifier_id;

        insert into orbis_identity.identity_audit_events (
          orbis_identity_event_id,
          orbis_action_id,
          orbis_identity_id,
          event_kind,
          target_type,
          target_reference,
          event_details
        )
        values (
          gen_random_uuid(),
          p_action_id,
          resolved_identity_id,
          'identifier_verified',
          'identifier',
          target_reference,
          '{}'::jsonb
        );
      end if;
    end if;
  end loop;

  if local_reference_identity_id is null then
    inserted_reference_id := gen_random_uuid();
    target_reference :=
      source_project_id || ':' ||
      local_entity_type || ':' ||
      local_entity_id;

    insert into orbis_identity.product_references (
      orbis_product_reference_id,
      orbis_identity_id,
      project_id,
      local_entity_type,
      local_entity_id,
      roles
    )
    values (
      inserted_reference_id,
      resolved_identity_id,
      source_project_id,
      local_entity_type,
      local_entity_id,
      source_roles
    );

    insert into orbis_identity.identity_audit_events (
      orbis_identity_event_id,
      orbis_action_id,
      orbis_identity_id,
      event_kind,
      target_type,
      target_reference,
      event_details
    )
    values (
      gen_random_uuid(),
      p_action_id,
      resolved_identity_id,
      'product_reference_linked',
      'product_reference',
      target_reference,
      jsonb_build_object('roles', to_jsonb(source_roles))
    );
  end if;

  select
    identity_row.display_id,
    identity_row.lifecycle
  into
    resolved_display_id,
    resolved_lifecycle
  from orbis_identity.identities as identity_row
  where identity_row.orbis_identity_id =
    resolved_identity_id;

  result_payload := jsonb_build_object(
    'outcome', outcome,
    'orbisIdentityId', resolved_identity_id,
    'displayId', resolved_display_id,
    'lifecycle', resolved_lifecycle,
    'candidateOrbisIdentityIds',
      to_jsonb(candidate_identity_ids),
    'reason', reason,
    'replayed', false
  );

  update orbis_identity.identity_actions
  set
    status = 'completed',
    resolved_orbis_identity_id = resolved_identity_id,
    completed_at = now(),
    result = result_payload
  where orbis_action_id = p_action_id;

  return result_payload;
end;
$$;

alter table orbis_identity.service_keys
  enable row level security;
alter table orbis_identity.service_keys
  force row level security;

revoke all on table orbis_identity.service_keys from public;
revoke all on all functions in schema orbis_identity from public;

comment on table orbis_identity.service_keys is
  'Hashed server-to-server credentials for narrowly scoped identity write clients.';

comment on function orbis_identity.resolve_observation_write(
  uuid,
  jsonb,
  text,
  uuid,
  text
) is
  'Atomically resolves or creates one ORBIS identity with idempotency, audit evidence and product linkage.';

commit;
