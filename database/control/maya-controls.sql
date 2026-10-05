-- Reviewed schema source, not an applied migration. Apply only to ORBIS Admin.
-- No owner is automatically enrolled and no write switch is enabled here.
begin;
create schema if not exists orbis_control;
revoke all on schema orbis_control from public, anon, authenticated;
grant usage on schema orbis_control to service_role;
grant usage on schema orbis_identity, auth to service_role;
grant select(orbis_identity_id, lifecycle, subject_kind) on orbis_identity.identities to service_role;
grant select(id, user_id, not_after) on auth.sessions to service_role;

create table orbis_control.owner_bindings (
  auth_user_id uuid primary key,
  orbis_identity_id uuid not null references orbis_identity.identities(orbis_identity_id),
  enabled boolean not null default false,
  capabilities text[] not null default '{}'
);
create table orbis_control.write_switches (
  scope text primary key check (scope in ('global', 'deploy', 'render', 'orbis-maya')),
  enabled boolean not null default false
);
insert into orbis_control.write_switches(scope) values ('global'), ('deploy'), ('render'), ('orbis-maya');
create table orbis_control.maya_actions (
  action_id uuid primary key,
  trace_id text not null check (trace_id ~ '^[0-9a-f]{32}$'),
  auth_user_id uuid not null references orbis_control.owner_bindings(auth_user_id),
  orbis_identity_id uuid not null references orbis_identity.identities(orbis_identity_id),
  revision text not null check (revision ~ '^[0-9a-f]{40}$'),
  project_id text not null default 'orbis-maya' check (project_id = 'orbis-maya'),
  environment text not null default 'development' check (environment = 'development'),
  state text not null default 'requested' check (state in ('requested', 'accepted', 'unknown')),
  deploy_id text,
  created_at timestamptz not null default now()
);
create table orbis_control.maya_audit_events (
  action_id uuid not null references orbis_control.maya_actions(action_id),
  outcome text not null check (outcome in ('requested', 'accepted', 'unknown')),
  deploy_id text,
  recorded_at timestamptz not null default now(),
  primary key(action_id, outcome)
);
create index maya_actions_auth_user_idx on orbis_control.maya_actions(auth_user_id);
create index maya_actions_identity_idx on orbis_control.maya_actions(orbis_identity_id);
alter table orbis_control.owner_bindings enable row level security;
alter table orbis_control.owner_bindings force row level security;
alter table orbis_control.write_switches enable row level security;
alter table orbis_control.write_switches force row level security;
alter table orbis_control.maya_actions enable row level security;
alter table orbis_control.maya_actions force row level security;
alter table orbis_control.maya_audit_events enable row level security;
alter table orbis_control.maya_audit_events force row level security;
revoke all on all tables in schema orbis_control from public, anon, authenticated;
revoke all on all tables in schema orbis_control from service_role;
grant select on orbis_control.owner_bindings, orbis_control.write_switches to service_role;
grant select, insert, update on orbis_control.maya_actions to service_role;
grant select, insert on orbis_control.maya_audit_events to service_role;

create function public.orbis_admin_claim_maya_action(
  p_action_id uuid, p_auth_user_id uuid, p_identity_id uuid, p_revision text, p_session_id uuid, p_trace_id text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare inserted_id uuid;
begin
  if not exists (select 1 from auth.sessions where id = p_session_id and user_id = p_auth_user_id
    and (not_after is null or not_after > now())) then raise exception 'Owner session ended'; end if;
  if not exists (
    select 1 from orbis_control.owner_bindings b
    join orbis_identity.identities i on i.orbis_identity_id = b.orbis_identity_id
    where b.auth_user_id = p_auth_user_id and b.orbis_identity_id = p_identity_id
      and b.enabled and i.lifecycle = 'active' and i.subject_kind = 'person'
      and 'orbis-maya:development:development.deploy' = any(b.capabilities)
  ) then raise exception 'Owner capability denied'; end if;
  if (select count(*) from orbis_control.write_switches where enabled) <> 4
    then raise exception 'Admin writes disabled'; end if;
  insert into orbis_control.maya_actions(action_id, trace_id, auth_user_id, orbis_identity_id, revision)
    values(p_action_id, p_trace_id, p_auth_user_id, p_identity_id, p_revision)
    on conflict(action_id) do nothing returning action_id into inserted_id;
  if inserted_id is null then return false; end if;
  insert into orbis_control.maya_audit_events(action_id, outcome) values(p_action_id, 'requested');
  return true;
end;
$$;

create function public.orbis_admin_finish_maya_action(
  p_action_id uuid, p_outcome text, p_deploy_id text
) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_outcome not in ('accepted', 'unknown') or p_outcome is null then
    raise exception 'Invalid audit outcome';
  end if;
  if (p_outcome = 'accepted' and (p_deploy_id is null or p_deploy_id !~ '^dep-[a-z0-9]+$'))
    or (p_outcome = 'unknown' and p_deploy_id is not null) then
    raise exception 'Invalid deployment identifier';
  end if;
  update orbis_control.maya_actions set state = p_outcome, deploy_id = p_deploy_id
    where action_id = p_action_id and state = 'requested';
  if not found then raise exception 'Action already completed or missing'; end if;
  insert into orbis_control.maya_audit_events(action_id, outcome, deploy_id)
    values(p_action_id, p_outcome, p_deploy_id);
  return true;
end;
$$;

create function public.orbis_admin_read_maya_audit(p_auth_user_id uuid, p_identity_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not exists (
    select 1 from orbis_control.owner_bindings b
    join orbis_identity.identities i on i.orbis_identity_id = b.orbis_identity_id
    where b.auth_user_id = p_auth_user_id and b.orbis_identity_id = p_identity_id
      and b.enabled and i.lifecycle = 'active' and i.subject_kind = 'person'
      and 'orbis-maya:development:audit.read' = any(b.capabilities)
  ) then raise exception 'Owner capability denied'; end if;
  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb) into result from (
    select a.action_id, a.trace_id, a.orbis_identity_id, a.revision, a.project_id, a.environment,
      a.state, a.deploy_id, a.created_at, e.outcome, e.recorded_at
    from orbis_control.maya_actions a join orbis_control.maya_audit_events e using(action_id)
    order by e.recorded_at desc, a.action_id desc limit 100
  ) recent;
  return result;
end;
$$;
revoke all on function public.orbis_admin_claim_maya_action(uuid, uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.orbis_admin_finish_maya_action(uuid, text, text) from public, anon, authenticated;
revoke all on function public.orbis_admin_read_maya_audit(uuid, uuid) from public, anon, authenticated;
grant execute on function public.orbis_admin_claim_maya_action(uuid, uuid, uuid, text, uuid, text) to service_role;
grant execute on function public.orbis_admin_finish_maya_action(uuid, text, text) to service_role;
grant execute on function public.orbis_admin_read_maya_audit(uuid, uuid) to service_role;
commit;
