const CACHE_NAME = 'planificador-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/tokens.css',
  '/css/app.css',
  '/js/db.js',
  '/js/utils.js',
  '/js/capacidad.js',
  '/js/plantillas.js',
  '/js/views/forms.js',
  '/js/views/hoy.js',
  '/js/views/semana.js',
  '/js/views/portafolio.js',
  '/js/views/proyecto.js',
  '/js/views/subproyecto.js',
  '/js/views/config.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for assets, network-first fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
