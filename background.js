// --- JADWAL ALARM MAGANGHUB ---
// Disimpan user lewat popup dalam bentuk { 'HH:MM': [hari, ...] }; kosong sampai user mengaturnya
// 0: Minggu, 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat, 6: Sabtu

const MAGANGHUB_URL = 'https://monev.maganghub.kemnaker.go.id/dashboard';
const FONNTE_URL = 'https://api.fonnte.com';
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Zona waktu Indonesia (selisih jam dari UTC)
const TIMEZONE_OFFSETS = { WIB: 7, WITA: 8, WIT: 9 };

// Tebak zona waktu dari jam komputer; di luar Indonesia dianggap WIB
function detectTimezone() {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  return Object.keys(TIMEZONE_OFFSETS).find(zone => TIMEZONE_OFFSETS[zone] === offsetHours) || 'WIB';
}

// Waktu saat ini di zona terpilih; baca nilainya dengan getter UTC (getUTCHours, getUTCDay, dst.)
function nowInZone(timezone) {
  return new Date(Date.now() + TIMEZONE_OFFSETS[timezone] * 3600000);
}

// Tanggal hari ini (YYYY-MM-DD) di zona terpilih
function todayKey(timezone) {
  return nowInZone(timezone).toISOString().slice(0, 10);
}

// Ambil pengaturan alarm milik user dari storage
function getAlarmConfig(callback) {
  chrome.storage.local.get(['alarmSchedule', 'alarmTimezone'], (result) => {
    callback({
      schedule: result.alarmSchedule || {},
      timezone: TIMEZONE_OFFSETS[result.alarmTimezone] ? result.alarmTimezone : detectTimezone()
    });
  });
}

// Hari pengingat WhatsApp mengikuti Alarm Otomatis; belum ada jadwal alarm: Senin-Jumat
function reminderDays(config) {
  const days = Array.from(new Set(Object.values(config.schedule).flat())).sort();
  return days.length ? days : [1, 2, 3, 4, 5];
}

// Menit dari sekarang sampai jam HH:MM berikutnya di zona terpilih
function minutesUntil(timeString, timezone) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const now = nowInZone(timezone);
  const target = new Date(now.getTime());
  target.setUTCHours(hours, minutes, 0, 0);

  // Jika jam sudah terlewat hari ini, pasang untuk besok
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return (target.getTime() - now.getTime()) / 60000;
}

// Alarm harian: alarm_HH:MM (notifikasi Chrome) dan wa_HH:MM (WhatsApp dikirim dari Chrome)
function isDailyAlarm(name) {
  return name.startsWith('alarm_') || name.startsWith('wa_');
}

// Daftar alarm harian yang seharusnya ada. Alarm WhatsApp hanya dipasang jika tidak memakai server,
// karena server yang mengirim pengingatnya sendiri.
function getExpectedAlarms(callback) {
  getAlarmConfig((config) => {
    chrome.storage.local.get(['waConfig'], (result) => {
      const names = Object.keys(config.schedule).map(timeString => `alarm_${timeString}`);
      const waConfig = result.waConfig;
      if (isWaReady(waConfig) && !hasServer(waConfig)) {
        waConfig.times.forEach(timeString => names.push(`wa_${timeString}`));
      }
      callback(names, config);
    });
  });
}

// Fungsi untuk membuat/mereset alarm harian sesuai pengaturan user
function setupAlarms(callback) {
  getExpectedAlarms((names, config) => {
    chrome.alarms.getAll((alarms) => {
      const old = alarms.map(alarm => alarm.name).filter(isDailyAlarm);
      Promise.all(old.map(name => chrome.alarms.clear(name))).then(() => {
        names.forEach(name => {
          // Buat alarm yang berulang setiap 24 jam (1440 menit)
          chrome.alarms.create(name, {
            delayInMinutes: minutesUntil(name.split('_')[1], config.timezone),
            periodInMinutes: 1440
          });
        });
        console.log("Jadwal Alarm Otomatis Berhasil Diperbarui!");
        if (callback) callback();
      });
    });
  });
}

// Pasang ulang alarm jika ada yang hilang, supaya pengingat selalu aktif
function ensureAlarms() {
  getExpectedAlarms((expected) => {
    chrome.alarms.getAll((alarms) => {
      const scheduled = alarms.map(alarm => alarm.name).filter(isDailyAlarm);
      const complete = expected.length === scheduled.length && expected.every(name => scheduled.includes(name));
      if (!complete) setupAlarms();
    });
  });
}

