--[[
	STATION — estado de la estación por pisos (port de src/03g_station.js; motor puro, sin dibujo):
	los dos elevadores como máquinas de estados con puertas, movimiento y averías. El elevador de tripulación
	une los pisos 1-3; el del rover es independiente y une la zona exterior (0) con el garaje (2) y solo se
	mueve si el vehículo está sobre la plataforma. Todo es serializable y forma parte del estado guardado (S.station).
	Los pisos conservan sus números de JS (0 = exterior, 1-3, 4 = nivel G, 5 = nivel 3A); las coordenadas
	{x, y} se leen como [1] y [2]. Las coordenadas de PLAT y GDOCK son las del mundo 2D original y se
	recalcularán cuando exista el mundo 3D (fase 2 en adelante).
]]
local Station = {}

local function T(es, en) return { es = es, en = en } end
local FLOORS = { 1, 2, 3 }
--- Garaje del rover: nivel G (suelo 4 del mundo). Dock donde aparca el rover (coordenadas del garaje).
local GARAGE, CATWALK, GDOCK = 4, 5, { 96, 74 }
local FLOOR_T = { [4] = T("Nivel G · Garaje", "Level G · Garage"), [5] = T("Nivel 3A · Pasarela del núcleo", "Level 3A · Core catwalk"), [0] = T("Exterior", "Outside"), [1] = T("Piso 1 · Operaciones", "Floor 1 · Operations"), [2] = T("Piso 2 · Exploración", "Floor 2 · Exploration"), [3] = T("Piso 3 · Energía", "Floor 3 · Energy") }
local KINDS = {
	crew = { stops = { 1, 2, 3 }, at = 1, name = T("Elevador de tripulación", "Crew elevator"), secPerFloor = 2.2 },
	rover = { stops = { 0, 2 }, at = 0, name = T("Elevador del rover", "Rover elevator"), secPerFloor = 2.6 },
}
local KIND_ORDER = { "crew", "rover" } -- orden de Object.keys(KINDS) en JS
local DOOR_S, STAIRS_S = 0.9, 7 -- segundos de puertas y de la alternativa por escalera de emergencia (por piso)
local WHY = {
	broken = T("El elevador está averiado: usa la escalera de emergencia o repáralo.", "The elevator is out of service: use the emergency stairs or repair it."),
	busy = T("El elevador se está moviendo.", "The elevator is moving."),
	floor = T("Ese piso no existe para este elevador.", "That floor does not exist for this elevator."),
	rover = T("El rover debe estar completamente sobre la plataforma.", "The rover must be fully on the platform."),
	notrover = T("El rover no puede usar el elevador de tripulación.", "The rover cannot use the crew elevator."),
	closed = T("Las puertas no están abiertas.", "The doors are not open."),
	full = T("Plataforma ocupada.", "Platform occupied."),
	align = T("Coloca el rover en el centro de la plataforma, alineado y parado, y sin nadie dentro.", "Place the rover in the middle of the platform, aligned and stopped, with nobody inside."),
	cap = T("El elevador de tripulación no admite el rover.", "The crew elevator does not take the rover."),
}
--- Plataforma del rover (coordenadas del mundo exterior): el rover aparca en su centro.
local PLAT = { x = 70.5, y = 86.4, w = 7, h = 6.4, c = { 74, 89.6 }, panel = { 74, 93.4 } }

local function includes(t, v) for _, x in ipairs(t) do if x == v then return true end end return false end
-- Veracidad de JS (0, "" y NaN también son falsos) para los argumentos que llegan de fuera.
local function truthy(v) return v ~= nil and v ~= false and v ~= 0 and v ~= "" and v == v end
local function mk(kind) return { at = KINDS[kind].at, to = KINDS[kind].at, st = "idle", t = 0, p = 0, occ = {}, broken = false, trips = 0 } end
local function fresh() return { v = 1, elev = { crew = mk("crew"), rover = mk("rover") }, roverAt = "surface", core = { authUntil = -1, checks = 0 }, log = {} } end
--- Partidas anteriores: la estación se crea con los elevadores en reposo.
local function ensure(S)
	if S.station and S.station.v == 1 then
		local s = S.station
		for _, k in ipairs(KIND_ORDER) do if not s.elev[k] then s.elev[k] = mk(k) end end
		if not s.core then s.core = { authUntil = -1, checks = 0 } end
		return s
	end
	S.station = fresh()
	return S.station
