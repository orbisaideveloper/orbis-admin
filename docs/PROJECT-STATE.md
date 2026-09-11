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

## Verified baseline after PR #4

PR #4, `feat: add first ORBIS Admin V1 application scaffold`, is merged.

Verified PR head:

`69883eeaf22e43bdb1aafcf54dddec6cfad51403`

Verified merge commit on `main`:

`0690ff6421130b13b0da2e49e90dc7aef64efb97`

The merged scaffold provides the first deployable responsive owner/admin command-center shell, project/category/detail navigation, safe Copy controls, demo/read-only operational data, Fastify `/health`, shared contracts, and strict application tooling.

### GitHub governance and CI

- `main` remains protected and PR-first.
- manual merge/acceptance remains required.
- the full application quality path is verified on PR #4: lint, TypeScript, tests/coverage, Knip, JSCPD, dependency audit, production build, Sonar Quality Gate, and strict Sonar coverage/duplication gate all passed.

### SonarQube Cloud

Verified project identity remains organization `orbis`, project key `orbisaideveloper_orbis-admin`, project name `orbis-admin`, with `SONAR_TOKEN` held as a GitHub Actions secret.

### Render staging

The authoritative staging service is `orbis-admin-staging` for repository `orbisaideveloper/orbis-admin`, branch `staging`, region Singapore, Auto Deploy OFF, with explicit/manual deployments.

Staging URL: `https://orbis-admin-staging.onrender.com`

The latest reviewed staging artifact was built from approved PR head `69883eeaf22e43bdb1aafcf54dddec6cfad51403`. The public mobile staging UI was reviewed successfully.

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

The current shell still uses static/demo provider state. GitHub and Sonar provider links inside detail views need to open their real destinations, provider-specific detail layouts still need real read-only metadata, and demo labels such as `First scan pending` / `Setup later` must later be replaced by live provider status. These are follow-up items, not retroactive blockers for the merged scaffold.

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

Keep Step 5 narrow: document/verify the staging workflow, fix safe provider links/details, keep provider metadata registry-shaped, and verify staging smoke behavior. Do not pull authentication, central identity DB implementation, or privileged write controls into Step 5. Production service/setup remains explicit and deferred until separately approved.

## What comes after Step 5

Implementation proceeds in deliberate phases:

- **Auth / Identity:** dedicated Admin DB, UUIDv7 identities, opaque display IDs, authentication/session contract, memberships/entitlements, scoped capability model, backup/restore baseline. Passkey implementation remains deferred to a focused security PR.
- **Registry / Read-only integrations:** database-backed project registry, GitHub/Sonar/Render read-only integration, health aggregation, provider/product adapters as needed, audit visibility.
- **Controlled actions:** only after read-only/audit boundaries are proven; low-risk mutations first, production publish/deploy later, destructive/security/recovery controls last, with emergency write-disable controls in place.
- **Enterprise hardening:** tamper-evident audit when technically justified, formal metrics/traces, DR drills/RPO/RTO, SBOM/provenance/signing, dependency/license maturity, mature passkey/re-auth flows.

## Current exact next action

Create and review a documentation-only architecture-lock PR that updates `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and this file. It must not change application code, database schema, authentication, provider integration, or write controls.

After that documentation PR is accepted, continue Step 5 with the small provider-link/detail and staging-delivery work.

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
