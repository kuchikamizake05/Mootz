# Mootz: Social Map, Daily Loop, Meet, and Community Events Design Brief

Repository note: the original eight screenshot references remain local and are not uploaded here. Use approved/sanitized references when provided; do not imply the PNGs are attached to this repository.

## Map/Satellite

Use MapLibre GL JS with OpenFreeMap for the default **Map** and MapTiler Satellite for user-selected **Satellite**. See [map plan](../map-plan.md); no runtime integration or verified venue imagery exists yet.

Add a secondary **Map style** control opening Map / Satellite in a mobile sheet or desktop popover. Keep Map | Feed as the only primary tabs. Selecting a basemap preserves center/zoom, filters, overlays, selected moment/Dot, and its open panel. Retain mode through Feed-to-map navigation for the session. Render the same photos/avatars/frames, clusters, event markers, and generalized Dot areas in both modes. Keep controls and labels legible over busy imagery with solid surfaces or clear outlines.

Add **Loading satellite...**, key-not-configured (**Satellite isn't available yet.**), and tile/network/quota error (**Satellite couldn't load. Try again or use Map.**, **Retry**, **Use Map**). The selector must match the actual background. Preserve attribution/logo space per active source; do not invent satellite screenshots or claim imagery freshness/detail. Both modes preserve audience/hide/no-location rules; never expose the exact Meet verification location as a marker.

Extend M01-M03, M18, M21-M22, D01-D02, and D04-D05 where maps appear with the selector and relevant Satellite variants; add one state/component board. Keep baseline artboard IDs, reuse layouts, and prototype Map → Satellite → Map without losing context. A static canvas annotates the intended basemap integration; it is not a working provider/key setup.

## 1. Assignment

Design the signed-in Map and Feed experience for **Mootz**, a social app that puts friends' photo moments on a map and lets two people prove they met in person. This is an app interface, not a landing page, marketing website, analytics dashboard, or crypto trading product.

The deliverable is a mobile-first visual design with responsive desktop adaptations: the two primary views, their shared moment states, and the supporting capture, social, Meet, Dot, frame, and event flows below. Do not implement the application or expand into unrelated screens.

**Confirmed by the product owner:**

- Close to the expressive Bump aesthetic, rather than a stripped-down interpretation.
- Dark purple and light purple as the brand colors.
- Mobile-first, with a proper desktop layout.
- Map and Feed remain the two main views, extended by camera, reaction, comments, streak, Meet, and Dot flows.
- A mixture of avatar markers and photo thumbnails on the map, plus a distinct purple Dot marker for Meets.
- English interface copy.
- Front + rear camera photos in one moment, BeReal-like paired presentation.
- Photo-selfie reactions saved and reusable, not standard emoji.
- Threaded text comments; one reply level.
- A personal daily-posting streak shown in the profile and header summary as a consistency display only.
- **Meet** by QR scan (60 s) with a 100 m distance check; one Meet = two people.
- **Dots** as Meet markers (a count), visible to the two participants and the poster's friends, displayed as an approximately 200 m area.
- One-time opt-in to record Meets onchain, default ON.
- Achievement frames that unlock automatically, and free event collection frames.
- Free-time posting. A notification-driven time-window challenge is a future option, not a constraint.
- All is the default filter; Friends and Events are optional filters. No third primary tab.
- One demo event, one collection, and one independent organizer page (Demo Gathering B) illustrate the event path.

Exact color values, fonts, measurements, and content examples are proposed design specifications, not additional owner-approved decisions. This brief is ready for visual exploration and review, not a claim that a working UI exists.

**Design read:** a social map for students and friends, in a tactile, playful, purple Bump-inspired language. ENERGY 3 / RHYTHM 2 / MOTION 2. High energy comes from expressive markers and chunky controls; rhythm stays predictable for browsing; motion explains selection, view changes, and the Dot moment.

## 2. Product context and limits

People share one moment containing a rear-camera photo and a front-camera selfie, with an optional caption and location. Map and Feed are two views of the **same moments**; reaction, comment, and Dot state belong to that shared data.

A moment marker represents the posting location, not a friend's continuously tracked location. Show the posting time. Do not imply that a person is there now. A moment without a shared location remains in Feed and has no map pin.

A **Dot** is different from a moment marker. It is a purple marker meaning "these two people met here", drawn as an approximately 200 m area (soft circle or cell), never an exact pin. Verification location (sent once by each phone during a Meet) is not the displayed location; do not present the Dot as a precise position or as live presence. A Dot appears on the map only if the moment's location is shared.

Meet is evidence-light: two wallets and a 100 m check do not prove two unique humans or the authenticity of the photo. Never write "verified attendance", "proof of presence", or "permanent" as an absolute guarantee. Contract records contain the wallet pair, time, optional event ID, and a salted photo commitment; no location, no media URL, no names.

Mootz supports everyday direct friend sharing and a retained Event feature. Event pages show organizer, time/place, moments, check-in/eligibility, and the collection. An optional event tag links a post to the event without broadening its audience. A collection records organizer-authorized issuance to a wallet; it does not independently prove attendance or human uniqueness.

Also exclude: Mootz login redesign, full profile editing/history, DM/chat, standard emoji reactions, video, multi-level nested comments, notifications inbox, timed prompt mode, live friend tracking, scratch maps, music integration, global place search, route planning, discovery tabs, Dots as currency, any store or purchasing surface, reward/claim mechanics for streaks or Dots, remote tag-based confirmation, multi-person Meets, wallet-management and transaction-history pages, event ticketing, self-service event creation, organizer dashboards, real sponsor payments, and a collectible marketplace. The independent organizer page is a small separate demo surface, not a primary tab.

## 3. Reference direction

**Primary reference: the owner's eight Bump screenshots.** Borrow full-screen map composition, tactile circular controls, large rounded sheets, expressive avatars, selective glossy objects, and generous contrast in size. Preserve this personality; do not quietly replace it with a minimal SaaS interface.

**Secondary reference: paired-photo and personal-reaction principles discussed for BeReal.** Large rear photo with a smaller selfie inset, a swap action, concise author/time/place info, and reusable photo-selfie reactions. This pack contains no BeReal screenshots; do not present one as attached. Do not copy its branding or add a random daily timer, feed lock, or posting deadline.

