--[[
	Escenario determinista de Station y Surv: gemelo de roblox/tests/scenario-ref.js (mismas llamadas, mismo
	orden, mismas etiquetas). Las camas, los pisos y los demás números conservan los valores de JS; solo cambian
	las listas, que en Luau empiezan en 1.
]]
local SSS = game:GetService("ServerScriptService")
local RS = game:GetService("ReplicatedStorage")
local Sim = require(SSS.Sim)
local Station = require(RS.Station)
local Surv = require(RS.Surv)

local function copy(v)
	if type(v) ~= "table" then return v end
	local o = {}
	for k, x in pairs(v) do o[k] = copy(x) end
	return o
end

local Scenario = {}

function Scenario.run()
	local out = {}
	local function rec(k, v) table.insert(out, { k, copy(v) }) end
	--[[ --- Station: elevador de tripulación --- ]]
	local S = Sim.create({ seed = 42, scen = "moon" })
	Station.ensure(S)
	rec("fresh", S.station)
	rec("call.floor", Station.call(S, "crew", 5))
	rec("call.same", Station.call(S, "crew", 1))
	rec("board.player", Station.board(S, "crew", "player"))
	rec("board.rover", Station.board(S, "crew", "rover"))
	rec("call.up", Station.call(S, "crew", 3))
	rec("call.busy", Station.call(S, "crew", 2))
	rec("board.closed", Station.board(S, "crew", "npc"))
	rec("leave.closed", Station.leave(S, "crew", "player"))
	for i = 0, 69 do
		local a = Station.step(S, 0.1)
		if i % 5 == 0 or a then rec("crew.step" .. i, { a, Station.door(S, "crew"), Station.level(S, "crew"), S.station.elev.crew.st, Station.cabinHere(S, 3), Station.cabinHere(S, 1) }) end
	end
	rec("leave.player", Station.leave(S, "crew", "player"))
	rec("crew.after", S.station.elev.crew)
	Station.setBroken(S, "crew", 1)
	rec("broken.call", Station.call(S, "crew", 1))
	rec("broken.board", Station.board(S, "crew", "player"))
	Station.setBroken(S, "crew", 0)
	rec("fixed.call", Station.call(S, "crew", 1))
	rec("stairs.ok", Station.stairs(S, 1, 3))
	rec("stairs.bad", Station.stairs(S, 1, 4))
	--[[ --- Station: elevador del rover --- ]]
	S.ex = { rover = { x = 10, y = 10, a = 2, v = 1, odo = 0 } }
	S.sys.rover.batt = 50
	rec("rover.noplat", Station.call(S, "rover", 2, {}))
	rec("rover.board", Station.board(S, "rover", "rover"))
	rec("rover.full", Station.board(S, "rover", "rover"))
	rec("rover.call", Station.call(S, "rover", 2, { roverOn = true }))
	for i = 0, 39 do
		local a = Station.step(S, 0.25)
		if i % 4 == 0 or a then rec("rover.step" .. i, { a, Station.level(S, "rover"), S.station.roverAt, Station.roverVisible(S), Station.roverStored(S), Station.roverInGarage(S), S.sys.rover.batt }) end
	end
	rec("rover.pos", S.ex.rover)
	for _ = 1, 10 do Station.step(S, 1) end
	rec("rover.charged", S.sys.rover.batt)
	rec("rover.back", Station.call(S, "rover", 0, { roverOn = 1 }))
	for _ = 1, 30 do Station.step(S, 0.25) end
	rec("rover.surface", { S.station, S.ex.rover })
	local plat = {
		{ x = 74, y = 89.6, a = 0, v = 0 }, { x = 75, y = 90, a = -6.1, v = 0.1 }, { x = 74, y = 89.6, a = 3, v = 0 }, { x = 74, y = 89.6, a = 0, v = 0, occ = 1 },
		{ x = 74, y = 89.6, a = 0, v = 0, occ = 0 }, { x = 76, y = 89.6, a = 0, v = 0 }, { x = 74, y = 89.6, a = -0.4, v = 0.29 }, { x = 73, y = 90.5, a = 12.4, v = -0.2 },
	}
	local onp = {}
	for i, R in ipairs(plat) do onp[i] = Station.roverOnPlatform(R) end
	rec("onPlatform", onp)
	--[[ --- Station: núcleo --- ]]
	rec("core.calm", Station.coreStatus(S))
	Sim.addInc(S, "wear", { sys = "reactor", sev = "crit", dmg = 10 })
	rec("core.inc", Station.coreStatus(S))
	rec("core.nosuit", Station.authorizeCore(S, false))
	rec("core.suit", Station.authorizeCore(S, true))
	rec("core.auth", Station.coreStatus(S))
	S.t = 30; S.mods = { spe = 2.2 }
	rec("core.later", Station.coreStatus(S))
	rec("names", { Station.floorName(1, "en"), Station.floorName(4, "es"), Station.floorName(9, "es"), Station.floorName(0, "en"), Station.floorName(5) })
	rec("travel", { Station.travelS("rover", 0, 2), Station.travelS("crew", 3, 1) })
	--[[ --- Surv --- ]]
	local T = Sim.create({ seed = 7, scen = "mars", mode = "adv" })
	local cold = {}
	local function c(dt, ctx) table.insert(cold, { Surv.coldStep(T, dt, ctx), T.surv.why }) end
	for _ = 1, 20 do c(1, { outside = true, suitOn = false }) end
	for _ = 1, 3 do c(1, { outside = false }) end
	for _ = 1, 5 do c(2, { outside = true, suitOn = true, suitEn = 0 }) end
	c(2, { outside = true, suitOn = false, inShel = true })
	c(2, { outside = true, suitOn = false, inRover = true })
	c(0.5, { outside = true, suitOn = true, suitEn = 30 })
	rec("cold", cold)
	local warn = {}
	local function w(label) table.insert(warn, { label, Surv.warnings(T), copy(T.surv.al) }) end
	w("start")
	T.surv.cold = 0.03; w("cold.start"); T.surv.cold = 0.7; w("cold.crit"); T.surv.cold = 0.1; w("cold.down"); T.surv.cold = 0; w("cold.zero")
	T.r.food.v = 0; w("food.zero"); T.z.food = 40; w("food.late"); T.z.food = 65; w("food.faint"); T.r.food.v = 3; T.z.food = 10; w("food.back")
	T.st.maxDose = T.limit * 0.7; w("dose.hi"); T.st.maxDose = T.limit * 0.9; w("dose.crit"); T.st.maxDose = T.limit * 0.3; w("dose.low")
	T.sys.reactor.h = 30; w("core.low"); T.sys.reactor.h = 15; w("core.out"); T.sys.reactor.h = 50; w("core.ok")
	T.sys.rover.h = 35; w("rover.unused"); T.ex = { rover = { odo = 5 } }; w("rover.low"); T.sys.rover.h = 15; w("rover.crit"); T.sys.rover.h = 60; w("rover.ok")
	rec("warnings", warn)
	local hu = {}
	for i, h in ipairs({ 0, 20, 50, 80 }) do T.z.food = h; hu[i] = Surv.hunger(T) end
	rec("hunger", hu)
	rec("doseF", { Surv.doseF(T), Surv.doseF({ limit = 0, st = { maxDose = 3 } }) })
	rec("coreOut", { Surv.coreOut(T), Surv.coreOut({ sys = { reactor = { h = 20 } } }) })
	local k1 = Surv.kill(T, "cold")
	local k2 = Surv.kill(T, "rover")
	rec("kill", { k1, k2, T.ended })
	rec("consts", { Surv.COLD_S, Surv.HUNGER_H })
	return out
end

return Scenario
