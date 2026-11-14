// Comprueba el contraste WCAG AA de los pares texto/fondo definidos en los tokens de index.html.
const fs = require('fs');
const html = fs.readFileSync(require('path').resolve(__dirname, '..', 'index.html'), 'utf8');
const root = html.slice(html.indexOf(':root{'), html.indexOf('}', html.indexOf(':root{')));
const tok = {}; for (const m of root.matchAll(/--([\w-]+):(#[0-9a-fA-F]{6})/g)) tok[m[1]] = m[2];
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'surface-2', 4.5], ['text-muted', 'bg', 4.5],
  ['on-accent', 'accent', 4.5], ['accent', 'surface', 4.5], ['danger', 'surface', 4.5], ['warning', 'surface', 4.5], ['info', 'surface', 4.5], ['success', 'surface', 4.5],
  ['border-input', 'surface', 3], ['accent', 'bg', 3]
];
let fail = 0;
for (const [f, b, min] of pairs) { const r = ratio(tok[f], tok[b]); const ok = r >= min; if (!ok) fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + f + ' on ' + b + ': ' + r.toFixed(2) + ':1 (min ' + min + ')'); }
process.exit(fail ? 1 : 0);
