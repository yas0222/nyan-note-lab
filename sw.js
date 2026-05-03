const CACHE_NAME = "nyan-note-lab-cache-v4";
const APP_SHELL = [
  "/nyan-note-lab/",
  "/nyan-note-lab/index.html",
  "/nyan-note-lab/styles.css",
  "/nyan-note-lab/app.js",
  "/nyan-note-lab/manifest.json",
  "/nyan-note-lab/public/icons/cat-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((res) => res || fetch(event.request)));
});
