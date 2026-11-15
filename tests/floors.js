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
  await pg.evaluate(() => { Game._debug.newRun('moon', 'x', { skipCamp: true, mode: 'junior' }); Game._debug.setSpeed(0); const S = Game.S; S.noEv = true; S.lastEv = 1e9; for (const k in NPCDATA.TALK) S.camp.visited[k] = 1; });
  await sleep(pg, 300);

  /* ---- Pisos en World ---- */
  const base = await pg.evaluate(() => ({ floors: World.floors, floor: World.floor, player: World.player.floor, rooms: [1, 2, 3].map((f) => Object.keys(World.floorInfo(f).ROOMS).filter((k) => !/^t\d/.test(k)).sort().join(',')), ground: [1, 2, 3].map((f) => !!World.floorInfo(f).ground), elev: [1, 2, 3].map((f) => World.withFloor(f, () => !!World.RECTS['elc' + f])), doors: [1, 2, 3].map((f) => World.withFloor(f, () => World._test.doors.length)) }));
  ok('La estación tiene tres pisos y se empieza en el piso 1 (puente)', base.floors === 3 && base.floor === 1 && base.player === 1, JSON.stringify([base.floors, base.floor, base.player]));
  ok('Reparto de salas: piso 1 operaciones y ciencia, piso 2 esclusa y garaje, piso 3 reactor; cada piso con su elevador', /bridge/.test(base.rooms[0]) && /gh/.test(base.rooms[0]) && /lab/.test(base.rooms[0]) && /lock/.test(base.rooms[1]) && /rad/.test(base.rooms[1]) && /workshop/.test(base.rooms[1]) && /^elc3,reactor$/.test(base.rooms[2]) && base.elev.every(Boolean), JSON.stringify(base.rooms));
  ok('Solo la planta baja (piso 2) tiene exterior; los pisos superiores tienen puertas propias', JSON.stringify(base.ground) === '[false,true,false]' && base.doors[0] >= 10 && base.doors[1] >= 4 && base.doors[2] >= 1, JSON.stringify([base.ground, base.doors]));
  const vd = await pg.evaluate(() => ({ f1: World.withFloor(1, () => World._test.canStand(68.5, 90.5, 0.3)), f2: World.withFloor(2, () => World._test.canStand(68.5, 90.5, 0.3)), f3: World.withFloor(3, () => World._test.canStand(68.5, 90.5, 0.3)), reactorF2: World.withFloor(2, () => World._test.canStand(95.5, 28.5, 0.3)) }));
  ok('Los pisos 1 y 3 no tienen exterior (el vacío es sólido) y en la planta baja sí se puede caminar fuera', vd.f1 === false && vd.f3 === false && vd.f2 === true, JSON.stringify(vd));
  const sw = await pg.evaluate(() => {
    const tiny = { id: 4, name: { es: 'Prueba', en: 'Test' }, ROOMS: { tst: { s: [Layout.R(2, 2, 12, 8)], g: 'tec', floor: 'plate', col: ['#222', '#333'] } }, LINKS: [], FURN: [['crate', 6, 5, 2, 2]], CONSOLES: [] };
    World._test.setExtraFloors([tiny]); World.init('moon');
    const out = { floors: World.floors, f1: World.floor };
    const g1 = World._test.grid, s1 = World._test.solid, d1 = World._test.doors.length;
    const r1 = World.setFloor(4); out.went = r1; out.f4 = World.floor; out.pf = World.player.floor;
    const g2 = World._test.grid; out.diffGrid = g2 !== g1; out.floorCell = g2[4][4]; out.wallCell = g2[1][1]; out.crate = World._test.solid[6][6]; out.noDoors = World._test.doors.length === 0;
    out.stand = World._test.canStand(4.5, 4.5, 0.3); out.standOutside = World._test.canStand(20.5, 20.5, 0.3);
    const p = World._test.findPath(3.5, 3.5, 11.5, 3.5); out.path = !!p && p.length >= 2;
    out.saved = World.state().fl; out.bad = World.setFloor(9); out.bad0 = World.setFloor(0);
    World.setFloor(1); out.back = World.floor; out.sameGrid = World._test.grid === g1 && World._test.solid === s1 && World._test.doors.length === d1;
    World.setFloor(4); World.init('moon'); out.afterInit = World.floor;
    World._test.setExtraFloors([]); World.init('moon'); out.cleaned = World.floors;
    return out;
  });
  ok('Cada piso es una ranura independiente (probado con un cuarto piso de prueba): cuadrícula, mobiliario y colisiones propias', sw.floors === 4 && sw.diffGrid && sw.floorCell === 2 && sw.wallCell === 1 && sw.crate === true && sw.noDoors, JSON.stringify(sw));
  ok('setFloor cambia de piso, rechaza pisos inexistentes y el jugador conserva su piso', sw.went && sw.f4 === 4 && sw.pf === 4 && sw.bad === false && sw.bad0 === false);
  ok('Colisiones y rutas del piso de prueba no se mezclan con las del piso 1', sw.stand === true && sw.standOutside === false && sw.path);
  ok('Volver al piso 1 restaura exactamente su cuadrícula, solidez y puertas', sw.back === 1 && sw.sameGrid);
  ok('El piso actual se guarda en el estado del mundo y reiniciar el mundo vuelve al piso 1', sw.saved === 4 && sw.afterInit === 1 && sw.cleaned === 3);
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
    const eng = bots.find((b) => b.role === 'engineer'); const o = { engFloor: eng.floor, startOk: World.withFloor(eng.floor, () => World._test.canStand(eng.x, eng.y, 0.2)) };
    // a otro piso por el elevador: lleva tiempo y no se teletransporta
    const from = eng.floor, to = from === 3 ? 1 : 3, e = World.withFloor(from, () => World._test.spot('elc' + from, 0));
    eng.x = e[0]; eng.y = e[1]; eng.path = []; eng.viaTo = to; eng.ride = null;
    let t = 0, rode = null; for (let i = 0; i < 600; i++) { World.update(0.05, Game.S, { x: 0, y: 0 }); t += 0.05; if (eng.ride && rode === null) { rode = t; o.during = World.crew().find((c) => c.role === 'engineer'); } if (!eng.ride && rode !== null) { o.arrivedAt = t; break; } }
    o.rode = rode; o.to = eng.floor === to; o.dur = o.arrivedAt - rode; o.exp = Station.DOOR_S * 2 + Station.travelS('crew', from, to); o.ride = eng.ride; o.stand = World.withFloor(eng.floor, () => World._test.canStand(eng.x, eng.y, 0.2));
    o.crew = World.crew().find((c) => c.role === 'engineer'); o.hiddenWhileRiding = !!(o.during && o.during.ride);
    return o;
  });
  ok('Los NPC nacen en el piso de su sala de trabajo (el ingeniero, en el piso del reactor) y sobre suelo válido', npc.engFloor === 3 && npc.startOk, JSON.stringify([npc.engFloor, npc.startOk]));
  ok('Un NPC cambia de piso por el elevador: entra en la cabina, tarda el trayecto y sale en el piso de destino (sin teletransporte)', npc.rode !== null && npc.to && Math.abs(npc.dur - npc.exp) < 0.3 && npc.hiddenWhileRiding && npc.stand, JSON.stringify([npc.rode, npc.dur, npc.exp, npc.to]));
  ok('La tripulación informa del piso y de la sala de cada NPC (elevador mientras viaja)', npc.during && /^elc/.test(npc.during.room) && npc.crew.floor === (npc.to ? npc.crew.floor : 0) && npc.crew.ride === false, JSON.stringify([npc.during, npc.crew]));
  const sim = await pg.evaluate(() => { const bots = World._test.bots; let bad = 0; for (let i = 0; i < 600; i++) { World.update(0.05, Game.S, { x: 0, y: 0 }); } for (const b of bots) if (!b.ride && !World.withFloor(b.floor, () => World._test.canStand(b.x, b.y, 0.15))) bad++; return { bad, floors: bots.map((b) => b.floor).join(',') }; });
  ok('Durante 30 s simulados ningún NPC termina dentro de un muro ni en el vacío de su piso', sim.bad === 0, JSON.stringify(sim));

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
  ok('Elegir el piso 3 te lleva (con animación) a la cabina del elevador de ese piso', t3.floor === 3 && t3.pf === 3 && t3.room === 'elc3' && !t3.fx, JSON.stringify(t3));
  await pg.evaluate(() => { const c = Layout.CONSOLES.find((q) => q[0] === 'elev3'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 500);
  await pg.keyboard.press('e'); await sleep(pg, 300);
  const ep = await pg.evaluate(() => ({ call: !!document.querySelector('[data-act="elev-call"]'), at: Game.S.station.elev.crew.at }));
  ok('En el elevador del piso 3: si la cabina está en otro piso hay que llamarla', ep.call && ep.at === 1, JSON.stringify(ep));
  await pg.click('[data-act="elev-call"]'); await pg.waitForFunction(() => Game.S.station.elev.crew.at === 3 && Game.S.station.elev.crew.st === 'idle', null, { timeout: 15000 }); await sleep(pg, 400);
  await pg.click('[data-act="elev-1"]'); await sleep(pg, 2500);
  const mv = await pg.evaluate(() => ({ st: Game.S.station.elev.crew.st, lv: Station.level(Game.S, 'crew'), floor: World.floor, occ: Game.S.station.elev.crew.occ.slice() }));
  ok('El trayecto es real: el elevador se mueve entre pisos con el jugador a bordo y aún no se ha cambiado de piso', mv.st === 'moving' && mv.lv < 3 && mv.lv > 1 && mv.floor === 3 && mv.occ.includes('player'), JSON.stringify(mv));
  await pg.waitForFunction(() => World.floor === 1 && !document.querySelector('[data-act="elev-1"]'), null, { timeout: 15000 }); await sleep(pg, 200);
  const ar = await pg.evaluate(() => ({ floor: World.floor, room: World.roomName(World.player.x, World.player.y), occ: Game.S.station.elev.crew.occ.length, at: Game.S.station.elev.crew.at }));
  ok('Al llegar, el jugador sale en el piso 1 junto al elevador y la cabina queda libre', ar.floor === 1 && ar.room === 'elc1' && ar.occ === 0 && ar.at === 1, JSON.stringify(ar));
  await pg.evaluate(() => { Station.setBroken(Game.S, 'crew', true); const c = Layout.CONSOLES.find((q) => q[0] === 'elev1'); World.player.x = c[2] + 0.5; World.player.y = c[3] + 1.4; }); await sleep(pg, 500);
  await pg.keyboard.press('e'); await sleep(pg, 300);
  const br = await pg.evaluate(() => ({ warn: /averiado/.test(document.querySelector('.panel').innerText), btn: !!document.querySelector('[data-act="elev-2"]') }));
  ok('Con el elevador averiado se avisa y se ofrece la escalera de emergencia (no se bloquea la campaña)', br.warn && br.btn, JSON.stringify(br));
  await pg.click('[data-act="elev-2"]'); await sleep(pg, 1000);
  const stp = await pg.evaluate(() => ({ txt: document.querySelector('.panel').innerText, floor: World.floor }));
  ok('La escalera tarda (7 s por piso) y mientras tanto no se cambia de piso', /Escalera de emergencia/.test(stp.txt) && stp.floor === 1, JSON.stringify(stp));
  await pg.waitForFunction(() => World.floor === 2, null, { timeout: 15000 });
  ok('Tras la escalera se llega al piso 2', await pg.evaluate(() => World.floor === 2 && World.roomName(World.player.x, World.player.y) === 'elc2'));
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
