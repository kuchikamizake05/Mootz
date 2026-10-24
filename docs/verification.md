# Verification

Run each module's actual scripts from its directory. Record results for the current checkout; do not infer deployment or end-to-end readiness from unit tests.

## Foreground friend location — 24 October 2026

Avatar follow-up: profile JPEG/PNG upload/removal and authenticated own-avatar reads are connected to the friend-location marker. Latest combined backend run: 329 tests PASS. Targeted presence+avatar coverage: lines 97.77%, branches 82.6%, functions 92.3%, statements 94.06% (80% aggregate gates PASS). Frontend unit tests (30), generated API check, typecheck/lint and production build PASS; four Map/profile Playwright+axe checks at 390/1440 PASS. Avatar tests cover invalid/unauthenticated uploads, normalization/private storage, stranger denial, authorized signing, replacement/removal and failed-upload preservation. Production cloud storage and two-phone avatar display remain UNVERIFIED. Deployment also requires migration `018_profile_avatar.sql`.

- Backend typecheck, lint and build PASS. Combined unit/integration execution: 325 tests PASS on the dedicated local `mootz_frames_tests` PostgreSQL/PostGIS database. Presence-specific coverage: lines/functions 100%, statements 98.24%, branches 94.44%; 80% gates PASS. Tests include current friend authorization, pending/stranger/removed access, expiry, coarse coordinates, concurrent opt-out, account authentication and cleanup.
- Frontend lint, unit tests (30 on current shared checkout), generated API/protocol checks, production build PASS. Targeted Playwright/axe: Map, profile, settings and map-selection flow at 390px and 1440px: 8 PASS using labelled fixtures. Initial browser run lacked public Privy configuration; rerun with the project's example public App ID passed. This does not prove actual authentication or GPS.
- Early broader DB run against a newly isolated database failed existing suite prerequisites (one suite requires the exact `mootz_frames_tests` name and readiness needs PostGIS); rerun on the documented test database passed. No application database was reset.
- UNVERIFIED: two real phones, location permission/foreground behavior on Safari/Android, actual authenticated friend markers on HTTPS, production migration/deployment. Sampling and marker refresh are every 5 seconds; network/GPS delays remain possible. Implemented locally; no production deployment performed for this feature.

| Area | Checks |
| --- | --- |
| Backend | `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run check:protocol`, `npm test`, `npm run test:deploy`, `npm audit` |
| Database | Configure an isolated PostgreSQL/PostGIS database ending in `_tests`, then `npm run test:db` and `npm run test:coverage` |
| Contracts | `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run check:artifacts`, `npm audit` |
| Diagnostic client | In `be/dev-login/`, install dependencies, run `npm run build`, `npm audit`, and verify login in a browser |
| Web client | In `fe/web/`: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:generated`, `npm run build`, `npm run e2e` (demo fixtures, local Chrome, 360/390/768/1440 viewports with axe), `npm audit` |

Web client status (2026-10-24): lint, typecheck, unit tests (25), generated-copy check, build and e2e (104: route smoke incl. no horizontal scroll, no app console errors, no serious/critical axe violations, plus core demo journeys) PASS. These run against labelled demo fixtures only. UNVERIFIED: real Privy login → `/v1/me`, every backend endpoint, wallet EIP-712 signing, camera/QR on phones, two-device Meet, claim relay, claim and organizer chain reads against the verified Monad testnet deployment (not yet exercised), MapTiler Satellite (no key). `npm audit` reports advisories in Privy's transitive dependencies; not triaged.

Acceptance also requires two-device camera/location/Meet testing, permission checks after friendship changes, live contract role/domain/receipt checks, independent organizer reads, and deployment/backup/restore validation. Use synthetic media and record failures and unavailable checks explicitly. Never use the application database for fixture resets.


## Meet flow layout — 24 October 2026

- The QR uses its intrinsic square height; fixed panel sizing no longer lets the code overlap the countdown or moment details. Desktop QR/approval views use bounded two-column layouts, while narrow screens stack and scroll naturally. Wallet setup, onboarding, scanner, privacy and result screens use the same responsive Meet frame.
- Web typecheck, lint, generated API/protocol checks and 47 unit tests passed. The mechanical design scan reported no findings; rendered inspection was also performed.
- Chrome ran the committed `meet-layout.spec.ts` against the real components, project CSS/fonts and an isolated Vite harness with synthetic wallet/auth/map dependencies: 13 passed, with the desktop-only keyboard scenario skipped in three smaller viewport projects. Checks cover QR containment, CTA-to-result navigation, onboarding/privacy return, expiry/regeneration and desktop focus trapping/Escape. An additional bounded pass covered 320 px and short landscape layouts.
- Screenshots used approved public illustration placeholders for missing demo images; no private/local photo fixtures were published. These checks do not establish real wallet setup, camera/GPS permissions, two-device signing or live chain recording. The normal Playwright config still targets the built Next.js app for connected acceptance.
