# Rancangan demo pitch Mootz

Rancangan presentasi, bukan bukti fitur sudah berjalan. Mengikuti [alur pengguna](user-flows.md), [keputusan produk](decisions.md), dan PRD ROV-03, ROV-08–ROV-18.

## Cerita dan keputusan demo

“Aku pernah ikut Vol. 1. Hari ini aku datang ke Vol. 2, berbagi momen, bertemu teman, lalu membawa pulang koleksi baru yang bisa dikenali di luar Mootz.”

Dua akun sudah login dan sudah check-in pada Event Vol. 2 sebelum presentasi, sesuai keputusan pengguna. Tidak mendemokan antrean, approval penyelenggara, login, atau onboarding. Sebutkan persiapan ini secara singkat; badge Vol. 1 tidak dipakai untuk mengklaim check-in Vol. 2 berlangsung otomatis.

Label Monad Blitz Vol. 1/Vol. 2 adalah konteks skenario demo. Bila penerbitan koleksi atau kerja sama belum diotorisasi penyelenggara, tampilkan `Demo event` dan `Demo collectible`; jangan menyiratkan badge resmi atau manfaat/admission yang telah disepakati.

## Kondisi awal dua perangkat

| Bagian | Akun A: presenter | Akun B: teman/pemindai |
| --- | --- | --- |
| Sesi | Sudah login; wallet tetap | Sudah login; wallet berbeda |
| Hubungan | A dan B sudah berteman | A dan B sudah berteman |
| Event Vol. 2 | Sudah check-in oleh organizer | Sudah check-in oleh organizer |
| Koleksi Vol. 1 | Sudah memiliki; fixture berlabel bila simulasi | Tidak wajib memiliki |
| Koleksi Vol. 2 | Belum pernah klaim | Tidak harus klaim saat demo |
| Meet pasangan ini | Belum Meet di area verifikasi tersebut pada hari server berjalan; kuota belum habis | Kondisi yang sama |
| Opt-in | Aktif; presenter memahami pasangan wallet akan publik | Aktif; pemindai memahami persetujuan |
| Izin | Kamera dan lokasi foreground sudah diizinkan | Kamera dan lokasi foreground sudah diizinkan |
| Lokasi | Kedua HP berdekatan, akurasi memadai | Jarak maksimal 100 m saat scan |

Acara berada dalam jendela waktu yang valid, klaim terbuka, supply masih tersedia, dan issuer serta kontrak/jaringan yang dipakai telah diverifikasi. Siapkan sponsor gas atau akun uji yang didanai sesuai integrasi aktual; jangan mengasumsikan gas gratis tanpa bukti.

## Alur utama, target 90 detik

Durasi adalah anggaran latihan, bukan benchmark aplikasi. Jika pitch total 3 menit, alokasikan sekitar 90 detik untuk penjelasan slide. Demo dimulai setelah slide Meet; kembali ke slide Event dan penutup setelahnya.

| Waktu | Layar / tindakan | Narasi presenter dalam bahasa Inggris | Hasil yang diperlihatkan |
| --- | --- | --- | --- |
| 0–5 dtk | Landing → Open app | “Let’s see how Mootz fits into a real gathering.” | Masuk ke Map/Feed tanpa login ulang |
| 5–15 dtk | Pilih Event Vol. 2 | “We’ve already checked in both demo accounts.” | Detail acara dan status Checked in; tidak menekan Join/approval lagi |
| 15–22 dtk | Buka ringkasan koleksi Vol. 1 milik A, lalu kembali | “I’m bringing a collectible from our previous demo event.” | Asal/penerbit koleksi lama terlihat; ini konteks cerita, bukan bukti hadir pasti |
| 22–42 dtk | Dari Event, buka capture; ambil belakang dan selfie; review dan publish | “I share a moment from today’s event with my friends.” | Dua foto terbit sebagai satu momen dengan tag Vol. 2; lokasi dibagikan agar Dot dapat tampil di peta |
| 42–62 dtk | A membuka QR baru; B scan, preview, lalu setuju | “My friend scans and confirms our Meet.” | Offer dan Accept dari dua wallet, QR belum kedaluwarsa, lokasi lolos; event ID Vol. 2 pada Meet |
| 62–70 dtk | Tampilkan Dot / kartu momen pada kedua HP | “One Meet creates one Dot for both of us.” | Satu Dot bersama, bukan dua Meet; status chain ditampilkan terpisah |
| 70–83 dtk | A membuka koleksi Event → claim → tampilkan koleksi baru | “Because I’m checked in, I can claim the event collectible.” | Claim gratis untuk akun eligible; koleksi Vol. 2 muncul setelah hasil yang benar-benar terkonfirmasi |
| 83–90 dtk | Buka halaman organizer independen yang sudah disiapkan; baca koleksi Vol. 2 dan Meet | “Another organizer can recognize these records directly from Monad.” | Ownership Vol. 2 dan 1 Meet Vol. 2 bila keduanya sudah tercatat; pembacaan langsung dari contract |

