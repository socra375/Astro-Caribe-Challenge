/* =====================================================================
   TRIP — viaje espacial previo al aterrizaje (motor puro, sin dibujo).
   Encendido en secuencia lógica y lanzamiento; el crucero es una animación
   (sin minijuegos) y no deja consecuencias negativas. Todos los valores son SIMULADOS (educativos).
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
    if (typeof S.morale === 'number') { const d = t.q.ls === 'good' ? 4 : t.q.ls === 'ok' ? 0 : -6; S.morale = Math.max(0, Math.min(100, S.morale + d)); out.morale = d; }
    L.trip = out; return out;
  }
  return { SYS, SYS_T, PRE, WHO, WHAT, T_NEED, SAFETY_CHECK, fresh, ensure, press, allOn, navQuality, lsQuality, applyToLand };
})();
