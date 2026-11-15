/* =====================================================================
   WORLD — la base (Layout) convertida en cuadrícula: colisiones, puertas,
   rutas por la cuadrícula real, esclusa, bots, cámara, render Canvas 2D,
   partículas y minimapa. El arte estático lo construye Art.
   ===================================================================== */
const World = (function () {
  const TS = 32, W = Layout.W, H = Layout.H;
  const WALL = 1, FLOOR = 2, DOOR = 3, OUT = 4;
  const SHELTER = Layout.SHELTER, LOCK = Layout.LOCK;
  const ROOMCOL = Layout.ROOMCOL;
  let grid = [], solid = [], roomAt = [], doors = [], furn = [], consoles = [], samples = [], props = [], scenery = null, RECTS = {};
  let staticCv = null, mapCv = null, scen = 'moon';
  const player = { x: Layout.START[0], y: Layout.START[1], dir: 2, moving: false, anim: 0, stepT: 0, act: null, actT: 0, role: 'commander' };
  let curS = null, marker = null;
  const MAIN = { bridge: 1, life: 1, gh: 1, reactor: 1, water: 1, rad: 1, lab: 1, food: 1, kitchen: 1, samples: 1, workshop: 1, waste: 1 };
  const locked = (room) => !!(curS && curS.camp && MAIN[room] && !curS.camp.unlocked[room]);
  let bots = [], parts = [], cam = { x: 0, y: 0, z: 1 }, airlock = { st: 'in', t: 0 }, lastT = 0, reduced = false, zoomMul = 1, fitAll = false;
  const isTube = (r) => /^t\d/.test(r || '');
  let camInit = false, camRT = 0, camCx = 0, camCy = 0, camZ = 1, veilCache = { room: null, d: null }, hullBuf = [], fxVeh = null, steamT = 0, boardAnim = null, shelIn = null, collect = null, camDrive = 0, noRov = false, needSuitT = -9;
  const fx = { scanT: 0, photoT: 0, scanR: 22 };
  /** Llegada de un vehículo: un rover regresa por la ruta del este hasta la plataforma. */
  function vehicleArrival() { const tr0 = scenery && scenery.tracks[2]; if (tr0) fxVeh = { t: 0, path: tr0.slice().reverse() }; }

  /* ---------- Construcción: formas → cuadrícula ---------- */
  function build() {
    grid = []; roomAt = []; solid = []; doors = []; furn = []; consoles = []; RECTS = {}; pathCache = {};
    for (let y = 0; y < H; y++) { grid.push(new Array(W).fill(OUT)); roomAt.push(new Array(W).fill('pad')); solid.push(new Array(W).fill(false)); }
    for (const k in Layout.ROOMS) {
      const def = Layout.ROOMS[k]; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (def.s.some((s) => Layout.has(s, x + 0.5, y + 0.5))) { grid[y][x] = FLOOR; roomAt[y][x] = k; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      RECTS[k] = [x0, y0, x1, y1];
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (grid[y][x] !== OUT) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W && grid[yy][xx] === FLOOR) { near = true; break; } }
      if (near) { grid[y][x] = WALL; roomAt[y][x] = null; }
    }
    // Puertas: se buscan en la frontera real entre dos salas (nunca sobre una esquina curva)
    const inRoom = (x, y, r) => y >= 0 && y < H && x >= 0 && x < W && (r === 'pad' ? grid[y][x] === OUT : roomAt[y][x] === r);
    for (const [a, b, px, py, kind] of Layout.LINKS) {
      const pref = [px, py];
      let best = null, bs = 1e9;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (grid[y][x] !== WALL) continue;
        if (grid[y][x + 1] === WALL && ((inRoom(x, y - 1, a) && inRoom(x + 1, y - 1, a) && inRoom(x, y + 1, b) && inRoom(x + 1, y + 1, b)) || (inRoom(x, y - 1, b) && inRoom(x + 1, y - 1, b) && inRoom(x, y + 1, a) && inRoom(x + 1, y + 1, a)))) { const sc = Math.hypot(x - pref[0], y - pref[1]); if (sc < bs) { bs = sc; best = { x, y, w: 2, h: 1, v: false }; } }
        if (grid[y + 1][x] === WALL && ((inRoom(x - 1, y, a) && inRoom(x - 1, y + 1, a) && inRoom(x + 1, y, b) && inRoom(x + 1, y + 1, b)) || (inRoom(x - 1, y, b) && inRoom(x - 1, y + 1, b) && inRoom(x + 1, y, a) && inRoom(x + 1, y + 1, a)))) { const sc = Math.hypot(x - pref[0], y - pref[1]); if (sc < bs) { bs = sc; best = { x, y, w: 1, h: 2, v: true }; } }
      }
      if (!best) throw new Error('puerta sin posición: ' + a + '-' + b);
      for (let yy = best.y; yy < best.y + best.h; yy++) for (let xx = best.x; xx < best.x + best.w; xx++) { grid[yy][xx] = DOOR; roomAt[yy][xx] = null; }
      doors.push(Object.assign(best, { open: 0, kind: kind || 'auto', rooms: [a, b], lock: false }));
    }
    // Mobiliario y consolas
    const F = (x, y, w, h, kind, o) => furn.push(Object.assign({ x, y, w, h, kind }, o || {}));
    for (const f of Layout.FURN) F(f[1], f[2], f[3], f[4], f[0]);
    Layout.PLANTERS.forEach((p, i) => F(p[0], p[1], 3, 2, 'planter', { bed: i }));
    for (const c of Layout.CONSOLES) { consoles.push({ id: c[0], room: c[1], x: c[2], y: c[3], verb: c[4], icon: c[5] }); F(c[2], c[3], 1, 1, 'console', { cid: c[0] }); }
    // Refugio contra la radiación: muros blindados con una entrada
    const S0 = SHELTER;
    for (let x = S0[0] - 1; x <= S0[2] + 1; x++) { F(x, S0[1] - 1, 1, 1, 'shieldwall'); F(x, S0[3] + 1, 1, 1, 'shieldwall'); }
    for (let y = S0[1]; y <= S0[3]; y++) { if (y !== S0[1] + 3 && y !== S0[1] + 4) F(S0[0] - 1, y, 1, 1, 'shieldwall'); F(S0[2] + 1, y, 1, 1, 'shieldwall'); }
    samples = []; Field.init(scen);
    // Terreno exterior
    scenery = Layout.scenery(scen, (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] !== OUT);
    props = scenery.props;
    // Solidez
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) solid[y][x] = grid[y][x] === WALL;
    for (const f of furn) if (!['window', 'pipe', 'vent', 'rug'].includes(f.kind)) for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) solid[y][x] = true;
    for (const p of props) if (p.solid) for (let y = Math.floor(p.y); y < Math.ceil(p.y + p.h); y++) for (let x = Math.floor(p.x); x < Math.ceil(p.x + p.w); x++) if (y > 0 && x > 0 && y < H - 1 && x < W - 1 && grid[y][x] === OUT) solid[y][x] = true;
    roomCache = {};
    // margen alrededor de la base: el rover no se pega al casco (el arte del casco es más grueso que la pared de colisión)
    hullBuf = [];
    for (let y = 0; y < H; y++) { hullBuf.push(new Array(W).fill(false)); for (let x = 0; x < W; x++) { if (grid[y][x] !== OUT) continue; for (let dy = -1; dy <= 1 && !hullBuf[y][x]; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W && grid[yy][xx] !== OUT) { hullBuf[y][x] = true; break; } } } }
  }

  /* ---------- Rutas por la cuadrícula real ---------- */
  let pathCache = {}, roomCache = {};
  const walk = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && !solid[y][x];
  /** Celda libre más cercana (opcionalmente dentro de una sala). */
  function standAt(x, y, room) {
    for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const cx = Math.floor(x) + dx, cy = Math.floor(y) + dy;
      if (walk(cx, cy) && grid[cy][cx] !== DOOR && (!room || roomAt[cy][cx] === room)) return [cx + 0.5, cy + 0.5];
    }
    return [x, y];
  }
  function spot(room, i) {
    const k = room + ':' + i; if (roomCache[k]) return roomCache[k];
    const L = Layout.SPOTS[room], p = L ? L[(i || 0) % L.length] : null;
    let v;
    if (p) v = standAt(p[0], p[1], room);
    else { const R = RECTS[room]; v = R ? standAt((R[0] + R[2] + 1) / 2, (R[1] + R[3] + 1) / 2, room) : [player.x, player.y]; }
    return (roomCache[k] = v);
  }
  const roomLock = (x, y) => { const r = roomAt[y][x]; return r && locked(r) ? r : null; };
  /** BFS por celdas; evita las salas bloqueadas (salvo la sala de origen). */
  function findPath(sx, sy, gx, gy) {
    sx = Math.floor(sx); sy = Math.floor(sy); gx = Math.floor(gx); gy = Math.floor(gy);
    if (!walk(sx, sy) && grid[sy][sx] !== DOOR) { const p = standAt(sx, sy); sx = Math.floor(p[0]); sy = Math.floor(p[1]); }
    const here = roomAt[sy][sx], N = W * H, prev = new Int32Array(N).fill(-2), q = new Int32Array(N);
    let qh = 0, qt = 0; prev[sy * W + sx] = -1; q[qt++] = sy * W + sx; const goal = gy * W + gx;
    const doorLocked = (x, y) => { for (const d of doors) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.rooms.some((r) => locked(r) && r !== here); return false; };
    while (qh < qt) {
      const c = q[qh++]; if (c === goal) break;
      const cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (!walk(nx, ny)) continue;
        const ni = ny * W + nx; if (prev[ni] !== -2) continue;
        const rl = roomLock(nx, ny); if (rl && rl !== here) continue;
        if (grid[ny][nx] === DOOR && doorLocked(nx, ny)) continue;
        prev[ni] = c; q[qt++] = ni;
      }
    }
    if (prev[goal] === -2) return null;
    const cells = []; for (let c = goal; c !== -1; c = prev[c]) cells.push([(c % W) + 0.5, ((c / W) | 0) + 0.5]);
    return smooth(cells.reverse());
  }
  const clearLine = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2); for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; for (const [ox, oy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) if (!walk(Math.floor(x + ox), Math.floor(y + oy))) return false; } return true; };
  function smooth(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !clearLine(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    return out;
  }
  const HOME = { commander: ['bridge', 'hall'], engineer: ['reactor', 'water', 'workshop'], scientist: ['lab', 'samples'], medic: ['med', 'life'], agri: ['gh', 'food'] };
  function mkBot(role, room, i) {
    const p = spot(room, i || 0);
    return { role, x: p[0], y: p[1], path: [], wait: 1 + (i || 0), dir: 2, anim: Math.random() * 5, task: 'wander', act: null, actT: 0, carry: false, work: false, goal: null };
  }
  /** Cambia el especialista del jugador: el elegido deja de ser NPC y el anterior queda junto al jugador. */
  function setPlayerRole(role) {
    if (role === player.role || !Chars.ROLES[role]) return false;
    const i = bots.findIndex((b) => b.role === role);
    if (i >= 0) bots.splice(i, 1);
    const nb = mkBot(player.role, 'bridge', 2);
    const p = standAt(player.x - 1.2, player.y, null); nb.x = p[0]; nb.y = p[1]; nb.wait = 2;
    bots.push(nb); player.role = role; player.act = 'celebrate'; player.actT = 1;
    return true;
  }
  const BOTCOL = { commander: '#d9a72b', engineer: '#ff8a2a', scientist: '#a58cff', medic: '#7ff0cf', agri: '#8fd14f' };
  function init(sc) {
    scen = sc; build(); staticCv = null; mapCv = null;
    player.x = Layout.START[0]; player.y = Layout.START[1]; player.dir = 2; player.role = 'commander'; marker = null;
    bots = ['engineer', 'scientist', 'medic', 'agri'].map((role, i) => mkBot(role, HOME[role][0], i));
    airlock = { st: 'in', t: 0 }; parts = []; camInit = false; veilCache = { room: null, d: null };
  }

  /* ---------- Colisión ---------- */
  function roverBlocks(x, y) {
    const E = curS && curS.ex; if (!E || E.rover.occ || boardAnim || noRov) return false;
    for (const b of Rover.body(E.rover.x, E.rover.y, E.rover.a)) if (Math.hypot(b[0] - x, b[1] - y) < b[2] * 0.95) return true;
    return false;
  }
  function blocked(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) { const B = Field.B; return x < B.x0 || y < B.y0 || x > B.x1 || y > B.y1 || Field.hit(x, y, 0, false) || roverBlocks(x, y); }
    if (grid[ty][tx] === DOOR) { const d = doorAt(tx, ty); return !d || d.open < 0.6; }
    return solid[ty][tx] || (grid[ty][tx] === OUT && roverBlocks(x, y));
  }
  function doorAt(x, y) { return doors.find((d) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h); }
  function canStand(x, y, r) { return !blocked(x - r, y - r) && !blocked(x + r, y - r) && !blocked(x - r, y + r) && !blocked(x + r, y + r); }
  function room(x, y) { const tx = Math.floor(x), ty = Math.floor(y); if (ty < 0 || ty >= H || tx < 0 || tx >= W) return null; const r = roomAt[ty][tx]; if (r) return r; const d = doorAt(tx, ty); return d ? 'hall' : null; }
  function inShelter(x, y) { return x >= SHELTER[0] && x <= SHELTER[2] + 1 && y >= SHELTER[1] && y <= SHELTER[3] + 1; }
  function zone() { const r = room(player.x, player.y); if (r === 'pad' || r === null) return 'outside'; if (inShelter(player.x, player.y)) return 'shelter'; return 'hab'; }
  function roomName(x, y) { const r = room(x, y); return isTube(r) ? 'hall' : r; }

  /* ---------- Actualización ---------- */
  function update(dt, S, inp) {
    lastT += dt; curS = S;
    const E = S ? Ex.ensure(S) : null; if (E && Rover.state() !== E.rover) { Rover.bind(S); shelIn = null; }
    if (marker && (marker.until < lastT || Math.hypot(player.x - marker.p[0], player.y - marker.p[1]) < 1.6)) marker = null;
    let vx = inp.x, vy = inp.y;
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const drive = !!(E && E.rover.occ) && !boardAnim;
    if (E) { const dd = Math.hypot(E.rover.x - Field.PAD[0], E.rover.y - Field.PAD[1]); E.rover.docked = dd < 11; }
    const sp = 4.4 * (E && E.suit.on ? Field.ground(player.x, player.y).f : 1);
    player.moving = !drive && !boardAnim && !shelIn && len > 0.15;
    if (shelIn && len > 0.5) leaveShelter();
    if (boardAnim) stepBoard(dt);
    if (collect) { if (len > 0.3 || !E || !E.suit.on) collect = null; else { collect.t += dt; player.act = 'interact'; player.actT = 0.2; if (collect.t >= collect.dur) { const cb = collect.done; collect = null; player.act = null; cb(); } } }
    if (fx.scanT > 0) fx.scanT -= dt; if (fx.photoT > 0) fx.photoT -= dt;
    if (drive) {
      const ev = Rover.update(dt, S, { thr: inp.thr || 0, str: inp.str || 0, stick: inp.stick || null }, roverFree);
      player.x = E.rover.x; player.y = E.rover.y; player.dir = Math.abs(Math.cos(E.rover.a)) > Math.abs(Math.sin(E.rover.a)) ? (Math.cos(E.rover.a) > 0 ? 1 : 3) : (Math.sin(E.rover.a) > 0 ? 2 : 0);
      if (ev.indexOf('bump') >= 0) Sfx.play('bad');
      fx.eng = (fx.eng || 0) + dt; if (fx.eng > 0.34 && Math.abs(E.rover.v) > 1) { fx.eng = 0; Sfx.play('engine'); }
    }
    if (player.moving && !boardAnim) {
      const nx = player.x + vx * sp * dt, ny = player.y + vy * sp * dt;
      if (canStand(nx, player.y, 0.3)) player.x = nx;
      if (canStand(player.x, ny, 0.3)) player.y = ny;
      player.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 1 : 3) : (vy > 0 ? 2 : 0);
      player.anim += dt * 8; player.stepT += dt;
      if (player.stepT > 0.32) { player.stepT = 0; Sfx.play('step'); }
    }
    if (!player.moving) player.anim += dt * 8;
    if (player.actT > 0) { player.actT -= dt; if (player.actT <= 0) player.act = null; }
    for (const b of bots) if (b.actT > 0) { b.actT -= dt; if (b.actT <= 0) b.act = null; }
    for (let i = 0; i < bots.length; i++) updateBot(bots[i], dt, S);
    // Puertas (horizontales y verticales)
    const ents = [player].concat(bots);
    for (const d of doors) {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      let want = false;
      for (const e of ents) if (Math.abs(e.x - cx) < 2.0 && Math.abs(e.y - cy) < 2.0) want = true;
      d.lock = d.rooms.some(locked);
      if (d.lock) want = false;
      if (d.kind === 'inner') want = want && airlock.st === 'in';
      if (d.kind === 'outer') want = want && airlock.st === 'out';
      const before = d.open;
      d.open = clampN(d.open + (want ? 3 : -3) * dt, 0, 1);
      if (before === 0 && d.open > 0) Sfx.play('door');
      if (!want) for (const e of ents) if (Math.floor(e.x) >= d.x && Math.floor(e.x) < d.x + d.w && Math.floor(e.y) >= d.y && Math.floor(e.y) < d.y + d.h) d.open = Math.max(d.open, 0.7);
    }
    // Esclusa: ciclado automático al acercarse
    if (airlock.st === 'cycle_out' || airlock.st === 'cycle_in') {
      airlock.t += dt;
      if (airlock.t >= 3) { airlock.st = airlock.st === 'cycle_out' ? 'out' : 'in'; airlock.t = 0; Sfx.play('info'); }
    } else {
      const rn = room(player.x, player.y);
      if (airlock.st === 'out' && rn === 'rad' && Math.abs(player.x - LOCK.x) < 2.2 && player.y > LOCK.inY - 1.2) cycleLock(true);
      if (airlock.st === 'in' && rn === 'pad' && Math.abs(player.x - LOCK.x) < 2.2 && player.y < LOCK.outY) cycleLock(true);
      // dentro de la cámara: el sentido de la marcha decide el ciclo (salir con traje / entrar presurizando)
      if (rn === 'lock' && player.moving && !boardAnim) {
        if (airlock.st === 'in' && player.dir === 2) { if (!E || E.suit.on) cycleLock(true); else needSuitT = lastT; }
        else if (airlock.st === 'out' && player.dir === 0) cycleLock(true);
      }
    }
    const rm = !reduced;
    if (rm && S) {
      const wc = Layout.ROOMS.water.s[0];
      if (Math.random() < dt * 6) spawnP(Layout.OX + 70 + Math.random() * 3, Layout.OY + 20 + Math.random(), '#7fe6ff', 'bub');
      for (const inc of S.inc) if (!inc.res && inc.fix && Math.random() < dt * 5) { const sp2 = spot(inc.room, 0); spawnP(sp2[0] + (Math.random() - 0.5) * 3, sp2[1] - 1 + Math.random(), '#ffd36b', 'spark'); }
      if (S.mods && S.mods.spe > 0 && Math.random() < dt * 20) spawnP(player.x + (Math.random() - 0.5) * 20, player.y - 8, '#ffef9a', 'ray');
    }
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.t < p.life);
  }
  function cycleLock(auto) {
    if (airlock.st === 'in') { if (!auto && curS && curS.ex && !curS.ex.suit.on) return 'nosuit'; airlock.st = 'cycle_out'; airlock.t = 0; Sfx.play('warn'); return true; }
    if (airlock.st === 'out') { airlock.st = 'cycle_in'; airlock.t = 0; Sfx.play('warn'); return true; }
    return false;
  }
  function spawnP(x, y, c, k) {
    if (parts.length > 220) return;
    const p = { x, y, c, k, t: 0, life: 1, vx: 0, vy: 0 };
    if (k === 'bub') { p.vy = -0.6; p.life = 1.6; }
    if (k === 'spark') { p.vx = (Math.random() - 0.5) * 3; p.vy = -1 - Math.random() * 2; p.life = 0.5; }
    if (k === 'ray') { p.vx = 0.8; p.vy = 14; p.life = 1.2; }
    if (k === 'steam') { p.vy = -0.5; p.vx = (Math.random() - 0.5) * 0.4; p.life = 1.6; }
    parts.push(p);
  }
  function updateBot(b, dt, S) {
    b.anim += dt * 7;
    if (!S) return;
    const c = S.crew.find((x) => x.role === b.role);
    let goal = null;
    if (c && c.zone === 'shelter' && !locked('rad')) { goal = b.role === 'medic' || b.role === 'agri' ? [SHELTER[0] + 6.5, SHELTER[1] + 3.5] : [SHELTER[0] + 9.5, SHELTER[1] + 6.5]; b.task = 'shelter'; }
    else if (b.role === 'engineer') {
      const inc = S.inc.find((i) => !i.res && i.fix && S.t >= i.from);
      if (inc && !locked(inc.room)) { goal = spot(inc.room, 0); b.task = 'repair'; } else b.task = 'wander';
    } else b.task = 'wander';
    if (!b.path.length) {
      if (goal) { if (Math.hypot(goal[0] - b.x, goal[1] - b.y) > 0.6) b.path = (findPath(b.x, b.y, goal[0], goal[1]) || []).slice(1); }
      else {
        b.wait -= dt;
        if (b.wait <= 0) {
          const night = S.t >= 24 && (S.t % 24 >= 23 || S.t % 24 < 5), here = roomAt[Math.floor(b.y)][Math.floor(b.x)];
          const rooms = (night ? ['life'] : HOME[b.role]).filter((k) => !locked(k) || k === here);
          if (rooms.length) { const k = rooms[Math.floor(Math.random() * rooms.length)], tg = spot(k, Math.floor(Math.random() * 3)); b.path = (findPath(b.x, b.y, tg[0], tg[1]) || []).slice(1); }
          b.wait = 3 + Math.random() * 6; b.work = Math.random() < 0.5;
        }
      }
    }
    if (b.path.length) {
      const n = b.path[0], dx = n[0] - b.x, dy = n[1] - b.y, d = Math.hypot(dx, dy), sp = 2.6 * dt;
      if (d <= sp) { b.x = n[0]; b.y = n[1]; b.path.shift(); }
      else { b.x += (dx / d) * sp; b.y += (dy / d) * sp; b.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); }
      b.moving = true;
    } else b.moving = false;
  }

  /* ---------- Interacción ---------- */
  function plantPos(bed, slot) { const f = furn.find((x) => x.kind === 'planter' && x.bed === bed); return f ? [f.x + 0.5 + slot, f.y + 1.45] : null; }
  function nearest() {
    let best = null, bd = 1.9;
    for (const f of furn) if (f.kind === 'planter') for (let k = 0; k < 3; k++) { const pp = [f.x + 0.5 + k, f.y + 1.45]; const d = Math.hypot(player.x - pp[0], player.y - pp[1]); if (d < 1.45 && d < bd + 0.3) { bd = Math.min(bd, d); best = { id: 'plant', bed: f.bed, slot: k, verb: 'investigate', icon: '🌱' }; } }
    for (const c of consoles) { const d = Math.hypot(player.x - (c.x + 0.5), player.y - (c.y + 0.5)); if (d < bd) { bd = d; best = c; } }
    for (const s of samples) if (!s.taken) { const d = Math.hypot(player.x - s.x, player.y - s.y); if (d < 1.2 && d < bd) { bd = d; best = { id: 'sample', verb: 'collect', icon: '🪨', s }; } }
    const xn = exNear(); if (xn && (!best || xn.d < bd)) best = xn;
    return best;
  }
  /** Puerta bloqueada cercana (para explicar qué la abre). */
  function lockedNear() { for (const d of doors) if (d.lock && Math.abs(player.x - (d.x + d.w / 2)) < 2.2 && Math.abs(player.y - (d.y + d.h / 2)) < 2.2) return d.rooms.find(locked); return null; }
  /** Toque/clic en el mapa: devuelve la planta bajo el punto si el jugador está cerca. */
  function pick(cssX, cssY, dpr) {
    const z = cam.z || 1, wx = (cssX * dpr) / z + cam.x, wy = (cssY * dpr) / z + cam.y;
    for (const f of furn) if (f.kind === 'planter') for (let k = 0; k < 3; k++) {
      const px = (f.x + 0.5 + k) * TS, py = (f.y + 1.45) * TS;
      if (Math.abs(wx - px) < TS * 0.5 && wy < py + 6 && wy > py - TS * 1.3 && Math.hypot(player.x * TS - px, player.y * TS - py) < TS * 3.2) return { id: 'plant', bed: f.bed, slot: k };
    }
    return null;
  }
  function setMarker(p, label) { if (p) marker = { p, label: label || '', until: lastT + 90 }; }
  function setPickable() { return null; }


  /* ---------- Exploración exterior: rover, refugios, recolección y efectos ---------- */
  function circleFree(cx, cy, r) {
    const B = Field.B; if (cx - r < B.x0 || cy - r < B.y0 || cx + r > B.x1 || cy + r > B.y1) return false;
    for (let yy = Math.floor(cy - r); yy <= Math.floor(cy + r); yy++) for (let xx = Math.floor(cx - r); xx <= Math.floor(cx + r); xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (grid[yy][xx] !== OUT || solid[yy][xx] || hullBuf[yy][xx]) { const nx = clampN(cx, xx, xx + 1), ny = clampN(cy, yy, yy + 1); if ((cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r) return false; }
    }
    return !Field.hit(cx, cy, r, true);
  }
  function roverFree(x, y, a) { for (const b of Rover.body(x, y, a)) if (!circleFree(b[0], b[1], b[2])) return false; return true; }
  const standOK = (x, y) => { noRov = true; const v = canStand(x, y, 0.3); noRov = false; return v; };
  function boardRover() {
    const E = curS && curS.ex; if (!E) return 'err'; if (!E.suit.on) return 'nosuit'; if (E.rover.occ || boardAnim) return 'busy'; if (shelIn) return 'busy';
    const sd = Rover.sides(), dl = Math.hypot(player.x - sd.left[0], player.y - sd.left[1]), dr = Math.hypot(player.x - sd.right[0], player.y - sd.right[1]), side = dl < dr ? sd.left : sd.right;
    boardAnim = { kind: 'in', t: 0, dur: 0.7, fx: player.x, fy: player.y, sx: side[0], sy: side[1] }; player.act = null; collect = null; Sfx.play('door'); return null;
  }
  function exitRover() {
    const E = curS && curS.ex; if (!E || !E.rover.occ || boardAnim) return 'busy'; if (Math.abs(E.rover.v) > 1.5) return 'fast';
    const sd = Rover.sides(); let spot = null; noRov = true;
    for (const q of [sd.left, sd.right, sd.rear]) if (canStand(q[0], q[1], 0.3)) { spot = q; break; }
    for (let r = 2.6; r < 8 && !spot; r += 0.6) for (let k = 0; k < 16 && !spot; k++) { const a = k * Math.PI / 8, x = E.rover.x + Math.cos(a) * r, y = E.rover.y + Math.sin(a) * r; if (canStand(x, y, 0.3)) spot = [x, y]; }
    noRov = false; if (!spot) return 'blocked';
    E.rover.occ = false; E.rover.v = 0; Rover.state().v = 0;
    boardAnim = { kind: 'out', t: 0, dur: 0.7, fx: E.rover.x, fy: E.rover.y, sx: spot[0], sy: spot[1], tx: spot[0], ty: spot[1] }; Sfx.play('door'); return null;
  }
  function stepBoard(dt) {
    const b = boardAnim, R = curS.ex.rover; b.t += dt; const u = Math.min(1, b.t / b.dur);
    const lerp = (a, c, k) => a + (c - a) * k;
    if (b.kind === 'in') {
      if (u < 0.55) { const k = u / 0.55; player.x = lerp(b.fx, b.sx, k); player.y = lerp(b.fy, b.sy, k); player.moving = true; } else { const k = (u - 0.55) / 0.45; player.x = lerp(b.sx, R.x, k); player.y = lerp(b.sy, R.y, k); player.moving = false; player.act = 'interact'; player.actT = 0.2; }
      player.dir = Math.abs(R.x - player.x) > Math.abs(R.y - player.y) ? (R.x > player.x ? 1 : 3) : (R.y > player.y ? 2 : 0);
      if (u >= 1) { boardAnim = null; R.occ = true; R.v = 0; player.x = R.x; player.y = R.y; player.act = null; }
    } else {
      player.x = lerp(R.x, b.tx, u); player.y = lerp(R.y, b.ty, u); player.moving = u > 0.3; player.dir = Math.abs(b.tx - R.x) > Math.abs(b.ty - R.y) ? (b.tx > R.x ? 1 : 3) : (b.ty > R.y ? 2 : 0);
      if (u >= 1) { boardAnim = null; player.x = b.tx; player.y = b.ty; player.moving = false; }
    }
    player.anim += dt * 8;
  }
  function enterShelter(id) { const q = Field.G.shel.find((z) => z.id === id); if (!q || shelIn) return false; shelIn = id; player.x = q.x; player.y = q.y + 0.6; player.moving = false; Sfx.play('door'); return true; }
  function leaveShelter() { const q = shelIn && Field.G.shel.find((z) => z.id === shelIn); shelIn = null; if (q) { const c = standAt2(q.x, q.y + 3.2); player.x = c[0]; player.y = c[1]; } }
  function standAt2(x, y) { for (let r = 0; r < 8; r += 0.5) for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r; if (canStand(xx, yy, 0.3)) return [xx, yy]; } return [x, y]; }
  function beginCollect(site, dur, done) { collect = { id: site.id, x: site.x, y: site.y, t: 0, dur, done }; }
  function scanFx(rad) { fx.scanT = 1.2; fx.scanR = rad; fx.scanX = player.x; fx.scanY = player.y; }
  function photoFx() { fx.photoT = 0.28; }
  /** Tras una evacuación de emergencia: el astronauta aparece junto a la esclusa, sin obstáculos. */
  function teleportHome() { camInit = false; boardAnim = null; shelIn = null; collect = null; const p = standAt2(Field.PAD[0] - 1.6, Field.PAD[1] - 1.5); player.x = p[0]; player.y = p[1]; player.act = null; Rover.clearFx(); }
  function exNear() {
    const E = curS && curS.ex; if (!E || boardAnim) return null;
    if (E.rover.occ) return { id: 'x:exit', verb: 'unboard', icon: '🚪', d: 0 };
    if (shelIn) return { id: 'x:shelx', verb: 'leave', icon: '🚪', d: 0, q: Field.G.shel.find((z) => z.id === shelIn) };
    let best = null, bd = 9; const px = player.x, py = player.y, R = E.rover, sd = Rover.sides();
    const cons = (d, it) => { if (d < bd) { bd = d; best = Object.assign(it, { d }); } };
    const dh = Math.hypot(px - sd.hatchPt[0], py - sd.hatchPt[1]), dr = Math.hypot(px - R.x, py - R.y);
    if (dh < 1.6) cons(dh * 0.7, { id: 'x:store', verb: 'open', icon: '📦' });
    if (dr < 3.3) cons(dr * 0.8, { id: 'x:board', verb: 'board', icon: '🚙' });
    for (const q of Field.G.sites) { if (E.taken[q.id] || (q.hidden && !E.rev[q.id])) continue; const d = Math.hypot(px - q.x, py - q.y); if (d < 1.5) cons(d, { id: 'x:site', verb: 'collect', icon: '🪨', s: q }); }
    for (const p of Field.G.pois) { const d = Math.hypot(px - p.x, py - p.y); if (d < Math.max(3.4, p.r * 0.55)) cons(d + 0.8, { id: 'x:poi', verb: 'investigate', icon: '🔭', p }); }
    for (const q of Field.G.rep) { const d = Math.hypot(px - q.x, py - q.y); if (d < 2.4) cons(d, { id: 'x:rep', verb: 'activate', icon: '📡', q }); }
    for (const q of Field.G.shel) { const d = Math.hypot(px - q.x, py - (q.y + 2.6)); if (d < 2.4) cons(d, { id: 'x:shel', verb: 'enter', icon: '🛡️', q }); }
    return best;
  }
  function exCtx() {
    const E = curS && curS.ex; if (!E) return null;
    const out = zone() === 'outside';
    return { x: player.x, y: player.y, outside: out, inRover: !!E.rover.occ, move: E.rover.occ ? Math.min(1, Math.abs(E.rover.v) / Rover.VMAX) : (player.moving ? 1 : 0), working: !!collect, inShel: out ? shelIn : null };
  }
  function exRender(c, S, ents, t, rm, vw, vh, o) {
    const E = S && S.ex; if (!E) return;
    Rover.drawFx(c, t); Field.guideLights(c, t, cam, vw, vh);
    for (const e of Field.ents(c, S, t, cam, vw, vh, { taken: E.taken, rev: E.rev, rep: E.rep, inShel: shelIn })) ents.push(e);
    const R = E.rover, ev = Ex.env(S, R.x, R.y), nightF = (1 - ev.sun) * (S.scen === 'mars' ? 0.7 : 1);
    const seated = R.occ || (boardAnim && boardAnim.kind === 'in' && boardAnim.t / boardAnim.dur > 0.9);
    const bd = boardAnim ? Math.sin(Math.min(1, boardAnim.t / boardAnim.dur) * Math.PI) : 0;
    ents.push({ y: R.y, f: () => Rover.draw(c, S, t, { occ: seated, role: player.role, boarding: bd, night: nightF > 0.45 && !shelIn && Math.hypot(player.x - R.x, player.y - R.y) < 40, storeOpen: !!E.storeOpen, rm }) });
    ents.push({ y: 1e6, f: () => {
      Rover.drawParts(c);
      if (collect) { const x = collect.x * TS, y = collect.y * TS, u = collect.t / collect.dur; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 5; c.beginPath(); c.arc(x, y - 6, 20, 0, 7); c.stroke(); c.strokeStyle = '#6fffa0'; c.lineWidth = 4; c.beginPath(); c.arc(x, y - 6, 20, -Math.PI / 2, -Math.PI / 2 + u * 6.283); c.stroke(); }
      if (fx.scanT > 0) { const u = 1 - fx.scanT / 1.2, rad = fx.scanR * TS * u; c.strokeStyle = 'rgba(111,255,160,' + (0.8 * (1 - u)) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(fx.scanX * TS, fx.scanY * TS, rad, 0, 7); c.stroke(); c.strokeStyle = 'rgba(111,255,160,' + (0.35 * (1 - u)) + ')'; c.beginPath(); c.arc(fx.scanX * TS, fx.scanY * TS, rad * 0.8, 0, 7); c.stroke(); }
      if (E.flash && !shelIn && !R.occ) { const a = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][player.dir], x = player.x * TS, y = player.y * TS - 20, g = c.createRadialGradient(x, y, 4, x + Math.cos(a) * 170, y + Math.sin(a) * 170, 190); g.addColorStop(0, 'rgba(255,244,200,.34)'); g.addColorStop(1, 'rgba(255,244,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 230, a - 0.42, a + 0.42); c.closePath(); c.fill(); }
      if (shelIn) { const q = Field.G.shel.find((z) => z.id === shelIn); if (q) { c.fillStyle = 'rgba(111,255,160,.16)'; c.beginPath(); c.arc(q.x * TS, q.y * TS, 64, 0, 7); c.fill(); } }
    } });
  }
  /** Capas de pantalla del exterior: noche, polvo, radiación, destello de cámara y flecha hacia la base. */
  function exOverlay(c, S, o, cw, ch, zoom, dpr, t, rm) {
    const E = S && S.ex; if (!E || !E.suit.on || zone() !== 'outside') return;
    const ev = Ex.env(S, player.x, player.y), px = (player.x * TS - cam.x) * zoom, py = (player.y * TS - cam.y) * zoom, u = TS * zoom;
    const nightF = (1 - ev.sun) * (S.scen === 'mars' ? 0.42 : 0.62), lr = (E.flash ? 13 : E.rover.lights && E.rover.occ ? 12 : 7) * u;
    if (nightF > 0.04 && !shelIn) { const g = c.createRadialGradient(px, py, lr * 0.3, px, py, lr * 1.5); g.addColorStop(0, 'rgba(2,4,14,0)'); g.addColorStop(1, 'rgba(2,4,14,' + nightF + ')'); c.fillStyle = g; c.fillRect(0, 0, cw, ch); }
    if (ev.dust) { const vr = (ev.vis + (E.flash ? 3 : 0)) * u, g = c.createRadialGradient(px, py, vr * 0.35, px, py, vr * 1.25); g.addColorStop(0, 'rgba(180,105,60,0.12)'); g.addColorStop(1, 'rgba(176,100,56,.93)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch); }
    if (ev.burst > 0.5 && !shelIn) { c.fillStyle = 'rgba(255,170,40,' + (rm ? 0.1 : 0.07 + 0.07 * Math.abs(Math.sin(t * 6))) + ')'; c.fillRect(0, 0, cw, ch); if (!rm) { c.fillStyle = 'rgba(255,240,180,.8)'; for (let i = 0; i < 14; i++) c.fillRect(((i * 197 + t * 700) % cw), ((i * 89 + t * 330) % ch), 2 * dpr, 2 * dpr); } }
    if (E.suit.o2 < 12 || E.suit.en < 12) { c.strokeStyle = 'rgba(255,60,60,' + (rm ? 0.5 : 0.25 + 0.3 * Math.abs(Math.sin(t * 5))) + ')'; c.lineWidth = 14 * dpr; c.strokeRect(0, 0, cw, ch); }
    if (fx.photoT > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, fx.photoT * 3) + ')'; c.fillRect(0, 0, cw, ch); }
    // flecha hacia la base cuando está lejos o fuera de pantalla
    const bx = (Field.PAD[0] * TS - cam.x) * zoom, by = (Field.PAD[1] * TS - cam.y) * zoom, dist = Math.hypot(Field.PAD[0] - player.x, Field.PAD[1] - player.y);
    if (dist > 14 && (bx < 0 || by < 0 || bx > cw || by > ch)) {
      const ang = Math.atan2(by - ch / 2, bx - cw / 2), m = 74 * dpr, ax = clampN(cw / 2 + Math.cos(ang) * cw, m, cw - m), ay0 = clampN(ch / 2 + Math.sin(ang) * ch, m, ch - m), ay = ax > cw - 250 * dpr && ay0 < 330 * dpr ? 330 * dpr : ay0;
      c.save(); c.translate(ax, ay); c.rotate(ang); c.fillStyle = '#38d6ff'; c.strokeStyle = '#000'; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(20 * dpr, 0); c.lineTo(-10 * dpr, -13 * dpr); c.lineTo(-4 * dpr, 0); c.lineTo(-10 * dpr, 13 * dpr); c.closePath(); c.fill(); c.stroke(); c.restore();
      c.font = 'bold ' + 12 * dpr + 'px system-ui'; c.textAlign = 'center'; c.fillStyle = '#e8f6ff'; c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 3 * dpr; const lb = (LANG === 'es' ? 'Base ' : 'Base ') + Math.round(dist * 25) + ' m'; c.strokeText(lb, ax, ay + 26 * dpr); c.fillText(lb, ax, ay + 26 * dpr);
    }
  }
  /** Radar de la expedición: terreno, base, rutas, puntos descubiertos, repetidores, refugios, rover y jugador. */
  function fieldRadar(c, S, target) {
    const E = S && S.ex; if (!E || !E.suit.on || zone() !== 'outside' || !Field.G) return false;
    const w = c.canvas.width, h = c.canvas.height, B = Field.B, bw = B.x1 - B.x0, bh = B.y1 - B.y0, s = Math.min(w / bw, h / bh), ox = (w - bw * s) / 2 - B.x0 * s, oy = (h - bh * s) / 2 - B.y0 * s, X = (x) => ox + x * s, Y = (y) => oy + y * s;
    const mars = S.scen === 'mars'; c.clearRect(0, 0, w, h);
    c.fillStyle = mars ? '#5a2e18' : '#3a3b42'; c.fillRect(X(B.x0), Y(B.y0), bw * s, bh * s);
    for (const z of Field.G.zones) { c.fillStyle = z.k === 'deep' ? 'rgba(0,0,0,.28)' : z.k === 'sand' ? 'rgba(230,170,110,.25)' : 'rgba(40,10,0,.3)'; c.beginPath(); c.ellipse(X(z.x), Y(z.y), z.rx * s, z.ry * s, 0, 0, 7); c.fill(); }
    for (const k of Field.G.craters) { c.strokeStyle = k.big ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; c.beginPath(); c.arc(X(k.x), Y(k.y), k.r * s, 0, 7); c.stroke(); }
    c.strokeStyle = 'rgba(255,214,120,.55)'; c.lineWidth = 2; c.setLineDash([5, 4]); for (const tr0 of Field.TRAILS) { c.beginPath(); tr0.forEach((q, i) => (i ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])))); c.stroke(); } c.setLineDash([]);
    if (mapCv) { c.globalAlpha = 0.95; c.drawImage(mapCv, X(0), Y(0), W * s, H * s); c.globalAlpha = 1; }
    for (const p of Field.G.pois) { const known = E.disc[p.id] || E.visited[p.id] || Math.hypot(player.x - p.x, player.y - p.y) < 45; if (!known) continue; c.fillStyle = E.visited[p.id] ? '#6fffa0' : '#ffd36b'; c.save(); c.translate(X(p.x), Y(p.y)); c.rotate(0.785); c.fillRect(-4, -4, 8, 8); c.restore(); }
    for (const q of Field.G.sites) { if (E.taken[q.id] || (q.hidden && !E.rev[q.id])) continue; c.fillStyle = '#9dffe3'; c.fillRect(X(q.x) - 1.5, Y(q.y) - 1.5, 3, 3); }
    for (const q of Field.G.rep) { c.fillStyle = E.rep[q.id] ? '#6fffa0' : '#ff5a5a'; c.beginPath(); c.arc(X(q.x), Y(q.y), 4, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
    for (const q of Field.G.shel) { c.fillStyle = '#ffc24a'; c.fillRect(X(q.x) - 4, Y(q.y) - 4, 8, 8); c.fillStyle = '#000'; c.font = 'bold 8px system-ui'; c.textAlign = 'center'; c.fillText('R', X(q.x), Y(q.y) + 3); }
    const gl = Ex.goal(S), tg = target || (gl ? [gl.x, gl.y] : null); if (tg) { c.strokeStyle = '#ff6b6b'; c.lineWidth = 2.5; c.beginPath(); c.arc(X(tg[0]), Y(tg[1]), 7 + 2 * Math.sin(lastT * 5), 0, 7); c.stroke(); }
    const R = E.rover; c.fillStyle = '#38d6ff'; c.save(); c.translate(X(R.x), Y(R.y)); c.rotate(R.a); c.fillRect(-4, -3, 8, 6); c.fillStyle = '#fff'; c.fillRect(2, -1.5, 3, 3); c.restore();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(X(player.x), Y(player.y), 4.5, 0, 7); c.fill(); c.strokeStyle = '#38d6ff'; c.lineWidth = 2; c.stroke();
    return true;
  }


  /** Distancia en salas desde la actual: los pasillos no cuentan, así que se ven las salas vecinas conectadas por ellos. */
  function veilDist(cur) {
    if (veilCache.room === cur && veilCache.d) return veilCache.d;
    const d = {}; d[cur] = 0; const q = [cur];
    const adj = {}; for (const dr of doors) { const [a, b] = dr.rooms; (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a); }
    while (q.length) { q.sort((x, y) => d[x] - d[y]); const k = q.shift(); for (const n of adj[k] || []) { const w = isTube(n) || isTube(k) ? 0 : 1, nd = d[k] + w; if (d[n] == null || nd < d[n]) { d[n] = nd; q.push(n); } } }
    veilCache = { room: cur, d }; return d;
  }
  const cellPaths = {};
  function roomCellsPath(k) {
    if (cellPaths[k + scen]) return cellPaths[k + scen];
    const p = new Path2D(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (roomAt[y][x] === k) p.rect(x, y, 1, 1);
    return (cellPaths[k + scen] = p);
  }
  /** Oculta las secciones lejanas (el jugador descubre la base al recorrerla); el exterior y la vista general no se velan. */
  function roomVeil(c) {
    if (fitAll || camZ < 0.0001) return;
    const cur = room(player.x, player.y); if (!cur || cur === 'pad') return;
    const key = isTube(cur) ? cur : cur, d = veilDist(key), vwT = c.canvas.width / cam.z, vhT = c.canvas.height / cam.z;
    c.save(); c.scale(TS, TS);
    for (const k in RECTS) {
      const R = RECTS[k]; if (!R || R[2] < 0) continue;
      const dd = d[k] == null ? 9 : d[k]; if (dd <= 1) continue;
      if ((R[2] + 2) * TS < cam.x || (R[0] - 1) * TS > cam.x + vwT || (R[3] + 2) * TS < cam.y || (R[1] - 1) * TS > cam.y + vhT) continue;
      c.fillStyle = 'rgba(2,4,12,' + (dd === 2 ? 0.5 : 0.88) + ')'; c.fill(roomCellsPath(k));
    }
    c.restore();
  }
  /* ---------- Render ---------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function buildStatic() {
    const o = Art.build({ scen, W, H, TS, grid, roomAt, doors, furn, props, scenery, rooms: Layout.ROOMS, ROOMCOL, SHELTER, LOCK, drawFurn, rr, REACTOR_C: Layout.REACTOR_C, samples });
    staticCv = o.cv; mapCv = o.mapCv;
  }

  function drawFurn(c, f) {
    const x = f.x * TS, y = f.y * TS, w = f.w * TS, h = f.h * TS;
    c.save();
    switch (f.kind) {
      case 'window': c.fillStyle = '#05081a'; c.fillRect(x, y + 6, w, h - 12); c.fillStyle = '#9fb7ff'; for (let i = 0; i < 40; i++) c.fillRect(x + ((i * 97) % w), y + 8 + ((i * 13) % (h - 16)), 2, 2); break;
      case 'console': c.fillStyle = '#26345e'; rr(c, x + 2, y + 2, w - 4, h - 4, 6); c.fill(); c.fillStyle = '#0a1a33'; c.fillRect(x + 6, y + 6, w - 12, h - 14); break;
      case 'holo': c.fillStyle = '#1b2850'; rr(c, x, y, w, h, 14); c.fill(); c.strokeStyle = '#4f7dff'; c.lineWidth = 2; c.stroke(); break;
      case 'crate': c.fillStyle = '#3b4668'; c.fillRect(x + 3, y + 3, w - 6, h - 6); c.strokeStyle = '#59658d'; c.strokeRect(x + 6, y + 6, w - 12, h - 12); break;
      case 'bunk': c.fillStyle = '#4a3b72'; rr(c, x + 2, y + 2, w - 4, h - 4, 8); c.fill(); c.fillStyle = '#e8e2ff'; rr(c, x + 6, y + 6, w - 12, 18, 6); c.fill(); c.fillStyle = '#7c64c9'; c.fillRect(x + 4, y + 30, w - 8, h - 38); break;
      case 'medbed': c.fillStyle = '#e9f3ff'; rr(c, x + 2, y + 6, w - 4, h - 12, 10); c.fill(); c.fillStyle = '#ff6b9a'; c.fillRect(x + w / 2 - 4, y + 14, 8, h - 28); c.fillRect(x + w / 2 - 12, y + h / 2 - 4, 24, 8); break;
      case 'table': c.fillStyle = '#4b4f6e'; rr(c, x + 2, y + 2, w - 4, h - 4, 8); c.fill(); c.fillStyle = '#6c7299'; rr(c, x + 6, y + 6, w - 12, h - 12, 6); c.fill(); break;
      case 'planter': // jardinera: marco metálico, sustrato y bandeja
        c.fillStyle = '#56606f'; rr(c, x, y + 10, w, h - 10, 6); c.fill(); c.strokeStyle = '#2a313d'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#3b2414'; rr(c, x + 4, y + 16, w - 8, h - 24, 4); c.fill();
        for (let i = 0; i < 40; i++) { c.fillStyle = i % 3 ? 'rgba(90,60,30,.6)' : 'rgba(20,10,5,.5)'; c.fillRect(x + 6 + ((i * 37) % (w - 14)), y + 18 + ((i * 13) % (h - 28)), 2, 2); }
        c.fillStyle = '#c9ced8'; c.fillRect(x + 2, y + h - 6, w - 4, 3);
        break;
      case 'lockers':
        for (let i = 0; i < 2; i++) { c.fillStyle = i ? '#4f5b80' : '#5a6890'; rr(c, x + 2 + i * (w / 2), y + 2, w / 2 - 4, h - 4, 4); c.fill(); c.strokeStyle = '#2a3150'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#d9a72b'; c.fillRect(x + w / 2 - 6 + i * (w / 2) - 8, y + h / 2, 3, 10); for (let k = 0; k < 3; k++) { c.fillStyle = '#2a3150'; c.fillRect(x + 8 + i * (w / 2), y + 10 + k * 6, w / 2 - 20, 2); } }
        break;
      case 'tank': c.fillStyle = '#1b6d8f'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 3, h / 2 - 3, 0, 0, 7); c.fill(); c.strokeStyle = '#7fe6ff'; c.lineWidth = 3; c.stroke(); break;
      case 'recycler': c.fillStyle = '#245a7a'; rr(c, x, y, w, h, 10); c.fill(); c.strokeStyle = '#38d6ff'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#0e2c3d'; c.beginPath(); c.arc(x + w / 2, y + h / 2, w / 3, 0, 7); c.fill(); break;
      case 'o2gen': c.fillStyle = '#2e5276'; rr(c, x, y, w, h, 8); c.fill(); c.fillStyle = '#bfe9ff'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText('O₂', x + w / 2, y + h / 2 + 8); break;
      case 'reactor': c.fillStyle = '#2b1a10'; c.beginPath(); c.arc(x + w / 2, y + h / 2, w / 2, 0, 7); c.fill(); c.strokeStyle = '#ff9a3d'; c.lineWidth = 4; c.stroke(); break;
      case 'battery': c.fillStyle = '#28331f'; rr(c, x + 2, y + 2, w - 4, h - 4, 6); c.fill(); c.strokeStyle = '#8fe36b'; c.lineWidth = 2; c.stroke(); break;
      case 'suitrack': c.fillStyle = '#232b45'; rr(c, x + 1, y + 2, w - 2, h - 4, 5); c.fill(); c.strokeStyle = '#4f6db8'; c.lineWidth = 1.5; c.stroke(); for (let k = 0; k < 3; k++) { const cx = x + (k + 0.5) * TS; c.fillStyle = '#e9edf7'; rr(c, cx - 9, y + 12, 18, 16, 5); c.fill(); c.fillStyle = '#c2c9d8'; c.beginPath(); c.arc(cx, y + 9, 7, 0, 7); c.fill(); c.fillStyle = '#d9a72b'; c.beginPath(); c.ellipse(cx, y + 9, 5, 4, 0, 0, 7); c.fill(); c.fillStyle = '#6fffa0'; c.fillRect(cx - 3, y + 20, 6, 2); } break;
      case 'rover': c.fillStyle = '#20242d'; c.fillRect(x + 4, y + 4, 22, h - 8); c.fillRect(x + w - 26, y + 4, 22, h - 8); c.fillStyle = '#e8ebf2'; rr(c, x + 14, y + 18, w - 28, h - 36, 12); c.fill(); c.fillStyle = '#38d6ff'; rr(c, x + w - 60, y + 30, 34, h - 60, 8); c.fill(); break;
      case 'tools': c.fillStyle = '#3a3f4f'; c.fillRect(x, y + 4, w, h - 8); c.strokeStyle = '#ffc24a'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x + 12 + i * 20, y + 10); c.lineTo(x + 12 + i * 20, y + h - 10); c.stroke(); } break;
      case 'shieldwall': c.fillStyle = '#5d6470'; c.fillRect(x, y, w, h); c.fillStyle = '#ffc24a'; c.fillRect(x, y + h / 2 - 3, w, 6); break;
      case 'benchs': c.fillStyle = '#4b5160'; rr(c, x, y + 4, w, h - 8, 6); c.fill(); break;
      case 'shelf': c.fillStyle = '#4a4a30'; c.fillRect(x, y, w, h); c.fillStyle = '#c8d44a'; for (let i = 0; i < Math.floor(w / 18); i++) { c.fillRect(x + 6 + i * 18, y + 6, 12, h / 2 - 8); c.fillStyle = i % 2 ? '#ff8f6b' : '#c8d44a'; c.fillRect(x + 6 + i * 18, y + h / 2 + 2, 12, h / 2 - 8); } break;
      case 'stove': c.fillStyle = '#5b4439'; rr(c, x, y, w, h, 4); c.fill(); for (let i = 0; i < Math.floor(w / 56) + 1; i++) { c.fillStyle = '#1a1411'; c.beginPath(); c.arc(x + 20 + i * 48, y + h / 2, 9, 0, 7); c.fill(); c.strokeStyle = '#ff8f6b'; c.lineWidth = 2; c.stroke(); } break;
      case 'cold': c.fillStyle = '#d9eef5'; rr(c, x + 2, y + 2, w - 4, h - 4, 6); c.fill(); c.strokeStyle = '#7fd0e8'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#7fd0e8'; c.fillRect(x + 8, y + 8, w - 16, 5); c.fillStyle = '#2b6278'; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.fillText('❄', x + w / 2, y + h / 2 + 6); break;
      case 'cabinet': c.fillStyle = '#244a50'; rr(c, x, y, w, h, 4); c.fill(); c.strokeStyle = '#4fe0c9'; c.lineWidth = 2; c.stroke(); for (let i = 0; i < 3; i++) { c.fillStyle = '#0d2326'; c.fillRect(x + 6, y + 6 + i * (h / 3 - 2), w - 12, h / 3 - 8); } break;
      case 'bin': c.fillStyle = ({ 63: '#3f6a3a', 66: '#3a5f7a', 73: '#7a6a3a', 76: '#6a3a3a' })[f.x] || '#3f6a3a'; rr(c, x + 3, y + 3, w - 6, h - 6, 8); c.fill(); c.strokeStyle = '#0006'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#0005'; c.fillRect(x + 8, y + 8, w - 16, 6); break;
      case 'lathe': c.fillStyle = '#44464f'; rr(c, x, y, w, h, 6); c.fill(); c.fillStyle = '#ffc24a'; c.fillRect(x + 8, y + 10, w - 16, 8); c.fillStyle = '#9aa0ae'; c.beginPath(); c.arc(x + w - 22, y + h / 2 + 6, 14, 0, 7); c.fill(); break;
      case 'turbine': { const cx = x + w / 2, cy = y + h / 2, r = w / 2 - 2; const g = c.createRadialGradient(cx - r * .3, cy - r * .3, 2, cx, cy, r); g.addColorStop(0, '#9aa3b6'); g.addColorStop(1, '#3a4152'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.strokeStyle = '#ff9a3d'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(20,24,34,.8)'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); c.lineTo(cx + Math.cos(a + 0.3) * (r - 4), cy + Math.sin(a + 0.3) * (r - 4)); c.stroke(); } c.fillStyle = '#ffb066'; c.beginPath(); c.arc(cx, cy, 5, 0, 7); c.fill(); break; }
      case 'pipe': { const hz = w >= h, t = 9; const g = hz ? c.createLinearGradient(0, y + h / 2 - t, 0, y + h / 2 + t) : c.createLinearGradient(x + w / 2 - t, 0, x + w / 2 + t, 0); g.addColorStop(0, '#4a5163'); g.addColorStop(0.35, '#b2bace'); g.addColorStop(1, '#3c4252'); c.fillStyle = g; if (hz) { c.fillRect(x, y + h / 2 - t / 2, w, t); c.fillStyle = '#2a3042'; for (let px = x + 20; px < x + w; px += 96) c.fillRect(px, y + h / 2 - t / 2 - 2, 6, t + 4); } else { c.fillRect(x + w / 2 - t / 2, y, t, h); c.fillStyle = '#2a3042'; for (let py = y + 20; py < y + h; py += 96) c.fillRect(x + w / 2 - t / 2 - 2, py, t + 4, 6); } break; }
      case 'seedrack': c.fillStyle = '#34463a'; rr(c, x, y, w, h, 4); c.fill(); c.strokeStyle = '#8fbf9f'; c.lineWidth = 2; c.stroke(); for (let i = 0; i < Math.floor(w / 22); i++) { c.fillStyle = i % 2 ? '#4fb06a' : '#7fd68a'; c.beginPath(); c.arc(x + 14 + i * 22, y + h * 0.4, 7, 0, 7); c.fill(); c.fillStyle = '#7fd68a'; c.beginPath(); c.arc(x + 14 + i * 22, y + h * 0.75, 6, 0, 7); c.fill(); } c.fillStyle = 'rgba(255,106,213,.7)'; c.fillRect(x + 4, y + h / 2 - 1, w - 8, 3); break;
      case 'vent': c.fillStyle = '#2a3042'; c.fillRect(x + 3, y + 3, w - 6, h - 6); c.strokeStyle = 'rgba(190,200,220,.5)'; c.lineWidth = 2; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + 5, y + 3 + i * (h - 6) / 5); c.lineTo(x + w - 5, y + 3 + i * (h - 6) / 5); c.stroke(); } break;
      case 'rug': c.fillStyle = 'rgba(255,255,255,.07)'; rr(c, x + 3, y + 3, w - 6, h - 6, 10); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.setLineDash([5, 5]); rr(c, x + 8, y + 8, w - 16, h - 16, 8); c.stroke(); break;
      case 'rack': c.fillStyle = '#3a3463'; c.fillRect(x, y, w, h); c.fillStyle = '#9a8cff'; for (let i = 0; i < 4; i++) c.fillRect(x + 6, y + 8 + i * 13, w - 12, 5); break;
    }
    c.restore();
  }


  function botPose(b, S) {
    if (b.act) return b.act;
    if (b.moving) return b.carry ? 'carry' : 'walk';
    if (b.task === 'repair') return 'repair';
    if (b.task === 'shelter') return 'idle';
    return b.work ? 'interact' : 'idle';
  }
  function drawChar(c, role, x, y, dir, t, pose, moving, label, eva) {
    const sc = 0.82;
    Chars.draw(c, role, x, y, { dir, t, pose, moving, scale: sc, rm: reduced, eva });
    if (label) {
      c.font = 'bold 11px system-ui'; c.textAlign = 'center';
      const tw = c.measureText(label).width + 10, ly = y - Chars.HEIGHT * sc - 14;
      c.fillStyle = 'rgba(5,8,20,.75)'; rr(c, x - tw / 2, ly - 11, tw, 15, 6); c.fill();
      c.fillStyle = '#eef3ff'; c.fillText(label, x, ly);
    }
  }
  function setAct(who, act, dur) {
    const list = who === 'all' ? [player].concat(bots) : who === 'player' ? [player] : bots.filter((b) => b.role === who);
    for (const e of list) { e.act = act; e.actT = dur || 3; }
  }


  function render(ctx, S, o) {
    o = o || {};
    if (!staticCv) buildStatic();
    const cw = ctx.canvas.width, ch = ctx.canvas.height, dpr = o.dpr || 1;
    const cssW = cw / dpr, cssH = ch / dpr;
    // MainCamera: sigue al jugador con suavidad y zoom cercano (casillas visibles en el lado corto de la pantalla); MapCamera: vista general
    const nowS = performance.now() / 1000, dtR = camInit ? clampN(nowS - camRT, 0, 0.1) : 1; camRT = nowS;
    const E0 = curS && curS.ex, R2 = E0 && E0.rover.occ && !boardAnim ? E0.rover : null, outd = room(player.x, player.y) === null || room(player.x, player.y) === 'pad';
    camDrive += ((R2 ? 1 : 0) - camDrive) * 0.05;
    let tiles = cssW < 600 || cssH < 520 ? 11.5 : 15;
    if (outd) tiles *= 1.12;
    if (R2) tiles *= 1.12 + 0.5 * clampN(Math.abs(R2.v) / Rover.VMAX, 0, 1);
    else if (outd) { const gr = Field.ground(player.x, player.y); if (gr.f < 0.9) tiles *= 1.06; }
    const tz = fitAll ? Math.min(cw / (W * TS), ch / (H * TS)) * 0.97 : clampN(Math.min(cssW, cssH) / (tiles * TS), 0.45, 3.4) * zoomMul * dpr;
    const BB = Field.B, rx = R2 ? Math.cos(R2.a) * R2.v * 0.3 : 0, ry = R2 ? Math.sin(R2.a) * R2.v * 0.3 : 0;
    const tcx = fitAll ? (W * TS) / 2 : (player.x + rx) * TS, tcy = fitAll ? (H * TS) / 2 : (player.y + ry) * TS;
    if (!camInit || Math.hypot(tcx - camCx, tcy - camCy) > 60 * TS) { camZ = tz; camCx = tcx; camCy = tcy; camInit = true; }
    else { camZ += (tz - camZ) * (1 - Math.exp(-dtR * (fitAll ? 4 : 5))); const kp = 1 - Math.exp(-dtR * (R2 ? 7 : fitAll ? 4 : 9)); camCx += (tcx - camCx) * kp; camCy += (tcy - camCy) * kp; }
    const zoom = camZ; cam.z = zoom;
    const vw = cw / zoom, vh = ch / zoom;
    if (fitAll && Math.abs(camZ - tz) < 1e-3 * tz) { cam.x = (W * TS - vw) / 2; cam.y = (H * TS - vh) / 2; }
    else { cam.x = clampN(camCx - vw / 2, BB.x0 * TS - TS * 2, Math.max(BB.x0 * TS - TS * 2, BB.x1 * TS - vw + TS * 2)); cam.y = clampN(camCy - vh / 2, BB.y0 * TS - TS * 2, Math.max(BB.y0 * TS - TS * 2, BB.y1 * TS - vh + TS * 2)); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#02040c'; ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(zoom, 0, 0, zoom, -cam.x * zoom, -cam.y * zoom);
    ctx.imageSmoothingEnabled = false;
    Field.drawTerrain(ctx, cam.x, cam.y, vw, vh);
    ctx.drawImage(staticCv, 0, 0);
    const t = lastT, rm = reduced;
    // Puertas (hojas que se deslizan; horizontales y verticales)
    for (const d of doors) {
      const x = d.x * TS, y = d.y * TS, lockC = d.lock ? '#ff5a5a' : d.kind === 'auto' ? '#4f6db8' : '#ffc24a', half = TS * (1 - d.open);
      if (!d.v) {
        ctx.fillStyle = '#2d3a63'; ctx.fillRect(x, y + 4, half, TS - 8); ctx.fillRect(x + 2 * TS - half, y + 4, half, TS - 8);
        ctx.fillStyle = lockC; ctx.fillRect(x + half - 3, y + 4, 3, TS - 8); ctx.fillRect(x + 2 * TS - half, y + 4, 3, TS - 8);
      } else {
        ctx.fillStyle = '#2d3a63'; ctx.fillRect(x + 4, y, TS - 8, half); ctx.fillRect(x + 4, y + 2 * TS - half, TS - 8, half);
        ctx.fillStyle = lockC; ctx.fillRect(x + 4, y + half - 3, TS - 8, 3); ctx.fillRect(x + 4, y + 2 * TS - half, TS - 8, 3);
      }
    }
    // Estado de eventos
    const incA = (ty) => !!S && S.inc.some((i) => !i.res && i.type === ty && S.t >= i.from);
    const stormD = incA('dust_storm') || !!(S && S.ex && Ex.condOn(S) && S.ex.cond.k === 'dust'), stormR = incA('solar_storm') || !!(S && S.ex && Ex.condOn(S) && S.ex.cond.k === 'rad'), pDrop = incA('power_drop');
    const dim = S ? Math.max(pDrop ? 0.3 : 0, S.d && S.d.power < 0.12 ? 0.4 : 0) : 0;
    if (dim > 0) { // interrupción eléctrica: la base se oscurece y parpadea; las consolas siguen encendidas
      const fl = rm ? 1 : 0.8 + 0.2 * Math.sin(t * 17) * Math.sin(t * 5.3);
      ctx.fillStyle = 'rgba(4,6,16,' + (dim * fl + 0.28) + ')'; ctx.fillRect(cam.x, cam.y, vw, vh);
      ctx.fillStyle = 'rgba(255,60,40,' + (rm ? 0.08 : 0.04 + 0.05 * Math.abs(Math.sin(t * 3))) + ')'; for (const d of doors) ctx.fillRect(d.x * TS - 4, d.y * TS - 4, d.w * TS + 8, d.h * TS + 8);
    }
    // Jardineras: luz LED, riego, sensor de humedad, etiquetas e indicadores (las plantas se dibujan como entidades)
    const plantEnts = [];
    if (S) for (const f of furn) if (f.kind === 'planter') {
      const b = S.beds[f.bed]; if (!b) continue;
      const x = f.x * TS, y = f.y * TS, w = f.w * TS;
      const lit = b.light * ((S.lf && S.lf.lights != null) ? S.lf.lights : 1) * S.cap.gh * (b.plants.some(Boolean) ? 1 : 0);
      ctx.fillStyle = '#2a2f3d'; ctx.fillRect(x + 2, y - 8, w - 4, 5);
      if (lit > 0.02) { ctx.save(); ctx.globalAlpha = 0.25 + 0.6 * lit; ctx.fillStyle = '#ff6ad5'; ctx.fillRect(x + 4, y - 7, w - 8, 3); const g2 = ctx.createLinearGradient(0, y - 4, 0, y + f.h * TS); g2.addColorStop(0, 'rgba(255,106,213,' + 0.22 * lit + ')'); g2.addColorStop(1, 'rgba(255,106,213,0)'); ctx.fillStyle = g2; ctx.fillRect(x + 2, y - 4, w - 4, f.h * TS); ctx.restore(); }
      ctx.fillStyle = '#5b8fc9'; ctx.fillRect(x + 6, y + 13, w - 12, 2.5);
      const plants = b.plants.filter(Boolean), avgM = plants.length ? plants.reduce((a, p) => a + p.moist, 0) / plants.length : 50;
      ctx.fillStyle = '#9aa0aa'; ctx.fillRect(x + w - 7, y + 10, 3, 12);
      ctx.fillStyle = avgM < 28 ? '#ff6b6b' : avgM > 82 ? '#6fb3ff' : avgM < 40 ? '#ffc24a' : '#5fe39a'; ctx.beginPath(); ctx.arc(x + w - 5.5, y + 9, 2.6, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const px = x + (0.5 + k) * TS, py = y + 1.45 * TS, pl = b.plants[k];
        ctx.fillStyle = '#7fc4ff'; ctx.fillRect(px - 1, y + 15, 2, 3);
        if (!pl) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('+', px, py - 2); continue; }
        plantEnts.push({ y: f.y + 1.45, f: () => {
          Flora.draw(ctx, pl.sp, px, py, 0.92, pl, rm ? null : t);
          ctx.fillStyle = 'rgba(5,8,20,.7)'; ctx.fillRect(px - 11, py + 4, 22, 9);
          ctx.fillStyle = '#eef3ff'; ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.fillText(tr(Flora.SPECIES[pl.sp].short), px, py + 10.5);
          ctx.fillStyle = '#26345e'; ctx.fillRect(px - 10, py + 14, 20, 2.5); ctx.fillStyle = pl.prog >= 1 ? '#ffd36b' : '#5fe39a'; ctx.fillRect(px - 10, py + 14, 20 * pl.prog, 2.5);
          if (pl.prog >= 1) { ctx.font = '10px system-ui'; Icons.draw(ctx, 'star', px + 9, py - 24, 11, '#ffd36b'); }
          if (pl.moist < 28 || pl.hp < 40 || (pl.pest && pl.pestKnown)) { ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#ffc24a'; ctx.fillText('!', px - 10, py - 18); }
        } });
      }
    }
    // Reactor brillando
    if (S) { const lv = (S.pw && S.pw.rea) || 0; const pulse = rm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3); const g = ctx.createRadialGradient(Layout.REACTOR_C[0] * TS, Layout.REACTOR_C[1] * TS, 4, Layout.REACTOR_C[0] * TS, Layout.REACTOR_C[1] * TS, 70); g.addColorStop(0, 'rgba(255,170,80,' + (0.25 + 0.5 * pulse) * Math.min(1, lv / 6) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(48 * TS - 40, 20 * TS - 40, 4 * TS + 80, 4 * TS + 80); }
    // Consolas
    for (const cn of consoles) {
      const x = cn.x * TS, y = cn.y * TS, blink = rm ? 1 : 0.6 + 0.4 * Math.sin(t * 4 + cn.x);
      const alert = S && S.inc.some((i) => !i.res && i.fix && i.room === cn.room && S.t >= i.from) && cn.verb !== 'play';
      ctx.fillStyle = alert ? 'rgba(255,107,107,' + blink + ')' : 'rgba(56,214,255,' + blink * 0.9 + ')';
      ctx.fillRect(x + 7, y + 7, TS - 14, TS - 16);
      Icons.draw(ctx, Icons.byEmoji(cn.icon) || 'gear', x + TS / 2, y - 8, 15, alert ? '#ff9a9a' : '#bfe9ff');
    }
    // Efectos ambientales (baratos): ventiladores, turbinas, pantallas, baterías, balizas y farolas
    const inV = (x, y, w, h) => x * TS + w * TS > cam.x && x * TS < cam.x + vw && y * TS + h * TS > cam.y && y * TS < cam.y + vh;
    for (const f of furn) {
      if (!inV(f.x, f.y, f.w, f.h)) continue;
      const x = f.x * TS, y = f.y * TS, w = f.w * TS, h = f.h * TS;
      if (f.kind === 'vent') { ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rm ? 0 : t * 5 + f.x); ctx.strokeStyle = 'rgba(210,220,240,.55)'; ctx.lineWidth = 3; for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.min(w, h) * 0.38, 0); ctx.stroke(); } ctx.restore(); }
      if (f.kind === 'turbine') { const pw = S && S.pw && S.pw.rea != null ? Math.max(0.15, S.pw.rea) : 0.6; ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rm ? 0 : t * (2 + 6 * pw) + f.x); ctx.strokeStyle = 'rgba(255,214,150,.75)'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(w / 2 - 6, 0); ctx.stroke(); } ctx.restore(); }
      if (f.kind === 'holo') { const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w * 0.75); g.addColorStop(0, 'rgba(79,170,255,' + (rm ? 0.22 : 0.16 + 0.1 * Math.sin(t * 2)) + ')'); g.addColorStop(1, 'rgba(79,170,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - w / 2, y - h / 2, w * 2, h * 2); }
      if (f.kind === 'battery' && S) { const lv = clampN(S.d.power || 0, 0, 1); for (let k = 0; k < 3; k++) { ctx.fillStyle = lv > (k + 0.5) / 3 ? '#8fe36b' : 'rgba(255,255,255,.12)'; ctx.fillRect(x + 6, y + 6 + k * 7, w - 12, 5); } }
      if (f.kind === 'reactor' && S) { const lv = (S.pw && S.pw.rea) || 0.5; const rg = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w / 2); rg.addColorStop(0, 'rgba(255,200,120,' + (0.10 + 0.16 * lv + (rm ? 0 : 0.06 * Math.sin(t * 3))) + ')'); rg.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 7); ctx.fill(); }
    }
    if (!rm && S) { steamT += 1 / 60; if (steamT > 0.25) { steamT = 0; for (const f of furn) if (f.kind === 'turbine' && inV(f.x, f.y, f.w, f.h)) spawnP(f.x + f.w / 2 + (Math.random() - 0.5), f.y + 0.3, 'rgba(255,255,255,.5)', 'steam'); } }
    if (scenery) {
      for (const p of props) if (p.k === 'antenna' && inV(p.x, p.y, p.w, p.h)) { const cx = (p.x + p.w / 2) * TS, cy = (p.y + p.h / 2) * TS, ph = (rm ? 0 : t * 2 + p.dish) % 3; ctx.fillStyle = (rm || Math.sin(t * 4 + p.dish) > 0) ? '#ff5a5a' : '#661a1a'; ctx.beginPath(); ctx.arc(cx + 2, cy - 36, 4, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 - ph / 6) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + 2, cy - 36, 8 + ph * 14, -1.2, 0.3); ctx.stroke(); }
      for (const l of scenery.lamps) if (Math.abs(l[0] * TS - (cam.x + vw / 2)) < vw && Math.abs(l[1] * TS - (cam.y + vh / 2)) < vh) { const a = rm ? 0.5 : 0.35 + 0.15 * Math.sin(t * 3 + l[0]); ctx.fillStyle = 'rgba(255,230,160,' + a + ')'; ctx.beginPath(); ctx.arc(l[0] * TS, l[1] * TS - 6, 9, 0, 7); ctx.fill(); }
    }
    // Esclusa: luz giratoria de advertencia mientras cicla
    if (airlock.st.startsWith('cycle')) { const lx = LOCK.x * TS, ly = (LOCK.inY + 3.3) * TS, a = 0.5 + 0.5 * Math.sin(t * 8); const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 90); g.addColorStop(0, 'rgba(255,170,40,' + (0.55 * a) + ')'); g.addColorStop(1, 'rgba(255,170,40,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 90, ly - 90, 180, 180); }
    // Incidente radiológico: el refugio late en ámbar con el trébol de radiación
    if (stormR) { const sx = SHELTER[0] * TS, sy = SHELTER[1] * TS, sw = (SHELTER[2] - SHELTER[0] + 1) * TS, sh = (SHELTER[3] - SHELTER[1] + 1) * TS, a = rm ? 0.5 : 0.35 + 0.3 * Math.abs(Math.sin(t * 3)); ctx.strokeStyle = 'rgba(255,194,74,' + a + ')'; ctx.lineWidth = 8; ctx.strokeRect(sx, sy, sw, sh); ctx.fillStyle = 'rgba(255,194,74,' + a * 0.15 + ')'; ctx.fillRect(sx, sy, sw, sh); Icons.draw(ctx, 'shield', sx + sw / 2, sy + sh / 2, 42, 'rgba(255,214,120,' + a + ')'); }
    // Llegada de un vehículo por la ruta de exploración
    if (fxVeh) {
      fxVeh.t += 1 / 60; const pth = fxVeh.path, u = Math.min(1, fxVeh.t / 9); let tot = 0; const seg = []; for (let i = 1; i < pth.length; i++) { const l = Math.hypot(pth[i][0] - pth[i - 1][0], pth[i][1] - pth[i - 1][1]); seg.push(l); tot += l; }
      let dist = u * tot, i = 0; while (i < seg.length - 1 && dist > seg[i]) { dist -= seg[i]; i++; }
      const a = pth[i], b = pth[i + 1] || a, k = seg[i] ? dist / seg[i] : 0, vx = (a[0] + (b[0] - a[0]) * k) * TS, vy = (a[1] + (b[1] - a[1]) * k) * TS, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.save(); ctx.translate(vx, vy); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(255,240,180,.25)'; ctx.beginPath(); ctx.moveTo(26, -9); ctx.lineTo(120, -34); ctx.lineTo(120, 34); ctx.lineTo(26, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1c1f27'; ctx.fillRect(-26, -22, 52, 8); ctx.fillRect(-26, 14, 52, 8); ctx.fillStyle = '#e8ebf2'; rr(ctx, -28, -16, 56, 32, 9); ctx.fill(); ctx.fillStyle = '#26345e'; ctx.fillRect(10, -11, 12, 22); ctx.fillStyle = '#ff9a3d'; ctx.fillRect(-24, -4, 14, 8); ctx.restore();
      if (!rm && Math.random() < 0.6) spawnP(vx / TS - Math.cos(ang) * 1.2, vy / TS + 0.5, scen === 'mars' ? 'rgba(216,150,98,.5)' : 'rgba(190,190,200,.45)', 'steam');
      if (fxVeh.t > 11) fxVeh = null;
    }
    // Muestras
    for (const s of samples) if (!s.taken) { const x = s.x * TS, y = s.y * TS; ctx.fillStyle = '#c9a26b'; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffe1a8'; ctx.lineWidth = 2; ctx.stroke(); }
    // Entidades (orden por y)
    const pPose = player.act || o.playerPose || (player.moving ? 'walk' : o.crit ? 'alert' : 'idle');
    const ents = bots.map((b) => ({ y: b.y, f: () => drawChar(ctx, b.role, b.x * TS, b.y * TS + 6, b.dir, b.anim / 8, b.task === 'shelter' && o.crit && !b.moving ? 'alert' : botPose(b, S), b.moving, tr(DATA.ROLE_T[b.role]).split(' ').pop()) }));
    plantEnts.forEach((pe) => ents.push(pe));
    const eva = !!(S && S.ex && S.ex.suit.on), inRov = !!(S && S.ex && S.ex.rover.occ) && !boardAnim, cargo = !!(S && S.ex && S.ex.hand.length);
    if (!inRov && !shelIn) ents.push({ y: player.y, f: () => drawChar(ctx, player.role, player.x * TS, player.y * TS + 6, player.dir, player.anim / 8, player.moving && !player.act ? (cargo ? 'carry' : 'walk') : (cargo && !player.act && pPose === 'idle' ? 'carry' : pPose), player.moving, o.youLabel || '', eva) });
    exRender(ctx, S, ents, t, rm, vw, vh, o);
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.f());
    roomVeil(ctx);
    // Secciones bloqueadas: velo con la forma real de cada sala
    if (S && S.camp) for (const k in MAIN) if (locked(k)) {
      ctx.save(); ctx.scale(TS, TS); ctx.fillStyle = 'rgba(2,4,12,.64)'; ctx.fill(roomPath(k)); ctx.restore();
      const Rr = RECTS[k], cx = (Rr[0] + Rr[2] + 1) / 2 * TS, cy = (Rr[1] + Rr[3] + 1) / 2 * TS; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
      Icons.draw(ctx, 'lock', cx, cy - 26, 26, '#ffc24a'); ctx.fillStyle = '#ffc24a'; ctx.fillText(tr(DATA.ROOMS[k]), cx, cy + 4);
    }
    // Partículas
    for (const p of parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; if (p.k === 'ray') ctx.fillRect(p.x * TS, p.y * TS, 2, 10); else { ctx.beginPath(); ctx.arc(p.x * TS, p.y * TS, p.k === 'bub' ? 3 : p.k === 'steam' ? 4 + p.t * 7 : 2, 0, 7); ctx.fill(); } }
    ctx.globalAlpha = 1;
    // Esclusa: estado
    if (airlock.st.startsWith('cycle')) { ctx.fillStyle = 'rgba(255,194,74,.9)'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText((airlock.st === 'cycle_out' ? (LANG === 'es' ? 'Despresurizando… ' : 'Depressurizing… ') : (LANG === 'es' ? 'Presurizando… ' : 'Pressurizing… ')) + Math.ceil(3 - airlock.t) + ' s', LOCK.x * TS, (LOCK.inY + 1.8) * TS); }
    // Iluminación ambiental: oscurece si falta energía; tinte rojo si hay alerta crítica
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (S) {
      const lifeFrac = S.lf && S.lf.therm != null ? S.lf.therm : 1;
      const dark = clampN((1 - lifeFrac) * 0.55 + (S.emergency ? 0.12 : 0), 0, 0.6);
      const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.25, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,' + dark * 0.4 + ')'); g.addColorStop(1, 'rgba(0,0,0,' + (0.35 + dark) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      if (o.crit) { ctx.fillStyle = 'rgba(255,40,40,' + (rm ? 0.08 : 0.06 + 0.06 * Math.sin(t * 4)) + ')'; ctx.fillRect(0, 0, cw, ch); }
    }
    if (!fitAll) { const px0 = (player.x * TS - cam.x) * zoom, py0 = (player.y * TS - cam.y) * zoom, r0 = Math.min(cw, ch) * 0.6, r1 = Math.hypot(cw, ch) * 0.62, g2 = ctx.createRadialGradient(px0, py0, r0, px0, py0, r1); g2.addColorStop(0, 'rgba(2,4,12,0)'); g2.addColorStop(1, 'rgba(2,4,12,0.62)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, cw, ch); }
    // Marte: viento y polvo permanentes, y tormenta de polvo como acontecimiento; motas de polvo en suspensión
    if (S && (stormD || scen === 'mars')) {
      const k = stormD ? 1 : 0.16; ctx.fillStyle = 'rgba(205,125,70,' + (0.2 * k + (stormD && !rm ? 0.06 * Math.sin(t * 1.3) : 0)) + ')'; ctx.fillRect(0, 0, cw, ch);
      if (!rm) { ctx.strokeStyle = 'rgba(240,190,140,' + 0.35 * k + ')'; ctx.lineWidth = 2 * dpr; for (let i = 0; i < (stormD ? 70 : 12); i++) { const sx = ((i * 173.7 + t * (stormD ? 900 : 150)) % (cw + 200)) - 100, sy = (i * 97.3 + Math.sin(t + i) * 30) % ch; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - (stormD ? 60 : 20) * dpr, sy + 6 * dpr); ctx.stroke(); } }
    }
    if (!rm && S) { ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 26; i++) ctx.fillRect(((i * 131 + t * 6 * (1 + (i % 3))) % cw), ((i * 89 + t * 3) % ch), 1.6 * dpr, 1.6 * dpr); }
    exOverlay(ctx, S, o, cw, ch, zoom, dpr, t, rm);
    // Flecha guía hacia el objetivo (el marcador de una llamada tiene prioridad)
    const tgt = marker ? marker.p : o.target;
    if (marker) { const mx = (marker.p[0] * TS - cam.x) * zoom, my = (marker.p[1] * TS - cam.y) * zoom; ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3 * dpr; ctx.beginPath(); ctx.arc(mx, my, (16 + (rm ? 0 : 6 * Math.sin(t * 5))) * dpr, 0, 7); ctx.stroke(); }
    if (tgt) {
      const tx = (tgt[0] * TS - cam.x) * zoom, ty = (tgt[1] * TS - cam.y) * zoom;
      const off = tx < 0 || ty < 0 || tx > cw || ty > ch;
      const ang = Math.atan2(ty - ch / 2, tx - cw / 2);
      const m = 60 * dpr;
      const ax = off ? clampN(cw / 2 + Math.cos(ang) * (cw / 2 - m), m, cw - m) : tx, ay = off ? clampN(ch / 2 + Math.sin(ang) * (ch / 2 - m), m, ch - m) : ty - 40 * dpr;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(off ? ang : Math.PI / 2);
      ctx.fillStyle = '#ffc24a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.moveTo(22 * dpr, 0); ctx.lineTo(-10 * dpr, -14 * dpr); ctx.lineTo(-4 * dpr, 0); ctx.lineTo(-10 * dpr, 14 * dpr); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }


  function minimap(c, S, target) {
    if (fieldRadar(c, S, target)) return;
    const w = c.canvas.width, h = c.canvas.height, s = Math.min(w / W, h / H);
    c.clearRect(0, 0, w, h);
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2;
    if (mapCv) { c.globalAlpha = 0.95; c.imageSmoothingEnabled = true; c.drawImage(mapCv, ox, oy, W * s, H * s); c.globalAlpha = 1; }
    if (S) for (const i of S.inc) if (!i.res && S.t >= i.from) { const R = RECTS[i.room]; if (!R) continue; c.strokeStyle = i.sev === 'crit' ? '#ff6b6b' : i.sev === 'warn' ? '#ffc24a' : '#6fb3ff'; c.lineWidth = 3; c.strokeRect(ox + R[0] * s, oy + R[1] * s, (R[2] - R[0] + 1) * s, (R[3] - R[1] + 1) * s); }
    for (const k in MAIN) if (locked(k)) { c.save(); c.translate(ox, oy); c.scale(s, s); c.fillStyle = 'rgba(0,0,0,.62)'; c.fill(roomPath(k)); c.restore(); const R = RECTS[k]; Icons.draw(c, 'lock', ox + (R[0] + R[2] + 1) / 2 * s, oy + (R[1] + R[3] + 1) / 2 * s, Math.max(8, 5 * s), '#ffc24a'); }
    if (target) { c.fillStyle = '#ffc24a'; c.beginPath(); c.arc(ox + target[0] * s, oy + target[1] * s, 5, 0, 7); c.fill(); }
    if (marker) { c.strokeStyle = '#ff6b6b'; c.lineWidth = 3; c.beginPath(); c.arc(ox + marker.p[0] * s, oy + marker.p[1] * s, 8 + 2 * Math.sin(lastT * 5), 0, 7); c.stroke(); c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(ox + marker.p[0] * s, oy + marker.p[1] * s, 3, 0, 7); c.fill(); }
    for (const b of bots) { c.fillStyle = BOTCOL[b.role]; c.fillRect(ox + b.x * s - 2, oy + b.y * s - 2, 5, 5); }
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ox + player.x * s, oy + player.y * s, 5, 0, 7); c.fill();
    c.strokeStyle = '#38d6ff'; c.lineWidth = 2; c.stroke();
  }

  /** Contorno exacto (en baldosas) de las celdas de una sala: velos, sombreados y mapa. */
  const pathCells = {};
  function roomPath(k) {
    if (pathCells[k + scen]) return pathCells[k + scen];
    const p = new Path2D();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (roomAt[y][x] === k) p.rect(x, y, 1, 1);
    for (const d of doors) if (d.rooms.includes(k)) p.rect(d.x, d.y, d.w, d.h);
    return (pathCells[k + scen] = p);
  }
  function roomCenter(k) { return (RECTS[k] && spot(k, 0)) || null; }
  function consolePos(id) { const c = consoles.find((x) => x.id === id); return c ? [c.x + 0.5, c.y + 1.4] : null; }
  /** Ruta real hasta una sala (cuadrícula de pasillos y puertas, sin atravesar salas bloqueadas). */
  function route(roomId) {
    if (!RECTS[roomId] || locked(roomId)) return null;
    const t = spot(roomId, 0), p = findPath(player.x, player.y, t[0], t[1]);
    return p ? [[player.x, player.y]].concat(p.slice(1)) : null;
  }
  function crew() { return bots.map((b) => ({ role: b.role, x: b.x, y: b.y, room: roomName(b.x, b.y) })); }
  function state() { return { role: player.role, px: player.x, py: player.y, shel: shelIn, lock: airlock.st === 'out' || airlock.st === 'cycle_out' ? 'out' : 'in' }; }
  function restore(o) {
    if (!o) return;
    if (Number.isFinite(o.px) && Number.isFinite(o.py) && canStand(o.px, o.py, 0.3)) { player.x = o.px; player.y = o.py; }
    shelIn = o.shel || null; camInit = false;
    airlock.st = o.lock === 'out' ? 'out' : 'in';
    if (o.role && o.role !== 'commander') setPlayerRole(o.role);
    player.act = null;
  }
  function respawnSamples() { if (curS && curS.ex) { curS.ex.taken = {}; curS.ex.rev = {}; } }
  function setReduced(v) { reduced = !!v; }
  function invalidate() { staticCv = null; }
  function zoom(f) { zoomMul = clampN(zoomMul * f, 0.6, 1.7); fitAll = false; }
  function snapCamera() { camInit = false; }
  function overview(on) { fitAll = on == null ? !fitAll : !!on; if (!fitAll) zoomMul = 1; }

  return { snapCamera, get cam() { return cam; }, get needSuit() { return lastT - needSuitT < 0.4; }, standOKp: (x, y) => standOK(x, y), exNear: () => exNear(), boardRover, exitRover, enterShelter, leaveShelter, get inShelter() { return shelIn; }, beginCollect, cancelCollect: () => (collect = null), get collecting() { return collect; }, exCtx, fx, roverFree, scanFx, photoFx, get boarding() { return !!boardAnim; }, teleportHome, standOK, route, crew, doorList: () => doors.map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h, v: d.v, kind: d.kind })), roomLocked: locked, ROOMCOL, DIM: { W, H }, setPlayerRole, plantPos, lockedNear, pick, setMarker, get marker() { return marker; }, setAct, init, update, render, minimap, nearest, zone, roomName, roomCenter, consolePos, cycleLock, airlock: () => airlock, state, restore, respawnSamples, setReduced, invalidate, player, get RECTS() { return RECTS; }, TS, roomPath, zoom, overview, get fit() { return fitAll; }, get camZoom() { return cam.z; }, vehicleArrival,
    get staticCanvas() { if (!staticCv) buildStatic(); return mapCv; }, roomAtPoint: (x, y) => { const r = room(x, y); return isTube(r) ? 'hall' : r; }, shelterCenter: () => [(SHELTER[0] + SHELTER[2] + 1) / 2, (SHELTER[1] + SHELTER[3] + 1) / 2], lockPos: () => LOCK,
    _test: { get boardAnim() { return boardAnim; }, blocked, canStand, get doors() { return doors; }, get bots() { return bots; }, findPath, standAt, spot, get grid() { return grid; }, get solid() { return solid; }, get roomAt() { return roomAt; }, get props() { return props; }, get samples() { return Field.G ? Field.G.sites.filter((q) => q.near) : []; }, get scenery() { return scenery; }, get furn() { return furn; } } };
})();