**Anti-reference: a dense trading terminal or restrained enterprise dashboard.** Avoid charts, wallet-first navigation, sidebars full of modules, KPI rows, and tiny technical labels. Mootz should feel social and personal, even in the onchain-related screens.

Bump is not in the design-reference skill's brand-file shortlist. The supplied screenshots are the visual source; use Bump's visual grammar, not its wordmark, exact artwork, or a pixel-for-pixel copy. See [the eight-image reference guide](REFERENCES.md). Images 8, 1, 3, and 5 have the highest relevance.

## 4. Visual system

### Color and surface roles

| Role | Proposed value | Use and reason |
|---|---|---|
| Deep purple | `#4C1D95` | Active tabs, key controls, selected marker edges; anchors the owner's chosen identity |
| Primary purple | `#6D28D9` | Main cross-view action, the Dot marker fill, limited icon accents |
| Light purple | `#C4B5FD` | Decorative highlights, the Dot's soft 200 m area, soft dimensional surfaces; not small text on white |
| Lilac surface | `#F4F0FF` | Feed canvas and selected light backgrounds |
| Surface | `#FFFFFF` | Solid sheets and control surfaces |
| Ink | `#21152F` | Primary text |
| Secondary ink | `#62566F` | Time, locations, supporting copy |

Use a light map and light surfaces as a deliberate match to the Bump references. Dark purple is a brand color, not a request for a full dark theme. Design one light theme in this phase; no theme toggle. The Meet QR screen may use a deep-purple full-screen background with a white QR panel for scan contrast, as a single exception; keep the QR on a solid white quiet zone.

Keep the map mostly neutral: off-white land, muted lavender-gray roads, subdued buildings, pale lilac parks. Water recognizable but quiet. The Dot's purple must remain distinct from moment markers by shape (soft area plus a compact dot glyph) and not rely on color alone.

White labels belong on a dark-purple control. A light-purple highlight must not sit underneath white text. Check actual contrast in the rendered design.

Flat text/background pairs checked numerically: white on deep purple 10.95:1; white on primary purple 7.10:1; primary ink on white 17.31:1; secondary ink on white 6.82:1; primary ink on lilac 15.46:1; secondary ink on lilac 6.09:1. These checks do not cover a rendered map, photo overlay, gradient, or final font treatment.

### Typography

Proposed display font: **Barlow Condensed ExtraBold**, used sparingly for the wordmark, short sheet headings, the Dot success headline, and empty-state headlines. Proposed UI font: **Nunito Sans**, medium through extra-bold. If these cannot be used, use clearly noted close fallbacks.

Suggested mobile scale: display 30-36 px; sheet title 24-28 px; author/body 16 px; supporting 14 px; exceptional map labels 12-13 px. The Meet countdown may use a large numeric size (about 48 px). Avoid tiny metadata and widely spaced all-caps labels.

### Shape, elevation, and identity

- Sheets: 32 px top corners. Photo containers: 20-24 px corners. Small controls: 14-18 px; circular buttons only for compact map actions.
- Map/Feed switch: pill-shaped two-option control, approx. 184 x 52 px on mobile.
- Spacing scale: 4, 8, 12, 16, 24, 32 px; 16 px mobile gutters.
- Soft cast shadows only on controls floating above the map and the selected marker. Feed content stays mostly flat.
- A violet ring around an avatar or photo corner is Mootz's repeated identity motif. Frames (achievement or event) are distinguished from the selection outline by a separate outer outline and size change.
- **Dot visual:** a compact filled purple dot with a soft light-purple area (about 200 m at the shown zoom) and, for onchain-recorded Dots, a small lock icon at the corner. Two overlapping avatars may appear in the Dot detail, not on the map marker itself.
- Chunky, rounded, recognizable icons that explain an actual action, not decoration. The lock icon must always carry an accessible name ("Saved onchain").
- Keep glossy or dimensional artwork limited to frame previews, the Dot success animation, and a small location/photo object in an empty state. Do not import Bump's checkerboard head, CD, or bell artwork.
- Use the existing **Mootz** logo/symbol exports in [brand assets](../../assets/brand/mootz/README.md), preserving their aspect ratio. Use initials or clearly marked avatar placeholders until approved portraits are supplied.

The owner's purple palette, rounded floating controls, and expressive direction are intentional choices. Checks should improve hierarchy and legibility, not erase them.

## 5. Shared app shell

The top shell contains the Mootz wordmark, the persistent **Map | Feed** switch, and a small **Your profile** avatar control where space permits. It opens the scoped profile summary (section 7C). The active tab uses dark purple with a clear label. Do not add a third main tab.

Use **All** as the initial content filter. **Filter moments** opens **All**, **Friends**, and **Events**, with the configured event under Events. These are filter options, not tabs. All combines only moments the user may view. Preserve the selected filter across Map/Feed. Posting goes directly to friends; review may add an optional event tag. No circle/group picker, creation, roster, joining, or invitations.

When one event is selected, show its name as supporting context with **Event details**. Keep controls on narrow screens clear of the post action, map attribution, and photographs. Reuse the active supporting sheet for filters/details rather than stacking opaque panels.

**Summary row.** Add a compact secondary row with two read-only-style shortcuts: a **Streak** control (e.g. **3-day streak**) and a **Dots** count (e.g. **12 Dots**). Neither is a balance or a currency: Dots is a count of Meets. Streak opens the streak section of the profile summary; Dots opens the **Your Dots** list in the profile summary (section 7E). On narrow screens give the row its own line. Use sample numbers only as labeled demo data. A camera-shaped **Post moment** control is reachable from both views. Do not add a fake notification count, balance chip, coin icon, plus/top-up control, or earn/spend language anywhere in the shell.

On mobile, place the switch at top center, respecting the safe area; put the small wordmark in a separate compact row if the three items cannot fit. Never compress into overlapping controls. Feed may use a solid shell; Map uses a floating one.

Do not reproduce iOS status bar, Dynamic Island, bezel, or home indicator. Preserve map attribution in a visible corner.

## 6. Map view

### Default composition

Edge-to-edge map as the content background, centered on the UGM campus area in Yogyakarta as an illustrative composition. Venue names and geometry in a future build must be verified; do not invent precise GPS data or reuse a private home location.

