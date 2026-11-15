/* =====================================================================
   ICONS — iconografía propia y consistente (SVG por rutas, 24×24).
   Se usa en el DOM (Icons.el) y en Canvas (Icons.draw con Path2D).
   decor(): convierte los pictogramas de los textos en iconos y descarta
   los emojis decorativos.
   ===================================================================== */
const Icons = (function () {
  // f = relleno (evenodd) · s = trazo
  const I = {
    air: { s: 'M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h8' },
    drop: { f: 'M12 3S5.5 10 5.5 14.5a6.5 6.5 0 0013 0C18.5 10 12 3 12 3z' },
    bolt: { f: 'M13 2L5 13h5l-1 9 8-12h-5z' },
    leaf: { f: 'M4 20C4 11 9 5 20 4c-1 10-6 16-16 16z' },
    shield: { f: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z' },
    heart: { f: 'M12 21s-8-5.5-8-11a4.5 4.5 0 018-2.7A4.5 4.5 0 0120 10c0 5.5-8 11-8 11z' },
    warn: { f: 'M12 2L1 21h22L12 2zm-1 7h2v6h-2V9zm0 8h2v2h-2v-2z' },
    crit: { f: 'M8 2h8l6 6v8l-6 6H8l-6-6V8l6-6zm3 5v6h2V7h-2zm0 8v2h2v-2h-2z' },
    info: { f: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-1 5h2v2h-2V7zm0 4h2v7h-2v-7z' },
    check: { s: 'M4 12.5l5 5L20 6.5' },
    cross: { s: 'M6 6l12 12M18 6L6 18' },
    lock: { f: 'M6 10V8a6 6 0 0112 0v2h1v12H5V10h1zm3 0h6V8a3 3 0 00-6 0v2z' },
    pin: { f: 'M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 4.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z' },
    gear: { f: 'M10.5 2h3l.5 3 2 1 2.8-1.2 1.5 2.6-2.3 2 .1 2.2 2.3 2-1.5 2.6L16 17l-2 1-.5 3h-3l-.5-3-2-1-2.8 1.2-1.5-2.6 2.3-2-.1-2.2-2.3-2 1.5-2.6L8 6l2-1 .5-3zM12 9a3 3 0 100 6 3 3 0 000-6z' },
    pause: { f: 'M6 4h4v16H6zM14 4h4v16h-4z' },
    play: { f: 'M7 4l13 8-13 8z' },
    sound: { f: 'M3 9h4l5-4v14l-5-4H3z', s: 'M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11' },
    mute: { f: 'M3 9h4l5-4v14l-5-4H3z', s: 'M16 9l5 6M21 9l-5 6' },
    menu: { s: 'M4 6h16M4 12h16M4 18h16' },
    bell: { f: 'M12 22a2.5 2.5 0 002.4-2H9.6A2.5 2.5 0 0012 22zm7-6v-5a7 7 0 00-5-6.7V3a2 2 0 10-4 0v1.3A7 7 0 005 11v5l-2 2v1h18v-1l-2-2z' },
    flask: { f: 'M9 2h6v2h-1v5l5.5 9.5A2 2 0 0117.8 21H6.2a2 2 0 01-1.7-2.5L10 9V4H9V2z' },
    antenna: { f: 'M12 11a2 2 0 110 4 2 2 0 010-4z', s: 'M12 15v6M8 21h8M8 8a6 6 0 000 6M16 8a6 6 0 010 6M5 5a10 10 0 000 12M19 5a10 10 0 010 12' },
    radio: { f: 'M3 9h18v11H3V9zm3 3v2h6v-2H6zm9 0a2 2 0 100 4 2 2 0 000-4z', s: 'M7 9l11-6' },
    rover: { f: 'M5 13l2-5h8l3 5v2H5v-2zM6 22a2.2 2.2 0 100-4.400 2.2 2.2 0 000 4.400zm12 0a2.2 2.2 0 100-4.400 2.2 2.2 0 000 4.400z' },
    target: { f: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 110 10 5 5 0 010-10zm0 3a2 2 0 100 4 2 2 0 000-4z' },
    map: { f: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z' },
    person: { f: 'M12 3a4 4 0 100 8 4 4 0 000-8zM4 21a8 8 0 0116 0H4z' },
    shirt: { f: 'M8 3L3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 01-8 0z' },
    sun: { f: 'M12 7a5 5 0 100 10 5 5 0 000-10z', s: 'M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.700 17.700l2.100 2.100M4.200 19.800l2.100-2.100M17.700 6.300l2.100-2.100' },
    moon: { f: 'M21 12.800A9 9 0 1111.200 3a7 7 0 009.800 9.800z' },
    dot: { f: 'M12 4a8 8 0 100 16 8 8 0 000-16z' },
    scale: { s: 'M12 3v18M6 21h12M5 7h14M5 7l-3 8h6L5 7zM19 7l-3 8h6l-3-8z' },
    wrench: { f: 'M21 6.500a5 5 0 01-6.600 4.700L7 18.700 5.300 17l7.500-7.400A5 5 0 0117.500 3l-3 3 .8 2.700L18 9.500l3-3z' },
    bed: { f: 'M3 7v11h2v-3h14v3h2v-7a3 3 0 00-3-3h-8v5H5V7H3z' },
    loop: { s: 'M4 12a8 8 0 0114-5l2-2v6h-6l2-2a5 5 0 00-9 3M20 12a8 8 0 01-14 5l-2 2v-6h6l-2 2a5 5 0 009-3' },
    chat: { f: 'M4 4h16v12H9l-5 4V4z' },
    cube: { f: 'M12 2l8 4.500v9L12 20l-8-4.500v-9L12 2z' },
    door: { f: 'M5 2h14v20H5V2zm9 9v2h2v-2h-2z' },
    earth: { s: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3.500 3 3.500 17 0 20M12 2c-3.500 3-3.500 17 0 20' },
    star: { f: 'M12 2l3 7 7 .6-5.300 4.700 1.700 7.200L12 17.700 5.600 21.500l1.700-7.200L2 9.600 9 9l3-7z' },
    search: { s: 'M10 3a7 7 0 100 14 7 7 0 000-14zM15 15l6 6' },
    scissors: { s: 'M6 8a3 3 0 100-6 3 3 0 000 6zM6 22a3 3 0 100-6 3 3 0 000 6zM8 7l12 12M8 17L20 5' },
    basket: { f: 'M3 10h18l-2 11H5L3 10z', s: 'M8 10l3-6M16 10l-3-6' },
    thermo: { f: 'M10 3a2 2 0 014 0v10a4 4 0 11-4 0V3z' },
    clock: { s: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2' },
    book: { f: 'M4 4h7v16H4V4zm9 0h7v16h-7V4z' },
    seed: { f: 'M12 3c4 3 6 7 6 11a6 6 0 01-12 0c0-4 2-8 6-11z' },
    chart: { s: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3' },
    home: { f: 'M3 11l9-8 9 8v10h-6v-6H9v6H3V11z' }
  };
  // emoji / glifo → icono
  const MAP = {
    '🫁': 'air', '💧': 'drop', '🔋': 'bolt', '⚡': 'bolt', '🛡': 'shield', '🥗': 'leaf', '😊': 'heart', '☀': 'sun', '⚛': 'bolt', '🌱': 'leaf', '🌿': 'leaf',
    '🔬': 'flask', '🧪': 'flask', '🧫': 'flask', '🔧': 'wrench', '🛠': 'wrench', '🔌': 'bolt', '📡': 'antenna', '📻': 'radio', '🌎': 'earth', '🌍': 'earth', '🌙': 'moon',
    '🔴': 'dot', '🎯': 'target', '🗺': 'map', '👩‍🚀': 'person', '🧑‍🚀': 'person', '🧥': 'shirt', '📍': 'pin', '🔒': 'lock', '⚙': 'gear', '⏸': 'pause', '▶': 'play',
    '🔊': 'sound', '🔇': 'mute', '☰': 'menu', '🔔': 'bell', '⚖': 'scale', '🚙': 'rover', '🧊': 'cube', '🚪': 'door', '🛏': 'bed', '🎲': 'heart', '🩺': 'heart',
    '💬': 'chat', '♻': 'loop', '🧺': 'basket', '✂': 'scissors', '🔍': 'search', '🌡': 'thermo', '🕒': 'clock', '⛔': 'crit', '⚠': 'warn', 'ℹ': 'info', '✔': 'check',
    '✖': 'cross', '🏅': 'star', '📚': 'book', '🌈': 'chart', '🌰': 'seed', '🗺️': 'map', '🛡️': 'shield', '☀️': 'sun', '⚛️': 'bolt', '⚖️': 'scale', '⚙️': 'gear',
    '🛠️': 'wrench', '🌡️': 'thermo', '🛏️': 'bed', '♻️': 'loop', '✂️': 'scissors', '⏸️': 'pause', '▶️': 'play', 'ℹ️': 'info', '✔️': 'check', '⚠️': 'warn', '✖️': 'cross',
    '🖥': 'chart', '🖥️': 'chart', '🏠': 'home', '🔭': 'search', '🪨': 'cube', '📦': 'cube', '🧰': 'cube', '📥': 'basket', '📤': 'door', '☢': 'warn', '☢️': 'warn', '✅': 'check', '⭐': 'star'
  };
  const RX = /(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2139}\u{2190}-\u{21FF}]️?(?:‍[\u{1F300}-\u{1FAFF}]️?)*)/gu;
  const KEEP = new Set(['★', '☆', '→', '←', '↑', '↓', '↔', '✕']);
  const NS = 'http://www.w3.org/2000/svg';
  const cache = {};
  function el(name, cls) {
    const d = I[name]; if (!d) return document.createTextNode('');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'ico ' + (cls || '')); svg.setAttribute('aria-hidden', 'true'); svg.dataset.i = name;
    if (d.f) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d.f); p.setAttribute('fill', 'currentColor'); p.setAttribute('fill-rule', 'evenodd'); svg.append(p); }
    if (d.s) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d.s); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); svg.append(p); }
    return svg;
  }
  /** Dibuja el icono centrado en (x, y) con tamaño size px. */
  function draw(c, name, x, y, size, color) {
    const d = I[name]; if (!d) return;
    c.save(); c.translate(x - size / 2, y - size / 2); c.scale(size / 24, size / 24);
    if (d.f) { const k = 'f' + name; c.fillStyle = color || '#eef3ff'; c.fill(cache[k] || (cache[k] = new Path2D(d.f)), 'evenodd'); }
    if (d.s) { const k = 's' + name; c.strokeStyle = color || '#eef3ff'; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(cache[k] || (cache[k] = new Path2D(d.s))); }
    c.restore();
  }
  const norm = (m) => m.replace(/️/g, '');
  const byEmoji = (e) => MAP[e] || MAP[norm(e)] || null;
  /** Texto → nodos: pictogramas conocidos pasan a icono, el resto de emojis se descarta. */
  function decor(str) {
    str = String(str);
    if (!RX.test(str)) { RX.lastIndex = 0; return [str]; }
    RX.lastIndex = 0;
    const out = []; let last = 0, m;
    while ((m = RX.exec(str))) {
      const pre = str.slice(last, m.index); if (pre) out.push(pre);
      const g = m[0], ic = byEmoji(g);
      if (ic) out.push(el(ic)); else if (KEEP.has(norm(g))) out.push(norm(g));
      last = m.index + g.length;
    }
    const post = str.slice(last); if (post) out.push(post);
    // limpia espacios que quedaron al descartar emojis al inicio
    if (typeof out[0] === 'string') out[0] = out[0].replace(/^\s+/, '');
    return out;
  }
  function setText(node, str) { node.textContent = ''; for (const n of decor(str)) node.append(n.nodeType ? n : document.createTextNode(n)); }
  return { names: Object.keys(I), el, draw, decor, setText, byEmoji, I };
})();
