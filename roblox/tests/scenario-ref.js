// Escenario determinista de Station y Surv. roblox/ServerScriptService/Tests/Scenario.luau hace las mismas
// llamadas en el mismo orden y con las mismas etiquetas; compare.js compara los dos resultados.
// Uso: node roblox/tests/scenario-ref.js [salida.json]   (carga Sim, Station y Surv desde src/)
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = (f) => fs.readFileSync(path.resolve(__dirname, '..', '..', 'src', f), 'utf8');
const ctx = { module: undefined }; vm.createContext(ctx);
vm.runInContext(src('03_sim.js') + '\n' + src('03g_station.js') + '\n' + src('03h_surv.js') + '\nthis.Sim = Sim; this.Station = Station; this.Surv = Surv;', ctx);
const { Sim, Station, Surv } = ctx;
const copy = (o) => JSON.parse(JSON.stringify(o));

function scenario() {
  const out = []; const rec = (k, v) => out.push([k, v === undefined ? null : copy(v)]);
  /* --- Station: elevador de tripulación --- */
  const S = Sim.create({ seed: 42, scen: 'moon' });
  Station.ensure(S);
  rec('fresh', S.station);
  rec('call.floor', Station.call(S, 'crew', 5));
  rec('call.same', Station.call(S, 'crew', 1));
  rec('board.player', Station.board(S, 'crew', 'player'));
  rec('board.rover', Station.board(S, 'crew', 'rover'));
  rec('call.up', Station.call(S, 'crew', 3));
  rec('call.busy', Station.call(S, 'crew', 2));
  rec('board.closed', Station.board(S, 'crew', 'npc'));
  rec('leave.closed', Station.leave(S, 'crew', 'player'));
  for (let i = 0; i < 70; i++) {
    const a = Station.step(S, 0.1);
    if (i % 5 === 0 || a) rec('crew.step' + i, [a, Station.door(S, 'crew'), Station.level(S, 'crew'), S.station.elev.crew.st, Station.cabinHere(S, 3), Station.cabinHere(S, 1)]);
  }
  rec('leave.player', Station.leave(S, 'crew', 'player'));
  rec('crew.after', S.station.elev.crew);
  Station.setBroken(S, 'crew', 1);
  rec('broken.call', Station.call(S, 'crew', 1));
  rec('broken.board', Station.board(S, 'crew', 'player'));
  Station.setBroken(S, 'crew', 0);
  rec('fixed.call', Station.call(S, 'crew', 1));
  rec('stairs.ok', Station.stairs(S, 1, 3));
  rec('stairs.bad', Station.stairs(S, 1, 4));
  /* --- Station: elevador del rover --- */
  S.ex = { rover: { x: 10, y: 10, a: 2, v: 1, odo: 0 } };
  S.sys.rover.batt = 50;
  rec('rover.noplat', Station.call(S, 'rover', 2, {}));
  rec('rover.board', Station.board(S, 'rover', 'rover'));
  rec('rover.full', Station.board(S, 'rover', 'rover'));
  rec('rover.call', Station.call(S, 'rover', 2, { roverOn: true }));
  for (let i = 0; i < 40; i++) {
    const a = Station.step(S, 0.25);
    if (i % 4 === 0 || a) rec('rover.step' + i, [a, Station.level(S, 'rover'), S.station.roverAt, Station.roverVisible(S), Station.roverStored(S), Station.roverInGarage(S), S.sys.rover.batt]);
  }
  rec('rover.pos', S.ex.rover);
  for (let i = 0; i < 10; i++) Station.step(S, 1);
  rec('rover.charged', S.sys.rover.batt);
  rec('rover.back', Station.call(S, 'rover', 0, { roverOn: 1 }));
  for (let i = 0; i < 30; i++) Station.step(S, 0.25);
  rec('rover.surface', [S.station, S.ex.rover]);
  const plat = [
    { x: 74, y: 89.6, a: 0, v: 0 }, { x: 75, y: 90, a: -6.1, v: 0.1 }, { x: 74, y: 89.6, a: 3, v: 0 }, { x: 74, y: 89.6, a: 0, v: 0, occ: 1 },
    { x: 74, y: 89.6, a: 0, v: 0, occ: 0 }, { x: 76, y: 89.6, a: 0, v: 0 }, { x: 74, y: 89.6, a: -0.4, v: 0.29 }, { x: 73, y: 90.5, a: 12.4, v: -0.2 }
  ];
  rec('onPlatform', plat.map((R) => Station.roverOnPlatform(R)));
  /* --- Station: núcleo --- */
  rec('core.calm', Station.coreStatus(S));
  Sim.addInc(S, 'wear', { sys: 'reactor', sev: 'crit', dmg: 10 });
  rec('core.inc', Station.coreStatus(S));
  rec('core.nosuit', Station.authorizeCore(S, false));
  rec('core.suit', Station.authorizeCore(S, true));
  rec('core.auth', Station.coreStatus(S));
  S.t = 30; S.mods = { spe: 2.2 };
  rec('core.later', Station.coreStatus(S));
  rec('names', [Station.floorName(1, 'en'), Station.floorName(4, 'es'), Station.floorName(9, 'es'), Station.floorName(0, 'en'), Station.floorName(5)]);
  rec('travel', [Station.travelS('rover', 0, 2), Station.travelS('crew', 3, 1)]);
  /* --- Surv --- */
  const T = Sim.create({ seed: 7, scen: 'mars', mode: 'adv' });
  const cold = [];
  for (let i = 0; i < 20; i++) cold.push([Surv.coldStep(T, 1, { outside: true, suitOn: false }), T.surv.why]);
  for (let i = 0; i < 3; i++) cold.push([Surv.coldStep(T, 1, { outside: false }), T.surv.why]);
  for (let i = 0; i < 5; i++) cold.push([Surv.coldStep(T, 2, { outside: true, suitOn: true, suitEn: 0 }), T.surv.why]);
  cold.push([Surv.coldStep(T, 2, { outside: true, suitOn: false, inShel: true }), T.surv.why]);
  cold.push([Surv.coldStep(T, 2, { outside: true, suitOn: false, inRover: true }), T.surv.why]);
  cold.push([Surv.coldStep(T, 0.5, { outside: true, suitOn: true, suitEn: 30 }), T.surv.why]);
  rec('cold', cold);
  const warn = [];
  const w = (label) => warn.push([label, Surv.warnings(T), Object.assign({}, T.surv.al)]);
  w('start');
  T.surv.cold = 0.03; w('cold.start'); T.surv.cold = 0.7; w('cold.crit'); T.surv.cold = 0.1; w('cold.down'); T.surv.cold = 0; w('cold.zero');
  T.r.food.v = 0; w('food.zero'); T.z.food = 40; w('food.late'); T.z.food = 65; w('food.faint'); T.r.food.v = 3; T.z.food = 10; w('food.back');
  T.st.maxDose = T.limit * 0.7; w('dose.hi'); T.st.maxDose = T.limit * 0.9; w('dose.crit'); T.st.maxDose = T.limit * 0.3; w('dose.low');
  T.sys.reactor.h = 30; w('core.low'); T.sys.reactor.h = 15; w('core.out'); T.sys.reactor.h = 50; w('core.ok');
  T.sys.rover.h = 35; w('rover.unused'); T.ex = { rover: { odo: 5 } }; w('rover.low'); T.sys.rover.h = 15; w('rover.crit'); T.sys.rover.h = 60; w('rover.ok');
  rec('warnings', warn);
  rec('hunger', [0, 20, 50, 80].map((h) => { T.z.food = h; return Surv.hunger(T); }));
  rec('doseF', [Surv.doseF(T), Surv.doseF({ limit: 0, st: { maxDose: 3 } })]);
  rec('coreOut', [Surv.coreOut(T), Surv.coreOut({ sys: { reactor: { h: 20 } } })]);
  rec('kill', [Surv.kill(T, 'cold'), Surv.kill(T, 'rover'), T.ended]);
  rec('consts', [Surv.COLD_S, Surv.HUNGER_H]);
  return out;
}
module.exports = { scenario };
if (require.main === module) {
  const outFile = process.argv[2] || path.resolve(__dirname, 'scenario-ref.json');
  fs.writeFileSync(outFile, JSON.stringify(scenario()));
  console.log('escenario de referencia -> ' + outFile);
}
