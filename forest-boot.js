// Sottobosco boot: waits for the signed-in member (core/core.js), then hands the app
// a document-store API (doc/collection/onSnapshot) mapped onto the Supabase tables.
(function () {
  'use strict';
  const SB = window.Nido && window.Nido.SB;
  window.SB = SB;
  const $ = (s) => document.querySelector(s);
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


  (async () => {
    const c = await window.Nido.require();
    if (!c) return;
    const db = makeDb(), user = makeUser(c.uid);
    window.claude = { use: async (n) => (n === 'db' ? db : n === 'user' ? user : null) };
    window.SOTTOBOSCO_USER = { id: c.uid, email: c.email };
    $('#app').hidden = false;
    const s = document.createElement('script');
    s.src = 'app.js?v=' + ((window.SOTTOBOSCO_CONFIG || {}).version || 1);
    document.body.appendChild(s);
  })();
})();
