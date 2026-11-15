/* =====================================================================
   LAND — llegada y aterrizaje planetario (motor puro, sin dibujo).
   Zonas de aterrizaje con características reales por escenario, consecuencias
   suaves (nunca bloquean la campaña), estado guardable (S.land) y la nave
   permanente con piezas que tienen estado.
   Coordenadas en baldosas, en el mismo sistema que Field / World.
   ===================================================================== */
const Land = (function () {
  const T = (es, en) => ({ es, en });
  const STEPS = ['bays', 'unload', 'solar', 'antenna', 'power', 'connect', 'life', 'rover', 'verify'];
  const STEP_T = {
    bays: T('Apertura de compartimentos de carga', 'Opening cargo bays'), unload: T('Descarga de módulos', 'Unloading modules'), solar: T('Despliegue de paneles solares', 'Deploying solar panels'),
    antenna: T('Instalación de antenas', 'Installing antennas'), power: T('Activación de los sistemas energéticos', 'Activating power systems'), connect: T('Conexión de módulos habitables', 'Connecting habitat modules'),
    life: T('Activación del soporte vital', 'Activating life support'), rover: T('Preparación de la bahía del rover', 'Preparing the rover bay'), verify: T('Verificación de las instalaciones', 'Verifying the facilities')
  };
  const STEP_D = {
    bays: T('Las compuertas se abren para sacar la carga. Si una se atasca, se pierde tiempo.', 'Doors open to take the cargo out. If one jams, time is lost.'),
    unload: T('Tres módulos bajan de la nave: habitable, científico y técnico.', 'Three modules come off the ship: habitat, science and technical.'),
    solar: T('Los paneles se despliegan hacia el Sol para producir electricidad.', 'Panels unfold toward the Sun to make electricity.'),
    antenna: T('La antena apunta a la Tierra: sin ella no hay radio.', 'The antenna points at Earth: no antenna, no radio.'),
    power: T('Las baterías y el reactor se conectan a la red de la base.', 'Batteries and the reactor join the base grid.'),
    connect: T('Túneles presurizados unen los módulos para caminar sin traje.', 'Pressurized tunnels join the modules so you can walk without a suit.'),
    life: T('Se enciende el sistema que produce aire y recicla agua.', 'The system that makes air and recycles water switches on.'),
    rover: T('La bahía queda lista para el rover R-1 y la esclusa.', 'The bay is made ready for rover R-1 and the airlock.'),
    verify: T('Se revisan presión, energía, aire y comunicaciones.', 'Pressure, power, air and comms are checked.')
  };
  const PARTS = ['engine', 'legs', 'hatch', 'tanks', 'beacon'];
  const PART_T = { engine: T('Motor de descenso', 'Descent engine'), legs: T('Patas de aterrizaje', 'Landing legs'), hatch: T('Compuerta de carga', 'Cargo hatch'), tanks: T('Tanques', 'Tanks'), beacon: T('Baliza y antena', 'Beacon and antenna') };
  const PART_FAULT = {
    engine: T('El sensor de presión del motor marca un valor dudoso. Si no se revisa, el encendido puede retrasarse.', 'The engine pressure sensor reads oddly. Unchecked, ignition may be late.'),
    legs: T('Una pata tiene un amortiguador un poco duro. Si no se revisa, el contacto será más brusco.', 'One leg damper is a little stiff. Unchecked, touchdown will be rougher.'),
    hatch: T('Una compuerta de carga responde lenta. Si no se revisa, tardará más en abrirse.', 'A cargo hatch answers slowly. Unchecked, it will open more slowly.'),
    tanks: T('Un tanque marca una pequeña diferencia de presión. Si no se revisa, se pierde algo de material.', 'A tank shows a small pressure difference. Unchecked, some material is lost.'),
    beacon: T('La baliza no confirma su señal. Si no se revisa, no servirá de relé de radio.', 'The beacon does not confirm its signal. Unchecked, it will not work as a radio relay.')
  };
  const REPAIR_MAT = 3, LEVEL_MAT = 3;

  /* ---------- Destinos ---------- */
  const DEST = {
    moon: {
      n: T('La Luna', 'The Moon'), sub: T('Satélite natural de la Tierra', "Earth's natural satellite"),
      facts: [[T('Gravedad', 'Gravity'), '1,62 m/s² (1/6 de la Tierra)'], [T('Atmósfera', 'Atmosphere'), T('Prácticamente ninguna', 'Practically none')], [T('Temperatura', 'Temperature'), '−170 °C … +120 °C'], [T('Día solar', 'Solar day'), T('≈ 29,5 días terrestres', '≈ 29.5 Earth days')], [T('Señal a la Tierra', 'Signal to Earth'), T('≈ 1,3 s de retraso', '≈ 1.3 s delay')]],
      brief: T('Destino: la Luna. No hay aire que frene la nave: todo el descenso depende de los motores. El suelo es regolito, un polvo afilado que flota mucho tiempo.', 'Destination: the Moon. There is no air to slow the ship: the whole descent depends on engines. The ground is regolith, a sharp dust that hangs for a long time.')
    },
    mars: {
      n: T('Marte', 'Mars'), sub: T('El planeta rojo', 'The red planet'),
      facts: [[T('Gravedad', 'Gravity'), '3,71 m/s² (38 % de la Tierra)'], [T('Atmósfera', 'Atmosphere'), T('Muy fina, de CO₂', 'Very thin, mostly CO₂')], [T('Temperatura', 'Temperature'), '−125 °C … +20 °C'], [T('Día solar (sol)', 'Solar day (sol)'), '24 h 40 min'], [T('Señal a la Tierra', 'Signal to Earth'), T('de 3 a 22 minutos', '3 to 22 minutes')]],
      brief: T('Destino: Marte. La atmósfera es fina pero caliente al entrar: el escudo térmico, el paracaídas y los motores trabajan por turnos. El polvo rojo y el viento mandan en la superficie.', 'Destination: Mars. The thin air still heats the ship on entry: heat shield, parachute and engines work in turns. Red dust and wind rule the surface.')
    }
  };

  /* ---------- Zonas de aterrizaje ----------
     Atributos 0–3 (más alto = más de eso). x,y: plataforma de la nave en el mapa exterior. */
  const A = (terrain, slope, rocks, expo, res, comm, space) => ({ terrain, slope, rocks, expo, res, comm, space });
  const ZONES = {
    moon: [
      { id: 'z1', x: 96, y: 114, c: A(0, 0, 1, 1, 1, 2, 3), n: T('Llanura del Sur', 'Southern Plain'), t: T('Llanura de regolito compactado', 'Compacted regolith plain'), d: T('Un terreno amplio y casi plano. No tiene nada espectacular cerca, pero casi nada sale mal.', 'A wide, nearly flat ground. Nothing spectacular nearby, but little goes wrong.') },
      { id: 'z2', x: 42, y: 112, c: A(2, 2, 3, 1, 3, 1, 1), n: T('Borde del cráter Aurora', 'Aurora Crater Rim'), t: T('Terreno irregular con rocas', 'Rugged, rocky ground'), d: T('Muy cerca del hielo del cráter en sombra, pero el suelo es irregular y hay poco espacio plano.', 'Right next to the shadowed-crater ice, but the ground is uneven with little flat space.') },
      { id: 'z3', x: 122, y: 112, c: A(1, 1, 1, 3, 1, 3, 2), n: T('Cresta Oriental', 'Eastern Ridge'), t: T('Cresta despejada', 'Open ridge'), d: T('Ve bien hacia la Tierra, pero está abierta al Sol y a las partículas: más radiación.', 'Has a clear line to Earth, but it is open to the Sun and to particles: more radiation.') },
      { id: 'z4', x: 8, y: 118, c: A(1, 1, 2, 0, 0, 0, 2), n: T('Valle del Oeste', 'Western Valley'), t: T('Valle resguardado', 'Sheltered valley'), d: T('Las paredes protegen de la radiación, pero tapan la señal y está lejos de recursos.', 'The walls shield from radiation, but they block signal and resources are far.') }
    ],
    mars: [
      { id: 'z1', x: 96, y: 114, c: A(0, 0, 1, 1, 1, 2, 3), n: T('Llanura del Sur', 'Southern Plain'), t: T('Llanura de arena compacta', 'Packed-sand plain'), d: T('Terreno amplio y firme. El viento arrastra polvo, pero es fácil colocar los módulos.', 'Wide, firm ground. Wind carries dust, but modules are easy to place.') },
      { id: 'z2', x: 42, y: 112, c: A(2, 2, 3, 1, 3, 1, 1), n: T('Delta fósil', 'Fossil Delta'), t: T('Terreno de capas y bloques', 'Layered, blocky ground'), d: T('Junto a sedimentos donde pudo haber agua. El suelo es irregular y hay bloques sueltos.', 'Beside sediments where water may have flowed. Uneven ground with loose blocks.') },
      { id: 'z3', x: 122, y: 112, c: A(1, 1, 1, 3, 1, 3, 2), n: T('Meseta de Hematita', 'Hematite Mesa'), t: T('Meseta alta y expuesta', 'High, exposed mesa'), d: T('Buena vista hacia el cielo para las antenas, pero el viento y la radiación pegan más fuerte.', 'Great sky view for antennas, but wind and radiation hit harder.') },
      { id: 'z4', x: 8, y: 118, c: A(1, 1, 2, 0, 0, 0, 2), n: T('Cañón del Oeste', 'Western Canyon'), t: T('Cañón resguardado', 'Sheltered canyon'), d: T('Las paredes frenan el viento y la radiación, pero cuesta comunicarse y los recursos quedan lejos.', 'Walls slow wind and radiation, but comms are hard and resources are far.') }
    ]
  };
  const LV = [T('baja', 'low'), T('media', 'medium'), T('alta', 'high'), T('muy alta', 'very high')];
  const ATTR = [['terrain', T('Terreno', 'Terrain'), '🪨'], ['slope', T('Pendiente', 'Slope'), '📐'], ['rocks', T('Rocas', 'Rocks'), '🌑'], ['expo', T('Exposición', 'Exposure'), '☢️'], ['res', T('Recursos cerca', 'Nearby resources'), '💧'], ['comm', T('Comunicaciones', 'Communications'), '📡'], ['space', T('Espacio libre', 'Free space'), '⬜']];
  // etiquetas de cada atributo (0..3)
  const ATTR_LBL = {
    terrain: [T('Lisa', 'Smooth'), T('Algo irregular', 'Slightly uneven'), T('Irregular', 'Uneven'), T('Muy irregular', 'Very uneven')],
    slope: [T('0–2°', '0–2°'), T('3–5°', '3–5°'), T('6–9°', '6–9°'), T('10°+', '10°+')],
    rocks: LV, expo: LV, res: LV, comm: LV, space: LV
  };
  /** Consecuencias de una zona (todas pequeñas y reversibles; nada bloquea la campaña). */
  function fx(c) {
    const rough = c.rocks + c.slope + (c.terrain > 1 ? 1 : 0);
    return {
      sig: +(0.82 + 0.1 * c.comm).toFixed(2), // alcance de la antena de la base
      rad: +(0.8 + 0.15 * c.expo).toFixed(2), // dosis fuera de la base
      reveal: c.res, // muestras ocultas que ya se conocen
      mat: 3 * c.space - Math.round(1.5 * rough), // materiales: espacio libre suma, terreno difícil resta
      rough, shake: rough >= 4 ? 2 : rough >= 2 ? 1 : 0
    };
  }

  /* ---------- Estado ---------- */
  const zoneList = (sc) => ZONES[sc === 'mars' ? 'mars' : 'moon'];
  const zoneOf = (sc, id) => zoneList(sc).find((z) => z.id === id) || zoneList(sc)[0];
  function parts() { const o = {}; for (const k of PARTS) o[k] = 'ok'; return o; }
  /** Partida nueva con aterrizaje por jugar. */
  function fresh(S) {
    const flag = PARTS[(S.seed >>> 3) % PARTS.length];
    return { v: 1, scen: S.scen, done: false, stage: 'arrive', zone: null, prio: null, lev: null, ign: null, flag, parts: parts(), ship: null, inst: {}, steps: 0, mods: { sig: 1, rad: 1 }, relay: false, replays: 0, log: [] };
  }
  /** Partidas anteriores y atajos de prueba: aterrizaje ya completado, zona por defecto y sin cambios en la simulación. */
  function ensure(S) {
    if (S.land && S.land.v === 1) return S.land;
    const z = zoneList(S.scen)[0], L = { v: 1, scen: S.scen, done: true, stage: 'done', zone: z.id, prio: null, lev: null, ign: null, flag: null, parts: parts(), ship: { x: z.x, y: z.y }, inst: {}, steps: STEPS.length, mods: { sig: 1, rad: 1 }, relay: false, replays: 0, log: [], legacy: true };
    for (const k of STEPS) L.inst[k] = 1;
    S.land = L; return L;
  }
  const zone = (S) => { const L = ensure(S); return L.zone ? zoneOf(S.scen, L.zone) : null; };
  const pad = (S) => { const L = ensure(S); return L.ship ? [L.ship.x, L.ship.y] : null; };
  const mods = (S) => ensure(S).mods;
  const done = (S) => ensure(S).done;
  /** El jugador elige la zona: fija la posición de la nave. */
  function pick(S, id) { const L = ensure(S), z = zoneOf(S.scen, id); L.zone = z.id; L.ship = { x: z.x, y: z.y }; L.mods = { sig: fx(z.c).sig, rad: fx(z.c).rad }; return z; }
  /** Pieza con fallo previo, si se revisó y se arregló. */
  function repair(S, part) { const L = ensure(S); if (L.parts[part] === 'ok') return false; L.parts[part] = 'ok'; if (part === 'beacon') L.relay = true; return true; }
  const warnParts = (S) => PARTS.filter((k) => ensure(S).parts[k] !== 'ok');

  /** Al terminar el despliegue: aplica las consecuencias de la zona y de las decisiones. Devuelve un resumen. */
  function complete(S, o) {
    const L = ensure(S), z = zone(S), f = fx(z.c), sum = { mat: 0, reveal: [], notes: [] };
    o = o || {};
    // 1 · terreno y espacio: materiales (nivelar la plataforma cuesta 4 pero evita el daño en las patas)
    let mat = f.mat;
    if (o.lev === true && f.rough >= 3) { mat -= LEVEL_MAT; L.lev = true; }
    else if (f.rough >= 3) { L.lev = false; if (L.parts.legs === 'ok') L.parts.legs = 'warn'; sum.notes.push('legs'); }
    if (L.ign === 'late' && L.parts.engine === 'ok') L.parts.engine = 'warn';
    if (L.flag && L.parts[L.flag] === 'warn' && L.flag === 'tanks') mat -= 3;
    if (S.r && S.r.mat) { const before = S.r.mat.v; S.r.mat.v = Math.max(0, Math.min(S.r.mat.max, S.r.mat.v + mat)); sum.mat = Math.round(S.r.mat.v - before); }
    // 2 · recursos cercanos: muestras ocultas ya conocidas
    if (typeof Field !== 'undefined' && Field.G && S.ex && f.reveal > 0) {
      const P = L.ship, hid = Field.G.sites.filter((s) => s.hidden).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y)).slice(0, f.reveal);
      for (const s of hid) { S.ex.rev[s.id] = true; sum.reveal.push(s.id); }
    }
    // 3 · prioridad inicial: un empujón pequeño al sistema elegido
    if (L.prio === 'power' && S.r.power) S.r.power.v = Math.min(S.r.power.max, S.r.power.v + S.r.power.max * 0.06);
    if (L.prio === 'life' && S.r.o2) S.r.o2.v = Math.min(S.r.o2.max, S.r.o2.v + S.r.o2.max * 0.06);
    if (L.prio === 'comms') { L.relay = L.parts.beacon === 'ok' || L.relay; L.mods.sig = +(L.mods.sig + 0.08).toFixed(2); }
    if (L.parts.beacon === 'ok') L.relay = true;
    // 4 · estado final
    L.done = true; L.stage = 'done'; L.steps = STEPS.length; for (const k of STEPS) L.inst[k] = 1;
    L.log.push({ zone: L.zone, prio: L.prio, lev: L.lev, ign: L.ign, mat: sum.mat, reveal: sum.reveal.length });
    return sum;
  }
  /** Relé de radio de la nave (si su baliza funciona y se activó en el despliegue). */
  const relayNode = (S) => { const L = ensure(S); return L.relay && L.parts.beacon === 'ok' && L.ship ? { x: L.ship.x, y: L.ship.y, r: 34 } : null; };
  /** Resumen en texto de las consecuencias de una zona (para la pantalla de elección). */
  function effects(z, es, adv) {
    const f = fx(z.c), o = [];
    o.push(f.sig >= 1.05 ? (es ? '📡 Antena de la base con más alcance' : '📡 Base antenna reaches farther') : f.sig <= 0.9 ? (es ? '📡 Comunicaciones más débiles' : '📡 Weaker communications') : (es ? '📡 Comunicaciones normales' : '📡 Normal communications'));
    o.push(f.rad >= 1.1 ? (es ? '☢️ Más radiación en las salidas' : '☢️ More radiation on outings') : f.rad <= 0.9 ? (es ? '☢️ Menos radiación en las salidas' : '☢️ Less radiation on outings') : (es ? '☢️ Radiación normal' : '☢️ Normal radiation'));
    o.push(f.reveal ? (es ? '💧 Conoces ' + f.reveal + ' muestra' + (f.reveal > 1 ? 's' : '') + ' oculta' + (f.reveal > 1 ? 's' : '') + ' desde el inicio' : '💧 You know ' + f.reveal + ' hidden sample' + (f.reveal > 1 ? 's' : '') + ' from the start') : (es ? '💧 Los recursos hay que buscarlos' : '💧 You must search for resources'));
    o.push(f.rough >= 3 ? (es ? '🧱 Despliegue difícil: puedes nivelar el terreno' : '🧱 Hard deployment: you can level the ground') : (es ? '🧱 Despliegue sencillo' : '🧱 Easy deployment'));
    if (adv) o.push((es ? '⚙ Antena ×' : '⚙ Antenna ×') + f.sig + ' · ' + (es ? 'dosis ×' : 'dose ×') + f.rad + ' · ' + (es ? 'materiales ' : 'materials ') + (f.mat >= 0 ? '+' : '') + f.mat);
    return o;
  }
  return { STEPS, STEP_T, STEP_D, PARTS, PART_T, PART_FAULT, REPAIR_MAT, LEVEL_MAT, DEST, ZONES, ATTR, ATTR_LBL, LV, zoneList, zoneOf, fx, fresh, ensure, zone, pad, mods, done, pick, repair, warnParts, complete, relayNode, effects };
})();
