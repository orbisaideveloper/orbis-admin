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

## Locked control-plane architecture extensions

### Canonical ORBIS identifiers

ORBIS-owned canonical internal identifiers use UUIDv7 where a durable entity identifier is required. The direction applies to `orbis_user_id`, `orbis_project_id`, `orbis_module_id`, `orbis_deployment_id`, `orbis_audit_id`, and `orbis_action_id`.

These IDs are immutable and are not derived from mutable email, phone, username, device, password, or credential data. A separate opaque display reference such as `ORB-U-7K4M92QX` may be shown to people, but it is not the relational identity.

Provider-native identities remain separate fields. GitHub repository identity, Render service ID, Sonar project key, and future provider IDs are not replaced by ORBIS UUIDs. Observability `trace_id` is also separate from `orbis_action_id`.

### Identity is separate from authentication

The permanent ORBIS identity survives authentication changes. Password, passkey/WebAuthn, recovery, device, or future federated credentials are credentials associated with `orbis_user_id`, not the identity itself.

The architecture must remain passkey-ready, but passkey registration, credential creation, login UI, and production passkey enablement are explicitly deferred to a dedicated authentication/security PR.

### Scoped capability authorization

Roles are capability bundles, not the final authorization decision by themselves. Sensitive code checks the required capability plus relevant project/resource/environment scope.

Example capabilities include `projects.read`, `projects.manage`, `users.read`, `identity.manage`, `deployments.read`, `deployments.execute`, `release.publish`, `release.rollback`, `integrations.manage`, and `audit.read`.

### Privileged action boundary

Privileged writes follow:

`Admin UI -> Admin API -> authentication -> authorization/policy -> risk/confirmation -> action executor -> provider/product adapter -> provider/product -> normalized result -> audit/action record`

The browser never performs privileged GitHub, Render, Sonar, database, identity, deploy, publish, rollback, or recovery writes directly.

### Registry and adapter boundary

The project registry is a core domain rather than a permanent hard-coded list. A registered project may carry ORBIS project ID, display name, repository/default branch, Render service/environment IDs, Sonar project identity, health endpoint, environments, supported capabilities, module/model catalog, and integration status.

Provider/product-specific behavior should live behind small server-side boundaries when implemented, for example GitHub, Render, Sonar, product, and identity adapters. This does not require a large generic framework during the current delivery phase.

### Read-only-first and risk levels

Implementation order remains:

`registry -> health/status -> GitHub read-only -> Sonar read-only -> Render read-only -> audit visibility -> low-risk controls -> publish/deploy -> rollback/destructive/security/recovery`

Risk levels are:

1. read-only,
2. low-risk mutation,
3. production-impacting,
4. identity/security/destructive/recovery.

Higher levels require progressively stronger capability, confirmation, re-authentication or equivalent strong confirmation where appropriate, and durable audit evidence. Dangerous buttons are not shipped before their security boundary exists.

### Audit and correlation

The first audit implementation is append-only from the application perspective and prevents ordinary application update/delete paths for audit history. Do not claim cryptographic immutability or tamper evidence until those guarantees are technically implemented and verified.

Audit/action records should capture actor/permanent identity, timestamp, action, target, relevant previous/requested/result state, success/failure, source environment, confirmation context, and `orbis_action_id`. `trace_id` remains a separate observability concern. Audit logs never store privileged secrets.

### Emergency write-disable controls

Before the first provider/product write capability is enabled, the server must support fail-closed write disable controls for global external writes plus narrower deploy/publish, identity-mutation, provider, and project-integration scopes while keeping read-only observability available.

### API and contract versioning

Long-lived business/control-plane HTTP APIs use a versioned namespace such as `/api/v1/...`. The basic `/health` endpoint may remain unversioned. Shared inter-product/provider contracts and asynchronous event schemas carry explicit schema/contract versions.

### Backup and recovery prerequisite

Before central identity/control data becomes production-critical, define and verify backup policy, restore verification, migration rollback/recovery, recovery ownership, RPO/RTO targets, and identity corruption/reconciliation strategy. Backup existence alone is not enough; restore must be testable.

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
