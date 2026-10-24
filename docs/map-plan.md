# Rencana Map dan Satellite

Rencana basemap untuk brief, PRD (ROV-02/04/11/18), dan desain. Ini rencana pengembangan dan handoff desain; belum ada integrasi, konfigurasi API key MapTiler di repo, atau pemeriksaan visual citra venue.

## Satu peta, dua sumber latar

| Bagian | Pilihan | Tanggung jawab |
| --- | --- | --- |
| Mesin peta | MapLibre GL JS | Render peta, kamera, marker, cluster, event interaksi |
| Map (default) | OpenFreeMap | Peta jalan terang; warna disesuaikan dengan identitas Mootz |
| Satellite (opsional saat digunakan) | MapTiler Satellite | Citra satelit sebagai latar alternatif, dimuat hanya saat dipilih |
| Overlay Mootz | API/data Mootz yang telah diotorisasi | Momen, avatar/frame, Dot, venue acara, dan pilihan pengguna |

Kedua mode masuk rencana produk. Mode Satellite adalah pilihan pengguna, bukan aplikasi kedua atau tab utama baru. Default tetap Map. Tidak ada Google Maps dalam rencana ini.

Sumber latar berbeda tidak membuat salinan momen atau Dot. Overlay memakai ID dan koordinat tampilan yang sama; data, filter, dan izin akses tetap milik Mootz.

## Perilaku pengguna

1. Pengguna membuka tab Map dengan peta jalan OpenFreeMap.
2. Kontrol **Map style** membuka pilihan **Map** dan **Satellite**. Gunakan sheet kecil pada HP dan popover pada desktop; jangan menyerupai tab utama Map | Feed.
3. Saat memilih Satellite, latar berubah tanpa mereset center, zoom, bearing/pitch yang didukung, filter All/Friends/Events, momen/Dot terpilih, atau panel detail yang terbuka.
4. Marker foto/avatar, frame, cluster dan area Dot tetap tersedia dalam kedua mode. Cluster dihitung dari data yang sama, bukan angka fixture baru.
5. Kembali ke Feed dan View on map mempertahankan pilihan mode selama sesi. Preferensi antarsesi belum diperlukan pada MVP.

Tema terang kustom adalah arah visual default. Pemilihan style OpenFreeMap final dan kualitas/resolusi citra di venue Jogja perlu diuji. Jangan menjanjikan citra terbaru atau detail bangunan tertentu sebelum pemeriksaan visual.

## Loading, kegagalan, dan fallback

| Keadaan | Perilaku / copy English |
| --- | --- |
| Mode sedang dimuat | **Loading satellite...**; shell dan konteks terpilih tetap ada; jangan tampilkan keadaan kosong |
| Key Satellite belum dikonfigurasi | Opsi Satellite disabled dengan **Satellite isn't available yet.**; Map tetap dapat dipakai; catat sebagai slice belum selesai |
| Tile/network/provider gagal atau kuota habis | **Satellite couldn't load. Try again or use Map.** dengan **Retry** dan **Use Map** |
| Fallback ke Map | Pertahankan kamera, filter, overlay, dan pilihan; selector harus menunjukkan Map sesuai latar aktual |
| Kedua sumber tidak tersedia | Pertahankan shell dengan Retry dan Open feed; kegagalan peta tidak menghalangi Feed |

Jangan menyebut Map sedang tampil sebagai Satellite, atau memakai screenshot satelit sebagai pengganti integrasi live. Percobaan ulang tidak membuat Meet/Dot baru dan tidak mengubah status onchain.

## Batas teknis dan privasi

