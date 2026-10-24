# Mootz: design prompt for pen.dev

Repository note: the original eight screenshot references remain local and are not uploaded here. Use approved/sanitized references when provided; do not imply the PNGs are attached to this repository.

## Copy from here

Design **Mootz**, a playful social app with **Map + Feed**: friends share a daily front + back photo, and two people who meet in person can create a **Dot** together. Inspired by BeReal (paired photos) and Zenly/Bump (social map). Pitch: "Zenly died and took your memories with it. Mootz makes your real-life connections yours forever." Follow `DESIGN_BRIEF.md`. Use the eight numbered Bump references only if approved/sanitized copies have actually been provided; otherwise use the written reference guide and approved placeholders.

The owner wants a visual direction close to Bump: expressive avatars, chunky floating controls, large rounded bottom sheets, tactile depth, selective glossy details. Use **dark purple + light purple**, a light neutral map, and solid light surfaces. Do not copy Bump branding or artwork. Use the existing Mootz logo/symbol exports in assets/brand/mootz/ and preserve their aspect ratio; supply those files to the design tool if needed rather than assuming they are attached. All interface copy must be **English**. Mobile-first with proper desktop compositions; not a landing page, dashboard, or crypto exchange.

### Core shell

Persistent top **Map | Feed** switch (only two primary tabs). Below it a compact summary row with **Streak** (e.g. 3-day streak) and **Dots** as a count (e.g. **12 Dots**). Dots are not a currency: no balance, coin, price, store, or earning language anywhere. Add **Post moment** from both views and a small **Your profile** control. **All** is the default filter; **Filter moments** offers All, Friends, and Events (filters, not tabs). No circles/groups; posts go straight to friends.

The map mixes **avatar-led moment pins**, **photo-thumbnail pins**, and purple **Dot markers**. Moment pins show where a photo was posted, not live location. A Dot shows an approximately 200 m soft area, never an exact pin. A selected pin opens a rounded bottom sheet on mobile and a right-hand panel on desktop. Feed is photo-first: large rear photo plus selfie inset, Swap photos, author with equipped frame, time, caption, place, View on map, selfie reactions, comments. A small Dot chip "A & B were here" appears on moments with a Meet the viewer may see. **Open in feed** and **View on map** link the same moment across views; preserve scroll and map position except for targeted navigation. Posts without location stay in Feed.

### Map / Satellite addendum

Use MapLibre GL JS with **Map** (OpenFreeMap, default) and **Satellite** (MapTiler Satellite, loaded only when selected); no Google Maps. A secondary **Map style** control opens Map / Satellite in a mobile sheet or desktop popover. It is separate from primary Map | Feed navigation. Preserve center/zoom, filter, overlays/clusters, selected moment/Dot, and open detail during a switch and keep the mode through Feed-to-map navigation for the session.

Both modes share authorized Mootz data and the same hidden/no-location Dot rules. Satellite does not reveal precise verification locations or change who can see photos. Keep purple markers/frames and controls legible over imagery. Preserve active-provider/data attribution and MapTiler logo space.

Include **Loading satellite...**, **Satellite isn't available yet.** when unconfigured, and **Satellite couldn't load. Try again or use Map.** with **Retry** / **Use Map**. Keep context and match the selector to the actual basemap. Add relevant mobile/desktop Satellite variants and state/component examples. Illustrative maps must be labeled; a static canvas is not a working provider integration or verified venue image. MapTiler Free has request/usage conditions, not unlimited satellite access. See docs/map-plan.md if supplied.

### Daily loop

Two-step capture: back photo, then **Now take your selfie**, then review with retake, swap, caption, optional location, optional **Add event** / **Remove event**, upload progress and recovery. Do not promise simultaneous cameras. A gallery fallback is labeled **Uploaded photos**, is not streak-eligible, and cannot start a Meet. Free-time posting; no timer. Selfie reactions from a private reusable library (one per user per moment, change/remove, no emoji picker). Comments with one reply level, visible reply target, Send, delete own, empty/loading/failure states, preserved drafts.

**Streak is display only**: it counts the first eligible post per day (midnight WIB shown in the detail), with no Dots, reward, claim, or milestone. Show it in the profile summary with a seven-day strip.

### Meet and Dots (the new core)

After publishing, the poster who photographed a visible friend taps **Meet**: a full-screen **QR with a 60-second countdown**, signed by the poster's wallet, with states waiting, last 10 seconds, expired (**This QR expired. Generate a new one.** / **New QR**), friend reviewing, used. The friend taps **Scan to Meet** in Mootz, scans, and sees a **preview of that one moment only** (both photos + poster, **Confirm you're in this photo with [name]**, a social confirmation, not verified; the scanner may be a non-friend and a Meet does not create a friendship) with **Approve** and **Decline** (the UI says only Approve; no wallet popup). Both phones send location once; the distance must be 100 m or less. On success both phones show a Dot animation, headline **"A & B were here"**, nearly instantly, with no confusing wallet popup and no gas for users. Onchain recording runs in the background. If the two are not friends, success offers an optional secondary **Add friend** (never automatic). A pair can Meet again the same day only in a different ~200 m area, up to 5 per day; one Meet = one Dot, so 12 Dots = 12 Meets, no merging.

