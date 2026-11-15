/* =================== SUPERVIVENCIA Y GAME OVER ===================
   Efectos progresivos (frío, hambre), avisos, animaciones cortas de derrota y pantalla de GAME OVER con «Reintentar».
   La lógica de cada causa está en Surv / Sim.endings / Rover.update; aquí solo se muestra. */
  let survSlow = 1, lastStart = null, goActive = false, goDone = null;
  const survFx = h('div', { id: 'survfx', 'aria-hidden': 'true' });
  const survBar = h('div', { id: 'survbar', class: 'hidden', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'sv-l' }), h('div', { class: 'pbar' }, h('i')));
  const goCv = h('canvas', { id: 'gocv', class: 'hidden', 'aria-hidden': 'true' });
  document.body.append(survFx, survBar, goCv);
  const scaleIn = (v) => (survSlow >= 0.999 ? v : { x: v.x * survSlow, y: v.y * survSlow, thr: v.thr * survSlow, str: v.str * survSlow, stick: v.stick ? { x: v.stick.x, y: v.stick.y, m: v.stick.m * survSlow } : null });

  const SV_W = {
    'cold.start': { sev: 'warn', who: 'medic', t: ['¡Sin traje en el exterior!', 'No suit outside!'], d: ['El frío te congela en segundos. Vuelve a la esclusa ya.', 'The cold freezes you in seconds. Get back to the airlock now.'], act: ['Camina de vuelta a la esclusa.', 'Walk back to the airlock.'] },
    'cold.crit': { sev: 'crit', who: 'medic', t: ['¡Congelación inminente!', 'Freezing imminent!'], d: ['Casi no puedes moverte. Entra ya en la base.', 'You can barely move. Get inside the base now.'], act: ['Entra por la esclusa.', 'Go in through the airlock.'] },
    'food.zero': { sev: 'warn', who: 'medic', t: ['Sin alimentos', 'No food left'], d: ['La tripulación empezará a perder energía. Recupera comida: cosecha, usa las reservas o pide suministros a la Tierra.', 'The crew will start losing energy. Get food: harvest, use reserves or ask Earth for supplies.'], act: ['Consola de alimentos o radio con la Tierra.', 'Food console or radio to Earth.'] },
    'food.late': { sev: 'crit', who: 'medic', t: ['Debilidad por hambre', 'Weak from hunger'], d: ['Tu visión se nubla. Quedan menos de 36 horas simuladas antes del desmayo.', 'Your vision is blurring. Less than 36 simulated hours remain before you faint.'], act: ['Consigue alimentos ya.', 'Get food now.'] },
    'food.faint': { sev: 'crit', who: 'medic', t: ['¡Vas a desmayarte!', 'You are about to faint!'], d: ['Menos de 12 horas simuladas. Cualquier alimento reinicia la cuenta.', 'Less than 12 simulated hours. Any food resets the count.'], act: ['Come lo que haya en la cocina.', 'Eat whatever is in the kitchen.'] },
    'dose.hi': { sev: 'warn', who: 'medic', t: ['Dosis de radiación alta', 'High radiation dose'], d: ['Has superado el 60 % del límite. Usa el refugio y el blindaje.', 'You have passed 60 % of the limit. Use the shelter and shielding.'], act: ['Refugio de radiación.', 'Radiation shelter.'] },
    'dose.crit': { sev: 'crit', who: 'medic', t: ['¡Dosis peligrosa!', 'Dangerous dose!'], d: ['Estás cerca del límite: otra exposición terminaría la misión.', 'You are close to the limit: another exposure would end the mission.'], act: ['Al refugio, ya.', 'Into the shelter, now.'] },
    'core.low': { sev: 'warn', who: 'engineer', t: ['Núcleo energético dañado', 'Energy core damaged'], d: ['El reactor está por debajo del 35 %. Repáralo antes de que se apague.', 'The reactor is below 35 %. Repair it before it shuts down.'], act: ['Consola del reactor: mantenimiento.', 'Reactor console: maintenance.'] },
    'core.out': { sev: 'crit', who: 'engineer', t: ['¡Núcleo apagado!', 'Core offline!'], d: ['El reactor no produce energía. Si la batería llega a cero y no lo reparas, la estación se pierde.', 'The reactor produces no power. If the battery hits zero and you do not repair it, the station is lost.'], act: ['Repara el reactor y ahorra energía.', 'Repair the reactor and save power.'] },
    'rover.low': { sev: 'warn', who: 'engineer', t: ['Rover dañado', 'Rover damaged'], d: ['Integridad por debajo del 40 %. Frena antes de los obstáculos.', 'Integrity below 40 %. Slow down before obstacles.'], act: ['Reduce la velocidad; repáralo en el taller.', 'Slow down; repair it in the workshop.'] },
    'rover.crit': { sev: 'crit', who: 'engineer', t: ['¡Rover a punto de romperse!', 'Rover about to break!'], d: ['Otro choque fuerte podría destruirlo con ti dentro. Frena y vuelve a la base.', 'Another hard hit could destroy it with you inside. Slow down and go back to base.'], act: ['Vuelve despacio a la base.', 'Drive slowly back to base.'] }
  };
  function survWarn(k) {
    const a = SV_W[k]; if (!a) return; const es = LANG === 'es';
    call({ key: 'sv.' + k, sev: a.sev, who: a.who, title: es ? a.t[0] : a.t[1], desc: es ? a.d[0] : a.d[1], act: es ? a.act[0] : a.act[1] });
    Sfx.play(a.sev === 'crit' ? 'crit' : 'warn');
  }
  function survVisual(cold, hu, dose) {
    const f = [];
    if (hu.blur > 0) f.push('blur(' + (hu.blur * 5).toFixed(1) + 'px)');
    const br = 1 - 0.65 * hu.dark - 0.12 * cold; if (br < 0.999) f.push('brightness(' + br.toFixed(2) + ')');
    if (cold > 0) f.push('saturate(' + (1 - 0.4 * cold).toFixed(2) + ') hue-rotate(' + (-18 * cold).toFixed(0) + 'deg)');
    cv.style.filter = f.join(' ');
    survFx.style.background = cold > 0 ? 'radial-gradient(ellipse at center, rgba(120,190,255,' + (0.08 * cold).toFixed(3) + ') 25%, rgba(150,215,255,' + (0.75 * cold).toFixed(3) + ') 100%), rgba(40,110,255,' + (0.25 * cold).toFixed(3) + ')'
      : hu.dark > 0 ? 'radial-gradient(ellipse at center, rgba(0,0,0,0) ' + (60 - 45 * hu.dark).toFixed(0) + '%, rgba(0,0,0,' + (0.9 * hu.dark).toFixed(3) + ') 100%)' : 'none';
    const es = LANG === 'es'; let txt = '', f1 = 0, col = '';
    if (cold > 0.02) { txt = '🥶 ' + (es ? 'Congelación' : 'Freezing'); f1 = cold; col = '#7fc4ff'; }
    else if (hu.h >= 10) { txt = '🍽 ' + (es ? 'Sin comida: desmayo en ' : 'No food: fainting in ') + Math.ceil(hu.left) + ' h'; f1 = hu.h / Surv.HUNGER_H; col = '#ffb454'; }
    else if (dose >= 0.6) { txt = '☢ ' + (es ? 'Dosis de radiación ' : 'Radiation dose ') + Math.round(dose * 100) + ' %'; f1 = dose; col = '#b58cff'; }
    survBar.classList.toggle('hidden', !txt);
    if (txt) { survBar.firstChild.textContent = txt.replace(/^\S+\s/, ''); survBar.firstChild.dataset.ico = txt.split(' ')[0]; survBar.lastChild.firstChild.style.width = Math.round(Math.min(1, f1) * 100) + '%'; survBar.lastChild.firstChild.style.background = col; }
  }
  function survFrame(dt) {
    if (!S || S.ended) return;
    const c = World.exCtx(), E = S.ex || null;
    const cold = Surv.coldStep(S, dt, { outside: !!(c && c.outside), suitOn: !!(E && E.suit.on), suitEn: E ? E.suit.en : 100, inShel: !!(c && c.inShel), inRover: !!(c && c.inRover) });
    const hu = Surv.hunger(S), dose = Surv.doseF(S);
    survSlow = c && c.inRover ? 1 : 1 - 0.55 * cold - 0.35 * hu.dark;
    for (const k of Surv.warnings(S)) survWarn(k);
    survVisual(cold, hu, dose);
    if (cold >= 1) Sim.kill(S, 'cold');
  }
  function survReset() {
    survSlow = 1; goActive = false; goDone = null;
    cv.style.filter = ''; cv.style.transform = ''; survFx.style.background = 'none'; survBar.classList.add('hidden'); goCv.classList.add('hidden');
  }
  /** Sin traje en la esclusa: se explica el peligro y el jugador decide (no se sale por accidente). */
  let noSuitCd = 0;
  function noSuitPanel() {
    if (modalOpen() || performance.now() < noSuitCd) return; const es = LANG === 'es';
    const stay = () => { noSuitCd = performance.now() + 3000; pop(); };
    push(h('div', { class: 'panel narrow cine-panel' }, h('h2', null, '⚠ ' + (es ? 'Sin traje espacial' : 'No space suit')),
      h('p', null, es ? 'Fuera de la base hace un frío extremo y no hay aire. Sin traje te congelarás en unos 16 segundos. Equípalo antes en el vestuario de la bahía.' : 'Outside the base it is extremely cold and there is no air. Without a suit you will freeze in about 16 seconds. Put it on first at the bay locker.'),
      h('div', { class: 'row' }, btn(es ? 'Quedarme dentro' : 'Stay inside', stay, 'primary', { autofocus: true, 'data-act': 'nosuit-stay' }), btn(es ? 'Salir de todos modos' : 'Go out anyway', () => { noSuitCd = performance.now() + 3000; pop(); World.cycleLock(true); }, '', { 'data-act': 'nosuit-go' }))), { sticky: true, onclose: () => { noSuitCd = performance.now() + 3000; } });
  }

  /* ---------- Animaciones de derrota (cortas y sencillas, sin imágenes explícitas) ---------- */
  const ANIM_T = { cold: 3.4, rover: 3.2, food: 3.6, dose: 4.2, core: 4.6 };
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  function drawCold(g, w, h2, p, t) {
    g.fillStyle = 'rgba(30,90,200,' + (0.5 * p) + ')'; g.fillRect(0, 0, w, h2);
    g.strokeStyle = 'rgba(225,242,255,0.85)'; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const side = i % 4, u = rnd(i), L = (50 + rnd(i + 9) * 170) * ease(p);
      const x = side === 0 ? u * w : side === 1 ? u * w : side === 2 ? 0 : w, y = side === 0 ? 0 : side === 1 ? h2 : u * h2;
      const dx = side === 2 ? 1 : side === 3 ? -1 : 0, dy = side === 0 ? 1 : side === 1 ? -1 : 0, a = (rnd(i + 3) - 0.5) * 0.9;
      const ca = Math.cos(a), sa = Math.sin(a), vx = dx * ca - dy * sa, vy = dx * sa + dy * ca;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + vx * L, y + vy * L);
      for (const k of [0.4, 0.7]) { const bx = x + vx * L * k, by = y + vy * L * k; g.moveTo(bx, by); g.lineTo(bx + (vx * 0.5 - vy * 0.8) * L * 0.3, by + (vy * 0.5 + vx * 0.8) * L * 0.3); g.moveTo(bx, by); g.lineTo(bx + (vx * 0.5 + vy * 0.8) * L * 0.3, by + (vy * 0.5 - vx * 0.8) * L * 0.3); }
      g.stroke();
    }
    const vg = g.createRadialGradient(w / 2, h2 / 2, Math.min(w, h2) * 0.15, w / 2, h2 / 2, Math.max(w, h2) * 0.7); vg.addColorStop(0, 'rgba(200,230,255,0)'); vg.addColorStop(1, 'rgba(210,235,255,' + (0.8 * p) + ')'); g.fillStyle = vg; g.fillRect(0, 0, w, h2);
    for (let i = 0; i < 24; i++) { const x = (rnd(i + 40) * w + t * 30 * (0.5 + rnd(i))) % w, y = (rnd(i + 70) * h2 + t * 60 * (0.5 + rnd(i + 1))) % h2; g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x, y, 1.5 + rnd(i + 5) * 2, 0, 7); g.fill(); }
    if (p > 0.7) { g.fillStyle = 'rgba(4,12,34,' + ((p - 0.7) / 0.3) + ')'; g.fillRect(0, 0, w, h2); }
    cv.style.transform = 'translate(' + (Math.sin(t * 50) * 3 * (1 - p)).toFixed(1) + 'px,' + (Math.cos(t * 43) * 2 * (1 - p)).toFixed(1) + 'px)';
  }
  function drawRover(g, w, h2, p, t) {
    const cx = w / 2, cy = h2 * 0.55, R = Math.min(w, h2);
    for (let i = 0; i < 14; i++) { const q = Math.max(0, p - 0.12 - i * 0.02), a = (0.45 * (1 - q)) * (q > 0 ? 1 : 0); g.fillStyle = 'rgba(70,70,78,' + a + ')'; g.beginPath(); g.arc(cx + (rnd(i) - 0.5) * R * 0.5, cy - q * R * (0.35 + rnd(i + 3) * 0.4), R * (0.04 + q * 0.12 + rnd(i + 8) * 0.03), 0, 7); g.fill(); }
    const fr = R * 0.34 * ease(Math.min(1, p / 0.5)), fa = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.3);
    const fg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, fr)); fg.addColorStop(0, 'rgba(255,250,200,' + fa + ')'); fg.addColorStop(0.35, 'rgba(255,170,50,' + 0.9 * fa + ')'); fg.addColorStop(0.75, 'rgba(210,60,20,' + 0.6 * fa + ')'); fg.addColorStop(1, 'rgba(120,20,10,0)'); g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, Math.max(1, fr), 0, 7); g.fill();
    for (let i = 0; i < 46; i++) { const a = rnd(i) * 6.283, sp = R * (0.25 + rnd(i + 11) * 0.55), tt = p * 1.6, x = cx + Math.cos(a) * sp * tt, y = cy + Math.sin(a) * sp * tt + 260 * tt * tt * rnd(i + 5); g.fillStyle = i % 3 ? 'rgba(255,200,90,' + (1 - p) + ')' : 'rgba(40,40,46,' + (1 - p * 0.6) + ')'; g.fillRect(x, y, 3 + rnd(i + 2) * 5, 3 + rnd(i + 4) * 5); }
    if (p < 0.1) { g.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - p / 0.1)) + ')'; g.fillRect(0, 0, w, h2); }
    if (p > 0.75) { g.fillStyle = 'rgba(0,0,0,' + ((p - 0.75) / 0.25) + ')'; g.fillRect(0, 0, w, h2); }
    cv.style.transform = p < 0.5 ? 'translate(' + (Math.sin(t * 70) * 8 * (1 - p * 2)).toFixed(1) + 'px,' + (Math.cos(t * 61) * 8 * (1 - p * 2)).toFixed(1) + 'px)' : '';
  }
  function drawFaint(g, w, h2, p, t) {
    cv.style.filter = 'blur(' + (Math.max(survVisBlur(), p * 12)).toFixed(1) + 'px) brightness(' + (1 - 0.85 * p).toFixed(2) + ')';
    cv.style.transform = 'rotate(' + (Math.sin(t * 2.4) * 2.2 * p).toFixed(2) + 'deg) scale(' + (1 + 0.06 * p).toFixed(3) + ')';
    const R = Math.max(w, h2), vg = g.createRadialGradient(w / 2, h2 / 2, Math.max(0, R * (0.55 * (1 - p))), w / 2, h2 / 2, R * (0.8 - 0.4 * p)); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.97)'); g.fillStyle = vg; g.fillRect(0, 0, w, h2);
    if (p > 0.35) { const k = Math.min(1, (p - 0.35) / 0.5) * 0.5; g.fillStyle = '#000'; g.fillRect(0, 0, w, h2 * k); g.fillRect(0, h2 * (1 - k), w, h2 * k); }
    if (p > 0.9) { g.fillStyle = 'rgba(0,0,0,' + ((p - 0.9) / 0.1) + ')'; g.fillRect(0, 0, w, h2); }
  }
  const survVisBlur = () => 0;
  /** Esqueleto holográfico estilizado: líneas de neón, sin detalles anatómicos explícitos. */
  function skeleton(sc) {
    const B = [], add = (x1, y1, x2, y2, w) => B.push([x1 * sc, y1 * sc, x2 * sc, y2 * sc, w || 3]);
    add(0, -0.34, 0, 0.1, 5); // columna
    for (let i = 0; i < 5; i++) { const y = -0.26 + i * 0.045, wd = 0.1 - Math.abs(i - 1.5) * 0.012; add(0, y, -wd, y + 0.03); add(0, y, wd, y + 0.03); }
    add(-0.12, -0.28, 0.12, -0.28, 4); add(-0.12, -0.28, -0.2, -0.08); add(-0.2, -0.08, -0.16, 0.08); add(0.12, -0.28, 0.2, -0.08); add(0.2, -0.08, 0.16, 0.08);
    add(-0.09, 0.1, 0.09, 0.1, 4); add(-0.09, 0.1, -0.1, 0.3); add(-0.1, 0.3, -0.09, 0.5); add(0.09, 0.1, 0.1, 0.3); add(0.1, 0.3, 0.09, 0.5);
    return B;
  }
  function drawDose(g, w, h2, p, t) {
    g.fillStyle = 'rgba(0,10,25,' + (0.7 * Math.min(1, p * 3)) + ')'; g.fillRect(0, 0, w, h2);
    const sc = Math.min(w, h2) * 0.74, cx = w / 2, cy = h2 * 0.5;
    g.save(); g.translate(cx, cy); g.lineCap = 'round';
    const fl = 0.75 + 0.25 * Math.sin(t * 40) * (p > 0.2 ? 1 : 0.2), bodyA = Math.max(0, 1 - p / 0.35), skA = Math.min(1, Math.max(0, (p - 0.15) / 0.25));
    // silueta del personaje (relleno suave) que se vuelve esqueleto holográfico
    if (bodyA > 0) { g.fillStyle = 'rgba(90,220,255,' + 0.28 * bodyA + ')'; g.strokeStyle = 'rgba(120,230,255,' + 0.7 * bodyA + ')'; g.lineWidth = 3; g.beginPath(); g.arc(0, -0.4 * sc, 0.075 * sc, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.roundRect(-0.13 * sc, -0.3 * sc, 0.26 * sc, 0.4 * sc, 0.05 * sc); g.fill(); g.stroke(); g.beginPath(); g.roundRect(-0.1 * sc, 0.1 * sc, 0.2 * sc, 0.42 * sc, 0.04 * sc); g.fill(); g.stroke(); }
    const dis = Math.max(0, (p - 0.5) / 0.5), bones = skeleton(sc);
    g.shadowColor = '#4de6ff'; g.shadowBlur = 14; g.strokeStyle = 'rgba(140,240,255,' + (skA * fl) + ')'; g.fillStyle = 'rgba(140,240,255,' + (skA * fl) + ')';
    g.lineWidth = 3; g.beginPath(); g.arc(0, -0.4 * sc, 0.07 * sc, 0, 7); if (dis < 0.3) g.stroke(); g.fillStyle = 'rgba(0,15,30,' + skA + ')'; g.beginPath(); g.arc(-0.025 * sc, -0.41 * sc, 0.014 * sc, 0, 7); g.arc(0.025 * sc, -0.41 * sc, 0.014 * sc, 0, 7); g.fill();
    bones.forEach((b, i) => { if (rnd(i + 90) < dis) { if (p < 0.98 && Math.random() < 0.15) { g.fillStyle = 'rgba(140,240,255,0.8)'; g.fillRect((b[0] + b[2]) / 2 + (Math.random() - 0.5) * 20, (b[1] + b[3]) / 2 - dis * 120 * Math.random(), 2, 2); } return; } g.lineWidth = b[4]; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[2], b[3]); g.stroke(); });
    g.restore();
    g.fillStyle = 'rgba(80,220,255,0.07)'; for (let y = 0; y < h2; y += 4) g.fillRect(0, y, w, 1);
    const sy = ((t * 160) % (h2 + 80)) - 40; g.fillStyle = 'rgba(120,240,255,0.18)'; g.fillRect(0, sy, w, 22);
    if (p > 0.92) { g.fillStyle = 'rgba(0,0,0,' + ((p - 0.92) / 0.08) + ')'; g.fillRect(0, 0, w, h2); }
  }
  function drawCore(g, w, h2, p, t) {
    g.fillStyle = '#02030a'; g.fillRect(0, 0, w, h2);
    for (let i = 0; i < 120; i++) { const x = ((rnd(i) * w - t * (6 + rnd(i + 4) * 30)) % w + w) % w, y = rnd(i + 7) * h2; g.fillStyle = 'rgba(220,230,255,' + (0.3 + rnd(i + 2) * 0.6) + ')'; g.fillRect(x, y, 1 + rnd(i + 9) * 1.5, 1 + rnd(i + 9) * 1.5); }
    const R = Math.min(w, h2), e = ease(p), x = w * (0.4 + 0.5 * e), y = h2 * (0.5 - 0.22 * e), sc = (R / 380) * (1 - 0.82 * e), a = t * 0.5 * (0.4 + e);
    g.save(); g.translate(x, y); g.rotate(a); g.scale(sc, sc);
    g.fillStyle = '#3558c0'; g.fillRect(-220, -34, 120, 68); g.fillRect(100, -34, 120, 68); g.strokeStyle = '#9db4ff'; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-220 + i * 30, -34); g.lineTo(-220 + i * 30, 34); g.moveTo(100 + i * 30, -34); g.lineTo(100 + i * 30, 34); g.stroke(); }
    g.fillStyle = '#7d89aa'; g.fillRect(-100, -10, 200, 20);
    g.fillStyle = '#c9d2ea'; g.beginPath(); g.roundRect(-60, -48, 120, 96, 26); g.fill(); g.strokeStyle = '#8795bd'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, 90, 90, 0, 0, 7); g.stroke();
    const lit = p < 0.5 ? (Math.random() < 0.85 - p * 1.2 ? 1 : 0.15) : 0;
    g.fillStyle = 'rgba(255,214,110,' + (0.2 + 0.8 * lit) * (p < 0.5 ? 1 : 0.15) + ')'; for (let i = -2; i <= 2; i++) g.fillRect(i * 22 - 7, -8, 14, 16);
    g.restore();
    if (p < 0.4) for (let i = 0; i < 8; i++) { const sx = x + (Math.random() - 0.5) * 240 * sc, sy2 = y + (Math.random() - 0.5) * 120 * sc; g.fillStyle = 'rgba(255,200,90,' + Math.random() + ')'; g.fillRect(sx, sy2, 3, 3); }
    g.fillStyle = 'rgba(255,60,50,' + (0.12 * (0.5 + 0.5 * Math.sin(t * 8)) * (1 - p)) + ')'; g.fillRect(0, 0, w, h2);
    g.fillStyle = 'rgba(255,200,190,' + Math.min(1, p * 3) * (1 - Math.max(0, (p - 0.8) / 0.2)) + ')'; g.font = 'bold ' + Math.round(R * 0.04 + 10) + 'px system-ui'; g.textAlign = 'center'; g.fillText(LANG === 'es' ? 'NÚCLEO APAGADO · PÉRDIDA DE ENERGÍA' : 'CORE OFFLINE · POWER LOST', w / 2, h2 * 0.9);
    if (p > 0.85) { g.fillStyle = 'rgba(0,0,0,' + ((p - 0.85) / 0.15) + ')'; g.fillRect(0, 0, w, h2); }
  }
  const DRAW = { cold: drawCold, rover: drawRover, food: drawFaint, dose: drawDose, core: drawCore };
  function startGameOver(reason) {
    if (goActive) return; goActive = true; survBar.classList.add('hidden'); survFx.style.background = 'none';
    Sfx.play('crit'); const rm = document.documentElement.classList.contains('rm'), T = rm ? 1.2 : (ANIM_T[reason] || 3.4), d = dpr || 1;
    goCv.width = Math.floor(innerWidth * d); goCv.height = Math.floor(innerHeight * d); goCv.classList.remove('hidden');
    const g = goCv.getContext('2d'), t0 = performance.now(); let done = false;
    const finish = () => { if (done) return; done = true; window.removeEventListener('keydown', onKey); goCv.removeEventListener('pointerdown', finish); goCv.classList.add('hidden'); cv.style.transform = ''; showGameOver(reason); };
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); } };
    goDone = finish; window.addEventListener('keydown', onKey); goCv.addEventListener('pointerdown', finish);
    const tick = (now) => {
      if (done || !goActive) return; const t = (now - t0) / 1000, p = Math.min(1, t / T);
      g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
      if (!rm) (DRAW[reason] || drawFaint)(g, innerWidth, innerHeight, p, t); else { g.fillStyle = 'rgba(0,0,0,' + p + ')'; g.fillRect(0, 0, innerWidth, innerHeight); }
      if (p >= 1) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const GO_T = {
    cold: { t: ['Congelación', 'Frozen'], tip: ['Equípate el traje en el vestuario de la bahía antes de salir. En el exterior vigila la energía del traje y vuelve cuando el aviso lo pida.', 'Put the suit on at the bay locker before going out. Outside, watch the suit power and head back when the warning says so.'] },
    rover: { t: ['Accidente con el rover', 'Rover accident'], tip: ['Frena antes de los obstáculos: solo los choques a más de 6 casillas por segundo dañan el rover. Con la integridad baja, vuelve despacio y repáralo en el taller.', 'Brake before obstacles: only hits above 6 tiles per second damage the rover. With low integrity, drive back slowly and repair it in the workshop.'] },
    food: { t: ['Desmayo por falta de alimentos', 'Fainted from lack of food'], tip: ['Cualquier alimento reinicia la cuenta. Siembra pronto, cuida las reservas y pide suministros a la Tierra antes de que se acaben.', 'Any food resets the count. Plant early, look after the reserves and ask Earth for supplies before they run out.'] },
    dose: { t: ['Exposición a la radiación', 'Radiation exposure'], tip: ['Usa el refugio y el blindaje durante las ráfagas solares y limita el tiempo fuera. El medidor de dosis avisa a partir del 60 %.', 'Use the shelter and shielding during solar bursts and limit time outside. The dose meter warns from 60 %.'] },
    core: { t: ['Falla del núcleo energético', 'Energy core failure'], tip: ['Repara el reactor antes de que baje del 20 % y ahorra energía con las prioridades eléctricas para que la batería aguante.', 'Repair the reactor before it drops below 20 % and save power with the electrical priorities so the battery lasts.'] }
  };
  function showGameOver(reason) {
    if (!S) return; const es = LANG === 'es', T = GO_T[reason] || GO_T.food, i = es ? 0 : 1, day = Math.floor(S.t / 24) + 1;
    let extra = ''; if (reason === 'cold' && S.surv) extra = S.surv.why === 'suit' ? (es ? ' La energía del traje estaba agotada.' : ' The suit power was exhausted.') : (es ? ' No llevabas el traje puesto.' : ' You were not wearing the suit.');
    const body = h('div', { class: 'panel narrow cine-panel go-panel', role: 'alertdialog', 'aria-label': 'Game over' },
      h('div', { class: 'go-title', 'data-go': reason }, 'GAME OVER'), h('h2', null, T.t[i]),
      h('p', { class: 'go-cause' }, (es ? 'Causa: ' : 'Cause: ') + tr(DATA.ENDT[reason]) + extra),
      h('p', { class: 'small' }, '💡 ' + T.tip[i]),
      h('p', { class: 'small muted' }, (es ? 'Sobreviviste ' : 'You survived ') + day + (es ? (day === 1 ? ' día.' : ' días.') : (day === 1 ? ' day.' : ' days.'))),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, btn(es ? 'REINTENTAR' : 'RETRY', retryMission, 'primary wiz-big', { 'data-act': 'retry', autofocus: true }),
        btn('📄 ' + _('report'), () => { goActive = false; showReport(); }), btn(_('mainMenu'), () => { goActive = false; survReset(); mainMenu(); })));
    showScreen(body, 'cine go');
  }
  /** Reintentar: misma misión y ajustes, partida nueva desde cero (recursos, personajes, rover y sistemas en su valor inicial). */
  function retryMission() {
    survReset(); const o = lastStart; if (!o) { mainMenu(); return; }
    popAll(); newRun(o.scen, o.diff, o.opts);
  }
  const survDebug = { noSuitPanel, survFrame, startGameOver, showGameOver, retryMission, get slow() { return survSlow; }, get lastStart() { return lastStart; }, skip: () => goDone && goDone(), get active() { return goActive; } };
