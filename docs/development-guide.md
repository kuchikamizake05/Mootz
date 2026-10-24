# Panduan pengembangan awal

Status: dokumentasi saja (PRD, brief, desain). Belum ada aplikasi untuk di-install/dijalankan atau contract untuk dideploy. Perintah runtime ditambahkan setelah manifest, lockfile, dan scripts tersedia serta diuji.

## Persiapan

Struktur disetujui: Wangsit mengerjakan `fe/app/` dan `fe/web/`, Faaid `be/`, Diaz `sc/`. Folder sudah berisi README; belum ada source atau runtime. Demo awal memakai web Next.js; framework/scope mobile dan runtime backend terpisah diputuskan pada INT-01. API bisnis tidak ditulis di FE.

1. Baca [PRD](../PRD.md), [keputusan](decisions.md), [onchain](onchain-design.md), dan [roadmap](roadmap.md).
2. Kunci runtime/package manager/workspace, manifest/lockfile/scripts tiap modul, runtime BE, dan framework/scope mobile. Sepakati API URL, autentikasi kedua client, allowed origins/CORS, dan environment per modul. Dependency termasuk pemindai QR web dipilih sesuai runtime nyata; stack pada README masih proposal.
3. Spike awal di HP target lewat HTTPS: scan QR dengan kamera, kirim lokasi foreground, dan tanda tangan typed-data (EIP-712) tanpa popup wallet yang membingungkan atau biaya gas dari pengguna. Pilih jenis wallet/validasinya; session login tidak menggantikan tanda tangan Meet.
4. Siapkan database/media privat, authorization server, dan dua akun fixture. Uji penolakan akses sebelum memoles Feed/Map.
5. Kunci encoding/typed-data test vector Meet Offer dan Meet Accept dan aturan contract, lalu implementasikan slice lengkap dengan bukti di [verifikasi](verification.md).

## Konfigurasi

[.env.example](../.env.example) berisi nama variabel usulan, antara lain `NEXT_PUBLIC_MEET_REGISTRY_ADDRESS`, `NEXT_PUBLIC_EVENT_COLLECTION_ADDRESS`, `RELAYER_PRIVATE_KEY`, dan `EVENT_ISSUER_SIGNER_PRIVATE_KEY`. Isi environment lokal/hosting saat scaffold memerlukannya. Public variables terbaca browser; server/service-role key, relayer key, issuer signer key, dan provider secret hanya di server.

File root tersebut adalah inventaris; jangan menyalin seluruhnya ke FE. INT-01 menetapkan contoh konfigurasi browser di `fe/web`, server-only di `be`, dan konfigurasi client mobile sesuai framework yang akhirnya dipilih. Tidak diasumsikan semua modul membaca environment root atau memakai awalan `NEXT_PUBLIC_` yang sama.

RPC dan chain ID contoh diverifikasi saat setup; address contract kosong karena deployment belum ada. Jangan mengirim transaksi ke address tebakan atau mencampur jaringan. Jangan mencetak environment ke log/issue.

## Integrasi Map/Satellite

Ikuti [rencana peta](map-plan.md): MapLibre dengan Map default OpenFreeMap dan Satellite dari MapTiler. `NEXT_PUBLIC_MAPTILER_API_KEY` sengaja terbaca browser dan dibatasi origin di provider, bukan kredensial server. Isi lokal saat scaffold siap; jangan commit key aktual. MapTiler hanya dimuat ketika Satellite dipilih. Kuota Free dihitung per request untuk MapLibre langsung, bukan per pengunjung/sesi.

Simpan state kamera/filter/momen/Dot/panel terpisah dari style; pasang ulang overlay/handler setelah pergantian dan cegah marker duplikat. Key kosong atau tile/kuota gagal menampilkan status dan Use Map; selector harus mencerminkan basemap aktual. Pertahankan atribusi dan hanya kirim lokasi tampilan yang diizinkan ke client. Periksa citra venue secara visual serta network/request di dua mode sebelum mengklaim integrasi selesai.

## Media dan UI

Uji kamera, scan QR, dan lokasi pada HTTPS di HP. Desktop preview belum membuktikan capture dua sisi atau scan. Upload fallback berlabel dan eligible sesuai kebijakan. Kedua aset lengkap sebelum publish dan commitment foto tidak berubah setelah terikat payload Meet. Mengetahui ID/storage key tidak berarti berhak membaca foto.

Gunakan [design handoff](design/README.md) untuk English UI, navigasi, dan state (termasuk state QR dan Dot bergembok). PNG referensi asli tetap lokal; jangan menyalin nama/lokasi/foto pribadi dari screenshot menjadi fixture.

## Contract dan integrasi

Foundry/Solidity dan viem diusulkan, belum ada toolchain/config. Hanya dua contract yang dirancang: MeetRegistry (verifikasi Meet Offer pembuat dan Meet Accept pemindai (mengikat digest Offer), dua signer berbeda, keduanya aksi RECORD_MEET (OFFCHAIN_MEET ditolak), nonce, deadline relayer terpisah dari 60 detik; catatan pasangan wallet/waktu/event ID opsional/commitment bersalt, hitungan Meet per wallet dan per wallet+event; tanpa lokasi) dan koleksi acara (nontransferable, issuer berotorisasi, supply cap, fixture Workshop A bercap 50, claim gratis sekali). Tidak ada contract untuk Dots, saldo, grant, atau kosmetik; Dots dan frame pencapaian di database.

Gunakan satu spesifikasi dan test vector untuk ABI/payload frontend/backend/contract. Cek jarak dilakukan backend, bukan contract. Verifikasi receipt dan pembacaan ulang sebelum status onchain recorded atau ownership berhasil.

Schema API publik direncanakan di `be/specs/`, signing specification/test vector di `sc/specs/`, dan ekspor ABI/address di `sc/abi/`. Diaz menghasilkan artefak contract, Faaid menjaga API, Wangsit mengonsumsi dari kedua client. Metode code generation/distribusi dikunci di INT-01; jangan mengimpor modul server privat ke bundle frontend atau mengedit ABI manual.

Outbox/retry relayer memakai Meet ID yang sama. Server memverifikasi identitas, audiens, jarak, batas Meet per pasangan (satu per area per hari, maksimal 5 per hari), dan check-in acara; contract menegakkan tanda tangan, nonce, dan batas waktu. Halaman Gathering B tidak memakai database Mootz.

Ikuti [CONTRIBUTING](../CONTRIBUTING.md) dan [AGENTS](../AGENTS.md). CI baru disiapkan berdasarkan scripts/runtime nyata. Saat dependency ditambahkan, jalankan audit yang sesuai. Review diff sebelum commit/push dan bedakan PASS, FAIL, UNAVAILABLE, UNVERIFIED.
