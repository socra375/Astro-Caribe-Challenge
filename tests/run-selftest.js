// Ejecuta las 100 simulaciones del motor en Node, extrayendo Sim y SelfTest de index.html.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const cut = (a, b) => html.slice(html.indexOf(a), html.indexOf(b) + b.length);
const code = cut('/*SIM-START*/', '/*SIM-END*/') + '\n' + cut('/*TEST-START*/', '/*TEST-END*/') + '\nthis.Sim = Sim; this.SelfTest = SelfTest;';
const ctx = { module: undefined }; vm.createContext(ctx); vm.runInContext(code, ctx);
const n = +(process.argv[2] || 100);
const t0 = Date.now(); const r = ctx.SelfTest.run(n);
console.log(JSON.stringify(r.summary, null, 2));
if (r.fails.length) console.log('FALLOS:', JSON.stringify(r.fails.slice(0, 10).map((f) => ({ seed: f.seed, errs: f.errs })), null, 1));
console.log('tiempo: ' + (Date.now() - t0) + ' ms');
process.exit(r.fails.length ? 1 : 0);
