# MagangHub Assistant (Versi Pengingat WhatsApp)

Ekstensi Chrome yang membantu peserta magang mengisi **laporan harian MagangHub**
(monev.maganghub.kemnaker.go.id) dengan bantuan AI, dan **mengingatkan lewat WhatsApp** kalau kamu lupa absen.

- ✍️ **Menulis laporan dengan AI.** Tulis kegiatanmu secara singkat. AI (Google Gemini) akan menuliskan kolom
  **Aktivitas**, **Pembelajaran**, dan **Kendala**, lalu mengisinya langsung ke form.
- ⏰ **Pengingat di laptop.** Notifikasi muncul pada jam yang kamu pilih, kalau kamu belum mengisi laporan.
- 💬 **Pengingat lewat WhatsApp.** Pesan dikirim dari nomor bot **milikmu sendiri** lewat layanan
  [Fonnte](https://fonnte.com).

Semua pengaturannya kamu lakukan sendiri. Tidak ada server, akun, atau nomor dari pembuat ekstensi.

> ⚠️ Ini proyek pribadi, **bukan** aplikasi resmi Kemnaker/MagangHub. Selalu baca ulang laporan buatan AI
> sebelum dikirim.

> Tidak butuh WhatsApp? Pakai **versi biasa** di folder utama repositori ini. Pemasangannya lebih mudah.

---

## Gambaran singkat

Pengingat WhatsApp butuh **dua nomor WhatsApp**:

| Nomor | Fungsinya |
|---|---|
| **Nomor bot** | Pengirim pesan pengingat. Disambungkan ke Fonnte. Pakai nomor cadangan, **jangan nomor utamamu**. |
| **Nomor penerima** | Nomor WhatsApp-mu sehari-hari, yang menerima pengingat. |

Ada dua cara pengiriman. Pilih yang sesuai:

| Cara | Kelebihan | Kekurangan |
|---|---|---|
| **Dari Chrome** (bawaan) | Tidak perlu pasang apa-apa lagi. | Pesan hanya terkirim saat laptop menyala dan Chrome terbuka. |
| **Dari server** (opsional) | Pesan tetap terkirim **walau laptop mati**. Bisa membalas *sudah* di WhatsApp. | Perlu memasang server gratis di Google Apps Script (±10 menit, sekali saja). |

Kamu bisa mulai dengan cara **dari Chrome** dulu, lalu menambah server kapan saja.

---

## Yang perlu disiapkan

- Laptop/PC dengan **Google Chrome** (Edge atau Brave juga bisa)
- **Akun Google**, untuk membuat kunci AI gratis (dan server, jika dipakai)
- **Akun MagangHub**
- **Nomor WhatsApp cadangan** untuk bot, di HP yang bisa membuka WhatsApp
- **Nomor WhatsApp-mu** untuk menerima pengingat

---

## Bagian 1: Pasang ekstensi

### 1. Unduh ekstensi

1. Di halaman GitHub repositori ini, klik tombol hijau **Code**, lalu pilih **Download ZIP**.
2. Klik kanan file ZIP yang terunduh, lalu pilih **Extract All**.
3. Buka hasil ekstraknya. Pindahkan folder **versi-whatsapp-fonnte** ke tempat yang aman, misalnya **Documents**.

⚠️ Jangan hapus atau pindahkan folder ini setelah dipasang. Chrome membaca ekstensi langsung dari folder ini.

### 2. Pasang di Chrome

1. Buka Chrome, ketik **chrome://extensions** di kolom alamat, lalu tekan Enter.
2. Nyalakan **Developer mode** di pojok kanan atas.
3. Klik **Load unpacked**.
4. Pilih folder **versi-whatsapp-fonnte**, lalu klik **Select Folder**.
5. Klik ikon puzzle 🧩 di kanan atas Chrome, lalu klik pin 📌 di samping **MagangHub Assistant (WhatsApp)**.

💡 Kalau muncul *"Manifest file is missing"*, berarti folder yang dipilih salah. Pilih folder yang di dalamnya
ada file **manifest.json**.

### 3. Buat kunci AI (gratis)

1. Buka **https://aistudio.google.com/apikey** dan login dengan akun Google.
2. Klik **Create API key**, lalu salin kuncinya.
3. Klik ikon ekstensi di Chrome, lalu tempel kunci di kolom **Gemini API Key**.
4. Klik **Simpan & Test Koneksi**. Kalau muncul *"Koneksi sukses!"*, berarti berhasil.

🔒 Jangan berikan kunci ini ke orang lain.

### 4. Atur jam pengingat di laptop

1. Di bagian **Alarm Otomatis**, pilih zona waktumu (**WIB / WITA / WIT**).
2. Isi jam pengingat. Mau lebih dari satu jam? Klik **+ Jam**.
3. Centang hari kerjamu (misalnya Sen sampai Jum).
4. Klik **Simpan**.

Hari dan zona waktu di sini juga dipakai untuk pengingat WhatsApp.

---

## Bagian 2: Siapkan akun Fonnte

Fonnte adalah layanan yang membuat nomor WhatsApp bisa mengirim pesan otomatis.

1. Buka **https://fonnte.com**, lalu daftar dan login.
2. Buka menu **Device**, lalu klik **Add Device**.
3. Isi nama bebas (misalnya *Pengingat Magang*) dan **nomor bot**, lalu simpan.
4. Pada device tersebut, klik **Connect**. Akan muncul kode QR.
5. Di HP nomor bot, buka WhatsApp → **⋮** → **Perangkat tertaut** → **Tautkan perangkat**, lalu scan kode QR tadi.
6. Setelah statusnya **connect**, salin **Token** device tersebut.

💡 Buka WhatsApp di HP nomor bot sesekali dengan internet aktif, supaya sambungannya tidak putus.

ℹ️ Cek kuota dan batasan paketmu di dashboard Fonnte. Fonnte bukan layanan resmi WhatsApp, jadi gunakan secukupnya
untuk pengingat pribadi.

---

## Bagian 3: Hubungkan WhatsApp di ekstensi

1. Klik ikon ekstensi. Di bagian **Pengingat WhatsApp**:
2. **Langkah 1 dari 2:** tempel **Token** dari Fonnte, lalu klik **Cek Token**.
   Ekstensi akan menampilkan nomor bot dan apakah sudah terhubung.
3. **Langkah 2 dari 2:** isi **nomor WhatsApp-mu** (penerima, contoh 081234567890),
   lalu klik **Simpan & Kirim Tes**.
4. Cek WhatsApp-mu. Seharusnya ada pesan tes dari nomor bot. **Simpan nomor bot di kontakmu** supaya pesannya
   tidak masuk spam.
5. Klik **Edit** untuk mengatur jam pengingat WhatsApp, lalu klik **Simpan**.

Selesai! Pengingat WhatsApp sudah aktif dengan cara **dari Chrome**.

Kalau ingin pengingat tetap terkirim walau laptop mati, lanjut ke **Bagian 4**.

---

## Bagian 4 (opsional): Pasang server supaya pengingat tetap jalan walau laptop mati

Server ini gratis, berjalan di akun Google-mu sendiri, dan hanya dipakai olehmu.

### 1. Buat project Apps Script

1. Buka **https://script.google.com**, lalu klik **New project**.
2. Hapus semua isi file `Code.gs` di editor.
3. Buka file **server-pengingat/Code.gs** dari folder ekstensi (bisa dengan Notepad), salin seluruh isinya,
   lalu tempel ke editor.
4. Simpan dengan **Ctrl+S**.

### 2. Jalankan sekali untuk memberi izin

1. Di menu atas editor, pilih fungsi **setup**, lalu klik **Run**.
2. Saat diminta izin: klik **Review permissions** → pilih akunmu → **Advanced** → **Go to … (unsafe)** → **Allow**.
   Peringatan ini normal karena skrip dibuat sendiri, bukan dari Google.

### 3. Jadikan Web App

1. Klik **Deploy** → **New deployment**.
2. Klik ⚙ di samping *Select type*, lalu pilih **Web app**.
3. Isi **Execute as:** *Me*, dan **Who has access:** *Anyone*.
4. Klik **Deploy**, lalu salin **Web app URL** (berakhiran `/exec`).

🔒 Jangan bagikan URL ini ke orang lain.

### 4. Tempel alamat server di ekstensi

1. Klik ikon ekstensi. Di bagian **Pengingat WhatsApp**, klik **Edit**.
2. Tempel URL tadi ke kolom **Alamat server**, lalu klik **Simpan**.
3. Kamu akan menerima pesan WhatsApp *"Server pengingat MagangHub terhubung"*.

Sekarang tulisan di ekstensi berubah menjadi **Dikirim dari server (tetap jalan walau laptop mati)**.

### 5. Aktifkan balasan WhatsApp (opsional)

Supaya kamu bisa membalas pesan pengingat dengan **sudah**:

1. Di Fonnte, buka **Device**, lalu klik **Edit** pada device bot.
2. Tempel **Web app URL** yang sama ke kolom **Webhook**, lalu simpan.

| Balas dengan | Artinya |
|---|---|
| **sudah** | Aku sudah absen. Pengingat hari ini berhenti. |
| **batal** | Ternyata aku belum absen. |
| **status** | Cek apakah hari ini sudah tercatat absen. |
| **bantuan** | Tampilkan daftar perintah. |

Ingin berhenti memakai server? Klik **Edit**, kosongkan kolom **Alamat server**, lalu **Simpan**.
Pengingat akan kembali dikirim dari Chrome.

---

## Cara mengisi laporan setiap hari

1. Buka MagangHub dan masuk ke **halaman form laporan harian**.
2. Klik ikon ekstensi.
3. Tulis kegiatanmu hari ini secara singkat.
4. Klik tombol kuning **Buat & Isi Laporan dengan AI**, lalu tunggu sebentar.
5. **Baca dulu hasilnya** di form, ubah kalau perlu, lalu klik tombol kirim di MagangHub.

**Pilihan cara menulis** (menu *Mode Pengisian*):

- **Ketik 1 Poin:** cukup tulis kegiatanmu. AI yang memikirkan pembelajaran dan kendalanya.
- **Ketik 3 Poin:** tulis sendiri kegiatan, pembelajaran, dan kendala secara singkat. AI yang merapikannya.

**Perlu diketahui:**

- Kolom yang sudah ada isinya **tidak akan ditimpa**.
- Setelah laporan diisi, ekstensi menandai kamu **sudah absen** hari itu, jadi pengingat di laptop dan WhatsApp
  berhenti. Kalau ternyata belum terkirim, klik **Batalkan**. Kalau kamu mengisi laporan sendiri tanpa AI,
  klik **Tandai sudah absen**.
- Prosesnya terasa macet? Klik tombol **⟳** di bagian atas, lalu coba lagi.

---

## Kalau ada masalah

**Muncul peringatan "Disable developer mode extensions" setiap membuka Chrome**
Ini normal untuk ekstensi yang dipasang dari folder. Tutup saja, **jangan** klik *Disable*.

**"API key Gemini tidak valid" atau "Koneksi gagal"**
Salin ulang kuncimu dan pastikan tidak ada spasi. Kalau masih gagal, buat kunci baru.

**"Buka halaman form laporan MagangHub dahulu"**
Buka halaman form laporan harian di MagangHub, lalu klik ikon ekstensi dari halaman itu.

**"Kuota habis" atau "Semua model AI sedang gagal"**
Batas gratis Gemini sedang habis atau servernya sibuk. Tunggu beberapa menit, klik **⟳**, lalu coba lagi.

**"Fonnte menolak: token tidak valid"**
Salin ulang **Token** dari menu Device di Fonnte. Pastikan yang disalin token **device**, bukan token akun.

**"Nomor bot belum terhubung di Fonnte"**
Buka Fonnte → Device → **Connect**, lalu scan ulang kode QR dari WhatsApp nomor bot.

**Pesan tes masuk, tapi tidak ada bunyi notifikasi**
Kemungkinan nomor penerima sama dengan nomor bot (pesan ke diri sendiri). Pakai dua nomor yang berbeda.

**Pengingat WhatsApp tidak terkirim (tanpa server)**
Pengingat dari Chrome hanya terkirim saat laptop menyala dan Chrome terbuka. Pasang server (Bagian 4) supaya
tetap jalan walau laptop mati.

**"Alamat server harus URL Web App ... /exec" atau "Server tidak membalas dengan benar"**
Pastikan URL yang ditempel berakhiran `/exec` dan **Who has access** diatur ke *Anyone* (Bagian 4 langkah 3).

**"Server ini sudah terhubung dengan akun Fonnte lain"**
Server-mu pernah dihubungkan dengan token lain. Di Apps Script, buka ⚙ **Project Settings** →
**Script Properties**, hapus property **CONFIG**, lalu simpan alamat server lagi di ekstensi.

**Pengingat dari server tidak pernah datang**
Di editor Apps Script, jalankan lagi fungsi **setup**, lalu cek menu **Executions** untuk melihat error.

**Balasan "sudah" tidak dibalas bot**
Pastikan **Webhook** di Fonnte sudah diisi URL server (Bagian 4 langkah 5).

**Mengubah isi Code.gs (misalnya setelah update)**
Setelah menyimpan, klik **Deploy** → **Manage deployments** → ✏ → **Version: New version** → **Deploy**.
Alamat server tidak berubah.

---

## Memperbarui ke versi terbaru

1. Unduh lagi ZIP terbaru dari halaman GitHub ini.
2. Timpa isi folder ekstensi yang lama dengan isi folder **versi-whatsapp-fonnte** yang baru.
3. Buka **chrome://extensions**, lalu klik ikon **⟳** pada MagangHub Assistant (WhatsApp).
4. Jika memakai server dan **Code.gs** ikut berubah, perbarui juga server (lihat masalah terakhir di atas).

Pengaturanmu tidak akan hilang.

## Menghapus ekstensi

1. Di ekstensi, klik **Edit** → **Atur ulang dari awal** untuk menghentikan pengingat WhatsApp dan memutus server.
2. Buka **chrome://extensions**, klik **Remove**, lalu hapus foldernya.
3. Jika memakai server, hapus juga project-nya di **https://script.google.com**.

---

## Privasi

- Kunci AI, token Fonnte, nomor WhatsApp, dan jam pengingat disimpan **di browser-mu**.
- Tulisan kegiatanmu dikirim ke **Google Gemini** memakai kunci AI milikmu.
- Pesan WhatsApp dikirim lewat **Fonnte** memakai token milikmu.
- Jika memakai server, token Fonnte, nomor penerima, jadwal, dan status absen juga disimpan di
  **akun Google Apps Script milikmu sendiri**. Pembuat ekstensi tidak menerima data apa pun.
