/* Pruebas del inicio: carga espacial, asistente edad / misión / dificultad y conexión con la partida real.
   Uso: NODE_PATH=$(npm root -g) node tests/start.js [carpeta-capturas] */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv[2];
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('PASS - ' + n); } else { fail++; console.log('FAIL - ' + n + ' ' + (d || '')); } };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (vw, vh, q) => {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: vw < 700, isMobile: vw < 700 });
    await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push(e.message));
    await pg.goto(FILE + (q || ''));
    return pg;
  };

  /* ---- 1. Carga espacial ---- */
  let pg = await open(1280, 760, '?load');
  await pg.waitForSelector('[data-boot]');
  ok('La carga muestra nave, porcentaje y mensaje', (await pg.locator('.ld-ship').count()) === 1 && /%/.test(await pg.locator('.ld-pct').innerText()) && (await pg.locator('.ld-msg').innerText()).length > 3);
  await pg.waitForFunction(() => parseInt(document.querySelector('.ld-pct').textContent) >= 30, null, { timeout: 8000 });
  const mid = await pg.evaluate(() => ({ p: parseInt(document.querySelector('.ld-pct').textContent), left: parseFloat(document.querySelector('.ld-ship').style.left), msg: document.querySelector('.ld-msg').textContent }));
  ok('La nave avanza en la ruta al ritmo del porcentaje', Math.abs(mid.left - mid.p) < 1.5 && mid.p >= 30 && mid.p < 100, JSON.stringify(mid));
  if (shots) await pg.waitForTimeout(600), await pg.screenshot({ path: shots + '/load.png' });
  await pg.waitForSelector('.title-big:not(.ld-panel .title-big)', { timeout: 10000 }).catch(() => {});
  await pg.waitForFunction(() => !document.querySelector('[data-boot]') && document.querySelector('.menu-grid'), null, { timeout: 10000 });
  ok('Al llegar al 100 % pasa solo al menú principal', (await pg.getByRole('button', { name: /Iniciar misión/ }).count()) === 1);
  if (shots) await pg.waitForTimeout(600), await pg.screenshot({ path: shots + '/menu.png' });

  /* ---- 2. Edad ---- */
  await pg.getByRole('button', { name: /Iniciar misión/ }).click();
  const age = () => pg.locator('.age-num').innerText();
  ok('Edad inicial dentro de 5 a 17+', /^(\d+|17\+)$/.test(await age()));
  await pg.locator('.age-range').fill('5');
  ok('La barra llega a 5', (await age()) === '5');
  await pg.locator('[data-age-step="-1"]').click();
  ok('No baja de 5', (await age()) === '5');
  await pg.locator('[data-age-step="1"]').click();
  ok('El botón + sube la edad', (await age()) === '6');
  await pg.locator('.age-range').press('ArrowRight');
  ok('El teclado también mueve la barra', (await age()) === '7');
  const txtYoung = await pg.locator('.age-info').innerText();
  await pg.locator('.age-range').fill('16');
  const txtOld = await pg.locator('.age-info').innerText();
  ok('El lenguaje y las ayudas anunciados cambian con la edad', txtYoung !== txtOld && /Junior/.test(txtYoung) && /sin pistas/.test(txtOld), txtYoung + ' | ' + txtOld);
  if (shots) await pg.waitForTimeout(600), await pg.screenshot({ path: shots + '/age.png' });

  /* ---- 3. Misión ---- */
  await pg.locator('[data-act=wiz-next]').click();
  ok('Cuatro tarjetas de misión', (await pg.locator('.mcard').count()) === 4);
  const names = await pg.locator('.mcard b').allInnerTexts();
  ok('Luna, Marte, estación e investigación', ['Luna', 'Marte', 'Construcción de estación', 'Investigación científica'].every((n) => names.includes(n)), names.join('|'));
  await pg.locator('[data-mission=station]').click();
  ok('Solo una tarjeta queda seleccionada', (await pg.locator('.mcard[aria-pressed=true]').count()) === 1);
  if (shots) await pg.waitForTimeout(600), await pg.screenshot({ path: shots + '/mission.png' });

  /* ---- 4. Dificultad ---- */
  await pg.locator('[data-act=wiz-next]').click();
  const lv = await pg.locator('.dcard b').allInnerTexts();
  ok('Explorador, Cadete y Comandante', lv.join('|') === 'Explorador|Cadete|Comandante', lv.join('|'));
  await pg.locator('[data-level=commander]').click();
  if (shots) await pg.waitForTimeout(600), await pg.screenshot({ path: shots + '/level.png' });
  await pg.getByRole('button', { name: /Atrás|Volver/ }).click();
  ok('Atrás conserva la misión elegida', (await pg.locator('.mcard[aria-pressed=true]').getAttribute('data-mission')) === 'station');
  await pg.locator('[data-act=wiz-next]').click();
  ok('…y la dificultad elegida', (await pg.locator('.dcard[aria-pressed=true]').getAttribute('data-level')) === 'commander');

  /* ---- 5. Conexión con la partida real: edad 16 + Comandante + estación ---- */
  await pg.getByRole('button', { name: /Despegar/ }).click();
  await pg.waitForFunction(() => typeof Game !== 'undefined' && Game.S && Game.S.scen, null, { timeout: 5000 });
  const g1 = await pg.evaluate(() => ({ mode: Game.S.mode, diff: Game.S.diff, scen: Game.S.scen, focus: Game.S.focus, age: Game.S.age, hints: Store.get('settings', {}), mat: Game.S.r.mat.v, matMax: Game.S.r.mat.max }));
  ok('Edad 16 → modalidad avanzada; Comandante → difícil; estación → Luna', g1.mode === 'adv' && g1.diff === 'commander' && g1.scen === 'moon' && g1.focus === 'station' && g1.age === 16, JSON.stringify(g1));
  ok('La misión de estación da materiales extra', g1.mat > 0);
  await pg.close();

  /* Edad 6 + Comandante: la dificultad NO cambia con la edad */
  pg = await open(1280, 760, '?noload');
  await pg.getByRole('button', { name: /Iniciar misión/ }).click();
  await pg.locator('.age-range').fill('6'); await pg.locator('[data-act=wiz-next]').click();
  await pg.locator('[data-mission=mars]').click(); await pg.locator('[data-act=wiz-next]').click();
  await pg.locator('[data-level=commander]').click(); await pg.getByRole('button', { name: /Despegar/ }).click();
  await pg.waitForFunction(() => typeof Game !== 'undefined' && Game.S && Game.S.scen, null, { timeout: 5000 });
  const g2 = await pg.evaluate(() => ({ mode: Game.S.mode, diff: Game.S.diff, scen: Game.S.scen, hints: Store.get('settings', {}).hints }));
  ok('Edad 6 + Comandante + Marte: modo Junior con pistas y dificultad máxima', g2.mode === 'junior' && g2.diff === 'commander' && g2.scen === 'mars' && g2.hints === true, JSON.stringify(g2));
  await pg.close();

  /* Edad 17 + Explorador */
  pg = await open(1280, 760, '?noload');
  await pg.getByRole('button', { name: /Iniciar misión/ }).click();
  await pg.locator('.age-range').fill('17'); await pg.locator('[data-act=wiz-next]').click();
  await pg.locator('[data-act=wiz-next]').click(); await pg.locator('[data-level=explorer]').click(); await pg.getByRole('button', { name: /Despegar/ }).click();
  await pg.waitForFunction(() => typeof Game !== 'undefined' && Game.S && Game.S.scen, null, { timeout: 5000 });
  const g3 = await pg.evaluate(() => ({ mode: Game.S.mode, diff: Game.S.diff, hints: Store.get('settings', {}).hints }));
  ok('Edad 17+ + Explorador: modo Avanzado sin pistas y dificultad fácil', g3.mode === 'adv' && g3.diff === 'explorer' && g3.hints === false, JSON.stringify(g3));
  await pg.close();

  /* Móvil: todo cabe sin desplazamiento horizontal y los botones son grandes */
  pg = await open(390, 780, '?load');
  await pg.waitForSelector('[data-boot]');
  ok('Móvil: la carga cabe en la pantalla', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await pg.getByRole('button', { name: /Saltar/ }).click();
  await pg.waitForSelector('.menu-grid');
  await pg.getByRole('button', { name: /Iniciar misión/ }).click();
  const fit = async () => pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('.wiz button')].every((b) => b.getBoundingClientRect().height >= 40));
  ok('Móvil: la edad cabe y los botones son grandes', await fit());
  if (shots) await pg.waitForTimeout(600), await pg.screenshot({ path: shots + '/age-mobile.png' });
  await pg.locator('[data-act=wiz-next]').click(); ok('Móvil: misiones sin desbordar', await fit());
  if (shots) await pg.waitForTimeout(600), await pg.screenshot({ path: shots + '/mission-mobile.png' });
  await pg.locator('[data-act=wiz-next]').click(); ok('Móvil: dificultad sin desbordar', await fit());
  await pg.close();

  ok('Sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(pass + '/' + (pass + fail) + (fail ? ' FALLOS' : ' PASS'));
  process.exit(fail ? 1 : 0);
})();
