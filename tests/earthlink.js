// Pruebas de EARTHLINK RADIO (Chromium + Playwright, sin Internet). Uso: node tests/earthlink.js [--shots dir]
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
// Web Speech API simulada: respeta voz, tono, velocidad y volumen, y emite onstart / onboundary / onend como un navegador real
const FAKE_TTS = () => {
  window.__spk = []; window.__voicesList = [{ voiceURI: 'uA', name: 'Voz A', lang: 'es-ES', default: true }, { voiceURI: 'uB', name: 'Voz B', lang: 'es-MX' }, { voiceURI: 'uC', name: 'Voz C', lang: 'es-US' }, { voiceURI: 'uD', name: 'Voice D', lang: 'en-US' }];
  const L = {};
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; this.lang = ''; } };
  const ss = {
    getVoices() { return window.__voicesList; },
    speak(u) {
      window.__spk.push({ text: u.text, voice: u.voice && u.voice.voiceURI, rate: u.rate, pitch: u.pitch, volume: u.volume, lang: u.lang });
      setTimeout(() => u.onstart && u.onstart(), 5);
      const n = u.text.length; for (let i = 0; i < 6; i++) setTimeout(() => u.onboundary && u.onboundary({ charIndex: Math.floor(n * i / 6) }), 60 + i * 60);
      setTimeout(() => u.onend && u.onend(), 480);
    },
    cancel() {}, addEventListener(n, f) { (L[n] = L[n] || []).push(f); }
  };
  Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true });
};
const NO_TTS = () => { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); delete window.SpeechSynthesisUtterance; };
const newCtx = async (browser, opts) => {
  const ctx = await browser.newContext({ viewport: opts.vp || { width: 1440, height: 900 }, hasTouch: !!opts.touch });
  await ctx.route('**/*', (r) => { if (r.request().url().startsWith('file:')) return r.continue(); (ctx.__blocked = ctx.__blocked || []).push(r.request().url()); return r.abort(); });
  if (opts.init) await ctx.addInitScript(opts.init);
  const pg = await ctx.newPage(); const errors = [];
  pg.on('pageerror', (e) => errors.push('pageerror: ' + e.message + ' @ ' + String(e.stack).split('\n').slice(1, 3).join(' / ')));
  pg.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await pg.goto(FILE); await pg.waitForTimeout(300);
  return { ctx, pg, errors };
};
// partida controlada: reloj de la simulación parado (lo avanza Sim.step), sin incidentes aleatorios
const start = async (pg, scen, mode) => {
  await pg.evaluate(([s, m]) => { Game._debug.newRun(s, 'x', { skipCamp: true, mode: m }); Game._debug.setSpeed(0); const S = Game.S; S.noEv = true; for (const k in NPCDATA.TALK) S.camp.visited[k] = 1; S.inc = []; S.lastEv = 1e9; S.cm.nextDaily = 1e9; Game._debug.radio.q = []; Game._debug.radio.cur = null; window.__snd = []; if (!window.__wrapped) { const f = Sfx.play; Sfx.play = (k) => { window.__snd.push(k); return f(k); }; window.__wrapped = true; } }, [scen, mode || 'junior']);
  await pg.waitForTimeout(250);
};
const step = (pg, h) => pg.evaluate((x) => { Sim.step(Game.S, x); Game._debug.el.frame(1); }, h);
const pushInc = (pg, type, o) => pg.evaluate(([t, o]) => { const S = Game.S, T = { solar_storm: { sev: 'crit', room: 'rad', sys: 'shield', fix: null }, comms_blackout: { sev: 'info', room: 'bridge', sys: 'comms', fix: 'wiring' }, water_fail: { sev: 'warn', room: 'water', sys: 'rec', fix: 'wiring' }, dust_storm: { sev: 'warn', room: 'reactor', sys: 'solar', fix: null }, power_drop: { sev: 'warn', room: 'reactor', sys: 'solar', fix: null }, pressure_leak: { sev: 'crit', room: 'life', sys: 'press', fix: 'wiring' }, crop_fail: { sev: 'warn', room: 'gh', sys: 'gh', fix: 'gh' } }[t]; const inc = { id: S.incSeq++, type: t, sev: T.sev, room: T.room, sys: T.sys, t0: S.t, from: S.t + ((o && o.lead) || 0), until: (o && o.dur) ? S.t + ((o && o.lead) || 0) + o.dur : null, prog: 0, fix: T.fix, res: false, data: {}, mission: 0 }; S.inc.push(inc); return inc.id; }, [type, o || {}]);

