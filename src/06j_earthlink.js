  /* =====================================================================
     EARTHLINK RADIO — interfaz del radio portátil del comandante: Tierra,
     canales, opciones de respuesta, historial, subtítulos sincronizados
     con la voz, estado del enlace y avisos. El motor es EL (03d); aquí
     solo se dibuja, se suena y se conecta con el resto del juego.
     ===================================================================== */
  const ELK = { open: false, sub: null, raf: 0, hudT: 0, pulse: 0, cap: false, last: '' };
  let erEl = null, erCv = null, erPx = null, erRefs = {}, erLang = '';
  const ELSTN = { stable: ['Conexión estable', 'Stable link'], weak: ['Señal débil', 'Weak signal'], interf: ['Interferencia', 'Interference'], none: ['Sin conexión', 'No connection'], pending: ['Transmisión pendiente', 'Transmission pending'], received: ['Mensaje recibido', 'Message received'] };
  const ELCOL = { stable: '#6fffa0', weak: '#ffc24a', interf: '#ff9a4f', none: '#ff5a5a', pending: '#7fd3ff', received: '#6fffa0' };
  const ELWHY = { antenna: ['fallo de antena', 'antenna failure'], damage: ['equipos exteriores dañados', 'damaged exterior equipment'], power: ['poca energía', 'low power'], storm: ['tormenta solar', 'solar storm'], dust: ['tormenta de polvo', 'dust storm'], distance: ['estás lejos de la base', 'you are far from the base'] };
  const ELRESERVED = 'efglmnopvzcwasdqEFGLMNOPVZCWASDQ+-=_1234567890 '; // teclas que el juego ya usa
  const elClk = (t) => 'D' + (Math.floor(t / 24) + 1) + ' ' + String(Math.floor(t % 24)).padStart(2, '0') + ':' + String(Math.floor((t * 60) % 60)).padStart(2, '0');
  const elName = (who) => (who === 'earth' ? XT('Tierra', 'Earth') : who === 'system' ? XT('Sistema', 'System') : tr(ROLEN[who === 'agri' ? 'agronomist' : who] || ROLEN.narrator));

  function elBuild() {
    const es = LANG === 'es';
    erCv = h('canvas', { width: 340, height: 240, class: 'er-earth', 'aria-label': XT('Tierra y enlace de radio', 'Earth and radio link'), role: 'img' });
    erPx = erCv.getContext('2d');
    erRefs = {};
    const R = (k, e) => (erRefs[k] = e);
    erEl = h('div', { id: 'er', class: 'er hidden', role: 'dialog', 'aria-label': 'EarthLink Radio' },
      h('div', { class: 'er-dev' },
        h('div', { class: 'er-ant' }),
        h('div', { class: 'er-head' },
          R('led', h('span', { class: 'er-led' })), h('b', { class: 'er-brand' }, 'EARTHLINK'), R('freq', h('span', { class: 'er-freq' })), R('bars', h('span', { class: 'er-bars', 'aria-label': XT('Señal', 'Signal') }, [0, 1, 2, 3, 4].map((i) => h('i', { style: { height: 5 + i * 3 + 'px' } })))),
          btn('✕', () => elToggle(false), 'sm ghost er-close', { 'aria-label': XT('Cerrar radio', 'Close radio'), title: XT('Cerrar', 'Close') })),
        h('div', { class: 'er-top' }, erCv,
          h('div', { class: 'er-info' }, R('centro', h('div', { class: 'er-center' })), R('state', h('div', { class: 'er-state' })), R('dist', h('div', { class: 'er-row' })), R('real', h('div', { class: 'er-row' })), R('game', h('div', { class: 'er-row' })), R('chan', h('div', { class: 'er-row' })), R('pend', h('div', { class: 'er-row' })))),
        R('chs', h('div', { class: 'er-chs', role: 'tablist', 'aria-label': XT('Canales', 'Channels') })),
        h('div', { class: 'er-sub' }, R('subWho', h('b', { class: 'er-who' })), R('subTx', h('span', { class: 'er-txled' })), R('subTxt', h('div', { class: 'er-subtxt', 'aria-live': 'polite' })), btn(XT('Repetir', 'Repeat'), () => elReplayLast(), 'sm', { title: XT('Repetir el último mensaje', 'Repeat the last message') })),
        h('div', { class: 'er-mid' },
          R('props', h('div', { class: 'er-props' })),
          R('desc', h('div', { class: 'er-desc small muted' })),
          R('opts', h('div', { class: 'er-opts' })),
          h('div', { class: 'er-hh' }, h('b', null, XT('Historial', 'History')), R('histN', h('span', { class: 'small muted' }))),
          R('hist', h('div', { class: 'er-hist', 'aria-live': 'off' }))),
        h('div', { class: 'er-foot' },
          h('div', { class: 'er-scale', role: 'group', 'aria-label': XT('Escala del retraso del juego', 'Game delay scale') }, h('span', { class: 'small muted' }, XT('Retraso del juego', 'Game delay')), R('scale', h('span', { class: 'er-scbtns' }))),
          h('label', { class: 'er-vol' }, h('span', { class: 'small muted' }, XT('Volumen de radio', 'Radio volume')), R('vol', h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: Voice.cfg.vRadio, 'aria-label': XT('Volumen de la radio', 'Radio volume'), oninput: (e) => { Voice.cfg.vRadio = +e.target.value; Sfx.setRadioVol(Voice.cfg.vRadio); Voice.persist(); } }))),
          h('div', { class: 'row' }, R('key', btn('', () => elCaptureKey(), 'sm')), btn(XT('Registro clásico', 'Classic log'), () => { elToggle(false); openConsole({ id: 'comms' }); }, 'sm')))));
    $('#app').append(erEl);
  }
  const keyLabel = () => String(settings.radioKey || 'r').toUpperCase();
  function elCaptureKey() {
    ELK.cap = true; erRefs.key.textContent = XT('Pulsa una tecla…', 'Press a key…');
    const on = (e) => { e.preventDefault(); e.stopPropagation(); window.removeEventListener('keydown', on, true); ELK.cap = false;
      const k = e.key;
      if (k === 'Escape') { elRender(); return; }
      if (k.length !== 1 || ELRESERVED.includes(k)) { toast(XT('Esa tecla ya se usa en el juego', 'That key is already used by the game'), XT('Elige otra letra libre (por ejemplo R, T, B, H o K).', 'Pick another free letter (for example R, T, B, H or K).'), 'warn'); elRender(); return; }
      settings.radioKey = k.toLowerCase(); applySettings(); toast(XT('Tecla de la radio: ', 'Radio key: ') + k.toUpperCase(), '', 'ok'); elRender(); };
    window.addEventListener('keydown', on, true);
  }
  function elToggle(on) {
    if (!running || !S) return;
    on = on == null ? !ELK.open : !!on;
    if (erEl && erLang !== LANG) { erEl.remove(); erEl = null; ELK.open = false; }
    if (!erEl) { elBuild(); erLang = LANG; }
    if (on === ELK.open) return;
    ELK.open = on; erEl.classList.toggle('hidden', !on); $('#app').classList.toggle('er-on', on);
    if (on) { erEl.classList.remove('er-in'); void erEl.offsetWidth; erEl.classList.add('er-in'); Sfx.play('rcon'); EL.ensure(S); elRender(); elLoop(); const u = S.el.unread[S.el.ch]; if (u) setTimeout(() => elPlayLatest(), 700); }
    else { Sfx.play('rend'); Voice.stop(); ELK.sub = null; cancelAnimationFrame(ELK.raf); }
    elHudBadge();
  }
  function elLoop() { cancelAnimationFrame(ELK.raf); const f = (now) => { if (!ELK.open) return; elDraw(now / 1000); ELK.raf = requestAnimationFrame(f); }; ELK.raf = requestAnimationFrame(f); }

  /* ---------- Tierra y enlace ---------- */
  function elDraw(t) {
    const c = erPx, w = 340, hh = 240, st = EL.status(S), L = st.link, rm = document.documentElement.classList.contains('rm'), col = ELCOL[st.main];
    c.clearRect(0, 0, w, hh); c.fillStyle = '#050a1c'; c.fillRect(0, 0, w, hh);
    for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.2 + ((i * 37) % 7) / 14) + ')'; c.fillRect((i * 97) % w, (i * 53) % hh, 1.5, 1.5); }
    const ex = 84, ey = 120, er = 66, bx = 296, by = 168;
    // ondas de comunicación (dibujan el estado real: color, ruido y paquetes en tránsito)
    c.save(); c.lineWidth = 3; c.strokeStyle = col;
    for (let k = 0; k < 4; k++) { const r = er + 8 + (((rm ? k * 26 : t * 38 + k * 26)) % 104), a = (1 - (r - er) / 112) * (st.main === 'none' ? 0.18 : st.main === 'weak' ? 0.4 : 0.75); c.globalAlpha = Math.max(0, a); if (st.main === 'none') c.setLineDash([5, 9]); else c.setLineDash([]); c.beginPath(); c.arc(ex, ey, r, -0.55, 0.55); c.stroke(); }
    c.setLineDash([]); c.globalAlpha = 1; c.restore();
    if (st.main === 'interf' || (L.st === 'interf')) { c.strokeStyle = 'rgba(255,170,90,.7)'; c.lineWidth = 1.5; for (let i = 0; i < 14; i++) { const x = 150 + ((i * 53 + (rm ? 0 : t * 220)) % 130), y = 90 + ((i * 29) % 70); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 6 + ((i * 7) % 12)); c.stroke(); } }
    // línea de enlace y paquetes
    c.strokeStyle = 'rgba(127,211,255,.25)'; c.lineWidth = 1; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(ex + er * 0.8, ey + 8); c.lineTo(bx, by); c.stroke(); c.setLineDash([]);
    const lerp = (a, b, u) => a + (b - a) * u, px = (u) => [lerp(ex + er * 0.8, bx, u), lerp(ey + 8, by, u)];
    for (const m of S.el.out) {
      let u = null, dir = 1;
      if (m.st === 'transit') u = clampN((S.t - m.sentT) / Math.max(0.01, m.arriveT - m.sentT), 0, 1);
      else if (m.st === 'earth') { u = 1 - clampN((S.t - (m.replyT - EL.legDelay(S, L))) / Math.max(0.01, EL.legDelay(S, L)), 0, 1); dir = -1; }
      if (u == null) { continue; }
      const p = px(m.st === 'transit' ? u : u); c.fillStyle = m.st === 'earth' ? '#6fffa0' : '#7fd3ff'; c.beginPath(); c.arc(p[0], p[1], 4.5, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
    }
    // la Tierra
    c.save(); c.beginPath(); c.arc(ex, ey, er, 0, 7); c.clip();
    let g = c.createRadialGradient(ex - 22, ey - 22, 8, ex, ey, er); g.addColorStop(0, '#3a8cff'); g.addColorStop(0.7, '#1c5fb8'); g.addColorStop(1, '#0b2a66'); c.fillStyle = g; c.fillRect(ex - er, ey - er, er * 2, er * 2);
    const sh = rm ? 0 : (t * 5) % 160; c.fillStyle = '#3ddc84';
    for (const o of [[-26, -18, 26, 16, 0.5], [18, -4, 20, 24, -0.4], [-8, 30, 22, 12, 0.2], [-44, 18, 12, 14, 0], [34, 34, 14, 8, 0.5], [2, -40, 14, 8, 0.1]]) for (const off of [0, -160, 160]) { c.beginPath(); c.ellipse(ex + o[0] + off + sh * (off === 0 ? 1 : 1) - 0, ey + o[1], o[2], o[3], o[4], 0, 7); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.55)'; for (const o of [[-20, -30, 28, 5], [24, 14, 24, 4], [-30, 24, 22, 4]]) { c.beginPath(); c.ellipse(ex + o[0] + (rm ? 0 : Math.sin(t * 0.3 + o[0]) * 4), ey + o[1], o[2], o[3], 0.2, 0, 7); c.fill(); }
    g = c.createRadialGradient(ex + 30, ey - 6, er * 0.5, ex + 30, ey - 6, er * 1.4); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.62)'); c.fillStyle = g; c.fillRect(ex - er, ey - er, er * 2, er * 2); c.restore();
    c.strokeStyle = 'rgba(127,211,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(ex, ey, er + 1, 0, 7); c.stroke();
    // la base (cúpula con antena que parpadea según el estado)
    c.fillStyle = '#9aa3bd'; c.beginPath(); c.arc(bx, by + 8, 18, Math.PI, 0); c.fill(); c.fillStyle = '#4f6db8'; c.fillRect(bx - 18, by + 7, 36, 5);
    c.strokeStyle = '#e6ebf5'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + 4, by - 8); c.lineTo(bx + 4, by - 26); c.stroke(); c.fillStyle = (rm || Math.sin(t * 6) > 0) ? col : '#2b3550'; c.beginPath(); c.arc(bx + 4, by - 28, 3.5, 0, 7); c.fill();
    c.fillStyle = '#e8f6ff'; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.fillText(XT('Base', 'Base'), bx, by + 36); c.fillText(XT('Tierra', 'Earth'), ex, ey + er + 22);
    if (st.main === 'none') { c.strokeStyle = '#ff5a5a'; c.lineWidth = 5; c.beginPath(); c.moveTo(bx - 70, by - 50); c.lineTo(bx - 40, by - 20); c.moveTo(bx - 40, by - 50); c.lineTo(bx - 70, by - 20); c.stroke(); }
  }

  /* ---------- Contenido ---------- */
  function elRender() {
    if (!erEl || !S) return;
    const E = EL.ensure(S), st = EL.status(S), L = st.link, d = EL.delays(S, 0.4 * Math.max(0.001, speed || 1)), es = LANG === 'es', adv = MODE === 'adv';
    const rf = erRefs, ch = EL.CH.find((c) => c.id === E.ch) || EL.CH[0];
    rf.led.style.background = ELCOL[st.main]; rf.led.style.boxShadow = '0 0 8px ' + ELCOL[st.main];
    rf.freq.textContent = (S.scen === 'moon' ? 'UHF 401,5' : 'UHF 437,1') + ' MHz · ' + xt(ch.n);
    [...rf.bars.children].forEach((b, i) => b.classList.toggle('on', L.q > i * 0.2 + 0.06));
    rf.centro.textContent = xt(EL.DESK[ch.id]);
    rf.state.textContent = XT(ELSTN[st.main][0], ELSTN[st.main][1]) + (L.why.length && (st.main === 'weak' || st.main === 'interf' || st.main === 'none') ? ' · ' + XT(ELWHY[L.why[0]][0], ELWHY[L.why[0]][1]) : ''); rf.state.style.color = ELCOL[st.main]; rf.state.style.borderColor = ELCOL[st.main];
    rf.dist.textContent = XT('Distancia: ', 'Distance: ') + (S.scen === 'moon' ? '384 400 km' : fmt(d.dist / 1e6, 0) + XT(' millones de km (hoy)', ' million km (today)'));
    rf.real.textContent = XT('Retardo real (ida): ', 'Real delay (one way): ') + (S.scen === 'moon' ? '≈ ' + fmt(d.realSec, 1) + ' s' : '≈ ' + fmt(S.lightMin, 1) + ' min');
    rf.game.textContent = XT('Retardo comprimido del juego: ', 'Compressed game delay: ') + fmt(d.gameH, 1) + ' h' + (speed > 0 ? ' (≈ ' + fmt(d.gameRealSec, d.gameRealSec < 10 ? 1 : 0) + ' s)' : '');
    rf.chan.textContent = XT('Canal activo: ', 'Active channel: ') + xt(ch.n) + (adv ? ' · ' + XT('transmite ', 'transmits ') + elName(EL.speaker(EL.options(S, ch.id)[0] ? EL.options(S, ch.id)[0].id : 'status')) : '');
    rf.pend.textContent = XT('Pendientes: ', 'Pending: ') + E.out.length + XT(' enviados · ', ' sent · ') + EL.totalUnread(S) + XT(' sin leer', ' unread') + (E.orders.length ? ' · ' + E.orders.length + XT(' orden', ' order') : '');
    // canales
    rf.chs.replaceChildren(...EL.CH.map((c) => h('button', { class: 'er-ch' + (c.id === E.ch ? ' on' : ''), role: 'tab', 'aria-selected': c.id === E.ch ? 'true' : 'false', title: xt(c.d), onclick: () => { Sfx.play('click'); E.ch = c.id; EL.markRead(S, c.id); elRender(); } }, h('span', { class: 'er-ic' }, c.icon), h('span', null, xt(c.n)), E.unread[c.id] ? h('i', { class: 'er-badge' }, E.unread[c.id]) : null)));
    rf.desc.textContent = xt(ch.d) + ' ' + XT('Participan: ', 'Participants: ') + elName(ch.who) + ' + ' + XT('Tierra', 'Earth') + '.';
    // propuestas de los especialistas
    rf.props.replaceChildren(...E.prop.map((p) => h('div', { class: 'er-prop' }, h('span', null, elName(p.who) + XT(' propone consultar a Tierra: ', ' suggests asking Earth: ') + xt(EL.INT[p.intent].n) + (p.why ? ' (' + xt(p.why) + ')' : '')), h('span', { class: 'row' }, btn(XT('Autorizar', 'Authorize'), () => { const r = EL.accept(S, p.id); if (r.ok) elAfterSend(r.msg); elRender(); }, 'sm primary'), btn(XT('Descartar', 'Dismiss'), () => { EL.dismiss(S, p.id); elRender(); }, 'sm')))));
    // opciones de respuesta
    const opts = EL.options(S, E.ch);
    rf.opts.replaceChildren(...opts.map((o) => h('button', { class: 'btn er-opt' + (o.ok ? '' : ' off'), disabled: o.ok ? null : true, title: o.ok ? '' : xt(o.why), onclick: () => elSend(o.id) }, h('b', null, MODE === 'junior' ? xt(o.j) : xt(o.n)), o.ok ? null : h('span', { class: 'small muted' }, xt(o.why)))));
    // historial del canal
    const H = E.hist.filter((x) => x.ch === E.ch || (x.who === 'system' && E.ch === 'control')).slice(-30);
    rf.histN.textContent = H.length + '/' + E.hist.length;
    rf.hist.replaceChildren(...H.slice().reverse().map((x) => h('div', { class: 'er-msg ' + x.dir }, h('div', { class: 'er-mh' }, h('b', null, (x.dir === 'out' ? 'TX · ' : x.dir === 'in' ? 'RX · ' : '') + (x.who === 'earth' ? xt(x.desk || EL.DESK[x.ch]) : elName(x.who))), h('span', { class: 'small muted' }, elClk(x.t) + (x.dir === 'out' ? ' · ' + ({ queued: XT('en cola', 'queued'), transit: XT('en tránsito', 'in transit'), earth: XT('Tierra responde', 'Earth is replying'), delivered: XT('respondido', 'answered') }[x.st] || '') : '')),
      x.dir !== 'sys' ? btn('▶', () => elSpeakEntry(x), 'sm ghost', { 'aria-label': XT('Escuchar', 'Listen'), title: XT('Escuchar', 'Listen') }) : null), h('div', { class: 'er-mt' }, xt(x.text)))));
    rf.scale.replaceChildren(...EL.SCALES.map((k) => h('button', { class: 'btn sm' + (E.scale === k ? ' primary' : ''), 'aria-pressed': E.scale === k ? 'true' : 'false', onclick: () => { EL.setScale(S, k); elRender(); } }, '×' + String(k).replace('.', ','))));
    rf.key.textContent = XT('Tecla: ', 'Key: ') + keyLabel() + ' · ' + XT('cambiar', 'change');
    const sb = ELK.sub; rf.subWho.textContent = sb ? elName(sb.who) : XT('En espera', 'Standby'); rf.subTx.className = 'er-txled' + (sb && !sb.done ? ' on' : ''); rf.subTxt.textContent = sb ? sb.text.slice(0, sb.shown) : XT('Elige una opción para transmitir.', 'Pick an option to transmit.');
  }
  /** Subtítulo sincronizado con el audio: sigue los límites de palabra del TTS; sin TTS avanza por tiempo. */
  function elSpeak(who, text, done) {
    const prof = Voice.profileFor(who === 'earth' ? 'earth' : who, LANG);
    const sb = { who, text, shown: 0, done: false, t: 0 };
    const word = (i) => { const m = /\s/.exec(text.slice(i)); return m ? i + m.index + 1 : text.length; };
    let tm = 0;
    const o = { level: 'info', silent: true, chan: 'radio',
      onstart: () => { ELK.sub = sb; sb.shown = 0; sb.done = false; Sfx.play(who === 'earth' ? 'rrx' : 'rtx'); const wps = Math.max(0.8, (Voice.profiles[prof].rate * Voice.cfg.rate) * 2.6); clearInterval(tm); tm = setInterval(() => { if (sb.done) return clearInterval(tm); sb.shown = Math.min(text.length, word(sb.shown)); elSubPaint(); if (sb.shown >= text.length) clearInterval(tm); }, 1000 / wps); elSubPaint(); },
      onboundary: (ci) => { sb.shown = Math.max(sb.shown, Math.min(text.length, word(ci))); elSubPaint(); },
      onend: () => { sb.done = true; sb.shown = text.length; clearInterval(tm); elSubPaint(); Sfx.play('rend'); if (done) done(); } };
    if (!Voice.speak(prof, text, o)) { sb.shown = text.length; sb.done = true; ELK.sub = sb; elSubPaint(); if (done) done(); }
  }
  function elSubPaint() { if (!ELK.open || !erRefs.subTxt) return; const sb = ELK.sub; if (!sb) return; erRefs.subWho.textContent = elName(sb.who); erRefs.subTxt.textContent = sb.text.slice(0, sb.shown); erRefs.subTx.className = 'er-txled' + (sb.done ? '' : ' on'); }
  const elSpeakEntry = (x) => { Voice.stop(); elSpeak(x.dir === 'in' ? 'earth' : x.who, xt(x.text)); };
  function elReplayLast() { const E = S.el, H = E.hist.filter((x) => x.ch === E.ch && x.dir !== 'sys'); if (H.length) elSpeakEntry(H[H.length - 1]); }
  function elPlayLatest() { const E = S.el, H = E.hist.filter((x) => x.ch === E.ch && x.dir === 'in'); if (H.length && E.unread[E.ch]) { EL.markRead(S, E.ch); elSpeak('earth', xt(H[H.length - 1].text)); elRender(); elHudBadge(); } }
  function elSend(id, p) {
    const r = EL.send(S, id, p); if (!r.ok) { Sfx.play('bad'); toast(XT('No se puede transmitir', 'Cannot transmit'), r.why ? xt(r.why) : '', 'warn'); return r; }
    elAfterSend(r.msg); elRender(); return r;
  }
  function elAfterSend(m) {
    Voice.stop(); EL.ensure(S); if (!ELK.open) Sfx.play('rtx');
    elSpeak(m.who, xt(m.txt), () => { elRender(); });
    if (m.st === 'queued') toast(XT('Sin enlace: transmisión pendiente', 'No link: transmission pending'), XT('El mensaje saldrá cuando se recupere la señal.', 'The message will go out when the signal returns.'), 'warn');
    elHudBadge();
  }

  /* ---------- HUD, registros y bucle ---------- */
  function elHudBadge() {
    const b = $('#bRadio'); if (!b || !S) return;
    const st = EL.status(S), n = EL.totalUnread(S), pend = S.el.out.length;
    b.classList.toggle('on', ELK.open); b.style.borderColor = ELCOL[st.main];
    let bd = b.querySelector('.er-hb'); if (!bd) { bd = h('i', { class: 'er-hb' }); b.append(bd); }
    bd.textContent = n ? n : pend ? '·' : ''; bd.style.display = n || pend ? '' : 'none'; bd.style.background = n ? '#ff6b6b' : '#7fd3ff';
    b.classList.toggle('pulse', n > 0 && !ELK.open);
    b.title = 'EarthLink · ' + XT(ELSTN[st.main][0], ELSTN[st.main][1]) + ' (' + keyLabel() + ')';
  }
  function elFrame(dt) {
    if (!S) return; ELK.hudT += dt;
    if (ELK.hudT > 0.4) {
      ELK.hudT = 0; EL.ensure(S); elHudBadge();
      if (ELK.open) { if (ELK.last !== JSON.stringify([S.el.out.length, S.el.hist.length, S.el.unread, EL.status(S).main, S.el.prop.length])) elRender(); ELK.last = JSON.stringify([S.el.out.length, S.el.hist.length, S.el.unread, EL.status(S).main, S.el.prop.length]); }
    }
    if (EL.takeEvac(S)) { const E = S.ex; if (E && E.suit.on) { Ex.recall(S, 'request'); World.teleportHome(); toast(XT('Recogida completada', 'Pickup complete'), XT('La base te recogió y remolcó el rover.', 'The base picked you up and towed the rover.'), 'ok'); } }
  }
  /** Registros del motor → avisos de radio, sonidos y toasts. */
  function elLogToRadio(e) {
    const k = e.k, p = e.p || {}, es = LANG === 'es';
    if (k === 'el.recv') {
      const E = S.el, last = E.hist.filter((x) => x.ref === p.id && x.dir === 'in').pop(); if (!last) return true;
      Sfx.play(ELK.open ? 'rrx' : 'rrx');
      if (ELK.open) { elRender(); if (E.ch === p.ch) { Voice.stop(); EL.markRead(S, p.ch); elSpeak('earth', xt(last.text), () => elRender()); } }
      else toast(XT('Mensaje de la Tierra', 'Message from Earth'), xt(EL.CH.find((c) => c.id === p.ch).n) + ' · ' + xt(last.text).slice(0, 90), 'info', () => { elToggle(true); S.el.ch = p.ch; elRender(); });
      elHudBadge(); return true;
    }
    if (k === 'el.alert') { const last = S.el.hist.filter((x) => x.spont).pop(); call({ key: 'el.alert' + e.n, sev: 'warn', who: 'control', voice: 'earth', title: XT('Alerta de la Tierra', 'Alert from Earth'), desc: last ? xt(last.text) : '', console: 'comms' }); elHudBadge(); return true; }
    if (k === 'el.lost') { Sfx.play('rnoise'); toast(p.st === 'none' ? XT('Enlace perdido', 'Link lost') : XT('La señal empeora', 'Signal degrading'), ELWHY[p.why] ? XT(ELWHY[p.why][0], ELWHY[p.why][1]) : '', 'warn'); return true; }
    if (k === 'el.restored') { Sfx.play('rcon'); toast(XT('Señal recuperada', 'Signal recovered'), XT('Los mensajes en cola vuelven a salir.', 'Queued messages go out again.'), 'ok'); return true; }
    if (k === 'el.damage') { Sfx.play('rnoise'); toast(XT('Daño en equipos exteriores', 'Exterior equipment damaged'), XT('Repara las comunicaciones en el taller.', 'Repair communications at the workshop.'), 'warn'); return true; }
    if (k === 'el.supply') { Sfx.play('ok'); toast(XT('Llegó un envío de la Tierra', 'A shipment arrived from Earth'), p.k === 'part' ? XT('Un repuesto', 'A spare part') : '+' + p.amt + ' ' + EL.RESU[p.k] + ' ' + xt(EL.RESN[p.k]), 'ok'); return true; }
    if (k === 'el.mission') { toast(XT('Nueva misión activada por Tierra', 'New mission activated by Earth'), '', 'info'); return true; }
    if (k === 'el.prop') { if (!ELK.open) toast(XT('Un especialista propone llamar a la Tierra', 'A specialist suggests calling Earth'), XT('Abre la radio para autorizarlo.', 'Open the radio to authorize it.'), 'info', () => elToggle(true)); elHudBadge(); return true; }
    return true;
  }
  function elLogText(e) {
    const k = e.k, p = e.p || {};
    const T2 = { 'el.sent': [XT('Mensaje a la Tierra', 'Message to Earth'), p.intent], 'el.recv': [XT('Respuesta de la Tierra', 'Reply from Earth'), p.intent], 'el.alert': [XT('Alerta de la Tierra', 'Earth alert'), p.type], 'el.lost': [XT('Enlace degradado', 'Link degraded'), p.why], 'el.restored': [XT('Señal recuperada', 'Signal recovered'), ''], 'el.damage': [XT('Daño en equipos exteriores', 'Exterior equipment damaged'), ''], 'el.supply': [XT('Envío recibido', 'Shipment received'), p.k], 'el.mission': [XT('Misión activada por la Tierra', 'Mission activated by Earth'), p.id], 'el.prop': [XT('Propuesta de un especialista', 'Specialist suggestion'), p.intent] };
    return T2[k] || [k, ''];
  }
  function elAttach() { if (erEl) { ELK.open = false; erEl.classList.add('hidden'); $('#app').classList.remove('er-on'); cancelAnimationFrame(ELK.raf); } ELK.sub = null; ELK.last = ''; if (S) elHudBadge(); }
  const elDebug = { attach: elAttach, toggle: elToggle, send: elSend, render: elRender, speak: elSpeak, frame: elFrame, hud: elHudBadge, accept: (id) => { const r = EL.accept(S, id); if (r.ok) elAfterSend(r.msg); return r; }, get open() { return ELK.open; }, get sub() { return ELK.sub; }, get el() { return erEl; }, logToRadio: elLogToRadio };
