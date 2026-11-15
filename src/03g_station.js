/* =====================================================================
   STATION — estado de la estación por pisos (motor puro, sin dibujo):
   los dos elevadores como máquinas de estados con puertas, movimiento y
   averías. El elevador de tripulación une los pisos 1-3; el del rover es
   independiente y une la zona exterior (0) con el garaje (2) y solo se
   mueve si el vehículo está sobre la plataforma. Todo es serializable y
   forma parte del estado guardado (S.station).
   ===================================================================== */
const Station = (function () {
  const T = (es, en) => ({ es, en });
  const FLOORS = [1, 2, 3];
  const FLOOR_T = { 0: T('Exterior', 'Outside'), 1: T('Piso 1 · Operaciones', 'Floor 1 · Operations'), 2: T('Piso 2 · Exploración', 'Floor 2 · Exploration'), 3: T('Piso 3 · Energía', 'Floor 3 · Energy') };
  const KINDS = {
    crew: { stops: [1, 2, 3], at: 1, name: T('Elevador de tripulación', 'Crew elevator'), secPerFloor: 2.2 },
    rover: { stops: [0, 2], at: 0, name: T('Elevador del rover', 'Rover elevator'), secPerFloor: 2.6 }
  };
  const DOOR_S = 0.9, STAIRS_S = 7; // segundos de puertas y de la alternativa por escalera de emergencia (por piso)
  const WHY = {
    broken: T('El elevador está averiado: usa la escalera de emergencia o repáralo.', 'The elevator is out of service: use the emergency stairs or repair it.'),
    busy: T('El elevador se está moviendo.', 'The elevator is moving.'),
    floor: T('Ese piso no existe para este elevador.', 'That floor does not exist for this elevator.'),
    rover: T('El rover debe estar completamente sobre la plataforma.', 'The rover must be fully on the platform.'),
    notrover: T('El rover no puede usar el elevador de tripulación.', 'The rover cannot use the crew elevator.'),
    closed: T('Las puertas no están abiertas.', 'The doors are not open.'),
    full: T('Plataforma ocupada.', 'Platform occupied.'),
    align: T('Coloca el rover en el centro de la plataforma, alineado y parado, y sin nadie dentro.', 'Place the rover in the middle of the platform, aligned and stopped, with nobody inside.'),
    cap: T('El elevador de tripulación no admite el rover.', 'The crew elevator does not take the rover.')
  };
  const mk = (kind) => ({ at: KINDS[kind].at, to: KINDS[kind].at, st: 'idle', t: 0, p: 0, occ: [], broken: false, trips: 0 });
  function fresh() { return { v: 1, elev: { crew: mk('crew'), rover: mk('rover') }, roverAt: 'surface', log: [] }; }
  /** Partidas anteriores: la estación se crea con los elevadores en reposo. */
  function ensure(S) {
    if (S.station && S.station.v === 1) { const s = S.station; for (const k in KINDS) if (!s.elev[k]) s.elev[k] = mk(k); return s; }
    return (S.station = fresh());
  }
  const E = (S, kind) => ensure(S).elev[kind];
  /** Apertura de puertas 0..1 (para animar). */
  function door(S, kind) {
    const e = E(S, kind);
    if (e.st === 'idle') return 1; if (e.st === 'moving') return 0;
    const u = Math.min(1, e.t / DOOR_S); return e.st === 'closing' ? 1 - u : u;
  }
  /** Piso intermedio (decimal) para animar el desplazamiento. */
  function level(S, kind) { const e = E(S, kind); return e.st === 'moving' ? e.at + (e.to - e.at) * e.p : e.at; }
  const travelS = (kind, a, b) => Math.abs(b - a) * KINDS[kind].secPerFloor;
  /** Pide el elevador. ctx.roverOn: el rover está sobre la plataforma (obligatorio para el elevador del rover). */
  function call(S, kind, to, ctx) {
    const e = E(S, kind), K = KINDS[kind]; ctx = ctx || {};
    if (!K.stops.includes(to)) return { ok: false, why: 'floor' };
    if (e.broken) return { ok: false, why: 'broken' };
    if (e.st !== 'idle') return { ok: false, why: 'busy' };
    if (e.at === to) return { ok: true, same: true };
    if (kind === 'rover' && !ctx.roverOn) return { ok: false, why: 'rover' };
    e.to = to; e.st = 'closing'; e.t = 0; e.p = 0; return { ok: true, s: DOOR_S * 2 + travelS(kind, e.at, to) };
  }
  /** Sube a la plataforma (solo con las puertas abiertas y en reposo). */
  function board(S, kind, who) {
    const e = E(S, kind);
    if (kind === 'crew' && who === 'rover') return { ok: false, why: 'cap' };
    if (e.broken) return { ok: false, why: 'broken' };
    if (e.st !== 'idle') return { ok: false, why: 'closed' };
    if (kind === 'rover' && who === 'rover' && e.occ.includes('rover')) return { ok: false, why: 'full' };
    if (!e.occ.includes(who)) e.occ.push(who); return { ok: true };
  }
  function leave(S, kind, who) {
    const e = E(S, kind); if (e.st !== 'idle') return { ok: false, why: 'closed' };
    e.occ = e.occ.filter((q) => q !== who); return { ok: true };
  }
  /** Avanza el tiempo real (segundos). Devuelve true si el elevador llegó en este paso. */
  function step(S, dt) {
    let arrived = false;
    for (const kind of Object.keys(KINDS)) {
      const e = E(S, kind); if (e.st === 'idle') continue;
      e.t += dt;
      if (e.st === 'closing' && e.t >= DOOR_S) { e.st = 'moving'; e.t = 0; e.p = 0; }
      else if (e.st === 'moving') {
        const dur = Math.max(0.01, travelS(kind, e.at, e.to)); e.p = Math.min(1, e.t / dur);
        if (e.p >= 1) { e.at = e.to; e.st = 'opening'; e.t = 0; e.trips++; if (kind === 'rover') S.station.roverAt = e.at === 2 ? 'garage' : 'surface'; }
      } else if (e.st === 'opening' && e.t >= DOOR_S) { e.st = 'idle'; e.t = 0; arrived = true; }
    }
    return arrived;
  }
  /** Avería y reparación (la avería no deja a nadie atrapado: el elevador termina el viaje que ya empezó). */
  function setBroken(S, kind, on) { E(S, kind).broken = !!on; }
  /** Alternativa cuando el elevador de tripulación no funciona: escalera de emergencia, más lenta. Nunca bloquea la campaña. */
  function stairs(S, from, to) { if (!FLOORS.includes(from) || !FLOORS.includes(to)) return { ok: false, why: 'floor' }; return { ok: true, s: Math.abs(to - from) * STAIRS_S }; }
  /** ¿Se ve el rover en la superficie? No si está guardado en el garaje ni mientras la plataforma baja con él. */
  const roverVisible = (S) => { const st = ensure(S); return st.roverAt !== 'garage' && st.elev.rover.st !== 'moving'; };
  const roverStored = (S) => ensure(S).roverAt === 'garage';
  /** Plataforma del rover (coordenadas del mundo exterior): el rover aparca en su centro. */
  const PLAT = { x: 70.5, y: 86.4, w: 7, h: 6.4, c: [74, 89.6], panel: [74, 93.4] };
  /** ¿Está el rover bien colocado sobre la plataforma? (centrado, alineado, quieto y sin conductor) */
  function roverOnPlatform(R) {
    const d = Math.hypot(R.x - PLAT.c[0], R.y - PLAT.c[1]), ang = Math.abs(((R.a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    return d < 1.6 && ang < 0.5 && Math.abs(R.v) < 0.3 && !R.occ;
  }
  const floorName = (f, lang) => FLOOR_T[f] ? FLOOR_T[f][lang === 'en' ? 'en' : 'es'] : String(f);
  return { PLAT, roverVisible, roverStored, roverOnPlatform, FLOORS, FLOOR_T, KINDS, WHY, DOOR_S, STAIRS_S, fresh, ensure, call, board, leave, step, door, level, setBroken, stairs, travelS, floorName };
})();
