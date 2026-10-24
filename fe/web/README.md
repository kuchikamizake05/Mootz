# Mootz web

Owner: [Wangsit (@wngstnr-code)](https://github.com/wngstnr-code).

Planned responsive Next.js + TypeScript client for the initial two-device demo. This folder currently contains documentation only; no application, dependency manifest, or executable scripts exist.

Planned ownership:

- `src/app/`: page routes and layouts, including the independent organizer demo.
- `src/components/` and `src/features/`: capture, Map/Feed, Meet QR/scanner, profile/Dots/frames, social interactions, and events.
- `public/brand/`: copies of the approved [Mootz assets](../../assets/brand/mootz/README.md).

Business APIs, private storage, check-in rules, location verification, and the relayer live in [be/](../../be/README.md). Do not recreate them in web route handlers. Coordinate API authentication, origins, error states, and transaction status with Faaid through INT-01.

Use MapLibre with OpenFreeMap by default and MapTiler Satellite only when selected. Preserve camera, filters, authorized overlays, attribution, and fallback. Prove capture, QR scanning, signing, and foreground location on two HTTPS devices.

The organizer demo reads collection ownership and event Meet counts from the contracts directly; it does not use Mootz inventory data to decide eligibility.

See [TASKS.md](../../TASKS.md), the [design handoff](../../docs/design/README.md), and the [map plan](../../docs/map-plan.md). Add verified install/run/check commands here when the scaffold exists.
