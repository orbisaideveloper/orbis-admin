# ORBIS Admin — Agent Instructions

These instructions define the permanent operating rules for work in this repository.

## Mission

ORBIS Admin is the central administrative and identity control plane for the ORBIS ecosystem. It owns ORBIS-wide identity, project/product registry, membership/entitlement metadata, administrative visibility, auditability, and carefully scoped operational controls.

It is not a monolithic application database for all ORBIS products.

## Non-negotiable architecture rules

1. **Central identity, distributed product data**
   - Each person has one permanent ORBIS identity.
   - Product-specific data remains in the product's own database.
   - Product systems reference the central ORBIS user identifier rather than inventing incompatible identity schemes.

2. **Stable ORBIS user identifier**
   - The canonical ORBIS user identifier must be immutable and independent of mutable attributes such as email address or phone number.
   - Human-friendly display identifiers may exist separately.

3. **Product isolation**
   - ORBIS Foundation, ORBIS Game, and future products remain independently deployable and retain their own domain models and databases.
   - Do not copy product business logic into this repository merely for convenience.

4. **Control plane, not data warehouse**
   - Prefer references, summaries, health signals, and secure API integration over duplicating full product datasets.
   - Any deliberate cross-product data replication requires an explicit documented architecture decision.

5. **Least privilege**
   - GitHub tokens, Render API keys, database service credentials, signing keys, and other secrets must never be committed to the repository or exposed to browser code.
   - Administrative actions must be server-side, permission-checked, and auditable.

6. **Auditability**
   - Sensitive administrative operations should produce durable audit records containing actor, action, target, time, and outcome where appropriate.

## Development workflow

- Do not treat `main` as a development branch.
- Work on a purpose-specific branch.
- Open a pull request before merging changes to `main`.
- Use PR preview and targeted verification appropriate to the change.
- Merge only after required checks and review are satisfactory.
- Keep commits coherent and descriptive.
- Avoid unrelated refactors in a focused change.
- Protect `main` with repository rules that require a pull request and block force-pushes and branch deletion.
- Add required CI/quality/preview status checks only after those checks exist and are stable, so governance never references a permanently missing check.

## Verification model

- During normal development, run only checks related to the changed area.
- Do not run unrelated whole-repository suites for every small edit.
- A stronger final certification is reserved for work that is explicitly declared finished and ready for GitHub/production.
- Required GitHub checks should progressively include code quality, tests, security and preview/deployment validation as the repository matures.
- SonarQube Cloud/SonarCloud should be used as a pull-request quality gate once configured; workflow triggers determine when scans run.

## Operational execution and reporting

- Long-running or multi-step verification commands must keep the interactive shell usable whenever practical.
- Every long-running verification, audit, migration, deployment validation, or repository-governance command must write a timestamped report to the Android Downloads folder when executed from Termux.
- Preferred Termux report location: `$HOME/storage/downloads/` (after Termux storage access has been granted).
- Reports should include repository, branch, HEAD, command purpose, start/end time where practical, exit status, and concise PASS/FAIL findings.
- If a long-running command fails, preserve the report and stop before destructive recovery actions.
- Never hide failures by resetting, force-pushing, deleting, or rewriting history unless the user explicitly authorizes the exact recovery action.

## Source-first behavior

Before changing existing behavior:

- Inspect the current implementation and directly connected callers/contracts.
- Preserve established public contracts unless the task explicitly requires a breaking change.
- Do not infer completion from filenames, TODOs, or documentation alone; verify the current source.
- Update documentation when architecture or durable operating rules change.

## Database and identity changes

For schema/authentication work:

- Prefer additive, backward-compatible migrations where practical.
- Do not bind permanent identity to email or phone.
- Separate authentication credentials from product profiles.
- Avoid cross-database foreign-key assumptions between independently deployed products.
- Define explicit API/event contracts for inter-service communication.

## Integration rules

For GitHub, Render, Supabase, or future external integrations:

- Credentials stay server-side.
- Scope tokens to the minimum necessary permissions.
- Distinguish read-only observability from write/control actions.
- Require stronger authorization and confirmation for destructive or production-impacting operations.
- Record operational actions in the audit trail where appropriate.

## Documentation hierarchy

- `README.md` explains what ORBIS Admin is.
- `AGENTS.md` is the master repository working instruction.
- `CONTRIBUTING.md` defines contribution and PR workflow.
- `docs/ARCHITECTURE.md` defines system boundaries and structure.
- `docs/DECISIONS.md` records durable architecture decisions.
- `.github/copilot-instructions.md` mirrors relevant agent guidance for GitHub Copilot without contradicting this file.

If documentation conflicts, prefer the most specific current architecture decision, then `AGENTS.md`, and fix the conflicting documentation in the same change when appropriate.

## Definition of done

A change is not complete merely because code compiles. Completion should include, as relevant:

- targeted tests for changed behavior,
- validation of security/tenant boundaries,
- updated documentation for durable decisions,
- no committed secrets,
- a reviewable PR with clear scope,
- successful required CI/preview checks,
- a preserved timestamped Downloads report for any long-running local verification or audit.
