  /* =====================================================================
     VIAJE ESPACIAL: cabina y encendido en secuencia lógica → lanzamiento →
     crucero con navegación, soporte vital y Control Tierra → llegada.
     Reutiliza el lienzo, las fases y la narración de la llegada. Los valores
     son simulados; los errores explican y se pueden repetir, nunca derrotan.
     ===================================================================== */
  const TR = { who: 'commander', tk: null };
  const ROLE_N = { commander: ['Comandante', 'Commander'], engineer: ['Ingeniero', 'Engineer'], medic: ['Médica', 'Medic'], scientist: ['Científico', 'Scientist'], agri: ['Agrónomo', 'Agronomist'] };
  const tsay = (role, text) => { if (LS.sp <= 3) Voice.say(role, LANG, text, { level: 'info' }); };
  const ab = (label, act, fn, cls) => btn(label, fn, cls || '', { 'data-act': act });
  const SYSL = () => Trip.SYS.map((k) => tr(Trip.SYS_T[k]));
  const LED = { g: '#6fffa0', y: '#ffc857', r: '#ff6b6b' };

  /** Empieza el viaje: cabina → lanzamiento → crucero → llegada. */
  function startTrip(S) { S.trip = Trip.fresh(S); landGo(phCabin()); }
  /** Fin del viaje: las consecuencias pasan a la nave y a la tripulación y se enlaza con la llegada existente. */
  function endTrip() {
    const S = LS.S, t = S.trip; t.done = true; t.stage = 'done'; LS.trip = Trip.applyToLand(S); landGo(phArrive());
  }

  /* ---------- 1 · Cabina y encendido ---------- */
  function phCabin() {
    const S = LS.S, t = S.trip, es = LANG === 'es', adv = MODE === 'adv';
    let p0 = null, msg = null, stage = 'sys', chk = 0, chkT = 0, hint = null; const st = { on: t.on, who: TR.who, labels: SYSL(), pose: {} };
    const press = (k) => {
      const r = Trip.press(S, k);
      if (r.ok) { if (r.again) return; Sfx.play('ok'); Sfx.play('click'); st.flash = k; setTimeout(() => { st.flash = null; }, 500); msg = { ok: 1, t: tr(Trip.WHAT[k]) }; hint = null; st.pose[Trip.WHO[k]] = 'celebrate'; setTimeout(() => { st.pose[Trip.WHO[k]] = 'idle'; }, 900); tsay(Trip.WHO[k], tr(Trip.WHAT[k])); if (Trip.allOn(S)) { stage = 'check'; chk = 0; chkT = 0; } }
      else { Sfx.play('bad'); const names = r.miss.map((m) => tr(Trip.SYS_T[m])).join(', '); msg = { ok: 0, t: tr(Trip.T_NEED) + names + '.' + (adv ? '' : ' ' + (es ? 'Prueba con ' : 'Try ') + tr(Trip.SYS_T[Trip.SYS.find((q) => !t.on[q])]) + '.') }; hint = Trip.SYS.find((q) => !t.on[q]); tsay('engineer', msg.t); }
      render();
    };
    const render = () => {
      p0.innerHTML = '';
      p0.append(...[h('h3', { style: { margin: '0 0 4px' } }, '🚀 ' + lt('Preparación de la tripulación', 'Crew preparation')),
        h('p', { class: 'small muted' }, adv ? lt('Activa los sistemas en un orden lógico: cada uno depende de otro. Valores simulados.', 'Activate systems in a logical order: each depends on another. Simulated values.') : lt('Toca los interruptores en el orden correcto. Si te equivocas, te explico y lo intentas otra vez.', 'Tap the switches in the right order. If you slip, I will explain and you try again.')),
        h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '4px', margin: '4px 0' } }, Object.keys(ROLE_N).map((r) => ab((TR.who === r ? '✔ ' : '') + ROLE_N[r][es ? 0 : 1], 'who-' + r, () => { TR.who = r; st.who = r; render(); }, 'sm' + (TR.who === r ? ' primary' : '')))),
        h('p', { class: 'small muted' }, lt('Controlas a: ', 'You control: ') + ROLE_N[TR.who][es ? 0 : 1] + ' · ' + lt('el comandante siempre puede hacerlo todo.', 'the commander can always do everything.')),
        ...Trip.SYS.map((k, i) => h('div', { class: 'row', style: { gap: '8px', margin: '4px 0', alignItems: 'center' } }, ab((t.on[k] ? '🟢 ' : '⚪ ') + (i + 1) + ' · ' + tr(Trip.SYS_T[k]), 'sys-' + k, () => press(k), t.on[k] ? 'ok' : hint === k ? 'primary' : ''), adv ? h('span', { class: 'small muted' }, Trip.PRE[k].length ? lt('requiere: ', 'needs: ') + Trip.PRE[k].map((m) => tr(Trip.SYS_T[m])).join(', ') : lt('sin dependencias', 'no dependencies')) : null)),
        msg ? h('p', { class: 'small tag ' + (msg.ok ? 'ok' : 'warn'), 'data-msg': msg.ok ? 'ok' : 'warn' }, (msg.ok ? '✔ ' : '⚠ ') + msg.t) : null,
        stage !== 'sys' ? h('div', null, h('b', null, lt('Comprobación de seguridad', 'Safety check')), h('ul', { class: 'small', style: { margin: '4px 0', paddingLeft: '18px' } }, Trip.SAFETY_CHECK.map((q, i) => h('li', null, (chk > i ? '✔ ' : '… ') + tr(q)))),
          stage === 'ready' ? ab('⏱ ' + lt('Iniciar cuenta regresiva', 'Start countdown'), 'go', () => { t.safety = true; t.stage = 'launch'; landGo(phLaunch()); }, 'primary') : null) : null].filter(Boolean));
    };
    return {
      skippable: false, st,
      enter() { p0 = lpanel(); render(); tsay('commander', lt('Tripulación a sus puestos. Comenzamos la preparación de los sistemas.', 'Crew to your stations. Starting system preparation.')); },
      update(dt) { if (stage === 'check') { chkT += dt; const n = Math.min(Trip.SAFETY_CHECK.length, Math.floor(chkT / 0.9)); if (n !== chk) { chk = n; Sfx.play('click'); if (chk >= Trip.SAFETY_CHECK.length) { stage = 'ready'; Sfx.play('ok'); tsay('commander', lt('Comprobación de seguridad completa. Listos para el lanzamiento.', 'Safety check complete. Ready for launch.')); } render(); } } },
      draw(c, w, hh, tt) { const nr = innerWidth < 700, rw = nr ? w : w - Math.min(450 * dpr, w * 0.46), rh = nr ? hh * 0.44 : hh; c.fillStyle = '#0d1530'; c.fillRect(0, 0, w, hh); c.save(); c.beginPath(); c.rect(0, 0, rw, rh); c.clip(); TripArt.cabin(c, rw, rh, tt, st); c.restore(); landTitle(c, rw, hh, lt('Cabina de mando', 'Command cabin')); }
    };
  }

  /* ---------- 2 · Lanzamiento ---------- */
  function phLaunch() {
    const S = LS.S, DUR = 15, said = {}; let T = 0, lastN = 99;
    const say = (k, role, txt) => { if (!said[k]) { said[k] = 1; tsay(role, txt); } };
    return {
      skippable: true,
      enter() { Sfx.play('warn'); say('a', 'commander', lt('Cuenta regresiva iniciada.', 'Countdown started.')); },
      update(dt) {
        T += dt; const u = T / DUR, cd = Math.ceil(5 - T / 0.85);
        if (cd !== lastN && cd >= 1 && cd <= 5) { lastN = cd; Sfx.play('click'); }
        if (u > 0.29) { say('i', 'engineer', lt('Ignición. Motores al máximo.', 'Ignition. Engines at full thrust.')); if (Math.random() < 0.35) Sfx.play('thrust'); }
        if (u > 0.52) say('m', 'scientist', lt('Despegue confirmado. Subimos limpiamente.', 'Liftoff confirmed. Climbing cleanly.'));
        if (u > 0.78) say('s', 'medic', lt('Presión de cabina estable. Dejamos la atmósfera.', 'Cabin pressure stable. Leaving the atmosphere.'));
        if (T >= DUR) { S.trip.launched = true; S.trip.stage = 'cruise'; landGo(phCruise()); }
      },
      draw(c, w, hh, tt) {
        const u = Math.min(1, T / DUR); TripArt.launch(c, w, hh, tt, u, {});
        const cd = Math.ceil(5 - T / 0.85); c.lineJoin = 'round'; c.font = 'bold ' + Math.round(hh * 0.16) + 'px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 8;
        const label = cd >= 1 ? String(cd) : u < 0.4 ? '0' : ''; if (label) { c.strokeText(label, w * 0.5, hh * 0.3); c.fillText(label, w * 0.5, hh * 0.3); }
        landTitle(c, w, hh, u < 0.3 ? lt('Cuenta regresiva', 'Countdown') : lt('Lanzamiento', 'Launch'));
      }
    };
  }

  /* ---------- 3 · Crucero: navegación, comunicaciones y soporte vital ---------- */
  function phCruise() {
    const S = LS.S, t = S.trip, es = LANG === 'es', adv = MODE === 'adv', sc = S.scen, tgt0 = Trip.bearing(sc);
    const n = { h: (tgt0 + 40 + 360) % 360, hd: (tgt0 + 40) % 360, tgt: tgt0, tgtD: tgt0 };
    const g = { o2: 21, co2: 0.04, pr: 101.3, filt: 100, flow: [1, 1, 1] }, gt = { o2: 21, co2: 0.04, pr: 101.3, filt: 100, flow: [1, 1, 1] };
    const queue = ['align', 'comms', 'dev1', 'A', 'dev2', 'B', 'C', 'D'], ROT = adv ? 3 : 5;
    const low = (S.seed >>> 2) % 3, valveT = 35 + ((S.seed >>> 5) % 30);
    const X = { i: -1, k: null, wait: 0, msg: null, errRun: 0, devT: 0, sub: 0, valve: 50, gap: 2.2, p: null, g: null, c: null, said: {}, repT: 0, earthT: 0, log: [] };
    LS.tr = { n, g, X, queue };
    const lvlAll = () => { const l = [Trip.lvl.o2(g.o2), Trip.lvl.co2(g.co2), Trip.lvl.pr(g.pr), Trip.lvl.filt(g.filt)]; return l.includes('r') ? 'r' : l.includes('y') ? 'y' : 'g'; };
    const SH = { g: lt('Estable', 'Stable'), y: lt('Requiere atención', 'Needs attention'), r: lt('Crítico', 'Critical') };
    const gauges = () => {
      if (!X.g) return; X.g.innerHTML = '';
      const row = (lb, val, lv, fmt) => h('div', { class: 'row', style: { gap: '6px', alignItems: 'center', margin: '2px 0' } }, h('span', { style: { width: '96px', fontSize: '12px' } }, lb), h('div', { class: 'pbar', style: { flex: 1 } }, h('i', { style: { width: Math.round(clampN(val, 0, 1) * 100) + '%', background: LED[lv] } })), h('span', { class: 'small', style: { width: '64px', textAlign: 'right', color: LED[lv] } }, fmt));
      X.g.append(row('O₂', g.o2 / 21, Trip.lvl.o2(g.o2), g.o2.toFixed(1) + ' %'));
      if (adv) { X.g.append(row('CO₂', g.co2 / 1.4, Trip.lvl.co2(g.co2), g.co2.toFixed(2) + ' %'), row(lt('Presión', 'Pressure'), g.pr / 110, Trip.lvl.pr(g.pr), g.pr.toFixed(1) + ' kPa'), row(lt('Filtro', 'Filter'), g.filt / 100, Trip.lvl.filt(g.filt), Math.round(g.filt) + ' %')); }
      X.g.append(h('div', { class: 'row', style: { gap: '6px', margin: '4px 0' } }, h('b', { class: 'small' }, '🫁 ' + lt('Soporte vital', 'Life support') + ': '), h('b', { class: 'small', style: { color: LED[lvlAll()] } }, '● ' + SH[lvlAll()])), h('div', { class: 'small muted' }, lt('Valores simulados', 'Simulated values')));
    };
    const flowBars = (hl) => h('div', { style: { margin: '6px 0' } }, Trip.SECT.map((s, i) => h('div', { class: 'row', style: { gap: '6px', alignItems: 'center', margin: '2px 0' } }, h('span', { style: { width: '120px', fontSize: '12px' } }, tr(s)), h('div', { class: 'pbar', style: { flex: 1, position: 'relative' } }, h('i', { style: { width: Math.round(clampN(g.flow[i], 0, 1.2) / 1.2 * 100) + '%', background: Math.abs(g.flow[i] - 1) > 0.15 ? LED.y : LED.g } }), h('span', { style: { position: 'absolute', left: Math.round(1 / 1.2 * 100) + '%', top: '-2px', bottom: '-2px', width: '2px', background: '#fff' } })), hl === i ? h('span', { class: 'tag warn small' }, '⚠') : null)));
    const say = (k, role, txt) => { if (!X.said[k]) { X.said[k] = 1; tsay(role, txt); } };
    const note = (m, ok) => { X.msg = { ok, t: m }; paintCard(); };
    const err = (kind, m) => { Sfx.play('bad'); if (kind === 'ls') { t.ls.errs++; X.errRun++; } else { t.nav.errs++; } note(m, 0); if (kind === 'ls' && X.errRun >= 2) { t.ls.helped++; tsay('medic', lt('Te ayudo: fíjate en la señal resaltada.', 'Let me help: look at the highlighted signal.')); } };
    const next = () => { X.i++; X.msg = null; X.errRun = 0; X.gap = 2.2; X.k = null; paintCard(); };
    const beginTask = () => {
      const k = queue[X.i]; X.k = k; X.wait = 0; X.sub = 0; X.devT = 0;
      if (k === 'dev1' || k === 'dev2') { const d = Trip.devSize(k === 'dev1' ? 0 : 1, t.rep, adv); n.tgtD = (tgt0 + d + 360) % 360; t.nav.devs++; Sfx.play('warn'); tsay('scientist', lt('Alerta: detectamos una desviación de la trayectoria.', 'Alert: we detected a trajectory deviation.')); }
      if (k === 'A') { gt.flow[low] = 0.6; gt.o2 = 18.8; tsay('medic', lt('Aviso: la demanda de oxígeno ha subido.', 'Notice: oxygen demand has risen.')); Sfx.play('warn'); }
      if (k === 'B') { gt.co2 = 0.85; gt.filt = 12; tsay('medic', lt('Aviso: el filtro de CO₂ está saturado.', 'Notice: the CO₂ filter is saturated.')); Sfx.play('warn'); }
      if (k === 'C') { gt.flow[1] = 1 + (valveT - 50) / 60; tsay('engineer', lt('Una sección recibe un flujo distinto al previsto.', 'One section gets a different flow than planned.')); Sfx.play('warn'); X.valve = 50; }
      if (k === 'D') { gt.o2 = 21; gt.co2 = 0.04; gt.filt = 100; gt.pr = 101.3; gt.flow = [1, 1, 1]; Sfx.play('ok'); tsay('medic', lt('El soporte vital está estabilizado.', 'Life support is stabilized.')); }
      if (k === 'comms') { X.repT = 0; X.earthT = -1; tsay('commander', lt('Abriendo el canal con Control Tierra.', 'Opening the channel to Earth Control.')); Sfx.play('rcon'); }
      paintCard();
    };
    const navAdjust = (d) => { n.h = (n.h + d + 360) % 360; Sfx.play('click'); };
    const navConfirm = (kind) => {
      const d = Trip.angdiff(n.h, n.tgt), ok = Math.abs(d) <= Trip.NAV_TOL;
      if (ok) { Sfx.play('ok'); if (kind === 'align') { t.nav.aligned = true; tsay('scientist', lt('Orientación correcta. La nave apunta al destino.', 'Orientation correct. The ship points at the destination.')); } else { t.nav.fixed++; tsay('scientist', lt('Corrección confirmada. De nuevo en trayectoria.', 'Correction confirmed. Back on trajectory.')); } X.log.push({ k: queue[X.i], ok: 1 }); next(); }
      else err('nav', lt('Todavía no coincide: la punta de la nave debe señalar el triángulo verde. ', 'Not yet: the ship nose must point at the green triangle. ') + (d > 0 ? lt('Gira a la derecha ➡', 'Turn right ➡') : lt('Gira a la izquierda ⬅', 'Turn left ⬅')) + (adv ? ' (Δ ' + Math.round(Math.abs(d)) + '°)' : ''));
    };
    const navCard = (kind) => {
      const d = Trip.angdiff(n.h, n.tgt);
      return h('div', null,
        h('div', { class: 'small' }, kind === 'align' ? lt('Orientación: hacia dónde apunta la nave. Gírala hasta que la punta señale el triángulo verde (destino).', 'Orientation: where the ship points. Turn it until the nose points at the green triangle (destination).') : lt('Trayectoria: el recorrido que sigue. Una desviación la aleja del camino previsto; una corrección es un ajuste para volver a él.', 'Trajectory: the path it follows. A deviation pulls it off the planned path; a correction is an adjustment to return to it.')),
        h('div', { class: 'row', style: { gap: '6px', margin: '8px 0', justifyContent: 'center' } }, ab('⟲ ' + ROT + '°', 'rot-l', () => navAdjust(-ROT), 'lbtn2'), ab('⟳ ' + ROT + '°', 'rot-r', () => navAdjust(ROT), 'lbtn2'), ab('✔ ' + lt('Confirmar', 'Confirm'), 'nav-ok', () => navConfirm(kind), 'primary')),
        adv ? h('div', { class: 'small muted' }, lt('Rumbo ', 'Heading ') + Math.round(n.h) + '° · ' + lt('objetivo ', 'target ') + Math.round(n.tgt) + '° · Δ ' + Math.round(d) + '° · ' + lt('tolerancia ±', 'tolerance ±') + Trip.NAV_TOL + '° (' + lt('simulado', 'simulated') + ')') : h('div', { class: 'small muted' }, lt('Teclas ← → también giran la nave.', 'Arrow keys ← → also turn the ship.')));
    };
    const card = () => {
      const k = X.k, wrap = h('div');
      if (k == null) { wrap.append(h('p', { class: 'small muted' }, lt('Todo estable. Siguiente comprobación en unos instantes…', 'All stable. Next check in a moment…'))); return wrap; }
      const T0 = { align: lt('🧭 Navegación', '🧭 Navigation'), dev1: lt('🧭 Corrección de trayectoria', '🧭 Trajectory correction'), dev2: lt('🧭 Corrección de trayectoria', '🧭 Trajectory correction'), comms: '📡 Control Tierra', A: '🫁 ' + tr(Trip.LS_EV.A.t), B: '🫁 ' + tr(Trip.LS_EV.B.t), C: '🫁 ' + tr(Trip.LS_EV.C.t), D: '✅ ' + tr(Trip.LS_EV.D.t) }[k];
      wrap.append(h('b', null, T0));
      if (k === 'align' || k === 'dev1' || k === 'dev2') wrap.append(navCard(k));
      else if (k === 'comms') {
        const delay = sc === 'mars' ? lt('3 a 22 minutos (comprimido a unos segundos en el juego)', '3 to 22 minutes (compressed to a few seconds in the game)') : lt('≈ 1,3 s', '≈ 1.3 s');
        wrap.append(h('div', { class: 'small' }, lt('Enlace: ', 'Link: ') + '🟢 ' + lt('establecido', 'established') + ' · ' + lt('retraso ', 'delay ') + delay),
          X.earth ? h('p', { class: 'small tag info' }, '🌎 ' + X.earth) : h('p', { class: 'small muted' }, lt('Esperando respuesta de Tierra…', 'Waiting for Earth…')),
          !X.reported && !X.skipped ? h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, ab('📡 ' + lt('Reportar estado de la nave', 'Report ship status'), 'report', () => report(), 'primary'), ab(lt('Seguir sin reportar', 'Continue without reporting'), 'skip-report', () => { X.skipped = true; t.rep = false; tsay('commander', lt('Seguimos sin reportar por ahora.', 'We continue without reporting for now.')); next(); })) : null,
          X.reported && X.earthDone ? ab(lt('Continuar', 'Continue'), 'comms-ok', () => next(), 'primary') : null,
          h('div', { class: 'small muted' }, lt('Si reportas, Tierra puede ayudar a que las desviaciones sean más pequeñas.', 'If you report, Earth can help keep deviations smaller.')));
      } else if (k === 'A' || k === 'C' || k === 'B' || k === 'D') {
        const ev = Trip.LS_EV[k]; wrap.append(h('div', { class: 'small' }, tr(ev.d)), h('div', { class: 'small muted' }, '💡 ' + tr(ev.c)));
        if (k === 'A') wrap.append(flowBars(low), h('div', { class: 'small' }, lt('Elige la sección que recibe poco aire:', 'Choose the section getting too little air:')), h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, Trip.SECT.map((s, i) => ab((X.errRun >= 2 && i === low ? '👉 ' : '') + tr(s), 'sect-' + i, () => { if (i === low) { Sfx.play('ok'); gt.flow = [1, 1, 1]; gt.o2 = 21; X.log.push({ k: 'A', ok: 1 }); tsay('medic', lt('Distribución regulada: el oxígeno vuelve a repartirse parejo.', 'Distribution regulated: oxygen is shared evenly again.')); next(); } else err('ls', lt('Esa sección ya recibe el flujo previsto. Busca la barra amarilla.', 'That section already gets the planned flow. Look for the yellow bar.')); }, X.errRun >= 2 && i === low ? 'primary' : ''))));
        if (k === 'B') wrap.append(h('ol', { class: 'small', style: { paddingLeft: '18px' } }, Trip.FILTER_STEPS.map((s, i) => h('li', null, (X.sub > i ? '✔ ' : '') + tr(s)))), h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, Trip.FILTER_STEPS.map((s, i) => ab((i + 1) + ' · ' + tr(s), 'fstep-' + i, () => { if (i === X.sub) { Sfx.play('ok'); X.sub++; if (X.sub === 2) { gt.filt = 100; gt.co2 = 0.3; } if (X.sub >= 3) { gt.co2 = 0.04; X.log.push({ k: 'B', ok: 1 }); tsay('medic', lt('Filtro de reserva activo. El CO₂ baja.', 'Spare filter active. CO₂ is dropping.')); next(); } else paintCard(); } else err('ls', lt('Ese paso va en otro momento: primero aísla el filtro, luego cambia al de reserva y al final verifica.', 'That step comes at another time: first isolate the filter, then switch to the spare and finally check.')); }, i === X.sub && X.errRun >= 2 ? 'primary' : ''))));
        if (k === 'C') wrap.append(flowBars(1), h('div', { class: 'small' }, lt('Mueve la válvula hasta que la barra de «Zona de descanso» toque la marca blanca.', 'Move the valve until the “Rest area” bar touches the white mark.')), h('input', { type: 'range', min: 0, max: 100, value: X.valve, 'data-act': 'valve', 'aria-label': lt('Válvula', 'Valve'), style: { width: '100%' }, oninput: (e) => { X.valve = +e.target.value; gt.flow[1] = 1 + (valveT - X.valve) / 60; g.flow[1] = gt.flow[1]; paintFlow(); } }), ab('✔ ' + lt('Confirmar válvula', 'Confirm valve'), 'valve-ok', () => { const d = valveT - X.valve; if (Math.abs(d) <= 6) { Sfx.play('ok'); gt.flow[1] = 1; X.log.push({ k: 'C', ok: 1 }); tsay('engineer', lt('Válvula regulada. Flujo parejo.', 'Valve regulated. Even flow.')); next(); } else err('ls', lt('Todavía no iguala la marca. ', 'It does not match the mark yet. ') + (d > 0 ? lt('Mueve la válvula a la derecha.', 'Move the valve right.') : lt('Mueve la válvula a la izquierda.', 'Move the valve left.')) + (adv ? ' (Δ ' + d + ')' : '')); }, 'primary'));
        if (k === 'D') wrap.append(ab(lt('Continuar', 'Continue'), 'ls-ok', () => finishCruise(), 'primary'));
      }
      if (X.msg) wrap.append(h('p', { class: 'small tag ' + (X.msg.ok ? 'ok' : 'warn'), 'data-msg': X.msg.ok ? 'ok' : 'warn' }, (X.msg.ok ? '✔ ' : '⚠ ') + X.msg.t));
      return wrap;
    };
    const paintCard = () => { if (!X.c) return; X.c.innerHTML = ''; X.c.append(card()); };
    const paintFlow = () => { paintCard(); };
    const report = () => {
      X.reported = true; t.rep = true; Sfx.play('rtx'); tsay('commander', lt('Control Tierra, aquí la nave. Sistemas nominales, trayectoria en curso.', 'Earth Control, this is the ship. Systems nominal, trajectory under way.')); X.earthT = 0; paintCard();
    };
    const finishCruise = () => {
      const q = Trip.navQuality(t), l = Trip.lsQuality(t), qn = { good: lt('buena', 'good'), ok: lt('aceptable', 'acceptable'), poor: lt('con margen justo', 'with a thin margin') };
      lsay(lt('Comienza la maniobra de llegada.', 'Arrival maneuver begins.'));
      landUi.innerHTML = '';
      lcard('lcen', h('b', null, '🛰️ ' + lt('Resumen del viaje', 'Trip summary')), h('table', null, h('tbody', null, [[lt('Navegación', 'Navigation'), qn[q]], [lt('Soporte vital', 'Life support'), qn[l]], [lt('Comunicación con Tierra', 'Earth communication'), t.rep ? lt('reportada', 'reported') : lt('sin reporte', 'not reported')]].concat(adv ? [[lt('Correcciones', 'Corrections'), t.nav.fixed + '/' + t.nav.devs], [lt('Errores (nav / soporte)', 'Errors (nav / life)'), t.nav.errs + ' / ' + t.ls.errs]] : []).map((r) => h('tr', null, h('th', null, r[0]), h('td', null, r[1]))))),
        h('p', { class: 'small muted' }, lt('Un viaje con margen justo gasta combustible extra; el soporte vital afecta al ánimo de la tripulación. Nada de esto bloquea la misión.', 'A thin-margin trip burns extra fuel; life support affects crew morale. None of this blocks the mission.')),
        ab('🌕 ' + lt('Comenzar la maniobra de llegada', 'Begin the arrival maneuver'), 'arrive', () => endTrip(), 'primary'));
    };
    return {
      skippable: false,
      key(e) { if (X.k === 'align' || X.k === 'dev1' || X.k === 'dev2') { if (e.key === 'ArrowLeft') { navAdjust(-ROT); e.preventDefault(); } else if (e.key === 'ArrowRight') { navAdjust(ROT); e.preventDefault(); } } },
      enter() { const p = lpanel(h('h3', { style: { margin: '0 0 4px' } }, '🛰️ ' + lt('Viaje al destino', 'Trip to the destination')), h('div', { class: 'small muted' }, lt('Valores simulados: no son cálculos orbitales reales.', 'Simulated values: not real orbital calculations.')), (X.g = h('div', { style: { margin: '6px 0' } })), (X.c = h('div'))); gauges(); next(); LS.t = 0; tsay('commander', lt('En ruta. Atentos a las comprobaciones.', 'On our way. Watch for the checks.')); },
      update(dt) {
        for (const k of ['o2', 'co2', 'pr', 'filt']) g[k] += (gt[k] - g[k]) * Math.min(1, dt * (k === 'o2' || k === 'co2' ? 0.8 : 1.6));
        for (let i = 0; i < 3; i++) g.flow[i] += (gt.flow[i] - g.flow[i]) * Math.min(1, dt * 1.6);
        n.hd += Trip.angdiff(n.hd, n.h) * Math.min(1, dt * 8); n.tgt += Trip.angdiff(n.tgt, n.tgtD) * Math.min(1, dt * 0.9);
        X.gt = (X.gt || 0) + dt; if (X.gt > 0.2) { X.gt = 0; gauges(); }
        if (X.k == null && X.i < queue.length) { X.gap -= dt; if (X.gap <= 0) beginTask(); }
        if (X.k === 'comms' && X.earthT >= 0 && !X.earthDone) { X.earthT += dt; const dl = sc === 'mars' ? 6 : 1.3; if (X.earthT > dl && !X.earth2) { X.earth2 = 1; X.earth = lt('Control Tierra: recibido. Trayectoria confirmada; si hay desviación, corrijan y reporten.', 'Earth Control: copy. Trajectory confirmed; if there is a deviation, correct and report.'); X.earthDone = true; Sfx.play('rrx'); tsay('earth', X.earth); paintCard(); } }
        if (X.k === 'comms' && X.earthT < 0 && !X.earth && X.wait >= 0) { X.wait += dt; if (X.wait > (sc === 'mars' ? 3 : 1.5)) { X.earth = lt('Control Tierra: recibimos su señal. Recomendamos verificar orientación y reportar el estado de la nave.', 'Earth Control: we receive your signal. We recommend verifying orientation and reporting ship status.'); Sfx.play('rrx'); tsay('earth', X.earth); paintCard(); } }
        if ((X.k === 'dev1' || X.k === 'dev2')) { X.devT += dt; if (X.devT > 40) { t.nav.auto++; n.h = n.tgt; X.log.push({ k: X.k, auto: 1 }); tsay('scientist', lt('El piloto automático corrigió la desviación, con gasto extra.', 'The autopilot corrected the deviation, at extra cost.')); next(); } }
        if (X.k === 'A' || X.k === 'B' || X.k === 'C') { /* los eventos esperan al jugador: no hay derrota por tiempo */ }
      },
      draw(c, w, hh, tt) {
        TripArt.space(c, w, hh, tt, Math.max(0, X.i) / queue.length, sc);
        const nr = innerWidth < 700, R = nr ? Math.min(hh * 0.19, w * 0.32) : Math.min(hh * 0.3, w * 0.2), cx = nr ? w / 2 : w * 0.3, cy = nr ? hh * 0.27 : hh * 0.52;
        TripArt.compass(c, cx, cy, R, tt, n.hd, n.tgt, Trip.NAV_TOL, 1);
        c.fillStyle = '#cfe9ff'; c.font = Math.round(Math.max(11, R * 0.13)) + 'px system-ui'; c.textAlign = 'center'; c.fillText(lt('Navegación · valores simulados', 'Navigation · simulated values'), cx, cy - R - R * 0.1);
        landTitle(c, w, hh, lt('Viaje', 'Trip'));
      }
    };
  }
