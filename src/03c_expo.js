/* =====================================================================
   EX — lógica de la expedición exterior (sin dibujo ni DOM): traje
   espacial, recursos, radiación, señal de radio, recolección de muestras
   con registro único (S.sampleList), almacenamiento del rover, misiones y
   recuperación de seguridad. El estado vive en S.ex (se guarda con la
   partida). Los valores científicos se simplifican por jugabilidad.
   ===================================================================== */
const Ex = (function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const T = (es, en) => ({ es, en });
  const CAP = { slots: 6, kg: 12, hand: 2 };
  const EXLIM = 15; // dosis simulada máxima por salida (mSv de juego)
  const DOSE_K = 0.5; // parte de la dosis de salida que pasa a la dosis de la tripulación del motor
  const TOOLS = ['collector', 'container', 'scanner', 'camera', 'sensor', 'light'];
  const RAD_RATE = { moon: 0.0125, mars: 0.006 }; // mSv de juego por segundo (la realidad: ~1,4 mSv/día en la Luna y ~0,7 en Marte)
  const SIG_RANGE = { moon: 105, mars: 90 };
  const REP_RANGE = 60;

  function def() {
    return {
      suit: { on: false, integ: 100, o2: 100, en: 100, temp: 21, rad: 0 },
      rover: { x: 74, y: 89.6, a: 0, v: 0, occ: false, docked: true, lights: false, odo: 0, load: [] },
      hand: [], taken: {}, rev: {}, rep: {}, cache: {}, visited: {}, disc: {}, photos: 0, readings: 0, tool: 'collector', flash: false,
      out: false, trip: { odo: 0, recall: false, t: 0 }, trips: 0, recalls: 0, sci: 0, scanCd: 0, f: {}, al: {}, cond: null, doseTot: 0,
      m: { i: 0, done: {}, c: { m3unl: 0, m3rec: 0, m4shel: 0 } }
    };
  }
  function ensure(S) {
    if (S.ex && S.ex._v === 1) return S.ex;
    const D = def();
    if (!S.ex) S.ex = D;
    const e = S.ex;
    for (const k in D) if (e[k] == null) e[k] = D[k];
    for (const k in D.suit) if (e.suit[k] == null) e.suit[k] = D.suit[k];
    for (const k in D.rover) if (e.rover[k] == null) e.rover[k] = D.rover[k];
    for (const k in D.m.c) if (e.m.c[k] == null) e.m.c[k] = D.m.c[k];
    e._v = 1;
    return e;
  }
  const role = (S) => S.playerRole || 'commander';
  const isBase = (e) => !e.loc || e.loc === 'base';

  /* ---------- Entorno ---------- */
  function sun(S) { return 0.5 + 0.5 * Math.cos((S.t / 72) * Math.PI * 2); }
  function incActive(S, ty) { return S.inc.some((i) => !i.res && i.type === ty && S.t >= i.from); }
  function condOn(S) { const c = ensure(S).cond; return c && c.age < c.dur ? c : null; }
  /** Condiciones en un punto: temperatura ambiente, tormenta de polvo, ráfaga de radiación, visibilidad. */
  function env(S, x, y) {
    const e = ensure(S), mars = S.scen === 'mars', sn = sun(S), cd = condOn(S), z = typeof Field !== 'undefined' ? Field.ground(x, y) : { k: 'plain' };
    let amb = mars ? -75 + 93 * sn : -150 + 250 * sn;
    const g = typeof Field !== 'undefined' && Field.G;
    if (g && g.craters.some((c) => c.ice && Math.hypot(c.x - x, c.y - y) < c.r)) amb = Math.min(amb, -185);
    const dust = (mars && (incActive(S, 'dust_storm') || (cd && cd.k === 'dust'))) ? 1 : 0;
    const wave = cd && cd.k === 'rad' ? ((cd.age % 45) < 16 ? 1 : 0.15) : 0;
    const burst = (S.mods && S.mods.spe > 0 ? 1 : 0) || wave;
    return { amb, sun: sn, dust, burst, ground: z, vis: dust ? 7 : 26, mars };
  }
  /** Señal de radio (0–1): antena de la base y repetidores activados; la distancia, el polvo y las tormentas la reducen. */
  function signal(S, x, y) {
    const e = ensure(S), mars = S.scen === 'mars', nodes = [{ x: Field.PAD[0], y: Field.PAD[1], r: (SIG_RANGE[S.scen] || 100) * Land.mods(S).sig }], rl = Land.relayNode(S);
    if (rl) nodes.push(rl);
    for (const q of Field.G.rep) if (e.rep[q.id]) nodes.push({ x: q.x, y: q.y, r: REP_RANGE });
    let best = 0;
    for (const n of nodes) best = Math.max(best, 1 - Math.pow(Math.hypot(n.x - x, n.y - y) / n.r, 1.6));
    const cm = S.sys && S.sys.comms ? S.sys.comms.h / 100 : 1, ev = env(S, x, y);
    best *= 0.5 + 0.5 * cm; if (ev.dust) best *= 0.55; if (ev.burst) best *= 0.75; if (role(S) === 'commander') best *= 1.1;
    return clamp(best, 0, 1);
  }
  const nearShelter = (x, y) => { for (const q of Field.G.shel) if (Math.hypot(q.x - x, q.y - y) < 4.2) return q.id; return null; };

  /* ---------- Traje ---------- */
  function checklist(S) {
    const e = ensure(S), su = e.suit, es = LANG === 'es', free = CAP.slots - e.rover.load.length, b = S.sys.rover.batt;
    return [
      { k: 'integ', ok: su.integ >= 70, v: Math.round(su.integ) + ' %', t: T('Integridad del traje', 'Suit integrity') },
      { k: 'o2', ok: su.o2 >= 90, v: Math.round(su.o2) + ' %', t: T('Oxígeno disponible', 'Oxygen available') },
      { k: 'en', ok: su.en >= 80, v: Math.round(su.en) + ' %', t: T('Energía del traje', 'Suit power') },
      { k: 'batt', ok: b >= 60, v: Math.round(b) + ' %', t: T('Batería del rover', 'Rover battery') },
      { k: 'store', ok: free > 0, v: free + '/' + CAP.slots, t: T('Capacidad de almacenamiento', 'Storage capacity') },
      { k: 'tools', ok: TOOLS.every((k) => k), v: TOOLS.length + '/' + TOOLS.length, t: T('Herramientas disponibles', 'Tools available') },
      { k: 'goal', ok: e.m.i < EXM.length, v: e.m.i < EXM.length ? es ? EXM[e.m.i].t.es : EXM[e.m.i].t.en : '✔', t: T('Objetivo de exploración', 'Exploration goal') }
    ];
  }
  /** Equipa el traje y lo recarga con oxígeno y energía de la base. */
  function equip(S) {
    const e = ensure(S), su = e.suit;
    if (su.on) return 'on';
    const need = (100 - su.o2) / 100 * 0.6;
    if (S.r.o2.v < need + 1) return 'nobase';
    S.r.o2.v -= need; su.o2 = 100; su.en = 100; su.temp = 21; su.rad = su.rad * 0.0; su.on = true; e.f.suit = true; e.cache = {};
    e.trip = { odo: 0, recall: false, t: 0, rad0: e.doseTot }; e.al = {};
    Sim.log(S, 'info', 'ex.equip', {}); return null;
  }
  function recharge(S) {
    const e = ensure(S), su = e.suit, need = ((100 - su.o2) + (100 - su.en) * 0.3) / 100 * 0.6;
    if (need < 0.02) return 'full';
    if (S.r.o2.v < need + 1) return 'nobase';
    S.r.o2.v -= need; su.o2 = 100; su.en = 100; e.al = {}; return null;
  }
  function repairSuit(S) {
    const e = ensure(S), su = e.suit, cost = role(S) === 'engineer' ? 1 : 1.8;
    if (su.integ >= 99) return 'full';
    if (S.r.mat.v < cost) return 'nomat';
    S.r.mat.v -= cost; su.integ = 100; return null;
  }
  /** Quita el traje en la base: las muestras que aún lleva en mano pasan al almacén. */
  function unequip(S) {
    const e = ensure(S), su = e.suit; if (!su.on) return 'off';
    const n = unload(S, true);
    su.on = false; e.out = false; e.rover.occ = false; e.flash = false; e.trips++; Sim.log(S, 'info', 'ex.unequip', { n }); return null;
  }

  /* ---------- Consumo y alertas ---------- */
  /** c = { x, y, outside, inRover, move (0–1), working, inShel }. Devuelve los avisos nuevos. */
  function tick(S, dt, c) {
    const e = ensure(S), su = e.suit, out = [];
    if (e.scanCd > 0) e.scanCd = Math.max(0, e.scanCd - dt);
    if (c.outside) e.pos = [c.x, c.y];
    if (e.cond) { e.cond.age += dt; if (e.cond.age >= e.cond.dur && !e.cond.done) { e.cond.done = true; out.push('cond.end'); } }
    if (!su.on || !c.outside) { return out.concat(missionStep(S, dt, c)); }
    const ev = env(S, c.x, c.y), r = role(S), integ = su.integ;
    const leak = 1 + (100 - integ) / 45, rov = c.inRover ? 0.4 : 1;
    const mv = clamp(c.move || 0, 0, 1);
    su.o2 = Math.max(0, su.o2 - 0.115 * (1 + mv * 0.35 + (c.working ? 0.25 : 0)) * leak * rov * (r === 'medic' ? 0.9 : 1) * dt);
    const therm = Math.abs(ev.amb - 21) / 140 * 0.09 * (c.inShel ? 0.2 : 1);
    su.en = Math.max(0, su.en - (0.07 + therm + (e.flash ? 0.12 : 0) + mv * 0.02) * (c.inRover ? 0.5 : 1) * dt);
    const tgt = su.en > 2 ? 21 + (ev.amb - 21) * 0.025 * (1 + (100 - integ) / 80) : clamp(ev.amb, -40, 70);
    su.temp += (tgt - su.temp) * Math.min(1, dt * 0.3);
    if (ev.dust) su.integ = Math.max(0, su.integ - 0.012 * dt);
    else if (ev.ground.k === 'deep' && mv > 0.2 && !c.inRover) su.integ = Math.max(0, su.integ - 0.01 * dt);
    const sh = c.inShel ? 0.08 : c.inRover ? 0.6 : 1;
    const rate = RAD_RATE[S.scen] * sh * (1 + (100 - integ) / 120) * (ev.burst ? 5 : 1) * (S.mods && S.mods.spe > 0 ? 1.6 : 1) * (r === 'medic' ? 0.8 : 1) * (ev.dust ? 0.9 : 1) * Land.mods(S).rad;
    su.rad += rate * dt; e.doseTot += rate * dt;
    const cr = S.crew.find((q) => q.role === r); if (cr) cr.dose += rate * dt * DOSE_K;
    if (c.inShel) { e.f.shelter = true; if (c.inShel && condOn(S)) e.m.c.m4shel += dt; }
    // avisos con histéresis
    const A = e.al, flag = (k, on, off) => { if (on && !A[k]) { A[k] = 1; out.push(k); } else if (A[k] && off) A[k] = 0; };
    flag('o2.low', su.o2 < 30, su.o2 > 38); flag('o2.crit', su.o2 < 12, su.o2 > 20); flag('en.low', su.en < 30, su.en > 38); flag('en.crit', su.en < 12, su.en > 20);
    flag('temp.hi', su.temp > 34, su.temp < 30); flag('temp.lo', su.temp < 8, su.temp > 12);
    flag('rad.hi', su.rad > EXLIM * 0.6, false); flag('rad.crit', su.rad > EXLIM * 0.85, false); flag('int.low', su.integ < 50, su.integ > 60);
    flag('batt.low', S.sys.rover.batt < 25 && (c.inRover || e.rover.odo > 0), S.sys.rover.batt > 35);
    const sg = signal(S, c.x, c.y);
    flag('sig.lost', sg < 0.1, sg > 0.2); flag('sig.low', sg < 0.3 && sg >= 0.1, sg > 0.4);
    flag('burst', ev.burst > 0.5 && !c.inShel, ev.burst < 0.5 || !!c.inShel);
    flag('dust', ev.dust > 0, ev.dust === 0);
    flag('full', e.hand.length >= CAP.hand && !c.inRover, e.hand.length < CAP.hand);
    flag('return', su.o2 < 35 || su.en < 25 || su.rad > EXLIM * 0.7, su.o2 > 50 && su.en > 40 && su.rad < EXLIM * 0.55);
    if (su.o2 <= 0 || su.integ <= 0 || su.rad >= EXLIM * 1.05) out.push('recall');
    return out.concat(missionStep(S, dt, c));
  }
  /** Recuperación de seguridad: nunca se queda atrapado. Pasan unas horas, la base recoge al astronauta y remolca el rover. */
  function recall(S, why) {
    const e = ensure(S), su = e.suit;
    su.o2 = Math.max(su.o2, 20); su.en = Math.max(su.en, 30); su.integ = Math.max(su.integ, 35); su.temp = 21;
    e.rover.occ = false; e.rover.v = 0; e.rover.x = 74; e.rover.y = 89.6; e.rover.a = 0; e.rover.lights = false; e.flash = false;
    S.sys.rover.batt = Math.max(S.sys.rover.batt, 15);
    e.recalls++; e.trip.recall = true; e.m.c.m3rec += 1; S.morale = clamp(S.morale - 5, 0, 100); e.al = {};
    Sim.log(S, 'warn', 'ex.recall', { why: why || 'o2' });
    Sim.step(S, 1.2);
    return null;
  }

  /* ---------- Muestras ---------- */
  const RES = {
    regolith: { moon: T('Vidrio y fragmentos de impacto; el polvo es afilado. Útil para estudiar la radiación solar pasada.', 'Glass and impact fragments; the dust is sharp. Useful to study past solar radiation.'), mars: T('Polvo fino con óxidos de hierro y sales. Explica su color rojizo.', 'Fine dust with iron oxides and salts. It explains the reddish color.') },
    rock: { moon: T('Basalto y anortosita: rocas de la corteza y de antiguos volcanes lunares.', 'Basalt and anorthosite: crust and ancient lunar volcano rocks.'), mars: T('Basalto marciano: lava enfriada, con pistas de su historia volcánica.', 'Martian basalt: cooled lava with clues to its volcanic history.') },
    mineral: { moon: T('Mineral con hierro y titanio: puede servir para fabricar materiales en la base.', 'Mineral with iron and titanium: could be used to make materials at the base.'), mars: T('Mineral con hierro o sulfatos: se forma con agua; una pista de un pasado húmedo.', 'Mineral with iron or sulfates: it forms with water, a clue to a wetter past.') },
    sediment: { moon: T('Material fino depositado en capas.', 'Fine material deposited in layers.'), mars: T('Capas de limo y arcilla: señal de agua que antes fluía o se estancaba.', 'Silt and clay layers: a sign of water that once flowed or pooled.') },
    ice: { moon: T('Agua congelada mezclada con polvo: puede dar agua y oxígeno a futuras bases.', 'Frozen water mixed with dust: could give water and oxygen to future bases.'), mars: T('Hielo y sales: el agua es un recurso para beber y producir combustible.', 'Ice and salts: water is a resource for drinking and making fuel.') }
  };
  function mkRecord(S, s, by) {
    const e = ensure(S), seq = S.sampleSeq++, inf = Field.info(s), d = Math.floor(S.t / 24) + 1, hh = Math.floor(S.t % 24), mm = Math.floor((S.t * 60) % 60);
    return {
      id: 'MS-' + String(seq).padStart(3, '0'), seq, origin: 'field', t: S.t, cat: Field.CAT[s.kind], label: null, state: 'new', slot: null, an: 'pending', ok: false, sci: 0,
      site: s.id, kind: s.kind, planet: S.scen, name: s.name, xy: [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10], poi: s.poi, int: s.int, kg: inf.kg, by, day: d, hh, mm, loc: 'hand', desc: inf.desc
    };
  }
  /** Recoge una muestra: crea un registro único. No permite duplicados ni exceder el contenedor. */
  function collect(S, id) {
    const e = ensure(S), s = Field.site(id), su = e.suit;
    if (!s) return 'err'; if (e.taken[id]) return 'taken';
    if (!su.on) return 'nosuit'; if (e.rover.occ) return 'inrover';
    if (s.hidden && !e.rev[id]) return 'hidden';
    if (e.hand.length >= CAP.hand) return 'full';
    const r = mkRecord(S, s, role(S)); if (S.sampleList.some((x) => x.id === r.id)) return 'dup';
    S.sampleList.push(r); e.hand.push(r.id); e.taken[id] = r.id; S.st.samplesTot++;
    su.en = Math.max(0, su.en - 1.2); e.f.collected = (e.f.collected || 0) + 1; e.trip.col = (e.trip.col || 0) + 1;
    if (s.poi === 'p1' && e.m.i === 1) { e.f.m2col = r.id; }
    if (s.poi === 'p2' && e.m.i === 3 && condOn(S)) { e.f.m4col = r.id; }
    Sim.log(S, 'ok', 'ex.collect', { id: r.id, kind: s.kind, int: s.int });
    return r;
  }
  const rec = (S, id) => S.sampleList.find((x) => x.id === id);
  const kgOf = (S, list) => list.reduce((a, id) => a + ((rec(S, id) || {}).kg || 0), 0);
  function storage(S) { const e = ensure(S), L = e.rover.load.map((id) => rec(S, id)).filter(Boolean); return { list: L, kg: kgOf(S, e.rover.load), slots: CAP.slots, maxKg: CAP.kg, hand: e.hand.map((id) => rec(S, id)).filter(Boolean) }; }
  /** Pasa las muestras del contenedor de mano al compartimento del rover. */
  function deposit(S) {
    const e = ensure(S); let n = 0;
    for (const id of e.hand.slice()) {
      const r = rec(S, id); if (!r) { e.hand.splice(e.hand.indexOf(id), 1); continue; }
      if (e.rover.load.length >= CAP.slots || kgOf(S, e.rover.load) + r.kg > CAP.kg) break;
      e.hand.splice(e.hand.indexOf(id), 1); e.rover.load.push(id); r.loc = 'rover'; n++;
    }
    return n ? n : (e.hand.length ? 'full' : 'none');
  }
  function withdraw(S, id) {
    const e = ensure(S), i = e.rover.load.indexOf(id), r = rec(S, id);
    if (i < 0 || !r) return 'err'; if (e.hand.length >= CAP.hand) return 'handfull';
    e.rover.load.splice(i, 1); e.hand.push(id); r.loc = 'hand'; return null;
  }
  function sortStorage(S, by) {
    const e = ensure(S), L = e.rover.load, cmp = { id: (a, b) => a.localeCompare(b), kg: (a, b) => (rec(S, b).kg - rec(S, a).kg), kind: (a, b) => (rec(S, a).kind || '').localeCompare(rec(S, b).kind || '') }[by] || ((a, b) => 0);
    L.sort(cmp);
  }
  /** Descarga rover y contenedor en el almacén de muestras de la base (las mismas muestras: ahora disponibles en el laboratorio). */
  function unload(S, quiet) {
    const e = ensure(S); let n = 0;
    for (const id of e.hand.concat(e.rover.load)) { const r = rec(S, id); if (!r) continue; r.loc = 'base'; r.t = S.t; n++; }
    e.hand = []; e.rover.load = [];
    if (n) { S.samples += n; e.m.c.m3unl += (e.m.i === 2 ? n : 0); e.f.unl = (e.f.unl || 0) + n; e.trip.unl = (e.trip.unl || 0) + n; Sim.log(S, 'ok', 'ex.unload', { n, q: quiet ? 1 : 0 }); }
    return n;
  }
  /** Muestras todavía en el exterior (mano o rover). */
  const inField = (S) => S.sampleList.filter((x) => x.loc === 'hand' || x.loc === 'rover');
  function onAnalyzed(S, r) { if (!r.site) return; r.res = RES[r.kind] ? RES[r.kind][r.planet || S.scen] : null; S.science += r.int || 0; ensure(S).sci += r.int || 0; }

  /* ---------- Herramientas ---------- */
  function scan(S, x, y) {
    const e = ensure(S), su = e.suit;
    if (!su.on) return { err: 'nosuit' }; if (e.scanCd > 0) return { err: 'cd', cd: e.scanCd };
    if (su.en < 5) return { err: 'noen' };
    su.en -= 4; e.scanCd = 6; const rad = role(S) === 'scientist' ? 32 : 22, found = [], pois = [];
    for (const s of Field.G.sites) if (!e.taken[s.id] && Math.hypot(s.x - x, s.y - y) < rad && s.hidden && !e.rev[s.id]) { e.rev[s.id] = true; found.push(s.id); }
    for (const p of Field.G.pois) if (Math.hypot(p.x - x, p.y - y) < rad * 1.6) { if (!e.disc[p.id]) pois.push(p.id); e.disc[p.id] = true; }
    const p1 = Field.poi('p1'); if (e.m.i === 1 && p1 && Math.hypot(p1.x - x, p1.y - y) < 20) e.f.m2scan = true;
    e.f.scan = (e.f.scan || 0) + 1; e.scanT = 12;
    return { found, pois, rad };
  }
  function measure(S, x, y, inShel) {
    const e = ensure(S), ev = env(S, x, y), g = ev.ground; e.readings++; e.f.read = true;
    const rate = RAD_RATE[S.scen] * (inShel ? 0.08 : 1) * (ev.burst ? 5 : 1);
    return { amb: ev.amb, temp: e.suit.temp, rad: rate, ground: g.k, wind: ev.mars ? (ev.dust ? 24 : 6) : 0, sig: signal(S, x, y), dust: ev.dust, burst: ev.burst, vis: ev.vis };
  }
  function photo(S, x, y) {
    const e = ensure(S), su = e.suit; if (!su.on) return { err: 'nosuit' }; if (su.en < 2) return { err: 'noen' };
    su.en -= 1.2; let best = null, bd = 12;
    for (const p of Field.G.pois) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = { k: 'poi', id: p.id, n: p.n }; } }
    for (const q of Field.G.rep) { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = { k: 'rep', id: q.id, n: T('Repetidor de radio', 'Radio relay') }; } }
    e.photos++; if (best) { e.f['ph' + best.id] = 1; if (!e.visited['ph' + best.id]) { e.visited['ph' + best.id] = 1; e.sci += 1; S.science += 1; } }
    return { subject: best };
  }
  /** Investigar un punto de interés con el sensor: una vez por punto. */
  function investigate(S, poiId, x, y) {
    const e = ensure(S), p = Field.poi(poiId); if (!p) return { err: 'err' };
    if (!e.suit.on) return { err: 'nosuit' };
    const first = !e.visited[poiId]; e.visited[poiId] = 1;
    if (first) { e.sci += 2; S.science += 2; S.pts += 4; e.trip.vis = (e.trip.vis || 0) + 1; Sim.log(S, 'ok', 'ex.visit', { id: poiId }); }
    return { first, poi: p, read: measure(S, x, y, false) };
  }
  function activateRepeater(S, id) {
    const e = ensure(S); if (!Field.rep(id)) return 'err'; if (e.rep[id]) return 'on';
    e.rep[id] = true; e.f.rep = (e.f.rep || 0) + 1; if (e.m.i === 3) e.f.rep2 = true; S.pts += 5; Sim.log(S, 'ok', 'ex.repeater', { id }); return null;
  }
  function useCache(S, shelId) {
    const e = ensure(S), su = e.suit; if (!su.on) return 'nosuit'; if (e.cache[shelId]) return 'used';
    e.cache[shelId] = 1; su.o2 = Math.min(100, su.o2 + 40); su.en = Math.min(100, su.en + 40); e.al = {}; return null;
  }
  const sendOk = (S, x, y) => signal(S, x, y) >= 0.3;

  /* ---------- Misiones de exploración ---------- */
  const EXM = [
    { id: 'e1', t: T('Primer recorrido', 'First outing'), b: T('Equípate, sal por la esclusa, conduce el rover y vuelve sano y salvo.', 'Suit up, go through the airlock, drive the rover and come back safe.'), obj: [
      ['suit', T('Equipar el traje', 'Put on the suit')], ['out', T('Salir de la base', 'Leave the base')], ['drive', T('Conducir el rover (40 casillas)', 'Drive the rover (40 tiles)')], ['back', T('Regresar de forma segura', 'Return safely')]] },
    { id: 'e2', t: T('Reconocimiento geológico', 'Geological survey'), b: T('Llega a la primera zona de interés, baja del rover, escanea, recoge una muestra y analízala.', 'Reach the first area of interest, leave the rover, scan, collect a sample and analyze it.'), obj: [
      ['m2reach', T('Llegar a la zona de interés (marcada)', 'Reach the area of interest (marked)')], ['m2foot', T('Bajar del rover cerca de la zona', 'Leave the rover near the area')], ['m2scan', T('Escanear el terreno', 'Scan the terrain')],
      ['m2col', T('Recoger una muestra de la zona', 'Collect a sample there')], ['m2back', T('Regresar y descargar la muestra', 'Return and unload the sample')], ['m2an', T('Analizarla en el laboratorio', 'Analyze it in the lab')]] },
    { id: 'e3', t: T('Exploración ampliada', 'Extended exploration'), b: T('Investiga tres puntos, administra tus reservas, transporta tres muestras y envía el informe.', 'Investigate three sites, manage your reserves, carry three samples and send the report.'), obj: [
      ['m3vis', T('Investigar 3 puntos de interés', 'Investigate 3 sites')], ['m3unl', T('Transportar 3 muestras a la base', 'Carry 3 samples to the base')], ['m3safe', T('Sin evacuación de emergencia', 'No emergency recovery')], ['m3rep', T('Enviar el informe a la Tierra', 'Send the report to Earth')]] },
    { id: 'e4', t: T('Condiciones adversas', 'Adverse conditions'), b: T('Sal con mal tiempo: activa un repetidor, usa un refugio, recoge la muestra de la mesa y regresa con los datos.', 'Go out in bad conditions: activate a relay, use a shelter, collect the target sample and return with the data.'), obj: [
      ['m4rep', T('Activar un repetidor de radio', 'Activate a radio relay')], ['m4shel', T('Refugiarte 8 s durante la alerta', 'Take shelter for 8 s during the alert')], ['m4col', T('Recoger la muestra del objetivo', 'Collect the target sample')], ['m4rep2', T('Regresar y enviar los datos', 'Return and send the data')]] }
  ];
  function objDone(S, k) {
    const e = ensure(S), f = e.f, c = e.m.c;
    switch (k) {
      case 'suit': return !!f.suit; case 'out': return !!f.out; case 'drive': return e.rover.odo >= 40; case 'back': return !!f.back1;
      case 'm2reach': return !!f.m2reach; case 'm2foot': return !!f.m2foot; case 'm2scan': return !!f.m2scan; case 'm2col': return !!f.m2col;
      case 'm2back': { const r = f.m2col && rec(S, f.m2col); return !!(r && r.loc === 'base'); } case 'm2an': { const r = f.m2col && rec(S, f.m2col); return !!(r && r.an === 'done'); }
      case 'm3vis': return Object.keys(e.visited).filter((q) => q[0] === 'p').length >= 3; case 'm3unl': return c.m3unl >= 3; case 'm3safe': return c.m3rec === 0 && !!f.m3start; case 'm3rep': return !!f.report3;
      case 'm4rep': return !!f.rep2; case 'm4shel': return c.m4shel >= 8; case 'm4col': return !!f.m4col; case 'm4rep2': return !!f.report4;
    }
    return false;
  }
  function objectives(S) {
    const e = ensure(S), m = EXM[e.m.i]; if (!m) return null;
    return { m, i: e.m.i, list: m.obj.map((o) => ({ k: o[0], t: o[1], ok: objDone(S, o[0]) })) };
  }
  /** Punto del mapa hacia el que apunta la misión actual (para la flecha y el radar). */
  function goal(S) {
    const e = ensure(S), i = e.m.i, f = e.f;
    if (i >= EXM.length) return null;
    const back = { x: Field.PAD[0], y: Field.PAD[1] + 2 };
    if (i === 0) return !f.out ? back : e.rover.odo < 40 ? { x: Field.PAD[0], y: 112 } : back;
    if (i === 1) { const p = Field.poi('p1'); return !f.m2col ? { x: p.x, y: p.y, poi: 'p1' } : back; }
    if (i === 2) { const L = ['p1', 'p2', 'p3', 'p4'].filter((id) => !e.visited[id]); const p = Field.poi(L[0] || 'p1'); return Object.keys(e.visited).filter((q) => q[0] === 'p').length < 3 ? { x: p.x, y: p.y, poi: p.id } : back; }
    if (i === 3) { const p = Field.poi('p2'); return !f.rep2 && !f.m4col ? { x: 70, y: 150 } : !f.m4col ? { x: p.x, y: p.y, poi: 'p2' } : back; }
    return null;
  }
  function complete(S, i) {
    const e = ensure(S), m = EXM[i]; if (!m || e.m.done[m.id]) return;
    e.m.done[m.id] = 1; e.m.i = Math.min(EXM.length, i + 1); S.pts += 25 * (i + 1); S.science += 6; Sim.log(S, 'ok', 'ex.mission', { id: m.id, n: i + 1 });
    if (e.m.i === 2) { e.f.m3start = true; e.m.c.m3rec = 0; e.m.c.m3unl = 0; }
    if (e.m.i === 3) { e.cond = null; e.f.m4start = true; }
  }
  /** Seguimiento de misiones (cada fotograma, barato). */
  function missionStep(S, dt, c) {
    const e = ensure(S), out = [], f = e.f;
    if (e.m.i === 0 && f.suit && f.out && e.rover.odo >= 40 && !c.outside && e.suit.on && !e.trip.recall && !f.back1) f.back1 = true;
    if (e.m.i === 1 && c.outside && e.suit.on) {
      const p = Field.poi('p1'), d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < 9) f.m2reach = true;
      if (f.m2reach && !c.inRover && d < 12) f.m2foot = true;
    }
    if (e.m.i === 2 && !f.m3start) f.m3start = true;
    if (e.m.i === 3 && !e.cond && f.m4start && c.outside && e.suit.on && !e.cond) { e.cond = { k: S.scen === 'mars' ? 'dust' : 'rad', age: 0, dur: 300 }; out.push('cond.start'); }
    if (e.m.i < EXM.length) { const m = EXM[e.m.i]; if (m.obj.every((o) => objDone(S, o[0]))) { complete(S, e.m.i); out.push('mission'); } }
    return out;
  }
  /** Enviar el informe de la expedición a la Tierra (necesita señal; ofrece ciencia por lo investigado). */
  function report(S, x, y) {
    const e = ensure(S); if (!sendOk(S, x, y)) return { err: 'nosig' };
    const f = e.f, vis = Object.keys(e.visited).filter((q) => q[0] === 'p').length; let ok = false;
    if (e.m.i === 2 && vis >= 3 && e.m.c.m3unl >= 3) { f.report3 = true; ok = true; }
    if (e.m.i === 3 && f.m4col && rec(S, f.m4col) && rec(S, f.m4col).loc === 'base') { f.report4 = true; ok = true; }
    const n = (e.f.reported || 0); e.f.reported = S.st.samplesTot; const add = Math.max(0, Math.min(6, S.st.samplesTot - n) * 1.5);
    S.science += add; e.sci += add; Sim.log(S, 'ok', 'ex.report', { ok, add });
    return { ok, add, vis };
  }
  /** La tripulación llega a la base: cierra la salida actual. */
  function arrived(S) { const e = ensure(S); e.out = false; e.rover.docked = true; }
  function left(S) { const e = ensure(S); e.out = true; e.f.out = true; e.trip.t = 0; }

  return { CAP, EXLIM, TOOLS, EXM, RES, def, ensure, env, signal, nearShelter, checklist, equip, recharge, repairSuit, unequip, tick, recall, collect, storage, deposit, withdraw, sortStorage, unload, inField, onAnalyzed, scan, measure, photo, investigate, activateRepeater, useCache, sendOk, objectives, goal, complete, report, arrived, left, condOn, kgOf, rec, isBase, missionStep };
})();
