# Rencana operasional demo

Status: belum dilaksanakan. Tidak ada deployment, monitoring, backup, audit, atau kesiapan produksi yang diklaim tersedia.

## Sebelum deployment testnet

- Tentukan hosting, region storage/database, RPC/chain/explorer, wallet support, sponsor gas, dan pemilik akun provider.
- Verifikasi HTTPS/login origin, kamera, scan QR, dan lokasi di dua perangkat; environment server/public terpisah.
- Simpan relayer key dan event issuer signer key dalam secret store; dokumentasikan admin authority, rotasi/revocation/pause/upgrade yang benar-benar didukung contract. Anggaran gas relayer (usulan) dan alarm saldo perlu ditetapkan.
- Jalankan pemeriksaan contract/authorization, catat commit/ABI/address/network untuk MeetRegistry dan koleksi acara. Pakai fixture dan dana testnet untuk demo awal.
- Tetapkan retensi lokasi verifikasi (belum diputuskan) dan simpan catatan opt-in per akun serta nilainya saat Meet berlangsung.
- Konfigurasi key browser MapTiler dengan pembatasan origin; pertahankan logo/atribusi dan pantau kuota request Free. Uji citra venue, kegagalan tile, dan Use Map (OpenFreeMap) tanpa kehilangan konteks sesuai [rencana peta](map-plan.md). Paket/lisensi komersial dievaluasi terpisah; tidak ada upgrade berbayar yang diotorisasi oleh rencana ini.
- Pastikan metadata/aset koleksi publik tersedia tanpa signed URL/foto pribadi; foto/selfie tetap privat.

Periksa dokumentasi provider/RPC saat integrasi. Alamat atau konfigurasi contoh bukan bukti integrasi aktif.

## Bukti deployment

Catat URL frontend/halaman Gathering B, commit, chain ID, address MeetRegistry dan koleksi acara, tx deployment/Meet/claim, issuer/cap/role admin tanpa secret. Periksa address/code/network sebelum menguji pembacaan. Bagian mocked atau belum tersedia diberi label eksplisit.

## Pantauan

Pantau auth/upload failure, QR scan dan penolakan jarak, antrean relayer tertunda, tx dropped/reverted, catatan Meet berbeda antara database dan chain, saldo/biaya gas relayer, RPC, supply/claim, dan storage access. Log memakai ID korelasi tanpa token, foto, koordinat, key, atau signed media URL. Ambang alarm/penanggung jawab belum ditetapkan.

## Pemulihan yang harus diuji

| Gangguan | Target recovery |
| --- | --- |
| Satu upload gagal | Draf tersimpan; tidak publish setengah jadi; bersihkan aset yatim sesuai retensi |
| Satellite key/tile/kuota gagal | Status jelas, Retry atau Use Map; kamera/filter/overlay/panel tetap; Feed tetap tersedia; jangan menampilkan Map berlabel Satellite |
| Relayer/RPC gagal | Dot tetap; status onchain pending; retry dengan Meet ID sama setelah cek receipt dan sebelum deadline relayer; tidak ada catatan ganda |
| Cache tertinggal | Reconcile catatan Meet dan kepemilikan koleksi dari chain; Dots, frame, dan streak offchain tidak diubah dari chain |
| Database hilang | Restore backup teruji; replay antrean idempotent; chain bukan backup foto, lokasi, Dots, atau frame |
| Relayer atau issuer key bocor | Hentikan jalur berisiko, rotasi/revocation sesuai kemampuan contract, dokumentasikan dampak |
| Media dihapus | Hapus akses sesuai kebijakan; jangan menjanjikan penghapusan catatan onchain |
| Opt-in diubah | Berlaku untuk Meet berikutnya; catatan lama tidak dihapus |

Backup/restore, retensi, penanggung jawab insiden, monitoring dan rotasi belum diuji. Evaluasi sebelum pengguna nyata. Pelaporan mengikuti [SECURITY](../SECURITY.md).

## Persiapan operasional SC

[sc/README.md](../sc/README.md) menyediakan langkah reproducible test/build/ABI, deployment script dengan guard chain10143, public role configuration dan dry-run sebelum broadcast. [Template deployment](../sc/abi/deployment.template.json) tetap NOT_DEPLOYED dengan address/tx/role null. Bukti lokal tidak boleh dipakai sebagai konfigurasi Monad.

Sebelum deployment: persetujuan INT-01 dan commitment/wallet/relayer policy, toolchain Monad yang sesuai, funded encrypted keystore, role admin/relay/issuer terkontrol, review metadata publik, pemeriksaan RPC/chain/code dan gas. Setelah deployment: receipt + explorer/source verification, dua-wallet Meet/claim dan read independen, lalu isi record deployment tersanitasi dengan commit dan privilege sebenarnya. Tidak ada key/API secret yang dimasukkan artefak. Pengguna memilih lokal saja pada sesi ini; deployment publik dan rotasi role live belum diuji.
