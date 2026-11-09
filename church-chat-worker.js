/* =====================================================================
   321教會生活 — 教會聊天室 Worker（Cloudflare Workers + D1）
   作用：「我的教會」裡同一個教會的弟兄姊妹可以互相聊天。
        每個教會一間聊天室，用教會代碼區分；只有存在的教會代碼才能發言
        （向 church-news.spch321.workers.dev 確認）。
        負責人用原本的負責人密碼就能刪除不合宜的訊息（同樣向 church-news 驗證）。

   部署步驟（Cloudflare 網頁後台，約 5 分鐘）：
     1. Storage & Databases → D1 → Create database，名稱填 church-chat
     2. Workers & Pages → Create → Create Worker，名稱填 church-chat → Deploy
     3. 進入這個 Worker → Edit code → 把本檔全部內容貼上取代 → Deploy
     4. Worker → Settings → Bindings → Add → D1 database
          Variable name 填 DB，Database 選 church-chat → Save / Deploy
     5. 同一頁 Bindings → Add → Service binding：Variable name 填 NEWS，Service 選 church-news → Add Binding
        （讓聊天室能向 church-news 確認教會代碼與負責人密碼；同帳號 Worker 不能用公開網址互叫）
     6. 用瀏覽器打開 https://church-chat.spch321.workers.dev/ 看到
          {"ok":true,"service":"church-chat"} 就完成了（資料表會自動建立）

   v2（2026-11-09）：關懷名單——弟兄姊妹自己同意後，把「稱呼、最近完成靈修的日期、
        完成堂數、本週進度」送上來；只有負責人（密碼經 church-news 驗證）看得到名單。
        關掉分享就整筆刪除。不收筆記、畫線、禱告內容。
   v3（2026-11-09）：今日完成名單——完成當天靈修的弟兄姊妹，名字顯示在教會頁一起歡喜
        （選擇不顯示名字的人只算人數）；回傳「你是今天第幾位」給獎勵動畫用。保留 30 天。
   v4（2026-11-09）：聊天室可以傳相片、檔案、貼圖、語音錄音。相片在手機上先縮小成 JPEG；檔案上限 5MB，
        分段存在 D1（attc 資料表，不需要另外開通 R2／KV）；GET /c/代碼/att/編號 取檔。
        貼圖是 App 內建圖案，只存代號。舊版 App 會看到「📷 相片」「📎 檔名」「[貼圖] 阿們」的文字。
        只要把本檔重新貼上、Deploy，資料表會自動升級。
   ===================================================================== */

const NEWS = 'https://church-news.spch321.workers.dev';
const KEEP_DAYS = 120;          // 訊息保留天數
const MAX_TEXT = 600;           // 每則字數上限
const DAY_CAP = 3000;           // 每個教會每天訊息上限（防灌水）
const MAX_FILE = 5 * 1024 * 1024;  // 相片／檔案上限（原始大小）
const ATT_DAY_CAP = 300;        // 每個教會每天相片＋檔案上限
const CHUNK = 900000;           // 每段 base64 字元數（D1 每列上限約 2MB）
const IMG_MIME = /^image\/(jpeg|png|gif|webp)$/;
const AUD_MIME = /^audio\/(mp4|webm|ogg|mpeg|aac|x-m4a|wav)$/;
const STK = /^[a-z0-9_-]{1,24}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};
const J = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const bad = (err, s) => J({ ok: false, err }, s || 400);

