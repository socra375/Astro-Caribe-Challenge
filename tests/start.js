/* Pruebas del inicio: carga con inicialización real, edad por franjas, misiones, dificultades, resumen,
   transición, guardado de la configuración y compatibilidad con las mecánicas.
   Uso: NODE_PATH=$(npm root -g) node tests/start.js [carpeta-capturas] */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv[2];
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n + ' ' + (d || '')); } };
const sleep = (pg, ms) => pg.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (vw, vh, q, ctxOpts) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: vw, height: vh }, hasTouch: vw < 700, isMobile: vw < 700 }, ctxOpts || {}));
    await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
    const pg = await ctx.newPage(); pg.on('pageerror', (e) => errors.push(e.message));
    await pg.goto(FILE + (q || '')); return pg;
  };
  const toWizard = async (pg) => { await pg.getByRole('button', { name: /Iniciar misión/ }).click(); await pg.waitForSelector('.age-range'); };
  const next = (pg) => pg.locator('[data-act=wiz-next]').click();
  const play = async (pg) => { await pg.getByRole('button', { name: /Despegar/ }).click(); await pg.waitForSelector('#launchfx', { timeout: 2000 }).catch(() => {}); await pg.waitForSelector('#landw:not(.hidden)', { timeout: 10000 }); };
  const game = (pg) => pg.evaluate(() => ({ scen: Game.S.scen, focus: Game.S.focus, diff: Game.S.diff, mode: Game.S.mode, age: Game.S.age, hints: Store.get('settings', {}).hints, scale: Store.get('settings', {}).ageScale, more: Store.get('settings', {}).moreOpen, limit: Game.S.limit, food: Game.S.r.food.v / Game.S.r.food.max, mat: Game.S.r.mat.v }));

  /* ---- 1. Carga: inicialización real ---- */
  let pg = await open(1280, 800, '?load');
  await pg.waitForSelector('[data-boot]');
  const samples = await pg.evaluate(() => new Promise((res) => { const out = []; const t0 = performance.now(); const it = setInterval(() => { const sh = document.querySelector('.ld-ship'), p = document.querySelector('.ld-pct'); if (sh && p) out.push([parseInt(p.textContent), parseFloat(sh.style.left) || 0, document.querySelector('.ld-msg').textContent]); if (!document.querySelector('[data-boot]') || performance.now() - t0 > 15000) { clearInterval(it); res(out); } }, 25); }));
  const pcts = samples.map((s) => s[0]);
  ok('El porcentaje solo sube y llega a 100', pcts.length > 3 && pcts.every((v, i) => i === 0 || v >= pcts[i - 1]) && Math.max(...pcts) === 100, pcts.join(','));
  ok('La nave está en la posición del porcentaje (la posición corresponde al avance)', samples.every((s) => Math.abs(s[1] - s[0]) <= 1.5 || s[1] > 100), JSON.stringify(samples.slice(0, 3)));
  const msgs = [...new Set(samples.map((s) => s[2]))].join('|');
  await pg.waitForSelector('.menu-grid', { timeout: 8000 });
  const bl = await pg.evaluate(() => ({ log: Game._debug.start.bootLog, floors: World.floors }));
  const names = bl.log.map((t) => t.task).join('|');
  ok('Se muestran los mensajes de inicialización (varios se ven durante la carga)', /Inicializando sistemas/.test(names) && /Preparando tripulación/.test(names) && /Comprobando recursos/.test(names) && /Calculando trayectoria/.test(names) && /Sistemas listos/.test(names) && msgs.split('|').length >= 2, names + ' // ' + msgs);
  ok('La carga ejecuta tareas reales (ajustes y logotipo, 20 sprites, 2 escenarios del motor, 3 pisos) y todas terminan', bl.log.length === 5 && /20 sprites/.test(bl.log[1].info) && /2 escenarios/.test(bl.log[2].info) && /3 pisos/.test(bl.log[3].info) && bl.log.every((t) => !/error/.test(t.info)) && bl.log[3].ms > 50, JSON.stringify(bl.log));
  ok('Al terminar, la nave acelera y se pasa al menú principal con el nombre del juego', (await pg.getByRole('button', { name: /Iniciar misión/ }).count()) === 1 && (await pg.locator('.logo-img').count()) === 1);
  if (shots) await pg.screenshot({ path: shots + '/menu.png' });

  /* ---- 2. Edad: las 13 edades y las 5 franjas ---- */
  await toWizard(pg);
  const bands = []; const exs = new Set(); let allOk = true;
  for (let a = 5; a <= 17; a++) {
    await pg.locator('.age-range').fill(String(a)); const r = await pg.evaluate(() => ({ n: document.querySelector('.age-num').textContent, chip: document.querySelector('.age-chip').textContent, ex: document.querySelector('.age-ex').textContent }));
    bands.push(r.chip); exs.add(r.ex); if (r.n !== (a === 17 ? '17+' : String(a))) allOk = false;
  }
  ok('Se pueden elegir todas las edades de 5 a 17+ (el 17 se muestra como 17+)', allOk);
  ok('Hay cinco franjas: 5-7, 8-10, 11-13, 14-16 y 17+', new Set(bands).size === 5 && bands[0] === bands[2] && bands[3] === bands[5] && bands[6] === bands[8] && bands[9] === bands[11] && bands[12] !== bands[11], bands.join('|'));
  ok('El lenguaje de un aviso del juego cambia en cada franja (5 textos distintos)', exs.size === 5, [...exs].join(' // '));
  await pg.locator('.age-range').fill('5'); await pg.locator('[data-age-step="-1"]').click();
  ok('No baja de 5 con el botón −', (await pg.locator('.age-num').innerText()) === '5');
  await pg.locator('[data-age-step="1"]').click(); await pg.locator('.age-range').press('ArrowRight');
  ok('El botón + y el teclado suben la edad', (await pg.locator('.age-num').innerText()) === '7');
  await pg.locator('.age-range').fill('17'); await pg.locator('[data-age-step="1"]').click();
  ok('No pasa de 17+', (await pg.locator('.age-num').innerText()) === '17+');
  ok('Al cambiar de edad el número hace una animación suave', await pg.evaluate(() => document.querySelector('.age-num').classList.contains('pop')));
  if (shots) { await pg.locator('.age-range').fill('12'); await sleep(pg, 500); await pg.screenshot({ path: shots + '/age.png' }); }

  /* ---- 3. Misiones ---- */
  await pg.locator('.age-range').fill('9'); await next(pg); await sleep(pg, 300);
  const cards = await pg.evaluate(() => [...document.querySelectorAll('.mcard')].map((c) => ({ id: c.dataset.mission, art: !!c.querySelector('.mc-art svg'), name: c.querySelector('.mc-head b').textContent, desc: c.querySelector('p').textContent.length, obj: c.querySelectorAll('.mc-obj li').length, rec: !!c.querySelector('.chip-rec'), tag: c.querySelector('.dtag').textContent, dest: c.querySelectorAll('[data-dest]').length })));
  ok('Cuatro tarjetas ilustradas con nombre, descripción, objetivos, dificultad recomendada y disponibilidad', cards.length === 4 && cards.every((c) => c.art && c.name && c.desc > 10 && c.obj >= 4 && c.rec && c.tag), JSON.stringify(cards));
  ok('Lunar y Marte están disponibles; Estación e Investigación se identifican como experimentales', cards[0].tag === 'Disponible' && cards[1].tag === 'Disponible' && cards[2].tag === 'Experimental' && cards[3].tag === 'Experimental');
  ok('Solo Estación e Investigación piden destino (Luna o Marte)', cards[0].dest === 0 && cards[1].dest === 0 && cards[2].dest === 2 && cards[3].dest === 2);
  if (shots) await pg.screenshot({ path: shots + '/mission.png' });

  /* ---- 4. Dificultad ---- */
  await pg.locator('[data-mission=mars]').click(); await next(pg); await sleep(pg, 300);
  const dl = await pg.evaluate(() => [...document.querySelectorAll('.dcard')].map((c) => ({ id: c.dataset.level, name: c.querySelector('b').textContent, par: [...c.querySelectorAll('.lv-par li b')].map((x) => x.textContent), rec: !!c.querySelector('.chip-rec') })));
  ok('Tres dificultades con sus parámetros reales (recursos, eventos, reparación, radiación, refugio)', dl.length === 3 && dl.map((x) => x.name).join('|') === 'Explorador|Cadete|Comandante' && dl.every((x) => x.par.length === 5) && dl[0].par[0] === '90 %' && dl[2].par[0] === '62 %', JSON.stringify(dl));
  ok('Se marca la recomendada para la misión elegida (Marte → Cadete)', dl[1].rec && !dl[0].rec && !dl[2].rec);
  if (shots) await pg.screenshot({ path: shots + '/level.png' });

  /* ---- 5. Resumen, volver y confirmar ---- */
  await pg.locator('[data-level=engineer]').click(); await next(pg); await sleep(pg, 300);
  const sm = await pg.evaluate(() => [...document.querySelectorAll('.sum-tile')].map((t) => t.innerText.replace(/\s+/g, ' ')));
  ok('El resumen muestra edad, destino, misión y dificultad', sm.length === 4 && /9 años/.test(sm[0]) && /Marte/.test(sm[1]) && /Exploración de Marte/.test(sm[2]) && /Cadete/.test(sm[3]), JSON.stringify(sm));
  await pg.locator('[data-edit=age]').click(); await sleep(pg, 200);
  ok('«Cambiar» vuelve al paso para modificar la opción', (await pg.locator('.age-range').count()) === 1 && (await pg.locator('.age-num').innerText()) === '9');
  await pg.locator('[data-step="3"]').click().catch(() => {}); await next(pg); await next(pg); await next(pg); await sleep(pg, 200);
  await pg.getByRole('button', { name: /Volver|Atrás/ }).click(); await sleep(pg, 200);
  ok('«Volver» regresa al paso anterior conservando lo elegido', (await pg.locator('.dcard[aria-pressed=true]').getAttribute('data-level')) === 'engineer');
  await next(pg); if (shots) { await sleep(pg, 400); await pg.screenshot({ path: shots + '/summary.png' }); }
  await pg.getByRole('button', { name: /Despegar/ }).click(); await sleep(pg, 400);
  ok('Al confirmar hay una transición cinematográfica antes de empezar', (await pg.locator('#launchfx').count()) === 1);
  if (shots) await pg.screenshot({ path: shots + '/launch.png' });
  await pg.waitForSelector('#landw:not(.hidden)', { timeout: 10000 });
  let g = await game(pg);
  ok('Marte + Cadete + 9 años: escenario real de Marte, dificultad normal y modalidad Junior con pistas', g.scen === 'mars' && g.focus === 'mars' && g.diff === 'engineer' && g.mode === 'junior' && g.age === 9 && g.hints === true && Math.abs(g.food - 0.75) < 0.03 && g.limit === 80 && g.scale === 1.1, JSON.stringify(g));
  await pg.context().close();

  /* ---- 6. Cada misión y destino inicia una partida real ---- */
  const cases = [['moon', null, 'moon', 'explorer'], ['station', 'mars', 'mars', 'commander'], ['station', 'moon', 'moon', 'explorer'], ['science', 'mars', 'mars', 'engineer'], ['science', 'moon', 'moon', 'commander']];
  for (const [mi, dest, scen, lv] of cases) {
    pg = await open(1280, 800, '?noload'); await toWizard(pg); await pg.locator('.age-range').fill('15'); await next(pg);
    await pg.locator('[data-mission=' + mi + ']').click(); if (dest) await pg.locator('[data-mission=' + mi + '] [data-dest=' + dest + ']').click();
    await next(pg); await pg.locator('[data-level=' + lv + ']').click(); await next(pg); await play(pg);
    g = await game(pg);
    ok('Misión «' + mi + '»' + (dest ? ' en ' + dest : '') + ' con ' + lv + ': escenario ' + scen + ', enfoque y dificultad reales', g.scen === scen && g.focus === mi && g.diff === lv && g.mode === 'adv' && g.age === 15, JSON.stringify(g));
    if (mi === 'station') ok('Estación: empiezas con +20 de materiales', await pg.evaluate(() => Game.S.r.mat.v > 20) && g.mat >= 20, String(g.mat));
    await pg.context().close();
  }

  /* ---- 7. Dificultad independiente de la edad y con efectos reales ---- */
  const combos = [[6, 'commander'], [6, 'explorer'], [17, 'explorer'], [17, 'commander'], [12, 'engineer'], [15, 'engineer']]; const res = {};
  for (const [age, lv] of combos) {
    pg = await open(1280, 800, '?noload'); await toWizard(pg); await pg.locator('.age-range').fill(String(age)); await next(pg); await next(pg); await pg.locator('[data-level=' + lv + ']').click(); await next(pg); await play(pg);
    res[age + lv] = await game(pg); await pg.context().close();
  }
  ok('Edad 6 + Comandante: lenguaje sencillo, letra grande, sin pistas y dificultad máxima (recursos 62 %, límite 60 mSv)', res['6commander'].mode === 'junior' && res['6commander'].hints === false && res['6commander'].scale === 1.2 && Math.abs(res['6commander'].food - 0.62) < 0.03 && res['6commander'].limit === 60, JSON.stringify(res['6commander']));
  ok('Edad 6 + Explorador: mismas ayudas pero recursos 90 % y límite 120 mSv', res['6explorer'].mode === 'junior' && res['6explorer'].hints === true && Math.abs(res['6explorer'].food - 0.9) < 0.03 && res['6explorer'].limit === 120);
  ok('Edad 17+ + Explorador: lenguaje técnico con pistas; 17+ + Comandante: técnico sin pistas', res['17explorer'].mode === 'adv' && res['17explorer'].hints === true && res['17commander'].mode === 'adv' && res['17commander'].hints === false && res['17explorer'].diff === 'explorer' && res['17commander'].diff === 'commander');
  ok('Cadete: pistas hasta los 13 años y no desde los 14 (ayudas limitadas)', res['12engineer'].hints === true && res['15engineer'].hints === false);
  ok('Ampliaciones abiertas en 11-13 y 17+, cerradas en el resto', res['12engineer'].more === true && res['17explorer'].more === true && res['6explorer'].more === false && res['15engineer'].more === false);

  /* ---- 8. Las franjas y las dificultades se aplican dentro del juego ---- */
  pg = await open(1280, 800, '?noload'); await sleep(pg, 200);
  const mech = await pg.evaluate(async () => {
    const out = {}; Game._debug.newRun('moon', 'explorer', { skipCamp: true, mode: 'junior', indep: true, age: 12, focus: 'moon' }); await new Promise((r) => setTimeout(r, 300));
    out.scale = getComputedStyle(document.documentElement).getPropertyValue('--scale').trim(); out.junior = document.querySelectorAll('#meters .meter:not(.hidden)').length;
    const d = document.createElement('details'); d.className = 'more'; document.getElementById('layer').append(d); await new Promise((r) => setTimeout(r, 50)); out.open12 = d.open; d.remove();
    Game._debug.newRun('moon', 'explorer', { skipCamp: true, mode: 'adv', indep: true, age: 14, focus: 'moon' }); await new Promise((r) => setTimeout(r, 300));
    out.adv = document.querySelectorAll('#meters .meter:not(.hidden)').length; const d2 = document.createElement('details'); d2.className = 'more'; document.getElementById('layer').append(d2); await new Promise((r) => setTimeout(r, 50)); out.open14 = d2.open; d2.remove();
    Game._debug.newRun('moon', 'explorer', { skipCamp: true, mode: 'junior', indep: true, age: 6, focus: 'moon' }); await new Promise((r) => setTimeout(r, 200)); out.scale6 = getComputedStyle(document.documentElement).getPropertyValue('--scale').trim();
    return out;
  });
  ok('La franja 11-13 abre las ampliaciones («Más información») y la 14-16 no', mech.open12 === true && mech.open14 === false, JSON.stringify(mech));
  ok('La interfaz de 5-7 años es más grande (×1,2) y la de 11-13 normal', mech.scale6 === '1.2' && mech.scale === '1', JSON.stringify(mech));
  ok('Junior usa indicadores sencillos y Avanzado indicadores detallados', mech.junior === 4 && mech.adv === 5, JSON.stringify(mech));
  const vic = await pg.evaluate(() => {
    const mk = (focus) => { const X = Sim.create({ seed: 5, mode: 'adv', skipCamp: true, noEv: true, focus }); X.camp.basicDone = true; return X; };
    const done = (X, ids) => { for (const i of ids) X.m[i].st = 'done'; };
    const A = mk('station'); done(A, [1, 2, 3, 5, 6]); Sim.step(A, 0.2);
    const B = mk('moon'); done(B, [1, 2, 3, 5, 6]); Sim.step(B, 0.2);
    const C = mk('science'); done(C, [3, 4, 7]); Sim.step(C, 0.2); const sciNo = !C.ended;
    const D = mk('science'); done(D, [3, 4, 7]); D.science = 8; Sim.step(D, 0.2);
    const E = mk('moon'); done(E, [1, 2, 3, 4, 5, 6, 7]); Sim.step(E, 0.2);
    return { station: A.ended && A.ended.kind, moonPartial: !B.ended, sciNo, sci: D.ended && D.ended.kind, moon: E.ended && E.ended.kind };
  });
  ok('Estación gana con sus 5 misiones; Lunar exige las 7', vic.station === 'victory' && vic.moonPartial && vic.moon === 'victory', JSON.stringify(vic));
  ok('Investigación exige además 8 puntos de ciencia (análisis o experimentos)', vic.sciNo && vic.sci === 'victory', JSON.stringify(vic));
  await pg.context().close();

  /* ---- 9. Guardado y recuperación de la configuración ---- */
  pg = await open(1280, 800, '?noload'); await toWizard(pg); await pg.locator('.age-range').fill('13'); await next(pg);
  await pg.locator('[data-mission=science]').click(); await pg.locator('[data-mission=science] [data-dest=mars]').click(); await next(pg); await pg.locator('[data-level=commander]').click();
  await pg.reload(); await sleep(pg, 400); await toWizard(pg);
  const saved = await pg.evaluate(() => ({ age: document.querySelector('.age-num').textContent, band: document.querySelector('.age-chip').textContent }));
  await next(pg); await sleep(pg, 200);
  const savedM = await pg.evaluate(() => ({ mi: document.querySelector('.mcard[aria-pressed=true]').dataset.mission, dest: document.querySelector('[data-mission=science] [data-dest][aria-pressed=true]').dataset.dest }));
  await next(pg); await sleep(pg, 200); const savedL = await pg.locator('.dcard[aria-pressed=true]').getAttribute('data-level');
  ok('Tras recargar la página se recuperan edad, misión, destino y dificultad', saved.age === '13' && savedM.mi === 'science' && savedM.dest === 'mars' && savedL === 'commander', JSON.stringify([saved, savedM, savedL]));
  await pg.context().close();

  /* ---- 10. Móvil: cada paso cabe y los botones son grandes ---- */
  pg = await open(390, 800, '?load'); await pg.waitForSelector('[data-boot]');
  ok('Móvil: la carga cabe en la pantalla', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await pg.waitForSelector('.menu-grid', { timeout: 10000 }); await toWizard(pg);
  const fit = () => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('.wiz button')].every((b) => b.getBoundingClientRect().height >= 34));
  const ms = [await fit()]; await next(pg); await sleep(pg, 300); ms.push(await fit()); await next(pg); await sleep(pg, 300); ms.push(await fit()); await next(pg); await sleep(pg, 300); ms.push(await fit());
  ok('Móvil: edad, misión, dificultad y resumen caben sin desplazamiento horizontal', ms.every(Boolean), ms.join(','));
  if (shots) await pg.screenshot({ path: shots + '/summary-mobile.png' });
  await pg.context().close();

  ok('Sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(pass + '/' + (pass + fail) + (fail ? ' FALLOS' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