Untuk klaim waktu 90 detik, uji dulu capture, signing, receipt, serta pembacaan independen pada dua HP. Jendela tujuh detik terakhir hanya layak bila halaman reader dan sesi bukti penguasaan wallet sudah disiapkan. Jika latihan melampaui waktu, hilangkan tampilan koleksi Vol. 1 dan singkatkan landing terlebih dahulu. Jangan memotong pemeriksaan, tanda tangan, atau menampilkan transaksi belum final sebagai berhasil.

Jika belum ada tombol capture dari detail Event, gunakan tombol capture yang benar-benar tersedia lalu pilih tag Event sebelum publish. Nama tombol dalam rancangan merupakan usulan copy, bukan klaim UI sudah ada.

## Tiga hubungan yang harus jelas

| Pemicu | Hasil | Tidak bergantung pada |
| --- | --- | --- |
| Meet sah | Satu Dot offchain untuk kedua peserta | Berhasilnya transaksi onchain atau klaim koleksi |
| Offer dan Accept sama-sama RECORD_MEET | Meet dapat direkam di Monad | Foto atau lokasi ditulis ke chain |
| Check-in/eligibility yang disahkan + claim valid | Koleksi acara gratis, nontransferable | Jumlah Dots atau membuat Meet terlebih dahulu |

Koleksi adalah kenang-kenangan acara, bukan payout, mata uang, atau hadiah finansial. Urutan claim setelah Meet dipilih untuk cerita demo, bukan syarat eligibility baru. Tidak ada mint otomatis karena Meet.

Badge Vol. 1 menunjukkan kepemilikan koleksi yang diterbitkan untuk akun itu. Ia tidak membuktikan kehadiran fisik secara pasti, tidak membuka foto privat, dan tidak otomatis memberikan akses Vol. 2. Pada skenario ini akses Vol. 2 sudah disiapkan lewat check-in organizer.

## Bukti onchain di akhir

Halaman reader terpisah mengautentikasi penguasaan wallet A dan membaca kontrak terpercaya di jaringan yang ditentukan. Tidak mengambil keputusan alumni/ownership/jumlah Meet dari inventory API atau database Mootz. Jangan menerima alamat yang diketik sebagai bukti penguasaan wallet.

Nilai target demo: A memiliki koleksi Vol. 2 dan memiliki satu Meet onchain dalam Event Vol. 2. Tampilkan alamat contract, jaringan dan receipt melalui detail bila perlu, tanpa menghabiskan waktu pitch membuka explorer. Kepemilikan Vol. 1 dapat ditampilkan sebagai konteks tambahan.

Gembok/status Recorded hanya tampil setelah receipt sesuai integrasi. Dot dibuat lebih dulu dan tetap ada ketika pencatatan gagal. Jika Meet masih pending, reader tidak boleh menampilkan count 1 secara simulasi. Klaim yang belum final juga tidak boleh ditampilkan sebagai koleksi sudah dimiliki.

## Latihan dan pemulihan

- Satu orang mengoperasikan A dan berbicara; satu orang siap di perangkat B. Jangan memindahkan kamera utama bolak-balik tanpa rencana. Proyeksikan A, lalu tunjukkan konfirmasi B singkat atau gunakan tampilan dua perangkat yang sudah diuji.
- Buka QR hanya ketika B sudah siap scan. Setelah 60 detik, buat Offer/QR baru; jangan memakai tangkapan QR lama.
- Latihan sukses memakai pasangan dan area yang sama akan memblokir Meet ulang di hari server yang sama. Gunakan pasangan akun latihan terpisah dari pasangan presentasi. Jangan menonaktifkan pembatasan produk atau menghapus catatan onchain agar terlihat baru.
- Sesudah latihan claim, akun tersebut tidak bisa claim koleksi sama lagi. Sisakan akun A presentasi yang eligible namun belum klaim; gunakan akun latihan atau acara demo terpisah untuk rehearsal.
- Jika GPS gagal, tampilkan pesan sebenarnya dan retry bila waktu cukup. Jangan memalsukan hasil jarak. Gunakan rekaman cadangan berlabel jika dibutuhkan.
- Jika chain lambat, lanjutkan menunjukkan Dot dengan status Pending; klaim dan reader ditampilkan sesuai state nyata. Rekaman transaksi sukses sebelumnya harus disebut rekaman, bukan live.
- Sediakan rekaman cadangan singkat dari alur yang benar-benar berhasil, berlabel `Recorded demo`. Jangan menyimpan atau mengunggah rekaman pribadi, lokasi, kunci, atau foto asli ke repository.

## Selesai bila

Rancangan siap menjadi demo live setelah dua akun check-in benar-benar tersedia, publikasi foto pasangan berhasil, Offer/Accept dan lokasi lolos, satu Dot terlihat pada kedua akun, claim eligible tercatat, serta reader independen mengenali ownership dan Meet count dari kontrak. Catat bukti dan keterbatasan di verifikasi yang berlaku. Dokumen ini sendiri tidak membuktikan integrasi tersebut selesai.