- Pilihan basemap terpisah dari state momen, Dot, filter, panel, dan kamera. Saat mengganti style MapLibre, pulihkan source/layer overlay dan handler yang hilang setelah style siap; kelola custom markers tanpa duplikasi. Simpan kamera agar pergantian latar tidak memulai tampilan dari awal.
- Muat tile MapTiler hanya ketika Satellite dipilih. Map biasa tetap menggunakan OpenFreeMap. Hal ini membatasi pemakaian MapTiler pada mode satelit; jumlah request nyata tetap perlu diukur.
- `NEXT_PUBLIC_MAPTILER_API_KEY` adalah konfigurasi browser yang sengaja terlihat oleh client, bukan secret server. Batasi penggunaan key ke origin localhost/demo/production yang benar lewat pengaturan provider; jangan menanam key aktual di repo atau mencetak key ke log. Key relayer/issuer tetap hanya di server.
- Pertahankan atribusi OpenFreeMap/OpenStreetMap pada Map; pada Satellite tampilkan logo/atribusi MapTiler serta sumber imagery sesuai style dan ketentuan provider. Sheet, tombol, dan safe area tidak menutupi atribusi.
- Kedua mode hanya menerima data Mootz sesuai audiens. Koordinat presisi untuk verifikasi jarak Meet tidak dikirim menjadi payload marker. Gunakan area tampilan Dot yang sudah digeneralisasi di backend; menggambar lingkaran 200 m di atas koordinat rahasia yang ikut dikirim tidak cukup melindunginya.
- Hide from map, Dot tanpa lokasi, dan izin preview berlaku identik pada kedua mode. Sumber tile pihak ketiga tetap menerima request area peta yang sedang dilihat; jangan menjanjikan semua informasi lokasi tidak pernah keluar ke penyedia peta.
- Tidak menambah Places/geocoding, rute/ETA, Street View, tracking teman, penyimpanan tile offline/bulk, atau verifikasi fisik. Cek jarak 100 m tetap di backend dengan lokasi foreground kedua HP, terpisah dari mode peta.

## Kuota dan penggunaan

Periksa kuota dan ketentuan paket MapTiler yang berlaku sebelum konfigurasi. Peta harus mempertahankan logo/atribusi. Pada paket Free, layanan dipause saat kuota habis sampai bulan berikutnya atau upgrade; tidak diasumsikan gratis tanpa batas.

Dengan MapLibre langsung, traffic MapTiler dihitung per request, bukan otomatis sebagai 5.000 sesi SDK MapTiler. Satu kunjungan dapat memuat banyak tile saat pan/zoom; beberapa jenis/ukuran tile memiliki bobot request berbeda. Periksa Analytics, pembatasan key, jenis tile, dan aturan terbaru saat integrasi. Evaluasi paket/lisensi kembali sebelum penggunaan komersial; tidak ada akun, billing, atau upgrade berbayar yang dibuat oleh dokumentasi ini.

OpenFreeMap menyatakan public instance gratis tanpa API key dan tanpa batas map views/request; tidak ada SLA yang dijanjikan. Fallback default tetap Map, bukan pindah otomatis ke sumber satelit lain yang belum dikonfigurasi.

## Bukti penerimaan yang belum diuji

Seluruh runtime berikut **UNVERIFIED**:

- Pada HP dan desktop, pilih momen/Dot dengan filter aktif; ganti Map → Satellite → Map tanpa kehilangan kamera, panel, ID terpilih, marker, frame, atau filter.
- Marker/cluster tidak hilang atau terduplikasi setelah pergantian berulang; overlay tetap terbaca di latar terang maupun citra gelap/ramai. Atribusi terlihat pada kedua mode.
- Lakukan pan/zoom, kembali dari Feed lewat View on map, dan buka detail Dot/Event dalam kedua mode.
- Simulasikan key kosong/invalid, kegagalan tile, kuota, serta request lambat; fallback Use Map tidak menghapus konteks dan tidak menampilkan sukses palsu.
- Periksa network: Map default tidak meminta tile MapTiler; Satellite hanya memakai kredensial publik yang dibatasi origin; jangan membocorkan lokasi verifikasi atau media di luar audiens.
- Buktikan Dot hidden/tanpa lokasi tetap tidak muncul pada kedua basemap dan tidak bocor lewat response API. Bandingkan data kedua mode, bukan hanya visibilitas ikon.
- Cek citra area venue Jogja pada zoom demo dan catat hasil/limitasi. Ukur request aktual pada pola pan/zoom demo; tidak ada estimasi kuota per pengguna yang dianggap sudah terbukti.

Catat hasil di [verifikasi](verification.md). Build/test/audit dependency belum tersedia karena repository masih dokumentasi saja.

## Rujukan primer

- [OpenFreeMap dan pilihan style](https://openfreemap.org/quick_start/).
- [MapTiler Satellite](https://www.maptiler.com/satellite/).
- [Paket dan kuota MapTiler](https://www.maptiler.com/cloud/pricing/).
- [Perhitungan sessions vs requests](https://docs.maptiler.com/guides/account/sessions-vs-requests/).
- [Contoh MapLibre](https://maplibre.org/maplibre-gl-js/docs/examples/).
