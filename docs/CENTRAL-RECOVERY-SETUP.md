# Central recovery source checkpoint — 2026-10-12

Admin owns credentials and common identity; Khata financial records remain in Khata.
Email/password signup requires no OTP or confirmation step. Forgotten-password
recovery uses a secure email link; it does not introduce signup verification.
Phone-only accounts cannot use email recovery until a verified recovery contact exists.

Prepared endpoints within the existing exact-origin CORS/rate/no-store boundary:
POST /api/v1/customer/recover (email, redirectTo); POST /recovery (tokenHash);
POST /password (password plus authenticated Bearer). Provider calls use the public
key. Password mutations require provider verification and a live central customer
session. Recovery type is fixed server-side; caller roles/IDs/types are refused.
Khata removes recovery credentials from the URL before making any request, remotely
verifies the central session, and never persists passwords or recovery hashes.

## Runtime configuration — pending, not applied

Admin server requires ORBIS_CUSTOMER_AUTH=enabled,
ORBIS_CUSTOMER_SUPABASE_URL=https://aqcwhqdzniruvoqwfsij.supabase.co,
ORBIS_CUSTOMER_PUBLISHABLE_KEY, ORBIS_CUSTOMER_SERVICE_KEY, exact comma-separated
ORBIS_CUSTOMER_ORIGINS, and server-only ORBIS_CUSTOMER_VERIFY_KEY. Never put server
keys in Vite or reports. Khata uses VITE_ORBIS_CUSTOMER_API_URL (Admin HTTPS origin)
and VITE_KHATA_DATA_URL (product gateway HTTPS URL).

Admin Supabase Auth requires email/password signup enabled, auto-confirmation enabled
for OTP-free signup, and each exact product callback URL allowed. Add the callback
HTTPS product root with ?orbis_recovery=1 to Auth redirect URLs. Configure SMTP
before claiming recovery delivery. Do not change the owner Google login configuration.

The Admin-project Reset Password email template must use this link:

```html
<a href="{{ .RedirectTo }}#token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a>
```

The fragment keeps the hash out of HTTP request/access logs. The default provider
ConfirmationURL template is not supported by this adapter. Invalid/expired links
fail closed; request a new link. Link hashes must never be copied into reports.
Docs: https://supabase.com/docs/guides/auth/auth-email-templates
and https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail

## Evidence and remaining work

Prior targeted accounting check passed 18/18 after correcting an ambiguous status
query; the failed-save/refresh case passed in 473ms with the original 5s timeout.
This new recovery source still requires its targeted Termux verification. No tests
were executed by the assistant. No commit/push/deploy, SMTP/provider configuration,
product SQL application or real account/login/reset was performed by this installer.
Remaining: product SQL/RLS/Deno verification, runtime configuration, Maya/Foundation
browser adapters, changed-code coverage and mobile/desktop real end-to-end flows.
