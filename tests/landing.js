// Pruebas de la llegada y el aterrizaje (Chromium + Playwright). Uso: node tests/landing.js [--shots dir]
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
/** Juega la llegada completa con atajos de velocidad. o: zone (1..4), lev, prio (1..3), ring ('perfect' | 'late'), speed. */
async function fly(pg, scen, o) {
  o = o || {};
  await pg.evaluate(({ s, m }) => { Game._debug.newRun(s, 'x', { mode: m }); }, { s: scen, m: o.mode || 'junior' });
  await pg.waitForFunction(() => Game._debug.land.on);
  await pg.evaluate(() => Game._debug.land.skipTrip());
  const sp = o.speed || 25; await pg.evaluate((v) => Game._debug.land.speed(v), sp);
  await pg.waitForSelector('.lbtn:not(.hidden)', { timeout: 20000 }); await pg.click('.lbtn');
  await pg.waitForSelector('.lpanel .choice'); const zi = o.zone || 1;
  await pg.click('.lpanel .choice:nth-of-type(' + zi + ')'); await pg.click('.lpanel .btn.primary');
  await pg.waitForSelector('.lpanel .btn.primary:not([disabled])', { timeout: 20000 }); await sleep(pg, 400);
  if (o.repair) { const b = await pg.$('.lpanel table .btn'); if (b) await b.click(); }
  await pg.click('.lpanel .btn.primary');
  if (o.ring) { await pg.evaluate(() => Game._debug.land.speed(1)); await pg.waitForSelector('.ign', { timeout: 30000 }); if (o.ring === 'perfect') await sleep(pg, 2000); if (o.ring !== 'late') await pg.click('.ign'); await pg.evaluate((v) => Game._debug.land.speed(v), sp); }
  await pg.waitForFunction(() => Game._debug.land.st === 'D' && document.querySelector('.lcen .btn.primary'), null, { timeout: 60000 });
  const atD = await pg.evaluate(() => { const l = Game._debug.land, d = l.d, cv = document.getElementById('landcv'), c = cv.getContext('2d'), p = c.getImageData(Math.floor(cv.width * 0.1), Math.floor(cv.height * 0.97), 1, 1).data; return { x: d.x, w: d.w, px: [p[0], p[1], p[2]], a: d.a, ign: Game.S.land.ign }; });
  if (o.onD) await o.onD(atD);
  await pg.click('.lcen .btn.primary');
  for (let i = 0; i < 40; i++) {
    const st = await pg.evaluate(() => { const dd = Game._debug.land.dd; return { wait: dd.wait, ready: dd.ready }; });
    if (st.ready) break;
    if (st.wait === 'lev') { const btns = await pg.$$('.lcen .btn'); await btns[o.lev === false ? 1 : 0].click(); }
    else if (st.wait === 'prio') { const btns = await pg.$$('.lcen .btn'); await btns[(o.prio || 1) - 1].click(); }
    await sleep(pg, 120);
  }
  await pg.waitForFunction(() => Game._debug.land.dd.ready, null, { timeout: 30000 });
  if (o.onReady) await o.onReady();
  await pg.click('.lcen .btn.primary'); await pg.waitForFunction(() => !Game._debug.land.on && Game._debug.running, null, { timeout: 8000 });
  await pg.evaluate(() => { Game._debug.setSpeed(0); const S = Game.S; S.noEv = true; S.lastEv = 1e9; for (const k in NPCDATA.TALK) S.camp.visited[k] = 1; });
  return atD;
}