end
local function E(S, kind) return ensure(S).elev[kind] end
--- Apertura de puertas 0..1 (para animar).
local function door(S, kind)
	local e = E(S, kind)
	if e.st == "idle" then return 1 end
	if e.st == "moving" then return 0 end
	local u = math.min(1, e.t / DOOR_S)
	return e.st == "closing" and 1 - u or u
end
--- Piso intermedio (decimal) para animar el desplazamiento.
local function level(S, kind)
	local e = E(S, kind)
	return e.st == "moving" and e.at + (e.to - e.at) * e.p or e.at
end
local function travelS(kind, a, b) return math.abs(b - a) * KINDS[kind].secPerFloor end
--- Pide el elevador. ctx.roverOn: el rover está sobre la plataforma (obligatorio para el elevador del rover).
local function call(S, kind, to, ctx)
	local e, K = E(S, kind), KINDS[kind]
	ctx = ctx or {}
	if not includes(K.stops, to) then return { ok = false, why = "floor" } end
	if e.broken then return { ok = false, why = "broken" } end
	if e.st ~= "idle" then return { ok = false, why = "busy" } end
	if e.at == to then return { ok = true, same = true } end
	if kind == "rover" and not truthy(ctx.roverOn) then return { ok = false, why = "rover" } end
	e.to = to; e.st = "closing"; e.t = 0; e.p = 0
	return { ok = true, s = DOOR_S * 2 + travelS(kind, e.at, to) }
end
--- Sube a la plataforma (solo con las puertas abiertas y en reposo).
local function board(S, kind, who)
	local e = E(S, kind)
	if kind == "crew" and who == "rover" then return { ok = false, why = "cap" } end
	if e.broken then return { ok = false, why = "broken" } end
	if e.st ~= "idle" then return { ok = false, why = "closed" } end
	if kind == "rover" and who == "rover" and includes(e.occ, "rover") then return { ok = false, why = "full" } end
	if not includes(e.occ, who) then table.insert(e.occ, who) end
	return { ok = true }
end
local function leave(S, kind, who)
	local e = E(S, kind)
	if e.st ~= "idle" then return { ok = false, why = "closed" } end
	local occ = {}
	for _, q in ipairs(e.occ) do if q ~= who then table.insert(occ, q) end end
	e.occ = occ
	return { ok = true }
end
--- Avanza el tiempo real (segundos). Devuelve true si el elevador llegó en este paso.
local function step(S, dt)
	local arrived = false
	for _, kind in ipairs(KIND_ORDER) do
		local e = E(S, kind)
		if kind == "rover" and e.st == "idle" and S.station.roverAt == "garage" and S.sys and S.sys.rover then S.sys.rover.batt = math.min(100, S.sys.rover.batt + dt * 0.9) end -- se carga en el dock
		if e.st ~= "idle" then
			e.t += dt
			if e.st == "closing" and e.t >= DOOR_S then
				e.st = "moving"; e.t = 0; e.p = 0
			elseif e.st == "moving" then
				local dur = math.max(0.01, travelS(kind, e.at, e.to))
				e.p = math.min(1, e.t / dur)
				if e.p >= 1 then
					e.at = e.to; e.st = "opening"; e.t = 0; e.trips += 1
					if kind == "rover" then
						S.station.roverAt = e.at == 2 and "garage" or "surface"
						if S.ex then
							local R0, c0 = S.ex.rover, e.at == 2 and GDOCK or PLAT.c
							R0.x = c0[1]; R0.y = c0[2]; R0.a = 0; R0.v = 0
						end
					end
				end
			elseif e.st == "opening" and e.t >= DOOR_S then
				e.st = "idle"; e.t = 0; arrived = true
			end
		end
	end
	return arrived
end
--- Avería y reparación (la avería no deja a nadie atrapado: el elevador termina el viaje que ya empezó).
local function setBroken(S, kind, on) E(S, kind).broken = truthy(on) end
--- Alternativa cuando el elevador de tripulación no funciona: escalera de emergencia, más lenta. Nunca bloquea la campaña.
local function stairs(S, from, to)
	if not includes(FLOORS, from) or not includes(FLOORS, to) then return { ok = false, why = "floor" } end
	return { ok = true, s = math.abs(to - from) * STAIRS_S }
