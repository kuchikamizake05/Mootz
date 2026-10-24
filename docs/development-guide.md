# Panduan pengembangan awal

Status: source backend dan smart contract tersedia. Panduan [backend](../be/README.md) mencakup instalasi, migrasi, pengembangan, build, pengujian, dan perintah worker terpisah. Pemeriksaan contract dan persiapan deployment dijelaskan di [panduan smart contract](../sc/README.md). Frontend produk masih direncanakan. Deployment langsung dan penerimaan end-to-end belum diverifikasi.

## Persiapan

Struktur disetujui: Wangsit mengerjakan `fe/app/` dan `fe/web/`, Faaid `be/`, Diaz `sc/`. Source backend dan smart contract sudah tersedia; frontend produk masih direncanakan. Demo awal memakai web Next.js; framework dan cakupan mobile diputuskan pada INT-01. API bisnis tidak ditulis di FE.

1. Baca [PRD](../PRD.md), [keputusan](decisions.md), [onchain](onchain-design.md), dan [roadmap](roadmap.md).
2. Runtime, package manager, manifest, lockfile, dan scripts backend sudah ditetapkan di `be/`. Sepakati runtime/framework client, URL API, autentikasi client, allowed origins/CORS, dan konfigurasi environment tiap modul. Pilih dependency QR browser sesuai runtime client yang digunakan.
3. Spike awal di HP target lewat HTTPS: scan QR dengan kamera, kirim lokasi foreground, dan tanda tangan typed-data (EIP-712) tanpa popup wallet yang membingungkan atau biaya gas dari pengguna. Pilih jenis wallet/validasinya; session login tidak menggantikan tanda tangan Meet.
4. Siapkan database/media privat, authorization server, dan dua akun fixture. Uji penolakan akses sebelum memoles Feed/Map.
5. Kunci encoding/typed-data test vector Meet Offer dan Meet Accept dan aturan contract, lalu implementasikan slice lengkap dengan bukti di [verifikasi](verification.md).

## Konfigurasi

File root [.env.example](../.env.example) adalah inventaris rencana integrasi antarmodul dan tidak dibaca oleh backend. Konfigurasi lokal backend ada di [be/.env.example](../be/.env.example), dengan nilai awal untuk database lokal dan worker dalam keadaan nonaktif. Variabel publik dapat dibaca browser; key server, storage, relayer, dan issuer hanya boleh disimpan di environment server privat.

Jangan salin seluruh inventaris root ke FE. INT-01 menetapkan konfigurasi untuk client dan serah-terima antarmodul; setiap modul tidak membaca file root dan nama variabelnya belum tentu memakai awalan `NEXT_PUBLIC_` yang sama.

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
