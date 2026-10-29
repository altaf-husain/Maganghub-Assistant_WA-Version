# MagangHub Assistant (dengan Pengingat WhatsApp)

Ekstensi Chrome yang membantu kamu mengisi **laporan harian MagangHub** lebih cepat, dan
**mengingatkan lewat WhatsApp** kalau kamu lupa absen.

**Apa yang bisa dilakukan?**

- ✍️ **Menulis laporan dengan AI.** Kamu cukup menulis kegiatan singkat, misalnya *"rapat tim dan merapikan data
  penjualan"*. AI akan menuliskan kolom **Aktivitas**, **Pembelajaran**, dan **Kendala** lalu mengisinya ke form.
- ⏰ **Mengingatkan absen di laptop.** Muncul notifikasi pada jam yang kamu pilih, kalau kamu belum mengisi laporan.
- 💬 **Mengingatkan absen lewat WhatsApp.** Pesan tetap terkirim **walaupun laptopmu mati**.

> **Kamu yang membagikan ekstensi ini ke orang lain?** Pengingat WhatsApp butuh server yang dipasang sekali
> oleh pemilik ekstensi. Lihat bagian [Untuk pemilik ekstensi](#untuk-pemilik-ekstensi-memasang-server-pengingat)
> di akhir dokumen ini.

---

## Sebelum mulai, siapkan:

- Laptop/PC dengan **Google Chrome** (Edge atau Brave juga bisa)
- **Akun Google** (untuk membuat kunci AI gratis)
- **Akun MagangHub**
- **Nomor WhatsApp** yang aktif

Pemasangan cukup sekali, sekitar 5–10 menit.

---

## Cara pasang

### 1. Ekstrak file

1. Klik kanan file ZIP ekstensi, lalu pilih **Extract All**.
2. Simpan folder hasilnya di tempat yang aman, misalnya di **Documents**.

⚠️ Jangan hapus atau pindahkan folder ini setelah dipasang. Kalau folder hilang, ekstensi ikut berhenti.

### 2. Masukkan ke Chrome

1. Buka Chrome, ketik **chrome://extensions** di kolom alamat, lalu tekan Enter.
2. Nyalakan tombol **Developer mode** di pojok kanan atas.
3. Klik **Load unpacked**.
4. Pilih folder dari langkah 1, lalu klik **Select Folder**.
5. Klik ikon puzzle 🧩 di kanan atas Chrome, lalu klik pin 📌 di samping **MagangHub Assistant**
   supaya ikonnya selalu terlihat.

💡 Kalau muncul tulisan *"Manifest file is missing"*, berarti folder yang dipilih salah.
Buka folder sampai kamu melihat file bernama **manifest.json**, lalu pilih folder itu. Jangan sampai file code ada di folder dalam folder pastikan folder tidak double

### 3. Buat kunci AI (gratis)

Kunci ini (disebut *API key*) dibutuhkan supaya AI bisa menulis laporanmu.

1. Buka **https://aistudio.google.com/apikey** dan login dengan akun Google.
2. Klik **Create API key**, lalu salin kuncinya.
3. Klik ikon **MagangHub Assistant** di Chrome.
4. Tempel kunci di kolom **Gemini API Key**.
5. Klik **Simpan & Test Koneksi**. Kalau muncul *"Koneksi sukses!"*, berarti berhasil.

🔒 Jangan berikan kunci ini ke orang lain.

### 4. Atur jam pengingat di laptop

1. Di bagian **Alarm Otomatis**, pilih zona waktumu (**WIB / WITA / WIT**).
2. Isi jam pengingat. Mau lebih dari satu jam? Klik **+ Jam**.
3. Centang hari kerjamu (misalnya Sen sampai Jum).
4. Klik **Simpan**.

Hari dan zona waktu yang kamu pilih di sini juga dipakai untuk pengingat WhatsApp.

### 5. Daftarkan nomor WhatsApp

1. Di bagian **Pengingat WhatsApp**, isi nomor WhatsApp-mu (contoh: 081234567890).
2. Klik **Kirim Kode**. Kamu akan menerima kode 6 angka di WhatsApp.
3. Ketik kodenya, lalu klik **Verifikasi**. Kode hanya berlaku 10 menit.
4. Klik **Edit** untuk mengatur jam pengingat WhatsApp, lalu klik **Simpan**.
5. Klik **Tes Kirim** untuk mencoba. Cek WhatsApp-mu.

📱 **Simpan nomor pengirim pesan di kontakmu** supaya pesannya tidak masuk spam.
Nomornya bisa dilihat dengan klik ikon **?** di samping tulisan *Pengingat WhatsApp*.

Selesai! Ekstensi siap dipakai.

---

## Cara mengisi laporan setiap hari

1. Buka MagangHub dan masuk ke **halaman form laporan harian**.
2. Klik ikon **MagangHub Assistant**.
3. Tulis kegiatanmu hari ini secara singkat.
4. Klik tombol kuning **Buat & Isi Laporan dengan AI**, lalu tunggu sebentar.
5. **Baca dulu hasilnya** di form, ubah kalau perlu, lalu klik tombol kirim di MagangHub.

**Pilihan cara menulis** (menu *Mode Pengisian*):

- **Ketik 1 Poin:** cukup tulis kegiatanmu. AI yang memikirkan pembelajaran dan kendalanya.
- **Ketik 3 Poin:** tulis sendiri kegiatan, pembelajaran, dan kendala secara singkat. AI yang merapikannya.

**Perlu diketahui:**

- Kolom yang sudah ada isinya **tidak akan ditimpa**. Kosongkan dulu kalau ingin diisi ulang oleh AI.
- Setelah laporan diisi, ekstensi menandai kamu **sudah absen** hari itu, jadi pengingat di laptop dan WhatsApp
  berhenti. Kalau ternyata belum terkirim, klik **Batalkan**. Kalau kamu mengisi laporan sendiri tanpa AI,
  klik **Tandai sudah absen**.
- Prosesnya terasa macet? Klik tombol **⟳** di bagian atas, lalu coba lagi.

---

## Tentang pengingat

**Di laptop**

- Muncul sebagai notifikasi di pojok layar, **hanya kalau kamu belum absen** hari itu.
- Klik notifikasinya untuk langsung membuka MagangHub, atau klik **✔ Sudah Absen Hari Ini** untuk mematikannya.
- Hanya muncul kalau **Chrome sedang terbuka** (boleh di-minimize).

**Di WhatsApp**

- Dikirim pada jam yang kamu atur, **hanya kalau kamu belum absen** hari itu.
- Tetap terkirim walaupun laptopmu mati.
- Kamu bisa membalas pesan pengingat dengan kata berikut:

| Balas dengan | Artinya |
|---|---|
| **sudah** | Aku sudah absen. Pengingat hari ini berhenti. |
| **batal** | Ternyata aku belum absen. |
| **status** | Cek apakah hari ini sudah tercatat absen. |
| **bantuan** | Tampilkan daftar perintah. |
| **berhenti** | Berhenti menerima pengingat WhatsApp. |

Ingin berhenti dari ekstensi? Klik **Edit** di bagian Pengingat WhatsApp, lalu **Hapus pendaftaran nomor ini**.

---

## Kalau ada masalah

**Muncul peringatan "Disable developer mode extensions" setiap membuka Chrome**
Ini normal. Tutup saja peringatannya, **jangan** klik *Disable*.

**"API key Gemini tidak valid" atau "Koneksi gagal"**
Salin ulang kuncimu dan pastikan tidak ada spasi di depan atau belakang. Kalau masih gagal, buat kunci baru.

**"Buka halaman form laporan MagangHub dahulu"**
Buka halaman form laporan harian di MagangHub, lalu klik ikon ekstensi dari halaman itu.

**"Tidak ada kolom yang diisi"**
Kolom di form sudah ada isinya, atau halaman belum selesai dimuat. Kosongkan kolomnya atau refresh halaman,
lalu coba lagi.

**"Kuota habis" atau "Semua model AI sedang gagal"**
Batas pemakaian gratis AI sedang habis atau servernya sibuk. Tunggu beberapa menit, klik **⟳**, lalu coba lagi.

**"Gagal menyimpan jadwal"**
Buka **chrome://extensions**, klik ikon **⟳** pada MagangHub Assistant, lalu buka ekstensinya lagi.

**Notifikasi laptop tidak muncul**
Pastikan Chrome terbuka, dan notifikasi Chrome diizinkan di Windows
(**Settings → System → Notifications**). Matikan juga mode *Do not disturb / Focus*.

**Kode verifikasi WhatsApp tidak masuk**
Pastikan nomornya benar. Tunggu 1 menit, lalu klik **Kirim Ulang**.

**"Kode salah" atau "Kode sudah kedaluwarsa"**
Klik **Kirim Ulang** untuk meminta kode baru.

**"Nomor belum terdaftar di server"**
Pendaftaranmu sudah terhapus (misalnya karena membalas *berhenti*). Daftar ulang dari ekstensi.

**"Server pengingat belum diatur", "Kuota pengguna penuh", atau pesan WhatsApp tidak pernah masuk**
Ini masalah di sisi server. Hubungi orang yang membagikan ekstensi ini kepadamu.

---

## Memperbarui ke versi baru

1. Timpa isi folder ekstensi dengan file versi baru.
2. Buka **chrome://extensions**, lalu klik ikon **⟳** pada MagangHub Assistant.

Pengaturanmu (kunci AI, jam pengingat, nomor WhatsApp) tidak akan hilang.

## Menghapus ekstensi

1. Hapus dulu pendaftaran WhatsApp: klik **Edit** → **Hapus pendaftaran nomor ini** (atau balas **berhenti** ke WhatsApp).
2. Buka **chrome://extensions**, klik **Remove** pada MagangHub Assistant, lalu hapus foldernya.

---

## Privasi

- Kunci AI dan jam pengingat laptop **hanya disimpan di laptopmu**.
- Tulisan kegiatanmu dikirim ke **Google Gemini** (AI-nya) untuk dibuatkan laporan.
- Untuk pengingat WhatsApp, **nomor WhatsApp, jam pengingat, dan status absen** disimpan di server milik orang
  yang membagikan ekstensi ini. Kunci AI dan isi laporanmu **tidak** dikirim ke server tersebut.

---
---

# Untuk pemilik ekstensi: memasang server pengingat

Bagian ini **hanya untuk orang yang membagikan ekstensi**. Pengguna biasa tidak perlu membacanya.

Pengingat WhatsApp butuh dua hal yang kamu siapkan **sekali saja** untuk semua pengguna:

- **Nomor WhatsApp pengirim pesan** (disebut *bot*), disambungkan lewat layanan **Fonnte**.
- **Server gratis** di **Google Apps Script**, yang setiap 15 menit mengecek siapa yang belum absen lalu mengirim pesan.

**Sebelum mulai, perhatikan:**

- Semua pesan dikirim dari nomor bot dan kuota Fonnte **milikmu**.
- Fonnte bukan layanan resmi WhatsApp, jadi nomor bot bisa diblokir kalau mengirim terlalu banyak pesan.
  Pakai **nomor khusus**, bukan nomor pribadimu, dan bagikan ke kelompok kecil saja.
- Nomor WhatsApp para pengguna akan tersimpan di server milikmu. Beri tahu mereka.

## Langkah 1: Sambungkan nomor bot ke Fonnte

1. Daftar atau login di **https://fonnte.com**.
2. Buka menu **Device**, klik **Add Device**, lalu isi nomor WhatsApp yang akan jadi bot.
3. Klik **Connect**. Di HP nomor bot, buka WhatsApp → **Perangkat tertaut** → **Tautkan perangkat**,
   lalu scan kode QR yang muncul.
4. Salin **Token** device. Simpan untuk langkah berikutnya.

💡 Buka WhatsApp di HP nomor bot sesekali supaya sambungannya tidak terputus.

## Langkah 2: Pasang server di Google Apps Script

1. Buka **https://script.google.com**, lalu klik **New project**.
2. Hapus semua isi file `Code.gs`, lalu tempel isi file **server-pengingat/Code.gs** dari folder ini.
   Simpan dengan **Ctrl+S**.
3. Klik ⚙ **Project Settings** di menu kiri. Di bagian paling bawah (**Script Properties**), klik
   **Add script property**, lalu isi:
   - **Property:** `FONNTE_TOKEN`
   - **Value:** token dari Langkah 1

   Klik **Save script properties**.
4. Kembali ke **Editor** (ikon `< >` di menu kiri). Di menu atas, pilih fungsi **setup**, lalu klik **Run**.
   Saat diminta izin: klik **Review permissions** → pilih akunmu → **Advanced** → **Go to … (unsafe)** → **Allow**.
   Ini normal untuk skrip buatan sendiri.
5. Klik **Deploy** → **New deployment**. Klik ⚙ di samping *Select type*, pilih **Web app**, lalu isi:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*

   Klik **Deploy**.
6. Salin **Web app URL** yang muncul (berakhiran `/exec`).

## Langkah 3: Isi alamat server di ekstensi

Buka file **config.js** di folder ekstensi dengan Notepad, lalu isi di antara tanda kutip:

```js
const SHARED_SERVER = {
  url: 'https://script.google.com/macros/s/XXXX/exec',  // Web app URL dari Langkah 2
  botNumber: '08xxxxxxxxxx'                             // Nomor bot dari Langkah 1
};
```

Simpan. Lalu pasang ekstensi di Chrome-mu sendiri dan daftarkan nomormu untuk mencoba
(ikuti bagian **Cara pasang** di atas).

## Langkah 4: Aktifkan balasan WhatsApp (disarankan)

Supaya pengguna bisa membalas **sudah**, **batal**, **status**, dan seterusnya:

1. Di Fonnte, buka **Device**, lalu klik **Edit** pada device bot.
2. Tempel **Web app URL** dari Langkah 2 ke kolom **Webhook**, lalu simpan.

Tanpa langkah ini, pengingat tetap jalan. Hanya balasan dari pengguna yang tidak dibaca.

## Langkah 5: Bagikan ekstensi

1. Hapus folder **server-pengingat** dari salinan yang akan dibagikan (pengguna tidak membutuhkannya).
2. Zip folder ekstensi, lalu kirim ke pengguna bersama README ini.

## Pengaturan tambahan (opsional)

Tambahkan di **Script Properties** (seperti `FONNTE_TOKEN`) kalau ingin mengubah bawaan:

| Property | Fungsi | Bawaan |
|---|---|---|
| `MAX_USERS` | Jumlah maksimal pengguna | `50` |
| `OTP_DAILY_LIMIT` | Jumlah maksimal kode verifikasi per hari | `30` |
| `DEFAULT_TIMES` | Jam pengingat awal untuk pengguna baru | `17:00,18:00,19:00` |
| `CONFIRM_ON_DONE` | Kirim pesan konfirmasi saat pengguna sudah absen (`ya`/`tidak`) | `ya` |

## Merawat server

- **Melihat daftar pengguna:** di editor Apps Script, pilih fungsi `listUsers`, klik **Run**, lalu lihat hasilnya di bawah.
- **Menghapus pengguna:** hapus property `U_<nomor>` di Script Properties.
- **Melihat error:** buka menu **Executions** di kiri. Google juga mengirim email kalau ada yang gagal.
- **Mengubah Code.gs:** setelah menyimpan, klik **Deploy** → **Manage deployments** → ✏ →
  **Version: New version** → **Deploy**. Alamat server tidak berubah.
- **Token Fonnte bocor:** buat token baru di Fonnte, lalu ganti nilai `FONNTE_TOKEN`.

## Kalau server bermasalah

| Pesan yang muncul | Penyebab dan solusi |
|---|---|
| "Server pengingat belum diatur" | `url` di **config.js** masih kosong. Ulangi Langkah 3. |
| "Server tidak membalas dengan benar" | URL tidak berakhiran `/exec`, atau *Who has access* bukan *Anyone*. Periksa Langkah 2. |
| "FONNTE_TOKEN kosong" | Token belum diisi di Script Properties. Ulangi Langkah 2 nomor 3. |
| "Fonnte menolak pesan: token invalid" | Token salah, atau nomor bot terputus dari Fonnte. Sambungkan ulang di Langkah 1. |
| "Kuota pengguna server sudah penuh" | Naikkan `MAX_USERS`. |
| "Batas pendaftaran hari ini tercapai" | Naikkan `OTP_DAILY_LIMIT`, atau tunggu besok. |
