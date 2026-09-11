# ORBIS Admin Architecture Decisions

This file records durable decisions that should remain understandable across future chats, contributors, and coding agents.

## ADR-001 — ORBIS Admin is the central control plane

**Status:** Accepted

ORBIS Admin is the single administrative control plane for the ORBIS ecosystem. It provides identity, product/project registry, operational visibility, auditability, and approved control actions across ORBIS products.

It does not replace product-specific applications or databases.

## ADR-002 — One permanent ORBIS identity per person

**Status:** Accepted

Every ORBIS user is represented by one canonical permanent identifier shared across ORBIS products.

The canonical identifier must be immutable and must not be derived from email address or phone number because those attributes can change.

A human-friendly ORBIS display ID may be maintained separately.

## ADR-003 — Product databases remain independent

**Status:** Accepted

ORBIS Foundation, ORBIS Game, and future ORBIS products retain their own databases and domain data.

ORBIS Admin stores identity and control-plane metadata, not a complete copy of every product's business data.

Products link back to the central ORBIS identity through the canonical ORBIS user identifier.

## ADR-004 — Integrations are server-side and least-privilege

**Status:** Accepted

GitHub, Render, database-provider, and future infrastructure credentials must remain server-side and use the minimum permissions required.

Read-only observability and write/control actions should be treated as separate capabilities.

## ADR-005 — Administrative actions are auditable

**Status:** Accepted

Sensitive administrative actions should produce an audit record that identifies the actor, target, action, time, and outcome where appropriate.

Audit records must not contain secrets.

## ADR-006 — PR-first, manually accepted delivery model

**Status:** Accepted

Normal changes follow:

`branch -> pull request -> preview / targeted verification -> review -> manual acceptance -> merge to main -> explicit production deployment`

Direct development on `main` is not the intended workflow. `main` is protected by repository rules requiring a pull request, requiring review-thread resolution, and blocking force-pushes and deletion.

Auto-merge is not the default acceptance path. A merge is an explicit administrative decision after the change and required evidence are satisfactory.

## ADR-007 — ORBIS Admin remains independently deployable

**Status:** Accepted

ORBIS Admin is deployed independently from Foundation, Game, and future products. A control-plane deployment or outage should not automatically take down unrelated product runtimes.

## ADR-008 — Verification and coverage policy

**Status:** Accepted

Normal development uses targeted verification for the changed area. Stronger final certification is reserved for work explicitly declared finished and ready for GitHub/production.

Completion claims follow an Always Verify rule: edits alone are not evidence of completion.

New pages, components, and newly introduced or materially changed production behavior target 100% test coverage for the affected new code. A lower legacy/global repository threshold does not lower this standard. Any exception must be narrow and explicit in the pull request.

Report-worthy Termux setup, verification, audit, migration, deployment-validation, governance, and diagnostic commands preserve timestamped reports in the Android Downloads folder.

## ADR-009 — Sonar analysis is PR-centered

**Status:** Accepted

Once SonarQube Cloud/SonarCloud is configured, pull requests are the primary quality-analysis surface and changed/new code follows a no-new-issues quality policy.

Arbitrary branch pushes do not need to trigger Sonar analysis merely because they exist. Main/release analysis cadence is configured separately.

A Sonar status check is added to the main-branch ruleset only after its exact GitHub check name exists reliably on pull requests.

## ADR-010 — Preview before merge; production remains explicit

**Status:** Accepted

Once Render preview infrastructure is configured, application pull requests are reviewed through a PR preview before merge.

Preview environments must not receive production-destructive credentials or production write access by default.

Production deployment remains an explicit/manual action after an approved merge unless a later accepted architecture decision deliberately changes that behavior.

## ADR-011 — Shared Termux toolchain with Ubuntu for Linux-only tools

**Status:** Accepted

ORBIS repositories share one Android Termux user environment for common command-line tooling. A repository switch does not justify reinstalling Git, GitHub CLI, Node/npm, Python, or another working shared tool.

