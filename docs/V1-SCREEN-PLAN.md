# ORBIS Admin — Version 1 Screen Plan

**Status:** Proposed for Step 3 review

Version 1 is the first visual/admin-shell milestone for the future ORBIS Control Center. It is intentionally a safe shell: it proves the navigation, information architecture, project-registry model, visual system, responsive behavior, and health/status patterns before real authentication, databases, customer records, or production-control actions are connected.

## V1 user

V1 is designed for the ORBIS owner/admin only. It is **not** a customer-facing dashboard.

Customers will later sign in through the ORBIS product they use. Their permanent ORBIS identity will be resolved through the central identity architecture, but they will not use the owner Admin dashboard.

## V1 navigation

The first shell should expose these primary areas:

1. **Command Center** — overall ecosystem dashboard.
2. **Projects** — all registered ORBIS products/projects.
3. **Modules / Models** — module inventory and version/publish state.
4. **Users** — central ORBIS user/customer registry shell.
5. **Health & Quality** — CI, Sonar, service/preview/health summaries.
6. **Activity / Audit** — administrative activity timeline shell.
7. **Settings** — future Admin/system configuration entry point.

Only safe/demo/read-only state appears in V1. Real write controls are added only after authorization, audit, integration, and confirmation rules exist.

## Screen 1 — Command Center

This is the home screen and the most important V1 page.

It should answer quickly:

- How many ORBIS projects are registered?
- How many are healthy, warning, review-needed, or offline?
- Are any required GitHub/CI/Sonar checks failing?
- Are any projects waiting for review or publish?
- How many central ORBIS users/customers exist? (placeholder/demo in V1)
- What changed most recently?
- Which project needs attention now?

### Proposed blocks

- top owner/admin header,
- ecosystem health summary,
- project status cards,
- pending review/publish queue,
- CI/Sonar/Render summary strip,
- central identity/user summary,
- recent activity timeline,
- high-priority alerts.

## Screen 2 — Projects

A registry-driven project list/grid.

Each project card should have a consistent summary pattern:

- product/project name,
- project type/category,
- repository,
- environment summary,
- current version/commit,
- published/live version,
- health state,
- quality/check state,
- modules/models count,
- customer/user count if available,
- integration state.

A new future ORBIS project should be able to appear through registry/configuration instead of requiring a new hard-coded dashboard design.

V1 uses safe placeholder/demo projects only.

## Screen 3 — Project Detail

Selecting a project opens a reusable project detail layout.

Tabs/sections may include:

- Overview,
- Modules / Models,
- Versions / Releases,
- Quality,
- Deployments,
- Users / Memberships,
- Activity.

V1 should visually demonstrate the pattern but not perform real publish/deploy/rollback operations.

## Screen 4 — Modules / Models

Cross-project module/model inventory.

Each row/card should show:

- module/model name,
- owning project,
- current working version,
- published version,
- status,
- review state,
- quality/health state,
- last change.

Future high-risk actions such as Publish, Promote, Rollback, or Disable must be permissioned and audited. In V1 they are absent or visibly disabled/demo-only.

## Screen 5 — Central Users

This page represents the future central ORBIS user/customer registry.

V1 should show the intended information architecture using demo data only:

- ORBIS display ID,
- customer name,
- email,
- phone,
- account status,
- product memberships/access,
- created date,
- last activity summary when available.

The true immutable internal `orbis_user_id` should exist in the later data model even if the UI normally presents a safer human-friendly display ID.

V1 must not implement real customer storage or authentication.

## Screen 6 — Health & Quality

One cross-project quality/operations screen with status cards for:

- GitHub Actions,
- required checks,
- Sonar Quality Gate,
- Render/service health,
- preview/staging/production environment state,
- API health endpoints,
- dependency/security warnings when available.

V1 uses demo/read-only state. Live external integrations come in later focused PRs.

## Screen 7 — Activity / Audit

V1 should establish the visual pattern for a future audit trail.

Each activity item should be able to represent:

- actor,
- action,
- target,
- timestamp,
- outcome,
- environment,
- non-secret context.

V1 uses sample/demo activity only.

## Screen 8 — Settings

V1 contains a simple settings shell for future configuration categories such as:

- Admin profile/security,
- project registry,
- integrations,
- environments,
- notification preferences,
- audit/security policy.

No privileged secret values should be exposed in the browser UI.

## V1 visual direction

The intended design is a premium high-tech command center:

- deep dark background with bright crystalline surfaces,
- glass-like cards with strong separation,
- vivid cyan/blue/violet highlights,
- restrained glow around live/healthy states,
- amber/red emphasis for attention/failure states,
- large readable status numbers,
- smooth rounded geometry,
- compact but spacious information hierarchy,
- responsive mobile-first layout,
- no visual decoration should reduce readability or make dangerous actions ambiguous.

The experience should feel like an operational control room, not a generic admin template.

## V1 safe-action rule

V1 is visually rich but operationally conservative.

Allowed in the first implementation milestone:

- navigation,
- demo/search/filter UI,
- read-only/demo status cards,
- health endpoint demonstration,
- responsive layout,
- testable components,
- empty/loading/error states.

Not allowed in the first implementation milestone:

- real customer login,
- real customer record storage,
- database writes,
- publish/deploy/rollback actions,
- production secrets,
- product write integrations,
- destructive controls.

## V1 completion signal

V1 is successful if the owner can look at the shell and say: "Yes, this is the visual and structural direction for the ORBIS control center," while the codebase also passes the repository's full first-code quality gate.

This visual approval does not itself authorize later identity/database/production-control implementation; those remain separate architecture and implementation steps.
