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
     5. 用瀏覽器打開 https://church-chat.spch321.workers.dev/ 看到
          {"ok":true,"service":"church-chat"} 就完成了（資料表會自動建立）

   v2（2026-11-09）：關懷名單——弟兄姊妹自己同意後，把「稱呼、最近完成靈修的日期、
        完成堂數、本週進度」送上來；只有負責人（密碼經 church-news 驗證）看得到名單。
        關掉分享就整筆刪除。不收筆記、畫線、禱告內容。
   v3（2026-11-09）：今日完成名單——完成當天靈修的弟兄姊妹，名字顯示在教會頁一起歡喜
        （選擇不顯示名字的人只算人數）；回傳「你是今天第幾位」給獎勵動畫用。保留 30 天。
   ===================================================================== */

const NEWS = 'https://church-news.spch321.workers.dev';
const KEEP_DAYS = 120;          // 訊息保留天數
const MAX_TEXT = 600;           // 每則字數上限
const DAY_CAP = 3000;           // 每個教會每天訊息上限（防灌水）

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
      PRIMARY KEY (code, day, dev))`)
  ]);
  ready = true;
}

/* 教會代碼是否存在（快取 12 小時） */
async function churchOk(db, code) {
  const now = Date.now();
  const row = await db.prepare('SELECT name, until FROM church WHERE code=?').bind(code).first();
  if (row && row.until > now) return row.name || '';
  let r;
  try { r = await fetch(NEWS + '/c/' + code); } catch (e) { return row ? (row.name || '') : null; }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!j || !j.ok) return null;
  await db.prepare('INSERT OR REPLACE INTO church(code,name,until) VALUES(?,?,?)').bind(code, j.name || '', now + 12 * 3600e3).run();
  return j.name || '';
}
/* 負責人密碼（交給 church-news 驗證，聊天室本身不存密碼） */
async function leaderOk(code, pin) {
  if (!pin) return false;
  try {
    const r = await fetch(NEWS + '/c/' + code + '/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, day: new Date().toISOString().slice(0, 10) }) });
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
  if (after > 0) rs = await db.prepare('SELECT id,ts,dev,nick,text,re,del FROM msg WHERE code=? AND id>? ORDER BY id LIMIT 200').bind(code, after).all();
  else rs = await db.prepare('SELECT * FROM (SELECT id,ts,dev,nick,text,re,del FROM msg WHERE code=? ORDER BY id DESC LIMIT 80) ORDER BY id').bind(code).all();
  const out = [];
  for (const m of rs.results || []) {
    out.push({ id: m.id, ts: m.ts, nick: m.nick, text: m.del ? '' : m.text, re: m.re || 0, del: m.del ? 1 : 0, mine: m.dev === dev ? 1 : 0, who: await tag(m.dev) });
  }
  return out;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (!env.DB) return bad('nodb', 500);
    const db = env.DB; await init(db);
    const url = new URL(req.url);
    const p = url.pathname.split('/').filter(Boolean);
    if (!p.length) return J({ ok: true, service: 'church-chat' });
    if (p[0] !== 'c' || !p[1]) return bad('notfound', 404);
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
      const text = clean(b.text, MAX_TEXT), nick = clean(b.nick, 20) || '弟兄姊妹';
      if (!text) return bad('empty');
      if ((await churchOk(db, code)) === null) return bad('nochurch', 404);
      const now = Date.now();
      const last = await db.prepare('SELECT ts FROM msg WHERE code=? AND dev=? ORDER BY id DESC LIMIT 1').bind(code, dev).first();
      if (last && now - last.ts < 1500) return bad('slow', 429);
      const cnt = await db.prepare('SELECT COUNT(*) AS n FROM msg WHERE code=? AND ts>?').bind(code, now - 864e5).first();
      if (cnt && cnt.n >= DAY_CAP) return bad('full', 429);
      const re = parseInt(b.re, 10) || null;
      await db.prepare('INSERT INTO msg(code,ts,dev,nick,text,re) VALUES(?,?,?,?,?,?)').bind(code, now, dev, nick, text, re).run();
      if (Math.random() < 0.02) await db.prepare('DELETE FROM msg WHERE ts<?').bind(now - KEEP_DAYS * 864e5).run();
      const after = parseInt(b.after, 10) || 0;
      return J({ ok: true, msgs: await list(db, code, after, dev), now });
    }
    if (act === 'del') {
      const id = parseInt(b.id, 10); if (!id) return bad('id');
      const m = await db.prepare('SELECT dev FROM msg WHERE id=? AND code=?').bind(id, code).first();
      if (!m) return bad('gone', 404);
      if (m.dev !== dev && !(await leaderOk(code, b.pin))) return bad('forbid', 403);
      await db.prepare('UPDATE msg SET del=1, text=\'\' WHERE id=?').bind(id).run();
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