Status on a Dot: **Saved onchain** (small lock icon), **Saving onchain...**, **Couldn't save onchain. Retry** (Dot stays), **Not saved onchain** (no lock; Meet still valid).

Failure board with clear copy: QR expired, QR already used, **You already met here today.**, **Daily Meet limit reached.**, **Check in to Demo Workshop A first.** (event Meets need both people checked in), **You're too far apart to Meet. Move within 100 m and scan again.**, **Location accuracy is too low. Move to an open area and try again.**, **Location access is off. Meet needs your location once to check you're together.**, **Couldn't sign. Try again.**, relay pending/failed with retry, network error. Each has one clear action and never removes existing Dots.

**Dot detail:** two avatars, "A & B were here", date, approximate area, linked moment (only if the viewer may see it), onchain status, optional event label, and **Hide from map** (either participant, for all viewers; the Dot still counts in the profile; only the participant who hid it sees **Show on map**, the other sees **Hidden**). Visibility: both participants and the poster's friends who can see the moment; not the scanner's other friends or the public. If the moment's location is not shared the Dot is not on the map; the moment/Feed card shows **A & B met** and it appears in Your Dots. A **Your Dots** list covers the same Dots outside the map. One Meet = two people; no group Meets.

### Opt-in onboarding

One-time screen: **Save your Meets onchain forever?** / **Anyone can see which wallets met and when. Photos and location stay private.** Toggle **Save my Meets onchain**, default ON, as easy to turn off as on, plus **Continue** and **Learn more**. The same toggle lives in profile settings: **Applies to future Meets.** A Meet is recorded onchain only if both people have it on; otherwise it is still a Dot with **Not saved onchain**.

### Frames

No Shop, prices, or purchases. **Achievement frames** unlock automatically from Dots (proposal fixtures: **First Meet** 1 Dot, **Together** 10 Dots, **Social Butterfly** Meets with 5 different friends): locked with progress, unlock toast **Frame unlocked: First Meet** with **Wear frame**, **Wearing**, equip-failed retry. **Event collection frames** (e.g. **Demo Workshop A**) are free to claim after check-in, with provenance (**From Demo Workshop A**, issuer **Demo Community**, **About this collectible**). Equipped frames show consistently on Map, Feed, comments, and profile.

### Events

Keep the full Event feature: details (organizer, date/time/place), event moments, check-in/eligibility, collection claim and wear. Use labeled fixtures **Demo Community**, **Demo Workshop A**, cap 50, **Issued 12 of 50 -> 13 of 50**, **Monad Testnet**, **One per wallet**, free, not transferable, with **Your wallet's ownership of this collectible is public. Your photos keep their existing audience.** and **Issued by the organizer. This does not independently verify physical attendance.** Claim states: checking, code required/invalid, not eligible, claim, awaiting approval, pending, failed/uncertain, received, already collected, all claimed, window ended; owners can still wear. A Meet does not mint anything automatically.

### Demo Gathering B

A small separate page, **Organizer demo / Monad Testnet**, outside Mootz's tabs: connect wallet -> confirm wallet ownership -> read the chain directly -> **Welcome back, Workshop A alumni** with **1 Meet recorded at Workshop A**. Nonholder state **This wallet doesn't hold the required Workshop A collectible.** RPC error **Couldn't check ownership. Try again.** (not "not eligible"). Note on results: **Meets not saved onchain aren't counted here.** Also wrong network, rejected/expired authentication, account change/disconnect. Label it illustrative: no real partnership, discount, or admission.

### Honesty

Do not claim Meets prove unique humans, photo authenticity, or physical attendance. Photos and locations stay private offchain; only the wallet pair, time, optional event, and a salted photo commitment can be recorded onchain, with opt-in. Onchain records can't be removed; hiding a Dot only affects the map. A static design is not a working camera, scanner, signer, or contract.

### Deliverables and constraints

Create the mobile/desktop artboards listed in section 12 of the brief: M01-M25 (map, sheets, Feed, capture, posted, reactions, comments, profile, onboarding, Meet QR, scan/preview, success, failure board, Dot detail and Your Dots, frames and unlock, filter, event, collection, wear), D01-D05, X01-X03, plus state and component boards. Use clearly labeled demo fixtures and initials/photo placeholders. Add prototype links if supported, otherwise annotate triggers and destinations.

Reference priority: **08** main map composition; **01** identity and rounded surfaces; **03** sheet structure; **05** selection hierarchy; **02/06** map softness; **04/07** dimensional detail and state composition only. Do not import music, scratch maps, notifications, place search, or other extras.

Exclude Mootz login redesign, any store or catalog, balance or wallet-management screens, transaction history, full profile editing, DM/chat, emoji reactions, deep comment nesting, notifications inbox, timed challenges, group Meets, ticketing, event creation/admin, and marketplace. Do not show dead navigation for excluded features.

Aim for a bold, social, tactile result. Keep maps legible and photos dominant, use brief purposeful motion (reduced motion supported), and retain map attribution, readable contrast, visible focus, and comfortable touch targets. Do not present a static design as a functioning app.
