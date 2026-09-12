# ORBIS Admin Database

This directory contains additive database migrations for ORBIS Admin's own
dedicated PostgreSQL database. It is not a migration target for ORBIS
Foundation, ORBIS Game, or another product database.

## Current state

`migrations/20260912150000_identity_foundation.sql` and
`migrations/20260912160000_identity_action_guards.sql` are the first identity
persistence checkpoint. They have been reviewed against PostgreSQL 17 /
Supabase, statically tested, and remain unapplied to every database.

This repository deliberately keeps provider-portable source migrations in
`database/migrations`. For the dedicated Supabase project, a later approved
live release must use managed migration operations in timestamp order with the
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

Every future identity write must run server-side in one transaction:

1. establish or replay the idempotent action,
2. mutate the applicable identity/identifier/reference record,
3. record the corresponding append-only audit event,
4. mark the action outcome.

No browser role receives direct access. The later identity API must define
narrowly scoped server database access/policies before any write endpoint is
enabled.

Before applying these migrations, verify the dedicated ORBIS Admin PostgreSQL
target, validate the SQL in a disposable standard-Linux or provider environment,
preserve a timestamped Downloads report, and obtain explicit user approval. Do
not run Prisma engines in native Android Termux.
