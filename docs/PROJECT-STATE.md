# ORBIS Admin — Project State and Session Handoff

This file is the canonical current-state handoff for future chats, coding agents, and contributors. It is intentionally concise enough to read at the start of every ORBIS Admin work session.

**Last updated:** 2026-09-12

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

## Verified baseline after PR #9

PR #9, `Render Read Provider`, is merged. Its verified head was
`7d39fb4765f072f424bd7cd53b1e041c3c77b9c4`; the verified merge commit and
current `main` baseline is `de15ed0ec71774b9faccbfb00f6bd2b44588d6c1`.
The post-merge main workflow run `34696160934` completed successfully, and the
Termux local `main` was verified clean and synchronized to the same merge SHA.

The control-plane read foundation now includes server-side, fail-closed GitHub
and Render providers. Production Admin deployment remains explicitly deferred.

### Earlier application baseline

PR #4, `feat: add first ORBIS Admin V1 application scaffold`, is merged.

Verified PR head:

`69883eeaf22e43bdb1aafcf54dddec6cfad51403`

Verified PR #4 merge commit:

`0690ff6421130b13b0da2e49e90dc7aef64efb97`

Verified PR #5 architecture-lock head:

`f425ea876ddcb01256a9ecb6b3fd5f4038d2d9bf`

Verified PR #6 Project Registry / Real Read Model head:

`69803a2064cd522dcf85f19c6faf4751d550e265`

Verified PR #6 merge commit and current `main`:

`37158f20ff018ebace6eabd2a543ad7dd96a328f`

The merged baseline now provides the responsive owner/admin command-center shell, project/category/detail navigation, safe Copy controls, shared TypeScript contracts, the canonical provider-neutral Project Registry, `GET /api/v1/projects`, web consumption of that API, Fastify `/health`, and a tested same-origin Fastify + React production runtime.

### GitHub governance and CI

- `main` remains protected and PR-first.
- manual merge/acceptance remains required.
- the full application quality path is verified on PR #4: lint, TypeScript, tests/coverage, Knip, JSCPD, dependency audit, production build, Sonar Quality Gate, and strict Sonar coverage/duplication gate all passed.

### SonarQube Cloud

Verified project identity remains organization `orbis`, project key `orbisaideveloper_orbis-admin`, project name `orbis-admin`, with `SONAR_TOKEN` held as a GitHub Actions secret.

### Render staging

The authoritative staging service is `orbis-admin-staging` for repository `orbisaideveloper/orbis-admin`, branch `staging`, region Singapore, Auto Deploy OFF, with explicit/manual deployments.

Staging URL: `https://orbis-admin-staging.onrender.com`

The latest reviewed staging artifact is PR #6 head `69803a2064cd522dcf85f19c6faf4751d550e265`. The existing staging service now uses the root production build plus Fastify start runtime (`npm ci --ignore-scripts && npm run build`, then `npm start`) with health check path `/health`. Live smoke verification passed for `/`, `/health`, `/api/v1/projects`, `/projects/orbis-admin`, a built JavaScript asset, and reserved API/asset 404 behavior.

Current accepted pre-merge flow is:

`feature/docs branch -> PR -> GitHub/Sonar green -> exact approved commit -> staging branch -> manual Render deploy -> staging review -> explicit merge`

Ephemeral per-PR Render previews are not currently required. Production Admin Render setup remains deferred.

### Application/database/auth status

- first application scaffold: merged,
- permanent staging service: live/manual deploy,
- production Admin service: not yet established,
- Admin database: dedicated Supabase project exists but has no applied schema,
- central identity persistence: reviewed source contract exists only in draft PR #10,
- owner/admin auth/SSO: not yet implemented,
- passkey/WebAuthn: future-ready, implementation deferred,
- privileged provider/product writes: not implemented.

### Known immediate V1 limitations

The Project Registry / Real Read Model foundation is now merged to `main` and verified on staging. Live GitHub, Render, Sonar, and product-health adapters are still intentionally not implemented, so provider signals must remain `unknown` until a real server-side adapter supplies validated data. The dashboard therefore has a real canonical registry/runtime foundation but does not yet present live provider status.

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

### Step 5 — Staging / read-only control plane — IN PROGRESS

The dedicated `staging` branch and `orbis-admin-staging` manual Render service exist and are verified for pre-merge review.

The Project Registry + Real Read Model foundation is COMPLETE:

1. shared provider-neutral Project Registry contracts,
2. canonical API-side registry,
3. `GET /api/v1/projects`,
4. web reads the registry through the API,
5. same-origin Fastify runtime serves the API and built React application,
6. exact approved PR #6 commit validated on staging,
7. live staging smoke verified before explicit merge.

The next Step 5 work adds read-only providers one at a time in this order: GitHub -> Render -> Sonar -> Health -> unified status/alerts.

Do not pull central identity DB implementation, authentication rewrite, Python application runtime, or privileged write controls into this slice. Production service/setup remains explicit and deferred until separately approved.

## What comes after the current Step 5 foundation

Implementation proceeds in deliberate phases:

- **Read-only integrations first:** GitHub -> Render -> Sonar -> Health -> unified project status/alerts, with runtime validation and provider normalization at every external boundary.
- **Server-state/observability as the read plane grows:** TanStack Query when live server data needs caching/refetch behavior; structured server instrumentation and later OpenTelemetry; stable OpenAPI contracts when the API surface warrants it.
- **Admin DB / ORBIS Identity:** dedicated Admin DB, UUIDv7 identities, opaque display IDs, memberships, integration metadata and control-plane configuration. Product business data stays in product databases.
- **Authentication / Authorization:** central login/session, scoped capabilities, roles as capability bundles, server-side authorization and append-only audit baseline. Passkey implementation remains a later focused security phase.
- **Controlled actions:** only after read-only/audit boundaries are proven; low-risk mutations first, production publish/deploy later, destructive/security/recovery controls last, with emergency write-disable controls in place.
- **Enterprise hardening:** tamper-evident audit when technically justified, formal metrics/traces, DR drills/RPO/RTO, SBOM/provena## Current exact next action

PR #10, **Unique ORBIS ID Foundation**, is a draft and must remain unmerged
until its database checkpoint is complete.

The feature branch now provides:

- UUIDv7 canonical identities and subject-matched opaque display IDs,
- verified-only automatic resolution with observed/name-only data failing safe
  to provisional/review,
- idempotent source action records,
- append-only audit-event and merge evidence structures,
- non-destructive identifier/reference history,
- private schema, revoked public grants, forced RLS, and static migration tests.

The draft PR quality run `34707661049` passed lint, type-check, tests,
100% V8 coverage, Knip, JSCPD, dependency audit, production build, SonarQube
Cloud, and the strict zero-issue Sonar gate.

The dedicated Supabase target is **only**:

- organization: `ORBIS Admin`,
- project: `orbis admin`,
- project ref: `aqcwhqdzniruvoqwfsij`,
- region: `ap-northeast-2` (Seoul).

It is healthy and empty; no migration or customer data has been applied.
Foundation main/staging are never migration targets for this work.

Next, before any live migration:

1. set the new project Data API to OFF and automatic table exposure to OFF,
2. validate the two source migrations in a disposable PostgreSQL/Supabase
   environment and preserve the timestamped report,
3. provide an explicit user approval checkpoint naming the target, SQL effects,
   verification evidence, and recovery plan,
4. only then apply the migrations to the dedicated ORBIS Admin project and
   verify tables, constraints, grants, RLS, advisors, and migration history.

Do not add an identity write endpoint, authentication, Foundation integration,
customer import, production deployment, or auto-merge before those boundaries
are separately approved and verified.

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
