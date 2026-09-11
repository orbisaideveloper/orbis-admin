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

## Verified baseline after PR #5

PR #4, `feat: add first ORBIS Admin V1 application scaffold`, is merged.

Verified PR head:

`69883eeaf22e43bdb1aafcf54dddec6cfad51403`

Verified PR #4 merge commit:

`0690ff6421130b13b0da2e49e90dc7aef64efb97`

Verified PR #5 architecture-lock head:

`f425ea876ddcb01256a9ecb6b3fd5f4038d2d9bf`

Verified current `main` after PR #5:

`ca4a30a7d3537a5665cfab7e040da01fb2d5f224`

The merged baseline provides the responsive owner/admin command-center shell, project/category/detail navigation, safe Copy controls, Fastify `/health`, shared contracts, strict application tooling, and the accepted control-plane architecture lock.

### GitHub governance and CI

- `main` remains protected and PR-first.
- manual merge/acceptance remains required.
- the full application quality path is verified on PR #4: lint, TypeScript, tests/coverage, Knip, JSCPD, dependency audit, production build, Sonar Quality Gate, and strict Sonar coverage/duplication gate all passed.

### SonarQube Cloud

Verified project identity remains organization `orbis`, project key `orbisaideveloper_orbis-admin`, project name `orbis-admin`, with `SONAR_TOKEN` held as a GitHub Actions secret.

### Render staging

The authoritative staging service is `orbis-admin-staging` for repository `orbisaideveloper/orbis-admin`, branch `staging`, region Singapore, Auto Deploy OFF, with explicit/manual deployments.

Staging URL: `https://orbis-admin-staging.onrender.com`

The latest reviewed staging artifact is the architecture-lock commit `f425ea876ddcb01256a9ecb6b3fd5f4038d2d9bf`. The public mobile staging UI was reviewed successfully. The service still uses the earlier Vite-preview build/start commands until the Project Registry / Fastify runtime PR is approved for staging.

Current accepted pre-merge flow is:

`feature/docs branch -> PR -> GitHub/Sonar green -> exact approved commit -> staging branch -> manual Render deploy -> staging review -> explicit merge`

Ephemeral per-PR Render previews are not currently required. Production Admin Render setup remains deferred.

### Application/database/auth status

- first application scaffold: merged,
- permanent staging service: live/manual deploy,
- production Admin service: not yet established,
- Admin database: not yet implemented,
- central identity persistence: not yet implemented,
- owner/admin auth/SSO: not yet implemented,
- passkey/WebAuthn: future-ready, implementation deferred,
- privileged provider/product writes: not implemented.

### Known immediate V1 limitations

The current `main` shell still contains static/demo operational state. The in-progress Project Registry branch moves canonical project records to the API, makes the web consume `/api/v1/projects`, and adds a tested same-origin Fastify + React runtime. Live GitHub, Render, Sonar, and product-health adapters are still intentionally not implemented, so provider signals must remain `unknown` until a real adapter supplies validated data.

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

### Step 4 — First application scaffold — COMPLETE

PR #4 is merged and the first V1 owner/admin shell is deployable.

### Step 5 — Staging / delivery foundation — IN PROGRESS

The dedicated `staging` branch and `orbis-admin-staging` manual Render service exist and have been used for pre-merge review.

Current Step 5 delivery slice is the Project Registry + Real Read Model foundation:

1. shared provider-neutral Project Registry contracts,
2. canonical API-side registry,
3. `GET /api/v1/projects`,
4. web reads the registry through the API,
5. same-origin Fastify runtime serves the API and built React application,
6. staging validates the exact approved commit,
7. then read-only providers are added one at a time: GitHub -> Render -> Sonar -> Health -> unified status/alerts.

Do not pull central identity DB implementation, authentication rewrite, Python, or privileged write controls into this slice. Production service/setup remains explicit and deferred until separately approved.

## What comes after the current Step 5 foundation

Implementation proceeds in deliberate phases:

- **Read-only integrations first:** GitHub -> Render -> Sonar -> Health -> unified project status/alerts, with runtime validation and provider normalization at every external boundary.
- **Server-state/observability as the read plane grows:** TanStack Query when live server data needs caching/refetch behavior; structured server instrumentation and later OpenTelemetry; stable OpenAPI contracts when the API surface warrants it.
- **Admin DB / ORBIS Identity:** dedicated Admin DB, UUIDv7 identities, opaque display IDs, memberships, integration metadata and control-plane configuration. Product business data stays in product databases.
- **Authentication / Authorization:** central login/session, scoped capabilities, roles as capability bundles, server-side authorization and append-only audit baseline. Passkey implementation remains a later focused security phase.
- **Controlled actions:** only after read-only/audit boundaries are proven; low-risk mutations first, production publish/deploy later, destructive/security/recovery controls last, with emergency write-disable controls in place.
- **Enterprise hardening:** tamper-evident audit when technically justified, formal metrics/traces, DR drills/RPO/RTO, SBOM/provenance/signing, dependency/license maturity, mature passkey/re-auth flows.

## Current exact next action

Finish the Project Registry / Real Read Model PR from `feat/project-registry-read-model`, get GitHub/Sonar CI green, promote that exact approved commit to the `staging` branch, change the existing `orbis-admin-staging` Render service from Vite preview to the tested root build + Fastify start commands, and run live same-origin smoke checks for `/`, `/health`, `/api/v1/projects`, a deep React route, and a built asset.

After staging is accepted, continue with the first real read-only provider adapter: GitHub.

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
