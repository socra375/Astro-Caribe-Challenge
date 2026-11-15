
/* =====================================================================
   LAYOUT — arquitectura original de la base: tres módulos (habitabilidad,
   científico y técnico) con salas de formas distintas, túneles presurizados,
   bahía con esclusa y terreno exterior. Todo son datos: World los convierte
   en cuadrícula, colisiones, puertas y rutas, y el arte los dibuja.
   Unidades: baldosas de 32 px.
   ===================================================================== */
const Layout = (function () {
  const W = 112, H = 82;
  const R = (x0, y0, x1, y1) => ({ t: 'r', x0, y0, x1, y1 });
  const RR = (x0, y0, x1, y1, r) => ({ t: 'rr', x0, y0, x1, y1, r });
  const CH = (x0, y0, x1, y1, c, k) => ({ t: 'ch', x0, y0, x1, y1, c, k: k || 'tl,tr,bl,br' });
  /** ¿El centro de celda (cx, cy, en baldosas) cae dentro de la forma? */
  function has(s, cx, cy) {
    const x0 = s.x0, y0 = s.y0, x1 = s.x1 + 1, y1 = s.y1 + 1;
    if (cx < x0 || cx > x1 || cy < y0 || cy > y1) return false;
    if (s.t === 'r') return true;
    if (s.t === 'rr') {
      const r = s.r, dx = cx < x0 + r ? x0 + r - cx : cx > x1 - r ? cx - (x1 - r) : 0, dy = cy < y0 + r ? y0 + r - cy : cy > y1 - r ? cy - (y1 - r) : 0;
      return dx * dx + dy * dy <= r * r;
    }
    const k = s.k, c = s.c;
    if (k.includes('tl') && (cx - x0) + (cy - y0) < c) return false;
    if (k.includes('tr') && (x1 - cx) + (cy - y0) < c) return false;
    if (k.includes('bl') && (cx - x0) + (y1 - cy) < c) return false;
    if (k.includes('br') && (x1 - cx) + (y1 - cy) < c) return false;
    return true;
  }

  // Salas: forma (unión de formas), grupo (módulo), suelo y color de casco
  const ROOMS = {
    // MÓDULO CENTRAL · habitabilidad
    bridge: { s: [CH(47, 13, 65, 24, 4, 'tl,tr')], g: 'hab', floor: 'deck', col: ['#1b2a55', '#1f3062'] },
    hall: { s: [RR(44, 26, 68, 30, 2)], g: 'hab', floor: 'plate', col: ['#1a2030', '#1e2536'] },
    life: { s: [RR(34, 26, 42, 50, 3)], g: 'hab', floor: 'carpet', col: ['#2d2346', '#33284f'] },
    med: { s: [RR(44, 45, 68, 50, 2)], g: 'hab', floor: 'clean', col: ['#1f3a44', '#244350'] },
    water: { s: [RR(67, 12, 78, 23, 2)], g: 'hab', floor: 'grate', col: ['#0f3446', '#123b50'] },
    kitchen: { s: [RR(44, 32, 68, 43, 3)], g: 'hab', floor: 'checker', col: ['#3d2a22', '#46302a'] },
    food: { s: [RR(70, 25, 78, 50, 3)], g: 'hab', floor: 'crates', col: ['#33361e', '#3a3d23'] },
    // MÓDULO CIENTÍFICO
    gh: { s: [RR(4, 15, 28, 40, 6)], g: 'sci', floor: 'soil', col: ['#183a2a', '#1c4331'] },
    lab: { s: [CH(6, 45, 22, 57, 3)], g: 'sci', floor: 'hex', col: ['#2b2550', '#312a5a'] },
    samples: { s: [RR(24, 45, 32, 57, 2)], g: 'sci', floor: 'clean', col: ['#1d3a3f', '#224247'] },
    // MÓDULO TÉCNICO
    reactor: { s: [CH(84, 15, 107, 40, 4)], g: 'tec', floor: 'hazard', col: ['#3a2414', '#432a17'] },
    workshop: { s: [RR(84, 45, 95, 57, 2)], g: 'tec', floor: 'plate', col: ['#333338', '#3a3a40'] },
    waste: { s: [RR(97, 45, 107, 57, 2)], g: 'tec', floor: 'grate', col: ['#2a3326', '#2f3a2b'] },
    rad: { s: [RR(34, 52, 78, 66, 3)], g: 'tec', floor: 'bay', col: ['#2a2f3a', '#30353f'] },
    lock: { s: [R(55, 68, 56, 69)], g: 'tec', floor: 'hazard', col: ['#3a3426', '#41392a'] },
    // Túneles presurizados
    t1: { s: [R(30, 30, 32, 31)], g: 'tube', floor: 'tube', col: ['#1a1f2e', '#1d2334'] },
    t2: { s: [R(12, 42, 13, 43)], g: 'tube', floor: 'tube', col: ['#1a1f2e', '#1d2334'] },
    t3: { s: [R(80, 19, 82, 20)], g: 'tube', floor: 'tube', col: ['#1a1f2e', '#1d2334'] },
    t4: { s: [R(89, 42, 90, 43)], g: 'tube', floor: 'tube', col: ['#1a1f2e', '#1d2334'] },
    t5: { s: [R(101, 42, 102, 43)], g: 'tube', floor: 'tube', col: ['#1a1f2e', '#1d2334'] },
    t6: { s: [R(80, 53, 82, 54)], g: 'tube', floor: 'tube', col: ['#1a1f2e', '#1d2334'] }
  };
  const ROOMCOL = { bridge: '#4f7dff', hall: '#8aa0d8', life: '#b07cff', gh: '#3ddc84', reactor: '#ff9a3d', water: '#38d6ff', rad: '#c9ced8', lab: '#9a8cff', kitchen: '#ff8f6b', med: '#5fd3e8', food: '#c8d44a', samples: '#4fe0c9', waste: '#8fbf6a', workshop: '#b8b8c4', lock: '#ffc24a' };

  // Puertas: [sala A, sala B, posición preferida (x o y a lo largo del borde), tipo]
  const LINKS = [
    ['bridge', 'hall', 55], ['bridge', 'water', 18], ['hall', 'life', 28], ['hall', 'food', 28], ['hall', 'kitchen', 49], ['hall', 'kitchen', 62],
    ['life', 'med', 46], ['kitchen', 'med', 49], ['med', 'food', 47], ['water', 'food', 73], ['life', 'samples', 48], ['lab', 'samples', 50], ['workshop', 'waste', 50], ['rad', 'life', 37], ['rad', 'med', 56], ['rad', 'food', 73],
    ['gh', 't1', 30], ['t1', 'life', 30], ['gh', 't2', 12], ['t2', 'lab', 12], ['water', 't3', 19], ['t3', 'reactor', 19], ['reactor', 't4', 89], ['t4', 'workshop', 89],
    ['reactor', 't5', 101], ['t5', 'waste', 101], ['rad', 't6', 53], ['t6', 'workshop', 53], ['rad', 'lock', 55, 'inner'], ['lock', 'pad', 55, 'outer']
  ];

  const SHELTER = [64, 56, 76, 64];
  const LOCK = { x: 55.5, inY: 64.8, outY: 72.2 };
  const START = [56, 21.5];

  // Mobiliario (x, y, w, h, tipo, extra). Las consolas se añaden aparte.
  const FURN = [
    // Puente
    ['window', 51, 13, 11, 1], ['holo', 53, 17, 6, 3], ['crate', 48, 21, 2, 2], ['lockers', 61, 20, 2, 3],
    // Atrio
    ['holo', 55, 27, 6, 3], ['rug', 47, 27, 5, 3], ['rug', 62, 27, 5, 3],
    // Enfermería
    ['medbed', 46, 46, 3, 2], ['medbed', 50, 46, 3, 2], ['medbed', 54, 46, 3, 2], ['lockers', 62, 46, 2, 3], ['table', 65, 47, 3, 2],
    // Soporte vital
    ['tank', 68, 13, 3, 3], ['tank', 73, 13, 3, 3], ['recycler', 68, 18, 3, 3], ['o2gen', 73, 18, 3, 3],
    // Dormitorios
    ['rug', 37, 28, 4, 2], ['bunk', 35, 28, 2, 3], ['bunk', 35, 33, 2, 3], ['bunk', 35, 38, 2, 3], ['bunk', 35, 43, 2, 3], ['lockers', 41, 33, 2, 3], ['lockers', 41, 38, 2, 3], ['table', 37, 35, 3, 2],
    // Cocina y comedor
    ['stove', 45, 33, 4, 1], ['shelf', 55, 33, 5, 1], ['table', 47, 37, 4, 2], ['table', 54, 37, 4, 2], ['table', 61, 37, 4, 2],
    // Almacén de alimentos
    ['shelf', 75, 27, 3, 2], ['shelf', 75, 31, 3, 2], ['shelf', 71, 33, 3, 2], ['shelf', 71, 37, 3, 2], ['cold', 75, 36, 3, 3], ['crate', 72, 42, 2, 2], ['crate', 75, 42, 2, 2],
    // Invernadero
    ['tank', 23, 33, 2, 2], ['tank', 6, 33, 2, 2], ['seedrack', 21, 22, 6, 2], ['seedrack', 21, 26, 6, 2], ['bin', 8, 36, 2, 2], ['pipe', 6, 22, 14, 1], ['pipe', 6, 28, 14, 1], ['vent', 14, 35, 2, 2], ['vent', 10, 31, 2, 2],
    // Laboratorio
    ['benchs', 8, 48, 6, 2], ['benchs', 15, 48, 6, 2], ['table', 8, 53, 4, 2], ['table', 15, 53, 4, 2], ['rack', 20, 53, 2, 2],
    // Almacén de muestras
    ['cabinet', 25, 47, 3, 2], ['cabinet', 29, 47, 3, 2], ['table', 26, 53, 4, 2], ['cold', 29, 51, 3, 3],
    // Reactor
    ['reactor', 92, 23, 8, 8], ['turbine', 88, 17, 4, 4], ['turbine', 98, 17, 4, 4], ['pipe', 92, 19, 1, 4], ['pipe', 99, 19, 1, 4], ['tank', 103, 29, 3, 3], ['vent', 90, 33, 2, 2], ['vent', 100, 33, 2, 2], ['battery', 87, 24, 2, 2], ['battery', 87, 27, 2, 2], ['battery', 87, 30, 2, 2], ['rack', 104, 25, 2, 3],
    // Taller
    ['benchs', 85, 47, 6, 2], ['tools', 91, 47, 3, 2], ['lathe', 90, 52, 4, 3], ['crate', 85, 55, 3, 2],
    // Residuos
    ['bin', 98, 47, 2, 2], ['bin', 104, 47, 2, 2], ['recycler', 100, 52, 5, 3], ['crate', 98, 54, 2, 2],
    // Bahía del rover
    ['rover', 36, 55, 6, 4], ['tools', 36, 61, 4, 2], ['benchs', 47, 63, 6, 1], ['pipe', 36, 53, 41, 1], ['crate', 47, 57, 2, 2], ['crate', 50, 57, 2, 2], ['crate', 47, 60, 2, 2], ['vent', 58, 56, 2, 2], ['vent', 46, 64, 2, 1]
  ];
  // [id, sala, x, y, verbo, icono]
  const CONSOLES = [
    ['cmd', 'bridge', 50, 16, 'manage', '🖥️'], ['comms', 'bridge', 56, 15, 'interact', '📡'], ['earth', 'bridge', 62, 16, 'investigate', '🌎'], ['wardrobe', 'bridge', 63, 22, 'interact', '🧥'],
    ['med', 'med', 59, 46, 'manage', '🩺'],
    ['water', 'water', 76, 14, 'manage', '💧'], ['o2', 'water', 76, 20, 'play', '🫧'],
    ['bed', 'life', 38, 47, 'rest', '🛏️'], ['rec', 'life', 38, 38, 'interact', '🎲'],
    ['kitchen', 'kitchen', 66, 33, 'manage', '🥗'], ['store', 'food', 71, 45, 'manage', '🧺'],
    ['gh', 'gh', 25, 17, 'manage', '🌱'],
    ['lab', 'lab', 10, 46, 'investigate', '🔬'], ['spec', 'lab', 17, 46, 'investigate', '🌈'], ['log', 'lab', 21, 49, 'investigate', '📚'], ['sampler', 'samples', 27, 50, 'manage', '🧪'],
    ['reactor', 'reactor', 103, 20, 'manage', '⚛️'], ['solar', 'reactor', 90, 37, 'play', '☀️'], ['balance', 'reactor', 102, 36, 'play', '⚖️'],
    ['work', 'workshop', 93, 49, 'manage', '🛠'], ['wastec', 'waste', 105, 50, 'manage', '♻️'],
    ['rover', 'rad', 43, 56, 'explore', '🚙'], ['isru', 'rad', 44, 62, 'manage', '🧊'], ['shield', 'rad', 60, 58, 'manage', '🛡️'], ['lock', 'lock', 58, 65, 'interact', '🚪']
  ];
  // Invernadero: seis jardineras de 3×2 (los índices de bed los usa la simulación)
  const PLANTERS = [[7, 19], [12, 19], [17, 19], [7, 25], [12, 25], [17, 25]];
  // Puestos de trabajo de los NPC por sala (celdas de referencia; World elige la libre más cercana)
  const SPOTS = { bridge: [[56, 21], [52, 20]], hall: [[52, 28], [60, 28]], life: [[38, 31], [38, 44]], med: [[52, 49], [60, 49]], water: [[72, 16], [75, 22]], kitchen: [[58, 35], [52, 40]],
    food: [[73, 30], [73, 40]], gh: [[10, 23], [20, 23], [14, 35]], lab: [[12, 50], [18, 50]], samples: [[28, 55], [30, 49]], reactor: [[90, 34], [100, 33]], workshop: [[88, 50], [92, 55]], waste: [[101, 50], [100, 56]],
    rad: [[48, 59], [66, 54], [56, 62]] };
  const SAMPLES_OUT = { moon: [[47.5, 75.5], [66.5, 77.5], [41.5, 79], [72.5, 73.5]], mars: [[45.5, 76.5], [69.5, 78.5], [38.5, 74], [74.5, 74.5]] };
  const REACTOR_C = [96, 27];

  /** Rutas de exploración (huellas del rover) y elementos del exterior. Determinista por escenario. */
  function scenery(scen, isBase) {
    let seed = scen === 'mars' ? 90210 : 4242;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const mars = scen === 'mars';
    const props = [], boxes = [];
    const tracks = [
      [[55.5, 71], [55.5, 74], [56, 78]],
      [[55.5, 74], [34, 76], [16, 72], [8, 66]],
      [[56, 78], [80, 78], [96, 72], [104, 66]],
      [[55.5, 74], [48, 70], [30, 68], [22, 60]],
      [[80, 78], [92, 62], [100, 70]],
      [[56, 76], [58, 64.2]]
    ];
    const padC = [56, 78], padR = 6.5;
    const near = (x, y, w, h, pad) => boxes.some((b) => x < b[2] + pad && x + w > b[0] - pad && y < b[3] + pad && y + h > b[1] - pad);
    const onTrack = (x, y, rad) => { for (const t of tracks) for (let i = 1; i < t.length; i++) { const a = t[i - 1], b = t[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; let u = ((x - a[0]) * dx + (y - a[1]) * dy) / l2; u = Math.max(0, Math.min(1, u)); if (Math.hypot(x - (a[0] + u * dx), y - (a[1] + u * dy)) < rad) return true; } return false; };
    const baseNear = (x, y, w, h, m) => { for (let yy = Math.floor(y) - m; yy <= y + h + m; yy++) for (let xx = Math.floor(x) - m; xx <= x + w + m; xx++) if (isBase(xx, yy)) return true; return false; };
    const inPad = (x, y, w, h) => Math.hypot(x + w / 2 - padC[0], y + h / 2 - padC[1]) < padR + 2 + Math.max(w, h) / 2;
    const put = (k, x, y, w, h, solid, extra) => { props.push(Object.assign({ k, x, y, w, h, solid: !!solid }, extra || {})); boxes.push([x, y, x + w, y + h]); };
    const place = (k, w, h, solid, tries, area, extra, pad) => {
      for (let i = 0; i < tries; i++) {
        const x = area[0] + rnd() * (area[2] - area[0] - w), y = area[1] + rnd() * (area[3] - area[1] - h);
        if (x < 1.5 || y < 1.5 || x + w > W - 1.5 || y + h > H - 1.5) continue;
        if (baseNear(x, y, w, h, 3) || near(x, y, w, h, pad == null ? 1 : pad) || inPad(x, y, w, h)) continue;
        if (solid && onTrack(x + w / 2, y + h / 2, 3.2)) continue;
        put(k, Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h, solid, extra); return true;
      }
      return false;
    };
    // Estructuras fijas (iguales en ambos escenarios, con la misma lógica de base)
    put('pad', padC[0] - padR, padC[1] - padR, padR * 2, padR * 2, false);
    // Paneles solares: campos estratégicos
    const arrays = mars ? [[88, 2, 108, 11], [3, 60, 22, 70], [84, 60, 106, 70]] : [[84, 2, 108, 10], [30, 2, 44, 9], [2, 2, 22, 9]];
    for (const a of arrays) for (let x = a[0]; x + 3 <= a[2]; x += 4.5) for (let y = a[1]; y + 2.2 <= a[3]; y += 3.4) if (!baseNear(x, y, 3, 2, 2) && !onTrack(x + 1.5, y + 1, 2.5)) put('solar', x, y, 3, 2, true, { tilt: rnd() });
    // Antenas de comunicaciones
    (mars ? [[24, 5], [64, 5]] : [[50, 5], [64, 7], [12, 12]]).forEach((p) => { if (!baseNear(p[0], p[1], 2, 2, 1)) put('antenna', p[0], p[1], 2, 2, true, { dish: rnd() * 6 }); });
    // Contenedores de suministro y módulos auxiliares
    [[96, 63, 2, 1], [98, 63, 2, 1], [97, 64.5, 2, 1], [100, 66, 2, 1]].forEach((b, i) => put('container', b[0], b[1], b[2] + 0.5, b[3] + 0.5, true, { c: i }));
    put('auxdome', 10, 62, 4, 4, true); put('auxtank', 16, 66, 3, 3, true); put('auxdome', mars ? 24 : 20, 72, 4, 4, true, { shelter: true });
    put('tripod', 86, 71, 2, 2, true); put('tripod', 28, 62, 2, 2, true, { s: 1 });
    // Vehículos aparcados
    put('vehicle', 48, 74, 4, 3, true, { v: 0 }); put('vehicle', mars ? 66 : 64, 73, 4, 3, true, { v: 1 });
    // Rocas y formaciones
    const nBig = mars ? 26 : 18, nSmall = mars ? 70 : 90;
    for (let i = 0; i < nBig; i++) place(mars ? 'mesa' : 'rock', mars ? 2.5 + rnd() * 2.5 : 1.6 + rnd() * 1.4, mars ? 2 + rnd() * 2 : 1.4 + rnd() * 1.2, true, 20, mars ? [0, 0, W, H] : [0, 0, W, H], { r: rnd() }, 1);
    for (let i = 0; i < nSmall; i++) place('pebble', 0.6 + rnd() * 0.7, 0.5 + rnd() * 0.5, false, 8, [0, 0, W, H], { r: rnd() }, 0.2);
    // Cráteres (la Luna: muchos y marcados; Marte: pocos y erosionados) y dunas (solo Marte)
    const craters = [], dunes = [];
    const nCr = mars ? 7 : 30;
    for (let i = 0; i < nCr; i++) {
      const r = mars ? 2 + rnd() * 3 : 1.2 + rnd() * (i < 8 ? 6.5 : 2.4), x = r + rnd() * (W - 2 * r), y = r + rnd() * (H - 2 * r);
      if (baseNear(x - r, y - r, r * 2, r * 2, 2) || onTrack(x, y, r + 1.5) || Math.hypot(x - padC[0], y - padC[1]) < padR + r) continue;
      craters.push({ x, y, r });
    }
    if (mars) for (let i = 0; i < 16; i++) {
      const w = 6 + rnd() * 10, x = rnd() * (W - w), y = rnd() * (H - 4);
      if (baseNear(x, y - 2, w, 6, 2)) continue;
      dunes.push({ x, y, w, a: rnd() * 0.5 - 0.25 });
    }
    // Luces exteriores
    const lamps = [[52, 70.5], [59.5, 70.5], [48, 77], [64, 77], [40, 54], [3, 44], [108, 44], [56, 11]];
    return { props, tracks, craters, dunes, pad: { c: padC, r: padR }, lamps };
  }

  return { W, H, has, ROOMS, ROOMCOL, LINKS, SHELTER, LOCK, START, FURN, CONSOLES, PLANTERS, SPOTS, SAMPLES_OUT, REACTOR_C, scenery, R, RR, CH };
})();
