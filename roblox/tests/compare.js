// Compara los resultados de Luau (roblox/tests/out/, enviados desde Studio) con la referencia de Node.
// Uso: node roblox/tests/compare.js [selftest|scenario|detail]   (sin argumento: los que existan)
// Sale con código 1 si alguna partida o alguna etiqueta del escenario no coincide.
const fs = require('fs'), path = require('path');
const { canon, digest } = require('./fingerprint');
const here = (f) => path.resolve(__dirname, f);
const out = (f) => path.resolve(__dirname, 'out', f);
const what = process.argv[2];
let bad = 0;

function selftest() {
  const ref = JSON.parse(fs.readFileSync(here('ref.json'), 'utf8'));
  const lines = fs.readFileSync(out('selftest-luau.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const tail = lines.pop();
  const bySeed = new Map(lines.map((g) => [g.seed, g]));
  const fields = ['scen', 'diff', 'mode', 'policy', 'hours', 'done', 'incidents', 'resolved', 'maxConsec'];
  const diffs = [];
  for (const r of ref.games) {
    const g = bySeed.get(r.seed);
    if (!g) { diffs.push([r.seed, 'falta en Luau']); continue; }
    const d = [];
    for (const f of fields) if (r[f] !== g[f]) d.push(f + ': node=' + r[f] + ' luau=' + g[f]);
    if (canon(r.ended) !== canon(g.ended || null)) d.push('ended: node=' + JSON.stringify(r.ended) + ' luau=' + JSON.stringify(g.ended || null));
    if (canon(r.errs) !== canon(g.errs)) d.push('errs: node=' + JSON.stringify(r.errs) + ' luau=' + JSON.stringify(g.errs));
    const dg = digest(r.fp);
    if (dg !== g.digest) d.push('huella del estado final: node=' + dg + ' luau=' + g.digest);
    if (d.length) diffs.push([r.seed, d.join(' · ')]);
  }
  const compared = ref.games.filter((r) => bySeed.has(r.seed)).length;
  console.log('Selftest: ' + compared + ' partidas comparadas, ' + (compared - diffs.filter((x) => bySeed.has(x[0])).length) + ' idénticas (resultado y huella).');
  for (const [s, d] of diffs) console.log('  seed ' + s + ': ' + d);
  if (compared === ref.games.length) {
    const sameSummary = canon(ref.summary) === canon(tail.summary);
    console.log('Resumen: ' + (sameSummary ? 'idéntico' : 'DISTINTO') + ' · tiempo en Luau: ' + tail.ms + ' ms');
    if (!sameSummary) { console.log('  node: ' + JSON.stringify(ref.summary)); console.log('  luau: ' + JSON.stringify(tail.summary)); bad++; }
  }
  bad += diffs.length;
}

function scenario() {
  const ref = require('./scenario-ref').scenario();
  const lu = JSON.parse(fs.readFileSync(out('scenario-luau.json'), 'utf8'));
  let same = 0;
  const n = Math.max(ref.length, lu.length);
  for (let i = 0; i < n; i++) {
    const a = ref[i], b = lu[i];
    if (!a || !b || a[0] !== b[0]) { console.log('  posición ' + i + ': etiqueta node=' + (a && a[0]) + ' luau=' + (b && b[0])); bad++; continue; }
    if (canon(a[1]) === canon(b[1])) same++;
    else { console.log('  ' + a[0] + ':\n    node=' + JSON.stringify(a[1]) + '\n    luau=' + JSON.stringify(b[1])); bad++; }
  }
  console.log('Escenario Station/Surv: ' + same + '/' + ref.length + ' etiquetas idénticas.');
}

// Huella completa campo a campo de las partidas pedidas con Runner.detail (para depurar una diferencia).
function detail() {
  const ref = JSON.parse(fs.readFileSync(here('ref.json'), 'utf8'));
  for (const l of fs.readFileSync(out('detail-luau.jsonl'), 'utf8').trim().split('\n')) {
    const g = JSON.parse(l), r = ref.games.find((x) => x.seed === g.seed);
    const keys = [...new Set([...Object.keys(r.fp), ...Object.keys(g.fp)])].sort();
    const d = keys.filter((k) => canon(r.fp[k]) !== canon(g.fp[k]));
    console.log('seed ' + g.seed + ': ' + (d.length ? d.length + ' campos distintos' : 'huella idéntica'));
    for (const k of d) console.log('  ' + k + ': node=' + JSON.stringify(r.fp[k]) + ' luau=' + JSON.stringify(g.fp[k]));
  }
}

const runs = { selftest, scenario, detail };
for (const k of what ? [what] : ['selftest', 'scenario']) {
  if (k === 'detail' || fs.existsSync(out(k === 'selftest' ? 'selftest-luau.jsonl' : 'scenario-luau.json'))) runs[k]();
  else console.log(k + ': aún no hay resultados de Luau en roblox/tests/out/');
}
process.exit(bad ? 1 : 0);
