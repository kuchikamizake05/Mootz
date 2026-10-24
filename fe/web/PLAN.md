# Rencana implementasi Mootz web

Owner: Wangsit. Status: frontend sudah diimplementasikan; revisi visual dan navigasi terbaru disinkronkan dari canvas melalui MCP pada 24 Oktober 2026. Sumber terbaru: `MonBlitz/Mootz.pen`, termasuk aturan navigasi H07 dan header current-event-only. Lihat [catatan sinkronisasi](../../docs/design/pen-sync-2026-10-24.md). Scope dan acceptance tetap mengikuti [PRD](../../PRD.md), [AGENTS](../../AGENTS.md), [roadmap](../../docs/roadmap.md) dan [handoff INT-01](../../docs/handoff-int-01-wangsit.md). Bila desain bertentangan dengan dokumen tersebut, dokumen menang.

## 1. Inventaris desain

| Chapter | Isi | Board |
| --- | --- | --- |
| A | Token, komponen inti, komponen Moment/Feed, Event, Meet/Dot, aset demo | A.01–A.05 |
| 01 | Map + Feed, sheet compact/expanded, moment detail | 10 |
| 02 | Capture rear → selfie → review → upload → posted, upload fallback | 9 |
| 03 | Opt-in onchain, Meet QR (waiting/last10/reviewing/expired/used), scan, preview, cek jarak, hasil (pending/saved/failed/off/noLocation), recovery | 20 |
| 04 | Friends, add friend, selfie reaction tray/library/capture | 8 |
| 05 | Komentar, reply, composer keyboard-safe, tombstone | 3 |
| 06 | Profile, streak, Meet count, setting onchain | 6 |
| 07 | Dot detail (7 state), hide, Your Dots, Frames/achievement | 24 |
| 08 | Filter, Event context/details, check-in, collection claim, equip | 12 |
| 09 / 11 | Demo Gathering B (organizer, baca chain langsung) mobile + desktop | 5 + 4 |
| 10 | Adaptasi desktop 1440 (panel kanan 384, dialog) | 15 |
| 12 | Responsive 360×700, 768×900, 360×640 | 4 |
| B | Library state loading/empty/error/recovery | 4 |
| C | Aturan handoff Meet/Dots | 1 |

Viewport acuan: mobile 390×844, desktop 1440×900, organizer 1200×900.

## 2. Rebranding Rove → Mootz

- Warna logo Mootz `#6D28D9` = `rove-purple`, jadi palet tetap; yang berubah nama token dan copy.
- Token: `rove-*` → `mootz-*` (lihat §4). Nama `rove` tidak boleh muncul di kode.
- Copy UI: ±90 teks di desain memuat "Rove" (mis. "Private in Rove", "Point at your friend's Rove QR"). Ganti ke "Mootz" saat implementasi; jangan ganti istilah produk lain (Meet, Dot, Moment, Frame).
- Logo/simbol: salin `assets/brand/mootz/*.svg` ke `public/brand/`; pakai SVG inline/komponen untuk header, favicon dan app icon.
- Opsional: ganti "Rove" di file `.pen` juga supaya desain dan kode sinkron (konfirmasi owner dulu).

## 3. Stack

| Area | Pilihan | Catatan |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript strict | Versi stabil terbaru, dipin di lockfile `fe/web` |
| Styling | Tailwind CSS v4 (`@theme` di CSS) | Token dari §4; tanpa CSS-in-JS |
| Komponen dasar | Radix primitives (via shadcn/ui bila cocok) | Dialog/Sheet/Switch/Toast aksesibel; visual tetap dari desain |
| Font | `next/font/google`: Barlow Condensed 800, Nunito Sans 700/800/900 | Sesuai specimen A.01 |
| Auth | `@privy-io/react-auth` | `getAccessToken()` per request → `Authorization: Bearer` → `GET /v1/me` |
| Data | TanStack Query + fetch client bertipe | Tipe dari `be/specs/*.openapi.json` via `openapi-typescript` |
| Chain | viem; typed data dari `sc/specs/protocol.ts`; ABI `sc/abi/*.json` | Jangan salin urutan field manual |
| Peta | `maplibre-gl` + OpenFreeMap default; MapTiler Satellite opsional | Ikuti `docs/map-plan.md`; tanpa Google Maps |
| QR | Generate: `qrcode`; scan: `BarcodeDetector` dengan fallback `@zxing/browser` | Uji di dua HP HTTPS |
| Kamera | `getUserMedia` (rear lalu front), fallback `<input type="file">` | Upload galeri tidak eligible streak/Meet |
| Animasi | CSS + `motion` seperlunya, hormati `prefers-reduced-motion` | Dot bloom punya keyframe reduced-motion |
| Test | Vitest + Testing Library; Playwright untuk alur; consumer test signing | Lihat §7 |

