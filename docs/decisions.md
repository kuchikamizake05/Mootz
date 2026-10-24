# Keputusan dan hal yang belum dikunci

Pembaruan 24 Oktober 2026: pengguna menyetujui lokasi teman otomatis selama aplikasi foreground terlihat, update/polling 5 detik, default aktif dengan izin browser, dimatikan dari profil. Accepted friends saja, area perkiraan 200m, lease 60 detik, offchain tanpa riwayat pergerakan. Ini memperluas scope sebelumnya; pelacakan background tetap tidak diizinkan. Lihat [friend location](friend-location.md).

Sumber perilaku produk: [PRD](../PRD.md). Kontrak interface: [baseline integrasi](int-01-baseline.md).

## Disepakati

- Foto disimpan di Supabase Storage privat. API PostgreSQL/PostGIS memeriksa audiens sebelum memberikan URL bertanda tangan singkat. Lihat [panduan storage](supabase-storage-setup.md).

- Produk dan repository: Mootz. Wangsit menangani frontend, Faaid backend, dan Diaz smart contract. Web menjadi target demo pertama; scope mobile belum dipilih.
- Mootz aplikasi sosial terinspirasi BeReal + Zenly/Bump: dual photo, Map/Feed, selfie reaction, komentar/reply, frame, profil. Narasi pitch: Zenly ditutup dan riwayat pengguna hilang; Mootz membuat koneksi nyata milik pengguna selamanya.
- All adalah gabungan konten berizin; Map dan Feed dua tab utama. Posting langsung ke teman; circle/group tidak termasuk scope. Event tetap ada.
- Basemap: MapLibre, Map default dari OpenFreeMap, Satellite dari MapTiler. Selector Map style menjaga kamera/filter/overlay/pilihan dan bukan tab utama baru. MapTiler dimuat saat Satellite dipilih; key kosong/tile gagal/kuota habis memakai status dan fallback Use Map. [Rencana peta](map-plan.md) mengatur perilaku basemap; belum diimplementasikan.
- Streak menunjukkan konsistensi posting harian tanpa reward, Dots, atau milestone.
- **Meet**: setelah momen terbit, pembuat menampilkan QR berlaku **60 detik** berisi Meet Offer yang ditandatangani wallet-nya; pemindai menandatangani Meet Accept yang mengikat digest Offer dan wallet pemindai sebelum QR kedaluwarsa; QR memberi akses preview momen itu saja walau pemindai bukan teman; kedua perangkat mengirim lokasi foreground sekali dan backend menerima jika jarak **≤ 100 meter**. Satu Meet dua orang.
- **Dots adalah tanda Meet di peta**, bukan mata uang: satu Meet sah = satu Dot untuk kedua peserta, disimpan di database, tidak ditransfer atau dibelanjakan. Tidak ada penggabungan Dot.
- Dot terlihat oleh kedua peserta dan teman pembuat momen yang berhak melihat momen; tidak oleh teman pemindai yang bukan teman pembuat atau publik. Tampil sebagai area ±200 meter, hanya bila lokasi momen dibagikan (tanpa itu tetap tampil di kartu momen dan daftar Dots). Peserta dapat menyembunyikannya dari peta untuk semua penonton; hanya yang menyembunyikan yang dapat menampilkannya kembali, dan Dot tetap terhitung di profil.
- **Opt-in onchain sekali saat onboarding**, default nyala, dapat diubah di profil untuk Meet berikutnya. Meet tercatat onchain hanya bila kedua peserta opt-in saat menandatangani; ditegakkan lewat aksi `RECORD_MEET` vs `OFFCHAIN_MEET` di Offer/Accept. Jika tidak, Dot tetap sah di Mootz dengan label Not saved onchain tanpa menyebut siapa. Dot onchain diberi ikon gembok.
- Onchain hanya **MeetRegistry** (dua tanda tangan diverifikasi contract; pasangan wallet, waktu, event ID opsional, commitment foto; tanpa lokasi) dan **koleksi acara** (issuer, supply cap, claim gratis, nontransferable).
- Frame pencapaian terbuka dari Dots dan disimpan offchain. Tidak ada Shop, pembelian, daily/shared reward, Welcome Drop, atau drop Dots di peta.
- Halaman penyelenggara lain (Demo Gathering B) membaca kepemilikan koleksi dan jumlah Meet per event langsung dari contract, tanpa database Mootz.
- Foto/Meet/consent tidak menjamin manusia unik, keaslian foto, atau kehadiran fisik pasti. Contract tidak memverifikasi lokasi.
- Foto/lokasi/Dots privat offchain. Event tag tidak memperluas audiens. UI English; mobile-first dengan desktop, ungu tua/muda dan map terang.

