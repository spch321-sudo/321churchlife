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
var CHT = {"zh": {"myChurch": "我的教會", "joinHint": "加入教會，和弟兄姊妹一起靈修", "togetherT": "和教會一起靈修", "togetherD": "加入你的教會，就能看到教會消息、本週大家一起讀的進度，還有今天有幾位弟兄姊妹完成靈修。", "joinBtn": "加入我的教會", "newN": "{0} 則新消息", "open": "查看", "planT": "本週一起讀", "goRead": "去讀", "todayN": "今天已有 {0} 位弟兄姊妹完成靈修", "today0": "今天還沒有人完成靈修，你來作第一位", "todayLbl": "位今天完成靈修", "offline": "目前連不上，先顯示上次的消息", "codeIs": "教會代碼 {0}", "leader": "負責人", "invite": "邀請弟兄姊妹加入", "noPlan": "負責人還沒設定", "post": "發佈消息", "setPlan": "本週進度", "all": "全部", "newsT": "教會消息", "noNews": "目前還沒有消息", "noNewsAdm": "還沒有消息，按「發佈消息」寫第一則吧", "newTag": "新", "until": "到 {0}", "openLink": "打開連結", "edit": "修改", "del": "刪除", "armDel": "再按一次刪除", "leaderLogin": "負責人登入", "leave": "離開這個教會", "armLeave": "再按一次離開", "privacy": "完成今天靈修的弟兄姊妹，名字會顯示在教會頁一起歡喜；筆記和禱告內容不會送出。不想顯示名字，可以在下方關閉。", "codeLbl": "教會代碼（向負責人索取）", "newChurch": "我是負責人：建立教會", "newChurchD": "建立後會得到一組教會代碼，把邀請連結傳給弟兄姊妹就能加入。請記好負責人密碼，發佈消息時要用。", "nameLbl": "教會名稱", "pinLbl": "負責人密碼（至少 4 碼）", "pin2Lbl": "再輸入一次密碼", "keyLbl": "建立碼", "createBtn": "建立教會", "joined": "已加入「{0}」", "created": "教會建立好了", "createdD": "這是你們的教會代碼，弟兄姊妹輸入代碼或點邀請連結就能加入：", "inviteTxt": "邀請你加入「{0}」，一起用《321教會生活》靈修，看教會消息。\n點這個連結：{1}\n或在 App「我的 → 我的教會」輸入代碼：{2}", "fromApp": "—— 來自《321教會生活》", "left": "已離開這個教會", "loginD": "輸入負責人密碼後，這支手機就能發佈與管理消息。", "login": "登入", "loggedIn": "已用負責人身分登入", "editT": "修改消息", "kindLbl": "類別", "titleLbl": "標題", "bodyLbl": "內容", "linkLbl": "連結（可不填）", "imgLbl": "圖片網址（可不填）", "untilLbl": "顯示到哪一天（過了就自動收起，可不填）", "topLbl": "置頂", "saveEdit": "儲存", "publish": "發佈", "saved": "已儲存", "published": "已發佈，弟兄姊妹打開 App 就會看到", "deleted": "已刪除", "wholeWeek": "整週", "planD": "設定後，全教會首頁都會顯示「本週一起讀」。", "weekLbl": "週次", "dayLbl": "哪一堂", "noteLbl": "給大家的一句話（可不填）", "notePh": "例如：週三小組一起分享這一課", "clearPlan": "清除本週進度", "leaderTools": "負責人設定", "rename": "修改教會名稱", "newPin": "新的負責人密碼", "changePin": "修改密碼", "pinChanged": "密碼已更改", "logout": "這支手機登出負責人", "loggedOut": "已登出負責人", "k_news": "公告", "k_meet": "聚會", "k_event": "活動", "k_pray": "代禱", "e_net": "連不上教會消息服務，請稍後再試", "e_gone": "找不到你的教會，可能已被移除", "e_badpin": "負責人密碼不對", "e_locked": "密碼錯太多次，請 15 分鐘後再試", "e_nochurch": "找不到這個教會代碼", "e_shortpin": "密碼至少要 4 碼", "e_createkey": "需要建立碼才能建立教會，請向管理者索取", "e_url": "連結和圖片網址要以 http:// 或 https:// 開頭", "e_nodb": "教會消息服務還沒設定好", "e_code": "請輸入教會代碼", "e_noname": "請輸入教會名稱", "e_pin2": "兩次輸入的密碼不一樣", "e_empty": "請寫標題或內容", "e_busy": "伺服器忙碌，請再試一次"}, "en": {"myChurch": "My Church", "joinHint": "Join your church and grow together", "togetherT": "Devotions with your church", "togetherD": "Join your church to see church news, the lesson everyone is reading this week, and how many brothers and sisters finished today's devotion.", "joinBtn": "Join my church", "newN": "{0} new", "open": "Open", "planT": "Reading together this week", "goRead": "Read", "todayN": "{0} brothers and sisters finished today's devotion", "today0": "No one has finished today's devotion yet — be the first", "todayLbl": "finished today", "offline": "Offline — showing the last news received", "codeIs": "Church code {0}", "leader": "Leader", "invite": "Invite others to join", "noPlan": "Not set yet", "post": "Post news", "setPlan": "This week", "all": "All", "newsT": "Church news", "noNews": "No news yet", "noNewsAdm": "No news yet — tap “Post news” to write the first one", "newTag": "New", "until": "until {0}", "openLink": "Open link", "edit": "Edit", "del": "Delete", "armDel": "Tap again to delete", "leaderLogin": "Leader sign-in", "leave": "Leave this church", "armLeave": "Tap again to leave", "privacy": "When you finish today’s devotion, your name appears on the church page so we can rejoice together. Your notes and prayers are never sent. You can hide your name below.", "codeLbl": "Church code (ask your leader)", "newChurch": "I'm a leader: create a church", "newChurchD": "You'll get a church code. Send the invite link to your church family so they can join. Keep the leader password — you'll need it to post news.", "nameLbl": "Church name", "pinLbl": "Leader password (at least 4 characters)", "pin2Lbl": "Enter the password again", "keyLbl": "Creation key", "createBtn": "Create church", "joined": "Joined “{0}”", "created": "Your church is ready", "createdD": "This is your church code. Others join by entering it or tapping your invite link:", "inviteTxt": "Join “{0}” and do devotions together in 321 Church Life, with our church news.\nTap this link: {1}\nOr enter this code in the app under Me → My Church: {2}", "fromApp": "— from 321 Church Life", "left": "You left this church", "loginD": "Enter the leader password so this phone can post and manage news.", "login": "Sign in", "loggedIn": "Signed in as leader", "editT": "Edit news", "kindLbl": "Type", "titleLbl": "Title", "bodyLbl": "Message", "linkLbl": "Link (optional)", "imgLbl": "Image URL (optional)", "untilLbl": "Show until (hidden automatically after this date, optional)", "topLbl": "Pin to top", "saveEdit": "Save", "publish": "Publish", "saved": "Saved", "published": "Published — everyone will see it when they open the app", "deleted": "Deleted", "wholeWeek": "Whole week", "planD": "Everyone's home screen will show “Reading together this week”.", "weekLbl": "Week", "dayLbl": "Lesson", "noteLbl": "A word for everyone (optional)", "notePh": "e.g. We'll share this lesson at Wednesday small group", "clearPlan": "Clear this week", "leaderTools": "Leader settings", "rename": "Rename church", "newPin": "New leader password", "changePin": "Change password", "pinChanged": "Password changed", "logout": "Sign out as leader on this phone", "loggedOut": "Signed out", "k_news": "Notice", "k_meet": "Meeting", "k_event": "Event", "k_pray": "Prayer", "e_net": "Can't reach the church news service. Please try again later.", "e_gone": "Your church can no longer be found", "e_badpin": "Wrong leader password", "e_locked": "Too many wrong tries. Try again in 15 minutes.", "e_nochurch": "No church found with this code", "e_shortpin": "Password needs at least 4 characters", "e_createkey": "A creation key is needed to create a church", "e_url": "Links and image URLs must start with http:// or https://", "e_nodb": "The church news service is not set up yet", "e_code": "Please enter the church code", "e_noname": "Please enter the church name", "e_pin2": "The passwords don't match", "e_empty": "Please write a title or message", "e_busy": "Server busy, please try again"}, "zs": {"myChurch": "我的教会", "joinHint": "加入教会，和弟兄姐妹一起灵修", "togetherT": "和教会一起灵修", "togetherD": "加入你的教会，就能看到教会消息、本周大家一起读的进度，还有今天有几位弟兄姐妹完成灵修。", "joinBtn": "加入我的教会", "newN": "{0} 则新消息", "open": "查看", "planT": "本周一起读", "goRead": "去读", "todayN": "今天已有 {0} 位弟兄姐妹完成灵修", "today0": "今天还没有人完成灵修，你来作第一位", "todayLbl": "位今天完成灵修", "offline": "目前连不上，先显示上次的消息", "codeIs": "教会代码 {0}", "leader": "负责人", "invite": "邀请弟兄姐妹加入", "noPlan": "负责人还没设定", "post": "发布消息", "setPlan": "本周进度", "all": "全部", "newsT": "教会消息", "noNews": "目前还没有消息", "noNewsAdm": "还没有消息，按「发布消息」写第一则吧", "newTag": "新", "until": "到 {0}", "openLink": "打开连结", "edit": "修改", "del": "删除", "armDel": "再按一次删除", "leaderLogin": "负责人登入", "leave": "离开这个教会", "armLeave": "再按一次离开", "privacy": "完成今天灵修的弟兄姐妹，名字会显示在教会页一起欢喜；笔记和祷告内容不会送出。不想显示名字，可以在下方关闭。", "codeLbl": "教会代码（向负责人索取）", "newChurch": "我是负责人：建立教会", "newChurchD": "建立后会得到一组教会代码，把邀请连结传给弟兄姐妹就能加入。请记好负责人密码，发布消息时要用。", "nameLbl": "教会名称", "pinLbl": "负责人密码（至少 4 码）", "pin2Lbl": "再输入一次密码", "keyLbl": "建立码", "createBtn": "建立教会", "joined": "已加入「{0}」", "created": "教会建立好了", "createdD": "这是你们的教会代码，弟兄姐妹输入代码或点邀请连结就能加入：", "inviteTxt": "邀请你加入「{0}」，一起用《321教会生活》灵修，看教会消息。\n点这个连结：{1}\n或在 App「我的 → 我的教会」输入代码：{2}", "fromApp": "—— 来自《321教会生活》", "left": "已离开这个教会", "loginD": "输入负责人密码后，这支手机就能发布与管理消息。", "login": "登入", "loggedIn": "已用负责人身分登入", "editT": "修改消息", "kindLbl": "类别", "titleLbl": "标题", "bodyLbl": "内容", "linkLbl": "连结（可不填）", "imgLbl": "图片网址（可不填）", "untilLbl": "显示到哪一天（过了就自动收起，可不填）", "topLbl": "置顶", "saveEdit": "储存", "publish": "发布", "saved": "已储存", "published": "已发布，弟兄姐妹打开 App 就会看到", "deleted": "已删除", "wholeWeek": "整周", "planD": "设定后，全教会首页都会显示「本周一起读」。", "weekLbl": "周次", "dayLbl": "哪一堂", "noteLbl": "给大家的一句话（可不填）", "notePh": "例如：周三小组一起分享这一课", "clearPlan": "清除本周进度", "leaderTools": "负责人设定", "rename": "修改教会名称", "newPin": "新的负责人密码", "changePin": "修改密码", "pinChanged": "密码已更改", "logout": "这支手机登出负责人", "loggedOut": "已登出负责人", "k_news": "公告", "k_meet": "聚会", "k_event": "活动", "k_pray": "代祷", "e_net": "连不上教会消息服务，请稍后再试", "e_gone": "找不到你的教会，可能已被移除", "e_badpin": "负责人密码不对", "e_locked": "密码错太多次，请 15 分钟后再试", "e_nochurch": "找不到这个教会代码", "e_shortpin": "密码至少要 4 码", "e_createkey": "需要建立码才能建立教会，请向管理者索取", "e_url": "连结和图片网址要以 http:// 或 https:// 开头", "e_nodb": "教会消息服务还没设定好", "e_code": "请输入教会代码", "e_noname": "请输入教会名称", "e_pin2": "两次输入的密码不一样", "e_empty": "请写标题或内容", "e_busy": "伺服器忙碌，请再试一次"}, "ko": {"myChurch": "나의 교회", "joinHint": "교회에 함께하며 같이 자라가요", "togetherT": "교회와 함께하는 묵상", "togetherD": "교회에 함께하면 교회 소식과 이번 주에 모두가 읽는 말씀, 오늘 묵상을 마친 형제자매의 수를 볼 수 있어요.", "joinBtn": "내 교회에 함께하기", "newN": "새 소식 {0}", "open": "열기", "planT": "이번 주 함께 읽어요", "goRead": "읽기", "todayN": "오늘 묵상을 마친 형제자매 {0}명", "today0": "아직 오늘 묵상을 마친 사람이 없어요. 첫 번째가 되어 보세요", "todayLbl": "오늘 묵상 완료", "offline": "오프라인이에요. 마지막으로 받은 소식을 보여 드려요", "codeIs": "교회 코드 {0}", "leader": "리더", "invite": "다른 분 초대하기", "noPlan": "아직 정하지 않았어요", "post": "소식 올리기", "setPlan": "이번 주", "all": "전체", "newsT": "교회 소식", "noNews": "아직 소식이 없어요", "noNewsAdm": "아직 소식이 없어요. “소식 올리기”를 눌러 첫 소식을 써 보세요", "newTag": "새 소식", "until": "{0}까지", "openLink": "링크 열기", "edit": "수정", "del": "삭제", "armDel": "한 번 더 누르면 삭제돼요", "leaderLogin": "리더 로그인", "leave": "이 교회에서 나가기", "armLeave": "한 번 더 누르면 나가요", "privacy": "오늘 묵상을 마치면 교회 페이지에 이름이 보여서 함께 기뻐할 수 있어요. 메모와 기도 내용은 보내지 않아요. 이름을 숨기려면 아래에서 끌 수 있어요.", "codeLbl": "교회 코드 (리더에게 물어보세요)", "newChurch": "저는 리더예요: 교회 만들기", "newChurchD": "교회 코드를 받게 돼요. 초대 링크를 교회 가족에게 보내면 함께할 수 있어요. 소식을 올릴 때 필요하니 리더 비밀번호를 잘 보관해 주세요.", "nameLbl": "교회 이름", "pinLbl": "리더 비밀번호 (4자 이상)", "pin2Lbl": "비밀번호를 한 번 더 입력해 주세요", "keyLbl": "생성 키", "createBtn": "교회 만들기", "joined": "“{0}”에 함께하게 되었어요", "created": "교회가 만들어졌어요", "createdD": "이것이 우리 교회 코드예요. 다른 분들은 이 코드를 입력하거나 초대 링크를 눌러 함께할 수 있어요.", "inviteTxt": "“{0}”에 함께하여 321 교회생활에서 같이 묵상하고 교회 소식도 받아 보세요.\n이 링크를 눌러 주세요: {1}\n또는 앱의 나 → 나의 교회에서 이 코드를 입력해 주세요: {2}", "fromApp": "— 321 교회생활에서", "left": "이 교회에서 나왔어요", "loginD": "리더 비밀번호를 입력하면 이 휴대폰에서 소식을 올리고 관리할 수 있어요.", "login": "로그인", "loggedIn": "리더로 로그인했어요", "editT": "소식 수정", "kindLbl": "종류", "titleLbl": "제목", "bodyLbl": "내용", "linkLbl": "링크 (선택)", "imgLbl": "이미지 주소 (선택)", "untilLbl": "게시 기한 (이 날짜 이후 자동으로 숨겨져요, 선택)", "topLbl": "맨 위에 고정", "saveEdit": "저장", "publish": "올리기", "saved": "저장했어요", "published": "올렸어요. 앱을 열면 모두가 볼 수 있어요", "deleted": "삭제했어요", "wholeWeek": "한 주 전체", "planD": "모든 분의 홈 화면에 “이번 주 함께 읽어요”가 나타나요.", "weekLbl": "주차", "dayLbl": "과", "noteLbl": "모두에게 전하는 한마디 (선택)", "notePh": "예: 수요일 소그룹에서 이 말씀을 나눠요", "clearPlan": "이번 주 지우기", "leaderTools": "리더 설정", "rename": "교회 이름 바꾸기", "newPin": "새 리더 비밀번호", "changePin": "비밀번호 바꾸기", "pinChanged": "비밀번호를 바꿨어요", "logout": "이 휴대폰에서 리더 로그아웃", "loggedOut": "로그아웃했어요", "k_news": "공지", "k_meet": "모임", "k_event": "행사", "k_pray": "기도", "e_net": "교회 소식 서비스에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.", "e_gone": "교회를 더 이상 찾을 수 없어요", "e_badpin": "리더 비밀번호가 맞지 않아요", "e_locked": "여러 번 틀렸어요. 15분 후에 다시 시도해 주세요.", "e_nochurch": "이 코드의 교회를 찾을 수 없어요", "e_shortpin": "비밀번호는 4자 이상이어야 해요", "e_createkey": "교회를 만들려면 생성 키가 필요해요", "e_url": "링크와 이미지 주소는 http:// 또는 https://로 시작해야 해요", "e_nodb": "교회 소식 서비스가 아직 준비되지 않았어요", "e_code": "교회 코드를 입력해 주세요", "e_noname": "교회 이름을 입력해 주세요", "e_pin2": "비밀번호가 서로 달라요", "e_empty": "제목이나 내용을 써 주세요", "e_busy": "서버가 바빠요. 다시 시도해 주세요"}};
var CHK = ['news', 'meet', 'event', 'pray'];
var CH = { f: '', busy: 0, armDel: '', armLeave: 0, at: 0 };
function CT(k) {
var d = CHT[L()] || CHT.zh, s = d[k];
if (s == null) s = CHT.zh[k];
if (s == null) s = k;
for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]);
return s;
}
/* 教會消息自動翻譯成英文（小智 AI）：發佈時一起存英文；英文版畫面遇到沒有英文的消息就先翻來看（存在這支手機） */
var CHTR_SYS = "You translate church announcements from Chinese into natural, warm, clear English for English-speaking church members. Keep dates, times, numbers, names, URLs, line breaks and list numbering. Fixed terms: 國度321空中團契 = Kingdom 321 Online Fellowship; 主日 = Sunday service; 小組 = small group; 小家 = small group; 同工 = co-worker; 弟兄姊妹 = brothers and sisters; 代禱 = prayer request; 見證 = testimony; 晨讀 = Morning Devotion; 321理念 = the 3-2-1 ideology; 無己 = selflessness; 得勝者 = overcomer; 小智 = Sage. Quote Scripture from the World English Bible. Reply with JSON only: {\"title\":\"...\",\"body\":\"...\"} (empty string when the source part is empty). No commentary.";
function chTr(title, body, cb) {
  var done = false, fin = function (r) { if (!done) { done = true; cb(r); } };
  var ep = (typeof SVC !== 'undefined' && SVC.xz) || 'https://xiaozhi-proxy.spch321.workers.dev';
  var model = (typeof SVC !== 'undefined' && SVC.model) || 'claude-sonnet-4-6';
  ajax('POST', ep, { model: model, max_tokens: 2000, system: CHTR_SYS, messages: [{ role: 'user', content: 'TITLE:\n' + (title || '') + '\n\nBODY:\n' + (body || '') }] }, null, function (st, txt) {
    if (st !== 200) return fin(null);
    try {
      var d = JSON.parse(txt), t = '';
      if (d && d.content && d.content.length) for (var i = 0; i < d.content.length; i++) t += d.content[i].text || '';
      if (!t) t = (d && (d.reply || d.text || d.message)) || '';
      var m = /\{[\s\S]*\}/.exec(t), o = m ? JSON.parse(m[0]) : null;
      if (o && (trim(o.title || '') || trim(o.body || ''))) return fin({ title: trim(o.title || ''), body: trim(o.body || '') });
    } catch (e) { }
    fin(null);
  }, null, 60000);
}
var CHTR_BUSY = {};
function chTrKey(n) { var s = (n.title || '') + '\u0001' + (n.body || ''), h = 0; for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return (n.id || '') + ':' + h; }
function chEn(n) {
  if (L() !== 'en' || !n) return null;
  if (trim(n.title_en || '') || trim(n.body_en || '')) return { title: n.title_en || n.title || '', body: n.body_en || n.body || '' };
  if (!trim(n.title || '') && !trim(n.body || '')) return null;
  var k = chTrKey(n), c = {};
  try { c = JSON.parse(localStorage.getItem('cl321_news_tr') || '{}') || {}; } catch (e) { c = {}; }
  if (c[k]) return c[k];
  if (!CHTR_BUSY[k] && navigator.onLine !== false) {
    CHTR_BUSY[k] = 1;
    chTr(n.title, n.body, function (r) {
      if (!r) return;
      try { var c2 = JSON.parse(localStorage.getItem('cl321_news_tr') || '{}') || {}; c2[k] = r; var ks = Object.keys(c2); if (ks.length > 60) delete c2[ks[0]]; localStorage.setItem('cl321_news_tr', JSON.stringify(c2)); } catch (e) { }
      try { if (R.page && R.page.t === 'church') vChurch(); else if (typeof chPaint === 'function') chPaint(); } catch (e) { }
    });
  }
  return null;
}
function chTi(n) { var e = chEn(n); return e ? e.title : n.title; }
function chBo(n) { var e = chEn(n); return e ? e.body : n.body; }
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
if (a) { a.innerHTML = chHomeHtml(); if (S.ch) { chFetch(false, function (j) { var el = $('#chCard'); if (j && el) el.innerHTML = chHomeHtml(); }); if (window.tdFetch) tdFetch(false, function (l) { var el = $('#chCard'); if (l && el) el.innerHTML = chHomeHtml(); }); } }
if (b) {
var u = chUnread();
b.innerHTML = '<div class="card"><div class="wk" onclick="open_({t:\'church\'})"><div class="n">⛪</div><div class="grow"><b>' + esc(CT('myChurch')) + '</b><div class="xs muted">' + esc(S.ch ? S.ch.name : CT('joinHint')) + '</div></div>' + (u ? '<span class="chdot">' + u + '</span>' : '') + '</div></div>';
}
}
/* 今天完成人數：教會消息服務的計數與「今天完成」名單取大的，兩邊才不會對不上 */
function chTodayN(d) { var a = (d && d.today) || 0, b = (window.TD && TD.list && TD.day === today()) ? TD.list.length : 0; return Math.max(a, b); }
function chHomeHtml() {
if (!S.ch) {
if (S.chHide) return '';
return '<div class="card chc0"><div class="row sp"><b>⛪ ' + esc(CT('togetherT')) + '</b><button class="ib" onclick="S.chHide=1;save();chPaint()" aria-label="close">✕</button></div><p class="sm muted" style="margin:6px 0 10px">' + esc(CT('togetherD')) + '</p><button class="btn pri" onclick="open_({t:\'church\'})">' + esc(CT('joinBtn')) + '</button></div>';
}
var d = S.chData || {}, u = chUnread(), h = '<div class="card chc" onclick="open_({t:\'church\'})"><div class="row sp"><b>⛪ ' + esc(S.ch.name) + '</b>' + (u ? '<span class="chdot">' + esc(CT('newN', u)) + '</span>' : '<span class="xs muted">' + esc(CT('open')) + ' ›</span>') + '</div>';
if (d.plan) h += '<div class="chplan" onclick="event.stopPropagation();open_({t:\'lesson\',w:' + d.plan.w + ',d:' + (d.plan.d || 1) + '})"><span class="xs">' + esc(CT('planT')) + '</span><b>' + esc(chPlanTxt(d.plan)) + '</b><span class="xs">' + esc(CT('goRead')) + ' ›</span></div>';
var tdn = chTodayN(d); if (d.today != null || tdn) h += '<p class="sm" style="margin:8px 0 0">🙏 ' + esc(tdn ? CT('todayN', tdn) : CT('today0')) + '</p>';
if (window.tdHtml) h += tdHtml(true);
var ns = d.news || [];
for (var i = 0; i < ns.length && i < 2; i++) h += '<p class="sm chline">' + (ns[i].top ? '📌 ' : '') + '<span class="tag">' + esc(chKind(ns[i].kind)) + '</span> ' + esc(chTi(ns[i]) || String(chBo(ns[i]) || '').slice(0, 30)) + '</p>';
return h + '</div>';
}
function vChurch() {
if (!S.ch) return chJoinView();
setTimeout(chTdSync, 0);
var d = S.chData, adm = !!S.ch.pin;
var h = topbar(S.ch.name, true, '<button class="ib" onclick="chRefresh()" aria-label="refresh">⟳</button>');
if (!d) { setApp(h + '<div class="empty">' + esc(T('loading')) + '</div>'); return chFetch(true, function (j, e) { if (R.page && R.page.t === 'church') { if (j) vChurch(); else setApp(h + '<div class="empty">' + esc(chErr(e)) + '<br><br><button class="btn" onclick="chRefresh()">' + esc(T('retry')) + '</button></div>'); } }); }
if (CH.off) h += '<p class="xs muted c">' + esc(CT('offline')) + '</p>';
h += '<div class="card chhead"><div class="row sp"><div><p class="eyebrow" style="margin:0">' + esc(CT('myChurch')) + '</p><div class="h2" style="margin:2px 0">' + esc(d.name) + '</div><span class="xs muted">' + esc(CT('codeIs', d.code)) + '</span></div>' + (adm ? '<span class="tag">' + esc(CT('leader')) + '</span>' : '') + '</div><div class="row" style="margin-top:10px"><button class="btn grow" onclick="chInvite()">' + esc(CT('invite')) + '</button></div></div>';
h += '<div class="grid2"><div class="tile c"><div class="h2" style="color:var(--brand);margin:0">' + chTodayN(d) + '</div><span class="xs muted">' + esc(CT('todayLbl')) + '</span></div>' +
(d.plan ? '<div class="tile c" style="cursor:pointer" onclick="open_({t:\'lesson\',w:' + d.plan.w + ',d:' + (d.plan.d || 1) + '})"><span class="xs muted">' + esc(CT('planT')) + '</span><b style="color:var(--brand)">' + esc(T('wkN', d.plan.w) + (d.plan.d ? ' · ' + T('dN', d.plan.d) : '')) + '</b><span class="xs muted">' + esc(T('wt' + d.plan.w)) + '</span></div>' : '<div class="tile c"><span class="xs muted">' + esc(CT('planT')) + '</span><span class="sm muted">' + esc(CT('noPlan')) + '</span></div>') + '</div>';
if (d.plan && d.plan.note) h += '<p class="sm chnote">「' + esc(d.plan.note) + '」</p>';
if (window.tdHtml) h += '<div id="tdCard">' + tdHtml(false) + '</div>';
if (window.ccCardHtml) { ccCss(); h += '<div id="ccCard">' + ccCardHtml() + '</div>'; }
if (window.crgAskHtml) h += crgAskHtml();
if (adm && window.vChCare) h += '<div class="card cccard" onclick="CR2.list=null;CR2.err=\'\';open_({t:\'chcare\'})"><div class="row"><div class="ccic">🤝</div><div class="grow"><b>' + esc(CRs('care')) + '</b><div class="xs muted">' + esc(CRs('careD')) + '</div></div><span class="xs muted">›</span></div></div>';
if (adm) h += '<div class="row chadm"><button class="btn pri grow" onclick="chEdit(\'\')">＋ ' + esc(CT('post')) + '</button><button class="btn" onclick="chPlanEd()">' + esc(CT('setPlan')) + '</button><button class="btn" onclick="chMore()">⋯</button></div>';
var cs = '<button class="chip' + (!CH.f ? ' on' : '') + '" onclick="CH.f=\'\';vChurch()">' + esc(CT('all')) + '</button>';
eachA(CHK, function (k) { cs += '<button class="chip' + (CH.f === k ? ' on' : '') + '" onclick="CH.f=\'' + k + '\';vChurch()">' + esc(chKind(k)) + '</button>'; });
h += '<p class="eyebrow" style="margin:16px 2px 6px">' + esc(CT('newsT')) + '</p><div class="chips">' + cs + '</div>';
var ns = [], seen = S.ch.seen || 0;
eachA(d.news || [], function (n) { if (!CH.f || n.kind === CH.f) ns.push(n); });
if (!ns.length) h += '<div class="empty">' + esc(adm ? CT('noNewsAdm') : CT('noNews')) + '</div>';
eachA(ns, function (n) {
h += '<div class="card chn' + (n.ts > seen ? ' new' : '') + '"><div class="row sp"><span><span class="tag k-' + esc(n.kind) + '">' + esc(chKind(n.kind)) + '</span>' + (n.top ? ' 📌' : '') + (n.ts > seen ? ' <span class="chdot">' + esc(CT('newTag')) + '</span>' : '') + '</span><span class="xs muted">' + esc(fmtDate(n.ts)) + (n.until ? ' · ' + esc(CT('until', n.until.slice(5).replace('-', '/'))) : '') + '</span></div>' +
(chTi(n) ? '<p class="h3 chtt">' + esc(chTi(n)) + '</p>' : '') + (chBo(n) ? '<div class="sm chb">' + chLink(chBo(n)) + '</div>' : '') +
(n.img ? '<img class="chimg" src="' + esc(n.img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
'<div class="row chact">' + (n.link ? '<a class="btn" href="' + esc(n.link) + '" target="_blank" rel="noopener">' + esc(CT('openLink')) + '</a>' : '') + '<button class="btn" onclick="chShare(\'' + n.id + '\')">↗ ' + esc(T('share')) + '</button>' +
(adm ? '<button class="btn" onclick="chEdit(\'' + n.id + '\')">' + esc(CT('edit')) + '</button><button class="btn" id="chd' + n.id + '" onclick="chDel(\'' + n.id + '\')">' + esc(CT('armDel') && CH.armDel === n.id ? CT('armDel') : CT('del')) + '</button>' : '') + '</div></div>';
});
h += '<div class="row" style="margin:18px 0 6px">' + (adm ? '' : '<button class="btn grow" onclick="chLogin()">' + esc(CT('leaderLogin')) + '</button>') + '<button class="btn grow" onclick="chLeave()">' + esc(CH.armLeave ? CT('armLeave') : CT('leave')) + '</button></div>';
if (window.tdMeLine) h += tdMeLine();
if (window.crgLineHtml) h += crgLineHtml();
h += '<p class="xs muted c">' + esc(CT('privacy')) + '</p>';
setApp(h);
var mx = chMaxTs(d); if (mx > (S.ch.seen || 0)) { S.ch.seen = mx; save(); }
if (window.ccPeek) ccPeek();
if (window.crgSend) crgSend(false);
if (window.tdFetch) tdFetch(false, function (l) { var el = $('#tdCard'); if (l && el) el.innerHTML = tdHtml(false); });
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
shareText('【' + S.ch.name + '・' + chKind(n.kind) + '】' + (chTi(n) ? chTi(n) + '\n' : '') + (chBo(n) || '') + (n.link ? '\n' + n.link : '') + '\n\n' + CT('fromApp'));
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
var go = function () { chAdm('/news', { item: it }, function () { closeSheet(); toast(id ? CT('saved') : CT('published')); S.ch.seen = chMaxTs(S.chData); save(); vChurch(); }); };
var bt = document.querySelector('#sheet .btn.pri.full') || document.querySelector('.btn.pri.full');
if (bt) { bt.disabled = true; bt.textContent = L() === 'en' ? 'Translating…' : (L() === 'zs' ? '正在翻译成英文…' : '正在翻譯成英文…'); }
chTr(it.title, it.body, function (r) { if (r) { it.title_en = r.title; it.body_en = r.body; } if (bt) bt.disabled = false; go(); });
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
if (!S.ch) return; if (window.crgSend) crgSend(true); var d = today(); if (S.ch.day === d) return;
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
/* ── 教會聊天室（v1，2026-11-09）：同一個教會的家人可以聊天互動 ──
   後端：church-chat.spch321.workers.dev（church-chat-worker.js，Cloudflare D1）
   只有聊天室開著、畫面在前景時才每 6 秒抓新訊息；負責人登入後可刪除不合宜的訊息。 */
var CCURL = 'https://church-chat.spch321.workers.dev';
var CC = { msgs: [], last: 0, timer: 0, busy: 0, re: 0, err: '', unread: 0, uAt: 0, arm: 0, sel: 0 };
var CCT = {
zh: { room: '教會聊天室', roomD: '和同一個教會的弟兄姊妹聊天、分享、彼此代禱', open: '進入聊天室', newN: '{0} 則新訊息', ph: '說些什麼…', send: '送出', nickPh: '你的稱呼（大家會看到）', nickNeed: '請先填你的稱呼', empty: '還沒有人說話，來打聲招呼吧！', reply: '回覆', copy: '複製', copied: '已複製', del: '刪除', armDel: '再按一次刪除', deleted: '這則訊息已刪除', replyTo: '回覆 {0}', cancel: '取消', me: '我', today: '今天', yest: '昨天', notReady: '聊天室還沒開通，請負責人聯絡管理者開通', e_net: '連不上聊天室，請稍後再試', e_slow: '說太快了，等一下再送', e_full: '今天的訊息太多了，明天再聊', e_forbid: '只能刪除自己的訊息', e_empty: '請輸入內容', e_nochurch: '找不到這個教會', tip: '請彼此尊重、用愛心說誠實話；個人隱私與代禱細節請斟酌。負責人可以刪除不合宜的訊息。', leader: '負責人' },
zs: { room: '教会聊天室', roomD: '和同一个教会的弟兄姐妹聊天、分享、彼此代祷', open: '进入聊天室', newN: '{0} 则新消息', ph: '说些什么…', send: '送出', nickPh: '你的称呼（大家会看到）', nickNeed: '请先填你的称呼', empty: '还没有人说话，来打声招呼吧！', reply: '回复', copy: '复制', copied: '已复制', del: '删除', armDel: '再按一次删除', deleted: '这则消息已删除', replyTo: '回复 {0}', cancel: '取消', me: '我', today: '今天', yest: '昨天', notReady: '聊天室还没开通，请负责人联络管理者开通', e_net: '连不上聊天室，请稍后再试', e_slow: '说太快了，等一下再送', e_full: '今天的消息太多了，明天再聊', e_forbid: '只能删除自己的消息', e_empty: '请输入内容', e_nochurch: '找不到这个教会', tip: '请彼此尊重、用爱心说诚实话；个人隐私与代祷细节请斟酌。负责人可以删除不合宜的消息。', leader: '负责人' },
en: { room: 'Church chat', roomD: 'Chat, share and pray for one another with your church family', open: 'Open chat', newN: '{0} new', ph: 'Say something…', send: 'Send', nickPh: 'Your name (everyone will see it)', nickNeed: 'Please enter your name first', empty: 'No messages yet — say hello!', reply: 'Reply', copy: 'Copy', copied: 'Copied', del: 'Delete', armDel: 'Tap again to delete', deleted: 'This message was deleted', replyTo: 'Replying to {0}', cancel: 'Cancel', me: 'Me', today: 'Today', yest: 'Yesterday', notReady: 'The chat isn’t switched on yet. Please ask your leader to contact the administrator.', e_net: 'Can’t reach the chat. Please try again later.', e_slow: 'Too fast — wait a moment', e_full: 'Too many messages today — let’s continue tomorrow', e_forbid: 'You can only delete your own messages', e_empty: 'Please type a message', e_nochurch: 'This church can’t be found', tip: 'Be kind and speak the truth in love; take care with private matters and prayer details. Leaders can remove inappropriate messages.', leader: 'Leader' },
ko: { room: '교회 대화방', roomD: '같은 교회 형제자매와 이야기하고 나누며 서로 기도해요', open: '대화방 들어가기', newN: '새 메시지 {0}', ph: '메시지를 입력하세요…', send: '보내기', nickPh: '내 이름 (모두에게 보여요)', nickNeed: '먼저 이름을 입력해 주세요', empty: '아직 메시지가 없어요. 먼저 인사해 보세요!', reply: '답장', copy: '복사', copied: '복사했어요', del: '삭제', armDel: '한 번 더 누르면 삭제돼요', deleted: '삭제된 메시지예요', replyTo: '{0}님에게 답장', cancel: '취소', me: '나', today: '오늘', yest: '어제', notReady: '대화방이 아직 열리지 않았어요. 리더에게 관리자에게 연락해 달라고 해 주세요.', e_net: '대화방에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.', e_slow: '너무 빨라요. 잠시 후 보내 주세요', e_full: '오늘은 메시지가 너무 많아요. 내일 이어서 이야기해요', e_forbid: '내 메시지만 삭제할 수 있어요', e_empty: '내용을 입력해 주세요', e_nochurch: '교회를 찾을 수 없어요', tip: '서로 존중하고 사랑 안에서 참된 것을 말해요. 개인 정보와 기도 제목은 신중하게 나눠 주세요. 리더는 부적절한 메시지를 삭제할 수 있어요.', leader: '리더' }
};
function CCs(k, a) { var d = CCT[L()] || CCT.zh, s = d[k]; if (s == null) s = CCT.zh[k]; if (s == null) s = k; return a == null ? s : String(s).replace('{0}', a); }
function ccErr(e) { if (e === 'badpin') return CT('e_badpin'); if (e === 'http404' || e === 'nodb' || e === 'notfound') return CCs('notReady'); return CCs('e_' + e) !== 'e_' + e ? CCs('e_' + e) : CCs('e_net'); }
function ccApi(m, path, body, cb) {
ajax(m, CCURL + path, body, null, function (st, txt) {
var j = null; try { j = JSON.parse(txt); } catch (e) { j = null; }
if (j && j.ok) cb(j, ''); else cb(null, j && j.err ? j.err : (st > 0 ? 'http' + st : 'net'));
});
}
function ccSeen() { return (S.ch && S.ch.chatSeen) || 0; }
function ccMerge(list) {
var have = {}, i;
for (i = 0; i < CC.msgs.length; i++) have[CC.msgs[i].id] = i;
eachA(list || [], function (m) { if (have[m.id] != null) CC.msgs[have[m.id]] = m; else CC.msgs.push(m); if (m.id > CC.last) CC.last = m.id; });
CC.msgs.sort(function (a, b) { return a.id - b.id; });
if (CC.msgs.length > 400) CC.msgs = CC.msgs.slice(-400);
}
/* 我的教會頁的聊天室卡片：順便算未讀 */
function ccCardHtml() {
return '<div class="card cccard" onclick="open_({t:\'chchat\'})"><div class="row"><div class="ccic">💬</div><div class="grow"><b>' + esc(CCs('room')) + '</b><div class="xs muted">' + esc(CCs('roomD')) + '</div></div>' +
(CC.unread ? '<span class="chdot">' + esc(CCs('newN', CC.unread)) + '</span>' : '<span class="xs muted">' + esc(CCs('open')) + ' ›</span>') + '</div></div>';
}
function ccPeek() {
if (!S.ch || now() - CC.uAt < 60000) return;
CC.uAt = now();
ccApi('GET', '/c/' + S.ch.code + '/msgs?after=' + ccSeen() + '&dev=' + encodeURIComponent(S.ch.dev || ''), null, function (j) {
if (!j) return; var n = 0;
eachA(j.msgs, function (m) { if (!m.mine && !m.del && m.id > ccSeen()) n++; });
CC.unread = n; var el = $('#ccCard'); if (el) el.innerHTML = ccCardHtml();
});
}
function ccCss() {
if ($('#ccCss')) return;
var st = document.createElement('style'); st.id = 'ccCss';
st.textContent = '.cccard{cursor:pointer}.ccic{width:42px;height:42px;border-radius:14px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:1.3em;flex:none}' +
'.cclist{padding:4px 0 calc(var(--ccft,120px) + 12px)}.ccday{text-align:center;margin:14px 0 6px}.ccday span{font-size:.72em;color:var(--mute);background:var(--soft);border-radius:999px;padding:3px 10px}' +
'.ccm{display:flex;gap:8px;margin:8px 0;align-items:flex-end}.ccm.mine{flex-direction:row-reverse}.ccav{width:34px;height:34px;border-radius:50%;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;font-size:.9em}' +
'.ccb{max-width:76%;min-width:0}.ccn{font-size:.74em;color:var(--mute);margin:0 4px 2px}.ccm.mine .ccn{text-align:right}' +
'.cct{background:var(--card);border:1px solid var(--line);border-radius:16px;border-bottom-left-radius:5px;padding:9px 13px;white-space:pre-wrap;word-break:break-word;line-height:1.65;cursor:pointer}' +
'.ccm.mine .cct{background:var(--brand);border-color:var(--brand);color:#fff;border-bottom-left-radius:16px;border-bottom-right-radius:5px}.ccm.mine .cct a{color:#fff}' +
'.cct.gone{background:none;color:var(--mute);font-style:italic;border-style:dashed}.ccq{font-size:.8em;opacity:.8;border-left:3px solid var(--gold);padding:2px 8px;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'.cctime{font-size:.68em;color:var(--mute);margin:0 4px;white-space:nowrap;align-self:flex-end}.ccacts{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}.ccm.mine .ccacts{justify-content:flex-end}' +
'.ccacts button{border:1px solid var(--line);background:var(--card);border-radius:999px;font-size:.76em;padding:3px 10px;cursor:pointer;color:var(--ink)}' +
'.ccft{position:fixed;left:0;right:0;bottom:var(--cctb,0px);z-index:35;background:var(--card);border-top:1px solid var(--line);padding:8px 12px}.ccft .in{max-width:720px;margin:0 auto}' +
'.ccft textarea{min-height:44px;max-height:120px;height:44px;resize:none;padding:10px 12px;line-height:1.5}.ccft .row{align-items:flex-end;gap:8px}.ccft .btn{min-height:44px;flex:none}' +
'.ccre{display:flex;align-items:center;gap:8px;font-size:.8em;color:var(--brand);margin-bottom:6px}.ccre span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ccre button{border:0;background:none;color:var(--mute);cursor:pointer}' +
'.cctip{font-size:.74em;color:var(--mute);background:var(--soft);border-radius:12px;padding:8px 12px;margin:8px 0;line-height:1.6}' +
'#gxaroot{background:transparent!important;padding-bottom:0!important}' +
'.catool{flex:none;width:38px;min-height:44px;border:0;background:none;font-size:1.3em;cursor:pointer;padding:0;border-radius:10px}.ccft .row{gap:2px}.ccft textarea{margin-left:4px}' +
'.caup{font-size:.82em;color:var(--brand);background:var(--soft);border-radius:10px;padding:6px 10px;margin-bottom:6px}' +
'.carec{align-items:center;gap:8px;background:#FDECEC;border-radius:12px;padding:8px 10px;margin-bottom:6px;color:#9B2C2C}.carec .dot{flex:none;width:10px;height:10px;border-radius:50%;background:#D23B3B;animation:caBlink 1s infinite}.carec .btn.sm{min-height:0;padding:6px 12px}@keyframes caBlink{50%{opacity:.25}}' +
'.castkp{grid-template-columns:repeat(4,1fr);gap:8px;max-height:min(44vh,330px);overflow:auto;padding:4px 0 8px}.castkp button{border:0;background:none;padding:0;cursor:pointer}.castkp .castk{width:100%;height:auto;aspect-ratio:1}.castkp .castk .e{font-size:1.8em}.castkp .castk b{font-size:.72em}' +
'.castk{width:124px;height:124px;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 3px 10px rgba(0,0,0,.12);text-align:center;padding:6px}.castk .e{font-size:2.6em;line-height:1}.castk b{font-size:.92em;line-height:1.25}' +
'.caimg{display:block;max-width:min(240px,100%);max-height:320px;border-radius:14px;border:1px solid var(--line);cursor:zoom-in;background:var(--soft);object-fit:cover}' +
'.cafile{display:flex!important;align-items:center;gap:10px;text-decoration:none;color:inherit;flex-wrap:wrap}.cafile .fi{font-size:1.7em}.cafile .fn{display:flex;flex-direction:column;min-width:0}.cafile .fn b{word-break:break-all}.cafile small{opacity:.75;font-size:.78em}' +
'.cavoice audio{display:block;width:230px;max-width:100%;height:40px}.cavoice small{display:block;font-size:.74em;opacity:.8;margin-top:2px}.ccm.mine .cavoice{background:var(--card);color:var(--ink);border-color:var(--line)}' +
'.camore{border:0;background:none;color:var(--mute);font-size:1.2em;line-height:1;padding:0 4px;cursor:pointer;display:block;margin:0 auto 2px}' +
'.caview{position:fixed;inset:0;z-index:96;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px}.caview img{max-width:100%;max-height:80vh;object-fit:contain;border-radius:8px}.caview .bar{display:flex;gap:10px;margin-top:14px}';
document.head.appendChild(st);
}
var CCCOL = ['#1F3C88', '#5E8A35', '#A8572E', '#6C4BA3', '#2E7D8C', '#B8473E', '#8A6510', '#3A74B0'];
function ccCol(w) { var n = parseInt(String(w || '0').slice(0, 6), 16) || 0; return CCCOL[n % CCCOL.length]; }
function ccTime(ts) { var d = new Date(ts); return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
function ccDay(ts) {
var d = new Date(ts), t = new Date(), y = new Date(t.getTime() - 864e5);
var same = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
if (same(d, t)) return CCs('today'); if (same(d, y)) return CCs('yest');
return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}
function ccFind(id) { for (var i = 0; i < CC.msgs.length; i++) if (CC.msgs[i].id === id) return CC.msgs[i]; return null; }
function ccListHtml() {
if (!CC.msgs.length) return '<div class="empty">' + esc(CC.err ? ccErr(CC.err) : CCs('empty')) + '</div>';
var h = '', lastDay = '';
eachA(CC.msgs, function (m) {
var day = ccDay(m.ts); if (day !== lastDay) { h += '<div class="ccday"><span>' + esc(day) + '</span></div>'; lastDay = day; }
var q = m.re ? ccFind(m.re) : null, sel = CC.sel === m.id, adm = !!(S.ch && S.ch.pin);
h += '<div class="ccm' + (m.mine ? ' mine' : '') + '" id="ccm' + m.id + '">' +
(m.mine ? '' : '<div class="ccav" style="background:' + ccCol(m.who) + '">' + esc(String(m.nick || '?').slice(0, 1)) + '</div>') +
'<div class="ccb">' + (m.mine ? '' : '<div class="ccn">' + esc(m.nick) + '</div>') +
(m.del ? '<div class="cct gone">' + esc(CCs('deleted')) + '</div>' :
(m.kind ? caHtml(m, q) : '<div class="cct" onclick="ccTap(' + m.id + ')">' + (q ? '<div class="ccq">' + esc((q.mine ? CCs('me') : q.nick) + '：' + (q.del ? CCs('deleted') : q.text)) + '</div>' : '') + chLink(m.text) + '</div>')) +
(sel && !m.del ? '<div class="ccacts"><button onclick="ccReply(' + m.id + ')">↩ ' + esc(CCs('reply')) + '</button><button onclick="ccCopy(' + m.id + ')">' + esc(CCs('copy')) + '</button>' +
(!m.mine && m.who && window.XJ321 ? '<button onclick="ccDm(\'' + esc(m.who) + '\',' + m.id + ')">✉️ ' + esc(CA('私訊', '私信', 'Message', '개인 메시지')) + '</button>' : '') +
((m.mine || adm) ? '<button onclick="ccDel(' + m.id + ')">' + esc(CC.arm === m.id ? CCs('armDel') : CCs('del')) + '</button>' : '') + '</div>' : '') +
'</div><div class="cctime">' + (m.kind && !m.del ? '<button class="camore" onclick="ccTap(' + m.id + ')" aria-label="more">⋯</button>' : '') + ccTime(m.ts) + '</div></div>';
});
return h;
}
function ccPaint(stick) {
var box = $('#ccList'); if (!box) return;
var nearEnd = stick || (window.innerHeight + window.scrollY >= document.body.scrollHeight - 160);
box.innerHTML = ccListHtml();
if (nearEnd) window.scrollTo(0, document.body.scrollHeight);
var mx = CC.last; if (S.ch && mx > ccSeen()) { S.ch.chatSeen = mx; CC.unread = 0; save(); }
}
function ccFit() {
var tb = $('#tabbar'), ft = $('#ccFt');
var h = tb && tb.style.display !== 'none' ? tb.getBoundingClientRect().height : 0;
document.documentElement.style.setProperty('--cctb', h + 'px');
if (ft) document.documentElement.style.setProperty('--ccft', (ft.getBoundingClientRect().height + h) + 'px');
}
function vChChat() {
if (!S.ch) return back();
ccCss();
var h = topbar(S.ch.name + ' · ' + CCs('room'), true, (window.XJ321 ? '<button class="ib" onclick="ccInbox()" aria-label="private messages">✉️</button>' : '') + '<button class="ib" onclick="ccPull(1)" aria-label="refresh">⟳</button>');
h += '<div class="cctip">' + esc(CCs('tip')) + '</div><div class="cclist" id="ccList"></div>';
var q = CC.re ? ccFind(CC.re) : null;
h += '<div class="ccft" id="ccFt"><div class="in">' +
(trim(S.name) ? '' : '<input type="text" id="ccNick" maxlength="20" placeholder="' + esc(CCs('nickPh')) + '" style="margin-bottom:6px;min-height:40px">') +
(q ? '<div class="ccre"><span>↩ ' + esc(CCs('replyTo', q.mine ? CCs('me') : q.nick)) + '：' + esc(q.text) + '</span><button onclick="CC.re=0;vChChat()">✕ ' + esc(CCs('cancel')) + '</button></div>' : '') +
caPanel() + '<div class="caup" id="caUp" style="display:none"></div>' +
'<div class="carec" id="caRec" style="display:none"><span class="dot"></span><b>' + esc(CA('錄音中', '录音中', 'Recording', '녹음 중')) + '</b><span id="caRecT">0:00</span><span class="grow"></span><button class="btn sm" onclick="caRecStop(1)">' + esc(CCs('cancel')) + '</button><button class="btn pri sm" onclick="caRecStop(0)">' + esc(CCs('send')) + '</button></div>' +
'<input type="file" id="caPhoto" accept="image/*" style="display:none" onchange="caPickPhoto(this)"><input type="file" id="caFile" style="display:none" onchange="caPickFile(this)">' +
'<div class="row"><button class="catool" onclick="$(\'#caFile\').click()" aria-label="file">📎</button><button class="catool" onclick="caRecStart()" aria-label="voice">🎤</button><button class="catool" onclick="caStkToggle()" aria-label="sticker">😊</button><textarea id="ccIn" maxlength="600" placeholder="' + esc(CCs('ph')) + '" oninput="ccGrow(this)"></textarea><button class="btn pri" id="ccSend" onclick="ccSend()">' + esc(CCs('send')) + '</button></div></div></div>';
var draft = $('#ccIn') ? $('#ccIn').value : (CC.draft || '');
setApp(h);
var fab = $('#fab'); if (fab) fab.style.display = 'none';
var ta = $('#ccIn'); if (ta && draft) { ta.value = draft; ccGrow(ta); }
ccFit(); ccPaint(true);
ccPull(CC.msgs.length ? 0 : 1);
clearInterval(CC.timer);
CC.timer = setInterval(function () {
if (!(R.page && R.page.t === 'chchat')) { clearInterval(CC.timer); CC.timer = 0; var f = $('#fab'); if (f) f.style.display = ''; if (CR3.rec) caRecStop(1); return; }
if (!document.hidden) ccPull(0);
}, 6000);
}
function ccGrow(ta) { CC.draft = ta.value; ta.style.height = '44px'; ta.style.height = Math.min(120, ta.scrollHeight + 2) + 'px'; ccFit(); }
function ccPull(full) {
if (!S.ch || CC.busy) return;
CC.busy = 1;
var after = full ? 0 : CC.last;
ccApi('GET', '/c/' + S.ch.code + '/msgs?after=' + after + '&dev=' + encodeURIComponent(S.ch.dev || ''), null, function (j, e) {
CC.busy = 0;
if (!j) { CC.err = e; if (!CC.msgs.length || full) ccPaint(); if (full) toast(ccErr(e)); return; }
CC.err = '';
if (full) { CC.msgs = []; CC.last = 0; }
var before = CC.last; ccMerge(j.msgs);
if (full || CC.last !== before) ccPaint(full);
});
}
/* 私訊（church-chat v6）：借用小家聊天室的介面，代碼是教會代碼，只有兩個人看得到 */
function ccDm(who, id) { var m = ccFind(id); if (!m || !window.XJ321) return; CC.sel = 0; XJ321.dm(S.ch.code, S.ch.name, who, m.nick); }
function ccInbox() { if (window.XJ321) XJ321.inbox(S.ch.code, S.ch.name); }
function ccTap(id) { CC.sel = CC.sel === id ? 0 : id; CC.arm = 0; ccPaint(); }
function ccReply(id) { CC.re = id; CC.sel = 0; vChChat(); var ta = $('#ccIn'); if (ta) ta.focus(); }
function ccCopy(id) {
var m = ccFind(id); if (!m) return;
try { navigator.clipboard.writeText(m.text).then(function () { toast(CCs('copied')); }, function () { toast(m.text); }); } catch (e) { toast(m.text); }
CC.sel = 0; ccPaint();
}
function ccDel(id) {
if (CC.arm !== id) { CC.arm = id; ccPaint(); return; }
CC.arm = 0;
ccApi('POST', '/c/' + S.ch.code + '/del', { id: id, dev: S.ch.dev, pin: S.ch.pin || '' }, function (j, e) {
if (!j) return toast(ccErr(e));
var m = ccFind(id); if (m) { m.del = 1; m.text = ''; }
CC.sel = 0; ccPaint(); toast(CT('deleted'));
});
}
function ccNeedNick() {
var nk = $('#ccNick');
if (nk) { var n = trim(nk.value || ''); if (!n) { toast(CCs('nickNeed')); nk.focus(); return true; } S.name = n.slice(0, 20); save(); }
return false;
}
function ccPost(body, done) {
if (CC.sending) return; CC.sending = 1;
var btn = $('#ccSend'); if (btn) btn.disabled = true;
if (!S.ch.dev) S.ch.dev = uid();
body.dev = S.ch.dev; body.nick = trim(S.name); body.re = CC.re || 0; body.after = CC.last;
ccApi('POST', '/c/' + S.ch.code + '/send', body, function (j, e) {
CC.sending = 0; var b = $('#ccSend'); if (b) b.disabled = false;
var up = $('#caUp'); if (up) up.style.display = 'none';
if (!j && (e === 'slow' || e === 'http429') && !body._r) { body._r = 1; setTimeout(function () { ccPost(body, done); }, 1700); return; }
if (!j) return toast(ccErr(e));
var hadRe = CC.re, hadNick = !!$('#ccNick'); CC.re = 0;
if (done) done();
ccMerge(j.msgs);
if (hadNick || hadRe) { vChChat(); return; }
ccPaint(true);
});
}
function ccSend() {
if (ccNeedNick()) return;
var ta = $('#ccIn'), text = trim(ta ? ta.value : ''); if (!text) return toast(CCs('e_empty'));
ccPost({ text: text }, function () { CC.draft = ''; var t2 = $('#ccIn'); if (t2) { t2.value = ''; ccGrow(t2); } });
}
/* ── 聊天室：相片、檔案、貼圖、語音（v2，2026-11-09；後端 church-chat v4） ── */
function CA(zh, zs, en, ko) { var l = L(); return l === 'en' ? en : l === 'zs' ? zs : l === 'ko' ? (ko || en) : zh; }
var CA_STK = [
['amen', '🙏', '阿們', '阿们', 'Amen', '아멘', '#F6E7B4', '#7A5800'], ['halle', '🙌', '哈利路亞', '哈利路亚', 'Hallelujah', '할렐루야', '#FFE1C6', '#A4481A'],
['thanks', '💐', '感謝主', '感谢主', 'Thank the Lord', '주님 감사해요', '#FBE4E9', '#A33A55'], ['pray', '🕊️', '為你禱告', '为你祷告', 'Praying for you', '기도할게요', '#E1EBF7', '#2F5C93'],
['love', '❤️', '愛你', '爱你', 'Love you', '사랑해요', '#FBE0E0', '#B33535'], ['peace', '🌿', '平安', '平安', 'Peace', '평안', '#E3F0E1', '#356B32'],
['cheer', '💪', '加油', '加油', 'Keep going', '힘내요', '#FFF0C8', '#8A5A10'], ['praise', '🎶', '讚美主', '赞美主', 'Praise the Lord', '주님 찬양', '#ECE3F5', '#6C3F8A'],
['good', '👍', '好棒', '好棒', 'Well done', '잘했어요', '#DDF3F0', '#1C6E63'], ['hug', '🤗', '抱抱', '抱抱', 'Hugs', '안아줄게요', '#FDE8D8', '#9A4E28'],
['morning', '🌅', '早安', '早安', 'Good morning', '좋은 아침', '#FFF3D6', '#94621A'], ['night', '🌙', '晚安', '晚安', 'Good night', '잘 자요', '#E2E5F5', '#3A4A8C'],
['welcome', '🎉', '歡迎', '欢迎', 'Welcome', '환영해요', '#FCE7F0', '#A3346E'], ['bible', '📖', '讀經去', '读经去', 'Time for the Word', '말씀 읽어요', '#E7EDF6', '#1F3C88'],
['withyou', '✝️', '主與你同在', '主与你同在', 'The Lord is with you', '주님이 함께하세요', '#F3ECDC', '#6E5019'], ['sorry', '🥺', '對不起', '对不起', 'Sorry', '미안해요', '#EDEDED', '#4A4A4A']
];
var CR3 = { rec: null, chunks: [], t0: 0, timer: 0, cancel: 0, stk: 0 };
function caStkFind(k) { for (var i = 0; i < CA_STK.length; i++) if (CA_STK[i][0] === k) return CA_STK[i]; return null; }
function caStkHtml(k) { var s = caStkFind(k); if (!s) return '<div class="cct">[' + esc(CA('貼圖', '贴图', 'Sticker', '스티커')) + ']</div>'; return '<div class="castk" style="background:' + s[6] + ';color:' + s[7] + '"><span class="e">' + s[1] + '</span><b>' + esc(CA(s[2], s[3], s[4], s[5])) + '</b></div>'; }
function caUrl(id) { return CCURL + '/c/' + S.ch.code + '/att/' + id; }
function caSize(n) { n = +n || 0; return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function caDur(n) { n = Math.round(+n || 0); return Math.floor(n / 60) + ':' + ('0' + (n % 60)).slice(-2); }
function caHtml(m, q) {
var mt = m.meta || {}, qh = q ? '<div class="ccq">' + esc((q.mine ? CCs('me') : q.nick) + '：' + (q.del ? CCs('deleted') : q.text)) + '</div>' : '';
var qb = qh ? '<div class="cct">' + qh + '</div>' : '';
if (m.kind === 'stk') return qb + caStkHtml(mt.stk);
if (m.kind === 'img' && m.att) return qb + '<img class="caimg" src="' + esc(caUrl(m.att)) + '" alt="photo" loading="lazy" onclick="caView(' + m.att + ')"' + (mt.w && mt.h ? ' style="aspect-ratio:' + mt.w + '/' + mt.h + '"' : '') + '>';
if (m.kind === 'voice' && m.att) return '<div class="cct cavoice">' + qh + '<audio controls preload="none" src="' + esc(caUrl(m.att)) + '"></audio>' + (mt.dur ? '<small>🎤 ' + caDur(mt.dur) + '</small>' : '') + '</div>';
if (m.att) return '<a class="cct cafile" href="' + esc(caUrl(m.att)) + '" target="_blank" rel="noopener" download="' + esc(mt.name || 'file') + '">' + qh + '<span class="fi">📄</span><span class="fn"><b>' + esc(mt.name || 'file') + '</b><small>' + esc(caSize(mt.size)) + ' · ' + esc(CA('點一下下載', '点一下下载', 'Tap to download', '눌러서 다운로드')) + '</small></span></a>';
return '<div class="cct">' + chLink(m.text) + '</div>';
}
function caView(id) {
var old = $('#caView'); if (old) old.parentNode.removeChild(old);
var u = caUrl(id), el = document.createElement('div'); el.id = 'caView'; el.className = 'caview';
el.innerHTML = '<img src="' + esc(u) + '" alt=""><div class="bar"><a class="btn sm" href="' + esc(u) + '" target="_blank" rel="noopener" download>' + esc(CA('下載／另存', '下载／另存', 'Download', '다운로드')) + '</a><button class="btn sm" onclick="var v=document.getElementById(\'caView\');v.parentNode.removeChild(v)">' + esc(CA('關閉', '关闭', 'Close', '닫기')) + '</button></div>';
el.onclick = function (e) { if (e.target === el || e.target.tagName === 'IMG') el.parentNode.removeChild(el); };
document.body.appendChild(el);
}
function caPanel() {
var h = '<div class="castkp" id="caStk" style="display:' + (CR3.stk ? 'grid' : 'none') + '">';
eachA(CA_STK, function (s) { h += '<button onclick="caSendStk(\'' + s[0] + '\')">' + caStkHtml(s[0]) + '</button>'; });
return h + '</div>';
}
function caStkToggle() { CR3.stk = CR3.stk ? 0 : 1; var p = $('#caStk'); if (p) p.style.display = CR3.stk ? 'grid' : 'none'; ccFit(); }
function caSendStk(k) { if (ccNeedNick()) return; var s = caStkFind(k); if (!s) return; CR3.stk = 0; var p = $('#caStk'); if (p) p.style.display = 'none'; ccPost({ kind: 'stk', stk: k, text: '[貼圖] ' + s[2] }); }
function caUp(t) { var u = $('#caUp'); if (u) { u.textContent = t; u.style.display = t ? 'block' : 'none'; ccFit(); } }
function caRead(file, cb) { var r = new FileReader(); r.onload = function () { cb(String(r.result || '')); }; r.onerror = function () { cb(''); }; r.readAsDataURL(file); }
function caErr(e) { if (e === 'toobig' || e === 'http413') return CA('檔案太大，上限 5MB', '文件太大，上限 5MB', 'File too large — 5 MB maximum', '파일이 너무 커요 (최대 5MB)'); if (e === 'attfull') return CA('今天傳的相片和檔案太多了，明天再傳', '今天传的照片和文件太多了，明天再传', 'Too many files today — try tomorrow', '오늘은 파일이 너무 많아요'); return ccErr(e); }
function caImg(file, cb) {
if (/gif$/i.test(file.type) && file.size <= 4.5 * 1048576) { caRead(file, function (d) { cb(d ? { data: d, mime: 'image/gif', name: file.name || 'photo.gif', w: 0, h: 0 } : null); }); return; }
var url; try { url = URL.createObjectURL(file); } catch (e) { cb(null); return; }
var im = new Image();
im.onload = function () {
var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, 1600 / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), chh = Math.max(1, Math.round(h * k));
var cv = document.createElement('canvas'); cv.width = cw; cv.height = chh; var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, chh); g.drawImage(im, 0, 0, cw, chh);
var q = 0.82, d = cv.toDataURL('image/jpeg', q); while (d.length * 0.75 > 4.5 * 1048576 && q > 0.4) { q -= 0.15; d = cv.toDataURL('image/jpeg', q); }
try { URL.revokeObjectURL(url); } catch (e) { }
cb({ data: d, mime: 'image/jpeg', name: (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', w: cw, h: chh });
};
im.onerror = function () { try { URL.revokeObjectURL(url); } catch (e) { } cb(null); };
im.src = url;
}
function caPickPhoto(inp) {
var f = inp.files && inp.files[0]; inp.value = ''; if (!f || ccNeedNick()) return;
caUp(CA('相片處理中…', '照片处理中…', 'Preparing photo…', '사진 준비 중…'));
caImg(f, function (r) {
if (!r) { caUp(''); return toast(CA('這張相片讀不出來，請換一張', '这张照片读不出来，请换一张', 'Couldn’t read this photo', '사진을 읽을 수 없어요')); }
caUp(CA('相片上傳中…', '照片上传中…', 'Uploading photo…', '사진 올리는 중…'));
ccPost({ kind: 'img', data: r.data, mime: r.mime, name: r.name, w: r.w, h: r.h, text: '' });
});
}
function caPickFile(inp) {
var f = inp.files && inp.files[0]; inp.value = ''; if (!f || ccNeedNick()) return;
var img = /^image\/(jpeg|png|webp|gif)$/i.test(f.type);
if ((/^image\//i.test(f.type) && !/svg/i.test(f.type) && (f.size > 1.5 * 1048576 || !img)) || /\.(heic|heif)$/i.test(f.name || '')) { caPickPhoto({ files: [f], value: '' }); return; }
if (f.size > 5 * 1048576) return toast(caErr('toobig'));
caUp(CA('檔案上傳中…', '文件上传中…', 'Uploading file…', '파일 올리는 중…') + ' ' + caSize(f.size));
caRead(f, function (d) {
if (!d) { caUp(''); return; }
ccPost({ kind: img ? 'img' : 'file', data: d, mime: f.type || 'application/octet-stream', name: f.name || 'file', text: '' });
});
}
function caRecMime() { var Lm = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']; try { for (var i = 0; i < Lm.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(Lm[i])) return Lm[i]; } catch (e) { } return ''; }
function caRecBar(on) { var b = $('#caRec'); if (b) { b.style.display = on ? 'flex' : 'none'; ccFit(); } }
function caRecStart() {
if (CR3.rec || ccNeedNick()) return;
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) return toast(CA('這支手機的瀏覽器不支援錄音', '这部手机的浏览器不支持录音', 'Recording isn’t supported in this browser', '이 브라우저는 녹음을 지원하지 않아요'));
navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (st) {
var mt = caRecMime(), r;
try { r = mt ? new MediaRecorder(st, { mimeType: mt, audioBitsPerSecond: 48000 }) : new MediaRecorder(st); } catch (e) { r = new MediaRecorder(st); }
CR3.rec = r; CR3.chunks = []; CR3.cancel = 0; CR3.t0 = now();
r.ondataavailable = function (e) { if (e.data && e.data.size) CR3.chunks.push(e.data); };
r.onstop = function () {
var dur = Math.round((now() - CR3.t0) / 1000), type = (r.mimeType || mt || 'audio/webm').split(';')[0];
try { st.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { }
clearInterval(CR3.timer); CR3.rec = null; caRecBar(0);
if (CR3.cancel || !CR3.chunks.length) return;
if (dur < 1) return toast(CA('錄音太短了', '录音太短了', 'Too short', '너무 짧아요'));
var blob = new Blob(CR3.chunks, { type: type });
if (blob.size > 5 * 1048576) return toast(caErr('toobig'));
caUp(CA('語音上傳中…', '语音上传中…', 'Uploading voice…', '음성 올리는 중…'));
caRead(blob, function (d) { if (!d) { caUp(''); return; } ccPost({ kind: 'voice', data: d, mime: type, name: 'voice.' + (/mp4|aac|m4a/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm'), dur: dur, text: '' }); });
};
r.start(1000);
CR3.timer = setInterval(function () { var s2 = Math.floor((now() - CR3.t0) / 1000), el = $('#caRecT'); if (el) el.textContent = caDur(s2); if (s2 >= 180) caRecStop(0); }, 250);
caRecBar(1);
try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { }
})['catch'](function () { toast(CA('沒有取得麥克風權限，請在瀏覽器設定允許使用麥克風', '没有取得麦克风权限，请在浏览器设置允许使用麦克风', 'Microphone permission was not granted', '마이크 권한이 필요해요')); });
}
function caRecStop(cancel) { if (!CR3.rec) return; CR3.cancel = cancel ? 1 : 0; try { CR3.rec.stop(); } catch (e) { caRecBar(0); } }
try { ccCss(); } catch (e) { }

/* ── 關懷名單（v1，2026-11-09）：弟兄姊妹同意後分享靈修進度，負責人看得到誰完成、誰需要關懷 ──
   後端同 church-chat Worker（/prog、/roster）。不同意就不送任何名字；關掉分享，伺服器整筆刪除。 */
var CR2 = { list: null, err: '', f: 'all', at: 0, busy: 0 };
var CRT = {
zh: { askT: '讓負責人知道你的靈修進度？', askD: '負責人可以看到你的稱呼、最近一次完成靈修的日期、完成堂數和本週進度，方便為你禱告、關心你。不會送出筆記、畫線或禱告內容，隨時可以關閉。', yes: '好，分享給負責人', no: '先不要', shareOn: '已分享靈修進度給負責人', shareOff: '沒有分享靈修進度給負責人', turnOn: '開啟分享', turnOff: '關閉分享', offDone: '已關閉分享，伺服器上的進度已刪除', onDone: '已分享，謝謝你讓大家彼此看顧', care: '關懷名單', careD: '同意分享進度的弟兄姊妹', f_all: '全部', f_need: '需要關懷', f_week: '本週完成', today: '今天完成', daysAgo: '{0} 天前完成', never: '還沒有完成紀錄', total: '共 {0} 堂', d7: '近 7 天 {0} 天', week: '本週 {0}', weekDone: '本週已完成', weekNot: '本週還沒讀', careBtn: '關懷', careTxt: '{0}平安！這幾天想起你，為你禱告。最近好嗎？有什麼需要代禱的，隨時跟我說。願主親自陪伴你，我們一起繼續讀下去。', copied: '已複製關懷話語，可以貼到 LINE 私訊', shared: '{0} 位分享進度', none: '還沒有人分享進度。可以在聚會或聊天室邀請大家到「我的教會」按「好，分享給負責人」。', note: '只顯示同意分享的人；沒出現在名單上的人，可能只是沒有開啟分享。關懷時請私下聯絡，不要在聊天室點名。', needLogin: '請先用負責人身分登入', upd: '更新於 {0}' },
zs: { askT: '让负责人知道你的灵修进度？', askD: '负责人可以看到你的称呼、最近一次完成灵修的日期、完成堂数和本周进度，方便为你祷告、关心你。不会送出笔记、画线或祷告内容，随时可以关闭。', yes: '好，分享给负责人', no: '先不要', shareOn: '已分享灵修进度给负责人', shareOff: '没有分享灵修进度给负责人', turnOn: '开启分享', turnOff: '关闭分享', offDone: '已关闭分享，服务器上的进度已删除', onDone: '已分享，谢谢你让大家彼此看顾', care: '关怀名单', careD: '同意分享进度的弟兄姐妹', f_all: '全部', f_need: '需要关怀', f_week: '本周完成', today: '今天完成', daysAgo: '{0} 天前完成', never: '还没有完成纪录', total: '共 {0} 堂', d7: '近 7 天 {0} 天', week: '本周 {0}', weekDone: '本周已完成', weekNot: '本周还没读', careBtn: '关怀', careTxt: '{0}平安！这几天想起你，为你祷告。最近好吗？有什么需要代祷的，随时跟我说。愿主亲自陪伴你，我们一起继续读下去。', copied: '已复制关怀话语，可以贴到微信或 LINE 私讯', shared: '{0} 位分享进度', none: '还没有人分享进度。可以在聚会或聊天室邀请大家到「我的教会」按「好，分享给负责人」。', note: '只显示同意分享的人；没出现在名单上的人，可能只是没有开启分享。关怀时请私下联络，不要在聊天室点名。', needLogin: '请先用负责人身分登入', upd: '更新于 {0}' },
en: { askT: 'Let your leader see your devotion progress?', askD: 'Your leader will see your name, the date you last finished a devotion, how many lessons you’ve done and this week’s progress — so they can pray for you and check in. Your notes, highlights and prayers are never sent. You can turn this off anytime.', yes: 'Yes, share with my leader', no: 'Not now', shareOn: 'Sharing your progress with your leader', shareOff: 'Not sharing your progress with your leader', turnOn: 'Turn on', turnOff: 'Turn off', offDone: 'Sharing turned off — your progress was deleted from the server', onDone: 'Shared — thank you for letting us care for one another', care: 'Care list', careD: 'Members who chose to share their progress', f_all: 'All', f_need: 'Need care', f_week: 'Done this week', today: 'Finished today', daysAgo: 'Finished {0} days ago', never: 'No devotion finished yet', total: '{0} lessons', d7: '{0} of last 7 days', week: 'This week {0}', weekDone: 'This week done', weekNot: 'This week not yet', careBtn: 'Reach out', careTxt: 'Hi {0}, peace to you! I’ve been thinking of you and praying for you. How are you doing? If there’s anything I can pray about, just tell me. May the Lord be close to you — let’s keep reading together.', copied: 'Message copied — paste it into a private chat', shared: '{0} sharing progress', none: 'No one is sharing progress yet. Invite everyone to tap “Yes, share with my leader” under My Church.', note: 'Only members who chose to share appear here; someone missing may simply not have turned sharing on. Please reach out privately — don’t name people in the group chat.', needLogin: 'Please sign in as leader first', upd: 'Updated {0}' },
ko: { askT: '리더에게 묵상 진도를 알려 줄까요?', askD: '리더가 내 이름, 마지막으로 묵상을 마친 날짜, 마친 과 수, 이번 주 진도를 볼 수 있어서 나를 위해 기도하고 돌볼 수 있어요. 메모, 밑줄, 기도 내용은 보내지 않아요. 언제든 끌 수 있어요.', yes: '네, 리더에게 공유할게요', no: '나중에', shareOn: '리더에게 묵상 진도를 공유하고 있어요', shareOff: '리더에게 묵상 진도를 공유하지 않아요', turnOn: '공유 켜기', turnOff: '공유 끄기', offDone: '공유를 껐어요. 서버의 진도 기록을 삭제했어요', onDone: '공유했어요. 서로 돌보게 해 주셔서 고마워요', care: '돌봄 명단', careD: '진도 공유에 동의한 형제자매', f_all: '전체', f_need: '돌봄 필요', f_week: '이번 주 완료', today: '오늘 완료', daysAgo: '{0}일 전 완료', never: '아직 완료 기록이 없어요', total: '총 {0}과', d7: '최근 7일 중 {0}일', week: '이번 주 {0}', weekDone: '이번 주 완료', weekNot: '이번 주 아직', careBtn: '돌보기', careTxt: '{0}님, 평안하세요! 요즘 생각나서 기도하고 있어요. 잘 지내세요? 기도 제목이 있으면 언제든 말해 주세요. 주님이 함께하시길 바라요. 우리 계속 같이 읽어요.', copied: '돌봄 메시지를 복사했어요. 개인 메시지에 붙여 넣으세요', shared: '{0}명 공유 중', none: '아직 진도를 공유한 사람이 없어요. 모임이나 대화방에서 “나의 교회”에서 공유를 눌러 달라고 초대해 보세요.', note: '공유에 동의한 사람만 보여요. 명단에 없는 사람은 공유를 켜지 않았을 수도 있어요. 돌볼 때는 개인적으로 연락하고, 대화방에서 이름을 부르지 마세요.', needLogin: '먼저 리더로 로그인해 주세요', upd: '{0} 업데이트' }
};
function CRs(k, a) { var d = CRT[L()] || CRT.zh, s = d[k]; if (s == null) s = CRT.zh[k]; if (s == null) s = k; return a == null ? s : String(s).replace('{0}', a); }
function crgProg() {
var last = 0, days = {}, t7 = now() - 7 * 864e5;
each(S.done, function (k, v) { var ts = +v || 0; if (ts > last) last = ts; if (ts > t7) days[new Date(ts).toDateString()] = 1; });
var d7 = 0; each(days, function () { d7++; });
var p = (S.chData && S.chData.plan) || null, pn = 0;
if (p) pn = p.d ? (S.done[lid(p.w, p.d)] ? 1 : 0) : weekDone(p.w);
return { total: totalDone(), last: last, d7: d7, pw: p ? p.w : 0, pd: p ? (p.d || 0) : 0, pn: pn };
}
function crgSend(force, cb) {
if (!S.ch || S.ch.share !== 1) return cb && cb();
if (!force && S.ch.shAt && now() - S.ch.shAt < 6 * 3600e3) return cb && cb();
if (!S.ch.dev) S.ch.dev = uid();
var g = crgProg(); g.dev = S.ch.dev; g.nick = trim(S.name); g.share = 1;
ccApi('POST', '/c/' + S.ch.code + '/prog', g, function (j, e) { if (j) { S.ch.shAt = now(); save(); } if (cb) cb(j, e); });
}
function crgSet(on) {
var nk = $('#crgNick');
if (on && nk) { var n = trim(nk.value || ''); if (!n) { toast(CCs('nickNeed')); nk.focus(); return; } S.name = n.slice(0, 20); }
if (on) {
S.ch.share = 1; S.ch.shAt = 0; save();
crgSend(true, function (j, e) { if (j) toast(CRs('onDone')); else { toast(ccErr(e)); } if (R.page && R.page.t === 'church') vChurch(); });
} else if (S.ch.share === 1) {
S.ch.share = 0; save();
ccApi('POST', '/c/' + S.ch.code + '/prog', { dev: S.ch.dev, share: 0 }, function (j, e) { toast(j ? CRs('offDone') : ccErr(e)); });
if (R.page && R.page.t === 'church') vChurch();
} else { S.ch.share = 0; save(); if (R.page && R.page.t === 'church') vChurch(); }
}
function crgAskHtml() {
if (!S.ch || S.ch.share === 1 || S.ch.share === 0) return '';
return '<div class="card crgask"><b>🤝 ' + esc(CRs('askT')) + '</b><p class="sm muted" style="margin:6px 0 10px">' + esc(CRs('askD')) + '</p>' +
(trim(S.name) ? '' : '<input type="text" id="crgNick" maxlength="20" placeholder="' + esc(CCs('nickPh')) + '" style="margin-bottom:8px">') +
'<div class="row"><button class="btn pri grow" onclick="crgSet(1)">' + esc(CRs('yes')) + '</button><button class="btn" onclick="crgSet(0)">' + esc(CRs('no')) + '</button></div></div>';
}
function crgLineHtml() {
if (!S.ch || (S.ch.share !== 1 && S.ch.share !== 0)) return '';
var on = S.ch.share === 1;
return '<div class="row crgline"><span class="xs muted grow">' + (on ? '🤝 ' : '') + esc(on ? CRs('shareOn') : CRs('shareOff')) + '</span><button class="btn sm" onclick="crgSet(' + (on ? 0 : 1) + ')">' + esc(on ? CRs('turnOff') : CRs('turnOn')) + '</button></div>';
}
function crgDays(ts) { if (!ts) return -1; var a = new Date(ts), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5); }
function crgLevel(m) { var d = crgDays(m.last); if (d < 0) return 3; if (d === 0) return 0; if (d <= 2) return 1; if (d <= 6) return 2; return 3; }
function vChCare() {
if (!S.ch) return back();
ccCss();
var h = topbar(CRs('care'), true, '<button class="ib" onclick="crgLoad(1)" aria-label="refresh">⟳</button>');
if (!S.ch.pin) { setApp(h + '<div class="empty">' + esc(CRs('needLogin')) + '</div>'); return; }
var p = (S.chData && S.chData.plan) || null;
if (!CR2.list) { setApp(h + '<div class="empty">' + esc(CR2.err ? ccErr(CR2.err) : T('loading')) + '</div>'); if (!CR2.err) crgLoad(0); return; }
var L2 = CR2.list, need = 0, wk = 0;
var weekOk = function (m) { return p && m.pw === p.w && (p.d ? m.pd === p.d && m.pn >= 1 : m.pn >= 5); };
eachA(L2, function (m) { if (crgLevel(m) >= 2) need++; if (weekOk(m)) wk++; });
h += '<p class="sm muted" style="margin:4px 2px 8px">' + esc(CRs('shared', L2.length)) + (p ? ' · ' + esc(CT('planT')) + '：' + esc(chPlanTxt(p)) : '') + '</p>';
h += '<div class="chips"><button class="chip' + (CR2.f === 'all' ? ' on' : '') + '" onclick="CR2.f=\'all\';vChCare()">' + esc(CRs('f_all')) + ' ' + L2.length + '</button>' +
'<button class="chip' + (CR2.f === 'need' ? ' on' : '') + '" onclick="CR2.f=\'need\';vChCare()">' + esc(CRs('f_need')) + ' ' + need + '</button>' +
(p ? '<button class="chip' + (CR2.f === 'week' ? ' on' : '') + '" onclick="CR2.f=\'week\';vChCare()">' + esc(CRs('f_week')) + ' ' + wk + '</button>' : '') + '</div>';
var rows = [];
eachA(L2, function (m) { if (CR2.f === 'need' && crgLevel(m) < 2) return; if (CR2.f === 'week' && !weekOk(m)) return; rows.push(m); });
rows.sort(function (a, b) { return (a.last || 0) - (b.last || 0); });
if (!L2.length) h += '<div class="empty">' + esc(CRs('none')) + '</div>';
var COL = ['var(--ok)', '#3A74B0', 'var(--warn)', 'var(--bad)'], ICN = ['✅', '🟢', '🟠', '🔴'];
eachA(rows, function (m, i) {
var lv = crgLevel(m), d = crgDays(m.last);
var when = d < 0 ? CRs('never') : (d === 0 ? CRs('today') : CRs('daysAgo', d));
var wtxt = p && m.pw === p.w ? (p.d ? (m.pn ? CRs('weekDone') : CRs('weekNot')) : CRs('week', m.pn + '/5')) : '';
h += '<div class="card crgrow" style="border-left:5px solid ' + COL[lv] + ';padding:12px 14px"><div class="row"><div class="ccav" style="background:' + ccCol(m.who) + '">' + esc(String(m.nick || '?').slice(0, 1)) + '</div>' +
'<div class="grow" style="min-width:0"><b>' + esc(m.nick) + '</b><div class="xs" style="color:' + COL[lv] + ';font-weight:700">' + ICN[lv] + ' ' + esc(when) + '</div>' +
'<div class="xs muted">' + esc(CRs('total', m.total || 0)) + ' · ' + esc(CRs('d7', m.d7 || 0)) + (wtxt ? ' · ' + esc(wtxt) : '') + '</div></div>' +
'<button class="btn sm" onclick="crgCare(' + i + ')">💌 ' + esc(CRs('careBtn')) + '</button></div></div>';
});
CR2.rows = rows;
h += '<p class="xs muted" style="margin:14px 4px">' + esc(CRs('note')) + '</p>';
setApp(h);
}
function crgLoad(force) {
if (CR2.busy || !S.ch || !S.ch.pin) return; CR2.busy = 1;
ccApi('POST', '/c/' + S.ch.code + '/roster', { pin: S.ch.pin, dev: S.ch.dev || uid() }, function (j, e) {
CR2.busy = 0; CR2.err = j ? '' : e; if (j) { CR2.list = j.list; CR2.at = now(); }
if (!j && force) toast(ccErr(e));
if (R.page && R.page.t === 'chcare') vChCare();
});
}
function crgCare(i) {
var m = (CR2.rows || [])[i]; if (!m) return;
var txt = CRs('careTxt', m.nick);
if (navigator.share) { navigator.share({ text: txt }).catch(function () { }); return; }
try { navigator.clipboard.writeText(txt).then(function () { toast(CRs('copied')); }, function () { toast(txt); }); } catch (e) { toast(txt); }
}

/* ── 今天完成名單＋獎勵動畫（v1，2026-11-09） ──
   完成一課 → 送到 church-chat /done，回傳「今天第幾位」＋名單 → 全螢幕獎勵動畫與話語；
   教會頁與首頁卡片顯示今天完成靈修的家人名字。可選擇不顯示自己的名字（只算人數）。 */
var TD = { list: null, day: '', at: 0, busy: 0 };
var TDT = {
zh: { title: '今天完成靈修的家人', hideBtn: '隱藏我的名字', showBtn: '顯示我的名字', none: '今天還沒有人完成，你來作第一位！', more: '等 {0} 位', anon: '一位家人', showMe: '在「今天完成」名單顯示我的名字', on: '顯示中', off: '已隱藏', rank1: '你是今天第一位完成靈修的家人！', rankN: '你是今天第 {0} 位完成靈修的家人', with: '今天一起完成的有：', amen: '阿們！', share: '分享喜樂', shareTxt: '我今天完成了《321教會生活》的靈修！{0}', solo: '今天又和主親近了！',
  cheers: ['太好了，{0}！今天又和主約會了。', '{0}，你把一天最好的時間獻給了主，主必親近你。', '一生的果效由心發出——{0}，今天你把心交給了主。', '讓耶穌作王的一天，從親近祂開始。做得好，{0}！', '{0}，你的堅持是教會的祝福，我們一起繼續走下去！'],
  verses: [['你的話是我腳前的燈，是我路上的光。', '詩篇 119:105'], ['人活著，不是單靠食物，乃是靠神口裡所出的一切話。', '馬太福音 4:4'], ['你們親近神，神就必親近你們。', '雅各書 4:8'], ['我將你的話藏在心裡，免得我得罪你。', '詩篇 119:11'], ['當將你的事交託耶和華，並倚靠他，他就必成全。', '詩篇 37:5']] },
zs: { title: '今天完成灵修的家人', hideBtn: '隐藏我的名字', showBtn: '显示我的名字', none: '今天还没有人完成，你来作第一位！', more: '等 {0} 位', anon: '一位家人', showMe: '在「今天完成」名单显示我的名字', on: '显示中', off: '已隐藏', rank1: '你是今天第一位完成灵修的家人！', rankN: '你是今天第 {0} 位完成灵修的家人', with: '今天一起完成的有：', amen: '阿们！', share: '分享喜乐', shareTxt: '我今天完成了《321教会生活》的灵修！{0}', solo: '今天又和主亲近了！',
  cheers: ['太好了，{0}！今天又和主约会了。', '{0}，你把一天最好的时间献给了主，主必亲近你。', '一生的果效由心发出——{0}，今天你把心交给了主。', '让耶稣作王的一天，从亲近祂开始。做得好，{0}！', '{0}，你的坚持是教会的祝福，我们一起继续走下去！'],
  verses: [['你的话是我脚前的灯，是我路上的光。', '诗篇 119:105'], ['人活着，不是单靠食物，乃是靠神口里所出的一切话。', '马太福音 4:4'], ['你们亲近神，神就必亲近你们。', '雅各书 4:8'], ['我将你的话藏在心里，免得我得罪你。', '诗篇 119:11'], ['当将你的事交托耶和华，并倚靠他，他就必成全。', '诗篇 37:5']] },
en: { title: 'Finished today', hideBtn: 'Hide my name', showBtn: 'Show my name', none: 'No one has finished yet today — be the first!', more: 'and {0} more', anon: 'a church member', showMe: 'Show my name on “Finished today”', on: 'Shown', off: 'Hidden', rank1: 'You’re the first in your church to finish today!', rankN: 'You’re number {0} in your church to finish today', with: 'Also finished today:', amen: 'Amen!', share: 'Share the joy', shareTxt: 'I finished today’s devotion in 321 Church Life! {0}', solo: 'Another day close to the Lord!',
  cheers: ['Well done, {0}! Another day spent with the Lord.', '{0}, you gave the Lord the best of your day — He draws near to you.', 'Out of the heart flow the springs of life — {0}, today you gave your heart to the Lord.', 'A day with Jesus as King starts by drawing near to Him. Well done, {0}!', '{0}, your faithfulness is a blessing to the church. Let’s keep going together!'],
  verses: [['Your word is a lamp to my feet, and a light for my path.', 'Psalm 119:105'], ['Man shall not live by bread alone, but by every word that proceeds out of God’s mouth.', 'Matthew 4:4'], ['Draw near to God, and he will draw near to you.', 'James 4:8'], ['I have hidden your word in my heart, that I might not sin against you.', 'Psalm 119:11'], ['Commit your way to the LORD. Trust also in him, and he will do this.', 'Psalm 37:5']] },
ko: { title: '오늘 묵상을 마친 가족', hideBtn: '이름 숨기기', showBtn: '이름 보이기', none: '아직 오늘 마친 사람이 없어요. 첫 번째가 되어 보세요!', more: '외 {0}명', anon: '한 가족', showMe: '“오늘 완료” 명단에 내 이름 보이기', on: '보이는 중', off: '숨김', rank1: '오늘 우리 교회에서 첫 번째로 묵상을 마쳤어요!', rankN: '오늘 우리 교회에서 {0}번째로 묵상을 마쳤어요', with: '오늘 함께 마친 가족:', amen: '아멘!', share: '기쁨 나누기', shareTxt: '오늘 321 교회생활 묵상을 마쳤어요! {0}', solo: '오늘도 주님과 가까워졌어요!',
  cheers: ['잘했어요, {0}님! 오늘도 주님과 함께했어요.', '{0}님, 하루의 가장 좋은 시간을 주님께 드렸어요. 주님이 가까이하실 거예요.', '생명의 근원이 마음에서 나요. {0}님, 오늘 마음을 주님께 드렸어요.', '예수님이 왕 되시는 하루는 주님께 가까이 가는 것에서 시작해요. 잘했어요, {0}님!', '{0}님의 꾸준함이 교회의 복이에요. 함께 계속 걸어가요!'],
  verses: [['주의 말씀은 내 발에 등이요 내 길에 빛이니이다.', '시편 119:105'], ['사람이 떡으로만 살것이 아니요 하나님의 입으로 나오는 모든 말씀으로 살 것이라.', '마태복음 4:4'], ['하나님을 가까이 하라 그리하면 너희를 가까이 하시리라.', '야고보서 4:8'], ['내가 주께 범죄치 아니하려 하여 주의 말씀을 내 마음에 두었나이다.', '시편 119:11'], ['너의 길을 여호와께 맡기라 저를 의지하면 저가 이루시고.', '시편 37:5']] }
};
function TDs(k, a) { var d = TDT[L()] || TDT.zh, s = d[k]; if (s == null) s = TDT.zh[k]; if (s == null) s = k; return a == null ? s : String(s).replace('{0}', a); }
function tdNames(list, max) {
var named = [], anon = 0;
eachA(list || [], function (m) { if (m.nick) named.push(m.nick); else anon++; });
var shown = named.slice(0, max), rest = named.length - shown.length + anon;
return { shown: shown, rest: rest, total: (list || []).length };
}
function tdFetch(force, cb) {
if (!TD || !S.ch) return cb && cb(null);
var d = today();
if (!force && TD.list && TD.day === d && now() - TD.at < 60000) return cb && cb(TD.list);
if (TD.busy) return cb && cb(TD.list); TD.busy = 1;
ccApi('GET', '/c/' + S.ch.code + '/today?day=' + d, null, function (j) {
TD.busy = 0; if (j) { TD.list = j.list; TD.day = d; TD.at = now(); }
if (cb) cb(j ? TD.list : null);
});
}
function tdHtml(compact) {
if (!TD || !TDT || !TD.list || TD.day !== today()) return '';
var n = tdNames(TD.list, compact ? 6 : 40);
if (!n.total) return compact ? '' : '<div class="card tdcard"><b>🙏 ' + esc(TDs('title')) + '</b><p class="sm muted" style="margin:6px 0 0">' + esc(TDs('none')) + '</p></div>';
var chips = '';
eachA(n.shown, function (nm) { chips += '<span class="tdchip">🌟 ' + esc(nm) + '</span>'; });
if (n.rest) chips += '<span class="tdchip more">' + esc(n.shown.length ? TDs('more', n.rest) : n.rest + ' ' + TDs('anon')) + '</span>';
if (compact) return '<div class="tdline">' + chips + '</div>';
return '<div class="card tdcard"><div class="row sp"><b>🙏 ' + esc(TDs('title')) + '</b><span class="tdnum">' + n.total + '</span></div><div class="tdline">' + chips + '</div></div>';
}
function tdMeLine() {
if (!TDT || !S.ch) return '';
var hide = !!S.ch.hideName;
return '<div class="row crgline"><span class="xs muted grow">🌟 ' + esc(TDs('showMe')) + '：' + esc(hide ? TDs('off') : TDs('on')) + '</span><button class="btn sm" onclick="tdToggle()">' + esc(hide ? TDs('showBtn') : TDs('hideBtn')) + '</button></div>';
}
function chTdRe() { if (R.page && R.page.t === 'church') vChurch(); else if (!R.page && R.tab === 'chtab') vChTab(); }
function tdToggle() {
S.ch.hideName = S.ch.hideName ? 0 : 1; save();
var d = today();
if (S.ch.day === d || S.ch.tdDay === d || TD.mine) ccApi('POST', '/c/' + S.ch.code + '/done', { dev: S.ch.dev, nick: trim(S.name), day: d, hide: S.ch.hideName ? 1 : 0 }, function (j) { if (j) { TD.list = j.list; TD.day = d; TD.at = now(); } chTdRe(); });
else chTdRe();
}
function tdCss() {
if ($('#tdCss')) return;
var st = document.createElement('style'); st.id = 'tdCss';
st.textContent = '.tdcard{background:linear-gradient(135deg,#FFF8E2,#F6EEFF);border-color:#EADFBF}:root[data-theme=dark] .tdcard{background:#2E2840;border-color:#4A4060}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .tdcard{background:#2E2840;border-color:#4A4060}}' +
'.tdnum{font-family:var(--serif);font-weight:800;color:var(--gold);font-size:1.4em}.tdline{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.tdchip{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:.84em;font-weight:600}.tdchip.more{color:var(--mute);font-weight:500}' +
'.rw{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(255,236,170,.96),rgba(31,60,136,.94) 70%);overflow:hidden;padding:20px;animation:rwIn .35s ease-out}' +
'.rw .box{position:relative;z-index:2;max-width:420px;width:100%;text-align:center;color:#fff}.rw svg.medal{width:190px;height:190px;filter:drop-shadow(0 10px 24px rgba(0,0,0,.3));animation:rwPop .9s cubic-bezier(.2,1.6,.4,1) both}' +
'.rw .rays{position:absolute;left:50%;top:38%;width:760px;height:760px;margin:-380px 0 0 -380px;z-index:1;background:repeating-conic-gradient(rgba(255,255,255,.16) 0 9deg,transparent 9deg 22deg);border-radius:50%;animation:rwSpin 24s linear infinite;-webkit-mask-image:radial-gradient(circle,#000 25%,transparent 68%);mask-image:radial-gradient(circle,#000 25%,transparent 68%)}' +
'.rw h2{font-family:var(--serif);font-size:1.5em;margin:10px 0 4px;text-shadow:0 2px 8px rgba(0,0,0,.35);animation:rwUp .6s .35s both}.rw .rk{display:inline-block;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:5px 14px;font-weight:700;margin:4px 0 10px;animation:rwUp .6s .5s both}' +
'.rw .cheer{font-size:1.04em;line-height:1.7;margin:4px 0 12px;animation:rwUp .6s .65s both}.rw .vs{font-family:var(--serif);background:rgba(255,255,255,.14);border-radius:14px;padding:12px 14px;line-height:1.8;animation:rwUp .6s .8s both}.rw .vs small{display:block;opacity:.85;margin-top:4px}' +
'.rw .wt{font-size:.86em;margin:12px 0 0;opacity:.95;animation:rwUp .6s .95s both}.rw .wt span{display:inline-block;background:rgba(255,255,255,.2);border-radius:999px;padding:2px 9px;margin:3px 2px}' +
'.rw .acts{display:flex;gap:10px;margin-top:16px;animation:rwUp .6s 1.1s both}.rw .acts .btn{flex:1}.rw .btn.gold{color:#3A2A00}.rw .btn.ghost{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.5);color:#fff}' +
'.rw i.cf{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;z-index:3;animation:rwFall linear forwards}' +
'@keyframes rwIn{from{opacity:0}to{opacity:1}}@keyframes rwPop{0%{transform:scale(.2) rotate(-25deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes rwSpin{to{transform:rotate(360deg)}}' +
'@keyframes rwUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes rwFall{0%{transform:translate3d(0,0,0) rotate(0)}100%{transform:translate3d(var(--dx),110vh,0) rotate(var(--rt))}}' +
'@keyframes rwGlow{0%,100%{opacity:.55}50%{opacity:1}}.rw .glow{animation:rwGlow 1.8s ease-in-out infinite}' +
'@media (prefers-reduced-motion:reduce){.rw,.rw *{animation:none!important}.rw i.cf{display:none}}';
document.head.appendChild(st);
}
var RW_SVG = '<svg class="medal" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="rwg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE9A0"/><stop offset=".5" stop-color="#F2C75C"/><stop offset="1" stop-color="#C9962A"/></linearGradient>' +
'<radialGradient id="rwb" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#3A6FD0"/><stop offset="1" stop-color="#1F3C88"/></radialGradient></defs>' +
'<path d="M62 118 L44 186 L70 172 L84 196 L98 132 Z" fill="#B8473E"/><path d="M138 118 L156 186 L130 172 L116 196 L102 132 Z" fill="#B8473E"/>' +
'<circle cx="100" cy="88" r="70" fill="url(#rwg)"/><circle cx="100" cy="88" r="58" fill="url(#rwb)" stroke="#FFF3C8" stroke-width="3"/>' +
'<g fill="#FFE9A0" class="glow"><rect x="93" y="50" width="14" height="76" rx="3"/><rect x="72" y="68" width="56" height="13" rx="3"/></g>' +
'<g fill="#F2C75C" opacity=".9"><path d="M40 70 q-12 18 0 36 q4-18 0-36z"/><path d="M160 70 q12 18 0 36 q-4-18 0-36z"/><path d="M48 52 q-16 10 -10 30 q8-14 10-30z"/><path d="M152 52 q16 10 10 30 q-8-14-10-30z"/></g>' +
'<g fill="#fff"><path d="M30 30 l3 8 8 3 -8 3 -3 8 -3-8 -8-3 8-3z" class="glow"/><path d="M170 24 l2 6 6 2 -6 2 -2 6 -2-6 -6-2 6-2z" class="glow"/><path d="M176 140 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2z" class="glow"/></g></svg>';
function chReward(rank, list) {
tdCss();
var old = $('#rwBox'); if (old) old.parentNode.removeChild(old);
var nm = trim(S.name) || '', d = TDT[L()] || TDT.zh, seed = new Date().getDate() + (rank || 0);
var cheer = d.cheers[seed % d.cheers.length].replace('{0}', nm || (L() === 'en' ? 'friend' : L() === 'ko' ? '형제자매' : '弟兄姊妹'));
var v = d.verses[(seed + 2) % d.verses.length];
var others = [];
eachA(list || [], function (m) { if (m.nick && m.nick !== nm && others.length < 8) others.push(m.nick); });
var h = '<div class="rays"></div><div class="box">' + RW_SVG +
'<h2>' + esc(TDs('solo')) + '</h2>' +
(rank ? '<div class="rk">' + esc(rank === 1 ? TDs('rank1') : TDs('rankN', rank)) + '</div>' : '') +
'<p class="cheer">' + esc(cheer) + '</p><div class="vs">「' + esc(v[0]) + '」<small>' + esc(v[1]) + '</small></div>' +
(others.length ? '<p class="wt">' + esc(TDs('with')) + '<br>' + others.map(function (x) { return '<span>🌟 ' + esc(x) + '</span>'; }).join('') + '</p>' : '') +
'<div class="acts"><button class="btn ghost" onclick="rwShare()">' + esc(TDs('share')) + '</button><button class="btn gold" onclick="rwClose()">' + esc(TDs('amen')) + '</button></div></div>';
var el = document.createElement('div'); el.className = 'rw'; el.id = 'rwBox'; el.innerHTML = h;
var cols = ['#F2C75C', '#FFFFFF', '#8FB0F5', '#E58FA0', '#6FAE71', '#C9962A'];
for (var i = 0; i < 46; i++) {
var c = document.createElement('i'); c.className = 'cf';
c.style.left = (Math.random() * 100) + '%'; c.style.background = cols[i % cols.length];
c.style.animationDuration = (2.4 + Math.random() * 2.2) + 's'; c.style.animationDelay = (Math.random() * 1.2) + 's';
c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); c.style.setProperty('--rt', (Math.random() * 720 - 360) + 'deg');
el.appendChild(c);
}
document.body.appendChild(el);
RW.text = cheer + '\n「' + v[0] + '」' + v[1];
try { if (navigator.vibrate) navigator.vibrate([30, 40, 60]); } catch (e) { }
}
var RW = { text: '' };
function rwClose() { var el = $('#rwBox'); if (el) el.parentNode.removeChild(el); }
function rwShare() {
var t = TDs('shareTxt', '\n' + RW.text);
if (navigator.share) { navigator.share({ text: t }).catch(function () { }); return; }
try { navigator.clipboard.writeText(t).then(function () { toast(CCs('copied')); }); } catch (e) { toast(t); }
}
/* 完成一課就呼叫（finishLesson → chFinish）：送到今天完成名單，再放獎勵動畫 */
function chFinish(isNew) {
if (!isNew) return;
try { if (window.XJ321) XJ321.autoDone(); } catch (e) { }
if (!S.ch) { chReward(0, []); return; }
if (!S.ch.dev) S.ch.dev = uid();
var d = today(), shown = 0;
var t = setTimeout(function () { shown = 1; chReward(0, TD.day === d ? TD.list : []); }, 2500);
ccApi('POST', '/c/' + S.ch.code + '/done', { dev: S.ch.dev, nick: trim(S.name), day: d, hide: S.ch.hideName ? 1 : 0 }, function (j) {
if (j) { TD.list = j.list; TD.day = d; TD.at = now(); TD.mine = 1; S.ch.tdDay = d; save(); }
if (shown) return; clearTimeout(t);
chReward(j ? j.rank : 0, j ? j.list : []);
});
}
try { tdCss(); } catch (e) { }

/* ── 我的小家（xj1109，2026-11-09）：在「我的教會」裡建立／加入小家，小家聊天室、今天完成、關懷名單、消息 ──
   共用空中團契的 xj.js（同一份檔案），這裡只提供宿主掛鉤；存檔前綴 cl321_，和空中團契的小家分開。
   後端沿用 church-news（小家本身）與 church-chat（聊天、附件、今天完成、關懷）。 */
var XJ_T2S = {"並": "并", "亞": "亚", "佈": "布", "來": "来", "係": "系", "個": "个", "們": "们", "傳": "传", "儲": "储", "兒": "儿", "內": "内", "兩": "两", "別": "别", "刪": "删", "則": "则", "剛": "刚", "動": "动", "務": "务", "勵": "励", "參": "参", "啟": "启", "單": "单", "嗎": "吗", "國": "国", "圖": "图", "團": "团", "堅": "坚", "實": "实", "寫": "写", "將": "将", "對": "对", "導": "导", "屬": "属", "幾": "几", "張": "张", "後": "后", "從": "从", "愛": "爱", "懷": "怀", "掛": "挂", "換": "换", "擊": "击", "數": "数", "時": "时", "書": "书", "會": "会", "樂": "乐", "標": "标", "樣": "样", "機": "机", "檔": "档", "權": "权", "歡": "欢", "沒": "没", "瀏": "浏", "為": "为", "燈": "灯", "獎": "奖", "獻": "献", "現": "现", "畫": "画", "當": "当", "發": "发", "確": "确", "碼": "码", "禱": "祷", "種": "种", "稱": "称", "穌": "稣", "筆": "笔", "節": "节", "紀": "纪", "約": "约", "細": "细", "組": "组", "結": "结", "絡": "络", "給": "给", "經": "经", "網": "网", "綴": "缀", "線": "线", "繼": "继", "續": "续", "聖": "圣", "聯": "联", "聲": "声", "腳": "脚", "與": "与", "舊": "旧", "華": "华", "著": "着", "處": "处", "補": "补", "裝": "装", "裡": "里", "製": "制", "複": "复", "親": "亲", "覽": "览", "訊": "讯", "託": "托", "記": "记", "設": "设", "許": "许", "詞": "词", "試": "试", "詩": "诗", "話": "话", "認": "认", "語": "语", "誠": "诚", "說": "说", "課": "课", "請": "请", "謝": "谢", "譯": "译", "讀": "读", "讓": "让", "讚": "赞", "貼": "贴", "資": "资", "載": "载", "輸": "输", "這": "这", "連": "连", "進": "进", "過": "过", "還": "还", "鉤": "钩", "錄": "录", "錯": "错", "鐘": "钟", "長": "长", "閉": "闭", "開": "开", "間": "间", "關": "关", "隊": "队", "隨": "随", "隱": "隐", "離": "离", "靈": "灵", "頁": "页", "頂": "顶", "頭": "头", "題": "题", "願": "愿", "類": "类", "顧": "顾", "顯": "显", "風": "风", "馬": "马", "麥": "麦", "麼": "么", "點": "点"};
function xjZs(t) { var o = ''; t = String(t == null ? '' : t); for (var i = 0; i < t.length; i++) { var c = t.charAt(i); o += XJ_T2S[c] || c; } return o; }
var XJR = { pages: {}, after: null };
window.X321 = window.X321 || {};
window.X321.xj = {
  PAGES: XJR.pages, TITLES: {}, CR_SKIP: {},
  prefix: 'cl321_', appZh: '321教會生活', appEn: '321 Church Life',
  whereZh: '「我的 → 我的教會 → 我的小家」', whereEn: 'Me → My Church → My Small Group',
  go: function (r) { open_({ t: r }); },
  render: function (r) { if (R.page && R.page.t === r) render(); },
  route: function () { return R.page ? R.page.t : ''; },
  wrapRender: function (f) { XJR.after = f; },
  f9: function (zh, en) { var l = L(); if (l === 'en' || l === 'ko') return en || zh; if (l === 'zs') return xjZs(zh); return zh; },
  esc: esc, note: function (m) { toast(m); }, lang: function () { var l = L(); return l === 'en' || l === 'ko' ? 'en' : (l === 'zs' ? 'zh-Hans' : 'zh-Hant'); },
  pageHead: function (eb, title, sub) { return '<p class="eyebrow" style="margin:4px 2px 2px">' + esc(eb) + '</p><div class="h2" style="margin:0 2px 2px">' + esc(title) + '</div>' + (sub ? '<p class="sm muted" style="margin:0 2px 10px">' + esc(sub) + '</p>' : ''); },
  sect: function (n, title) { return '<p class="eyebrow" style="margin:18px 2px 8px">' + esc(title) + '</p>'; },
  rowlink: function () { return ''; }, simp: function () { },
  nTr: function (t, b, cb) { if (window.chTr) chTr(t, b, cb); else cb(null); },
  wordZh: '靈修', wordEn: 'devotion', autoDone: true,
  myName: function () { return trim(S.name || ''); },
  altDev: function (code) { return S.ch && S.ch.code === code ? (S.ch.dev || '') : ''; },
  didToday: function () { return chDidToday(); },
  goRead: function () { var n = window.nextLesson ? nextLesson() : null; if (n) open_({ t: 'lesson', w: n.w, d: n.d }); else go('course'); }
};
/* 今天有沒有完成任何一課（S.done 的時間戳是今天） */
function chDidToday() { var t0 = new Date(); t0.setHours(0, 0, 0, 0); var ok = false; each(S.done || {}, function (k, v) { if ((+v || 0) >= t0.getTime()) ok = true; }); return ok; }
/* 今天完成了課程、但教會的「今天完成」名單還沒有自己（例如這個功能上線前就讀完了）：補送一次 */
function chTdSync() {
if (!S.ch || !chDidToday()) return;
var d = today(); if (S.ch.tdDay === d || chTdSync.busy) return;
chTdSync.busy = 1; if (!S.ch.dev) S.ch.dev = uid();
try { chDone(); } catch (e) { }
ccApi('POST', '/c/' + S.ch.code + '/done', { dev: S.ch.dev, nick: trim(S.name), day: d, hide: S.ch.hideName ? 1 : 0 }, function (j) {
chTdSync.busy = 0; if (!j) return;
S.ch.tdDay = d; TD.list = j.list; TD.day = d; TD.at = now(); TD.mine = 1; save();
var el = $('#tdCard'); if (el) el.innerHTML = tdHtml(false);
var c = $('#chCard'); if (c) c.innerHTML = chHomeHtml();
});
}
/* 底部「教會」分頁：我的教會＋我的小家 */
function vChTab() {
var l = L(), en = l === 'en' || l === 'ko', zs = l === 'zs';
var tx = function (zh, e, k) { return l === 'ko' && k ? k : (en ? e : (zs ? xjZs(zh) : zh)); };
var h = topbar(tx('教會', 'Church', '교회'));
h += '<p class="eyebrow" style="margin:6px 2px 4px">⛪ ' + esc(tx('我的教會', 'My church', '나의 교회')) + '</p>';
if (S.ch) h += '<div id="chCard">' + chHomeHtml() + '</div>' + (window.tdMeLine ? tdMeLine() : '');
else h += '<div class="card chc0"><b>⛪ ' + esc(CT('togetherT')) + '</b><p class="sm muted" style="margin:6px 0 10px">' + esc(CT('togetherD')) + '</p><button class="btn pri" onclick="open_({t:\'church\'})">' + esc(CT('joinBtn')) + '</button></div>';
h += '<p class="eyebrow" style="margin:18px 2px 4px">🏡 ' + esc(tx('我的小家', 'My small groups', '나의 소그룹')) + '</p>';
var G = (window.XJ321 && XJ321.groups()) || [];
if (!G.length) h += '<div class="card cccard" onclick="XJ321&&XJ321.open(\'\')"><div class="row"><div class="ccic">🏡</div><div class="grow"><b>' + esc(tx('建立或加入小家', 'Create or join a small group', '소그룹 만들기/참여')) + '</b><div class="xs muted">' + esc(tx('和小家家人一起靈修、聊天、彼此代禱；完成課程時名字會自動出現（可隱藏）', 'Devotions, chat and prayer together; your name appears when you finish a lesson (can be hidden)', '함께 묵상하고 대화하고 기도해요')) + '</div></div><span class="xs muted">›</span></div></div>';
eachA(G, function (g) {
h += '<div class="card cccard" onclick="XJ321.open(\'' + esc(g.code) + '\')"><div class="row"><div class="ccic">🏡</div><div class="grow"><b>' + esc(g.name) + (g.pin ? ' 🔑' : '') + '</b><div class="xs muted">' + esc(tx('小家代碼 ', 'Code ', '코드 ') + g.code) + (g.doneDay === today() ? ' · ✅ ' + esc(tx('今天已完成', 'done today', '오늘 완료')) : '') + '</div></div><span class="xs muted">›</span></div></div>';
});
if (G.length) h += '<button class="btn full" style="margin:4px 0 12px" onclick="XJ321.open(\'+\')">＋ ' + esc(tx('加入或建立其他小家', 'Join or create another group', '다른 소그룹 참여/만들기')) + '</button>';
h += '<p class="xs muted" style="margin:10px 4px 20px">' + esc(tx('完成每天的課程，名字會自動出現在教會和每個小家的「今天完成」名單，一起歡喜；不想顯示可以在教會頁或小家頁設定隱藏。', 'When you finish a lesson, your name appears on “Finished today” for your church and each group. You can hide it in the church or group page.', '과를 마치면 교회와 소그룹의 “오늘 완료”에 이름이 나와요. 숨길 수도 있어요.')) + '</p>';
setApp(h);
chTdSync();
try { if (window.XJ321) XJ321.autoSync(); } catch (e) { }
if (S.ch) chFetch(false, function (j) { var el = $('#chCard'); if (j && el) el.innerHTML = chHomeHtml(); });
if (S.ch && window.tdFetch) tdFetch(false, function () { var el = $('#chCard'); if (el) el.innerHTML = chHomeHtml(); });
}
function xjView(t) {
  var f = XJR.pages[t]; if (!f) return loading('🏡', 1);
  var ti = t === 'xjchat' ? '' : (t === 'xjcare' ? (L() === 'en' || L() === 'ko' ? 'Care list' : (L() === 'zs' ? '关怀名单' : '關懷名單')) : (L() === 'en' || L() === 'ko' ? 'My Small Group' : '我的小家'));
  $('#app').innerHTML = topbar(ti, true) + '<div id="view" class="xjv">' + f() + '</div>';
  if (t === 'xjchat') { var fab = $('#fab'); if (fab) fab.style.display = 'none'; }
  try { if (XJR.after) XJR.after(t); } catch (e) { }
}
function xjEntryHtml() {
  var X = window.XJ321 && XJ321.state(), G = (window.XJ321 && XJ321.groups()) || [], en = L() === 'en' || L() === 'ko', zs = L() === 'zs';
  var t1 = en ? 'My Small Group' : '我的小家';
  var t2 = X ? X.name + (G.length > 1 ? (en ? ' (+' + (G.length - 1) + ' more)' : (zs ? xjZs('等 ' + G.length + ' 個小家') : '等 ' + G.length + ' 個小家')) : '') + (en ? ' · news, chat, prayer' : (zs ? ' · 消息、聊天室、彼此代祷' : ' · 消息、聊天室、彼此代禱'))
    : (en ? 'Create or join a small group — chat and pray together' : (zs ? '建立或加入小家，一起聊天、彼此代祷' : '建立或加入小家，一起聊天、彼此代禱'));
  return '<div class="card cccard" onclick="open_({t:\'xj\'})"><div class="row"><div class="ccic">🏡</div><div class="grow"><b>' + esc(t1) + '</b><div class="xs muted">' + esc(t2) + '</div></div><span class="xs muted">›</span></div></div>';
}
(function () {
  var st = document.createElement('style');
  st.textContent = '.xjv,.xjmodal,.xjrw,.xjview{--navy:var(--brand);--sky:var(--soft);--white:var(--card);--muted:var(--mute);--head:var(--ink);--gold-text:#8A6400;--font-display:var(--serif);--maxw:720px;--paper:var(--bg)}' +
    '.xjv .btn,.xjmodal .btn{width:100%;background:var(--brand);border-color:var(--brand);color:#fff;border-radius:14px;min-height:48px}.xjv .btn.ghost,.xjmodal .btn.ghost{background:transparent;border:2px solid var(--brand);color:var(--ink)}.xjv .btn.gold{background:linear-gradient(180deg,#F5D47A,#D9A830);border-color:#C9962A;color:#3A2A00}' +
    '.xjv .note,.xjmodal .note{color:var(--mute);font-size:.86em;margin:6px 2px 0;line-height:1.6}.xjv h3,.xjmodal h3{margin:0 0 8px;font-size:1.05em}' +
    '.xjv .fld,.xjmodal .fld{display:block;margin:8px 0}.xjv .fld span,.xjmodal .fld span{display:block;font-size:.84em;font-weight:600;margin-bottom:4px}.xjv .fld input,.xjmodal .fld input,.xjmodal .fld textarea,.xjmodal .fld select{width:100%;border:1px solid var(--line);border-radius:12px;padding:11px 12px;background:var(--bg);min-height:46px}' +
    '.xjchatmode #fab{display:none!important}.xjv .xjft{max-width:720px}';
  document.head.appendChild(st);
  var r0 = window.render;
  if (typeof r0 === 'function') window.render = function () { try { document.body.classList.remove('xjchatmode'); } catch (e) { } return r0.apply(this, arguments); };
  var sc = document.createElement('script'); sc.src = 'xj.js?v=' + APPVER; document.body.appendChild(sc);
})();
