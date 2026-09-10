# ORBIS Admin

Central administrative, identity, and control plane for the ORBIS ecosystem.

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

Direct development on `main` is not the normal workflow. Repository rules and required checks should enforce this once the corresponding GitHub ruleset and CI checks are configured.

## Repository guidance

- [`AGENTS.md`](AGENTS.md) — permanent instructions for coding agents and contributors.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution and pull-request workflow.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system boundaries and architecture principles.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — durable record of important architecture decisions.
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — GitHub Copilot-specific repository instructions.

## Status

This repository is at the foundation stage. Architecture and governance are established before implementation so future ORBIS services can integrate against a stable set of rules.
