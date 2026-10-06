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

A phone's localhost is not accessible from cloud Admin. The owner-approved
permanent Development PWA is https://orbis-maya-development.onrender.com.
Render static site `srv-davrsgbncjis73fhhr70` builds Maya main with
`npm ci --ignore-scripts && npm run build:pwa`, publishes `dist`, and uses
Node 24.13.0. Automatic deployment and PR previews are disabled. This is a
development environment, not an approved public release.

The existing Admin staging service has `ORBIS_MAYA_DEVELOPMENT_URL` configured.
The Development view was verified with the actual Maya dashboard embedded.
The registry records this static site's global CDN deployment separately from
GitHub source metadata. A source commit does not prove that commit is deployed.
Provider credentials remain server-side; absent credentials produce unknown
status. Public view remains disabled until a separately approved release URL
is configured and verified.

## Remaining control boundary

This is read-only workspace integration, not completion of the control plane.
The Development view is operational. Public release, modules and live AI
gateway health remain unverified. Development deploy/auth/audit control source is merged, but live enablement
remains pending. Public publication and settings writes are not certified live.

Before enabling Admin writes, configure and verify the implemented owner-auth,
scoped-capability, confirmation, idempotency, audit and write-disable boundaries
described in MAYA-OWNER-CONTROLS.md. Apply the pending Admin control schema through
the managed database workflow. Public publishing still needs a separate approved
release policy/target under ADR-017, ADR-019, ADR-020 and ADR-022. A GitHub workflow link is navigation;
it does not grant repository access or execute a command. Product capability
advertisements do not grant user membership or AI authorization.

Full certification is run on the owner's Termux/Linux environment. Every new
candidate needs exact-head staging verification before main merge. Do not
merge this source preparation based only on local targeted checks.

## App-first workspace and release isolation

Opening Maya selects the Development app immediately. The actual product URL
is framed at mobile width; the full-screen link remains available for Google
OAuth, microphone, installation and browser capabilities that embedded frames
cannot fully reproduce. Metadata and operational controls sit in collapsed
panels below the app, rather than ahead of the product view.

Published and Development must use separate deployment services/origins.
Published points to the last approved production artifact; ordinary source
pushes and development deployments must never target that service. Switching
tabs is read-only and never deploys. Missing production URLs remain disabled,
not substituted with development. The current deploy capability targets only
the fixed development service. A UI view switch alone does not implement an
immutable release registry or authorize publication. Public release remains
pending a verified production target, pinned artifact and approved publish
policy. Live owner authentication and durable audit enablement also remain
pending; this UI change must not be reported as full Admin integration.
