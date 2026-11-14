/* =====================================================================
   CHARS — Familia de astronautas originales, dibujados por código.
   Unidades locales: pivote en los pies (0,0), altura ≈ 64 u (≈3,5 cabezas).
   Direcciones: 0 = espalda (arriba), 1 = derecha, 2 = frente (abajo), 3 = izquierda.
   Poses: idle · walk · interact · repair · carry · alert · celebrate.
   ===================================================================== */
const Chars = (function () {
  const OL = '#11131c';
  const ROLES = {
    commander: {
      pal: { suit: '#eef1f6', shade: '#c2c9d8', dark: '#1d2d55', acc: '#d9a72b', visor: '#2a5a9a', glow: '#7fd3ff', glove: '#1d2d55', skin: '#8d5a3b' },
      body: { sh: 11, wa: 7.6, arm: 4.4, leg: 5, boot: 7, pad: 2.2 },
      name: { es: 'Comandante', en: 'Commander' }, pers: { es: 'Responsable, estratégica y tranquila.', en: 'Responsible, strategic and calm.' },
      acc: { es: 'Navegador holográfico en el antebrazo', en: 'Holographic navigator on the forearm' },
      helmetTxt: { es: 'Visor envolvente angular con marco dorado, cresta de navegación y antena lateral.', en: 'Angular wraparound visor with gold frame, navigation crest and side antenna.' },
      packTxt: { es: 'Soporte vital equilibrado: dos depósitos, regulador central y panel de diagnóstico.', en: 'Balanced life support: twin tanks, central regulator and diagnostic panel.' }
    },
    engineer: {
      pal: { suit: '#e8752a', shade: '#b4551a', dark: '#3a3d44', acc: '#ffd23f', visor: '#26323d', glow: '#ffb347', glove: '#2b2d33', skin: '#e2b48f' },
      body: { sh: 13, wa: 9, arm: 5.4, leg: 6, boot: 8, pad: 3.4 },
      name: { es: 'Ingeniera', en: 'Engineer' }, pers: { es: 'Creativa, práctica y resolutiva.', en: 'Creative, practical and resourceful.' },
      acc: { es: 'Herramienta multifunción de reparación', en: 'Multi-function repair tool' },
      helmetTxt: { es: 'Casco reforzado con escudo abatible, rejilla protectora y focos de trabajo.', en: 'Reinforced helmet with flip-up shield, guard cage and work lights.' },
      packTxt: { es: 'Bastidor de carga con llave integrada, compartimentos laterales y franjas de seguridad.', en: 'Load frame with built-in wrench, side compartments and safety stripes.' }
    },
    scientist: {
      pal: { suit: '#f2eefc', shade: '#cdc3e8', dark: '#5b3aa8', acc: '#a58cff', visor: '#3b2a6b', glow: '#c9b6ff', glove: '#5b3aa8', skin: '#5a3a28' },
      body: { sh: 9.6, wa: 6.8, arm: 3.9, leg: 4.6, boot: 6.4, pad: 1.8 },
      name: { es: 'Científico', en: 'Scientist' }, pers: { es: 'Curioso, observador e investigador.', en: 'Curious, observant and inquisitive.' },
      acc: { es: 'Escáner portátil de muestras', en: 'Handheld sample scanner' },
      helmetTxt: { es: 'Visor hexagonal con instrumentación HUD y mástil de sensores.', en: 'Hexagonal visor with HUD instruments and a sensor mast.' },
      packTxt: { es: 'Mochila ligera con carrusel de cápsulas de muestras.', en: 'Light pack with a sample-capsule carousel.' }
    },
    medic: {
      pal: { suit: '#f3f8f6', shade: '#c6dbd3', dark: '#258f76', acc: '#7ff0cf', visor: '#1f4a44', glow: '#9dffe3', glove: '#258f76', skin: '#b98a63' },
      body: { sh: 10.6, wa: 7.6, arm: 4.4, leg: 5, boot: 6.8, pad: 2.4 },
      name: { es: 'Médica', en: 'Medic' }, pers: { es: 'Cuidadosa, paciente y atenta.', en: 'Careful, patient and attentive.' },
      acc: { es: 'Escáner biomédico de anillo', en: 'Ring-shaped biomedical scanner' },
      helmetTxt: { es: 'Visor doble con puente central y lámpara anular de exploración.', en: 'Twin-lobe visor with a central bridge and ring examination lamp.' },
      packTxt: { es: 'Mochila redondeada con módulo de primeros auxilios y bolsillos blandos.', en: 'Rounded pack with a first-aid module and soft pouches.' }
    },
    agri: {
      pal: { suit: '#d9cfb4', shade: '#b0a37e', dark: '#3f7a34', acc: '#8fd14f', visor: '#2e4a24', glow: '#c8f58a', glove: '#3f7a34', skin: '#c99872' },
      body: { sh: 10.6, wa: 7.8, arm: 4.4, leg: 5.2, boot: 7.2, pad: 2.4 },
      name: { es: 'Agrónomo', en: 'Agronomist' }, pers: { es: 'Observador, paciente y creativo.', en: 'Observant, patient and creative.' },
      acc: { es: 'Módulo portátil de análisis de plantas', en: 'Portable plant-analysis module' },
      helmetTxt: { es: 'Casco con ala parasol, visor redondeado verde y sensor en forma de hoja.', en: 'Helmet with sun brim, rounded green visor and a leaf-shaped sensor.' },
      packTxt: { es: 'Tubos de semillas transparentes, depósito de riego y manguera al guante.', en: 'Transparent seed tubes, irrigation bladder and a hose to the glove.' }
    }
  };
  const ORDER = ['commander', 'engineer', 'scientist', 'medic', 'agri'];

  /* ---------- Primitivas ---------- */
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fillOl(c, col, lw) { c.fillStyle = col; c.fill(); c.lineWidth = lw || 1.4; c.strokeStyle = OL; c.stroke(); }
  function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); }
  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = OL; c.lineWidth = w + 2.4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function dot(c, x, y, r, col, ol) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); if (ol) { c.lineWidth = 1.2; c.strokeStyle = OL; c.stroke(); } }
  function glow(c, x, y, r, col, a) { c.save(); c.globalAlpha = a == null ? 0.5 : a; dot(c, x, y, r, col); c.restore(); }

  /* ---------- Extremidades ---------- */
  // Ángulos medidos desde "hacia abajo"; positivo gira hacia +x.
  function arm(c, R, sx, sy, a1, a2, far) {
    const P = R.pal, B = R.body, L1 = 8.5, L2 = 8;
    const ex = sx + Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
    const a = a1 + a2, hx = ex + Math.sin(a) * L2, hy = ey + Math.cos(a) * L2;
    const col = far ? P.shade : P.suit;
    limb(c, sx, sy, ex, ey, B.arm, col);
    limb(c, ex, ey, hx, hy, B.arm * 0.92, col);
    dot(c, ex, ey, B.arm * 0.45 + (R === ROLES.engineer ? 0.9 : 0), far ? P.dark : P.dark, true); // codo articulado
    // puño del guante y guante
    limb(c, ex + (hx - ex) * 0.72, ey + (hy - ey) * 0.72, ex + (hx - ex) * 0.8, ey + (hy - ey) * 0.8, B.arm * 1.05, P.dark);
    dot(c, hx, hy, B.arm * 0.66, P.glove, true);
    return { ex, ey, hx, hy };
  }
  function legFront(c, R, hx, hip, lift, far) {
    const P = R.pal, B = R.body;
    const ky = -15.5 - lift * 0.5, ay = -6 - lift;
    const col = far ? P.shade : P.suit;
    limb(c, hx, hip, hx * 1.08, ky, B.leg, col);
    limb(c, hx * 1.08, ky, hx * 1.1, ay, B.leg * 0.92, col);
    // rodillera
    rr(c, hx * 1.08 - B.pad, ky - B.pad * 0.8, B.pad * 2, B.pad * 1.7, 1.2); fillOl(c, P.dark, 1);
    // bota voluminosa
    const bw = B.boot, by = ay - 1;
    rr(c, hx * 1.1 - bw / 2, by, bw, 6.5, 2.4); fillOl(c, far ? P.dark : P.dark);
    c.fillStyle = P.acc; c.fillRect(hx * 1.1 - bw / 2 + 1, by + 4.6, bw - 2, 1.2);
  }
  function legSide(c, R, th, kb, far) {
    const P = R.pal, B = R.body, L1 = 11, L2 = 10.5;
    const hx = 0, hy = -27;
    const kx = hx + Math.sin(th) * L1, ky = hy + Math.cos(th) * L1;
    const a = th - kb, ax = kx + Math.sin(a) * L2, ay = ky + Math.cos(a) * L2;
    const col = far ? P.shade : P.suit;
    limb(c, hx, hy, kx, ky, B.leg, col);
    limb(c, kx, ky, ax, ay, B.leg * 0.92, col);
    rr(c, kx - B.pad * 0.4, ky - B.pad, B.pad * 1.6, B.pad * 2, 1); fillOl(c, P.dark, 1);
    rr(c, ax - 3.2, ay - 3, B.boot + 2.4, 6.4, 2.4); fillOl(c, P.dark);
    c.fillStyle = P.acc; c.fillRect(ax - 2.4, ay + 1.9, B.boot + 0.8, 1.1);
  }

  /* ---------- Torso, cinturón y emblemas ---------- */
  function torsoFront(c, R, back) {
    const P = R.pal, B = R.body;
    poly(c, [[-B.sh, -44], [B.sh, -44], [B.sh - 1, -38], [B.wa, -28], [-B.wa, -28], [-B.sh + 1, -38]]);
    fillOl(c, P.suit, 1.6);
    // sombreado lateral (volumen)
    c.save(); poly(c, [[B.sh * 0.35, -44], [B.sh, -44], [B.sh - 1, -38], [B.wa, -28], [B.wa * 0.3, -28]]); c.globalAlpha = 0.35; c.fillStyle = P.shade; c.fill(); c.restore();
    // costuras de tejido técnico
    c.strokeStyle = 'rgba(17,19,28,.35)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-B.wa + 1, -33); c.lineTo(B.wa - 1, -33); c.stroke();
    if (back) return;
    const r = R;
    if (r === ROLES.commander) { // emblema de mando: doble chevrón dorado
      c.strokeStyle = P.acc; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, -41); c.lineTo(0, -38.5); c.lineTo(3, -41); c.moveTo(-3, -38.5); c.lineTo(0, -36); c.lineTo(3, -38.5); c.stroke();
      c.fillStyle = P.dark; c.fillRect(-B.wa + 0.5, -32.5, B.wa * 2 - 1, 2.4);
    } else if (r === ROLES.engineer) { // placa de protección atornillada
      rr(c, -6, -42, 12, 8, 1.6); fillOl(c, P.dark, 1);
      for (const [x, y] of [[-4.6, -40.6], [4.6, -40.6], [-4.6, -35.4], [4.6, -35.4]]) dot(c, x, y, 0.7, '#9aa0aa');
      c.fillStyle = P.acc; for (let i = -4; i < 5; i += 3) { c.save(); c.beginPath(); c.rect(-5, -38.8, 10, 1.6); c.clip(); c.fillRect(i, -39, 1.4, 2); c.restore(); }
    } else if (r === ROLES.scientist) { // matriz de sensores
      rr(c, -4.5, -42, 9, 7, 2); fillOl(c, P.dark, 1);
      dot(c, -2, -39.5, 0.9, P.glow); dot(c, 2, -39.5, 0.9, P.glow); dot(c, 0, -37, 0.9, P.glow);
    } else if (r === ROLES.medic) { // pantalla biométrica (no usa emblemas protegidos)
      rr(c, -5, -42, 10, 6, 1.6); fillOl(c, P.dark, 1);
      c.strokeStyle = P.glow; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-4, -39); c.lineTo(-1.5, -39); c.lineTo(-0.6, -41); c.lineTo(0.6, -37.2); c.lineTo(1.5, -39); c.lineTo(4, -39); c.stroke();
    } else if (r === ROLES.agri) { // parche de hoja
      c.beginPath(); c.moveTo(0, -42); c.quadraticCurveTo(5, -39, 0, -35); c.quadraticCurveTo(-5, -39, 0, -42); fillOl(c, P.dark, 1);
      c.strokeStyle = P.acc; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -41); c.lineTo(0, -36); c.stroke();
    }
  }
  function belt(c, R, side) {
    const P = R.pal, B = R.body;
    if (side) { rr(c, -6.2, -29.5, 12.4, 3.4, 1); fillOl(c, P.dark, 1); }
    else { rr(c, -B.wa - 0.6, -29.5, (B.wa + 0.6) * 2, 3.4, 1); fillOl(c, P.dark, 1); rr(c, -1.6, -29.4, 3.2, 3.2, 0.8); fillOl(c, P.acc, 0.8); }
    if (R === ROLES.engineer) { // cinturón de herramientas
      const xs = side ? [-6, 3.5] : [-B.wa - 2, B.wa - 1.5];
      for (const x of xs) { rr(c, x, -28.5, 3.6, 5, 1); fillOl(c, '#5a5e68', 0.9); }
      if (!side) { limb(c, B.wa + 2.5, -28, B.wa + 3, -23, 1.2, '#9aa0aa'); }
    } else if (R === ROLES.agri) { // bolsas de semillas
      const xs = side ? [-5] : [-B.wa - 1.2, B.wa + 1.2];
      for (const x of xs) { dot(c, x, -25.5, 2.8, P.dark, true); dot(c, x, -25.5, 1, P.acc); }
    } else if (R === ROLES.scientist) { // vial de muestras
      rr(c, side ? -6.5 : B.wa - 0.5, -28.5, 2.2, 5.4, 1); fillOl(c, P.glow, 0.9);
    } else if (R === ROLES.medic) { // bolsas médicas en las caderas
      for (const x of side ? [-4] : [-B.wa - 3.4, B.wa + 3.4]) { c.beginPath(); c.ellipse(x, -25.5, 3.4, 4.4, 0, 0, Math.PI * 2); fillOl(c, P.suit, 1); c.fillStyle = P.dark; c.fillRect(x - 2.4, -26.2, 4.8, 1.3); }
    }
  }

  /* ---------- Mochila / soporte vital ---------- */
  function packBack(c, R, t) {
    const P = R.pal, blink = 0.5 + 0.5 * Math.sin(t * 4);
    if (R === ROLES.commander) {
      for (const x of [-7.4, 3.2]) { rr(c, x, -45, 4.4, 15, 2.2); fillOl(c, P.shade); }
      rr(c, -3, -46, 6, 17, 1.6); fillOl(c, P.dark);
      dot(c, 0, -42.5, 0.9, P.acc); dot(c, 0, -39.5, 0.9, P.glow); glow(c, 0, -36.5, 1.1, '#5fe39a', blink);
      limb(c, 2, -46, 3.5, -52, 0.8, '#9aa0aa'); dot(c, 3.5, -52.5, 0.9, P.glow);
    } else if (R === ROLES.engineer) {
      rr(c, -10.5, -46.5, 21, 19, 2.2); fillOl(c, P.dark);
      c.save(); rr(c, -10, -31.5, 20, 3, 0.5); c.clip(); c.fillStyle = P.acc; for (let x = -12; x < 12; x += 4) { poly(c, [[x, -28.5], [x + 2, -28.5], [x + 5, -31.5], [x + 3, -31.5]]); c.fill(); } c.restore();
      for (const x of [-9.5, 6]) { rr(c, x, -44, 3.6, 10, 1); fillOl(c, '#5a5e68', 0.9); }
      rr(c, -4.5, -44, 9, 7, 1.2); fillOl(c, '#2b2d33', 1); glow(c, -2, -40.5, 1, P.glow, blink); dot(c, 2, -40.5, 0.9, '#5fe39a');
      limb(c, 5, -45, 11, -53, 1.6, '#9aa0aa'); c.beginPath(); c.arc(11.6, -54, 2.2, 0.6, 5.5); c.strokeStyle = '#9aa0aa'; c.lineWidth = 1.6; c.stroke();
    } else if (R === ROLES.scientist) {
      rr(c, -6.5, -45.5, 13, 14, 3); fillOl(c, P.shade);
      for (const x of [-4, 0, 4]) { dot(c, x, -33, 1.9, P.glow, true); }
      rr(c, -3, -43, 6, 4, 1); fillOl(c, P.dark, 0.9); glow(c, 0, -41, 0.9, P.glow, blink);
      limb(c, -5, -45, -7, -60, 0.9, '#c9ced8'); dot(c, -7, -61, 1.5, P.acc, true);
    } else if (R === ROLES.medic) {
      rr(c, -14, -48, 28, 18, 8); fillOl(c, P.shade);
      rr(c, -5.5, -43, 11, 8, 2); fillOl(c, P.suit, 1);
      c.strokeStyle = P.dark; c.lineWidth = 1; c.beginPath(); c.moveTo(-4.5, -39); c.lineTo(-1.5, -39); c.lineTo(-0.5, -41.5); c.lineTo(0.7, -36.5); c.lineTo(1.8, -39); c.lineTo(4.5, -39); c.stroke();
      for (const x of [-7.4, 4.4]) { rr(c, x, -33.5, 3, 4, 1.4); fillOl(c, P.acc, 0.9); }
    } else if (R === ROLES.agri) {
      rr(c, -8, -45.5, 16, 16, 3); fillOl(c, P.shade);
      for (const x of [-5.6, -1.4, 2.8]) { rr(c, x, -44, 2.8, 10, 1.3); c.save(); c.globalAlpha = 0.6; fillOl(c, '#dff6c9', 0.8); c.restore(); for (let y = -42; y < -35; y += 2.4) dot(c, x + 1.4, y, 0.7, P.dark); }
      c.beginPath(); c.ellipse(0, -32, 6, 2.4, 0, 0, Math.PI * 2); fillOl(c, '#7fb2d6', 0.9);
      c.strokeStyle = '#4b6b7d'; c.lineWidth = 1; c.beginPath(); c.moveTo(6, -32); c.quadraticCurveTo(12, -31, 11, -26); c.stroke();
    }
  }
  function packPeekFront(c, R) { // mochila asomando por detrás de los hombros + conductos
    const P = R.pal, B = R.body;
    if (R === ROLES.engineer) { rr(c, -B.sh - 0.5, -47, (B.sh + 0.5) * 2, 6, 2); fillOl(c, P.dark); limb(c, 7, -46, 11, -53, 1.6, '#9aa0aa'); c.beginPath(); c.arc(11.6, -54, 2.2, 0.6, 5.5); c.strokeStyle = '#9aa0aa'; c.lineWidth = 1.6; c.stroke(); }
    else if (R === ROLES.commander) { for (const x of [-7.4, 3.2]) { rr(c, x, -47.5, 4.4, 5, 2); fillOl(c, P.shade); } limb(c, 2, -46, 3.5, -52, 0.8, '#9aa0aa'); dot(c, 3.5, -52.5, 0.9, P.glow); }
    else if (R === ROLES.scientist) { limb(c, 5, -45, 7, -60, 0.9, '#c9ced8'); dot(c, 7, -61, 1.5, P.acc, true); }
    else if (R === ROLES.medic) { rr(c, -B.sh - 3.5, -49, (B.sh + 3.5) * 2, 9, 4.5); fillOl(c, P.shade); }
    else if (R === ROLES.agri) { for (const x of [-5.6, 2.8]) { rr(c, x, -48.5, 2.8, 5, 1.2); fillOl(c, '#dff6c9', 0.8); } }
    // conductos de soporte vital del casco a la mochila
    c.strokeStyle = OL; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-6.5, -47); c.quadraticCurveTo(-9.5, -46, -B.sh + 1, -44); c.moveTo(6.5, -47); c.quadraticCurveTo(9.5, -46, B.sh - 1, -44); c.stroke();
    c.strokeStyle = '#8c93a3'; c.lineWidth = 1.4; c.stroke();
  }
  function packSide(c, R, t) {
    const P = R.pal, blink = 0.5 + 0.5 * Math.sin(t * 4);
    if (R === ROLES.commander) { rr(c, -12, -45, 6.5, 16, 2); fillOl(c, P.shade); rr(c, -11, -43, 2.2, 12, 1); fillOl(c, P.dark, 0.8); glow(c, -8, -40, 1, P.glow, blink); limb(c, -9, -45, -10, -52, 0.8, '#9aa0aa'); dot(c, -10, -52.5, 0.9, P.glow); }
    else if (R === ROLES.engineer) { rr(c, -15, -47, 9.5, 19.5, 2); fillOl(c, P.dark); rr(c, -14, -36, 3.6, 7, 1); fillOl(c, '#5a5e68', 0.9); limb(c, -9, -46, -12, -54, 1.6, '#9aa0aa'); glow(c, -9, -42, 1, P.glow, blink); }
    else if (R === ROLES.scientist) { rr(c, -10.5, -45, 5, 14, 2); fillOl(c, P.shade); dot(c, -8, -32.5, 1.8, P.glow, true); limb(c, -8.5, -45, -10, -60, 0.9, '#c9ced8'); dot(c, -10, -61, 1.5, P.acc, true); }
    else if (R === ROLES.medic) { rr(c, -15, -47, 10, 18, 5); fillOl(c, P.shade); rr(c, -11.5, -42, 4, 6, 1.5); fillOl(c, P.suit, 0.9); }
    else if (R === ROLES.agri) { rr(c, -12, -45, 6.5, 16, 2.5); fillOl(c, P.shade); rr(c, -11.5, -44, 2.4, 10, 1); fillOl(c, '#dff6c9', 0.8); dot(c, -10.3, -40, 0.7, P.dark); dot(c, -10.3, -37, 0.7, P.dark); }
  }

  /* ---------- Hombreras ---------- */
  function shoulders(c, R, side) {
    const P = R.pal, B = R.body;
    const pads = side ? [[1.5]] : [[-B.sh], [B.sh]];
    for (const [x] of pads) {
      if (R === ROLES.commander) { const g = side ? 1 : Math.sign(x); poly(c, [[x - 3.6 * g, -46], [x + 2.6 * g, -46.5], [x + 6 * g, -50], [x + 4.6 * g, -41], [x - 3.8 * g, -41]]); fillOl(c, P.dark); c.fillStyle = P.acc; c.fillRect(x - 3, -42.2, 6, 1); }
      else if (R === ROLES.engineer) { c.beginPath(); c.ellipse(x, -43.5, 4.8, 3.6, 0, 0, Math.PI * 2); fillOl(c, P.dark); dot(c, x, -43.5, 0.8, '#9aa0aa'); }
      else if (R === ROLES.scientist) { c.beginPath(); c.ellipse(x, -43.5, 3, 2.4, 0, 0, Math.PI * 2); fillOl(c, P.shade); dot(c, x, -43.5, 0.8, P.glow); }
      else if (R === ROLES.medic) { c.beginPath(); c.ellipse(x, -43.5, 3.8, 3, 0, 0, Math.PI * 2); fillOl(c, P.suit); c.strokeStyle = P.dark; c.lineWidth = 0.8; c.beginPath(); c.arc(x, -43.5, 2.2, Math.PI, 0); c.stroke(); }
      else if (R === ROLES.agri) { poly(c, [[x - 3.6, -45], [x + 3.6, -45], [x + 4, -41.5], [x - 4, -41.5]]); fillOl(c, P.dark); }
    }
  }

  /* ---------- Casco ---------- */
  function face(c, R, x, y, expr, side) {
    const P = R.pal;
    dot(c, x, y + 0.6, 5, P.skin);
    c.fillStyle = OL;
    const eyes = side ? [x + 2.2] : [x - 2.1, x + 2.1];
    for (const ex of eyes) {
      if (expr === 'focus') c.fillRect(ex - 1, y - 0.5, 2, 0.8);
      else { c.beginPath(); c.arc(ex, y - 0.3, expr === 'alert' ? 1.15 : 0.9, 0, Math.PI * 2); c.fill(); }
    }
    if (expr === 'alert') { c.lineWidth = 0.7; c.strokeStyle = OL; for (const ex of eyes) { c.beginPath(); c.moveTo(ex - 1.2, y - 2.5); c.lineTo(ex + 1.2, y - 2.1); c.stroke(); } }
    const mx = side ? x + 1.8 : x;
    c.strokeStyle = OL; c.lineWidth = 0.8; c.beginPath();
    if (expr === 'happy') c.arc(mx, y + 1.4, 1.6, 0.2, Math.PI - 0.2);
    else if (expr === 'alert') c.arc(mx, y + 2.6, 0.8, 0, Math.PI * 2);
    else { c.moveTo(mx - 1.1, y + 2.4); c.lineTo(mx + 1.1, y + 2.4); }
    c.stroke();
  }
  function visorPath(c, R, side) {
    if (side) {
      if (R === ROLES.commander) poly(c, [[1, -56], [8.6, -55], [8, -48], [1, -48.5]]);
      else if (R === ROLES.engineer) rr(c, 2, -54.5, 7.6, 5.4, 1);
      else if (R === ROLES.scientist) poly(c, [[1.5, -57], [7, -57], [9, -52], [7, -47], [1.5, -47]]);
      else if (R === ROLES.medic) { c.beginPath(); c.ellipse(5, -52, 3.8, 4.4, 0, 0, Math.PI * 2); }
      else rr(c, 1.5, -56, 7.5, 8, 3);
      return;
    }
    if (R === ROLES.commander) poly(c, [[-7.6, -56], [7.6, -56], [6.4, -48], [-6.4, -48]]);
    else if (R === ROLES.engineer) rr(c, -6.6, -54.6, 13.2, 5.8, 1);
    else if (R === ROLES.scientist) poly(c, [[-6, -57.4], [6, -57.4], [8, -52], [6, -46.8], [-6, -46.8], [-8, -52]]);
    else if (R === ROLES.medic) { c.beginPath(); c.ellipse(-3.5, -52, 3.4, 4.4, 0, 0, Math.PI * 2); c.ellipse(3.5, -52, 3.4, 4.4, 0, 0, Math.PI * 2); }
    else rr(c, -6.6, -56.4, 13.2, 8.4, 3.2);
  }
  function visorFrame(c, R, side, t, alert) {
    const P = R.pal;
    visorPath(c, R, side);
    c.save(); c.globalAlpha = 0.42; c.fillStyle = P.visor; c.fill(); c.restore();
    c.lineWidth = 1.6; c.strokeStyle = alert ? '#ff5a5a' : R === ROLES.commander ? P.acc : P.dark; c.stroke();
    c.save(); visorPath(c, R, side); c.clip();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(side ? 3 : -5, -55); c.lineTo(side ? 5 : -2, -57); c.stroke();
    if (R === ROLES.scientist) { c.strokeStyle = P.glow; c.globalAlpha = 0.7; c.lineWidth = 0.5; c.beginPath(); c.moveTo(side ? 2 : -6, -50); c.lineTo(side ? 8 : 6, -50); c.moveTo(side ? 6 : 4.5, -55); c.lineTo(side ? 6 : 4.5, -53.5); c.stroke(); }
    c.restore();
    if (!side) {
      c.strokeStyle = OL; c.lineWidth = 1;
      if (R === ROLES.commander) { c.beginPath(); c.moveTo(0, -56); c.lineTo(0, -48); c.stroke(); }
      if (R === ROLES.engineer) { c.beginPath(); c.moveTo(-2.2, -54.6); c.lineTo(-2.2, -48.8); c.moveTo(2.2, -54.6); c.lineTo(2.2, -48.8); c.stroke(); }
    }
  }
  function helmet(c, R, dir, t, expr) {
    const P = R.pal, side = dir === 1, back = dir === 0, blink = 0.5 + 0.5 * Math.sin(t * 3);
    // anillo de cuello (separa casco y torso)
    c.beginPath(); c.ellipse(0, -45, 6.4, 2.4, 0, 0, Math.PI * 2); fillOl(c, '#8c93a3', 1.2);
    if (R === ROLES.agri) { c.beginPath(); c.ellipse(0, -57.5, side ? 14 : 15.5, side ? 2.4 : 4.2, 0, Math.PI, Math.PI * 2); fillOl(c, P.dark); }
    // carcasa
    if (R === ROLES.engineer) rr(c, -9.6, -62.5, 19.2, 18.5, 4);
    else if (R === ROLES.scientist) rr(c, -8.2, -64.5, 16.4, 20.5, 7);
    else if (R === ROLES.medic) { c.beginPath(); c.moveTo(-10.4, -45); c.lineTo(-10.4, -55); c.arc(0, -55, 10.4, Math.PI, 0); c.lineTo(10.4, -45); c.closePath(); }
    else rr(c, -8.6, -62.5, 17.2, 18.5, 6);
    fillOl(c, P.suit, 1.6);
    c.save(); c.clip(); c.globalAlpha = 0.35; c.fillStyle = P.shade; c.fillRect(side ? -9 : 3, -66, 9, 24); c.restore();
    // detalles por especialidad
    if (R === ROLES.commander) {
      poly(c, side ? [[-7, -62.2], [4, -62.2], [1, -66], [-6, -68]] : [[-1.8, -62.4], [1.8, -62.4], [1, -68], [-1, -68]]); fillOl(c, P.dark, 1);
      if (!back) { limb(c, side ? -6 : 8.4, -55, side ? -7 : 10.6, -64, 0.8, '#9aa0aa'); glow(c, side ? -7 : 10.6, -64.5, 1.2, P.glow, blink); }
      rr(c, side ? -8 : -9.6, -54, 2.2, 4, 0.8); fillOl(c, P.dark, 0.8); if (!side) { rr(c, 7.4, -54, 2.2, 4, 0.8); fillOl(c, P.dark, 0.8); }
    } else if (R === ROLES.engineer) {
      rr(c, -8.6, -61.5, 17.2, 4.4, 1); fillOl(c, '#5a5e68', 1); c.fillStyle = P.acc; c.fillRect(-8, -57.8, 16, 0.9);
      c.strokeStyle = P.dark; c.lineWidth = 1; for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x, -62.5); c.lineTo(x, -61.5); c.stroke(); }
      for (const x of side ? [8.6] : [-10.8, 10.8]) { rr(c, x - 1.4, -54.5, 2.8, 3.6, 0.8); fillOl(c, P.dark, 0.9); if (!back) glow(c, x + (side ? 1.5 : 0), -52.7, 1.6, P.glow, 0.7); }
    } else if (R === ROLES.scientist) {
      const mx = side ? -6 : -8; limb(c, mx, -58, mx - 3, -69, 0.9, '#c9ced8'); dot(c, mx - 3, -70, 1.7, P.acc, true); glow(c, mx - 3, -70, 3, P.glow, blink * 0.5);
      if (!side) { rr(c, 7, -56, 2, 5, 0.8); fillOl(c, P.dark, 0.8); }
    } else if (R === ROLES.medic) {
      c.beginPath(); c.ellipse(side ? 1 : 0, -65.2, 2.8, 1.5, 0, 0, Math.PI * 2); fillOl(c, P.dark, 0.9); glow(c, side ? 1 : 0, -65.4, 1.5, P.glow, 0.6 + 0.4 * blink);
      c.strokeStyle = P.acc; c.lineWidth = 0.9; c.beginPath(); c.moveTo(side ? -7 : -8, -50); c.lineTo(side ? -2 : -7.4, -46.5); c.stroke();
    } else if (R === ROLES.agri) {
      c.beginPath(); c.ellipse(0, -57.5, side ? 14 : 15.5, side ? 2.4 : 4.2, 0, 0, Math.PI); fillOl(c, P.dark);
      const lx = side ? -4 : 6; c.beginPath(); c.moveTo(lx, -62); c.quadraticCurveTo(lx + 4, -67, lx + 1, -69); c.quadraticCurveTo(lx - 2, -66, lx, -62); fillOl(c, P.acc, 0.9);
    }
    if (back) { // placa trasera y conectores
      // cresta vertical del regulador y conductos hacia la mochila (sin rasgos tipo "cara")
      rr(c, -1.6, -62, 3.2, 14, 1.4); fillOl(c, P.dark, 1);
      glow(c, 0, -59, 0.9, P.glow, blink);
      c.strokeStyle = OL; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-4.5, -47); c.quadraticCurveTo(-6, -44, -4, -42); c.moveTo(4.5, -47); c.quadraticCurveTo(6, -44, 4, -42); c.stroke();
      c.strokeStyle = '#8c93a3'; c.lineWidth = 1.2; c.stroke();
      return;
    }
    // rostro detrás del visor
    c.save(); visorPath(c, R, side); c.clip(); face(c, R, side ? 4.6 : 0, -52.5, expr, side); c.restore();
    visorFrame(c, R, side, t, expr === 'alert');
  }

  /* ---------- Accesorios ---------- */
  function accessory(c, R, hx, hy, pose, t, dir) {
    const P = R.pal, on = pose === 'interact' || pose === 'repair';
    if (R === ROLES.commander) { // proyector holográfico en el antebrazo
      rr(c, hx - 2.2, hy - 5.5, 4.4, 3.2, 0.8); fillOl(c, P.dark, 0.8); dot(c, hx, hy - 3.9, 0.8, P.glow);
      if (on || pose === 'idle') {
        const a = on ? 0.75 : 0.35, f = 0.85 + 0.15 * Math.sin(t * 7);
        c.save(); c.globalAlpha = a * f; c.strokeStyle = P.glow; c.lineWidth = 0.8;
        const cy = hy - (on ? 12 : 9), s = on ? 5 : 3;
        poly(c, [[hx, cy - s], [hx + s, cy + s * 0.6], [hx - s, cy + s * 0.6]]); c.stroke();
        c.beginPath(); c.ellipse(hx, cy, s * 1.2, s * 0.4, 0, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(hx, hy - 5); c.lineTo(hx - s * 0.8, cy + s * 0.6); c.moveTo(hx, hy - 5); c.lineTo(hx + s * 0.8, cy + s * 0.6); c.globalAlpha *= 0.4; c.stroke();
        c.restore();
      }
    } else if (R === ROLES.engineer) { // herramienta multifunción
      const ang = pose === 'repair' ? -0.6 + 0.5 * Math.sin(t * 16) : 0.3;
      c.save(); c.translate(hx, hy); c.rotate(ang);
      limb(c, 0, 0, 0, -8, 1.6, '#9aa0aa'); c.beginPath(); c.arc(0, -9.6, 2.2, 0.5 + Math.PI / 2, 2 * Math.PI + Math.PI / 2 - 0.5); c.strokeStyle = '#9aa0aa'; c.lineWidth = 1.8; c.stroke();
      dot(c, 0, -1.5, 1, P.acc); c.restore();
      if (pose === 'repair' && Math.sin(t * 16) > 0.6) for (let i = 0; i < 3; i++) dot(c, hx + (Math.random() - 0.5) * 7, hy - 9 + (Math.random() - 0.5) * 5, 0.7, '#ffe27a');
    } else if (R === ROLES.scientist) { // escáner de muestras
      rr(c, hx - 1.6, hy - 7, 3.2, 8, 1); fillOl(c, P.dark, 0.9); rr(c, hx - 1, hy - 6.2, 2, 2.4, 0.5); c.fillStyle = P.glow; c.fill();
      if (on) { c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 10); c.fillStyle = P.glow; const d = dir === 3 ? -1 : 1; poly(c, dir === 1 || dir === 3 ? [[hx, hy - 6], [hx + 14 * d, hy - 2], [hx + 14 * d, hy + 6]] : [[hx, hy - 6], [hx - 5, hy + 10], [hx + 5, hy + 10]]); c.fill(); c.restore(); }
    } else if (R === ROLES.medic) { // escáner biomédico
      dot(c, hx, hy - 4, 2.8, P.dark, true); c.beginPath(); c.arc(hx, hy - 4, 1.8, 0, Math.PI * 2); c.strokeStyle = P.glow; c.lineWidth = 0.9; c.stroke();
      if (on) { c.save(); c.globalAlpha = 0.5; c.beginPath(); c.arc(hx, hy - 4, 4 + 2 * ((t * 2) % 1), 0, Math.PI * 2); c.strokeStyle = P.glow; c.stroke(); c.restore(); }
    } else if (R === ROLES.agri) { // módulo de análisis de plantas
      rr(c, hx - 2.4, hy - 6, 4.8, 4.4, 1.2); fillOl(c, P.dark, 0.9);
      c.beginPath(); c.moveTo(hx, hy - 5.4); c.quadraticCurveTo(hx + 1.8, hy - 4, hx, hy - 2.4); c.quadraticCurveTo(hx - 1.8, hy - 4, hx, hy - 5.4); c.fillStyle = P.acc; c.fill();
      limb(c, hx, hy - 1.6, hx, hy + 3, 0.6, '#9aa0aa');
    }
  }
  function box(c, x, y) { rr(c, x - 5.5, y - 4, 11, 7.5, 1.2); fillOl(c, '#c9a26b', 1.2); c.strokeStyle = '#7a5a30'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 5.5, y - 1.5); c.lineTo(x + 5.5, y - 1.5); c.stroke(); dot(c, x, y + 1, 1.1, '#ffe1a8'); }

  /* ---------- Poses ---------- */
  function armPoses(pose, t, sw, dir) {
    // devuelve [a1,a2] para brazo cercano/derecho (n) y lejano/izquierdo (f)
    if (dir === 1 || dir === 3) {
      switch (pose) {
        case 'walk': return { n: [-sw * 0.65, 0.35], f: [sw * 0.65, 0.35] };
        case 'interact': return { n: [1.25, 0.25 + 0.08 * Math.sin(t * 9)], f: [1.05, 0.45] };
        case 'repair': return { n: [1.0 + 0.3 * Math.sin(t * 16), 0.7], f: [0.7, 0.9] };
        case 'carry': return { n: [0.75 - sw * 0.1, 1.1], f: [0.75 + sw * 0.1, 1.1] };
        case 'alert': return { n: [0.9, -0.4], f: [0.6, -0.2] };
        case 'celebrate': return { n: [2.8 + 0.15 * Math.sin(t * 10), 0.1], f: [2.6, 0.1] };
        default: return { n: [0.06 + 0.03 * Math.sin(t * 2), 0.18], f: [-0.04, 0.18] };
      }
    }
    switch (pose) {
      case 'walk': return { n: [0.14, 0.05 + sw * 0.12], f: [0.14, 0.05 - sw * 0.12], lift: sw };
      case 'interact': return { n: [0.28, -1.95 + 0.1 * Math.sin(t * 9)], f: [0.28, -1.95 + 0.1 * Math.sin(t * 9 + 2)] };
      case 'repair': return { n: [0.4, -1.6 + 0.6 * Math.sin(t * 16)], f: [0.25, -1.5] };
      case 'carry': return { n: [0.15, -1.45], f: [0.15, -1.45] };
      case 'alert': return { n: [0.75, -0.9], f: [0.75, -0.9] };
      case 'celebrate': return { n: [2.6 + 0.15 * Math.sin(t * 10), 0.15], f: [2.6 + 0.15 * Math.sin(t * 10 + 1), 0.15] };
      default: return { n: [0.13 + 0.02 * Math.sin(t * 2), 0.08], f: [0.13 + 0.02 * Math.sin(t * 2), 0.08] };
    }
  }

  /**
   * Dibuja un astronauta. o: { dir, t, pose, moving, scale, rm (reducir movimiento), shadow }
   * Pivote: pies en (x,y). Altura visual ≈ 64 * scale px.
   */
  function draw(c, role, x, y, o) {
    const R = ROLES[role] || ROLES.commander, P = R.pal, B = R.body;
    o = o || {};
    const dir = o.dir == null ? 2 : o.dir, t = o.t || 0, s = o.scale || 1, rm = !!o.rm;
    let pose = o.pose || (o.moving ? 'walk' : 'idle');
    const walking = o.moving || pose === 'walk';
    const amp = rm ? 0.5 : 1;
    const ph = t * 9.5, sw = walking ? Math.sin(ph) * amp : 0;
    let bob = walking ? -Math.abs(Math.cos(ph)) * 1.4 * amp : rm ? 0 : Math.sin(t * 2) * 0.35;
    if (pose === 'celebrate' && !rm) bob -= Math.abs(Math.sin(t * 7)) * 5;
    if (pose === 'alert' && !rm) bob += Math.sin(t * 30) * 0.4;
    const expr = pose === 'celebrate' ? 'happy' : pose === 'alert' ? 'alert' : pose === 'interact' || pose === 'repair' ? 'focus' : 'neutral';
    const armPose = armPoses(pose === 'walk' || (walking && pose === 'idle') ? 'walk' : pose, t, sw, dir);
    c.save();
    c.translate(x, y); c.scale(s * (dir === 3 ? -1 : 1), s);
    if (o.shadow !== false) { c.save(); c.globalAlpha = 0.32; c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, 0.5, dir === 1 || dir === 3 ? 10 : 11.5, 3.6, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.translate(0, bob);
    const D = dir === 3 ? 1 : dir;
    if (D === 2 || D === 0) {
      const front = D === 2;
      const sxL = -B.sh + 1, sxR = B.sh - 1, sy = -42.5;
      if (front) packPeekFront(c, R);
      // piernas
      const liftL = walking ? Math.max(0, sw) * 3 : 0, liftR = walking ? Math.max(0, -sw) * 3 : 0;
      legFront(c, R, -4.2, -28, front ? liftL : liftR, false);
      legFront(c, R, 4.2, -28, front ? liftR : liftL, false);
      torsoFront(c, R, !front);
      belt(c, R, false);
      if (!front) packBack(c, R, t);
      shoulders(c, R, false);
      // brazos (derecho de pantalla = +x)
      const pn = armPose.n, pf = armPose.f;
      const right = arm(c, R, sxR, sy, pn[0], pn[1], false);
      const left = arm(c, R, sxL, sy, -pf[0], -pf[1], false);
      if (pose === 'carry' && front) { box(c, 0, -31); dot(c, right.hx, right.hy, B.arm * 0.66, P.glove, true); dot(c, left.hx, left.hy, B.arm * 0.66, P.glove, true); }
      if (front && R === ROLES.medic) { rr(c, left.ex + (left.hx - left.ex) * 0.35 - 2, left.ey + (left.hy - left.ey) * 0.35 - 1.4, 4, 2.8, 0.8); fillOl(c, P.dark, 0.8); glow(c, left.ex + (left.hx - left.ex) * 0.35, left.ey + (left.hy - left.ey) * 0.35, 1, P.glow, 0.6 + 0.4 * Math.sin(t * 5)); }
      if (front && R === ROLES.agri) { c.strokeStyle = '#4b6b7d'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-B.sh + 1, -40); c.quadraticCurveTo(left.ex - 2, left.ey, left.hx, left.hy - 2); c.stroke(); }
      if (pose !== 'carry' && pose !== 'celebrate') accessory(c, R, right.hx, right.hy, pose, t, dir);
      helmet(c, R, front ? 2 : 0, t, expr);
    } else {
      // vista lateral (mirando a +x; la izquierda se espeja)
      const pn = armPose.n, pf = armPose.f;
      const th = walking ? sw * 0.55 : 0, kbN = walking ? Math.max(0, -Math.cos(ph)) * 0.75 * amp : 0, kbF = walking ? Math.max(0, Math.cos(ph)) * 0.75 * amp : 0;
      arm(c, R, -0.5, -42.5, pf[0], pf[1], true);
      legSide(c, R, -th, kbF, true);
      packSide(c, R, t);
      // torso lateral
      rr(c, -6, -45, 12, 18.5, 4); fillOl(c, P.suit, 1.6);
      c.save(); rr(c, -6, -45, 12, 18.5, 4); c.clip(); c.globalAlpha = 0.35; c.fillStyle = P.shade; c.fillRect(-6, -45, 4.5, 19); c.restore();
      if (R === ROLES.engineer) { rr(c, 1, -43, 5, 8, 1.4); fillOl(c, P.dark, 1); }
      else if (R === ROLES.commander) { c.strokeStyle = P.acc; c.lineWidth = 1.2; c.beginPath(); c.moveTo(2, -41); c.lineTo(4, -39); c.lineTo(2, -37); c.stroke(); }
      else if (R === ROLES.scientist) { dot(c, 3.5, -40, 1.6, P.dark, true); dot(c, 3.5, -40, 0.7, P.glow); }
      else if (R === ROLES.medic) { rr(c, 1.5, -42, 4.5, 4, 1); fillOl(c, P.dark, 0.9); }
      else if (R === ROLES.agri) { dot(c, 3, -39.5, 2, P.dark, true); }
      legSide(c, R, th, kbN, false);
      belt(c, R, true);
      helmet(c, R, 1, t, expr);
      shoulders(c, R, true);
      const near = arm(c, R, 1, -42.5, pn[0], pn[1], false);
      if (pose === 'carry') { box(c, near.hx + 1.5, near.hy - 1.5); dot(c, near.hx, near.hy, B.arm * 0.66, P.glove, true); }
      else if (pose !== 'celebrate') accessory(c, R, near.hx, near.hy, pose, t, 1);
    }
    c.restore();
    if (pose === 'alert') { c.save(); c.font = 'bold ' + Math.round(14 * s * 1.1) + 'px system-ui'; c.textAlign = 'center'; c.fillStyle = '#ffc24a'; c.strokeStyle = OL; c.lineWidth = 3; const yy = y + (-76 + bob) * s; c.strokeText('!', x, yy); c.fillText('!', x, yy); c.restore(); }
  }

  /** Dibuja solo el accesorio ampliado (para la hoja de personajes). */
  function drawAccessory(c, role, x, y, s, t) { const R = ROLES[role]; c.save(); c.translate(x, y); c.scale(s, s); accessory(c, R, 0, 6, 'interact', t, 2); c.restore(); }

  return { ROLES, ORDER, draw, drawAccessory, HEIGHT: 64 };
})();
