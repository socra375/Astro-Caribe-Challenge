// Pruebas del viaje espacial (Chromium + Playwright). Uso: node tests/travel.js [--shots dir]
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const newCtx = async (browser, vp, touch) => {
  const ctx = await browser.newContext({ viewport: vp || { width: 1280, height: 720 }, hasTouch: !!touch });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx.newPage(); const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(FILE); await pg.waitForTimeout(300);
  return { ctx, pg, errors };
};
const sleep = (pg, ms) => pg.waitForTimeout(ms);
const act = (pg, a) => pg.click('[data-act="' + a + '"]');
const msg = (pg) => pg.evaluate(() => { const m = document.querySelector('[data-msg]'); return m ? { k: m.getAttribute('data-msg'), t: m.textContent } : null; });
const waitTask = (pg, k, to) => pg.waitForFunction((q) => { const t = Game._debug.land.tr; return t && t.X.k === q; }, k, { timeout: to || 60000 });
/** Gira la nave con los botones hasta quedar dentro de la tolerancia y confirma. */
async function align(pg) {
  await pg.waitForFunction(() => { const n = Game._debug.land.tr.n; return Math.abs(Trip.angdiff(n.tgt, Game._debug.land.tr.n.tgtD)) < 0.6; });
  for (let i = 0; i < 80; i++) {
    const d = await pg.evaluate(() => { const n = Game._debug.land.tr.n; return Trip.angdiff(n.h, n.tgt); });
    if (Math.abs(d) <= 4) break;
    await act(pg, d > 0 ? 'rot-r' : 'rot-l');
  }
  await act(pg, 'nav-ok');
}
async function cabin(pg, o) {
  o = o || {};
  for (const k of ['power', 'life', 'nav', 'comms', 'safety']) await act(pg, 'sys-' + k);
  await pg.waitForSelector('[data-act=go]', { timeout: 30000 }); await act(pg, 'go');
}
/** Del crucero al resumen, resolviendo cada tarea con la interfaz. o.ignoreDevs: no corregir desviaciones. */
async function cruise(pg, o) {
  o = o || {};
  await waitTask(pg, 'align'); await align(pg);
  await waitTask(pg, 'comms'); await sleep(pg, 300);
  if (o.skipReport) await act(pg, 'skip-report'); else { await act(pg, 'report'); await pg.waitForSelector('[data-act=comms-ok]', { timeout: 30000 }); await act(pg, 'comms-ok'); }
  for (const dv of ['dev1', 'A', 'dev2', 'B', 'C', 'D']) {
    await waitTask(pg, dv);
    if (dv.startsWith('dev')) { if (!o.ignoreDevs) await align(pg); else await pg.waitForFunction((q) => Game._debug.land.tr.X.k !== q, dv, { timeout: 30000 }); }
    else if (dv === 'A') { const low = await pg.evaluate(() => (Game.S.seed >>> 2) % 3); await act(pg, 'sect-' + low); }
    else if (dv === 'B') { for (let i = 0; i < 3; i++) await act(pg, 'fstep-' + i); }
    else if (dv === 'C') { const vt = await pg.evaluate(() => 35 + ((Game.S.seed >>> 5) % 30)); await pg.evaluate((v) => { const i = document.querySelector('[data-act=valve]'); i.value = v; i.dispatchEvent(new Event('input')); }, vt); await act(pg, 'valve-ok'); }
    else await act(pg, 'ls-ok');
  }
  await pg.waitForSelector('[data-act=arrive]', { timeout: 20000 });
}
async function landAfter(pg) { // del enlace con la llegada hasta empezar la campaña (zona 1)
  await act(pg, 'arrive'); await pg.waitForSelector('.lbtn:not(.hidden)', { timeout: 30000 }); await pg.click('.lbtn');
  await pg.waitForSelector('.lpanel .choice'); await pg.click('.lpanel .choice:nth-of-type(1)'); await pg.click('.lpanel .btn.primary');
  await pg.waitForSelector('.lpanel .btn.primary:not([disabled])'); await sleep(pg, 400); await pg.click('.lpanel .btn.primary');
  await pg.waitForFunction(() => Game._debug.land.st === 'D' && document.querySelector('.lcen .btn.primary'), null, { timeout: 60000 }); await pg.click('.lcen .btn.primary');
  for (let i = 0; i < 60; i++) { const st = await pg.evaluate(() => ({ w: Game._debug.land.dd.wait, r: Game._debug.land.dd.ready })); if (st.r) break; if (st.w) await pg.locator('.lcen .btn').first().click(); await sleep(pg, 120); }
  await pg.click('.lcen .btn.primary'); await pg.waitForFunction(() => !Game._debug.land.on && Game._debug.running, null, { timeout: 8000 });
  await pg.evaluate(() => Game._debug.setSpeed(0));
}