// --- STATUS ABSEN HARI INI ---
// Disimpan sebagai tanggal terakhir user absen; pengingat dilewati jika sama dengan hari ini.
// Jika memakai server, status di server ikut dicek (bisa berubah karena balasan "sudah" di WhatsApp)
function getAbsenStatus(callback) {
  getAlarmConfig((config) => {
    chrome.storage.local.get(['lastAbsenDate', 'waConfig'], async (result) => {
      const today = todayKey(config.timezone);
      let done = result.lastAbsenDate === today;

      if (hasServer(result.waConfig)) {
        try {
          const server = await callServer(result.waConfig.serverUrl, 'status', { key: result.waConfig.serverKey });
          if (server.user.done !== done) {
            done = server.user.done;
            chrome.storage.local.set({ lastAbsenDate: done ? today : null });
          }
        } catch (e) {
          console.warn('Gagal cek status di server:', e.message); // Pakai status lokal
        }
      }
      callback({ done: done });
    });
  });
}

function setAbsenStatus(done, callback) {
  getAlarmConfig((config) => {
    chrome.storage.local.set({ lastAbsenDate: done ? todayKey(config.timezone) : null }, () => {
      if (done) chrome.notifications.clear('reminderNotif');

      // Kabari server supaya pengingat WhatsApp hari ini berhenti / jalan lagi
      chrome.storage.local.get(['waConfig'], (result) => {
        if (!hasServer(result.waConfig)) return;
        callServer(result.waConfig.serverUrl, done ? 'done' : 'undo', { key: result.waConfig.serverKey })
          .then(() => chrome.storage.local.set({ waLastError: null }))
          .catch((e) => chrome.storage.local.set({ waLastError: 'Sinkron ke server gagal: ' + e.message }));
      });
      if (callback) callback();
    });
  });
}

// --- PENGINGAT WHATSAPP LEWAT AKUN FONNTE MILIK USER ---
// waConfig: { token, device: nomor bot, phone: nomor penerima, times: ['17:00', ...], serverUrl, serverKey }
// null = belum diatur. Tanpa serverUrl, pesan dikirim langsung dari Chrome (hanya saat Chrome terbuka).
// Dengan serverUrl (Apps Script milik user, folder server-pengingat), server yang mengirim walau laptop mati.

function isWaReady(waConfig) {
  return !!(waConfig && waConfig.token && waConfig.phone);
}

function hasServer(waConfig) {
  return !!(isWaReady(waConfig) && waConfig.serverUrl && waConfig.serverKey);
}

// "0812-3456-7890" / "+62812..." / "812..." -> "62812..."
function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

