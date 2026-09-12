# ORBIS Admin Database

This directory contains additive database migrations for ORBIS Admin's own
dedicated PostgreSQL database. It is not a migration target for ORBIS
Foundation, ORBIS Game, or another product database.

## Current state

`migrations/20260912150000_identity_foundation.sql` is the first identity
persistence contract. It is drafted and statically tested but has not been
applied to any local, staging, or production database.

The migration is intentionally fail-closed:

- identity objects live in a private `orbis_identity` schema,
- public privileges are revoked,
- RLS is enabled and forced without premature browser/client policies,
- canonical and display IDs are immutable,
- verified active phone/email ownership is unique,
- observed identifiers may coexist so conflicts can be reviewed safely,
- product references are idempotent by product-local identity,
- merge evidence is append-only from normal SQL mutation paths,
- foreign-key lookup paths are indexed,
- destructive cascades are not used.

## Application rule

The API must generate UUIDv7 values and pass them explicitly. The migration does
not depend on a provider-specific UUIDv7 extension.

Before applying this migration, select and verify a dedicated ORBIS Admin
PostgreSQL database, validate the SQL in a disposable standard-Linux or provider
environment, define narrowly scoped server roles/policies, and preserve a
timestamped Downloads report. Do not run Prisma engines in native Android
Termux.
