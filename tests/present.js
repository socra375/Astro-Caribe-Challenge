/* Modo presentación: cada botón entra directo a su sección.
   Uso: NODE_PATH=$(npm root -g) node tests/present.js */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n + ' ' + (d || '')); } };

(async () => {
  const browser = await chromium.launch(); const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const pg = await ctx.newPage(); pg.on('pageerror', (e) => errors.push(e.message));
  const open = async () => { await pg.goto(FILE + '?noload'); await pg.waitForTimeout(250); await pg.locator('[data-act=present]').click(); await pg.waitForSelector('[data-act=pres-base]'); };
  const st = () => pg.evaluate(() => ({ running: Game._debug.running, scen: Game.S && Game.S.scen, floor: World.floor, rooms: Game.S && Object.keys(Game.S.camp.unlocked).length, suit: Game.S && Game.S.ex && Game.S.ex.suit.on, zone: World.zone(), land: !!document.querySelector('#landw:not(.hidden)'), radio: !!document.querySelector('.er.er-in, #er:not(.hidden), .er'), go: Game._debug.surv.active }));

  await open();
  ok('El menú principal ofrece el Modo presentación y el panel tiene 10 secciones y 5 pantallas de derrota', (await pg.locator('[data-act^=pres-]:not([data-act=pres-back]):not([data-act^=pres-over])').count()) === 10 && (await pg.locator('[data-act^=pres-over-]').count()) === 5);

  await pg.locator('[data-act=pres-base]').click(); await pg.waitForTimeout(500);
  let s = await st(); ok('Base completa: partida en marcha con todas las salas abiertas', s.running && s.rooms >= 13, JSON.stringify(s));

  await open(); await pg.locator('[data-planet=mars]').click(); await pg.locator('[data-act=pres-base]').click(); await pg.waitForTimeout(500);
  s = await st(); ok('El planeta elegido se aplica (Marte)', s.running && s.scen === 'mars', JSON.stringify(s));

  await open(); await pg.locator('[data-act=pres-eva]').click(); await pg.waitForTimeout(500);
  s = await st(); ok('Exterior: traje puesto, fuera de la base y en la planta baja', s.running && s.suit === true && s.zone === 'outside' && s.floor === 2, JSON.stringify(s));

  await open(); await pg.locator('[data-act=pres-core]').click(); await pg.waitForTimeout(500);
  s = await st(); ok('Núcleo energético: aparece en el piso 3', s.running && s.floor === 3, JSON.stringify(s));

  await open(); await pg.locator('[data-act=pres-floors]').click(); await pg.waitForTimeout(500);
  s = await st(); ok('Elevadores y pisos: aparece en el piso 2', s.running && s.floor === 2, JSON.stringify(s));

  await open(); await pg.locator('[data-act=pres-map]').click(); await pg.waitForTimeout(700);
  ok('Mapa general abierto', await pg.evaluate(() => !!document.querySelector('.mapcv')));

  await open(); await pg.locator('[data-act=pres-radio]').click(); await pg.waitForTimeout(700);
  ok('Radio con la Tierra abierta', await pg.evaluate(() => !!document.querySelector('[class*=er-]') && Game._debug.running));

  await open(); await pg.locator('[data-act=pres-trip]').click(); await pg.waitForTimeout(600);
  ok('Viaje espacial: empieza en la cabina', await pg.evaluate(() => !!document.querySelector('#landw:not(.hidden)') && Game._debug.land.trip && Game._debug.land.trip.stage !== 'done'));

  await open(); await pg.locator('[data-act=pres-land]').click(); await pg.waitForTimeout(600);
  ok('Llegada y aterrizaje: salta el viaje y empieza la aproximación', await pg.evaluate(() => !!document.querySelector('#landw:not(.hidden)') && Game._debug.land.ph != null));

  await open(); await pg.locator('[data-act=pres-load]').click();
  ok('Carga e inicio: muestra la carga espacial', (await pg.locator('[data-boot]').count()) === 1);
  await open(); await pg.locator('[data-act=pres-wizard]').click();
  ok('Asistente: muestra la edad', (await pg.locator('.age-range').count()) === 1);

  for (const k of ['cold', 'rover', 'food', 'dose', 'core']) {
    await open(); await pg.locator('[data-act=pres-over-' + k + ']').click(); await pg.waitForTimeout(500);
    await pg.evaluate(() => Game._debug.surv.skip()); await pg.waitForSelector('.go-panel', { timeout: 4000 });
    const r = await pg.evaluate(() => ({ kind: document.querySelector('.go-title').dataset.go, retry: !!document.querySelector('[data-act=retry]'), ended: Game.S.ended }));
    ok('Derrota «' + k + '»: animación, GAME OVER y REINTENTAR sin perder la partida real', r.kind === k && r.retry && r.ended === null, JSON.stringify(r));
    if (k === 'core') { await pg.locator('[data-act=retry]').click(); await pg.waitForTimeout(600); const t = await st(); ok('Reintentar en la demostración vuelve a la base', t.running && !t.go, JSON.stringify(t)); }
  }
  ok('Sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close(); console.log(pass + '/' + (pass + fail) + (fail ? ' FALLOS' : ' PASS')); process.exit(fail ? 1 : 0);
})();
