# Achievement frames backend handoff

Backend menyediakan achievement frames dan slot frame profil. Frontend menangani artwork, rendering dan browser acceptance.

## Demo policy and APIs

Policy `demo-v1` implements the existing proposed thresholds: `first_meet` at one valid Dot, `together` at ten, and `social_butterfly` at five distinct Meet partners who are currently accepted friends when evaluated. Hidden Dots count; repeated Meets count for total Dots but not distinct partners. Chain opt-out, delay or failure never removes an achievement. Friendship is not required for a valid Meet itself.

Unlocks are persistent, idempotent database rows. New Meet acceptance synchronizes both participants inside the same transaction as Meet/Dot creation. Friendship acceptance also reconciles both participants immediately, including idempotent retries; removing that friendship before opening inventory cannot lose an already-earned unlock. Inventory/equip reconciles older Meets. A historical unlock timestamp records first reconciliation, not an invented historical achievement date. Removing a friendship does not revoke an existing unlock. There are no purchases, currency, streak rewards or Shop.

`GET /v1/me/frames` returns own inventory, metrics, requirements, capped progress and unlock timestamps. Policy is labelled demo. `PUT /v1/me/frame` accepts `{frameId}` for an unlocked achievement, preserving equippedAt on retry. Locked frames return403 FRAME_LOCKED. `GET /v1/me/frame` returns the current achievement/collection frame or null. `DELETE /v1/me/frame` clears either source without requiring RPC.

One `profile_frames` row is the shared slot for both sources. The existing `PUT /v1/me/equipped-collection` replaces an achievement only after live ownership verification; equipping an achievement replaces the Event frame. The old collection-only DELETE cannot remove an active achievement. The compatibility collection_equips view exposes only collection frames. Migration013 copies existing collection frame choices and timestamps before replacing that table with the view; migration014 adds account-deletion cascade constraints without changing013.

Profile GET and authorized moment detail/Map/Feed responses include `activeFrame: {status,frame}`. Status is active/none/unavailable. Event frame reads use the current bound wallet and actual collection contract. RPC uncertainty preserves the equipped row and returns unavailable rather than fabricated ownership or blocking the whole feed. Frame resolution happens after existing moment audience checks. Same-author results are reused only within one feed/map response; subsequent requests read current state.

Stable assetKey values identify FE-owned artwork; no final frame artwork is supplied by this backend. See `be/specs/frames.openapi.json` for IDs and response union. Thresholds remain demo parameters, not a final validated product decision.

## Locking and verification boundaries

Achievement reconciliation takes sorted transaction advisory locks per account. It does not upgrade Meet's existing account SHARE locks to UPDATE, which could deadlock concurrent accept/preview operations. Own equip/inventory transactions lock the account before reconciliation, and the shared slot is enforced by primary key, source CHECK and unlock foreign key. No chain transaction is required for achievements.

Tests now run against separate local database `mootz_frames_tests` with PostGIS enabled, rather than the API's `mootz` database. Integration/combined-coverage setup rejects missing database URLs and names without the `_tests` suffix before fixtures run. This guard does not authorize manual destructive SQL. Migration preservation is tested with an existing collection slot/timestamp inside an isolated rolled-back schema. No live Monad ownership, client artwork or two-device UI acceptance is claimed.
