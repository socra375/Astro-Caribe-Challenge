/* =====================================================================
   Surv: supervivencia y derrota. Motor puro (sin DOM) para que se pueda probar.
   Cada causa de derrota sale de condiciones reales del simulador:
   · cold  → estar fuera de la base sin traje (o con la energía del traje agotada). Tarda COLD_S s y se puede evitar volviendo.
   · rover → un choque fuerte deja la integridad del rover en 0 con el jugador al volante (lo decide Rover.update).
   · food  → 72 h simuladas seguidas sin alimentos (Sim.endings).
   · dose  → la dosis de radiación llega al límite del modelo (Sim.endings).
   · core  → el reactor queda fuera de servicio y sin energía de reserva durante 24 h (Sim.endings).
   Nada es aleatorio: dependen de lo que hace el jugador y de recursos que ya se ven en el juego.
   ===================================================================== */
const Surv = (() => {
  const COLD_S = 16; // segundos fuera sin traje hasta la congelación
  const HUNGER_H = 72; // horas sin comida hasta el desmayo (mismo umbral que Sim.endings)
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  function ensure(S) { if (!S.surv) S.surv = { cold: 0, al: {}, why: null }; if (!S.surv.al) S.surv.al = {}; return S.surv; }
  /** c = { outside, suitOn, suitEn, inShel, inRover }. Devuelve el nivel de frío (0–1); a 1 llega la congelación. */
  function coldStep(S, dt, c) {
    const s = ensure(S); let rate = 0;
    if (c.outside && !c.inShel && !c.inRover) {
      if (!c.suitOn) { rate = 1 / COLD_S; s.why = 'nosuit'; } else if (c.suitEn <= 0) { rate = 1 / 40; s.why = 'suit'; }
    }
    s.cold = rate > 0 ? Math.min(1, s.cold + rate * dt) : Math.max(0, s.cold - dt / 5);
    return s.cold;
  }
  /** Efectos del hambre: visión borrosa desde 8 h sin comida, oscuridad desde 30 h; el desmayo llega a las 72 h. */
  function hunger(S) { const h = S.z ? S.z.food : 0; return { h, blur: cl((h - 8) / 48, 0, 1), dark: cl((h - 30) / 40, 0, 1), left: Math.max(0, HUNGER_H - h) }; }
  const doseF = (S) => (S.limit ? S.st.maxDose / S.limit : 0);
  const coreOut = (S) => S.sys.reactor.h <= 20;
  /** Avisos nuevos antes de llegar a la situación crítica (cada uno una vez, con histéresis). */
  function warnings(S) {
    const s = ensure(S), A = s.al, out = [], hu = hunger(S), d = doseF(S), rv = S.sys.rover.h, usedRover = !!(S.ex && S.ex.rover && S.ex.rover.odo > 0);
    const flag = (k, on, off) => { if (on && !A[k]) { A[k] = 1; out.push(k); } else if (A[k] && off) A[k] = 0; };
    flag('cold.start', s.cold > 0.02, s.cold === 0); flag('cold.crit', s.cold > 0.6, s.cold < 0.2);
    flag('food.zero', S.r.food.v <= 0.01, S.r.food.v > 0.5); flag('food.late', hu.h >= 36, hu.h < 20); flag('food.faint', hu.h >= 60, hu.h < 40);
    flag('dose.hi', d >= 0.6, d < 0.5); flag('dose.crit', d >= 0.85, d < 0.7);
    flag('core.low', S.sys.reactor.h < 35, S.sys.reactor.h > 45); flag('core.out', coreOut(S), S.sys.reactor.h > 30);
    flag('rover.low', usedRover && rv < 40, rv > 50); flag('rover.crit', usedRover && rv < 20, rv > 30);
    return out;
  }
  function kill(S, why) { return Sim.kill(S, why); }
  return { COLD_S, HUNGER_H, ensure, coldStep, hunger, doseF, coreOut, warnings, kill };
})();
