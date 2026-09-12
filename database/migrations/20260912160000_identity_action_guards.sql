begin;

create function orbis_identity.protect_identity_action_keys()
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
    or new.actor_reference <> old.actor_reference then
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

create function orbis_identity.prevent_identity_action_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'identity actions are never physically deleted';
end;
$$;

create trigger identity_actions_protect_keys
before update on orbis_identity.identity_actions
for each row execute function orbis_identity.protect_identity_action_keys();

create trigger identity_actions_prevent_delete
before delete on orbis_identity.identity_actions
for each row execute function orbis_identity.prevent_identity_action_delete();

revoke all on all functions in schema orbis_identity from public;

comment on function orbis_identity.protect_identity_action_keys() is
  'Preserves idempotency and attributable request context after creation.';

commit;
