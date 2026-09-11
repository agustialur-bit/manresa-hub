/* Puja el número de VERSIO cada cop que publiquis canvis: això fa que els
   mòbils esborrin la còpia antiga i es quedin només amb la nova. */
const VERSIO = 'v3';
const CACHE = 'manresa-hub-' + VERSIO;

// Fitxers que gairebé no canvien: es serveixen de la còpia local.
const ESTATICS = ['./manifest.json', './icon-192.png', './icon-512.png'];
// Pàgines: es precarreguen per poder obrir l'app sense cobertura, però es
// demanen sempre a la xarxa primer (mira el 'fetch' de més avall).
const PAGINES = ['./', './index.html', './entrenaments.html', './feedback.html', './multes.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESTATICS.concat(PAGINES))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Drive i l'API van sempre a la xarxa
  if (req.method !== 'GET') return;

  const esPagina = req.mode === 'navigate' || req.destination === 'document' ||
                   url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (esPagina) {
    // Xarxa primer: així qualsevol canvi que es publiqui arriba sol al mòbil.
    // Si no hi ha cobertura, servim l'última còpia bona desada.
    event.respondWith(
      // 'no-store' salta la copia HTTP del propi navegador: sense aixo, un
      // canvi acabat de publicar pot trigar minuts a arribar al mobil.
      fetch(req.url, { cache: 'no-store', credentials: 'same-origin' })
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Icones, manifest i fotos: còpia primer, que no canvien i així l'app obre
  // ràpid. El que no tinguem encara desat (les fotos de les jugadores) es
  // guarda la primera vegada que es descarrega, per tenir-lo sense cobertura.
  // No van a la llista de precàrrega a posta: si un sol fitxer d'aquella
  // llista fallés, la instal·lació del service worker petaria sencera.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok){
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
      }
      return res;
    }))
  );
});