Bisnis logic tetap di `be/`. Tidak ada route handler Next.js yang menduplikasi aturan Meet/claim/media.

## 4. Design token

```css
@theme {
  --color-mootz-deep: #4C1D95;     /* rove-deep / rove-primary */
  --color-mootz-purple: #6D28D9;   /* rove-purple / rove-accent, warna logo */
  --color-mootz-light: #C4B5FD;
  --color-mootz-canvas: #F4F0FF;
  --color-mootz-ink: #21152F;
  --color-mootz-muted: #62566F;
  --color-mootz-surface: #FFFFFF;
  --color-mootz-depth: #35116F;    /* bayangan tombol 3D */
  --font-display: "Barlow Condensed";  /* 800, display pendek */
  --font-sans: "Nunito Sans";          /* 700/800/900 nama, caption, aksi */
}
```

Aturan dari A.01: body 16px, metadata 14px, label peta 12px; target sentuh min 44px; kontrol floating membulat; Dot = area lembut ~200 m + glyph ungu kecil. Radius, shadow dan spacing diekstrak dari komponen saat Fase 1 dan ditambahkan ke `@theme`.

## 5. Struktur folder

```text
fe/web/
├── src/app/
│   ├── (app)/                 # shell Map/Feed, butuh login
│   │   ├── map/  feed/  moments/[id]/  capture/
│   │   ├── meet/{offer,scan,accept}/  onboarding/meet/
│   │   ├── profile/  dots/[id]/  frames/  friends/
│   │   └── events/[id]/{check-in,collection}/
│   └── organizer/             # Demo Gathering B, tanpa API Mootz
├── src/components/ui/         # primitif ber-token (Button, Sheet, Chip, Avatar+Frame…)
├── src/features/<domain>/     # map, feed, capture, meet, dots, frames, social, events, organizer
├── src/lib/{api,auth,chain,map}/
├── public/brand/
└── tests/{unit,e2e}/
```

Panel/sheet (moment, komentar, reaction, friends, event) disimpan di URL (search param atau parallel route) supaya back button dan refresh konsisten. Mobile = bottom sheet; ≥1024px = panel kanan 384px atau dialog, sesuai chapter 10.

## 6. Fase

Setiap fase selesai hanya bila acceptance-nya terbukti; catat hasil nyata di [verification](../../docs/verification.md).

### Fase 0 — Fondasi & INT-01

