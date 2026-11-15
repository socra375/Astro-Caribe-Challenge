
  /* =====================================================================
     INSTALACIONES NUEVAS: almacén de alimentos, cocina, almacén de muestras,
     taller y gestión de residuos. Todas las acciones pasan por Sim.decide
     (panel de consecuencias) y usan el estado real de la simulación.
     Modelo educativo simplificado: no sustituye datos de agencias espaciales.
     ===================================================================== */
  const barEl = (v, max, cls) => h('div', { class: 'meter', style: { cursor: 'default', minWidth: '120px' } }, h('div', { class: 'bar' }, h('i', { style: { width: Math.max(0, Math.min(100, (v / max) * 100)) + '%', background: cls === 'warn' ? 'var(--warning)' : cls === 'crit' ? 'var(--danger)' : '' } })));
  const lvlOf = (v, max, warn, crit) => (v / max <= crit ? 'crit' : v / max <= warn ? 'warn' : 'ok');
  const dayHour = (t) => { const d = Math.floor(t / 24) + 1, hh = Math.floor(t % 24); return (LANG === 'es' ? 'día ' : 'day ') + d + ' · ' + String(hh).padStart(2, '0') + ':00'; };
  const FOODN = { romaine: { es: 'lechuga romana', en: 'romaine lettuce' }, mizuna: { es: 'mizuna', en: 'mizuna' }, radish: { es: 'rábano', en: 'radish' }, chili: { es: 'chile', en: 'chili' }, zinnia: { es: 'flor comestible', en: 'edible flower' } };
  const CATN = { regolith: { es: 'Regolito (polvo y suelo)', en: 'Regolith (dust and soil)' }, rock: { es: 'Roca', en: 'Rock' }, ice: { es: 'Hielo', en: 'Ice' } };
  const STN = { new: { es: 'Recibida', en: 'Received' }, stored: { es: 'Conservada', en: 'Preserved' }, degraded: { es: 'Deteriorada', en: 'Degraded' } };
  const ORIGN = { rover: { es: 'Rover', en: 'Rover' }, eva: { es: 'Salida exterior', en: 'Outside walk' }, field: { es: 'Expedición', en: 'Expedition' }, camp: { es: 'Entrenamiento', en: 'Training' }, legacy: { es: 'Partida anterior', en: 'Earlier game' } };

  function foodModel() {
    const df = Sim.DIFFS[S.diff], per = Sim.P.FOOD_PER_PERSON_DAY * df.cons * (Sim.RATION[S.pant.ration] || 1);
    const total = S.r.food.v, fresh = Math.min(S.pant.fresh, total), packed = Math.max(0, total - fresh), perDay = per * S.N;
    return { total, fresh, packed, perDay, per, days: perDay > 0 ? total / perDay : 99 };
  }

  /* ---------- Almacén de alimentos ---------- */
  function storePanel() {
    const es = LANG === 'es', adv = MODE === 'adv'; Sim.campFlag(S, 'store_open');
    livePanel(() => {
      const m = foodModel(), P = S.pant, lvl = lvlOf(m.total, S.r.food.max, 0.3, 0.12);
      const crops = Object.keys(S.st.crops || {});
      return panel('🧺 ' + consoleName('store'), h('div', null, incHere(['gh']),
        h('div', { class: 'grid2' },
          h('div', { class: 'card' }, h('h3', null, (es ? 'Reservas' : 'Supplies')),
            barEl(m.total, S.r.food.max, lvl === 'ok' ? '' : lvl),
            adv ? h('table', null, h('tbody', null, statRow(es ? 'Total' : 'Total', fmt(m.total, 1) + ' kg', lvl), statRow(es ? 'Fresco' : 'Fresh', fmt(m.fresh, 1) + ' kg'), statRow(es ? 'Raciones de reserva' : 'Reserve rations', fmt(m.packed, 1) + ' kg'),
              statRow(es ? 'Consumo de la tripulación' : 'Crew consumption', fmt(m.perDay, 2) + ' kg/' + (es ? 'día' : 'day')), statRow(es ? 'Autonomía' : 'Supply left', fmt(m.days, 1) + (es ? ' días' : ' days')))) :
              h('div', null, h('p', null, (es ? 'Comida para unos ' : 'Food for about ') + Math.floor(m.days) + (es ? ' días.' : ' days.')), h('p', { class: 'small' }, (es ? 'Fresca: ' : 'Fresh: ') + fmt(m.fresh, 1) + ' kg · ' + (es ? 'de reserva: ' : 'reserve: ') + fmt(m.packed, 1) + ' kg'))),
          h('div', { class: 'card' }, h('h3', null, '❄ ' + (es ? 'Frío y conservación' : 'Cold storage')),
            h('p', { class: 'small' }, es ? 'Lo fresco se estropea más rápido sin frío. El frigorífico gasta un poco de energía (0,1 kW).' : 'Fresh food spoils faster without cold. The fridge uses a little energy (0.1 kW).'),
            tag(P.cold ? '✔ ' + (es ? 'Frigorífico encendido' : 'Fridge on') : '⚠ ' + (es ? 'Frigorífico apagado' : 'Fridge off'), P.cold ? 'ok' : 'warn'),
            h('p', { class: 'small muted' }, (es ? 'Comida estropeada hasta ahora: ' : 'Spoiled so far: ') + fmt(S.st.spoiled, 2) + ' kg'),
            btn(P.cold ? '⏹ ' + (es ? 'Apagar frío' : 'Turn cold off') : '▶ ' + (es ? 'Encender frío' : 'Turn cold on'), () => confirmDecision('cold', { v: !P.cold }, es ? 'Frigorífico' : 'Fridge'), 'sm'))),
        h('h3', null, (es ? 'Tipos de alimento' : 'Food types')),
        h('p', { class: 'small' }, (es ? 'Cosechado en la base: ' : 'Grown in the base: ') + (crops.length ? crops.map((k) => tr(FOODN[k] || { es: k, en: k }) + ' ×' + S.st.crops[k]).join(' · ') : (es ? 'todavía nada (cultiva en el invernadero)' : 'nothing yet (grow in the greenhouse)')) + (es ? '. Y raciones de reserva liofilizadas.' : '. Plus freeze-dried reserve rations.')),
        h('h3', null, (es ? 'Entradas y salidas' : 'Stock in and out')),
        P.log.length ? h('div', { style: { overflowX: 'auto' } }, h('table', null, h('thead', null, h('tr', null, h('th', null, es ? 'Cuándo' : 'When'), h('th', null, es ? 'Movimiento' : 'Movement'), h('th', null, es ? 'Cantidad' : 'Amount'))),
          h('tbody', null, P.log.slice(-8).reverse().map((e) => h('tr', null, h('td', null, dayHour(e.t)), h('td', null, (e.k === 'in' ? '▲ ' + (es ? 'Entra cosecha: ' : 'Harvest in: ') : '▼ ' + (es ? 'Sale para cocina: ' : 'Out to kitchen: ')) + (FOODN[e.w] ? tr(FOODN[e.w]) : e.w === 'salad' ? (es ? 'ensalada' : 'salad') : e.w === 'ration' ? (es ? 'ración' : 'ration') : e.w)), h('td', null, fmt(e.kg, 2) + ' kg')))))) :
          h('p', { class: 'small muted' }, es ? 'Aún no hay movimientos. Las cosechas entran aquí y la cocina saca alimentos.' : 'No movements yet. Harvests come in here and the kitchen takes food out.'),
        h('p', { class: 'small muted' }, es ? 'Modelo educativo simplificado del deterioro de alimentos.' : 'Simplified educational model of food spoilage.')));
    });
  }

  /* ---------- Cocina y comedor ---------- */
  function kitchenPanel() {
    const es = LANG === 'es', adv = MODE === 'adv';
    livePanel(() => {
      const m = foodModel(), P = S.pant, wait = Math.max(0, 8 - (S.t - P.mealT)), hh = S.t % 24;
      const next = [8, 13, 20].map((x) => (x > hh ? x - hh : x + 24 - hh)).reduce((a, b) => Math.min(a, b));
      const RN = { low: { es: 'Raciones reducidas', en: 'Small rations' }, normal: { es: 'Raciones normales', en: 'Normal rations' }, high: { es: 'Raciones abundantes', en: 'Large rations' } };
      const RD = { low: { es: 'Gasta un 20 % menos de comida, pero baja el ánimo.', en: 'Uses 20% less food, but lowers morale.' }, normal: { es: 'Equilibrio entre comida y ánimo.', en: 'Balance between food and morale.' }, high: { es: 'Sube el ánimo, pero gasta un 15 % más de comida.', en: 'Raises morale, but uses 15% more food.' } };
      return panel('🥗 ' + consoleName('kitchen'), h('div', null,
        h('div', { class: 'grid2' },
          h('div', { class: 'card' }, h('h3', null, es ? 'Raciones disponibles' : 'Rations available'),
            adv ? h('table', null, h('tbody', null, statRow(es ? 'Comida total' : 'Total food', fmt(m.total, 1) + ' kg'), statRow(es ? 'Por persona y día' : 'Per person per day', fmt(m.per, 2) + ' kg'), statRow(es ? 'Autonomía' : 'Supply left', fmt(m.days, 1) + (es ? ' días' : ' days')))) :
              h('p', null, (es ? 'Hay comida para unos ' : 'There is food for about ') + Math.floor(m.days) + (es ? ' días.' : ' days.')),
            h('p', { class: 'small muted' }, es ? 'Referencia orientativa: una persona necesita unas 2 500 kcal al día (varía; no es consejo médico).' : 'Rough reference: a person needs about 2,500 kcal a day (it varies; not medical advice).'),
            h('p', { class: 'small' }, (es ? 'Próxima comida del horario: en ' : 'Next scheduled meal: in ') + fmt(next, 0) + ' h (08:00 · 13:00 · 20:00)')),
          h('div', { class: 'card' }, h('h3', null, es ? 'Plan de raciones' : 'Ration plan'),
            ['low', 'normal', 'high'].map((k) => h('div', { class: 'row', style: { margin: '4px 0', alignItems: 'center' } },
              P.ration === k ? tag('✔ ' + tr(RN[k]), 'ok') : btn(tr(RN[k]), () => confirmDecision('ration', { v: k }, tr(RN[k])), 'sm'), h('span', { class: 'small muted' }, tr(RD[k])))))),
        h('h3', null, es ? 'Preparar una comida' : 'Prepare a meal'),
        h('p', { class: 'small' }, wait > 0 ? '⏳ ' + (es ? 'Se puede preparar otra comida especial en ' : 'Another special meal can be prepared in ') + fmt(wait, 1) + ' h.' : (es ? 'Una comida especial cada 8 horas sube el ánimo de la tripulación.' : 'One special meal every 8 hours lifts the crew morale.')),
        h('div', { class: 'row' },
          btn('🥗 ' + (es ? 'Ensalada fresca (1,5 kg de lo fresco)' : 'Fresh salad (1.5 kg of fresh produce)'), () => confirmDecision('cook', { r: 'salad' }, es ? 'Ensalada fresca' : 'Fresh salad'), 'primary'),
          btn('🍲 ' + (es ? 'Ración caliente de reserva (1 kg)' : 'Hot reserve ration (1 kg)'), () => confirmDecision('cook', { r: 'ration' }, es ? 'Ración caliente' : 'Hot ration'))),
        h('p', { class: 'small muted' }, (es ? 'Comidas preparadas hasta ahora: ' : 'Meals prepared so far: ') + S.st.meals + '. ' + (es ? 'Enseña a planificar la comida y gestionar reservas.' : 'It teaches food planning and managing supplies.'))));
    });
  }

  /* ---------- Almacén de muestras ---------- */
  function samplePanel() {
    const es = LANG === 'es', adv = MODE === 'adv';
    livePanel(() => {
      const L = S.sampleList.filter(Ex.isBase), away = S.sampleList.filter((e) => !Ex.isBase(e)), open = L.filter((e) => e.an !== 'done'), done = L.filter((e) => e.an === 'done');
      const used = L.filter((e) => e.slot && e.an !== 'done').length, left = Sim.SAMPLE_SLOTS - used;
      const row = (e) => {
        const fresh = e.state === 'new' || e.state === 'degraded';
        return h('div', { class: 'card', style: e.state === 'degraded' ? { borderColor: 'var(--warning)' } : {} },
          h('div', { class: 'row', style: { alignItems: 'center' } }, h('b', null, e.id), e.name ? h('span', null, tr(e.name)) : null, tag(tr(STN[e.state]), e.state === 'degraded' ? 'warn' : 'ok'),
            e.an === 'inlab' ? tag('🔬 ' + (es ? 'En el laboratorio' : 'In the lab'), 'ok') : null),
          h('p', { class: 'small' }, (es ? 'Origen: ' : 'Origin: ') + tr(ORIGN[e.origin] || ORIGN.rover) + ' · ' + (es ? 'recogida: ' : 'collected: ') + dayHour(e.t) + ' · ' + (es ? 'categoría: ' : 'category: ') + (e.label ? tr(CATN[e.label]) : (es ? 'sin clasificar' : 'not classified')) + ' · ' + (es ? 'ubicación: ' : 'location: ') + (e.slot ? (es ? 'estante ' : 'shelf ') + e.slot : '—')),
          fresh && e.an === 'pending' ? h('div', { class: 'row' }, h('span', { class: 'small' }, es ? 'Clasifica y guarda:' : 'Classify and store:'),
            Sim.SAMPLE_CATS.map((c) => btn(tr(CATN[c]), () => confirmDecision('sstore', { id: e.id, label: c }, e.id + ' · ' + tr(CATN[c])), 'sm'))) : null,
          e.an === 'pending' && e.state !== 'new' ? h('div', { class: 'row' }, btn('🔬 ' + (es ? 'Enviar al laboratorio' : 'Send to the lab'), () => confirmDecision('analyze', { id: e.id }, e.id), 'primary sm')) : null,
          e.an === 'pending' && e.state === 'new' ? h('p', { class: 'small muted' }, es ? 'Sin guardar se deteriora en 24 h.' : 'Unstored, it degrades within 24 h.') : null);
      };
      return panel('🧪 ' + consoleName('sampler'), h('div', null,
        h('p', { class: 'small' }, (es ? 'Huecos libres: ' : 'Free slots: ') + left + '/' + Sim.SAMPLE_SLOTS + ' · ' + (es ? 'por analizar: ' : 'to analyze: ') + S.samples + ' · ' + (es ? 'análisis completados: ' : 'analyses done: ') + done.length),
        away.length ? h('p', { class: 'tag info' }, '🧪 ' + away.length + (es ? ' muestras siguen en el exterior (mano o rover): descárgalas en la base.' : ' samples are still outside (hand or rover): unload them at the base.')) : null,
        open.length ? open.map(row) : h('p', { class: 'muted' }, es ? 'No hay muestras. Recógelas con el rover o saliendo al exterior.' : 'No samples yet. Collect them with the rover or by going outside.'),
        done.length ? h('div', null, h('h3', null, es ? 'Análisis registrados' : 'Recorded analyses'),
          h('div', { style: { overflowX: 'auto' } }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'ID'), h('th', null, es ? 'Categoría' : 'Category'), h('th', null, es ? 'Conservación' : 'Condition'), h('th', null, es ? 'Ciencia' : 'Science'))),
            h('tbody', null, done.slice(-6).reverse().map((e) => h('tr', null, h('td', null, e.id), h('td', null, e.label ? tr(CATN[e.label]) : '—'), h('td', null, tr(STN[e.state])), h('td', null, '+' + e.sci))))))) : null,
        adv ? h('p', { class: 'small muted' }, es ? 'Clasificar bien una muestra da +3 de ciencia; una muestra deteriorada rinde menos (7 en vez de 12).' : 'A correct classification gives +3 science; a degraded sample yields less (7 instead of 12).') : null,
        h('p', { class: 'small muted' }, es ? 'Son muestras ficticias de juego: no son muestras reales de NASA.' : 'These are fictional game samples: they are not real NASA samples.')));
    });
  }

  /* ---------- Taller de mantenimiento ---------- */
  function workPanel() {
    const es = LANG === 'es', adv = MODE === 'adv';
    const SYSK = ['reactor', 'solar', 'o2', 'rec', 'thermal', 'press', 'comms', 'shield'];
    livePanel(() => panel('🛠 ' + consoleName('work'), h('div', null, incHere(['reactor', 'water', 'life', 'rad', 'bridge']),
      h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h3', null, es ? 'Inventario técnico' : 'Technical stock'),
          h('table', null, h('tbody', null, statRow(es ? 'Piezas de repuesto' : 'Spare parts', S.parts), statRow(es ? 'Materiales' : 'Materials', fmt(S.r.mat.v, 1) + ' kg', lvlOf(S.r.mat.v, S.r.mat.max, 0.12, 0.05)), statRow(es ? 'Piezas fabricadas' : 'Parts made', S.st.crafted))),
          S.jobs.filter((j) => j.kind === 'craft' || j.kind === 'maint').map((j) => h('p', { class: 'small' }, '⏳ ' + (j.kind === 'craft' ? (es ? 'Fabricando repuesto: ' : 'Making a part: ') : (es ? 'Mantenimiento: ' : 'Maintenance: ')) + fmt(j.h, 1) + ' h')),
          btn('⚙ ' + (es ? 'Fabricar un repuesto (6 kg de materiales)' : 'Make a spare part (6 kg of materials)'), () => confirmDecision('craft', {}, es ? 'Fabricar repuesto' : 'Make spare part'), 'primary'),
          h('p', { class: 'small muted' }, es ? 'Con un repuesto, el mantenimiento dura menos y no gasta materiales. La ingeniera Ana fabrica más rápido.' : 'With a spare part, maintenance is shorter and uses no materials. Engineer Ana makes parts faster.')),
        h('div', { class: 'card' }, h('h3', null, es ? 'Mantenimiento de equipos' : 'Equipment maintenance'),
          SYSK.filter((k) => S.sys[k]).map((k) => h('div', { class: 'row', style: { alignItems: 'center', margin: '3px 0' } },
            h('span', { style: { minWidth: '140px' } }, tr(DATA.SYS_T[k]) + (adv ? ' ' + Math.round(S.sys[k].h) + ' %' : '')), barEl(S.sys[k].h, 100, S.sys[k].h < 30 ? 'crit' : S.sys[k].h < 70 ? 'warn' : ''),
            btn('🔧', () => confirmDecision('maint', { sys: k }, tr(DATA.SYS_T[k])), 'sm', { 'aria-label': (es ? 'Mantener ' : 'Maintain ') + tr(DATA.SYS_T[k]) }))))))));
  }

  /* ---------- Gestión de residuos ---------- */
  function wastePanel() {
    const es = LANG === 'es', adv = MODE === 'adv', w = S.r.waste, lvl = w.v / w.max >= 0.9 ? 'crit' : w.v / w.max >= 0.75 ? 'warn' : 'ok';
    livePanel(() => panel('♻️ ' + consoleName('wastec'), h('div', null,
      h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h3', null, es ? 'Residuos almacenados' : 'Stored waste'), barEl(w.v, w.max, lvl === 'ok' ? '' : lvl),
          adv ? h('table', null, h('tbody', null, statRow(es ? 'Nivel' : 'Level', fmt(w.v, 1) + ' / ' + w.max + ' kg', lvl), statRow(es ? 'Producción' : 'Production', fmt(w.prod * 24, 2) + ' kg/' + (es ? 'día' : 'day')), statRow(es ? 'Materiales recuperados' : 'Recovered materials', fmt(S.r.mat.v, 1) + ' kg'))) :
            h('p', null, lvl === 'ok' ? (es ? 'Hay sitio de sobra.' : 'Plenty of room.') : (es ? '¡Se está llenando! Recicla pronto.' : 'It is filling up! Recycle soon.'))),
        h('div', { class: 'card' }, h('h3', null, es ? 'Separar y reciclar' : 'Sort and recycle'),
          h('p', { class: 'small' }, es ? 'Separar antes de reciclar recupera más material: 8 kg en vez de 5.' : 'Sorting before recycling recovers more material: 8 kg instead of 5.'),
          S.sorted ? tag('✔ ' + (es ? 'Lote separado, listo para reciclar' : 'Batch sorted, ready to recycle'), 'ok') : btn('🗂 ' + (es ? 'Separar residuos (1 h)' : 'Sort waste (1 h)'), () => confirmDecision('sort', {}, es ? 'Separar' : 'Sort'), 'sm'),
          h('div', { class: 'row', style: { marginTop: '6px' } }, btn('♻️ ' + (es ? 'Reciclar 6 kg en materiales' : 'Recycle 6 kg into materials'), () => confirmDecision('recycle', {}, es ? 'Reciclaje' : 'Recycling'), 'primary')),
          S.jobs.filter((j) => j.kind === 'recycle').map((j) => h('p', { class: 'small' }, '⏳ ' + (es ? 'Reciclando: ' : 'Recycling: ') + fmt(j.h, 1) + ' h')))),
      h('p', { class: 'small muted' }, es ? 'Economía circular: lo que sobra se convierte en materiales para reparar y construir. El reciclado gasta energía.' : 'Circular economy: leftovers become materials for repairs and building. Recycling uses energy.'))));
  }
