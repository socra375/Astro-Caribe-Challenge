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
      if (e.broken) { mode = 'stairs'; const r = Station.stairs(S, World.floor, to); stairsT = r.s; dest = to; Sfx.play('step'); paint(); return; }
      const b = Station.board(S, 'crew', 'player'); if (!b.ok) return toast(tr(Station.WHY[b.why]), '', 'warn');
      const r = Station.call(S, 'crew', to); if (!r.ok) return toast(tr(Station.WHY[r.why]), '', 'warn');
      dest = to; mode = 'ride'; Sfx.play('door'); paint();
    };
    timer = setInterval(() => {
      if (!s.isConnected) return clearInterval(timer);
      if (mode === 'stairs') { stairsT -= 0.1 * (LS && LS.sp > 1 ? 1 : 1); if (stairsT <= 0) { clearInterval(timer); pop(); arriveFloor(dest, true); toast('🪜 ' + fname(dest), '', 'info'); return; } }
      if (mode === 'ride' && e.st === 'idle' && e.at === dest) { clearInterval(timer); Station.leave(S, 'crew', 'player'); pop(); arriveFloor(dest); Sfx.play('ok'); toast('🛗 ' + fname(dest), '', 'ok'); return; }
      paint();
    }, 100);
    paint();
  }

  /* ---------- Elevador del rover (plataforma exterior ↔ garaje) ---------- */
  /** ¿Puede moverse la plataforma? El rover tiene que estar bien colocado encima (o ya en el garaje). */
  const roverLiftOk = () => Station.roverStored(S) || Station.roverOnPlatform(S.ex.rover);
  function roverLiftCard() {
    const e = Station.ensure(S).elev.rover, st = Station.roverStored(S), es = LANG === 'es';
    return h('div', null, h('b', null, '🛗 ' + tr(Station.KINDS.rover.name)), h('div', { class: 'small' }, st ? lt('El rover está guardado en el garaje.', 'The rover is stored in the garage.') : roverLiftOk() ? lt('El rover está sobre la plataforma: listo para bajar.', 'The rover is on the platform: ready to go down.') : lt('Coloca el rover en el centro de la plataforma, alineado y parado.', 'Place the rover in the middle of the platform, aligned and stopped.')), h('div', { class: 'small' }, '👉 ' + lt('Pulsa E para abrir el panel.', 'Press E to open the panel.')));
  }
  function roverLiftPanel() {
    const st0 = Station.ensure(S), e = st0.elev.rover, es = LANG === 'es';
    let timer = 0, msg = null; const body = h('div');
    const s = push(panel('🛗 ' + tr(Station.KINDS.rover.name), body), { sticky: true, onclose: () => clearInterval(timer) });
    const paint = () => {
      body.innerHTML = '';
      const d = Station.door(S, 'rover'), lvl = Station.level(S, 'rover'), stored = Station.roverStored(S), idle = e.st === 'idle';
      const stN = { idle: lt('Puertas abiertas', 'Doors open'), closing: lt('Cerrando puertas…', 'Closing doors…'), moving: lt('En movimiento', 'Moving'), opening: lt('Abriendo puertas…', 'Opening doors…') }[e.st];
      body.append(...[h('div', { class: 'row', style: { gap: '12px', alignItems: 'center' } }, h('b', { style: { fontSize: '28px' }, 'data-rlvl': lvl > 0.5 ? 'G' : '0' }, lvl > 0.5 ? 'G' : '0'), h('div', null, h('div', null, stN + ' · ' + (lvl > 0.5 ? lt('garaje', 'garage') : lt('superficie', 'surface'))), h('div', { class: 'pbar' }, h('i', { style: { width: Math.round(d * 100) + '%' } })), h('div', { class: 'small muted' }, lt('Puertas', 'Doors') + ' ' + Math.round(d * 100) + ' %'))),
        h('p', { class: 'small' }, stored ? lt('El rover está guardado en el garaje, cargando.', 'The rover is stored in the garage, charging.') : roverLiftOk() ? '✔ ' + lt('El rover está bien colocado sobre la plataforma.', 'The rover is correctly placed on the platform.') : '⚠ ' + tr(Station.WHY.align)),
        e.broken ? h('p', { class: 'small tag warn' }, '⚠ ' + tr(Station.WHY.broken)) : null,
        msg ? h('p', { class: 'small tag warn', 'data-msg': 'warn' }, '⚠ ' + msg) : null,
        idle ? (stored ? btn('⬆ ' + lt('Subir el rover a la superficie', 'Bring the rover up'), () => go(0), 'primary', { 'data-act': 'rlift-up' }) : btn('⬇ ' + lt('Bajar el rover al garaje', 'Send the rover down'), () => go(2), 'primary', { 'data-act': 'rlift-down' })) : h('p', { class: 'small muted' }, lt('Espera a que la plataforma termine el trayecto.', 'Wait for the platform to finish the trip.'))].filter(Boolean));
    };
    const go = (to) => {
      const r = Station.call(S, 'rover', to, { roverOn: roverLiftOk() });
      if (!r.ok) { msg = tr(Station.WHY[r.why] || Station.WHY.rover); if (r.why === 'rover') msg = tr(Station.WHY.align); Sfx.play('bad'); return paint(); }
      msg = null; Sfx.play('door'); paint();
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
  const floorsDebug = { teleportPanel, elevatorPanel, floorOfRoom, roverLiftPanel };
