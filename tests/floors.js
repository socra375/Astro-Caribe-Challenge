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
  const base = await pg.evaluate(() => ({ floors: World.floors, floor: World.floor, info: World.floorInfo(1).id, player: World.player.floor, nm: World.floorInfo(1).name.es, bots: World._test.bots.every((b) => b.floor === 1), crew: World.crew().every((c) => c.floor === 1) }));
  ok('Hoy hay un único piso (la base de siempre) y todo está en el piso 1: jugador, NPC y tripulación', base.floors === 1 && base.floor === 1 && base.info === 1 && base.player === 1 && base.bots && base.crew, JSON.stringify(base));
  const sw = await pg.evaluate(() => {
    const tiny = { id: 2, name: { es: 'Prueba', en: 'Test' }, ROOMS: { tst: { s: [Layout.R(2, 2, 12, 8)], g: 'tec', floor: 'plate', col: ['#222', '#333'] } }, LINKS: [], FURN: [['crate', 6, 5, 2, 2]], CONSOLES: [] };
    World._test.setExtraFloors([tiny]); World.init('moon');
    const out = { floors: World.floors, f1: World.floor };
    const g1 = World._test.grid, s1 = World._test.solid, d1 = World._test.doors.length;
    out.dims1 = [g1.length, g1[0].length];
    const r1 = World.setFloor(2); out.went = r1; out.f2 = World.floor; out.pf = World.player.floor;
    const g2 = World._test.grid; out.diffGrid = g2 !== g1; out.floorCell = g2[4][4]; out.wallCell = g2[1][1]; out.crate = World._test.solid[6][6];
    out.noDoors2 = World._test.doors.length === 0;
    World.player.x = 4.5; World.player.y = 4.5; out.stand2 = World._test.canStand(4.5, 4.5, 0.3); out.standOutside = World._test.canStand(20.5, 20.5, 0.3);
    const p = World._test.findPath(3.5, 3.5, 11.5, 3.5); out.path2 = !!p && p.length >= 2;
    out.saved = World.state().fl; const st = World.state();
    out.bad = World.setFloor(9); out.bad0 = World.setFloor(0);
    World.setFloor(1); out.back = World.floor; out.sameGrid = World._test.grid === g1 && World._test.solid === s1 && World._test.doors.length === d1;
    World.setFloor(2); World.init('moon'); out.afterInit = World.floor; // init vuelve al piso 1
    World._test.setExtraFloors([]); World.init('moon'); out.cleaned = World.floors;
    return out;
  });
  ok('Cada piso es una ranura con su propia cuadrícula, puertas, mobiliario y colisiones (varios pisos construidos)', sw.floors === 2 && sw.f1 === 1 && sw.diffGrid && sw.floorCell === 2 && sw.wallCell === 1 && sw.crate === true && sw.noDoors2, JSON.stringify(sw));
  ok('setFloor cambia de piso, rechaza pisos inexistentes y el jugador conserva su piso', sw.went && sw.f2 === 2 && sw.pf === 2 && sw.bad === false && sw.bad0 === false, JSON.stringify([sw.went, sw.f2, sw.pf, sw.bad, sw.bad0]));
  ok('Las colisiones y las rutas funcionan en el piso 2 y no se mezclan con el piso 1', sw.stand2 === true && sw.standOutside === false && sw.path2, JSON.stringify([sw.stand2, sw.standOutside, sw.path2]));
  ok('Volver al piso 1 restaura exactamente su cuadrícula, solidez y puertas', sw.back === 1 && sw.sameGrid && sw.dims1[0] === 100 && sw.dims1[1] === 136);
  ok('El piso actual se guarda en el estado del mundo y reiniciar el mundo vuelve al piso 1', sw.saved === 2 && sw.afterInit === 1 && sw.cleaned === 1);

  /* ---- Guardado y partidas anteriores ---- */
  const sv = await pg.evaluate(() => {
    const w = World.state(); const old = Object.assign({}, w); delete old.fl;
    World.restore(old); const legacyFloor = World.floor;
    World.restore(Object.assign({}, w, { fl: 7 })); const badFloor = World.floor;
    return { has: w.fl, legacyFloor, badFloor };
  });
  ok('El estado guardado incluye el piso; una partida sin piso se queda en el 1 y un piso inválido se ignora', sv.has === 1 && sv.legacyFloor === 1 && sv.badFloor === 1, JSON.stringify(sv));

  /* ---- NPC por piso ---- */
  const npc = await pg.evaluate(() => {
    const bots = World._test.bots, b = bots[0], b2 = bots[1]; const before = [b.x, b.y]; b.floor = 2; b.task = 'wander'; b.path = [[b.x + 3, b.y]]; b.wait = 0;
    const mv = []; for (let i = 0; i < 40; i++) World.update(0.05, Game.S, { x: 0, y: 0 });
    const frozen = b.x === before[0] && b.y === before[1];
    const listed = World.crew().find((c) => c.role === b.role).floor; b.floor = 1;
    return { frozen, listed, same: !!b2 };
  });
  ok('Los NPC de otro piso no se mueven en el piso actual y la tripulación informa de su piso', npc.frozen && npc.listed === 2, JSON.stringify(npc));

  /* ---- Elevadores (motor puro) ---- */
  const el = await pg.evaluate(() => {
    const S = Sim.create({ scen: 'moon', diff: 'engineer', mode: 'junior', seed: 4 }); delete S.station; const m = Sim.migrate(JSON.parse(JSON.stringify(S)));
    const o = { legacy: !!m.station && m.station.elev.crew.at === 1 && m.station.elev.rover.at === 2 && m.station.elev.crew.st === 'idle' };
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
    o.roverOff = Station.call(m, 'rover', 0, { roverOn: false }); o.roverOn = Station.call(m, 'rover', 0, { roverOn: true }); const re = st.elev.rover;
    let rt = 0; for (let i = 0; i < 300 && !(re.st === 'idle' && re.at === 0); i++) { Station.step(m, 0.05); rt += 0.05; }
    o.roverAt = re.at; o.roverTrips = re.trips; o.roverBad = Station.call(m, 'rover', 1, { roverOn: true }); o.same = Station.call(m, 'rover', 0, { roverOn: false });
    // serialización
    const rt2 = JSON.parse(JSON.stringify(m)); o.json = rt2.station.elev.rover.at === 0 && rt2.station.elev.crew.at === 3 && rt2.station.elev.crew.trips === 1;
    return o;
  });
  ok('Partidas anteriores: la estación se crea con los elevadores en reposo (tripulación en el 1, rover en el garaje)', el.legacy);
  ok('El elevador de tripulación va 1 → 3 con puertas cerrándose, movimiento y puertas abriéndose (sin teletransporte)', el.call.ok && el.stBefore === 'closing' && el.seq === 'closing>moving>opening>idle' && el.doorClosed && el.mono, JSON.stringify([el.seq, el.stBefore]));
  ok('El viaje dura puertas + 2 pisos + puertas y termina en el piso pedido', Math.abs(el.arr - el.exp) < 0.2 && el.at === 3 && el.idle === 'idle', JSON.stringify([el.arr, el.exp]));
  ok('En movimiento no se puede pedir otro destino ni subir', el.busy.ok === false && el.busy.why === 'busy' && el.boardMoving.ok === false && el.boardMoving.why === 'closed');
  ok('Se sube y se baja solo con el elevador en reposo; el rover no puede usar el de tripulación; piso inexistente rechazado', el.board.ok && el.rover1.ok === false && el.rover1.why === 'cap' && el.occ.length === 1 && el.leave.ok && el.badFloor.ok === false && el.badFloor.why === 'floor', JSON.stringify([el.rover1, el.badFloor]));
  ok('Con el elevador averiado no se mueve, pero hay escalera de emergencia (7 s por piso) para no bloquear la campaña', el.broken.ok === false && el.broken.why === 'broken' && el.boardBroken.ok === false && el.stairs.ok && el.stairs.s === 14, JSON.stringify([el.broken, el.stairs]));
  ok('El elevador del rover no se mueve sin el vehículo sobre la plataforma y sí con él (garaje → exterior)', el.roverOff.ok === false && el.roverOff.why === 'rover' && el.roverOn.ok && el.roverAt === 0 && el.roverTrips === 1, JSON.stringify([el.roverOff, el.roverOn, el.roverAt]));
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
  ok('Al cargar la partida se conservan el piso del jugador y la posición de los elevadores', ld.running && ld.at === 3 && ld.rv === 2 && ld.fl === 1, JSON.stringify(ld));
  ok('Sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 1200)); process.exit(2); });
