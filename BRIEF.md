# Mootz: Product & Hackathon Brief

Pembaruan 24 Oktober 2026: lokasi teman foreground ditambahkan sesuai permintaan pengguna; update otomatis tiap 5 detik saat app terlihat, izin browser wajib, dimatikan lewat profil, accepted friends saja dan posisi kedaluwarsa 60 detik. Area perkiraan tanpa foto/onchain/riwayat/background tracking. Ketentuan baru ini berlaku atas pernyataan scope lama tentang tracking teman; lihat [detail](docs/friend-location.md).

## 1. Produk dalam satu kalimat

**Mootz adalah aplikasi sosial Map + Feed untuk berbagi foto harian depan-belakang dengan teman, dan membuktikan pertemuan langsung lewat Meet yang menjadi Dot di peta serta dapat dicatat di Monad.**

Pengalaman sehari-hari mencakup posting foto dua arah, selfie reaction, thread komentar, dan tampilan streak di profil. Saat dua teman bertemu langsung, Meet menghasilkan Dot di peta untuk keduanya, yang dapat membuka frame pencapaian. Saat ada acara, pengguna dapat membuka detail acara, menandai acara pada momen, melakukan check-in, dan mengklaim koleksi dari penyelenggara tanpa bergabung ke grup. Mootz tetap berpusat pada teman dan momen; fitur acara tidak mengubahnya menjadi aplikasi tiket atau manajemen konferensi.

Pitch singkat:

> Zenly died and took your memories with it. Mootz makes your real-life connections yours forever.

Tagline pendamping:

> Share your day. Confirm your moments together. Carry your community memories with you.

Mootz adalah nama yang dipilih pemilik produk. Dots berarti titik-titik di peta: tiap Dot menandai tempat dua orang pernah bertemu.

## 2. Konteks dan tujuan

Mootz disiapkan untuk hackathon offline Monad Blitz, dengan asumsi sprint sekitar enam jam dan tim maksimal tiga orang. Fokusnya adalah satu alur produk yang berfungsi dari awal sampai akhir dan mudah dipahami saat demo.

Tim ingin menghasilkan aplikasi yang terasa menyenangkan dan matang secara visual. Pengguna harus memahami foto, peta, Meet, dan Dots tanpa perlu memahami istilah blockchain terlebih dahulu.

Keberhasilan prototipe terlihat ketika pengguna memposting pasangan foto dan melihat streak naik, dua akun melakukan Meet lewat scan QR sehingga Dot bergembok muncul di kedua HP, frame First Meet terbuka dan dipakai, lalu klaim koleksi acara dan pengenalannya di halaman penyelenggara lain. Target teknis terpenting: Meet hanya tercatat onchain bila contract memverifikasi tanda tangan dua wallet berbeda atas payload yang sama. Publikasi foto, streak, dan Dot tidak bergantung pada keberhasilan transaksi chain; gagal onchain tidak menghapus Dot.

Halaman demonstrasi penyelenggara (Demo Gathering B) membaca kepemilikan koleksi Workshop A dan jumlah Meet di Workshop A langsung dari chain, bukan dari database Mootz. Ini target demonstrasi, bukan klaim integrasi atau kerja sama nyata. Seluruh scope, termasuk Meet, belum terbukti dapat diselesaikan dalam enam jam; bila tidak cukup, hasilnya disebut prototipe parsial dan keterbatasannya dicatat.

## 3. Pengguna awal dan kebutuhan yang diuji

Pengguna awal adalah mahasiswa, teman-teman, dan peserta acara komunitas (workshop, seminar, festival, gathering). Lingkungan kampus atau acara memberi titik awal karena orang-orang berada dalam area yang sama. Persona diwakili peran pembuat momen, teman yang memindai QR, dan penyelenggara; tidak digunakan identitas atau statistik fiktif sebagai bukti pasar.

Konteks awal yang direkomendasikan adalah satu komunitas dengan acara berulang. Acara memberi momen bersama untuk mulai memakai Mootz; pertemanan dan posting harian memberi alasan kembali di antara acara. Kegunaan koleksi lintas acara bergantung pada keputusan penyelenggara mengakuinya, bukan manfaat otomatis dari token.

Hipotesis kebutuhan (semua belum terbukti):

- Pengguna ingin mengetahui kegiatan teman melalui foto dengan konteks tempat dan waktu.
- Pengguna ingin menjelajahi aktivitas melalui peta maupun feed sesuai kebiasaan mereka.
- Bukti bertemu langsung lebih bermakna daripada tag jarak jauh.
- Dot di peta dan frame pencapaian memberi alasan bertemu lagi; acara berulang membantu memulai penggunaan.
- Pengguna peduli riwayat pertemanan nyata tidak hilang bila layanan ditutup, seperti pengalaman Zenly. Seberapa besar kepedulian ini belum diuji.

Hipotesis tersebut perlu diuji lewat penggunaan. Foto dan teman tetap isi utama; tidak ada validasi retensi atau bisnis yang diklaim selesai.

## 4. Prinsip produk

1. **Foto dan teman menjadi isi utama.** Peta membantu pengguna menemukan konteksnya.
2. **Map dan Feed merupakan dua tampilan atas data yang sama.** Perubahan pada salah satunya muncul di tampilan lain, termasuk Dot.
3. **Bertemu langsung membutuhkan dua pihak.** Meet butuh pembuat momen, satu pemindai, dua tanda tangan, dan cek jarak. Tag tanpa scan bukan Meet.
4. **Dots adalah tanda di peta, bukan uang.** Tidak ada saldo, transfer, atau belanja; tidak ada hadiah untuk bertemu, agar pertemuan tidak menjadi transaksi.
5. **Tindakan penting memiliki umpan balik jelas.** Pengguna tahu kapan foto terkirim, QR aktif atau kedaluwarsa, jarak lolos atau gagal, Dot terbentuk, serta pencatatan onchain tertunda atau tercatat.
6. **Blockchain hanya untuk yang perlu dibaca pihak lain dan tidak boleh hilang.** Pasangan wallet pada Meet dan koleksi acara dicatat onchain; foto, lokasi, Dots, pertemanan, dan frame pencapaian tetap offchain.
7. **Onchain adalah pilihan pengguna.** Opt-in dijelaskan jujur bahwa pasangan wallet dan waktu Meet terlihat publik selamanya.
8. **Scope mengikuti durasi hackathon.** Prioritasnya menyelesaikan satu alur penuh sebelum memperluas fitur; jangan diam-diam menghapus fitur untuk mengejar waktu.
9. **Retensi berasal dari kegiatan sosial yang bermakna.** Membuka aplikasi tidak menaikkan streak; reaction dan komentar tidak memberi Dot. Streak tidak memberi reward atau milestone.
10. **Acara menjadi konteks sosial tambahan.** Berbagi langsung ke teman dan posting harian tetap tersedia tanpa mengikuti acara; frame pencapaian dan koleksi acara berbeda asalnya.
11. **Kejujuran tentang batas.** Dua wallet tidak membuktikan dua manusia; contract tidak memverifikasi lokasi; foto bukan bukti keaslian.

## 5. Struktur aplikasi

### Navigasi atas

Header memuat identitas pengguna, filter momen aktif, serta **Map | Feed** sebagai satu-satunya dua tab utama. Ringkasan streak dan jumlah Dots mudah ditemukan; pada HP gunakan baris ringkas terpisah agar header tidak bertumpuk. Kamera dua arah dapat dibuka dari keduanya. Detail streak, daftar Dots/Meet, frame, dan pengaturan onchain berupa panel/layar sekunder (profil), bukan tab utama baru. Notifikasi tidak wajib pada versi awal.

**All** menjadi filter awal untuk seluruh momen yang berhak dilihat pengguna. **Filter moments** membuka All, Friends, serta Events; Events memfilter berdasarkan penanda acara, bukan keanggotaan. Posting sehari-hari dibagikan langsung ke teman dan dapat diberi penanda acara opsional saat review.

Detail acara memuat nama, penyelenggara, waktu, tempat publik, dan koleksi terkait. Pengguna dapat membukanya dari marker acara, penanda pada post, atau filter Events. Tidak ada pemilih circle, daftar anggota grup, tombol Join group, atau data membership grup. All dan halaman acara tidak melewati otorisasi foto: menandai acara tidak otomatis membuat post publik atau membuka foto orang lain. Pada MVP, foto mengikuti audiens teman; memperluasnya ke publik memerlukan keputusan terpisah. Melihat detail acara bukan bukti hadir atau hak klaim.

Profil membuka jumlah Dots, daftar Meet, frame pencapaian dan koleksi, serta pengaturan opt-in onchain.

### Map

Map menjadi tampilan awal untuk prototipe dan demo. Peta memperlihatkan momen sebagai thumbnail foto dan Dot sebagai penanda Meet dengan bentuk visual yang berbeda dari momen.

- Pilih thumbnail untuk membuka preview momen (foto, penulis, tempat, waktu, akses detail).
- Pilih Dot untuk melihat teks "A & B were here", waktu, dan ikon gembok bila tercatat onchain.
- Momen yang berdekatan dikelompokkan agar pin tidak bertumpuk.
- Lokasi momen menunjukkan tempat saat foto dibuat, dengan waktu yang jelas. Dot ditampilkan sebagai area sekitar 200 meter (usulan), bukan titik persis, dan hanya bila lokasi momen dibagikan.

Avatar atau identitas penulis pada momen memperlihatkan frame yang sedang dipakai. Prototipe tidak membutuhkan pelacakan lokasi teman sepanjang hari; tidak ada pelacakan latar belakang.

### Feed

Feed menampilkan momen yang sama sebagai kartu foto besar, dengan urutan awal berdasarkan posting terbaru. Setiap kartu memuat identitas penulis, frame avatar, pasangan foto, caption singkat, lokasi, waktu, selfie reaction, jumlah komentar, penanda Meet bila momen itu menghasilkan Dot yang boleh dilihat penonton, dan aksi **Lihat di peta** jika lokasi dibagikan. Akses reaction dan thread juga tersedia dari detail momen Map, dengan state yang sama.

Satu momen memiliki satu penulis dan dua foto terkait, masing-masing dari kamera belakang dan depan. Foto belakang menjadi tampilan besar dan selfie menjadi inset secara default; pengguna bisa menukar tampilan tanpa mengubah identitas momen. Kolaborasi multi-kontributor tetap pengembangan lanjutan.

### Integrasi Map dan Feed

