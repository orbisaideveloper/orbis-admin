# Contributing to ORBIS Admin

ORBIS Admin is a control-plane repository. Changes can affect identity, authorization, deployments, and operational visibility across the ORBIS ecosystem, so contribution rules are intentionally conservative.

## Standard workflow

1. Start from an up-to-date `main` branch.
2. Create a purpose-specific branch.
3. Make the smallest coherent change that solves the task.
4. Run targeted verification for the changed area.
5. Push the branch and open a pull request.
6. Review the PR preview, checks, and diff.
7. Merge only when required checks are green and the change is understood.
8. Production deployment follows the approved merge path.

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
- any follow-up work that remains.

Large changes should be split when practical so architecture, schema, API, and UI can be reviewed clearly.

## Verification policy

During normal development, run targeted checks for the affected area rather than unrelated full-repository verification on every small change.

Before a production-critical release, required repository checks should provide stronger certification appropriate to the maturity of this project. The exact CI gates will evolve as implementation is added and should be enforced by GitHub rules once stable.

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
