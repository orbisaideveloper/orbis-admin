# ORBIS Admin Architecture

## System role

ORBIS Admin is the central control plane for the ORBIS ecosystem. It provides one administrative view across independently deployed ORBIS products while preserving strong data and deployment boundaries between those products.

## Primary domains

### 1. Identity

The control plane owns the canonical ORBIS identity record.

A user's permanent identifier must be immutable and must not be derived from mutable fields such as email address or phone number. Email and phone are attributes of an identity, not the identity itself.

A human-friendly ORBIS display ID may be layered on top of the internal immutable identifier.

### 2. Product and project registry

The control plane maintains a registry describing ORBIS products and their operational resources, for example:

- product/project name,
- repository identity,
- deployment/service identity,
- environment classification,
- health/status metadata,
- administrative ownership/permissions.

The registry is metadata. It does not absorb the product's domain database.

### 3. User-product relationship

The control plane records which ORBIS products a user can access or currently uses. Product-specific profiles and business records remain in the product database.

Conceptually:

```text
Central ORBIS Identity
        |
        +-- Foundation membership/access
        +-- Game membership/access
        +-- Future product membership/access
```

### 4. Operational observability

ORBIS Admin may aggregate high-level operational signals such as:

- deployment state,
- repository/commit information,
- CI/check status,
- service health,
- product-level user counts or other approved summaries.

Prefer live API reads, purpose-built summaries, or explicit synchronization contracts over broad database replication.

### 5. Administrative actions

Operational actions may include approved controls such as triggering a deployment or changing an account state. They must be separated from read-only visibility and protected with least-privilege authorization.

Destructive or production-impacting actions should require stronger authorization, explicit confirmation where appropriate, and audit logging.

## Database boundaries

The intended topology is:

```text
                        ORBIS Admin
                     Central Control DB
                           |
        +------------------+------------------+
        |                  |                  |
 ORBIS Foundation      ORBIS Game       Future ORBIS App
   own database         own database        own database
```

The databases are independent. ORBIS Admin may know that a user participates in a product, but it does not own the detailed business records for that product.

### Example identity linkage

```text
ORBIS Admin
  internal_user_id = immutable UUID
  display_orbis_id = ORB-000001

Foundation DB
  local_profile_id = ...
  orbis_user_id    = <same immutable central ID>

Game DB
  player_profile_id = ...
  orbis_user_id     = <same immutable central ID>
```

Cross-database foreign keys are not assumed. Integration should use explicit identifiers and service contracts.

## Authentication direction

The long-term authentication model should allow ORBIS products to trust a central ORBIS identity authority rather than creating unrelated credentials independently in every product.

Implementation may begin with a suitable managed authentication platform, but product applications should depend on stable ORBIS identity contracts rather than vendor-specific assumptions wherever practical.

## Integration boundaries

### GitHub

Use secure server-side integration to read repository status and, where explicitly authorized, perform operational actions. Never expose privileged GitHub credentials to the client.

### Render

Use secure server-side integration for deployment/service status and approved operational actions. Separate staging and production controls and permissions.

### Supabase / database providers

Treat each application's database as an independently protected resource. Service-role or administrative keys never belong in browser code.

## Authorization model

Design permissions around capabilities rather than a single unrestricted administrator flag. A future model may distinguish, for example:

- read-only observer,
- user/identity operator,
- deployment operator,
- security administrator,
- owner/super-administrator.

High-risk capabilities should remain narrowly assigned.

## Audit model

Sensitive control-plane activity should be attributable. An audit record should normally answer:

- who acted,
- what action was requested,
- what target was affected,
- when it happened,
- whether it succeeded,
- relevant non-secret context.

Audit logs should not store secrets.

## Deployment model

ORBIS Admin is deployed independently from every ORBIS product. A failure or deployment of ORBIS Admin should not inherently take down Foundation, Game, or future product services.

## Change path

The expected repository lifecycle is:

```text
branch
  -> pull request
  -> preview / targeted verification
  -> review
  -> merge to main
  -> production deployment
```

GitHub rulesets and CI should enforce the parts of this lifecycle that can be mechanically enforced.

## Explicit non-goals

ORBIS Admin should not become:

- a copy of every ORBIS product's database,
- a dumping ground for shared business logic,
- a client-side holder of infrastructure secrets,
- a shortcut around product authorization boundaries,
- a single deployment artifact containing all ORBIS applications.