- **Lihat di peta** memindahkan pengguna ke Map, memusatkan lokasi, dan menyorot momen yang dipilih.
- Detail momen adalah komponen yang sama dari kedua tampilan.
- Posting baru dan Dot baru muncul di Map dan Feed.
- Filter momen/acara atau filter waktu tetap berlaku ketika berganti tab.
- Posisi peta dan scroll Feed dipertahankan selama sesi.
- Perubahan frame aktif terlihat di kedua tampilan tanpa login ulang.
- Pasangan foto, selfie reaction, dan thread komentar menggunakan ID momen yang sama dari Map maupun Feed.

Jika pengguna tidak memberikan lokasi untuk posting, momen tetap dapat muncul di Feed. Aplikasi tidak membuat koordinat fiktif agar momen bisa dipaksakan ke Map; tanpa lokasi momen yang dibagikan, Dot dari momen itu tidak muncul di peta tetapi tetap terhitung di profil.

## 6. Alur pengguna utama

### A. Masuk, onboarding, dan melihat teman

Pengguna masuk, memilih nama serta avatar, lalu melihat pengaturan opt-in onchain sekali (lihat B5), kemudian membuka All dengan konten teman dan acara demo yang boleh dilihatnya. Wallet dihubungkan atau dibuat melalui penyedia login yang dipilih tim, dengan pemetaan akun-wallet yang stabil. Untuk MVP, gunakan daftar teman/akun demo dan satu acara yang sudah disiapkan; pencarian teman dan sinkronisasi kontak belum diklaim ada. Tidak ada pembuatan grup.

### B. Membagikan momen

Pengguna membuka kamera dari Map atau Feed, mengambil foto belakang dan depan, meninjau pasangan tersebut, menulis caption opsional, memilih berbagi lokasi atau tidak, lalu memposting satu momen. Komposisi awal menampilkan belakang sebagai foto besar dan depan sebagai inset; keduanya dapat ditukar. Retake salah satu foto tidak wajib mengulang yang lain. Peninjauan menampilkan label **Front** dan **Back** agar sumber foto jelas.

Posting bebas kapan saja; Feed tidak dikunci sampai pengguna posting. Tidak ada prompt acak, batas dua menit, atau penalti terlambat pada versi awal. Notifikasi berjendela waktu ala BeReal disimpan sebagai mode tantangan opsional berikutnya.

Target pengalaman adalah satu pasangan foto dalam satu sesi. Capture benar-benar serentak belum dijanjikan: bila perangkat tidak mendukung, desain memakai urutan belakang lalu depan dengan petunjuk **Now take your selfie**, menyimpan hasil pertama. Jangan memalsukan dua kamera live dengan gambar duplikat. Unggahan galeri sebagai cadangan diberi label; secara usulan awal tidak memenuhi streak maupun Meet, walaupun boleh dipublikasikan sebagai momen biasa.

Momen baru terpublikasi setelah kedua aset yang diwajibkan tersimpan dan tervalidasi. Jika capture atau salah satu upload gagal, simpan draft sesi dan tawarkan retry, bukan menerbitkan pasangan setengah jadi. Posting berhasil memperbarui Map dan Feed, lalu memproses streak secara terpisah.

### B1. Selfie reaction yang dapat dipakai ulang

Pengguna membuka **React** pada sebuah momen dan memilih selfie tersimpan, atau **Take a selfie** untuk membuat reaction baru. Tersedia review, retake, simpan, serta opsi memakai hasilnya pada momen tersebut. Tidak ada reaction emoji biasa pada versi ini. Selfie tersimpan tetap privat bagi pemilik; hanya reaction yang dikirim yang terlihat oleh pengguna yang berhak melihat momen.

Usulan sederhana: maksimal satu reaction aktif per pengguna per momen; pengguna dapat mengganti atau menghapusnya. Mengganti tidak menambah jumlah reaction. Hapus selfie dari koleksi berarti menghapus opsi pemakaian ulang; hapus reaction yang sudah dikirim merupakan tindakan terpisah. Jangan menghapus media fisik selagi masih dirujuk reaction; gunakan penghapusan lunak dan pembersihan referensi sesuai hak akses. Reaction gagal kirim tidak ditampilkan sebagai sukses.

### B2. Komentar ber-thread

Komentar berupa teks dengan balasan. Untuk tahap awal, thread dibatasi satu tingkat: komentar utama dan balasannya. **Reply** pada suatu balasan tetap masuk thread induk dengan konteks **Replying to [name]**. Root ditampilkan menurut waktu kirim; balasan juga kronologis. Tampilkan **View replies**, **Reply**, dan **Send** dengan state kosong, mengirim, gagal, serta coba lagi.

Pengguna dapat menghapus komentar/balasannya sendiri; root yang masih memiliki balasan diganti **Comment deleted**. Server menolak teks kosong, akses ke momen di luar audiens, serta reply ke root dari momen lain. Usulan batas teks 500 karakter dan rate limit per akun. Tidak ada Dot atau tambahan streak dari reaction/komentar. DM, media komentar, mention notification, dan thread multi-level belum termasuk.

### B3. Tampilan streak posting harian di profil

Post eligible pertama per akun pada satu hari server menaikkan streak satu kali. Post eligible adalah daily capture dua arah yang berhasil terpublikasi, bukan membuka aplikasi, draft, reaction, komentar, atau scan QR teman. Posting tambahan pada hari yang sama tidak menaikkan streak lagi.

Usulan kalender awal: zona waktu tetap **Asia/Jakarta (WIB)**, hari berganti pukul 00.00 WIB berdasarkan waktu publikasi server, bukan jam perangkat. Jika hari sebelumnya memiliki post eligible, streak berlanjut; jika ada hari kosong, post eligible berikutnya mulai lagi dari 1. Tidak ada freeze, pemulihan berbayar, atau penalti.

Streak adalah tampilan konsistensi saja: tanpa Dots, reward, klaim, atau bonus milestone. Streak diperbarui tanpa menunggu teman maupun chain. Contoh state English: **Start your streak**, **Post today**, **Posted today**, **7-day streak**, **Start a new streak**. "7-day" hanya untuk data nyata atau fixture berlabel demo.

### B4. Meet: bukti bertemu langsung

Meet menggantikan tag dan konfirmasi jarak jauh. Satu Meet = dua orang. Tag tanpa scan bukan Meet; video call, berada di titik GPS sama tanpa scan, atau saling reaction juga bukan Meet.

Alur yang disepakati:

1. Meet dimulai setelah momen terbit: pembuat membuka **Meet** dari layar *Moment posted* atau dari momennya sendiri (usulan: momen hari yang sama). Pembuat sudah memotret teman yang terlihat di foto. Foto galeri tidak eligible untuk Meet.
2. Pembuat menampilkan QR berisi **Meet Offer** yang ditandatangani wallet-nya (EIP-712: aksi, Meet ID, ID momen, commitment foto, wallet pembuat, nonce, issuedAt, expiry = issuedAt + 60 detik, event ID opsional, domain chain+contract). QR berlaku 60 detik dan hanya dipakai satu pemindai.
3. Pemindai memindai QR dan hanya melihat preview terbatas atas momen itu saja, walaupun ia bukan teman pembuat; ia tidak perlu memiliki momen sendiri. Pemindai dapat menolak. Bila setuju, ia menandatangani **Meet Accept** sebelum QR kedaluwarsa (aksi, digest Offer, wallet pemindai). Meet tidak membuat pertemanan.
4. Saat scan, kedua perangkat mengirim lokasi foreground sekali. Backend menerima Meet bila jarak ≤ 100 meter dan akurasi lokasi memadai (ambang akurasi belum ditetapkan); selain itu ditolak dengan alasan jelas. Tidak ada pelacakan latar belakang. Lokasi verifikasi berbeda dari lokasi yang ditampilkan di peta.
5. Pasangan yang sama boleh Meet beberapa kali dalam satu hari server (WIB) asal di area ±200 meter yang berbeda, maksimal 5 Meet per pasangan per hari. Scan di area yang sudah dipakai hari itu ditolak dengan **You already met here today**; setelah batas, **Daily Meet limit reached**. Contoh: ngopi pagi lalu nonton sore bersama teman yang sama menghasilkan dua Dot. Satu Meet sah = satu Dot untuk kedua peserta (bagian 7); tidak ada penggabungan Dot.
6. Event ID hanya dibawa bila momen bertag acara itu dan kedua peserta sudah di-check-in penyelenggara selama acara. Bila pemindai belum check-in, scan ditolak dengan **Check in to Demo Workshop A first**.
7. Bila kedua peserta opt-in, Meet dikirim ke MeetRegistry dan Dot diberi gembok; bila tidak, Meet tetap sah sebagai Dot di Mootz (lihat B5).
8. Status dibedakan di UI: QR active/expired, scanned/signed, jarak lolos/gagal, Meet valid (Dot), onchain pending/recorded/not saved. Kegagalan satu operasi tidak membatalkan yang lain; gagal onchain tidak menghapus Dot. Batas waktu pengiriman relayer terpisah dari 60 detik QR.

Batas yang dinyatakan jujur: dua wallet tidak membuktikan dua manusia; satu orang dengan dua HP masih dapat memalsukan Meet, dan QR 60 detik serta cek jarak hanya mempersulit. Jarak diukur backend dari lokasi yang dikirim perangkat; contract tidak memverifikasi lokasi. Tidak ada pengenalan wajah atau liveness. Syarat "teman terlihat di foto" adalah norma sosial yang dinyatakan pembuat dan pemindai, bukan hal yang diverifikasi sistem. Kolusi dan akun ganda tetap batas prototipe.

### B5. Opt-in onchain

Saat onboarding (sekali), pengguna melihat pengaturan "catat Meet saya di Monad", default **nyala**, dengan penjelasan singkat: pasangan wallet dan waktu Meet terlihat publik selamanya, sedangkan foto dan lokasi tetap privat. Pengaturan dapat diubah di profil kapan saja, tetapi hanya berlaku untuk Meet berikutnya; catatan yang sudah final tidak dapat dihapus.

