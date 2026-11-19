// Huella del estado final de una partida. roblox/ServerScriptService/Tests/Fingerprint.luau
// calcula los mismos campos; si el motor de Luau diverge en cualquier subpaso, alguno cambia.
function fingerprint(S) {
  const f = {
    t: S.t, rs: S.rs >>> 0, incSeq: S.incSeq, logN: S.logN || 0, cmSeq: S.cm.seq, sampleSeq: S.sampleSeq,
    morale: S.morale, rest: S.rest, science: S.science, pts: S.pts, samples: S.samples, parts: S.parts,
    maxDose: S.st.maxDose, eGen: S.st.eGen, eUsed: S.st.eUsed, waterUsed: S.st.waterUsed, waterRec: S.st.waterRec,
    foodProd: S.st.foodProd, foodCons: S.st.foodCons, harvested: S.st.harvested, spoiled: S.st.spoiled,
    brownH: S.st.brownH, critH: S.st.critH, incTot: S.st.incTot, incRes: S.st.incRes,
    o2conc: S.sys.o2.conc, thermT: S.sys.thermal.T, pressP: S.sys.press.P, solarDust: S.sys.solar.dust,
    shieldLvl: S.sys.shield.lvl, shieldCap: S.sys.shield.cap, lightMin: S.lightMin
  };
  for (const k of ['o2', 'water', 'power', 'food', 'nutr', 'waste', 'mat', 'rad', 'well']) f['r_' + k] = S.r[k].v;
  for (const k of ['reactor', 'solar', 'o2', 'rec', 'thermal', 'press', 'comms', 'shield', 'lab', 'isru', 'rover']) f['h_' + k] = S.sys[k].h;
  f.dose = S.crew.map((c) => c.dose);
  f.m = [1, 2, 3, 4, 5, 6, 7].map((i) => S.m[i].st + ':' + S.m[i].stars + ':' + S.m[i].att);
  f.inc = S.inc.map((i) => i.id + ':' + i.type + ':' + (i.res ? 1 : 0) + ':' + i.sev);
  // Sin formatear decimales en texto: los números van tal cual y la comparación decide la tolerancia.
  f.plants = [];
  S.beds.forEach((b, bi) => b.plants.forEach((p, k) => { if (p) f.plants.push([bi + 1, k + 1, p.sp, p.prog, p.hp, p.moist, p.nutr]); }));
  f.lastLog = S.log.slice(-5).map((e) => [e.n, e.t, e.k]);
  return f;
}
// Misma codificación canónica que Fingerprint.canon en Luau (ver su cabecera). Un null dentro de un
// objeto se omite, porque en Luau un campo nil no existe; un objeto vacío se codifica como lista vacía.
function canon(v) {
  if (v === null || v === undefined) return 'n';
  if (typeof v === 'boolean') return v ? 't' : 'f';
  if (typeof v === 'number') { const b = Buffer.alloc(8); b.writeDoubleBE(v === 0 ? 0 : v); return 'd' + b.toString('hex'); }
  if (typeof v === 'string') return 's' + Buffer.byteLength(v) + ':' + v;
  if (Array.isArray(v)) return '[' + v.map(canon).join('') + ']';
  const keys = Object.keys(v).filter((k) => v[k] !== null && v[k] !== undefined).sort();
  if (!keys.length) return '[]';
  return '{' + keys.map((k) => 'k' + canon(k) + canon(v[k])).join('') + '}';
}
function fnv(s) {
  let h = 2166136261;
  for (const byte of Buffer.from(s, 'utf8')) h = Math.imul(h ^ byte, 16777619) >>> 0;
  return h.toString(16).padStart(8, '0');
}
const digest = (v) => fnv(canon(v));
module.exports = { fingerprint, canon, fnv, digest };
