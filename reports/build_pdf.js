// Genera Space_Explorer_Auditoria_Tecnica.pdf a partir del Markdown del mismo nombre.
// Uso: NODE_PATH=$(npm root -g) node reports/build_pdf.js
// Herramientas gratuitas: Node + Playwright (Chromium). No toca el código del juego.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIR = __dirname, MD = path.join(DIR, 'Space_Explorer_Auditoria_Tecnica.md'), PDF = path.join(DIR, 'Space_Explorer_Auditoria_Tecnica.pdf');

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function render(md) {
  const lines = md.split('\n'), out = []; let i = 0, para = [], list = null;
  const flushP = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushL = () => { if (list) { out.push('<' + list.t + '>' + list.items.map((x) => '<li>' + inline(x) + '</li>').join('') + '</' + list.t + '>'); list = null; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { flushP(); flushL(); i++; continue; }
    if (/^---+\s*$/.test(l)) { flushP(); flushL(); out.push('<hr>'); i++; continue; }
    let m = /^(#{1,4})\s+(.*)$/.exec(l);
    if (m) { flushP(); flushL(); const n = m[1].length; out.push('<h' + n + ' id="' + slug(m[2]) + '">' + inline(m[2]) + '</h' + n + '>'); i++; continue; }
    if (/^\|.*\|\s*$/.test(l) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      flushP(); flushL(); const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(l); i += 2; const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    m = /^\s*[-*]\s+(.*)$/.exec(l); if (m) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); i++; continue; }
    m = /^\s*\d+\.\s+(.*)$/.exec(l); if (m) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); i++; continue; }
    flushL(); para.push(l.trim()); i++;
  }
  flushP(); flushL(); return out.join('\n');
}

const CSS = `
@page { size: A4; margin: 18mm 16mm; }
@page :first { margin: 0; }
* { box-sizing: border-box; }
body { font-family: 'Inter', 'DejaVu Sans', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1b2233; margin: 0; }
h1, h2, h3, h4 { font-weight: 700; line-height: 1.25; color: #0e1a3a; page-break-after: avoid; }
h2 { font-size: 16pt; margin: 26px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #38a9d6; page-break-before: auto; }
h3 { font-size: 12pt; margin: 18px 0 6px; color: #1d3e8a; }
h4 { font-size: 10.5pt; margin: 14px 0 4px; color: #1d2a4d; }
p { margin: 6px 0; orphans: 3; widows: 3; }
ul, ol { margin: 6px 0 8px 20px; padding: 0; } li { margin: 2px 0; }
hr { border: 0; border-top: 1px solid #d6dcea; margin: 16px 0; }
code { font-family: 'DejaVu Sans Mono', monospace; font-size: 8.6pt; background: #eef2fb; padding: 1px 4px; border-radius: 3px; color: #1d3e8a; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 8.6pt; page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th { background: #12204a; color: #fff; text-align: left; padding: 6px 7px; font-weight: 600; }
td { border-bottom: 1px solid #dde3f0; padding: 5px 7px; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f5f7fc; }
td strong { color: #0e1a3a; }
.sev-alta { color: #fff; background: #c0392b; border-radius: 3px; padding: 1px 6px; }
.sev-media { color: #3a2a00; background: #f3b63f; border-radius: 3px; padding: 1px 6px; }
.sev-baja { color: #0c3b24; background: #7fd6a2; border-radius: 3px; padding: 1px 6px; }
.cover { height: 297mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; background: linear-gradient(160deg, #0b1230 0%, #1b2a6b 60%, #3a2a7d 100%); color: #fff; padding: 0 24mm; }
.cover .kicker { letter-spacing: 3px; text-transform: uppercase; font-size: 10pt; color: #7fe6ff; margin-bottom: 14px; }
.cover h1 { font-size: 40pt; color: #fff; margin: 0 0 6px; border: 0; }
.cover .sub { font-size: 17pt; color: #cfe0ff; margin-bottom: 36px; }
.cover .meta { font-size: 10.5pt; color: #cfd8f5; line-height: 1.8; border-top: 2px solid #38d6ff; padding-top: 14px; max-width: 150mm; }
.cover .meta b { color: #fff; }
.cover .note { margin-top: 30px; font-size: 9pt; color: #aab6e0; max-width: 150mm; }
`;

(async () => {
  const md = fs.readFileSync(MD, 'utf8');
  const body = md.slice(md.indexOf('\n---') + 4); // se omite el título y los metadatos: van en la portada
  let html = render(body);
  html = html.replace(/<strong>(Alta|Media|Baja|Cr[ií]tica)<\/strong>/g, (m, g) => '<span class="sev-' + (g.toLowerCase().startsWith('cr') ? 'alta' : g.toLowerCase()) + '">' + g + '</span>');
  const meta = (k) => { const m = new RegExp('\\*\\*' + k + ':\\*\\*\\s*(.*)').exec(md); return m ? inline(m[1]) : ''; };
  const cover = `<section class="cover"><div class="kicker">Auditoría técnica integral</div><h1>Space Explorer</h1><div class="sub">Diagnóstico técnico, visual y de jugabilidad</div>
    <div class="meta"><div><b>Fecha de elaboración:</b> ${meta('Fecha de elaboración')}</div><div><b>Versión auditada:</b> ${meta('Versión auditada')}</div><div><b>Alcance:</b> ${meta('Alcance')}</div></div>
    <div class="note">Informe elaborado a partir del repositorio real: lectura del código, ejecución de las pruebas automáticas, sondas en el navegador y capturas de pantalla. Lo que no pudo comprobarse figura como «pendiente de verificación».</div></section>`;
  const full = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Space Explorer — Auditoría técnica</title><style>' + CSS + '</style></head><body>' + cover + html + '</body></html>';
  fs.writeFileSync(path.join(DIR, '.auditoria.html'), full);
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.setContent(full, { waitUntil: 'load' }); await pg.emulateMedia({ media: 'print' });
  const foot = '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#667;padding:0 16mm;display:flex;justify-content:space-between"><span>Space Explorer · Auditoría técnica</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>';
  const head = '<div style="width:100%;font-family:Arial,sans-serif;font-size:8px;color:#667;padding:0 16mm;text-align:right"></div>';
  await pg.pdf({ path: PDF, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: head, footerTemplate: foot });
  await b.close(); fs.unlinkSync(path.join(DIR, '.auditoria.html'));
  console.log('PDF generado:', PDF, Math.round(fs.statSync(PDF).size / 1024) + ' KB');
})();
