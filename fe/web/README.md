# Mootz web

Owner: [Wangsit (@wngstnr-code)](https://github.com/wngstnr-code).

Responsive Next.js + TypeScript + Tailwind CSS client for the initial two-device demo. Implementation plan and phase status: [PLAN.md](PLAN.md).

## Setup

Requires Node 24 and npm 11. From `fe/web/`:

```bash
npm ci
cp .env.example .env.local   # public values only
npm run dev                  # http://localhost:3000
```

The API is expected at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:3001`); start it from [be/](../../be/README.md).

| Script | Purpose |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route type generation + `tsc --noEmit` |
| `npm test` | Vitest unit tests, including the signing consumer test against `sc/specs/vectors.json` |
| `npm run build` | Production build |
| `npm run e2e` | Playwright + axe in demo-fixture mode on a production build (port 3100, local Chrome) at 360/390/768/1440 |
| `npm run sync:protocol` | Copy canonical `sc/specs` and `sc/abi` exports into `src/lib/chain/generated/` |
| `npm run gen:api` | Generate API types from `be/specs/*.openapi.json` into `src/lib/api/generated/` |
| `npm run check:generated` | Fail if either generated copy drifted from its source |

`NEXT_PUBLIC_DEMO_FIXTURES=1` turns on a labelled UI-only preview with fictional fixtures (no backend, wallet or camera); never enable it in a deployed demo. Demo photos are local-only in the gitignored `public/demo/`.

Never edit files under `generated/` by hand; rerun the sync script after `sc/` or `be/specs` changes.

## Boundaries

- Business APIs, private storage, check-in rules, location verification and the relayer live in [be/](../../be/README.md). Do not recreate them in web route handlers.
- Only public values go in `NEXT_PUBLIC_*`. Contract addresses stay empty until a verified deployment exists; fixture addresses are synthetic.
- Use MapLibre with OpenFreeMap by default and MapTiler Satellite only when selected ([map plan](../../docs/map-plan.md)).
- The organizer demo reads collection ownership and event Meet counts from the contracts directly, not from Mootz inventory data.
- Prove capture, QR scanning, signing and foreground location on two HTTPS devices.

Design source: `Mootz.pen` (pen.dev). See the [design handoff](../../docs/design/README.md) and [TASKS.md](../../TASKS.md).
