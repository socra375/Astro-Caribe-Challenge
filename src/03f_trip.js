/* =====================================================================
   TRIP — viaje espacial previo al aterrizaje (motor puro, sin dibujo).
   Encendido en secuencia lógica, navegación con correcciones, soporte vital
   con eventos, comunicación con Tierra y consecuencias pequeñas que nunca
   bloquean la campaña. Todos los valores son SIMULADOS (educativos).
   ===================================================================== */
const Trip = (function () {
  const T = (es, en) => ({ es, en });
  const SYS = ['power', 'life', 'nav', 'comms', 'safety'];
  const SYS_T = { power: T('Energía principal', 'Main power'), life: T('Soporte vital', 'Life support'), nav: T('Computadora de navegación', 'Navigation computer'), comms: T('Comunicaciones', 'Communications'), safety: T('Sistemas de seguridad', 'Safety systems') };
  const PRE = { power: [], life: ['power'], nav: ['power'], comms: ['power', 'nav'], safety: ['power', 'life', 'nav', 'comms'] };
  const WHO = { power: 'engineer', life: 'medic', nav: 'scientist', comms: 'commander', safety: 'commander' };
  const WHAT = {
    power: T('La energía principal alimenta todo lo demás. Por eso siempre se enciende primero.', 'Main power feeds everything else. That is why it always comes first.'),
    life: T('El soporte vital mantiene aire respirable, presión y temperatura dentro de la nave.', 'Life support keeps breathable air, pressure and temperature inside the ship.'),
    nav: T('La computadora de navegación sabe hacia dónde apunta la nave y hacia dónde debe ir.', 'The navigation computer knows where the ship points and where it must go.'),
    comms: T('Las comunicaciones nos unen con Control Tierra. Necesitan la navegación para apuntar la antena.', 'Communications link us to Earth Control. They need navigation to aim the antenna.'),
    safety: T('Los sistemas de seguridad se activan al final, cuando todo lo demás está listo para protegerlo.', 'Safety systems come last, once everything else is ready to be protected.')
  };
  const T_NEED = { es: 'Todavía no: primero hace falta ', en: 'Not yet: first you need ' };
  const SAFETY_CHECK = [T('Cinturones y asientos', 'Belts and seats'), T('Compuertas selladas', 'Hatches sealed'), T('Presión de cabina', 'Cabin pressure'), T('Trayectoria de ascenso', 'Ascent path')];

  /* ---------- Navegación (valores simulados) ---------- */
  const NAV_TOL = 5; // grados
  const angdiff = (a, b) => { let d = ((b - a + 540) % 360) - 180; return d; };
  /** Rumbo objetivo simulado según el destino. */
  const bearing = (sc) => (sc === 'mars' ? 112 : 68);
  /** Tamaño de la desviación: Control Tierra la reduce si se le reportó el estado. */
  const devSize = (n, reported, adv) => { const base = [16, -22][n % 2] * (adv ? 1.15 : 1); return Math.round(base * (reported ? 0.7 : 1)); };

  /* ---------- Soporte vital (valores simulados) ---------- */
  const LS_EV = {
    A: { id: 'A', t: T('Consumo elevado', 'High consumption'), d: T('La tripulación respira más rápido por el esfuerzo del lanzamiento: la demanda de oxígeno sube. Una sección recibe menos aire del que necesita.', 'The crew breathes faster after launch effort: oxygen demand rises. One section gets less air than it needs.'), c: T('El oxígeno no se «rellena»: se reparte. Si una sección recibe poco, hay que regular la distribución.', 'Oxygen is not simply refilled: it is shared out. If one section gets too little, you regulate the distribution.') },
    B: { id: 'B', t: T('Filtro saturado', 'Saturated filter'), d: T('El filtro que retira el dióxido de carbono (CO₂) está lleno y el CO₂ de la cabina empieza a subir.', 'The filter that removes carbon dioxide (CO₂) is full and cabin CO₂ starts to rise.'), c: T('Respirar produce CO₂. La filtración lo retira; sin ella, el aire se vuelve pesado aunque haya oxígeno.', 'Breathing makes CO₂. Filtration removes it; without it the air gets heavy even with oxygen left.') },
    C: { id: 'C', t: T('Distribución irregular', 'Uneven distribution'), d: T('Una sección recibe un flujo distinto al previsto. La válvula necesita un pequeño ajuste hasta igualar la marca.', 'One section gets a different flow than planned. The valve needs a small adjustment to match the mark.'), c: T('La circulación mantiene el aire parejo. Regular una válvula es un ajuste, no una emergencia.', 'Circulation keeps air even. Regulating a valve is an adjustment, not an emergency.') },
    D: { id: 'D', t: T('Sistema estabilizado', 'System stabilized'), d: T('El soporte vital vuelve a condiciones estables.', 'Life support is back to stable conditions.'), c: T('Circulación, filtración y regulación trabajan juntas: ninguna basta por sí sola.', 'Circulation, filtration and regulation work together: none is enough alone.') }
  };
  const FILTER_STEPS = [T('Aislar el filtro saturado', 'Isolate the saturated filter'), T('Pasar al filtro de reserva', 'Switch to the spare filter'), T('Verificar el CO₂', 'Check the CO₂')];
  const SECT = [T('Cabina de mando', 'Command cabin'), T('Zona de descanso', 'Rest area'), T('Bodega de carga', 'Cargo hold')];
  /** Estado de un indicador: verde estable, amarillo atención, rojo crítico. */
  const lvl = { o2: (v) => (v >= 19.5 ? 'g' : v >= 18 ? 'y' : 'r'), co2: (v) => (v <= 0.5 ? 'g' : v <= 1 ? 'y' : 'r'), pr: (v) => (v >= 98 && v <= 104 ? 'g' : v >= 94 ? 'y' : 'r'), filt: (v) => (v >= 40 ? 'g' : v >= 15 ? 'y' : 'r') };

  /* ---------- Estado ---------- */
  function fresh(S) { return { v: 1, scen: S.scen, done: false, stage: 'cabin', on: {}, errs: 0, nav: { aligned: false, devs: 0, fixed: 0, auto: 0, errs: 0 }, ls: { errs: 0, ev: {}, helped: 0 }, rep: false, q: { nav: null, ls: null }, safety: false, launched: false };
  }
  /** Partidas anteriores y atajos de prueba: viaje ya completado y neutral. */
  function ensure(S) {
    if (S.trip && S.trip.v === 1) return S.trip;
    const t = fresh(S); t.done = true; t.stage = 'done'; t.legacy = true; t.safety = true; t.launched = true; for (const k of SYS) t.on[k] = 1; t.q = { nav: 'good', ls: 'good' }; S.trip = t; return t;
  }
  /** Pulsar un sistema: devuelve {ok} o {ok:false, miss:[...]} y cuenta el error. */
  function press(S, sys) {
    const t = ensure(S); if (t.on[sys]) return { ok: true, again: true };
    const miss = PRE[sys].filter((k) => !t.on[k]);
    if (miss.length) { t.errs++; return { ok: false, miss }; }
    t.on[sys] = 1; return { ok: true };
  }
  const allOn = (S) => SYS.every((k) => ensure(S).on[k]);
  function navQuality(t) { const n = t.nav; return n.auto > 0 ? 'poor' : n.errs > 3 ? 'ok' : n.errs > 0 ? 'ok' : 'good'; }
  function lsQuality(t) { const e = t.ls.errs; return e <= 1 ? 'good' : e <= 3 ? 'ok' : 'poor'; }
  /** Al empezar el aterrizaje: las consecuencias del viaje pasan a la nave y a la tripulación. */
  function applyToLand(S) {
    const t = ensure(S), L = S.land; if (!L || t.legacy) return null;
    t.q.nav = navQuality(t); t.q.ls = lsQuality(t);
    const out = { nav: t.q.nav, ls: t.q.ls, notes: [] };
    if (t.q.nav === 'poor') { if (L.parts.tanks === 'ok') L.parts.tanks = 'warn'; out.notes.push('fuel'); }
    if (S.r && S.r.well) { const d = t.q.ls === 'good' ? 3 : t.q.ls === 'ok' ? 0 : -5; S.r.well.v = Math.max(0, Math.min(S.r.well.max, S.r.well.v + d)); out.well = d; }
    L.trip = out; return out;
  }
  return { SYS, SYS_T, PRE, WHO, WHAT, T_NEED, SAFETY_CHECK, NAV_TOL, angdiff, bearing, devSize, LS_EV, FILTER_STEPS, SECT, lvl, fresh, ensure, press, allOn, navQuality, lsQuality, applyToLand };
})();
