/* =====================================================================
   MINIGAMES — 6 minijuegos 2D originales (Canvas). Cada definición:
   setup(g) · update(g,dt) · draw(g,c) · pointer(g,type,x,y) · key(g,k,down)
   controls(g) -> HTMLElement opcional · result(g) -> {ok,score,...}
   ===================================================================== */
const MG = (function () {
  const GW = 640, GH = 400;
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const txt = (c, s, x, y, size, col, al) => { c.font = 'bold ' + (size || 16) + 'px system-ui'; c.fillStyle = col || '#eef3ff'; c.textAlign = al || 'center'; c.fillText(s, x, y); };
  const holdBtn = (label, onDown, onUp, aria) => {
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.setAttribute('aria-label', aria || label); b.style.minWidth = '64px'; b.style.fontSize = '22px';
    const up = (e) => { e.preventDefault(); onUp(); };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); onDown(); });
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onDown(); } });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') onUp(); });
    return b;
  };

  const defs = {
    /* 1 ---------------- Cableado eléctrico ---------------- */
    wiring: {
      icon: '🔌', t: { es: 'Cableado eléctrico', en: 'Electrical wiring' },
      how: { es: 'Toca un conector de la izquierda y luego el de la derecha con el mismo color y símbolo. Un cable equivocado provoca un cortocircuito.', en: 'Tap a left connector, then the right one with the same color and symbol. A wrong wire causes a short circuit.' },
      sci: { es: 'La corriente solo fluye si el circuito forma un camino cerrado y correcto. Conectar mal puede causar cortocircuitos que dañan los equipos.', en: 'Current flows only through a correct closed path. Wrong connections can short-circuit and damage equipment.' },
      dur: (l) => [60, 45, 35][l - 1],
      setup(g) {
        g.n = 3 + g.lvl; g.cols = [['#ff5c5c', '●'], ['#ffc24a', '■'], ['#3ddc84', '▲'], ['#38d6ff', '◆'], ['#c58bff', '★'], ['#ffffff', '✚']].slice(0, g.n);
        g.right = g.cols.map((_, i) => i); for (let i = g.n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g.right[i], g.right[j]] = [g.right[j], g.right[i]]; }
        g.links = []; g.sel = null; g.err = 0; g.flash = 0; g.px = 0; g.py = 0;
      },
      ly(i, g) { return 60 + i * ((GH - 100) / (g.n - 1)); },
      update(g, dt) { g.flash = Math.max(0, g.flash - dt); if (g.links.length === g.n) g.done = true; },
      draw(g, c) {
        c.fillStyle = g.flash > 0 ? '#3a0d12' : '#0a1228'; c.fillRect(0, 0, GW, GH);
        for (let i = 0; i < g.n; i++) {
          const y = defs.wiring.ly(i, g), [col, sym] = g.cols[i];
          c.fillStyle = '#1d2a50'; rr(c, 30, y - 22, 70, 44, 10); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(90, y, 14, 0, 7); c.fill(); txt(c, sym, 52, y + 7, 20, col);
          const ri = g.right[i], [col2, sym2] = g.cols[ri];
          c.fillStyle = '#1d2a50'; rr(c, GW - 100, y - 22, 70, 44, 10); c.fill(); c.fillStyle = col2; c.beginPath(); c.arc(GW - 90, y, 14, 0, 7); c.fill(); txt(c, sym2, GW - 52, y + 7, 20, col2);
          if (g.sel === i) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(90, y, 19, 0, 7); c.stroke(); }
        }
        c.lineWidth = 8; c.lineCap = 'round';
        for (const [a, b] of g.links) { c.strokeStyle = g.cols[a][0]; c.beginPath(); c.moveTo(90, defs.wiring.ly(a, g)); c.bezierCurveTo(300, defs.wiring.ly(a, g), 340, defs.wiring.ly(b, g), GW - 90, defs.wiring.ly(b, g)); c.stroke(); }
        if (g.sel != null) { c.strokeStyle = g.cols[g.sel][0] + 'aa'; c.beginPath(); c.moveTo(90, defs.wiring.ly(g.sel, g)); c.lineTo(g.px, g.py); c.stroke(); }
        txt(c, (LANG === 'es' ? 'Errores: ' : 'Errors: ') + g.err, GW / 2, 30, 16, g.err ? '#ffc24a' : '#b4c0e0');
      },
      pointer(g, type, x, y) {
        g.px = x; g.py = y;
        if (type !== 'down' && type !== 'up') return;
        for (let i = 0; i < g.n; i++) {
          const yy = defs.wiring.ly(i, g);
          if (type === 'down' && Math.abs(x - 70) < 50 && Math.abs(y - yy) < 26 && !g.links.some((l) => l[0] === i)) { g.sel = i; Sfx.play('click'); return; }
          if (g.sel != null && Math.abs(x - (GW - 70)) < 55 && Math.abs(y - yy) < 26) {
            if (g.links.some((l) => l[1] === i)) return;
            if (g.right[i] === g.sel) { g.links.push([g.sel, i]); Sfx.play('pick'); } else { g.err++; g.flash = 0.35; g.t += 3; Sfx.play('bad'); }
            g.sel = null; return;
          }
        }
        if (type === 'up' && g.sel != null && x < GW / 2) return;
      },
      key(g, k, down) {
        if (!down) return;
        const n = parseInt(k, 10);
        if (n >= 1 && n <= g.n) { if (g.sel == null) { if (!g.links.some((l) => l[0] === n - 1)) g.sel = n - 1; } else defs.wiring.pointer(g, 'down', GW - 70, defs.wiring.ly(n - 1, g)); }
      },
      hintKeys: { es: 'Teclado: pulsa 1-6 para elegir a la izquierda y luego 1-6 para la derecha.', en: 'Keyboard: press 1-6 for the left side, then 1-6 for the right.' },
      result(g) { const ok = g.links.length === g.n; return { ok, score: ok ? clampN(1 - g.err * 0.15 - (g.t / g.dur) * 0.3, 0.1, 1) : 0.1 * g.links.length }; }
    },

    /* 2 ---------------- Balance energético ---------------- */
    balance: {
      icon: '⚖️', t: { es: 'Balance energético', en: 'Energy balance' },
      how: { es: 'Reparte los kW disponibles. La suma no puede pasar del presupuesto (línea amarilla). Soporte vital y comunicaciones necesitan su mínimo. A mitad del juego llega una sombra y el presupuesto baja: ¡reajusta!', en: 'Share the available kW. The total cannot exceed the budget (yellow line). Life support and comms need their minimum. Halfway, a shadow arrives and the budget drops: rebalance!' },
      sci: { es: 'La energía disponible es limitada: primero se cubren los sistemas que mantienen viva a la tripulación y luego los demás. Así funcionan también las redes eléctricas ante una emergencia.', en: 'Available energy is limited: first cover the systems that keep the crew alive, then the rest. Power grids do the same in emergencies.' },
      dur: (l) => [45, 40, 35][l - 1],
      setup(g) {
        g.B0 = [10, 9, 8.5][g.lvl - 1]; g.B = g.B0; g.drop = false;
        g.sys = [{ k: 'life', es: 'Soporte vital', en: 'Life support', min: 4.5, ideal: 5.5, v: 3, col: '#38d6ff' }, { k: 'comms', es: 'Comunicaciones', en: 'Comms', min: 0.6, ideal: 0.8, v: 0.4, col: '#c58bff' },
          { k: 'gh', es: 'Invernadero', en: 'Greenhouse', min: 0, ideal: 3.6, v: 3.6, col: '#3ddc84' }, { k: 'lab', es: 'Laboratorio', en: 'Lab', min: 0, ideal: 1.5, v: 1.5, col: '#ffc24a' }];
        g.valid = 0; g.after = 0;
      },
      sum(g) { return g.sys.reduce((a, s) => a + s.v, 0); },
      ok(g) { const s = g.sys; return defs.balance.sum(g) <= g.B + 1e-6 && s[0].v >= s[0].min && s[1].v >= s[1].min; },
      update(g, dt) {
        if (!g.drop && g.t > g.dur * 0.45) { g.drop = true; g.B = g.B0 * 0.72; Sfx.play('warn'); }
        if (g.drop) { g.after += dt; if (defs.balance.ok(g)) g.valid += dt; }
      },
      draw(g, c) {
        c.fillStyle = g.drop ? '#150f22' : '#0a1228'; c.fillRect(0, 0, GW, GH);
        const sum = defs.balance.sum(g), sx = 40, sw = GW - 80, k = sw / 12;
        txt(c, (LANG === 'es' ? 'Presupuesto: ' : 'Budget: ') + g.B.toFixed(1) + ' kW · ' + (LANG === 'es' ? 'Usado: ' : 'Used: ') + sum.toFixed(1) + ' kW', GW / 2, 34, 18, sum > g.B ? '#ff6b6b' : '#eef3ff');
        let x = sx;
        for (const s of g.sys) { c.fillStyle = s.col; c.fillRect(x, 60, s.v * k, 40); x += s.v * k; }
        c.strokeStyle = '#ffc24a'; c.lineWidth = 4; c.beginPath(); c.moveTo(sx + g.B * k, 50); c.lineTo(sx + g.B * k, 110); c.stroke();
        g.sys.forEach((s, i) => {
          const y = 150 + i * 58, w = s.v / 6 * (GW - 260);
          txt(c, (LANG === 'es' ? s.es : s.en), 30, y + 20, 16, s.col, 'left');
          c.fillStyle = '#1d2a50'; c.fillRect(200, y, GW - 260, 30); c.fillStyle = s.col; c.fillRect(200, y, w, 30);
          if (s.min) { const mx = 200 + s.min / 6 * (GW - 260); c.fillStyle = '#fff'; c.fillRect(mx - 1, y - 4, 3, 38); }
          txt(c, s.v.toFixed(1) + ' kW' + (s.v < s.min ? ' ⛔' : ''), GW - 30, y + 21, 15, s.v < s.min ? '#ff6b6b' : '#eef3ff', 'right');
        });
        if (g.drop) txt(c, LANG === 'es' ? '⚠ Sombra sobre los paneles: el presupuesto bajó' : '⚠ Shadow on the panels: budget dropped', GW / 2, GH - 14, 16, '#ffc24a');
      },
      controls(g) {
        const box = document.createElement('div'); box.className = 'grid2';
        g.sys.forEach((s) => {
          const l = document.createElement('label'); l.className = 'col small';
          const sp = document.createElement('span'); sp.textContent = (LANG === 'es' ? s.es : s.en) + ' (kW)';
          const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 6; r.step = 0.1; r.value = s.v;
          r.addEventListener('input', () => { s.v = +r.value; });
          l.append(sp, r); box.append(l);
        });
        return box;
      },
      result(g) {
        const frac = g.after > 0 ? g.valid / g.after : 0, ok = frac >= 0.6 && defs.balance.ok(g);
        const s = g.sys;
        return { ok, score: clampN(frac * 0.8 + (s[2].v / 3.6) * 0.2, 0, 1), gh: s[2].v / 3.6, lab: s[3].v / 1.5, comms: s[1].v / 0.8 };
      }
    },

    /* 3 ---------------- Calibración de oxígeno ---------------- */
    o2: {
      icon: '🫧', t: { es: 'Calibración de oxígeno', en: 'Oxygen calibration' },
      how: { es: 'Mantén la aguja en la franja verde (19,5 % a 23,5 % de O₂) usando la válvula: ＋ abre, － cierra (o flechas ↑ ↓). El sistema se desvía solo.', en: 'Keep the needle in the green band (19.5%–23.5% O₂) using the valve: ＋ opens, － closes (or ↑ ↓ keys). The system drifts by itself.' },
      sci: { es: 'Los sistemas de control comparan una medida con un objetivo y corrigen el error. Poco oxígeno es peligroso para respirar; demasiado aumenta el riesgo de incendio.', en: 'Control systems compare a measurement with a target and correct the error. Too little oxygen is unsafe to breathe; too much raises fire risk.' },
      dur: () => 30,
      setup(g) { g.c = 20.9; g.d = 0; g.u = 0; g.inBand = 0; g.need = [0.5, 0.6, 0.7][g.lvl - 1]; g.hist = []; },
      update(g, dt) {
        g.d += (Math.random() - 0.5) * 1.4 * g.lvl * dt; g.d = clampN(g.d, -0.7 * g.lvl, 0.7 * g.lvl);
        let u = g.u; if (g.keys.ArrowUp || g.keys.w || g.keys.W) u = 1; if (g.keys.ArrowDown || g.keys.s || g.keys.S) u = -1;
        g.c = clampN(g.c + (g.d + u * 1.6) * dt, 15, 27);
        if (g.c >= 19.5 && g.c <= 23.5) g.inBand += dt;
        g.hist.push(g.c); if (g.hist.length > 300) g.hist.shift();
      },
      draw(g, c) {
        c.fillStyle = '#0a1228'; c.fillRect(0, 0, GW, GH);
        const y = (v) => GH - 30 - (v - 15) / 12 * (GH - 60);
        c.fillStyle = 'rgba(95,227,154,.18)'; c.fillRect(60, y(23.5), GW - 200, y(19.5) - y(23.5));
        c.strokeStyle = '#5fe39a'; c.setLineDash([6, 6]); c.strokeRect(60, y(23.5), GW - 200, y(19.5) - y(23.5)); c.setLineDash([]);
        c.strokeStyle = '#38d6ff'; c.lineWidth = 3; c.beginPath();
        g.hist.forEach((v, i) => { const x = 60 + (i / 300) * (GW - 200); i ? c.lineTo(x, y(v)) : c.moveTo(x, y(v)); }); c.stroke();
        const inB = g.c >= 19.5 && g.c <= 23.5;
        c.fillStyle = inB ? '#5fe39a' : '#ff6b6b'; c.beginPath(); c.arc(GW - 140, y(g.c), 9, 0, 7); c.fill();
        txt(c, g.c.toFixed(1) + ' % O₂ ' + (inB ? '✔' : g.c < 19.5 ? (LANG === 'es' ? '⬇ poco' : '⬇ low') : (LANG === 'es' ? '⬆ exceso' : '⬆ high')), GW - 70, y(g.c) + 6, 16, inB ? '#5fe39a' : '#ff6b6b');
        txt(c, '23,5 %', 30, y(23.5) + 5, 12, '#b4c0e0'); txt(c, '19,5 %', 30, y(19.5) + 5, 12, '#b4c0e0');
        const frac = g.t > 0 ? g.inBand / g.t : 0;
        txt(c, (LANG === 'es' ? 'En rango: ' : 'In range: ') + Math.round(frac * 100) + ' % (' + (LANG === 'es' ? 'meta ' : 'goal ') + Math.round(g.need * 100) + ' %)', GW / 2, 26, 16, frac >= g.need ? '#5fe39a' : '#ffc24a');
      },
      controls(g) { const d = document.createElement('div'); d.className = 'row'; d.style.justifyContent = 'center'; d.append(holdBtn('－', () => (g.u = -1), () => (g.u = 0), LANG === 'es' ? 'Cerrar válvula' : 'Close valve'), holdBtn('＋', () => (g.u = 1), () => (g.u = 0), LANG === 'es' ? 'Abrir válvula' : 'Open valve')); return d; },
      result(g) { const f = g.inBand / Math.max(0.01, g.t); return { ok: f >= g.need, score: clampN(f, 0, 1) }; }
    },

    /* 4 ---------------- Orientación de paneles solares ---------------- */
    solar: {
      icon: '☀️', t: { es: 'Orientación de paneles solares', en: 'Solar panel aiming' },
      how: { es: 'El Sol se mueve por el cielo. Gira el panel (← → o arrastra) para que mire de frente al Sol y llena la barra de energía. Al terminar se limpia el polvo.', en: 'The Sun moves across the sky. Turn the panel (← → or drag) to face the Sun and fill the energy bar. Dust is cleaned at the end.' },
      sci: { es: 'Un panel produce más cuando la luz le llega perpendicular. La energía captada depende del coseno del ángulo entre el panel y el Sol. Cerca del polo lunar el Sol está muy bajo.', en: 'A panel produces most when light hits it straight on. Captured energy depends on the cosine of the angle between panel and Sun. Near the lunar pole the Sun is very low.' },
      dur: () => 30,
      setup(g) { g.ps = 120; g.sa = 30; g.acc = 0; g.need = [0.7, 0.78, 0.85][g.lvl - 1]; g.v = 0; g.cloud = 0; },
      update(g, dt) {
        const p = g.t / g.dur;
        g.sa = 25 + p * 130 + Math.sin(g.t * (0.6 + 0.4 * g.lvl)) * 6 * g.lvl;
        let v = g.v; if (g.keys.ArrowLeft || g.keys.a || g.keys.A) v = -1; if (g.keys.ArrowRight || g.keys.d || g.keys.D) v = 1;
        g.ps = clampN(g.ps + v * 70 * dt, 0, 180);
        const a = Math.max(0, Math.cos((g.sa - g.ps) * Math.PI / 180));
        g.align = a; g.acc += a * dt;
      },
      draw(g, c) {
        const sky = c.createLinearGradient(0, 0, 0, GH); sky.addColorStop(0, '#050a1e'); sky.addColorStop(1, '#1a2347'); c.fillStyle = sky; c.fillRect(0, 0, GW, GH);
        const cx = GW / 2, cy = GH - 50, R = 260;
        const sx = cx - Math.cos(g.sa * Math.PI / 180) * R, sy = cy - Math.sin(g.sa * Math.PI / 180) * R * 0.9;
        c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(sx, sy, 22, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,211,107,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(cx, cy - 30); c.stroke();
        c.fillStyle = '#4a4c52'; c.fillRect(0, cy, GW, GH - cy);
        c.save(); c.translate(cx, cy - 30); c.rotate((g.ps - 90) * Math.PI / 180);
        c.fillStyle = '#1e4fa8'; c.fillRect(-70, -6, 140, 12); c.strokeStyle = '#9fc2ff'; for (let i = -60; i <= 60; i += 20) { c.beginPath(); c.moveTo(i, -6); c.lineTo(i, 6); c.stroke(); }
        c.fillStyle = '#ffc24a'; c.fillRect(-2, -26, 4, 20);
        c.restore();
        c.fillStyle = '#888'; c.fillRect(cx - 4, cy - 30, 8, 30);
        const avg = g.t > 0 ? g.acc / g.t : 0;
        txt(c, (LANG === 'es' ? 'Alineación: ' : 'Alignment: ') + Math.round((g.align || 0) * 100) + ' %', 110, 30, 16, (g.align || 0) > 0.9 ? '#5fe39a' : '#eef3ff');
        txt(c, (LANG === 'es' ? 'Media: ' : 'Average: ') + Math.round(avg * 100) + ' % (' + (LANG === 'es' ? 'meta ' : 'goal ') + Math.round(g.need * 100) + ' %)', GW - 150, 30, 16, avg >= g.need ? '#5fe39a' : '#ffc24a');
        c.fillStyle = '#1d2a50'; c.fillRect(20, GH - 24, GW - 40, 12); c.fillStyle = '#ffd36b'; c.fillRect(20, GH - 24, (GW - 40) * clampN(g.acc / g.dur, 0, 1), 12);
      },
      pointer(g, type, x) { if (type === 'down' || type === 'move') { if (g.pdown || type === 'down') { g.pdown = true; g.ps = clampN(180 - (x / GW) * 180, 0, 180); g.ps = 180 - g.ps; } } if (type === 'up') g.pdown = false; },
      controls(g) { const d = document.createElement('div'); d.className = 'row'; d.style.justifyContent = 'center'; d.append(holdBtn('⟲', () => (g.v = -1), () => (g.v = 0), LANG === 'es' ? 'Girar a la izquierda' : 'Turn left'), holdBtn('⟳', () => (g.v = 1), () => (g.v = 0), LANG === 'es' ? 'Girar a la derecha' : 'Turn right')); return d; },
      result(g) { const avg = g.acc / Math.max(0.01, g.t); return { ok: avg >= g.need, score: clampN(avg, 0, 1) }; }
    },

    /* 5 ---------------- Navegación del rover ---------------- */
    rover: {
      icon: '🚙', t: { es: 'Navegación del rover', en: 'Rover navigation' },
      how: { es: 'Conduce con flechas/WASD o mantén el dedo donde quieras ir. Recoge muestras (◆), evita rocas y cráteres y vuelve a la base (círculo azul) antes de agotar la batería. Si recibiste la ruta de la Tierra verás todos los peligros; si no, solo lo que ven tus sensores.', en: 'Drive with arrows/WASD or hold your finger where you want to go. Collect samples (◆), avoid rocks and craters and return to base (blue circle) before the battery runs out. With Earth\'s route you see every hazard; without it, only what your sensors see.' },
      sci: { es: 'Los rovers en Marte se conducen con planes enviados con antelación y navegación autónoma, porque los mensajes tardan minutos. Los sensores detectan obstáculos cercanos.', en: 'Mars rovers drive using plans sent ahead and autonomous navigation, because messages take minutes. Sensors detect nearby obstacles.' },
      dur: () => 60,
      setup(g) {
        g.x = GW / 2; g.y = GH - 40; g.a = -Math.PI / 2; g.batt = 100; g.dmg = 0; g.got = 0; g.target = g.opts.target || 3; g.hint = !!g.opts.hint;
        const rnd = (a, b) => a + Math.random() * (b - a);
        const far = (x, y, d) => Math.hypot(x - GW / 2, y - (GH - 40)) > d;
        g.rocks = []; g.craters = []; g.samples = [];
        let guard = 0;
        while (g.rocks.length < 7 + g.lvl * 4 && guard++ < 500) { const x = rnd(20, GW - 20), y = rnd(20, GH - 90); if (far(x, y, 90)) g.rocks.push({ x, y, r: rnd(10, 20) }); }
        for (let i = 0; i < 3; i++) g.craters.push({ x: rnd(60, GW - 60), y: rnd(60, GH - 140), r: rnd(28, 44) });
        guard = 0;
        while (g.samples.length < g.target + 2 && guard++ < 500) { const x = rnd(30, GW - 30), y = rnd(30, GH - 110); if (far(x, y, 120) && !g.rocks.some((r) => Math.hypot(r.x - x, r.y - y) < r.r + 18)) g.samples.push({ x, y, t: false }); }
        g.regolith = 0; g.lost = 0;
      },
      update(g, dt) {
        let ix = 0, iy = 0;
        if (g.keys.ArrowLeft || g.keys.a || g.keys.A) ix -= 1; if (g.keys.ArrowRight || g.keys.d || g.keys.D) ix += 1;
        if (g.keys.ArrowUp || g.keys.w || g.keys.W) iy -= 1; if (g.keys.ArrowDown || g.keys.s || g.keys.S) iy += 1;
        if (g.pdown) { const dx = g.px - g.x, dy = g.py - g.y, d = Math.hypot(dx, dy); if (d > 10) { ix = dx / d; iy = dy / d; } }
        if (g.opts.blackout && g.t > 15 && g.t < 21) g.lost = 1; else g.lost = 0;
        const len = Math.hypot(ix, iy);
        let sp = 90;
        if (g.craters.some((c) => Math.hypot(c.x - g.x, c.y - g.y) < c.r)) sp *= 0.4;
        if (len > 0) {
          ix /= len; iy /= len; g.a = Math.atan2(iy, ix);
          const nx = g.x + ix * sp * dt, ny = g.y + iy * sp * dt;
          const hit = g.rocks.find((r) => Math.hypot(r.x - nx, r.y - ny) < r.r + 12);
          if (hit) { if (!g.cool) { g.dmg += 8; g.batt -= 3; g.cool = 0.6; Sfx.play('bad'); } }
          else { g.x = clampN(nx, 12, GW - 12); g.y = clampN(ny, 12, GH - 12); }
          g.batt -= 1.1 * dt;
        }
        g.cool = Math.max(0, (g.cool || 0) - dt);
        g.batt -= 0.55 * dt;
        for (const s of g.samples) if (!s.t && Math.hypot(s.x - g.x, s.y - g.y) < 20) { s.t = true; g.got++; g.regolith += 2; Sfx.play('pick'); }
        g.home = Math.hypot(g.x - GW / 2, g.y - (GH - 40)) < 36;
        if (g.batt <= 0) { g.batt = 0; g.done = true; }
        if (g.home && g.got >= g.target && g.t > 1) g.done = true;
      },
      draw(g, c) {
        const sc = (typeof Game !== 'undefined' && Game.scen === 'mars');
        c.fillStyle = sc ? '#7a3a20' : '#55575d'; c.fillRect(0, 0, GW, GH);
        for (const cr of g.craters) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(cr.x, cr.y, cr.r, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 3; c.stroke(); }
        for (const r of g.rocks) { c.fillStyle = '#2b2b2f'; c.beginPath(); c.arc(r.x, r.y, r.r, 0, 7); c.fill(); c.fillStyle = '#6b6b73'; c.beginPath(); c.arc(r.x - 3, r.y - 3, r.r * 0.6, 0, 7); c.fill(); }
        c.strokeStyle = '#38d6ff'; c.lineWidth = 3; c.beginPath(); c.arc(GW / 2, GH - 40, 36, 0, 7); c.stroke(); txt(c, LANG === 'es' ? 'BASE' : 'BASE', GW / 2, GH - 35, 13, '#38d6ff');
        for (const s of g.samples) if (!s.t) { c.fillStyle = '#ffd36b'; c.beginPath(); c.moveTo(s.x, s.y - 9); c.lineTo(s.x + 9, s.y); c.lineTo(s.x, s.y + 9); c.lineTo(s.x - 9, s.y); c.closePath(); c.fill(); }
        // niebla de sensores
        if (!g.hint) {
          const rad = g.lost ? 55 : 115;
          c.save(); c.fillStyle = 'rgba(3,5,12,.95)'; c.beginPath(); c.rect(0, 0, GW, GH); c.arc(g.x, g.y, rad, 0, Math.PI * 2, true); c.fill('evenodd'); c.restore();
          for (const s of g.samples) if (!s.t) { c.strokeStyle = 'rgba(255,211,107,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, 7, 0, 7); c.stroke(); }
        }
        c.save(); c.translate(g.x, g.y); c.rotate(g.a);
        c.fillStyle = '#e8ebf2'; rr(c, -14, -10, 28, 20, 5); c.fill(); c.fillStyle = '#222'; c.fillRect(-12, -13, 8, 4); c.fillRect(4, -13, 8, 4); c.fillRect(-12, 9, 8, 4); c.fillRect(4, 9, 8, 4); c.fillStyle = '#38d6ff'; c.fillRect(6, -5, 8, 10);
        c.restore();
        c.fillStyle = 'rgba(5,8,20,.8)'; rr(c, 8, 8, 300, 30, 8); c.fill();
        txt(c, '🔋 ' + Math.round(g.batt) + ' %  ◆ ' + g.got + '/' + g.target + '  ⚠ ' + g.dmg, 16, 29, 15, g.batt < 25 ? '#ff6b6b' : '#eef3ff', 'left');
        if (g.lost) txt(c, LANG === 'es' ? '📡 Señal perdida: telemetría reducida' : '📡 Signal lost: reduced telemetry', GW / 2, 60, 16, '#ffc24a');
        if (g.got >= g.target) txt(c, LANG === 'es' ? '¡Vuelve a la base!' : 'Return to base!', GW / 2, GH - 86, 18, '#5fe39a');
      },
      pointer(g, type, x, y) { g.px = x; g.py = y; if (type === 'down') g.pdown = true; if (type === 'up') g.pdown = false; },
      result(g) { const ok = g.home && g.got >= g.target && g.batt > 0; return { ok, score: clampN((g.got / g.target) * 0.6 + (g.batt / 100) * 0.4 - g.dmg / 100, 0, 1), samples: g.home ? g.got : Math.floor(g.got / 2), regolith: g.home ? g.regolith : 0, damage: g.dmg, batt: g.batt }; }
    },

    /* 6 ---------------- Gestión del invernadero ---------------- */
    gh: {
      icon: '🌱', t: { es: 'Gestión del invernadero', en: 'Greenhouse care' },
      how: { es: 'Mantén humedad, luz y temperatura dentro de sus franjas verdes con los botones ＋/－ (o teclas Q/A, W/S, E/D). La planta crece si todo está en rango. Cada ＋ de agua gasta agua: ¡ahorra!', en: 'Keep humidity, light and temperature in their green bands with ＋/－ buttons (or keys Q/A, W/S, E/D). The plant grows when everything is in range. Each water ＋ uses water: save it!' },
      sci: { es: 'Las plantas necesitan agua, luz y temperatura adecuadas a la vez. El riego de precisión (por goteo) da a cada planta solo lo que necesita y desperdicia menos agua.', en: 'Plants need the right water, light and temperature at the same time. Precision (drip) irrigation gives each plant only what it needs and wastes less water.' },
      dur: (l) => [40, 40, 35][l - 1],
      setup(g) {
        g.gs = [{ k: 'hum', es: 'Humedad del suelo', en: 'Soil moisture', v: 55, lo: 40, hi: 70, d: 0, col: '#38d6ff', u: '%' }, { k: 'light', es: 'Luz', en: 'Light', v: 65, lo: 50, hi: 80, d: 0, col: '#ffd36b', u: '%' }, { k: 'temp', es: 'Temperatura', en: 'Temperature', v: 21, lo: 18, hi: 24, d: 0, col: '#ff8a65', u: '°C', min: 10, max: 32 }];
        g.hp = 60; g.water = 0; g.need = [60, 70, 75][g.lvl - 1];
      },
      update(g, dt) {
        let inAll = true;
        for (const s of g.gs) {
          s.d += (Math.random() - 0.5) * 6 * g.lvl * dt; s.d = clampN(s.d, -3 * g.lvl, 3 * g.lvl);
          if (s.k === 'hum') s.d -= 0.8 * dt; // el suelo se seca
          const mn = s.min != null ? s.min : 0, mx = s.max != null ? s.max : 100;
          s.v = clampN(s.v + s.d * dt * (s.k === 'temp' ? 0.4 : 1), mn, mx);
          if (s.v < s.lo || s.v > s.hi) inAll = false;
        }
        g.hp = clampN(g.hp + (inAll ? 6 : -4) * dt, 0, 100);
      },
      adj(g, i, sgn) { const s = g.gs[i]; s.v = clampN(s.v + sgn * (s.k === 'temp' ? 0.8 : 5), s.min != null ? s.min : 0, s.max != null ? s.max : 100); s.d *= 0.4; if (s.k === 'hum' && sgn > 0) g.water++; Sfx.play('click'); },
      draw(g, c) {
        c.fillStyle = '#0d2218'; c.fillRect(0, 0, GW, GH);
        g.gs.forEach((s, i) => {
          const x = 40 + i * 150, top = 50, h = 260, mn = s.min != null ? s.min : 0, mx = s.max != null ? s.max : 100, Y = (v) => top + h - (v - mn) / (mx - mn) * h;
          c.fillStyle = '#1d2a50'; c.fillRect(x, top, 40, h); c.fillStyle = 'rgba(95,227,154,.3)'; c.fillRect(x, Y(s.hi), 40, Y(s.lo) - Y(s.hi));
          const inB = s.v >= s.lo && s.v <= s.hi; c.fillStyle = inB ? s.col : '#ff6b6b'; c.fillRect(x - 6, Y(s.v) - 4, 52, 8);
          txt(c, (LANG === 'es' ? s.es : s.en), x + 20, top - 16, 13, s.col); txt(c, s.v.toFixed(s.k === 'temp' ? 1 : 0) + s.u + (inB ? ' ✔' : ' ✖'), x + 20, top + h + 22, 14, inB ? '#5fe39a' : '#ff6b6b');
        });
        const px = 540, py = 330, hh = 20 + g.hp * 1.6;
        c.fillStyle = '#6b4226'; c.fillRect(px - 50, py, 100, 40);
        c.strokeStyle = g.hp > 50 ? '#3ddc84' : '#b59a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py - hh); c.stroke();
        c.fillStyle = g.hp > 50 ? '#3ddc84' : '#b59a3a'; for (let k = 1; k < 5; k++) { if (hh > k * 30) { c.beginPath(); c.ellipse(px + (k % 2 ? 18 : -18), py - k * 30, 18, 8, k % 2 ? -0.4 : 0.4, 0, 7); c.fill(); } }
        txt(c, (LANG === 'es' ? 'Salud: ' : 'Health: ') + Math.round(g.hp) + ' %  · 💧 ' + g.water, px, 30, 15, g.hp >= g.need ? '#5fe39a' : '#ffc24a');
      },
      key(g, k, down) { if (!down) return; const m = { q: [0, 1], a: [0, -1], w: [1, 1], s: [1, -1], e: [2, 1], d: [2, -1] }[k.toLowerCase()]; if (m) defs.gh.adj(g, m[0], m[1]); },
      controls(g) {
        const box = document.createElement('div'); box.className = 'row'; box.style.justifyContent = 'center';
        g.gs.forEach((s, i) => {
          const grp = document.createElement('div'); grp.className = 'row'; grp.setAttribute('role', 'group'); grp.setAttribute('aria-label', LANG === 'es' ? s.es : s.en);
          for (const sg of [-1, 1]) { const b = document.createElement('button'); b.className = 'btn'; b.textContent = (sg > 0 ? '＋' : '－') + ' ' + (s.k === 'hum' ? '💧' : s.k === 'light' ? '💡' : '🌡️'); b.addEventListener('click', () => defs.gh.adj(g, i, sg)); grp.append(b); }
          box.append(grp);
        });
        return box;
      },
      result(g) { const ok = g.hp >= g.need; return { ok, score: clampN(g.hp / 100 - Math.max(0, g.water - 10) * 0.02, 0, 1), water: g.water }; }
    }
  };
  return { defs, GW, GH };
})();
