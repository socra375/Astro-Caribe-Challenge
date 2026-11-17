  /* =====================================================================
     VIAJE ESPACIAL: cabina y encendido en secuencia lógica → lanzamiento →
     crucero por el espacio (animación) → llegada.
     Reutiliza el lienzo, las fases y la narración de la llegada. Los valores
     son simulados; los errores explican y se pueden repetir, nunca derrotan.
     ===================================================================== */
  const TR = { who: 'commander', tk: null };
  const ROLE_N = { commander: ['Comandante', 'Commander'], engineer: ['Ingeniero', 'Engineer'], medic: ['Médica', 'Medic'], scientist: ['Científico', 'Scientist'], agri: ['Agrónomo', 'Agronomist'] };
  const tsay = (role, text) => { if (LS.sp <= 3) Voice.say(role, LANG, text, { level: 'info' }); };
  const ab = (label, act, fn, cls) => btn(label, fn, cls || '', { 'data-act': act });
  const SYSL = () => Trip.SYS.map((k) => tr(Trip.SYS_T[k]));

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

  /* ---------- 3 · Crucero: la nave viaja por el espacio (animación, sin minijuegos) ---------- */
  function phCruise() {
    const S = LS.S, sc = S.scen, DUR = 26, said = {}, mars = sc === 'mars'; let T = 0, seen = [], note = null;
    const say = (k, role, txt) => { if (!said[k]) { said[k] = 1; tsay(role, txt); if (note) note.textContent = txt; } };
    LS.tr = { u: 0, seen: [] }; // lo que se ve (también para las pruebas)
    return {
      skippable: true,
      enter() {
        const p = lpanel(h('b', null, '🛰️ ' + lt('Viaje al destino', 'Trip to the destination')), (note = h('div', { class: 'small', 'data-voyage': '1', 'aria-live': 'polite' }, lt('Motores en crucero. Disfruta del viaje.', 'Engines at cruise. Enjoy the trip.'))), h('div', { class: 'small muted' }, lt('Distancias orientativas y escala no real.', 'Approximate distances, not to scale.')));
        p.classList.add('voy'); Sfx.play('thrust');
        tsay('commander', lt('Dejamos la órbita. Motores en crucero.', 'We leave orbit. Engines at cruise.'));
      },
      update(dt) {
        T += dt; const u = Math.min(1, T / DUR); LS.tr.u = u;
        if (u > 0.12) say('e', 'commander', lt('Detrás de nosotros queda la Tierra, cada vez más pequeña.', 'Behind us the Earth gets smaller and smaller.'));
        if (u > 0.3) say('s', 'scientist', lt('A la izquierda brilla el Sol: su luz y su calor mantienen vivos a todos los planetas.', 'On the left shines the Sun: its light and heat feed every planet.'));
        if (u > 0.5) say('v', 'scientist', mars ? lt('Pasamos cerca de Venus; al fondo se ve Júpiter, el planeta más grande.', 'We pass near Venus; far away you can see Jupiter, the biggest planet.') : lt('A lo lejos se ven Venus, Júpiter y un puntito rojo: Marte.', 'Far away you can see Venus, Jupiter and a small red dot: Mars.'));
        if (u > 0.72) say('d', 'commander', mars ? lt('Marte a la vista: crece delante de nosotros.', 'Mars in sight: it grows ahead of us.') : lt('La Luna a la vista: crece delante de nosotros.', 'The Moon in sight: it grows ahead of us.'));
        if (u > 0.9) say('a', 'engineer', lt('Preparando la maniobra de llegada.', 'Preparing the arrival maneuver.'));
        if (T >= DUR) endTrip();
      },
      draw(c, w, hh) {
        const u = Math.min(1, T / DUR); seen = TripArt.voyage(c, w, hh, T, u, sc); TripArt.voyageHud(c, w, hh, u, sc, seen);
        LS.tr.seen = seen.map((b) => b.k); landTitle(c, w, hh, lt('Viaje', 'Trip'));
      }
    };
  }
