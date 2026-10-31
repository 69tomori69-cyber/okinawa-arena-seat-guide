/*
 * オフライン対応：一度開いたページとデータをスマホに保存しておき、
 * 館内で電波が弱いときは保存したものを使う。
 * 電波があるときは常に最新を取りに行く（データを直したらすぐ反映されるように）。
 */
var CACHE = "seat-guide-v4";
var FILES = [
  "./",
  "index.html",
  "style.css",
  "data/venue-data.js",
  "js/route.js",
  "js/floor-map.js",
  "js/app.js",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      // QRのURL（?from=…）でもページが開けるよう、クエリを無視して探す
      return caches.match(e.request, { ignoreSearch: true });
    })
  );
});