(async () => {
  const browser = await chromium.launch();
  const A = await newCtx(browser);

  /* ---- Motor puro ---- */
  const pure = await A.pg.evaluate(() => {
    const out = { zones: {} };
    for (const sc of ['moon', 'mars']) {
      out.zones[sc] = Land.zoneList(sc).map((z) => {
        Field.init(sc, [z.x, z.y]); const G = Field.G, sp = Field.ship, near = (a, r) => a.some((q) => Math.hypot(q.x - z.x, q.y - z.y) < r);
        return { id: z.id, free: !near(G.pois, 9) && !near(G.sites, 4.5) && !near(G.rep, 5) && !near(G.shel, 6) && !G.craters.some((k) => k.big && Math.hypot(k.x - z.x, k.y - z.y) < k.r + 3.5) && !Field.inRect(z.x, z.y, 3), ship: !!sp && G.obs.some((o) => o.t === 'ship'), route: Field.TRAILS.some((t) => t[1] && t[1][0] === z.x && t[1][1] === z.y), rocksNear: G.obs.filter((o) => (o.t === 'rock' || o.t === 'mesa') && Math.hypot(o.x - z.x, o.y - z.y) < 7).length };
      });
    }
    const f = (id) => Land.fx(Land.zoneOf('moon', id).c);
    out.fx = { z1: f('z1'), z2: f('z2'), z3: f('z3'), z4: f('z4') };
    return out;
  });
  for (const sc of ['moon', 'mars']) {
    ok('Las 4 zonas de ' + sc + ' tienen sitio libre (sin POI, muestras, repetidores, refugios, cráteres ni la base)', pure.zones[sc].every((z) => z.free), JSON.stringify(pure.zones[sc].filter((z) => !z.free)));
    ok('La nave de cada zona de ' + sc + ' es un obstáculo sólido y tiene ruta de rover desde la base', pure.zones[sc].every((z) => z.ship && z.route));
    ok('Alrededor de la plataforma de ' + sc + ' no se generan rocas encima', pure.zones[sc].every((z) => z.rocksNear === 0));
  }
  ok('Las zonas tienen consecuencias distintas (antena, dosis, recursos, materiales)', pure.fx.z3.sig > pure.fx.z4.sig && pure.fx.z3.rad > pure.fx.z4.rad && pure.fx.z2.reveal > pure.fx.z1.reveal && pure.fx.z2.mat < pure.fx.z1.mat, JSON.stringify(pure.fx));
  ok('Ninguna zona bloquea la campaña (materiales ≥ −9, antena ≥ ×0,8, dosis ≤ ×1,3)', Object.values(pure.fx).every((q) => q.mat >= -9 && q.sig >= 0.8 && q.rad <= 1.3));

  /* ---- Partida antigua y atajo de prueba: sin aterrizaje, con nave ---- */
  const legacy = await A.pg.evaluate(() => { const S = Sim.create({ scen: 'mars', diff: 'engineer', mode: 'junior', seed: 5 }); delete S.land; const m = Sim.migrate(JSON.parse(JSON.stringify(S))); return { done: m.land.done, pad: Land.pad(m), zone: m.land.zone, inst: Object.keys(m.land.inst).length, sig: Land.mods(m).sig }; });
  ok('Una partida anterior se migra con el aterrizaje ya completado (no se repite) y neutral', legacy.done && legacy.pad && legacy.inst === 9 && legacy.sig === 1, JSON.stringify(legacy));
  await A.pg.evaluate(() => Game._debug.newRun('moon', 'x', { skipCamp: true, mode: 'junior' })); await sleep(A.pg, 200);
  const quick = await A.pg.evaluate(() => ({ on: Game._debug.land.on, running: Game._debug.running, done: Game.S.land.done, ship: !!Field.ship }));
  ok('El atajo de prueba (skipCamp) salta la llegada y deja la nave en el mapa', !quick.on && quick.running && quick.done && quick.ship, JSON.stringify(quick));

  /* ---- Luna: recorrido completo, primera vez ---- */
  let skipFirst = null, subs = null;
  const moon = await fly(A.pg, 'moon', {
    zone: 2, lev: true, prio: 1, ring: 'perfect',
    onD: async () => { skipFirst = await A.pg.evaluate(() => getComputedStyle(document.getElementById('landSkip')).display); subs = await A.pg.evaluate(() => Voice.last && Voice.last.text); }
  });
  ok('Luna: la nave aterriza centrada en la plataforma elegida', Math.abs(moon.x - moon.w / 2) < 2 && moon.a === 0, JSON.stringify({ x: moon.x, w: moon.w }));
  ok('Luna: el suelo es gris (sin tinte rojo)', Math.abs(moon.px[0] - moon.px[1]) < 22 && Math.abs(moon.px[1] - moon.px[2]) < 22, JSON.stringify(moon.px));
  ok('Primera vez: no se puede omitir la animación', skipFirst === 'none', skipFirst);
  ok('Hay narración y subtítulos de la llegada', !!subs, subs);
  const S1 = await A.pg.evaluate(() => { const S = Game.S, L = S.land; return { done: L.done, zone: L.zone, ship: L.ship, steps: L.steps, inst: Object.keys(L.inst).length, prio: L.prio, lev: L.lev, ign: L.ign, relay: L.relay, parts: L.parts, t: S.t, running: Game._debug.running, fship: Field.ship, rev: Object.keys(S.ex.rev).length, hud: !document.getElementById('hud').classList.contains('hidden'), zone2: World.zone(), mat: S.r.mat.v, logs: S.log.filter((l) => l.k === 'land.arr').length }; });
  ok('Luna: la campaña empieza tras el aterrizaje (HUD, t=0, dentro de la base)', S1.running && S1.hud && S1.t < 0.5 && S1.zone2 !== 'outside', JSON.stringify({ t: S1.t, z: S1.zone2 }));
  ok('Luna: el estado guarda destino, zona, nave, despliegue completo e instalaciones', S1.done && S1.zone === 'z2' && S1.ship.x === 42 && S1.ship.y === 112 && S1.steps === 9 && S1.inst === 9, JSON.stringify(S1.ship));
  ok('Luna: la nave está en el mapa exterior en la zona elegida', S1.fship && S1.fship.x === 42 && S1.fship.y === 112);
  ok('Luna: ignición a tiempo (perfecta) y prioridad «energía» guardadas', S1.ign === 'perfect' && S1.prio === 'power', S1.ign + '/' + S1.prio);
  ok('Luna: el despliegue activa el relé de radio de la nave (baliza correcta)', S1.relay === true && S1.parts.beacon === 'ok', JSON.stringify(S1.parts));
  ok('Luna: la zona con recursos revela muestras ocultas desde el inicio', S1.rev === 3, String(S1.rev));
  ok('Luna: el registro de la misión incluye la llegada', S1.logs === 1);
  const nav = await A.pg.evaluate(() => { const S = Game.S, sh = Field.ship, W = World, p = W.player; const r = { relay: Ex.signal(S, sh.x + 20, sh.y), far: Ex.signal(S, sh.x + 60, sh.y + 30) }; p.x = sh.x; p.y = sh.y + 3.5; S.ex.suit.on = true; W.update(0.01, S, { x: 0, y: 0 }); const n = W.exNear(); r.near = n && n.id; r.tile = Field.hit(sh.x, sh.y, 1); return r; });
  ok('Luna: junto a la nave aparece «Revisar la nave» y la nave es sólida', nav.near === 'x:ship' && nav.tile === true, JSON.stringify(nav));
  ok('Luna: el relé de la nave mejora la señal a su alrededor', nav.relay > nav.far, JSON.stringify(nav));
  if (shots) { await A.pg.evaluate(() => { const sh = Field.ship, p = World.player; p.x = sh.x + 5; p.y = sh.y + 6; World.snapCamera(); }); await sleep(A.pg, 700); await A.pg.screenshot({ path: shots + '/landing_ship_world_moon.png' }); }
  const sig1 = await A.pg.evaluate(() => { const S = Game.S; return { z2: Land.mods(S).sig }; });

  /* ---- Guardado y «Continuar»: no se repite el aterrizaje ---- */
  await A.pg.evaluate(() => Game._debug.saveNow());
  await A.pg.reload(); await sleep(A.pg, 500);
  await A.pg.evaluate(() => Game._debug.setSpeed(0));
  const cont = await A.pg.$$('.menu-grid .btn'); let clicked = false;
  for (const b of cont) { const t = await b.textContent(); if (/Continuar|Continue/.test(t)) { await b.click(); clicked = true; break; } }
  await sleep(A.pg, 400);
  const loaded = await A.pg.evaluate(() => ({ on: Game._debug.land.on, running: Game._debug.running, zone: Game.S.land.zone, ship: Field.ship, done: Game.S.land.done, prio: Game.S.land.prio }));
  ok('Al cargar la partida no se vuelve a reproducir el aterrizaje; nave y zona se conservan', clicked && !loaded.on && loaded.running && loaded.done && loaded.zone === 'z2' && loaded.ship.x === 42 && loaded.prio === 'power', JSON.stringify(loaded));

  /* ---- Repetir la secuencia desde el menú de archivos de misión ---- */
  const before = await A.pg.evaluate(() => JSON.stringify(Game.S.land));
  await A.pg.evaluate(() => Game._debug.setSpeed(0));
  await A.pg.keyboard.press('Escape'); await sleep(A.pg, 300);
  const rbtn = (await A.pg.$$('.panel .btn')).filter(async () => true); let rep = false;
  for (const b of await A.pg.$$('.panel .btn')) { const t = await b.textContent(); if (/Ver la llegada|Watch the arrival/.test(t)) { await b.click(); rep = true; break; } }
  await sleep(A.pg, 400);
  const rp = await A.pg.evaluate(() => ({ on: Game._debug.land.on, skip: getComputedStyle(document.getElementById('landSkip')).display }));
  ok('La llegada se puede volver a ver desde el menú de pausa (archivos de misión)', rep && rp.on, JSON.stringify(rp));
  ok('Ya vista una vez, la animación se puede omitir', rp.skip !== 'none', rp.skip);
  await A.pg.evaluate(() => Game._debug.land.speed(25));
  await A.pg.waitForSelector('.lbtn:not(.hidden)', { timeout: 15000 }); await A.pg.click('.lbtn');
  await A.pg.waitForFunction(() => Game._debug.land.st === 'D' && document.querySelector('.lcen .btn.primary'), null, { timeout: 60000 }); await A.pg.click('.lcen .btn.primary');
  await A.pg.waitForFunction(() => Game._debug.land.dd && Game._debug.land.dd.ready, null, { timeout: 30000 }); await A.pg.click('.lcen .btn.primary'); await sleep(A.pg, 500);
  const after = await A.pg.evaluate(() => ({ on: Game._debug.land.on, land: JSON.stringify(Game.S.land), menu: !!document.querySelector('.panel') }));
  ok('La repetición no cambia la partida (vista previa) y vuelve al menú de pausa', !after.on && after.land === before && after.menu);
  ok('Sin errores de página (Luna)', A.errors.length === 0, A.errors.join(' | '));
  await A.ctx.close();

  /* ---- Marte: recorrido y diferencias visuales ---- */
  const B = await newCtx(browser);
  let heatSeen = 0, chuteSeen = 0, windDust = 0, ms = 0;
  await B.pg.evaluate(() => Game._debug.newRun('mars', 'x', { mode: 'adv' }));
  await B.pg.waitForFunction(() => Game._debug.land.on); await B.pg.evaluate(() => Game._debug.land.skipTrip()); await B.pg.evaluate(() => Game._debug.land.speed(25));
  await B.pg.waitForSelector('.lbtn:not(.hidden)'); await B.pg.click('.lbtn'); await B.pg.waitForSelector('.lpanel .choice'); await B.pg.click('.lpanel .choice:nth-of-type(3)'); await B.pg.click('.lpanel .btn.primary');
  await B.pg.waitForSelector('.lpanel .btn.primary'); await sleep(B.pg, 500); await B.pg.click('.lpanel .btn.primary');
  await B.pg.evaluate(() => Game._debug.land.speed(2));
  for (let i = 0; i < 160; i++) { const r = await B.pg.evaluate(() => { const d = Game._debug.land.d; return { st: d.st, heat: d.heat, chute: d.chute, dust: d.P.filter((p) => p.k).length }; }); if (r.heat > 0.2) heatSeen++; if (r.chute > 0.3) chuteSeen++; if (r.dust > 20) windDust++; if (r.st === 'W') break; await sleep(B.pg, 100); }
  ms = await B.pg.evaluate(() => Game._debug.land.drawMs(30));
  await B.pg.evaluate(() => Game._debug.land.speed(25));
  await B.pg.waitForFunction(() => Game._debug.land.st === 'D' && document.querySelector('.lcen .btn.primary'), null, { timeout: 60000 });
  const mars = await B.pg.evaluate(() => { const d = Game._debug.land.d, cv = document.getElementById('landcv'), p = cv.getContext('2d').getImageData(Math.floor(cv.width * 0.1), Math.floor(cv.height * 0.97), 1, 1).data; return { x: d.x, w: d.w, px: [p[0], p[1], p[2]], dustMars: d.P.some((q) => q.k === 1) }; });
  ok('Marte: la nave aterriza centrada en la plataforma elegida', Math.abs(mars.x - mars.w / 2) < 2, JSON.stringify(mars));
  ok('Marte: el suelo es rojizo (R > G > B)', mars.px[0] > mars.px[1] && mars.px[1] > mars.px[2] && mars.px[0] > 80, JSON.stringify(mars.px));
  ok('Marte: hay escudo térmico y paracaídas (la Luna no los usa)', heatSeen > 3 && chuteSeen > 1, heatSeen + '/' + chuteSeen);
  ok('Marte: el polvo es una nube con arrastre (la Luna usa partículas balísticas)', mars.dustMars || windDust > 0);
  ok('Rendimiento: dibujar el descenso cuesta < 12 ms por cuadro', ms < 12, ms.toFixed(2) + ' ms');
  await B.pg.click('.lcen .btn.primary');
  const lv = []; for (let i = 0; i < 60; i++) { const st = await B.pg.evaluate(() => { const dd = Game._debug.land.dd; return { wait: dd.wait, ready: dd.ready }; }); if (st.ready) break; if (st.wait) { lv.push(st.wait); const btns = await B.pg.$$('.lcen .btn'); await btns[st.wait === 'prio' ? 2 : 1].click(); } await sleep(B.pg, 120); }
  await B.pg.waitForFunction(() => Game._debug.land.dd.ready, null, { timeout: 30000 });
  if (shots) { await B.pg.screenshot({ path: shots + '/landing_deploy_mars.png' }); }
  await B.pg.click('.lcen .btn.primary'); await B.pg.waitForFunction(() => !Game._debug.land.on && Game._debug.running); await B.pg.evaluate(() => Game._debug.setSpeed(0));
  const M = await B.pg.evaluate(() => { const S = Game.S, L = S.land; return { zone: L.zone, scen: S.scen, prio: L.prio, lev: L.lev, ign: L.ign, legs: L.parts.legs, engine: L.parts.engine, sig: L.mods.sig, rad: L.mods.rad, rev: Object.keys(S.ex.rev).length, rough: Land.fx(Land.zone(S).c).rough, ship: Field.ship, steps: L.steps }; });
  ok('Marte: zona elegida (Meseta) y nave en su posición', M.zone === 'z3' && M.ship.x === 122 && M.ship.y === 112, JSON.stringify(M.ship));
  ok('Marte: la zona expuesta sube la dosis y mejora la antena (+8 % por priorizar comunicaciones)', M.rad === 1.25 && M.sig > 1.12, JSON.stringify({ rad: M.rad, sig: M.sig }));
  ok('Marte: ignición no pulsada → «tardía» → el motor queda en observación', M.ign === 'late' && M.engine === 'warn', M.ign + '/' + M.engine);
  ok('Marte: despliegue completo (9 pasos)', M.steps === 9);
  ok('Marte: sin errores de página', B.errors.length === 0, B.errors.join(' | '));

  /* ---- Decisiones con consecuencias: zona 2 (terreno difícil) sin nivelar + reparar la nave + prioridad soporte vital ---- */
  const C = await newCtx(browser);
  const matBefore = await C.pg.evaluate(() => 0);
  await C.pg.evaluate(() => localStorage.setItem('probe', '1'));
  const rz = await fly(C.pg, 'moon', { zone: 2, lev: false, prio: 2, repair: true, ring: 'perfect' });
  const R = await C.pg.evaluate(() => { const S = Game.S, L = S.land; return { legs: L.parts.legs, parts: L.parts, o2: S.r.o2.v / S.r.o2.max, mat: S.r.mat.v, lev: L.lev, prio: L.prio, flag: L.flag }; });
  ok('Terreno difícil sin nivelar: las patas quedan en observación', R.lev === false && R.legs === 'warn', JSON.stringify(R.parts));
  ok('Reajustar la pieza marcada en la revisión la deja correcta', R.flag === 'legs' ? true : R.parts[R.flag] === 'ok', JSON.stringify({ flag: R.flag, parts: R.parts }));
  ok('Prioridad «soporte vital» guardada', R.prio === 'life');
  // reparar desde el panel de la nave (cuesta materiales)
  const fixed = await C.pg.evaluate(() => { const S = Game.S, m0 = S.r.mat.v; const before = S.land.parts.legs; Game._debug.land.close; const sh = Field.ship; World.player.x = sh.x; World.player.y = sh.y + 3; S.ex.suit.on = true; return { m0, before }; });
  await sleep(C.pg, 400); await C.pg.keyboard.press('e'); await sleep(C.pg, 400);
  const panelBtn = await C.pg.$('.panel table .btn'); let rep2 = null;
  if (panelBtn) { await panelBtn.click(); await sleep(C.pg, 300); rep2 = await C.pg.evaluate(() => ({ legs: Game.S.land.parts.legs, mat: Game.S.r.mat.v })); }
  ok('El panel de la nave permite reparar una pieza gastando materiales', !!rep2 && rep2.legs === 'ok' && rep2.mat === fixed.m0 - 3, JSON.stringify({ rep2, m0: fixed.m0 }));
  ok('Sin errores de página (decisiones)', C.errors.length === 0, C.errors.join(' | '));

  /* ---- Móvil: la llegada cabe en pantalla ---- */
  const D = await newCtx(browser, { width: 390, height: 780 }, true);
  await D.pg.evaluate(() => Game._debug.newRun('moon', 'x', { mode: 'junior' })); await D.pg.waitForFunction(() => Game._debug.land.on); await D.pg.evaluate(() => Game._debug.land.skipTrip()); await D.pg.evaluate(() => Game._debug.land.speed(25));
  await D.pg.waitForSelector('.lbtn:not(.hidden)'); await D.pg.click('.lbtn'); await D.pg.waitForSelector('.lpanel .choice'); await D.pg.click('.lpanel .choice:nth-of-type(1)'); await sleep(D.pg, 200);
  const mob = await D.pg.evaluate(() => { const p = document.querySelector('.lpanel').getBoundingClientRect(); return { l: p.left, r: p.right, b: p.bottom, w: innerWidth, h: innerHeight, scrollX: document.documentElement.scrollWidth > innerWidth }; });
  ok('Móvil: el panel de zonas cabe en la pantalla y no hay desplazamiento horizontal', mob.l >= 0 && mob.r <= mob.w + 1 && mob.b <= mob.h + 1 && !mob.scrollX, JSON.stringify(mob));
  if (shots) await D.pg.screenshot({ path: shots + '/landing_mobile_zone.png' });
  ok('Sin errores de página (móvil)', D.errors.length === 0, D.errors.join(' | '));
  await D.ctx.close(); await C.ctx.close(); await B.ctx.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 1200)); process.exit(2); });