end
--- ¿Se ve el rover en la superficie? No si está guardado en el garaje ni mientras la plataforma baja con él.
local function roverVisible(S)
	local st = ensure(S)
	return st.roverAt ~= "garage" and st.elev.rover.st ~= "moving"
end
local function roverStored(S) return ensure(S).roverAt == "garage" end
--- ¿Está el rover aparcado en el dock del garaje (plataforma abajo y quieta)?
local function roverInGarage(S)
	local st = ensure(S)
	return st.roverAt == "garage" and st.elev.rover.st ~= "moving"
end
--- ¿Está el rover bien colocado sobre la plataforma? (centrado, alineado, quieto y sin conductor)
local function roverOnPlatform(R)
	local dx, dy = R.x - PLAT.c[1], R.y - PLAT.c[2]
	local d = math.sqrt(dx * dx + dy * dy)
	local TAU = math.pi * 2
	-- `%` de JS es math.fmod (resto con el signo del dividendo).
	local ang = math.abs(math.fmod(math.fmod(R.a + math.pi, TAU) + TAU, TAU) - math.pi)
	return d < 1.6 and ang < 0.5 and math.abs(R.v) < 0.3 and not truthy(R.occ)
end
--- Seguridad del núcleo energético: restringido (solo para el jugador) con una avería crítica en el reactor o una ráfaga de radiación, salvo que se haya aplicado el protocolo.
local CORE_WHY = { incident = T("Hay una avería crítica en el reactor.", "There is a critical fault in the reactor."), radiation = T("Hay una ráfaga de radiación.", "There is a radiation burst."), ppe = T("Hace falta el traje de protección puesto (vestuario de la bahía, piso 2).", "The protective suit is required (bay locker, floor 2).") }
local function coreStatus(S)
	local reasons, st = {}, ensure(S)
	for _, i in ipairs(S.inc or {}) do
		if not i.res and S.t >= i.from and i.room == "reactor" and i.sev == "crit" then table.insert(reasons, "incident"); break end
	end
	if S.mods and S.mods.spe > 0 then table.insert(reasons, "radiation") end
	local auth = st.core.authUntil > S.t
	return { reasons = reasons, auth = auth, restricted = #reasons > 0 and not auth, left = math.max(0, st.core.authUntil - S.t) }
end
--- Protocolo de seguridad: con el traje puesto, autoriza la entrada durante 20 h simuladas (unos 50 s).
local function authorizeCore(S, suitOn)
	if not truthy(suitOn) then return { ok = false, why = "ppe" } end
	local st = ensure(S)
	st.core.authUntil = S.t + 20; st.core.checks += 1
	return { ok = true }
end
--- ¿Está la cabina del elevador de tripulación en el piso f con las puertas abiertas (o abriéndose)?
local function cabinHere(S, f)
	local e = ensure(S).elev.crew
	return e.at == f and (e.st == "idle" or e.st == "opening")
end
local function floorName(f, lang)
	local t = FLOOR_T[f]
	if t then return t[lang == "en" and "en" or "es"] end
	return tostring(f)
end

Station.cabinHere = cabinHere; Station.CORE_WHY = CORE_WHY; Station.coreStatus = coreStatus; Station.authorizeCore = authorizeCore
Station.PLAT = PLAT; Station.GARAGE = GARAGE; Station.CATWALK = CATWALK; Station.GDOCK = GDOCK; Station.roverVisible = roverVisible
Station.roverStored = roverStored; Station.roverInGarage = roverInGarage; Station.roverOnPlatform = roverOnPlatform; Station.FLOORS = FLOORS
Station.FLOOR_T = FLOOR_T; Station.KINDS = KINDS; Station.WHY = WHY; Station.DOOR_S = DOOR_S; Station.STAIRS_S = STAIRS_S; Station.fresh = fresh
Station.ensure = ensure; Station.call = call; Station.board = board; Station.leave = leave; Station.step = step; Station.door = door
Station.level = level; Station.setBroken = setBroken; Station.stairs = stairs; Station.travelS = travelS; Station.floorName = floorName
return Station
