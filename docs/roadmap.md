# Roadmap awal

Status: urutan kerja usulan, bukan pekerjaan selesai atau estimasi terjamin. Backend dan kontrak tersedia; frontend produk dan integrasi end-to-end belum selesai. Scope disepakati tetap ada di [PRD](../PRD.md).

Pembagian owner dan issue ada di [TASKS.md](../TASKS.md); urutan lintas FE/BE/SC, batas ownership, dan gate awal ada di [rencana pengerjaan tim](implementation-plan.md). Catat status implementasi berdasarkan verifikasi aktual; tabel slice berikut menjelaskan hasil produk.

| Slice | Hasil yang dapat ditinjau | Bukti selesai |
| --- | --- | --- |
| 0. Fondasi | Runtime/package manager, manifest/lockfile/scripts, dua akun demo, testnet/env/auth; spike scan QR dan typed-data signing di HP | Fresh setup; token invalid ditolak; scan QR + signing EIP-712 tanpa popup membingungkan terbukti di dua HP HTTPS; receipt wallet target |
| 1. Momen privat | Capture front/back, retake, upload utuh, Feed/Map, audiens/lokasi opsional (ROV-02..04) | Dua perangkat; upload parsial tidak publish; akun luar ditolak termasuk media langsung |
| 1a. Dua basemap | MapLibre: Map OpenFreeMap default dan Satellite MapTiler; selector, overlay/state, key dan fallback ([rencana peta](map-plan.md), ROV-02/04/11/18) | Dua mode pada HP/desktop; center/zoom/filter/panel/marker tetap; tidak duplikat; key/tile/kuota gagal bisa Use Map; atribusi benar; cek citra venue dan request aktual |
| 2. Streak | Streak profil dari post eligible pertama per hari (ROV-07) | Retry/parallel/batas hari tidak menggandakan; tanpa Dots/reward; tidak bergantung chain |
| 3. Meet | QR 60 detik (Meet Offer), preview terbatas, Meet Accept, cek jarak 100 m, satu Meet per pasangan per area per hari (maks. 5 per hari), Dot dan visibilitasnya (ROV-08..11) | QR expired, Accept setelah expiry, jarak > 100 m, akurasi buruk, QR dipakai ulang, "You already met here today", Meet ke-6 ditolak, Meet di area berbeda diterima, check-in acara kurang ditolak; upload galeri tidak eligible; Dot muncul di kedua HP; teman pemindai non-teman pembuat tidak melihat; hide hanya bisa di-unhide penyembunyi dan tampil Hidden di daftar; Dot tanpa lokasi tetap di kartu momen |
| 4. MeetRegistry onchain + opt-in | Contract, onboarding opt-in, relayer, gembok (ROV-12, ROV-13, ROV-18) | Satu signer berulang/Accept atas Offer berbeda/replay/aksi OFFCHAIN_MEET ditolak contract; hanya tercatat bila kedua RECORD_MEET; relay gagal tidak menghapus Dot; retry tanpa duplikat; jumlah Meet terbaca ulang |
| 5. Frames | Achievement unlock dari Dots, equip, konsistensi (ROV-14) | First Meet terbuka dari 1 Dot; frame sama di Map/Feed/profil setelah refresh; tidak ada jalur pembelian |
| 6. Interaksi sosial | Reusable selfie/reaction, komentar/root reply, draf/recovery (ROV-05, ROV-06) | Satu reaction aktif, satu tingkat reply, otorisasi pemilik/audiens |
| 7. Event & collection | Detail/tag, check-in, issuer/supply, claim gratis, equip/provenance (ROV-15, ROV-16) | Tag tidak membuka foto; illegal/duplicate/sold-out ditolak; claim hanya setelah check-in; nontransferable |
| 8. Gathering B | Halaman independen membaca koleksi dan jumlah Meet Workshop A (ROV-17) | Auth wallet/direct read; tanpa endpoint Mootz; nonholder dibedakan dari RPC error; tanpa koleksi tetap tampil jumlah Meet; Meet non-onchain tidak terhitung |
| 9. Demo lengkap | Responsif, English UI, loading/error/retry, reconciliation | Dua akun/perangkat; catat commit/deployment/tx dan hasil aktual |

Urutan dapat disesuaikan setelah spike signing/camera/QR. Selesai satu slice tidak berarti PRD selesai. Sprint sekitar enam jam berisiko tidak mencakup semuanya; fitur belum bekerja diberi status belum selesai, tanpa mengganti transaksi dengan animasi sukses.

## Gate integrasi

Kunci hash/encoding dan typed-data test vector Meet Offer dan Meet Accept, binding digest Offer, aksi RECORD_MEET/OFFCHAIN_MEET, deadline relayer terpisah dari 60 detik, expiry/nonce, satu catatan per Meet ID, supply cap (fixture Workshop A: 50) dan otorisasi issuer koleksi, transfer koleksi dinonaktifkan, dan admin authority. Uji aturan contract sebelum UI menjadi sumber kepercayaan.

## Gate demo

Gunakan fixture berlabel demo, periksa akses/media, jalankan dua akun/wallet, buktikan Meet, claim, dan equip dengan pembacaan ulang serta pengenalan independen Gathering B. Tulis hasil di [verifikasi](verification.md). URL tersedia belum menyatakan production-ready.
