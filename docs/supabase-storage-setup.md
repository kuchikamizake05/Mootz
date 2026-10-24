# Supabase private photo storage setup

Approved direction: Supabase stores private image files; the Fastify backend and application PostgreSQL/PostGIS stay in Docker. This guide does not create a cloud project or upload files automatically.

## 1. Create the project and private bucket

1. Open the [Supabase dashboard](https://supabase.com/dashboard) and create a dedicated Mootz project. Choose a region near the intended users. Keep the project database password private; this integration does not move the application database into Supabase.
2. In Storage, create a bucket named `mootz-private-media` with **Public bucket disabled**.
3. Set its allowed MIME type to `image/jpeg` and maximum object size to **8 MiB (8,388,608 bytes)**. The backend accepts JPEG/PNG input and stores normalized JPEG plus a JPEG thumbnail.
4. Keep anonymous/authenticated direct access denied. Do not add public SELECT/INSERT policies. Privy authentication is checked by Mootz's backend; it is not automatically a Supabase Auth session.

Supabase private buckets support signed downloads with a limited lifetime; public buckets bypass download authorization. See [bucket access models](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## 2. Configure the server

Get the project URL and a **server secret API key** from the project's API settings. The current key type is `sb_secret_...`; the legacy `service_role` key is also supported. Publishable/anon keys are not server credentials for this integration. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

From the repository's `be/` directory, copy `.env.example` to `.env` if the private file does not already exist. Preserve existing values. Fill these fields in the local editor:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
SUPABASE_STORAGE_BUCKET=mootz-private-media
```

Use one key variable: `SUPABASE_SECRET_KEY`, or legacy `SUPABASE_SERVICE_ROLE_KEY`. Never put either in FE configuration, `NEXT_PUBLIC_*`, Git, browser code, chat, screenshots or logs. `.env` is ignored by Git and excluded from the Docker build context; Compose passes configured values to the API at runtime.

Privy still needs its real `PRIVY_APP_ID` and SPKI `PRIVY_VERIFICATION_KEY` before authenticated photo APIs are enabled. There is no fake-login switch. See [backend identity setup](../be/README.md).

## 3. Start and check

From `be/`:

```powershell
docker compose up -d db
docker compose build api
docker compose run --rm api node dist/db/cli.js migrate
docker compose up -d --wait api
```

Open [database readiness](http://localhost:3001/ready) and [storage readiness](http://localhost:3001/ready/storage). Both should return 200 with `{"status":"ready"}`. Storage readiness checks that the bucket exists and is private; it does not upload/delete an object or prove a full photo workflow.

If storage readiness returns 503, check the URL/key/bucket and its Public setting. The backend refuses to operate on a public bucket. A partial URL/key configuration fails startup. If `/v1/me` returns 503 AUTH_UNAVAILABLE, finish Privy setup first. The default local database remains `127.0.0.1:55432`; containers use `db:5432`.

## 4. Photo API workflow

Every request carries the current Privy bearer access token. First call `/v1/me` to provision the authenticated account.

1. `POST /v1/moments` with `{"source":"capture","caption":"Hello"}` creates a private draft. Optional event/location metadata is validated. `source:"upload"` identifies gallery input; this declaration does not prove camera authenticity.
2. `PUT /v1/moments/{id}/media/front`, then `/back`, each with raw JPEG/PNG bytes and the matching `Content-Type`. Maximum input size is 8 MiB per side. This uses backend-mediated uploads, not browser access with the server key.
3. `POST /v1/moments/{id}/publish` with `{}` publishes only after both processed assets are stored. Repeat publish is idempotent. Uploaded sides are immutable; retakes currently require a new draft.
4. `GET /v1/feed`, `/v1/map`, or `/v1/moments/{id}` returns authorized content and signed thumbnail URLs. A moment without location appears in Feed and is excluded from Map.
5. `GET /v1/moments/{id}/media/front` (or `/back`) returns a full-image signed URL with `expiresIn:60`, after another audience check.

Only the author can read a draft or upload its photos. Published content is available to its author and accepted friends; event tags do not grant access. Knowing a moment ID is insufficient. Original EXIF/GPS metadata is removed, orientation is applied, images fit within 2048×2048, and thumbnails within 320×320. The stored normalized bytes are the immutable snapshot source.

Signed URLs are bearer links: anyone possessing one can use it until its short expiry. Friendship revocation prevents issuing new URLs; an already-issued link can remain usable for up to 60 seconds. Never publish or log signed URLs. See [signed URL API](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl).

## 5. Acceptance checks

Configure a private bucket and verify complete publication, outsider denial, friendship revocation, signed URL expiry and provider errors through the API. Use synthetic fixtures. Interrupted uploads can leave orphan objects if cleanup fails; a durable cleanup sweep is not implemented. Never delete database volumes or bucket objects wholesale to troubleshoot.
