# Friend location sharing

Approved on 24 October 2026: accepted friends see each other's approximate current location without posting a photo. This adds foreground live sharing; background tracking stays out of scope.

After login, sharing defaults on, subject to browser permission. While the authenticated app is visible, it requests and sends a fresh position every **5 seconds**. Friends' Map markers refresh every **5 seconds**. GPS/network latency can delay updates; markers show the last server update rather than guaranteeing instantaneous movement.

Profile and profile settings contain **Share my location with friends**. The account-wide preference persists across devices/sessions. Switching off atomically deletes the last position; concurrent pending uploads cannot re-enable it. Failed saves show an error rather than confirming that sharing stopped.

Hidden/pagehide/unmount stops sampling and requests deletion. Tab termination/network failure can prevent deletion: positions expire server-side within **60 seconds**, are excluded from reads at expiry, and are also removed by clients. A 15-second maintenance task deletes expired rows. There is one latest position per account, no movement-history table. Database backups can contain previous snapshots subject to the deployment backup policy; no immediate-erasure guarantee applies to backups.

Reads require a currently accepted friendship and enabled sharing. Pending, blocked, removed, unrelated and unauthenticated users cannot read locations. Failed reads hide cached markers. Setting/friendship changes reach viewers at the next successful refresh (normally about 5s); previously viewed or saved information cannot be recalled.

Coordinates are quantized to the approximate 200m moment-display grid before storage. Raw samples are not logged or stored. Accuracy must be positive and <=500m; age <=30s, future skew <=5s. These are map-presence limits, separate from the stricter Meet verification policy. Sharing grants no Meet, Dot, streak or eligibility; it stays offchain.

## Deployment and acceptance

API: `be/specs/presence.openapi.json`. Apply `017_friend_locations.sql` and `018_profile_avatar.sql` before deploying the new backend, then frontend. No new secret/provider/paid service is needed. HTTPS, browser location permission and exact CORS origins remain required. This local change does not deploy the feature.

Location markers use the friend's own uploaded profile avatar, not their moment photo. Profile has Change avatar and Remove avatar. JPEG/PNG up to 8 MiB is decoded and normalized with metadata stripped; only its thumbnail is stored in the existing private media bucket. Own profile reads and current authorized friend-location reads receive a signed URL valid for at most 60 seconds; keys and arbitrary remote avatar URLs are never accepted from clients. Missing avatar uses initials. Previously issued avatar URLs can remain valid until expiry after friendship removal. Obsolete media deletion is best-effort if the storage provider is down; orphan cleanup remains operational work. API: `be/specs/avatar.openapi.json`.

Use two consenting accounts on HTTPS: accept friendship, allow location on both phones, confirm each appears without a photo. Test movement, profile opt-out, removal of friendship, permission denial, hidden tab and network loss/expiry. Check logs contain no coordinates or tokens. Names use backend display_name when present, otherwise account-code suffix; no external profile identity is invented.
