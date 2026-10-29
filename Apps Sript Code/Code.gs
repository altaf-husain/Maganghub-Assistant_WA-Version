/**
 * Server Pengingat MagangHub PRIBADI (Google Apps Script) - OPSIONAL
 *
 * Tanpa server ini, ekstensi mengirim pengingat WhatsApp langsung dari Chrome (hanya saat Chrome terbuka).
 * Dengan server ini:
 * - Setiap 15 menit server mengecek: jika hari pengingat, sudah lewat salah satu jam pengingat, dan
 *   belum absen, kirim WhatsApp lewat akun Fonnte milikmu. Tetap jalan walau laptop mati.
 * - Balasan WhatsApp ("sudah", "batal", "status") diproses jika webhook Fonnte diarahkan ke sini.
 *
 * Satu server untuk satu orang. Token Fonnte, nomor penerima, dan jadwal dikirim oleh ekstensi saat
 * alamat server diisi di popup, jadi file ini tidak perlu diubah. Cara pasang: lihat README.md.
 */

const MAGANGHUB_URL = 'https://monev.maganghub.kemnaker.go.id/dashboard';
const CHECK_EVERY_MINUTES = 15;
const TIMEZONES = { WIB: 'Asia/Jakarta', WITA: 'Asia/Makassar', WIT: 'Asia/Jayapura' };

// ---------- Penyimpanan ----------
// Script Property CONFIG = { token, phone, key, times: ['17:00'], days: [1..5], tz: 'WIB', doneDate, sent: { date, times } }

function props() {
  return PropertiesService.getScriptProperties();
}

function readConfig() {
  const value = props().getProperty('CONFIG');
  return value ? JSON.parse(value) : null;
}

function saveConfig(config) {
  props().setProperty('CONFIG', JSON.stringify(config));
}

// ---------- Utilitas ----------

// "0812-3456-7890" / "+62812..." / "812..." -> "62812..."
function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.indexOf('62') === 0) return digits;
  if (digits.indexOf('0') === 0) return '62' + digits.slice(1);
  if (digits.indexOf('8') === 0) return '62' + digits;
  return digits;
}

// ["17:00", "9.30"] -> ["09:30", "17:00"]; jam yang tidak valid diabaikan
function cleanTimes(list) {
  return (list || []).map(function (t) {
    const match = String(t).trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
    return ('0' + match[1]).slice(-2) + ':' + match[2];
  }).filter(function (t, i, arr) { return t && arr.indexOf(t) === i; }).sort();
}

function cleanDays(list) {
  return (list || []).map(Number).filter(function (d, i, arr) {
    return d >= 0 && d <= 6 && arr.indexOf(d) === i;
  }).sort();
}

function zoneOf(config) {
  return TIMEZONES[config.tz] || TIMEZONES.WIB;
}

function todayKey(config) {
  return Utilities.formatDate(new Date(), zoneOf(config), 'yyyy-MM-dd');
}

// "Jumat, 17/10/2026" di zona waktu pengguna
function todayLabel(config) {
  const now = new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const day = dayNames[Number(Utilities.formatDate(now, zoneOf(config), 'u')) % 7];
  return day + ', ' + Utilities.formatDate(now, zoneOf(config), 'd/M/yyyy');
}

function isDone(config) {
  return config.doneDate === todayKey(config);
}

// ---------- Kirim WhatsApp lewat Fonnte ----------

function sendWhatsApp(config, message) {
  const response = UrlFetchApp.fetch('https://api.fonnte.com/send', {
    method: 'post',
    headers: { Authorization: config.token },
    payload: { target: config.phone, message: message, countryCode: '0' },
    muteHttpExceptions: true
  });
  let data = {};
  try { data = JSON.parse(response.getContentText()); } catch (e) {}
  if (data.status !== true) {
    throw new Error('Fonnte menolak pesan: ' + (data.reason || 'HTTP ' + response.getResponseCode()));
  }
}

