<p align="center"><img src="assets/brand/mootz/mootz-logo-v1.svg" alt="Mootz" width="360"></p>
<h1 align="center">Share your day. Meet in person.</h1>
<p align="center">A social Map + Feed with shared memories on Monad.</p>
<p align="center"><a href="https://mootz-red.vercel.app">Website</a> · <a href="https://mootz-red.vercel.app/app">Open app</a> · <a href="docs/hackathon.md">Judge guide</a> · <a href="sc/abi/deployment.monad-testnet.json">Deployment evidence</a></p>

Mootz brings everyday moments and real-world meetups into one place. Post a front-and-back photo, discover what friends share on Map or Feed, and scan a short-lived QR to create a shared **Dot**. When both people opt in, a signed Meet record can be stored on Monad. Event organizers can also issue nontransferable collectibles to eligible attendees.

Built for [Monad Blitz Jogja V2](https://monad-foundation.notion.site/Monad-Blitz-Jogja-V2-4026367594f280e2b069efefb4fb6389), 24 October 2026. This repository contains the implemented web client, backend and Solidity contracts; the separate mobile client remains planned.

## Try Mootz

| Entry point | What to inspect |
| --- | --- |
| [Website](https://mootz-red.vercel.app) | Product introduction; landing phone previews are illustrative |
| [Web app](https://mootz-red.vercel.app/app) | Map, Feed, capture, friends, Meet, profile and Event interfaces |
| [Organizer demo](https://mootz-red.vercel.app/organizer) | Contract ownership and event Meet-count reads |
| [API health](https://api.mootz.fun/health) / [readiness](https://api.mootz.fun/ready) | Service and database availability |
| [Judge guide](docs/hackathon.md) | Suggested walkthrough, evidence and remaining integration checks |

**Current status:** website and API health/readiness returned HTTP 200 during this documentation check. Both contracts are deployed and source-verified on Monad testnet. A complete two-device login → capture → Meet → transaction → collectible walkthrough still needs acceptance evidence. Deployment does not prove every integration works; see [verification](docs/verification.md).

## From a moment to a shared memory

1. **Post.** Capture a rear photo and front selfie, then share the pair with an authorized audience. Daily posting updates a profile streak without a payout.
2. **Meet.** A poster signs a Meet Offer in a QR valid for 60 seconds. The scanner signs an Accept bound to that Offer. The backend checks foreground locations are at most 100 meters apart.
3. **Keep a Dot.** A valid Meet gives both participants one offchain Meet marker. Dots are not currency. A pair can Meet again in a different approximate 200-meter area, up to five times per server day.
4. **Record by mutual consent.** Only two distinct signers who both select `RECORD_MEET` can create an onchain Meet record. Skipped or failed transactions never remove the Dot.
5. **Collect an event memory.** Eligible checked-in attendees can claim a nontransferable Event collectible. An organizer can independently read ownership and Meet counts from the contracts.

## Why Monad?

Monad provides a shared settlement layer for consented Meet records and Event collectibles. A separate organizer can read those records without querying Mootz's private inventory database. The prototype uses Monad testnet, EIP-712 signatures, a backend relayer and explicit transaction-finality reconciliation.

Photos, precise location and Dots stay offchain behind audience checks. Public Meet records reveal which wallets met. Signatures and distance checks do not prove physical presence, authentic photos or unique humans. Recording a Meet does not preserve its photos onchain.

## Verified testnet contracts

Chain ID: **10143**. Deployment date: **24 October 2026**.

| Contract | Address and verified source |
| --- | --- |
| MeetRegistry | [0x6fcdc6f98ab1ead21ae44f1e57f1ffeb5d3a49ff](https://testnet.monadscan.com/address/0x6fcdc6f98ab1ead21ae44f1e57f1ffeb5d3a49ff#code) |
| EventCollection | [0x3d368ee46756102b0e0567f846f5ad9fcdff8a01](https://testnet.monadscan.com/address/0x3d368ee46756102b0e0567f846f5ad9fcdff8a01#code) |

Both sources passed Monadscan verification; MonadVision returned partial matches. The [deployment record](sc/abi/deployment.monad-testnet.json) contains receipts, constructor arguments, roles and runtime bytecode hashes checked through an independent RPC. Testnet admin, relayer and issuer currently share one wallet. Deployment evidence does not establish a completed public Meet or collectible claim.

## Tech stack

![Monad](https://img.shields.io/badge/Monad-Testnet-836EF9?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8.30-363636?style=for-the-badge&logo=solidity&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

| Layer | Technologies | Role in Mootz |
| --- | --- | --- |
| Web interface | Next.js 16.4, React 19.3, TypeScript 5.9, Tailwind CSS 4.3, Lucide | Responsive Map/Feed, paired-photo capture, Meet, profiles and Event screens |
| Client data | TanStack Query 5, generated OpenAPI types | API state, caching and typed client interfaces |
| Identity and wallets | Privy, viem 2 | Login, wallet connection, signing and contract reads |
| Maps and location | MapLibre GL 6, OpenFreeMap, MapTiler Satellite | Default street map, optional satellite view and authorized location overlays |
| QR exchange | qrcode, jsQR | Display and scan the short-lived signed Meet Offer |
| Backend | Node.js 24, Fastify 5, TypeScript, jose | Authenticated API, audience checks, Meet validation and Event eligibility |
| Database | PostgreSQL + PostGIS, node-postgres | Private application state, distance checks and migrations |
| Media | Supabase private storage, Sharp | Audience-controlled paired photos and server-side image processing |
| Onchain | Monad testnet, Solidity 0.8.30, OpenZeppelin, Foundry | MeetRegistry, nontransferable EventCollection, signature and replay checks |
| Relay and finality | viem, backend relay/indexer/reconciliation workers | Submit authorized transactions and track inclusion, finality and failure |
| Delivery | Vercel web hosting; Linux VPS, Docker Compose and Caddy backend setup | Web delivery, HTTPS API and private database deployment |
| Verification | Vitest, Playwright, axe-core, ESLint, TypeScript, Foundry | Unit, database integration, browser, accessibility and contract checks |

Versions above follow the module manifests and contract configuration. Exact dependency pins remain in the module-local lockfiles. The separate mobile client is planned; no mobile framework has been selected.

## Architecture

`Next.js web client → Fastify API → PostgreSQL/PostGIS + private media storage`

`Consented signatures → backend relayer → Monad MeetRegistry / EventCollection`

| Module | Implementation |
| --- | --- |
| [Web](fe/web/README.md) | Next.js 16, React 19, TypeScript, Tailwind CSS, Privy, viem |
| [Backend](be/README.md) | Node.js 24, Fastify, PostgreSQL/PostGIS, private Supabase media, relay/indexer workers |
| Maps | MapLibre + OpenFreeMap; user-selected MapTiler Satellite |
| [Contracts](sc/README.md) | Solidity, Foundry, EIP-712 consent and replay protection |
| [Landing](landing/README.md) | Static product page served with the web deployment |
| [Mobile](fe/app/README.md) | Reserved; framework and delivery scope remain undecided |

Business rules live in the backend. Canonical [API schemas](be/specs/), [signing specifications](sc/specs/) and [ABI exports](sc/abi/) define integration boundaries. INT-01 consumer approval remains separate from source availability.

## Run locally

Use Node.js 24 and npm 11, and keep each module's lockfile. There is no root workspace install.

```bash
git clone https://github.com/kuchikamizake05/Mootz.git
cd Mootz/fe/web
npm ci
# Copy .env.example to .env.local and set public integration values.
npm run dev
```

Open `http://localhost:3000` for the landing and `http://localhost:3000/app` for the client. Start the API and apply migrations using the [backend setup](be/README.md); the frontend defaults to `http://localhost:3001`. Configure Privy, private storage and testnet addresses for connected flows. Keep backend secrets out of frontend variables.

For a labelled UI-only preview, see the frontend's fixture mode. Fictional fixtures do not exercise wallets, camera, GPS or backend integration and must remain disabled in deployed demos.

| Checks | Instructions |
| --- | --- |
| Frontend lint, types, unit tests, build and browser checks | [Web README](fe/web/README.md) |
| Backend unit/integration tests, migrations and deployment | [Backend README](be/README.md) |
| Contract tests, ABI consistency and deployment verification | [Contract README](sc/README.md) |

## Team

| Contributor | Area |
| --- | --- |
| [Wangsit](https://github.com/wngstnr-code) | Frontend and product interface |
| [Faaid](https://github.com/kuchikamizake05) | Backend, private data and relayer |
| [Diaz](https://github.com/amantajatii) | Smart contracts, tests and deployment |

## Further reading

[Product brief](BRIEF.md) · [Requirements](PRD.md) · [Architecture](docs/architecture.md) · [Decisions](docs/decisions.md) · [Map plan](docs/map-plan.md) · [Documentation index](docs/README.md) · [Brand assets](assets/brand/mootz/README.md)

Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Do not commit credentials, private photos, location exports or local archives. No public redistribution license has been selected for the whole repository; the landing template retains its own [license and credits](landing/CREDITS.md).
