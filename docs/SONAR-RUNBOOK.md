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