function reminderMessage(config, count) {
  return '⏰ *Pengingat MagangHub*' + (count > 1 ? ' (ke-' + count + ')' : '') + '\n' +
    'Kamu belum mengisi laporan harian hari ini (' + todayLabel(config) + ').\n' +
    'Isi sekarang: ' + MAGANGHUB_URL + '\n\n' +
    'Balas *sudah* jika sudah absen.';
}

const HELP_MESSAGE = 'Perintah yang bisa dipakai:\n' +
  '• *sudah*: tandai sudah absen hari ini\n' +
  '• *batal*: kembalikan ke belum absen\n' +
  '• *status*: cek status hari ini';

function setDone(config, done) {
  config.doneDate = done ? todayKey(config) : null;
  saveConfig(config);
}

// ---------- Pemicu berkala ----------

function checkReminder() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const config = readConfig();
    if (config) remind(config);
  } finally {
    lock.releaseLock();
  }
}

function remind(config) {
  if (isDone(config)) return;

  const now = new Date();
  const weekday = Number(Utilities.formatDate(now, zoneOf(config), 'u')) % 7; // 1..7 (Senin..Minggu) -> 0..6
  if ((config.days || []).indexOf(weekday) === -1) return;

  // Jam pengingat yang sudah lewat tapi belum dikirim hari ini
  const currentTime = Utilities.formatDate(now, zoneOf(config), 'HH:mm');
  const today = todayKey(config);
  const sentTimes = config.sent && config.sent.date === today ? config.sent.times : [];
  const dueTimes = (config.times || []).filter(function (t) { return t <= currentTime; });
  const pending = dueTimes.filter(function (t) { return sentTimes.indexOf(t) === -1; });
  if (pending.length === 0) return;

  // Satu pesan saja walau beberapa jam terlewat sekaligus
  sendWhatsApp(config, reminderMessage(config, dueTimes.length - pending.length + 1));
  config.sent = { date: today, times: dueTimes };
  saveConfig(config);
}

// Pasang pemicu checkReminder jika belum ada
function ensureTrigger() {
  const exists = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'checkReminder';
  });
  if (!exists) ScriptApp.newTrigger('checkReminder').timeBased().everyMinutes(CHECK_EVERY_MINUTES).create();
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'checkReminder') ScriptApp.deleteTrigger(trigger);
  });
}