Show roughly five to seven moment markers plus **two or three Dot markers**, all labeled as demo content. These are composition fixtures, not statistics.

Marker treatments:

1. **Avatar-led moment:** 48-56 px circular author avatar with a small photo-thumbnail corner.
2. **Photo-led moment:** 64-80 px rounded photo tile with a small author avatar at one corner.
3. **Dot:** purple marker with soft ~200 m area; lock icon when recorded onchain; visually quieter than photo markers so photos remain dominant. Selecting it opens Dot detail (section 7D).

Show equipped frames consistently on avatars. Do not put permanent name, time, caption, and location around every marker; reveal on selection. For overlapping posts, use a compact cluster with a data-derived count. Dots in the same area may share a cluster marker; the count is derived, never invented. One Meet is always one Dot; Dots are never merged.

A current-location dot (if permission is granted) must look different from moment markers and Dots and be labeled **Your location**. Never use the same pulsing dot to imply a friend is live.

An event venue marker may open **Event details**; distinguish it by shape and concise event label. It is an event location, not the position of every participant. Tagging or viewing an event does not unlock its collection frame.

### Controls

- A 48-56 px floating **Locate me** button near the lower right, clear of attribution; recenters only after success.
- Persistent Map/Feed switch at the top.
- A close control on an open sheet.
- A floating **Post moment** button, clear of Locate me, the sheet, and attribution. Hide or reposition it when a sheet covers it.

No bottom navigation for Scratch Map, Chat, Places. No global search field.

### Selected moment and bottom sheet

Selecting a marker adds an outer selection outline, raises its stacking order, and reveals a rounded bottom sheet. Move the map only as needed to keep the pin visible above the sheet. The sheet has a compact preview (about 30-40% of the viewport) and an expanded state (about 75-85%), with a visible close control; content scrolls on short screens.

Content order:

1. Drag handle and explicit close button.
2. Author avatar with equipped frame, name, posting time.
3. Paired-photo preview, large rear image + front selfie inset; **Swap photos** changes presentation only.
4. Short caption, when present.
5. Venue label and the context **Posted here**, not **Here now**.
6. Primary action: **Open in feed**.
7. Selfie reactions row plus **React**, and **Comments** with a data-derived count.
8. When the moment has a Meet the viewer may see: a compact row **"A & B were here"** with the Dot's lock/Not-saved status, linking to Dot detail. For the poster's own moment with no Meet yet, show **Meet** (section 7B).

The sheet previews the same moment, not a profile page. **Open in feed** activates Feed and scrolls to that post with a brief highlight. Closing the sheet restores the previous browsing view.

## 7. Feed view

Photo-first vertical feed on a pale lilac canvas, starting below the shell and summary row. A small **Post today** prompt may appear when the user has no eligible post today; afterwards replace it with **Posted today**, not a persistent nagging banner. No marketing hero, stories carousel, extra filters beyond All/Friends/Events, or new bottom navigation.

Each post contains:

- Author avatar with the same equipped frame as on Map.
- Author name and relative posting time.
- One large photo plus the selfie inset, with a labeled swap action.
- Short caption when available; venue label if location is shared; explicit **View on map** when located.
- Selfie reactions as small photo circles, **React**, and **Comments** (count includes visible non-deleted roots and replies).
- If the moment has a Meet visible to the viewer: a small purple Dot chip, **"A & B were here"**, with a lock icon only if recorded onchain.

Use about 4:5 for the hero example while also designing a landscape or square one. Do not force a destructive crop. Keep text outside the image. For a post without location show **Location not shared** and omit the map action; a Dot for that moment is not drawn on the map; the moment card/Feed card shows the chip **A & B met** instead, and Dot detail shows **No map area**.

Long captions and venue names wrap; an author name may truncate to one line in compact previews but is exposed in full in the expanded sheet and accessible label. Text growth increases height or triggers scrolling, never pushing the close button off-screen. No separate like/emoji system, sharing menu, follow buttons, or engagement rewards.

## 7A. Capture, interaction, and daily loop

### A. Two-direction camera composer

**Post moment** opens a mobile full-screen composer or centered desktop capture panel with a first camera stage, shutter, cancel, and clear front/back labels. Truthful sequential path: capture the rear photo, then **Now take your selfie**, keeping the first result. Do not pretend an unverified device has two simultaneous live streams.

Review shows the large rear photo with selfie inset, **Swap photos**, **Retake back**, **Retake selfie**, optional caption, optional location, optional **Add event** / **Remove event**, and **Post moment**. Both images must be present before publish. Use a saved-draft/upload-progress state so a failed second upload does not look like a successful half-post; keep captures for retry. There is no friend tagging step; Meet starts after publish (section 7B).

If camera access is denied, provide **Try camera again** after permission guidance and an explicit **Upload photos instead** fallback. Uploaded fallback moments are published with a visible **Uploaded photos** label, are not eligible for streak, and cannot start a Meet. Do not claim a browser capture flag proves liveness. Missing one direction is never silently filled by the other photo.

After publication, confirm **Moment posted**, update both views, and show the streak result (or no streak change for an extra same-day post or an uploaded fallback). The post is never rolled back by a later failure. On the confirmation, offer a secondary **Meet** action: **Met someone in this photo? Meet**. It is optional and quiet, not a required step.

### B. Saved selfie reactions

**React** opens a reusable-selfie tray: saved tiles, the current reaction, **Take a selfie**, cancel/close. An empty tray says **Your reactions, your face. Take a selfie to save your first reaction.** Use approved selfies or labeled placeholders. New-selfie flow: front camera, capture, **Retake**, **Save & react**. Keep the collection private; only a submitted reaction is visible to people allowed to view the moment.

One active reaction per user per moment. **Change reaction** replaces without increasing the count; **Remove reaction** removes it. **Remove saved selfie** is separate and does not retract sent reactions. A sent reaction references its submitted image. Design pending and **Couldn't send reaction. Try again** (retry never duplicates). No standard emoji picker.

### C. Threaded comments

**Comments** from Map or Feed opens the same thread panel: a tall mobile sheet with a sticky composer above the keyboard-safe area; desktop uses a side panel or contained dialog. **Back to moment** returns instead of stacking sheets.

