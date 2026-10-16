# Central account closeout — 2026-10-16

Owner scope: one permanent central ID and one common account profile, shared by Admin,
Maya and Khata. Khata financial/product data is separate. Maya additionally keeps
up to five account-owned family birth profiles (name, relation, date, time, place,
coordinates and time zone when entered). This explicit owner request approves this
limited birth-settings storage in the central private schema; no conversation or
financial history is replicated.

The common profile is authoritative in orbis_customer.profiles and is exposed only
by the authenticated /api/v1/customer/profile contract. Mutable contact fields do
not define identity. Product UI adapters never receive service-role keys.

Maya family cloud saves are explicit. Restore saved family imports all saved slots
with stable local IDs, preserves existing device profiles, checks the local family
limit before writing, and is idempotent on repeated imports. Concurrent cloud saves
use an expected revision; conflicts require reload. Changing a device does not
change the central ID. Re-login is required on a new device.

Status: source prepared. Previous owner report passed Admin48 and Maya95 tests on
the two-slot version. Five-slot/restore tests and disposable SQL tests must pass
in the next owner report. SQL source has NOT been applied remotely. The deployed
API must match the reviewed code before birth endpoints are available.

Latest read-only central inspection: Auth users1, accounts0, common profiles0.
This is not evidence of a completed real central customer login. The live runner
can verify existing credentials using hidden local input, create/reuse the normal
central account binding, resave the current profile without changing its values,
and verify separate Maya/Khata/Admin sessions and re-login. Secrets stay in memory.
This is real API acceptance, not browser/PWA acceptance or an owner-role login test.

Completion still requires: actual source checks; local SQL isolation tests; reviewed
managed migration; owner-controlled Git delivery; CI/Sonar; authorized deployment;
real API and browser/PWA acceptance. Owner dashboard authorization is separate from
customer identity and is never granted by signup. Foundation is outside this patch.


## 2026-10-16 — Live central-ID proof and birth-storage migration

- Live Khata `841428a` login and reload returned the same `ORB-U-365HD9A3` as Admin.
- Managed Admin migration `20261016154208_maya_five_account_birth_profiles` applied; one account and one common profile preserved, zero birth-profile rows. Forced RLS and service-only RPC grants verified.
- Profile and five-slot browser fixture acceptance added; exact local full certification, Termux publication, remote CI/Sonar and post-deploy persistence remain pending.
- Current Supabase app connections cannot access Khata product `gqyaxsczlmvppxuoqbox`; the financial data gateway is not certified or live-ready. No financial database write or replacement book created.
- Next: run the resumable `ORBIS-CENTRAL-RELEASE-20261016.sh`; successful local gates authorize selected owner-Termux commit/push and an Admin PR. No merge/deployment occurs inside this runner. Inspect the single Downloads report before completing remote release.
