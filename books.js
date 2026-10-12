// Biblioteca — the books you two read.
// Data: books (shared catalogue), readings (one row per person per book), book_notes (quotes,
// comments, recommendations), reading_goals. See supabase/books.sql.
(function () {
  'use strict';
  const N = window.Nido, SB = N.SB, $ = N.$, esc = N.esc;
  let C = null;
  const D = { books: [], readings: [], notes: [], goals: [] };
  const UI = { view: 'shelf', who: 'all', sort: 'recent', q: '', year: new Date().getFullYear(), openId: null };
  const STATUS = { want: 'Da leggere', reading: 'Sto leggendo', read: 'Letto', dnf: 'Abbandonato' };
  const STATUS_SHORT = { want: 'Da leggere', reading: 'Lo leggo', read: 'Letto', dnf: 'Mollato' };
  const MONTHS = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fmtRate = (r) => (r == null ? '' : String(Number(r)).replace('.', ','));
  const fmtDate = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const ICON = {
    star: '<path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6L2.5 9.5l6.6-.8z"/>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 3 1.5-1.9 3-3 5.1-3 3.9 0 6 4 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7z"/></svg>',
    timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17l9-10"/></svg>',
    pile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="15" width="18" height="5" rx="1"/><rect x="5" y="10" width="15" height="5" rx="1"/><rect x="4" y="5" width="14" height="5" rx="1"/></svg>',
  };

  /* ---------- look of a book: cloth colour, decoration, size ---------- */
  const CLOTH = [
    ['#7b2d26', '#f1e4cf'], ['#2e4a6b', '#efe6d2'], ['#3d5a40', '#f0e8d4'], ['#c99a2e', '#2a2016'], ['#2f6b6b', '#eef0e4'],
    ['#e6dcc6', '#3a2c22'], ['#5b3a5e', '#f1e6dc'], ['#a4532d', '#f6eadb'], ['#34343a', '#e9dfc8'], ['#8c7a5b', '#1f1a14'],
    ['#b8475a', '#fbeee6'], ['#4a6d8c', '#f4ecdf'], ['#1f3a33', '#e6d8b8'], ['#d7c49a', '#2c241a'],
  ];
  function hash(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function look(b) {
    const h = hash(b.title + '|' + b.author);
    const [bg, ink] = CLOTH[h % CLOTH.length];
    const pages = b.pages || 260;
    return { bg, ink, v: 'v' + (h >> 4) % 4, w: Math.round(Math.max(24, Math.min(58, 20 + pages / 15))), h: 152 + ((h >> 8) % 5) * 7 };
  }
  function cover(b, wpx) {
    const l = look(b);
    const gen = `<div class="gencover" style="--bg-c:${l.bg};--ink-c:${l.ink};--gc-size:${Math.max(9, Math.round(wpx / 7))}px"><span class="gc-t">${esc(b.title)}</span><span class="gc-a">${esc(b.author)}</span></div>`;
    const img = b.cover_url ? `<img src="${esc(b.cover_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    return `<div class="cover" style="width:${wpx}px">${gen}${img}</div>`;
  }
  function stars(val, opts) {
    opts = opts || {};
    let h = `<span class="stars${opts.sm ? ' sm' : ''}" ${opts.input ? 'role="radiogroup" aria-label="Voto"' : `aria-label="${val ? fmtRate(val) + ' stelle su 5' : 'Nessun voto'}"`}>`;
    for (let i = 1; i <= 5; i++) {
      const fill = val ? Math.max(0, Math.min(1, val - (i - 1))) : 0;
      h += `<span class="star"><svg viewBox="0 0 24 24" aria-hidden="true"><g class="s-off" stroke-width="1">${ICON.star}</g></svg><span class="fill" style="width:${fill * 100}%"><svg viewBox="0 0 24 24" aria-hidden="true"><g class="s-on" stroke-width="1">${ICON.star}</g></svg></span>`;
      if (opts.input) h += `<button class="l" data-rate="${i - .5}" aria-label="${fmtRate(i - .5)} stelle"></button><button class="r" data-rate="${i}" aria-label="${i} ${i === 1 ? 'stella' : 'stelle'}"></button>`;
      h += '</span>';
    }
    return h + '</span>';
  }

  /* ---------- data ---------- */
  const book = (id) => D.books.find((b) => b.id === id);
  const readingsOf = (id) => D.readings.filter((r) => r.book_id === id);
  const mine = (id) => D.readings.find((r) => r.book_id === id && r.user_id === C.uid);
  const person = (id) => C.people[id] || { name: 'Qualcuno', color: '#7d8a84' };
  const pname = (id) => (id === C.uid ? 'Tu' : person(id).name);
  const pcolor = (id) => person(id).color;
  const whoOk = (uid) => UI.who === 'all' || (UI.who === 'me' ? uid === C.uid : uid === UI.who);
  const yearOf = (r) => Number(String(r.finished_on || r.updated_at || '').slice(0, 4)) || new Date().getFullYear();
  const urlOf = (id) => 'books.html#b=' + id;

  async function load() {
    const [b, r, n, g] = await Promise.all([
      SB.from('books').select('*'),
      SB.from('readings').select('*'),
      SB.from('book_notes').select('*').order('created_at', { ascending: true }),
      SB.from('reading_goals').select('*'),
    ]);
    const err = b.error || r.error || n.error || g.error;
    if (err) throw err;
    D.books = b.data || []; D.readings = r.data || []; D.notes = n.data || []; D.goals = g.data || [];
    render();
    if (UI.openId && !$('#scrim').hidden && book(UI.openId)) refreshDetail();
  }
  let rt = null;
  const refresh = () => { clearTimeout(rt); rt = setTimeout(() => load().catch(() => {}), 300); };
  function live() {
    const ch = SB.channel('biblioteca');
    ['books', 'readings', 'book_notes', 'reading_goals'].forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, refresh));
    ch.subscribe();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  }
  function fail(error) { N.toast('Non riesco a salvare. ' + (error && /fetch|network/i.test(error.message || '') ? 'Controlla la connessione.' : 'Riprova tra poco.')); }

  async function saveReading(bookId, patch, silent) {
    const cur = mine(bookId) || { book_id: bookId, user_id: C.uid, status: 'want', rating: null, review: '', fav: false, progress: 0, started_on: null, finished_on: null };
    const row = Object.assign({}, cur, patch, { updated_at: new Date().toISOString() });
    const { error } = await SB.from('readings').upsert(row);
    if (error) { fail(error); return false; }
    const i = D.readings.findIndex((r) => r.book_id === bookId && r.user_id === C.uid);
    if (i >= 0) D.readings[i] = row; else D.readings.push(row);
    if (!silent) { render(); refreshDetail(); }
    return true;
  }
  async function setStatus(bookId, status) {
    const b = book(bookId), cur = mine(bookId), patch = { status };
    if (status === 'reading' && !(cur && cur.started_on)) patch.started_on = today();
    if (status === 'read') { if (!(cur && cur.finished_on)) patch.finished_on = today(); if (b.pages) patch.progress = b.pages; }
    if (status === 'want') patch.finished_on = null;
    const was = cur && cur.status;
    if (!(await saveReading(bookId, patch))) return;
    if (status === 'reading' && was !== 'reading') N.notify('auto', `Ha iniziato a leggere «${b.title}»`, urlOf(bookId));
    if (status === 'read' && was !== 'read') { N.notify('auto', `Ha finito di leggere «${b.title}»`, urlOf(bookId)); N.toast('Finito! Dagli le stelle qui sotto.'); }
  }
  async function addNote(bookId, kind, text, page) {
    text = String(text || '').trim().slice(0, 1000);
    if (!text) return false;
    const { data, error } = await SB.from('book_notes').insert({ book_id: bookId, user_id: C.uid, kind, text, page: page || null }).select().single();
    if (error) { fail(error); return false; }
    D.notes.push(data); render(); refreshDetail();
    return true;
  }

  /* ---------- views ---------- */
  function render() {
    const yr = new Date().getFullYear();
    const readMine = D.readings.filter((r) => r.user_id === C.uid && r.status === 'read' && yearOf(r) === yr).length;
    $('#bkSub').textContent = D.books.length ? `${D.books.length} ${D.books.length === 1 ? 'libro' : 'libri'} · ${readMine} letti da te nel ${yr}` : 'La vostra libreria';
    renderWho();
    if (UI.view === 'shelf') renderShelf();
    if (UI.view === 'pile') renderPile();
    if (UI.view === 'quotes') renderQuotes();
    if (UI.view === 'year') renderYear();
  }
  function renderWho() {
    const opts = [['all', 'Insieme'], ['me', 'Tu']].concat(C.others.map((p) => [p.id, p.name]));
    if (UI.who !== 'all' && UI.who !== 'me' && !C.people[UI.who]) UI.who = 'all';
    $('#who').hidden = !C.others.length;
    $('#who').innerHTML = opts.map(([k, l]) => `<button role="tab" data-who="${esc(k)}" aria-selected="${UI.who === k}">${k !== 'all' ? `<span class="dotc" style="width:8px;height:8px;background:${esc(k === 'me' ? C.me.color : pcolor(k))}"></span> ` : ''}${esc(l)}</button>`).join('');
  }

  function renderShelf() {
    // nightstand: everything someone is reading now
    const reading = D.readings.filter((r) => r.status === 'reading' && whoOk(r.user_id));
    const byBook = {};
    reading.forEach((r) => { (byBook[r.book_id] = byBook[r.book_id] || []).push(r); });
    const ids = Object.keys(byBook).sort((a, b) => (byBook[b][0].updated_at || '').localeCompare(byBook[a][0].updated_at || ''));
    $('#nsCount').textContent = ids.length ? ids.length + (ids.length === 1 ? ' libro aperto' : ' libri aperti') : '';
    $('#nightstand').innerHTML = ids.length ? ids.map((id) => {
      const b = book(id); if (!b) return '';
      const lines = byBook[id].map((r) => {
        const pct = b.pages ? Math.min(100, Math.round((r.progress || 0) / b.pages * 100)) : Math.min(100, r.progress || 0);
        const where = b.pages ? `pag. ${r.progress || 0} di ${b.pages}` : `${pct}%`;
        return `<div class="ns-who"><span class="dotc" style="width:8px;height:8px;background:${esc(pcolor(r.user_id))}"></span>${esc(pname(r.user_id))} · ${where}</div><div class="bar"><i style="width:${pct}%;background:${esc(pcolor(r.user_id))}"></i></div>`;
      }).join('');
      return `<button class="ns-card" data-b="${b.id}">${cover(b, 78)}<div class="ns-info"><b>${esc(b.title)}</b><span class="au">${esc(b.author)}</span>${lines}</div></button>`;
    }).join('') : `<div class="ns-empty">Nessun libro aperto. Quando ne iniziate uno, segnatelo come «Sto leggendo» e comparirà qui.</div>`;

    // the bookcase: finished (or abandoned) books, grouped by year
    const q = UI.q.trim().toLowerCase();
    const done = D.readings.filter((r) => (r.status === 'read' || r.status === 'dnf') && whoOk(r.user_id));
    const map = {};
    done.forEach((r) => { const b = book(r.book_id); if (!b) return; if (q && !(b.title + ' ' + b.author).toLowerCase().includes(q)) return; (map[b.id] = map[b.id] || { b, rs: [] }).rs.push(r); });
    const list = Object.values(map);
    list.forEach((x) => {
      x.year = Math.max(...x.rs.map(yearOf));
      x.when = x.rs.map((r) => r.finished_on || r.updated_at || '').sort().pop();
      const rated = x.rs.filter((r) => r.rating != null);
      x.avg = rated.length ? rated.reduce((t, r) => t + Number(r.rating), 0) / rated.length : 0;
    });
    const cmp = {
      recent: (a, b) => b.when.localeCompare(a.when),
      rating: (a, b) => b.avg - a.avg || b.when.localeCompare(a.when),
      title: (a, b) => a.b.title.localeCompare(b.b.title, 'it'),
      author: (a, b) => (surname(a.b.author)).localeCompare(surname(b.b.author), 'it') || a.b.title.localeCompare(b.b.title, 'it'),
    }[UI.sort];
    const box = $('#shelves');
    if (!list.length) {
      box.innerHTML = q
        ? `<div class="empty"><p>Nessun libro letto corrisponde a «${esc(UI.q)}».</p></div>`
        : `<div class="empty"><div class="case" style="max-width:420px"><div class="case-row"><div class="books" style="min-height:120px;justify-content:center;align-items:center;color:#cdb79a;font-size:14px;padding:0 20px">Lo scaffale aspetta il primo libro finito.</div><div class="plank"></div></div></div><button class="btn primary" data-act="add">Aggiungi un libro</button></div>`;
      return;
    }
    const years = [...new Set(list.map((x) => x.year))].sort((a, b) => b - a);
    const width = Math.max(240, box.clientWidth - 36);
    box.innerHTML = years.map((y) => {
      const items = list.filter((x) => x.year === y).sort(cmp);
      return `<div class="yearhead"><h3>${y}</h3><span>${items.length} ${items.length === 1 ? 'libro' : 'libri'}</span></div><div class="case">${packRows(items, width).map((row, ri) => rowHtml(row, ri, width)).join('')}</div>`;
    }).join('<div style="height:16px"></div>');
  }
  const surname = (a) => { const p = String(a || '').split(',')[0].trim().split(/\s+/); return p[p.length - 1] || ''; };
  function packRows(items, width) {
    const rows = []; let row = [], used = 0;
    items.forEach((x) => { const w = look(x.b).w + 2; if (used + w > width && row.length) { rows.push(row); row = []; used = 0; } row.push(x); used += w; });
    if (row.length) rows.push(row);
    return rows;
  }
  const DECO = [
    '<svg width="34" height="46" viewBox="0 0 34 46" aria-hidden="true"><path d="M7 30h20l-2.5 15h-15z" fill="#b5653a"/><rect x="5" y="27" width="24" height="5" rx="1.5" fill="#c97a4a"/><path d="M17 28c0-9-6-12-11-13 2 6 5 10 11 13zM17 28c0-11 5-17 12-18-1 8-5 14-12 18zM17 28c-1-8 1-15 1-22 3 6 2 15-1 22z" fill="#6aa653"/></svg>',
    '<svg width="22" height="64" viewBox="0 0 22 64" aria-hidden="true"><path d="M2 64V20q0-4 4-4h12v48z" fill="#8a8f96"/><path d="M6 16 18 4v12z" fill="#a3a8ae"/></svg>',
    '<svg width="40" height="30" viewBox="0 0 40 30" aria-hidden="true"><rect x="2" y="20" width="36" height="9" rx="1" fill="#2e4a6b"/><rect x="5" y="12" width="31" height="8" rx="1" fill="#c99a2e"/><rect x="3" y="4" width="33" height="8" rx="1" fill="#7b2d26"/></svg>',
  ];
  function rowHtml(row, ri, width) {
    const used = row.reduce((t, x) => t + look(x.b).w + 2, 0), free = width - used;
    return `<div class="case-row"><div class="books">${row.map((x, i) => {
      const l = look(x.b), last = row.length > 2 && i === row.length - 1 && free > 34;
      const dots = x.rs.filter((r) => r.status === 'read').map((r) => `<i style="background:${esc(pcolor(r.user_id))}"></i>`).join('');
      return `<button class="spine ${l.v}${l.w < 30 ? ' thin' : ''}${last ? ' lean' : ''}" data-b="${x.b.id}" style="--bg-c:${l.bg};--ink-c:${l.ink};width:${l.w}px;height:${l.h}px" aria-label="${esc(x.b.title)}${x.b.author ? ' di ' + esc(x.b.author) : ''}"><span class="sp-t">${esc(x.b.title)}</span><span class="sp-a">${esc(surname(x.b.author))}</span><span class="sp-dots">${dots}</span></button>`;
    }).join('')}${free > 60 ? `<span class="deco">${DECO[(ri + row.length) % DECO.length]}</span>` : ''}</div><div class="plank"></div></div>`;
  }

  function renderPile() {
    const recs = D.notes.filter((n) => n.kind === 'rec' && n.user_id !== C.uid).filter((n) => { const m = mine(n.book_id); return book(n.book_id) && (!m || m.status === 'want'); });
    const seenRec = new Set();
    const recHtml = recs.reverse().filter((n) => !seenRec.has(n.book_id) && seenRec.add(n.book_id)).map((n) => {
      const b = book(n.book_id);
      return `<button class="rec" data-b="${b.id}">${cover(b, 56)}<div><b>${esc(b.title)}</b><p>${esc(n.text)}</p><small><span class="dotc" style="width:8px;height:8px;background:${esc(pcolor(n.user_id))}"></span>Consigliato da ${esc(person(n.user_id).name)} · ${N.ago(new Date(n.created_at).getTime())}</small></div></button>`;
    }).join('');
    const pileOf = (uid) => D.readings.filter((r) => r.user_id === uid && r.status === 'want').sort((a, b) => (a.updated_at || '').localeCompare(b.updated_at || '')).map((r) => book(r.book_id)).filter(Boolean);
    const pileHtml = (books) => {
      if (!books.length) return '<p class="muted small" style="text-align:center;padding:10px 0">La pila è vuota.</p>';
      return `<div class="pile">${books.map((b, i) => { const l = look(b), h = hash(b.id); const w = 70 + (h % 26), off = (h >> 5) % 5, rot = (((h >> 9) % 7) - 3) * .35; return `<button class="slab" data-b="${b.id}" style="--bg-c:${l.bg};--ink-c:${l.ink};width:${w}%;transform:translateX(${off}%) rotate(${rot}deg)"><b>${esc(b.title)}</b><span>${esc(surname(b.author))}</span></button>`; }).join('')}</div><div class="table-top"></div>`;
    };
    const people = [C.me].concat(C.others).filter((p) => whoOk(p.id) || UI.who === 'all');
    $('#pile').innerHTML = (recHtml ? `<div class="pile-sec"><div class="sec"><h2>Consigliati a te</h2></div>${recHtml}</div>` : '') +
      people.map((p) => { const books = pileOf(p.id); return `<div class="pile-sec"><div class="sec"><h2>${p.id === C.uid ? 'La tua pila' : 'La pila di ' + esc(p.name)}</h2><p class="muted small">${books.length} ${books.length === 1 ? 'libro' : 'libri'}</p></div>${pileHtml(books)}</div>`; }).join('') +
      `<button class="btn quiet" data-act="add" style="align-self:center">${ICON.pile}Aggiungi alla pila</button>`;
  }

  function renderQuotes() {
    const qs = D.notes.filter((n) => n.kind === 'quote' && book(n.book_id) && whoOk(n.user_id)).slice().reverse();
    $('#quotes').innerHTML = qs.length ? qs.map((n) => { const b = book(n.book_id); return `<button class="quote" data-b="${b.id}"><blockquote>${esc(n.text)}</blockquote><figcaption><span>— <b>${esc(b.title)}</b>${n.page ? ', p. ' + n.page : ''}</span><span>·</span><span class="dotc" style="width:8px;height:8px;background:${esc(pcolor(n.user_id))}"></span>${esc(pname(n.user_id))}</figcaption></button>`; }).join('')
      : '<div class="empty" style="column-span:all"><p>Le frasi che vi colpiscono finiscono qui. Aggiungile dalla scheda di un libro, con la pagina.</p></div>';
  }

  function renderYear() {
    const y = UI.year;
    const allYears = D.readings.filter((r) => r.status === 'read').map(yearOf);
    const minY = Math.min(new Date().getFullYear(), ...(allYears.length ? allYears : [y]));
    $('#yLabel').textContent = y;
    $('#yPrev').disabled = y <= minY;
    $('#yNext').disabled = y >= new Date().getFullYear();
    const readIn = (uid) => D.readings.filter((r) => r.user_id === uid && r.status === 'read' && yearOf(r) === y);
    const people = [C.me].concat(C.others);
    const cards = people.map((p) => {
      const rs = readIn(p.id), goal = (D.goals.find((g) => g.user_id === p.id && g.year === y) || {}).target;
      const pages = rs.reduce((t, r) => t + ((book(r.book_id) || {}).pages || 0), 0);
      const rated = rs.filter((r) => r.rating != null), avg = rated.length ? rated.reduce((t, r) => t + Number(r.rating), 0) / rated.length : 0;
      const top = rated.slice().sort((a, b) => b.rating - a.rating || (b.finished_on || '').localeCompare(a.finished_on || ''))[0];
      const pct = goal ? Math.min(1, rs.length / goal) : 0, R = 42, L = 2 * Math.PI * R;
      return `<div class="card pcard"><div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--surface2)" stroke-width="9"/><circle cx="50" cy="50" r="${R}" fill="none" stroke="${esc(p.color)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${L * pct} ${L}"/></svg><div><b>${rs.length}</b><span>${goal ? 'di ' + goal : 'libri'}</span></div></div>
        <div class="pstats"><h3>${N.avatar(p, 24)}${esc(p.id === C.uid ? 'Tu' : p.name)}</h3><span>${pages ? pages.toLocaleString('it-IT') + ' pagine' : 'Nessuna pagina ancora'}${avg ? ' · media ' + fmtRate(Math.round(avg * 10) / 10) + '★' : ''}</span>${top ? `<span class="top">Il preferito: <b>«${esc(book(top.book_id).title)}»</b> ${fmtRate(top.rating)}★</span>` : ''}${p.id === C.uid ? `<button class="btn ghost sm" data-act="goal" style="align-self:flex-start;padding:0">${goal ? 'Cambia obiettivo' : 'Imposta un obiettivo'}</button>` : ''}</div></div>`;
    }).join('');
    // books per month, stacked per person
    const counts = people.map((p) => { const m = Array(12).fill(0); readIn(p.id).forEach((r) => { const mo = Number(String(r.finished_on || r.updated_at).slice(5, 7)) - 1; if (mo >= 0) m[mo]++; }); return { p, m }; });
    const tot = Array(12).fill(0).map((_, i) => counts.reduce((t, c) => t + c.m[i], 0));
    const mx = Math.max(2, ...tot);
    const X0 = 22, X1 = 314, Y0 = 130, Y1 = 14, bw = (X1 - X0) / 12;
    let svg = `<line x1="${X0}" x2="${X1}" y1="${Y0}" y2="${Y0}" stroke="var(--line)"/><line x1="${X0}" x2="${X1}" y1="${Y1}" y2="${Y1}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${X0 - 6}" y="${Y1 + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${mx}</text><text x="${X0 - 6}" y="${Y0 + 4}" text-anchor="end" font-size="10" fill="var(--muted)">0</text>`;
    for (let i = 0; i < 12; i++) {
      let base = Y0; const x = X0 + i * bw + bw * .18, w = bw * .64;
      counts.forEach((c) => { if (!c.m[i]) return; const h = (Y0 - Y1) * c.m[i] / mx; svg += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="3" fill="${esc(c.p.color)}"/>`; base -= h; });
      if (tot[i]) svg += `<text x="${x + w / 2}" y="${base - 4}" text-anchor="middle" font-size="10" fill="var(--ink)">${tot[i]}</text>`;
      svg += `<text x="${x + w / 2}" y="${Y0 + 15}" text-anchor="middle" font-size="10.5" fill="var(--muted)">${MONTHS[i]}</text>`;
    }
    // read by both, top authors
    const both = D.books.filter((b) => people.length > 1 && people.every((p) => readIn(p.id).some((r) => r.book_id === b.id)));
    const auth = {};
    people.forEach((p) => readIn(p.id).forEach((r) => { const a = (book(r.book_id) || {}).author; if (a) auth[a] = (auth[a] || 0) + 1; }));
    const topA = Object.entries(auth).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = people.reduce((t, p) => t + readIn(p.id).length, 0);
    $('#year').innerHTML = `<div class="pcards">${cards}</div>
      <div class="card chart"><div class="sec" style="margin-bottom:8px"><h2 style="font-size:18px">Mese per mese</h2><p class="muted small">${total} ${total === 1 ? 'libro' : 'libri'} in tutto</p></div><svg viewBox="0 0 320 152" role="img" aria-label="Libri finiti per mese nel ${y}">${svg}</svg></div>
      ${both.length ? `<div class="card"><h2 style="font-size:18px;margin-bottom:10px">Letti da tutti e due</h2><div class="both">${both.map((b) => `<button data-b="${b.id}">${cover(b, 40)}<div style="min-width:0"><b style="font-family:var(--font-display);font-weight:400">${esc(b.title)}</b><div class="muted small">${esc(b.author)}</div></div><div class="mini-stars">${people.map((p) => { const r = readIn(p.id).find((x) => x.book_id === b.id); return `<span><span class="dotc" style="width:7px;height:7px;background:${esc(p.color)}"></span> ${r && r.rating ? fmtRate(r.rating) + '★' : '—'}</span>`; }).join('')}</div></button>`).join('')}</div></div>` : ''}
      ${topA.length ? `<div class="card"><h2 style="font-size:18px;margin-bottom:6px">Autori del ${y}</h2><ul class="authors">${topA.map(([a, n]) => `<li><span>${esc(a)}</span><span class="muted">${n} ${n === 1 ? 'libro' : 'libri'}</span></li>`).join('')}</ul></div>` : ''}
      ${!total ? `<div class="empty"><p>Nel ${y} non avete ancora finito libri. Segnatene uno come «Letto» e l’anno comincia a riempirsi.</p></div>` : ''}`;
  }

  /* ---------- detail sheet ---------- */
  function openBook(id) {
    const b = book(id); if (!b) return;
    UI.openId = id;
    N.sheet(`<div id="bd" data-id="${id}">${detailHtml(b)}</div>`);
    if (location.hash !== '#b=' + id) history.replaceState(null, '', '#b=' + id);
    const sp = document.querySelector(`.spine[data-b="${id}"]`); if (sp) { sp.classList.add('pulled'); setTimeout(() => sp.classList.remove('pulled'), 600); }
  }
  function refreshDetail() {
    const el = $('#bd'); if (!el || !book(el.dataset.id)) return;
    const active = document.activeElement;
    if (active && el.contains(active) && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) return; // don't wipe what is being typed
    const sh = $('#sheet'), top = sh.scrollTop;
    el.innerHTML = detailHtml(book(el.dataset.id));
    sh.scrollTop = top;
  }
  function detailHtml(b) {
    const m = mine(b.id), st = m ? m.status : null;
    const others = readingsOf(b.id).filter((r) => r.user_id !== C.uid);
    const notes = D.notes.filter((n) => n.book_id === b.id);
    const quotes = notes.filter((n) => n.kind === 'quote'), comments = notes.filter((n) => n.kind === 'comment' || n.kind === 'rec');
    const meta = [b.year, b.pages ? b.pages + ' pagine' : ''].filter(Boolean).join(' · ');
    const chips = readingsOf(b.id).map((r) => `<span class="chip"><span class="dotc" style="width:8px;height:8px;background:${esc(pcolor(r.user_id))}"></span>${esc(pname(r.user_id))}: ${STATUS[r.status].toLowerCase()}${r.rating ? ' · ' + fmtRate(r.rating) + '★' : ''}</span>`).join('');
    let mineHtml = `<div class="seg stseg" role="tablist">${Object.keys(STATUS).map((k) => `<button data-status="${k}" aria-selected="${st === k}">${STATUS_SHORT[k]}</button>`).join('')}</div>`;
    if (st === 'reading') {
      const max = b.pages || 100, val = Math.min(m.progress || 0, max);
      mineHtml += `<div class="rowline"><input type="range" class="grow" id="prog" min="0" max="${max}" value="${val}" aria-label="Pagina"><span class="small muted" id="progLbl">${b.pages ? 'pag.' : ''}</span><input class="pagein" id="progN" type="number" inputmode="numeric" min="0" max="${max}" value="${val}" aria-label="${b.pages ? 'Pagina' : 'Percentuale'}">${b.pages ? '' : '<span class="small muted">%</span>'}</div>
        <a class="btn quiet" href="forest.html?tag=2&note=${encodeURIComponent('Lettura: ' + b.title)}">${ICON.timer}Leggi con il timer di Sottobosco</a>`;
    }
    if (st === 'read' || st === 'dnf') {
      mineHtml += `<div class="rowline">${st === 'read' ? `<div class="grow">${stars(m.rating, { input: true })}</div>` : '<span class="grow small muted">Mollato. Capita, e va bene così.</span>'}<button class="heart" data-act="fav" aria-pressed="${!!m.fav}" aria-label="Tra i preferiti">${ICON.heart}</button></div>
        <label class="field">${st === 'read' ? 'Finito il' : 'Lasciato il'}<input class="input" type="date" id="finDate" value="${esc(m.finished_on || '')}" max="${today()}"></label>`;
    }
    if (st) mineHtml += `<label class="field">${st === 'want' ? 'Perché vuoi leggerlo?' : st === 'reading' ? 'Impressioni finora' : 'Cosa ne pensi?'}<textarea class="input" id="review" maxlength="2000" placeholder="${st === 'read' ? 'Quello che ti è rimasto, senza spoiler se lei non l’ha ancora letto' : 'Scrivi pure, lo vede anche l’altra persona'}">${esc(m.review || '')}</textarea></label>
      <button class="btn ghost sm" data-act="unmine" style="align-self:flex-start;padding:0">Togli dalla mia lista</button>`;
    else mineHtml += '<p class="small muted">Scegli a che punto sei con questo libro.</p>';

    const othersHtml = others.map((r) => `<div class="other"><div class="who"><span class="dotc" style="background:${esc(pcolor(r.user_id))}"></span>${esc(person(r.user_id).name)} · ${STATUS[r.status].toLowerCase()}${r.fav ? ' · tra i preferiti' : ''}</div>${r.status === 'read' && r.rating ? stars(Number(r.rating), { sm: true }) : ''}${r.status === 'reading' && b.pages ? `<span class="small muted">pag. ${r.progress || 0} di ${b.pages}</span>` : ''}${r.review ? `<p>${esc(r.review)}</p>` : ''}${r.finished_on && (r.status === 'read' || r.status === 'dnf') ? `<span class="small muted">${fmtDate(r.finished_on)}</span>` : ''}</div>`).join('');

    const quotesHtml = quotes.map((n) => `<div class="qitem"><p>${esc(n.text)}</p><small><span class="dotc" style="width:7px;height:7px;background:${esc(pcolor(n.user_id))}"></span>${esc(pname(n.user_id))}${n.page ? ' · p. ' + n.page : ''}</small>${n.user_id === C.uid ? `<button class="del" data-del="${n.id}" aria-label="Elimina citazione">${ICON.x}</button>` : ''}</div>`).join('');
    const chatHtml = comments.map((n) => `<div class="bubble ${n.user_id === C.uid ? 'me' : 'them'}">${n.kind === 'rec' ? '<b>Consiglio · </b>' : ''}${esc(n.text)}<small>${n.user_id === C.uid ? '' : esc(person(n.user_id).name) + ' · '}${N.ago(new Date(n.created_at).getTime())}</small></div>`).join('');
    const partner = C.others[0];
    const partnerHas = partner && readingsOf(b.id).some((r) => r.user_id === partner.id);

    return `<div class="bd-head">${cover(b, 110)}<div><h2>${esc(b.title)}</h2>${b.author ? `<p class="au">${esc(b.author)}</p>` : ''}${meta ? `<p class="bd-meta">${esc(meta)}</p>` : ''}<div class="chips">${chips}</div></div></div>
      <section class="bd-sec"><h3>La tua lettura</h3>${mineHtml}</section>
      ${othersHtml ? `<section class="bd-sec"><h3>${others.length === 1 ? 'La lettura di ' + esc(person(others[0].user_id).name) : 'Le altre letture'}</h3>${othersHtml}</section>` : ''}
      <section class="bd-sec"><h3>Citazioni</h3>${quotesHtml || '<p class="small muted">Una frase che vale la pena ricordare?</p>'}
        <textarea class="input" id="qText" maxlength="1000" placeholder="Scrivi la citazione" style="min-height:70px"></textarea>
        <div class="rowline"><input class="pagein" id="qPage" type="number" inputmode="numeric" min="1" placeholder="pag." aria-label="Pagina"><span class="grow"></span><button class="btn quiet sm" data-act="quote">Salva la citazione</button></div></section>
      <section class="bd-sec"><h3>Parliamone</h3>${chatHtml ? `<div class="chat">${chatHtml}</div>` : '<p class="small muted">Il vostro club del libro a due: domande, teorie, parti preferite.</p>'}
        <div class="sendrow"><textarea class="input" id="cText" maxlength="1000" rows="1" placeholder="Scrivi un messaggio" style="min-height:44px"></textarea><button class="btn primary sm" data-act="comment" aria-label="Invia" style="min-height:44px">${ICON.send}</button></div></section>
      <section class="bd-sec"><div class="actions">${partner && !partnerHas ? `<button class="btn quiet sm" data-act="rec">Consiglialo a ${esc(partner.name)}</button>` : ''}<button class="btn quiet sm" data-act="edit">Modifica dati</button><button class="btn ghost sm danger" data-act="remove">Rimuovi</button></div><div id="bdExtra"></div></section>`;
  }

  /* ---------- adding a book ---------- */
  let found = [], picked = null, searchT = null, searchAbort = null;
  function addSheet(prefill) {
    picked = null; found = [];
    N.sheet(`<h2>Aggiungi un libro</h2><div class="search" style="margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input class="input" id="addQ" type="search" placeholder="Titolo, autore o ISBN" autocomplete="off" enterkeyhint="search" value="${esc(prefill || '')}"></div>
      <div class="results" id="addRes"><p class="hint">Cerco nelle librerie online: copertina, autore e pagine arrivano da soli.</p></div>
      <button class="btn ghost" data-act="manual" style="width:100%;margin-top:6px">Non lo trovi? Inseriscilo a mano</button>`);
    setTimeout(() => { const i = $('#addQ'); if (i) { i.focus(); if (prefill) runSearch(prefill); } }, 250);
  }
  async function searchBooks(q, signal) {
    const out = [];
    try {
      const r = await fetch('https://www.googleapis.com/books/v1/volumes?q=' + encodeURIComponent(q) + '&maxResults=15&printType=books&fields=items(id,volumeInfo(title,subtitle,authors,publishedDate,pageCount,imageLinks,industryIdentifiers))', { signal });
      if (r.ok) {
        const j = await r.json();
        (j.items || []).forEach((it) => {
          const v = it.volumeInfo || {}; if (!v.title) return;
          const img = v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail);
          const isbn = (v.industryIdentifiers || []).find((x) => x.type === 'ISBN_13') || (v.industryIdentifiers || [])[0];
          out.push({ source_id: 'g:' + it.id, title: v.title + (v.subtitle && v.title.length < 40 ? ': ' + v.subtitle : ''), author: (v.authors || []).join(', '), year: parseInt(v.publishedDate, 10) || null, pages: v.pageCount || null, cover_url: img ? img.replace(/^http:/, 'https:').replace('&edge=curl', '') : null, isbn: isbn ? isbn.identifier : null });
        });
      }
    } catch (e) { if (e.name === 'AbortError') throw e; }
    if (out.length) return out;
    const r = await fetch('https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=12&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn', { signal });
    if (!r.ok) return out;
    const j = await r.json();
    (j.docs || []).forEach((d) => out.push({ source_id: 'ol:' + d.key, title: d.title, author: (d.author_name || []).slice(0, 2).join(', '), year: d.first_publish_year || null, pages: d.number_of_pages_median || null, cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null, isbn: (d.isbn || [])[0] || null }));
    return out;
  }
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const existing = (x) => D.books.find((b) => (x.source_id && b.source_id === x.source_id) || (norm(b.title) === norm(x.title) && norm(surname(b.author)) === norm(surname(x.author))));
  async function runSearch(q) {
    const box = $('#addRes'); if (!box) return;
    q = q.trim();
    if (q.length < 2) { box.innerHTML = '<p class="hint">Cerco nelle librerie online: copertina, autore e pagine arrivano da soli.</p>'; return; }
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();
    box.innerHTML = '<p class="hint">Cerco…</p>';
    try {
      found = await searchBooks(q, searchAbort.signal);
      if (!$('#addRes')) return;
      box.innerHTML = found.length ? found.map((x, i) => { const ex = existing(x); return `<button class="res" data-pick="${i}">${cover(x, 46)}<div style="min-width:0"><b>${esc(x.title)}</b><span>${esc([x.author, x.year, x.pages ? x.pages + ' pag.' : ''].filter(Boolean).join(' · '))}</span></div>${ex ? '<em>Già in biblioteca</em>' : ''}</button>`; }).join('')
        : '<p class="hint">Nessun risultato. Prova con il cognome dell’autore, oppure inseriscilo a mano.</p>';
    } catch (e) { if (e.name !== 'AbortError' && $('#addRes')) box.innerHTML = '<p class="hint">La ricerca non risponde. Controlla la connessione o inseriscilo a mano.</p>'; }
  }
  function chooseSheet(x) {
    picked = x;
    N.sheet(`<h2>Com’è per te?</h2><div class="picked">${cover(x, 70)}<div><b style="font-family:var(--font-display);font-weight:400;font-size:18px">${esc(x.title)}</b><p class="muted small">${esc([x.author, x.year].filter(Boolean).join(' · '))}</p></div></div>
      <div class="choose"><button class="btn quiet" data-create="reading">${ICON.book}Lo sto leggendo</button><button class="btn quiet" data-create="read">${ICON.check}L’ho già letto</button><button class="btn quiet" data-create="want">${ICON.pile}Voglio leggerlo</button></div>`);
  }
  function manualSheet(b) {
    const edit = !!b; b = b || {};
    N.sheet(`<h2>${edit ? 'Modifica il libro' : 'Inserisci a mano'}</h2><form class="form" id="manForm" novalidate>
      <label class="field">Titolo<input class="input" id="mTitle" required maxlength="300" value="${esc(b.title || '')}"></label>
      <label class="field">Autore<input class="input" id="mAuthor" maxlength="200" value="${esc(b.author || '')}"></label>
      <div class="two"><label class="field">Pagine<input class="input" id="mPages" type="number" inputmode="numeric" min="1" value="${esc(b.pages || '')}"></label><label class="field">Anno<input class="input" id="mYear" type="number" inputmode="numeric" min="1" max="2100" value="${esc(b.year || '')}"></label></div>
      <p class="small" id="mErr" style="color:var(--danger)" hidden></p>
      <button class="btn primary" type="submit">${edit ? 'Salva' : 'Continua'}</button></form>`);
    $('#manForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const x = { title: $('#mTitle').value.trim(), author: $('#mAuthor').value.trim(), pages: parseInt($('#mPages').value, 10) || null, year: parseInt($('#mYear').value, 10) || null };
      if (!x.title) { const m = $('#mErr'); m.textContent = 'Serve almeno il titolo.'; m.hidden = false; return; }
      if (edit) {
        const { error } = await SB.from('books').update(x).eq('id', b.id);
        if (error) return fail(error);
        Object.assign(book(b.id), x); render(); openBook(b.id); N.toast('Salvato.');
      } else chooseSheet(Object.assign({ source_id: null, cover_url: null, isbn: null }, x));
    });
  }
  async function createFrom(x, status) {
    let b = existing(x);
    if (!b) {
      const row = { title: x.title.slice(0, 300), author: (x.author || '').slice(0, 200), year: x.year, pages: x.pages, cover_url: x.cover_url, isbn: x.isbn, source_id: x.source_id, added_by: C.uid };
      const { data, error } = await SB.from('books').insert(row).select().single();
      if (error) {
        if (x.source_id) { const r = await SB.from('books').select('*').eq('source_id', x.source_id).maybeSingle(); if (r.data) b = r.data; }
        if (!b) return fail(error);
      } else b = data;
      if (!book(b.id)) D.books.push(b);
    }
    await setStatus(b.id, status);
    openBook(b.id);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const bEl = t.closest('[data-b]'); if (bEl && !t.closest('#sheet')) { openBook(bEl.dataset.b); return; }
    if (t.closest('[data-b]') && t.closest('#sheet')) { openBook(t.closest('[data-b]').dataset.b); return; }
    const tab = t.closest('#tabs [data-v]'); if (tab) { show(tab.dataset.v); return; }
    const w = t.closest('[data-who]'); if (w) { UI.who = w.dataset.who; render(); return; }
    if (t.closest('[data-act="add"]') || t.closest('#addBtn')) { addSheet(); return; }
    if (t.closest('#yPrev')) { UI.year--; renderYear(); return; }
    if (t.closest('#yNext')) { UI.year++; renderYear(); return; }
    if (t.closest('[data-act="goal"]')) { goalSheet(); return; }
  });
  $('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') closeAll(); });
  function closeAll() { flushTyping(); N.closeSheet(); UI.openId = null; if (location.hash) history.replaceState(null, '', location.pathname); }
  $('#sheet').addEventListener('click', async (e) => {
    const t = e.target, id = UI.openId;
    const pick = t.closest('[data-pick]'); if (pick) { const x = found[+pick.dataset.pick]; const ex = existing(x); if (ex) openBook(ex.id); else chooseSheet(x); return; }
    const cr = t.closest('[data-create]'); if (cr && picked) { cr.disabled = true; await createFrom(picked, cr.dataset.create); return; }
    if (t.closest('[data-act="manual"]')) { manualSheet(null, $('#addQ') && $('#addQ').value); return; }
    const sb = t.closest('[data-status]'); if (sb && id) { flushTyping(); await setStatus(id, sb.dataset.status); return; }
    const rate = t.closest('[data-rate]'); if (rate && id) { const v = Number(rate.dataset.rate), m = mine(id); await saveReading(id, { rating: m && Number(m.rating) === v ? null : v }); if (!(m && Number(m.rating) === v)) N.notify('auto', `Ha dato ${fmtRate(v)}★ a «${book(id).title}»`, urlOf(id)); return; }
    if (t.closest('[data-act="fav"]') && id) { const m = mine(id); await saveReading(id, { fav: !(m && m.fav) }); return; }
    if (t.closest('[data-act="unmine"]') && id) { const { error } = await SB.from('readings').delete().eq('book_id', id).eq('user_id', C.uid); if (error) return fail(error); D.readings = D.readings.filter((r) => !(r.book_id === id && r.user_id === C.uid)); render(); refreshDetail(); return; }
    if (t.closest('[data-act="quote"]') && id) { const ok = await addNote(id, 'quote', $('#qText').value, parseInt($('#qPage').value, 10)); if (ok) { $('#qText').value = ''; $('#qPage').value = ''; refreshDetail(); N.toast('Citazione salvata.'); } return; }
    if (t.closest('[data-act="comment"]') && id) { const txt = $('#cText').value; const ok = await addNote(id, 'comment', txt); if (ok) { $('#cText').value = ''; refreshDetail(); N.notify('status', `Su «${book(id).title}»: ${txt.trim()}`, urlOf(id)); } return; }
    const del = t.closest('[data-del]'); if (del) { const nid = del.dataset.del; const { error } = await SB.from('book_notes').delete().eq('id', nid); if (error) return fail(error); D.notes = D.notes.filter((n) => n.id !== nid); render(); refreshDetail(); return; }
    if (t.closest('[data-act="rec"]') && id) { const p = C.others[0]; $('#bdExtra').innerHTML = `<div class="form"><label class="field">Perché dovrebbe leggerlo ${esc(p.name)}?<textarea class="input" id="recText" maxlength="500" placeholder="Una riga basta"></textarea></label><button class="btn primary" data-act="recSend">Consiglialo</button></div>`; $('#recText').focus(); return; }
    if (t.closest('[data-act="recSend"]') && id) { const txt = ($('#recText').value || '').trim() || 'Secondo me ti piace.'; const ok = await addNote(id, 'rec', txt); if (ok) { N.notify('status', `Ti consiglia «${book(id).title}»: ${txt}`, urlOf(id)); N.toast('Consiglio mandato.'); } return; }
    if (t.closest('[data-act="edit"]') && id) { manualSheet(book(id)); return; }
    if (t.closest('[data-act="remove"]') && id) { $('#bdExtra').innerHTML = `<div class="confirm"><p class="small">Rimuovo «${esc(book(id).title)}» dalla biblioteca per tutti e due, con letture, citazioni e messaggi. Non si può annullare.</p><div class="actions"><button class="btn quiet sm" data-act="keep">Tienilo</button><button class="btn sm danger" data-act="removeYes">Rimuovi</button></div></div>`; return; }
    if (t.closest('[data-act="keep"]')) { $('#bdExtra').innerHTML = ''; return; }
    if (t.closest('[data-act="removeYes"]') && id) { const { error } = await SB.from('books').delete().eq('id', id); if (error) return fail(error); D.books = D.books.filter((b) => b.id !== id); D.readings = D.readings.filter((r) => r.book_id !== id); D.notes = D.notes.filter((n) => n.book_id !== id); closeAll(); render(); N.toast('Rimosso.'); return; }
    const g = t.closest('[data-goal]'); if (g) { const v = Math.max(1, Math.min(366, (Number($('#goalN').textContent) || 12) + Number(g.dataset.goal))); $('#goalN').textContent = v; return; }
    if (t.closest('[data-act="goalSave"]')) { const v = Number($('#goalN').textContent); const { error } = await SB.from('reading_goals').upsert({ user_id: C.uid, year: UI.year, target: v }); if (error) return fail(error); const i = D.goals.findIndex((x) => x.user_id === C.uid && x.year === UI.year); const row = { user_id: C.uid, year: UI.year, target: v }; if (i >= 0) D.goals[i] = row; else D.goals.push(row); N.closeSheet(); render(); N.toast('Obiettivo salvato: ' + v + ' libri.'); return; }
  });
  $('#sheet').addEventListener('input', (e) => {
    if (e.target.id === 'addQ') { clearTimeout(searchT); const v = e.target.value; searchT = setTimeout(() => runSearch(v), 450); }
    if (e.target.id === 'prog') { $('#progN').value = e.target.value; }
    if (e.target.id === 'progN') { const r = $('#prog'); if (r) r.value = e.target.value; }
  });
  $('#sheet').addEventListener('change', async (e) => {
    const id = UI.openId; if (!id) return;
    if (e.target.id === 'prog' || e.target.id === 'progN') { const b = book(id), max = b.pages || 100; const v = Math.max(0, Math.min(max, parseInt(e.target.value, 10) || 0)); await saveReading(id, { progress: v }, true); render(); if (b.pages && v >= b.pages) N.toast('Ultima pagina! Segnalo come «Letto» quando vuoi.'); }
    if (e.target.id === 'finDate') await saveReading(id, { finished_on: e.target.value || null }, true), render();
    if (e.target.id === 'review') await saveReading(id, { review: e.target.value.slice(0, 2000) }, true);
  });
  $('#sheet').addEventListener('keydown', (e) => { if (e.target.id === 'addQ' && e.key === 'Enter') { e.preventDefault(); clearTimeout(searchT); runSearch(e.target.value); } });
  function flushTyping() { const r = $('#review'); if (r && UI.openId) { const m = mine(UI.openId); if (m && (m.review || '') !== r.value) saveReading(UI.openId, { review: r.value.slice(0, 2000) }, true); } }
  function goalSheet() {
    const cur = (D.goals.find((g) => g.user_id === C.uid && g.year === UI.year) || {}).target || 12;
    N.sheet(`<h2>Obiettivo ${UI.year}</h2><p class="muted" style="margin-top:4px">Quanti libri vuoi finire quest’anno? Lo vede anche l’altra persona.</p>
      <div class="rowline" style="justify-content:center;gap:18px;margin:22px 0"><button class="iconbtn" data-goal="-1" aria-label="Meno">−</button><b id="goalN" style="font-family:var(--font-display);font-weight:400;font-size:44px;min-width:70px;text-align:center">${cur}</b><button class="iconbtn" data-goal="1" aria-label="Più">+</button></div>
      <button class="btn primary" data-act="goalSave" style="width:100%">Salva l’obiettivo</button>`);
  }
  function show(v) {
    UI.view = v;
    document.querySelectorAll('.view').forEach((s) => (s.hidden = s.id !== 'v-' + v));
    document.querySelectorAll('#tabs [data-v]').forEach((b) => b.setAttribute('aria-selected', b.dataset.v === v));
    $('#main').scrollTop = 0;
    render();
  }
  $('#q').addEventListener('input', (e) => { UI.q = e.target.value; renderShelf(); });
  $('#sort').addEventListener('change', (e) => { UI.sort = e.target.value; renderShelf(); });
  let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (UI.view === 'shelf') renderShelf(); }, 150); });

  /* ---------- boot ---------- */
  (async () => {
    try {
      C = await N.require();
      if (!C) return;
      $('#boot').hidden = true; $('#app').hidden = false;
      await load();
      live();
      const m = /^#b=([0-9a-f-]{36})$/.exec(location.hash);
      if (m && book(m[1])) openBook(m[1]);
    } catch (e) {
      $('#boot').textContent = 'Non riesco ad aprire la biblioteca. Controlla la connessione e riprova.';
    }
  })();
})();
