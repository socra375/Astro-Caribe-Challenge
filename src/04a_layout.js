
/* =====================================================================
   LAYOUT — arquitectura original de la base: tres módulos (habitabilidad,
   científico y técnico) con salas de formas distintas, túneles presurizados,
   bahía con esclusa y terreno exterior. Todo son datos: World los convierte
   en cuadrícula, colisiones, puertas y rutas, y el arte los dibuja.
   Unidades: baldosas de 32 px.
   ===================================================================== */
const Layout = (function () {
  const OX = 12, OY = 10; // margen de terreno alrededor de la base
  const W = 136, H = 100;
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
    reactor: { s: [CH(84, -5, 121, 42, 6)], g: 'tec', floor: 'hazard', col: ['#3a2414', '#432a17'] },
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

  // Puertas: [sala A, sala B, x, y de la puerta, tipo]. World comprueba que la posición es una frontera real entre ambas salas.
  const LINKS = [['bridge', 'hall', 55, 25], ['bridge', 'water', 66, 18], ['hall', 'life', 43, 28], ['hall', 'food', 69, 28], ['hall', 'kitchen', 49, 31], ['hall', 'kitchen', 62, 31], ['life', 'med', 43, 46], ['kitchen', 'med', 49, 44], ['med', 'food', 69, 47], ['water', 'food', 73, 24], ['life', 'samples', 33, 48], ['lab', 'samples', 23, 50], ['workshop', 'waste', 96, 50], ['rad', 'life', 37, 51], ['rad', 'med', 56, 51], ['rad', 'food', 73, 51], ['gh', 't1', 29, 30], ['t1', 'life', 33, 30], ['gh', 't2', 12, 41], ['t2', 'lab', 12, 44], ['water', 't3', 79, 19], ['t3', 'reactor', 83, 19], ['reactor', 't4', 89, 41], ['t4', 'workshop', 89, 44], ['reactor', 't5', 101, 41], ['t5', 'waste', 101, 44], ['rad', 't6', 79, 53], ['t6', 'workshop', 83, 53], ['rad', 'lock', 55, 67, 'inner'], ['lock', 'pad', 55, 70, 'outer']];

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
    ['tank', 23, 33, 2, 2], ['tank', 6, 33, 2, 2], ['seedrack', 21, 22, 6, 2], ['seedrack', 21, 26, 6, 2], ['bin', 8, 36, 2, 2], ['pipe', 6, 22, 14, 1], ['pipe', 6, 28, 14, 1], ['seedrack', 10, 33, 6, 2], ['seedrack', 17, 33, 4, 2], ['vent', 15, 36, 2, 2], ['vent', 20, 37, 2, 2],
    // Laboratorio
    ['benchs', 8, 48, 6, 2], ['benchs', 15, 48, 6, 2], ['table', 8, 53, 4, 2], ['table', 15, 53, 4, 2], ['rack', 20, 53, 2, 2],
    // Almacén de muestras
    ['cabinet', 25, 47, 3, 2], ['cabinet', 29, 47, 3, 2], ['table', 26, 53, 4, 2], ['cold', 29, 51, 3, 3],
    // Reactor
    ['warn', 90, 5, 28, 27], ['catwalk', 92, 7, 24, 2], ['catwalk', 92, 28, 24, 2], ['catwalk', 92, 9, 2, 19], ['catwalk', 114, 9, 2, 19],
    ['pipe', 92, 1, 1, 6], ['pipe', 99, 1, 1, 6], ['pipe', 108, 1, 1, 6], ['pipe', 115, 1, 1, 6],
    ['reactor', 96, 11, 14, 14], ['coolant', 90, -3, 4, 4], ['coolant', 97, -3, 4, 4], ['coolant', 106, -3, 4, 4], ['coolant', 113, -3, 4, 4],
    ['turbine', 86, 2, 4, 4], ['turbine', 116, 2, 4, 4], ['turbine', 86, 31, 4, 4], ['turbine', 116, 31, 4, 4],
    ['transformer', 85, 9, 3, 3], ['transformer', 85, 14, 3, 3], ['transformer', 85, 19, 3, 3], ['transformer', 117, 9, 3, 3], ['transformer', 117, 14, 3, 3], ['transformer', 117, 19, 3, 3],
    ['holo', 96, 35, 7, 3], ['rack', 86, 38, 2, 3], ['rack', 116, 38, 2, 3], ['battery', 105, 35, 2, 2], ['battery', 108, 35, 2, 2], ['vent', 88, 24, 2, 2], ['vent', 118, 24, 2, 2],
    // Taller
    ['benchs', 85, 47, 6, 2], ['tools', 91, 47, 3, 2], ['lathe', 90, 52, 4, 3], ['crate', 85, 55, 3, 2],
    // Residuos
    ['bin', 98, 47, 2, 2], ['bin', 104, 47, 2, 2], ['recycler', 100, 52, 5, 3], ['crate', 98, 54, 2, 2],
    // Bahía del rover
    ['rover', 36, 55, 6, 4], ['tools', 36, 61, 4, 2], ['benchs', 47, 63, 6, 1], ['pipe', 36, 53, 41, 1], ['crate', 47, 57, 2, 2], ['crate', 50, 57, 2, 2], ['crate', 47, 60, 2, 2], ['vent', 58, 56, 2, 2], ['vent', 46, 64, 2, 1], ['suitrack', 51, 65, 3, 1]
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
    ['reactor', 'reactor', 99, 39, 'manage', '⚛️'], ['solar', 'reactor', 92, 39, 'play', '☀️'], ['balance', 'reactor', 110, 39, 'play', '⚖️'],
    ['work', 'workshop', 93, 49, 'manage', '🛠'], ['wastec', 'waste', 105, 50, 'manage', '♻️'],
    ['rover', 'rad', 43, 56, 'explore', '🚙'], ['isru', 'rad', 44, 62, 'manage', '🧊'], ['shield', 'rad', 60, 58, 'manage', '🛡️'], ['lock', 'lock', 58, 65, 'interact', '🚪'], ['suit', 'rad', 54, 65, 'equip', '🧑‍🚀']
  ];
  // Invernadero: seis jardineras de 3×2 (los índices de bed los usa la simulación)
  const PLANTERS = [[7, 19], [12, 19], [17, 19], [7, 25], [12, 25], [17, 25]];
  // Puestos de trabajo de los NPC por sala (celdas de referencia; World elige la libre más cercana)
  const SPOTS = { bridge: [[56, 21], [52, 20]], hall: [[52, 28], [60, 28]], life: [[38, 31], [38, 44]], med: [[52, 49], [60, 49]], water: [[72, 16], [75, 22]], kitchen: [[58, 35], [52, 40]],
    food: [[73, 30], [73, 40]], gh: [[10, 23], [20, 23], [14, 35]], lab: [[12, 50], [18, 50]], samples: [[28, 55], [30, 49]], reactor: [[96, 36], [111, 36], [103, 4]], workshop: [[88, 50], [92, 55]], waste: [[101, 50], [100, 56]],
    rad: [[48, 59], [66, 54], [56, 62]] };
  const SAMPLES_OUT = { moon: [[47.5, 75.5], [66.5, 77.5], [41.5, 79], [72.5, 73.5]], mars: [[45.5, 76.5], [69.5, 78.5], [38.5, 74], [74.5, 74.5]] };
  const REACTOR_C = [103, 18];

  /** Terreno exterior: rutas de exploración (huellas del rover), estructuras y geografía propia de cada escenario. Determinista. */
  function scenery(scen, isBase) {
    let seed = scen === 'mars' ? 90210 : 4242;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const mars = scen === 'mars', X = (v) => v + OX, Y = (v) => v + OY;
    const props = [], boxes = [];
    const T = (pts) => pts.map((p) => [X(p[0]), Y(p[1])]);
    const tracks = [
      T([[55.5, 71], [55.5, 74], [56, 78]]), T([[55.5, 74], [34, 76], [16, 72], [8, 66], [2, 56]]), T([[56, 78], [80, 78], [96, 72], [104, 66], [118, 60]]),
      T([[55.5, 74], [48, 70], [30, 68], [22, 60]]), T([[80, 78], [92, 62], [100, 70]]), T([[56, 76], [58, 64.2]]),
      T([[96, 72], [112, 82], [124, 84]]), T([[34, 76], [30, 86], [40, 92]])
    ];
    const padC = [X(56), Y(78)], padR = 6.5;
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
    put('pad', padC[0] - padR, padC[1] - padR, padR * 2, padR * 2, false);
    // Paneles solares en campos estratégicos (la Luna: junto al ecuador de la base, al norte y al este; Marte: campos grandes al este y al sur)
    const arrays = mars ? [[96, 4, 128, 16], [76, 100 - OY - 8, 100, 92]] : [[84, -2, 116, 6], [24, -2, 46, 6], [2, -2, 22, 8], [112, 38, 126, 60]];
    for (const a of arrays) for (let x = X(a[0]); x + 3 <= X(a[2]); x += 4.5) for (let y = Y(a[1]); y + 2.2 <= Y(a[3]); y += 3.4) if (y > 1.5 && x + 3 <= W - 2 && y + 2 <= H - 2 && !baseNear(x, y, 3, 2, 2) && !onTrack(x + 1.5, y + 1, 2.5)) put('solar', x, y, 3, 2, true, { tilt: rnd() });
    // Antenas de comunicaciones
    (mars ? [[24, 3], [64, 4], [-6, 40]] : [[50, 3], [64, 5], [12, 8], [116, 20]]).forEach((q) => { if (!baseNear(X(q[0]), Y(q[1]), 2, 2, 1)) put('antenna', X(q[0]), Y(q[1]), 2, 2, true, { dish: rnd() * 6 }); });
    // Contenedores de suministro, módulos auxiliares y equipos científicos
    [[96, 63, 2, 1], [98, 63, 2, 1], [97, 64.5, 2, 1], [100, 66, 2, 1], [102, 63, 2, 1]].forEach((b, i) => put('container', X(b[0]), Y(b[1]), b[2] + 0.5, b[3] + 0.5, true, { c: i }));
    put('auxdome', X(10), Y(62), 4, 4, true); put('auxtank', X(16), Y(66), 3, 3, true); put('auxdome', X(mars ? 24 : 20), Y(72), 4, 4, true, { shelter: true });
    put('auxtank', X(104), Y(52), 3, 3, true); put('auxdome', X(114), Y(46), 4, 4, true);
    put('tripod', X(86), Y(71), 2, 2, true); put('tripod', X(28), Y(62), 2, 2, true, { s: 1 }); put('tripod', X(110), Y(70), 2, 2, true, { s: 1 });
    put('vehicle', X(48), Y(74), 4, 3, true, { v: 0 });
    // Geografía propia: la Luna con cráteres marcados y bloques sueltos; Marte con dunas, mesas y polvo
    const craters = [], dunes = [];
    if (mars) {
      [[118, 74, 18], [112, 4, 14], [8, 86, 14], [40, 84, 10], [-2, 20, 8]].forEach((q) => dunes.push({ x: q[0] + 6, y: q[1] + 4, w: q[2] + 4, a: rnd() * 0.5 - 0.25 }));
      for (let i = 0, n = 0; i < 400 && n < 6; i++) { const k = { x: 8 + rnd() * (W - 16), y: 8 + rnd() * (H - 16), r: 2 + rnd() * 3 }; if (!baseNear(k.x - k.r, k.y - k.r, k.r * 2, k.r * 2, 2) && !onTrack(k.x, k.y, k.r + 1.5)) { craters.push(k); n++; } }
      [[4, 24], [128, 40], [120, 88], [4, 66]].forEach((q) => { for (let k = 0; k < 5; k++) place('mesa', 3 + rnd() * 3, 2.4 + rnd() * 2, true, 12, [q[0] - 6, q[1] - 7, q[0] + 8, q[1] + 8], { r: rnd() }, 0.3); });
    } else {
      [[22, 14, 9], [124, 24, 8], [112, 90, 11], [10, 84, 7], [70, 6, 6], [126, 66, 6], [92, 94, 5]].forEach((q) => craters.push({ x: q[0], y: q[1], r: q[2] }));
      for (let i = 0, n = 0; i < 800 && n < 26; i++) { const k = { x: 4 + rnd() * (W - 8), y: 4 + rnd() * (H - 8), r: 1.2 + rnd() * 2.6 }; if (!baseNear(k.x - k.r, k.y - k.r, k.r * 2, k.r * 2, 2) && !onTrack(k.x, k.y, k.r + 1.5) && Math.hypot(k.x - padC[0], k.y - padC[1]) > padR + k.r) { craters.push(k); n++; } }
    }
    const nBig = mars ? 22 : 30, nSmall = mars ? 130 : 160;
    for (let i = 0; i < nBig; i++) place(mars ? 'mesa' : 'rock', mars ? 2.5 + rnd() * 2.5 : 1.6 + rnd() * 1.6, mars ? 2 + rnd() * 2 : 1.4 + rnd() * 1.4, true, 20, [0, 0, W, H], { r: rnd() }, 1);
    for (let i = 0; i < nSmall; i++) place('pebble', 0.6 + rnd() * 0.7, 0.5 + rnd() * 0.5, false, 8, [0, 0, W, H], { r: rnd() }, 0.2);
    const okC = craters.filter((k) => !(baseNear(k.x - k.r, k.y - k.r, k.r * 2, k.r * 2, 2) || onTrack(k.x, k.y, k.r + 1.5) || Math.hypot(k.x - padC[0], k.y - padC[1]) < padR + k.r));
    const okD = dunes.filter((u) => !baseNear(u.x, u.y - 2, u.w, 6, 2));
    const lamps = [[52, 70.5], [59.5, 70.5], [48, 77], [64, 77], [40, 54], [3, 44], [108, 44], [56, 11], [92, 62], [20, 70]].map((q) => [X(q[0]), Y(q[1])]);
    return { props, tracks, craters: okC, dunes: okD, pad: { c: padC, r: padR }, lamps };
  }

  // Desplazamiento de todo el diseño para dejar un margen de terreno alrededor de la base
  for (const k in ROOMS) for (const sp of ROOMS[k].s) { sp.x0 += OX; sp.x1 += OX; sp.y0 += OY; sp.y1 += OY; }
  for (const f of FURN) { f[1] += OX; f[2] += OY; }
  for (const c of CONSOLES) { c[2] += OX; c[3] += OY; }
  for (const q of PLANTERS) { q[0] += OX; q[1] += OY; }
  for (const k in SPOTS) for (const q of SPOTS[k]) { q[0] += OX; q[1] += OY; }
  for (const k in SAMPLES_OUT) for (const q of SAMPLES_OUT[k]) { q[0] += OX; q[1] += OY; }
  for (const q of LINKS) { q[2] += OX; q[3] += OY; }
  SHELTER[0] += OX; SHELTER[1] += OY; SHELTER[2] += OX; SHELTER[3] += OY;
  LOCK.x += OX; LOCK.inY += OY; LOCK.outY += OY; START[0] += OX; START[1] += OY; REACTOR_C[0] += OX; REACTOR_C[1] += OY;

  /* ---------- Pisos ----------
     La base de siempre se reparte entre tres pisos sin tocar la forma de las salas: cada sala, mueble, consola y puerta
     pasa al piso de su sala. El piso 2 es la planta baja (esclusa, garaje y exterior) y conserva sus coordenadas, así el
     terreno exterior, el rover y la nave no cambian. Cada piso tiene un elevador de tripulación (sala elc1/elc2/elc3). */
  const FLOOR_OF = { bridge: 1, hall: 1, life: 1, med: 1, kitchen: 1, food: 1, water: 1, gh: 1, lab: 1, samples: 1, t1: 1, t2: 1, elc1: 1, rad: 2, lock: 2, workshop: 2, waste: 2, t6: 2, elc2: 2, reactor: 3, elc3: 3 };
  for (const k of ['t3', 't4', 't5']) delete ROOMS[k]; // los túneles hacia el reactor los sustituye el elevador
  const ELV = { 1: [80, 33, 83, 38], 2: [80, 59, 83, 64], 3: [79, 25, 82, 30] };
  for (const f of [1, 2, 3]) { const e = ELV[f]; ROOMS['elc' + f] = { s: [RR(e[0] + OX, e[1] + OY, e[2] + OX, e[3] + OY, 1)], g: f === 1 ? 'hab' : 'tec', floor: f === 1 ? 'clean' : 'plate', col: f === 1 ? ['#2a3350', '#303a5c'] : ['#2e3138', '#34373f'] }; }
  CONSOLES.push(['tele', 'bridge', 57 + OX, 22 + OY, 'use', '🌀']);
  // botón de llamada del elevador, fuera de la cabina y junto a su puerta
  CONSOLES.push(['call1', 'food', 91, 44, 'use', '🔔'], ['call2', 'rad', 91, 70, 'use', '🔔'], ['call3', 'reactor', 95, 36, 'use', '🔔']); // en la pared, justo encima de cada puerta
  LINKS.push(['food', 'elc1', 79 + OX, 35 + OY], ['rad', 'elc2', 79 + OX, 61 + OY], ['reactor', 'elc3', 83 + OX, 27 + OY]);
  for (const f of [1, 2, 3]) { const e = ELV[f]; CONSOLES.push(['elev' + f, 'elc' + f, Math.round((e[0] + e[2]) / 2) + OX, e[1] + OY, 'use', '🛗']); SPOTS['elc' + f] = [[(e[0] + e[2]) / 2 + OX, (e[1] + e[3]) / 2 + OY]]; }
  ROOMCOL.elc1 = ROOMCOL.elc2 = ROOMCOL.elc3 = '#b9c2e0';
  const fl = (r) => FLOOR_OF[r] || 1;
  const roomOfPt = (x, y) => { for (const k in ROOMS) for (const sp of ROOMS[k].s) if (has(sp, x, y)) return k; return null; };
  const FNAME = { 1: { es: 'Piso 1 · Operaciones', en: 'Floor 1 · Operations' }, 2: { es: 'Piso 2 · Exploración', en: 'Floor 2 · Exploration' }, 3: { es: 'Piso 3 · Energía', en: 'Floor 3 · Energy' } };
  // Nivel G · Garaje del rover (suelo 4): sala transitable bajo la plataforma exterior. No tiene elevador de tripulación: se llega con la plataforma del rover o por la escalera de servicio.
  FLOOR_OF.garage = 4;
  ROOMS.garage = { s: [RR(82, 62, 119, 85, 3)], g: 'tec', floor: 'bay', col: ['#23283a', '#2a3044'] };
  ROOMCOL.garage = '#c9ced8'; FNAME[4] = { es: 'Nivel G · Garaje', en: 'Level G · Garage' };
  FURN.push(['dock', 92, 71, 9, 7], ['pipe', 84, 64, 33, 1], ['tools', 84, 66, 4, 2], ['benchs', 104, 66, 6, 2], ['rack', 114, 66, 2, 3], ['battery', 85, 81, 2, 2], ['battery', 88, 81, 2, 2], ['battery', 91, 81, 2, 2], ['crate', 110, 79, 2, 2], ['crate', 113, 79, 2, 2], ['crate', 110, 82, 2, 2], ['vent', 84, 72, 2, 2], ['vent', 116, 72, 2, 2], ['lockers', 84, 76, 2, 3], ['holo', 98, 80, 5, 2]);
  CONSOLES.push(['glift', 'garage', 91, 69, 'use', '🛗'], ['gcon', 'garage', 100, 66, 'manage', '🔧'], ['gstairs', 'garage', 112, 69, 'use', '🪜']);
  SPOTS.garage = [[112, 72], [96, 80]];
  // Nivel 3A · Pasarela del núcleo (suelo 5): la doble altura del reactor. Es un nivel superior real y caminable (anillo de pasarela sobre el reactor); el piso 3 deja de tener la pasarela dibujada a ras de suelo.
  for (let i = FURN.length - 1; i >= 0; i--) if (FURN[i][0] === 'catwalk') FURN.splice(i, 1);
  FLOOR_OF.cat = 5;
  ROOMS.cat = { s: [R(104, 17, 127, 18), R(104, 38, 127, 39), R(104, 19, 105, 37), R(126, 19, 127, 37)], g: 'tec', floor: 'grate', col: ['#2c2f3a', '#33374a'] };
  ROOMCOL.cat = '#ff9a3d'; FNAME[5] = { es: 'Nivel 3A · Pasarela del núcleo', en: 'Level 3A · Core catwalk' };
  const upper = (...a) => { a.fl = 5; return a; };
  FURN.push(upper('catwalk', 104, 17, 24, 2), upper('catwalk', 104, 38, 24, 2), upper('catwalk', 104, 19, 2, 19), upper('catwalk', 126, 19, 2, 19));
  CONSOLES.push(['cinsp', 'cat', 116, 18, 'investigate', '🔭'], ['cdn', 'cat', 126, 29, 'use', '🪜'], ['cup', 'reactor', 125, 29, 'use', '🪜']);
  SPOTS.cat = [[126, 31]];
  const FLOORS = [1, 2, 3, 4, 5].map((id) => {
    const rooms = {}; for (const k in ROOMS) if (fl(k) === id) rooms[k] = ROOMS[k];
    const real = (r) => r === 'pad' || rooms[r];
    return {
      id, name: FNAME[id], ground: id === 2, ROOMS: rooms,
      LINKS: LINKS.filter((l) => real(l[0]) && real(l[1]) && (l[0] === 'pad' || l[1] === 'pad' || (fl(l[0]) === id && fl(l[1]) === id))),
      FURN: FURN.filter((f) => (f.fl || fl(roomOfPt(f[1] + f[3] / 2, f[2] + f[4] / 2) || 'bridge')) === id),
      CONSOLES: CONSOLES.filter((c) => fl(c[1]) === id), PLANTERS: id === 1 ? PLANTERS : [], SHELTER: id === 2 ? SHELTER : null,
      elev: (SPOTS['elc' + id] || (id === 5 ? SPOTS.cat : SPOTS.garage))[0], elevRoom: id === 4 ? 'garage' : id === 5 ? 'cat' : 'elc' + id, below: id === 5 ? 3 : 0
    };
  });
  const roomFloor = (r) => fl(r);
  return { W, H, OX, OY, has, FLOORS, roomFloor, FNAME, ROOMS, ROOMCOL, LINKS, SHELTER, LOCK, START, FURN, CONSOLES, PLANTERS, SPOTS, SAMPLES_OUT, REACTOR_C, scenery, R, RR, CH };
})();
