# MagangHub Assistant (Versi Pengingat WhatsApp)

Ekstensi Chrome (Manifest V3) untuk membantu peserta magang mengisi **laporan harian MagangHub**
(monev.maganghub.kemnaker.go.id) dengan **Google Gemini API**, ditambah **pengingat WhatsApp** lewat
**Fonnte API** memakai device milik sendiri.

- ✍️ **Auto-fill laporan dengan AI.** Gemini API menyusun field **Uraian aktivitas**, **Pembelajaran**, dan
  **Kendala**, lalu content script mengisinya ke form MagangHub.
- ⏰ **Alarm Otomatis.** Notifikasi Chrome pada jam dan hari yang diatur, jika belum absen.
- 💬 **Pengingat WhatsApp.** Pesan dikirim lewat Fonnte API dari **device (nomor bot) milikmu** ke nomor penerima.
  Bisa dikirim langsung dari ekstensi, atau dari **Google Apps Script Web App** milikmu sendiri agar tetap jalan
  walau laptop mati.

Semua konfigurasi dilakukan sendiri oleh pengguna: Gemini API key, akun & device Fonnte, dan (opsional) deployment
Apps Script. Tidak ada backend, token, atau nomor dari pembuat ekstensi.

> ⚠️ Proyek pribadi, **bukan** aplikasi resmi Kemnaker/MagangHub. Fonnte juga bukan WhatsApp Business API resmi;
> gunakan secukupnya untuk pengingat pribadi.

> Tidak butuh WhatsApp? Pakai **versi standar** di root repositori.

---

## Arsitektur

Pengingat WhatsApp punya dua mode:

| Mode | Pengirim pesan | Kelebihan | Kekurangan |
|---|---|---|---|
| **Lokal** (default) | Service worker ekstensi memanggil `api.fonnte.com/send` saat alarm `wa_HH:MM` berbunyi | Tanpa setup tambahan | Hanya jalan saat Chrome berjalan |
| **Server** (opsional) | Google Apps Script dengan time-driven trigger tiap 15 menit | Jalan walau laptop mati; mendukung balasan WA via webhook | Perlu deploy Web App sendiri |

Dibutuhkan **dua nomor WhatsApp**:

| Nomor | Peran |
|---|---|
| **Nomor device (bot)** | Ditautkan ke Fonnte sebagai *device*; menjadi pengirim pesan. Gunakan nomor cadangan. |
| **Nomor penerima (target)** | Nomor WhatsApp yang menerima pengingat. Sebaiknya berbeda dari nomor device, karena pesan ke diri sendiri tidak memunculkan notifikasi. |

Alur mode server:

```
Ekstensi ──(GET ?action=connect&token&phone)──► Apps Script Web App ──► simpan CONFIG di Script Properties
                                                   │                      + buat key akses + pasang trigger
Ekstensi ──(GET ?action=settings|done|undo|status|test&key)──►│
                                                   ▼
                                       trigger checkReminder (15 menit)
                                                   │ belum absen & lewat jam
                                                   ▼
                                       api.fonnte.com/send ──► WhatsApp penerima
                                                   ▲
Balasan WA ("sudah"/"batal"/"status") ──► Fonnte webhook ──► doPost Web App
```

## Struktur folder

```
versi-whatsapp-fonnte/
├── manifest.json            # Manifest V3; host_permissions: Gemini, Fonnte, Apps Script
├── background.js            # Service worker: alarm, status absen, Fonnte API, sinkron ke server
├── content.js               # Content script di halaman MagangHub
├── popup.html / popup.js    # UI popup: Gemini, Alarm Otomatis, wizard setup Fonnte
├── styles.css
├── icon.png
└── server-pengingat/
    └── Code.gs              # Google Apps Script (opsional), server pengingat pribadi
```

## Permissions

| Permission | Dipakai untuk |
|---|---|
| `storage` | Menyimpan API key, token Fonnte, nomor, jadwal, dan status di `chrome.storage.local` |
| `activeTab`, `scripting` | Menyuntikkan ulang `content.js` ke tab MagangHub |
| `alarms`, `notifications` | Alarm harian (`alarm_HH:MM`, `wa_HH:MM`) dan notifikasi |
| `https://generativelanguage.googleapis.com/*` | Gemini API |
| `https://api.fonnte.com/*` | Fonnte API (`/device`, `/send`) |
| `https://script.google.com/*`, `https://script.googleusercontent.com/*` | Request ke Apps Script Web App (redirect ke googleusercontent) |

---

## Prasyarat

