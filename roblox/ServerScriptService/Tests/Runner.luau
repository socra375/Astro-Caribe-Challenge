--[[
	Ejecuta las pruebas de la fase 1 en Studio y envía los resultados a roblox/tools/serve.js
	(POST /out/<nombre>), donde roblox/tests/compare.js los compara con la referencia de Node.
	- Runner.selftest(n, from): partidas `from`..n-1 de SelfTest con una línea JSON por partida (resultado + digest
	  de la huella) y, al final, el resumen. Corre en segundo plano con task.wait() entre partidas para no
	  congelar Studio; Runner.status() dice por dónde va.
	- Runner.detail(seeds): huella completa (JSON) de las partidas indicadas, para localizar una diferencia.
	- Runner.scenario(): escenario de Station y Surv.
]]
local HttpService = game:GetService("HttpService")
local SelfTest = require(script.Parent.SelfTest)
local Fingerprint = require(script.Parent.Fingerprint)
local Scenario = require(script.Parent.Scenario)
local Sim = require(script.Parent.Parent.Sim)

local URL = "http://127.0.0.1:8765/out/"
local Runner = {}
local state = { running = false, done = 0, total = 0, err = nil, ms = 0 }

local function post(name, body) HttpService:PostAsync(URL .. name, body, Enum.HttpContentType.TextPlain) end

function Runner.status() return HttpService:JSONEncode(state) end

function Runner.selftest(n, from)
	n = n or 100
	from = from or 0
	if state.running then return "ya está en marcha" end
	state = { running = true, done = 0, total = n - from, err = nil, ms = 0 }
	task.spawn(function()
		local ok, err = pcall(function()
			local lines, out, t0 = {}, {}, os.clock()
			for i = from, n - 1 do
				local policy = i % 4 == 3 and "passive" or "smart"
				local r, S = SelfTest.runOne(i, policy, {})
				table.insert(out, r)
				table.insert(lines, Fingerprint.json({
					seed = r.seed, scen = r.scen, diff = r.diff, mode = r.mode, policy = r.policy,
					ended = r.ended and { kind = r.ended.kind, reason = r.ended.reason, t = r.ended.t } or nil,
					hours = r.hours, errs = r.errs, done = r.done, incidents = r.incidents, resolved = r.resolved, maxConsec = r.maxConsec,
					digest = Fingerprint.digest(Fingerprint.of(S)),
				}))
				state.done += 1
				task.wait()
			end
			state.ms = math.floor((os.clock() - t0) * 1000)
			local summary = SelfTest.summarize(out)
			table.insert(lines, Fingerprint.json({ summary = summary, ms = state.ms }))
			post("selftest-luau.jsonl", table.concat(lines, "\n"))
		end)
		if not ok then state.err = tostring(err) end
		state.running = false
	end)
	return "en marcha"
end

function Runner.detail(seeds)
	local lines = {}
	for _, i in ipairs(seeds) do
		local _, S = SelfTest.runOne(i, i % 4 == 3 and "passive" or "smart", {})
		table.insert(lines, Fingerprint.json({ seed = i, fp = Fingerprint.of(S) }))
	end
	post("detail-luau.jsonl", table.concat(lines, "\n"))
	return #lines
end

function Runner.scenario()
	local out = Scenario.run()
	post("scenario-luau.json", Fingerprint.json(out))
	return Fingerprint.digest(out)
end

Runner.Sim = Sim
return Runner
