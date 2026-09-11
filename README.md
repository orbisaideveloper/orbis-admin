# ORBIS Admin

Central administrative, identity, and control plane for the ORBIS ecosystem.

## Start here for every work session

Before proposing or performing ORBIS Admin work, read the repository guidance in this order:

1. [`AGENTS.md`](AGENTS.md) — permanent operating rules.
2. [`docs/PROJECT-STATE.md`](docs/PROJECT-STATE.md) — current phase, verified baseline, and exact next action.
3. [`docs/CONTROL-PLANE-VISION.md`](docs/CONTROL-PLANE-VISION.md) — the intended end-state: one owner control center + one central ORBIS identity registry.
4. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system boundaries and architecture principles.
5. [`docs/DECISIONS.md`](docs/DECISIONS.md) — durable accepted architecture decisions.
6. [`docs/QUALITY-GATES.md`](docs/QUALITY-GATES.md) — CI, coverage, Sonar, and preview requirements.
7. [`docs/FIRST-APPLICATION-PLAN.md`](docs/FIRST-APPLICATION-PLAN.md) — Step 3/Step 4 plan while the first application foundation is being prepared.
8. [`docs/V1-SCREEN-PLAN.md`](docs/V1-SCREEN-PLAN.md) — proposed owner-dashboard screens and visual scope for Version 1.

`docs/PROJECT-STATE.md` is the canonical session handoff. Update it in the same PR whenever the roadmap phase, verified external setup, or exact next action materially changes. Live external state must still be verified before mutation; the handoff file is not a substitute for checking GitHub, Sonar, Render, database, or deployment state.

## Purpose

ORBIS Admin is the single administrative surface for ORBIS-wide identity, project registry, operational visibility, and controlled system actions. It is designed to remain independent from product-specific business logic.

The long-term goal is simple: ORBIS may contain many repositories, services, and products, but an authorized administrator should be able to understand the ecosystem from one place.

## Core responsibilities

- Maintain the permanent ORBIS identity for each user.
- Maintain a registry of ORBIS products, projects, repositories, and deployments.
- Track which ORBIS products a user is entitled to or actively uses.
- Provide high-level operational visibility across ORBIS services.
- Integrate with systems such as GitHub, Render, and future infrastructure providers through secure server-side credentials.
- Record sensitive administrative actions in an audit trail.
- Provide controlled operational actions according to explicit permissions.

## Data-boundary rule

ORBIS Admin does **not** become the business database for every ORBIS application.

Each ORBIS product keeps its own application database and domain data. For example:

- ORBIS Foundation keeps Foundation and Accounting domain data in its own database.
- ORBIS Game keeps game-specific profiles, progress, scores, and inventory in its own database.
- Future ORBIS products keep their own domain data in their own databases.

Cross-product identity is linked by a stable ORBIS user identifier. Product databases may store that identifier as a reference, but product-specific business data must not be copied into the ORBIS Admin database unless a deliberate architecture decision explicitly requires it.

## Development workflow

Production changes follow this path:

`feature branch -> pull request -> preview / targeted verification -> review -> merge to main -> production deployment`

Direct development on `main` is not the normal workflow. The active repository rules and required checks protect this path; exact current enforcement belongs in `docs/PROJECT-STATE.md` and must be live-verified before changes that depend on it.

## Repository guidance

- [`AGENTS.md`](AGENTS.md) — master permanent instructions for coding agents and contributors.
- [`docs/PROJECT-STATE.md`](docs/PROJECT-STATE.md) — current state and session handoff.
- [`docs/CONTROL-PLANE-VISION.md`](docs/CONTROL-PLANE-VISION.md) — central owner-control and identity vision.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution and pull-request workflow.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system boundaries and architecture principles.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — durable record of important architecture decisions.
- [`docs/QUALITY-GATES.md`](docs/QUALITY-GATES.md) — repository quality contract.
- [`docs/FIRST-APPLICATION-PLAN.md`](docs/FIRST-APPLICATION-PLAN.md) — first application architecture/PR plan while applicable.
- [`docs/V1-SCREEN-PLAN.md`](docs/V1-SCREEN-PLAN.md) — proposed Version 1 admin-screen plan.
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — GitHub Copilot-specific repository instructions.

## Status

The repository has completed its governance and CI/Sonar baseline and is now in the pre-code architecture/planning phase for the first application scaffold. See `docs/PROJECT-STATE.md` for the verified current status and exact next action.
