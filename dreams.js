// Sogni — tap the face of the feeling and the dream is saved; a description is optional.
// Data: dreams (supabase/dreams.sql). Private dreams are visible only to whoever wrote them.
(function () {
  'use strict';
  const N = window.Nido, SB = N.SB, $ = N.$, esc = N.esc;
  let C = null, D = [];
  const MOODS = [
    ['joy', '😊', 'Gioia'], ['fun', '😂', 'Divertimento'], ['love', '🥰', 'Amore'], ['calm', '😌', 'Pace'],
    ['wonder', '😮', 'Stupore'], ['confused', '😵‍💫', 'Confusione'], ['anxiety', '😰', 'Ansia'], ['fear', '😨', 'Paura'],
    ['anger', '😠', 'Rabbia'], ['sad', '😢', 'Tristezza'], ['blank', '🌫️', 'Non ricordo'],
  ];
  const M = Object.fromEntries(MOODS.map(([k, e, n]) => [k, { e, n }]));
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  // a dream is about last night: the date of the morning after
  const tonight = () => iso(new Date());
  const nightLabel = (s) => { const b = new Date(s + 'T12:00:00'), a = new Date(b - 864e5); const t = tonight(); if (s === t) return 'Stanotte'; const y = new Date(); y.setDate(y.getDate() - 1); if (s === iso(y)) return 'Ieri notte'; return 'Notte tra ' + a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + a.toLocaleDateString('it-IT', { month: 'long' }) : '') + ' e ' + b.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }); };
  const person = (id) => C.people[id] || { name: 'Qualcuno', color: '#7d8a84' };
  const pname = (id) => (id === C.uid ? 'Tu' : person(id).name);

  async function load() {
    const { data, error } = await SB.from('dreams').select('*').order('night', { ascending: false }).order('created_at', { ascending: false }).limit(800);
    if (error) throw error;
    D = data || [];
    render();
  }
  let rt = null; const refresh = () => { clearTimeout(rt); rt = setTimeout(() => load().catch(() => {}), 300); };

  function render() {
    const t = tonight(), mineToday = D.filter((d) => d.user_id === C.uid && d.night === t);
    $('#moods').innerHTML = MOODS.map(([k, e, n]) => `<button class="mood" data-mood="${k}" aria-pressed="${mineToday.some((d) => d.mood === k)}"><span>${e}</span>${n}</button>`).join('');
    $('#logged').innerHTML = mineToday.length ? mineToday.map((d) => `<div class="logged"><span class="big">${M[d.mood].e}</span><div><b>${esc(M[d.mood].n)}</b><small>${d.note ? esc(d.note.slice(0, 60)) + (d.note.length > 60 ? '…' : '') : 'Nessuna descrizione'}</small></div><button class="btn sm" data-edit="${d.id}">${d.note ? 'Modifica' : 'Racconta'}</button></div>`).join('') : '';
    $('#tonightSub').textContent = mineToday.length ? 'Hai fatto un altro sogno? Tocca un’altra faccina.' : 'Tocca la faccina di come ti sei sentito. Basta questo.';
    // last 14 nights
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(iso(d)); }
    const ppl = [C.me].concat(C.others);
    $('#nights').innerHTML = '<span></span>' + days.map((d) => `<span class="d">${new Date(d + 'T12:00:00').getDate()}</span>`).join('') +
      ppl.map((p) => `<span class="who"><span class="dotc" style="width:8px;height:8px;background:${esc(p.color)}"></span>${esc(p.id === C.uid ? 'Tu' : p.name)}</span>` + days.map((d) => { const x = D.find((r) => r.user_id === p.id && r.night === d); return `<span class="cell${x ? ' on' : ''}" title="${x ? esc(M[x.mood].n) : ''}">${x ? M[x.mood].e : ''}</span>`; }).join('')).join('');
    // this month
    const ym = t.slice(0, 7), month = D.filter((d) => d.user_id === C.uid && d.night.startsWith(ym));
    const cnt = {}; month.forEach((d) => (cnt[d.mood] = (cnt[d.mood] || 0) + 1));
    $('#month').innerHTML = month.length ? Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="mchip"><span>${M[k].e}</span>${esc(M[k].n)} · ${n}</span>`).join('') : '<p class="small muted">Questo mese non hai ancora segnato sogni.</p>';
    $('#monthN').textContent = month.length ? month.length + (month.length === 1 ? ' sogno' : ' sogni') : '';
    // same feeling, same night
    const same = new Set(); D.filter((d) => d.user_id === C.uid).forEach((d) => { if (D.some((o) => o.user_id !== C.uid && o.night === d.night && o.mood === d.mood && d.mood !== 'blank')) same.add(d.night); });
    $('#same').hidden = !same.size || !C.others.length;
    $('#same').textContent = same.size ? `Avete sognato la stessa emozione nella stessa notte ${same.size === 1 ? 'una volta' : same.size + ' volte'}.` : '';
    // feed by night
    const nights = [...new Set(D.map((d) => d.night))];
    $('#feed').innerHTML = nights.length ? nights.slice(0, 60).map((n) => `<div class="night"><h3>${esc(nightLabel(n))}</h3><div class="list">${D.filter((d) => d.night === n).map((d) => `<button class="entry" ${d.user_id === C.uid ? `data-edit="${d.id}"` : 'tabindex="-1"'}><span class="em">${M[d.mood].e}</span><div style="min-width:0"><div class="meta"><span class="dotc" style="width:8px;height:8px;background:${esc(person(d.user_id).color)}"></span><b style="color:var(--ink)">${esc(pname(d.user_id))}</b> · ${esc(M[d.mood].n)}${d.private ? '<span class="lock">solo per te</span>' : ''}</div>${d.note ? `<p>${esc(d.note)}</p>` : ''}</div></button>`).join('')}</div></div>`).join('')
      : '<p class="empty">Qui finiranno i sogni di tutti e due, notte per notte.</p>';
  }

  async function quickSave(mood) {
    const row = { user_id: C.uid, night: tonight(), mood, note: '', private: false };
    const { data, error } = await SB.from('dreams').insert(row).select().single();
    if (error) { N.toast('Non riesco a salvare. Riprova.'); return; }
    D.unshift(data); render();
    if (mood !== 'blank') N.notify('auto', `Stanotte ha sognato: ${M[mood].e} ${M[mood].n.toLowerCase()}`, 'dreams.html');
    editSheet(data, true);
  }
  function editSheet(d, fresh) {
    N.sheet(`<div class="dsheet" data-id="${d.id}"><div class="head"><span class="em" id="dEm">${M[d.mood].e}</span><div><h2>${fresh ? 'Salvato' : esc(M[d.mood].n)}</h2><p class="muted small">${esc(nightLabel(d.night))}${fresh ? ' · ' + esc(M[d.mood].n) : ''}</p></div></div>
      <div class="pick" role="radiogroup" aria-label="Emozione">${MOODS.map(([k, e, n]) => `<button data-pick="${k}" aria-pressed="${d.mood === k}" aria-label="${n}">${e}</button>`).join('')}</div>
      <label class="field">Vuoi raccontarlo? (facoltativo)<textarea class="input" id="dNote" maxlength="2000" placeholder="Ero in una casa che non conoscevo, ma era la nostra…">${esc(d.note || '')}</textarea></label>
      <div class="set"><div class="lbl"><b>Solo per me</b><small>L’altra persona non lo vede</small></div><button class="switch" role="switch" id="dPriv" aria-checked="${!!d.private}" aria-label="Solo per me"></button></div>
      <div class="row2"><button class="btn dreamy" data-act="save">Fatto</button><button class="btn ghost danger" data-act="del">Elimina</button></div></div>`);
  }
  document.addEventListener('click', async (e) => {
    const t = e.target;
    const m = t.closest('[data-mood]'); if (m) { m.disabled = true; await quickSave(m.dataset.mood); m.disabled = false; return; }
    const ed = t.closest('[data-edit]'); if (ed && !t.closest('#sheet')) { const d = D.find((x) => x.id === ed.dataset.edit); if (d) editSheet(d); return; }
    const box = t.closest('.dsheet'); if (!box) return;
    const d = D.find((x) => x.id === box.dataset.id); if (!d) return;
    const pk = t.closest('[data-pick]'); if (pk) { d._mood = pk.dataset.pick; box.querySelectorAll('[data-pick]').forEach((b) => b.setAttribute('aria-pressed', b === pk)); $('#dEm').textContent = M[d._mood].e; return; }
    if (t.closest('#dPriv')) { const s = $('#dPriv'); s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true'); return; }
    if (t.closest('[data-act="save"]')) {
      const patch = { mood: d._mood || d.mood, note: $('#dNote').value.trim().slice(0, 2000), private: $('#dPriv').getAttribute('aria-checked') === 'true' };
      const { error } = await SB.from('dreams').update(patch).eq('id', d.id);
      if (error) { N.toast('Non riesco a salvare. Riprova.'); return; }
      Object.assign(d, patch); delete d._mood; N.closeSheet(); render(); N.toast('Sogno salvato.'); return;
    }
    if (t.closest('[data-act="del"]')) { const { error } = await SB.from('dreams').delete().eq('id', d.id); if (error) { N.toast('Non riesco a eliminarlo.'); return; } D = D.filter((x) => x.id !== d.id); N.closeSheet(); render(); N.toast('Eliminato.'); }
  });
  $('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') N.closeSheet(); });

  function stars() {
    const cv = $('#stars'), r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = r.width * dpr; cv.height = r.height * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, r.width, r.height);
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) { c.fillStyle = `rgba(255,255,255,${.25 + rnd() * .6})`; c.beginPath(); c.arc(rnd() * r.width, rnd() * r.height * .9, rnd() * 1.3 + .3, 0, 7); c.fill(); }
    c.fillStyle = '#f4ecc8'; c.beginPath(); c.arc(r.width - 34, 30, 15, 0, 7); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(r.width - 27, 25, 13, 0, 7); c.fill();
  }

  (async () => {
    try {
      C = await N.require(); if (!C) return;
      $('#boot').hidden = true; $('#app').hidden = false;
      await load(); requestAnimationFrame(stars);
      let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(stars, 200); });
      const ch = SB.channel('sogni'); ch.on('postgres_changes', { event: '*', schema: 'public', table: 'dreams' }, refresh); ch.subscribe();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    } catch (e) { $('#boot').textContent = 'Non riesco ad aprire i sogni. Controlla la connessione e riprova.'; }
  })();
})();
