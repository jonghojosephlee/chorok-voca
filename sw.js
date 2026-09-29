const VERSION = '2.1.3-37946cac20';
const P = 'cv';                // this app's cache names (초록 cv-, 노랭이 nv-: both apps share one origin)
const AUDIO_KEEP = ["d01.bin?v=0e9d02fdde", "d02.bin?v=71e3a5eec0", "d03.bin?v=71ddd01189", "d04.bin?v=cd8f735b8c", "d05.bin?v=2b2732490a", "d06.bin?v=2458ea05a5", "d07.bin?v=3287039d86", "d08.bin?v=8e56b7c092", "d09.bin?v=0bd030ca10", "d10.bin?v=5ee96bf7a8", "d11.bin?v=11f9fc7065", "d12.bin?v=b4828e98d9", "d13.bin?v=f84906abfb", "d14.bin?v=e3b9d2a850", "d15.bin?v=b0815546ec", "d16.bin?v=6d0658f486", "d17.bin?v=42fa9a27c2", "d18.bin?v=f630d82a94", "d19.bin?v=2c8b755f73", "d20.bin?v=cbc76bce35", "d21.bin?v=d1657e5cc7", "d22.bin?v=b71288e3c9", "d23.bin?v=fc81215d09", "d24.bin?v=2fcf49920c", "d25.bin?v=d0dde38a56", "d26.bin?v=edafff87a5", "d27.bin?v=012663ad96", "d28.bin?v=4bd8a2a8af", "d29.bin?v=6a24942131", "d30.bin?v=9c9a97cad9", "x01.bin?v=0b00040d53", "x02.bin?v=2eb4fd827d", "x03.bin?v=ddf4c0c868", "x04.bin?v=3e0cf4e93a", "x05.bin?v=eac2434611", "x06.bin?v=0cc42f52c4", "x07.bin?v=f2904fa29e", "x08.bin?v=69059c695a", "x09.bin?v=b1ab864687", "x10.bin?v=91f8b3617f", "x11.bin?v=4861c59db1", "x12.bin?v=6d3015a8f6", "x13.bin?v=c1dafeb69c", "x14.bin?v=acbde7ba5d", "x15.bin?v=50fd006b34", "x16.bin?v=3b5ed97a29", "x17.bin?v=05c94544fe", "x18.bin?v=fa88234f98", "x19.bin?v=8c7a3dd8ef", "x20.bin?v=3269525f64", "x21.bin?v=c745541562", "x22.bin?v=7231c75fc6", "x23.bin?v=a423bf81c8", "x24.bin?v=1df7e756d1", "x25.bin?v=81ca994d19", "x26.bin?v=7a66ab6cf8", "x27.bin?v=ac4166fb88", "x28.bin?v=32d2a6fc45", "x29.bin?v=a2daae0312", "x30.bin?v=1f793b2a32"];    // the current audio packs of each Day ("d01.bin?v=<hash>", examples "x01.bin?v=<hash>")
const OLD = {"prefixes": ["shell-"], "names": ["fonts"]};                  // caches an older build of this app left behind
const SHELL = P + '-shell-' + VERSION;
const DATA = P + '-data';
const FONTS = P + '-fonts';
const FILES = ['./', './index.html', './manifest.json', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => (k.startsWith(P + '-shell-') && k !== SHELL) || OLD.prefixes.some(x => k.startsWith(x)) || OLD.names.includes(k)).map(k => caches.delete(k))))
      .then(() => caches.open(DATA))
      .then(c => c.keys().then(reqs => Promise.all(reqs.filter(r => r.url.includes('/data/audio/') && !AUDIO_KEEP.some(k => r.url.endsWith('/' + k))).map(r => c.delete(r)))))   // only Days whose pack changed are fetched again
      .then(() => self.clients.claim())
  );
});

function fresh(request, cacheName, key) {   // network first (revalidating the HTTP cache), cached copy when offline or slow
  const network = fetch(new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' })).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(cacheName).then(c => c.put(key || request, copy)); }
    return res;
  });
  const slow = new Promise(resolve => setTimeout(resolve, 3500));
  return Promise.race([network, slow])
    .then(res => res || caches.match(key || request).then(hit => hit || network))
    .catch(() => caches.match(key || request));
}
function cached(request, cacheName) {   // cache first
  return caches.open(cacheName).then(c => c.match(request).then(hit => hit || fetch(request).then(res => {
    if (res.ok || res.type === 'opaque') c.put(request, res.clone());
    return res;
  })));
}

// study reminders from the voca-sync workflow: {title, body, url, tag}
self.addEventListener('push', event => {
  let m = {};
  try { m = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(m.title || '공부할 시간이에요', { body: m.body || '', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: m.tag || 'study', data: { url: m.url || './' } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow ? self.clients.openWindow('./') : null;
  }));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') event.respondWith(fresh(req, SHELL, './index.html'));
    else if (url.pathname.endsWith('/data/words.bin')) event.respondWith(fresh(req, DATA));
    else if (url.pathname.includes('/data/')) event.respondWith(cached(req, DATA));
    else event.respondWith(cached(req, SHELL));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cached(req, FONTS));
  }
});
