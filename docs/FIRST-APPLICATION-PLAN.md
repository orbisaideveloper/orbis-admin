# ORBIS Admin — First Application Plan

**Status:** Approved Step 3 plan for Step 4 implementation

This document freezes the intended scope and acceptance criteria for the first ORBIS Admin application scaffold before production application code is added.

## Goal

Create the smallest deployable application foundation that proves the ORBIS Admin delivery path end to end without prematurely implementing identity, database, authentication, live product integrations, or operational write controls.

The first application PR is application-foundation work, not full feature delivery.

## Accepted initial stack

The first scaffold uses a strict TypeScript workspace with these boundaries:

```text
orbis-admin/
├── apps/
│   ├── web/          # React + Vite owner/admin UI
│   └── api/          # Fastify HTTP API
├── packages/
│   └── contracts/    # shared typed request/response schemas
├── package.json
├── package-lock.json
├── tsconfig.base.json
└── ...quality/tooling config
```

### Web

- React
- Vite
- TypeScript with strict settings
- approved ORBIS owner/admin command-center shell
- responsive mobile and desktop compositions
- no authentication implementation yet
- no production secrets in browser code

### API

- Fastify
- TypeScript with strict settings
- `/health` endpoint as the first runtime contract
- structured, deterministic startup behavior
- no database connection yet
- no GitHub/Sonar/Render write integration yet

### Shared contracts

Use a small shared TypeScript package for API schemas/contracts so web and API do not drift into incompatible request/response shapes.

A schema library such as Zod may be introduced if it materially improves runtime validation and type sharing, but the first scaffold should avoid unnecessary dependencies.

## First PR scope

The first application-code PR should contain only enough code and configuration to establish a deployable, fully tested foundation:

1. root npm workspace/package configuration,
2. strict TypeScript base configuration,
3. React/Vite Admin shell matching the approved V1 direction,
4. compact command-center cards with responsive mobile/desktop layouts,
5. drill-down routes for the approved safe demo/read-only flow,
6. reliable Back + Home + browser/device Back behavior,
7. safe non-secret Copy controls,
8. three-dot menu and date/time header,
9. minimal Fastify API with `/health`,
10. shared health-response contract,
11. unit/component/API tests required for 100% coverage,
12. ESLint configuration with zero-warning CI behavior,
13. Vitest coverage configuration,
14. Knip configuration,
15. JSCPD configuration that fails on accepted authored-code duplication,
16. build scripts for all workspaces,
17. a smoke/startup verification script suitable for CI and later Render health checks,
18. Sonar source/test/coverage paths updated to the real application layout,
19. documentation/state updates required by the repository instructions.

## Explicitly out of scope for the first scaffold PR

Do **not** add these merely to make the scaffold feel complete:

- Supabase or another database,
- Prisma schema or migrations,
- user signup/login,
- ORBIS SSO/OIDC implementation,
- central ORBIS user table,
- role/permission persistence,
- live Foundation/Game integration,
- GitHub/Sonar/Render administrative write actions,
- production/staging secrets,
- real publish/deploy/rollback controls,
- real customer records.

These require separate architecture decisions and focused PRs after the runtime/delivery foundation is proven.

## Required package scripts

The root `package.json` must provide at least the scripts already required by CI:

- `lint`
- `type-check`
- `test:coverage`
- `check:deadcode:ci`
- `check:duplicates:ci`
- `build`

The first application PR should also add a deterministic smoke/startup script, preferably:

- `test:smoke`

If the final framework layout requires a different exact name, update CI and this document together rather than silently diverging.

## Testing and coverage

The first application PR must prove the zero-debt rule from the first production line.

Required:

- API health behavior tested,
- shared contract behavior tested where runtime logic exists,
- web shell/navigation behavior tested,
- Back/Home/browser-history behavior tested,
- responsive layout behavior covered at the component/logic level where practical,
- Copy-control behavior tested,
- aggregate health-card state behavior tested,
- 100% aggregate lines coverage,
- 100% aggregate statements coverage,
- 100% aggregate functions coverage,
- 100% aggregate branches coverage.

Coverage must emit:

- `coverage/coverage-summary.json`
- `coverage/lcov.info`

Do not create meaningless tests solely to inflate coverage. Keep first production code intentionally small enough that full behavioral coverage remains useful.

## Dead-code and duplication policy

Knip must fail on actionable dead code. JSCPD must fail when authored application code introduces accepted copy/paste duplication.

Generated output, dependency directories, coverage output, build output, and framework-generated artifacts may be excluded when technically justified.

## Sonar activation

The first application PR is the first PR expected to run real SonarQube Cloud analysis.

Before claiming the PR merge-ready:

- verify the scan targets only `orbisaideveloper_orbis-admin`,
- import the generated LCOV report,
- wait for the Sonar Quality Gate,
- verify server-side Quality Gate behavior in SonarQube Cloud,
- require no unresolved new issues according to the accepted project policy,
- record any stable Sonar GitHub check context before considering a Ruleset update.

Do not add a guessed Sonar status-check name to the Ruleset.

## Smoke/runtime contract

The first runtime contract should be deliberately small:

- API process starts successfully,
- `GET /health` returns success and a typed non-secret response,
- production build artifacts can start in a clean environment,
- web production build completes and can be served by the chosen deployment topology.

The health response must not reveal secrets, internal credentials, or unnecessary infrastructure metadata.

## Render timing

Render creation is Step 5, after the first deployable scaffold is accepted on `main`.

The scaffold must nevertheless be designed so its build/start commands are deterministic and can be mapped cleanly to Render without restructuring the repository immediately afterward.

Production auto-deploy must not be enabled merely for convenience; production deployment remains explicit/manual under the accepted repository policy.

## First-PR acceptance checklist

The first application scaffold is not ready to merge until all applicable items pass:

- application scope matches this plan,
- mobile first-view layout matches the approved compact command-board direction,
- desktop layout intentionally uses larger available space without forking business behavior,
- no redundant Home `Command Center` heading/breadcrumb duplication,
- Projects primary card remains compact enough to preserve dashboard glanceability,
- Back/Home/browser-history behavior works correctly,
- no database/auth/live product-write features slipped into the scaffold,
- deterministic `npm ci`,
- lint zero warnings,
- TypeScript zero errors,
- tests pass,
- 100% aggregate coverage across all four required metrics,
- LCOV generated,
- Knip passes,
- JSCPD passes at the accepted zero-duplication policy,
- `npm audit --audit-level=high` passes,
- production build passes,
- smoke/startup verification passes,
- Sonar Admin-project isolation verified,
- Sonar scan succeeds,
- Sonar Quality Gate succeeds,
- no tracked secrets/sensitive files,
- required `Build, Test & Safety Audit` check is green,
- review conversations resolved,
- PR scope/diff reviewed,
- manual merge acceptance only after evidence is satisfactory.

## Step 3 completion criteria

Step 3 planning is accepted. Delivery is complete only when:

1. this accepted plan and the accepted ADRs are present in the planning PR,
2. `docs/PROJECT-STATE.md` points to the exact next action,
3. the planning PR passes the governance-only required CI check,
4. the planning PR is manually merged after explicit merge acceptance,
5. local `main` is synced again.

Only then begin Step 4 on a new feature branch.
