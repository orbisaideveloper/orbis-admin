# Maya workspace integration

## Implemented read boundary

`GET /api/v1/projects/orbis-maya/workspace` returns `maya.workspace.v1`.
Only project identity, source version/revision, configured view URLs and the
observation timestamp are returned. No user settings, history, audio, identity
credentials or provider secrets are accepted or returned.

The server reads Maya's registered GitHub main branch and pins the package
read to that exact commit. A shared one-minute cache coalesces concurrent
requests. Each GitHub read has an eight-second timeout, rejects redirects and
rejects metadata bodies over 64 KiB. Failures produce unknown source fields;
the timestamp records an observation attempt, not a successful deployment.

The Maya project panel polls once per minute after a request completes,
preserves its previous observation with a stale warning after network errors,
and cancels further updates after unmount. Source version/revision never imply
that a release was published, a gateway is working or a service is healthy.

## View configuration

The Admin server may receive `ORBIS_MAYA_PUBLIC_URL` and
`ORBIS_MAYA_DEVELOPMENT_URL`. These are owner-managed, non-secret HTTPS product
URLs. Credential-bearing URLs, localhost, IP literals and non-HTTPS URLs are
rejected. Browser code cannot change them. Invalid or missing URLs disable the
corresponding view. No server-side requests are made to these URLs.

The app can be displayed in a sandboxed frame, with an external full-screen
link for installation, OAuth and browsers that cannot embed the product. The
product's frame policy must allow the Admin origin before inline preview can
work. Cookies/authentication remain isolated by origin; Admin does not proxy
product credentials. Voice/browser features should use the full-screen view.

A phone's localhost is not accessible from cloud Admin. This change does not
create a public deployment or a new preview service. URLs must be configured
only after their separate deployment and environment identity are verified.

## Remaining control boundary

This is read-only workspace integration, not completion of the control plane.
Maya currently has no registered public/review Render service. Embedded app
views cannot be claimed operational until the actual URLs are configured and
verified. Modules, published release and gateway health remain unknown.

Before enabling Admin deploy/publish/settings writes, implement verified Admin
authentication, project/environment-scoped capabilities, confirmation,
idempotent actions, durable audit records and write-disable controls according
to ADR-017, ADR-019, ADR-020 and ADR-022. A GitHub workflow link is navigation;
it does not grant repository access or execute a command. Product capability
advertisements do not grant user membership or AI authorization.

Full certification is run on the owner's Termux/Linux environment. Every new
candidate needs exact-head staging verification before main merge. Do not
merge this source preparation based only on local targeted checks.
