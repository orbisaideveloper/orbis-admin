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

## Execution environment and shared toolchain

ORBIS work is performed from Android Termux with an Ubuntu `proot-distro` environment available for standard Linux tooling. Future chats, agents, and contributors must inspect the existing environment before installing or replacing tools.

### Shared tools vs project-local configuration

- Termux is one shared user environment across ORBIS repositories. Common command-line tools such as Git, GitHub CLI, Node/npm, Python, and compatible utilities are installed once and reused; do not reinstall them merely because the active repository changed.
- Ubuntu/proot is the shared standard-Linux execution environment for tools that depend on glibc or otherwise do not run correctly in native Android Termux.
- Before any install or upgrade, first check whether the tool already exists and is usable in native Termux **and** in Ubuntu/proot when relevant. Prefer `command -v <tool>` plus a safe version/status command; for Ubuntu use `proot-distro login ubuntu -- bash -lc 'command -v <tool> && <tool> --version'` or the closest non-destructive equivalent.
- Do not reinstall, replace, or upgrade an existing working shared tool without a specific reason and appropriate verification.
- A shared CLI/authentication context does **not** make project configuration shared. Repository files, project keys, GitHub repository secrets, Sonar configuration, Render services, Supabase projects/databases, environment variables, and deployment settings remain project-specific.
- Never copy or reuse another ORBIS product's project key, secret, database configuration, deployment target, or write-capable integration merely because the same CLI is authenticated.

### Android ARM64 placement rules

- SonarQube CLI must be installed and executed in Ubuntu/proot for this Android ARM64 workflow, not relied upon as a native Termux binary. The official Linux ARM64 SonarQube CLI binary is a standard Linux binary and the observed native Termux install was not executable in the Android userspace.
- If Prisma engine tooling is introduced in ORBIS Admin, do not run Prisma engines in native Termux Android ARM64; use Ubuntu/proot or an approved raw-SQL/provider workflow as appropriate.
- Other tools that fail because of Linux ABI/runtime assumptions should be moved to Ubuntu/proot rather than repeatedly reinstalled in native Termux.

### ORBIS Admin repository isolation

- When the task is ORBIS Admin, the working repository is `~/orbis-admin` and the expected GitHub repository is `orbisaideveloper/orbis-admin`.
- Before any mutating setup, GitHub, Sonar, Render, Supabase, migration, deployment, or repository command block, verify the current repository/path and remote target.
- Do not inspect, modify, reconfigure, or use another ORBIS repository as a write target unless the user explicitly asks for that repository in the current task.
- Shared user-level tools may be used from ORBIS Admin, but project-level actions must remain scoped to ORBIS Admin.

## Termux command reporting policy

ORBIS Admin work is mobile-first. Important Termux command output must be preserved as a file so it can be uploaded and reviewed without relying on screenshots or copied terminal history.

### Commands that MUST create a Downloads report

Any Termux command or command block that produces evidence needed to decide, verify, diagnose, configure, migrate, deploy, review, or recover the repository/system must save a timestamped report in Android Downloads. This includes, but is not limited to:

- GitHub repository or Ruleset setup/verification,
- branch/PR/merge verification blocks,
- CI, Sonar, Render, Supabase, deployment, or environment diagnostics,
- test, coverage, lint, type-check, build, Knip, JSCPD, Playwright, mutation, security, dependency, or quality runs,
- database/schema/migration/drift checks,
- architecture/security/tenant audits,
- install/upgrade/setup commands whose output may affect the next decision,
- multi-step troubleshooting or recovery commands,
- any command that may run for more than a trivial moment or may produce substantial output,
- any command whose result the user is expected to send back for review.

### Commands that normally do NOT need a report

Simple navigation or one-line orientation commands such as `cd`, `pwd`, `ls`, a single `git status -sb`, or another short read-only command do not need a separate report unless they are part of a larger verification/setup block or their output is specifically needed as evidence.

### Required report behavior

- Preferred path: `$HOME/storage/downloads/` after Termux storage access has been granted.
- File names must be timestamped and descriptive, preferably `ORBIS-ADMIN-<TASK>-YYYYMMDD-HHMMSS.txt`.
- Capture both stdout and stderr, normally with `2>&1 | tee "$REPORT"` or an equivalent safe wrapper.
- The report should include, when relevant: repository path/name, branch, HEAD SHA, task purpose, start time, commands/stages, PASS/FAIL state, exit code, warnings, and finish time.
- Show the final report path clearly in the terminal after the run.
- Preserve the report even on failure.
- Stop on unsafe or ambiguous failures before destructive recovery actions.
- Do not hide failures by resetting, force-pushing, deleting, rewriting history, or discarding local work unless the user explicitly authorizes the exact recovery action.
- Prefer fail-fast behavior for verification/setup blocks when continuing could create misleading results.
- Keep the interactive shell responsive whenever practical; long-running workflows should use safe reporting/checkpoint behavior appropriate to the task.

### Standard Termux reporting pattern

Use a subshell for report-worthy blocks so an internal `exit` propagates a useful status without closing the user's interactive Termux shell:

```bash
TS="$(date +%Y%m%d-%H%M%S)"
REPORT="$HOME/storage/downloads/ORBIS-ADMIN-<TASK>-$TS.txt"

(
  set -o pipefail

  {
    echo "Started: $(date)"
    echo "Repo: $(pwd)"
    echo "Branch: $(git branch --show-current 2>/dev/null || true)"
    echo "HEAD: $(git rev-parse HEAD 2>/dev/null || true)"

    # task commands here

    echo "Finished: $(date)"
  } 2>&1 | tee "$REPORT"

  RC=${PIPESTATUS[0]}
  {
    echo "REPORT: $REPORT"
    echo "EXIT CODE: $RC"
  } | tee -a "$REPORT"

  exit "$RC"
)
RC=$?
echo "COMMAND BLOCK EXIT CODE: $RC"
```

The `exit` above is intentionally inside the subshell. Do not place `exit "$RC"` at the end of a pasted interactive Termux command block where it would close the user's shell.

Use this as a baseline, adapting it when the command has special exit-code, background-process, secret-redaction, or checkpoint requirements. Never print secret values into a report.

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
- a preserved timestamped Downloads report for every report-worthy Termux command or command block used as implementation, setup, diagnostic, audit, or verification evidence.
