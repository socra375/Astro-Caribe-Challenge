
  /* =====================================================================
     AUDIO Y VOCES: subtítulos, panel de configuración y narración de los NPC.
     Si no hay síntesis de voz, todo sigue funcionando con texto.
     ===================================================================== */
  function applyAudio() {
    const c = Voice.cfg;
    Sfx.setSfx(c.sfx); Sfx.setAlertVol(c.vAlert); Sfx.setMusicVol(c.vMusic); Sfx.setMusic(c.music);
  }
  let subEl = null, subT = 0;
  const ROLEN = { commander: { es: 'Comandante', en: 'Commander' }, engineer: { es: 'Ingeniera', en: 'Engineer' }, medic: { es: 'Médica', en: 'Medic' }, scientist: { es: 'Científico', en: 'Scientist' }, agronomist: { es: 'Agrónomo', en: 'Agronomist' }, narrator: { es: 'Narrador', en: 'Narrator' } };
  function ensureSubs() {
    if (subEl) return subEl;
    subEl = h('div', { id: 'subs', class: 'hidden', role: 'status', 'aria-live': 'polite' });
    document.body.append(subEl); return subEl;
  }
  function showSub(s) {
    const el = ensureSubs(), es = LANG === 'es';
    el.innerHTML = '';
    el.append(h('b', null, tr(ROLEN[s.who] || ROLEN.narrator) + ': '), h('span', null, s.text),
      btn('🔁', () => Voice.repeat(), 'sm ghost', { 'aria-label': es ? 'Repetir mensaje' : 'Repeat message', title: es ? 'Repetir (V)' : 'Repeat (V)' }),
      btn('⏹', () => { Voice.stop(); el.classList.add('hidden'); }, 'sm ghost', { 'aria-label': es ? 'Detener' : 'Stop' }));
    el.classList.remove('hidden');
    clearTimeout(subT); subT = setTimeout(() => el.classList.add('hidden'), Math.max(4000, s.text.split(/\s+/).length * 420));
  }
  Voice.onSubtitle = showSub;
  const lvlOfSev = (s) => (s === 'crit' ? 'crit' : s === 'warn' ? 'warn' : 'info');
  /** Narrador general (instrucciones, resúmenes). silent: el texto ya está visible en pantalla, no hace falta subtítulo extra. */
  function narrate(text, o) { return Voice.say('control', LANG, text, Object.assign({ level: 'info' }, o || {})); }
  /** Narración de una llamada de radio: nombre y datos ya salen en la tarjeta de radio, que hace de subtítulo. */
  function narrateCall(c) {
    if (!c) return;
    const es = LANG === 'es';
    const txt = [c.title, c.desc, c.loc, c.act, (c.sev === 'crit' || isAdv()) && c.cons ? (es ? 'Si lo ignoras: ' : 'If ignored: ') + c.cons : ''].filter(Boolean).join('. ');
    Voice.speak(Voice.profileFor(c.who || 'control', LANG), txt, { level: lvlOfSev(c.sev), silent: true });
  }
  function repeatVoice() { if (radio.cur) { Voice.stop(); narrateCall(radio.cur); } else if (!Voice.repeat()) toast(LANG === 'es' ? 'No hay ningún mensaje que repetir' : 'No message to repeat', '', 'info'); }

  function audioPanel() {
    const es = LANG === 'es', c = Voice.cfg;
    const build = () => {
      const lang = LANG, vs = Voice.voices, mine = Voice.voicesFor(lang);
      const chk = (k, after) => { const i = h('input', { type: 'checkbox', onchange: (e) => { c[k] = e.target.checked; Voice.persist(); applyAudio(); if (after) after(); } }); i.checked = !!c[k]; i.style.width = '24px'; i.style.height = '24px'; return i; };
      const sld = (label, get, set, min, max, step, fmtf) => { const out = h('b', null, fmtf(get())); const r = h('input', { type: 'range', min, max, step, value: get(), 'aria-label': label, oninput: (e) => { set(+e.target.value); out.textContent = fmtf(+e.target.value); } }); return h('label', { class: 'col', style: { margin: '6px 0' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', null, label), out), r); };
      const pc = (v) => Math.round(v * 100) + ' %';
      const row = (label, ctrl) => h('label', { class: 'row', style: { justifyContent: 'space-between', margin: '6px 0' } }, h('span', null, label), ctrl);
      const dist = Voice.distinct(lang);
      const status = !Voice.supported ? (es ? 'Este navegador no ofrece síntesis de voz: el juego funciona igual con subtítulos y texto.' : 'This browser has no speech synthesis: the game works the same with subtitles and text.')
        : !vs.length ? (es ? 'No se detectó ninguna voz en este dispositivo (a veces tardan en cargar). El juego usa subtítulos.' : 'No voice detected on this device (they can take a while to load). The game uses subtitles.')
        : (es ? 'Voces detectadas: ' + vs.length + ' · en este idioma: ' + mine.length + ' · voces distintas en uso: ' + dist + '.' : 'Voices detected: ' + vs.length + ' · in this language: ' + mine.length + ' · distinct voices in use: ' + dist + '.');
      const honest = Voice.supported && vs.length && dist <= 1 ? h('p', { class: 'small tag warn' }, es ? 'Solo hay una voz disponible para este idioma: todos los personajes usan esa misma voz, con tono y velocidad distintos. No son voces diferentes.' : 'Only one voice is available for this language: every character uses that same voice with different pitch and speed. They are not different voices.') : null;
      const sample = es ? 'Hola, soy tu compañero de la base. Esta es mi voz.' : 'Hi, I am your crewmate on the base. This is my voice.';
      const rows = Voice.ROLES.map((role) => {
        const id = 'npc_' + role + '_' + lang, p = Voice.profiles[id], r = Voice.resolve(id);
        const sel = h('select', { 'aria-label': tr(ROLEN[role]), disabled: !vs.length ? true : null, onchange: (e) => { Voice.setPreferred(id, e.target.value || null); refreshAudio(); } },
          h('option', { value: '' }, es ? 'Automática (por idioma)' : 'Automatic (by language)'),
          (mine.length ? mine : vs).map((v) => { const o = h('option', { value: v.uri }, v.name + ' (' + v.lang + ')'); if (p.preferredVoiceURI === v.uri) o.selected = true; return o; }));
        const how = { uri: es ? 'guardada' : 'saved', name: es ? 'por nombre' : 'by name', lang: es ? 'por idioma' : 'by language', default: es ? 'voz por defecto del navegador' : 'browser default voice', none: es ? 'solo texto' : 'text only' }[r.how];
        return h('div', { class: 'card' }, h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center' } }, h('b', null, tr(ROLEN[role])), btn('🔊 ' + (es ? 'Probar' : 'Test'), () => Voice.test(id, sample), 'sm', { disabled: !r.voice ? true : null })),
          sel, h('div', { class: 'small muted' }, (es ? 'Se usa: ' : 'Using: ') + (r.voice ? r.voice.name + ' · ' : '') + how));
      });
      return panel('🔊 ' + (es ? 'Audio y voces' : 'Audio & voices'), h('div', null,
        h('p', { class: 'small' }, status), honest,
        h('h3', null, es ? 'Volúmenes' : 'Volumes'),
        sld(es ? 'General' : 'Master', () => settings.vol, (v) => { settings.vol = v; applySettings(); }, 0, 1, 0.05, pc),
        sld(es ? 'Voces' : 'Voices', () => c.vVoice, (v) => { c.vVoice = v; Voice.persist(); }, 0, 1, 0.05, pc),
        sld(es ? 'Música' : 'Music', () => c.vMusic, (v) => { c.vMusic = v; Voice.persist(); applyAudio(); }, 0, 1, 0.05, pc),
        sld(es ? 'Alertas' : 'Alerts', () => c.vAlert, (v) => { c.vAlert = v; Voice.persist(); applyAudio(); }, 0, 1, 0.05, pc),
        sld(es ? 'Velocidad de narración' : 'Narration speed', () => c.rate, (v) => { c.rate = v; Voice.persist(); }, 0.6, 1.5, 0.05, (v) => '×' + (+v).toFixed(2)),
        h('h3', null, es ? 'Activar o desactivar' : 'Switches'),
        row('🗣 ' + (es ? 'Voz de los personajes (TTS)' : 'Character voices (TTS)'), chk('tts', () => { if (!c.tts) Voice.stop(); })),
        row('🎵 ' + (es ? 'Música' : 'Music'), chk('music')), row('🔔 ' + (es ? 'Sonidos y alertas' : 'Sounds and alerts'), chk('sfx')), row('💬 ' + (es ? 'Subtítulos' : 'Subtitles'), chk('subs')),
        row('🌐 ' + (es ? 'Idioma' : 'Language'), btn(_('lang'), () => { settings.lang = LANG === 'es' ? 'en' : 'es'; applySettings(); if (running) { buildHud(); updateHud(); } refreshAudio(); })),
        h('div', { class: 'row' }, btn('🔁 ' + (es ? 'Repetir último mensaje' : 'Repeat last message'), () => repeatVoice(), 'sm'), btn('⏹ ' + (es ? 'Detener voz' : 'Stop voice'), () => Voice.stop(), 'sm')),
        h('h3', null, es ? 'Voz de cada personaje' : 'Voice of each character'),
        h('p', { class: 'small muted' }, es ? 'Elige una voz de las que ofrece tu dispositivo y pulsa Probar. La elección se guarda sola. Los identificadores npc_* son internos del juego.' : 'Pick one of the voices your device offers and press Test. Your choice is saved automatically. The npc_* IDs are internal to the game.'),
        h('div', { class: 'grid2' }, rows),
        h('p', { class: 'small muted' }, Store.ok ? (es ? 'Las preferencias se guardan en este navegador.' : 'Preferences are saved in this browser.') : (es ? 'El almacenamiento está bloqueado: las preferencias valen solo durante esta sesión.' : 'Storage is blocked: preferences only last for this session.'))));
    };
    const s = push(build());
    const refreshAudio = () => { if (s.isConnected) refresh(s, build); };
    Voice.onChange(() => { if (s.isConnected && !s.contains(document.activeElement && document.activeElement.tagName === 'INPUT' ? document.activeElement : null)) refreshAudio(); });
  }
