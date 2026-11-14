/* =====================================================================
   FLORA — Plantas 2D originales dibujadas por código (sin imágenes).
   Especies cultivadas en la ISS (NASA Veggie / Advanced Plant Habitat):
   lechuga romana roja, mizuna, rábano, chile y zinnia.
   Pivote: punto de siembra en el sustrato (0,0). Altura máxima ≈ 34 u.
   Estado visual: estrés hídrico (marchitez), exceso de agua, poca luz
   (tallo alargado y pálido), falta de nutrientes (clorosis), plagas.
   ===================================================================== */
const Flora = (function () {
  const OL = 'rgba(12,20,10,.55)';
  const SPECIES = {
    romaine: { short: { es: 'Lechuga', en: 'Lettuce' }, name: { es: 'Lechuga romana', en: 'Romaine lettuce' }, leaf: '#5ea83f', edge: '#8a2a4a', vein: '#cfe8b0', seed: '#9a9a8a' },
    mizuna: { short: { es: 'Mizuna', en: 'Mizuna' }, name: { es: 'Mizuna', en: 'Mizuna' }, leaf: '#8fd14f', edge: '#5fa83a', vein: '#cfe6a8', seed: '#7a5a3a' },
    radish: { short: { es: 'Rábano', en: 'Radish' }, name: { es: 'Rábano', en: 'Radish' }, leaf: '#5fa83a', edge: '#3f7f2a', vein: '#d77aa0', seed: '#8a5a3a', root: '#d23c6a' },
    chili: { short: { es: 'Chile', en: 'Chili' }, name: { es: 'Planta de chile', en: 'Chili pepper' }, leaf: '#3f7f34', edge: '#2f6328', vein: '#9fd07a', seed: '#e8d79a', fruit: '#d8302a', stem: '#5d7a3a' },
    zinnia: { short: { es: 'Zinnia', en: 'Zinnia' }, name: { es: 'Zinnia', en: 'Zinnia' }, leaf: '#4a8f3c', edge: '#356e2c', vein: '#a8d88a', seed: '#8a7a5a', petals: ['#e0458c', '#ff8a2a', '#f2c230'] }
  };
  const STAGES = { es: ['Semilla', 'Brote', 'Planta joven', 'Desarrollo avanzado', 'Planta madura'], en: ['Seed', 'Sprout', 'Young plant', 'Advanced growth', 'Mature plant'] };
  const stage = (prog) => (prog >= 1 ? 4 : prog >= 0.6 ? 3 : prog >= 0.3 ? 2 : prog >= 0.08 ? 1 : 0);

  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const p = (h) => [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* Hoja con distintos bordes. Base en (0,0) y punta en (0,-len) antes de rotar. */
  function leaf(c, x, y, ang, len, wid, fill, edge, vein, type, r) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.beginPath(); c.moveTo(0, 0);
    const N = type === 'serrated' ? 9 : type === 'lobed' ? 5 : 8;
    const side = (sgn) => {
      for (let i = 1; i <= N; i++) {
        const t = i / N, yy = -len * t;
        let w = wid * Math.sin(Math.PI * Math.pow(t, type === 'lance' ? 0.8 : 0.9)) * (type === 'lance' ? 0.75 : 1);
        if (type === 'wavy') w *= 1 + 0.16 * Math.sin(i * 2.6 + (r || 0));
        if (type === 'serrated') w *= i % 2 ? 1.25 : 0.45;
        if (type === 'lobed') w *= (0.5 + 0.5 * t) * (i % 2 ? 1.2 : 0.55) + (i === N - 1 ? 0.5 : 0);
        c.lineTo(sgn * w, yy);
      }
    };
    side(1); c.lineTo(0, -len);
    // regreso por el otro lado
    for (let i = N; i >= 1; i--) {
      const t = i / N, yy = -len * t;
      let w = wid * Math.sin(Math.PI * Math.pow(t, type === 'lance' ? 0.8 : 0.9)) * (type === 'lance' ? 0.75 : 1);
      if (type === 'wavy') w *= 1 + 0.16 * Math.sin(i * 2.6 + 1.3 + (r || 0));
      if (type === 'serrated') w *= i % 2 ? 1.25 : 0.45;
      if (type === 'lobed') w *= (0.5 + 0.5 * t) * (i % 2 ? 1.2 : 0.55) + (i === N - 1 ? 0.5 : 0);
      c.lineTo(-w, yy);
    }
    c.closePath();
    c.fillStyle = fill; c.fill();
    c.lineWidth = 0.9; c.strokeStyle = edge; c.stroke();
    c.strokeStyle = vein; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * 0.9); c.stroke();
    c.restore();
  }
  function stem(c, x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + (x2 - x1) * 0.2, (y1 + y2) / 2, x2, y2); c.stroke(); }
  function seedShape(c, sp, col, r) {
    c.fillStyle = col; c.strokeStyle = OL; c.lineWidth = 0.6;
    c.beginPath();
    if (sp === 'romaine') c.ellipse(0, -0.8, 0.8, 2, 0.4 + r, 0, Math.PI * 2);
    else if (sp === 'mizuna') c.arc(0, -0.8, 1, 0, Math.PI * 2);
    else if (sp === 'radish') c.arc(0, -1.1, 1.5, 0, Math.PI * 2);
    else if (sp === 'chili') c.ellipse(0, -0.9, 1.9, 1.2, r, 0, Math.PI * 2);
    else { c.moveTo(-1.4, 0); c.lineTo(0, -3); c.lineTo(1.4, 0); c.closePath(); }
    c.fill(); c.stroke();
  }

  /**
   * Dibuja una planta. st: { prog, hp, moist, nutr, light, pest, seed, pestKnown }
   */
  function draw(c, sp, x, y, scale, st, t) {
    const S = SPECIES[sp]; if (!S) return;
    st = st || {};
    const prog = st.prog || 0, sg = stage(prog), r = rng(st.seed || 1);
    const vScale = 0.88 + r() * 0.24, tilt = (r() - 0.5) * 0.25, extra = r() < 0.5 ? 0 : 1, hueKey = r();
    const dry = st.moist == null ? 0 : Math.max(0, (28 - st.moist) / 28);
    const wet = st.moist == null ? 0 : Math.max(0, (st.moist - 82) / 18);
    const dark = st.light == null ? 0 : Math.max(0, (0.45 - st.light) / 0.45);
    const chlor = st.nutr == null ? 0 : Math.max(0, (25 - st.nutr) / 25);
    const sick = st.hp == null ? 0 : Math.max(0, (55 - st.hp) / 55);
    let col = S.leaf;
    col = mix(col, '#a8c88a', dark * 0.55);
    col = mix(col, '#d6d65a', chlor * 0.7);
    col = mix(col, '#b59a3a', dry * 0.65 + sick * 0.3);
    col = mix(col, '#2f5226', wet * 0.6);
    const edge = mix(S.edge, '#6b5a2a', dry * 0.5 + sick * 0.4);
    const droop = Math.min(1, dry * 1.2 + sick * 0.5);
    const stretch = 1 + dark * 0.45;
    const sway = t == null ? 0 : Math.sin(t * 1.3 + (st.seed || 0) % 7) * 0.03;
    c.save(); c.translate(x, y); c.scale(scale * vScale, scale * vScale); c.rotate(tilt * 0.3 + sway);
    // tierra húmeda alrededor
    c.fillStyle = wet > 0 ? 'rgba(40,60,80,.55)' : st.moist > 40 ? 'rgba(20,12,6,.35)' : 'rgba(120,90,50,.25)';
    c.beginPath(); c.ellipse(0, 0.5, 5 + sg * 1.3, 1.8, 0, 0, Math.PI * 2); c.fill();
    if (wet > 0) { c.fillStyle = 'rgba(150,210,255,.6)'; for (const dx of [-4, 3, 6]) { c.beginPath(); c.ellipse(dx, 1, 1.6, 0.6, 0, 0, Math.PI * 2); c.fill(); } }
    if (sg === 0) { seedShape(c, sp, S.seed, r()); c.restore(); return; }
    const g = sg === 4 ? 1 : 0.15 + 0.85 * prog; // crecimiento continuo
    if (sg === 1) { // brote con cotiledones
      const h = (4 + 6 * (prog / 0.3)) * stretch;
      stem(c, 0, 0, 0, -h, 1, mix('#b9d88a', col, 0.3));
      const cotType = sp === 'radish' ? 'wavy' : 'oval';
      const cw = sp === 'radish' ? 2.6 : 1.8, cl = sp === 'radish' ? 3.6 : 4.2;
      leaf(c, 0, -h, -1.1 - droop * 0.6, cl, cw, col, edge, S.vein, cotType, 1);
      leaf(c, 0, -h, 1.1 + droop * 0.6, cl, cw, col, edge, S.vein, cotType, 2);
      if (sp === 'radish') { c.fillStyle = '#e2a3b8'; c.fillRect(-0.4, -h, 0.8, h); }
      c.restore(); return;
    }
    if (sp === 'romaine' || sp === 'mizuna' || sp === 'radish') {
      const n = (sp === 'mizuna' ? [0, 0, 7, 11, 15] : sp === 'radish' ? [0, 0, 4, 6, 7] : [0, 0, 4, 7, 10])[sg] + extra;
      const L = (sp === 'romaine' ? 24 : sp === 'mizuna' ? 17 : 14) * g * stretch, W = (sp === 'romaine' ? 6.5 : sp === 'mizuna' ? 2.4 : 7.5) * g * (1 - dark * 0.3);
      const spread = sp === 'mizuna' ? 1.75 : sp === 'radish' ? 1.05 : 0.55;
      const type = sp === 'romaine' ? 'wavy' : sp === 'mizuna' ? 'serrated' : 'lobed';
      // raíz del rábano visible (hombros rojos sobre el sustrato)
      const order = [];
      for (let i = 0; i < n; i++) order.push(i);
      // hojas exteriores primero (detrás), interiores al final
      order.sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));
      for (const i of order) {
        const f = n > 1 ? i / (n - 1) - 0.5 : 0;
        let ang = f * spread * 2 + (r() - 0.5) * 0.18;
        const outer = Math.abs(f) * 2;
        ang += Math.sign(ang || 1) * droop * (0.6 + outer * 0.5);
        const lenK = 1 - outer * 0.22 + (r() - 0.5) * 0.12;
        let fc = col; if ((wet > 0 || chlor > 0) && outer > 0.6) fc = mix(col, '#d8cf5a', 0.5); // hojas viejas amarillean primero
        if (sp === 'radish') stem(c, 0, 0, Math.sin(ang) * L * 0.35, -Math.cos(ang) * L * 0.35, 1, S.vein);
        leaf(c, 0, 0, ang, L * lenK * (1 - droop * 0.2), W * (0.8 + r() * 0.3), fc, sp === 'romaine' ? mix(edge, S.edge, 0.4 + 0.4 * sg / 4) : edge, S.vein, type, i);
      }
      // raíz del rábano: los "hombros" rojos asoman sobre el sustrato al madurar
      if (sp === 'radish' && sg >= 3) { const rw = 2.6 + sg * 0.9; c.fillStyle = S.root; c.beginPath(); c.ellipse(0, 0.6, rw, rw * 0.85, 0, Math.PI, Math.PI * 2); c.closePath(); c.fill(); c.strokeStyle = '#8a1f45'; c.lineWidth = 0.6; c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-rw * 0.4, -rw * 0.4, rw * 0.22, rw * 0.15, -0.5, 0, Math.PI * 2); c.fill(); }
    } else if (sp === 'chili') {
      const H = (8 + 22 * g) * stretch;
      stem(c, 0, 0, 0, -H, 1.6, S.stem);
      const br = sg >= 3 ? [[-0.55, 0.55], [0.6, 0.62], [-0.4, 0.8]] : sg >= 2 ? [[-0.5, 0.6], [0.55, 0.7]] : [];
      const tips = [[0, -H]];
      for (const [a, at] of br) { const bx = Math.sin(a) * H * 0.45, by = -H * at - Math.cos(a) * H * 0.25; stem(c, 0, -H * at, bx, by, 1.1, S.stem); tips.push([bx, by]); }
      const lpb = sg >= 3 ? 4 : 3;
      tips.forEach(([tx, ty], ti) => {
        for (let k = 0; k < lpb; k++) {
          const a = (k % 2 ? 1 : -1) * (0.9 + r() * 0.5) + droop * (k % 2 ? 1 : -1) * 0.8;
          leaf(c, tx * (0.6 + k * 0.12), ty * (0.6 + k * 0.12) + 2, a, 7 * (0.7 + g * 0.5), 2.6, col, edge, S.vein, 'lance', k + ti);
        }
      });
      if (sg === 3) tips.forEach(([tx, ty]) => { for (const d of [-2, 2]) { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(tx + d, ty + 1, 1.4, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e8d070'; c.beginPath(); c.arc(tx + d, ty + 1, 0.5, 0, Math.PI * 2); c.fill(); } });
      if (sg === 4) tips.forEach(([tx, ty], i) => { const fc = i % 3 === 2 ? '#3f9a34' : S.fruit; c.save(); c.translate(tx + (i % 2 ? 2.5 : -2.5), ty + 3); c.rotate(i % 2 ? 0.25 : -0.25); c.fillStyle = fc; c.beginPath(); c.moveTo(-1.3, 0); c.quadraticCurveTo(-1.6, 5, 0, 8); c.quadraticCurveTo(1.6, 5, 1.3, 0); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.5; c.stroke(); c.fillStyle = '#4c8a34'; c.fillRect(-0.9, -1, 1.8, 1.4); c.restore(); });
    } else if (sp === 'zinnia') {
      const H = (8 + 24 * g) * stretch;
      const bend = droop * 6;
      stem(c, 0, 0, bend, -H, 1.5, mix('#5a8f3a', col, 0.3));
      const pairs = sg >= 3 ? 4 : sg >= 2 ? 3 : 2;
      for (let k = 0; k < pairs; k++) {
        const yy = -H * (0.18 + k * 0.2), xx = bend * (0.18 + k * 0.2);
        for (const s2 of [-1, 1]) leaf(c, xx, yy, s2 * (1.15 + droop * 0.7) + (r() - 0.5) * 0.15, 8 * (0.7 + g * 0.4) * (1 - k * 0.08), 2.8, col, edge, S.vein, 'lance', k);
      }
      if (sg === 3) { c.fillStyle = '#5a8f3a'; c.beginPath(); c.ellipse(bend, -H - 2, 2.4, 3, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = S.petals[Math.floor(hueKey * 3)]; c.beginPath(); c.ellipse(bend, -H - 4, 1.4, 1.6, 0, 0, Math.PI * 2); c.fill(); }
      if (sg === 4) {
        const pc = S.petals[Math.floor(hueKey * 3)], fx = bend, fy = -H - 4;
        for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + ring * 0.26, R = ring ? 4.2 : 6;
          c.fillStyle = ring ? mix(pc, '#ffffff', 0.15) : pc; c.save(); c.translate(fx, fy); c.rotate(a); c.beginPath(); c.ellipse(0, -R * 0.55, 1.5, R * 0.55, 0, 0, Math.PI * 2); c.fill(); c.restore();
        }
        c.fillStyle = '#c99a2a'; c.beginPath(); c.arc(fx, fy, 2.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#7a4a1a'; c.beginPath(); c.arc(fx, fy, 1.1, 0, Math.PI * 2); c.fill();
      }
    }
    // plaga: pequeños insectos/manchas sobre las hojas
    if (st.pest) {
      const n = st.pestKnown ? 7 : 4;
      for (let i = 0; i < n; i++) { const px = (r() - 0.5) * 14, py = -3 - r() * 14 * g; c.fillStyle = st.pestKnown ? '#e8f06a' : '#2b2b22'; c.beginPath(); c.arc(px, py, 0.8, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }

  /** Rábano cosechado con raíz completa (para la ficha). */
  function drawHarvested(c, sp, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (sp === 'radish') {
      c.fillStyle = '#d23c6a'; c.beginPath(); c.ellipse(0, 6, 6, 7, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#8a1f45'; c.lineWidth = 0.8; c.stroke();
      c.strokeStyle = '#f2d0dc'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 13); c.quadraticCurveTo(1, 17, 0, 21); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-2, 4, 1.5, 2.6, -0.4, 0, Math.PI * 2); c.fill();
      for (const a of [-0.6, 0, 0.6]) leaf(c, 0, 0, a, 14, 4.5, '#5fa83a', '#3f7f2a', '#d77aa0', 'lobed', 1);
    } else draw(c, sp, 0, 0, 1, { prog: 1, hp: 100, moist: 55, nutr: 70, light: 1, seed: 7 });
    c.restore();
  }

  return { SPECIES, STAGES, stage, draw, drawHarvested };
})();