## Organizer terbatas — 24 Oktober 2026

Pembuatan event melalui aplikasi hanya untuk akun yang diberi akses operator.
Backend menetapkan pemilik dari token; organizer mencatat check-in hanya pada
event miliknya. Pencabutan akses menghentikan pengelolaan tanpa menghapus event.
Penerbitan collection tetap oleh admin contract; command operator menyimpan
mapping setelah memverifikasi receipt finalized dan readback. Lihat
[alur organizer](organizer-events.md). Registrasi organizer publik, tiket,
pembayaran dan dashboard penerbit lengkap tetap di luar scope.

## Usulan yang perlu dikunci

| Keputusan | Usulan saat ini | Bukti berikutnya |
| --- | --- | --- |
| Hari server | Asia/Jakarta, 00.00 WIB | Uji batas hari |
| Batas Meet | Satu Meet per pasangan per area ±200 m per hari server, maksimal 5 per pasangan per hari; "You already met here today" / "Daily Meet limit reached". Frame Together tetap 10 Dots | Unique key pasangan+area+hari, hitungan harian, dan pesan UI |
| Event ID pada Meet | Hanya bila momen bertag acara dan kedua peserta sudah check-in oleh penyelenggara | Uji scan oleh peserta belum check-in |
| Masa buka QR | Dari momen sendiri pada hari yang sama | Uji Moment posted dan momen lama |
| Fixture koleksi | Demo Workshop A, cap 50 | Supply cap semua jalur mint |
| Area tampilan Dot | Sel ±200 meter | Pilihan grid/indeks dan uji privasi |
| Akurasi lokasi | Tolak bila akurasi GPS lebih buruk dari ambang tertentu | Uji di dalam ruangan pada dua HP |
| Ambang frame | First Meet 1, Together 10, Social Butterfly 5 teman berbeda | Fixture demo |
| Deadline pencatatan | Relayer mengirim dalam beberapa menit setelah scan | Uji relayer, retry, dan expiry |
| Gallery fallback | Berlabel upload, tidak eligible streak dan Meet | Bedakan capture/upload tanpa mengklaim anti-fraud sempurna |
| Koleksi | ERC-1155, claim gratis eligible, transfer dinonaktifkan | Kebijakan final dan semua jalur transfer/mint |
| Stack | Next.js, Privy, Supabase, MapLibre/OpenFreeMap + MapTiler Satellite, viem, Solidity/Foundry, pemindai QR web | Versi, lockfile, kamera/QR/signing pada perangkat nyata |
| Jaringan | Monad testnet demo | RPC/chain ID aktual, explorer, deployment proof |
| Sponsorship | Relayer membayar gas Meet dan claim | Provider/anggaran/retry/keys; gas belum diasumsikan gratis |

## Belum diputuskan atau diverifikasi

Jenis wallet, retensi lokasi verifikasi, finality, metadata hosting, admin/upgrade/pause, deployment provider, retensi/hapus akun, telemetry, lisensi kode, dan moderasi pengguna nyata. Tidak ada partnership, audit, benchmark, validasi retensi, atau manfaat acara nyata yang diklaim.

## Mainnet — 24 Oktober 2026

Pengguna meminta migrasi aplikasi ke Monad mainnet (143). Deployment contract yang sudah ada dipakai kembali; konfigurasi backend/frontend dan worker mengikuti chain terpilih. Data/signature testnet dipertahankan. Deployment Vercel ditangani teman pengguna. Detail dan batas verifikasi: [migrasi mainnet](mainnet-migration.md).
