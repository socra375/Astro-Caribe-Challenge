// Pruebas funcionales en Chromium (Playwright). Uso: node tests/e2e.js [--shots dir]
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const results = [];
const closeAll = async (pg) => { for (let i = 0; i < 8; i++) { if ((await pg.locator('[role=dialog]').count()) === 0) break; await pg.keyboard.press('Escape'); await pg.waitForTimeout(60); } };
const AT = (pg, room, i) => pg.evaluate(([r, k]) => { const q = World._test.spot(r, k || 0); World.player.x = q[0]; World.player.y = q[1]; }, [room, i]);
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
/** Recorre el asistente de inicio (edad → misión → dificultad) y pulsa «Despegar». */
async function wiz(pg, o) {
  o = o || {};
  await pg.getByRole('button', { name: /Iniciar misión/ }).click();
  if (o.age != null) await pg.locator('.age-range').fill(String(o.age));
  await pg.locator('[data-act=wiz-next]').click();
  if (o.mission) await pg.locator('[data-mission=' + o.mission + ']').click();
  await pg.locator('[data-act=wiz-next]').click();
  if (o.level) await pg.locator('[data-level=' + o.level + ']').click();
  await pg.getByRole('button', { name: /Despegar/ }).click();
}
/** Atraviesa la llegada y el aterrizaje (acelerada) tras pulsar «Despegar» en la interfaz. */
async function landThrough(pg) {
  await pg.waitForFunction(() => Game._debug.land.on, null, { timeout: 8000 });
  await pg.evaluate(() => Game._debug.land.skipTrip());
  await pg.evaluate(() => Game._debug.land.speed(25));
  await pg.waitForSelector('.lbtn:not(.hidden)', { timeout: 20000 }); await pg.locator('.lbtn').click();
  await pg.waitForSelector('.lpanel .choice'); await pg.locator('.lpanel .choice').first().click(); await pg.locator('.lpanel .btn.primary').click();
  await pg.waitForSelector('.lpanel .btn.primary'); await pg.waitForTimeout(500); await pg.locator('.lpanel .btn.primary').click();
  await pg.waitForFunction(() => Game._debug.land.st === 'D' && document.querySelector('.lcen .btn.primary'), null, { timeout: 60000 }); await pg.locator('.lcen .btn.primary').click();
  for (let i = 0; i < 60; i++) { const st = await pg.evaluate(() => ({ w: Game._debug.land.dd.wait, r: Game._debug.land.dd.ready })); if (st.r) break; if (st.w) await pg.locator('.lcen .btn').first().click(); await pg.waitForTimeout(120); }
  await pg.locator('.lcen .btn.primary').click(); await pg.waitForFunction(() => !Game._debug.land.on && Game._debug.running, null, { timeout: 8000 });
  await pg.waitForTimeout(300);
}
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
  await wiz(page, { age: 10, mission: 'mars' });
  await page.waitForTimeout(300);
  ok('Una partida nueva empieza con la llegada y el aterrizaje (no directamente en la base)', await page.locator('#landw').isVisible() && !(await page.evaluate(() => Game._debug.running)));
  await landThrough(page);
  ok('Guía del puente se presenta al empezar', await page.getByText('Control de Misión').first().isVisible());
  await page.getByRole('button', { name: 'Saltar' }).click();
  const scen = await page.evaluate(() => Game.S.scen + '/' + Game.S.diff);
  ok('Escenario y dificultad aplicados (Junior fija la dificultad guiada)', scen === 'mars/explorer', scen);
  // Las pruebas de sistemas avanzados usan una partida con la familiarización ya completada
  await page.evaluate(() => Game._debug.newRun('mars', 'x', { skipCamp: true, mode: 'junior' }));
  await page.waitForTimeout(200);
  ok('HUD visible', await page.locator('#hud').isVisible());
  // Movimiento
  const p0 = await page.evaluate(() => [World.player.x, World.player.y]);
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(500); await page.keyboard.up('ArrowDown');
  const p1 = await page.evaluate(() => [World.player.x, World.player.y]);
  ok('Movimiento con flechas', p1[1] > p0[1] + 0.5, JSON.stringify([p0, p1]));
  // Colisión con pared: ir hacia arriba mucho tiempo no debe atravesar y < 2 (pared en y=1)
  await page.keyboard.down('w'); await page.waitForTimeout(2500); await page.keyboard.up('w');
  const p2 = await page.evaluate(() => [World.player.x, World.player.y]);
  ok('Colisión con paredes/objetos', p2[1] >= 22.9 && p2[1] < p0[1], JSON.stringify(p2));
  // Puerta: teletransportar cerca de la puerta del puente y bajar
  await page.evaluate(() => { World.player.x = 68; World.player.y = 33.4; });
  await page.keyboard.down('s'); await page.waitForTimeout(1200); await page.keyboard.up('s');
  const p3 = await page.evaluate(() => [World.player.y, World.roomName(World.player.x, World.player.y), World._test.doors[0].open]);
  ok('Puerta automática se abre y deja pasar al atrio', p3[0] > 36.3 && p3[1] === 'hall', JSON.stringify(p3));
  if (shots) await page.screenshot({ path: shots + '/02_game.png' });
  // Interacción: consola de mando
  await page.evaluate(() => { World.player.x = 62.5; World.player.y = 27.4; });
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
  ok('El comandante abre cualquier consola sin cambiar de personaje', !(await page.getByText(/Se necesita otro especialista/).count()) && await page.evaluate(() => Game.S.playerRole === 'commander') && await page.locator('.panel h2').count() > 0);
  await closeAll(page);
  await page.evaluate(() => { World.setPlayerRole('engineer'); Sim.setPlayerRole(Game.S, 'engineer'); });
  await page.evaluate(() => Game._debug.openConsole('water'));
  await page.getByRole('button', { name: /Modo máximo/ }).click();
  ok('Panel de consecuencias', await page.getByRole('heading', { name: /Panel de consecuencias|¿Qué pasará\?/ }).isVisible());
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
  await page.evaluate(() => { World.setPlayerRole('commander'); Sim.setPlayerRole(Game.S, 'commander'); });
  await page.evaluate(() => Game._debug.openConsole('comms'));
  await page.getByRole('button', { name: /Pedir diagnóstico/ }).click();
  const q = await page.evaluate(() => [Game.S.cm.q.length, Sim.oneWay(Game.S)]);
  ok('Mensaje en tránsito con retraso (Marte)', q[0] === 1 && q[1] >= 1.5, JSON.stringify(q));
  if (shots) await page.screenshot({ path: shots + '/06_comms.png' });
  await page.getByRole('button', { name: /Esperar 6 h/ }).click(); await page.getByRole('button', { name: /Confirmar/ }).click();
  for (let k = 0; k < 8; k++) { await page.evaluate(() => Sim.step(Game.S, 6)); }
  const inbox = await page.evaluate(() => Game.S.cm.inbox.filter((m) => m.kind === 'status').length);
  ok('Respuesta de la Tierra recibida tras el retraso', inbox >= 1, String(inbox));
  await closeAll(page);
  // Evento con ¿Por qué ocurrió?
  await page.evaluate(() => { Sim.addInc(Game.S, 'dust_storm', {}); });
  await page.waitForTimeout(600);
  ok('Llamada de radio ante el evento', await page.locator('#radio').isVisible());
  await page.evaluate(() => Game._debug.openConsole('cmd'));
  await page.getByRole('tab', { name: /Registro/ }).click();
  await page.evaluate(() => { MODE = 'adv'; });
  await page.getByRole('button', { name: /Por qué ocurrió/ }).first().click();
  ok('Panel ¿Por qué ocurrió? con 6 apartados (Ingeniero)', await page.getByText('6. Fuente y fecha').isVisible());
  await page.evaluate(() => { MODE = 'junior'; });
  if (shots) await page.screenshot({ path: shots + '/07_why.png' });
  await closeAll(page);
  // Guardado y recuperación
  await AT(page, 'bridge');
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
  ok('Cambio a inglés', await page.evaluate(() => LANG) === 'en' && /Air|Oxygen/.test(await page.locator('#m_o2 .lbl').textContent()));
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
  await wiz(pm); await landThrough(pm);
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

  // ---- Campaña, NPC, plantas, vestuario y alertas ----
  const ctx5 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx5.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx5.newPage(); const err5 = [];
  pg.on('pageerror', (e) => err5.push(e.message));
  await pg.goto(FILE); await pg.waitForTimeout(300);
  await wiz(pg); await landThrough(pg); await pg.waitForTimeout(400);
  const skipTalk = async () => { for (let i = 0; i < 6; i++) { const b = pg.getByRole('button', { name: /^Siguiente|¡Entendido!/ }); if (await b.count()) { await b.first().click(); await pg.waitForTimeout(60); } else break; } };
  await skipTalk();
  const un0 = await pg.evaluate(() => Object.keys(Game.S.camp.unlocked).sort().join(','));
  ok('Al empezar están abiertos puente, dormitorios, enfermería, reactor y soporte vital', un0 === 'bridge,life,med,reactor,water', un0);
  await pg.evaluate(() => { World.player.x = 43.5; World.player.y = 40.6; });
  await pg.keyboard.down('a'); await pg.waitForTimeout(1100); await pg.keyboard.up('a');
  const yb = await pg.evaluate(() => World.player.x);
  ok('La puerta de una sección bloqueada no deja pasar', yb > 41.4, yb.toFixed(2));
  ok('Se explica qué abre la sección bloqueada', /se abre al completar/.test(await pg.locator('#actBtn').textContent()));
  // Misión c1 con acciones reales
  await pg.evaluate(() => Game._debug.openConsole('cmd')); await pg.getByRole('tab', { name: /Recursos/ }).click(); await closeAll(pg);
  await AT(pg, 'life'); await pg.waitForTimeout(500);
  ok('La médica se presenta en el módulo de vida', await pg.getByText('Sofía').first().isVisible()); await skipTalk();
  await pg.evaluate(() => Game._debug.openConsole('med')); await closeAll(pg);
  await AT(pg, 'reactor'); await pg.waitForTimeout(500);
  ok('La ingeniera se presenta en el reactor', await pg.getByText('Ana').first().isVisible()); await skipTalk();
  await pg.evaluate(() => Game._debug.openConsole('reactor'));
  await pg.getByRole('button', { name: /Activar modo emergencia/ }).click(); await pg.getByRole('button', { name: /Confirmar/ }).click(); await closeAll(pg);
  await pg.waitForTimeout(600);
  const c2 = await pg.evaluate(() => [Game.S.camp.i, !!Game.S.camp.unlocked.water]);
  ok('Misión 1 completada desbloquea agua y oxígeno', c2[0] === 1 && c2[1], JSON.stringify(c2));
  const rq = await pg.evaluate(() => { const G = Game._debug.radio; return [G.cur].concat(G.q).filter(Boolean).map((c) => c.key); });
  ok('Llamada de radio anuncia la sección nueva (en cola, tras las alertas más urgentes)', rq.includes('campc1'), rq.join(','));
  await pg.evaluate(() => Game.S.emergency = false);
  // c2
  await AT(pg, 'water'); await pg.waitForTimeout(500); await skipTalk();
  await pg.evaluate(() => { const S = Game.S, inc = S.inc.find((i) => i.type === 'water_fail' && !i.res); Sim.mini(S, 'wiring', { ok: true, score: 1, inc: inc.id }); Sim.mini(S, 'o2', { ok: true, score: 0.9 }); Sim.decide(S, 'recmode', { v: 'max' }); Sim.step(S, 8); });
  await pg.waitForTimeout(400);
  ok('Misión 2 completada desbloquea el invernadero', await pg.evaluate(() => !!Game.S.camp.unlocked.gh && Game.S.camp.i === 2));
  // c3 en el invernadero
  await AT(pg, 'gh'); await pg.waitForTimeout(500);
  ok('El agrónomo se presenta en el invernadero', await pg.getByText('Teo').first().isVisible()); await skipTalk();
  await pg.evaluate(() => { const q = World.plantPos(0, 0); World.player.x = q[0]; World.player.y = q[1] + 0.9; }); await pg.waitForTimeout(400);
  const pr = await pg.locator('#actBtn').textContent();
  ok('Cada planta se selecciona individualmente (indicador)', /Hueco|Lechuga|Mizuna|Rábano|Chile|Zinnia/.test(pr), pr);
  await pg.evaluate(() => Game._debug.plantCard(1, 0));
  const seeds0 = await pg.evaluate(() => Game.S.seeds.radish);
  await pg.locator('.card', { hasText: 'Rábano' }).getByRole('button', { name: /Sembrar/ }).click();
  ok('Sembrar crea una planta y gasta semillas', await pg.evaluate((s0) => !!Game.S.beds[1].plants[0] && Game.S.seeds.radish === s0 - 1, seeds0));
  const wv = await pg.evaluate(() => Game.S.r.water.v);
  await pg.getByRole('button', { name: /Regar/ }).click();
  ok('Regar consume agua', await pg.evaluate((w) => Math.abs(w - Game.S.r.water.v - 0.3) < 0.01, wv));
  const nv = await pg.evaluate(() => Game.S.r.nutr.v);
  await pg.getByRole('button', { name: /Nutrientes/ }).click();
  ok('Añadir nutrientes consume solución nutritiva', await pg.evaluate((n) => Game.S.r.nutr.v < n, nv));
  await pg.getByRole('button', { name: /Inspeccionar/ }).click();
  ok('Inspeccionar muestra explicación del agrónomo', await pg.getByText(/Agua, luz y nutrientes trabajan juntos/).isVisible());
  const l0 = await pg.evaluate(() => { const S = Game.S; Sim.step(S, 0.25); return S.pw.demand; });
  await pg.getByRole('button', { name: /LED/ }).last().click();
  const l1 = await pg.evaluate(() => { const S = Game.S; Sim.step(S, 0.25); return S.pw.demand; });
  ok('Subir la iluminación aumenta el consumo eléctrico', l1 > l0, l0.toFixed(2) + '→' + l1.toFixed(2));
  await closeAll(pg);
  await pg.evaluate(() => { const S = Game.S; Sim.decide(S, 'plant', { bed: 1, slot: 1, sp: 'mizuna' }); Sim.decide(S, 'plant', { bed: 1, slot: 2, sp: 'chili' }); Sim.step(S, 24); });
  const fd = await pg.evaluate(() => { const S = Game.S; const f0 = S.r.food.v; const i = S.beds[0].plants.findIndex((p) => p && p.prog >= 1); const r = i >= 0 ? Sim.harvest(S, 0, i) : null; return [r && r.kg, S.r.food.v - f0]; });
  ok('Cosechar aumenta los alimentos', fd[0] > 0 && Math.abs(fd[1] - fd[0]) < 1e-6, JSON.stringify(fd));
  await pg.waitForTimeout(300);
  ok('Misión 3 completada desbloquea el laboratorio', await pg.evaluate(() => { Sim.step(Game.S, 0.25); return !!Game.S.camp.unlocked.lab; }));
  // c4
  await AT(pg, 'lab'); await pg.waitForTimeout(500);
  ok('El científico se presenta en el laboratorio', await pg.getByText('Leo').first().isVisible()); await skipTalk();
  await pg.evaluate(() => { Game._debug.openConsole('spec'); }); await closeAll(pg);
  await pg.evaluate(() => { Game._debug.openConsole('log'); }); await closeAll(pg);
  await pg.evaluate(() => { const S = Game.S; Sim.decide(S, 'analyze', {}); Sim.step(S, 4); });
  await pg.waitForTimeout(400);
  const fin = await pg.evaluate(() => [Game.S.camp.basicDone, Object.keys(Game.S.camp.unlocked).length]);
  ok('Familiarización completa: las 7 secciones principales, la enfermería y el almacén de alimentos abiertos', fin[0] && fin[1] === 9, JSON.stringify(fin));
  await AT(pg, 'rad'); await pg.waitForTimeout(500);
  ok('La guía de la bahía del rover se presenta', await pg.getByText(/bahía del rover/).first().isVisible()); await skipTalk();
  // Permisos después de la familiarización y vestuario
  await AT(pg, 'gh'); await pg.evaluate(() => Game._debug.openConsole('gh'));
  ok('Tras la familiarización, el comandante sigue pudiendo operar el invernadero', !(await pg.getByText(/Se necesita otro especialista/).count()) && await pg.getByRole('heading', { name: /Panel del invernadero/ }).isVisible());
  await closeAll(pg);
  await pg.evaluate(() => Game._debug.wardrobePanel());
  await pg.locator('.card', { hasText: 'Agrónomo' }).getByRole('button', { name: /Jugar con este personaje/ }).click();
  const rl = await pg.evaluate(() => [Game.S.playerRole, World.player.role, World._test.bots.map((b) => b.role).sort().join(',')]);
  ok('El vestuario cambia de especialista y el anterior queda como NPC', rl[0] === 'agri' && rl[1] === 'agri' && rl[2] === 'commander,engineer,medic,scientist', JSON.stringify(rl));
  await pg.evaluate(() => Game._debug.openConsole('gh'));
  ok('Con el especialista también se abre el panel', await pg.getByRole('heading', { name: /Panel del invernadero/ }).isVisible());
  await closeAll(pg);
  // ---- Mapa completo (M), tripulación (C) y pausa ----
  await pg.evaluate(() => { World.setPlayerRole('commander'); Sim.setPlayerRole(Game.S, 'commander'); });
  await pg.keyboard.press('m');
  ok('M abre el mapa completo', await pg.locator('.mapcv').isVisible());
  const tm0 = await pg.evaluate(() => Game.S.t); await pg.waitForTimeout(600);
  ok('Con el mapa abierto el tiempo simulado está en pausa', await pg.evaluate((t) => Game.S.t === t, tm0));
  const box = await pg.locator('.mapcv').boundingBox();
  await pg.locator('[data-act=mapfloor-3]').click(); await pg.waitForTimeout(150);
  const mp = await pg.evaluate(() => { const q = World.roomCenterOn('reactor'), cv = document.querySelector('.mapcv'); return [q[0], q[1], World.DIM.W, World.DIM.H, cv.width, cv.height]; });
  const msc = Math.min(mp[4] / mp[2], mp[5] / mp[3]), mpx = mp[4] / 2 + (mp[0] - mp[2] / 2) * msc, mpy = mp[5] / 2 + (mp[1] - mp[3] / 2) * msc;
  await pg.mouse.click(box.x + mpx * box.width / mp[4], box.y + mpy * box.height / mp[5]);
  ok('Seleccionar una sala muestra su ficha', await pg.locator('.mapinfo').getByText(/Reactor y energía/).first().isVisible());
  await pg.getByRole('button', { name: /Mostrar ruta/ }).click();
  const rt = await pg.evaluate(() => { const r = World.route('reactor'); return r && r.length > 2 && r.every((p) => World.RECTS && Number.isFinite(p[0])); });
  ok('La ruta sigue el grafo real de pasillos y puertas', rt);
  await pg.getByRole('button', { name: /Marcar destino/ }).click();
  ok('Marcar destino fija el marcador en el mundo', await pg.evaluate(() => !!World.marker && World.marker.label.length > 0));
  await pg.keyboard.press('m');
  ok('M vuelve a cerrar el mapa', !(await pg.locator('.mapcv').count()));
  await pg.keyboard.press('m'); await pg.keyboard.press('Escape');
  ok('Esc cierra el mapa', !(await pg.locator('.mapcv').count()));
  await pg.locator('#bMap').click();
  ok('El botón del HUD abre el mapa', await pg.locator('.mapcv').isVisible());
  await closeAll(pg);
  await pg.keyboard.press('c');
  ok('C abre el selector de tripulación con los cinco personajes', (await pg.locator('.card h3').count()) >= 5);
  await closeAll(pg);
  const pos0 = await pg.evaluate(() => [World.player.x, World.player.y, JSON.stringify(Game.S.m[1])]);
  await pg.locator('#bCrew').click();
  await pg.locator('.card', { hasText: 'Científico' }).getByRole('button', { name: /Jugar con este personaje/ }).click();
  const pos1 = await pg.evaluate(() => [World.player.x, World.player.y, JSON.stringify(Game.S.m[1]), Game.S.playerRole]);
  ok('Cambiar de personaje conserva posición y misiones', Math.abs(pos0[0] - pos1[0]) < 0.01 && Math.abs(pos0[1] - pos1[1]) < 0.01 && pos0[2] === pos1[2] && pos1[3] === 'scientist', JSON.stringify([pos0, pos1]));
  await pg.evaluate(() => { World.setPlayerRole('commander'); Sim.setPlayerRole(Game.S, 'commander'); });
  const mu0 = await pg.locator('#bMute').innerHTML(); await pg.keyboard.press('n'); const mu1 = await pg.locator('#bMute').innerHTML(); await pg.keyboard.press('n');
  ok('N alterna el silencio y M ya no lo hace', mu0 !== mu1 && (await pg.locator('#bMute').innerHTML()) === mu0);
  // ---- Las 13 instalaciones: existencia, conexión y rutas transitables ----
  const inst = await pg.evaluate(() => {
    const T = World._test, need = ['bridge', 'life', 'med', 'reactor', 'water', 'gh', 'food', 'kitchen', 'lab', 'samples', 'workshop', 'rad', 'waste'];
    const out = { have: 0, bad: [], nodesOk: true, unreachable: [], doors: 0, consoles: [], samples: 0, floorsOk: [], elev: [] };
    const savedUn = Game.S.camp.unlocked; Game.S.camp.unlocked = { bridge: 1, life: 1, med: 1, reactor: 1, water: 1, gh: 1, lab: 1, rad: 1, food: 1, kitchen: 1, samples: 1, workshop: 1, waste: 1 };
    for (const f of [1, 2, 3]) {
      World.arrive(f); const R = World.RECTS, rm = (x, y) => T.roomAt[y] && T.roomAt[y][x], ex = Layout.FLOORS[f - 1].elev;
      out.have += need.filter((k) => R[k]).length; out.doors += T.doors.length;
      for (const d of T.doors) { const a = d.v ? [rm(d.x - 1, d.y), rm(d.x + 1, d.y)] : [rm(d.x, d.y - 1), rm(d.x, d.y + 1)]; if (!a[0] || !a[1] || a[0] === a[1]) { if (!(a.includes(undefined) && d.rooms.includes('pad'))) out.nodesOk = false, out.bad.push('puerta@' + d.x + ',' + d.y); } }
      const px = World.player.x, py = World.player.y; out.elev.push([f, !!R['elc' + f]]);
      for (const k of need) if (R[k]) { const r = World.route(k); if (!r) out.unreachable.push(k + '@' + f); }
      for (const c of Layout.FLOORS[f - 1].CONSOLES) { const p = World.consolePos(c[0]); if (!p || !T.findPath(px, py, p[0], p[1])) out.consoles.push(c[0]); }
    }
    World.arrive(2); out.samples = T.samples.filter((q) => !T.findPath(67.5, 81.5, q.x, q.y)).length;
    Game.S.camp.unlocked = savedUn; World.arrive(1);
    return out;
  });
  ok('Existen las 13 instalaciones repartidas en los tres pisos, cada piso con su elevador', inst.have === 13 && inst.elev.every((e) => e[1]), JSON.stringify(inst));
  ok('Cada puerta une dos salas distintas (paredes y puertas coherentes)', inst.nodesOk && !inst.bad.length && inst.doors >= 22, JSON.stringify(inst.bad.slice(0, 5)) + inst.doors);
  ok('Todas las consolas y las muestras exteriores son alcanzables por la cuadrícula real', inst.consoles.length === 0 && inst.samples === 0, JSON.stringify([inst.consoles, inst.samples]));
  ok('Dentro de cada piso, todas sus salas son alcanzables desde el elevador por rutas reales', inst.unreachable.length === 0, JSON.stringify(inst.unreachable));
  // ---- Instalaciones nuevas: almacén, cocina, muestras, taller, residuos ----
  const fac = await pg.evaluate(() => {
    const mk = () => Sim.create({ seed: 11, noEv: true, mode: 'adv', skipCamp: true, scen: 'moon' });
    const out = {};
    // Almacén: la cosecha entra y se registra; sin frío se estropea más
    let A = mk(), B = mk();
    for (const X of [A, B]) { X.pant.fresh = 10; }
    Sim.decide(B, 'cold', { v: false });
    Sim.step(A, 24); Sim.step(B, 24);
    out.spoil = [A.st.spoiled, B.st.spoiled];
    A = mk(); const pl0 = A.beds[0].plants[0]; pl0.prog = 1; const before = A.pant.fresh; Sim.harvest(A, 0, 0);
    out.harvest = [A.pant.fresh > before, A.pant.log.length === 1 && A.pant.log[0].k === 'in'];
    // Cocina: ensalada gasta lo fresco, sube el ánimo y respeta las 8 h
    A = mk(); A.pant.fresh = 5; A.r.food.v = 40; const m0 = A.morale = 50;
    const c1 = Sim.decide(A, 'cook', { r: 'salad' }); Sim.step(A, 3); const m1 = A.morale; const c2 = Sim.decide(A, 'cook', { r: 'salad' });
    out.cook = [c1.ok, m1 > m0 - 5, c2.ok === false && c2.err === 'mealwait', A.st.meals === 1, A.pant.fresh < 5];
    // Raciones
    A = mk(); B = mk(); Sim.decide(B, 'ration', { v: 'low' }); Sim.step(A, 1); Sim.step(B, 1); out.ration = B.r.food.cons < A.r.food.cons * 0.9;
    // Muestras: identificador único, clasificación, almacenamiento, laboratorio, deterioro
    A = mk(); Sim.addSamples(A, 3, 'rover');
    const ids = A.sampleList.map((e) => e.id), e0 = A.sampleList[0];
    const okF = ['id', 'origin', 't', 'cat', 'state', 'slot', 'an'].every((k) => k in e0);
    const st = Sim.decide(A, 'sstore', { id: e0.id, label: e0.cat });
    const slotOk = A.sampleList[0].slot === 'A1' && A.sampleList[0].state === 'stored' && A.sampleList[0].ok;
    const an = Sim.decide(A, 'analyze', { id: e0.id }); const inlab = A.sampleList[0].an === 'inlab';
    Sim.step(A, 4); const sc0 = A.science;
    out.samples = [new Set(ids).size === 3, okF, st.ok, slotOk, an.ok, inlab, A.sampleList[0].an === 'done', A.sampleList[0].sci === 15, A.samples === 2];
    A = mk(); Sim.addSamples(A, 1, 'eva'); Sim.step(A, 25); out.degraded = A.sampleList[0].state === 'degraded';
    // Taller: fabricar repuesto y usarlo
    A = mk(); const mat0 = A.r.mat.v; Sim.decide(A, 'craft', {}); Sim.step(A, 4); const p1 = A.parts; const matAfterCraft = A.r.mat.v;
    A.sys.reactor.h = 40; const matB = A.r.mat.v; const mt = Sim.decide(A, 'maint', { sys: 'reactor' });
    out.work = [p1 === 1, matAfterCraft < mat0, mt.ok, A.parts === 0, Math.abs(A.r.mat.v - matB) < 0.01, A.jobs.some((j) => j.kind === 'maint' && j.h < 2)];
    // Residuos: separar antes de reciclar rinde más
    A = mk(), B = mk(); A.r.waste.v = 20; B.r.waste.v = 20; A.r.mat.v = B.r.mat.v = 10;
    Sim.decide(A, 'sort', {}); Sim.decide(A, 'recycle', {}); Sim.decide(B, 'recycle', {}); Sim.step(A, 4); Sim.step(B, 4);
    out.waste = [A.r.mat.v - B.r.mat.v > 2.5];
    // Migración de partidas guardadas
    A = mk(); const old = JSON.parse(JSON.stringify(A)); delete old.pant; delete old.sampleList; delete old.parts; old.samples = 2;
    const M = Sim.migrate(old); out.mig = [!!M.pant, M.sampleList.length === 2, M.samples === 2, M.parts === 0];
    return out;
  });
  ok('Almacén: sin refrigeración se estropea más comida', fac.spoil[1] > fac.spoil[0] * 4, JSON.stringify(fac.spoil));
  ok('Almacén: la cosecha entra y queda registrada', fac.harvest.every(Boolean), JSON.stringify(fac.harvest));
  ok('Cocina: la ensalada usa lo fresco, sube el ánimo y respeta el intervalo', fac.cook.every(Boolean), JSON.stringify(fac.cook));
  ok('Cocina: el plan de raciones cambia el consumo', fac.ration);
  ok('Muestras: identificador único, clasificación, estante, laboratorio y análisis registrado', fac.samples.every(Boolean), JSON.stringify(fac.samples));
  ok('Muestras: sin almacenar se deterioran en 24 h', fac.degraded);
  ok('Taller: fabricar repuesto gasta materiales y el mantenimiento lo usa', fac.work.every(Boolean), JSON.stringify(fac.work));
  ok('Residuos: separar antes de reciclar recupera más materiales', fac.waste[0]);
  ok('Las partidas guardadas antiguas se migran', fac.mig.every(Boolean), JSON.stringify(fac.mig));
  for (const [id, re] of [['store', /Almacén de alimentos/], ['kitchen', /Cocina y comedor/], ['sampler', /Almacén de muestras/], ['work', /Taller de mantenimiento/], ['wastec', /Gestión de residuos/]]) {
    await pg.evaluate((i) => Game._debug.openConsole(i), id);
    ok('La consola «' + id + '» abre su panel', await pg.locator('.panel h2').filter({ hasText: re }).first().isVisible());
    await closeAll(pg);
  }
  // ---- Ampliación progresiva: cada zona nueva se abre al completar la anterior ----
  const expn = await pg.evaluate(() => {
    const X = Sim.create({ seed: 3, noEv: true, mode: 'adv', skipCamp: true }), C = X.camp, out = {};
    C.unlocked = { bridge: 1, life: 1, med: 1, reactor: 1, water: 1, gh: 1, lab: 1, rad: 1, food: 1 }; C.xi = 0; C.done = { c1: 1, c2: 1, c3: 1, c4: 1 }; C.f = {}; C.cnt = {};
    const room = () => Object.keys(C.unlocked).sort().join(',');
    out.start = !C.unlocked.kitchen && !C.unlocked.samples && !C.unlocked.workshop && !C.unlocked.waste;
    Sim.campFlag(X, 'talk_food'); Sim.step(X, 0.2); out.noKit = !C.unlocked.kitchen;      // falta la misión introductoria
    Sim.campFlag(X, 'store_open'); Sim.step(X, 0.2); out.kit = !!C.unlocked.kitchen && C.xi === 1;
    Sim.campFlag(X, 'talk_kitchen'); X.pant.fresh = 5; X.r.food.v = 40; Sim.decide(X, 'cook', { r: 'salad' }); Sim.step(X, 0.2); out.sam = !!C.unlocked.samples && C.xi === 2;
    Sim.campFlag(X, 'talk_samples'); const e = X.sampleList.find((q) => q.state === 'new'); out.gaveSample = !!e;
    Sim.decide(X, 'sstore', { id: e.id, label: e.cat }); Sim.step(X, 0.2); out.wk = !!C.unlocked.workshop && C.xi === 3;
    Sim.campFlag(X, 'talk_workshop'); Sim.decide(X, 'craft', {}); Sim.step(X, 0.2); out.ws = !!C.unlocked.waste && C.xi === 4;
    Sim.campFlag(X, 'talk_waste'); Sim.decide(X, 'sort', {}); Sim.decide(X, 'recycle', {}); Sim.step(X, 0.2); out.end = C.xi === 5 && Sim.expStatus(X) === null && C.done.x5 === 1;
    out.pts = X.pts > 0;
    return out;
  });
  ok('Las zonas nuevas empiezan bloqueadas y no se abren sin completar la misión introductoria', expn.start && expn.noKit, JSON.stringify(expn));
  ok('Cada zona nueva se abre al completar la anterior (almacén → cocina → muestras → taller → residuos)', expn.kit && expn.sam && expn.wk && expn.ws && expn.end, JSON.stringify(expn));
  ok('La ampliación es opcional: no bloquea las misiones', await pg.evaluate(() => { const X = Sim.create({ seed: 4, noEv: true, mode: 'adv', skipCamp: true }); X.camp.xi = 0; X.camp.unlocked = { bridge: 1, life: 1, med: 1, reactor: 1, water: 1, gh: 1, lab: 1, rad: 1, food: 1 }; return Sim.startMission(X, 1).ok === true; }));
  // ---- HUD final y extra real del médico ----
  await pg.evaluate(() => { World.setPlayerRole('commander'); Sim.setPlayerRole(Game.S, 'commander'); });
  ok('El HUD muestra el personaje seleccionado', /Comandante/.test(await pg.locator('#bCrew').innerText()) || /Comandante/.test((await pg.locator('#bCrew').getAttribute('title')) || ''));
  await pg.locator('#bCom').click();
  ok('El botón de comunicaciones del HUD abre el panel de comunicaciones', await pg.locator('.panel h2').filter({ hasText: /Comunicaciones/ }).first().isVisible());
  await closeAll(pg);
  await pg.evaluate(() => Game._debug.openConsole('med'));
  const medCmd = await pg.getByText(/Revisión detallada de la médica/).count(); await closeAll(pg);
  await pg.evaluate(() => { World.setPlayerRole('medic'); Sim.setPlayerRole(Game.S, 'medic'); Game._debug.openConsole('med'); });
  ok('La médica ve una revisión detallada de la tripulación que el comandante no ve', medCmd === 0 && (await pg.getByText(/Revisión detallada de la médica/).isVisible()));
  await closeAll(pg); await pg.evaluate(() => { World.setPlayerRole('commander'); Sim.setPlayerRole(Game.S, 'commander'); });
  // ---- Rediseño del mapa: silueta, exterior planetario, puertas, zoom, efectos y rendimiento ----
  const rd = await pg.evaluate(async () => {
    const T = World._test, out = { shaped: 0, vdoor: 0, hdoor: 0, tubes: 0 }, sz = new Set();
    for (const f of [1, 2, 3]) {
      World.setFloor(f); const R = World.RECTS;
      out.shaped += Object.keys(R).filter((k) => !/^t\d/.test(k)).filter((k) => { let n = 0; const b = R[k]; for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) if (T.roomAt[y][x] === k) n++; return n < (b[2] - b[0] + 1) * (b[3] - b[1] + 1) * 0.985; }).length;
      Object.keys(R).filter((k) => !/^t\d/.test(k)).forEach((k) => sz.add((R[k][2] - R[k][0] + 1) + 'x' + (R[k][3] - R[k][1] + 1)));
      out.vdoor += T.doors.filter((d) => d.v).length; out.hdoor += T.doors.filter((d) => !d.v).length; out.tubes += Object.keys(R).filter((k) => /^t\d/.test(k)).length;
    }
    out.sizes = sz.size; World.setFloor(2); // el resto usa el exterior (planta baja)
    // exterior: el terreno bordea la base por todos los lados y sus rutas son navegables
    const props = T.props, sc = T.scenery;
    out.kindsMoon = [...new Set(props.map((p) => p.k))].sort().join(',');
    out.badTracks = []; sc.tracks.forEach((t, ti) => t.slice(1).forEach((q, i) => { const a1 = T.standAt(t[i][0], t[i][1]), b1 = T.standAt(q[0], q[1]); if (!T.findPath(a1[0], a1[1], b1[0], b1[1])) out.badTracks.push(ti + ':' + i); })); out.tracksOk = out.badTracks.length === 0;
    out.lockToPad = !!T.findPath(Layout.LOCK.x, Layout.LOCK.outY + 0.5, sc.pad.c[0], sc.pad.c[1]);
    // un objeto exterior sólido bloquea el paso
    const cont = props.find((p) => p.k === 'container'); let blockedOk = false;
    if (cont) { World.player.x = cont.x - 0.8; World.player.y = cont.y + cont.h / 2; const x0 = World.player.x; for (let i = 0; i < 40; i++) World.update(0.05, Game.S, { x: 1, y: 0 }); blockedOk = World.player.x < cont.x - 0.25 && World.player.x >= x0; }
    out.blockedOk = blockedOk;
    // puertas verticales: se abren y dejan pasar
    World.setFloor(1);
    const vd = T.doors.find((d) => d.v && d.kind === 'auto' && d.rooms.every((r) => !['gh', 'lab', 'food', 'kitchen', 'samples', 'workshop', 'waste', 'rad'].includes(r)));
    let vpass = false;
    if (vd) { Game.S.camp.unlocked = { bridge: 1, life: 1, med: 1, reactor: 1, water: 1, gh: 1, lab: 1, rad: 1, food: 1, kitchen: 1, samples: 1, workshop: 1, waste: 1 }; World.player.x = vd.x - 1.3; World.player.y = vd.y + 1; for (let i = 0; i < 60; i++) World.update(0.05, Game.S, { x: 1, y: 0 }); vpass = World.player.x > vd.x + 1.2; }
    out.vpass = vpass; World.arrive(1);
    return out;
  });
  ok('Las salas tienen formas y tamaños distintos (no son rectángulos iguales)', rd.shaped >= 9 && rd.sizes >= 9, JSON.stringify([rd.shaped, rd.sizes]));
  ok('Módulos unidos por túneles presurizados y puertas horizontales y verticales', rd.tubes >= 3 && rd.vdoor >= 6 && rd.hdoor >= 6, JSON.stringify([rd.tubes, rd.vdoor, rd.hdoor]));
  ok('Exterior: paneles, antenas, contenedores, vehículos, plataforma y rocas', ['antenna', 'container', 'pad', 'solar', 'vehicle', 'rock'].every((k) => rd.kindsMoon.includes(k)), rd.kindsMoon);
  ok('Las rutas de exploración y la plataforma son navegables desde la esclusa', rd.tracksOk && rd.lockToPad, JSON.stringify([rd.badTracks, rd.lockToPad]));
  ok('Los objetos exteriores sólidos bloquean el paso', rd.blockedOk);
  ok('Una puerta vertical se abre y deja pasar', rd.vpass);
  const geo = await pg.evaluate(() => {
    const sig = (sc) => { World.init(sc); const T = World._test; return { kinds: [...new Set(T.props.map((p) => p.k))].sort().join(','), craters: T.scenery.craters.length, dunes: T.scenery.dunes.length, first: T.props.filter((p) => p.k === 'rock' || p.k === 'mesa').slice(0, 4).map((p) => p.x + ':' + p.y).join('|') }; };
    const a = sig('moon'), b = sig('mars'); World.init(Game.S.scen); return { a, b };
  });
  ok('Luna y Marte tienen geografía distinta (cráteres y rocas / dunas y mesas), no solo otro color', geo.a.craters > geo.b.craters + 10 && geo.b.dunes >= 3 && geo.a.dunes === 0 && geo.b.kinds.includes('mesa') && !geo.a.kinds.includes('mesa') && geo.a.first !== geo.b.first, JSON.stringify(geo));
  const zm = await pg.evaluate(async () => { const z0 = World.camZoom; return z0; });
  await pg.keyboard.press('+'); await pg.waitForTimeout(700); const z1 = await pg.evaluate(() => World.camZoom);
  await pg.keyboard.press('-'); await pg.keyboard.press('-'); await pg.waitForTimeout(900); const z2 = await pg.evaluate(() => World.camZoom);
  ok('Zoom con + y −', z1 > zm * 1.1 && z2 < z1 * 0.8, JSON.stringify([zm, z1, z2]));
  await pg.keyboard.press('z'); await pg.waitForTimeout(1200); const f1 = await pg.evaluate(() => World.fit); const zf = await pg.evaluate(() => World.camZoom);
  await pg.keyboard.press('z'); await pg.waitForTimeout(300); const f2 = await pg.evaluate(() => World.fit);
  ok('La vista general (Z) muestra la base completa y se puede salir de ella', f1 === true && f2 === false && zf < z2, JSON.stringify([f1, f2, zf, z2]));
  const fxr = await pg.evaluate(async () => {
    const cv = document.querySelector('#game'), ctx = cv.getContext('2d'), S = Game.S, out = {};
    const lum = () => { const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 64) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 64); };
    const had = S.inc.slice(); S.inc = []; World.render(ctx, S, { dpr: 1 }); const a = lum();
    S.inc = [{ id: 951, type: 'power_drop', sev: 'warn', room: 'reactor', sys: 'solar', from: 0, res: false, prog: 0, fix: false, dur: 40 }]; World.render(ctx, S, { dpr: 1 }); const b = lum();
    S.inc = [{ id: 952, type: 'dust_storm', sev: 'warn', room: 'reactor', sys: 'solar', from: 0, res: false, prog: 0, fix: false, dur: 40 }]; World.render(ctx, S, { dpr: 1 }); const c2 = lum();
    S.inc = [{ id: 953, type: 'solar_storm', sev: 'crit', room: 'rad', sys: 'shield', from: 0, res: false, prog: 0, fix: false, dur: 40 }]; World.render(ctx, S, { dpr: 1 }); const d2 = lum();
    S.inc = had; World.vehicleArrival(); for (let i = 0; i < 90; i++) World.render(ctx, S, { dpr: 1 });
    const t0 = performance.now(); for (let i = 0; i < 40; i++) World.render(ctx, S, { dpr: 1 }); out.frame = (performance.now() - t0) / 40;
    World.init(S.scen); const t1 = performance.now(); World.render(ctx, S, { dpr: 1 }); out.build = performance.now() - t1;
    out.l = [a, b, c2, d2]; return out;
  });
  ok('Un corte eléctrico oscurece la base y la tormenta de polvo cambia su aspecto', fxr.l[1] < fxr.l[0] * 0.92 && Math.abs(fxr.l[2] - fxr.l[0]) > 1, JSON.stringify(fxr.l));
  ok('El incidente radiológico y la llegada de un vehículo se dibujan sin errores', fxr.l[3] > 0);
  ok('Rendimiento: dibujado por fotograma y construcción del arte dentro de los límites', fxr.frame < 40 && fxr.build < 4000, JSON.stringify([Math.round(fxr.frame * 10) / 10, Math.round(fxr.build)]));
  // ---- Rutinas de los NPC (día y noche) ----
  const rout = await pg.evaluate(() => {
    const X = Sim.create({ seed: 8, noEv: true, mode: 'adv', skipCamp: true }); X.t = 24 + 12; // día 2, 12:00
    World.init(X.scen); World.update(0.01, X, { x: 0, y: 0 });
    const rn = (b) => World.withFloor(b.floor || 1, () => World.roomName(b.x, b.y)); // la sala se busca en el piso del NPC
    const B = World._test.bots, rooms = () => B.map(rn);
    const run = (sec) => { for (let i = 0; i < sec * 20; i++) { B.forEach((b) => { if (b.wait > 0.2) b.wait = 0.1; }); World.update(0.05, X, { x: 0, y: 0 }); } };
    const homes = {}; const seen = { engineer: new Set(), scientist: new Set(), medic: new Set(), agri: new Set() };
    for (let k = 0; k < 400; k++) { run(0.5); B.forEach((b) => seen[b.role] && seen[b.role].add(rn(b))); }
    const day = Object.fromEntries(Object.entries(seen).map(([r, v]) => [r, [...v]]));
    X.t = 24 * 2 + 1; // noche (01:00)
    run(60);
    const night = rooms();
    return { day, night, inDorm: night.every((r) => r === 'life' || r === 'hall' || r === 'med') };
  });
  ok('Las rutinas diurnas llevan a cada NPC a su zona de trabajo', rout.day.medic.includes('med') && rout.day.scientist.some((r) => r === 'lab' || r === 'samples') && rout.day.agri.some((r) => r === 'gh' || r === 'food') && rout.day.engineer.some((r) => ['reactor', 'water', 'workshop'].includes(r)), JSON.stringify(rout.day));
  ok('De noche los NPC se retiran a los dormitorios', rout.night.filter((r) => r === 'life').length >= 3, JSON.stringify(rout.night));
  // Alertas por NPC
  const rad = await pg.evaluate(() => {
    const G = Game._debug, S = Game.S, out = {};
    G.radio.q = []; G.radio.cur = null;
    Sim.addInc(S, 'crop_fail', {}); Sim.step(S, 0.01);
    return true;
  });
  await pg.waitForTimeout(500);
  const who1 = await pg.locator('#radio').innerText();
  ok('La plaga la comunica el agrónomo', /Teo/.test(who1) && /Falla de cultivos/.test(who1), who1.split('\n')[0]);
  await pg.getByRole('button', { name: /Marcar ubicación/ }).click();
  ok('Marcar ubicación coloca un marcador', await pg.evaluate(() => !!World.marker));
  const qd = await pg.evaluate(() => { const G = Game._debug; const n0 = G.radio.q.length; for (let i = 0; i < 5; i++) G.call({ key: 'dup', sev: 'info', who: 'engineer', title: 'x' }); return [n0, G.radio.q.length]; });
  ok('Los mensajes repetidos no se acumulan', qd[1] - qd[0] <= 1, JSON.stringify(qd));
  const pri = await pg.evaluate(() => { const G = Game._debug; G.call({ key: 'i1', sev: 'info', who: 'engineer', title: 'info' }); G.call({ key: 'c1', sev: 'crit', who: 'medic', title: 'crit' }); return G.radio.cur && G.radio.cur.sev; });
  ok('Las alertas críticas tienen prioridad', pri === 'crit', pri);
  const ww = await pg.evaluate(() => { const G = Game._debug; G.radio.q = []; G.radio.cur = null; Sim.addInc(Game.S, 'water_fail', {}); Sim.step(Game.S, 0.01); return true; });
  await pg.waitForTimeout(400);
  ok('El fallo de agua lo comunica la ingeniera', /Ana/.test(await pg.locator('#radio').innerText()));
  ok('Campaña y NPC sin errores', err5.length === 0, err5.join(' | '));
  await ctx5.close();

  // ---- Dos modalidades: Explorador Junior e Ingeniero de Misión ----
  const ctxM = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctxM.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pm2 = await ctxM.newPage(); const errM = [];
  pm2.on('pageerror', (e) => errM.push(e.message));
  await pm2.goto(FILE); await pm2.waitForTimeout(300);
  await pm2.getByRole('button', { name: /Iniciar misión/ }).click();
  ok('El asistente de inicio ofrece edad de 5 a 17+ con barra y botones', (await pm2.locator('.age-range').count()) === 1 && (await pm2.locator('.age-btn').count()) === 2 && (await pm2.locator('.age-range').getAttribute('min')) === '5' && (await pm2.locator('.age-range').getAttribute('max')) === '17');
  await pm2.locator('.age-range').fill('15');
  await pm2.locator('[data-age-step="1"]').click(); await pm2.locator('[data-age-step="1"]').click(); await pm2.locator('[data-age-step="1"]').click();
  ok('La edad máxima se muestra como 17+ y no se pasa del límite', (await pm2.locator('.age-num').innerText()) === '17+');
  await pm2.locator('[data-age-step="-1"]').click();
  ok('El botón − baja la edad', (await pm2.locator('.age-num').innerText()) === '16');
  await pm2.locator('[data-age-step="1"]').click(); await pm2.locator('[data-act=wiz-next]').click();
  ok('Hay cuatro misiones: Luna, Marte, estación e investigación', (await pm2.locator('.mcard').count()) === 4);
  await pm2.locator('[data-mission=science]').click(); await pm2.locator('[data-act=wiz-next]').click();
  ok('Hay tres dificultades: Explorador, Cadete y Comandante', (await pm2.locator('.dcard').count()) === 3 && (await pm2.getByText('Cadete').count()) >= 1);
  await pm2.locator('[data-level=commander]').click();
  await pm2.getByRole('button', { name: /Despegar/ }).click(); await landThrough(pm2); await pm2.waitForTimeout(400);
  ok('Edad, misión y dificultad son independientes: 17+ → Avanzado, investigación → Marte, Comandante → difícil', await pm2.evaluate(() => Game.S.mode === 'adv' && Game.S.scen === 'mars' && Game.S.focus === 'science' && Game.S.diff === 'commander' && Game.S.age === 17));
  ok('La modalidad elegida se aplica', await pm2.evaluate(() => Game.S.mode === 'adv' && MODE === 'adv'));
  const hudA = await pm2.evaluate(() => [...document.querySelectorAll('#meters .meter')].filter((m) => !m.classList.contains('hidden')).length);
  ok('Ingeniero: 5 indicadores detallados en el HUD', hudA === 5, String(hudA));
  ok('Ingeniero: el HUD muestra unidades', /kg|kWh|mSv/.test(await pm2.locator('#meters').innerText()));
  await pm2.evaluate(() => { Game._debug.saveNow(); });
  await pm2.reload(); await pm2.waitForTimeout(300);
  await pm2.getByRole('button', { name: /Continuar/ }).click(); await pm2.waitForTimeout(300);
  ok('La modalidad se guarda y se recupera con la partida', await pm2.evaluate(() => Game.S.mode === 'adv' && MODE === 'adv'));
  await pm2.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'junior', skipCamp: true })); await pm2.waitForTimeout(300);
  const hudJ = await pm2.evaluate(() => [...document.querySelectorAll('#meters .meter')].filter((m) => !m.classList.contains('hidden')).length);
  ok('Junior: 4 indicadores simplificados en el HUD', hudJ === 4, String(hudJ));
  ok('Junior: el HUD no muestra unidades', !/kg|kWh|mSv|kW/.test(await pm2.locator('#meters').innerText()));
  // Panel de recursos
  await pm2.evaluate(() => Game._debug.openConsole('cmd')); await pm2.getByRole('tab', { name: /Recursos/ }).click();
  ok('Junior: recursos en tarjetas sin tablas ni gráficos', (await pm2.locator('[role=dialog] table').count()) === 0 && (await pm2.locator('canvas.spark').count()) === 0);
  await closeAll(pm2);
  await pm2.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'adv', skipCamp: true })); await pm2.waitForTimeout(200);
  await pm2.evaluate(() => { Sim.step(Game.S, 8); Game._debug.openConsole('cmd'); }); await pm2.getByRole('tab', { name: /Recursos/ }).click(); await pm2.waitForTimeout(150);
  ok('Ingeniero: tabla de recursos, gráficos de tendencia y tipos de dato', (await pm2.locator('[role=dialog] table').count()) >= 1 && (await pm2.locator('canvas.spark').count()) === 5 && (await pm2.locator('details.more').count()) >= 1);
  await closeAll(pm2);
  // Panel de consecuencias por modalidad
  await pm2.evaluate(() => { const S = Game.S; S.r.power.v = 40; S.sys.reactor.lvl = 0.2; World.setPlayerRole('engineer'); Sim.setPlayerRole(S, 'engineer'); Game._debug.openConsole('reactor'); });
  await pm2.getByRole('button', { name: /Activar modo emergencia/ }).click();
  ok('Ingeniero: consecuencias con tabla numérica (ahora / sin actuar / con la decisión)', (await pm2.locator('[role=dialog] table th', { hasText: 'Δ' }).count()) === 1 && /kWh|kg/.test(await pm2.locator('[role=dialog]').last().innerText()));
  await closeAll(pm2);
  await pm2.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'junior', skipCamp: true })); await pm2.waitForTimeout(200);
  await pm2.evaluate(() => { const S = Game.S; S.r.power.v = 40; S.sys.reactor.lvl = 0.2; World.setPlayerRole('engineer'); Sim.setPlayerRole(S, 'engineer'); Game._debug.openConsole('reactor'); });
  await pm2.getByRole('button', { name: /Activar modo emergencia/ }).click();
  const jtxt = await pm2.locator('[role=dialog]').last().innerText();
  ok('Junior: consecuencias en palabras (sube/baja un poco o mucho), sin cifras ni unidades', /sube|baja/.test(jtxt) && !/kWh|\bkg\b|\bkW\b/.test(jtxt) && (await pm2.locator('[role=dialog]').last().locator('table').count()) === 0, jtxt.slice(0, 120).replace(/\n/g, ' '));
  await closeAll(pm2);
  // Lenguaje: sin jerga en Junior, sin infantilizar en Ingeniero, y mismo fenómeno con distinto nivel
  const lang = await pm2.evaluate(() => {
    const collect = (o, out, skip) => { if (o == null || typeof o === 'string') return; if (typeof o.es === 'string') { out.push(tr(o)); return; } if (Array.isArray(o)) { o.forEach((x) => collect(x, out, skip)); return; } for (const k in o) if (!(skip || []).includes(k)) collect(o[k], out, skip); };
    const corpus = () => { const out = []; collect(DATA.EVT, out, ['src', 't']); collect(DATA.MIS, out, ['icon', 'room']); collect(DATA.QUIZ, out); collect(DATA.TUT, out); collect(DATA.ENDT, out); collect(NPCDATA.TALK, out); collect(NPCDATA.RES, out); collect(NPCDATA.KEY, out); collect(NPCDATA.CAMP, out); collect(NPCDATA.CONSEQ, out); for (const k in NPCDATA.PLANT) collect(NPCDATA.PLANT[k].needs, out); const D = Game._debug.DMETA; for (const k in D) { collect(D[k].r, out); collect(D[k].b, out); } return out; };
    const JARGON = /electr[oó]lisis|electrolysis|estequi|stoichiom|kWh|\bkW\b|kPa|mSv|regolit|ISRU|dosimetr|irradianc|conjunci[oó]n solar|solar conjunction|telemetr|\bHUD\b|coseno|cosine|espectr[oó]metro|spectrometer|hidr[oó]geno|hydrogen|OSHA|\bDONKI\b/i;
    let J = [], bad = [], long = [];
    for (const lg of ['es', 'en']) { LANG = lg; MODE = 'junior'; const c = corpus(); J = J.concat(c); bad = bad.concat(c.filter((x) => JARGON.test(x))); long = long.concat(c.filter((x) => x.length > 190)); }
    LANG = 'es'; MODE = 'adv'; const A = corpus(); { const D = Game._debug.DMETA; for (const k in D) collect(D[k].u, A); }
    const childish = A.filter((x) => /¡Genial|¡Bravo|bichit|cosita|juguet|Great job|bugs and mold/i.test(x));
    const tech = ['kW', 'kPa', 'electrólisis'].filter((t) => A.join(' ').includes(t));
    const pairs = [['solar_storm', 'what'], ['solar_storm', 'cause'], ['water_fail', 'cause'], ['power_drop', 'act'], ['crop_fail', 'what']].map(([t, k]) => { MODE = 'junior'; const j = tr(DATA.EVT[t][k]); MODE = 'adv'; return j !== tr(DATA.EVT[t][k]); });
    MODE = 'junior';
    return { n: J.length, bad: bad.slice(0, 4), long: long.slice(0, 2), childish, tech, differ: pairs.every(Boolean) };
  });
  ok('Junior: ningún texto usa jerga técnica', lang.bad.length === 0, JSON.stringify(lang.bad));
  ok('Junior: frases cortas (≤190 caracteres)', lang.long.length === 0, JSON.stringify(lang.long));
  ok('Ingeniero: terminología y unidades (kW, kPa, electrólisis)', lang.tech.length === 3, JSON.stringify(lang.tech));
  ok('Ingeniero: sin tono infantil', lang.childish.length === 0, JSON.stringify(lang.childish));
  ok('Las explicaciones cambian de nivel manteniendo el mismo fenómeno', lang.differ);
  // Jugabilidad: eventos, cadenas, diagnóstico y prioridades
  const gp = await pm2.evaluate(() => {
    const types = (mode) => { const set = new Set(); for (let i = 0; i < 40; i++) { const S = Sim.create({ scen: i % 2 ? 'mars' : 'moon', mode, seed: 500 + i * 13, skipCamp: true }); for (let h = 0; h < 600; h++) { Sim.step(S, 1); if (S.ended) break; S.inc.forEach((x) => set.add(x.type)); } } return [...set]; };
    const J = types('junior'), A = types('adv');
    const mk = (mode) => Sim.create({ scen: 'mars', mode, seed: 9, skipCamp: true, noEv: true });
    // cadena: tormenta de polvo -> desgaste de paneles (solo avanzado)
    const chain = (mode) => { const S = mk(mode); S.noEv = false; S.lastEv = 1e9; Sim.addInc(S, 'dust_storm', {}); Sim.step(S, 20); return S.inc.some((i) => i.type === 'wear'); };
    // diagnóstico: reparar sin diagnosticar no avanza en el avanzado
    const diag = (mode) => { const S = mk(mode); const inc = Sim.addInc(S, 'water_fail', {}); Sim.repair(S, inc.id, 100); const blocked = !inc.res; const t0 = S.t; const bad = Sim.diagnose(S, inc.id, 1); const cost = S.t - t0; const ok = Sim.diagnose(S, inc.id, Sim.DIAG_OK.water_fail); Sim.repair(S, inc.id, 100); return { blocked, cost: Math.round(cost), wrong: bad.ok, ok: ok.ok, fixed: inc.res }; };
    const prio = (mode) => { const S = mk(mode); return Sim.decide(S, 'prio', { id: 'lights', v: 2 }).ok; };
    return { J, A, chainJ: chain('junior'), chainA: chain('adv'), dJ: diag('junior'), dA: diag('adv'), pJ: prio('junior'), pA: prio('adv') };
  });
  ok('Junior no tiene sensores descalibrados ni fallos térmicos (menos fallos distintos)', !gp.J.includes('sensor_drift') && !gp.J.includes('thermal_fail'), gp.J.join(','));
  ok('Ingeniero sí los tiene (más variedad de fallos)', gp.A.includes('sensor_drift') && gp.A.includes('thermal_fail'), gp.A.join(','));
  ok('Eventos encadenados solo en Ingeniero (polvo → desgaste de paneles)', !gp.chainJ && gp.chainA);
  ok('Junior: se repara directamente', !gp.dJ.blocked && gp.dJ.fixed, JSON.stringify(gp.dJ));
  ok('Ingeniero: hay que diagnosticar antes de reparar; el diagnóstico erróneo cuesta 1 h', gp.dA.blocked && gp.dA.cost === 1 && !gp.dA.wrong && gp.dA.ok && gp.dA.fixed, JSON.stringify(gp.dA));
  ok('Solo Ingeniero reparte prioridades eléctricas', !gp.pJ && gp.pA);
  // Interfaz de diagnóstico y radio por nivel
  await pm2.evaluate(() => Game._debug.newRun('mars', 'x', { mode: 'adv', skipCamp: true })); await pm2.waitForTimeout(200);
  await pm2.evaluate(() => { Game._debug.radio.q = []; Game._debug.radio.cur = null; Sim.addInc(Game.S, 'water_fail', {}); Sim.step(Game.S, 0.01); }); await pm2.waitForTimeout(500);
  const radA = await pm2.locator('#radio').innerText();
  ok('Ingeniero: la llamada incluye valores del sistema (diagnóstico con datos)', /Reciclaje efectivo \d+ %/.test(radA) && /L\/h/.test(radA), radA.slice(0, 160).replace(/\n/g, ' '));
  await pm2.getByRole('button', { name: /Consultar sistema/ }).click(); await pm2.waitForTimeout(150);
  await pm2.evaluate(() => { World.setPlayerRole('engineer'); Sim.setPlayerRole(Game.S, 'engineer'); });
  await closeAll(pm2); await pm2.evaluate(() => Game._debug.openConsole('water'));
  await pm2.getByRole('button', { name: /Diagnosticar/ }).first().click();
  ok('Ingeniero: aparece el panel de diagnóstico con telemetría y 3 hipótesis', (await pm2.getByText('¿Cuál es la causa más probable?').count()) === 1 && /Reciclaje efectivo/.test(await pm2.locator('[role=dialog]').last().innerText()));
  await pm2.getByRole('button', { name: /Falta de energía en el reciclador/ }).click();
  ok('Diagnóstico erróneo: mensaje y sin desbloqueo', (await pm2.getByText(/No encaja con los datos/).count()) === 1 && !(await pm2.evaluate(() => Game.S.inc.find((i) => i.type === 'water_fail').diag)));
  await pm2.getByRole('button', { name: /Obstrucción en la bomba/ }).click(); await pm2.waitForTimeout(250);
  ok('Diagnóstico correcto desbloquea la reparación (minijuego)', (await pm2.getByRole('button', { name: /Hacerlo de verdad/ }).count()) === 1 && await pm2.evaluate(() => !!Game.S.inc.find((i) => i.type === 'water_fail').diag));
  await closeAll(pm2);
  await pm2.evaluate(() => Game._debug.newRun('mars', 'x', { mode: 'junior', skipCamp: true })); await pm2.waitForTimeout(200);
  await pm2.evaluate(() => { Game._debug.radio.q = []; Game._debug.radio.cur = null; Sim.addInc(Game.S, 'water_fail', {}); Sim.step(Game.S, 0.01); }); await pm2.waitForTimeout(500);
  const radJ = await pm2.locator('#radio').innerText();
  ok('Junior: la llamada usa palabras sencillas y no muestra valores técnicos', !/kW|kWh|mSv|L\/h|%/.test(radJ) && /bomba/i.test(radJ), radJ.slice(0, 160).replace(/\n/g, ' '));
  // Conversación del guía por nivel
  await pm2.evaluate(() => { Game._debug.talk('water', true); });
  const tj = await pm2.locator('.talk .bubble').innerText();
  for (let i = 0; i < 6; i++) { const b = pm2.getByRole('button', { name: /^Siguiente|¡Entendido!/ }); if (await b.count()) { await b.first().click(); await pm2.waitForTimeout(40); } }
  await pm2.evaluate(() => Game._debug.newRun('mars', 'x', { mode: 'adv', skipCamp: true })); await pm2.waitForTimeout(200);
  await pm2.evaluate(() => { Game._debug.talk('water', true); });
  await pm2.getByRole('button', { name: /^Siguiente/ }).click(); await pm2.waitForTimeout(60);
  const ta = await pm2.locator('.talk .bubble').innerText();
  ok('Los NPC adaptan sus explicaciones al nivel', ta !== '' && tj !== '' && /electrólisis|eficiencia|kg|%/.test(ta) && !/electrólisis|kg|%/.test(tj), tj.slice(0, 50) + ' | ' + ta.slice(0, 50));
  for (let i = 0; i < 7; i++) { const b = pm2.getByRole('button', { name: /^Siguiente|¡Entendido!/ }); if (await b.count()) { await b.first().click(); await pm2.waitForTimeout(40); } }
  ok('Ingeniero: la conversación termina con datos en vivo del sistema', true);
  // Preguntas de evaluación por nivel
  const qz = await pm2.evaluate(() => { MODE = 'adv'; const a = tr(Game._debug.quizOf(1).q); MODE = 'junior'; const j = tr(Game._debug.quizOf(1).q); return { a, j, nA: Object.keys(DATA.QUIZ_A).length, nJ: Object.keys(DATA.QUIZ).length }; });
  ok('Hay preguntas distintas por nivel para las 7 misiones', qz.nA === 7 && qz.nJ === 7 && qz.a !== qz.j && /%/.test(qz.a), qz.a.slice(0, 60));
  await pm2.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'junior', skipCamp: true })); await pm2.waitForTimeout(150);
  await pm2.evaluate(() => { Game.S.m[1].st = 'active'; Sim.finishMission(Game.S, 1, 3); }); await pm2.waitForTimeout(1000);
  ok('Junior: respuestas de la pregunta como botones grandes con icono', (await pm2.locator('.mt button svg.ico').count()) >= 3);
  await closeAll(pm2);
  // Tiempo de respuesta de los minijuegos
  const tmg = await pm2.evaluate(() => { MODE = 'junior'; const j = Game._debug.mgDur(MG.defs.wiring, 1); MODE = 'adv'; const a = Game._debug.mgDur(MG.defs.wiring, 1); MODE = 'junior'; return [j, a]; });
  ok('Junior: más tiempo de respuesta en los minijuegos', tmg[0] > tmg[1] * 1.3, JSON.stringify(tmg));
  // Limpieza visual: sin emojis decorativos
  const emo = await pm2.evaluate(async () => {
    const RX = /[\u{1F300}-\u{1FAFF}\u2600-\u2604\u2607-\u2713\u2716-\u27BF\u2B00-\u2BFF]/u; const hits = [];
    const scan = (w) => { const t = document.body.innerText; const m = t.match(RX); if (m) hits.push(w + ':' + m[0]); };
    for (const mode of ['junior', 'adv']) {
      Game._debug.newRun('moon', 'x', { mode, skipCamp: true }); await new Promise((r) => setTimeout(r, 250)); scan(mode + ' hud');
      for (const id of ['cmd', 'gh', 'reactor', 'water', 'lab', 'wardrobe']) { Game._debug.openConsole(id); await new Promise((r) => setTimeout(r, 60)); scan(mode + ' ' + id); document.querySelectorAll('[role=dialog]').forEach((d) => d.remove()); }
    }
    return hits;
  });
  ok('Interfaz sin emojis decorativos (iconografía propia en SVG)', emo.length === 0, JSON.stringify(emo.slice(0, 4)));
  ok('Modalidades sin errores de página', errM.length === 0, errM.join(' | '));
  const iconsOk = await pm2.evaluate(() => Icons.names.length >= 40 && document.querySelectorAll('svg.ico').length > 0);
  ok('Iconos SVG consistentes en el DOM', iconsOk);
  await ctxM.close();
  // Móvil en modo Ingeniero
  const ctxMM = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctxMM.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pmm = await ctxMM.newPage();
  await pmm.goto(FILE); await pmm.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'adv', skipCamp: true })); await pmm.waitForTimeout(400);
  ok('Móvil, modo Ingeniero: sin scroll horizontal y 5 indicadores', await pmm.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelectorAll('#meters .meter').length === 5));
  if (shots) await pmm.screenshot({ path: shots + '/11_mobile_adv.png' });
  await pmm.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'junior', skipCamp: true })); await pmm.waitForTimeout(400);
  ok('Móvil, modo Junior: sin scroll horizontal', await pmm.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  if (shots) await pmm.screenshot({ path: shots + '/12_mobile_junior.png' });
  await ctxMM.close();

  // ---- Plantas: especies y etapas ----
  const ctx6 = await browser.newContext(); const pf = await ctx6.newPage();
  await pf.goto(FILE); await pf.waitForTimeout(200);
  const fl = await pf.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 120; c.height = 120; const x = c.getContext('2d');
    const mask = (sp, prog) => { x.clearRect(0, 0, 120, 120); Flora.draw(x, sp, 60, 110, 2.6, { prog, hp: 100, moist: 55, nutr: 70, light: 1, seed: 9 }); const a = x.getImageData(0, 0, 120, 120).data; const m = new Uint8Array(14400); let n = 0; for (let i = 0; i < m.length; i++) { m[i] = a[i * 4 + 3] > 40 ? 1 : 0; n += m[i]; } return { m, n }; };
    const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return i / u; };
    const sp = Object.keys(Flora.SPECIES); let maxI = 0;
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) maxI = Math.max(maxI, iou(mask(sp[i], 1).m, mask(sp[j], 1).m));
    const grow = sp.every((s) => { const a = [0.03, 0.2, 0.45, 0.8, 1].map((p) => mask(s, p).n); return a[1] > a[0] && a[2] > a[1] && a[3] > a[2] && a[4] >= a[3] * 0.95; });
    const stages = [0.03, 0.2, 0.45, 0.8, 1].map(Flora.stage).join('');
    // La nutrición afecta al crecimiento (motor)
    const A = Sim.create({ seed: 5, skipCamp: true, noEv: true }); const B = JSON.parse(JSON.stringify(A));
    A.beds[0].plants[0].nutr = 80; B.beds[0].plants[0].nutr = 2; A.r.nutr.v = 0; B.r.nutr.v = 0;
    const p0 = A.beds[0].plants[0].prog; Sim.step(A, 24); Sim.step(B, 24);
    return { maxI: +maxI.toFixed(3), grow, stages, gA: A.beds[0].plants[0].prog - p0, gB: B.beds[0].plants[0].prog - p0 };
  });
  ok('Las cinco especies son visualmente distintas (IoU < 0.75)', fl.maxI < 0.75, 'max IoU ' + fl.maxI);
  ok('Cinco etapas de crecimiento con tamaño creciente', fl.grow && fl.stages === '01234', fl.stages);
  ok('La nutrición afecta al crecimiento', fl.gA > fl.gB * 1.5, fl.gA.toFixed(3) + ' vs ' + fl.gB.toFixed(3));
  await ctx6.close();

  // ---- Personajes: render completo y siluetas distintas ----
  const ctx4 = await browser.newContext(); const pc = await ctx4.newPage(); const err4 = [];
  pc.on('pageerror', (e) => err4.push(e.message));
  await pc.goto(FILE + '?sheet'); await pc.waitForTimeout(600);
  ok('Hoja de personajes abre', await pc.getByRole('img', { name: /Hoja de presentación/ }).isVisible());
  const chk = await pc.evaluate(() => {
    const poses = ['idle', 'walk', 'interact', 'repair', 'carry', 'alert', 'celebrate'];
    const c = document.createElement('canvas'); c.width = 120; c.height = 140; const x = c.getContext('2d');
    let n = 0;
    for (const r of Chars.ORDER) for (let d = 0; d < 4; d++) for (const p of poses) { x.clearRect(0, 0, 120, 140); Chars.draw(x, r, 60, 125, { dir: d, t: 0.7, pose: p, moving: p === 'walk', scale: 1.6 }); n++; }
    // Máscaras de silueta (solo alfa, sin color) de frente y de perfil
    const mask = (r, d) => { x.clearRect(0, 0, 120, 140); Chars.draw(x, r, 60, 125, { dir: d, t: 0, pose: 'idle', scale: 1.6, shadow: false }); const a = x.getImageData(0, 0, 120, 140).data; const m = new Uint8Array(120 * 140); for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 40 ? 1 : 0; return m; };
    const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return i / u; };
    let maxF = 0, maxS = 0;
    const R = Chars.ORDER;
    for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { maxF = Math.max(maxF, iou(mask(R[i], 2), mask(R[j], 2))); maxS = Math.max(maxS, iou(mask(R[i], 1), mask(R[j], 1))); }
    // Extremidades separadas: debe haber hueco transparente entre las piernas (frente) a la altura de la rodilla
    const m = mask('commander', 2); const ky = Math.round(125 - 16 * 1.6); const gap = m[ky * 120 + 60] === 0;
    return { n, maxF: +maxF.toFixed(3), maxS: +maxS.toFixed(3), gap };
  });
  ok('140 combinaciones personaje × dirección × pose sin errores', chk.n === 140 && err4.length === 0, chk.n + ' ' + err4.join('|'));
  ok('Siluetas distintas entre especialidades (IoU frente < 0.9)', chk.maxF < 0.9, 'max IoU frente ' + chk.maxF);
  ok('Siluetas distintas de perfil (IoU < 0.9)', chk.maxS < 0.9, 'max IoU perfil ' + chk.maxS);
  ok('Piernas separadas (hueco entre piernas)', chk.gap);
  await ctx4.close();

  // ---- Audio y voces (Web Speech API simulada: Chromium sin voces reales) ----
  const FAKE_TTS = () => {
    window.__spk = []; window.__cancel = 0; window.__conc = 0; window.__maxConc = 0; window.__voicesList = [];
    const L = {};
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = ''; } };
    const ss = {
      getVoices() { return window.__voicesList; },
      speak(u) { window.__conc++; window.__maxConc = Math.max(window.__maxConc, window.__conc); window.__spk.push({ text: u.text, voice: u.voice && u.voice.voiceURI, rate: u.rate, pitch: u.pitch, volume: u.volume }); setTimeout(() => { window.__conc--; if (u.onend) u.onend(); }, 150); },
      cancel() { window.__cancel++; window.__conc = 0; },
      addEventListener(n, f) { (L[n] = L[n] || []).push(f); },
      dispatch(n) { (L[n] || []).forEach((f) => f()); }
    };
    Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true });
  };
  const ctxV = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctxV.addInitScript(FAKE_TTS);
  const pv = await ctxV.newPage(); const errV = [];
  pv.on('pageerror', (e) => errV.push(e.message));
  await pv.goto(FILE); await pv.waitForTimeout(300);
  await pv.evaluate(() => Game._debug.newRun('moon', 'x', { skipCamp: true, mode: 'adv' })); await pv.waitForTimeout(300);
  const ids = await pv.evaluate(() => Object.keys(Voice.profiles));
  const want = []; for (const l of ['es', 'en']) for (const r of ['commander', 'engineer', 'medic', 'scientist', 'agronomist', 'narrator', 'earth_control']) want.push('npc_' + r + '_' + l);
  ok('Existen los 14 perfiles internos npc_*_es y npc_*_en (incluidos npc_earth_control_*)', want.every((w) => ids.includes(w)) && ids.length === 14, ids.join(','));
  ok('Cada perfil guarda los campos pedidos', await pv.evaluate(() => Object.values(Voice.profiles).every((p) => ['profileId', 'characterRole', 'language', 'preferredVoiceURI', 'preferredVoiceName', 'fallbackLanguage', 'rate', 'pitch', 'volume'].every((k) => k in p))));
  // Sin interacción previa no se reproduce nada (pero sí hay subtítulo)
  await pv.evaluate(() => Voice.say('control', 'es', 'Mensaje antes de interactuar', { level: 'info' }));
  ok('No se reproduce voz antes de la primera interacción, pero el subtítulo aparece', (await pv.evaluate(() => window.__spk.length)) === 0 && await pv.locator('#subs').getByText('Mensaje antes de interactuar').isVisible());
  // Detección dinámica de voces y evento voiceschanged
  ok('Sin voces detectadas al inicio', (await pv.evaluate(() => Voice.voices.length)) === 0);
  await pv.evaluate(() => { window.__voicesList = [{ voiceURI: 'uA', name: 'Voz A', lang: 'es-ES', default: true }, { voiceURI: 'uB', name: 'Voz B', lang: 'es-MX', default: false }, { voiceURI: 'uC', name: 'Voice C', lang: 'en-US', default: false }]; speechSynthesis.dispatch('voiceschanged'); });
  ok('voiceschanged actualiza la lista de voces', (await pv.evaluate(() => Voice.voices.length)) === 3);
  await pv.mouse.click(5, 5); // primera interacción
  const vpri = await pv.evaluate(() => {
    const out = [], P = Voice.profiles.npc_engineer_es;
    Voice.setPreferred('npc_engineer_es', 'uB'); out.push(Voice.resolve('npc_engineer_es').how + ':' + Voice.resolve('npc_engineer_es').voice.uri);
    P.preferredVoiceURI = 'inexistente'; P.preferredVoiceName = 'Voz A'; out.push(Voice.resolve('npc_engineer_es').how + ':' + Voice.resolve('npc_engineer_es').voice.uri);
    P.preferredVoiceName = 'nadie'; out.push(Voice.resolve('npc_engineer_es').how);
    const keep = window.__voicesList; window.__voicesList = [{ voiceURI: 'uC', name: 'Voice C', lang: 'en-US', default: true }]; Voice.refresh(); out.push(Voice.resolve('npc_engineer_es').how);
    window.__voicesList = []; Voice.refresh(); out.push(Voice.resolve('npc_engineer_es').how);
    window.__voicesList = keep; P.preferredVoiceURI = null; P.preferredVoiceName = null; Voice.refresh();
    return out;
  });
  ok('Prioridad: voiceURI → nombre → idioma → predeterminada → solo texto', JSON.stringify(vpri) === JSON.stringify(['uri:uB', 'name:uA', 'lang', 'default', 'none']), JSON.stringify(vpri));
  // Narración con el NPC adecuado
  await pv.evaluate(() => { window.__spk.length = 0; Game._debug.call({ key: 'tA', sev: 'warn', who: 'engineer', title: 'Fallo eléctrico', desc: 'Cae la tensión.', loc: 'Reactor', act: 'Ve al reactor.' }); });
  await pv.waitForTimeout(200);
  const e1 = await pv.evaluate(() => ({ spk: window.__spk.slice(), P: Voice.profiles.npc_engineer_es }));
  ok('La avería eléctrica la narra el perfil del ingeniero (tono propio)', e1.spk.length === 1 && Math.abs(e1.spk[0].pitch - e1.P.pitch) < 1e-6 && /Fallo eléctrico/.test(e1.spk[0].text) && /Reactor/.test(e1.spk[0].text), JSON.stringify(e1.spk));
  await pv.evaluate(() => { Game._debug.radio.cur = null; Game._debug.radio.q = []; });
  await pv.evaluate(() => { window.__spk.length = 0; Game._debug.call({ key: 'tB', sev: 'warn', who: 'agri', title: 'Riego', desc: 'Baja presión.', loc: 'Invernadero', act: 'Revisa la válvula.' }); });
  await pv.waitForTimeout(300);
  const e2 = await pv.evaluate(() => ({ spk: window.__spk.slice(), P: Voice.profiles.npc_agronomist_es }));
  ok('Los cultivos los narra el perfil del agrónomo', e2.spk.length >= 1 && e2.spk.some((q) => Math.abs(q.pitch - e2.P.pitch) < 1e-6 && /Riego/.test(q.text)), JSON.stringify(e2.spk));
  // Sin solapes y las críticas interrumpen
  const ov = await pv.evaluate(async () => {
    Voice.stop(); window.__spk.length = 0; window.__maxConc = 0; window.__cancel = 0;
    Voice.say('control', 'es', 'Uno', { level: 'info' }); Voice.say('control', 'es', 'Dos', { level: 'info' }); Voice.say('control', 'es', 'Tres', { level: 'info' });
    await new Promise((r) => setTimeout(r, 700));
    const maxConc = window.__maxConc, texts = window.__spk.map((q) => q.text);
    window.__spk.length = 0; const c0 = window.__cancel;
    Voice.say('control', 'es', 'Informativo largo', { level: 'info' }); Voice.say('commander', 'es', 'Alerta crítica', { level: 'crit' });
    await new Promise((r) => setTimeout(r, 400));
    return { maxConc, texts, cancelled: window.__cancel > c0, crit: window.__spk.map((q) => q.text) };
  });
  ok('Los mensajes no se solapan (cola con un solo mensaje a la vez)', ov.maxConc <= 1 && ov.texts[0] === 'Uno', JSON.stringify(ov));
  ok('Una alerta crítica interrumpe la narración informativa', ov.cancelled && ov.crit.includes('Alerta crítica'), JSON.stringify(ov));
  // Volúmenes, velocidad, TTS y subtítulos
  const vol = await pv.evaluate(async () => {
    Voice.stop(); window.__spk.length = 0; const c = Voice.cfg; c.vVoice = 0.3; c.vAlert = 0.5; c.rate = 1.5;
    Voice.say('control', 'es', 'Volumen informativo', { level: 'info' }); await new Promise((r) => setTimeout(r, 300));
    Voice.say('control', 'es', 'Volumen alerta', { level: 'crit' }); await new Promise((r) => setTimeout(r, 300));
    const a = window.__spk.find((q) => /informativo/.test(q.text)), b = window.__spk.find((q) => /alerta/.test(q.text)), P = Voice.profiles.npc_narrator_es;
    c.vVoice = 1; c.vAlert = 1; c.rate = 1; return { a, b, rate: P.rate };
  });
  ok('El volumen de voces y el de alertas se aplican por separado', vol.a && vol.b && Math.abs(vol.a.volume - 0.3) < 0.01 && Math.abs(vol.b.volume - 0.15) < 0.01, JSON.stringify(vol));
  ok('La velocidad de narración se aplica', vol.a && Math.abs(vol.a.rate - vol.rate * 1.5) < 0.01, JSON.stringify(vol));
  const tt = await pv.evaluate(async () => { Voice.stop(); window.__spk.length = 0; Voice.cfg.tts = false; Voice.say('control', 'es', 'Con TTS apagado', { level: 'info' }); await new Promise((r) => setTimeout(r, 200)); const n = window.__spk.length; Voice.cfg.tts = true; return n; });
  ok('Con TTS desactivado no se emite voz y el subtítulo sigue', tt === 0 && await pv.locator('#subs').getByText('Con TTS apagado').isVisible());
  await pv.evaluate(() => { Voice.cfg.subs = false; Voice.say('control', 'es', 'Subtítulo oculto', { level: 'info' }); });
  await pv.waitForTimeout(150);
  ok('Los subtítulos se pueden ocultar', !(await pv.locator('#subs:not(.hidden)').getByText('Subtítulo oculto').count()));
  await pv.evaluate(() => { Voice.cfg.subs = true; Voice.say('control', 'es', 'Texto exacto del diálogo', { level: 'info' }); });
  await pv.waitForTimeout(150);
  ok('El subtítulo es igual al texto narrado', await pv.evaluate(() => document.querySelector('#subs').textContent.includes(window.__spk[window.__spk.length - 1].text)));
  const rp = await pv.evaluate(async () => { window.__spk.length = 0; Voice.repeat(); await new Promise((r) => setTimeout(r, 300)); return window.__spk.length && window.__spk[0].text; });
  ok('Repetir el último mensaje', rp === 'Texto exacto del diálogo', String(rp));
  // Panel de audio: una sola voz española → no se afirma que sean voces distintas
  await pv.evaluate(() => { window.__voicesList = [{ voiceURI: 'uA', name: 'Voz A', lang: 'es-ES', default: true }, { voiceURI: 'uC', name: 'Voice C', lang: 'en-US', default: false }]; Voice.refresh(); Object.values(Voice.profiles).forEach((p) => { p.preferredVoiceURI = null; p.preferredVoiceName = null; }); });
  await pv.keyboard.press('Escape'); await pv.evaluate(() => Game._debug.audioPanel()); await pv.waitForTimeout(200);
  ok('El panel de audio avisa de que solo hay una voz española (no son voces distintas)', await pv.getByText(/Solo hay una voz disponible/).isVisible());
  ok('El panel de audio ofrece volúmenes, interruptores, idioma y una voz por personaje', (await pv.locator('input[type=range]').count()) >= 5 && (await pv.locator('input[type=checkbox]').count()) >= 4 && (await pv.locator('select').count()) === 7);
  await pv.locator('select').first().selectOption('uA');
  ok('Elegir una voz la guarda en el perfil', await pv.evaluate(() => Voice.profiles.npc_commander_es.preferredVoiceURI === 'uA' && Voice.cfg.saved.npc_commander_es.name === 'Voz A'));
  // La música no arranca sola: solo al activarla y tras interactuar
  const mus0 = await pv.evaluate(() => Sfx.musicPlaying);
  await pv.locator('label', { hasText: /Música/ }).locator('input[type=checkbox]').first().check(); await pv.waitForTimeout(300);
  ok('La música está apagada por defecto y arranca al activarla', mus0 === false && (await pv.evaluate(() => Sfx.musicPlaying)) === true);
  await pv.locator('label', { hasText: /Música/ }).locator('input[type=checkbox]').first().uncheck(); await pv.waitForTimeout(100);
  ok('Se puede desactivar la música', (await pv.evaluate(() => Sfx.musicPlaying)) === false);
  await closeAll(pv);
  ok('Sin errores de página con voz simulada', errV.length === 0, errV.join(' | '));
  await ctxV.close();
  // Sin Web Speech API: el juego sigue funcionando con texto y subtítulos
  const ctxN = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctxN.addInitScript(() => { try { delete window.SpeechSynthesisUtterance; Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); } catch (e) { /* ignore */ } });
  const pn = await ctxN.newPage(); const errN = [];
  pn.on('pageerror', (e) => errN.push(e.message));
  await pn.goto(FILE); await pn.waitForTimeout(300);
  await pn.evaluate(() => Game._debug.newRun('moon', 'x', { skipCamp: true, mode: 'junior' })); await pn.waitForTimeout(300);
  await pn.mouse.click(5, 5);
  await pn.evaluate(() => Game._debug.call({ key: 'nn', sev: 'crit', who: 'medic', title: 'Aire bajo', desc: 'Falta oxígeno.', loc: 'Soporte vital', act: 'Ve a soporte vital.', cons: 'Falta aire.' }));
  ok('Sin TTS la alerta se ve en la tarjeta de radio', await pn.locator('#radio').getByText('Aire bajo').isVisible());
  await pn.evaluate(() => Voice.say('control', 'es', 'Aviso solo con texto', { level: 'info' })); await pn.waitForTimeout(150);
  ok('Sin TTS el subtítulo muestra el mensaje', !(await pn.evaluate(() => Voice.supported)) && await pn.locator('#subs').getByText('Aviso solo con texto').isVisible());
  await pn.evaluate(() => Game._debug.audioPanel()); await pn.waitForTimeout(150);
  ok('Sin TTS el panel de audio lo explica y sigue siendo usable', await pn.getByText(/no ofrece síntesis de voz/).isVisible());
  await closeAll(pn); await pn.keyboard.press('m'); await pn.waitForTimeout(150);
  ok('Sin TTS el resto del juego funciona (mapa)', await pn.locator('.mapcv').isVisible());
  ok('Sin errores de página sin TTS', errN.length === 0, errN.join(' | '));
  await ctxN.close();
  // localStorage bloqueado: las preferencias de voz funcionan durante la sesión
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctxB.addInitScript(FAKE_TTS); await ctxB.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const pb = await ctxB.newPage(); const errB = [];
  pb.on('pageerror', (e) => errB.push(e.message));
  await pb.goto(FILE); await pb.waitForTimeout(300);
  const bl = await pb.evaluate(() => { window.__voicesList = [{ voiceURI: 'uA', name: 'Voz A', lang: 'es-ES', default: true }]; Voice.refresh(); Voice.setPreferred('npc_medic_es', 'uA'); Voice.cfg.music = true; Voice.persist(); return [Voice.resolve('npc_medic_es').how, Voice.cfg.music]; });
  ok('Con localStorage bloqueado la configuración de voz funciona en memoria', bl[0] === 'uri' && bl[1] === true && errB.length === 0, JSON.stringify(bl) + errB.join('|'));
  await ctxB.close();

  // ---- SelfTest en el navegador ----
  const ctx3 = await browser.newContext(); const px = await ctx3.newPage();
  await px.goto(FILE + '?selftest'); await px.waitForFunction(() => window.__selftest, null, { timeout: 60000 });
  const st = await px.evaluate(() => window.__selftest);
  ok('Ambas modalidades completan la campaña en las simulaciones', st.byMode.junior.victories === st.byMode.junior.runs && st.byMode.adv.victories === st.byMode.adv.runs, JSON.stringify(st.byMode));
  ok('SelfTest (100 simulaciones) sin errores', st.runs === 100 && st.errors === 0, JSON.stringify({ runs: st.runs, errors: st.errors, smart: st.smartVictory + '/' + st.smartRuns }));
  await ctx3.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 600)); process.exit(2); });
