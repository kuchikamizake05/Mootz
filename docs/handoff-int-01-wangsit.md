# INT-01 handoff untuk Wangsit

Status: backend adapters, policy and schemas are available for frontend integration. Frontend implementation and consumer acceptance belong to Wangsit.

## Sumber yang dipakai

- Baca [baseline v1](int-01-baseline.md) untuk identity, signing, status/error, QR/relay trust, event dan lokasi. Bukti pemeriksaan membedakan PASS dari UNAVAILABLE/UNVERIFIED.
- API yang berjalan: be/specs/identity.openapi.json, media.openapi.json, friends.openapi.json, streak.openapi.json, comments.openapi.json, reactions.openapi.json dan events.openapi.json. Meet dan Dots memiliki endpoint backend dan schema OpenAPI.
- Signing source: sc/specs/typed-data.mjs; TypeScript export: sc/specs/protocol.ts; fixture publik: sc/specs/vectors.json; ABI: sc/abi/MeetRegistry.json dan EventCollection.json. Jangan menyalin urutan field secara manual atau mengimpor business logic be/src ke browser.

## Konfigurasi dan login

Web lokal memakai http://localhost:3000, API http://localhost:3001. Origin tersebut sudah diizinkan pada backend dan Privy. Public Privy App ID memakai aplikasi Mootz yang sama dengan backend; ambil nilai publik dari konfigurasi yang disepakati, jangan menyalin be/.env ke FE.

Tambahkan public API base dan public Privy App ID pada contoh environment modul FE dengan penamaan konsisten. Backend secrets, database URL, Supabase secret, issuer/relay key tidak boleh masuk variabel NEXT_PUBLIC atau bundle. Alamat contract masih null pada deployment template: jangan memakai alamat fixture sebagai alamat Monad nyata.

Login memakai PrivyProvider. Ambil token via getAccessToken() per request, kirim Authorization:Bearer, lalu GET /v1/me untuk provisioning. Account ID backend berbeda dari wallet; client tidak menentukan identitas aktor lewat request body. Onboarding/preference memakai API sendiri. Signature wallet-control bukan signature Meet atau transaksi.

## Yang perlu dikerjakan untuk INT-01

- [ ] Siapkan manifest, lockfile, contoh environment dan scripts lint/typecheck/test/build milik fe/web; catat fresh npm ci dan hasil nyata. Demo awal Next.js/TypeScript. Mobile tetap ditunda setelah demo web; tidak perlu memilih/membangun framework mobile sekarang.
- [ ] Buat tes consumer yang benar-benar mengimpor export publik SC dan memakai viem untuk menghitung digest Offer, Accept, OFFCHAIN_MEET dan Claim dari vectors.json. Bandingkan dengan offerDigest, acceptDigest, offchainOfferDigest, offchainAcceptDigest dan claimDigest. Jangan sekadar membandingkan dua nilai fixture yang sama.
- [ ] Hitung commitment dari commitmentInput menggunakan helper kanonis; cocokkan dengan offer.photoCommitment. Pastikan front/back tertukar dan salt berubah menghasilkan hash berbeda. Gunakan bigint untuk uint256.
- [ ] Catat bahwa UUID adalah16 byte dipad kanan hingga bytes32; domain actual chain/address wajib, bukan fixture. Candidate hanya mendukung undelegated EOA; smart/contract/passkey/delegated wallet belum kompatibel.
- [ ] Verifikasi real login/profile dari web consumer sendiri. Error401 perlu login/token refresh;404 tidak membuka identitas momen privat;503 bukan konten kosong. Jangan membuat fallback bucket publik.
- [ ] Pisahkan status Dot valid dari chain pending/recorded/not-saved. QR60detik, relay300detik setelah acceptedAt yang diattest backend. Opt-out/relay gagal tidak menghapus Dot. Signing/GPS bukan bukti manusia unik atau kehadiran.
- [ ] Review baseline dengan Diaz/Faaid dan catat acceptance beserta commit serta hasil script. Pemeriksaan device/Meet lengkap adalah pekerjaan lanjutan; jangan mengaku endpoint Meet/claim sudah berjalan hanya karena vector lulus.
