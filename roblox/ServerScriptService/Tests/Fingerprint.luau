--[[
	Huella del estado final de una partida y su resumen (digest). Gemelo de roblox/tests/fingerprint.js:
	los dos lados calculan los mismos campos y la misma codificación canónica, así que el digest coincide
	solo si las dos partidas llegan exactamente (bit a bit) al mismo estado.
	Codificación: nil "n" · booleano "t"/"f" · número "d" + sus 8 bytes IEEE-754 en hex (−0 cuenta como 0)
	· texto "s<len>:<texto>" · lista "[...]" · tabla con claves "{k<clave><valor>...}" ordenada por clave.
	Una tabla vacía se codifica como lista vacía en los dos lados.
]]
local Fingerprint = {}

function Fingerprint.of(S)
	local st, sy = S.st, S.sys
	local f = {
		t = S.t, rs = S.rs, incSeq = S.incSeq, logN = S.logN or 0, cmSeq = S.cm.seq, sampleSeq = S.sampleSeq,
		morale = S.morale, rest = S.rest, science = S.science, pts = S.pts, samples = S.samples, parts = S.parts,
		maxDose = st.maxDose, eGen = st.eGen, eUsed = st.eUsed, waterUsed = st.waterUsed, waterRec = st.waterRec,
		foodProd = st.foodProd, foodCons = st.foodCons, harvested = st.harvested, spoiled = st.spoiled,
		brownH = st.brownH, critH = st.critH, incTot = st.incTot, incRes = st.incRes,
		o2conc = sy.o2.conc, thermT = sy.thermal.T, pressP = sy.press.P, solarDust = sy.solar.dust,
		shieldLvl = sy.shield.lvl, shieldCap = sy.shield.cap, lightMin = S.lightMin,
	}
	for _, k in ipairs({ "o2", "water", "power", "food", "nutr", "waste", "mat", "rad", "well" }) do f["r_" .. k] = S.r[k].v end
	for _, k in ipairs({ "reactor", "solar", "o2", "rec", "thermal", "press", "comms", "shield", "lab", "isru", "rover" }) do f["h_" .. k] = sy[k].h end
	f.dose = {}
	for i, c in ipairs(S.crew) do f.dose[i] = c.dose end
	f.m = {}
	for i = 1, 7 do f.m[i] = S.m[i].st .. ":" .. tostring(S.m[i].stars) .. ":" .. tostring(S.m[i].att) end
	f.inc = {}
	for n, i in ipairs(S.inc) do f.inc[n] = tostring(i.id) .. ":" .. i.type .. ":" .. (i.res and "1" or "0") .. ":" .. i.sev end
	f.plants = {}
	for bi, b in ipairs(S.beds) do
		for k, p in ipairs(b.plants) do
			if p then table.insert(f.plants, { bi, k, p.sp, p.prog, p.hp, p.moist, p.nutr }) end
		end
	end
	f.lastLog = {}
	for n = math.max(1, #S.log - 4), #S.log do
		local e = S.log[n]
		table.insert(f.lastLog, { e.n, e.t, e.k })
	end
	return f
end

local function isList(t)
	local n = #t
	if n == 0 then return next(t) == nil end
	local c = 0
	for _ in pairs(t) do c += 1 end
	return c == n
end
local function hex(x)
	if x == 0 then x = 0 end -- −0 → 0
	local b = string.pack(">d", x)
	return (b:gsub(".", function(ch) return string.format("%02x", string.byte(ch)) end))
end
function Fingerprint.canon(v)
	local t = type(v)
	if v == nil then return "n" end
	if t == "boolean" then return v and "t" or "f" end
	if t == "number" then return "d" .. hex(v) end
	if t == "string" then return "s" .. #v .. ":" .. v end
	if t == "table" then
		local parts = {}
		if isList(v) then
			for i = 1, #v do parts[i] = Fingerprint.canon(v[i]) end
			return "[" .. table.concat(parts) .. "]"
		end
		local keys = {}
		for k in pairs(v) do table.insert(keys, tostring(k)) end
		table.sort(keys)
		for _, k in ipairs(keys) do
			local x = v[k]
			if x == nil then x = v[tonumber(k)] end
			table.insert(parts, "k" .. Fingerprint.canon(k) .. Fingerprint.canon(x))
		end
		return "{" .. table.concat(parts) .. "}"
	end
	error("tipo no admitido en la huella: " .. t)
end
-- FNV-1a de 32 bits (sin perder precisión al multiplicar).
local function imul(a, b)
	local al, ah = a % 65536, math.floor(a / 65536)
	local bl, bh = b % 65536, math.floor(b / 65536)
	return (al * bl + ((ah * bl + al * bh) % 65536) * 65536) % 4294967296
end
function Fingerprint.fnv(s)
	local h = 2166136261
	for i = 1, #s do h = imul(bit32.bxor(h, string.byte(s, i)), 16777619) end
	return string.format("%08x", h)
end
function Fingerprint.digest(v) return Fingerprint.fnv(Fingerprint.canon(v)) end

-- JSON con números de 17 cifras (ida y vuelta exacta) para inspeccionar una partida que no coincida.
function Fingerprint.json(v)
	local t = type(v)
	if v == nil then return "null" end
	if t == "boolean" then return v and "true" or "false" end
	if t == "number" then return string.format("%.17g", v) end
	if t == "string" then return '"' .. v:gsub('[%c"\\]', function(c) return string.format("\\u%04x", string.byte(c)) end) .. '"' end
	local parts = {}
	if isList(v) then
		for i = 1, #v do parts[i] = Fingerprint.json(v[i]) end
		return "[" .. table.concat(parts, ",") .. "]"
	end
	local keys = {}
	for k in pairs(v) do table.insert(keys, tostring(k)) end
	table.sort(keys)
	for _, k in ipairs(keys) do
		local x = v[k]
		if x == nil then x = v[tonumber(k)] end
		table.insert(parts, Fingerprint.json(k) .. ":" .. Fingerprint.json(x))
	end
	return "{" .. table.concat(parts, ",") .. "}"
end

return Fingerprint
