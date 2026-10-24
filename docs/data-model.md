# Model data awal

Status: migration identitas/preferences/friendships/events/wallet challenge/moments/media, komentar, check-in Event dan selfie/reactions tersedia di `be/migrations/` dan diuji pada PostgreSQL/PostGIS lokal. Streak dibaca dari hari publikasi, tanpa tabel counter tersendiri. Tabel Meet/Dot/frame/outbox berikut masih usulan; belum ada ABI atau contract aktif. Nama tabel dapat disesuaikan tanpa mengubah [invariant produk](../PRD.md).

## Data aplikasi privat

| Entitas usulan | Data inti dan batas |
| --- | --- |
| users | ID akun stabil, provider subject unik, display name; tanpa private key |
| wallet_bindings | Akun, chain, wallet, periode aktif; ganti wallet tidak membuat akun baru |
| friendships | Dua akun, status; fixture memakai hubungan timbal balik. Bukan circle/group |
| moments | Root ID stabil, author, publication timestamp/day, audience, optional event/location, state |
| media_assets | Owner, role front/back, private storage key, digest, capture/upload label, processing state |
| selfie_library | Akun, aset privat, lifecycle; reaction lama mempertahankan snapshot aset yang digunakan |
| reactions | Unique akun+momen, reaction asset snapshot; satu reaction aktif |
| comments | Author, moment, parent root nullable, text/deletion state; satu tingkat reply |
| daily_publications | Unique akun+publication day; post eligible pertama, sumber streak. Hanya tampilan, tanpa Dots |
| meet_qr_sessions | Moment, poster, Meet Offer + tanda tangan poster (action RECORD_MEET/OFFCHAIN_MEET), nonce, issued_at, expires_at (= +60 detik), scanner terikat (nullable, satu), status active/used/expired; memberi preview terbatas satu momen |
| meets | Meet ID unik, moment, poster, scanner, Offer digest, Offer dan Accept beserta action masing-masing, server day,  status (signed, verified, rejected), lokasi verifikasi per pihak (koordinat privat), jarak terhitung, akurasi, alasan tolak, onchain status (not_saved/pending/recorded/failed), tx hash, deadline |
| dots | Tepat satu per Meet (unique meet_id), kedua akun, sel area tampilan ±200 m, hidden flag + hidden_by (hanya akun itu yang dapat membatalkan), status onchain (ikon gembok). Bukan saldo; tanpa penggabungan |
| onchain_preferences | Unique akun, nilai opt-in saat ini (default nyala), tanda onboarding selesai; riwayat perubahan terpisah (akun, nilai lama/baru, timestamp) agar nilai saat Meet dapat dibuktikan |
| achievement_frames | Katalog frame: kode, nama, aturan unlock (First Meet 1 Dot, Together 10, Social Butterfly 5 teman berbeda; usulan), aset publik |
| frame_unlocks | Unique akun+frame, waktu unlock, sumber (Dots/koleksi Event) |
| equipped_frame | Satu baris per akun: frame aktif, harus sudah unlocked |
| events / organizers | Penyelenggara, waktu, tempat, informasi publik, authorized issuer mapping |
| event_eligibility | Unique akun+collection, alasan check-in/verifikasi, expiry, verifier |
| collection_catalog | Chain/contract/item ID, issuer, event asal, aset publik, cap, policy; cache bukan sumber ownership |
| chain_projection | Receipt, block reference, status Meet dan ownership koleksi terakhir; dapat dibangun ulang |

## Catatan di chain

MeetRegistry menyimpan atau mengemit catatan Meet (pasangan wallet, waktu, event ID opsional, commitment, nonce terpakai, hitungan per wallet dan per wallet+event). Koleksi Event menyimpan issuer/supply/claim. Pilihan storage versus event/indexer ditentukan saat desain contract. Tidak ada tabel atau contract untuk Dots, frame, atau equip: semuanya offchain. Jangan menaruh URL foto, lokasi, atau nama di event atau calldata.

Nontransferability koleksi perlu ditegakkan pada semua jalur mint/transfer. Standar token saja tidak menetapkan kebijakan produk.

## Invariant sebelum migration

- Pasangan foto lengkap sebelum publikasi. Role front/back unik per momen; file yang terikat commitment Meet tidak diganti diam-diam.
- Daily unik akun+hari. Streak naik maksimal sekali per akun per hari server (Asia/Jakarta) dan tidak menghasilkan Dots atau hak apa pun.
- QR session dipakai oleh paling banyak satu scanner dan tidak diterima setelah expires_at. Scan QR teman tidak mengisi daily_publications.
- Satu Meet = dua akun berbeda dengan dua wallet berbeda. Meet ID dan nonce unik; unique (pasangan akun terurut, sel area verifikasi ±200 m, server day Asia/Jakarta) pada Meet sah, dan maksimal 5 Meet sah per pasangan per server day; pelanggaran ditolak. Meet tanpa jarak ≤ 100 m dan akurasi memadai tidak pernah menjadi Dot.
- Satu Meet sah = satu Dot untuk kedua peserta; tidak ada penggabungan. Dot tanpa lokasi momen yang dibagikan tidak ke peta, tetap di kartu momen dan daftar Dots dengan audiens sama.
- Visibilitas Dot: kedua peserta dan teman poster yang berhak melihat momen; bukan teman scanner yang bukan teman poster. Muncul di peta hanya bila lokasi momen dibagikan; koordinat tampilan hanya sel area. Hidden flag menyembunyikan dari peta untuk semua penonton; hanya hidden_by yang dapat membatalkan; Dot tetap terhitung dan tampil sebagai Hidden di daftar Dots kedua peserta.
- Action tanda tangan tiap peserta (RECORD_MEET bila opt-in, OFFCHAIN_MEET bila tidak) diambil dari onchain_preferences saat ia menandatangani; Meet dikirim onchain hanya bila keduanya RECORD_MEET. UI tidak menyebut siapa yang mati. Gagal onchain tidak menghapus Dot; perubahan setelahnya tidak menarik catatan yang sudah final.
- Frame unlock diturunkan dari Dots/koleksi, unik akun+frame; equipped_frame hanya menunjuk frame yang dimiliki.
- Claim koleksi gratis punya uniqueness/cap sendiri; tidak mengikuti Dots dan tidak otomatis dari Meet.
- Event tag tidak memberi akses media. Preview QR hanya untuk satu momen (walau scanner bukan teman) dan tidak membuat friendship. Event ID di Offer hanya bila momen bertag acara dan kedua akun check-in. Upload galeri tidak eligible streak maupun Meet. Fixture koleksi Demo Workshop A cap 50.

## Penghapusan dan riwayat

Penghapusan media mengikuti kebijakan yang harus ditentukan sebelum pengguna nyata. Catatan Meet onchain tidak dapat dijanjikan hilang. Retensi lokasi verifikasi dan tanda tangan, masa hidup sesi QR, binding identitas, dan hapus akun memerlukan keputusan operasional tersendiri. Gunakan fixture tanpa informasi pribadi untuk demo.