Root comments show avatar, name, time, text, **Reply**, and **View replies**. One reply level; a reply to a reply stays in the same root thread with **Replying to [name]**. Draft text and target remain visible until sent or canceled. **Send** disabled when empty; sending/sent/failed/retry states without duplicates. Proposed limit 500 characters. **Delete** for own comments; a deleted root with replies shows **Comment deleted**. Empty thread: **No comments yet. Start the conversation.** No attachments, comment likes, mention notifications, or deeper nesting.

### D. Personal posting streak

The profile summary shows the current streak, a seven-day activity strip, today's status, and **Post today** when due. The compact Streak shortcut opens the same information. **Streak is a display only**: it is counted from the first eligible post per day (server day, further posts that day change nothing). There are no Dots, rewards, claims, bonus chests, tiers, milestones, or paid recovery attached to it, and it never waits for friends or the chain.

Proposed day boundary: **00:00 WIB, Asia/Jakarta**, server publication time, shown in the detail panel. A day without an eligible post breaks the run; the next one starts at 1. Scanning a friend's Meet QR is not one's own daily post.

States: no streak (**Start your streak**), continuing but not posted today (**Post today to keep your streak**), posted today (**Posted today**), missed day (**Start a new streak**), continued run. Only a one-time success animation. No random countdown; posting is free-time.

## 7B. Meet: two people, one Dot

Meet is the core interaction. One Meet = exactly two people. Tagging without a scan is not a Meet. Keep the flow short, physical, and fast: the two people are standing next to each other holding two phones.

### A. Entry

**Meet** appears for the poster on (a) the **Moment posted** confirmation, and (b) the poster's own moment sheet/Feed card, when the moment is a camera capture (not an uploaded fallback). Helper text: **Photographed a friend? Meet to add a Dot.** If the account has not been through opt-in onboarding, show onboarding first (section 7B-F). Entry is available only to the poster; the friend uses **Scan** (a Mootz-internal scan action reachable from the camera icon area or the profile summary, labeled **Scan to Meet**).

### B. Meet QR (poster)

Full-screen screen titled **Show this to your friend**. Large high-contrast QR on a white panel, a visible **60-second countdown** (ring plus numeric seconds, e.g. "0:42"), the moment's thumbnail, helper text **Your friend scans this in Mootz. Stay within 100 m of each other.**, and **Close**. The QR is signed by the poster's wallet and valid for one scanner. Design states: waiting (counting down), last 10 seconds (emphasized, not alarming), expired (**This QR expired. Generate a new one.** with **New QR**), scanned-awaiting-friend (**Friend is reviewing...**), and used. Reduced motion: replace the ring animation with a numeric/step countdown.

### C. Scan and preview (friend)

**Scan to Meet** opens the in-app camera scanner with a viewfinder frame and **Point at your friend's Mootz QR**. Camera denied: permission guidance and **Try again**. After a scan, show the **Meet preview**: both photos (rear + selfie) of that single moment, the poster's name and avatar with frame, posting time, and text **Confirm you're in this photo with [poster name]**. This is a social confirmation that you are together in the photo, not something Mootz verifies. The scanner may be a non-friend of the poster (e.g. met at an event): the QR grants a preview of this one moment only and the Meet does not create a friendship. It shows that moment only, never the poster's other posts, and states **Only this moment is shared with you.** Actions: **Approve** (primary) and **Decline**. Approve signs on the user's behalf in the least confusing way available (no wallet popup, no gas). Show one short line, **Approving adds your confirmation to this Meet.**, plus a link **What's recorded?** that opens a small explainer with the opt-in facts. Decline closes without penalty: **Meet declined. Nothing was shared.**

After Approve: **Checking you're together...** (location sent once from each phone, foreground only), then success or failure.

### D. Success: the Dot moment

Both phones show a full-screen, brief Dot animation (a purple dot blooms into its soft area, the two avatars slide together): headline **"[A] & [B] were here"**, supporting line with the date and area label (e.g. **Near UGM campus**), a **View on map** button (if location is shared), and **Done**. If the two are not friends, a secondary **Add friend** action is offered (never automatic, never required). Under it, a status line (section 7B-E). It should feel nearly instant: show the Dot as soon as the backend accepts the Meet; onchain recording continues in the background and never blocks it. If a new achievement frame unlocked, hand off to the unlock toast (section 7F). The animation plays once; with reduced motion use a short fade and a static Dot.

### E. Onchain status on the Dot

Status chips, always on the Dot detail and compactly on the success screen:

- **Saved onchain** with a lock icon: both participants had the opt-in on and the record is confirmed.
- **Saving onchain...**: relay pending. The Dot already exists.
- **Couldn't save onchain. Retry**: relay failed. The Dot stays; retry the same Meet only (no duplicate).
- **Not saved onchain**: at least one participant has the opt-in off. The Meet is still a valid Dot in Mootz. Explain briefly: **Saving was turned off for this Meet.** No lock icon.

Do not claim the record can be undone after it is final: **Onchain records can't be removed.** Hiding a Dot from the map is separate from the onchain history.

### F. Opt-in onboarding (once) and settings

An onboarding card shown once (after account setup, before the first Meet if skipped): title **Save your Meets onchain forever?**, body **Anyone can see which wallets met and when. Photos and location stay private.**, a labeled **toggle defaulting to ON** (label **Save my Meets onchain**), and **Continue**. A **Learn more** link opens a short explainer: what is public (wallet pair, time, optional event), what stays private (photos, location, names), and that a Meet is recorded onchain only when both people have it on. Do not add dark patterns; the OFF state must be as easy to choose as ON. Profile settings has the same toggle (**Save my Meets onchain**) with the note **Applies to future Meets.** Changing it never alters past Dots. When your toggle is ON but your friend's is OFF, show on the Dot **Not saved onchain** without exposing who turned it off.

### G. Failure states (clear copy)

Each failure keeps the user in context, names the reason, and gives one clear action. None blocks posting or removes existing Dots.

