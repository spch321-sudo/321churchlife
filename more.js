var NUMZH = ['第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十'], NUMEN = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
var CNUM = '一二三四五六七八九十';
function endP(t) { t = trim(t); return !t ? '' : (/[。！？.!?：:」』”]$/.test(t) ? t : t + (isEN() ? '.' : '。')); }
function mdTok(t) {
var m, b = t.match(/^\*\*([^*]+)\*\*[：:]?$/), u = b ? trim(b[1]) : t;
if ((m = u.match(/^(\d{1,2})[.、）)．]\s*(.+)$/)) || (m = u.match(/^[（(]?([一二三四五六七八九十])[)）、.．]\s*(.+)$/))) {
var n = /\d/.test(m[1]) ? +m[1] : CNUM.indexOf(m[1]) + 1; return { k: 'li', n: n, t: m[2], hd: !!b };
}
if ((m = t.match(/^(?:[-*+]\s+|・\s*|•\s*)(.+)$/))) return { k: 'li', n: 0, t: m[1] };
return { k: 'p', t: t };
}
var LEADW = /^(首先|其次|另外|還有|还有|再來|再来|最後|最后|第[一二三四五六七八九十]|一方面|另一方面|同時|同时|此外|所以|因此|First|Second|Third|Also|Next|Finally|Then|Another)/i;
var STEPW = /步驟|步骤|方法|做法|行動|行动|怎麼做|怎么做|如何|操練|操练|練習|练习|(兩|两|二|三|四|五|六|七|幾|几)(個|个|件|點|点|步|方面|種|种)|steps?|ways|how to|practices|things/i;
function mdSpeak(md) {
var zh = !isEN(), nq = 0, SP = zh ? '' : ' ';
var src = mdTableMap(String(md || '').replace(/(\d)️?⃣/g, '$1. ').replace(EMOJI_RE, ''), function (head, rows) {
var out = [zh ? '我們用一個對照來整理。' : 'Let us lay this out side by side.'];
eachA(rows, function (r, ri) {
var p = [], lead = trim(r[0] || '');
for (var j = 1; j < r.length; j++) { var c = trim(r[j] || ''), hd = trim(head[j] || ''); if (c) p.push(hd ? (zh ? hd + '是' + c : hd + ' is ' + c) : c); }
var pre = rows.length > 1 && ri === rows.length - 1 ? (zh ? '最後，' : 'Finally, ') : '';
out.push(endP(pre + (lead ? lead + (zh ? '：' : ': ') : '') + p.join(zh ? '，' : '; ')));
});
return '\u0001' + out.join('\n\u0001');
});
var tk = [];
eachA(src.split('\n'), function (ln) {
var t = trim(ln), m;
if (!t || /^---+$/.test(t)) { tk.push({ k: 'gap' }); return; }
if (t.charAt(0) === '\u0001') { tk.push({ k: 'raw', t: t.slice(1) }); return; }
if ((m = t.match(/^#{1,6}\s*(.+)$/))) { tk.push({ k: 'h', t: trim(m[1].replace(/[*_`]/g, '').replace(/[：:]$/, '')) }); return; }
if ((m = t.match(/^>\s?(.*)$/))) { tk.push({ k: 'q', t: trim(m[1]) }); return; }
tk.push(mdTok(t));
});
var hs = [], i, j;
for (i = 0; i < tk.length; i++) if (tk[i].k === 'h' && !/想更多|延伸|多想|再想|深思|Think (more|further)|Going deeper|禱告|祷告|Pray/i.test(tk[i].t)) hs.push(i);
var grp = [], cur = null, numG = null, nCnt = 0;
for (i = 0; i < tk.length; i++) if (tk[i].k === 'li' && tk[i].n) nCnt++;
for (i = 0; i < tk.length; i++) {
var x = tk[i];
if (x.k === 'gap') continue;
if (x.k === 'h') { cur = numG = null; continue; }
if (x.k === 'li' && x.n) {
if (!numG || x.n !== numG.last + 1) { numG = { items: [], intro: introOf(i), num: true }; grp.push(numG); }
numG.items.push(i); numG.last = x.n; x.g = numG; cur = null; continue;
}
if (x.k === 'li') {
if (!cur || cur.lastI !== prevNonGap(i)) { cur = { items: [], intro: introOf(i), num: false }; grp.push(cur); }
cur.items.push(i); cur.lastI = i; x.g = cur; continue;
}
cur = null;
}
function prevNonGap(k) { for (k--; k >= 0; k--) if (tk[k].k !== 'gap') return k; return -1; }
function introOf(k) { var q = prevNonGap(k); return q >= 0 && tk[q].k !== 'li' ? tk[q].t || '' : ''; }
eachA(grp, function (g) {
var n = g.items.length, short = true, lab = 0, scr = 0;
eachA(g.items, function (k) {
var t = tk[k].t, plain = mdStrip(t);
if (plain.length > (zh ? 14 : 48) || /[。！？.!?；;，,]/.test(plain.slice(0, -1))) short = false;
if (/^\*\*[^*]+\*\*/.test(t) || tk[k].hd) lab++;
if (/\d+\s*[:：]\s*\d+|[「『“]/.test(t)) scr++;
});
g.mode = g.num && nCnt > 1 ? 'ord' : n < 2 ? 'one' : scr === n ? 'plain' : (g.num || STEPW.test(g.intro)) ? 'ord' : lab * 2 >= n ? 'lab' : short ? 'enum' : 'conn';
g.n = n;
});
var res = [], CZ = ['首先，', '另外，', '還有，', '再來，', '同時，'], CE = ['First, ', 'Also, ', 'Next, ', 'On top of that, ', 'Then, '];
for (i = 0; i < tk.length; i++) {
var y = tk[i], t = y.t;
if (y.k === 'gap') continue;
if (y.k === 'raw') { res.push(t); continue; }
if (y.k === 'h') {
if (/想更多|延伸|多想|再想|深思|Think (more|further)|Going deeper/i.test(t)) res.push(zh ? '如果想更多一點，可以這樣想。' : 'If you want to think further, consider this.');
else if (/禱告|祷告|Pray/i.test(t)) res.push(zh ? '讓我們一起禱告。' : 'Let us pray together.');
else {
var hi = hs.indexOf(i), hl = hs.length, w;
if (hl === 1) w = zh ? '我們來談「' + t + '」。' : 'Let us talk about ' + t + '.';
else if (hi === 0) w = zh ? '先談「' + t + '」。' : 'Let us start with ' + t + '.';
else if (hi === hl - 1 && hl > 2) w = zh ? '最後談「' + t + '」。' : 'Finally, ' + t + '.';
else w = zh ? ['接下來談「', '再來看「', '我們再看「'][(hi - 1) % 3] + t + '」。' : ['Next, let us look at ', 'Then, ', 'Now consider '][(hi - 1) % 3] + t + '.';
res.push(w);
}
continue;
}
if (y.k === 'q') {
if (!t) continue;
var sc = /[「『“"]/.test(t) || /\d+\s*[:：]\s*\d+/.test(t);
res.push((zh ? (sc ? '聖經說：' : (nq++ ? '還有一句：' : '有一句話特別要記住：')) : (sc ? 'Scripture says: ' : (nq++ ? 'And another: ' : 'Here is the line to remember: '))) + endP(t));
continue;
}
if (y.k === 'li' && y.g) {
var g = y.g, ix = g.items.indexOf(i), last = ix === g.n - 1 && g.n > 1, has = LEADW.test(mdStrip(t));
if (g.mode === 'enum') {
if (ix === 0) {
var ws = []; eachA(g.items, function (k) { ws.push(mdStrip(tk[k].t).replace(/[。.]$/, '')); });
res.push(endP(zh ? (g.n === 2 ? ws.join('和') : ws.slice(0, -1).join('、') + '，還有' + ws[ws.length - 1]) : (g.n === 2 ? ws.join(' and ') : ws.slice(0, -1).join(', ') + ', and ' + ws[ws.length - 1])));
}
continue;
}
var pre = '';
if (!has && g.mode === 'ord') { var on = (y.n || ix + 1) - 1; pre = on < 10 ? (zh ? NUMZH[on] + '，' : NUMEN[on] + ', ') : ''; }
else if (!has && g.mode === 'lab') {
var lm = t.match(/^\*\*([^*]+?)\*\*\s*[：:—–-]?\s*(.*)$/) || [0, mdStrip(t), ''];
var L = trim(lm[1]).replace(/[：:]$/, ''), body = trim(lm[2]);
res.push(endP((zh ? (ix === 0 ? '首先是' : last ? '最後是' : '再來是') + '「' + L + '」' : (ix === 0 ? 'First, ' : last ? 'Finally, ' : 'Next, ') + L) + (body ? (zh ? '，' : ': ') + body : '')));
continue;
}
else if (!has && g.mode === 'conn') pre = last ? (zh ? '最後，' : 'Finally, ') : (zh ? CZ : CE)[ix % 5];
res.push(endP(pre + t)); continue;
}
res.push(endP(t));
}
return mdStrip(res.join('\n'));
}
var CHURL = 'https://church-news.spch321.workers.dev';
var CHT = {"zh":{"myChurch":"我的教會","joinHint":"加入教會，和弟兄姊妹一起靈修","togetherT":"和教會一起靈修","togetherD":"加入你的教會，就能看到教會消息、本週大家一起讀的進度，還有今天有幾位弟兄姊妹完成靈修。","joinBtn":"加入我的教會","newN":"{0} 則新消息","open":"查看","planT":"本週一起讀","goRead":"去讀","todayN":"今天已有 {0} 位弟兄姊妹完成靈修","today0":"今天還沒有人完成靈修，你來作第一位","todayLbl":"位今天完成靈修","offline":"目前連不上，先顯示上次的消息","codeIs":"教會代碼 {0}","leader":"負責人","invite":"邀請弟兄姊妹加入","noPlan":"負責人還沒設定","post":"發佈消息","setPlan":"本週進度","all":"全部","newsT":"教會消息","noNews":"目前還沒有消息","noNewsAdm":"還沒有消息，按「發佈消息」寫第一則吧","newTag":"新","until":"到 {0}","openLink":"打開連結","edit":"修改","del":"刪除","armDel":"再按一次刪除","leaderLogin":"負責人登入","leave":"離開這個教會","armLeave":"再按一次離開","privacy":"今日靈修人數只計算人數，不會送出你的名字或筆記。","codeLbl":"教會代碼（向負責人索取）","newChurch":"我是負責人：建立教會","newChurchD":"建立後會得到一組教會代碼，把邀請連結傳給弟兄姊妹就能加入。請記好負責人密碼，發佈消息時要用。","nameLbl":"教會名稱","pinLbl":"負責人密碼（至少 4 碼）","pin2Lbl":"再輸入一次密碼","keyLbl":"建立碼","createBtn":"建立教會","joined":"已加入「{0}」","created":"教會建立好了","createdD":"這是你們的教會代碼，弟兄姊妹輸入代碼或點邀請連結就能加入：","inviteTxt":"邀請你加入「{0}」，一起用《321教會生活》靈修，看教會消息。\n點這個連結：{1}\n或在 App「我的 → 我的教會」輸入代碼：{2}","fromApp":"—— 來自《321教會生活》","left":"已離開這個教會","loginD":"輸入負責人密碼後，這支手機就能發佈與管理消息。","login":"登入","loggedIn":"已用負責人身分登入","editT":"修改消息","kindLbl":"類別","titleLbl":"標題","bodyLbl":"內容","linkLbl":"連結（可不填）","imgLbl":"圖片網址（可不填）","untilLbl":"顯示到哪一天（過了就自動收起，可不填）","topLbl":"置頂","saveEdit":"儲存","publish":"發佈","saved":"已儲存","published":"已發佈，弟兄姊妹打開 App 就會看到","deleted":"已刪除","wholeWeek":"整週","planD":"設定後，全教會首頁都會顯示「本週一起讀」。","weekLbl":"週次","dayLbl":"哪一堂","noteLbl":"給大家的一句話（可不填）","notePh":"例如：週三小組一起分享這一課","clearPlan":"清除本週進度","leaderTools":"負責人設定","rename":"修改教會名稱","newPin":"新的負責人密碼","changePin":"修改密碼","pinChanged":"密碼已更改","logout":"這支手機登出負責人","loggedOut":"已登出負責人","k_news":"公告","k_meet":"聚會","k_event":"活動","k_pray":"代禱","e_net":"連不上教會消息服務，請稍後再試","e_gone":"找不到你的教會，可能已被移除","e_badpin":"負責人密碼不對","e_locked":"密碼錯太多次，請 15 分鐘後再試","e_nochurch":"找不到這個教會代碼","e_shortpin":"密碼至少要 4 碼","e_createkey":"需要建立碼才能建立教會，請向管理者索取","e_url":"連結和圖片網址要以 http:// 或 https:// 開頭","e_nodb":"教會消息服務還沒設定好","e_code":"請輸入教會代碼","e_noname":"請輸入教會名稱","e_pin2":"兩次輸入的密碼不一樣","e_empty":"請寫標題或內容","e_busy":"伺服器忙碌，請再試一次"},"en":{"myChurch":"My Church","joinHint":"Join your church and grow together","togetherT":"Devotions with your church","togetherD":"Join your church to see church news, the lesson everyone is reading this week, and how many brothers and sisters finished today's devotion.","joinBtn":"Join my church","newN":"{0} new","open":"Open","planT":"Reading together this week","goRead":"Read","todayN":"{0} brothers and sisters finished today's devotion","today0":"No one has finished today's devotion yet — be the first","todayLbl":"finished today","offline":"Offline — showing the last news received","codeIs":"Church code {0}","leader":"Leader","invite":"Invite others to join","noPlan":"Not set yet","post":"Post news","setPlan":"This week","all":"All","newsT":"Church news","noNews":"No news yet","noNewsAdm":"No news yet — tap “Post news” to write the first one","newTag":"New","until":"until {0}","openLink":"Open link","edit":"Edit","del":"Delete","armDel":"Tap again to delete","leaderLogin":"Leader sign-in","leave":"Leave this church","armLeave":"Tap again to leave","privacy":"Today's count is only a number; your name and notes are never sent.","codeLbl":"Church code (ask your leader)","newChurch":"I'm a leader: create a church","newChurchD":"You'll get a church code. Send the invite link to your church family so they can join. Keep the leader password — you'll need it to post news.","nameLbl":"Church name","pinLbl":"Leader password (at least 4 characters)","pin2Lbl":"Enter the password again","keyLbl":"Creation key","createBtn":"Create church","joined":"Joined “{0}”","created":"Your church is ready","createdD":"This is your church code. Others join by entering it or tapping your invite link:","inviteTxt":"Join “{0}” and do devotions together in 321 Church Life, with our church news.\nTap this link: {1}\nOr enter this code in the app under Me → My Church: {2}","fromApp":"— from 321 Church Life","left":"You left this church","loginD":"Enter the leader password so this phone can post and manage news.","login":"Sign in","loggedIn":"Signed in as leader","editT":"Edit news","kindLbl":"Type","titleLbl":"Title","bodyLbl":"Message","linkLbl":"Link (optional)","imgLbl":"Image URL (optional)","untilLbl":"Show until (hidden automatically after this date, optional)","topLbl":"Pin to top","saveEdit":"Save","publish":"Publish","saved":"Saved","published":"Published — everyone will see it when they open the app","deleted":"Deleted","wholeWeek":"Whole week","planD":"Everyone's home screen will show “Reading together this week”.","weekLbl":"Week","dayLbl":"Lesson","noteLbl":"A word for everyone (optional)","notePh":"e.g. We'll share this lesson at Wednesday small group","clearPlan":"Clear this week","leaderTools":"Leader settings","rename":"Rename church","newPin":"New leader password","changePin":"Change password","pinChanged":"Password changed","logout":"Sign out as leader on this phone","loggedOut":"Signed out","k_news":"Notice","k_meet":"Meeting","k_event":"Event","k_pray":"Prayer","e_net":"Can't reach the church news service. Please try again later.","e_gone":"Your church can no longer be found","e_badpin":"Wrong leader password","e_locked":"Too many wrong tries. Try again in 15 minutes.","e_nochurch":"No church found with this code","e_shortpin":"Password needs at least 4 characters","e_createkey":"A creation key is needed to create a church","e_url":"Links and image URLs must start with http:// or https://","e_nodb":"The church news service is not set up yet","e_code":"Please enter the church code","e_noname":"Please enter the church name","e_pin2":"The passwords don't match","e_empty":"Please write a title or message","e_busy":"Server busy, please try again"},"zs":{"myChurch":"我的教会","joinHint":"加入教会，和弟兄姐妹一起灵修","togetherT":"和教会一起灵修","togetherD":"加入你的教会，就能看到教会消息、本周大家一起读的进度，还有今天有几位弟兄姐妹完成灵修。","joinBtn":"加入我的教会","newN":"{0} 则新消息","open":"查看","planT":"本周一起读","goRead":"去读","todayN":"今天已有 {0} 位弟兄姐妹完成灵修","today0":"今天还没有人完成灵修，你来作第一位","todayLbl":"位今天完成灵修","offline":"目前连不上，先显示上次的消息","codeIs":"教会代码 {0}","leader":"负责人","invite":"邀请弟兄姐妹加入","noPlan":"负责人还没设定","post":"发布消息","setPlan":"本周进度","all":"全部","newsT":"教会消息","noNews":"目前还没有消息","noNewsAdm":"还没有消息，按「发布消息」写第一则吧","newTag":"新","until":"到 {0}","openLink":"打开连结","edit":"修改","del":"删除","armDel":"再按一次删除","leaderLogin":"负责人登入","leave":"离开这个教会","armLeave":"再按一次离开","privacy":"今日灵修人数只计算人数，不会送出你的名字或笔记。","codeLbl":"教会代码（向负责人索取）","newChurch":"我是负责人：建立教会","newChurchD":"建立后会得到一组教会代码，把邀请连结传给弟兄姐妹就能加入。请记好负责人密码，发布消息时要用。","nameLbl":"教会名称","pinLbl":"负责人密码（至少 4 码）","pin2Lbl":"再输入一次密码","keyLbl":"建立码","createBtn":"建立教会","joined":"已加入「{0}」","created":"教会建立好了","createdD":"这是你们的教会代码，弟兄姐妹输入代码或点邀请连结就能加入：","inviteTxt":"邀请你加入「{0}」，一起用《321教会生活》灵修，看教会消息。\n点这个连结：{1}\n或在 App「我的 → 我的教会」输入代码：{2}","fromApp":"—— 来自《321教会生活》","left":"已离开这个教会","loginD":"输入负责人密码后，这支手机就能发布与管理消息。","login":"登入","loggedIn":"已用负责人身分登入","editT":"修改消息","kindLbl":"类别","titleLbl":"标题","bodyLbl":"内容","linkLbl":"连结（可不填）","imgLbl":"图片网址（可不填）","untilLbl":"显示到哪一天（过了就自动收起，可不填）","topLbl":"置顶","saveEdit":"储存","publish":"发布","saved":"已储存","published":"已发布，弟兄姐妹打开 App 就会看到","deleted":"已删除","wholeWeek":"整周","planD":"设定后，全教会首页都会显示「本周一起读」。","weekLbl":"周次","dayLbl":"哪一堂","noteLbl":"给大家的一句话（可不填）","notePh":"例如：周三小组一起分享这一课","clearPlan":"清除本周进度","leaderTools":"负责人设定","rename":"修改教会名称","newPin":"新的负责人密码","changePin":"修改密码","pinChanged":"密码已更改","logout":"这支手机登出负责人","loggedOut":"已登出负责人","k_news":"公告","k_meet":"聚会","k_event":"活动","k_pray":"代祷","e_net":"连不上教会消息服务，请稍后再试","e_gone":"找不到你的教会，可能已被移除","e_badpin":"负责人密码不对","e_locked":"密码错太多次，请 15 分钟后再试","e_nochurch":"找不到这个教会代码","e_shortpin":"密码至少要 4 码","e_createkey":"需要建立码才能建立教会，请向管理者索取","e_url":"连结和图片网址要以 http:// 或 https:// 开头","e_nodb":"教会消息服务还没设定好","e_code":"请输入教会代码","e_noname":"请输入教会名称","e_pin2":"两次输入的密码不一样","e_empty":"请写标题或内容","e_busy":"伺服器忙碌，请再试一次"}};
var CHK = ['news', 'meet', 'event', 'pray'];
var CH = { f: '', busy: 0, armDel: '', armLeave: 0, at: 0 };
function CT(k) {
var d = CHT[L()] || CHT.zh, s = d[k];
if (s == null) s = CHT.zh[k];
if (s == null) s = k;
for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]);
return s;
}
function chErr(e) { return CT('e_' + e) !== 'e_' + e ? CT('e_' + e) : CT('e_net') + (e ? '（' + e + '）' : ''); }
function chApi(m, path, body, cb) {
ajax(m, CHURL + path, body, null, function (st, txt) {
var j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
if (j && j.ok) cb(j, ''); else cb(null, j && j.err ? j.err : (st > 0 ? 'http' + st : 'net'));
});
}
function chUrl() { return location.origin + location.pathname.replace(/index\.html$/, '') + '?church=' + S.ch.code; }
function chFetch(force, cb) {
if (!S.ch) return cb && cb(null);
if (!force && S.chData && now() - CH.at < 60000) return cb && cb(S.chData);
chApi('GET', '/c/' + S.ch.code + '?day=' + today(), null, function (j, e) {
if (j) { CH.at = now(); S.chData = j; S.ch.name = j.name; if (!S.ch.seen) S.ch.seen = chMaxTs(j); save(); }
else if (e === 'nochurch') toast(CT('e_gone'));
if (cb) cb(j, e);
});
}
function chMaxTs(j) { var m = 1; eachA((j && j.news) || [], function (n) { if (n.ts > m) m = n.ts; }); return m; }
function chUnread() { var n = 0, d = S.chData; if (!S.ch || !d) return 0; eachA(d.news || [], function (x) { if (x.ts > (S.ch.seen || 0)) n++; }); return n; }
function chPlanTxt(p) { return T('wkN', p.w) + (p.d ? ' · ' + T('dN', p.d) : '') + ' ' + T('wt' + p.w); }
function chKind(k) { return CT('k_' + (k || 'news')); }
function chLink(s) { return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>'); }
function chPaint() {
if (S.chPend && S.lang && S.mode && !(R.page && R.page.t === 'church')) { R.chJoin = S.chPend; S.chPend = ''; save(); open_({ t: 'church' }); return; }
var a = $('#chCard'), b = $('#chMe');
if (a) { a.innerHTML = chHomeHtml(); if (S.ch) chFetch(false, function (j) { var el = $('#chCard'); if (j && el) el.innerHTML = chHomeHtml(); }); }
if (b) {
var u = chUnread();
b.innerHTML = '<div class="card"><div class="wk" onclick="open_({t:\'church\'})"><div class="n">⛪</div><div class="grow"><b>' + esc(CT('myChurch')) + '</b><div class="xs muted">' + esc(S.ch ? S.ch.name : CT('joinHint')) + '</div></div>' + (u ? '<span class="chdot">' + u + '</span>' : '') + '</div></div>';
}
}
function chHomeHtml() {
if (!S.ch) {
if (S.chHide) return '';
return '<div class="card chc0"><div class="row sp"><b>⛪ ' + esc(CT('togetherT')) + '</b><button class="ib" onclick="S.chHide=1;save();chPaint()" aria-label="close">✕</button></div><p class="sm muted" style="margin:6px 0 10px">' + esc(CT('togetherD')) + '</p><button class="btn pri" onclick="open_({t:\'church\'})">' + esc(CT('joinBtn')) + '</button></div>';
}
var d = S.chData || {}, u = chUnread(), h = '<div class="card chc" onclick="open_({t:\'church\'})"><div class="row sp"><b>⛪ ' + esc(S.ch.name) + '</b>' + (u ? '<span class="chdot">' + esc(CT('newN', u)) + '</span>' : '<span class="xs muted">' + esc(CT('open')) + ' ›</span>') + '</div>';
if (d.plan) h += '<div class="chplan" onclick="event.stopPropagation();open_({t:\'lesson\',w:' + d.plan.w + ',d:' + (d.plan.d || 1) + '})"><span class="xs">' + esc(CT('planT')) + '</span><b>' + esc(chPlanTxt(d.plan)) + '</b><span class="xs">' + esc(CT('goRead')) + ' ›</span></div>';
if (d.today != null) h += '<p class="sm" style="margin:8px 0 0">🙏 ' + esc(d.today ? CT('todayN', d.today) : CT('today0')) + '</p>';
var ns = d.news || [];
for (var i = 0; i < ns.length && i < 2; i++) h += '<p class="sm chline">' + (ns[i].top ? '📌 ' : '') + '<span class="tag">' + esc(chKind(ns[i].kind)) + '</span> ' + esc(ns[i].title || String(ns[i].body || '').slice(0, 30)) + '</p>';
return h + '</div>';
}
function vChurch() {
if (!S.ch) return chJoinView();
var d = S.chData, adm = !!S.ch.pin;
var h = topbar(S.ch.name, true, '<button class="ib" onclick="chRefresh()" aria-label="refresh">⟳</button>');
if (!d) { setApp(h + '<div class="empty">' + esc(T('loading')) + '</div>'); return chFetch(true, function (j, e) { if (R.page && R.page.t === 'church') { if (j) vChurch(); else setApp(h + '<div class="empty">' + esc(chErr(e)) + '<br><br><button class="btn" onclick="chRefresh()">' + esc(T('retry')) + '</button></div>'); } }); }
if (CH.off) h += '<p class="xs muted c">' + esc(CT('offline')) + '</p>';
h += '<div class="card chhead"><div class="row sp"><div><p class="eyebrow" style="margin:0">' + esc(CT('myChurch')) + '</p><div class="h2" style="margin:2px 0">' + esc(d.name) + '</div><span class="xs muted">' + esc(CT('codeIs', d.code)) + '</span></div>' + (adm ? '<span class="tag">' + esc(CT('leader')) + '</span>' : '') + '</div><div class="row" style="margin-top:10px"><button class="btn grow" onclick="chInvite()">' + esc(CT('invite')) + '</button></div></div>';
h += '<div class="grid2"><div class="tile c"><div class="h2" style="color:var(--brand);margin:0">' + (d.today || 0) + '</div><span class="xs muted">' + esc(CT('todayLbl')) + '</span></div>' +
(d.plan ? '<div class="tile c" style="cursor:pointer" onclick="open_({t:\'lesson\',w:' + d.plan.w + ',d:' + (d.plan.d || 1) + '})"><span class="xs muted">' + esc(CT('planT')) + '</span><b style="color:var(--brand)">' + esc(T('wkN', d.plan.w) + (d.plan.d ? ' · ' + T('dN', d.plan.d) : '')) + '</b><span class="xs muted">' + esc(T('wt' + d.plan.w)) + '</span></div>' : '<div class="tile c"><span class="xs muted">' + esc(CT('planT')) + '</span><span class="sm muted">' + esc(CT('noPlan')) + '</span></div>') + '</div>';
if (d.plan && d.plan.note) h += '<p class="sm chnote">「' + esc(d.plan.note) + '」</p>';
if (adm) h += '<div class="row chadm"><button class="btn pri grow" onclick="chEdit(\'\')">＋ ' + esc(CT('post')) + '</button><button class="btn" onclick="chPlanEd()">' + esc(CT('setPlan')) + '</button><button class="btn" onclick="chMore()">⋯</button></div>';
var cs = '<button class="chip' + (!CH.f ? ' on' : '') + '" onclick="CH.f=\'\';vChurch()">' + esc(CT('all')) + '</button>';
eachA(CHK, function (k) { cs += '<button class="chip' + (CH.f === k ? ' on' : '') + '" onclick="CH.f=\'' + k + '\';vChurch()">' + esc(chKind(k)) + '</button>'; });
h += '<p class="eyebrow" style="margin:16px 2px 6px">' + esc(CT('newsT')) + '</p><div class="chips">' + cs + '</div>';
var ns = [], seen = S.ch.seen || 0;
eachA(d.news || [], function (n) { if (!CH.f || n.kind === CH.f) ns.push(n); });
if (!ns.length) h += '<div class="empty">' + esc(adm ? CT('noNewsAdm') : CT('noNews')) + '</div>';
eachA(ns, function (n) {
h += '<div class="card chn' + (n.ts > seen ? ' new' : '') + '"><div class="row sp"><span><span class="tag k-' + esc(n.kind) + '">' + esc(chKind(n.kind)) + '</span>' + (n.top ? ' 📌' : '') + (n.ts > seen ? ' <span class="chdot">' + esc(CT('newTag')) + '</span>' : '') + '</span><span class="xs muted">' + esc(fmtDate(n.ts)) + (n.until ? ' · ' + esc(CT('until', n.until.slice(5).replace('-', '/'))) : '') + '</span></div>' +
(n.title ? '<p class="h3 chtt">' + esc(n.title) + '</p>' : '') + (n.body ? '<div class="sm chb">' + chLink(n.body) + '</div>' : '') +
(n.img ? '<img class="chimg" src="' + esc(n.img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
'<div class="row chact">' + (n.link ? '<a class="btn" href="' + esc(n.link) + '" target="_blank" rel="noopener">' + esc(CT('openLink')) + '</a>' : '') + '<button class="btn" onclick="chShare(\'' + n.id + '\')">↗ ' + esc(T('share')) + '</button>' +
(adm ? '<button class="btn" onclick="chEdit(\'' + n.id + '\')">' + esc(CT('edit')) + '</button><button class="btn" id="chd' + n.id + '" onclick="chDel(\'' + n.id + '\')">' + esc(CT('armDel') && CH.armDel === n.id ? CT('armDel') : CT('del')) + '</button>' : '') + '</div></div>';
});
h += '<div class="row" style="margin:18px 0 6px">' + (adm ? '' : '<button class="btn grow" onclick="chLogin()">' + esc(CT('leaderLogin')) + '</button>') + '<button class="btn grow" onclick="chLeave()">' + esc(CH.armLeave ? CT('armLeave') : CT('leave')) + '</button></div>';
h += '<p class="xs muted c">' + esc(CT('privacy')) + '</p>';
setApp(h);
var mx = chMaxTs(d); if (mx > (S.ch.seen || 0)) { S.ch.seen = mx; save(); }
if (now() - CH.at > 60000) chFetch(true, function (j) { CH.off = !j; if (j && R.page && R.page.t === 'church') vChurch(); });
}
function chRefresh() { CH.at = 0; chFetch(true, function (j, e) { CH.off = !j; if (!j) toast(chErr(e)); if (R.page && R.page.t === 'church') vChurch(); }); }
function chJoinView() {
var c = R.chJoin || '', h = topbar(CT('myChurch'), true);
h += '<div class="card"><p class="h2" style="margin-top:0">⛪ ' + esc(CT('togetherT')) + '</p><p class="sm muted">' + esc(CT('togetherD')) + '</p>' +
'<label class="xs muted">' + esc(CT('codeLbl')) + '</label><input id="chc" class="inp" maxlength="10" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em;font-size:1.2em" value="' + esc(c) + '" placeholder="ABC234">' +
'<button class="btn pri full" style="margin-top:10px" onclick="chJoin()">' + esc(CT('joinBtn')) + '</button></div>';
h += '<div class="card"><p class="eyebrow">' + esc(CT('newChurch')) + '</p><p class="sm muted">' + esc(CT('newChurchD')) + '</p>' +
'<input id="chn" class="inp" maxlength="40" placeholder="' + esc(CT('nameLbl')) + '">' +
'<input id="chp" class="inp" type="password" maxlength="64" placeholder="' + esc(CT('pinLbl')) + '" style="margin-top:8px">' +
'<input id="chp2" class="inp" type="password" maxlength="64" placeholder="' + esc(CT('pin2Lbl')) + '" style="margin-top:8px">' +
(CH.needKey ? '<input id="chk" class="inp" maxlength="64" placeholder="' + esc(CT('keyLbl')) + '" style="margin-top:8px">' : '') +
'<button class="btn full" style="margin-top:10px" onclick="chCreate()">' + esc(CT('createBtn')) + '</button></div>';
setApp(h);
}
function chJoin() {
var c = ($('#chc').value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(); if (c.length < 4) return toast(CT('e_code'));
if (CH.busy) return; CH.busy = 1; toast(T('loading'));
chApi('GET', '/c/' + c + '?day=' + today(), null, function (j, e) {
CH.busy = 0; if (!j) return toast(chErr(e));
S.ch = { code: j.code, name: j.name, seen: chMaxTs(j), dev: uid(), pin: '', day: '' }; S.chData = j; CH.at = now(); R.chJoin = ''; save();
toast(CT('joined', j.name)); vChurch();
});
}
function chCreate() {
var n = trim($('#chn').value || ''), p = $('#chp').value || '', p2 = $('#chp2').value || '', k = $('#chk') ? $('#chk').value : '';
if (!n) return toast(CT('e_noname')); if (p.length < 4) return toast(CT('e_shortpin')); if (p !== p2) return toast(CT('e_pin2'));
if (CH.busy) return; CH.busy = 1;
chApi('POST', '/create', { name: n, pin: p, key: k, day: today() }, function (j, e) {
CH.busy = 0;
if (!j) { if (e === 'createkey') { CH.needKey = 1; chJoinView(); } return toast(chErr(e)); }
S.ch = { code: j.code, name: j.name, seen: 1, dev: uid(), pin: p, day: '' }; S.chData = j; CH.at = now(); save();
vChurch();
sheet('<div class="c"><p class="h2">' + esc(CT('created')) + '</p><p class="muted">' + esc(CT('createdD')) + '</p><p class="chcode">' + esc(j.code) + '</p><button class="btn pri full" onclick="closeSheet();chInvite()">' + esc(CT('invite')) + '</button><button class="btn full" style="margin-top:8px" onclick="closeSheet()">' + esc(T('amen')) + '</button></div>');
});
}
function chInvite() { shareText(CT('inviteTxt', S.ch.name, chUrl(), S.ch.code)); }
function chShare(id) {
var n = chFind(id); if (!n) return;
shareText('【' + S.ch.name + '・' + chKind(n.kind) + '】' + (n.title ? n.title + '\n' : '') + (n.body || '') + (n.link ? '\n' + n.link : '') + '\n\n' + CT('fromApp'));
}
function chFind(id) { var r = null; eachA((S.chData && S.chData.news) || [], function (n) { if (n.id === id) r = n; }); return r; }
function chLeave() {
if (!CH.armLeave) { CH.armLeave = 1; vChurch(); setTimeout(function () { CH.armLeave = 0; }, 4000); return; }
CH.armLeave = 0; S.ch = null; S.chData = null; save(); toast(CT('left')); back();
}
function chAdm(path, body, ok) {
if (CH.busy) return; CH.busy = 1; body.pin = S.ch.pin; body.day = today();
chApi('POST', '/c/' + S.ch.code + path, body, function (j, e) {
CH.busy = 0;
if (!j) { if (e === 'badpin') { S.ch.pin = ''; save(); } toast(chErr(e)); if (e === 'badpin') vChurch(); return; }
S.chData = j; S.ch.name = j.name; CH.at = now(); save(); if (ok) ok(j);
});
}
function chLogin() {
sheet('<p class="h2" style="margin-top:0">' + esc(CT('leaderLogin')) + '</p><p class="sm muted">' + esc(CT('loginD')) + '</p><input id="chlp" class="inp" type="password" maxlength="64" placeholder="' + esc(CT('pinLbl')) + '"><button class="btn pri full" style="margin-top:10px" onclick="chLoginGo()">' + esc(CT('login')) + '</button>');
setTimeout(function () { var i = $('#chlp'); if (i) i.focus(); }, 200);
}
function chLoginGo() {
var p = $('#chlp').value || ''; if (!p) return;
S.ch.pin = p; chAdm('/auth', {}, function () { closeSheet(); toast(CT('loggedIn')); vChurch(); });
}
function chEdit(id) {
var n = id ? chFind(id) : null; n = n || { kind: 'news', title: '', body: '', link: '', img: '', until: '', top: 0 };
var ks = ''; eachA(CHK, function (k) { ks += '<option value="' + k + '"' + (n.kind === k ? ' selected' : '') + '>' + esc(chKind(k)) + '</option>'; });
sheet('<p class="h2" style="margin-top:0">' + esc(id ? CT('editT') : CT('post')) + '</p>' +
'<label class="xs muted">' + esc(CT('kindLbl')) + '</label><select id="cek" class="inp">' + ks + '</select>' +
'<label class="xs muted">' + esc(CT('titleLbl')) + '</label><input id="cet" class="inp" maxlength="80" value="' + esc(n.title) + '">' +
'<label class="xs muted">' + esc(CT('bodyLbl')) + '</label><textarea id="ceb" class="inp" rows="6" maxlength="2000">' + esc(n.body) + '</textarea>' +
'<label class="xs muted">' + esc(CT('linkLbl')) + '</label><input id="cel" class="inp" maxlength="500" inputmode="url" placeholder="https://" value="' + esc(n.link) + '">' +
'<label class="xs muted">' + esc(CT('imgLbl')) + '</label><input id="cei" class="inp" maxlength="500" inputmode="url" placeholder="https://" value="' + esc(n.img) + '">' +
'<label class="xs muted">' + esc(CT('untilLbl')) + '</label><input id="ceu" class="inp" type="date" value="' + esc(n.until) + '">' +
'<label class="row" style="margin:10px 0"><input id="cep" type="checkbox"' + (n.top ? ' checked' : '') + '> <span class="sm">📌 ' + esc(CT('topLbl')) + '</span></label>' +
'<button class="btn pri full" onclick="chSave(\'' + (id || '') + '\')">' + esc(id ? CT('saveEdit') : CT('publish')) + '</button>');
}
function chSave(id) {
var it = { id: id, kind: $('#cek').value, title: trim($('#cet').value || ''), body: trim($('#ceb').value || ''), link: trim($('#cel').value || ''), img: trim($('#cei').value || ''), until: $('#ceu').value || '', top: $('#cep').checked ? 1 : 0 };
if (!it.title && !it.body) return toast(CT('e_empty'));
if ((it.link && !/^https?:\/\//i.test(it.link)) || (it.img && !/^https?:\/\//i.test(it.img))) return toast(CT('e_url'));
chAdm('/news', { item: it }, function () { closeSheet(); toast(id ? CT('saved') : CT('published')); S.ch.seen = chMaxTs(S.chData); save(); vChurch(); });
}
function chDel(id) {
if (CH.armDel !== id) { CH.armDel = id; var b = $('#chd' + id); if (b) b.textContent = CT('armDel'); setTimeout(function () { if (CH.armDel === id) { CH.armDel = ''; var b2 = $('#chd' + id); if (b2) b2.textContent = CT('del'); } }, 4000); return; }
CH.armDel = ''; chAdm('/del', { id: id }, function () { toast(CT('deleted')); vChurch(); });
}
function chPlanEd() {
var p = (S.chData && S.chData.plan) || { w: chGuessWeek(), d: 0, note: '' }, ws = '', ds = '<option value="0">' + esc(CT('wholeWeek')) + '</option>';
for (var w = 1; w <= 52; w++) ws += '<option value="' + w + '"' + (p.w === w ? ' selected' : '') + '>' + esc(T('wkN', w) + ' ' + T('wt' + w)) + '</option>';
for (var d = 1; d <= 5; d++) ds += '<option value="' + d + '"' + (p.d === d ? ' selected' : '') + '>' + esc(T('dN', d)) + '</option>';
sheet('<p class="h2" style="margin-top:0">' + esc(CT('setPlan')) + '</p><p class="sm muted">' + esc(CT('planD')) + '</p>' +
'<label class="xs muted">' + esc(CT('weekLbl')) + '</label><select id="cpw" class="inp">' + ws + '</select>' +
'<label class="xs muted">' + esc(CT('dayLbl')) + '</label><select id="cpd" class="inp">' + ds + '</select>' +
'<label class="xs muted">' + esc(CT('noteLbl')) + '</label><input id="cpn" class="inp" maxlength="200" value="' + esc(p.note || '') + '" placeholder="' + esc(CT('notePh')) + '">' +
'<button class="btn pri full" style="margin-top:10px" onclick="chPlanSave(1)">' + esc(CT('saveEdit')) + '</button>' +
((S.chData && S.chData.plan) ? '<button class="btn full" style="margin-top:8px" onclick="chPlanSave(0)">' + esc(CT('clearPlan')) + '</button>' : ''));
}
function chGuessWeek() { var n = window.nextLesson ? nextLesson() : null; return n ? n.w : 1; }
function chPlanSave(on) {
var b = on ? { w: +$('#cpw').value, d: +$('#cpd').value, note: trim($('#cpn').value || '') } : { w: 0 };
chAdm('/plan', b, function () { closeSheet(); toast(CT('saved')); vChurch(); });
}
function chMore() {
sheet('<p class="h2" style="margin-top:0">' + esc(CT('leaderTools')) + '</p>' +
'<label class="xs muted">' + esc(CT('nameLbl')) + '</label><input id="cmn" class="inp" maxlength="40" value="' + esc(S.ch.name) + '"><button class="btn full" style="margin-top:8px" onclick="chRename()">' + esc(CT('rename')) + '</button>' +
'<label class="xs muted" style="margin-top:14px;display:block">' + esc(CT('newPin')) + '</label><input id="cmp" class="inp" type="password" maxlength="64"><input id="cmp2" class="inp" type="password" maxlength="64" placeholder="' + esc(CT('pin2Lbl')) + '" style="margin-top:8px"><button class="btn full" style="margin-top:8px" onclick="chNewPin()">' + esc(CT('changePin')) + '</button>' +
'<button class="btn full" style="margin-top:14px" onclick="S.ch.pin=\'\';save();closeSheet();toast(\'' + esc(CT('loggedOut')) + '\');vChurch()">' + esc(CT('logout')) + '</button>');
}
function chRename() { var n = trim($('#cmn').value || ''); if (!n) return toast(CT('e_noname')); chAdm('/name', { name: n }, function () { closeSheet(); toast(CT('saved')); vChurch(); }); }
function chNewPin() {
var p = $('#cmp').value || '', p2 = $('#cmp2').value || ''; if (p.length < 4) return toast(CT('e_shortpin')); if (p !== p2) return toast(CT('e_pin2'));
chAdm('/pin', { newpin: p }, function () { S.ch.pin = p; save(); closeSheet(); toast(CT('pinChanged')); });
}
function chDone() {
if (!S.ch) return; var d = today(); if (S.ch.day === d) return;
if (!S.ch.dev) S.ch.dev = uid();
chApi('POST', '/c/' + S.ch.code + '/done', { day: d, dev: S.ch.dev }, function (j) { if (!j) return; S.ch.day = d; if (S.chData) S.chData.today = j.today; save(); });
}
(function chInit() {
var st = document.createElement('style');
st.textContent = '.chc{cursor:pointer;border-left:4px solid var(--brand)}.chc0{border:1px dashed var(--line)}.chdot{display:inline-block;background:#C8463C;color:#fff;border-radius:999px;font-size:.72em;padding:1px 8px;font-weight:700}' +
'.chplan{display:flex;flex-direction:column;gap:2px;margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--soft);color:var(--brand);cursor:pointer}.chline{margin:6px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
'.chn.new{box-shadow:0 0 0 2px rgba(200,70,60,.25)}.chtt{margin:8px 0 4px;font-weight:700;font-size:1.08em}.chb{line-height:1.85;word-break:break-word}.chb a{color:var(--brand)}.chimg{width:100%;border-radius:12px;margin-top:10px;display:block}' +
'.chact{flex-wrap:wrap;gap:6px;margin-top:10px}.chact .btn{padding:6px 12px;font-size:.88em}.chadm{gap:8px;margin:12px 0}.chnote{margin:4px 4px 0;color:var(--brand)}' +
'.chcode{font-size:2em;letter-spacing:.25em;font-weight:800;color:var(--brand);margin:14px 0}.k-meet{background:#E6F0FA;color:#1F5C99}.k-event{background:#FBF0DC;color:#9A6512}.k-pray{background:#F3E8F7;color:#6C3F8A}' +
'.inp{width:100%!important;height:auto!important;box-sizing:border-box;border:1px solid var(--line);border-radius:12px;padding:11px 12px;background:var(--bg);min-height:46px;margin:2px 0 8px}';
document.head.appendChild(st);
var m = location.search.match(/[?&]church=([A-Za-z0-9]{4,10})/);
if (m) {
var c = m[1].toUpperCase();
if (!S.ch || S.ch.code !== c) { S.chPend = c; save(); }
try { history.replaceState(null, '', location.pathname); } catch (e) { }
}
if (R.page && R.page.t === 'church') render(); else chPaint();
document.addEventListener('visibilitychange', function () { if (!document.hidden && S.ch && now() - CH.at > 120000) chFetch(true, function (j) { if (j) chPaint(); }); });
})();