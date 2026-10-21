# Central Orbis customer account — owner direction, 2026-10-12

One Admin-owned customer authentication authority serves Foundation, Maya, Khata
and future products. Initial signup: name, phone number and password; email and
password is also supported. Phone input uses E.164; Indian ten-digit mobile input
normalizes to +91. No Google login, signup email link or SMS OTP is required by
this owner-approved flow. Supabase password signup must have the corresponding
provider enabled and auto-confirmation configured before it is enabled here.
A password is sent only to central Supabase Auth; it is not stored in customer
profile tables, identity records, reports or browser localStorage.

The stable UUIDv7 Orbis identity and human display ID are distinct from the Auth
user UUID. Product profiles remain product-owned and attach to the central ID.
Customers do not acquire Admin owner or deployment rights. Subscription decisions
are deferred. Ordinary customer access and data isolation remain necessary.

## Prepared API, not deployed

`POST /api/v1/customer/signup` accepts `{name, identifier, password}`.
`POST /api/v1/customer/login` accepts `{identifier, password}`.
`POST /api/v1/customer/refresh` accepts `{refreshToken}`.
`GET /api/v1/customer/session` and `POST /api/v1/customer/logout` require a Bearer
access token. Session responses contain the central identity and Auth tokens.
No provider error bodies, credentials or raw input are logged/returned as errors.
The browser must store sessions on the product's own origin and refresh them,
never share tokens via URL parameters. Every product still needs a reviewed client
adapter; session storage is isolated by browser origin and by Android app.

This candidate is disabled by default and requires Admin-server configuration:
`ORBIS_CUSTOMER_AUTH=enabled`, `ORBIS_CUSTOMER_SUPABASE_URL`,
`ORBIS_CUSTOMER_PUBLISHABLE_KEY`, `ORBIS_CUSTOMER_SERVICE_KEY`, and a comma-separated
`ORBIS_CUSTOMER_ORIGINS` allowlist. Service keys stay server-side. This setup is
centralized once, not a signup database configured for each product.
Only `https://aqcwhqdzniruvoqwfsij.supabase.co` is accepted as the authority.
The IP rate limit is process-local; proxy configuration and distributed limits
must be reviewed before public enablement. Root Fastify currently has logger=false.

## Identity and legacy preservation

`database/control/central-customer-account.review.sql` is review source, not an
applied migration. It adds a private Auth-to-Orbis binding and a service-only RPC.
It does not migrate credentials or rewrite any existing product account,
organization, ledger, transaction, identity or product reference. Existing central
bindings reuse their identity. Suspended/revoked accounts fail closed.
Legacy identifier collisions stop provisioning rather than auto-merging people
by unverified email/phone. Explicit proof-backed legacy import/link is still
required. The database candidate needs disposable validation, advisor review,
managed migration creation and approval before application.

## Remaining work — do not describe this candidate as complete login

- Verify legacy Foundation/Khata auth users, product IDs and RLS ownership.
- Preserve existing identities through a reviewed credential import/link workflow.
- Add product adapters without replacing local data ownership IDs.
- Connect Maya UI phone/email/password and its persistent central session.
- Foundation APIs must verify central tokens and resolve product ownership IDs.
- Khata directly uses its own Supabase for data; central tokens cannot simply
  replace product tokens. A verified product-data bridge/trust setup is needed.
- Run targeted checks, then full certification and real customer login/refresh/
  logout across products. No deployment, database or product login was changed
  merely by preparing this candidate.

## Shared session client prepared

`packages/contracts/src/customer-session.ts` implements the same customer API
protocol for product adapters: password-free session storage, remotely verified
restore, coalesced refresh, canonical-ID checks and explicit signout. Network
outages preserve refresh material; revoked sessions clear it. Late responses
cannot resurrect a signed-out account. It does not delete product profiles.
The server verifies JWTs remotely before inspecting session claims; its service-only
identity RPC checks the actual live auth.sessions row on every bootstrap/read.
The shared client is exported but product adapters are not enabled yet.

## Product ownership mapping prepared

GET `/api/v1/customer/session/products/:project/:environment` requires a central
customer token and returns an existing reviewed local-user/account binding.
Production, staging and development bindings are separate. Missing mappings return
CUSTOMER_PRODUCT_NOT_LINKED; they never copy financial rows or silently create a
replacement account. The mapping SQL remains review-only and unpopulated.
Read-only live checkpoint: 3 Foundation production references, 9 Foundation staging
references; these are not twelve independently verified real customers.

## Central customer screen prepared

Admin `/account` provides a Bengali name/phone-or-email/password screen, stable
display ID, session restoration and signout. It is routed independently from the
project registry and has no Google owner-login dependency. GET `/api/v1/customer/config`
returns availability only, never keys. It does not certify migrated product access.
Central Auth remains disabled; SQL, legacy reconciliation, product adapters,
coverage gates and real cross-product customer verification are still required.

## Common profile authority (owner instruction, 2026-10-12)
Common name/contact/address/alternate phone/date of birth/gender belong in Admin DB,
attached to the immutable central ID. Product-specific profiles remain separate.
GET/POST /api/v1/customer/profile resolve the caller from verified Auth/session,
never accept a client-supplied account ID, and preserve omitted fields.
Primary phone/email come from Auth; this profile endpoint cannot replace login contacts,
password, roles or IDs. Passwords never appear in profile responses or owner lists.
The review SQL is not applied. Owner-wide customer listing still needs the existing
owner capability boundary and audit integration; ordinary customer tokens cannot list users.
All product login adapters and old accounting ownership reconciliation remain pending.

Owner directory GET /api/v1/admin/customers requires the existing remotely verified
owner binding plus orbis-admin:production:customers.read. No customer-role auto-promotion.
The service-only RPC verifies session liveness and records directory reads without
contact information in the audit record. Paginated rows expose only ID/name/email/phone.
Directory UI and profile editing UI integration are still pending; backend source is prepared.

## Owner directory and common-profile UI prepared, 2026-10-12
`/customers` is independent of registry availability and uses only the separate
owner session. The server remains the authority for customers.read permission.
It has cursor pagination, no-store requests, cancellation on unmount, response
validation and immediate contact clearing on login/logout/page requests.
`/account` now reads and edits the authenticated customer's common profile,
verifies response identity and never submits an account ID or password.
These changes await the owner's targeted Termux checks. No managed migration,
Auth enablement, product trust configuration or production deployment is implied.
Live read-only checkpoint: accounts/profiles absent; twelve central identities.
Khata's direct product Supabase access cannot use a central token until an
explicit product trust/ownership bridge is implemented and verified.