| State | Copy and action |
|---|---|
| QR expired | **This QR expired. Generate a new one.** Poster: **New QR**. Scanner: **Ask your friend to show a new QR.** |
| QR already used | **This QR was already used. Ask your friend for a new one.** |
| Already met here | **You already met here today.** One Meet per pair per ~200 m area per day; explain that the existing Dot stays and offer **View your Dot**. Meeting again somewhere else is fine. No new Dot. |
| Daily limit | **Daily Meet limit reached.** A pair can Meet at most 5 times per server day. No new Dot. |
| Not checked in (event Meet) | **Check in to Demo Workshop A first.** Shown to the scanner when the moment is event-tagged and the scanner is not checked in; action **Open event details**. Event Meets need both people checked in. |
| Too far apart | **You're too far apart to Meet. Move within 100 m and scan again.** **Try again** |
| Location accuracy too low | **Location accuracy is too low. Move to an open area and try again.** **Try again** |
| Location permission denied | **Location access is off. Meet needs your location once to check you're together.** **Open settings guidance** and **Try again** |
| Signing failed or cancelled | **Couldn't sign. Try again.** Keeps the preview; **Try again** and **Decline** |
| Relay pending | **Saving onchain...** non-blocking; Dot already visible |
| Relay failed | **Couldn't save onchain. Retry** (same Meet); Dot unaffected |
| Network error during scan | **Couldn't reach Mootz. Check your connection and try again.** |
| Moment unavailable | **This moment is no longer available.** |

Design a compact **failure board** showing all of the above for both roles, plus the corresponding mobile and desktop treatments.

## 7C. Profile summary

Opened from **Your profile**, the Streak shortcut, or the Dots count. A scoped sheet/panel, not a full profile editor. Sections:

- Avatar with equipped frame and name.
- **Streak**: current run, seven-day strip, today's status, day-boundary note.
- **Dots**: **12 Dots** (demo count) with a short line **Each Dot is a Meet with a friend.** Opens **Your Dots** (section 7E). No balance, coin, or currency treatment.
- **Frames**: achievement and event frames, equipped marker (section 7F).
- **Save my Meets onchain** toggle with **Applies to future Meets.**
- **Post today** when due.

## 7D. Dot detail, visibility, and hide

Selecting a Dot on the map, a **"A & B were here"** chip, or a row in Your Dots opens **Dot detail** (mobile sheet, desktop right panel):

- Two avatars with frames, **"A & B were here"**, date, and the approximate area label.
- A small map showing the soft ~200 m area (never an exact pin). If the moment's location is not shared: **No map area. This moment's location isn't shared.**
- The linked moment's thumbnail (opens it only if the viewer is allowed to see that moment).
- Onchain status chip (section 7B-E), including the lock icon only when recorded.
- Event label if the Meet carried an event ID (e.g. **Demo Workshop A**).
- **Hide from map** (either participant, hides for all viewers). Confirmation line: **This hides the Dot from the map for everyone. It still counts in your profile.** After hiding, the participant who hid it sees **Hidden from map** with **Show on map**; the other participant sees **Hidden** with no Show action, because only the participant who hid it can unhide. Hiding does not remove an onchain record: **Onchain records can't be removed.**
- Visibility note: **Visible to you, [friend], and friends of [poster] who can see this moment.** A friend of the scanner who is not a friend of the poster does not see it.

One Meet = one Dot, so **12 Dots** = 12 Meets. A pair can Meet again the same day only in a different ~200 m area, up to 5 times per server day (same area: **You already met here today.**; over limit: **Daily Meet limit reached.**), so a day out together leaves a trail of Dots; there is no Dot merging and no multi-Meet variant of the detail.

## 7E. Your Dots list

A simple list (profile summary sub-view): each row shows two avatars, **"A & B were here"**, date, area label, lock icon or **Not saved onchain**, and **Hidden** when applicable. Header: **12 Dots** (demo). Empty state: **No Dots yet. Meet a friend to add your first.** with **Post moment**. Error: **Your Dots couldn't load.** with **Retry**. This is a log of Meets, not a ledger: no totals, no amounts, no sorting by value.

## 7F. Frames: achievements and event collections

Frames are cosmetic identity rings. They are not purchased. Two sources:

**Achievement frames** unlock automatically from Dots. Proposed fixtures (labeled as proposals): **First Meet** (1 Dot), **Together** (10 Dots), **Social Butterfly** (Meets with 5 different friends). Design: a frames sheet in the profile summary with locked (with progress, e.g. **7 of 10 Dots**), unlocked, **Wear** / **Wearing** states. On unlock, show an **unlock toast** (**Frame unlocked: First Meet**) with **Wear frame** and **Later**, appearing after the Dot success animation, never blocking it. Equip is stored in the database; show **Frame equipped** after success, or **Couldn't equip. Try again** while keeping the previous frame.

**Event collection frames** (e.g. **Demo Workshop A**) are claimed free after check-in (section 7G). Show provenance on the frame: **From Demo Workshop A**, issuer **Demo Community**, and **About this collectible**.

The equipped frame appears consistently on Map markers, Feed authors, comments, Dot detail, and the profile. Do not add a catalog, price tag, store entry point, or "get more" link.

## 7G. Community events and event collections

### A. Everyday sharing and the Event feature

Mootz stays a social app whether or not an event is active. **Filter moments** offers All, Friends, and Events. Selecting an event filters accessible moments in both Map and Feed; All restores the combined view. The Event detail sheet/panel has the existing check-in and collection entry points. Event tagging is not attendance confirmation or collection eligibility, and does not broaden the photo audience.

In paired-photo review, **Add event** / **Remove event** for the configured event. Open **Event details** from a post's event label, venue marker, or event filter: event name, organizer, date/time/timezone, public venue, description, **View moments**, and **View collection**. **View moments** shows only event-tagged moments the account may view, with a clear empty state. A Meet made in an event context carries the event ID and shows the event label on the Dot. Event creation, ticketing, schedules, and organizer administration remain out of scope.

### B. Collection frame details

Use **Demo Community**, **Demo Workshop A**, and the collection name **Demo Workshop A frame** as clearly labeled fictional fixtures, with a sample cap of **50**. Do not imply that Monad, UGM, or any partner approved it. Supply numbers are demo data consistent across artboards.

The collection sheet shows frame preview on the user's avatar, name, issuer, associated event, **Issued 12 of 50** (pre-claim fixture; **Issued 13 of 50** after the sample claim), eligibility condition, network label **Monad Testnet**, **One per wallet**, **Free to claim**, **Can't be transferred**, and a short public-ownership explanation. Copy: **Issued by the organizer. This does not independently verify physical attendance.** Before claim: **Your wallet's ownership of this collectible is public. Your photos keep their existing audience.** A Meet does not automatically mint a collection.

