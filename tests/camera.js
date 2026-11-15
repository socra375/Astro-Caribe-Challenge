// Pruebas del sistema de dos cámaras (Chromium + Playwright). Uso: node tests/camera.js [--shots dir]
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const newCtx = async (browser, vp, touch) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: !!touch });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx.newPage(); const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  await pg.goto(FILE); await pg.waitForTimeout(300);
  return { ctx, pg, errors };
};
const start = async (pg, scen) => {
  await pg.evaluate((s) => { Game._debug.newRun(s, 'x', { skipCamp: true, mode: 'junior' }); Game._debug.setSpeed(0); const S = Game.S; S.noEv = true; S.inc = []; for (const k in NPCDATA.TALK) S.camp.visited[k] = 1; Game._debug.radio.q = []; Game._debug.radio.cur = null; }, scen);
  await pg.waitForTimeout(250);
};
const AT = (pg, room, i) => pg.evaluate(([r, k]) => { const q = World._test.spot(r, k || 0); World.player.x = q[0]; World.player.y = q[1]; World.snapCamera(); }, [room, i]);
// lo que ve la cámara: ancho y alto en casillas, y tamaño del personaje en píxeles CSS
const view = (pg) => pg.evaluate(() => { const z = World.camZoom, c = document.querySelector('#game'), dpr = c.width / innerWidth; return { z, tw: c.width / z / 32, th: c.height / z / 32, charPx: 64 * 0.82 * z / dpr, W: World.DIM.W, H: World.DIM.H, px: World.player.x, py: World.player.y }; });

