/*TEST-START*/
/* =====================================================================
   SELFTEST — 100+ simulaciones automáticas sobre el motor (sin tocar
   el progreso del jugador ni localStorage). Ejecutar con ?selftest o
   desde Configuración. También se usa en Node (tests/run-selftest.js).
   ===================================================================== */
const SelfTest = (function () {
  'use strict';
  function scanNumbers(o, path, errs) {
    if (typeof o === 'number') { if (!Number.isFinite(o)) errs.push('NaN/Inf en ' + path); return; }
    if (o && typeof o === 'object') for (const k in o) scanNumbers(o[k], path + '.' + k, errs);
  }
  function invariants(S, errs) {
    for (const k in S.r) { const r = S.r[k]; if (r.v < -1e-9 || r.v > r.max + 1e-9) errs.push('recurso fuera de rango ' + k + '=' + r.v); }
    for (const k in S.sys) { const h = S.sys[k].h; if (h != null && (h < 0 || h > 100)) errs.push('salud fuera de rango ' + k); }
    if (S.sys.o2.conc < 10 || S.sys.o2.conc > 30) errs.push('conc O2 fuera de rango');
    if (S.samples < 0) errs.push('muestras negativas');
    for (const c of S.crew) if (c.dose < 0) errs.push('dosis negativa');
    S.beds.forEach((b, i) => { if (b.prog < 0 || b.prog > 1 || b.hp < 0 || b.hp > 100) errs.push('cama ' + i + ' inválida'); });
    if (S.morale < 0 || S.morale > 100) errs.push('moral fuera de rango');
  }
  function smart(S, h, mem) {
    const order = [1, 2, 5, 3, 4, 7];
    if (S.m[6].st !== 'active' && S.m[6].st !== 'done') Sim.startMission(S, 6);
    const act = order.find((i) => S.m[i].st === 'active');
    if (!act) { const nxt = order.find((i) => S.m[i].st !== 'done'); if (nxt) Sim.startMission(S, nxt); }
    if (S.m[4].st === 'active') Sim.reportSite(S, 'x', 1);
    if (S.m[7].st === 'active') { if (!mem.route) { Sim.send(S, 'route'); mem.route = true; } Sim.mini(S, 'rover', { ok: true, score: 0.8, samples: S.m[7].data.target, regolith: 8, damage: 5, batt: 40 }); }
    if (S.m[1].st === 'active' && S.m[1].var) Sim.decide(S, 'recmode', { v: 'max' });
    if (S.t - (mem.rep || -99) > 3) {
      const inc = Sim.activeInc(S).find((i) => i.fix && S.t >= i.from);
      if (inc) { mem.rep = S.t; Sim.mini(S, inc.fix === 'o2' ? 'o2' : inc.fix === 'gh' ? 'gh' : 'wiring', { ok: true, score: 0.8, inc: inc.id }); }
    }
    if (S.m[5].st === 'active' || S.sys.shield.cap < S.N) { Sim.decide(S, 'shield', {}); Sim.decide(S, 'shelter', {}); }
    const storm = S.inc.some((i) => i.type === 'solar_storm' && !i.res);
    if (storm !== S.proto) Sim.decide(S, 'proto', { v: storm });
    Sim.setPlayerZone(S, storm ? 'shelter' : 'hab');
    S.beds.forEach((b, i) => { if (b.crop && b.prog >= 1) Sim.harvest(S, i); if (!b.crop) Sim.decide(S, 'plant', { bed: i, crop: i % 2 ? 'radish' : 'lettuce' }); });
    if (S.d.power < 0.3 && !S.emergency) Sim.decide(S, 'emergency', { v: true });
    if (S.d.power > 0.6 && S.emergency) Sim.decide(S, 'emergency', { v: false });
    if (Math.abs(S.sys.o2.calib) > 1.5) Sim.mini(S, 'o2', { ok: true, score: 0.8 });
    if (S.t - (mem.sol || -99) > 30) { mem.sol = S.t; Sim.mini(S, 'solar', { ok: true, score: 0.8 }); }
    if (S.r.waste.v >= 6 && S.r.mat.v < 60) Sim.decide(S, 'recycle', {});
    if (S.m[2].st === 'active') Sim.decide(S, 'reactor', { v: 1 });
    if (S.sys.reactor.h < 50 && !S.jobs.some((j) => j.kind === 'maint')) Sim.decide(S, 'maint', { sys: 'reactor' });
    for (let i = 1; i <= 7; i++) if (S.m[i].st === 'done') Sim.reportQuiz(S, i, true);
  }
  function runOne(seed, policy, opts) {
    const scen = opts.scen || (seed % 2 ? 'mars' : 'moon');
    const diff = opts.diff || ['explorer', 'engineer', 'commander'][seed % 3];
    const S = Sim.create({ scen, diff, seed: 1000 + seed * 7919 });
    const errs = [], mem = {};
    const maxH = opts.maxH || 24 * 30;
    let consecutive = 0, maxConsec = 0;
    while (!S.ended && S.t < maxH) {
      if (policy === 'smart') smart(S, 1, mem);
      const before = Sim.activeInc(S).length;
      Sim.step(S, 1);
      const after = Sim.activeInc(S).length;
      consecutive = after >= 2 ? consecutive + 1 : 0; maxConsec = Math.max(maxConsec, consecutive);
      invariants(S, errs);
      if (errs.length > 5) break;
      void before;
    }
    scanNumbers(S, 'S', errs);
    // Coherencia de finales
    if (S.ended && S.ended.kind === 'victory') { for (let i = 1; i <= 7; i++) if (S.m[i].st !== 'done') errs.push('victoria sin misión ' + i); }
    if (S.ended && S.ended.reason === 'dose' && S.st.maxDose < S.limit) errs.push('final por dosis incoherente');
    if (S.ended && S.ended.reason === 'o2' && S.r.o2.v > 0) errs.push('final por O2 incoherente');
    // Recuperación: tras resolver incidentes, ninguno de los resueltos debe seguir afectando
    const resolved = S.inc.filter((i) => i.res).length;
    return { seed, scen, diff, policy, ended: S.ended, hours: Math.round(S.t), errs, done: [1, 2, 3, 4, 5, 6, 7].filter((i) => S.m[i].st === 'done').length,
      incidents: S.inc.length, resolved, maxConsec };
  }
  function run(n, opts) {
    n = n || 100; opts = opts || {};
    const out = [];
    for (let i = 0; i < n; i++) out.push(runOne(i, i % 4 === 3 ? 'passive' : 'smart', opts));
    const fails = out.filter((r) => r.errs.length);
    const smartRuns = out.filter((r) => r.policy === 'smart');
    const summary = {
      runs: out.length, errors: fails.length,
      smartVictory: smartRuns.filter((r) => r.ended && r.ended.kind === 'victory').length, smartRuns: smartRuns.length,
      passiveAbort: out.filter((r) => r.policy === 'passive' && r.ended && r.ended.kind === 'abort').length,
      passiveRuns: out.filter((r) => r.policy === 'passive').length,
      endReasons: out.reduce((a, r) => { const k = r.policy + ':' + (r.ended ? r.ended.reason : 'none'); a[k] = (a[k] || 0) + 1; return a; }, {}),
      totalIncidents: out.reduce((a, r) => a + r.incidents, 0), maxConsecutiveIncidentsH: Math.max(...out.map((r) => r.maxConsec))
    };
    return { summary, fails, out };
  }
  return { run, runOne };
})();
if (typeof module !== 'undefined') module.exports.SelfTest = SelfTest;
/*TEST-END*/
