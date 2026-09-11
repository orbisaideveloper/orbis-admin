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

## ORBIS Admin infrastructure independence — non-negotiable

ORBIS Admin is a fully independent project.

It must have its **own database**, its **own deployment/service**, its **own environment variables/secrets**, and its own application lifecycle. It must never reuse another ORBIS product database as the Admin database merely because that database already exists.

The intended boundary is:

```text
ORBIS Admin
  own Admin database
  own Render service/deployment
  own secrets/configuration
        |
        +-- reads approved status from registered products/integrations
        +-- sends approved administrative actions through explicit APIs

Other ORBIS Products
  each keeps its own database
  each keeps its own deployment/runtime
  each keeps its own domain/business data
```

If Supabase is chosen later for ORBIS Admin, it must be a dedicated ORBIS Admin Supabase project/database rather than an existing product database.

A failure, schema change, migration, or deployment in another ORBIS product must not implicitly become an Admin database/runtime dependency.

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
- Sonar project key/identity,
- supported administrative capabilities,
- integration state,
- ownership/permission metadata.

Not every project must expose every capability. The Admin should show controls only when a project declares and authorizes them.

## What a project card opens

Selecting a project in ORBIS Admin opens that project's **unified Admin detail view inside ORBIS Admin**. It does not blindly embed or clone the old product-specific admin UI.

The unified project detail should collect the project's approved Admin-facing information in one place: overview, modules/models, versions, GitHub Actions, Sonar, Render/deployments, users/memberships, health, and audit/activity.

Where useful, the page may also provide a clear deep-link such as **Open in GitHub**, **Open in SonarQube Cloud**, or **Open in Render**. Those links go to the original provider page, while the ORBIS Admin itself shows the important summary through secure server-side integrations.

## Sonar/GitHub/Render aggregation behavior

The top-level Sonar, GitHub Actions, and Render cards are cross-project views.

They should show data only for projects that are registered and have the required integration identity/configuration. The Admin must not pretend that every repository or external project is automatically connected without configuration.

For example, the Sonar view should eventually:

1. list every registered ORBIS project that has a Sonar project identity,
2. show its Quality Gate/status and useful summary metrics,
3. let the owner select a project for deeper issue/quality details,
4. provide an **Open in SonarQube Cloud** link to the original Sonar project when needed.

The same pattern applies to GitHub Actions and Render: aggregated Admin summary first, project-specific detail second, original provider page available as an explicit deep-link.

## Module/model control requirement

ORBIS Admin should eventually provide a consistent module/model management view across products.

For each module/model, the owner should be able to understand at minimum:

- module/model name,
- owning product,
- current working version,
- published version,
- status,
- review state,
- quality/health state,
- last change.

Future high-risk actions such as Publish, Promote, Rollback, or Disable must be permissioned and audited. In V1 they are absent or visibly disabled/demo-only.

Publish/release buttons must never become decorative shortcuts around repository rules. A publish/deploy action must honor the accepted GitHub, quality, environment, permission, and audit policies.

## Owner dashboard information architecture

The home screen must be a **compact command board**, not a long scrolling report.

The first viewport should present roughly 10–12 small high-value cards/tiles so the owner can understand the important areas at a glance. The exact count can change during visual review, but the principle is fixed: summary first, details after a tap.

Example home cards:

- Projects,
- Modules / Models,
- Central Users,
- GitHub Actions,
- Sonar Quality,
- Render / Deployments,
- Environments,
- Review / Publish Queue,
- Alerts / Incidents,
- API / Service Health,
- Activity / Audit,
- Settings / Integrations.

On mobile, the design should use compact micro-cards and responsive sizing so the command board remains glanceable without becoming a long page. Secondary details belong behind the card, not stacked underneath the home screen.

## Drill-down navigation rule

Navigation should follow a simple hierarchy:

```text
Home Command Center
  -> category card
     -> project or item card
        -> detail
```

Every secondary/detail screen must provide:

- a visible **Back** control for one level up,
- a visible **Home** control for immediate return to the Command Center,
- a clear page title/breadcrumb so the owner always knows where they are.

Nested cards are preferred over one giant scrolling page when the information has a natural hierarchy.

## Copyable admin information rule

Admin work frequently needs identifiers and evidence copied into GitHub, Termux, support/debugging, or another control surface.

Where safe and useful, ORBIS Admin should provide one-tap **Copy** controls for non-secret operational values such as:

- repository name,
- branch,
- commit SHA,
- project/module ID,
- ORBIS display/user ID where authorized,
- service/deployment ID,
- Sonar project key,
- URLs,
- error/reference IDs,
- non-secret diagnostic text.

Never expose or add Copy controls for secrets, passwords, private tokens, service-role keys, or other credential material.

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
- responsive Home/Back navigation,
- a compact 10–12-card Command Center using safe placeholder/demo state,
- drill-down card patterns,
- a project-list visual pattern that is clearly registry-driven,
- project detail shell with GitHub/Sonar/Render integration slots,
- a central-user-registry visual pattern without real customer data,
- status/health visual components,
- safe Copy controls for demo/non-secret values,
- a minimal API `/health` contract,
- quality/test/deploy readiness.

Real authentication, customer records, project integrations, publish controls, databases, and production write actions come later in focused architecture/implementation PRs.

## Non-negotiable end-state tests

Future implementation should always be checked against these questions:

- Can a new ORBIS product be added without redesigning the whole Admin?
- Can the owner see all registered ORBIS products from one place?
- Can each project expose status, modules/models, versions, and supported controls consistently?
- Can GitHub/Sonar/Render summaries be viewed centrally while preserving links to the original provider pages?
- Does one customer keep the same permanent ORBIS identity across products?
- Does ORBIS Admin keep its own independent database and deployment?
- Does product business data remain in the correct product database?
- Are privileged credentials server-side only?
- Are dangerous actions permissioned, confirmed where appropriate, and audited?
- Can older admin systems remain safely in service until the new control center genuinely replaces them?

If the answer to any of these is no, the implementation is drifting away from the intended ORBIS Admin architecture.