// Panggil API Fonnte dengan token device milik user
async function callFonnte(path, token, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${FONNTE_URL}/${path}`, {
      method: 'POST',
      headers: { Authorization: token },
      body: new URLSearchParams(payload || {}),
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!data) throw new Error(`Fonnte tidak membalas dengan benar (HTTP ${response.status}).`);
    if (data.status !== true) throw new Error('Fonnte menolak: ' + (data.reason || data.detail || 'token tidak valid'));
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Fonnte tidak merespons. Coba lagi.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function sendWhatsApp(waConfig, message) {
  return callFonnte('send', waConfig.token, { target: waConfig.phone, message: message, countryCode: '0' });
}

function reminderMessage(timezone) {
  const now = nowInZone(timezone);
  const date = `${DAY_NAMES[now.getUTCDay()]}, ${now.getUTCDate()}/${now.getUTCMonth() + 1}/${now.getUTCFullYear()}`;
  return '⏰ *Pengingat MagangHub*\n' +
    `Kamu belum mengisi laporan harian hari ini (${date}).\n` +
    'Isi sekarang: ' + MAGANGHUB_URL;
}

async function callServer(url, action, params) {
  const query = new URLSearchParams({ action: action });
  Object.keys(params || {}).forEach((name) => {
    if (params[name] !== undefined && params[name] !== null) query.set(name, params[name]);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${url}?${query}`, { signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!data) throw new Error(`Server tidak membalas dengan benar (HTTP ${response.status}). Periksa alamat server.`);
    if (!data.success) throw new Error(data.error || 'Server menolak permintaan.');
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server tidak merespons. Coba lagi.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Kirim jam pengingat WA + hari & zona waktu (mengikuti Alarm Otomatis) ke server
function pushSettings(callback) {
  getAlarmConfig((config) => {
    chrome.storage.local.get(['waConfig'], (result) => {
      const waConfig = result.waConfig;
      if (!hasServer(waConfig)) return callback && callback(null);

      callServer(waConfig.serverUrl, 'settings', {
        key: waConfig.serverKey,
        times: waConfig.times.join(','), days: reminderDays(config).join(','), tz: config.timezone
      })
        .then(() => { chrome.storage.local.set({ waLastError: null }); if (callback) callback(null); })
        .catch((e) => {
          chrome.storage.local.set({ waLastError: 'Sinkron pengaturan gagal: ' + e.message });
          if (callback) callback(e);
        });
    });
  });
}

// Simpan jam pengingat dan alamat server. Saat alamat server berubah, server lama diputus
// dan server baru menerima token Fonnte + nomor penerima, lalu memberi kunci akses.
async function saveWaSettings(times, serverUrl) {
  const { waConfig: current } = await chrome.storage.local.get(['waConfig']);
  if (!isWaReady(current)) throw new Error('Pengingat WhatsApp belum diatur.');
  if (serverUrl && !/^https:\/\/script\.google(usercontent)?\.com\/\S+\/exec$/.test(serverUrl)) {
    throw new Error('Alamat server harus URL Web App Apps Script yang berakhiran /exec.');
  }

  const waConfig = Object.assign({}, current, { times: times });
  if (serverUrl !== (current.serverUrl || '')) {
    if (hasServer(current)) {
      await callServer(current.serverUrl, 'disconnect', { key: current.serverKey }).catch(() => {});
    }
    waConfig.serverUrl = serverUrl;
    waConfig.serverKey = '';
    if (serverUrl) {
      const data = await callServer(serverUrl, 'connect', { token: waConfig.token, phone: waConfig.phone });
      waConfig.serverKey = data.key;
    }
  }
  await chrome.storage.local.set({ waConfig: waConfig, waLastError: null });

  const error = await new Promise(resolve => pushSettings(resolve));
  if (error) throw error;
  await new Promise(resolve => setupAlarms(resolve)); // Pasang/lepas alarm WhatsApp dari Chrome
  return waConfig;
}

// Jalankan otomatis saat ekstensi dipasang, di-refresh, atau browser dibuka
chrome.runtime.onInstalled.addListener(() => {
  setupAlarms();
});
chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
});
// Setiap kali service worker terbangun, pastikan alarm masih lengkap
ensureAlarms();

