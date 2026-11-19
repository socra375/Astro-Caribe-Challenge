--[[
	SELFTEST — port de src/03b_selftest.js: 100+ simulaciones automáticas sobre el motor.
	Misma política `smart`, mismos invariantes y mismas semillas que tests/run-selftest.js.
	Único añadido: `summarize(out)`, que es el resumen de `run` separado para poder ejecutar las partidas
	por tandas (con task.wait entre ellas) y resumirlas al final.
]]
local Sim = require(script.Parent.Parent.Sim)
local truthy = Sim.js.truthy
local isFinite = Sim.js.isFinite

local SelfTest = {}

local function scanNumbers(o, path, errs)
	if type(o) == "number" then
		if not isFinite(o) then table.insert(errs, "NaN/Inf en " .. path) end
		return
	end
	if type(o) == "table" then
		for k, v in pairs(o) do scanNumbers(v, path .. "." .. tostring(k), errs) end
	end
end
local function invariants(S, errs)
	for k, r in pairs(S.r) do
		if r.v < -1e-9 or r.v > r.max + 1e-9 then table.insert(errs, "recurso fuera de rango " .. k .. "=" .. r.v) end
	end
	for k, s in pairs(S.sys) do
		local h = s.h
		if h ~= nil and (h < 0 or h > 100) then table.insert(errs, "salud fuera de rango " .. k) end
	end
	if S.sys.o2.conc < 10 or S.sys.o2.conc > 30 then table.insert(errs, "conc O2 fuera de rango") end
	if S.samples < 0 then table.insert(errs, "muestras negativas") end
	for _, c in ipairs(S.crew) do if c.dose < 0 then table.insert(errs, "dosis negativa") end end
	for i, b in ipairs(S.beds) do
		for _, p in ipairs(b.plants) do
			if p and (p.prog < 0 or p.prog > 1 or p.hp < 0 or p.hp > 100 or p.moist < 0 or p.moist > 100 or p.nutr < 0 or p.nutr > 100) then
				table.insert(errs, "planta en cama " .. (i - 1) .. " inválida")
			end
		end
	end
	for _, v in pairs(S.seeds) do if v < 0 then table.insert(errs, "semillas negativas") end end
	if S.camp and S.camp.basicDone then
		local n = 0
		for _ in pairs(S.camp.unlocked) do n += 1 end
		if n < 7 then table.insert(errs, "campaña terminada sin todas las salas") end
	end
	if S.morale < 0 or S.morale > 100 then table.insert(errs, "moral fuera de rango") end
end
local function garden(S)
	local pref = { "romaine", "radish", "mizuna", "chili", "zinnia" }
	for bi, b in ipairs(S.beds) do
		for k = 1, #b.plants do
			local p = b.plants[k]
			if p and p.prog >= 1 then
				Sim.harvest(S, bi, k)
			elseif not p then
				local sp
				for _, x in ipairs(pref) do
					if S.seeds[x] > 0 and x ~= "zinnia" then sp = x; break end
				end
				if sp then Sim.decide(S, "plant", { bed = bi, slot = k, sp = sp }) end
			else
				if p.moist < 35 then Sim.decide(S, "water", { bed = bi, slot = k }) end
				if p.nutr < 30 then Sim.decide(S, "feed", { bed = bi, slot = k }) end
				if p.pest then Sim.decide(S, "identify", { bed = bi, slot = k }); Sim.decide(S, "prune", { bed = bi, slot = k }) end
				if p.prune > 0.8 then Sim.decide(S, "prune", { bed = bi, slot = k }) end
			end
		end
	end
	if S.r.nutr.v < 6 then Sim.decide(S, "mixnutr", {}) end
