// Nido home: login, greeting, the other person's presence, live app tiles, settings.
(function () {
  'use strict';
  const N = window.Nido, SB = N.SB, $ = N.$, esc = N.esc;
  let C = null;
  const SPN = { daisy: 'una Margherita', clover: 'un Trifoglio', tulip: 'un Tulipano', fern: 'una Felce', lavender: 'una Lavanda', poppy: 'un Papavero', tomato: 'un Pomodoro', sunflower: 'un Girasole', fir: 'un Abete', cherry: 'un Ciliegio', willow: 'il Salice di coppia', oak: 'una Quercia' };
  const IDEAS = ['Sto studiando', 'Sto lavorando', 'In palestra', 'Pausa caffè, mi chiami?', 'In viaggio', 'A lezione', 'Sto leggendo', 'Mi manchi'];
  const CLOTH = ['#7b2d26', '#2e4a6b', '#3d5a40', '#c99a2e', '#2f6b6b', '#e6dcc6', '#5b3a5e', '#a4532d', '#34343a', '#b8475a', '#4a6d8c'];

  /* ---------- art ---------- */
  function canvas(cv, w, h) { const d = Math.min(window.devicePixelRatio || 1, 3); cv.width = w * d; cv.height = h * d; cv.style.width = w + 'px'; cv.style.height = h + 'px'; const c = cv.getContext('2d'); c.scale(d, d); return c; }
  const leaf = (c, x, y, l, w, a, col) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(l * .3, -w, l * .75, -w * .8, l, 0); c.bezierCurveTo(l * .75, w * .8, l * .3, w, 0, 0); c.fill(); c.restore(); };
  function nest(cv, size) {
    const c = canvas(cv, size, size), k = size / 160;
    c.scale(k, k);
    c.fillStyle = '#7a5236'; c.beginPath(); c.ellipse(80, 104, 62, 30, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#5e3e28'; c.beginPath(); c.ellipse(80, 96, 58, 16, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#cfe3d4'; c.beginPath(); c.ellipse(68, 84, 16, 21, -.18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2d2da'; c.beginPath(); c.ellipse(93, 85, 15, 20, .16, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(63, 77, 4, 6, -.3, 0, Math.PI * 2); c.ellipse(88, 78, 3.5, 5.5, -.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#a7774f'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const a = Math.PI * (i / 15), x = 80 + Math.cos(a) * 62, y = 100 + Math.sin(a) * 26; c.beginPath(); c.moveTo(x - 14, y - 5 + (i % 2) * 4); c.quadraticCurveTo(x, y + 6, x + 16, y - 3); c.stroke(); }
    c.strokeStyle = '#8e6040';
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(22 + i * 13, 98 + (i % 2) * 4); c.quadraticCurveTo(30 + i * 13, 112, 40 + i * 13, 100); c.stroke(); }
    leaf(c, 128, 92, 26, 8, -.6, '#6aa653'); leaf(c, 32, 94, 22, 7, -2.6, '#4f8f3e');
  }
  function forestArt(cv) {
    const c = canvas(cv, 128, 128);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(64, 110, 44, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6a4a33'; c.beginPath(); c.ellipse(64, 92, 46, 22, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#8cc063'; c.beginPath(); c.ellipse(64, 91, 47, 12, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4f8a3c'; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(64, 91); c.quadraticCurveTo(67, 62, 62, 34); c.stroke();
    leaf(c, 65, 70, 26, 9, -.5, '#6fb055'); leaf(c, 64, 78, 23, 8, -2.7, '#4f8f3e');
    for (let i = 0; i < 14; i++) { c.save(); c.translate(62, 32); c.rotate(i * Math.PI / 7); c.fillStyle = i % 2 ? '#fff' : '#ece8dc'; c.beginPath(); c.ellipse(10, 0, 9.5, 3, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.fillStyle = '#f0b42c'; c.beginPath(); c.arc(62, 32, 5.5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#5f9443'; c.lineWidth = 1.4; [[30, 92], [96, 95], [44, 98], [84, 88]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 6); c.moveTo(x, y); c.lineTo(x + 2, y - 7); c.stroke(); });
  }
  function shelfArt(el, titles) {
    const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619); return x >>> 0; };
    const list = titles.length ? titles.slice(0, 7) : ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff'];
    el.innerHTML = list.map((t, i) => { const v = h(t + i); return `<i class="${i === list.length - 1 ? 'lean' : ''}" style="width:${11 + v % 8}px;height:${62 + (v >> 5) % 34}px;background:${CLOTH[v % CLOTH.length]}"></i>`; }).join('');
  }

  /* ---------- login ---------- */
  let mode = 'in';
  function setMode(m) {
    mode = m;
    document.querySelectorAll('#gateTabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.g === m));
    $('#nameRow').hidden = m !== 'up';
    $('#gPass').autocomplete = m === 'up' ? 'new-password' : 'current-password';
    $('#gBtn').textContent = m === 'up' ? 'Crea il mio account' : 'Entra nel Nido';
    showErr('');
  }
  function showErr(m) { const e = $('#gErr'); e.textContent = m; e.hidden = !m; }
  const itErr = (m) => {
    m = String(m || '');
    if (/Invalid login/i.test(m)) return 'Email o password non corrette.';
    if (/already registered|already been registered/i.test(m)) return 'Esiste già un account con questa email: usa «Accedi».';
    if (/Password should be/i.test(m)) return 'La password deve avere almeno 6 caratteri.';
    if (/rate limit/i.test(m)) return 'Troppi tentativi ravvicinati. Riprova tra qualche minuto.';
    if (/fetch|network/i.test(m)) return 'Non riesco a collegarmi. Controlla la connessione.';
    return m;
  };
  $('#gateTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.g); });
  $('#gateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!SB) { showErr('L’app non è ancora collegata al suo database.'); return; }
    const email = $('#gEmail').value.trim().toLowerCase(), password = $('#gPass').value, name = $('#gName').value.trim();
    if (!email || !password) { showErr('Scrivi email e password.'); return; }
    if (mode === 'up' && !name) { showErr('Scrivi il tuo nome: è quello che vedrà l’altra persona.'); return; }
    const btn = $('#gBtn'); btn.disabled = true;
    try {
      const res = mode === 'up' ? await SB.auth.signUp({ email, password, options: { data: { name } } }) : await SB.auth.signInWithPassword({ email, password });
      if (res.error) throw res.error;
      if (!res.data.session) { showErr('Account creato. Ora accedi con email e password.'); setMode('in'); return; }
      await enter();
    } catch (err) { showErr(itErr(err.message)); } finally { btn.disabled = false; }
  });
  $('#gOut').addEventListener('click', () => N.signOut());
  async function ensureProfile(user) {
    const { data } = await SB.from('profiles').select('id,name').eq('id', user.id).maybeSingle();
    if (data && data.name) return;
    const { count } = await SB.from('profiles').select('id', { count: 'exact', head: true });
    const name = (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0];
    await SB.from('profiles').upsert({ id: user.id, name, color: count ? '#d4517a' : '#2f8f5b' });
  }

  /* ---------- home ---------- */
  async function enter() {
    const { data } = await SB.auth.getSession();
    if (!data.session) return;
    const { data: ok } = await SB.rpc('is_member');
    if (!ok) { $('#gateForm').hidden = true; $('#gateTabs').hidden = true; $('#gateNo').hidden = false; $('#gateSub').textContent = data.session.user.email; return; }
    await ensureProfile(data.session.user).catch(() => {});
    C = await N.require();
    $('#gate').hidden = true; $('#hub').hidden = false;
    greet(); forestArt($('#artForest')); render(); live();
    N.pushState().then((s) => { pushNow = s; renderBanner(); });
  }
  function greet() {
    const d = new Date(), h = d.getHours();
    const hello = h < 5 ? 'Buonanotte' : h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    const m = d.getMonth(), season = m < 2 || m === 11 ? 'inverno' : m < 5 ? 'primavera' : m < 8 ? 'estate' : 'autunno';
    $('#hHello').textContent = `${hello}, ${C.me.name}`;
    $('#hDate').textContent = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + season;
    $('#meBtn').innerHTML = N.avatar(C.me, 44);
  }
  const S = { forests: [], months: [], readings: [], books: [] };
  async function load() {
    const d = new Date(), month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const [f, mo, r] = await Promise.all([
      SB.from('forests').select('user_id,data'),
      SB.from('months').select('user_id,list').eq('month', month),
      SB.from('readings').select('book_id,user_id,status,progress,updated_at').in('status', ['reading', 'read']),
    ]);
    S.forests = f.data || []; S.months = mo.data || [];
    S.readings = r.error ? [] : (r.data || []);
    const ids = [...new Set(S.readings.map((x) => x.book_id))];
    S.books = ids.length ? ((await SB.from('books').select('id,title,pages').in('id', ids)).data || []) : [];
    render();
  }
  const forestOf = (id) => ((S.forests.find((f) => f.user_id === id) || {}).data) || {};
  const nameOf = (id) => (id === C.uid ? 'Tu' : (C.people[id] || {}).name || 'Qualcuno');
  const bookTitle = (id) => (S.books.find((b) => b.id === id) || {}).title || '';
  function activity(id) {
    const a = forestOf(id).active, now = Date.now();
    if (a && a.start + a.dur * 60000 > now) {
      const left = Math.max(1, Math.ceil((a.start + a.dur * 60000 - now) / 60000));
      if (a.kind === 'focus') return { live: true, text: (a.together ? 'Sta facendo crescere il Salice con te' : 'Sta piantando ' + (SPN[a.sp] || 'una pianta')) + ' · ancora ' + left + ' min' };
      if (a.kind === 'work') return { live: true, text: 'Sta lavorando con lo gnomo · da ' + Math.floor((now - a.start) / 60000) + ' min' };
      return { live: false, text: 'È in pausa' };
    }
    const r = S.readings.filter((x) => x.user_id === id && x.status === 'reading').sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
    if (r && bookTitle(r.book_id)) return { live: false, text: 'Sta leggendo «' + bookTitle(r.book_id) + '»' };
    return null;
  }
  function render() {
    if (!C) return;
    // presence
    const parts = C.others.map((p) => {
      const st = forestOf(p.id).status, fresh = st && st.text && Date.now() - st.at < 12 * 3600e3;
      const act = activity(p.id);
      return `<div class="person"><span class="ava-wrap">${N.avatar(p, 46)}${act && act.live ? '<span class="ring"></span>' : ''}</span><div class="txt"><b>${esc(p.name)}</b>${fresh ? `<span class="st">«${esc(st.text)}»</span>` : ''}<span class="act">${act ? esc(act.text) : fresh ? '' : 'Nessuna novità per ora'}${fresh ? ' · ' + N.ago(st.at) : ''}</span></div>${act && act.live ? '<span class="live" aria-label="adesso"></span>' : ''}</div>`;
    }).join('') || '<div class="waiting">Quando l’altra persona entra con la sua email, qui vedrai cosa sta facendo.</div>';
    const mySt = forestOf(C.uid).status, myFresh = mySt && mySt.text && Date.now() - mySt.at < 12 * 3600e3;
    $('#together').innerHTML = parts + `<button class="statusbtn" id="statusBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9.5h8M8 12.5h5"/></svg>${myFresh ? 'Il tuo stato: «' + esc(mySt.text) + '»' : 'Cosa stai facendo? Faglielo sapere'}</button>`;
    // forest tile
    const today = new Date().toDateString();
    const todayOf = (id) => { const row = S.months.find((m) => m.user_id === id); return row ? row.list.filter((s) => s[5] === 1 && new Date(s[1]).toDateString() === today && s[3] !== 'work').length : 0; };
    const mineToday = todayOf(C.uid);
    const lines = [`<span>Oggi: ${mineToday} ${mineToday === 1 ? 'pianta tua' : 'piante tue'}${C.others.map((p) => ' · ' + todayOf(p.id) + ' di ' + esc(p.name)).join('')}</span>`];
    const myA = activity(C.uid); if (myA && myA.live) lines.push(`<span>Hai un timer in corso</span>`);
    C.others.forEach((p) => { const a = activity(p.id); if (a && a.live) lines.push(`<span class="dim">${esc(p.name)}: ${esc(a.text.charAt(0).toLowerCase() + a.text.slice(1))}</span>`); });
    $('#tForest').innerHTML = lines.join('');
    // library tile
    const reading = S.readings.filter((r) => r.status === 'reading');
    const bl = [];
    const myR = reading.filter((r) => r.user_id === C.uid);
    if (myR.length) { const r = myR[0], b = S.books.find((x) => x.id === r.book_id) || {}; bl.push(`<span>Stai leggendo «${esc(b.title || '')}»${b.pages ? ' · ' + Math.min(100, Math.round((r.progress || 0) / b.pages * 100)) + '%' : ''}</span>`); }
    else bl.push('<span>Nessun libro aperto</span>');
    C.others.forEach((p) => { const r = reading.find((x) => x.user_id === p.id); if (r) bl.push(`<span class="dim">${esc(p.name)} legge «${esc(bookTitle(r.book_id))}»</span>`); });
    const yr = String(new Date().getFullYear());
    const readYear = S.readings.filter((r) => r.status === 'read' && String(r.updated_at || '').startsWith(yr)).length;
    if (readYear) bl.push(`<span class="dim">${readYear} ${readYear === 1 ? 'libro finito' : 'libri finiti'} insieme nel ${yr}</span>`);
    $('#tBooks').innerHTML = bl.join('');
    shelfArt($('#artBooks'), S.books.map((b) => b.title));
  }
  let rt = null; const refresh = () => { clearTimeout(rt); rt = setTimeout(() => load().catch(() => {}), 300); };
  function live() {
    load().catch(() => {});
    const ch = SB.channel('nido');
    ['forests', 'months', 'readings', 'profiles'].forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, refresh));
    ch.subscribe();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { greet(); refresh(); } });
    setInterval(() => { if (!document.hidden) render(); }, 30000);
  }

  /* ---------- sheets ---------- */
  let pushNow = 'unknown';
  function renderBanner() {
    const b = $('#pushBanner');
    b.hidden = !(pushNow === 'off' || pushNow === 'install');
    b.innerHTML = pushNow === 'install'
      ? '<p>Per ricevere le notifiche, apri Nido dall’icona sulla schermata Home.</p>'
      : `<p>Attiva le notifiche per sapere quando ${C.others[0] ? esc(C.others[0].name) : 'l’altra persona'} ti scrive.</p><button class="btn primary sm" data-act="pushOn">Attiva</button>`;
  }
  function statusSheet() {
    const st = forestOf(C.uid).status, fresh = st && st.text && Date.now() - st.at < 12 * 3600e3;
    N.sheet(`<h2 style="text-align:center">Cosa stai facendo?</h2><p class="muted" style="text-align:center;margin-top:4px">${C.others.length ? 'Arriva come notifica a ' + esc(C.others.map((p) => p.name).join(', ')) + '.' : 'Arriverà all’altra persona appena entra.'}</p>
      <div class="ideas">${IDEAS.map((t) => `<button data-idea="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <label class="field" style="margin-top:14px">Oppure scrivilo tu<textarea class="input" id="statusIn" maxlength="120" placeholder="Es. ripasso il capitolo 4, poi ti chiamo">${esc(fresh ? st.text : '')}</textarea></label>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px"><button class="btn primary" data-act="sendStatus">Invia</button>${fresh ? '<button class="btn ghost" data-act="clearStatus">Togli lo stato</button>' : ''}</div>`);
  }
  async function meSheet() {
    const st = await N.pushState(); pushNow = st; renderBanner();
    N.sheet(`<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center">${N.avatar(C.me, 64)}<h2>${esc(C.me.name)}</h2><p class="muted small">${esc(C.email)}</p></div>
      <div class="card" style="margin-top:16px;padding-block:4px"><div class="set"><div class="lbl"><b>Notifiche su questo telefono</b><small>${esc(N.PUSH_TEXT[st] || '')}</small></div>${st === 'on' ? '<button class="btn quiet sm" data-act="pushOff">Spegni</button>' : st === 'off' || st === 'error' ? '<button class="btn primary sm" data-act="pushOn">Attiva</button>' : ''}</div>
      <div class="set"><div class="lbl"><b>Le app</b><small>Gli avvisi su pomodori e turni si regolano dentro Sottobosco, nel Diario.</small></div></div></div>
      <button class="btn quiet" data-act="signout" style="width:100%;margin-top:14px">Esci dall’account</button>
      <p class="foot" style="margin-top:14px">Nido · fatto per voi due</p>`);
  }
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('#statusBtn')) { statusSheet(); return; }
    if (t.closest('#meBtn')) { meSheet(); return; }
    const idea = t.closest('[data-idea]'); if (idea) { const ta = $('#statusIn'); if (ta) { ta.value = idea.dataset.idea; ta.focus(); } return; }
    const act = t.closest('[data-act]'); if (!act) return;
    const a = act.dataset.act;
    if (a === 'sendStatus') { const v = ($('#statusIn') || {}).value || ''; if (!v.trim()) return; act.disabled = true; try { await N.setStatus(v); N.closeSheet(); N.toast(C.others.length ? 'Inviato a ' + C.others.map((p) => p.name).join(', ') + '.' : 'Stato aggiornato.'); refresh(); } catch (err) { act.disabled = false; N.toast('Non riesco a inviarlo. Riprova.'); } }
    if (a === 'clearStatus') { await N.setStatus(''); N.closeSheet(); refresh(); }
    if (a === 'pushOn') { pushNow = await N.enablePush(); renderBanner(); N.toast(pushNow === 'on' ? 'Notifiche attive.' : N.PUSH_TEXT[pushNow]); if (!$('#scrim').hidden) meSheet(); }
    if (a === 'pushOff') { pushNow = await N.disablePush(); renderBanner(); meSheet(); }
    if (a === 'signout') N.signOut();
  });
  $('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') N.closeSheet(); });

  /* ---------- boot ---------- */
  nest($('#gateCv'), 150);
  (async () => {
    if (!SB) { showErr('L’app non è ancora collegata al suo database.'); return; }
    const { data } = await SB.auth.getSession();
    if (data.session) await enter().catch(() => {});
    $('#gate').classList.add('ready');
  })();
})();
