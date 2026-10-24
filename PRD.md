# Mootz: Product Requirements Document

Status: spesifikasi awal; seluruh requirement aplikasi masih **belum diimplementasikan**. Requirement di sini adalah perilaku yang dituju, bukan klaim fitur tersedia. Parameter yang diberi label usulan tetap perlu divalidasi.

## 1. Ringkasan dan hipotesis

Mootz adalah aplikasi sosial Map + Feed untuk berbagi foto harian depan-belakang dengan teman dan membuktikan pertemuan langsung. Inspirasinya BeReal (foto dua arah) serta Zenly/Bump (peta sosial bareng teman).

Narasi pitch:

> Zenly died and took your memories with it. Mootz makes your real-life connections yours forever.

Snap menutup Zenly pada 2023 dan riwayat penggunanya ikut hilang. Mootz mencatat Meet yang disetujui dua wallet di Monad, sehingga riwayat pertemuan dan koleksi acara tidak bergantung pada server Mootz dan dapat dibaca pihak lain. Foto tetap privat di luar chain dan tidak ikut abadi.

Hipotesis: foto teman dengan konteks tempat menarik untuk dibuka; bukti ketemu langsung lebih bermakna daripada tag jarak jauh; tanda Meet di peta dan frame pencapaian memberi alasan untuk bertemu lagi; acara berulang membantu memulai penggunaan. Semua hipotesis perlu diuji dengan pengguna. Tidak ada validasi retensi atau bisnis yang diklaim sudah selesai.

Pengguna awal: mahasiswa, teman-teman, serta peserta workshop, seminar, festival, atau gathering. Persona diwakili peran pembuat momen, teman yang scan QR, dan penyelenggara; tidak digunakan identitas atau statistik pengguna fiktif sebagai bukti pasar.

## 2. Tujuan dan scope

Tujuan demonstrasi adalah satu alur dua akun/perangkat: posting harian, Meet lewat scan QR yang muncul sebagai Dot di kedua HP, frame pencapaian terbuka dan dipakai, klaim koleksi acara, lalu pengenalan di halaman penyelenggara lain yang membaca contract langsung. Target teknis terpenting: Meet hanya tercatat onchain bila contract memverifikasi Offer dan Accept yang saling terikat dari dua wallet berbeda yang sama-sama opt-in.

Seluruh kamera dua arah, selfie reaction, reply komentar, streak profil, Map/Feed, Meet, Dots, frame pencapaian, Event, dan koleksi acara masuk arah produk. Jika sprint tidak cukup, hasil disebut prototipe parsial dan keterbatasannya dicatat.

Di luar scope awal: Dots sebagai mata uang atau poin, Shop dan pembelian kosmetik, daily/shared reward, Welcome Drop, drop Dots di peta, hadiah uang dari sponsor atau pool hadiah Meet, toples/saldo bersama, konfirmasi lewat undangan jarak jauh, circle/grup, bonus milestone streak, NFT untuk setiap foto, pengenalan wajah/biometrik, kepastian manusia unik, Meet lebih dari dua orang sekaligus, banyak penulis mengunggah ke satu album, marketplace, trading item, sistem tiket, Event CMS, global place search, dan pelacakan lokasi di latar belakang.

## 3. Requirement fungsional

