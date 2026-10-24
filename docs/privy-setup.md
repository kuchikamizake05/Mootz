# Privy setup for Mootz

The current backend verifies login access tokens locally. It needs the app ID and public verification key; it does not need an App Secret for this verification flow. Frontend login is a separate Wangsit-owned integration and is not scaffolded yet.

## Dashboard

1. Open the [Privy dashboard](https://dashboard.privy.io/) and create a development app named Mootz. Use a separate production app later. [Official app setup](https://docs.privy.io/basics/get-started/dashboard/create-new-app).
2. Enable **Email**, **Google**, and external **Wallet** login on the Authentication page. The diagnostic client requests `loginMethods: ['email','google','wallet']`; methods must also be enabled in the dashboard. [Official login methods](https://docs.privy.io/basics/get-started/dashboard/configure-login-methods).
3. Configure the web client's allowed origin to the actual FE origin; planned local web development uses `http://localhost:3000`. Add a deployed HTTPS origin when it exists. An App Client may have its own origins/client ID. Do not use the backend's port3001 as the FE origin. [App clients](https://docs.privy.io/basics/get-started/dashboard/app-clients).
4. Copy the **App ID** from Configuration → App settings → Basics, and obtain the app's **public auth-token verification key** from its settings. The backend expects a PEM/SPKI public key suitable for ES256. It is not the App Secret, a wallet private key, or a user access token. [Token verification](https://docs.privy.io/authentication/user-authentication/access-tokens).

## Backend configuration

Google addition: the user requested Google social login. The local diagnostic client now includes Google alongside Email and Wallet. Wangsit's product client should use the same methods. Backend token verification remains provider-method agnostic and still derives identity from the verified Privy subject, never a client-supplied email or Google account ID. Signing/binding a wallet remains separate from login. Do not merge accounts by matching email strings.

Dashboard activation and an actual Google OAuth roundtrip are not yet verified: browser control currently reports disabled in Work settings. Open the Mootz app in Privy, enable Google under Authentication/login methods and save, keeping existing Email/Wallet enabled. If custom OAuth credentials are required or desired, follow the dashboard's Google setup and store secrets there, not in FE source or backend env. Confirm localhost:3000 and the deployed FE HTTPS origin are allowed, then test Google login and GET /v1/me. No Google client secret is added to this repository.

Edit the existing private `be/.env`; preserve database and Supabase settings. Fill both values together:

```dotenv
PRIVY_APP_ID=YOUR_APP_ID
PRIVY_VERIFICATION_KEY="-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_BODY\n-----END PUBLIC KEY-----"
```

Use the full exported verification key, including its PEM boundaries, with literal `\n` line separators. The backend expands those separators. App ID/public key are not secrets; keep App Secret and wallet private keys out of chat, Git and FE. No App Secret is required by the current token verifier.

The backend also accepts a single-quoted public JWKS JSON object in `PRIVY_VERIFICATION_KEY` when an app publishes multiple signing keys. This selects the matching `kid` without choosing one key arbitrarily. The app's public JWKS is available at `https://auth.privy.io/api/v1/apps/APP_ID/jwks.json`. These configured keys are a local snapshot; refresh/reload them when Privy rotates signing keys. No App Secret is sent when obtaining this public key set.

From `be/`, reload the configured API:

```powershell
docker compose up -d --wait api
```

An incomplete pair of settings or invalid PEM fails startup. With valid configuration, `/v1/me` without a bearer token should return401 instead of503 AUTH_UNAVAILABLE. This is only a configuration check: a real login must still be tested.

## Frontend handoff

Wangsit's web client must initialize `PrivyProvider` with the same App ID. The frontend environment name planned in the repository is `NEXT_PUBLIC_PRIVY_APP_ID`; configure a client ID only if a specific App Client is used. For users without a wallet, the current React SDK supports automatic Ethereum embedded-wallet creation through `embeddedWallets.ethereum.createOnLogin='users-without-wallets'`. [Official React setup](https://docs.privy.io/basics/react/setup).

After login, the frontend gets an access token with `getAccessToken()` and sends `Authorization: Bearer <token>` to the backend. First call `GET /v1/me`, then complete onboarding/update preferences, and use the existing signed wallet-control challenge to establish binding. Tokens establish provider identity; client-supplied wallet/account IDs never establish identity by themselves. [Access-token integration](https://docs.privy.io/authentication/user-authentication/access-tokens).

Complete acceptance requires two real authenticated accounts and the actual photo flow with authorization checks; synthetic cryptographic tests do not replace this.

## Diagnostic client

The local diagnostic client is in `be/dev-login/`. Follow its README to configure public client values and test login, wallet binding and synthetic publication. Keep backend credentials out of the browser bundle. Validate real-account permissions and product-client integration separately.
