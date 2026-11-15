'use strict';
/* =====================================================================
   DATA — textos (es/en), misiones, eventos, fuentes y datos de respaldo.
   Regla: ninguna estadística dominicana inventada. Las cifras incluyen
   fuente y fecha; lo cualitativo se marca como tal.
   ===================================================================== */
const DATA = (function () {
  const U = {
    es: {
      start: 'Iniciar misión', cont: 'Continuar', manual: 'Manual de aprendizaje', earthConn: 'Conexión con la Tierra', sources: 'Fuentes científicas',
      settings: 'Configuración', lang: 'English', scen: 'Escenario', diff: 'Dificultad', moon: 'Luna', mars: 'Marte', explorer: 'Explorador', engineer: 'Ingeniero', commander: 'Comandante',
      explorerD: 'Más ayudas, recursos abundantes, mayor margen de error.', engineerD: 'Recursos equilibrados, eventos ambientales, menos ayudas.', commanderD: 'Recursos limitados, eventos complejos, menor margen.',
      moonD: 'Región del cráter Shackleton, polo sur lunar. Sin atmósfera, luz solar casi rasante, mensajes con ~1,3 s de retraso.',
      marsD: 'Atmósfera tenue, polvo, días de 24 h 39 min y mensajes con 3 a 22 minutos de retraso.',
      go: '¡Despegar!', back: 'Volver', close: 'Cerrar', confirm: 'Confirmar', cancel: 'Cancelar', yes: 'Sí', no: 'No', on: 'Activado', off: 'Desactivado',
      o2: 'Aire', o2A: 'Oxígeno', nutr: 'Nutrientes', water: 'Agua', power: 'Energía', rad: 'Protección', radA: 'Radiación', food: 'Comida', foodA: 'Alimentos', well: 'Bienestar', mat: 'Materiales', waste: 'Residuos', life: 'Soporte vital',
      modeT: 'Modalidad', modeJ: 'Explorador Junior', modeJage: '7 a 12 años', modeJd: 'Aprende lo básico de vivir en el espacio explorando, probando y siguiendo misiones guiadas.', modeA: 'Ingeniero de Misión', modeAage: '13 años en adelante', modeAd: 'Entiende problemas de ingeniería espacial con simulaciones, datos y decisiones técnicas.', challenge: 'Reto', chStd: 'Estándar', chStdD: 'Recursos equilibrados y eventos ambientales.', chHard: 'Exigente', chHardD: 'Recursos justos y eventos más complejos.', good: 'Bien', careful: 'Cuidado', urgent: '¡Urgente!', more: 'Más información', diagT: 'Diagnóstico', diagDo: 'Diagnosticar', diagAsk: '¿Cuál es la causa más probable?', diagOk: 'Diagnóstico correcto: reparación desbloqueada.', diagBad: 'No encaja con los datos. Pierdes 1 hora; vuelve a mirar los valores.',
      ok: 'Normal', warn: 'Advertencia', crit: 'Crítico', info: 'Información',
      interact: 'Interactuar', repair: 'Reparar', investigate: 'Investigar', manage: 'Administrar', collect: 'Recoger muestras', play: 'Ejecutar minijuego', rest: 'Descansar', explore: 'Explorar',
      paused: 'Pausa', resume: 'Reanudar', mainMenu: 'Menú principal', save: 'Guardar', saved: 'Partida guardada', endRun: 'Terminar y ver informe',
      volume: 'Volumen', mute: 'Silenciar', motion: 'Reducir animaciones', hints: 'Ayudas en pantalla', textSize: 'Tamaño de texto', selftest: 'Ejecutar 100 simulaciones de prueba',
      storageOff: 'El navegador no permite guardar: se usa una sesión temporal.',
      tut: 'Tutorial', next: 'Siguiente', skip: 'Saltar',
      missions: 'Misiones', resources: 'Recursos', logT: 'Registro', mapT: 'Mapa', comms: 'Comunicaciones', crew: 'Tripulación',
      startM: 'Iniciar', retry: 'Repetir', active: 'En curso', done: 'Completada', failed: 'Fallida', idle: 'Disponible', progress: 'Progreso',
      objective: 'Objetivo', steps: 'Pasos', learn: 'Aprenderás', reward: 'Recompensa', abandon: 'Abandonar misión',
      consequences: 'Panel de consecuencias', current: 'Estado actual', uses: 'Recurso que se utilizará', up: 'Aumentará', down: 'Disminuirá', risks: 'Posibles riesgos', benefits: 'Beneficios previstos', in12: 'Proyección del modelo a {h} h comparada con no hacer nada',
      noChange: 'Sin cambios importantes en {h} h', why: '¿Por qué ocurrió?', whatH: 'Qué sucedió', sysH: 'Sistema afectado', causeH: 'Por qué ocurre', doH: 'Qué puedes hacer', dataH: 'Dato científico', srcH: 'Fuente y fecha',
      send: 'Enviar', inbox: 'Mensajes recibidos', transit: 'En tránsito', pending: 'Respuesta pendiente', received: 'Recibido', eta: 'Llega en', delayOne: 'Retraso de ida (simulado)', delayReal: 'Retraso real de la luz',
      wait1: 'Esperar 1 h', wait6: 'Esperar 6 h', reqStatus: 'Pedir diagnóstico', reqForecast: 'Pedir pronóstico de clima espacial', reqRoute: 'Pedir ruta segura para el rover',
      practice: 'Practicar (no cambia la base)', real: 'Hacerlo de verdad', level: 'Nivel', success: '¡Lo lograste!', fail: 'No salió esta vez', tryAgain: 'Intentar de nuevo', learned: 'Lo que aprendiste',
      time: 'Tiempo', score: 'Puntuación', instructions: 'Instrucciones', begin: 'Comenzar',
      report: 'Informe final de misión', r1: '1. Resultado de la misión', r2: '2. Administración de recursos', r3: '3. Aprendizaje científico', r4: '4. Impacto en la Tierra',
      newRun: 'Nueva partida', speed: 'Velocidad', alerts: 'Alertas', none: 'Ninguna',
      day: 'Día', hours: 'h', kg: 'kg', L: 'L', kWh: 'kWh', kW: 'kW', mSv: 'mSv',
      moonOnly: 'Solo en la Luna', marsOnly: 'Solo en Marte', offline: 'Sin conexión: se usan datos históricos guardados (no son en tiempo real).', online: 'Conexión disponible: se intentó actualizar DONKI.',
      liveData: 'Datos en vivo de DONKI (últimos 30 días)', fallback: 'Copia local de registros históricos', achievements: 'Logros', stats: 'Estadísticas',
      quiz: 'Pregunta rápida', correct: '¡Correcto!', wrong: 'Casi. Mira por qué:', tryToy: 'Prueba tú', sdgT: 'Objetivos de Desarrollo Sostenible', limitsT: 'Límites para transferir la solución',
      spaceT: 'Lo que aprendimos en el espacio', rdT: 'Aplicación en República Dominicana', worldT: 'Impacto global', locked: 'Completa la misión para desbloquear esta ficha.',
      helpMove: 'Muévete con WASD o flechas · E para interactuar · P pausa · M mapa', helpTouch: 'Usa el joystick para moverte y el botón E para interactuar',
      busy: 'Ya hay una misión en curso. Termínala o abandónala primero.', noseed: 'No quedan semillas de esa especie.', nonutr: 'No queda solución nutritiva: prepárala en el panel del invernadero.', noplant: 'No hay planta en ese hueco.', noprune: 'Ahora no hace falta podar.', locked: 'Completa primero la familiarización.', nomat: 'No hay materiales suficientes.', nosample: 'No hay muestras para analizar.', nowater: 'No hay agua suficiente.', nowaste: 'Necesitas al menos 6 kg de residuos.', err: 'No se pudo hacer.'
    },
    en: {
      start: 'Start mission', cont: 'Continue', manual: 'Learning manual', earthConn: 'Earth Connection', sources: 'Science sources',
      settings: 'Settings', lang: 'Español', scen: 'Scenario', diff: 'Difficulty', moon: 'Moon', mars: 'Mars', explorer: 'Explorer', engineer: 'Engineer', commander: 'Commander',
      explorerD: 'More help, plenty of resources, bigger margin for error.', engineerD: 'Balanced resources, environmental events, less help.', commanderD: 'Scarce resources, complex events, small margin.',
      moonD: 'Shackleton crater region, lunar south pole. No air, low-angle sunlight, messages delayed ~1.3 s.',
      marsD: 'Thin air, dust, 24 h 39 min days and messages delayed 3 to 22 minutes.',
      go: 'Launch!', back: 'Back', close: 'Close', confirm: 'Confirm', cancel: 'Cancel', yes: 'Yes', no: 'No', on: 'On', off: 'Off',
      o2: 'Air', o2A: 'Oxygen', nutr: 'Nutrients', water: 'Water', power: 'Energy', rad: 'Protection', radA: 'Radiation', food: 'Food', foodA: 'Food supply', well: 'Wellbeing', mat: 'Materials', waste: 'Waste', life: 'Life support',
      modeT: 'Mode', modeJ: 'Junior Explorer', modeJage: 'Ages 7 to 12', modeJd: 'Learn the basics of living in space by exploring, experimenting and following guided missions.', modeA: 'Mission Engineer', modeAage: 'Ages 13 and up', modeAd: 'Understand space engineering problems through simulations, data and technical decisions.', challenge: 'Challenge', chStd: 'Standard', chStdD: 'Balanced resources and environmental events.', chHard: 'Demanding', chHardD: 'Tight resources and more complex events.', good: 'Good', careful: 'Careful', urgent: 'Urgent!', more: 'More information', diagT: 'Diagnosis', diagDo: 'Diagnose', diagAsk: 'What is the most likely cause?', diagOk: 'Correct diagnosis: repair unlocked.', diagBad: 'That does not fit the data. You lose 1 hour; look at the values again.',
      ok: 'Normal', warn: 'Warning', crit: 'Critical', info: 'Info',
      interact: 'Interact', repair: 'Repair', investigate: 'Investigate', manage: 'Manage', collect: 'Collect samples', play: 'Play mini-game', rest: 'Rest', explore: 'Explore',
      paused: 'Paused', resume: 'Resume', mainMenu: 'Main menu', save: 'Save', saved: 'Game saved', endRun: 'End and see report',
      volume: 'Volume', mute: 'Mute', motion: 'Reduce motion', hints: 'On-screen help', textSize: 'Text size', selftest: 'Run 100 test simulations',
      storageOff: 'This browser blocks saving: using a temporary session.',
      tut: 'Tutorial', next: 'Next', skip: 'Skip',
      missions: 'Missions', resources: 'Resources', logT: 'Log', mapT: 'Map', comms: 'Communications', crew: 'Crew',
      startM: 'Start', retry: 'Retry', active: 'Active', done: 'Done', failed: 'Failed', idle: 'Available', progress: 'Progress',
      objective: 'Goal', steps: 'Steps', learn: 'You will learn', reward: 'Reward', abandon: 'Abandon mission',
      consequences: 'Consequences panel', current: 'Current status', uses: 'Resource used', up: 'Will increase', down: 'Will decrease', risks: 'Possible risks', benefits: 'Expected benefits', in12: 'Model projection over {h} h compared with doing nothing',
      noChange: 'No important changes in {h} h', why: 'Why did it happen?', whatH: 'What happened', sysH: 'Affected system', causeH: 'Why it happens', doH: 'What you can do', dataH: 'Science fact', srcH: 'Source and date',
      send: 'Send', inbox: 'Received messages', transit: 'In transit', pending: 'Reply pending', received: 'Received', eta: 'Arrives in', delayOne: 'One-way delay (simulated)', delayReal: 'Real light delay',
      wait1: 'Wait 1 h', wait6: 'Wait 6 h', reqStatus: 'Ask for diagnosis', reqForecast: 'Ask for space weather forecast', reqRoute: 'Ask for a safe rover route',
      practice: 'Practice (base unchanged)', real: 'Do it for real', level: 'Level', success: 'You did it!', fail: 'Not this time', tryAgain: 'Try again', learned: 'What you learned',
      time: 'Time', score: 'Score', instructions: 'Instructions', begin: 'Begin',
      report: 'Final mission report', r1: '1. Mission result', r2: '2. Resource management', r3: '3. Science learning', r4: '4. Impact on Earth',
      newRun: 'New game', speed: 'Speed', alerts: 'Alerts', none: 'None',
      day: 'Day', hours: 'h', kg: 'kg', L: 'L', kWh: 'kWh', kW: 'kW', mSv: 'mSv',
      moonOnly: 'Moon only', marsOnly: 'Mars only', offline: 'Offline: using saved historical data (not real time).', online: 'Online: tried to refresh DONKI.',
      liveData: 'Live DONKI data (last 30 days)', fallback: 'Local copy of historical records', achievements: 'Achievements', stats: 'Statistics',
      quiz: 'Quick question', correct: 'Correct!', wrong: 'Almost. Here is why:', tryToy: 'Try it', sdgT: 'Sustainable Development Goals', limitsT: 'Limits to transferring the solution',
      spaceT: 'What we learned in space', rdT: 'Application in the Dominican Republic', worldT: 'Global impact', locked: 'Complete the mission to unlock this card.',
      helpMove: 'Move with WASD or arrows · E to interact · P pause · M map', helpTouch: 'Use the joystick to move and the E button to interact',
      busy: 'A mission is already active. Finish or abandon it first.', noseed: 'No seeds left for that species.', nonutr: 'No nutrient solution left: prepare it at the greenhouse panel.', noplant: 'No plant in that slot.', noprune: 'No pruning needed right now.', locked: 'Finish the familiarization first.', nomat: 'Not enough materials.', nosample: 'No samples to analyze.', nowater: 'Not enough water.', nowaste: 'You need at least 6 kg of waste.', err: 'Could not do it.'
    }
  };

  const ROOMS = {
    bridge: { es: 'Puente de mando', en: 'Command bridge' }, life: { es: 'Módulo de vida', en: 'Habitation module' }, gh: { es: 'Invernadero', en: 'Greenhouse' },
    reactor: { es: 'Reactor y energía', en: 'Reactor & power' }, water: { es: 'Reciclaje de agua y oxígeno', en: 'Water & oxygen recycling' },
    rad: { es: 'Protección radiológica y bahía del rover', en: 'Radiation shelter & rover bay' }, lab: { es: 'Laboratorio científico', en: 'Science lab' },
    hall: { es: 'Pasillo', en: 'Corridor' }, lock: { es: 'Esclusa', en: 'Airlock' }, pad: { es: 'Superficie exterior', en: 'Outside surface' }
  };
  const ROLE_T = {
    commander: { es: 'Comandante Vega', en: 'Commander Vega', b: { es: 'Coordina misiones y decisiones.', en: 'Coordinates missions and decisions.' } },
    engineer: { es: 'Ingeniera Ana', en: 'Engineer Ana', b: { es: 'Repara incidentes sola poco a poco y acelera obras un 30 %.', en: 'Slowly repairs incidents on her own and speeds up building jobs 30%.' } },
    scientist: { es: 'Científico Leo', en: 'Scientist Leo', b: { es: 'Analiza muestras un 50 % más rápido.', en: 'Analyzes samples 50% faster.' } },
    medic: { es: 'Médica Sofía', en: 'Medic Sofía', b: { es: 'Sube la moral de la tripulación (+6 puntos de objetivo).', en: 'Raises crew morale (+6 target points).' } },
    agri: { es: 'Agrónomo Teo', en: 'Agronomist Teo', b: { es: 'Las plantas crecen un 15 % más rápido.', en: 'Plants grow 15% faster.' } }
  };
  const SYS_T = {
    reactor: { es: 'Reactor', en: 'Reactor' }, solar: { es: 'Paneles solares', en: 'Solar panels' }, o2: { es: 'Generador de oxígeno', en: 'Oxygen generator' },
    rec: { es: 'Reciclador de agua', en: 'Water recycler' }, thermal: { es: 'Control térmico', en: 'Thermal control' }, press: { es: 'Presurización', en: 'Pressurization' },
    comms: { es: 'Antena de comunicaciones', en: 'Comms antenna' }, shield: { es: 'Blindaje', en: 'Shielding' }, gh: { es: 'Invernadero', en: 'Greenhouse' }, lab: { es: 'Laboratorio', en: 'Lab' }, isru: { es: 'Extractor de hielo', en: 'Ice extractor' }
  };
  const CROP_T = {
    micro: { es: 'Microverdes', en: 'Microgreens', d: { es: 'Poca luz y agua, poco rendimiento.', en: 'Little light and water, low yield.' } },
    lettuce: { es: 'Lechuga', en: 'Lettuce', d: { es: 'Equilibrada.', en: 'Balanced.' } },
    radish: { es: 'Rábano', en: 'Radish', d: { es: 'Mucha luz y agua, mayor rendimiento.', en: 'Lots of light and water, higher yield.' } }
  };

  /* ---------- Registros DONKI de respaldo (fechas verificables en el catálogo DONKI/NOAA) ---------- */
  const DONKI = [
    { date: '2017-09-06', type: 'FLR', cls: 'X9.3', es: 'Erupción solar X9.3, la más intensa del ciclo solar 24 (región activa 2673).', en: 'X9.3 solar flare, the strongest of solar cycle 24 (active region 2673).' },
    { date: '2024-05-10', type: 'GST', cls: 'G5 (Kp 9)', es: 'Tormenta geomagnética extrema G5 tras varias eyecciones de masa coronal; auroras vistas muy al sur.', en: 'Extreme G5 geomagnetic storm after several coronal mass ejections; auroras seen far south.' },
    { date: '2003-10-28', type: 'FLR', cls: 'X17', es: 'Erupción X17 de las "tormentas de Halloween" de 2003, acompañada de una eyección de masa coronal muy rápida.', en: 'X17 flare of the 2003 "Halloween storms", with a very fast coronal mass ejection.' }
  ];

  /* ---------- Eventos: panel "¿Por qué ocurrió?" ---------- */
  const EVT = {
    solar_storm: {
      t: { es: 'Tormenta solar', en: 'Solar storm' },
      what: { es: 'El Sol lanzó partículas muy energéticas que llegan a la base.', en: 'The Sun released very energetic particles that reach the base.' },
      cause: { es: 'Erupciones y eyecciones de masa coronal aceleran protones. Sin atmósfera ni campo magnético global (Luna y Marte), la protección depende del blindaje.', en: 'Flares and coronal mass ejections accelerate protons. Without a thick atmosphere or global magnetic field (Moon, Mars), protection depends on shielding.' },
      act: { es: 'Activa el protocolo de refugio, ve al refugio (bahía del rover) y mantén los sistemas esenciales.', en: 'Turn on the shelter protocol, go to the shelter (rover bay) and keep essential systems running.' },
      data: { es: 'DONKI registra erupciones (FLR), eyecciones (CME) y tormentas (GST). Un evento NO equivale a una dosis recibida: la dosis depende del lugar y del blindaje.', en: 'DONKI records flares (FLR), CMEs and storms (GST). An event is NOT a received dose: dose depends on location and shielding.' },
      src: 'NASA CCMC DONKI — https://ccmc.gsfc.nasa.gov/tools/DONKI/ · registros 2003-10-28, 2017-09-06, 2024-05-10'
    },
    power_drop: {
      t: { es: 'Caída de generación solar', en: 'Solar power drop' },
      what: { es: 'Los paneles reciben mucha menos luz.', en: 'The panels receive much less light.' },
      cause: { es: 'Cerca del polo sur lunar el Sol está casi en el horizonte: montañas y bordes de cráteres proyectan sombras largas que cambian con el tiempo.', en: 'Near the lunar south pole the Sun sits almost on the horizon: mountains and crater rims cast long, moving shadows.' },
      act: { es: 'Baja las luces del invernadero, sube el reactor, orienta los paneles o activa el modo de emergencia.', en: 'Dim greenhouse lights, raise reactor output, aim the panels or turn on emergency mode.' },
      data: { es: 'Estudios con datos del LRO muestran que algunos puntos elevados del borde de Shackleton reciben luz la mayor parte del año, pero no de forma continua.', en: 'Studies using LRO data show some high points on the Shackleton rim are lit most of the year, but not continuously.' },
      src: 'NASA Lunar Reconnaissance Orbiter (LRO) — https://science.nasa.gov/mission/lro/ · consulta 2026'
    },
    dust_storm: {
      t: { es: 'Tormenta de polvo', en: 'Dust storm' },
      what: { es: 'El polvo tapa el Sol y cubre los paneles.', en: 'Dust blocks the Sun and coats the panels.' },
      cause: { es: 'Los vientos levantan polvo fino que puede quedarse semanas en la atmósfera marciana.', en: 'Winds lift fine dust that can stay in the Martian air for weeks.' },
      act: { es: 'Ahorra energía, usa el reactor y limpia/orienta los paneles al terminar.', en: 'Save power, rely on the reactor, then clean and aim the panels.' },
      data: { es: 'En junio de 2018 una tormenta de polvo global dejó sin energía al rover Opportunity, que dejó de comunicarse el 10 de junio de 2018.', en: 'In June 2018 a global dust storm starved the Opportunity rover of power; it last communicated on 10 June 2018.' },
      src: 'NASA JPL, Opportunity mission — https://science.nasa.gov/mission/mer-opportunity/ · 2018-06-10'
    },
    water_fail: {
      t: { es: 'Falla del reciclaje de agua', en: 'Water recycling failure' },
      what: { es: 'Una bomba del reciclador se obstruyó y recupera menos agua.', en: 'A recycler pump clogged and recovers less water.' },
      cause: { es: 'Minerales y residuos se acumulan en filtros y tuberías con el uso.', en: 'Minerals and residue build up in filters and pipes over time.' },
      act: { es: 'Repara el cableado de la bomba en la sala de agua; reduce el riego mientras tanto.', en: 'Repair the pump wiring in the water room; reduce irrigation meanwhile.' },
      data: { es: 'El sistema de la Estación Espacial Internacional recupera más del 90 % del agua; en 2023 NASA informó de un 98 % con su procesador de orina mejorado.', en: 'The International Space Station system recovers over 90% of water; in 2023 NASA reported 98% with its improved urine processor.' },
      src: 'NASA, "NASA Achieves Water Recovery Milestone on ISS", 2023-06 — https://www.nasa.gov/'
    },
    pressure_leak: {
      t: { es: 'Pérdida de presión', en: 'Pressure leak' },
      what: { es: 'Una junta del módulo de vida deja escapar aire poco a poco.', en: 'A seal in the habitation module slowly leaks air.' },
      cause: { es: 'Los cambios de temperatura dilatan y contraen materiales; las juntas se desgastan.', en: 'Temperature swings expand and shrink materials; seals wear out.' },
      act: { es: 'Repara la fuga en el módulo de vida. Se pierde oxígeno mientras no se arregla.', en: 'Fix the leak in the habitation module. Oxygen is lost until it is fixed.' },
      data: { es: 'La ISS mantiene su cabina cerca de 101,3 kPa, la presión del aire al nivel del mar.', en: 'The ISS keeps its cabin near 101.3 kPa, sea-level air pressure.' },
      src: 'NASA ISS Environmental Control and Life Support — https://www.nasa.gov/ · consulta 2026'
    },
    comms_blackout: {
      t: { es: 'Problema de comunicaciones', en: 'Communication problem' },
      what: { es: 'La antena perdió el enlace con la Tierra.', en: 'The antenna lost its link with Earth.' },
      cause: { es: 'Fallas de equipo, polvo o la posición del Sol entre la Tierra y Marte (conjunción solar) pueden cortar la señal.', en: 'Equipment faults, dust or the Sun between Earth and Mars (solar conjunction) can cut the signal.' },
      act: { es: 'Repara la antena en el puente o trabaja con protocolos autónomos hasta que vuelva.', en: 'Repair the antenna on the bridge or follow autonomous protocols until it returns.' },
      data: { es: 'Cada ~2 años, durante la conjunción solar de Marte, NASA pausa casi todos los comandos a sus misiones durante unas dos semanas.', en: 'About every 2 years, during Mars solar conjunction, NASA pauses most commands to its missions for about two weeks.' },
      src: 'NASA Mars Exploration, "Mars Solar Conjunction" — https://science.nasa.gov/mars/ · consulta 2026'
    },
    crop_fail: {
      t: { es: 'Falla de cultivos', en: 'Crop failure' },
      what: { es: 'Algunas plantas enfermaron.', en: 'Some plants got sick.' },
      cause: { es: 'En espacios cerrados, hongos y humedad alta se propagan rápido.', en: 'In closed spaces, mold and high humidity spread fast.' },
      act: { es: 'Usa el minijuego del invernadero para estabilizar humedad, luz y temperatura.', en: 'Use the greenhouse mini-game to stabilize humidity, light and temperature.' },
      data: { es: 'En el experimento Veggie de la ISS, en 2016, unas zinnias enfermaron por exceso de humedad y la tripulación tuvo que ajustar el riego y el aire.', en: 'In the ISS Veggie experiment in 2016, zinnias got sick from excess humidity and the crew had to adjust watering and airflow.' },
      src: 'NASA, Veggie experiment (zinnias, 2016) — https://www.nasa.gov/ · consulta 2026'
    },
    thermal_fail: {
      t: { es: 'Problema de temperatura', en: 'Temperature problem' },
      what: { es: 'El circuito de calefacción funciona a medias.', en: 'The heating loop runs at half strength.' },
      cause: { es: 'Afuera hace muchísimo frío: el calor se escapa si el control térmico falla.', en: 'It is extremely cold outside: heat escapes if thermal control fails.' },
      act: { es: 'Repara el control térmico en el módulo de vida.', en: 'Repair thermal control in the habitation module.' },
      data: { es: 'La temperatura media de Marte es de unos −63 °C; en cráteres lunares en sombra permanente el LRO midió menos de −200 °C.', en: 'Mars averages about −63 °C; in permanently shadowed lunar craters LRO measured below −200 °C.' },
      src: 'NASA Mars Fact Sheet; NASA LRO Diviner — https://science.nasa.gov/ · consulta 2026'
    },
    wear: {
      t: { es: 'Deterioro de equipos', en: 'Equipment wear' },
      what: { es: 'Un equipo perdió rendimiento por desgaste.', en: 'A machine lost performance from wear.' },
      cause: { es: 'El polvo abrasivo, los ciclos térmicos y el uso continuo desgastan piezas.', en: 'Abrasive dust, thermal cycles and constant use wear parts.' },
      act: { es: 'Repara el cableado o programa mantenimiento (usa materiales).', en: 'Repair the wiring or schedule maintenance (uses materials).' },
      data: { es: 'El polvo lunar es fino y abrasivo; los astronautas del Apolo informaron de que dañaba trajes y juntas.', en: 'Lunar dust is fine and abrasive; Apollo astronauts reported it damaged suits and seals.' },
      src: 'NASA Apollo mission reports — https://www.nasa.gov/ · consulta 2026'
    },
    sensor_drift: {
      t: { es: 'Sensor de oxígeno descalibrado', en: 'Oxygen sensor drift' },
      what: { es: 'El sensor marca un valor distinto del real.', en: 'The sensor reads a different value than the real one.' },
      cause: { es: 'Los sensores envejecen y necesitan calibración periódica.', en: 'Sensors age and need regular calibration.' },
      act: { es: 'Calibra el oxígeno en la sala de agua y O₂.', en: 'Calibrate oxygen in the water and O₂ room.' },
      data: { es: 'El aire normal tiene cerca de 20,9 % de oxígeno; por debajo de 19,5 % se considera deficiente y por encima de 23,5 % aumenta el riesgo de incendio.', en: 'Normal air is about 20.9% oxygen; below 19.5% is deficient and above 23.5% raises fire risk.' },
      src: 'Normas de seguridad ocupacional (OSHA 29 CFR 1910.146) y práctica de NASA — consulta 2026'
    }
  };

  /* ---------- Misiones ---------- */
  const MIS = {
    1: { icon: '🫧', room: 'water',
      t: { es: 'Estabilizar el soporte vital', en: 'Stabilize life support' },
      brief: { es: 'El reciclador de agua falla y las reservas bajaron. Mantén oxígeno y agua estables durante un ciclo de 24 h.', en: 'The water recycler is failing and reserves dropped. Keep oxygen and water stable for a 24 h cycle.' },
      vars: [{ es: 'Mantén O₂ ≥ 45 %, agua ≥ 40 % y reciclaje ≥ 78 % durante 24 h seguidas.', en: 'Keep O₂ ≥ 45%, water ≥ 40% and recycling ≥ 78% for 24 h in a row.' },
        { es: 'Mantén reciclaje ≥ 85 % (modo máximo), O₂ de cabina entre 19,5 y 23,5 % y agua ≥ 30 % durante 24 h.', en: 'Keep recycling ≥ 85% (max mode), cabin O₂ 19.5–23.5% and water ≥ 30% for 24 h.' }],
      steps: { es: ['Ve a «Reciclaje de agua y oxígeno».', 'Repara la bomba (minijuego de cableado).', 'Ajusta el modo del reciclador y el riego.', 'Espera 24 h vigilando los indicadores.'], en: ['Go to "Water & oxygen recycling".', 'Repair the pump (wiring mini-game).', 'Set recycler mode and irrigation.', 'Wait 24 h watching the meters.'] },
      learn: { es: 'Consumo, reciclaje, reservas y distribución de recursos.', en: 'Consumption, recycling, reserves and resource distribution.' } },
    2: { icon: '⚡', room: 'reactor',
      t: { es: 'Recuperar el suministro eléctrico', en: 'Restore the power supply' },
      brief: { es: 'Los paneles reciben menos luz y el reactor está dañado. Reorganiza el consumo para que los sistemas esenciales nunca se apaguen.', en: 'Panels get less light and the reactor is damaged. Reorganize consumption so essential systems never shut down.' },
      vars: [{ es: 'Durante 12 h seguidas: batería ≥ 25 % y soporte vital y comunicaciones al 100 %. El reactor debe quedar reparado.', en: 'For 12 h in a row: battery ≥ 25% and life support and comms at 100%. The reactor must be repaired.' },
        { es: 'Igual, pero intenta lograrlo usando el minijuego de balance energético.', en: 'Same, but try to do it using the energy balance mini-game.' }],
      steps: { es: ['Ve a «Reactor y energía».', 'Repara el reactor (cableado).', 'Baja luces del invernadero o activa el modo de emergencia.', 'Orienta los paneles solares.'], en: ['Go to "Reactor & power".', 'Repair the reactor (wiring).', 'Dim greenhouse lights or use emergency mode.', 'Aim the solar panels.'] },
      learn: { es: 'Energía renovable, baterías, consumo y sistemas prioritarios.', en: 'Renewable energy, batteries, consumption and priority systems.' } },
    3: { icon: '☀️', room: 'rad',
      t: { es: 'Prepararse ante un evento solar', en: 'Prepare for a solar event' },
      brief: { es: 'El monitor de clima espacial detecta una erupción inspirada en un registro real de DONKI. Las partículas llegarán pronto.', en: 'The space-weather monitor detects a flare inspired by a real DONKI record. Particles will arrive soon.' },
      vars: [{ es: 'Activa el protocolo de refugio antes de que llegue y mantén la dosis media añadida por debajo del presupuesto.', en: 'Turn on the shelter protocol before it arrives and keep the added average dose under budget.' },
        { es: 'Igual, y no dejes que se apaguen los sistemas esenciales durante la tormenta.', en: 'Same, and do not let essential systems shut down during the storm.' }],
      steps: { es: ['Abre «Calibrar blindaje» en la bahía del rover.', 'Activa el protocolo de refugio.', 'Entra tú también en el refugio (zona con rayas amarillas).', 'Espera a que pase la tormenta.'], en: ['Open "Shielding" in the rover bay.', 'Turn on the shelter protocol.', 'Walk into the shelter yourself (yellow-striped zone).', 'Wait for the storm to pass.'] },
      learn: { es: 'Clima espacial, radiación, protección y planificación de emergencias.', en: 'Space weather, radiation, protection and emergency planning.' } },
    4: { icon: '🗺️', room: 'bridge',
      t: { es: 'Seleccionar un sitio de exploración', en: 'Choose an exploration site' },
      brief: { es: 'El centro de control te pide elegir el mejor sitio para una nueva expedición según una prioridad concreta.', en: 'Mission control asks you to choose the best site for a new expedition based on a specific priority.' },
      vars: [{ es: 'Compara pendiente, iluminación, geografía y riesgos. Elige el sitio que mejor cumpla la prioridad.', en: 'Compare slope, lighting, geography and risks. Pick the site that best fits the priority.' }, { es: 'Igual, con otra prioridad.', en: 'Same, with another priority.' }],
      steps: { es: ['Abre la consola de mando y la pestaña Misiones.', 'Lee la prioridad.', 'Compara los sitios y elige.'], en: ['Open the command console, Missions tab.', 'Read the priority.', 'Compare the sites and choose.'] },
      learn: { es: 'Criterios geográficos y de ingeniería para elegir sitios.', en: 'Geographic and engineering criteria for choosing sites.' } },
    5: { icon: '🛡️', room: 'rad',
      t: { es: 'Calibrar la protección radiológica', en: 'Calibrate radiation protection' },
      brief: { es: 'El blindaje está desgastado y el refugio es pequeño. Refuérzalo con materiales sin quedarte sin energía.', en: 'Shielding is worn and the shelter is small. Reinforce it with materials without running out of power.' },
      vars: [{ es: 'Blindaje nivel ≥ 2 y refugio para ≥ 4 personas, con batería ≥ 20 %.', en: 'Shield level ≥ 2 and shelter for ≥ 4 people, with battery ≥ 20%.' }, { es: 'Blindaje nivel 3 y refugio para ≥ 3 personas, con batería ≥ 20 %.', en: 'Shield level 3 and shelter for ≥ 3 people, with battery ≥ 20%.' }],
      steps: { es: ['Ve a la bahía del rover, consola «Blindaje».', 'Refuerza el blindaje (14 kg de materiales, 6 h).', 'Amplía el refugio (8 kg, 4 h).', 'Si faltan materiales: recicla residuos en el laboratorio o explora con el rover.'], en: ['Go to the rover bay, "Shielding" console.', 'Reinforce shielding (14 kg materials, 6 h).', 'Expand the shelter (8 kg, 4 h).', 'Low on materials? Recycle waste in the lab or explore with the rover.'] },
      learn: { es: 'Blindaje, materiales, refugios y diferencias de exposición.', en: 'Shielding, materials, shelters and exposure differences.' } },
    6: { icon: '🌱', room: 'gh',
      t: { es: 'Cultivar alimentos', en: 'Grow food' },
      brief: { es: 'Siembra, riega e ilumina las camas del invernadero. Cada cultivo tarda 7 días simulados. Puede correr junto a otra misión.', en: 'Plant, water and light the greenhouse beds. Each crop takes 7 simulated days. Can run alongside another mission.' },
      vars: [{ es: 'Cosecha al menos 5 kg de alimentos.', en: 'Harvest at least 5 kg of food.' }, { es: 'Cosecha al menos 7 kg con 2 cultivos distintos.', en: 'Harvest at least 7 kg with 2 different crops.' }],
      steps: { es: ['Ve al invernadero.', 'Siembra en las camas vacías.', 'Ajusta luz y riego (mira el panel de consecuencias).', 'Usa la velocidad x4 y cosecha al 100 %.'], en: ['Go to the greenhouse.', 'Plant empty beds.', 'Set light and irrigation (check the consequences panel).', 'Use x4 speed and harvest at 100%.'] },
      learn: { es: 'Producción de alimentos, agua y luz en entornos controlados.', en: 'Food production, water and light in controlled environments.' } },
    7: { icon: '🚙', room: 'rad',
      t: { es: 'Explorar mediante el rover', en: 'Explore with the rover' },
      brief: { es: 'Conduce el rover, recoge muestras y vuelve a la base. La antena está fallando: ¿esperarás la ruta de la Tierra o usarás tu autonomía?', en: 'Drive the rover, collect samples and return. The antenna is failing: will you wait for Earth\'s route or use your autonomy?' },
      vars: [{ es: 'Recoge las muestras indicadas y vuelve a la base con batería.', en: 'Collect the target samples and return to base with battery left.' }, { es: 'Igual, gestionando la falla de comunicaciones.', en: 'Same, handling the communication failure.' }],
      steps: { es: ['(Opcional) Pide una ruta segura en Comunicaciones; tardará en llegar.', 'Ve a la bahía del rover.', 'Conduce, evita rocas y recoge muestras.', 'Vuelve a la base antes de agotar la batería.'], en: ['(Optional) Ask for a safe route in Comms; it will take time.', 'Go to the rover bay.', 'Drive, avoid rocks and collect samples.', 'Return before the battery runs out.'] },
      learn: { es: 'Exploración robótica, autonomía, muestras y comunicación espacial.', en: 'Robotic exploration, autonomy, samples and space communication.' } }
  };
  const FAILWHY = {
    time: { es: 'Se acabó el tiempo disponible. Revisa qué recurso limitaba el progreso y vuelve a intentarlo.', en: 'Time ran out. Check which resource limited progress and try again.' },
    dose: { es: 'La dosis media superó el presupuesto. Activa el protocolo antes y amplía el refugio.', en: 'The average dose exceeded the budget. Turn on the protocol earlier and expand the shelter.' },
    quit: { es: 'Abandonaste la misión. Puedes repetirla cuando quieras.', en: 'You abandoned the mission. You can retry anytime.' }
  };

  /* ---------- Sitios (Misión 4): valoraciones cualitativas del juego, 1-5 ---------- */
  const SITES = {
    moon: [
      { id: 'rim', n: { es: 'Borde del cráter Shackleton', en: 'Shackleton crater rim' }, slope: 2, light: 5, geo: 4, risk: 3, d: { es: 'Zonas altas con luz solar casi continua y cerca de cráteres en sombra que pueden guardar hielo. Pendientes notables.', en: 'High areas with near-continuous sunlight, near shadowed craters that may hold ice. Noticeable slopes.' } },
      { id: 'ridge', n: { es: 'Cresta entre Shackleton y de Gerlache', en: 'Shackleton–de Gerlache ridge' }, slope: 3, light: 4, geo: 4, risk: 4, d: { es: 'Región candidata de Artemis: buena luz y terreno algo más suave.', en: 'Artemis candidate region: good light and somewhat gentler ground.' } },
      { id: 'malapert', n: { es: 'Macizo Malapert', en: 'Malapert massif' }, slope: 2, light: 3, geo: 3, risk: 3, d: { es: 'Montaña alta con buena visibilidad hacia la Tierra, útil para comunicaciones.', en: 'Tall mountain with a good view of Earth, useful for communications.' } },
      { id: 'floor', n: { es: 'Fondo del cráter Shackleton', en: 'Shackleton crater floor' }, slope: 4, light: 1, geo: 5, risk: 1, d: { es: 'Sombra permanente y frío extremo: interesante por el posible hielo, muy difícil para energía solar.', en: 'Permanent shadow and extreme cold: interesting for possible ice, very hard for solar power.' } }
    ],
    mars: [
      { id: 'jezero', n: { es: 'Cráter Jezero', en: 'Jezero crater' }, slope: 4, light: 4, geo: 5, risk: 4, d: { es: 'Antiguo lago con un delta; lo explora el rover Perseverance desde febrero de 2021.', en: 'Ancient lake with a delta; explored by Perseverance since February 2021.' } },
      { id: 'arcadia', n: { es: 'Arcadia Planitia', en: 'Arcadia Planitia' }, slope: 5, light: 3, geo: 3, risk: 4, d: { es: 'Llanura muy plana del norte con posible hielo bajo la superficie.', en: 'Very flat northern plain with possible subsurface ice.' } },
      { id: 'valles', n: { es: 'Valles Marineris', en: 'Valles Marineris' }, slope: 1, light: 3, geo: 5, risk: 1, d: { es: 'Enorme sistema de cañones con capas de roca visibles; paredes muy empinadas.', en: 'Huge canyon system with exposed rock layers; very steep walls.' } },
      { id: 'gale', n: { es: 'Cráter Gale', en: 'Gale crater' }, slope: 3, light: 4, geo: 4, risk: 3, d: { es: 'Lo explora Curiosity desde 2012; tiene una montaña de capas sedimentarias (monte Sharp).', en: 'Explored by Curiosity since 2012; has a layered sedimentary mountain (Mount Sharp).' } }
    ]
  };
  const PRIOS = [
    { w: { slope: 0.25, light: 0.45, geo: 0.1, risk: 0.2 }, t: { es: 'Prioridad: ENERGÍA SOLAR para una base de larga duración.', en: 'Priority: SOLAR POWER for a long-duration base.' } },
    { w: { slope: 0.2, light: 0.1, geo: 0.5, risk: 0.2 }, t: { es: 'Prioridad: CIENCIA (geología interesante), aceptando algo de riesgo.', en: 'Priority: SCIENCE (interesting geology), accepting some risk.' } },
    { w: { slope: 0.45, light: 0.1, geo: 0.1, risk: 0.35 }, t: { es: 'Prioridad: ATERRIZAJE SEGURO de una nave pesada.', en: 'Priority: SAFE LANDING of a heavy lander.' } }
  ];

  /* ---------- Preguntas de comprensión ---------- */
  const QUIZ = {
    1: { q: { es: '¿Por qué conviene reciclar el agua en la base?', en: 'Why recycle water at the base?' }, o: [{ es: 'Porque traer agua desde la Tierra es muy caro y limitado', en: 'Because bringing water from Earth is expensive and limited' }, { es: 'Porque el agua reciclada pesa menos', en: 'Because recycled water weighs less' }, { es: 'Porque así se produce energía', en: 'Because it produces energy' }], a: 0, why: { es: 'Cada litro enviado desde la Tierra cuesta combustible y espacio. Reutilizar reduce lo que hay que traer.', en: 'Every liter launched costs fuel and space. Reusing reduces what must be shipped.' } },
    2: { q: { es: 'Si la energía no alcanza, ¿qué apagas primero?', en: 'If power is short, what do you switch off first?' }, o: [{ es: 'El generador de oxígeno', en: 'The oxygen generator' }, { es: 'Las luces del invernadero y el laboratorio', en: 'Greenhouse lights and the lab' }, { es: 'El control de temperatura', en: 'Temperature control' }], a: 1, why: { es: 'Los sistemas que mantienen viva a la tripulación tienen prioridad. Las plantas pueden esperar unas horas.', en: 'Systems that keep the crew alive come first. Plants can wait a few hours.' } },
    3: { q: { es: 'Un evento solar en DONKI, ¿significa que recibiste esa dosis?', en: 'Does a DONKI solar event mean you received that dose?' }, o: [{ es: 'Sí, siempre', en: 'Yes, always' }, { es: 'No: la dosis depende de dónde estás y de tu blindaje', en: 'No: dose depends on where you are and your shielding' }, { es: 'Solo en la Tierra', en: 'Only on Earth' }], a: 1, why: { es: 'DONKI describe fenómenos solares. La dosis recibida depende de la distancia, la dirección y la protección.', en: 'DONKI describes solar phenomena. Received dose depends on distance, direction and protection.' } },
    4: { q: { es: '¿Por qué una pendiente suave ayuda al aterrizar?', en: 'Why does a gentle slope help landing?' }, o: [{ es: 'Porque la nave puede volcar en terreno inclinado', en: 'Because the lander can tip over on sloped ground' }, { es: 'Porque hay más gravedad', en: 'Because gravity is stronger' }, { es: 'Porque hace más calor', en: 'Because it is warmer' }], a: 0, why: { es: 'Las naves tienen patas que soportan poca inclinación; las rocas y pendientes son un riesgo real.', en: 'Landers have legs that tolerate little tilt; rocks and slopes are real hazards.' } },
    5: { q: { es: 'Las mediciones de la ISS en RadLab, ¿son mediciones de la superficie de Marte?', en: 'Are ISS RadLab measurements from the Mars surface?' }, o: [{ es: 'Sí', en: 'Yes' }, { es: 'No: son de la órbita terrestre, sirven como referencia', en: 'No: they are from Earth orbit, useful as a reference' }, { es: 'Son de la Luna', en: 'They are from the Moon' }], a: 1, why: { es: 'La ISS está protegida en parte por el campo magnético terrestre. Marte y la Luna tienen otro entorno.', en: 'The ISS is partly shielded by Earth\'s magnetic field. Mars and the Moon are different.' } },
    6: { q: { es: '¿Qué pasa si das mucha luz a las plantas?', en: 'What happens if you give plants lots of light?' }, o: [{ es: 'Crecen mejor pero se gasta más energía', en: 'They grow better but use more energy' }, { es: 'No cambia nada', en: 'Nothing changes' }, { es: 'Se produce más oxígeno sin costo', en: 'More oxygen with no cost' }], a: 0, why: { es: 'Toda decisión tiene un costo: la luz LED usa electricidad que también necesitan otros sistemas.', en: 'Every choice has a cost: LED light uses electricity other systems also need.' } },
    7: { q: { es: '¿Por qué los rovers en Marte necesitan autonomía?', en: 'Why do Mars rovers need autonomy?' }, o: [{ es: 'Porque los mensajes tardan minutos en ir y volver', en: 'Because messages take minutes to go and return' }, { es: 'Porque no tienen antena', en: 'Because they have no antenna' }, { es: 'Porque son muy rápidos', en: 'Because they are very fast' }], a: 0, why: { es: 'Con 3 a 22 minutos de retraso por trayecto, nadie puede conducir en tiempo real desde la Tierra.', en: 'With 3–22 minutes delay each way, nobody can drive in real time from Earth.' } }
  };

  /* ---------- Conexión con la Tierra (sin cifras dominicanas inventadas) ---------- */
  const EARTH = {
    1: { toy: 'leak', sdg: [6, 12],
      space: { es: 'En la base, cada litro se recicla porque traer agua es muy difícil. Un pequeño porcentaje de pérdida, repetido cada día, vacía el tanque.', en: 'At the base every liter is recycled because shipping water is hard. A small daily loss empties the tank over time.' },
      rd: { es: 'En República Dominicana, reducir fugas en tuberías y tanques familiares, cosechar agua de lluvia y reutilizar agua gris ayuda a hogares y comunidades, sobre todo en temporadas secas. Datos oficiales: INDRHI, INAPA y ONE.', en: 'In the Dominican Republic, fixing leaks in pipes and home tanks, harvesting rainwater and reusing greywater helps homes and communities, especially in dry seasons. Official data: INDRHI, INAPA and ONE.' },
      world: { es: 'La tecnología de tratamiento y reutilización del agua se usa en regiones con poca agua; la misma idea de "cerrar el ciclo" ayuda a ciudades y granjas.', en: 'Water treatment and reuse technology is used in water-scarce regions; the same "closed loop" idea helps cities and farms.' },
      lim: { es: 'Un reciclador espacial es caro y necesita energía estable y mantenimiento. En la Tierra suele ser más barato empezar por reparar fugas y por la educación.', en: 'A space recycler is costly and needs stable power and maintenance. On Earth it is often cheaper to start by fixing leaks and education.' } },
    2: { toy: 'solar', sdg: [7, 9, 13],
      space: { es: 'Generación + almacenamiento + prioridades: si la energía falta, se protege primero lo esencial.', en: 'Generation + storage + priorities: when power is short, essentials are protected first.' },
      rd: { es: 'República Dominicana tiene mucho sol y una ley de incentivo a las renovables (Ley 57-07). Paneles con baterías y uso eficiente dan resiliencia ante apagones y huracanes. Consulta datos en el Ministerio de Energía y Minas (mem.gob.do).', en: 'The Dominican Republic has abundant sun and a renewables incentive law (Law 57-07). Panels with batteries and efficient use add resilience to outages and hurricanes. Data: Ministry of Energy and Mines (mem.gob.do).' },
      world: { es: 'Microrredes solares con baterías llevan electricidad a comunidades aisladas en muchos países.', en: 'Solar microgrids with batteries bring power to remote communities in many countries.' },
      lim: { es: 'Las baterías cuestan, se degradan y deben reciclarse. El diseño depende del clima, la demanda y el financiamiento local.', en: 'Batteries are costly, degrade and must be recycled. Design depends on local climate, demand and funding.' } },
    3: { toy: 'check', sdg: [13, 9, 17],
      space: { es: 'Con aviso temprano y un protocolo ensayado, la tripulación se protege antes de que llegue el peligro.', en: 'With early warning and a practiced protocol, the crew is protected before danger arrives.' },
      rd: { es: 'La temporada de huracanes del Atlántico va del 1 de junio al 30 de noviembre. Los avisos de ONAMET y los planes familiares de emergencia siguen la misma lógica: prepararse antes.', en: 'The Atlantic hurricane season runs from 1 June to 30 November. ONAMET warnings and family emergency plans follow the same logic: prepare early.' },
      world: { es: 'El clima espacial también afecta a la Tierra: satélites, GPS y redes eléctricas. Agencias de distintos países comparten datos para avisar a tiempo.', en: 'Space weather also affects Earth: satellites, GPS and power grids. Agencies worldwide share data to warn in time.' },
      lim: { es: 'Un aviso solo sirve si la gente lo recibe, lo entiende y tiene dónde protegerse.', en: 'A warning only helps if people receive it, understand it and have somewhere safe to go.' } },
    4: { toy: 'site', sdg: [9, 11, 13],
      space: { es: 'Elegir un sitio es equilibrar criterios: no existe el lugar perfecto, sino el mejor para un objetivo.', en: 'Choosing a site means balancing criteria: there is no perfect place, only the best for a goal.' },
      rd: { es: 'Al ubicar escuelas, viviendas o paneles solares se analizan pendientes, riesgo de inundación y deslizamientos, y acceso. Los mapas y el monitoreo ambiental ayudan a decidir mejor.', en: 'When placing schools, homes or solar panels, people analyze slopes, flood and landslide risk, and access. Maps and environmental monitoring help decide better.' },
      world: { es: 'Los satélites de observación de la Tierra ayudan a planificar ciudades y a reducir riesgos de desastres en todo el mundo.', en: 'Earth-observation satellites help plan cities and reduce disaster risk worldwide.' },
      lim: { es: 'Un mapa no certifica que un lugar sea seguro: hacen falta estudios en el terreno y la opinión de la comunidad.', en: 'A map does not certify a place is safe: field studies and community input are needed.' } },
    5: { toy: 'check', sdg: [3, 9, 12],
      space: { es: 'Más material entre las personas y la radiación protege más, pero cuesta materiales, energía y tiempo.', en: 'More material between people and radiation protects more, but costs materials, energy and time.' },
      rd: { es: 'La protección radiológica también existe en la Tierra: en hospitales con rayos X o radioterapia se usan blindajes y límites de dosis para pacientes y personal.', en: 'Radiation protection also exists on Earth: hospitals using X-rays or radiotherapy use shielding and dose limits for patients and staff.' },
      world: { es: 'Las normas internacionales de protección radiológica se basan en tres ideas: tiempo, distancia y blindaje.', en: 'International radiation protection rules rest on three ideas: time, distance and shielding.' },
      lim: { es: 'El modelo del juego es simplificado; la protección real la diseñan especialistas con mediciones.', en: 'The game model is simplified; real protection is designed by specialists with measurements.' } },
    6: { toy: 'crop', sdg: [2, 6, 12],
      space: { es: 'En un invernadero cerrado se controla cada gota y cada vatio: más luz y agua dan más comida, pero cuestan recursos.', en: 'In a closed greenhouse every drop and watt is controlled: more light and water give more food but cost resources.' },
      rd: { es: 'En zonas agrícolas dominicanas se usan invernaderos y riego por goteo para producir hortalizas con menos agua y proteger cultivos del clima. Datos: Ministerio de Agricultura y ONE.', en: 'Dominican farming areas use greenhouses and drip irrigation to grow vegetables with less water and protect crops from weather. Data: Ministry of Agriculture and ONE.' },
      world: { es: 'La agricultura en ambiente controlado ayuda a producir cerca de las ciudades y en climas difíciles.', en: 'Controlled-environment agriculture helps grow food near cities and in harsh climates.' },
      lim: { es: 'Los invernaderos con luz artificial usan mucha energía; su conveniencia depende del costo de la electricidad y del mercado.', en: 'Greenhouses with artificial light use a lot of energy; whether they make sense depends on electricity costs and markets.' } },
    7: { toy: 'delay', sdg: [9, 17, 4],
      space: { es: 'Cuando la ayuda tarda en llegar, hay que tener protocolos para actuar con autonomía y seguridad.', en: 'When help is slow to arrive, you need protocols to act autonomously and safely.' },
      rd: { es: 'Sensores y estaciones automáticas pueden vigilar ríos, presas o el clima y avisar sin esperar a que alguien revise. También la reutilización de materiales (Ley 225-20 de residuos sólidos) aprovecha lo que ya tenemos.', en: 'Automatic sensors and stations can watch rivers, dams or weather and warn without waiting for someone to check. Reusing materials (Law 225-20 on solid waste) uses what we already have.' },
      world: { es: 'Robots y drones exploran volcanes, océanos y zonas de desastre donde es peligroso entrar.', en: 'Robots and drones explore volcanoes, oceans and disaster zones too dangerous for people.' },
      lim: { es: 'La automatización necesita mantenimiento, energía y personas capacitadas para interpretar los datos.', en: 'Automation needs maintenance, power and trained people to interpret the data.' } }
  };
  const SDG = {
    2: { c: '#8a6100', es: 'ODS 2 Hambre cero', en: 'SDG 2 Zero hunger' }, 3: { c: '#1e6b22', es: 'ODS 3 Salud y bienestar', en: 'SDG 3 Good health' },
    4: { c: '#a01818', es: 'ODS 4 Educación de calidad', en: 'SDG 4 Quality education' }, 6: { c: '#015f99', es: 'ODS 6 Agua limpia y saneamiento', en: 'SDG 6 Clean water' },
    7: { c: '#8f5100', es: 'ODS 7 Energía asequible y no contaminante', en: 'SDG 7 Clean energy' }, 9: { c: '#a51f1f', es: 'ODS 9 Industria, innovación e infraestructura', en: 'SDG 9 Industry & innovation' },
    11: { c: '#8a4b00', es: 'ODS 11 Ciudades sostenibles', en: 'SDG 11 Sustainable cities' }, 12: { c: '#6e5600', es: 'ODS 12 Producción y consumo responsables', en: 'SDG 12 Responsible consumption' },
    13: { c: '#235825', es: 'ODS 13 Acción por el clima', en: 'SDG 13 Climate action' }, 17: { c: '#1a3c6e', es: 'ODS 17 Alianzas', en: 'SDG 17 Partnerships' }
  };
  const SDG_WHY = {
    2: { es: 'Producir alimentos con pocos recursos, como en el invernadero.', en: 'Growing food with few resources, like the greenhouse.' },
    3: { es: 'Proteger la salud de las personas frente a la radiación.', en: 'Protecting health from radiation.' },
    4: { es: 'Aprender ciencia resolviendo problemas reales.', en: 'Learning science by solving real problems.' },
    6: { es: 'Reutilizar el agua y evitar pérdidas.', en: 'Reusing water and avoiding losses.' },
    7: { es: 'Generar y almacenar energía limpia.', en: 'Generating and storing clean energy.' },
    9: { es: 'Infraestructura resistente y con mantenimiento.', en: 'Resilient, well-maintained infrastructure.' },
    11: { es: 'Elegir bien dónde construir.', en: 'Choosing well where to build.' },
    12: { es: 'Reciclar residuos y usar menos para lo mismo.', en: 'Recycling waste and using less for the same.' },
    13: { es: 'Prepararse ante eventos extremos.', en: 'Preparing for extreme events.' },
    17: { es: 'Agencias y países comparten datos y alertas.', en: 'Agencies and countries share data and warnings.' }
  };

  /* ---------- Fuentes ---------- */
  const SOURCES = [
    { n: 'NASA Open APIs', u: 'https://api.nasa.gov/', use: { es: 'Acceso a DONKI con DEMO_KEY (pruebas, con límite de peticiones).', en: 'DONKI access with DEMO_KEY (testing, rate-limited).' }, lim: { es: 'DEMO_KEY es pública y limitada; no es una clave privada.', en: 'DEMO_KEY is public and limited; not a private key.' } },
    { n: 'DONKI (NASA CCMC)', u: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/', use: { es: 'Eventos de clima espacial para la Misión 3 y alertas. Unidades: clase de erupción (A–X), índice Kp.', en: 'Space-weather events for Mission 3 and alerts. Units: flare class (A–X), Kp index.' }, lim: { es: 'Un evento no es una dosis recibida.', en: 'An event is not a received dose.' } },
    { n: 'NASA OSDR', u: 'https://osdr.nasa.gov/bio/repo/', use: { es: 'Referencia de investigaciones biológicas espaciales en el laboratorio.', en: 'Reference for space biology studies in the lab.' }, lim: { es: 'No es monitorización médica en tiempo real.', en: 'Not real-time medical monitoring.' } },
    { n: 'RadLab (NASA OSDR)', u: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/', use: { es: 'Referencia de dosimetría de la ISS en la Misión 5.', en: 'ISS dosimetry reference in Mission 5.' }, lim: { es: 'Son mediciones en la ISS, no en la Luna ni en Marte.', en: 'ISS measurements, not Moon or Mars.' } },
    { n: 'NASA Mars Trek', u: 'https://trek.nasa.gov/mars/', use: { es: 'Visualizar los sitios de la Misión 4.', en: 'View Mission 4 sites.' }, lim: { es: 'Información geográfica, no certifica la seguridad de un sitio.', en: 'Geographic info; does not certify site safety.' } },
    { n: 'NASA Moon Trek', u: 'https://trek.nasa.gov/moon/', use: { es: 'Visualizar sitios del polo sur lunar.', en: 'View lunar south pole sites.' }, lim: { es: 'Igual que Mars Trek.', en: 'Same as Mars Trek.' } },
    { n: 'Agencia Espacial Canadiense (CSA) — producción de alimentos', u: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/', use: { es: 'Base educativa de la Misión 6 (cultivo en el espacio).', en: 'Educational basis of Mission 6 (growing food in space).' }, lim: { es: 'El ciclo de 7 días del juego es una compresión educativa.', en: 'The game\'s 7-day cycle is an educational compression.' } },
    { n: 'MSL/RAD (Hassler et al., Science, 2014)', u: 'https://doi.org/10.1126/science.1244797', use: { es: '≈0,64 mSv/día en la superficie de Marte (cráter Gale): dosis de fondo del modelo.', en: '≈0.64 mSv/day on the Mars surface (Gale crater): model background dose.' }, lim: { es: 'Valor medio en un lugar y periodo concretos.', en: 'Average for a specific place and period.' } },
    { n: 'Chang\'e-4 LND (Zhang et al., Science Advances, 2020)', u: 'https://doi.org/10.1126/sciadv.aaz1334', use: { es: '≈1,37 mSv/día en la superficie lunar: dosis de fondo del modelo.', en: '≈1.37 mSv/day on the lunar surface: model background dose.' }, lim: { es: 'Medido en la cara oculta, no en el polo sur.', en: 'Measured on the far side, not the south pole.' } },
    { n: 'Oficina Nacional de Estadística (ONE)', u: 'https://www.one.gob.do/', use: { es: 'Fuente oficial para cualquier dato nacional (agua, agricultura, población).', en: 'Official source for national data.' }, lim: { es: 'El juego no muestra cifras nacionales sin verificar.', en: 'The game shows no unverified national figures.' } },
    { n: 'Ministerio de Energía y Minas (MEM)', u: 'https://mem.gob.do/', use: { es: 'Energía renovable y matriz energética.', en: 'Renewable energy and energy mix.' }, lim: { es: 'Contenido cualitativo en el juego.', en: 'Qualitative content in the game.' } },
    { n: 'Ministerio de Medio Ambiente y Recursos Naturales', u: 'https://ambiente.gob.do/', use: { es: 'Residuos, biodiversidad y adaptación climática.', en: 'Waste, biodiversity and climate adaptation.' }, lim: { es: 'Contenido cualitativo.', en: 'Qualitative content.' } },
    { n: 'INDRHI · ONAMET · Ministerio de Agricultura', u: 'https://indrhi.gob.do/', use: { es: 'Recursos hidráulicos, meteorología y agricultura (referencias cualitativas).', en: 'Water resources, meteorology and agriculture (qualitative references).' }, lim: { es: 'Sin cifras incorporadas.', en: 'No figures embedded.' } }
  ];

  /* ---------- Logros ---------- */
  const ACH = {
    first: { es: 'Primera misión completada', en: 'First mission completed' }, all: { es: 'Las 7 misiones', en: 'All 7 missions' },
    fixer: { es: 'Reparaste 5 incidentes', en: 'Repaired 5 incidents' }, farmer: { es: 'Cosechaste 10 kg', en: 'Harvested 10 kg' },
    shelter: { es: 'Superaste una tormenta solar', en: 'Survived a solar storm' }, quiz: { es: '5 preguntas correctas', en: '5 correct answers' },
    mars: { es: 'Victoria en Marte', en: 'Victory on Mars' }, moon: { es: 'Victoria en la Luna', en: 'Victory on the Moon' }
  };

  /* ---------- Finales ---------- */
  const ENDT = {
    all: { es: '¡Misión cumplida! La base funciona y la tripulación puede continuar.', en: 'Mission accomplished! The base works and the crew can continue.' },
    player: { es: 'Terminaste la partida para revisar el informe.', en: 'You ended the game to review the report.' },
    o2: { es: 'Evacuación preventiva: el oxígeno se agotó y la tripulación volvió a casa en la cápsula de emergencia. Todos están bien.', en: 'Preventive evacuation: oxygen ran out and the crew returned home in the emergency capsule. Everyone is fine.' },
    water: { es: 'Misión abortada: sin agua no se puede seguir. La tripulación regresó a salvo.', en: 'Mission aborted: without water the base cannot continue. The crew returned safely.' },
    food: { es: 'Misión abortada: se acabaron los alimentos. Una nave de rescate llevó a la tripulación a casa.', en: 'Mission aborted: food ran out. A rescue ship brought the crew home.' },
    power: { es: 'Intervención de emergencia: sin energía para el soporte vital. La tripulación fue evacuada a salvo.', en: 'Emergency intervention: no power for life support. The crew was safely evacuated.' },
    press: { es: 'Evacuación preventiva: la presión bajó demasiado tiempo. Todos llegaron bien a la nave.', en: 'Preventive evacuation: pressure stayed too low. Everyone reached the ship safely.' },
    well: { es: 'El control de misión decidió traer a la tripulación de vuelta para que descanse.', en: 'Mission control decided to bring the crew home to rest.' },
    dose: { es: 'Misión abortada: la exposición estimada superó el límite del modelo. La tripulación regresa para revisión médica.', en: 'Mission aborted: estimated exposure passed the model limit. The crew returns for a medical check.' },
    inc: { es: 'Misión abortada: un incidente crítico quedó sin resolver demasiado tiempo.', en: 'Mission aborted: a critical incident stayed unresolved too long.' }
  };

  /* ---------- Tutorial ---------- */
  const TUT = [
    { i: '👩‍🚀', es: 'Eres la comandante o el comandante junior de un puesto avanzado. Muévete con WASD/flechas o con el joystick.', en: 'You are the junior commander of an outpost. Move with WASD/arrows or the joystick.' },
    { i: '🖥️', es: 'Acércate a una consola brillante y pulsa E (o el botón) para usarla.', en: 'Walk up to a glowing console and press E (or the button) to use it.' },
    { i: '📊', es: 'Arriba ves los recursos. Verde = bien, ámbar (⚠) = atención, rojo (⛔) = crítico. Toca un indicador para ver detalles.', en: 'Resources are at the top. Green = fine, amber (⚠) = careful, red (⛔) = critical. Tap one for details.' },
    { i: '🎯', es: 'Ve al Puente de mando (arriba al centro) y elige una misión. Cada decisión importante muestra sus consecuencias antes de confirmar.', en: 'Go to the Command bridge (top center) and pick a mission. Every big decision shows its consequences first.' },
    { i: '📡', es: 'Los mensajes a la Tierra tardan en llegar. ¡Planifica antes de actuar!', en: 'Messages to Earth take time. Plan before you act!' }
  ];

  return { U, ROOMS, ROLE_T, SYS_T, CROP_T, DONKI, EVT, MIS, FAILWHY, SITES, PRIOS, QUIZ, EARTH, SDG, SDG_WHY, SOURCES, ACH, ENDT, TUT };
})();

/* ---------- i18n helpers ---------- */
let LANG = 'es';
/** Modalidad: 'junior' (Explorador Junior) o 'adv' (Ingeniero de Misión). Los textos con variante técnica llevan esA/enA. */
let MODE = 'junior';
const _ = (k, p) => {
  const U = DATA.U[LANG] || {};
  let s = (MODE === 'adv' && (U[k + 'A'] != null)) ? U[k + 'A'] : U[k] != null ? U[k] : DATA.U.es[k] != null ? DATA.U.es[k] : k;
  if (p) for (const x in p) s = s.replace('{' + x + '}', p[x]);
  return s;
};
const tr = (o) => {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  if (MODE === 'adv') { const a = o[LANG + 'A']; if (a != null) return a; }
  return o[LANG] != null ? o[LANG] : o.es;
};
const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (v, d) => (Number.isFinite(v) ? v.toLocaleString(LANG === 'es' ? 'es-DO' : 'en-US', { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: 0 }) : '—');

/* ---------- Almacenamiento seguro ---------- */
const Store = (function () {
  const KEY = 'jamt.v1';
  let mem = {}, ok = false;
  try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); ok = true; const raw = localStorage.getItem(KEY); if (raw) mem = JSON.parse(raw) || {}; } catch (e) { ok = false; }
  function persist() { if (!ok) return; try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { ok = false; } }
  return {
    get ok() { return ok; },
    get: (k, d) => (mem[k] === undefined ? d : mem[k]),
    set: (k, v) => { mem[k] = v; persist(); },
    del: (k) => { delete mem[k]; persist(); }
  };
})();

