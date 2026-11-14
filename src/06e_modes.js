  /* =================== MODALIDADES: Explorador Junior · Ingeniero de Misión =================== */
  const more = (summary, ...kids) => h('details', { class: 'more' }, h('summary', null, summary || _('more')), ...kids);
  const isAdv = () => MODE === 'adv';

  /* Explicaciones científicas de los minijuegos por nivel (el texto técnico original pasa al modo Ingeniero) */
  (function () {
    const J = {
      wiring: ['La electricidad solo pasa si el camino está completo y bien conectado. Un cable mal puesto puede estropear las máquinas.', 'Electricity only flows if the path is complete and well connected. A wrongly placed wire can damage machines.'],
      balance: ['La energía es limitada: primero se cuida lo que mantiene vivas a las personas y luego lo demás.', 'Energy is limited: first protect what keeps people alive, then everything else.'],
      o2: ['Una máquina mide cuánto oxígeno hay y lo corrige. Con poco oxígeno no se puede respirar y con demasiado hay riesgo de fuego.', 'A machine measures how much oxygen there is and corrects it. Too little and we cannot breathe; too much and fire is a risk.'],
      solar: ['Un panel da más energía cuando mira de frente al Sol.', 'A panel gives more energy when it faces the Sun head-on.'],
      rover: ['Los robots de Marte siguen planes enviados antes y usan sensores para esquivar rocas, porque los mensajes tardan en llegar.', 'Mars robots follow plans sent earlier and use sensors to dodge rocks, because messages take time to arrive.'],
      gh: ['Las plantas necesitan agua, luz y calor a la vez. Regar gota a gota gasta menos agua.', 'Plants need water, light and warmth at the same time. Drip watering uses less water.']
    };
    for (const k in J) { const o = MG.defs[k].sci; o.esA = o.es; o.enA = o.en; o.es = J[k][0]; o.en = J[k][1]; }
  })();
  (function () { // nombres y textos de consola/decisiones por nivel
    const j = (o, es, en) => { o.esA = o.es; o.enA = o.en; o.es = es; o.en = en; };
    j(CNAME.spec, 'Lector de colores', 'Color reader');
    j(DMETA.reactor.b, 'Más energía disponible.', 'More energy available.');
    j(DMETA.recmode.r, 'El modo máximo gasta algo más de energía.', 'Max mode uses a bit more energy.');
  })();
  const mgDur = (D, lvl) => Math.round(D.dur(lvl) * (isAdv() ? 1 : 1.4)); // Junior: más tiempo de respuesta

  /* ---------- Datos en vivo por evento (modo Ingeniero) ---------- */
  function techLine(type, inc) {
    if (!S || !isAdv()) return '';
    const es = LANG === 'es', pw = S.pw, d = S.d, f1 = (v) => fmt(v, 1);
    const L = {
      solar_storm: () => (es ? 'Flujo modelado ' : 'Modeled flux ') + f1((inc && inc.data.rate) || 0) + ' mSv/h ' + (es ? 'sin blindaje' : 'unshielded') + ' · ' + (es ? 'eficacia del blindaje ' : 'shield effectiveness ') + Math.round(d.rad * 100) + ' % · ' + (es ? 'refugio ' : 'shelter ') + S.sys.shield.cap + '/' + S.N + ' · ' + (es ? 'dosis máx. ' : 'max dose ') + fmt(d.dose, 2) + '/' + S.limit + ' mSv',
      power_drop: () => (es ? 'Generación ' : 'Generation ') + f1(pw.gen) + ' kW (' + (es ? 'solar ' : 'solar ') + f1(pw.sol) + ', ' + (es ? 'reactor ' : 'reactor ') + f1(pw.rea) + ') · ' + (es ? 'demanda ' : 'demand ') + f1(pw.demand) + ' kW · ' + (es ? 'batería ' : 'battery ') + fmt(S.r.power.v, 0) + ' kWh' + (pw.demand > pw.gen ? ' · ' + (es ? 'autonomía ≈ ' : 'endurance ≈ ') + fmt(S.r.power.v / (pw.demand - pw.gen), 0) + ' h' : ''),
      water_fail: () => (es ? 'Reciclaje efectivo ' : 'Effective recycling ') + Math.round(d.rec * 100) + ' % · ' + (es ? 'alimentación del reciclador ' : 'recycler supply ') + Math.round(((S.lf && S.lf.rec) == null ? 1 : S.lf.rec) * 100) + ' % · ' + (es ? 'agua ' : 'water ') + fmt(S.r.water.v, 0) + ' L (' + f1(S.r.water.prod - S.r.water.cons) + ' L/h)',
      pressure_leak: () => (es ? 'Presión ' : 'Pressure ') + f1(S.sys.press.P) + ' kPa · ' + (es ? 'caída ' : 'drop ') + '0,6 kPa/h · ' + (es ? 'compresor alimentado ' : 'compressor supplied ') + Math.round(((S.lf && S.lf.press) == null ? 1 : S.lf.press) * 100) + ' %',
      comms_blackout: () => (es ? 'Enlace caído · mensajes en cola ' : 'Link down · queued messages ') + S.cm.q.length + ' · ' + (es ? 'retraso de ida ' : 'one-way delay ') + f1(Sim.oneWay(S)) + ' h · ' + (es ? 'alimentación de la antena ' : 'antenna supply ') + Math.round(((S.lf && S.lf.comms) == null ? 1 : S.lf.comms) * 100) + ' %',
      crop_fail: () => { const l = Sim.plantsList(S), n = l.filter((x) => x.p.pest).length; return (es ? 'Plantas con plaga ' : 'Plants with pests ') + n + '/' + l.length + ' · ' + (es ? 'salud media ' : 'mean health ') + Math.round(l.reduce((a, x) => a + x.p.hp, 0) / Math.max(1, l.length)) + ' %'; },
      thermal_fail: () => (es ? 'Temperatura ' : 'Temperature ') + f1(S.sys.thermal.T) + ' °C (' + (es ? 'objetivo 21' : 'target 21') + ') · ' + (es ? 'alimentación térmica ' : 'thermal supply ') + Math.round(((S.lf && S.lf.therm) == null ? 1 : S.lf.therm) * 100) + ' %',
      wear: () => tr(DATA.SYS_T[(inc && inc.sys) || 'reactor']) + ': ' + (es ? 'salud ' : 'health ') + Math.round(S.sys[(inc && inc.sys) || 'reactor'].h) + ' %',
      sensor_drift: () => (es ? 'Error del sensor ' : 'Sensor error ') + fmt(S.sys.o2.calib, 2) + ' pp · O₂ ' + (es ? 'real ' : 'actual ') + f1(S.sys.o2.conc) + ' % · ' + (es ? 'generador ' : 'generator ') + Math.round(S.sys.o2.lvl * 100) + ' %'
    };
    L.dust_storm = L.power_drop;
    return L[type] ? L[type]() : '';
  }

  /* ---------- Diagnóstico previo a la reparación (modo Ingeniero) ---------- */
  function repairFlow(i) {
    if (isAdv() && Sim.DIAG_OK[i.type] != null && !i.diag) diagPanel(i);
    else miniIntro(i.fix === 'o2' ? 'o2' : i.fix === 'gh' ? 'gh' : 'wiring', { inc: i.id });
  }
  function diagPanel(inc) {
    const es = LANG === 'es', D = NPCDATA.DIAG[inc.type]; if (!D) return;
    let msg = null;
    const s = push(h('div'));
    const draw = () => panel(_('diagT') + ' · ' + tr(DATA.EVT[inc.type].t), h('div', null,
      h('table', null, h('tbody', null, h('tr', null, h('th', null, es ? 'Telemetría' : 'Telemetry'), h('td', null, techLine(inc.type, inc))), h('tr', null, h('th', null, es ? 'Ubicación' : 'Location'), h('td', null, tr(DATA.ROOMS[inc.room]))))),
      h('p', { style: { marginTop: '10px' } }, h('b', null, _('diagAsk'))),
      h('div', { class: 'col' }, D.opts.map((o, k) => btn(tr(o), () => {
        const r = Sim.diagnose(S, inc.id, k); processLogs();
        if (r.ok) { pop(); toast(_('diagOk'), '', 'ok'); stack.forEach((z) => z._refresh && z._refresh()); miniIntro(inc.fix === 'o2' ? 'o2' : inc.fix === 'gh' ? 'gh' : 'wiring', { inc: inc.id }); }
        else { msg = _('diagBad'); s.replaceChild(draw(), s.firstChild); focusFirst(s); updateHud(); }
      }, '', { style: { textAlign: 'left' } }))),
      msg ? h('p', { class: 'tag warn' }, msg) : null,
      h('p', { class: 'small muted' }, es ? 'Un buen diagnóstico compara los valores medidos con los esperados. Acertar desbloquea la reparación y adelanta un 20 %.' : 'A good diagnosis compares measured values with expected ones. A correct call unlocks the repair and advances it 20%.')));
    s.replaceChild(draw(), s.firstChild); focusFirst(s);
  }

  /* ---------- ¿Por qué ocurrió? por nivel ---------- */
  function whyPanel(type) {
    const T = DATA.EVT[type]; if (!T) return;
    const es = LANG === 'es', inc = S && S.inc.find((i) => i.type === type && !i.res);
    const sysK = inc ? inc.sys : null;
    const donki = type === 'solar_storm' && inc && inc.data.donki != null ? DATA.DONKI[inc.data.donki] : null;
    const live = type === 'solar_storm' && donkiLive && donkiLive.items.length ? h('p', { class: 'small' }, _('liveData') + ': ' + donkiLive.items.slice(0, 3).map((x) => x.cls + ' ' + x.date).join(' · ') + ' (' + donkiLive.fetched + ')') : null;
    const why = (n, t, kids) => h('div', { class: 'why' }, h('h3', null, (n ? n + '. ' : '') + t), kids);
    const kind = h('p', { class: 'small muted' }, es ? 'Tipo de dato: el hecho científico citado es real; los números del juego son un modelo simplificado.' : 'Data type: the cited science fact is real; the game numbers are a simplified model.');
    let kids;
    if (!isAdv()) {
      kids = [why('', es ? 'Qué pasó' : 'What happened', h('p', null, tr(T.what))), why('', es ? 'Por qué pasa' : 'Why it happens', h('p', null, tr(T.cause))), why('', es ? 'Qué puedes hacer' : 'What you can do', h('p', null, tr(T.act))),
        more(es ? 'Dato real y fuente' : 'Real fact and source', h('p', null, tr(T.data)), h('p', { class: 'small' }, T.src), donki ? h('p', { class: 'small' }, (es ? 'Inspirado en: ' : 'Inspired by: ') + donki.date + ' · ' + tr(donki)) : null, live)];
    } else {
      const tl = techLine(type, inc);
      kids = [why(1, _('whatH'), [h('p', null, tr(T.what)), tl ? h('p', { class: 'small' }, tl) : null]), why(2, _('sysH'), h('p', null, sysK ? tr(DATA.SYS_T[sysK]) : '—')), why(3, _('causeH'), h('p', null, tr(T.cause))), why(4, _('doH'), h('p', null, tr(T.act))),
        why(5, _('dataH'), [h('p', null, tr(T.data)), donki ? h('p', { class: 'small' }, (es ? 'Registro: ' : 'Record: ') + donki.cls + ' · ' + donki.date + ' — ' + tr(donki)) : null, live]), why(6, _('srcH'), h('p', { class: 'small' }, T.src)), kind];
    }
    push(panel(_('why') + ' · ' + tr(T.t), h('div', { class: 'col' }, kids), { narrow: true }));
  }

  /* ---------- Recursos: simple (Junior) o con series y parámetros (Ingeniero) ---------- */
  function resourcesTabJ() {
    const es = LANG === 'es';
    const card = (ico, name, f, st, txt) => h('div', { class: 'card' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', null, ico + ' ' + name), tag((st !== 'ok' ? SEVI[st] + ' ' : '') + stWord(st), st === 'ok' ? 'ok' : st)), bar(f, st === 'crit' ? 'var(--danger)' : st === 'warn' ? 'var(--warning)' : 'var(--success)'), h('p', { class: 'small muted' }, txt));
    return h('div', null,
      h('div', { class: 'grid2' },
        card('🫁', _('o2'), S.d.o2, Sim.status(S, 'o2'), es ? 'Lo que respiramos. Una máquina lo fabrica con agua y electricidad.' : 'What we breathe. A machine makes it from water and electricity.'),
        card('💧', _('water'), S.d.water, Sim.status(S, 'water'), es ? 'Para beber, regar y hacer aire. Una máquina la limpia para usarla otra vez.' : 'For drinking, watering and making air. A machine cleans it to use again.'),
        card('🔋', _('power'), S.d.power, Sim.status(S, 'power'), es ? 'Viene del Sol y del reactor y se guarda en baterías.' : 'It comes from the Sun and the reactor and is saved in batteries.'),
        card('🥗', _('food'), S.d.food, Sim.status(S, 'food'), es ? 'Se come cada día. Las plantas ayudan a tener más.' : 'It is eaten every day. Plants help us have more.'),
        card('🛡️', _('rad'), S.d.rad, radSt(), es ? 'Las paredes y el refugio nos protegen de las partículas del Sol.' : 'Walls and the shelter protect us from particles from the Sun.'),
        card('😊', _('well'), S.d.well, Sim.status(S, 'well'), es ? 'Cómo se siente la tripulación: descansa y cuida el ambiente.' : 'How the crew feels: they rest and the environment matters.')),
      h('div', { class: 'row', style: { marginTop: '10px' } }, btn('⏩ ' + _('wait1'), () => confirmDecision('wait', { h: 1 }, _('wait1'))), btn('⏩ ' + _('wait6'), () => confirmDecision('wait', { h: 6 }, _('wait6')))),
      more(es ? 'Qué significan los colores' : 'What the colors mean', h('p', null, es ? 'Verde: todo bien. Amarillo: ten cuidado. Rojo: es urgente. Las cifras del juego son una simulación y no la vida real.' : 'Green: all good. Yellow: be careful. Red: urgent. Game numbers are a simulation, not real life.')));
  }
  function spark(label, idx, warn, col) {
    const cv = h('canvas', { class: 'spark', width: 360, height: 56, 'aria-label': label });
    setTimeout(() => {
      const c = cv.getContext('2d'), H = S.hist || []; c.clearRect(0, 0, 360, 56);
      c.strokeStyle = 'rgba(255,194,74,.5)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(0, 52 - warn * 48); c.lineTo(360, 52 - warn * 48); c.stroke(); c.setLineDash([]);
      if (H.length < 2) return;
      c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
      H.forEach((p, i) => { const x = (i / Math.max(1, H.length - 1)) * 358 + 1, y = 52 - clampN(p[idx], 0, 1) * 48; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    }, 10);
    return cv;
  }
  function resourcesTabAdv() {
    const es = LANG === 'es', base = resourcesTabRaw();
    const charts = h('div', { class: 'card', style: { marginTop: '10px' } }, h('h3', null, '📈 ' + (es ? 'Tendencias (últimas horas simuladas)' : 'Trends (last simulated hours)')),
      h('div', { class: 'grid2' }, [[es ? 'O₂ (% del depósito)' : 'O₂ (% of tank)', 0, 0.35, '#38d6ff'], [es ? 'Agua (% del depósito)' : 'Water (% of tank)', 1, 0.35, '#6fb3ff'], [es ? 'Batería (%)' : 'Battery (%)', 2, 0.3, '#ffd36b'], [es ? 'Alimentos (%)' : 'Food (%)', 3, 0.3, '#5fe39a'], [es ? 'Dosis / límite' : 'Dose / limit', 4, 0.6, '#ff8a65']].map(([l, i, w, c]) => h('div', null, h('span', { class: 'small' }, l), spark(l, i, w, c)))),
      h('p', { class: 'small muted' }, es ? 'Línea discontinua: umbral de advertencia.' : 'Dashed line: warning threshold.'));
    const KIND = { real: [es ? 'Real (NASA)' : 'Real (NASA)', 'ok'], hist: [es ? 'Histórico' : 'Historical', 'info'], model: [es ? 'Modelo simplificado' : 'Simplified model', 'warn'], game: [es ? 'Valor de jugabilidad' : 'Gameplay value', '']};
    const params = more(es ? 'Datos y parámetros del modelo (fuente y tipo)' : 'Data and model parameters (source and type)', h('div', { style: { overflowX: 'auto' } }, h('table', null, h('tbody', null, NPCDATA.PARAMS.map((p) => h('tr', null, h('td', null, tag(KIND[p.k][0], KIND[p.k][1])), h('th', null, tr(p.n)), h('td', null, p.v), h('td', { class: 'small muted' }, p.s)))))));
    base.append(charts, params);
    return base;
  }
  const resourcesTab = () => (isAdv() ? resourcesTabAdv() : resourcesTabJ());

  /* ---------- Prioridades eléctricas configurables (modo Ingeniero) ---------- */
  function prioCard() {
    const es = LANG === 'es', NAMES = { lab: es ? 'Laboratorio' : 'Lab', rover: es ? 'Carga del rover' : 'Rover charging', isru: es ? 'Extractor de hielo' : 'Ice extractor', jobs: es ? 'Obras y mantenimiento' : 'Jobs and maintenance', lights: es ? 'Luces LED' : 'LED lights', pumps: es ? 'Bombas de riego' : 'Irrigation pumps' };
    const def = { lab: 3, rover: 3, isru: 3, jobs: 3, lights: 4, pumps: 4 };
    return h('div', { class: 'card', style: { marginTop: '10px' } }, h('h3', null, '⚡ ' + (es ? 'Prioridades de reparto' : 'Distribution priorities')),
      h('p', { class: 'small muted' }, es ? 'La prioridad 1 está reservada al soporte vital. Si la demanda supera la generación y la batería, se recorta primero el número más alto.' : 'Priority 1 is reserved for life support. If demand exceeds generation and battery, the highest number is shed first.'),
      h('div', { class: 'grid2' }, Sim.PRIO_IDS.map((id) => { const cur = S.prioOv[id] || def[id]; return h('label', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', null, NAMES[id]), h('select', { 'aria-label': NAMES[id], onchange: (e) => confirmDecision('prio', { id, v: +e.target.value }, NAMES[id]) }, [2, 3, 4].map((v) => { const o = h('option', { value: v }, (es ? 'Prioridad ' : 'Priority ') + v); if (v === cur) o.selected = true; return o; }))); })));
  }

  /* ---------- Pregunta de comprensión por nivel ---------- */
  const QV = { 1: ['drop', 'door', 'bolt'], 2: ['air', 'leaf', 'thermo'], 3: ['sun', 'shield', 'earth'], 4: ['rover', 'gear', 'thermo'], 5: ['shield', 'earth', 'moon'], 6: ['bolt', 'leaf', 'air'], 7: ['antenna', 'clock', 'rover'] };
  const quizOf = (id) => (isAdv() ? DATA.QUIZ_A[id] : DATA.QUIZ[id]);
