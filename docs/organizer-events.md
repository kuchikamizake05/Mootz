# Restricted organizer events

Approved organizers can create events and record attendance from the web app.
Approval is an operator action outside HTTP. Creating an event does not issue
an onchain collectible. `/organizer` remains the independent contract reader.

## Organizer access

From `be/`, using the backend server's `.env`, apply migrations before the API
deployment and grant an existing account (UUID, not wallet or Privy subject):

```sh
npm run db:migrate
npm run events:admin -- grant <account-uuid>
npm run events:admin -- revoke <account-uuid>
```

The account must first sign in and load its profile. Its UUID is shown on the
organizer access screen and attendee check-in page. Grants use the operator's
database access; no role assignment or contract admin endpoint is exposed.
Both commands are idempotent. Existing event owners are **not automatically
approved** by migration `020_event_organizers.sql`; grant them access so they can
continue recording attendance. Revocation blocks creation, management and even
check-in retries. It does not delete events, attendance or collectibles.

For rollback, revoke access and revert the application change; leave the
additive schema migration and existing event data in place.

## Web flow

1. Sign in as an approved organizer. Profile shows **Manage events**.
2. Open `/organizer/events` and choose **Create event**.
3. Enter title, optional description/venue and start/end in the device timezone.
   Select the public venue pin on the map, or enter latitude/longitude. The pin
   appears on Map under All/Events; tapping it opens event details. Opening an
   event centers its map on the venue. Friends keeps its existing content filter.
   The client sends UTC. The backend requires end > start and, for new events,
   end > server time. Currently-running events are allowed.
4. Select **Manage check-ins** on an owned event. Ask the attendee to open
   `/events/<event-uuid>/check-in` and share their account code. Verify attendance
   before recording it. New attendance is accepted during `[startsAt, endsAt)`.
   Successful retries retain the original timestamp.
5. The attendee refreshes their status, then uses the existing claim and Wear
   frame flow when a collectible is configured and eligible.

These tools use the live API; demo fixtures cannot create events or attendance.
Public organizer registration, event editing/deletion, tickets, payments and
code-based self-check-in are outside this increment.

## API

See `be/specs/events.openapi.json`. Regenerate consumer types with
`npm run gen:api` from `fe/web/` after changing the schema.

| Endpoint | Permission and behavior |
| --- | --- |
| `GET /v1/me/organizer` | Own account's operator-granted `enabled` flag |
| `POST /v1/events` | Approved organizer; ownership comes from bearer identity |
| `GET /v1/me/events` | Approved organizer's own events; bounded keyset pagination, attendance count and mapping status |
| `POST /v1/events/:id/check-ins` | Approved organizer who owns the event; existing participant account UUID |

Create requires `clientRequestId` (UUID), `title`, `startsAt`, `endsAt`; optional
`description`, nullable `locationLabel`, and nullable `location` with numeric
`latitude` (-90 to 90) and `longitude` (-180 to 180). The web form requires a
venue pin; older clients may omit it and existing events return `location: null`.
Coordinates are organizer-selected public venue data, never participant or Meet
verification coordinates. Changing coordinates while reusing a request key is a
conflict. Apply `021_event_location.sql` before deploying the API, then the web
client. No existing event is assigned an inferred location.
Timestamps require timezone offsets.
It returns 201 on creation, 200 for the same normalized request, and 409 for
conflicting reuse of that organizer's key. Organizer identity is never accepted
in the body. Mutations lock the grant row so revocation cannot race creation
or attendance recording. A failed permission check leaves no new event.

After an ambiguous network/server failure, the form retains its submitted key
and payload for safe retry. Check the list before starting another form after
an unknown result. `collectionStatus` is `not_configured` or `configured` and
describes the database mapping only. Live eligibility, supply and ownership
continue to come from the existing collection/claim/equip endpoints.

## Publish and map a collectible

1. A contract `DEFAULT_ADMIN_ROLE` holder calls existing
   `createCollection(collectionId, eventIdBytes32, cap, metadataURI)` from their
   wallet. Review public metadata/artwork; cap and metadata are immutable.
   Reuse `uuidBytes32` in `be/src/protocol/index.ts`: the UUID's 16 bytes followed
   by 16 zero bytes, not a hash of the UUID string.
2. Obtain the successful, canonical **finalized** creation transaction hash.
3. Prepare a JSON file with exactly these public fields, replacing the samples:

```json
{
  "eventId": "00000000-0000-4000-8000-000000000001",
  "collectionId": "1",
  "transactionHash": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "displayName": "Workshop frame",
  "artworkUrl": "https://example.com/public-frame.png",
  "claimStartsAt": "2026-10-24T01:00:00.000Z",
  "claimEndsAt": "2026-10-25T01:00:00.000Z"
}
```

4. Configure `EVENT_COLLECTION_RPC_URL`, `EVENT_COLLECTION_ADDRESS` and the
   existing chain settings on the server. From `be/` run:

```sh
npm run events:admin -- map-collection /path/to/public-event-mapping.json
```

Before inserting, this command verifies chain 10143, successful receipt, the
configured emitting contract, matching event/collection, canonical block hash,
finalized height, and cap/metadata readback at that finalized block. It stores
transaction/block evidence with the mapping. Identical retries succeed;
conflicting mappings are refused without overwriting. Unavailable RPC/finality
causes failure before any DB write. Use canonical UTC ISO timestamps with
milliseconds and `Z`. Artwork must be public HTTPS and contain no private data.

The mapping command sends **no transaction** and needs no contract admin key.
The backend issuer still needs its separate signer/role, and sponsored claims
still need the existing relay worker. Mapping does not enable these services or
establish ownership. Legacy mappings are not retroactively certified.

## Verification boundary

Local tests cover permission, ownership, revocation, UTC validation, concurrent
idempotency, attendance windows and mapping persistence. Receipt tests use
synthetic chain responses. They do not verify a production grant, live RPC
finality, authenticated browser session or successful testnet mint.

Run `npm run test:organizer-ui` in `fe/web/` with local Chrome installed for
functional browser regression. It mounts the real components/hooks in a temporary
Vite harness with synthetic authentication and API responses. It covers approval,
ambiguous creation/retry, denied attendance and confirmed attendance. It does not
replace a Next.js production build or live end-to-end acceptance.

Local verification on 24 October 2026: backend build/typecheck/lint passed;
coverage passed with 350 unit/integration tests (97.43% lines, 89.47% branches),
excluding only `test/postgres.integration.ts` because local PostGIS was absent.
That test remains enabled in CI. Web typecheck/lint, 38 unit tests, generated
schema checks and the functional browser regression passed. The standard Next.js
production build could not complete in the tool environment: Google font access
was retried with network access, then Turbopack's CSS worker failed to bind a
local port (`Operation not permitted`). Production build/deployment and real
wallet/claim acceptance remain unverified for this change.
