# Landing and app in one Vercel project

Deploy the Next.js project in `fe/web/`. Its prebuild copies `landing/index.html`
and `landing/assets/` into `fe/web/public/landing/`. The copied HTML uses absolute
asset URLs, so the original landing stays editable and independently previewable.
Generated files are ignored by Git. Run `npm run dev` again after editing landing
sources during a combined local preview.

## URLs on the same domain

| URL | Content |
| --- | --- |
| `/` | Landing, served by a Next.js rewrite without changing the URL |
| `/app` | Application entry; redirects to `/map` |
| `/map`, `/feed`, `/capture`, and existing product routes | Next.js application |
| `/organizer` | Existing organizer demo |
| `/landing/assets/*` | Landing images and brand assets |

The landing's Explore Mootz buttons open `/app`. The static landing does not load
the application's authentication providers or application styles.

## Vercel setup

Import this repository once and select:

- Root Directory: `fe/web`
- Framework: Next.js
- Node.js: 24.x
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `.next`
- Enable **Include source files outside of the Root Directory in the Build Step**
  so the build can read `landing/`.

The command and framework defaults are recorded in `fe/web/vercel.json`.
See [Vercel's monorepo documentation](https://vercel.com/docs/monorepos/monorepo-faq)
for the Root Directory option. There is no second landing project to configure.

Set the public frontend variables from `fe/web/.env.example` in this same project.
`NEXT_PUBLIC_API_BASE_URL` must point to the deployed HTTPS backend rather than
localhost. Configure the final frontend origin in the backend's CORS allowlist
and Privy's allowed origins. Keep backend secrets on the backend. Leave
`NEXT_PUBLIC_DEMO_FIXTURES` disabled for deployments.

The API remains the separate service in `be/`; this combines the landing and
frontend deployment only. A successful frontend build does not verify login,
private media, camera, GPS, signing, or the backend connection.

## Local preview

From `fe/web/`, install with `npm ci`, configure `.env.local`, and run
`npm run dev`. Open `http://localhost:3000/` for the landing or
`http://localhost:3000/app` for the application. `npm run build` prepares both
for one deployment.

## First Vercel deployment

Project: `mootz` in `kuchikamizakes-projects`, Root Directory `fe/web`.
Short domain: `https://mootz-red.vercel.app` (`mootz.vercel.app` was unavailable).
Public frontend configuration is saved on the Vercel project, including
`NEXT_PUBLIC_API_BASE_URL=https://api.mootz.fun`, the public Privy App ID, and
verified testnet contract addresses from `fe/web/.env.example`.

The deployment was uploaded directly without pushing Git. The CLI upload used
an isolated source staging folder to exclude local archives, private references,
backend files, and environment files. That initial deployment used a manual upload.

## Git-based deployment

The existing Vercel project is connected to `kuchikamizake05/Mootz` on GitHub.
Its production branch is `main`, its Root Directory is `fe/web`, and source files
outside that root are enabled so the build can copy `landing/`.

Push changes to `main` to request a production build. Confirm the deployment's
status is **Ready** before treating it as live; a successful Git push alone does
not prove a successful build. The production domains include `mootz.fun`,
`www.mootz.fun`, and `mootz-red.vercel.app`.

Only committed repository content participates in Git deployments. Keep local
environment files, private photos and archives out of Git. Runtime configuration
continues to come from the existing Vercel project settings.

The backend health endpoint returned HTTP 200. Its CORS preflight from
`https://mootz-red.vercel.app` returned HTTP 403, so that origin must be allowed
before browser API access can work. Authentication and two-device product flows
are not verified by the deployment check.
