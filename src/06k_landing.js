  /* =====================================================================
     LLEGADA Y ATERRIZAJE: aproximación → zona → revisión de la nave →
     descenso → despliegue de la base. El jugador decide (zona, secuencia,
     reparación, nivelado, prioridad) y las decisiones tienen consecuencias
     pequeñas que nunca bloquean la campaña. "Omitir" acelera la animación
     (solo disponible tras verla una vez); las decisiones siguen esperando.
     ===================================================================== */
  const LS = { on: false, sp: 1, ph: null, t: 0, replay: false, S: null, done: null, sel: null };
  let landEl = null, landCv = null, landCx = null, landUi = null, landSkipB = null, landRaf = 0, landLast = 0;
  const lt = (es, en) => (LANG === 'es' ? es : en);
  const lsay = (text) => { if (LS.sp <= 3) narrate(text); };
  const landSkippable = () => !!settings.landSeen || LS.replay;
  function landMount() {
    if (landEl) return;
    landCv = h('canvas', { id: 'landcv', 'aria-label': 'Llegada y aterrizaje' });
    landUi = h('div', { id: 'landui' });
    landSkipB = h('button', { id: 'landSkip', class: 'btn sm', type: 'button', onclick: () => { Sfx.play('click'); LS.sp = 10; Voice.stop(); landSkipB.classList.add('hidden'); } }, '⏩ ' + lt('Omitir (acelerar)', 'Skip (fast-forward)'));
    landEl = h('div', { id: 'landw', class: 'hidden' }, landCv, landUi, landSkipB);
    document.getElementById('app').append(landEl); landCx = landCv.getContext('2d');
    window.addEventListener('resize', landResize);
    document.addEventListener('keydown', (e) => { if (!LS.on || !LS.ph) return; if (e.key === 'Escape' && landSkippable() && LS.ph.skippable) { landSkipB.click(); e.preventDefault(); } else if (LS.ph.key) LS.ph.key(e); });
  }
  function landResize() { if (!landCv) return; landCv.width = Math.floor(innerWidth * dpr); landCv.height = Math.floor(innerHeight * dpr); }
  function landTick(ts) {
    if (!LS.on) return;
    const dt = Math.min(0.05, (ts - (landLast || ts)) / 1000) * LS.sp; landLast = ts; LS.t += dt;
    if (LS.ph) { LS.ph.update && LS.ph.update(dt); const c = landCx, w = landCv.width, hh = landCv.height; c.setTransform(1, 0, 0, 1, 0, 0); LS.ph.draw(c, w, hh, LS.t); }
    landRaf = requestAnimationFrame(landTick);
  }
  /** Cambia de fase: limpia la interfaz y arranca la nueva. */
  function landGo(ph) {
    LS.ph = ph; LS.t = 0; landUi.innerHTML = ''; ph.enter && ph.enter();
    landSkipB.classList.toggle('hidden', !(landSkippable() && ph.skippable));
  }
  const lpanel = (...kids) => { const p = h('div', { class: 'lpanel' }, ...kids); landUi.append(p); return p; };
  const lcard = (cls, ...kids) => { const p = h('div', { class: 'lcard ' + (cls || '') }, ...kids); landUi.append(p); return p; };
  const dots = (n, max) => h('span', { class: 'dots', 'aria-label': n + '/' + max }, Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
  const eff = (S, z) => Land.effects(z, LANG === 'es', MODE === 'adv');

  /** Inicia la secuencia. replay=true: vista previa sin cambiar la partida. */
  function startLanding(S, o) {
    o = o || {}; landMount(); landResize();
    LS.on = true; LS.S = S; LS.replay = !!o.replay; LS.sp = 1; LS.after = o.after || null; LS.sel = null; LS.lev = null; LS.d = null; LS.sum = null;
    if (!LS.replay) { S.land = Land.fresh(S); } else { Land.ensure(S); }
    landEl.classList.remove('hidden'); $('#hud').classList.add('hidden'); $('#zoomc').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#mini').classList.add('hidden');
    landLast = 0; cancelAnimationFrame(landRaf); landRaf = requestAnimationFrame(landTick);
    if (LS.replay) landGo(phArrive()); else startTrip(S);
  }
  function landClose() { LS.on = false; cancelAnimationFrame(landRaf); Voice.stop(); if (landEl) { landEl.classList.add('hidden'); landUi.innerHTML = ''; } LS.ph = null; }
  function landAbort() { landClose(); mainMenu(); }

  /* ---------- 1 · Aproximación ---------- */
  function phArrive() {
    const S = LS.S, sc = S.scen, D = Land.DEST[sc], zs = Land.zoneList(sc);
    const zref = LS.replay && Land.zone(S) ? Land.zone(S) : zs[0], mark = [-0.1 + (zref.x - 60) / 400, -0.74 + (zref.y - 110) / 300];
    const DUR = 17;
    return {
      skippable: true,
      enter() {
        const es = LANG === 'es';
        lcard('', h('b', null, '🛰️ ' + tr(D.n)), h('div', { class: 'small muted' }, tr(D.sub)),
          h('table', null, h('tbody', null, D.facts.map((f) => h('tr', null, h('th', null, tr(f[0])), h('td', null, typeof f[1] === 'string' ? f[1] : tr(f[1])))))),
          h('p', { class: 'small' }, (MODE === 'adv' ? tr(D.brief) : (es ? 'Llegamos. Vas a elegir dónde instalar la colonia, bajar la nave y montar la base.' : 'We have arrived. You will choose where to build the colony, land the ship and set up the base.'))));
        this.btn = btn('🗺️ ' + lt('Elegir zona de aterrizaje', 'Choose landing zone'), () => { LS.replay ? landGo(phDescent()) : landGo(phZone()); }, 'primary lbtn hidden', { autofocus: true });
        landUi.append(this.btn);
        lsay(tr(D.brief)); Sfx.play('info');
      },
      update() { if (LS.t > 5 && this.btn.classList.contains('hidden')) this.btn.classList.remove('hidden'); if (LS.t > DUR && !LS.replay && LS.sp > 3) this.btn.click(); },
      draw(c, w, hh, t) { LandArt.approach(c, w, hh, t, Math.min(1, t / DUR), sc, mark); landTitle(c, w, hh, lt('Aproximación', 'Approach')); const alt = Math.round(Math.max(0, 1 - t / DUR) * 380 + 20); hud(c, w, hh, [[lt('Distancia a la superficie', 'Distance to surface'), alt + ' km'], [lt('Velocidad', 'Speed'), (Math.max(0.3, 1.6 * (1 - t / DUR * 0.7))).toFixed(1) + ' km/s']]); }
    };
  }
  function landTitle(c, w, hh, s) { c.lineJoin = 'round'; c.font = 'bold ' + Math.round(Math.min(hh * 0.034, w * 0.04)) + 'px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.85)'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 4; c.strokeText(s.toUpperCase(), w / 2, hh * 0.07); c.fillText(s.toUpperCase(), w / 2, hh * 0.07); }
  function hud(c, w, hh, rows) {
    const fs = Math.round(hh * 0.024); c.font = '600 ' + fs + 'px ui-monospace,monospace'; c.textAlign = 'left';
    const lw = Math.max(...rows.map((r) => c.measureText(r[0] + ': ').width)), vw = Math.max(...rows.map((r) => c.measureText(String(r[1])).width));
    rows.forEach((r, i) => { const y = hh * 0.13 + i * fs * 1.5; c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(w * 0.03 - 8, y - fs, lw + vw + 20, fs * 1.4); c.fillStyle = '#9fe8ff'; c.fillText(r[0] + ': ', w * 0.03, y); c.fillStyle = '#fff'; c.fillText(String(r[1]), w * 0.03 + lw, y); });
  }

  /* ---------- 2 · Selección de la zona ---------- */
  function phZone() {
    const S = LS.S, sc = S.scen, zs = Land.zoneList(sc), mars = sc === 'mars';
    const P = { x: (x) => x, y: (y) => y };
    let panel0 = null;
    const pick = (id) => { LS.sel = id; Sfx.play('click'); build(); };
    const build = () => {
      const z = LS.sel && Land.zoneOf(sc, LS.sel), es = LANG === 'es';
      panel0.innerHTML = '';
      panel0.append(h('h3', { style: { margin: '0 0 4px' } }, '🗺️ ' + lt('Zonas de aterrizaje', 'Landing zones')),
        h('p', { class: 'small muted' }, MODE === 'adv' ? lt('Compara terreno, pendiente, rocas, exposición, recursos, comunicaciones y espacio libre. Ninguna opción bloquea la campaña: cada una cambia el reparto de riesgos.', 'Compare terrain, slope, rocks, exposure, resources, comms and free space. No option blocks the campaign: each one shifts the trade-offs.') : lt('Toca una zona del mapa. Cada una tiene ventajas y problemas. No hay una “mala” elección.', 'Tap a zone on the map. Each has pros and cons. There is no “wrong” choice.')),
        h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } }, zs.map((q, i) => h('button', { class: 'choice', type: 'button', 'aria-pressed': LS.sel === q.id ? 'true' : 'false', style: { flex: '1 1 160px' }, onclick: () => pick(q.id) }, h('b', null, (i + 1) + ' · ' + tr(q.n)), h('div', { class: 'small muted' }, tr(q.t))))));
      if (z) {
        panel0.append(h('p', null, tr(z.d)),
          h('table', null, h('tbody', null, Land.ATTR.map(([k, nm, ic]) => h('tr', null, h('th', null, ic + ' ' + tr(nm)), h('td', null, dots(z.c[k] + 1, 4)), h('td', { class: 'small' }, tr(Land.ATTR_LBL[k][z.c[k]])))))),
          h('div', { class: 'small', style: { margin: '8px 0' } }, eff(S, z).map((l) => h('div', null, l))),
          btn('✔ ' + lt('Confirmar zona', 'Confirm zone'), () => confirm0(z), 'primary', { autofocus: true }));
      } else panel0.append(h('p', { class: 'tag info' }, lt('Elige una zona para ver sus detalles.', 'Pick a zone to see its details.')));
    };
    const confirm0 = (z) => { Land.pick(S, z.id); S.land.stage = 'check'; Sfx.play('ok'); lsay(lt('Zona confirmada: ' + tr(z.n) + '.', 'Zone confirmed: ' + tr(z.n) + '.')); landGo(phCheck()); };
    const X0 = -14, X1 = 146, Y0 = 84, Y1 = 134;
    const narrow = () => innerWidth < 700, mapR = (w, hh) => (narrow() ? { x: w * 0.06, y: hh * 0.16, w: w * 0.88, h: hh * 0.3 } : { x: w * 0.03, y: hh * 0.14, w: w - Math.min(450 * dpr, w * 0.46) - w * 0.06, h: hh * 0.74 });
    const at = (w, hh, x, y) => { const m = mapR(w, hh); return [m.x + ((x - X0) / (X1 - X0)) * m.w, m.y + ((y - Y0) / (Y1 - Y0)) * m.h]; };
    return {
      key(e) { const n = +e.key; if (n >= 1 && n <= zs.length) pick(zs[n - 1].id); },
      enter() { panel0 = lpanel(); build(); lsay(MODE === 'adv' ? lt('Elige la zona de aterrizaje. Compara pendiente, rocas, exposición, comunicaciones y recursos.', 'Choose the landing zone. Compare slope, rocks, exposure, comms and resources.') : lt('Elige dónde aterrizar. Toca una zona del mapa.', 'Choose where to land. Tap a zone on the map.')); },
      draw(c, w, hh, t) {
        c.fillStyle = mars ? '#7c3e22' : '#4a4b52'; c.fillRect(0, 0, w, hh);
        for (let i = 0; i < 240; i++) { const x = LandArt.hs(i) * w, y = LandArt.hs(i * 2 + 1) * hh; c.fillStyle = 'rgba(' + (mars ? '220,150,100' : '200,200,210') + ',' + (0.04 + 0.08 * LandArt.hs(i * 3)) + ')'; c.beginPath(); c.arc(x, y, 3 + LandArt.hs(i * 5) * 16 * dpr, 0, 7); c.fill(); }
        const b0 = at(w, hh, 0, Y0), b1 = at(w, hh, 136, Y0 - 12), bt = mapR(w, hh).y - hh * 0.05; c.fillStyle = 'rgba(30,40,70,.9)'; c.fillRect(b0[0], bt, b1[0] - b0[0], b0[1] - bt); c.strokeStyle = '#38d6ff'; c.lineWidth = 2; c.strokeRect(b0[0], bt, b1[0] - b0[0], b0[1] - bt);
        c.fillStyle = '#9fe8ff'; c.font = 'bold ' + Math.round(hh * 0.024) + 'px system-ui'; c.textAlign = 'center'; c.fillText('🏗 ' + lt('Zona de la base', 'Base area'), (b0[0] + b1[0]) / 2, bt + (b0[1] - bt) / 2 + 5);
        const ant = at(w, hh, 68, Y0); c.strokeStyle = 'rgba(111,255,160,.4)'; c.setLineDash([6, 6]); for (const z of zs) { const a = at(w, hh, z.x, z.y); c.beginPath(); c.moveTo(ant[0], ant[1]); c.lineTo(a[0], a[1]); c.stroke(); } c.setLineDash([]);
        landTitle(c, w, hh, lt('Mapa de zonas de aterrizaje', 'Landing zone map'));
        zs.forEach((z, i) => {
          const [x, y] = at(w, hh, z.x, z.y), sel = LS.sel === z.id, mr = mapR(w, hh), R = Math.min(hh * 0.085, mr.h * 0.2, mr.w * 0.09), f = Land.fx(z.c), fs = Math.min(hh * 0.026, w * 0.032);
          c.fillStyle = sel ? 'rgba(111,255,160,.22)' : 'rgba(255,255,255,.1)'; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill(); c.strokeStyle = sel ? '#6fffa0' : 'rgba(255,255,255,.55)'; c.lineWidth = sel ? 4 : 2; c.stroke();
          for (let k = 0; k < z.c.rocks * 3 + 2; k++) { const a = LandArt.hs(i * 31 + k) * 6.28, d = R * (0.2 + 0.7 * LandArt.hs(i * 13 + k * 7)); c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 + dpr * LandArt.hs(k + i), 0, 7); c.fill(); }
          if (z.c.slope) { c.strokeStyle = 'rgba(255,214,90,.6)'; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x - R * 0.7, y + k * R * 0.28); c.lineTo(x + R * 0.7, y + k * R * 0.28 - z.c.slope * 4); c.stroke(); } }
          if (z.c.res) { c.fillStyle = '#7fd4ff'; c.font = Math.round(R * 0.5) + 'px system-ui'; c.textAlign = 'center'; c.fillText('💧'.repeat(z.c.res), x, y + R * 0.2); }
          if (z.c.expo >= 2) { c.strokeStyle = 'rgba(255,170,40,.8)'; c.setLineDash([3, 4]); c.beginPath(); c.arc(x, y, R * 1.18, 0, 7); c.stroke(); c.setLineDash([]); }
          c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 4; c.font = 'bold ' + Math.round(fs) + 'px system-ui'; c.textAlign = 'center'; const up = i % 2 === 1, ly = up ? y - R - fs * 0.9 - fs * 1.2 : y + R + fs * 1.3, lb = (i + 1) + ' · ' + tr(z.n); c.strokeText(lb, x, ly); c.fillText(lb, x, ly);
          c.font = Math.round(fs * 0.8) + 'px system-ui'; c.fillStyle = '#cfe9ff'; c.strokeText('📡 ' + Math.round(f.sig * 100) + '%', x, ly + fs * 1.1); c.fillText('📡 ' + Math.round(f.sig * 100) + '%', x, ly + fs * 1.1);
        });
        c.font = Math.round(Math.min(hh * 0.02, w * 0.028)) + 'px system-ui'; c.textAlign = 'left'; c.fillStyle = '#fff'; if (!narrow()) c.fillText('💧 ' + lt('recursos', 'resources') + '   ⚠ ' + lt('línea discontinua naranja: expuesta', 'dashed orange: exposed') + '   ═ ' + lt('rayas amarillas: pendiente', 'yellow lines: slope') + '   ● ' + lt('rocas', 'rocks'), w * 0.03, hh * 0.96);
      },
      click(e) { /* selección por el mapa */ }
    };
  }

  /* ---------- 3 · Revisión de la nave ---------- */
  function phCheck() {
    const S = LS.S, L = S.land, z = Land.zone(S), es = LANG === 'es';
    let scan = 0, p0 = null;
    const render = () => {
      p0.innerHTML = '';
      const warn = Land.warnParts(S);
      p0.append(h('h3', { style: { margin: '0 0 4px' } }, '🔧 ' + lt('Revisión de la nave', 'Ship check')),
        h('p', { class: 'small muted' }, MODE === 'adv' ? lt('Diagnóstico previo al descenso. Una pieza en observación no impide aterrizar, pero deja secuelas medibles. Valores didácticos.', 'Pre-descent diagnostics. A part under watch does not prevent landing but leaves measurable effects. Educational values.') : lt('Revisamos la nave antes de bajar. Si algo está en amarillo, puedes arreglarlo ahora.', 'We check the ship before going down. If something is yellow you can fix it now.')),
        h('table', null, h('tbody', null, Land.PARTS.map((k, i) => { const st = scan > i ? L.parts[k] : null; return h('tr', null, h('th', null, tr(Land.PART_T[k])), h('td', null, st ? tag(st === 'ok' ? '✔ ' + lt('Correcto', 'OK') : '⚠ ' + lt('En observación', 'Under watch'), st === 'ok' ? 'ok' : 'warn') : h('span', { class: 'muted small' }, '…')), h('td', null, st === 'warn' ? btn('🔧 ' + lt('Reajustar', 'Adjust'), () => { Land.repair(S, k); Sfx.play('ok'); lsay(lt('Pieza reajustada: ' + tr(Land.PART_T[k]) + '.', 'Part adjusted: ' + tr(Land.PART_T[k]) + '.')); render(); }, 'sm') : null)); }))),
        ...warn.map((k) => h('p', { class: 'small tag warn' }, '⚠ ' + tr(Land.PART_FAULT[k]))),
        scan >= 5 ? h('div', null, h('p', { class: 'small' }, warn.length ? lt('Puedes continuar con la pieza en observación: el aterrizaje será posible, pero con consecuencias.', 'You may continue with the part under watch: landing is possible, but with consequences.') : lt('Todo en verde. La nave está lista.', 'All green. The ship is ready.')),
          MODE === 'adv' ? h('p', { class: 'small muted' }, lt('Perfil del descenso (didáctico): Δv ≈ ', 'Descent profile (educational): Δv ≈ ') + (S.scen === 'mars' ? '0,6 km/s + paracaídas' : '1,9 km/s') + ' · ' + lt('combustible de reserva ', 'reserve propellant ') + (warn.length ? '8 %' : '12 %')) : null,
          btn('🚀 ' + lt('Confirmar secuencia de descenso', 'Confirm descent sequence'), () => { Sfx.play('ok'); landGo(phDescent()); }, 'primary', { autofocus: true })) : h('p', { class: 'small muted' }, lt('Ejecutando diagnóstico…', 'Running diagnostics…')));
    };
    return {
      skippable: false,
      enter() { p0 = lpanel(); render(); L.parts[L.flag || 'engine'] = 'warn'; lsay(lt('Diagnóstico de la nave en curso.', 'Ship diagnostics running.')); },
      update(dt) { const n = Math.min(5, Math.floor(LS.t * 1.4 / 1)); if (n !== scan) { scan = n; Sfx.play('click'); render(); } },
      draw(c, w, hh, t) { c.fillStyle = '#060a1a'; c.fillRect(0, 0, w, hh); const g = c.createRadialGradient(w * 0.3, hh * 0.5, 10, w * 0.3, hh * 0.5, hh * 0.7); g.addColorStop(0, 'rgba(56,214,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, hh);
        const sc = hh / 190; LandArt.shipSide(c, w * 0.3, hh * 0.85, sc, { t, scen: S.scen, legs: 1, lights: true, parts: scan >= 5 ? L.parts : null, beacon: scan >= 5 ? L.parts.beacon : 'ok' });
        c.strokeStyle = 'rgba(111,255,160,.55)'; c.lineWidth = 2; const sy = hh * (0.85 - ((t * 0.5) % 1) * 0.65); c.beginPath(); c.moveTo(w * 0.3 - 90 * sc / 2, sy); c.lineTo(w * 0.3 + 90 * sc / 2, sy); c.stroke();
        landTitle(c, w, hh, lt('Revisión antes del descenso', 'Pre-descent check')); }
    };
  }

  /* ---------- 4 · Descenso ---------- */
  function phDescent() {
    const S = LS.S, sc = S.scen, mars = sc === 'mars', z = Land.zone(S) || Land.zoneList(sc)[0], f = Land.fx(z.c), L = LS.replay ? JSON.parse(JSON.stringify(S.land)) : S.land;
    const side = LandArt.hs(z.x * 3 + z.y) > 0.5 ? 1 : -1, tx = 0.5;
    const d = { st: 'A', T: 0, a: 1, ign: null, igT: 0, burn: 0, flame: 0, heat: 0, chute: 0, comp: 0, shake: 0, P: LandArt.dustNew(), wind: mars ? 40 : 0, touchT: 0, said: {}, gY: 0, ring: null, thrT: 0, done: false };
    LS.d = d; const A_DUR = mars ? 9 : 7, WIN = 3.2, X0 = () => landCv.width * 0.2 * side, ref = { cr: z.c };
    const say = (k, txt) => { if (!d.said[k]) { d.said[k] = 1; lsay(txt); } };
    const ignite = (q) => { if (d.ign) return; d.ign = q; L.ign = q; d.igT = d.T; d.st = 'B'; Sfx.play(q === 'late' ? 'warn' : 'ok'); if (d.ring) d.ring.remove(); say('ig', q === 'late' ? lt('Encendido tardío: motores activados.', 'Late ignition: engines on.') : lt('Motores de descenso encendidos.', 'Descent engines ignited.')); };
    return {
      skippable: true,
      enter() { lsay(mars ? lt('Entrada atmosférica. El escudo térmico se calienta.', 'Atmospheric entry. The heat shield is heating.') : lt('Iniciamos el descenso. No hay aire: solo los motores nos frenan.', 'Starting descent. There is no air: only the engines slow us.')); Sfx.play('info'); },
      update(dt) {
        d.T += dt; const w = landCv.width, hh = landCv.height;
        if (d.st === 'A') {
          d.a = 1 - 0.48 * LandArt.ease(d.T / A_DUR); if (mars) { d.heat = Math.max(0, 1 - d.T / (A_DUR * 0.55)); d.chute = LandArt.ease(LandArt.sub(d.T, A_DUR * 0.5, A_DUR * 0.8)); if (d.chute > 0.1) say('ch', lt('Paracaídas desplegado.', 'Parachute deployed.')); }
          if (d.T >= A_DUR) { d.st = 'W'; d.wT = 0; ring(); }
        } else if (d.st === 'W') { // ventana de ignición
          d.wT += dt; d.a -= (mars ? 0.01 : 0.032) * dt; if (d.ringEl) d.ringEl.style.setProperty('--p', Math.min(1, d.wT / WIN)); if (d.wT >= WIN || (landSkippable() && LS.sp > 3)) ignite(landSkippable() && LS.sp > 3 ? 'ok' : 'late');
        } else if (d.st === 'B') {
          d.burn += dt; d.chute = Math.max(0, d.chute - dt * 1.4); d.heat = 0; d.flame = Math.min(1, d.burn / 0.7);
          const a0 = d.a0 == null ? (d.a0 = d.a) : d.a0; d.a = 0.06 + (a0 - 0.06) * (1 - LandArt.ease(d.burn / 8.5));
          if (d.burn > 8.5) { d.st = 'C'; d.touchT = 0; Sfx.play('thump'); d.comp = 1; d.shake = 10 + f.shake * 5 + (L.ign === 'late' ? 4 : 0) + (L.parts.legs === 'warn' ? 3 : 0); LandArt.dustEmit(d.P, sc, w * tx, d.gY || hh * 0.82, 2.2, mars ? 90 : 160); say('c', lt('Contacto con la superficie.', 'Touchdown.')); }
        } else if (d.st === 'C') {
          d.touchT += dt; d.a = 0.06 * Math.max(0, 1 - d.touchT / 0.9); d.comp = Math.max(0, d.comp - dt * 1.2); d.shake = Math.max(0, d.shake - dt * 18); d.flame = Math.max(0, d.flame - dt * 1.3);
          if (d.touchT > 1.4 && d.flame <= 0) { d.st = 'D'; d.dT = 0; Sfx.play('ok'); }
        } else if (d.st === 'D') {
          d.dT += dt; if (d.dT > 0.5 && !d.card) { d.card = true; card(); say('d', lt('Aterrizaje completado. Motores apagados. Todos los sistemas confirmados.', 'Landing complete. Engines off. All systems confirmed.')); }
        }
        const wind = d.wind, gY = d.gY || hh * 0.82;
        if (d.flame > 0.3 && d.a < 0.34) LandArt.dustEmit(d.P, sc, w * tx + (landCv.width * 0.2 * side) * Math.pow(Math.max(0, (d.a - 0.06) / 0.46), 1.3), gY, 1 + (0.34 - d.a) * 3, Math.round((mars ? 5 : 9) * (0.34 - d.a) * 10));
        LandArt.dustStep(d.P, sc, dt, wind, gY);
        if (d.flame > 0.05 && (d.thrT += dt) > 0.14) { d.thrT = 0; Sfx.play('thrust'); }
      },
      draw(c, w, hh, t) {
        const lat = d.st === 'B' || d.st === 'W' || d.st === 'A' ? Math.pow(Math.max(0, (d.a - 0.06) / 0.46), 1.3) : 0, x = w * tx + w * 0.2 * side * Math.min(1, lat) + Math.sin(t * 1.3) * 5 * Math.min(1, d.a * 2);
        const r = LandArt.descent(c, w, hh, { scen: sc, a: d.a, x, flame: d.flame, heat: d.heat, chute: d.chute, comp: d.comp, shake: d.shake, cr: z.c, tx, parts: L.parts, t, P: d.P, wind: d.wind, legs: 1 });
        d.gY = r.gY; d.x = x; d.w = w;
        const stage = { A: lt('A · Aproximación', 'A · Approach'), W: lt('B · Descenso', 'B · Descent'), B: lt('B · Descenso', 'B · Descent'), C: lt('C · Contacto', 'C · Touchdown'), D: lt('D · Aterrizaje completado', 'D · Landing complete') }[d.st];
        landTitle(c, w, hh, stage); const altm = Math.round(d.a * 1800), vel = d.st === 'D' || d.st === 'C' ? 0 : d.st === 'B' ? Math.max(0.6, 38 * (d.a / 0.5)) : d.st === 'W' ? 88 : 120 - 60 * (1 - d.a);
        hud(c, w, hh, [[lt('Altura', 'Altitude'), altm + ' m'], [lt('Velocidad', 'Speed'), vel.toFixed(1) + ' m/s'], [lt('Motor', 'Engine'), d.flame > 0.05 ? lt('ENCENDIDO', 'ON') : lt('apagado', 'off')]]);
        if (d.st === 'D' || d.st === 'C') { c.font = 'bold ' + Math.round(hh * 0.03) + 'px system-ui'; c.textAlign = 'center'; const col = ['#6fffa0', L.parts.legs === 'ok' ? '#6fffa0' : '#ffc857', '#6fffa0']; ['✔ ' + lt('Contacto', 'Contact'), (L.parts.legs === 'ok' ? '✔ ' : '⚠ ') + lt('Patas', 'Legs'), '✔ ' + lt('Motor apagado', 'Engine off')].forEach((s, i) => { if (d.st === 'D' || i === 0) { c.fillStyle = col[i]; c.strokeStyle = '#000'; c.lineWidth = 4; c.strokeText(s, w * 0.5, hh * 0.13 + i * hh * 0.045); c.fillText(s, w * 0.5, hh * 0.13 + i * hh * 0.045); } }); }
      }
    };
    function ring() {
      d.ringEl = h('button', { class: 'btn primary ign', type: 'button', style: { '--p': 0 }, onclick: () => ignite(d.wT / WIN > 0.5 ? 'perfect' : 'ok'), 'aria-label': lt('Encender motores de descenso', 'Ignite descent engines') }, '🔥 ' + lt('Encender motores', 'Ignite engines'));
      d.ring = h('div', { class: 'lcen' }, h('p', { class: 'small' }, MODE === 'adv' ? lt('Pulsa cuando el anillo pase de la mitad: enciende a tiempo para frenar. Si no pulsas, se encenderá solo, pero tarde.', 'Press once the ring passes halfway: ignite in time to brake. If you do not, it fires automatically but late.') : lt('Pulsa el botón para encender los motores y frenar la nave.', 'Press the button to fire the engines and brake the ship.')), d.ringEl);
      landUi.append(d.ring); say('rg', lt('Atención: encienda los motores de descenso.', 'Attention: ignite the descent engines.')); Sfx.play('warn'); if (d.ringEl) d.ringEl.focus();
    }
    function card() {
      const when = L.ign === 'perfect' ? lt('encendido a tiempo', 'on-time ignition') : L.ign === 'ok' ? lt('encendido correcto', 'good ignition') : lt('encendido tardío', 'late ignition');
      lcard('lcen', h('b', null, '📋 ' + lt('Registro de llegada', 'Arrival log')), h('table', null, h('tbody', null,
        [[lt('Destino', 'Destination'), tr(Land.DEST[sc].n)], [lt('Zona', 'Zone'), tr(z.n)], [lt('Descenso', 'Descent'), when], [lt('Patas', 'Legs'), L.parts.legs === 'ok' ? lt('en buen estado', 'sound') : lt('en observación', 'under watch')], [lt('Posición', 'Position'), Field.coord(z.x, z.y, LANG === 'es')]].map((r) => h('tr', null, h('th', null, r[0]), h('td', null, r[1]))))),
        btn('🏗 ' + lt('Desplegar la base', 'Deploy the base'), () => landGo(phDeploy()), 'primary', { autofocus: true }));
    }
  }

  /* ---------- 5 · Despliegue ---------- */
  function phDeploy() {
    const S = LS.S, sc = S.scen, L = S.land, z = Land.zone(S) || Land.zoneList(sc)[0], f = Land.fx(z.c), steps = Land.STEPS;
    const dd = { prog: steps.map(() => 0), k: -1, wait: null, ready: false, P: LandArt.dustNew(), side: null, said: {} };
    LS.dd = dd; const DUR = 3.4;
    let p0 = null, decided = LS.replay;
    const list = () => {
      if (!p0) return; p0.innerHTML = '';
      p0.append(h('b', null, '🏗 ' + lt('Despliegue de la base', 'Base deployment')), h('ol', { class: 'dsteps' }, steps.map((k, i) => h('li', { class: dd.prog[i] >= 1 ? 'done' : dd.k === i ? 'act' : '' }, h('span', null, (dd.prog[i] >= 1 ? '✔ ' : dd.k === i ? '⏳ ' : '○ ') + tr(Land.STEP_T[k])), dd.k === i && MODE !== 'adv' ? h('div', { class: 'small muted' }, tr(Land.STEP_D[k])) : null, dd.k === i && MODE === 'adv' ? h('div', { class: 'small muted' }, tr(Land.STEP_D[k]) + ' (' + Math.round(dd.prog[i] * 100) + ' %)') : null))));
    };
    const ask = (key, title, body, opts) => { // decisión: la animación espera
      dd.wait = key; const el = h('div', { class: 'lcen' }, h('b', null, title), h('p', { class: 'small' }, body), h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } }, opts.map((o, i) => btn((i + 1) + ' · ' + o[0], () => { el.remove(); dd.wait = null; o[1](); Sfx.play('ok'); }, o[2] || '', { autofocus: i === 0 }))));
      landUi.append(el); Sfx.play('warn'); dd.keyOpts = opts;
    };
    const next = () => {
      dd.k++; if (dd.k >= steps.length) { finish(); return; }
      const k = steps[dd.k]; list(); Sfx.play(k === 'power' || k === 'verify' ? 'ok' : 'deployclk'); if (LS.sp <= 3) narrate(tr(Land.STEP_T[k]) + '.');
      if (k === 'unload') LandArt.dustEmit(dd.P, sc, landCv.width * 0.5, landCv.height * 0.78, 0.6, 24);
      if (k === 'power' && !decided && !L.prio) askPrio();
    };
    const askPrio = () => ask('prio', '⚡ ' + lt('¿Qué activas primero?', 'What do you switch on first?'),
      MODE === 'adv' ? lt('Todo se activará, pero el primero recibe una ventaja inicial pequeña (≈ +6 % de reserva, o más alcance de radio).', 'Everything will be activated, but the first gets a small head start (≈ +6 % reserve, or extra radio range).') : lt('Todo se encenderá, pero lo que elijas primero tendrá un poquito de ventaja.', 'Everything will be switched on, but what you choose first gets a small head start.'),
      [['⚡ ' + lt('Energía', 'Power'), () => { L.prio = 'power'; }], ['🫁 ' + lt('Soporte vital', 'Life support'), () => { L.prio = 'life'; }], ['📡 ' + lt('Comunicaciones', 'Comms'), () => { L.prio = 'comms'; }]]);
    const finish = () => {
      dd.ready = true; list();
      lcard('lcen', h('b', null, '✅ ' + lt('Base verificada', 'Base verified')), h('p', { class: 'small' }, lt('Presión, energía, aire y comunicaciones en orden. La nave queda en la plataforma como baliza y relé de radio.', 'Pressure, power, air and comms are in order. The ship stays on the pad as a beacon and radio relay.')),
        btn(LS.replay ? '↩ ' + lt('Volver', 'Back') : '🚀 ' + lt('Comenzar la misión', 'Start the mission'), () => landFinish(), 'primary', { autofocus: true })); lsay(lt('Verificación completa. La colonia está operativa.', 'Verification complete. The colony is operational.')); Sfx.play('ok');
    };
    return {
      skippable: true,
      key(e) { if (dd.wait && dd.keyOpts) { const n = +e.key; if (n >= 1 && n <= dd.keyOpts.length) { const el = landUi.querySelector('.lcen .btn:nth-child(' + n + ')'); el && el.click(); } } },
      enter() {
        p0 = h('div', { class: 'lcard dep' }); landUi.append(p0); list();
        if (!decided && f.rough >= 3) ask('lev', '🧱 ' + lt('Terreno difícil', 'Rough terrain'), MODE === 'adv' ? lt('Nivelar la plataforma cuesta ' + Land.LEVEL_MAT + ' de materiales y evita daño en las patas. Sin nivelar, las patas quedan en observación (reparación posterior: ' + Land.REPAIR_MAT + ' de materiales).', 'Levelling the pad costs ' + Land.LEVEL_MAT + ' materials and avoids leg damage. Without it the legs stay under watch (later repair: ' + Land.REPAIR_MAT + ' materials).') : lt('El suelo es irregular. Puedes nivelarlo (gasta materiales) o seguir sin nivelar (las patas quedarán en observación).', 'The ground is uneven. You can level it (costs materials) or continue unlevelled (legs will stay under watch).'),
          [['🔧 ' + lt('Nivelar (−' + Land.LEVEL_MAT + ' materiales)', 'Level (−' + Land.LEVEL_MAT + ' materials)'), () => { LS.lev = true; dd.k = -1; next(); }, 'primary'], ['⏭ ' + lt('Seguir sin nivelar', 'Continue unlevelled'), () => { LS.lev = false; dd.k = -1; next(); }]]);
        else next();
      },
      update(dt) {
        if (dd.wait || dd.ready || dd.k < 0 || dd.k >= steps.length) { LandArt.dustStep(dd.P, sc, dt, sc === 'mars' ? 30 : 0, landCv.height * 0.78); return; }
        const slow = steps[dd.k] === 'bays' && L.flag === 'hatch' && L.parts.hatch !== 'ok' ? 1.8 : 1;
        dd.prog[dd.k] = Math.min(1, dd.prog[dd.k] + dt / (DUR * slow)); if (slow > 1 && dd.prog[dd.k] > 0.4 && !dd.said.h) { dd.said.h = 1; lsay(lt('Una compuerta responde lenta: el despliegue se retrasa.', 'A hatch is slow: deployment is delayed.')); }
        if (steps[dd.k] === 'rover' && Math.random() < 0.2) LandArt.dustEmit(dd.P, sc, landCv.width * (0.5 + 0.12 * dd.prog[dd.k]), landCv.height * 0.8, 0.3, 2);
        LandArt.dustStep(dd.P, sc, dt, sc === 'mars' ? 30 : 0, landCv.height * 0.78);
        if (dd.prog[dd.k] >= 1) { list(); next(); }
      },
      draw(c, w, hh, t) { LandArt.deploy(c, w, hh, { scen: sc, t, prog: dd.prog, parts: L.parts, cr: z.c, P: dd.P }); landTitle(c, w, hh, lt('Despliegue de la base', 'Base deployment')); }
    };
  }
  /** Fin del despliegue: aplica las consecuencias y empieza la campaña (o vuelve de la repetición). */
  function landFinish() {
    const S = LS.S; Voice.stop();
    if (LS.replay) { landClose(); (LS.after || mainMenu)(); return; }
    World.init(S.scen, Land.pad(S));
    LS.sum = Land.complete(S, { lev: LS.lev });
    Sim.log(S, 'ok', 'land.arr', { zone: S.land.zone, mat: LS.sum.mat, rev: LS.sum.reveal.length });
    settings.landSeen = true; Store.set('settings', settings);
    landClose(); finishNewRun(S.scen, true);
  }
  /** Repite la secuencia (vista previa, sin cambiar la partida) desde el menú de archivos de misión. */
  function replayArrival() {
    const sc = S ? S.scen : settings.scen || 'moon', Sx = S && S.land && S.land.done ? S : (() => { const q = Sim.create({ scen: sc, diff: 'engineer', mode: settings.mode || 'junior', seed: 7 }); Land.ensure(q); return q; })();
    const back = running ? () => { $('#hud').classList.remove('hidden'); $('#zoomc').classList.remove('hidden'); if (isTouch) $('#touch').classList.remove('hidden'); pauseMenu(); } : mainMenu;
    popAll(); const prevRun = running, prevS = S; startLanding(Sx, { replay: true, after: back });
  }
  /** Panel de la nave en el mapa exterior: piezas, estado y reparación. */
  function shipPanel() {
    const L = Land.ensure(S), z = Land.zone(S), es = LANG === 'es', adv = MODE === 'adv';
    const s = push(panel('🚀 ' + lt('Nave de llegada', 'Arrival ship'), h('div')), { sticky: false });
    const build = () => {
      const bd = h('div', null, h('p', { class: 'small' }, lt('Zona: ', 'Zone: ') + tr(z.n) + ' · ' + Field.coord(L.ship.x, L.ship.y, es)),
        h('p', { class: 'small' }, L.relay && L.parts.beacon === 'ok' ? '📡 ' + lt('La baliza actúa como relé: amplía la señal de radio alrededor de la nave.', 'The beacon works as a relay: it extends radio signal around the ship.') : '📡 ' + lt('Sin relé de radio: la baliza no está activa.', 'No radio relay: the beacon is not active.')),
        h('table', null, h('tbody', null, Land.PARTS.map((k) => { const st = L.parts[k]; return h('tr', null, h('th', null, tr(Land.PART_T[k])), h('td', null, tag(st === 'ok' ? '✔ ' + lt('Correcto', 'OK') : st === 'warn' ? '⚠ ' + lt('En observación', 'Under watch') : '⛔ ' + lt('Averiada', 'Down'), st === 'ok' ? 'ok' : st === 'warn' ? 'warn' : 'crit')), h('td', null, st !== 'ok' ? btn('🔧 ' + lt('Reparar', 'Repair') + ' (' + Land.REPAIR_MAT + ')', () => { if (S.r.mat.v < Land.REPAIR_MAT) { Sfx.play('bad'); return toast(lt('Faltan materiales', 'Not enough materials'), '', 'warn'); } S.r.mat.v -= Land.REPAIR_MAT; Land.repair(S, k); if (k === 'beacon') L.relay = true; Sfx.play('ok'); Sim.log(S, 'info', 'land.rep', { part: k }); const nb = build(); s.firstChild.replaceChild(nb, s.firstChild.lastChild); }, 'sm') : null)); }))),
        adv ? h('p', { class: 'small muted' }, lt('Relé: radio 34 baldosas · reparación: ', 'Relay: 34-tile radius · repair: ') + Land.REPAIR_MAT + lt(' de materiales (', ' materials (') + Math.round(S.r.mat.v) + lt(' disponibles)', ' available)')) : null,
        h('p', { class: 'small muted' }, lt('La nave se queda aquí: marca el sitio de llegada y conecta la base con la plataforma por una ruta de rover.', 'The ship stays here: it marks the arrival site and links the base to the pad by a rover route.')));
      return bd;
    };
    s.firstChild.append(build());
  }
  /** Tarjeta de la nave cuando está cerca. */
  function shipCard() { const L = Land.ensure(S); return h('div', null, h('b', null, '🚀 ' + lt('Nave de llegada', 'Arrival ship')), h('div', { class: 'small' }, Land.PARTS.map((k) => (L.parts[k] === 'ok' ? '🟢' : L.parts[k] === 'warn' ? '🟡' : '🔴') + ' ' + tr(Land.PART_T[k])).join(' · ')), h('div', { class: 'small' }, '👉 ' + lt('Pulsa E para revisar la nave.', 'Press E to inspect the ship.'))); }
  const landDebug = { get ph() { return LS.ph; }, get on() { return LS.on; }, get st() { return LS.d && LS.d.st; }, get dd() { return LS.dd; }, get tr() { return LS.tr; }, get trip() { return LS.S && LS.S.trip; }, get phase() { return LS.ph; }, toCruise: () => { const S = LS.S; Trip.ensure(S); S.trip = Trip.fresh(S); S.trip.launched = true; S.trip.stage = 'cruise'; landGo(phCruise()); }, skipTrip: () => { const S = LS.S; S.trip = undefined; Trip.ensure(S); landGo(phArrive()); }, get d() { return LS.d; }, drawMs: (n) => { const c = landCx, w = landCv.width, hh = landCv.height, t0 = performance.now(); for (let i = 0; i < n; i++) LS.ph.draw(c, w, hh, LS.t + i / 60); return (performance.now() - t0) / n; }, speed: (v) => { LS.sp = v; }, sel: () => LS.sel, S: () => LS.S, close: landClose };