// ---------- Web App: dipanggil ekstensi Chrome ----------
// GET <url>/exec?action=...&key=...

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json({ success: false, error: 'Server sibuk, coba lagi.' });
  try {
    return json(handleAction(params));
  } catch (err) {
    return json({ success: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function handleAction(params) {
  if (params.action === 'connect') return connect(params);

  // Selain connect, semua permintaan harus membawa kunci yang diberikan saat connect
  const config = readConfig();
  if (!config || !params.key || params.key !== config.key) {
    throw new Error('Ekstensi belum terhubung ke server ini. Kosongkan alamat server, simpan, lalu isi lagi.');
  }
  switch (params.action) {
    case 'status':
      break;
    case 'done':
      setDone(config, true);
      break;
    case 'undo':
      setDone(config, false);
      break;
    case 'settings': {
      const times = cleanTimes(String(params.times || '').split(','));
      if (times.length === 0) throw new Error('Isi minimal 1 jam pengingat.');
      config.times = times;
      config.days = cleanDays(String(params.days || '').split(',').filter(String));
      if (TIMEZONES[params.tz]) config.tz = params.tz;
      saveConfig(config);
      break;
    }
    case 'test':
      sendWhatsApp(config, '✅ Tes Pengingat MagangHub dari server berhasil. Pengingat akan dikirim jam ' +
        config.times.join(', ') + ' (' + config.tz + ') jika kamu belum absen, walau laptop mati.');
      break;
    case 'disconnect':
      props().deleteProperty('CONFIG');
      removeTriggers();
      return { success: true };
    default:
      throw new Error('Action tidak dikenal.');
  }
  return { success: true, user: { times: config.times, days: config.days, tz: config.tz, done: isDone(config) } };
}

// Hubungkan ekstensi: simpan token Fonnte + nomor penerima, lalu beri kunci akses.
// Jika server sudah terhubung, hanya token Fonnte yang sama yang boleh menghubungkan ulang.
function connect(params) {
  const token = String(params.token || '').trim();
  const phone = normalizePhone(params.phone);
  if (!token) throw new Error('Token Fonnte kosong.');
  if (!/^62\d{8,13}$/.test(phone)) throw new Error('Nomor WhatsApp penerima tidak valid.');

  const existing = readConfig();
  if (existing && existing.token !== token) {
    throw new Error('Server ini sudah terhubung dengan akun Fonnte lain. Hapus property CONFIG di Script Properties untuk memulai ulang.');
  }

  const config = existing || { times: ['17:00'], days: [1, 2, 3, 4, 5], tz: 'WIB', doneDate: null, sent: null };
  config.token = token;
  config.phone = phone;
  config.key = config.key || Utilities.getUuid().replace(/-/g, '');

  // Sekaligus memastikan token Fonnte bisa dipakai dari server
  sendWhatsApp(config, '🔗 Server pengingat MagangHub terhubung. Pengingat tetap dikirim walau laptop mati.\n\n' + HELP_MESSAGE);
  saveConfig(config);
  ensureTrigger();
  return { success: true, key: config.key };
}

// ---------- Webhook Fonnte: balasan WhatsApp ----------
// Isi URL Web App ini di kolom Webhook pada device Fonnte.

function doPost(e) {
  let data = {};
  try { data = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  if (!data.sender && e && e.parameter) data = e.parameter;

  // Nomor pengirim kadang berbentuk "62812...@s.whatsapp.net" atau "62812...:12@..."; ambil nomornya saja
  const senderPhone = normalizePhone(String(data.sender || '').split(/[:@]/)[0]);
  const text = String(data.message || data.text || '').trim().toLowerCase().replace(/[*_~]/g, '');
  // Tercatat di menu Executions Apps Script, untuk memeriksa apakah webhook Fonnte sampai ke sini
  console.log('Webhook masuk dari ' + (senderPhone || '(kosong)') + ': "' + text + '"');

  // Hanya nomor penerima pengingat yang dilayani; pesan dari nomor lain diabaikan
  const config = readConfig();
  if (!config || senderPhone !== config.phone) return json({ ok: true });

  let reply = null;
  if (/^(sudah|udah|sdh|done)\b/.test(text)) {
    setDone(config, true);
    reply = '✅ Tercatat sudah absen hari ini. Pengingat hari ini dimatikan.';
  } else if (/^(batal|belum)\b/.test(text)) {
    setDone(config, false);
    reply = 'Oke, status hari ini kembali *belum absen*.';
  } else if (/^(status|cek)\b/.test(text)) {
    reply = isDone(config) ? 'Status hari ini: ✔ sudah absen.' : 'Status hari ini: belum absen.';
  } else if (/^(bantuan|help|menu)\b/.test(text)) {
    reply = HELP_MESSAGE;
  }

  if (reply) {
    try { sendWhatsApp(config, reply); } catch (err) { console.warn(err.message); }
  }
  return json({ ok: true });
}

// ---------- Jalankan sekali dari editor: pilih "setup" lalu klik Run ----------
// Memberi izin akses skrip dan memasang pemicu. Pemicu juga dipasang otomatis saat ekstensi terhubung.

function setup() {
  ensureTrigger();
  const config = readConfig();
  console.log('Pemicu terpasang: cek setiap ' + CHECK_EVERY_MINUTES + ' menit.');
  console.log(config
    ? 'Terhubung ke nomor ' + config.phone + ' | jam ' + config.times.join(', ') + ' ' + config.tz
    : 'Belum terhubung. Isi alamat server ini di popup ekstensi.');
}
