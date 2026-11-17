/* =================== INICIO: carga real, edad, misión, dificultad y resumen =================== */
  // Iconos propios del inicio (SVG en línea: no dependen de la fuente de emojis del dispositivo)
  const WIZ_SVG = {
    ship: '<svg viewBox="-14 0 78 32" width="64" height="26"><path d="M4 16 L-12 9 L-6 16 L-12 23 Z" fill="#ffb454"/><path d="M-2 16 L-8 12.5 L-5 16 L-8 19.5 Z" fill="#fff3c4"/><path d="M12 7 L2 1 L6 16 L2 31 L12 25 Z" fill="#6b7cff"/><path d="M4 16 L18 8 H40 Q58 10 62 16 Q58 22 40 24 H18 Z" fill="#e6edff"/><path d="M42 8.5 Q58 10 62 16 Q58 22 42 23.5 Z" fill="#a98bff"/><circle cx="33" cy="16" r="4.2" fill="#38d6ff" stroke="#0b1b3a" stroke-width="1.5"/></svg>',
    earth: '<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="21" fill="#2f7bff"/><path d="M12 16 Q20 8 26 14 Q22 22 14 24 Q8 22 12 16Z M28 26 Q38 22 40 30 Q36 40 28 38 Q24 32 28 26Z" fill="#5fe39a"/><circle cx="24" cy="24" r="21" fill="none" stroke="#bcd7ff" stroke-width="2" opacity=".6"/></svg>',
    dest: '<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="14" fill="#a98bff"/><circle cx="19" cy="19" r="5" fill="#d8c9ff" opacity=".7"/><ellipse cx="24" cy="26" rx="23" ry="6" fill="none" stroke="#d8c9ff" stroke-width="3" transform="rotate(-18 24 26)"/></svg>',
    moon: '<svg viewBox="0 0 48 48" width="52" height="52"><circle cx="24" cy="24" r="21" fill="#cfd5e3"/><circle cx="16" cy="18" r="5" fill="#9aa2b8"/><circle cx="30" cy="30" r="6.5" fill="#9aa2b8"/><circle cx="31" cy="14" r="3" fill="#9aa2b8"/><circle cx="24" cy="24" r="21" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>',
    mars: '<svg viewBox="0 0 48 48" width="52" height="52"><circle cx="24" cy="24" r="21" fill="#d9623f"/><path d="M8 26 Q18 20 26 26 Q34 32 42 24 Q42 38 24 44 Q10 40 8 26Z" fill="#a8412a"/><ellipse cx="24" cy="6" rx="8" ry="3" fill="#fff" opacity=".8"/><circle cx="24" cy="24" r="21" fill="none" stroke="#ffd0bd" stroke-width="2" opacity=".5"/></svg>',
    station: '<svg viewBox="0 0 64 48" width="64" height="52"><rect x="2" y="16" width="16" height="16" rx="2" fill="#3b82f6"/><rect x="46" y="16" width="16" height="16" rx="2" fill="#3b82f6"/><path d="M18 24 H46" stroke="#cfd5e3" stroke-width="4"/><rect x="24" y="12" width="16" height="24" rx="4" fill="#e6edff"/><circle cx="32" cy="24" r="5" fill="#38d6ff"/><path d="M32 12 V4 M28 4 H36" stroke="#cfd5e3" stroke-width="2.5"/></svg>',
    science: '<svg viewBox="0 0 48 48" width="52" height="52"><path d="M18 4 H30 M20 4 V18 L8 40 Q6 44 11 44 H37 Q42 44 40 40 L28 18 V4" fill="none" stroke="#e6edff" stroke-width="3" stroke-linejoin="round"/><path d="M13 32 H35 L40 41 Q41 44 37 44 H11 Q7 44 8 41Z" fill="#5fe39a"/><circle cx="22" cy="26" r="2.5" fill="#a98bff"/><circle cx="29" cy="22" r="2" fill="#38d6ff"/></svg>',
    compass: '<svg viewBox="0 0 48 48" width="52" height="52"><circle cx="24" cy="24" r="20" fill="none" stroke="#38d6ff" stroke-width="3"/><path d="M24 8 L30 24 L24 40 L18 24Z" fill="#e6edff"/><path d="M24 8 L30 24 H18Z" fill="#ff6b6b"/><circle cx="24" cy="24" r="2.5" fill="#0b1b3a"/></svg>',
    cadet: '<svg viewBox="0 0 48 48" width="52" height="52"><path d="M24 4 L42 10 V24 Q42 38 24 45 Q6 38 6 24 V10Z" fill="#3b82f6" stroke="#bcd7ff" stroke-width="2.5"/><path d="M24 14 L27 21 L35 22 L29 27 L31 35 L24 31 L17 35 L19 27 L13 22 L21 21Z" fill="#e6edff"/></svg>',
    star: '<svg viewBox="0 0 48 48" width="52" height="52"><path d="M24 3 L30 17 L45 18 L33 28 L37 43 L24 35 L11 43 L15 28 L3 18 L18 17Z" fill="#ffd25e" stroke="#fff3c4" stroke-width="2" stroke-linejoin="round"/></svg>'
  };
  const logoImg = () => h('img', { class: 'logo-img', src: LOGO_SRC, alt: 'Space Explorer', width: 220, height: 232, draggable: 'false' });
  const wizIco = (k, cls) => h('span', { class: cls || 'mico', html: WIZ_SVG[k], 'aria-hidden': 'true' });
  // Ilustraciones de las tarjetas de misión (SVG en línea, 320×120)
  const SCENE = {
    moon: '<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sg-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05071a"/><stop offset="1" stop-color="#1b2150"/></linearGradient></defs><rect width="320" height="120" fill="url(#sg-m)"/><g fill="#fff" opacity=".8"><circle cx="30" cy="20" r="1.2"/><circle cx="90" cy="34" r="1"/><circle cx="150" cy="14" r="1.3"/><circle cx="210" cy="30" r="1"/><circle cx="270" cy="12" r="1.2"/></g><circle cx="262" cy="30" r="14" fill="#2f7bff"/><path d="M252 26 Q260 20 266 27 Q262 34 254 35Z" fill="#5fe39a"/><ellipse cx="160" cy="150" rx="230" ry="62" fill="#b9bfd0"/><ellipse cx="110" cy="104" rx="16" ry="5" fill="#8d94a8"/><ellipse cx="236" cy="112" rx="22" ry="6" fill="#8d94a8"/><path d="M150 100 a26 26 0 0 1 52 0Z" fill="#e6edff" stroke="#8fa3d9" stroke-width="2"/><rect x="170" y="86" width="12" height="14" fill="#38d6ff" opacity=".8"/><rect x="208" y="92" width="24" height="9" fill="#3558c0"/></svg>',
    mars: '<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sg-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1a2e"/><stop offset=".7" stop-color="#d9784f"/><stop offset="1" stop-color="#f0a070"/></linearGradient></defs><rect width="320" height="120" fill="url(#sg-r)"/><circle cx="64" cy="34" r="9" fill="#ffe9c9" opacity=".85"/><path d="M0 92 Q60 70 130 90 T260 84 T330 92 V120 H0Z" fill="#a8412a"/><path d="M0 104 Q80 88 160 104 T320 100 V120 H0Z" fill="#7d2d1c"/><g transform="translate(190 78)"><rect x="0" y="6" width="40" height="12" rx="3" fill="#dfe6f5"/><rect x="26" y="0" width="12" height="9" rx="2" fill="#38d6ff"/><circle cx="8" cy="20" r="5" fill="#222"/><circle cx="32" cy="20" r="5" fill="#222"/></g><g fill="#fff" opacity=".18"><ellipse cx="250" cy="60" rx="60" ry="10"/><ellipse cx="110" cy="70" rx="50" ry="8"/></g></svg>',
    station: '<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice"><rect width="320" height="120" fill="#04061a"/><g fill="#fff" opacity=".8"><circle cx="24" cy="18" r="1.2"/><circle cx="120" cy="26" r="1"/><circle cx="296" cy="22" r="1.2"/><circle cx="60" cy="86" r="1"/></g><ellipse cx="160" cy="170" rx="210" ry="80" fill="#1d4fb8"/><ellipse cx="160" cy="176" rx="210" ry="80" fill="#2f7bff" opacity=".6"/><g transform="translate(160 56)"><rect x="-120" y="-16" width="62" height="32" fill="#3558c0" stroke="#9db4ff"/><rect x="58" y="-16" width="62" height="32" fill="#3558c0" stroke="#9db4ff"/><rect x="-58" y="-6" width="116" height="12" fill="#7d89aa"/><rect x="-26" y="-26" width="52" height="52" rx="12" fill="#c9d2ea"/><ellipse cx="0" cy="0" rx="40" ry="40" fill="none" stroke="#8795bd" stroke-width="4"/><g fill="#ffd66e"><rect x="-16" y="-5" width="8" height="10"/><rect x="-4" y="-5" width="8" height="10"/><rect x="8" y="-5" width="8" height="10"/></g></g></svg>',
    science: '<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sg-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1230"/><stop offset="1" stop-color="#25306a"/></linearGradient></defs><rect width="320" height="120" fill="url(#sg-s)"/><path d="M0 98 Q80 80 160 96 T320 92 V120 H0Z" fill="#6b4a5a"/><g fill="#8a6a78"><circle cx="70" cy="100" r="9"/><circle cx="96" cy="106" r="6"/><circle cx="250" cy="102" r="8"/></g><g transform="translate(150 24)"><path d="M18 0 H42 M22 0 V30 L6 64 Q3 70 10 70 H50 Q57 70 54 64 L38 30 V0" fill="none" stroke="#e6edff" stroke-width="4" stroke-linejoin="round"/><path d="M12 54 H48 L53 64 Q55 68 49 68 H11 Q5 68 7 64Z" fill="#5fe39a"/><circle cx="26" cy="44" r="3" fill="#a98bff"/><circle cx="36" cy="38" r="2.5" fill="#38d6ff"/></g><g fill="none" stroke="#7fe6ff" stroke-width="2" opacity=".7"><circle cx="248" cy="40" r="18"/><path d="M261 53 L276 70"/><path d="M60 30 H120" stroke-dasharray="4 4"/><path d="M60 42 H100" stroke-dasharray="4 4"/></g></svg>'
  };

  /* ---------- Edad: cinco franjas que adaptan el lenguaje, las ayudas y la presentación ---------- */
  // Las mecánicas no cambian: la franja decide el registro del texto (sencillo o técnico), las pistas, el tamaño de la interfaz y si las ampliaciones («Más información») se muestran abiertas.
  const AGE_MIN = 5, AGE_MAX = 17;
  const AGE_BANDS = [
    { id: 1, from: 5, to: 7, mode: 'junior', scale: 1.2, more: false, col: '#5fe39a', name: ['Explorador novato', 'Rookie explorer'],
      lang: ['Instrucciones muy sencillas, frases cortas e iconos claros', 'Very simple instructions, short sentences and clear icons'], help: ['Asistencia frecuente: pistas siempre visibles y letra más grande', 'Frequent help: hints always on and larger text'],
      ex: ['¡Falta aire! Ve al reciclador y arréglalo.', 'The air is running out! Go to the recycler and fix it.'] },
    { id: 2, from: 8, to: 10, mode: 'junior', scale: 1.1, more: false, col: '#38d6ff', name: ['Aprendiz espacial', 'Space apprentice'],
      lang: ['Explicaciones sencillas, objetivos guiados y vocabulario básico', 'Simple explanations, guided goals and basic vocabulary'], help: ['Objetivos guiados y pistas visibles', 'Guided goals and visible hints'],
      ex: ['El oxígeno baja. Repara el reciclador de agua y aire para que alcance para todos.', 'Oxygen is dropping. Repair the water and air recycler so there is enough for everyone.'] },
    { id: 3, from: 11, to: 13, mode: 'junior', scale: 1, more: true, col: '#a98bff', name: ['Cadete científico', 'Science cadet'],
      lang: ['Conceptos científicos con más profundidad: las ampliaciones se muestran abiertas', 'Science concepts in more depth: the extra explanations are shown open'], help: ['Pistas y explicaciones ampliadas', 'Hints and extended explanations'],
      ex: ['El reciclador produce menos oxígeno del que respira la tripulación; repararlo equilibra el sistema.', 'The recycler makes less oxygen than the crew breathes; repairing it balances the system.'] },
    { id: 4, from: 14, to: 16, mode: 'adv', scale: 1, more: false, col: '#ffb454', name: ['Ingeniero junior', 'Junior engineer'],
      lang: ['Términos técnicos moderados y más independencia', 'Moderate technical terms and more independence'], help: ['Menos ayudas: las pistas dependen de la dificultad', 'Less help: hints depend on the difficulty'],
      ex: ['Caída de eficiencia del reciclador de O₂ por fallo de bomba: diagnostica y repara.', 'O₂ recycler efficiency drop from a pump fault: diagnose and repair.'] },
    { id: 5, from: 17, to: 17, mode: 'adv', scale: 1, more: true, col: '#ff6b8a', name: ['Comandante de misión', 'Mission commander'],
      lang: ['Explicaciones técnicas con unidades, datos y análisis detallado', 'Technical explanations with units, data and detailed analysis'], help: ['Autonomía: sin pistas automáticas salvo en Explorador', 'Autonomy: no automatic hints except on Explorer'],
      ex: ['Reciclaje efectivo 71 % → déficit de 0,9 kg O₂/día; autonomía ≈ 38 h. Diagnostica la causa antes de reparar.', 'Effective recycling 71 % → deficit of 0.9 kg O₂/day; endurance ≈ 38 h. Diagnose the cause before repairing.'] }
  ];
  const ageBand = (a) => AGE_BANDS.find((b) => a >= b.from && a <= b.to) || AGE_BANDS[4];
  const ageMode = (a) => ageBand(a).mode;
  /** Pistas automáticas: siempre en Explorador, nunca en Comandante; en Cadete solo hasta los 13 años. */
  const assistHints = (age, diff) => (diff === 'explorer' ? true : diff === 'commander' ? false : ageBand(age).id <= 3);
  /** Tamaño de la interfaz y ampliaciones abiertas según la franja guardada. */
  function applyAgeUi() { document.documentElement.style.setProperty('--scale', (settings.scale || 1) * (settings.ageScale || 1)); }
  new MutationObserver(() => { if (!settings.moreOpen) return; layer.querySelectorAll('details.more:not([data-ao])').forEach((d) => { d.open = true; d.dataset.ao = '1'; }); }).observe(layer, { childList: true, subtree: true });

  /* ---------- Misiones (cada tarjeta inicia una configuración real del simulador) ---------- */
  const MISSIONS = [
    { id: 'moon', scen: 'moon', rec: 'explorer', exp: false, t: ['Exploración lunar', 'Lunar exploration'], d: ['Explora la superficie y administra tu base en la Luna.', 'Explore the surface and run your base on the Moon.'],
      obj: [['Explorar con el traje y el rover', 'Explore with the suit and rover'], ['Administrar la base lunar', 'Run the lunar base'], ['Recolectar muestras', 'Collect samples'], ['Resistir noches largas, polvo y radiación', 'Withstand long nights, dust and radiation']],
      win: ['Completar las 7 misiones de la campaña.', 'Complete the 7 campaign missions.'] },
    { id: 'mars', scen: 'mars', rec: 'engineer', exp: false, t: ['Exploración de Marte', 'Mars exploration'], d: ['Recorre el terreno marciano y gestiona tus recursos.', 'Cross the Martian terrain and manage your resources.'],
      obj: [['Explorar el terreno marciano', 'Explore the Martian terrain'], ['Administrar agua, energía y comida', 'Manage water, power and food'], ['Investigar muestras', 'Investigate samples'], ['Afrontar tormentas de polvo y poca luz solar', 'Face dust storms and weak sunlight']],
      win: ['Completar las 7 misiones de la campaña.', 'Complete the 7 campaign missions.'] },
    { id: 'station', scen: null, rec: 'engineer', exp: true, t: ['Construcción de una estación', 'Building a station'], d: ['Activa los sistemas esenciales y desarrolla la colonia por etapas.', 'Activate the essential systems and grow the colony in stages.'],
      obj: [['Activar el soporte vital y la energía', 'Activate life support and power'], ['Administrar energía y soporte vital', 'Manage power and life support'], ['Reforzar la protección y cultivar alimentos', 'Strengthen protection and grow food'], ['Empiezas con +20 de materiales para construir', 'You start with +20 materials to build']],
      win: ['Completar 5 misiones: soporte vital, energía, protección solar, blindaje y cultivos.', 'Complete 5 missions: life support, power, solar protection, shielding and crops.'], goalToast: ['construye la colonia: activa soporte vital y energía, refuerza el blindaje y cultiva.', 'build the colony: activate life support and power, reinforce shielding and grow food.'] },
    { id: 'science', scen: null, rec: 'commander', exp: true, t: ['Investigación científica', 'Scientific research'], d: ['Sal a explorar, recoge muestras y analízalas en el laboratorio.', 'Go out to explore, collect samples and analyze them in the lab.'],
      obj: [['Explorar zonas de interés', 'Explore sites of interest'], ['Recolectar muestras con el rover', 'Collect samples with the rover'], ['Analizar materiales en el laboratorio', 'Analyze materials in the lab'], ['Completar los objetivos científicos', 'Complete the science goals']],
      win: ['Completar 3 misiones (protección solar, sitio de exploración, rover) y reunir 8 puntos de ciencia con análisis o experimentos.', 'Complete 3 missions (solar protection, exploration site, rover) and earn 8 science points with analyses or experiments.'], goalToast: ['explora, recoge muestras con el rover y analízalas en el laboratorio.', 'explore, collect samples with the rover and analyze them in the lab.'] }
  ];
  const missionOf = (id) => MISSIONS.find((m) => m.id === id) || MISSIONS[0];
  const scenOf = (m, dest) => m.scen || (dest === 'mars' ? 'mars' : 'moon');
  const LEVELS = [
    { id: 'explorer', ico: 'compass', n: ['Explorador', 'Explorer'], tag: ['Fácil', 'Easy'], d: ['Recursos abundantes, muchos avisos y mucho margen para equivocarte.', 'Plenty of resources, frequent warnings and lots of room for mistakes.'], help: ['Pistas siempre; avisos desde el nivel de precaución', 'Hints always on; warnings from the caution level'] },
    { id: 'engineer', ico: 'cadet', n: ['Cadete', 'Cadet'], tag: ['Normal', 'Normal'], d: ['Recursos equilibrados, eventos moderados y consecuencias normales.', 'Balanced resources, moderate events and normal consequences.'], help: ['Ayudas limitadas: pistas solo hasta los 13 años', 'Limited help: hints only up to age 13'] },
    { id: 'commander', ico: 'star', n: ['Comandante', 'Commander'], tag: ['Difícil', 'Hard'], d: ['Recursos escasos, mucha exigencia y consecuencias más estrictas.', 'Scarce resources, high demand and stricter consequences.'], help: ['Sin pistas y solo avisos críticos', 'No hints and critical warnings only'] }
  ];
  const diffName = (d) => { const L = LEVELS.find((x) => x.id === d) || LEVELS[0]; return L.n[LANG === 'es' ? 0 : 1]; };
  /** Parámetros reales de la dificultad (los mismos que usa el simulador). */
  function levelParams(id) {
    const D = Sim.DIFFS[id], es = LANG === 'es', nf = (v) => String(v).replace('.', es ? ',' : '.');
    return [[es ? 'Recursos iniciales' : 'Starting resources', Math.round(D.startPct * 100) + ' %'], [es ? 'Eventos' : 'Events', '×' + nf(D.ev) + ' · ' + (es ? 'máx. ' : 'max ') + D.maxInc], [es ? 'Reparación' : 'Repair', '×' + nf(D.repair)], [es ? 'Límite de radiación' : 'Radiation limit', D.dose + ' mSv'], [es ? 'Refugio' : 'Shelter', D.shelter + ' ' + (es ? 'plazas' : 'places')]];
  }

  /* ---------- Asistente de inicio: edad → misión → dificultad → resumen ---------- */
  function setupScreen() {
    const prevMode = MODE, pk = (a) => a[LANG === 'es' ? 0 : 1], es = () => LANG === 'es';
    let step = 0, age = clampN(Math.round(+settings.age || 10), AGE_MIN, AGE_MAX), mi = MISSIONS.some((m) => m.id === settings.mission) ? settings.mission : 'moon',
      dest = settings.dest === 'mars' ? 'mars' : 'moon', lv = LEVELS.some((l) => l.id === settings.diff) ? settings.diff : 'explorer';
    const persist = () => { settings.age = age; settings.mission = mi; settings.dest = dest; settings.diff = lv; Store.set('settings', settings); };
    const wrap = h('div', { class: 'wiz' });
    const go = (n) => { step = n; render(); };
    const STEPS = [['Edad', 'Age'], ['Misión', 'Mission'], ['Dificultad', 'Difficulty'], ['Resumen', 'Summary']];
    const stepsBar = () => h('ol', { class: 'wiz-steps' }, STEPS.map((x, i) => h('li', { class: i === step ? 'on' : i < step ? 'done' : '', 'aria-current': i === step ? 'step' : null, 'data-step': i }, h('b', null, String(i + 1)), h('span', null, pk(x)))));
    const ageStep = () => {
      const num = h('div', { class: 'age-num', 'aria-live': 'polite', 'data-age': '1' }), chip = h('div', { class: 'age-chip' });
      const l1 = h('p', { class: 'age-l1' }), l2 = h('p', { class: 'small muted' }), ex = h('p', { class: 'age-ex' });
      const rng = h('input', { type: 'range', min: AGE_MIN, max: AGE_MAX, step: 1, value: age, class: 'age-range', 'aria-label': es() ? 'Edad' : 'Age' });
      const set = (v, pop) => {
        age = clampN(Math.round(v), AGE_MIN, AGE_MAX); rng.value = age; num.textContent = age === AGE_MAX ? AGE_MAX + '+' : String(age);
        const b = ageBand(age); chip.textContent = pk(b.name); chip.style.background = b.col; l1.textContent = '🗣 ' + pk(b.lang); l2.textContent = '💡 ' + pk(b.help); ex.textContent = '“' + pk(b.ex) + '”';
        rng.style.setProperty('--p', ((age - AGE_MIN) / (AGE_MAX - AGE_MIN) * 100) + '%'); rng.dataset.band = b.id; num.style.setProperty('--bc', b.col);
        if (pop) { num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); }
        persist();
      };
      rng.addEventListener('input', () => set(+rng.value, true));
      const mk = (txt, d, lab) => h('button', { class: 'age-btn', type: 'button', 'aria-label': lab, 'data-age-step': d, onclick: () => { Sfx.play('click'); set(age + d, true); } }, txt);
      set(age);
      const ticks = h('div', { class: 'age-ticks' }, [[5, '5'], [8, '8'], [11, '11'], [14, '14'], [17, '17+']].map(([v, t]) => h('span', { style: { left: ((v - AGE_MIN) / (AGE_MAX - AGE_MIN) * 100) + '%' } }, t)));
      return h('div', { class: 'wiz-step' }, h('h2', null, es() ? '¿Cuántos años tienes?' : 'How old are you?'),
        h('p', { class: 'muted' }, es() ? 'La edad adapta el lenguaje y las ayudas, no las mecánicas. La dificultad se elige aparte.' : 'Age adapts the language and the help, not the mechanics. Difficulty is chosen separately.'), chip,
        h('div', { class: 'age-row' }, mk('−', -1, es() ? 'Bajar la edad' : 'Decrease age'), num, mk('+', 1, es() ? 'Subir la edad' : 'Increase age')), h('div', { class: 'age-wrap' }, rng, ticks),
        h('div', { class: 'age-info' }, l1, l2, h('p', { class: 'small muted', style: { margin: '8px 0 2px' } }, es() ? 'Así se leerá un aviso del juego:' : 'This is how a game alert will read:'), ex));
    };
    const missionStep = () => {
      const grid = h('div', { class: 'mgrid' });
      const draw = () => {
        grid.replaceChildren(...MISSIONS.map((m) => {
          const pick = () => { Sfx.play('click'); mi = m.id; persist(); draw(); };
          const destBtns = m.scen ? null : h('div', { class: 'mc-dest' }, h('span', { class: 'small muted' }, (es() ? 'Destino: ' : 'Destination: ')), ['moon', 'mars'].map((d) => h('button', { type: 'button', class: 'chipbtn', 'data-dest': d, 'aria-pressed': dest === d ? 'true' : 'false', onclick: (e) => { e.stopPropagation(); Sfx.play('click'); dest = d; mi = m.id; persist(); draw(); } }, d === 'moon' ? (es() ? 'Luna' : 'Moon') : 'Marte')));
          return h('div', { class: 'mcard', role: 'button', tabindex: '0', 'aria-pressed': mi === m.id ? 'true' : 'false', 'data-mission': m.id, onclick: pick, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } } },
            h('div', { class: 'mc-art', html: SCENE[m.id] }), h('div', { class: 'mc-head' }, h('b', null, pk(m.t)), h('span', { class: 'dtag' + (m.exp ? ' exp' : '') }, m.exp ? (es() ? 'Experimental' : 'Experimental') : (es() ? 'Disponible' : 'Available'))),
            h('p', { class: 'small muted' }, pk(m.d)), h('ul', { class: 'mc-obj' }, m.obj.map((o) => h('li', null, pk(o)))), destBtns,
            h('div', { class: 'mc-foot' }, h('span', { class: 'chip-rec' }, (es() ? 'Recomendada: ' : 'Recommended: ') + diffName(m.rec)), m.exp ? h('span', { class: 'small muted' }, es() ? 'Configuración con objetivos propios sobre la misma base' : 'Configuration with its own goals on the same base') : null));
        }));
      };
      draw();
      return h('div', { class: 'wiz-step' }, h('h2', null, es() ? 'Elige tu misión' : 'Choose your mission'), grid);
    };
    const levelStep = () => {
      const grid = h('div', { class: 'dgrid' }); const m = missionOf(mi);
      const draw = () => {
        grid.replaceChildren(...LEVELS.map((L) => h('button', { class: 'dcard', type: 'button', 'aria-pressed': lv === L.id ? 'true' : 'false', 'data-level': L.id, onclick: () => { Sfx.play('click'); lv = L.id; persist(); draw(); } },
          wizIco(L.ico), h('b', null, pk(L.n)), h('span', { class: 'dtag' }, pk(L.tag)), m.rec === L.id ? h('span', { class: 'chip-rec' }, es() ? 'Recomendada para esta misión' : 'Recommended for this mission') : null, h('span', { class: 'small muted' }, pk(L.d)),
          h('ul', { class: 'lv-par' }, levelParams(L.id).map(([a, b]) => h('li', null, h('span', null, a), h('b', null, b)))), h('span', { class: 'small', style: { color: 'var(--accent)' } }, pk(L.help)))));
      };
      draw();
      return h('div', { class: 'wiz-step' }, h('h2', null, es() ? 'Elige la dificultad' : 'Choose the difficulty'),
        h('p', { class: 'muted' }, es() ? 'Cambia recursos, eventos y ayudas reales del juego, no el lenguaje: puedes ser Comandante a cualquier edad.' : 'It changes real resources, events and help in the game, not the language: you can be a Commander at any age.'), grid);
    };
    const summaryStep = () => {
      const b = ageBand(age), m = missionOf(mi), L = LEVELS.find((x) => x.id === lv), sc = scenOf(m, dest), hints = assistHints(age, lv);
      const tile = (ico, lab, val, sub, st) => h('div', { class: 'sum-tile', 'data-sum': st }, h('div', { class: 'sum-ico', html: ico }), h('div', { class: 'sum-txt' }, h('span', { class: 'small muted' }, lab), h('b', null, val), sub ? h('span', { class: 'small muted' }, sub) : null), h('button', { type: 'button', class: 'btn sm', 'data-edit': st, onclick: () => { Sfx.play('click'); go(st === 'dest' ? 1 : st === 'diff' ? 2 : st === 'age' ? 0 : 1); } }, es() ? 'Cambiar' : 'Change'));
      return h('div', { class: 'wiz-step' }, h('h2', null, es() ? 'Resumen de tu misión' : 'Your mission summary'),
        h('div', { class: 'sum-grid' },
          tile(WIZ_SVG.star, es() ? 'Edad' : 'Age', (age === AGE_MAX ? AGE_MAX + '+' : age) + (es() ? ' años · ' : ' years · ') + pk(b.name), pk(b.lang), 'age'),
          tile(sc === 'mars' ? WIZ_SVG.mars : WIZ_SVG.moon, es() ? 'Destino' : 'Destination', sc === 'mars' ? 'Marte' : (es() ? 'Luna' : 'Moon'), null, 'dest'),
          tile(WIZ_SVG[m.id === 'moon' ? 'moon' : m.id === 'mars' ? 'mars' : m.id], es() ? 'Misión' : 'Mission', pk(m.t), pk(m.win), 'mission'),
          tile(WIZ_SVG[L.ico], es() ? 'Dificultad' : 'Difficulty', pk(L.n) + ' · ' + pk(L.tag), levelParams(lv).map((x) => x[0] + ' ' + x[1]).slice(0, 3).join(' · '), 'diff')),
        h('p', { class: 'small muted sum-help' }, (es() ? 'Ayudas: ' : 'Help: ') + (hints ? (es() ? 'pistas automáticas activadas' : 'automatic hints on') : (es() ? 'sin pistas automáticas' : 'no automatic hints')) + ' · ' + (es() ? 'lenguaje ' : 'language ') + (b.mode === 'junior' ? (es() ? 'sencillo' : 'simple') : (es() ? 'técnico' : 'technical')) + (b.scale > 1 ? (es() ? ' · letra más grande' : ' · larger text') : '') + (b.more ? (es() ? ' · ampliaciones abiertas' : ' · extra explanations open') : '')));
    };
    const start = () => {
      persist(); const b = ageBand(age), m = missionOf(mi), sc = scenOf(m, dest); MODE = prevMode;
      launchCinematic([(es() ? 'Misión: ' : 'Mission: ') + pk(m.t), (es() ? 'Destino: ' : 'Destination: ') + (sc === 'mars' ? 'Marte' : (es() ? 'Luna' : 'Moon')), (es() ? 'Dificultad: ' : 'Difficulty: ') + diffName(lv)],
        () => newRun(sc, lv, { mode: b.mode, indep: true, focus: m.id, age }));
    };
    const render = () => {
      MODE = ageMode(age);
      wrap.replaceChildren(stepsBar(), [ageStep, missionStep, levelStep, summaryStep][step](),
        h('div', { class: 'row wiz-nav' }, btn(_('back'), () => { if (step === 0) { MODE = prevMode; mainMenu(); } else go(step - 1); }),
          step < 3 ? btn((es() ? 'Siguiente' : 'Next') + ' ▶', () => go(step + 1), 'primary wiz-big', { 'data-act': 'wiz-next' }) : btn(_('go') + ' ▶', start, 'primary wiz-big', { 'data-act': 'launch' })));
      const f = wrap.querySelector(step === 0 ? '.age-range' : '.wiz-big'); if (f && f.isConnected) f.focus({ preventScroll: true });
    };
    render();
    showScreen(h('div', { class: 'panel cine-panel wiz-panel' }, wrap), 'cine');
    const f = wrap.querySelector('.age-range'); if (f) f.focus({ preventScroll: true });
  }

  /** Transición hacia el inicio de la campaña: túnel de estrellas y el resumen de la misión. */
  function launchCinematic(lines, done) {
    const rm = document.documentElement.classList.contains('rm'), T = rm ? 0.5 : 2.0, cvx = h('canvas', { class: 'lf-cv' });
    const el = h('div', { id: 'launchfx', role: 'status' }, cvx, h('div', { class: 'lf-txt' }, lines.map((t, i) => h('p', { style: { animationDelay: (0.15 + i * 0.3) + 's' } }, t)), h('p', { class: 'lf-go', style: { animationDelay: '1.1s' } }, LANG === 'es' ? 'Despegue…' : 'Lift-off…')));
    document.getElementById('app').append(el); Sfx.play('scan');
    const d = Math.min(2, window.devicePixelRatio || 1); cvx.width = Math.floor(innerWidth * d); cvx.height = Math.floor(innerHeight * d);
    const g = cvx.getContext('2d'), t0 = performance.now(); let fin = false;
    const finish = () => { if (fin) return; fin = true; window.removeEventListener('keydown', onKey); el.removeEventListener('pointerdown', finish); done(); el.classList.add('out'); setTimeout(() => el.remove(), 500); };
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); finish(); } };
    window.addEventListener('keydown', onKey); el.addEventListener('pointerdown', finish);
    const tick = (now) => {
      if (fin) return; const t = (now - t0) / 1000, p = Math.min(1, t / T), w = cvx.width, hh = cvx.height, cx = w / 2, cy = hh / 2;
      g.fillStyle = 'rgba(2,3,12,0.35)'; g.fillRect(0, 0, w, hh);
      if (!rm) for (let i = 0; i < 140; i++) { const a = (i * 2.399) % 6.283, r0 = ((i * 37 + t * (80 + p * 900) * (0.4 + (i % 7) / 7)) % 1000) / 1000, r = r0 * r0 * Math.max(w, hh) * 0.8, L = 4 + p * 70 * r0; g.strokeStyle = 'rgba(' + (150 + (i % 3) * 35) + ',' + (190 + (i % 2) * 40) + ',255,' + (0.25 + 0.75 * r0) + ')'; g.lineWidth = 1 + r0 * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * (r + L), cy + Math.sin(a) * (r + L)); g.stroke(); }
      if (p >= 1) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  /** Aviso de la misión al empezar a jugar (estación y ciencia). */
  function focusToast() { const m = S && S.focus && MISSIONS.find((x) => x.id === S.focus); return m && m.goalToast ? (LANG === 'es' ? m.t[0] + ': ' + m.goalToast[0] : m.t[1] + ': ' + m.goalToast[1]) : null; }

  /* ---------- Carga: inicialización real de los recursos y sistemas ---------- */
  // Cada tarea hace trabajo de verdad (fuentes y logotipo, sprites de la tripulación, motor de simulación, mundo y arte de los pisos).
  // El porcentaje es el avance real de las tareas; la nave nunca va por delante de él.
  let bootLog = [];
  const frame1 = () => new Promise((r) => requestAnimationFrame(() => r()));
  function bootLoad() {
    const es = LANG === 'es', rm = document.documentElement.classList.contains('rm'); bootLog = [];
    const tasks = [
      { l: ['Inicializando sistemas', 'Initializing systems'], w: 2, run: async (rep) => {
        try { if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]); } catch (e) { /* sin fuentes */ }
        rep(0.4); const im = layer.querySelector('.logo-img'); if (im && im.decode) { try { await im.decode(); } catch (e) { /* ya cargada */ } }
        rep(0.8); applySettings(); resize(); return 'settings+logo';
      } },
      { l: ['Preparando tripulación', 'Preparing the crew'], w: 3, run: async (rep) => {
        const c = document.createElement('canvas'); c.width = 120; c.height = 140; const x = c.getContext('2d'); let n = 0;
        for (const r of Chars.ORDER) { for (let d = 0; d < 4; d++) { x.clearRect(0, 0, 120, 140); Chars.draw(x, r, 60, 125, { dir: d, t: 0.3, pose: 'idle', scale: 1.6 }); n++; } rep(n / (Chars.ORDER.length * 4)); await frame1(); }
        return n + ' sprites';
      } },
      { l: ['Comprobando recursos', 'Checking resources'], w: 3, run: async (rep) => {
        let ok = 0; for (const sc of ['moon', 'mars']) { const X = Sim.create({ scen: sc, mode: 'adv', seed: 11, noEv: true, skipCamp: true }); Sim.step(X, 3); if (X.r.o2.v > 0 && !X.ended) ok++; rep(ok / 2 * 0.7); await frame1(); }
        let saved = false; try { saved = !!Store.get('run', null); } catch (e) { /* almacenamiento bloqueado */ } rep(1); return ok + ' escenarios' + (saved ? ' + partida guardada' : '');
      } },
      { l: ['Calculando trayectoria', 'Calculating trajectory'], w: 5, run: async (rep) => {
        World.init(settings.scen === 'mars' ? 'mars' : 'moon'); rep(0.2); await frame1();
        for (let f = 1; f <= World.mainFloors; f++) { World.prewarmFloor(f); rep(0.2 + 0.8 * f / World.mainFloors); await frame1(); } // el garaje se arma al bajar (no pesa en la carga)
        return World.mainFloors + ' pisos';
      } },
      { l: ['Sistemas listos', 'Systems ready'], w: 1, run: async () => 'ok' }
    ];
    const total = tasks.reduce((a, t) => a + t.w, 0);
    const pct = h('div', { class: 'ld-pct' }, '0 %'), msg = h('p', { class: 'ld-msg', 'aria-live': 'polite' }), fill = h('i'), ship = h('div', { class: 'ld-ship', 'aria-hidden': 'true', html: WIZ_SVG.ship });
    const rail = h('div', { class: 'ld-rail', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0, 'aria-label': es ? 'Carga' : 'Loading' }, fill, ship);
    const body = h('div', { class: 'panel cine-panel ld-panel', 'data-boot': '1' }, h('h1', { class: 'title-big has-logo' }, logoImg()), h('p', { class: 'brand-sub' }, 'Junior Astronaut Mission Trainer'),
      h('div', { class: 'ld-track' }, wizIco('earth', 'ld-pl'), rail, wizIco('dest', 'ld-pl')), pct, msg, btn(es ? 'Saltar ▶' : 'Skip ▶', () => { skipped = true; }, 'sm'));
    let target = 0, shown = 0, finished = false, skipped = false, exiting = false, last = performance.now(), label = tasks[0].l;
    const t0 = performance.now(); let ready = false;
    showScreen(body, 'cine');
    const exit = () => {
      if (exiting) return; exiting = true; pct.textContent = '100 %'; fill.style.width = '100%'; ship.style.left = '100%'; msg.textContent = es ? 'Sistemas listos' : 'Systems ready';
      ship.classList.add('go'); body.classList.add('lift'); // la nave acelera, cruza la pantalla y da paso al menú
      setTimeout(() => { if (layer.contains(body)) mainMenu(); }, rm ? 80 : 1100);
    };
    const paint = (now) => {
      if (exiting || !layer.contains(body)) return; const dt = Math.min(0.1, (now - last) / 1000); last = now;
      shown = Math.min(target, shown + Math.max(25, (target - shown) * 8) * dt); // suaviza el movimiento, pero nunca supera el avance real
      const p = Math.min(100, Math.round(shown)); pct.textContent = p + ' %'; fill.style.width = shown.toFixed(1) + '%'; ship.style.left = shown.toFixed(1) + '%'; rail.setAttribute('aria-valuenow', p); msg.textContent = es ? label[0] + '…' : label[1] + '…';
      if ((finished && shown >= 99.5) || skipped) return exit();
      requestAnimationFrame(paint);
    };
    requestAnimationFrame(paint);
    (async () => {
      let done = 0;
      for (const t of tasks) {
        label = t.l; const s0 = performance.now(); let info = '';
        try { info = await t.run((f) => { target = Math.max(target, (done + t.w * Math.min(1, f)) / total * 100); }); } catch (e) { info = 'error: ' + (e && e.message); }
        done += t.w; target = Math.max(target, done / total * 100); bootLog.push({ task: t.l[0], ms: Math.round(performance.now() - s0), pct: Math.round(target), info });
        await frame1();
      }
      finished = true; ready = true;
    })();
    setTimeout(() => { if (!finished) { finished = true; skipped = true; } }, 20000); // seguridad: nunca se queda atascada
  }
  const startDebug = { bootLoad, get bootLog() { return bootLog; }, ageBand, assistHints, missions: () => MISSIONS, levelParams, launchCinematic, focusToast };
