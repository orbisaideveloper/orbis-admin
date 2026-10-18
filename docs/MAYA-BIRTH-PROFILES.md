# Five account-owned Maya birth profiles — 2026-10-16 candidate

Owner-approved scope: preserve up to five Maya birth profiles under one central
Orbis account. Common account name/contact/DOB remain separate from each person's
Maya birth details. Device family profiles and chat/history are not deleted,
merged across accounts or uploaded automatically.

GET/POST /api/v1/customer/maya/profiles uses the existing customer CORS, no-store,
rate limit and verified-session boundary. POST accepts expectedRevision, slot (1 through 5), relation and birth profile. It accepts no target account/user identifier.
The server verifies the current Auth token, resolves the canonical account and
uses only server-side credentials for the persistence RPC. The private definer
re-checks a live session and active identity. Direct anon/authenticated access is
revoked. Public RPC wrapper is SECURITY INVOKER; the private table has forced RLS.

Per-account locking and an expected revision prevent lost updates across devices.
A stale write returns MAYA_PROFILE_CONFLICT/409 and must be reloaded/reviewed.
The UI requires confirmation before saving into a central slot or replacing
the currently selected device profile. If that device profile changed while the
confirmation was open, replacement stops. Signout/account changes abort requests.
Coordinates/timezone accompany birth details; no chart positions are fabricated.

Database source: database/migrations/20261016154208_maya_five_account_birth_profiles.sql in Admin.
It is NOT applied, a managed migration, an advisor pass or a live-storage result.
Before deployment: validate SQL in a disposable database with isolation/conflict/
revocation tests; run advisors; create the managed migration using Supabase CLI;
obtain owner approval for the reviewed migration; deploy the verified Admin API;
then enable/verify the Maya UI using real customer sessions on two devices.
No private credentials, conversation archive or financial ownership migration is
included. Foundation legacy reconciliation remains a separate proof-backed task.

Assistant static TypeScript/ESLint checks passed. Owner targeted tests, 100%
coverage, PWA/mobile E2E, exact CI/Sonar and actual save/reload are still pending.
The installer creates a private Admin branch and patches the local Maya source;
it does not commit/push/merge/deploy, restart servers or execute database SQL.

Owner expansion 2026-10-16: five slots and explicit whole-family restore with stable local IDs. Existing device family data remains preserved. See CENTRAL-ACCOUNT-CLOSEOUT.md.


## 2026-10-16 — Live central-ID proof and birth-storage migration

- Live Khata `841428a` login and reload returned the same `ORB-U-365HD9A3` as Admin.
- Managed Admin migration `20261016154208_maya_five_account_birth_profiles` applied; one account and one common profile preserved, zero birth-profile rows. Forced RLS and service-only RPC grants verified.
- Profile and five-slot browser fixture acceptance added; exact local full certification, Termux publication, remote CI/Sonar and post-deploy persistence remain pending.
- Current Supabase app connections cannot access Khata product `gqyaxsczlmvppxuoqbox`; the financial data gateway is not certified or live-ready. No financial database write or replacement book created.
- Next: run the resumable `ORBIS-CENTRAL-RELEASE-20261016.sh`; successful local gates authorize selected owner-Termux commit/push and an Admin PR. No merge/deployment occurs inside this runner. Inspect the single Downloads report before completing remote release.
