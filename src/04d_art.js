
/* =====================================================================
   ART — dibujo 2D cenital «corte arquitectónico» de la base: casco exterior
   con la silueta completa, techos retirados, interiores con mobiliario y
   profundidad, y el terreno lunar o marciano que rodea todo.
   Todo se pinta una vez en un lienzo (capas); la animación va aparte.
   ===================================================================== */
const Art = (function () {
  const rngOf = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  const GROUP = {
    hab: { hull: ['#7d8fb8', '#3c4a6e'], rim: '#b7c6ea', found: '#232c46' },
    sci: { hull: ['#7fb9a2', '#33604f'], rim: '#bfead8', found: '#1b3329' },
    tec: { hull: ['#c79a68', '#6e4d30'], rim: '#f0cfa0', found: '#3a2616' },
    tube: { hull: ['#8d97ad', '#4a5268'], rim: '#cdd5e6', found: '#262b3a' }
  };
  /** Añade al trazado actual el contorno de una forma, ampliado e píxeles. */
  function addShape(c, s, e, TS) {
    const x0 = s.x0 * TS - e, y0 = s.y0 * TS - e, x1 = (s.x1 + 1) * TS + e, y1 = (s.y1 + 1) * TS + e;
    if (s.t === 'r') { c.rect(x0, y0, x1 - x0, y1 - y0); return; }
    if (s.t === 'rr') { const r = s.r * TS + e; c.moveTo(x0 + r, y0); c.arcTo(x1, y0, x1, y1, r); c.arcTo(x1, y1, x0, y1, r); c.arcTo(x0, y1, x0, y0, r); c.arcTo(x0, y0, x1, y0, r); c.closePath(); return; }
    const cc = s.c * TS + e * 0.4142, k = s.k, tl = k.includes('tl'), tr = k.includes('tr'), br = k.includes('br'), bl = k.includes('bl');
    c.moveTo(x0 + (tl ? cc : 0), y0); c.lineTo(x1 - (tr ? cc : 0), y0); if (tr) c.lineTo(x1, y0 + cc);
    c.lineTo(x1, y1 - (br ? cc : 0)); if (br) c.lineTo(x1 - cc, y1);
    c.lineTo(x0 + (bl ? cc : 0), y1); if (bl) c.lineTo(x0, y1 - cc);
    c.lineTo(x0, y0 + (tl ? cc : 0)); if (tl) c.lineTo(x0 + cc, y0); c.closePath();
  }
  const roomPath = (c, def, e, TS) => { c.beginPath(); for (const s of def.s) addShape(c, s, e, TS); };
  const bbox = (def, TS) => { let a = 1e9, b = 1e9, x = -1, y = -1; for (const s of def.s) { a = Math.min(a, s.x0); b = Math.min(b, s.y0); x = Math.max(x, s.x1 + 1); y = Math.max(y, s.y1 + 1); } return [a * TS, b * TS, x * TS, y * TS]; };
  function stripes(a, b, w) { const p = document.createElement('canvas'); p.width = p.height = 16; const c = p.getContext('2d'); c.fillStyle = a; c.fillRect(0, 0, 16, 16); c.fillStyle = b; c.beginPath(); c.moveTo(0, 8); c.lineTo(8, 0); c.lineTo(16, 0); c.lineTo(0, 16); c.closePath(); c.fill(); c.beginPath(); c.moveTo(16, 8); c.lineTo(8, 16); c.lineTo(16, 16); c.closePath(); c.fill(); return p; }

  /* ---------- Terreno ---------- */
  function terrain(c, d, rnd) {
    const mars = d.scen === 'mars', TS = d.TS, w = d.W * TS, h = d.H * TS;
    const P = mars ? { base: '#9a5230', dark: '#6e3820', light: '#c27a47', dust: '216,150,98', rock: ['#7a3d22', '#a85a35', '#4f2616'], track: '#5a2d18' } : { base: '#686970', dark: '#44454b', light: '#8d8e96', dust: '170,170,180', rock: ['#5a5b62', '#8a8b93', '#35363b'], track: '#3e3f45' };
    c.fillStyle = P.base; c.fillRect(0, 0, w, h);
    // grandes manchas tonales y regolito fino
    for (let i = 0; i < 70; i++) { const x = rnd() * w, y = rnd() * h, r = 120 + rnd() * 380, g = c.createRadialGradient(x, y, 0, x, y, r); const dark = rnd() < 0.5; g.addColorStop(0, dark ? P.dark + '55' : P.light + '40'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 9000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,' + (0.06 + rnd() * 0.12) + ')' : 'rgba(255,255,255,' + (0.04 + rnd() * 0.09) + ')'; c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.2, 1 + rnd() * 1.6); }
    const sc = d.scenery;
    if (mars) {
      // dunas: crestas curvas con cara de sombra y cara iluminada, y estrías del viento
      for (const u of sc.dunes) {
        const x = u.x * TS, y = u.y * TS, ww = u.w * TS, hh = (1.2 + u.w * 0.12) * TS;
        c.save(); c.translate(x, y); c.rotate(u.a);
        c.fillStyle = 'rgba(70,28,14,.28)'; c.beginPath(); c.ellipse(ww / 2, hh * 0.65, ww / 2, hh * 0.55, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(' + P.dust + ',.30)'; c.beginPath(); c.ellipse(ww / 2, hh * 0.5, ww / 2, hh * 0.5, 0, Math.PI, 0); c.fill();
        c.strokeStyle = 'rgba(' + P.dust + ',.5)'; c.lineWidth = 2; c.beginPath(); c.ellipse(ww / 2, hh * 0.5, ww / 2, hh * 0.5, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        c.strokeStyle = 'rgba(60,24,12,.18)'; c.lineWidth = 1; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(ww * 0.1, hh * (0.55 + k * 0.08)); c.quadraticCurveTo(ww / 2, hh * (0.4 + k * 0.1), ww * 0.9, hh * (0.6 + k * 0.07)); c.stroke(); }
        c.restore();
      }
      for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, r = 80 + rnd() * 200; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + P.dust + ',.16)'); g.addColorStop(1, 'rgba(' + P.dust + ',0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
    }
    // cráteres: borde iluminado, interior sombreado, eyecciones
    for (const k of sc.craters) {
      const x = k.x * TS, y = k.y * TS, r = k.r * TS;
      const g = c.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r); g.addColorStop(0, mars ? 'rgba(60,24,12,.34)' : 'rgba(10,10,16,.62)'); g.addColorStop(0.75, mars ? 'rgba(60,24,12,.20)' : 'rgba(20,20,26,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.lineWidth = Math.max(2, r * 0.07); c.strokeStyle = 'rgba(255,255,255,' + (mars ? 0.16 : 0.26) + ')'; c.beginPath(); c.arc(x, y, r, Math.PI * 0.95, Math.PI * 1.75); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,' + (mars ? 0.22 : 0.34) + ')'; c.beginPath(); c.arc(x, y, r, -Math.PI * 0.1, Math.PI * 0.7); c.stroke();
      if (!mars && r > 60) for (let i = 0; i < 14; i++) { const a = rnd() * 6.28, rr2 = r * (1.15 + rnd() * 0.5); c.fillStyle = 'rgba(190,190,200,.25)'; c.beginPath(); c.arc(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2, 1.5 + rnd() * 3, 0, 7); c.fill(); }
    }
    // huellas de rover (rutas de exploración navegables): banda compactada y dos surcos con marcas de banda de rodadura
    for (const t of sc.tracks) {
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(' + P.dust + ',.16)'; c.lineWidth = TS * 2.6; c.beginPath(); t.forEach((p, i) => (i ? c.lineTo(p[0] * TS, p[1] * TS) : c.moveTo(p[0] * TS, p[1] * TS))); c.stroke();
      for (const off of [-0.5, 0.5]) {
        c.beginPath(); for (let i = 1; i < t.length; i++) {
          const a = t[i - 1], b = t[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * off, ny = dx / l * off;
          if (i === 1) c.moveTo((a[0] + nx) * TS, (a[1] + ny) * TS); c.lineTo((b[0] + nx) * TS, (b[1] + ny) * TS);
        }
        c.strokeStyle = P.track; c.globalAlpha = 0.5; c.lineWidth = 5; c.setLineDash([]); c.stroke();
        c.globalAlpha = 0.45; c.lineWidth = 9; c.setLineDash([2, 7]); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      }
    }
    // plataforma de aterrizaje
    const pd = sc.pad, px = pd.c[0] * TS, py = pd.c[1] * TS, pr = pd.r * TS;
    let g = c.createRadialGradient(px, py, pr * 0.2, px, py, pr); g.addColorStop(0, '#6b7080'); g.addColorStop(1, '#4b505e');
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(px + 8, py + 10, pr + 4, 0, 7); c.fill();
    c.fillStyle = g; c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill();
    c.lineWidth = 6; c.strokeStyle = '#d9a72b'; c.setLineDash([22, 14]); c.beginPath(); c.arc(px, py, pr - 6, 0, 7); c.stroke(); c.setLineDash([]);
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(px, py, pr * 0.62, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 6; c.beginPath(); c.moveTo(px - pr * 0.28, py - pr * 0.3); c.lineTo(px - pr * 0.28, py + pr * 0.3); c.moveTo(px + pr * 0.28, py - pr * 0.3); c.lineTo(px + pr * 0.28, py + pr * 0.3); c.moveTo(px - pr * 0.28, py); c.lineTo(px + pr * 0.28, py); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.fillStyle = i % 2 ? '#ffd36b' : '#ff6b6b'; c.beginPath(); c.arc(px + Math.cos(a) * (pr - 2), py + Math.sin(a) * (pr - 2), 4, 0, 7); c.fill(); }
    c.fillStyle = '#e8eefc'; c.font = 'bold ' + Math.round(TS * 0.7) + 'px system-ui'; c.textAlign = 'center';
  }

  /* ---------- Pisos por sala ---------- */
  function floorKind(c, d, k, def, rnd) {
    const TS = d.TS, bb = bbox(def, TS), kind = def.floor;
    const g = c.createLinearGradient(bb[0], bb[1], bb[2], bb[3]); g.addColorStop(0, def.col[0]); g.addColorStop(1, def.col[1]);
    c.fillStyle = g; c.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]);
    const x0 = Math.floor(bb[0] / TS), x1 = Math.ceil(bb[2] / TS), y0 = Math.floor(bb[1] / TS), y1 = Math.ceil(bb[3] / TS);
    const cell = (fn) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) fn(x * TS, y * TS, x, y); };
    c.lineWidth = 1;
    if (kind === 'plate' || kind === 'tube') cell((px, py, x, y) => { c.strokeStyle = 'rgba(255,255,255,.07)'; c.strokeRect(px + 1.5, py + 1.5, TS - 3, TS - 3); if ((x + y) % 2 === 0) { c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(px, py, TS, TS); } c.fillStyle = 'rgba(255,255,255,.12)'; for (const [ax, ay] of [[4, 4], [TS - 4, 4], [4, TS - 4], [TS - 4, TS - 4]]) { c.beginPath(); c.arc(px + ax, py + ay, 1.3, 0, 7); c.fill(); } });
    if (kind === 'deck') { cell((px, py, x, y) => { c.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; c.fillRect(px, py, TS, TS); c.strokeStyle = 'rgba(255,255,255,.06)'; c.strokeRect(px + .5, py + .5, TS - 1, TS - 1); }); const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2 + 20; for (const r of [150, 105]) { c.strokeStyle = 'rgba(79,125,255,' + (r > 120 ? 0.25 : 0.35) + ')'; c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy, r, r * 0.55, 0, 0, 7); c.stroke(); } }
    if (kind === 'carpet') { cell((px, py, x, y) => { c.fillStyle = 'rgba(255,255,255,' + (((x * 7 + y * 3) % 5) * 0.01 + 0.02) + ')'; c.fillRect(px, py, TS, TS); }); c.strokeStyle = 'rgba(176,124,255,.35)'; c.lineWidth = 4; c.strokeRect(bb[0] + TS * 1.2, bb[1] + TS * 1.2, bb[2] - bb[0] - TS * 2.4, bb[3] - bb[1] - TS * 2.4); c.strokeStyle = 'rgba(255,255,255,.12)'; c.setLineDash([6, 6]); c.strokeRect(bb[0] + TS * 1.5, bb[1] + TS * 1.5, bb[2] - bb[0] - TS * 3, bb[3] - bb[1] - TS * 3); c.setLineDash([]); }
    if (kind === 'clean') { cell((px, py) => { c.strokeStyle = 'rgba(255,255,255,.11)'; c.strokeRect(px + .5, py + .5, TS - 1, TS - 1); }); if (k === 'med') { const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2; c.fillStyle = 'rgba(255,90,130,.16)'; c.fillRect(cx - 7, cy - 30, 14, 60); c.fillRect(cx - 30, cy - 7, 60, 14); } }
    if (kind === 'grate' || kind === 'tube') { c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 2; for (let i = -(bb[3] - bb[1]); i < bb[2] - bb[0]; i += 9) { c.beginPath(); c.moveTo(bb[0] + i, bb[1]); c.lineTo(bb[0] + i + (bb[3] - bb[1]), bb[3]); c.stroke(); } }
    if (kind === 'checker') cell((px, py, x, y) => { if ((x + y) % 2) { c.fillStyle = 'rgba(255,230,200,.10)'; c.fillRect(px, py, TS, TS); } });
    if (kind === 'crates') { cell((px, py) => { c.strokeStyle = 'rgba(255,255,255,.05)'; c.strokeRect(px + .5, py + .5, TS - 1, TS - 1); }); c.strokeStyle = 'rgba(255,214,70,.45)'; c.lineWidth = 3; c.setLineDash([14, 10]); const mx = (bb[0] + bb[2]) / 2; c.beginPath(); c.moveTo(mx, bb[1] + TS); c.lineTo(mx, bb[3] - TS); c.stroke(); c.setLineDash([]); }
    if (kind === 'soil') { cell((px, py, x, y) => { c.fillStyle = 'rgba(' + (((x * 13 + y * 7) % 3) ? '20,60,34' : '60,110,60') + ',.10)'; c.fillRect(px, py, TS, TS); }); for (let i = 0; i < 380; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(110,200,110,.25)' : 'rgba(30,80,40,.35)'; c.fillRect(bb[0] + rnd() * (bb[2] - bb[0]), bb[1] + rnd() * (bb[3] - bb[1]), 2, 3); } c.strokeStyle = 'rgba(200,180,120,.22)'; c.lineWidth = 12; for (const row of [18.5, 24.5, 30]) { c.beginPath(); c.moveTo(bb[0], (row + 10) * TS + 54); c.lineTo(bb[2], (row + 10) * TS + 54); c.stroke(); } }
    if (kind === 'hex') { c.strokeStyle = 'rgba(180,170,255,.14)'; c.lineWidth = 1; const s = 14, hh = s * Math.sqrt(3); for (let y = bb[1]; y < bb[3] + hh; y += hh) for (let x = bb[0]; x < bb[2] + s * 3; x += s * 3) for (const o of [0, 1]) { const cx = x + (o ? s * 1.5 : 0), cy = y + (o ? hh / 2 : 0); c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](cx + s * Math.cos(a), cy + s * Math.sin(a)); } c.closePath(); c.stroke(); } }
    if (kind === 'hazard') { cell((px, py, x, y) => { c.strokeStyle = 'rgba(255,255,255,.06)'; c.strokeRect(px + 1.5, py + 1.5, TS - 3, TS - 3); }); }
    if (kind === 'bay') {
      cell((px, py, x, y) => { c.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.05)'; c.fillRect(px, py, TS, TS); });
      c.strokeStyle = 'rgba(255,214,70,.55)'; c.lineWidth = 4; c.setLineDash([26, 16]); for (const yy of [53.6 + 10, 65.1 + 10]) { c.beginPath(); c.moveTo((35 + 12) * TS, yy * TS); c.lineTo((77 + 12) * TS, yy * TS); c.stroke(); } c.setLineDash([]);
      c.strokeStyle = 'rgba(255,255,255,.30)'; c.lineWidth = 6; const lx = d.LOCK.x * TS; c.beginPath(); c.moveTo(lx, 67 * TS); c.lineTo(lx, 74 * TS); c.moveTo(lx - 22, 72.4 * TS); c.lineTo(lx, 74.2 * TS); c.lineTo(lx + 22, 72.4 * TS); c.stroke();
    }
  }

  /* ---------- Props exteriores ---------- */
  function drawProp(c, d, p, rnd) {
    const TS = d.TS, x = p.x * TS, y = p.y * TS, w = p.w * TS, h = p.h * TS, mars = d.scen === 'mars';
    switch (p.k) {
      case 'solar': {
        c.fillStyle = '#1b2236'; c.fillRect(x - 3, y - 3, w + 6, h + 6);
        const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#3b6ec8'); g.addColorStop(1, '#17306a');
        c.fillStyle = g; c.fillRect(x, y, w, h);
        c.strokeStyle = 'rgba(190,220,255,.35)'; c.lineWidth = 1; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x + w * i / 6, y); c.lineTo(x + w * i / 6, y + h); c.stroke(); } for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(x, y + h * i / 3); c.lineTo(x + w, y + h * i / 3); c.stroke(); }
        c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.45, y); c.lineTo(x, y + h * 0.6); c.closePath(); c.fill();
        c.fillStyle = '#9aa3b8'; c.fillRect(x + w / 2 - 3, y + h, 6, 8); break;
      }
      case 'antenna': {
        const cx = x + w / 2, cy = y + h / 2;
        c.fillStyle = '#303747'; c.beginPath(); c.arc(cx, cy, 15, 0, 7); c.fill(); c.strokeStyle = '#9aa3b8'; c.lineWidth = 3; c.stroke();
        c.strokeStyle = '#c9d0e0'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 2, cy - 30); c.stroke();
        const g = c.createRadialGradient(cx - 6, cy - 44, 2, cx, cy - 36, 24); g.addColorStop(0, '#f2f5ff'); g.addColorStop(1, '#8d97ad'); c.fillStyle = g; c.beginPath(); c.ellipse(cx + 2, cy - 36, 24, 15, -0.5, 0, 7); c.fill(); c.strokeStyle = '#59627a'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#ff5a5a'; c.beginPath(); c.arc(cx + 2, cy - 36, 3, 0, 7); c.fill(); break;
      }
      case 'container': {
        const col = ['#c0603a', '#3a6ea5', '#7a8f3a', '#c9a23a'][p.c % 4];
        c.fillStyle = col; c.fillRect(x, y, w, h); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x + w * i / 6, y + 2); c.lineTo(x + w * i / 6, y + h - 2); c.stroke(); }
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.strokeRect(x + 1, y + 1, w - 2, h - 2); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + 3, y + 3, w - 6, 4); break;
      }
      case 'auxdome': {
        const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
        const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r); g.addColorStop(0, p.shelter ? '#d9e3f5' : '#bfc9dc'); g.addColorStop(1, p.shelter ? '#7a86a3' : '#566077'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; for (const a of [0, 1, 2]) { c.beginPath(); c.arc(cx, cy, r * (0.35 + a * 0.28), Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
        c.fillStyle = '#26345e'; c.fillRect(cx - 9, cy + r * 0.35, 18, r * 0.65); if (p.shelter) { c.fillStyle = '#ffc24a'; c.fillRect(cx - r * 0.7, cy - 4, r * 1.4, 4); } break;
      }
      case 'auxtank': { const cx = x + w / 2, cy = y + h / 2, r = w / 2; const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r); g.addColorStop(0, '#9fd8ee'); g.addColorStop(1, '#2d6f8c'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.strokeStyle = '#0e3347'; c.lineWidth = 3; c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(cx - r * 0.3, cy - r * 0.35, r * 0.2, 0, 7); c.fill(); break; }
      case 'tripod': { const cx = x + w / 2, cy = y + h / 2; c.strokeStyle = '#303747'; c.lineWidth = 3; for (const a of [0.6, 2.5, 4.4]) { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22); c.stroke(); } c.fillStyle = '#e8ecf6'; c.fillRect(cx - 8, cy - 8, 16, 16); c.fillStyle = '#26345e'; c.fillRect(cx - 4, cy - 4, 8, 8); c.fillStyle = '#ff9a3d'; c.fillRect(cx - 8, cy - 8, 16, 3); break; }
      case 'vehicle': {
        c.fillStyle = '#1c1f27'; for (let i = 0; i < 3; i++) { c.fillRect(x + 6 + i * (w - 24) / 2, y - 3, 12, 8); c.fillRect(x + 6 + i * (w - 24) / 2, y + h - 5, 12, 8); }
        c.fillStyle = p.v ? '#e8c46a' : '#e8ebf2'; c.beginPath(); c.roundRect ? c.roundRect(x + 4, y + 4, w - 8, h - 8, 10) : c.rect(x + 4, y + 4, w - 8, h - 8); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#26345e'; c.fillRect(x + w - 30, y + 10, 18, h - 20); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x + 12, y + 9, w - 50, 4); if (p.v) { c.fillStyle = '#7a8296'; c.fillRect(x + 14, y + 16, 30, h - 32); } break;
      }
      case 'rock': case 'mesa': {
        const cx = x + w / 2, cy = y + h / 2, n = p.k === 'mesa' ? 9 : 8, rs = rngOf(Math.floor(p.r * 9999) + 3), pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * 6.283, rr2 = 0.75 + rs() * 0.45; pts.push([cx + Math.cos(a) * w / 2 * rr2, cy + Math.sin(a) * h / 2 * rr2]); }
        const tone = d.scen === 'mars' ? ['#a65a36', '#6b3420', '#d98d5c'] : ['#8d8e96', '#4a4b52', '#b8b9c2'];
        const draw = (dx, dy, s) => { c.fillStyle = s; c.beginPath(); pts.forEach((q, i) => c[i ? 'lineTo' : 'moveTo'](q[0] + dx, q[1] + dy)); c.closePath(); c.fill(); };
        draw(0, 0, tone[1]); draw(-2, -3, tone[0]);
        if (p.k === 'mesa') { draw(-4, -9, tone[0]); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - w * 0.3, cy + 2); c.lineTo(cx + w * 0.3, cy - 2); c.stroke(); }
        c.fillStyle = tone[2] + '88'; c.beginPath(); c.arc(cx - w * 0.15, cy - h * 0.2, Math.min(w, h) * 0.12, 0, 7); c.fill(); break;
      }
      case 'pebble': c.fillStyle = d.scen === 'mars' ? 'rgba(70,30,16,.55)' : 'rgba(50,50,56,.6)'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0.5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(x + w / 2 - 2, y + h / 2 - 2, w / 4, h / 4, 0.5, 0, 7); c.fill(); break;
    }
  }
  function propShadow(c, d, p, dx, dy, a) {
    const TS = d.TS, x = p.x * TS, y = p.y * TS, w = p.w * TS, h = p.h * TS;
    c.fillStyle = 'rgba(8,10,20,' + a + ')';
    if (['rock', 'mesa', 'auxdome', 'auxtank', 'antenna'].includes(p.k)) { c.beginPath(); c.ellipse(x + w / 2 + dx * (p.k === 'antenna' ? 1.6 : 1), y + h / 2 + dy * (p.k === 'antenna' ? 1.6 : 1), w / 2 + (p.k === 'mesa' ? 8 : 4), h / 2 + 4, 0.3, 0, 7); c.fill(); }
    else if (p.k !== 'pebble' && p.k !== 'pad') { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w + dx, y + h + dy); c.lineTo(x + dx, y + h + dy); c.lineTo(x + dx, y + dy); c.lineTo(x, y); c.closePath(); c.fill(); c.fillRect(x + dx * 0.5, y + dy * 0.5, w, h); }
  }

  /* ---------- Construcción ---------- */
  function build(d) {
    const TS = d.TS, w = d.W * TS, h = d.H * TS, mars = d.scen === 'mars';
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
    const rnd = rngOf(mars ? 777 : 313), rk = Object.keys(d.rooms);
    const sdx = mars ? 22 : 36, sdy = mars ? 28 : 46; // sombras: Luna, largas y marcadas; Marte, más suaves
    terrain(c, d, rnd);
    // sombras de la base y de los elementos exteriores sobre el terreno
    { // sombras en un lienzo auxiliar de menor resolución (se escala suavizado: barato y sin filtros costosos)
      const k = mars ? 0.3 : 0.55, sh = document.createElement('canvas'); sh.width = Math.ceil(w * k); sh.height = Math.ceil(h * k);
      const sc2 = sh.getContext('2d'); sc2.scale(k, k); sc2.fillStyle = '#0a0c16';
      for (const rk2 of rk) { roomPath(sc2, d.rooms[rk2], TS * 1.0, TS); sc2.save(); sc2.translate(sdx, sdy); sc2.fill(); sc2.restore(); }
      for (const p of d.props) if (p.solid) { sc2.globalAlpha = 0.85; propShadow(sc2, d, p, sdx * 0.7, sdy * 0.7, 1); sc2.globalAlpha = 1; }
      c.save(); c.globalAlpha = mars ? 0.42 : 0.62; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(sh, 0, 0, w, h); c.restore();
    }
    // cimientos y casco exterior (silueta completa, sin techo: se ve el interior)
    for (const k of rk) { const def = d.rooms[k], G = GROUP[def.g]; roomPath(c, def, TS * 1.45, TS); c.fillStyle = G.found; c.fill(); c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 2; c.stroke(); }
    for (const k of rk) {
      const def = d.rooms[k], G = GROUP[def.g], bb = bbox(def, TS);
      const g = c.createLinearGradient(bb[0], bb[1], bb[2], bb[3]); g.addColorStop(0, G.hull[0]); g.addColorStop(1, G.hull[1]);
      roomPath(c, def, TS * 1.0, TS); c.fillStyle = g; c.fill();
    }
    for (const k of rk) {
      const def = d.rooms[k], G = GROUP[def.g];
      roomPath(c, def, TS * 1.0, TS); c.strokeStyle = G.rim; c.lineWidth = 3; c.stroke();
      roomPath(c, def, TS * 0.62, TS); c.strokeStyle = 'rgba(0,0,0,.30)'; c.lineWidth = 2; c.setLineDash([20, 12]); c.stroke(); c.setLineDash([]);
      c.lineCap = 'round'; roomPath(c, def, TS * 0.5, TS); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 4; c.setLineDash([0.1, 22]); c.stroke(); c.setLineDash([]); c.lineCap = 'butt'; // remaches
      if (def.g !== 'tube') { roomPath(c, def, TS * 0.28, TS); c.strokeStyle = 'rgba(255,226,150,.5)'; c.lineWidth = 6; c.lineCap = 'round'; c.setLineDash([0.1, 54]); c.stroke(); c.setLineDash([]); c.lineCap = 'butt'; } // ventanas iluminadas
    }
    // suelos
    for (const k of rk) {
      const def = d.rooms[k]; roomPath(c, def, 0, TS); c.save(); c.clip(); floorKind(c, d, k, def, rnd);
      // iluminación en charcos y oclusión ambiental en los bordes (profundidad de las paredes)
      const bb = bbox(def, TS), nL = def.g === 'tube' ? 0 : 3;
      for (let i = 0; i < nL; i++) { const lx = bb[0] + (bb[2] - bb[0]) * (0.2 + 0.3 * i), ly = bb[1] + (bb[3] - bb[1]) * (0.35 + 0.25 * ((i + 1) % 2)), r = Math.min(bb[2] - bb[0], bb[3] - bb[1]) * 0.45; const lg = c.createRadialGradient(lx, ly, 0, lx, ly, r); lg.addColorStop(0, 'rgba(255,245,210,.13)'); lg.addColorStop(1, 'rgba(255,245,210,0)'); c.fillStyle = lg; c.fillRect(lx - r, ly - r, r * 2, r * 2); }
      roomPath(c, def, 0, TS); c.strokeStyle = 'rgba(0,0,0,.42)'; c.lineWidth = TS * 1.0; c.stroke();
      c.save(); c.translate(0, 7); roomPath(c, def, 0, TS); c.strokeStyle = 'rgba(0,0,0,.30)'; c.lineWidth = TS * 0.5; c.stroke(); c.restore(); // la pared proyecta sombra hacia dentro
      roomPath(c, def, 1, TS); c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2; c.stroke();
      c.restore();
      if (def.g === 'tec' && k !== 'lock') { roomPath(c, def, -TS * 0.22, TS); c.save(); c.clip(); roomPath(c, def, -TS * 0.22, TS); c.strokeStyle = 'rgba(40,46,60,.9)'; c.lineWidth = 7; c.stroke(); c.strokeStyle = 'rgba(190,200,220,.35)'; c.lineWidth = 2; c.stroke(); c.restore(); } // tuberías por el perímetro
      if (k === 'lock' || k === 'reactor') { roomPath(c, def, -2, TS); c.save(); c.clip(); const sp = c.createPattern(stripes('#1a1a1a', '#e0a82e'), 'repeat'); roomPath(c, def, 0, TS); c.strokeStyle = sp; c.lineWidth = k === 'lock' ? 10 : 8; c.stroke(); c.restore(); }
      if (k === 'gh') { roomPath(c, def, TS * 0.7, TS); c.strokeStyle = 'rgba(190,255,220,.30)'; c.lineWidth = 3; c.setLineDash([30, 14]); c.stroke(); c.setLineDash([]); roomPath(c, def, TS * 0.9, TS); c.strokeStyle = 'rgba(230,255,240,.25)'; c.lineWidth = 5; c.stroke(); }
    }
    // tubos presurizados: nervaduras transversales
    for (const k of rk) { const def = d.rooms[k]; if (def.g !== 'tube') continue; const s = def.s[0], horiz = s.x1 - s.x0 > s.y1 - s.y0; c.strokeStyle = 'rgba(150,175,215,.35)'; c.lineWidth = 3; if (horiz) for (let x = s.x0 * TS + 10; x < (s.x1 + 1) * TS; x += 16) { c.beginPath(); c.moveTo(x, s.y0 * TS - TS * 0.9); c.lineTo(x, (s.y1 + 1) * TS + TS * 0.9); c.stroke(); } else for (let y = s.y0 * TS + 10; y < (s.y1 + 1) * TS; y += 16) { c.beginPath(); c.moveTo(s.x0 * TS - TS * 0.9, y); c.lineTo((s.x1 + 1) * TS + TS * 0.9, y); c.stroke(); } }
    // marcos de puertas
    for (const dr of d.doors) { const x = dr.x * TS, y = dr.y * TS; c.fillStyle = '#10162a'; c.fillRect(x - 3, y - 3, dr.w * TS + 6, dr.h * TS + 6); c.strokeStyle = dr.kind === 'auto' ? '#4f6db8' : '#ffc24a'; c.lineWidth = 2; c.strokeRect(x - 2, y - 2, dr.w * TS + 4, dr.h * TS + 4); }
    // mobiliario con profundidad (sombra proyectada) y conductos
    for (const f of d.furn) {
      if (f.kind === 'window' || f.kind === 'planter') continue;
      c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 7; c.shadowOffsetX = 3; c.shadowOffsetY = 6; d.drawFurn(c, f); c.restore();
    }
    for (const f of d.furn) if (f.kind === 'window' || f.kind === 'planter') d.drawFurn(c, f);
    // cables entre máquinas y consolas
    c.strokeStyle = 'rgba(15,18,30,.7)'; c.lineWidth = 3; c.lineCap = 'round';
    for (const f of d.furn) if (f.kind === 'reactor') for (const q of d.furn) if (q.kind === 'battery') { c.beginPath(); c.moveTo((q.x + 2) * TS, (q.y + 1) * TS); c.quadraticCurveTo((q.x + 4) * TS, (q.y + 2.5) * TS, f.x * TS + 6, (f.y + f.h / 2) * TS); c.stroke(); }
    c.lineCap = 'butt';
    // refugio: franjas de advertencia
    c.save(); c.globalAlpha = 0.2; c.fillStyle = '#ffc24a'; for (let x = d.SHELTER[0]; x <= d.SHELTER[2]; x++) for (let y = d.SHELTER[1]; y <= d.SHELTER[3]; y++) if ((x + y) % 2 === 0) c.fillRect(x * TS, y * TS, TS, TS); c.restore();
    // exterior: paneles, antenas, contenedores, módulos auxiliares, vehículos y rocas
    for (const p of d.props) if (p.k !== 'pad') drawProp(c, d, p, rnd);
    for (const l of d.scenery.lamps) { const x = l[0] * TS, y = l[1] * TS; const g = c.createRadialGradient(x, y, 2, x, y, 120); g.addColorStop(0, 'rgba(255,225,150,.35)'); g.addColorStop(1, 'rgba(255,225,150,0)'); c.fillStyle = g; c.fillRect(x - 120, y - 120, 240, 240); c.fillStyle = '#2a3042'; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(x, y - 6, 4, 0, 7); c.fill(); }
    // rótulos de sala (placas)
    c.textAlign = 'center';
    for (const k of rk) { const def = d.rooms[k]; if (def.g === 'tube') continue; const bb = bbox(def, TS), nm = (typeof tr === 'function' && DATA.ROOMS[k]) ? tr(DATA.ROOMS[k]) : k; c.font = 'bold 13px system-ui'; const tw = c.measureText(nm).width + 18, cx = (bb[0] + bb[2]) / 2, cy = bb[1] + TS * 0.9 + (k === 'bridge' ? TS * 2.2 : 0); c.fillStyle = 'rgba(5,8,20,.55)'; d.rr(c, cx - tw / 2, cy - 12, tw, 20, 8); c.fill(); c.fillStyle = d.ROOMCOL[k] || '#e8eefc'; c.fillText(nm, cx, cy + 3); }
    // viñeta en los bordes del mundo
    const eg = c.createLinearGradient(0, 0, 0, TS * 3); eg.addColorStop(0, 'rgba(0,0,0,.65)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = eg; c.fillRect(0, 0, w, TS * 3);
    const eg2 = c.createLinearGradient(0, h, 0, h - TS * 3); eg2.addColorStop(0, 'rgba(0,0,0,.65)'); eg2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = eg2; c.fillRect(0, h - TS * 3, w, TS * 3);
    const eg3 = c.createLinearGradient(0, 0, TS * 3, 0); eg3.addColorStop(0, 'rgba(0,0,0,.65)'); eg3.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = eg3; c.fillRect(0, 0, TS * 3, h);
    const eg4 = c.createLinearGradient(w, 0, w - TS * 3, 0); eg4.addColorStop(0, 'rgba(0,0,0,.65)'); eg4.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = eg4; c.fillRect(w - TS * 3, 0, TS * 3, h);
    const mapCv = document.createElement('canvas'); mapCv.width = 1120; mapCv.height = Math.round(1120 * d.H / d.W);
    const mc = mapCv.getContext('2d'); mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = 'high'; mc.drawImage(cv, 0, 0, mapCv.width, mapCv.height);
    return { cv, mapCv };
  }
  return { build };
})();
