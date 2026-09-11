# ORBIS Admin — Central Control Plane Vision

**Status:** Step 3 product/architecture definition

This document records the intended end-state of ORBIS Admin so future chats, agents, and contributors understand what is being built before implementation begins.

## One-sentence definition

ORBIS Admin is the **single owner/admin control center and central identity registry for the entire ORBIS ecosystem**.

It is not a customer-facing product, not a copy of every product database, and not another isolated admin page that knows only one ORBIS project.

## The two primary responsibilities

### A. Owner-only Admin Control Center

ORBIS Admin is the main administrative dashboard for the ORBIS owner/operator.

From this one dashboard, the owner should eventually be able to understand and control every ORBIS product that exists today or is added in the future.

The design must therefore be registry-driven and extensible. New ORBIS projects must be able to appear in the Admin without rebuilding a hard-coded dashboard for each one.

The Admin Control Center should eventually provide, according to permission and integration readiness:

- a complete list of ORBIS products/projects,
- project status and health,
- repository and current commit/release information,
- GitHub Actions/CI status,
- Sonar quality status,
- Render/service/deployment status,
- environment status such as preview/staging/production,
- module/model inventory inside each product,
- current version vs published version,
- review/preview state,
- publish/release controls,
- rollback or recovery controls where deliberately supported,
- product-level user/member counts and approved summaries,
- warnings/incidents requiring attention,
- audit history for sensitive administrative actions.

Read-only observability must be established before dangerous write controls. Publish, deploy, rollback, account-state, or other production-impacting actions require stronger authorization, confirmation, and audit logging.

### B. Central ORBIS User / Customer Identity Registry

Every customer who uses an ORBIS product should ultimately map to **one permanent central ORBIS identity**.

The same person must not become unrelated users merely because they use different ORBIS products.

ORBIS Admin therefore owns the canonical customer identity record and the cross-product relationship metadata.

The central identity may contain approved basic customer data such as:

- immutable internal `orbis_user_id`,
- human-friendly ORBIS display ID,
- first name,
- last name,
- email,
- phone,
- account status,
- created/updated timestamps,
- which ORBIS products the customer belongs to or can access,
- high-level membership/entitlement state.

The permanent identity must not be derived from email or phone because those values can change.

Authentication credentials are not ordinary profile data. Passwords must never be stored in plaintext. The eventual authentication design must use an approved authentication mechanism and keep the permanent ORBIS identity contract independent from mutable login attributes.

## Customer login relationship

Customers do **not** use the owner Admin Dashboard.

A customer signs in through the ORBIS product/app they are using. That product trusts or resolves the same central ORBIS identity so the customer remains the same person across ORBIS products.

Conceptually:

```text
                 ORBIS ADMIN
        Central ORBIS Identity Registry
                    |
          one permanent ORBIS ID
                    |
       +------------+------------+
       |            |            |
   Product A     Product B    Future Product
   customer      customer       customer
   profile       profile        profile
```

Each product may have its own local profile row, but it references the same central ORBIS identity.

## Product data boundary

ORBIS Admin owns identity and control-plane metadata. It does **not** absorb every product's operational/business data.

Examples of data that remain in product databases include accounting entries, game progress, inventory, orders, domain transactions, and product-specific configuration unless an explicit architecture decision says otherwise.

This keeps products independently deployable and prevents the Admin database from becoming a fragile monolith.

## Dynamic project registry requirement

The Admin must not assume that the set of ORBIS products is fixed.

A future ORBIS project should be onboarded by creating/updating a project registry record and integration configuration rather than by rewriting the Admin navigation manually.

A project registry record should eventually be able to describe, as applicable:

- project/product ID,
- display name,
- status,
- repository identity,
- default branch,
- product category/type,
- service/deployment identities,
- available environments,
- module/model catalog location,
- health endpoints,
- supported administrative capabilities,
- integration state,
- ownership/permission metadata.

Not every project must expose every capability. The Admin should show controls only when a project declares and authorizes them.

## Module/model control requirement

ORBIS Admin should eventually provide a consistent module/model management view across products.

For each module/model, the owner should be able to understand at minimum:

- module/model name,
- owning product,
- current working version,
- currently published version,
- preview/review state,
- release/publish readiness,
- health/status where applicable,
- last relevant change/release,
- warnings or blocked checks.

Publish/release buttons must never become decorative shortcuts around repository rules. A publish/deploy action must honor the accepted GitHub, quality, environment, permission, and audit policies.

## Owner dashboard design goal

The visual experience should feel like a high-end control room rather than a generic CRUD admin template.

Design direction:

- dark high-contrast foundation,
- crystal/bright glass surfaces,
- vivid status lighting and glow used with restraint,
- clean typography and large readable numbers,
- strong mobile behavior because ORBIS operations are mobile-first,
- clear separation between healthy, warning, failed, review-needed, and offline states,
- fast project switching,
- information-dense desktop layout that collapses cleanly on mobile,
- no visual effect may reduce readability or accessibility.

The design must remain practical: important status and dangerous actions must be clearer than decorative effects.

## Legacy admin/dashboard migration rule

Existing older ORBIS dashboards/admin surfaces may remain while the new ORBIS Admin is being built.

Do not delete or disable an older working admin merely because its replacement has started.

Legacy admin surfaces should be retired only after the new central Admin has equivalent or deliberately superseding capability, required data/integration migration is complete, and the replacement has been verified in production.

## Security and control hierarchy

The owner/admin experience may eventually expose high-impact controls, so the architecture must distinguish:

1. read-only status/observability,
2. low-risk administrative changes,
3. publish/deploy/release actions,
4. identity/access changes,
5. destructive/rollback/recovery actions.

Higher-impact actions require stronger authorization, explicit confirmation when appropriate, and audit records.

## First implementation principle

The first application version must prove the shell and delivery path without pretending the complete control plane already exists.

The first scaffold should therefore establish:

- the owner-admin visual shell,
- responsive navigation,
- a Command Center/dashboard overview using safe placeholder/demo state,
- a project-list visual pattern that is clearly registry-driven,
- a central-user-registry visual pattern without real customer data,
- status/health visual components,
- a minimal API `/health` contract,
- quality/test/deploy readiness.

Real authentication, customer records, project integrations, publish controls, databases, and production write actions come later in focused architecture/implementation PRs.

## Non-negotiable end-state tests

Future implementation should always be checked against these questions:

- Can a new ORBIS product be added without redesigning the whole Admin?
- Can the owner see all registered ORBIS products from one place?
- Can each product expose status, modules/models, versions, and supported controls consistently?
- Does one customer keep the same permanent ORBIS identity across products?
- Does product business data remain in the correct product database?
- Are privileged credentials server-side only?
- Are dangerous actions permissioned, confirmed where appropriate, and audited?
- Can older admin systems remain safely in service until the new control center genuinely replaces them?

If the answer to any of these is no, the implementation is drifting away from the intended ORBIS Admin architecture.
