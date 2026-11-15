/* =====================================================================
   LANDART — dibujo de la llegada: nave, planeta, descenso, polvo y despliegue.
   Todo en Canvas 2D, sin imágenes. Las funciones reciben el contexto y el
   estado; no guardan nada del juego. Luna y Marte usan escenas distintas
   (no es el mismo dibujo con otros colores): sin aire / con aire, polvo
   balístico / polvo con arrastre y viento, plumas de motor distintas,
   escudo térmico y paracaídas solo en Marte.
   ===================================================================== */
const LandArt = (function () {
  const TS = 32, TAU = 6.2832;
  const hs = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, u) => a + (b - a) * u, cl = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (u) => { u = cl(u, 0, 1); return u * u * (3 - 2 * u); };
  const sub = (u, a, b) => cl((u - a) / (b - a), 0, 1); // tramo [a,b] de u → 0..1
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const LED = { ok: '#6fffa0', warn: '#ffc857', down: '#ff6b6b' };

  /* ---------- Nave en vista lateral ----------
     Origen: centro de la base entre las patas, sobre el suelo. s = píxeles por unidad (la nave mide ≈ 110 u). */
  function shipSide(c, x, y, s, o) {
    o = o || {}; const t = o.t || 0, leg = o.legs == null ? 1 : o.legs, comp = (o.comp || 0) * 3;
    c.save(); c.translate(x, y); c.scale(s, s); if (o.tilt) c.rotate(o.tilt);
    // plumas del motor (detrás de la nave)
    if (o.flame > 0.02) flame(c, o.flame, o.scen, t);
    // paracaídas
    if (o.chute > 0.02) {
      const k = o.chute, W = 62 * k, H = 38 * k, top = -200 - 40 * k;
      c.strokeStyle = 'rgba(230,230,235,.7)'; c.lineWidth = 0.8; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 3.2, -100); c.lineTo(i * W / 4.6, top + H * 0.35 + Math.abs(i) * 1.6); c.stroke(); }
      const g = c.createLinearGradient(-W, top, W, top); g.addColorStop(0, '#f4f1ea'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#f4f1ea'); c.fillStyle = g;
      c.beginPath(); c.ellipse(0, top + H * 0.4, W, H, 0, Math.PI, 0); c.lineTo(W, top + H * 0.4); c.quadraticCurveTo(0, top + H * 0.9, -W, top + H * 0.4); c.fill();
    }
    // patas (se extienden con leg: 0 plegadas → 1 abiertas)
    const fx = lerp(14, 31, leg), fy = lerp(-16, 0, leg) + comp * 0.2;
    c.strokeStyle = '#9097a8'; c.lineWidth = 2.6; c.lineCap = 'round';
    for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(sg * 12, -24); c.lineTo(sg * fx, fy - 2); c.stroke(); c.beginPath(); c.moveTo(sg * 15, -46); c.lineTo(sg * lerp(15, 22, leg), -22 + comp * 0.5); c.stroke(); c.fillStyle = '#c9cfdc'; c.beginPath(); c.ellipse(sg * fx, fy, 6.2, 2.2, 0, 0, TAU); c.fill(); }
    c.lineCap = 'butt';
    // campana del motor
    c.fillStyle = '#3a3f4f'; c.beginPath(); c.moveTo(-6, -17 + comp); c.lineTo(-10, -7 + comp); c.lineTo(10, -7 + comp); c.lineTo(6, -17 + comp); c.closePath(); c.fill();
    c.save(); c.translate(0, comp);
    // escudo térmico (Marte) bajo el casco
    if (o.heat > 0.02) { const g = c.createRadialGradient(0, -16, 4, 0, -8, 46); g.addColorStop(0, 'rgba(255,250,220,' + 0.95 * o.heat + ')'); g.addColorStop(0.4, 'rgba(255,150,50,' + 0.8 * o.heat + ')'); g.addColorStop(1, 'rgba(255,60,20,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(0, -10, 40, 52, 0, 0, TAU); c.fill(); }
    // casco
    const hg = c.createLinearGradient(-17, 0, 17, 0); hg.addColorStop(0, '#8e95a8'); hg.addColorStop(0.35, '#e6eaf2'); hg.addColorStop(1, '#7f869a');
    c.fillStyle = hg; rr(c, -17, -80, 34, 64, 6); c.fill(); c.strokeStyle = '#4b5166'; c.lineWidth = 1.2; c.stroke();
    // franjas y puertos
    c.fillStyle = '#ff8a3d'; c.fillRect(-17, -30, 34, 5); c.fillStyle = '#38d6ff'; c.fillRect(-17, -62, 34, 3);
    // compuertas de carga (laterales): giran al abrirse
    const hc = o.hatch || 0;
    for (const sg of [-1, 1]) { c.save(); c.translate(sg * 17, -42); c.rotate(sg * hc * 1.45); c.fillStyle = '#5d6478'; c.fillRect(sg > 0 ? 0 : -14, -14, 14, 28); c.strokeStyle = '#2a2f40'; c.strokeRect(sg > 0 ? 0 : -14, -14, 14, 28); c.restore(); if (hc > 0.05) { c.fillStyle = 'rgba(255,214,120,' + 0.55 * hc + ')'; c.fillRect(sg > 0 ? 14 : -22, -20, 8, 8); } }
    // morro y cabina
    c.fillStyle = '#d9deea'; c.beginPath(); c.moveTo(-17, -80); c.quadraticCurveTo(0, -112, 17, -80); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#16314f'; c.beginPath(); c.ellipse(0, -84, 6.5, 4.4, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(120,220,255,.6)'; c.beginPath(); c.ellipse(-1.6, -85, 2.6, 1.4, 0, 0, TAU); c.fill();
    // antena y baliza
    c.strokeStyle = '#aeb5c6'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -102); c.lineTo(0, -116); c.stroke();
    const bl = o.beacon === 'down' ? 0 : o.beacon === 'warn' ? (Math.sin(t * 9) > 0.7 ? 1 : 0.15) : (Math.sin(t * 3) > 0 ? 1 : 0.25);
    c.fillStyle = 'rgba(111,255,160,' + bl + ')'; c.beginPath(); c.arc(0, -117, 2.2, 0, TAU); c.fill();
    if (o.lights) for (let i = 0; i < PARTS_N; i++) { c.fillStyle = LED[(o.parts && o.parts[PARTS_K[i]]) || 'ok']; c.beginPath(); c.arc(-9 + i * 4.5, -70, 1.4, 0, TAU); c.fill(); }
    c.restore(); c.restore();
  }
  const PARTS_K = ['engine', 'legs', 'hatch', 'tanks', 'beacon'], PARTS_N = 5;
  /** Pluma del motor: en la Luna es fina, larga y casi sin humo (no hay aire que la ensanche); en Marte es más ancha, naranja y deja humo. */
  function flame(c, f, scen, t) {
    const L = 30 + f * 80, fl = 0.85 + 0.15 * Math.sin(t * 60);
    if (scen === 'mars') {
      const g = c.createLinearGradient(0, -8, 0, -8 + L * fl); g.addColorStop(0, 'rgba(255,250,210,.95)'); g.addColorStop(0.35, 'rgba(255,160,50,.85)'); g.addColorStop(1, 'rgba(255,70,20,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-8, -8); c.quadraticCurveTo(-14 - f * 6, L * 0.5, 0, L * fl); c.quadraticCurveTo(14 + f * 6, L * 0.5, 8, -8); c.fill();
    } else {
      const g = c.createLinearGradient(0, -8, 0, -8 + L * 1.35 * fl); g.addColorStop(0, 'rgba(255,255,255,.98)'); g.addColorStop(0.3, 'rgba(170,210,255,.8)'); g.addColorStop(1, 'rgba(120,170,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-5, -8); c.lineTo(-2.2, L * 1.35 * fl); c.lineTo(2.2, L * 1.35 * fl); c.lineTo(5, -8); c.fill();
    }
  }

  /* ---------- Nave en el mapa exterior (vista cenital en perspectiva) ---------- */
  function shipWorld(c, x, y, t, S) {
    const L = S && S.land; if (!L) return; const P = L.parts || {};
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(8, 12, 118, 64, 0, 0, TAU); c.fill();
    // paneles solares desplegados a los lados
    for (const sg of [-1, 1]) { c.save(); c.translate(sg * 72, -2); c.fillStyle = '#1c2f5e'; rr(c, -26, -26, 52, 52, 3); c.fill(); c.strokeStyle = '#6a8fd6'; c.lineWidth = 1; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 17, -26); c.lineTo(i * 17, 26); c.stroke(); c.beginPath(); c.moveTo(-26, i * 17); c.lineTo(26, i * 17); c.stroke(); } c.restore(); }
    // patas y pies
    c.strokeStyle = '#8b92a4'; c.lineWidth = 4; for (const a of [0.8, 2.34, 3.94, 5.5]) { c.beginPath(); c.moveTo(Math.cos(a) * 26, Math.sin(a) * 18); c.lineTo(Math.cos(a) * 84, Math.sin(a) * 56); c.stroke(); c.fillStyle = '#c9cfdc'; c.beginPath(); c.ellipse(Math.cos(a) * 88, Math.sin(a) * 58, 12, 7, 0, 0, TAU); c.fill(); }
    // casco
    const g = c.createRadialGradient(-14, -18, 6, 0, 0, 62); g.addColorStop(0, '#f3f5fa'); g.addColorStop(1, '#8a91a6'); c.fillStyle = g; c.beginPath(); c.ellipse(0, -2, 58, 42, 0, 0, TAU); c.fill(); c.strokeStyle = '#4b5166'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#ff8a3d'; c.beginPath(); c.ellipse(0, -2, 44, 31, 0, 0.2, Math.PI - 0.2); c.lineTo(0, -2); c.fill();
    c.fillStyle = '#e8ecf5'; c.beginPath(); c.ellipse(0, -8, 38, 26, 0, 0, TAU); c.fill(); c.strokeStyle = '#8c93a3'; c.stroke();
    c.fillStyle = '#16314f'; c.beginPath(); c.ellipse(0, -10, 14, 9, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(120,220,255,.55)'; c.beginPath(); c.ellipse(-3, -12, 6, 3, 0, 0, TAU); c.fill();
    // compuerta de carga con rampa (sur)
    const open = L.done && (P.hatch !== 'down'); c.fillStyle = open ? '#20263a' : '#5d6478'; rr(c, -16, 14, 32, 18, 3); c.fill(); if (open) { c.fillStyle = '#9097a8'; c.beginPath(); c.moveTo(-14, 30); c.lineTo(14, 30); c.lineTo(20, 48); c.lineTo(-20, 48); c.closePath(); c.fill(); c.strokeStyle = '#4b5166'; c.stroke(); }
    // antena de la baliza
    c.strokeStyle = '#aeb5c6'; c.lineWidth = 2; c.beginPath(); c.moveTo(22, -24); c.lineTo(28, -66); c.stroke(); c.beginPath(); c.ellipse(30, -70, 12, 6, -0.5, 0, TAU); c.stroke();
    const bk = P.beacon === 'down' ? 0 : P.beacon === 'warn' ? (Math.sin(t * 9) > 0.7 ? 1 : 0.15) : (Math.sin(t * 3) > 0 ? 1 : 0.3); c.fillStyle = 'rgba(111,255,160,' + bk + ')'; c.beginPath(); c.arc(28, -74, 3.2, 0, TAU); c.fill();
    if (bk > 0.6 && L.relay) { c.strokeStyle = 'rgba(111,255,160,.35)'; c.lineWidth = 1.5; for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(28, -74, 9 + ((t * 14 + i * 9) % 18), -2.4, -0.7); c.stroke(); } }
    // diodos de estado de las cinco piezas
    for (let i = 0; i < 5; i++) { const st = P[PARTS_K[i]] || 'ok', pul = st === 'warn' ? 0.5 + 0.5 * Math.sin(t * 6) : 1; c.fillStyle = LED[st]; c.globalAlpha = 0.45 + 0.55 * pul; c.beginPath(); c.arc(-24 + i * 12, 22, 3.4, 0, TAU); c.fill(); c.globalAlpha = 1; }
    c.restore();
  }

  /* ---------- Planeta (aproximación) ---------- */
  const CRAT = []; for (let i = 0; i < 46; i++) { const a = hs(i * 3.1) * TAU, d = Math.sqrt(hs(i * 5.7 + 1)) * 0.92; CRAT.push([Math.cos(a) * d, Math.sin(a) * d, 0.035 + hs(i * 9.3) * 0.11]); }
  function planet(c, cx, cy, R, scen, t, mark) {
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
    if (scen === 'mars') {
      const g = c.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R * 1.05); g.addColorStop(0, '#e08a52'); g.addColorStop(0.55, '#b4552f'); g.addColorStop(1, '#4a1d10'); c.fillStyle = g; c.fillRect(cx - R, cy - R, R * 2, R * 2);
      c.fillStyle = 'rgba(70,24,12,.5)'; for (const b of [[-0.2, 0.1, 0.5, 0.2], [0.25, -0.25, 0.35, 0.14], [-0.35, -0.3, 0.25, 0.1]]) { c.beginPath(); c.ellipse(cx + b[0] * R, cy + b[1] * R, b[2] * R, b[3] * R, 0.4, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(60,20,10,.55)'; c.lineWidth = Math.max(1, R * 0.012); c.beginPath(); c.moveTo(cx - R * 0.55, cy + R * 0.1); c.quadraticCurveTo(cx, cy + R * 0.02, cx + R * 0.6, cy + R * 0.2); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(cx, cy - R * 0.97, R * 0.34, R * 0.1, 0, 0, TAU); c.fill();
      if (R > 140) { c.strokeStyle = 'rgba(255,200,160,.14)'; c.lineWidth = R * 0.01; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(cx + Math.sin(t * 0.05 + i) * R * 0.1, cy + (i - 3) * R * 0.28, R * 0.9, R * 0.05, 0, 0, TAU); c.stroke(); } }
    } else {
      const g = c.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R * 1.05); g.addColorStop(0, '#d0d1d8'); g.addColorStop(0.6, '#8b8c94'); g.addColorStop(1, '#3b3c43'); c.fillStyle = g; c.fillRect(cx - R, cy - R, R * 2, R * 2);
      c.fillStyle = 'rgba(40,41,50,.4)'; for (const b of [[-0.25, -0.1, 0.4, 0.28], [0.3, 0.2, 0.3, 0.2], [0.1, -0.45, 0.25, 0.15]]) { c.beginPath(); c.ellipse(cx + b[0] * R, cy + b[1] * R, b[2] * R, b[3] * R, 0.3, 0, TAU); c.fill(); }
      for (const k of CRAT) { const x = cx + k[0] * R, y = cy + k[1] * R, r = k[2] * R; c.fillStyle = 'rgba(30,30,38,.28)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = Math.max(1, r * 0.1); c.beginPath(); c.arc(x - r * 0.08, y - r * 0.08, r, 3.6, 5.6); c.stroke(); }
    }
    // terminador: la luz viene de la izquierda-arriba
    const sh = c.createLinearGradient(cx - R * 0.5, cy - R * 0.5, cx + R, cy + R * 0.6); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.6, 'rgba(0,0,0,.2)'); sh.addColorStop(1, 'rgba(0,0,8,.78)'); c.fillStyle = sh; c.fillRect(cx - R, cy - R, R * 2, R * 2);
    c.restore();
    if (scen === 'mars') { const g = c.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.1); g.addColorStop(0, 'rgba(255,170,110,.5)'); g.addColorStop(1, 'rgba(255,140,80,0)'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 1.1, 0, TAU); c.fill(); }
    if (mark) { const mx = cx + mark[0] * R, my = cy + mark[1] * R, p = (t * 1.6) % 1; c.strokeStyle = 'rgba(111,255,160,.95)'; c.lineWidth = 2.5; c.beginPath(); c.arc(mx, my, 10 + p * 22, 0, TAU); c.globalAlpha = 1 - p; c.stroke(); c.globalAlpha = 1; c.beginPath(); c.arc(mx, my, 8, 0, TAU); c.stroke(); c.fillStyle = '#6fffa0'; c.beginPath(); c.arc(mx, my, 2.6, 0, TAU); c.fill(); }
  }
  function stars(c, w, h, t, n, par) { for (let i = 0; i < n; i++) { const x = ((hs(i) * w + t * par * (0.3 + hs(i + 9))) % w + w) % w, y = hs(i * 1.7 + 3) * h, a = 0.25 + 0.75 * hs(i * 2.3 + 5) * (0.8 + 0.2 * Math.sin(t * 2 + i)); c.fillStyle = 'rgba(255,255,255,' + a + ')'; const z = hs(i * 7) > 0.93 ? 2.4 : 1.3; c.fillRect(x, y, z, z); } }

  /** Aproximación: u 0..1. La nave cruza en vista lateral mientras el planeta crece y aparece la zona elegida. */
  function approach(c, w, h, t, u, scen, mark) {
    c.fillStyle = '#02040c'; c.fillRect(0, 0, w, h); stars(c, w, h, t, 160, 3);
    const e = ease(u), R = lerp(0.17, 1.55, Math.pow(e, 1.15)) * h, top = lerp(0.42, 0.32, e) * h, cx = lerp(0.7, 0.5, e) * w, cy = top + R;
    if (scen !== 'mars') { const ex = w * 0.12, ey = h * 0.16, er = Math.max(6, h * 0.022); const g = c.createRadialGradient(ex, ey, 0, ex, ey, er * 3); g.addColorStop(0, 'rgba(120,180,255,.5)'); g.addColorStop(1, 'rgba(120,180,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(ex, ey, er * 3, 0, TAU); c.fill(); c.fillStyle = '#4a86d8'; c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(ex - er * 0.2, ey - er * 0.3, er * 0.45, 0, TAU); c.fill(); }
    else { c.fillStyle = '#b9a58f'; c.beginPath(); c.arc(w * 0.16, h * 0.18, Math.max(2, h * 0.006), 0, TAU); c.fill(); c.beginPath(); c.arc(w * 0.22, h * 0.1, Math.max(1.5, h * 0.004), 0, TAU); c.fill(); }
    planet(c, cx, cy, R, scen, t, u > 0.62 ? [mark ? mark[0] : 0, mark ? mark[1] : -0.7] : null);
    const sx = lerp(0.14, 0.36, e) * w, sy = lerp(0.3, 0.24, e) * h + Math.sin(t * 0.8) * 4, sc = Math.max(0.6, h / 520);
    shipSide(c, sx, sy + 48 * sc, sc, { t, scen, legs: 0, tilt: 1.35 + Math.sin(t * 0.6) * 0.02, flame: u > 0.55 ? 0.35 + 0.25 * Math.sin(t * 5) : 0, beacon: 'ok' });
  }

  /* ---------- Polvo ---------- */
  function dustNew() { return []; }
  /** Moon: partículas balísticas, rápidas y afiladas, que viajan lejos sin frenarse. Mars: nube con arrastre que se hincha, sube y el viento arrastra. */
  function dustEmit(P, scen, x, y, pw, n) {
    for (let i = 0; i < n; i++) {
      const a = (Math.random() < 0.5 ? -1 : 1), sp = (scen === 'mars' ? 30 + Math.random() * 120 : 80 + Math.random() * 300) * pw;
      P.push(scen === 'mars' ? { x: x + (Math.random() - 0.5) * 60, y, vx: a * sp, vy: -(10 + Math.random() * 70) * pw, s: 6 + Math.random() * 14, g: 0, life: 0, max: 5 + Math.random() * 5, k: 1 }
        : { x: x + (Math.random() - 0.5) * 30, y, vx: a * sp, vy: -(5 + Math.random() * 60) * pw, s: 1.4 + Math.random() * 2.4, g: 62, life: 0, max: 3.5 + Math.random() * 4, k: 0 });
    }
    if (P.length > 700) P.splice(0, P.length - 700);
  }
  function dustStep(P, scen, dt, wind, groundY) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt;
      if (p.life > p.max) { P.splice(i, 1); continue; }
      if (p.k) { const d = Math.exp(-1.15 * dt); p.vx = p.vx * d + wind * (1 - d); p.vy = p.vy * d - 8 * dt; p.s += 14 * dt; } else { p.vy += p.g * dt; if (p.y > groundY) { p.y = groundY; p.vy = -p.vy * 0.25; p.vx *= 0.8; } }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function dustDraw(c, P, scen) {
    for (const p of P) {
      const a = 1 - p.life / p.max;
      if (p.k) { c.fillStyle = 'rgba(214,138,88,' + (0.22 * a) + ')'; c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.fill(); }
      else { c.fillStyle = 'rgba(190,190,200,' + (0.7 * a) + ')'; c.fillRect(p.x, p.y, p.s, p.s); }
    }
  }

  /* ---------- Fondo de la superficie ---------- */
  function sky(c, w, h, groundY, scen, t, alt) {
    if (scen === 'mars') {
      const g = c.createLinearGradient(0, 0, 0, groundY); const dark = cl(alt, 0, 1);
      g.addColorStop(0, dark > 0.5 ? '#2a1410' : '#6d3a28'); g.addColorStop(0.55, '#b86a48'); g.addColorStop(1, '#e7ab82'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const sx = w * 0.78, sy = h * 0.2; const sg = c.createRadialGradient(sx, sy, 2, sx, sy, h * 0.16); sg.addColorStop(0, 'rgba(255,248,230,.95)'); sg.addColorStop(0.18, 'rgba(255,225,190,.55)'); sg.addColorStop(1, 'rgba(255,200,150,0)'); c.fillStyle = sg; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(120,60,40,.35)'; for (let k = 0; k < 3; k++) { const base = groundY - 6 - k * 14; c.beginPath(); c.moveTo(0, groundY); for (let x = 0; x <= w; x += 24) c.lineTo(x, base - (hs(k * 9 + x * 0.013) * 22 + 10 + k * 10) * (k ? 1 : 0.5)); c.lineTo(w, groundY); c.fill(); }
    } else {
      c.fillStyle = '#02040c'; c.fillRect(0, 0, w, h); stars(c, w, h, 0, 220, 0);
      const er = h * 0.028; c.fillStyle = '#4a86d8'; c.beginPath(); c.arc(w * 0.2, h * 0.18, er, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(w * 0.2 - er * 0.2, h * 0.18 - er * 0.3, er * 0.45, 0, TAU); c.fill();
      c.fillStyle = '#17181e'; c.beginPath(); c.moveTo(0, groundY); for (let x = 0; x <= w; x += 30) c.lineTo(x, groundY - 8 - hs(x * 0.021) * 26); c.lineTo(w, groundY); c.fill();
    }
  }
  /** Perfil del terreno: más pendiente y más rocas según la zona. cr = {slope, rocks}. */
  function ground(c, w, h, gY, scen, cr, tx, t, lights) {
    const mars = scen === 'mars', col = mars ? ['#9a5230', '#6e3820', '#c27a47'] : ['#686970', '#44454b', '#8d8e96'];
    const sl = (cr.slope || 0) * 0.018, amp = 4 + (cr.terrain || 0) * 5, yAt = (x) => { const px = x / w, flat = Math.abs(px - tx) < 0.07 ? 0 : 1; return gY + (px - tx) * sl * h * flat + Math.sin(x * 0.017 + 2) * amp * flat + hs(Math.floor(x / 14)) * amp * 0.6 * flat; };
    c.fillStyle = col[0]; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w + 8; x += 8) c.lineTo(x, yAt(x)); c.lineTo(w, h); c.closePath(); c.fill();
    c.fillStyle = col[1]; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w + 8; x += 8) c.lineTo(x, yAt(x) + 26 + hs(x * 0.01) * 14); c.lineTo(w, h); c.fill();
    c.strokeStyle = col[2]; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= w + 8; x += 8) x ? c.lineTo(x, yAt(x)) : c.moveTo(x, yAt(x)); c.stroke();
    // cráteres (Luna) o dunas (Marte)
    if (mars) { c.fillStyle = 'rgba(230,170,110,.25)'; for (let i = 0; i < 5; i++) { const x = hs(i * 4.4) * w; c.beginPath(); c.ellipse(x, yAt(x) + 8, 60 + hs(i) * 50, 8, 0, Math.PI, 0); c.fill(); } }
    else { c.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 0; i < 5; i++) { const x = hs(i * 4.4 + 2) * w; if (Math.abs(x / w - tx) < 0.1) continue; c.beginPath(); c.ellipse(x, yAt(x) + 10, 34 + hs(i) * 46, 7, 0, 0, TAU); c.fill(); } }
    // rocas según la zona
    const nR = 5 + (cr.rocks || 0) * 9;
    for (let i = 0; i < nR; i++) { const x = hs(i * 6.7 + 3) * w; if (Math.abs(x / w - tx) < 0.06) continue; const r = 5 + hs(i * 3.3) * (8 + (cr.rocks || 0) * 5), y = yAt(x); c.fillStyle = col[1]; c.beginPath(); c.moveTo(x - r, y + 2); c.lineTo(x - r * 0.5, y - r * 0.8); c.lineTo(x + r * 0.3, y - r); c.lineTo(x + r, y + 2); c.closePath(); c.fill(); c.fillStyle = col[2]; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.8); c.lineTo(x + r * 0.3, y - r); c.lineTo(x + r * 0.1, y - r * 0.3); c.closePath(); c.fill(); c.globalAlpha = 1; }
    // plataforma de aterrizaje: aro y balizas
    const px = tx * w, py = gY; c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.ellipse(px, py + 3, w * 0.07, 7, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(111,255,160,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py + 3, w * 0.07, 7, 0, 0, TAU); c.stroke();
    for (const sg of [-1, 1]) { const lx = px + sg * w * 0.075; c.fillStyle = Math.sin(t * 5 + sg) > 0 ? '#6fffa0' : '#2d6a46'; c.beginPath(); c.arc(lx, py + 1, 3.4, 0, TAU); c.fill(); }
    return yAt;
  }

  /** Descenso: st = {scen, a (altura 1→0), x (px), flame, heat, chute, comp, shake, cr, tx, parts, t, P(polvo), wind}. Devuelve donde apoya la nave. */
  function descent(c, w, h, st) {
    const t = st.t, a = cl(st.a, 0, 1), gY = h * 0.82 + h * 0.5 * Math.pow(a, 1.0), feet = h * 0.34 + (h * 0.82 - h * 0.34) * Math.pow(1 - a, 1.25);
    c.save(); if (st.shake) c.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
    sky(c, w, h, gY, st.scen, t, a);
    if (st.scen === 'mars' && st.wind) { c.strokeStyle = 'rgba(255,210,170,.18)'; c.lineWidth = 1.5; for (let i = 0; i < 22; i++) { const x = ((hs(i) * w + t * 220 * (0.5 + hs(i + 3))) % (w + 120)) - 60, y = hs(i * 2.2) * gY; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 40 + hs(i) * 30, y); c.stroke(); } }
    const yAt = ground(c, w, h, gY, st.scen, st.cr || {}, st.tx, t);
    const sc = Math.max(0.7, h / 480), footY = feet;
    const o = { t, scen: st.scen, legs: st.legs == null ? 1 : st.legs, flame: st.flame, heat: st.heat, chute: st.chute, comp: st.comp, beacon: st.parts && st.parts.beacon, hatch: 0 };
    shipSide(c, st.x, footY, sc, o);
    dustDraw(c, st.P || [], st.scen);
    c.restore();
    return { gY, footY, yAt, sc };
  }

  /* ---------- Despliegue ---------- */
  const MW = { hab: 4.2, sci: 3.6, tech: 3.4 }, MH = { hab: 2.7, sci: 2.3, tech: 2.2 };
  function module_(c, x, y, u, kind, on, t) {
    const w = MW[kind], hh = MH[kind];
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y, w * u * 0.6, u * 0.3, 0, 0, TAU); c.fill();
    const g = c.createLinearGradient(0, y - hh * u, 0, y); g.addColorStop(0, kind === 'hab' ? '#9fb4e6' : kind === 'sci' ? '#e6ecf5' : '#aab0be'); g.addColorStop(1, kind === 'hab' ? '#5a6fa8' : kind === 'sci' ? '#9aa6bb' : '#656c7d');
    c.fillStyle = g; rr(c, x - w * u / 2, y - hh * u, w * u, hh * u, u * (kind === 'hab' ? 0.9 : 0.35)); c.fill(); c.strokeStyle = '#3d4458'; c.lineWidth = 1.5; c.stroke();
    if (kind === 'sci') { c.fillStyle = '#d6dcea'; c.beginPath(); c.ellipse(x, y - hh * u, w * u * 0.28, u * 0.8, 0, Math.PI, 0); c.fill(); c.stroke(); }
    if (kind === 'tech') { c.strokeStyle = '#4b5166'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const px = x - w * u * 0.3 + i * w * u * 0.3; c.beginPath(); c.moveTo(px, y - hh * u); c.lineTo(px, y - hh * u - u * 0.6); c.stroke(); } }
    const n = kind === 'hab' ? 3 : 2; for (let i = 0; i < n; i++) { const wx = x - w * u / 2 + (i + 0.5) * (w * u / n); c.fillStyle = on ? 'rgba(255,224,150,' + (0.8 + 0.1 * Math.sin(t * 3 + i)) + ')' : '#16213d'; rr(c, wx - u * 0.3, y - hh * u * 0.72, u * 0.6, u * 0.55, 3); c.fill(); }
  }
  function deploy(c, w, h, st) {
    const t = st.t, p = st.prog, mars = st.scen === 'mars', gY = h * 0.74, u = Math.min(w / 34, h / 15), cx = w * 0.5;
    sky(c, w, h, gY, st.scen, t, 0.2); ground(c, w, h, gY, st.scen, { slope: 0, rocks: (st.cr && st.cr.rocks) || 0, terrain: 0 }, 0.5, t);
    if (mars) { c.fillStyle = 'rgba(230,170,120,.12)'; c.fillRect(0, gY - 40, w, 40); }
    c.lineJoin = 'round';
    const ex = (a, b) => ease(sub(p[0], a, b)), onP = p[4] > 0.5;
    // paneles solares: un conjunto de seis que se abre en abanico
    const sP = ease(p[2]), bx = cx + 8.6 * u;
    for (let i = 0; i < 6; i++) { const k = ease(sub(sP, i * 0.08, 0.5 + i * 0.08)), px = bx + i * u * 1.02 * k, bw = lerp(u * 0.22, u * 0.94, k), ph = lerp(u * 1.9, u * 0.95, k); c.save(); c.translate(px, gY + u * 0.1); const g = c.createLinearGradient(0, -ph, 0, 0); g.addColorStop(0, onP ? '#3b64c4' : '#243a78'); g.addColorStop(1, '#14224c'); c.fillStyle = g; c.beginPath(); c.moveTo(-bw / 2, 0); c.lineTo(bw / 2, 0); c.lineTo(bw / 2 - u * 0.08 * k, -ph); c.lineTo(-bw / 2 - u * 0.08 * k, -ph); c.closePath(); c.fill(); c.strokeStyle = '#7fa0e8'; c.lineWidth = 1; c.stroke(); if (k > 0.5) { c.beginPath(); c.moveTo(0, 0); c.lineTo(-u * 0.04, -ph); c.stroke(); } c.restore(); }
    // módulos: salen por las compuertas y se colocan a cada lado de la nave
    const mk = [['hab', -4.6, 0.0], ['sci', -10.2, 0.12], ['tech', 5.0, 0.06]];
    const mkPos = mk.map(([kind, dx, dl]) => { const k = ease(sub(p[1], dl, 0.75 + dl * 0.6)); return [kind, lerp(cx + (dx > 0 ? u * 1.2 : -u * 1.2), cx + dx * u, k), k]; });
    // túneles presurizados
    const tk = ease(p[5]); if (tk > 0) for (const [a, b] of [[0, 1], [0, 2]]) { const A = mkPos[a][1], B = mkPos[b][1], aw = MW[mkPos[a][0]] * u / 2, bw2 = MW[mkPos[b][0]] * u / 2, sg = B > A ? 1 : -1, x0 = A + sg * aw, x1 = B - sg * bw2, xm = lerp(x0, x1, tk); c.fillStyle = '#7a8397'; c.fillRect(Math.min(x0, xm), gY - u * 1.3, Math.abs(xm - x0), u * 0.9); c.strokeStyle = '#3d4458'; c.lineWidth = 1.5; c.strokeRect(Math.min(x0, xm), gY - u * 1.3, Math.abs(xm - x0), u * 0.9); }
    // nave (aterrizada, con compuertas abiertas)
    shipSide(c, cx, gY, u / 21, { t, scen: st.scen, legs: 1, hatch: ex(0, 0.6), lights: true, parts: st.parts, beacon: st.parts && st.parts.beacon });
    for (const [kind, x, k] of mkPos) if (k > 0.02) module_(c, x, gY, u, kind, onP, t);
    // cables de energía con pulso viajero
    if (p[4] > 0) { const k = ease(p[4]); c.lineWidth = 2.5; for (const dx of [-10.2, -4.6, 5.0, 11.4]) { const x1 = cx + dx * u; c.strokeStyle = 'rgba(255,214,90,.4)'; c.beginPath(); c.moveTo(cx, gY + 5); c.lineTo(lerp(cx, x1, k), gY + 5); c.stroke(); const pu = (t * 0.7 + dx * 0.05) % 1; c.fillStyle = '#ffd65a'; c.beginPath(); c.arc(lerp(cx, x1, k * pu), gY + 5, 3, 0, TAU); c.fill(); } }
    // antena: el mástil sube y el plato se orienta
    const ak = ease(p[3]); if (ak > 0.01) { const ax = cx + 16 * u, mh = ak * u * 5.5; c.strokeStyle = '#aeb5c6'; c.lineWidth = 3; c.beginPath(); c.moveTo(ax, gY); c.lineTo(ax, gY - mh); c.stroke(); c.save(); c.translate(ax, gY - mh); c.rotate(-0.7 + ak * 0.3); c.fillStyle = '#e1e5ee'; c.beginPath(); c.ellipse(0, 0, u * 1.0 * ak, u * 0.4 * ak, 0, Math.PI, 0); c.fill(); c.strokeStyle = '#6a7186'; c.stroke(); c.restore(); c.fillStyle = Math.sin(t * 4) > 0 ? '#6fffa0' : '#2d6a46'; c.beginPath(); c.arc(ax, gY - mh - 4, 3, 0, TAU); c.fill(); if (ak > 0.95) { c.strokeStyle = 'rgba(111,255,160,.4)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(ax, gY - mh, 14 + ((t * 20 + i * 12) % 36), -1.4, -0.4); c.stroke(); } } }
    // soporte vital: vapor del módulo habitable y anillo de confirmación
    if (p[6] > 0) { const hx = mkPos[0][1]; for (let i = 0; i < 6; i++) { const ph = (t * 0.6 + i * 0.17) % 1; c.fillStyle = 'rgba(200,240,255,' + 0.35 * (1 - ph) * p[6] + ')'; c.beginPath(); c.arc(hx + (i - 2.5) * u * 0.4, gY - u * 2.8 - ph * u * 1.8, 3 + ph * 8, 0, TAU); c.fill(); } c.strokeStyle = 'rgba(111,255,160,' + 0.5 * (0.5 + 0.5 * Math.sin(t * 3)) * p[6] + ')'; c.lineWidth = 3; rr(c, hx - MW.hab * u / 2 - 4, gY - MH.hab * u - 4, MW.hab * u + 8, MH.hab * u + 8, u); c.stroke(); }
    // el rover rueda desde la nave hasta su plataforma, en primer plano
    const rk = ease(p[7]); { const padX = cx + 2.0 * u, ry = gY + u * 1.15; if (rk > 0.01 || p[7] > 0) { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.setLineDash([6, 5]); c.strokeRect(padX, ry - u * 0.2, u * 3.6, u * 0.6); c.setLineDash([]); } if (rk > 0.01) { const rx = lerp(cx + u * 0.4, padX + u * 1.8, rk); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(rx, ry + 2, u * 0.95, u * 0.16, 0, 0, TAU); c.fill(); c.fillStyle = '#d9a441'; rr(c, rx - u * 0.8, ry - u * 0.8, u * 1.6, u * 0.55, 4); c.fill(); c.fillStyle = '#8a6a2b'; c.fillRect(rx - u * 0.2, ry - u * 1.15, u * 0.4, u * 0.4); c.fillStyle = '#20263a'; for (const dx of [-0.52, 0.52]) { c.beginPath(); c.arc(rx + dx * u, ry - u * 0.2, u * 0.27, 0, TAU); c.fill(); } } }
    // verificación: barrido y marcas
    const vk = p[8]; if (vk > 0) { const sx = lerp(cx - u * 13, cx + u * 13, ease(sub(vk, 0, 0.7))); c.fillStyle = 'rgba(111,255,160,.16)'; c.fillRect(sx - 6, gY - u * 7, 12, u * 7.5); c.strokeStyle = 'rgba(111,255,160,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, gY - u * 7); c.lineTo(sx, gY + u * 0.5); c.stroke();
      c.font = 'bold ' + Math.round(u * 0.9) + 'px system-ui'; c.textAlign = 'center'; for (const m of [mkPos[0][1], mkPos[1][1], mkPos[2][1], cx]) if (sx > m) { c.fillStyle = '#6fffa0'; c.strokeStyle = '#000'; c.lineWidth = 3; c.strokeText('✔', m, gY - u * 4.6); c.fillText('✔', m, gY - u * 4.6); } }
    if (mars) { c.strokeStyle = 'rgba(255,210,170,.16)'; c.lineWidth = 1.5; for (let i = 0; i < 16; i++) { const x = ((hs(i) * w + t * 140 * (0.5 + hs(i + 3))) % (w + 100)) - 50, y = gY - hs(i * 2.2) * u * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 36, y); c.stroke(); } }
    dustDraw(c, st.P || [], st.scen);
  }
  return { shipSide, shipWorld, planet, approach, descent, deploy, dustNew, dustEmit, dustStep, dustDraw, ease, sub, hs };
})();
