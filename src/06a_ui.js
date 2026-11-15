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
  const settings = Object.assign({ lang: 'es', vol: 0.6, muted: false, rm: false, hints: true, scale: 1, scen: 'moon', diff: 'explorer', mode: 'junior', tutDone: false, radioKey: 'r' }, Store.get('settings', {}));
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
    for (const c of kids.flat(5)) {
      if (c == null || c === false) continue;
      if (c.nodeType) e.append(c); else for (const n of Icons.decor(c)) e.append(n.nodeType ? n : document.createTextNode(n));
    }
    return e;
  }
  const btn = (label, fn, cls, extra) => h('button', Object.assign({ class: 'btn ' + (cls || ''), type: 'button', onclick: (e) => { Sfx.play('click'); fn(e); } }, extra || {}), label);
  const bar = (f, col) => h('div', { class: 'pbar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(f * 100) }, h('i', { style: { width: Math.round(clampN(f, 0, 1) * 100) + '%', background: col || '' } }));
  const tag = (txt, sev) => h('span', { class: 'tag ' + (sev || '') }, txt);
  const SEVI = { crit: '⛔', warn: '⚠', info: 'ℹ', ok: '✔' };
  const recentToast = {};

  /* ---------- Ajustes ---------- */
  function applySettings() {
    LANG = settings.lang; document.documentElement.lang = LANG; MODE = S ? S.mode : settings.mode;
    Sfx.setVol(settings.vol); Sfx.setMuted(settings.muted);
    const rm = settings.rm || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.documentElement.classList.toggle('rm', !!rm); World.setReduced(rm);
    document.documentElement.style.setProperty('--scale', settings.scale);
    Icons.setText($('#bMute'), settings.muted ? '🔇' : '🔊'); Icons.setText($('#bMap'), '🗺'); Icons.setText($('#zFit'), '🗺'); Icons.setText($('#bCom'), '📡'); Icons.setText($('#bRadio'), '📻'); Icons.setText($('#bCrew'), '🧑‍🚀'); Icons.setText($('#bMenu'), '☰');
    applyAudio();
    World.invalidate();
    Store.set('settings', settings);
  }

  /* ---------- Capas: pantallas y modales ---------- */
  function clearLayer() { layer.innerHTML = ''; stack = []; }
  function showScreen(el, cls) { clearLayer(); const s = h('div', { class: 'screen' + (cls ? ' ' + cls : '') }, el); layer.append(s); stack.push(s); focusFirst(s); }
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
    const box = $('#toasts'), key = title + '|' + (body || ''), now = performance.now();
    if (recentToast[key] && now - recentToast[key] < 20000) return; // sin avisos repetidos
    recentToast[key] = now;
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
    if (k.startsWith('ex.')) return exLogText(e);
    if (k.startsWith('land.')) return k === 'land.arr' ? [lt('Llegada y aterrizaje completados', 'Arrival and landing complete'), [tr(Land.zoneOf(S.scen, p.zone).n), p.rev ? '💧 ' + p.rev : '', p.mat ? (p.mat > 0 ? '+' : '') + p.mat + ' ' + lt('materiales', 'materials') : ''].filter(Boolean).join(' · ')] : [lt('Nave reparada', 'Ship repaired'), tr(Land.PART_T[p.part])];
    if (k.startsWith('el.')) return elLogText(e);
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
      if (!logToRadio(e)) {
        const [t, b, ty] = logText(e);
        toast(t, b, e.sev, ty && DATA.EVT[ty] ? () => whyPanel(ty) : null);
        Sfx.play(e.sev === 'crit' ? 'crit' : e.sev === 'warn' ? 'warn' : e.sev === 'ok' ? 'ok' : 'info');
      }
      if (e.k === 'm.done') { { const [t, b] = logText(e); narrate(t + (b ? '. ' + b : ''), { level: 'info' }); } stats.missions++; unlock('first'); World.setAct('all', 'celebrate', 3.5); }
      if (e.k.startsWith('res.') && e.p.how === 'engineer') World.setAct('engineer', 'celebrate', 2);
      if (e.k.startsWith('res.') && e.p.how === 'player') { stats.repairs++; if (stats.repairs >= 5) unlock('fixer'); }
      if (e.k === 'res.solar_storm') unlock('shelter');
      if (e.k === 'crop.harvest') { stats.harvest += e.p.kg; if (stats.harvest >= 10) unlock('farmer'); }
    }
    while (S.pendingCards.length) { const id = S.pendingCards.shift(); setTimeout(() => earthCard(id, true), 400); }
    Store.set('stats', stats);
  }
  function unlock(k) { if (ach[k]) return; ach[k] = Date.now(); Store.set('ach', ach); toast('🏅 ' + tr(DATA.ACH[k]), '', 'ok'); }

  /* ---------- HUD ---------- */
  /* Junior: 4 indicadores simples (barra + palabra). Ingeniero: 5 indicadores con valores, unidades y tendencia. */
  const radSt = () => { const a = Sim.status(S, 'rad'), b = Sim.status(S, 'dose'); return a === 'crit' || b === 'crit' ? 'crit' : a === 'warn' || b === 'warn' || (S.mods && S.mods.spe > 0) ? 'warn' : 'ok'; };
  const M_ALL = {
    o2: { i: '🫁', f: () => S.d.o2, v: () => fmt(S.r.o2.v) + ' kg · ' + fmt(S.sys.o2.conc) + ' %', st: () => Sim.status(S, 'o2'), h: 0 },
    water: { i: '💧', f: () => S.d.water, v: () => fmt(S.r.water.v, 0) + ' L', st: () => Sim.status(S, 'water'), h: 1 },
    power: { i: '🔋', f: () => S.d.power, v: () => fmt(S.r.power.v, 0) + ' kWh · ' + (S.d.net >= 0 ? '+' : '') + fmt(S.d.net) + ' kW', st: () => Sim.status(S, 'power'), h: 2 },
    rad: { i: '🛡️', f: () => S.d.rad, v: () => fmt(S.d.dose) + '/' + S.limit + ' mSv', st: radSt, h: 4, inv: true },
    food: { i: '🥗', f: () => S.d.food, v: () => fmt(S.r.food.v) + ' kg', st: () => Sim.status(S, 'food'), h: 3 },
    well: { i: '😊', f: () => S.d.well, v: () => Math.round(S.r.well.v) + ' %', st: () => Sim.status(S, 'well'), h: 5 }
  };
  const worstSt = (a, b) => (a === 'crit' || b === 'crit' ? 'crit' : a === 'warn' || b === 'warn' ? 'warn' : 'ok');
  const stWord = (st) => (st === 'ok' ? _('good') : st === 'warn' ? _('careful') : _('urgent'));
  function trend(idx, inv) {
    const hh = S.hist || []; if (hh.length < 7) return '→';
    const d = hh[hh.length - 1][idx] - hh[hh.length - 7][idx]; if (Math.abs(d) < 0.006) return '→';
    return (d > 0) !== !!inv ? '↑' : '↓';
  }
  function buildHud() {
    const m = $('#meters'); m.innerHTML = '';
    const open = () => openCmd('resources');
    if (MODE === 'junior') {
      for (const k of ['o2', 'water', 'power', 'food']) m.append(h('button', { class: 'meter', id: 'm_' + k, type: 'button', onclick: open },
        h('div', { class: 'lbl' }, h('span', null, M_ALL[k].i + ' ' + _(k)), h('span', { class: 'pct sev-word' }, '')), h('div', { class: 'bar' }, h('i'))));
      m.append(h('button', { class: 'meter hidden', id: 'm_storm', type: 'button', onclick: () => openConsole({ id: 'shield' }) }, h('div', { class: 'lbl' }, h('span', null, '🛡️ ' + (LANG === 'es' ? 'Tormenta solar: ¡al refugio!' : 'Solar storm: go to the shelter!')))));
    } else {
      m.append(h('button', { class: 'meter', id: 'm_life', type: 'button', onclick: open },
        h('div', { class: 'lbl' }, h('span', null, '🫁 ' + _('life')), h('span', { class: 'pct' }, '')),
        h('div', { class: 'sub' }, h('div', { class: 'bar' }, h('i', { id: 'b_o2' })), h('div', { class: 'bar' }, h('i', { id: 'b_water' }))), h('div', { class: 'st' }, '')));
      for (const k of ['power', 'rad', 'food', 'well']) m.append(h('button', { class: 'meter', id: 'm_' + k, type: 'button', onclick: open },
        h('div', { class: 'lbl' }, h('span', null, M_ALL[k].i + ' ' + _(k === 'rad' ? 'radA' : k)), h('span', { class: 'pct' }, '')), h('div', { class: 'bar' }, h('i')), h('div', { class: 'st' }, '')));
    }
  }
  function paintMeter(el, st, f, pctTxt, valTxt, aria) {
    el.className = 'meter ' + (st === 'ok' ? '' : st);
    const pe = el.querySelector('.pct'); if (pe) Icons.setText(pe, pctTxt);
    const bi = el.querySelector('.bar i'); if (bi) bi.style.width = clampN(f, 0, 1) * 100 + '%';
    const se = el.querySelector('.st'); if (se) se.textContent = valTxt || '';
    el.setAttribute('aria-label', aria);
  }
  function updateHud() {
    if (!S) return;
    if (MODE === 'junior') {
      for (const k of ['o2', 'water', 'power', 'food']) {
        const el = $('#m_' + k); if (!el) continue;
        const st = M_ALL[k].st(), f = clampN(M_ALL[k].f(), 0, 1);
        paintMeter(el, st, f, (st !== 'ok' ? SEVI[st] + ' ' : '') + stWord(st), '', _(k) + ' ' + Math.round(f * 100) + '% ' + stWord(st));
      }
      const storm = $('#m_storm'); if (storm) storm.classList.toggle('hidden', !(S.mods && S.mods.spe > 0));
    } else {
      const lf = $('#m_life');
      if (lf) {
        const st = worstSt(M_ALL.o2.st(), M_ALL.water.st());
        lf.className = 'meter ' + (st === 'ok' ? '' : st);
        $('#b_o2').style.width = clampN(S.d.o2, 0, 1) * 100 + '%'; $('#b_water').style.width = clampN(S.d.water, 0, 1) * 100 + '%';
        Icons.setText(lf.querySelector('.pct'), (st !== 'ok' ? SEVI[st] + ' ' : '') + 'O₂ ' + Math.round(S.d.o2 * 100) + ' · H₂O ' + Math.round(S.d.water * 100));
        lf.querySelector('.st').textContent = fmt(S.r.o2.v) + ' kg · ' + fmt(S.r.water.v, 0) + ' L · ' + fmt(S.sys.o2.conc) + '% O₂ ' + trend(0) + trend(1);
        lf.setAttribute('aria-label', _('life') + ' O2 ' + Math.round(S.d.o2 * 100) + '% H2O ' + Math.round(S.d.water * 100) + '% ' + _(st));
      }
      for (const k of ['power', 'rad', 'food', 'well']) {
        const el = $('#m_' + k); if (!el) continue;
        const x = M_ALL[k], st = x.st(), f = clampN(x.f(), 0, 1);
        paintMeter(el, st, f, (st !== 'ok' ? SEVI[st] + ' ' : '') + Math.round(f * 100) + '%', x.v() + ' ' + trend(x.h, x.inv), _(k === 'rad' ? 'radA' : k) + ' ' + Math.round(f * 100) + '% ' + _(st));
      }
    }
    const hh = Math.floor(S.d.hour), mm = Math.floor((S.d.hour - hh) * 60);
    Icons.setText($('#clock'), (S.scen === 'mars' ? '🔴 ' : '🌙 ') + _('day') + ' ' + S.d.day + ' · ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
    const act = Sim.activeInc(S).filter((i) => S.t >= i.from);
    const warnSoon = S.inc.filter((i) => !i.res && S.t < i.from).length;
    Icons.setText($('#bAlerts'), (act.some((i) => i.sev === 'crit') ? '⛔ ' : act.length ? '⚠ ' : '🔔 ') + (act.length + warnSoon));
    $('#bSpeed').textContent = 'x' + speed;
    Icons.setText($('#bPause'), paused ? '▶' : '⏸');
    { const bc = $('#bCrew'); Icons.setText(bc, '🧑‍🚀 ' + tr(Chars.ROLES[S.playerRole || 'commander'].name).split(' ')[0]); bc.title = (LANG === 'es' ? 'Tripulación (C) · juegas con ' : 'Crew (C) · you play as ') + tr(Chars.ROLES[S.playerRole || 'commander'].name); }
    const hint = $('#hint');
    const hi = settings.hints ? nextHint() : null;
    if (hi) { Icons.setText(hint, hi.t); hint.classList.remove('hidden'); } else hint.classList.add('hidden');
    // En pantallas estrechas el HUD puede ocupar dos filas: minimapa y pista se colocan debajo de él
    const narrow = innerWidth <= 600, hb = $('#hud').getBoundingClientRect().bottom + 6;
    $('#mini').style.top = narrow ? hb + 'px' : ''; hint.style.top = narrow ? hb + 'px' : '';
  }

  /* ---------- Pistas y objetivo de la flecha ---------- */
  function nextHint() {
    if (!S || S.ended) return null;
    const es = LANG === 'es';
    const xh = S.ex && S.ex.suit.on ? exHint() : null; if (xh) return xh;
    const room = (k) => tr(DATA.ROOMS[k]);
    const storm = S.inc.find((i) => i.type === 'solar_storm' && !i.res);
    if (storm && !S.proto) return { t: es ? '¡Tormenta solar! Activa el protocolo en «Blindaje» (bahía del rover).' : 'Solar storm! Turn on the protocol at "Shielding" (rover bay).', p: World.consolePos('shield') };
    if (storm && S.proto && World.zone() !== 'shelter') return { t: es ? 'Entra en el refugio (zona con rayas amarillas).' : 'Walk into the shelter (yellow-striped zone).', p: World.shelterCenter() };
    if (S.d.power < 0.2 && !S.emergency) return { t: es ? 'Batería baja: ve a «Reactor y energía» y ahorra energía.' : 'Low battery: go to "Reactor & power" and save energy.', p: World.consolePos('reactor') };
    const inc = Sim.activeInc(S).filter((i) => i.fix && S.t >= i.from).sort((a, b) => (b.sev === 'crit') - (a.sev === 'crit'))[0];
    if (inc) { const cid = { water: inc.type === 'sensor_drift' ? 'o2' : 'water', life: 'med', bridge: 'comms', gh: 'gh', reactor: 'reactor', rad: 'shield', lab: 'lab' }[inc.room]; return { t: (es ? 'Repara «' : 'Repair "') + tr(DATA.EVT[inc.type].t) + (es ? '» en ' : '" in ') + room(inc.room), p: World.consolePos(cid) }; }
    const cs = Sim.campStatus(S);
    if (cs) {
      const k = cs.keys.find((x) => !x.done);
      if (k) {
        const tg = NPCDATA.KEYTARGET[k.k] || '';
        let p = null;
        if (tg.startsWith('room:')) p = World.roomCenter(tg.slice(5));
        else if (tg.startsWith('plant')) { const parts = tg.split(':'); p = parts.length > 1 ? World.plantPos(+parts[1], +parts[2]) : World.plantPos(1, 1); }
        else p = World.consolePos(tg);
        return { t: tr(NPCDATA.CAMP[cs.id].t) + ': ' + tr(NPCDATA.KEY[k.k]), p };
      }
    }
    const act = [1, 2, 3, 4, 5, 7, 6].find((i) => S.m[i].st === 'active');
    const xs = !act && Sim.expStatus(S);
    if (xs) {
      const k = xs.keys.find((x) => !x.done);
      if (k) {
        const tg = NPCDATA.KEYTARGET[k.k] || '', p = tg.startsWith('room:') ? World.roomCenter(tg.slice(5)) : World.consolePos(tg);
        return { t: tr(NPCDATA.CAMP[xs.id].t) + ': ' + tr(NPCDATA.KEY[k.k]), p };
      }
    }
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
    const m = Math.hypot(joy.x, joy.y);
    return { x: x + joy.x, y: y + joy.y, thr: -y, str: x, stick: m > 0.18 ? { x: joy.x, y: joy.y, m } : null };
  }
  window.addEventListener('keydown', (e) => {
    Sfx.init();
    const tgt = e.target && e.target.tagName;
    if (mgRun && mgRun.g && !mgRun.g.done) { mgRun.g.keys[e.key] = true; const d = MG.defs[mgRun.kind]; if (d.key) d.key(mgRun.g, e.key, true); if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); if (e.key !== 'Escape') return; }
    if (running && !ELK.cap && tgt !== 'INPUT' && tgt !== 'SELECT' && e.key.length === 1 && e.key.toLowerCase() === String(settings.radioKey || 'r').toLowerCase() && !e.ctrlKey && !e.metaKey && !e.altKey && !(mgRun && mgRun.g) && !modalOpen()) { elToggle(); e.preventDefault(); return; }
    if ((e.key === 'm' || e.key === 'M') && running && tgt !== 'INPUT' && tgt !== 'SELECT' && !(mgRun && mgRun.g)) { toggleMap(); e.preventDefault(); return; }
    if (e.key === 'Escape') { if (modalOpen() && running) { pop(); e.preventDefault(); } else if (running) pauseMenu(); return; }
    if (modalOpen()) return;
    if (!running) return;
    if (tgt === 'INPUT' || tgt === 'SELECT') return;
    keys[e.key] = true;
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault();
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') interact();
    if (e.key === 'p' || e.key === 'P') togglePause();
    if (e.key === 'n' || e.key === 'N') toggleMute();
    if (e.key === 'c' || e.key === 'C') openCrew();
    if (e.key === 'v' || e.key === 'V') repeatVoice();
    if (e.key === '+' || e.key === '=') World.zoom(1.2);
    if (e.key === '-' || e.key === '_') World.zoom(1 / 1.2);
    if (e.key === 'z' || e.key === 'Z') World.overview();
    if (e.key === 'f' || e.key === 'F') useTool();
    if (e.key === 'l' || e.key === 'L') useTool('light');
    if (e.key === 'g' || e.key === 'G') { if (S && S.ex && S.ex.suit.on) storagePanel(); }
    if (e.key === 'o' || e.key === 'O') exMissionsPanel();
    if (e.key >= '1' && e.key <= '6' && S && S.ex && S.ex.suit.on) selectTool(Ex.TOOLS[+e.key - 1]);
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
    $('#btnF').addEventListener('click', () => useTool());
    window.addEventListener('touchstart', () => { if (!isTouch) { isTouch = true; if (running) $('#touch').classList.remove('hidden'); } }, { passive: true });
  }

  /* ---------- Bucle principal ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mgRun && mgRun.g && !mgRun.g.done && mgRun.tick) mgRun.tick(dt);
    if (running && S) tickRadio(dt);
    if (running && S && !paused && !S.ended && S.station) Station.step(S, dt); // el elevador sigue su trayecto aunque haya un panel abierto
    if (running && S) {
      const live = !paused && !modalOpen() && !S.ended;
      if (live) {
        World.update(dt, S, inputVec());
        Sim.setPlayerZone(S, World.zone());
        exFrame(dt); elFrame(dt);
        Sim.step(S, dt * SIMH_PER_S * speed);
        processLogs();
        saveT += dt; if (saveT > 15) { saveT = 0; saveRun(); }
        if (S.ended) { saveRun(); setTimeout(showReport, 900); }
      }
      const hi = settings.hints && !modalOpen() ? nextHint() : null;
      World.render(ctx, S, { dpr, playerPose: modalOpen() ? (mgRun && mgRun.kind === 'wiring' ? 'repair' : mgRun ? 'interact' : 'interact') : null, crit: Sim.activeInc(S).some((i) => i.sev === 'crit' && S.t >= i.from), target: hi && hi.p, youLabel: LANG === 'es' ? 'Tú' : 'You' });
      if (!miniCv.classList.contains('hidden')) World.minimap(mctx, S, hi && hi.p);
      hudT += dt; if (hudT > 0.25) { hudT = 0; updateHud(); updatePrompt(); watchResources(); checkRoomVisit(); }
    } else if (!running) drawMenuBg(now / 1000);
    requestAnimationFrame(frame);
  }
  let stars = null;
  function drawMenuBg(t) {
    const w = cv.width, hh = cv.height, m = Math.min(w, hh), rm = document.documentElement.classList.contains('rm');
    if (!stars) { stars = []; for (let i = 0; i < 240; i++) stars.push([Math.random(), Math.random(), Math.random()]); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bgG = ctx.createLinearGradient(0, 0, w, hh); bgG.addColorStop(0, '#050816'); bgG.addColorStop(0.55, '#0a0a2c'); bgG.addColorStop(1, '#150a35'); ctx.fillStyle = bgG; ctx.fillRect(0, 0, w, hh);
    for (const [nx, ny, nr, c] of [[0.2, 0.25, 0.6, '60,100,255'], [0.85, 0.78, 0.65, '150,80,255']]) { const g = ctx.createRadialGradient(nx * w, ny * hh, 0, nx * w, ny * hh, nr * m); g.addColorStop(0, 'rgba(' + c + ',0.22)'); g.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh); }
    for (const s of stars) { const tw = rm ? 1 : 0.65 + 0.35 * Math.sin(t * 2 + s[0] * 60); ctx.fillStyle = 'rgba(220,230,255,' + ((0.25 + s[2] * 0.7) * tw) + ')'; ctx.fillRect(((s[0] * w + (rm ? 0 : t * 8 * s[2] * dpr)) % w), s[1] * hh, 2 * dpr * s[2] + 0.5, 2 * dpr * s[2] + 0.5); }
    const dr = rm ? 0 : Math.sin(t * 0.1) * m * 0.012;
    const ball = (x, y, r, c0, c1, c2) => { const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    const px = w * 0.83, py = hh * 0.27 + dr, pr = m * 0.16;
    ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35); ctx.scale(1, 0.27); ctx.strokeStyle = 'rgba(200,180,255,0.5)'; ctx.lineWidth = pr * 0.14; ctx.beginPath(); ctx.arc(0, 0, pr * 1.55, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.restore();
    ball(px, py, pr, '#c9b6ff', '#5b3fc4', '#150a42');
    ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35); ctx.scale(1, 0.27); ctx.strokeStyle = 'rgba(200,180,255,0.6)'; ctx.lineWidth = pr * 0.14; ctx.beginPath(); ctx.arc(0, 0, pr * 1.55, 0, Math.PI); ctx.stroke(); ctx.restore();
    ball(w * 0.12, hh * 0.74 - dr, m * 0.07, '#ffb08a', '#b5402a', '#3a1008');
    ball(w * 0.3, hh * 0.12 + dr * 0.6, m * 0.04, '#e8ecf5', '#8d94a8', '#2a2f40');
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
    const lockRoom = !near && running && !modalOpen() ? World.lockedNear() : null;
    if (lockRoom) {
      const es = LANG === 'es', cs = Sim.campStatus(S);
      Icons.setText($('#actBtn'), '🔒 ' + tr(DATA.ROOMS[lockRoom]) + (cs ? (es ? ' · se abre al completar «' : ' · opens after "') + tr(NPCDATA.CAMP[cs.id].t) + (es ? '»' : '"') : ''));
      p.classList.remove('hidden'); return;
    }
    if (!near && running && !modalOpen() && World.secureNear()) { Icons.setText($('#actBtn'), '🔒 ' + lt('Núcleo restringido por seguridad · usa el panel del elevador', 'Core restricted for safety · use the elevator panel')); p.classList.remove('hidden'); return; }
    if (near && near.id.startsWith('x:')) { Icons.setText($('#actBtn'), (isTouch ? '' : '[E] ') + near.icon + ' ' + exPrompt(near)); p.classList.remove('hidden'); return; }
    if (near) {
      const np = near.id === 'plant' ? S.beds[near.bed].plants[near.slot] : null;
      const name = near.id === 'sample' ? _('collect') : near.id === 'plant' ? (np ? tr(Flora.SPECIES[np.sp].name) + ' · ' + Flora.STAGES[LANG][Flora.stage(np.prog)] : (LANG === 'es' ? 'Hueco para sembrar' : 'Empty slot')) : consoleName(near.id);
      Icons.setText($('#actBtn'), (isTouch ? '' : '[E] ') + near.icon + ' ' + _(near.verb) + ' · ' + name);
      p.classList.remove('hidden');
    } else p.classList.add('hidden');
  }
  function interact() {
    if (!running || modalOpen()) return;
    if (!near) { if (World.lockedNear()) openCmd('missions'); return; }
    Sfx.play('click'); if (near.id.startsWith('x:')) { exInteract(near); return; } openConsole(near);
  }
  function togglePause() { paused = !paused; updateHud(); if (paused) pauseMenu(); }
  function toggleMute() { settings.muted = !settings.muted; applySettings(); }

  /* ---------- Guardado ---------- */
  function saveRun() {
    if (!S) return;
    if (S.ended) { Store.del('run'); return; }
    Store.set('run', { sv: 2, S, w: World.state(), speed, at: Date.now() });
  }
  /** Copia de seguridad de una partida guardada con un formato anterior (antes de los pisos): una sola vez por partida, sin sobrescribir otra copia distinta. */
  function backupLegacyRun(r) {
    const b = Store.get('runBackup', null);
    if (b && b.run && b.run.at === r.at) return false;
    Store.set('runBackup', { kind: 'v1', madeAt: Date.now(), run: JSON.parse(JSON.stringify(r)) });
    return true;
  }
  function restoreBackupPanel() {
    const b = Store.get('runBackup', null); if (!b) return;
    const es = LANG === 'es', d = new Date(b.run.at || b.madeAt).toLocaleString(es ? 'es-DO' : 'en-US');
    push(panel('💾 ' + lt('Copia de seguridad', 'Backup'), h('div', null,
      h('p', null, lt('Se guardó una copia de tu partida anterior (' + d + ') antes de adaptarla a los pisos. Restaurarla sustituye la partida actual.', 'A copy of your earlier game (' + d + ') was saved before adapting it to floors. Restoring it replaces the current game.')),
      h('div', { class: 'row' }, btn('♻ ' + lt('Restaurar la copia', 'Restore the copy'), () => { Store.set('run', JSON.parse(JSON.stringify(b.run))); popAll(); if (!loadRun()) mainMenu(); }, 'primary', { 'data-act': 'restore-backup' }), btn(_('close'), () => pop())))), { sticky: false });
  }
  function loadRun() {
    const r = Store.get('run', null);
    if (!r || !r.S || r.S.v !== 1) return false;
    if ((r.sv || 1) < 2 && backupLegacyRun(r)) setTimeout(() => toast('💾 ' + lt('Copia de seguridad creada', 'Backup created'), lt('Tu partida anterior se adaptó a los pisos y se guardó una copia.', 'Your earlier game was adapted to floors and a copy was saved.'), 'info'), 600);
    S = Sim.migrate(r.S); MODE = S.mode; settings.mode = S.mode; speed = r.speed || 1; if (!S.land.done) { Store.del('run'); return false; } World.init(S.scen, Land.pad(S)); World.restore(r.w); Sim.setPlayerRole(S, World.player.role); lastN = S.logN || 0; radio.q = []; radio.cur = null; radio.recent = {}; renderRadio(); lastRoom = null;
    beginPlay();
    return true;
  }
  function newRun(scen, diff, opts) {
    opts = opts || {};
    const mode = opts.mode || settings.mode || 'junior';
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    S = Sim.create({ scen, diff, mode, seed, skipCamp: !!opts.skipCamp, indep: !!opts.indep }); S.focus = opts.focus || null; S.age = opts.age || null; if (opts.focus === 'station') S.r.mat.v = Math.min(S.r.mat.max, S.r.mat.v + 20); MODE = S.mode; speed = 1; lastN = 0; radio.q = []; radio.cur = null; radio.recent = {}; renderRadio(); lastRoom = null; for (const k in resState) delete resState[k];
    settings.scen = scen; settings.mode = S.mode; settings.diff = opts.indep ? S.diff : S.diff === 'commander' ? 'commander' : 'engineer'; settings.hints = opts.age ? ageHints(opts.age) : S.mode === 'junior'; Store.set('settings', settings);
    // La llegada se juega una sola vez al empezar. Los atajos de prueba (skipCamp / skipLanding) saltan directo a la base ya desplegada.
    if (opts.skipCamp || opts.skipLanding || /[?&]quick\b/.test(location.search)) { Land.ensure(S); finishNewRun(scen); return; }
    popAll(); clearLayer(); startLanding(S);
  }
  function finishNewRun(scen, inited) {
    if (!inited) World.init(scen, Land.pad(S));
    stats.runs++; Store.set('stats', stats);
    beginPlay();
    toast(isTouch ? _('helpTouch') : _('helpMove'), '', 'info');
    const fm = S && S.focus && MISSIONS.find((x) => x.id === S.focus); if (fm && (S.focus === 'station' || S.focus === 'science')) toast((LANG === 'es' ? fm.t[0] + ': ' : fm.t[1] + ': ') + (LANG === 'es' ? fm.g[0] : fm.g[1]), '', 'info');
  }
  function beginPlay() {
    clearLayer(); World.prewarm(); running = true; paused = false;
    $('#hud').classList.remove('hidden'); $('#mini').classList.add('hidden'); $('#zoomc').classList.remove('hidden');
    if (isTouch) $('#touch').classList.remove('hidden');
    buildHud(); updateHud(); exAttach(); elAttach(); saveRun();
  }
  function stopPlay() { radio.cur = null; radio.q = []; running = false; renderRadio(); $('#hud').classList.add('hidden'); $('#mini').classList.add('hidden'); $('#zoomc').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#prompt').classList.add('hidden'); $('#hint').classList.add('hidden'); $('#toasts').innerHTML = ''; }
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) { saveRun(); if (!paused) { paused = true; } } });

  /* ---------- Menú principal ---------- */
  function mainMenu() {
    stopPlay(); popAll();
    const has = !!Store.get('run', null);
    const body = h('div', { class: 'panel cine-panel' },
      h('p', { class: 'muted small' }, 'Astro Caribe Challenge · STEM'),
      h('h1', { class: 'title-big has-logo' }, logoImg()),
      h('p', null, LANG === 'es' ? 'Administra un puesto avanzado en la Luna o en Marte. Cada recurso es limitado y cada decisión tiene consecuencias. Lo que aprendas también sirve en la Tierra.' : 'Run an outpost on the Moon or Mars. Every resource is limited and every decision has consequences. What you learn also helps on Earth.'),
      !Store.ok ? h('p', { class: 'tag warn' }, '⚠ ' + _('storageOff')) : null,
      h('div', { class: 'menu-grid' },
        btn('🚀 ' + _('start'), setupScreen, 'primary', { autofocus: true }),
        Store.get('runBackup', null) ? btn('💾 ' + lt('Restaurar copia de seguridad', 'Restore backup'), restoreBackupPanel, '', { 'data-act': 'backup-menu' }) : null,
        has ? btn(_('cont') + ' (' + (Store.get('run', {}).S && Store.get('run', {}).S.mode === 'adv' ? DATA.U[LANG].modeA : DATA.U[LANG].modeJ) + ')', () => loadRun() || mainMenu()) : null,
        btn('📘 ' + _('manual'), manual), btn('🛰️ ' + lt('Archivo de misión: ver la llegada', 'Mission file: watch the arrival'), replayArrival), btn('👩‍🚀 ' + (LANG === 'es' ? 'Tripulación' : 'Crew'), () => sheetPanel()), btn('🌎 ' + _('earthConn'), () => earthList()), btn('🔭 ' + _('sources'), sourcesPanel),
        btn('⚙️ ' + _('settings'), settingsPanel), btn('🔊 ' + (LANG === 'es' ? 'Audio y voces' : 'Audio & voices'), audioPanel), btn('🌐 ' + _('lang'), () => { settings.lang = LANG === 'es' ? 'en' : 'es'; applySettings(); mainMenu(); })),
      h('p', { class: 'small muted', style: { marginTop: '14px' } }, navigator.onLine === false || !donkiLive ? _('offline') : _('online')),
      h('p', { class: 'small muted' }, (LANG === 'es' ? 'Funciona sin Internet. Sin cuentas, sin descargas.' : 'Works offline. No accounts, no downloads.'))
    );
    showScreen(body, 'cine');
  }
  /* ---------- Edad, misión y dificultad (asistente de inicio) ---------- */
  // La edad ajusta el lenguaje y las ayudas (modalidad + pistas); la dificultad ajusta recursos y eventos. Son independientes.
  // Iconos propios del inicio (SVG en línea: no dependen de la fuente de emojis del dispositivo)
  const WIZ_SVG = {
    ship: '<svg viewBox="-14 0 78 32" width="64" height="26"><path d="M4 16 L-12 9 L-6 16 L-12 23 Z" fill="#ffb454"/><path d="M-2 16 L-8 12.5 L-5 16 L-8 19.5 Z" fill="#fff3c4"/><path d="M12 7 L2 1 L6 16 L2 31 L12 25 Z" fill="#6b7cff"/><path d="M4 16 L18 8 H40 Q58 10 62 16 Q58 22 40 24 H18 Z" fill="#e6edff"/><path d="M42 8.5 Q58 10 62 16 Q58 22 42 23.5 Z" fill="#a98bff"/><circle cx="33" cy="16" r="4.2" fill="#38d6ff" stroke="#0b1b3a" stroke-width="1.5"/></svg>',
    earth: '<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="21" fill="#2f7bff"/><path d="M12 16 Q20 8 26 14 Q22 22 14 24 Q8 22 12 16Z M28 26 Q38 22 40 30 Q36 40 28 38 Q24 32 28 26Z" fill="#5fe39a"/><circle cx="24" cy="24" r="21" fill="none" stroke="#bcd7ff" stroke-width="2" opacity=".6"/></svg>',
    dest: '<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="14" fill="#a98bff"/><circle cx="19" cy="19" r="5" fill="#d8c9ff" opacity=".7"/><ellipse cx="24" cy="26" rx="23" ry="6" fill="none" stroke="#d8c9ff" stroke-width="3" transform="rotate(-18 24 26)"/></svg>',
    moon: '<svg viewBox="0 0 48 48" width="52" height="52"><circle cx="24" cy="24" r="21" fill="#cfd5e3"/><circle cx="16" cy="18" r="5" fill="#9aa2b8"/><circle cx="30" cy="30" r="6.5" fill="#9aa2b8"/><circle cx="31" cy="14" r="3" fill="#9aa2b8"/><circle cx="24" cy="24" r="21" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>',
    mars: '<svg viewBox="0 0 48 48" width="52" height="52"><circle cx="24" cy="24" r="21" fill="#d9623f"/><path d="M8 26 Q18 20 26 26 Q34 32 42 24 Q42 38 24 44 Q10 40 8 26Z" fill="#a8412a"/><ellipse cx="24" cy="6" rx="8" ry="3" fill="#fff" opacity=".8"/><circle cx="24" cy="24" r="21" fill="none" stroke="#ffd0bd" stroke-width="2" opacity=".5"/></svg>',
    station: '<svg viewBox="0 0 64 48" width="64" height="52"><rect x="2" y="16" width="16" height="16" rx="2" fill="#3b82f6"/><rect x="46" y="16" width="16" height="16" rx="2" fill="#3b82f6"/><path d="M18 24 H46" stroke="#cfd5e3" stroke-width="4"/><rect x="24" y="12" width="16" height="24" rx="4" fill="#e6edff"/><circle cx="32" cy="24" r="5" fill="#38d6ff"/><path d="M32 12 V4 M28 4 H36" stroke="#cfd5e3" stroke-width="2.5"/></svg>',
    science: '<svg viewBox="0 0 48 48" width="52" height="52"><path d="M18 4 H30 M20 4 V18 L8 40 Q6 44 11 44 H37 Q42 44 40 40 L28 18 V4" fill="none" stroke="#e6edff" stroke-width="3" stroke-linejoin="round"/><path d="M13 32 H35 L40 41 Q41 44 37 44 H11 Q7 44 8 41Z" fill="#5fe39a"/><circle cx="22" cy="26" r="2.5" fill="#a98bff"/><circle cx="29" cy="22" r="2" fill="#38d6ff"/></svg>',
    compass: '<svg viewBox="0 0 48 48" width="52" height="52"><circle cx="24" cy="24" r="20" fill="none" stroke="#38d6ff" stroke-width="3"/><path d="M24 8 L30 24 L24 40 L18 24Z" fill="#e6edff"/><path d="M24 8 L30 24 H18Z" fill="#ff6b6b"/><circle cx="24" cy="24" r="2.5" fill="#0b1b3a"/></svg>',
    cadet: '<svg viewBox="0 0 48 48" width="52" height="52"><path d="M24 4 L42 10 V24 Q42 38 24 45 Q6 38 6 24 V10Z" fill="#3b82f6" stroke="#bcd7ff" stroke-width="2.5"/><path d="M24 14 L27 21 L35 22 L29 27 L31 35 L24 31 L17 35 L19 27 L13 22 L21 21Z" fill="#e6edff"/></svg>',
    star: '<svg viewBox="0 0 48 48" width="52" height="52"><path d="M24 3 L30 17 L45 18 L33 28 L37 43 L24 35 L11 43 L15 28 L3 18 L18 17Z" fill="#ffd25e" stroke="#fff3c4" stroke-width="2" stroke-linejoin="round"/></svg>'
  };
  const logoImg = () => h('img', { class: 'logo-img', src: LOGO_SRC, alt: 'Space Explorer', width: 220, height: 232, draggable: 'false' });
  const wizIco = (k, cls) => h('span', { class: cls || 'mico', html: WIZ_SVG[k], 'aria-hidden': 'true' });
  const AGE_MIN = 5, AGE_MAX = 17;
  const ageMode = (a) => (a <= 12 ? 'junior' : 'adv');
  const ageHints = (a) => a <= 14;
  const ageBand = (a) => (a <= 12
    ? { es: ['Lenguaje sencillo y ejemplos cotidianos', 'Modo Junior: misiones guiadas y pistas siempre visibles'], en: ['Simple language and everyday examples', 'Junior mode: guided missions and hints always on'] }
    : a <= 14
      ? { es: ['Lenguaje técnico con explicaciones', 'Modo Avanzado: datos y unidades, con pistas'], en: ['Technical language with explanations', 'Advanced mode: data and units, with hints'] }
      : { es: ['Lenguaje técnico completo', 'Modo Avanzado: datos y unidades, sin pistas automáticas'], en: ['Full technical language', 'Advanced mode: data and units, no automatic hints'] });
  const MISSIONS = [
    { id: 'moon', scen: 'moon', ico: 'moon', t: ['Luna', 'Moon'], d: ['Base en el polo sur lunar: noches de dos semanas, polvo y poca gravedad.', 'Base at the lunar south pole: two-week nights, dust and low gravity.'] },
    { id: 'mars', scen: 'mars', ico: 'mars', t: ['Marte', 'Mars'], d: ['Tormentas de polvo, poca luz solar y mensajes con retraso desde la Tierra.', 'Dust storms, weak sunlight and delayed messages from Earth.'] },
    { id: 'station', scen: 'moon', ico: 'station', t: ['Construcción de estación', 'Station construction'], d: ['Escenario Luna. Empiezas con +20 de materiales para construir y ampliar la base.', 'Moon scenario. You start with +20 materials to build and expand the base.'], g: ['construye y amplía la base; tienes +20 de materiales.', 'build and expand the base; you have +20 materials.'] },
    { id: 'science', scen: 'mars', ico: 'science', t: ['Investigación científica', 'Scientific research'], d: ['Escenario Marte. Objetivo: expediciones, muestras y experimentos.', 'Mars scenario. Goal: expeditions, samples and experiments.'], g: ['sal en expediciones, recoge muestras y haz experimentos.', 'go on expeditions, collect samples and run experiments.'] }];
  const LEVELS = [
    { id: 'explorer', ico: 'compass', n: ['Explorador', 'Explorer'], tag: ['Fácil', 'Easy'], d: ['Más ayudas, recursos abundantes y mucho margen para equivocarte.', 'More help, plenty of resources and lots of room for mistakes.'] },
    { id: 'engineer', ico: 'cadet', n: ['Cadete', 'Cadet'], tag: ['Normal', 'Normal'], d: ['Recursos equilibrados y eventos ambientales.', 'Balanced resources and environmental events.'] },
    { id: 'commander', ico: 'star', n: ['Comandante', 'Commander'], tag: ['Difícil', 'Hard'], d: ['Recursos escasos, eventos complejos y poco margen.', 'Scarce resources, complex events and little margin.'] }];
  const diffName = (d) => { const L = LEVELS.find((x) => x.id === d) || LEVELS[0]; return L.n[LANG === 'es' ? 0 : 1]; };
  function setupScreen() {
    const prevMode = MODE, pk = (a) => a[LANG === 'es' ? 0 : 1];
    let step = 0, age = clampN(Math.round(+settings.age || 10), AGE_MIN, AGE_MAX), mi = MISSIONS.some((m) => m.id === settings.mission) ? settings.mission : 'moon', lv = LEVELS.some((l) => l.id === settings.diff) ? settings.diff : 'explorer';
    const wrap = h('div', { class: 'wiz' });
    const go = (n) => { step = n; render(); };
    const stepsBar = () => h('ol', { class: 'wiz-steps' }, [['Edad', 'Age'], ['Misión', 'Mission'], ['Dificultad', 'Difficulty']].map((x, i) => h('li', { class: i === step ? 'on' : i < step ? 'done' : '', 'aria-current': i === step ? 'step' : null }, h('b', null, String(i + 1)), h('span', null, pk(x)))));
    const ageStep = () => {
      const num = h('div', { class: 'age-num', 'aria-live': 'polite', 'data-age': '1' }), b1 = h('p', null), b2 = h('p', { class: 'small muted' });
      const rng = h('input', { type: 'range', min: AGE_MIN, max: AGE_MAX, step: 1, value: age, class: 'age-range', 'aria-label': LANG === 'es' ? 'Edad' : 'Age' });
      const set = (v) => { age = clampN(Math.round(v), AGE_MIN, AGE_MAX); rng.value = age; num.textContent = age === AGE_MAX ? AGE_MAX + '+' : String(age); const b = ageBand(age)[LANG]; b1.textContent = '🗣️ ' + b[0]; b2.textContent = '💡 ' + b[1]; rng.style.setProperty('--p', ((age - AGE_MIN) / (AGE_MAX - AGE_MIN) * 100) + '%'); };
      rng.addEventListener('input', () => set(+rng.value));
      const mk = (txt, d, lab) => h('button', { class: 'age-btn', type: 'button', 'aria-label': lab, 'data-age-step': d, onclick: () => { Sfx.play('click'); set(age + d); } }, txt);
      set(age);
      return h('div', { class: 'wiz-step' }, h('h2', null, LANG === 'es' ? '¿Cuántos años tienes?' : 'How old are you?'),
        h('p', { class: 'muted' }, LANG === 'es' ? 'La edad ajusta el lenguaje y las ayudas. La dificultad se elige aparte.' : 'Age adjusts the language and the help. Difficulty is chosen separately.'),
        h('div', { class: 'age-row' }, mk('−', -1, LANG === 'es' ? 'Bajar la edad' : 'Decrease age'), num, mk('+', 1, LANG === 'es' ? 'Subir la edad' : 'Increase age')), rng,
        h('div', { class: 'age-ticks' }, h('span', null, '5'), h('span', null, '11'), h('span', null, '17+')), h('div', { class: 'age-info' }, b1, b2));
    };
    const cards = (list, cur, set, kind) => {
      const grid = h('div', { class: kind === 'm' ? 'mgrid' : 'dgrid' });
      for (const it of list) grid.append(h('button', { class: kind === 'm' ? 'mcard' : 'dcard', type: 'button', 'aria-pressed': cur() === it.id ? 'true' : 'false', ['data-' + (kind === 'm' ? 'mission' : 'level')]: it.id,
        onclick: () => { Sfx.play('click'); set(it.id); for (const c of grid.children) c.setAttribute('aria-pressed', c === grid.children[list.indexOf(it)] ? 'true' : 'false'); } },
      wizIco(it.ico), h('b', null, pk(it.t || it.n)), it.tag ? h('span', { class: 'dtag' }, pk(it.tag)) : null, h('span', { class: 'small muted' }, pk(it.d))));
      return grid;
    };
    const missionStep = () => h('div', { class: 'wiz-step' }, h('h2', null, LANG === 'es' ? 'Elige tu misión' : 'Choose your mission'), cards(MISSIONS, () => mi, (v) => (mi = v), 'm'));
    const levelStep = () => h('div', { class: 'wiz-step' }, h('h2', null, LANG === 'es' ? 'Elige la dificultad' : 'Choose the difficulty'),
      h('p', { class: 'muted' }, LANG === 'es' ? 'Cambia los recursos y los eventos, no el lenguaje: puedes ser Comandante a cualquier edad.' : 'It changes resources and events, not the language: you can be a Commander at any age.'), cards(LEVELS, () => lv, (v) => (lv = v), 'd'));
    const start = () => {
      const m = MISSIONS.find((x) => x.id === mi); settings.age = age; settings.mission = mi; settings.diff = lv; Store.set('settings', settings);
      MODE = prevMode; newRun(m.scen, lv, { mode: ageMode(age), indep: true, focus: mi, age });
    };
    const render = () => {
      MODE = ageMode(age);
      wrap.replaceChildren(stepsBar(), step === 0 ? ageStep() : step === 1 ? missionStep() : levelStep(),
        h('div', { class: 'row wiz-nav' }, btn(_('back'), () => { if (step === 0) { MODE = prevMode; mainMenu(); } else go(step - 1); }),
          step < 2 ? btn((LANG === 'es' ? 'Siguiente' : 'Next') + ' ▶', () => go(step + 1), 'primary wiz-big', { 'data-act': 'wiz-next' }) : btn(_('go') + ' ▶', start, 'primary wiz-big', { 'data-act': 'launch' })));
      const f = wrap.querySelector(step === 0 ? '.age-range' : '.wiz-big'); if (f && f.isConnected) f.focus({ preventScroll: true });
    };
    render();
    showScreen(h('div', { class: 'panel cine-panel wiz-panel' }, wrap), 'cine');
    const f = wrap.querySelector('.age-range'); if (f) f.focus({ preventScroll: true });
  }

  /* ---------- Carga espacial ---------- */
  function bootLoad() {
    const es = LANG === 'es', rm = document.documentElement.classList.contains('rm');
    const MS = [[0, 'Encendiendo motores…', 'Starting engines…'], [20, 'Calibrando sensores…', 'Calibrating sensors…'], [42, 'Trazando la ruta hacia la Luna y Marte…', 'Plotting the route to the Moon and Mars…'], [64, 'Sincronizando con la Tierra…', 'Syncing with Earth…'], [84, 'Revisando el soporte vital…', 'Checking life support…'], [97, '¡Listo para el despegue!', 'Ready for launch!']];
    const pct = h('div', { class: 'ld-pct' }, '0 %'), msg = h('p', { class: 'ld-msg', 'aria-live': 'polite' }), fill = h('i'), ship = h('div', { class: 'ld-ship', 'aria-hidden': 'true', html: WIZ_SVG.ship });
    const rail = h('div', { class: 'ld-rail', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0, 'aria-label': es ? 'Carga' : 'Loading' }, fill, ship);
    let done = false, t0 = null;
    const set = (p) => { pct.textContent = p + ' %'; fill.style.width = p + '%'; ship.style.left = p + '%'; rail.setAttribute('aria-valuenow', p); let m = MS[0]; for (const x of MS) if (p >= x[0]) m = x; msg.textContent = es ? m[1] : m[2]; };
    const body = h('div', { class: 'panel cine-panel ld-panel', 'data-boot': '1' },
      h('p', { class: 'muted ld-sub' }, 'Astro Caribe Challenge · STEM'), h('h1', { class: 'title-big has-logo' }, logoImg()),
      h('div', { class: 'ld-track' }, wizIco('earth', 'ld-pl'), rail, wizIco('dest', 'ld-pl')),
      pct, msg, btn(es ? 'Saltar ▶' : 'Skip ▶', () => finish(), 'sm'));
    const finish = () => { if (done) return; done = true; set(100); setTimeout(() => { if (layer.contains(body)) mainMenu(); }, rm ? 80 : 450); };
    const D = rm ? 800 : 3800;
    const tick = (ts) => { if (done || !layer.contains(body)) return; if (t0 == null) t0 = ts; const x = Math.min(1, (ts - t0) / D), e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; set(Math.round(e * 100)); if (x >= 1) finish(); else requestAnimationFrame(tick); };
    set(0); showScreen(body, 'cine'); requestAnimationFrame(tick); setTimeout(finish, D + 4000);
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
      btn('⚙️ ' + _('settings'), settingsPanel), btn('📘 ' + _('manual'), manual), btn('🔭 ' + _('sources'), sourcesPanel), btn('💬 ' + (LANG === 'es' ? 'Conversaciones' : 'Conversations'), talksPanel), btn('🛰️ ' + lt('Ver la llegada otra vez', 'Watch the arrival again'), replayArrival),
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
      btn('🔊 ' + (LANG === 'es' ? 'Audio y voces…' : 'Audio & voices…'), audioPanel), row('🔊 ' + _('volume'), vol), row('🔇 ' + _('mute'), chk('muted')), row('🎞️ ' + _('motion'), chk('rm')), row('🧭 ' + _('hints'), chk('hints')), row('🔠 ' + _('textSize'), size),
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