// Dengarkan permintaan dari Popup dan halaman MagangHub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_ALARM_CONFIG') {
    getAlarmConfig(sendResponse);
    return true;
  }
  if (message.action === 'SAVE_ALARM_CONFIG') {
    chrome.storage.local.set({ alarmSchedule: message.schedule, alarmTimezone: message.timezone }, () => {
      setupAlarms(() => sendResponse({ success: true }));
      pushSettings(); // Hari & zona waktu pengingat WhatsApp ikut Alarm Otomatis
    });
    return true;
  }
  if (message.action === 'GET_ABSEN_STATUS') {
    getAbsenStatus(sendResponse);
    return true;
  }
  if (message.action === 'SET_ABSEN_STATUS' || message.action === 'REPORT_SUBMITTED') {
    const done = message.action === 'REPORT_SUBMITTED' ? true : message.done;
    setAbsenStatus(done, () => sendResponse({ success: true, done: done }));
    return true;
  }
  if (message.action === 'GET_WA_CONFIG') {
    chrome.storage.local.get(['waConfig', 'waLastError'], (result) => {
      sendResponse({ config: result.waConfig || null, lastError: result.waLastError || null });
    });
    return true;
  }
  // Pengaturan langkah 1: cek token device Fonnte dan nomor bot yang tersambung
  if (message.action === 'WA_CHECK_TOKEN') {
    callFonnte('device', message.token)
      .then((data) => sendResponse({
        success: true,
        device: normalizePhone(data.device),
        connected: data.device_status === 'connect'
      }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
  // Pengaturan langkah 2: kirim pesan tes ke nomor penerima, lalu simpan
  if (message.action === 'WA_SAVE_SETUP') {
    const phone = normalizePhone(message.phone);
    if (!/^62\d{8,13}$/.test(phone)) {
      sendResponse({ success: false, error: 'Nomor WhatsApp penerima tidak valid.' });
      return true;
    }
    const waConfig = { token: message.token, device: message.device, phone: phone, times: ['17:00'], serverUrl: '', serverKey: '' };
    sendWhatsApp(waConfig, '✅ *Pengingat MagangHub terhubung*\nPengingat absen akan dikirim ke nomor ini jika kamu belum mengisi laporan harian.')
      .then(() => {
        chrome.storage.local.set({ waConfig: waConfig, waLastError: null }, () => {
          setupAlarms(() => sendResponse({ success: true, config: waConfig }));
        });
      })
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.action === 'WA_SAVE_SETTINGS') {
    saveWaSettings(message.times, (message.serverUrl || '').trim())
      .then((waConfig) => sendResponse({ success: true, config: waConfig }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.action === 'WA_TEST') {
    chrome.storage.local.get(['waConfig'], (result) => {
      const waConfig = result.waConfig;
      if (!isWaReady(waConfig)) return sendResponse({ success: false, error: 'Pengingat WhatsApp belum diatur.' });
      const sending = hasServer(waConfig)
        ? callServer(waConfig.serverUrl, 'test', { key: waConfig.serverKey })
        : sendWhatsApp(waConfig, '✅ Tes Pengingat MagangHub berhasil. Pengingat akan dikirim jam ' +
          waConfig.times.join(', ') + ' jika kamu belum absen.');
      sending
        .then(() => sendResponse({ success: true }))
        .catch((e) => sendResponse({ success: false, error: e.message }));
    });
    return true;
  }
  if (message.action === 'WA_RESET') {
    chrome.storage.local.get(['waConfig'], (result) => {
      const done = () => chrome.storage.local.set({ waConfig: null, waLastError: null }, () => {
        setupAlarms(() => sendResponse({ success: true }));
      });
      // Putuskan server juga; data lokal tetap dihapus walau server gagal dihubungi
      if (!hasServer(result.waConfig)) return done();
      callServer(result.waConfig.serverUrl, 'disconnect', { key: result.waConfig.serverKey }).then(done).catch(done);
    });
    return true;
  }
});

// LOGIKA SAAT ALARM BERBUNYI
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('alarm_')) {
    const timeString = alarm.name.replace('alarm_', ''); // Contoh output: '11:30'

    getAlarmConfig((config) => {
      // Cek apakah hari ini (di zona waktu terpilih) diizinkan untuk jam tersebut
      const currentDay = nowInZone(config.timezone).getUTCDay(); // 0-6
      const allowedDays = config.schedule[timeString];
      if (!allowedDays || !allowedDays.includes(currentDay)) return;

      getAbsenStatus((status) => {
        if (status.done) return; // Sudah absen hari ini, tidak perlu diingatkan

        chrome.notifications.create('reminderNotif', {
          type: 'basic',
          iconUrl: 'icon.png', // Wajib ada file icon.png di folder
          title: '⏰ Waktunya Absen MagangHub!',
          message: 'Jangan lupa untuk mengisi laporan aktivitas magang kamu ya!',
          buttons: [{ title: '✔ Sudah Absen Hari Ini' }],
          priority: 2,
          requireInteraction: true // Notifikasi menetap sampai diklik
        });
      });
    });
  }

  // Pengingat WhatsApp dari Chrome (tanpa server)
  if (alarm.name.startsWith('wa_')) {
    getAlarmConfig((config) => {
      if (!reminderDays(config).includes(nowInZone(config.timezone).getUTCDay())) return;

      chrome.storage.local.get(['waConfig'], (result) => {
        const waConfig = result.waConfig;
        if (!isWaReady(waConfig) || hasServer(waConfig)) return;

        getAbsenStatus((status) => {
          if (status.done) return;
          sendWhatsApp(waConfig, reminderMessage(config.timezone))
            .then(() => chrome.storage.local.set({ waLastError: null }))
            .catch((e) => chrome.storage.local.set({ waLastError: 'Pengingat gagal dikirim: ' + e.message }));
        });
      });
    });
  }
});

// Klik notifikasi untuk langsung buka web MagangHub
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'reminderNotif') {
    chrome.tabs.create({ url: MAGANGHUB_URL });
  }
});

// Tombol "Sudah Absen Hari Ini" di notifikasi
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'reminderNotif' && buttonIndex === 0) {
    setAbsenStatus(true);
  }
});