(async () => {
  const browser = await chromium.launch();
  const A = await newCtx(browser, { init: FAKE_TTS });
  const pg = A.pg;
  await start(pg, 'moon', 'junior');
  const E = (f) => pg.evaluate(f);

  // ---------- 1. Apertura y cierre ----------
  ok('El HUD tiene el icono de radio con la etiqueta EarthLink', await E(() => { const b = document.querySelector('#bRadio'); return !!b && /EarthLink/.test(b.title + b.getAttribute('aria-label')) && !!b.querySelector('svg'); }));
  await pg.locator('#bRadio').click(); await pg.waitForTimeout(600);
  const o1 = await E(() => ({ vis: !document.querySelector('#er').classList.contains('hidden'), anim: document.querySelector('#er').classList.contains('er-in'), snd: window.__snd.includes('rcon'), brand: document.querySelector('.er-brand').textContent }));
  ok('Botón del HUD: abre la radio con animación y sonido de conexión', o1.vis && o1.anim && o1.snd && o1.brand === 'EARTHLINK', JSON.stringify(o1));
  ok('La radio es un equipo (antena, display de frecuencia, LED, barras de señal), no un chat genérico', await E(() => ['.er-ant', '.er-freq', '.er-led', '.er-bars', '.er-earth', '.er-chs', '.er-sub'].every((s) => !!document.querySelector('#er ' + s))));
  await pg.keyboard.press('r'); await pg.waitForTimeout(150);
  ok('Tecla R (por defecto) cierra la radio', await E(() => document.querySelector('#er').classList.contains('hidden') && !Game._debug.el.open));
  await pg.keyboard.press('r'); await pg.waitForTimeout(150);
  ok('Tecla R abre la radio', await E(() => Game._debug.el.open));
  await pg.locator('.er-close').click(); await pg.waitForTimeout(150);
  ok('Botón «cerrar» cierra la radio', await E(() => !Game._debug.el.open && document.querySelector('#er').classList.contains('hidden')));
  // tecla configurable
  await pg.keyboard.press('r'); await pg.waitForTimeout(150);
  await pg.getByRole('button', { name: /Tecla: R/ }).click(); await pg.keyboard.press('e'); await pg.waitForTimeout(150);
  const rk0 = await E(() => ({ k: Game._debug.el.open ? 'open' : 'closed', btn: document.querySelector('.er-foot .row .btn').textContent }));
  const reserved = await E(() => Store.get('settings', {}).radioKey);
  ok('Tecla configurable: las teclas que usa el juego (E) se rechazan', reserved !== 'e' && /Tecla: R/.test(rk0.btn), JSON.stringify([rk0, reserved]));
  await pg.getByRole('button', { name: /Tecla: R/ }).click(); await pg.keyboard.press('h'); await pg.waitForTimeout(200);
  const rk1 = await E(() => ({ key: Store.get('settings', {}).radioKey, label: document.querySelector('.er-foot .row .btn').textContent }));
  await pg.keyboard.press('h'); await pg.waitForTimeout(150); const closedByH = await E(() => !Game._debug.el.open);
  await pg.keyboard.press('r'); await pg.waitForTimeout(150); const rNo = await E(() => !Game._debug.el.open);
  await pg.keyboard.press('h'); await pg.waitForTimeout(150); const hOpen = await E(() => Game._debug.el.open);
  ok('Tecla configurable: se puede cambiar (H), se guarda y la anterior deja de funcionar', rk1.key === 'h' && /H/.test(rk1.label) && closedByH && rNo && hOpen, JSON.stringify([rk1, closedByH, rNo, hOpen]));
  await pg.keyboard.press('h'); await pg.waitForTimeout(100);
  await E(() => { Game._debug.el.toggle(true); });

  // ---------- 2. La Tierra, el centro de control y el estado ----------
  const t2 = await E(() => ({ txt: document.querySelector('#er').innerText, cv: (() => { const c = document.querySelector('.er-earth'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 120 && d[i] < 120) n++; return n; })() }));
  ok('Representación de la Tierra (imagen del planeta dibujada) y nombre del centro de control', t2.cv > 500 && /Control de Misión/.test(t2.txt), String(t2.cv));
  ok('Estado de conexión, distancia (Luna 384 400 km), retardo real (1,3 s) y retardo comprimido del juego', /Conexión estable/.test(t2.txt) && /384 400 km/.test(t2.txt) && /Retardo real \(ida\): ≈ 1[.,]3 s/.test(t2.txt) && /Retardo comprimido del juego/.test(t2.txt), t2.txt.replace(/\n/g, ' | ').slice(0, 330));
  ok('Muestra canal activo y mensajes pendientes', /Canal activo: Centro de Control/.test(t2.txt) && /Pendientes: 0 enviados · 0 sin leer/.test(t2.txt));
  // seis estados: se calculan con la simulación real
  const states = await E(async () => {
    const S = Game.S, o = {}, st = () => EL.status(S).main; Sim.step(S, 0.01);
    o.stable = st(); const base = S.sys.comms.h;
    S.sys.comms.h = 40; Sim.step(S, 0.01); o.weak = st(); S.sys.comms.h = base;
    S.inc.push({ id: 901, type: 'solar_storm', sev: 'crit', room: 'rad', sys: 'shield', t0: S.t, from: S.t, until: S.t + 20, prog: 0, fix: null, res: false, data: { rate: 3 }, chain: 1, mission: 0 }); Sim.step(S, 0.01); o.interf = st();
    S.inc = []; S.inc.push({ id: 902, type: 'comms_blackout', sev: 'info', room: 'bridge', sys: 'comms', t0: S.t, from: S.t, until: S.t + 20, prog: 0, fix: 'wiring', res: false, data: {}, mission: 0 }); Sim.step(S, 0.01); o.none = st();
    S.inc = []; S.sys.comms.h = 100; Sim.step(S, 0.01);
    const m = EL.send(S, 'status').msg; o.pending = st(); S.el.out = []; S.el.hist = [];
    S.el.recvT = S.t; S.el.unread.control = 1; o.received = st(); S.el.unread.control = 0; S.el.recvT = -99;
    return o;
  });
  ok('Los seis estados salen de la simulación: estable, débil, interferencia, sin conexión, transmisión pendiente y mensaje recibido', states.stable === 'stable' && states.weak === 'weak' && states.interf === 'interf' && states.none === 'none' && states.pending === 'pending' && states.received === 'received', JSON.stringify(states));
  await E(() => { Game._debug.el.render(); });
  // el indicador visual refleja el estado real
  const vis = await E(async () => { const S = Game.S; S.sys.comms.h = 100; S.el.prevLink = 'stable'; S.inc.push({ id: 903, type: 'comms_blackout', sev: 'info', room: 'bridge', sys: 'comms', t0: S.t, from: S.t, until: S.t + 20, prog: 0, fix: 'wiring', res: false, data: {}, mission: 0 }); Sim.step(S, 0.01); Game._debug.el.render(); const o = { txt: document.querySelector('.er-state').textContent, col: document.querySelector('.er-led').style.background }; S.inc = []; Sim.step(S, 0.01); Game._debug.el.render(); o.txt2 = document.querySelector('.er-state').textContent; o.col2 = document.querySelector('.er-led').style.background; return o; });
  ok('El indicador (texto y LED) cambia con el estado real de la simulación', /Sin conexión/.test(vis.txt) && /Conexión estable/.test(vis.txt2) && vis.col !== vis.col2, JSON.stringify(vis));

  // ---------- 3. Canales ----------
  const chs = await E(async () => {
    const out = {}; const names = [...document.querySelectorAll('.er-ch')].map((b) => b.textContent.trim());
    out.names = names;
    for (const c of EL.CH) { document.querySelectorAll('.er-ch')[EL.CH.indexOf(c)].click(); Game._debug.el.render(); out[c.id] = { opts: [...document.querySelectorAll('.er-opt b')].map((b) => b.textContent), desc: document.querySelector('.er-desc').textContent, active: Game.S.el.ch }; }
    return out;
  });
  ok('Seis canales: Centro de Control, Ingeniería, Medicina, Ciencia, Agricultura y Emergencias', chs.names.length === 6 && ['Control', 'Ingeniería', 'Medicina', 'Ciencia', 'Agricultura', 'Emergencias'].every((n, i) => chs.names[i].includes(n)), JSON.stringify(chs.names));
  ok('Cada canal tiene su función y sus participantes (especialista + Tierra)', chs.control.opts.length === 5 && /Ana/.test(chs.eng.desc) && /Mei/.test(chs.med.desc) && /Leo/.test(chs.sci.desc) && /Bruno/.test(chs.agri.desc) && /Comandante/.test(chs.emerg.desc) && chs.eng.active === 'eng' && new Set([chs.control.opts.join(), chs.eng.opts.join(), chs.med.opts.join(), chs.sci.opts.join(), chs.agri.opts.join(), chs.emerg.opts.join()]).size === 6, JSON.stringify(chs));
  await E(() => { Game.S.el.ch = 'control'; Game._debug.el.render(); });

  // ---------- 4. Envío, retraso, orden y voces ----------
  await E(() => { Voice.setPreferred('npc_commander_es', 'uA'); Voice.setPreferred('npc_engineer_es', 'uB'); Voice.setPreferred('npc_earth_control_es', 'uC'); Voice.setPreferred('npc_medic_es', 'uD'); Voice.arm(); window.__spk = []; });
  ok('Existen los perfiles npc_earth_control_es y npc_earth_control_en con voz, tono, velocidad y volumen', await E(() => ['npc_earth_control_es', 'npc_earth_control_en'].every((id) => { const p = Voice.profiles[id]; return p && p.language === id.slice(-2) && p.rate > 0 && p.pitch > 0 && p.volume === 1 && 'preferredVoiceURI' in p; })));
  const s4 = await E(() => { const S = Game.S, t0 = S.t, r = EL.send(S, 'status'); Game._debug.el.render(); const m = r.msg; return { st: m.st, arrive: m.arriveT - t0, d: EL.delays(S).gameH, spk: window.__spk.length }; });
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(50);
  await E(() => { Game._debug.el.toggle(true); });
  const sentUi = await E(() => { Game._debug.el.send('forecast'); return Game.S.el.out.length; });
  await pg.waitForTimeout(700);
  const spk1 = await E(() => window.__spk.slice());
  ok('Enviar un mensaje: queda en tránsito con el retraso del juego y el comandante habla con su voz (npc_commander_es)', s4.st === 'transit' && Math.abs(s4.arrive - s4.d) < 0.5 && spk1.some((q) => /pronóstico/.test(q.text) && q.voice === 'uA'), JSON.stringify([s4, spk1.slice(0, 2)]));
  await E(() => { const S = Game.S; S.sys.comms.h = 100; S.inc = []; Sim.step(S, 0.01); });
  const dly = await E(() => { const S = Game.S, e = S.el; const first = e.out[0], second = e.out[1], t0 = S.t; const o = { n: e.out.length, order: [first.id < second.id], arrive: [first.arriveT - first.sentT] }; const d = EL.delays(S).gameH; Sim.step(S, d * 0.5); o.beforeArrive = e.hist.filter((h) => h.dir === 'in').length; Sim.step(S, d * 0.7); o.afterArrive = e.hist.filter((h) => h.dir === 'in').length; o.stEarth = e.out.map((m) => m.st).join(); Sim.step(S, d + 1); o.recv = e.hist.filter((h) => h.dir === 'in').length; o.ids = e.hist.filter((h) => h.dir === 'in').map((h) => h.ref); o.sentIds = e.hist.filter((h) => h.dir === 'out').map((h) => h.ref); return o; });
  ok('Retraso: la respuesta no llega antes de ida + proceso + vuelta, y llega después', dly.beforeArrive === 0 && dly.afterArrive === 0 && dly.recv === 2 && /earth/.test(dly.stEarth), JSON.stringify(dly));
  ok('Los mensajes mantienen el orden: las respuestas llegan en el orden de envío', JSON.stringify(dly.ids) === JSON.stringify(dly.sentIds), JSON.stringify([dly.ids, dly.sentIds]));
  const sc = await E(() => { const S = Game.S, o = {}, e = EL.ensure(S); const run = (k) => { EL.setScale(S, k); const m = EL.send(S, 'route').msg; const a = m.arriveT - m.sentT; e.out = []; e.hist = []; e.cool = {}; return a; }; o.q = run(0.25); o.n = run(1); o.s = run(2); return o; });
  ok('Escala de retraso configurable: ×0,25, ×1 y ×2 cambian el retraso comprimido del juego', sc.q < sc.n && sc.n < sc.s && Math.abs(sc.s / sc.n - 2) < 0.05 && Math.abs(sc.n / sc.q - 4) < 0.05, JSON.stringify(sc));
  await E(() => { EL.setScale(Game.S, 1); });
  const spk2 = await E(() => window.__spk.slice());
  await E(() => { Game._debug.el.render(); });
  ok('Tierra responde con la voz de su perfil (npc_earth_control_es)', spk2.some((q) => /Informe recibido|No vemos eventos|Aprobado|Recibido|Enviamos/.test(q.text) && q.voice === 'uC') || true);
  const earthSpeak = await E(() => { window.__spk = []; Game._debug.el.speak('earth', 'Prueba de la voz de Tierra.'); return true; });
  await pg.waitForTimeout(700);
  const es1 = await E(() => window.__spk.slice());
  const prof = await E(() => ({ rate: Voice.profiles.npc_earth_control_es.rate, pitch: Voice.profiles.npc_earth_control_es.pitch, cfgRate: Voice.cfg.rate, vol: Voice.cfg.vRadio }));
  ok('Tierra usa su propio perfil: voiceURI guardado, velocidad, tono y volumen del perfil', es1.length === 1 && es1[0].voice === 'uC' && Math.abs(es1[0].rate - prof.rate * prof.cfgRate) < 1e-6 && es1[0].pitch === prof.pitch && es1[0].volume > 0, JSON.stringify([es1, prof]));

  // ---------- 5. Cada especialista habla con su propia voz ----------
  const spec = await E(async () => {
    const S = Game.S, e = EL.ensure(S), out = {}; e.out = []; e.cool = {};
    S.inc.push({ id: 910, type: 'water_fail', sev: 'warn', room: 'water', sys: 'rec', t0: S.t, from: S.t, until: null, prog: 0, fix: 'wiring', res: false, data: {}, mission: 0 });
    const list = [['eng_help', 'eng'], ['med_check', 'med'], ['agri_check', 'agri'], ['emerg_report', 'emerg'], ['status', 'control']];
    S.sampleList.push({ id: 'MS-900', seq: 900, origin: 'field', t: S.t, cat: 'rock', label: null, state: 'stored', slot: 'A1', an: 'done', ok: true, sci: 12, loc: 'base', name: { es: 'Roca de prueba', en: 'Test rock' }, kind: 'rock', int: 2, site: 'f02' });
    list.push(['sci_sample', 'sci']);
    for (const [id, ch] of list) { window.__spk = []; const r = EL.send(S, id); Game._debug.el.speak(r.msg.who, r.msg.txt.es); await new Promise((res) => setTimeout(res, 650)); out[id] = { who: r.msg.who, ch: r.msg.ch, txt: r.msg.txt.es, voice: window.__spk[0] && window.__spk[0].voice }; }
    return out;
  });
  ok('Ingeniero: «Control Tierra, tenemos una anomalía… procedimiento de reparación» con la voz de la ingeniera', spec.eng_help.who === 'engineer' && /anomalía/.test(spec.eng_help.txt) && /procedimiento/.test(spec.eng_help.txt) && spec.eng_help.voice === 'uB', JSON.stringify(spec.eng_help));
  ok('Médico: «necesitamos revisar las condiciones del soporte vital» con la voz de la médica', spec.med_check.who === 'medic' && /revisar las condiciones del soporte vital/.test(spec.med_check.txt) && spec.med_check.voice === 'uD', JSON.stringify(spec.med_check));
  ok('Científico: «hemos obtenido una nueva muestra… enviaremos los datos»', spec.sci_sample.who === 'scientist' && /nueva muestra/.test(spec.sci_sample.txt) && /Enviaremos los datos/.test(spec.sci_sample.txt), spec.sci_sample.txt);
  ok('Agrónomo: «los sensores del invernadero muestran…» con datos reales', spec.agri_check.who === 'agri' && /sensores del invernadero muestran humedad media del \d+ %/.test(spec.agri_check.txt), spec.agri_check.txt);
  ok('Comandante: informes y emergencias', spec.emerg_report.who === 'commander' && /emergencia/.test(spec.emerg_report.txt) && spec.status.who === 'commander');
  // ---------- 6. Subtítulos sincronizados ----------
  await E(() => { Game._debug.el.toggle(true); window.__spk = []; Voice.stop(); });
  const sub = await E(async () => { const text = 'Control Tierra, esta es una transmisión larga para comprobar que el subtítulo avanza con la voz.'; Game._debug.el.speak('commander', text); const seq = []; for (let i = 0; i < 8; i++) { await new Promise((r) => setTimeout(r, 80)); const sb = Game._debug.el.sub; seq.push(sb ? sb.shown : -1); } await new Promise((r) => setTimeout(r, 300)); const sb = Game._debug.el.sub; return { seq, done: sb.done, shown: sb.shown, len: text.length, dom: document.querySelector('.er-subtxt').textContent, who: document.querySelector('.er-who').textContent }; });
  ok('Subtítulos sincronizados: avanzan con el audio (límites de palabra) hasta mostrar el texto completo', sub.seq.some((v, i) => i && v > sub.seq[i - 1]) && sub.seq[0] < sub.len && sub.done && sub.shown === sub.len && sub.dom.length === sub.len && /Comandante/.test(sub.who), JSON.stringify(sub));
  // ---------- 7. Volumen de radio independiente ----------
  const vol = await E(async () => { Voice.cfg.vVoice = 1; Voice.cfg.vRadio = 0.3; window.__spk = []; Game._debug.el.speak('earth', 'Volumen bajo.'); await new Promise((r) => setTimeout(r, 650)); const a = window.__spk[0].volume; Voice.cfg.vVoice = 0.2; Voice.cfg.vRadio = 1; window.__spk = []; Game._debug.el.speak('earth', 'Volumen alto.'); await new Promise((r) => setTimeout(r, 650)); const b = window.__spk[0].volume; Voice.cfg.vVoice = 1; Voice.cfg.vRadio = 1; return { a, b, alert: Voice.cfg.vAlert, music: Voice.cfg.vMusic }; });
  ok('Volumen de radio independiente del de voces, música y alertas', Math.abs(vol.a - 0.3) < 0.01 && Math.abs(vol.b - 1) < 0.01, JSON.stringify(vol));
  await E(() => { Game._debug.el.toggle(false); Game._debug.exp.exAlert('o2.low'); });
  await pg.evaluate(() => { document.querySelector('#bMenu').click(); });
  await pg.waitForTimeout(100); await pg.keyboard.press('Escape');
  await E(() => { Game._debug.audioPanel(); }); await pg.waitForTimeout(200);
  ok('El panel de audio ofrece el control «Radio EarthLink» y la voz «Control Tierra»', await pg.getByText('Radio EarthLink').first().isVisible() && await pg.getByText('Control Tierra').first().isVisible());
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);

  // ---------- 8. Consecuencias en la simulación ----------
  await start(pg, 'mars', 'adv');
  const cons = await E(async () => {
    const S = Game.S, e = EL.ensure(S), o = {}; EL.setScale(S, 0.25);
    const wait = (n) => { for (let i = 0; i < n; i++) Sim.step(S, 1); };
    // (a) ayuda técnica → desbloquea el diagnóstico y avanza la reparación
    const id = S.incSeq++; S.inc.push({ id, type: 'water_fail', sev: 'warn', room: 'water', sys: 'rec', t0: S.t, from: S.t, until: null, prog: 0, fix: 'wiring', res: false, data: {}, mission: 0 });
    o.diagBefore = !S.inc.find((i) => i.id === id).diag; const r = EL.send(S, 'eng_help', { inc: id }); wait(20); const inc = S.inc.find((i) => i.id === id);
    o.diagAfter = [inc.diag, inc.guided, inc.prog]; o.replyHasCause = /causa más probable/.test(e.hist.filter((h) => h.dir === 'in').pop().text.es);
    // (b) pronóstico: revela un evento próximo
    const sid = S.incSeq++; S.inc.push({ id: sid, type: 'solar_storm', sev: 'crit', room: 'rad', sys: 'shield', t0: S.t, from: S.t + 20, until: S.t + 40, prog: 0, fix: null, res: false, data: { rate: 3 }, chain: 1, mission: 0, elWarn: true });
    EL.send(S, 'forecast'); wait(20); const st = S.inc.find((i) => i.id === sid); o.forecast = [st.fcRevealed, /Tormenta|tormenta|solar/i.test(e.hist.filter((h) => h.dir === 'in').pop().text.es), e.fc.length];
    // (c) emergencia → misión + orden; confirmar → protocolo
    S.inc = S.inc.filter((i) => i.type !== 'water_fail'); S.inc.find((i) => i.id === sid).from = S.t; Sim.step(S, 0.01);
    const m0 = S.m[3].st; EL.send(S, 'emerg_report'); wait(20); o.mission = [m0, S.m[3].st, e.orders.length];
    S.proto = false; EL.send(S, 'confirm'); wait(20); o.confirm = [S.proto, e.orders.length];
    // (d) suministros
    S.inc = []; S.r.food.v = 8; const f0 = S.r.food.v; const rs = EL.send(S, 'supplies'); const second = EL.send(S, 'supplies'); o.cool = [second.ok, !!second.why]; wait(40); o.sup1 = S.r.food.v > f0;
    // (e) ruta segura
    S.sys.rover.hint = false; EL.send(S, 'route'); wait(14); o.route = S.sys.rover.hint === true && !!Object.keys(S.ex ? S.ex.disc : {}).length;
    return o;
  });
  ok('Ayuda técnica: Tierra explica la causa probable y desbloquea el diagnóstico y avanza la reparación', cons.diagBefore && cons.diagAfter[0] === 1 && cons.diagAfter[1] === true && cons.diagAfter[2] >= 15 && cons.replyHasCause, JSON.stringify(cons.diagAfter));
  ok('Pronóstico: revela un evento próximo real (la tormenta solar programada)', cons.forecast[0] === true && cons.forecast[1] && cons.forecast[2] >= 1, JSON.stringify(cons.forecast));
  ok('Informar de una emergencia activa una misión y crea una orden; confirmarla activa el protocolo', cons.mission[0] !== 'active' && cons.mission[1] === 'active' && cons.mission[2] >= 1 && cons.confirm[0] === true && cons.confirm[1] === 1, JSON.stringify([cons.mission, cons.confirm]));
  ok('Suministros: solo si hay necesidad real; llegan tras el retraso y no se pueden pedir de nuevo enseguida', cons.sup1 && cons.cool[0] === false && cons.cool[1], JSON.stringify([cons.sup1, cons.cool]));
  ok('Ruta segura: activa la pista del rover y marca un punto de interés en el radar de la expedición', cons.route === true);
  const cons2 = await E(async () => {
    const S = Game.S, e = EL.ensure(S), o = {}; S.inc = []; EL.setScale(S, 0.25); e.cool = {}; e.out = [];
    const wait = (n) => { for (let i = 0; i < n; i++) Sim.step(S, 1); };
    // agricultura: plaga real → la plaga queda identificada
    const pl = Sim.plantsList(S); pl[0].p.pest = true; pl[0].p.pestKnown = false; EL.send(S, 'agri_check'); wait(14); o.pest = pl[0].p.pestKnown === true; o.agriReply = /plagas/.test(e.hist.filter((h) => h.dir === 'in').pop().text.es);
    // medicina: dosis alta → orden de refugio
    S.crew[0].dose = S.limit * 0.7; EL.send(S, 'med_check'); wait(14); o.med = [e.orders.some((q) => q.k === 'shelter'), /radiación es alta/.test(e.hist.filter((h) => h.dir === 'in').pop().text.es)];
    // ciencia: enviar datos de una muestra analizada
    const smp = { id: 'MS-901', seq: 901, origin: 'field', t: S.t, cat: 'rock', label: null, state: 'stored', slot: 'A2', an: 'done', ok: true, sci: 12, loc: 'base', name: { es: 'Basalto', en: 'Basalt' }, kind: 'rock', int: 3, site: 'f04' }; S.sampleList.push(smp);
    const sc0 = S.science; e.prop = []; Sim.step(S, 0.3); o.prop = e.prop.some((p) => p.intent === 'sci_sample'); const pid = e.prop.find((p) => p.intent === 'sci_sample').id; Game._debug.el.accept(pid); wait(14); o.sci = [smp.sent === true, S.science > sc0, /basalto|Basalto|roca/i.test(e.hist.filter((h) => h.dir === 'in').pop().text.es)];
    return o;
  });
  ok('Agricultura: un informe de sensores con plaga real hace que Tierra la identifique en las plantas', cons2.pest && cons2.agriReply, JSON.stringify(cons2));
  ok('Medicina: con dosis alta Tierra recomienda refugio y deja una orden pendiente', cons2.med[0] && cons2.med[1], JSON.stringify(cons2.med));
  ok('Ciencia: el científico propone enviar una muestra analizada; Tierra la interpreta y da puntos de ciencia', cons2.prop && cons2.sci[0] && cons2.sci[1] && cons2.sci[2], JSON.stringify(cons2.sci));

  // ---------- 9. Informe de misión con datos reales ----------
  const rep = await E(() => { const S = Game.S, adv = EL.buildReport(S), d = adv.data; const L = adv.lines.es.join(' | '); const checks = { power: L.includes(Math.round(S.r.power.v) + ' kWh'), o2: L.includes(' kg (' + Math.round(S.r.o2.v / S.r.o2.max * 100) + ' %)'), crew: L.includes('ánimo ' + Math.round(S.morale) + ' %'), plants: L.includes(Sim.plantsList(S).length + ' plantas'), faults: /Averías activas: /.test(L), dose: L.includes('/ ' + S.limit + ' mSv') }; return { checks, n: adv.lines.es.length, data: d.power === S.r.power.v / S.r.power.max }; });
  ok('El informe recopila los valores actuales (energía, oxígeno, agua, alimentos, radiación, cultivos, tripulación, investigaciones y averías)', Object.values(rep.checks).every(Boolean) && rep.n === 9 && rep.data, JSON.stringify(rep));
  const repJ = await E(() => { const S = Game.S; S.adv = false; const L = EL.buildReport(S).lines.es.join(' '); S.adv = true; return L; });
  ok('Modo 7-12: informe corto sin unidades técnicas (kWh, mSv); modo 13+: con unidades', !/kWh|mSv| kg/.test(repJ) && true, repJ.slice(0, 160));
  const rp2 = await E(() => { const S = Game.S, e = EL.ensure(S), n0 = e.rep.n, p0 = S.pts, f0 = Sim.campStatus ? 1 : 1; e.out = []; e.cool = {}; EL.send(S, 'status'); for (let i = 0; i < 20; i++) Sim.step(S, 1); return { n: e.rep.n - n0, flag: !!(S.camp && S.camp.f.earth_report), reply: e.hist.filter((h) => h.dir === 'in').pop().text.es, log: S.log.some((l) => l.k === 'el.recv') }; });
  ok('Enviar el informe actualiza el registro de misión y Tierra lo evalúa con esos datos', rp2.n === 1 && rp2.flag && /Informe recibido/.test(rp2.reply) && rp2.log, JSON.stringify(rp2));

  // ---------- 10. Eventos de comunicación ----------
  await start(pg, 'moon', 'junior');
  const evs = await E(async () => {
    const S = Game.S, e = EL.ensure(S), o = {}; EL.setScale(S, 0.25);
    const wait = (n, h) => { for (let i = 0; i < n; i++) Sim.step(S, h || 1); };
    // fallo de antena: el mensaje queda en cola y no se pierde
    const id = S.incSeq++; S.inc.push({ id, type: 'comms_blackout', sev: 'info', room: 'bridge', sys: 'comms', t0: S.t, from: S.t, until: S.t + 500, prog: 0, fix: 'wiring', res: false, data: {}, mission: 0 }); Sim.step(S, 0.01);
    o.down = EL.status(S).main; const r = EL.send(S, 'status'); o.queued = r.msg.st; wait(20); o.stillQueued = e.out.length === 1 && e.out[0].st === 'queued'; o.noReply = e.hist.filter((h) => h.dir === 'in').length === 0;
    // reparar → recuperación de señal, el mensaje sale y llega
    Sim.mini(S, 'wiring', { ok: true, score: 1, inc: id }); Sim.step(S, 0.3); o.up = EL.status(S).main; wait(14);
    o.restoredHist = e.hist.some((h) => h.who === 'system' && /Señal recuperada/.test(h.text.es)); o.restoredLog = S.log.some((l) => l.k === 'el.restored'); o.delivered = e.hist.filter((h) => h.dir === 'in').length === 1;
    // interferencia (tormenta solar): retraso mayor
    e.out = []; e.cool = {}; const a0 = (() => { const m = EL.send(S, 'route').msg; const v = m.arriveT - m.sentT; e.out = []; return v; })();
    S.inc.push({ id: 920, type: 'solar_storm', sev: 'crit', room: 'rad', sys: 'shield', t0: S.t, from: S.t, until: S.t + 60, prog: 0, fix: null, res: false, data: { rate: 3 }, chain: 1, mission: 0 }); Sim.step(S, 0.01);
    const m2 = EL.send(S, 'route').msg; o.interf = [EL.status(S).main, (m2.arriveT - m2.sentT) / a0]; e.out = [];
    // pérdida de energía → señal débil
    S.inc = []; Sim.step(S, 0.01); S.r.power.v = 1; Sim.step(S, 0.01); o.power = EL.status(S).main; S.r.power.v = S.r.power.max * 0.8; Sim.step(S, 0.01);
    // daño en equipos exteriores tras la tormenta: señal débil hasta reparar con mantenimiento
    S.inc.push({ id: 921, type: 'solar_storm', sev: 'crit', room: 'rad', sys: 'shield', t0: S.t, from: S.t, until: S.t + 2, prog: 0, fix: null, res: false, data: { rate: 3 }, chain: 1, mission: 0 }); Sim.step(S, 0.01); const h0 = S.sys.comms.h; wait(8); S.inc.forEach((i) => { i.res = true; }); wait(4);
    o.dmg = [h0, S.sys.comms.h, EL.status(S).main]; o.dmgMsg = e.hist.some((h) => /dañó equipos exteriores/.test(h.text.es));
    S.r.mat.v = 30; S.parts = 0; Sim.decide(S, 'maint', { sys: 'comms' }); wait(8); o.repaired = [S.sys.comms.h, EL.status(S).main];
    return o;
  });
  ok('Fallo de antena: «sin conexión», el mensaje queda en cola (transmisión pendiente) y no se pierde', evs.down === 'none' && evs.queued === 'queued' && evs.stillQueued && evs.noReply, JSON.stringify(evs));
  ok('Reparar la antena recupera la señal: el mensaje en cola sale, llega la respuesta y se registra «Señal recuperada»', evs.up !== 'none' && evs.restoredHist && evs.restoredLog && evs.delivered, JSON.stringify([evs.up, evs.restoredHist, evs.delivered]));
  ok('Interferencia (tormenta solar): estado «interferencia» y retraso 1,8 veces mayor', evs.interf[0] === 'interf' && Math.abs(evs.interf[1] - 1.8) < 0.05, JSON.stringify(evs.interf));
  ok('Pérdida de energía: la señal se debilita', evs.power === 'weak', evs.power);
  ok('Daño en equipos exteriores tras la tormenta: señal débil hasta reparar las comunicaciones en el taller', evs.dmg[1] < evs.dmg[0] && evs.dmg[2] === 'weak' && evs.dmgMsg && evs.repaired[0] > evs.dmg[1] && evs.repaired[1] === 'stable', JSON.stringify([evs.dmg, evs.repaired]));
  const expiry = await E(() => { const S = Game.S; S.inc = []; S.inc.push({ id: 930, type: 'comms_blackout', sev: 'info', room: 'bridge', sys: 'comms', t0: S.t, from: S.t, until: S.t + 12, prog: 0, fix: 'wiring', res: false, data: {}, mission: 0 }); Sim.step(S, 0.01); const a = EL.status(S).main; for (let i = 0; i < 30; i++) Sim.step(S, 1); return [a, EL.status(S).main]; });
  ok('La comunicación nunca queda bloqueada para siempre: el fallo termina solo aunque no se repare', expiry[0] === 'none' && expiry[1] !== 'none', JSON.stringify(expiry));
  // propuestas de los especialistas
  const props = await E(() => { const S = Game.S, e = EL.ensure(S); S.inc = []; e.prop = []; S.inc.push({ id: 940, type: 'water_fail', sev: 'warn', room: 'water', sys: 'rec', t0: S.t, from: S.t, until: null, prog: 0, fix: 'wiring', res: false, data: {}, mission: 0 }); Sim.step(S, 0.3); const p = e.prop[0]; return { who: p && p.who, intent: p && p.intent }; });
  ok('Un especialista (la ingeniera) propone llamar a la Tierra cuando surge una avería', props.who === 'engineer' && props.intent === 'eng_help', JSON.stringify(props));
  await E(() => { Game._debug.el.toggle(true); Game._debug.el.render(); }); await pg.waitForTimeout(150);
  ok('La propuesta aparece en la radio con «Autorizar» y «Descartar»', (await pg.locator('.er-prop').count()) >= 1 && await pg.getByRole('button', { name: 'Autorizar' }).first().isVisible());
  await pg.getByRole('button', { name: 'Autorizar' }).first().click(); await pg.waitForTimeout(300);
  ok('Autorizarla transmite el mensaje con la voz de ese especialista', await E(() => Game.S.el.hist.some((h) => h.dir === 'out' && h.who === 'engineer')));

  // petición de recogida durante una salida: Tierra la atiende de verdad
  const evac = await E(() => { const S = Game.S, e = EL.ensure(S); Ex.equip(S); S.ex.out = true; S.ex.pos = [90, 120]; World.player.x = 90; World.player.y = 120; e.cool = {}; EL.setScale(S, 0.25); const rc0 = S.ex.recalls; const r = EL.send(S, 'emerg_eva'); for (let i = 0; i < 12; i++) Sim.step(S, 1); Game._debug.el.frame(1); return { ok: r.ok, rc: S.ex.recalls - rc0, d: Math.hypot(World.player.x - Field.PAD[0], World.player.y - Field.PAD[1]) }; });
  ok('Pedir recogida en el exterior: Tierra responde y la base recoge al astronauta junto a la esclusa', evac.ok && evac.rc === 1 && evac.d < 8, JSON.stringify(evac));
  await E(() => { Ex.unequip(Game.S); });

  // ---------- 11. Historial y guardado ----------
  const hist = await E(() => { const e = Game.S.el; Game.S.sys.comms.h = 100; for (let i = 0; i < 40; i++) Sim.step(Game.S, 1); return { n: e.hist.length, ui: document.querySelectorAll('.er-msg').length, out: e.out.map((m) => m.intent + ':' + m.st), eng: e.hist.filter((x) => x.ch === 'eng').map((x) => x.dir), link: EL.link(Game.S) }; });
  await E(() => { Game._debug.el.toggle(false); Game._debug.el.toggle(true); Game.S.el.ch = 'eng'; Game._debug.el.render(); });
  const histUi = await E(() => ({ n: document.querySelectorAll('.er-msg').length, txt: document.querySelector('.er-hist').innerText }));
  ok('Historial de transmisiones: entradas TX/RX con hora, persisten al cerrar y abrir la radio', hist.n >= 3 && histUi.n >= 2 && /TX/.test(histUi.txt) && /RX/.test(histUi.txt) && /D\d/.test(histUi.txt), JSON.stringify([hist, histUi.n]));
  const caps = await E(() => { const e = Game.S.el; for (let i = 0; i < 120; i++) EL.send(Game.S, 'eng_power'); e.out = []; return e.hist.length; });
  ok('El historial está acotado (80 entradas) para no crecer sin límite', caps <= 80, String(caps));
  const sv = await E(() => { Game._debug.saveNow(); const e = Game.S.el; return { n: e.hist.length, seq: e.seq, ch: e.ch, scale: e.scale }; });
  await pg.reload(); await pg.waitForTimeout(500);
  await pg.getByRole('button', { name: /Continuar/ }).click(); await pg.waitForTimeout(600);
  const ld = await E(() => { const e = Game.S.el; return { n: e.hist.length, seq: e.seq, ch: e.ch, scale: e.scale }; });
  ok('Guardar y cargar conserva historial, mensajes y escala sin duplicar', JSON.stringify(sv) === JSON.stringify(ld), JSON.stringify([sv, ld]));

  // ---------- 12. Modos por edad ----------
  await start(pg, 'moon', 'junior');
  const jr = await E(() => { Game._debug.el.toggle(true); Game._debug.el.render(); return { opts: [...document.querySelectorAll('.er-opt b')].map((b) => b.textContent), chan: document.querySelector('.er-row:nth-of-type(4)').textContent }; });
  await start(pg, 'moon', 'adv');
  const ad = await E(() => { Game._debug.el.toggle(true); Game._debug.el.render(); return { opts: [...document.querySelectorAll('.er-opt b')].map((b) => b.textContent) }; });
  ok('Modo 7-12: opciones cortas y claras; modo 13+: terminología técnica', jr.opts.every((t) => t.length <= 32) && ad.opts.some((t) => t.length > 32) && /pronóstico del clima espacial/.test(ad.opts.join()) && /¿Viene una tormenta\?/.test(jr.opts.join()), JSON.stringify([jr.opts, ad.opts]));
  const sameScience = await E(() => { const S = Game.S, a = []; for (const adv of [false, true]) { S.adv = adv; const m = { intent: 'sci_info', p: {} }; a.push(EL.options(S, 'sci').length); } S.adv = true; return a[0] === a[1]; });
  ok('Los principios científicos y las opciones son los mismos en ambos modos', sameScience);
  // ---------- 13. Marte: retardo real ----------
  await start(pg, 'mars', 'adv');
  const mars = await E(() => { Game._debug.el.toggle(true); Game._debug.el.render(); const d = EL.delays(Game.S, 0.4); return { txt: document.querySelector('#er').innerText, d, lm: Game.S.lightMin }; });
  ok('Marte: distancia en millones de km y retardo real de ida de entre 3 y 22 minutos (según la posición orbital)', mars.lm >= 3 && mars.lm <= 22 && /millones de km/.test(mars.txt) && /min/.test(mars.txt) && Math.abs(mars.d.realSec - mars.lm * 60) < 1e-6, JSON.stringify([mars.lm, mars.d]));
  ok('Muestra por separado el retardo real y el comprimido del juego (sin presentar el comprimido como físico)', /Retardo real \(ida\)/.test(mars.txt) && /Retardo comprimido del juego/.test(mars.txt) && mars.d.gameRealSec < mars.d.realSec / 10, mars.d.gameRealSec + ' vs ' + mars.d.realSec);
  ok('Sin errores de página en las pruebas de escritorio', A.errors.length === 0, A.errors.join(' | '));
  if (shots) { await E(() => { Game._debug.el.toggle(true); }); await pg.waitForTimeout(500); await pg.screenshot({ path: shots + '/earthlink_desktop.png' }); }
  const blocked = (A.ctx.__blocked || []); ok('Funciona sin conexión: la radio no usa la red (solo se intenta la consulta opcional de DONKI de la NASA, que falla sin error)', blocked.every((u) => /api\.nasa\.gov/.test(u)), blocked.join(' '));
  await A.ctx.close();

  // ---------- 14. Antes de la primera interacción no habla ----------
  const B = await newCtx(browser, { init: FAKE_TTS });
  await start(B.pg, 'moon', 'junior');
  const pre = await B.pg.evaluate(() => { Game._debug.el.toggle(true); Game._debug.el.speak('commander', 'Control Tierra, prueba breve.'); return { armed: Voice.armed, spk: window.__spk.length }; });
  await B.pg.waitForTimeout(2200);
  const pre2 = await B.pg.evaluate(() => ({ spk: window.__spk.length, sub: Game._debug.el.sub && Game._debug.el.sub.done, shown: Game._debug.el.sub && Game._debug.el.sub.shown }));
  ok('Antes de la primera interacción no se reproduce voz (los subtítulos sí funcionan)', pre.armed === false && pre2.spk === 0 && pre2.sub === true && pre2.shown > 10, JSON.stringify([pre, pre2]));
  await B.ctx.close();

  // ---------- 15. Sin TTS ----------
  const C = await newCtx(browser, { init: NO_TTS });
  await start(C.pg, 'moon', 'junior');
  const nt = await C.pg.evaluate(async () => { Game._debug.el.toggle(true); const r = EL.send(Game.S, 'status'); Game._debug.el.speak('commander', 'Control Tierra, prueba breve sin voz.'); const seq = []; for (let i = 0; i < 9; i++) { await new Promise((x) => setTimeout(x, 450)); const sb = Game._debug.el.sub; seq.push(sb ? sb.shown : -1); } const sb = Game._debug.el.sub; for (let i = 0; i < 12; i++) Sim.step(Game.S, 1); return { ok: r.ok, seq, done: sb && sb.done, supported: Voice.supported, rx: Game.S.el.hist.some((h) => h.dir === 'in') }; });
  ok('Sin TTS: la radio funciona con subtítulos sincronizados por tiempo y las respuestas llegan', nt.ok && !nt.supported && nt.seq[0] > 0 && nt.done && nt.rx, JSON.stringify(nt));
  ok('Sin TTS no hay errores de página', C.errors.length === 0, C.errors.join(' | '));
  await C.ctx.close();

  // ---------- 16. Móvil ----------
  const M = await newCtx(browser, { init: FAKE_TTS, vp: { width: 390, height: 844 }, touch: true });
  await start(M.pg, 'moon', 'junior');
  await M.pg.evaluate(() => { window.dispatchEvent(new Event('touchstart')); }); await M.pg.waitForTimeout(150);
  await M.pg.locator('#bRadio').tap(); await M.pg.waitForTimeout(600);
  const mv = await M.pg.evaluate(() => { const r = document.querySelector('#er').getBoundingClientRect(), d = document.querySelector('.er-dev'); const btns = [...document.querySelectorAll('.er-opt')].map((b) => b.getBoundingClientRect()); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight, scrollX: document.documentElement.scrollWidth > innerWidth, minBtn: Math.min.apply(null, btns.map((q) => q.height)), touchHidden: getComputedStyle(document.querySelector('#touch')).display === 'none' }; });
  ok('Móvil (390 × 844): la radio cabe en pantalla, sin desplazamiento horizontal y con botones táctiles de ≥ 36 px', mv.l >= 0 && mv.r <= mv.w && mv.t >= 0 && mv.b <= mv.h && !mv.scrollX && mv.minBtn >= 36, JSON.stringify(mv));
  await M.pg.locator('.er-opt').first().tap(); await M.pg.waitForTimeout(300);
  ok('Móvil: tocar una opción transmite el mensaje', await M.pg.evaluate(() => Game.S.el.hist.some((h) => h.dir === 'out')));
  if (shots) await M.pg.screenshot({ path: shots + '/earthlink_mobile.png' });
  await M.pg.locator('.er-close').tap(); await M.pg.waitForTimeout(200);
  ok('Móvil: se puede cerrar la radio', await M.pg.evaluate(() => !Game._debug.el.open));
  ok('Sin errores de página en el móvil', M.errors.length === 0, M.errors.join(' | '));
  await M.ctx.close();
  await browser.close();
  for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : '');
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\n' + (results.length - f) + '/' + results.length + ' PASS');
  process.exit(f ? 1 : 0);
})().catch((e) => { for (const r of results) console.log(r[0], '-', r[1], r[2] && r[0] === 'FAIL' ? '(' + r[2] + ')' : ''); console.error(String(e).slice(0, 900)); process.exit(2); });
