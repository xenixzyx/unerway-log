// Saves the app on the phone so it opens with no signal.
var CACHE = 'underway-log-v7';
var FILES = ['./', 'index.html', 'articles.json', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function fresh(req) {
  return fetch(req, { cache: 'no-store' }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  });
}
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // Articles: get the newest library when there's signal; fall back to the saved copy offline.
  if (/articles\.json$/.test(url.pathname)) {
    e.respondWith(new Promise(function (resolve) {
      var done = false, t = setTimeout(function () { caches.match(e.request, { ignoreSearch: true }).then(function (hit) { if (hit && !done) { done = true; resolve(hit); } }); }, 6000);
      fresh(e.request).then(function (res) { if (!done) { done = true; clearTimeout(t); resolve(res); } })
        .catch(function () { caches.match(e.request, { ignoreSearch: true }).then(function (hit) { if (!done) { done = true; clearTimeout(t); resolve(hit || new Response('[]', { headers: { 'Content-Type': 'application/json' } })); } }); });
    }));
    return;
  }
  // Everything else: cache first so it always opens offline; refresh the copy in the background when there is signal.
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    var net = fresh(e.request).catch(function () { return hit; });
    return hit || net;
  }));
});
