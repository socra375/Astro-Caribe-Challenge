  /* =================== CONSOLAS =================== */
  const CNAME = {
    store: { es: 'Almacén de alimentos', en: 'Food storage' }, kitchen: { es: 'Cocina y comedor', en: 'Kitchen & mess' }, sampler: { es: 'Almacén de muestras', en: 'Sample storage' }, work: { es: 'Taller de mantenimiento', en: 'Maintenance workshop' }, wastec: { es: 'Gestión de residuos', en: 'Waste management' },
    cmd: { es: 'Consola de mando', en: 'Command console' }, comms: { es: 'Comunicaciones', en: 'Communications' }, earth: { es: 'Conexión con la Tierra', en: 'Earth Connection' },
    bed: { es: 'Cabinas', en: 'Bunks' }, med: { es: 'Enfermería', en: 'Medical bay' }, rec: { es: 'Sala de bienestar', en: 'Wellbeing corner' },
    gh: { es: 'Panel del invernadero', en: 'Greenhouse panel' }, reactor: { es: 'Panel de energía', en: 'Power panel' }, solar: { es: 'Orientar paneles solares', en: 'Aim solar panels' },
    balance: { es: 'Balance energético', en: 'Energy balance' }, water: { es: 'Reciclaje de agua', en: 'Water recycling' }, o2: { es: 'Calibrar oxígeno', en: 'Calibrate oxygen' },
    shield: { es: 'Blindaje y refugio', en: 'Shielding & shelter' }, rover: { es: 'Rover explorador', en: 'Explorer rover' }, isru: { es: 'Extractor de hielo', en: 'Ice extractor' },
    lock: { es: 'Esclusa', en: 'Airlock' }, wardrobe: { es: 'Vestuario', en: 'Wardrobe' }, lab: { es: 'Análisis de muestras', en: 'Sample analysis' }, spec: { es: 'Espectrómetro', en: 'Spectrometer' }, log: { es: 'Registro de investigaciones', en: 'Research log' }
  };
  const consoleName = (id) => tr(CNAME[id]) || id;
  function openConsole(c) {
    if (c.id === 'sample') {
      return confirmDecision('eva', {}, '🪨 ' + _('collect'), () => { c.s.taken = true; World.setAct('player', 'carry', 8); if (World.zone() === 'outside') toast(LANG === 'es' ? 'Muestra recogida' : 'Sample collected', LANG === 'es' ? 'Llévala al laboratorio para analizarla.' : 'Take it to the lab for analysis.', 'ok'); });
    }
    if (c.id === 'plant') return plantCard(c.bed, c.slot);
    if (c.id === 'wardrobe') return wardrobePanel();
    const ROOM_OF = { cmd: 'bridge', comms: 'bridge', med: 'life', gh: 'gh', reactor: 'reactor', solar: 'reactor', balance: 'reactor', water: 'water', o2: 'water', shield: 'rad', rover: 'rad', isru: 'rad', lab: 'lab', spec: 'lab', log: 'lab' };
    if (c.id === 'spec') Sim.campFlag(S, 'spec_open');
    if (c.id === 'log') Sim.campFlag(S, 'log_open');
    if (c.id === 'med') Sim.campFlag(S, 'med_open');
    const map = { cmd: () => openCmd('missions'), comms: commsPanel, earth: () => earthList(), bed: () => confirmDecision('sleep', {}, '🛏️ ' + _('rest')), rec: () => confirmDecision('rec', {}, '🎲 ' + consoleName('rec')),
      med: medPanel, gh: ghPanel, reactor: reactorPanel, solar: () => miniIntro('solar', {}), balance: () => miniIntro('balance', {}), water: waterPanel, o2: () => miniIntro('o2', {}),
      shield: shieldPanel, store: storePanel, kitchen: kitchenPanel, sampler: samplePanel, work: workPanel, wastec: wastePanel, rover: roverPanel, isru: isruPanel, lock: lockPanel, lab: labPanel, spec: specPanel, log: researchPanel };
    (map[c.id] || (() => {}))();
  }
  function incHere(rooms, body) {
    const list = Sim.activeInc(S).filter((i) => rooms.includes(i.room));
    if (!list.length) return null;
    return h('div', { class: 'card', style: { borderColor: 'var(--warning)' } }, h('h3', null, '⚠ ' + (LANG === 'es' ? 'Incidentes aquí' : 'Incidents here')),
      list.map((i) => h('div', { class: 'row', style: { margin: '6px 0' } }, tag(SEVI[i.sev] + ' ' + _(i.sev), i.sev), h('b', null, tr(DATA.EVT[i.type].t)),
        S.t < i.from ? h('span', { class: 'small' }, (LANG === 'es' ? 'llega en ' : 'arrives in ') + fmt(i.from - S.t) + ' h') : null,
        i.fix ? h('span', { class: 'small muted' }, Math.round(i.prog) + '%') : null,
        i.fix && S.t >= i.from ? btn('🔧 ' + (S.adv && Sim.DIAG_OK[i.type] != null && !i.diag ? _('diagDo') : _('repair')), () => repairFlow(i), 'primary sm') : null,
        btn('❓ ' + _('why'), () => whyPanel(i.type), 'sm'))), body || null);
  }
  const statRow = (label, val, st) => h('tr', null, h('th', null, label), h('td', null, st ? tag(SEVI[st] + ' ' + val, st) : val));
  const sysRow = (k) => { const v = S.sys[k].h; return statRow(tr(DATA.SYS_T[k]), Math.round(v) + '%', v < 30 ? 'crit' : v < 70 ? 'warn' : 'ok'); };
  function slider(label, val, onApply, fmtf, opts) {
    opts = opts || {};
    const out = h('b', null, fmtf(val));
    const r = h('input', { type: 'range', min: opts.min || 0, max: opts.max || 1, step: opts.step || 0.05, value: val, 'aria-label': label, oninput: (e) => { out.textContent = fmtf(+e.target.value); } });
    return h('div', { class: 'col', style: { margin: '8px 0' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', null, label), out), r, btn(_('consequences') + ' →', () => onApply(+r.value), 'sm'));
  }

  /* ---------- Panel de consecuencias ---------- */
  const DMETA = {
    cold: { u: { es: '0,1 kW mientras haya comida fresca', en: '0.1 kW while there is fresh food' }, r: { es: 'Apagado, lo fresco se estropea unas 10 veces más rápido.', en: 'Switched off, fresh food spoils about 10 times faster.' }, b: { es: 'Con frío, la comida fresca dura mucho más.', en: 'With cold, fresh food lasts much longer.' } },
    ration: { u: { es: 'Cambia cuánta comida come la tripulación', en: 'Changes how much food the crew eats' }, r: { es: 'Reducidas: baja el ánimo. Abundantes: se gasta más comida.', en: 'Small: morale drops. Large: more food is used.' }, b: { es: 'Ajusta comida y ánimo según la situación.', en: 'Balances food and morale for the situation.' } },
    cook: { u: { es: 'Comida (1 a 1,5 kg) y 0,6 kW durante 2 h', en: 'Food (1 to 1.5 kg) and 0.6 kW for 2 h' }, r: { es: 'Gasta comida de las reservas.', en: 'Uses food from the supplies.' }, b: { es: 'Sube el ánimo y el bienestar.', en: 'Raises morale and wellbeing.' } },
    sstore: { u: { es: 'Un hueco del almacén de muestras', en: 'One slot in the sample storage' }, r: { es: 'Si clasificas mal, la muestra rinde menos ciencia.', en: 'A wrong classification yields less science.' }, b: { es: 'La muestra queda conservada y localizable.', en: 'The sample stays preserved and traceable.' } },
    craft: { u: { es: '6 kg de materiales y 0,8 kW durante 3 h', en: '6 kg of materials and 0.8 kW for 3 h' }, r: { es: 'Gasta materiales.', en: 'Uses materials.' }, b: { es: '+1 repuesto: el mantenimiento será más rápido y barato.', en: '+1 spare part: maintenance will be faster and cheaper.' } },
    sort: { u: { es: '1 hora de trabajo', en: '1 hour of work' }, r: { es: 'Necesitas al menos 6 kg de residuos.', en: 'You need at least 6 kg of waste.' }, b: { es: 'El próximo reciclaje recupera 8 kg en vez de 5.', en: 'The next recycling recovers 8 kg instead of 5.' } },
    lights: { u: { es: 'Electricidad para las luces LED', en: 'Electricity for LED lights' }, r: { es: 'Menos batería para otros sistemas, sobre todo de noche o con polvo.', en: 'Less battery for other systems, especially at night or with dust.' }, b: { es: 'Las plantas crecen más rápido.', en: 'Plants grow faster.' } },
    irrig: { u: { es: 'Agua del tanque', en: 'Tank water' }, r: { es: 'Si el agua baja mucho, el generador de O₂ también se queda sin agua.', en: 'If water drops a lot, the O₂ generator also runs out.' }, b: { es: 'Cultivos sanos y crecimiento.', en: 'Healthy crops and growth.' } },
    reactor: { u: { es: 'Vida útil del reactor (desgaste)', en: 'Reactor lifetime (wear)' }, r: { es: 'Más potencia = más desgaste y mantenimiento.', en: 'More power = more wear and maintenance.' }, b: { es: 'Más kW disponibles.', en: 'More kW available.' } },
    o2lvl: { u: { es: 'Electricidad y agua (electrólisis)', en: 'Electricity and water (electrolysis)' }, r: { es: 'En manual puedes producir de menos o de más.', en: 'In manual you can under- or over-produce.' }, b: { es: 'Control directo del oxígeno.', en: 'Direct oxygen control.' } },
    recmode: { u: { es: 'Más electricidad en modo máximo', en: 'More electricity in max mode' }, r: { es: 'El modo máximo consume 0,8 kW más.', en: 'Max mode uses 0.8 kW more.' }, b: { es: 'Se recupera más agua.', en: 'More water is recovered.' } },
    emergency: { u: { es: 'Apaga laboratorio, carga del rover, obras, extractor de hielo y luces', en: 'Shuts lab, rover charging, jobs, ice extractor and lights' }, r: { es: 'Las plantas dejan de crecer y no se extrae agua.', en: 'Plants stop growing and no water is extracted.' }, b: { es: 'Se protege la batería para el soporte vital.', en: 'Battery is saved for life support.' } },
    proto: { u: { es: 'Tiempo de la tripulación', en: 'Crew time' }, r: { es: 'En el refugio, los especialistas no aportan sus bonus (no reparan ni cultivan).', en: 'In the shelter, specialists give no bonuses (no repairs or farming).' }, b: { es: 'Mucha menos radiación durante una tormenta.', en: 'Much less radiation during a storm.' } },
    shield: { u: { es: '14 kg de materiales y 0,8 kW durante 6 h', en: '14 kg of materials and 0.8 kW for 6 h' }, r: { es: 'Gasta materiales y energía.', en: 'Uses materials and energy.' }, b: { es: 'Blindaje +1 nivel: menos dosis siempre.', en: 'Shield +1 level: always less dose.' } },
    shelter: { u: { es: '8 kg de materiales y 0,5 kW durante 4 h', en: '8 kg materials and 0.5 kW for 4 h' }, r: { es: 'Gasta materiales.', en: 'Uses materials.' }, b: { es: 'Una plaza más en el refugio.', en: 'One more shelter place.' } },
    maint: { u: { es: '4 kg de materiales y 0,6 kW durante 3 h', en: '4 kg materials and 0.6 kW for 3 h' }, r: { es: 'Gasta materiales.', en: 'Uses materials.' }, b: { es: '+35 % de salud del equipo.', en: '+35% equipment health.' } },
    analyze: { u: { es: '1 muestra y 1,5 kW durante 3 h', en: '1 sample and 1.5 kW for 3 h' }, r: { es: 'Consume energía.', en: 'Uses energy.' }, b: { es: 'Puntos de ciencia.', en: 'Science points.' } },
    experiment: { u: { es: '2 L de agua y 1,5 kW durante 5 h', en: '2 L water and 1.5 kW for 5 h' }, r: { es: 'Consume agua y energía.', en: 'Uses water and energy.' }, b: { es: 'Ciencia y moral.', en: 'Science and morale.' } },
    recycle: { u: { es: '6 kg de residuos y 0,8 kW durante 3 h', en: '6 kg waste and 0.8 kW for 3 h' }, r: { es: 'Consume energía.', en: 'Uses energy.' }, b: { es: '+5 kg de materiales (economía circular).', en: '+5 kg materials (circular economy).' } },
    bedlight: { u: { es: 'Electricidad para las luces LED de la jardinera (0,6 kW al 100 %)', en: 'Electricity for the planter LEDs (0.6 kW at 100%)' }, r: { es: 'Más luz = menos batería para otros sistemas.', en: 'More light = less battery for other systems.' }, b: { es: 'Más luz = más crecimiento (hasta lo que la especie necesita).', en: 'More light = more growth (up to what the species needs).' } },
    mixnutr: { u: { es: '2 kg de residuos orgánicos, 2 L de agua y 0,8 kW durante 2 h', en: '2 kg organic waste, 2 L water and 0.8 kW for 2 h' }, r: { es: 'Gasta agua y energía.', en: 'Uses water and energy.' }, b: { es: '+4 L de solución nutritiva: los residuos vuelven al cultivo (economía circular).', en: '+4 L nutrient solution: waste returns to the crops (circular economy).' } },
    plant: { u: { es: '1 semilla, 0,5 L de agua y 0,2 L de nutrientes', en: '1 seed, 0.5 L water and 0.2 L nutrients' }, r: { es: 'El cultivo necesitará luz, agua y temperatura durante 7 días.', en: 'The crop will need light, water and temperature for 7 days.' }, b: { es: 'Comida fresca en 7 días.', en: 'Fresh food in 7 days.' } },
    sleep: { u: { es: '4 h de tiempo', en: '4 h of time' }, r: { es: 'El tiempo pasa: los recursos se siguen consumiendo.', en: 'Time passes: resources keep being used.' }, b: { es: 'Descanso +30, moral +4.', en: 'Rest +30, morale +4.' } },
    rec: { u: { es: '2 h de tiempo', en: '2 h of time' }, r: { es: 'El tiempo pasa.', en: 'Time passes.' }, b: { es: 'Moral +9.', en: 'Morale +9.' } },
    wait: { u: { es: 'Tiempo', en: 'Time' }, r: { es: 'Pueden ocurrir eventos mientras esperas.', en: 'Events can happen while you wait.' }, b: { es: 'Llegan mensajes y avanzan cultivos y obras.', en: 'Messages arrive; crops and jobs progress.' } },
    isru: { u: { es: '1,8 kW de electricidad', en: '1.8 kW of electricity' }, r: { es: 'Menos energía para otros sistemas.', en: 'Less energy for other systems.' }, b: { es: '+0,45 L/h de agua del hielo.', en: '+0.45 L/h of water from ice.' } },
    eva: { u: { es: '0,2 kg de O₂ del traje', en: '0.2 kg suit O₂' }, r: { es: 'Fuera no hay blindaje: más radiación. ¡Nunca salgas durante una tormenta solar!', en: 'No shielding outside: more radiation. Never go out during a solar storm!' }, b: { es: '+1 muestra y +1 kg de material.', en: '+1 sample and +1 kg material.' } }
  };
  const DKEYS = [['o2', 'kg', 2], ['water', 'L', 1], ['power', 'kWh', 1], ['food', 'kg', 2], ['mat', 'kg', 1], ['dose', 'mSv', 2], ['well', '%', 1], ['rad', '%', 0], ['shelter', '', 0]];
  const DLABEL = { o2: 'o2', water: 'water', power: 'power', food: 'food', mat: 'mat', dose: null, well: 'well', rad: 'rad', shelter: null };
  const DICON = { o2: '🫁', water: '💧', power: '🔋', food: '🥗', mat: '🛠', dose: '🛡', well: '😊', rad: '🛡', shelter: '🛡' };
  const DMAX = { o2: 36, water: 200, power: 200, food: 80, mat: 120, dose: 80, well: 100, rad: 100, shelter: 5 };
  function confirmDecision(id, params, title, after) {
    const pv = Sim.preview(S, id, params);
    const meta = DMETA[id] || {}, es = LANG === 'es', adv = MODE === 'adv';
    const nameOf = (k) => (DLABEL[k] ? _(DLABEL[k]) : k === 'dose' ? (es ? 'Radiación recibida' : 'Radiation received') : (es ? 'Plazas del refugio' : 'Shelter places'));
    const rows = [];
    for (const [k, u, d] of DKEYS) {
      const delta = pv.b[k] - pv.a[k];
      const big = Number.isFinite(delta) && Math.abs(delta) >= Math.max(Math.pow(10, -d) * 0.5, 0.05);
      rows.push({ k, u, d, delta, big, good: k === 'dose' ? delta < 0 : delta > 0 });
    }
    const changed = rows.filter((r) => r.big);
    const word = (r) => { const f = Math.abs(r.delta) / ((k) => (k === 'dose' ? S.limit : DMAX[k]))(r.k); return f < 0.02 ? (es ? 'un poco' : 'a little') : f < 0.08 ? (es ? 'bastante' : 'quite a bit') : (es ? 'mucho' : 'a lot'); };
    let body;
    if (!adv) {
      const ups = changed.filter((r) => r.good), downs = changed.filter((r) => !r.good);
      const li = (r) => h('li', { class: r.good ? 'delta-up' : 'delta-down' }, (r.delta > 0 ? '▲ ' : '▼ ') + DICON[r.k] + ' ' + nameOf(r.k) + ': ' + (r.delta > 0 ? (es ? 'sube ' : 'goes up ') : (es ? 'baja ' : 'goes down ')) + word(r));
      body = h('div', null,
        h('div', { class: 'grid2' },
          h('div', { class: 'card' }, h('h3', null, '▲ ' + (es ? 'Lo que mejora' : 'What gets better')), ups.length ? h('ul', null, ups.map(li)) : h('p', { class: 'muted' }, es ? 'Nada cambia mucho.' : 'Nothing changes much.')),
          h('div', { class: 'card' }, h('h3', null, '▼ ' + (es ? 'Lo que se gasta o empeora' : 'What gets used or worse')), downs.length ? h('ul', null, downs.map(li)) : h('p', { class: 'muted' }, es ? 'Nada cambia mucho.' : 'Nothing changes much.'))),
        h('div', { class: 'grid2' }, h('div', { class: 'card' }, h('h3', null, '⚠ ' + (es ? 'Ojo con esto' : 'Careful')), h('p', null, tr(meta.r) || '—')), h('div', { class: 'card' }, h('h3', null, '✔ ' + (es ? 'Lo bueno' : 'The good part')), h('p', null, tr(meta.b) || '—'))),
        h('p', { class: 'small muted' }, es ? 'Es una predicción del juego para las próximas ' + fmt(pv.hours) + ' horas.' : 'This is a game prediction for the next ' + fmt(pv.hours) + ' hours.'));
    } else {
      const fmtv = (k, v, d) => (k === 'dose' ? fmt(v, 2) : fmt(v, d));
      const tbl = h('table', null, h('thead', null, h('tr', null, h('th', null, es ? 'Variable' : 'Variable'), h('th', null, es ? 'Ahora' : 'Now'), h('th', null, (es ? 'En ' : 'In ') + fmt(pv.hours) + ' h ' + (es ? 'sin actuar' : 'no action')), h('th', null, (es ? 'En ' : 'In ') + fmt(pv.hours) + ' h ' + (es ? 'con la decisión' : 'with decision')), h('th', null, 'Δ'))),
        h('tbody', null, rows.filter((r) => r.big || ['o2', 'water', 'power', 'food'].includes(r.k)).map((r) => h('tr', { class: r.big ? (r.good ? 'delta-up' : 'delta-down') : '' }, h('th', null, nameOf(r.k)), h('td', null, fmtv(r.k, pv.now[r.k], r.d) + ' ' + r.u), h('td', null, fmtv(r.k, pv.a[r.k], r.d) + ' ' + r.u), h('td', null, fmtv(r.k, pv.b[r.k], r.d) + ' ' + r.u), h('td', null, r.big ? (r.delta > 0 ? '+' : '') + fmtv(r.k, r.delta, r.d) + ' ' + r.u : '—')))));
      body = h('div', null,
        h('p', { class: 'small muted' }, _('in12', { h: fmt(pv.hours) }) + ' · ' + (es ? 'balance de potencia ahora: ' : 'power balance now: ') + (pv.now.net >= 0 ? '+' : '') + fmt(pv.now.net) + ' kW'),
        h('div', { style: { overflowX: 'auto' } }, tbl),
        h('div', { class: 'grid2', style: { marginTop: '8px' } },
          h('div', { class: 'card' }, h('h3', null, '🧰 ' + _('uses')), h('p', null, tr(meta.u) || '—')),
          h('div', { class: 'card' }, h('h3', null, '⚠ ' + _('risks')), h('p', null, tr(meta.r) || '—')),
          h('div', { class: 'card' }, h('h3', null, '✔ ' + _('benefits')), h('p', null, tr(meta.b) || '—'))));
    }
    body.append(
      !pv.ok ? h('p', { class: 'tag warn' }, '⚠ ' + _(pv.err)) : null,
      h('div', { class: 'row', style: { marginTop: '10px' } },
        btn('✔ ' + _('confirm'), () => {
          const r = Sim.decide(S, id, params);
          pop();
          if (!r.ok) toast(_('err'), _(r.err), 'warn'); else { processLogs(); updateHud(); if (after) after(); stack.forEach((z) => z._refresh && z._refresh()); }
        }, 'primary', { disabled: !pv.ok ? true : null, autofocus: true }),
        btn(_('cancel'), () => pop())));
    push(panel('⚖️ ' + (adv ? _('consequences') : (es ? '¿Qué pasará?' : 'What will happen?')) + ' · ' + title, body));
  }
  function livePanel(builder) { // modal que se reconstruye tras cada decisión
    const s = push(builder());
    s._refresh = () => { if (s.isConnected) refresh(s, builder); };
    return s;
  }

  /* ---------- Consola de mando ---------- */
  function openCmd(tab) {
    let cur = tab || 'missions';
    const s = livePanel(() => {
      const tabs = [['missions', '🎯 ' + _('missions')], ['resources', '📊 ' + _('resources')], ['crew', '👩‍🚀 ' + _('crew')], ['log', '📜 ' + _('logT')], ['map', '🗺️ ' + _('mapT')]];
      const body = h('div', null, h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, l]) => h('button', { class: 'btn sm', role: 'tab', 'aria-selected': k === cur ? 'true' : 'false', onclick: () => { cur = k; s._refresh(); } }, l))),
        cur === 'missions' ? missionsTab() : cur === 'resources' ? (Sim.campFlag(S, 'cmd_resources'), resourcesTab()) : cur === 'crew' ? crewTab() : cur === 'log' ? logTab() : mapTab());
      return panel('🖥️ ' + consoleName('cmd'), body);
    });
  }
  function campaignCard() {
    const es = LANG === 'es', C = S.camp, xs = Sim.expStatus(S);
    if (!C) return null;
    const exp = C.basicDone ? h('div', { class: 'card', style: { borderColor: 'var(--accent)', marginBottom: '10px' } },
      h('h3', null, '🏗 ' + (es ? 'Ampliación de la base' : 'Base expansion')),
      h('div', { class: 'row' }, Sim.EXP.map((d, i) => tag((C.done[d.id] ? '✔ ' : i === C.xi ? '▶ ' : '🔒 ') + tr(NPCDATA.CAMP[d.id].t), C.done[d.id] ? 'ok' : i === C.xi ? 'info' : ''))),
      xs ? h('div', null, h('p', null, h('b', null, tr(NPCDATA.CAMP[xs.id].t) + ': '), tr(NPCDATA.CAMP[xs.id].b)), h('ul', null, xs.keys.map((k) => h('li', { class: k.done ? 'delta-up' : '' }, (k.done ? '✔ ' : '⬜ ') + tr(NPCDATA.KEY[k.k]))))) :
        h('p', { class: 'small' }, es ? '✔ Completada. Las trece instalaciones están abiertas. Opcional: no bloquea las misiones.' : '✔ Complete. All thirteen facilities are open. Optional: it never blocks missions.')) : null;
    return h('div', null, campaignCardBasic(), exp);
  }
  function campaignCardBasic() {
    const es = LANG === 'es', C = S.camp;
    if (!C) return null;
    const cs = Sim.campStatus(S);
    return h('div', { class: 'card', style: { borderColor: 'var(--accent)', marginBottom: '10px' } },
      h('h3', null, '🧭 ' + (es ? 'Familiarización con la base' : 'Base familiarization')),
      h('div', { class: 'row' }, Sim.CAMP.map((d, i) => tag((C.done[d.id] ? '✔ ' : i === C.i ? '▶ ' : '🔒 ') + tr(NPCDATA.CAMP[d.id].t) + ' → ' + tr(DATA.ROOMS[d.unlock]), C.done[d.id] ? 'ok' : i === C.i ? 'info' : ''))),
      cs ? h('div', null, h('p', null, h('b', null, tr(NPCDATA.CAMP[cs.id].t) + ': '), tr(NPCDATA.CAMP[cs.id].b)), h('ul', null, cs.keys.map((k) => h('li', { class: k.done ? 'delta-up' : '' }, (k.done ? '✔ ' : '⬜ ') + tr(NPCDATA.KEY[k.k])))),
        bar(cs.keys.filter((k) => k.done).length / cs.keys.length)) : h('p', { class: 'small' }, es ? '✔ Completada. Las siete secciones principales están abiertas.' : '✔ Complete. The seven main sections are open.'));
  }
  function missionsTab() {
    const campLock = S.camp && !S.camp.basicDone;
    const list = [1, 2, 3, 4, 5, 6, 7].map((id) => {
      const D = DATA.MIS[id], m = S.m[id];
      const stTag = tag(_(m.st), m.st === 'done' ? 'ok' : m.st === 'active' ? 'info' : m.st === 'failed' ? 'warn' : '');
      const varTxt = tr(D.vars[m.st === 'active' || m.st === 'done' ? m.var : 0]);
      return h('div', { class: 'card' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('h3', null, D.icon + ' ' + id + '. ' + tr(D.t)), h('span', null, stTag, ' ', m.stars ? '★'.repeat(m.stars) + '☆'.repeat(3 - m.stars) : '')),
        h('p', null, tr(D.brief)), h('p', null, h('b', null, _('objective') + ': '), varTxt),
        m.st === 'active' ? h('div', null, h('ol', { class: 'small' }, tr(D.steps).map((x) => h('li', null, x))), bar(m.prog), id === 3 && m.data.used != null ? h('p', { class: 'small' }, (LANG === 'es' ? 'Dosis media añadida: ' : 'Added average dose: ') + fmt(m.data.used, 2) + ' / ' + Sim.DIFFS[S.diff].budget + ' mSv') : null,
          id === 6 ? h('p', { class: 'small' }, (LANG === 'es' ? 'Cosechado: ' : 'Harvested: ') + fmt(m.data.kg || 0) + ' / ' + m.data.target + ' kg') : null,
          id === 7 ? h('p', { class: 'small' }, (LANG === 'es' ? 'Muestras necesarias: ' : 'Samples needed: ') + m.data.target) : null,
          Sim.LIMIT[id] < 900 ? h('p', { class: 'small muted' }, (LANG === 'es' ? 'Tiempo restante: ' : 'Time left: ') + fmt(Math.max(0, Sim.LIMIT[id] - (S.t - m.t0)), 0) + ' h') : null) : null,
        h('p', { class: 'small muted' }, _('learn') + ': ' + tr(D.learn)),
        h('div', { class: 'row' },
          campLock ? h('span', { class: 'small muted' }, '🔒 ' + _('locked')) : null,
          !campLock && m.st !== 'active' && m.st !== 'done' ? btn('▶ ' + (m.st === 'failed' ? _('retry') : _('startM')), () => { const r = Sim.startMission(S, id); if (!r.ok) toast(_('err'), _(r.err === 'busy' ? 'busy' : 'err'), 'warn'); else narrate(tr(DATA.MIS[id].t) + '. ' + tr(DATA.MIS[id].vars[S.m[id].var]), { silent: true }); processLogs(); if (r.ok && id === 4) { pop(); sitePanel(); } else stack.forEach((x) => x._refresh && x._refresh()); }, 'primary sm') : null,
          m.st === 'active' && id === 4 ? btn('🗺️ ' + (LANG === 'es' ? 'Elegir sitio' : 'Choose site'), () => sitePanel(), 'primary sm') : null,
          m.st === 'active' ? btn(_('abandon'), () => { Sim.abortMission(S, id); processLogs(); stack.forEach((x) => x._refresh && x._refresh()); }, 'sm danger') : null,
          m.st === 'done' ? btn('🌎 ' + _('earthConn'), () => earthCard(id), 'sm') : null));
    });
    return h('div', null, campaignCard(), h('p', { class: 'small muted' }, LANG === 'es' ? 'Solo una misión a la vez (la 6, de cultivo, puede ir en paralelo). Puedes repetir las fallidas con condiciones distintas.' : 'One mission at a time (6, farming, can run in parallel). Failed ones can be retried with different conditions.'),
      h('div', { class: 'grid2' }, list), h('div', { class: 'row', style: { marginTop: '12px' } }, btn('📄 ' + _('endRun'), () => { popAll(); Sim.finishRun(S); saveRun(); showReport(); }, 'danger')));
  }
  function resourcesTabRaw() {
    const R = S.r, rows = [];
    const res = [['o2', 'kg'], ['water', 'L'], ['power', 'kWh'], ['food', 'kg'], ['mat', 'kg'], ['waste', 'kg']];
    for (const [k, u] of res) {
      const r = R[k], st = k === 'waste' ? (r.v > r.warn ? 'warn' : 'ok') : Sim.status(S, k);
      rows.push(h('tr', null, h('th', null, _(k)), h('td', null, tag(SEVI[st] + ' ' + fmt(r.v) + ' / ' + fmt(r.max, 0) + ' ' + u, st)),
        h('td', null, '+' + fmt(r.prod, 2) + (k === 'power' ? ' kW' : ' ' + u + '/h')), h('td', null, '−' + fmt(r.cons, 2) + (k === 'power' ? ' kW' : ' ' + u + '/h')),
        h('td', { class: 'small muted' }, k === 'waste' ? '' : '⚠ ' + fmt(r.warn, 0) + ' · ⛔ ' + fmt(r.crit, 0))));
    }
    const pw = S.pw;
    return h('div', null,
      h('table', null, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, LANG === 'es' ? 'Valor / máx.' : 'Value / max'), h('th', null, LANG === 'es' ? 'Producción' : 'Production'), h('th', null, LANG === 'es' ? 'Consumo' : 'Use'), h('th', null, LANG === 'es' ? 'Umbrales' : 'Thresholds'))), h('tbody', null, rows)),
      h('div', { class: 'grid2', style: { marginTop: '12px' } },
        h('div', { class: 'card' }, h('h3', null, '⚡ ' + _('power')), h('table', null, h('tbody', null,
          statRow('☀️ ' + tr(DATA.SYS_T.solar), fmt(pw.sol) + ' kW'), statRow('⚛️ ' + tr(DATA.SYS_T.reactor), fmt(pw.rea) + ' kW'), statRow(LANG === 'es' ? 'Demanda' : 'Demand', fmt(pw.demand) + ' kW'),
          statRow(LANG === 'es' ? 'Servida' : 'Served', fmt(pw.served) + ' kW', pw.served < pw.demand - 0.05 ? 'warn' : 'ok'), statRow(LANG === 'es' ? 'Modo emergencia' : 'Emergency mode', S.emergency ? _('on') : _('off'))))),
        h('div', { class: 'card' }, h('h3', null, '🫁 ' + (LANG === 'es' ? 'Soporte vital' : 'Life support')), h('table', null, h('tbody', null,
          statRow(LANG === 'es' ? 'O₂ en cabina' : 'Cabin O₂', fmt(S.sys.o2.conc) + ' %', S.sys.o2.conc < 19.5 || S.sys.o2.conc > 23.5 ? 'crit' : 'ok'), statRow(LANG === 'es' ? 'Reciclaje de agua' : 'Water recycling', Math.round(S.d.rec * 100) + ' %', S.d.rec < 0.7 ? 'warn' : 'ok'),
          statRow(LANG === 'es' ? 'Temperatura' : 'Temperature', fmt(S.sys.thermal.T) + ' °C', Math.abs(S.sys.thermal.T - 21) > 5 ? 'warn' : 'ok'), statRow(LANG === 'es' ? 'Presión' : 'Pressure', fmt(S.sys.press.P) + ' kPa', S.sys.press.P < 90 ? 'warn' : 'ok'),
          statRow(LANG === 'es' ? 'Consumo O₂ por persona' : 'O₂ per person', fmt(Sim.P.O2_PER_PERSON_DAY, 2) + ' kg/día'), statRow(LANG === 'es' ? 'Tripulantes' : 'Crew', S.N)))),
        h('div', { class: 'card' }, h('h3', null, '🛡️ ' + _('rad')), h('table', null, h('tbody', null,
          statRow(LANG === 'es' ? 'Efectividad del blindaje' : 'Shield effectiveness', Math.round(S.d.rad * 100) + ' %', Sim.status(S, 'rad')), statRow(LANG === 'es' ? 'Dosis máxima estimada' : 'Max estimated dose', fmt(S.d.dose, 2) + ' / ' + S.limit + ' mSv', Sim.status(S, 'dose')),
          statRow(LANG === 'es' ? 'Plazas en refugio' : 'Shelter places', S.sys.shield.cap + ' / ' + S.N), statRow(LANG === 'es' ? 'Actividad solar' : 'Solar activity', S.mods && S.mods.spe > 0 ? (LANG === 'es' ? 'TORMENTA' : 'STORM') : (LANG === 'es' ? 'tranquila' : 'quiet'), S.mods && S.mods.spe > 0 ? 'crit' : 'ok')))),
        h('div', { class: 'card' }, h('h3', null, '🔧 ' + (LANG === 'es' ? 'Sistemas' : 'Systems')), h('table', null, h('tbody', null, ['reactor', 'solar', 'o2', 'rec', 'thermal', 'press', 'comms', 'shield', 'isru'].map(sysRow))))),
      h('div', { class: 'row', style: { marginTop: '10px' } }, btn('⏩ ' + _('wait1'), () => confirmDecision('wait', { h: 1 }, _('wait1'))), btn('⏩ ' + _('wait6'), () => confirmDecision('wait', { h: 6 }, _('wait6')))),
      null);
  }
  function crewTab() {
    return h('div', { class: 'grid2' }, S.crew.map((c) => h('div', { class: 'card' }, h('h3', null, c.role === S.playerRole ? (LANG === 'es' ? '🧑‍🚀 Tú · ' : '🧑‍🚀 You · ') + tr(Chars.ROLES[c.role].name) : tr(DATA.ROLE_T[c.role])), h('p', { class: 'small' }, tr(DATA.ROLE_T[c.role].b)),
      h('p', null, (LANG === 'es' ? 'Zona: ' : 'Zone: ') + (c.zone === 'shelter' ? (LANG === 'es' ? 'refugio' : 'shelter') : c.zone === 'outside' ? (LANG === 'es' ? 'exterior' : 'outside') : (LANG === 'es' ? 'hábitat' : 'habitat'))),
      h('p', null, (LANG === 'es' ? 'Dosis: ' : 'Dose: ') + fmt(c.dose, 2) + ' mSv'))),
      h('div', { class: 'card' }, h('h3', null, '😊 ' + _('well')), h('p', null, (LANG === 'es' ? 'Moral: ' : 'Morale: ') + Math.round(S.morale) + ' %'), bar(S.morale / 100), h('p', null, (LANG === 'es' ? 'Descanso: ' : 'Rest: ') + Math.round(S.rest) + ' %'), bar(S.rest / 100),
        h('p', { class: 'small muted' }, LANG === 'es' ? 'Depende de temperatura, presión, aire, comida, agua y alertas.' : 'Depends on temperature, pressure, air, food, water and alerts.')));
  }
  function logTab() {
    const act = S.inc.filter((i) => !i.res);
    return h('div', null,
      h('h3', null, _('alerts')), act.length ? act.map((i) => h('div', { class: 'row', style: { margin: '4px 0' } }, tag(SEVI[i.sev] + ' ' + _(i.sev), i.sev), h('b', null, tr(DATA.EVT[i.type].t)), h('span', { class: 'small muted' }, tr(DATA.ROOMS[i.room])), S.t < i.from ? h('span', { class: 'small' }, '⏳ ' + fmt(i.from - S.t) + ' h') : null, btn('❓ ' + _('why'), () => whyPanel(i.type), 'sm'))) : h('p', { class: 'muted' }, _('none')),
      h('div', { class: 'legend', style: { margin: '8px 0' } }, tag('⛔ ' + _('crit'), 'crit'), tag('⚠ ' + _('warn'), 'warn'), tag('ℹ ' + _('info'), 'info')),
      h('h3', null, _('logT')), h('table', null, h('tbody', null, S.log.slice(-40).reverse().map((e) => { const [t, b] = logText(e); return h('tr', null, h('td', { class: 'small' }, 'D' + (Math.floor(e.t / 24) + 1) + ' ' + fmt(e.t % 24, 0) + 'h'), h('td', null, SEVI[e.sev] || ''), h('td', null, h('b', null, t), ' ', h('span', { class: 'small muted' }, b))); }))));
  }
  function mapTab() {
    const c = h('canvas', { width: 600, height: 560, style: { width: '100%', maxWidth: '600px', background: '#050816', borderRadius: '12px' }, 'aria-label': _('mapT') });
    setTimeout(() => { const hi = nextHint(); World.minimap(c.getContext('2d'), S, hi && hi.p); }, 10);
    return h('div', null, c, h('div', { class: 'legend' }, ['bridge', 'life', 'gh', 'reactor', 'water', 'rad', 'lab'].map((k) => h('span', null, '■ ' + tr(DATA.ROOMS[k])))),
      h('p', { class: 'small muted' }, LANG === 'es' ? 'Punto blanco: tú · puntos de color: tripulación · punto amarillo: objetivo · borde rojo/ámbar: incidente.' : 'White dot: you · colored dots: crew · yellow dot: goal · red/amber border: incident.'));
  }

  /* ---------- Misión 4: selección de sitio ---------- */
  function sitePanel() {
    const sites = DATA.SITES[S.scen], pr = DATA.PRIOS[(S.m[4].var + S.seed) % 3];
    const score = (s) => (s.slope * pr.w.slope + s.light * pr.w.light + s.geo * pr.w.geo + s.risk * pr.w.risk);
    const best = Math.max(...sites.map(score));
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
    push(panel('🗺️ ' + tr(DATA.MIS[4].t), h('div', null,
      h('p', { class: 'tag info', style: { fontSize: '16px' } }, tr(pr.t)),
      h('p', { class: 'small muted' }, LANG === 'es' ? 'Criterios: pendiente suave (★ más = más plano), iluminación, interés geológico y bajo riesgo (★ más = más seguro). Valoraciones cualitativas del juego basadas en descripciones públicas de NASA; no son mediciones ni certifican seguridad.' : 'Criteria: gentle slope (more ★ = flatter), lighting, geological interest and low risk (more ★ = safer). Qualitative game ratings based on public NASA descriptions; not measurements, no safety certification.'),
      h('table', null, h('thead', null, h('tr', null, h('th', null, LANG === 'es' ? 'Sitio' : 'Site'), h('th', null, LANG === 'es' ? 'Pendiente' : 'Slope'), h('th', null, LANG === 'es' ? 'Luz' : 'Light'), h('th', null, 'Geo'), h('th', null, LANG === 'es' ? 'Seguridad' : 'Safety'), h('th', null, ''))),
        h('tbody', null, sites.map((s) => h('tr', null, h('td', null, h('b', null, tr(s.n)), h('div', { class: 'small muted' }, tr(s.d))), h('td', null, stars(s.slope)), h('td', null, stars(s.light)), h('td', null, stars(s.geo)), h('td', null, stars(s.risk)),
          h('td', null, btn(LANG === 'es' ? 'Elegir' : 'Choose', () => {
            const sc = score(s) / best, isBest = sc >= 0.999;
            pop(); Sim.reportSite(S, s.id, sc); processLogs();
            const bestS = sites.find((x) => score(x) >= best - 1e-9);
            push(panel(isBest ? '✔ ' + _('success') : '🤔 ' + (LANG === 'es' ? 'Buena idea, pero hay una mejor' : 'Good idea, but there is a better one'), h('div', null,
              h('p', null, (LANG === 'es' ? 'Tu elección: ' : 'Your choice: ') + tr(s.n) + ' (' + Math.round(sc * 100) + ' %)'),
              !isBest ? h('p', null, (LANG === 'es' ? 'Según esta prioridad, el mejor era: ' : 'For this priority, the best was: ') + tr(bestS.n) + '. ' + tr(bestS.d)) : h('p', null, tr(s.d)),
              h('p', { class: 'small' }, LANG === 'es' ? 'No existe el sitio perfecto: cada prioridad cambia la respuesta. Por eso los equipos reales comparan muchos criterios y datos.' : 'There is no perfect site: each priority changes the answer. Real teams compare many criteria and data.'),
              h('p', null, h('a', { href: S.scen === 'mars' ? 'https://trek.nasa.gov/mars/' : 'https://trek.nasa.gov/moon/', target: '_blank', rel: 'noopener' }, S.scen === 'mars' ? 'NASA Mars Trek' : 'NASA Moon Trek'), LANG === 'es' ? ' (requiere Internet)' : ' (needs Internet)')), { narrow: true }));
          }, 'primary sm')))))))));
  }

  /* ---------- Comunicaciones ---------- */
  function commsPanel() {
    const s = livePanel(() => {
      const ow = Sim.oneWay(S), down = S.mods && S.mods.commsDown;
      const realTxt = S.scen === 'moon' ? (LANG === 'es' ? '≈1,3 segundos' : '≈1.3 seconds') : fmt(S.lightMin) + (LANG === 'es' ? ' minutos (en esta partida; varía de ~3 a ~22 según las órbitas)' : ' minutes (this game; varies ~3 to ~22 with orbits)');
      const q = S.cm.q.map((m) => h('li', null, '📤 ' + reqName(m.kind) + ' — ' + (m.st === 'transit' ? _('transit') + ', ' + _('eta') + ' ' + fmt(Math.max(0, m.arriveEarth - S.t)) + ' h' : _('pending') + ', ' + _('eta') + ' ' + fmt(Math.max(0, m.reply - S.t)) + ' h')));
      const inbox = S.cm.inbox.slice().reverse().map((m) => { m.read = true; return h('div', { class: 'card' }, h('b', null, '📥 ' + reqName(m.kind)), h('span', { class: 'small muted' }, ' · D' + (Math.floor(m.t / 24) + 1) + ' · ' + (LANG === 'es' ? 'enviado hace ' : 'sent ') + fmt(S.t - m.sent) + ' h'), h('p', null, replyText(m))); });
      return panel('📡 ' + consoleName('comms'), h('div', null,
        down ? h('p', { class: 'tag crit' }, '⛔ ' + (LANG === 'es' ? 'Sin enlace: los mensajes esperan en la antena hasta que se repare.' : 'No link: messages wait at the antenna until it is repaired.')) : null,
        incHere(['bridge']),
        h('table', null, h('tbody', null, statRow(_('delayReal'), realTxt), statRow(_('delayOne'), fmt(ow) + ' h ' + (LANG === 'es' ? '(escala del juego: 1 min-luz ≈ 1 h)' : '(game scale: 1 light-min ≈ 1 h)')), statRow(LANG === 'es' ? 'Ida y vuelta mínima' : 'Minimum round trip', fmt(ow * 2 + 0.5) + ' h'))),
        more(null, h('p', null, LANG === 'es' ? 'La Tierra responde con los datos que le llegaron, no con los de ahora. Si algo urge, actúa con tus protocolos.' : 'Earth replies using the data it received, not the current data. If something is urgent, follow your protocols.'), !isAdv() ? h('p', { class: 'small' }, LANG === 'es' ? 'En este modo el retraso es más corto que el real para que el juego sea ágil.' : 'In this mode the delay is shorter than the real one to keep the game lively.') : null),
        h('div', { class: 'row' }, btn('📤 ' + _('reqStatus'), () => { Sim.send(S, 'status'); processLogs(); s._refresh(); }), btn('📤 ' + _('reqForecast'), () => { Sim.send(S, 'forecast'); processLogs(); s._refresh(); }), btn('📤 ' + _('reqRoute'), () => { Sim.send(S, 'route'); processLogs(); s._refresh(); })),
        h('h3', null, _('transit')), q.length ? h('ul', null, q) : h('p', { class: 'muted' }, _('none')),
        h('div', { class: 'row' }, btn('⏩ ' + _('wait1'), () => { Sim.decide(S, 'wait', { h: 1 }); processLogs(); s._refresh(); }), btn('⏩ ' + _('wait6'), () => confirmDecision('wait', { h: 6 }, _('wait6')))),
        h('h3', null, _('inbox')), inbox.length ? inbox : h('p', { class: 'muted' }, _('none'))));
    });
  }
  function reqName(k) { return { status: _('reqStatus'), forecast: _('reqForecast'), route: _('reqRoute'), daily: LANG === 'es' ? 'Mensaje diario del control de misión' : 'Daily message from mission control' }[k] || k; }
  function replyText(m) {
    const es = LANG === 'es', sn = m.snap;
    if (m.kind === 'status') {
      const pcts = { o2: sn.o2 / 36, water: sn.water / 200, power: sn.power / 200, food: sn.food / 80 };
      const low = Object.keys(pcts).sort((a, b) => pcts[a] - pcts[b])[0];
      return (es ? 'Control: con la telemetría que recibimos, el recurso más bajo era ' : 'Control: from the telemetry we received, the lowest resource was ') + _(low) + ' (' + Math.round(pcts[low] * 100) + ' %). ' + (es ? 'Recomendamos revisarlo. Recuerden: estos datos ya tienen horas de antigüedad.' : 'We recommend checking it. Remember: this data is already hours old.');
    }
    if (m.kind === 'forecast') return m.stormSoon ? (es ? 'Control: los observatorios solares detectan actividad intensa. Preparen el refugio.' : 'Control: solar observatories detect strong activity. Prepare the shelter.') : (es ? 'Control: actividad solar tranquila por ahora. Sigan vigilando con su monitor local.' : 'Control: solar activity is quiet for now. Keep watching with your local monitor.');
    if (m.kind === 'route') return es ? 'Control: enviamos una ruta segura con los peligros marcados desde imágenes orbitales. Úsala en tu próxima salida del rover.' : 'Control: we sent a safe route with hazards marked from orbital images. Use it on your next rover drive.';
    const tips = es ? ['Recuerden reciclar residuos: se convierten en materiales.', 'El riego por goteo ahorra agua en el invernadero.', 'Revisen la calibración del sensor de O₂ de vez en cuando.', 'Antes de una tormenta solar, amplíen el refugio.', 'Mantener los equipos evita fallas mayores.'] : ['Recycle waste: it becomes materials.', 'Drip irrigation saves greenhouse water.', 'Check the O₂ sensor calibration now and then.', 'Expand the shelter before a solar storm.', 'Maintaining equipment avoids bigger failures.'];
    return (es ? 'Control: ¡buen trabajo, equipo! Consejo del día: ' : 'Control: good work, team! Tip of the day: ') + tips[(m.n || 0) % tips.length];
  }

  /* ---------- Paneles de salas ---------- */
  function medPanel() {
    push(panel('🩺 ' + consoleName('med'), h('div', null, incHere(['life']), crewTab(),
      h('table', { style: { marginTop: '10px' } }, h('tbody', null, sysRow('thermal'), sysRow('press'), statRow(LANG === 'es' ? 'Temperatura' : 'Temperature', fmt(S.sys.thermal.T) + ' °C'), statRow(LANG === 'es' ? 'Presión' : 'Pressure', fmt(S.sys.press.P) + ' kPa'))),
      h('p', { class: 'small muted' }, LANG === 'es' ? 'NASA OSDR reúne investigaciones sobre cómo el espacio afecta a seres vivos. No es un sistema médico en tiempo real: aquí las dosis son estimaciones del modelo.' : 'NASA OSDR gathers research on how space affects living things. It is not a real-time medical system: doses here are model estimates.'))));
  }
  function ghPanel() {
    const es = LANG === 'es';
    livePanel(() => {
      const g = S.sys.gh;
      const beds = S.beds.map((b, bi) => h('div', { class: 'card' }, h('b', null, (es ? 'Jardinera ' : 'Planter ') + (bi + 1)),
        h('div', { class: 'row' }, b.plants.map((pl, k) => btn(pl ? tr(Flora.SPECIES[pl.sp].name).split(' ')[0] + ' ' + Math.round(pl.prog * 100) + '%' + (pl.prog >= 1 ? ' ✨' : '') + (pl.hp < 50 || pl.moist < 28 ? ' ⚠' : '') : '➕ ' + (es ? 'vacío' : 'empty'), () => plantCard(bi, k), 'sm'))),
        h('div', { class: 'row small' }, '💡 ' + Math.round(b.light * 100) + '%', btn('−', () => confirmDecision('bedlight', { bed: bi, v: Math.max(0, b.light - 0.2) }, 'LED ' + (bi + 1)), 'sm', { 'aria-label': (es ? 'Bajar LED jardinera ' : 'Lower LED planter ') + (bi + 1) }), btn('+', () => confirmDecision('bedlight', { bed: bi, v: Math.min(1, b.light + 0.2) }, 'LED ' + (bi + 1)), 'sm', { 'aria-label': (es ? 'Subir LED jardinera ' : 'Raise LED planter ') + (bi + 1) }))));
      return panel('🌱 ' + consoleName('gh'), h('div', null, incHere(['gh']),
        h('p', { class: 'small muted' }, es ? 'Toca una planta para ver su ficha. También puedes acercarte a ella en el invernadero y pulsar E.' : 'Tap a plant to open its card. You can also walk up to it in the greenhouse and press E.'),
        h('div', { class: 'grid2' }, beds),
        h('div', { class: 'grid2', style: { marginTop: '10px' } },
          h('div', { class: 'card' }, slider('💧 ' + (es ? 'Riego automático (los sensores paran al 65 %)' : 'Automatic irrigation (sensors stop at 65%)'), g.irrig, (v) => confirmDecision('irrig', { v }, es ? 'Riego' : 'Irrigation'), (v) => Math.round(v * 100) + '%'),
            h('p', { class: 'small' }, (es ? 'Riego por goteo: ' : 'Drip irrigation: ') + (g.drip ? '✔ ' + _('on') + (es ? ' (45 % menos agua)' : ' (45% less water)') : '✖ ' + (es ? 'desbloquéalo con el minijuego' : 'unlock it with the mini-game')))),
          h('div', { class: 'card' }, h('h3', null, '🧪 ' + (es ? 'Solución nutritiva' : 'Nutrient solution')), h('p', null, fmt(S.r.nutr.v, 1) + ' / ' + S.r.nutr.max + ' L'),
            btn('♻️ ' + (es ? 'Preparar con residuos orgánicos' : 'Make from organic waste'), () => confirmDecision('mixnutr', {}, es ? 'Solución nutritiva' : 'Nutrient solution'), 'sm'),
            h('p', { class: 'small muted' }, '🌰 ' + Object.keys(S.seeds).map((k) => tr(Flora.SPECIES[k].name).split(' ')[0] + ' ' + S.seeds[k]).join(' · ')))),
        more(null, h('p', null, (es ? 'Temperatura: ' : 'Temperature: ') + fmt(S.sys.thermal.T) + ' °C. ' + (es ? 'El ciclo de 7 días es una simplificación del juego, no lo que tarda cada cultivo en la vida real.' : 'The 7-day cycle is a game simplification, not how long each crop takes in real life.'))),
        btn('🎮 ' + _('play') + ': ' + tr(MG.defs.gh.t), () => miniIntro('gh', { inc: (Sim.activeInc(S).find((i) => i.type === 'crop_fail') || {}).id }), 'primary')));
    });
  }
  function reactorPanel() {
    livePanel(() => panel('⚛️ ' + consoleName('reactor'), h('div', null, incHere(['reactor']),
      h('table', null, h('tbody', null, sysRow('reactor'), sysRow('solar'), statRow(LANG === 'es' ? 'Alineación paneles' : 'Panel alignment', Math.round(S.sys.solar.align * 100) + ' %', S.sys.solar.align < 0.7 ? 'warn' : 'ok'),
        statRow(LANG === 'es' ? 'Polvo en paneles' : 'Panel dust', Math.round(S.sys.solar.dust * 100) + ' %', S.sys.solar.dust > 0.2 ? 'warn' : 'ok'), statRow(LANG === 'es' ? 'Generación' : 'Generation', fmt(S.pw.gen) + ' kW'), statRow(LANG === 'es' ? 'Demanda' : 'Demand', fmt(S.pw.demand) + ' kW'),
        statRow(_('power'), fmt(S.r.power.v, 0) + ' / ' + S.r.power.max + ' kWh', Sim.status(S, 'power')))),
      slider('⚛️ ' + (LANG === 'es' ? 'Potencia del reactor' : 'Reactor output'), S.sys.reactor.lvl, (v) => confirmDecision('reactor', { v }, LANG === 'es' ? 'Reactor' : 'Reactor'), (v) => Math.round(v * 100) + '% · ' + fmt(v * Sim.SC[S.scen].reactorKw) + ' kW'),
      h('div', { class: 'row' },
        btn((S.emergency ? '🟢 ' : '🚨 ') + (LANG === 'es' ? (S.emergency ? 'Salir del modo emergencia' : 'Activar modo emergencia') : (S.emergency ? 'Leave emergency mode' : 'Emergency mode')), () => confirmDecision('emergency', { v: !S.emergency }, LANG === 'es' ? 'Modo emergencia' : 'Emergency mode')),
        btn('🛠️ ' + (LANG === 'es' ? 'Mantenimiento del reactor' : 'Reactor maintenance'), () => confirmDecision('maint', { sys: 'reactor' }, LANG === 'es' ? 'Mantenimiento' : 'Maintenance')),
        btn('🛠️ ' + (LANG === 'es' ? 'Mantenimiento solar' : 'Solar maintenance'), () => confirmDecision('maint', { sys: 'solar' }, LANG === 'es' ? 'Mantenimiento' : 'Maintenance')),
        btn('🔌 ' + tr(MG.defs.wiring.t), () => miniIntro('wiring', { sys: S.sys.reactor.h <= S.sys.solar.h ? 'reactor' : 'solar' })),
        btn('☀️ ' + tr(MG.defs.solar.t), () => miniIntro('solar', {})), btn('⚖️ ' + tr(MG.defs.balance.t), () => miniIntro('balance', {}))),
      isAdv() ? prioCard() : null,
      more(null, h('p', null, LANG === 'es' ? (isAdv() ? 'Prioridades por defecto: 1) soporte vital, 2) comunicaciones y blindaje, 3) laboratorio, rover, obras y extractor de hielo, 4) luces y bombas del invernadero. Si falta energía, se recorta primero el número más alto.' : 'Si falta energía, se apagan primero las luces de las plantas y al final lo que mantiene vivas a las personas.') : (isAdv() ? 'Default priorities: 1) life support, 2) comms and shielding, 3) lab, rover, jobs and ice extractor, 4) greenhouse lights and pumps. When power is short, the highest number is shed first.' : 'When power is short, plant lights go off first and what keeps people alive goes off last.'))))));
  }
  function waterPanel() {
    livePanel(() => panel('💧 ' + consoleName('water'), h('div', null, incHere(['water']),
      h('table', null, h('tbody', null, sysRow('rec'), sysRow('o2'), statRow(LANG === 'es' ? 'Reciclaje efectivo' : 'Effective recycling', Math.round(S.d.rec * 100) + ' %', S.d.rec < 0.7 ? 'warn' : 'ok'),
        statRow(_('water'), fmt(S.r.water.v, 0) + ' L · +' + fmt(S.r.water.prod, 2) + ' / −' + fmt(S.r.water.cons, 2) + ' L/h', Sim.status(S, 'water')), statRow(_('o2'), fmt(S.r.o2.v) + ' kg · +' + fmt(S.r.o2.prod, 3) + ' / −' + fmt(S.r.o2.cons, 3) + ' kg/h', Sim.status(S, 'o2')),
        statRow(LANG === 'es' ? 'O₂ en cabina' : 'Cabin O₂', fmt(S.sys.o2.conc) + ' % (19,5–23,5)', S.sys.o2.conc < 19.5 || S.sys.o2.conc > 23.5 ? 'crit' : 'ok'), statRow(LANG === 'es' ? 'Error del sensor' : 'Sensor error', fmt(S.sys.o2.calib, 2) + ' pp', Math.abs(S.sys.o2.calib) > 1.5 ? 'warn' : 'ok'),
        statRow(LANG === 'es' ? 'Generador O₂' : 'O₂ generator', (S.sys.o2.auto ? 'AUTO · ' : 'MANUAL · ') + Math.round(S.sys.o2.lvl * 100) + ' %'))),
      h('div', { class: 'row' },
        btn((S.sys.rec.mode === 'max' ? '🌿 ' : '🚀 ') + (LANG === 'es' ? (S.sys.rec.mode === 'max' ? 'Modo eco (menos energía)' : 'Modo máximo (más agua)') : (S.sys.rec.mode === 'max' ? 'Eco mode (less power)' : 'Max mode (more water)')), () => confirmDecision('recmode', { v: S.sys.rec.mode === 'max' ? 'eco' : 'max' }, LANG === 'es' ? 'Modo del reciclador' : 'Recycler mode')),
        btn(S.sys.o2.auto ? (LANG === 'es' ? '🎛️ Pasar O₂ a manual' : '🎛️ Switch O₂ to manual') : (LANG === 'es' ? '🤖 Volver a automático' : '🤖 Back to automatic'), () => confirmDecision('o2lvl', { auto: !S.sys.o2.auto, v: S.sys.o2.lvl }, LANG === 'es' ? 'Generador de O₂' : 'O₂ generator')),
        btn('🔌 ' + tr(MG.defs.wiring.t), () => miniIntro('wiring', { sys: 'rec' })), btn('🫧 ' + tr(MG.defs.o2.t), () => miniIntro('o2', {}))),
      !S.sys.o2.auto ? slider(LANG === 'es' ? 'Producción manual de O₂' : 'Manual O₂ production', S.sys.o2.lvl, (v) => confirmDecision('o2lvl', { auto: false, v }, 'O₂'), (v) => Math.round(v * 100) + '%') : null,
      more(null, h('p', null, isAdv() ? (LANG === 'es' ? 'Electrólisis: 2 H₂O → 2 H₂ + O₂. Para 1 kg de oxígeno se necesitan 1,125 L de agua y electricidad.' : 'Electrolysis: 2 H₂O → 2 H₂ + O₂. 1 kg of oxygen needs 1.125 L of water plus electricity.') : (LANG === 'es' ? 'Para hacer aire hace falta agua y electricidad: el aire y el agua están conectados.' : 'Making air needs water and electricity: air and water are connected.'))))));
  }
  function shieldPanel() {
    livePanel(() => {
      const eff = Sim.shieldEff(S);
      return panel('🛡️ ' + consoleName('shield'), h('div', null, incHere(['rad']),
        h('table', null, h('tbody', null, sysRow('shield'), statRow(LANG === 'es' ? 'Nivel de blindaje' : 'Shield level', S.sys.shield.lvl + ' / 3'), statRow(LANG === 'es' ? 'Efectividad' : 'Effectiveness', Math.round(eff * 100) + ' %', Sim.status(S, 'rad')),
          statRow(LANG === 'es' ? 'Plazas del refugio' : 'Shelter places', S.sys.shield.cap + ' / ' + S.N, S.sys.shield.cap < S.N ? 'warn' : 'ok'), statRow(LANG === 'es' ? 'Protocolo de refugio' : 'Shelter protocol', S.proto ? _('on') : _('off'), S.proto ? 'info' : 'ok'),
          statRow(LANG === 'es' ? 'Dosis máxima estimada' : 'Max estimated dose', fmt(S.d.dose, 2) + ' / ' + S.limit + ' mSv', Sim.status(S, 'dose')), statRow(_('mat'), fmt(S.r.mat.v) + ' kg'),
          statRow(LANG === 'es' ? 'Fondo de radiación (superficie)' : 'Background radiation (surface)', fmt(Sim.SC[S.scen].gcr, 2) + ' mSv/' + (LANG === 'es' ? 'día (medido)' : 'day (measured)')))),
        S.jobs.length ? h('p', { class: 'small' }, '🏗️ ' + S.jobs.map((j) => j.kind + ' ' + fmt(j.h) + ' h').join(' · ')) : null,
        h('div', { class: 'row' },
          btn((S.proto ? '🟢 ' : '🚨 ') + (LANG === 'es' ? (S.proto ? 'Desactivar protocolo' : 'Activar protocolo de refugio') : (S.proto ? 'Turn off protocol' : 'Turn on shelter protocol')), () => confirmDecision('proto', { v: !S.proto }, LANG === 'es' ? 'Protocolo de refugio' : 'Shelter protocol'), S.proto ? '' : 'primary'),
          btn('🧱 ' + (LANG === 'es' ? 'Reforzar blindaje' : 'Reinforce shield'), () => confirmDecision('shield', {}, LANG === 'es' ? 'Reforzar blindaje' : 'Reinforce shield')),
          btn('➕ ' + (LANG === 'es' ? 'Ampliar refugio' : 'Expand shelter'), () => confirmDecision('shelter', {}, LANG === 'es' ? 'Ampliar refugio' : 'Expand shelter'))),
        more(isAdv() ? 'RadLab · ISS' : (LANG === 'es' ? 'Más información: la radiación' : 'More information: radiation'),
          h('p', { class: 'small' }, isAdv() ? (LANG === 'es' ? 'RadLab (NASA OSDR) publica mediciones de dosímetros de la ISS. La ISS orbita dentro del campo magnético terrestre, que la protege en parte: sus valores son una referencia, NO mediciones de la Luna ni de Marte. El modelo del juego es simplificado: el blindaje frena mucho mejor las partículas de una tormenta solar que los rayos cósmicos galácticos.' : 'RadLab (NASA OSDR) publishes dosimeter measurements from the ISS. The ISS orbits inside Earth\'s magnetic field, which partly protects it: its values are a reference, NOT Moon or Mars measurements. The game model is simplified: shielding stops solar-storm particles much better than galactic cosmic rays.') : (LANG === 'es' ? 'Los astronautas de la Estación Espacial miden su radiación, pero allí la Tierra los protege un poco. En la Luna y en Marte hace falta más protección. Aquí usamos números inventados para el juego.' : 'Astronauts on the Space Station measure their radiation, but there Earth protects them a little. On the Moon and Mars more protection is needed. Here we use made-up numbers for the game.')),
          h('a', { href: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/', target: '_blank', rel: 'noopener' }, 'RadLab'), ' · ', h('a', { href: 'https://osdr.nasa.gov/bio/repo/', target: '_blank', rel: 'noopener' }, 'OSDR'))));
    });
  }
  function roverPanel() {
    const m7 = S.m[7], target = m7.st === 'active' ? m7.data.target : Sim.DIFFS[S.diff].samples;
    const blackout = S.mods && S.mods.commsDown;
    push(panel('🚙 ' + consoleName('rover'), h('div', null,
      h('table', null, h('tbody', null, statRow(LANG === 'es' ? 'Batería del rover' : 'Rover battery', Math.round(S.sys.rover.batt) + ' %', S.sys.rover.batt < 40 ? 'warn' : 'ok'), statRow(LANG === 'es' ? 'Estado' : 'Condition', Math.round(S.sys.rover.h) + ' %'),
        statRow(LANG === 'es' ? 'Ruta de la Tierra' : 'Earth route', S.sys.rover.hint ? '✔ ' + (LANG === 'es' ? 'recibida' : 'received') : '✖ ' + (LANG === 'es' ? 'no recibida' : 'not received'), S.sys.rover.hint ? 'ok' : 'warn'),
        statRow(LANG === 'es' ? 'Muestras sin analizar' : 'Samples to analyze', S.samples))),
      h('p', null, S.sys.rover.hint ? (LANG === 'es' ? 'Tienes la ruta segura: verás todos los peligros.' : 'You have the safe route: all hazards will be visible.') : (LANG === 'es' ? 'Sin ruta de la Tierra: conducirás solo con tus sensores (autonomía). Puedes pedirla en Comunicaciones y esperar la respuesta.' : 'No Earth route: you will drive with your sensors only (autonomy). You can request one in Comms and wait for the reply.')),
      blackout ? h('p', { class: 'tag warn' }, '⚠ ' + (LANG === 'es' ? 'La antena falla: puede que pierdas la señal durante la conducción.' : 'Antenna failing: you may lose signal while driving.')) : null,
      S.sys.rover.batt < 30 ? h('p', { class: 'tag warn' }, LANG === 'es' ? 'La batería está baja: espera a que se cargue (usa energía de prioridad 3).' : 'Battery is low: wait for it to charge (uses priority-3 power).') : null,
      h('div', { class: 'row' }, btn('🚙 ' + _('explore'), () => { pop(); miniIntro('rover', { target, hint: S.sys.rover.hint, blackout }); }, 'primary', { disabled: S.sys.rover.batt < 30 ? true : null }), btn('📡 ' + _('reqRoute'), () => { Sim.send(S, 'route'); processLogs(); pop(); })))));
  }
  function isruPanel() {
    push(panel('🧊 ' + consoleName('isru'), h('div', null, h('table', null, h('tbody', null, sysRow('isru'), statRow(LANG === 'es' ? 'Estado' : 'State', S.sys.isru.on ? _('on') : _('off')), statRow(LANG === 'es' ? 'Producción' : 'Output', fmt(Sim.P.ISRU_LPH, 2) + ' L/h · ' + fmt(Sim.P.ISRU_KW) + ' kW'))),
      h('p', null, LANG === 'es' ? 'ISRU significa "usar recursos del lugar". Se cree que los cráteres en sombra del polo sur lunar y el subsuelo de algunas zonas de Marte contienen hielo de agua. Extraerlo cuesta energía, pero evita traer agua desde la Tierra.' : 'ISRU means "in-situ resource utilization". Shadowed craters at the lunar south pole and the subsurface of parts of Mars are thought to contain water ice. Extracting it costs energy but avoids shipping water from Earth.'),
      btn(S.sys.isru.on ? '⏹ ' + _('off') : '▶ ' + _('on'), () => { pop(); confirmDecision('isru', { v: !S.sys.isru.on }, consoleName('isru')); }, 'primary'))));
  }
  function lockPanel() {
    const a = World.airlock();
    push(panel('🚪 ' + consoleName('lock'), h('div', null,
      h('p', null, LANG === 'es' ? 'La esclusa nunca abre las dos puertas a la vez: así el aire de la base no se escapa. Se despresuriza para salir y se presuriza para entrar.' : 'The airlock never opens both doors at once, so base air does not escape. It depressurizes to go out and pressurizes to come in.'),
      h('p', null, (LANG === 'es' ? 'Estado: ' : 'State: ') + (a.st === 'in' ? (LANG === 'es' ? 'conectada al interior' : 'connected inside') : a.st === 'out' ? (LANG === 'es' ? 'conectada al exterior' : 'connected outside') : (LANG === 'es' ? 'ciclando…' : 'cycling…'))),
      S.mods && S.mods.spe > 0 ? h('p', { class: 'tag crit' }, LANG === 'es' ? '⛔ Tormenta solar: no salgas.' : '⛔ Solar storm: do not go out.') : null,
      btn('🔄 ' + (LANG === 'es' ? 'Ciclar esclusa' : 'Cycle airlock'), () => { World.cycleLock(); pop(); }, 'primary'))), { narrow: true });
  }
  function labPanel() {
    livePanel(() => panel('🔬 ' + consoleName('lab'), h('div', null, incHere(['lab']),
      h('table', null, h('tbody', null, statRow(LANG === 'es' ? 'Muestras sin analizar' : 'Samples to analyze', S.samples), statRow(LANG === 'es' ? 'Puntos de ciencia' : 'Science points', S.science), statRow(_('waste'), fmt(S.r.waste.v) + ' kg'), statRow(_('mat'), fmt(S.r.mat.v) + ' kg'))),
      S.jobs.length ? h('p', { class: 'small' }, '⏳ ' + S.jobs.map((j) => j.kind + ' ' + fmt(j.h) + ' h').join(' · ')) : null,
      h('div', { class: 'row' }, btn('🔬 ' + (LANG === 'es' ? 'Analizar muestra' : 'Analyze sample'), () => confirmDecision('analyze', {}, LANG === 'es' ? 'Análisis' : 'Analysis')),
        btn('♻️ ' + (LANG === 'es' ? 'Reciclar residuos' : 'Recycle waste'), () => confirmDecision('recycle', {}, LANG === 'es' ? 'Reciclaje' : 'Recycling')),
        btn('🧫 ' + (LANG === 'es' ? 'Experimento biológico' : 'Biology experiment'), () => confirmDecision('experiment', {}, LANG === 'es' ? 'Experimento' : 'Experiment'))),
      h('p', { class: 'small muted' }, LANG === 'es' ? 'El científico Leo analiza un 50 % más rápido. Reciclar residuos en materiales es economía circular: lo que sobra se vuelve útil.' : 'Scientist Leo analyzes 50% faster. Turning waste into materials is circular economy: leftovers become useful.'))));
  }
  function specPanel() {
    const mars = S.scen === 'mars';
    const items = mars ? [['Si', 0.9], ['Fe', 0.75], ['Mg', 0.45], ['Ca', 0.35], ['Al', 0.4], ['S', 0.3]] : [['Si', 0.9], ['Al', 0.7], ['Ca', 0.65], ['Fe', 0.35], ['Mg', 0.3], ['Ti', 0.12]];
    const c = h('canvas', { width: 560, height: 220, style: { width: '100%', maxWidth: '560px', background: '#050915', borderRadius: '12px' }, 'aria-label': 'Spectrum' });
    setTimeout(() => { const x = c.getContext('2d'); items.forEach(([el, v], i) => { const hue = 280 - i * 45; x.fillStyle = 'hsl(' + hue + ',80%,60%)'; x.fillRect(30 + i * 88, 190 - v * 160, 50, v * 160); x.fillStyle = '#eef3ff'; x.font = 'bold 16px system-ui'; x.fillText(el, 45 + i * 88, 210); }); }, 10);
    push(panel('🌈 ' + consoleName('spec'), h('div', null, S.samples < 1 && S.st.samplesTot < 1 ? h('p', { class: 'tag warn' }, LANG === 'es' ? 'Aún no hay muestras: recógelas fuera (por la esclusa) o con el rover.' : 'No samples yet: collect them outside (through the airlock) or with the rover.') : null,
      c, h('p', { class: 'small muted' }, LANG === 'es' ? 'Gráfico ilustrativo (no es una medición real).' : 'Illustrative chart (not a real measurement).'),
      h('p', null, mars ? (LANG === 'es' ? 'El suelo de Marte es rico en hierro oxidado, que le da su color rojizo, y en minerales de roca volcánica (basalto).' : 'Martian soil is rich in oxidized iron, which gives its reddish color, and in volcanic rock minerals (basalt).') : (LANG === 'es' ? 'Las tierras altas lunares contienen mucha anortosita, una roca rica en calcio y aluminio. El regolito también puede usarse como material de construcción y blindaje.' : 'Lunar highlands contain a lot of anorthosite, a rock rich in calcium and aluminum. Regolith can also be used as building and shielding material.')),
      h('p', { class: 'small' }, LANG === 'es' ? 'Un espectrómetro separa la luz en colores; cada elemento deja una "huella" diferente.' : 'A spectrometer splits light into colors; each element leaves a different "fingerprint".'))));
  }
  function researchPanel() {
    push(panel('📚 ' + consoleName('log'), h('div', null,
      h('table', null, h('tbody', null, statRow(LANG === 'es' ? 'Muestras recogidas' : 'Samples collected', S.st.samplesTot), statRow(LANG === 'es' ? 'Puntos de ciencia' : 'Science points', S.science), statRow(LANG === 'es' ? 'Cosechas' : 'Harvests', Object.values(S.st.crops).reduce((a, b) => a + b, 0)))),
      h('div', { class: 'card' }, h('h3', null, 'NASA OSDR'), h('p', { class: 'small' }, LANG === 'es' ? 'El Open Science Data Repository guarda datos de experimentos biológicos en el espacio (plantas, microbios, animales). Sirve para investigar, no para vigilar la salud de una tripulación en tiempo real.' : 'The Open Science Data Repository stores data from biology experiments in space (plants, microbes, animals). It is for research, not real-time crew health monitoring.'), h('a', { href: 'https://osdr.nasa.gov/bio/repo/', target: '_blank', rel: 'noopener' }, 'osdr.nasa.gov')),
      h('div', { class: 'card' }, h('h3', null, LANG === 'es' ? 'Logros' : 'Achievements'), h('ul', null, Object.keys(DATA.ACH).map((k) => h('li', null, (ach[k] ? '🏅 ' : '⬜ ') + tr(DATA.ACH[k]))))))));
  }