| ID | Kebutuhan | Kriteria penerimaan inti |
| --- | --- | --- |
| ROV-01 | Identitas, pertemanan, onboarding | Akun terautentikasi dipetakan ke wallet yang stabil. Posting langsung ke teman; dua akun demo bisa disiapkan tanpa mengklaim discovery/contacts sudah ada. Onboarding menampilkan pengaturan opt-in onchain (ROV-12) sekali. |
| ROV-02 | All, Map, Feed dan basemap | All hanya menggabungkan konten berizin. Map/Feed memakai ID momen, filter, komentar, reaction, dan Dot sama. Map style memilih Map (default, OpenFreeMap) atau Satellite (MapTiler), bukan tab utama baru. Pergantian menjaga center/zoom, filter, overlay, dan panel/momen terpilih; marker tidak hilang/duplikat. Mode dijaga selama sesi. Loading, key kosong, kegagalan tile/kuota, dan fallback Use Map jelas; atribusi tetap terlihat. |
| ROV-03 | Capture dua arah | Dua foto depan/belakang tersimpan dalam satu momen; capture berurutan boleh. Gagal satu upload tidak menerbitkan pasangan setengah jadi. Retake per sisi dan swap presentasi tersedia. Upload galeri diberi label dan tidak eligible untuk streak maupun Meet (usulan). |
| ROV-04 | Lokasi dan audiens | Lokasi momen opsional. Post tanpa lokasi tetap ada di Feed. Backend menegakkan pertemanan/izin; event tag dan marker tidak membuka foto privat. |
| ROV-05 | Selfie reaction | Library selfie privat dan dapat digunakan ulang. Satu reaction aktif per akun+momen; ganti/hapus tidak menambah jumlah atau merusak foto pada reaction lama. |
| ROV-06 | Komentar | Root dan satu tingkat reply, draf terjaga saat gagal, akses ditolak di luar audiens. Hanya pemilik bisa menghapus; root dengan replies menyisakan placeholder. |
| ROV-07 | Streak profil | Post eligible pertama per akun+hari server menaikkan streak maksimal sekali. Streak hanya tampilan konsistensi: tanpa Dots, reward, claim, atau bonus milestone. Tidak menunggu teman atau chain. |
| ROV-08 | Meet lewat scan QR | Setelah momen terbit, pembuat yang memotret orang yang terlihat di foto membuka QR Meet dari layar Moment posted atau momennya sendiri (usulan: momen hari yang sama). QR berlaku 60 detik sejak terbit, berisi **Meet Offer** yang ditandatangani wallet pembuat saat QR dibuka (issuedAt = waktu tanda tangan; QR baru = Offer baru), dan dipakai satu pemindai. Pemindai melihat preview momen tersebut saja (QR memberi akses preview terbatas walau pemindai bukan teman pembuat), lalu menandatangani **Meet Accept** yang mengikat digest Offer dan wallet pemindai sebelum QR kedaluwarsa. Pemindai tidak perlu memiliki momen sendiri, dan Meet tidak otomatis membuat pertemanan. Syarat "terlihat di foto" adalah norma sosial yang dinyatakan kedua pihak, bukan hal yang diverifikasi sistem. Satu Meet = dua orang; tag tanpa scan bukan Meet. Pasangan yang sama boleh Meet beberapa kali sehari asal di area ±200 meter yang berbeda (area dihitung dari lokasi verifikasi saat scan), maksimal 5 Meet per pasangan per hari server; scan di area yang sudah dipakai hari itu ditolak dengan "You already met here today", dan setelah batas ditolak dengan "Daily Meet limit reached". |
| ROV-09 | Cek jarak saat scan | Saat scan, kedua perangkat mengirim lokasi foreground sekali. Backend menerima Meet hanya jika jarak ≤ 100 meter dan akurasi lokasi memadai; selain itu ditolak dengan alasan jelas. Tidak ada pelacakan latar belakang. Lokasi verifikasi berbeda dari lokasi yang ditampilkan. |
| ROV-10 | Dots | Setiap Meet yang sah menghasilkan satu Dot untuk kedua peserta. Dot adalah tanda Meet di peta: bukan mata uang, tidak dapat ditransfer atau dibelanjakan, dan disimpan di database. Profil menampilkan jumlah Dots. Karena pasangan yang sama tidak bisa Meet dua kali di area yang sama pada hari yang sama (ROV-08), satu Meet selalu sama dengan satu Dot; tidak ada penggabungan. Main seharian di beberapa tempat menghasilkan beberapa Dot, seperti jejak rute. |
| ROV-11 | Visibilitas Dot | Dot terlihat oleh kedua peserta dan teman pembuat momen yang berhak melihat momen itu; tidak terlihat oleh teman pemindai yang bukan teman pembuat, maupun publik. Lokasi tampil sebagai area sekitar 200 meter. Dot hanya muncul di peta bila lokasi momen dibagikan; tanpa itu Dot tetap tampil di kartu momen ("A & B met") dan daftar Dots dengan audiens yang sama. Salah satu peserta dapat menyembunyikan Dot dari peta untuk semua penonton; hanya peserta yang menyembunyikan yang dapat menampilkannya kembali. Dot tersembunyi tetap terhitung di profil dan tampil sebagai Hidden di daftar Dots milik kedua peserta. |
| ROV-12 | Opt-in onchain | Pengaturan sekali saat onboarding, default nyala, dengan penjelasan bahwa pasangan wallet dan waktu Meet terlihat publik selamanya sedangkan foto dan lokasi tetap privat. Dapat diubah kapan saja di profil dan hanya berlaku untuk Meet berikutnya. Nilai yang berlaku adalah pengaturan masing-masing peserta saat ia menandatangani. Opt-in ditegakkan lewat tanda tangan: Offer atau Accept dari peserta yang opt-in membawa aksi `RECORD_MEET`, sedangkan dari peserta yang tidak membawa `OFFCHAIN_MEET` yang ditolak contract, sehingga Meet hanya dapat tercatat onchain bila keduanya opt-in, bahkan dengan client yang dimodifikasi. Jika tidak, Meet tetap sah sebagai Dot di Mootz dan UI hanya menampilkan Not saved onchain tanpa menyebut siapa yang mematikannya. Dot onchain diberi tanda gembok. |
| ROV-13 | MeetRegistry | Contract memverifikasi Offer EIP-712 dari pembuat dan Accept dari pemindai yang mengikat digest Offer itu: dua signer berbeda, keduanya beraksi `RECORD_MEET`, domain, nonce belum dipakai, dan batas waktu. Mencatat pasangan wallet, waktu, event ID opsional, dan commitment foto bersalt; tanpa lokasi, URL media, atau nama. Satu catatan per Meet ID. Menyediakan jumlah Meet per wallet dan per wallet+event. Contract tidak memverifikasi lokasi. |
| ROV-14 | Frame pencapaian | Frame terbuka dari Dots, misalnya First Meet (1 Dot), Together (10 Dots), Social Butterfly (Meet dengan 5 teman berbeda); ambang adalah usulan. Status unlock dan equip disimpan di database. Map, Feed, dan profil memakai frame aktif yang konsisten. Tidak ada Shop atau pembelian. |
| ROV-15 | Event | Detail penyelenggara/waktu/tempat, momen bertag acara, check-in/eligibility, dan koleksi tersedia. Check-in dilakukan penyelenggara (pada demo: fixture/halaman penyelenggara). Payload Meet membawa event ID hanya bila momen bertag acara itu dan kedua peserta sudah check-in pada waktu acara; jika pemindai belum check-in, scan ditolak dengan "Check in to Demo Workshop A first". Tidak ada circle/grup. Melihat detail bukan bukti hadir atau hak klaim. |
| ROV-16 | Koleksi acara | Koleksi onchain nontransferable dengan issuer/signer berotorisasi dan supply cap pada semua jalur mint. Claim gratis setelah eligibility check-in; duplicate/expired/sold-out ditolak. Dapat dipasang sebagai frame dengan detail penerbit dan asal Demo Workshop A. Tidak otomatis mint dari Meet. |
| ROV-17 | Pengenalan independen | Halaman Demo Gathering B mengautentikasi penguasaan wallet, lalu membaca kepemilikan koleksi Workshop A dan jumlah Meet onchain di Workshop A langsung dari contract. Tidak memakai database Mootz untuk keputusan; nonholder dibedakan dari RPC error. Wallet tanpa koleksi bukan alumni tetapi jumlah Meet tetap ditampilkan. UI menyatakan secara umum bahwa Meet yang tidak disimpan onchain tidak terhitung. |
| ROV-18 | Status dan pemulihan | Published, streak updated, QR active/expired, scanned/signed, jarak lolos/gagal, Meet valid (Dot), onchain pending/recorded/not saved, claim, dan equip dibedakan. Kegagalan satu operasi tidak membatalkan keberhasilan operasi lain; gagal onchain tidak menghapus Dot. |