- Google Chrome atau browser berbasis Chromium (Edge, Brave)
- Akun Google: untuk **Gemini API key** dan (opsional) **Google Apps Script**
- Akun MagangHub
- Akun **[Fonnte](https://fonnte.com)**
- Nomor WhatsApp cadangan untuk device Fonnte, dan nomor WhatsApp penerima

---

## 1. Instalasi ekstensi

### 1.1 Download source

- Klik **Code → Download ZIP** lalu extract, atau `git clone <url-repositori-ini>`.
- Simpan folder `versi-whatsapp-fonnte/` di lokasi permanen. Ekstensi *unpacked* dibaca langsung dari folder ini.

### 1.2 Load unpacked extension

1. Buka `chrome://extensions` (Edge: `edge://extensions`).
2. Aktifkan **Developer mode**.
3. Klik **Load unpacked**, lalu pilih folder `versi-whatsapp-fonnte/` (yang berisi `manifest.json`).
4. Pin ekstensi **MagangHub Assistant (WhatsApp)** lewat ikon 🧩.

### 1.3 Konfigurasi Gemini API key

1. Buat API key di **https://aistudio.google.com/apikey**.
2. Di popup, buka **⚙ Pengaturan Gemini API**, tempel di **Gemini API Key**, lalu klik **Simpan & Test Koneksi**.

### 1.4 Atur Alarm Otomatis

1. Pilih zona waktu (**WIB / WITA / WIT**), tambah jam (**+ Jam**), centang hari aktif, lalu **Simpan**.
2. **Hari** dan **zona waktu** ini juga dipakai untuk pengingat WhatsApp (jika belum ada jadwal: Senin–Jumat).

---

## 2. Setup device Fonnte

1. Daftar dan login di **https://fonnte.com**.
2. Buka menu **Device** → **Add Device**. Isi nama device dan **nomor device (bot)**.
3. Klik **Connect**, lalu scan QR dari WhatsApp nomor device: **⋮ → Perangkat tertaut → Tautkan perangkat**.
4. Pastikan status device **connect**, lalu salin **token device**.

Catatan:

- Yang dipakai adalah **token device**, bukan token akun.
- Fonnte memakai sesi *linked device* WhatsApp. Buka WhatsApp di HP nomor device sesekali agar sesi tidak terputus.
- Cek kuota dan fitur paket (misalnya webhook) di dashboard Fonnte.

---

## 3. Hubungkan Fonnte di ekstensi (mode lokal)

Di popup, bagian **Pengingat WhatsApp**:

1. **Langkah 1 dari 2:** tempel token device, klik **Cek Token**.
   Ekstensi memanggil `POST api.fonnte.com/device` untuk memvalidasi token dan menampilkan nomor device beserta
   status koneksinya.
2. **Langkah 2 dari 2:** isi **nomor penerima** (format `08…` / `62…` / `+62…`, dinormalisasi ke `62…`),
   klik **Simpan & Kirim Tes**. Ekstensi mengirim pesan tes lewat `POST api.fonnte.com/send`; konfigurasi
   hanya disimpan jika pengiriman berhasil.
3. Klik **Edit** untuk mengatur jam pengingat WhatsApp, lalu **Simpan**.

Pada mode lokal, service worker memasang alarm `wa_HH:MM` per jam pengingat. Saat alarm berbunyi, jika hari aktif
dan status belum absen, pesan dikirim langsung ke Fonnte API.

---

## 4. (Opsional) Deploy server Google Apps Script

Server bersifat **single-user**: satu deployment untuk satu pengguna. Token Fonnte, nomor penerima, dan jadwal
dikirim oleh ekstensi dan disimpan di **Script Properties** (key `CONFIG`). `Code.gs` tidak perlu diedit.

### 4.1 Buat project

1. Buka **https://script.google.com** → **New project**.
2. Ganti isi `Code.gs` dengan isi [`server-pengingat/Code.gs`](server-pengingat/Code.gs), lalu simpan.

### 4.2 Otorisasi

1. Pilih fungsi `setup` di toolbar editor, lalu klik **Run**.
2. Berikan izin: **Review permissions → Advanced → Go to … (unsafe) → Allow**
   (normal untuk script yang belum diverifikasi Google). Scope yang diminta: `UrlFetchApp` (memanggil Fonnte),
   `ScriptApp` (membuat trigger), dan `PropertiesService`.

### 4.3 Deploy sebagai Web App

1. **Deploy → New deployment** → type **Web app**.
2. **Execute as:** *Me*, **Who has access:** *Anyone*.
3. **Deploy**, lalu salin **Web App URL** (berakhiran `/exec`).

Akses *Anyone* diperlukan agar ekstensi bisa memanggil Web App tanpa login Google. Setelah `connect`, semua
request lain wajib membawa `key` acak yang dibuat server; `connect` ulang hanya diterima dengan token Fonnte yang
sama. Tetap jangan publikasikan Web App URL.

### 4.4 Hubungkan ekstensi ke server

1. Di popup, **Pengingat WhatsApp → Edit**, isi **Alamat server** dengan Web App URL, lalu **Simpan**.
2. Ekstensi memanggil `?action=connect`, server mengirim pesan konfirmasi ke WhatsApp penerima, menyimpan
   `CONFIG`, dan memasang time-driven trigger `checkReminder` (tiap 15 menit).
3. Ekstensi lalu mengirim jam, hari, dan zona waktu (`?action=settings`). Alarm lokal `wa_HH:MM` dilepas karena
   pengiriman diambil alih server.

Untuk kembali ke mode lokal, kosongkan **Alamat server** lalu **Simpan** (ekstensi memanggil `?action=disconnect`,
server menghapus `CONFIG` dan trigger).

### 4.5 (Opsional) Webhook untuk balasan WhatsApp

Di Fonnte, **Device → Edit**, isi field **Webhook** dengan Web App URL yang sama. Pesan masuk akan diteruskan
ke `doPost`, dan hanya pesan dari nomor penerima yang diproses:

| Balasan | Aksi |
|---|---|
| `sudah` | Set `doneDate` hari ini; pengingat hari ini berhenti |
| `batal` | Reset status ke belum absen |
| `status` | Balas status absen hari ini |
| `bantuan` | Balas daftar perintah |

Status absen dari webhook disinkronkan ke ekstensi lewat `?action=status` saat popup dibuka atau alarm berbunyi.

### 4.6 Update `Code.gs`

Setelah mengubah kode: **Deploy → Manage deployments → ✏ → Version: New version → Deploy**.
Web App URL tetap sama.

---

## Penggunaan harian

1. Buka halaman form laporan harian di MagangHub.
2. Buka popup, pilih **Mode Pengisian** (1 poin / 3 poin), tulis poin aktivitas.
3. Klik **Buat & Isi Laporan dengan AI**, review hasil di form, lalu submit.

Setelah form terisi (atau tombol *Kirim/Simpan* diklik), status absen menjadi *Sudah*: notifikasi Chrome dan
pengingat WhatsApp hari itu berhenti. Pada mode server, status juga dikirim ke server (`?action=done`).
Koreksi manual lewat **Batalkan** / **Tandai sudah absen**.

---

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| Banner *"Disable developer mode extensions"* | Normal untuk ekstensi unpacked. Tutup saja. |
| *"API key Gemini tidak valid"* / HTTP 400/401/403 | API key salah. Generate ulang di AI Studio. |
| *"Kuota model … habis/sibuk"* | Rate limit / quota free tier Gemini (HTTP 429) atau 5xx. Tunggu, lalu klik ⟳. |
| *"Fonnte menolak: …"* saat Cek Token | Token salah atau yang dipakai token akun. Gunakan **token device**. |
| *"Nomor bot belum terhubung"* | `device_status` bukan `connect`. Scan ulang QR di Fonnte. |
| Pesan tes masuk tanpa notifikasi | Nomor penerima sama dengan nomor device (pesan ke diri sendiri). |
| Pengingat mode lokal tidak terkirim | Chrome tidak berjalan pada jam pengingat. Gunakan mode server. |
| *"Alamat server harus URL Web App … /exec"* | URL bukan Web App URL. Salin dari **Deploy → Manage deployments**. |
| *"Server tidak membalas dengan benar"* | Akses Web App bukan *Anyone*, atau deployment belum dibuat/diupdate. |
| *"Server ini sudah terhubung dengan akun Fonnte lain"* | `CONFIG` berisi token lain. Hapus property `CONFIG` di **Project Settings → Script Properties**, lalu simpan ulang alamat server. |
| *"Ekstensi belum terhubung ke server ini"* | `key` tidak cocok (misalnya `CONFIG` dihapus). Kosongkan alamat server, simpan, lalu isi lagi. |
| Server tidak pernah mengirim pengingat | Jalankan `setup` lagi untuk memasang trigger, lalu cek **Executions** di Apps Script. |
| Balasan `sudah` tidak diproses | Webhook Fonnte belum diisi, paket tidak mendukung webhook, atau pengirim bukan nomor penerima. Cek log `doPost` di **Executions**. |

Debugging ekstensi: `chrome://extensions` → **Service worker** (log background), atau klik kanan popup → **Inspect**.

---

## Update

1. `git pull` atau download ulang ZIP dan timpa isi `versi-whatsapp-fonnte/`.
2. **Reload** ekstensi di `chrome://extensions`.
3. Jika `server-pengingat/Code.gs` berubah dan kamu memakai mode server, update deployment (lihat 4.6).

## Uninstall

1. Di popup, **Pengingat WhatsApp → Edit → Atur ulang dari awal** (memanggil `disconnect` jika memakai server).
2. **Remove** ekstensi di `chrome://extensions`.
3. Jika memakai server, hapus project Apps Script (otomatis menghapus trigger dan Script Properties).

---

## Privasi

- Gemini API key, token Fonnte, nomor, jadwal, dan status absen disimpan di `chrome.storage.local`.
- Teks poin aktivitas dikirim ke **Gemini API** memakai API key milik pengguna.
- Pesan WhatsApp dikirim lewat **Fonnte API** memakai token device milik pengguna.
- Pada mode server, token Fonnte, nomor penerima, jadwal, dan status absen juga disimpan di **Script Properties
  project Apps Script milik pengguna sendiri**. Pembuat ekstensi tidak menerima data apa pun.
