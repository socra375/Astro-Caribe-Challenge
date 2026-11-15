/* =====================================================================
   ROVER — vehículo explorador tripulado: física sencilla (aceleración
   gradual, velocidad máxima, frenado, giro, resistencia del terreno),
   colisiones por círculos, batería, polvo, huellas y dibujo cenital.
   El estado (posición, rumbo, carga) vive en S.ex.rover.
   ===================================================================== */
const Rover = (function () {
  const TS = 32, VMAX = 10.5, VREV = 3.8, ACC = 8.5, BRK = 17, TURN = 2.2;
  let R = null, S0 = null, parts = [], tracks = [], ph = 0, lastTrk = null, bump = 0, flash = 0, hatch = 0;
  const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  function bind(S) { S0 = S; R = Ex.ensure(S).rover; parts = []; tracks = []; lastTrk = null; }
  const state = () => R;
  /** Círculos del chasis (para colisiones). */
  const body = (x, y, a) => [[x + Math.cos(a) * 0.95, y + Math.sin(a) * 0.95, 0.8], [x, y, 0.88], [x - Math.cos(a) * 0.95, y - Math.sin(a) * 0.95, 0.8]];
  /**
   * ctl = { thr, str, stick:{x,y,m}|null }; free(x,y,a) → bool. Devuelve eventos ('bump').
   */
  function update(dt, S, ctl, free) {
    if (!R || !S0) return [];
    const ev = [], g = Field.ground(R.x, R.y), bat = S.sys.rover.batt, hp = S.sys.rover.h;
    const cap = (bat > 0 ? 1 : 0.3) * (hp < 30 ? 0.75 : 1);
    const vmax = Math.max(bat > 0 ? 2.6 : 3.2, VMAX * g.r * cap), vrev = Math.max(2.2, VREV * g.r);
    let thr = ctl.thr || 0, str = ctl.str || 0;
    if (ctl.stick && ctl.stick.m > 0.18) { // control táctil: el rumbo sigue a la palanca
      let d = Math.atan2(ctl.stick.y, ctl.stick.x) - R.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const back = Math.abs(d) > 2.2; if (back) d = d > 0 ? d - Math.PI : d + Math.PI;
      str = Math.max(-1, Math.min(1, d * 2.2)); thr = (back ? -1 : 1) * Math.min(1, ctl.stick.m * 1.15) * (Math.abs(d) > 1.2 ? 0.25 : 1);
    }
    if (thr > 0.05) { if (R.v < vmax) R.v = Math.min(vmax, R.v + ACC * g.r * dt * thr); }
    else if (thr < -0.05) { if (R.v > 0.3) R.v = Math.max(0, R.v - BRK * dt); else R.v = Math.max(-vrev, R.v - ACC * 0.7 * dt); }
    else { const d = (1.6 + (1 - g.r) * 5) * dt; R.v = Math.abs(R.v) <= d ? 0 : R.v - Math.sign(R.v) * d; }
    if (R.v > vmax) R.v = Math.max(vmax, R.v - 12 * dt);
    const mv = Math.abs(R.v);
    // giro: como un coche; casi parado, gira sobre sí mismo despacio
    const rate = mv < 0.45 ? str * 1.05 : str * TURN * Math.min(1, 0.4 + mv / 5) * (R.v >= 0 ? 1 : -1);
    if (Math.abs(rate) > 0.001) { const na = R.a + rate * dt; if (free(R.x, R.y, na)) R.a = na; }
    const dx = Math.cos(R.a) * R.v * dt, dy = Math.sin(R.a) * R.v * dt;
    let moved = false;
    if (free(R.x + dx, R.y + dy, R.a)) { R.x += dx; R.y += dy; moved = true; }
    else if (Math.abs(dx) > 0.002 && free(R.x + dx, R.y, R.a)) { R.x += dx; moved = true; R.v *= 0.85; }
    else if (Math.abs(dy) > 0.002 && free(R.x, R.y + dy, R.a)) { R.y += dy; moved = true; R.v *= 0.85; }
    else if (mv > 0.2) {
      if (mv > 6) { S.sys.rover.h = Math.max(10, S.sys.rover.h - (mv - 6) * 0.9); ev.push('bump'); }
      for (let i = 0; i < 6; i++) parts.push({ x: R.x + Math.cos(R.a) * 1.4, y: R.y + Math.sin(R.a) * 1.4, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, t: 0, life: 0.4, k: 'spark' });
      R.v = -R.v * 0.25; bump = 0.3;
    }
    const step = mv * dt; R.odo += step; if (S.ex) { S.ex.trip.odo += step; }
    ph += R.v * dt * 3.2;
    // batería: gasta según el esfuerzo; sin carga queda una reserva lenta para volver
    const eng = S.playerRole === 'engineer' ? 0.75 : 1;
    S.sys.rover.batt = Math.max(0, S.sys.rover.batt - (0.04 + 0.95 * (mv / VMAX) * (2 - g.r) + (R.lights ? 0.1 : 0)) * eng * dt);
    // polvo/regolito y huellas
    const mars = S.scen === 'mars';
    if (mv > 1.5 && Math.random() < dt * 28 * Math.min(1, mv / 6)) {
      const c = Math.cos(R.a), s = Math.sin(R.a), side = Math.random() < 0.5 ? -1 : 1;
      parts.push({ x: R.x - c * 1.3 - s * side * 0.7, y: R.y - s * 1.3 + c * side * 0.7, vx: -c * mv * 0.18 + (Math.random() - 0.5) * 1.2, vy: -s * mv * 0.18 + (Math.random() - 0.5) * 1.2, t: 0, life: 0.5 + Math.random() * 0.7, k: 'dust', mars, deep: g.k === 'deep' || g.k === 'sand' });
    }
    if (mv > 0.5 && (!lastTrk || Math.hypot(lastTrk[0] - R.x, lastTrk[1] - R.y) > 0.55)) {
      const c = Math.cos(R.a), s = Math.sin(R.a), px = -s * 0.68, py = c * 0.68, bx = R.x - c * 0.95, by = R.y - s * 0.95;
      tracks.push([bx + px, by + py, bx - px, by - py, R.a]); if (tracks.length > 420) tracks.shift(); lastTrk = [R.x, R.y];
    }
    for (const p of parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'spark') p.vy += 8 * dt; }
    parts = parts.filter((p) => p.t < p.life); if (parts.length > 160) parts.splice(0, parts.length - 160);
    if (bump > 0) bump -= dt; return ev;
  }
  /** Sitios junto a las puertas laterales y la trasera. */
  function sides() {
    const c = Math.cos(R.a), s = Math.sin(R.a);
    return { left: [R.x + s * 2.2, R.y - c * 2.2], right: [R.x - s * 2.2, R.y + c * 2.2], rear: [R.x - c * 2.35, R.y - s * 2.35], hatchPt: [R.x - c * 1.9, R.y - s * 1.9] };
  }
  function drawFx(c, t) { // polvo y huellas (debajo del rover)
    c.save(); c.lineWidth = 3; c.lineCap = 'round';
    for (const k of tracks) { c.strokeStyle = S0 && S0.scen === 'mars' ? 'rgba(50,20,10,.3)' : 'rgba(20,20,26,.32)'; c.beginPath(); c.moveTo(k[0] * TS, k[1] * TS); c.lineTo(k[0] * TS + Math.cos(k[4]) * 6, k[1] * TS + Math.sin(k[4]) * 6); c.stroke(); c.beginPath(); c.moveTo(k[2] * TS, k[3] * TS); c.lineTo(k[2] * TS + Math.cos(k[4]) * 6, k[3] * TS + Math.sin(k[4]) * 6); c.stroke(); }
    c.restore();
  }
  function drawParts(c) {
    for (const p of parts) {
      const u = p.t / p.life; c.globalAlpha = (1 - u) * (p.k === 'spark' ? 1 : 0.55);
      if (p.k === 'spark') { c.fillStyle = '#ffe27a'; c.fillRect(p.x * TS, p.y * TS, 3, 3); }
      else { c.fillStyle = p.mars ? '#c98a5c' : '#a9a9b3'; c.beginPath(); c.arc(p.x * TS, p.y * TS, (3 + u * (p.deep ? 12 : 8)), 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
  }
  /** o = { occ, role, boarding(0–1 rampa), night, storeOpen }. */
  function draw(c, S, t, o) {
    o = o || {}; const x = R.x * TS, y = R.y * TS, mv = Math.abs(R.v), rm = o.rm;
    const sus = rm ? 0 : Math.sin(ph * 2.3) * 0.9 * Math.min(1, mv / 5), pal = (Chars.ROLES[o.role || 'commander'] || Chars.ROLES.commander).pal;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.ellipse(7, 9, 50, 30, R.a, 0, 7); c.fill();
    c.rotate(R.a);
    if (R.lights || o.night) { // faros
      for (const sy of [-13, 13]) { const g = c.createLinearGradient(44, 0, 190, 0); g.addColorStop(0, 'rgba(255,244,200,.55)'); g.addColorStop(1, 'rgba(255,244,200,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(44, sy * 0.6); c.lineTo(190, sy * 3.2 - 30); c.lineTo(190, sy * 3.2 + 30); c.closePath(); c.fill(); }
    }
    // suspensión: balancines y ruedas con dibas de rodadura que avanzan
    c.strokeStyle = '#404759'; c.lineWidth = 3;
    for (const i of [-1, 0, 1]) for (const s of [-1, 1]) { const wx = i * 27, wy = s * (24 + sus * s * (i % 2 ? 1 : -1)); c.beginPath(); c.moveTo(i * 24, s * 15); c.lineTo(wx, wy); c.stroke(); }
    for (const i of [-1, 0, 1]) for (const s of [-1, 1]) {
      const wx = i * 27 - 7, wy = s * (24 + sus * s * (i % 2 ? 1 : -1)) - 6;
      c.fillStyle = '#15181f'; rrect(c, wx, wy, 14, 12, 4); c.fill(); c.fillStyle = '#2b303d'; for (let k = 0; k < 4; k++) { const u = ((k * 3.5 + ph * 5) % 14 + 14) % 14; c.fillRect(wx + u, wy + 1, 1.6, 10); }
      c.strokeStyle = '#4a5166'; c.lineWidth = 1; rrect(c, wx, wy, 14, 12, 4); c.stroke();
    }
    // chasis
    const g2 = c.createLinearGradient(0, -22, 0, 22); g2.addColorStop(0, '#f4f6fb'); g2.addColorStop(1, '#aab2c6'); c.fillStyle = g2; rrect(c, -44, -21, 88, 42, 11); c.fill(); c.strokeStyle = '#4a526a'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#1f9dc9'; c.fillRect(-40, -3, 80, 6); c.fillStyle = '#ff8a2a'; c.fillRect(30, -21, 6, 42);
    // techo solar y compartimento de carga (parte trasera)
    c.fillStyle = '#1d2c58'; rrect(c, -40, -17, 38, 34, 5); c.fill(); c.strokeStyle = '#4f7dff'; c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(-40 + k * 9.5, -17); c.lineTo(-40 + k * 9.5, 17); c.stroke(); } c.beginPath(); c.moveTo(-40, 0); c.lineTo(-2, 0); c.stroke();
    c.fillStyle = o.storeOpen ? '#ffc24a' : '#2b3550'; rrect(c, -46, -9, 8, 18, 2); c.fill(); c.strokeStyle = '#ffc24a'; c.lineWidth = 1.2; c.stroke();
    // cabina
    c.fillStyle = 'rgba(120,220,255,.75)'; rrect(c, 2, -15, 28, 30, 9); c.fill(); c.strokeStyle = '#2b3550'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(10, -8, 8, 3, -0.4, 0, 7); c.fill();
    if (o.occ) { c.fillStyle = pal.suit; c.beginPath(); c.arc(14, 0, 9, 0, 7); c.fill(); c.strokeStyle = '#2b3550'; c.lineWidth = 1.4; c.stroke(); c.fillStyle = pal.visor; c.beginPath(); c.ellipse(17, 0, 5, 6.5, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(15, -4, 2, 2); c.fillStyle = pal.shade; rrect(c, 4, -12, 5, 24, 2); c.fill(); }
    // rampa lateral al subir/bajar
    if (o.boarding > 0) { c.fillStyle = '#d6dbe8'; c.strokeStyle = '#4a526a'; c.lineWidth = 1.6; const hl = 12 + 14 * o.boarding; c.fillRect(8, 21, 16, hl * 0.5); c.strokeRect(8, 21, 16, hl * 0.5); c.fillRect(8, -21 - hl * 0.5, 16, hl * 0.5); c.strokeRect(8, -21 - hl * 0.5, 16, hl * 0.5); }
    // antena y faros delanteros
    c.strokeStyle = '#6a7390'; c.lineWidth = 2; c.beginPath(); c.moveTo(-8, -14); c.lineTo(-18, -34); c.stroke(); c.fillStyle = (rm || Math.sin(t * 5) > 0) ? (o.occ ? '#6fffa0' : '#ffc24a') : '#2b3550'; c.beginPath(); c.arc(-18, -35, 3, 0, 7); c.fill();
    c.fillStyle = R.lights || o.night ? '#fff6c8' : '#cfd6e6'; for (const sy of [-13, 13]) { c.beginPath(); c.arc(43, sy, 3.4, 0, 7); c.fill(); }
    // indicador de batería (4 segmentos)
    const lv = S.sys.rover.batt / 100; for (let k = 0; k < 4; k++) { c.fillStyle = lv > (k + 0.4) / 4 ? (lv < 0.25 ? '#ff5a5a' : '#6fffa0') : '#2b3550'; c.fillRect(-28 + k * 6, 11, 4.5, 4); }
    c.restore();
  }
  return { bind, state, update, draw, drawFx, drawParts, sides, body, VMAX, get parts() { return parts; }, get tracks() { return tracks; }, clearFx() { parts = []; tracks = []; lastTrk = null; } };
})();
