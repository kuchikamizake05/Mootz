# Mootz — rencana pengerjaan tim

Baseline: [PRD](../PRD.md), [brief](../BRIEF.md), [design](design/DESIGN_BRIEF.md), dan [Map/Satellite](map-plan.md).

**Tujuan:** dua akun/perangkat menjalankan foto harian → Meet → Dot → frame → koleksi acara → pengenalan Gathering B dengan bukti nyata. Rencana ini membagi pekerjaan manusia dan tidak menjalankan implementasi atau agent secara otomatis.

**Status:** backend dan kontrak tersedia. Frontend produk, deployment dan penerimaan lintas perangkat masih perlu diselesaikan. TASKS.md mencatat pembagian pekerjaan.

## Pembagian dan batas ownership

| Orang | Akun GitHub | Ownership utama | Handoff |
| --- | --- | --- | --- |
| Wangsit | [@wngstnr-code](https://github.com/wngstnr-code) | FE: halaman, komponen, Map/Feed, capture, QR/scanner, profile/Dot/frame, social, Event dan Gathering B | Konsumsi DTO BE dan ABI SC; bukti HP/desktop serta state UI |
| Faaid (owner) | [@kuchikamizake05](https://github.com/kuchikamizake05) | BE: auth/binding, DB/media/audiens, publication, Meet/GPS/limits, Dot/streak/frame, social API, check-in/eligibility, relayer/outbox | Schema/API/errors/fixtures, transaction status, integrasi dan koordinasi issue |
| Diaz | [@amantajatii](https://github.com/amantajatii) | SC: MeetRegistry, EventCollection, tests, deployment testnet, ABI/address/roles dan read methods | Typed-data/test vector, ABI dan bukti receipt/count/ownership |

Akun dipetakan dari collaborator repo dan nama profil pada tanggal rencana. Owner utama bertanggung jawab sampai handoff; review lintas area diperlukan untuk interface dan jalur integrasi.

## Peta folder yang direncanakan

Folder `fe/app`, `fe/web`, `be`, dan `sc` sudah dibuat dengan README; aplikasi belum di-scaffold. Pembagian folder ini disetujui, sementara subfolder/source berikut adalah target yang dikunci di INT-01. Web Next.js di `fe/web` menjadi demo awal; `fe/app` disiapkan untuk client mobile terpisah, dengan framework dan scope implementasi belum dipilih. Backend service berada di `be`, bukan route bisnis Next.js di FE.

| Path usulan | Owner | Aturan perubahan |
| --- | --- | --- |
| fe/app/ | Wangsit | Client mobile terpisah; toolkit/scope dikunci di INT-01, bukan klaim aplikasi native sudah ada |
| fe/web/src/app/, fe/web/src/components/, fe/web/src/features/ | Wangsit | UI/routes web dan organizer demo; tidak memuat business API/backend rules |
| be/src/api/, be/src/, be/supabase/migrations/, seed | Faaid | API untuk kedua client, auth/server/storage/DB, worker dan relayer; issuer/relayer keys tidak ke client |
| be/specs/ DTO/types/status/fixtures | Faaid, review Wangsit + Diaz | Interface API publik; konsumen tidak mengimpor modul server privat |
| sc/src/, sc/test/, sc/script/ | Diaz | Solidity/Foundry, tests/deploy; tidak menyimpan key atau dependency build cache |
| sc/specs/ typed-data/test vector, sc/abi/ ABI/deployment | Diaz, review Faaid + Wangsit | Satu sumber signing dan ekspor contract; FE/BE tidak mengedit ABI manual |
| Manifest/lockfile/config per modul; koordinasi workspace root | Owner modul, Faaid koordinasi INT-01 | Pilih runtime/package manager dan strategi workspace sebelum menambah dependency; root bukan otomatis runtime aplikasi |
| assets/brand/mootz/ → fe/web/public/brand/ atau asset client mobile | Wangsit | Gunakan PNG/SVG yang sudah di Git; jangan upload referensi pribadi/ekspor desain lokal tanpa scope eksplisit |

Issue boleh mengubah pembagian path saat scaffold nyata disepakati, tetapi ownership dan consuming interfaces harus diperbarui pada issue sebelum merge. Semua orang menjaga perubahan orang lain dan tidak me-reset pekerjaan rekan.

## Aturan produk untuk seluruh task

- Map/Feed dua tab utama; All/Friends/Events filter; tidak ada circle/group. UI English, Mootz, ungu, mobile-first dan desktop.
- Dua foto depan/belakang menjadi satu momen; capture berurutan boleh. Tidak publish setengah jadi; upload fallback berlabel dan tidak eligible Meet/streak sesuai baseline.
- Meet: satu poster dan satu scanner, QR 60 detik, dua wallet berbeda, Accept terikat Offer, lokasi foreground sekali dan backend cek <=100 m dengan accuracy/staleness yang ditetapkan.
- Satu Meet sah = satu Dot offchain untuk dua peserta. Pasangan yang sama: satu per area ~200 m per hari WIB, maksimal lima per hari. Scan tidak otomatis membuat friendship atau daily post.
- Visibilitas Dot: dua peserta + teman poster yang berhak; bukan seluruh teman scanner. No-location tidak menjadi marker. Hide untuk semua; hanya hider dapat unhide; count tetap.
- Onchain hanya bila kedua action RECORD_MEET. OFFCHAIN_MEET ditolak contract. Dot tetap ada saat chain gagal/opt-out. Lock hanya setelah receipt. Lokasi privat dan URL media tidak ke chain/client map payload.
- Streak tampilan posting harian, Dots penanda Meet, tanpa mata uang/reward/Shop. Achievement/equip offchain; EventCollection gratis eligible, issuer-bound, cap nyata dan nontransferable.
- Map default OpenFreeMap, Satellite MapTiler pilihan pengguna; state/overlay/atribusi/fallback dipertahankan. MapTiler Free terbatas request dan ketentuan prototipe; bukan gratis tanpa batas.
- Gathering B membaca koleksi + count event langsung dari contract, tanpa DB/API data Mootz. Foto dan lokasi tidak menjadi permanen hanya karena Meet tersimpan onchain.
- QR/signature/GPS tidak membuktikan manusia unik atau kehadiran fisik pasti. Tidak ada NFT wajib per foto, sponsor cash campaign, marketplace, atau ticketing.

## Gate awal — diselesaikan INT-01 sebelum integrasi

1. Runtime/package manager/workspace, scripts per modul, API DTO/error/status, dan fixture nonpribadi dikunci mengikuti folder yang disetujui. Tetapkan runtime BE, framework/scope mobile, URL API, autentikasi lintas client, origin/CORS dan environment per modul. FE dapat memulai layout dengan fixture berlabel; jangan menyebut mock sebagai integrasi live.
2. Diaz dan Faaid menyepakati domain/types/encoding/hash/nonce, Meet ID, commitment foto dan deadline, lalu Wangsit memakai helper/test vector yang sama. Tidak ada salinan payload yang menyimpang.
3. Pisahkan validasi waktu Accept dari deadline pengiriman relayer. Signature EIP-712 saja tidak membuktikan waktu historis signing. INT-01 harus mendokumentasikan mekanisme backend/authorized relayer atau attestation yang dipilih sebelum SC-01/BE-03 diintegrasikan. Contract tidak diberi klaim verifikasi GPS.
4. Bekukan aturan event pada QR yang scanner-nya belum diketahui: Offer bertanda tangan tidak diubah diam-diam; kedua check-in diperiksa sebelum menerima event Meet. Jelaskan sumber eligibility dan trust boundary.
5. Tetapkan grid area ~200 m, ambang accuracy/staleness, masa relayer, kebijakan wallet, check-in dan claim. Nilai usulan tidak menjadi fakta runtime hanya karena masuk issue.

INT-01 menghasilkan docs/interfaces.md beserta contoh request/response, lokasi schema API publik di be/specs/, signing test vector di sc/specs/, ABI di sc/abi/, status/error dan catatan keputusan. Strategi distribusi artefak ke kedua client ditetapkan tanpa membocorkan modul server. File source/spec tersebut dibuat saat task implementasi dikerjakan, bukan oleh rencana ini.

## Urutan kerja dan dependensi

Dependencies pada issue adalah syarat integrasi/menutup task. Wangsit dapat memulai komponen dengan fixture setelah interface disepakati; Diaz dapat menulis unit tests tanpa deployment; Faaid dapat menyiapkan layanan dengan adapter test. Tulis status stub/mock pada issue agar tidak disalahartikan.

| Gelombang | Wangsit / FE | Faaid / BE | Diaz / SC | Checkpoint |
| --- | --- | --- | --- | --- |
| A. Fondasi | Shell Mootz, auth/onboarding dan kamera/QR spike | Scaffold, DTO/schema/auth/seed dan media privat | Payload/test vector, skeleton + negative tests dua contract | Dua HP dapat login; API contract dan digest seragam |
| B. Posting | Capture/review, Feed/detail, Map dengan fixture lalu API | Publish utuh, query berizin, streak/profile/Dot service | MeetRegistry dan EventCollection unit tests | Foto A tampil ke B yang berizin; outsider ditolak |
| C. Meet | QR→scan→preview→Approve→Dot, Your Dots dan frame | QR/location/rules atomik, opt-in, outbox/relay/status | Deploy testnet, ABI/address/receipt dan count | Dua HP membuat satu Dot; opt-out/failure/retry jujur |
| D. Scope lengkap | Social, Map/Satellite recovery, Event/claim/wear, Gathering B | Social API, check-in/claim issuer, reconciliation | Replay/cap/role smoke tests dan read independen | Koleksi/count dikenali tanpa API data Mootz |
| E. Integrasi | Mobile/desktop/focus/permissions | Data/access/recovery dan run demo | Chain evidence/count/supply | INT-02 mengisi matriks bukti dan bagian belum selesai |

Ini urutan kerja, bukan janji seluruh scope selesai dalam enam jam. Sisakan bagian akhir sprint untuk integrasi dua perangkat, bukan fitur baru. P1 dikerjakan setelah jalur utama stabil tetapi tetap scope yang disepakati; jangan menutup tracking atau menghapus fitur bila belum selesai. Prototipe parsial dilabeli jujur.

## Pemetaan requirement

| PRD | Task utama |
| --- | --- |
| ROV-01 | INT-01, BE-01, FE-01 |
| ROV-02 | BE-02, FE-01, FE-02, FE-03 |
| ROV-03/04 | BE-01, BE-02, FE-02, FE-03 |
| ROV-05/06 | BE-05, FE-06 |
| ROV-07 | BE-04, FE-02, FE-05 |
| ROV-08/09 | BE-03, FE-04 |
| ROV-10/11 | BE-04, FE-03, FE-04, FE-05 |
| ROV-12 | BE-01, BE-03, BE-07, SC-01, FE-01, FE-04, FE-05 |
| ROV-13 | SC-01, SC-03, BE-07, FE-04 |
| ROV-14 | BE-04, FE-05 |
| ROV-15 | BE-03, BE-06, FE-07 |
| ROV-16 | SC-02, SC-03, BE-06, BE-07, FE-07 |
| ROV-17 | BE-01, SC-03, FE-08 |
| ROV-18 | Semua task status/recovery dan INT-02 |

## Definition of done per issue

- Checklist scope dan acceptance pada issue selesai; ada bukti hasil, bukan checkbox yang ditandai karena kode sudah ditulis.
- Jalankan scripts yang benar-benar tersedia: test rules penting auth/media/expiry/replay/distance/limits/supply, lint/typecheck/build serta browser/Foundry sesuai area. Audit dependency bila menambahkan dependency. Catat PASS/FAIL/UNAVAILABLE/UNVERIFIED.
- UI memakai API yang disepakati; status backend dan receipt tidak ditimpa animasi. Data fixture berlabel dan tidak berisi foto/lokasi privat.
- Cantumkan commit atau PR, steps perangkat/jaringan dan keterbatasan di issue; review diff sebelum push. Tidak ada key atau dump private.
- Main harus tetap bisa dijalankan setelah scaffold. Owner utama hanya menutup issue setelah acceptance dan handoff ke consumer terpenuhi. Jika mengerjakan PR, tautkan issue; jangan memakai Closes sampai seluruh acceptance selesai.

## Cara memantau

GitHub issue state/label adalah sumber status live; TASKS.md menyimpan pembagian, dependency dan link tetap. Status: status:todo → status:in-progress → status:review → close issue bila Done; status:blocked hanya dengan alasan konkret dan dependency/link. Gunakan satu label status pada issue open. Hindari checklist status ganda yang tidak disinkronkan.

Tidak ada pekerjaan implementasi yang dimulai oleh pembuatan rencana ini. File desain lokal yang belum tracked tetap milik workspace; review handoff desain memakai dokumen/aset tracked, tidak menganggap file .pen atau referensi pribadinya sudah diunggah.