Before installing or upgrading tooling, inspect whether a usable copy already exists in native Termux and, when relevant, inside the Ubuntu `proot-distro` environment. Reuse an existing working installation unless a specific incompatibility or version requirement justifies a change.

Ubuntu/proot is the standard execution environment for binaries and developer tools that require a conventional Linux/glibc userspace or otherwise fail under native Android Termux. On the current Android ARM64 workflow, SonarQube CLI belongs in Ubuntu/proot rather than native Termux. Prisma engine tooling, if introduced here, must likewise avoid native Termux and use Ubuntu/proot or an approved raw-SQL/provider workflow.

Shared CLI installation or authentication does not make project configuration global. ORBIS Admin retains its own repository files, Sonar project key/configuration, GitHub repository secrets, Render service, Supabase project/database, environment values, and deployment targets. Other ORBIS projects must not be modified as a side effect of ORBIS Admin setup.

For ORBIS Admin operational work, verify the working repo is `~/orbis-admin` and the GitHub target is `orbisaideveloper/orbis-admin` before mutating project-level state.

## ADR-012 — First application scaffold stack

**Status:** Accepted

The first deployable ORBIS Admin application scaffold uses a strict TypeScript npm workspace with:

- `apps/web`: React + Vite administrative UI,
- `apps/api`: Fastify HTTP API,
- `packages/contracts`: shared typed request/response contracts,
- strict TypeScript configuration,
- Vitest-based tests and coverage,
- ESLint, Knip, JSCPD, dependency audit, production build, smoke/startup verification, and Sonar analysis as required PR gates.

The first runtime contract is a minimal non-secret `GET /health` endpoint plus the approved owner/admin shell. The first scaffold PR deliberately excludes database, authentication, ORBIS identity persistence, live product integrations, and administrative write controls.

Reasons:

- preserve a clear browser/server trust boundary,
- keep privileged GitHub/Render/database credentials on the server,
- establish shared API contracts before feature growth,
- remain small enough to satisfy the repository's 100% first-code coverage policy,
- produce deterministic build/start commands suitable for later Render deployment.

## ADR-013 — V1 owner dashboard navigation and responsive layout

**Status:** Accepted

The first owner/admin shell uses a compact card-first command-center model.

Accepted interaction rules:

- the first mobile viewport should prioritize the complete high-value command board and avoid unnecessary vertical duplication,
- the main **Projects** card is the primary entry point but should remain compact/flat enough to preserve the rest of the dashboard at a glance,
- global GitHub Actions, Sonar, Render, health, alerts, users, review/publish, audit, and settings cards remain available as direct cross-project entry points,
- every secondary screen provides **Back** and **Home** navigation; browser/device Back should move through the internal route history rather than unexpectedly dumping the user to Home or out of the application,
- the home screen must not repeat a small breadcrumb/title such as `Command Center` immediately above the real `Command Center` page heading,
- project drill-down follows `Home -> Projects -> Project -> exact admin area -> detail`,
- global health cards show aggregate state and turn attention/failure color when any connected registered project needs attention; opening the card reveals which project is affected,
- safe non-secret operational values may expose one-tap Copy controls and later an AI-ready diagnostic brief; secrets are never rendered for copying,
- mobile and desktop are deliberately optimized as distinct layout modes, but they share the same data model, routes, components, accessibility rules, and business behavior rather than becoming two divergent applications.

The visual direction is the approved high-tech ORBIS control-room style: dark high-contrast base, crystal-bright surfaces, clean status color, compact cards, strong readability, and responsive layout.

## Future decisions to formalize

Before implementation reaches production, record explicit decisions for at least:

- identity provider and authentication protocol,
- exact canonical ID format and public display-ID rules,
- authorization/role model,
- audit-log retention,
- inter-service API/event contracts,
- staging vs production environment topology,
- secret-management approach,
- backup and disaster-recovery strategy.