### C. Check-in, claim, and wear

From event details, **View collection** opens the sheet. Primary action by state:

- **Checking eligibility** while pending.
- **Check-in required** with a scoped **Enter event code** flow when a code is used; invalid/expired code and contact-organizer guidance without a chat tool.
- **Not eligible to claim** when the organizer has not authorized the account.
- **Claim frame** (free) when authorized and supply/window permit.
- **Awaiting approval**, **Claim pending**, user rejection, and **Couldn't confirm claim** with a safe status check before retry. Do not announce ownership before confirmation.
- **Frame received** after confirmed ownership, then **Wear frame** and, in a live build, a real **View transaction** link.
- **Already collected**, **All claimed**, **Claim window ended**: owners can still wear/view after the window ends or supply is full.

Claiming is free and has no cost for the user; the sponsor-paid gas detail is an implementation note, not user-facing copy. **Wear frame** equips; a database equip shows its own pending/failure/success. Claim success and equip failure are separate; ownership is kept when equipping fails.

### D. Demo Gathering B: independent recognition page

A small separate page titled **Demo Gathering B**, visibly labeled **Organizer demo / Monad Testnet**. It recognizes Workshop A alumni by reading the chain directly, with no Mootz database. It is an illustrative hackathon page, not a real partnership, and it is not a Mootz tab. Use a compatible visual language, clearly separate from the Mootz shell.

Flow: disconnected -> **Connect wallet** -> **Confirm wallet ownership** (a fresh challenge; typing an address must not unlock anything; a signature is not a payment) -> reading chain -> result.

Results:

- **Alumni result:** **Welcome back, Workshop A alumni**, with **1 Meet recorded at Workshop A** (demo fixture) and the collection frame preview. Caption: **Read directly from Monad.**
- **Nonholder:** **This wallet doesn't hold the required Workshop A collectible.** Show the issuer and a **Back to event** action; if the wallet has onchain Meets but no collection, say so honestly without granting alumni status (e.g. **0 Meets recorded at Workshop A**).
- **Note on every result:** **Meets not saved onchain aren't counted here.**
- **RPC error:** **Couldn't check ownership. Try again.** Distinct from nonholder; never shown as "not eligible".

Also show rejected/expired authentication, wallet account change (clears the previous result), wrong network, and disconnect. Do not invent discounts, admissions, verified skills, or cross-app support. Do not write **Works in every app**, **Permanent access**, **Your memories can never disappear**, or **No dependency on Mootz at all**. The narrow claim: this page reads wallet-level records directly from the chain; private photos stay in Mootz's access-controlled storage.

## 8. Responsive composition

### Mobile, primary artboard: 390 x 844

- Map fills the viewport; moment and Dot detail are bottom sheets.
- Feed is one column with 16 px gutters and generous photo width.
- Controls clear of the safe area and map attribution. All buttons at least 44 x 44 px.
- Inspect a 360 px width and a short screen; nothing requires horizontal scrolling. The Meet QR must stay fully visible at 360 px and 640 px height (shrink helper text before the QR).

### Tablet, approx. 768 px

- Full map base; a wider centered bottom sheet. Feed one centered column up to approx. 600 px. No cramped desktop split.

### Desktop, primary artboard: 1440 x 900

- **Map tab:** map dominant; selected moment or Dot opens a 360-400 px right panel below the header.
- **Feed tab:** a 560-640 px photo column beside a supporting map panel, 24-32 px apart.
- Supporting map shows the selected located post; before selection fit accessible moments with **Select a moment to see its place**; no location shows **Location not shared**.
- A located Feed card selects its point in the supporting map; **View on map** still activates the Map tab.
- **Meet on desktop:** Meet QR display works as a centered dialog (the poster may have a laptop); **Scan to Meet** needs a camera and is annotated as primarily a phone action, with a **Use your phone to scan** note and no fake scanner. The Dot success appears in the same panel.
- Do not make the desktop app a narrow phone floating in empty space. No enterprise sidebar.

## 9. Interaction contract

| Trigger | Required visible result |
|---|---|
| Select Map or Feed | Activate the view; preserve the other view's browsing state |
| Select a moment marker | Highlight and open its moment preview |
| Select a Dot marker | Open Dot detail; area shown, never an exact pin |
| Select a cluster | Zoom to or expand the represented items |
| Select Open in feed | Open Feed at the same moment and highlight its card |
| Select View on map | Open Map, center the same moment or Dot, highlight it, open its preview |
| Close a preview | Dismiss without resetting map or Feed scroll position |
| Select Locate me | Request location if needed; pending, success, or a useful permission/error message |
| Select Retry after a failure | Retry the failed fetch without resetting unrelated content |
| Select Show all moments | Fit the map to existing located moments, reserving space for controls |
| Select Post moment or Post today | Open the dual-camera composer; return to the origin on cancel |
| Select Swap photos | Exchange large/inset roles for the same moment |
| Select React / saved selfie / Save & react | Open tray; send or replace the single reaction with pending/success/failure |
| Select Comments / Reply / Send | Open the shared thread; set root and visible target; submit once; preserve text on failure |
| Select Your profile / Streak / Dots count | Open the matching section of the profile summary; no balance, no claim |
| Select Filter moments | Choose All, Friends, or an accessible event; same dataset, same permissions |
| Select Add event / Remove event | Set or clear the optional event tag without changing the audience |
| Select Meet (poster) | Open the full-screen Meet QR with a 60-second countdown |
| QR countdown reaches 0 | Show expired state with **New QR**; the old payload no longer works |
| Select New QR | Generate a fresh signed QR and restart the 60 seconds |
| Select Scan to Meet (friend) | Open the in-app scanner; request camera only now |
| Scan a valid QR | Show the Meet preview of that one moment only |
| Select Approve | Sign, send location once, check distance; show progress, then success or a specific failure |
| Select Decline | Close the preview without signing; nothing shared |
| Meet accepted | Both phones show the Dot animation and **"A & B were here"**; onchain status continues in background |
| Select Retry (onchain) | Retry the existing record for the same Meet; never create a second Dot |
| Select a Dot chip / row in Your Dots | Open Dot detail |
| Select Hide from map / Show on map | Hide the Dot on the map for all viewers (either participant); only the participant who hid it sees and can use Show on map; profile count unchanged |
| Toggle Save my Meets onchain | Change setting for future Meets only; past Dots unchanged |
| Achievement unlocked | Show unlock toast; **Wear frame** equips with its own persistence status |
| Select Wear frame / Wearing | Equip the owned frame; update Map, Feed, comments, and profile on success |
| Select Event details / event marker | Open the event panel, not ticketing or live location |
| Select View moments | Return to the event's moments preserving the event filter |
| Select View collection | Open issuer, supply, eligibility, public-ownership note, and claim/wear state |
| Select Claim frame | Run the authorized free claim; do not announce ownership while pending |
| Select About this collectible | Open the issuer/provenance sheet without giving photo access |
| Select View transaction | Open the real confirmed transaction in a live build; static prototypes must not fabricate a hash |
| Select Open organizer demo | Open Demo Gathering B while preserving Mootz context |
| Select Connect wallet / Confirm wallet ownership | Connect, authenticate, then read the chain |
| Change wallet account / disconnect | Clear prior authentication and result |

