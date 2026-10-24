# Alur pengguna dan demo

Status: skenario penerimaan, belum tersedia sebagai aplikasi. Baseline brief, PRD, desain. UI English; penjelasan dokumen memakai bahasa Indonesia. Angka dan ambang adalah fixture/usulan.

## Onboarding dan opt-in onchain (ROV-01, ROV-12)

Login → wallet terpetakan ke akun → layar opt-in sekali: "Record your Meets onchain" (default nyala).

Penjelasan yang ditampilkan: siapa pun dapat melihat wallet mana yang bertemu dan kapan, selamanya; foto dan lokasi tetap privat. Pengaturan dapat diubah di profil dan hanya berlaku untuk Meet berikutnya; catatan lama tidak bisa dihapus. UI tidak menjanjikan penghapusan riwayat chain. Mematikan opt-in tidak mematikan Meet atau Dot.

## 1. Posting harian (ROV-03, ROV-04, ROV-07)

Login → kamera → foto belakang dan depan → preview/retake/swap → lokasi opsional → publish ke audiens teman.

Publikasi menunggu kedua foto valid. Jika satu upload gagal, draf tetap ada dan belum muncul sebagai post setengah jadi. Tanpa lokasi tetap terlihat di Feed. Capture berurutan diperbolehkan dan tidak diklaim simultan. Upload dari galeri diberi label dan tidak eligible streak maupun Meet.

Post eligible pertama pada hari server (Asia/Jakarta, usulan) menaikkan streak tampilan satu kali. Streak hanya tampilan konsistensi: tanpa Dots, reward, claim, atau milestone, dan tidak menunggu teman atau chain. Posting kedua di hari sama tidak menambah streak. Scan QR teman bukan posting harian sendiri.

## 2. Meet (ROV-08, ROV-09, ROV-12, ROV-13, ROV-18)

Meet dimulai setelah momen terbit: dari layar "Moment posted" atau momen sendiri di hari yang sama (usulan). A (pembuat) memotret B → A membuka QR Meet → A menandatangani **Meet Offer** (aksi, meetId, momentId, commitment foto, wallet A, nonce, issuedAt, expiry = issuedAt + 60 detik, event ID opsional); Offer ada di dalam QR → B memindai (satu pemindai per QR) → B melihat preview momen itu saja, walau bukan teman A → B menandatangani **Meet Accept** (aksi, digest Offer, wallet B) sebelum QR kedaluwarsa, atau menolak → kedua HP mengirim lokasi foreground sekali → backend cek jarak → Dot dibuat → catatan onchain bila kedua opt-in.

Syarat "terlihat di foto" adalah norma sosial yang dinyatakan kedua pihak, bukan hal yang diverifikasi. B tidak perlu punya momen sendiri, dan Meet tidak membuat pertemanan. Tag tanpa scan bukan Meet. Satu Meet = dua orang; pasangan yang sama boleh Meet lagi di hari yang sama hanya di area ±200 m berbeda, maksimal 5 per hari server. Tidak ada pelacakan latar belakang. Lokasi verifikasi berbeda dari lokasi yang ditampilkan. Penandatanganan harus tanpa popup wallet yang membingungkan dan tanpa biaya gas bagi pengguna (relayer, usulan). Dari scan sampai Dot muncul harus terasa instan; tidak ada angka kecepatan yang diklaim tercapai.

Opt-in ditegakkan lewat tanda tangan: peserta yang opt-in saat menandatangani memakai aksi `RECORD_MEET`; yang tidak memakai `OFFCHAIN_MEET`, yang ditolak contract. Nilai yang berlaku adalah pengaturan masing-masing saat ia menandatangani. UI hanya menampilkan "Not saved onchain" tanpa menyebut siapa.

| Keadaan | Perilaku UI |
| --- | --- |
| QR active | Hitung mundur 60 detik; satu pemindai |
| QR expired | QR tidak bisa dipakai; A membuat QR baru dengan Offer baru |
| Accept setelah QR expired | Ditolak; B perlu QR baru |
| QR sudah dipakai pemindai lain | Ditolak dengan pesan jelas |
| Scanned | B melihat preview momen terkait saja; belum ada Dot |
| Declined | B menolak sebelum menandatangani; tidak ada Meet |
| Signed | Offer dan Accept (digest Offer sama) dari dua wallet berbeda; lanjut cek jarak |
| Distance failed | Alasan ditampilkan: terlalu jauh (> 100 m) atau akurasi lokasi kurang; coba lagi dengan QR baru bila QR kedaluwarsa |
| Already met here | "You already met here today" untuk pasangan yang sama di area yang sudah dipakai hari itu; tidak ada Dot kedua |
| Daily limit | "Daily Meet limit reached" setelah 5 Meet pasangan yang sama dalam satu hari server |
| Event check-in ditolak | Momen bertag acara tetapi pemindai belum check-in: "Check in to Demo Workshop A first" |
| Meet valid / Dot created | Dot muncul di kedua HP; tidak bergantung pada status chain |
| Onchain pending | Dot sudah ada, gembok belum final; relayer mengirim |
| Onchain recorded | Dot diberi gembok; status sesuai receipt |
| Not saved onchain (opt-out) | Salah satu atau kedua peserta mematikan opt-in; Dot tetap sah tanpa gembok, tanpa menyebut siapa |
| OFFCHAIN_MEET dikirim ke contract | Ditolak contract; tidak ada catatan onchain; Dot tetap |
| Relay failed | Dot tetap; retry dengan Meet ID sama; tidak ada catatan ganda |
| Accept atas Offer berbeda / satu signer berulang | Ditolak; Offer dan Accept baru diperlukan |