Requirement rinci media dan desain ada pada [brief](BRIEF.md), [alur pengguna](docs/user-flows.md), serta [brief desain](docs/design/DESIGN_BRIEF.md). Teknis ROV-08/12/13 dirinci pada [desain onchain](docs/onchain-design.md).

## 4. Aturan waktu dan parameter

Parameter awal yang diusulkan: kalender server Asia/Jakarta, berganti hari pukul 00.00 WIB; masa berlaku QR 60 detik; jarak maksimal 100 meter saat scan; area tampilan Dot sekitar 200 meter; satu Meet per pasangan per area per hari dengan maksimal 5 per pasangan per hari; koleksi Demo Workshop A dengan cap 50 sebagai fixture. QR 60 detik dan jarak 100 meter sudah disepakati; parameter lain perlu dikunci sebelum implementasi dan ditampilkan jujur.

Streak mengikuti hari publikasi post eligible. Scan QR teman bukan posting harian sendiri. Batas waktu pengiriman catatan onchain setelah scan (deadline relayer) adalah kontrol terpisah dari masa berlaku QR.

Contoh demo: A memposting momen harian (streak 1, tanpa reward). A dan B foto bareng di Demo Workshop A, B scan QR A, jarak lolos, keduanya opt-in. Dot bergembok muncul di kedua HP dan frame First Meet terbuka. A check-in, klaim koleksi Workshop A gratis, dan memakainya sebagai frame. Halaman Demo Gathering B mengenali A sebagai alumni Workshop A dengan 1 Meet tercatat di acara itu. Semua nilai merupakan fixture/usulan.

