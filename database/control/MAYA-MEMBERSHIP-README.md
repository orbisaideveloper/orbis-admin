# Maya customer AI membership

## Verified live checkpoint: 2026-10-11

Read-only inspection of Admin project `aqcwhqdzniruvoqwfsij` found applied
migrations `20261007055623` (maya_membership_scoped_service_access) and
`20261007062443` (maya_authenticated_user_onboarding), both membership tables,
forced RLS, and ACTIVE `orbis-maya-access` version 2 with verify_jwt=false.
Custom product-service-key authentication remains enforced inside the function.
This supersedes the older statement that membership was not applied/deployed.
It does not certify a real customer allow/deny/revocation or provider request.

Current deployed onboarding permits active OR provisional canonical person
identities linked to an unrevoked product reference. Enrollment requires a
registered, non-revoked key with enroll_users=true and matching auth issuer.
Revoked references and existing disabled grants are not replaced automatically.
This customer-AI policy gives no Admin owner, accounting or deployment authority.
Do not change it silently to active-only and interrupt existing customer access.
No email/name matching is used to auto-enroll users.

The endpoint accepts POST JSON <=4096 bytes and exact maya.access.v1 fields;
no browser CORS is enabled. Missing tables, failed lookups and unavailable DB
fail closed. No transcripts, birth details or provider secrets enter these tables.

## Source recovery and deployment

`maya-service-keys.schema-snapshot.sql` reconstructs the observed service-key
schema for review/disposable database setup. It contains no key values, seeds,
account rows or enrollment enabling UPDATE. It is NOT the original migration.
The existing migration history is authoritative. Do NOT run the source SQL
against the live Admin database again or record these existing objects as a new
production migration. Validate any future additive migration separately first.
Foundation accounting is outside this change and outside this SQL target.
