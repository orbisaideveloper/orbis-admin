# ORBIS Admin — Unique Identity Foundation

**Status:** Central identity persistence is applied and the identity-write API
exists in the dedicated Admin project. Maya control migration/live enablement
remain separate pending work. See `database/README.md` for recorded history.

## Goal

One real-world subject keeps one permanent ORBIS identity while information,
product participation, and trusted identifiers accumulate over time. A new
product must reuse this central identity contract instead of inventing a new
unrelated user key.

## Subject boundary

The registry distinguishes a person from an organization. A customer, worker,
seller, or accounting party may be either. Sharing a phone number does not allow
the system to silently turn an organization into a person or vice versa.

- people use the human-facing `ORB-U-...` display prefix,
- organizations use the human-facing `ORB-O-...` display prefix,
- both use an immutable UUIDv7 canonical identifier internally,
- display IDs are opaque convenience references and are not relational keys.

The universal database/API field is `orbis_identity_id` because the subject can
be either a person or an organization. A person's permanent ORBIS user identity
is represented by that same canonical value; this avoids creating two competing
permanent IDs for one person.

## Progressive identity lifecycle

1. A product observes a subject and supplies its local reference and role.
2. Phone and email are normalized at the server boundary.
3. With no verified strong identifier, the system starts a `provisional`
   identity.
4. Only one unambiguous **verified** phone/email match to an `active` identity
   resolves automatically.
5. An observed-only input, multiple matches, a suspended identity, a broken
   redirect, or a person/organization conflict becomes `review_required`;
   it never auto-merges.
6. Later identifiers and product references accumulate under the same canonical
   identity.
7. An identity can become `active`, `suspended`, or `merged`, but its
   canonical ID is never reassigned.

Names are descriptive evidence, not unique identifiers. Two records are never
automatically merged only because their names match.

## Identifier assurance

An identifier begins as `observed`. A later trusted proof flow may promote it
to `verified`. Automatic resolution requires verification on the incoming
observation and on the matching registry identifier. Authentication and
credential proof are separate from identity; this checkpoint does not add
login, passwords, OTP, passkeys, or sessions.

Phone normalization never guesses a country. A product can provide an explicit
default country calling code for a local-format number. International numbers
retain their explicit `+` prefix.

## Product relationship

Each product keeps its own business row and records an explicit reference:

- central ORBIS identity ID,
- ORBIS project ID,
- local entity type and local entity ID,
- one or more product-local roles.

There are no cross-database foreign keys. Product systems integrate through
versioned API/event contracts and remain independently deployable.

## Persistence and write contract

The dedicated ORBIS Admin database enforces, at minimum:

- immutable canonical identity ID and display ID,
- subject-kind/display-prefix alignment,
- verified active phone/email uniqueness,
- idempotent action records keyed by source project and request key,
- append-only identity audit events,
- product-reference history via revocation instead of destructive replacement,
- a recorded, audited, active-target-only merge path,
- additive migrations and indexed foreign-key lookup paths.

The server-side Identity API processes each mutation with transactional database
logic. Preserve this contract for future changes:
create or replay its idempotent action, perform the allowed mutation, write the
audit evidence, and store the outcome. Event details must not contain secrets or
raw identifiers.

The versioned PostgreSQL source begins at
`database/migrations/20260912150000_identity_foundation.sql`. The dedicated Admin
Supabase migration history records the applied identity foundation, guards and
write-API increments. Existing migrations must not be reapplied. Source filenames
and provider history timestamps differ; preserve the actual managed history.
The deployed Edge Function uses server-side `SUPABASE_DB_URL`; products call its
explicit API rather than joining the Admin database directly.

## Explicitly deferred

- Maya owner-control schema application and live enablement,
- public Maya membership/capability endpoint and live AI authorization,
- complete customer login integration and real-account verification,
- automatic identity merge (never infer permission from matching names),
- separate Admin production deployment and verified Public Maya release.

Identity persistence/API completion is not authentication or membership completion.
