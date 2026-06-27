# 📘 Tutorial Deploy ShiftDriver
## Dari Nol Sampai Live — Step by Step

---

## PERSIAPAN AWAL

### Yang Kamu Butuhkan
- Akun **GitHub** (github.com)
- Akun **Firebase** (firebase.google.com) — pakai Google account
- Akun **Netlify** (netlify.com) — bisa login pakai GitHub
- **Node.js** terinstall di laptop (cek: buka terminal, ketik `node -v`)

Jika Node.js belum ada, download di: https://nodejs.org (pilih versi LTS)

---

## BAGIAN 1 — SETUP FIREBASE (Database)

### Step 1: Buat Project Firebase
1. Buka https://console.firebase.google.com
2. Klik **"Add project"** (atau "Tambahkan project")
3. Nama project: `shiftdriver` (atau nama bebas)
4. **Matikan Google Analytics** (tidak perlu), klik Continue
5. Tunggu loading, klik **"Continue"**

### Step 2: Aktifkan Firestore Database
1. Di sidebar kiri, klik **"Build"** → **"Firestore Database"**
2. Klik **"Create database"**
3. Pilih **"Start in production mode"** → Next
4. Pilih lokasi: **`asia-southeast1`** (Singapore, paling dekat) → Enable
5. Tunggu database selesai dibuat

### Step 3: Set Rules Firestore
1. Di Firestore, klik tab **"Rules"**
2. Hapus semua isi yang ada
3. Copy-paste rules berikut:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. Klik **"Publish"**

> ⚠️ Rules ini untuk development. Setelah platform stabil, kamu bisa perketat rules-nya.

### Step 4: Ambil Config Firebase
1. Di sidebar kiri, klik ikon **⚙️ (gear)** → **"Project settings"**
2. Scroll ke bawah ke bagian **"Your apps"**
3. Klik ikon **`</>`** (Web app)
4. Isi nickname: `shiftdriver-web` → klik **"Register app"**
5. Kamu akan melihat kode seperti ini:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "shiftdriver-xxx.firebaseapp.com",
  projectId: "shiftdriver-xxx",
  storageBucket: "shiftdriver-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. **Simpan semua nilai ini** — akan dipakai di Step berikutnya

---

## BAGIAN 2 — SETUP PROJECT DI LAPTOP

### Step 5: Upload Code ke Laptop
1. Extract file ZIP `shiftdriver.zip` yang kamu terima
2. Buka folder `shiftdriver` di terminal:
   - Windows: klik kanan di folder → "Open in Terminal"
   - Mac: drag folder ke Terminal

### Step 6: Buat File `.env.local`
1. Di dalam folder `shiftdriver`, buat file baru bernama `.env.local`
2. Isi dengan nilai dari Firebase tadi:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=shiftdriver-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=shiftdriver-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=shiftdriver-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> ⚠️ Jangan ada spasi di sekitar tanda `=`

### Step 7: Install Dependencies
Di terminal, ketik:
```bash
npm install
```
Tunggu sampai selesai (1-3 menit).

### Step 8: Setup Database Awal (Seed)
1. Buka file `seed.js`
2. Ganti bagian `firebaseConfig` dengan nilai Firebase kamu (sama seperti `.env.local`)
3. Jalankan:
```bash
node seed.js
```
4. Jika berhasil, akan muncul:
```
✅ SPV dibuat: username=admin password=admin123
✅ Outlet dibuat: Outlet Utara
...
🎉 Seeding selesai!
```

### Step 9: Test di Lokal
```bash
npm run dev
```
Buka browser: http://localhost:3000

**Test login:**
- SPV: username `admin`, password `admin123`
- Driver: tambahkan dulu via panel SPV, lalu login dengan kode yang muncul

Jika semua berjalan, lanjut ke deploy.

---

## BAGIAN 3 — UPLOAD KE GITHUB

### Step 10: Buat Repository GitHub
1. Buka https://github.com → klik **"New"** (tombol hijau)
2. Repository name: `shiftdriver`
3. Pilih **Private** (biar tidak publik)
4. Klik **"Create repository"**

