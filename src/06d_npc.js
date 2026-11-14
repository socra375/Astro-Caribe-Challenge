  /* =================== NPC: RADIO, CONVERSACIONES, VESTUARIO Y PLANTAS =================== */
  const ND = NPCDATA;
  /** ¿Quién habla en nombre de un rol? Si el jugador lleva ese traje, habla el comandante (o Control si también es él). */
  function speaker(role) {
    const pr = S ? S.playerRole : 'commander';
    if (!role || role === 'control') return 'control';
    if (role !== pr) return role;
    return pr === 'commander' ? 'control' : 'commander';
  }
  function portrait(who, size) {
    const c = h('canvas', { width: size * 2, height: size * 2, style: { width: size + 'px', height: size + 'px', borderRadius: '12px', background: '#0b1124', flex: '0 0 auto' }, 'aria-hidden': 'true' });
    const x = c.getContext('2d');
    if (who === 'control') {
      const r = size * 0.62; x.fillStyle = '#1c5fb8'; x.beginPath(); x.arc(size, size, r, 0, 7); x.fill();
      x.fillStyle = '#3ddc84'; x.beginPath(); x.ellipse(size - r * 0.25, size - r * 0.2, r * 0.45, r * 0.3, 0.6, 0, 7); x.fill(); x.beginPath(); x.ellipse(size + r * 0.4, size + r * 0.35, r * 0.3, r * 0.22, -0.4, 0, 7); x.fill();
      x.strokeStyle = '#7fd3ff'; x.lineWidth = 3; x.beginPath(); x.arc(size, size, r + 6, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(size, size, r + 14, -0.7, 0.7); x.stroke();
    } else { const k = (size * 2) / 30; Chars.draw(x, who, size, size + 55 * k, { dir: 2, t: 0, pose: 'idle', scale: k, shadow: false }); }
    return c;
  }

  /* ---------- Cola de llamadas por radio ---------- */
  const SEVR = { crit: 3, warn: 2, info: 1, ok: 1 };
  const radio = { q: [], cur: null, t: 0, recent: {} };
  function call(o) {
    // o: { key, sev, who, title, desc, loc, act, cons, target, console, why }
    const now = performance.now() / 1000;
    if (radio.cur && radio.cur.key === o.key) { Object.assign(radio.cur, o); renderRadio(); return; }
    const qi = radio.q.findIndex((x) => x.key === o.key);
    if (qi >= 0) { radio.q[qi] = Object.assign(radio.q[qi], o); return; }
    if (o.sev !== 'crit' && radio.recent[o.key] && now - radio.recent[o.key] < 45) return; // no repetir lo mismo sin control
    radio.recent[o.key] = now;
    o.at = now;
    if (radio.cur && SEVR[o.sev] > SEVR[radio.cur.sev]) { radio.q.push(radio.cur); radio.cur = null; }
    radio.q.push(o);
    radio.q.sort((a, b) => SEVR[b.sev] - SEVR[a.sev] || a.at - b.at);
    if (radio.q.length > 8) radio.q = radio.q.slice(0, 8);
    if (!radio.cur) nextCall();
    else renderRadio();
  }
  function nextCall() {
    radio.cur = radio.q.shift() || null; radio.t = 0;
    if (radio.cur) Sfx.play(radio.cur.sev === 'crit' ? 'crit' : radio.cur.sev === 'warn' ? 'warn' : 'info');
    renderRadio();
  }
  function dismissCall() { nextCall(); }
  function tickRadio(dt) {
    if (!radio.cur || paused || modalOpen()) return;
    radio.t += dt;
    const life = radio.cur.sev === 'crit' ? Infinity : radio.cur.sev === 'warn' ? 18 : 9;
    if (radio.t > life) nextCall();
  }
  function renderRadio() {
    const box = $('#radio');
    if (!radio.cur || !running) { box.classList.add('hidden'); box.innerHTML = ''; $('#hint').style.visibility = ''; return; }
    const c = radio.cur, who = c.who || 'control', P = ND.PEOPLE[who];
    const es = LANG === 'es';
    box.className = 'radio ' + c.sev;
    box.innerHTML = '';
    box.append(
      portrait(who, 64),
      h('div', { class: 'col', style: { gap: '4px', minWidth: 0, flex: '1' } },
        h('div', { class: 'row', style: { gap: '6px' } }, h('b', null, '📻 ' + tr(P.name)), h('span', { class: 'small muted' }, tr(P.spec)), tag(SEVI[c.sev] + ' ' + _(c.sev === 'ok' ? 'info' : c.sev), c.sev === 'ok' ? 'info' : c.sev), radio.q.length ? h('span', { class: 'small muted' }, '+' + radio.q.length) : null),
        h('div', { class: 'radio-title' }, c.title),
        c.desc ? h('div', { class: 'small r-desc' }, c.desc) : null,
        c.loc ? h('div', { class: 'small' }, '📍 ' + c.loc) : null,
        c.act ? h('div', { class: 'small' }, '👉 ' + c.act) : null,
        c.cons ? h('div', { class: 'small muted r-cons' }, '⚠ ' + (es ? 'Si lo ignoras: ' : 'If ignored: ') + c.cons) : null,
        h('div', { class: 'row', style: { gap: '6px', marginTop: '2px' } },
          btn('✔ ' + (es ? 'Entendido' : 'Got it'), dismissCall, 'sm primary'),
          c.target ? btn('📍 ' + (es ? 'Marcar ubicación' : 'Mark location'), () => { World.setMarker(c.target, c.loc); toast(es ? 'Ubicación marcada en el minimapa' : 'Location marked on the minimap', c.loc, 'info'); }, 'sm') : null,
          c.console ? btn('🖥️ ' + (es ? 'Consultar sistema' : 'Check system'), () => { openConsole({ id: c.console }); }, 'sm') : null,
          c.why ? btn('❓ ' + (es ? 'Ver explicación' : 'See explanation'), () => (DATA.EVT[c.why] ? whyPanel(c.why) : null), 'sm') : null)));
    box.classList.remove('hidden');
    $('#hint').style.visibility = 'hidden';
  }
  function roomLoc(room, sysK) { const r = tr(DATA.ROOMS[room] || DATA.ROOMS.hall), sy = sysK && DATA.SYS_T[sysK] ? tr(DATA.SYS_T[sysK]) : ''; return r + (sy && sy !== r ? ' · ' + sy : ''); }
  function consoleTarget(id, room) { return (id && World.consolePos(id)) || (room && World.roomCenter(room)) || null; }
  /** Convierte entradas del registro del motor en llamadas de NPC (o devuelve false si no corresponde). */
  function logToRadio(e) {
    const k = e.k, p = e.p || {}, es = LANG === 'es';
    if (k.startsWith('ev.') || k === 'esc') {
      const ty = k === 'esc' ? p.type : k.slice(3), T = DATA.EVT[ty]; if (!T) return false;
      const inc = S.inc.find((i) => i.id === p.id) || {};
      const room = inc.room || 'hall', cons = ND.INC_CONSOLE[ty] || (inc.sys === 'reactor' || inc.sys === 'solar' ? 'reactor' : inc.sys === 'shield' ? 'shield' : inc.sys === 'o2' ? 'o2' : null);
      let loc = roomLoc(room, inc.sys), tgt = consoleTarget(cons, room);
      if (ty === 'crop_fail') { const sick = Sim.plantsList(S).filter((x) => x.p.pest); if (sick.length) { loc = tr(DATA.ROOMS.gh) + ' · ' + (es ? 'jardineras ' : 'planters ') + [...new Set(sick.map((x) => x.bi + 1))].join(', '); tgt = World.plantPos(sick[0].bi, sick[0].k); } }
      call({ key: 'inc' + (inc.id || ty), sev: e.sev, who: ND.INC_NPC[ty], title: (k === 'esc' ? (es ? '¡Empeoró! ' : 'Getting worse! ') : (e.sev === 'crit' ? (es ? '¡Atención! ' : 'Attention! ') : '')) + tr(T.t),
        desc: tr(T.what) + (p.lead ? ' ' + (es ? 'Llegará en ' : 'Arrives in ') + fmt(p.lead) + ' h.' : ''), loc, act: tr(T.act), cons: tr(ND.CONSEQ[ty]), target: tgt, console: cons, why: ty });
      return true;
    }
    if (k.startsWith('res.')) {
      const ty = k.slice(4); if (!DATA.EVT[ty]) return false;
      call({ key: 'res' + p.id, sev: 'ok', who: ND.INC_NPC[ty], title: (es ? 'Resuelto: ' : 'Resolved: ') + tr(DATA.EVT[ty].t), desc: p.how === 'engineer' ? (es ? '¡Lo reparé yo! Todo vuelve a la normalidad.' : 'I fixed it! Everything is back to normal.') : p.how === 'expired' ? (es ? 'El fenómeno terminó.' : 'The event is over.') : (es ? '¡Buen trabajo! El sistema funciona otra vez.' : 'Good job! The system works again.') });
      return true;
    }
    if (k === 'camp.done') {
      const room = p.room, g = ND.GUIDE[room];
      call({ key: 'camp' + p.id, sev: 'info', who: g, title: (es ? '¡Misión completada! ' : 'Mission complete! ') + tr(ND.CAMP[p.id].t), desc: (es ? 'Se ha desbloqueado: ' : 'Unlocked: ') + tr(DATA.ROOMS[room]) + '. ' + (es ? '¡Ven a verme!' : 'Come and see me!'), loc: tr(DATA.ROOMS[room]), target: World.roomCenter(room) });
      World.setAct('all', 'celebrate', 3);
      return true;
    }
    if (k === 'camp.basic') { call({ key: 'campbasic', sev: 'info', who: 'commander', title: es ? 'Familiarización terminada' : 'Familiarization complete', desc: es ? 'Ya conoces las siete secciones. Las misiones avanzadas están disponibles en la consola de mando.' : 'You know all seven sections. Advanced missions are available at the command console.', target: World.consolePos('cmd'), console: 'cmd' }); return true; }
    if (k === 'camp.start') { const C = ND.CAMP[p.id]; call({ key: 'cs' + p.id, sev: 'info', who: 'commander', title: (es ? 'Nueva misión: ' : 'New mission: ') + tr(C.t), desc: tr(C.b) }); return true; }
    if (k === 'crop.dead') { call({ key: 'dead' + e.n, sev: 'warn', who: 'agri', title: es ? 'Se perdió una planta' : 'A plant died', desc: (p.sp ? tr(Flora.SPECIES[p.sp].name) + ' · ' : '') + (es ? 'jardinera ' : 'planter ') + p.bed, loc: tr(DATA.ROOMS.gh), act: es ? 'Revisa humedad, luz y nutrientes de las otras plantas.' : 'Check moisture, light and nutrients of the other plants.', target: World.plantPos(p.bed - 1, 1), console: 'gh' }); return true; }
    if (k === 'job.analyze') { call({ key: 'an' + e.n, sev: 'ok', who: 'scientist', title: es ? 'Análisis terminado' : 'Analysis done', desc: es ? 'La muestra contiene minerales típicos del regolito. +12 puntos de ciencia.' : 'The sample has typical regolith minerals. +12 science points.' }); return true; }
    return false;
  }
  /** Vigila umbrales de recursos y avisa mediante el NPC responsable. */
  const resState = {};
  function watchResources() {
    if (!S || S.ended) return;
    for (const k of Object.keys(ND.RES)) {
      const st = Sim.status(S, k === 'dose' ? 'dose' : k);
      const prev = resState[k] || 'ok'; resState[k] = st;
      if (st === 'ok' || (st === prev)) continue;
      if (SEVR[st] < SEVR[prev]) continue;
      const R = ND.RES[k], room = ND.RES_ROOM[k];
      const val = k === 'dose' ? fmt(S.d.dose) + ' mSv' : Math.round((S.d[k] || 0) * 100) + ' %';
      call({ key: 'res_' + k + st, sev: st, who: R.npc, title: tr(R.d) + ' (' + val + ')', desc: '', loc: tr(DATA.ROOMS[room]), act: tr(R.a), cons: tr(R.c), target: consoleTarget(R.console, room), console: R.console });
    }
  }

  /* ---------- Conversaciones de bienvenida ---------- */
  function talk(room, replay) {
    const lines = ND.TALK[room]; if (!lines) return;
    const who = speaker(ND.GUIDE[room] === 'commander' ? 'commander' : ND.GUIDE[room]);
    let i = 0;
    const s = push(h('div'), { sticky: true });
    const draw = () => {
      const P = ND.PEOPLE[who];
      const box = h('div', { class: 'panel narrow talk' },
        h('div', { class: 'row', style: { alignItems: 'flex-start', flexWrap: 'nowrap' } }, portrait(who, 72),
          h('div', { class: 'col', style: { gap: '2px' } }, h('b', null, tr(P.name)), h('span', { class: 'small muted' }, tr(P.spec)), h('span', { class: 'small muted' }, '📍 ' + tr(DATA.ROOMS[room])))),
        h('p', { class: 'bubble', 'aria-live': 'polite' }, tr(lines[i])),
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('span', { class: 'small muted' }, (i + 1) + ' / ' + lines.length),
          h('div', { class: 'row' }, i < lines.length - 1 ? btn(_('skip'), finish, 'sm') : null, btn(i < lines.length - 1 ? _('next') + ' ▶' : (LANG === 'es' ? '¡Entendido!' : 'Got it!'), () => { if (i < lines.length - 1) { i++; s.replaceChild(draw(), s.firstChild); focusFirst(s); } else finish(); }, 'primary', { autofocus: true }))));
      return box;
    };
    function finish() { pop(); if (!replay && S) { S.camp.visited[room] = 1; Sim.campFlag(S, 'talk_' + room); saveRun(); } }
    s.replaceChild(draw(), s.firstChild); focusFirst(s);
  }
  function talksPanel() {
    const es = LANG === 'es';
    const rooms = ['bridge', 'life', 'reactor', 'water', 'gh', 'lab', 'rad'];
    push(panel('💬 ' + (es ? 'Conversaciones con los guías' : 'Guide conversations'), h('div', { class: 'grid2' }, rooms.map((r) => {
      const ok = S && S.camp && S.camp.visited[r];
      return h('div', { class: 'card' }, h('h3', null, tr(DATA.ROOMS[r])), h('p', { class: 'small muted' }, tr(ND.PEOPLE[ND.GUIDE[r]].name)), ok ? btn('▶ ' + (es ? 'Escuchar de nuevo' : 'Listen again'), () => talk(r, true), 'sm') : h('p', { class: 'small muted' }, '🔒 ' + (es ? 'Visita la sección primero.' : 'Visit the section first.')));
    }))));
  }
  let lastRoom = null;
  function checkRoomVisit() {
    if (!S || !S.camp || modalOpen() || S.ended) return;
    const rn = World.roomName(World.player.x, World.player.y);
    const room = rn === 'lock' || rn === 'pad' ? 'rad' : rn;
    if (room === lastRoom) return;
    lastRoom = room;
    if (ND.TALK[room] && S.camp.unlocked[room] && !S.camp.visited[room]) talk(room);
  }

  /* ---------- Vestuario y permisos ---------- */
  const ROOMS_OF = { commander: ['bridge'], medic: ['life', 'water'], engineer: ['reactor', 'water', 'rad'], agri: ['gh'], scientist: ['lab', 'rad'] };
  function wardrobePanel() {
    const es = LANG === 'es';
    const cards = Chars.ORDER.map((role) => {
      const R = Chars.ROLES[role], cur = S.playerRole === role;
      const cv = h('canvas', { width: 120, height: 150, style: { width: '90px', height: '112px', background: '#0b1124', borderRadius: '10px' }, 'aria-hidden': 'true' });
      Chars.draw(cv.getContext('2d'), role, 60, 140, { dir: 2, t: 0.5, pose: cur ? 'celebrate' : 'idle', scale: 1.9 });
      return h('div', { class: 'card', style: cur ? { borderColor: 'var(--accent)' } : {} },
        h('div', { class: 'row', style: { flexWrap: 'nowrap', alignItems: 'flex-start' } }, cv, h('div', { class: 'col', style: { gap: '4px' } },
          h('h3', null, tr(R.name)), h('span', { class: 'small' }, tr(DATA.ROLE_T[role].b)),
          h('span', { class: 'small muted' }, (es ? 'Opera: ' : 'Operates: ') + ROOMS_OF[role].map((r) => tr(DATA.ROOMS[r])).join(', ')),
          h('span', { class: 'small muted' }, '◆ ' + tr(R.acc)))),
        cur ? tag('✔ ' + (es ? 'Lo llevas puesto' : 'You are wearing it'), 'ok') : btn('🧥 ' + (es ? 'Ponerse este traje' : 'Wear this suit'), () => {
          World.setPlayerRole(role); Sim.setPlayerRole(S, role); saveRun(); pop();
          toast((es ? 'Ahora eres: ' : 'You are now: ') + tr(R.name), es ? 'El especialista titular te acompaña como apoyo.' : 'The regular specialist stays on as support.', 'ok');
        }, 'primary sm'));
    });
    push(panel('🧥 ' + (es ? 'Vestuario de especialistas' : 'Specialist wardrobe'), h('div', null,
      h('p', { class: 'small' }, S.camp && !S.camp.basicDone ? (es ? 'Durante la familiarización puedes operar todo. Después, cada sección pedirá su especialista.' : 'During familiarization you can operate everything. Afterwards, each section needs its specialist.') : (es ? 'Cada sección necesita su especialista. Pasillos y zonas comunes son libres, y en una emergencia cualquiera puede reparar.' : 'Each section needs its specialist. Corridors and common areas are open, and in an emergency anyone can repair.')),
      h('div', { class: 'grid2' }, cards))));
  }
  function allowed(id) {
    if (!S || !S.camp || !S.camp.basicDone) return true;
    const need = ND.ACCESS[id]; return !need || need.includes(S.playerRole);
  }
  function gatePanel(id, room) {
    const es = LANG === 'es', need = ND.ACCESS[id];
    const incs = Sim.activeInc(S).filter((i) => i.room === room && i.fix && S.t >= i.from);
    const storm = id === 'shield' && S.inc.some((i) => i.type === 'solar_storm' && !i.res) && !S.proto;
    push(panel('🔐 ' + (es ? 'Se necesita otro especialista' : 'Another specialist is needed'), h('div', null,
      h('p', null, (es ? 'Esta operación la realiza: ' : 'This operation is done by: ') + need.map((r) => tr(Chars.ROLES[r].name)).join(es ? ' o ' : ' or ') + '.'),
      h('p', { class: 'small muted' }, (es ? 'Llevas el traje de ' : 'You are wearing the ') + tr(Chars.ROLES[S.playerRole].name) + (es ? '. Cámbialo en el vestuario 🧥 del puente de mando.' : ' suit. Change it at the 🧥 wardrobe on the bridge.')),
      h('div', { class: 'row' }, btn('📍 ' + (es ? 'Marcar el vestuario' : 'Mark the wardrobe'), () => { World.setMarker(World.consolePos('wardrobe'), 'wardrobe'); pop(); }, 'primary'),
        incs.map((i) => btn('🔧 ' + (es ? 'Reparación de emergencia: ' : 'Emergency repair: ') + tr(DATA.EVT[i.type].t), () => { pop(); miniIntro(i.fix === 'o2' ? 'o2' : i.fix === 'gh' ? 'gh' : 'wiring', { inc: i.id }); }, 'danger')),
        storm ? btn('🚨 ' + (es ? 'Activar protocolo de refugio (emergencia)' : 'Turn on shelter protocol (emergency)'), () => { pop(); confirmDecision('proto', { v: true }, es ? 'Protocolo de refugio' : 'Shelter protocol'); }, 'danger') : null)), { narrow: true }));
  }

  /* ---------- Ficha de planta ---------- */
  const ISSUE = {
    dry: { es: 'Estrés hídrico: el sustrato está seco y las hojas se caen.', en: 'Water stress: the substrate is dry and leaves droop.' },
    wet: { es: 'Exceso de agua: las raíces no respiran y las hojas viejas amarillean.', en: 'Too much water: roots cannot breathe and old leaves turn yellow.' },
    dark: { es: 'Poca luz: la planta se estira, palidece y crece despacio.', en: 'Too little light: the plant stretches, turns pale and grows slowly.' },
    nutr: { es: 'Faltan nutrientes: las hojas se ponen amarillas (clorosis).', en: 'Nutrients are low: leaves turn yellow (chlorosis).' },
    temp: { es: 'La temperatura no es la adecuada para esta especie.', en: 'The temperature is not right for this species.' },
    pest: { es: 'Plaga detectada: pequeños insectos sobre las hojas.', en: 'Pest detected: tiny insects on the leaves.' },
    pestHint: { es: 'Se ven manchas raras en las hojas. Usa «Identificar problemas».', en: 'Odd spots on the leaves. Use "Identify problems".' },
    prune: { es: 'Demasiadas ramas u hojas: conviene podar.', en: 'Too many branches or leaves: pruning helps.' },
    ok: { es: 'La planta está sana.', en: 'The plant is healthy.' }
  };
  const FIX = { dry: { es: 'Riégala.', en: 'Water it.' }, wet: { es: 'No la riegues y baja el riego automático.', en: 'Do not water it and lower automatic irrigation.' }, dark: { es: 'Sube la luz LED de la jardinera (gasta energía).', en: 'Raise the planter LED (uses energy).' }, nutr: { es: 'Añade nutrientes.', en: 'Add nutrients.' }, temp: { es: 'Revisa el control térmico del módulo de vida.', en: 'Check thermal control in the habitation module.' }, pest: { es: 'Poda las hojas afectadas.', en: 'Prune the affected leaves.' }, pestHint: { es: 'Identifica el problema.', en: 'Identify the problem.' }, prune: { es: 'Pódala.', en: 'Prune it.' }, ok: { es: 'Sigue así.', en: 'Keep it up.' } };
  function plantIssues(pl) {
    const c = Sim.CROPS[pl.sp], out = [];
    if (pl.moist < 28) out.push('dry'); if (pl.moist > 82) out.push('wet');
    if (pl.light < c.light * 0.6) out.push('dark'); if (pl.nutr < 25) out.push('nutr');
    if (Math.abs(S.sys.thermal.T - c.T) > 6) out.push('temp');
    if (pl.pest) out.push(pl.pestKnown ? 'pest' : 'pestHint');
    if (pl.prune > 0.6) out.push('prune');
    return out.length ? out : ['ok'];
  }
  function plantCard(bed, slot) {
    const es = LANG === 'es';
    if (!S) return;
    if (S.camp && S.camp.unlocked && !S.camp.unlocked.gh) return;
    const can = allowed('plant');
    let harvested = null;
    livePanel(() => {
      const b = S.beds[bed], pl = b.plants[slot];
      const body = h('div');
      if (harvested) {
        const cvh = h('canvas', { width: 220, height: 220, style: { width: '160px', background: '#1c4331', borderRadius: '12px' }, 'aria-hidden': 'true' });
        Flora.drawHarvested(cvh.getContext('2d'), harvested.sp, 110, harvested.sp === 'radish' ? 70 : 190, harvested.sp === 'radish' ? 5 : 4);
        body.append(h('div', { class: 'row', style: { flexWrap: 'nowrap' } }, cvh, h('div', null, h('h3', null, '🧺 ' + tr(Flora.SPECIES[harvested.sp].name)),
          h('p', null, harvested.kg > 0 ? '+' + fmt(harvested.kg, 2) + ' kg ' + _('food') : (es ? 'No es comestible, pero la moral sube (+5).' : 'Not edible, but morale rises (+5).')),
          h('p', null, '🌰 +' + harvested.seeds + (es ? ' semillas' : ' seeds')), harvested.sp === 'radish' ? h('p', { class: 'small muted' }, es ? 'La raíz roja es la parte que se come; las hojas también son comestibles.' : 'The red root is the part we eat; the leaves are edible too.') : null)));
        harvested = null;
      }
      if (!pl) {
        body.append(h('p', null, es ? 'Hueco vacío. Elige qué sembrar (cuesta 1 semilla, 0,5 L de agua y 0,2 L de nutrientes):' : 'Empty slot. Choose what to plant (costs 1 seed, 0.5 L water and 0.2 L nutrients):'),
          h('div', { class: 'grid2' }, Object.keys(Flora.SPECIES).map((sp) => {
            const cv = h('canvas', { width: 120, height: 110, style: { width: '80px', background: '#1c4331', borderRadius: '10px' }, 'aria-hidden': 'true' });
            Flora.draw(cv.getContext('2d'), sp, 60, 100, 2.4, { prog: 1, hp: 100, moist: 55, nutr: 70, light: 1, seed: 3 });
            return h('div', { class: 'card row', style: { flexWrap: 'nowrap' } }, cv, h('div', { class: 'col', style: { gap: '4px' } }, h('b', null, tr(Flora.SPECIES[sp].name)), h('span', { class: 'small muted' }, '🌰 ' + (S.seeds[sp] || 0)),
              btn('🌱 ' + (es ? 'Sembrar' : 'Plant'), () => act('plant', { bed, slot, sp }), 'sm primary', { disabled: !can || !(S.seeds[sp] > 0) ? true : null })));
          })));
        return panel('🌱 ' + (es ? 'Jardinera ' : 'Planter ') + (bed + 1) + ' · ' + (es ? 'hueco ' : 'slot ') + (slot + 1), body);
      }
      const c = Sim.CROPS[pl.sp], sg = Flora.stage(pl.prog), issues = plantIssues(pl);
      const cv = h('canvas', { width: 260, height: 260, style: { width: '180px', background: 'linear-gradient(#1c4331,#14301f)', borderRadius: '12px' }, 'aria-label': tr(Flora.SPECIES[pl.sp].name) });
      const x = cv.getContext('2d'); x.fillStyle = '#3b2414'; x.fillRect(30, 222, 200, 22); Flora.draw(x, pl.sp, 130, 226, 5.6, pl, null);
      const row = (label, v, col, txt) => h('div', { class: 'col', style: { gap: '2px', margin: '4px 0' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'small' }, label), h('b', { class: 'small' }, txt)), bar(v, col));
      const lightNeed = c.light;
      body.append(h('div', { class: 'row', style: { flexWrap: 'wrap', alignItems: 'flex-start' } }, cv,
        h('div', { class: 'col', style: { flex: '1', minWidth: '220px', gap: '2px' } },
          h('div', { class: 'row' }, tag(Flora.STAGES[LANG][sg] + ' (' + (sg + 1) + '/5)', 'info'), tag('🕒 ' + fmt(pl.age / 24, 1) + (es ? ' días' : ' days'))),
          row('❤️ ' + (es ? 'Salud' : 'Health'), pl.hp / 100, pl.hp < 40 ? 'var(--danger)' : pl.hp < 70 ? 'var(--warning)' : 'var(--success)', Math.round(pl.hp) + ' %'),
          row('💧 ' + (es ? 'Humedad (ideal 35–75 %)' : 'Moisture (ideal 35–75%)'), pl.moist / 100, pl.moist < 28 || pl.moist > 82 ? 'var(--danger)' : '#38d6ff', Math.round(pl.moist) + ' %'),
          row('🧪 ' + (es ? 'Nutrientes' : 'Nutrients'), pl.nutr / 100, pl.nutr < 25 ? 'var(--warning)' : '#a58cff', Math.round(pl.nutr) + ' %'),
          row('💡 ' + (es ? 'Iluminación (necesita ' : 'Light (needs ') + Math.round(lightNeed * 100) + ' %)', pl.light, pl.light < lightNeed * 0.6 ? 'var(--warning)' : '#ff6ad5', Math.round(pl.light * 100) + ' %'),
          row('🌡️ ' + (es ? 'Temperatura (óptima ' : 'Temperature (optimal ') + c.T + ' °C)', clampN(1 - Math.abs(S.sys.thermal.T - c.T) / 10, 0, 1), '#ff8a65', fmt(S.sys.thermal.T) + ' °C'),
          row('📈 ' + (es ? 'Crecimiento (ciclo de 7 días)' : 'Growth (7-day cycle)'), pl.prog, '#ffd36b', Math.round(pl.prog * 100) + ' %'))));
      // Diagnóstico y orientación del agrónomo
      const shown = pl.inspected ? issues : ['pestHint'].filter(() => pl.pest && !pl.pestKnown).concat(issues.filter((i) => ['dry', 'wet'].includes(i)));
      const who = 'agri';
      body.append(h('div', { class: 'card', style: { marginTop: '8px' } }, h('div', { class: 'row', style: { flexWrap: 'nowrap', alignItems: 'flex-start' } }, portrait(who, 48), h('div', null,
        h('b', null, tr(ND.PEOPLE[who].name) + (S.playerRole === 'agri' ? (es ? ' (por radio)' : ' (by radio)') : '') + ': '),
        pl.inspected ? h('span', null, issues.map((i) => tr(ISSUE[i]) + ' ' + tr(FIX[i])).join(' ')) : h('span', null, (shown.length ? shown.map((i) => tr(ISSUE[i])).join(' ') + ' ' : '') + (es ? 'Inspecciónala para un diagnóstico completo.' : 'Inspect it for a full diagnosis.')),
        pl.inspected ? h('p', { class: 'small' }, '🌿 ' + tr(ND.PLANT[pl.sp].needs)) : null,
        pl.inspected ? h('p', { class: 'small muted' }, es ? 'Agua, luz y nutrientes trabajan juntos: si falta uno, los otros no bastan. Demasiada agua también daña las raíces.' : 'Water, light and nutrients work together: if one is missing, the others are not enough. Too much water also harms roots.') : null,
        h('p', { class: 'small muted' }, '🛰️ ' + tr(ND.PLANT[pl.sp].fact))))));
      // Acciones
      const nutrCost = S.playerRole === 'agri' ? 0.22 : 0.3;
      const canPrune = pl.prune > 0.6 || (pl.pest && pl.pestKnown) || (pl.hp < 70 && sg >= 2);
      body.append(h('div', { class: 'row', style: { marginTop: '8px' } },
        btn('💧 ' + (es ? 'Regar' : 'Water') + ' (−0,3 L)', () => act('water', { bed, slot }), '', { disabled: !can ? true : null }),
        btn('🧪 ' + (es ? 'Nutrientes' : 'Nutrients') + ' (−' + fmt(nutrCost, 2) + ' L)', () => act('feed', { bed, slot }), '', { disabled: !can ? true : null }),
        btn('💡− LED', () => act('bedlight', { bed, v: Math.max(0, b.light - 0.2) }), 'sm', { disabled: !can ? true : null, title: es ? 'Ahorra energía' : 'Saves energy' }),
        h('span', { class: 'small' }, Math.round(b.light * 100) + '% · ' + fmt(b.light * Sim.P.LIGHT_KW_PER_BED, 2) + ' kW'),
        btn('💡+ LED', () => act('bedlight', { bed, v: Math.min(1, b.light + 0.2) }), 'sm', { disabled: !can ? true : null, title: es ? 'Gasta más energía' : 'Uses more energy' }),
        btn('🔍 ' + (es ? 'Inspeccionar' : 'Inspect'), () => act('inspect', { bed, slot })),
        btn('🩺 ' + (es ? 'Identificar problemas' : 'Identify problems'), () => act('identify', { bed, slot }), '', { disabled: !can ? true : null }),
        btn('✂️ ' + (es ? 'Podar' : 'Prune'), () => act('prune', { bed, slot }), '', { disabled: !can || !canPrune ? true : null }),
        btn('🧺 ' + (es ? 'Cosechar' : 'Harvest'), () => { const r = Sim.harvest(S, bed, slot); if (r) { harvested = r; processLogs(); } updateHud(); stack.forEach((z) => z._refresh && z._refresh()); }, 'primary', { disabled: !can || pl.prog < 1 ? true : null })),
        !can ? h('p', { class: 'small muted' }, '🔐 ' + (es ? 'Solo el agrónomo puede cuidar las plantas. Cambia de traje en el vestuario.' : 'Only the agronomist can tend plants. Change suits at the wardrobe.')) : null,
        h('p', { class: 'small muted' }, (es ? 'Reservas: ' : 'Stock: ') + '💧 ' + fmt(S.r.water.v, 0) + ' L · 🧪 ' + fmt(S.r.nutr.v, 1) + ' L · ⚡ ' + fmt(S.r.power.v, 0) + ' kWh · ' + (es ? 'El ciclo de 7 días es una simplificación del juego, no la duración real de cada cultivo.' : 'The 7-day cycle is a game simplification, not each crop\'s real duration.')));
      return panel('🌱 ' + tr(Flora.SPECIES[pl.sp].name) + ' · ' + (es ? 'jardinera ' : 'planter ') + (bed + 1), body);
    });
    function act(id, p) {
      const r = Sim.decide(S, id, p);
      if (!r.ok) toast(_('err'), _(r.err) !== r.err ? _(r.err) : r.err, 'warn'); else Sfx.play(id === 'water' ? 'pick' : 'click');
      processLogs(); updateHud(); stack.forEach((z) => z._refresh && z._refresh());
    }
  }