## 5. Identitas, Meet, dan integritas

Dua wallet tidak membuktikan dua manusia. Satu orang dengan dua perangkat masih dapat memalsukan Meet; QR 60 detik dan cek jarak hanya mempersulit. Contract memverifikasi tanda tangan dan batas waktu, bukan wajah, keaslian foto, atau lokasi fisik. Backend tetap dipercaya untuk mapping akun-wallet, cek jarak, audiens, dan rate limit.

Meet Offer mengikat aksi, Meet ID, momen, commitment foto, wallet pembuat, nonce, waktu terbit, batas waktu, event ID opsional, dan domain chain+contract. Meet Accept mengikat aksi, digest Offer, dan wallet pemindai. Pemindai meninjau preview yang cocok dengan commitment sebelum menandatangani. Accept atas Offer berbeda tidak digabung. Satu Meet ID hanya tercatat sekali.

Pemindai dapat menolak sebelum menandatangani. Setelah catatan onchain final, UI tidak menjanjikan pembatalan lewat perubahan database. Menyembunyikan Dot, menghapus media, mematikan opt-in, dan riwayat chain merupakan proses berbeda. Revocation di level contract belum menjadi scope awal.

## 6. Data dan privasi

Foto, selfie, caption, lokasi verifikasi dan tampilan, Dots, pertemanan, dan frame pencapaian disimpan di luar chain dengan akses sesuai audiens. Catatan onchain hanya memuat pasangan wallet, waktu, event ID opsional, dan commitment bersalt. Commitment tidak menjamin anonimitas: pasangan wallet yang bertemu terlihat publik, karena itu pencatatan memerlukan opt-in kedua peserta.

QR terikat pembuat, berlaku singkat, dan hanya membuka preview momen terkait; mengetahui ID momen tidak memberi akses. Event tag tidak otomatis membuat posting publik. API menolak pengambilan media, komentar, Dot, dan data Meet milik akun lain di luar izin. Retensi lokasi verifikasi perlu ditetapkan sebelum pengguna nyata. Data fixture selalu berlabel demo dan tidak menyalin informasi pribadi dari screenshot referensi.

## 7. Kualitas pengalaman

Mobile-first dengan adaptasi desktop; semua UI English, ungu tua/muda, map terang dan foto dominan. Kamera, lokasi, dan scan QR memerlukan HTTPS dan pengujian perangkat. Momen scan sampai Dot muncul di kedua HP harus terasa instan dan tidak meminta popup wallet yang membingungkan atau biaya gas dari pengguna. Keyboard/focus, close/back, target sentuh, overflow, loading/empty/error, dan reduced motion diperiksa pada implementasi. Tidak ada angka performa atau SLA yang diklaim sudah tercapai.

## 8. Ketergantungan dan risiko

- Wallet typed-data signing tanpa friksi di HP, relayer/sponsorship gas, dan contract deployment harus diuji awal.
- Scan QR, kamera, akurasi GPS di dalam ruangan, dan MapLibre/WebGL dapat gagal walaupun endpoint penyedia merespons.
- Meet dapat disalahgunakan melalui kolusi/akun ganda; batas dan cek jarak bukan bukti Sybil teratasi.
- Pengenalan lintas acara bergantung pada layanan lain yang memilih mengintegrasikannya.
- Seluruh scope cukup luas untuk enam jam. Keputusan trade-off dicatat, bukan diam-diam mengganti target menjadi backend-only atau menghapus fitur.

## 9. Pengukuran

Uji apakah peserta dapat memposting, menyelesaikan Meet, memahami opt-in, memakai frame, serta kembali untuk Meet berikutnya. Ukur penyelesaian capture, waktu dari QR tampil sampai Dot muncul, kegagalan scan/jarak/signing/pencatatan, rasio opt-in, penggunaan frame, biaya nyata, dan return pengguna. Demo satu hari tidak membuktikan retensi.

## 10. Definition of done

Release demo belum selesai sampai dua akun/perangkat melewati alur yang diklaim live; QR kedaluwarsa, jarak lebih dari 100 meter, satu signer berulang, Accept atas Offer berbeda, aksi `OFFCHAIN_MEET`, Meet kedua pasangan yang sama di hari yang sama, dan replay ditolak; catatan Meet dan kepemilikan koleksi dapat dibaca ulang; dan kegagalan utama punya recovery yang jujur. Pengenalan independen harus tetap bekerja tanpa endpoint Mootz. Catat mana yang passed, failed, unavailable, dan unverified di [verifikasi](docs/verification.md).

Tidak ada test/build/CI yang dinyatakan lulus hanya karena dokumen ini tersedia.
