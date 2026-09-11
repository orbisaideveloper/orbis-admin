# ORBIS Admin — Project State and Session Handoff

This file is the canonical current-state handoff for future chats, coding agents, and contributors. It is intentionally concise enough to read at the start of every ORBIS Admin work session.

**Last updated:** 2026-09-11

## Session-start rule

Before proposing or performing ORBIS Admin work, read these files in this order:

1. `AGENTS.md` — permanent operating rules.
2. `docs/PROJECT-STATE.md` — current phase, completed work, and exact next step.
3. `docs/CONTROL-PLANE-VISION.md` — intended end-state of the owner control center and central ORBIS identity registry.
4. `docs/ARCHITECTURE.md` — system boundaries.
5. `docs/DECISIONS.md` — durable architecture decisions.
6. `docs/QUALITY-GATES.md` — CI, coverage, Sonar, and preview requirements.
7. `docs/FIRST-APPLICATION-PLAN.md` — Step 3/Step 4 implementation plan.
8. `docs/V1-SCREEN-PLAN.md` — proposed Version 1 owner-dashboard screens and safe visual scope.

Do not rely on this file alone for live external state. Before a mutating GitHub, Sonar, Render, Supabase, deployment, or database action, verify the current repository, branch/HEAD, and relevant external resource.

## Repository scope

- GitHub repository: `orbisaideveloper/orbis-admin`
- Local Termux repository: `~/orbis-admin`
- Default/protected branch: `main`
- ORBIS Admin work must not modify another ORBIS repository unless the user explicitly asks for that repository in the current task.

## Verified baseline after PR #2

PR #2, `ci: establish ORBIS Admin zero-debt PR quality baseline`, was squash-merged into `main`.

Verified merge commit:

`3cc1242abce249886455629d2e9d1c805451d316`

The local Termux `main` and `origin/main` were verified at the same commit after merge.

### GitHub governance

- `main` is protected through the active `Protect main` ruleset.
- Pull requests are required.
- Review-thread resolution is required.
- Force-pushes and deletion of `main` are blocked.
- Required GitHub Actions context: `Build, Test & Safety Audit`.
- Required-check policy uses strict branch-up-to-date enforcement.
- Merge acceptance remains explicit/manual; auto-merge is not the default workflow.

### CI and quality baseline

The repository contains `.github/workflows/pr-checks.yml`.

While the repository is governance/documentation-only, the workflow performs governance, Sonar-project isolation, and sensitive-file checks.

When application code exists, the workflow switches automatically to the full quality contract. The first application PR must satisfy the exact requirements in `docs/QUALITY-GATES.md` and `docs/FIRST-APPLICATION-PLAN.md`.

### SonarQube Cloud

Verified project identity:

- organization: `orbis`
- project key: `orbisaideveloper_orbis-admin`
- project name: `orbis-admin`
- GitHub Actions secret name: `SONAR_TOKEN`

The repository is bound to the Admin project only. Actual application-code Sonar analysis has not yet run because no application code exists. Server-side Quality Gate behavior must be configured/verified in SonarQube Cloud before it is claimed as enforced.

### Render

The confirmed Render workspace is `My Workspace` for the ORBIS Admin setup.

No `orbis-admin` Render service exists yet by design. A Render service and PR Preview must not be created until the first deployable application scaffold exists. Existing services belonging to other ORBIS products are not ORBIS Admin write targets.

### Application/database/auth status

- No ORBIS Admin application scaffold exists yet.
- No ORBIS Admin production/staging Render service exists yet.
- No ORBIS Admin application database schema has been implemented yet.
- No ORBIS Admin authentication/SSO implementation has been started yet.
- No product-specific business data belongs in the Admin database.

## Confirmed product vision

The intended product direction is now documented in `docs/CONTROL-PLANE-VISION.md`:

1. ORBIS Admin becomes the **single owner/admin control center** for all present and future ORBIS projects.
2. ORBIS Admin also becomes the **central ORBIS user/customer identity registry** so one person keeps one permanent ORBIS identity across products.
3. Customers use their product/app, not the owner dashboard.
4. Product-specific business data remains in each product's own database.
5. New ORBIS projects must be onboardable through a registry/integration model rather than requiring a custom hard-coded dashboard redesign.
6. Older admin/dashboard surfaces stay in service until the new control center has genuinely replaced and verified their required capabilities.

## Canonical five-step roadmap

### Step 1 — GitHub governance and ruleset — COMPLETE

Repository governance, permanent instructions, PR-first delivery, protected `main`, and manual merge policy are established.

### Step 2 — CI and Sonar baseline — COMPLETE

The required `Build, Test & Safety Audit` context, zero-debt CI contract, isolated Sonar project binding, and reporting/toolchain rules are established.

### Step 3 — Pre-code architecture and exact first PR plan — IN PROGRESS

The owner-control/central-identity vision is documented. The proposed first application architecture and Version 1 screen plan are now under review.

Current Step 3 documents:

- `docs/CONTROL-PLANE-VISION.md`
- `docs/FIRST-APPLICATION-PLAN.md`
- `docs/V1-SCREEN-PLAN.md`
- proposed ADR-012 in `docs/DECISIONS.md`

No production application code is being added in this planning PR.

### Step 4 — First application scaffold PR — PENDING

After Step 3 is accepted and merged, create the first deployable ORBIS Admin application scaffold on a new feature branch. The PR must activate and pass the full application quality gate.

The first scaffold is an owner-admin shell and delivery foundation. It may contain safe demo/read-only dashboard state and the `/health` API contract, but it must not add real customer data, database writes, authentication, publish/deploy/rollback controls, or production integrations.

### Step 5 — Render service and PR Preview — PENDING

After the first application scaffold is accepted and available on `main`, create the ORBIS Admin Render service in the confirmed workspace, keep production deployment explicit/manual, configure PR Preview, verify the stable Render check context, and only then consider adding that check to the GitHub ruleset.

## What comes after Step 5

Only after the delivery/runtime foundation is stable should implementation move into the control-plane domains, in deliberate architecture PRs:

- owner/admin authentication,
- central ORBIS identity and authentication contract,
- authorization/capability model,
- Admin database and migrations,
- dynamic product/project registry,
- user-product membership/entitlement model,
- module/model version and publish-state contracts,
- audit log,
- read-only GitHub/Render operational visibility,
- carefully permissioned publish/deploy/rollback and other administrative actions.

These are not part of the first scaffold PR.

## Current exact next action

Review the proposed Version 1 dashboard information architecture and visual direction. The owner should decide whether the V1 shell feels like the correct ORBIS command center and request any layout/screen changes.

Do **not** start production application code until that review is complete. After visual/structural approval, finalize Step 3, mark the durable first-stack decision accepted, merge the planning PR manually after required checks are green, sync local `main`, and start Step 4 on a new feature branch.

## Handoff/update discipline

Update this file in the same PR whenever any of the following materially changes:

- roadmap step status,
- required GitHub check names or ruleset behavior,
- first application architecture,
- owner-control/central-identity vision,
- Version 1 screen scope,
- Sonar project/gate status,
- Render service/preview status,
- database/auth implementation status,
- the exact next action.

A future chat should never have to reconstruct the project phase from scattered messages when the durable state can be recorded here.
