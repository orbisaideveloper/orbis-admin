## Summary

Describe what changed and why.

## Scope

- Affected subsystem(s):
- Out-of-scope items intentionally left unchanged:

## Verification

Describe the targeted checks, tests, preview validation, manual verification, and any relevant branch/HEAD evidence.

- [ ] Current branch/HEAD and diff reviewed.
- [ ] Targeted tests/checks for the changed area passed.
- [ ] Required GitHub checks passed, if configured.
- [ ] PR preview reviewed, if applicable/configured.
- [ ] Long-running Termux verification/audit produced a timestamped Downloads report, if applicable.

## Quality

- [ ] New pages/components or newly introduced/materially changed production code have tests targeting 100% coverage for the affected new code, or a narrow exception is documented below.
- [ ] SonarQube Cloud/SonarCloud reports no new issues on changed/new code, if configured for this PR.

Coverage/Sonar exception (if any):

`None`

## Risk review

- [ ] No secrets or privileged credentials are committed.
- [ ] Identity/user boundaries were reviewed if relevant.
- [ ] Authorization/permission impact was reviewed if relevant.
- [ ] Database/migration impact was reviewed if relevant.
- [ ] Deployment/production impact was reviewed if relevant.
- [ ] Durable architecture decisions/documentation were updated if needed.
- [ ] Review conversations are resolved before merge.

## Deployment

Describe whether this PR changes staging, production, Render, GitHub Actions, environment variables, or external integrations.

Production deployment should remain explicit/manual unless an accepted architecture decision says otherwise.

## Follow-up

List any known follow-up work, or write `None`.
