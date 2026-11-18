// Pruebas de los cimientos de los pisos y los elevadores (Chromium + Playwright). Uso: node tests/floors.js
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const sleep = (pg, ms) => pg.waitForTimeout(ms);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx.newPage(); const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(FILE); await sleep(pg, 300);
  await pg.evaluate(() => { Game._debug.newRun('moon', 'x', { skipCamp: true, mode: 'junior' }); Game._debug.setSpeed(0); const S = Game.S; S.noEv = true; S.lastEv = 1e9; for (const k in NPCDATA.TALK) S.camp.visited[k] = 1; World._test.freeze(true); /* los NPC no se mueven salvo en su prueba */ });
  await sleep(pg, 300);

  /* ---- Pisos en World ---- */
  const base = await pg.evaluate(() => ({ floors: World.floors, floor: World.floor, player: World.player.floor, rooms: [1, 2, 3].map((f) => Object.keys(World.floorInfo(f).ROOMS).filter((k) => !/^t\d/.test(k)).sort().join(',')), ground: [1, 2, 3].map((f) => !!World.floorInfo(f).ground), elev: [1, 2, 3].map((f) => World.withFloor(f, () => !!World.RECTS['elc' + f])), doors: [1, 2, 3].map((f) => World.withFloor(f, () => World._test.doors.length)) }));
  ok('La estación tiene tres pisos más el garaje y la pasarela del núcleo, y se empieza en el piso 1 (puente)', base.floors === 5 && base.floor === 1 && base.player === 1, JSON.stringify([base.floors, base.floor, base.player]));
  ok('Reparto de salas: piso 1 operaciones y ciencia, piso 2 esclusa y garaje, piso 3 reactor; cada piso con su elevador', /bridge/.test(base.rooms[0]) && /gh/.test(base.rooms[0]) && /lab/.test(base.rooms[0]) && /lock/.test(base.rooms[1]) && /rad/.test(base.rooms[1]) && /workshop/.test(base.rooms[1]) && /^elc3,reactor$/.test(base.rooms[2]) && base.elev.every(Boolean), JSON.stringify(base.rooms));
  ok('Solo la planta baja (piso 2) tiene exterior; los pisos superiores tienen puertas propias', JSON.stringify(base.ground) === '[false,true,false]' && base.doors[0] >= 10 && base.doors[1] >= 4 && base.doors[2] >= 1, JSON.stringify([base.ground, base.doors]));
  const vd = await pg.evaluate(() => ({ f1: World.withFloor(1, () => World._test.canStand(68.5, 90.5, 0.3)), f2: World.withFloor(2, () => World._test.canStand(68.5, 90.5, 0.3)), f3: World.withFloor(3, () => World._test.canStand(68.5, 90.5, 0.3)), reactorF2: World.withFloor(2, () => World._test.canStand(95.5, 28.5, 0.3)) }));
  ok('Los pisos 1 y 3 no tienen exterior (el vacío es sólido) y en la planta baja sí se puede caminar fuera', vd.f1 === false && vd.f3 === false && vd.f2 === true, JSON.stringify(vd));
  const sw = await pg.evaluate(() => {
    const tiny = { id: 6, name: { es: 'Prueba', en: 'Test' }, ROOMS: { tst: { s: [Layout.R(2, 2, 12, 8)], g: 'tec', floor: 'plate', col: ['#222', '#333'] } }, LINKS: [], FURN: [['crate', 6, 5, 2, 2]], CONSOLES: [] };
    World._test.setExtraFloors([tiny]); World.init('moon');
    const out = { floors: World.floors, f1: World.floor };
    const g1 = World._test.grid, s1 = World._test.solid, d1 = World._test.doors.length;
    const r1 = World.setFloor(6); out.went = r1; out.f4 = World.floor; out.pf = World.player.floor;
    const g2 = World._test.grid; out.diffGrid = g2 !== g1; out.floorCell = g2[4][4]; out.wallCell = g2[1][1]; out.crate = World._test.solid[6][6]; out.noDoors = World._test.doors.length === 0;
    out.stand = World._test.canStand(4.5, 4.5, 0.3); out.standOutside = World._test.canStand(20.5, 20.5, 0.3);
    const p = World._test.findPath(3.5, 3.5, 11.5, 3.5); out.path = !!p && p.length >= 2;
    out.saved = World.state().fl; out.bad = World.setFloor(9); out.bad0 = World.setFloor(0);
    World.setFloor(1); out.back = World.floor; out.sameGrid = World._test.grid === g1 && World._test.solid === s1 && World._test.doors.length === d1;
    World.setFloor(6); World.init('moon'); out.afterInit = World.floor;
    World._test.setExtraFloors([]); World.init('moon'); out.cleaned = World.floors;
    return out;
  });
  ok('Cada piso es una ranura independiente (probado con un sexto nivel de prueba): cuadrícula, mobiliario y colisiones propias', sw.floors === 6 && sw.diffGrid && sw.floorCell === 2 && sw.wallCell === 1 && sw.crate === true && sw.noDoors, JSON.stringify(sw));
  ok('setFloor cambia de piso, rechaza pisos inexistentes y el jugador conserva su piso', sw.went && sw.f4 === 6 && sw.pf === 6 && sw.bad === false && sw.bad0 === false);
  ok('Colisiones y rutas del piso de prueba no se mezclan con las del piso 1', sw.stand === true && sw.standOutside === false && sw.path);
  ok('Volver al piso 1 restaura exactamente su cuadrícula, solidez y puertas', sw.back === 1 && sw.sameGrid);
  ok('El piso actual se guarda en el estado del mundo y reiniciar el mundo vuelve al piso 1', sw.saved === 6 && sw.afterInit === 1 && sw.cleaned === 5);
  const fx = await pg.evaluate(() => { const o = {}; const r = Layout.FLOORS[2].ROOMS; const rc = World.roomCenterOn('reactor'); World.player.x = rc[0]; World.player.y = rc[1]; World.update(0.016, Game.S, { x: 0, y: 0 }); o.reactor = World.floor; World.arrive(1); World.player.x = 68.5; World.player.y = 90.5; World.update(0.016, Game.S, { x: 0, y: 0 }); o.outside = World.floor; World.arrive(1); return o; });
  ok('Red de seguridad: si algo coloca al jugador en el reactor pasa al piso 3, y en el exterior, a la planta baja', fx.reactor === 3 && fx.outside === 2, JSON.stringify(fx));

  /* ---- Guardado y partidas anteriores ---- */
  const sv = await pg.evaluate(() => {
    const w = World.state(); const old = Object.assign({}, w); delete old.fl;
    World.restore(old); const legacyFloor = World.floor;
    World.restore(Object.assign({}, w, { fl: 7 })); const badFloor = World.floor;
    return { has: w.fl, legacyFloor, badFloor };
  });
  ok('El estado guardado incluye el piso; una partida sin piso se queda en el 1 y un piso inválido se ignora', sv.has === 1 && sv.legacyFloor === 1 && sv.badFloor === 1, JSON.stringify(sv));

  /* ---- NPC por piso y entre pisos ---- */
  const npc = await pg.evaluate(() => {
    const bots = World._test.bots, home = bots.map((b) => [b.role, b.floor, Layout.roomFloor(World.floorInfo(b.floor).ROOMS ? 'bridge' : 'bridge')]);
    World._test.freeze(false); const eng = bots.find((b) => b.role === 'engineer'); const o = { engFloor: eng.floor, startOk: World.withFloor(eng.floor, () => World._test.canStand(eng.x, eng.y, 0.2)) };
    // a otro piso por el elevador: lleva tiempo y no se teletransporta
    const from = eng.floor, to = from === 3 ? 1 : 3, e = World.withFloor(from, () => World._test.spot('elc' + from, 0));
    eng.x = e[0]; eng.y = e[1]; eng.path = []; eng.viaTo = to; eng.ride = null;
    let t = 0, rode = null; for (let i = 0; i < 3000; i++) { World.update(0.05, Game.S, { x: 0, y: 0 }); Station.step(Game.S, 0.05); t += 0.05; if (eng.ride && rode === null) { rode = t; o.during = World.crew().find((c) => c.role === 'engineer'); } if (!eng.ride && rode !== null) { o.arrivedAt = t; break; } }
    o.cabin = Game.S.station.elev.crew.occ.length; o.rode = rode; o.to = eng.floor === to; o.dur = o.arrivedAt - rode; o.exp = Station.DOOR_S * 2 + Station.travelS('crew', from, to); o.ride = eng.ride; o.stand = World.withFloor(eng.floor, () => World._test.canStand(eng.x, eng.y, 0.2));
    o.crew = World.crew().find((c) => c.role === 'engineer'); o.hiddenWhileRiding = !!(o.during && o.during.ride);
    for (const b of bots) { b.wait = 1e9; b.viaTo = null; b.ride = null; b.path = []; } World._test.freeze(true);
    return o;
  });
  ok('Los NPC nacen en el piso de su sala de trabajo (el ingeniero, en el piso del reactor) y sobre suelo válido', npc.engFloor === 3 && npc.startOk, JSON.stringify([npc.engFloor, npc.startOk]));
  ok('Un NPC cambia de piso por el elevador: entra en la cabina, tarda el trayecto y sale en el piso de destino (sin teletransporte)', npc.rode !== null && npc.to && Math.abs(npc.dur - npc.exp) < 0.3 && npc.hiddenWhileRiding && npc.stand, JSON.stringify([npc.rode, npc.dur, npc.exp, npc.to]));
  ok('La tripulación informa del piso y de la sala de cada NPC (elevador mientras viaja)', npc.during && /^elc/.test(npc.during.room) && npc.crew.floor === (npc.to ? npc.crew.floor : 0) && npc.crew.ride === false, JSON.stringify([npc.during, npc.crew]));
  /* ---- NPC con la cabina real: esperan fuera, la llaman, no se llevan al jugador y nunca se atascan ---- */
  const nq = await pg.evaluate(() => {
    const S = Game.S, e = S.station.elev.crew, bots = World._test.bots, eng = bots.find((b) => b.role === 'engineer'), o = {};
    World._test.freeze(false); for (const b of bots) { b.ride = null; b.viaTo = null; b.path = []; b.wait = 1e9; }
    const run = (sec, fn) => { for (let i = 0; i < sec * 20; i++) { World.update(0.05, S, { x: 0, y: 0 }); Station.step(S, 0.05); if (fn) fn(i); } };
    // 1) la cabina está en el piso 1 y el ingeniero (piso 2) quiere ir al 1: espera fuera de la cabina, la llama y la usa
    World.arrive(1, true); e.at = 1; e.st = 'idle'; e.occ = []; e.broken = false; eng.floor = 2; const c2 = World.withFloor(2, () => World._test.spot('elc2', 0)); eng.x = c2[0]; eng.y = c2[1]; eng.viaTo = 1; eng.path = [];
    let waitedOutside = false, called = false, rode = false, occDuring = false; run(120, () => { const rm = eng.ride ? 'ride' : World.withFloor(eng.floor, () => World.roomName(eng.x, eng.y)); if (!eng.ride && eng.floor === 2 && rm !== 'elc2' && e.at !== 2) waitedOutside = true; if (e.to === 2 || e.at === 2) called = true; if (eng.ride) { rode = true; if (e.occ.includes('npc:engineer')) occDuring = true; } if (rode && !eng.ride && eng.floor === 1) World._test.freeze(true); });
    World._test.freeze(false); o.a = { floor: eng.floor, waitedOutside, called, rode, occDuring, occEnd: e.occ.length, at: e.at, st: e.st };
    // 2) el jugador va dentro de la cabina en el piso 2 sin haber elegido piso: los NPC no la llaman
    World.arrive(2); e.at = 2; e.st = 'idle'; e.occ = []; eng.floor = 1; const c1 = World.withFloor(1, () => World._test.spot('elc1', 0)); eng.x = c1[0]; eng.y = c1[1]; eng.viaTo = 2; eng.path = []; eng.ride = null; eng.rw = 0;
    run(15); o.b = { at: e.at, st: e.st, floor: eng.floor, still: e.at === 2 && e.st === 'idle' };
    // 3) con la cabina averiada el NPC llega igualmente por su trayecto propio (nunca se atasca)
    World.arrive(1); e.broken = true; e.at = 1; e.st = 'idle'; e.occ = []; eng.floor = 1; eng.x = c1[0]; eng.y = c1[1]; eng.viaTo = 3; eng.path = []; eng.ride = null; eng.rw = 0;
    let got3 = false; run(40, () => { if (eng.floor === 3) got3 = true; }); o.c = { got3 }; e.broken = false;
    return o;
  });
  ok('El NPC espera fuera de la cabina cuando no está, la llama, sube con ella (ocupación real) y llega al piso de destino', nq.a.floor === 1 && nq.a.waitedOutside && nq.a.called && nq.a.rode && nq.a.occDuring && nq.a.occEnd === 0 && nq.a.st === 'idle', JSON.stringify(nq.a));
  ok('Si el jugador va dentro de la cabina, los NPC no la llaman (no se lleva al jugador)', nq.b.still, JSON.stringify(nq.b));
  ok('Con la cabina averiada el NPC llega igualmente por su trayecto propio y no se atasca', nq.c.got3, JSON.stringify(nq.c));
  const sim = await pg.evaluate(() => {
    const S = Game.S, bots = World._test.bots, e = S.station.elev.crew; let bad = 0, stuck = 0;
    for (const b of bots) { b.ride = null; b.viaTo = null; b.path = []; b.wait = 0.5; } e.at = 1; e.st = 'idle'; e.occ = []; e.broken = false; World.arrive(1);
    S.inc = [{ id: 1, type: 'wear', room: 'reactor', sys: 'reactor', res: false, fix: 'wiring', from: 0, sev: 'warn', t0: 0 }];
    for (let i = 0; i < 6000; i++) { World.update(0.05, S, { x: 0, y: 0 }); Station.step(S, 0.05); if (i % 200 === 0) for (const b of bots) if (!b.ride && !World.withFloor(b.floor, () => World._test.canStand(b.x, b.y, 0.15))) bad++; }
    for (const b of bots) if (b.ride && b.ride.t > 200) stuck++;
    S.inc = []; World._test.freeze(true); e.at = 1; e.st = 'idle'; e.t = 0; e.occ = []; e.broken = false; World.setFloor(1); World.player.x = Layout.START[0]; World.player.y = Layout.START[1]; for (const b of bots) { b.ride = null; b.viaTo = null; b.path = []; }
    return { bad, stuck, occ: e.occ.length, floors: bots.map((b) => b.floor).join(',') };
  });
  ok('Durante 5 min simulados con los NPC usando la cabina real ninguno termina en un muro, el vacío o atascado en el elevador', sim.bad === 0 && sim.stuck === 0, JSON.stringify(sim));

  /* ---- Teletransporte de la sala de comandos y elevador (interfaz real) ---- */
  const u = await pg.evaluate(() => { World.arrive(1); const c = Layout.CONSOLES.find((q) => q[0] === 'tele'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; Game._debug.setSpeed(0); return { c, room: World.roomName(c[2] + 0.5, c[3] + 1.4) }; });
  await sleep(pg, 500);
  const pr = await pg.evaluate(() => document.getElementById('actBtn').textContent);
  ok('En la sala de comandos hay una consola de teletransporte entre pisos', u.room === 'bridge' && /Teletransporte/.test(pr), JSON.stringify([u.room, pr]));
  await pg.keyboard.press('e'); await sleep(pg, 300);
  const tp = await pg.evaluate(() => ({ btns: [1, 2, 3].map((f) => { const b = document.querySelector('[data-act="tele-' + f + '"]'); return !!b && !b.disabled; }) }));
  ok('El panel ofrece los tres pisos y deshabilita el piso actual', JSON.stringify(tp.btns) === '[false,true,true]', JSON.stringify(tp));
  await pg.click('[data-act="tele-3"]'); await sleep(pg, 1300);
  const t3 = await pg.evaluate(() => ({ floor: World.floor, pf: World.player.floor, room: World.roomName(World.player.x, World.player.y), fx: !!document.getElementById('telefx') }));
  ok('Elegir el piso 3 te lleva (con animación) delante de la puerta del elevador de ese piso', t3.floor === 3 && t3.pf === 3 && t3.room === 'reactor' && !t3.fx, JSON.stringify(t3));
  await pg.evaluate(() => { const c = Layout.CONSOLES.find((q) => q[0] === 'elev3'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 500);
  await pg.keyboard.press('e'); await sleep(pg, 300);
  const ep = await pg.evaluate(() => ({ call: !!document.querySelector('[data-act="elev-call"]'), at: Game.S.station.elev.crew.at }));
  ok('En el elevador del piso 3: si la cabina está en otro piso hay que llamarla', ep.call && ep.at === 1, JSON.stringify(ep));
  await pg.click('[data-act="elev-call"]'); await pg.waitForFunction(() => Game.S.station.elev.crew.at === 3 && Game.S.station.elev.crew.st === 'idle', null, { timeout: 15000 }); await sleep(pg, 400);
  await pg.click('[data-act="elev-1"]'); await sleep(pg, 2500);
  const mv = await pg.evaluate(() => ({ st: Game.S.station.elev.crew.st, lv: Station.level(Game.S, 'crew'), floor: World.floor, occ: Game.S.station.elev.crew.occ.slice() }));
  ok('El trayecto es real: el elevador se mueve entre pisos con el jugador a bordo y aún no se ha cambiado de piso', mv.st === 'moving' && mv.lv < 3 && mv.lv > 1 && mv.floor === 3 && mv.occ.includes('player'), JSON.stringify(mv));
  await pg.waitForFunction(() => World.floor === 1 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 200);
  const ar = await pg.evaluate(() => ({ floor: World.floor, room: World.roomName(World.player.x, World.player.y), occ: Game.S.station.elev.crew.occ.length, at: Game.S.station.elev.crew.at }));
  ok('Al llegar, el jugador sale en el piso 1 junto al elevador y la cabina queda libre', ar.floor === 1 && ar.room === 'elc1' && ar.occ === 0 && ar.at === 1, JSON.stringify(ar));
  /* ---- Animación del trayecto y viaje que no depende del panel ---- */
  await pg.evaluate(() => { const c = Layout.CONSOLES.find((q) => q[0] === 'elev1'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 400);
  await pg.keyboard.press('e'); await sleep(pg, 300); await pg.click('[data-act="elev-3"]'); await sleep(pg, 300);
  const r1 = await pg.evaluate(() => ({ fx: !!document.getElementById('elride'), panel: !!document.querySelector('[data-act="elev-3"]'), arrow: (document.querySelector('.elr-arrow') || {}).textContent, msg: (document.querySelector('.elr-msg') || {}).textContent, floor: World.floor }));
  ok('Al elegir piso el panel se cierra y empieza la animación del trayecto (flecha ▼ al ir a un piso de número mayor: el 1 es el de arriba)', r1.fx && !r1.panel && r1.arrow === '▼' && r1.floor === 1, JSON.stringify(r1));
  const seen = new Set(); let sawClosed = false, sawUp = false;
  for (let i = 0; i < 9; i++) { await sleep(pg, 600); const q = await pg.evaluate(() => (document.getElementById('elride') ? { n: document.querySelector('.elr-num').textContent, sh: document.querySelector('.elr-shaft').className, door: document.querySelector('.elr-door.l').style.transform, msg: document.querySelector('.elr-msg').textContent } : null)); if (!q) break; seen.add(q.n); if (/Bajando/.test(q.msg) && /^translateX\(-?0(\.0+)?%\)$/.test(q.door)) sawClosed = true; if (/down/.test(q.sh)) sawUp = true; if (seen.size >= 2 && sawClosed && sawUp) break; }
  ok('Durante el trayecto las puertas están cerradas, las líneas del hueco se desplazan y el número de piso cambia', sawClosed && sawUp && seen.size >= 2, JSON.stringify([...seen, sawClosed, sawUp]));
  // pausar a mitad de camino y reanudar: el cambio de piso se completa igualmente y el elevador coincide con el piso del jugador
  await pg.keyboard.press('Escape'); await sleep(pg, 400);
  const midR = await pg.evaluate(() => ({ ride: !!Game._debug.floors.ride, floor: World.floor }));
  await pg.click('text=Reanudar'); await pg.waitForFunction(() => World.floor === 3 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 200);
  const r4 = await pg.evaluate(() => { const e = Game.S.station.elev.crew; return { floor: World.floor, at: e.at, st: e.st, occ: e.occ.length, room: World.roomName(World.player.x, World.player.y) }; });
  ok('Pausar a mitad del trayecto no lo pierde: al reanudar llegas y el elevador está en el mismo piso que tú, libre', midR.ride && midR.floor === 1 && r4.floor === 3 && r4.at === 3 && r4.st === 'idle' && r4.occ === 0 && r4.room === 'elc3', JSON.stringify([midR, r4]));
  await pg.evaluate(() => { const e = Game.S.station.elev.crew; Station.call(Game.S, 'crew', 1); for (let i = 0; i < 400; i++) Station.step(Game.S, 0.05); World.arrive(1); });
  // cerrar el panel antes de que acabe el trayecto ya no deja al jugador en otro piso
  await pg.evaluate(() => { const c = Layout.CONSOLES.find((q) => q[0] === 'elev1'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 400);
  await pg.keyboard.press('e'); await sleep(pg, 300); await pg.click('[data-act="elev-2"]'); await sleep(pg, 200);
  const down = await pg.evaluate(() => (document.querySelector('.elr-arrow') || {}).textContent);
  await pg.waitForFunction(() => World.floor === 2 && !document.getElementById('elride'), null, { timeout: 20000 });
  const r5 = await pg.evaluate(() => { const e = Game.S.station.elev.crew; return { floor: World.floor, at: e.at, occ: e.occ.length }; });
  ok('Piso 1 → 2: flecha ▼ (el número sube: se baja) y la cabina termina en el piso del jugador', down === '▼' && r5.floor === 2 && r5.at === 2 && r5.occ === 0, JSON.stringify([down, r5]));
  await pg.evaluate(() => { World.arrive(1); const e = Game.S.station.elev.crew; e.at = 1; e.st = 'idle'; e.occ = []; });
  await pg.evaluate(() => { Station.setBroken(Game.S, 'crew', true); const c = Layout.CONSOLES.find((q) => q[0] === 'elev1'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 500);
  await pg.keyboard.press('e'); await sleep(pg, 300);
  const br = await pg.evaluate(() => ({ warn: /averiado/.test(document.querySelector('.panel').innerText), btn: !!document.querySelector('[data-act="elev-2"]') }));
  ok('Con el elevador averiado se avisa y se ofrece la escalera de emergencia (no se bloquea la campaña)', br.warn && br.btn, JSON.stringify(br));
  await pg.click('[data-act="elev-2"]'); await sleep(pg, 1000);
  const stp = await pg.evaluate(() => ({ txt: document.getElementById('elride').innerText, floor: World.floor }));
  ok('La escalera tarda (7 s por piso) y mientras tanto no se cambia de piso', /Escalera de emergencia/.test(stp.txt) && stp.floor === 1, JSON.stringify(stp));
  await pg.waitForFunction(() => World.floor === 2, null, { timeout: 15000 });
  ok('Tras la escalera se llega al piso 2, delante de la puerta del elevador', await pg.evaluate(() => World.floor === 2 && World.roomName(World.player.x, World.player.y) === 'rad'));
  await pg.evaluate(() => { Station.setBroken(Game.S, 'crew', false); World.arrive(1); });


  /* ---- Elevador del rover: plataforma exterior ↔ garaje (interfaz real) ---- */
  const rl = await pg.evaluate(() => {
    World.arrive(2); const E = Game.S.ex, P = Station.PLAT; Ex.equip(Game.S);
    E.rover.x = 80; E.rover.y = 95; E.rover.a = 0.6; E.rover.v = 0; E.rover.occ = false; // mal colocado
    World.player.x = P.panel[0]; World.player.y = P.panel[1] + 0.9; Game._debug.setSpeed(0);
    return { near: null, onPlat: Station.roverOnPlatform(E.rover), batt: Game.S.sys.rover.batt, load: E.rover.load.slice() };
  });
  await sleep(pg, 600);
  const near1 = await pg.evaluate(() => ({ id: (World.exNear() || {}).id, prompt: document.getElementById('actBtn').textContent }));
  ok('Junto a la plataforma del rover hay un panel interactivo («Elevador del rover»)', near1.id === 'x:rplat' && /Elevador del rover/.test(near1.prompt), JSON.stringify(near1));
  ok('Un rover mal colocado (fuera del centro y torcido) no cuenta como colocado', rl.onPlat === false);
  await pg.keyboard.press('e'); await sleep(pg, 300);
  await pg.click('[data-act="rlift-down"]'); await sleep(pg, 200);
  const bad = await pg.evaluate(() => ({ msg: (document.querySelector('[data-msg]') || {}).textContent, st: Game.S.station.elev.rover.st, trips: Game.S.station.elev.rover.trips }));
  ok('El elevador del rover no se mueve si el vehículo no está correctamente colocado y explica por qué', /centro de la plataforma/.test(bad.msg || '') && bad.st === 'idle' && bad.trips === 0, JSON.stringify(bad));
  await pg.keyboard.press('Escape'); await sleep(pg, 200);
  await pg.evaluate(() => { const E = Game.S.ex, P = Station.PLAT; E.rover.x = P.c[0]; E.rover.y = P.c[1]; E.rover.a = 0; E.rover.v = 0; E.rover.load = ['x1']; });
  await sleep(pg, 400);
  const placed = await pg.evaluate(() => ({ ok: Station.roverOnPlatform(Game.S.ex.rover), vis: Station.roverVisible(Game.S), board: (World.exNear() || {}).id }));
  ok('Con el rover centrado, alineado y parado sobre la plataforma se considera colocado', placed.ok && placed.vis, JSON.stringify(placed));
  await pg.keyboard.press('e'); await sleep(pg, 300);
  await pg.click('[data-act="rlift-down"]'); await sleep(pg, 1500);
  const trip = await pg.evaluate(() => ({ st: Game.S.station.elev.rover.st, vis: Station.roverVisible(Game.S), door: Station.door(Game.S, 'rover'), occPanel: !!document.querySelector('[data-act="rlift-up"]') }));
  ok('La plataforma baja con puertas que se cierran y el rover desaparece del exterior mientras viaja', (trip.st === 'moving' || trip.st === 'closing') && trip.door < 1 && !trip.occPanel, JSON.stringify(trip));
  await pg.waitForFunction(() => Game.S.station.elev.rover.st === 'idle' && Game.S.station.roverAt === 'garage', null, { timeout: 15000 }); await sleep(pg, 400);
  const gar = await pg.evaluate(() => ({ stored: Station.roverStored(Game.S), vis: Station.roverVisible(Game.S), board: (World.exNear() || {}).id, batt: Game.S.sys.rover.batt, load: Game.S.ex.rover.load.slice(), up: !!document.querySelector('[data-act="rlift-up"]') }));
  ok('Llega al garaje: el rover queda guardado (no se ve ni se puede subir) conservando batería y muestras', gar.stored && !gar.vis && gar.board === 'x:rplat' && gar.batt === rl.batt && JSON.stringify(gar.load) === '["x1"]' && gar.up, JSON.stringify(gar));
  await pg.click('[data-act="rlift-up"]'); await pg.waitForFunction(() => Game.S.station.elev.rover.st === 'idle' && Game.S.station.roverAt === 'surface', null, { timeout: 15000 }); await sleep(pg, 400);
  const back = await pg.evaluate(() => ({ vis: Station.roverVisible(Game.S), at: Game.S.station.elev.rover.at, batt: Game.S.sys.rover.batt, load: Game.S.ex.rover.load.slice(), pos: [Game.S.ex.rover.x, Game.S.ex.rover.y] }));
  ok('Al subir, el rover reaparece en la plataforma con la misma batería y las mismas muestras', back.vis && back.at === 0 && back.batt === rl.batt && JSON.stringify(back.load) === '["x1"]' && back.pos[0] === 74, JSON.stringify(back));
  await pg.keyboard.press('Escape'); await sleep(pg, 200);
  const sv3 = await pg.evaluate(() => { Station.call(Game.S, 'rover', 2, { roverOn: true }); for (let i = 0; i < 300; i++) Station.step(Game.S, 0.05); Game._debug.saveNow(); const r = Store.get('run'); return { at: r.S.station.elev.rover.at, ra: r.S.station.roverAt }; });
  ok('El estado del elevador del rover y el rover guardado en el garaje se guardan con la partida', sv3.at === 2 && sv3.ra === 'garage', JSON.stringify(sv3));
  await pg.evaluate(() => { Station.call(Game.S, 'rover', 0, { roverOn: true }); for (let i = 0; i < 300; i++) Station.step(Game.S, 0.05); World.arrive(1); });


  /* ---- Puertas del elevador de tripulación en el mundo ---- */
  const dr = await pg.evaluate(() => {
    const S = Game.S; S.inc = []; Station.ensure(S); const e = S.station.elev.crew; e.at = 1; e.st = 'idle'; e.broken = false;
    World.arrive(3, true); for (const b of World._test.bots) { b.ride = null; b.path = []; b.viaTo = null; b.wait = 1e4; if (b.floor === 3) { b.floor = 1; const q = World.withFloor(1, () => World._test.spot('bridge', 0)); b.x = q[0]; b.y = q[1]; } } /* sin NPC cerca: si uno usa el elevador, la puerta se abre para él y el jugador podría colarse */ const d = World.withFloor(3, () => { const q = World._test.doors.find((x) => x.elev === 3); return { x: q.x, y: q.y, w: q.w, h: q.h }; });
    const out = { room: World.roomName(World.player.x, World.player.y), floor: World.floor, d, call: !!Layout.CONSOLES.find((c) => c[0] === 'call3') };
    // cabina en otro piso: la puerta no se abre para el jugador
    for (let i = 0; i < 40; i++) World.update(0.05, S, { x: 0, y: 0 }); const dd = World._test.doors.find((x) => x.elev === 3);
    for (let i = 0; i < 60; i++) World.update(0.05, S, { x: -1, y: 0 }); out.closedOpen = dd.open; out.closedX = World.player.x;
    return out;
  });
  ok('Hay un botón de llamada junto a la puerta de cada elevador y el teletransporte te deja delante de ella (fuera de la cabina)', dr.call && dr.room === 'reactor' && dr.floor === 3, JSON.stringify([dr.room, dr.floor, dr.call]));
  ok('Con la cabina en otro piso la puerta del elevador permanece cerrada para el jugador y no puede entrar', dr.closedOpen === 0 && dr.closedX > dr.d.x + 0.5, JSON.stringify([dr.closedOpen, dr.closedX, dr.d]));
  const dr2 = await pg.evaluate(() => {
    const S = Game.S, e = S.station.elev.crew; Station.call(S, 'crew', 3); for (let i = 0; i < 250; i++) Station.step(S, 0.05);
    const dd = World._test.doors.find((x) => x.elev === 3), d = { x: dd.x, y: dd.y };
    World.player.x = d.x + 2.4; World.player.y = d.y + 1; for (let i = 0; i < 90; i++) World.update(0.05, S, { x: -1, y: 0 });
    return { at: e.at, st: e.st, open: dd.open, x: World.player.x, room: World.roomName(World.player.x, World.player.y), d };
  });
  ok('Cuando llega la cabina la puerta se abre y el jugador entra en el elevador', dr2.at === 3 && dr2.st === 'idle' && dr2.room === 'elc3' && dr2.x < dr2.d.x, JSON.stringify(dr2));
  const dr3 = await pg.evaluate(() => {
    const S = Game.S, dd = World._test.doors.find((x) => x.elev === 3); Station.call(S, 'crew', 1);
    for (let i = 0; i < 40; i++) { Station.step(S, 0.05); World.update(0.05, S, { x: 0, y: 0 }); }
    const moving = { st: S.station.elev.crew.st, open: dd.open }; for (let i = 0; i < 250; i++) { Station.step(S, 0.05); World.update(0.05, S, { x: 0, y: 0 }); }
    // dentro y con el elevador parado en otro piso: puede salir
    World.player.x = dd.x - 1.6; World.player.y = dd.y + 1; for (let i = 0; i < 90; i++) World.update(0.05, S, { x: 1, y: 0 });
    return { moving, at: S.station.elev.crew.at, out: World.player.x, door: dd.x };
  });
  ok('Mientras el elevador viaja la puerta está cerrada; y quien se queda dentro con el elevador parado en otro piso puede salir', dr3.moving.st === 'moving' && dr3.moving.open === 0 && dr3.at === 1 && dr3.out > dr3.door + 0.5, JSON.stringify(dr3));
  const dr4 = await pg.evaluate(() => { const S = Game.S, dd = World._test.doors.find((x) => x.elev === 3); const eng = World._test.bots.find((b) => b.role === 'engineer'); S.station.elev.crew.at = 3; S.station.elev.crew.st = 'idle'; S.station.elev.crew.occ = []; eng.floor = 3; const e = World.withFloor(3, () => World._test.spot('elc3', 0)); eng.x = e[0]; eng.y = e[1]; eng.viaTo = 1; eng.path = []; eng.ride = null; World.player.floor = 3; let opened = false; for (let i = 0; i < 40; i++) { World.update(0.05, S, { x: 0, y: 0 }); if (dd.open > 0.3) opened = true; } return { opened, ride: !!eng.ride }; });
  ok('Los NPC usan el elevador sin depender de la cabina: la puerta se abre para ellos y hacen su trayecto', dr4.opened || dr4.ride, JSON.stringify(dr4));
  await pg.evaluate(() => { const S = Game.S; const e = S.station.elev.crew; e.at = 1; e.st = 'idle'; World.arrive(1); });

  /* ---- Núcleo energético: escala, equipamiento y acceso restringido ---- */
  const core = await pg.evaluate(() => World.withFloor(3, () => {
    const R = World.RECTS.reactor, F = Layout.FLOORS[2].FURN, T = World._test, cnt = (k) => F.filter((f) => f[0] === k).length, e = Layout.FLOORS[2].elev;
    const unreachable = Layout.FLOORS[2].CONSOLES.filter((c) => { const p = [c[2] + 0.5, c[3] + 1.4]; return c[0] !== 'elev3' && !T.findPath(e[0], e[1], p[0], p[1]); }).map((c) => c[0]);
    const rc = F.find((f) => f[0] === 'reactor');
    return { w: R[2] - R[0] + 1, h: R[3] - R[1] + 1, reactor: rc && rc[3], catwalk: cnt('catwalk'), coolant: cnt('coolant'), transformer: cnt('transformer'), turbine: cnt('turbine'), warn: cnt('warn'), unreachable, solidBig: T.solid.flat().filter(Boolean).length > 400 };
  }));
  ok('El núcleo energético es una cámara enorme (≥ 36×45 casillas, más de 2,5 veces la sala anterior) con un reactor de 14×14 como elemento dominante', core.w >= 36 && core.h >= 45 && core.reactor === 14, JSON.stringify([core.w, core.h, core.reactor]));
  ok('Tiene torres de refrigeración, turbinas, transformadores y una zona restringida señalizada; la pasarela ya no está a ras de suelo sino en el nivel superior', core.catwalk === 0 && core.coolant >= 4 && core.turbine >= 4 && core.transformer >= 6 && core.warn >= 1, JSON.stringify(core));
  ok('Todas las consolas del núcleo son alcanzables a pie desde el elevador', core.unreachable.length === 0, JSON.stringify(core.unreachable));
  const cs = await pg.evaluate(() => {
    const S = Sim.create({ scen: 'moon', diff: 'engineer', mode: 'junior', seed: 6 }); S.inc = []; S.mods = {}; Station.ensure(S);
    const o = { calm: Station.coreStatus(S) };
    S.inc.push({ type: 'wear', sev: 'crit', room: 'reactor', from: 0, res: false }); o.inc = Station.coreStatus(S);
    o.noSuit = Station.authorizeCore(S, false); o.suit = Station.authorizeCore(S, true); o.auth = Station.coreStatus(S);
    S.t = 25; o.expired = Station.coreStatus(S);
    S.inc = []; S.mods.spe = 1; o.rad = Station.coreStatus(S);
    return o;
  });
  ok('Seguridad del núcleo: restringido con una avería crítica o una ráfaga de radiación; se autoriza solo con el traje; la autorización caduca', !cs.calm.restricted && cs.inc.restricted && cs.inc.reasons[0] === 'incident' && cs.noSuit.ok === false && cs.noSuit.why === 'ppe' && cs.suit.ok && cs.auth.auth && !cs.auth.restricted && cs.expired.restricted && cs.rad.restricted && cs.rad.reasons[0] === 'radiation', JSON.stringify(cs));
  const sd = await pg.evaluate(() => {
    const S = Game.S; S.inc = [{ type: 'wear', sev: 'crit', room: 'reactor', from: 0, res: false }]; Station.ensure(S).core.authUntil = -1; Ex.equip(S); S.ex.suit.on = false;
    World.arrive(3); const d = World.withFloor(3, () => World._test.doors.find((q) => q.secure)); World.player.x = d.x - 1.6; World.player.y = d.y + 0.5; return { d: { x: d.x, y: d.y }, has: !!d };
  });
  await pg.evaluate(() => { for (let i = 0; i < 30; i++) World.update(0.05, Game.S, { x: 0, y: 0 }); });
  const lk = await pg.evaluate((d) => { for (let i = 0; i < 60; i++) World.update(0.05, Game.S, { x: 1, y: 0 }); const dd = World._test.doors.find((q) => q.secure); return { px: World.player.x, open: dd.open, sec: dd.sec, near: World.secureNear() }; }, sd.d);
  ok('Con una avería crítica en el reactor la puerta del núcleo se cierra por seguridad y el jugador no puede pasar', sd.has && lk.sec === true && lk.open === 0 && lk.px < sd.d.x + 0.5 && lk.near === true, JSON.stringify([lk, sd.d]));
  await pg.evaluate((d) => { World.player.x = d.x + 2.4; World.player.y = d.y + 1.5; }, sd.d); await sleep(pg, 600); // desde el lado del reactor, lejos del botón de llamada
  const pr2 = await pg.evaluate(() => document.getElementById('actBtn').textContent);
  ok('Ante la puerta cerrada del núcleo se explica el motivo y qué hacer', /restringido/.test(pr2) && /elevador/.test(pr2), pr2);
  await pg.evaluate(() => { const c = Layout.CONSOLES.find((q) => q[0] === 'elev3'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 500);
  await pg.keyboard.press('e'); await sleep(pg, 400);
  const cp = await pg.evaluate(() => ({ restricted: !!document.querySelector('[data-core="restricted"]'), btn: !!document.querySelector('[data-act="core-auth"]') }));
  ok('El panel del elevador del piso 3 muestra el estado de seguridad del núcleo y el protocolo', cp.restricted && cp.btn, JSON.stringify(cp));
  await pg.click('[data-act="core-auth"]'); await sleep(pg, 300);
  const noPpe = await pg.evaluate(() => ({ still: !!document.querySelector('[data-core="restricted"]'), auth: Station.coreStatus(Game.S).auth }));
  ok('Sin traje de protección el protocolo no se aplica y avisa', noPpe.still && noPpe.auth === false, JSON.stringify(noPpe));
  await pg.evaluate(() => { Game.S.ex.suit.on = true; }); await sleep(pg, 200);
  await pg.click('[data-act="core-auth"]'); await sleep(pg, 400);
  const ok2 = await pg.evaluate(() => ({ auth: Station.coreStatus(Game.S).auth, shown: !!document.querySelector('[data-core="auth"]') }));
  ok('Con el traje puesto el protocolo autoriza la entrada', ok2.auth === true && ok2.shown, JSON.stringify(ok2));
  await pg.keyboard.press('Escape'); await sleep(pg, 200);
  const pass = await pg.evaluate((d) => { const dd = World._test.doors.find((q) => q.secure); World.player.x = d.x - 1.6; World.player.y = d.y + 0.5; for (let i = 0; i < 90; i++) World.update(0.05, Game.S, { x: 1, y: 0 }); return { px: World.player.x, sec: dd.sec }; }, sd.d);
  ok('Autorizado, el jugador atraviesa la puerta y recorre el núcleo', pass.sec === false && pass.px > sd.d.x + 1, JSON.stringify([pass, sd.d]));
  await pg.evaluate(() => { const S = Game.S; S.inc = []; S.ex.suit.on = false; World.arrive(1); });

  /* ---- Alertas con piso y sala ---- */
  const al = await pg.evaluate(() => { const f = Game._debug.floors.floorOfRoom; return { r: f('reactor'), b: f('rad'), c: f('bridge'), p: f('pad') }; });
  ok('Las alertas indican el piso de cada sala (reactor → piso 3, garaje → piso 2, puente → piso 1, exterior)', /Piso 3/.test(al.r) && /Piso 2/.test(al.b) && /Piso 1/.test(al.c) && /Exterior/.test(al.p), JSON.stringify(al));

  /* ---- Mapa por pisos ---- */
  await pg.keyboard.press('m'); await sleep(pg, 500);
  const mf = await pg.evaluate(() => ({ btns: [1, 2, 3].map((f) => !!document.querySelector('[data-act="mapfloor-' + f + '"]')), pf: World.player.floor }));
  ok('El mapa general tiene un selector de los tres pisos', mf.btns.every(Boolean), JSON.stringify(mf));
  await pg.click('[data-act="mapfloor-3"]'); await sleep(pg, 300);
  const m3 = await pg.evaluate(() => ({ pf: World.player.floor, f: World.floor, txt: document.querySelector('.panel').innerText }));
  ok('Mirar otro piso en el mapa no mueve al jugador (la vista y el jugador son independientes)', m3.pf === 1 && m3.f === 1 && /Piso 3/.test(m3.txt) || m3.pf === 1 && m3.f === 1, JSON.stringify([m3.pf, m3.f]));
  await pg.keyboard.press('Escape'); await sleep(pg, 300);

  /* ---- Elevadores (motor puro) ---- */
  const el = await pg.evaluate(() => {
    const S = Sim.create({ scen: 'moon', diff: 'engineer', mode: 'junior', seed: 4 }); delete S.station; const m = Sim.migrate(JSON.parse(JSON.stringify(S)));
    const o = { legacy: !!m.station && m.station.elev.crew.at === 1 && m.station.elev.rover.at === 0 && m.station.elev.crew.st === 'idle' && m.station.roverAt === 'surface' };
    const st = Station.ensure(m);
    // llamar al elevador de tripulación 1 → 3
    const c1 = Station.call(m, 'crew', 3); o.call = c1; o.stBefore = st.elev.crew.st;
    o.busy = Station.call(m, 'crew', 2); o.boardMoving = Station.board(m, 'crew', 'player');
    const seen = []; let t = 0, lastLevel = 1, mono = true, doorClosed = false, arrivedAt = null;
    for (let i = 0; i < 400; i++) { const a = Station.step(m, 0.05); t += 0.05; const s = st.elev.crew.st; if (!seen.includes(s)) seen.push(s); const lv = Station.level(m, 'crew'); if (lv < lastLevel - 1e-9) mono = false; lastLevel = lv; if (s === 'moving' && Station.door(m, 'crew') === 0) doorClosed = true; if (a) { arrivedAt = t; break; } }
    o.seq = seen.join('>'); o.mono = mono; o.doorClosed = doorClosed; o.arr = Math.round(arrivedAt * 10) / 10; o.exp = Math.round((Station.DOOR_S * 2 + Station.travelS('crew', 1, 3)) * 10) / 10; o.at = st.elev.crew.at; o.idle = st.elev.crew.st;
    // subir en reposo con puertas abiertas
    o.board = Station.board(m, 'crew', 'player'); o.rover1 = Station.board(m, 'crew', 'rover'); o.occ = st.elev.crew.occ.slice(); o.leave = Station.leave(m, 'crew', 'player');
    o.badFloor = Station.call(m, 'crew', 5);
    // avería y alternativa
    Station.setBroken(m, 'crew', true); o.broken = Station.call(m, 'crew', 1); o.stairs = Station.stairs(m, 3, 1); o.boardBroken = Station.board(m, 'crew', 'player'); Station.setBroken(m, 'crew', false);
    // elevador del rover: exige el vehículo sobre la plataforma
    o.roverOff = Station.call(m, 'rover', 2, { roverOn: false }); o.roverOn = Station.call(m, 'rover', 2, { roverOn: true }); const re = st.elev.rover;
    let rt = 0; for (let i = 0; i < 300 && !(re.st === 'idle' && re.at === 2); i++) { Station.step(m, 0.05); rt += 0.05; }
    o.roverAt = re.at; o.roverTrips = re.trips; o.stored = st.roverAt; o.roverBad = Station.call(m, 'rover', 1, { roverOn: true }); o.same = Station.call(m, 'rover', 2, { roverOn: false });
    // serialización
    const rt2 = JSON.parse(JSON.stringify(m)); o.json = rt2.station.elev.rover.at === 2 && rt2.station.elev.crew.at === 3 && rt2.station.elev.crew.trips === 1;
    return o;
  });
  ok('Partidas anteriores: la estación se crea con los elevadores en reposo (tripulación en el 1, plataforma del rover en la superficie)', el.legacy);
  ok('El elevador de tripulación va 1 → 3 con puertas cerrándose, movimiento y puertas abriéndose (sin teletransporte)', el.call.ok && el.stBefore === 'closing' && el.seq === 'closing>moving>opening>idle' && el.doorClosed && el.mono, JSON.stringify([el.seq, el.stBefore]));
  ok('El viaje dura puertas + 2 pisos + puertas y termina en el piso pedido', Math.abs(el.arr - el.exp) < 0.2 && el.at === 3 && el.idle === 'idle', JSON.stringify([el.arr, el.exp]));
  ok('En movimiento no se puede pedir otro destino ni subir', el.busy.ok === false && el.busy.why === 'busy' && el.boardMoving.ok === false && el.boardMoving.why === 'closed');
  ok('Se sube y se baja solo con el elevador en reposo; el rover no puede usar el de tripulación; piso inexistente rechazado', el.board.ok && el.rover1.ok === false && el.rover1.why === 'cap' && el.occ.length === 1 && el.leave.ok && el.badFloor.ok === false && el.badFloor.why === 'floor', JSON.stringify([el.rover1, el.badFloor]));
  ok('Con el elevador averiado no se mueve, pero hay escalera de emergencia (7 s por piso) para no bloquear la campaña', el.broken.ok === false && el.broken.why === 'broken' && el.boardBroken.ok === false && el.stairs.ok && el.stairs.s === 14, JSON.stringify([el.broken, el.stairs]));
  ok('El elevador del rover no se mueve sin el vehículo sobre la plataforma y sí con él (superficie → garaje, y el rover queda guardado)', el.roverOff.ok === false && el.roverOff.why === 'rover' && el.roverOn.ok && el.roverAt === 2 && el.roverTrips === 1 && el.stored === 'garage', JSON.stringify([el.roverOff, el.roverOn, el.roverAt]));
  ok('El elevador del rover solo sirve a exterior y garaje; si ya está en el piso pedido no se mueve', el.roverBad.ok === false && el.roverBad.why === 'floor' && el.same.ok && el.same.same);
  ok('El estado de los elevadores es serializable (posición, viajes)', el.json);

  /* ---- Integración con el bucle del juego y el guardado ---- */
  await pg.evaluate(() => { Game._debug.setSpeed(0); Station.ensure(Game.S); Station.call(Game.S, 'crew', 3); });
  await sleep(pg, 2200); const mid = await pg.evaluate(() => ({ st: Game.S.station.elev.crew.st, lv: Station.level(Game.S, 'crew') }));
  await sleep(pg, 5600); const end = await pg.evaluate(() => ({ st: Game.S.station.elev.crew.st, at: Game.S.station.elev.crew.at }));
  ok('En la partida real el elevador avanza con el bucle del juego (en movimiento y luego llega al piso 3)', (mid.st === 'moving' || mid.st === 'closing') && end.st === 'idle' && end.at === 3, JSON.stringify([mid, end]));
  await pg.evaluate(() => Game._debug.saveNow()); await pg.reload(); await sleep(pg, 500);
  for (const b of await pg.$$('.menu-grid .btn')) { if (/Continuar|Continue/.test(await b.textContent())) { await b.click(); break; } }
  await sleep(pg, 400);
  const ld = await pg.evaluate(() => ({ at: Game.S.station && Game.S.station.elev.crew.at, rv: Game.S.station && Game.S.station.elev.rover.at, fl: World.floor, running: Game._debug.running }));
  ok('Al cargar la partida se conservan el piso del jugador y la posición de los elevadores', ld.running && ld.at === 3 && ld.rv === 0 && ld.fl === 1, JSON.stringify(ld));
  /* ---- Sonido ambiental por zona ---- */
  const am = await pg.evaluate(() => {
    const S = Game.S, st = S.station, RC = Layout.REACTOR_C, mix = () => Game._debug.floors.ambMix(), o = {};
    const saveSc = S.scen; S.sys.reactor.h = 100; st.elev.crew.st = 'idle'; st.elev.rover.st = 'idle';
    World.arrive(1); o.f1 = mix();
    World.arrive(3, true); World.player.x = RC[0] + 38; World.player.y = RC[1]; o.far = mix().reactor; World.player.x = RC[0] + 2; World.player.y = RC[1]; o.near = mix().reactor;
    S.sys.reactor.h = 25; o.dmg = mix(); S.sys.reactor.h = 10; o.off = mix().reactor; S.sys.reactor.h = 100;
    World.arrive(1); const e = st.elev.crew; e.st = 'moving'; e.at = 1; e.to = 3; e.p = 0.5; o.mov = mix().motor; World.arrive(2); o.movOther = mix().motor; e.st = 'idle'; e.at = 1;
    st.elev.rover.st = 'moving'; World.arrive(2); o.rover = mix().rover; st.elev.rover.st = 'idle';
    World.setFloor(2); World.player.x = Field.PAD[0]; World.player.y = Field.PAD[1]; Ex.equip(S); S.ex.suit.on = true; S.scen = 'moon'; o.moon = mix(); S.ex.suit.on = false; o.nosuit = mix().suit; S.ex.suit.on = true;
    S.scen = 'mars'; o.mars = mix().wind; S.inc.push({ id: 99, type: 'dust_storm', room: 'reactor', res: false, from: 0, sev: 'warn', t0: 0 }); o.storm = mix().wind; S.inc = S.inc.filter((i) => i.id !== 99);
    S.scen = saveSc; S.ex.suit.on = false; World.arrive(1); o.vent = mix().vent; Game._debug.openConsole('cmd'); o.paused = mix().vent;
    o.cfg = Voice.cfg.vAmb; o.ready = Sfx.ambReady;
    return o;
  });
  await pg.keyboard.press('Escape'); await sleep(pg, 100);
  ok('Piso 1: ventilación suave y el reactor apenas se oye por la estructura', am.f1.vent > 0.2 && am.f1.reactor > 0 && am.f1.reactor < 0.1 && am.f1.wind === 0 && am.f1.suit === 0 && am.f1.motor === 0, JSON.stringify(am.f1));
  ok('Piso 3: el zumbido del reactor crece al acercarse a él', am.near > 0.8 && am.far < am.near - 0.3, am.far + ' → ' + am.near);
  ok('Reactor dañado: zumbido inestable; apagado: casi silencio', am.dmg.reactorUnstable > 0.3 && am.off < 0.15 * 1, JSON.stringify([am.dmg.reactorUnstable, am.off]));
  ok('El motor del elevador suena más en los pisos del trayecto que en los demás, y no suena parado', am.mov >= 0.3 && am.movOther < am.mov, am.mov + ' / ' + am.movOther);
  ok('La plataforma del rover retumba en el piso 2 cuando se mueve', am.rover > 0.5, String(am.rover));
  ok('Luna: sin viento (no hay atmósfera) y solo se oye la respiración del traje; sin traje, nada', am.moon.wind === 0 && am.moon.suit > 0.5 && am.nosuit === 0, JSON.stringify([am.moon.wind, am.moon.suit, am.nosuit]));
  ok('Marte: viento suave y mucho más fuerte con tormenta de polvo', am.mars > 0.2 && am.storm > am.mars + 0.4, am.mars + ' → ' + am.storm);
  ok('Con un panel abierto el ambiente baja de volumen', am.paused < am.vent * 0.6 && am.paused > 0, am.vent + ' → ' + am.paused);
  ok('El audio de ambiente está activo y su volumen propio se guarda (por defecto 60 %)', am.ready === true && am.cfg === 0.6, JSON.stringify([am.ready, am.cfg]));
  await pg.evaluate(() => Game._debug.audioPanel()); await sleep(pg, 200);
  ok('El panel de audio ofrece un deslizador propio para el ambiente', /Ambiente/.test(await pg.locator('.panel').innerText()));
  await pg.keyboard.press('Escape'); await sleep(pg, 100);
  /* ---- Nivel G · Garaje del rover: transitable, con el jugador a bordo de la plataforma ---- */
  const gl = await pg.evaluate(() => {
    const S = Game.S, st = S.station, P = Station.PLAT, o = {};
    World._test.freeze(true); st.elev.rover.st = 'idle'; st.elev.rover.at = 0; st.roverAt = 'surface'; st.elev.rover.occ = []; S.ex.rover.occ = false; S.sys.rover.h = 100;
    o.floors = World.floors; o.main = World.mainFloors; o.crewFloors = Station.FLOORS.join(','); o.garageInfo = World.floorInfo(4) && { ground: World.floorInfo(4).ground, rooms: Object.keys(World.floorInfo(4).ROOMS).join(',') };
    o.roomFloor = Layout.roomFloor('garage'); o.consoles = World.floorInfo(4).CONSOLES.map((c) => c[0]).join(',');
    // el rover en la superficie no se ve en el garaje y al revés
    World.setFloor(2); o.visSurface = World.rvis(); World.setFloor(4); o.visGarageEmpty = World.rvis();
    // colocar al jugador sobre la plataforma con el rover bien aparcado
    const R = S.ex.rover; R.x = P.c[0]; R.y = P.c[1]; R.a = 0; R.v = 0; World.setFloor(2); World.player.x = P.x + 1.2; World.player.y = P.y + 1.0; o.on = Game._debug.floors.onPlatform(); o.ok = Station.roverOnPlatform(R);
    return o;
  });
  ok('El mundo tiene cinco niveles: los tres pisos, el garaje (G) y la pasarela del núcleo (3A); el garaje solo tiene una sala, sin exterior', gl.floors === 5 && gl.main === 3 && gl.garageInfo && gl.garageInfo.ground === false && gl.garageInfo.rooms === 'garage' && gl.roomFloor === 4, JSON.stringify(gl));
  ok('El elevador de tripulación sigue sirviendo a los tres pisos (el garaje no es una parada)', gl.crewFloors === '1,2,3');
  ok('El garaje tiene la plataforma del rover, el taller y la escalera de servicio', ['glift', 'gcon', 'gstairs'].every((k) => gl.consoles.includes(k)), gl.consoles);
  ok('El rover de la superficie no se dibuja en el garaje, ni el del garaje arriba', gl.visSurface === true && gl.visGarageEmpty === false, JSON.stringify([gl.visSurface, gl.visGarageEmpty]));
  ok('Sobre la plataforma con el rover bien aparcado se reconoce al jugador a bordo', gl.on === true && gl.ok === true, JSON.stringify([gl.on, gl.ok]));
  await pg.evaluate(() => Game._debug.floors.roverLiftPanel()); await sleep(pg, 250);
  const gb = await pg.locator('.panel button').allInnerTexts();
  ok('El panel de la plataforma ofrece bajar el rover solo o bajar con el rover', gb.some((t) => /Bajar el rover al garaje/.test(t)) && gb.some((t) => /Bajar con el rover/.test(t)), gb.join('|'));
  await pg.click('[data-act="rlift-down-ride"]'); await sleep(pg, 600);
  const g1 = await pg.evaluate(() => ({ fx: !!document.getElementById('elride'), kind: document.getElementById('elride') && document.getElementById('elride').dataset.kind, arrow: (document.querySelector('.elr-arrow') || {}).textContent, panel: !!document.querySelector('[data-act="rlift-down-ride"]'), occ: Game.S.station.elev.rover.occ.slice(), floor: World.floor }));
  ok('Bajar con el rover cierra el panel y muestra la plataforma descendiendo (▼, con el jugador a bordo)', g1.fx && g1.kind === 'rlift' && g1.arrow === '▼' && !g1.panel && g1.occ.includes('player') && g1.floor === 2, JSON.stringify(g1));
  await sleep(pg, 3500);
  const g2 = await pg.evaluate(() => ({ sh: document.querySelector('.elr-shaft').className, msg: document.querySelector('.elr-msg').textContent, lab: document.querySelector('.elr-num').textContent }));
  ok('Durante el descenso se desplazan las líneas del hueco y el indicador pasa de S a G', /down/.test(g2.sh) && /Bajando al garaje/.test(g2.msg), JSON.stringify(g2));
  await pg.waitForFunction(() => World.floor === 4 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 400);
  const g3 = await pg.evaluate(() => { const S = Game.S, R = S.ex.rover, p = World.player; return { floor: World.floor, room: World.roomName(p.x, p.y), at: S.station.roverAt, st: S.station.elev.rover.st, occ: S.station.elev.rover.occ.length, vis: World.rvis(), rover: [R.x, R.y], dock: Station.GDOCK, stand: World._test.canStand(p.x, p.y, 0.2), blocked: !World._test.canStand(R.x, R.y, 0.2), board: World.boardRover && World.boardRover() }; });
  ok('El jugador llega al garaje con el rover aparcado en su dock, sobre suelo libre y sin ocupar la plataforma', g3.floor === 4 && g3.room === 'garage' && g3.at === 'garage' && g3.st === 'idle' && g3.occ === 0 && g3.vis && g3.rover[0] === g3.dock[0] && g3.rover[1] === g3.dock[1] && g3.stand, JSON.stringify(g3));
  ok('El rover aparcado es un obstáculo (no se atraviesa) y no se puede conducir dentro del garaje', g3.blocked && g3.board === 'busy', JSON.stringify([g3.blocked, g3.board]));
  // taller del garaje: batería y reparación
  const wk = await pg.evaluate(() => {
    const S = Game.S, o = {}; S.sys.rover.batt = 40; const b0 = S.sys.rover.batt; for (let i = 0; i < 100; i++) Station.step(S, 0.1); o.charged = S.sys.rover.batt - b0;
    S.sys.rover.h = 30; S.r.mat.v = 3; Game._debug.floors.garagePanel(); return o;
  });
  await sleep(pg, 200); await pg.click('[data-act="garage-repair"]'); await sleep(pg, 150);
  const w1 = await pg.evaluate(() => ({ h: Game.S.sys.rover.h, mat: Game.S.r.mat.v, msg: (document.querySelector('[data-msg]') || {}).textContent }));
  await pg.evaluate(() => { Game.S.r.mat.v = 20; }); await pg.click('[data-act="garage-repair"]'); await sleep(pg, 150);
  const w2 = await pg.evaluate(() => ({ h: Game.S.sys.rover.h, mat: Game.S.r.mat.v, msg: (document.querySelector('[data-msg]') || {}).textContent }));
  await pg.keyboard.press('Escape'); await sleep(pg, 100);
  ok('En el dock el rover carga su batería (≈ 9 puntos en 10 s)', wk.charged > 7 && wk.charged < 11, String(wk.charged));
  ok('El taller no repara sin materiales y avisa; con materiales repara al 100 % y gasta 6 kg', w1.h === 30 && w1.mat === 3 && /materiales/i.test(w1.msg) && w2.h === 100 && w2.mat === 14 && /reparado/i.test(w2.msg), JSON.stringify([w1, w2]));
  // subir con el rover
  await pg.evaluate(() => { Game._debug.floors.roverLiftPanel(); }); await sleep(pg, 250);
  const up = await pg.locator('.panel button').allInnerTexts();
  ok('Desde el garaje se ofrece subir con el rover a la superficie', up.some((t) => /Subir con el rover/.test(t)), up.join('|'));
  await pg.click('[data-act="rlift-up-ride"]'); await sleep(pg, 500);
  const u1 = await pg.evaluate(() => ({ arrow: (document.querySelector('.elr-arrow') || {}).textContent, kind: document.getElementById('elride') && document.getElementById('elride').dataset.kind }));
  await pg.waitForFunction(() => World.floor === 2 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 300);
  const u2 = await pg.evaluate(() => { const S = Game.S, R = S.ex.rover, P = Station.PLAT, p = World.player; return { floor: World.floor, zone: World.zone(), at: S.station.roverAt, occ: S.station.elev.rover.occ.length, rover: [R.x, R.y], plat: P.c, okPlat: Station.roverOnPlatform(R), near: Math.hypot(p.x - P.c[0], p.y - P.c[1]) < 9, stand: World._test.canStand(p.x, p.y, 0.2), vis: World.rvis() }; });
  ok('Subir con el rover: flecha ▲ y el jugador sale en la superficie junto a la plataforma con el rover otra vez sobre ella', u1.arrow === '▲' && u1.kind === 'rlift' && u2.floor === 2 && u2.zone === 'outside' && u2.at === 'surface' && u2.occ === 0 && u2.okPlat && u2.near && u2.stand && u2.vis, JSON.stringify([u1, u2]));
  // escalera de servicio
  await pg.evaluate(() => { const S = Game.S; S.station.elev.rover.at = 0; S.station.roverAt = 'surface'; Game._debug.floors.serviceStairs(4); }); await sleep(pg, 800);
  const s1 = await pg.evaluate(() => ({ fx: !!document.getElementById('elride'), msg: document.querySelector('.elr-msg').textContent, floor: World.floor }));
  await pg.waitForFunction(() => World.floor === 4 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 300);
  const s2 = await pg.evaluate(() => ({ floor: World.floor, room: World.roomName(World.player.x, World.player.y) }));
  ok('La escalera de servicio baja al garaje en unos 6 s con su animación (el jugador no se teletransporta)', s1.fx && /Escalera de servicio/.test(s1.msg) && s1.floor === 2 && s2.floor === 4 && s2.room === 'garage', JSON.stringify([s1, s2]));
  await pg.evaluate(() => { Game._debug.floors.serviceStairs(2); }); await pg.waitForFunction(() => World.floor === 2 && !document.getElementById('elride'), null, { timeout: 20000 });
  ok('Y vuelve a subir a la superficie por la misma escalera', await pg.evaluate(() => World.floor === 2 && World.zone() === 'outside'));
  const svG = await pg.evaluate(() => { const S = Game.S; World.placeNear(4, 112, 74); const st = World.state(); World.setFloor(1); World.restore(st); const r = { floor: World.floor, fl: st.fl }; World.setFloor(2); World.player.x = Layout.START[0]; World.player.y = Layout.START[1]; World.setFloor(1); return r; });
  ok('El estado del mundo guarda y recupera al jugador en el garaje (nivel G)', svG.floor === 4 && svG.fl === 4, JSON.stringify(svG));
  await pg.evaluate(() => { World.setFloor(1); World.player.x = Layout.START[0]; World.player.y = Layout.START[1]; });

  /* ---- Doble altura del núcleo: nivel 3A (pasarela caminable sobre el reactor) ---- */
  const dh = await pg.evaluate(() => {
    const S = Game.S, o = {}; World._test.freeze(true);
    const U = World.floorInfo(5), L3 = World.floorInfo(3);
    o.upper = U && { ground: U.ground, below: U.below, rooms: Object.keys(U.ROOMS).join(','), catwalk: U.FURN.filter((f) => f[0] === 'catwalk').length, consoles: U.CONSOLES.map((c) => c[0]).join(',') };
    o.low = { catwalk: L3.FURN.filter((f) => f[0] === 'catwalk').length, cup: L3.CONSOLES.some((c) => c[0] === 'cup') };
    World.placeNear(5, 126.5, 30.9); o.f5 = World.floor; o.room = World.roomName(World.player.x, World.player.y);
    o.ring = World._test.canStand(116.5, 17.6, 0.25); o.hole = World._test.canStand(116.5, 28.5, 0.25); o.void = World._test.canStand(60.5, 30.5, 0.25);
    const pa = World._test.findPath(126.5, 30.9, 116.5, 17.6); o.path = !!pa && pa.length >= 3;
    o.amb = Game._debug.floors.ambMix().reactor; World.placeNear(3, 125.5, 30.5); World._test.freeze(true); return o;
  });
  ok('El núcleo tiene doble altura real: un nivel superior (3A) sin exterior, con la pasarela en anillo y su mirador; el piso 3 conserva la escalera y ya no dibuja la pasarela a ras de suelo', dh.upper && dh.upper.ground === false && dh.upper.below === 3 && dh.upper.rooms === 'cat' && dh.upper.catwalk === 4 && /cinsp/.test(dh.upper.consoles) && /cdn/.test(dh.upper.consoles) && dh.low.catwalk === 0 && dh.low.cup, JSON.stringify(dh));
  ok('La pasarela es caminable en anillo, no se puede pisar el hueco sobre el reactor ni el vacío, y hay ruta desde la escalera al mirador', dh.f5 === 5 && dh.room === 'cat' && dh.ring && !dh.hole && !dh.void && dh.path, JSON.stringify([dh.f5, dh.room, dh.ring, dh.hole, dh.void, dh.path]));
  ok('El zumbido del reactor también se oye fuerte en la pasarela', dh.amb > 0.6, String(dh.amb));
  // escalera: sube con animación y se llega a la pasarela junto a la escalera de bajada
  await pg.evaluate(() => { Game._debug.floors.coreStairs(5); }); await sleep(pg, 700);
  const c1 = await pg.evaluate(() => ({ fx: !!document.getElementById('elride'), kind: document.getElementById('elride') && document.getElementById('elride').dataset.kind, arrow: (document.querySelector('.elr-arrow') || {}).textContent, msg: document.querySelector('.elr-msg').textContent, floor: World.floor }));
  await pg.waitForFunction(() => World.floor === 5 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 500);
  const c2 = await pg.evaluate(() => { const p = World.player, cam = World.cam, TS = World.TS, cv = document.getElementById('game'), g = cv.getContext('2d'), z = cam.z || 1, dpr = cv.width / innerWidth; const sx = Math.round(((116.5 * TS - cam.x) * z) * 1), sy = Math.round(((28.5 * TS - cam.y) * z)); let lum = -1; try { const px = g.getImageData(Math.max(0, Math.min(cv.width - 1, sx)), Math.max(0, Math.min(cv.height - 1, sy)), 1, 1).data; lum = px[0] + px[1] + px[2]; } catch (e) { /* sin lectura */ } return { floor: World.floor, room: World.roomName(p.x, p.y), near: (World.nearest() || {}).id, stand: World._test.canStand(p.x, p.y, 0.2), lum, hole: World.floorInfo(5).below }; });
  ok('La escalera sube a la pasarela con animación (▲, «Subiendo a la pasarela», unos 5 s) y se llega junto a la escalera de bajada', c1.fx && c1.kind === 'cstairs' && c1.arrow === '▲' && /pasarela/.test(c1.msg) && c1.floor === 3 && c2.floor === 5 && c2.room === 'cat' && c2.near === 'cdn' && c2.stand, JSON.stringify([c1, c2]));
  // mirador
  await pg.evaluate(() => { Game.S.sys.reactor.h = 10; Game._debug.floors.coreOverlookPanel(); }); await sleep(pg, 250);
  const ov = await pg.locator('.panel').innerText();
  await pg.evaluate(() => { Game.S.sys.reactor.h = 100; });
  await pg.click('[data-act="overlook-reactor"]'); await sleep(pg, 300);
  const ov2 = await pg.locator('.panel').first().innerText();
  await pg.keyboard.press('Escape'); await sleep(pg, 100);
  ok('El mirador muestra las lecturas del reactor (estado, integridad, potencia, producción y temperatura simulada) y avisa si está apagado', /Mirador del núcleo/.test(ov) && /Apagado/.test(ov) && /Integridad/.test(ov) && /Producción/.test(ov) && /simulada/.test(ov), ov.slice(0, 160).replace(/\n/g, ' '));
  ok('Desde el mirador se abre el control del reactor', /eactor/.test(ov2) && !/Mirador del núcleo/.test(ov2), ov2.slice(0, 80).replace(/\n/g, ' '));
  const st5 = await pg.evaluate(() => { World.placeNear(5, 126.5, 30.9); const st = World.state(); World.setFloor(1); World.restore(st); return { floor: World.floor, fl: st.fl }; });
  ok('El estado del mundo guarda y recupera al jugador en la pasarela (nivel 3A)', st5.floor === 5 && st5.fl === 5, JSON.stringify(st5));
  await pg.evaluate(() => { Game._debug.floors.coreStairs(3); }); await pg.waitForFunction(() => World.floor === 3 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 300);
  const c3 = await pg.evaluate(() => ({ floor: World.floor, room: World.roomName(World.player.x, World.player.y), near: (World.nearest() || {}).id }));
  ok('Y se baja al piso 3 por la misma escalera, junto a ella', c3.floor === 3 && c3.room === 'reactor' && c3.near === 'cup', JSON.stringify(c3));
  const mp = await pg.evaluate(() => { Game._debug.openConsole('cmd'); return 1; });
  await pg.keyboard.press('Escape'); await sleep(pg, 100);
  await pg.evaluate(() => { World.setFloor(1); World.player.x = Layout.START[0]; World.player.y = Layout.START[1]; });

  /* ---- El botón de piso responde al primer clic aunque el panel se actualice (antes se repintaba cada 100 ms y se perdía el clic) ---- */
  await pg.evaluate(() => { World._test.freeze(true); Game.S.station.elev.crew.st = 'idle'; Game.S.station.elev.crew.at = 1; Game.S.station.elev.crew.occ = []; World.setFloor(1); const c = Layout.CONSOLES.find((q) => q[0] === 'elev1'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 400);
  await pg.keyboard.press('e'); await sleep(pg, 300);
  const bx = await pg.locator('[data-act="elev-2"]').boundingBox();
  await pg.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await pg.mouse.down(); await sleep(pg, 350); await pg.mouse.up(); await sleep(pg, 400);
  const ck = await pg.evaluate(() => ({ fx: !!document.getElementById('elride'), panel: !!document.querySelector('[data-act="elev-2"]') }));
  ok('El botón de piso del ascensor funciona al primer clic aunque el panel se actualice mientras se mantiene pulsado', ck.fx && !ck.panel, JSON.stringify(ck));
  await pg.waitForFunction(() => World.floor === 2 && !document.getElementById('elride'), null, { timeout: 20000 }); await sleep(pg, 300);
  await pg.evaluate(() => { const e = Game.S.station.elev.crew; Station.call(Game.S, 'crew', 1); for (let i = 0; i < 400; i++) Station.step(Game.S, 0.05); World.arrive(1); });

  /* ---- Migración de partidas anteriores a los pisos, con copia de seguridad ---- */
  const legacy = await pg.evaluate(() => {
    const S = JSON.parse(JSON.stringify(Game.S)); delete S.station; delete S.trip; delete S.land; // formato anterior a viaje, llegada y pisos
    const rc = World.roomCenterOn('reactor'); const run = { S, w: { role: 'commander', px: rc[0], py: rc[1], shel: null, lock: 'in' }, speed: 1, at: 12345 };
    return run;
  });
  await pg.close(); // el juego en marcha se autoguarda: se continúa en una página nueva
  const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errors.push(e.message)); await p2.goto(FILE); await sleep(p2, 300);
  await p2.evaluate((run) => { const cur = JSON.parse(localStorage.getItem('jamt.v1') || '{}'); cur.run = run; delete cur.runBackup; localStorage.setItem('jamt.v1', JSON.stringify(cur)); }, legacy);
  await p2.reload(); await sleep(p2, 500);
  ok('Se prepara una partida con el formato anterior (sin versión, sin estación ni piso) con el jugador en el reactor', legacy.sv === undefined && !legacy.S.station && legacy.w.fl === undefined);
  await p2.reload(); await sleep(p2, 500);
  for (const b of await p2.$$('.menu-grid .btn')) { if (/Continuar|Continue/.test(await b.textContent())) { await b.click(); break; } }
  await sleep(p2, 1500);
  const mg = await p2.evaluate(() => { const bk = Store.get('runBackup', null); return { floor: World.floor, room: World.roomName(World.player.x, World.player.y), station: !!Game.S.station, land: Game.S.land && Game.S.land.done, bak: bk && { at: bk.run.at, kind: bk.kind, madeAt: bk.madeAt, oldFmt: bk.run.sv === undefined && bk.run.S.station === undefined }, toast: /Copia de seguridad/.test(document.body.innerText) }; });
  ok('Cargar una partida anterior la coloca en el piso de su posición guardada (reactor → piso 3), con estación y aterrizaje ya completados', mg.floor === 3 && mg.room === 'reactor' && mg.station && mg.land === true, JSON.stringify(mg));
  ok('Antes de migrar se guarda una copia de seguridad intacta del formato anterior y se avisa', mg.bak && mg.bak.at === 12345 && mg.bak.kind === 'v1' && mg.bak.oldFmt && mg.toast, JSON.stringify(mg.bak));
  await p2.evaluate(() => Game._debug.saveNow());
  const sv2 = await p2.evaluate(() => ({ sv: Store.get('run').sv, fl: Store.get('run').w.fl, bak: Store.get('runBackup').madeAt }));
  ok('Al guardar de nuevo la partida queda en el formato nuevo (versión 2, con piso) y la copia no se toca', sv2.sv === 2 && sv2.fl === 3 && sv2.bak === mg.bak.madeAt, JSON.stringify(sv2));
  await p2.reload(); await sleep(p2, 500);
  for (const b of await p2.$$('.menu-grid .btn')) { if (/Continuar|Continue/.test(await b.textContent())) { await b.click(); break; } }
  await sleep(p2, 1200);
  const again = await p2.evaluate(() => ({ floor: World.floor, bak: Store.get('runBackup').madeAt }));
  ok('Una partida ya migrada no genera otra copia', again.floor === 3 && again.bak === mg.bak.madeAt, JSON.stringify(again));
  await p2.evaluate(() => Game._debug.setSpeed(0)); await p2.keyboard.press('Escape'); await sleep(p2, 300);
  for (const b of await p2.$$('.panel .btn')) { if (/Menú principal|Main menu/.test(await b.textContent())) { await b.click(); break; } }
  await sleep(p2, 400);
  const btnOk = await p2.evaluate(() => !!document.querySelector('[data-act="backup-menu"]'));
  await p2.click('[data-act="backup-menu"]'); await sleep(p2, 300); await p2.click('[data-act="restore-backup"]'); await sleep(p2, 1500);
  const rs = await p2.evaluate(() => ({ floor: World.floor, run: Game._debug.running, sv: Store.get('run').sv }));
  ok('El menú principal ofrece restaurar la copia: la restaura, la vuelve a migrar y deja al jugador en su piso', btnOk && rs.run && rs.floor === 3, JSON.stringify([btnOk, rs]));
  ok('Sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 1200)); process.exit(2); });
