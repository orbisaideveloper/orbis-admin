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

## GitHub delivery policy

- `main` is protected and is not a development branch.
- Work on a purpose-specific branch.
- Every normal change reaches `main` through a pull request.
- The repository ruleset must require a pull request, require review-conversation resolution, block force-pushes, and block deletion of `main`.
- Do not use auto-merge as the default delivery mechanism. Merge is an explicit/manual acceptance after review and required checks are satisfactory.
- Use PR preview and targeted verification appropriate to the change.
- Add required CI/quality/preview status checks to the ruleset only after those checks exist, are stable, and have known GitHub check names.
- Avoid unrelated refactors in a focused change.

## Always Verify

Never claim a change is complete, safe, deployed, merged, or working only because files were edited or a command started.

Before reporting success, verify the current source and the relevant evidence. Depending on the task this can include:

- current branch and HEAD,
- changed files/diff,
- targeted tests,
- type/lint/build checks,
- security or tenant-boundary checks,
- GitHub PR/check state,
- preview behavior,
- deployment health,
- database/migration state.

If verification is incomplete, say exactly what remains unverified.

## Development verification model

- During normal development, run only checks related to the changed area.
- Do not run unrelated whole-repository suites for every small edit.
- A stronger final certification is reserved for work explicitly declared finished and ready for GitHub/production.
- New pages, components, and new production behavior must ship with tests. The target for newly introduced or materially changed production code is 100% test coverage for the affected new code; a lower legacy/global repository threshold does not lower this standard.
- Any justified coverage exception must be explicit in the PR, narrow, and reviewed rather than silently ignored.
- Required GitHub checks should progressively cover code quality, tests, security, and preview/deployment validation as the repository matures.

## SonarQube Cloud / SonarCloud policy

- Use SonarQube Cloud/SonarCloud as a pull-request quality gate once configured.
- The PR quality policy is **no new issues** on changed/new code before merge, subject to the configured Sonar quality gate.
- Prefer analysis on pull requests rather than every arbitrary branch push when conserving analysis quota is useful.
- Main/release analysis cadence is controlled by workflow configuration and may be kept separate from PR analysis.
- Do not make a Sonar status check required in the ruleset until the exact check exists reliably on PRs.

## Preview and production policy

- PR preview is the review environment for application changes once Render preview infrastructure is configured.
- A preview must not share destructive production credentials or production write access by default.
- Production deployment follows an approved merge and should remain an explicit/manual action unless a later accepted architecture decision changes that policy.
- Production-impacting operations require stronger authorization and auditability than read-only observability.

## Operational execution and reporting

- Long-running or multi-step verification commands must keep the interactive shell usable whenever practical.
- Every long-running verification, audit, migration, deployment validation, or repository-governance command executed from Termux must write a timestamped report to the Android Downloads folder.
- Preferred Termux report location: `$HOME/storage/downloads/` after Termux storage access has been granted.
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

If documentation conflicts, prefer the most specific current accepted architecture decision, then `AGENTS.md`, and fix the conflicting documentation in the same change when appropriate.

## Definition of done

A change is not complete merely because code compiles. Completion should include, as relevant:

- targeted tests for changed behavior,
- 100% coverage of newly introduced/materially changed production code unless a narrow exception is documented,
- validation of security/tenant boundaries,
- updated documentation for durable decisions,
- no committed secrets,
- a reviewable PR with clear scope,
- successful required CI/quality/preview checks,
- explicit/manual merge acceptance,
- a preserved timestamped Downloads report for any long-running local verification or audit.
