const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Model bawaan: varian "lite" paling cepat untuk teks pendek seperti laporan harian
const DEFAULT_MODEL = 'gemini-flash-lite-latest';
// Urutan model yang dicoba; model yang terakhir berhasil otomatis didahulukan
const CANDIDATE_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
const REQUEST_TIMEOUT_MS = 30000; // Satu permintaan dianggap macet jika lebih dari ini
const HEDGE_DELAY_MS = 7000;      // Belum ada jawaban? Model berikutnya ikut dijalankan bersamaan
const TOTAL_TIMEOUT_MS = 60000;   // Batas seluruh proses pembuatan laporan
const DEFAULT_EXPECTED_MS = 8000; // Perkiraan lama proses sebelum ada riwayat (untuk loading bar)

// Lama sebuah model dilewati setelah gagal, supaya percobaan berikutnya langsung ke model yang sehat
const SKIP_MS = {
  quota: 6 * 3600000,   // Kuota harian habis
  notFound: 24 * 3600000, // Model tidak tersedia untuk API key ini
  busy: 10 * 60000      // Sibuk, macet, atau error server
};

// Dilempar saat user menekan tombol refresh (bukan error yang perlu ditampilkan)
class CancelledError extends Error {}

// Skema JSON agar Gemini selalu mengembalikan 3 field yang dibutuhkan form
const REPORT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    activity: { type: 'STRING' },
    lesson: { type: 'STRING' },
    obstacle: { type: 'STRING' }
  },
  required: ['activity', 'lesson', 'obstacle']
};

function buildPrompt({ mode, date, activity, lesson, obstacle }) {
  let prompt = 'Kamu adalah asisten penulis laporan harian peserta magang di Indonesia.\n';
  prompt += `Tanggal laporan: ${date}.\n\n`;

  if (mode === 'custom3') {
    prompt += 'Kembangkan tiga poin singkat berikut menjadi laporan harian:\n';
    prompt += `- Aktivitas: ${activity}\n`;
    prompt += `- Pembelajaran: ${lesson || '(tidak diisi, simpulkan dari aktivitas)'}\n`;
    prompt += `- Kendala: ${obstacle || '(tidak ada kendala berarti)'}\n\n`;
  } else {
    prompt += `Buat laporan harian dari catatan aktivitas singkat berikut: "${activity}"\n`;
    prompt += 'Simpulkan sendiri pembelajaran dan kendala yang wajar dari aktivitas tersebut.\n\n';
  }

  prompt += 'Aturan penulisan:\n';
  prompt += '- "activity": uraian aktivitas yang dikerjakan.\n';
  prompt += '- "lesson": pembelajaran yang diperoleh dari aktivitas tersebut.\n';
  prompt += '- "obstacle": kendala yang dihadapi beserta cara mengatasinya. Jika tidak ada kendala, tuliskan bahwa pekerjaan berjalan lancar.\n';
  prompt += '- Setiap bagian berupa satu paragraf 2-3 kalimat, minimal 120 karakter dan maksimal 400 karakter.\n';
  prompt += '- Gunakan bahasa Indonesia formal, sudut pandang orang pertama ("saya"), tanpa bullet, tanpa markdown.\n';
  prompt += '- Jangan mengarang nama orang, angka, atau detail spesifik yang tidak ada di catatan.';
  return prompt;
}

async function readGeminiError(response) {
  try {
    const body = await response.json();
    return (body.error && body.error.message) || `HTTP ${response.status}`;
  } catch (e) {
    return `HTTP ${response.status}`;
  }
}

// Urutan model untuk satu proses: model yang terakhir berhasil, lalu sisanya.
// Model yang baru saja gagal ditaruh paling belakang.
// health: { preferredModel, models: { [nama]: { skipUntil } } }
function orderModels(health, now) {
  const list = [];
  const add = (m) => { if (CANDIDATE_MODELS.includes(m) && !list.includes(m)) list.push(m); };
  add(health.preferredModel);
  CANDIDATE_MODELS.forEach(add);

  const skipped = (m) => ((health.models[m] || {}).skipUntil || 0) > now;
  return list.filter(m => !skipped(m)).concat(list.filter(skipped));
}

function buildRequestBody(promptData, withThinkingOff) {
  const generationConfig = {
    temperature: 0.7,
    responseMimeType: 'application/json',
    responseSchema: REPORT_SCHEMA
  };
  // Laporan pendek tidak butuh "berpikir" panjang; mematikannya membuat jawaban jauh lebih cepat
  if (withThinkingOff) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  return JSON.stringify({ contents: [{ role: 'user', parts: [{ text: buildPrompt(promptData) }] }], generationConfig });
}

