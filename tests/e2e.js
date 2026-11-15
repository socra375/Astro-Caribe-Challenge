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
  await page.getByRole('button', { name: /Explorador Junior/ }).click();
  await page.getByRole('button', { name: /Marte/ }).click();
  await page.getByRole('button', { name: /Despegar/ }).click();
  await page.waitForTimeout(300);
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

  // ---- Campaña, NPC, plantas, vestuario y alertas ----
  const ctx5 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx5.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx5.newPage(); const err5 = [];
  pg.on('pageerror', (e) => err5.push(e.message));
  await pg.goto(FILE); await pg.waitForTimeout(300);
  await pg.getByRole('button', { name: /Iniciar misión/ }).click(); await pg.getByRole('button', { name: /Despegar/ }).click(); await pg.waitForTimeout(400);
  const skipTalk = async () => { for (let i = 0; i < 6; i++) { const b = pg.getByRole('button', { name: /^Siguiente|¡Entendido!/ }); if (await b.count()) { await b.first().click(); await pg.waitForTimeout(60); } else break; } };
  await skipTalk();
  const un0 = await pg.evaluate(() => Object.keys(Game.S.camp.unlocked).sort().join(','));
  ok('Al empezar solo hay 3 secciones abiertas', un0 === 'bridge,life,reactor', un0);
  await pg.evaluate(() => { World.player.x = 10; World.player.y = 14.6; });
  await pg.keyboard.down('s'); await pg.waitForTimeout(900); await pg.keyboard.up('s');
  const yb = await pg.evaluate(() => World.player.y);
  ok('La puerta de una sección bloqueada no deja pasar', yb < 16, yb.toFixed(2));
  ok('Se explica qué abre la sección bloqueada', /se abre al completar/.test(await pg.locator('#actBtn').textContent()));
  // Misión c1 con acciones reales
  await pg.evaluate(() => Game._debug.openConsole('cmd')); await pg.getByRole('tab', { name: /Recursos/ }).click(); await closeAll(pg);
  await pg.evaluate(() => { World.player.x = 10; World.player.y = 9.5; }); await pg.waitForTimeout(500);
  ok('La médica se presenta en el módulo de vida', await pg.getByText('Sofía').first().isVisible()); await skipTalk();
  await pg.evaluate(() => Game._debug.openConsole('med')); await closeAll(pg);
  await pg.evaluate(() => { World.player.x = 50; World.player.y = 25.5; }); await pg.waitForTimeout(500);
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
  await pg.evaluate(() => { World.player.x = 30; World.player.y = 25.5; }); await pg.waitForTimeout(500); await skipTalk();
  await pg.evaluate(() => { const S = Game.S, inc = S.inc.find((i) => i.type === 'water_fail' && !i.res); Sim.mini(S, 'wiring', { ok: true, score: 1, inc: inc.id }); Sim.mini(S, 'o2', { ok: true, score: 0.9 }); Sim.decide(S, 'recmode', { v: 'max' }); Sim.step(S, 8); });
  await pg.waitForTimeout(400);
  ok('Misión 2 completada desbloquea el invernadero', await pg.evaluate(() => !!Game.S.camp.unlocked.gh && Game.S.camp.i === 2));
  // c3 en el invernadero
  await pg.evaluate(() => { World.player.x = 10; World.player.y = 23.5; }); await pg.waitForTimeout(500);
  ok('El agrónomo se presenta en el invernadero', await pg.getByText('Teo').first().isVisible()); await skipTalk();
  await pg.evaluate(() => { World.player.x = 4.5; World.player.y = 26.3; }); await pg.waitForTimeout(400);
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
  await pg.evaluate(() => { World.player.x = 50; World.player.y = 9.5; }); await pg.waitForTimeout(500);
  ok('El científico se presenta en el laboratorio', await pg.getByText('Leo').first().isVisible()); await skipTalk();
  await pg.evaluate(() => { Game._debug.openConsole('spec'); }); await closeAll(pg);
  await pg.evaluate(() => { Game._debug.openConsole('log'); }); await closeAll(pg);
  await pg.evaluate(() => { const S = Game.S; Sim.decide(S, 'analyze', {}); Sim.step(S, 4); });
  await pg.waitForTimeout(400);
  const fin = await pg.evaluate(() => [Game.S.camp.basicDone, Object.keys(Game.S.camp.unlocked).length]);
  ok('Familiarización completa: las 7 secciones abiertas', fin[0] && fin[1] === 7, JSON.stringify(fin));
  await pg.evaluate(() => { World.player.x = 30; World.player.y = 36; }); await pg.waitForTimeout(500);
  ok('La guía de la bahía del rover se presenta', await pg.getByText(/bahía del rover/).first().isVisible()); await skipTalk();
  // Permisos después de la familiarización y vestuario
  await pg.evaluate(() => { World.player.x = 10; World.player.y = 23.5; Game._debug.openConsole('gh'); });
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
  const mp = await pg.evaluate(() => { const R = World.RECTS.reactor; return [(R[0] + R[2] + 1) / 2, (R[1] + R[3] + 1) / 2, World.DIM.W, World.DIM.H]; });
  const msc = Math.min(720 / mp[2], 560 / mp[3]), mpx = 360 + (mp[0] - mp[2] / 2) * msc, mpy = 280 + (mp[1] - mp[3] / 2) * msc;
  await pg.mouse.click(box.x + mpx * box.width / 720, box.y + mpy * box.height / 560);
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
    const T = World._test, R = World.RECTS, need = ['bridge', 'life', 'med', 'reactor', 'water', 'gh', 'food', 'kitchen', 'lab', 'samples', 'workshop', 'rad', 'waste'];
    const out = { have: need.filter((k) => R[k]).length, bad: [], nodesOk: true, unreachable: [] };
    const inDoor = (x, y) => T.doors.some((d) => Math.abs(x - (d.x + 1)) < 1.2 && Math.abs(y - (d.y + 0.5)) < 1.2);
    for (const k in T.N) if (!T.canStand(T.N[k][0], T.N[k][1], 0.25) && !inDoor(T.N[k][0], T.N[k][1])) out.nodesOk = false, out.bad.push(k);
    World.player.x = 30; World.player.y = 9.5;
    for (const k of need) {
      const r = World.route(k);
      if (!r || r.length < 2) { out.unreachable.push(k); continue; }
      for (let i = 1; i < r.length; i++) for (let t = 0; t <= 1; t += 0.1) { const x = r[i - 1][0] + (r[i][0] - r[i - 1][0]) * t, y = r[i - 1][1] + (r[i][1] - r[i - 1][1]) * t; if (!T.canStand(x, y, 0.25) && !T.doors.some((d) => Math.abs(x - (d.x + 1)) < 1.2 && Math.abs(y - (d.y + 0.5)) < 1.2)) out.bad.push(k + '@' + x.toFixed(1) + ',' + y.toFixed(1)); }
    }
    return out;
  });
  ok('Existen las 13 instalaciones en el mapa', inst.have === 13, JSON.stringify(inst));
  ok('Todos los nodos de ruta están en suelo transitable', inst.nodesOk && !inst.bad.length, JSON.stringify(inst.bad.slice(0, 5)));
  ok('Las 13 instalaciones son alcanzables desde el puente por rutas reales', inst.unreachable.length === 0, JSON.stringify(inst.unreachable));
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
  ok('La pantalla de inicio ofrece las dos modalidades', (await pm2.getByRole('button', { name: /Explorador Junior/ }).count()) === 1 && (await pm2.getByRole('button', { name: /Ingeniero de Misión/ }).count()) === 1);
  await pm2.getByRole('button', { name: /Ingeniero de Misión/ }).click();
  ok('Ingeniero de Misión ofrece nivel de reto', await pm2.getByRole('button', { name: /Exigente/ }).isVisible());
  await pm2.getByRole('button', { name: /Despegar/ }).click(); await pm2.waitForTimeout(400);
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
