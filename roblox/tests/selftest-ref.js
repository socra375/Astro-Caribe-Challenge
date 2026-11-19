// Referencia para la fase 1 del port a Roblox: ejecuta las mismas partidas que
// tests/run-selftest.js (Sim y SelfTest sacados de index.html) y escribe, partida a
// partida, el resultado de SelfTest.runOne más una huella del estado final.
// Uso: node roblox/tests/selftest-ref.js [n] [salida.json]
const fs = require('fs'), path = require('path'), vm = require('vm');
const { fingerprint } = require('./fingerprint');
const html = fs.readFileSync(path.resolve(__dirname, '..', '..', 'index.html'), 'utf8');
const cut = (a, b) => html.slice(html.indexOf(a), html.indexOf(b) + b.length);
const code = cut('/*SIM-START*/', '/*SIM-END*/') + '\n' + cut('/*TEST-START*/', '/*TEST-END*/') + '\nthis.Sim = Sim; this.SelfTest = SelfTest;';
const ctx = { module: undefined }; vm.createContext(ctx); vm.runInContext(code, ctx);
const n = +(process.argv[2] || 100);
const outFile = process.argv[3] || path.resolve(__dirname, 'ref.json');

// Se captura el estado de cada partida envolviendo Sim.create (SelfTest lo llama por la tabla).
const create = ctx.Sim.create; let last = null;
ctx.Sim.create = (o) => (last = create(o));
const games = [];
for (let i = 0; i < n; i++) {
  const r = ctx.SelfTest.runOne(i, i % 4 === 3 ? 'passive' : 'smart', {});
  games.push({ seed: r.seed, scen: r.scen, diff: r.diff, mode: r.mode, policy: r.policy,
    ended: r.ended ? { kind: r.ended.kind, reason: r.ended.reason, t: r.ended.t } : null,
    hours: r.hours, errs: r.errs, done: r.done, incidents: r.incidents, resolved: r.resolved, maxConsec: r.maxConsec,
    fp: fingerprint(last) });
}
ctx.Sim.create = create;
const summary = ctx.SelfTest.run(n).summary;
fs.writeFileSync(outFile, JSON.stringify({ summary, games }, null, 1));
console.log('referencia: ' + games.length + ' partidas -> ' + outFile);
