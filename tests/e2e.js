// Pruebas funcionales en Chromium (Playwright). Uso: node tests/e2e.js [--shots dir]
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const results = [];
const closeAll = async (pg) => { for (let i = 0; i < 8; i++) { if ((await pg.locator('[role=dialog]').count()) === 0) break; await pg.keyboard.press('Escape'); await pg.waitForTimeout(60); } };
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort())); // sin Internet
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(FILE);
  await page.waitForTimeout(400);
  ok('Menú principal visible', await page.locator('.title-big').isVisible());
  if (shots) await page.screenshot({ path: shots + '/01_menu.png' });
  await page.getByRole('button', { name: /Iniciar misión/ }).click();
  await page.getByRole('button', { name: /Marte/ }).click();
  await page.getByRole('button', { name: /Ingeniero/ }).click();
  await page.getByRole('button', { name: /Despegar/ }).click();
  await page.waitForTimeout(300);
  ok('Tutorial aparece', await page.getByText('Tutorial 1/5').isVisible());
  await page.getByRole('button', { name: 'Saltar' }).click();
  const scen = await page.evaluate(() => Game.S.scen + '/' + Game.S.diff);
  ok('Escenario y dificultad aplicados', scen === 'mars/engineer', scen);
  ok('HUD visible', await page.locator('#hud').isVisible());
  // Movimiento
  const p0 = await page.evaluate(() => [World.player.x, World.player.y]);
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(500); await page.keyboard.up('ArrowDown');
  const p1 = await page.evaluate(() => [World.player.x, World.player.y]);
  ok('Movimiento con flechas', p1[1] > p0[1] + 0.5, JSON.stringify([p0, p1]));
  // Colisión con pared: ir hacia arriba mucho tiempo no debe atravesar y < 2 (pared en y=1)
  await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w');
  const p2 = await page.evaluate(() => [World.player.x, World.player.y]);
  ok('Colisión con paredes/objetos', p2[1] >= 2.3, JSON.stringify(p2));
  // Puerta: teletransportar cerca de la puerta del puente y bajar
  await page.evaluate(() => { World.player.x = 30; World.player.y = 10.5; });
  await page.keyboard.down('s'); await page.waitForTimeout(1200); await page.keyboard.up('s');
  const p3 = await page.evaluate(() => [World.player.y, World.roomName(World.player.x, World.player.y), World._test.doors[0].open]);
  ok('Puerta automática se abre y deja pasar al pasillo', p3[0] > 13 && p3[1] === 'hall', JSON.stringify(p3));
  if (shots) await page.screenshot({ path: shots + '/02_game.png' });
  // Interacción: consola de mando
  await page.evaluate(() => { World.player.x = 25.5; World.player.y = 5.2; });
  await page.waitForTimeout(400);
  ok('Indicador de interacción', await page.locator('#prompt').isVisible(), await page.locator('#actBtn').textContent());
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  ok('Consola de mando abre', await page.getByRole('heading', { name: /Consola de mando/ }).isVisible());
  if (shots) await page.screenshot({ path: shots + '/03_missions.png' });
  // Iniciar misión 1
  await page.locator('.card', { hasText: 'Estabilizar el soporte vital' }).getByRole('button', { name: /Iniciar/ }).click();
  const m1 = await page.evaluate(() => Game.S.m[1].st);
  ok('Misión 1 iniciada', m1 === 'active', m1);
  ok('Simulación en pausa con panel abierto', await page.evaluate(async () => { const t = Game.S.t; await new Promise((r) => setTimeout(r, 400)); return Game.S.t === t; }));
  await closeAll(page);
  // Recursos avanzan
  const t0 = await page.evaluate(() => Game.S.t); await page.waitForTimeout(1000); const t1 = await page.evaluate(() => Game.S.t);
  ok('Tiempo simulado avanza', t1 > t0 + 0.2, (t1 - t0).toFixed(2));
  // Panel de consecuencias (agua)
  await page.evaluate(() => Game._debug.openConsole('water'));
  await page.getByRole('button', { name: /Modo máximo/ }).click();
  ok('Panel de consecuencias', await page.getByRole('heading', { name: /Panel de consecuencias/ }).isVisible());
  const hasDeltas = await page.locator('.delta-up, .delta-down').count();
  ok('Consecuencias muestran cambios en ≥2 variables', hasDeltas >= 2, String(hasDeltas));
  if (shots) await page.screenshot({ path: shots + '/04_consequences.png' });
  await page.getByRole('button', { name: /Confirmar/ }).click();
  ok('Decisión aplicada', await page.evaluate(() => Game.S.sys.rec.mode) === 'max');
  // Minijuego de cableado (reparación de incidente)
  await page.getByRole('button', { name: /Reparar/ }).first().click();
  await page.getByRole('button', { name: /Hacerlo de verdad/ }).click();
  await page.waitForTimeout(200);
  // resolver con teclado: emparejar símbolos leyendo el estado
  await page.evaluate(() => { const k = Object.keys(MG.defs); return k.length; }).then((k) => ok('6 minijuegos definidos', k === 6, String(k)));
  await page.waitForTimeout(500);
  // Resolver con el teclado: para cada conector izquierdo, buscar su pareja a la derecha
  const pairs = await page.evaluate(() => { const g = Game._debug.mg; return g.cols.map((_, i) => g.right.indexOf(i)); });
  for (let i = 0; i < pairs.length; i++) { await page.keyboard.press(String(i + 1)); await page.keyboard.press(String(pairs[i] + 1)); }
  await page.waitForTimeout(800);
  const mgRes = await page.locator('h2', { hasText: /Cableado eléctrico/ }).textContent().catch(() => '');
  ok('Minijuego termina con resultado', /Lo lograste|No salió/.test(mgRes), mgRes);
  if (shots) await page.screenshot({ path: shots + '/05_minigame_result.png' });
  const incProg = await page.evaluate(() => { const i = Game.S.inc.find((x) => x.type === 'water_fail'); return i ? [i.res, Math.round(i.prog)] : null; });
  ok('Minijuego modifica la simulación (incidente reparado)', incProg && (incProg[0] || incProg[1] > 0), JSON.stringify(incProg));
  await closeAll(page);
  // Comunicaciones con retraso
  await page.evaluate(() => Game._debug.openConsole('comms'));
  await page.getByRole('button', { name: /Pedir diagnóstico/ }).click();
  const q = await page.evaluate(() => [Game.S.cm.q.length, Sim.oneWay(Game.S)]);
  ok('Mensaje en tránsito con retraso (Marte)', q[0] === 1 && q[1] >= 4, JSON.stringify(q));
  if (shots) await page.screenshot({ path: shots + '/06_comms.png' });
  await page.getByRole('button', { name: /Esperar 6 h/ }).click(); await page.getByRole('button', { name: /Confirmar/ }).click();
  for (let k = 0; k < 8; k++) { await page.evaluate(() => Sim.step(Game.S, 6)); }
  const inbox = await page.evaluate(() => Game.S.cm.inbox.filter((m) => m.kind === 'status').length);
  ok('Respuesta de la Tierra recibida tras el retraso', inbox >= 1, String(inbox));
  await closeAll(page);
  // Evento con ¿Por qué ocurrió?
  await page.evaluate(() => { Sim.addInc(Game.S, 'dust_storm', {}); });
  await page.waitForTimeout(600);
  ok('Toast de evento', await page.locator('.toast').count() > 0);
  await page.evaluate(() => Game._debug.openConsole('cmd'));
  await page.getByRole('tab', { name: /Registro/ }).click();
  await page.getByRole('button', { name: /Por qué ocurrió/ }).first().click();
  ok('Panel ¿Por qué ocurrió? con 6 apartados', await page.getByText('6. Fuente y fecha').isVisible());
  if (shots) await page.screenshot({ path: shots + '/07_why.png' });
  await closeAll(page);
  // Guardado y recuperación
  await page.evaluate(() => { World.player.x = 30; World.player.y = 14.5; });
  await page.locator('#bMenu').click(); await page.getByRole('button', { name: /Guardar/ }).click();
  const tSaved = await page.evaluate(() => Game.S.t);
  await page.reload(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Continuar/ }).click();
  await page.waitForTimeout(200);
  const tLoaded = await page.evaluate(() => [Game.S.t, Game.S.scen, Game.S.m[1].st]);
  ok('Recuperación del progreso', Math.abs(tLoaded[0] - tSaved) < 1 && tLoaded[1] === 'mars', JSON.stringify(tLoaded));
  // Minijuego rover y efecto
  const before = await page.evaluate(() => Game.S.st.samplesTot);
  await page.evaluate(() => Sim.mini(Game.S, 'rover', { ok: true, score: 0.9, samples: 4, regolith: 6, damage: 0, batt: 50 }));
  ok('Rover suma muestras', await page.evaluate(() => Game.S.st.samplesTot) === before + 4);
  // Conexión con la Tierra ficha
  await page.evaluate(() => { Game.S.m[1].st = 'active'; Sim.finishMission(Game.S, 1, 3); });
  await page.waitForTimeout(1200);
  ok('Ficha Conexión con la Tierra tras misión', await page.getByText('B. Aplicación en República Dominicana').isVisible());
  if (shots) await page.screenshot({ path: shots + '/08_earth.png' });
  await page.getByRole('button', { name: /Porque traer agua/ }).click();
  ok('Pregunta de comprensión responde', await page.getByText('¡Correcto!').isVisible());
  await closeAll(page);
  // Idioma inglés
  await page.locator('#bMenu').click(); await page.getByRole('button', { name: /Configuración/ }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'English' }).click();
  ok('Cambio a inglés', await page.evaluate(() => LANG) === 'en' && (await page.locator('#m_o2 .lbl').textContent()).includes('Oxygen'));
  await closeAll(page);
  // Informe final
  await page.evaluate(() => { Sim.finishRun(Game.S); Game._debug.showReport(); });
  await page.waitForTimeout(300);
  ok('Informe final con 4 apartados', (await page.getByRole('heading', { name: /^[1-4]\./ }).count()) === 4);
  if (shots) await page.screenshot({ path: shots + '/09_report.png', fullPage: true });
  ok('Sin errores de consola/página', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ---- localStorage bloqueado + móvil ----
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await ctx2.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pm = await ctx2.newPage(); const err2 = [];
  pm.on('pageerror', (e) => err2.push(e.message));
  await pm.goto(FILE); await pm.waitForTimeout(300);
  ok('Con localStorage bloqueado avisa y funciona', await pm.getByText(/sesión temporal/).isVisible());
  await pm.getByRole('button', { name: /Iniciar misión/ }).click(); await pm.getByRole('button', { name: /Despegar/ }).click();
  await pm.getByRole('button', { name: 'Saltar' }).click();
  await pm.waitForTimeout(300);
  ok('Joystick táctil visible en móvil', await pm.locator('#joy').isVisible());
  const sw = await pm.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  ok('Sin scroll horizontal a 390 px', sw);
  const j = await pm.locator('#joy').boundingBox();
  const q0 = await pm.evaluate(() => World.player.x);
  await pm.mouse.move(j.x + j.width / 2, j.y + j.height / 2); await pm.mouse.down(); await pm.mouse.move(j.x + j.width - 5, j.y + j.height / 2, { steps: 4 }); await pm.waitForTimeout(600); await pm.mouse.up();
  const q1 = await pm.evaluate(() => World.player.x);
  ok('Joystick mueve al personaje', q1 > q0 + 0.3, q0.toFixed(2) + '→' + q1.toFixed(2));
  if (shots) await pm.screenshot({ path: shots + '/10_mobile.png' });
  ok('Móvil sin errores', err2.length === 0, err2.join(' | '));
  await ctx2.close();

  // ---- SelfTest en el navegador ----
  const ctx3 = await browser.newContext(); const px = await ctx3.newPage();
  await px.goto(FILE + '?selftest'); await px.waitForFunction(() => window.__selftest, null, { timeout: 60000 });
  const st = await px.evaluate(() => window.__selftest);
  ok('SelfTest (100 simulaciones) sin errores', st.runs === 100 && st.errors === 0, JSON.stringify({ runs: st.runs, errors: st.errors, smart: st.smartVictory + '/' + st.smartRuns }));
  await ctx3.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 600)); process.exit(2); });
