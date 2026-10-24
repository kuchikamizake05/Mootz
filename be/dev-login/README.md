# Backend integration test
Standalone local diagnostic page; not the FE demo. Does not modify fe/.

Run `npm ci` then `npm run dev` in this directory and open http://localhost:3000.
Backend must run at http://localhost:3001 with localhost:3000 allowed by CORS and Privy.
The client offers Email, Google and Wallet login. Enable each method in the Privy app dashboard too; Google dashboard activation and OAuth end-to-end verification remain pending. This page does not configure the dashboard automatically or replace Wangsit's product FE.
Only public client config belongs in .env.local. Never copy backend .env or Supabase service keys here.

Login/OTP, optional test wallet creation, signing and synthetic publication require separate user actions. Tokens are obtained per request and never displayed or explicitly persisted. Media button publishes synthetic colored images to the configured backend/storage. No automatic login, wallet creation, signing or uploads.

Audience check: enter the same synthetic moment ID under the owner account, then under a second account. The control separately reports HTTP statuses for moment detail and both full-image access endpoints without displaying signed URLs. Owner access should be200; an unrelated account should receive404. Logout clears profile, wallet selection and prior access results.

References: https://docs.privy.io/authentication/user-authentication/access-tokens and https://docs.privy.io/basics/react/setup

Dependency policy: direct dependencies and security overrides are exact pins in package.json. Overrides are limited to compatible releases in the same major version. Run `npm ci`, `npm run build`, and `npm audit` after dependency changes. Some Privy transitive advisories may remain until upstream publishes fixes compatible with its current Zod and UUID ranges; this diagnostic client is for local verification only.
