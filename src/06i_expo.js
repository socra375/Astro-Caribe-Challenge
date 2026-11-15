  /* =====================================================================
     EXPEDICIÓN EXTERIOR — interfaz: preparación y traje, HUD exterior,
     herramientas, tarjetas de muestra, almacenamiento del rover,
     misiones y avisos por radio. La lógica está en Ex; el movimiento en
     World/Rover. Todo botón produce un resultado real en el juego.
     ===================================================================== */
  const XT = (es, en) => (LANG === 'es' ? es : en);
  const xt = (o) => (o ? (LANG === 'es' ? o.es : o.en) : '');
  const TOOLN = {
    collector: { i: '🧺', n: { es: 'Recolector', en: 'Sampler' }, d: { es: 'Recoge la muestra que tienes delante (también con E).', en: 'Collects the sample in front of you (also with E).' } },
    container: { i: '🧊', n: { es: 'Contenedor', en: 'Container' }, d: { es: 'Guarda 2 muestras selladas en la mano; se vacían en el rover.', en: 'Holds 2 sealed samples; empty it into the rover.' } },
    scanner: { i: '🔍', n: { es: 'Escáner geológico', en: 'Geological scanner' }, d: { es: 'Revela muestras ocultas y puntos de interés cercanos (gasta energía).', en: 'Reveals hidden samples and nearby sites (uses power).' } },
    camera: { i: '🎯', n: { es: 'Cámara', en: 'Camera' }, d: { es: 'Fotografía un punto de interés: da ciencia y completa informes.', en: 'Photographs a site: gives science and completes reports.' } },
    sensor: { i: '🌡', n: { es: 'Sensor ambiental', en: 'Environment sensor' }, d: { es: 'Mide temperatura, radiación, viento, suelo y señal.', en: 'Measures temperature, radiation, wind, ground and signal.' } },
    light: { i: '☀', n: { es: 'Linterna', en: 'Flashlight' }, d: { es: 'Ilumina de noche y con polvo (gasta energía).', en: 'Lights up night and dust (uses power).' } }
  };
  const ROLEB = {
    commander: { es: 'Comandante: la señal de radio llega un 10 % más lejos.', en: 'Commander: radio signal reaches 10% farther.' },
    engineer: { es: 'Ingeniera Ana: el rover gasta un 25 % menos de batería y repara el traje con menos material.', en: 'Engineer Ana: the rover uses 25% less battery and repairs the suit with less material.' },
    scientist: { es: 'Científico Leo: el escáner llega más lejos (32 casillas) y recoge muestras más rápido.', en: 'Scientist Leo: the scanner reaches farther (32 tiles) and samples faster.' },
    medic: { es: 'Médica Mei: recibe un 20 % menos de radiación y gasta un 10 % menos de oxígeno.', en: 'Medic Mei: takes 20% less radiation and uses 10% less oxygen.' },
    agri: { es: 'Agrónomo Bruno: recoge muestras de suelo (regolito y sedimentos) más rápido.', en: 'Agronomist Bruno: collects soil samples (regolith and sediment) faster.' }
  };
  const ex = () => Ex.ensure(S);
  const inBaseNow = () => World.zone() !== 'outside';
  const nearPad = (d) => Math.hypot(World.player.x - Field.PAD[0], World.player.y - Field.PAD[1]) < d;
  const colTime = (s) => (S.playerRole === 'scientist' ? 0.9 : S.playerRole === 'agri' && (s.kind === 'regolith' || s.kind === 'sediment') ? 0.9 : 1.5);
  const starsOf = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const RAD_MSV = (v) => fmt(v, 2) + ' mSv';

  /* ---------- Avisos y radio ---------- */
  const AL = {
    'o2.low': { sev: 'warn', who: 'medic', t: ['Oxígeno al 30 %', 'Oxygen at 30%'], d: ['Te queda poco aire. Planea el regreso.', 'You are running low on air. Plan your way back.'], rec: 1 },
    'o2.crit': { sev: 'crit', who: 'medic', t: ['¡Oxígeno crítico!', 'Oxygen critical!'], d: ['Vuelve a la base ahora o usa el depósito de un refugio.', 'Head back now or use a shelter cache.'], rec: 1 },
    'en.low': { sev: 'warn', who: 'engineer', t: ['Energía del traje baja', 'Suit power low'], d: ['Apaga la linterna y reduce el escáner. Regresa pronto.', 'Turn off the flashlight and limit the scanner. Return soon.'], rec: 1 },
    'en.crit': { sev: 'crit', who: 'engineer', t: ['¡Energía crítica!', 'Power critical!'], d: ['Sin energía el traje no controla la temperatura. Vuelve ya.', 'Without power the suit cannot control temperature. Return now.'], rec: 1 },
    'temp.hi': { sev: 'warn', who: 'medic', t: ['Temperatura alta en el traje', 'High suit temperature'], d: ['Busca sombra o un refugio para que el traje se enfríe.', 'Find shade or a shelter so the suit cools.'] },
    'temp.lo': { sev: 'warn', who: 'medic', t: ['Temperatura baja en el traje', 'Low suit temperature'], d: ['El traje pierde calor: revisa su energía y regresa.', 'The suit is losing heat: check its power and return.'] },
    'rad.hi': { sev: 'warn', who: 'medic', t: ['Radiación acumulada alta', 'High accumulated radiation'], d: ['Has recibido más del 60 % de la dosis de esta salida.', 'You have received over 60% of this outing’s dose.'], rec: 1 },
    'rad.crit': { sev: 'crit', who: 'medic', t: ['¡Dosis casi en el límite!', 'Dose almost at the limit!'], d: ['Entra en un refugio o regresa: no sigas expuesto.', 'Get into a shelter or return: do not stay exposed.'], rec: 1 },
    'int.low': { sev: 'warn', who: 'engineer', t: ['Traje dañado', 'Suit damaged'], d: ['La integridad bajó del 50 %: pierde aire y protege menos.', 'Integrity fell below 50%: it leaks air and shields less.'], rec: 1 },
    'batt.low': { sev: 'warn', who: 'engineer', t: ['Batería del rover baja', 'Rover battery low'], d: ['Queda poca batería. El rover irá más despacio.', 'Little battery left. The rover will slow down.'], rec: 1 },
    'sig.lost': { sev: 'warn', who: 'engineer', t: ['Sin señal con la base', 'No signal with the base'], d: ['Activa un repetidor o acércate a la base para hablar con ellos.', 'Activate a relay or move closer to the base to talk to them.'] },
    'sig.low': { sev: 'info', who: 'engineer', t: ['Señal débil', 'Weak signal'], d: ['Los repetidores amplían la cobertura.', 'Relays extend coverage.'] },
    burst: { sev: 'crit', who: 'medic', t: ['¡Ráfaga de radiación!', 'Radiation burst!'], d: ['Refúgiate en una cúpula blindada (R) hasta que pase.', 'Take cover in a shielded dome (R) until it passes.'] },
    dust: { sev: 'warn', who: 'engineer', t: ['Tormenta de polvo', 'Dust storm'], d: ['Poca visibilidad y señal más débil. Sigue los postes-guía o usa el radar.', 'Low visibility and weaker signal. Follow the guide posts or use the radar.'] },
    full: { sev: 'info', who: 'scientist', t: ['Contenedor de mano lleno', 'Hand container full'], d: ['Deposita las muestras en el compartimento del rover (junto a la parte trasera).', 'Put the samples in the rover compartment (behind the rover).'] },
    return: { sev: 'warn', who: 'commander', t: ['Recomiendo regresar', 'I recommend returning'], d: ['Tus reservas bajan. Sigue la flecha hacia la base.', 'Your reserves are dropping. Follow the arrow to the base.'], rec: 1 },
    'cond.start': { sev: 'warn', who: 'control', t: ['Ventana de condiciones adversas', 'Adverse-conditions window'], d: [S0cond(), S0cond(1)] },
    'cond.end': { sev: 'ok', who: 'control', t: ['Las condiciones mejoran', 'Conditions are improving'], d: ['La alerta ha terminado.', 'The alert is over.'] },
    mission: null
  };
  function S0cond(en) { return en ? 'Control confirms a window of bad conditions. Use shelters and relays and bring back the data.' : 'Control confirma una ventana de mal tiempo. Usa refugios y repetidores y trae los datos.'; }
  function exAlert(k) {
    const a = AL[k]; if (!a) return;
    const cond = k === 'cond.start' ? (S.scen === 'mars' ? XT('Tormenta de polvo en Marte: baja la visibilidad y la señal.', 'Martian dust storm: visibility and signal drop.') : XT('Ráfagas de radiación solar en la Luna: refúgiate en las cúpulas.', 'Solar-radiation bursts on the Moon: take cover in the domes.')) : null;
    call({ key: 'ex.' + k, sev: a.sev, who: a.who, title: LANG === 'es' ? a.t[0] : a.t[1], desc: cond || (LANG === 'es' ? a.d[0] : a.d[1]), act: a.rec ? XT('Sigue la flecha azul hacia la base.', 'Follow the blue arrow to the base.') : null });
    if (a.sev === 'crit') Sfx.play('crit'); else if (a.sev === 'warn') Sfx.play('warn');
  }
  /** Registros del motor → llamadas de radio de la expedición (cada rol conserva su voz). */
  function exLogToRadio(e) {
    const k = e.k, p = e.p || {}, es = LANG === 'es';
    if (k === 'ex.equip') { call({ key: 'ex.equip', sev: 'info', who: 'engineer', title: XT('Traje y rover listos', 'Suit and rover ready'), desc: XT('Comprobación completa. Sal por la esclusa cuando quieras.', 'Checks complete. Go through the airlock whenever you are ready.') }); return true; }
    if (k === 'ex.collect') { if (p.int >= 3) call({ key: 'ex.earthq', sev: 'info', who: 'control', title: XT('Control de Misión pide datos', 'Mission Control requests data'), desc: XT('Han visto tu hallazgo. Describe la muestra y envía el informe cuando tengas señal (consola del registro de investigaciones).', 'They saw your find. Describe the sample and send the report when you have signal (research log console).') });
      if (p.int >= 3) call({ key: 'ex.hit' + e.n, sev: 'ok', who: 'scientist', title: XT('¡Hallazgo importante!', 'Important find!'), desc: XT('Esa muestra tiene interés alto. Llévala a la base y analízala; y envía el informe a la Tierra.', 'That sample has high interest. Bring it back and analyze it, and send the report to Earth.') }); return true; }
    if (k === 'ex.unload') { if (!p.q) call({ key: 'ex.unl' + e.n, sev: 'info', who: 'scientist', title: XT('Muestras recibidas', 'Samples received'), desc: p.n + XT(' muestras en el almacén. Clasifícalas y analízalas en el laboratorio.', ' samples in storage. Classify them and analyze them in the lab.'), console: 'sampler', target: World.consolePos('sampler') }); return true; }
    if (k === 'ex.recall') { call({ key: 'ex.recall' + e.n, sev: 'crit', who: 'commander', title: XT('Evacuación de emergencia', 'Emergency recovery'), desc: XT('Te recogimos y remolcamos el rover. Estás a salvo. Revisa tus reservas antes de volver a salir.', 'We picked you up and towed the rover. You are safe. Check your reserves before going out again.') }); return true; }
    if (k === 'ex.mission') { const m = Ex.EXM[p.n - 1]; call({ key: 'ex.m' + p.n, sev: 'ok', who: 'commander', title: XT('¡Misión de exploración completada! ', 'Exploration mission complete! ') + xt(m.t), desc: p.n < Ex.EXM.length ? XT('Siguiente: ', 'Next: ') + xt(Ex.EXM[p.n].t) + '. ' + xt(Ex.EXM[p.n].b) : XT('Has completado todas las misiones de exploración.', 'You completed all exploration missions.') }); return true; }
    if (k === 'ex.repeater') { call({ key: 'ex.rep' + p.id, sev: 'ok', who: 'engineer', title: XT('Repetidor activo', 'Relay online'), desc: XT('La cobertura de radio se amplía alrededor del repetidor.', 'Radio coverage grows around the relay.') }); return true; }
    if (k === 'ex.report') { call({ key: 'ex.rpt' + e.n, sev: 'ok', who: 'control', title: XT('Informe recibido', 'Report received'), desc: XT('Control de Misión lo estudia. Ciencia: +', 'Mission Control is studying it. Science: +') + fmt(p.add, 1) }); return true; }
    if (k === 'ex.visit' || k === 'ex.unequip') return true;
    return false;
  }
  function exLogText(e) {
    const k = e.k, p = e.p || {};
    const T = { 'ex.equip': [XT('Traje equipado', 'Suit equipped'), ''], 'ex.unequip': [XT('Traje guardado', 'Suit stowed'), p.n ? p.n + XT(' muestras al almacén', ' samples to storage') : ''], 'ex.collect': [XT('Muestra recogida', 'Sample collected'), ''], 'ex.unload': [XT('Muestras descargadas', 'Samples unloaded'), p.n + ''], 'ex.recall': [XT('Evacuación de emergencia', 'Emergency recovery'), ''], 'ex.mission': [XT('Misión de exploración', 'Exploration mission'), ''], 'ex.visit': [XT('Punto de interés investigado', 'Site investigated'), p.id], 'ex.repeater': [XT('Repetidor activado', 'Relay activated'), p.id], 'ex.report': [XT('Informe a la Tierra', 'Report to Earth'), ''] };
    return T[k] || [k, ''];
  }

  /* ---------- HUD exterior ---------- */
  let miniForced = false, miniWas = false, evaEl = null, toolsEl = null, cardEl = null, exT = 0, wasOut = false, geigerT = 0, lastCard = '';
  let evaLang = '';
  function buildEva() {
    evaEl = $('#eva'); toolsEl = $('#xtools'); cardEl = $('#xcard'); evaEl.replaceChildren(); toolsEl.replaceChildren(); evaLang = LANG;
    const row = (id, ic, nm) => h('div', { class: 'xr', id: 'xr_' + id }, h('b', null, ic + ' ' + nm), h('span', { class: 'xb' }, h('i', { id: 'xi_' + id })), h('span', { class: 'xv', id: 'xv_' + id }));
    evaEl.append(row('o2', '🫁', 'O₂'), row('en', '⚡', XT('Energía', 'Power')), row('integ', '🛡', XT('Traje', 'Suit')), row('rad', '☢', XT('Rad.', 'Rad.')), row('batt', '🚙', XT('Rover', 'Rover')),
      h('div', { class: 'xr', id: 'xr_temp' }, h('b', null, '🌡 ' + XT('Temp.', 'Temp.')), h('span', { class: 'xv', id: 'xv_temp', style: { flex: 1, textAlign: 'left' } })),
      h('div', { class: 'xr', id: 'xr_sig' }, h('b', null, '📡 ' + XT('Señal', 'Signal')), h('span', { class: 'sig', id: 'xi_sig' }, h('i', { style: { height: '4px' } }), h('i', { style: { height: '6px' } }), h('i', { style: { height: '8px' } }), h('i', { style: { height: '10px' } }), h('i', { style: { height: '12px' } })), h('span', { class: 'xv', id: 'xv_sig' })),
      h('div', { class: 'xr', id: 'xr_cargo' }, h('b', null, '🧪 ' + XT('Carga', 'Cargo')), h('span', { class: 'xv', id: 'xv_cargo', style: { flex: 1, textAlign: 'left' } })),
      h('div', { class: 'xobj', id: 'xobj', title: XT('Ver misiones', 'See missions'), onclick: () => exMissionsPanel() }));
    toolsEl.append(...Ex.TOOLS.map((k, i) => h('button', { class: 'btn', id: 'xt_' + k, title: (i + 1) + ' · ' + xt(TOOLN[k].n) + ' — ' + xt(TOOLN[k].d), 'aria-label': xt(TOOLN[k].n), onclick: () => { selectTool(k); useTool(k); } }, TOOLN[k].i)));
  }
  const barState = (v, lo, cr) => (v < cr ? 'crit' : v < lo ? 'warn' : 'ok');
  function setBar(id, f, txt, st) {
    const i = $('#xi_' + id), v = $('#xv_' + id), r = $('#xr_' + id); if (!i) return;
    i.style.width = Math.round(clampN(f, 0, 1) * 100) + '%'; v.textContent = txt; r.className = 'xr ' + (st || '');
  }
  function exHud() {
    if (!evaEl || evaLang !== LANG) buildEva();
    const E = ex(), su = E.suit, show = su.on && running; evaEl.classList.toggle('hidden', !show); toolsEl.classList.toggle('hidden', !show);
    $('#app').classList.toggle('eva', show); const bf = $('#btnF'); if (bf) bf.classList.toggle('hidden', !show);
    if (!show) { cardEl.classList.add('hidden'); return; }
    const adv = MODE === 'adv', R = E.rover, px = World.player.x, py = World.player.y, out = World.zone() === 'outside';
    const mins = (v, rate) => fmt(v / rate / 60, 1) + ' min';
    setBar('o2', su.o2 / 100, adv ? Math.round(su.o2) + '% · ≈' + mins(su.o2, 0.115) : Math.round(su.o2) + '%', barState(su.o2, 30, 12));
    setBar('en', su.en / 100, Math.round(su.en) + '%', barState(su.en, 30, 12));
    setBar('integ', su.integ / 100, Math.round(su.integ) + '%', barState(su.integ, 60, 40));
    const rf = su.rad / Ex.EXLIM; setBar('rad', rf, adv ? RAD_MSV(su.rad) : Math.round(rf * 100) + '%', rf > 0.85 ? 'crit' : rf > 0.6 ? 'warn' : 'ok');
    setBar('batt', S.sys.rover.batt / 100, Math.round(S.sys.rover.batt) + '%' + (R.occ && adv ? ' · ' + fmt(Math.abs(R.v) * 25 * 3.6 / 10, 0) + ' km/h' : ''), barState(S.sys.rover.batt, 35, 15));
    const tp = $('#xv_temp'); tp.textContent = Math.round(su.temp) + ' °C' + (adv ? ' · ' + XT('exterior ', 'outside ') + Math.round(Ex.env(S, px, py).amb) + ' °C' : ''); $('#xr_temp').className = 'xr ' + (su.temp > 34 || su.temp < 8 ? 'crit' : su.temp > 30 || su.temp < 12 ? 'warn' : '');
    const sg = out ? Ex.signal(S, px, py) : 1; [...$('#xi_sig').children].forEach((b, i) => b.classList.toggle('on', sg > i * 0.18 + 0.04)); $('#xv_sig').textContent = Math.round(sg * 100) + '%'; $('#xr_sig').className = 'xr ' + (sg < 0.1 ? 'crit' : sg < 0.3 ? 'warn' : '');
    const stt = Ex.storage(S); $('#xv_cargo').textContent = XT('mano ', 'hand ') + stt.hand.length + '/' + Ex.CAP.hand + ' · rover ' + stt.list.length + '/' + Ex.CAP.slots + (adv ? ' · ' + fmt(stt.kg, 1) + '/' + Ex.CAP.kg + ' kg' : '');
    const ob = Ex.objectives(S), g = Ex.goal(S), xo = $('#xobj');
    if (ob) { const cur = ob.list.find((q) => !q.ok); xo.textContent = '🎯 ' + xt(ob.m.t) + (cur ? ': ' + xt(cur.t) : '') + (g && out ? ' · ' + Math.round(Math.hypot(g.x - px, g.y - py) * 25) + ' m' : ''); } else xo.textContent = '🎯 ' + XT('Todas las misiones completadas', 'All missions complete');
    for (const k of Ex.TOOLS) { const b = $('#xt_' + k); if (b) { b.classList.toggle('primary', E.tool === k); b.classList.toggle('on', (k === 'light' && (E.flash || R.lights))); } }
  }
  function selectTool(k) { ex().tool = k; exHud(); }
  function exPrompt(n) {
    const E = ex(), T = { 'x:board': XT('Subir al rover', 'Board the rover'), 'x:exit': XT('Bajar del rover', 'Leave the rover'), 'x:store': XT('Abrir compartimento', 'Open compartment'), 'x:poi': XT('Investigar · ', 'Investigate · ') + (n.p ? xt(n.p.n) : ''), 'x:rep': (E.rep[n.q && n.q.id] ? XT('Repetidor activo', 'Relay online') : XT('Activar repetidor de radio', 'Activate radio relay')), 'x:shel': XT('Entrar al refugio', 'Enter the shelter'), 'x:shelx': XT('Salir del refugio', 'Leave the shelter') };
    T['x:ship'] = XT('Revisar la nave', 'Inspect the ship'); T['x:rplat'] = XT('Elevador del rover', 'Rover elevator');
    return n.id === 'x:site' ? XT('Recoger · ', 'Collect · ') + xt(n.s.name) : T[n.id];
  }
  function exCard(n) {
    const key = n ? n.id + (n.s ? n.s.id : n.p ? n.p.id : n.q ? n.q.id : '') + LANG + (ex().suit.on ? 1 : 0) : '';
    if (key === lastCard) return; lastCard = key;
    if (!n || !n.id.startsWith('x:') || ['x:exit', 'x:shelx'].includes(n.id)) { cardEl.classList.add('hidden'); return; }
    const E = ex(), adv = MODE === 'adv', pl = S.scen === 'mars' ? XT('Marte', 'Mars') : XT('Luna', 'Moon');
    let body;
    if (n.id === 'x:site') {
      const s = n.s, inf = Field.info(s);
      body = h('div', null, h('b', null, '🪨 ' + xt(s.name)), h('div', { class: 'small' }, XT('Tipo: ', 'Type: ') + xt(inf.kind) + ' · ' + pl + ' · ' + XT('ubicación ', 'location ') + Field.coord(s.x, s.y, LANG === 'es')), h('div', { class: 'small' }, xt(inf.desc)),
        h('div', { class: 'small' }, XT('Interés científico: ', 'Scientific interest: ') + starsOf(s.int) + ' — ' + xt(inf.why)), adv ? h('div', { class: 'small muted' }, XT('Masa simulada ', 'Simulated mass ') + inf.kg + ' kg · ' + XT('contenedor ', 'container ') + E.hand.length + '/' + Ex.CAP.hand) : null,
        h('div', { class: 'small' }, '👉 ' + (E.suit.on ? (E.hand.length >= Ex.CAP.hand ? XT('Contenedor lleno: deposítalas en el rover.', 'Container full: put them in the rover.') : XT('Pulsa E para recoger (' + colTime(s) + ' s).', 'Press E to collect (' + colTime(s) + ' s).')) : XT('Necesitas el traje puesto.', 'You need the suit on.'))));
    } else if (n.id === 'x:poi') body = h('div', null, h('b', null, '🔭 ' + xt(n.p.n)), h('div', { class: 'small' }, xt(n.p.d)), h('div', { class: 'small' }, '👉 ' + (E.visited[n.p.id] ? XT('Ya investigado.', 'Already investigated.') : XT('Pulsa E para tomar medidas con el sensor.', 'Press E to take readings with the sensor.'))));
    else if (n.id === 'x:rep') body = h('div', null, h('b', null, '📡 ' + XT('Repetidor de radio ', 'Radio relay ') + n.q.id.slice(1)), h('div', { class: 'small' }, E.rep[n.q.id] ? XT('Activo: amplía la señal en 60 casillas a su alrededor.', 'Online: extends the signal 60 tiles around it.') : XT('Apagado. Actívalo para ampliar la cobertura de radio.', 'Offline. Activate it to extend radio coverage.')));
    else if (n.id === 'x:shel') body = h('div', null, h('b', null, '🛡️ ' + XT('Refugio blindado ', 'Shielded shelter ') + n.q.id.slice(1)), h('div', { class: 'small' }, XT('Dentro la radiación baja un 92 % y hay un depósito de emergencia (+40 % de O₂ y energía, 1 vez por salida).', 'Inside, radiation drops 92% and there is an emergency cache (+40% O₂ and power, once per outing).')));
    else if (n.id === 'x:store') body = h('div', null, h('b', null, '📦 ' + XT('Compartimento del rover', 'Rover compartment')), h('div', { class: 'small' }, Ex.storage(S).list.length + '/' + Ex.CAP.slots + XT(' muestras guardadas. E para abrir.', ' samples stored. E to open.')));
    else if (n.id === 'x:board') body = h('div', null, h('b', null, '🚙 ' + XT('Rover explorador R-1', 'Explorer rover R-1')), h('div', { class: 'small' }, XT('Batería ', 'Battery ') + Math.round(S.sys.rover.batt) + '% · ' + (E.suit.on ? XT('E para subir.', 'E to board.') : XT('Necesitas el traje puesto.', 'You need the suit on.'))));
    else if (n.id === 'x:ship') body = shipCard();
    else if (n.id === 'x:rplat') body = roverLiftCard();
    else { cardEl.classList.add('hidden'); return; }
    cardEl.replaceChildren(body); cardEl.classList.remove('hidden');
  }

  /* ---------- Interacciones ---------- */
  function exInteract(n) {
    const E = ex();
    switch (n.id) {
      case 'x:board': { const r = World.boardRover(); if (r === 'nosuit') toast(XT('Necesitas el traje', 'You need the suit'), XT('Equípalo en el vestuario de la bahía.', 'Put it on at the bay locker.'), 'warn'); break; }
      case 'x:exit': { const r = World.exitRover(); if (r === 'fast') toast(XT('Frena antes de bajar', 'Stop before leaving'), XT('Usa S o suelta el acelerador.', 'Use S or release the throttle.'), 'warn'); else if (r === 'blocked') toast(XT('No hay sitio para bajar', 'No room to get out'), XT('Mueve el rover a un lugar libre.', 'Move the rover to a clear spot.'), 'warn'); else if (!r) Sfx.play('click'); break; }
      case 'x:store': storagePanel(); break;
      case 'x:site': {
        if (!E.suit.on) return toast(XT('Necesitas el traje', 'You need the suit'), '', 'warn');
        if (E.hand.length >= Ex.CAP.hand) { Sfx.play('bad'); return toast(XT('Contenedor lleno', 'Container full'), XT('Deposita las muestras en el rover (compartimento trasero).', 'Put the samples in the rover (rear compartment).'), 'warn'); }
        World.beginCollect(n.s, colTime(n.s), () => { const r = Ex.collect(S, n.s.id); if (typeof r === 'string') { toast(XT('No se pudo recoger', 'Could not collect'), r, 'warn'); return; } Sfx.play('pick'); World.setAct('player', 'carry', 1.2); toast(XT('Muestra recogida', 'Sample collected'), r.id + ' · ' + xt(r.name), 'ok'); lastCard = ''; exHud(); });
        break;
      }
      case 'x:poi': { const r = Ex.investigate(S, n.p.id, World.player.x, World.player.y); if (r.err) return toast(XT('Necesitas el traje', 'You need the suit'), '', 'warn'); Sfx.play(r.first ? 'ok' : 'click'); readoutPanel(r.read, n.p, r.first); break; }
      case 'x:rep': { const r = Ex.activateRepeater(S, n.q.id); if (r === 'on') toast(XT('Ya está activo', 'Already online'), '', 'info'); else Sfx.play('ok'); lastCard = ''; break; }
      case 'x:shel': { if (!E.suit.on) return; if (World.enterShelter(n.q.id)) shelterPanel(n.q); break; }
      case 'x:shelx': World.leaveShelter(); lastCard = ''; break;
      case 'x:ship': shipPanel(); break;
      case 'x:rplat': roverLiftPanel(); break;
    }
  }
  function shelterPanel(q) {
    const E = ex();
    const s = livePanel(() => panel('🛡️ ' + XT('Refugio blindado ', 'Shielded shelter ') + q.id.slice(1), h('div', null,
      h('p', null, XT('Estás a cubierto: la radiación baja un 92 % y el traje descansa. Puedes quedarte hasta que pase la alerta.', 'You are under cover: radiation drops 92% and the suit rests. You can stay until the alert passes.')),
      h('table', null, h('tbody', null, statRow('O₂', Math.round(E.suit.o2) + ' %'), statRow(XT('Energía', 'Power'), Math.round(E.suit.en) + ' %'), statRow(XT('Radiación acumulada', 'Accumulated radiation'), MODE === 'adv' ? RAD_MSV(E.suit.rad) : Math.round(E.suit.rad / Ex.EXLIM * 100) + ' %'))),
      E.cache[q.id] ? h('p', { class: 'tag warn' }, XT('Depósito de emergencia ya usado en esta salida.', 'Emergency cache already used on this outing.')) : btn('🫁 ' + XT('Usar depósito de emergencia (+40 % O₂ y energía)', 'Use emergency cache (+40% O₂ and power)'), () => { const r = Ex.useCache(S, q.id); if (!r) { Sfx.play('ok'); toast(XT('Depósito usado', 'Cache used'), '+40 %', 'ok'); } s._refresh(); }, 'primary'),
      btn('🚪 ' + XT('Salir del refugio', 'Leave shelter'), () => { World.leaveShelter(); pop(); }))));
  }
  function readoutPanel(r, p, first) {
    const adv = MODE === 'adv', mars = S.scen === 'mars', gname = { plain: XT('suelo firme', 'firm ground'), deep: XT('regolito profundo (lento)', 'deep regolith (slow)'), sand: XT('arena (lenta)', 'sand (slow)'), slope: XT('pendiente', 'slope'), crater: XT('borde de cráter', 'crater rim') }[r.ground] || r.ground;
    const dose = r.rad * 3600 / 1000;
    push(panel('🔭 ' + xt(p.n), h('div', null, h('p', null, xt(p.d)), first ? h('p', { class: 'tag ok' }, XT('✔ Punto investigado: +2 de ciencia', '✔ Site investigated: +2 science')) : h('p', { class: 'tag info' }, XT('Ya lo habías investigado.', 'Already investigated.')),
      h('table', null, h('tbody', null,
        statRow(XT('Temperatura exterior', 'Outside temperature'), Math.round(r.amb) + ' °C'), statRow(XT('Temperatura del traje', 'Suit temperature'), Math.round(r.temp) + ' °C'),
        statRow(XT('Radiación', 'Radiation'), adv ? fmt(r.rad * 60, 3) + ' mSv/min (' + XT('valor de juego', 'game value') + ')' : (r.burst > 0.5 ? XT('alta ⚠', 'high ⚠') : XT('normal', 'normal'))),
        statRow(XT('Suelo', 'Ground'), gname), mars ? statRow(XT('Viento', 'Wind'), r.wind + (adv ? ' m/s' : XT(' (fuerte)', ' (strong)'))) : null, statRow(XT('Señal de radio', 'Radio signal'), Math.round(r.sig * 100) + ' %'), statRow(XT('Visibilidad', 'Visibility'), r.vis + XT(' casillas', ' tiles')))),
      adv ? h('p', { class: 'small muted' }, XT('Real: la radiación en superficie ronda ~1,4 mSv/día en la Luna y ~0,7 mSv/día en Marte; el juego la acelera para que se note en minutos.', 'Real: surface radiation is about ~1.4 mSv/day on the Moon and ~0.7 mSv/day on Mars; the game speeds it up so it shows in minutes.')) : null)), { narrow: true });
  }

  /* ---------- Herramientas ---------- */
  function useTool(k) {
    const E = ex(); k = k || E.tool;
    if (!E.suit.on) return toast(XT('Necesitas el traje', 'You need the suit'), '', 'warn');
    const px = World.player.x, py = World.player.y, out = World.zone() === 'outside';
    if (k === 'collector') { const n = World.exNear(); if (n && ['x:site', 'x:poi', 'x:rep', 'x:shel', 'x:store'].includes(n.id)) exInteract(n); else toast(XT('Recolector', 'Sampler'), XT('Acércate a una muestra (anillo verde) u otro objeto interactivo.', 'Move next to a sample (green ring) or another interactive object.'), 'info'); }
    else if (k === 'container') containerPanel();
    else if (k === 'scanner') {
      if (!out) return toast(XT('Escáner', 'Scanner'), XT('Úsalo fuera de la base.', 'Use it outside the base.'), 'info');
      const r = Ex.scan(S, px, py);
      if (r.err === 'cd') return toast(XT('Escáner recargando', 'Scanner recharging'), Math.ceil(r.cd) + ' s', 'info');
      if (r.err) return toast(XT('Escáner', 'Scanner'), XT('Sin energía suficiente.', 'Not enough power.'), 'warn');
      World.scanFx(r.rad); Sfx.play('scan');
      toast(XT('Escaneo completo', 'Scan complete'), (r.found.length ? r.found.length + XT(' muestras ocultas reveladas. ', ' hidden samples revealed. ') : XT('Sin muestras ocultas cerca. ', 'No hidden samples nearby. ')) + (r.pois.length ? r.pois.length + XT(' puntos de interés nuevos en el radar.', ' new sites on the radar.') : ''), r.found.length || r.pois.length ? 'ok' : 'info');
    } else if (k === 'camera') {
      const r = Ex.photo(S, px, py); if (r.err) return toast(XT('Cámara', 'Camera'), XT('Sin energía.', 'No power.'), 'warn');
      World.photoFx(); Sfx.play('photo');
      toast(XT('Foto tomada', 'Photo taken'), r.subject ? xt(r.subject.n) + XT(' (+1 ciencia la primera vez)', ' (+1 science the first time)') : XT('No hay nada de interés a la vista.', 'Nothing of interest in view.'), r.subject ? 'ok' : 'info');
    } else if (k === 'sensor') { const r = Ex.measure(S, px, py, !!World.inShelter); Sfx.play('click'); readoutPanel(r, { n: { es: 'Lectura del sensor', en: 'Sensor reading' }, d: { es: 'Medidas de tu posición actual.', en: 'Measurements at your position.' } }, false); }
    else if (k === 'light') { if (E.rover.occ) { E.rover.lights = !E.rover.lights; toast('🔦', E.rover.lights ? XT('Faros del rover encendidos', 'Rover lights on') : XT('Faros apagados', 'Rover lights off'), 'info'); } else { E.flash = !E.flash; toast('🔦', E.flash ? XT('Linterna encendida (gasta energía)', 'Flashlight on (uses power)') : XT('Linterna apagada', 'Flashlight off'), 'info'); } Sfx.play('click'); }
    exHud();
  }

  /* ---------- Paneles ---------- */
  function suitPanel() {
    const E = ex(), adv = MODE === 'adv';
    const s = livePanel(() => {
      const su = E.suit, cl = Ex.checklist(S), ob = Ex.objectives(S), base = inBaseNow();
      return panel('🧑‍🚀 ' + XT('Traje y preparación de expedición', 'Suit & expedition prep'), h('div', null,
        su.on ? h('p', { class: 'tag ok' }, XT('✔ Traje puesto: ya puedes salir por la esclusa.', '✔ Suit on: you can go through the airlock.')) : h('p', null, XT('Antes de salir debes equiparte el traje y revisar tus equipos. Cualquier astronauta puede hacerlo; no necesitas cambiar de personaje.', 'Before going out you must put on the suit and check your gear. Any astronaut can do it; you do not need to switch characters.')),
        h('div', { class: 'card' }, h('h3', null, XT('Revisión de equipos', 'Equipment check')), h('table', null, h('tbody', null, cl.map((c) => h('tr', null, h('th', null, (c.ok ? '✅ ' : '⚠️ ') + xt(c.t)), h('td', null, c.v)))))),
        ob ? h('div', { class: 'card' }, h('h3', null, '🎯 ' + XT('Misión: ', 'Mission: ') + xt(ob.m.t)), h('p', { class: 'small' }, xt(ob.m.b)), h('ul', null, ob.list.map((o) => h('li', null, (o.ok ? '✔ ' : '▫ ') + xt(o.t))))) : h('p', { class: 'tag ok' }, XT('Todas las misiones de exploración completadas.', 'All exploration missions complete.')),
        h('p', { class: 'small' }, '⭐ ' + xt(ROLEB[S.playerRole])),
        adv ? h('p', { class: 'small muted' }, XT('Consumo de juego: O₂ ≈ 0,115 %/s (tanque ≈ 14 min de actividad), energía ≈ 0,07 %/s más el térmico y la linterna. El traje real tiene horas de autonomía; aquí se acorta para jugar en minutos.', 'Game rates: O₂ ≈ 0.115 %/s (tank ≈ 14 min of activity), power ≈ 0.07 %/s plus thermal and flashlight. A real suit lasts hours; here it is shortened to play in minutes.')) : h('p', { class: 'small muted' }, XT('El aire y la energía bajan mientras estás fuera. Si se acaban, la base te recoge, pero perderás tiempo.', 'Air and power drop while you are out. If they run out, the base picks you up, but you lose time.')),
        h('div', { class: 'row' },
          !su.on ? btn('🧑‍🚀 ' + XT('Equipar traje', 'Put on suit'), () => { const r = Ex.equip(S); if (r === 'nobase') toast(XT('Sin oxígeno de sobra', 'No spare oxygen'), XT('La base necesita su oxígeno primero.', 'The base needs its oxygen first.'), 'warn'); else Sfx.play('ok'); s._refresh(); exHud(); }, 'primary') : null,
          su.on && base ? btn('♻ ' + XT('Recargar O₂ y energía', 'Recharge O₂ & power'), () => { const r = Ex.recharge(S); toast(r === 'full' ? XT('Ya está lleno', 'Already full') : r ? XT('Sin oxígeno de sobra', 'No spare oxygen') : XT('Traje recargado', 'Suit recharged'), '', r ? 'warn' : 'ok'); s._refresh(); exHud(); }) : null,
          base ? btn('🔧 ' + XT('Reparar traje', 'Repair suit'), () => { const r = Ex.repairSuit(S); toast(r === 'full' ? XT('Traje intacto', 'Suit intact') : r ? XT('Faltan materiales', 'Not enough materials') : XT('Traje reparado', 'Suit repaired'), '', r && r !== 'full' ? 'warn' : 'ok'); s._refresh(); exHud(); }) : null,
          su.on && base ? btn('📤 ' + XT('Quitar traje', 'Take off suit'), () => { Ex.unequip(S); Sfx.play('click'); s._refresh(); exHud(); }) : null,
          btn('🎯 ' + XT('Misiones', 'Missions'), () => exMissionsPanel()))));
    }, { narrow: true });
  }
  function containerPanel() {
    const E = ex(), s = livePanel(() => panel('🧰 ' + xt(TOOLN.container.n), h('div', null,
      h('p', { class: 'small' }, xt(TOOLN.container.d)),
      Ex.storage(S).hand.length ? Ex.storage(S).hand.map(sampleRow) : h('p', { class: 'muted' }, XT('El contenedor está vacío.', 'The container is empty.')),
      h('div', { class: 'row' },
        btn('📦 ' + XT('Depositar en el rover', 'Put in the rover'), () => { const near = Math.hypot(World.player.x - E.rover.x, World.player.y - E.rover.y) < 4.2; if (!near) { toast(XT('El rover está lejos', 'The rover is far'), XT('Acércate a su parte trasera.', 'Go to its rear.'), 'warn'); return; } const r = Ex.deposit(S); if (r === 'full') toast(XT('Compartimento lleno', 'Compartment full'), XT('Regresa a la base y descarga.', 'Return to the base and unload.'), 'warn'); else if (r !== 'none') { Sfx.play('pick'); } s._refresh(); exHud(); }, 'primary'),
        btn('🏠 ' + XT('Descargar en la base', 'Unload at the base'), () => unloadAction(s))))), { narrow: true });
  }
  function unloadAction(s) {
    if (!nearPad(15) && inBaseNow() === false) { toast(XT('Estás lejos de la base', 'You are far from the base'), XT('Descarga junto a la plataforma o dentro de la base.', 'Unload next to the pad or inside the base.'), 'warn'); return; }
    const R = ex().rover, roverNear = Math.hypot(R.x - Field.PAD[0], R.y - Field.PAD[1]) < 16;
    if (!roverNear && ex().rover.load.length) { toast(XT('El rover está lejos de la base', 'The rover is far from the base'), XT('Llévalo cerca de la plataforma para descargarlo.', 'Drive it near the pad to unload.'), 'warn'); return; }
    const n = Ex.unload(S); if (!n) toast(XT('No hay muestras que descargar', 'No samples to unload'), '', 'info'); else { Sfx.play('ok'); toast(XT('Descarga completa', 'Unload complete'), n + XT(' muestras al almacén de muestras', ' samples to sample storage'), 'ok'); }
    if (s && s._refresh) s._refresh(); exHud();
  }
  function sampleRow(r, extra) {
    const es = LANG === 'es';
    return h('div', { class: 'card', style: { padding: '8px' } }, h('div', { class: 'row', style: { alignItems: 'center' } }, h('b', null, r.id), h('span', null, xt(r.name)), tag(xt(Field.KIND_T[r.kind]), 'info'), tag(starsOf(r.int), 'ok'), h('span', { class: 'small muted' }, r.kg + ' kg'), extra || null),
      h('div', { class: 'small muted' }, (r.planet === 'mars' ? 'Marte' : es ? 'Luna' : 'Moon') + ' · ' + Field.coord(r.xy[0], r.xy[1], es) + ' · ' + XT('día ', 'day ') + r.day + ' ' + String(r.hh).padStart(2, '0') + ':' + String(r.mm).padStart(2, '0') + ' · ' + XT('recogida por ', 'collected by ') + tr(DATA.ROLE_T[r.by]).split(' ').pop() + ' · ' + XT('estado ', 'state ') + r.state + ' · ' + XT('ubicación ', 'location ') + locName(r)));
  }
  const locName = (r) => ({ hand: XT('contenedor de mano', 'hand container'), rover: XT('compartimento del rover', 'rover compartment'), base: XT('almacén de la base', 'base storage') }[r.loc] || XT('exterior', 'outside'));
  function storagePanel() {
    const E = ex(); E.storeOpen = true;
    const s = livePanel(() => {
      const st = Ex.storage(S), adv = MODE === 'adv', near = Math.hypot(World.player.x - E.rover.x, World.player.y - E.rover.y) < 5;
      return panel('📦 ' + XT('Compartimento del rover', 'Rover compartment'), h('div', null,
        h('p', null, XT('Capacidad: ', 'Capacity: ') + st.list.length + '/' + st.slots + XT(' muestras', ' samples') + ' · ' + XT('peso simulado ', 'simulated weight ') + fmt(st.kg, 1) + '/' + st.maxKg + ' kg'),
        h('div', { class: 'bar', style: { height: '10px', background: '#26345e', borderRadius: '6px', overflow: 'hidden' } }, h('i', { style: { display: 'block', height: '100%', width: Math.round(st.kg / st.maxKg * 100) + '%', background: st.kg / st.maxKg > 0.85 ? 'var(--warning)' : 'var(--success)' } })),
        st.list.length ? st.list.map((r) => sampleRow(r, h('span', { class: 'row' }, btn('↩ ' + XT('Retirar', 'Take out'), () => { const e = Ex.withdraw(S, r.id); if (e) toast(XT('Contenedor de mano lleno', 'Hand container full'), XT('Máximo 2 muestras en la mano.', 'Maximum 2 samples in hand.'), 'warn'); else Sfx.play('pick'); s._refresh(); exHud(); }, 'sm')))) : h('p', { class: 'muted' }, XT('El compartimento está vacío.', 'The compartment is empty.')),
        h('div', { class: 'row' }, h('span', { class: 'small' }, XT('Organizar:', 'Sort:')), btn(XT('Por ID', 'By ID'), () => { Ex.sortStorage(S, 'id'); s._refresh(); }, 'sm'), btn(XT('Por peso', 'By weight'), () => { Ex.sortStorage(S, 'kg'); s._refresh(); }, 'sm'), btn(XT('Por tipo', 'By type'), () => { Ex.sortStorage(S, 'kind'); s._refresh(); }, 'sm')),
        h('h3', null, '🧰 ' + XT('En tu contenedor de mano', 'In your hand container') + ' (' + st.hand.length + '/' + Ex.CAP.hand + ')'),
        st.hand.length ? st.hand.map(sampleRow) : h('p', { class: 'muted' }, XT('Vacío.', 'Empty.')),
        h('div', { class: 'row' },
          btn('📥 ' + XT('Depositar mi contenedor', 'Deposit my container'), () => { if (!near) { toast(XT('Acércate al rover', 'Move next to the rover'), '', 'warn'); return; } const r = Ex.deposit(S); if (r === 'full') toast(XT('Compartimento lleno', 'Compartment full'), '', 'warn'); else if (r !== 'none') Sfx.play('pick'); s._refresh(); exHud(); }, 'primary'),
          btn('🏠 ' + XT('Descargar todo en la base', 'Unload all at the base'), () => unloadAction(s))),
        adv ? h('p', { class: 'small muted' }, XT('Las muestras descargadas pasan al almacén de muestras de la base: allí se clasifican y se analizan en el laboratorio. Son las mismas muestras; no hay un inventario aparte.', 'Unloaded samples go to the base sample storage, where they are classified and analyzed in the lab. They are the same samples; there is no separate inventory.')) : h('p', { class: 'small muted' }, XT('Lleva las muestras a la base: allí las guardas y las analizas en el laboratorio.', 'Take the samples to the base: store them and analyze them in the lab.')),
        ''), { narrow: false });
    });
    s._onclose = () => { E.storeOpen = false; };
  }
  function exMissionsPanel() {
    const E = ex(), adv = MODE === 'adv';
    push(panel('🎯 ' + XT('Misiones de exploración', 'Exploration missions'), h('div', null,
      h('p', { class: 'small muted' }, XT('Son un camino guiado, pero puedes explorar libremente fuera de los objetivos.', 'They are a guided path, but you can explore freely beyond the goals.')),
      Ex.EXM.map((m, i) => { const done = !!E.m.done[m.id], cur = i === E.m.i, ob = cur ? Ex.objectives(S) : null; return h('div', { class: 'card', style: cur ? { borderColor: 'var(--accent)' } : {} }, h('h3', null, (done ? '✅ ' : cur ? '▶ ' : '🔒 ') + (i + 1) + '. ' + xt(m.t)), h('p', { class: 'small' }, xt(m.b)), (cur || done) ? h('ul', null, m.obj.map((o) => h('li', null, ((ob ? ob.list.find((q) => q.k === o[0]).ok : true) ? '✔ ' : '▫ ') + xt(o[1])))) : null); }),
      adv ? h('p', { class: 'small muted' }, XT('Dosis de esta salida: ', 'This outing dose: ') + RAD_MSV(E.suit.rad) + ' / ' + RAD_MSV(Ex.EXLIM) + ' · ' + XT('evacuaciones: ', 'recoveries: ') + E.recalls) : null)), { narrow: true });
  }
  /** Informe a la Tierra y registro de muestras analizadas (consola del registro de investigaciones). */
  function exReportCard() {
    const E = ex(), done = S.sampleList.filter((r) => r.site && r.an === 'done');
    return h('div', { class: 'card' }, h('h3', null, '📡 ' + XT('Expedición exterior', 'Outside expedition')),
      h('p', { class: 'small' }, XT('Salidas: ', 'Outings: ') + E.trips + ' · ' + XT('muestras de campo: ', 'field samples: ') + S.sampleList.filter((r) => r.site).length + ' · ' + XT('fotos: ', 'photos: ') + E.photos + ' · ' + XT('lecturas: ', 'readings: ') + E.readings),
      btn('📡 ' + XT('Enviar informe a la Tierra', 'Send report to Earth'), () => { const r = Ex.report(S, World.player.x, World.player.y); if (r.err) toast(XT('Sin señal suficiente', 'Signal too weak'), XT('Acércate a la base o activa un repetidor.', 'Get closer to the base or activate a relay.'), 'warn'); else { Sfx.play('ok'); toast(XT('Informe enviado', 'Report sent'), r.ok ? XT('Objetivo de misión cumplido.', 'Mission goal met.') : '+' + fmt(r.add, 1) + XT(' de ciencia', ' science'), 'ok'); } }, 'primary'),
      done.length ? h('div', null, h('h3', null, XT('Resultados registrados', 'Recorded results')), done.slice(-6).reverse().map((r) => h('div', { class: 'small', style: { margin: '6px 0' } }, h('b', null, r.id + ' · ' + xt(r.name)), h('div', null, xt(r.res || { es: '—', en: '—' }) + ' (+' + r.sci + ')')))) : h('p', { class: 'small muted' }, XT('Aún no hay análisis de muestras de campo.', 'No field-sample analyses yet.')));
  }

  /* ---------- Bucle de la expedición ---------- */
  function exHint() {
    const E = ex(); if (!E.suit.on) return null;
    const out = World.zone() === 'outside', es = LANG === 'es', su = E.suit;
    if (out && (su.o2 < 35 || su.en < 25 || su.rad > Ex.EXLIM * 0.7)) return { t: es ? 'Reservas bajas: regresa a la base (flecha azul).' : 'Low reserves: return to the base (blue arrow).', p: [Field.PAD[0], Field.PAD[1] - 2] };
    if (!out) { if (!E.out && E.f.suit && !E.f.out) return { t: es ? 'Cicla la esclusa para salir (consola «Esclusa»).' : 'Cycle the airlock to go out ("Airlock" console).', p: World.consolePos('lock') }; return null; }
    const g = Ex.goal(S); if (!g) return null;
    const ob = Ex.objectives(S), cur = ob && ob.list.find((q) => !q.ok);
    return { t: '🎯 ' + (cur ? xt(cur.t) : ''), p: [g.x, g.y] };
  }
  /** Se llama cada fotograma: consumo, avisos, transición base↔exterior, geiger y evacuación. */
  function exFrame(dt) {
    const c = World.exCtx(); if (!c) return;
    const E = ex(), evs = Ex.tick(S, dt, c);
    if (c.outside && !wasOut) { wasOut = true; if (E.suit.on) { Ex.left(S); toast(XT('Fuera de la base', 'Outside the base'), XT('Sigue las rutas marcadas y vigila O₂ y energía.', 'Follow the marked routes and watch O₂ and power.'), 'info'); } }
    else if (!c.outside && wasOut) { wasOut = false; Ex.arrived(S); toast(XT('De vuelta en la base', 'Back in the base'), E.suit.on ? XT('Descarga las muestras y quita el traje en el vestuario.', 'Unload samples and take off the suit at the locker.') : '', 'ok'); const m = Ex.missionStep(S, 0, { x: 0, y: 0, outside: false }); if (m.indexOf('mission') >= 0) Sfx.play('ok'); }
    for (const k of evs) {
      if (k === 'recall') { Ex.recall(S, E.suit.o2 <= 0 ? 'o2' : E.suit.integ <= 0 ? 'int' : 'rad'); World.teleportHome(); lastCard = ''; Sfx.play('crit'); toast(XT('Evacuación de emergencia', 'Emergency recovery'), XT('La base te recogió. Pasaron unas horas.', 'The base picked you up. A few hours passed.'), 'crit'); }
      else if (k === 'mission') { Sfx.play('ok'); }
      else exAlert(k);
    }
    if (c.outside && E.suit.on && !Sfx.muted) { const ev = Ex.env(S, c.x, c.y); const rate = (ev.burst ? 5 : 1) * (c.inShel ? 0.1 : 1); geigerT -= dt; if (geigerT <= 0) { geigerT = (0.6 + Math.random() * 1.2) / rate; if (ev.burst > 0.5 && !c.inShel) Sfx.play('geiger'); } }
    const outNow = c.outside && E.suit.on, mc0 = $('#mini'); if (outNow && !miniForced) { miniWas = mc0.classList.contains('hidden'); mc0.classList.remove('hidden'); miniForced = true; } else if (!outNow && miniForced) { if (miniWas) mc0.classList.add('hidden'); miniForced = false; }
    if (World.needSuit) toast(XT('Necesitas el traje para salir', 'You need the suit to go out'), XT('Equípalo en el vestuario de la bahía.', 'Put it on at the bay locker.'), 'warn');
    exT += dt; if (exT > 0.2) { exT = 0; exHud(); exCard(World.exNear()); }
  }
  function exAttach() { wasOut = false; lastCard = ''; if (evaEl) { evaEl.classList.add('hidden'); toolsEl.classList.add('hidden'); } }
  const exDebug = { suitPanel, storagePanel, containerPanel, exMissionsPanel, useTool, exInteract, exFrame, exHud, exHint, exCard, exAlert, exLogToRadio, readoutPanel, shelterPanel, unloadAction, selectTool, exReportCard, get cardHidden() { return cardEl && cardEl.classList.contains('hidden'); } };
