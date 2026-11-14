/* =====================================================================
   WORLD — mapa cenital original, colisiones, puertas, esclusa, bots,
   cámara, render Canvas 2D, partículas y minimapa.
   ===================================================================== */
const World = (function () {
  const TS = 32, W = 60, H = 56;
  const VOID = 0, WALL = 1, FLOOR = 2, DOOR = 3, OUT = 4;
  const RECTS = {
    life: [2, 2, 17, 11], bridge: [22, 2, 37, 11], lab: [42, 2, 57, 11],
    gh: [2, 17, 17, 28], water: [22, 17, 37, 28], reactor: [42, 17, 57, 28],
    rad: [6, 34, 53, 44], hall: [2, 13, 57, 15], v1: [9, 30, 10, 32], v2: [29, 30, 30, 32], v3: [49, 30, 50, 32],
    lock: [28, 46, 31, 47], pad: [20, 49, 39, 54]
  };
  const SHELTER = [38, 36, 47, 44];
  const PAL = {
    bridge: ['#1b2a55', '#1f3062'], life: ['#2d2346', '#33284f'], gh: ['#183a2a', '#1c4331'], reactor: ['#3a2414', '#432a17'],
    water: ['#0f3446', '#123b50'], rad: ['#2a2f3a', '#30353f'], lab: ['#2b2550', '#312a5a'], hall: ['#1a1f2e', '#1d2334'],
    v1: ['#1a1f2e', '#1d2334'], v2: ['#1a1f2e', '#1d2334'], v3: ['#1a1f2e', '#1d2334'], lock: ['#3a3426', '#41392a']
  };
  const ROOMCOL = { bridge: '#4f7dff', life: '#b07cff', gh: '#3ddc84', reactor: '#ff9a3d', water: '#38d6ff', rad: '#c9ced8', lab: '#9a8cff' };
  let grid = [], solid = [], roomAt = [], doors = [], furn = [], consoles = [], samples = [];
  let staticCv = null, scen = 'moon';
  const player = { x: 30, y: 8, dir: 2, moving: false, anim: 0, stepT: 0, act: null, actT: 0 };
  let bots = [], parts = [], cam = { x: 0, y: 0, z: 1 }, airlock = { st: 'in', t: 0 }, lastT = 0, reduced = false;

  /* ---------- Construcción del mapa ---------- */
  function fill(r, v, id) { for (let y = r[1]; y <= r[3]; y++) for (let x = r[0]; x <= r[2]; x++) { grid[y][x] = v; roomAt[y][x] = id; } }
  function build() {
    grid = []; roomAt = []; solid = [];
    for (let y = 0; y < H; y++) { grid.push(new Array(W).fill(VOID)); roomAt.push(new Array(W).fill(null)); solid.push(new Array(W).fill(true)); }
    for (const k in RECTS) fill(RECTS[k], k === 'pad' ? OUT : FLOOR, k);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (grid[y][x] !== VOID) continue;
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W && (grid[yy][xx] === FLOOR || grid[yy][xx] === OUT)) near = true; }
      if (near) grid[y][x] = WALL;
    }
    doors = [];
    const D = (x, y, kind) => { grid[y][x] = DOOR; grid[y][x + 1] = DOOR; doors.push({ x, y, open: 0, kind: kind || 'auto', snd: 0 }); };
    for (const x of [9, 29, 49]) { D(x, 12); D(x, 16); D(x, 29); D(x, 33); }
    D(29, 45, 'inner'); D(29, 48, 'outer');
    furn = []; consoles = [];
    const F = (x, y, w, h, kind, o) => furn.push(Object.assign({ x, y, w, h, kind }, o || {}));
    const C = (id, room, x, y, verb, icon) => { consoles.push({ id, room, x, y, verb, icon }); F(x, y, 1, 1, 'console', { cid: id }); };
    // Puente
    F(28, 5, 4, 3, 'holo'); F(22, 2, 16, 1, 'window');
    C('cmd', 'bridge', 25, 3, 'manage', '🖥️'); C('comms', 'bridge', 30, 3, 'interact', '📡'); C('earth', 'bridge', 34, 3, 'investigate', '🌎');
    F(23, 9, 2, 2, 'crate'); F(35, 9, 2, 2, 'crate');
    // Módulo de vida
    for (let i = 0; i < 3; i++) F(3 + i * 3, 3, 2, 3, 'bunk');
    C('bed', 'life', 4, 7, 'rest', '🛏️'); F(13, 3, 3, 2, 'medbed'); C('med', 'life', 16, 3, 'manage', '🩺'); F(9, 8, 3, 2, 'table'); C('rec', 'life', 12, 9, 'interact', '🎲');
    // Invernadero
    for (let i = 0; i < 6; i++) F(3 + (i % 3) * 4, 19 + Math.floor(i / 3) * 5, 3, 2, 'bed', { bed: i });
    C('gh', 'gh', 16, 18, 'manage', '🌱'); F(15, 26, 2, 2, 'tank');
    // Reactor
    F(48, 20, 4, 4, 'reactor'); for (let i = 0; i < 3; i++) F(43, 19 + i * 3, 2, 2, 'battery');
    C('reactor', 'reactor', 55, 18, 'manage', '⚛️'); C('solar', 'reactor', 46, 27, 'play', '☀️'); C('balance', 'reactor', 55, 27, 'play', '⚖️');
    // Agua y O2
    F(23, 19, 3, 3, 'tank'); F(23, 23, 3, 3, 'tank'); F(30, 20, 3, 3, 'recycler'); F(34, 22, 3, 3, 'o2gen');
    C('water', 'water', 28, 18, 'manage', '💧'); C('o2', 'water', 36, 18, 'play', '🫧');
    // Bahía del rover y refugio
    F(8, 37, 6, 4, 'rover'); C('rover', 'rad', 15, 37, 'explore', '🚙'); F(17, 42, 4, 2, 'tools'); C('isru', 'rad', 22, 42, 'manage', '🧊');
    for (let x = 37; x <= 48; x++) F(x, 35, 1, 1, 'shieldwall');
    for (let y = 36; y <= 44; y++) { if (y !== 39 && y !== 40) F(37, y, 1, 1, 'shieldwall'); F(48, y, 1, 1, 'shieldwall'); }
    C('shield', 'rad', 35, 37, 'manage', '🛡️'); F(40, 42, 6, 1, 'benchs');
    C('lock', 'lock', 31, 46, 'interact', '🚪');
    // Laboratorio
    C('lab', 'lab', 44, 3, 'investigate', '🔬'); C('spec', 'lab', 50, 3, 'investigate', '🌈'); C('log', 'lab', 56, 9, 'investigate', '📚');
    F(45, 7, 4, 2, 'table'); F(51, 7, 3, 2, 'table'); F(55, 3, 2, 2, 'rack');
    // Muestras exteriores
    samples = [{ x: 23.5, y: 51.5 }, { x: 35.5, y: 52.5 }, { x: 27.5, y: 53.5 }, { x: 33.5, y: 50.5 }].map((s) => Object.assign(s, { taken: false }));
    // Solidez
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) solid[y][x] = !(grid[y][x] === FLOOR || grid[y][x] === OUT);
    for (const f of furn) if (f.kind !== 'window') for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) solid[y][x] = true;
  }

  /* ---------- Nodos de navegación para bots ---------- */
  const N = {
    life_c: [7, 9.5], life_d: [10, 11.5], bridge_c: [30, 9.5], bridge_d: [30, 11.5], lab_c: [50, 9.5], lab_d: [50, 11.5],
    ha: [10, 14.5], hb: [30, 14.5], hc: [50, 14.5],
    gh_t: [10, 16.5], gh_c: [10, 23.5], gh_b: [10, 28.5], v1: [10, 31], bay_a_d: [10, 33.5], bay_a: [10, 34.5],
    wa_t: [30, 16.5], wa_c: [30, 25.5], wa_b: [30, 28.5], v2: [30, 31], bay_b_d: [30, 33.5], bay_b: [30, 34.5],
    re_t: [50, 16.5], re_c: [54, 25.5], re_m: [50, 25.5], re_b: [50, 28.5], v3: [50, 31], bay_c_d: [50, 33.5], bay_c: [50, 34.5],
    bay_s: [36, 34.5], sh_d: [36, 39.5], sh_c: [43, 39.5], sh_c2: [43, 41], bay_r: [18, 34.5], bay_r2: [18, 38.5]
  };
  const E = [['life_c', 'life_d'], ['life_d', 'ha'], ['bridge_c', 'bridge_d'], ['bridge_d', 'hb'], ['lab_c', 'lab_d'], ['lab_d', 'hc'], ['ha', 'hb'], ['hb', 'hc'],
    ['ha', 'gh_t'], ['gh_t', 'gh_c'], ['gh_c', 'gh_b'], ['gh_b', 'v1'], ['v1', 'bay_a_d'], ['bay_a_d', 'bay_a'],
    ['hb', 'wa_t'], ['wa_t', 'wa_c'], ['wa_c', 'wa_b'], ['wa_b', 'v2'], ['v2', 'bay_b_d'], ['bay_b_d', 'bay_b'],
    ['hc', 're_t'], ['re_t', 're_m'], ['re_m', 're_c'], ['re_m', 're_b'], ['re_b', 'v3'], ['v3', 'bay_c_d'], ['bay_c_d', 'bay_c'],
    ['bay_a', 'bay_r'], ['bay_r', 'bay_b'], ['bay_r', 'bay_r2'], ['bay_b', 'bay_s'], ['bay_s', 'bay_c'], ['bay_s', 'sh_d'], ['sh_d', 'sh_c'], ['sh_c', 'sh_c2']];
  const ADJ = {}; for (const k in N) ADJ[k] = []; for (const [a, b] of E) { ADJ[a].push(b); ADJ[b].push(a); }
  const HOME = { engineer: ['re_c', 're_m', 'wa_c'], scientist: ['lab_c', 'lab_d'], medic: ['life_c', 'life_d'], agri: ['gh_c', 'gh_t'] };
  const ROOMNODE = { bridge: 'bridge_c', life: 'life_c', lab: 'lab_c', gh: 'gh_c', water: 'wa_c', reactor: 're_c', rad: 'bay_r2' };
  function bfs(a, b) {
    if (a === b) return [b];
    const prev = { [a]: null }, q = [a];
    while (q.length) { const c = q.shift(); if (c === b) break; for (const n of ADJ[c]) if (!(n in prev)) { prev[n] = c; q.push(n); } }
    if (!(b in prev)) return [b];
    const path = []; let c = b; while (c) { path.unshift(c); c = prev[c]; } return path;
  }
  function nearestNode(x, y) { let best = null, bd = 1e9; for (const k in N) { const d = (N[k][0] - x) ** 2 + (N[k][1] - y) ** 2; if (d < bd) { bd = d; best = k; } } return best; }

  const BOTCOL = { engineer: '#ff8a2a', scientist: '#a58cff', medic: '#7ff0cf', agri: '#8fd14f' };
  function init(sc) {
    scen = sc; build(); staticCv = null;
    player.x = 30; player.y = 9.5; player.dir = 2;
    bots = ['engineer', 'scientist', 'medic', 'agri'].map((role, i) => { const n = HOME[role][0]; return { role, x: N[n][0], y: N[n][1], node: n, path: [], wait: 1 + i, dir: 2, anim: Math.random() * 5, task: 'wander', act: null, actT: 0, carry: false, work: false }; });
    airlock = { st: 'in', t: 0 }; parts = [];
  }

  /* ---------- Colisión ---------- */
  function blocked(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    if (grid[ty][tx] === DOOR) { const d = doorAt(tx, ty); return !d || d.open < 0.6; }
    return solid[ty][tx];
  }
  function doorAt(x, y) { return doors.find((d) => d.y === y && (d.x === x || d.x + 1 === x)); }
  function canStand(x, y, r) { return !blocked(x - r, y - r) && !blocked(x + r, y - r) && !blocked(x - r, y + r) && !blocked(x + r, y + r); }
  function room(x, y) { const tx = Math.floor(x), ty = Math.floor(y); if (ty < 0 || ty >= H || tx < 0 || tx >= W) return null; const r = roomAt[ty][tx]; if (r) return r; const d = doorAt(tx, ty); return d ? 'hall' : null; }
  function inShelter(x, y) { return x >= SHELTER[0] && x <= SHELTER[2] + 1 && y >= SHELTER[1] && y <= SHELTER[3] + 1; }
  function zone() { const r = room(player.x, player.y); if (r === 'pad') return 'outside'; if (inShelter(player.x, player.y)) return 'shelter'; return 'hab'; }
  const ROOM_ALIAS = { v1: 'hall', v2: 'hall', v3: 'hall' };
  function roomName(x, y) { const r = room(x, y); return ROOM_ALIAS[r] || r; }

  /* ---------- Actualización ---------- */
  function update(dt, S, inp) {
    lastT += dt;
    // Jugador
    let vx = inp.x, vy = inp.y;
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const sp = 4.4;
    player.moving = len > 0.15;
    if (player.moving) {
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
    // Bots
    for (let i = 0; i < bots.length; i++) updateBot(bots[i], dt, S, i + 1);
    // Puertas
    const ents = [player].concat(bots);
    for (const d of doors) {
      let want = false;
      for (const e of ents) if (Math.abs(e.x - (d.x + 1)) < 1.9 && Math.abs(e.y - (d.y + 0.5)) < 2.0) want = true;
      if (d.kind === 'inner') want = want && airlock.st === 'in';
      if (d.kind === 'outer') want = want && airlock.st === 'out';
      const before = d.open;
      d.open = clampN(d.open + (want ? 3 : -3) * dt, 0, 1);
      if (before === 0 && d.open > 0) Sfx.play('door');
      // No cerrar sobre alguien
      if (!want) for (const e of ents) if (Math.floor(e.y) === d.y && (Math.floor(e.x) === d.x || Math.floor(e.x) === d.x + 1)) d.open = Math.max(d.open, 0.7);
    }
    // Esclusa: ciclado automático al acercarse
    if (airlock.st === 'cycle_out' || airlock.st === 'cycle_in') {
      airlock.t += dt;
      if (airlock.t >= 3) { airlock.st = airlock.st === 'cycle_out' ? 'out' : 'in'; airlock.t = 0; Sfx.play('info'); }
    } else {
      const rn = room(player.x, player.y);
      if (airlock.st === 'out' && rn === 'rad' && Math.abs(player.x - 30) < 2 && player.y > 43) cycleLock();
      if (airlock.st === 'in' && rn === 'pad' && Math.abs(player.x - 30) < 2 && player.y < 50.5) cycleLock();
    }
    // Partículas
    const rm = !reduced;
    if (rm && S) {
      if (Math.random() < dt * 6) spawnP(31 + Math.random() * 2, 23 + Math.random(), '#7fe6ff', 'bub');
      for (const inc of S.inc) if (!inc.res && inc.fix && Math.random() < dt * 5) { const n = N[ROOMNODE[inc.room]] || N.hb; spawnP(n[0] + (Math.random() - 0.5) * 3, n[1] - 1 + Math.random(), '#ffd36b', 'spark'); }
      if (S.mods && S.mods.spe > 0 && Math.random() < dt * 20) spawnP(player.x + (Math.random() - 0.5) * 20, player.y - 8, '#ffef9a', 'ray');
    }
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.t < p.life);
  }
  function cycleLock() {
    if (airlock.st === 'in') { airlock.st = 'cycle_out'; airlock.t = 0; Sfx.play('warn'); return true; }
    if (airlock.st === 'out') { airlock.st = 'cycle_in'; airlock.t = 0; Sfx.play('warn'); return true; }
    return false;
  }
  function spawnP(x, y, c, k) {
    if (parts.length > 220) return;
    const p = { x, y, c, k, t: 0, life: 1, vx: 0, vy: 0 };
    if (k === 'bub') { p.vy = -0.6; p.life = 1.6; }
    if (k === 'spark') { p.vx = (Math.random() - 0.5) * 3; p.vy = -1 - Math.random() * 2; p.life = 0.5; }
    if (k === 'ray') { p.vx = 0.8; p.vy = 14; p.life = 1.2; }
    parts.push(p);
  }
  function updateBot(b, dt, S, idx) {
    b.anim += dt * 7;
    if (!S) return;
    const c = S.crew[idx];
    let goal = null;
    if (c && c.zone === 'shelter') { goal = idx % 2 ? 'sh_c' : 'sh_c2'; b.task = 'shelter'; }
    else if (b.role === 'engineer') {
      const inc = S.inc.find((i) => !i.res && i.fix && S.t >= i.from);
      if (inc) { goal = ROOMNODE[inc.room]; b.task = 'repair'; } else b.task = 'wander';
    } else b.task = 'wander';
    if (b.path.length === 0) {
      if (goal && b.node !== goal) b.path = bfs(b.node, goal).slice(1);
      else if (!goal) {
        b.wait -= dt;
        if (b.wait <= 0) { const h = HOME[b.role]; const tgt = h[Math.floor(Math.random() * h.length)]; b.path = bfs(b.node, tgt).slice(1); b.wait = 3 + Math.random() * 5; b.carry = (b.role === 'scientist' || b.role === 'agri') && Math.random() < 0.45; b.work = Math.random() < 0.6; }
      }
      if (goal && b.node === goal) { b.moving = false; return; }
    }
    if (b.path.length) {
      const n = N[b.path[0]], dx = n[0] - b.x, dy = n[1] - b.y, d = Math.hypot(dx, dy);
      const sp = 2.6 * dt;
      if (d <= sp) { b.x = n[0]; b.y = n[1]; b.node = b.path.shift(); }
      else { b.x += (dx / d) * sp; b.y += (dy / d) * sp; b.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); }
      b.moving = true;
    } else b.moving = false;
  }

  /* ---------- Interacción ---------- */
  function nearest() {
    let best = null, bd = 1.9;
    for (const c of consoles) { const d = Math.hypot(player.x - (c.x + 0.5), player.y - (c.y + 0.5)); if (d < bd) { bd = d; best = c; } }
    for (const s of samples) if (!s.taken) { const d = Math.hypot(player.x - s.x, player.y - s.y); if (d < 1.2 && d < bd) { bd = d; best = { id: 'sample', verb: 'collect', icon: '🪨', s }; } }
    return best;
  }

  /* ---------- Render ---------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function buildStatic() {
    staticCv = document.createElement('canvas'); staticCv.width = W * TS; staticCv.height = H * TS;
    const c = staticCv.getContext('2d');
    c.fillStyle = '#02040c'; c.fillRect(0, 0, W * TS, H * TS);
    // estrellas en el vacío
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 900; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.2 + rnd() * 0.6) + ')'; c.fillRect(rnd() * W * TS, rnd() * H * TS, 1.5, 1.5); }
    const surf = scen === 'mars' ? ['#8a4326', '#9b4f2d', '#6e3420'] : ['#5f6168', '#6c6e75', '#4a4c52'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const g = grid[y][x], px = x * TS, py = y * TS, r = roomAt[y][x];
      if (g === FLOOR) {
        const p = PAL[r] || PAL.hall; c.fillStyle = p[(x + y) % 2]; c.fillRect(px, py, TS, TS);
        c.strokeStyle = 'rgba(255,255,255,.05)'; c.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
        if (r === 'hall' || r[0] === 'v') { if ((x + y) % 6 === 0) { c.fillStyle = 'rgba(56,214,255,.12)'; c.fillRect(px + 12, py + 12, 8, 8); } }
      } else if (g === OUT) {
        c.fillStyle = surf[(x * 7 + y * 3) % 3]; c.fillRect(px, py, TS, TS);
        if (rnd() < 0.3) { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(px + rnd() * TS, py + rnd() * TS, 2 + rnd() * 5, 0, 7); c.fill(); }
      } else if (g === WALL) {
        c.fillStyle = '#0d1222'; c.fillRect(px, py, TS, TS);
        c.fillStyle = '#2a3866'; c.fillRect(px, py, TS, 4);
        c.fillStyle = '#1a2444'; c.fillRect(px + 4, py + 10, 3, 3); c.fillRect(px + TS - 7, py + 10, 3, 3);
      } else if (g === DOOR) {
        c.fillStyle = '#141a2c'; c.fillRect(px, py, TS, TS);
      }
    }
    // Refugio: franjas de advertencia en el suelo
    c.save(); c.globalAlpha = 0.18; c.fillStyle = '#ffc24a';
    for (let x = SHELTER[0]; x <= SHELTER[2]; x++) for (let y = SHELTER[1]; y <= SHELTER[3]; y++) if ((x + y) % 2 === 0) c.fillRect(x * TS, y * TS, TS, TS);
    c.restore();
    for (const f of furn) drawFurn(c, f);
    // Etiquetas de sala
    c.font = 'bold 15px system-ui'; c.textAlign = 'center';
    for (const k of ['bridge', 'life', 'lab', 'gh', 'water', 'reactor', 'rad']) {
      const R = RECTS[k], cx = ((R[0] + R[2] + 1) / 2) * TS, cy = (R[3] + 0.75) * TS;
      c.fillStyle = 'rgba(0,0,0,.45)'; const t = tr(DATA.ROOMS[k]); const w = c.measureText(t).width + 16; rr(c, cx - w / 2, cy - 14, w, 22, 8); c.fill();
      c.fillStyle = ROOMCOL[k]; c.fillText(t, cx, cy + 2);
    }
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
      case 'bed': c.fillStyle = '#4b2f1c'; rr(c, x, y, w, h, 6); c.fill(); c.fillStyle = '#6b4226'; rr(c, x + 4, y + 4, w - 8, h - 8, 4); c.fill(); break;
      case 'tank': c.fillStyle = '#1b6d8f'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 3, h / 2 - 3, 0, 0, 7); c.fill(); c.strokeStyle = '#7fe6ff'; c.lineWidth = 3; c.stroke(); break;
      case 'recycler': c.fillStyle = '#245a7a'; rr(c, x, y, w, h, 10); c.fill(); c.strokeStyle = '#38d6ff'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#0e2c3d'; c.beginPath(); c.arc(x + w / 2, y + h / 2, w / 3, 0, 7); c.fill(); break;
      case 'o2gen': c.fillStyle = '#2e5276'; rr(c, x, y, w, h, 8); c.fill(); c.fillStyle = '#bfe9ff'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillText('O₂', x + w / 2, y + h / 2 + 8); break;
      case 'reactor': c.fillStyle = '#2b1a10'; c.beginPath(); c.arc(x + w / 2, y + h / 2, w / 2, 0, 7); c.fill(); c.strokeStyle = '#ff9a3d'; c.lineWidth = 4; c.stroke(); break;
      case 'battery': c.fillStyle = '#28331f'; rr(c, x + 2, y + 2, w - 4, h - 4, 6); c.fill(); c.strokeStyle = '#8fe36b'; c.lineWidth = 2; c.stroke(); break;
      case 'rover': c.fillStyle = '#20242d'; c.fillRect(x + 4, y + 4, 22, h - 8); c.fillRect(x + w - 26, y + 4, 22, h - 8); c.fillStyle = '#e8ebf2'; rr(c, x + 14, y + 18, w - 28, h - 36, 12); c.fill(); c.fillStyle = '#38d6ff'; rr(c, x + w - 60, y + 30, 34, h - 60, 8); c.fill(); break;
      case 'tools': c.fillStyle = '#3a3f4f'; c.fillRect(x, y + 4, w, h - 8); c.strokeStyle = '#ffc24a'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x + 12 + i * 20, y + 10); c.lineTo(x + 12 + i * 20, y + h - 10); c.stroke(); } break;
      case 'shieldwall': c.fillStyle = '#5d6470'; c.fillRect(x, y, w, h); c.fillStyle = '#ffc24a'; c.fillRect(x, y + h / 2 - 3, w, 6); break;
      case 'benchs': c.fillStyle = '#4b5160'; rr(c, x, y + 4, w, h - 8, 6); c.fill(); break;
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
  function drawChar(c, role, x, y, dir, t, pose, moving, label) {
    const sc = 0.82;
    Chars.draw(c, role, x, y, { dir, t, pose, moving, scale: sc, rm: reduced });
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
    const across = clampN((cw / dpr) / 40, 11, 18); // pantallas estrechas: cámara más cercana para que los personajes se lean
    const zoom = clampN((cw / dpr) / (across * TS), 0.62, 1.5) * dpr;
    cam.z = zoom;
    const vw = cw / zoom, vh = ch / zoom;
    cam.x = clampN(player.x * TS - vw / 2, -TS * 2, W * TS - vw + TS * 2);
    cam.y = clampN(player.y * TS - vh / 2, -TS * 2, H * TS - vh + TS * 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#02040c'; ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(zoom, 0, 0, zoom, -cam.x * zoom, -cam.y * zoom);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(staticCv, 0, 0);
    const t = lastT, rm = reduced;
    // Puertas
    for (const d of doors) {
      const x = d.x * TS, y = d.y * TS, half = TS * (1 - d.open);
      const lockC = d.kind === 'auto' ? '#4f6db8' : '#ffc24a';
      ctx.fillStyle = '#2d3a63'; ctx.fillRect(x, y + 4, half, TS - 8); ctx.fillRect(x + 2 * TS - half, y + 4, half, TS - 8);
      ctx.fillStyle = lockC; ctx.fillRect(x + half - 3, y + 4, 3, TS - 8); ctx.fillRect(x + 2 * TS - half, y + 4, 3, TS - 8);
    }
    // Camas del invernadero (cultivos)
    if (S) for (const f of furn) if (f.kind === 'bed') {
      const b = S.beds[f.bed]; if (!b || !b.crop) continue;
      const x = f.x * TS, y = f.y * TS, n = 5, g = b.prog;
      const col = b.hp < 40 ? '#b59a3a' : b.crop === 'radish' ? '#e0457b' : b.crop === 'micro' ? '#9be36b' : '#3ddc84';
      for (let i = 0; i < n; i++) { const px = x + 10 + i * ((f.w * TS - 20) / (n - 1)), py = y + f.h * TS / 2; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 3 + g * 8, 0, 7); ctx.fill(); }
      if (g >= 1) { ctx.font = '14px system-ui'; ctx.fillText('✨', x + f.w * TS - 10, y + 4); }
    }
    // Luces de cultivo
    if (S && S.sys.gh.lights > 0.05) { ctx.save(); ctx.globalAlpha = 0.12 * S.sys.gh.lights * ((S.lf && S.lf.lights) || 0); ctx.fillStyle = '#ff7af0'; const R = RECTS.gh; ctx.fillRect(R[0] * TS, R[1] * TS, (R[2] - R[0] + 1) * TS, (R[3] - R[1] + 1) * TS); ctx.restore(); }
    // Reactor brillando
    if (S) { const lv = (S.pw && S.pw.rea) || 0; const pulse = rm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3); const g = ctx.createRadialGradient(50 * TS, 22 * TS, 4, 50 * TS, 22 * TS, 70); g.addColorStop(0, 'rgba(255,170,80,' + (0.25 + 0.5 * pulse) * Math.min(1, lv / 6) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(48 * TS - 40, 20 * TS - 40, 4 * TS + 80, 4 * TS + 80); }
    // Consolas
    for (const cn of consoles) {
      const x = cn.x * TS, y = cn.y * TS, blink = rm ? 1 : 0.6 + 0.4 * Math.sin(t * 4 + cn.x);
      const alert = S && S.inc.some((i) => !i.res && i.fix && i.room === cn.room && S.t >= i.from) && cn.verb !== 'play';
      ctx.fillStyle = alert ? 'rgba(255,107,107,' + blink + ')' : 'rgba(56,214,255,' + blink * 0.9 + ')';
      ctx.fillRect(x + 7, y + 7, TS - 14, TS - 16);
      ctx.font = '16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(cn.icon, x + TS / 2, y - 2);
    }
    // Rover fuera
    // Muestras
    for (const s of samples) if (!s.taken) { const x = s.x * TS, y = s.y * TS; ctx.fillStyle = '#c9a26b'; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 9, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffe1a8'; ctx.lineWidth = 2; ctx.stroke(); }
    // Entidades (orden por y)
    const pPose = player.act || o.playerPose || (player.moving ? 'walk' : o.crit ? 'alert' : 'idle');
    const ents = bots.map((b) => ({ y: b.y, f: () => drawChar(ctx, b.role, b.x * TS, b.y * TS + 6, b.dir, b.anim / 8, b.task === 'shelter' && o.crit && !b.moving ? 'alert' : botPose(b, S), b.moving, tr(DATA.ROLE_T[b.role]).split(' ').pop()) }));
    ents.push({ y: player.y, f: () => drawChar(ctx, 'commander', player.x * TS, player.y * TS + 6, player.dir, player.anim / 8, player.moving && !player.act ? 'walk' : pPose, player.moving, o.youLabel || '') });
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.f());
    // Partículas
    for (const p of parts) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; if (p.k === 'ray') ctx.fillRect(p.x * TS, p.y * TS, 2, 10); else { ctx.beginPath(); ctx.arc(p.x * TS, p.y * TS, p.k === 'bub' ? 3 : 2, 0, 7); ctx.fill(); } }
    ctx.globalAlpha = 1;
    // Esclusa: estado
    if (airlock.st.startsWith('cycle')) { ctx.fillStyle = 'rgba(255,194,74,.9)'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText((airlock.st === 'cycle_out' ? (LANG === 'es' ? 'Despresurizando… ' : 'Depressurizing… ') : (LANG === 'es' ? 'Presurizando… ' : 'Pressurizing… ')) + Math.ceil(3 - airlock.t) + ' s', 30 * TS, 45.6 * TS); }
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
    // Flecha guía hacia el objetivo
    if (o.target) {
      const tx = (o.target[0] * TS - cam.x) * zoom, ty = (o.target[1] * TS - cam.y) * zoom;
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
    const w = c.canvas.width, h = c.canvas.height, s = Math.min(w / W, h / H);
    c.clearRect(0, 0, w, h);
    const ox = (w - W * s) / 2, oy = (h - H * s) / 2;
    for (const k in RECTS) {
      const R = RECTS[k];
      c.fillStyle = ROOMCOL[k] ? ROOMCOL[k] + '55' : k === 'pad' ? '#5a4a3a88' : '#3a4466aa';
      c.fillRect(ox + R[0] * s, oy + R[1] * s, (R[2] - R[0] + 1) * s, (R[3] - R[1] + 1) * s);
    }
    if (S) for (const i of S.inc) if (!i.res && S.t >= i.from) { const R = RECTS[i.room]; if (!R) continue; c.strokeStyle = i.sev === 'crit' ? '#ff6b6b' : i.sev === 'warn' ? '#ffc24a' : '#6fb3ff'; c.lineWidth = 3; c.strokeRect(ox + R[0] * s, oy + R[1] * s, (R[2] - R[0] + 1) * s, (R[3] - R[1] + 1) * s); }
    if (target) { c.fillStyle = '#ffc24a'; c.beginPath(); c.arc(ox + target[0] * s, oy + target[1] * s, 5, 0, 7); c.fill(); }
    for (const b of bots) { c.fillStyle = BOTCOL[b.role]; c.fillRect(ox + b.x * s - 2, oy + b.y * s - 2, 5, 5); }
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ox + player.x * s, oy + player.y * s, 5, 0, 7); c.fill();
    c.strokeStyle = '#38d6ff'; c.lineWidth = 2; c.stroke();
  }

  function roomCenter(k) { const R = RECTS[k]; if (!R) return null; const n = N[ROOMNODE[k]]; return n ? [n[0], n[1]] : [(R[0] + R[2] + 1) / 2, (R[1] + R[3] + 1) / 2]; }
  function consolePos(id) { const c = consoles.find((x) => x.id === id); return c ? [c.x + 0.5, c.y + 1.4] : null; }
  function state() { return { px: player.x, py: player.y, samples: samples.map((s) => s.taken), lock: airlock.st === 'out' || airlock.st === 'cycle_out' ? 'out' : 'in' }; }
  function restore(o) {
    if (!o) return;
    if (Number.isFinite(o.px) && Number.isFinite(o.py) && canStand(o.px, o.py, 0.3)) { player.x = o.px; player.y = o.py; }
    if (Array.isArray(o.samples)) o.samples.forEach((t, i) => { if (samples[i]) samples[i].taken = !!t; });
    airlock.st = o.lock === 'out' ? 'out' : 'in';
  }
  function respawnSamples() { samples.forEach((s) => (s.taken = false)); }
  function setReduced(v) { reduced = !!v; }
  function invalidate() { staticCv = null; }

  return { setAct, init, update, render, minimap, nearest, zone, roomName, roomCenter, consolePos, cycleLock, airlock: () => airlock, state, restore, respawnSamples, setReduced, invalidate, player, RECTS, TS,
    _test: { blocked, canStand, get doors() { return doors; }, get bots() { return bots; }, bfs, N } };
})();
