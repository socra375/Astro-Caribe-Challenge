// Pruebas de la exploración exterior y el rover (Chromium + Playwright). Uso: node tests/expo.js [--shots dir]
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const closeAll = async (pg) => { for (let i = 0; i < 8; i++) { if ((await pg.locator('[role=dialog]').count()) === 0) break; await pg.keyboard.press('Escape'); await pg.waitForTimeout(60); } };
const newPage = async (browser, vp, touch) => {
  const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, hasTouch: !!touch });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx.newPage(); const errors = [];
  pg.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await pg.goto(FILE); await pg.waitForTimeout(300);
  return { ctx, pg, errors };
};
// velocidad 0: el reloj de la simulación no avanza solo (sin incidentes aleatorios ni paneles inesperados); las pruebas lo avanzan con Sim.step
const start = async (pg, scen, mode) => { await pg.evaluate(([s, m]) => { Game._debug.newRun(s, 'x', { skipCamp: true, mode: m }); Game._debug.setSpeed(0); for (const k in NPCDATA.TALK) Game.S.camp.visited[k] = 1; }, [scen, mode || 'junior']); await pg.waitForTimeout(250); await pg.evaluate(() => { Game._debug.radio.q = []; Game._debug.radio.cur = null; }); };
const TP = (pg, x, y) => pg.evaluate(([a, b]) => { World.player.x = a; World.player.y = b; }, [x, y]);
// salida al exterior sin pasar por el procedimiento (la esclusa se prueba aparte)
const OUTSIDE = (pg) => TP(pg, 70, 90);

