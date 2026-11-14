/*SIM-START*/
/* =====================================================================
   SIM — Motor de simulación independiente de la interfaz.
   - Estado JSON puro (clonable con structuredClone / JSON).
   - Tiempo en horas simuladas. RNG con semilla guardada en el estado.
   - Cada parámetro se etiqueta en PARAMS_DOC como:
       R = medición/dato real publicado, M = estimación derivada de un modelo,
       G = parámetro simplificado para jugabilidad.
   ===================================================================== */
const Sim = (function () {
  'use strict';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fin = (v, d) => (Number.isFinite(v) ? v : d);

  /* ---------- Parámetros documentados ---------- */
  const P = {
    O2_PER_PERSON_DAY: 0.84,   // R: kg O2/persona/día (NASA, diseño de soporte vital; ~0.84 kg)
    O2_STOICH_WATER: 1.125,    // R: L de agua por kg de O2 en electrólisis (2H2O→2H2+O2; 18/16)
    WATER_PER_PERSON_DAY: 3.5, // G: L/persona/día de uso doméstico mínimo dentro del modelo
    FOOD_PER_PERSON_DAY: 0.62, // M: kg de ración equivalente/persona/día (orden de magnitud de menús deshidratados)
    O2GEN_MAX: 0.30,           // G: kg/h máximo del generador (dimensionado para 5 tripulantes)
    O2GEN_KW: 3.0,             // G: kW a máxima producción
    REC_EFF_ECO: 0.85,         // M: fracción de agua recuperada (ISS recupera >90 % en su mejor configuración)
    REC_EFF_MAX: 0.93,         // M
    REC_KW_ECO: 1.4, REC_KW_MAX: 2.2, // G
    REACTOR_KW: 6,             // G: reactor de fisión pequeño (NASA estudia sistemas de ~40 kWe; aquí reducido)
    BATT_KWH: 200,             // G
    BATT_MAX_DIS: 15,          // G: kW
    CHARGE_EFF: 0.92,          // M: eficiencia típica de carga de baterías de ion-litio
    LIGHT_KW_PER_BED: 0.6,     // G
    O2_BAND: [19.5, 23.5],     // R: rango de O2 en cabina considerado seguro (normas de seguridad ocupacional / NASA)
    CROP_CYCLE_H: 168,         // G: ciclo comprimido a 7 días simulados (simplificación educativa)
    LIGHT_MIN_TO_H: 1,         // G: escala de comunicaciones: 1 minuto-luz real ≈ 1 h simulada
    WASTE_PER_PERSON_DAY: 0.3, // G: kg de residuos reciclables (envases, textiles) por persona y día
    ISRU_KW: 1.8,              // G: extracción y fusión de hielo de regolito (concepto ISRU real; potencia simplificada)
    ISRU_LPH: 0.45,            // G: litros/hora de agua extraída
    MOON_ONEWAY_H: 0.3         // G: la Luna está a ~1,3 s-luz (R); se muestra con un mínimo jugable
  };
  const SC = {
    moon: { reactorKw: 6, g: 1.62, gcr: 1.37, tOut: -120, heat: 1.8, sunBase: 0.85, sunAmp: 0.1, sunPeriod: 24 * 29.5, solarPeak: 12, dustRate: 0.0006 },
    // gcr Luna: ~1,37 mSv/día medido por Chang'e-4 LND (Zhang et al., Science Advances 2020) [R]
    mars: { reactorKw: 10, g: 3.71, gcr: 0.64, tOut: -60, heat: 2.2, sunBase: 0.43, sol: 24.66, solarPeak: 18, dustRate: 0.0009 }
    // gcr Marte: ~0,64 mSv/día medido por MSL/RAD en el cráter Gale (Hassler et al., Science 2014) [R]
    // sunBase Marte: ~43 % de la irradiancia solar que llega a la Tierra [R]; sol = 24,66 h [R]
  };
  const DIFFS = {
    explorer: { cons: 0.85, ev: 0.5, maxInc: 1, dose: 120, lead: 8, startPct: 0.9, shelter: 5, repair: 1.3, grace: 1.4, mat: 50, budget: 20, samples: 3 },
    engineer: { cons: 1.0, ev: 1.0, maxInc: 2, dose: 80, lead: 5, startPct: 0.75, shelter: 4, repair: 1.0, grace: 1.0, mat: 36, budget: 14, samples: 4 },
    commander: { cons: 1.1, ev: 1.6, maxInc: 3, dose: 60, lead: 3, startPct: 0.62, shelter: 3, repair: 0.85, grace: 0.7, mat: 26, budget: 12, samples: 5 }
  };
  const CROPS = {
    micro: { y: 1.3, light: 0.5, water: 0.45, T: 21 },
    lettuce: { y: 2.1, light: 0.7, water: 0.7, T: 20 },
    radish: { y: 2.7, light: 0.8, water: 0.8, T: 19 }
  };
  const ROLES = ['commander', 'engineer', 'scientist', 'medic', 'agri'];

  /* ---------- Incidentes (plantillas) ---------- */
  const EV = {
    solar_storm: { sc: ['moon', 'mars'], sev: 'crit', room: 'rad', sys: 'shield', w: 0.7, dur: [14, 22], env: true },
    power_drop: { sc: ['moon'], sev: 'warn', room: 'reactor', sys: 'solar', w: 1.0, dur: [20, 34], env: true },
    dust_storm: { sc: ['mars'], sev: 'warn', room: 'reactor', sys: 'solar', w: 1.1, dur: [30, 60], env: true },
    water_fail: { sc: ['moon', 'mars'], sev: 'warn', room: 'water', sys: 'rec', w: 1.0, fix: 'wiring' },
    pressure_leak: { sc: ['moon', 'mars'], sev: 'crit', room: 'life', sys: 'press', w: 0.7, fix: 'wiring' },
    comms_blackout: { sc: ['moon', 'mars'], sev: 'info', room: 'bridge', sys: 'comms', w: 0.8, fix: 'wiring', dur: [14, 26] },
    crop_fail: { sc: ['moon', 'mars'], sev: 'warn', room: 'gh', sys: 'gh', w: 0.8, fix: 'gh' },
    thermal_fail: { sc: ['moon', 'mars'], sev: 'warn', room: 'life', sys: 'thermal', w: 0.8, fix: 'wiring' },
    wear: { sc: ['moon', 'mars'], sev: 'info', room: 'reactor', sys: 'reactor', w: 1.1, fix: 'wiring' },
    sensor_drift: { sc: ['moon', 'mars'], sev: 'info', room: 'water', sys: 'o2', w: 0.6, fix: 'o2' }
  };
  const SYS_ROOM = { isru: 'rad', reactor: 'reactor', solar: 'reactor', shield: 'rad', o2: 'water', rec: 'water', comms: 'bridge', thermal: 'life', press: 'life', gh: 'gh', lab: 'lab' };

  /* ---------- RNG (mulberry32 con estado en S.rs) ---------- */
  function rnd(S) {
    S.rs = (S.rs + 0x6D2B79F5) | 0;
    let t = Math.imul(S.rs ^ (S.rs >>> 15), 1 | S.rs);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rr = (S, a, b) => a + (b - a) * rnd(S);

  function R(max, pct, warn, crit) { return { v: max * pct, max, warn: max * warn, crit: max * crit, cons: 0, prod: 0 }; }

  /* ---------- Creación ---------- */
  function create(o) {
    o = o || {};
    const scen = o.scen === 'mars' ? 'mars' : 'moon';
    const diff = DIFFS[o.diff] ? o.diff : 'engineer';
    const df = DIFFS[diff];
    const seed = (o.seed >>> 0) || 1;
    const S = {
      v: 1, scen, diff, seed, rs: seed, t: 0, N: 5, noEv: !!o.noEv, ended: null,
      lightMin: 0.0217, // minutos-luz Luna (≈1,3 s)
      limit: df.dose,
      r: {
        o2: R(36, df.startPct, 0.35, 0.15),
        water: R(200, df.startPct, 0.35, 0.15),
        power: R(P.BATT_KWH, df.startPct * 0.9, 0.3, 0.12),
        food: R(80, df.startPct, 0.3, 0.12),
        waste: R(40, 0.25, 0.75, 0.9),
        mat: R(120, df.mat / 120, 0.12, 0.05),
        rad: { v: 50, max: 100, warn: 45, crit: 30, cons: 0, prod: 0 },
        well: { v: 78, max: 100, warn: 45, crit: 25, cons: 0, prod: 0 }
      },
      sys: {
        reactor: { h: 100, lvl: 0.8 },
        solar: { h: 100, align: 0.8, dust: 0 },
        o2: { h: 100, lvl: 0.6, auto: true, calib: 0, conc: 20.9 },
        rec: { h: 100, mode: 'eco' },
        thermal: { h: 100, T: 21 },
        press: { h: 100, P: 101.3 },
        comms: { h: 100 },
        shield: { h: 100, lvl: 1, cap: df.shelter },
        gh: { lights: 0.6, irrig: 0.6, drip: false },
        lab: { h: 100 },
        isru: { h: 100, on: true },
        rover: { h: 100, batt: 100, hint: false, runs: 0 }
      },
      emergency: false, proto: false, cap: { gh: 1, lab: 1, comms: 1 },
      beds: [], crew: [], jobs: [], inc: [], log: [], incSeq: 1,
      cm: { q: [], inbox: [], seq: 1, nextDaily: 20 },
      m: {}, samples: 0, science: 0, pts: 0, morale: 78, rest: 75,
      z: { water: 0, food: 0, power: 0, press: 0, well: 0 },
      lastEv: 0, pw: {}, lf: {}, d: {}, pendingCards: [], quiz: {},
      st: { waterUsed: 0, waterRec: 0, eGen: 0, eUsed: 0, foodProd: 0, foodCons: 0, incTot: 0, incRes: 0, quizOk: 0, quizTot: 0,
        maxDose: 0, brownH: 0, critH: 0, mistakes: {}, good: {}, harvested: 0, samplesTot: 0, crops: {} }
    };
    if (scen === 'mars') S.lightMin = Math.round(rr(S, 4, 20) * 10) / 10; // real: ~3 a ~22 min según posiciones orbitales
    for (let i = 0; i < 6; i++) S.beds.push({ crop: i < 2 ? 'lettuce' : null, prog: i < 2 ? 0.35 : 0, hp: 100 });
    for (let i = 0; i < 5; i++) S.crew.push({ role: ROLES[i], zone: 'hab', dose: 0 });
    for (let i = 1; i <= 7; i++) S.m[i] = { st: 'idle', var: 0, stars: 0, hold: 0, t0: 0, att: 0, prog: 0, data: {} };
    derive(S);
    return S;
  }

  /* ---------- Utilidades ---------- */
  function log(S, sev, k, p) {
    S.logN = (S.logN || 0) + 1;
    S.log.push({ n: S.logN, t: Math.round(S.t * 100) / 100, sev, k, p: p || {} });
    if (S.log.length > 250) S.log.splice(0, S.log.length - 250);
  }
  const pct = (r) => (r.max > 0 ? r.v / r.max : 0);
  function status(S, key) {
    if (key === 'dose') { const f = S.st.maxDose / S.limit; return f >= 0.85 ? 'crit' : f >= 0.6 ? 'warn' : 'ok'; }
    const r = S.r[key];
    return r.v <= r.crit ? 'crit' : r.v <= r.warn ? 'warn' : 'ok';
  }
  function activeInc(S) { return S.inc.filter((i) => !i.res); }
  function hasActive(S, type) { return S.inc.some((i) => !i.res && i.type === type && S.t >= i.from); }
  function shieldEff(S) { return clamp((0.25 + 0.25 * S.sys.shield.lvl) * (S.sys.shield.h / 100), 0, 1); }
  function oneWay(S) { return S.scen === 'moon' ? P.MOON_ONEWAY_H : S.lightMin * P.LIGHT_MIN_TO_H; }
  function bonus(S, role) {
    // Un especialista aporta su bonus si no está en el refugio durante una tormenta.
    const c = S.crew.find((x) => x.role === role);
    return c && c.zone !== 'shelter';
  }

  /* ---------- Incidentes ---------- */
  function addInc(S, type, o) {
    o = o || {};
    const T = EV[type];
    if (!T) return null;
    const from = S.t + (o.lead || 0);
    const inc = { id: S.incSeq++, type, sev: o.sev || T.sev, room: o.room || T.room, sys: o.sys || T.sys, t0: S.t, from,
      until: null, prog: 0, fix: T.fix || null, res: false, data: o.data || {}, mission: o.mission || 0 };
    if (T.dur || o.dur) { const d = o.dur || rr(S, T.dur[0], T.dur[1]); inc.until = from + d; }
    if (type === 'wear') {
      const sys = o.sys || ['reactor', 'solar', 'shield', 'o2'][Math.floor(rnd(S) * 4)];
      inc.sys = sys; inc.room = SYS_ROOM[sys];
      S.sys[sys].h = clamp(S.sys[sys].h - (o.dmg || rr(S, 18, 30)), 5, 100);
    }
    if (type === 'crop_fail') {
      const planted = S.beds.map((b, i) => (b.crop ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < Math.min(2, planted.length); k++) { const b = S.beds[planted[Math.floor(rnd(S) * planted.length)]]; b.hp = clamp(b.hp - 40, 1, 100); }
    }
    if (type === 'sensor_drift') S.sys.o2.calib += 2.2;
    if (type === 'solar_storm') inc.data.rate = inc.data.rate || rr(S, 2.0, 2.8); // mSv/h sin blindaje (modelo G)
    S.inc.push(inc);
    S.st.incTot++;
    log(S, inc.sev, 'ev.' + type, { id: inc.id, lead: o.lead || 0, sys: inc.sys });
    return inc;
  }
  function resolveInc(S, inc, how) {
    if (inc.res) return;
    inc.res = true; inc.tRes = S.t;
    if (inc.fix) S.st.incRes++;
    if (inc.type === 'water_fail') S.sys.rec.h = Math.max(S.sys.rec.h, 92);
    if (inc.type === 'thermal_fail') S.sys.thermal.h = Math.max(S.sys.thermal.h, 92);
    if (inc.type === 'pressure_leak') S.sys.press.h = Math.max(S.sys.press.h, 95);
    if (inc.type === 'comms_blackout') S.sys.comms.h = Math.max(S.sys.comms.h, 95);
    if (inc.type === 'wear') S.sys[inc.sys].h = Math.max(S.sys[inc.sys].h, Math.min(100, S.sys[inc.sys].h + 45));
    if (inc.type === 'sensor_drift') S.sys.o2.calib = 0;
    if (inc.type === 'crop_fail') S.beds.forEach((b) => { if (b.crop) b.hp = Math.max(b.hp, 60); });
    log(S, 'ok', 'res.' + inc.type, { id: inc.id, how: how || 'auto' });
  }
  function repair(S, id, amount) {
    const inc = S.inc.find((i) => i.id === id);
    if (!inc || inc.res || !inc.fix) return false;
    inc.prog = clamp(inc.prog + amount, 0, 100);
    if (inc.prog >= 100) resolveInc(S, inc, 'player');
    return true;
  }
  function mods(S) {
    const M = { sunMul: 1, leak: 0, spe: 0, recMul: 1, thermMul: 1, commsDown: false, blight: false };
    for (const i of S.inc) {
      if (i.res || S.t < i.from) continue;
      switch (i.type) {
        case 'solar_storm': M.spe += i.data.rate; break;
        case 'power_drop': M.sunMul *= 0.3; break;
        case 'dust_storm': M.sunMul *= 0.35; break;
        case 'water_fail': M.recMul *= 0.45; break;
        case 'pressure_leak': M.leak += 0.6; break;
        case 'comms_blackout': M.commsDown = true; break;
        case 'crop_fail': M.blight = true; break;
        case 'thermal_fail': M.thermMul *= 0.4; break;
      }
    }
    return M;
  }
  function spawn(S, h) {
    if (S.noEv || S.t < 14) return;
    const df = DIFFS[S.diff];
    if (activeInc(S).length >= df.maxInc) return;
    if (S.t - S.lastEv < 10) return;
    if (rnd(S) > 0.02 * df.ev * h) return;
    const pool = Object.keys(EV).filter((k) => EV[k].sc.includes(S.scen) && !S.inc.some((i) => !i.res && i.type === k) &&
      !(k === 'crop_fail' && !S.beds.some((b) => b.crop)));
    if (!pool.length) return;
    let tot = pool.reduce((a, k) => a + EV[k].w, 0), x = rnd(S) * tot, pick = pool[0];
    for (const k of pool) { x -= EV[k].w; if (x <= 0) { pick = k; break; } }
    S.lastEv = S.t;
    addInc(S, pick, pick === 'solar_storm' ? { lead: df.lead } : {});
  }

  /* ---------- Paso de simulación ---------- */
  function step(S, dt) {
    dt = fin(dt, 0);
    let guard = 0;
    while (dt > 1e-9 && !S.ended && guard++ < 100000) { const h = Math.min(dt, 0.25); sub(S, h); dt -= h; }
  }

  function sub(S, h) {
    const df = DIFFS[S.diff], sc = SC[S.scen], sy = S.sys, r = S.r;
    S.t += h;
    const M = mods(S);
    S.mods = M;

    /* --- Entorno solar --- */
    let sun;
    if (S.scen === 'moon') sun = sc.sunBase + sc.sunAmp * Math.sin((2 * Math.PI * S.t) / sc.sunPeriod);
    else sun = Math.max(0, Math.sin((2 * Math.PI * (S.t % sc.sol)) / sc.sol)) * sc.sunBase;
    sun *= M.sunMul;
    sy.solar.align = clamp(sy.solar.align - 0.004 * h, 0.55, 1);
    sy.solar.dust = clamp(sy.solar.dust + sc.dustRate * h + (hasActive(S, 'dust_storm') ? 0.002 * h : 0), 0, 0.6);
    const solKw = sc.solarPeak * sun * sy.solar.align * (1 - sy.solar.dust) * (sy.solar.h / 100);
    const reaKw = sy.reactor.h > 20 ? sc.reactorKw * sy.reactor.lvl * (sy.reactor.h / 100) : 0;
    sy.reactor.h = clamp(sy.reactor.h - 0.03 * sy.reactor.lvl * h, 0, 100);
    const G = solKw + reaKw;

    /* --- Oxígeno: control automático --- */
    const o2use = S.N * (P.O2_PER_PERSON_DAY / 24) * df.cons;
    const leakO2 = M.leak * 0.25;
    if (sy.o2.auto) {
      const need = (o2use + leakO2) / P.O2GEN_MAX;
      sy.o2.lvl = clamp(need * (1 + (0.5 - pct(r.o2)) * 0.8) / Math.max(0.3, sy.o2.h / 100), 0.05, 1);
    }
    sy.o2.calib = clamp(sy.o2.calib + 0.02 * h, -5, 5);

    /* --- Cargas eléctricas (prioridad 1 = esencial) --- */
    const planted = S.beds.filter((b) => b.crop).length;
    const loads = [
      { id: 'o2', p: 1, kw: P.O2GEN_KW * sy.o2.lvl },
      { id: 'rec', p: 1, kw: sy.rec.mode === 'max' ? P.REC_KW_MAX : P.REC_KW_ECO },
      { id: 'therm', p: 1, kw: sc.heat },
      { id: 'press', p: 1, kw: 0.3 + 0.5 * M.leak },
      { id: 'comms', p: 2, kw: 0.8 * S.cap.comms },
      { id: 'shield', p: 2, kw: 0.2 + 0.2 * sy.shield.lvl },
      { id: 'lab', p: 3, kw: S.jobs.some((j) => j.kind === 'analyze' || j.kind === 'experiment') ? 1.5 * S.cap.lab : 0 },
      { id: 'rover', p: 3, kw: sy.rover.batt < 100 ? 1.0 : 0 },
      { id: 'isru', p: 3, kw: sy.isru.on ? P.ISRU_KW : 0 },
      { id: 'jobs', p: 3, kw: S.jobs.reduce((a, j) => a + (j.kw || 0), 0) },
      { id: 'lights', p: 4, kw: P.LIGHT_KW_PER_BED * 6 * sy.gh.lights * S.cap.gh * (planted ? 1 : 0.2) },
      { id: 'pumps', p: 4, kw: 0.3 * sy.gh.irrig * (planted ? 1 : 0) }
    ];
    if (S.emergency) loads.forEach((l) => { if (l.p >= 3) l.kw = 0; });
    const avail = G + (r.power.v > 0.01 ? P.BATT_MAX_DIS : 0);
    let served = 0, demand = 0;
    const lf = {};
    loads.sort((a, b) => a.p - b.p);
    for (const l of loads) {
      demand += l.kw;
      const give = Math.max(0, Math.min(l.kw, avail - served));
      lf[l.id] = l.kw > 0 ? give / l.kw : 1;
      served += give;
    }
    // Si la batería se agotaría en este subpaso, limitar a lo realmente disponible.
    const net = G - served;
    if (net < 0 && r.power.v + net * h < 0) {
      const maxServe = G + r.power.v / h;
      let s2 = 0;
      for (const l of loads) { const give = Math.max(0, Math.min(l.kw, maxServe - s2)); lf[l.id] = l.kw > 0 ? give / l.kw : 1; s2 += give; }
      served = s2;
    }
    const net2 = G - served;
    r.power.v += net2 > 0 ? net2 * h * P.CHARGE_EFF : net2 * h;
    r.power.prod = G; r.power.cons = served;
    S.lf = lf;
    S.pw = { gen: G, sol: solKw, rea: reaKw, demand, served, sun };
    S.st.eGen += G * h; S.st.eUsed += served * h;
    if (lf.o2 < 0.999 || lf.rec < 0.999 || lf.therm < 0.999) S.st.brownH += h;
    if (sy.rover.batt < 100) sy.rover.batt = clamp(sy.rover.batt + 6 * h * (lf.rover || 0), 0, 100);

    /* --- Temperatura y presión --- */
    const tEff = clamp(lf.therm * (sy.thermal.h / 100) * M.thermMul, 0, 1);
    const Tt = 21 + (1 - tEff) * (sc.tOut - 21) * 0.3;
    sy.thermal.T += (Tt - sy.thermal.T) * Math.min(1, 0.12 * h);
    if (M.leak > 0) sy.press.P -= M.leak * h; else sy.press.P += 1.0 * h * lf.press;
    sy.press.P = clamp(sy.press.P, 40, 101.3);

    /* --- Agua --- */
    const W = S.N * (P.WATER_PER_PERSON_DAY / 24) * df.cons;
    const recEff = (sy.rec.mode === 'max' ? P.REC_EFF_MAX : P.REC_EFF_ECO) * lf.rec * (sy.rec.h / 100) * M.recMul;
    const waterOk = r.water.v > 0.05;
    let o2rate = P.O2GEN_MAX * sy.o2.lvl * lf.o2 * (sy.o2.h / 100) * (waterOk ? 1 : 0);
    const irrigBase = 0.08 * sy.gh.irrig * (sy.gh.drip ? 0.55 : 1) * planted * (lf.pumps || 0);
    const irrig = waterOk ? irrigBase : 0;
    const elec = P.O2_STOICH_WATER * o2rate;
    const isruL = sy.isru.on ? P.ISRU_LPH * (lf.isru || 0) * (sy.isru.h / 100) : 0;
    const recovered = W * recEff + irrig * 0.3 * recEff + isruL; // condensación del riego + hielo extraído
    r.water.cons = W + elec + irrig; r.water.prod = recovered;
    r.water.v += (recovered - W - elec - irrig) * h;
    S.st.waterUsed += (W + elec + irrig) * h; S.st.waterRec += recovered * h;

    /* --- Oxígeno --- */
    r.o2.prod = o2rate; r.o2.cons = o2use + leakO2;
    r.o2.v += (o2rate - o2use - leakO2) * h;
    let concT = 20.9 - 0.6 * sy.o2.calib;
    if (r.o2.v <= 0.05) concT -= 6 * (1 - clamp(o2rate / Math.max(0.001, o2use), 0, 1));
    sy.o2.conc += (concT - sy.o2.conc) * Math.min(1, 0.2 * h);
    sy.o2.conc = clamp(sy.o2.conc, 10, 30);

    /* --- Cultivos --- */
    const agri = bonus(S, 'agri') ? 1.15 : 1;
    const lightSup = clamp(sy.gh.lights * S.cap.gh * (lf.lights || 0), 0, 1);
    const waterSup = waterOk ? clamp(sy.gh.irrig * (lf.pumps || 0), 0, 1) : 0;
    for (let i = 0; i < S.beds.length; i++) {
      const b = S.beds[i];
      if (!b.crop) continue;
      const c = CROPS[b.crop];
      const lF = Math.min(1, lightSup / c.light), wF = Math.min(1, waterSup / c.water);
      const tF = clamp(1 - Math.abs(sy.thermal.T - c.T) / 9, 0, 1);
      if (b.prog < 1) b.prog = clamp(b.prog + (h / P.CROP_CYCLE_H) * lF * wF * tF * agri * (0.4 + 0.6 * b.hp / 100), 0, 1);
      const stress = lF < 0.3 || wF < 0.3 || tF < 0.3;
      b.hp = clamp(b.hp + (stress ? -0.8 : 0.3) * h - (M.blight ? 0.25 * h : 0) - (b.prog >= 1 ? 0.05 * h : 0), 0, 100);
      if (b.hp <= 0) { b.crop = null; b.prog = 0; b.hp = 100; log(S, 'warn', 'crop.dead', { bed: i + 1 }); S.st.mistakes.cropDead = (S.st.mistakes.cropDead || 0) + 1; }
    }

    /* --- Alimentos --- */
    const fUse = S.N * (P.FOOD_PER_PERSON_DAY / 24) * df.cons;
    r.food.cons = fUse; r.food.prod = 0;
    r.food.v -= fUse * h; S.st.foodCons += fUse * h;
    r.waste.prod = S.N * (P.WASTE_PER_PERSON_DAY / 24); r.waste.v += r.waste.prod * h; // envases y residuos sólidos

    /* --- Radiación --- */
    const eff = shieldEff(S);
    r.rad.v = eff * 100;
    const gcr = sc.gcr / 24;
    let cap = sy.shield.cap;
    const player = S.crew[0];
    if (player.zone === 'shelter') { if (cap > 0) cap--; else player.zone = 'hab'; }
    for (let i = 1; i < S.crew.length; i++) {
      const c = S.crew[i];
      if (S.proto && cap > 0) { c.zone = 'shelter'; cap--; } else c.zone = 'hab';
    }
    let maxD = 0;
    for (const c of S.crew) {
      const e = c.zone === 'shelter' ? Math.min(1, eff + 0.35) : c.zone === 'outside' ? 0.05 : eff;
      c.rate = gcr * (1 - 0.3 * e) + M.spe * (1 - 0.9 * e);
      c.dose += c.rate * h;
      maxD = Math.max(maxD, c.dose);
    }
    S.st.maxDose = maxD;

    /* --- Bienestar --- */
    const ai = activeInc(S).filter((i) => S.t >= i.from);
    const nCrit = ai.filter((i) => i.sev === 'crit').length, nWarn = ai.filter((i) => i.sev === 'warn').length;
    const T = sy.thermal.T, conc = sy.o2.conc;
    const q = [clamp(1 - Math.abs(T - 21) / 10, 0, 1), clamp((sy.press.P - 80) / 21, 0, 1),
      conc >= P.O2_BAND[0] && conc <= P.O2_BAND[1] ? 1 : clamp(1 - Math.abs(conc - 21) / 6, 0, 1),
      clamp(pct(r.food) / 0.25, 0, 1), clamp(pct(r.water) / 0.2, 0, 1), lf.therm];
    const hq = q.reduce((a, b) => a + b, 0) / q.length;
    const medic = bonus(S, 'medic') ? 6 : 0;
    const mT = 30 + 58 * hq - nCrit * 6 - nWarn * 2 + medic;
    S.morale = clamp(S.morale + (mT - S.morale) * Math.min(1, 0.04 * h), 0, 100);
    S.rest = clamp(S.rest + (28 + 66 * hq - S.rest) * Math.min(1, 0.05 * h), 0, 100);
    r.well.v = 0.6 * S.morale + 0.4 * S.rest;
    S.hq = hq;

    /* --- Trabajos (construcción, análisis) --- */
    const eng = bonus(S, 'engineer') ? 1.3 : 1, sci = bonus(S, 'scientist') ? 1.5 : 1;
    for (const j of S.jobs) {
      const pf = (j.kind === 'analyze' || j.kind === 'experiment') ? (lf.lab || 0) * sci : (lf.jobs || 0) * eng * df.repair;
      j.h -= h * pf;
    }
    const done = S.jobs.filter((j) => j.h <= 0);
    S.jobs = S.jobs.filter((j) => j.h > 0);
    for (const j of done) finishJob(S, j);

    /* --- Ingeniero: reparación autónoma lenta --- */
    if (bonus(S, 'engineer')) {
      const tgt = activeInc(S).filter((i) => i.fix && S.t >= i.from).sort((a, b) => (a.sev === 'crit' ? -1 : 1) - (b.sev === 'crit' ? -1 : 1))[0];
      if (tgt) { tgt.prog = clamp(tgt.prog + 1.6 * h * df.repair, 0, 100); tgt.bot = true; if (tgt.prog >= 100) resolveInc(S, tgt, 'engineer'); }
    }

    /* --- Ciclo de incidentes --- */
    for (const i of S.inc) {
      if (i.res) continue;
      if (i.until != null && S.t >= i.until) { resolveInc(S, i, 'expired'); continue; }
      if (i.fix && !i.esc && S.t - i.t0 > 36 * df.grace) { i.esc = true; if (i.sev !== 'crit') { i.sev = i.sev === 'info' ? 'warn' : 'crit'; log(S, i.sev, 'esc', { id: i.id, type: i.type }); } }
    }
    if (nCrit) S.st.critH += h;
    spawn(S, h);

    /* --- Comunicaciones --- */
    commsStep(S, M);

    /* --- Misiones --- */
    missionsStep(S, h);

    normalize(S);
    endings(S, h, M);
    derive(S);
  }

  function normalize(S) {
    for (const k in S.r) { const x = S.r[k]; x.v = clamp(fin(x.v, 0), 0, x.max); }
    const s = S.sys;
    for (const k in s) if (s[k].h != null) s[k].h = clamp(fin(s[k].h, 0), 0, 100);
    s.o2.lvl = clamp(fin(s.o2.lvl, 0.5), 0, 1); s.reactor.lvl = clamp(fin(s.reactor.lvl, 0.8), 0, 1);
    s.gh.lights = clamp(fin(s.gh.lights, 0.5), 0, 1); s.gh.irrig = clamp(fin(s.gh.irrig, 0.5), 0, 1);
    s.thermal.T = clamp(fin(s.thermal.T, 21), -60, 40); s.shield.lvl = clamp(Math.round(s.shield.lvl), 0, 3);
    s.shield.cap = clamp(Math.round(s.shield.cap), 0, 5);
    S.morale = clamp(fin(S.morale, 50), 0, 100); S.rest = clamp(fin(S.rest, 50), 0, 100);
    S.samples = Math.max(0, Math.round(S.samples));
  }

  /* ---------- Finales (no violentos) ---------- */
  function endings(S, h, M) {
    if (S.ended) return;
    const r = S.r;
    const end = (kind, reason) => { S.ended = { kind, reason, t: S.t }; log(S, kind === 'victory' ? 'ok' : 'crit', 'end.' + reason, {}); };
    if (r.o2.v <= 0 && S.sys.o2.conc < 17) return end('abort', 'o2');
    S.z.water = r.water.v <= 0.01 ? S.z.water + h : 0; if (S.z.water >= 12) return end('abort', 'water');
    S.z.food = r.food.v <= 0.01 ? S.z.food + h : 0; if (S.z.food >= 72) return end('abort', 'food');
    S.z.power = r.power.v <= 0.01 && (S.lf.o2 < 0.3 || S.lf.therm < 0.3) ? S.z.power + h : 0; if (S.z.power >= 24) return end('abort', 'power');
    S.z.press = S.sys.press.P < 60 ? S.z.press + h : 0; if (S.z.press >= 6) return end('abort', 'press');
    S.z.well = r.well.v < 10 ? S.z.well + h : 0; if (S.z.well >= 24) return end('abort', 'well');
    if (S.st.maxDose >= S.limit) return end('abort', 'dose');
    if (S.inc.some((i) => !i.res && i.fix && i.sev === 'crit' && S.t - i.t0 > 72)) return end('abort', 'inc');
    let all = true; for (let i = 1; i <= 7; i++) if (S.m[i].st !== 'done') all = false;
    if (all && !activeInc(S).some((i) => i.sev === 'crit' && S.t >= i.from)) end('victory', 'all');
  }

  function derive(S) {
    const d = S.d;
    d.o2 = pct(S.r.o2); d.water = pct(S.r.water); d.power = pct(S.r.power); d.food = pct(S.r.food); d.well = S.r.well.v / 100;
    d.rad = S.r.rad.v / 100; d.dose = S.st.maxDose; d.doseF = S.st.maxDose / S.limit;
    d.rec = (S.sys.rec.mode === 'max' ? P.REC_EFF_MAX : P.REC_EFF_ECO) * (S.lf.rec == null ? 1 : S.lf.rec) * (S.sys.rec.h / 100) * ((S.mods && S.mods.recMul) || 1);
    d.net = (S.pw.gen || 0) - (S.pw.demand || 0);
    d.day = Math.floor(S.t / 24) + 1; d.hour = S.t % 24;
  }

  /* ---------- Trabajos ---------- */
  function finishJob(S, j) {
    const sy = S.sys;
    if (j.kind === 'shield') { sy.shield.lvl = Math.min(3, sy.shield.lvl + 1); sy.shield.h = Math.max(sy.shield.h, 90); log(S, 'ok', 'job.shield', { lvl: sy.shield.lvl }); }
    if (j.kind === 'shelter') { sy.shield.cap = Math.min(5, sy.shield.cap + 1); log(S, 'ok', 'job.shelter', { cap: sy.shield.cap }); }
    if (j.kind === 'analyze') { S.science += 12; S.pts += 15; log(S, 'ok', 'job.analyze', {}); }
    if (j.kind === 'experiment') { S.science += 8; S.morale += 4; log(S, 'ok', 'job.experiment', {}); }
    if (j.kind === 'recycle') { S.r.mat.v += 5; S.st.good.recycle = (S.st.good.recycle || 0) + 1; log(S, 'ok', 'job.recycle', {}); }
    if (j.kind === 'maint') { sy[j.sys].h = Math.min(100, sy[j.sys].h + 35); log(S, 'ok', 'job.maint', { sys: j.sys }); }
  }

  /* ---------- Decisiones con panel de consecuencias ---------- */
  const DEC = {
    lights: (S, p) => { S.sys.gh.lights = clamp(+p.v, 0, 1); },
    irrig: (S, p) => { S.sys.gh.irrig = clamp(+p.v, 0, 1); },
    reactor: (S, p) => { S.sys.reactor.lvl = clamp(+p.v, 0, 1); },
    o2lvl: (S, p) => { S.sys.o2.auto = !!p.auto; if (!p.auto) S.sys.o2.lvl = clamp(+p.v, 0, 1); },
    isru: (S, p) => { S.sys.isru.on = !!p.v; },
    recmode: (S, p) => { S.sys.rec.mode = p.v === 'max' ? 'max' : 'eco'; },
    emergency: (S, p) => { S.emergency = !!p.v; },
    proto: (S, p) => { S.proto = !!p.v; },
    shield: (S) => {
      if (S.sys.shield.lvl >= 3 || S.jobs.some((j) => j.kind === 'shield')) return 'busy';
      if (S.r.mat.v < 14) return 'nomat';
      S.r.mat.v -= 14; S.jobs.push({ kind: 'shield', h: 6, kw: 0.8 });
    },
    shelter: (S) => {
      if (S.sys.shield.cap >= 5 || S.jobs.some((j) => j.kind === 'shelter')) return 'busy';
      if (S.r.mat.v < 8) return 'nomat';
      S.r.mat.v -= 8; S.jobs.push({ kind: 'shelter', h: 4, kw: 0.5 });
    },
    maint: (S, p) => {
      if (S.jobs.some((j) => j.kind === 'maint')) return 'busy';
      if (S.r.mat.v < 4) return 'nomat';
      S.r.mat.v -= 4; S.jobs.push({ kind: 'maint', h: 3, kw: 0.6, sys: p.sys || 'reactor' });
    },
    recycle: (S) => {
      if (S.jobs.some((j) => j.kind === 'recycle')) return 'busy';
      if (S.r.waste.v < 6) return 'nowaste';
      S.r.waste.v -= 6; S.jobs.push({ kind: 'recycle', h: 3, kw: 0.8 });
    },
    analyze: (S) => {
      if (S.samples < 1) return 'nosample';
      if (S.jobs.some((j) => j.kind === 'analyze')) return 'busy';
      S.samples--; S.jobs.push({ kind: 'analyze', h: 3, kw: 0 });
    },
    experiment: (S) => {
      if (S.jobs.some((j) => j.kind === 'experiment')) return 'busy';
      if (S.r.water.v < 3) return 'nowater';
      S.r.water.v -= 2; S.jobs.push({ kind: 'experiment', h: 5, kw: 0 });
    },
    plant: (S, p) => {
      const b = S.beds[p.bed]; if (!b || b.crop || !CROPS[p.crop]) return 'busy';
      if (S.r.water.v < 2) return 'nowater';
      S.r.water.v -= 1.5; b.crop = p.crop; b.prog = 0; b.hp = 100;
    },
    eva: (S) => {
      if (S.r.o2.v < 0.5) return 'err';
      S.r.o2.v -= 0.2; S.samples++; S.st.samplesTot++; S.r.mat.v += 1; S.pts += 5;
    },
    sleep: (S) => { S.rest = clamp(S.rest + 30, 0, 100); S.morale = clamp(S.morale + 4, 0, 100); step(S, 4); },
    rec: (S) => { S.morale = clamp(S.morale + 9, 0, 100); step(S, 2); },
    wait: (S, p) => { step(S, clamp(+p.h || 1, 0.5, 24)); }
  };
  function decide(S, id, p) {
    const f = DEC[id]; if (!f) return { ok: false, err: 'unknown' };
    const err = f(S, p || {});
    if (err) return { ok: false, err };
    normalize(S); derive(S);
    S.st.good['dec_' + id] = (S.st.good['dec_' + id] || 0) + 1;
    return { ok: true };
  }
  function snapshot(S) {
    return { o2: S.r.o2.v, water: S.r.water.v, power: S.r.power.v, food: S.r.food.v, mat: S.r.mat.v, dose: S.st.maxDose, well: S.r.well.v, rad: S.r.rad.v,
      shelter: S.sys.shield.cap, net: (S.pw.gen || 0) - (S.pw.demand || 0) };
  }
  /** Proyección determinista a 12 h (sin eventos aleatorios) con y sin la decisión. */
  function preview(S, id, p, hours) {
    hours = hours || 12;
    const base = JSON.parse(JSON.stringify(S)); base.noEv = true; base.ended = null; base.log = [];
    const alt = JSON.parse(JSON.stringify(base));
    const now = snapshot(S);
    if (id === 'sleep' || id === 'rec' || id === 'wait') {
      const res = decide(alt, id, p);
      const dur = id === 'sleep' ? 4 : id === 'rec' ? 2 : clamp(+p.h || 1, 0.5, 24);
      step(base, dur);
      return { ok: res.ok, err: res.err, now, a: snapshot(base), b: snapshot(alt), hours: dur };
    }
    const res = decide(alt, id, p);
    step(base, hours); step(alt, hours);
    return { ok: res.ok, err: res.err, now, a: snapshot(base), b: snapshot(alt), hours };
  }

  function harvest(S, i) {
    const b = S.beds[i]; if (!b || !b.crop || b.prog < 1) return 0;
    const y = CROPS[b.crop].y * (b.hp / 100);
    S.r.food.v += y; S.st.foodProd += y; S.st.harvested += y; S.st.crops[b.crop] = (S.st.crops[b.crop] || 0) + 1;
    const m6 = S.m[6]; if (m6.st === 'active') { m6.data.kg = (m6.data.kg || 0) + y; (m6.data.types = m6.data.types || {})[b.crop] = 1; }
    b.crop = null; b.prog = 0; b.hp = 100;
    normalize(S); derive(S);
    log(S, 'ok', 'crop.harvest', { kg: Math.round(y * 100) / 100 });
    return y;
  }

  /* ---------- Minijuegos -> sistemas ---------- */
  function mini(S, kind, res) {
    const ok = !!res.ok, sc = clamp(fin(res.score, 0), 0, 1);
    const sy = S.sys;
    if (ok) S.pts += Math.round(20 + 30 * sc);
    S.st[ok ? 'good' : 'mistakes']['mg_' + kind] = (S.st[ok ? 'good' : 'mistakes']['mg_' + kind] || 0) + 1;
    switch (kind) {
      case 'wiring':
        if (res.inc) repair(S, res.inc, ok ? 70 + 30 * sc : 25);
        else if (res.sys && sy[res.sys]) sy[res.sys].h = Math.min(100, sy[res.sys].h + (ok ? 25 * (0.5 + sc / 2) : 5));
        break;
      case 'balance':
        if (ok) { S.cap.gh = clamp(fin(res.gh, 1), 0.2, 1); S.cap.lab = clamp(fin(res.lab, 1), 0, 1); S.cap.comms = clamp(fin(res.comms, 1), 0.5, 1); }
        break;
      case 'o2':
        if (ok) { sy.o2.calib = 0; sy.o2.h = Math.min(100, sy.o2.h + 12); const d = S.inc.find((i) => !i.res && i.type === 'sensor_drift'); if (d) resolveInc(S, d, 'player'); }
        else sy.o2.calib *= 0.6;
        break;
      case 'solar':
        sy.solar.align = clamp(ok ? 0.85 + 0.15 * sc : Math.max(sy.solar.align, 0.7), 0, 1);
        if (ok) sy.solar.dust *= 0.3;
        break;
      case 'gh':
        S.beds.forEach((b) => { if (b.crop) b.hp = Math.min(100, b.hp + (ok ? 25 * sc + 5 : 3)); });
        if (ok) { sy.gh.drip = true; if (res.inc) repair(S, res.inc, 100); }
        break;
      case 'rover': {
        const n = Math.max(0, Math.round(fin(res.samples, 0)));
        S.samples += n; S.st.samplesTot += n; S.r.mat.v += fin(res.regolith, 0);
        sy.rover.h = clamp(sy.rover.h - fin(res.damage, 0), 10, 100); sy.rover.batt = clamp(fin(res.batt, 50), 0, 100); sy.rover.runs++;
        const m7 = S.m[7];
        if (m7.st === 'active' && ok && n >= m7.data.target) finishMission(S, 7, res.score > 0.75 ? 3 : 2);
        sy.rover.hint = false;
        break;
      }
    }
    normalize(S); derive(S);
  }

  /* ---------- Comunicaciones con retraso ---------- */
  function send(S, kind) {
    const ow = oneWay(S);
    const msg = { id: S.cm.seq++, kind, sent: S.t, arriveEarth: S.t + ow, reply: null, st: 'transit', snap: snapshot(S), stormSoon: S.inc.some((i) => i.type === 'solar_storm' && !i.res) };
    S.cm.q.push(msg);
    log(S, 'info', 'cm.sent', { kind, ow: Math.round(ow * 10) / 10 });
    return msg;
  }
  function commsStep(S, M) {
    const ow = oneWay(S);
    for (const m of S.cm.q) {
      if (M.commsDown && m.st !== 'done') { m.arriveEarth = Math.max(m.arriveEarth, S.t + 0.25); if (m.reply != null) m.reply = Math.max(m.reply, S.t + 0.25); continue; }
      if (m.st === 'transit' && S.t >= m.arriveEarth) { m.st = 'earth'; m.reply = S.t + 0.5 + ow; }
      else if (m.st === 'earth' && S.t >= m.reply) {
        m.st = 'done';
        S.cm.inbox.push({ id: m.id, kind: m.kind, t: S.t, sent: m.sent, snap: m.snap, stormSoon: m.stormSoon, read: false });
        if (m.kind === 'route') S.sys.rover.hint = true;
        if (S.m[7].st === 'active') S.m[7].data.comm = true;
        log(S, 'info', 'cm.recv', { kind: m.kind, rt: Math.round((S.t - m.sent) * 10) / 10 });
      }
    }
    S.cm.q = S.cm.q.filter((m) => m.st !== 'done');
    if (S.t >= S.cm.nextDaily && !M.commsDown) {
      S.cm.nextDaily += 24;
      S.cm.inbox.push({ id: S.cm.seq++, kind: 'daily', t: S.t, sent: S.t - ow, snap: snapshot(S), read: false, n: Math.floor(S.t / 24) });
    }
    if (S.cm.inbox.length > 40) S.cm.inbox.splice(0, S.cm.inbox.length - 40);
  }

  /* ---------- Misiones ---------- */
  const LIMIT = { 1: 72, 2: 72, 3: 999, 4: 999, 5: 120, 6: 336, 7: 999 };
  function startMission(S, id) {
    if (S.ended) return { ok: false, err: 'ended' };
    // La misión 6 (cultivo, 7 días) puede correr en paralelo con otra misión.
    if (id !== 6) for (let i = 1; i <= 7; i++) if (i !== 6 && S.m[i].st === 'active') return { ok: false, err: 'busy', id: i };
    if (S.m[id].st === 'active' || S.m[id].st === 'done') return { ok: false, err: 'state' };
    const m = S.m[id], df = DIFFS[S.diff];
    m.st = 'active'; m.att++; m.t0 = S.t; m.hold = 0; m.prog = 0; m.var = Math.floor(rnd(S) * 2); m.data = {};
    const r = S.r;
    switch (id) {
      case 1:
        r.o2.v = Math.min(r.o2.v, r.o2.max * 0.55); r.water.v = Math.min(r.water.v, r.water.max * 0.5);
        if (!hasActive(S, 'water_fail')) addInc(S, 'water_fail', { mission: 1 });
        break;
      case 2:
        r.power.v = Math.min(r.power.v, r.power.max * 0.45);
        addInc(S, S.scen === 'moon' ? 'power_drop' : 'dust_storm', { mission: 2, dur: 36 });
        addInc(S, 'wear', { sys: 'reactor', dmg: Math.max(0, S.sys.reactor.h - 35), mission: 2 });
        break;
      case 3: {
        const ev = Math.floor(rnd(S) * 3);
        m.data.ev = ev;
        const inc = addInc(S, 'solar_storm', { lead: df.lead, dur: 18, mission: 3, data: { rate: [2.2, 2.6, 2.4][ev], donki: ev } });
        m.data.inc = inc.id; m.data.d0 = S.crew.reduce((a, c) => a + c.dose, 0) / S.N;
        break;
      }
      case 5:
        S.sys.shield.lvl = Math.min(S.sys.shield.lvl, 1); S.sys.shield.h = Math.min(S.sys.shield.h, 70);
        S.sys.shield.cap = Math.min(S.sys.shield.cap, 2); r.mat.v = Math.max(r.mat.v, 30);
        break;
      case 6:
        m.data.target = m.var ? 7 : 5; m.data.kg = 0; m.data.types = {};
        break;
      case 7:
        m.data.target = df.samples; m.data.comm = false;
        addInc(S, 'comms_blackout', { mission: 7, dur: 14, sev: 'warn' });
        break;
    }
    log(S, 'info', 'm.start', { id });
    return { ok: true };
  }
  function finishMission(S, id, stars) {
    const m = S.m[id];
    if (m.st !== 'active') return;
    m.st = 'done'; m.stars = Math.max(m.stars || 0, clamp(stars, 1, 3)); m.tDone = S.t;
    S.pts += 100 * m.stars; S.r.mat.v += 6; S.morale = clamp(S.morale + 6, 0, 100);
    S.pendingCards.push(id);
    log(S, 'ok', 'm.done', { id, stars: m.stars });
    normalize(S);
  }
  function failMission(S, id, why) {
    const m = S.m[id]; if (m.st !== 'active') return;
    m.st = 'failed'; S.st.mistakes['m' + id] = (S.st.mistakes['m' + id] || 0) + 1;
    log(S, 'warn', 'm.fail', { id, why });
  }
  function abortMission(S, id) { failMission(S, id, 'quit'); }
  function missionsStep(S, h) {
    const df = DIFFS[S.diff];
    for (let id = 1; id <= 7; id++) {
      const m = S.m[id]; if (m.st !== 'active') continue;
      const el = S.t - m.t0;
      const quick = el < LIMIT[id] * 0.6 && !activeInc(S).some((i) => i.sev === 'crit' && S.t >= i.from);
      if (id === 1) {
        const ok = m.var ? (S.d.rec >= 0.85 && S.sys.o2.conc >= 19.5 && S.sys.o2.conc <= 23.5 && S.d.water >= 0.3) : (S.d.o2 >= 0.45 && S.d.water >= 0.4 && S.d.rec >= 0.78);
        m.hold = ok ? m.hold + h : 0; m.prog = clamp(m.hold / 24, 0, 1);
        if (m.hold >= 24) finishMission(S, 1, quick ? 3 : 2);
      } else if (id === 2) {
        const ok = S.d.power >= 0.25 && S.lf.o2 >= 0.999 && S.lf.rec >= 0.999 && S.lf.therm >= 0.999 && S.lf.comms >= 0.999;
        m.hold = ok && el > 1 ? m.hold + h : 0; m.prog = clamp(m.hold / 12, 0, 1);
        if (m.hold >= 12 && S.sys.reactor.h > 40) finishMission(S, 2, quick ? 3 : 2);
      } else if (id === 3) {
        const inc = S.inc.find((i) => i.id === m.data.inc);
        if (inc && !inc.res && S.t >= inc.from && m.data.at == null) m.data.at = S.proto ? 1 : 0; // ¿protocolo activo al llegar?
        const used = S.crew.reduce((a, c) => a + c.dose, 0) / S.N - m.data.d0; // dosis media añadida
        m.data.used = used; m.prog = inc ? clamp((S.t - inc.t0) / ((inc.until || S.t) - inc.t0), 0, 1) : 1;
        if (!inc || inc.res) {
          if (used <= df.budget) finishMission(S, 3, (m.data.at ? 2 : 1) + (used <= df.budget * 0.6 ? 1 : 0));
          else failMission(S, 3, 'dose');
        }
      } else if (id === 5) {
        const ok = m.var ? (S.sys.shield.lvl >= 3 && S.sys.shield.cap >= 3) : (S.sys.shield.lvl >= 2 && S.sys.shield.cap >= 4);
        const ok2 = ok && S.d.power >= 0.2;
        m.hold = ok2 ? m.hold + h : 0;
        m.prog = clamp(clamp((S.sys.shield.lvl - 1) / (m.var ? 2 : 1), 0, 1) * 0.5 + clamp((S.sys.shield.cap - 2) / (m.var ? 1 : 2), 0, 1) * 0.5, 0, 1) * (ok2 ? 1 : 0.95);
        if (m.hold >= 2) finishMission(S, 5, quick ? 3 : 2);
      } else if (id === 6) {
        const kg = m.data.kg || 0, types = Object.keys(m.data.types || {}).length;
        m.prog = clamp(kg / m.data.target, 0, 1) * (m.var && types < 2 ? 0.9 : 1);
        if (kg >= m.data.target && (!m.var || types >= 2)) finishMission(S, 6, quick ? 3 : 2);
      } else if (id === 7) {
        m.prog = clamp((S.sys.rover.runs > 0 ? 0.3 : 0) + (m.data.comm ? 0.2 : 0), 0, 0.5);
      }
      if (m.st === 'active' && el > LIMIT[id]) failMission(S, id, 'time');
    }
  }
  function reportSite(S, siteId, score) {
    const m = S.m[4]; if (m.st !== 'active') return;
    m.data.site = siteId; m.data.score = score;
    finishMission(S, 4, score >= 0.95 ? 3 : score >= 0.75 ? 2 : 1);
  }
  function reportQuiz(S, mid, ok) {
    if (S.quiz[mid] != null) return;
    S.quiz[mid] = ok ? 1 : 0; S.st.quizTot++; if (ok) { S.st.quizOk++; S.pts += 30; }
  }
  function finishRun(S) { if (!S.ended) { S.ended = { kind: 'partial', reason: 'player', t: S.t }; log(S, 'info', 'end.player', {}); } }
  function setPlayerZone(S, z) { S.crew[0].zone = z; }

  function report(S) {
    const done = [1, 2, 3, 4, 5, 6, 7].filter((i) => S.m[i].st === 'done');
    return {
      hours: S.t, days: S.t / 24, done, stars: done.reduce((a, i) => a + S.m[i].stars, 0),
      incTot: S.st.incTot, incRes: S.st.incRes, waterUsed: S.st.waterUsed, waterRec: S.st.waterRec,
      eGen: S.st.eGen, eUsed: S.st.eUsed, foodProd: S.st.foodProd, foodCons: S.st.foodCons,
      dose: S.st.maxDose, limit: S.limit, shield: S.sys.shield.lvl, cap: S.sys.shield.cap, well: S.r.well.v, morale: S.morale,
      brownH: S.st.brownH, critH: S.st.critH, quizOk: S.st.quizOk, quizTot: S.st.quizTot, mistakes: S.st.mistakes, good: S.st.good,
      pts: S.pts, ended: S.ended, science: S.science, samples: S.st.samplesTot,
      sysOk: ['reactor', 'solar', 'o2', 'rec', 'thermal', 'press', 'comms', 'shield'].filter((k) => S.sys[k].h >= 50).length
    };
  }

  return { P, SC, DIFFS, CROPS, EV, ROLES, LIMIT, create, step, decide, preview, harvest, mini, repair, send, oneWay, startMission, abortMission,
    finishMission, reportSite, reportQuiz, finishRun, setPlayerZone, report, status, pct, shieldEff, addInc, activeInc, clamp };
})();
if (typeof module !== 'undefined') module.exports = Sim;
/*SIM-END*/
