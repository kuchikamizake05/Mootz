# Deploy Mootz ke VPS Linux

Status: paket persiapan, belum deployment publik. Target satu API dan PostgreSQL/PostGIS; foto tetap Supabase. Tidak menjalankan worker transaksi atau seed demo. Jangan menyalin password development ke server.

## Sebelum besok

Siapkan izin pemilik VPS, akses SSH pribadi, Docker Engine + Compose plugin, Git, subdomain API dan origin FE. Rencana awal kapasitas2vCPU/4GBRAM; ukur penggunaan sesudah berjalan. Pastikan disk cukup untuk database, image dan backup. Clone repo privat memakai akses baca terbatas. Jangan mengubah layanan temanmu atau memasang ulang Docker tanpa koordinasi.

DNS A harus menunjuk VPS; buat AAAA hanya bila IPv6 benar-benar berfungsi. Buka80/tcp dan443/tcp (443/udp opsional HTTP3), SSH hanya sesuai kebijakan pemilik. Jangan buka3001/5432. Caddy membutuhkan domain publik dan port yang dapat dijangkau untuk sertifikat. Jika80/443 sudah dipakai Nginx/Traefik milik teman, jangan hentikan proxy itu: gunakan proxy yang ada dengan upstream Docker yang disepakati, lalu sesuaikan Compose sebelum deploy. File ini mengasumsikan80/443 tersedia.

## Konfigurasi pribadi

Di root checkout Linux:

```sh
cd be/deploy/vps
umask 077
test -e .env || cp .env.example .env
chmod 600 .env
openssl rand -hex 32
# Edit .env dengan editor server; jangan tempel secret ke chat/Git.
```

Gunakan hasil random sebagai POSTGRES_PASSWORD baru (hex menghindari escaping URL). Isi API_DOMAIN hostname saja, ACME_EMAIL, ALLOWED_ORIGINS persis origin FE HTTPS, Privy app ID/public verification key, Supabase origin/server secret/bucket. Public JWKS JSON dapat ditulis single-quoted; PEM memakai literal backslash-n. Untuk nilai yang mengandung dollar, gunakan single quote agar Compose tidak menginterpolasinya. Jangan mencetak `docker compose config` biasa karena hasilnya memuat secret; pakai `config --quiet`.

Pengaturan ALLOWED_ORIGINS dan Privy allowed origins harus mencakup origin FE sesungguhnya. WALLET_PROOF_DOMAIN otomatis memakai API_DOMAIN; proof lama dari localhost perlu diterbitkan ulang. Supabase bucket harus private dan readiness storage perlu diverifikasi. Pilih environment/provider project terpisah jika perlu isolasi data demo dan produksi. Mengubah password env tidak mengganti password role pada volume PostgreSQL yang sudah diinisialisasi: lakukan rotasi terencana, jangan hapus volume.

Biarkan semua pasangan RPC/address serta issuer key kosong sampai Diaz memberi deployment terverifikasi. API dasar bisa online; Meet/collection yang belum dikonfigurasi mengembalikan unavailable. Tidak ada relayer key dalam service API. Worker sekali-jalan/penjadwalan dan transaksi nyata adalah langkah terpisah setelah role, funding, dan runbook recovery diterima. Jangan menyalakan transaksi sebagai bagian smoke check ini.

## Deploy pertama

Jalankan dari be/deploy/vps, gunakan file Compose ini secara eksplisit:

```sh
docker compose --env-file .env -f compose.yaml config --quiet
docker compose --env-file .env -f compose.yaml build api
docker compose --env-file .env -f compose.yaml up -d --wait db
docker compose --env-file .env -f compose.yaml --profile tools run --rm migrate
docker compose --env-file .env -f compose.yaml up -d --wait api caddy
docker compose --env-file .env -f compose.yaml ps
```

Simpan SHA commit yang dideploy, tanggal dan imageID (`docker image inspect mootz-backend:vps --format '{{.Id}}'`). Tidak ada auto-migration/seed di startup. Tag image, Caddy2 dan PostGIS17-3.5 perlu dipin ke digest yang sudah diuji pada server sebelum produksi jangka panjang; update image terencana, jangan mengasumsikan tag immutable.

Setelah DNS dan HTTPS aktif, cek `https://<API_DOMAIN>/health`, `/ready`, `/ready/storage`; semua harus200. `/v1/me` tanpa bearer harus401 (bukan data pengguna). Uji login FE, CORS origin tepat dan upload pasangan sintetis tanpa data pribadi. Periksa endpoint dengan origin yang tidak diizinkan ditolak. Tidak ada klaim runtime publik hanya karena config/build lulus. Caddy access logging tidak dinyalakan agar query/header privat tidak tertulis; Docker log dirotasi10MB x3 per service. Jangan membagikan env, raw log, dump atau screenshot secret.

## Backup dan uji pemulihan

```sh
sh backup.sh
# Pilih nama backup yang baru dicetak:
sh restore-test.sh backups/mootz-TIMESTAMP.dump mootz_restore_tests
```

Backup memakai pg_dump custom dan dicek pg_restore --list. Uji restore membuat DB baru dan gagal jika nama sudah ada; tidak pernah drop/overwrite DB. Sesudah restore, periksa jumlah baris penting dan relasi secara privat serta migrasi/PostGIS, bukan hanya exitcode. DB uji sengaja tetap tersedia untuk inspeksi; penghapusan harus ditinjau operator terpisah. Skrip backup tidak mencakup objek foto Supabase, file env, role/password PostgreSQL, sertifikat Caddy atau konfigurasi DNS. Rencanakan backup penyedia storage dan simpan konfigurasi privat secara aman.

Jadwalkan backup harian setelah latihan restore lulus. Misalnya cron privat berizin ketat memanggil `sh /srv/Mootz/be/deploy/vps/backup.sh`. Salin backup terenkripsi ke lokasi lain; backup di disk VPS yang sama tidak melindungi kehilangan VPS. Tetapkan retensi dan kapasitas; skrip tidak menghapus arsip otomatis. Restore produksi membutuhkan maintenance, backup terbaru, pemeriksaan target dan persetujuan operator; jangan memakai skrip latihan untuk menimpa DB produksi.

## Update / rollback

Sebelum update: backup+verifikasi, catat SHA/imageID lama, hentikan perubahan bila migrasi belum kompatibel. Ambil commit yang sudah direview, build image baru dengan tag unik MOOTZ_IMAGE_TAG, jalankan migrate sebelum mengganti API. Jangan rollback binary secara buta sesudah migrasi yang mengubah schema; periksa kompatibilitas versi aplikasi dan database dari source/commit yang sedang dituju. Utamakan forward fix atau pulihkan backup ke DB baru melalui rencana maintenance yang ditinjau. Jangan edit checksum/migration history, `down -v`, atau reset tabel untuk mengatasi error.

Pada VPS milik pihak lain, rencana maintenance dan backup harus dikoordinasikan. SSH, firewall, DNS, sertifikat publik, kapasitas, backup offsite, pemulihan produksi, FE, dan transaksi Monad belum diverifikasi. Deployment dinyatakan berhasil setelah pemeriksaan nyata tersebut selesai.

Referensi: [Docker interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/), [Caddy HTTPS](https://caddyserver.com/docs/quick-starts/https).
