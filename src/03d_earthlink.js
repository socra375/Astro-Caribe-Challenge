/* =====================================================================
   EL — EARTHLINK RADIO: motor de comunicaciones con la Tierra (sin DOM).
   Canales, mensajes con retraso, estado del enlace calculado con la
   simulación, respuestas que dependen del estado real, consecuencias en
   el juego, informes con datos reales y propuestas de los especialistas.
   Todo el estado vive en S.el y se guarda con la partida. Los textos se
   generan en español e inglés a la vez (no dependen del idioma activo).
   ===================================================================== */
const EL = (function () {
  const T = (es, en) => ({ es, en });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SCALES = [0.25, 0.5, 1, 2]; // escala del retraso comprimido del juego
  const CH = [
    { id: 'control', who: 'commander', icon: '🌎', n: T('Centro de Control', 'Control Center'), d: T('Informes, pronóstico, rutas, suministros y órdenes.', 'Reports, forecast, routes, supplies and orders.') },
    { id: 'eng', who: 'engineer', icon: '🔧', n: T('Ingeniería', 'Engineering'), d: T('Averías, energía y repuestos con la ingeniera Ana.', 'Faults, power and parts with engineer Ana.') },
    { id: 'med', who: 'medic', icon: '🩺', n: T('Medicina', 'Medicine'), d: T('Salud, soporte vital y radiación con la médica Mei.', 'Health, life support and radiation with medic Mei.') },
    { id: 'sci', who: 'scientist', icon: '🔬', n: T('Ciencia', 'Science'), d: T('Muestras e información científica con Leo.', 'Samples and science information with Leo.') },
    { id: 'agri', who: 'agri', icon: '🌱', n: T('Agricultura', 'Agriculture'), d: T('Cultivos del invernadero con Bruno.', 'Greenhouse crops with Bruno.') },
    { id: 'emerg', who: 'commander', icon: '⛔', n: T('Emergencias', 'Emergencies'), d: T('Avisos urgentes y petición de asistencia.', 'Urgent calls and requests for assistance.') }
  ];
  const DESK = { control: T('Control de Misión', 'Mission Control'), eng: T('Control · Ingeniería', 'Control · Engineering'), med: T('Control · Medicina', 'Control · Medicine'), sci: T('Control · Ciencia', 'Control · Science'), agri: T('Control · Agricultura', 'Control · Agriculture'), emerg: T('Control · Emergencias', 'Control · Emergencies') };
  const RESN = { o2: T('oxígeno', 'oxygen'), water: T('agua', 'water'), food: T('alimentos', 'food'), power: T('energía', 'power'), mat: T('materiales', 'materials') };
  const RESU = { o2: 'kg', water: 'L', food: 'kg', power: 'kWh', mat: 'kg' };

  function def() {
    return { v: 1, ch: 'control', scale: 1, seq: 1, out: [], hist: [], unread: {}, prop: [], rep: { n: 0, last: null, day: -1 }, orders: [], facts: {}, sup: [], lastSup: -999, lastReply: 0, prevLink: 'stable', stormDmg: false, tx: 0, rx: 0, recvT: -99, fc: [], cool: {}, evac: false, dly: 0 };
  }
  function ensure(S) {
    if (S.el && S.el.v === 1) return S.el;
    const D = def(); if (!S.el) S.el = D;
    for (const k in D) if (S.el[k] == null) S.el[k] = D[k];
    S.el.v = 1; return S.el;
  }
  const nf = (v, d, es) => { const s = (+v).toFixed(d); return es ? s.replace('.', ',') : s; };
  const both = (f) => ({ es: f(true), en: f(false) });
  const pct = (S, k) => { const r = S.r[k]; return r && r.max ? clamp(r.v / r.max, 0, 1) : 0; };
  const lowest = (S) => ['o2', 'water', 'food', 'power'].sort((a, b) => pct(S, a) - pct(S, b))[0];
  const activeInc = (S) => S.inc.filter((i) => !i.res && S.t >= i.from);
  const evt = (ty) => (typeof DATA !== 'undefined' && DATA.EVT[ty] ? DATA.EVT[ty] : null);
  const incName = (i) => (evt(i.type) ? evt(i.type).t : T(i.type, i.type));
  const roleName = (r) => (r === 'engineer' ? T('Ana', 'Ana') : r === 'medic' ? T('Mei', 'Mei') : r === 'scientist' ? T('Leo', 'Leo') : r === 'agri' ? T('Bruno', 'Bruno') : T('el comandante', 'the commander'));

  /* ---------- Enlace ---------- */
  /** Calidad de la señal (0–1) y estado: stable · weak · interf · none. Depende de la antena, la energía, las tormentas, el polvo y, en la expedición, de la posición. */
  function link(S) {
    const M = S.mods || {}, why = []; let q = 1;
    const comms = S.sys.comms ? S.sys.comms.h / 100 : 1, dust = S.scen === 'mars' && S.inc.some((i) => !i.res && i.type === 'dust_storm' && S.t >= i.from);
    if (M.commsDown) return { st: 'none', q: 0, why: ['antenna'] };
    q *= 0.15 + 0.85 * comms * comms; if (comms < 0.7) why.push('damage');
    const pw = S.d && S.d.power != null ? S.d.power : 1; if (pw < 0.12) { q *= 0.4; why.push('power'); }
    let interf = false;
    if (M.spe > 0) { q *= 0.55; interf = true; why.push('storm'); }
    if (dust) { q *= 0.7; interf = true; why.push('dust'); }
    if (S.ex && S.ex.suit && S.ex.suit.on && S.ex.out && S.ex.pos && typeof Ex !== 'undefined') {
      const sg = Ex.signal(S, S.ex.pos[0], S.ex.pos[1]); q = Math.min(q, 0.1 + 0.9 * sg); if (sg < 0.5) why.push('distance');
      if (Ex.env(S, S.ex.pos[0], S.ex.pos[1]).burst > 0.5) interf = true;
    }
    q = clamp(q, 0, 1);
    const st = q < 0.08 ? 'none' : interf && q < 0.8 ? 'interf' : q < 0.5 ? 'weak' : 'stable';
    return { st, q, why };
  }
  /** Retraso real de la señal (solo para mostrarlo) y retraso comprimido del juego. */
  function delays(S, simhPerS) {
    const e = ensure(S), realSec = S.scen === 'moon' ? 1.3 : S.lightMin * 60, gameH = Sim.oneWay(S) * e.scale, k = simhPerS || 0.4;
    return { realSec, gameH, gameRealSec: gameH / k, dist: S.scen === 'moon' ? 384400 : Math.round(S.lightMin * 60 * 299792) };
  }
  function status(S) {
    const e = ensure(S), L = link(S), pend = e.out.length, recent = S.t - e.recvT < 3 && totalUnread(S) > 0;
    let main = L.st; if (L.st === 'stable' || L.st === 'weak') { if (recent) main = 'received'; else if (pend) main = L.st === 'weak' ? 'weak' : 'pending'; }
    return { main, link: L, pend, unread: totalUnread(S) };
  }
  const totalUnread = (S) => { const u = ensure(S).unread; let n = 0; for (const k in u) n += u[k]; return n; };

  /* ---------- Informe de misión (datos reales) ---------- */
  function buildReport(S) {
    const adv = !!S.adv, plants = Sim.plantsList(S), pests = plants.filter((x) => x.p.pest).length, avgHp = plants.length ? plants.reduce((a, x) => a + x.p.hp, 0) / plants.length : 0, avgM = plants.length ? plants.reduce((a, x) => a + x.p.moist, 0) / plants.length : 0;
    const act = activeInc(S), done = S.sampleList.filter((x) => x.an === 'done').length, basePend = S.sampleList.filter((x) => x.an === 'pending' && (!x.loc || x.loc === 'base')).length, field = S.sampleList.filter((x) => x.loc === 'hand' || x.loc === 'rover').length;
    const net = (S.pw && S.pw.gen != null) ? (S.pw.gen || 0) - (S.pw.demand || 0) : 0, maxD = S.st.maxDose;
    const data = { power: pct(S, 'power'), o2: pct(S, 'o2'), water: pct(S, 'water'), food: pct(S, 'food'), shield: S.r.rad.v, dose: maxD / S.limit, plants: plants.length, pests, avgHp, avgM, well: S.r.well.v, morale: S.morale, rest: S.rest, done, basePend, field, sci: S.science, inc: act.map((i) => i.type), net, t: S.t };
    const line = (k, es) => { const p = Math.round(pct(S, k) * 100); return adv ? (es ? RESN[k].es : RESN[k].en).replace(/^./, (c) => c.toUpperCase()) + ': ' + nf(S.r[k].v, k === 'power' ? 0 : 1, es) + ' ' + RESU[k] + ' (' + p + ' %)' : (es ? RESN[k].es : RESN[k].en).replace(/^./, (c) => c.toUpperCase()) + ' ' + p + ' %'; };
    const lines = both((es) => [line('power', es) + (adv ? ' · ' + (es ? 'balance ' : 'balance ') + nf(net, 1, es) + ' kW' : ''), line('o2', es), line('water', es), line('food', es),
      (es ? 'Protección contra la radiación: ' : 'Radiation protection: ') + Math.round(S.r.rad.v) + ' %' + (adv ? ' · ' + (es ? 'dosis máxima ' : 'peak dose ') + nf(maxD, 1, es) + ' / ' + S.limit + ' mSv' : ''),
      (es ? 'Cultivos: ' : 'Crops: ') + plants.length + (es ? ' plantas' : ' plants') + (adv ? ', ' + (es ? 'salud media ' : 'mean health ') + Math.round(avgHp) + ' %, ' + (es ? 'humedad media ' : 'mean moisture ') + Math.round(avgM) + ' %' : '') + (pests ? ', ' + pests + (es ? ' con plaga' : ' with pests') : ''),
      (es ? 'Tripulación: ' : 'Crew: ') + (es ? 'bienestar ' : 'wellbeing ') + Math.round(S.r.well.v) + ' %, ' + (es ? 'ánimo ' : 'morale ') + Math.round(S.morale) + ' %' + (adv ? ', ' + (es ? 'descanso ' : 'rest ') + Math.round(S.rest) + ' %' : ''),
      (es ? 'Investigaciones: ' : 'Research: ') + done + (es ? ' análisis hechos, ' : ' analyses done, ') + basePend + (es ? ' por analizar' : ' to analyze') + (field ? ', ' + field + (es ? ' aún fuera' : ' still outside') : '') + (adv ? ', ' + S.science + (es ? ' pts de ciencia' : ' science pts') : ''),
      (es ? 'Averías activas: ' : 'Active faults: ') + (act.length ? act.map((i) => (es ? incName(i).es : incName(i).en)).join(', ') : (es ? 'ninguna' : 'none'))]);
    return { lines, data };
  }
  /** Observaciones de la Tierra sobre un informe (reglas sobre los datos enviados). */
  function evalReport(S, d) {
    const notes = [];
    for (const k of ['o2', 'water', 'food', 'power']) if (d[k] < 0.4) notes.push(T('Vigilen ' + RESN[k].es + ': ' + Math.round(d[k] * 100) + ' %.', 'Watch ' + RESN[k].en + ': ' + Math.round(d[k] * 100) + '%.'));
    if (d.net < 0 && d.power < 0.6) notes.push(T('El balance de energía es negativo: reduzcan consumos.', 'The power balance is negative: reduce loads.'));
    if (d.dose >= 0.6) notes.push(T('La dosis acumulada es alta: limiten las salidas y usen el refugio.', 'Accumulated dose is high: limit outings and use the shelter.'));
    if (d.pests > 0) notes.push(T('Hay plagas en el invernadero: inspeccionen las plantas.', 'There are pests in the greenhouse: inspect the plants.'));
    if (d.inc.length) notes.push(T('Prioricen las averías activas.', 'Prioritize the active faults.'));
    if (d.basePend > 0) notes.push(T('Tienen muestras sin analizar: pasen al laboratorio.', 'You have unanalyzed samples: go to the lab.'));
    return notes.length ? notes : [T('Todo dentro de lo previsto.', 'Everything is within expectations.')];
  }

  /* ---------- Catálogo de mensajes ---------- */
  const incFix = (S, id) => (id ? S.inc.find((i) => i.id === id && !i.res) : null) || activeInc(S).filter((i) => i.fix).sort((a, b) => (b.sev === 'crit') - (a.sev === 'crit'))[0] || null;
  const firstFree = (S) => S.sampleList.find((x) => x.an === 'done' && !x.sent);
  const crewDose = (S) => Math.max.apply(null, S.crew.map((c) => c.dose)) / S.limit;
  const cd = (S, k, h) => (ensure(S).cool[k] || -999) + h <= S.t;
  const INT = {
    status: { ch: 'control', n: T('Enviar informe de estado', 'Send status report'), j: T('Contar cómo estamos', 'Tell how we are'), avail: () => null },
    forecast: { ch: 'control', n: T('Pedir pronóstico del clima espacial', 'Request space-weather forecast'), j: T('¿Viene una tormenta?', 'Is a storm coming?'), avail: () => null },
    route: { ch: 'control', n: T('Pedir una ruta segura para el rover', 'Request a safe route for the rover'), j: T('Pedir una ruta segura', 'Ask for a safe route'), avail: () => null },
    supplies: { ch: 'control', n: T('Solicitar suministros', 'Request supplies'), j: T('Pedir más provisiones', 'Ask for more supplies'),
      avail: (S) => { if (!cd(S, 'sup', 36)) return T('Ya hay un envío reciente: espera.', 'A shipment was just requested: wait.'); return pct(S, lowest(S)) > 0.55 ? T('Las reservas están bien: Tierra no enviaría nada.', 'Reserves are fine: Earth would not send anything.') : null; } },
    confirm: { ch: 'control', n: T('Confirmar la última orden', 'Confirm the latest order'), j: T('Decir «entendido»', 'Say "understood"'), avail: (S) => (ensure(S).orders.length ? null : T('No hay órdenes pendientes.', 'There are no pending orders.')) },
    eng_help: { ch: 'eng', n: T('Pedir procedimiento de reparación', 'Request repair procedure'), j: T('Pedir ayuda con la avería', 'Ask for help with the fault'), avail: (S) => (incFix(S) ? null : T('No hay ninguna avería que reparar.', 'There is no fault to repair.')) },
    eng_power: { ch: 'eng', n: T('Consultar el estado de energía', 'Ask about the power state'), j: T('Preguntar por la energía', 'Ask about power'), avail: () => null },
    eng_parts: { ch: 'eng', n: T('Solicitar repuestos', 'Request spare parts'), j: T('Pedir piezas de repuesto', 'Ask for spare parts'), avail: (S) => (!cd(S, 'part', 30) ? T('Ya hay un envío de repuestos en camino.', 'A parts shipment is already on its way.') : S.parts > 1 ? T('Aún tienen repuestos.', 'You still have spare parts.') : null) },
    med_check: { ch: 'med', n: T('Revisar soporte vital y salud', 'Review life support and health'), j: T('Revisar el aire y la salud', 'Check air and health'), avail: (S) => (!cd(S, 'med', 10) ? T('Medicina ya revisó esto hace poco.', 'Medicine just reviewed this.') : null) },
    sci_sample: { ch: 'sci', n: T('Enviar datos de una muestra', 'Send sample data'), j: T('Enviar una muestra a la Tierra', 'Send a sample to Earth'), avail: (S) => (firstFree(S) ? null : T('No hay análisis nuevos que enviar.', 'There are no new analyses to send.')) },
    sci_info: { ch: 'sci', n: T('Consultar información científica', 'Ask for science information'), j: T('Preguntar algo de ciencia', 'Ask a science question'), avail: () => null },
    agri_check: { ch: 'agri', n: T('Informar de los sensores del invernadero', 'Report greenhouse sensors'), j: T('Contar cómo están las plantas', 'Tell how plants are'), avail: (S) => (Sim.plantsList(S).length ? null : T('No hay plantas sembradas.', 'No plants are growing.')) },
    emerg_report: { ch: 'emerg', n: T('Informar de una emergencia', 'Report an emergency'), j: T('Avisar de un peligro', 'Warn about a danger'), avail: (S) => (emergency(S) ? null : T('No hay ninguna emergencia detectada.', 'No emergency detected.')) },
    emerg_eva: { ch: 'emerg', n: T('Pedir recogida en el exterior', 'Request pickup outside'), j: T('Pedir que me recojan', 'Ask to be picked up'), avail: (S) => (S.ex && S.ex.suit && S.ex.suit.on && S.ex.out ? null : T('Solo cuando hay alguien fuera con el traje.', 'Only when someone is outside in a suit.')) }
  };
  const emergency = (S) => activeInc(S).find((i) => i.sev === 'crit' || i.sev === 'warn') || (S.mods && S.mods.spe > 0 ? { type: 'solar_storm', id: -1, sev: 'crit' } : null) || (['o2', 'water', 'food', 'power'].some((k) => pct(S, k) < 0.2) ? { type: '_res', id: -2, sev: 'crit' } : null);
  const WHO = { eng_help: 'engineer', eng_power: 'engineer', eng_parts: 'engineer', med_check: 'medic', sci_sample: 'scientist', sci_info: 'scientist', agri_check: 'agri' };
  const speaker = (id) => WHO[id] || 'commander';
  /** Opciones disponibles de un canal (con el motivo si no se pueden usar). */
  function options(S, ch) {
    return Object.keys(INT).filter((k) => INT[k].ch === ch).map((k) => { const why = INT[k].avail(S); return { id: k, n: INT[k].n, j: INT[k].j, ok: !why, why }; });
  }
  /** Texto que dice quien transmite (con datos reales de la simulación). */
  function outText(S, id, p) {
    const adv = !!S.adv, E = S.ex;
    switch (id) {
      case 'status': { const r = buildReport(S); return both((es) => (es ? 'Control Tierra, enviamos el informe de estado. ' : 'Earth Control, sending the status report. ') + r.lines[es ? 'es' : 'en'].slice(0, adv ? 8 : 4).join('. ') + '.'); }
      case 'forecast': return T('Control Tierra, solicitamos el pronóstico del clima espacial para las próximas horas.', 'Earth Control, requesting the space-weather forecast for the coming hours.');
      case 'route': return T('Control Tierra, solicitamos una ruta segura para el rover con los peligros marcados.', 'Earth Control, requesting a safe rover route with hazards marked.');
      case 'supplies': { const k = lowest(S), pc = Math.round(pct(S, k) * 100); return both((es) => (es ? 'Control Tierra, solicitamos suministros. Nuestra reserva más baja es ' + RESN[k].es + ' al ' + pc + ' %.' : 'Earth Control, requesting supplies. Our lowest reserve is ' + RESN[k].en + ' at ' + pc + '%.')); }
      case 'confirm': return T('Control Tierra, recibido y confirmado. Ejecutamos la orden.', 'Earth Control, received and confirmed. Carrying out the order.');
      case 'eng_help': { const i = incFix(S, p && p.inc); const n = i ? incName(i) : T('una avería', 'a fault'); return both((es) => (es ? 'Control Tierra, tenemos una anomalía: ' + n.es + '. Solicito información sobre el procedimiento de reparación.' : 'Earth Control, we have an anomaly: ' + n.en + '. Requesting information on the repair procedure.')); }
      case 'eng_power': return both((es) => (es ? 'Control Tierra, la energía está al ' + Math.round(pct(S, 'power') * 100) + ' %' + (adv ? ' y el balance es ' + nf((S.pw.gen || 0) - (S.pw.demand || 0), 1, true) + ' kW' : '') + '. Solicito recomendaciones.' : 'Earth Control, power is at ' + Math.round(pct(S, 'power') * 100) + '%' + (adv ? ' and the balance is ' + nf((S.pw.gen || 0) - (S.pw.demand || 0), 1, false) + ' kW' : '') + '. Requesting recommendations.'));
      case 'eng_parts': return T('Control Tierra, nos quedan pocos repuestos. Solicitamos el envío de piezas.', 'Earth Control, we are low on spare parts. Requesting a parts shipment.');
      case 'med_check': return both((es) => (es ? 'Control Tierra, necesitamos revisar las condiciones del soporte vital. Oxígeno al ' + Math.round(pct(S, 'o2') * 100) + ' %, dosis máxima de la tripulación ' + Math.round(crewDose(S) * 100) + ' % del límite' + (E && E.suit && E.suit.on ? ', y hay una salida en curso con ' + nf(E.suit.rad, 1, true) + ' mSv de juego' : '') + '.' : 'Earth Control, we need to review life-support conditions. Oxygen at ' + Math.round(pct(S, 'o2') * 100) + '%, peak crew dose ' + Math.round(crewDose(S) * 100) + '% of the limit' + (E && E.suit && E.suit.on ? ', and an outing is underway at ' + nf(E.suit.rad, 1, false) + ' game mSv' : '') + '.'));
      case 'sci_sample': { const r = firstFree(S); return both((es) => (es ? 'Control Tierra, hemos obtenido una nueva muestra: ' + r.id + (r.name ? ', ' + r.name.es : '') + '. Enviaremos los datos para su análisis.' : 'Earth Control, we have a new sample: ' + r.id + (r.name ? ', ' + r.name.en : '') + '. We will send the data for analysis.')); }
      case 'sci_info': return T('Control Tierra, solicitamos información científica sobre lo que estamos estudiando.', 'Earth Control, requesting scientific information about what we are studying.');
      case 'agri_check': { const pl = Sim.plantsList(S), avgM = pl.reduce((a, x) => a + x.p.moist, 0) / Math.max(1, pl.length), pests = pl.filter((x) => x.p.pest).length; return both((es) => (es ? 'Control Tierra, los sensores del invernadero muestran humedad media del ' + Math.round(avgM) + ' %' + (pests ? ' y una alteración: sospechamos plagas en ' + pests + ' plantas' : ' sin alteraciones graves') + '.' : 'Earth Control, greenhouse sensors show mean moisture of ' + Math.round(avgM) + '%' + (pests ? ' and an alteration: we suspect pests in ' + pests + ' plants' : ' with no serious alterations') + '.')); }
      case 'emerg_report': { const i = emergency(S); const n = i && i.type !== '_res' ? (i.type === 'solar_storm' ? T('tormenta solar', 'solar storm') : incName(i)) : T('reservas críticas', 'critical reserves'); return both((es) => (es ? 'Control Tierra, informamos de una emergencia: ' + n.es + '. Solicitamos instrucciones.' : 'Earth Control, we report an emergency: ' + n.en + '. Requesting instructions.')); }
      case 'emerg_eva': return T('Control Tierra, solicito asistencia: necesito que me recojan en el exterior.', 'Earth Control, requesting assistance: I need to be picked up outside.');
    }
    return T('Control Tierra, cambio.', 'Earth Control, over.');
  }

  /* ---------- Envío, tránsito y respuesta ---------- */
  function addHist(S, o) { const e = ensure(S); o.id = e.seq++; o.t = S.t; e.hist.push(o); if (e.hist.length > 80) e.hist.splice(0, e.hist.length - 80); return o; }
  function send(S, id, p) {
    const e = ensure(S), it = INT[id]; if (!it) return { ok: false, err: 'intent' };
    const why = it.avail(S); if (why) return { ok: false, err: 'avail', why };
    p = Object.assign({}, p || {});
    if (id === 'sci_sample' && !p.sid) p.sid = firstFree(S).id;
    if (id === 'eng_help' && !p.inc) p.inc = incFix(S).id;
    if (id === 'emerg_report') { const em = emergency(S); p.ty = em ? em.type : null; }
    const txt = outText(S, id, p), who = speaker(id), L = link(S);
    const m = { id: e.seq++, ch: it.ch, intent: id, who, txt, sentT: S.t, p: p || {}, st: L.st === 'none' ? 'queued' : 'transit', arriveT: 0, replyT: 0 };
    if (id === 'status') { const r = buildReport(S); m.rep = r.data; m.repLines = r.lines; }
    m.snap = { t: S.t, low: lowest(S), lowPct: pct(S, lowest(S)) };
    if (id === 'supplies') e.cool.sup = S.t; if (id === 'eng_parts') e.cool.part = S.t; if (id === 'med_check') e.cool.med = S.t;
    if (m.st === 'transit') m.arriveT = S.t + legDelay(S, L);
    e.out.push(m); e.tx++;
    addHist(S, { dir: 'out', ch: it.ch, who, text: txt, ref: m.id, st: m.st });
    Sim.log(S, 'info', 'el.sent', { id: m.id, ch: it.ch, intent: id });
    return { ok: true, msg: m };
  }
  const legDelay = (S, L) => Sim.oneWay(S) * ensure(S).scale * (L.st === 'interf' ? 1.8 : L.st === 'weak' ? 1.4 : 1);
  function setStatus(S, m, st) { const h = ensure(S).hist.find((x) => x.ref === m.id && x.dir === 'out'); if (h) h.st = st; }

  /* Respuestas de la Tierra (a partir de los datos que le llegaron) */
  function reply(S, m) {
    const adv = !!S.adv, I = m.intent;
    switch (I) {
      case 'status': { const notes = evalReport(S, m.rep); return { txt: both((es) => (es ? 'Informe recibido. ' : 'Report received. ') + notes.map((n) => n[es ? 'es' : 'en']).join(' ')), ok: true }; }
      case 'forecast': {
        const f = S.inc.filter((i) => !i.res && S.t < i.from && S.t >= m.sentT - 1e-9 ? true : (!i.res && S.t < i.from)).filter((i) => (i.from - S.t) < 72).map((i) => ({ id: i.id, type: i.type, inH: i.from - S.t }));
        const env = f.filter((x) => evt(x.type) && ['solar_storm', 'power_drop', 'dust_storm', 'comms_blackout'].includes(x.type));
        return { txt: both((es) => env.length ? (es ? 'Prevemos: ' : 'Forecast: ') + env.map((x) => (es ? evt(x.type).t.es : evt(x.type).t.en) + (es ? ' en unas ' : ' in about ') + Math.max(1, Math.round(x.inH)) + ' h').join('; ') + (es ? '. Preparen refugio y energía.' : '. Prepare shelter and power.') : (es ? 'No vemos eventos importantes en las próximas 72 horas.' : 'We see no major events in the next 72 hours.')), fc: env, ok: true };
      }
      case 'route': { const E = S.ex, p = typeof Field !== 'undefined' && Field.G ? Field.G.pois.find((q) => !(E && E.visited[q.id])) : null; return { txt: both((es) => es ? 'Enviamos una ruta segura con los peligros marcados' + (p ? ': ' + p.n.es + ' queda señalado en su radar' : '') + '.' : 'We are sending a safe route with hazards marked' + (p ? ': ' + p.n.en + ' is flagged on your radar' : '') + '.'), poi: p && p.id, ok: true }; }
      case 'supplies': {
        const k = m.snap.low, pc = m.snap.lowPct; if (pc > 0.55) return { txt: T('Sus reservas están por encima del 55 %: no enviaremos carga todavía.', 'Your reserves are above 55%: we will not send cargo yet.'), ok: false };
        const amt = Math.round(S.r[k].max * 0.25 * (S.scen === 'mars' ? 0.8 : 1)), eta = (S.scen === 'moon' ? 14 : 30);
        return { txt: both((es) => (es ? 'Aprobado: enviamos ' + amt + ' ' + RESU[k] + ' de ' + RESN[k].es + '. Llegarán en unas ' + eta + ' horas de juego.' : 'Approved: sending ' + amt + ' ' + RESU[k] + ' of ' + RESN[k].en + '. It arrives in about ' + eta + ' game hours.')), k, amt, eta, ok: true };
      }
      case 'confirm': return { txt: T('Confirmación recibida. Gracias, equipo.', 'Confirmation received. Thank you, team.'), ok: true };
      case 'eng_help': {
        const i = incFix(S, m.p && m.p.inc); if (!i) return { txt: T('No vemos esa avería ya: parece resuelta.', 'We no longer see that fault: it seems resolved.'), ok: false };
        const ev = evt(i.type), D = typeof NPCDATA !== 'undefined' && NPCDATA.DIAG[i.type], ok = Sim.DIAG_OK[i.type];
        const cause = D && ok != null ? D.opts[ok] : null;
        return { txt: both((es) => (es ? 'Procedimiento: ' : 'Procedure: ') + (cause ? (es ? 'la causa más probable es «' + cause.es + '». ' : 'the most likely cause is "' + cause.en + '". ') : '') + (ev ? (es ? ev.act.es : ev.act.en) : '')), inc: i.id, ok: true };
      }
      case 'eng_power': { const pc = Math.round(pct(S, 'power') * 100), net = (S.pw.gen || 0) - (S.pw.demand || 0); return { txt: both((es) => (es ? 'Con la energía al ' + pc + ' %: ' : 'With power at ' + pc + '%: ') + (pc < 35 || net < 0 ? (es ? 'activen el modo ahorro, apaguen luces del invernadero que no hagan falta y bajen la reserva de calefacción.' : 'enable saving mode, switch off unneeded greenhouse lights and lower heating demand.') : (es ? 'van bien. Mantengan el reactor y orienten los paneles.' : 'you are fine. Keep the reactor steady and aim the panels.'))), ok: true }; }
      case 'eng_parts': return { txt: T('Aprobado: enviamos un repuesto. Llegará en unas 20 horas de juego.', 'Approved: sending a spare part. It arrives in about 20 game hours.'), part: 1, ok: true };
      case 'med_check': {
        const dose = crewDose(S), o2 = pct(S, 'o2'), adviceShel = dose >= 0.6;
        return { txt: both((es) => (es ? 'Medicina: ' : 'Medicine: ') + (o2 < 0.4 ? (es ? 'el oxígeno es bajo; revisen el reciclaje de aire y el agua. ' : 'oxygen is low; check air recycling and water. ') : (es ? 'el soporte vital es estable. ' : 'life support is stable. ')) + (adviceShel ? (es ? 'La dosis de radiación es alta: limiten las salidas y usen el refugio. ' : 'Radiation dose is high: limit outings and use the shelter. ') : (es ? 'La dosis es aceptable. ' : 'The dose is acceptable. ')) + (adv ? (es ? '(dosis máxima ' + Math.round(dose * 100) + ' % del límite)' : '(peak dose ' + Math.round(dose * 100) + '% of limit)') : '')), ok: true, shel: adviceShel };
      }
      case 'sci_sample': {
        const r = S.sampleList.find((x) => x.id === (m.p && m.p.sid)) || null; const k = r ? r.kind || r.cat : 'regolith', R = typeof Ex !== 'undefined' && Ex.RES[k] ? Ex.RES[k][S.scen] : null;
        return { txt: both((es) => (es ? 'Ciencia: datos recibidos' + (r ? ' de ' + r.id : '') + '. ' : 'Science: data received' + (r ? ' for ' + r.id : '') + '. ') + (R ? (es ? R.es : R.en) : '') + (r && r.int >= 3 ? (es ? ' Es un hallazgo de interés alto: gracias.' : ' This is a high-interest find: thank you.') : '')), sid: r && r.id, ok: true };
      }
      case 'sci_info': return { txt: sciFact(S, m), ok: true, fact: m.p && m.p.fact };
      case 'agri_check': {
        const pl = Sim.plantsList(S), pests = pl.filter((x) => x.p.pest).length, avgM = pl.reduce((a, x) => a + x.p.moist, 0) / Math.max(1, pl.length);
        return { txt: both((es) => (es ? 'Agricultura: ' : 'Agriculture: ') + (pests ? (es ? 'es probable que haya plagas; inspeccionen las plantas marcadas y limpien. ' : 'pests are likely; inspect the flagged plants and clean up. ') : '') + (avgM < 40 ? (es ? 'La humedad es baja: rieguen. ' : 'Moisture is low: water them. ') : avgM > 80 ? (es ? 'Hay exceso de agua: reduzcan el riego. ' : 'There is excess water: reduce irrigation. ') : (es ? 'La humedad es adecuada. ' : 'Moisture is adequate. '))), ok: true, pests };
      }
      case 'emerg_report': {
        const ty = m.p && m.p.ty;
        const proto = { solar_storm: T('Activen el protocolo de tormenta y refúgiense en la zona de rayas amarillas.', 'Turn on the storm protocol and take shelter in the yellow-striped zone.'), water_fail: T('Cierren el circuito afectado y reparen el cableado.', 'Isolate the affected loop and repair the wiring.'), pressure_leak: T('Sellen la fuga y vigilen la presión; si baja mucho, evacúen.', 'Seal the leak and watch pressure; evacuate if it drops too far.'), power_drop: T('Ahorren energía y esperen a que pase el evento.', 'Save power and wait for the event to pass.'), dust_storm: T('Ahorren energía y limpien los paneles al terminar.', 'Save power and clean the panels afterwards.'), comms_blackout: T('Repitan la reparación de la antena; actúen con protocolos autónomos.', 'Repair the antenna; follow autonomous protocols.'), _res: T('Reduzcan consumos y pidan suministros.', 'Cut consumption and request supplies.') }[ty] || T('Sigan los protocolos y vigilen.', 'Follow protocols and monitor.');
        return { txt: both((es) => (es ? 'Emergencias: recibido. ' : 'Emergencies: received. ') + (es ? proto.es : proto.en)), ty, ok: true };
      }
      case 'emerg_eva': return { txt: T('Recibido: enviamos el equipo de recogida. Mantengan la posición y ahorren aire.', 'Received: sending the pickup team. Hold position and conserve air.'), ok: true };
    }
    return { txt: T('Recibido.', 'Received.'), ok: true };
  }
  const FACTS = {
    moon: [T('En la Luna casi no hay atmósfera: por eso se ven tantos cráteres y la temperatura cambia más de 250 grados entre el día y la noche.', 'The Moon has almost no atmosphere: that is why there are so many craters and temperature swings over 250 degrees between day and night.'), T('En cráteres en sombra permanente cerca del polo sur puede haber hielo de agua: es un recurso para beber, respirar y fabricar combustible.', 'Permanently shadowed craters near the south pole may hold water ice: a resource for drinking, breathing and making fuel.'), T('El regolito lunar es polvo afilado y electrostático; se pega a los trajes y daña las juntas.', 'Lunar regolith is sharp, electrostatic dust; it clings to suits and wears seals.')],
    mars: [T('Marte tiene una atmósfera muy fina, de dióxido de carbono: no se puede respirar y apenas frena la radiación.', 'Mars has a very thin carbon-dioxide atmosphere: it cannot be breathed and barely slows radiation.'), T('Las tormentas de polvo marcianas pueden cubrir el planeta durante semanas y reducen la luz de los paneles solares.', 'Martian dust storms can cover the planet for weeks and cut sunlight to solar panels.'), T('Las arcillas y los sedimentos en capas indican que hubo agua líquida en el pasado de Marte.', 'Clays and layered sediments show Mars once had liquid water.')]
  };
  function sciFact(S, m) {
    const e = ensure(S), last = S.sampleList.filter((x) => x.site).slice(-1)[0], R = last && typeof Ex !== 'undefined' && Ex.RES[last.kind] ? Ex.RES[last.kind][S.scen] : null;
    const idx = Math.min(FACTS[S.scen].length - 1, Object.keys(e.facts).length % FACTS[S.scen].length);
    if (m.p) m.p.fact = (m.p.fact == null ? idx : m.p.fact);
    const f = FACTS[S.scen][m.p && m.p.fact != null ? m.p.fact : idx];
    return both((es) => (es ? 'Ciencia: ' : 'Science: ') + (R && last ? (es ? 'sobre su última muestra de campo (' + last.id + '): ' + R.es + ' ' : 'about your latest field sample (' + last.id + '): ' + R.en + ' ') : '') + (es ? f.es : f.en));
  }
  /** Consecuencias reales de que llegue la respuesta. */
  function effect(S, m, r) {
    const e = ensure(S), I = m.intent, adv = S.adv;
    if (!r.ok) return;
    if (I === 'status') { e.rep.n++; e.rep.last = m.rep; const day = Math.floor(S.t / 24); if (e.rep.day !== day) { e.rep.day = day; S.pts += 8; } Sim.campFlag(S, 'earth_report'); if (S.ex && S.ex.f) S.ex.f.reported2 = (S.ex.f.reported2 || 0) + 1; }
    if (I === 'forecast') { e.fc = r.fc || []; for (const x of e.fc) { const inc = S.inc.find((q) => q.id === x.id); if (inc) inc.fcRevealed = true; } }
    if (I === 'route') { S.sys.rover.hint = true; if (S.m[7].st === 'active') S.m[7].data.comm = true; if (r.poi && S.ex) S.ex.disc[r.poi] = true; }
    if (I === 'supplies') e.sup.push({ k: r.k, amt: r.amt, at: S.t + r.eta });
    if (I === 'eng_parts') e.sup.push({ k: 'part', amt: 1, at: S.t + 20 });
    if (I === 'confirm') { const o = e.orders.shift(); if (o && o.k === 'shelter') S.proto = true; S.morale = clamp(S.morale + 2, 0, 100); S.pts += 3; }
    if (I === 'eng_help') { const i = S.inc.find((q) => q.id === r.inc); if (i && !i.res) { i.diag = 1; i.guided = true; i.prog = clamp(i.prog + 15, 0, 100); } }
    if (I === 'med_check') { S.morale = clamp(S.morale + 2, 0, 100); if (r.shel) e.orders.push({ k: 'shelter', t: S.t }); }
    if (I === 'sci_sample') { const x = S.sampleList.find((q) => q.id === r.sid); if (x && !x.sent) { x.sent = true; S.science += 2 + (x.int || 0); S.pts += 4; } }
    if (I === 'sci_info') { const k = S.scen + (r.fact == null ? 0 : r.fact); if (!e.facts[k]) { e.facts[k] = 1; S.science += 1; } }
    if (I === 'agri_check') { for (const x of Sim.plantsList(S)) if (x.p.pest) x.p.pestKnown = true; }
    if (I === 'emerg_report') {
      const map = { solar_storm: 3, water_fail: 1, power_drop: 2, dust_storm: 2 }; const mid = map[r.ty];
      if (mid) { const sm = Sim.startMission(S, mid); if (sm && sm.ok) Sim.log(S, 'ok', 'el.mission', { id: mid }); }
      if (r.ty === 'solar_storm') e.orders.push({ k: 'shelter', t: S.t });
      for (const i of activeInc(S)) i.reported = true;
    }
    if (I === 'emerg_eva') e.evac = true;
  }
  const typeOf = (ch) => ch;

  /* ---------- Paso de simulación ---------- */
  function step(S, M) {
    const e = ensure(S), L = link(S);
    // el estado del enlace cambia: recuperación y pérdida
    if (L.st !== e.prevLink) {
      const bad = (x) => x === 'none' || x === 'weak' || x === 'interf';
      if (bad(e.prevLink) && !bad(L.st)) { addHist(S, { dir: 'sys', ch: 'control', who: 'system', text: T('Señal recuperada: enlace estable con la Tierra.', 'Signal recovered: stable link with Earth.') }); Sim.log(S, 'ok', 'el.restored', {}); }
      else if (!bad(e.prevLink) && bad(L.st)) { addHist(S, { dir: 'sys', ch: 'control', who: 'system', text: L.st === 'none' ? T('Enlace perdido: los mensajes quedan en cola.', 'Link lost: messages are queued.') : T('La señal empeora.', 'The signal is degrading.') }); Sim.log(S, 'warn', 'el.lost', { st: L.st, why: L.why[0] || '' }); }
      e.prevLink = L.st;
    }
    // daño en equipos exteriores tras una tormenta solar (se repara con mantenimiento)
    if (M && M.spe > 0) e.stormDmg = true;
    else if (e.stormDmg && !(M && M.spe > 0)) { e.stormDmg = false; if (S.sys.comms && S.sys.comms.h > 50) { S.sys.comms.h = Math.max(30, S.sys.comms.h - 45); addHist(S, { dir: 'sys', ch: 'control', who: 'system', text: T('La tormenta dañó equipos exteriores de la antena. Repárenla en el taller (mantenimiento de comunicaciones).', 'The storm damaged exterior antenna equipment. Repair it at the workshop (communications maintenance).') }); Sim.log(S, 'warn', 'el.damage', {}); } }
    // mensajes en vuelo
    for (const m of e.out.slice().sort((a, b) => a.replyT - b.replyT || a.id - b.id)) {
      if (m.st === 'queued') { if (L.st !== 'none') { m.st = 'transit'; m.arriveT = S.t + legDelay(S, L); setStatus(S, m, 'transit'); } continue; }
      if (m.st === 'transit') { if (L.st === 'none') { m.arriveT = Math.max(m.arriveT, S.t + 0.25); continue; } if (S.t >= m.arriveT) { m.st = 'earth'; setStatus(S, m, 'earth'); m.res = reply(S, m); m.replyT = Math.max(S.t + 0.3 + legDelay(S, L), e.lastReply + 0.02); } continue; }
      if (m.st === 'earth') {
        if (L.st === 'none') { m.replyT = Math.max(m.replyT, S.t + 0.25); continue; }
        if (S.t >= m.replyT) {
          e.lastReply = S.t; m.st = 'done'; setStatus(S, m, 'delivered');
          if (m.res) { effect(S, m, m.res); addHist(S, { dir: 'in', ch: m.ch, who: 'earth', desk: DESK[m.ch], text: m.res.txt, ref: m.id, ok: m.res.ok }); e.unread[m.ch] = (e.unread[m.ch] || 0) + 1; e.rx++; e.recvT = S.t; Sim.log(S, m.res.ok ? 'ok' : 'info', 'el.recv', { id: m.id, ch: m.ch, intent: m.intent }); }
        }
      }
    }
    e.out = e.out.filter((m) => m.st !== 'done');
    // entregas de suministros aprobados
    for (const s of e.sup.slice()) if (S.t >= s.at) {
      e.sup.splice(e.sup.indexOf(s), 1);
      if (s.k === 'part') S.parts += s.amt; else S.r[s.k].v = Math.min(S.r[s.k].max, S.r[s.k].v + s.amt);
      addHist(S, { dir: 'sys', ch: 'control', who: 'system', text: s.k === 'part' ? T('Llegó el repuesto aprobado.', 'The approved spare part arrived.') : T('Llegó el cargamento: +' + s.amt + ' ' + RESU[s.k] + ' de ' + RESN[s.k].es + '.', 'Cargo arrived: +' + s.amt + ' ' + RESU[s.k] + ' of ' + RESN[s.k].en + '.') });
      Sim.log(S, 'ok', 'el.supply', { k: s.k, amt: s.amt });
    }
    // avisos espontáneos de la Tierra (solo con enlace) y propuestas de los especialistas
    if (L.st !== 'none') for (const i of S.inc) {
      if (i.res || i.elWarn || S.t >= i.from || i.from - S.t > 30 || !(i.type === 'solar_storm' || i.type === 'dust_storm' || i.type === 'power_drop')) continue;
      i.elWarn = true; const inH = Math.max(1, Math.round(i.from - S.t)), t = evt(i.type) ? evt(i.type).t : T(i.type, i.type);
      const text = both((es) => (es ? 'Alerta de Tierra: ' + t.es + ' en unas ' + inH + ' h. ' : 'Earth alert: ' + t.en + ' in about ' + inH + ' h. ') + (i.type === 'solar_storm' ? (es ? 'Confirmen y activen el protocolo de refugio.' : 'Confirm and activate the shelter protocol.') : (es ? 'Ahorren energía.' : 'Save power.')));
      addHist(S, { dir: 'in', ch: 'emerg', who: 'earth', desk: DESK.emerg, text, ok: true, spont: true }); e.unread.emerg = (e.unread.emerg || 0) + 1; e.rx++; e.recvT = S.t;
      if (i.type === 'solar_storm') e.orders.push({ k: 'shelter', t: S.t });
      Sim.log(S, 'warn', 'el.alert', { type: i.type, inH });
    }
    const PROP = { water_fail: 'eng_help', power_drop: 'eng_help', dust_storm: 'eng_help', wear: 'eng_help', sensor_drift: 'eng_help', thermal_fail: 'eng_help', comms_blackout: 'eng_help', pressure_leak: 'med_check', crop_fail: 'agri_check', solar_storm: 'emerg_report' };
    for (const i of activeInc(S)) if (!i.elProp && PROP[i.type] && e.prop.length < 4 && (i.fix || i.type === 'solar_storm')) { i.elProp = true; const who = typeof NPCDATA !== 'undefined' && NPCDATA.INC_NPC[i.type] || 'engineer'; e.prop.push({ id: e.seq++, intent: PROP[i.type], who: PROP[i.type] === 'emerg_report' ? 'commander' : who === 'commander' ? 'engineer' : who, inc: i.id, t: S.t, why: incName(i) }); Sim.log(S, 'info', 'el.prop', { intent: PROP[i.type] }); }
    for (const x of S.sampleList) if (x.an === 'done' && !x.sent && !x.elProp && e.prop.length < 4) { x.elProp = true; e.prop.push({ id: e.seq++, intent: 'sci_sample', who: 'scientist', sid: x.id, t: S.t, why: T('muestra ' + x.id, 'sample ' + x.id) }); break; }
    e.prop = e.prop.filter((p) => S.t - p.t < 36);
  }
  /** El comandante autoriza una propuesta de un especialista (se transmite con la voz de ese especialista). */
  function accept(S, pid) {
    const e = ensure(S), i = e.prop.findIndex((p) => p.id === pid); if (i < 0) return { ok: false };
    const p = e.prop[i]; e.prop.splice(i, 1);
    return send(S, p.intent, { inc: p.inc, sid: p.sid });
  }
  function dismiss(S, pid) { const e = ensure(S); e.prop = e.prop.filter((p) => p.id !== pid); }
  function markRead(S, ch) { ensure(S).unread[ch] = 0; }
  function setScale(S, k) { const e = ensure(S); e.scale = SCALES.includes(k) ? k : 1; }
  /** Petición de recogida pendiente (la consume la interfaz de expedición). */
  function takeEvac(S) { const e = ensure(S); const v = e.evac; e.evac = false; return v; }

  return { CH, DESK, INT, SCALES, def, ensure, link, delays, status, buildReport, options, outText, send, step, accept, dismiss, markRead, setScale, takeEvac, speaker, totalUnread, legDelay, emergency, lowest, RESN, RESU };
})();
