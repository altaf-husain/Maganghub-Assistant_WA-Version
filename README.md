# MagangHub Assistant (Versi Pengingat WhatsApp)

Ekstensi Chrome untuk membantu peserta magang mengisi **laporan harian MagangHub**
(monev.maganghub.kemnaker.go.id), dengan tambahan **pengingat lewat WhatsApp**.

- **Isi laporan otomatis dengan AI (Gemini).** Cukup tulis 1 poin aktivitas singkat (atau 3 poin), lalu AI
  menyusun kolom *Uraian aktivitas*, *Pembelajaran*, dan *Kendala* dan mengisinya ke form.
- **Alarm Otomatis.** Notifikasi Chrome muncul di jam dan hari yang kamu atur jika kamu belum absen hari itu.
- **Pengingat WhatsApp.** Jika sampai jam tertentu belum absen, kamu menerima pesan WhatsApp dari nomor bot.
  Pesan dikirim dari server, jadi **tetap jalan walau laptop mati**.
- **Status absen hari ini.** Tercatat otomatis saat laporan diisi atau dikirim, dan bisa ditandai dari WhatsApp
  dengan membalas *sudah*.

## Siapa melakukan apa?

Versi ini memakai **satu server bersama** (Google Apps Script, gratis) dan **satu nomor bot WhatsApp** (lewat Fonnte)
untuk semua pengguna.

