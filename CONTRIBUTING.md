# Contributing to ORBIS Admin

ORBIS Admin is a control-plane repository. Changes can affect identity, authorization, deployments, and operational visibility across the ORBIS ecosystem, so contribution rules are intentionally conservative.

## Before starting work

Read `AGENTS.md` first, then `docs/PROJECT-STATE.md` for the current roadmap phase, verified baseline, and exact next action. Consult `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/QUALITY-GATES.md` before changing architecture or delivery behavior. While the first application scaffold is being planned/built, also read `docs/FIRST-APPLICATION-PLAN.md`.

The project-state handoff is not a substitute for live verification. Check the current repository/branch/HEAD and relevant GitHub, Sonar, Render, database, or deployment state before mutations.

## Standard workflow

1. Start from an up-to-date `main` branch.
2. Create a purpose-specific branch.
3. Make the smallest coherent change that solves the task.
4. Run targeted verification for the changed area.
5. Push the branch and open a pull request.
6. Review the PR preview when applicable, required checks, diff, and risk notes.
7. Resolve review conversations.
8. Merge manually only when required checks are green and the change is understood.
9. Production deployment follows the approved merge path and remains explicit/manual unless a later accepted decision changes it.
10. Update `docs/PROJECT-STATE.md` in the same PR when the roadmap phase, verified setup, or exact next action materially changes.

Do not use `main` as the normal development branch.

## Branch naming

Prefer clear prefixes such as:

- `feat/` for new product behavior
- `fix/` for bug fixes
- `chore/` for tooling or repository maintenance
- `docs/` for documentation-only changes
- `security/` for security hardening

## Pull requests

Every PR should explain:

- what changed,
- why it changed,
- which subsystem is affected,
- what was verified,
- whether database, auth, permission, deployment, or secret handling changed,
- whether Sonar/CI/preview checks are expected,
- any follow-up work that remains.

Large changes should be split when practical so architecture, schema, API, and UI can be reviewed clearly.

## Verification policy

During normal development, run targeted checks for the affected area rather than unrelated full-repository verification on every small change.

Use an **Always Verify** mindset: do not report completion from edits alone. Verify the current branch/HEAD, diff, relevant tests/checks, and any deployment or database state affected by the change.

New pages, components, and newly introduced or materially changed production behavior should target 100% test coverage for the affected new code. A lower global/legacy repository threshold does not reduce this standard. Any justified exception must be narrow and explicitly documented in the PR.

Before a production-critical release, required repository checks should provide stronger certification appropriate to the maturity of this project. Required check names must only be added to GitHub rules after those checks exist reliably.

## SonarQube Cloud / SonarCloud

Once configured for application code:

- use Sonar analysis primarily on pull requests,
- require the configured quality gate to pass before merge,
- enforce a no-new-issues policy on changed/new code,
- avoid unnecessary scans on arbitrary branch pushes when conserving analysis quota matters,
- configure main/release scan cadence separately,
- never guess a Sonar check name before making it required in the Ruleset.

## Preview and deployment

Once Render preview infrastructure exists, application PRs should receive a review preview before merge.

Preview environments must not receive production-destructive credentials or production write access by default.

Production deploys should remain explicit/manual after an approved merge unless a later architecture decision deliberately changes that policy.

## Security rules

Never commit:

- API keys,
- access tokens,
- passwords,
- database credentials,
- signing secrets,
- production `.env` files,
- private service-account material.

Use environment variables and approved secret stores. Browser-delivered code must not contain infrastructure credentials.

## Database changes

Schema changes must be reviewed for:

- backward compatibility,
- migration safety,
- tenant/user isolation,
- identity stability,
- rollback or recovery implications.

ORBIS product databases remain independent. Do not create tight cross-database coupling without an explicit architecture decision.

## Administrative controls

Actions that can affect production, user access, deployments, infrastructure configuration, or destructive data operations require stronger authorization than read-only dashboards. Such controls should be auditable and designed with least privilege.

## Termux reporting

Follow the complete reporting rules in `AGENTS.md`.

Any report-worthy Termux command or command block used as setup, verification, diagnostic, audit, migration, deployment, governance, or review evidence must preserve a timestamped report in `$HOME/storage/downloads/`, including stdout/stderr and a useful final exit/result summary where practical.

Simple navigation/orientation commands do not normally require standalone reports unless they are part of a larger evidence-producing block.

Preserve failure reports and stop before destructive recovery. Do not force-push, reset, delete, rewrite history, or discard work as an automatic recovery step.