end
local function smart(S, h, mem)
	garden(S)
	if S.camp and not S.camp.basicDone then
		for _, k in ipairs({ "talk_bridge", "cmd_resources", "talk_life", "med_open", "talk_reactor", "talk_water", "talk_gh", "talk_lab", "spec_open", "log_open" }) do Sim.campFlag(S, k) end
		if not truthy(mem.reac) then mem.reac = 1; Sim.decide(S, "reactor", { v = 0.9 }) end
		local st = Sim.campStatus(S)
		if st and st.id == "c2" and not truthy(mem.o2c) then mem.o2c = 1; Sim.mini(S, "o2", { ok = true, score = 0.8 }) end
		if S.samples > 0 then Sim.decide(S, "analyze", {}) end
		if st and st.id == "c3" and not truthy(mem.fed) then
			local x = Sim.plantsList(S)[1]
			if x then mem.fed = 1; Sim.decide(S, "feed", { bed = x.bi, slot = x.k }); Sim.decide(S, "water", { bed = x.bi, slot = x.k }) end
		end
	end
	local order = { 1, 2, 5, 3, 4, 7 }
	if S.camp and not S.camp.basicDone then
		-- familiarización en curso
	elseif S.m[6].st ~= "active" and S.m[6].st ~= "done" then
		Sim.startMission(S, 6)
	end
	local act
	for _, i in ipairs(order) do if S.m[i].st == "active" then act = i; break end end
	if not act then
		local nxt
		for _, i in ipairs(order) do if S.m[i].st ~= "done" then nxt = i; break end end
		if nxt then Sim.startMission(S, nxt) end
	end
	if S.m[4].st == "active" then Sim.reportSite(S, "x", 1) end
	if S.m[7].st == "active" then
		if not truthy(mem.route) then Sim.send(S, "route"); mem.route = true end
		Sim.mini(S, "rover", { ok = true, score = 0.8, samples = S.m[7].data.target, regolith = 8, damage = 5, batt = 40 })
	end
	if S.m[1].st == "active" and truthy(S.m[1].var) then Sim.decide(S, "recmode", { v = "max" }) end
	-- `mem.rep || -99` y `mem.sol || -99`: en JS un 0 (guardado en t = 0) vale como "sin valor".
	if S.t - (truthy(mem.rep) and mem.rep or -99) > 3 then
		local inc
		for _, i in ipairs(Sim.activeInc(S)) do
			if i.fix and S.t >= i.from then inc = i; break end
		end
		if inc and S.adv and Sim.DIAG_OK[inc.type] ~= nil and not inc.diag then Sim.diagnose(S, inc.id, Sim.DIAG_OK[inc.type]) end
		if inc then
			mem.rep = S.t
			Sim.mini(S, inc.fix == "o2" and "o2" or inc.fix == "gh" and "gh" or "wiring", { ok = true, score = 0.8, inc = inc.id })
		end
	end
	if S.m[5].st == "active" or S.sys.shield.cap < S.N then Sim.decide(S, "shield", {}); Sim.decide(S, "shelter", {}) end
	local storm = false
	for _, i in ipairs(S.inc) do if i.type == "solar_storm" and not i.res then storm = true; break end end
	if storm ~= S.proto then Sim.decide(S, "proto", { v = storm }) end
	Sim.setPlayerZone(S, storm and "shelter" or "hab")

	if S.d.power < 0.3 and not S.emergency then Sim.decide(S, "emergency", { v = true }) end
	if S.d.power > 0.6 and S.emergency then Sim.decide(S, "emergency", { v = false }) end
	if math.abs(S.sys.o2.calib) > 1.5 then Sim.mini(S, "o2", { ok = true, score = 0.8 }) end
	if S.t - (truthy(mem.sol) and mem.sol or -99) > 30 then mem.sol = S.t; Sim.mini(S, "solar", { ok = true, score = 0.8 }) end
	if S.r.waste.v >= 6 and S.r.mat.v < 60 then Sim.decide(S, "recycle", {}) end
	if S.m[2].st == "active" then Sim.decide(S, "reactor", { v = 1 }) end
	if S.sys.reactor.h < 50 then
		local maint = false
		for _, j in ipairs(S.jobs) do if j.kind == "maint" then maint = true; break end end
		if not maint then Sim.decide(S, "maint", { sys = "reactor" }) end
	end
	for i = 1, 7 do if S.m[i].st == "done" then Sim.reportQuiz(S, i, true) end end
end

