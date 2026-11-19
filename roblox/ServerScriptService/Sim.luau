--[[
	SIM — Motor de simulación independiente de la interfaz (port de src/03_sim.js).
	- Estado de tablas puras (serializable). Tiempo en horas simuladas. RNG con semilla guardada en el estado.
	- Cada parámetro se etiqueta como R = dato real publicado, M = estimación de un modelo, G = simplificación de juego.

	Diferencias con la versión de JS (todas deliberadas):
	- Índices desde 1: camas (`bed`), huecos (`slot`), `S.crew`, `S.beds[b].plants`. Los huecos vacíos valen `false`
	  (en JS, `null`), porque una tabla de Luau no puede guardar `nil` dentro de un array.
	- `S.rs` se guarda sin signo (0..2^32-1); en JS es un entero con signo. Los números que salen de `rnd` son iguales.
	- Ex, EL y Land (exploración, radio y aterrizaje) aún no existen en Luau: se conectan desde `Sim.hooks`
	  cuando se porten. Sin ellos el motor se comporta como en tests/run-selftest.js, que tampoco los carga.
	La traducción conserva el orden de las operaciones con decimales, la veracidad de JS (0 es falso) y el orden
	estable de JS al ordenar y al recorrer objetos, para que las partidas con la misma semilla den el mismo resultado.
]]

local Sim = {}
Sim.hooks = { Ex = nil, EL = nil, Land = nil }

local fmod, floor, mmin, mmax, mabs, msin, PI = math.fmod, math.floor, math.min, math.max, math.abs, math.sin, math.pi
local band, bor, bxor, rshift = bit32.band, bit32.bor, bit32.bxor, bit32.rshift
local INF = math.huge
local U32 = 4294967296

--[[ ---------- Equivalencias de JS ---------- ]]
local function clamp(v, a, b)
	if v < a then return a elseif v > b then return b end
	return v
end
local function isFinite(v) return type(v) == "number" and v == v and v ~= INF and v ~= -INF end
local function fin(v, d) if isFinite(v) then return v end return d end
-- Veracidad de JS: false, nil, 0, NaN y "" son falsos.
local function truthy(v) return v ~= nil and v ~= false and v ~= 0 and v ~= "" and v == v end
-- `+v` de JS.
local function num(v)
	local t = type(v)
	if t == "number" then return v end
	if t == "boolean" then return v and 1 or 0 end
	if t == "string" then return tonumber(v) or 0 / 0 end
	return 0 / 0
end
-- Math.round de JS: el entero más cercano; los empates van hacia +∞.
local function jsround(x)
	local f = floor(x)
	if x - f >= 0.5 then return f + 1 end
	return f
end
local function toU32(x)
	x = num(x)
	if not isFinite(x) then return 0 end
	x = x < 0 and math.ceil(x) or floor(x)
	return x % U32
end
-- Math.imul sin perder precisión (a y b sin signo de 32 bits).
local function imul(a, b)
	local al, ah = a % 65536, floor(a / 65536)
	local bl, bh = b % 65536, floor(b / 65536)
	return (al * bl + ((ah * bl + al * bh) % 65536) * 65536) % U32