function parseReport(data) {
  const candidate = data.candidates && data.candidates[0];
  const text = candidate && candidate.content && candidate.content.parts
    ? candidate.content.parts.map(p => p.text || '').join('')
    : '';
  if (!text) {
    const reason = (candidate && candidate.finishReason) || (data.promptFeedback && data.promptFeedback.blockReason);
    throw new Error('AI tidak mengembalikan teks' + (reason ? ` (${reason})` : ''));
  }
  const report = JSON.parse(text);
  if (!report.activity || !report.lesson || !report.obstacle) throw new Error('Jawaban AI tidak lengkap.');
  return report;
}

// Buat laporan. Model dicoba berurutan; jika model pertama belum menjawab dalam HEDGE_DELAY_MS,
// model berikutnya ikut dijalankan dan jawaban tercepat yang dipakai. Model yang gagal dilewati
// (dicatat di health) supaya proses berikutnya tidak membuang waktu pada model yang sama.
// Hasil: { report, model, ms }. health diubah langsung; simpan setelah selesai.
function generateReport(apiKey, promptData, health, onStatus, cancelSignal) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const models = orderModels(health, startedAt);
    const controllers = [];
    let next = 0;
    let running = 0;
    let settled = false;
    let lastError = 'Server Gemini sibuk.';
    let hedgeTimer = null;

    function finish(fn, value) {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      clearTimeout(totalTimer);
      controllers.forEach(c => c.abort());
      if (cancelSignal) cancelSignal.removeEventListener('abort', onCancel);
      fn(value);
    }
    function onCancel() { finish(reject, new CancelledError('Dibatalkan.')); }
    if (cancelSignal) cancelSignal.addEventListener('abort', onCancel);
    const totalTimer = setTimeout(() => finish(reject, new Error('AI terlalu lama merespons. Coba lagi beberapa saat lagi.')), TOTAL_TIMEOUT_MS);

    function markFailed(model, kind) {
      health.models[model] = Object.assign({}, health.models[model], { skipUntil: Date.now() + SKIP_MS[kind] });
      if (health.preferredModel === model) health.preferredModel = null;
    }

    // Jalankan model berikutnya (dipanggil saat gagal, atau saat model sebelumnya terlalu lama)
    function launchNext(reason) {
      if (settled) return;
      clearTimeout(hedgeTimer);
      if (next >= models.length) {
        if (running === 0) {
          finish(reject, new Error(`Semua model AI sedang gagal merespons (terakhir: ${lastError}) Coba lagi beberapa menit lagi.`));
        }
        return;
      }
      const model = models[next++];
      if (onStatus) onStatus(reason ? `${reason} Mencoba model ${model}...` : `AI sedang menulis laporan (${model})...`);
      running++;
      // attempt() mengembalikan alasan gagal (string), atau kosong jika proses sudah selesai
      attempt(model, !(health.models[model] || {}).noThinkingConfig).then((failReason) => {
        running--;
        if (failReason) launchNext(failReason);
      });
      hedgeTimer = setTimeout(() => launchNext('AI belum menjawab.'), HEDGE_DELAY_MS);
    }

    async function attempt(model, withThinkingOff) {
      const controller = new AbortController();
      controllers.push(controller);
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
      const t0 = Date.now();
      try {
        const response = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: buildRequestBody(promptData, withThinkingOff),
          signal: controller.signal
        });
        if (settled) return;

        if (response.ok) {
          let report;
          try {
            report = parseReport(await response.json());
          } catch (e) {
            lastError = e.message;
            markFailed(model, 'busy');
            return 'Jawaban AI tidak lengkap.';
          }
          health.preferredModel = model;
          // Hapus catatan gagal, tapi tetap ingat jika model ini tidak mendukung pengaturan "berpikir"
          health.models[model] = { noThinkingConfig: !!(health.models[model] || {}).noThinkingConfig };
          return finish(resolve, { report: report, model: model, ms: Date.now() - t0 });
        }

        const message = await readGeminiError(response);
        if (settled) return;
        lastError = message;

        // API key salah / tidak diizinkan: model lain juga akan gagal, hentikan
        if (response.status === 401 || response.status === 403 || /api[ _]?key/i.test(message)) {
          return finish(reject, new Error(message));
        }
        // Model ini menolak pengaturan "berpikir" (sering hanya "invalid argument"): ingat, lalu
        // ulangi tanpa pengaturan itu supaya percobaan berikutnya tidak gagal lagi di awal
        if (response.status === 400 && withThinkingOff) {
          health.models[model] = Object.assign({}, health.models[model], { noThinkingConfig: true });
          clearTimeout(timer);
          return attempt(model, false);
        }
        if (response.status === 400) {
          markFailed(model, 'busy');
          return `Model ${model} menolak permintaan.`;
        }
        if (response.status === 404) {
          markFailed(model, 'notFound');
          return `Model ${model} tidak tersedia.`;
        }
        if (response.status === 429) {
          markFailed(model, /quota|exhaust|per day|limit/i.test(message) ? 'quota' : 'busy');
          return `Kuota model ${model} habis/sibuk.`;
        }
        markFailed(model, 'busy');
        return `Model ${model} sedang sibuk.`;
      } catch (e) {
        if (settled) return;
        lastError = timedOut ? 'AI terlalu lama merespons.' : 'Koneksi internet terputus.';
        markFailed(model, 'busy');
        return timedOut ? `Model ${model} macet.` : 'Koneksi terputus.';
      } finally {
        clearTimeout(timer);
      }
    }

    launchNext(null);
  });
}