function SelfTest.runOne(seed, policy, opts)
	opts = opts or {}
	local scen = opts.scen or (seed % 2 ~= 0 and "mars" or "moon")
	local mode = opts.mode or (math.floor(seed / 2) % 2 ~= 0 and "adv" or "junior")
	local diff = mode == "junior" and "explorer" or (seed % 3 == 2 and "commander" or "engineer")
	local S = Sim.create({ scen = scen, diff = diff, mode = mode, seed = 1000 + seed * 7919 })
	local errs, mem = {}, {}
	local maxH = opts.maxH or 24 * 30
	local consecutive, maxConsec = 0, 0
	while not S.ended and S.t < maxH do
		if policy == "smart" then smart(S, 1, mem) end
		Sim.step(S, 1)
		local after = #Sim.activeInc(S)
		consecutive = after >= 2 and consecutive + 1 or 0
		maxConsec = math.max(maxConsec, consecutive)
		invariants(S, errs)
		if #errs > 5 then break end
	end
	scanNumbers(S, "S", errs)
	-- Coherencia de finales
	if S.ended and S.ended.kind == "victory" then
		for i = 1, 7 do if S.m[i].st ~= "done" then table.insert(errs, "victoria sin misión " .. i) end end
	end
	if S.ended and S.ended.reason == "dose" and S.st.maxDose < S.limit then table.insert(errs, "final por dosis incoherente") end
	if S.ended and S.ended.reason == "o2" and S.r.o2.v > 0 then table.insert(errs, "final por O2 incoherente") end
	-- Recuperación: tras resolver incidentes, ninguno de los resueltos debe seguir afectando
	local resolved, done = 0, 0
	for _, i in ipairs(S.inc) do if i.res then resolved += 1 end end
	for i = 1, 7 do if S.m[i].st == "done" then done += 1 end end
	return {
		seed = seed, scen = scen, diff = diff, mode = mode, policy = policy, ended = S.ended, hours = Sim.js.jsround(S.t), errs = errs, done = done,
		incidents = #S.inc, resolved = resolved, maxConsec = maxConsec,
	}, S
end

function SelfTest.summarize(out)
	local fails, smartRuns = {}, {}
	for _, r in ipairs(out) do
		if #r.errs > 0 then table.insert(fails, r) end
		if r.policy == "smart" then table.insert(smartRuns, r) end
	end
	local function n(list, f) local c = 0 for _, r in ipairs(list) do if f(r) then c += 1 end end return c end
	local endReasons, totalIncidents, maxC = {}, 0, -math.huge
	for _, r in ipairs(out) do
		local k = r.policy .. ":" .. (r.ended and r.ended.reason or "none")
		endReasons[k] = (endReasons[k] or 0) + 1
		totalIncidents += r.incidents
		maxC = math.max(maxC, r.maxConsec)
	end
	local byMode = {}
	for _, m in ipairs({ "junior", "adv" }) do
		local rs = {}
		for _, r in ipairs(smartRuns) do if r.mode == m then table.insert(rs, r) end end
		byMode[m] = { runs = #rs, victories = n(rs, function(r) return r.ended ~= nil and r.ended.kind == "victory" end) }
	end
	return {
		runs = #out, errors = #fails,
		smartVictory = n(smartRuns, function(r) return r.ended ~= nil and r.ended.kind == "victory" end), smartRuns = #smartRuns,
		passiveAbort = n(out, function(r) return r.policy == "passive" and r.ended ~= nil and r.ended.kind == "abort" end),
		passiveRuns = n(out, function(r) return r.policy == "passive" end),
		endReasons = endReasons, byMode = byMode, totalIncidents = totalIncidents, maxConsecutiveIncidentsH = maxC,
	}, fails
end

function SelfTest.run(n, opts)
	n = n or 100
	opts = opts or {}
	local out = {}
	for i = 0, n - 1 do table.insert(out, (SelfTest.runOne(i, i % 4 == 3 and "passive" or "smart", opts))) end
	local summary, fails = SelfTest.summarize(out)
	return { summary = summary, fails = fails, out = out }
end

return SelfTest
