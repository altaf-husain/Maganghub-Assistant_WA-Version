/**
 * content.js - Berjalan di dalam halaman MagangHub untuk memanipulasi DOM.
 */

// Dibungkus blok agar aman jika script ini dipasang ulang oleh popup di tab yang sama
{

// Konfigurasi Selector (Phase 9)
const FIELD_SELECTORS = {
  activity: [
    'textarea[placeholder*="Uraian aktivitas" i]', 
    'textarea[aria-label*="Uraian aktivitas" i]'
  ],
  lesson: [
    'textarea[placeholder*="Pembelajaran" i]', 
    'textarea[aria-label*="Pembelajaran" i]'
  ],
  obstacle: [
    'textarea[placeholder*="Kendala" i]', 
    'textarea[aria-label*="Kendala" i]'
  ],
  date: [
    'input[type="date"]', 'input[name="date"]', 'input[name="tanggal"]'
  ]
};

// Utility pencarian tangguh dengan sistem fallback
function findElement(selectors, fallbackIndex) {
  // 1. Coba cari pakai selector atribut
  for (let selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  
  // 2. Fallback: Ambil berdasarkan urutan textarea di layar (0 = Aktivitas, 1 = Pelajaran, 2 = Kendala)
  const allTextareas = document.querySelectorAll('textarea');
  if (allTextareas.length >= 3 && fallbackIndex !== undefined) {
    console.log(`Selector spesifik gagal, menggunakan fallback index [${fallbackIndex}]`);
    return allTextareas[fallbackIndex];
  }
  
  return null;
}

// Phase 7: Deteksi Tanggal
function detectDate() {
  const dateInput = findElement(FIELD_SELECTORS.date);
  if (dateInput && dateInput.value) {
    return dateInput.value; // Format YYYY-MM-DD
  }
  
  // Fallback: Gunakan tanggal lokal browser
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Phase 10 & 11: Mengisi data dengan aman dan mencegah overwrite
function safeFill(element, value) {
  if (!element) return false;
  
  // Jangan menimpa jika sudah ada teks dari user
  if (element.value && element.value.trim().length > 0) {
    console.log('Field sudah terisi, lewati auto-fill untuk mencegah overwrite.');
    return false;
  }

  // Set nilai dengan native setter untuk membypass override framework modern
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
  } else {
      element.value = value;
  }

  // Dispatch events agar sistem MagangHub (React/Vue) menyadari ada perubahan teks
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  
  return true;
}

// Mendengarkan instruksi dari popup ekstensi
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_DATE") {
    sendResponse({ date: detectDate() });
  } 
  else if (request.action === "FILL_FORM") {
    const report = request.data;
    
    // Inject dengan urutan index fallback (0, 1, 2)
    const activityEl = findElement(FIELD_SELECTORS.activity, 0);
    const lessonEl = findElement(FIELD_SELECTORS.lesson, 1);
    const obstacleEl = findElement(FIELD_SELECTORS.obstacle, 2);

    let filledCount = 0;
    
    if (safeFill(activityEl, report.activity)) filledCount++;
    if (safeFill(lessonEl, report.lesson)) filledCount++;
    if (safeFill(obstacleEl, report.obstacle)) filledCount++;

    sendResponse({ success: true, filled: filledCount });
  }
  return true; 
});

// Tandai "sudah absen hari ini" ketika user menekan tombol kirim/simpan laporan
// (hanya jika kolom aktivitas sudah terisi, supaya klik tombol lain tidak ikut terhitung)
document.addEventListener('click', (event) => {
  const button = event.target.closest && event.target.closest('button, input[type="submit"]');
  if (!button) return;
  const label = (button.innerText || button.value || '').trim();
  if (!/kirim|simpan|submit|laporkan/i.test(label)) return;

  const activityEl = findElement(FIELD_SELECTORS.activity, 0);
  if (!activityEl || !activityEl.value.trim()) return;

  try {
    chrome.runtime.sendMessage({ action: 'REPORT_SUBMITTED' });
  } catch (e) {
    // Ekstensi baru di-reload; script lama di halaman ini sudah tidak terhubung
  }
}, true);

console.log("MagangHub Auto Report: Content script siap memantau form.");

}