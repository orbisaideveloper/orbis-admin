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
8. `docs/V1-SCREEN-PLAN.md` — approved Version 1 owner-dashboard layout and interaction rules.

Do not rely on this file alone for live external state. Before a mutating GitHub, Sonar, Render, Supabase, deployment, or database action, verify the current repository, branch/HEAD, and relevant external resource.

## Repository scope

- GitHub repository: `orbisaideveloper/orbis-admin`
- Local Termux repository: `~/orbis-admin`
- Default/protected branch: `main`
- ORBIS Admin work must not modify another ORBIS repository unless the user explicitly asks for that repository in the current task.

## Verified baseline after PR #3

PR #3, `docs: finalize ORBIS Admin Step 3 architecture and V1 plan`, was squash-merged into `main`.

Verified merge commit:

`3392c5fb37ba1a7293dc3bc3beef9f297b4e8994`

Step 4 implementation is now isolated on `feat/first-admin-scaffold`. The first application-code PR has not yet been opened or merged.

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

The repository is bound to the Admin project only. The first real application code is now being built on `feat/first-admin-scaffold`; the first application-code Sonar analysis will run when that branch is pushed and opened as a PR. Server-side Quality Gate behavior must be verified from that real scan before it is claimed as enforced.

### Render

The confirmed Render workspace is `My Workspace` for the ORBIS Admin setup.

No `orbis-admin` Render service exists yet by design. A Render service and PR Preview must not be created until the first deployable application scaffold exists. Existing services belonging to other ORBIS products are not ORBIS Admin write targets.

### Application/database/auth status

- The first ORBIS Admin application scaffold is now in progress on `feat/first-admin-scaffold`.
- No ORBIS Admin production/staging Render service exists yet.
- No ORBIS Admin application database schema has been implemented yet.
- No ORBIS Admin authentication/SSO implementation has been started yet.
- No product-specific business data belongs in the Admin database.

## Confirmed product vision

The intended product direction is documented in `docs/CONTROL-PLANE-VISION.md`:

1. ORBIS Admin becomes the **single owner/admin control center** for all present and future ORBIS projects.
2. ORBIS Admin also becomes the **central ORBIS user/customer identity registry** so one person keeps one permanent ORBIS identity across products.
3. Customers use their product/app, not the owner dashboard.
4. Product-specific business data remains in each product's own database.
5. ORBIS Admin remains independently deployed and later uses its own dedicated database.
6. New ORBIS projects are onboarded through a registry/integration model rather than custom hard-coded redesign.
7. Older admin/dashboard surfaces stay in service until the new control center has genuinely replaced and verified their required capabilities.

## Canonical five-step roadmap

### Step 1 — GitHub governance and ruleset — COMPLETE

Repository governance, permanent instructions, PR-first delivery, protected `main`, and manual merge policy are established.

### Step 2 — CI and Sonar baseline — COMPLETE

The required `Build, Test & Safety Audit` context, zero-debt CI contract, isolated Sonar project binding, and reporting/toolchain rules are established.

### Step 3 — Pre-code architecture and exact first PR plan — COMPLETE

The owner-control/central-identity vision, first application stack, and Version 1 visual/navigation direction have been reviewed and approved.

Accepted durable decisions now include:

- ADR-012: React/Vite web + Fastify API + shared TypeScript contracts,
- ADR-013: compact card-first owner dashboard, reliable Back/Home navigation, aggregate project-health cards, and distinct mobile/desktop layouts within one maintainable application.

The approved V1 refinements include:

- remove redundant small `Command Center` text above the real Home heading,
- make the primary Projects card shorter/flatter so more cards fit in the first mobile viewport,
- mobile and desktop are intentionally different responsive compositions, not separate codebases,
- every secondary screen has Back + Home,
- browser/device Back follows internal route history,
- project -> project admin area -> exact detail drill-down,
- GitHub Actions/Sonar/Render aggregate state shows which registered project needs attention,
- safe operational values support Copy controls; secrets never do.

Current Step 3 documents:

- `docs/CONTROL-PLANE-VISION.md`
- `docs/FIRST-APPLICATION-PLAN.md`
- `docs/V1-SCREEN-PLAN.md`
- accepted ADR-012 and ADR-013 in `docs/DECISIONS.md`

PR #3 has been merged to `main`; no production application code was part of that planning PR.

### Step 4 — First application scaffold PR — IN PROGRESS

The first deployable ORBIS Admin application scaffold is being implemented on `feat/first-admin-scaffold`.

The first scaffold is an owner-admin shell and delivery foundation. It includes the approved responsive command-center shell, safe demo/read-only navigation, and `/health` API contract, but it must not add real customer data, database writes, authentication, publish/deploy/rollback controls, or live product write integrations.

The first application PR activates the full application quality gate: lint, type-check, tests, 100% aggregate coverage, Knip, JSCPD, dependency audit, production build, smoke verification, and Sonar analysis/Quality Gate.

### Step 5 — Render service and PR Preview — PENDING

After the first application scaffold is accepted and available on `main`, create the independent ORBIS Admin Render service in the confirmed workspace, keep production deployment explicit/manual, configure PR Preview, verify the stable Render check context, and only then consider adding that exact check to the GitHub ruleset.

## What comes after Step 5

Only after the delivery/runtime foundation is stable should implementation move into the control-plane domains, in deliberate architecture PRs:

- owner/admin authentication,
- central ORBIS identity and authentication contract,
- authorization/capability model,
- dedicated Admin database and migrations,
- dynamic product/project registry,
- user-product membership/entitlement model,
- module/model version and publish-state contracts,
- audit log,
- read-only GitHub/Sonar/Render operational visibility,
- carefully permissioned publish/deploy/rollback and other administrative actions.

These are not part of the first scaffold PR.

## Current exact next action

Finish the Step 4 scaffold on `feat/first-admin-scaffold`:

1. complete the approved compact responsive owner dashboard, routing, safe Copy controls, shared health contract, and tests,
2. run targeted local verification for the changed application area,
3. commit and push the feature branch,
4. open the first application-code PR so the full GitHub/Sonar quality gate runs,
5. merge only after required checks are green and the user explicitly accepts the merge.

Do not create the ORBIS Admin Render service until this first deployable scaffold is accepted on `main`.

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
