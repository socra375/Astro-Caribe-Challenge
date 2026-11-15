
  /* =====================================================================
     MAPA COMPLETO DE LA BASE (tecla M) y selector de tripulación (tecla C)
     El mapa se dibuja a partir de World.RECTS, del estado de la partida
     y del grafo de rutas real; no tiene datos propios de geometría.
     ===================================================================== */
  const MAPFN = {
    bridge: { es: 'Centro de operaciones: misiones, comunicaciones con la Tierra, alertas y vestuario.', en: 'Operations center: missions, Earth communications, alerts and wardrobe.' },
    life: { es: 'Dormitorios: camas, taquillas y descanso de la tripulación.', en: 'Crew quarters: beds, lockers and crew rest.' },
    med: { es: 'Enfermería: revisión de la tripulación y condiciones de habitabilidad.', en: 'Sick bay: crew checks and habitability conditions.' },
    kitchen: { es: 'Cocina y comedor: raciones y comidas de la tripulación.', en: 'Kitchen & mess: rations and crew meals.' },
    food: { es: 'Almacén de alimentos: reservas, conservación y cosechas.', en: 'Food storage: reserves, preservation and harvests.' },
    samples: { es: 'Almacén de muestras: recibe y conserva las muestras del rover.', en: 'Sample storage: receives and keeps the rover samples.' },
    workshop: { es: 'Taller de mantenimiento: herramientas, piezas y reparaciones.', en: 'Maintenance workshop: tools, parts and repairs.' },
    waste: { es: 'Gestión de residuos: separación y recuperación de materiales.', en: 'Waste management: sorting and material recovery.' },
    gh: { es: 'Invernadero: plantas individuales, riego, luz LED y cosecha.', en: 'Greenhouse: individual plants, irrigation, LED light and harvest.' },
    reactor: { es: 'Reactor y energía: generación, baterías, consumos y prioridades.', en: 'Reactor & power: generation, batteries, loads and priorities.' },
    water: { es: 'Soporte vital: oxígeno, reciclaje de agua, presión y calidad del aire.', en: 'Life support: oxygen, water recycling, pressure and air quality.' },
    rad: { es: 'Bahía del rover, esclusa y refugio contra la radiación.', en: 'Rover bay, airlock and radiation shelter.' },
    lab: { es: 'Laboratorio: análisis de muestras, espectrómetro y registro de resultados.', en: 'Lab: sample analysis, spectrometer and results log.' },
    hall: { es: 'Pasillo que conecta las salas del puesto avanzado.', en: 'Corridor linking the outpost rooms.' },
    lock: { es: 'Esclusa: paso entre el interior y la superficie.', en: 'Airlock: passage between inside and the surface.' },
    pad: { es: 'Superficie exterior: aquí se recogen muestras con el traje puesto.', en: 'Outside surface: samples are collected here in a suit.' }
  };
  const MAPSYS = { bridge: ['comms'], life: ['thermal', 'press'], med: ['thermal', 'press'], gh: ['gh'], reactor: ['reactor', 'solar'], water: ['o2', 'rec'], rad: ['shield', 'isru'], lab: ['lab'] };
  const ROLECOL = { commander: '#d9a72b', engineer: '#ff8a2a', scientist: '#a58cff', medic: '#7ff0cf', agri: '#8fd14f' };
  const isCorr = (k) => /^v\d$/.test(k);

  function mapOpen() { return stack.length > 0 && !!stack[stack.length - 1]._map; }
  function toggleMap() {
    if (mapOpen()) { pop(); return; }
    if (!running || modalOpen() || !S) return;
    openMap();
  }

  function openMap() {
    const es = LANG === 'es', D = World.DIM, RC = World.RECTS;
    const st = { sel: null, route: false, z: 1, cx: D.W / 2, cy: D.H / 2, drag: null, moved: false };
    const CW = 720, CH = 560;
    const cvm = h('canvas', { width: CW, height: CH, class: 'mapcv', tabindex: '0', role: 'img', 'aria-label': es ? 'Mapa completo del puesto avanzado. Pulsa una sala para ver su ficha. Flechas para desplazar, más y menos para el zoom.' : 'Full outpost map. Select a room to see its card. Arrows to pan, plus and minus to zoom.' });
    const info = h('div', { class: 'mapinfo', 'aria-live': 'polite' });
    const sc = () => Math.min(CW / D.W, CH / D.H) * st.z;
    const X = (x) => CW / 2 + (x - st.cx) * sc(), Y = (y) => CH / 2 + (y - st.cy) * sc();
    const rname = (k) => tr(DATA.ROOMS[k] || { es: k, en: k });
    const alertsIn = (k) => S.inc.filter((i) => !i.res && S.t >= i.from && i.room === k);
    const crewIn = (k) => World.crew().filter((m) => m.room === k);
    const roomOf = (k) => (isCorr(k) ? 'hall' : k);
    const ids = () => Object.keys(RC);

    function draw(t) {
      const x = cvm.getContext('2d'), s = sc();
      x.clearRect(0, 0, CW, CH); x.fillStyle = '#070b18'; x.fillRect(0, 0, CW, CH);
      x.lineJoin = 'round';
      for (const k of ids()) {
        const R = RC[k], lk = World.roomLocked(roomOf(k)), col = World.ROOMCOL[k] || (k === 'pad' ? '#9a7b58' : '#5a6890');
        const rx = X(R[0]), ry = Y(R[1]), rw = (R[2] - R[0] + 1) * s, rh = (R[3] - R[1] + 1) * s;
        x.fillStyle = lk ? '#151a29' : col + '4d'; x.fillRect(rx, ry, rw, rh);
        if (lk) { x.save(); x.beginPath(); x.rect(rx, ry, rw, rh); x.clip(); x.strokeStyle = '#ffffff22'; x.lineWidth = 2; for (let d = -rh; d < rw; d += 14) { x.beginPath(); x.moveTo(rx + d, ry + rh); x.lineTo(rx + d + rh, ry); x.stroke(); } x.restore(); }
        const sel = roomOf(k) === st.sel;
        x.strokeStyle = sel ? '#ffc24a' : lk ? '#6b7388' : col; x.lineWidth = sel ? 3 : 1.5; x.strokeRect(rx, ry, rw, rh);
      }
      // puertas y esclusas (las del mundo real)
      for (const d of World.doorList()) {
        const lockd = d.kind !== 'auto';
        x.fillStyle = lockd ? '#ffc24a' : '#38d6ff'; x.fillRect(X(d.x), Y(d.y) + s * 0.2, 2 * s, Math.max(3, s * 0.6));
      }
      // etiquetas e iconos de estado
      for (const k of ids()) {
        if (isCorr(k)) continue;
        const R = RC[k], lk = World.roomLocked(k), cx = X((R[0] + R[2] + 1) / 2), cy = Y((R[1] + R[3] + 1) / 2), rw = (R[2] - R[0] + 1) * s;
        const fs = Math.max(10, Math.min(15, 9 + st.z * 2));
        x.font = '700 ' + fs + 'px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = lk ? '#9aa3bb' : '#f2f6ff'; x.strokeStyle = '#0008'; x.lineWidth = 3;
        x.strokeText(rname(k), cx, cy + (lk ? 14 : 0), rw - 6); x.fillText(rname(k), cx, cy + (lk ? 14 : 0), rw - 6);
        if (lk) { Icons.draw(x, 'lock', cx, cy - 8, 22, '#ffc24a'); }
        const al = alertsIn(k);
        if (al.length) {
          const crit = al.some((i) => i.sev === 'crit'), pul = 0.55 + 0.45 * Math.sin(t / 220);
          x.save(); x.globalAlpha = pul; x.strokeStyle = crit ? '#ff6b6b' : '#ffc24a'; x.lineWidth = 4; x.strokeRect(X(R[0]) + 2, Y(R[1]) + 2, rw - 4, (R[3] - R[1] + 1) * s - 4); x.restore();
          Icons.draw(x, crit ? 'crit' : 'warn', X(R[2] + 1) - 14, Y(R[1]) + 14, 20, crit ? '#ff6b6b' : '#ffc24a');
        }
      }
      // ruta
      if (st.route && st.sel) {
        const pts = World.route(st.sel);
        if (pts && pts.length > 1) {
          x.save(); x.strokeStyle = '#38d6ff'; x.lineWidth = 4; x.setLineDash([10, 8]); x.lineDashOffset = -t / 40; x.beginPath();
          pts.forEach((p, i) => (i ? x.lineTo(X(p[0]), Y(p[1])) : x.moveTo(X(p[0]), Y(p[1])))); x.stroke(); x.restore();
        }
      }
      // objetivo activo y destino marcado
      const hi = nextHint();
      if (hi && hi.p) Icons.draw(x, 'target', X(hi.p[0]), Y(hi.p[1]), 22, '#ffc24a');
      const mk = World.marker;
      if (mk) { x.strokeStyle = '#ff6b6b'; x.lineWidth = 3; x.beginPath(); x.arc(X(mk.p[0]), Y(mk.p[1]), 10 + 3 * Math.sin(t / 200), 0, 7); x.stroke(); Icons.draw(x, 'pin', X(mk.p[0]), Y(mk.p[1]) - 16, 20, '#ff6b6b'); }
      // tripulación (NPC) y jugador
      for (const m of World.crew()) { x.fillStyle = ROLECOL[m.role]; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(X(m.x), Y(m.y), 6, 0, 7); x.fill(); x.stroke(); }
      const P = World.player;
      x.fillStyle = '#fff'; x.beginPath(); x.arc(X(P.x), Y(P.y), 8, 0, 7); x.fill(); x.strokeStyle = '#38d6ff'; x.lineWidth = 3; x.stroke();
      x.font = '700 11px system-ui'; x.fillStyle = '#38d6ff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.textAlign = 'center'; x.textBaseline = 'bottom';
      x.strokeText(es ? 'Tú' : 'You', X(P.x), Y(P.y) - 11); x.fillText(es ? 'Tú' : 'You', X(P.x), Y(P.y) - 11);
    }

    function card() {
      info.innerHTML = '';
      const k = st.sel;
      if (!k) {
        info.append(h('p', { class: 'small muted' }, es ? 'Selecciona una sala para ver su ficha. Tú eres el punto blanco; los puntos de color son tus compañeros.' : 'Select a room to see its card. You are the white dot; the colored dots are your crewmates.'),
          h('div', { class: 'row small' }, Object.keys(ROLECOL).map((r) => h('span', { class: 'chip', style: { borderColor: ROLECOL[r] } }, h('i', { style: { background: ROLECOL[r], width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' } }), ' ' + tr(Chars.ROLES[r].name)))));
        return;
      }
      const lk = World.roomLocked(k), al = alertsIn(k), crew = crewIn(k), here = World.roomName(World.player.x, World.player.y) === k;
      const sys = (MAPSYS[k] || []).filter((q) => S.sys[q] && S.sys[q].h != null);
      const cs = lk ? Sim.campStatus(S) : null;
      info.append(
        h('div', { class: 'row', style: { alignItems: 'center' } }, h('h3', { style: { margin: 0 } }, rname(k)),
          lk ? tag('🔒 ' + (es ? 'Bloqueada' : 'Locked'), 'warn') : al.length ? tag((al.some((i) => i.sev === 'crit') ? '⛔ ' : '⚠ ') + (es ? 'Con alerta' : 'Alert'), al.some((i) => i.sev === 'crit') ? 'crit' : 'warn') : tag('✔ ' + (es ? 'Disponible' : 'Available'), 'ok'),
          here ? tag('📍 ' + (es ? 'Estás aquí' : 'You are here'), 'ok') : null),
        h('p', { class: 'small' }, tr(MAPFN[k] || { es: '', en: '' })),
        lk ? h('p', { class: 'small' }, es ? 'Acceso bloqueado: ' + (cs ? 'se abre al avanzar en «' + tr(NPCDATA.CAMP[cs.id].t) + '».' : 'completa la misión de familiarización en curso.') + ' Las emergencias nunca quedan bloqueadas.' : 'Access locked: ' + (cs ? 'it opens as you progress in "' + tr(NPCDATA.CAMP[cs.id].t) + '".' : 'finish the current familiarization mission.') + ' Emergencies are never blocked.') : null,
        sys.length ? h('p', { class: 'small' }, (es ? 'Sistemas: ' : 'Systems: ') + sys.map((q) => tr(DATA.SYS_T[q]) + ' ' + Math.round(S.sys[q].h) + ' %').join(' · ')) : null,
        al.length ? h('p', { class: 'small' }, '⚠ ' + al.map((i) => tr(DATA.EVT[i.type].t)).join(' · ')) : null,
        crew.length ? h('p', { class: 'small' }, (es ? 'Aquí: ' : 'Here: ') + crew.map((m) => tr(Chars.ROLES[m.role].name)).join(', ')) : null,
        h('div', { class: 'row' },
          btn('📍 ' + (es ? 'Marcar destino' : 'Mark destination'), () => { World.setMarker(World.roomCenter(k), rname(k)); toast(es ? 'Destino marcado' : 'Destination marked', rname(k), 'ok'); card(); }, 'primary sm'),
          lk ? null : btn((st.route ? '✖ ' : '🗺 ') + (st.route ? (es ? 'Ocultar ruta' : 'Hide route') : (es ? 'Mostrar ruta' : 'Show route')), () => { st.route = !st.route; card(); }, 'sm'),
          btn('🎯 ' + (es ? 'Centrar en la sala' : 'Center on room'), () => { const R = RC[k]; st.cx = (R[0] + R[2] + 1) / 2; st.cy = (R[1] + R[3] + 1) / 2; }, 'sm ghost')));
    }

    function pick(px, py) {
      const s = sc(), wx = (px - CW / 2) / s + st.cx, wy = (py - CH / 2) / s + st.cy;
      const k = ids().find((q) => { const R = RC[q]; return wx >= R[0] && wx < R[2] + 1 && wy >= R[1] && wy < R[3] + 1; });
      st.sel = k ? roomOf(k) : null; if (!st.sel) st.route = false; card();
    }
    const clampC = () => { st.cx = Math.max(0, Math.min(D.W, st.cx)); st.cy = Math.max(0, Math.min(D.H, st.cy)); };
    const zoom = (d) => { st.z = Math.max(1, Math.min(3.5, st.z * d)); if (st.z === 1) { st.cx = D.W / 2; st.cy = D.H / 2; } clampC(); };
    const toCv = (e) => { const r = cvm.getBoundingClientRect(); return [(e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height]; };
    cvm.addEventListener('pointerdown', (e) => { cvm.setPointerCapture(e.pointerId); st.drag = toCv(e); st.moved = false; });
    cvm.addEventListener('pointermove', (e) => {
      if (!st.drag) return; const p = toCv(e), dx = p[0] - st.drag[0], dy = p[1] - st.drag[1];
      if (Math.abs(dx) + Math.abs(dy) > 5) st.moved = true;
      if (st.moved && st.z > 1) { st.cx -= dx / sc(); st.cy -= dy / sc(); clampC(); st.drag = p; }
    });
    cvm.addEventListener('pointerup', (e) => { if (st.drag && !st.moved) { const p = toCv(e); pick(p[0], p[1]); } st.drag = null; });
    cvm.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    cvm.addEventListener('keydown', (e) => {
      const stp = 3 / st.z * 2;
      if (e.key === 'ArrowLeft') st.cx -= stp; else if (e.key === 'ArrowRight') st.cx += stp; else if (e.key === 'ArrowUp') st.cy -= stp; else if (e.key === 'ArrowDown') st.cy += stp;
      else if (e.key === '+' || e.key === '=') zoom(1.25); else if (e.key === '-' || e.key === '_') zoom(0.8); else return;
      clampC(); e.preventDefault();
    });

    const tools = h('div', { class: 'row' },
      btn('＋', () => zoom(1.25), 'sm', { 'aria-label': 'Zoom +' }), btn('－', () => zoom(0.8), 'sm', { 'aria-label': 'Zoom -' }),
      btn('📍 ' + (es ? 'Centrar en mí' : 'Center on me'), () => { st.cx = World.player.x; st.cy = World.player.y; if (st.z < 2) st.z = 2; clampC(); }, 'sm'),
      btn('↔ ' + (es ? 'Ver mundo completo' : 'Full view'), () => { st.z = 1; st.cx = D.W / 2; st.cy = D.H / 2; }, 'sm ghost'),
      h('span', { class: 'small muted' }, es ? 'Azul: puertas · naranja: esclusa. Cierra con M o Esc; el tiempo está en pausa.' : 'Blue: doors · orange: airlock. Close with M or Esc; time is paused.'));
    const body = h('div', { class: 'col' }, tools, cvm, info);
    const s = push(panel('🗺 ' + (es ? 'Mapa de la base' : 'Base map'), body), { sticky: true, onclose: () => { clearInterval(iv); } });
    s._map = true;
    const iv = setInterval(() => { if (!s.isConnected) { clearInterval(iv); return; } draw(performance.now()); }, 90);
    card(); draw(performance.now());
    return s;
  }

  function openCrew() { if (!S || !running || modalOpen()) return; wardrobePanel(); }
