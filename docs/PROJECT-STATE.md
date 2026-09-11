# ORBIS Admin — Project State and Session Handoff

This file is the canonical current-state handoff for future chats, coding agents, and contributors. It is intentionally concise enough to read at the start of every ORBIS Admin work session.

**Last updated:** 2026-09-11

## Session-start rule

Before proposing or performing ORBIS Admin work, read these files in this order:

1. `AGENTS.md` — permanent operating rules.
2. `docs/PROJECT-STATE.md` — current phase, completed work, and exact next step.
3. `docs/ARCHITECTURE.md` — system boundaries.
4. `docs/DECISIONS.md` — durable architecture decisions.
5. `docs/QUALITY-GATES.md` — CI, coverage, Sonar, and preview requirements.
6. `docs/FIRST-APPLICATION-PLAN.md` — current Step 3/Step 4 implementation plan while the first application scaffold is being prepared.

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

## Canonical five-step roadmap

### Step 1 — GitHub governance and ruleset — COMPLETE

Repository governance, permanent instructions, PR-first delivery, protected `main`, and manual merge policy are established.

### Step 2 — CI and Sonar baseline — COMPLETE

The required `Build, Test & Safety Audit` context, zero-debt CI contract, isolated Sonar project binding, and reporting/toolchain rules are established.

### Step 3 — Pre-code architecture and exact first PR plan — IN PROGRESS

Current work is documentation/planning only. Freeze the first application architecture, folder boundaries, package scripts, test strategy, first-PR scope, and acceptance criteria before adding production application code.

The working plan is in `docs/FIRST-APPLICATION-PLAN.md`.

### Step 4 — First application scaffold PR — PENDING

Create the first deployable ORBIS Admin application scaffold on a new feature branch. The PR must activate and pass the full application quality gate, including lint, type-check, tests, 100% aggregate coverage, Knip, JSCPD, dependency audit, production build, smoke verification, and Sonar Quality Gate.

Do not add database/auth/product integrations to the first scaffold PR.

### Step 5 — Render service and PR Preview — PENDING

After the first application scaffold is accepted and available on `main`, create the ORBIS Admin Render service in the confirmed workspace, keep production deployment explicit/manual, configure PR Preview, verify the stable Render check context, and only then consider adding that check to the GitHub ruleset.

## What comes after Step 5

Only after the delivery/runtime foundation is stable should implementation move into the control-plane domains, in deliberate architecture PRs:

- central ORBIS identity and authentication contract,
- authorization/capability model,
- Admin database and migrations,
- product/project registry,
- user-product membership/entitlement model,
- audit log,
- read-only GitHub/Render operational visibility,
- carefully permissioned administrative actions.

These are not part of the first scaffold PR.

## Current exact next action

Complete and review Step 3. Do not write application code in the Step 3 planning PR. Once the proposed first-application architecture is accepted, mark its durable architecture decision accepted, merge the planning PR, sync local `main`, and then start Step 4 on a new feature branch.

## Handoff/update discipline

Update this file in the same PR whenever any of the following materially changes:

- roadmap step status,
- required GitHub check names or ruleset behavior,
- first application architecture,
- Sonar project/gate status,
- Render service/preview status,
- database/auth implementation status,
- the exact next action.

A future chat should never have to reconstruct the project phase from scattered messages when the durable state can be recorded here.
