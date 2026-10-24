# Foreground friend location

Approved direction: automatically share while the authenticated app is visible, after browser permission. An account-wide profile switch stops sharing. Accepted friends only; no photo, Meet or chain action required. This explicitly extends the previous no-live-location product scope.

Implementation: dedicated backend preference and latest-position table; authenticated read/write/delete APIs; server-expiring 60-second lease, approximate 200m display coordinates, no movement history. User selected **5 seconds** for both foreground sampling and friend-marker polling. Hidden pages stop sampling and request removal. Browser permission denial is handled without blocking the app. No background permission or tracking.

1. Add regression tests for authentication, malformed/stale coordinates, opt-out, expiry, friend authorization and removal.
2. Add migration, route module, app/server registration and bounded cleanup. Serialize opt-out and writes using the preference row lock so pending uploads cannot re-enable sharing.
3. Add app-wide publisher, persistent account preference switch in profile and a distinct friend marker layer with last update information and an accessible list for locating friends.
4. Add API specification, update scope docs; run backend tests/typecheck/lint and frontend tests/typecheck/lint/build plus targeted integration/browser checks where available.

Do not deploy or modify production data as part of local implementation. Raw locations, tokens and private screenshots are not logged or committed. Existing unrelated working changes are preserved.
