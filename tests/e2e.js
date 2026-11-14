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
  ok('Guía del puente se presenta al empezar', await page.getByText('Control de Misión').first().isVisible());
  await page.getByRole('button', { name: 'Saltar' }).click();
  const scen = await page.evaluate(() => Game.S.scen + '/' + Game.S.diff);
  ok('Escenario y dificultad aplicados', scen === 'mars/engineer', scen);
  // Las pruebas de sistemas avanzados usan una partida con la familiarización ya completada
  await page.evaluate(() => Game._debug.newRun('mars', 'engineer', { skipCamp: true }));
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
  ok('Sin el especialista adecuado se explica y se dirige al vestuario', await page.getByRole('button', { name: /Marcar el vestuario/ }).isVisible());
  ok('La emergencia se puede reparar con cualquier especialista', await page.getByRole('button', { name: /Reparación de emergencia/ }).isVisible());
  await closeAll(page);
  await page.evaluate(() => { World.setPlayerRole('engineer'); Sim.setPlayerRole(Game.S, 'engineer'); });
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
  await page.evaluate(() => { World.setPlayerRole('commander'); Sim.setPlayerRole(Game.S, 'commander'); });
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
  ok('Llamada de radio ante el evento', await page.locator('#radio').isVisible());
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
  ok('Tras la familiarización, el invernadero pide al agrónomo', await pg.getByText(/Se necesita otro especialista/).isVisible());
  await closeAll(pg);
  await pg.evaluate(() => Game._debug.wardrobePanel());
  await pg.locator('.card', { hasText: 'Agrónomo' }).getByRole('button', { name: /Ponerse/ }).click();
  const rl = await pg.evaluate(() => [Game.S.playerRole, World.player.role, World._test.bots.map((b) => b.role).sort().join(',')]);
  ok('El vestuario cambia de especialista y el anterior queda como NPC', rl[0] === 'agri' && rl[1] === 'agri' && rl[2] === 'commander,engineer,medic,scientist', JSON.stringify(rl));
  await pg.evaluate(() => Game._debug.openConsole('gh'));
  ok('Con el traje correcto se abre el panel', await pg.getByRole('heading', { name: /Panel del invernadero/ }).isVisible());
  await closeAll(pg);
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
  ok('SelfTest (100 simulaciones) sin errores', st.runs === 100 && st.errors === 0, JSON.stringify({ runs: st.runs, errors: st.errors, smart: st.smartVictory + '/' + st.smartRuns }));
  await ctx3.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 600)); process.exit(2); });