let ready = false;
async function init(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS msg (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL, ts INTEGER NOT NULL, dev TEXT NOT NULL,
      nick TEXT NOT NULL, text TEXT NOT NULL, re INTEGER, del INTEGER DEFAULT 0)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS msg_code_id ON msg(code, id)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS church (code TEXT PRIMARY KEY, name TEXT, until INTEGER)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS member (
      code TEXT NOT NULL, dev TEXT NOT NULL, nick TEXT, total INTEGER, last INTEGER, d7 INTEGER,
      pw INTEGER, pd INTEGER, pn INTEGER, upd INTEGER, PRIMARY KEY (code, dev))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS done (
      code TEXT NOT NULL, day TEXT NOT NULL, dev TEXT NOT NULL, nick TEXT, ts INTEGER,
      PRIMARY KEY (code, day, dev))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS att (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, ts INTEGER NOT NULL,
      mime TEXT, name TEXT, size INTEGER, parts INTEGER)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS attc (att INTEGER NOT NULL, n INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (att, n))`)
  ]);
  /* v4：舊的 msg 表補上 kind／att／meta 欄位（已經有就略過） */
  for (const col of ['kind TEXT', 'att INTEGER', 'meta TEXT']) {
    try { await db.prepare('ALTER TABLE msg ADD COLUMN ' + col).run(); } catch (e) { }
  }
  ready = true;
}

/* 呼叫 church-news：同一個帳號的 Worker 之間不能用公開網址互叫（Cloudflare 錯誤 1042），
   所以優先走「Service binding」（變數名稱 NEWS → church-news）；沒有綁定才退回公開網址。 */
let ENV = null;
function newsFetch(path, init) {
  if (ENV && ENV.NEWS && typeof ENV.NEWS.fetch === 'function') return ENV.NEWS.fetch(new Request('https://church-news' + path, init));
  return fetch(NEWS + path, init);
}
/* 教會代碼是否存在（快取 12 小時）。church-news 明確說「沒有這個教會」才擋；
   暫時連不上（或還沒設定 Service binding）就先放行 10 分鐘，不讓聊天整個停擺。 */
async function churchOk(db, code) {
  const now = Date.now();
  const row = await db.prepare('SELECT name, until FROM church WHERE code=?').bind(code).first();
  if (row && row.until > now) return row.name || '';
  let j = null;
  try { const r = await newsFetch('/c/' + code); j = await r.json(); } catch (e) { j = null; }
  if (j && j.ok === false && /nochurch|notfound/.test(String(j.err || ''))) return null;
  const ok = !!(j && j.ok);
  await db.prepare('INSERT OR REPLACE INTO church(code,name,until) VALUES(?,?,?)').bind(code, ok ? (j.name || '') : (row ? row.name : ''), now + (ok ? 12 * 3600e3 : 600e3)).run();
  return ok ? (j.name || '') : (row ? (row.name || '') : '');
}
/* 負責人密碼（交給 church-news 驗證，聊天室本身不存密碼） */
async function leaderOk(code, pin) {
  if (!pin) return false;
  try {
    const r = await newsFetch('/c/' + code + '/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, day: new Date().toISOString().slice(0, 10) }) });
    const j = await r.json();
    return !!(j && j.ok);
  } catch (e) { return false; }
}
/* 對外只給裝置代號的雜湊（區分頭像顏色），不外流裝置代號 */
async function tag(dev) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('321chat:' + dev));
  return [...new Uint8Array(b)].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('');
}
function clean(s, n) { return String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, n); }

async function todayList(db, code, day) {
  const rs = await db.prepare('SELECT dev,nick,ts FROM done WHERE code=? AND day=? ORDER BY ts').bind(code, day).all();
  const out = [];
  for (const m of rs.results || []) out.push({ nick: m.nick || '', ts: m.ts, who: await tag(m.dev) });
  return out;
}
async function list(db, code, after, dev) {
  let rs;
  if (after > 0) rs = await db.prepare('SELECT id,ts,dev,nick,text,re,del,kind,att,meta FROM msg WHERE code=? AND id>? ORDER BY id LIMIT 200').bind(code, after).all();
  else rs = await db.prepare('SELECT * FROM (SELECT id,ts,dev,nick,text,re,del,kind,att,meta FROM msg WHERE code=? ORDER BY id DESC LIMIT 80) ORDER BY id').bind(code).all();
  const out = [];
  for (const m of rs.results || []) {
    const o = { id: m.id, ts: m.ts, nick: m.nick, text: m.del ? '' : m.text, re: m.re || 0, del: m.del ? 1 : 0, mine: m.dev === dev ? 1 : 0, who: await tag(m.dev) };
    if (m.kind && !m.del) { o.kind = m.kind; if (m.att) o.att = m.att; try { o.meta = JSON.parse(m.meta || '{}'); } catch (e) { o.meta = {}; } }
    out.push(o);
  }
  return out;
}

/* 取相片／檔案：相片直接顯示；其他檔案一律當下載（不在本網域開網頁，避免夾帶程式） */
async function getAtt(db, code, id) {
  if (!id) return bad('id', 404);
  const a = await db.prepare('SELECT id,code,mime,name,size,parts FROM att WHERE id=?').bind(id).first();
  if (!a || a.code !== code.replace(/[^A-Z0-9]/g, '')) return bad('gone', 404);
  let b64 = '';
  for (let i = 0; i < (a.parts || 1); i++) {
    const c = await db.prepare('SELECT data FROM attc WHERE att=? AND n=?').bind(id, i).first();
    if (!c) return bad('gone', 404);
    b64 += c.data;
  }
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const img = IMG_MIME.test(a.mime || '') || AUD_MIME.test(a.mime || '');
  const fn = encodeURIComponent(a.name || 'file');
  return new Response(u8, { headers: {
    ...CORS,
    'Content-Type': img ? a.mime : (a.mime === 'application/pdf' ? 'application/pdf' : 'application/octet-stream'),
    'Content-Disposition': (img ? 'inline' : 'attachment') + "; filename*=UTF-8''" + fn,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox"
  } });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    ENV = env;
    if (!env.DB) return bad('nodb', 500);
    const db = env.DB; await init(db);
    const url = new URL(req.url);
    const p = url.pathname.split('/').filter(Boolean);
    if (!p.length) return J({ ok: true, service: 'church-chat', v: 4, att: true, news: !!(env.NEWS && env.NEWS.fetch) });
    if (p[0] !== 'c' || !p[1]) return bad('notfound', 404);
    if (req.method === 'GET' && p[2] === 'att') return getAtt(db, String(p[1]).toUpperCase(), parseInt(p[3], 10) || 0);
    const code = String(p[1]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (code.length < 4) return bad('nochurch', 404);
    const act = p[2] || 'msgs';

    if (req.method === 'GET' && act === 'msgs') {
      const after = parseInt(url.searchParams.get('after') || '0', 10) || 0;
      const dev = clean(url.searchParams.get('dev'), 64);
      const msgs = await list(db, code, after, dev);
      return J({ ok: true, msgs, now: Date.now() });
    }
    if (req.method === 'GET' && act === 'today') {
      const day = clean(url.searchParams.get('day'), 10);
      return J({ ok: true, day, list: await todayList(db, code, day) });
    }
    if (req.method !== 'POST') return bad('method', 405);
    let b = {}; try { b = await req.json(); } catch (e) { return bad('json'); }
    const dev = clean(b.dev, 64);
    if (dev.length < 6) return bad('dev');

    if (act === 'send') {
      let text = clean(b.text, MAX_TEXT);
      const nick = clean(b.nick, 20) || '弟兄姊妹';
      const kind = ['img', 'file', 'stk', 'voice'].indexOf(b.kind) >= 0 ? b.kind : '';
      let meta = null, attData = null;
      if (kind === 'stk') {
        const k = clean(b.stk, 24); if (!STK.test(k)) return bad('stk');
        meta = { stk: k }; if (!text) text = '[貼圖]';
      } else if (kind) {
        attData = String(b.data || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
        if (!attData || !/^[A-Za-z0-9+/=]+$/.test(attData)) return bad('nodata');
        const size = Math.floor(attData.length * 3 / 4);
        if (size > MAX_FILE) return bad('toobig', 413);
        let mime = clean(b.mime, 100).toLowerCase().split(';')[0].trim() || 'application/octet-stream';
        if (kind === 'img' && !IMG_MIME.test(mime)) return bad('mime');
        if (kind === 'voice' && !AUD_MIME.test(mime)) return bad('mime');
        const name = clean(b.name, 120) || (kind === 'img' ? 'photo.jpg' : kind === 'voice' ? 'voice' : 'file');
        meta = { name, size, mime, w: Math.min(20000, parseInt(b.w, 10) || 0), h: Math.min(20000, parseInt(b.h, 10) || 0) };
        if (kind === 'voice') meta.dur = Math.max(0, Math.min(600, Math.round(+b.dur || 0)));
        if (!text) text = kind === 'img' ? '📷 相片' : kind === 'voice' ? '🎤 語音' + (meta.dur ? ' ' + meta.dur + '″' : '') : '📎 ' + name;
      }
      if (!text) return bad('empty');
      if ((await churchOk(db, code)) === null) return bad('nochurch', 404);
      const now = Date.now();
      const last = await db.prepare('SELECT ts FROM msg WHERE code=? AND dev=? ORDER BY id DESC LIMIT 1').bind(code, dev).first();
      if (last && now - last.ts < 1500) return bad('slow', 429);
      const cnt = await db.prepare('SELECT COUNT(*) AS n FROM msg WHERE code=? AND ts>?').bind(code, now - 864e5).first();
      if (cnt && cnt.n >= DAY_CAP) return bad('full', 429);
      const re = parseInt(b.re, 10) || null;
      let attId = null;
      if (attData) {
        const ac = await db.prepare('SELECT COUNT(*) AS n FROM att WHERE code=? AND ts>?').bind(code, now - 864e5).first();
        if (ac && ac.n >= ATT_DAY_CAP) return bad('attfull', 429);
        const parts = Math.ceil(attData.length / CHUNK);
        const r = await db.prepare('INSERT INTO att(code,ts,mime,name,size,parts) VALUES(?,?,?,?,?,?)').bind(code, now, meta.mime, meta.name, meta.size, parts).run();
        attId = r.meta && r.meta.last_row_id ? r.meta.last_row_id : (r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null);
        if (!attId) { const q = await db.prepare('SELECT id FROM att WHERE code=? AND ts=? ORDER BY id DESC LIMIT 1').bind(code, now).first(); attId = q && q.id; }
        for (let i = 0; i < parts; i++) await db.prepare('INSERT INTO attc(att,n,data) VALUES(?,?,?)').bind(attId, i, attData.slice(i * CHUNK, (i + 1) * CHUNK)).run();
      }
      await db.prepare('INSERT INTO msg(code,ts,dev,nick,text,re,kind,att,meta) VALUES(?,?,?,?,?,?,?,?,?)').bind(code, now, dev, nick, text, re, kind || null, attId, meta ? JSON.stringify(meta) : null).run();
      if (Math.random() < 0.02) {
        const old = now - KEEP_DAYS * 864e5;
        await db.prepare('DELETE FROM msg WHERE ts<?').bind(old).run();
        await db.prepare('DELETE FROM attc WHERE att IN (SELECT id FROM att WHERE ts<?)').bind(old).run();
        await db.prepare('DELETE FROM att WHERE ts<?').bind(old).run();
      }
      const after = parseInt(b.after, 10) || 0;
      return J({ ok: true, msgs: await list(db, code, after, dev), now });
    }
    if (act === 'del') {
      const id = parseInt(b.id, 10); if (!id) return bad('id');
      const m = await db.prepare('SELECT dev,att FROM msg WHERE id=? AND code=?').bind(id, code).first();
      if (!m) return bad('gone', 404);
      if (m.dev !== dev && !(await leaderOk(code, b.pin))) return bad('forbid', 403);
      await db.prepare('UPDATE msg SET del=1, text=\'\', meta=NULL WHERE id=?').bind(id).run();
      if (m.att) { await db.prepare('DELETE FROM attc WHERE att=?').bind(m.att).run(); await db.prepare('DELETE FROM att WHERE id=?').bind(m.att).run(); }
      return J({ ok: true });
    }
    if (act === 'done') {
      const day = clean(b.day, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad('day');
      if ((await churchOk(db, code)) === null) return bad('nochurch', 404);
      const nick = b.hide ? '' : clean(b.nick, 20);
      const now = Date.now();
      await db.prepare('INSERT INTO done(code,day,dev,nick,ts) VALUES(?,?,?,?,?) ON CONFLICT(code,day,dev) DO UPDATE SET nick=excluded.nick')
        .bind(code, day, dev, nick, now).run();
      if (Math.random() < 0.02) await db.prepare('DELETE FROM done WHERE ts<?').bind(now - 30 * 864e5).run();
      const all = await todayList(db, code, day), me = await tag(dev);
      let rank = 0; all.forEach((m, i) => { if (m.who === me) rank = i + 1; });
      return J({ ok: true, rank, list: all });
    }
    if (act === 'prog') {
      if (!b.share) {
        await db.prepare('DELETE FROM member WHERE code=? AND dev=?').bind(code, dev).run();
        return J({ ok: true, shared: 0 });
      }
      if ((await churchOk(db, code)) === null) return bad('nochurch', 404);
      const n = v => Math.max(0, Math.min(1e13, parseInt(v, 10) || 0));
      await db.prepare('INSERT OR REPLACE INTO member(code,dev,nick,total,last,d7,pw,pd,pn,upd) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .bind(code, dev, clean(b.nick, 20) || '弟兄姊妹', n(b.total), n(b.last), n(b.d7), n(b.pw), n(b.pd), n(b.pn), Date.now()).run();
      return J({ ok: true, shared: 1 });
    }
    if (act === 'roster') {
      if (!(await leaderOk(code, b.pin))) return bad('badpin', 403);
      const rs = await db.prepare('SELECT dev,nick,total,last,d7,pw,pd,pn,upd FROM member WHERE code=? ORDER BY last').bind(code).all();
      const list = [];
      for (const m of rs.results || []) list.push({ who: await tag(m.dev), nick: m.nick, total: m.total, last: m.last, d7: m.d7, pw: m.pw, pd: m.pd, pn: m.pn, upd: m.upd });
      return J({ ok: true, list, now: Date.now() });
    }
    return bad('notfound', 404);
  }
};