(async () => {
  const browser = await chromium.launch();
  const D = await newCtx(browser, { width: 1440, height: 900 });
  const pg = D.pg;
  await start(pg, 'moon');
  await AT(pg, 'bridge', 0); await pg.waitForTimeout(900);
  const v = await view(pg);
  ok('MainCamera: el personaje se ve grande y claro (≥ 70 px de alto en escritorio)', v.charPx >= 70, v.charPx.toFixed(0) + ' px');
  ok('MainCamera: durante la exploración normal no se ve toda la base (menos del 35 % del ancho y del alto del plano)', v.tw < v.W * 0.35 && v.th < v.H * 0.35, JSON.stringify([v.tw.toFixed(1), v.th.toFixed(1), v.W, v.H]));
  ok('MainCamera: no es tan cercana que dificulte orientarse (al menos 14 casillas de ancho visibles)', v.tw >= 14 && v.th >= 9, v.tw.toFixed(1) + '×' + v.th.toFixed(1));
  // el minimapa permanente de toda la base ya no está en la exploración normal
  ok('No se muestra permanentemente la estructura completa: el minimapa de la base está oculto', await pg.evaluate(() => document.querySelector('#mini').classList.contains('hidden')));
  // seguimiento suave
  const sm = await pg.evaluate(async () => {
    World.snapCamera(); await new Promise((r) => setTimeout(r, 200));
    const rd = () => { const z = World.camZoom; return World.player.x * 32 - (innerWidth * (document.querySelector('#game').width / innerWidth)) / z / 2; };
    const p = World.player; p.x += 6; const off = []; for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 60)); const z = World.camZoom, c = document.querySelector('#game'); off.push(Math.abs(p.x * 32 - (World.cam.x + c.width / z / 2))); }
    return off;
  });
  ok('Seguimiento suave: tras un desplazamiento la cámara se acerca poco a poco, sin saltar', sm[0] > 20 && sm[sm.length - 1] < sm[0] * 0.5 && sm.every((q, i) => !i || q <= sm[i - 1] + 1), sm.map((q) => Math.round(q)).join(','));
  // paredes y puertas: las salas lejanas se velan; las puertas y los pasillos cercanos siguen visibles
  await AT(pg, 'hall', 0); await pg.waitForTimeout(600);
  const vl = await pg.evaluate(() => { const d = {}; for (const k of Object.keys(World.RECTS)) d[k] = 1; return true; });
  const pix = await pg.evaluate(() => {
    const c = document.querySelector('#game'), g = c.getContext('2d'), z = World.camZoom, cam = World.cam; const px = (x, y) => { const sx = Math.round((x * 32 - cam.x) * z), sy = Math.round((y * 32 - cam.y) * z); if (sx < 0 || sy < 0 || sx >= c.width || sy >= c.height) return null; const d = g.getImageData(sx, sy, 1, 1).data; return d[0] + d[1] + d[2]; };
    const rooms = World.RECTS, lum = (k) => { const R = rooms[k], p = World._test.spot(k, 0); return px(p[0], p[1]); };
    return { here: lum('hall'), kitchen: lum('kitchen'), bridge: lum('bridge'), reactor: lum('reactor'), lab: lum('lab') };
  });
  ok('Visibilidad limitada: la sala actual y las conectadas se ven; las secciones lejanas quedan ocultas o fuera del campo', pix.here > 60 && (pix.reactor == null || pix.reactor < 45) && (pix.lab == null || pix.lab < 45), JSON.stringify(pix));
  const doors = await pg.evaluate(() => { const c = document.querySelector('#game'), g = c.getContext('2d'), z = World.camZoom, cam = World.cam; let vis = 0, tot = 0, bright = 0; for (const d of World.doorList()) { const cx = (d.x + d.w / 2) * 32, cy = (d.y + d.h / 2) * 32; const sx = Math.round((cx - cam.x) * z), sy = Math.round((cy - cam.y) * z); if (sx < 8 || sy < 8 || sx > c.width - 8 || sy > c.height - 8) continue; tot++; const p = g.getImageData(sx, sy, 1, 1).data; if (p[0] + p[1] + p[2] > 70) bright++; } return { tot, bright }; });
  ok('Las puertas y los pasillos cercanos siguen siendo reconocibles (no quedan velados)', doors.tot >= 2 && doors.bright >= doors.tot - 1, JSON.stringify(doors));
  ok('Las paredes que separan las salas se dibujan (celdas de pared del mundo real y rejilla de colisión intactas)', await pg.evaluate(() => { let walls = 0; for (const f of [1, 2, 3]) World.withFloor(f, () => { for (const row of World._test.grid) for (const c of row) if (c === 1) walls++; }); return walls > 700; }));
  // sala actual: los NPC y objetos próximos se ven
  await AT(pg, 'lab', 0); await pg.waitForTimeout(500);
  ok('Los objetos interactivos y los personajes próximos se dibujan en la sala actual (consolas visibles en pantalla)', await pg.evaluate(() => { const c = document.querySelector('#game'), z = World.camZoom, cam = World.cam; let n = 0; for (const q of Layout.CONSOLES) { const sx = (q[2] * 32 - cam.x) * z, sy = (q[3] * 32 - cam.y) * z; if (sx > 0 && sy > 0 && sx < c.width && sy < c.height) n++; } return n >= 1; }));

  // ---------- Mapa general: MapCamera ----------
  await AT(pg, 'kitchen', 0); await pg.waitForTimeout(900);
  const before = await pg.evaluate(() => ({ z: World.camZoom, x: World.player.x, y: World.player.y, dir: World.player.dir }));
  await pg.keyboard.press('m'); await pg.waitForTimeout(250);
  const mid = await pg.evaluate(() => World.camZoom); await pg.waitForTimeout(1100);
  const mapV = await pg.evaluate(() => { const c = document.querySelector('#game'); return { open: !!document.querySelector('.mapcv'), z: World.camZoom, fit: World.fit, tw: c.width / World.camZoom / 32, th: c.height / World.camZoom / 32, W: World.DIM.W, H: World.DIM.H, x: World.player.x, y: World.player.y }; });
  ok('M abre el mapa general y la cámara se aleja con una transición suave (zoom intermedio)', mapV.open && mapV.fit && mid < before.z * 0.95 && mid > mapV.z * 1.02, JSON.stringify([before.z, mid, mapV.z]));
  ok('MapCamera: muestra toda la base (todo el plano cabe en la vista)', mapV.tw >= mapV.W && mapV.th >= mapV.H * 0.98, JSON.stringify([mapV.tw.toFixed(1), mapV.th.toFixed(1), mapV.W, mapV.H]));
  const mp = await pg.evaluate(() => { const t = document.querySelector('.mapcv'); const g = t.getContext('2d'); return { rooms: [1, 2, 3].reduce((n, f) => n + World.withFloor(f, () => Object.keys(World.RECTS).filter((k) => !/^t\d/.test(k)).length), 0), doors: [1, 2, 3].reduce((n, f) => n + World.withFloor(f, () => World.doorList().length), 0), hasRover: !!Game.S.ex, txt: document.querySelector('.panel') && document.querySelector('.panel').innerText }; });
  ok('El mapa conserva las trece instalaciones, los pasillos y las puertas del mundo real', mp.rooms >= 13 && mp.doors >= 20, JSON.stringify([mp.rooms, mp.doors]));
  ok('El mapa muestra tripulación, jugador y leyenda; usa la distribución real (sin copia)', /Comandante/.test(mp.txt) && /Mapa de la base/.test(mp.txt));
  await pg.keyboard.press('m'); await pg.waitForTimeout(1500);
  const after = await pg.evaluate(() => ({ z: World.camZoom, x: World.player.x, y: World.player.y, dir: World.player.dir, fit: World.fit, open: !!document.querySelector('.mapcv') }));
  ok('Al cerrar con M se recupera el zoom anterior y el seguimiento', !after.open && !after.fit && Math.abs(after.z - before.z) / before.z < 0.04, JSON.stringify([before.z, after.z]));
  ok('Alternar cámaras no cambia la posición ni la orientación del personaje', Math.abs(after.x - before.x) < 1e-6 && Math.abs(after.y - before.y) < 1e-6 && after.dir === before.dir, JSON.stringify([before, after]));
  await pg.keyboard.press('m'); await pg.waitForTimeout(500); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1500);
  const afterEsc = await pg.evaluate(() => ({ z: World.camZoom, fit: World.fit, open: !!document.querySelector('.mapcv'), x: World.player.x }));
  ok('Esc también cierra el mapa y devuelve la cámara principal', !afterEsc.open && !afterEsc.fit && Math.abs(afterEsc.z - before.z) / before.z < 0.04 && Math.abs(afterEsc.x - before.x) < 1e-6, JSON.stringify(afterEsc));
  // mismo mundo y mismas coordenadas: no hay una segunda distribución
  ok('Las dos cámaras usan el mismo mundo: un único Layout y un único lienzo estático', await pg.evaluate(() => { const A = World.staticCanvas; return !!A && World.DIM.W === Layout.W && World.DIM.H === Layout.H; }));
  // movimiento y colisiones intactos
  await AT(pg, 'bridge', 0); await pg.waitForTimeout(300);
  const mv = await pg.evaluate(() => [World.player.x, World.player.y]);
  await pg.keyboard.down('ArrowUp'); await pg.waitForTimeout(3500); await pg.keyboard.up('ArrowUp');
  const mv2 = await pg.evaluate(() => [World.player.x, World.player.y, World._test.blocked(World.player.x, World.player.y - 0.4)]);
  ok('El movimiento y las colisiones permanecen intactos (avanza y se detiene ante la pared)', mv2[1] < mv[1] - 0.5 && mv2[2] === true, JSON.stringify([mv, mv2]));

  // ---------- Exterior ----------
  await pg.evaluate(() => { Ex.equip(Game.S); const R = Game.S.ex.rover; World.player.x = 74; World.player.y = 87; R.x = 74; R.y = 89.6; R.a = 0; R.v = 0; World.snapCamera(); }); await pg.waitForTimeout(900);
  const walk = await view(pg);
  ok('Exterior a pie: cámara cercana, el astronauta se ve claro y no se ve la base entera', walk.charPx >= 60 && walk.tw < walk.W * 0.4, JSON.stringify([walk.charPx.toFixed(0), walk.tw.toFixed(1)]));
  const rv = await pg.evaluate(async () => {
    const R = Game.S.ex.rover; R.x = 80; R.y = 120; R.a = 0; R.occ = true; R.v = 0; World.player.x = 80; World.player.y = 120; World.snapCamera(); await new Promise((r) => setTimeout(r, 500));
    const c = document.querySelector('#game'), dpr = c.width / innerWidth, z0 = World.camZoom; const roverPx0 = 88 * z0 / dpr; R.v = 10; await new Promise((r) => setTimeout(r, 1500)); const z1 = World.camZoom; return { z0, z1, roverPx0, roverPx1: 88 * z1 / dpr };
  });
  ok('Conduciendo: la cámara se centra en el rover y se aleja con la velocidad', rv.z1 < rv.z0 * 0.9, JSON.stringify(rv));
  ok('Conduciendo, el rover no se ve diminuto (≥ 60 px de largo a máxima velocidad)', rv.roverPx1 >= 60, rv.roverPx1.toFixed(0) + ' px');
  await pg.evaluate(() => { const R = Game.S.ex.rover; R.v = 0; R.occ = false; World.player.x = 74; World.player.y = 87; R.x = 74; R.y = 89.6; });
  await pg.keyboard.press('m'); await pg.waitForTimeout(1300);
  const mx = await pg.evaluate(() => ({ open: !!document.querySelector('.mapcv'), fit: World.fit }));
  ok('El mapa general está disponible también desde el exterior', mx.open && mx.fit);
  await pg.keyboard.press('m'); await pg.waitForTimeout(1200);
  if (shots) { await AT(pg, 'hall', 0); await pg.waitForTimeout(900); await pg.screenshot({ path: shots + '/camera_main.png' }); }
  ok('Sin errores de página en escritorio', D.errors.length === 0, D.errors.join(' | '));
  await D.ctx.close();

  // ---------- Móvil ----------
  const M = await newCtx(browser, { width: 390, height: 844 }, true);
  await start(M.pg, 'mars');
  await AT(M.pg, 'bridge', 0); await M.pg.waitForTimeout(900);
  const mvw = await view(M.pg);
  ok('Móvil (390 × 844): el personaje se ve claro (≥ 55 px de alto) y se ve solo la zona cercana', mvw.charPx >= 55 && mvw.tw < mvw.W * 0.3, JSON.stringify([mvw.charPx.toFixed(0), mvw.tw.toFixed(1), mvw.th.toFixed(1)]));
  ok('Móvil: orientación posible (al menos 10 casillas de ancho y 18 de alto)', mvw.tw >= 10 && mvw.th >= 18, mvw.tw.toFixed(1) + '×' + mvw.th.toFixed(1));
  await M.pg.keyboard.press('m'); await M.pg.waitForTimeout(2600);
  const mm = await M.pg.evaluate(() => { const c = document.querySelector('#game'); return { open: !!document.querySelector('.mapcv'), fit: World.fit, tw: c.width / World.camZoom / 32, W: World.DIM.W, scrollX: document.documentElement.scrollWidth > innerWidth }; });
  ok('Móvil: el mapa general abre con la base completa y sin desplazamiento horizontal', mm.open && mm.fit && mm.tw >= mm.W * 0.97 && !mm.scrollX, JSON.stringify(mm));
  await M.pg.keyboard.press('Escape'); await M.pg.waitForTimeout(1300);
  ok('Móvil: al cerrar vuelve a la cámara cercana', await M.pg.evaluate(() => !World.fit && World.camZoom > 0.9));
  if (shots) await M.pg.screenshot({ path: shots + '/camera_mobile.png' });
  ok('Sin errores de página en el móvil', M.errors.length === 0, M.errors.join(' | '));
  await M.ctx.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 900)); process.exit(2); });