| Peran | Yang dilakukan | Bagian README |
|---|---|---|
| **Pemilik ekstensi** (yang membagikan ekstensi) | Memasang server dan bot **sekali saja**, mengisi `config.js`, lalu membagikan ekstensi. | [Bagian A](#bagian-a-untuk-pemilik-ekstensi-pasang-server-pengingat) |
| **Pengguna** | Memasang ekstensi, mengisi API key Gemini sendiri, lalu mendaftarkan nomor WhatsApp-nya. | [Bagian B](#bagian-b-untuk-pengguna-pasang-dan-pakai-ekstensi) |

Jika kamu hanya pengguna dan sudah menerima ekstensi yang `config.js`-nya terisi, langsung ke **Bagian B**.

> Tidak butuh pengingat WhatsApp? Pakai versi utama (folder di atas folder ini) yang tidak memerlukan server sama sekali.

---

# Bagian A: Untuk pemilik ekstensi (pasang server pengingat)

## Cara kerjanya

- Pengguna mendaftar dari popup ekstensi: masukkan nomor WA, terima kode verifikasi dari bot,
  lalu masukkan kodenya. Tanpa kode itu, nomor orang lain tidak bisa didaftarkan.
- Setiap 15 menit server mengecek semua pengguna. Jika hari itu termasuk hari pengingat, sudah lewat jam
  pengingat pengguna, dan pengguna belum absen, server mengirim WhatsApp ke pengguna tersebut.
- Jam pengingat WhatsApp diatur masing-masing pengguna di popup. Hari dan zona waktunya mengikuti
  **Alarm Otomatis** pengguna.

Yang perlu diperhatikan:

- Semua pesan dikirim dari **nomor bot dan kuota Fonnte milikmu**.
- Makin banyak penerima, makin besar risiko nomor bot dibatasi WhatsApp, karena Fonnte bukan jalur
  resmi WhatsApp. Cocok untuk kelompok kecil, bukan untuk disebar luas. Sebaiknya pakai nomor khusus untuk bot,
  bukan nomor pribadi.
- Nomor HP pengguna tersimpan di server milikmu. Beri tahu mereka.

## A1. Siapkan nomor bot di Fonnte

1. Daftar/login di <https://fonnte.com>.
2. Buka menu **Device**, klik **Add Device**, lalu isi dengan nomor WhatsApp yang akan menjadi bot.
3. Klik **Connect**, lalu scan QR dari WhatsApp nomor bot (**Perangkat tertaut**, lalu **Tautkan perangkat**).
4. Salin **Token** device.

Buka WhatsApp nomor bot sesekali dengan internet aktif, supaya sambungannya tidak terputus.

## A2. Pasang skrip di Google Apps Script

1. Buka <https://script.google.com>, lalu klik **New project**.
2. Ganti seluruh isi `Code.gs` dengan isi file [server-pengingat/Code.gs](server-pengingat/Code.gs), lalu simpan (Ctrl+S).
3. Buka ⚙ **Project Settings**, lalu ke bagian **Script Properties**, klik **Add script property**:
   - **Wajib:** `FONNTE_TOKEN` berisi token dari Langkah A1.
   - Opsional:

     | Property | Isi | Default |
     |---|---|---|
     | `MAX_USERS` | Batas jumlah pengguna | `50` |
     | `OTP_DAILY_LIMIT` | Batas kode verifikasi per hari | `30` |
     | `DEFAULT_TIMES` | Jam pengingat awal pengguna baru | `17:00,18:00,19:00` |
     | `CONFIRM_ON_DONE` | WA konfirmasi saat sudah absen (`ya`/`tidak`) | `ya` |

   Token **jangan** ditulis di dalam `Code.gs`, supaya tidak ikut tersebar.
4. Kembali ke **Editor**, pilih fungsi **setup** di menu atas, lalu klik **Run**. Izinkan akses jika diminta
   (**Advanced**, lalu **Go to … (unsafe)**, lalu **Allow**; ini normal untuk skrip buatan sendiri).
   Fungsi ini memasang pemicu yang mengecek pengguna setiap 15 menit.
5. Deploy sebagai Web App:
   - **Pertama kali:** **Deploy**, lalu **New deployment**, lalu ⚙ **Web app**. Isi **Execute as**: *Me*
     dan **Who has access**: *Anyone*, lalu **Deploy**.
   - **Saat memperbarui Code.gs:** **Deploy**, lalu **Manage deployments**, lalu ✏, lalu **Version: New version**,
     lalu **Deploy**. URL-nya tetap sama.
6. Salin **Web app URL** (berakhiran `/exec`).

## A3. Isi config.js

Buka [config.js](config.js) di folder ekstensi ini, lalu isi:

```js
const SHARED_SERVER = {
  url: 'https://script.google.com/macros/s/XXXX/exec',  // Web app URL dari Langkah A2
  botNumber: '08xxxxxxxxxx'                             // Nomor bot (hanya ditampilkan ke pengguna)
};
```

Pasang ekstensi di browsermu sendiri (lihat **Bagian B**), lalu daftarkan nomormu dari popup untuk mencoba.

## A4. (Disarankan) Webhook untuk balasan WhatsApp

Supaya pengguna bisa membalas **sudah**, **batal**, **status**, **bantuan**, atau **berhenti** ke bot:

1. Di Fonnte, buka **Device**, lalu **Edit** pada device bot.
2. Isi kolom **Webhook** dengan Web app URL dari Langkah A2, lalu simpan.
   Jika balasan tidak terbaca, cek pengaturan device lain seperti *autoread*.

Tanpa webhook, pengingat dan pendaftaran tetap jalan; hanya balasan WA yang tidak diproses.
Fitur *autoreply* bawaan Fonnte tidak berjalan jika webhook dipakai.

## A5. Bagikan ekstensi

1. Pastikan `server-pengingat/Code.gs` **tidak berisi token**. Folder `server-pengingat` boleh dihapus
   dari salinan yang dibagikan.
2. Zip folder ekstensi ini (yang berisi `manifest.json` dan `config.js` yang sudah diisi), lalu kirim ke pengguna
   bersama README ini.

## Perawatan server

- **Lihat daftar pengguna:** di editor Apps Script, pilih fungsi `listUsers`, klik **Run**, lalu lihat Execution log.
- **Hapus pengguna:** hapus property `U_<nomor>` di Script Properties, atau minta pengguna membalas *berhenti*.
- **Riwayat dan error:** menu **Executions**. Google juga mengirim email jika pemicu berkala gagal.
- **Token Fonnte bocor:** buat token baru di Fonnte, lalu ganti `FONNTE_TOKEN` di Script Properties.

---

# Bagian B: Untuk pengguna (pasang dan pakai ekstensi)

## Yang dibutuhkan

- Browser **Google Chrome** di laptop/PC (bisa juga Edge, Brave, atau browser berbasis Chromium lain).
- Akun **Google** untuk membuat API key Gemini (gratis).
- Akun **MagangHub** yang aktif.
- Nomor **WhatsApp** aktif untuk menerima pengingat.

## B1. Unduh dan ekstrak

1. Unduh file ZIP ekstensi dari pemilik ekstensi.
2. Klik kanan file ZIP, pilih **Extract All** (Ekstrak Semua).
3. Pindahkan folder hasil ekstrak ke tempat yang **tidak akan dihapus**, misalnya `Documents\MagangHub Assistant`.
   Chrome membaca ekstensi langsung dari folder ini, jadi jika folder dihapus atau dipindah, ekstensi berhenti bekerja.

Pastikan di dalam folder tersebut **langsung** ada file `manifest.json` (bukan di dalam folder lain lagi).

## B2. Pasang di Chrome

1. Buka Chrome, ketik `chrome://extensions` di kolom alamat, lalu tekan Enter.
2. Aktifkan **Developer mode** (Mode pengembang) di pojok kanan atas.
3. Klik **Load unpacked** (Muat yang belum dibuka).
4. Pilih folder dari Langkah B1 (folder yang berisi `manifest.json`), lalu klik **Select Folder**.
5. Ekstensi **MagangHub Assistant** muncul di daftar.
6. Klik ikon puzzle 🧩 di kanan atas Chrome, lalu klik ikon pin 📌 di samping **MagangHub Assistant**
   supaya ikonnya selalu tampil di toolbar.

> Untuk Edge: buka `edge://extensions`, aktifkan **Developer mode** di menu kiri, lalu **Load unpacked**.

## B3. Buat dan simpan API key Gemini

1. Buka <https://aistudio.google.com/apikey> lalu login dengan akun Google.
2. Klik **Create API key**, lalu salin kunci yang muncul.
3. Klik ikon ekstensi di toolbar. Panel **⚙ Pengaturan Gemini API** terbuka otomatis saat pertama kali dipakai.
4. Tempel kunci di kolom **Gemini API Key**.
5. Klik **Simpan & Test Koneksi**. Jika muncul *"Koneksi sukses! Gemini siap dipakai."*, pengaturan selesai.

API key tersimpan hanya di browser kamu. **Jangan bagikan API key ke orang lain.**

## B4. Atur Alarm Otomatis

1. Di popup ekstensi, bagian **Alarm Otomatis**, pilih zona waktu (**WIB**, **WITA**, atau **WIT**).
2. Isi jam pengingat. Klik **+ Jam** untuk menambah jam lain, klik **✕** untuk menghapus.
3. Centang hari pengingat (misalnya Sen sampai Jum).
4. Klik **Simpan**.

Notifikasi Chrome hanya muncul jika kamu **belum absen** hari itu dan Chrome sedang terbuka.
Hari dan zona waktu ini juga dipakai untuk pengingat WhatsApp.

## B5. Daftarkan nomor WhatsApp

1. Di popup, bagian **Pengingat WhatsApp**, isi nomor WhatsApp kamu (contoh `081234567890`).
2. Klik **Kirim Kode**. Bot mengirim kode 6 angka ke WhatsApp kamu.
3. Masukkan kodenya, lalu klik **Verifikasi**. Kode berlaku 10 menit.
4. **Simpan nomor bot di kontak** supaya pesannya tidak dianggap spam. Nomor bot terlihat dengan klik ikon **?**
   di samping judul *Pengingat WhatsApp*.
5. Atur jam pengingat WhatsApp: klik **Edit**, tambah/hapus jam, lalu klik **Simpan**.
6. Klik **Tes Kirim** untuk memastikan pesan masuk.

Balasan yang bisa dikirim ke bot (jika pemilik ekstensi sudah memasang webhook):

| Balas | Fungsi |
|---|---|
| `sudah` | Tandai sudah absen hari ini; pengingat hari ini berhenti |
| `batal` | Kembalikan ke belum absen |
| `status` | Cek status absen hari ini |
| `bantuan` | Tampilkan daftar perintah |
| `berhenti` | Hapus pendaftaran pengingat |

Untuk berhenti dari popup: klik **Edit**, lalu **Hapus pendaftaran nomor ini**.

---

## Cara memakai (isi laporan)

1. Login ke MagangHub dan buka **halaman form laporan harian**.
2. Klik ikon ekstensi.
3. Pilih **Mode Pengisian**:
   - **Ketik 1 Poin di Sini (AI buat 3 Form):** tulis satu aktivitas singkat. AI menyimpulkan pembelajaran dan kendala.
   - **Ketik 3 Poin di Sini (AI kembangkan):** tulis poin aktivitas, pembelajaran, dan kendala. AI mengembangkannya.
4. Klik tombol kuning **Buat & Isi Laporan dengan AI**, lalu tunggu loading bar selesai.
5. **Periksa hasilnya** di form MagangHub, ubah jika perlu, lalu klik tombol kirim di MagangHub.

Catatan:

- Kolom yang sudah berisi teks **tidak akan ditimpa**. Kosongkan dulu jika ingin diisi ulang oleh AI.
- Setelah laporan diisi, status **Absen hari ini** otomatis menjadi *Sudah* dan pengingat WhatsApp hari itu berhenti.
  Klik **Batalkan** jika ternyata belum dikirim, atau **Tandai sudah absen** jika kamu mengisi laporan secara manual.
- Jika proses terasa macet, klik tombol **⟳** di samping judul *Pengaturan Gemini API*, lalu coba lagi.

## Memperbarui ekstensi

1. Ganti isi folder ekstensi dengan file versi baru (folder yang sama seperti saat pemasangan).
2. Buka `chrome://extensions`, lalu klik ikon **⟳ Reload** pada kartu MagangHub Assistant.
3. Muat ulang (refresh) halaman MagangHub yang sedang terbuka.

Pengaturan (API key, alarm, pendaftaran WhatsApp) tetap tersimpan selama ekstensi tidak dihapus.

## Menghapus ekstensi

1. Di popup, hapus dulu pendaftaran WhatsApp (**Edit**, lalu **Hapus pendaftaran nomor ini**), atau balas *berhenti* ke bot.
2. Buka `chrome://extensions`, klik **Remove** pada MagangHub Assistant, lalu hapus foldernya.

---

## Jika ada masalah

| Masalah | Solusi |
|---|---|
| Peringatan *"Disable developer mode extensions"* saat Chrome dibuka | Normal untuk ekstensi yang dipasang lewat Load unpacked. Tutup saja, **jangan** klik Disable. |
| *"Manifest file is missing or unreadable"* saat Load unpacked | Folder yang dipilih salah. Pilih folder yang di dalamnya langsung ada `manifest.json`. |
| *"Koneksi gagal"* / *"API key Gemini tidak valid"* | Periksa kembali API key (tidak ada spasi tambahan), atau buat API key baru. |
| *"Buka halaman form laporan MagangHub dahulu"* | Buka halaman form laporan harian di MagangHub, lalu klik ikon ekstensi dari tab tersebut. |
| *"Tidak ada kolom yang diisi"* | Kolom form sudah berisi teks, atau form belum tampil. Kosongkan kolom / refresh halaman, lalu coba lagi. |
| *"Kuota model habis/sibuk"* / *"Semua model AI sedang gagal"* | Kuota gratis Gemini sedang habis atau server sibuk. Tunggu beberapa menit, klik ⟳, lalu coba lagi. |
| *"Gagal menyimpan jadwal"* / *"Pengaturan alarm belum aktif"* | Buka `chrome://extensions`, klik **Reload** pada ekstensi, lalu buka popup lagi. |
| Notifikasi alarm tidak muncul | Pastikan Chrome terbuka, notifikasi Chrome diizinkan di Windows, dan mode *Focus/Do not disturb* mati. |
| *"Server pengingat belum diatur oleh pemilik ekstensi"* | `url` di `config.js` masih kosong. Pemilik ekstensi perlu mengikuti Bagian A. |
| *"Server tidak membalas dengan benar"* | URL bukan versi `/exec`, atau akses Web App bukan *Anyone* (Langkah A2). |
| *"Server belum diatur: FONNTE_TOKEN kosong"* | Isi `FONNTE_TOKEN` di Script Properties (Langkah A2). |
| *"Fonnte menolak pesan: token invalid"* | Token salah, atau device bot belum *connect* di Fonnte. |
| *"Tunggu 1 menit sebelum meminta kode lagi"* | Tunggu sebentar, lalu klik **Kirim Ulang**. |
| *"Kode salah"* / *"Kode sudah kedaluwarsa"* | Periksa kodenya, atau klik **Kirim Ulang** untuk meminta kode baru. |
| *"Nomor belum terdaftar di server"* | Pendaftaran sudah dihapus (misalnya membalas *berhenti*). Daftar ulang dari popup. |
| *"Kuota pengguna server sudah penuh"* | Pemilik ekstensi perlu menaikkan `MAX_USERS`. |
| *"Batas pendaftaran hari ini tercapai"* | Coba lagi besok, atau pemilik ekstensi menaikkan `OTP_DAILY_LIMIT`. |
| Pesan WhatsApp tidak masuk | Cek **Tes Kirim**, pastikan nomor benar, dan device bot di Fonnte masih *connect*. |

## Privasi

- API key, jadwal alarm, dan status absen disimpan di browser kamu (`chrome.storage.local`).
- Teks poin aktivitas yang kamu tulis dikirim ke **Google Gemini** untuk dibuatkan laporan.
- Untuk pengingat WhatsApp, **nomor WhatsApp, jam pengingat, hari, zona waktu, dan status absen harian** disimpan
  di server Google Apps Script milik pemilik ekstensi, dan pesan dikirim lewat **Fonnte**.
  API key Gemini dan isi laporan **tidak** dikirim ke server ini.
