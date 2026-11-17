/* =====================================================================
   TRIPART — dibujo del viaje: cabina con la tripulación, lanzamiento y
   crucero por el espacio (Sol, planetas cercanos y estrellas). Canvas 2D, sin imágenes. Reutiliza Chars (los mismos
   astronautas del juego) y LandArt (nave, planeta, polvo).
   ===================================================================== */
const TripArt = (function () {
  const TAU = 6.2832, hs = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, u) => a + (b - a) * u, cl = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (u) => { u = cl(u, 0, 1); return u * u * (3 - 2 * u); };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  const SYSCOL = { power: '#ffd65a', life: '#6fffa0', nav: '#38d6ff', comms: '#a98bff', safety: '#ff8a3d' };
  function stars(c, w, h, t, n, a) { for (let i = 0; i < n; i++) { c.fillStyle = 'rgba(255,255,255,' + a * (0.3 + 0.7 * hs(i * 2.3)) + ')'; c.fillRect(((hs(i) * w + t * 6 * (0.3 + hs(i + 9))) % w), hs(i * 1.7 + 3) * h, 1.6, 1.6); } }

  /** Cabina de mando: ventana, consolas con luces por sistema y cinco asientos con la tripulación. */
  function cabin(c, w, h, t, st) {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1530'); g.addColorStop(1, '#1b2548'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // ventana panorámica con la plataforma de lanzamiento
    const wx = w * 0.12, wy = h * 0.09, ww = w * 0.76, wh = h * 0.34;
    c.save(); rr(c, wx, wy, ww, wh, 22); c.clip();
    const sk = c.createLinearGradient(0, wy, 0, wy + wh); sk.addColorStop(0, st.sky0 || '#2a6fb8'); sk.addColorStop(1, st.sky1 || '#bfe3ff'); c.fillStyle = sk; c.fillRect(wx, wy, ww, wh);
    c.fillStyle = '#5b6b4a'; c.fillRect(wx, wy + wh * 0.82, ww, wh * 0.2); c.fillStyle = '#8a8f9c'; c.fillRect(wx + ww * 0.7, wy + wh * 0.2, 10, wh * 0.64); c.fillRect(wx + ww * 0.7 - 22, wy + wh * 0.3, 40, 5); c.fillStyle = '#c9cfdc'; c.fillRect(wx + ww * 0.3, wy + wh * 0.35, 18, wh * 0.5);
    c.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { const cx0 = ((t * 8 + i * 300) % (ww + 200)) - 100; c.beginPath(); c.ellipse(wx + cx0, wy + wh * (0.22 + i * 0.12), 50, 12, 0, 0, TAU); c.fill(); }
    c.restore(); c.strokeStyle = '#4b5578'; c.lineWidth = 8; rr(c, wx, wy, ww, wh, 22); c.stroke();
    // consolas
    const cy = h * 0.47, cw = w * 0.84, cx = w * 0.08;
    c.fillStyle = '#10182f'; rr(c, cx, cy, cw, h * 0.15, 14); c.fill(); c.strokeStyle = '#3a4570'; c.lineWidth = 2; c.stroke();
    ['power', 'life', 'nav', 'comms', 'safety'].forEach((k, i) => {
      const px = cx + cw * (0.1 + i * 0.2), on = st.on && st.on[k], flash = st.flash === k && Math.sin(t * 20) > 0;
      c.fillStyle = '#0a1022'; rr(c, px - cw * 0.07, cy + h * 0.02, cw * 0.14, h * 0.11, 8); c.fill();
      c.fillStyle = on || flash ? SYSCOL[k] : '#26345e'; c.beginPath(); c.arc(px, cy + h * 0.055, h * 0.016, 0, TAU); c.fill();
      if (on) { const gg = c.createRadialGradient(px, cy + h * 0.055, 2, px, cy + h * 0.055, h * 0.05); gg.addColorStop(0, SYSCOL[k] + '88'); gg.addColorStop(1, SYSCOL[k] + '00'); c.fillStyle = gg; c.fillRect(px - h * 0.05, cy, h * 0.1, h * 0.11); }
      c.fillStyle = on ? '#e8f6ff' : '#5a6890'; c.font = '600 ' + Math.round(Math.max(9, h * 0.017)) + 'px system-ui'; c.textAlign = 'center'; c.fillText(w < 520 ? String(i + 1) : st.labels ? st.labels[i] : k, px, cy + h * 0.115);
      for (let j = 0; j < 4; j++) { c.fillStyle = on ? SYSCOL[k] : '#1b274a'; c.fillRect(px - cw * 0.05 + j * cw * 0.026, cy + h * 0.085, cw * 0.016, 3 + (on ? 4 * Math.abs(Math.sin(t * 2 + j + i)) : 0)); }
    });
    // asientos y tripulación (de izquierda a derecha: especialistas a los lados, comandante al centro)
    const order = ['agri', 'engineer', 'commander', 'scientist', 'medic'], sc = Math.min(h / 200, w * 0.18 / 46) / 1.15;
    order.forEach((r, i) => {
      const x = w * (0.14 + i * 0.18), y = h * 0.93, me = st.who === r;
      c.fillStyle = '#26315a'; rr(c, x - 52 * sc * 0.55, y - 74 * sc, 104 * sc * 0.55, 80 * sc, 10); c.fill();
      Chars.draw(c, r, x, y - 4 * sc, { dir: 2, t, pose: st.pose && st.pose[r] || 'idle', scale: sc * 1.15, shadow: false });
      c.fillStyle = '#18204a'; rr(c, x - 44 * sc * 0.6, y - 20 * sc, 88 * sc * 0.6, 26 * sc, 8); c.fill(); c.strokeStyle = '#ff8a3d'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 30 * sc * 0.9, y - 21 * sc); c.lineTo(x + 30 * sc * 0.9, y - 21 * sc); c.stroke();
      if (me) { c.strokeStyle = '#6fffa0'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y - 34 * sc, 27 * sc * 1.15, 40 * sc * 1.15, 0, 0, TAU); c.stroke(); }
    });
  }

  /** Lanzamiento: u 0..1. Plataforma, ignición, ascenso con la cámara siguiendo, cielo que se oscurece y estrellas. */
  function launch(c, w, h, t, u, o) {
    const burn = cl((u - 0.3) / 0.7, 0, 1), rise = Math.pow(burn, 2.2), alt = rise * 1.0;
    const sky = c.createLinearGradient(0, 0, 0, h), dark = cl(alt * 1.4, 0, 1);
    sky.addColorStop(0, 'rgb(' + Math.round(lerp(60, 2, dark)) + ',' + Math.round(lerp(120, 4, dark)) + ',' + Math.round(lerp(190, 14, dark)) + ')'); sky.addColorStop(1, 'rgb(' + Math.round(lerp(190, 8, dark)) + ',' + Math.round(lerp(225, 12, dark)) + ',' + Math.round(lerp(255, 30, dark)) + ')');
    c.save(); if (burn > 0 && burn < 0.8) c.translate((Math.random() - 0.5) * 5 * (1 - burn), (Math.random() - 0.5) * 5 * (1 - burn));
    c.fillStyle = sky; c.fillRect(-10, -10, w + 20, h + 20); if (dark > 0.25) stars(c, w, h, t, 140, (dark - 0.25) / 0.75);
    const camY = rise * h * 2.4, gy = h * 0.82 + camY;
    if (gy < h + 50) { c.fillStyle = '#5b6b4a'; c.fillRect(0, gy, w, h); c.fillStyle = '#3d4a33'; c.fillRect(0, gy, w, 6); c.fillStyle = '#8a8f9c'; c.fillRect(w * 0.64, gy - h * 0.5, 14, h * 0.5); c.fillRect(w * 0.64 - 40, gy - h * 0.42, 56, 7); c.fillStyle = '#d6d9e4'; c.fillRect(w * 0.4 - 60, gy, 120, 8);
      c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) { const x = w * 0.15 + i * w * 0.25 + ((t * 5) % 40); c.beginPath(); c.ellipse(x, gy - h * 0.55, 60, 14, 0, 0, TAU); c.fill(); } }
    const sc = h / 330, shipY = gy - 4 - (burn > 0 ? Math.min(rise * h * 0.5, h * 0.36) : 0);
    LandArt.shipSide(c, w * 0.4, burn > 0 ? Math.min(shipY, h * 0.62) : h * 0.82, sc * 1.4, { t, scen: 'moon', legs: burn < 0.12 ? 1 : 0, flame: burn > 0 ? 0.7 + 0.3 * Math.sin(t * 30) : 0, beacon: 'ok' });
    // humo en la plataforma
    if (burn > 0 && gy < h + 50) { for (let i = 0; i < 14; i++) { const k = (t * 0.8 + i * 0.07) % 1, sx = w * 0.4 + (i % 2 ? 1 : -1) * k * w * 0.2, sy = gy - 6 - k * 20; c.fillStyle = 'rgba(235,235,240,' + (0.45 * (1 - k)) + ')'; c.beginPath(); c.arc(sx, sy, 14 + k * 46, 0, TAU); c.fill(); } }
    c.restore();
    if (u > 0.9) { c.fillStyle = 'rgba(255,255,255,' + (u - 0.9) * 6 + ')'; c.fillRect(0, 0, w, h); }
  }

  /* ---------- Crucero: la nave viaja por el espacio ---------- */
  const es2 = () => (typeof LANG !== 'undefined' ? LANG === 'es' : true);
  /** Planeta genérico con luz del Sol (esquina superior izquierda), bandas y anillo opcionales. */
  function ball(c, x, y, R, o) {
    if (R < 0.6) { c.fillStyle = o.c1; c.beginPath(); c.arc(x, y, Math.max(1, R), 0, TAU); c.fill(); return; }
    if (o.ring) { c.save(); c.translate(x, y); c.rotate(-0.35); c.strokeStyle = 'rgba(225,205,170,.55)'; c.lineWidth = R * 0.16; c.beginPath(); c.ellipse(0, 0, R * 1.75, R * 0.5, 0, Math.PI, TAU); c.stroke(); c.restore(); }
    c.save(); c.beginPath(); c.arc(x, y, R, 0, TAU); c.clip();
    const g = c.createRadialGradient(x - R * 0.4, y - R * 0.4, R * 0.1, x, y, R * 1.05); g.addColorStop(0, o.c0); g.addColorStop(0.55, o.c1); g.addColorStop(1, o.c2); c.fillStyle = g; c.fillRect(x - R, y - R, R * 2, R * 2);
    if (o.bands) for (let i = 0; i < o.bands; i++) { c.fillStyle = 'rgba(' + o.bc + ',' + (0.12 + 0.12 * hs(i + o.seed)) + ')'; c.fillRect(x - R, y - R + (i + 0.4 + hs(i * 3 + o.seed) * 0.4) * (2 * R / o.bands), 2 * R, R * 0.14); }
    if (o.land) { c.fillStyle = o.land; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(x + (hs(i + 4) - 0.5) * R * 1.2, y + (hs(i + 9) - 0.5) * R * 1.1, R * (0.18 + hs(i) * 0.22), R * (0.12 + hs(i + 2) * 0.16), hs(i) * 3, 0, TAU); c.fill(); } }
    if (o.cloud) { c.fillStyle = 'rgba(255,255,255,.28)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x + (hs(i + 20) - 0.5) * R, y + (hs(i + 30) - 0.5) * R * 1.3, R * 0.5, R * 0.07, 0.3, 0, TAU); c.fill(); } }
    const sh = c.createRadialGradient(x - R * 0.55, y - R * 0.55, R * 0.4, x + R * 0.35, y + R * 0.35, R * 1.35); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,.62)'); c.fillStyle = sh; c.fillRect(x - R, y - R, R * 2, R * 2);
    c.restore();
    if (o.atm) { c.strokeStyle = o.atm; c.lineWidth = Math.max(1, R * 0.05); c.beginPath(); c.arc(x, y, R * 1.02, Math.PI * 0.9, Math.PI * 1.75); c.stroke(); }
    if (o.ring) { c.save(); c.translate(x, y); c.rotate(-0.35); c.strokeStyle = 'rgba(225,205,170,.7)'; c.lineWidth = R * 0.16; c.beginPath(); c.ellipse(0, 0, R * 1.75, R * 0.5, 0, 0, Math.PI); c.stroke(); c.restore(); }
  }
  const BODY = {
    earth: { c0: '#8fd0ff', c1: '#2f7bff', c2: '#0b2a6b', land: 'rgba(80,200,120,.85)', cloud: 1, atm: 'rgba(140,200,255,.6)', seed: 1 },
    moon: { c0: '#f2f4fa', c1: '#aeb4c6', c2: '#3a3f55', seed: 2 },
    venus: { c0: '#fff2c9', c1: '#e8c37a', c2: '#6b4a1c', bands: 5, bc: '255,255,255', seed: 3 },
    mercury: { c0: '#d8d2c8', c1: '#8f877b', c2: '#3a352e', seed: 4 },
    jupiter: { c0: '#f4dcc0', c1: '#c8935c', c2: '#5a3820', bands: 9, bc: '120,70,40', seed: 5 },
    marsfar: { c0: '#ffb27a', c1: '#c4562e', c2: '#4a1d10', seed: 6 }
  };
  /** Nombre y etiqueta de un cuerpo (bilingüe). */
  const BN = { sun: ['Sol', 'Sun'], earth: ['Tierra', 'Earth'], moon: ['Luna', 'Moon'], mars: ['Marte', 'Mars'], venus: ['Venus', 'Venus'], mercury: ['Mercurio', 'Mercury'], jupiter: ['Júpiter', 'Jupiter'] };
  const bn = (k) => BN[k][es2() ? 0 : 1];
  /**
   * Animación del crucero (sin controles): estrellas con paralaje, el Sol, planetas cercanos, la Tierra que se aleja y el destino que crece.
   * u = avance del viaje 0–1. Devuelve los cuerpos visibles para etiquetas y pruebas.
   */
  function voyage(c, w, h, t, u, scen) {
    const mars = scen === 'mars', e = ease(u), seen = [];
    const bg = c.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#0a0a24'); bg.addColorStop(0.5, '#02040c'); bg.addColorStop(1, '#0c0722'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
    // nebulosas lejanas
    for (const [nx, ny, nr, col] of [[0.7, 0.3, 0.55, '90,70,200'], [0.25, 0.8, 0.5, '40,90,200']]) { const dx = (nx - u * 0.04) * w, g = c.createRadialGradient(dx, ny * h, 0, dx, ny * h, nr * Math.max(w, h)); g.addColorStop(0, 'rgba(' + col + ',.20)'); g.addColorStop(1, 'rgba(' + col + ',0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    // estrellas con tres capas de paralaje (las cercanas pasan más rápido)
    for (const [n, sp, sz, a] of [[90, 4, 1, 0.55], [60, 10, 1.4, 0.75], [34, 24, 2, 0.95]]) for (let i = 0; i < n; i++) {
      const x = (((hs(i * 1.7 + sp) * w * 1.1 - (t * sp + u * sp * 40)) % w) + w) % w, y = hs(i * 3.1 + sp) * h, tw = 0.65 + 0.35 * Math.sin(t * 2 + i);
      c.fillStyle = 'rgba(225,235,255,' + (a * tw) + ')'; c.fillRect(x, y, sz, sz);
    }
    // el Sol (arriba a la izquierda): corona, rayos y reflejo
    const sx = w * 0.13 - u * w * 0.03, sy = h * 0.2, SR = h * 0.1;
    for (const [rr0, al] of [[9, 0.07], [5.5, 0.12], [3.2, 0.2], [1.9, 0.35]]) { const g = c.createRadialGradient(sx, sy, SR * 0.5, sx, sy, SR * rr0); g.addColorStop(0, 'rgba(255,214,120,' + al + ')'); g.addColorStop(1, 'rgba(255,170,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(sx, sy, SR * rr0, 0, TAU); c.fill(); }
    c.save(); c.translate(sx, sy); c.rotate(t * 0.05); c.strokeStyle = 'rgba(255,224,150,.22)'; c.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, L = SR * (2.2 + 0.9 * hs(i) + 0.15 * Math.sin(t * 2 + i)); c.beginPath(); c.moveTo(Math.cos(a) * SR * 1.1, Math.sin(a) * SR * 1.1); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.stroke(); } c.restore();
    const sg = c.createRadialGradient(sx - SR * 0.2, sy - SR * 0.2, SR * 0.1, sx, sy, SR); sg.addColorStop(0, '#fffbe6'); sg.addColorStop(0.5, '#ffd25e'); sg.addColorStop(1, '#ff9a2e'); c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, SR, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,230,160,.10)'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(w * 0.62, h * 0.62); c.stroke();
    seen.push({ k: 'sun', x: sx, y: sy, R: SR });
    // planetas cercanos (pasan lentamente por el fondo)
    const far = [['mercury', sx + h * 0.2 - u * w * 0.03, sy + h * 0.05, h * 0.014], ['venus', w * 0.47 - u * w * 0.16, h * 0.15, h * 0.034], ['jupiter', w * 0.66 - u * w * 0.08, h * 0.1, h * 0.05]];
    if (!mars) far.push(['marsfar', w * 0.9 - u * w * 0.04, h * 0.3, h * 0.014]);
    for (const [k, x, y, R] of far) { ball(c, x, y, R, Object.assign({ ring: false }, BODY[k])); seen.push({ k: k === 'marsfar' ? 'mars' : k, x, y, R }); }
    // el destino crece
    const dk = mars ? 'mars' : 'moon', dx = lerp(w * 0.9, w * 0.77, e), dy = lerp(h * 0.44, h * 0.5, e), dR = lerp(h * 0.03, h * 0.22, Math.pow(u, 1.6));
    if (mars) LandArt.planet(c, dx, dy, dR, 'mars', t, null); else LandArt.planet(c, dx, dy, dR, 'moon', t, null);
    seen.push({ k: dk, x: dx, y: dy, R: dR, dest: true });
    // la Tierra se aleja (con la Luna cuando el destino es Marte, o junto a ella cuando es la Luna)
    const ex = lerp(w * 0.17, -w * 0.06, e), ey = lerp(h * 0.8, h * 0.88, e), eR = lerp(h * 0.24, h * 0.045, e);
    ball(c, ex, ey, eR, BODY.earth); seen.push({ k: 'earth', x: ex, y: ey, R: eR });
    if (!mars) { /* la Luna es el destino; no hace falta otra */ } else { const ma = t * 0.3, mx = ex + Math.cos(ma) * eR * 2.2, my = ey + Math.sin(ma) * eR * 0.6; ball(c, mx, my, Math.max(1.2, eR * 0.25), BODY.moon); }
    // la nave, de lado, apuntando al destino
    const shx = w * (0.42 + 0.015 * Math.sin(t * 0.7)), shy = h * 0.5 + Math.sin(t * 1.3) * h * 0.012, tilt = Math.atan2(dy - shy, dx - shx) * 0.35, sc = h / 470;
    for (let i = 0; i < 18; i++) { const k = i / 18; c.fillStyle = 'rgba(' + (255 - k * 80) + ',' + (190 - k * 60) + ',' + (110 + k * 100) + ',' + (0.38 * (1 - k)) + ')'; c.beginPath(); c.ellipse(shx - 70 * sc - k * h * 0.3, shy, h * 0.026 * (1 - k * 0.7), h * 0.01 * (1 - k * 0.6), 0, 0, TAU); c.fill(); }
    c.save(); c.translate(shx, shy); c.rotate(Math.PI / 2 + tilt); LandArt.shipSide(c, 0, 76 * sc, sc * 0.95, { t, scen: 'moon', legs: 0, flame: 0.85 + 0.15 * Math.sin(t * 30), beacon: 'ok' }); c.restore();
    // líneas de velocidad
    c.strokeStyle = 'rgba(200,225,255,.25)'; c.lineWidth = 1.2; for (let i = 0; i < 7; i++) { const y = hs(i * 5.3) * h, x = (((hs(i) * w - t * (w * 0.8 + i * 40)) % (w + 200)) + w + 200) % (w + 200) - 100, L = 40 + hs(i + 2) * 90; c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke(); }
    return seen;
  }
  /** Etiquetas de los cuerpos y barra de progreso del viaje (valores orientativos). */
  function voyageHud(c, w, h, u, scen, seen) {
    const mars = scen === 'mars', fs = Math.round(Math.max(11, h * 0.026));
    c.font = fs + 'px system-ui'; c.textAlign = 'center'; c.lineJoin = 'round';
    for (const b of seen) { if (b.k === 'sun' && u > 0.85) continue; const ly = b.y + (b.k === 'sun' ? b.R * 1.6 : b.R * 1.25 + fs * 1.1); if (b.R < 2 && b.k !== 'mars') continue; if (b.x < 20 || b.x > w - 20 || ly > h - fs * 4) continue; c.strokeStyle = 'rgba(0,0,10,.8)'; c.lineWidth = 4; c.fillStyle = b.dest ? '#ffd36b' : '#cfe0ff'; c.strokeText(bn(b.k), b.x, ly); c.fillText(bn(b.k), b.x, ly); }
    const bx = w * 0.14, bw = w * 0.72, by = h - fs * 2.3;
    c.fillStyle = 'rgba(8,12,30,.7)'; c.fillRect(bx - 8, by - fs * 1.7, bw + 16, fs * 3.6); c.strokeStyle = 'rgba(140,160,255,.4)'; c.strokeRect(bx - 8, by - fs * 1.7, bw + 16, fs * 3.6);
    c.fillStyle = 'rgba(80,100,200,.35)'; c.fillRect(bx, by, bw, 6); const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#38d6ff'); g.addColorStop(1, '#a98bff'); c.fillStyle = g; c.fillRect(bx, by, bw * u, 6);
    c.fillStyle = '#8fd0ff'; c.beginPath(); c.arc(bx, by + 3, 6, 0, TAU); c.fill(); c.fillStyle = mars ? '#d9784f' : '#c9ced9'; c.beginPath(); c.arc(bx + bw, by + 3, 6, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(bx + bw * u, by + 3, 5, 0, TAU); c.fill();
    const total = mars ? 225e6 : 384400, left = Math.round(total * (1 - u)), nf = (v) => v.toLocaleString(es2() ? 'es-DO' : 'en-US');
    c.textAlign = 'left'; c.fillStyle = '#cfe0ff'; c.fillText(bn('earth'), bx, by - fs * 0.5); c.textAlign = 'right'; c.fillText(bn(mars ? 'mars' : 'moon'), bx + bw, by - fs * 0.5);
    c.textAlign = 'center'; c.fillStyle = '#ffd36b'; c.fillText((es2() ? 'Faltan ≈ ' : 'Remaining ≈ ') + nf(left) + ' km · ' + Math.round(u * 100) + ' %', w / 2, by + fs * 1.4);
    c.fillStyle = 'rgba(200,215,255,.55)'; c.font = Math.round(fs * 0.8) + 'px system-ui'; c.fillText(es2() ? 'Distancias orientativas y escala no real' : 'Approximate distances, not to scale', w / 2, by - fs * 1.1);
  }
  return { cabin, launch, voyage, voyageHud, SYSCOL, ease };
})();
