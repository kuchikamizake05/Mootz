# Verification

Run each module's actual scripts from its directory. Record results for the current checkout; do not infer deployment or end-to-end readiness from unit tests.

| Area | Checks |
| --- | --- |
| Backend | `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:protocol`, `npm test`, `npm run test:deploy`, `npm audit` |
| Database | Configure an isolated PostgreSQL/PostGIS database ending in `_tests`, then `npm run test:db` and `npm run test:coverage` |
| Contracts | `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run check:artifacts`, `npm audit` |
| Diagnostic client | In `be/dev-login/`, install dependencies, run `npm run build`, `npm audit`, and verify login in a browser |

Acceptance also requires two-device camera/location/Meet testing, permission checks after friendship changes, live contract role/domain/receipt checks, independent organizer reads, and deployment/backup/restore validation. Use synthetic media and record failures and unavailable checks explicitly. Never use the application database for fixture resets.
