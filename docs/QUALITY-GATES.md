# ORBIS Admin Quality Gates

This document defines the quality contract that applies from the first application-code pull request.

## Principle

ORBIS Admin starts strict rather than tightening quality after technical debt already exists. The repository should prevent avoidable quality debt from entering `main`.

## Pull-request quality gate

For governance/documentation-only changes, the PR workflow validates required repository policy files and rejects tracked sensitive-looking files.

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

## SonarQube Cloud / SonarCloud policy

The project should be configured before the first application-code PR is accepted.

The intended policy is:

- pull-request-centered analysis,
- no unresolved new issues on changed/new code,
- coverage imported from `coverage/lcov.info`,
- quality gate must pass before merge,
- avoid unnecessary scans on arbitrary branch pushes when quota conservation matters,
- add the stable GitHub Sonar/check context to the `Protect main` ruleset only after the check has been observed reliably.

`SONAR_TOKEN` must be stored as a GitHub Actions secret. It must never be committed to the repository.

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

Do not add a required status check to the `Protect main` ruleset before its exact GitHub check name exists and has completed successfully on a pull request.

After this workflow is established and stable, the first intended required GitHub Actions context is:

`Build, Test & Safety Audit`

Sonar and Render preview checks should be added separately only after their exact, stable check names are observed.

## Render preview

Render PR Preview is a deployment/review gate, not a replacement for code-quality gates. Once configured, application PRs should be reviewed in preview before merge. Preview credentials must not provide destructive production access by default.

## Local development

Normal development remains targeted: run checks for the changed area while iterating. Before a change is declared finished and ready for GitHub, run the stronger final verification appropriate to the repository state.

Important Termux verification/setup/diagnostic commands must preserve timestamped reports in Android Downloads according to `AGENTS.md`.