Aturan: Meet dicatat onchain hanya bila **kedua** peserta opt-in. Hal ini ditegakkan secara kriptografis, bukan hanya UI: peserta yang opt-in menandatangani aksi `RECORD_MEET`, sedangkan yang tidak menandatangani `OFFCHAIN_MEET`, yang ditolak contract. Nilai yang berlaku adalah pengaturan masing-masing peserta saat ia menandatangani. Bila salah satu mati, Meet tetap menghasilkan Dot di Mootz dan tidak ada catatan chain; UI hanya menampilkan **Not saved onchain** tanpa menyebut siapa yang mematikannya. Dot onchain diberi ikon gembok. Jumlah Meet onchain (per wallet dan per acara) hanya menghitung Meet yang tercatat, dan UI menyatakan secara umum bahwa Meet yang tidak disimpan onchain tidak terhitung.

### C. Dots di peta

Dot dibuat otomatis oleh Meet yang sah; tidak ada klaim, drop, atau saldo. Pengguna melihat Dot pada Map, daftar Meet di profil, serta jumlah Dots di profil. Visibilitas (usulan yang sudah disepakati di PRD):

- Dot terlihat oleh kedua peserta dan teman pembuat momen yang berhak melihat momen itu.
- Tidak terlihat oleh teman pemindai yang bukan teman pembuat, dan tidak terlihat publik.
- Ditampilkan sebagai area sekitar 200 meter, hanya bila lokasi momen dibagikan.
- Bila lokasi momen tidak dibagikan, Dot tidak muncul di peta, tetapi tetap tampil di kartu momen ("A & B met") dan daftar Dots dengan audiens yang sama.
- Salah satu peserta dapat menyembunyikan Dot dari peta untuk semua penonton; hanya peserta yang menyembunyikannya yang dapat menampilkannya kembali. Dot tersembunyi tetap terhitung di profil dan tampil sebagai **Hidden** di daftar Dots kedua peserta.

### D. Frame pencapaian

Frame terbuka dari jumlah Dots. Ambang yang diusulkan: **First Meet** (1 Dot), **Together** (10 Dots), **Social Butterfly** (Meet dengan 5 teman berbeda). Karena 1 Meet = 1 Dot, ambang Dots sama dengan jumlah Meet. Status unlock dan equip disimpan di database; pengguna memasang frame dari profil dan hasilnya konsisten di Map, Feed, dan profil. Tidak ada pembelian atau Shop. Frame koleksi acara (bagian 8A) dapat dipasang dengan cara yang sama.

### E. Mengikuti konteks acara dan mengklaim koleksi

Pengguna membuka detail acara dari penanda momen, filter Events, atau marker acara, lalu melihat informasi acara serta momen bertanda acara yang memang boleh dilihatnya. Foto tetap mengikuti audiens aslinya. Memposting foto, menandai acara, berada dekat marker, atau memiliki Dots bukan pengesahan kehadiran otomatis. Eligibility klaim disahkan penyelenggara melalui check-in.

Untuk prototipe, satu komunitas dan satu acara (Demo Workshop A) disiapkan tim. Penerbit dan signer yang diizinkan terdaftar pada contract. Penyelenggara mengesahkan akun peserta melalui daftar yang dikelola atau kode check-in yang divalidasi server; kode bersama saja tidak dianggap bukti manusia unik. Contract memeriksa penerbit/signature yang sah, penerima, ID klaim, masa berlaku, total suplai, serta klaim sebelumnya.

Pengguna melihat detail koleksi, syarat, penerbit, jumlah terbit/jatah, dan penjelasan bahwa kepemilikan dapat dibaca publik, lalu memilih **Claim event collectible**. Klaim gratis; gas disponsori (bagian 10). Setelah receipt berhasil, tampilkan **Collectible received** dan **Wear frame**. Meet membawa event ID hanya bila momen bertag acara dan kedua peserta sudah check-in oleh penyelenggara selama acara (pada demo: fixture/halaman penyelenggara), sehingga jumlah Meet per acara dapat dibaca.

### F. Memeriksa koleksi dan Meet di luar Mootz

Sediakan halaman demonstrasi penyelenggara (Demo Gathering B) yang terpisah dari pengalaman utama Mootz. Pengguna membuktikan penguasaan wallet melalui autentikasi yang sesuai; untuk demo interaktif, tanda tangan challenge sekali pakai yang terikat domain dan masa berlaku direkomendasikan. Halaman membaca langsung dari contract: kepemilikan koleksi Workshop A dan jumlah Meet onchain di Workshop A. Halaman tidak memakai database Mootz untuk keputusan. Mengetik alamat orang lain tidak memberikan akses manfaat kepadanya.

Jika wallet memiliki koleksi Workshop A, tampilkan kartu alumni contoh dengan jumlah Meet ("1 Meet at Workshop A"). Wallet tanpa koleksi bukan alumni, tetapi jumlah Meet tetap ditampilkan; status belum memenuhi dibedakan dari kegagalan RPC. Meet yang tidak disimpan onchain tidak terhitung dan UI menyatakannya secara umum. Manfaat nyata hanya berlaku bila penyelenggara benar-benar menyediakannya; tidak ada kerja sama nyata yang diklaim.

## 7. Dots dan Meet

**Dots bukan mata uang.** Dot adalah penanda di peta untuk satu Meet yang sah: "A & B were here" (pada kartu momen tanpa lokasi: "A & B met"). Aturan:

- Satu Meet sah = satu Dot, dimiliki bersama oleh kedua peserta (satu per Meet untuk keduanya).
- Disimpan di database (offchain). Tidak ada saldo, transfer, belanja, pencairan, atau nilai tukar.
- Profil menampilkan jumlah Dots. Dot tetap terhitung walaupun disembunyikan dari peta (tampil sebagai Hidden di daftar kedua peserta).
- Satu Meet per pasangan per area per hari, maksimal 5 per pasangan per hari, sehingga 1 Meet = 1 Dot dan tidak ada penggabungan Dot. Frame Together tetap 10 Dots, walau satu pasangan yang jalan-jalan seharian bisa mencapainya lebih cepat. Ambang frame menghitung Dots, yang sama dengan jumlah Meet.
- Posting harian, streak, reaction, komentar, dan tag tidak menghasilkan Dot. Hanya Meet yang sah.
- Dot bukan bukti kehadiran fisik independen dan bukan bukti manusia unik.

Nama Dots kini sesuai artinya: titik-titik di peta. Karena tidak ada hadiah, tidak ada insentif uang untuk bertemu. Gagasan pool hadiah Meet dari sponsor (membayar orang untuk bertemu) serta toples Dots bersama ("Bond") dipertimbangkan lalu **ditolak**: terlalu transaksional atau terlalu jauh dari inti.

Dot onchain: bila kedua peserta opt-in, Meet dicatat di MeetRegistry dan Dot diberi gembok. Dot adalah catatan offchain Mootz; MeetRegistry adalah catatan pasangan wallet dan waktu. Keduanya dihubungkan lewat Meet ID.

## 8. Frame dan inventory

Prioritas MVP adalah beberapa frame avatar dengan karakter visual berbeda, yang terbaca pada ukuran kecil, tidak menutupi wajah, dan bekerja di atas peta maupun kartu foto. Frame berasal dari dua sumber saja:

| Sumber | Cara memperoleh | Penyimpanan |
|---|---|---|
| Frame pencapaian | Terbuka otomatis dari Dots (First Meet, Together, Social Butterfly; ambang usulan) | Database (offchain) |
| Frame koleksi acara | Klaim gratis setelah check-in penyelenggara | Kepemilikan onchain; pemasangan dicatat database |

Setiap item memiliki ID tetap, nama, dan aset visual. Inventory dan pilihan frame aktif tidak dicatat onchain; hanya kepemilikan koleksi acara yang ada di chain. Tidak ada Shop, harga, atau pembelian. Pengembangan selanjutnya (bentuk pin, tema kartu, frame animasi, sticker profil) belum termasuk.

Frame pencapaian dan koleksi acara dibedakan: frame pencapaian bukan bukti hadir di acara, dan koleksi acara tidak otomatis mint dari Meet. Memiliki item tidak membuktikan kehadiran fisik atau identitas seseorang. Tampilkan detail koleksi dari frame acara yang dipakai agar orang memahami asalnya, dengan akses foto tetap menurut audiens.

## 8A. Koleksi acara portabel

### Dua kategori yang dipisahkan

| Kategori | Cara memperoleh | Arti dan batas |
|---|---|---|
| Frame pencapaian | Dari Dots, otomatis | Penanda kebiasaan bertemu; offchain; tidak menyatakan peserta suatu acara |
| Koleksi acara | Klaim berdasarkan otorisasi penyelenggara | Catatan penerbitan kepada wallet tertentu; bukan bukti kehadiran independen |

Manfaat komunitas (kartu alumni, konten, kegiatan) hanya ada bila diakui penyelenggara dan tidak otomatis tersedia.

Contoh ilustratif: komunitas demo menerbitkan paling banyak 50 frame **Jogja Builder** untuk Demo Workshop A. Angka, nama, penerbit, dan manfaat harus berlabel demo; tidak menyiratkan persetujuan resmi Monad, UGM, atau pihak lain.

### Aturan penerbitan yang direkomendasikan untuk demo

- Satu penerbit yang dikonfigurasi tim, satu acara, satu koleksi, dan maksimal satu klaim per wallet+koleksi. Satu klaim per wallet tidak menjamin satu manusia.
- Penerbit serta signer harus tercatat dan diotorisasi; label frontend tidak membuat seseorang menjadi penerbit resmi.
- Supply cap ditetapkan saat pembuatan dan tidak dapat dinaikkan diam-diam; semua jalur mint/claim mengikuti cap yang sama. Jangan tampilkan label **Limited** tanpa batas contract.
- Usulan: koleksi nontransferable pada semua jalur transfer contract; dapat memakai ERC-1155 dengan kebijakan transfer khusus atau contract koleksi minimal. Standar collectible saja tidak menegakkan nontransferability. Marketplace dan migrasi wallet di luar demo.
- Identitas penerbit, campaign ID, supply cap, jumlah terbit, kepemilikan, dan event klaim ada di chain; foto pribadi dan data peserta tidak ditempelkan pada metadata publik.
- Pengguna melihat bahwa kepemilikan wallet/koleksi dapat dibaca publik sebelum mengklaim. Jangan menjanjikan kehadiran anonim.
- Portabilitas berarti catatan kepemilikan dapat dibaca di luar database Mootz. Tampilan frame membutuhkan aset dan metadata yang tetap tersedia; ketahanan keduanya direncanakan terpisah. Tidak ada janji semua aplikasi mendukung Mootz atau aset tersedia selamanya.

### Scope acara awal

