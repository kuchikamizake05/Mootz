# Desain onchain awal

Status: contract source, ABI, vectors and backend protocol adapters are available. Public Monad deployment and client acceptance require separate verification. Requirement: ROV-12, ROV-13, ROV-16, ROV-17 in [PRD](../PRD.md).

## Yang masuk chain

Hanya dua bagian. Dots, frame pencapaian, equip, streak, dan Shop tidak ada di chain.

| Bagian | Alasan dan aturan |
| --- | --- |
| MeetRegistry | Contract memverifikasi Offer dan Accept; mencatat pasangan wallet, waktu, event ID opsional, dan commitment foto bersalt, hanya bila Offer dan Accept sama-sama RECORD_MEET. Dapat dibaca ulang pihak lain |
| Koleksi Event | Issuer berotorisasi, suplai terbatas, claim gratis sekali, ownership dapat diperiksa layanan lain |

Foto, selfie reaction, komentar, koordinat (verifikasi maupun tampilan), pertemanan, Dots, dan status frame tetap offchain. Tidak ada NFT wajib per foto. Blockchain tidak membuktikan wajah, manusia unik, keaslian foto, atau kehadiran fisik. Contract tidak memverifikasi lokasi; cek jarak 100 meter (ROV-09) dilakukan backend.

## Meet Offer dan Meet Accept (EIP-712)

Domain: nama/versi protocol, chain ID, verifying contract (MeetRegistry). Dua pesan bertipe terpisah.

**Meet Offer** (ditandatangani poster, dibawa di QR): action, meetId, momentId, commitment foto bersalt, wallet poster, nonce, issuedAt, expiry = issuedAt + 60 detik, eventId opsional. **Meet Accept** (ditandatangani scanner sebelum QR kedaluwarsa): action, digest Offer, wallet scanner. Encoding, ukuran field, dan test vector dikunci sebelum integrasi.

Commitment foto mengikat digest front/back dalam urutan tetap, moment ID, versi, dan salt acak atas byte aset immutable yang ditinjau; swap tampilan tidak mengubah pasangan. Salt disimpan privat offchain. Commitment tidak membuat peserta anonim karena pasangan wallet tetap terlihat.

eventId hanya dimasukkan bila momen bertag acara itu dan kedua peserta sudah check-in oleh penyelenggara pada waktu acara (demo: fixture/halaman penyelenggara). Scanner yang belum check-in ditolak dengan "Check in to Demo Workshop A first".

## Urutan tanda tangan

1. Setelah momen terbit, poster membuka QR dari layar Moment posted atau momennya sendiri (usulan: momen hari yang sama). Poster menandatangani Offer; QR membawa Offer + tanda tangan, berlaku 60 detik, satu scanner. "Terlihat di foto" adalah norma sosial, tidak diverifikasi sistem. Scanner tidak perlu punya momen sendiri; Meet tidak membuat pertemanan; QR hanya membuka preview momen itu walau scanner bukan teman poster.
2. Scanner melihat preview. Aplikasi memeriksa media yang ditampilkan cocok dengan commitment. Scanner dapat menolak sebelum menandatangani.
3. Scanner menandatangani Accept (mengikat digest Offer) sebelum QR kedaluwarsa.
4. Kedua perangkat mengirim lokasi foreground sekali. Backend menerima hanya jika jarak ≤ 100 m dan akurasi memadai (ROV-09). Pasangan yang sama hanya boleh satu Meet per area ±200 m per hari server (Asia/Jakarta), maksimal 5 per hari; scan di area yang sama ditolak "You already met here today", Meet ke-6 ditolak "Daily Meet limit reached". Batas ini ditegakkan backend, bukan contract.
5. Jika kedua peserta opt-in (tanda tangan membawa RECORD_MEET), relayer mengirim Offer dan Accept ke MeetRegistry. Jika tidak, Meet tetap sah sebagai Dot di Mootz dan tidak dikirim.

Masa berlaku QR (60 detik) hanya mengatur jendela Offer dan Accept. Deadline pencatatan untuk relayer adalah kontrol terpisah: usulan beberapa menit setelah scan, sehingga retry tetap mungkin setelah QR kedaluwarsa. Nilainya belum dikunci dan perlu uji relayer.

