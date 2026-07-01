const CACHE = 'whatsapp-shop-admin-v1';

// "/" redirige côté serveur (Next.js) vers "/dashboard" — Cache.addAll()
// refuse de mettre en cache une réponse de redirection, d'où le crash si on la liste ici.
const PRECACHE = ['/login'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => { /* précache best-effort, ne bloque jamais l'installation */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ne jamais mettre en cache les appels API (données temps réel : commandes, conversations…)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return;
  }

  // Network-first pour la navigation (pages)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached ?? caches.match('/login')))
    );
    return;
  }

  // Cache-first pour les assets statiques (JS/CSS/images Next.js)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});