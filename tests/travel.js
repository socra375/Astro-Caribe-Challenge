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
/** Cuenta los píxeles claros de una zona del lienzo del viaje (comprueba que se dibuja el Sol, los planetas y las estrellas). */
const bright = (pg, x0, y0, x1, y1, th) => pg.evaluate(([a, b, c, d, t]) => { const cv = document.querySelector('#landw canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height, im = g.getImageData(Math.floor(a * W), Math.floor(b * H), Math.max(1, Math.floor((c - a) * W)), Math.max(1, Math.floor((d - b) * H))).data; let n = 0; for (let i = 0; i < im.length; i += 4) if (im[i] + im[i + 1] + im[i + 2] > t) n++; return n; }, [x0, y0, x1, y1, th || 480]);
async function landAfter(pg) { // del enlace con la llegada hasta empezar la campaña (zona 1)
  await pg.waitForSelector('.lbtn:not(.hidden)', { timeout: 30000 }); await pg.click('.lbtn');
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
    const L = Land.fresh(S); S.land = L; const wb = S.morale; const ap = Trip.applyToLand(S);
    const S2 = Sim.create({ scen: 'mars', diff: 'engineer', mode: 'junior', seed: 3 }); delete S2.trip; const leg = Trip.ensure(S2);
    return { r1, r2, r3, r4, r5, r6, r7, errs: t.errs, all: Trip.allOn(S), ap, tanks: L.parts.tanks, leg: { done: leg.done, legacy: leg.legacy }, wb, wa: S.morale, nav: [typeof Trip.devSize, typeof Trip.LS_EV, typeof Trip.bearing] };
  });
  ok('El orden de encendido se valida: comunicaciones antes de energía falla y lista lo que falta', pure.r1.ok === false && pure.r1.miss.includes('power') && pure.r1.miss.includes('nav'), JSON.stringify(pure.r1));
  ok('Seguridad no se activa antes que soporte vital y navegación; el orden correcto sí funciona', pure.r2.ok && pure.r3.ok === false && pure.r4.ok && pure.r5.ok && pure.r6.ok && pure.r7.ok && pure.all, JSON.stringify([pure.r3, pure.all]));
  ok('Los errores de encendido se cuentan pero no bloquean (2 errores, todo activado)', pure.errs === 2 && pure.all);
  ok('Partidas anteriores: viaje completado y neutral', pure.leg.done && pure.leg.legacy);
  ok('Sin minijuegos de navegación ni soporte vital: el motor ya no los expone y el viaje no deja consecuencias negativas (moral +4, tanque intacto)', pure.nav.every((x) => x === 'undefined') && pure.ap.nav === 'good' && pure.ap.ls === 'good' && pure.tanks === 'ok' && pure.wa === Math.min(100, pure.wb + 4), JSON.stringify([pure.nav, pure.ap, pure.tanks, pure.wb, pure.wa]));

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
  await pg.evaluate(() => Game._debug.land.speed(1));
  const c0 = await pg.evaluate(() => ({ ctl: document.querySelectorAll('.lpanel button, .lpanel input, .lcard button').length, voy: !!document.querySelector('[data-voyage]'), gauges: /O₂|CO₂|Soporte vital|Navegaci/.test(document.querySelector('.lpanel').innerText) ? 1 : 0, stage: Game.S.trip.stage, skip: getComputedStyle(document.getElementById('landSkip')).display }));
  ok('El crucero es una animación: no hay botones, controles, indicadores ni minijuegos', c0.ctl === 0 && c0.voy && c0.gauges === 0 && c0.stage === 'cruise', JSON.stringify(c0));
  ok('Primera vez: el crucero tampoco se puede omitir', c0.skip === 'none', c0.skip);
  await sleep(pg, 4000);
  const v1 = await pg.evaluate(() => ({ u: Game._debug.land.tr.u, seen: Game._debug.land.tr.seen.slice() }));
  ok('Se ven el Sol, los planetas cercanos (Mercurio, Venus, Júpiter y Marte), la Tierra y el destino (la Luna)', ['sun', 'mercury', 'venus', 'jupiter', 'mars', 'earth', 'moon'].every((k) => v1.seen.includes(k)), JSON.stringify(v1.seen));
  const px = { sun: await bright(pg, 0.0, 0.05, 0.25, 0.4, 600), stars: await bright(pg, 0.3, 0.05, 0.95, 0.95, 380), dest: await bright(pg, 0.6, 0.25, 1.0, 0.75, 300) };
  ok('El lienzo dibuja el Sol brillante, estrellas y el destino (no está en blanco)', px.sun > 800 && px.stars > 20 && px.dest > 200, JSON.stringify(px));
  if (shots) await pg.screenshot({ path: shots + '/travel_cruise.png' });
  const u1 = v1.u; await sleep(pg, 3000); const u2 = await pg.evaluate(() => Game._debug.land.tr.u);
  ok('El avance del viaje crece con el tiempo (la Tierra se aleja y el destino se acerca)', u2 > u1 + 0.05, u1 + ' → ' + u2);
  await pg.evaluate(() => Game._debug.land.speed(25)); await pg.waitForFunction(() => Game.S.trip.done === true, null, { timeout: 30000 });
  ok('Al terminar la animación el viaje se da por completado y empieza la llegada, sin pasar por resumen ni botones', await pg.evaluate(() => Game.S.trip.done && Game.S.trip.stage === 'done'));
  await landAfter(pg);
  const R1 = await pg.evaluate(() => { const S = Game.S, t = S.trip; return { done: t.done, q: t.q, well: S.morale, tanks: S.land.parts.tanks, lt: S.land.trip, running: Game._debug.running, t: S.t }; });
  ok('El viaje conecta con el aterrizaje existente y la campaña empieza después, sin consecuencias negativas', R1.done && R1.running && R1.t < 0.5 && R1.lt && R1.lt.ls === 'good' && R1.lt.nav === 'good' && R1.tanks === 'ok' && R1.well >= wellBefore, JSON.stringify([R1.lt, R1.tanks, R1.well, wellBefore]));
  await pg.evaluate(() => Game._debug.saveNow()); await pg.reload(); await sleep(pg, 500);
  for (const b of await pg.$$('.menu-grid .btn')) { if (/Continuar|Continue/.test(await b.textContent())) { await b.click(); break; } }
  await sleep(pg, 400);
  const ld = await pg.evaluate(() => ({ on: Game._debug.land.on, run: Game._debug.running, trip: Game.S.trip && { done: Game.S.trip.done, on: Object.keys(Game.S.trip.on).length, launched: Game.S.trip.launched } }));
  ok('Guardado: sistemas activados y lanzamiento se conservan y el viaje no se repite', !ld.on && ld.run && ld.trip.done && ld.trip.on === 5 && ld.trip.launched, JSON.stringify(ld));

  /* ---- Recorrido 2 · Ingeniero · Marte · ya visto: el lanzamiento y el crucero se pueden omitir ---- */
  await pg.evaluate(() => Game._debug.newRun('mars', 'x', { mode: 'adv' })); await pg.waitForFunction(() => Game._debug.land.on);
  for (const k of ['power', 'life', 'nav', 'comms', 'safety']) await act(pg, 'sys-' + k);
  await pg.evaluate(() => Game._debug.land.speed(2)); await pg.waitForSelector('[data-act=go]', { timeout: 30000 }); await act(pg, 'go'); await sleep(pg, 300);
  const sk = await pg.evaluate(() => getComputedStyle(document.getElementById('landSkip')).display);
  ok('Ya visto: el lanzamiento se puede omitir', sk !== 'none', sk);
  await pg.click('#landSkip'); await pg.waitForFunction(() => Game._debug.land.tr, null, { timeout: 30000 });
  await pg.evaluate(() => Game._debug.land.speed(1)); await sleep(pg, 3500);
  const m1 = await pg.evaluate(() => ({ seen: Game._debug.land.tr.seen.slice(), skip: getComputedStyle(document.getElementById('landSkip')).display, ctl: document.querySelectorAll('.lpanel button, .lpanel input').length }));
  ok('Marte: se ve el destino rojo junto al Sol, los planetas cercanos y la Tierra; sin controles', ['sun', 'venus', 'jupiter', 'mars', 'earth'].every((k) => m1.seen.includes(k)) && !m1.seen.includes('moon') && m1.ctl === 0, JSON.stringify(m1));
  ok('Ya visto: el crucero se puede omitir (acelerar)', m1.skip !== 'none', m1.skip);
  await pg.click('#landSkip'); await pg.waitForFunction(() => Game.S.trip.done === true, null, { timeout: 20000 });
  const R2 = await pg.evaluate(() => { const S = Game.S, t = S.trip; return { q: t.q, tanks: S.land.parts.tanks }; });
  ok('Omitir el crucero tampoco deja consecuencias negativas', R2.q.nav === 'good' && R2.q.ls === 'good' && R2.tanks === 'ok', JSON.stringify(R2));
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