(async () => {
  const browser = await chromium.launch();
  const A = await newCtx(browser); const pg = A.pg;

  /* ---- Motor puro ---- */
  const pure = await pg.evaluate(() => {
    const S = Sim.create({ scen: 'moon', diff: 'engineer', mode: 'junior', seed: 9 }); const t = Trip.fresh(S); S.trip = t;
    const r1 = Trip.press(S, 'comms'), r2 = Trip.press(S, 'power'), r3 = Trip.press(S, 'safety'), r4 = Trip.press(S, 'life'), r5 = Trip.press(S, 'nav'), r6 = Trip.press(S, 'comms'), r7 = Trip.press(S, 'safety');
    const L = Land.fresh(S); S.land = L; t.nav.auto = 1; const ap = Trip.applyToLand(S);
    const S2 = Sim.create({ scen: 'mars', diff: 'engineer', mode: 'junior', seed: 3 }); delete S2.trip; const leg = Trip.ensure(S2);
    return { r1, r2, r3, r4, r5, r6, r7, errs: t.errs, all: Trip.allOn(S), ap, tanks: L.parts.tanks, leg: { done: leg.done, legacy: leg.legacy }, d: [Trip.devSize(0, true, false), Trip.devSize(0, false, false), Trip.devSize(1, true, false), Trip.devSize(0, false, true)], bm: [Trip.bearing('moon'), Trip.bearing('mars')] };
  });
  ok('El orden de encendido se valida: comunicaciones antes de energía falla y lista lo que falta', pure.r1.ok === false && pure.r1.miss.includes('power') && pure.r1.miss.includes('nav'), JSON.stringify(pure.r1));
  ok('Seguridad no se activa antes que soporte vital y navegación; el orden correcto sí funciona', pure.r2.ok && pure.r3.ok === false && pure.r4.ok && pure.r5.ok && pure.r6.ok && pure.r7.ok && pure.all, JSON.stringify([pure.r3, pure.all]));
  ok('Los errores de encendido se cuentan pero no bloquean (2 errores, todo activado)', pure.errs === 2 && pure.all);
  ok('Una navegación con piloto automático deja el tanque en observación (consecuencia en la nave)', pure.ap.nav === 'poor' && pure.tanks === 'warn', JSON.stringify(pure.ap));
  ok('Partidas anteriores: viaje completado y neutral', pure.leg.done && pure.leg.legacy);
  ok('Control Tierra reduce las desviaciones (×0,7) y el modo Ingeniero las agranda', pure.d[0] === 11 && pure.d[1] === 16 && pure.d[2] === -15 && pure.d[3] === 18, JSON.stringify(pure.d));

  /* ---- Recorrido 1 · Junior · Luna · primera vez ---- */
  await pg.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'junior' }));
  await pg.waitForFunction(() => Game._debug.land.on);
  const wellBefore = await pg.evaluate(() => Game.S.morale);
  const cab = await pg.evaluate(() => { const ph = Game._debug.land.phase; return { who: document.querySelectorAll('[data-act^="who-"]').length, cmd: !!document.querySelector('[data-act="who-commander"].primary'), st: !!ph.st, sys: document.querySelectorAll('[data-act^="sys-"]').length, ms: Game._debug.land.drawMs(30), on: Game.S.trip.stage }; });
  ok('Cabina: los 5 tripulantes están en sus asientos y el comandante es el personaje por defecto', cab.who === 5 && cab.cmd && cab.sys === 5 && cab.on === 'cabin', JSON.stringify(cab));
  ok('Rendimiento: dibujar la cabina cuesta < 12 ms por cuadro', cab.ms < 12, cab.ms.toFixed(2));
  await act(pg, 'who-engineer'); await sleep(pg, 100);
  ok('Se puede cambiar de personaje voluntariamente y el comandante conserva el control de todo', await pg.evaluate(() => Game._debug.land.phase.st.who === 'engineer' && !!document.querySelector('[data-act="who-engineer"].primary')));
  await act(pg, 'who-commander');
  await act(pg, 'sys-comms'); await sleep(pg, 100);
  const bad = await msg(pg); const st1 = await pg.evaluate(() => ({ on: Object.keys(Game.S.trip.on).length, errs: Game.S.trip.errs, last: Voice.last && Voice.last.profileId }));
  ok('Encendido incorrecto: explica qué falta y no activa nada; se puede reintentar', bad && bad.k === 'warn' && /Energía principal/.test(bad.t) && st1.on === 0 && st1.errs === 1, JSON.stringify([bad, st1]));
  ok('La explicación se narra con la voz del ingeniero', st1.last === 'npc_engineer_es', st1.last);
  await act(pg, 'sys-power'); const g1 = await msg(pg);
  ok('Encendido correcto: respuesta visual (mensaje, luz) y explicación del sistema', g1 && g1.k === 'ok' && /energía principal alimenta/i.test(g1.t));
  await pg.evaluate(() => Game._debug.land.speed(25));
  for (const k of ['life', 'nav', 'comms', 'safety']) await act(pg, 'sys-' + k);
  await pg.waitForSelector('[data-act=go]', { timeout: 30000 });
  ok('Los cinco sistemas activados y la comprobación de seguridad completa', await pg.evaluate(() => Trip.allOn(Game.S) && document.querySelectorAll('li').length >= 4));
  if (shots) await pg.screenshot({ path: shots + '/travel_cabin.png' });
  await act(pg, 'go');
  const launchSkip = await pg.evaluate(() => getComputedStyle(document.getElementById('landSkip')).display);
  ok('Primera vez: el lanzamiento no se puede omitir', launchSkip === 'none', launchSkip);
  await pg.waitForFunction(() => Game._debug.land.tr, null, { timeout: 60000 });
  ok('La cuenta regresiva y el lanzamiento terminan y pasan al crucero', await pg.evaluate(() => Game.S.trip.launched === true && Game.S.trip.stage === 'cruise'));
  await pg.evaluate(() => Game._debug.land.speed(25));
  await waitTask(pg, 'align');
  const panelJ = await pg.evaluate(() => document.querySelector('.lpanel').innerText);
  ok('Junior muestra menos indicadores (sin CO₂, presión ni filtro)', !/CO₂/.test(panelJ) && /O₂/.test(panelJ), panelJ.slice(0, 80));
  await act(pg, 'nav-ok'); const wn = await msg(pg); const ne = await pg.evaluate(() => Game.S.trip.nav.errs);
  ok('Navegación: confirmar sin alinear explica hacia dónde girar y cuenta el error', wn && wn.k === 'warn' && /Gira a la (derecha|izquierda)/.test(wn.t) && ne === 1, JSON.stringify(wn));
  if (shots) await pg.screenshot({ path: shots + '/travel_nav.png' });
  await align(pg);
  ok('Navegación: al alinear a ±5° se confirma la orientación', await pg.evaluate(() => Game.S.trip.nav.aligned === true));
  await waitTask(pg, 'comms'); await pg.evaluate(() => Game._debug.land.speed(1)); await sleep(pg, 200);
  await act(pg, 'report'); const v1 = await pg.evaluate(() => Voice.last.profileId);
  ok('EarthLink en el viaje: el reporte se transmite con la voz del comandante', v1 === 'npc_commander_es', v1);
  await pg.waitForSelector('[data-act=comms-ok]', { timeout: 15000 }); const v2 = await pg.evaluate(() => ({ p: Voice.last.profileId, rep: Game.S.trip.rep, txt: document.querySelector('.lpanel').innerText }));
  ok('La respuesta de Control Tierra usa su perfil de voz y marca el estado como reportado', v2.p === 'npc_earth_control_es' && v2.rep === true && /Control Tierra/.test(v2.txt), JSON.stringify(v2.p));
  ok('Se muestra el retraso de comunicación del destino (Luna ≈ 1,3 s)', /1,3 s/.test(v2.txt));
  await act(pg, 'comms-ok'); await pg.evaluate(() => Game._debug.land.speed(25));
  await waitTask(pg, 'dev1');
  const dv = await pg.evaluate(() => new Promise((r) => setTimeout(() => { const n = Game._debug.land.tr.n; r({ d: Math.abs(Trip.angdiff(Trip.bearing('moon'), n.tgtD)), alerts: Game.S.trip.nav.devs }); }, 100)));
  ok('Desviación simulada: con reporte a Tierra es más pequeña (≈ 11°) y cuenta como evento', Math.abs(dv.d - 11) < 1 && dv.alerts === 1, JSON.stringify(dv));
  await act(pg, 'nav-ok'); const dm = await msg(pg);
  ok('Corrección: confirmar sin corregir no la acepta y explica el ajuste', dm && dm.k === 'warn');
  await align(pg);
  ok('Corrección confirmada: queda registrada', await pg.evaluate(() => Game.S.trip.nav.fixed === 1));
  await waitTask(pg, 'A');
  const lowA = await pg.evaluate(() => (Game.S.seed >>> 2) % 3), wrongs = [0, 1, 2].filter((i) => i !== lowA);
  await act(pg, 'sect-' + wrongs[0]); await act(pg, 'sect-' + wrongs[1]); await sleep(pg, 100);
  const hl = await pg.evaluate(() => ({ errs: Game.S.trip.ls.errs, helped: Game.S.trip.ls.helped }));
  ok('Evento A: dos errores seguidos activan la ayuda de la médica y no hay derrota', hl.errs === 2 && hl.helped === 1 && await pg.evaluate(() => Game._debug.land.on), JSON.stringify(hl));
  if (shots) await pg.screenshot({ path: shots + '/travel_lifesupport.png' });
  await act(pg, 'sect-' + lowA);
  await waitTask(pg, 'dev2'); await align(pg);
  await waitTask(pg, 'B'); await act(pg, 'fstep-1'); const wb = await msg(pg);
  ok('Evento B: un paso fuera de orden se explica (aislar → reserva → verificar)', wb && wb.k === 'warn' && /aísla el filtro/.test(wb.t));
  for (let i = 0; i < 3; i++) await act(pg, 'fstep-' + i);
  await waitTask(pg, 'C'); const vt = await pg.evaluate(() => 35 + ((Game.S.seed >>> 5) % 30));
  await pg.evaluate((v) => { const i = document.querySelector('[data-act=valve]'); i.value = v + 20; i.dispatchEvent(new Event('input')); }, vt); await act(pg, 'valve-ok'); const wc = await msg(pg);
  ok('Evento C: la válvula mal ajustada no se acepta y orienta el ajuste', wc && wc.k === 'warn' && /Mueve la válvula/.test(wc.t));
  await pg.evaluate((v) => { const i = document.querySelector('[data-act=valve]'); i.value = v; i.dispatchEvent(new Event('input')); }, vt); await act(pg, 'valve-ok');
  await waitTask(pg, 'D');
  ok('Evento D: sistema estabilizado y se explica que circulación, filtración y regulación trabajan juntas', await pg.evaluate(() => /trabajan juntas/.test(document.querySelector('.lpanel').innerText)));
  await act(pg, 'ls-ok'); await pg.waitForSelector('[data-act=arrive]');
  const sum = await pg.evaluate(() => document.querySelector('.lcen').innerText);
  ok('Resumen del viaje con navegación, soporte vital y comunicación', /Navegación/.test(sum) && /Soporte vital/.test(sum) && /reportada/.test(sum), sum.slice(0, 120));
  await landAfter(pg);
  const R1 = await pg.evaluate(() => { const S = Game.S, t = S.trip; return { done: t.done, stage: t.stage, q: t.q, errs: [t.nav.errs, t.ls.errs], well: S.morale, rep: t.rep, lt: S.land.trip, running: Game._debug.running, t: S.t }; });
  ok('El viaje conecta con el aterrizaje existente y la campaña empieza después', R1.done && R1.running && R1.t < 0.5 && R1.lt && R1.lt.ls === 'poor', JSON.stringify(R1.lt));
  ok('Consecuencias del viaje: 4 errores de soporte vital bajan la moral (−6) pero no bloquean; navegación con errores (aceptable) no gasta combustible', R1.q.nav === 'ok' && R1.q.ls === 'poor' && R1.well < wellBefore - 4, JSON.stringify([R1.q, R1.well, wellBefore]));
  await pg.evaluate(() => Game._debug.saveNow()); await pg.reload(); await sleep(pg, 500);
  for (const b of await pg.$$('.menu-grid .btn')) { if (/Continuar|Continue/.test(await b.textContent())) { await b.click(); break; } }
  await sleep(pg, 400);
  const ld = await pg.evaluate(() => ({ on: Game._debug.land.on, run: Game._debug.running, trip: Game.S.trip && { done: Game.S.trip.done, rep: Game.S.trip.rep, q: Game.S.trip.q, on: Object.keys(Game.S.trip.on).length, launched: Game.S.trip.launched } }));
  ok('Guardado: destino, sistemas activados, lanzamiento y calidad del viaje se conservan y no se repite', !ld.on && ld.run && ld.trip.done && ld.trip.rep && ld.trip.on === 5 && ld.trip.launched && ld.trip.q.nav === 'ok' && ld.trip.q.ls === 'poor', JSON.stringify(ld));

  /* ---- Recorrido 2 · Ingeniero · Marte · ya visto: se puede omitir; sin reportar ni corregir ---- */
  await pg.evaluate(() => Game._debug.newRun('mars', 'x', { mode: 'adv' })); await pg.waitForFunction(() => Game._debug.land.on);
  const well2 = await pg.evaluate(() => Game.S.morale), max2 = 100;
  for (const k of ['power', 'life', 'nav', 'comms', 'safety']) await act(pg, 'sys-' + k);
  await pg.evaluate(() => Game._debug.land.speed(2)); await pg.waitForSelector('[data-act=go]', { timeout: 30000 }); await act(pg, 'go'); await sleep(pg, 300);
  const sk = await pg.evaluate(() => getComputedStyle(document.getElementById('landSkip')).display);
  ok('Ya visto: el lanzamiento se puede omitir', sk !== 'none', sk);
  await pg.click('#landSkip'); await pg.waitForFunction(() => Game._debug.land.tr, null, { timeout: 30000 });
  await waitTask(pg, 'align');
  const panelA = await pg.evaluate(() => document.querySelector('.lpanel').innerText);
  ok('Ingeniero muestra indicadores adicionales (CO₂, presión, filtro) y valores numéricos', /CO₂/.test(panelA) && /kPa/.test(panelA) && /Filtro/.test(panelA), panelA.slice(0, 100));
  await align(pg); await waitTask(pg, 'comms'); await sleep(pg, 200); await act(pg, 'skip-report');
  await waitTask(pg, 'dev1'); const d2 = await pg.evaluate(() => new Promise((r) => setTimeout(() => r(Math.abs(Trip.angdiff(Trip.bearing('mars'), Game._debug.land.tr.n.tgtD))), 100)));
  ok('Sin reportar a Tierra, la desviación es mayor (Ingeniero: ≈ 18°)', Math.abs(d2 - 18) < 1.5, String(d2));
  await pg.evaluate(() => Game._debug.land.speed(25));
  for (const dvk of ['dev1', 'A', 'dev2', 'B', 'C', 'D']) {
    await waitTask(pg, dvk);
    if (dvk.startsWith('dev')) await pg.waitForFunction((q) => Game._debug.land.tr.X.k !== q, dvk, { timeout: 30000 });
    else if (dvk === 'A') { const low = await pg.evaluate(() => (Game.S.seed >>> 2) % 3); await act(pg, 'sect-' + low); }
    else if (dvk === 'B') { for (let i = 0; i < 3; i++) await act(pg, 'fstep-' + i); }
    else if (dvk === 'C') { const v = await pg.evaluate(() => 35 + ((Game.S.seed >>> 5) % 30)); await pg.evaluate((q) => { const i = document.querySelector('[data-act=valve]'); i.value = q; i.dispatchEvent(new Event('input')); }, v); await act(pg, 'valve-ok'); }
    else await act(pg, 'ls-ok');
  }
  await pg.waitForSelector('[data-act=arrive]');
  const sum2 = await pg.evaluate(() => document.querySelector('.lcen').innerText);
  ok('Ingeniero: el resumen incluye el registro de correcciones y errores', /Correcciones/.test(sum2) && /0\/2/.test(sum2), sum2.slice(0, 160));
  await act(pg, 'arrive'); await sleep(pg, 200);
  const R2 = await pg.evaluate(() => { const S = Game.S, t = S.trip; return { auto: t.nav.auto, q: t.q, tanks: S.land.parts.tanks, well: S.morale, lt: S.land.trip }; });
  ok('Sin corregir las desviaciones el piloto automático actúa: navegación «justa» → tanque en observación', R2.auto === 2 && R2.q.nav === 'poor' && R2.tanks === 'warn', JSON.stringify(R2));
  ok('Soporte vital sin errores mejora la moral de la tripulación (+4, con tope)', Math.abs(R2.well - Math.min(max2, well2 + 4)) < 1 && R2.q.ls === 'good', JSON.stringify([R2.well, well2]));
  ok('Sin errores de página (escritorio)', A.errors.length === 0, A.errors.join(' | '));
  await A.ctx.close();

  /* ---- Móvil: la cabina cabe ---- */
  const M = await newCtx(browser, { width: 390, height: 780 }, true);
  await M.pg.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'junior' })); await M.pg.waitForFunction(() => Game._debug.land.on); await sleep(M.pg, 300);
  const mob = await M.pg.evaluate(() => { const p = document.querySelector('.lpanel').getBoundingClientRect(); return { l: p.left, r: p.right, b: p.bottom, w: innerWidth, h: innerHeight, sx: document.documentElement.scrollWidth > innerWidth }; });
  ok('Móvil: el panel de encendido cabe y no hay desplazamiento horizontal', mob.l >= 0 && mob.r <= mob.w + 1 && mob.b <= mob.h + 1 && !mob.sx, JSON.stringify(mob));
  if (shots) await M.pg.screenshot({ path: shots + '/travel_mobile.png' });
  ok('Sin errores de página (móvil)', M.errors.length === 0, M.errors.join(' | '));
  await M.ctx.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 1200)); process.exit(2); });