/* ---------- Audio (Web Audio API, sonidos originales sintetizados) ---------- */
const Sfx = (function () {
  let ctx = null, master = null, vol = 0.6, muted = false;
  function init() {
    if (ctx) return;
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); apply(); } catch (e) { ctx = null; }
  }
  function apply() { if (master) master.gain.value = muted ? 0 : vol * 0.5; }
  function tone(f, d, type, when, g) {
    if (!ctx || muted) return;
    try {
      const t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), a = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g || 0.3, t + 0.01); a.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(a); a.connect(master); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { /* ignore */ }
  }
  const P = {
    click: () => tone(660, 0.06, 'square', 0, 0.08),
    info: () => { tone(880, 0.15, 'sine'); tone(1320, 0.2, 'sine', 0.12, 0.2); },
    warn: () => { tone(520, 0.18, 'triangle'); tone(520, 0.18, 'triangle', 0.25); },
    crit: () => { for (let i = 0; i < 3; i++) { tone(760, 0.16, 'sawtooth', i * 0.36, 0.18); tone(560, 0.16, 'sawtooth', i * 0.36 + 0.18, 0.18); } },
    ok: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'sine', i * 0.09, 0.22)); },
    bad: () => { tone(300, 0.2, 'square', 0, 0.12); tone(220, 0.3, 'square', 0.18, 0.12); },
    door: () => tone(180, 0.18, 'triangle', 0, 0.1),
    pick: () => { tone(990, 0.08, 'sine'); tone(1480, 0.1, 'sine', 0.07); },
    step: () => tone(90, 0.04, 'triangle', 0, 0.04)
  };
  return { init, play: (k) => { init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); (P[k] || P.click)(); },
    setVol: (v) => { vol = clampN(+v, 0, 1); apply(); }, setMuted: (m) => { muted = !!m; apply(); }, get muted() { return muted; }, get vol() { return vol; } };
})();
