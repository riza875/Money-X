# Nodewallet — Custodial ETH/ERC20 Wallet

Wallet crypto custodial yang benar-benar berfungsi: generate wallet asli, kirim &
terima ETH/USDT/USDC di Ethereum mainnet, dan deteksi deposit real-time lewat
Alchemy webhook. Dibangun dengan Next.js supaya cocok dideploy ke Vercel.

## Cara kerja singkat

1. User login (anonymous auth di contoh ini — ganti dengan login Telegram/email
   kalau perlu) → dapat Firebase ID token.
2. `/api/wallet/create` generate wallet baru dengan `ethers.Wallet.createRandom()`,
   private key dienkripsi (AES-256-GCM) lalu disimpan di Firestore. **Private key
   tidak pernah dikirim ke client.**
3. `/api/wallet/balance` baca saldo ETH + token ERC20 langsung dari chain via Alchemy.
4. `/api/wallet/send` decrypt private key di server, sign & broadcast transaksi asli.
5. `/api/webhook/alchemy` — endpoint yang didaftarkan sebagai Alchemy Notify webhook,
   mencatat deposit masuk secara real-time begitu terkonfirmasi di chain.

## Setup

### 1. Install dependencies
```bash
npm install
```
(Jalankan ini di komputer/server kamu sendiri — sandbox chat ini tidak bisa akses internet untuk npm install.)

### 2. Alchemy
- Buat app di [alchemy.com](https://www.alchemy.com/) untuk network `eth-mainnet`
  (pakai API key lama kamu kalau masih untuk mainnet yang sama).
- Buat webhook tipe **Address Activity** yang mengarah ke:
  `https://domain-kamu.com/api/webhook/alchemy`
- Salin **signing key** webhook itu ke `ALCHEMY_WEBHOOK_SIGNING_KEY`.
- Setiap kali ada wallet baru dibuat, tambahkan address-nya ke daftar address yang
  dipantau webhook itu (lewat Alchemy dashboard atau API `updateWebhook`).

### 3. Firebase
- Buat project Firebase → aktifkan **Authentication (Anonymous)** dan **Firestore**.
- Buat service account (Project Settings → Service Accounts → Generate key) →
  isi `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Isi juga `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID` dari Firebase config client (Project Settings → General).

### 4. Kunci enkripsi wallet
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Simpan hasilnya sebagai `WALLET_ENCRYPTION_KEY`. **Jangan pernah commit ke git atau
share ke siapa pun** — siapa yang pegang ini bisa decrypt semua private key user.

### 5. Salin `.env.example` → `.env.local` dan isi semua variabel di atas.

### 6. Jalankan lokal
```bash
npm run dev
```

### 7. Deploy
- Push ke GitHub, connect ke Vercel, isi semua env var yang sama di dashboard Vercel.
- Pastikan webhook Alchemy mengarah ke domain production, bukan localhost.

## Yang masih perlu kamu putuskan sebelum pakai untuk dana asli

- **Login asli**: anonymous auth di sini cuma buat wiring cepat. Untuk produksi,
  ganti dengan Telegram Login Widget / email-password / Google sign-in supaya user
  tidak kehilangan wallet-nya kalau clear cookies.
- **Testing di testnet dulu**: ganti `ALCHEMY_NETWORK=eth-sepolia` sebelum
  mencoba fitur kirim dengan uang asli, supaya kesalahan tidak langsung
  memindahkan dana sungguhan.
- **Backup/rotasi `WALLET_ENCRYPTION_KEY`**: kalau key ini hilang, semua private
  key terenkripsi di Firestore tidak bisa dibuka lagi — siapkan strategi backup key
  yang aman (mis. secret manager, bukan hanya env var polos).
- **Rate limiting & anti-abuse** di `/api/wallet/send` belum ada — tambahkan sebelum
  publik, supaya satu user tidak bisa spam transaksi/drain gas.

## Struktur file

```
lib/
  crypto.js          → enkripsi/dekripsi private key
  auth.js            → verifikasi Firebase ID token
  firebaseAdmin.js   → koneksi Firestore server-side
  firebaseClient.js  → auth di sisi browser
  alchemy.js         → baca saldo, kirim transaksi, riwayat on-chain
pages/
  index.js           → UI wallet (saldo, kirim, terima, riwayat)
  api/wallet/create.js
  api/wallet/balance.js
  api/wallet/send.js
  api/wallet/history.js
  api/webhook/alchemy.js
```