Detail acara, penanda acara pada momen, eligibility, klaim, dan pemasangan frame berada di dalam Mootz. Halaman pembaca kepemilikan merupakan demonstrasi terpisah. Pembuatan acara mandiri, dashboard penerbit, tiket, pembayaran pendaftaran, penjadwalan sesi, dan campaign berbayar masuk pengembangan berikutnya. Kode/QR check-in hanya alat otorisasi prototipe.

## 9. Narasi Zenly, mengapa blockchain, dan peran Monad

### Narasi Zenly

Snap menutup Zenly pada 3 Februari 2023 (diumumkan akhir 2022; [AlternativeTo](https://alternativeto.net/news/2022/12/zenly-social-mapping-network-shutting-down-on-february-3rd-2023/)) dan riwayat penggunanya ikut hilang: tempat yang pernah dikunjungi bersama teman tidak dapat dibuka lagi. Mootz menjawab dengan memilih apa yang layak bertahan di luar server satu perusahaan. Narasi pitch: *Zenly died and took your memories with it. Mootz makes your real-life connections yours forever.* Kalimat "yours forever" hanya berlaku untuk catatan yang opt-in dan dicatat onchain; foto tidak ikut abadi.

### Mengapa blockchain (hanya untuk Meet dan koleksi)

- **Tidak bisa hilang.** Catatan Meet dan koleksi acara tidak bergantung pada server Mootz; bila Mootz berhenti, catatan tetap ada di chain.
- **Tidak bisa dipalsukan sepihak.** MeetRegistry memverifikasi Meet Offer dan Meet Accept dari dua wallet berbeda; satu pihak tidak dapat membuat catatan Meet sendirian. Ini bukan bukti dua manusia berbeda.
- **Dapat dibaca pihak lain.** Penyelenggara atau layanan lain dapat membaca koleksi dan jumlah Meet per wallet dan per wallet+acara tanpa meminta akses database Mootz.
- **Kecepatan Monad.** Setiap Meet adalah satu transaksi. Konfirmasi cepat Monad memungkinkan momen scan sampai Dot muncul terasa hampir instan di kedua HP saat demo. Ini harapan yang diuji, bukan angka performa yang sudah dibuktikan; gas disponsori agar pengguna tidak melihat biaya.

### Apa yang di chain dan di luar chain

| Di luar blockchain | Di Monad |
|---|---|
| Foto depan/belakang, thumbnail, selfie reaction | MeetRegistry: pasangan wallet, waktu, event ID opsional, commitment foto bersalt |
| Caption, lokasi verifikasi dan tampilan | Jumlah Meet per wallet dan per wallet+event |
| Pertemanan dan audiens momen | Koleksi acara: penerbit, supply cap, kepemilikan, event klaim |
| Dots, tampilan peta, visibilitas, sembunyikan Dot | |
| Streak, frame pencapaian, status unlock dan equip | |
| Komentar, balasan, koleksi selfie | |
| Cek jarak 100 meter, preview, audiens, rate limit | |
| Pemetaan akun-wallet, eligibility check-in acara | |

Contract tidak memverifikasi lokasi; ia memverifikasi tanda tangan, domain, nonce, dan batas waktu. Backend tetap dipercaya untuk pemetaan akun-wallet, cek jarak, audiens, dan rate limit.

### Penjelasan opt-in untuk pengguna

Saat onboarding: "Mootz dapat mencatat pertemuanmu di Monad agar tetap ada walau Mootz tutup. Yang tercatat: alamat wallet kalian berdua dan waktu Meet (bukan foto, bukan lokasi). Siapa pun dapat melihatnya, selamanya. Hanya dicatat jika kalian berdua menyalakannya." Teks ini berupa usulan UI English final yang perlu dirapikan di desain.

### Batas Web3 yang dinyatakan jujur

- Dua wallet ≠ dua manusia; satu orang dengan dua HP dapat memalsukan Meet.
- Contract tidak memverifikasi lokasi; cek jarak dilakukan backend.
- Foto tidak permanen dan tidak ikut chain.
- Catatan onchain membuka pasangan wallet secara publik; commitment bersalt tidak menjamin anonimitas atau mencegah korelasi.
- Catatan yang sudah final tidak dapat dihapus; menyembunyikan Dot, menghapus media, atau mematikan opt-in tidak menghapus riwayat chain. Revocation di level contract tidak masuk scope awal.
- Blockchain tidak membuktikan foto asli, manusia unik, atau kehadiran fisik pasti.

Jawaban singkat untuk pitch: **Di Mootz, dua orang yang bertemu langsung menandatangani Meet yang sama dan Monad memeriksa kedua tanda tangan itu. Catatan pertemuan dan koleksi acara tidak bergantung pada server Mootz dan dapat dibaca pihak lain, sementara foto dan lokasi tetap privat. Blockchain mencatat persetujuan dan kepemilikan, bukan membuktikan kehadiran fisik.**

## 10. Otorisasi, klaim, dan sponsorship

Meet memakai dua tanda tangan: **Meet Offer** dari pembuat (dibawa dalam QR) dan **Meet Accept** dari pemindai (rincian di 10A). Pengguna tidak dapat mengubah event ID atau data lain dari frontend tanpa membatalkan tanda tangan.

Mapping akun ke wallet harus stabil; mengganti wallet tidak membuka pencatatan di luar aturan. Backend memverifikasi pemetaan akun-wallet, cek jarak, audiens, dan rate limit sebelum relayer mengirim. Server tidak hanya mempercayai flag dari client. Menandai media sebagai hasil kamera adalah sinyal prototipe, bukan bukti anti-fraud sempurna.

Gunakan ID opaque yang tidak menyertakan URL media, koordinat, nama teman, atau daftar peserta secara publik. Catatan MeetRegistry dan kepemilikan koleksi dapat dibaca publik; jangan menjanjikan bahwa pola transaksi tidak dapat dikorelasikan.

Klaim koleksi acara: backend (atau signer penerbit) menerbitkan otorisasi untuk penerima dan koleksi tertentu setelah eligibility check-in. Payload mengikat jaringan, contract, campaign/koleksi, penerbit, penerima, ID klaim, jumlah, dan expiry. Contract memeriksa signer sah, batas suplai dan klaim, serta menandai ID terpakai; retry atau dua request bersamaan tidak menggandakan item. Tanda tangan saja tidak mencegah replay tanpa state sekali-pakai. Contract menentukan aturan penutupan klaim; kepemilikan yang sudah terbit tetap dapat dibaca setelah jendela klaim berakhir. Backend yang mengesahkan kelayakan tetap pihak yang dipercaya; contract tidak mengetahui apakah seseorang benar-benar hadir.

Deadline pengiriman catatan onchain setelah scan (relayer, usulan "beberapa menit") adalah kontrol terpisah dari masa berlaku QR 60 detik.

Jalur utama yang direkomendasikan adalah sponsorship **Privy App Pays**. Relayer mandiri menjadi alternatif jika konfigurasi provider tidak sesuai kebutuhan. Pengguna tetap menyetujui tindakan yang relevan. Gas dibayar oleh aplikasi, dengan batas sponsorship per akun dan per fungsi. **Dots bukan token dan tidak membayar gas; transaksi Monad tetap memerlukan MON yang dibayar sponsor atau pengirim transaksi.** Biaya harus diukur dari contract yang benar-benar dipakai; gas belum diasumsikan gratis.

Dokumentasi Privy secara eksplisit memasukkan Monad mainnet dan Monad Testnet dalam jaringan App Pays. Sponsorship membutuhkan pengaturan dashboard dan wallet execution yang sesuai. Untuk prepaid sponsorship di mainnet, dokumentasinya meminta metode pembayaran tersimpan serta kredit. Kuota gratis layanan wallet tidak berarti gas mainnet gratis. [Dukungan jaringan](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview), [pengaturan sponsorship](https://docs.privy.io/wallets/gas-and-asset-management/gas/setup).

## 10A. Rancangan Meet: payload, tanda tangan, dan verifikasi

### Commitment dan payload

Gunakan satu Meet ID acak dan satu versi snapshot media. Usulan commitment foto: hash deterministik atas ID/versi, digest aset front/back dengan peran tetap, serta salt acak yang dibagikan hanya kepada peserta Meet. Pemindai meninjau preview yang cocok dengan commitment sebelum menandatangani; jangan menandatangani hash arbitrer sambil diperlihatkan foto lain. Caption yang dapat diedit tidak otomatis menjadi pernyataan yang disetujui.

**Meet Offer** (EIP-712) ditandatangani wallet pembuat dan dibawa dalam QR. Isinya: aksi, Meet ID, ID momen, commitment foto, wallet pembuat, nonce, issuedAt, expiry = issuedAt + 60 detik, event ID opsional, serta domain chain dan contract. **Meet Accept** ditandatangani wallet pemindai sebelum QR kedaluwarsa dan mengikat aksi, digest Offer, dan wallet pemindai. Dengan dua bagian ini, wallet pemindai terikat tanpa perlu diketahui saat Offer dibuat. Signature ini tidak memberi izin membelanjakan aset. Pengguna melihat preview dan penjelasan singkat sebelum signing. EIP-712 menyediakan penandatanganan data terstruktur, bukan perlindungan replay otomatis; state nonce/Meet terpakai harus dirancang eksplisit. [EIP-712](https://eips.ethereum.org/EIPS/eip-712). Detail ABI dan penyimpanan dirinci di `docs/onchain-design.md`.

**Opt-in ditegakkan lewat aksi yang ditandatangani:** peserta yang opt-in menandatangani `RECORD_MEET`; yang tidak menandatangani `OFFCHAIN_MEET`, yang ditolak contract. Nilai yang berlaku adalah pengaturan masing-masing peserta saat ia menandatangani, sehingga client yang dimodifikasi pun tidak dapat mencatat Meet bila salah satu opt-out. UI hanya menampilkan **Not saved onchain** tanpa menyebut siapa.

Contract memeriksa signature sesuai jenis wallet yang benar-benar didukung. EOA dan contract wallet dapat memerlukan jalur berbeda; bila keduanya didukung, gunakan validator teruji dan uji ERC-1271 khusus. Dukungan wallet/provider Mootz belum diuji. [OpenZeppelin cryptography](https://docs.openzeppelin.com/contracts/5.x/api/utils/cryptography).

### Verifikasi MeetRegistry

1. Contract memverifikasi Offer dari pembuat dan Accept dari pemindai yang mengikat digest Offer itu: dua signer berbeda, keduanya beraksi `RECORD_MEET`, domain benar, nonce belum dipakai, dan belum melewati batas waktu. Deadline relayer untuk mengirim catatan adalah kontrol terpisah dari 60 detik QR. Satu wallet yang menandatangani dua kali tidak memenuhi syarat.
2. Satu catatan per Meet ID. Mencatat pasangan wallet, waktu, event ID opsional, dan commitment foto bersalt; tanpa lokasi, URL media, atau nama.
3. Menyediakan jumlah Meet per wallet dan per wallet+event.
4. Accept atas Offer berbeda tidak digabung. Signature login atau otorisasi backend tidak dapat menggantikan tanda tangan peserta.
5. Contract tidak memverifikasi lokasi atau keaslian foto.

### Kejujuran dan penghapusan

Signature membuktikan persetujuan wallet terhadap data tertentu, bukan foto asli, manusia unik, atau kehadiran fisik. Foto dan lokasi tetap di luar chain, tetapi catatan mengungkap pasangan wallet. Salt mengurangi kemudahan mencocokkan foto dari hash publik; ia tidak menjamin anonimitas. Pemindai dapat menolak sebelum menandatangani. Setelah catatan final, UI tidak menjanjikan pembatalan lewat perubahan database; jangan tampilkan tombol seperti Unconfirm. Menyembunyikan Dot, menghapus media, mematikan opt-in, dan riwayat chain adalah proses berbeda.

### Bukti selesai dan batas sprint

Target satu slice: dua akun/perangkat melewati scan QR; QR kedaluwarsa, jarak lebih dari 100 meter, satu signer berulang, Accept atas Offer berbeda, aksi `OFFCHAIN_MEET`, dan replay ditolak; catatan Meet dan kepemilikan koleksi dapat dibaca ulang. Validasi dilakukan pada wallet dan jaringan demo, bukan hanya mock UI. Jika verifikasi dua tanda tangan belum selesai, demo harus menyatakan bagian itu belum bekerja; konfirmasi backend saja tidak disebut catatan onchain.

## 11. Arah pengalaman visual

Referensi navigasi adalah Bump: peta memenuhi layar, identitas teman terasa personal, dan detail terbuka mengikuti pilihan pengguna. Referensi tampilan konten adalah BeReal: foto besar, informasi ringkas, serta fokus pada momen.

Keputusan visual pengguna: gaya dekat Bump yang ekspresif, **ungu tua + ungu muda**, mobile-first dengan adaptasi desktop, UI **English**, serta campuran avatar dan thumbnail pada Map. Gunakan peta terang yang tenang agar foto, kontrol ungu, penanda Dot, dan frame tetap terlihat. Font serta hex spesifik adalah usulan di `docs/design/DESIGN_BRIEF.md`, bukan keputusan terkunci.

Map dan Feed tetap dua tab utama; kamera dua arah, tray selfie reaction, thread komentar, detail streak, layar Meet (QR dan scan), dan ringkasan Dots adalah alur pendukung. Streak dan Dots mudah ditemukan tanpa mengalahkan foto atau menutupi peta. Tidak ada mode tantangan ber-countdown pada versi awal (QR Meet 60 detik adalah pengecualian dan harus menampilkan sisa waktu).

Gerakan mempunyai tujuan:

- Peta bergerak ketika pengguna memilih **Lihat di peta**.
- Dot muncul di peta kedua HP segera setelah Meet valid, dengan gembok bila onchain.
- Pembukaan frame pencapaian diikuti perubahan avatar pada konteks penggunaan sebenarnya.

Status pending, berhasil, dan gagal harus terbaca tanpa mengandalkan animasi saja. Momen scan sampai Dot muncul tidak boleh meminta popup wallet yang membingungkan atau biaya gas dari pengguna. Pada proyektor, foto, Dot, dan perubahan frame harus tetap terlihat jelas. Keyboard/focus, target sentuh, overflow, loading/empty/error, dan reduced motion diperiksa pada implementasi.

## 12. Arsitektur yang direkomendasikan

Prototipe berupa aplikasi web yang nyaman dipakai melalui HP dan dapat ditampilkan di laptop. Arah stack mengikuti tabel berikut. Dukungan dokumentasi dibedakan dari integrasi yang sudah diuji langsung.

### Pilihan stack

| Kebutuhan | Pilihan utama | Catatan integrasi |
|---|---|---|
| Frontend dan API aplikasi | Next.js + TypeScript | Sesuai kemampuan tim; versi paket dikunci saat proyek dibuat |
| Mesin peta | MapLibre GL JS | Marker foto/avatar/Dot, clustering, popup, dan perpindahan kamera |
| Data peta dasar | OpenFreeMap + MapTiler Satellite | Map default tanpa key; Satellite memakai key MapTiler dan kuota Free untuk prototipe; atribusi per sumber tetap ditampilkan |
| Login dan embedded wallet | Privy | Satu identitas login untuk profil serta wallet; typed-data signing untuk Meet perlu diuji di HP |
| Database dan media | Supabase Postgres + Storage | Foto teman menggunakan private bucket; Dots, streak, dan frame pencapaian disimpan di sini |
| Sinkronisasi MVP | Pembaruan lokal + polling API | Realtime ditambahkan setelah jalur otorisasi stabil |
| Pembacaan dan transaksi chain | Viem + Monad Testnet | Chain ID 10143; mainnet 143 jika diperlukan oleh aturan acara |
| Pemindai QR | Pemindai QR web pada kamera HP | Perlu uji di perangkat nyata |
| Contract | Solidity + Foundry: MeetRegistry dan koleksi acara | Pisahkan verifikasi Meet dan mint koleksi; tidak ada contract mata uang atau inventory |
| Pemeriksaan di luar Mootz | Halaman demo penyelenggara + pembacaan RPC | Chain/contract yang sama; autentikasi wallet; tanpa database Mootz |
| Sponsorship | Privy App Pays / relayer | Wallet testnet yang memiliki MON menjadi cadangan demo |
| Hosting | Deployment HTTPS | Provider dan paket dipilih sesuai ketentuan penggunaan |

Tanggung jawab dipisahkan:

- Frontend: Map, Feed, kamera, layar Meet (QR dan scan), profil, frame, penanda/detail acara, koleksi, dan status operasi.
- Backend: profil, pasangan media momen, koleksi selfie, reaction, thread, otorisasi audiens, kalender posting/streak, QR Meet dan cek jarak 100 meter, pembuatan Dot dan aturan visibilitas, unlock frame pencapaian, preferensi opt-in, snapshot/commitment, dan eligibility acara.
- Contract: MeetRegistry (verifikasi dua tanda tangan, pencatatan, hitungan per wallet dan per wallet+event) serta koleksi acara (otorisasi penerbit, supply cap, claim, nontransferable).
- Relayer: mengirim transaksi yang diotorisasi dan membayar gas sesuai kebijakan.
- Halaman demo penyelenggara: mengautentikasi penguasaan wallet, membaca kepemilikan koleksi dan jumlah Meet langsung dari chain.

Database boleh menyimpan cache metadata koleksi untuk mempercepat tampilan, tetapi contract menjadi sumber kebenaran kepemilikan dan hitungan Meet. Cache diperbarui setelah receipt berhasil dan dapat direkonsiliasi.

### Peta: MapLibre, OpenFreeMap, dan MapTiler Satellite

MapLibre menyediakan pola yang dibutuhkan Mootz: custom HTML marker untuk avatar/frame, thumbnail, dan Dot, cluster untuk titik yang berdekatan, popup, serta `flyTo` untuk perpindahan dari Feed ke lokasi posting. Marker sosial dan Dot adalah data milik Mootz yang ditumpangkan di atas peta dasar. Referensi fitur: [contoh MapLibre](https://maplibre.org/maplibre-gl-js/docs/examples/), [HTML clustering](https://maplibre.org/maplibre-gl-js/docs/examples/cluster-html/).

OpenFreeMap menyatakan public instance-nya gratis tanpa registrasi, API key, atau batas jumlah map views/request. Penggunaan komersial diizinkan, tetapi tidak tersedia jaminan SLA. Atribusi data tetap dipertahankan. Warna peta dan kepadatan label dapat disesuaikan melalui style; aplikasi tidak perlu menyalin tampilan Bump secara identik. [OpenFreeMap](https://openfreemap.org/), [quick start dan custom styles](https://openfreemap.org/quick_start/).

**Batas penting:** OpenFreeMap tidak menyediakan pencarian nama tempat/geocoding, perhitungan rute, atau citra satelit. Kelengkapan label dan bangunan di sekitar GIK belum diuji secara visual. Menampilkan peta tidak otomatis menyediakan fitur navigasi atau identifikasi venue. [Batas layanan](https://github.com/hyperknot/openfreemap#limitations-of-this-project).

Keputusan MVP:

- Gunakan lokasi perangkat, pin yang dipilih pengguna, atau daftar venue kecil milik aplikasi.
- Simpan nama venue dan koordinat yang telah diperiksa tim; jangan bergantung pada kelengkapan label peta dasar.
- Pencarian tempat global, ETA, dan rute perjalanan ditunda. Satellite masuk rencana sebagai pilihan latar MapTiler; Map tetap OpenFreeMap. Selector Map style tidak menambah tab utama dan menjaga center/zoom, overlay, filter, serta panel terpilih.
- Gunakan clustering atau daftar momen untuk peserta yang berkumpul di satu gedung; jangan menggeser koordinat secara acak. Dot ditampilkan sebagai area sekitar 200 meter (sel grid, usulan) agar lokasi tepat tidak terbuka.
- Pertahankan instance peta ketika berpindah tab bila memungkinkan.

MapTiler dipilih untuk citra Satellite, dimuat hanya saat mode itu dipilih. Free plan saat pengecekan menyediakan 100.000 API requests/bulan tanpa kartu kredit untuk testing/PoC/prototipe/personal/nonkomersial sesuai ketentuan. **MapLibre langsung dihitung per request, bukan otomatis memakai 5.000 sesi SDK MapTiler**; satu pengguna dapat memuat banyak tile dan bobot request bergantung jenis/ukuran tile. Logo/atribusi wajib dipertahankan. Jika key belum ada atau tile/kuota gagal, beri status jelas dan Use Map tanpa kehilangan konteks; jangan mengklaim satelit gratis tanpa batas. Kualitas citra Jogja belum diuji. Lihat [rencana peta](docs/map-plan.md), [Satellite](https://www.maptiler.com/satellite/), [harga](https://www.maptiler.com/cloud/pricing/), dan [sessions versus requests](https://docs.maptiler.com/guides/account/sessions-vs-requests/).

### Login, wallet, dan akses data sosial

Privy mendukung login email, sosial, serta wallet dan dapat dikonfigurasi untuk jaringan EVM termasuk Monad. Paket gratis yang ditampilkan saat pengecekan mencakup 0–499 pengguna aktif bulanan dan kuota signature. Gas sponsorship mempunyai konfigurasi serta biaya terpisah; dukungannya telah dijelaskan di bagian 10. [Autentikasi Privy](https://docs.privy.io/authentication), [konfigurasi EVM](https://docs.privy.io/basics/react/advanced/configuring-evm-networks), [pricing](https://www.privy.io/pricing).

Login Privy tidak diasumsikan otomatis menjadi sesi Supabase. Rekomendasi integrasi awal:

1. Pengguna login melalui Privy dan memperoleh access token.
2. Frontend mengirim token ke API aplikasi.
3. Backend memverifikasi token, mengidentifikasi pengguna, serta memeriksa pertemanan, audiens momen, akses preview Meet, dan objek yang diminta.
4. Backend membaca/menulis profil serta momen ke Supabase dan menerbitkan akses media yang dibatasi.
5. Wallet pengguna dipetakan ke profil terautentikasi untuk penandatanganan Meet dan klaim koleksi.

Verifikasi token backend didokumentasikan oleh Privy. Dengan jalur ini, pengguna tidak harus menjalani dua login. Kunci layanan database dan kredensial server tetap berada di backend; otorisasi audiens momen dilakukan sebelum backend mengakses data dengan hak layanan. Integrasi third-party JWT langsung ke Supabase dapat dievaluasi setelah alur inti berjalan. [Access tokens Privy](https://docs.privy.io/authentication/user-authentication/access-tokens).

### Foto, storage, dan sinkronisasi Map–Feed

Supabase Free saat pengecekan mencakup 500 MB database dan 1 GB file storage. Free project dapat dipause setelah satu minggu tidak aktif. Realtime Free menyediakan dua juta pesan per bulan dan 200 koneksi bersamaan. Kuota tersebut menjadi titik awal yang layak untuk demo kecil; periksa penggunaan project sebelum acara. [Harga Supabase](https://supabase.com/pricing), [kuota Realtime](https://supabase.com/docs/guides/realtime/pricing).

Foto teman disimpan di **private bucket**. Backend memeriksa akses dan menyediakan signed URL dengan masa berlaku terbatas atau mekanisme terautentikasi yang sesuai. Public bucket hanya untuk aset yang memang boleh publik, seperti aset frame; mengetahui URL file dalam public bucket cukup untuk mengambilnya. [Access model Storage](https://supabase.com/docs/guides/storage/buckets/fundamentals), [access control](https://supabase.com/docs/guides/storage/security/access-control).

Rekomendasi media: kompres foto di perangkat dan buat thumbnail terpisah untuk Map. Target awal sekitar 200-500 KB per foto merupakan anggaran desain yang perlu diuji kualitasnya, bukan batas platform. Simpan pasangan front/back di bawah satu ID momen dan jangan hanya menyimpan gambar kolase.

Usulan entitas: `moment_media` dengan peran front/back, `selfie_library`, `moment_reactions` unik per pengguna+momen, `comments` dengan root/thread ID, `daily_post_events` unik per pengguna+hari (untuk streak), `meets` (Meet ID, pembuat, pemindai, momen, jarak lolos, status onchain, commitment), `dots` (satu per Meet; area tampilan, status sembunyikan), `profile_settings` untuk opt-in onchain, serta `achievement_frames` dan status equip. Seluruh akses mengikuti izin audiens momen dan pemilik media. Lokasi verifikasi Meet memerlukan kebijakan retensi sebelum pengguna nyata. Hapus akun/media harus memperhitungkan referensi dan kebijakan retensi.

Tambahan acara: `organizers`/penerbit, `events`, referensi `event_id` opsional pada momen dan Meet, `event_eligibilities`, dan `event_collections` ke chain+contract+collection ID. Tidak ada tabel circle/grup. Audiens foto ditentukan oleh penulis dan hubungan pertemanan, bukan event_id. Hak membaca detail acara tidak sama dengan hak melihat foto atau hak klaim.

Map dan Feed membaca dataset momen dan Dot serta state pilihan yang sama. Setelah posting atau Meet, aplikasi memperbarui kedua tampilan dari hasil API. Untuk perangkat lain, mulai dengan polling API terautentikasi setiap beberapa detik. Supabase Realtime adalah opsi peningkatan; foto tidak dikirim sebagai payload pesan Realtime.

### Kamera, lokasi, dan hosting

Kamera web melalui `getUserMedia()` dan Geolocation API membutuhkan secure context serta izin pengguna. Pemindaian QR memakai kamera yang sama. Link yang dibuka di HP untuk demo harus menggunakan HTTPS. Alamat HTTP laptop melalui Wi-Fi lokal tidak otomatis memperoleh pengecualian secure context seperti `localhost`. Jika aplikasi dibuka dalam iframe, Permissions Policy juga perlu mengizinkan fitur yang dipakai. [Kamera browser](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/geolocation).

MVP menargetkan pasangan kamera depan + belakang dalam satu sesi. Kemampuan capture serentak pada perangkat demo belum diuji; jalur awal adalah capture berurutan. Pada perangkat dengan satu kamera, tawarkan unggahan dua gambar berlabel atau penjelasan keterbatasan. Cadangan unggahan tidak eligible streak maupun Meet pada aturan awal. Penolakan kamera tidak menghalangi membaca Feed atau komentar; penolakan lokasi tetap memungkinkan posting tanpa lokasi, tetapi Meet memerlukan lokasi foreground pada saat scan. Akurasi GPS di dalam ruangan dapat menggagalkan cek 100 meter dan perlu diuji pada dua HP.

### Monad, RPC, dan pembacaan catatan

Monad Mainnet menggunakan chain ID 143 dan Monad Testnet menggunakan 10143. RPC publik yang diperiksa adalah `https://rpc.monad.xyz` dan `https://testnet-rpc.monad.xyz`. Keduanya berhasil menjawab pembacaan chain ID serta nomor blok. Endpoint publik memiliki rate limit; gunakan satu client bersama, cache pembacaan, dan refresh setelah transaksi. [Fakta jaringan resmi](https://docs.monad.xyz/ai/current-facts), [informasi mainnet](https://docs.monad.xyz/developer-essentials/network-information).

Viem memiliki definisi `monad` dan `monadTestnet`. Untuk jumlah akun dan catatan yang kecil, kepemilikan koleksi dan hitungan Meet dapat dibaca langsung dari contract; indexer terpisah belum diperlukan. Faucet testnet tersedia di `https://faucet.monad.xyz`, tetapi keberhasilan memperoleh dana belum diuji. [Definisi mainnet](https://github.com/wevm/viem/blob/main/src/chains/definitions/monad.ts), [definisi testnet](https://github.com/wevm/viem/blob/main/src/chains/definitions/monadTestnet.ts).

### Status implementasi

Backend dan smart contract tersedia. Frontend produk, konfigurasi deployment, kamera/lokasi dua perangkat dan penerimaan end-to-end masih perlu diverifikasi. Lihat [panduan verifikasi](docs/verification.md).

## 13. Scope MVP dan urutan pemotongan

### Wajib

1. Masuk dengan akun dan wallet; onboarding dengan pengaturan opt-in onchain.
2. Map serta Feed atas kumpulan momen yang sama; Map style memilih Map (OpenFreeMap) atau Satellite (MapTiler) dengan kamera/overlay/filter/pilihan tetap, atribusi, serta fallback jujur.
3. Posting satu pasangan foto depan-belakang, review/retake, caption, dan lokasi opsional.
4. Aksi **Lihat di peta**.
5. Selfie reaction tersimpan yang bisa dipakai ulang, diganti, dan dihapus.
6. Komentar teks ber-thread dengan satu tingkat balasan.
7. Streak pribadi berdasarkan post eligible pertama per hari, tanpa reward atau milestone.
8. Meet: QR 60 detik, tanda tangan dua wallet, preview pemindai, cek jarak ≤ 100 meter, dan penolakan jujur.
9. Dot di peta untuk kedua peserta dengan aturan visibilitas, area ±200 meter, dan opsi sembunyikan; jumlah Dots di profil.
10. MeetRegistry dengan verifikasi dua signature, ikon gembok pada Dot onchain, dan status pending/recorded/not saved.
11. Frame pencapaian dari Dots (minimal First Meet) dengan unlock dan equip yang konsisten di Map, Feed, dan profil.
12. Satu detail acara beserta penanda momen dan filter Map/Feed yang konsisten; filter All sebagai default, Friends, dan Events tanpa tab utama baru.
13. Satu koleksi acara berlabel demo, check-in eligibility, klaim gratis dengan supply cap nyata, serta pemasangan frame.
14. Satu halaman demo penyelenggara (Gathering B) yang mengautentikasi wallet dan membaca kepemilikan koleksi serta jumlah Meet Workshop A langsung dari contract.
15. Tautan transaksi serta status kegagalan yang jelas.

### Tambahan jika alur utama sudah stabil

- Pembaruan momen antardua perangkat secara langsung.
- Pengelompokan pin yang lebih halus.
- Frame Together dan Social Butterfly (setelah First Meet berjalan).
- Tampilan riwayat Meet yang lebih lengkap.
- Transisi dan animasi tambahan.

### Pengembangan lanjutan

- Album dengan unggahan beberapa kontributor.
- Meet lebih dari dua orang sekaligus.
- Dashboard penerbit/pembuatan acara mandiri, pencarian acara global, tiket, pembayaran pendaftaran, agenda sesi, dan integrasi manfaat dengan mitra nyata.
- Chat, komentar media, reaction emoji, dan nesting thread lebih dari satu tingkat.
- Video dan editor media lanjutan.
- Tantangan prompt/notifikasi berjendela waktu, feed-unlock, push notification, pelacakan latar belakang, serta scratch map.
- Revocation catatan onchain di level contract, retensi lokasi, dan perlindungan Sybil yang lebih kuat.

### Di luar scope

Dots sebagai mata uang atau poin, kosmetik berbayar, hadiah uang dari sponsor atau pool hadiah Meet, toples/saldo bersama, konfirmasi lewat undangan jarak jauh, circle/grup, bonus milestone streak, NFT untuk setiap foto, pengenalan wajah/biometrik, kepastian manusia unik, marketplace, trading item, sistem tiket, Event CMS, global place search, dan pelacakan lokasi di latar belakang.

Scope ini lebih besar daripada rancangan enam jam sebelumnya. Estimasi enam jam belum terbukti untuk seluruh fitur. Jangan diam-diam menghapus kamera dua arah, selfie reaction, thread, streak, atau Meet dari produk yang disepakati. Bila waktu tidak cukup, potong animasi tambahan, live realtime, kamera serentak, editor, serta tantangan notifikasi terlebih dahulu; capture berurutan dan polling boleh digunakan. Jangan menambah dashboard penerbit atau sistem tiket. Versi demo yang belum mencakup fitur wajib harus disebut prototipe parsial.

## 14. Demo utama, target sekitar empat menit

Durasi empat menit merupakan target presentasi yang perlu dilatih; durasi pitch resmi mengikuti panitia. Prioritaskan cerita yang koheren dan jangan menyebut alur yang direkam sebagai interaksi live. Semua nilai merupakan fixture/usulan.

1. **Narasi.** Buka dengan: Zenly ditutup dan riwayat penggunanya hilang; Mootz membuat koneksi nyata milik pengguna.
2. **Masuk dan hubungan sosial.** Tampilkan Map di sekitar Demo Workshop A dengan beberapa momen. Buka satu momen, beralih ke Feed, lalu **Lihat di peta**. Onboarding menunjukkan opt-in onchain (default nyala) sekali.
3. **A memposting momen harian.** Ambil belakang dan selfie, review, publish. Streak A menjadi 1, tanpa Dots atau reward. Selfie reaction dan komentar didemokan singkat.
4. **Meet.** A dan B berfoto bersama di Demo Workshop A. A memposting momen lalu membuka QR 60 detik (Meet Offer); B memindai, melihat preview momen itu saja, dan menandatangani Meet Accept. Jarak lolos (≤ 100 meter), keduanya opt-in (`RECORD_MEET`). A dan B sudah di-check-in penyelenggara, sehingga Meet membawa event ID Workshop A.
5. **Dot bergembok.** Dot muncul di peta kedua HP hampir bersamaan, dengan gembok. Jelaskan peran kecepatan Monad dan bahwa foto serta lokasi tidak ada di chain.
6. **Frame pencapaian.** Frame First Meet terbuka dan terpasang pada avatar di Map, Feed, dan profil.
7. **Koleksi acara.** A melakukan check-in, mengklaim koleksi Workshop A gratis, dan memasangnya sebagai frame. Tampilkan penerbit, receipt, dan supply.
8. **Pengenalan pada acara berikutnya.** Buka halaman Demo Gathering B. Autentikasi wallet A, lalu halaman membaca langsung dari chain: A pemilik koleksi Workshop A dengan 1 Meet di Workshop A. Tampilkan juga wallet tanpa koleksi: bukan alumni, tetapi jumlah Meet tetap tampil. Fixture: cap koleksi Demo Workshop A 50. Tidak ada event nyata kedua yang diklaim; manfaat adalah contoh, bukan kerja sama resmi. Perlihatkan state nonholder.

Kalimat penutup pitch:

> Zenly died and took your memories with it. Mootz makes your real-life connections yours forever.

Data seed diberi konteks sebagai contoh. Foto baru, Meet, dan klaim pada alur demo benar-benar dilakukan. Jika jaringan gagal, gunakan rekaman cadangan yang diberi label; jangan menampilkan transaksi simulasi sebagai transaksi berhasil. Jangan mengklaim streak beberapa hari terbentuk selama demo; gunakan fixture berlabel jika perlu.

## 15. Rencana sprint enam jam

Tabel ini adalah prioritas percobaan sprint, bukan jaminan seluruh scope selesai dalam enam jam. Perlu checkpoint setelah kamera dua arah, scan QR plus cek jarak, dan dua signature Meet diuji; kurangi polish lebih dulu, dan nyatakan bagian yang belum selesai secara transparan. Siapkan satu acara melalui konfigurasi/seed; tidak membangun CMS acara. Halaman pembaca independen harus dijadwalkan eksplisit.

Rencana ini mengasumsikan tiga anggota tim. Pembagian adalah rekomendasi tanggung jawab manusia.

| Waktu | Frontend dan visual | Backend dan media | Contract dan wallet |
|---|---|---|---|
| Jam 0–1 | Shell Map–Feed, paired photo, capture dua arah, onboarding opt-in | Skema momen, media, pertemanan/acara, dan event harian | MeetRegistry (draft), koleksi acara, dan lingkungan uji |
| Jam 1–2 | Preview capture, posting, streak profil, layar QR Meet | Publikasi atomik, kalender harian, pembuatan QR dan Meet Offer | Verifikasi dua signature, nonce, dan pembatasan issuer |
| Jam 2–3 | Scan QR, preview pemindai, selfie reaction, thread komentar | Cek jarak 100 meter, pembuatan Dot, visibilitas, library selfie | Deploy, koneksi relayer, supply cap koleksi |
| Jam 3–4 | Dot di peta (gembok), frame pencapaian, detail acara/koleksi | Sinkronisasi Map/Feed, unlock frame, check-in eligibility | Pencatatan Meet, klaim koleksi; halaman pembaca independen |
| Jam 4–5 | Konsistensi layout HP dan state gagal | Uji dua akun, QR kedaluwarsa, jarak gagal, akses thread/eligibility | Uji replay, signer ganda, Accept atas Offer berbeda, `OFFCHAIN_MEET`, supply, dan wallet proof |
| Jam 5–6 | Perbaikan visual terpenting | Stabilisasi alur | Verifikasi jaringan dan transaksi |

Pada jam terakhir, seluruh tim menjalankan demo, memperbaiki kegagalan utama, menyiapkan pitch, dan merekam cadangan. Persiapan kode sebelum acara mengikuti aturan panitia; dokumen ini berfungsi sebagai bahan ideasi dan perencanaan.

## 16. Kriteria penerimaan

- Posting yang sama dapat ditemukan melalui Feed dan Map ketika memiliki lokasi.
- Dua foto tersimpan sebagai satu momen; swap tampilan tidak menciptakan posting baru. Gagal satu upload tidak mempublikasikan pasangan setengah jadi.
- Selfie dapat dibuat, disimpan, dipakai ulang, diganti pada suatu momen, dan dihapus dari reaction tanpa menggandakan hitungan.
- Komentar dan reply muncul pada thread momen yang sama dari Map serta Feed; akses di luar audiens momen, reply lintas momen, dan penghapusan milik orang lain ditolak.
- Post eligible pertama per hari menaikkan streak satu kali; request paralel, retry, dan posting tambahan tidak menaikkannya lagi. Streak tidak menghasilkan Dots, reward, atau bonus milestone.
- Pergantian hari WIB, hari yang terlewat, dan hitungan streak baru diuji dengan clock server terkontrol, bukan jam perangkat demo.
- Unggahan cadangan berlabel tidak diam-diam diperlakukan sebagai capture eligible untuk streak atau Meet.
- Menekan **Lihat di peta** menyorot posting yang benar. Penolakan izin lokasi tidak membuat seluruh aplikasi gagal.
- QR Meet berlaku 60 detik dan hanya dipakai satu pemindai; QR kedaluwarsa atau dipakai ulang ditolak dengan alasan jelas.
- Pemindai hanya melihat preview terbatas atas momen terkait, walaupun bukan teman pembuat; mengetahui ID momen tidak memberi akses ke posting privat lain. Meet tidak membuat pertemanan. Pemindai tidak perlu memiliki momen sendiri.
- Meet hanya dimulai setelah momen terbit (layar Moment posted atau momen sendiri; usulan: hari yang sama); foto galeri tidak eligible untuk streak maupun Meet.
- Pasangan yang sama tidak bisa Meet dua kali di area yang sama pada hari server yang sama (**You already met here today**) dan maksimal 5 Meet per hari (**Daily Meet limit reached**). Tidak ada penggabungan Dot; 1 Meet = 1 Dot.
- Event ID hanya dibawa bila momen bertag acara dan kedua peserta sudah check-in oleh penyelenggara; pemindai yang belum check-in ditolak dengan **Check in to Demo Workshop A first**.
- Syarat "terlihat di foto" dinyatakan sebagai norma sosial, bukan hal yang diverifikasi.
- Meet ditolak bila jarak lebih dari 100 meter atau akurasi lokasi tidak memadai; lokasi hanya diambil foreground pada saat scan.
- Tag tanpa scan tidak menghasilkan Meet; satu Meet hanya untuk dua orang.
- Setiap Meet sah menghasilkan satu Dot untuk kedua peserta; Dot bukan mata uang, tidak dapat ditransfer atau dibelanjakan, dan tidak ada Dots dari posting, streak, reaction, atau komentar.
- Dot terlihat oleh kedua peserta dan teman pembuat momen yang berhak; tidak terlihat oleh teman pemindai yang bukan teman pembuat maupun publik; tampil sebagai area sekitar 200 meter dan hanya bila lokasi momen dibagikan.
- Menyembunyikan Dot menghilangkannya dari peta untuk semua penonton; hanya peserta yang menyembunyikan yang dapat menampilkannya kembali; jumlah di profil tetap dan Dot tampil sebagai **Hidden** di daftar Dots kedua peserta.
- Dot tanpa lokasi momen yang dibagikan tidak muncul di peta, tetapi tampil di kartu momen ("A & B met") dan daftar Dots dengan audiens yang sama.
- Opt-in onchain tampil sekali saat onboarding dengan penjelasan jujur; dapat diubah di profil dan hanya memengaruhi Meet berikutnya.
- Meet dicatat onchain hanya bila kedua peserta opt-in, ditegakkan contract: aksi `OFFCHAIN_MEET` ditolak oleh MeetRegistry meskipun client dimodifikasi. Jika tidak, Dot tetap sah dan UI hanya menampilkan **Not saved onchain** tanpa menyebut siapa yang mematikannya. Dot onchain memiliki ikon gembok.
- MeetRegistry menolak: satu signer yang menandatangani dua kali, signer/domain/chain/contract/nonce salah, aksi `OFFCHAIN_MEET`, Accept yang tidak mengikat digest Offer, signature kedaluwarsa, dan replay. Satu catatan per Meet ID.
- Catatan onchain tidak memuat lokasi, URL media, atau nama; foto dan koordinat pribadi tidak ditulis ke chain.
- Gagal pencatatan onchain tidak menghapus Dot atau momen; status pending/recorded/not saved dibedakan, dan tidak ada tombol yang menjanjikan pembatalan catatan final.
- Frame pencapaian terbuka dari ambang Dots (usulan) dan dapat dipasang; status tersimpan di database dan konsisten di Map, Feed, dan profil. Tidak ada jalur pembelian.
- All hanya menggabungkan momen yang boleh diakses; bukan akses publik terhadap seluruh foto. Filter tidak menggandakan post.
- Pemilihan penanda acara memfilter momen yang sama di Map/Feed tanpa mengungkap posting privat. Melihat detail acara dan menandai acara bukan keanggotaan grup.
- Akun yang dapat melihat acara tetapi tidak memiliki otorisasi klaim tidak dapat memperoleh koleksinya; Dots saja tidak memberi eligibility.
- Hanya signer/penerbit yang diotorisasi dapat menerbitkan klaim koleksi; signature dari campaign, chain, atau contract lain ditolak.
- Supply cap ditegakkan di semua jalur penerbitan, termasuk request bersamaan; klaim ganda/retry tidak menambah item kedua.
- Jendela klaim kedaluwarsa atau supply habis menolak klaim baru, sedangkan item yang sudah dimiliki tetap dikenali.
- Pembatasan transfer koleksi berlaku pada seluruh jalur transfer contract, bukan tombol UI saja.
- Klaim koleksi gratis dan frame acara dapat dipasang konsisten pada Map/Feed.
- Halaman Demo Gathering B membaca chain/contract yang ditentukan (kepemilikan Workshop A dan jumlah Meet di Workshop A) dan tidak memanggil database/API Mootz untuk keputusan; tetap bekerja tanpa endpoint Mootz.
- Halaman manfaat memverifikasi penguasaan wallet; challenge kedaluwarsa, replay, akun berganti, dan sekadar memasukkan alamat pemilik lain tidak memberi akses.
- Loading atau kegagalan RPC tidak ditampilkan sebagai **Not eligible**; akun tanpa item, jaringan salah, dan sesi wallet terputus mempunyai hasil yang berbeda. Meet tanpa opt-in tidak terhitung dan UI menyebutkannya.
- Nama penerbit/manfaat demo diberi label, dan koleksi publik tidak menyertakan foto, komentar, atau koordinat pribadi.
- Peta berhasil dirender pada HP demo dengan marker, Dot, dan atribusi yang terbaca.
- Foto privat tidak dapat diambil tanpa akses yang sesuai; signed URL kedaluwarsa sesuai konfigurasi. Backend menolak token tidak valid serta akses momen di luar audiens.
- Kamera, lokasi, dan scan QR diuji melalui URL HTTPS pada perangkat demo.
- Posting baru dan Dot terlihat pada perangkat kedua melalui polling atau Realtime yang telah diuji.
- Metode sponsorship terpilih berhasil pada jaringan dan akun demo; bila memakai cadangan, wallet uji memiliki testnet MON.
- Tidak ada klaim implementasi, pengenalan wajah, proof of presence yang pasti, atau manusia unik.

Verifikasi difokuskan pada alur dua akun, dua perangkat, transaksi nyata, serta pengujian contract untuk Meet dan klaim koleksi. Ketersediaan provider, batas sponsorship, serta biaya aktual dicatat saat implementasi. Catat mana yang passed, failed, unavailable, dan unverified di `docs/verification.md`.

## 17. Risiko dan respons

| Risiko | Respons untuk prototipe |
|---|---|
| Semua pengguna berkumpul di satu gedung | Kelompokkan pin atau gunakan preview daftar pada satu titik |
| Akurasi GPS di dalam ruangan menggagalkan cek 100 meter | Uji pada dua HP, tetapkan ambang akurasi, tampilkan alasan penolakan, dan sediakan retry |
| Izin kamera ditolak atau front/back gagal | Simpan draft, tawarkan retry/cadangan berlabel; jangan mengarang pasangan capture |
| Scan QR atau kamera gagal pada HP tertentu | Uji perangkat nyata lebih awal; QR dapat dibuat ulang setelah kedaluwarsa |
| Wallet typed-data signing berat di HP atau sponsorship belum stabil | Uji provider lebih awal; siapkan akun uji dengan gas sebagai cadangan transparan |
| Transaksi lambat atau gagal | Tampilkan pending, kegagalan, dan retry; Dot tidak dihapus bila onchain gagal |
| Satu orang dengan dua HP atau kolusi memalsukan Meet | QR 60 detik dan cek jarak hanya mempersulit; batas rate; tidak mengklaim Sybil teratasi |
| Pasangan wallet terlihat publik selamanya | Opt-in dengan penjelasan jujur; foto dan lokasi tidak di chain; tidak ada janji penghapusan |
| Lokasi verifikasi atau area Dot membocorkan tempat | Area ±200 meter, hanya bila lokasi momen dibagikan, bisa disembunyikan, retensi ditetapkan |
| Dot terlihat oleh pihak yang tidak berhak | Aturan visibilitas ditegakkan backend dan diuji (teman pembuat, bukan teman pemindai non-mutual, publik) |
| Produk terasa mirip Bump atau BeReal | Tonjolkan Meet, Dot di peta, dan catatan yang bertahan di luar server Mootz |
| Spam komentar atau selfie yang tidak diinginkan | Otorisasi audiens momen, hapus konten sendiri, rate limit, dan moderasi admin sebelum pengujian publik |
| Streak terasa menekan atau membingungkan | Tampilkan zona hari dan status posting; tidak ada penalti, freeze berbayar, atau countdown palsu |
| Koleksi dibaca sebagai bukti hadir yang pasti | Jelaskan pengesahan oleh penerbit; GPS, Dots, dan selfie bukan bukti fisik independen |
| Label limited tidak sesuai contract | Tetapkan supply cap dan uji semua jalur mint serta klaim paralel |
| Halaman luar hanya memeriksa alamat yang diketik | Autentikasi penguasaan wallet; baca contract yang dipercaya |
| Pengenalan lintas acara bergantung layanan lain | Tulis siapa menyediakan manfaat; independensi catatan tidak menjamin semua layanan mengadopsinya |
| Cakupan terlalu luas untuk enam jam | Potong polish dan fitur opsional dulu; laporkan prototipe parsial, bukan menghapus fitur diam-diam |

## 18. Pengukuran setelah prototipe

Saat uji kecil, ukur apakah peserta dapat memposting, menyelesaikan Meet, memahami opt-in, memakai frame, serta kembali untuk Meet berikutnya. Ukur penyelesaian capture, waktu dari QR tampil sampai Dot muncul, kegagalan scan/jarak/signing/pencatatan, rasio opt-in, penggunaan frame, penggunaan Map dibanding Feed, dan biaya nyata per Meet dan klaim.

Ukur juga return hari berikutnya dan minggu berikutnya, streak yang bertahan, serta reaction dan balasan dari orang lain. Pisahkan minat pada momen teman dari minat mengumpulkan frame. Tanyakan apakah narasi "riwayat tidak hilang seperti Zenly" benar-benar dipahami dan dihargai. Demo satu hari tidak membuktikan retensi.

Untuk konteks acara, ukur berapa peserta berbagi momen, melakukan Meet, menyelesaikan klaim, memakai koleksi, serta kembali pada acara berikutnya. Halaman Demo Gathering B membuktikan pembacaan independen, bukan permintaan pasar atau komitmen kerja sama.

Monetisasi belum menjadi tujuan MVP dan belum ada keputusan; tidak ada model bisnis yang diklaim tervalidasi.

## 19. Referensi produk

- [Bump, App Store](https://apps.apple.com/id/app/bump-real-life-is-happening/id6471519217): referensi tampilan peta dan identitas teman.
- [How Bump works](https://help.bumpmaps.com/en/articles/11420926-how-bump-works): navigasi peta, tempat, dan interaksi sosial.
- [Bump POV](https://help.bumpmaps.com/en/articles/16129163-pov): pembanding fitur kamera sosial dan penyimpanan bersama yang sudah tersedia.
- [BeReal, App Store](https://apps.apple.com/id/app/bereal-photos-friends-daily/id1459645446): referensi foto besar dan reaksi personal.
- [BeReal Memories](https://help.bereal.com/hc/en-us/articles/7531349180829-Memories): referensi arsip kenangan.
- [Zenly shutdown, AlternativeTo](https://alternativeto.net/news/2022/12/zenly-social-mapping-network-shutting-down-on-february-3rd-2023/): Snap menutup Zenly pada 3 Februari 2023; inspirasi peta sosial bersama teman dan narasi pitch.
- [Monad documentation](https://docs.monad.xyz/introduction/why-monad): sumber kemampuan jaringan yang perlu diverifikasi menjelang implementasi.
- [Monad Blitz Jogja Vol. 2](https://luma.com/blitz-jogja-okt-2026): konteks acara dan durasi sprint.

## 20. Keputusan inti untuk dibawa tim

**Mootz adalah aplikasi sosial Map + Feed terinspirasi BeReal dan Zenly/Bump: foto harian depan-belakang untuk teman, selfie reaction, thread komentar, dan streak sebagai tampilan konsistensi tanpa reward. Pertemuan langsung dibuktikan lewat Meet (QR 60 detik, dua tanda tangan wallet, cek jarak 100 meter) dan menghasilkan satu Dot di peta untuk kedua peserta; Dot bukan mata uang. Pencatatan onchain bersifat opt-in sekali saat onboarding dan hanya terjadi bila kedua peserta menyalakannya; hanya MeetRegistry dan koleksi acara yang ada di Monad, sedangkan foto, lokasi, Dots, dan frame pencapaian tetap offchain. Frame berasal dari pencapaian Dots dan koleksi acara; tidak ada Shop. Halaman penyelenggara lain membaca kepemilikan koleksi dan jumlah Meet langsung dari chain. Narasi: Zenly ditutup dan riwayat penggunanya hilang; Mootz membuat koneksi nyata milik pengguna. Batas yang dinyatakan: dua wallet bukan dua manusia, contract tidak memverifikasi lokasi, foto tidak permanen, pasangan wallet terlihat publik, dan catatan lampau tidak bisa dihapus. Backend dan smart contract tersedia; frontend produk dan penerimaan end-to-end masih perlu diselesaikan.**
