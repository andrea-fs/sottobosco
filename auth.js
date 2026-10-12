// Login gate + the small data layer the app talks to.
// The app was written against a document-store API (doc/collection/onSnapshot);
// this file maps that API onto the Supabase tables in supabase/schema.sql.
(function () {
  'use strict';
  const CFG = window.SOTTOBOSCO_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const configured = CFG.supabaseUrl && !/INSERISCI/.test(CFG.supabaseUrl);
  const SB = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }) : null;
  window.SB = SB;

  /* ---------- data layer ---------- */
  const errOf = (e) => ({ code: e && (e.code === '42501' || e.code === 'PGRST301') ? 'invalid_argument' : 'unavailable', message: (e && e.message) || 'errore' });
  const snap = (id, data) => ({ id, exists: data != null, data: () => (data == null ? undefined : data), metadata: { fromCache: false, hasPendingWrites: false } });
  function makeDb() {
    const watchers = [];
    let channel = null, timer = null;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => watchers.forEach((w) => w.run()), 250); };
    function ensureChannel() {
      if (channel) return;
      channel = SB.channel('bosco')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forests' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'months' }, refresh)
        .subscribe();
    }
    // iOS drops the live connection in the background: catch up when the app comes back.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('online', refresh);

    function doc(path) {
      const p = path.split('/');
      if (p[0] === 'forests' && p.length === 2) {
        return {
          async get() {
            const { data, error } = await SB.from('forests').select('data').eq('user_id', p[1]).maybeSingle();
            if (error) throw errOf(error);
            return snap(p[1], data ? data.data : null);
          },
          async set(d) {
            const { error } = await SB.from('forests').upsert({ user_id: p[1], data: d, updated_at: new Date().toISOString() });
            if (error) throw errOf(error);
          },
        };
      }
      if (p[0] === 'forests' && p.length === 4) {
        return {
          async get() {
            const { data, error } = await SB.from('months').select('list').eq('user_id', p[1]).eq('month', p[3]).maybeSingle();
            if (error) throw errOf(error);
            return snap(p[3], data ? { list: data.list } : null);
          },
          async set(d) {
            const { error } = await SB.from('months').upsert({ user_id: p[1], month: p[3], list: d.list || [], updated_at: new Date().toISOString() });
            if (error) throw errOf(error);
          },
        };
      }
      return { async get() { return snap(p[p.length - 1], null); }, async set() {} };
    }
    function collection(path) {
      const p = path.split('/');
      let fetcher = async () => [];
      if (path === 'forests') {
        fetcher = async () => {
          const { data, error } = await SB.from('forests').select('user_id,data');
          if (error) throw errOf(error);
          return data.map((r) => snap(r.user_id, r.data));
        };
      } else if (p[0] === 'forests' && p.length === 3) {
        fetcher = async () => {
          const { data, error } = await SB.from('months').select('month,list').eq('user_id', p[1]);
          if (error) throw errOf(error);
          return data.map((r) => snap(r.month, { list: r.list }));
        };
      }
      const result = (docs) => ({ docs, size: docs.length, empty: !docs.length });
      return {
        async get() { return result(await fetcher()); },
        onSnapshot(next) {
          ensureChannel();
          const w = { async run() { try { next(result(await fetcher())); } catch (e) { /* retried on next change */ } } };
          watchers.push(w);
          w.run();
          return () => { const i = watchers.indexOf(w); if (i >= 0) watchers.splice(i, 1); };
        },
      };
    }
    return { doc, collection };
  }
  function makeUser(uid) {
    let cache = null, cachedAt = 0;
    return {
      async id() { return uid; },
      async isOwner() { return true; },
      async canEdit() { return true; },
      async can() { return true; },
      async profiles(ids) {
        ids = [].concat(ids);
        if (!cache || Date.now() - cachedAt > 60000) {
          const { data } = await SB.from('profiles').select('id,name,color');
          cache = data || [];
          cachedAt = Date.now();
        }
        const out = {};
        ids.forEach((id) => {
          const r = cache.find((x) => x.id === id);
          out[id] = { id, name: r ? r.name : '', color: r ? r.color : '#7d8a84', avatarUrl: '', email: null, isMe: id === uid, guest: false };
        });
        return out;
      },
    };
  }

  /* ---------- gate ---------- */
  let mode = 'in', booted = false;
  function setMode(m) {
    mode = m;
    document.querySelectorAll('#gateTabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.g === m));
    $('#nameRow').hidden = m !== 'up';
    $('#gPass').autocomplete = m === 'up' ? 'new-password' : 'current-password';
    $('#gBtn').textContent = m === 'up' ? 'Crea il mio account' : 'Entra nel bosco';
    showErr('');
  }
  function showErr(m) { const e = $('#gErr'); e.textContent = m; e.hidden = !m; }
  const itErr = (m) => {
    m = String(m || '');
    if (/Invalid login/i.test(m)) return 'Email o password non corrette.';
    if (/already registered|already been registered/i.test(m)) return 'Esiste già un account con questa email: usa «Accedi».';
    if (/Password should be/i.test(m)) return 'La password deve avere almeno 6 caratteri.';
    if (/rate limit/i.test(m)) return 'Troppi tentativi ravvicinati. Riprova tra qualche minuto.';
    if (/Email not confirmed/i.test(m)) return 'L’email non è ancora confermata.';
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
      const res = mode === 'up'
        ? await SB.auth.signUp({ email, password, options: { data: { name } } })
        : await SB.auth.signInWithPassword({ email, password });
      if (res.error) throw res.error;
      if (!res.data.session) { showErr('Account creato. Ora accedi con email e password.'); setMode('in'); return; }
      await enter(res.data.session);
    } catch (err) { showErr(itErr(err.message)); }
    finally { btn.disabled = false; }
  });
  $('#gOut').addEventListener('click', async () => { await SB.auth.signOut(); location.reload(); });

  async function ensureProfile(user) {
    const { data } = await SB.from('profiles').select('id,name').eq('id', user.id).maybeSingle();
    if (data && data.name) return;
    const { count } = await SB.from('profiles').select('id', { count: 'exact', head: true });
    const name = (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0];
    await SB.from('profiles').upsert({ id: user.id, name, color: count ? '#d4517a' : '#2f8f5b' });
  }
  async function enter(session) {
    if (booted) return;
    const { data: ok } = await SB.rpc('is_member');
    if (!ok) { $('#gateForm').hidden = true; $('#gateTabs').hidden = true; $('#gateNo').hidden = false; $('#gateSub').textContent = session.user.email; return; }
    booted = true;
    await ensureProfile(session.user).catch(() => {});
    const uid = session.user.id;
    const db = makeDb(), user = makeUser(uid);
    window.claude = { use: async (n) => (n === 'db' ? db : n === 'user' ? user : null) };
    window.SOTTOBOSCO_USER = { id: uid, email: session.user.email };
    $('#gate').hidden = true;
    $('#app').hidden = false;
    const s = document.createElement('script');
    s.src = 'app.js?v=' + (CFG.version || 1);
    document.body.appendChild(s);
  }
  window.sottoboscoSignOut = async () => { try { await SB.auth.signOut(); } catch (e) {} location.reload(); };

  (async () => {
    drawGateArt();
    if (!SB) { showErr('L’app non è ancora collegata al suo database.'); return; }
    const { data } = await SB.auth.getSession();
    if (data.session) enter(data.session).catch(() => {});
  })();

  function drawGateArt() {
    const cv = $('#gateCv'); if (!cv) return;
    const d = Math.min(window.devicePixelRatio || 1, 3); cv.width = 160 * d; cv.height = 160 * d; cv.style.width = '160px'; cv.style.height = '160px';
    const c = cv.getContext('2d'); c.scale(d, d);
    c.fillStyle = '#6a4a33'; c.beginPath(); c.ellipse(80, 122, 52, 26, 0, 0, Math.PI); c.fill();
    c.fillStyle = '#8cc063'; c.beginPath(); c.ellipse(80, 120, 54, 14, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#4f8a3c'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(80, 120); c.quadraticCurveTo(84, 85, 78, 52); c.stroke();
    const leaf = (x, y, l, w, a, col) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(l * .3, -w, l * .75, -w * .8, l, 0); c.bezierCurveTo(l * .75, w * .8, l * .3, w, 0, 0); c.fill(); c.restore(); };
    leaf(81, 92, 34, 12, -0.5, '#5c9d48'); leaf(80, 100, 30, 11, -2.7, '#447d36');
    for (let i = 0; i < 14; i++) { c.save(); c.translate(78, 50); c.rotate(i * Math.PI / 7); c.fillStyle = i % 2 ? '#fdfdf8' : '#ebe7dc'; c.beginPath(); c.ellipse(13, 0, 12, 4, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.fillStyle = '#f0b42c'; c.beginPath(); c.arc(78, 50, 7, 0, Math.PI * 2); c.fill();
  }
})();
