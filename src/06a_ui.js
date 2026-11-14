/* =====================================================================
   GAME — controlador, interfaz, menús, HUD, modales, guardado, entrada.
   ===================================================================== */
const Game = (function () {
  const $ = (s) => document.querySelector(s);
  const cv = $('#game'), ctx = cv.getContext('2d'), miniCv = $('#mini'), mctx = miniCv.getContext('2d');
  const layer = $('#layer');
  const SIMH_PER_S = 0.4; // G: 1 s real = 0,4 h simuladas a velocidad x1 (1 día ≈ 60 s)
  let S = null, running = false, paused = false, speed = 1, stack = [], lastN = 0, dpr = 1, hudT = 0, saveT = 0, isTouch = false, mgRun = null;
  let donkiLive = null, onlineTried = false;
  const settings = Object.assign({ lang: 'es', vol: 0.6, muted: false, rm: false, hints: true, scale: 1, scen: 'moon', diff: 'explorer', tutDone: false }, Store.get('settings', {}));
  const stats = Object.assign({ runs: 0, wins: 0, missions: 0, repairs: 0, harvest: 0, quizOk: 0 }, Store.get('stats', {}));
  const ach = Store.get('ach', {});

  /* ---------- DOM helper ---------- */
  function h(tag, a, ...kids) {
    const e = document.createElement(tag);
    if (a) for (const k in a) {
      const v = a[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v); else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(5)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return e;
  }
  const btn = (label, fn, cls, extra) => h('button', Object.assign({ class: 'btn ' + (cls || ''), type: 'button', onclick: (e) => { Sfx.play('click'); fn(e); } }, extra || {}), label);
  const bar = (f, col) => h('div', { class: 'pbar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(f * 100) }, h('i', { style: { width: Math.round(clampN(f, 0, 1) * 100) + '%', background: col || '' } }));
  const tag = (txt, sev) => h('span', { class: 'tag ' + (sev || '') }, txt);
  const SEVI = { crit: '⛔', warn: '⚠', info: 'ℹ', ok: '✔' };

  /* ---------- Ajustes ---------- */
  function applySettings() {
    LANG = settings.lang; document.documentElement.lang = LANG;
    Sfx.setVol(settings.vol); Sfx.setMuted(settings.muted);
    const rm = settings.rm || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.documentElement.classList.toggle('rm', !!rm); World.setReduced(rm);
    document.documentElement.style.setProperty('--scale', settings.scale);
    $('#bMute').textContent = settings.muted ? '🔇' : '🔊';
    World.invalidate();
    Store.set('settings', settings);
  }

  /* ---------- Capas: pantallas y modales ---------- */
  function clearLayer() { layer.innerHTML = ''; stack = []; }
  function showScreen(el) { clearLayer(); const s = h('div', { class: 'screen' }, el); layer.append(s); stack.push(s); focusFirst(s); }
  function push(panel, opts) {
    opts = opts || {};
    const s = h('div', { class: 'screen dim', role: 'dialog', 'aria-modal': 'true' }, panel);
    s.addEventListener('pointerdown', (e) => { if (e.target === s && !opts.sticky) pop(); });
    layer.append(s); stack.push(s); s._onclose = opts.onclose; focusFirst(s);
    return s;
  }
  function pop() { const s = stack.pop(); if (!s) return; if (s._onclose) s._onclose(); s.remove(); if (mgRun && !layer.contains(mgRun.el)) mgRun = null; }
  function popAll() { while (stack.length) pop(); }
  function modalOpen() { return stack.length > 0; }
  function focusFirst(s) { setTimeout(() => { const f = s.querySelector('[autofocus], button, [href], input, select'); if (f) f.focus({ preventScroll: true }); }, 30); }
  function panel(title, body, o) {
    o = o || {};
    return h('div', { class: 'panel ' + (o.narrow ? 'narrow' : '') }, btn('✕', () => pop(), 'sm ghost close', { 'aria-label': _('close') }), title ? h('h2', null, title) : null, body);
  }
  function refresh(s, builder) { // reconstruye el contenido de un modal
    const p = builder(); const old = s.firstChild; s.replaceChild(p, old);
  }

  /* ---------- Toasts ---------- */
  function toast(title, body, sev, onClick) {
    const box = $('#toasts');
    const t = h('div', { class: 'toast ' + (sev || 'info'), role: sev === 'crit' ? 'alert' : 'status' }, h('b', null, (SEVI[sev] || 'ℹ') + ' ' + title), body ? h('span', { class: 'small' }, body) : null);
    if (onClick) { t.style.cursor = 'pointer'; t.addEventListener('click', onClick); t.title = _('why'); }
    box.prepend(t);
    while (box.children.length > 4) box.lastChild.remove();
    setTimeout(() => t.remove(), sev === 'crit' ? 9000 : 6000);
  }

  /* ---------- Texto de registros ---------- */
  function logText(e) {
    const k = e.k, p = e.p || {};
    const es = LANG === 'es';
    if (k.startsWith('ev.')) { const ty = k.slice(3), T = DATA.EVT[ty]; const sys = p.sys ? ' · ' + tr(DATA.SYS_T[p.sys]) : ''; return [tr(T.t) + (ty === 'wear' ? sys : ''), p.lead ? (es ? 'Llegará en ' : 'Arrives in ') + fmt(p.lead) + ' h. ' + tr(T.act) : tr(T.what), ty]; }
    if (k.startsWith('res.')) { const ty = k.slice(4); return [(es ? 'Resuelto: ' : 'Resolved: ') + tr(DATA.EVT[ty].t), p.how === 'engineer' ? (es ? 'La ingeniera Ana lo reparó.' : 'Engineer Ana fixed it.') : p.how === 'expired' ? (es ? 'El fenómeno terminó.' : 'The event ended.') : '']; }
    if (k === 'esc') return [(es ? 'Empeoró: ' : 'Got worse: ') + tr(DATA.EVT[p.type].t), es ? 'Un incidente sin reparar se vuelve más grave.' : 'An unrepaired incident becomes more serious.', p.type];
    if (k === 'crop.dead') return [es ? 'Se perdió un cultivo' : 'A crop died', (es ? 'Cama ' : 'Bed ') + p.bed + (es ? ': faltó luz, agua o temperatura adecuada.' : ': lacked light, water or the right temperature.')];
    if (k === 'crop.harvest') return [es ? 'Cosecha' : 'Harvest', '+' + fmt(p.kg) + ' kg'];
    if (k === 'job.shield') return [es ? 'Blindaje reforzado' : 'Shield reinforced', (es ? 'Nivel ' : 'Level ') + p.lvl];
    if (k === 'job.shelter') return [es ? 'Refugio ampliado' : 'Shelter expanded', (es ? 'Capacidad: ' : 'Capacity: ') + p.cap];
    if (k === 'job.analyze') return [es ? 'Análisis terminado' : 'Analysis done', es ? '+12 puntos de ciencia' : '+12 science points'];
    if (k === 'job.experiment') return [es ? 'Experimento terminado' : 'Experiment done', es ? '+8 ciencia, +moral' : '+8 science, +morale'];
    if (k === 'job.maint') return [es ? 'Mantenimiento terminado' : 'Maintenance done', tr(DATA.SYS_T[p.sys])];
    if (k === 'job.recycle') return [es ? 'Residuos reciclados' : 'Waste recycled', es ? '+5 kg de materiales' : '+5 kg materials'];
    if (k === 'cm.sent') return [es ? 'Mensaje enviado' : 'Message sent', (es ? 'Tardará ' : 'Takes ') + fmt(p.ow) + (es ? ' h en llegar a la Tierra (simulado).' : ' h to reach Earth (simulated).')];
    if (k === 'cm.recv') return [es ? 'Respuesta de la Tierra' : 'Reply from Earth', (es ? 'Ida y vuelta: ' : 'Round trip: ') + fmt(p.rt) + ' h'];
    if (k === 'm.start') return [(es ? 'Misión iniciada: ' : 'Mission started: ') + tr(DATA.MIS[p.id].t), ''];
    if (k === 'm.done') return [(es ? 'Misión completada: ' : 'Mission completed: ') + tr(DATA.MIS[p.id].t), '★'.repeat(p.stars)];
    if (k === 'm.fail') return [(es ? 'Misión no superada: ' : 'Mission not passed: ') + tr(DATA.MIS[p.id].t), tr(DATA.FAILWHY[p.why])];
    if (k.startsWith('end.')) return [es ? 'Fin de la partida' : 'Game over', tr(DATA.ENDT[k.slice(4)])];
    return [k, ''];
  }
  function processLogs() {
    if (!S) return;
    for (const e of S.log) {
      if (e.n <= lastN) continue;
      lastN = e.n;
      const [t, b, ty] = logText(e);
      toast(t, b, e.sev, ty && DATA.EVT[ty] ? () => whyPanel(ty) : null);
      Sfx.play(e.sev === 'crit' ? 'crit' : e.sev === 'warn' ? 'warn' : e.sev === 'ok' ? 'ok' : 'info');
      if (e.k === 'm.done') { stats.missions++; unlock('first'); }
      if (e.k.startsWith('res.') && e.p.how === 'player') { stats.repairs++; if (stats.repairs >= 5) unlock('fixer'); }
      if (e.k === 'res.solar_storm') unlock('shelter');
      if (e.k === 'crop.harvest') { stats.harvest += e.p.kg; if (stats.harvest >= 10) unlock('farmer'); }
    }
    while (S.pendingCards.length) { const id = S.pendingCards.shift(); setTimeout(() => earthCard(id, true), 400); }
    Store.set('stats', stats);
  }
  function unlock(k) { if (ach[k]) return; ach[k] = Date.now(); Store.set('ach', ach); toast('🏅 ' + tr(DATA.ACH[k]), '', 'ok'); }

  /* ---------- HUD ---------- */
  const METERS = [
    { k: 'o2', i: '🫁', f: () => S.d.o2, v: () => fmt(S.r.o2.v) + ' kg', st: () => Sim.status(S, 'o2') },
    { k: 'water', i: '💧', f: () => S.d.water, v: () => fmt(S.r.water.v, 0) + ' L', st: () => Sim.status(S, 'water') },
    { k: 'power', i: '🔋', f: () => S.d.power, v: () => (S.d.net >= 0 ? '+' : '') + fmt(S.d.net) + ' kW', st: () => Sim.status(S, 'power') },
    { k: 'rad', i: '🛡️', f: () => S.d.rad, v: () => fmt(S.d.dose) + ' mSv', st: () => { const a = Sim.status(S, 'rad'), b = Sim.status(S, 'dose'); return a === 'crit' || b === 'crit' ? 'crit' : a === 'warn' || b === 'warn' || (S.mods && S.mods.spe > 0) ? 'warn' : 'ok'; } },
    { k: 'food', i: '🥗', f: () => S.d.food, v: () => fmt(S.r.food.v) + ' kg', st: () => Sim.status(S, 'food') },
    { k: 'well', i: '😊', f: () => S.d.well, v: () => Math.round(S.r.well.v) + ' %', st: () => Sim.status(S, 'well') }
  ];
  function buildHud() {
    const m = $('#meters'); m.innerHTML = '';
    for (const x of METERS) {
      const el = h('button', { class: 'meter', id: 'm_' + x.k, type: 'button', onclick: () => openCmd('resources') },
        h('div', { class: 'lbl' }, h('span', null, x.i + ' ' + _(x.k)), h('span', { class: 'pct' }, '')), h('div', { class: 'bar' }, h('i')), h('div', { class: 'st' }, ''));
      m.append(el);
    }
  }
  function updateHud() {
    if (!S) return;
    for (const x of METERS) {
      const el = $('#m_' + x.k); if (!el) continue;
      const st = x.st(), f = clampN(x.f(), 0, 1);
      el.className = 'meter ' + (st === 'ok' ? '' : st);
      el.querySelector('.pct').textContent = (st !== 'ok' ? SEVI[st] + ' ' : '') + Math.round(f * 100) + '%';
      el.querySelector('i').style.width = f * 100 + '%';
      el.querySelector('.st').textContent = x.v();
      el.setAttribute('aria-label', _(x.k) + ' ' + Math.round(f * 100) + '% ' + _(st));
    }
    const hh = Math.floor(S.d.hour), mm = Math.floor((S.d.hour - hh) * 60);
    $('#clock').textContent = (S.scen === 'mars' ? '🔴 ' : '🌙 ') + _('day') + ' ' + S.d.day + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    const act = Sim.activeInc(S).filter((i) => S.t >= i.from);
    const warnSoon = S.inc.filter((i) => !i.res && S.t < i.from).length;
    $('#bAlerts').textContent = (act.some((i) => i.sev === 'crit') ? '⛔ ' : act.length ? '⚠ ' : '🔔 ') + (act.length + warnSoon);
    $('#bSpeed').textContent = 'x' + speed;
    $('#bPause').textContent = paused ? '▶' : '❚❚';
    // pista
    const hint = $('#hint');
    const hi = settings.hints ? nextHint() : null;
    if (hi) { hint.textContent = '🧭 ' + hi.t; hint.classList.remove('hidden'); } else hint.classList.add('hidden');
  }

  /* ---------- Pistas y objetivo de la flecha ---------- */
  function nextHint() {
    if (!S || S.ended) return null;
    const es = LANG === 'es';
    const room = (k) => tr(DATA.ROOMS[k]);
    const storm = S.inc.find((i) => i.type === 'solar_storm' && !i.res);
    if (storm && !S.proto) return { t: es ? '¡Tormenta solar! Activa el protocolo en «Blindaje» (bahía del rover).' : 'Solar storm! Turn on the protocol at "Shielding" (rover bay).', p: World.consolePos('shield') };
    if (storm && S.proto && World.zone() !== 'shelter') return { t: es ? 'Entra en el refugio (zona con rayas amarillas).' : 'Walk into the shelter (yellow-striped zone).', p: [43, 40] };
    if (S.d.power < 0.2 && !S.emergency) return { t: es ? 'Batería baja: ve a «Reactor y energía» y ahorra energía.' : 'Low battery: go to "Reactor & power" and save energy.', p: World.consolePos('reactor') };
    const inc = Sim.activeInc(S).filter((i) => i.fix && S.t >= i.from).sort((a, b) => (b.sev === 'crit') - (a.sev === 'crit'))[0];
    if (inc) { const cid = { water: inc.type === 'sensor_drift' ? 'o2' : 'water', life: 'med', bridge: 'comms', gh: 'gh', reactor: 'reactor', rad: 'shield', lab: 'lab' }[inc.room]; return { t: (es ? 'Repara «' : 'Repair "') + tr(DATA.EVT[inc.type].t) + (es ? '» en ' : '" in ') + room(inc.room), p: World.consolePos(cid) }; }
    const act = [1, 2, 3, 4, 5, 7, 6].find((i) => S.m[i].st === 'active');
    if (!act) return { t: es ? 'Ve al Puente de mando y elige una misión en la consola de mando.' : 'Go to the Command bridge and pick a mission at the command console.', p: World.consolePos('cmd') };
    const M = { 1: 'water', 2: 'reactor', 3: 'shield', 4: 'cmd', 5: 'shield', 6: 'gh', 7: 'rover' };
    const T = {
      1: es ? 'Misión 1: ajusta el reciclador en «Reciclaje de agua y O₂» y mantén los niveles 24 h.' : 'Mission 1: tune the recycler in "Water & O₂" and hold levels 24 h.',
      2: es ? 'Misión 2: en «Reactor y energía» baja consumos y sube el reactor.' : 'Mission 2: in "Reactor & power" cut loads and raise the reactor.',
      3: es ? 'Misión 3: espera la tormenta con el protocolo activo.' : 'Mission 3: wait out the storm with the protocol on.',
      4: es ? 'Misión 4: abre la consola de mando y elige un sitio.' : 'Mission 4: open the command console and choose a site.',
      5: es ? 'Misión 5: refuerza el blindaje y amplía el refugio.' : 'Mission 5: reinforce shielding and expand the shelter.',
      6: es ? 'Misión 6: siembra y cuida el invernadero. Usa x4 para esperar.' : 'Mission 6: plant and tend the greenhouse. Use x4 to wait.',
      7: es ? 'Misión 7: lanza el rover desde la bahía (puedes pedir antes una ruta a la Tierra).' : 'Mission 7: launch the rover from the bay (you may ask Earth for a route first).'
    };
    return { t: T[act], p: World.consolePos(M[act]) };
  }

  /* ---------- Entrada ---------- */
  const keys = {};
  const joy = { x: 0, y: 0, id: null };
  function inputVec() {
    let x = 0, y = 0;
    if (keys.ArrowLeft || keys.a || keys.A) x -= 1; if (keys.ArrowRight || keys.d || keys.D) x += 1;
    if (keys.ArrowUp || keys.w || keys.W) y -= 1; if (keys.ArrowDown || keys.s || keys.S) y += 1;
    return { x: x + joy.x, y: y + joy.y };
  }
  window.addEventListener('keydown', (e) => {
    Sfx.init();
    const tgt = e.target && e.target.tagName;
    if (mgRun && mgRun.g && !mgRun.g.done) { mgRun.g.keys[e.key] = true; const d = MG.defs[mgRun.kind]; if (d.key) d.key(mgRun.g, e.key, true); if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); if (e.key !== 'Escape') return; }
    if (e.key === 'Escape') { if (modalOpen() && running) { pop(); e.preventDefault(); } else if (running) pauseMenu(); return; }
    if (modalOpen()) return;
    if (!running) return;
    if (tgt === 'INPUT' || tgt === 'SELECT') return;
    keys[e.key] = true;
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') interact();
    if (e.key === 'p' || e.key === 'P') togglePause();
    if (e.key === 'm' || e.key === 'M') toggleMute();
  });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; if (mgRun && mgRun.g) mgRun.g.keys[e.key] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  function setupTouch() {
    const j = $('#joy'), knob = $('#knob');
    const move = (e) => { const r = j.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = dy; knob.style.transform = 'translate(' + dx * 45 + 'px,' + dy * 45 + 'px)'; };
    j.addEventListener('pointerdown', (e) => { e.preventDefault(); joy.id = e.pointerId; j.setPointerCapture(e.pointerId); move(e); Sfx.init(); });
    j.addEventListener('pointermove', (e) => { if (joy.id === e.pointerId) move(e); });
    const end = () => { joy.id = null; joy.x = 0; joy.y = 0; knob.style.transform = ''; };
    j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
    $('#btnE').addEventListener('click', () => interact());
    window.addEventListener('touchstart', () => { if (!isTouch) { isTouch = true; if (running) $('#touch').classList.remove('hidden'); } }, { passive: true });
  }

  /* ---------- Bucle principal ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mgRun && mgRun.g && !mgRun.g.done && mgRun.tick) mgRun.tick(dt);
    if (running && S) {
      const live = !paused && !modalOpen() && !S.ended;
      if (live) {
        World.update(dt, S, inputVec());
        Sim.setPlayerZone(S, World.zone());
        Sim.step(S, dt * SIMH_PER_S * speed);
        processLogs();
        saveT += dt; if (saveT > 15) { saveT = 0; saveRun(); }
        if (S.ended) { saveRun(); setTimeout(showReport, 900); }
      }
      const hi = settings.hints && !modalOpen() ? nextHint() : null;
      World.render(ctx, S, { dpr, crit: Sim.activeInc(S).some((i) => i.sev === 'crit' && S.t >= i.from), target: hi && hi.p, youLabel: LANG === 'es' ? 'Tú' : 'You' });
      if (!miniCv.classList.contains('hidden')) World.minimap(mctx, S, hi && hi.p);
      hudT += dt; if (hudT > 0.25) { hudT = 0; updateHud(); updatePrompt(); }
    } else if (!running) drawMenuBg(now / 1000);
    requestAnimationFrame(frame);
  }
  let stars = null;
  function drawMenuBg(t) {
    const w = cv.width, hh = cv.height;
    if (!stars) { stars = []; for (let i = 0; i < 220; i++) stars.push([Math.random(), Math.random(), Math.random()]); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#050816'; ctx.fillRect(0, 0, w, hh);
    const rm = document.documentElement.classList.contains('rm');
    for (const s of stars) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + s[2] * 0.7) + ')'; ctx.fillRect(((s[0] * w + (rm ? 0 : t * 8 * s[2] * dpr)) % w), s[1] * hh, 2 * dpr * s[2] + 0.5, 2 * dpr * s[2] + 0.5); }
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(innerWidth * dpr); cv.height = Math.floor(innerHeight * dpr);
  }

  /* ---------- Interacción ---------- */
  let near = null;
  function updatePrompt() {
    near = running && !modalOpen() ? World.nearest() : null;
    const p = $('#prompt');
    if (near) {
      const name = near.id === 'sample' ? _('collect') : consoleName(near.id);
      $('#actBtn').textContent = (isTouch ? '' : '[E] ') + near.icon + ' ' + _(near.verb) + ' · ' + name;
      p.classList.remove('hidden');
    } else p.classList.add('hidden');
  }
  function interact() { if (!running || modalOpen() || !near) return; Sfx.play('click'); openConsole(near); }
  function togglePause() { paused = !paused; updateHud(); if (paused) pauseMenu(); }
  function toggleMute() { settings.muted = !settings.muted; applySettings(); }

  /* ---------- Guardado ---------- */
  function saveRun() {
    if (!S) return;
    if (S.ended) { Store.del('run'); return; }
    Store.set('run', { S, w: World.state(), speed, at: Date.now() });
  }
  function loadRun() {
    const r = Store.get('run', null);
    if (!r || !r.S || r.S.v !== 1) return false;
    S = r.S; speed = r.speed || 1; World.init(S.scen); World.restore(r.w); lastN = S.logN || 0;
    beginPlay();
    return true;
  }
  function newRun(scen, diff) {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    S = Sim.create({ scen, diff, seed }); speed = 1; lastN = 0;
    settings.scen = scen; settings.diff = diff; if (diff === 'explorer') settings.hints = true; Store.set('settings', settings);
    World.init(scen); stats.runs++; Store.set('stats', stats);
    beginPlay();
    if (!settings.tutDone) tutorial();
    else toast(isTouch ? _('helpTouch') : _('helpMove'), '', 'info');
  }
  function beginPlay() {
    clearLayer(); running = true; paused = false;
    $('#hud').classList.remove('hidden'); $('#mini').classList.remove('hidden');
    if (isTouch) $('#touch').classList.remove('hidden');
    buildHud(); updateHud(); saveRun();
  }
  function stopPlay() { running = false; $('#hud').classList.add('hidden'); $('#mini').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#prompt').classList.add('hidden'); $('#hint').classList.add('hidden'); $('#toasts').innerHTML = ''; }
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) { saveRun(); if (!paused) { paused = true; } } });

  /* ---------- Menú principal ---------- */
  function mainMenu() {
    stopPlay(); popAll();
    const has = !!Store.get('run', null);
    const body = h('div', { class: 'panel' },
      h('p', { class: 'muted small' }, 'Astro Caribe Challenge · STEM'),
      h('h1', { class: 'title-big' }, 'Junior Astronaut Mission Trainer'),
      h('p', null, LANG === 'es' ? 'Administra un puesto avanzado en la Luna o en Marte. Cada recurso es limitado y cada decisión tiene consecuencias. Lo que aprendas también sirve en la Tierra.' : 'Run an outpost on the Moon or Mars. Every resource is limited and every decision has consequences. What you learn also helps on Earth.'),
      !Store.ok ? h('p', { class: 'tag warn' }, '⚠ ' + _('storageOff')) : null,
      h('div', { class: 'menu-grid' },
        btn('🚀 ' + _('start'), setupScreen, 'primary', { autofocus: true }),
        has ? btn('▶ ' + _('cont'), () => loadRun() || mainMenu()) : null,
        btn('📘 ' + _('manual'), manual), btn('🌎 ' + _('earthConn'), () => earthList()), btn('🔭 ' + _('sources'), sourcesPanel),
        btn('⚙️ ' + _('settings'), settingsPanel), btn('🌐 ' + _('lang'), () => { settings.lang = LANG === 'es' ? 'en' : 'es'; applySettings(); mainMenu(); })),
      h('p', { class: 'small muted', style: { marginTop: '14px' } }, navigator.onLine === false || !donkiLive ? _('offline') : _('online')),
      h('p', { class: 'small muted' }, (LANG === 'es' ? 'Funciona sin Internet. Sin cuentas, sin descargas.' : 'Works offline. No accounts, no downloads.'))
    );
    showScreen(body);
  }
  function setupScreen() {
    let sc = settings.scen, df = settings.diff;
    const wrap = h('div');
    const render = () => {
      wrap.innerHTML = '';
      const choice = (sel, v, title, desc, set) => h('button', { class: 'choice', type: 'button', 'aria-pressed': sel === v ? 'true' : 'false', onclick: () => { set(v); Sfx.play('click'); render(); } }, h('b', null, title), h('div', { class: 'small muted' }, desc));
      wrap.append(
        h('h3', null, _('scen')),
        h('div', { class: 'grid2' }, choice(sc, 'moon', '🌙 ' + _('moon'), _('moonD'), (v) => (sc = v)), choice(sc, 'mars', '🔴 ' + _('mars'), _('marsD'), (v) => (sc = v))),
        h('h3', null, _('diff')),
        h('div', { class: 'grid2' }, ['explorer', 'engineer', 'commander'].map((d) => choice(df, d, _(d), _(d + 'D'), (v) => (df = v)))),
        h('p', { class: 'small muted' }, LANG === 'es' ? 'Los sitios son escenarios educativos: no significa que sean lugares aprobados para una base humana.' : 'Sites are educational scenarios: they are not approved locations for a human base.'),
        h('div', { class: 'row', style: { marginTop: '12px' } }, btn('🚀 ' + _('go'), () => newRun(sc, df), 'primary'), btn(_('back'), mainMenu)));
    };
    render();
    showScreen(h('div', { class: 'panel' }, h('h2', null, _('start')), wrap));
  }

  function tutorial(i) {
    i = i || 0;
    const T = DATA.TUT[i];
    const p = h('div', { class: 'panel narrow' },
      h('p', { class: 'small muted' }, _('tut') + ' ' + (i + 1) + '/' + DATA.TUT.length),
      h('div', { style: { fontSize: '48px' } }, T.i), h('p', { style: { fontSize: '18px' } }, tr(T)),
      h('div', { class: 'row' }, btn(i < DATA.TUT.length - 1 ? _('next') : _('go'), () => { pop(); if (i < DATA.TUT.length - 1) tutorial(i + 1); else { settings.tutDone = true; Store.set('settings', settings); } }, 'primary', { autofocus: true }),
        btn(_('skip'), () => { pop(); settings.tutDone = true; Store.set('settings', settings); })));
    push(p, { sticky: true });
  }

  function pauseMenu() {
    if (!running) return;
    paused = true; updateHud();
    push(panel('⏸ ' + _('paused'), h('div', { class: 'menu-grid' },
      btn('▶ ' + _('resume'), () => { pop(); }, 'primary', { autofocus: true }),
      btn('💾 ' + _('save'), () => { saveRun(); toast(_('saved'), '', 'ok'); }),
      btn('⚙️ ' + _('settings'), settingsPanel), btn('📘 ' + _('manual'), manual), btn('🔭 ' + _('sources'), sourcesPanel),
      btn('📄 ' + _('endRun'), () => { popAll(); Sim.finishRun(S); saveRun(); showReport(); }),
      btn('🏠 ' + _('mainMenu'), () => { saveRun(); mainMenu(); }))), { onclose: () => { paused = false; updateHud(); } });
  }

  function settingsPanel() {
    const s = settings;
    const row = (label, ctrl) => h(ctrl.tagName === 'BUTTON' ? 'div' : 'label', { class: 'row', style: { justifyContent: 'space-between', margin: '8px 0' } }, h('span', null, label), ctrl);
    const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.vol, 'aria-label': _('volume'), oninput: (e) => { s.vol = +e.target.value; applySettings(); } });
    const chk = (k) => { const c = h('input', { type: 'checkbox', onchange: (e) => { s[k] = e.target.checked; applySettings(); updateHud(); } }); c.checked = !!s[k]; c.style.width = '24px'; c.style.height = '24px'; return c; };
    const size = h('select', { 'aria-label': _('textSize'), onchange: (e) => { s.scale = +e.target.value; applySettings(); } }, [1, 1.15, 1.3].map((v) => { const o = h('option', { value: v }, Math.round(v * 100) + '%'); if (v === s.scale) o.selected = true; return o; }));
    push(panel('⚙️ ' + _('settings'), h('div', null,
      row('🔊 ' + _('volume'), vol), row('🔇 ' + _('mute'), chk('muted')), row('🎞️ ' + _('motion'), chk('rm')), row('🧭 ' + _('hints'), chk('hints')), row('🔠 ' + _('textSize'), size),
      row('🌐 Idioma / Language', btn(_('lang'), () => { s.lang = LANG === 'es' ? 'en' : 'es'; applySettings(); pop(); if (running) { buildHud(); updateHud(); } else mainMenu(); })),
      h('hr'), h('p', { class: 'small muted' }, LANG === 'es' ? 'Pruebas del motor: 100 simulaciones con semillas distintas. No cambian tu partida ni tu progreso.' : 'Engine tests: 100 simulations with different seeds. They do not change your game or progress.'),
      btn('🧪 ' + _('selftest'), () => selfTestPanel()),
      h('p', { class: 'small muted' }, Store.ok ? (LANG === 'es' ? 'El progreso se guarda en este navegador (localStorage).' : 'Progress is saved in this browser (localStorage).') : _('storageOff')))));
  }

  function selfTestPanel() {
    const out = h('div', null, h('p', null, LANG === 'es' ? 'Ejecutando…' : 'Running…'));
    push(panel('🧪 SelfTest', out));
    setTimeout(() => {
      const t0 = performance.now(); const r = SelfTest.run(100); const ms = Math.round(performance.now() - t0);
      const s = r.summary; window.__selftest = r.summary;
      out.innerHTML = '';
      out.append(h('table', null, h('tbody', null,
        [['Simulaciones / runs', s.runs], ['Con errores / with errors', s.errors], ['Política activa: victorias / smart wins', s.smartVictory + ' / ' + s.smartRuns], ['Política pasiva: abortadas / passive aborted', s.passiveAbort + ' / ' + s.passiveRuns],
          ['Incidentes totales / incidents', s.totalIncidents], ['Máx. horas con ≥2 incidentes / max h with ≥2 incidents', s.maxConsecutiveIncidentsH], ['Tiempo / time', ms + ' ms']].map(([a, b]) => h('tr', null, h('th', null, a), h('td', null, String(b)))))),
        h('h3', null, LANG === 'es' ? 'Finales' : 'Endings'), h('pre', { class: 'small', style: { whiteSpace: 'pre-wrap' } }, JSON.stringify(s.endReasons, null, 1)),
        r.fails.length ? h('pre', { class: 'small' }, JSON.stringify(r.fails.slice(0, 5).map((f) => [f.seed, f.errs]), null, 1)) : h('p', { class: 'tag ok' }, '✔ ' + (LANG === 'es' ? 'Todos los recursos dentro de límites válidos, sin NaN ni negativos.' : 'All resources within valid bounds, no NaN or negatives.')));
    }, 50);
  }
