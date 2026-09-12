# ORBIS Admin — Unique Identity Foundation

**Status:** Domain contract and unapplied persistence checkpoint for PR #10

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
3. With no strong identifier, the system may start a `provisional` identity.
4. One unambiguous phone/email match resolves to the existing identity.
5. Multiple matches or a person/organization conflict becomes
   `review_required`; it never auto-merges.
6. Later identifiers and product references accumulate under the same canonical
   identity.
7. An identity can become `active`, `suspended`, or `merged`, but its canonical
   ID is never reassigned.

Names are descriptive evidence, not unique identifiers. Two records are never
automatically merged only because their names match.

## Identifier assurance

An identifier begins as `observed`. A later proof flow may promote it to
`verified`. Authentication and credential proof are separate from identity;
this checkpoint does not add login, passwords, OTP, passkeys, or sessions.

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

## Persistence contract

The dedicated ORBIS Admin database must enforce, at minimum:

- immutable canonical identity ID,
- unique display ID,
- normalized identifier uniqueness according to subject and lifecycle policy,
- idempotent product reference uniqueness,
- additive migrations,
- merge lineage instead of destructive record replacement,
- audit evidence for manual linking, unlinking, verification, and merging.

The additive raw PostgreSQL migration is located at
`database/migrations/20260912150000_identity_foundation.sql`. It defines private
identity, identifier, product-reference, and append-only merge-record tables.
The migration is statically tested but has not been executed against or applied
to any database. Provider selection, disposable SQL validation, narrowly scoped
server roles, and deployment remain separate approval checkpoints.

## Explicitly deferred

- Admin database/provider provisioning and migration application,
- identity write API,
- authentication and authorization,
- customer login UI,
- automatic identity merge,
- production deployment or real customer import.
