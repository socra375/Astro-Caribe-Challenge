/* =====================================================================
   TRIPART — dibujo del viaje: cabina con la tripulación, lanzamiento y
   panel de navegación. Canvas 2D, sin imágenes. Reutiliza Chars (los mismos
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
      c.fillStyle = on ? '#e8f6ff' : '#5a6890'; c.font = '600 ' + Math.round(Math.max(9, h * 0.017)) + 'px system-ui'; c.textAlign = 'center'; c.fillText(st.labels ? st.labels[i] : k, px, cy + h * 0.115);
      for (let j = 0; j < 4; j++) { c.fillStyle = on ? SYSCOL[k] : '#1b274a'; c.fillRect(px - cw * 0.05 + j * cw * 0.026, cy + h * 0.085, cw * 0.016, 3 + (on ? 4 * Math.abs(Math.sin(t * 2 + j + i)) : 0)); }
    });
    // asientos y tripulación (de izquierda a derecha: especialistas a los lados, comandante al centro)
    const order = ['agri', 'engineer', 'commander', 'scientist', 'medic'], sc = Math.min(h / 200, w * 0.18 / 46) / 1.15;
    order.forEach((r, i) => {
      const x = w * (0.14 + i * 0.18), y = h * 0.93, me = st.who === r;
      c.fillStyle = '#26315a'; rr(c, x - 52 * sc * 0.55, y - 74 * sc, 104 * sc * 0.55, 80 * sc, 10); c.fill();
      Chars.draw(c, r, x, y - 4 * sc, { dir: 2, t, pose: st.pose && st.pose[r] || 'idle', scale: sc * 1.15, shadow: false });
      c.fillStyle = '#18204a'; rr(c, x - 44 * sc * 0.6, y - 20 * sc, 88 * sc * 0.6, 26 * sc, 8); c.fill(); c.strokeStyle = '#ff8a3d'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 30 * sc * 0.9, y - 21 * sc); c.lineTo(x + 30 * sc * 0.9, y - 21 * sc); c.stroke();
      if (me) { c.strokeStyle = '#6fffa0'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y - 30 * sc, 36 * sc * 1.15, 44 * sc * 1.15, 0, 0, TAU); c.stroke(); }
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

  /** Brújula de navegación (valores simulados): rumbo de la nave, rumbo objetivo y diferencia. */
  function compass(c, cx, cy, R, t, heading, target, tol, sc) {
    c.save(); c.translate(cx, cy);
    const diff = Math.abs(Trip.angdiff(heading, target)), col = diff <= tol ? '#6fffa0' : diff <= 15 ? '#ffc857' : '#ff6b6b';
    c.fillStyle = 'rgba(8,14,34,.82)'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.strokeStyle = '#3a4570'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#5a6890'; c.lineWidth = 1.5; for (let a = 0; a < 360; a += 10) { const r0 = a % 90 === 0 ? R * 0.86 : R * 0.92, rad = (a - 90) * Math.PI / 180; c.beginPath(); c.moveTo(Math.cos(rad) * r0, Math.sin(rad) * r0); c.lineTo(Math.cos(rad) * R * 0.97, Math.sin(rad) * R * 0.97); c.stroke(); }
    // arco entre rumbo y objetivo
    const a0 = (heading - 90) * Math.PI / 180, a1 = (target - 90) * Math.PI / 180; c.strokeStyle = col; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, R * 0.74, a0, a0 + Trip.angdiff(heading, target) * Math.PI / 180, Trip.angdiff(heading, target) < 0); c.stroke();
    // objetivo (triángulo verde en el borde)
    c.save(); c.rotate((target) * Math.PI / 180); c.fillStyle = '#6fffa0'; c.beginPath(); c.moveTo(0, -R * 0.98); c.lineTo(-R * 0.06, -R * 0.82); c.lineTo(R * 0.06, -R * 0.82); c.closePath(); c.fill(); c.strokeStyle = 'rgba(111,255,160,.35)'; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -R * 0.8); c.stroke(); c.setLineDash([]); c.restore();
    // nave (apunta hacia arriba cuando el rumbo es 0)
    c.save(); c.rotate(heading * Math.PI / 180); c.scale(R / 150, R / 150); c.fillStyle = '#e8ecf5'; c.strokeStyle = '#4b5166'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -46); c.lineTo(14, 20); c.lineTo(0, 12); c.lineTo(-14, 20); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ff8a3d'; c.fillRect(-10, 16, 20, 5); c.fillStyle = '#16314f'; c.beginPath(); c.ellipse(0, -22, 4, 7, 0, 0, TAU); c.fill(); c.restore();
    c.fillStyle = col; c.font = 'bold ' + Math.round(R * 0.16) + 'px system-ui'; c.textAlign = 'center'; c.fillText(Math.round(diff) + '°', 0, R * 0.5);
    c.restore();
    return col;
  }

  /** Espacio del viaje: estrellas, el planeta de destino creciendo y la nave en el fondo. */
  function space(c, w, h, t, u, scen) {
    c.fillStyle = '#02040c'; c.fillRect(0, 0, w, h); stars(c, w, h, t, 180, 1);
    const R = lerp(0.05, 0.16, ease(u)) * h; LandArt.planet(c, w * 0.78, h * 0.2, R, scen, t, null);
    if (scen !== 'mars') { c.fillStyle = '#4a86d8'; c.beginPath(); c.arc(w * 0.1, h * 0.22, h * 0.025 * (1 - u * 0.6), 0, TAU); c.fill(); }
  }
  return { cabin, launch, compass, space, SYSCOL, ease };
})();