Friend-audience permissions, the event tag/filter, and the data source remain the same in both views. Preserve map center/zoom and Feed scroll when switching manually.

Motion proposals: tab indicator 180-240 ms; sheet 240-320 ms; map flight about 500-700 ms; Dot bloom about 600-900 ms once; selected-card highlight brief. No endless bouncing or pulsing. Reduced-motion mode uses direct placement or a short fade, a numeric/step countdown for the QR, and a static Dot.

For the prototype, link specified states where the authoring environment allows; otherwise annotate trigger and destination. Do not claim a static mockup is an interactive app.

## 10. Required non-happy states

| State | English copy / response |
|---|---|
| Map loading | **Loading the map...** Keep the shell visible |
| Moment loading | **Loading this moment...** Preserve preview dimensions |
| Empty map | **No moments on the map yet.** Supporting: **Shared locations will appear here.** Offer **Open feed** |
| Empty visible region | **No moments in this area.** Offer **Show all moments** |
| Empty feed | **No moments yet.** Supporting: **Share both sides of your day.** Offer **Post moment** |
| Map tiles fail | **The map couldn't load.** Offer **Retry** and **Open feed** |
| Feed fetch fails | **Your moments couldn't load.** Offer **Retry** |
| Location denied (browsing) | **Location access is off. You can still browse the map.** Do not block Feed or re-request endlessly |
| Photo unavailable | **Photo unavailable.** Preserve author metadata and location action |
| Selected post unavailable | **This moment is no longer available.** |
| Camera denied/unavailable | Explain access, give guidance and a labeled upload fallback that is not streak- or Meet-eligible |
| Second capture or upload fails | Keep the successful capture for retry; do not publish incomplete media |
| Selfie library empty / send fails | Offer first selfie capture; preserve selection and offer retry |
| Comments empty / load or send fails | Offer composer; preserve drafts; retry without duplicates |
| Streak update unavailable | Keep the published moment; show a neutral retry for the streak display only |
| Meet QR expired / used | Section 7B-G copy; regenerate |
| Meet too far / accuracy low / location denied | Section 7B-G copy; retry in place |
| Meet signing failed / declined | Preserve preview; no Dot; nothing shared on decline |
| Relay pending / failed | Dot remains; **Saving onchain...** or **Couldn't save onchain. Retry** |
| Friend's opt-in is off | Dot still valid; **Not saved onchain**, no lock |
| Dot hidden / location not shared | **Hidden from map** (hider, with Show on map) or **Hidden** (other participant, no action); location not shared: not on the map, **A & B met** on the moment card and in Your Dots; profile count unchanged |
| Your Dots empty / fails | Empty or error copy from section 7E |
| Frame equip fails | Keep old frame; **Couldn't equip. Try again** |
| Event has no visible moments / access denied | Event-specific empty or post-access state; no private photos exposed |
| Collection eligibility pending / missing | Distinguish checking from not authorized; do not infer eligibility from Dots or location |
| Event code invalid or expired | Preserve event context; explain; allow scoped retry |
| Collection all claimed / window ended | Disable new claims with a reason; keep owner wear/view |
| Claim rejected, pending, or status uncertain | Check the existing claim before offering another submission |
| Collection owned but equip failed | Keep ownership and old frame; **Retry equip** |
| Gathering B disconnected / wrong network / auth rejected | Specific step with connect, switch, or retry action |
| Ownership read failed / confirmed nonholder | **Couldn't check ownership. Try again.** versus **This wallet doesn't hold the required Workshop A collectible.** Never grant access from a stale result |

Distinguish loading from empty. Never use an empty map as a loading indicator. A first-run empty state and an empty map region are different.

## 11. Content and privacy

For a populated layout study, use clearly labeled **Demo content** with initial-based avatar placeholders and photo placeholders until approved photos are supplied. Demo identities: **Demo friend A**, **Demo friend B**. Example captions: **Coffee before the next session.** and **A quick break on campus.** Times and counts are demo fixtures or data-derived.

Fixtures: streak **3-day streak**, **12 Dots**, Dot title **"Demo friend A & Demo friend B were here"**, area label **Near UGM campus**, achievement proposals (First Meet 1 Dot, Together 10 Dots, Social Butterfly 5 different friends), event **Demo Workshop A** by **Demo Community**, cap **50**, **12 of 50 -> 13 of 50**, Gathering B result **1 Meet recorded at Workshop A**. Do not mix other counts into the same prototype path.

Privacy facts to keep visible and consistent: photos, selfies, captions, locations (verification and display), Dots, friendships, and frame unlock status stay offchain with audience-based access. Only the wallet pair, time, optional event ID, and a salted photo commitment may be recorded onchain, and only with both opt-ins. A QR opens only a preview of its one moment; knowing a moment ID gives no access. Verification location is not the displayed location.

Use broad public campus/place context. Do not reproduce the owner's private home location, friend names, profile information, phone UI, or travel history from the screenshots. Screenshots must not be pasted into the final map; annotate illustrative geography. In an implementation use a real map provider with attribution.

