# ORBIS Admin Database

This directory contains additive database migrations for ORBIS Admin's own
dedicated PostgreSQL database. It is not a migration target for ORBIS
Foundation, ORBIS Game, or another product database.

## Current state

The dedicated Admin Supabase project `aqcwhqdzniruvoqwfsij` has applied identity
persistence and write-API migrations. The previously stated universal
"unapplied" status is historical and no longer current. The active
`orbis-identity-write` Edge Function is an identity API, not Maya membership.

Recorded provider history:

| Version | Name |
| --- | --- |
| 20260913031628 | identity_foundation |
| 20260913031638 | identity_action_guards |
| 20260913095616 | identity_write_api |
| 20260913095631 | identity_write_api_concurrency |
| 20260913100235 | identity_write_api_variable_scope |

These timestamps differ from repository SQL source filenames. Do not rerun
existing migrations or rewrite recorded history to match filenames.
`control/maya-controls.sql` remains pending application; the last database
inspection found no `orbis_control` schema.

This repository deliberately keeps provider-portable source migrations in
`database/migrations`. For future dedicated Supabase schema releases, use managed migration
operations in timestamp order with the
exact versioned SQL and then verify the recorded migration state. Do not paste
these migrations into a general SQL editor or apply them to a Foundation
database.

The migrations are intentionally fail-closed:

- identity objects live in a private `orbis_identity` schema,
- public privileges and future default public grants are revoked,
- RLS is enabled and forced without premature browser/client policies,
- canonical and display IDs are immutable and display prefixes match subject kind,
- verified active phone/email ownership is unique,
- observed identifiers may coexist so conflicts can be reviewed safely,
- only a matching **verified** identifier may produce automatic resolution,
- request actions are idempotent per source project and request key,
- create/link/verify/revoke/merge evidence has an append-only audit structure,
- product references preserve history through revocation rather than deletion,
- a merge requires matching immutable merge and audit evidence,
- foreign-key lookup paths are indexed, and destructive cascades are not used.

## Application rule

The API must generate UUIDv7 values and pass them explicitly. The migrations do
not depend on a provider-specific UUIDv7 extension.

Every identity mutation must preserve the server-side transaction contract:

1. establish or replay the idempotent action,
2. mutate the applicable identity/identifier/reference record,
3. record the corresponding append-only audit event,
4. mark the action outcome.

No browser role receives direct identity access. The existing Edge Function
reads `SUPABASE_DB_URL` in its server environment and validates a product service
key before calling identity write logic. Foundation calls it through
`ORBIS_IDENTITY_WRITE_URL`, `ORBIS_IDENTITY_SERVICE_KEY`, and `ORBIS_PROJECT_ID`.
A working API integration does not imply that an Admin SQL URI is present in
Termux; API credentials are not migration credentials.

## Pending Maya control application

Verify the Admin project and existing managed history, preserve a recoverable
backup, validate the exact control SQL in the approved disposable/provider
workflow, record application through that workflow, and verify tables, forced
RLS, RPC grants and disabled write switches. Do not apply it to Foundation.
Schema creation does not enroll an owner or enable writes. Verify live owner
auth UUID, canonical person binding and server configuration independently.
No control migration or owner enrollment is performed by the docs patch.

Before applying these migrations, verify the dedicated ORBIS Admin PostgreSQL
target, validate the SQL in a disposable standard-Linux or provider environment,
preserve a timestamped Downloads report, and obtain explicit user approval. Do
not run Prisma engines in native Android Termux.
