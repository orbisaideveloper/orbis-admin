begin;

-- PL/pgSQL raises on names shared by local variables and table columns.
-- These write functions intentionally use the request-local value on the
-- right-hand side of predicates such as source_project_id = source_project_id.
-- Recompile both functions with the per-function conflict policy made explicit.
do $migration$
declare
  function_body text;
begin
  select p.prosrc
    into function_body
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'orbis_identity'
    and p.proname = 'resolve_observation_write_unlocked'
    and pg_get_function_identity_arguments(p.oid) = 'p_action_id uuid, p_request jsonb, p_request_fingerprint text, p_new_identity_id uuid, p_new_display_id text';

  if function_body is null then
    raise exception 'resolve_observation_write_unlocked definition not found';
  end if;

  execute format(
    'create or replace function orbis_identity.resolve_observation_write_unlocked(uuid, jsonb, text, uuid, text) returns jsonb language plpgsql security definer set search_path = pg_catalog as %L',
    E'#variable_conflict use_variable\n' || function_body
  );

  select p.prosrc
    into function_body
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'orbis_identity'
    and p.proname = 'resolve_observation_write'
    and pg_get_function_identity_arguments(p.oid) = 'p_action_id uuid, p_request jsonb, p_request_fingerprint text, p_new_identity_id uuid, p_new_display_id text';

  if function_body is null then
    raise exception 'resolve_observation_write definition not found';
  end if;

  execute format(
    'create or replace function orbis_identity.resolve_observation_write(uuid, jsonb, text, uuid, text) returns jsonb language plpgsql security definer set search_path = pg_catalog as %L',
    E'#variable_conflict use_variable\n' || function_body
  );
end
$migration$;

revoke all on function orbis_identity.resolve_observation_write_unlocked(
  uuid,
  jsonb,
  text,
  uuid,
  text
) from public;
revoke all on function orbis_identity.resolve_observation_write(
  uuid,
  jsonb,
  text,
  uuid,
  text
) from public;

comment on function orbis_identity.resolve_observation_write_unlocked(
  uuid,
  jsonb,
  text,
  uuid,
  text
) is
  'Internal identity write implementation with explicit PL/pgSQL variable precedence.';
comment on function orbis_identity.resolve_observation_write(
  uuid,
  jsonb,
  text,
  uuid,
  text
) is
  'Concurrency-safe identity writer with explicit PL/pgSQL variable precedence.';

commit;
