/* =====================================================================
   FIELD — terreno de exploración exterior (Luna / Marte): rocas, cráteres,
   zonas de suelo, rutas, puntos de interés, muestras, repetidores y
   refugios. Determinista por escenario. El terreno se dibuja por bloques
   (chunks) en caché; los objetos interactivos se dibujan en vivo.
   Coordenadas en baldosas, en el mismo sistema que la base (World).
   ===================================================================== */
const Field = (function () {
  const TS = 32, CK = 16, W = Layout.W, H = Layout.H;
  const B = { x0: -72, y0: -48, x1: W + 72, y1: H + 112 };
  const PAD = [68, 88];
  const T = (es, en) => ({ es, en });
  const inRect = (x, y, m) => x > -(m || 0) && y > -(m || 0) && x < W + (m || 0) && y < H + (m || 0);

  /* ---------- Datos por escenario ---------- */
  const POI = {
    moon: [
      { id: 'p1', k: 'icecrater', x: 42, y: 132, r: 7.5, n: T('Cráter Aurora', 'Aurora Crater'), d: T('Un cráter con el fondo en sombra permanente: ahí podría haber hielo de agua.', 'A crater with a permanently shadowed floor: water ice may hide there.') },
      { id: 'p2', k: 'lava', x: 104, y: 134, r: 8, n: T('Colada de basalto', 'Basalt flow'), d: T('Roca volcánica antigua que cuenta cómo era el interior de la Luna.', 'Ancient volcanic rock that tells what the Moon interior was like.') },
      { id: 'p3', k: 'seismo', x: 166, y: 92, r: 5, n: T('Estación sísmica SG-2', 'Seismic station SG-2'), d: T('Un sismómetro que escucha los «lunamotos».', 'A seismometer that listens to moonquakes.') },
      { id: 'p4', k: 'lander', x: -34, y: 104, r: 6, n: T('Módulo de aterrizaje antiguo', 'Old lander'), d: T('Una sonda abandonada: sirve para estudiar cómo envejecen los materiales.', 'An abandoned probe: useful to study how materials age.') },
      { id: 'p5', k: 'mesa', x: 8, y: -22, r: 7, n: T('Meseta de anortosita', 'Anorthosite plateau'), d: T('Roca clara de la corteza primitiva lunar.', 'Light rock from the early lunar crust.') },
      { id: 'p6', k: 'ejecta', x: 182, y: 40, r: 7, n: T('Cresta de eyecciones', 'Ejecta ridge'), d: T('Bloques lanzados por un gran impacto.', 'Blocks thrown out by a large impact.') }
    ],
    mars: [
      { id: 'p1', k: 'delta', x: 38, y: 130, r: 8, n: T('Delta fósil', 'Fossil delta'), d: T('Capas de sedimento donde antes pudo correr agua.', 'Sediment layers where water may once have flowed.') },
      { id: 'p2', k: 'hematite', x: 110, y: 128, r: 8, n: T('Mesa de hematita', 'Hematite mesa'), d: T('Una mesa con minerales de hierro rojizos.', 'A mesa with reddish iron minerals.') },
      { id: 'p3', k: 'weather', x: 168, y: 90, r: 5, n: T('Estación meteorológica MW-1', 'Weather station MW-1'), d: T('Mide viento, polvo y temperatura del aire.', 'Measures wind, dust and air temperature.') },
      { id: 'p4', k: 'canyon', x: -36, y: 106, r: 7, n: T('Cañón de arcilla', 'Clay canyon'), d: T('Un cañón con arcillas: indican agua en el pasado.', 'A canyon with clays: they point to water in the past.') },
      { id: 'p5', k: 'dune', x: 4, y: -24, r: 8, n: T('Duna barján', 'Barchan dune'), d: T('Una duna en forma de media luna moldeada por el viento.', 'A crescent dune shaped by the wind.') },
      { id: 'p6', k: 'boulders', x: 184, y: 38, r: 7, n: T('Campo de bloques', 'Boulder field'), d: T('Bloques caídos de una pared erosionada.', 'Blocks fallen from an eroded wall.') }
    ]
  };
  const REPEATERS = { moon: [{ id: 'rA', x: 70, y: 150 }, { id: 'rB', x: 150, y: 62 }, { id: 'rC', x: -22, y: 46 }, { id: 'rD', x: -22, y: 114 }], mars: [{ id: 'rA', x: 70, y: 150 }, { id: 'rB', x: 150, y: 62 }, { id: 'rC', x: -22, y: 46 }, { id: 'rD', x: -22, y: 114 }] };
  const SHELTERS = { moon: [{ id: 'sA', x: 96, y: 144 }, { id: 'sB', x: -26, y: 96 }, { id: 'sC', x: 150, y: 90 }], mars: [{ id: 'sA', x: 98, y: 142 }, { id: 'sB', x: -24, y: 98 }, { id: 'sC', x: 152, y: 88 }] };
  const TRAILS = [
    [[68, 94], [68, 110], [62, 120], [42, 132]], [[68, 110], [90, 122], [104, 134]], [[80, 94], [110, 100], [140, 100], [166, 92]],
    [[60, 94], [30, 100], [0, 104], [-34, 104]], [[-34, 104], [-30, 40], [-12, 0], [8, -22]], [[140, 100], [170, 70], [182, 40]],
    [[68, 110], [70, 150]], [[166, 92], [150, 62]], [[96, 144], [104, 134]], [[-34, 104], [-26, 96]], [[-30, 42], [-22, 46]], [[-34, 104], [-22, 114]]
  ];
  // [id, tipo, x, y, oculta, interés]
  const SITES = {
    moon: [['f01', 'regolith', 54, 112, 0, 1], ['f02', 'rock', 98, 130, 0, 2], ['f03', 'rock', 110, 138, 1, 2], ['f04', 'mineral', 118, 130, 1, 3], ['f05', 'ice', 40, 134, 0, 3], ['f06', 'ice', 46, 128, 1, 3], ['f07', 'regolith', 36, 122, 0, 2],
      ['f08', 'rock', 10, -20, 0, 2], ['f09', 'rock', 186, 44, 0, 2], ['f10', 'regolith', 160, 96, 0, 1], ['f11', 'mineral', 170, 100, 1, 2], ['f12', 'rock', -30, 108, 0, 2], ['f13', 'regolith', -38, 100, 1, 2], ['f14', 'mineral', 76, 120, 1, 3], ['f15', 'regolith', 140, 120, 0, 1]],
    mars: [['f01', 'sediment', 40, 128, 0, 3], ['f02', 'sediment', 32, 134, 1, 3], ['f03', 'rock', 60, 112, 0, 1], ['f04', 'mineral', 112, 126, 0, 3], ['f05', 'mineral', 104, 134, 1, 2], ['f06', 'rock', 118, 134, 0, 2], ['f07', 'regolith', 4, -22, 0, 1],
      ['f08', 'sediment', -34, 108, 0, 2], ['f09', 'mineral', -40, 102, 1, 2], ['f10', 'rock', 182, 44, 0, 2], ['f11', 'regolith', 160, 96, 0, 1], ['f12', 'mineral', 172, 84, 1, 2], ['f13', 'rock', 140, 122, 0, 2], ['f14', 'sediment', -20, 90, 0, 2], ['f15', 'regolith', 90, 150, 0, 1]]
  };
  const KG = { regolith: 0.8, rock: 1.8, mineral: 1.2, sediment: 1.0, ice: 0.9 };
  const CAT = { regolith: 'regolith', sediment: 'regolith', rock: 'rock', mineral: 'rock', ice: 'ice' };
  const KIND_T = {
    regolith: T('Regolito', 'Regolith'), rock: T('Roca', 'Rock'), mineral: T('Mineral', 'Mineral'), sediment: T('Sedimento', 'Sediment'), ice: T('Hielo de agua', 'Water ice')
  };
  const SITE_N = {
    moon: { f01: T('Regolito fino junto a la ruta', 'Fine regolith by the route'), f02: T('Basalto vesicular', 'Vesicular basalt'), f03: T('Basalto con olivino', 'Olivine-bearing basalt'), f04: T('Ilmenita (hierro y titanio)', 'Ilmenite (iron and titanium)'), f05: T('Hielo de agua del cráter sombreado', 'Shadowed-crater water ice'), f06: T('Escarcha de agua bajo el borde', 'Water frost under the rim'), f07: T('Regolito de cráter reciente', 'Fresh-crater regolith'), f08: T('Anortosita de la meseta', 'Plateau anorthosite'), f09: T('Brecha de impacto', 'Impact breccia'), f10: T('Regolito calentado por el Sol', 'Sun-heated regolith'), f11: T('Piroxeno', 'Pyroxene'), f12: T('Roca junto al módulo', 'Rock beside the lander'), f13: T('Polvo cargado de electricidad', 'Electrostatic dust'), f14: T('Vidrio volcánico', 'Volcanic glass'), f15: T('Regolito profundo', 'Deep regolith') },
    mars: { f01: T('Lutita laminada del delta', 'Laminated delta mudstone'), f02: T('Arcilla con capas finas', 'Thin-layered clay'), f03: T('Basalto marciano', 'Martian basalt'), f04: T('Hematita gris', 'Gray hematite'), f05: T('Veta de sulfato', 'Sulfate vein'), f06: T('Roca de la mesa', 'Mesa rock'), f07: T('Arena de duna', 'Dune sand'), f08: T('Limo cementado', 'Cemented silt'), f09: T('Sales del cañón', 'Canyon salts'), f10: T('Bloque erosionado', 'Weathered block'), f11: T('Regolito rojizo', 'Reddish regolith'), f12: T('Olivino', 'Olivine'), f13: T('Roca con vetas', 'Veined rock'), f14: T('Barro seco con grietas', 'Cracked dried mud'), f15: T('Polvo fino de tormenta', 'Fine storm dust') }
  };
  const SITE_D = {
    regolith: T('Polvo y fragmentos finos del suelo. Guarda la historia de la radiación y los impactos.', 'Fine soil dust and fragments. It records radiation and impact history.'),
    rock: T('Un fragmento de roca para fechar y comparar con las de la Tierra.', 'A rock fragment to date and compare with Earth rocks.'),
    mineral: T('Un mineral simulado: sirve para saber de qué está hecho el suelo.', 'A simulated mineral: it tells what the ground is made of.'),
    sediment: T('Capas de material depositado: pistas sobre agua y clima antiguos.', 'Layers of deposited material: clues about ancient water and climate.'),
    ice: T('Hielo de agua: un recurso para beber, respirar y fabricar combustible.', 'Water ice: a resource for drinking, breathing and making fuel.')
  };
  const WHY = { 1: T('Interés bajo: muestra de referencia.', 'Low interest: reference sample.'), 2: T('Interés medio: aporta datos útiles.', 'Medium interest: gives useful data.'), 3: T('Interés alto: puede cambiar lo que sabemos.', 'High interest: may change what we know.') };

  /* ---------- Generación ---------- */
  let sc = 'moon', G = null, hash = null, chunks = new Map(), chunkQ = 0;
  const rngOf = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  const cellKey = (cx, cy) => cx * 4096 + cy;
  function addObs(o) { G.obs.push(o); const x0 = Math.floor((o.x - o.r) / 4), x1 = Math.floor((o.x + o.r) / 4), y0 = Math.floor((o.y - o.r) / 4), y1 = Math.floor((o.y + o.r) / 4); for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const k = cellKey(cx, cy); (hash.get(k) || hash.set(k, []).get(k)).push(o); } }
  function distSeg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; let u = ((px - ax) * dx + (py - ay) * dy) / l2; u = Math.max(0, Math.min(1, u)); return Math.hypot(px - (ax + dx * u), py - (ay + dy * u)); }
  const trailDist = (x, y) => { let m = 1e9; for (const t of TRAILS) for (let i = 1; i < t.length; i++) m = Math.min(m, distSeg(x, y, t[i - 1][0], t[i - 1][1], t[i][0], t[i][1])); return m; };
  const BASE_TRAILS = TRAILS.length;
  let SHIP = null; // plataforma de la nave: [x, y] (se fija antes de generar el terreno)
  function init(s, pad) {
    sc = s === 'mars' ? 'mars' : 'moon'; chunks = new Map(); hash = new Map();
    SHIP = pad ? { x: pad[0], y: pad[1] } : null; TRAILS.length = BASE_TRAILS; if (SHIP) TRAILS.push([[68, 110], [SHIP.x, SHIP.y]]);
    const mars = sc === 'mars', rnd = rngOf(mars ? 777 : 313);
    G = { obs: [], craters: [], zones: [], dunes: [], pois: POI[sc].map((p) => Object.assign({}, p)), rep: REPEATERS[sc].map((p) => Object.assign({}, p)), shel: SHELTERS[sc].map((p) => Object.assign({}, p)), sites: [], pebbles: [] };
    // muestras: las del entorno de la base (mismas posiciones que ya existían) y las de las zonas de exploración
    const KINDS = ['regolith', 'rock', 'regolith', 'ice', 'rock', 'regolith', 'rock', 'regolith'];
    Layout.SAMPLES_OUT[sc].forEach((p, i) => G.sites.push({ id: 'n' + (i + 1), kind: mars && KINDS[i] === 'ice' ? 'rock' : KINDS[i % KINDS.length], x: p[0], y: p[1], hidden: false, int: 1, near: true }));
    SITES[sc].forEach((s) => G.sites.push({ id: s[0], kind: s[1], x: s[2], y: s[3], hidden: !!s[4], int: s[5] }));
    for (const s of G.sites) {
      const nm = SITE_N[sc][s.id]; s.name = nm || (s.kind === 'rock' ? T('Roca cercana a la base', 'Rock near the base') : T('Regolito cercano a la base', 'Regolith near the base'));
      let best = null, bd = 16; for (const p of G.pois) { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = p; } } s.poi = best ? best.id : null;
    }
    // cráteres grandes (el rover no los cruza) y pequeños
    const bigC = mars ? [[22, 112, 9], [124, 108, 8], [-18, 126, 10], [150, 138, 11], [30, 160, 9]] : [[26, 110, 9], [122, 110, 8], [-18, 126, 10], [150, 140, 11], [30, 160, 9], [90, 168, 8]];
    for (const c of bigC) if (trailDist(c[0], c[1]) > c[2] + 1.5 && !(SHIP && Math.hypot(c[0] - SHIP.x, c[1] - SHIP.y) < c[2] + 6)) { G.craters.push({ x: c[0], y: c[1], r: c[2], big: true }); addObs({ x: c[0], y: c[1], r: c[2] * 0.7, rover: true, t: 'crater' }); }
    for (const p of G.pois) if (p.k === 'icecrater') { G.craters.push({ x: p.x, y: p.y, r: p.r, ice: true }); }
    const okFree = (x, y, m) => !inRect(x, y, 4 + (m || 0)) && !(SHIP && Math.hypot(x - SHIP.x, y - SHIP.y) < 9 + (m || 0)) && trailDist(x, y) > 3.6 + (m || 0) && Math.hypot(x - PAD[0], y - PAD[1]) > 12 && G.pois.every((p) => Math.hypot(p.x - x, p.y - y) > p.r * 0.5 + 3) && G.sites.every((s) => Math.hypot(s.x - x, s.y - y) > 2.2) && G.rep.every((q) => Math.hypot(q.x - x, q.y - y) > 4) && G.shel.every((q) => Math.hypot(q.x - x, q.y - y) > 4.5);
    for (let i = 0; i < 70; i++) { const c = { x: B.x0 + 4 + rnd() * (B.x1 - B.x0 - 8), y: B.y0 + 4 + rnd() * (B.y1 - B.y0 - 8), r: 1.6 + rnd() * 3.4 }; if (okFree(c.x, c.y, c.r) && G.craters.every((q) => Math.hypot(q.x - c.x, q.y - c.y) > q.r + c.r + 1)) G.craters.push(c); }
    // zonas de suelo (movilidad)
    const Z = mars ? [['sand', 130, 110, 18, 10], ['sand', 60, 142, 14, 9], ['sand', -22, 72, 14, 10], ['sand', 8, -8, 16, 10], ['slope', 90, 160, 16, 6], ['slope', 176, 60, 10, 14]] : [['deep', 140, 122, 16, 9], ['deep', 30, 150, 14, 8], ['deep', -12, 36, 12, 9], ['deep', 176, 100, 12, 8], ['deep', 74, 132, 10, 6]];
    for (const z of Z) G.zones.push({ k: z[0], x: z[1], y: z[2], rx: z[3], ry: z[4] });
    if (mars) for (let i = 0; i < 16; i++) G.dunes.push({ x: B.x0 + 8 + rnd() * (B.x1 - B.x0 - 16), y: B.y0 + 8 + rnd() * (B.y1 - B.y0 - 16), w: 8 + rnd() * 12, a: rnd() * 0.6 - 0.3 });
    // rocas sólidas y guijarros
    const nRock = mars ? 190 : 230;
    for (let i = 0, n = 0; i < 4000 && n < nRock; i++) {
      const r = mars ? 1 + rnd() * 2.2 : 0.55 + rnd() * 1.25, x = B.x0 + 2 + rnd() * (B.x1 - B.x0 - 4), y = B.y0 + 2 + rnd() * (B.y1 - B.y0 - 4);
      if (!okFree(x, y, r) || G.obs.some((o) => !o.rover && Math.hypot(o.x - x, o.y - y) < o.r + r + 0.8)) continue;
      addObs({ x, y, r, t: mars ? 'mesa' : 'rock', v: rnd() }); n++;
    }
    for (let i = 0; i < 700; i++) { const x = B.x0 + rnd() * (B.x1 - B.x0), y = B.y0 + rnd() * (B.y1 - B.y0); if (!inRect(x, y, 2)) G.pebbles.push({ x, y, s: 0.25 + rnd() * 0.45, v: rnd() }); }
    for (const p of G.pois) if (p.k === 'lander' || p.k === 'seismo' || p.k === 'weather') addObs({ x: p.x, y: p.y, r: p.k === 'lander' ? 1.6 : 0.8, t: 'equip' });
    for (const q of G.rep) addObs({ x: q.x, y: q.y, r: 0.9, t: 'equip' });
    for (const q of G.shel) addObs({ x: q.x, y: q.y, r: 2.3, t: 'dome' });
    if (SHIP) addObs({ x: SHIP.x, y: SHIP.y, r: 3.1, t: 'ship' });
  }

  /* ---------- Consultas ---------- */
  function hit(x, y, r, rover) {
    if (!G) return false;
    const x0 = Math.floor((x - r - 3) / 4), x1 = Math.floor((x + r + 3) / 4), y0 = Math.floor((y - r - 3) / 4), y1 = Math.floor((y + r + 3) / 4);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const L = hash.get(cellKey(cx, cy)); if (!L) continue; for (const o of L) { if (o.rover && !rover) continue; if (Math.hypot(o.x - x, o.y - y) < o.r + r) return true; } }
    return false;
  }
  const PLAIN = { k: 'plain', f: 1, r: 1 };
  const GR = { deep: { k: 'deep', f: 0.72, r: 0.6 }, sand: { k: 'sand', f: 0.8, r: 0.68 }, slope: { k: 'slope', f: 0.7, r: 0.55 }, crater: { k: 'crater', f: 0.65, r: 0.55 } };
  function ground(x, y) {
    if (!G || inRect(x, y)) return PLAIN;
    for (const z of G.zones) { const dx = (x - z.x) / z.rx, dy = (y - z.y) / z.ry; if (dx * dx + dy * dy < 1) return GR[z.k]; }
    for (const c of G.craters) if (!c.big && Math.hypot(x - c.x, y - c.y) < c.r) return GR.crater;
    return PLAIN;
  }
  const near = (x, y, list, r) => list.filter((o) => Math.hypot(o.x - x, o.y - y) < r);
  /** Texto y datos de una muestra de campo. */
  function info(s) { return { name: s.name, kind: KIND_T[s.kind], desc: SITE_D[s.kind], why: WHY[s.int], kg: KG[s.kind] }; }
  /** Coordenadas simuladas: 25 m por baldosa, con origen en la plataforma de la base. */
  function coord(x, y, es) { const e = Math.round((x - PAD[0]) * 25), n = Math.round((PAD[1] - y) * 25), sg = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toLocaleString(es === false ? 'en-US' : 'es-DO'); return (es === false ? 'E ' : 'E ') + sg(e) + ' m · N ' + sg(n) + ' m'; }

  /* ---------- Terreno por bloques ---------- */
  function palette() { return sc === 'mars' ? { base: '#9a5230', dark: '#6e3820', light: '#c27a47', dust: '216,150,98', rock: ['#7a3d22', '#a85a35', '#4f2616'] } : { base: '#686970', dark: '#44454b', light: '#8d8e96', dust: '170,170,180', rock: ['#5a5b62', '#8a8b93', '#34353b'] }; }
  function drawRock(c, o, P) {
    const x = o.x * TS, y = o.y * TS, r = o.r * TS, v = o.v || 0;
    c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(x + r * 0.45, y + r * 0.55, r * 1.05, r * 0.6, 0.2, 0, 7); c.fill();
    c.beginPath(); const n = 7; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + v * 2, rr = r * (0.82 + 0.3 * Math.sin(i * 12.9 + v * 40)); i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.86) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.86); } c.closePath();
    const g = c.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, P.rock[1]); g.addColorStop(1, P.rock[2]); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(x - r * 0.25, y - r * 0.3, r * 0.4, r * 0.22, -0.4, 0, 7); c.fill();
  }
  function buildChunk(cx, cy) {
    const cv = document.createElement('canvas'); cv.width = cv.height = CK * TS; const c = cv.getContext('2d'), P = palette(), mars = sc === 'mars';
    const ox = cx * CK * TS, oy = cy * CK * TS, rnd = rngOf(((cx * 73856093) ^ (cy * 19349663) ^ (mars ? 55 : 9)) >>> 0 || 7);
    c.translate(-ox, -oy);
    c.fillStyle = P.base; c.fillRect(ox, oy, CK * TS, CK * TS);
    { // manchas tonales por regiones globales: se solapan entre bloques vecinos y no se ven las costuras
      const RG = 12 * TS;
      for (let gy = Math.floor((oy - 340) / RG); gy <= Math.floor((oy + CK * TS + 340) / RG); gy++) for (let gx = Math.floor((ox - 340) / RG); gx <= Math.floor((ox + CK * TS + 340) / RG); gx++) {
        const rr = rngOf(((gx * 92837111) ^ (gy * 689287499) ^ (mars ? 31 : 17)) >>> 0 || 5);
        for (let i = 0; i < 2; i++) { const x = gx * RG + rr() * RG, y = gy * RG + rr() * RG, r = 120 + rr() * 220, d = rr() < 0.5; if (x + r < ox || x - r > ox + CK * TS || y + r < oy || y - r > oy + CK * TS) continue; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, d ? P.dark + '55' : P.light + '40'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
      }
    }
    for (let i = 0; i < 520; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,' + (0.06 + rnd() * 0.12) + ')' : 'rgba(255,255,255,' + (0.04 + rnd() * 0.09) + ')'; c.fillRect(ox + rnd() * CK * TS, oy + rnd() * CK * TS, 1 + rnd() * 2.2, 1 + rnd() * 1.6); }
    const vis = (x, y, r) => x * TS + r * TS > ox && x * TS - r * TS < ox + CK * TS && y * TS + r * TS > oy && y * TS - r * TS < oy + CK * TS;
    for (const z of G.zones) if (vis(z.x, z.y, Math.max(z.rx, z.ry))) {
      c.save(); c.translate(z.x * TS, z.y * TS); c.scale(z.rx * TS, z.ry * TS); const g = c.createRadialGradient(0, 0, 0.1, 0, 0, 1);
      if (z.k === 'deep') { g.addColorStop(0, 'rgba(30,30,36,.42)'); g.addColorStop(0.8, 'rgba(30,30,36,.25)'); } else if (z.k === 'sand') { g.addColorStop(0, 'rgba(' + P.dust + ',.34)'); g.addColorStop(0.8, 'rgba(' + P.dust + ',.2)'); } else { g.addColorStop(0, 'rgba(60,24,12,.34)'); g.addColorStop(0.8, 'rgba(60,24,12,.18)'); }
      g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); c.restore();
      c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1; for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, d = rnd() * 0.85; const px = (z.x + Math.cos(a) * d * z.rx) * TS, py = (z.y + Math.sin(a) * d * z.ry) * TS; c.beginPath(); c.moveTo(px - 10, py); c.quadraticCurveTo(px, py - 4, px + 12, py + 1); c.stroke(); }
    }
    for (const u of G.dunes) if (vis(u.x, u.y, u.w)) { const x = u.x * TS, y = u.y * TS, ww = u.w * TS, hh = (1.2 + u.w * 0.12) * TS; c.save(); c.translate(x, y); c.rotate(u.a); c.fillStyle = 'rgba(70,28,14,.28)'; c.beginPath(); c.ellipse(ww / 2, hh * 0.65, ww / 2, hh * 0.55, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(' + P.dust + ',.30)'; c.beginPath(); c.ellipse(ww / 2, hh * 0.5, ww / 2, hh * 0.5, 0, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(' + P.dust + ',.5)'; c.lineWidth = 2; c.beginPath(); c.ellipse(ww / 2, hh * 0.5, ww / 2, hh * 0.5, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.restore(); }
    for (const k of G.craters) if (vis(k.x, k.y, k.r * 1.5)) {
      const x = k.x * TS, y = k.y * TS, r = k.r * TS, g = c.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
      g.addColorStop(0, k.ice ? 'rgba(20,34,60,.75)' : mars ? 'rgba(60,24,12,.36)' : 'rgba(10,10,16,.62)'); g.addColorStop(0.75, k.ice ? 'rgba(30,44,70,.5)' : mars ? 'rgba(60,24,12,.22)' : 'rgba(20,20,26,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.lineWidth = Math.max(2, r * 0.07); c.strokeStyle = 'rgba(255,255,255,' + (mars ? 0.16 : 0.26) + ')'; c.beginPath(); c.arc(x, y, r, Math.PI * 0.95, Math.PI * 1.75); c.stroke(); c.strokeStyle = 'rgba(0,0,0,' + (mars ? 0.22 : 0.34) + ')'; c.beginPath(); c.arc(x, y, r, -Math.PI * 0.1, Math.PI * 0.7); c.stroke();
      if (k.ice) { c.fillStyle = 'rgba(190,230,255,.28)'; for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, d = rnd() * r * 0.6; c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + rnd() * 3, 1.5 + rnd() * 2); } }
    }
    // rutas: huellas paralelas de rover con marcas de rodadura
    c.lineCap = 'round';
    for (const t of TRAILS) for (let i = 1; i < t.length; i++) {
      const a = t[i - 1], b = t[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      if (Math.max(a[0], b[0]) * TS < ox - 40 || Math.min(a[0], b[0]) * TS > ox + CK * TS + 40 || Math.max(a[1], b[1]) * TS < oy - 40 || Math.min(a[1], b[1]) * TS > oy + CK * TS + 40) continue;
      c.strokeStyle = mars ? 'rgba(60,24,12,.30)' : 'rgba(20,20,26,.30)'; c.lineWidth = 3.2;
      for (const s of [-0.62, 0.62]) { c.beginPath(); c.moveTo((a[0] + nx * s) * TS, (a[1] + ny * s) * TS); c.lineTo((b[0] + nx * s) * TS, (b[1] + ny * s) * TS); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1.2; for (let u = 0; u < l; u += 0.7) for (const s of [-0.62, 0.62]) { const px = (a[0] + (b[0] - a[0]) * u / l + nx * s) * TS, py = (a[1] + (b[1] - a[1]) * u / l + ny * s) * TS; c.beginPath(); c.moveTo(px - nx * 4, py - ny * 4); c.lineTo(px + nx * 4, py + ny * 4); c.stroke(); }
    }
    c.lineCap = 'butt';
    // rasgos de los puntos de interés
    for (const p of G.pois) if (vis(p.x, p.y, p.r * 1.3)) poiGround(c, p, P, rnd);
    for (const q of G.pebbles) if (vis(q.x, q.y, 1)) { c.fillStyle = q.v < 0.5 ? P.rock[1] : P.rock[0]; c.beginPath(); c.ellipse(q.x * TS, q.y * TS, q.s * TS * 0.5, q.s * TS * 0.34, q.v * 3, 0, 7); c.fill(); }
    for (const o of G.obs) if ((o.t === 'rock' || o.t === 'mesa') && vis(o.x, o.y, o.r + 1)) drawRock(c, o, P);
    return cv;
  }
  function poiGround(c, p, P, rnd) {
    const x = p.x * TS, y = p.y * TS, r = p.r * TS; c.save();
    if (p.k === 'lava') { const g = c.createRadialGradient(x, y, 0, x, y, r * 1.2); g.addColorStop(0, 'rgba(18,18,24,.7)'); g.addColorStop(1, 'rgba(18,18,24,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, r * 1.3, r * 0.8, 0.3, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 1.5; for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.7, 8 + rnd() * 20, 0.3, 2.6); c.stroke(); } }
    else if (p.k === 'delta') { c.fillStyle = 'rgba(214,176,128,.38)'; c.beginPath(); c.moveTo(x - r * 1.2, y + r * 0.2); c.quadraticCurveTo(x, y - r * 1.1, x + r * 1.2, y + r * 0.5); c.quadraticCurveTo(x, y + r * 0.2, x - r * 1.2, y + r * 0.2); c.fill(); c.strokeStyle = 'rgba(110,60,30,.35)'; c.lineWidth = 1.5; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(x - r * (1.1 - i * 0.07), y + r * 0.2 - i * 6); c.quadraticCurveTo(x, y - r * (0.9 - i * 0.1), x + r * (1.1 - i * 0.08), y + r * 0.5 - i * 6); c.stroke(); } }
    else if (p.k === 'hematite' || p.k === 'mesa') { c.fillStyle = 'rgba(40,24,22,.45)'; c.beginPath(); c.ellipse(x + 6, y + 8, r * 1.1, r * 0.7, 0, 0, 7); c.fill(); c.fillStyle = p.k === 'mesa' ? 'rgba(200,200,205,.5)' : 'rgba(90,50,44,.7)'; c.beginPath(); c.ellipse(x, y, r * 1.05, r * 0.66, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r * 1.05, r * 0.66, 0, Math.PI, Math.PI * 1.8); c.stroke(); }
    else if (p.k === 'canyon') { c.strokeStyle = 'rgba(40,16,8,.7)'; c.lineWidth = r * 0.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - r * 1.3, y - r * 0.3); c.quadraticCurveTo(x, y + r * 0.6, x + r * 1.3, y - r * 0.2); c.stroke(); c.strokeStyle = 'rgba(255,200,150,.2)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - r * 1.3, y - r * 0.55); c.quadraticCurveTo(x, y + r * 0.35, x + r * 1.3, y - r * 0.45); c.stroke(); }
    else if (p.k === 'dune') { c.fillStyle = 'rgba(' + P.dust + ',.42)'; c.beginPath(); c.arc(x, y, r * 1.1, Math.PI * 0.15, Math.PI * 1.05); c.arc(x + r * 0.2, y - 6, r * 0.7, Math.PI * 1.0, Math.PI * 0.2, true); c.fill(); c.strokeStyle = 'rgba(' + P.dust + ',.7)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r * 1.1, Math.PI * 0.2, Math.PI * 1.0); c.stroke(); }
    else if (p.k === 'ejecta' || p.k === 'boulders') { for (let i = 0; i < 12; i++) { const o = { x: p.x + (rnd() - 0.5) * p.r * 1.8, y: p.y + (rnd() - 0.5) * p.r * 1.2, r: 0.35 + rnd() * 0.5, v: rnd() }; drawRock(c, o, P); } }
    else if (p.k === 'icecrater') { /* el cráter ya se dibuja en la lista */ }
    else if (p.k === 'lander') { c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.ellipse(x, y, r * 1.1, r * 0.8, 0, 0, 7); c.fill(); }
    c.restore();
  }
  function ensureChunk(cx, cy, budget) { const k = cx + ',' + cy; let ch = chunks.get(k); if (ch) { ch.u = chunkQ; return ch.cv; } if (!budget.n) return null; budget.n--; ch = { cv: buildChunk(cx, cy), u: chunkQ }; chunks.set(k, ch); if (chunks.size > 48) { let oldest = null; for (const [kk, v] of chunks) if (!oldest || v.u < oldest[1].u) oldest = [kk, v]; if (oldest && oldest[1].u < chunkQ - 2) chunks.delete(oldest[0]); } return ch.cv; }
  /** Dibuja el terreno visible (la base se pinta encima, con bordes difuminados). */
  function drawTerrain(ctx, cx, cy, vw, vh) {
    if (!G) return;
    const P = palette(); ctx.fillStyle = P.base; ctx.fillRect(cx, cy, vw, vh); chunkQ++;
    const x0 = Math.floor(cx / (CK * TS)), x1 = Math.floor((cx + vw) / (CK * TS)), y0 = Math.floor(cy / (CK * TS)), y1 = Math.floor((cy + vh) / (CK * TS)), budget = { n: 2 };
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const bx = gx * CK, by = gy * CK;
      if (bx >= 7 && by >= 7 && bx + CK <= W - 7 && by + CK <= H - 7) continue; // cubierto por la base
      if (bx < B.x0 - CK || by < B.y0 - CK || bx > B.x1 || by > B.y1) continue;
      const cv = ensureChunk(gx, gy, budget); if (cv) ctx.drawImage(cv, bx * TS, by * TS);
    }
    // borde del mundo: se oscurece
    ctx.save(); ctx.fillStyle = 'rgba(2,4,12,.9)'; const e = TS * 3;
    if (cx < B.x0 * TS) ctx.fillRect(cx, cy, B.x0 * TS - cx, vh); if (cy < B.y0 * TS) ctx.fillRect(cx, cy, vw, B.y0 * TS - cy);
    if (cx + vw > B.x1 * TS) ctx.fillRect(B.x1 * TS, cy, cx + vw - B.x1 * TS, vh); if (cy + vh > B.y1 * TS) ctx.fillRect(cx, B.y1 * TS, vw, cy + vh - B.y1 * TS);
    ctx.restore();
  }
  function reset() { chunks = new Map(); }

  /* ---------- Objetos en vivo ---------- */
  const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  function sprite(c, k, x, y, t, st) {
    c.save(); c.translate(x, y);
    const sh = () => { c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(5, 6, 20, 9, 0, 0, 7); c.fill(); };
    if (k === 'seismo') { sh(); c.fillStyle = '#c9cfdc'; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill(); c.fillStyle = '#e6ebf5'; c.beginPath(); c.arc(0, -3, 11, Math.PI, 0); c.fill(); c.fillStyle = '#2b3550'; c.fillRect(-9, -2, 18, 4); c.strokeStyle = '#8c93a3'; c.lineWidth = 2; c.beginPath(); c.moveTo(8, -8); c.lineTo(18, -26); c.stroke(); c.fillStyle = (Math.sin(t * 4) > 0) ? '#6fffa0' : '#2c6b48'; c.beginPath(); c.arc(18, -27, 3, 0, 7); c.fill(); }
    else if (k === 'weather') { sh(); c.strokeStyle = '#aab2c4'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -34); c.stroke(); c.fillStyle = '#2b3550'; c.fillRect(-12, -18, 12, 8); c.fillStyle = '#4f7dff'; c.fillRect(-11, -17, 10, 6); c.save(); c.translate(0, -36); c.rotate(t * (sc === 'mars' ? 5 : 1.2)); c.strokeStyle = '#e6ebf5'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.rotate(2.094); c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.stroke(); c.fillStyle = '#ff8a2a'; c.beginPath(); c.arc(10, 0, 2.6, 0, 7); c.fill(); } c.restore(); }
    else if (k === 'lander') { sh(); c.strokeStyle = '#9aa2b4'; c.lineWidth = 3; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 10, 0); c.lineTo(s * 26, 14); c.stroke(); c.fillStyle = '#b7bfd0'; c.beginPath(); c.ellipse(s * 26, 15, 6, 3, 0, 0, 7); c.fill(); } c.fillStyle = '#d6b45a'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.39; i ? c.lineTo(Math.cos(a) * 18, Math.sin(a) * 15 - 4) : c.moveTo(Math.cos(a) * 18, Math.sin(a) * 15 - 4); } c.closePath(); c.fill(); c.strokeStyle = '#7a6224'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#e8ecf5'; c.beginPath(); c.arc(0, -4, 8, 0, 7); c.fill(); c.strokeStyle = '#8c93a3'; c.beginPath(); c.moveTo(0, -12); c.lineTo(10, -30); c.stroke(); c.beginPath(); c.ellipse(11, -32, 8, 4, -0.6, 0, 7); c.stroke(); }
    else if (k === 'rpt') { sh(); c.strokeStyle = '#b7bfd0'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-9, 8); c.lineTo(0, -44); c.lineTo(9, 8); c.stroke(); c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const yy = 2 - i * 11, ww = 8 - i * 1.7; c.beginPath(); c.moveTo(-ww, yy); c.lineTo(ww, yy - 6); c.moveTo(ww, yy); c.lineTo(-ww, yy - 6); c.stroke(); } c.save(); c.translate(0, -46); c.rotate(st ? t * 1.5 : 0.4); c.fillStyle = '#e6ebf5'; c.beginPath(); c.ellipse(0, 0, 11, 4, 0, 0, 7); c.fill(); c.strokeStyle = '#6a7390'; c.lineWidth = 1.5; c.stroke(); c.restore(); c.fillStyle = st ? (Math.sin(t * 5) > -0.2 ? '#6fffa0' : '#2c6b48') : (Math.sin(t * 3) > 0 ? '#ff5a5a' : '#6b2c2c'); c.beginPath(); c.arc(0, -52, 3.2, 0, 7); c.fill(); if (st) { c.strokeStyle = 'rgba(111,255,160,' + (0.5 - ((t * 0.8) % 1) * 0.5) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(0, -46, 8 + ((t * 0.8) % 1) * 30, 0, 7); c.stroke(); } }
    else if (k === 'shelter') { c.fillStyle = 'rgba(0,0,0,.36)'; c.beginPath(); c.ellipse(6, 9, 62, 26, 0, 0, 7); c.fill(); const g = c.createRadialGradient(-12, -16, 6, 0, 0, 62); g.addColorStop(0, '#dfe5f2'); g.addColorStop(1, '#7c86a0'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 58, Math.PI, 0); c.lineTo(58, 8); c.lineTo(-58, 8); c.closePath(); c.fill(); c.strokeStyle = '#4a526a'; c.lineWidth = 2.5; c.stroke(); c.save(); c.clip(); c.fillStyle = 'rgba(255,194,74,.55)'; for (let i = -6; i < 6; i++) { c.beginPath(); c.moveTo(i * 14, 8); c.lineTo(i * 14 + 8, 8); c.lineTo(i * 14 + 30, -60); c.lineTo(i * 14 + 22, -60); c.closePath(); c.fill(); } c.restore(); c.fillStyle = '#2b3550'; rrect(c, -9, -16, 18, 24, 5); c.fill(); c.fillStyle = (st && st.open) ? '#6fffa0' : '#ffc24a'; c.fillRect(-6, -13, 12, 4); c.fillStyle = '#ffc24a'; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText('☢ ' + st.id.toUpperCase().replace('S', 'R-'), 0, -40); }
    c.restore();
  }
  function siteSprite(c, s, x, y, t, scanned) {
    c.save(); c.translate(x, y); const k = s.kind;
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(2, 4, 11, 5, 0, 0, 7); c.fill();
    if (k === 'ice') { c.fillStyle = '#bfe6ff'; for (const p of [[-5, 0, 4], [3, -2, 5], [7, 3, 3]]) { c.beginPath(); c.moveTo(p[0], p[1] - p[2] * 2); c.lineTo(p[0] + p[2], p[1]); c.lineTo(p[0], p[1] + p[2] * 0.6); c.lineTo(p[0] - p[2], p[1]); c.closePath(); c.fill(); c.strokeStyle = '#eef9ff'; c.lineWidth = 1; c.stroke(); } }
    else if (k === 'mineral') { c.fillStyle = sc === 'mars' ? '#8a8a96' : '#7b6f9a'; c.beginPath(); c.moveTo(-8, 3); c.lineTo(-4, -7); c.lineTo(3, -5); c.lineTo(8, 3); c.closePath(); c.fill(); c.strokeStyle = '#2b2b36'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#ffe9a0'; if (Math.sin(t * 4 + x) > 0.3) { c.fillRect(-1, -5, 2, 2); c.fillRect(4, -1, 2, 2); } }
    else if (k === 'sediment') { for (let i = 0; i < 3; i++) { c.fillStyle = ['#d3b48a', '#b4875a', '#c9a074'][i]; rrect(c, -9 + i, -6 + i * 3.4, 18 - i * 2, 3.6, 1.6); c.fill(); } }
    else if (k === 'rock') { c.fillStyle = sc === 'mars' ? '#7a3d22' : '#6a6b72'; c.beginPath(); c.moveTo(-8, 3); c.lineTo(-6, -4); c.lineTo(0, -8); c.lineTo(7, -3); c.lineTo(8, 3); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(-3, -5, 4, 2); }
    else { c.fillStyle = sc === 'mars' ? '#7a3d22' : '#4a4b52'; c.beginPath(); c.ellipse(0, 1, 10, 5, 0, 0, 7); c.fill(); c.fillStyle = sc === 'mars' ? '#a85a35' : '#7c7d86'; c.beginPath(); c.ellipse(-1, -1, 7, 3, 0, 0, 7); c.fill(); }
    const a = 0.5 + 0.5 * Math.sin(t * 3 + x * 0.1); c.strokeStyle = 'rgba(111,255,160,' + (0.35 + 0.35 * a) + ')'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 15 + 2 * a, 0, 7); c.stroke();
    if (scanned) { c.fillStyle = '#6fffa0'; c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.fillText('✦', 0, -14 - 2 * a); }
    c.restore();
  }
  /** Entidades dinámicas ordenadas por profundidad. */
  function ents(ctx, S, t, cam, vw, vh, ex) {
    if (!G) return [];
    const out = [], vis = (x, y, m) => x * TS > cam.x - m && x * TS < cam.x + vw + m && y * TS > cam.y - m && y * TS < cam.y + vh + m;
    for (const p of G.pois) if (vis(p.x, p.y, 120) && ['seismo', 'weather', 'lander'].includes(p.k)) out.push({ y: p.y, f: () => sprite(ctx, p.k, p.x * TS, p.y * TS, t, 0) });
    if (SHIP && S && vis(SHIP.x, SHIP.y, 200)) out.push({ y: SHIP.y + 1.5, f: () => LandArt.shipWorld(ctx, SHIP.x * TS, SHIP.y * TS, t, S) });
    for (const q of G.rep) if (vis(q.x, q.y, 120)) out.push({ y: q.y, f: () => sprite(ctx, 'rpt', q.x * TS, q.y * TS, t, !!(ex && ex.rep && ex.rep[q.id])) });
    for (const q of G.shel) if (vis(q.x, q.y, 140)) out.push({ y: q.y, f: () => sprite(ctx, 'shelter', q.x * TS, q.y * TS, t, { id: q.id, open: ex && ex.inShel === q.id }) });
    for (const s of G.sites) {
      if (ex && ex.taken && ex.taken[s.id]) continue;
      if (s.hidden && !(ex && ex.rev && ex.rev[s.id])) continue;
      if (vis(s.x, s.y, 40)) out.push({ y: s.y, f: () => siteSprite(ctx, s, s.x * TS, s.y * TS, t, !!(ex && ex.rev && ex.rev[s.id])) });
    }
    return out;
  }
  /** Postes-guía parpadeantes a lo largo de las rutas (reconocer el camino de regreso). */
  function guideLights(ctx, t, cam, vw, vh) {
    if (!G) return;
    for (const tr0 of TRAILS) for (let i = 1; i < tr0.length; i++) {
      const a = tr0[i - 1], b = tr0[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let u = 6; u < l; u += 12) { const x = (a[0] + (b[0] - a[0]) * u / l) * TS, y = (a[1] + (b[1] - a[1]) * u / l) * TS; if (x < cam.x - 20 || x > cam.x + vw + 20 || y < cam.y - 20 || y > cam.y + vh + 20) continue; ctx.fillStyle = '#2b3550'; ctx.fillRect(x - 1.5, y - 8, 3, 10); ctx.fillStyle = Math.sin(t * 3 + u) > 0 ? '#ffc24a' : '#6b4f1f'; ctx.beginPath(); ctx.arc(x, y - 10, 3, 0, 7); ctx.fill(); }
    }
  }

  return { B, PAD, TRAILS, get ship() { return SHIP; }, init, reset, hit, ground, near, info, coord, drawTerrain, ents, guideLights, KG, CAT, KIND_T, WHY, inRect,
    get G() { return G; }, get sc() { return sc; }, poi: (id) => G && G.pois.find((p) => p.id === id), site: (id) => G && G.sites.find((s) => s.id === id), rep: (id) => G && G.rep.find((r) => r.id === id) };
})();
