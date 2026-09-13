begin;

create function orbis_identity.resolve_observation_write_safe(
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
  existing_action orbis_identity.identity_actions%rowtype;
begin
  if source_project_id is null or idempotency_key is null then
    raise exception 'identity_request_invalid';
  end if;

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
    if existing_action.request_fingerprint <> p_request_fingerprint then
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

  return orbis_identity.resolve_observation_write(
    p_action_id,
    p_request,
    p_request_fingerprint,
    p_new_identity_id,
    p_new_display_id
  );
end;
$$;

revoke all on function orbis_identity.resolve_observation_write_safe(
  uuid,
  jsonb,
  text,
  uuid,
  text
) from public;

comment on function orbis_identity.resolve_observation_write_safe(
  uuid,
  jsonb,
  text,
  uuid,
  text
) is
  'Serializes identical idempotency keys before resolving or creating an ORBIS identity.';

commit;
