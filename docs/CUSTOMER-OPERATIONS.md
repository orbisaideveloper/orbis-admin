# Central customer and app operations — Admin-only release

## Scope and navigation

Owner-approved 2026-11-01: implement the central customer/app dashboard in ORBIS
Admin only. No Khata repository, product schema, accounting calculation or product
credentials are changed. Home → Central Users, menu → কাস্টমার ও অ্যাপের ব্যবহার,
or Projects → ORBIS Khata → গ্রাহক ও login কার্যকলাপ opens `/operations`.

`/operations?project=orbis-khata` filters linked customers and app-origin login
telemetry. A customer name opens `/operations?customer=<auth-user-reference>`.
The canonical immutable ORBIS ID is displayed separately; an unlinked auth account
has no invented permanent identity. App relationships are active central bindings
and user references, not a claim of recent use or premium membership.

## Delivered source

- Server-verified owner access with existing `orbis-admin:production:customers.read`.
- Versioned, validated, server-only read model, 50 accounts per cursor page.
- Registered/last central sign-in timestamps, contacts, lifecycle, missing linkage.
- App relationships and account/app drill-down, including Khata registry entry.
- Bounded last-24-hour login/signup attempt feed (latest 50), elapsed server-side
  request duration, outcome/code, event reference, known successful central ID.
- Credential-free, best-effort telemetry, maximum 32 in-flight sends, 2-second
  timeout. Login response never waits for telemetry; logging failures/dropouts are
  possible and must not be interpreted as no attempts. Existing sessions, password
  handling, signup/bootstrap and financial data remain unchanged.
- Unknown failed identities remain unknown. No submitted email/phone/password,
  token, IP, user agent or request body is persisted. An app origin is an
  observational hint only; it cannot grant permissions or establish identity.
- Missing database/file MB, company/bill counts and premium entitlement remain
  explicitly unavailable, not zero/free. No product integration or business-data
  replication is introduced. Those metrics require a later separately approved
  Admin-side read adapter/product summary contract.

## Dedicated Admin database release — PREPARED, NOT APPLIED

Exact target: `aqcwhqdzniruvoqwfsij`. Managed release source is
`database/control/admin-customer-observability.sql`. This control-file preparation
follows the repository's existing dedicated Admin release pattern; it is not a
claim that a managed migration history entry has been created or applied.

Before enablement:
1. Review SQL and run the disposable SQL workflow. Verify recoverable Admin backup,
   current managed history and original customer/identity schema prerequisites.
2. Apply the additive SQL once using the approved managed migration path in the
   dedicated Admin project. Never apply disposable fixtures or this release to
   Khata. Record its actual provider migration version.
3. Verify private-table forced RLS, revoked browser/table grants, service-only
   wrappers/private definer functions and live-session checks. Owner capability
   is checked in the API before using the server-only RPC. Reads write only the
   existing directory audit, not customer/profile/account records.
4. Confirm the existing owner binding includes `orbis-admin:production:customers.read`.
   Do not grant an ordinary customer this capability.
5. Enable `ORBIS_CUSTOMER_OBSERVABILITY=enabled` on Admin only. Reuse existing
   Admin customer URL/service-key settings; never add product database keys.
6. Separately deploy the reviewed Admin commit and check live owner access,
   denied ordinary customer access, identity timestamps, fresh successful and
   failed attempts. No live enablement is performed by committing these files.

Recording begins after enablement and does not backfill prior Supabase errors.
Requests rejected before the login handler (CORS/rate/parse errors), refresh,
pre-request abandonment and browser/network timing are not collected. Empty
activity is explicitly not proof of no attempts. Data remains time-windowed and
bounded on reads. On inserts, at most 1,000 rows older than 30 days are purged;
idle deployments can retain older rows until recording resumes. This is not a
strict timed-deletion guarantee or tamper-proof audit ledger.

## Verification

New contract, adapter, owner/capability boundary, UI navigation, paging, empty and
failure states, stale request cancellation and telemetry isolation have automated
unit coverage. The disposable PostgreSQL workflow validates SQL/session guards,
role grants, unknown-failure non-attribution, pagination, idempotent telemetry,
cleanup and unchanged original auth fingerprints. It uses synthetic fixtures,
not live customer data. The cloud host's `networkInterfaces` syscall prevents
one existing local Fastify listen test; exact-commit GitHub runtime checks must
supply that final native Linux runtime evidence. Do not weaken tests or thresholds.

## Customer dashboard — 2026-11-01

`/operations?project=orbis-khata` opens a mobile summary, with separate customer,
successful-login and failed-login cards. `view=customers|success|failure` is UI
navigation only and is removed before the protected API request. Customer tables
show serial/name/email/display Orbis ID; details retain immutable IDs. Back/Home
links are always available, including direct entry. Pagination retains app scope.

Login totals cover all recorded login requests in the last 24 hours, independently
of the bounded lists (50 events per outcome). Signup is excluded from login
counts. These are requests, not unique people or concurrent sessions. Telemetry
is best effort; failures do not prove an identity, and origin does not prove
product membership. Previous response contracts remain readable during rollout.

The reviewed Admin-only `admin-customer-dashboard.sql` replaces only the read RPC
and preserves its service-only grants/live-session check. The disposable CI
verifies upgrade, full-window counts, per-outcome bounds and source preservation.
Khata's read-verified canonical principal → ledger owner references may be
registered in Admin as `ledger-owner` references with a durable identity action
and audit event. This metadata provides visibility only: it does not create a
product auth binding, merge people, change passwords or change ledger ownership.
Do not reconcile by email. Additional/new principals require the same verified
product evidence; a successful login alone is not evidence of a Khata ledger.
No product database write, accounting migration or Khata deployment is required.
