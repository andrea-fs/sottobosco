// Nido core: one Supabase client, session + membership check, people, small UI helpers,
// notifications between the two of you. Loaded by every page before its own script.
(function () {
  'use strict';
  const CFG = window.SOTTOBOSCO_CONFIG || {};
  const configured = CFG.supabaseUrl && !/INSERISCI/.test(CFG.supabaseUrl);
  const SB = configured ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }) : null;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- session ---------- */
  let ctx = null;
  async function loadPeople() {
    const { data } = await SB.from('profiles').select('id,name,color');
    const people = {};
    (data || []).forEach((p) => { people[p.id] = { id: p.id, name: p.name || 'Qualcuno', color: p.color || '#7d8a84' }; });
    return people;
  }
  // Resolves the signed-in member, or sends the visitor to the hub (which shows the login).
  async function require(opts) {
    opts = opts || {};
    if (ctx) return ctx;
    if (!SB) throw new Error('not_configured');
    const { data } = await SB.auth.getSession();
    const session = data.session;
    const bounce = () => { if (!opts.noRedirect) location.replace('./'); return null; };
    if (!session) return bounce();
    const { data: ok } = await SB.rpc('is_member');
    if (!ok) return bounce();
    const people = await loadPeople().catch(() => ({}));
    const user = session.user;
    if (!people[user.id]) people[user.id] = { id: user.id, name: (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0], color: '#2f8f5b' };
    ctx = { SB, user, uid: user.id, email: user.email, people, me: people[user.id], others: Object.values(people).filter((p) => p.id !== user.id) };
    return ctx;
  }
  async function refreshPeople() { if (!ctx) return; const p = await loadPeople().catch(() => null); if (p) { Object.assign(ctx.people, p); ctx.me = ctx.people[ctx.uid]; ctx.others = Object.values(ctx.people).filter((x) => x.id !== ctx.uid); } }
  async function signOut() { try { await SB.auth.signOut(); } catch (e) {} location.replace('./'); }

  /* ---------- UI helpers (pages provide #scrim/#sheet/#toast) ---------- */
  let toastT = null;
  function toast(m) { const t = $('#toast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2800); }
  function sheet(html) { $('#sheet').innerHTML = '<div class="grab"></div>' + html; $('#scrim').hidden = false; $('#sheet').scrollTop = 0; }
  function closeSheet() { $('#scrim').hidden = true; $('#sheet').innerHTML = ''; }
  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'adesso'; if (m < 60) return m + ' min fa';
    const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' ora fa' : ' ore fa');
    const d = Math.round(h / 24); return d === 1 ? 'ieri' : d + ' giorni fa';
  }
  const initial = (name) => (String(name || '?').trim()[0] || '?').toUpperCase();
  function avatar(p, size) { size = size || 40; return `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .45)}px;background:${esc(p ? p.color : '#7d8a84')}">${esc(initial(p && p.name))}</span>`; }

  /* ---------- talking to each other ---------- */
  function notify(kind, text, url) {
    try { if (SB && text) SB.functions.invoke('notify', { body: { kind, text: String(text).slice(0, 200), url } }).catch(() => {}); } catch (e) {}
  }
  // The "what are you doing" status lives in the Sottobosco profile row, so every app shows the same one.
  async function setStatus(text) {
    text = String(text || '').trim().slice(0, 120);
    const c = await require();
    const { data } = await SB.from('forests').select('data').eq('user_id', c.uid).maybeSingle();
    const d = (data && data.data) || {};
    d.status = text ? { text, at: Date.now() } : null;
    d.updatedAt = Date.now();
    await SB.from('forests').upsert({ user_id: c.uid, data: d, updated_at: new Date().toISOString() });
    if (text) notify('status', text);
  }

  /* ---------- push on this device ---------- */
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function u8(b64) { b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '='; const s = atob(b64); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
  async function saveSub(sub) { try { const c = await require({ noRedirect: true }); if (!c) return; const j = sub.toJSON(); await SB.from('push_subs').upsert({ endpoint: j.endpoint, user_id: c.uid, sub: j }); } catch (e) {} }
  async function pushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return standalone() ? 'unsupported' : 'install';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(no, 5000))]);
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') { saveSub(sub); return 'on'; }
    } catch (e) {}
    return 'off';
  }
  async function enablePush() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(CFG.vapidPublicKey) });
      await saveSub(sub); return 'on';
    } catch (e) { return 'error'; }
  }
  async function disablePush() {
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await SB.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); } } catch (e) {}
    return 'off';
  }
  const PUSH_TEXT = {
    on: 'Attive su questo telefono.', off: 'Spente su questo telefono.',
    install: 'Su iPhone le notifiche funzionano solo dall’app sulla schermata Home: apri Nido da lì.',
    denied: 'Le hai bloccate. Riattivale da Impostazioni › Notifiche.', unsupported: 'Questo telefono non supporta le notifiche web (serve iOS 16.4 o successivo).',
    error: 'Non sono riuscito ad attivarle. Riprova tra poco.', unknown: 'Controllo…',
  };

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  window.Nido = { SB, CFG, configured, $, esc, require, refreshPeople, signOut, toast, sheet, closeSheet, ago, avatar, initial, notify, setStatus, pushState, enablePush, disablePush, PUSH_TEXT, standalone };
})();
