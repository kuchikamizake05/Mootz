# Mootz · Monad Blitz Jogja V2

## Event reference

The [organizer's event page](https://monad-foundation.notion.site/Monad-Blitz-Jogja-V2-4026367594f280e2b069efefb4fb6389) describes a one-day prototype hackathon in Jogja on **24 October 2026**, using Monad testnet or mainnet. The published schedule lists **16:30 WIB code freeze**, **16:45 WIB submission deadline**, and **17:00–19:00 WIB pitches**. Check that page for organizer updates.

The official [faucet and submission portal](https://blitz.devnads.com/events/monad-blitz-jogja-v2) is linked there. This guide prepares a demonstration; it does not submit the project. The Notion page does not specify a mandatory video length or judging rubric, so none is assumed here.

## Suggested judge walkthrough

1. Open the [website](https://mootz-red.vercel.app), then the [app](https://mootz-red.vercel.app/app). Explain paired photos, friend sharing and memories from meeting someone.
2. Show Map and Feed. Explain audience controls and the distinction between shared and precise private coordinates.
3. With two consenting demo accounts on HTTPS devices, publish a moment and open its 60-second Meet QR. The second account scans, signs acceptance and supplies foreground location. Show a Dot only after backend acceptance.
4. Explain mutual onchain consent. With both accounts opting in, inspect relay status and a real receipt. Pending is not final. If a live transaction is unavailable, show the verified contracts and explicitly identify the missing demonstration.
5. If an event and attendee eligibility have been configured, demonstrate check-in and a collectible claim. Use the [organizer view](https://mootz-red.vercel.app/organizer) for direct contract reads. Do not describe sample or empty data as a successful claim.

## Evidence and acceptance

- Website, API `/health` and `/ready` returned HTTP 200 on 24 October 2026. This does not verify authentication, CORS or user flows.
- [Mainnet deployment evidence](../sc/abi/deployment.monad-mainnet.json) records both contracts on Monad mainnet, chain **143**, including deployment transactions and explorer verification results. Successful receipts and runtime bytecode hashes were rechecked through the public mainnet RPC for the README update on 24 October 2026.
- [Testnet deployment evidence](../sc/abi/deployment.monad-testnet.json) remains available for chain **10143**. Current backend/relay paths still enforce testnet; mainnet application migration and a live two-wallet Meet/claim acceptance run remain pending. The contract addresses are identical across these chains; verify the network when presenting receipts.
- Reproducible checks are documented in the [web](../fe/web/README.md), [backend](../be/README.md) and [contract](../sc/README.md) READMEs. See [verification](verification.md) for acceptance status.
- Before claiming a complete connected demo, verify allowed frontend origins in the API and Privy, login/wallet binding, private media, camera/GPS, a two-device Meet, a finalized receipt, event eligibility and organizer reads.

## Claims to keep accurate

Dots are offchain Meet markers, not tokens or currency. Failed or skipped chain records never remove them. Photos and precise location remain offchain; public Meet records expose participating wallets. Both distinct signers must consent to `RECORD_MEET`. Signatures and distance checks do not prove unique humans or physical attendance.

Landing phone previews and optional UI fixtures are illustrative; fixture mode must stay disabled in deployed demos. The separate mobile client remains planned. Mainnet contract deployment does not establish application migration, live acceptance or production readiness.
