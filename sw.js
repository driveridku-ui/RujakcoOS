// Service worker RujakOS — v1
// Tujuan utama: memenuhi syarat "installable" (Add to Home Screen) di Android/desktop,
// dan menyimpan cangkang aplikasi (HTML/CSS/JS/ikon) supaya tetap bisa dibuka walau
// koneksi sedang lemah/putus. Data bisnis (Supabase) TIDAK di-cache di sini — itu
// selalu diambil langsung dari jaringan supaya angka pesanan & draft AI tetap real-time.

const CACHE_NAME = 'rujakos-shell-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan pernah cache panggilan ke Supabase (data/auth/realtime harus selalu segar).
  if (url.hostname.includes('supabase.co')) return;

  // Untuk file di origin sendiri (app shell): coba jaringan dulu, fallback ke cache
  // kalau offline. Ini menghindari kita "terjebak" di versi lama saat online normal.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