## Pemeriksaan MeetRegistry

Contract memverifikasi:

- tanda tangan Offer (poster) dan Accept (scanner), dua signer berbeda (satu signer dua kali ditolak);
- kedua action == RECORD_MEET; OFFCHAIN_MEET ditolak;
- Accept mengikat digest Offer yang sama (payload tidak cocok ditolak);
- domain dan chain ID cocok;
- nonce belum dipakai (replay ditolak);
- deadline relayer belum lewat (terpisah dari expiry QR 60 detik);
- Meet ID belum tercatat: satu catatan per Meet ID.

Contract menyediakan jumlah Meet per wallet dan per wallet+event. Tidak ada lokasi, URL media, nama, atau caption dalam calldata, storage, maupun log. Jenis wallet yang didukung (termasuk contract wallet) diputuskan dan diuji sebelum UI mengklaim kompatibilitas.

## Opt-in dan sifat permanen

Opt-in (ROV-12) ditegakkan lewat tanda tangan, bukan hanya backend: peserta dengan opt-in nyala menandatangani action RECORD_MEET; yang mati menandatangani OFFCHAIN_MEET, yang ditolak contract. Karena itu, bahkan client yang dimodifikasi tidak dapat mencatat Meet onchain tanpa kedua peserta opt-in. Nilai yang berlaku adalah setting masing-masing peserta saat ia menandatangani; perubahan hanya untuk Meet berikutnya. UI menampilkan "Not saved onchain" tanpa menyebut siapa yang mematikan. Hal ini tidak mencegah pihak yang tidak opt-in membocorkan pertemuan lewat cara lain.

Catatan final tidak dapat dihapus dan tidak ada revocation di scope awal. Siapa pun dapat melihat wallet mana yang bertemu dan kapan; foto dan lokasi tetap privat. Mematikan opt-in, menyembunyikan Dot, atau menghapus foto tidak menghapus catatan lama. Dot onchain diberi ikon gembok.

## Koleksi Event

Usulan ERC-1155, nontransferable (semua jalur transfer dinonaktifkan; kebijakan final dikunci sebelum implementasi). Issuer/signer berotorisasi, supply cap berlaku pada semua jalur mint, satu wallet claim sekali per koleksi (fixture: Demo Workshop A, cap 50), gratis setelah eligibility check-in dari penyelenggara (ROV-15/16). Duplicate, expired, dan sold-out ditolak. Tidak ada mint otomatis dari Meet. Relayer membayar gas claim (usulan).

Metadata publik memuat penerbit, asal Demo Workshop A, dan aset koleksi tanpa foto privat. Koleksi dapat dipasang sebagai frame; status equip tetap offchain.

## Pengenalan independen (Demo Gathering B)

Halaman penyelenggara lain mengautentikasi penguasaan wallet, lalu membaca kepemilikan koleksi Workshop A dan jumlah Meet per wallet+event Workshop A langsung dari contract lewat RPC, bukan database Mootz (ROV-17). UI membedakan nonholder dari RPC error. Wallet tanpa koleksi bukan alumni, tetapi jumlah Meet tetap ditampilkan. UI menyatakan secara umum bahwa Meet yang tidak disimpan onchain tidak terhitung. Layanan lain tetap harus memilih mengintegrasikannya.

## Kontrol dan bukti

Uji: wrong signer/domain/chain, satu signer dua kali, payload mismatch (Accept dengan digest Offer lain), action OFFCHAIN_MEET, replay/nonce, expired, duplicate Meet ID, issuer ilegal, duplicate claim, dan supply cap semua jalur mint. Dokumentasikan admin authority, rotasi issuer, pause, dan upgrade policy sebelum deployment.

Kunci relayer dan issuer hanya di server, tidak di browser atau repo. Batas yang jujur: dua wallet bukan dua manusia; satu orang dengan dua HP masih dapat memalsukan Meet; lokasi diverifikasi backend, bukan contract; foto tidak permanen; pasangan wallet terlihat publik. Tidak ada klaim audit atau anti-Sybil.

Rujukan primer: [EIP-712](https://eips.ethereum.org/EIPS/eip-712), [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155), [dokumentasi Monad](https://docs.monad.xyz/). Offer/Accept Mootz di atas tetap proposal yang perlu dibuktikan.
