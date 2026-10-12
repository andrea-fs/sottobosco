// Atlante — the places you two have been to, the trips there, and the ones you dream of.
// Data: places, trips, trip_photos, atlas_home (see supabase/atlas.sql); photos in the private "atlas" bucket.
// Map: d3-geo with Natural Earth (flat, pinch to zoom) or orthographic (globe, drag to turn).
(function () {
  'use strict';
  const N = window.Nido, SB = N.SB, $ = N.$, esc = N.esc;
  let C = null, META = {}, WORLD = [];
  const D = { places: [], trips: [], photos: [], home: null };
  const UI = { view: 'map', proj: 'flat', who: 'all', routes: true, focus: null, openId: null };
  const urls = {};
  const DAY = 864e5;
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = () => iso(new Date());

  /* ---------- transports ---------- */
  const TR = {
    plane: { n: 'Aereo', dash: '7 6', svg: '<path fill="currentColor" stroke="none" d="M12 2c.8 0 1.3.8 1.3 2v5.2l7.2 4.3v2l-7.2-2.2v4.6l2.2 1.6v1.6L12 20.2l-3.5.9v-1.6l2.2-1.6v-4.6l-7.2 2.2v-2l7.2-4.3V4c0-1.2.5-2 1.3-2z"/>' },
    train: { n: 'Treno', dash: '', svg: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9 21l1.5-4.5M15 21l-1.5-4.5"/><circle cx="9.2" cy="13" r=".7"/><circle cx="14.8" cy="13" r=".7"/>' },
    car: { n: 'Auto', dash: '', svg: '<path d="M4 16v-3.5L6.2 7h11.6L20 12.5V16z"/><path d="M4 12.5h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>' },
    ship: { n: 'Nave', dash: '1.5 5', svg: '<path d="M3 14l2.2 5h13.6L21 14z"/><path d="M6 14V9h12v5M12 9V4"/>' },
    bus: { n: 'Bus', dash: '12 4', svg: '<rect x="5" y="3" width="14" height="14" rx="2.5"/><path d="M5 10h14M8 20.5V17M16 20.5V17"/>' },
    bike: { n: 'Bici', dash: '2 4', svg: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l2 7h-6M14 6h2"/>' },
    walk: { n: 'A piedi', dash: '1 4', svg: '<circle cx="13" cy="4" r="2"/><path d="M11 21l1.5-6-2-2.5 1-5 3 3 3 1M10.5 7.5 7 10v3M12.5 15l3 6"/>' },
  };
  const trIcon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(TR[k] || TR.plane).svg}</svg>`;
  const HEART = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 3 1.5-1.9 3-3 5.1-3 3.9 0 6 4 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const CAMERA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  const SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
  const CONT = { EU: 'Europa', AS: 'Asia', AF: 'Africa', NA: 'Nord America', SA: 'Sud America', OC: 'Oceania', AN: 'Antartide' };

  /* ---------- small helpers ---------- */
  const flag = (cc) => (META[cc] && META[cc].f) || '';
  const countryName = (cc, fallback) => (META[cc] && META[cc].n) || fallback || cc;
  const place = (id) => D.places.find((p) => p.id === id);
  const tripsOf = (pid) => D.trips.filter((t) => t.place_id === pid && whoOk(t)).sort((a, b) => b.start_on.localeCompare(a.start_on));
  const allTripsOf = (pid) => D.trips.filter((t) => t.place_id === pid).sort((a, b) => b.start_on.localeCompare(a.start_on));
  const planned = (t) => t.start_on > today();
  const whoOk = (t) => UI.who === 'all' || (t.people || []).includes(UI.who === 'me' ? C.uid : UI.who);
  const everyone = () => [C.uid].concat(C.others.map((p) => p.id));
  const together = (ids) => everyone().every((id) => ids.includes(id));
  const colorFor = (ids) => (ids.length > 1 && together(ids) ? 'var(--both)' : ids.length === 1 && C.people[ids[0]] ? C.people[ids[0]].color : 'var(--both)');
  const pname = (id) => (id === C.uid ? 'Tu' : (C.people[id] || {}).name || 'Qualcuno');
  function km(a, b) { const R = 6371, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r; const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  const fmtKm = (n) => Math.round(n).toLocaleString('it-IT') + ' km';
  function dms(lat, lon) { const f = (v, p, n) => { const a = Math.abs(v), d = Math.floor(a), m = Math.round((a - d) * 60); return `${d}°${String(m === 60 ? 59 : m).padStart(2, '0')}′${v >= 0 ? p : n}`; }; return f(lat, 'N', 'S') + ' ' + f(lon, 'E', 'O'); }
  const dt = (s) => new Date(s + 'T12:00:00');
  function fmtRange(a, b) {
    const A = dt(a);
    if (!b || b === a) return A.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    const B = dt(b);
    if (A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth()) return `${A.getDate()}–${B.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    if (A.getFullYear() === B.getFullYear()) return `${A.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} – ${B.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    return `${A.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })} – ${B.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  const days = (t) => Math.max(1, Math.round((dt(t.end_on || t.start_on) - dt(t.start_on)) / DAY) + 1);
  function countdown(t) { const n = Math.round((dt(t.start_on) - dt(today())) / DAY); return n <= 0 ? 'si parte oggi' : n === 1 ? 'domani' : 'tra ' + n + ' giorni'; }
  const originOf = (t) => (t.origin_lat != null ? [t.origin_lon, t.origin_lat] : D.home ? [D.home.lon, D.home.lat] : null);
  const originName = (t) => t.origin_name || (D.home ? D.home.name : '');
  const hearts = (n) => (n ? '♥'.repeat(n) + '<span style="opacity:.25">' + '♥'.repeat(5 - n) + '</span>' : '');
  const urlOf = (pid) => 'atlas.html#p=' + pid;
  function fail(e) { N.toast('Non riesco a salvare. ' + (e && /fetch|network/i.test(e.message || '') ? 'Controlla la connessione.' : 'Riprova tra poco.')); }

  /* ---------- data ---------- */
  async function load() {
    const [p, t, ph, h] = await Promise.all([
      SB.from('places').select('*'), SB.from('trips').select('*'), SB.from('trip_photos').select('*').order('created_at', { ascending: true }),
      SB.from('atlas_home').select('*').maybeSingle(),
    ]);
    const err = p.error || t.error || ph.error;
    if (err) throw err;
    D.places = p.data || []; D.trips = t.data || []; D.photos = ph.data || []; D.home = h.data || null;
    await signPhotos();
    render();
    if (UI.openId && !$('#scrim').hidden && place(UI.openId) && $('#pl')) openPlace(UI.openId, null, true);
  }
  async function signPhotos() {
    const need = D.photos.map((x) => x.path).filter((p) => !urls[p]);
    if (!need.length) return;
    const { data } = await SB.storage.from('atlas').createSignedUrls(need, 6 * 3600);
    (data || []).forEach((x) => { if (x.signedUrl) urls[x.path] = x.signedUrl; });
  }
  let rt = null; const refresh = () => { clearTimeout(rt); rt = setTimeout(() => load().catch(() => {}), 300); };
  function live() {
    const ch = SB.channel('atlante');
    ['places', 'trips', 'trip_photos', 'atlas_home'].forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, refresh));
    ch.subscribe();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  }

  /* ---------- derived numbers ---------- */
  function stats() {
    const done = D.trips.filter((t) => !planned(t) && whoOk(t));
    const visited = [...new Set(done.map((t) => t.place_id))].map(place).filter(Boolean);
    const countries = [...new Set(visited.map((p) => p.country_code).filter(Boolean))];
    const conts = [...new Set(countries.map((c) => (META[c] || {}).c).filter(Boolean))];
    let dist = 0; const byTr = {};
    done.forEach((t) => { const o = originOf(t), p = place(t.place_id); if (!o || !p) return; const d = km(o, [p.lon, p.lat]) * 2; dist += d; byTr[t.transport] = (byTr[t.transport] || 0) + d; });
    return { done, visited, countries, conts, dist, byTr, daysOut: done.reduce((n, t) => n + days(t), 0) };
  }

  /* ---------- map ---------- */
  let svg, gRoot, gLand, gOver, projection, path, zoom, T = d3.zoomIdentity, W = 0, H = 0, spin = null, lastT = null;
  function initMap() {
    svg = d3.select('#map');
    buildMap();
    let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (UI.view === 'map') buildMap(); }, 200); });
  }
  function visitedCodes() { return new Set(stats().countries.map((c) => (META[c] || {}).id).filter(Boolean)); }
  function dreamCodes(v) { return new Set(D.places.filter((p) => p.wish && !allTripsOf(p.id).some((t) => !planned(t))).map((p) => (META[p.country_code] || {}).id).filter((id) => id && !v.has(id))); }
  function buildMap() {
    const box = $('#mapView').getBoundingClientRect();
    W = Math.max(200, box.width); H = Math.max(200, box.height);
    svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
    if (spin) { spin.stop(); spin = null; }
    svg.on('.zoom', null);
    const defs = svg.append('defs');
    defs.append('pattern').attr('id', 'dreamHatch').attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)')
      .call((p) => { p.append('rect').attr('width', 6).attr('height', 6).attr('fill', 'var(--land)'); p.append('rect').attr('width', 2).attr('height', 6).attr('fill', 'var(--visited)').attr('opacity', .55); });
    const globe = UI.proj === 'globe';
    projection = globe ? d3.geoOrthographic().clipAngle(90) : d3.geoNaturalEarth1();
    projection.fitExtent([[12, 12], [W - 12, H - 12]], { type: 'Sphere' });
    if (globe) { const c = D.home ? [-D.home.lon, -Math.max(-50, Math.min(50, D.home.lat)) * .6] : [-12, -30]; projection.rotate(c); }
    path = d3.geoPath(projection);
    gRoot = svg.append('g');
    gRoot.append('path').attr('class', 'sphere').datum({ type: 'Sphere' });
    gRoot.append('path').attr('class', 'grat').datum(d3.geoGraticule10());
    const v = visitedCodes(), dr = dreamCodes(v);
    gLand = gRoot.append('g').selectAll('path').data(WORLD).join('path').attr('class', (f) => 'land' + (v.has(f.id) ? ' visited' : dr.has(f.id) ? ' dream' : ''));
    gOver = svg.append('g');
    gRoot.selectAll('path').attr('d', path);
    if (globe) {
      const base = projection.scale();
      zoom = d3.zoom().scaleExtent([.75, 7]).on('start', () => { if (spin) { spin.stop(); spin = null; } }).on('zoom', (e) => {
        const t = e.transform;
        if (lastT && e.sourceEvent) { const r = projection.rotate(), f = 0.25 / t.k; projection.rotate([r[0] + (t.x - lastT.x) * f, Math.max(-85, Math.min(85, r[1] - (t.y - lastT.y) * f))]); }
        lastT = t; projection.scale(base * t.k); redrawGlobe();
      });
      lastT = d3.zoomIdentity; svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) spin = d3.timer((el) => { const r = projection.rotate(); projection.rotate([r[0] + 0.06, r[1]]); redrawGlobe(); if (el > 60000) spin.stop(); });
    } else {
      zoom = d3.zoom().scaleExtent([1, 40]).translateExtent([[0, 0], [W, H]]).on('zoom', (e) => { T = e.transform; gRoot.attr('transform', T); drawOverlay(); });
      svg.call(zoom);
      fitAll(false);
    }
    drawOverlay();
  }
  function redrawGlobe() { gRoot.selectAll('path').attr('d', path); drawOverlay(); }
  function screen(ll) {
    if (UI.proj === 'globe') { const rot = projection.rotate(); if (d3.geoDistance(ll, [-rot[0], -rot[1]]) > Math.PI / 2 - .02) return null; return projection(ll); }
    const p = projection(ll); return p ? T.apply(p) : null;
  }
  function routeD(a, b) {
    if (UI.proj === 'globe') return path({ type: 'LineString', coordinates: [a, b] }) || '';
    const ip = d3.geoInterpolate(a, b); let d = '', prev = null;
    for (let i = 0; i <= 48; i++) { const p = projection(ip(i / 48)); if (!p) continue; const s = T.apply(p); d += (prev && Math.abs(s[0] - prev[0]) < W * .4 ? 'L' : 'M') + s[0].toFixed(1) + ',' + s[1].toFixed(1); prev = s; }
    return d;
  }
  function pinsData() {
    const out = [];
    D.places.forEach((p) => {
      const ts = tripsOf(p.id), done = ts.filter((t) => !planned(t)), next = ts.filter(planned);
      const ppl = [...new Set(done.concat(next).flatMap((t) => t.people || []))];
      if (done.length || next.length) out.push({ p, kind: done.length ? 'visit' : 'plan', n: done.length, color: colorFor(ppl) });
      else if (p.wish && !allTripsOf(p.id).length) out.push({ p, kind: 'wish', n: 0 });
    });
    return out;
  }
  function drawOverlay() {
    if (!gOver) return;
    gOver.selectAll('*').remove();
    const focus = UI.focus && D.trips.find((t) => t.id === UI.focus);
    // routes
    if (UI.routes || focus) {
      D.trips.filter((t) => whoOk(t) && (UI.routes || t === focus)).forEach((t) => {
        const o = originOf(t), p = place(t.place_id); if (!o || !p) return;
        const d = routeD(o, [p.lon, p.lat]); if (!d) return;
        const el = gOver.append('path').attr('class', 'route' + (focus && t !== focus ? ' dim' : '')).attr('d', d)
          .attr('stroke', colorFor(t.people || [])).attr('stroke-dasharray', planned(t) ? '3 5' : TR[t.transport] ? TR[t.transport].dash : '');
        if (t === focus && UI.drawNow) {
          const len = el.node().getTotalLength();
          el.attr('stroke-dasharray', len).style('--len', len).attr('stroke-dashoffset', len).classed('draw', true)
            .on('animationend', function () { d3.select(this).classed('draw', false).attr('stroke-dashoffset', null).attr('stroke-dasharray', TR[t.transport].dash); });
          UI.drawNow = false;
        }
        if (t === focus || (UI.routes && D.trips.length <= 14)) {
          const node = el.node(), L = node.getTotalLength(); if (L > 40) { const m = node.getPointAtLength(L / 2); const g = gOver.append('g').attr('class', 'tmark').attr('transform', `translate(${m.x},${m.y})`); g.append('circle').attr('r', 11); g.append('g').attr('transform', 'translate(-7,-7) scale(.58)').html((TR[t.transport] || TR.plane).svg); }
        }
      });
    }
    // home
    if (D.home) { const s = screen([D.home.lon, D.home.lat]); if (s) gOver.append('path').attr('transform', `translate(${s[0] - 7},${s[1] - 13})`).attr('d', 'M7 0 14 6v8H0V6z').attr('fill', 'var(--home)').attr('stroke', 'var(--ocean)').attr('stroke-width', 1.5).append('title').text('Casa: ' + D.home.name); }
    // pins
    const showLabels = UI.proj === 'globe' ? true : T.k >= 2.4;
    pinsData().forEach((x) => {
      const s = screen([x.p.lon, x.p.lat]); if (!s) return;
      const g = gOver.append('g').attr('class', 'pin' + (x.kind === 'plan' ? ' live' : '')).attr('transform', `translate(${s[0]},${s[1]})`).attr('data-p', x.p.id).attr('role', 'button').attr('tabindex', 0).attr('aria-label', x.p.name);
      if (x.kind === 'wish') { g.append('circle').attr('r', 6).attr('fill', 'var(--ocean)').attr('stroke', 'var(--mapink)').attr('stroke-width', 2).attr('stroke-dasharray', '2.5 2'); }
      else {
        const r = 6 + Math.min(4, x.n);
        g.append('circle').attr('class', 'halo').attr('r', r + 6).attr('fill', x.color);
        g.append('circle').attr('r', r).attr('fill', x.color).attr('stroke', '#fff').attr('stroke-width', 2);
        if (x.n > 1) g.append('text').attr('text-anchor', 'middle').attr('dy', '.35em').attr('fill', '#fff').style('stroke', 'none').style('font-size', '9.5px').text(x.n);
      }
      if (showLabels) g.append('text').attr('x', 11).attr('dy', '.35em').text(x.p.name);
      g.append('circle').attr('r', 18).attr('fill', 'transparent');
    });
  }
  function fitPoints(pts, animate, maxK) {
    if (UI.proj === 'globe') {
      if (!pts.length) return;
      const c = d3.geoCentroid({ type: 'MultiPoint', coordinates: pts });
      const from = projection.rotate(), to = [-c[0], -Math.max(-60, Math.min(60, c[1]))];
      if (spin) { spin.stop(); spin = null; }
      d3.transition().duration(animate ? 900 : 0).tween('rot', () => { const i = d3.interpolate(from, to); return (k) => { projection.rotate(i(k)); redrawGlobe(); }; });
      return;
    }
    let t = d3.zoomIdentity;
    const xy = pts.map((p) => projection(p)).filter(Boolean);
    if (xy.length) {
      const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const k = Math.max(1, Math.min(maxK || 9, .7 / Math.max((x1 - x0 + 1) / W, (y1 - y0 + 1) / (H * .7))));
      t = d3.zoomIdentity.translate(W / 2, H * .56).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    }
    (animate ? svg.transition().duration(900) : svg).call(zoom.transform, t);
  }
  function fitAll(animate) {
    const pts = pinsData().map((x) => [x.p.lon, x.p.lat]);
    if (D.home) pts.push([D.home.lon, D.home.lat]);
    if (pts.length === 1) fitPoints([[pts[0][0] - 12, pts[0][1] - 8], [pts[0][0] + 12, pts[0][1] + 8]], animate);
    else fitPoints(pts, animate, 7);
  }
  function showTrip(t) {
    const p = place(t.place_id); if (!p) return;
    closeAll(); show('map');
    UI.focus = t.id; UI.drawNow = true;
    const o = originOf(t), pts = [[p.lon, p.lat]]; if (o) pts.push(o);
    fitPoints(pts.length > 1 ? pts : [[p.lon - 8, p.lat - 5], [p.lon + 8, p.lat + 5]], true, 9);
    setTimeout(() => { UI.drawNow = true; drawOverlay(); }, 950);
    N.toast(p.name + ' · ' + (TR[t.transport] || TR.plane).n.toLowerCase() + (originName(t) ? ' da ' + originName(t) : ''));
  }

  /* ---------- render ---------- */
  function render() {
    const s = stats();
    $('#atSub').textContent = D.home ? 'Casa: ' + D.home.name : 'Imposta la vostra città di casa';
    $('#cCountries').textContent = s.countries.length; $('#cCities').textContent = s.visited.length; $('#cKm').textContent = Math.round(s.dist).toLocaleString('it-IT');
    renderWho();
    const next = D.trips.filter((t) => planned(t) && whoOk(t)).sort((a, b) => a.start_on.localeCompare(b.start_on))[0];
    const nx = $('#next');
    nx.hidden = !next;
    if (next) { const p = place(next.place_id); nx.innerHTML = `<span style="font-size:22px">${flag(p.country_code)}</span><div><span class="small muted">Prossimo viaggio</span><br><b>${esc(p.name)}</b> <span class="small muted">${esc(fmtRange(next.start_on, next.end_on))}</span></div><span class="cd">${esc(countdown(next))}</span>`; nx.dataset.p = p.id; }
    $('#emptyMap').hidden = !!(D.places.length || !D.home) && !!D.places.length;
    $('#emptyMap').innerHTML = !D.home
      ? `<h2 style="font-size:20px">Da dove partite?</h2><p class="small muted">Scegli la vostra città: da lì partono le rotte e si contano i chilometri.</p><button class="btn primary" data-act="home">Imposta casa</button>`
      : `<h2 style="font-size:20px">Il mondo è tutto da segnare</h2><p class="small muted">Aggiungete il primo posto in cui siete stati insieme, o quello dove sognate di andare.</p><button class="btn primary" data-act="add">Aggiungi un posto</button>`;
    $('#emptyMap').hidden = D.places.length > 0 && !!D.home;
    $('#legend').hidden = !D.places.length;
    $('#routesBtn').setAttribute('aria-pressed', UI.routes);
    document.querySelectorAll('#projSeg button').forEach((b) => b.setAttribute('aria-selected', b.dataset.proj === UI.proj));
    if (UI.view === 'map' && svg) { const v = visitedCodes(), dr = dreamCodes(v); gLand.attr('class', (f) => 'land' + (v.has(f.id) ? ' visited' : dr.has(f.id) ? ' dream' : '')); drawOverlay(); }
    if (UI.view === 'diary') renderDiary();
    if (UI.view === 'dreams') renderDreams();
    if (UI.view === 'passport') renderPassport();
  }
  function renderWho() {
    const box = $('#whoSeg'); box.hidden = !C.others.length;
    const opts = [['all', 'Insieme'], ['me', 'Tu']].concat(C.others.map((p) => [p.id, p.name]));
    box.innerHTML = opts.map(([k, l]) => `<button data-who="${esc(k)}" aria-pressed="${UI.who === k}">${esc(l)}</button>`).join('');
    $('#legend').innerHTML = `<span><i style="background:var(--both)"></i>Insieme</span>${[C.me].concat(C.others).map((p) => `<span><i style="background:${esc(p.color)}"></i>${esc(p.id === C.uid ? 'Solo tu' : 'Solo ' + p.name)}</span>`).join('')}<span><i class="ring"></i>Sogno</span>`;
  }
  function tripCard(t) {
    const p = place(t.place_id); if (!p) return '';
    const ph = D.photos.find((x) => x.trip_id === t.id), u = ph && urls[ph.path];
    const ppl = (t.people || []).map((id) => `<span class="dotc" style="width:8px;height:8px;background:${esc((C.people[id] || {}).color || '#999')}"></span>`).join('');
    return `<button class="trip${planned(t) ? ' planned' : ''}" data-trip="${t.id}"><span class="ph" ${u ? `style="background-image:url('${esc(u)}')"` : ''}>${u ? '' : trIcon(t.transport)}</span><div style="min-width:0"><b>${flag(p.country_code)} ${esc(p.name)}</b>
      <div class="meta"><span>${esc(fmtRange(t.start_on, t.end_on))}</span>${planned(t) ? `<span class="tag plan">${esc(countdown(t))}</span>` : `<span>${days(t)} ${days(t) === 1 ? 'giorno' : 'giorni'}</span>`}</div>
      <div class="meta"><span>${trIcon(t.transport)} ${esc((TR[t.transport] || TR.plane).n)}${originName(t) ? ' da ' + esc(originName(t)) : ''}</span><span class="people">${ppl}</span>${t.rating ? `<span class="hearts">${hearts(t.rating)}</span>` : ''}</div>${t.note ? `<p>${esc(t.note)}</p>` : ''}</div></button>`;
  }
  function renderDiary() {
    const ts = D.trips.filter(whoOk).slice().sort((a, b) => b.start_on.localeCompare(a.start_on));
    const plan = ts.filter(planned).reverse(), done = ts.filter((t) => !planned(t));
    const years = [...new Set(done.map((t) => t.start_on.slice(0, 4)))];
    $('#diary').innerHTML = (plan.length ? `<div class="stack" style="gap:8px"><div class="sec"><h2>In programma</h2></div>${plan.map(tripCard).join('')}</div>` : '') +
      (years.length ? years.map((y) => { const list = done.filter((t) => t.start_on.startsWith(y)); return `<div class="stack" style="gap:8px"><div class="sec"><h3 class="yearh">${y}</h3><p class="muted small">${list.length} ${list.length === 1 ? 'viaggio' : 'viaggi'}</p></div>${list.map(tripCard).join('')}</div>`; }).join('')
        : `<div class="hint">Qui finiranno i vostri viaggi, dal più recente. <br><br><button class="btn primary" data-act="add">Aggiungi un viaggio</button></div>`);
  }
  function renderDreams() {
    const list = D.places.filter((p) => p.wish && !allTripsOf(p.id).some((t) => !planned(t))).sort((a, b) => b.created_at.localeCompare(a.created_at));
    $('#dreams').innerHTML = `<div class="sec"><h2>I posti che sognate</h2><p class="muted small">${list.length} ${list.length === 1 ? 'meta' : 'mete'}</p></div>` +
      (list.length ? list.map((p) => { const d = D.home ? fmtKm(km([D.home.lon, D.home.lat], [p.lon, p.lat])) : ''; const pl = allTripsOf(p.id).find(planned); return `<div class="dream"><span class="flag">${flag(p.country_code)}</span><button data-p="${p.id}" style="text-align:left;min-width:0"><b>${esc(p.name)}</b><span>${esc(countryName(p.country_code, p.country))}${d ? ' · a ' + d : ''}${pl ? ' · ' + esc(countdown(pl)) : ''}</span>${p.wish_note ? `<p>${esc(p.wish_note)}</p>` : ''}</button><button class="btn quiet sm" data-went="${p.id}">Ci siamo andati!</button></div>`; }).join('')
        : '<p class="hint">Nessun sogno ancora. Dove vorreste andare insieme?</p>') +
      `<button class="btn quiet" data-act="wish" style="align-self:center">${SEARCH}Aggiungi un sogno</button>`;
  }
  function stampSvg(cc, year, tr, i) {
    const inks = ['#2d5b8a', '#b23a48', '#2f6b47', '#7b4b94', '#b5770c', '#1f6f78'];
    const h = (cc.charCodeAt(0) * 31 + cc.charCodeAt(1) * 7 + i) >>> 0;
    const ink = inks[h % inks.length], rot = (h % 21) - 10, shape = h % 3;
    const name = countryName(cc).toUpperCase(), fs = name.length > 14 ? 7 : name.length > 9 ? 8.5 : 10;
    const frame = shape === 0 ? `<circle cx="50" cy="50" r="44" fill="none" stroke="${ink}" stroke-width="3"/><circle cx="50" cy="50" r="37" fill="none" stroke="${ink}" stroke-width="1.2"/>`
      : shape === 1 ? `<rect x="8" y="16" width="84" height="68" rx="9" fill="none" stroke="${ink}" stroke-width="3"/><rect x="14" y="22" width="72" height="56" rx="5" fill="none" stroke="${ink}" stroke-width="1.2" stroke-dasharray="3 2"/>`
        : `<polygon points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30" fill="none" stroke="${ink}" stroke-width="3"/>`;
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${esc(countryName(cc))}, ${year}" style="transform:rotate(${rot}deg)"><g filter="url(#ink)" opacity=".86">${frame}<text x="50" y="${shape === 1 ? 38 : 36}" text-anchor="middle" font-family="Onest,sans-serif" font-weight="700" font-size="${fs}" letter-spacing=".5" fill="${ink}">${esc(name)}</text><text x="50" y="62" text-anchor="middle" font-family="Young Serif,Georgia,serif" font-size="19" fill="${ink}">${year}</text><g transform="translate(41,66) scale(.75)" style="color:${ink}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${(TR[tr] || TR.plane).svg.replace('fill="currentColor"', `fill="${ink}"`)}</g></g></svg>`;
  }
  function renderPassport() {
    const s = stats(), world = 195;
    const first = {};
    s.done.slice().sort((a, b) => a.start_on.localeCompare(b.start_on)).forEach((t) => { const p = place(t.place_id); if (p && p.country_code && !first[p.country_code]) first[p.country_code] = t; });
    const far = s.done.map((t) => { const o = originOf(t), p = place(t.place_id); return o && p ? { t, p, d: km(o, [p.lon, p.lat]) } : null; }).filter(Boolean).sort((a, b) => b.d - a.d)[0];
    const longest = s.done.slice().sort((a, b) => days(b) - days(a))[0];
    const counts = {}; s.done.forEach((t) => { counts[t.place_id] = (counts[t.place_id] || 0) + 1; });
    const fav = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const firstTrip = s.done.slice().sort((a, b) => a.start_on.localeCompare(b.start_on))[0];
    const maxTr = Math.max(1, ...Object.values(s.byTr));
    $('#passport').innerHTML = `<div class="big">
        <div><span>PAESI</span><b>${s.countries.length}</b><small>${(s.countries.length / world * 100).toLocaleString('it-IT', { maximumFractionDigits: 1 })}% del mondo</small></div>
        <div><span>CITTÀ</span><b>${s.visited.length}</b><small>${s.done.length} ${s.done.length === 1 ? 'viaggio' : 'viaggi'}</small></div>
        <div><span>CHILOMETRI</span><b>${Math.round(s.dist).toLocaleString('it-IT')}</b><small>${(s.dist / 40075).toLocaleString('it-IT', { maximumFractionDigits: 2 })} giri della Terra</small></div>
        <div><span>GIORNI IN VIAGGIO</span><b>${s.daysOut}</b><small>${s.daysOut >= 7 ? (s.daysOut / 7).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' settimane' : 'il resto verrà'}</small></div></div>
      <div class="card"><div class="sec" style="margin-bottom:10px"><h2 style="font-size:18px">Continenti</h2><p class="muted small">${s.conts.length} di 7</p></div><div class="conts">${Object.entries(CONT).map(([k, n]) => `<div class="cont${s.conts.includes(k) ? ' on' : ''}">${n}</div>`).join('')}</div></div>
      ${Object.keys(s.byTr).length ? `<div class="card bars"><h2 style="font-size:18px;margin-bottom:6px">Come vi siete mossi</h2>${Object.keys(TR).filter((k) => s.byTr[k]).sort((a, b) => s.byTr[b] - s.byTr[a]).map((k) => `<div class="row">${trIcon(k)}<span>${TR[k].n}</span><span class="bar"><i style="width:${s.byTr[k] / maxTr * 100}%"></i></span><span class="v">${fmtKm(s.byTr[k])}</span></div>`).join('')}<p class="small muted" style="margin-top:6px">In linea d’aria, andata e ritorno, partendo da casa o dalla città indicata nel viaggio.</p></div>` : ''}
      ${s.done.length ? `<div class="card"><h2 style="font-size:18px;margin-bottom:4px">Record</h2><ul class="records">
        ${far ? `<li><span>Il più lontano</span><b>${flag(far.p.country_code)} ${esc(far.p.name)} · ${fmtKm(far.d)}</b></li>` : ''}
        ${longest ? `<li><span>Il più lungo</span><b>${esc(place(longest.place_id).name)} · ${days(longest)} giorni</b></li>` : ''}
        ${fav && fav[1] > 1 ? `<li><span>Ci tornate sempre</span><b>${esc(place(fav[0]).name)} · ${fav[1]} volte</b></li>` : ''}
        ${firstTrip ? `<li><span>Il primo</span><b>${esc(place(firstTrip.place_id).name)} · ${esc(dt(firstTrip.start_on).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))}</b></li>` : ''}</ul></div>` : ''}
      <div><div class="sec" style="margin-bottom:10px"><h2>Timbri del passaporto</h2><p class="muted small">Uno per ogni paese</p></div>
        ${Object.keys(first).length ? `<div class="stamps">${Object.entries(first).map(([cc, t], i) => `<button class="stamp" data-trip="${t.id}">${stampSvg(cc, t.start_on.slice(0, 4), t.transport, i)}</button>`).join('')}</div>` : '<p class="hint">Il passaporto è ancora intonso. Il primo timbro arriva con il primo viaggio.</p>'}</div>`;
  }

  /* ---------- place sheet ---------- */
  function openPlace(id, tripId, keep) {
    const p = place(id); if (!p) return;
    UI.openId = id;
    const ts = allTripsOf(id), done = ts.filter((t) => !planned(t));
    const d = D.home ? km([D.home.lon, D.home.lat], [p.lon, p.lat]) : null;
    const visits = ts.map((t) => {
      const ph = D.photos.filter((x) => x.trip_id === t.id);
      return `<div class="visit${planned(t) ? ' planned' : ''}" id="v-${t.id}"><div class="top">${trIcon(t.transport)}<b>${esc(fmtRange(t.start_on, t.end_on))}</b>${planned(t) ? `<span class="tag plan">${esc(countdown(t))}</span>` : `<span class="tag">${days(t)} ${days(t) === 1 ? 'giorno' : 'giorni'}</span>`}</div>
        <div class="small muted">${esc((TR[t.transport] || TR.plane).n)}${originName(t) ? ' da ' + esc(originName(t)) : ''} · ${(t.people || []).map(pname).map(esc).join(' e ') || '—'}${t.rating ? ` · <span class="hearts">${hearts(t.rating)}</span>` : ''}</div>
        ${t.note ? `<p>${esc(t.note)}</p>` : ''}
        <div class="photos">${ph.map((x) => `<button data-photo="${x.id}" aria-label="Foto" style="background-image:url('${esc(urls[x.path] || '')}')"></button>`).join('')}<label class="addph">${CAMERA}<span>Foto</span><input type="file" accept="image/*" multiple hidden data-upload="${t.id}"></label></div>
        <div class="vrow"><button class="btn quiet sm" data-route="${t.id}">Vedi la rotta</button><button class="btn quiet sm" data-edit="${t.id}">Modifica</button><button class="btn ghost sm danger" data-deltrip="${t.id}">Elimina</button></div><div data-confirm="${t.id}"></div></div>`;
    }).join('');
    const isDream = p.wish && !done.length;
    N.sheet(`<div id="pl"><div class="place-head"><span class="flag">${flag(p.country_code)}</span><div style="min-width:0"><h2>${esc(p.name)}</h2><p class="muted">${esc([p.admin, countryName(p.country_code, p.country)].filter(Boolean).join(', '))}</p><p class="coords">${dms(p.lat, p.lon)}${d != null ? ' · a ' + fmtKm(d) + ' da casa' : ''}</p></div></div>
      ${isDream ? `<div class="ps-sec"><h3>Un sogno</h3><textarea class="input" id="wishNote" maxlength="400" placeholder="Perché ci volete andare? Cosa volete vedere?">${esc(p.wish_note || '')}</textarea><div class="vrow"><button class="btn primary" data-went="${p.id}">Ci siamo andati!</button><button class="btn quiet" data-plan="${p.id}">Mettilo in programma</button></div></div>` : ''}
      ${ts.length ? `<div class="ps-sec"><h3>${ts.length === 1 ? 'Il viaggio' : ts.length + ' viaggi'}</h3>${visits}</div>` : ''}
      <div class="ps-sec"><div class="vrow">${isDream ? '' : `<button class="btn quiet" data-went="${p.id}">Aggiungi un altro viaggio qui</button>`}<button class="btn ghost danger" data-delplace="${p.id}">${isDream ? 'Togli dai sogni' : 'Rimuovi il posto'}</button></div><div id="plConfirm"></div></div></div>`);
    if (!keep) history.replaceState(null, '', '#p=' + id);
    if (tripId) setTimeout(() => { const el = document.getElementById('v-' + tripId); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 200);
  }
  function closeAll() { const w = $('#wishNote'); if (w && UI.openId) saveWishNote(UI.openId, w.value); N.closeSheet(); UI.openId = null; if (location.hash) history.replaceState(null, '', location.pathname); }
  async function saveWishNote(id, v) { const p = place(id); if (!p || (p.wish_note || '') === v) return; p.wish_note = v.slice(0, 400); await SB.from('places').update({ wish_note: p.wish_note }).eq('id', id); }

  /* ---------- search + add ---------- */
  let found = [], searchT = null, abortS = null, ctxAdd = null, originPick = null;
  function searchSheet(mode, title) {
    ctxAdd = { mode };
    N.sheet(`<h2>${esc(title)}</h2><div class="search" style="margin-top:12px">${SEARCH}<input class="input" id="cityQ" type="search" placeholder="Cerca una città" autocomplete="off" enterkeyhint="search"></div><div class="results" id="cityRes"><p class="hint">Tutte le città del mondo, con il nome in italiano.</p></div>`);
    setTimeout(() => { const i = $('#cityQ'); if (i) i.focus(); }, 250);
  }
  async function searchCities(q, signal) {
    const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=it&format=json&name=' + encodeURIComponent(q), { signal });
    if (!r.ok) throw new Error('search');
    const j = await r.json();
    return (j.results || []).map((x) => ({ geo_id: 'om:' + x.id, name: x.name, admin: x.admin1 || '', country: x.country || '', country_code: x.country_code || '', lat: x.latitude, lon: x.longitude, pop: x.population || 0 }));
  }
  const existingPlace = (x) => D.places.find((p) => (x.geo_id && p.geo_id === x.geo_id) || (p.name.toLowerCase() === x.name.toLowerCase() && p.country_code === x.country_code));
  async function runSearch(q, boxId, cb) {
    const box = $(boxId); if (!box) return;
    q = q.trim(); if (q.length < 2) { box.innerHTML = '<p class="hint">Scrivi almeno due lettere.</p>'; return; }
    if (abortS) abortS.abort(); abortS = new AbortController();
    box.innerHTML = '<p class="hint">Cerco…</p>';
    try {
      found = await searchCities(q, abortS.signal);
      if (!$(boxId)) return;
      box.innerHTML = found.length ? found.map((x, i) => { const ex = existingPlace(x); return `<button class="res" data-${cb}="${i}"><span class="flag">${flag(x.country_code)}</span><div style="min-width:0"><b>${esc(x.name)}</b><span>${esc([x.admin, countryName(x.country_code, x.country)].filter(Boolean).join(', '))}${x.pop > 50000 ? ' · ' + (x.pop >= 1e6 ? (x.pop / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' mln' : Math.round(x.pop / 1000) + ' mila') + ' ab.' : ''}</span></div>${ex && cb === 'city' ? '<em>Già nell’atlante</em>' : ''}</button>`; }).join('')
        : '<p class="hint">Nessuna città con questo nome. Prova in italiano o in inglese.</p>';
    } catch (e) { if (e.name !== 'AbortError' && $(boxId)) box.innerHTML = '<p class="hint">La ricerca non risponde. Controlla la connessione.</p>'; }
  }
  async function ensurePlace(x, wish) {
    let p = existingPlace(x);
    if (p) { if (wish && !p.wish) { await SB.from('places').update({ wish: true }).eq('id', p.id); p.wish = true; } return p; }
    const row = { name: x.name.slice(0, 120), admin: x.admin || '', country: x.country || '', country_code: x.country_code || '', lat: x.lat, lon: x.lon, wish: !!wish, geo_id: x.geo_id || null, created_by: C.uid };
    const { data, error } = await SB.from('places').insert(row).select().single();
    if (error) { const r = x.geo_id ? await SB.from('places').select('*').eq('geo_id', x.geo_id).maybeSingle() : { data: null }; if (r.data) p = r.data; else { fail(error); return null; } } else p = data;
    if (!place(p.id)) D.places.push(p);
    return p;
  }
  function chooseSheet(x) {
    ctxAdd.picked = x;
    N.sheet(`<h2>${flag(x.country_code)} ${esc(x.name)}</h2><p class="muted" style="margin-top:4px">${esc([x.admin, countryName(x.country_code, x.country)].filter(Boolean).join(', '))}</p>
      <div class="choose"><button class="btn quiet" data-kind="been">${trIcon('plane')}<span>Ci siamo stati<small>Date, mezzo, ricordi e foto</small></span></button>
      <button class="btn quiet" data-kind="plan">${HEART}<span>Ci andremo<small>Un viaggio già deciso, con il conto alla rovescia</small></span></button>
      <button class="btn quiet" data-kind="wish">${SEARCH}<span>Lo sogniamo<small>Finisce tra i sogni, con un segno tratteggiato sulla mappa</small></span></button></div>`);
  }
  let form = null;
  function tripForm(p, x, t, isPlan) {
    const edit = !!t;
    t = t || {};
    const people = t.people && t.people.length ? t.people : everyone();
    form = { p, x, t, edit, people: people.slice(), transport: t.transport || 'plane', rating: t.rating || 0, files: [], plan: isPlan, origin: t.origin_lat != null ? { name: t.origin_name, lat: t.origin_lat, lon: t.origin_lon } : null };
    const name = p ? p.name : x.name, cc = p ? p.country_code : x.country_code;
    const whoOpts = [['all', 'Insieme', everyone()], ['me', 'Solo io', [C.uid]]].concat(C.others.map((o) => [o.id, 'Solo ' + o.name, [o.id]]));
    const curWho = whoOpts.find((w) => w[2].length === people.length && w[2].every((id) => people.includes(id))) || whoOpts[0];
    N.sheet(`<h2>${flag(cc)} ${esc(name)}</h2><p class="muted" style="margin-top:4px">${edit ? 'Modifica il viaggio' : isPlan ? 'Un viaggio in programma' : 'Un viaggio fatto'}</p>
      <form class="form" id="tripForm" novalidate>
        <div class="two"><label class="field">${isPlan ? 'Partenza' : 'Dal'}<input class="input" type="date" id="fStart" value="${esc(t.start_on || (isPlan ? '' : today()))}" required></label><label class="field">${isPlan ? 'Ritorno' : 'Al'}<input class="input" type="date" id="fEnd" value="${esc(t.end_on || '')}"></label></div>
        <div class="field">Chi c’era<div class="chips" id="fWho">${whoOpts.map((w) => `<button type="button" data-w="${esc(w[0])}" aria-pressed="${w === curWho}">${esc(w[1])}</button>`).join('')}</div></div>
        <div class="field">Come ${isPlan ? 'andrete' : 'siete andati'}<div class="chips" id="fTr">${Object.keys(TR).map((k) => `<button type="button" data-tr="${k}" aria-pressed="${form.transport === k}">${trIcon(k)}${TR[k].n}</button>`).join('')}</div></div>
        <div class="field">Partenza da<div class="origin"><span id="fOrigin">${esc(form.origin ? form.origin.name : D.home ? 'Casa · ' + D.home.name : 'Nessuna città di casa')}</span><button type="button" class="btn ghost sm" data-act="origin">Cambia</button></div><div id="originBox"></div></div>
        ${isPlan ? '' : `<div class="field">Com’è stato<div class="heartsin" id="fHearts">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-h="${n}" class="${n <= form.rating ? 'on' : ''}" aria-label="${n} su 5">${HEART}</button>`).join('')}</div></div>`}
        <label class="field">${isPlan ? 'Cosa volete fare' : 'Il ricordo più bello'}<textarea class="input" id="fNote" maxlength="2000" placeholder="${isPlan ? 'Posti da vedere, prenotazioni, idee' : 'Quello che volete ricordarvi tra dieci anni'}">${esc(t.note || '')}</textarea></label>
        ${edit || isPlan ? '' : `<div class="field">Foto<label class="btn quiet" style="justify-content:flex-start">${CAMERA}Scegli dal rullino<input type="file" accept="image/*" multiple hidden id="fFiles"></label><div class="fileph" id="fPrev"></div></div>`}
        <p class="small" id="fErr" style="color:var(--danger)" hidden></p>
        <button class="btn primary" type="submit" id="fSave">${edit ? 'Salva' : 'Aggiungi all’atlante'}</button>
      </form>`);
  }
  async function saveTrip() {
    const f = form, err = $('#fErr');
    const start = $('#fStart').value, end = $('#fEnd').value || null;
    if (!start) { err.textContent = 'Serve almeno la data di partenza.'; err.hidden = false; return; }
    if (end && end < start) { err.textContent = 'Il ritorno è prima della partenza.'; err.hidden = false; return; }
    if (!f.people.length) { err.textContent = 'Scegli chi c’era.'; err.hidden = false; return; }
    const btn = $('#fSave'); btn.disabled = true; btn.textContent = 'Salvo…';
    try {
      const p = f.p || (await ensurePlace(f.x, false)); if (!p) { btn.disabled = false; return; }
      const row = { place_id: p.id, start_on: start, end_on: end, people: f.people, transport: f.transport, origin_name: f.origin ? f.origin.name : '', origin_lat: f.origin ? f.origin.lat : null, origin_lon: f.origin ? f.origin.lon : null, rating: f.plan || !f.rating ? null : f.rating, note: $('#fNote').value.slice(0, 2000) };
      let trip;
      if (f.edit) { const { error } = await SB.from('trips').update(row).eq('id', f.t.id); if (error) throw error; trip = Object.assign(f.t, row); }
      else { const { data, error } = await SB.from('trips').insert(Object.assign({ created_by: C.uid }, row)).select().single(); if (error) throw error; trip = data; D.trips.push(trip); }
      if (f.files.length) await uploadPhotos(trip, f.files, true);
      if (!f.edit) N.notify('auto', start > today() ? `Ha messo in programma ${p.name} · ${fmtRange(start, end)}` : `Ha aggiunto ${p.name} all’atlante`, urlOf(p.id));
      await load();
      openPlace(p.id, trip.id);
      N.toast(f.edit ? 'Salvato.' : start > today() ? 'In programma! Il conto alla rovescia è partito.' : 'Aggiunto all’atlante.');
    } catch (e) { btn.disabled = false; btn.textContent = 'Riprova'; fail(e); }
  }
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .82));
      return { blob, w: cv.width, h: cv.height };
    } finally { URL.revokeObjectURL(url); }
  }
  async function uploadPhotos(trip, files, quiet) {
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      N.toast(`Carico la foto ${i + 1} di ${files.length}…`);
      try {
        const { blob, w, h } = await shrink(files[i]);
        const pth = `${trip.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.jpg`;
        const up = await SB.storage.from('atlas').upload(pth, blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw up.error;
        const { data, error } = await SB.from('trip_photos').insert({ trip_id: trip.id, path: pth, width: w, height: h, created_by: C.uid }).select().single();
        if (error) throw error;
        D.photos.push(data); ok++;
      } catch (e) { N.toast('Una foto non è andata: ' + (/size|large/i.test(e.message || '') ? 'troppo grande.' : 'riprova.')); }
    }
    await signPhotos();
    const p = place(trip.place_id);
    if (ok && !quiet) { N.toast(ok === 1 ? 'Foto aggiunta.' : ok + ' foto aggiunte.'); N.notify('auto', `Ha aggiunto ${ok === 1 ? 'una foto' : ok + ' foto'} di ${p.name}`, urlOf(p.id)); }
    return ok;
  }
  async function removePaths(paths) { if (paths.length) await SB.storage.from('atlas').remove(paths).catch(() => {}); }

  /* ---------- events ---------- */
  function show(v) {
    UI.view = v;
    $('#mapView').hidden = v !== 'map';
    ['diary', 'dreams', 'passport'].forEach((k) => ($('#v-' + k).hidden = v !== k));
    document.querySelectorAll('#tabs [data-v]').forEach((b) => b.setAttribute('aria-selected', b.dataset.v === v));
    if (v === 'map') { if (!svg) initMap(); else if (Math.abs($('#mapView').getBoundingClientRect().width - W) > 2) buildMap(); }
    else { const s = $('#v-' + v); s.scrollTop = 0; }
    render();
  }
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('#sheet')) return;
    const pin = t.closest('[data-p]'); if (pin) { openPlace(pin.dataset.p); return; }
    const tr = t.closest('[data-trip]'); if (tr) { const x = D.trips.find((q) => q.id === tr.dataset.trip); if (x) openPlace(x.place_id, x.id); return; }
    const tab = t.closest('#tabs [data-v]'); if (tab) { show(tab.dataset.v); return; }
    const w = t.closest('[data-who]'); if (w) { UI.who = w.dataset.who; UI.focus = null; render(); if (UI.view === 'map' && svg) fitAll(true); return; }
    const pj = t.closest('[data-proj]'); if (pj) { UI.proj = pj.dataset.proj; UI.focus = null; buildMap(); render(); return; }
    if (t.closest('#routesBtn')) { UI.routes = !UI.routes; UI.focus = null; render(); return; }
    if (t.closest('#fitBtn')) { UI.focus = null; if (UI.proj === 'globe') { const pts = pinsData().map((x) => [x.p.lon, x.p.lat]); fitPoints(pts.length ? pts : D.home ? [[D.home.lon, D.home.lat]] : [], true); } else fitAll(true); drawOverlay(); return; }
    if (t.closest('#addBtn') || t.closest('[data-act="add"]')) { if (!D.home) { searchSheet('home', 'Da dove partite?'); return; } searchSheet('visit', 'Aggiungi un posto'); return; }
    if (t.closest('[data-act="wish"]')) { searchSheet('wish', 'Un posto da sognare'); return; }
    if (t.closest('[data-act="home"]') || t.closest('#atSub')) { searchSheet('home', 'La vostra città di casa'); return; }
    const went = t.closest('[data-went]'); if (went) { const p = place(went.dataset.went); if (p) tripForm(p, null, null, false); return; }
  });
  $('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') closeAll(); });
  $('#sheet').addEventListener('click', async (e) => {
    const t = e.target;
    const city = t.closest('[data-city]');
    if (city) {
      const x = found[+city.dataset.city];
      if (ctxAdd.mode === 'home') { const { error } = await SB.from('atlas_home').upsert({ id: 1, name: x.name, lat: x.lat, lon: x.lon, updated_at: new Date().toISOString() }); if (error) return fail(error); D.home = { id: 1, name: x.name, lat: x.lat, lon: x.lon }; N.closeSheet(); render(); if (svg) buildMap(); N.toast('Casa: ' + x.name + '. Da qui partono le rotte.'); return; }
      const ex = existingPlace(x);
      if (ctxAdd.mode === 'wish') { const p = await ensurePlace(x, true); if (!p) return; N.notify('status', `Sogna di andare a ${p.name}`, urlOf(p.id)); await load(); openPlace(p.id); N.toast('Aggiunto ai sogni.'); return; }
      if (ex && allTripsOf(ex.id).length) { openPlace(ex.id); return; }
      chooseSheet(x); return;
    }
    const og = t.closest('[data-org]');
    if (og) { const x = found[+og.dataset.org]; form.origin = { name: x.name, lat: x.lat, lon: x.lon }; $('#fOrigin').textContent = x.name; $('#originBox').innerHTML = ''; return; }
    const kind = t.closest('[data-kind]');
    if (kind) { const x = ctxAdd.picked, k = kind.dataset.kind; if (k === 'wish') { const p = await ensurePlace(x, true); if (!p) return; N.notify('status', `Sogna di andare a ${p.name}`, urlOf(p.id)); await load(); openPlace(p.id); return; } const ex = existingPlace(x); tripForm(ex || null, ex ? null : x, null, k === 'plan'); return; }
    const wb = t.closest('[data-w]'); if (wb) { const id = wb.dataset.w; form.people = id === 'all' ? everyone() : id === 'me' ? [C.uid] : [id]; document.querySelectorAll('#fWho button').forEach((b) => b.setAttribute('aria-pressed', b === wb)); return; }
    const trb = t.closest('[data-tr]'); if (trb) { form.transport = trb.dataset.tr; document.querySelectorAll('#fTr button').forEach((b) => b.setAttribute('aria-pressed', b === trb)); return; }
    const hb = t.closest('[data-h]'); if (hb) { const n = +hb.dataset.h; form.rating = form.rating === n ? 0 : n; document.querySelectorAll('#fHearts button').forEach((b) => b.classList.toggle('on', +b.dataset.h <= form.rating)); return; }
    if (t.closest('[data-act="origin"]')) { $('#originBox').innerHTML = `<div class="search" style="margin-top:8px">${SEARCH}<input class="input" id="originQ" type="search" placeholder="Da quale città?" autocomplete="off"></div><div class="results" id="originRes" style="min-height:0"></div>${form.origin ? '<button type="button" class="btn ghost sm" data-act="originHome">Usa casa</button>' : ''}`; $('#originQ').focus(); return; }
    if (t.closest('[data-act="originHome"]')) { form.origin = null; $('#fOrigin').textContent = D.home ? 'Casa · ' + D.home.name : 'Nessuna città di casa'; $('#originBox').innerHTML = ''; return; }
    const rt = t.closest('[data-route]'); if (rt) { const x = D.trips.find((q) => q.id === rt.dataset.route); if (x) showTrip(x); return; }
    const ed = t.closest('[data-edit]'); if (ed) { const x = D.trips.find((q) => q.id === ed.dataset.edit); if (x) tripForm(place(x.place_id), null, x, planned(x)); return; }
    const dtp = t.closest('[data-deltrip]'); if (dtp) { const id = dtp.dataset.deltrip; document.querySelector(`[data-confirm="${id}"]`).innerHTML = `<div class="confirm"><p class="small">Elimino questo viaggio con le sue foto, per tutti e due.</p><div class="vrow"><button class="btn quiet sm" data-keep="1">Tienilo</button><button class="btn sm danger" data-deltripyes="${id}">Elimina</button></div></div>`; return; }
    if (t.closest('[data-keep]')) { t.closest('.confirm').remove(); return; }
    const dty = t.closest('[data-deltripyes]'); if (dty) { const id = dty.dataset.deltripyes, x = D.trips.find((q) => q.id === id); await removePaths(D.photos.filter((p) => p.trip_id === id).map((p) => p.path)); const { error } = await SB.from('trips').delete().eq('id', id); if (error) return fail(error); D.trips = D.trips.filter((q) => q.id !== id); D.photos = D.photos.filter((p) => p.trip_id !== id); render(); if (x) openPlace(x.place_id, null, true); N.toast('Viaggio eliminato.'); return; }
    const dp = t.closest('[data-delplace]'); if (dp) { const id = dp.dataset.delplace; $('#plConfirm').innerHTML = `<div class="confirm"><p class="small">Tolgo ${esc(place(id).name)} dall’atlante${allTripsOf(id).length ? ', con tutti i viaggi e le foto' : ''}.</p><div class="vrow"><button class="btn quiet sm" data-keep="1">Tienilo</button><button class="btn sm danger" data-delplaceyes="${id}">Togli</button></div></div>`; return; }
    const dpy = t.closest('[data-delplaceyes]'); if (dpy) { const id = dpy.dataset.delplaceyes, tids = allTripsOf(id).map((x) => x.id); await removePaths(D.photos.filter((p) => tids.includes(p.trip_id)).map((p) => p.path)); const { error } = await SB.from('places').delete().eq('id', id); if (error) return fail(error); D.places = D.places.filter((p) => p.id !== id); D.trips = D.trips.filter((x) => x.place_id !== id); closeAll(); render(); N.toast('Tolto dall’atlante.'); return; }
    const went = t.closest('[data-went]'); if (went) { const p = place(went.dataset.went); if (p) tripForm(p, null, null, false); return; }
    const plan = t.closest('[data-plan]'); if (plan) { const p = place(plan.dataset.plan); if (p) tripForm(p, null, null, true); return; }
    const ph = t.closest('[data-photo]'); if (ph) { const x = D.photos.find((q) => q.id === ph.dataset.photo); if (!x) return; const back = UI.openId; N.sheet(`<div class="viewer"><img src="${esc(urls[x.path] || '')}" alt=""><div class="vrow"><button class="btn quiet sm" data-back="${back}">Indietro</button><button class="btn ghost sm danger" data-delphoto="${x.id}">Elimina la foto</button></div></div>`); return; }
    const bk = t.closest('[data-back]'); if (bk) { openPlace(bk.dataset.back, null, true); return; }
    const dph = t.closest('[data-delphoto]'); if (dph) { const x = D.photos.find((q) => q.id === dph.dataset.delphoto); if (!x) return; await removePaths([x.path]); await SB.from('trip_photos').delete().eq('id', x.id); D.photos = D.photos.filter((q) => q.id !== x.id); const tp = D.trips.find((q) => q.id === x.trip_id); render(); if (tp) openPlace(tp.place_id, tp.id, true); N.toast('Foto eliminata.'); return; }
  });
  $('#sheet').addEventListener('input', (e) => {
    if (e.target.id === 'cityQ') { clearTimeout(searchT); const v = e.target.value; searchT = setTimeout(() => runSearch(v, '#cityRes', 'city'), 400); }
    if (e.target.id === 'originQ') { clearTimeout(searchT); const v = e.target.value; searchT = setTimeout(() => runSearch(v, '#originRes', 'org'), 400); }
  });
  $('#sheet').addEventListener('change', async (e) => {
    if (e.target.id === 'fFiles') { form.files = [...e.target.files].slice(0, 12); $('#fPrev').innerHTML = form.files.map((f) => `<span style="background-image:url('${URL.createObjectURL(f)}')"></span>`).join(''); }
    if (e.target.dataset.upload) { const tp = D.trips.find((q) => q.id === e.target.dataset.upload); const files = [...e.target.files].slice(0, 12); if (tp && files.length) { await uploadPhotos(tp, files); render(); openPlace(tp.place_id, tp.id, true); } }
    if (e.target.id === 'wishNote' && UI.openId) saveWishNote(UI.openId, e.target.value);
  });
  $('#sheet').addEventListener('submit', (e) => { if (e.target.id === 'tripForm') { e.preventDefault(); saveTrip(); } });
  $('#next').addEventListener('click', () => { const id = $('#next').dataset.p; if (id) openPlace(id); });

  /* ---------- boot ---------- */
  (async () => {
    try {
      C = await N.require(); if (!C) return;
      const [meta, topo] = await Promise.all([fetch('data/countries-meta.json').then((r) => r.json()), fetch('data/countries-110m.json').then((r) => r.json())]);
      META = meta; WORLD = topojson.feature(topo, topo.objects.countries).features;
      $('#boot').hidden = true; $('#app').hidden = false;
      await load();
      initMap(); render(); live();
      const m = /^#p=([0-9a-f-]{36})$/.exec(location.hash);
      if (m && place(m[1])) openPlace(m[1], null, true);
    } catch (e) {
      $('#boot').textContent = 'Non riesco ad aprire l’atlante. Controlla la connessione e riprova.';
    }
  })();
})();
