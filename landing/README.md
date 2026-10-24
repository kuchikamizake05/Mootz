# Mootz concept landing page

This folder adapts the free Linea landing template by 8B into a static Mootz concept page. It keeps the original GSAP/ScrollTrigger/Lenis scenes, one-file structure, and accessibility behavior while replacing the source product story.

The page is a concept preview, not a working product. It has no login, download, contact form, waitlist, live map, or real QR scan. The phone UI is illustrative and clearly labels its QR-like artwork as nonfunctional.

Explore Mootz now links to `/app` in the combined Next.js deployment. Preview
through `fe/web/` to use that link; a standalone static server only serves the
landing. See [single-project Vercel setup](../docs/vercel-web.md).

## Preview

Serve this folder with any static file server. For example, from landing:

```sh
npx --yes serve . --listen 1234
```

Then open http://localhost:1234. The page has no build step. GSAP, ScrollTrigger, SplitText, Lenis, and the Host Grotesk font load from their original external sources; approved Mootz SVG marks are included in assets/.

## Product claims

The copy describes the current Mootz product direction: dual-photo moments, direct friend sharing, Map and Feed, Events, Meet, offchain Dots, achievement and event frames, and a profile posting streak without rewards. A Meet uses a signed Offer QR valid for 60 seconds, a signed acceptance bound to that Offer, and a distance check of at most 100 meters at scan time.

Only a Meet with both participants' signed RECORD_MEET consent can be recorded onchain. Public records expose the wallet pair and time. Photos, location, and Dots remain offchain with audience checks. A failed or skipped onchain record does not remove the Dot. Signatures and distance checks do not prove physical presence, photo authenticity, or unique people; the contract does not verify location.

## Attribution

Code remains under the upstream MIT license. Photo, font, and animation-library terms remain separate; see CREDITS.md and LICENSE. The footer retains the required Design: 8B attribution.