Status 2026-10-24: scaffold, scripts, env, Privy provider, API client + `/v1/me`, sync protocol/ABI/API types dan consumer test (11 test) selesai; lint/typecheck/test/build lulus. Belum terverifikasi: login nyata → `/v1/me` (backend lokal belum jalan) dan spike kamera/QR/signing di dua HP HTTPS.
- Scaffold Next.js + Tailwind + TS, `package-lock.json`, scripts `dev/lint/typecheck/test/build`, `.env.example` FE (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_MAPTILER_API_KEY`, `NEXT_PUBLIC_MONAD_CHAIN_ID`, alamat contract).
- Privy login → `/v1/me`; penanganan 401 (refresh/login), 404, 503 (bukan konten kosong).
- Consumer test: hitung digest Offer/Accept/OFFCHAIN_MEET/Claim dan photo commitment dengan viem dari `sc/specs/vectors.json`.
- Spike di dua HP HTTPS: kamera, scan QR, signing EIP-712.

Acceptance: `npm ci && npm run lint typecheck test build` lulus dari fresh clone; login nyata menampilkan profil; test digest lulus dan gagal bila field ditukar.

### Fase 1 — Design system (A.01–A.05, B)

Status 2026-10-24: token + utility `raised`, Lucide, dan komponen di `src/components/ui/` (button, avatar + frame, view switch, controls/bottom actions, map markers, moment/feed/sheet, recording status, state message, selfie tile) selesai; dicek visual di `/dev/components` terhadap board A dan B.01 pada desktop. Belum: cek viewport 390, komponen domain spesifik (QR, kamera, komentar) dibuat di fase masing-masing. Foto demo dari `Mootz.pen` hanya lokal di `public/demo/` (gitignored).
Token, font, logo, dan semua komponen reusable: Map/Feed switch, avatar + frame, marker (avatar/photo/cluster), Locate me, Close, Post moment, bottom actions, filter chip, moment card/feed post/paired photo, sheet, event marker, Meet Dot, Scan to Meet, status recording, toast, skeleton/empty/error.

Acceptance: halaman `/dev/components` (hanya di development) menampilkan semua komponen; screenshot dibandingkan dengan board A.* dan tidak ada selisih visual yang berarti; fokus keyboard terlihat; kontras sesuai A.01.

### Fase 2 — Map + Feed + Capture (01, 02, slice 1/1a/2)

Status 2026-10-24: shell (auth gate, header, bottom actions, state URL `filter`/`moment`), Map (MapLibre + OpenFreeMap, marker, sheet, Locate me, selector Satellite, state B.01), Feed (infinite scroll, state) dan Capture (kamera rear→selfie→review→upload→posted, fallback upload, retry per langkah, streak) selesai; Map dan Feed dicek visual dengan demo fixtures (`NEXT_PUBLIC_DEMO_FIXTURES=1`). Belum: kamera nyata, backend nyata, Satellite (tanpa key), clustering, Friends/Events/Scan to Meet/React/Comments belum punya tujuan. Celah backend: Moment API hanya punya `authorId` (tanpa nama/avatar penulis, jumlah komentar, Dot).
Shell, MapLibre + selector Satellite, marker & sheet, Feed, moment detail, capture rear→selfie→review→upload→posted, upload fallback, streak.

Acceptance: dua akun melihat moment satu sama lain; upload parsial tidak terpublikasi; Map/Satellite mempertahankan camera/filter/panel; atribusi peta tampil.

### Fase 3 — Meet & Dots (03, 07 sebagian, slice 3/4)

Status 2026-10-24: protokol QR/digest/commitment (`src/features/meet/protocol.ts`, 11 test), wallet link + EIP-712 signing (Privy + viem, Monad Testnet), onboarding opt-in, QR poster (sign Offer, refresh lokasi 10 dtk, polling `GET /v1/meets/{id}`), scanner (BarcodeDetector/jsQR), accept (verifikasi signature poster, digest, SHA-256 foto, commitment sebelum signing), layar hasil, Dot di peta, `/dots` dan `/dots/[id]` (hide/unhide) selesai; dicek visual dengan demo fixtures. Belum: signing wallet nyata, uji dua HP, backend, iOS camera, kepadatan QR (~1,5 KB). Celah backend: siapa yang menyembunyikan Dot tidak diekspos (client mengingat secara lokal), status "reviewing" QR tidak bisa dideteksi.
Opt-in onchain, What's recorded, QR 60 detik (semua state), scanner, preview, Accept signing, cek jarak sekali, hasil pending/saved/failed/off/noLocation, recovery, Dot di Map/Feed, Dot detail, hide/unhide, Your Dots.

Acceptance: skenario roadmap slice 3 di dua HP; status Dot terpisah dari status chain; relay gagal tidak menghapus Dot.

### Fase 4 — Sosial & Profil (04, 05, 06, 07 frames, slice 5/6)

Status 2026-10-24: `/moments/[id]` (detail), `/comments` (root + reply satu tingkat, tombstone, draft sessionStorage, retry idempoten), `/react` (library selfie privat, kirim/ganti/hapus reaction, kamera depan), `/profile` + `/profile/settings` (streak, Dots, frame, setting onchain), `/frames` (achievement, wear/remove, kegagalan mempertahankan frame lama), `/friends` (request/accept/decline/remove, add via kode akun) selesai; dicek visual dengan demo fixtures. Celah backend: tidak ada nama/avatar akun lain, add friend hanya via UUID, streak tanpa riwayat harian, jumlah komentar/reply tidak tersedia.
Friends/add friend, selfie library/reaction, komentar + reply + tombstone, profil/streak/setting, frames achievement + equip.

Acceptance: satu reaction aktif; reply satu tingkat; frame sama di Map/Feed/profil setelah refresh.

### Fase 5 — Events & Organizer (08, 09, 11, slice 7/8)

Status 2026-10-24: sheet filter All/Friends/Events (tombol Events), chip event di Feed/sheet, `/events/[id]` (detail), `/check-in` (status; kode hanya di demo), `/collection` (eligibility → authorization → queue → polling; "received" hanya saat kepemilikan terkonfirmasi; 503 bukan "tidak punya"), `/collection/wear`, avatar header dengan frame aktif, dan `/organizer` (wallet injected, challenge baru diverifikasi lokal, baca `balanceOf`/`eventMeetCount` langsung; RPC error ≠ nonholder; status "belum di-deploy" jujur) selesai; dicek visual dengan demo fixtures. Belum: uji terhadap deployment Monad testnet (alamat sudah di `.env.example`), wallet injected nyata, backend. Celah backend: tidak ada self check-in/kode event (hanya organizer via accountId), tidak ada nama organizer/issuer, events spec tanpa schema.
Filter All/Friends/Events, event context/details, check-in code, claim collectible (eligible/pending/received), equip/provenance, `/organizer` yang membaca contract langsung via viem.

Acceptance: claim hanya setelah check-in; organizer membedakan nonholder dari RPC error tanpa endpoint Mootz.

### Fase 6 — Desktop, responsive & polish (10, 12, B, slice 9)

Status 2026-10-24: Playwright + axe (`npm run e2e`, build production di :3100, Chrome lokal) di 360/390/768/1440: 104 test lulus — tanpa scroll horizontal, tanpa error aplikasi, tanpa pelanggaran axe serius/kritis, dan alur inti demo (pilih moment, filter lintas Map/Feed, Meet approve/decline, komentar, hide Dot, check-in + klaim). Feed desktop dua kolom dengan peta pendukung (10.02). Perbaikan a11y: nama link switch, label link yang tidak cocok dengan teks terlihat. `/dev/components` 404 di production. Belum: panel/dialog desktop khusus untuk komentar, selfie, profil, Meet (sekarang kolom tengah), uji perangkat nyata.
Layout 1440 dengan panel kanan/dialog, 768 dan 360, semua state loading/empty/error/retry, reduced motion, audit a11y.

Acceptance: semua board chapter 10/12 dicek di viewport yang sama; Playwright alur inti lulus.

## 7. Cara kerja per layar

1. Ambil screenshot board dari pen.dev (ID board di §1, lewat MCP).
2. Rakit dari komponen Fase 1; teks "Rove" → "Mootz".
3. Sambungkan ke API sesuai OpenAPI; data demo hanya dari fixture berlabel demo.
4. Bandingkan screenshot browser di viewport yang sama dengan board; perbaiki selisih.
5. Jalankan lint/typecheck/test; centang board di checklist PR.

Export HTML dari pen.dev hanya referensi, tidak disalin ke kode.

## 8. Pembagian kerja dengan agent

Fase 0–1 dikerjakan berurutan oleh satu agent karena semua layar bergantung pada token dan komponen. Mulai Fase 2, layar per domain (`src/features/<domain>`) bisa dikerjakan paralel karena file-nya terpisah, dengan kontrak tetap: komponen `src/components/ui`, client API bertipe, dan pola sheet/panel. Shell dan routing global tetap satu pemilik.

## 9. Risiko & keputusan terbuka

- Desain memakai peta ilustratif; implementasi wajib MapLibre/OpenFreeMap. Marker dan overlay ikut desain, basemap tidak.
- Alamat contract masih `null`; jangan pakai alamat fixture sebagai alamat Monad nyata. UI chain menampilkan status "belum dikonfigurasi" sampai ada deployment.
- Privy App ID publik dan backend lokal (`localhost:3001`) dibutuhkan sejak Fase 0.
- Wallet yang didukung hanya undelegated EOA; smart/passkey wallet belum kompatibel.
- iOS Safari: pergantian kamera depan/belakang dan `BarcodeDetector` perlu fallback; buktikan di perangkat nyata.
- Klaim privasi dan status (bukan bukti kehadiran, foto atau manusia unik) harus tetap akurat di copy UI.


## 10. Layout polish follow-up (2026-10-24)

Shared page headers, cards, info rows, status chips and action icons now cover the non-map screens. Signing, API contracts and location checks are unchanged. Screenshot evidence stays local in `.design-export/e2e/`; original references are preserved in `.design-export/layout-before/`.

Open deployment items, outside this layout task (reported, not resolved):

- Set Production `NEXT_PUBLIC_API_BASE_URL=https://api.mootz.fun` and redeploy without cache; the reported www.mootz.fun bundle still used localhost:3001.
- Run VPS migrations 017–019 manually following `be/deploy/vps/README.md`.
- Backend owner: add retry/backoff around startup `createRegistryAccess` when Monad RPC is unstable.
- Dependency audit: 31 findings (18 high, 13 moderate) in the existing production dependency tree; suggested forced fixes include a breaking Privy change. Dependency remediation needs a separate change.

Verification for this layout change: `npm run lint`, `npm run typecheck`, `npm test` (39 tests), `npm run check:generated`, `npm run build`, and `npm run e2e` (132 tests across 390/360/768/1440 px, including axe and overflow) passed. The first E2E run had one Settings navigation timeout; the complete rerun passed without changing the test assertions. E2E uses demo fixtures; real camera, wallet signing, backend permissions and two-device Meet are not verified by this run.

After rebasing onto `f6b5ed8`, profile ordering/privacy sections and centered empty states from the team were retained. Lint, typecheck, 39 unit tests, generated checks and the production-build E2E suite passed again (124 tests; the separately edited local landing suite contained one test per viewport in this run).
