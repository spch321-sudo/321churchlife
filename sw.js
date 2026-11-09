/* 321教會生活 Service Worker —— 自動更新版
   ‧ 每次發佈 V 都不同 → 瀏覽器偵測到 sw.js 位元組改變就安裝新 SW
   ‧ install：skipWaiting；預載用 cache:'reload' 繞過 HTTP 快取（GitHub Pages 會快取 10 分鐘）
   ‧ activate：刪舊快取、clients.claim，並通知所有頁面；背景中的舊頁面直接重新導向成新版
     （連「沒有更新程式碼的舊版頁面」也能被帶到新版）
   ‧ fetch：HTML／JS／JSON 網路優先（no-cache），離線才用快取；圖片快取優先；影音不攔截（Range 請求） */
var V = 'cl321-1.2.202610252246-chen-cr1031-ws3-fs1103-xz1103-au1103-xzm1103-rf1105-fw1105hko-cc1109-cg1109-td1109-at1109-pf1109-np1109-sv1109-xj1109-ct1109-hb1109-tm1109-ub1109-dm1109-sh1109-rc1109-nt1109-nv1109-ln1109-wa1110-em1110-ff1110';
var VER = '1.2.202610252246-chen-cr1031-ws3-fs1103-xz1103-au1103-xzm1103-rf1105-fw1105hko-cc1109-cg1109-td1109-at1109-pf1109-np1109-sv1109-xj1109-ct1109-hb1109-tm1109-ub1109-dm1109-sh1109-rc1109-nt1109-nv1109-ln1109-wa1110-em1110-ff1110';   /* 必須與 index.html 的 APPVER、version.json 完全一致，否則「已有新版本」會一直跳 */
var SHELL = ['./', './index.html', './xzpar.js', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './hero-s.jpg', './c-zh-s1.json', './t-zh.json', './lang-zs.json', './lang-en.json', './lang-ko.json', './media.js', './more.js', './xj.js', './peerjs.min.js', './qrcode.js', "./xz2.js", "./xzm.js"];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r && r.ok) return c.put(u, r); })['catch'](function () { }); }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V && k.indexOf('cl321-') === 0; }).map(function (k) { return caches['delete'](k); }));
  }).then(function () { return self.clients.claim(); }).then(function () {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  }).then(function (cs) {
    cs.forEach(function (c) {
      try { if (c.url.indexOf(self.registration.scope) === 0) c.postMessage({ t: 'sw-updated', v: VER }); } catch (x) { }
      if (c.visibilityState === 'hidden' && c.navigate) { try { c.navigate(c.url); } catch (x) { } }
    });
  }));
});
self.addEventListener('message', function (e) { if (e.data === 'skip') self.skipWaiting(); });

/* v-rf1105：網路優先，但慢網路（超過 SHELL_WAIT 毫秒沒回）先用「完全相同」的快取開；網路那份繼續下載並更新快取。
   只有導覽請求才可以退回 index.html（程式檔退回 HTML 會造成 Unexpected token '<'）。 */
var SHELL_WAIT = 1000;
function shellFetch(e, req, key, url, nav, strict) {
  var net = fetch(url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (resp) {
    if (resp && resp.ok) { var cp = resp.clone(), cp2 = strict ? resp.clone() : null; caches.open(V).then(function (c) { c.put(key, cp); if (cp2) c.put(url, cp2); }); }
    return resp;
  });
  e.waitUntil(net.then(function () { }, function () { }));
  function fallback() {
    return caches.match(key).then(function (h) { return h || caches.match(req, { ignoreSearch: true }); })
      .then(function (h) { return h || (nav ? caches.match('./index.html') : undefined); });
  }
  return new Promise(function (resolve) {
    var done = false;
    /* sv1109：帶 ?v= 版本號的程式檔，慢網路時只接受同一個版本的快取，不拿舊版頂替 */
    var t = setTimeout(function () {
      (strict ? caches.open(V).then(function (c) { return c.match(url); }) : fallback()).then(function (h) { if (h && !done) { done = true; resolve(h); } });
    }, SHELL_WAIT);
    net.then(function (resp) { if (!done) { done = true; clearTimeout(t); resolve(resp); } }, function () {
      clearTimeout(t);
      if (done) return;
      fallback().then(function (h) { if (!done) { done = true; resolve(h || Response.error()); } });
    });
  });
}
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== self.location.origin) return;
  var p = u.pathname;
  if (/\.(mp3|m4a|aac|wav|ogg|opus|mp4|mov|webm)$/i.test(p) || r.headers.get('range')) return;
  if (/version\.json$/.test(p)) { e.respondWith(fetch(p + '?t=' + Date.now(), { cache: 'no-store' })['catch'](function () { return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); })); return; }
  var nav = r.mode === 'navigate' || /\.html$/.test(p) || /\/$/.test(p);
  var key = nav ? './index.html' : (/\.(json|js)$/.test(p) ? u.origin + p : r);
  if (nav || /\.(json|js|css)$/.test(p)) {
    e.respondWith(shellFetch(e, r, key, nav ? u.origin + p + u.search : r.url, nav, !nav && /[?&]v=/.test(u.search)));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (h) {
    return h || fetch(r).then(function (resp) { if (resp && resp.ok) { var cp = resp.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); } return resp; });
  }));
});