// Kirim pesan ke content.js di tab; jika belum terpasang (tab dibuka sebelum ekstensi
// dipasang/di-reload), pasang dulu lalu coba sekali lagi. callback(null) jika tetap gagal.
function askContentScript(tabId, message, callback) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (!chrome.runtime.lastError && response) return callback(response);

    chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] }, () => {
      if (chrome.runtime.lastError) return callback(null);
      chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
        callback(chrome.runtime.lastError ? null : retryResponse);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const forceFillBtn = document.getElementById('forceFillBtn');
  const statusBox = document.getElementById('statusBox');

  // Ikon "?" membuka/menutup panduan mendapatkan API Key Gemini
  const apiHelpBtn = document.getElementById('apiHelpBtn');
  const apiHelpBox = document.getElementById('apiHelpBox');
  apiHelpBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Tombol berada di dalam <label>
    apiHelpBox.style.display = apiHelpBox.style.display === 'none' ? 'block' : 'none';
  });

  // --- KODE UNTUK FITUR PENGINGAT (DIATUR USER) ---
  const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']; // index = Date.getDay()
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Tampilkan mulai dari Senin
  const alarmTimezone = document.getElementById('alarmTimezone');
  const alarmView = document.getElementById('alarmView');
  const alarmEdit = document.getElementById('alarmEdit');
  const alarmTimes = document.getElementById('alarmTimes');
  const alarmDays = document.getElementById('alarmDays');
  const addTimeBtn = document.getElementById('addTimeBtn');
  const alarmToggleBtn = document.getElementById('alarmToggleBtn');
  let alarmEditing = true;

  // Pilihan hari dibuat sekali; isinya dicentang saat pengaturan dimuat
  const dayCheckboxes = DAY_ORDER.map(day => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = day;
    label.append(checkbox, DAY_LABELS[day]);
    alarmDays.append(label);
    return checkbox;
  });

  // Satu kotak jam beserta tombol hapusnya; disisipkan sebelum tombol "+ Jam" (button)
  function addTimeBoxTo(button, time) {
    const box = document.createElement('span');
    box.className = 'alarm-time';
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = time;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.title = 'Hapus jam ini';
    removeBtn.addEventListener('click', () => box.remove());
    box.append(timeInput, removeBtn);
    button.before(box);
    return timeInput;
  }

  function addTimeBox(time) {
    return addTimeBoxTo(addTimeBtn, time);
  }

  // Mode edit menampilkan kotak jam & centang hari; mode lihat hanya ringkasan
  function setAlarmEditing(editing) {
    alarmEditing = editing;
    alarmEdit.style.display = editing ? 'block' : 'none';
    alarmView.style.display = editing ? 'none' : 'block';
    alarmTimezone.style.display = editing ? '' : 'none';
    alarmToggleBtn.textContent = editing ? 'Simpan' : 'Edit';
  }

  function renderAlarmConfig(config) {
    const times = Object.keys(config.schedule).sort();
    // Hanya ada satu isian, jadi semua jam memakai hari yang sama
    const days = DAY_ORDER.filter(day => times.some(time => config.schedule[time].includes(day)));

    alarmTimezone.value = config.timezone;
    alarmTimes.querySelectorAll('.alarm-time').forEach(box => box.remove());
    (times.length ? times : ['']).forEach(addTimeBox);
    dayCheckboxes.forEach(checkbox => { checkbox.checked = days.includes(Number(checkbox.value)); });

    // Baris 1: jam & zona waktu, baris 2: hari
    alarmView.textContent = `${times.join(' | ')} (${config.timezone})\n${days.map(day => DAY_LABELS[day]).join(', ')}`;
    // Belum ada jadwal: langsung buka mode edit supaya user mengatur alarmnya
    setAlarmEditing(times.length === 0);
  }

  // Baca isi form jadwal menjadi { 'HH:MM': [hari, ...] }
  function collectSchedule() {
    // Kotak jam yang dibiarkan kosong diabaikan
    const times = Array.from(alarmTimes.querySelectorAll('input[type="time"]')).map(i => i.value).filter(Boolean);
    const days = dayCheckboxes.filter(checkbox => checkbox.checked).map(checkbox => Number(checkbox.value)).sort();
    if (times.length === 0) throw new Error('Isi minimal 1 jam alarm.');
    if (days.length === 0) throw new Error('Pilih minimal 1 hari untuk alarm.');
    const schedule = {};
    times.forEach(time => { schedule[time] = days; });
    return schedule;
  }

  setAlarmEditing(true);
  chrome.runtime.sendMessage({ action: 'GET_ALARM_CONFIG' }, (config) => {
    if (chrome.runtime.lastError || !config) {
      return showStatus('Pengaturan alarm belum aktif. Buka chrome://extensions lalu klik Reload pada ekstensi ini.', 'error');
    }
    renderAlarmConfig(config);
  });

  addTimeBtn.addEventListener('click', () => addTimeBox('').focus());

  // Satu tombol: "Edit" membuka form, "Simpan" menyimpan lalu menutupnya lagi
  alarmToggleBtn.addEventListener('click', () => {
    if (!alarmEditing) return setAlarmEditing(true);

    let schedule;
    try {
      schedule = collectSchedule();
    } catch (e) {
      return showStatus(e.message, 'error');
    }
    chrome.runtime.sendMessage({ action: 'SAVE_ALARM_CONFIG', schedule: schedule, timezone: alarmTimezone.value }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        // Biasanya karena background.js versi lama masih berjalan
        return showStatus('Gagal menyimpan jadwal. Buka chrome://extensions, klik Reload pada ekstensi ini, lalu coba lagi.', 'error');
      }
      renderAlarmConfig({ schedule: schedule, timezone: alarmTimezone.value });
      showStatus('Jadwal alarm berhasil disimpan!', 'success');
    });
  });

  // --- STATUS ABSEN HARI INI ---
  const absenText = document.getElementById('absenText');
  const absenToggleBtn = document.getElementById('absenToggleBtn');
  let absenDone = false;

  function renderAbsenStatus(done) {
    absenDone = done;
    absenText.textContent = done ? 'Absen hari ini: ✔ Sudah' : 'Absen hari ini: Belum';
    absenText.className = done ? 'absen-done' : '';
    absenToggleBtn.textContent = done ? 'Batalkan' : 'Tandai sudah absen';
  }

  chrome.runtime.sendMessage({ action: 'GET_ABSEN_STATUS' }, (status) => {
    if (!chrome.runtime.lastError && status) renderAbsenStatus(status.done);
  });

  // Untuk koreksi manual jika deteksi otomatis di halaman MagangHub meleset
  absenToggleBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'SET_ABSEN_STATUS', done: !absenDone }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        return showStatus('Gagal mengubah status absen. Coba Reload ekstensi.', 'error');
      }
      renderAbsenStatus(response.done);
      showStatus(response.done ? 'Ditandai sudah absen. Pengingat hari ini dimatikan.' : 'Status absen hari ini dibatalkan.', 'success');
    });
  });

  // --- PENGINGAT WHATSAPP (akun Fonnte milik user; server Apps Script opsional) ---
  const waHelpBtn = document.getElementById('waHelpBtn');
  const waHelpBox = document.getElementById('waHelpBox');
  const waStepToken = document.getElementById('waStepToken');
  const waStepPhone = document.getElementById('waStepPhone');
  const waReady = document.getElementById('waReady');
  const waToken = document.getElementById('waToken');
  const waCheckTokenBtn = document.getElementById('waCheckTokenBtn');
  const waDeviceInfo = document.getElementById('waDeviceInfo');
  const waPhone = document.getElementById('waPhone');
  const waBackBtn = document.getElementById('waBackBtn');
  const waSaveSetupBtn = document.getElementById('waSaveSetupBtn');
  const waView = document.getElementById('waView');
  const waEdit = document.getElementById('waEdit');
  const waTimes = document.getElementById('waTimes');
  const waAddTimeBtn = document.getElementById('waAddTimeBtn');
  const waServerUrl = document.getElementById('waServerUrl');
  const waResetBtn = document.getElementById('waResetBtn');
  const waTestBtn = document.getElementById('waTestBtn');
  const waToggleBtn = document.getElementById('waToggleBtn');
  let waEditing = false;
  let waTimezone = 'WIB';
  let waDevice = ''; // Nomor bot hasil "Cek Token"

  waHelpBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Tombol berada di dalam <label>
    waHelpBox.style.display = waHelpBox.style.display === 'none' ? 'block' : 'none';
  });

  // "6281234567890" -> "081234567890"
  function displayPhone(phone) {
    return String(phone || '').replace(/^62/, '0');
  }

  // "0812-3456-7890" -> "62812...", untuk membandingkan nomor
  function intlPhone(phone) {
    return String(phone || '').replace(/\D/g, '').replace(/^0/, '62');
  }

  // Panel: 'token' (langkah 1), 'phone' (langkah 2), 'ready' (sudah diatur)
  function showWaPanel(panel) {
    waStepToken.style.display = panel === 'token' ? 'block' : 'none';
    waStepPhone.style.display = panel === 'phone' ? 'block' : 'none';
    waReady.style.display = panel === 'ready' ? 'block' : 'none';
  }

  function setWaEditing(editing) {
    waEditing = editing;
    waEdit.style.display = editing ? 'block' : 'none';
    waView.style.display = editing ? 'none' : 'block';
    waTestBtn.style.display = editing ? 'none' : '';
    waToggleBtn.textContent = editing ? 'Simpan' : 'Edit';
  }

  function renderWaReady(config, lastError) {
    waTimes.querySelectorAll('.alarm-time').forEach(box => box.remove());
    config.times.forEach(time => addTimeBoxTo(waAddTimeBtn, time));
    waServerUrl.value = config.serverUrl || '';
    const via = config.serverUrl ? 'server (tetap jalan walau laptop mati)' : 'Chrome (hanya saat Chrome terbuka)';
    waView.textContent = `Bot ${displayPhone(config.device)} → ${displayPhone(config.phone)}\n` +
      `Jam ${config.times.join(' | ')} (${waTimezone})\nDikirim dari ${via}` +
      (lastError ? `\n⚠ ${lastError}` : '');
    showWaPanel('ready');
    setWaEditing(false);
  }

  chrome.runtime.sendMessage({ action: 'GET_ALARM_CONFIG' }, (config) => {
    if (!chrome.runtime.lastError && config) waTimezone = config.timezone;
    chrome.runtime.sendMessage({ action: 'GET_WA_CONFIG' }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      // Pengaturan versi lama (server bersama, tanpa token) dianggap belum diatur
      if (response.config && response.config.token) renderWaReady(response.config, response.lastError);
      else showWaPanel('token');
    });
  });

  waCheckTokenBtn.addEventListener('click', () => {
    const token = waToken.value.trim();
    if (!token) return showStatus('Isi token Fonnte dulu.', 'error');

    showStatus('Mengecek token Fonnte...', 'info');
    waCheckTokenBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'WA_CHECK_TOKEN', token: token }, (response) => {
      waCheckTokenBtn.disabled = false;
      if (chrome.runtime.lastError || !response) return showStatus('Gagal menghubungi Fonnte. Coba Reload ekstensi.', 'error');
      if (!response.success) return showStatus(response.error, 'error');

      waDevice = response.device;
      waDeviceInfo.textContent = `Nomor bot: ${displayPhone(waDevice)} ` +
        (response.connected ? '✔ terhubung' : '\n⚠ Belum terhubung ke WhatsApp. Klik Connect di Fonnte lalu scan QR.');
      showWaPanel('phone');
      waPhone.focus();
      showStatus(response.connected
        ? 'Token valid. Sekarang isi nomor WhatsApp penerima.'
        : 'Token valid, tapi nomor bot belum terhubung di Fonnte. Pesan tidak akan terkirim sebelum terhubung.',
        response.connected ? 'success' : 'error');
    });
  });

  waBackBtn.addEventListener('click', () => showWaPanel('token'));

  waSaveSetupBtn.addEventListener('click', () => {
    const phone = waPhone.value.trim();
    if (phone.replace(/\D/g, '').length < 9) return showStatus('Nomor WhatsApp tidak valid.', 'error');
    // Pesan ke nomor sendiri tetap masuk, tapi biasanya tanpa bunyi notifikasi
    const sameAsBot = intlPhone(phone) === intlPhone(waDevice);

    showStatus('Mengirim pesan tes ke WhatsApp...', 'info');
    waSaveSetupBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'WA_SAVE_SETUP', token: waToken.value.trim(), device: waDevice, phone: phone }, (response) => {
      waSaveSetupBtn.disabled = false;
      if (chrome.runtime.lastError || !response) return showStatus('Gagal menyimpan. Coba Reload ekstensi.', 'error');
      if (!response.success) return showStatus(response.error, 'error');
      waToken.value = '';
      renderWaReady(response.config, null);
      showStatus('Pengingat WhatsApp aktif! Cek pesan tes di WhatsApp kamu.' +
        (sameAsBot ? ' Catatan: nomor penerima sama dengan nomor bot, jadi pesan mungkin masuk tanpa notifikasi.' : ''), 'success');
    });
  });

  waAddTimeBtn.addEventListener('click', () => addTimeBoxTo(waAddTimeBtn, '').focus());

  waToggleBtn.addEventListener('click', () => {
    if (!waEditing) return setWaEditing(true);

    // Kotak jam yang dibiarkan kosong diabaikan
    const times = Array.from(new Set(Array.from(waTimes.querySelectorAll('input[type="time"]'))
      .map(input => input.value).filter(Boolean))).sort();
    if (times.length === 0) return showStatus('Isi minimal 1 jam pengingat WhatsApp.', 'error');

    const serverUrl = waServerUrl.value.trim();
    showStatus(serverUrl ? 'Menyimpan & menghubungkan server...' : 'Menyimpan jam pengingat...', 'info');
    waToggleBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'WA_SAVE_SETTINGS', times: times, serverUrl: serverUrl }, (response) => {
      waToggleBtn.disabled = false;
      if (chrome.runtime.lastError || !response) return showStatus('Gagal menyimpan. Coba Reload ekstensi.', 'error');
      if (!response.success) return showStatus(response.error, 'error');
      renderWaReady(response.config, null);
      showStatus('Pengaturan pengingat WhatsApp disimpan!', 'success');
    });
  });

  waTestBtn.addEventListener('click', () => {
    showStatus('Mengirim pesan tes WhatsApp...', 'info');
    waTestBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'WA_TEST' }, (response) => {
      waTestBtn.disabled = false;
      if (chrome.runtime.lastError || !response) return showStatus('Gagal mengirim. Coba Reload ekstensi.', 'error');
      if (!response.success) return showStatus(response.error, 'error');
      showStatus('Pesan tes terkirim! Cek WhatsApp kamu.', 'success');
    });
  });

  waResetBtn.addEventListener('click', () => {
    if (!confirm('Hapus pengaturan WhatsApp dan mulai dari awal? Pengingat WhatsApp akan berhenti.')) return;
    chrome.runtime.sendMessage({ action: 'WA_RESET' }, () => {
      waPhone.value = '';
      showWaPanel('token');
      showStatus('Pengaturan WhatsApp dihapus. Pengingat WhatsApp berhenti.', 'success');
    });
  });

  // Elemen UI Input Mode
  const inputMode = document.getElementById('inputMode');
  const valActivity = document.getElementById('valActivity');
  const valLesson = document.getElementById('valLesson');
  const valObstacle = document.getElementById('valObstacle');

  // Kotak ketik melebar ke bawah mengikuti panjang teks
  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 2 + 'px';
  }
  [valActivity, valLesson, valObstacle].forEach(textarea => {
    textarea.addEventListener('input', () => autoGrow(textarea));
  });

  // Panel pengaturan Gemini (dilipat secara default)
  const apiSettings = document.getElementById('apiSettings');
  const apiSettingsState = document.getElementById('apiSettingsState');
  function updateApiSettingsState(saved) {
    apiSettingsState.textContent = saved ? '✔ Tersimpan' : 'Belum diatur';
    apiSettingsState.className = 'settings-state' + (saved ? ' ok' : '');
  }

  // --- LOADING BAR ---
  // Perkiraan selesai diambil dari rata-rata lama proses sebelumnya (aiHealth.avgMs)
  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  let progressTimer = null;

  function startProgress(expectedMs) {
    const startedAt = Date.now();
    progressWrap.style.display = 'block';
    progressBar.className = 'progress-bar';
    clearInterval(progressTimer);
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      // Naik cepat di awal, melambat mendekati 95% sampai jawaban benar-benar datang
      const pct = 95 * (1 - Math.exp(-1.6 * elapsed / expectedMs));
      progressBar.style.width = pct.toFixed(1) + '%';
      const remaining = Math.ceil((expectedMs - elapsed) / 1000);
      progressText.textContent = remaining > 0
        ? `${Math.round(pct)}% · sekitar ${remaining} detik lagi`
        : `${Math.round(pct)}% · sebentar lagi...`;
    };
    tick();
    progressTimer = setInterval(tick, 200);
  }

  function stopProgress(success) {
    clearInterval(progressTimer);
    progressTimer = null;
    if (success) {
      progressBar.style.width = '100%';
      progressText.textContent = '100% · selesai';
      setTimeout(() => { if (!progressTimer) progressWrap.style.display = 'none'; }, 1500);
    } else {
      progressWrap.style.display = 'none';
    }
  }

  // Riwayat kecepatan model: model tercepat yang berhasil didahulukan, model yang gagal dilewati
  let aiHealth = { preferredModel: null, models: {}, avgMs: DEFAULT_EXPECTED_MS };
  function saveAiHealth() {
    chrome.storage.local.set({ aiHealth: aiHealth });
  }

  // --- REFRESH ---
  // Dijalankan otomatis setiap popup dibuka, dan saat tombol ⟳ diklik:
  // batalkan proses yang macet, buka koneksi ke Gemini lebih awal, dan siapkan form MagangHub.
  const refreshBtn = document.getElementById('refreshBtn');
  let currentJob = null; // AbortController proses "Buat & Isi Laporan" yang sedang berjalan

  function refreshPopup(wasRunning) {
    if (currentJob) currentJob.abort();
    currentJob = null;
    stopProgress(false);
    const apiKey = apiKeyInput.value.trim();
    forceFillBtn.disabled = !apiKey;
    if (!apiKey) return;

    // "Pemanasan" koneksi ke Gemini tanpa memakai kuota (hanya membaca info model)
    const model = orderModels(aiHealth, Date.now())[0];
    fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(model)}`, { headers: { 'x-goog-api-key': apiKey } })
      .then((response) => {
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          showStatus('API key Gemini tidak valid. Periksa di ⚙ Pengaturan Gemini API.', 'error');
        }
      })
      .catch(() => {});

    // Pasang skrip pengisi di tab aktif lebih awal supaya tombol kuning langsung siap
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      const onMagangHub = tab && /maganghub\.kemnaker\.go\.id/.test(tab.url || '');
      if (tab && onMagangHub) askContentScript(tab.id, { action: 'GET_DATE' }, () => {});
      showStatus(wasRunning
        ? 'Proses dibatalkan & di-refresh. Klik tombol kuning untuk mencoba lagi.'
        : (onMagangHub || !tab || !tab.url
          ? 'Siap. Tulis aktivitas singkat lalu klik tombol kuning.'
          : 'Siap. Buka halaman form laporan MagangHub untuk mengisi otomatis.'), 'info');
    });
  }

  refreshBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Tombol berada di dalam <summary>, jangan buka/tutup panel
    event.stopPropagation();
    refreshPopup(!!currentJob);
  });

  // Load konfigurasi yang tersimpan
  chrome.storage.local.get(['geminiApiKey', 'aiHealth'], (result) => {
    if (result.geminiApiKey) apiKeyInput.value = result.geminiApiKey;
    if (result.aiHealth) aiHealth = Object.assign(aiHealth, result.aiHealth);
    updateApiSettingsState(!!result.geminiApiKey);
    if (result.geminiApiKey) {
      refreshPopup(false); // Refresh otomatis setiap popup dibuka
    } else {
      // Pengguna baru: buka panel & panduan supaya bisa langsung mengisi API Key
      apiSettings.open = true;
      apiHelpBox.style.display = 'block';
    }
  });

  // Fungsi untuk mengatur tampilan kotak ketik
  function updateInputUI() {
    const isThreePoints = inputMode.value === 'custom3';
    valLesson.style.display = isThreePoints ? 'block' : 'none';
    valObstacle.style.display = isThreePoints ? 'block' : 'none';
    valActivity.placeholder = isThreePoints ? "Poin Uraian aktivitas..." : "Tulis 1 aktivitas singkat...";
  }

  inputMode.addEventListener('change', updateInputUI);
  updateInputUI();

  // Simpan dan Test Koneksi
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) return showStatus('Harap isi Gemini API Key!', 'error');

    showStatus('Menguji koneksi...', 'info');
    chrome.storage.local.set({ geminiApiKey: apiKey }, async () => {
      forceFillBtn.disabled = false;
      updateApiSettingsState(true);
      try {
        const response = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(DEFAULT_MODEL)}`, {
          headers: { 'x-goog-api-key': apiKey }
        });
        if (response.ok) showStatus('Koneksi sukses! Gemini siap dipakai.', 'success');
        else showStatus('Koneksi gagal: ' + (await readGeminiError(response)), 'error');
      } catch (error) { showStatus('Gagal menghubungi server Gemini.', 'error'); }
    });
  });

  // Logika Eksekusi Auto-Fill
  forceFillBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const mode = inputMode.value;
    const activity = valActivity.value.trim();

    if (!apiKey) return showStatus('Harap isi Gemini API Key!', 'error');
    if (!activity) return showStatus("Kolom poin aktivitas wajib diisi!", "error");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      askContentScript(activeTab.id, { action: "GET_DATE" }, async (response) => {
        if (!response) {
          return showStatus("Buka halaman form laporan MagangHub dahulu, lalu coba lagi.", "error");
        }

        showStatus('AI sedang menulis laporan...', "info");
        forceFillBtn.disabled = true; // Matikan tombol agar tidak di-spam klik
        const job = new AbortController();
        currentJob = job;
        startProgress(aiHealth.avgMs || DEFAULT_EXPECTED_MS);

        try {
          const result = await generateReport(apiKey, {
            mode: mode,
            date: response.date,
            activity: activity,
            lesson: valLesson.value.trim(),
            obstacle: valObstacle.value.trim()
          }, aiHealth, (message) => { if (!job.signal.aborted) showStatus(message, "info"); }, job.signal);
          if (job.signal.aborted) return;
          const report = result.report;
          // Rata-rata lama proses untuk perkiraan loading bar berikutnya
          aiHealth.avgMs = Math.round(0.6 * (aiHealth.avgMs || DEFAULT_EXPECTED_MS) + 0.4 * result.ms);
          stopProgress(true);

          chrome.tabs.sendMessage(activeTab.id, { action: "FILL_FORM", data: report }, (fillRes) => {
            if (chrome.runtime.lastError || !fillRes || !fillRes.success) {
              return showStatus("Laporan dibuat, tapi gagal mengisi form.", "error");
            }
            if (fillRes.filled === 0) {
              return showStatus("Tidak ada kolom yang diisi (form tidak ditemukan atau sudah terisi).", "error");
            }
            showStatus(`Berhasil mengisi ${fillRes.filled} kolom! Periksa dulu sebelum submit.`, "success");
            valActivity.value = "";
            valLesson.value = "";
            valObstacle.value = "";
            [valActivity, valLesson, valObstacle].forEach(autoGrow);

            // Laporan berhasil dibuat & diisi: otomatis tandai sudah absen hari ini
            chrome.runtime.sendMessage({ action: 'SET_ABSEN_STATUS', done: true }, (absenRes) => {
              if (chrome.runtime.lastError || !absenRes || !absenRes.success) return;
              renderAbsenStatus(true);
              showStatus(`Berhasil mengisi ${fillRes.filled} kolom & ditandai sudah absen. Jangan lupa klik kirim di MagangHub!`, "success");
            });
          });
        } catch (e) {
          // Dibatalkan lewat tombol refresh: pesannya sudah ditampilkan oleh tombol itu
          if (!(e instanceof CancelledError) && !job.signal.aborted) {
            stopProgress(false);
            showStatus("Gagal: " + e.message + " Klik ⟳ lalu coba lagi.", "error");
          }
        } finally {
          saveAiHealth();
          if (currentJob === job) {
            currentJob = null;
            forceFillBtn.disabled = false; // Hidupkan tombol lagi
          }
        }
      });
    });
  });

  function showStatus(message, type) {
    statusBox.textContent = message;
    statusBox.className = 'status-box ' + type;
  }
});
