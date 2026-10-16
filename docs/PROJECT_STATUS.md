

## 2026-10-16 — Central ID five-family closeout prepared

One central account/profile for Admin, Maya and Khata; Maya five cloud birth slots and explicit idempotent family restore. Source verification, private disposable SQL and real API acceptance are recorded separately in the ORBIS-CENTRAL-FINISH report. No commit/push/deployment/remote migration in this runner. Browser/PWA acceptance and owner-role Admin login remain distinct. Next: inspect this report, deliver verified source through the owner Git workflow, then reviewed migration/deployment and browser acceptance.


## 2026-10-16 — Live central-ID proof and birth-storage migration

- Live Khata `841428a` login and reload returned the same `ORB-U-365HD9A3` as Admin.
- Managed Admin migration `20261016154208_maya_five_account_birth_profiles` applied; one account and one common profile preserved, zero birth-profile rows. Forced RLS and service-only RPC grants verified.
- Profile and five-slot browser fixture acceptance added; exact local full certification, Termux publication, remote CI/Sonar and post-deploy persistence remain pending.
- Current Supabase app connections cannot access Khata product `gqyaxsczlmvppxuoqbox`; the financial data gateway is not certified or live-ready. No financial database write or replacement book created.
- Next: run the resumable `ORBIS-CENTRAL-RELEASE-20261016.sh`; successful local gates authorize selected owner-Termux commit/push and an Admin PR. No merge/deployment occurs inside this runner. Inspect the single Downloads report before completing remote release.
