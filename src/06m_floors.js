  /* =====================================================================
     PISOS: teletransporte de la sala de comandos (atajo directo a cualquier piso)
     y panel del elevador de tripulación (puertas, trayecto real con Station y
     escalera de emergencia si está averiado). Los dos terminan en World.arrive.
     ===================================================================== */
  const FLOOR_D = {
    1: { es: 'Mando, cocina, invernadero, laboratorio, dormitorios y enfermería.', en: 'Command, kitchen, greenhouse, lab, quarters and sick bay.' },
    2: { es: 'Esclusa, garaje del rover, taller y residuos. Salida al exterior.', en: 'Airlock, rover garage, workshop and waste. Way outside.' },
    3: { es: 'Núcleo energético: el reactor.', en: 'Energy core: the reactor.' }
  };
  const fname = (f) => Station.floorName(f, LANG);
  /** Destello de teletransporte: a mitad de la animación se cambia de piso. */
  function teleportTo(n) {
    const veil = h('div', { id: 'telefx', 'aria-hidden': 'true' }, h('div', { class: 'telering' }, '🌀'));
    document.getElementById('app').append(veil); Sfx.play('scan');
    setTimeout(() => { World.arrive(n, true); lastRoom = null; Sfx.play('door'); }, 450);
    setTimeout(() => { veil.remove(); toast('🌀 ' + fname(n), '', 'info'); }, 950);
  }
  function teleportPanel() {
    const cur = World.floor, es = LANG === 'es';
    push(panel('🌀 ' + lt('Teletransporte de la sala de comandos', 'Command room teleporter'), h('div', null,
      h('p', { class: 'small muted' }, lt('Atajo directo a otro piso: llegas junto al elevador de ese piso. Para ir andando, usa el elevador.', 'A direct shortcut to another floor: you arrive next to that floor elevator. To go on foot, use the elevator.')),
      ...Station.FLOORS.map((f) => h('div', { style: { margin: '6px 0' } }, btn((f === cur ? '📍 ' : '➡ ') + fname(f), () => { pop(); if (f !== cur) teleportTo(f); }, f === cur ? 'ghost' : 'primary', { 'data-act': 'tele-' + f, disabled: f === cur ? true : null }), h('div', { class: 'small muted' }, tr(FLOOR_D[f])))))));
  }
  /** Llegada al piso de destino (elevador o escalera): cambia de piso y deja al jugador junto al elevador. */
  function arriveFloor(n, outside) { World.arrive(n, !!outside); lastRoom = null; }
  /** Estado de seguridad del núcleo energético (se muestra en el panel del elevador del piso 3). */
  function coreBlock() {
    const c = Station.coreStatus(S), es = LANG === 'es', why = c.reasons.map((k) => tr(Station.CORE_WHY[k]));
    if (!c.reasons.length) return h('div', { class: 'small tag ok', 'data-core': 'ok' }, '🟢 ' + lt('Núcleo energético: acceso normal.', 'Energy core: normal access.'));
    if (c.auth) return h('div', { class: 'small tag warn', 'data-core': 'auth' }, '🟡 ' + lt('Protocolo de seguridad aplicado: acceso autorizado unos segundos más. ', 'Safety protocol applied: access authorized for a few more seconds. ') + why.join(' '));
    return h('div', { 'data-core': 'restricted' }, h('p', { class: 'small tag crit' }, '🔴 ' + lt('Acceso al núcleo restringido: ', 'Core access restricted: ') + why.join(' ')),
      h('p', { class: 'small muted' }, lt('Con el traje de protección puesto puedes aplicar el protocolo de seguridad y entrar un rato. El ingeniero puede entrar a reparar.', 'With the protective suit on you can apply the safety protocol and enter for a while. The engineer may enter to repair.')),
      btn('🛡 ' + lt('Aplicar protocolo de seguridad', 'Apply safety protocol'), () => { const r = Station.authorizeCore(S, !!(S.ex && S.ex.suit.on)); if (!r.ok) { Sfx.play('bad'); toast(tr(Station.CORE_WHY[r.why]), '', 'warn'); } else { Sfx.play('ok'); toast('🛡 ' + lt('Protocolo aplicado', 'Protocol applied'), lt('Puedes entrar al núcleo.', 'You may enter the core.'), 'ok'); } }, 'primary', { 'data-act': 'core-auth' }));
  }
  function elevatorPanel(f) {
    const st = Station.ensure(S), e = st.elev.crew, es = LANG === 'es';
    let timer = 0, stairsT = 0, dest = 0, mode = null;
    const body = h('div');
    const s = push(panel('🛗 ' + tr(Station.KINDS.crew.name), body), { sticky: true, onclose: () => { clearInterval(timer); } });
    const paint = () => {
      body.innerHTML = '';
      const here = World.floor, d = Station.door(S, 'crew'), lvl = Station.level(S, 'crew');
      const stN = { idle: lt('Puertas abiertas', 'Doors open'), closing: lt('Cerrando puertas…', 'Closing doors…'), moving: lt('En movimiento', 'Moving'), opening: lt('Abriendo puertas…', 'Opening doors…') }[e.st];
      body.append(...[h('div', { class: 'row', style: { gap: '12px', alignItems: 'center' } }, h('b', { style: { fontSize: '28px' }, 'data-lvl': Math.round(lvl) }, Math.round(lvl)), h('div', null, h('div', null, mode === 'stairs' ? lt('Escalera de emergencia', 'Emergency stairs') : stN), h('div', { class: 'pbar' }, h('i', { style: { width: Math.round((d) * 100) + '%' } })), h('div', { class: 'small muted' }, lt('Puertas', 'Doors') + ' ' + Math.round(d * 100) + ' %'))),
        World.floor === 3 ? coreBlock() : null,
        e.broken && mode !== 'stairs' ? h('p', { class: 'small tag warn' }, '⚠ ' + tr(Station.WHY.broken)) : null].filter(Boolean));
      if (mode === 'stairs') return body.append(h('div', { class: 'small' }, lt('Subiendo por la escalera… ', 'Taking the stairs… ') + Math.max(0, Math.ceil(stairsT)) + ' s'));
      if (e.st !== 'idle') return body.append(h('p', { class: 'small muted' }, lt('Espera a que el elevador termine el trayecto.', 'Wait for the elevator to finish the trip.')));
      const inside = World.roomName(World.player.x, World.player.y) === 'elc' + here;
      if (!inside && e.at === here && !e.broken) return body.append(h('p', { class: 'small' }, lt('El elevador está aquí con las puertas abiertas: entra para elegir el piso.', 'The elevator is here with its doors open: step in to choose the floor.')));
      if (e.at !== here && !e.broken) return body.append(h('p', { class: 'small' }, lt('El elevador está en el piso ' + e.at + '.', 'The elevator is on floor ' + e.at + '.')), btn('🔔 ' + lt('Llamar al elevador', 'Call the elevator'), () => { Station.call(S, 'crew', here); Sfx.play('door'); paint(); }, 'primary', { 'data-act': 'elev-call' }));
      body.append(h('div', { class: 'small muted' }, lt('Elige el piso de destino:', 'Choose the destination floor:')), h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', margin: '6px 0' } }, Station.FLOORS.map((fl) => btn((fl === here ? '📍 ' : '') + fname(fl), () => go(fl), fl === here ? 'ghost' : 'primary', { 'data-act': 'elev-' + fl, disabled: fl === here ? true : null }))));
    };
    const go = (to) => {
      const from = World.floor; if (to === from) return;
      if (e.broken) { const r = Station.stairs(S, from, to); pop(); startRide('stairs', from, to, r.s); return; }
      const b = Station.board(S, 'crew', 'player'); if (!b.ok) return toast(tr(Station.WHY[b.why]), '', 'warn');
      const r = Station.call(S, 'crew', to); if (!r.ok) { Station.leave(S, 'crew', 'player'); return toast(tr(Station.WHY[r.why]), '', 'warn'); }
      pop(); startRide('lift', from, to, r.s); // el panel se cierra y empieza la animación del trayecto
    };
    // una ocupación que quedó de un viaje interrumpido no debe dejar la cabina «ocupada» ni en un piso que no es
    if (!ride && e.st === 'idle' && e.occ.includes('player')) Station.leave(S, 'crew', 'player');
    timer = setInterval(() => { if (!s.isConnected) return clearInterval(timer); paint(); }, 100);
    paint();
  }

  /* ---------- Trayecto del elevador: animación a pantalla completa ----------
     El cambio de piso lo completa este controlador (no el panel): cerrar el panel o pausar no deja al jugador
     en un piso distinto al de la cabina. Mientras dura el viaje el juego queda quieto. */
  let ride = null;
  const rideOn = () => !!ride;
  const G_LAB = () => lt('Nivel G · Garaje', 'Level G · Garage'), S_LAB = () => lt('Superficie', 'Surface');
  /** kind: 'lift' (elevador de tripulación), 'stairs' (escalera de emergencia), 'rlift' (plataforma del rover, con el jugador a bordo) o 'sstairs' (escalera de servicio entre la superficie y el garaje). */
  function startRide(kind, from, to, secs) {
    rideEnd(true);
    const es = LANG === 'es', up = kind === 'rlift' || kind === 'sstairs' ? to < from : to > from, two = kind === 'rlift' || kind === 'sstairs';
    const doorL = h('div', { class: 'elr-door l' }), doorR = h('div', { class: 'elr-door r' });
    const num = h('div', { class: 'elr-num' }), arrow = h('div', { class: 'elr-arrow' }, up ? '▲' : '▼'), name = h('div', { class: 'elr-name' }), msg = h('div', { class: 'elr-msg' });
    const col = h('div', { class: 'elr-col' }, two ? [h('div', { class: 'elr-f', 'data-f': 'S' }, 'S'), h('div', { class: 'elr-f', 'data-f': 'G' }, 'G')] : Station.FLOORS.slice().reverse().map((f) => h('div', { class: 'elr-f', 'data-f': f }, String(f))));
    const shaft = h('div', { class: 'elr-shaft' });
    const el = h('div', { id: 'elride', role: 'status', 'aria-live': 'polite', 'data-kind': kind },
      shaft, h('div', { class: 'elr-cab' }, doorL, doorR, h('div', { class: 'elr-disp' }, arrow, num), name), col, msg);
    document.getElementById('app').append(el);
    ride = { kind, from, to, up, two, t: 0, total: Math.max(1, secs || 1), el, num, arrow, name, msg, doorL, doorR, shaft, col, e: 0, last: '', engine: 0 };
    if (two && (kind === 'rlift' ? to === 2 : to === 4)) setTimeout(() => { try { World.prewarmFloor(4); } catch (e2) { /* se arma al llegar */ } }, 50); // el arte del garaje se prepara mientras dura la animación
    Sfx.play(kind === 'stairs' || kind === 'sstairs' ? 'step' : 'door'); rideFrame(0);
  }
  function rideEnd(abort) {
    if (!ride) return; const r = ride; ride = null; r.el.remove();
    if (abort || !S) return;
    if (r.kind === 'lift') Station.leave(S, 'crew', 'player');
    if (r.kind === 'rlift') Station.leave(S, 'rover', 'player');
    if (r.kind === 'rlift' || r.kind === 'sstairs') {
      const down = r.kind === 'rlift' ? r.to === 2 : r.to === 4;
      if (down) World.placeNear(Station.GARAGE, Station.GDOCK[0], Station.GDOCK[1] + 5.2); else World.placeNear(2, Station.PLAT.x + Station.PLAT.w + 1.8, Station.PLAT.c[1]);
      lastRoom = null; Sfx.play('ok'); toast((r.kind === 'rlift' ? '🛗 ' : '🪜 ') + (down ? G_LAB() : S_LAB()), '', 'ok'); return;
    }
    arriveFloor(r.to, r.kind === 'stairs'); Sfx.play('ok');
    toast((r.kind === 'stairs' ? '🪜 ' : '🛗 ') + fname(r.to), '', 'ok');
  }
  /** Se llama en cada fotograma del juego (también con paneles abiertos; con el juego en pausa no avanza). */
  function rideFrame(dt) {
    if (!ride || !S) return; const r = ride, es = LANG === 'es', ek = r.kind === 'rlift' ? 'rover' : 'crew', e = Station.ensure(S).elev[ek];
    let lvl, open, state;
    if (r.kind === 'stairs' || r.kind === 'sstairs') {
      if (!paused) r.t += dt; const u = Math.min(1, r.t / r.total); lvl = r.from + (r.to - r.from) * u; open = 0; state = 'moving';
      if (u >= 1) return rideEnd();
    } else {
      lvl = Station.level(S, ek); open = Station.door(S, ek); state = e.st; r.t += dt;
      if (e.st === 'idle' && e.at === r.to) return rideEnd();
      if (e.st === 'idle' && e.at !== r.to && r.t > 2) return rideEnd(true); // seguridad: el trayecto no empezó; no se deja la pantalla bloqueada
    }
    let lv, label, nm;
    if (r.two) { const g = r.kind === 'rlift' ? lvl >= 1 : lvl >= 3; lv = g ? 'G' : 'S'; label = lv; nm = g ? G_LAB() : S_LAB(); }
    else { const n = Math.round(lvl); lv = n; label = String(n); nm = (es ? 'Piso ' : 'Floor ') + n + ' · ' + fname(n).replace(/^[^·]*·\s*/, ''); }
    r.num.textContent = label; r.name.textContent = nm;
    r.doorL.style.transform = 'translateX(' + (-open * 100).toFixed(1) + '%)'; r.doorR.style.transform = 'translateX(' + (open * 100).toFixed(1) + '%)';
    r.shaft.className = 'elr-shaft' + (state === 'moving' ? (r.up ? ' up' : ' down') : '');
    for (const c of r.col.children) c.classList.toggle('on', String(c.dataset.f) === String(lv));
    const stairs = r.kind === 'stairs' || r.kind === 'sstairs', left = Math.max(0, Math.ceil(r.total - r.t));
    const txt = r.kind === 'sstairs' ? (es ? 'Escalera de servicio… ' + left + ' s' : 'Service stairs… ' + left + ' s') : r.kind === 'stairs' ? (es ? 'Escalera de emergencia… ' + left + ' s' : 'Emergency stairs… ' + left + ' s')
      : { closing: es ? 'Cerrando puertas…' : 'Closing doors…', moving: r.kind === 'rlift' ? (r.to === 2 ? (es ? 'Bajando al garaje…' : 'Going down to the garage…') : (es ? 'Subiendo a la superficie…' : 'Going up to the surface…')) : r.up ? (es ? 'Subiendo…' : 'Going up…') : (es ? 'Bajando…' : 'Going down…'), opening: es ? 'Abriendo puertas…' : 'Opening doors…', idle: es ? 'Puertas abiertas' : 'Doors open' }[state];
    r.msg.textContent = txt;
    if (r.last !== state) { if (r.last && state === 'opening') Sfx.play('door'); r.last = state; }
    if (state === 'moving') { r.engine -= dt; if (r.engine <= 0) { r.engine = 0.7; Sfx.play(stairs ? 'step' : 'engine'); } }
  }
  /** Para volver al menú o empezar otra partida mientras se viaja. */
  const rideAbort = () => rideEnd(true);

  /* ---------- Elevador del rover (plataforma exterior ↔ garaje) ---------- */
  /** ¿Puede moverse la plataforma? El rover tiene que estar bien colocado encima (o ya en el garaje). */
  const roverLiftOk = () => Station.roverStored(S) || Station.roverOnPlatform(S.ex.rover);
  function roverLiftCard() {
    const e = Station.ensure(S).elev.rover, st = Station.roverStored(S), es = LANG === 'es';
    return h('div', null, h('b', null, '🛗 ' + tr(Station.KINDS.rover.name)), h('div', { class: 'small' }, st ? lt('El rover está guardado en el garaje.', 'The rover is stored in the garage.') : roverLiftOk() ? lt('El rover está sobre la plataforma: listo para bajar.', 'The rover is on the platform: ready to go down.') : lt('Coloca el rover en el centro de la plataforma, alineado y parado.', 'Place the rover in the middle of the platform, aligned and stopped.')), h('div', { class: 'small' }, '👉 ' + lt('Pulsa E para abrir el panel.', 'Press E to open the panel.')));
  }
  /** ¿Está el jugador sobre la plataforma de la superficie (para bajar junto al rover)? */
  const onPlatform = () => { const P = Station.PLAT, p = World.player; return World.floor === 2 && p.x >= P.x - 0.4 && p.x <= P.x + P.w + 0.4 && p.y >= P.y - 0.4 && p.y <= P.y + P.h + 0.4; };
  function serviceStairs(to) { const from = to === 4 ? 2 : 4; World.floor === (from === 4 ? 4 : 2) && startRide('sstairs', from, to, 6); }
  function roverLiftPanel() {
    const st0 = Station.ensure(S), e = st0.elev.rover, es = LANG === 'es';
    let timer = 0, msg = null; const body = h('div');
    const s = push(panel('🛗 ' + tr(Station.KINDS.rover.name), body), { sticky: true, onclose: () => clearInterval(timer) });
    const paint = () => {
      body.innerHTML = '';
      const d = Station.door(S, 'rover'), lvl = Station.level(S, 'rover'), stored = Station.roverStored(S), idle = e.st === 'idle', inG = World.floor === 4, plat = onPlatform();
      const stN = { idle: lt('Puertas abiertas', 'Doors open'), closing: lt('Cerrando puertas…', 'Closing doors…'), moving: lt('En movimiento', 'Moving'), opening: lt('Abriendo puertas…', 'Opening doors…') }[e.st];
      const btns = [];
      if (idle && !e.broken) {
        if (!inG && !stored) { btns.push(btn('⬇ ' + lt('Bajar el rover al garaje', 'Send the rover down'), () => go(2, false), 'primary', { 'data-act': 'rlift-down' })); if (plat) btns.push(btn('⬇ ' + lt('Bajar con el rover', 'Go down with the rover'), () => go(2, true), '', { 'data-act': 'rlift-down-ride' })); }
        if (!inG && stored) btns.push(btn('⬆ ' + lt('Subir el rover a la superficie', 'Bring the rover up'), () => go(0, false), 'primary', { 'data-act': 'rlift-up' }), btn('🪜 ' + lt('Bajar al garaje por la escalera de servicio', 'Go down to the garage by the service stairs'), () => { pop(); serviceStairs(4); }, '', { 'data-act': 'gstairs-down' }));
        if (!inG && !stored && !plat) btns.push(btn('🪜 ' + lt('Bajar al garaje por la escalera de servicio', 'Go down to the garage by the service stairs'), () => { pop(); serviceStairs(4); }, '', { 'data-act': 'gstairs-down' }));
        if (inG && stored) btns.push(btn('⬆ ' + lt('Subir con el rover a la superficie', 'Go up with the rover'), () => go(0, true), 'primary', { 'data-act': 'rlift-up-ride' }), btn('⬆ ' + lt('Subir solo el rover', 'Send only the rover up'), () => go(0, false), '', { 'data-act': 'rlift-up' }));
      }
      body.append(...[h('div', { class: 'row', style: { gap: '12px', alignItems: 'center' } }, h('b', { style: { fontSize: '28px' }, 'data-rlvl': lvl > 0.5 ? 'G' : '0' }, lvl > 0.5 ? 'G' : '0'), h('div', null, h('div', null, stN + ' · ' + (lvl > 0.5 ? lt('garaje', 'garage') : lt('superficie', 'surface'))), h('div', { class: 'pbar' }, h('i', { style: { width: Math.round(d * 100) + '%' } })), h('div', { class: 'small muted' }, lt('Nivel ', 'Level ') + lvl.toFixed(1)))),
        h('p', { class: 'small' }, stored ? lt('El rover está aparcado en el garaje, cargando la batería.', 'The rover is parked in the garage, charging its battery.') : roverLiftOk() ? '✔ ' + lt('El rover está bien colocado sobre la plataforma.', 'The rover is correctly placed on the platform.') : '⚠ ' + tr(Station.WHY.align)),
        plat && !stored && roverLiftOk() ? h('p', { class: 'small tag ok' }, '🧑‍🚀 ' + lt('Estás sobre la plataforma: puedes bajar con el rover.', 'You are on the platform: you can go down with the rover.')) : null,
        e.broken ? h('p', { class: 'small tag warn' }, '⚠ ' + tr(Station.WHY.broken)) : null,
        msg ? h('p', { class: 'small tag warn', 'data-msg': 'warn' }, '⚠ ' + msg) : null,
        btns.length ? h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, btns) : (idle ? null : h('p', { class: 'small muted' }, lt('Espera a que la plataforma termine el trayecto.', 'Wait for the platform to finish the trip.')))].filter(Boolean));
    };
    const go = (to, rider) => {
      const from = e.at;
      if (rider) { const b = Station.board(S, 'rover', 'player'); if (!b.ok) { msg = tr(Station.WHY[b.why] || Station.WHY.closed); Sfx.play('bad'); return paint(); } }
      const r = Station.call(S, 'rover', to, { roverOn: roverLiftOk() });
      if (!r.ok) { if (rider) Station.leave(S, 'rover', 'player'); msg = tr(Station.WHY[r.why] || Station.WHY.rover); if (r.why === 'rover') msg = tr(Station.WHY.align); Sfx.play('bad'); return paint(); }
      msg = null; Sfx.play('door');
      if (rider) { pop(); startRide('rlift', from, to, r.s); } else paint();
    };
    let lastSt = e.st, tk = 0;
    timer = setInterval(() => {
      if (!s.isConnected) return clearInterval(timer);
      if (e.st === 'moving' && ++tk % 4 === 0) Sfx.play('engine');
      if (lastSt !== e.st) { Sfx.play(e.st === 'idle' ? 'ok' : 'deployclk'); lastSt = e.st; }
      paint();
    }, 100);
    paint();
  }
  /** Taller del garaje (consola del nivel G): estado del rover, carga y reparación con materiales. */
  function garagePanel() {
    const es = LANG === 'es', E = S.ex, body = h('div'); let msg = null;
    const s = push(panel('🔧 ' + lt('Taller del garaje', 'Garage workshop'), body));
    const paint = () => {
      body.innerHTML = '';
      const rv = S.sys.rover, mat = S.r.mat.v, inG = Station.roverInGarage(S), cost = 6;
      const row = (a, b, c) => h('tr', null, h('th', null, a), h('td', { class: c || '' }, b));
      body.append(h('p', { class: 'small' }, inG ? lt('El rover está en su dock del garaje.', 'The rover is in its garage dock.') : lt('El rover no está en el garaje: está en la superficie.', 'The rover is not in the garage: it is on the surface.')),
        h('table', null, h('tbody', null, row(lt('Integridad', 'Integrity'), Math.round(rv.h) + ' %', rv.h < 40 ? 'warn' : ''), row(lt('Batería', 'Battery'), Math.round(rv.batt) + ' %' + (inG && rv.batt < 100 ? ' · ' + lt('cargando', 'charging') : ''), rv.batt < 25 ? 'warn' : ''), row(lt('Muestras a bordo', 'Samples on board'), String(E ? E.rover.load.length : 0)), row(lt('Materiales', 'Materials'), mat.toFixed(0) + ' kg'))),
        h('p', { class: 'small muted' }, lt('Los choques a más de 6 casillas por segundo dañan el rover; con la integridad en 0 se destruye con el conductor dentro. Aquí se repara con materiales.', 'Hits above 6 tiles per second damage the rover; at 0 integrity it is destroyed with the driver inside. Repair it here with materials.')),
        msg ? h('p', { class: 'small tag ' + msg.k, 'data-msg': msg.k }, msg.t) : null,
        btn('🔧 ' + lt('Reparar el rover (' + cost + ' kg de materiales)', 'Repair the rover (' + cost + ' kg of materials)'), () => {
          if (rv.h >= 99.5) { msg = { k: 'info', t: lt('El rover ya está en perfecto estado.', 'The rover is already in perfect shape.') }; return paint(); }
          if (S.r.mat.v < cost) { Sfx.play('bad'); msg = { k: 'warn', t: lt('Faltan materiales.', 'Not enough materials.') }; return paint(); }
          S.r.mat.v -= cost; rv.h = 100; Sfx.play('ok'); msg = { k: 'ok', t: lt('Rover reparado: integridad al 100 %.', 'Rover repaired: integrity at 100 %.') }; paint();
        }, 'primary', { 'data-act': 'garage-repair' }));
    };
    paint();
  }

  /* ---------- Sonido ambiental por zona ---------- */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  /** Mezcla de ambiente según el piso, el estado del reactor, el elevador, el rover, el exterior y el traje. */
  function ambMix() {
    const m = { reactor: 0, vent: 0, motor: 0, wind: 0, suit: 0, rover: 0, reactorUnstable: 0, motorSpeed: 0 };
    if (!running || !S || S.ended) return m;
    const fl = World.floor, p = World.player, outside = World.zone() === 'outside', E = S.ex, suit = !!(E && E.suit.on), rh = S.sys.reactor.h, st = Station.ensure(S), ec = st.elev.crew, er = st.elev.rover;
    if (!outside) m.vent = 0.3 + (World.roomName(p.x, p.y) === 'life' ? 0.15 : 0);
    // zumbido del reactor: fuerte en el piso del núcleo y cerca de él, apenas se oye por la estructura en los otros pisos
    const RC = Layout.REACTOR_C, d = Math.hypot(p.x - RC[0], p.y - RC[1]);
    m.reactor = fl === 3 ? 0.3 + 0.7 * clamp01(1 - d / 40) : outside ? 0 : 0.07;
    if (rh <= 20) m.reactor *= 0.12; else if (rh < 35) m.reactorUnstable = clamp01((35 - rh) / 15); // apagado: casi silencio; dañado: zumbido inestable
    // motor del elevador de tripulación
    if (ec.st === 'moving') { m.motor = rideOn() ? 0.95 : (fl === ec.at || fl === ec.to ? 0.35 : 0.12); m.motorSpeed = Math.min(1, Math.abs(ec.to - ec.at) * ec.p); } else if (ec.st === 'closing' || ec.st === 'opening') m.motor = rideOn() ? 0.25 : 0;
    // plataforma del rover (suelo y garaje)
    if (er.st === 'moving') m.rover = fl === 2 || fl === 4 ? 0.8 : 0.1;
    // exterior: en Marte hay viento (fuerte con tormenta de polvo); la Luna no tiene atmósfera: solo se oye el traje
    if (outside) {
      const storm = S.inc.some((i) => i.type === 'dust_storm' && !i.res && S.t >= i.from);
      if (S.scen === 'mars') m.wind = storm ? 0.9 : 0.3;
      m.suit = suit ? 0.8 : 0;
    }
    const k = paused || modalOpen() ? 0.45 : 1; for (const key of ['reactor', 'vent', 'motor', 'wind', 'suit', 'rover']) m[key] *= k;
    return m;
  }
  let ambT = 0, ambOn = false;
  function ambFrame(dt) { ambT += dt; if (ambT < 0.15) return; ambT = 0; ambOn = true; Sfx.setAmbient(ambMix()); }
  const ambStop = () => { if (ambOn) { ambOn = false; Sfx.setAmbient({}); } };
  const floorsDebug = { garagePanel, serviceStairs, onPlatform, ambMix, teleportPanel, elevatorPanel, floorOfRoom, roverLiftPanel, get ride() { return ride; } };
