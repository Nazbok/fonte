/* Service worker : met l'app en cache pour qu'elle fonctionne sans réseau.
   Change VERSION à chaque mise à jour pour forcer le rafraîchissement. */
const VERSION = 'fonte-5';
const FICHIERS = ['./', './index.html', './manifest.webmanifest',
                  './icone-192.png', './icone-512.png', './icone-512-maskable.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Le réseau d'abord quand il répond, le cache sinon : l'app reste à jour
  // sans jamais dépendre de la connexion en salle.
  e.respondWith(
    fetch(e.request)
      .then((rep) => {
        const copie = rep.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copie));
        return rep;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