end
local function some(t, f) for _, x in ipairs(t) do if f(x) then return true end end return false end
local function find(t, f) for _, x in ipairs(t) do if f(x) then return x end end return nil end
local function filter(t, f) local o = {} for _, x in ipairs(t) do if f(x) then o[#o + 1] = x end end return o end
local function includes(t, v) for _, x in ipairs(t) do if x == v then return true end end return false end
local function count(t) local n = 0 for _ in pairs(t) do n += 1 end return n end
local function assign(t) local o = {} for k, v in pairs(t) do o[k] = v end return o end
-- Ordenación estable (Array.prototype.sort de JS lo es); las listas aquí son cortas.
local function stableSort(t, lt)
	for i = 2, #t do
		local x, j = t[i], i - 1
		while j >= 1 and lt(x, t[j]) do t[j + 1] = t[j]; j -= 1 end
		t[j + 1] = x
	end
	return t
end
local function deepCopy(v)
	if type(v) ~= "table" then return v end
	local o = {}
	for k, x in pairs(v) do o[k] = deepCopy(x) end
	return o
end
-- Quita los primeros elementos hasta dejar `n` (splice(0, len - n) / shift de JS).
local function trimFront(t, n)
	local extra = #t - n
	if extra <= 0 then return end
	table.move(t, extra + 1, #t, 1)
	for i = #t, #t - extra + 1, -1 do t[i] = nil end
end

--[[ ---------- Parámetros documentados ---------- ]]
local P = {
	O2_PER_PERSON_DAY = 0.84, -- R: kg O2/persona/día (NASA, diseño de soporte vital; ~0.84 kg)
	O2_STOICH_WATER = 1.125, -- R: L de agua por kg de O2 en electrólisis (2H2O→2H2+O2; 18/16)
	WATER_PER_PERSON_DAY = 3.5, -- G: L/persona/día de uso doméstico mínimo dentro del modelo
	FOOD_PER_PERSON_DAY = 0.62, -- M: kg de ración equivalente/persona/día (orden de magnitud de menús deshidratados)
	O2GEN_MAX = 0.30, -- G: kg/h máximo del generador (dimensionado para 5 tripulantes)
	O2GEN_KW = 3.0, -- G: kW a máxima producción
	REC_EFF_ECO = 0.85, -- M: fracción de agua recuperada (ISS recupera >90 % en su mejor configuración)
	REC_EFF_MAX = 0.93, -- M
	REC_KW_ECO = 1.4, REC_KW_MAX = 2.2, -- G
	REACTOR_KW = 6, -- G: reactor de fisión pequeño (NASA estudia sistemas de ~40 kWe; aquí reducido)
	BATT_KWH = 200, -- G
	BATT_MAX_DIS = 15, -- G: kW
	CHARGE_EFF = 0.92, -- M: eficiencia típica de carga de baterías de ion-litio
	LIGHT_KW_PER_BED = 0.6, -- G
	O2_BAND = { 19.5, 23.5 }, -- R: rango de O2 en cabina considerado seguro (normas de seguridad ocupacional / NASA)
	CROP_CYCLE_H = 168, -- G: ciclo comprimido a 7 días simulados (simplificación educativa)
	LIGHT_MIN_TO_H = 1, -- G: escala de comunicaciones: 1 minuto-luz real ≈ 1 h simulada
	WASTE_PER_PERSON_DAY = 0.3, -- G: kg de residuos reciclables (envases, textiles) por persona y día
	ISRU_KW = 1.8, -- G: extracción y fusión de hielo de regolito (concepto ISRU real; potencia simplificada)
	ISRU_LPH = 0.45, -- G: litros/hora de agua extraída
	MOON_ONEWAY_H = 0.3, -- G: la Luna está a ~1,3 s-luz (R); se muestra con un mínimo jugable
}
local SC = {
	moon = { reactorKw = 6, g = 1.62, gcr = 1.37, tOut = -120, heat = 1.8, sunBase = 0.85, sunAmp = 0.1, sunPeriod = 24 * 29.5, solarPeak = 12, dustRate = 0.0006 },
	-- gcr Luna: ~1,37 mSv/día medido por Chang'e-4 LND (Zhang et al., Science Advances 2020) [R]
	mars = { reactorKw = 10, g = 3.71, gcr = 0.64, tOut = -60, heat = 2.2, sunBase = 0.43, sol = 24.66, solarPeak = 18, dustRate = 0.0009 },
	-- gcr Marte: ~0,64 mSv/día medido por MSL/RAD en el cráter Gale (Hassler et al., Science 2014) [R]
	-- sunBase Marte: ~43 % de la irradiancia solar que llega a la Tierra [R]; sol = 24,66 h [R]
}
local DIFFS = {
	explorer = { cons = 0.85, ev = 0.5, maxInc = 1, dose = 120, lead = 8, startPct = 0.9, shelter = 5, repair = 1.3, grace = 1.4, mat = 50, budget = 20, samples = 3 },
	engineer = { cons = 1.0, ev = 1.0, maxInc = 2, dose = 80, lead = 5, startPct = 0.75, shelter = 4, repair = 1.0, grace = 1.0, mat = 36, budget = 14, samples = 4 },
	commander = { cons = 1.1, ev = 1.6, maxInc = 3, dose = 60, lead = 3, startPct = 0.62, shelter = 3, repair = 0.85, grace = 0.7, mat = 26, budget = 12, samples = 5 },
}
-- Especies cultivadas realmente en la ISS (Veggie / Advanced Plant Habitat). Parámetros de juego (G).
-- y = kg de alimento por planta · light = luz necesaria (0-1) · nutr = demanda relativa · T = temperatura óptima (°C)
local CROPS = {
	romaine = { y = 0.7, light = 0.65, nutr = 1.0, T = 20, seeds = 1, mor = 0, prune = false },
	mizuna = { y = 0.55, light = 0.55, nutr = 0.8, T = 19, seeds = 2, mor = 0, prune = true },
	radish = { y = 0.9, light = 0.7, nutr = 0.9, T = 18, seeds = 1, mor = 0, prune = false },
	chili = { y = 0.6, light = 0.85, nutr = 1.3, T = 24, seeds = 2, mor = 2, prune = true },
	zinnia = { y = 0, light = 0.75, nutr = 1.0, T = 22, seeds = 2, mor = 5, prune = true },
}
local SLOTS = 3
local function stageOf(p)
	return p.prog >= 1 and 4 or p.prog >= 0.6 and 3 or p.prog >= 0.3 and 2 or p.prog >= 0.08 and 1 or 0
end
-- Campaña de familiarización: cada etapa desbloquea una sección al cumplir objetivos reales.
local CAMP = {
	{ id = "c1", unlock = "water", keys = { "talk_bridge", "cmd_resources", "talk_life", "med_open", "talk_reactor", "power_action" } },
	{ id = "c2", unlock = "gh", keys = { "talk_water", "rec_fixed", "o2_cal", "water_hold" } },
	{ id = "c3", unlock = "lab", keys = { "talk_gh", "plant3", "water1", "feed1", "harvest1" } },
	{ id = "c4", unlock = "rad", keys = { "talk_lab", "analyze1", "spec_open", "log_open" } },
}
-- Ampliación de la base: cada zona nueva se abre al completar la anterior. No bloquea misiones ni emergencias.
local EXP = {
	{ id = "x1", unlock = "kitchen", keys = { "talk_food", "store_open" } },
	{ id = "x2", unlock = "samples", keys = { "talk_kitchen", "cook1" } },
	{ id = "x3", unlock = "workshop", keys = { "talk_samples", "sstore1" } },
	{ id = "x4", unlock = "waste", keys = { "talk_workshop", "craft1" } },
	{ id = "x5", unlock = nil, keys = { "talk_waste", "sort1", "recycle1" } },
}
local ALLROOMS = { bridge = 1, life = 1, med = 1, reactor = 1, water = 1, gh = 1, lab = 1, rad = 1, food = 1, kitchen = 1, samples = 1, workshop = 1, waste = 1 }
local ROLES = { "commander", "engineer", "scientist", "medic", "agri" }
--- Enfoques de misión (asistente de inicio). Lunar y Marte: las 7 misiones. Estación y Ciencia: configuraciones con objetivos propios y su victoria.
local FOCUS = {
	moon = { goals = { 1, 2, 3, 4, 5, 6, 7 }, sciMin = 0, mat = 0 },
	mars = { goals = { 1, 2, 3, 4, 5, 6, 7 }, sciMin = 0, mat = 0 },
	station = { goals = { 1, 2, 3, 5, 6 }, sciMin = 0, mat = 20 }, -- soporte vital, energía, protección solar, blindaje y cultivos; +20 de materiales para construir
	science = { goals = { 3, 4, 7 }, sciMin = 8, mat = 0 }, -- protección para salir, sitio de exploración, rover con muestras y al menos un análisis/experimento (8 pts de ciencia)
}

--[[ ---------- Incidentes (plantillas) ---------- ]]
local EV = {
	solar_storm = { sc = { "moon", "mars" }, sev = "crit", room = "rad", sys = "shield", w = 0.7, dur = { 14, 22 }, env = true, jd = 4 },
	power_drop = { sc = { "moon" }, sev = "warn", room = "reactor", sys = "solar", w = 1.0, dur = { 20, 34 }, env = true },
	dust_storm = { sc = { "mars" }, sev = "warn", room = "reactor", sys = "solar", w = 1.1, dur = { 30, 60 }, env = true },
	water_fail = { sc = { "moon", "mars" }, sev = "warn", room = "water", sys = "rec", w = 1.0, fix = "wiring" }, -- jd = día a partir del cual aparece en Junior (eventos presentados progresivamente)
	pressure_leak = { sc = { "moon", "mars" }, sev = "crit", room = "life", sys = "press", w = 0.7, fix = "wiring", jd = 3 },
	comms_blackout = { sc = { "moon", "mars" }, sev = "info", room = "bridge", sys = "comms", w = 0.8, fix = "wiring", dur = { 14, 26 }, jd = 3 },
	crop_fail = { sc = { "moon", "mars" }, sev = "warn", room = "gh", sys = "gh", w = 0.8, fix = "gh", jd = 2 },
	thermal_fail = { sc = { "moon", "mars" }, sev = "warn", room = "life", sys = "thermal", w = 0.8, fix = "wiring", adv = true },
	wear = { sc = { "moon", "mars" }, sev = "info", room = "reactor", sys = "reactor", w = 1.1, fix = "wiring" },
	sensor_drift = { sc = { "moon", "mars" }, sev = "info", room = "water", sys = "o2", w = 0.6, fix = "o2", adv = true },
}
-- Orden de las claves de EV en JS: el sorteo ponderado de spawn depende de él.
local EV_ORDER = { "solar_storm", "power_drop", "dust_storm", "water_fail", "pressure_leak", "comms_blackout", "crop_fail", "thermal_fail", "wear", "sensor_drift" }
local SYS_ROOM = { isru = "rad", reactor = "reactor", solar = "reactor", shield = "rad", o2 = "water", rec = "water", comms = "bridge", thermal = "life", press = "life", gh = "gh", lab = "lab" }

-- Diagnóstico (modo Ingeniero): índice de la causa correcta entre 3 opciones (los textos están en NPCDATA.DIAG).
local DIAG_OK = { water_fail = 0, pressure_leak = 1, comms_blackout = 2, thermal_fail = 1, wear = 0, sensor_drift = 2 }
local PRIO_IDS = { "lab", "rover", "isru", "jobs", "lights", "pumps" }

local step, sub, derive, normalize, finishMission, addSamples, resolveInc, campStart, expStart

--[[ ---------- RNG (mulberry32 con estado en S.rs) ---------- ]]
local function rnd(S)
	S.rs = (S.rs + 0x6D2B79F5) % U32
	local a = S.rs
	local t = imul(bxor(a, rshift(a, 15)), bor(1, a))
	t = bxor((t + imul(bxor(t, rshift(t, 7)), bor(61, t))) % U32, t)
	return bxor(t, rshift(t, 14)) / U32
end
local function rr(S, a, b) return a + (b - a) * rnd(S) end

local function newPlant(S, sp, prog)
	prog = prog or 0
	return { sp = sp, prog = prog, hp = 100, moist = 60, nutr = 70, light = 0, pest = false, pestKnown = false, prune = 0, seed = floor(rnd(S) * 1e6), inspected = false, age = prog * 168 }
end

local function R(max, pct, warn, crit) return { v = max * pct, max = max, warn = max * warn, crit = max * crit, cons = 0, prod = 0 } end

--[[ ---------- Utilidades ---------- ]]
local function log(S, sev, k, p)
	S.logN = (S.logN or 0) + 1
	table.insert(S.log, { n = S.logN, t = jsround(S.t * 100) / 100, sev = sev, k = k, p = p or {} })
	trimFront(S.log, 250)
end
local function campDone()
	-- i y xi apuntan una posición más allá de la última etapa (campaña y ampliación terminadas).
	return { i = #CAMP + 1, unlocked = assign(ALLROOMS), f = {}, cnt = {}, visited = { bridge = 1, life = 1, reactor = 1, water = 1, gh = 1, lab = 1, rad = 1 }, done = { c1 = 1, c2 = 1, c3 = 1, c4 = 1, x1 = 1, x2 = 1, x3 = 1, x4 = 1, x5 = 1 }, basicDone = true, hold = 0, inc = 0, xi = #EXP + 1 }
end
local function campFlag(S, key) if S.camp then S.camp.f[key] = 1 end end
local function campCnt(S, key) if S.camp then S.camp.cnt[key] = (S.camp.cnt[key] or 0) + 1 end end
local function plantsList(S)
	local out = {}
	for bi, b in ipairs(S.beds) do
		for k, p in ipairs(b.plants) do
			if p then table.insert(out, { p = p, bi = bi, k = k }) end
		end
	end
	return out
end
local function pct(r) return r.max > 0 and r.v / r.max or 0 end
local function status(S, key)
	if key == "dose" then
		local f = S.st.maxDose / S.limit
		return f >= 0.85 and "crit" or f >= 0.6 and "warn" or "ok"
	end
	local r = S.r[key]
	return r.v <= r.crit and "crit" or r.v <= r.warn and "warn" or "ok"
end
local function activeInc(S) return filter(S.inc, function(i) return not i.res end) end
local function hasActive(S, typ) return some(S.inc, function(i) return not i.res and i.type == typ and S.t >= i.from end) end
local function shieldEff(S) return clamp((0.25 + 0.25 * S.sys.shield.lvl) * (S.sys.shield.h / 100), 0, 1) end
-- Junior: retraso reducido para que sea jugable (se explica en la interfaz)
local function oneWay(S)
	local base = S.scen == "moon" and P.MOON_ONEWAY_H or S.lightMin * P.LIGHT_MIN_TO_H
	if S.adv then return base end
	return mmax(P.MOON_ONEWAY_H, base * 0.4)
end
local function playerOf(S)
	local role = S.playerRole or "commander"
	return find(S.crew, function(c) return c.role == role end) or S.crew[1]
end
-- Un especialista aporta su bonus si no está en el refugio durante una tormenta.
local function bonus(S, role)
	local c = find(S.crew, function(x) return x.role == role end)
	return c ~= nil and c.zone ~= "shelter"
end

--[[ ---------- Creación ---------- ]]
local function create(o)
	o = o or {}
	local scen = o.scen == "mars" and "mars" or "moon"
	local adv = o.mode == "adv"
	-- Sin `indep` (partidas y pruebas anteriores): Junior = guiado; Ingeniero = estándar o exigente. Con `indep` (asistente de inicio): la dificultad se elige aparte de la edad.
	local diff
	if truthy(o.indep) and DIFFS[o.diff] then diff = o.diff
	elseif not adv then diff = "explorer"
	elseif o.diff == "commander" then diff = "commander"
	else diff = "engineer" end
	local df = DIFFS[diff]
	local seed = toU32(o.seed)
	if seed == 0 then seed = 1 end
	local S = {
		v = 1, scen = scen, diff = diff, seed = seed, rs = seed, t = 0, N = 5, noEv = truthy(o.noEv), ended = nil, mode = adv and "adv" or "junior", adv = adv, prioOv = {}, hist = {}, hlast = 0,
		lightMin = 0.0217, -- minutos-luz Luna (≈1,3 s)
		limit = df.dose,
		r = {
			o2 = R(36, df.startPct, 0.35, 0.15),
			water = R(200, df.startPct, 0.35, 0.15),
			power = R(P.BATT_KWH, df.startPct * 0.9, 0.3, 0.12),
			food = R(80, df.startPct, 0.3, 0.12),
			nutr = R(30, 0.5, 0.2, 0.07),
			waste = R(40, 0.25, 0.75, 0.9),
			mat = R(120, df.mat / 120, 0.12, 0.05),
			rad = { v = 50, max = 100, warn = 45, crit = 30, cons = 0, prod = 0 },
			well = { v = 78, max = 100, warn = 45, crit = 25, cons = 0, prod = 0 },
		},
		sys = {
			reactor = { h = 100, lvl = 0.8 },
			solar = { h = 100, align = 0.8, dust = 0 },
			o2 = { h = 100, lvl = 0.6, auto = true, calib = 0, conc = 20.9 },
			rec = { h = 100, mode = "eco" },
			thermal = { h = 100, T = 21 },
			press = { h = 100, P = 101.3 },
			comms = { h = 100 },
			shield = { h = 100, lvl = 1, cap = df.shelter },
			gh = { lights = 0.6, irrig = 0.6, drip = false },
			lab = { h = 100 },
			isru = { h = 100, on = true },
			rover = { h = 100, batt = 100, hint = false, runs = 0 },
		},
		focus = FOCUS[o.focus] and o.focus or nil, age = truthy(o.age) and o.age or nil,
		emergency = false, proto = false, cap = { gh = 1, lab = 1, comms = 1 },
		beds = {}, crew = {}, jobs = {}, inc = {}, log = {}, incSeq = 1,
		cm = { q = {}, inbox = {}, seq = 1, nextDaily = 20 },
		m = {}, samples = 0, science = 0, pts = 0, morale = 78, rest = 75,
		pant = { fresh = 0, cold = true, ration = "normal", mealT = -99, log = {} }, sampleList = {}, sampleSeq = 1, parts = 0, sorted = false,
		z = { water = 0, food = 0, power = 0, press = 0, well = 0 },
		lastEv = 0, pw = {}, lf = {}, d = {}, pendingCards = {}, quiz = {},
		st = {
			waterUsed = 0, waterRec = 0, eGen = 0, eUsed = 0, foodProd = 0, foodCons = 0, incTot = 0, incRes = 0, quizOk = 0, quizTot = 0,
			maxDose = 0, brownH = 0, critH = 0, mistakes = {}, good = {}, harvested = 0, samplesTot = 0, crops = {}, spoiled = 0, meals = 0, crafted = 0,
		},
	}
	if scen == "mars" then S.lightMin = jsround(rr(S, 4, 20) * 10) / 10 end -- real: ~3 a ~22 min según posiciones orbitales
	for _ = 1, 6 do table.insert(S.beds, { light = 0.7, plants = { false, false, false } }) end
	for k, sp in ipairs({ "romaine", "mizuna", "romaine" }) do S.beds[1].plants[k] = newPlant(S, sp, 0.35 + 0.05 * (k - 1)) end
	S.seeds = { romaine = 6, mizuna = 6, radish = 6, chili = 3, zinnia = 3 }
	S.playerRole = "commander"
	S.camp = truthy(o.skipCamp) and campDone() or { i = 1, unlocked = { bridge = 1, life = 1, med = 1, reactor = 1, water = 1 }, f = {}, cnt = {}, visited = {}, done = {}, basicDone = false, hold = 0, inc = 0, xi = 1 }
	for i = 1, 5 do table.insert(S.crew, { role = ROLES[i], zone = "hab", dose = 0 }) end
	for i = 1, 7 do S.m[i] = { st = "idle", var = 0, stars = 0, hold = 0, t0 = 0, att = 0, prog = 0, data = {} } end
	derive(S)
	return S
end

--- Adapta partidas guardadas con versiones anteriores (camas de un solo cultivo, sin campaña).
local function migrate(S)
	local RS = game:GetService("ReplicatedStorage")
	local st = RS:FindFirstChild("Station")
	if st then require(st).ensure(S) end
	if Sim.hooks.Land then Sim.hooks.Land.ensure(S) end
	if not S.camp then S.camp = campDone() end
	do
		local C = S.camp
		C.unlocked.med = 1
		if C.xi == nil then
			C.xi = 1
			if C.basicDone then C.unlocked.food = 1 end
		end
	end
	if not S.pant then S.pant = { fresh = 0, cold = true, ration = "normal", mealT = -99, log = {} } end
	if not S.sampleList then
		S.sampleList = {}; S.sampleSeq = 1
		local n = mmax(0, jsround(S.samples or 0)); S.samples = 0
		if n > 0 then addSamples(S, n, "legacy") end
	end
	if S.parts == nil then S.parts = 0 end
	if S.sorted == nil then S.sorted = false end
	if S.st then S.st.spoiled = S.st.spoiled or 0; S.st.meals = S.st.meals or 0; S.st.crafted = S.st.crafted or 0 end
	if not S.seeds then S.seeds = { romaine = 6, mizuna = 6, radish = 6, chili = 3, zinnia = 3 } end
	if not S.r.nutr then S.r.nutr = R(30, 0.5, 0.2, 0.07) end
	if not S.playerRole then S.playerRole = "commander" end
	if not S.mode then S.adv = S.diff ~= "explorer"; S.mode = S.adv and "adv" or "junior" end
	if not S.prioOv then S.prioOv = {} end
	if not S.hist then S.hist = {}; S.hlast = S.t or 0 end
	for i, b in ipairs(S.beds) do
		if not b.plants then S.beds[i] = { light = (S.sys.gh and S.sys.gh.lights) or 0.7, plants = { false, false, false } } end
	end
	return S
end

--[[ ---------- Incidentes ---------- ]]
local function addInc(S, typ, o)
	o = o or {}
	local T = EV[typ]
	if not T then return nil end
	local lead = truthy(o.lead) and o.lead or 0
	local from = S.t + lead
	local inc = {
		id = S.incSeq, type = typ, sev = truthy(o.sev) and o.sev or T.sev, room = truthy(o.room) and o.room or T.room, sys = truthy(o.sys) and o.sys or T.sys,
		t0 = S.t, from = from, prog = 0, fix = T.fix, res = false, data = o.data or {}, mission = truthy(o.mission) and o.mission or 0,
	}
	inc["until"] = nil
	S.incSeq += 1
	if T.dur or truthy(o.dur) then
		local d = truthy(o.dur) and o.dur or rr(S, T.dur[1], T.dur[2])
		inc["until"] = from + d
	end
	if typ == "wear" then
		local opts = filter({ "reactor", "solar", "shield", "o2" }, function(x) return not S.camp or truthy(S.camp.unlocked[SYS_ROOM[x]]) end)
		local sys = truthy(o.sys) and o.sys or opts[floor(rnd(S) * #opts) + 1] or "reactor"
		inc.sys = sys; inc.room = SYS_ROOM[sys]
		local dmg = truthy(o.dmg) and o.dmg or rr(S, 18, 30)
		S.sys[sys].h = clamp(S.sys[sys].h - dmg, 5, 100)
	end
	if typ == "crop_fail" then -- plaga (pulgones/hongos): afecta a varias plantas; hay que identificarla y podar
		local list = plantsList(S)
		for _ = 1, mmin(3, #list) do
			local x = list[floor(rnd(S) * #list) + 1]
			x.p.pest = true; x.p.hp = clamp(x.p.hp - 15, 1, 100)
		end
	end
	if typ == "sensor_drift" then S.sys.o2.calib += 2.2 end
	if typ == "solar_storm" then inc.data.rate = truthy(inc.data.rate) and inc.data.rate or rr(S, 2.0, 2.8) end -- mSv/h sin blindaje (modelo G)
	table.insert(S.inc, inc)
	S.st.incTot += 1
	log(S, inc.sev, "ev." .. typ, { id = inc.id, lead = lead, sys = inc.sys })
	return inc
end
function resolveInc(S, inc, how)
	if inc.res then return end
	inc.res = true; inc.tRes = S.t
	if inc.fix then S.st.incRes += 1 end
	local sy = S.sys
	if inc.type == "water_fail" then sy.rec.h = mmax(sy.rec.h, 92) end
	if inc.type == "thermal_fail" then sy.thermal.h = mmax(sy.thermal.h, 92) end
	if inc.type == "pressure_leak" then sy.press.h = mmax(sy.press.h, 95) end
	if inc.type == "comms_blackout" then sy.comms.h = mmax(sy.comms.h, 95) end
	if inc.type == "wear" then sy[inc.sys].h = mmax(sy[inc.sys].h, mmin(100, sy[inc.sys].h + 45)) end
	if inc.type == "sensor_drift" then sy.o2.calib = 0 end
	if inc.type == "crop_fail" then
		for _, x in ipairs(plantsList(S)) do x.p.pest = false; x.p.pestKnown = false; x.p.hp = mmax(x.p.hp, 50) end
	end
	log(S, "ok", "res." .. inc.type, { id = inc.id, how = how or "auto" })
end
local function findInc(S, id) return find(S.inc, function(i) return i.id == id end) end
local function repair(S, id, amount)
	local inc = findInc(S, id)
	if not inc or inc.res or not inc.fix then return false end
	if S.adv and DIAG_OK[inc.type] ~= nil and not inc.diag then return false end -- en el modo avanzado hay que diagnosticar antes
	inc.prog = clamp(inc.prog + amount, 0, 100)
	if inc.prog >= 100 then resolveInc(S, inc, "player") end
	return true
end
--- Modo Ingeniero: elegir la causa probable. Acertar desbloquea la reparación (+20 %); fallar cuesta 1 h.
local function diagnose(S, id, choice)
	local inc = findInc(S, id)
	if not inc or inc.res or DIAG_OK[inc.type] == nil then return { ok = false, err = "none" } end
	if inc.diag then return { ok = true, already = true } end
	if choice == DIAG_OK[inc.type] then
		inc.diag = 1; inc.prog = clamp(inc.prog + 20, 0, 100); S.st.good.diag = (S.st.good.diag or 0) + 1; S.pts += 10
		log(S, "ok", "diag.ok", { id = id, type = inc.type })
		return { ok = true }
	end
	inc.wrong = (inc.wrong or 0) + 1; S.st.mistakes.diag = (S.st.mistakes.diag or 0) + 1; log(S, "warn", "diag.bad", { id = id, type = inc.type })
	step(S, 1)
	return { ok = false }
end
local function mods(S)
	local M = { sunMul = 1, leak = 0, spe = 0, recMul = 1, thermMul = 1, commsDown = false, blight = false }
	for _, i in ipairs(S.inc) do
		if not (i.res or S.t < i.from) then
			local k = i.type
			if k == "solar_storm" then M.spe += i.data.rate
			elseif k == "power_drop" then M.sunMul *= 0.3
			elseif k == "dust_storm" then M.sunMul *= 0.35
			elseif k == "water_fail" then M.recMul *= 0.45
			elseif k == "pressure_leak" then M.leak += 0.6
			elseif k == "comms_blackout" then M.commsDown = true
			elseif k == "crop_fail" then M.blight = true
			elseif k == "thermal_fail" then M.thermMul *= 0.4 end
		end
	end
	return M
end
local function spawn(S, h)
	if S.noEv or S.t < 14 then return end
	local df = DIFFS[S.diff]
	if #activeInc(S) >= df.maxInc then return end
	if S.t - S.lastEv < 10 then return end
	if rnd(S) > 0.02 * df.ev * h * ((S.camp and not S.camp.basicDone) and 0.5 or 1) then return end
	local function open(room) return not S.camp or truthy(S.camp.unlocked[room]) end
	local nPlants = #plantsList(S)
	local pool = filter(EV_ORDER, function(k)
		local E = EV[k]
		return includes(E.sc, S.scen) and not some(S.inc, function(i) return not i.res and i.type == k end) and open(E.room) and not (E.adv and not S.adv)
			and (S.adv or S.t >= (E.jd or 0) * 24) and not (k == "crop_fail" and nPlants == 0)
	end)
	if #pool == 0 then return end
	local tot = 0
	for _, k in ipairs(pool) do tot = tot + EV[k].w end
	local x, pick = rnd(S) * tot, pool[1]
	for _, k in ipairs(pool) do
		x -= EV[k].w
		if x <= 0 then pick = k; break end
	end
	S.lastEv = S.t
	addInc(S, pick, pick == "solar_storm" and { lead = df.lead } or {})
end

--[[ ---------- Paso de simulación ---------- ]]
function step(S, dt)
	dt = fin(dt, 0)
	local guard = 0
	while dt > 1e-9 and not S.ended and guard < 100000 do
		guard += 1
		local h = mmin(dt, 0.25)
		sub(S, h)
		dt -= h
	end
end

local chains, commsStep, campStep, missionsStep, endings, finishJob
local RATION = { low = 0.8, normal = 1, high = 1.15 }

function sub(S, h)
	local df, sc, sy, r = DIFFS[S.diff], SC[S.scen], S.sys, S.r
	S.t += h
	local M = mods(S)
	S.mods = M

	--[[ --- Entorno solar --- ]]
	local sun
	if S.scen == "moon" then sun = sc.sunBase + sc.sunAmp * msin((2 * PI * S.t) / sc.sunPeriod)
	else sun = mmax(0, msin((2 * PI * fmod(S.t, sc.sol)) / sc.sol)) * sc.sunBase end
	sun *= M.sunMul
	sy.solar.align = clamp(sy.solar.align - 0.004 * h, 0.55, 1)
	sy.solar.dust = clamp(sy.solar.dust + sc.dustRate * h + (hasActive(S, "dust_storm") and 0.002 * h or 0), 0, 0.6)
	local solKw = sc.solarPeak * sun * sy.solar.align * (1 - sy.solar.dust) * (sy.solar.h / 100)
	local reaKw = sy.reactor.h > 20 and sc.reactorKw * sy.reactor.lvl * (sy.reactor.h / 100) or 0
	sy.reactor.h = clamp(sy.reactor.h - 0.03 * sy.reactor.lvl * h, 0, 100)
	local G = solKw + reaKw

	--[[ --- Oxígeno: control automático --- ]]
	local o2use = S.N * (P.O2_PER_PERSON_DAY / 24) * df.cons
	local leakO2 = M.leak * 0.25
	if sy.o2.auto then
		local need = (o2use + leakO2) / P.O2GEN_MAX
		sy.o2.lvl = clamp(need * (1 + (0.5 - pct(r.o2)) * 0.8) / mmax(0.3, sy.o2.h / 100), 0.05, 1)
	end
	sy.o2.calib = clamp(sy.o2.calib + 0.02 * h, -5, 5)

	--[[ --- Cargas eléctricas (prioridad 1 = esencial) --- ]]
	local planted = #plantsList(S)
	local labBusy = some(S.jobs, function(j) return j.kind == "analyze" or j.kind == "experiment" end)
	local jobsKw = 0
	for _, j in ipairs(S.jobs) do jobsKw = jobsKw + (j.kw or 0) end
	local lightsKw = 0
	for _, b in ipairs(S.beds) do
		lightsKw = lightsKw + (some(b.plants, function(p) return p ~= false end) and P.LIGHT_KW_PER_BED * b.light or 0)
	end
	local loads = {
		{ id = "o2", p = 1, kw = P.O2GEN_KW * sy.o2.lvl },
		{ id = "rec", p = 1, kw = sy.rec.mode == "max" and P.REC_KW_MAX or P.REC_KW_ECO },
		{ id = "therm", p = 1, kw = sc.heat },
		{ id = "press", p = 1, kw = 0.3 + 0.5 * M.leak },
		{ id = "comms", p = 2, kw = 0.8 * S.cap.comms },
		{ id = "shield", p = 2, kw = 0.2 + 0.2 * sy.shield.lvl },
		{ id = "cold", p = 3, kw = (S.pant.cold and S.pant.fresh > 0.01) and 0.1 or 0 },
		{ id = "lab", p = 3, kw = labBusy and 1.5 * S.cap.lab or 0 },
		{ id = "rover", p = 3, kw = sy.rover.batt < 100 and 1.0 or 0 },
		{ id = "isru", p = 3, kw = sy.isru.on and P.ISRU_KW or 0 },
		{ id = "jobs", p = 3, kw = jobsKw },
		{ id = "lights", p = 4, kw = lightsKw * S.cap.gh },
		{ id = "pumps", p = 4, kw = 0.3 * sy.gh.irrig * (planted > 0 and 1 or 0) },
	}
	if S.adv then
		for _, l in ipairs(loads) do
			local o = S.prioOv[l.id]
			if type(o) == "number" and o >= 2 and o <= 4 then l.p = o end
		end
	end
	if S.emergency then for _, l in ipairs(loads) do if l.p >= 3 then l.kw = 0 end end end
	local avail = G + (r.power.v > 0.01 and P.BATT_MAX_DIS or 0)
	local served, demand = 0, 0
	local lf = {}
	stableSort(loads, function(a, b) return a.p < b.p end)
	for _, l in ipairs(loads) do
		demand += l.kw
		local give = mmax(0, mmin(l.kw, avail - served))
		lf[l.id] = l.kw > 0 and give / l.kw or 1
		served += give
	end
	-- Si la batería se agotaría en este subpaso, limitar a lo realmente disponible.
	local net = G - served
	if net < 0 and r.power.v + net * h < 0 then
		local maxServe = G + r.power.v / h
		local s2 = 0
		for _, l in ipairs(loads) do
			local give = mmax(0, mmin(l.kw, maxServe - s2))
			lf[l.id] = l.kw > 0 and give / l.kw or 1
			s2 += give
		end
		served = s2
	end
	local net2 = G - served
	r.power.v += net2 > 0 and net2 * h * P.CHARGE_EFF or net2 * h
	r.power.prod = G; r.power.cons = served
	S.lf = lf
	S.pw = { gen = G, sol = solKw, rea = reaKw, demand = demand, served = served, sun = sun }
	S.st.eGen += G * h; S.st.eUsed += served * h
	if lf.o2 < 0.999 or lf.rec < 0.999 or lf.therm < 0.999 then S.st.brownH += h end
	if sy.rover.batt < 100 and (not S.ex or S.ex.rover.docked ~= false) then sy.rover.batt = clamp(sy.rover.batt + 6 * h * (lf.rover or 0), 0, 100) end

	--[[ --- Temperatura y presión --- ]]
	local tEff = clamp(lf.therm * (sy.thermal.h / 100) * M.thermMul, 0, 1)
	local Tt = 21 + (1 - tEff) * (sc.tOut - 21) * 0.3
	sy.thermal.T += (Tt - sy.thermal.T) * mmin(1, 0.12 * h)
	if M.leak > 0 then sy.press.P -= M.leak * h else sy.press.P += 1.0 * h * lf.press end
	sy.press.P = clamp(sy.press.P, 40, 101.3)

	--[[ --- Agua --- ]]
	local W = S.N * (P.WATER_PER_PERSON_DAY / 24) * df.cons
	local recEff = (sy.rec.mode == "max" and P.REC_EFF_MAX or P.REC_EFF_ECO) * lf.rec * (sy.rec.h / 100) * M.recMul
	local waterOk = r.water.v > 0.05
	local o2rate = P.O2GEN_MAX * sy.o2.lvl * lf.o2 * (sy.o2.h / 100) * (waterOk and 1 or 0)
	-- Riego automático con sensores de humedad: repone hasta el 65 % (1 % de humedad ≈ 0,012 L; goteo ×0,55)
	local irrigL = 0
	if waterOk and (lf.pumps or 0) > 0 then
		for _, b in ipairs(S.beds) do
			for _, pl in ipairs(b.plants) do
				if pl and pl.moist < 65 then
					local add = mmin(65 - pl.moist, sy.gh.irrig * 1.6 * h * lf.pumps)
					pl.moist += add
					irrigL += add * 0.012 * (sy.gh.drip and 0.55 or 1)
				end
			end
		end
	end
	local irrig = irrigL / h
	local elec = P.O2_STOICH_WATER * o2rate
	local isruL = sy.isru.on and P.ISRU_LPH * (lf.isru or 0) * (sy.isru.h / 100) or 0
	local recovered = W * recEff + irrig * 0.3 * recEff + isruL -- condensación del riego + hielo extraído
	r.water.cons = W + elec + irrig; r.water.prod = recovered
	r.water.v += (recovered - W - elec - irrig) * h
	S.st.waterUsed += (W + elec + irrig) * h; S.st.waterRec += recovered * h

	--[[ --- Oxígeno --- ]]
	r.o2.prod = o2rate; r.o2.cons = o2use + leakO2
	r.o2.v += (o2rate - o2use - leakO2) * h
	local concT = 20.9 - 0.6 * sy.o2.calib
	if r.o2.v <= 0.05 then concT -= 6 * (1 - clamp(o2rate / mmax(0.001, o2use), 0, 1)) end
	sy.o2.conc += (concT - sy.o2.conc) * mmin(1, 0.2 * h)
	sy.o2.conc = clamp(sy.o2.conc, 10, 30)

	--[[ --- Cultivos (planta por planta) --- ]]
	local agri = bonus(S, "agri") and 1.15 or 1
	local fert = 0
	for bi, b in ipairs(S.beds) do
		local light = clamp(b.light * S.cap.gh * (lf.lights == nil and 1 or lf.lights), 0, 1)
		for k = 1, #b.plants do
			local pl = b.plants[k]
			if pl then
				local c, st = CROPS[pl.sp], stageOf(pl)
				pl.light = light
				pl.moist = clamp(pl.moist - (0.6 + 0.6 * light) * h * (sy.thermal.T > 26 and 1.3 or 1), 0, 100)
				local autoN = r.nutr.v > 0.2 and 0.06 * sy.gh.irrig * (lf.pumps or 0) * h or 0 -- fertirrigación lenta
				fert += autoN * 0.01
				pl.nutr = clamp(pl.nutr - 0.2 * c.nutr * (0.5 + st * 0.25) * h + autoN, 0, 100)
				local lF = mmin(1, light / c.light)
				local wF = pl.moist < 35 and clamp((pl.moist - 10) / 25, 0, 1) or pl.moist > 75 and clamp((100 - pl.moist) / 25, 0, 1) or 1
				local nF = clamp(pl.nutr / 40, 0.15, 1)
				local tF = clamp(1 - mabs(sy.thermal.T - c.T) / 10, 0, 1)
				local prF = pl.prune > 1 and 0.8 or 1
				if pl.prog < 1 then pl.prog = clamp(pl.prog + (h / P.CROP_CYCLE_H) * lF * wF * nF * tF * agri * prF * (0.4 + 0.6 * pl.hp / 100), 0, 1) end
				pl.age += h
				if c.prune and st >= 2 then pl.prune = clamp(pl.prune + 0.012 * h * (pl.nutr > 50 and 1.4 or 1), 0, 2) end
				local dh = 0.3
				if pl.moist < 20 then dh -= 1.4 end
				if pl.moist > 85 then dh -= 0.9 end
				if lF < 0.4 then dh -= 0.35 end
				if pl.nutr < 15 then dh -= 0.6 end
				if pl.pest then dh -= 1.0 end
				if tF < 0.4 then dh -= 0.5 end
				if pl.prog >= 1 then dh -= 0.05 end
				pl.hp = clamp(pl.hp + dh * h, 0, 100)
				if pl.hp <= 0 then
					b.plants[k] = false
					log(S, "warn", "crop.dead", { bed = bi, sp = pl.sp })
					S.st.mistakes.cropDead = (S.st.mistakes.cropDead or 0) + 1
				end
			end
		end
	end
	r.nutr.v -= fert; r.nutr.cons = fert / h

	--[[ --- Alimentos --- ]]
	local fUse = S.N * (P.FOOD_PER_PERSON_DAY / 24) * df.cons * (RATION[S.pant.ration] or 1)
	r.food.cons = fUse; r.food.prod = 0
	r.food.v -= fUse * h; S.st.foodCons += fUse * h
	do -- Almacén: se come primero lo fresco; lo fresco se deteriora más sin refrigeración (modelo educativo simplificado)
		local Pn = S.pant
		Pn.fresh = mmax(0, Pn.fresh - fUse * h)
		local cf = (Pn.cold and not S.emergency) and (lf.cold == nil and 1 or lf.cold) or 0
		local spoil = mmin(Pn.fresh, r.food.v) * (0.01 - 0.0092 * cf) * h
		if spoil > 0 then Pn.fresh -= spoil; r.food.v -= spoil; S.st.spoiled += spoil end
		for _, e in ipairs(S.sampleList) do -- muestras sin almacenar en 24 h
			if e.state == "new" and e.loc ~= "hand" and e.loc ~= "rover" and S.t - e.t > 24 then e.state = "degraded" end
		end
	end
	r.waste.prod = S.N * (P.WASTE_PER_PERSON_DAY / 24); r.waste.v += r.waste.prod * h -- envases y residuos sólidos

	--[[ --- Radiación --- ]]
	local eff = shieldEff(S)
	r.rad.v = eff * 100
	local gcr = sc.gcr / 24
	local cap = sy.shield.cap
	local player = playerOf(S)
	if player.zone == "shelter" then
		if cap > 0 then cap -= 1 else player.zone = "hab" end
	end
	for _, c in ipairs(S.crew) do
		if c ~= player then
			if S.proto and cap > 0 then c.zone = "shelter"; cap -= 1 else c.zone = "hab" end
		end
	end
	local maxD = 0
	for _, c in ipairs(S.crew) do
		local e = c.zone == "shelter" and mmin(1, eff + 0.35) or c.zone == "outside" and 0.05 or eff
		c.rate = gcr * (1 - 0.3 * e) + M.spe * (1 - 0.9 * e)
		c.dose += c.rate * h
		maxD = mmax(maxD, c.dose)
	end
	S.st.maxDose = maxD

	--[[ --- Bienestar --- ]]
	local nCrit, nWarn = 0, 0
	for _, i in ipairs(S.inc) do
		if not i.res and S.t >= i.from then
			if i.sev == "crit" then nCrit += 1 elseif i.sev == "warn" then nWarn += 1 end
		end
	end
	local T, conc = sy.thermal.T, sy.o2.conc
	local q = {
		clamp(1 - mabs(T - 21) / 10, 0, 1), clamp((sy.press.P - 80) / 21, 0, 1),
		(conc >= P.O2_BAND[1] and conc <= P.O2_BAND[2]) and 1 or clamp(1 - mabs(conc - 21) / 6, 0, 1),
		clamp(pct(r.food) / 0.25, 0, 1), clamp(pct(r.water) / 0.2, 0, 1), lf.therm,
	}
	local hq = 0
	for _, x in ipairs(q) do hq = hq + x end
	hq = hq / #q
	local medic = bonus(S, "medic") and 6 or 0
	local mT = 30 + 58 * hq - nCrit * 6 - nWarn * 2 + medic + (S.pant.ration == "high" and 3 or S.pant.ration == "low" and -4 or 0)
	S.morale = clamp(S.morale + (mT - S.morale) * mmin(1, 0.04 * h), 0, 100)
	S.rest = clamp(S.rest + (28 + 66 * hq - S.rest) * mmin(1, 0.05 * h), 0, 100)
	r.well.v = 0.6 * S.morale + 0.4 * S.rest
	S.hq = hq

	--[[ --- Trabajos (construcción, análisis) --- ]]
	local eng, sci = bonus(S, "engineer") and 1.3 or 1, bonus(S, "scientist") and 1.5 or 1
	for _, j in ipairs(S.jobs) do
		local pf = (j.kind == "analyze" or j.kind == "experiment") and (lf.lab or 0) * sci or (lf.jobs or 0) * eng * df.repair
		j.h -= h * pf
	end
	local done = filter(S.jobs, function(j) return j.h <= 0 end)
	S.jobs = filter(S.jobs, function(j) return j.h > 0 end)
	for _, j in ipairs(done) do finishJob(S, j) end

	--[[ --- Ingeniero: reparación autónoma lenta --- ]]
	if bonus(S, "engineer") then
		-- Primera crítica en el orden de S.inc; si no hay, la primera (equivale al sort estable de JS).
		local cand = filter(activeInc(S), function(i) return i.fix ~= nil and S.t >= i.from and (not S.adv or DIAG_OK[i.type] == nil or truthy(i.diag)) end)
		local tgt = find(cand, function(i) return i.sev == "crit" end) or cand[1]
		if tgt then
			tgt.prog = clamp(tgt.prog + (S.adv and 1.0 or 1.6) * h * df.repair, 0, 100); tgt.bot = true
			if tgt.prog >= 100 then resolveInc(S, tgt, "engineer") end
		end
	end

	--[[ --- Ciclo de incidentes --- ]]
	for _, i in ipairs(S.inc) do
		if not i.res then
			if i["until"] ~= nil and S.t >= i["until"] then
				resolveInc(S, i, "expired")
			elseif i.fix and not i.esc and S.t - i.t0 > 36 * df.grace then
				i.esc = true
				if i.sev ~= "crit" then
					i.sev = i.sev == "info" and "warn" or "crit"
					log(S, i.sev, "esc", { id = i.id, type = i.type })
				end
			end
		end
	end
	if nCrit > 0 then S.st.critH += h end
	spawn(S, h)

	--[[ --- Eventos encadenados (modo Ingeniero) y registro histórico --- ]]
	if S.adv then chains(S) end
	if S.adv and S.t - S.hlast >= 1 then
		S.hlast = S.t
		local row = {}
		for n, x in ipairs({ pct(r.o2), pct(r.water), pct(r.power), pct(r.food), S.st.maxDose / S.limit, r.well.v / 100 }) do row[n] = jsround(clamp(x, 0, 1.5) * 1000) / 1000 end
		table.insert(S.hist, row)
		if #S.hist > 120 then table.remove(S.hist, 1) end
	end

	--[[ --- Comunicaciones --- ]]
	commsStep(S, M)

	--[[ --- Misiones --- ]]
	campStep(S, h)
	missionsStep(S, h)

	normalize(S)
	endings(S, h, M)
	derive(S)
end

--- Cadenas causa → efecto: el polvo desgasta los paneles, una tormenta solar puede dejar sin enlace y la falta de agua daña las plantas.
function chains(S)
	if S.noEv then return end
	local n = 1
	while n <= #S.inc do -- como for…of en JS: también recorre los incidentes que se añaden durante el bucle
		local i = S.inc[n]
		if not i.chain then
			if (i.type == "power_drop" or i.type == "dust_storm") and not i.res and S.t - i.from > 12 then
				i.chain = 1
				if not some(S.inc, function(x) return not x.res and x.type == "wear" end) then addInc(S, "wear", { sys = "solar", dmg = 14 }) end
			elseif i.type == "solar_storm" and i.res then
				i.chain = 1
				if rnd(S) < 0.6 and not some(S.inc, function(x) return not x.res and x.type == "comms_blackout" end) then addInc(S, "comms_blackout", { dur = 12 }) end
			elseif i.type == "water_fail" and not i.res and S.t - i.t0 > 18 then
				i.chain = 1
				if #plantsList(S) > 0 and not some(S.inc, function(x) return not x.res and x.type == "crop_fail" end) then addInc(S, "crop_fail", {}) end
			end
		end
		n += 1
	end
end
function normalize(S)
	for _, x in pairs(S.r) do x.v = clamp(fin(x.v, 0), 0, x.max) end
	local s = S.sys
	for _, x in pairs(s) do if x.h ~= nil then x.h = clamp(fin(x.h, 0), 0, 100) end end
	s.o2.lvl = clamp(fin(s.o2.lvl, 0.5), 0, 1); s.reactor.lvl = clamp(fin(s.reactor.lvl, 0.8), 0, 1)
	s.gh.lights = clamp(fin(s.gh.lights, 0.5), 0, 1); s.gh.irrig = clamp(fin(s.gh.irrig, 0.5), 0, 1)
	s.thermal.T = clamp(fin(s.thermal.T, 21), -60, 40); s.shield.lvl = clamp(jsround(s.shield.lvl), 0, 3)
	s.shield.cap = clamp(jsround(s.shield.cap), 0, 5)
	S.morale = clamp(fin(S.morale, 50), 0, 100); S.rest = clamp(fin(S.rest, 50), 0, 100)
	S.samples = mmax(0, jsround(S.samples))
end

--[[ ---------- Finales (no violentos) ---------- ]]
function endings(S, h, M)
	if S.ended then return end
	local r = S.r
	local function finish(kind, reason) S.ended = { kind = kind, reason = reason, t = S.t }; log(S, kind == "victory" and "ok" or "crit", "end." .. reason, {}) end
	if r.o2.v <= 0 and S.sys.o2.conc < 17 then return finish("abort", "o2") end
	S.z.water = r.water.v <= 0.01 and S.z.water + h or 0
	if S.z.water >= 12 then return finish("abort", "water") end
	S.z.food = r.food.v <= 0.01 and S.z.food + h or 0
	if S.z.food >= 72 then return finish("dead", "food") end
	S.z.power = (r.power.v <= 0.01 and (S.lf.o2 < 0.3 or S.lf.therm < 0.3)) and S.z.power + h or 0
	if S.z.power >= 24 then -- núcleo fuera de servicio y sin reserva → derrota
		if S.sys.reactor.h <= 20 then return finish("dead", "core") end
		return finish("abort", "power")
	end
	S.z.press = S.sys.press.P < 60 and S.z.press + h or 0
	if S.z.press >= 6 then return finish("abort", "press") end
	S.z.well = r.well.v < 10 and S.z.well + h or 0
	if S.z.well >= 24 then return finish("abort", "well") end
	if S.st.maxDose >= S.limit then return finish("dead", "dose") end
	if some(S.inc, function(i) return not i.res and i.fix ~= nil and i.sev == "crit" and S.t - i.t0 > 72 end) then return finish("abort", "inc") end
	local FC = FOCUS[S.focus] or FOCUS.moon
	local all = true
	for _, i in ipairs(FC.goals) do if S.m[i].st ~= "done" then all = false; break end end
	all = all and S.science >= FC.sciMin
	if all and not some(activeInc(S), function(i) return i.sev == "crit" and S.t >= i.from end) then finish("victory", "all") end
end

function derive(S)
	local d = S.d
	d.o2 = pct(S.r.o2); d.water = pct(S.r.water); d.power = pct(S.r.power); d.food = pct(S.r.food); d.well = S.r.well.v / 100
	d.rad = S.r.rad.v / 100; d.dose = S.st.maxDose; d.doseF = S.st.maxDose / S.limit
	d.rec = (S.sys.rec.mode == "max" and P.REC_EFF_MAX or P.REC_EFF_ECO) * (S.lf.rec == nil and 1 or S.lf.rec) * (S.sys.rec.h / 100) * ((S.mods and S.mods.recMul) or 1)
	d.net = (S.pw.gen or 0) - (S.pw.demand or 0)
	d.day = floor(S.t / 24) + 1; d.hour = fmod(S.t, 24)
end

--[[ ---------- Instalaciones: muestras, almacén, cocina, taller y residuos (modelo educativo) ---------- ]]
local SAMPLE_CATS = { "regolith", "rock", "ice" }
local SAMPLE_SLOTS = 8
--- Registra muestras ficticias de juego (no son muestras reales de NASA). La categoría real depende del identificador, sin usar el generador aleatorio.
function addSamples(S, n, origin)
	for _ = 1, n do
		local seq = S.sampleSeq
		S.sampleSeq += 1
		local cat = SAMPLE_CATS[(seq * 5 + (origin and #origin or 0)) % 3 + 1]
		table.insert(S.sampleList, { id = "MS-" .. string.format("%03d", seq), seq = seq, origin = origin or "rover", t = S.t, cat = cat, state = "new", an = "pending", ok = false, sci = 0 })
	end
	S.samples += n; S.st.samplesTot += n
end
local function sampleFresh(e) return e.state == "new" or e.state == "degraded" end
local function pantryLog(S, k, kg, w)
	local L = S.pant.log
	table.insert(L, { t = jsround(S.t * 10) / 10, k = k, kg = jsround(kg * 100) / 100, w = w or "" })
	trimFront(L, 40)
end
local function freeSlot(S)
	for i = 1, SAMPLE_SLOTS do
		local id = "A" .. i
		if not some(S.sampleList, function(e) return e.slot == id end) then return id end
	end
	return nil
end

--[[ ---------- Trabajos ---------- ]]
function finishJob(S, j)
	local sy = S.sys
	if j.kind == "shield" then sy.shield.lvl = mmin(3, sy.shield.lvl + 1); sy.shield.h = mmax(sy.shield.h, 90); log(S, "ok", "job.shield", { lvl = sy.shield.lvl }) end
	if j.kind == "shelter" then sy.shield.cap = mmin(5, sy.shield.cap + 1); log(S, "ok", "job.shelter", { cap = sy.shield.cap }) end
	if j.kind == "analyze" then
		local e = find(S.sampleList, function(x) return x.id == j.sid end)
		local sci = e and ((e.state == "degraded" and 7 or 12) + (e.ok and 3 or 0)) or 12
		if e then
			e.an = "done"; e.sci = sci; e.tDone = S.t
			if Sim.hooks.Ex then Sim.hooks.Ex.onAnalyzed(S, e) end
		end
		S.science += sci; S.pts += 15; campCnt(S, "analyze"); log(S, "ok", "job.analyze", {})
	end
	if j.kind == "cook" then S.morale = mmin(100, S.morale + j.mor); S.r.well.v = mmin(100, S.r.well.v + 2); S.st.meals += 1; log(S, "ok", "job.cook", {}) end
	if j.kind == "craft" then S.parts += 1; S.st.crafted += 1; log(S, "ok", "job.craft", {}) end
	if j.kind == "nutr" then S.r.nutr.v += 4; log(S, "ok", "job.nutr", {}) end
	if j.kind == "experiment" then S.science += 8; S.morale += 4; log(S, "ok", "job.experiment", {}) end
	if j.kind == "recycle" then S.r.mat.v += j.sorted and 8 or 5; S.st.good.recycle = (S.st.good.recycle or 0) + 1; log(S, "ok", "job.recycle", {}) end
	if j.kind == "maint" then sy[j.sys].h = mmin(100, sy[j.sys].h + 35); log(S, "ok", "job.maint", { sys = j.sys }) end
end

--[[ ---------- Decisiones con panel de consecuencias ---------- ]]
local function busy(S, kind) return some(S.jobs, function(j) return j.kind == kind end) end
local function getP(S, p)
	local b = p and S.beds[p.bed]
	if not b then return nil end
	return b.plants[p.slot] or nil
end
local DEC = {}
DEC.lights = function(S, p) S.sys.gh.lights = clamp(num(p.v), 0, 1) end
DEC.irrig = function(S, p) S.sys.gh.irrig = clamp(num(p.v), 0, 1) end
DEC.reactor = function(S, p) S.sys.reactor.lvl = clamp(num(p.v), 0, 1) end
DEC.o2lvl = function(S, p) S.sys.o2.auto = truthy(p.auto); if not truthy(p.auto) then S.sys.o2.lvl = clamp(num(p.v), 0, 1) end end
DEC.isru = function(S, p) S.sys.isru.on = truthy(p.v) end
DEC.recmode = function(S, p) S.sys.rec.mode = p.v == "max" and "max" or "eco" end
DEC.emergency = function(S, p) S.emergency = truthy(p.v) end
DEC.prio = function(S, p)
	if not S.adv or not includes(PRIO_IDS, p.id) then return "err" end
	S.prioOv[p.id] = clamp(jsround(num(p.v)), 2, 4)
end
DEC.proto = function(S, p) S.proto = truthy(p.v) end
DEC.shield = function(S)
	if S.sys.shield.lvl >= 3 or busy(S, "shield") then return "busy" end
	if S.r.mat.v < 14 then return "nomat" end
	S.r.mat.v -= 14; table.insert(S.jobs, { kind = "shield", h = 6, kw = 0.8 })
end
DEC.shelter = function(S)
	if S.sys.shield.cap >= 5 or busy(S, "shelter") then return "busy" end
	if S.r.mat.v < 8 then return "nomat" end
	S.r.mat.v -= 8; table.insert(S.jobs, { kind = "shelter", h = 4, kw = 0.5 })
end
DEC.maint = function(S, p)
	if busy(S, "maint") then return "busy" end
	local sys = truthy(p.sys) and p.sys or "reactor"
	if S.parts > 0 then S.parts -= 1; table.insert(S.jobs, { kind = "maint", h = 1.8, kw = 0.6, sys = sys, part = true }); return end -- con repuesto: más rápido y sin gastar materiales
	if S.r.mat.v < 4 then return "nomat" end
	S.r.mat.v -= 4; table.insert(S.jobs, { kind = "maint", h = 3, kw = 0.6, sys = sys })
end
DEC.craft = function(S)
	if busy(S, "craft") then return "busy" end
	if S.r.mat.v < 6 then return "nomat" end
	S.r.mat.v -= 6; table.insert(S.jobs, { kind = "craft", h = S.playerRole == "engineer" and 2 or 3, kw = 0.8 }); campCnt(S, "craft")
end
DEC.sort = function(S)
	if S.sorted then return "sorted" end
	if S.r.waste.v < 6 then return "nowaste" end
	S.sorted = true; campCnt(S, "sort"); step(S, 1)
end
DEC.cold = function(S, p) S.pant.cold = truthy(p.v) end
DEC.ration = function(S, p)
	if not RATION[p.v] then return "err" end
	S.pant.ration = p.v
end
DEC.cook = function(S, p)
	if busy(S, "cook") then return "busy" end
	if S.t - S.pant.mealT < 8 then return "mealwait" end
	local salad = p.r ~= "ration"
	local kg = salad and 1.5 or 1
	if salad and S.pant.fresh < kg then return "nofresh" end
	if not salad and S.r.food.v - S.pant.fresh < kg then return "nopacked" end
	if salad then S.pant.fresh -= kg end
	S.r.food.v -= kg; S.pant.mealT = S.t; pantryLog(S, "out", kg, salad and "salad" or "ration")
	table.insert(S.jobs, { kind = "cook", h = 2, kw = 0.6, mor = salad and 6 or 3 }); campCnt(S, "cook")
end
DEC.sstore = function(S, p)
	local e = find(S.sampleList, function(x) return x.id == p.id end)
	if not e or not sampleFresh(e) or (truthy(e.loc) and e.loc ~= "base") then return "err" end
	if not includes(SAMPLE_CATS, p.label) then return "err" end
	local sl = freeSlot(S)
	if not sl then return "noslot" end
	e.label = p.label; e.ok = p.label == e.cat; e.slot = sl; e.tStore = S.t
	if e.state == "new" then e.state = "stored" else e.state = "degraded" end
	campCnt(S, "sstore")
end
DEC.recycle = function(S)
	if busy(S, "recycle") then return "busy" end
	if S.r.waste.v < 6 then return "nowaste" end
	S.r.waste.v -= 6
	local so = S.sorted
	S.sorted = false; table.insert(S.jobs, { kind = "recycle", h = 3, kw = 0.8, sorted = so }); campCnt(S, "recycle")
end
DEC.analyze = function(S, p)
	if S.samples < 1 then return "nosample" end
	if busy(S, "analyze") then return "busy" end
	local pend = filter(S.sampleList, function(x) return x.an == "pending" and (not truthy(x.loc) or x.loc == "base") end)
	local e = (p and truthy(p.id) and find(pend, function(x) return x.id == p.id end)) or find(pend, function(x) return x.state == "stored" end) or pend[1]
	if not e then return "nosample" end
	e.an = "inlab"; S.samples -= 1; table.insert(S.jobs, { kind = "analyze", h = S.playerRole == "scientist" and 2 or 3, kw = 0, sid = e.id })
end
DEC.experiment = function(S)
	if busy(S, "experiment") then return "busy" end
	if S.r.water.v < 3 then return "nowater" end
	S.r.water.v -= 2; table.insert(S.jobs, { kind = "experiment", h = 5, kw = 0 })
end
DEC.plant = function(S, p)
	local b = S.beds[p.bed]
	if not b or b.plants[p.slot] ~= false or not CROPS[p.sp] then return "busy" end
	if (S.seeds[p.sp] or 0) < 1 then return "noseed" end
	if S.r.water.v < 1 then return "nowater" end
	if S.r.nutr.v < 0.2 then return "nonutr" end
	S.seeds[p.sp] -= 1; S.r.water.v -= 0.5; S.r.nutr.v -= 0.2; b.plants[p.slot] = newPlant(S, p.sp, 0); campCnt(S, "plant")
end
DEC.water = function(S, p)
	local pl = getP(S, p)
	if not pl then return "noplant" end
	if S.r.water.v < 0.5 then return "nowater" end
	S.r.water.v -= 0.3; pl.moist = clamp(pl.moist + 25, 0, 100); campCnt(S, "water")
end
DEC.feed = function(S, p)
	local pl = getP(S, p)
	if not pl then return "noplant" end
	local cost = S.playerRole == "agri" and 0.22 or 0.3
	if S.r.nutr.v < cost then return "nonutr" end
	S.r.nutr.v -= cost; pl.nutr = clamp(pl.nutr + 35, 0, 100); campCnt(S, "feed")
end
DEC.bedlight = function(S, p)
	local b = S.beds[p.bed]
	if not b then return "err" end
	b.light = clamp(num(p.v), 0, 1)
end
DEC.inspect = function(S, p)
	local pl = getP(S, p)
	if not pl then return "noplant" end
	pl.inspected = true
end
DEC.identify = function(S, p)
	local pl = getP(S, p)
	if not pl then return "noplant" end
	pl.inspected = true
	if pl.pest then pl.pestKnown = true end
end
DEC.prune = function(S, p)
	local pl = getP(S, p)
	if not pl then return "noplant" end
	if not (pl.prune > 0.6 or (pl.pest and pl.pestKnown) or (pl.hp < 70 and stageOf(pl) >= 2)) then return "noprune" end
	pl.prune = 0
	if pl.pestKnown then pl.pest = false; pl.pestKnown = false end
	pl.hp = clamp(pl.hp + 8, 0, 100); S.r.waste.v += 0.1
	if not some(plantsList(S), function(x) return x.p.pest end) then
		local inc = find(S.inc, function(i) return not i.res and i.type == "crop_fail" end)
		if inc then resolveInc(S, inc, "player") end
	end
end
DEC.mixnutr = function(S)
	if busy(S, "nutr") then return "busy" end
	if S.r.waste.v < 2 then return "nowaste" end
	if S.r.water.v < 3 then return "nowater" end
	S.r.waste.v -= 2; S.r.water.v -= 2; table.insert(S.jobs, { kind = "nutr", h = 2, kw = 0.8 })
end
DEC.eva = function(S)
	if S.r.o2.v < 0.5 then return "err" end
	S.r.o2.v -= 0.2; addSamples(S, 1, "eva"); S.r.mat.v += 1; S.pts += 5
end
DEC.sleep = function(S) S.rest = clamp(S.rest + 30, 0, 100); S.morale = clamp(S.morale + 4, 0, 100); step(S, 4) end
DEC.rec = function(S) S.morale = clamp(S.morale + 9, 0, 100); step(S, 2) end
local function waitH(p)
	local v = num(p.h)
	return clamp(truthy(v) and v or 1, 0.5, 24)
end
DEC.wait = function(S, p) step(S, waitH(p)) end

local function decide(S, id, p)
	local f = DEC[id]
	if not f then return { ok = false, err = "unknown" } end
	local err = f(S, p or {})
	if err then return { ok = false, err = err } end
	if id == "reactor" or id == "emergency" then campFlag(S, "power_action") end
	normalize(S); derive(S)
	S.st.good["dec_" .. id] = (S.st.good["dec_" .. id] or 0) + 1
	return { ok = true }
end
local function snapshot(S)
	return {
		o2 = S.r.o2.v, water = S.r.water.v, power = S.r.power.v, food = S.r.food.v, mat = S.r.mat.v, dose = S.st.maxDose, well = S.r.well.v, rad = S.r.rad.v,
		shelter = S.sys.shield.cap, net = (S.pw.gen or 0) - (S.pw.demand or 0),
	}
end
--- Proyección determinista a 12 h (sin eventos aleatorios) con y sin la decisión.
local function preview(S, id, p, hours)
	hours = truthy(hours) and hours or 12
	local base = deepCopy(S); base.noEv = true; base.ended = nil; base.log = {}
	local alt = deepCopy(base)
	local now = snapshot(S)
	if id == "sleep" or id == "rec" or id == "wait" then
		local res = decide(alt, id, p)
		local dur = id == "sleep" and 4 or id == "rec" and 2 or waitH(p or {})
		step(base, dur)
		return { ok = res.ok, err = res.err, now = now, a = snapshot(base), b = snapshot(alt), hours = dur }
	end
	local res = decide(alt, id, p)
	step(base, hours); step(alt, hours)
	return { ok = res.ok, err = res.err, now = now, a = snapshot(base), b = snapshot(alt), hours = hours }
end

--- Cosecha una planta madura. Devuelve { kg, sp, seeds } o nil.
local function harvest(S, bed, slot)
	local b = S.beds[bed]
	local pl = b and b.plants[slot]
	if not pl or pl.prog < 1 then return nil end
	local c = CROPS[pl.sp]
	local y = c.y * (pl.hp / 100) * (pl.prune > 1 and 0.8 or 1)
	S.pant.fresh += y; pantryLog(S, "in", y, pl.sp)
	S.r.food.v += y; S.st.foodProd += y; S.st.harvested += y; S.st.crops[pl.sp] = (S.st.crops[pl.sp] or 0) + 1
	S.seeds[pl.sp] = (S.seeds[pl.sp] or 0) + c.seeds; S.morale = clamp(S.morale + c.mor, 0, 100); S.r.waste.v += 0.15
	local m6 = S.m[6]
	if m6.st == "active" then
		m6.data.kg = (m6.data.kg or 0) + y
		m6.data.types = m6.data.types or {}
		m6.data.types[pl.sp] = 1
	end
	campCnt(S, "harvest")
	b.plants[slot] = false
	normalize(S); derive(S)
	log(S, "ok", "crop.harvest", { kg = jsround(y * 100) / 100, sp = pl.sp })
	return { kg = y, sp = pl.sp, seeds = c.seeds }
end

--[[ ---------- Minijuegos -> sistemas ---------- ]]
local function mini(S, kind, res)
	local ok = truthy(res.ok)
	local sc = clamp(fin(res.score, 0), 0, 1)
	if ok and (kind == "solar" or kind == "balance") then campFlag(S, "power_action") end
	if ok and kind == "o2" then campFlag(S, "o2_cal") end
	if truthy(res.inc) and S.playerRole == "engineer" and kind == "wiring" then res = assign(res); res.score = mmin(1, sc + 0.15) end
	local sy = S.sys
	if ok then S.pts += jsround(20 + 30 * sc) end
	local bucket = S.st[ok and "good" or "mistakes"]
	bucket["mg_" .. kind] = (bucket["mg_" .. kind] or 0) + 1
	if kind == "wiring" then
		if truthy(res.inc) then repair(S, res.inc, ok and 70 + 30 * sc or 25)
		elseif truthy(res.sys) and sy[res.sys] then sy[res.sys].h = mmin(100, sy[res.sys].h + (ok and 25 * (0.5 + sc / 2) or 5)) end
	elseif kind == "balance" then
		if ok then S.cap.gh = clamp(fin(res.gh, 1), 0.2, 1); S.cap.lab = clamp(fin(res.lab, 1), 0, 1); S.cap.comms = clamp(fin(res.comms, 1), 0.5, 1) end
	elseif kind == "o2" then
		if ok then
			sy.o2.calib = 0; sy.o2.h = mmin(100, sy.o2.h + 12)
			local d = find(S.inc, function(i) return not i.res and i.type == "sensor_drift" end)
			if d then resolveInc(S, d, "player") end
		else sy.o2.calib *= 0.6 end
	elseif kind == "solar" then
		sy.solar.align = clamp(ok and 0.85 + 0.15 * sc or mmax(sy.solar.align, 0.7), 0, 1)
		if ok then sy.solar.dust *= 0.3 end
	elseif kind == "gh" then
		for _, x in ipairs(plantsList(S)) do
			x.p.hp = mmin(100, x.p.hp + (ok and 25 * sc + 5 or 3))
			if ok then x.p.moist = clamp(x.p.moist, 40, 70) end
		end
		if ok then
			sy.gh.drip = true
			if truthy(res.inc) then repair(S, res.inc, 100) end
		end
	elseif kind == "rover" then
		local n = mmax(0, jsround(fin(res.samples, 0)))
		addSamples(S, n, "rover"); S.r.mat.v += fin(res.regolith, 0)
		sy.rover.h = clamp(sy.rover.h - fin(res.damage, 0), 10, 100); sy.rover.batt = clamp(fin(res.batt, 50), 0, 100); sy.rover.runs += 1; log(S, "ok", "rover.back", { n = n })
		local m7 = S.m[7]
		if m7.st == "active" and ok and n >= m7.data.target then finishMission(S, 7, (type(res.score) == "number" and res.score > 0.75) and 3 or 2) end
		sy.rover.hint = false
	end
	normalize(S); derive(S)
end

--[[ ---------- Comunicaciones con retraso ---------- ]]
local function send(S, kind)
	local ow = oneWay(S)
	local msg = { id = S.cm.seq, kind = kind, sent = S.t, arriveEarth = S.t + ow, reply = nil, st = "transit", snap = snapshot(S), stormSoon = some(S.inc, function(i) return i.type == "solar_storm" and not i.res end) }
	S.cm.seq += 1
	table.insert(S.cm.q, msg)
	log(S, "info", "cm.sent", { kind = kind, ow = jsround(ow * 10) / 10 })
	return msg
end
function commsStep(S, M)
	local ow = oneWay(S)
	for _, m in ipairs(S.cm.q) do
		if M.commsDown and m.st ~= "done" then
			m.arriveEarth = mmax(m.arriveEarth, S.t + 0.25)
			if m.reply ~= nil then m.reply = mmax(m.reply, S.t + 0.25) end
		elseif m.st == "transit" and S.t >= m.arriveEarth then
			m.st = "earth"; m.reply = S.t + 0.5 + ow
		elseif m.st == "earth" and S.t >= m.reply then
			m.st = "done"
			table.insert(S.cm.inbox, { id = m.id, kind = m.kind, t = S.t, sent = m.sent, snap = m.snap, stormSoon = m.stormSoon, read = false })
			if m.kind == "route" then S.sys.rover.hint = true end
			if S.m[7].st == "active" then S.m[7].data.comm = true end
			log(S, "info", "cm.recv", { kind = m.kind, rt = jsround((S.t - m.sent) * 10) / 10 })
		end
	end
	S.cm.q = filter(S.cm.q, function(m) return m.st ~= "done" end)
	if S.t >= S.cm.nextDaily and not M.commsDown then
		S.cm.nextDaily += 24
		table.insert(S.cm.inbox, { id = S.cm.seq, kind = "daily", t = S.t, sent = S.t - ow, snap = snapshot(S), read = false, n = floor(S.t / 24) })
		S.cm.seq += 1
	end
	trimFront(S.cm.inbox, 40)
	if Sim.hooks.EL then Sim.hooks.EL.step(S, M) end
end

--[[ ---------- Misiones ---------- ]]
-- S.camp.i y S.camp.xi cuentan desde 1 (en JS, desde 0): la etapa en curso es CAMP[C.i] / EXP[C.xi].
function campStart(S)
	local C = S.camp
	C.cnt = {}; C.hold = 0
	local id = CAMP[C.i] and CAMP[C.i].id
	if id == "c2" then
		local inc = find(S.inc, function(i) return not i.res and i.type == "water_fail" end) or addInc(S, "water_fail", { sev = "warn" })
		C.inc = inc.id
	end
	if id == "c3" then for _, pl in ipairs(S.beds[1].plants) do if pl then pl.prog = mmax(pl.prog, 0.86) end end end
	if id == "c4" then addSamples(S, 2, "camp") end
	if id then log(S, "info", "camp.start", { id = id }) end
end
local function campKeyDone(S, key)
	local C = S.camp
	local n = C.cnt
	if key == "rec_fixed" then return not some(S.inc, function(i) return i.id == C.inc and not i.res end) end
	if key == "plant3" then return (n.plant or 0) >= 3 end
	if key == "water1" then return (n.water or 0) >= 1 end
	if key == "feed1" then return (n.feed or 0) >= 1 end
	if key == "harvest1" then return (n.harvest or 0) >= 1 end
	if key == "analyze1" then return (n.analyze or 0) >= 1 end
	if key == "cook1" then return (n.cook or 0) >= 1 end
	if key == "sstore1" then return (n.sstore or 0) >= 1 end
	if key == "craft1" then return (n.craft or 0) >= 1 end
	if key == "sort1" then return (n.sort or 0) >= 1 end
	if key == "recycle1" then return (n.recycle or 0) >= 1 end
	return truthy(C.f[key])
end
local function keysStatus(S, keys)
	local out = {}
	for _, k in ipairs(keys) do table.insert(out, { k = k, done = campKeyDone(S, k) }) end
	return out
end
local function allKeys(S, keys)
	for _, k in ipairs(keys) do if not campKeyDone(S, k) then return false end end
	return true
end
local function campStatus(S)
	local C = S.camp
	if not C or C.basicDone then return nil end
	local D = CAMP[C.i]
	return { id = D.id, unlock = D.unlock, keys = keysStatus(S, D.keys) }
end
function expStart(S)
	local C = S.camp
	local D = EXP[C.xi]
	if not D then return end
	C.cnt = {}
	if D.id == "x3" and not some(S.sampleList, function(e) return e.an == "pending" and (e.state == "new" or e.state == "degraded") end) then addSamples(S, 1, "camp") end
	if D.id == "x4" then S.r.mat.v = mmax(S.r.mat.v, 10) end
	if D.id == "x5" then S.r.waste.v = mmax(S.r.waste.v, 8) end
	log(S, "info", "camp.exp.start", { id = D.id })
end
local function expStatus(S)
	local C = S.camp
	if not C or not C.basicDone or C.xi == nil or C.xi > #EXP then return nil end
	local D = EXP[C.xi]
	return { id = D.id, unlock = D.unlock, i = C.xi, n = #EXP, keys = keysStatus(S, D.keys) }
end
local function expStep(S)
	local C = S.camp
	local D = EXP[C.xi]
	if not D then return end
	if allKeys(S, D.keys) then
		C.done[D.id] = 1
		if D.unlock then C.unlocked[D.unlock] = 1 end
		S.pts += 60; S.morale = clamp(S.morale + 4, 0, 100)
		log(S, "ok", "camp.exp", { id = D.id, room = D.unlock })
		C.xi += 1
		if C.xi <= #EXP then expStart(S) end
	end
end
function campStep(S, h)
	local C = S.camp
	if not C then return end
	if C.basicDone then
		if C.xi ~= nil and C.xi <= #EXP then expStep(S) end
		return
	end
	local D = CAMP[C.i]
	if D.id == "c2" then
		C.hold = (S.d.rec >= 0.78 and S.d.water >= 0.3 and not some(S.inc, function(i) return i.id == C.inc and not i.res end)) and C.hold + h or 0
		if C.hold >= 6 then C.f.water_hold = 1 end
	end
	if allKeys(S, D.keys) then
		C.done[D.id] = 1; C.unlocked[D.unlock] = 1; S.pts += 80; S.morale = clamp(S.morale + 5, 0, 100)
		log(S, "ok", "camp.done", { id = D.id, room = D.unlock })
		C.i += 1
		if C.i > #CAMP then
			C.basicDone = true; C.unlocked.food = 1; C.xi = 1; expStart(S); log(S, "ok", "camp.basic", {})
		else campStart(S) end
	end
end
local function setPlayerRole(S, role)
	if not includes(ROLES, role) then return false end
	local old = find(S.crew, function(c) return c.role == S.playerRole end)
	if old then old.zone = "hab" end
	S.playerRole = role
	return true
end

local LIMIT = { [1] = 72, [2] = 72, [3] = 999, [4] = 999, [5] = 120, [6] = 336, [7] = 999 }
local function startMission(S, id)
	if S.ended then return { ok = false, err = "ended" } end
	if S.camp and not S.camp.basicDone then return { ok = false, err = "locked" } end
	-- La misión 6 (cultivo, 7 días) puede correr en paralelo con otra misión.
	if id ~= 6 then
		for i = 1, 7 do if i ~= 6 and S.m[i].st == "active" then return { ok = false, err = "busy", id = i } end end
	end
	if S.m[id].st == "active" or S.m[id].st == "done" then return { ok = false, err = "state" } end
	local m, df = S.m[id], DIFFS[S.diff]
	m.st = "active"; m.att += 1; m.t0 = S.t; m.hold = 0; m.prog = 0; m.var = floor(rnd(S) * 2); m.data = {}
	local r = S.r
	if id == 1 then
		r.o2.v = mmin(r.o2.v, r.o2.max * 0.55); r.water.v = mmin(r.water.v, r.water.max * 0.5)
		if not hasActive(S, "water_fail") then addInc(S, "water_fail", { mission = 1 }) end
	elseif id == 2 then
		r.power.v = mmin(r.power.v, r.power.max * 0.45)
		addInc(S, S.scen == "moon" and "power_drop" or "dust_storm", { mission = 2, dur = 36 })
		addInc(S, "wear", { sys = "reactor", dmg = mmax(0, S.sys.reactor.h - 35), mission = 2 })
	elseif id == 3 then
		local ev = floor(rnd(S) * 3)
		m.data.ev = ev
		local inc = addInc(S, "solar_storm", { lead = df.lead, dur = 18, mission = 3, data = { rate = ({ 2.2, 2.6, 2.4 })[ev + 1], donki = ev } })
		m.data.inc = inc.id
		local tot = 0
		for _, c in ipairs(S.crew) do tot = tot + c.dose end
		m.data.d0 = tot / S.N
	elseif id == 5 then
		S.sys.shield.lvl = mmin(S.sys.shield.lvl, 1); S.sys.shield.h = mmin(S.sys.shield.h, 70)
		S.sys.shield.cap = mmin(S.sys.shield.cap, 2); r.mat.v = mmax(r.mat.v, 30)
	elseif id == 6 then
		m.data.target = truthy(m.var) and 7 or 5; m.data.kg = 0; m.data.types = {}
	elseif id == 7 then
		m.data.target = df.samples; m.data.comm = false
		addInc(S, "comms_blackout", { mission = 7, dur = 14, sev = "warn" })
	end
	log(S, "info", "m.start", { id = id })
	return { ok = true }
end
function finishMission(S, id, stars)
	local m = S.m[id]
	if m.st ~= "active" then return end
	m.st = "done"; m.stars = mmax(m.stars or 0, clamp(stars, 1, 3)); m.tDone = S.t
	S.pts += 100 * m.stars; S.r.mat.v += 6; S.morale = clamp(S.morale + 6, 0, 100)
	table.insert(S.pendingCards, id)
	log(S, "ok", "m.done", { id = id, stars = m.stars })
	normalize(S)
end
local function failMission(S, id, why)
	local m = S.m[id]
	if m.st ~= "active" then return end
	m.st = "failed"; S.st.mistakes["m" .. id] = (S.st.mistakes["m" .. id] or 0) + 1
	log(S, "warn", "m.fail", { id = id, why = why })
end
local function abortMission(S, id) failMission(S, id, "quit") end
function missionsStep(S, h)
	local df = DIFFS[S.diff]
	for id = 1, 7 do
		local m = S.m[id]
		if m.st == "active" then
			local el = S.t - m.t0
			local quick = el < LIMIT[id] * 0.6 and not some(activeInc(S), function(i) return i.sev == "crit" and S.t >= i.from end)
			local var = truthy(m.var)
			if id == 1 then
				local ok
				if var then ok = S.d.rec >= 0.85 and S.sys.o2.conc >= 19.5 and S.sys.o2.conc <= 23.5 and S.d.water >= 0.3
				else ok = S.d.o2 >= 0.45 and S.d.water >= 0.4 and S.d.rec >= 0.78 end
				m.hold = ok and m.hold + h or 0; m.prog = clamp(m.hold / 24, 0, 1)
				if m.hold >= 24 then finishMission(S, 1, quick and 3 or 2) end
			elseif id == 2 then
				local ok = S.d.power >= 0.25 and S.lf.o2 >= 0.999 and S.lf.rec >= 0.999 and S.lf.therm >= 0.999 and S.lf.comms >= 0.999
				m.hold = (ok and el > 1) and m.hold + h or 0; m.prog = clamp(m.hold / 12, 0, 1)
				if m.hold >= 12 and S.sys.reactor.h > 40 then finishMission(S, 2, quick and 3 or 2) end
			elseif id == 3 then
				local inc = findInc(S, m.data.inc)
				if inc and not inc.res and S.t >= inc.from and m.data.at == nil then m.data.at = S.proto and 1 or 0 end -- ¿protocolo activo al llegar?
				local tot = 0
				for _, c in ipairs(S.crew) do tot = tot + c.dose end
				local used = tot / S.N - m.data.d0 -- dosis media añadida
				m.data.used = used
				if inc then
					local u = inc["until"]
					m.prog = clamp((S.t - inc.t0) / ((truthy(u) and u or S.t) - inc.t0), 0, 1)
				else m.prog = 1 end
				if not inc or inc.res then
					if used <= df.budget then finishMission(S, 3, (truthy(m.data.at) and 2 or 1) + (used <= df.budget * 0.6 and 1 or 0))
					else failMission(S, 3, "dose") end
				end
			elseif id == 5 then
				local ok
				if var then ok = S.sys.shield.lvl >= 3 and S.sys.shield.cap >= 3 else ok = S.sys.shield.lvl >= 2 and S.sys.shield.cap >= 4 end
				local ok2 = ok and S.d.power >= 0.2
				m.hold = ok2 and m.hold + h or 0
				m.prog = clamp(clamp((S.sys.shield.lvl - 1) / (var and 2 or 1), 0, 1) * 0.5 + clamp((S.sys.shield.cap - 2) / (var and 1 or 2), 0, 1) * 0.5, 0, 1) * (ok2 and 1 or 0.95)
				if m.hold >= 2 then finishMission(S, 5, quick and 3 or 2) end
			elseif id == 6 then
				local kg, types = m.data.kg or 0, count(m.data.types or {})
				m.prog = clamp(kg / m.data.target, 0, 1) * ((var and types < 2) and 0.9 or 1)
				if kg >= m.data.target and (not var or types >= 2) then finishMission(S, 6, quick and 3 or 2) end
			elseif id == 7 then
				m.prog = clamp((S.sys.rover.runs > 0 and 0.3 or 0) + (m.data.comm and 0.2 or 0), 0, 0.5)
			end
			if m.st == "active" and el > LIMIT[id] then failMission(S, id, "time") end
		end
	end
end
local function reportSite(S, siteId, score)
	local m = S.m[4]
	if m.st ~= "active" then return end
	m.data.site = siteId; m.data.score = score
	finishMission(S, 4, score >= 0.95 and 3 or score >= 0.75 and 2 or 1)
end
local function reportQuiz(S, mid, ok)
	if S.quiz[mid] ~= nil then return end
	S.quiz[mid] = ok and 1 or 0; S.st.quizTot += 1
	if ok then S.st.quizOk += 1; S.pts += 30 end
end
--- Derrota por una causa que decide la interfaz o el rover (frío, rover). Una sola vez por partida.
local function kill(S, reason)
	if S.ended then return false end
	S.ended = { kind = "dead", reason = reason, t = S.t }; log(S, "crit", "end." .. reason, {})
	return true
end
local function finishRun(S)
	if not S.ended then S.ended = { kind = "partial", reason = "player", t = S.t }; log(S, "info", "end.player", {}) end
end
local function setPlayerZone(S, z) playerOf(S).zone = z end

local function report(S)
	local done, stars = {}, 0
	for i = 1, 7 do if S.m[i].st == "done" then table.insert(done, i); stars += S.m[i].stars end end
	local sysOk = 0
	for _, k in ipairs({ "reactor", "solar", "o2", "rec", "thermal", "press", "comms", "shield" }) do if S.sys[k].h >= 50 then sysOk += 1 end end
	return {
		hours = S.t, days = S.t / 24, done = done, stars = stars,
		incTot = S.st.incTot, incRes = S.st.incRes, waterUsed = S.st.waterUsed, waterRec = S.st.waterRec,
		eGen = S.st.eGen, eUsed = S.st.eUsed, foodProd = S.st.foodProd, foodCons = S.st.foodCons,
		dose = S.st.maxDose, limit = S.limit, shield = S.sys.shield.lvl, cap = S.sys.shield.cap, well = S.r.well.v, morale = S.morale,
		brownH = S.st.brownH, critH = S.st.critH, quizOk = S.st.quizOk, quizTot = S.st.quizTot, mistakes = S.st.mistakes, good = S.st.good,
		pts = S.pts, ended = S.ended, science = S.science, samples = S.st.samplesTot, sysOk = sysOk,
	}
end

Sim.log = log; Sim.campCnt = campCnt; Sim.EXP = EXP; Sim.expStatus = expStatus; Sim.SAMPLE_CATS = SAMPLE_CATS; Sim.SAMPLE_SLOTS = SAMPLE_SLOTS
Sim.RATION = RATION; Sim.addSamples = addSamples; Sim.DIAG_OK = DIAG_OK; Sim.PRIO_IDS = PRIO_IDS; Sim.diagnose = diagnose; Sim.CAMP = CAMP
Sim.SLOTS = SLOTS; Sim.stageOf = stageOf; Sim.migrate = migrate; Sim.campFlag = campFlag; Sim.campStatus = campStatus; Sim.setPlayerRole = setPlayerRole
Sim.plantsList = plantsList; Sim.P = P; Sim.SC = SC; Sim.DIFFS = DIFFS; Sim.CROPS = CROPS; Sim.EV = EV; Sim.ROLES = ROLES; Sim.LIMIT = LIMIT
Sim.create = create; Sim.step = step; Sim.decide = decide; Sim.preview = preview; Sim.harvest = harvest; Sim.mini = mini; Sim.repair = repair
Sim.send = send; Sim.oneWay = oneWay; Sim.startMission = startMission; Sim.abortMission = abortMission; Sim.finishMission = finishMission
Sim.reportSite = reportSite; Sim.reportQuiz = reportQuiz; Sim.finishRun = finishRun; Sim.kill = kill; Sim.FOCUS = FOCUS; Sim.setPlayerZone = setPlayerZone
Sim.report = report; Sim.status = status; Sim.pct = pct; Sim.shieldEff = shieldEff; Sim.addInc = addInc; Sim.activeInc = activeInc; Sim.clamp = clamp
-- Utilidades de equivalencia con JS (las usan SelfTest y los demás módulos portados).
Sim.js = { truthy = truthy, jsround = jsround, fin = fin, isFinite = isFinite, num = num }

return Sim
