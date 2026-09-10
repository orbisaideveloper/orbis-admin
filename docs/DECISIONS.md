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

Long-running Termux verification, audit, migration, deployment-validation, and governance commands preserve timestamped reports in the Android Downloads folder.

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
