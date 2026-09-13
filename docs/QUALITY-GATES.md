# ORBIS Admin Quality Gates

This document defines the quality contract that applies from the first application-code pull request.

## Principle

ORBIS Admin starts strict rather than tightening quality after technical debt already exists. The repository should prevent avoidable quality debt from entering `main`.

## Pull-request quality gate

For governance/documentation-only changes, the PR workflow validates required repository policy files, validates the Sonar project-isolation contract, and rejects tracked sensitive-looking files.

As soon as application code exists, the full PR gate becomes mandatory. The application-code contract requires:

- deterministic dependency installation through `package-lock.json` and `npm ci`,
- lint with zero warnings,
- TypeScript type-check with zero errors,
- automated tests with coverage output,
- 100% line, statement, function, and branch coverage,
- Knip dead-code check,
- JSCPD duplication check configured to reject duplication,
- dependency audit with no high or critical vulnerabilities,
- successful production build,
- SonarQube Cloud/SonarCloud analysis,
- Sonar quality gate completion before the GitHub job succeeds.

## Mandatory staging verification gate

Every pull request targeting `main` must pass pre-merge staging verification.

The accepted candidate is always the exact PR head SHA. Before merge:

- `staging` must point to that exact SHA,
- the permanent `orbis-admin-staging` Render service must be manually deployed from that SHA,
- `/health` must report the same runtime revision,
- `/health`, `/api/v1/projects`, and the web root must pass public smoke checks,
- the stable GitHub check context `Staging Verification Gate` must succeed.

A post-merge staging sync does not satisfy this gate. Staging exists to validate the candidate before `main` changes.

The gate requires no Render API credential in GitHub Actions. The deployed non-secret commit revision is surfaced by `/health` for exact-SHA verification.

## SonarQube Cloud / SonarCloud policy

ORBIS Admin now has an external SonarQube Cloud project and repository secret configured. The verified project identity is:

- project key: `orbisaideveloper_orbis-admin`
- organization: `orbis`
- project name: `orbis-admin`
- GitHub repository secret name: `SONAR_TOKEN`

The repository contains `sonar-project.properties` with this exact project identity. CI validates the identity before any scan so ORBIS Admin cannot accidentally analyze Foundation, ORBIS, or another Sonar project.

The permanent analysis policy is:

- pull-request analysis for every PR targeting `main`,
- automatic `main` analysis after pushes to `main`,
- an explicit manual `main-baseline` recovery/bootstrap mode,
- no unresolved new issues on changed/new code,
- coverage imported from `coverage/lcov.info`,
- quality gate must pass before merge,
- automatic authenticated diagnostics when the Sonar gate fails.

`SONAR_TOKEN` must remain stored as a GitHub Actions secret. It must never be committed to the repository, copied into reports, or written to shell-history/config files as plain text.

Application code is now present. The full quality workflow is active. GitHub Actions is the canonical owner of `SONAR_TOKEN`; local Termux/proot environments are not required to hold a Sonar token. Pull-request scans, automatic `main` scans, the manual baseline path, and failure diagnostics are defined in `docs/SONAR-RUNBOOK.md`.

Any project-level Sonar Quality Gate settings that are not analysis properties must be configured and verified in SonarQube Cloud itself before they are claimed as enforced. Do not encode unverified server-side Quality Gate behavior as a repository analysis property.

## Coverage policy

The repository target is 100% for newly introduced and materially changed production code from the beginning of implementation.

The CI workflow currently enforces 100% aggregate lines, statements, functions, and branches once application code exists. If the architecture later grows enough that aggregate coverage can hide uncovered changed code, the project should add changed-code/diff coverage enforcement rather than weaken this standard.

A legitimate untestable exception must be narrow, explained in the pull request, and explicitly reviewed. It must not be silently excluded merely to make the gate green.

## Duplication policy

New code should introduce no accepted copy/paste duplication. The application package scripts must expose `check:duplicates:ci`, and its configuration should fail on duplication rather than merely report it.

Generated files, vendored code, build output, and other non-authored artifacts may be excluded only when the exclusion is technically justified and documented in configuration.

## Dead-code policy

Knip is the default dead-code guard. Application scripts must expose `check:deadcode:ci` and CI must fail on actionable dead code unless a documented configuration exclusion is required for framework-generated or runtime-discovered entry points.

## Security policy

CI rejects tracked `.env` files and common private-key/certificate file extensions, while allowing explicitly named environment templates such as `.env.example`.

Dependency audit failures at high or critical severity block the PR. Additional secret scanning and supply-chain checks may be layered in later without weakening this baseline.

## GitHub ruleset integration

The stable GitHub Actions context `Build, Test & Safety Audit` has been observed successfully on PR #2 and is now required by the active `Protect main` ruleset with strict branch-up-to-date enforcement.

The `Staging Verification Gate` check must be observed successfully on this governance PR before it is added to the active `Protect main` ruleset. After that ruleset update, GitHub itself must block merges whenever exact staging verification has not passed.

## Render preview

Render PR Preview is a deployment/review gate, not a replacement for code-quality gates. ORBIS Admin now contains its first deployable application scaffold. A Render service/PR Preview remains a separate deployment setup step and must not replace the code-quality gate. When configured, preview credentials must not provide destructive production access by default.

## Local development

Normal development remains targeted: run checks for the changed area while iterating. Before a change is declared finished and ready for GitHub, run the stronger final verification appropriate to the repository state.

Important Termux verification/setup/diagnostic commands must preserve timestamped reports in Android Downloads according to `AGENTS.md`.
