# Admin recovered source — 2026-10-19

সংরক্ষণের সময়: 2026-10-19T00:23:50.345218+05:30

## কেন রাখা হয়েছে

১৮ অক্টোবরের local audit-এ এই দশটি ফাইল untracked অবস্থায় পাওয়া যায়।
ভবিষ্যতে source হারিয়ে না যায় এবং প্রতিটির উদ্দেশ্য বোঝা যায়,
তাই original path অক্ষুণ্ণ রেখে এই তারিখযুক্ত record তৈরি করা হয়েছে।
এটি সংরক্ষণের তারিখ; code তৈরির বা deployment-এর তারিখ নয়।

Repository: orbisaideveloper/orbis-admin
Branch: feat/maya-membership-gateway
Local HEAD: b4044adbac4dd3480ab3551a219f93f61bc75552
Cached origin/main: fb9a5fe20322e53bb97b2d49b8723c030b880f42

## ফাইল ও উদ্দেশ্য

| Original path | উদ্দেশ্য |
|---|---|
| `database/control/MAYA-MEMBERSHIP-README.md` | Membership-এর ঐতিহাসিক deployment ও source-recovery নির্দেশিকা। |
| `database/control/central-customer-legacy-link.checks.sql` | Legacy ID, session, environment ও permission-এর disposable SQL checks। |
| `database/control/maya-membership.sql` | Maya capability grants-এর schema source। |
| `database/control/maya-astro-capability.sql` | Astro interpretation capability-এর SQL source। |
| `database/control/maya-service-keys.schema-snapshot.sql` | Service-key table-এর reconstructed schema; original migration নয়। |
| `database/control/maya-user-onboarding.sql` | Maya enrollment source; environment-specific configuration update রয়েছে। |
| `supabase/functions/orbis-maya-access/index.ts` | Maya access Edge Function endpoint source। |
| `supabase/functions/orbis-maya-access/core.mjs` | Maya capability access policy। |
| `supabase/functions/orbis-maya-access/core.test.mjs` | Access policy-এর tests। |
| `supabase/functions/orbis-maya-access/astro.test.mjs` | Astro capability permission-এর tests। |

## যাচাই ও সীমা

- প্রতিটি ফাইলের byte count ও SHA-256 manifest.json-এ রয়েছে।
- আগের assistant snapshot পরীক্ষায় core/astro policy tests মোট ৪টি PASS করেছিল।
  এই preservation command tests পুনরায় চালায়নি।
- পুরনো README-তে live membership deployment-এর উল্লেখ আছে;
  এই ধাপে deployed source বা database-এর সঙ্গে নতুন করে মিলিয়ে দেখা হয়নি।
- Status: RECOVERED_SOURCE_NOT_LIVE_CERTIFIED।
- SQL source স্বয়ংক্রিয়ভাবে চালানো যাবে না।
- Schema snapshot original migration নয়।
- Onboarding SQL-এ environment-specific configuration update রয়েছে।
- Commit/push/deployment এই ধাপের অংশ নয়।

## পুরনো তিনটি ফাইলের অবস্থা

central-customer-account.review.sql এবং
central-customer-legacy-link.review.sql-এর implementation managed migration-এ
পাওয়া গেছে। CENTRAL-CUSTOMER-ACCOUNT.md-তে পুরনো candidate status রয়েছে।
ওই তিনটি ফাইল এই preservation package-এর অন্তর্ভুক্ত নয়; মুছেও দেওয়া হয়নি।

## ভবিষ্যতের কাজ

১. Live deployment-এর সঙ্গে recovered membership source মিলিয়ে দেখা।
২. প্রয়োজনীয় disposable SQL ও endpoint checks চালানো।
৩. Historical/reference এবং deployable source-এর অবস্থান পরিষ্কার করা।
৪. যাচাই শেষে owner-এর নির্দেশে selected files commit/push করা।

## Recovery

Downloads-এর একই timestamp-এর recovery archive-এ original paths অনুযায়ী
দশটি file এবং এই record রয়েছে। আগে আলাদা folder-এ extract করে manifest-এর
SHA-256 মিলিয়ে দেখুন। Existing repository-এর ওপর অন্ধভাবে overwrite করবেন না।


## Deno entrypoint classification — 2026-10-19

supabase/functions/orbis-maya-access/index.ts is a standalone Supabase
Deno entrypoint, started through Deno.serve(), not imported by the npm apps.
knip.json lists this exact file alongside the existing orbis-identity-write
entrypoint exception. No directory-wide exclusion or threshold reduction
is introduced. core/astro policy tests remain separate checks.
This exception does not certify Deno endpoint integration or live deployment.