Event ID dibawa hanya bila momen bertag acara itu dan kedua peserta sudah check-in oleh penyelenggara (demo: fixture/halaman penyelenggara). Foto adalah bukti visual; signature membuktikan persetujuan wallet, bukan verifikasi wajah, keaslian foto, atau kepastian hadir fisik. Dua wallet tidak membuktikan dua manusia, dan satu orang dengan dua HP masih dapat memalsukan Meet. Contract tidak memverifikasi lokasi. Gagal chain tidak menghapus momen terbit maupun Dot.

## 3. Dots dan frame (ROV-10, ROV-11, ROV-14)

Meet sah → Dot "A & B were here" → profil menampilkan jumlah Dots → frame pencapaian terbuka → equip → cek frame sama di Map, Feed, profil → refresh.

Dot bukan mata uang: tidak ditransfer, tidak dibelanjakan, disimpan offchain. Satu Meet = satu Dot; tidak ada penggabungan Dot.

Visibilitas: terlihat oleh kedua peserta dan teman A yang berhak melihat momen itu. Tidak terlihat oleh teman B yang bukan teman A, dan tidak publik. Lokasi tampil sebagai area sekitar 200 m dan Dot hanya muncul di peta bila lokasi momen dibagikan; tanpa lokasi, Dot tetap tampil di kartu momen ("A & B met") dan daftar Dots dengan audiens sama. Salah satu peserta dapat menyembunyikan Dot dari peta untuk semua penonton; hanya yang menyembunyikan yang dapat menampilkannya lagi. Dot tersembunyi tetap terhitung di profil dan tampil sebagai Hidden di daftar Dots kedua peserta.

Frame pencapaian (ambang usulan): First Meet (1 Dot), Together (10 Dots), Social Butterfly (Meet dengan 5 teman berbeda). Unlock dan equip disimpan offchain; frame aktif konsisten di Map/Feed/profil. Tidak ada tempat membeli frame.

Fixture demo: A dan B memiliki 1 Dot → First Meet terbuka → A memasangnya.

Selfie reaction dan komentar tersedia pada momen berizin, tanpa Dots tambahan. Library selfie dapat dipakai ulang; satu reaction aktif per akun+momen dan satu tingkat reply.

## 4. Event dan kenangan komunitas (ROV-15, ROV-16, ROV-17)

Event Demo Workshop A → organizer/waktu/tempat → check-in organizer → claim koleksi gratis jika eligible dan stok tersedia → equip sebagai frame → detail asal kenangan.

Fixture: koleksi Demo Workshop A bercap 50. Claim gratis sekali per akun; duplicate, expired, atau sold-out ditolak. Koleksi nontransferable dan tidak otomatis dari Meet. Meet yang terjadi dalam konteks acara membawa event ID. Event tag tidak memperluas audiens foto atau membuktikan hadir.

Halaman penyelenggara Demo Gathering B → autentikasi penguasaan wallet → direct contract read: kepemilikan koleksi Workshop A dan jumlah Meet onchain di Workshop A → kartu alumni demo untuk holder, misalnya "1 Meet recorded at Workshop A". Tanpa koleksi: bukan alumni, tetapi jumlah Meet tetap ditampilkan. Catatan umum: Meet yang tidak disimpan onchain tidak terhitung. Nonholder mendapat status belum eligible; RPC error memberi retry, bukan keputusan palsu "tidak memiliki".

Tidak ada klaim kerja sama, diskon, admission, atau acara nyata. Gathering B adalah konteks halaman independen, bukan platform acara kedua.

## Map style: Map dan Satellite

Tab Map → Map style → Map (OpenFreeMap, default) atau Satellite (MapTiler). Yang berubah hanya latar; center/zoom, filter, momen/Dot terpilih, marker/frame/cluster, dan detail tetap. Pilihan mode dipertahankan selama sesi termasuk kembali lewat View on map. Ini kontrol sekunder, bukan tab ketiga.

Saat memuat tampil Loading satellite...; key belum tersedia menonaktifkan opsi dengan alasan. Jika tile/provider/kuota gagal, tawarkan Retry dan Use Map tanpa kehilangan konteks. Atribusi sumber tetap terbaca. Dot hidden/tanpa lokasi tidak muncul di mode mana pun; mode Satellite tidak membuka audiens atau lokasi verifikasi. Lihat [rencana peta](map-plan.md). Seluruh alur ini belum diimplementasikan.

## Navigasi dan privasi

Map/Feed dua tab utama; All filter awal konten berizin; Friends/Events filter tambahan. Tidak ada circle/group. Perubahan tab mempertahankan ID momen/state sosial. QR hanya membuka preview momen terkait; marker, Dot, URL, dan event tag tidak melewati kontrol akses. Mengetahui ID momen tidak memberi akses.
