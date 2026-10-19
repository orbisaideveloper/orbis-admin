# Archived Admin candidates

Archived: 2026-10-19T00:27:20.985360+05:30

এই তিনটি ফাইল historical reference হিসেবে সংরক্ষিত।
এটি archive করার তারিখ; code তৈরি বা deployment-এর তারিখ নয়।
SQL পুনরায় চালানো বা পুরনো status-কে বর্তমান অবস্থা ধরা যাবে না।

## কেন সরানো হয়েছে

- central-customer-account.review.sql এবং
  central-customer-legacy-link.review.sql:
  পূর্বের review candidates। Implementation-এর schema/function/permission
  বর্তমান managed migration-এ পাওয়া গেছে।
- CENTRAL-CUSTOMER-ACCOUNT.md:
  পুরনো candidate documentation; disabled/not-deployed বক্তব্যের কিছু অংশ
  পরবর্তী implementation ও login evidence-এর আগের অবস্থা বর্ণনা করে।

## বর্তমান reference — reviewed origin/main snapshot

- database/migrations/20261012160546_central_customer_account_profile_and_legacy_binding.sql
- docs/CENTRAL-ACCOUNT-CLOSEOUT.md
- docs/CENTRAL-RELEASE-20261016.md
- docs/MAYA-BIRTH-PROFILES.md

উপরের documents-ও historical checkpoint; বর্তমান live অবস্থা জানতে
deployed code, configuration ও acceptance evidence যাচাই করতে হবে।

## Recovery

files/ directory-তে original relative paths অনুযায়ী exact copies আছে।
manifest.json-এ SHA-256 এবং source commit references রয়েছে।
Downloads-এ একই timestamp-এর আলাদা backup-ও তৈরি করা হয়েছে।
Restore দরকার হলে checksum যাচাই করে existing file না মুছে ফিরিয়ে আনতে হবে।

এই ধাপে SQL execute, commit, push বা deployment করা হয়নি।
অন্য দশটি preserved source file এবং Foundation পরিবর্তন করা হয়নি।
