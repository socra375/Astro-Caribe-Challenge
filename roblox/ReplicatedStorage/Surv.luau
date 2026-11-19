--[[
	Surv: supervivencia y derrota (port de src/03h_surv.js). Motor puro (sin interfaz) para que se pueda probar.
	Cada causa de derrota sale de condiciones reales del simulador:
	· cold  → estar fuera de la base sin traje (o con la energía del traje agotada). Tarda COLD_S s y se puede evitar volviendo.
	· rover → un choque fuerte deja la integridad del rover en 0 con el jugador al volante (lo decide Rover.update).
	· food  → 72 h simuladas seguidas sin alimentos (Sim.endings).
	· dose  → la dosis de radiación llega al límite del modelo (Sim.endings).
	· core  → el reactor queda fuera de servicio y sin energía de reserva durante 24 h (Sim.endings).
	Nada es aleatorio: dependen de lo que hace el jugador y de recursos que ya se ven en el juego.
	Está en ReplicatedStorage para que el cliente pueda leer el frío y el hambre; `kill` cambia el estado de la
	partida y solo funciona en el servidor (Sim vive en ServerScriptService).
]]
local Surv = {}

local COLD_S = 16 -- segundos fuera sin traje hasta la congelación
local HUNGER_H = 72 -- horas sin comida hasta el desmayo (mismo umbral que Sim.endings)
local function cl(v, a, b) return math.max(a, math.min(b, v)) end

local function ensure(S)
	if not S.surv then S.surv = { cold = 0, al = {}, why = nil } end
	if not S.surv.al then S.surv.al = {} end
	return S.surv
end
--- c = { outside, suitOn, suitEn, inShel, inRover }. Devuelve el nivel de frío (0–1); a 1 llega la congelación.
local function coldStep(S, dt, c)
	local s, rate = ensure(S), 0
	if c.outside and not c.inShel and not c.inRover then
		if not c.suitOn then rate = 1 / COLD_S; s.why = "nosuit"
		elseif c.suitEn <= 0 then rate = 1 / 40; s.why = "suit" end
	end
	s.cold = rate > 0 and math.min(1, s.cold + rate * dt) or math.max(0, s.cold - dt / 5)
	return s.cold
end
--- Efectos del hambre: visión borrosa desde 8 h sin comida, oscuridad desde 30 h; el desmayo llega a las 72 h.
local function hunger(S)
	local h = S.z and S.z.food or 0
	return { h = h, blur = cl((h - 8) / 48, 0, 1), dark = cl((h - 30) / 40, 0, 1), left = math.max(0, HUNGER_H - h) }
end
local function doseF(S)
	-- `S.limit ? … : 0` de JS: un límite 0 o ausente cuenta como "sin límite".
	if S.limit == nil or S.limit == 0 then return 0 end
	return S.st.maxDose / S.limit
end
local function coreOut(S) return S.sys.reactor.h <= 20 end
--- Avisos nuevos antes de llegar a la situación crítica (cada uno una vez, con histéresis).
local function warnings(S)
	local s = ensure(S)
	local A, out, hu, d, rv = s.al, {}, hunger(S), doseF(S), S.sys.rover.h
	local odo = S.ex and S.ex.rover and S.ex.rover.odo
	local usedRover = type(odo) == "number" and odo > 0
	-- Como en JS, un aviso apagado se guarda como 0 y 0 cuenta como "no avisado".
	local function on1(k) return A[k] ~= nil and A[k] ~= 0 end
	local function flag(k, on, off)
		if on and not on1(k) then A[k] = 1; table.insert(out, k)
		elseif on1(k) and off then A[k] = 0 end
	end
	flag("cold.start", s.cold > 0.02, s.cold == 0); flag("cold.crit", s.cold > 0.6, s.cold < 0.2)
	flag("food.zero", S.r.food.v <= 0.01, S.r.food.v > 0.5); flag("food.late", hu.h >= 36, hu.h < 20); flag("food.faint", hu.h >= 60, hu.h < 40)
	flag("dose.hi", d >= 0.6, d < 0.5); flag("dose.crit", d >= 0.85, d < 0.7)
	flag("core.low", S.sys.reactor.h < 35, S.sys.reactor.h > 45); flag("core.out", coreOut(S), S.sys.reactor.h > 30)
	flag("rover.low", usedRover and rv < 40, rv > 50); flag("rover.crit", usedRover and rv < 20, rv > 30)
	return out
end
local function kill(S, why)
	local Sim = require(game:GetService("ServerScriptService"):WaitForChild("Sim"))
	return Sim.kill(S, why)
end

Surv.COLD_S = COLD_S; Surv.HUNGER_H = HUNGER_H; Surv.ensure = ensure; Surv.coldStep = coldStep; Surv.hunger = hunger
Surv.doseF = doseF; Surv.coreOut = coreOut; Surv.warnings = warnings; Surv.kill = kill
return Surv
