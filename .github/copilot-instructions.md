# ORBIS Admin — GitHub Copilot Instructions

Use `AGENTS.md` as the master repository instruction and do not introduce guidance that conflicts with it.

## Session start

Before proposing or changing ORBIS Admin code/configuration, read:

1. `AGENTS.md`
2. `docs/PROJECT-STATE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DECISIONS.md`
5. `docs/QUALITY-GATES.md`
6. `docs/FIRST-APPLICATION-PLAN.md` while the first application scaffold is being planned or built

`docs/PROJECT-STATE.md` is the canonical current-phase handoff, but live GitHub/Sonar/Render/database/deployment state must still be verified before mutations.

Key rules:

- ORBIS Admin is the central ORBIS identity and administrative control plane.
- Keep product-specific business data in each product's own database.
- Use one immutable central ORBIS user identifier across products.
- Do not derive permanent identity from mutable email or phone values.
- Keep GitHub, Render, database-provider, and other privileged credentials server-side.
- Apply least privilege to all integration and administrative actions.
- Treat read-only observability and write/control capabilities separately.
- Make sensitive administrative actions auditable.
- Inspect current source and directly connected contracts before changing behavior.
- Follow Always Verify: do not report completion from edits alone; verify the relevant branch/HEAD, diff, tests/checks, preview/deployment, and database state when applicable.
- Avoid unrelated refactors.
- Work on a purpose-specific branch and deliver changes through a pull request.
- Do not use auto-merge by default; merge is an explicit/manual acceptance after review and required checks pass.
- Use targeted verification for normal development; do not run unrelated expensive checks for small changes.
- New pages/components and newly introduced or materially changed production code should target 100% coverage for the affected new code unless a narrow exception is explicitly documented.
- Use SonarQube Cloud/SonarCloud as a PR quality gate once configured, with a no-new-issues policy on changed/new code.
- Add CI/Sonar/preview checks to the main-branch ruleset only after their exact GitHub check names exist reliably.
- PR preview should precede merge for application changes once Render preview infrastructure is configured.
- Production deploys should remain explicit/manual unless a later accepted architecture decision changes that policy.
- Report-worthy Termux setup/verification/audit/governance commands must save timestamped reports to `$HOME/storage/downloads/` as defined in `AGENTS.md`.
- Update architecture/decision documentation and `docs/PROJECT-STATE.md` when durable system rules or the current roadmap state change.

When uncertain about current scope, read `docs/PROJECT-STATE.md` first. When uncertain about system boundaries, consult `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` before proposing implementation.
