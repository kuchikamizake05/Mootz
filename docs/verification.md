# Verification

Run each module's actual scripts from its directory. Record results for the current checkout; do not infer deployment or end-to-end readiness from unit tests.

| Area | Checks |
| --- | --- |
| Backend | `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:protocol`, `npm test`, `npm run test:deploy`, `npm audit` |
| Database | Configure an isolated PostgreSQL/PostGIS database ending in `_tests`, then `npm run test:db` and `npm run test:coverage` |
| Contracts | `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run check:artifacts`, `npm audit` |
| Diagnostic client | In `be/dev-login/`, install dependencies, run `npm run build`, `npm audit`, and verify login in a browser |
| Web client | In `fe/web/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:generated`, `npm run build`, `npm run e2e` (demo fixtures, local Chrome, 360/390/768/1440 viewports with axe), `npm audit` |

Web client status (2026-10-24): lint, typecheck, unit tests (25), generated-copy check, build and e2e (104: route smoke incl. no horizontal scroll, no app console errors, no serious/critical axe violations, plus core demo journeys) PASS. These run against labelled demo fixtures only. UNVERIFIED: real Privy login → `/v1/me`, every backend endpoint, wallet EIP-712 signing, camera/QR on phones, two-device Meet, claim relay, claim and organizer chain reads against the verified Monad testnet deployment (not yet exercised), MapTiler Satellite (no key). `npm audit` reports advisories in Privy's transitive dependencies; not triaged.

Acceptance also requires two-device camera/location/Meet testing, permission checks after friendship changes, live contract role/domain/receipt checks, independent organizer reads, and deployment/backup/restore validation. Use synthetic media and record failures and unavailable checks explicitly. Never use the application database for fixture resets.