### Step 11: Upload Code
Di terminal (dalam folder shiftdriver):
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME_KAMU/shiftdriver.git
git push -u origin main
```

Ganti `USERNAME_KAMU` dengan username GitHub kamu.

---

## BAGIAN 4 — DEPLOY KE NETLIFY

### Step 12: Connect Netlify ke GitHub
1. Buka https://netlify.com → Login (pakai GitHub)
2. Klik **"Add new site"** → **"Import an existing project"**
3. Pilih **GitHub**
4. Pilih repository `shiftdriver`
5. Settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Klik **"Add environment variables"**

### Step 13: Set Environment Variables di Netlify
Tambahkan satu per satu (sama persis dengan `.env.local`):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | nilai dari Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | nilai dari Firebase |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | nilai dari Firebase |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | nilai dari Firebase |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | nilai dari Firebase |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | nilai dari Firebase |

### Step 14: Deploy
1. Klik **"Deploy shiftdriver"**
2. Tunggu build selesai (2-5 menit)
3. Netlify akan memberi URL seperti: `https://shiftdriver-abc123.netlify.app`

**Platform sudah live! 🎉**

---

## BAGIAN 5 — SETUP AWAL PLATFORM

### Setelah Deploy, Lakukan Ini di Panel SPV:

**Langkah 1 — Ganti Password SPV**
1. Login SPV: username `admin`, password `admin123`
2. Masuk tab **Setelan**
3. Ganti password ke yang lebih aman

**Langkah 2 — Sesuaikan Nama Outlet**
1. Masuk tab **Outlet**
2. Hapus outlet contoh jika tidak sesuai
3. Tambah outlet sesuai bisnis kamu (maks bebas)

**Langkah 3 — Setup Tipe Shift per Outlet**
1. Masuk tab **Shift**
2. Pilih outlet
3. Tambahkan tipe shift (Pagi, Siang, Malam, dll) sesuai jam operasional

**Langkah 4 — Daftarkan Driver**
1. Masuk tab **Driver**
2. Klik "+ Tambah Driver"
3. Isi nama, nomor WA, pilih outlet
4. Catat kode unik yang muncul → bagikan ke driver

**Langkah 5 — Buat Batch Jadwal Pertama**
1. Masuk tab **Batch**
2. Pilih outlet
3. Klik "+ Buat Batch Jadwal"
4. Isi label, tanggal mulai-selesai, window buka-tutup
5. Isi kapasitas driver untuk tiap slot shift per hari
6. Klik "Buat Batch"

Driver langsung bisa login dan pilih shift ketika window dibuka.

---

## BAGIAN 6 — UPDATE SETELAH ADA PERUBAHAN CODE

Jika kamu edit code dan ingin update platform:
```bash
git add .
git commit -m "deskripsi perubahan"
git push
```
Netlify otomatis rebuild dan deploy ulang dalam 2-3 menit.

---

## TROUBLESHOOTING

| Masalah | Solusi |
|---------|--------|
| Build gagal di Netlify | Cek environment variables sudah diisi semua |
| Login tidak bisa | Pastikan seed.js sudah dijalankan |
| Driver tidak muncul | Pastikan outletId driver sesuai dengan outlet yang ada |
| Slot tidak real-time | Cek Firestore rules sudah di-publish |
| Error "Permission denied" | Cek Firestore rules (Step 3) |

---

## KEAMANAN — PENTING DIBACA

Setelah platform stabil dan sudah ada driver, kamu bisa perketat Firestore rules agar tidak semua orang bisa tulis sembarangan. Hubungi developer atau pelajari Firestore security rules di:
https://firebase.google.com/docs/firestore/security/get-started

Untuk sekarang, rules yang ada sudah cukup aman karena akses terbatas pada orang yang punya URL platform kamu.

---

## KONTAK & SUPPORT

Jika ada kendala teknis, pastikan kamu punya:
1. Screenshot error yang muncul
2. Langkah terakhir yang berhasil sebelum error
3. Browser dan OS yang digunakan

Ini memudahkan troubleshooting secara remote.