## 12. Deliverables for this design phase

Create these named artboards or clearly labeled equivalent frames:

1. `M01 / Map / Default` (390 x 844), including Dot markers.
2. `M02 / Map / Selected moment / Compact sheet` (390 x 844).
3. `M03 / Map / Selected moment / Expanded sheet` (390 x 844).
4. `M04 / Feed / Populated` (390 x 844), with the same selected example moment and a Dot chip.
5. `D01 / Map / Selected moment / Right panel` (1440 x 900).
6. `D02 / Feed / Photo column + supporting map` (1440 x 900).
7. A compact state board: loading, empty, fetch error, photo failure, denied location.
8. A component/token board: tabs, avatar frames (achievement and event), moment markers, Dot marker (with and without lock), cluster, buttons, moment sheet, Feed post, status chips.
9. `M05-M07 / Capture / Back, selfie, and review` with fallback and failed-upload variants.
10. `M08 / Moment posted / Streak updated + optional Meet`, with no-change variants (extra same-day post, uploaded fallback).
11. `M09-M10 / Selfie reactions / Saved tray and new-selfie review`, with empty/change/remove/failure states.
12. `M11 / Comments / Root + replies + reply composer`, with empty/deleted-root/failure states.
13. `M12 / Profile summary / Streak + Dots count + frames + onchain setting`.
14. `M13 / Onboarding / Save your Meets onchain` (toggle ON by default, and the OFF variant), plus the profile-settings variant.
15. `M14 / Meet / Entry and Meet QR (60 s countdown)`, with waiting, final-10-seconds, expired, scanned, and used variants.
16. `M15 / Meet / Scan and preview (Approve / Decline)`, including camera-denied and declined variants.
17. `M16 / Meet / Success: Dot animation "A & B were here"`, with Saved onchain / Saving onchain / Couldn't save onchain / Not saved onchain variants.
18. `M17 / Meet / Failure board`: QR expired, already used, already met here today, daily Meet limit, not checked in to the event, too far, accuracy too low, permission denied, signing failed, relay pending/failed, network error, for both roles.
19. `M18 / Dot detail / Area, status, Hide from map`, with hidden, no-location, and event-context variants; and `M19 / Your Dots list` with empty/error.
20. `M20 / Frames / Achievement unlock toast + frames sheet`, with locked/progress/unlocked/wearing/equip-failed states.
21. `M21 / Moment filter / All + Friends + Events` and `M22 / Event context / Map + moments`.
22. `M23 / Event details + collection preview` and `M24 / Collection claim / Check-in, eligible, pending, received`, with checking/ineligible/already-owned/sold-out/expired/failure variants.
23. `M25 / Frame preview + equip + wearing`, with provenance (**From Demo Workshop A**, **About this collectible**) and an equip-failure state, showing the equipped result on Map and Feed.
24. `D03 / Desktop composer and social panel` and `D04 / Desktop Meet + Dot panel (QR dialog, Dot detail)`.
25. `D05 / Event details + collection / Desktop panel`.
26. `X01 / Demo Gathering B / Disconnected`, `X02 / Wallet ownership + chain read`, and `X03 / Workshop A alumni result`, with mobile/desktop adaptation and nonholder/wrong-network/auth-rejected/RPC-failed/account-changed variants. These are separate demo pages, not Mootz tabs.

If the environment supports prototypes, connect M01 to M02, M02 to M03, M02 to M04 through **Open in feed**, and M04 back to M02 through **View on map**. Extend the path: Post moment -> capture -> review -> M08 -> Meet -> QR -> (other phone) scan -> preview -> Approve -> Dot animation -> unlock toast -> Dot detail -> Hide from map; and event -> collection claim -> wear -> Gathering B. Otherwise annotate states and destinations.

Do not generate a store, frame catalog with prices, balance screen, full profile editor, Mootz login redesign, wallet-management, transaction-history, or notification screens as bonus work.

## 13. Review criteria and handoff boundaries

The design is ready for owner review when:

- It reads as an expressive social map, not a dashboard or trading app.
- Dark/light purple, tactile controls, and expressive avatars preserve the Bump-like personality without copying its assets.
- Map is the dominant default view; photos dominate Feed; Dot markers are distinct but secondary to photos.
- Both directions of the Map/Feed connection identify the exact same moment.
- Location is described as posting context, never live presence; a Dot is an approximate area, never an exact pin.
- Mobile and desktop share a visual system with layouts suited to their space.
- Empty, loading, errors, long names, long captions, missing photos, and missing locations have explicit handling.
- Text contrast is checked, tap targets are comfortable, visible focus styles exist, and dialogs have close buttons plus Escape behavior in an implementation.
- The Map can be bypassed through Feed; canvas markers are not the only way to reach moments or Dots (Your Dots list covers Dots).
- No balance, currency, store, price tag, claim-for-Dots, reward state, or earning language appears anywhere. Dots are counts of Meets.
- Streak is a display only, from the first eligible post per day, with no reward or milestone.
- The Meet flow is short and clear: QR with a visible 60-second countdown, a preview of one moment only, Approve/Decline, location sent once with a 100 m limit, and a Dot animation on both phones with no confusing wallet popup or gas prompt.
- Every failure state has specific copy and one clear action; relay problems never remove the Dot.
- The opt-in screen is honest: public wallet pair and time, private photos and location, ON by default, changeable for future Meets, with a visible lock only on recorded Dots and **Not saved onchain** otherwise.
- Dot visibility is explained (both participants plus the poster's friends), shown as an area, hideable by either participant, and still counted in the profile.
- Achievement and event frames unlock/claim without any purchase, appear consistently on Map, Feed, and profile, and event frames show provenance.
- Demo Gathering B reads the chain directly, distinguishes RPC error from nonholder, and notes that Meets not saved onchain aren't counted. No real partnership is implied.
- Claims stay hedged: Meet and collections do not prove physical attendance, unique humans, or photo authenticity.

**Brief review:** scope, cross-view identity, reference mapping, and control outcomes have been checked in this document. This is a written specification and reference pack only. Pixel layout, actual contrast, keyboard operation, motion, QR scanning, signing, and runtime behavior remain to be verified on the produced design or app. No browser build, pen.dev integration, or clickable prototype has been completed as part of this brief.
