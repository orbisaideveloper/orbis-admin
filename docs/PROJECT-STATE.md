# ORBIS Admin — Project State and Session Handoff

Last updated: 2026-10-06, Asia/Kolkata. This replaces stale planning/status prose
with the latest reviewed checkpoint; it does not certify new live enablement.

## Repository and operating rules

Repository: `orbisaideveloper/orbis-admin`; Termux: `~/orbis-admin`.
Read `AGENTS.md`, this file, CONTROL-PLANE-VISION, ARCHITECTURE, DECISIONS,
QUALITY-GATES, FIRST-APPLICATION-PLAN, V1-SCREEN-PLAN and IDENTITY-FOUNDATION.
Protected main is PR-first. Use a focused branch and exact-head permanent staging
verification before merge. PR previews are not required by the owner's accepted
workflow. No force push, bypass, silent reset or cross-product credential reuse.
Evidence-producing commands save timestamped Downloads reports without secrets.

## Verified source and delivery checkpoint

- PR #16 merged; main: `571906e08d989e92e3fa80ed43b61b1de3d9ac87`.
- Approved PR/staging candidate: `9d60d152fab06371bc7fcc30907c2920048824c8`.
- Main CI run `37353906020` succeeded, including the strict Sonar checks.
- Owner Termux reports: `ORBIS-ADMIN-PR16-MERGE-20261005-233955.txt` and
  `ORBIS-ADMIN-MAIN-CI-20261005-234424.txt`.
- Application shell, canonical Project Registry, GitHub/Render read providers,
  Maya workspace, owner-auth/control source and durable audit adapter are merged.
  Source implementation is distinct from configuration and live verification.

## Render checkpoint — 2026-10-05 inspection

My Workspace: `tea-d9968vecjfls73fpecr0`.
`orbis-admin-staging`, service `srv-dai144uq1p3s73ajc1ag`, Singapore, staging branch,
manual deployment/auto-deploy off, was LIVE on the approved candidate above.
URL: https://orbis-admin-staging.onrender.com.
Build: `npm ci --ignore-scripts && npm run build`; start: `npm start`; health: `/health`.
No separate Admin production service was observed. Main merge is not proof of a
production deploy. Staging candidate and merge SHA need not be identical after merge.

Maya's Development static site exists: `srv-davrsgbncjis73fhhr70`,
https://orbis-maya-development.onrender.com, LIVE at
`25b14e1509c4fd43011a667d02e3ed5dfc06255e` in that inspection; auto-deploy off.
Admin provides the actual Development app, full-screen link and source metadata.
Public target/publishing remains disabled pending separate release verification.

## Dedicated database and identity

Admin Supabase project: `aqcwhqdzniruvoqwfsij`.
Five identity migrations are recorded; private `orbis_identity` persistence and
the active `orbis-identity-write` Edge Function were provider-verified. Existing
identity migrations must not be reapplied. Recorded versions and the connection
boundary are documented in `database/README.md`.

Foundation calls that API through server-only `ORBIS_IDENTITY_WRITE_URL`,
`ORBIS_IDENTITY_SERVICE_KEY` and `ORBIS_PROJECT_ID`. The Edge Function connects
with its server-side `SUPABASE_DB_URL`. API linkage does not require an Admin
database URI in Foundation Termux. It does not establish Maya capability access
or certify a particular live user's linkage. Product business data stays separate.

## Maya owner-control source versus live state

Merged code implements Google PKCE owner login, remote token verification,
explicit canonical owner bindings, scoped capabilities, development-only deploy
confirmation and durable audit RPC integration. See MAYA-OWNER-CONTROLS.md.

`database/control/maya-controls.sql` is still pending live application. The last
read-only database inspection found no `orbis_control` schema. Neither schema
creation nor ordinary signup grants owner privileges; defaults disable writes.
Live owner authentication, redirects, bindings, server credentials, audit/RPC
behavior and deployment outcomes require real verification before enabling writes.

The restricted Foundation Maya gateway is committed/deployed at its reviewed
checkpoint, but lacks the real membership/capability adapter. Do not describe
Maya AI, public membership, Public release or owner controls as fully operational.

## Exact next action and scope

Deliver this documentation reconciliation through Termux and normal Admin PR
rules, with applicable checks and owner-approved commit/push. No database write
is performed by this documentation patch. Then proceed with the selected Maya
dashboard UI in the design chat; revisit Admin/Foundation only for Maya needs.
Before control enablement, complete the dedicated Admin managed migration and
verification, then explicit owner binding/configuration and live checks.

## Historical context

Earlier PR #4 scaffold, PR #6 registry, PR #9 Render read provider and PR #10
identity foundation milestones remain historical delivery evidence, not current
main/deployment identities. Older planning documents describe their milestone
scope; current source and fresh provider/owner reports determine completion.
