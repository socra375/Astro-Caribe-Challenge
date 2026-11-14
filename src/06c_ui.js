  /* =================== MINIJUEGOS: intro → juego → resultado =================== */
  function miniIntro(kind, opts) {
    const D = MG.defs[kind];
    let lvl = { explorer: 1, engineer: 2, commander: 3 }[S ? S.diff : 'explorer'] || 1;
    const effTxt = {
      wiring: opts.inc ? (LANG === 'es' ? 'Repara el incidente seleccionado.' : 'Repairs the selected incident.') : (LANG === 'es' ? 'Mejora la salud de ' : 'Improves health of ') + tr(DATA.SYS_T[opts.sys || 'reactor']) + '.',
      balance: LANG === 'es' ? 'Fija los límites de consumo del invernadero, laboratorio y comunicaciones.' : 'Sets consumption caps for greenhouse, lab and comms.',
      o2: LANG === 'es' ? 'Calibra el sensor y mejora el generador de O₂.' : 'Calibrates the sensor and improves the O₂ generator.',
      solar: LANG === 'es' ? 'Mejora la alineación de los paneles y limpia el polvo.' : 'Improves panel alignment and cleans dust.',
      rover: LANG === 'es' ? 'Trae muestras y regolito (materiales).' : 'Brings samples and regolith (materials).',
      gh: LANG === 'es' ? 'Mejora la salud de los cultivos y desbloquea el riego por goteo.' : 'Improves crop health and unlocks drip irrigation.'
    }[kind];
    const lvSel = h('div', { class: 'row', role: 'radiogroup', 'aria-label': _('level') });
    const drawLv = () => { lvSel.innerHTML = ''; [1, 2, 3].forEach((l) => lvSel.append(h('button', { class: 'btn sm', role: 'radio', 'aria-checked': l === lvl ? 'true' : 'false', style: l === lvl ? { background: 'var(--accent)', color: 'var(--on-accent)' } : {}, onclick: () => { lvl = l; drawLv(); } }, _('level') + ' ' + l))); };
    drawLv();
    push(panel(D.icon + ' ' + tr(D.t), h('div', null,
      h('h3', null, _('instructions')), h('p', null, tr(D.how)), D.hintKeys ? h('p', { class: 'small muted' }, tr(D.hintKeys)) : null,
      h('p', { class: 'small' }, '⏱ ' + D.dur(lvl) + ' s · 🎯 ' + effTxt), lvSel,
      h('div', { class: 'row', style: { marginTop: '12px' } }, btn('▶ ' + _('real'), () => { pop(); miniPlay(kind, opts, lvl, false); }, 'primary', { autofocus: true, disabled: !S || S.ended ? true : null }), btn('🧪 ' + _('practice'), () => { pop(); miniPlay(kind, opts, lvl, true); }), btn(_('cancel'), () => pop())))));
  }
  function miniPlay(kind, opts, lvl, practice) {
    const D = MG.defs[kind];
    const g = { lvl, t: 0, dur: D.dur(lvl), keys: {}, opts: opts || {}, done: false };
    D.setup(g);
    const c = h('canvas', { width: MG.GW, height: MG.GH, 'aria-label': tr(D.t) });
    const cx = c.getContext('2d');
    const tbar = h('i', { style: { width: '100%' } });
    const pt = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * MG.GW / r.width, (e.clientY - r.top) * MG.GH / r.height]; };
    if (D.pointer) {
      c.addEventListener('pointerdown', (e) => { e.preventDefault(); c.setPointerCapture(e.pointerId); const [x, y] = pt(e); D.pointer(g, 'down', x, y); });
      c.addEventListener('pointermove', (e) => { const [x, y] = pt(e); D.pointer(g, 'move', x, y); });
      c.addEventListener('pointerup', (e) => { const [x, y] = pt(e); D.pointer(g, 'up', x, y); });
    }
    const body = h('div', null, h('div', { class: 'pbar', style: { marginBottom: '8px' } }, tbar), h('div', { class: 'mg-wrap' }, c), D.controls ? h('div', { style: { marginTop: '10px' } }, D.controls(g)) : null,
      h('div', { class: 'row', style: { marginTop: '10px', justifyContent: 'space-between' } }, h('span', { class: 'small muted' }, practice ? '🧪 ' + _('practice') : '▶ ' + _('real')), btn(_('cancel'), () => { g.done = true; mgRun = null; pop(); })));
    const s = push(panel(D.icon + ' ' + tr(D.t), body), { sticky: true, onclose: () => { g.done = true; } });
    mgRun = { kind, g, el: s, tick: (dt) => {
      g.t += dt; D.update(g, dt); D.draw(g, cx);
      tbar.style.width = clampN(1 - g.t / g.dur, 0, 1) * 100 + '%';
      if (g.t >= g.dur) g.done = true;
      if (g.done) { mgRun = null; const res = D.result(g); setTimeout(() => { if (s.isConnected) { pop(); miniResult(kind, opts, lvl, practice, res); } }, 200); }
    } };
  }
  function miniResult(kind, opts, lvl, practice, res) {
    const D = MG.defs[kind];
    if (!practice && S && !S.ended) {
      const payload = Object.assign({}, res, { inc: opts.inc, sys: opts.sys });
      Sim.mini(S, kind, payload); processLogs(); stack.forEach((x) => x._refresh && x._refresh());
    }
    Sfx.play(res.ok ? 'ok' : 'bad');
    push(panel((res.ok ? '✔ ' + _('success') : '✖ ' + _('fail')) + ' · ' + tr(D.t), h('div', null,
      h('p', null, _('score') + ': ' + Math.round(res.score * 100) + ' %' + (kind === 'rover' ? ' · ◆ ' + res.samples : '')),
      bar(res.score, res.ok ? 'var(--success)' : 'var(--warning)'),
      practice ? h('p', { class: 'small muted' }, LANG === 'es' ? 'Fue práctica: la base no cambió.' : 'It was practice: the base did not change.') : h('p', { class: 'small' }, res.ok ? (LANG === 'es' ? 'Los sistemas de la base se actualizaron.' : 'Base systems were updated.') : (LANG === 'es' ? 'Efecto parcial aplicado. ¡Inténtalo otra vez!' : 'Partial effect applied. Try again!')),
      h('div', { class: 'card' }, h('h3', null, '💡 ' + _('learned')), h('p', null, tr(D.sci))),
      h('div', { class: 'row', style: { marginTop: '10px' } }, btn('🔁 ' + _('tryAgain'), () => { pop(); miniIntro(kind, opts); }), btn(_('close'), () => pop(), 'primary', { autofocus: true }))), { narrow: true }));
  }

  /* =================== CONEXIÓN CON LA TIERRA =================== */
  function earthList() {
    const done = (id) => (S ? S.m[id].st === 'done' : false) || !!(Store.get('cards', {})[id]);
    const body = h('div', null, h('p', null, LANG === 'es' ? 'Cada misión desbloquea una ficha que conecta lo aprendido en el espacio con República Dominicana y el mundo.' : 'Each mission unlocks a card connecting what you learned in space with the Dominican Republic and the world.'),
      h('div', { class: 'grid2' }, [1, 2, 3, 4, 5, 6, 7].map((id) => h('div', { class: 'card' }, h('h3', null, DATA.MIS[id].icon + ' ' + tr(DATA.MIS[id].t)),
        h('div', null, DATA.EARTH[id].sdg.map((n) => h('span', { class: 'sdg', style: { background: DATA.SDG[n].c } }, 'ODS ' + n))),
        done(id) ? btn('🌎 ' + (LANG === 'es' ? 'Abrir ficha' : 'Open card'), () => earthCard(id), 'primary sm') : h('p', { class: 'small muted' }, '🔒 ' + _('locked'))))));
    if (running) push(panel('🌎 ' + _('earthConn'), body)); else showScreen(h('div', { class: 'panel' }, btn(_('back'), mainMenu, 'sm'), h('h2', null, '🌎 ' + _('earthConn')), body));
  }
  function earthCard(id, fresh) {
    const E = DATA.EARTH[id];
    const cards = Store.get('cards', {}); cards[id] = 1; Store.set('cards', cards);
    const Q = DATA.QUIZ[id];
    const quizBox = h('div', { class: 'card' }, h('h3', null, '❓ ' + _('quiz')), h('p', null, tr(Q.q)));
    const answered = S && S.quiz[id] != null;
    Q.o.forEach((o, i) => quizBox.append(btn(tr(o), (e) => {
      const ok = i === Q.a;
      if (S) Sim.reportQuiz(S, id, ok);
      if (ok) { stats.quizOk++; Store.set('stats', stats); if (stats.quizOk >= 5) unlock('quiz'); }
      quizBox.querySelectorAll('button').forEach((b) => (b.disabled = true));
      e.target.style.borderColor = ok ? 'var(--success)' : 'var(--danger)';
      quizBox.append(h('p', { class: ok ? 'delta-up' : 'delta-down' }, (ok ? '✔ ' + _('correct') : '✖ ' + _('wrong')) + ' '), h('p', null, tr(Q.why)));
      Sfx.play(ok ? 'ok' : 'bad');
    }, 'sm', { style: { display: 'block', margin: '6px 0', width: '100%', textAlign: 'left' } })));
    if (answered) quizBox.append(h('p', { class: 'small muted' }, (LANG === 'es' ? 'Ya respondiste en esta partida. ' : 'Already answered this game. ') + tr(Q.why)));
    const body = h('div', null,
      fresh ? h('p', { class: 'tag ok' }, '✔ ' + (LANG === 'es' ? '¡Misión completada! Nueva ficha desbloqueada.' : 'Mission completed! New card unlocked.')) : null,
      h('div', { class: 'earth3' },
        h('div', { class: 'card' }, h('h3', null, '🚀 A. ' + _('spaceT')), h('p', null, tr(E.space))),
        h('div', { class: 'card rd' }, h('h3', null, '🇩🇴 B. ' + _('rdT')), h('p', null, tr(E.rd))),
        h('div', { class: 'card gl' }, h('h3', null, '🌍 C. ' + _('worldT')), h('p', null, tr(E.world)))),
      h('div', { class: 'card', style: { marginTop: '10px' } }, h('h3', null, '🎛️ ' + _('tryToy')), toy(E.toy)),
      h('div', { class: 'card', style: { marginTop: '10px' } }, h('h3', null, '🎯 ' + _('sdgT')), E.sdg.map((n) => h('p', null, h('span', { class: 'sdg', style: { background: DATA.SDG[n].c } }, tr(DATA.SDG[n])), ' ', tr(DATA.SDG_WHY[n])))),
      h('div', { class: 'card', style: { marginTop: '10px' } }, h('h3', null, '⚖️ ' + _('limitsT')), h('p', null, tr(E.lim))),
      h('div', { style: { marginTop: '10px' } }, quizBox));
    push(panel('🌎 ' + _('earthConn') + ' · ' + tr(DATA.MIS[id].t), body));
  }
  function toy(kind) {
    const es = LANG === 'es';
    const out = h('p', { 'aria-live': 'polite' });
    const sl = (label, min, max, step, val, f) => { const r = h('input', { type: 'range', min, max, step, value: val, 'aria-label': label, oninput: () => f() }); return [h('label', { class: 'small' }, label), r]; };
    const note = h('p', { class: 'small muted' }, es ? 'Ejemplo ilustrativo para aprender; no es un dato estadístico de ningún país.' : 'Illustrative example for learning; not a statistic for any country.');
    if (kind === 'leak') {
      const [l, r] = sl(es ? 'Pérdida diaria de un tanque de 1000 L (%)' : 'Daily loss of a 1000 L tank (%)', 0, 10, 0.5, 3, () => upd());
      const upd = () => { const p = +r.value / 100, left = 1000 * Math.pow(1 - p, 30); out.textContent = (es ? 'Después de 30 días quedarían ' : 'After 30 days there would be ') + Math.round(left) + ' L (' + (es ? 'se perdieron ' : 'lost ') + Math.round(1000 - left) + ' L).'; };
      upd(); return h('div', null, l, r, out, note);
    }
    if (kind === 'solar') {
      const [l1, a] = sl(es ? 'Potencia de paneles (kW)' : 'Panel power (kW)', 0.5, 5, 0.5, 2, () => upd());
      const [l2, b] = sl(es ? 'Horas de sol útil' : 'Useful sun hours', 2, 8, 0.5, 5, () => upd());
      const [l3, cc] = sl(es ? 'Batería (kWh)' : 'Battery (kWh)', 0, 15, 1, 5, () => upd());
      const [l4, d] = sl(es ? 'Consumo de noche (kWh)' : 'Night use (kWh)', 1, 10, 0.5, 4, () => upd());
      const upd = () => { const day = +a.value * +b.value, ok = +cc.value >= +d.value; out.textContent = (es ? 'Energía diaria ≈ ' : 'Daily energy ≈ ') + fmt(day) + ' kWh. ' + (ok ? (es ? '✔ La batería cubre la noche.' : '✔ The battery covers the night.') : (es ? '⚠ La batería no alcanza: reduce consumo o amplía almacenamiento.' : '⚠ Battery is not enough: reduce use or add storage.')); };
      upd(); return h('div', null, l1, a, l2, b, l3, cc, l4, d, out, note);
    }
    if (kind === 'crop') {
      const [l, r] = sl(es ? 'Número de plantas' : 'Number of plants', 10, 200, 10, 60, () => upd());
      const upd = () => { const n = +r.value, flood = n * 1.0, drip = n * 0.55; out.textContent = (es ? 'Riego por inundación: ' : 'Flood irrigation: ') + fmt(flood, 0) + (es ? ' unidades · Goteo: ' : ' units · Drip: ') + fmt(drip, 0) + (es ? ' unidades (factor 0,55 del modelo del juego).' : ' units (game model factor 0.55).'); };
      upd(); return h('div', null, l, r, out, note);
    }
    if (kind === 'delay') {
      const [l, r] = sl(es ? 'Distancia Tierra–Marte (millones de km)' : 'Earth–Mars distance (million km)', 55, 400, 5, 225, () => upd());
      const upd = () => { const min = +r.value * 1e9 / 299792458 / 60; out.textContent = (es ? 'La luz tarda ' : 'Light takes ') + fmt(min) + (es ? ' min en ir y ' : ' min one way, ') + fmt(min * 2) + (es ? ' min en ir y volver.' : ' min round trip.'); };
      upd(); return h('div', null, l, r, out, h('p', { class: 'small muted' }, es ? 'Cálculo real: distancia ÷ velocidad de la luz (299 792 km/s). Marte está entre ~55 y ~400 millones de km de la Tierra.' : 'Real calculation: distance ÷ speed of light (299,792 km/s). Mars is ~55 to ~400 million km from Earth.'));
    }
    if (kind === 'site') {
      const sites = [{ n: es ? 'Loma alta' : 'High hill', flood: 5, slope: 2, access: 2 }, { n: es ? 'Orilla del río' : 'Riverbank', flood: 1, slope: 5, access: 5 }, { n: es ? 'Valle amplio' : 'Wide valley', flood: 3, slope: 4, access: 4 }];
      const [l1, a] = sl(es ? 'Importancia: evitar inundaciones' : 'Weight: avoid floods', 0, 5, 1, 4, () => upd());
      const [l2, b] = sl(es ? 'Importancia: terreno plano' : 'Weight: flat ground', 0, 5, 1, 2, () => upd());
      const [l3, cc] = sl(es ? 'Importancia: acceso fácil' : 'Weight: easy access', 0, 5, 1, 2, () => upd());
      const upd = () => { const sc = sites.map((s) => [s.n, s.flood * a.value + s.slope * b.value + s.access * cc.value]).sort((x, y) => y[1] - x[1]); out.textContent = (es ? 'Mejor opción con tus prioridades: ' : 'Best option with your priorities: ') + sc[0][0] + '. ' + (es ? 'Cambia las prioridades y mira cómo cambia la respuesta.' : 'Change priorities and see the answer change.'); };
      upd(); return h('div', null, l1, a, l2, b, l3, cc, out, note);
    }
    const items = es ? ['Agua potable guardada', 'Linterna y baterías', 'Radio para recibir avisos', 'Plan familiar de encuentro', 'Documentos protegidos', 'Botiquín'] : ['Stored drinking water', 'Flashlight and batteries', 'Radio for warnings', 'Family meeting plan', 'Protected documents', 'First-aid kit'];
    const box = h('div', null);
    const upd = () => { const n = box.querySelectorAll('input:checked').length; out.textContent = (es ? 'Preparación: ' : 'Preparedness: ') + Math.round(n / items.length * 100) + ' %. ' + (es ? 'Igual que la base: prepararse antes evita improvisar en el peligro.' : 'Like the base: preparing early avoids improvising in danger.'); };
    items.forEach((t) => box.append(h('label', { class: 'row small' }, h('input', { type: 'checkbox', onchange: upd, style: { width: '22px', height: '22px' } }), t)));
    upd(); return h('div', null, box, out, h('p', { class: 'small muted' }, es ? 'Lista orientativa. Sigue siempre las indicaciones oficiales (COE, ONAMET, Defensa Civil).' : 'Guidance list. Always follow official instructions.'));
  }

  /* =================== INFORME FINAL =================== */
  function showReport() {
    if (!S) return;
    const R = Sim.report(S), es = LANG === 'es';
    stopPlay(); popAll();
    if (R.ended && R.ended.kind === 'victory') { stats.wins++; unlock('all'); unlock(S.scen); }
    Store.set('stats', stats); Store.del('run');
    const reasonTxt = R.ended ? tr(DATA.ENDT[R.ended.reason]) : '';
    const MISTAKE = { cropDead: es ? 'Se perdieron cultivos por falta de luz, agua o temperatura adecuada.' : 'Crops died from lack of light, water or proper temperature.', mg_wiring: es ? 'Algunas reparaciones de cableado no salieron.' : 'Some wiring repairs failed.', mg_o2: es ? 'La calibración de O₂ falló alguna vez.' : 'O₂ calibration failed at times.', mg_solar: es ? 'Los paneles quedaron mal orientados.' : 'Panels were poorly aimed.', mg_rover: es ? 'Alguna expedición del rover no volvió a tiempo.' : 'A rover trip did not return in time.', mg_gh: es ? 'El invernadero se desestabilizó.' : 'The greenhouse got unstable.', mg_balance: es ? 'El balance energético se excedió.' : 'The energy budget was exceeded.' };
    const GOOD = { dec_proto: es ? 'Usaste el protocolo de refugio.' : 'You used the shelter protocol.', dec_shield: es ? 'Reforzaste el blindaje.' : 'You reinforced shielding.', dec_shelter: es ? 'Ampliaste el refugio.' : 'You expanded the shelter.', dec_recycle: es ? 'Reciclaste residuos en materiales.' : 'You recycled waste into materials.', dec_emergency: es ? 'Gestionaste la energía con el modo emergencia.' : 'You managed power with emergency mode.', dec_recmode: es ? 'Ajustaste el reciclador de agua.' : 'You tuned the water recycler.', dec_lights: es ? 'Ajustaste la iluminación del invernadero.' : 'You adjusted greenhouse lighting.', dec_maint: es ? 'Hiciste mantenimiento preventivo.' : 'You did preventive maintenance.', dec_isru: es ? 'Gestionaste el extractor de hielo.' : 'You managed the ice extractor.', mg_wiring: es ? 'Reparaste circuitos.' : 'You repaired circuits.', mg_solar: es ? 'Orientaste los paneles solares.' : 'You aimed the solar panels.', mg_o2: es ? 'Calibraste el oxígeno.' : 'You calibrated oxygen.', mg_gh: es ? 'Estabilizaste el invernadero.' : 'You stabilized the greenhouse.', mg_rover: es ? 'Exploraste con el rover.' : 'You explored with the rover.', mg_balance: es ? 'Repartiste bien la energía.' : 'You balanced energy well.', dec_analyze: es ? 'Analizaste muestras.' : 'You analyzed samples.' };
    const mistakes = Object.keys(R.mistakes).filter((k) => MISTAKE[k]).map((k) => MISTAKE[k]);
    const failedM = Object.keys(R.mistakes).filter((k) => /^m\d$/.test(k)).map((k) => (es ? 'No superaste a la primera: ' : 'Not passed first time: ') + tr(DATA.MIS[k.slice(1)].t));
    if (R.brownH > 4) mistakes.push((es ? 'El soporte vital estuvo sin energía suficiente ' : 'Life support lacked power for ') + fmt(R.brownH, 0) + ' h.');
    if (R.critH > 12) mistakes.push((es ? 'Hubo alertas críticas durante ' : 'Critical alerts lasted ') + fmt(R.critH, 0) + ' h.');
    const good = Object.keys(R.good).filter((k) => GOOD[k]).map((k) => GOOD[k]);
    const sdgs = new Set(); R.done.forEach((id) => DATA.EARTH[id].sdg.forEach((n) => sdgs.add(n)));
    const improve = [];
    if (S.st.maxDose > S.limit * 0.5) improve.push(es ? 'Prepara el refugio antes de las tormentas solares.' : 'Prepare the shelter before solar storms.');
    if (R.waterRec < R.waterUsed * 0.6) improve.push(es ? 'Recupera más agua: repara el reciclador y usa riego por goteo.' : 'Recover more water: repair the recycler and use drip irrigation.');
    if (R.brownH > 4) improve.push(es ? 'Apaga primero lo no esencial cuando falte energía.' : 'Turn off non-essentials first when power is short.');
    if (R.foodProd < 3) improve.push(es ? 'Siembra pronto: los cultivos tardan 7 días.' : 'Plant early: crops take 7 days.');
    if (!improve.length) improve.push(es ? 'Prueba el nivel siguiente o el otro escenario.' : 'Try the next level or the other scenario.');
    const title = R.ended && R.ended.kind === 'victory' ? '🏆 ' + (es ? '¡Misión cumplida!' : 'Mission accomplished!') : R.ended && R.ended.kind === 'abort' ? '🛟 ' + (es ? 'Misión interrumpida: ¡a aprender!' : 'Mission interrupted: time to learn!') : '📄 ' + _('report');
    const tbl = (rows) => h('table', null, h('tbody', null, rows.map(([a, b]) => h('tr', null, h('th', null, a), h('td', null, b)))));
    const body = h('div', { class: 'panel' },
      h('h2', null, title), h('p', null, reasonTxt), h('p', { class: 'small muted' }, (S.scen === 'mars' ? '🔴 ' + _('mars') : '🌙 ' + _('moon')) + ' · ' + _(S.diff) + ' · ' + (es ? 'semilla ' : 'seed ') + S.seed),
      h('p', { class: 'small' }, es ? 'Este informe no te califica solo por ganar o perder: cada error es información para la próxima misión.' : 'This report does not grade you only on winning or losing: every mistake is information for the next mission.'),
      h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h3', null, _('r1')), tbl([[es ? 'Tiempo de supervivencia' : 'Survival time', fmt(R.days) + (es ? ' días' : ' days') + ' (' + fmt(R.hours, 0) + ' h)'], [es ? 'Objetivos completados' : 'Goals completed', R.done.length + ' / 7 · ' + '★'.repeat(R.stars)], [es ? 'Sistemas mantenidos (≥50 %)' : 'Systems kept (≥50%)', R.sysOk + ' / 8'], [es ? 'Problemas resueltos' : 'Problems solved', R.incRes + ' / ' + R.incTot], [es ? 'Puntos' : 'Points', R.pts]])),
        h('div', { class: 'card' }, h('h3', null, _('r2')), tbl([[es ? 'Agua usada / recuperada' : 'Water used / recovered', fmt(R.waterUsed, 0) + ' / ' + fmt(R.waterRec, 0) + ' L (' + Math.round(R.waterRec / Math.max(1, R.waterUsed) * 100) + ' %)'], [es ? 'Energía generada / consumida' : 'Energy generated / used', fmt(R.eGen, 0) + ' / ' + fmt(R.eUsed, 0) + ' kWh'], [es ? 'Protección radiológica' : 'Radiation protection', (es ? 'nivel ' : 'level ') + R.shield + ' · ' + (es ? 'refugio ' : 'shelter ') + R.cap + ' · ' + (es ? 'dosis máx. ' : 'max dose ') + fmt(R.dose, 1) + ' / ' + R.limit + ' mSv'], [es ? 'Alimentos producidos / consumidos' : 'Food produced / eaten', fmt(R.foodProd) + ' / ' + fmt(R.foodCons) + ' kg'], [es ? 'Tripulación' : 'Crew', (es ? 'bienestar ' : 'wellbeing ') + Math.round(R.well) + ' %']])),
        h('div', { class: 'card' }, h('h3', null, _('r3')),
          h('p', null, h('b', null, es ? 'Conceptos trabajados: ' : 'Concepts practiced: '), R.done.length ? R.done.map((id) => tr(DATA.MIS[id].learn)).join(' ') : (es ? 'Exploración inicial de la base.' : 'Initial base exploration.')),
          h('p', null, h('b', null, es ? 'Preguntas correctas: ' : 'Correct answers: '), R.quizOk + ' / ' + R.quizTot),
          h('p', null, h('b', null, es ? 'Decisiones acertadas:' : 'Good decisions:')), good.length ? h('ul', null, good.map((x) => h('li', null, x))) : h('p', { class: 'muted' }, '—'),
          h('p', null, h('b', null, es ? 'Errores (¡para aprender!):' : 'Mistakes (to learn from!):')), mistakes.concat(failedM).length ? h('ul', null, mistakes.concat(failedM).map((x) => h('li', null, x))) : h('p', { class: 'muted' }, '—'),
          h('p', null, h('b', null, es ? 'Oportunidades de mejora:' : 'Room to improve:')), h('ul', null, improve.map((x) => h('li', null, x)))),
        h('div', { class: 'card' }, h('h3', null, _('r4')),
          R.done.length ? R.done.map((id) => h('div', null, h('p', null, h('b', null, tr(DATA.MIS[id].t))), h('p', { class: 'small' }, '🇩🇴 ' + tr(DATA.EARTH[id].rd)), h('p', { class: 'small' }, '🌍 ' + tr(DATA.EARTH[id].world)), h('p', { class: 'small muted' }, '⚖️ ' + tr(DATA.EARTH[id].lim)))) : h('p', null, es ? 'Completa misiones para descubrir aplicaciones en la Tierra.' : 'Complete missions to discover applications on Earth.'),
          h('div', null, [...sdgs].map((n) => h('span', { class: 'sdg', style: { background: DATA.SDG[n].c } }, tr(DATA.SDG[n])))))),
      h('div', { class: 'row', style: { marginTop: '12px' } }, btn('🚀 ' + _('newRun'), setupScreen, 'primary', { autofocus: true }), btn('🌎 ' + _('earthConn'), () => earthList()), btn('🏠 ' + _('mainMenu'), mainMenu)));
    showScreen(body);
  }

  /* =================== MANUAL Y FUENTES =================== */
  function manual() {
    const es = LANG === 'es';
    const sec = (t, ...p) => h('div', { class: 'card' }, h('h3', null, t), p.map((x) => (typeof x === 'string' ? h('p', null, x) : x)));
    const body = h('div', null, h('div', { class: 'grid2' },
      sec('🎮 ' + (es ? 'Controles' : 'Controls'), es ? 'Ordenador: WASD o flechas para moverte, E / Enter / Espacio para interactuar, P pausa, M silencio, Esc cierra paneles.' : 'Computer: WASD or arrows to move, E / Enter / Space to interact, P pause, M mute, Esc closes panels.', es ? 'Táctil: joystick abajo a la izquierda y botón E grande.' : 'Touch: joystick bottom-left and big E button.'),
      sec('📊 ' + (es ? 'Los 5 indicadores' : 'The 5 indicators'), es ? 'Soporte vital (oxígeno y agua), energía, protección contra radiación, alimentos y bienestar. Cada uno tiene consumo, producción, máximo, umbral de advertencia (⚠ ámbar) y crítico (⛔ rojo).' : 'Life support (oxygen and water), energy, radiation protection, food and wellbeing. Each has use, production, maximum, a warning threshold (⚠ amber) and critical (⛔ red).'),
      sec('🔗 ' + (es ? 'Todo está conectado' : 'Everything is connected'), es ? 'Más luz para las plantas = más comida pero menos batería. El oxígeno se fabrica con agua y electricidad. Reforzar el blindaje gasta materiales y energía. El panel de consecuencias te muestra el efecto antes de confirmar.' : 'More plant light = more food but less battery. Oxygen is made from water and electricity. Reinforcing shielding uses materials and energy. The consequences panel shows the effect before you confirm.'),
      sec('📡 ' + (es ? 'Comunicaciones' : 'Communications'), es ? 'Los mensajes tardan: Luna ≈1,3 s; Marte 3–22 min (datos reales). En el juego 1 minuto-luz ≈ 1 hora simulada para que lo notes. La Tierra responde con datos atrasados.' : 'Messages take time: Moon ≈1.3 s; Mars 3–22 min (real data). In the game 1 light-minute ≈ 1 simulated hour so you notice it. Earth replies with old data.'),
      sec('⏱️ ' + (es ? 'Tiempo' : 'Time'), es ? '1 segundo real = 0,4 h simuladas a x1 (un día ≈ 1 minuto). Usa x2 o x4 para esperar cosechas. Cuando abres un panel, la simulación se detiene.' : '1 real second = 0.4 simulated h at x1 (one day ≈ 1 minute). Use x2 or x4 to wait for harvests. Opening a panel pauses the simulation.'),
      sec('👩‍🚀 ' + (es ? 'Tripulación' : 'Crew'), h('ul', null, Object.keys(DATA.ROLE_T).map((k) => h('li', null, h('b', null, tr(DATA.ROLE_T[k])), ': ' + tr(DATA.ROLE_T[k].b))))),
      sec('🏁 ' + (es ? 'Ganar y aprender' : 'Winning and learning'), es ? 'Ganas al completar las 7 misiones manteniendo los sistemas. Si se agota un recurso esencial, la tripulación es evacuada sana y salva y recibes un informe para mejorar.' : 'You win by completing all 7 missions while keeping systems running. If an essential resource runs out, the crew is safely evacuated and you get a report to improve.'),
      sec('🧪 ' + (es ? 'Datos y modelo' : 'Data and model'), es ? 'Distinguimos: datos reales medidos (con fuente), estimaciones de modelo y simplificaciones para jugar. Consulta «Fuentes científicas».' : 'We distinguish real measured data (with source), model estimates and gameplay simplifications. See "Science sources".'),
      sec('🏅 ' + _('stats'), (es ? 'Partidas: ' : 'Games: ') + stats.runs + ' · ' + (es ? 'Victorias: ' : 'Wins: ') + stats.wins + ' · ' + (es ? 'Misiones: ' : 'Missions: ') + stats.missions + ' · ' + (es ? 'Reparaciones: ' : 'Repairs: ') + stats.repairs, h('ul', null, Object.keys(DATA.ACH).map((k) => h('li', null, (ach[k] ? '🏅 ' : '⬜ ') + tr(DATA.ACH[k])))))),
      h('div', { class: 'row', style: { marginTop: '10px' } }, btn('🎓 ' + _('tut'), () => { if (running) tutorial(); else { tutorialStandalone(); } }), btn('👩‍🚀 ' + (es ? 'Hoja de personajes' : 'Character sheet'), sheetPanel), btn('🎮 ' + (es ? 'Practicar minijuegos' : 'Practice mini-games'), practiceMenu)));
    if (running) push(panel('📘 ' + _('manual'), body)); else showScreen(h('div', { class: 'panel' }, btn(_('back'), mainMenu, 'sm'), h('h2', null, '📘 ' + _('manual')), body));
  }
  function tutorialStandalone() { tutorial(0); }

  /* =================== HOJA DE PERSONAJES =================== */
  function sheetPanel() {
    const es = LANG === 'es', CW = 1200, ROW = 300, HEAD = 70;
    const cvs = h('canvas', { width: CW, height: HEAD + ROW * 5 + 20, style: { width: '100%', background: '#0b1124', borderRadius: '12px' }, role: 'img', 'aria-label': es ? 'Hoja de presentación de los cinco astronautas' : 'Character sheet of the five astronauts' });
    const anim = h('canvas', { width: CW, height: 560, style: { width: '100%', background: '#0b1124', borderRadius: '12px', marginTop: '10px' }, role: 'img', 'aria-label': es ? 'Animaciones de los personajes' : 'Character animations' });
    const POSES = ['idle', 'walk', 'interact', 'repair', 'carry', 'alert', 'celebrate'];
    const PN = es ? { idle: 'Reposo', walk: 'Caminar', interact: 'Interactuar', repair: 'Reparar', carry: 'Transportar', alert: 'Alerta', celebrate: 'Celebrar' } : { idle: 'Idle', walk: 'Walk', interact: 'Interact', repair: 'Repair', carry: 'Carry', alert: 'Alert', celebrate: 'Celebrate' };
    const rm = document.documentElement.classList.contains('rm');
    const wrap = (c, text, x, y, w, lh) => { const words = text.split(' '); let line = ''; for (const wd of words) { if (c.measureText(line + wd).width > w) { c.fillText(line, x, y); y += lh; line = ''; } line += wd + ' '; } c.fillText(line, x, y); return y + lh; };
    const clipDraw = (c, fn, x, y, w, hh) => { c.save(); c.beginPath(); c.rect(x, y, w, hh); c.clip(); c.fillStyle = '#121a33'; c.fillRect(x, y, w, hh); fn(); c.restore(); c.strokeStyle = '#2c3d70'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1); };
    function drawSheet(t) {
      const c = cvs.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cvs.width, cvs.height);
      c.fillStyle = '#eef3ff'; c.font = 'bold 30px system-ui'; c.textAlign = 'left'; c.fillText(es ? 'Tripulación · hoja de personajes' : 'Crew · character sheet', 20, 42);
      c.font = '14px system-ui'; c.fillStyle = '#b4c0e0'; c.fillText(es ? 'Frente · Espalda · Lateral · Casco · Soporte vital · Accesorio · Paleta' : 'Front · Back · Side · Helmet · Life support · Accessory · Palette', 20, 62);
      Chars.ORDER.forEach((role, i) => {
        const R = Chars.ROLES[role], y0 = HEAD + i * ROW;
        c.fillStyle = i % 2 ? '#0e1630' : '#101a38'; c.fillRect(0, y0, CW, ROW - 6);
        c.textAlign = 'left'; c.fillStyle = R.pal.acc; c.font = 'bold 22px system-ui'; c.fillText(tr(R.name), 20, y0 + 32);
        c.fillStyle = '#eef3ff'; c.font = '14px system-ui'; let yy = wrap(c, tr(R.pers), 20, y0 + 56, 230, 18);
        c.fillStyle = '#b4c0e0'; c.font = '13px system-ui'; yy = wrap(c, '◆ ' + tr(R.acc), 20, yy + 4, 230, 17);
        const sw = ['suit', 'shade', 'dark', 'acc', 'glow', 'visor'];
        sw.forEach((k, j) => { const sx = 20 + (j % 3) * 78, sy = y0 + 196 + Math.floor(j / 3) * 44; c.fillStyle = R.pal[k]; c.beginPath(); c.arc(sx + 12, sy, 11, 0, 7); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#b4c0e0'; c.font = '10px monospace'; c.fillText(R.pal[k], sx + 26, sy + 4); });
        const lab = (txt, x) => { c.fillStyle = '#b4c0e0'; c.font = '12px system-ui'; c.textAlign = 'center'; c.fillText(txt, x, y0 + ROW - 16); };
        [[2, es ? 'Frente' : 'Front'], [0, es ? 'Espalda' : 'Back'], [1, es ? 'Lateral' : 'Side']].forEach(([d, l], k) => { const x = 320 + k * 120; Chars.draw(c, role, x, y0 + 250, { dir: d, t, pose: 'idle', scale: 3.1, rm }); lab(l, x); });
        clipDraw(c, () => Chars.draw(c, role, 750, y0 + 26 + 72 * 5.2, { dir: 2, t, pose: 'idle', scale: 5.2, rm, shadow: false }), 680, y0 + 20, 140, 150);
        clipDraw(c, () => Chars.draw(c, role, 735, y0 + 180 + 72 * 3.2, { dir: 1, t, pose: 'idle', scale: 3.2, rm, shadow: false }), 680, y0 + 176, 140, 96);
        lab(es ? 'Casco (frente y perfil)' : 'Helmet (front & profile)', 750);
        clipDraw(c, () => Chars.draw(c, role, 910, y0 + 52 + 64 * 4.2 - 30, { dir: 0, t, pose: 'idle', scale: 4.2, rm, shadow: false }), 840, y0 + 20, 140, 252);
        lab(es ? 'Soporte vital' : 'Life support', 910);
        clipDraw(c, () => Chars.drawAccessory(c, role, 1070, y0 + 150, 9, t), 1000, y0 + 20, 180, 200);
        c.fillStyle = '#eef3ff'; c.font = '11px system-ui'; c.textAlign = 'left'; wrap(c, tr(R.helmetTxt), 1002, y0 + 236, 176, 13);
        lab(es ? 'Accesorio' : 'Accessory', 1090);
      });
    }
    function drawAnim(t) {
      const c = anim.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, anim.width, anim.height);
      c.fillStyle = '#eef3ff'; c.font = 'bold 20px system-ui'; c.textAlign = 'left'; c.fillText(es ? 'Animaciones (en vivo)' : 'Animations (live)', 20, 30);
      POSES.forEach((p, j) => { c.fillStyle = '#b4c0e0'; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText(PN[p], 230 + j * 140, 58); });
      Chars.ORDER.forEach((role, i) => {
        c.textAlign = 'left'; c.fillStyle = Chars.ROLES[role].pal.acc; c.font = 'bold 15px system-ui'; c.fillText(tr(Chars.ROLES[role].name), 20, 132 + i * 96);
        POSES.forEach((p, j) => Chars.draw(c, role, 230 + j * 140, 156 + i * 96, { dir: p === 'walk' ? (Math.floor(t / 2) % 4) : p === 'carry' ? 1 : 2, t, pose: p, moving: p === 'walk', scale: 1.25, rm }));
      });
    }
    let t0 = performance.now(), live = true;
    const loop = (now) => { if (!cvs.isConnected || !live) return; const t = (now - t0) / 1000; drawSheet(t); drawAnim(t); requestAnimationFrame(loop); };
    const body = h('div', null,
      h('p', { class: 'small muted' }, es ? 'Cinco astronautas originales dibujados por código (sin imágenes externas). Cada especialidad se reconoce por su casco, su mochila de soporte vital, sus hombreras y su accesorio, no solo por el color.' : 'Five original astronauts drawn by code (no external images). Each specialty is recognizable by its helmet, life-support pack, shoulder pads and accessory, not only by color.'),
      cvs, anim,
      h('div', { class: 'grid2', style: { marginTop: '10px' } }, Chars.ORDER.map((role) => { const R = Chars.ROLES[role]; return h('div', { class: 'card' }, h('h3', null, tr(R.name)), h('p', { class: 'small' }, '⛑️ ' + tr(R.helmetTxt)), h('p', { class: 'small' }, '🎒 ' + tr(R.packTxt)), h('p', { class: 'small' }, '◆ ' + tr(R.acc))); })));
    const s = running ? push(panel('👩‍🚀 ' + (es ? 'Tripulación' : 'Crew'), body), { onclose: () => (live = false) }) : (showScreen(h('div', { class: 'panel' }, btn(_('back'), mainMenu, 'sm'), h('h2', null, '👩‍🚀 ' + (es ? 'Tripulación' : 'Crew')), body)), null);
    void s;
    drawSheet(0); drawAnim(0);
    requestAnimationFrame(loop);
  }
  function practiceMenu() {
    const body = h('div', { class: 'menu-grid' }, Object.keys(MG.defs).map((k) => btn(MG.defs[k].icon + ' ' + tr(MG.defs[k].t), () => miniPlayPractice(k))));
    push(panel('🎮 ' + _('practice'), body));
  }
  function miniPlayPractice(k) { miniPlay(k, { target: 3, hint: false }, 1, true); }
  function sourcesPanel() {
    const es = LANG === 'es';
    const live = donkiLive ? h('div', { class: 'card' }, h('h3', null, '🛰️ ' + _('liveData')), h('p', { class: 'small muted' }, (es ? 'Consultado: ' : 'Fetched: ') + donkiLive.fetched + ' · api.nasa.gov (DEMO_KEY) · ' + (es ? 'clase de erupción A–X' : 'flare class A–X')),
      donkiLive.items.length ? h('ul', null, donkiLive.items.slice(0, 8).map((x) => h('li', null, x.cls + ' · ' + x.date + (x.region ? ' · AR ' + x.region : '')))) : h('p', null, es ? 'Sin erupciones en el periodo.' : 'No flares in the period.'))
      : h('div', { class: 'card' }, h('h3', null, '📦 ' + _('fallback')), h('p', { class: 'small' }, _('offline')));
    const body = h('div', null, live,
      h('div', { class: 'card', style: { marginTop: '10px' } }, h('h3', null, 'DONKI · ' + _('fallback')), h('table', null, h('tbody', null, DATA.DONKI.map((d) => h('tr', null, h('td', null, d.date), h('td', null, d.type + ' ' + d.cls), h('td', null, tr(d))))))),
      h('table', { style: { marginTop: '10px' } }, h('thead', null, h('tr', null, h('th', null, es ? 'Fuente' : 'Source'), h('th', null, es ? 'Uso en el juego' : 'Use in game'), h('th', null, es ? 'Limitaciones' : 'Limitations'))),
        h('tbody', null, DATA.SOURCES.map((s) => h('tr', null, h('td', null, h('a', { href: s.u, target: '_blank', rel: 'noopener' }, s.n)), h('td', null, tr(s.use)), h('td', null, tr(s.lim)))))),
      h('div', { class: 'card', style: { marginTop: '10px' } }, h('h3', null, es ? 'Tipos de números en el juego' : 'Kinds of numbers in the game'),
        h('ul', null, h('li', null, h('b', null, 'R '), es ? 'Dato real medido o publicado (ej.: 0,84 kg de O₂ por persona y día; 0,64 mSv/día en Marte; 1,125 L de agua por kg de O₂).' : 'Real measured/published data (e.g. 0.84 kg O₂ per person per day; 0.64 mSv/day on Mars; 1.125 L water per kg O₂).'),
          h('li', null, h('b', null, 'M '), es ? 'Estimación de un modelo (ej.: eficiencia del reciclador, ración diaria).' : 'Model estimate (e.g. recycler efficiency, daily ration).'),
          h('li', null, h('b', null, 'G '), es ? 'Simplificación para jugar (ej.: ciclo de cultivo de 7 días, escala del retraso de mensajes, tamaño del reactor).' : 'Gameplay simplification (e.g. 7-day crop cycle, message delay scale, reactor size).'))),
      h('p', { class: 'small muted' }, es ? 'Las cifras dominicanas no se inventan: el juego usa explicaciones cualitativas y remite a ONE, MEM, Medio Ambiente, INDRHI, ONAMET y Agricultura.' : 'Dominican figures are not invented: the game uses qualitative explanations and points to official agencies.'));
    if (running) push(panel('🔭 ' + _('sources'), body)); else showScreen(h('div', { class: 'panel' }, btn(_('back'), mainMenu, 'sm'), h('h2', null, '🔭 ' + _('sources')), body));
  }

  /* =================== DATOS EN VIVO (opcional) =================== */
  function fetchDonki() {
    if (onlineTried) return; onlineTried = true;
    const cached = Store.get('donkiLive', null);
    if (cached && cached.items) donkiLive = cached;
    if (navigator.onLine === false || typeof fetch !== 'function') return;
    const end = new Date(), start = new Date(end.getTime() - 30 * 864e5);
    const d = (x) => x.toISOString().slice(0, 10);
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const to = setTimeout(() => ctl && ctl.abort(), 7000);
    fetch('https://api.nasa.gov/DONKI/FLR?startDate=' + d(start) + '&endDate=' + d(end) + '&api_key=DEMO_KEY', ctl ? { signal: ctl.signal } : {})
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((js) => {
        if (!Array.isArray(js)) return;
        const items = js.filter((x) => x && x.classType).map((x) => ({ cls: String(x.classType).slice(0, 8), date: String(x.beginTime || '').slice(0, 10), region: x.activeRegionNum || null }))
          .sort((a, b) => { const v = (c) => ({ X: 4, M: 3, C: 2, B: 1, A: 0 }[c[0]] || 0) * 100 + parseFloat(c.slice(1) || 0); return v(b.cls) - v(a.cls); });
        donkiLive = { fetched: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', items };
        Store.set('donkiLive', donkiLive);
        if (!running && layer.querySelector('.title-big')) mainMenu();
      })
      .catch(() => { /* sin conexión o límite de DEMO_KEY: se usan los datos locales */ })
      .finally(() => clearTimeout(to));
  }

  /* =================== INICIO =================== */
  function init() {
    applySettings(); resize(); window.addEventListener('resize', resize);
    setupTouch();
    isTouch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    $('#bSpeed').addEventListener('click', () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; updateHud(); Sfx.play('click'); });
    $('#bPause').addEventListener('click', () => togglePause());
    $('#bMute').addEventListener('click', () => toggleMute());
    $('#bMenu').addEventListener('click', () => pauseMenu());
    $('#bAlerts').addEventListener('click', () => openCmd('log'));
    $('#actBtn').addEventListener('click', () => interact());
    cv.addEventListener('pointerdown', (e) => { if (!running || modalOpen() || !S) return; const pk = World.pick(e.clientX, e.clientY, dpr); if (pk) { Sfx.play('click'); openConsole(pk); } });
    document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
    if (/[?&]selftest\b/.test(location.search)) { mainMenu(); selfTestPanel(); }
    else if (/[?&]sheet\b/.test(location.search)) sheetPanel();
    else mainMenu();
    fetchDonki();
    requestAnimationFrame(frame);
  }

  return { init, get scen() { return S ? S.scen : 'moon'; }, get S() { return S; }, _debug: { radio, call, talk, plantCard, wardrobePanel, sheetPanel: () => sheetPanel(), get mg() { return mgRun && mgRun.g; }, openConsole: (id) => openConsole({ id }), newRun, miniPlay, showReport, setSpeed: (v) => (speed = v), get running() { return running; } } };
})();
Game.init();
