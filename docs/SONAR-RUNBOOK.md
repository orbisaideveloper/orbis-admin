# ORBIS Admin SonarQube Cloud Runbook

This document is the permanent source of truth for ORBIS Admin SonarQube
Cloud analysis and troubleshooting.

## Canonical project identity

- GitHub repository: `orbisaideveloper/orbis-admin`
- Sonar project key: `orbisaideveloper_orbis-admin`
- Sonar organization: `orbis`
- Sonar project name: `orbis-admin`
- GitHub Actions secret: `SONAR_TOKEN`
- protected target branch: `main`
- required GitHub check: `Build, Test & Safety Audit`

ORBIS Admin must never analyze ORBIS Foundation or another ORBIS Sonar
project.

## Secret ownership

`SONAR_TOKEN` belongs to GitHub Actions.

It is intentionally not required in Termux, proot Ubuntu, local shell
profiles, Android Downloads reports, or repository files.

A GitHub Actions secret is not automatically inherited by local Termux or
proot Ubuntu sessions. Local absence of `SONAR_TOKEN` or
`SONARQUBE_CLI_TOKEN` therefore does not mean the GitHub secret is missing.

Do not copy the GitHub Sonar token into local shell history merely to
diagnose a Quality Gate failure. CI performs authenticated diagnostics.

## Permanent analysis model

### Pull requests

Every pull request targeting `main` runs the full `Build, Test & Safety
Audit`.

For application code the workflow runs:

1. deterministic `npm ci`
2. ESLint with zero warnings
3. TypeScript with zero errors
4. tests and coverage
5. 100% repository coverage contract
6. Knip
7. JSCPD zero-duplication guard
8. dependency audit
9. production build
10. SonarQube Cloud PR analysis
11. automatic Sonar diagnostic output

A failed Sonar Quality Gate remains a failed required check.

The diagnostic step does not bypass or soften the gate. It only explains
the exact failing Quality Gate conditions, unresolved issues, and security
hotspots.

### Main branch

Pushes to `main` run the same quality workflow and update the Sonar `main`
analysis automatically.

This prevents future pull requests from targeting an unanalysed or stale
main branch.

### Manual main baseline

`workflow_dispatch` provides `analysis_mode=main-baseline` as an emergency
or bootstrap operation.

The baseline job:

- checks out `main`
- validates the exact ORBIS Admin Sonar identity
- detects whether application code exists
- installs dependencies only when application code exists
- generates LCOV before scanning application code
- scans Sonar `main`
- prints the same diagnostic summary

This mode is not a merge bypass.

## Why the first application PR exposed several setup issues

ORBIS Admin began as a governance/documentation-only repository. PR #4 was
the first real application scaffold, so several assumptions were exercised
for the first time in a clean GitHub runner.

The first-code bootstrap exposed:

- a test dependency that accidentally relied on previously built local
  `dist` output
- initial Knip configuration debt
- the absence of a Sonar `main` baseline
- Sonar's default GitHub log showing only `QUALITY GATE STATUS: FAILED`
  without the failing condition
- an incorrect troubleshooting assumption that the GitHub Sonar secret
  should also exist inside local proot Ubuntu

These are bootstrap/setup issues, not a normal future development model.

The repository now treats a clean GitHub runner as the source of truth,
maintains the `main` baseline, and performs Sonar diagnostics inside GitHub
Actions where the secret actually lives.

## Where to diagnose future failures

Start at:

`Pull Request -> Checks -> Build, Test & Safety Audit`

Read the first failed normal quality step.

If Sonar is the failed step, read:

`SonarQube Cloud — Explain Quality Gate`

The step prints:

- overall Quality Gate status
- each Quality Gate condition and threshold
- unresolved Sonar issues with rule, file, line, severity and message
- security hotspots with file, line and status

The same information is also written into the GitHub Actions job summary.

Do not guess at a source line before reading this diagnostic output.

## Local development policy

Normal development uses targeted checks for the changed area.

Knip and JSCPD may use the supported Ubuntu/proot environment when native
Android bindings are incompatible.

Sonar authentication is not a local-development requirement.

Final GitHub acceptance is determined by the protected PR workflow and
Sonar Quality Gate.

## Non-negotiable safety rules

- never commit a Sonar token
- never print a Sonar token into a report
- never weaken the Quality Gate merely to obtain green status
- never exclude legitimate production code simply to improve metrics
- never analyze another ORBIS project's Sonar key
- never merge while the required GitHub check is red

## Workflow-definition safety

Any modification to `.github/workflows/*.yml` or `*.yaml` must pass:

`npm run check:workflows`

before commit or push.

ORBIS Admin also carries the independent
`ORBIS Admin Workflow Syntax Guard`.

### PR #4 bootstrap incident

During the first application/Sonar bootstrap, a generated workflow edit
accidentally removed the two-space indentation from the
`sonar-main-baseline` job.

The resulting YAML was textually clean but invalid as a GitHub Actions
workflow because `sonar-main-baseline` became an unexpected top-level
property instead of a child of `jobs`.

`git diff --check`, shell syntax checks, JSON parsing, and grep checks
cannot validate the GitHub Actions workflow schema.

The local workflow validator now rejects unknown top-level workflow keys
and malformed job placement before a workflow change is pushed.

Do not rebuild YAML job blocks with generic string operations such as
`.strip()` when leading indentation is semantically significant.

If GitHub reports `Invalid workflow file` before any job starts, diagnose
the workflow definition first. Do not troubleshoot Sonar, tests, Knip,
JSCPD, or application code until the workflow itself validates.

## ORBIS Admin strict first-day quality contract

ORBIS Admin deliberately uses a stricter repository contract than the
default SonarQube Cloud gate.

For new application code:

- runtime line coverage: 100%
- runtime statement coverage: 100%
- runtime function coverage: 100%
- runtime branch coverage: 100%
- Sonar new coverage when applicable: exactly 100%
- JSCPD duplication: exactly 0.00%
- Sonar new duplicated-lines density when applicable: exactly 0.00%
- unresolved Sonar issues: 0
- Security rating: A
- Reliability rating: A
- Maintainability rating: A
- reviewed security hotspots: 100%

Production/runtime coverage is automatically glob-based. Adding a new
TypeScript/TSX runtime source file therefore adds it to the coverage
denominator automatically; developers must add its tests rather than edit
a hand-maintained file list.

Tooling, CI definitions and configuration remain Sonar quality/security
scanned, but they are not counted as application runtime coverage or
runtime CPD. Tooling duplication is separately guarded by JSCPD.

### Termux report delivery

The ORBIS Admin repository uses a repository-local `post-push` hook.

A push initiated from this Termux repository launches the CI watcher in
the background and immediately returns the prompt. When GitHub Actions
finishes, a timestamped `ORBIS-ADMIN-CI-SONAR-*.txt` report is written to
Android Downloads.

This hook is configured with repository-local `core.hooksPath`, so it does
not modify ORBIS Foundation or any other repository.

For a push made from another machine or directly on GitHub, Termux cannot
receive a file unless a watcher is running locally. In that case run:

`npm run ci:report`

to fetch the current commit's report into Downloads.
