// Copia de la app para que funcione sin conexión.
// Estrategia "primero la red": si hay conexión siempre se baja la versión
// actual (y se actualiza la copia); la copia guardada solo se usa offline.
// CACHE_NAME lo pone herramientas/sincronizar-movil.js con la huella de los
// archivos: cuando algo cambia, se descarta la copia vieja.
const CACHE_NAME = 'drk-movil-a95e5e77cc';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/movil.css',
    './iconos/icono.svg',
    './iconos/icono-180.png',
    './iconos/icono-192.png',
    './iconos/icono-512.png',
    './iconos/icono-mascara-512.png',
    './assets/title_bg.jpg',
    './js/Assets.js',
    './js/Input.js',
    './js/LevelManager.js',
    './js/ParticleSystem.js',
    './js/HUD.js',
    './js/Pincel.js',
    './js/PerfilRecinto.js',
    './js/PerfilKancha.js',
    './js/Sitios.js',
    './js/Excavation.js',
    './js/PixelArt.js',
    './js/Drop.js',
    './js/Ball.js',
    './js/Player.js',
    './js/Sound.js',
    './js/Game.js',
    './js/movil/InputMovil.js',
    './js/movil/HUDMovil.js',
    './js/movil/GameMovil.js',
    './js/movil/main.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k.startsWith('drk-movil-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request, { cache: 'no-cache' }).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
            }
            return response;
        }).catch(() => caches.match(e.request))
    );
});
