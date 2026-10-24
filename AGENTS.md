# Mootz contributor and agent guidance

Read README.md, PRD.md, docs/decisions.md, and the relevant feature docs before changing behavior. BRIEF.md is the current detailed baseline; current decisions take precedence.

- Backend and contract source/tests are present. Product frontend remains planned. Verify deployment, CI and end-to-end status separately.
- The product and GitHub repository are Mootz (`kuchikamizake05/mootz`). Keep existing ROV requirement IDs stable. Wangsit owns `fe/app/` and `fe/web/`, Faaid owns `be/`, and Diaz owns `sc/`. Backend business logic belongs in `be/`; clients consume its API. The web demo is the initial target; the mobile framework/scope remains undecided. Agree public API schemas in `be/specs/`, signing specs in `sc/specs/`, and ABI exports in `sc/abi/` during INT-01.
- Preserve direct friend sharing, Map/Feed, All, the full Event feature, Meet, Dots as Meet markers, achievement frames, and the profile posting streak. Do not reintroduce social circles/groups, Dots as currency, a Shop, daily/shared rewards, or streak milestone rewards.
- A Meet requires a 60-second QR carrying a Meet Offer signed by the poster, a Meet Accept signed by the scanner that binds the Offer digest before expiry, and a backend distance check of at most 100 meters at scan time. A pair may Meet again the same day only in a different ~200 m area, up to 5 Meets per pair per server day; one Meet = one Dot. Remote tagging alone is not a Meet.
- MeetRegistry records a Meet only when both Offer and Accept carry `RECORD_MEET` (each signer opted in) and the contract verified two distinct signers. `OFFCHAIN_MEET` is rejected onchain. A failed or skipped onchain record never removes the Dot.
- Signatures and distance checks do not prove physical presence, photo authenticity, or unique humans. The contract does not verify location. Keep privacy and state claims accurate.
- Preserve MapLibre with OpenFreeMap as the default Map basemap and MapTiler Satellite as a user-selected mode. Follow docs/map-plan.md for stable camera/authorized overlays, attribution, quota/key handling, and honest fallback; do not add Google Maps.
- Private media, location, and Dots stay offchain with audience checks. Public Meet records expose which wallets met.
- Preserve one record per Meet ID, nonce replay protection, issuer authorization, and supply caps on every path.
- Preserve module-local npm lockfiles and runtime pins. Use the real scripts in be/, be/dev-login/ and sc/.
- Add meaningful regression tests for permission, replay, signature, distance, and supply risks. Run relevant real scripts; record unavailable checks rather than inventing success.
- Use code graph discovery when an index matches this checkout and is fresh; use file search for documents/configs or insufficient graph results.
- Do not upload local archives, original private screenshots, secrets, keys, media fixtures, session recordings, or database exports. Use approved sanitized assets.
- Keep changes scoped. Do not publish/deploy/change third-party settings beyond the user's authorization. Do not spawn agents unless the user or applicable instructions ask for delegation.
