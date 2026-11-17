/* Pruebas de supervivencia y Game Over: cada causa sale de condiciones reales, avisa antes, anima,
   muestra la causa y «Reintentar» devuelve la misión a su estado inicial.
   Uso: NODE_PATH=$(npm root -g) node tests/survival.js [carpeta-capturas] */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv[2];
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n + ' ' + (d || '')); } };
const sleep = (pg, ms) => pg.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx.newPage(); const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(FILE + '?noload'); await sleep(pg, 300);
  const fresh = async (scen) => {
    await pg.evaluate((sc) => { Game._debug.newRun(sc || 'moon', 'x', { skipCamp: true, mode: 'adv' }); const S = Game.S; S.noEv = true; S.lastEv = 1e9; Game._debug.setSpeed(0); }, scen);
    await sleep(pg, 350);
  };
  const toPanel = async (reason, shot) => {
    await pg.waitForFunction(() => Game._debug.surv.active, null, { timeout: 8000 });
    if (shot) { await sleep(pg, 1700); await pg.screenshot({ path: shot }); }
    await pg.evaluate(() => Game._debug.surv.skip());
    await pg.waitForSelector('.go-panel', { timeout: 4000 });
    return pg.evaluate(() => ({ title: document.querySelector('.go-title').textContent, kind: document.querySelector('.go-title').dataset.go, txt: document.querySelector('.go-panel').innerText, retry: !!document.querySelector('[data-act=retry]'), ended: Game.S.ended }));
  };
  /** Daña todo lo que pueda dañarse en la partida y comprueba que «Reintentar» lo deja todo como al empezar. */
  const dirty = () => pg.evaluate(() => { const S = Game.S, E = S.ex; S.sys.rover.h = 4; S.sys.rover.batt = 3; S.sys.reactor.h = 12; S.r.food.v = 0; S.st.maxDose = S.limit * 0.5; E.suit.on = false; E.suit.o2 = 3; E.rover.occ = true; S.surv = { cold: 0.9, al: { 'cold.start': 1 }, why: 'nosuit' }; S.t = 99; });
  const pristine = () => pg.evaluate(() => { const S = Game.S, E = S.ex; return { ended: S.ended, t: S.t, rover: S.sys.rover.h, batt: S.sys.rover.batt, reactor: S.sys.reactor.h, food: S.r.food.v > 5, dose: S.st.maxDose, suit: E.suit.on, occ: E.rover.occ, cold: S.surv ? S.surv.cold : 0, filter: document.getElementById('game').style.filter, panel: !!document.querySelector('.go-panel'), running: Game._debug.running, bar: document.getElementById('survbar').classList.contains('hidden') }; });
  const retryOk = async (label) => {
    await dirty(); const had = await pg.evaluate(() => Game.S.sys.rover.h);
    await pg.locator('[data-act=retry]').click(); await sleep(pg, 700);
    const p = await pristine();
    ok(label + ': «Reintentar» reinicia la misión y no conserva nada dañado de la partida anterior', had === 4 && p.ended === null && p.t < 1 && p.rover === 100 && p.batt > 90 && p.reactor > 99 && p.food && p.dose < 1 && !p.suit && !p.occ && p.cold === 0 && p.filter === '' && !p.panel && p.running && p.bar, JSON.stringify(p));
  };

  /* ---- 1. Frío: sin traje en el exterior ---- */
  await fresh();
  const c0 = await pg.evaluate(() => { World.setFloor(2); World.player.x = Field.PAD[0]; World.player.y = Field.PAD[1]; Game._debug.setSpeed(1); return { zone: World.zone(), suit: Game.S.ex.suit.on }; });
  ok('Fuera de la base y sin traje: el jugador está en el exterior', c0.zone === 'outside' && c0.suit === false, JSON.stringify(c0));
  await sleep(pg, 2200);
  const c1 = await pg.evaluate(() => ({ cold: Game.S.surv.cold, slow: Game._debug.surv.slow, warn: !!Game.S.surv.al['cold.start'], bar: !document.getElementById('survbar').classList.contains('hidden'), fx: document.getElementById('survfx').style.background !== 'none', ended: !!Game.S.ended }));
  ok('Primero hay advertencias y efectos progresivos (barra, tinte azul, aviso por radio)', c1.cold > 0.05 && c1.cold < 0.9 && c1.warn && c1.bar && c1.fx && !c1.ended, JSON.stringify(c1));
  ok('El movimiento se vuelve más lento con el frío', c1.slow < 0.95, String(c1.slow));
  // volver a la base a tiempo salva al jugador (no es una derrota injusta)
  const back = await pg.evaluate(() => { World.player.x = 68; World.player.y = 80; return World.zone(); });
  await sleep(pg, 2500);
  const c2 = await pg.evaluate(() => ({ cold: Game.S.surv.cold, ended: !!Game.S.ended, zone: World.zone() }));
  ok('Si el jugador vuelve a tiempo el frío baja y no pierde', back !== 'outside' ? c2.cold < c1.cold && !c2.ended : true, JSON.stringify([back, c1.cold, c2]));
  await pg.evaluate(() => { World.player.x = Field.PAD[0]; World.player.y = Field.PAD[1]; Game.S.surv.cold = 0.97; });
  let g = await toPanel('cold', shots && shots + '/go-cold.png');
  ok('Congelación: animación y GAME OVER con la causa', g.title === 'GAME OVER' && g.kind === 'cold' && /traje/.test(g.txt) && g.retry && g.ended.kind === 'dead' && g.ended.reason === 'cold', g.txt.slice(0, 120));
  await retryOk('Frío');

  /* ---- 2. Rover: impactos hasta integridad 0 ---- */
  await fresh();
  const r1 = await pg.evaluate(() => {
    const S = Game.S, E = S.ex; E.suit.on = true; E.rover.occ = true; E.rover.odo = 5; S.sys.rover.h = 30; const out = { warns: [] };
    const hit = () => { E.rover.v = 14; return Rover.update(0.05, S, { thr: 1, str: 0, stick: null }, () => false); };
    let n = 0, ev; for (; n < 60 && !S.ended; n++) { ev = hit(); Surv.warnings(S).forEach((k) => out.warns.push(k)); }
    out.n = n; out.h = S.sys.rover.h; out.ended = S.ended; out.ev = ev; return out;
  });
  ok('El rover solo se destruye tras varios impactos fuertes, con avisos antes', r1.n > 2 && r1.warns.includes('rover.low') && r1.warns.includes('rover.crit'), JSON.stringify([r1.n, r1.warns]));
  ok('Integridad 0 con el jugador al volante → derrota «rover»', r1.h === 0 && r1.ended && r1.ended.reason === 'rover' && r1.ended.kind === 'dead' && r1.ev.includes('wreck'), JSON.stringify(r1.ended));
  g = await toPanel('rover', shots && shots + '/go-rover.png');
  ok('Explosión y GAME OVER con la causa del accidente', g.kind === 'rover' && /rover/i.test(g.txt) && g.retry, g.txt.slice(0, 100));
  await retryOk('Rover');
  const r2 = await pg.evaluate(() => { const S = Game.S, E = S.ex; E.rover.occ = false; S.sys.rover.h = 3; E.rover.v = 14; Rover.update(0.05, S, { thr: 1, str: 0, stick: null }, () => false); return !!S.ended; });
  ok('Un rover dañado sin conductor no causa derrota', r2 === false);

  /* ---- 3. Hambre: 72 h seguidas sin alimentos ---- */
  await fresh();
  const keep = () => { const S = Game.S; for (const k of ['o2', 'water', 'power', 'well']) S.r[k].v = S.r[k].max; S.sys.o2.conc = 21; };
  const f1 = await pg.evaluate(() => {
    const S = Game.S; S.r.food.v = 0; const out = { warns: [] };
    for (let i = 0; i < 40; i++) { for (const k of ['o2', 'water', 'power', 'well']) S.r[k].v = S.r[k].max; S.inc.length = 0; Sim.step(S, 1); out.warns.push(...Surv.warnings(S)); }
    out.h = Surv.hunger(S); Game._debug.surv.survFrame(0.05); out.filter = document.getElementById('game').style.filter; out.ended = !!S.ended; return out;
  });
  ok('Sin comida primero hay avisos y la visión se vuelve borrosa y oscura', f1.warns.includes('food.zero') && f1.warns.includes('food.late') && f1.h.blur > 0.5 && f1.h.dark > 0.1 && /blur/.test(f1.filter) && !f1.ended, JSON.stringify([f1.warns, f1.h, f1.filter]));
  await pg.evaluate(() => { const S = Game.S; for (let i = 0; i < 45 && !S.ended; i++) { for (const k of ['o2', 'water', 'power', 'well']) S.r[k].v = S.r[k].max; S.inc.length = 0; Sim.step(S, 1); } });
  g = await toPanel('food', shots && shots + '/go-food.png');
  ok('A las 72 h sin comida: desmayo y GAME OVER con la causa', g.kind === 'food' && /72 horas/.test(g.txt) && g.ended.kind === 'dead', g.txt.slice(0, 100));
  await retryOk('Hambre');
  const f2 = await pg.evaluate(() => { const S = Game.S; S.r.food.v = 0; for (let i = 0; i < 50; i++) { for (const k of ['o2', 'water', 'power', 'well']) S.r[k].v = S.r[k].max; S.inc.length = 0; Sim.step(S, 1); } S.r.food.v = 30; for (let i = 0; i < 60; i++) { for (const k of ['o2', 'water', 'power', 'well']) S.r[k].v = S.r[k].max; S.r.food.v = Math.max(S.r.food.v, 30); Sim.step(S, 1); } return { z: S.z.food, ended: !!S.ended }; });
  ok('Conseguir comida a tiempo reinicia la cuenta y no hay derrota', f2.z === 0 && !f2.ended, JSON.stringify(f2));

  /* ---- 4. Radiación: dosis al límite ---- */
  await fresh();
  const d1 = await pg.evaluate(() => { const S = Game.S; const w = []; S.st.maxDose = S.limit * 0.65; w.push(...Surv.warnings(S)); S.st.maxDose = S.limit * 0.9; w.push(...Surv.warnings(S)); return { w, ended: !!S.ended }; });
  ok('Antes del límite hay dos avisos de dosis (60 % y 85 %)', d1.w.includes('dose.hi') && d1.w.includes('dose.crit') && !d1.ended, JSON.stringify(d1));
  await pg.evaluate(() => { const S = Game.S; S.crew.forEach((c) => { c.dose = S.limit + 1; }); Sim.step(S, 0.1); });
  g = await toPanel('dose', shots && shots + '/go-dose.png');
  ok('Superar el límite: silueta esquelética holográfica y GAME OVER con la causa', g.kind === 'dose' && /radiaci/.test(g.txt) && g.ended.kind === 'dead', g.txt.slice(0, 100));
  await retryOk('Radiación');

  /* ---- 5. Núcleo energético ---- */
  await fresh();
  const n1 = await pg.evaluate(() => { const S = Game.S; S.sys.reactor.h = 10; S.sys.solar.h = 0; const w = []; for (let i = 0; i < 40 && !S.ended; i++) { S.r.power.v = 0; Sim.step(S, 1); w.push(...Surv.warnings(S)); } return { w, ended: S.ended, h: S.sys.reactor.h }; });
  ok('Núcleo averiado: avisos y, con el reactor fuera de servicio y sin reserva, derrota «core»', n1.w.includes('core.out') && n1.ended && n1.ended.reason === 'core' && n1.ended.kind === 'dead', JSON.stringify(n1));
  g = await toPanel('core', shots && shots + '/go-core.png');
  ok('Cinemática de la estación perdida y GAME OVER con la causa', g.kind === 'core' && /núcleo/i.test(g.txt) && g.retry, g.txt.slice(0, 100));
  await retryOk('Núcleo');
  const n2 = await pg.evaluate(() => { const S = Game.S; S.sys.reactor.h = 80; S.sys.solar.h = 0; for (let i = 0; i < 40 && !S.ended; i++) { S.r.power.v = 0; Sim.step(S, 1); } return S.ended ? S.ended.kind : null; });
  ok('Con el reactor sano nunca se declara la falla del núcleo', n2 !== 'dead', String(n2));

  /* ---- 6. Salir sin traje: aviso y decisión del jugador ---- */
  await fresh();
  await pg.evaluate(() => Game._debug.surv.noSuitPanel());
  ok('Antes de salir sin traje aparece un aviso con dos opciones', (await pg.locator('[data-act=nosuit-stay]').count()) === 1 && (await pg.locator('[data-act=nosuit-go]').count()) === 1);
  await pg.locator('[data-act=nosuit-stay]').click();
  ok('«Quedarme dentro» cierra el aviso sin salir', (await pg.locator('[data-act=nosuit-stay]').count()) === 0 && (await pg.evaluate(() => World.airlock().st)) === 'in');
  await sleep(pg, 3100);
  await pg.evaluate(() => Game._debug.surv.noSuitPanel()); await pg.locator('[data-act=nosuit-go]').click();
  ok('«Salir de todos modos» inicia el ciclo de la esclusa', (await pg.evaluate(() => World.airlock().st)) === 'cycle_out');

  /* ---- 7. Una partida normal no pierde por azar ---- */
  const sim = await pg.evaluate(() => { let bad = 0; for (let i = 0; i < 30; i++) { const X = Sim.create({ seed: 900 + i * 7, mode: 'adv', skipCamp: true }); for (let k = 0; k < 24 * 4 && !X.ended; k++) Sim.step(X, 1); if (X.ended && X.ended.kind === 'dead') bad++; } return bad; });
  ok('Las primeras 96 h de 30 partidas sin intervenir no acaban en derrota por sorpresa', sim === 0, String(sim));

  ok('Sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(pass + '/' + (pass + fail) + (fail ? ' FALLOS' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