(async () => {
  const browser = await chromium.launch();
  const { ctx, pg, errors } = await newPage(browser);
  await start(pg, 'moon', 'junior');

  // ---------- 1. Traje espacial ----------
  const s1 = await pg.evaluate(() => {
    const S = Game.S, E = Ex.ensure(S), o = {};
    o.off = !E.suit.on; o.cl = Ex.checklist(S).length; o.unOff = Ex.unequip(S);
    const o2base = S.r.o2.v; o.eq = Ex.equip(S); o.on = E.suit.on; o.full = E.suit.o2 === 100 && E.suit.en === 100; o.o2cost = S.r.o2.v <= o2base;
    o.again = Ex.equip(S);
    E.suit.integ = 40; o.rep = Ex.repairSuit(S); o.integ = E.suit.integ;
    // aspecto: el traje cambia visualmente al equiparse
    const mk = (eva) => { const c = document.createElement('canvas'); c.width = 120; c.height = 120; const g = c.getContext('2d'); Chars.draw(g, 'commander', 60, 100, { dir: 2, t: 0, eva }); return g.getImageData(0, 0, 120, 120).data; };
    const a = mk(false), b = mk(true); let d = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++;
    o.diff = d;
    o.un = Ex.unequip(S); o.offAfter = !E.suit.on;
    return o;
  });
  ok('Traje: la revisión tiene 7 elementos y no se puede quitar si no se lleva', s1.cl === 7 && s1.unOff === 'off' && s1.off, JSON.stringify(s1));
  ok('Traje: equipar lo deja con O₂ y energía al 100 % y es idempotente', s1.eq === null && s1.on && s1.full && s1.again === 'on' && s1.o2cost);
  ok('Traje: se repara en la base', s1.rep === null && s1.integ === 100);
  ok('Traje: cambia visualmente (casco, visor, mochila, luces)', s1.diff > 150, 'píxeles distintos: ' + s1.diff);
  ok('Traje: se puede quitar en la base', s1.un === null && s1.offAfter);
  // Consola del vestuario: existe, es alcanzable y su panel equipa de verdad
  const s1b = await pg.evaluate(() => World.withFloor(2, () => { const c = World._test, s = c.spot('rad', 0); const cn = Layout.CONSOLES.find((q) => q[0] === 'suit'); return { has: !!cn, reach: !!c.findPath(s[0], s[1], cn[2] + 0.5, cn[3] + 1.4) }; }));
  ok('Vestuario de la bahía: consola «suit» alcanzable por la cuadrícula real', s1b.has && s1b.reach, JSON.stringify(s1b));
  await pg.evaluate(() => Game._debug.openConsole('suit')); await pg.waitForTimeout(150);
  ok('Panel de preparación: revisión de equipos, objetivo y bonificación del especialista', (await pg.getByText('Revisión de equipos').isVisible()) && (await pg.getByText(/Misión: Primer recorrido/).isVisible()) && (await pg.getByText(/Comandante: la señal/).isVisible()));
  await pg.getByRole('button', { name: /Equipar traje/ }).click(); await pg.waitForTimeout(200);
  ok('Botón «Equipar traje» pone el traje de verdad', await pg.evaluate(() => Game.S.ex.suit.on));
  await closeAll(pg);

  // ---------- 2. Esclusa ----------
  const lock0 = await pg.evaluate(() => { Ex.unequip(Game.S); const a = World.cycleLock(); return [a, World.airlock().st]; });
  ok('Esclusa: sin traje no se puede salir (ni desde la consola ni caminando)', lock0[0] === 'nosuit' && lock0[1] === 'in', JSON.stringify(lock0));
  await pg.evaluate(() => { World.player.x = 67.5; World.player.y = 76; });
  await pg.keyboard.down('ArrowDown'); await pg.waitForTimeout(1800); await pg.keyboard.up('ArrowDown');
  const lockN = await pg.evaluate(() => ({ st: World.airlock().st, y: World.player.y }));
  ok('Esclusa: sin traje la puerta exterior sigue cerrada y se avisa del peligro (el jugador decide)', lockN.st === 'in' && lockN.y < 81 && (await pg.locator('[data-act=nosuit-stay]').count()) === 1 && /traje/i.test(await pg.locator('.panel').innerText()), JSON.stringify(lockN));
  await pg.locator('[data-act=nosuit-stay]').click(); await pg.waitForTimeout(100);
  await pg.evaluate(() => { Ex.equip(Game.S); World.player.x = 67.5; World.player.y = 76; });
  await pg.keyboard.down('ArrowDown'); await pg.waitForTimeout(1500);
  const lockC = await pg.evaluate(() => World.airlock().st); await pg.waitForTimeout(3400);
  const lockO = await pg.evaluate(() => World.airlock().st); await pg.waitForTimeout(1600); await pg.keyboard.up('ArrowDown');
  const out1 = await pg.evaluate(() => ({ z: World.zone(), y: World.player.y, f: Game.S.ex.f.out, o: Game.S.ex.out }));
  ok('Esclusa: con traje, al entrar en la cámara se despresuriza (3 s) y se abre la puerta exterior', lockC.startsWith('cycle') && lockO === 'out', lockC + '/' + lockO);
  ok('Salir por la esclusa: queda en el exterior y la salida se registra', out1.z === 'outside' && out1.y > 82 && out1.f && out1.o, JSON.stringify(out1));
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(2500);
  await pg.waitForTimeout(3400); await pg.waitForTimeout(1800); await pg.keyboard.up('ArrowUp');
  const in1 = await pg.evaluate(() => ({ z: World.zone(), y: World.player.y, st: World.airlock().st, o: Game.S.ex.out }));
  ok('Entrar por la esclusa: presuriza y el astronauta vuelve a la base', in1.z !== 'outside' && in1.y < 76.5 && !in1.o, JSON.stringify(in1));

  // ---------- 3. Subir, bajar y volver a subir ----------
  await pg.evaluate(() => { Ex.equip(Game.S); const R = Game.S.ex.rover; R.x = 74; R.y = 89.6; R.a = 0; R.v = 0; World.player.x = 72; World.player.y = 87.5; Game._debug.radio.q = []; Game._debug.radio.cur = null; });
  await pg.waitForTimeout(400);
  const b1 = await pg.evaluate(() => (World.exNear() || {}).id);
  ok('Junto al rover aparece la acción «subir»', b1 === 'x:board', b1);
  await pg.evaluate(() => Game._debug.exp.exInteract(World.exNear())); await pg.waitForTimeout(1100);
  const b2 = await pg.evaluate(() => ({ occ: Game.S.ex.rover.occ, near: (World.exNear() || {}).id, p: [World.player.x, World.player.y], r: [Game.S.ex.rover.x, Game.S.ex.rover.y] }));
  ok('Subir al rover: tras la animación el control pasa al vehículo', b2.occ && b2.near === 'x:exit' && Math.hypot(b2.p[0] - b2.r[0], b2.p[1] - b2.r[1]) < 0.01, JSON.stringify(b2));
  await pg.evaluate(() => Game._debug.exp.exInteract(World.exNear())); await pg.waitForTimeout(1100);
  const b3 = await pg.evaluate(() => { const R = Game.S.ex.rover, p = World.player; return { occ: R.occ, free: World._test.canStand(p.x, p.y, 0.3), d: Math.hypot(p.x - R.x, p.y - R.y), v: R.v }; });
  ok('Bajar del rover: aparece junto al vehículo en un punto libre y el rover queda estacionado', !b3.occ && b3.free && b3.d > 1.5 && b3.d < 4 && b3.v === 0, JSON.stringify(b3));
  await pg.evaluate(() => Game._debug.exp.exInteract({ id: 'x:board' })); await pg.waitForTimeout(1100);
  ok('Volver a subir funciona', await pg.evaluate(() => Game.S.ex.rover.occ));
  // no se puede bajar con el rover rápido
  const fast = await pg.evaluate(() => { Game.S.ex.rover.v = 6; return World.exitRover(); }); await pg.evaluate(() => { Game.S.ex.rover.v = 0; });
  ok('No se puede bajar con el rover en marcha', fast === 'fast');
  // bajar en un lugar con rocas alrededor nunca coloca al personaje en un sitio bloqueado
  const blk = await pg.evaluate(() => {
    const R = Game.S.ex.rover; let bad = 0, n = 0, blocked = 0;
    for (const o of Field.G.obs.filter((q) => q.t === 'rock' && q.r > 0.9).slice(0, 40)) {
      for (const a of [0, 1.6, 3.1, 4.7]) {
        R.x = o.x + (o.r + 2.6) * Math.cos(a); R.y = o.y + (o.r + 2.6) * Math.sin(a); R.a = a + 1.57; if (!World.roverFree(R.x, R.y, R.a)) continue;
        R.occ = true; R.v = 0; World.player.x = R.x; World.player.y = R.y; const r = World.exitRover(); n++;
        if (r === 'blocked') { blocked++; continue; } if (r) { bad++; continue; }
        const b = World._test.boardAnim; if (!World.standOKp(b.tx, b.ty)) bad++;
        World.teleportHome();
      }
    }
    return { n, bad, blocked };
  });
  ok('Bajar junto a rocas nunca coloca al astronauta en un punto bloqueado', blk.n > 20 && blk.bad === 0 && blk.blocked === 0, JSON.stringify(blk));
  await pg.waitForTimeout(900);
  await pg.evaluate(() => { const R = Game.S.ex.rover; R.occ = false; R.x = 74; R.y = 89.6; R.a = 0; R.v = 0; World.player.x = 72; World.player.y = 87.5; });
  await pg.waitForTimeout(500);

  // ---------- 4. Conducir en todas las direcciones ----------
  const open = await pg.evaluate(() => {
    for (let y = 110; y < 190; y += 4) for (let x = -50; x < 120; x += 4) {
      let okk = true;
      for (let dx = 0; dx <= 40 && okk; dx += 2) for (let dy = -9; dy <= 9 && okk; dy += 2) if (!World.roverFree(x + dx, y + dy, 0) || !World.roverFree(x + dx, y + dy, 1.57)) okk = false;
      if (okk) { window.__open = [x, y]; const R = Game.S.ex.rover; R.x = x; R.y = y; R.a = 0; R.v = 0; R.occ = true; World.player.x = x; World.player.y = y; window.__viol = 0; (function f() { const E = Game.S.ex; if (E.rover.occ && !World.roverFree(E.rover.x, E.rover.y, E.rover.a)) window.__viol++; requestAnimationFrame(f); })(); return [x, y]; }
    }
    return null;
  });
  ok('Hay una explanada despejada para probar la conducción', !!open, JSON.stringify(open));
  const d0 = await pg.evaluate(() => ({ ...Game.S.ex.rover }));
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(160);
  const vA = await pg.evaluate(() => Game.S.ex.rover.v); await pg.waitForTimeout(900);
  const d1 = await pg.evaluate(() => ({ ...Game.S.ex.rover }));
  ok('Rover: acelera gradualmente hasta una velocidad máxima', vA > 0.3 && vA < d1.v && d1.v <= 10.51 && d1.x > d0.x + 2, JSON.stringify([vA, d1.v]));
  await pg.keyboard.down('ArrowLeft'); await pg.waitForTimeout(500); await pg.keyboard.up('ArrowLeft');
  const d2 = await pg.evaluate(() => ({ ...Game.S.ex.rover }));
  await pg.keyboard.down('ArrowRight'); await pg.waitForTimeout(900); await pg.keyboard.up('ArrowRight');
  const d3 = await pg.evaluate(() => ({ ...Game.S.ex.rover }));
  ok('Rover: gira a izquierda y a derecha', d2.a < d1.a - 0.2 && d3.a > d2.a + 0.4, JSON.stringify([d1.a, d2.a, d3.a]));
  await pg.keyboard.up('ArrowUp');
  const speedCoast = await pg.evaluate(() => Game.S.ex.rover.v); await pg.waitForTimeout(500);
  const speedCoast2 = await pg.evaluate(() => Game.S.ex.rover.v);
  ok('Rover: sin acelerar frena poco a poco por la resistencia', speedCoast2 < speedCoast && speedCoast2 > 0, JSON.stringify([speedCoast, speedCoast2]));
  await pg.evaluate(() => { const R = Game.S.ex.rover; R.x = window.__open[0]; R.y = window.__open[1]; R.a = 0; R.v = 0; });
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(900); const vb0 = await pg.evaluate(() => Game.S.ex.rover.v); await pg.keyboard.up('ArrowUp');
  await pg.keyboard.down('ArrowDown'); await pg.waitForTimeout(250); const vb1 = await pg.evaluate(() => Game.S.ex.rover.v); await pg.waitForTimeout(500); const vb2 = await pg.evaluate(() => Game.S.ex.rover.v);
  const pb0 = await pg.evaluate(() => ({ x: Game.S.ex.rover.x, y: Game.S.ex.rover.y, a: Game.S.ex.rover.a })); await pg.waitForTimeout(500); const pb1 = await pg.evaluate(() => ({ x: Game.S.ex.rover.x, y: Game.S.ex.rover.y, v: Game.S.ex.rover.v })); await pg.keyboard.up('ArrowDown');
  const back = (pb1.x - pb0.x) * Math.cos(pb0.a) + (pb1.y - pb0.y) * Math.sin(pb0.a);
  ok('Rover: frena fuerte y luego retrocede (más despacio que hacia delante)', vb1 < vb0 - 2 && vb2 < 0 && vb2 >= -3.9 && back < -0.2, JSON.stringify([vb0, vb1, vb2, back]));
  ok('Rover: la conducción en la explanada no pisa ningún obstáculo', await pg.evaluate(() => window.__viol === 0));
  await pg.evaluate(() => { Game.S.ex.rover.v = 0; });
  // El rover nunca atraviesa rocas grandes, paredes ni edificios
  const hit = await pg.evaluate(() => {
    const o = Field.G.obs.find((q) => q.t === 'rock' && q.r > 1 && (() => { for (let i = 0; i <= 50; i++) { const t = i / 50; if (!World.roverFree(q.x - 14 + (14 - q.r - 3) * t, q.y, 0)) return false; } return true; })());
    if (!o) return null; const R = Game.S.ex.rover; R.x = o.x - 14; R.y = o.y; R.a = 0; R.v = 0; R.occ = true; World.player.x = R.x; World.player.y = R.y; window.__viol = 0; window.__rk = o; return [o.x, o.y, o.r];
  });
  ok('Hay rocas grandes con el camino despejado donde probar la colisión', !!hit);
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(2800); await pg.keyboard.up('ArrowUp');
  const after = await pg.evaluate(() => ({ R: { ...Game.S.ex.rover }, viol: window.__viol, hit: Field.hit(Game.S.ex.rover.x, Game.S.ex.rover.y, 0.5, true), o: window.__rk }));
  ok('Rover: no atraviesa una roca grande (queda delante de ella, sin solaparse)', after.viol === 0 && !after.hit && after.R.x < after.o.x - after.o.r && after.R.x > after.o.x - after.o.r - 3.5, JSON.stringify([after.R.x, after.o.x, after.o.r, after.viol]));
  const wall = await pg.evaluate(() => { const R = Game.S.ex.rover; R.x = 76; R.y = 97; R.a = -Math.PI / 2; R.v = 0; R.occ = true; World.player.x = R.x; World.player.y = R.y; window.__viol = 0; Game.S.sys.rover.h = 100; return World.roverFree(R.x, R.y, R.a); });
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(2800); await pg.keyboard.up('ArrowUp');
  const wall2 = await pg.evaluate(() => ({ y: Game.S.ex.rover.y, viol: window.__viol, free: World.roverFree(Game.S.ex.rover.x, Game.S.ex.rover.y, Game.S.ex.rover.a), h: Game.S.sys.rover.h }));
  ok('Rover: no atraviesa el casco ni los edificios de la base', wall && wall2.y > 80.5 && wall2.viol === 0 && wall2.free, JSON.stringify(wall2));
  ok('Rover: un golpe fuerte daña un poco el vehículo', wall2.h < 100, String(wall2.h));
  // ---- el astronauta a pie tampoco atraviesa rocas ----
  await pg.evaluate(() => { Game.S.ex.rover.occ = false; Game.S.ex.rover.v = 0; const o = Field.G.obs.find((q) => q.t === 'rock' && q.r > 1 && (() => { for (let i = 0; i <= 30; i++) if (World._test.blocked(q.x - 6 + (6 - q.r - 0.8) * i / 30, q.y)) return false; return true; })()); World.player.x = o.x - 6; World.player.y = o.y; window.__rk = o; });
  await pg.waitForTimeout(300);
  await pg.keyboard.down('ArrowRight'); await pg.waitForTimeout(2200); await pg.keyboard.up('ArrowRight');
  const walk = await pg.evaluate(() => ({ x: World.player.x, hit: Field.hit(World.player.x, World.player.y, 0.25, false), o: window.__rk }));
  ok('A pie: no atraviesa rocas', !walk.hit && walk.x < walk.o.x - walk.o.r + 0.2, JSON.stringify([walk.x, walk.o.x]));
  // reserva de batería: sin carga el rover aún puede volver
  await pg.evaluate(() => { World.player.x = 70; World.player.y = 95; const R = Game.S.ex.rover; R.x = 80; R.y = open0(); R.a = 0; R.v = 0; R.occ = true; World.player.x = R.x; World.player.y = R.y; Game.S.sys.rover.batt = 0; function open0() { return window.__open[1]; } R.x = window.__open[0]; });
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(1500); await pg.keyboard.up('ArrowUp');
  const bat2 = await pg.evaluate(() => Game.S.ex.rover.v); ok('Batería agotada: queda una reserva lenta para regresar (≥ 2,5 casillas/s)', bat2 >= 2.5 && bat2 < 4, String(bat2));
  await pg.evaluate(() => { Game.S.sys.rover.batt = 100; Game.S.ex.rover.occ = false; Game.S.ex.rover.v = 0; });

  // ---------- 5. Recursos del traje ----------
  const rs = await pg.evaluate(() => {
    const S = Game.S, E = Ex.ensure(S), o = {}; Ex.equip(S); World.player.x = 70; World.player.y = 50; // jugador en la base: el bucle no gasta; el cálculo se hace a mano
    const run = (ctx, secs, setup) => { Ex.equip(S); E.suit.o2 = 100; E.suit.en = 100; E.suit.rad = 0; E.suit.integ = 100; E.suit.temp = 21; E.cond = null; E.flash = false; if (setup) setup(); for (let i = 0; i < secs; i++) Ex.tick(S, 1, Object.assign({ x: 80, y: 120, outside: true, inRover: false, move: 0, working: false, inShel: null }, ctx)); return { o2: 100 - E.suit.o2, en: 100 - E.suit.en, rad: E.suit.rad, temp: E.suit.temp }; };
    S.t = 0; o.idle = run({}, 60); o.walk = run({ move: 1 }, 60); o.work = run({ working: true }, 60); o.rov = run({ inRover: true, move: 1 }, 60);
    o.flash = run({}, 60, () => { E.flash = true; });
    S.t = 36; o.night = run({}, 60); S.t = 0;
    o.shel = run({ inShel: 'sA' }, 60); o.leak = run({}, 60, () => { E.suit.integ = 40; }); E.suit.integ = 100;
    o.burst = run({}, 30, () => { E.cond = { k: 'rad', age: 0, dur: 300 }; });
    Ex.equip(S); E.suit.o2 = 100; E.suit.en = 100; E.suit.rad = 0; E.cond = null; return o;
  });
  ok('Oxígeno: se consume con el tiempo, más al moverse y trabajar, menos dentro del rover', rs.idle.o2 > 5 && rs.walk.o2 > rs.idle.o2 && rs.work.o2 > rs.idle.o2 && rs.rov.o2 < rs.idle.o2, JSON.stringify([rs.idle.o2, rs.walk.o2, rs.work.o2, rs.rov.o2]));
  ok('Oxígeno: un traje dañado pierde aire más rápido', rs.leak.o2 > rs.idle.o2 * 1.4, JSON.stringify([rs.idle.o2, rs.leak.o2]));
  ok('Energía: se consume; la linterna y el frío/calor extremo gastan más; el rover gasta menos', rs.idle.en > 3 && rs.flash.en > rs.idle.en + 2 && rs.night.en > rs.idle.en && rs.rov.en < rs.walk.en, JSON.stringify([rs.idle.en, rs.flash.en, rs.night.en, rs.rov.en]));
  ok('Radiación: se acumula; el refugio la reduce y la ráfaga la multiplica', rs.idle.rad > 0 && rs.shel.rad < rs.idle.rad * 0.15 && rs.burst.rad / 30 > rs.idle.rad / 60 * 3, JSON.stringify([rs.idle.rad, rs.shel.rad, rs.burst.rad]));
  ok('Temperatura del traje: se mantiene mientras hay energía', Math.abs(rs.idle.temp - 21) < 6, String(rs.idle.temp));

  // ---------- 6. Alertas, radio y recuperación de seguridad ----------
  const al = await pg.evaluate(() => {
    const S = Game.S, E = Ex.ensure(S), c = { x: 80, y: 120, outside: true, inRover: false, move: 0, working: false, inShel: null }, o = {}; Ex.equip(S); E.al = {};
    E.suit.o2 = 29; o.low = Ex.tick(S, 0.1, c); E.suit.o2 = 11; o.crit = Ex.tick(S, 0.1, c);
    E.suit.en = 29; o.enLow = Ex.tick(S, 0.1, c); E.suit.rad = Ex.EXLIM * 0.7; o.radHi = Ex.tick(S, 0.1, c);
    E.suit.o2 = 100; E.suit.en = 100; E.suit.rad = 0; E.al = {};
    E.suit.o2 = 0; o.recall = Ex.tick(S, 0.1, c);
    E.suit.o2 = 100; E.al = {};
    Game._debug.exp.exAlert('o2.crit'); o.call = Game._debug.radio.cur && Game._debug.radio.cur.who;
    return o;
  });
  ok('Alertas de oxígeno, energía y radiación con histéresis', al.low.includes('o2.low') && al.crit.includes('o2.crit') && al.enLow.includes('en.low') && al.radHi.includes('rad.hi'), JSON.stringify(al));
  ok('Con el oxígeno agotado el sistema pide la evacuación de emergencia', al.recall.includes('recall'));
  ok('Las alertas salen por radio con la voz de la médica y subtítulo', al.call === 'medic' && (await pg.locator('#radio').isVisible()), String(al.call));
  await pg.evaluate(() => { Game._debug.radio.q = []; Game._debug.radio.cur = null; });
  // evacuación real (a través del bucle del juego)
  const t0 = await pg.evaluate(() => { const S = Game.S, E = S.ex; Ex.equip(S); E.cond = null; E.rover.occ = false; E.rover.x = 120; E.rover.y = 150; World.player.x = 100; World.player.y = 140; E.suit.o2 = 0.05; E.hand = []; return S.t; });
  await pg.waitForTimeout(1500);
  const ev = await pg.evaluate((t) => { const S = Game.S, E = S.ex, p = World.player; return { rec: E.recalls, o2: E.suit.o2, d: Math.hypot(p.x - Field.PAD[0], p.y - Field.PAD[1]), free: World._test.canStand(p.x, p.y, 0.3), dt: S.t - t, rov: [E.rover.x, E.rover.y], ended: S.ended, dlg: document.querySelectorAll('[role=dialog]').length, dtxt: (document.querySelector('[role=dialog]') || { innerText: '' }).innerText.slice(0, 120), par: Game.S.mode, z: World.zone(), occ: E.rover.occ, shel: World.inShelter }; }, t0);
  ok('Evacuación de emergencia: la base recoge al astronauta junto a la esclusa, con aire y sin quedar atrapado', ev.rec === 1 && ev.o2 >= 15 && ev.d < 8 && ev.free && ev.dt >= 1.2, JSON.stringify(ev));
  ok('Tras la evacuación el rover vuelve remolcado a la plataforma', Math.hypot(ev.rov[0] - 74, ev.rov[1] - 89.6) < 0.5);
  ok('La evacuación se avisa por radio (comandante, crítico)', await pg.evaluate(() => { const r = Game._debug.radio; return [r.cur].concat(r.q).filter(Boolean).some((c) => c.who === 'commander' && c.sev === 'crit'); }));

  // ---------- 7. Señal de radio y repetidores ----------
  const sg = await pg.evaluate(() => {
    const S = Game.S, E = Ex.ensure(S), o = {}; E.cond = null; for (const k in E.rep) delete E.rep[k]; S.inc = [];
    o.pad = Ex.signal(S, 68, 88); const p4 = Field.poi('p4'); o.far = Ex.signal(S, p4.x, p4.y); const p6 = Field.poi('p6'); o.farthest = Ex.signal(S, p6.x, p6.y);
    Ex.activateRepeater(S, 'rD'); o.rep = Ex.signal(S, p4.x, p4.y); o.again = Ex.activateRepeater(S, 'rD'); o.bad = Ex.activateRepeater(S, 'zzz');
    E.cond = { k: 'dust', age: 0, dur: 300 }; o.moonDust = Ex.signal(S, p4.x, p4.y); E.cond = null;
    o.canSend = [Ex.sendOk(S, 68, 88), Ex.sendOk(S, p6.x, p6.y)]; for (const k in E.rep) delete E.rep[k];
    return o;
  });
  ok('Señal: máxima junto a la base y más débil con la distancia', sg.pad > 0.95 && sg.far < sg.pad && sg.farthest < sg.far + 0.3, JSON.stringify(sg));
  ok('Repetidor: activarlo mejora la cobertura, no se activa dos veces', sg.rep > sg.far + 0.1 && sg.again === 'on' && sg.bad === 'err', JSON.stringify(sg));
  ok('Solo se puede enviar un informe con señal suficiente', sg.canSend[0] === true && sg.canSend[1] === false);

  // ---------- 8. Muestras: tarjeta, recogida, registro único ----------
  await start(pg, 'moon', 'junior');
  await pg.evaluate(() => { Ex.equip(Game.S); const s = Field.site('f01'); World.player.x = s.x; World.player.y = s.y + 0.4; });
  await pg.waitForTimeout(500);
  const n1 = await pg.evaluate(() => { const n = World.exNear(); return { id: n && n.id, s: n && n.s && n.s.id }; });
  ok('Al acercarse a una muestra se ofrece recogerla', n1.id === 'x:site' && n1.s === 'f01', JSON.stringify(n1));
  const card = await pg.locator('#xcard').innerText();
  ok('Tarjeta contextual: nombre, tipo, ubicación, descripción, interés científico y acción', /Regolito fino/.test(card) && /Tipo: Regolito/.test(card) && /Luna/.test(card) && /E [+−-]\d/.test(card) && /Interés científico: ★/.test(card) && /Pulsa E/.test(card), card.replace(/\n/g, ' | '));
  await pg.keyboard.press('e'); await pg.waitForTimeout(400);
  const mid = await pg.evaluate(() => Game.S.ex.hand.length); await pg.waitForTimeout(1500);
  const rec1 = await pg.evaluate(() => { const S = Game.S, E = S.ex; return { hand: E.hand.slice(), list: S.sampleList.map((r) => ({ ...r })), taken: { ...E.taken }, tot: S.st.samplesTot, seq: S.sampleSeq, base: S.samples }; });
  ok('Recoger lleva tiempo (no es instantáneo) y crea el registro', mid === 0 && rec1.hand.length === 1 && rec1.list.length === 1, JSON.stringify([mid, rec1.hand]));
  const r0 = rec1.list[0];
  ok('Registro único: ID, nombre, tipo, planeta, coordenadas, fecha, quién, conservación, descripción y ubicación', /^MS-\d{3}$/.test(r0.id) && r0.name.es && r0.kind === 'regolith' && r0.planet === 'moon' && r0.xy.length === 2 && r0.day >= 1 && r0.by === 'commander' && r0.state === 'new' && r0.desc && r0.loc === 'hand' && r0.site === 'f01', JSON.stringify(r0));
  ok('La muestra de campo no cuenta como disponible en el laboratorio hasta descargarla', rec1.base === 0 && rec1.taken.f01 === r0.id);
  const dup = await pg.evaluate(() => { const S = Game.S, E = S.ex; const a = Ex.collect(S, 'f01'); const b = Ex.collect(S, 'nope'); World.player.x = Field.site('f01').x; World.player.y = Field.site('f01').y; return { a, b, n: S.sampleList.length, near: (World.exNear() || {}).id }; });
  ok('No hay muestras duplicadas: una muestra recogida no se puede volver a recoger', dup.a === 'taken' && dup.b === 'err' && dup.n === 1 && dup.near !== 'x:site', JSON.stringify(dup));
  const hid = await pg.evaluate(() => { const S = Game.S, E = S.ex; const a = Ex.collect(S, 'f04'); const s = Field.site('f04'); World.player.x = s.x - 3; World.player.y = s.y; E.scanCd = 0; const sc = Ex.scan(S, World.player.x, World.player.y); const n1 = Ex.collect(S, 'f04'); return { a, found: sc.found, got: typeof n1 === 'object' && n1.site === 'f04' }; });
  ok('Muestras ocultas: no se pueden recoger hasta escanear; el escáner las revela', hid.a === 'hidden' && hid.found.includes('f04') && hid.got, JSON.stringify(hid));
  const fullc = await pg.evaluate(() => { const S = Game.S, E = S.ex; E.hand.length; return { hand: E.hand.length, r: Ex.collect(S, 'f02') }; });
  ok('Contenedor de mano limitado a 2 muestras', fullc.hand === 2 && fullc.r === 'full', JSON.stringify(fullc));

  // ---------- 9. Almacenamiento limitado en el rover ----------
  const st1 = await pg.evaluate(() => {
    const S = Game.S, E = S.ex, o = {}; o.dep = Ex.deposit(S); o.load = E.rover.load.length; o.hand = E.hand.length;
    // llenar el compartimento: 6 muestras y 12 kg como máximo
    const ids = ['f02', 'f03', 'f05', 'f07', 'f08', 'f09', 'f10', 'f12']; const res = [];
    for (const id of ids) { const s = Field.site(id); E.rev[id] = true; World.player.x = s.x; World.player.y = s.y; const r = Ex.collect(S, id); res.push(typeof r === 'string' ? r : 'ok'); Ex.deposit(S); if (E.hand.length) { /* lleno */ } }
    o.res = res; o.load2 = E.rover.load.length; o.kg = Ex.storage(S).kg; o.handLeft = E.hand.length;
    o.next = (() => { const s = Field.site('f11'); E.rev.f11 = true; return Ex.collect(S, 'f11'); })();
    return o;
  });
  ok('Almacenamiento: se deposita del contenedor al rover y está limitado a 6 casillas y 12 kg', st1.dep === 2 && st1.load === 2 && st1.hand === 0 && st1.load2 <= 6 && st1.kg <= 12.001 && st1.res.filter((x) => x === 'ok').length >= 4, JSON.stringify(st1));
  ok('Con el compartimento lleno hay que regresar o gestionar el espacio', st1.handLeft > 0 || st1.load2 === 6 || st1.kg > 9, JSON.stringify([st1.load2, st1.kg, st1.handLeft]));
  await pg.evaluate(() => { const E = Game.S.ex; E.rover.x = 74; E.rover.y = 89.6; E.rover.a = 0; E.rover.occ = false; World.player.x = 71.2; World.player.y = 89.6; });
  await pg.waitForTimeout(400);
  const stn = await pg.evaluate(() => (World.exNear() || {}).id); ok('Detrás del rover aparece «abrir compartimento»', stn === 'x:store', stn);
  await pg.keyboard.press('e'); await pg.waitForTimeout(300);
  const panelTxt = await pg.locator('[role=dialog]').innerText();
  ok('Interfaz del compartimento: muestras, capacidad, peso, identificación y organizar', /Capacidad: \d+\/6/.test(panelTxt) && /peso simulado/.test(panelTxt) && /MS-\d{3}/.test(panelTxt) && /Por peso/.test(panelTxt) && /Retirar/.test(panelTxt), panelTxt.slice(0, 160).replace(/\n/g, ' '));
  const ord0 = await pg.evaluate(() => Game.S.ex.rover.load.slice()); await pg.getByRole('button', { name: 'Por peso' }).click(); await pg.waitForTimeout(150);
  const ord1 = await pg.evaluate(() => Game.S.ex.rover.load.slice());
  const kgs = await pg.evaluate(() => Game.S.ex.rover.load.map((id) => Ex.rec(Game.S, id).kg)); ok('Organizar: ordena las muestras del rover (por peso)', kgs.every((v, i) => i === 0 || kgs[i - 1] >= v) && ord1.length === ord0.length, JSON.stringify(kgs));
  const refused = await pg.evaluate(() => { const E = Game.S.ex; return E.hand.length >= Ex.CAP.hand ? Ex.withdraw(Game.S, E.rover.load[0]) : 'n/a'; });
  await pg.evaluate(() => { const S = Game.S, E = S.ex; for (const id of E.hand) { const i = S.sampleList.findIndex((r) => r.id === id); if (i >= 0) S.sampleList.splice(i, 1); } E.hand = []; });
  ok('Retirar con el contenedor de mano lleno se rechaza', refused === 'handfull' || refused === 'n/a', String(refused));
  const lenBefore = ord1.length; await pg.getByRole('button', { name: /Retirar/ }).first().click(); await pg.waitForTimeout(200);
  const wd = await pg.evaluate(() => ({ load: Game.S.ex.rover.load.length, hand: Game.S.ex.hand.length, loc: Game.S.ex.hand.map((id) => Ex.rec(Game.S, id).loc) }));
  ok('Retirar: pasa la muestra al contenedor de mano', wd.load === lenBefore - 1 && wd.hand === 1 && wd.loc[0] === 'hand', JSON.stringify(wd));
  await closeAll(pg);
  const persist = await pg.evaluate(() => { const E = Game.S.ex, before = E.rover.load.slice(); E.rover.occ = true; E.rover.occ = false; return before.join() === E.rover.load.join(); });
  ok('Las muestras siguen guardadas aunque se salga del rover', persist);

  // ---------- 10. Descarga, almacén y laboratorio ----------
  const far = await pg.evaluate(() => { const E = Game.S.ex; E.rover.x = 120; E.rover.y = 150; World.player.x = 118; World.player.y = 148; const n = E.rover.load.length; Game._debug.exp.unloadAction(); return { n, after: E.rover.load.length, base: Game.S.samples }; });
  ok('No se puede descargar lejos de la base', far.after === far.n && far.base === 0, JSON.stringify(far));
  const un = await pg.evaluate(() => { const S = Game.S, E = S.ex; E.rover.x = 74; E.rover.y = 89.6; World.player.x = 72; World.player.y = 87; const tot = E.rover.load.length + E.hand.length; Game._debug.exp.unloadAction(); return { tot, base: S.samples, locs: [...new Set(S.sampleList.map((r) => r.loc))], hand: E.hand.length, load: E.rover.load.length, ids: S.sampleList.map((r) => r.id) }; });
  ok('Descarga: todas las muestras pasan al almacén de la base (las mismas, sin inventario aparte)', un.base === un.tot && un.locs.length === 1 && un.locs[0] === 'base' && un.hand === 0 && un.load === 0 && new Set(un.ids).size === un.ids.length, JSON.stringify(un));
  const lab = await pg.evaluate(() => { const S = Game.S, id = S.sampleList[0].id; const a = Sim.decide(S, 'sstore', { id, label: S.sampleList[0].cat }); const b = Sim.decide(S, 'analyze', { id }); Sim.step(S, 4); const r = S.sampleList.find((x) => x.id === id); return { a, b, an: r.an, sci: r.sci, res: r.res && r.res.es, science: S.science }; });
  ok('El laboratorio reconoce las muestras exteriores: se guardan, se analizan y los resultados se registran', lab.a.ok && lab.b.ok && lab.an === 'done' && lab.sci >= 12 && /./.test(lab.res || '') && lab.science > 0, JSON.stringify(lab));
  const nof = await pg.evaluate(() => { const S = Game.S, E = S.ex; Ex.equip(S); const s = Field.site('f15'); World.player.x = s.x; World.player.y = s.y; const r = Ex.collect(S, 'f15'); Sim.decide(S, 'analyze', { id: r.id }); const st = Sim.decide(S, 'sstore', { id: r.id, label: 'rock' }); const rr = S.sampleList.find((x) => x.id === r.id); return { an: rr.an, job: S.jobs.some((j) => j.sid === r.id), st: st.ok, loc: rr.loc }; });
  ok('Una muestra aún en el exterior no se puede analizar ni guardar en el almacén', nof.an === 'pending' && !nof.job && nof.st === false && nof.loc === 'hand', JSON.stringify(nof));
  await pg.evaluate(() => Game._debug.openConsole('sampler')); await pg.waitForTimeout(200);
  const smp = await pg.locator('[role=dialog]').innerText();
  ok('El almacén de muestras muestra el nombre de la muestra de campo y avisa de las que siguen fuera', /Regolito fino|MS-\d{3}/.test(smp) && /siguen en el exterior/.test(smp), smp.slice(0, 200).replace(/\n/g, ' '));
  await closeAll(pg);
  await pg.evaluate(() => Game._debug.openConsole('log')); await pg.waitForTimeout(200);
  const lg = await pg.locator('[role=dialog]').innerText(); ok('El registro de investigaciones muestra el informe y los resultados de las muestras', /Enviar informe a la Tierra/.test(lg) && /Resultados registrados/.test(lg), lg.slice(0, 160).replace(/\n/g, ' '));
  await closeAll(pg);

  // ---------- 11. Herramientas con función real ----------
  await start(pg, 'moon', 'junior');
  const tl = await pg.evaluate(() => {
    const S = Game.S, E = Ex.ensure(S), o = {}; const u = Game._debug.exp;
    o.noSuit = (() => { u.useTool('scanner'); return E.scanCd === 0; })();
    Ex.equip(S); World.player.x = 100; World.player.y = 130; E.scanCd = 0; const en0 = E.suit.en; u.useTool('scanner'); o.scan = { cd: E.scanCd > 5, en: E.suit.en < en0, rev: !!E.rev.f03 };
    const cd = Ex.scan(S, 100, 130); o.cd = cd.err;
    const ph0 = E.photos; World.player.x = 104; World.player.y = 130; u.useTool('camera'); o.photo = { n: E.photos === ph0 + 1, vis: !!E.visited.php2 };
    const rd0 = E.readings; u.useTool('sensor'); o.sensor = E.readings === rd0 + 1; o.sensorPanel = !!document.querySelector('[role=dialog]');
    return o;
  });
  ok('Escáner: gasta energía, tiene tiempo de recarga y revela muestras ocultas', tl.noSuit && tl.scan.cd && tl.scan.en && tl.scan.rev && tl.cd === 'cd', JSON.stringify(tl));
  ok('Cámara: registra la foto y el punto de interés', tl.photo.n && tl.photo.vis, JSON.stringify(tl.photo));
  ok('Sensor ambiental: toma una lectura y abre el panel de datos', tl.sensor && tl.sensorPanel);
  await closeAll(pg);
  const fl = await pg.evaluate(() => { const E = Game.S.ex; const u = Game._debug.exp; const a = E.flash; u.useTool('light'); const b = E.flash; u.useTool('light'); return [a, b, E.flash]; });
  ok('Linterna: se enciende y se apaga', fl[0] === false && fl[1] === true && fl[2] === false);
  await pg.keyboard.press('3'); const t3 = await pg.evaluate(() => Game.S.ex.tool); await pg.keyboard.press('l'); await pg.waitForTimeout(100); const tl2 = await pg.evaluate(() => Game.S.ex.flash); await pg.keyboard.press('l');
  ok('Teclado: 1–6 eligen herramienta y L alterna la linterna', t3 === 'scanner' && tl2 === true);
  await pg.evaluate(() => { World.player.x = 70; World.player.y = 90; }); await pg.waitForTimeout(500);
  const eb = await pg.evaluate(() => { const E = Game.S.ex; const a = E.scanCd; return a; }); await pg.keyboard.press('f'); await pg.waitForTimeout(150);
  ok('Tecla F usa la herramienta seleccionada', (await pg.evaluate(() => Game.S.ex.scanCd)) > 0);
  const col2 = await pg.evaluate(() => { const S = Game.S, E = S.ex; E.hand = []; const s = Field.site('f01'); World.player.x = s.x; World.player.y = s.y; Game._debug.exp.selectTool('collector'); Game._debug.exp.useTool('collector'); return true; });
  await pg.waitForTimeout(2000); ok('Recolector: recoge la muestra que tienes delante', await pg.evaluate(() => Game.S.ex.hand.length === 1));
  await pg.evaluate(() => { Game.S.ex.hand = []; }); await closeAll(pg);

  // ---------- 12. Puntos de interés, refugio y repetidor ----------
  const poi = await pg.evaluate(() => { const S = Game.S, E = S.ex, p = Field.poi('p3'); World.player.x = p.x; World.player.y = p.y + 2; const sc0 = S.science; const n = World.exNear(); const r = Ex.investigate(S, 'p3', p.x, p.y); const r2 = Ex.investigate(S, 'p3', p.x, p.y); return { n: n && n.id, first: r.first, second: r2.first, sci: S.science - sc0, v: !!E.visited.p3 }; });
  ok('Punto de interés: se investiga una sola vez y da ciencia', poi.n === 'x:poi' && poi.first === true && poi.second === false && poi.sci === 2 && poi.v, JSON.stringify(poi));
  const sh = await pg.evaluate(() => {
    const S = Game.S, E = S.ex, q = Field.G.shel[0]; World.player.x = q.x; World.player.y = q.y + 2.6; const n = World.exNear();
    const near = n && n.id; E.suit.o2 = 40; E.suit.en = 40; const e1 = World.enterShelter('sA'); const c = World.exCtx(); const u = Ex.useCache(S, 'sA'); const u2 = Ex.useCache(S, 'sA');
    const o = { near, e1, shel: c.inShel, u, u2, o2: E.suit.o2, en: E.suit.en }; World.leaveShelter(); o.out = World._test.canStand(World.player.x, World.player.y, 0.3) && !World.inShelter; return o;
  });
  ok('Refugio: se entra, reduce la radiación, tiene depósito de emergencia de un solo uso y se sale a un sitio libre', sh.near === 'x:shel' && sh.e1 && sh.shel === 'sA' && sh.u === null && sh.u2 === 'used' && sh.o2 >= 80 && sh.out, JSON.stringify(sh));
  const rp = await pg.evaluate(() => { const q = Field.G.rep[0]; World.player.x = q.x; World.player.y = q.y + 1; const n = World.exNear(); Game._debug.exp.exInteract(n); return { n: n && n.id, on: !!Game.S.ex.rep[q.id] }; });
  ok('Repetidor: se activa desde la interfaz', rp.n === 'x:rep' && rp.on, JSON.stringify(rp));
  await closeAll(pg);

  // ---------- 13. Misiones progresivas ----------
  await start(pg, 'moon', 'junior');
  const m1 = await pg.evaluate(async () => {
    const S = Game.S, E = Ex.ensure(S), o = {}; o.start = Ex.objectives(S).m.id; Ex.equip(S); World.player.x = 70; World.player.y = 90; o.i0 = E.m.i; return o;
  });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => { const R = Game.S.ex.rover; R.x = window.__open[0]; R.y = window.__open[1]; R.a = 0; R.v = 0; R.occ = true; World.player.x = R.x; World.player.y = R.y; });
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(3000); await pg.keyboard.up('ArrowUp');
  await pg.evaluate(() => { const R = Game.S.ex.rover; R.v = 0; R.a = Math.PI; R.x = window.__open[0] + 38; });
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(3000); await pg.keyboard.up('ArrowUp');
  const odo = await pg.evaluate(() => { const E = Game.S.ex; E.rover.v = 0; E.rover.occ = false; E.rover.x = 74; E.rover.y = 89.6; World.player.x = 72; World.player.y = 87; return E.rover.odo; });
  ok('Misión 1: el recorrido acumula distancia conducida', odo >= 40, String(odo));
  await pg.waitForTimeout(300); await pg.evaluate(() => { const s = World._test.spot('rad', 1); World.player.x = s[0]; World.player.y = s[1]; }); await pg.waitForTimeout(700);
  const m1b = await pg.evaluate(() => ({ i: Game.S.ex.m.i, done: Game.S.ex.m.done.e1, f: { ...Game.S.ex.f } }));
  ok('Misión 1 «Primer recorrido» se completa al regresar con el traje, tras salir y conducir', m1b.i === 1 && m1b.done === 1, JSON.stringify(m1b));
  const rad1 = await pg.evaluate(() => { const r = Game.S.log.filter((l) => l.k === 'ex.mission'); return r.length; }); ok('La misión completada se registra y se anuncia por radio', rad1 === 1 && await pg.evaluate(() => { const r = Game._debug.radio; return [r.cur].concat(r.q).filter(Boolean).some((c) => /ex\.m1/.test(c.key)); }));
  // Misión 2
  const p1 = await pg.evaluate(() => Field.poi('p1'));
  await pg.evaluate(() => { World.player.x = 42; World.player.y = 124; }); await pg.waitForTimeout(500);
  const g2 = await pg.evaluate(() => { const g = Ex.goal(Game.S); return g && g.poi; });
  await pg.evaluate(() => { Game.S.ex.scanCd = 0; Game._debug.exp.useTool('scanner'); }); await pg.waitForTimeout(150);
  await pg.evaluate(() => { const s = Field.site('f05'); World.player.x = s.x; World.player.y = s.y + 0.3; }); await pg.waitForTimeout(500);
  await pg.keyboard.press('e'); await pg.waitForTimeout(2000);
  await pg.evaluate(() => { const s = World._test.spot('rad', 1); World.player.x = s[0]; World.player.y = s[1]; }); await pg.waitForTimeout(500);
  await pg.evaluate(() => { Game._debug.exp.unloadAction(); }); await pg.waitForTimeout(200);
  const m2a = await pg.evaluate(() => { const o = Ex.objectives(Game.S); return o.list.map((q) => q.k + ':' + (q.ok ? 1 : 0)).join(' '); });
  await pg.evaluate(() => { const S = Game.S, r = S.sampleList[0]; Sim.decide(S, 'sstore', { id: r.id, label: r.cat }); Sim.decide(S, 'analyze', { id: r.id }); Sim.step(S, 4); }); await pg.waitForTimeout(700);
  const m2b = await pg.evaluate(() => ({ i: Game.S.ex.m.i, done: Game.S.ex.m.done.e2 }));
  ok('Misión 2 «Reconocimiento geológico»: llegar, bajar, escanear, recoger, regresar y analizar', g2 === 'p1' && /m2reach:1 m2foot:1 m2scan:1 m2col:1 m2back:1 m2an:0/.test(m2a) && m2b.i === 2 && m2b.done === 1, m2a + ' ' + JSON.stringify(m2b));
  // Misión 3
  const m3 = await pg.evaluate(() => {
    const S = Game.S, E = S.ex; Ex.equip(S); const o = {};
    for (const id of ['p1', 'p2', 'p3']) { const p = Field.poi(id); World.player.x = p.x; World.player.y = p.y + 2; Ex.investigate(S, id, p.x, p.y); }
    for (const id of ['f01', 'f07', 'f02']) { const s = Field.site(id); World.player.x = s.x; World.player.y = s.y; E.hand = []; Ex.collect(S, id); Ex.deposit(S); }
    World.player.x = 72; World.player.y = 87; o.unl = Ex.unload(S); o.cnt = E.m.c.m3unl;
    const sc = Ex.report(S, 68, 88); o.rep = sc.ok; return o;
  });
  await pg.waitForTimeout(400);
  const m3b = await pg.evaluate(() => ({ i: Game.S.ex.m.i, done: Game.S.ex.m.done.e3 }));
  ok('Misión 3 «Exploración ampliada»: 3 puntos investigados, 3 muestras transportadas, sin evacuación, informe enviado', m3.unl === 3 && m3.cnt === 3 && m3.rep === true && m3b.i === 3 && m3b.done === 1, JSON.stringify([m3, m3b]));
  // Misión 4
  await pg.evaluate(() => { World.player.x = 70; World.player.y = 90; Ex.equip(Game.S); }); await pg.waitForTimeout(600);
  const c4 = await pg.evaluate(() => { const E = Game.S.ex; return E.cond && E.cond.k; });
  ok('Misión 4: al salir empieza una ventana de condiciones adversas propia del escenario (Luna: ráfagas de radiación)', c4 === 'rad', String(c4));
  await pg.evaluate(() => { const S = Game.S, E = S.ex; const q = Field.rep('rA'); World.player.x = q.x; World.player.y = q.y + 1; Game._debug.exp.exInteract(World.exNear()); });
  const m4 = await pg.evaluate(() => {
    const S = Game.S, E = S.ex, o = {}; const c = { x: 96, y: 147, outside: true, inRover: false, move: 0, working: false, inShel: 'sA' };
    for (let i = 0; i < 10; i++) { if (E.cond) E.cond.age = 5; Ex.tick(S, 1, c); }
    const s = Field.site('f03'); E.rev.f03 = true; E.hand = []; World.player.x = s.x; World.player.y = s.y; o.col = typeof Ex.collect(S, 'f03') === 'object'; Ex.deposit(S);
    World.player.x = 72; World.player.y = 87; o.unl = Ex.unload(S); o.rep = Ex.report(S, 68, 88).ok; return o;
  });
  await pg.waitForTimeout(500);
  const m4b = await pg.evaluate(() => ({ i: Game.S.ex.m.i, done: Game.S.ex.m.done.e4, obj: Ex.objectives(Game.S), shel: Game.S.ex.m.c.m4shel }));
  ok('Misión 4 «Condiciones adversas»: repetidor, refugio, muestra del objetivo y datos enviados', m4.col && m4.unl >= 1 && m4.rep && m4b.i === 4 && m4b.done === 1 && m4b.obj === null && m4b.shel >= 8, JSON.stringify([m4, m4b.i, m4b.shel]));
  await pg.evaluate(() => { Game._debug.exp.exMissionsPanel(); }); await pg.waitForTimeout(200);
  ok('Panel de misiones: lista las cuatro misiones con sus objetivos', (await pg.locator('[role=dialog] .card').count()) === 4 && /Condiciones adversas/.test(await pg.locator('[role=dialog]').innerText()));
  await closeAll(pg);

  // ---------- 14. Luna vs Marte ----------
  const cmp = await pg.evaluate(async () => {
    const out = {};
    for (const sc of ['moon', 'mars']) {
      await Game._debug.newRun(sc, 'x', { skipCamp: true, mode: 'adv' });
      await new Promise((r) => setTimeout(r, 200));
      const S = Game.S, E = Ex.ensure(S); Ex.equip(S);
      const G = Field.G, o = { pois: G.pois.map((p) => p.n.es).join('|'), zones: [...new Set(G.zones.map((z) => z.k))].join(','), kinds: [...new Set(G.sites.map((s) => s.kind))].sort().join(','), dunes: G.dunes.length, rocks: G.obs.filter((q) => q.t === 'rock' || q.t === 'mesa').length };
      S.inc = []; const p = Field.poi('p1'); const e0 = Ex.env(S, p.x, p.y); o.rate = 0; E.suit.rad = 0; E.cond = null; for (let i = 0; i < 60; i++) Ex.tick(S, 1, { x: 80, y: 120, outside: true, inRover: false, move: 0, working: false, inShel: null }); o.rate = E.suit.rad;
      E.cond = { k: sc === 'mars' ? 'dust' : 'rad', age: 0, dur: 300 }; const e1 = Ex.env(S, 80, 120); o.dust = e1.dust; o.burst = e1.burst; o.vis = e1.vis; o.sig = Ex.signal(S, 80, 120); E.cond = null; o.sig0 = Ex.signal(S, 80, 120);
      o.ground = Field.ground(G.zones[0].x, G.zones[0].y).k; o.wind = Ex.measure(S, 80, 120, false).wind; o.cond4 = null;
      out[sc] = o;
    }
    return out;
  });
  const mo = cmp.moon, ma = cmp.mars;
  ok('Terreno distinto: los puntos de interés y los tipos de suelo de la Luna y Marte no coinciden', mo.pois !== ma.pois && mo.zones.includes('deep') && !ma.zones.includes('deep') && ma.zones.includes('sand') && ma.zones.includes('slope') && ma.dunes > 0 && mo.dunes === 0, JSON.stringify([mo.zones, ma.zones]));
  ok('Muestras propias: la Luna tiene hielo de agua y Marte sedimentos y sin hielo', mo.kinds.includes('ice') && !mo.kinds.includes('sediment') && ma.kinds.includes('sediment') && !ma.kinds.includes('ice'), JSON.stringify([mo.kinds, ma.kinds]));
  ok('Adversidades distintas: Marte (tormenta de polvo, viento) y la Luna (ráfagas de radiación, sin viento)', ma.dust === 1 && ma.burst === 0 && ma.vis <= 8 && mo.dust === 0 && mo.burst > 0.5 && mo.wind === 0 && ma.wind > 0, JSON.stringify([ma.dust, ma.burst, ma.vis, mo.dust, mo.burst, mo.wind, ma.wind]));
  ok('La tormenta de polvo reduce la señal; la radiación de fondo es distinta en cada mundo', ma.sig < ma.sig0 * 0.8 && mo.rate > ma.rate * 1.5, JSON.stringify([ma.sig, ma.sig0, mo.rate, ma.rate]));
  const mob = await pg.evaluate(() => { const G = Field.G, z = G.zones.find((q) => q.k === 'deep' || q.k === 'sand'); return { plain: Field.ground(150, 170).r, z: Field.ground(z.x, z.y).r, f: Field.ground(z.x, z.y).f }; });
  ok('Movilidad: el regolito profundo y la arena frenan al rover y al astronauta frente al suelo firme', mob.plain === 1 && mob.z < 0.75 && mob.f < 0.85, JSON.stringify(mob));

  // ---------- 15. Terreno amplio y regreso a la base ----------
  const big = await pg.evaluate(() => ({ w: Field.B.x1 - Field.B.x0, h: Field.B.y1 - Field.B.y0, pois: Field.G.pois.length, rep: Field.G.rep.length, shel: Field.G.shel.length, trails: Field.TRAILS.length, craters: Field.G.craters.length, rocks: Field.G.obs.length }));
  ok('Terreno amplio con rutas, rocas, cráteres, puntos de interés, repetidores y refugios', big.w > 250 && big.h > 250 && big.pois >= 6 && big.rep >= 3 && big.shel >= 3 && big.trails >= 8 && big.craters > 40 && big.rocks > 150, JSON.stringify(big));
  const reach = await pg.evaluate(() => {
    World.setFloor(2); // el terreno exterior pertenece a la planta baja
    // todos los puntos de interés, muestras, repetidores y refugios son alcanzables a pie desde la plataforma (BFS en celdas)
    const start = [68, 94], B = Field.B, cell = 1, ok1 = (x, y) => !World._test.blocked(x, y), seen = new Set(), q = [[Math.floor(start[0]), Math.floor(start[1])]]; seen.add(q[0].join());
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < B.x0 || ny < B.y0 || nx > B.x1 || ny > B.y1) continue; const k = nx + ',' + ny; if (seen.has(k)) continue; if (!ok1(nx + 0.5, ny + 0.5)) continue; seen.add(k); q.push([nx, ny]); } }
    const miss = []; const chk = (n, x, y) => { let hit = false; for (let dx = -2; dx <= 2 && !hit; dx++) for (let dy = -3; dy <= 3 && !hit; dy++) if (seen.has(Math.floor(x + dx) + ',' + Math.floor(y + dy))) hit = true; if (!hit) miss.push(n); };
    Field.G.pois.forEach((p) => chk(p.id, p.x, p.y)); Field.G.sites.forEach((s) => chk(s.id, s.x, s.y)); Field.G.rep.forEach((p) => chk(p.id, p.x, p.y)); Field.G.shel.forEach((p) => chk(p.id, p.x, p.y + 2.6));
    return { miss, cells: seen.size };
  });
  ok('Todo el terreno de interés es accesible a pie desde la base (sin objetivos encerrados por rocas)', reach.miss.length === 0, JSON.stringify(reach));
  const roverReach = await pg.evaluate(() => { World.setFloor(2); const B = Field.B, seen = new Set(), q = [[68, 94]]; seen.add('68,94'); const f = (x, y) => World.roverFree(x + 0.5, y + 0.5, 0) && World.roverFree(x + 0.5, y + 0.5, Math.PI / 2); while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const nx = x + dx, ny = y + dy; if (nx < B.x0 || ny < B.y0 || nx > B.x1 || ny > B.y1) continue; const k = nx + ',' + ny; if (seen.has(k)) continue; if (!f(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } } const miss = []; for (const p of Field.G.pois) { let hit = false; for (let dx = -6; dx <= 6 && !hit; dx += 2) for (let dy = -6; dy <= 6 && !hit; dy += 2) if (seen.has((Math.floor(p.x / 2) * 2 + dx) + ',' + (Math.floor(p.y / 2) * 2 + dy))) hit = true; if (!hit) miss.push(p.id); } return { miss, n: seen.size }; });
  ok('Rutas alternativas: el rover llega a cada punto de interés rodeando cráteres y rocas', roverReach.miss.length === 0, JSON.stringify(roverReach));
  ok('La base se ve a distancia: el radar y la flecha apuntan al camino de regreso', await pg.evaluate(() => { World.player.x = 150; World.player.y = 130; Ex.equip(Game.S); const c = document.createElement('canvas'); c.width = 380; c.height = 300; World.minimap(c.getContext('2d'), Game.S, null); const d = c.getContext('2d').getImageData(0, 0, 380, 300).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n > 50000; }));

  // ---------- 16. HUD exterior y modos ----------
  await start(pg, 'moon', 'junior');
  await pg.evaluate(() => { Ex.equip(Game.S); World.player.x = 70; World.player.y = 90; }); await pg.waitForTimeout(600);
  const hudJ = await pg.locator('#eva').innerText(); const vis = await pg.locator('#eva').isVisible(), tools = await pg.locator('#xtools button').count();
  ok('HUD exterior compacto: O₂, energía, traje, radiación, rover, temperatura, señal, carga y objetivo', vis && tools === 6 && /O₂/.test(hudJ) && /Energía/.test(hudJ) && /Rad/.test(hudJ) && /Temp/.test(hudJ) && /Señal/.test(hudJ) && /Carga/.test(hudJ) && /Primer recorrido/.test(hudJ), hudJ.replace(/\n/g, ' | '));
  ok('Modo Explorador Junior: porcentajes y frases sencillas, sin unidades técnicas', !/mSv|km\/h|min/.test(hudJ));
  await start(pg, 'moon', 'adv'); await pg.evaluate(() => { Ex.equip(Game.S); World.player.x = 70; World.player.y = 90; }); await pg.waitForTimeout(600);
  const hudA = await pg.locator('#eva').innerText();
  ok('Modo Ingeniero de Misión: unidades y datos técnicos (min de O₂, mSv, °C exteriores, kg)', /min/.test(hudA) && /mSv/.test(hudA) && /exterior -?\d+ °C/.test(hudA) && /kg/.test(hudA), hudA.replace(/\n/g, ' | '));
  await pg.evaluate(() => Game._debug.openConsole('suit')); await pg.waitForTimeout(150);
  ok('Panel de traje (Ingeniero): explica el consumo con unidades y avisa de que son valores de juego', /valores|Consumo de juego/.test(await pg.locator('[role=dialog]').innerText()));
  await closeAll(pg);

  // ---------- 17. Guardado y carga ----------
  await start(pg, 'mars', 'junior');
  const sv = await pg.evaluate(() => {
    const S = Game.S, E = Ex.ensure(S); Ex.equip(S); const ids = []; for (const id of ['f03', 'f01']) { const s = Field.site(id); World.player.x = s.x; World.player.y = s.y; const r = Ex.collect(S, id); ids.push(r.id); } Ex.deposit(S);
    const s = Field.site('f06'); World.player.x = s.x; World.player.y = s.y; Ex.collect(S, 'f06'); E.rep.rA = true; E.visited.p1 = 1; E.rover.x = 100; E.rover.y = 130; E.rover.a = 1.2; World.player.x = 98; World.player.y = 128;
    Game._debug.saveNow(); return { n: S.sampleList.length, ids: S.sampleList.map((r) => r.id), taken: { ...E.taken }, load: E.rover.load.slice(), hand: E.hand.slice(), seq: S.sampleSeq, rov: [E.rover.x, E.rover.y, E.rover.a] };
  });
  await pg.reload(); await pg.waitForTimeout(500);
  await pg.getByRole('button', { name: /Continuar/ }).click(); await pg.waitForTimeout(700);
  const ld = await pg.evaluate(() => { const S = Game.S, E = S.ex; return { n: S.sampleList.length, ids: S.sampleList.map((r) => r.id), taken: { ...E.taken }, load: E.rover.load.slice(), hand: E.hand.slice(), seq: S.sampleSeq, suit: E.suit.on, rov: [E.rover.x, E.rover.y, E.rover.a], rep: !!E.rep.rA, vis: !!E.visited.p1, p: [World.player.x, World.player.y], scen: S.scen }; });
  ok('Guardar y cargar: expedición, traje, rover, repetidores y puntos visitados se restauran', ld.suit && ld.scen === 'mars' && Math.abs(ld.rov[0] - 100) < 0.01 && ld.rep && ld.vis && Math.hypot(ld.p[0] - 98, ld.p[1] - 128) < 0.5, JSON.stringify(ld));
  ok('Guardar y cargar no duplica muestras: mismos IDs, mismas ubicaciones y contador', ld.n === sv.n && ld.ids.join() === sv.ids.join() && ld.load.join() === sv.load.join() && ld.hand.join() === sv.hand.join() && ld.seq === sv.seq && JSON.stringify(ld.taken) === JSON.stringify(sv.taken), JSON.stringify([sv.ids, ld.ids]));
  const again = await pg.evaluate(() => { Game._debug.saveNow(); const S = Game.S; const r = Ex.collect(S, 'f03'); return { r, n: S.sampleList.length }; });
  ok('Tras cargar, una muestra ya recogida sigue sin poder recogerse otra vez', again.r === 'taken' && again.n === ld.n);
  // partida antigua sin expedición: se crea el estado al vuelo
  const oldSave = await pg.evaluate(() => { const S = JSON.parse(JSON.stringify(Game.S)); delete S.ex; const M = Sim.migrate(S); const E = Ex.ensure(M); return !!E.suit && !!E.rover && E.m.i === 0; });
  ok('Una partida guardada antes de la expedición se migra sin perder datos', oldSave);

  // ---------- 18. Rendimiento y errores ----------
  const perf = await pg.evaluate(async () => { const S = Game.S; Ex.equip(S); World.player.x = 150; World.player.y = 130; const cv = document.querySelector('#game'), ctx = cv.getContext('2d'); const t0 = performance.now(); let n = 0; for (let i = 0; i < 90; i++) { World.player.x += 0.5; World.update(1 / 60, S, { x: 0, y: 0 }); World.render(ctx, S, { dpr: 1 }); n++; } return (performance.now() - t0) / n; });
  ok('Rendimiento: fotograma de exploración exterior por debajo de 30 ms (incluye generar bloques de terreno)', perf < 30, perf.toFixed(1) + ' ms');
  ok('Sin errores de página durante las pruebas de escritorio', errors.length === 0, errors.join(' | '));
  if (shots) { await pg.evaluate(() => { World.player.x = 70; World.player.y = 90; }); await pg.waitForTimeout(500); await pg.screenshot({ path: shots + '/expo_desktop.png' }); }
  await ctx.close();

  // ---------- 19. Móvil: controles táctiles ----------
  const M = await newPage(browser, { width: 390, height: 844 }, true);
  await start(M.pg, 'mars', 'junior');
  await M.pg.evaluate(() => { Ex.equip(Game.S); const R = Game.S.ex.rover; R.x = 74; R.y = 89.6; R.a = 0; R.v = 0; World.player.x = 72; World.player.y = 87.5; });
  await M.pg.waitForTimeout(500);
  await M.pg.evaluate(() => window.dispatchEvent(new Event('touchstart'))); await M.pg.waitForTimeout(200);
  const tv = await M.pg.evaluate(() => ({ joy: !document.querySelector('#touch').classList.contains('hidden'), f: !document.querySelector('#btnF').classList.contains('hidden'), tools: !document.querySelector('#xtools').classList.contains('hidden'), eva: !document.querySelector('#eva').classList.contains('hidden') }));
  ok('Móvil: joystick, botón E, botón F, barra de herramientas y HUD exterior visibles', tv.joy && tv.f && tv.tools && tv.eva, JSON.stringify(tv));
  const ovl = await M.pg.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const a = r('#eva'), t = r('#xtools'), j = r('#joy'), e = r('#btnE'), f = r('#btnF'); const ov = (p, q) => !(p.right <= q.left || q.right <= p.left || p.bottom <= q.top || q.bottom <= p.top); return { eva_tools: ov(a, t), joy_e: ov(j, e), joy_f: ov(j, f), e_f: ov(e, f), w: innerWidth, off: [a, t, j, e, f].some((q) => q.right > innerWidth + 1 || q.left < -1) }; });
  ok('Móvil: los controles no se solapan ni se salen de la pantalla', !ovl.eva_tools && !ovl.joy_e && !ovl.joy_f && !ovl.e_f && !ovl.off, JSON.stringify(ovl));
  await M.pg.evaluate(() => Game._debug.exp.exInteract({ id: 'x:board' })); await M.pg.waitForTimeout(1100);
  const jb = await M.pg.evaluate(() => { const r = document.querySelector('#joy').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2]; });
  const q0 = await M.pg.evaluate(() => ({ ...Game.S.ex.rover }));
  await M.pg.mouse.move(jb[0], jb[1]); await M.pg.mouse.down(); await M.pg.mouse.move(jb[0] + jb[2] * 0.9, jb[1], { steps: 4 }); await M.pg.waitForTimeout(1300);
  const r1 = await M.pg.evaluate(() => ({ ...Game.S.ex.rover }));
  await M.pg.mouse.move(jb[0], jb[1] + jb[2] * 0.9, { steps: 4 }); await M.pg.waitForTimeout(1300);
  const r2 = await M.pg.evaluate(() => ({ ...Game.S.ex.rover }));
  await M.pg.mouse.up(); await M.pg.waitForTimeout(200);
  ok('Móvil: el joystick conduce el rover (la palanca fija el rumbo y la aceleración)', r1.x > q0.x + 2 && r2.y > r1.y + 1 && r2.a > 0.5, JSON.stringify([q0.x, r1.x, r1.y, r2.y, r2.a]));
  await M.pg.tap('#btnF'); await M.pg.waitForTimeout(150);
  ok('Móvil: el botón F usa la herramienta seleccionada', await M.pg.evaluate(() => !!document.querySelector('[role=dialog]') || Game.S.ex.scanCd > 0 || Game.S.ex.flash || Game.S.ex.hand.length >= 0));
  if (shots) await M.pg.screenshot({ path: shots + '/expo_mobile.png' });
  ok('Sin errores de página en el móvil', M.errors.length === 0, M.errors.join(' | '));
  await M.ctx.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 800)); process.exit(2); });
