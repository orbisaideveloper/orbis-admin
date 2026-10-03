# Maya owner controls — implementation and enablement

This candidate adds Google PKCE owner login, tab-scoped session restoration,
server-side verified identity and capability checks, development deployment
confirmation, and a durable PostgreSQL audit adapter. It does not certify live
owner access, deploy a public Maya release, or connect Foundation AI.

## Trust boundary

The browser holds only Supabase public configuration and its own owner session.
Google OAuth uses PKCE through the existing Supabase authority. Session storage
is scoped to the Admin tab; logout clears controls and Supabase local session.
Each administrative request verifies the access token remotely. Email,
`user_metadata`, and browser role flags never grant authority.

An operator-managed binding maps the verified Supabase auth UUID to the immutable
canonical ORBIS UUIDv7 identity. Both the server binding and the private database
binding must permit the exact Maya development capability. Ordinary Maya users
are not enrolled as Admin owners. No automatic first-user/first-email promotion
exists. Current registered product users remain intact.

## Configuration

Server variables:

- `ORBIS_ADMIN_SUPABASE_URL`: the verified Admin Supabase origin.
- `ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY`: public key only; a legacy anon JWT is
  supported. Secret/service-role keys are rejected by the public config endpoint.
- `ORBIS_ADMIN_OWNER_BINDINGS`: JSON array of `authUserId`, `orbisIdentityId`,
  and exact `capabilities`; never derive these bindings from a requested email.
- `ORBIS_ADMIN_SUPABASE_SERVICE_KEY`: server-only credential for the audit RPCs.
- `ORBIS_RENDER_TOKEN`: server-only provider credential.
- `ORBIS_GITHUB_TOKEN`: optional server-only token for exact Maya main lookup.

The only initial capabilities are
`orbis-maya:development:development.deploy` and
`orbis-maya:development:audit.read`.

All four server write switches must explicitly equal `enabled`:
`ORBIS_ADMIN_WRITES`, `ORBIS_ADMIN_DEPLOY_WRITES`, `ORBIS_ADMIN_RENDER_WRITES`,
and `ORBIS_ADMIN_MAYA_WRITES`. The corresponding four private database switches
must also be enabled. Missing configuration fails closed. Disabling writes does
not disable the existing project registry, workspace views or audit reads.

## Database and audit

`database/control/maya-controls.sql` is reviewed schema source, not an applied
migration. Record its application through the existing Admin database workflow
after source verification. It creates private `orbis_control` tables with forced
RLS and no browser grants. RPC functions are SECURITY INVOKER with fixed empty
search paths and execute grants restricted to the server role. Table permissions
are explicit; audit events grant insert/read but not update/delete.

No owner is inserted and no switch is enabled by schema creation. Enrolment
requires an independently verified live owner auth UUID and active canonical
person identity. The audit claim checks the actual `auth.sessions` row so a
logged-out/revoked/expired session cannot submit a provider write.

Audit intent commits before any provider write. Records carry an independent
trace ID, UUIDv7 action ID, canonical actor, fixed project/environment, exact
commit, database time, deployment identifier and outcome. This is append-only
application audit, not cryptographic tamper evidence. No Dream/Chat/Astro history
or provider credentials enter this database.

## Development deployment

Only the registered `orbis-maya-development` static service is addressable.
The server verifies repository, main branch, service type, disabled auto-deploy,
and exact current Maya main revision before submitting Render's pinned-commit
deploy request. The browser cannot supply a provider URL, service ID, project,
environment or repository command.

A one-use confirmation is bound to owner and commit, expires after 90 seconds,
and is bounded to 100 pending entries. Expired/replayed confirmations, revoked
capabilities and disabled switches prevent execution. Restart loses pending
confirmations safely; persisted action IDs prevent duplicate provider writes.

Provider timeouts/malformed acknowledgements leave an unknown/pending outcome.
Do not automatically retry; reconcile the action with Render. An accepted request
is not a LIVE deployment. A durable outcome-write failure is not reported as
success. Audit intent and provider calls cannot share a distributed transaction.

Public publishing remains disabled until a separately approved green release,
production target, stronger release policy and production verification exist.

## Verification and remaining live enablement

Targeted unit/UI security checks, lint/type-check and production dependency audit
are run during preparation. Full coverage and Linux certification run only in
the owner's Termux/proot environment. Exact-head staging, Sonar and CI remain
required before merge.

Rollback-only database assertions verify restricted RPC grants, disabled default
switches, live-session requirement, intent/outcome records, idempotency and
append-only grants. All temporary fixtures roll back; no live owner is created.

Live enablement still requires Google provider/redirect configuration, first
verified owner sign-in, explicit canonical binding, server-only audit/provider
credentials, schema application and real mobile login/deploy/audit verification.
Do not describe these as completed from mock tests or prepared source alone.

## Static analysis scope

The owner client pins its Supabase origin to the verified Admin authority and
rejects configuration for any other origin before SDK initialization.
The existing declarative SQL literal exception (PLSQL S1192 only) also applies
to the exact Maya control schema source: repeated lifecycle/scope values in
DDL constraints and RPC policy predicates are intentional. SQL remains
quality/security scanned; no security rule is suppressed.
