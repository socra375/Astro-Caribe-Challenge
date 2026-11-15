
/* =====================================================================
   VOICE — texto a voz con la Web Speech API.
   Los identificadores npc_<rol>_<idioma> son internos del videojuego (no de
   ningún proveedor). Las voces reales se detectan en el dispositivo con
   speechSynthesis.getVoices() y se actualizan con el evento voiceschanged.
   Si no hay síntesis de voz, el juego sigue funcionando con subtítulos.
   ===================================================================== */
const Voice = (function () {
  const ROLES = ['commander', 'engineer', 'medic', 'scientist', 'agronomist', 'narrator', 'earth_control'];
  const LANGS = ['es', 'en'];
  const BASE = { commander: [0.94, 0.85], engineer: [1.02, 0.95], medic: [0.98, 1.15], scientist: [1.04, 1.05], agronomist: [0.96, 1.2], narrator: [0.92, 1.0], earth_control: [0.9, 0.9] };
  const GAME2ROLE = { commander: 'commander', engineer: 'engineer', medic: 'medic', scientist: 'scientist', agri: 'agronomist', control: 'narrator', earth: 'earth_control' };
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
  const profiles = {};
  for (const role of ROLES) for (const lang of LANGS) {
    const id = 'npc_' + role + '_' + lang;
    profiles[id] = { profileId: id, characterRole: role, language: lang, preferredVoiceURI: null, preferredVoiceName: null, fallbackLanguage: lang === 'es' ? 'en' : 'es', rate: BASE[role][0], pitch: BASE[role][1], volume: 1 };
  }
  // Preferencias guardables (si localStorage está bloqueado, Store las mantiene en memoria)
  const cfg = Object.assign({ tts: true, subs: true, music: false, sfx: true, vVoice: 1, vMusic: 0.35, vAlert: 1, vRadio: 1, rate: 1, saved: {} }, Store.get('audio', {}));
  for (const id in cfg.saved) if (profiles[id]) { profiles[id].preferredVoiceURI = cfg.saved[id].uri || null; profiles[id].preferredVoiceName = cfg.saved[id].name || null; }
  function persist() { Store.set('audio', cfg); }

  let list = [], armed = false, cur = null, pend = [], last = null;
  const listeners = [];
  function refresh() {
    if (!supported) { list = []; return; }
    try { list = (window.speechSynthesis.getVoices() || []).map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, def: !!v.default, v })); } catch (e) { list = []; }
    listeners.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
  }
  if (supported) {
    refresh();
    try { window.speechSynthesis.addEventListener('voiceschanged', refresh); } catch (e) { window.speechSynthesis.onvoiceschanged = refresh; }
  }
  const langOf = (v) => String(v.lang || '').toLowerCase().replace('_', '-');
  const voicesFor = (lang) => list.filter((v) => langOf(v).split('-')[0] === lang);

  /** Prioridad: 1 voiceURI guardada y disponible · 2 nombre exacto · 3 voz del idioma · 4 voz por defecto del navegador · 5 sin voz (solo texto). */
  function resolve(profileId) {
    const p = profiles[profileId]; if (!p || !supported || !list.length) return { voice: null, how: 'none' };
    let v = p.preferredVoiceURI && list.find((x) => x.uri === p.preferredVoiceURI); if (v) return { voice: v, how: 'uri' };
    v = p.preferredVoiceName && list.find((x) => x.name === p.preferredVoiceName); if (v) return { voice: v, how: 'name' };
    const L = voicesFor(p.language); if (L.length) return { voice: L.find((x) => x.def) || L[0], how: 'lang' };
    v = list.find((x) => x.def) || null; if (v) return { voice: v, how: 'default' };
    return { voice: null, how: 'none' };
  }
  const clean = (t) => String(t == null ? '' : t).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, ' ').replace(/\s+/g, ' ').trim();
  function profileFor(role, lang) { return 'npc_' + (GAME2ROLE[role] || role || 'narrator') + '_' + (lang === 'en' ? 'en' : 'es'); }

  let onSub = null;
  function emitSub(p, text, level) { if (onSub && cfg.subs) onSub({ who: p.characterRole, profileId: p.profileId, text, level }); }
  function startNext() {
    if (cur || !pend.length) return;
    const it = pend.shift(), p = profiles[it.profileId], r = resolve(it.profileId);
    if (!it.silent) emitSub(p, it.text, it.level);
    if (!supported || !cfg.tts || !armed || !r.voice) { // solo texto (subtítulos)
      if (it.onstart) { cur = it; try { it.onstart(); } catch (e) { /* ignore */ } setTimeout(() => { if (cur === it) { cur = null; try { it.onend && it.onend(); } catch (e) { /* ignore */ } startNext(); } }, Math.max(1200, it.text.split(/\s+/).length * 330 / Math.max(0.6, cfg.rate))); return; }
      pend = []; return;
    }
    try {
      const u = new window.SpeechSynthesisUtterance(it.text);
      u.voice = r.voice.v; u.lang = r.voice.lang || p.language; u.rate = Math.max(0.5, Math.min(2, p.rate * cfg.rate)); u.pitch = p.pitch;
      u.volume = Math.max(0, Math.min(1, p.volume * (it.chan === 'radio' ? cfg.vRadio : cfg.vVoice) * (it.level === 'crit' || it.level === 'warn' ? Math.max(0.4, cfg.vAlert) : 1)));
      cur = it; u.onstart = () => { try { it.onstart && it.onstart(); } catch (e) { /* ignore */ } }; u.onboundary = (ev) => { try { it.onboundary && it.onboundary(ev.charIndex || 0); } catch (e) { /* ignore */ } };
      u.onend = u.onerror = () => { if (cur === it) { cur = null; try { it.onend && it.onend(); } catch (e) { /* ignore */ } startNext(); } };
      if (it.onstart && !it.started) { it.started = true; }
      window.speechSynthesis.speak(u);
    } catch (e) { cur = null; }
  }
  /** Narra un texto con el perfil indicado. level: 'crit' | 'warn' | 'info'. Sin solapes: lo crítico interrumpe; lo informativo espera y solo se guarda el último. */
  function speak(profileId, text, o) {
    o = o || {}; text = clean(text); if (!text || !profiles[profileId]) return false;
    const level = o.level || 'info';
    last = { profileId, text, level };
    const it = { profileId, text, level, silent: !!o.silent, chan: o.chan, onstart: o.onstart, onend: o.onend, onboundary: o.onboundary };
    if (level === 'crit') { stop(true); pend = [it]; } else { pend = pend.filter((x) => x.level !== 'info' || level !== 'info'); pend.push(it); if (pend.length > 3) pend.shift(); }
    startNext(); return true;
  }
  function stop(keepLast) { pend = []; cur = null; if (supported) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } } }
  function repeat() { if (last) { const l = last; speak(l.profileId, l.text, { level: l.level }); return true; } return false; }
  function say(role, lang, text, o) { return speak(profileFor(role, lang), text, o); }
  function setPreferred(profileId, uri) {
    const p = profiles[profileId]; if (!p) return;
    const v = uri ? list.find((x) => x.uri === uri) : null;
    p.preferredVoiceURI = v ? v.uri : null; p.preferredVoiceName = v ? v.name : null;
    if (v) cfg.saved[profileId] = { uri: v.uri, name: v.name }; else delete cfg.saved[profileId];
    persist();
  }
  /** Cuántas voces distintas usan realmente los seis perfiles de un idioma. */
  function distinct(lang) { const u = new Set(); for (const r of ROLES) { const x = resolve('npc_' + r + '_' + lang); if (x.voice) u.add(x.voice.uri); } return u.size; }
  function test(profileId, text) { const was = armed; armed = true; speak(profileId, text, { level: 'info', silent: false }); armed = was || armed; }
  const arm = () => { armed = true; };
  if (typeof document !== 'undefined') { document.addEventListener('pointerdown', arm, { once: true }); document.addEventListener('keydown', arm, { once: true }); }
  return { supported, ROLES, LANGS, profiles, cfg, persist, get voices() { return list; }, voicesFor, resolve, speak, say, stop, repeat, setPreferred, distinct, test, arm, profileFor, clean, refresh,
    get speaking() { return !!cur; }, get last() { return last; }, set onSubtitle(f) { onSub = f; }, onChange: (f) => listeners.push(f), get armed() { return armed; } };
})();
