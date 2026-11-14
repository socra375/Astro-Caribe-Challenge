/* =====================================================================
   LEVELS — Dos niveles de lenguaje sobre el mismo contenido científico.
   Base (es/en) = Explorador Junior: palabras cotidianas, una idea por frase.
   esA/enA     = Ingeniero de Misión: terminología, unidades, relaciones.
   lv(): el texto técnico existente pasa a esA/enA y se escribe el junior.
   av(): se añade la variante técnica sin tocar el texto base.
   ===================================================================== */
(function () {
  const lv = (o, es, en) => { o.esA = o.es; o.enA = o.en; o.es = es; o.en = en; };
  const av = (o, es, en) => { o.esA = es; o.enA = en; };

  /* ---------- Eventos: ¿Por qué ocurrió? ---------- */
  const EVJ = {
    solar_storm: [
      ['El Sol lanzó un chorro de partículas hacia la base.', 'The Sun sent a stream of particles toward the base.'],
      ['A veces el Sol suelta partículas muy rápidas. Aquí no hay aire que nos proteja, solo las paredes.', 'Sometimes the Sun throws out very fast particles. There is no air here to protect us, only the walls.'],
      ['Activa el protocolo de refugio y métete en el refugio.', 'Turn on the shelter protocol and go into the shelter.'],
      ['Un aviso del Sol no es lo mismo que la radiación que recibes: depende de dónde estés y de cuánto te protejas.', 'A warning from the Sun is not the same as the radiation you get: it depends on where you are and how well you are protected.']],
    power_drop: [
      ['Los paneles solares reciben poca luz.', 'The solar panels get little light.'],
      ['Cerca del polo de la Luna el Sol está muy bajo y las montañas hacen sombras largas.', 'Near the Moon\'s pole the Sun is very low and mountains cast long shadows.'],
      ['Apaga las luces de las plantas, sube el reactor o gira los paneles.', 'Turn off the plant lights, raise the reactor or turn the panels.'],
      ['Algunos puntos altos del borde del cráter casi siempre tienen luz, pero no todo el tiempo.', 'Some high points on the crater rim are lit almost always, but not all the time.']],
    dust_storm: [
      ['El polvo tapa el Sol y ensucia los paneles.', 'Dust blocks the Sun and dirties the panels.'],
      ['En Marte el viento levanta polvo muy fino que flota durante semanas.', 'On Mars the wind lifts very fine dust that floats for weeks.'],
      ['Ahorra energía, usa el reactor y limpia los paneles al terminar.', 'Save power, use the reactor and clean the panels afterwards.'],
      ['En 2018 una tormenta de polvo dejó sin energía al robot Opportunity: dejó de comunicarse el 10 de junio.', 'In 2018 a dust storm left the Opportunity robot without power: it stopped communicating on 10 June.']],
    water_fail: [
      ['La máquina que recupera el agua se atascó y recupera menos.', 'The machine that recovers water got stuck and recovers less.'],
      ['Con el uso, los filtros y los tubos se ensucian.', 'With use, filters and pipes get dirty.'],
      ['Repara la bomba en la sala de agua y riega menos mientras tanto.', 'Repair the pump in the water room and water less meanwhile.'],
      ['La Estación Espacial recupera casi toda su agua: más de 9 de cada 10 litros.', 'The Space Station recovers almost all its water: more than 9 out of every 10 liters.']],
    pressure_leak: [
      ['Se escapa un poco de aire del módulo de vida.', 'A little air is leaking from the habitation module.'],
      ['Con el frío y el calor los materiales se mueven y las juntas se gastan.', 'Hot and cold make materials move and seals wear out.'],
      ['Repara la fuga en el módulo de vida. Mientras tanto se pierde oxígeno.', 'Fix the leak in the habitation module. Oxygen is lost meanwhile.'],
      ['La Estación Espacial mantiene el aire como al nivel del mar.', 'The Space Station keeps its air like at sea level.']],
    comms_blackout: [
      ['La antena perdió la conexión con la Tierra.', 'The antenna lost its link with Earth.'],
      ['Una avería, el polvo o el Sol entre la Tierra y Marte pueden cortar la señal.', 'A fault, dust or the Sun between Earth and Mars can cut the signal.'],
      ['Repara la antena en el puente o sigue los pasos de emergencia sin esperar ayuda.', 'Repair the antenna on the bridge or follow emergency steps without waiting for help.'],
      ['Cada dos años Marte queda detrás del Sol y casi no se le puede hablar durante unas dos semanas.', 'Every two years Mars goes behind the Sun and we can hardly talk to it for about two weeks.']],
    crop_fail: [
      ['Algunas plantas se pusieron enfermas.', 'Some plants got sick.'],
      ['En un lugar cerrado, los bichitos y los hongos se esparcen rápido.', 'In a closed place, bugs and mold spread fast.'],
      ['Identifica el problema y poda las hojas afectadas.', 'Identify the problem and prune the affected leaves.'],
      ['En 2016 unas zinnias de la Estación Espacial se enfermaron por demasiada humedad y los astronautas las salvaron.', 'In 2016 some zinnias on the Space Station got sick from too much humidity and the astronauts saved them.']],
    thermal_fail: [
      ['La calefacción funciona a medias.', 'The heating works only halfway.'],
      ['Afuera hace muchísimo frío y el calor se escapa si falla.', 'It is extremely cold outside and heat escapes if it fails.'],
      ['Repara el control de temperatura en el módulo de vida.', 'Repair temperature control in the habitation module.'],
      ['Marte tiene unos 63 grados bajo cero de media. En algunos cráteres de la Luna hace más de 200 bajo cero.', 'Mars averages about 63 degrees below zero. In some Moon craters it is more than 200 below zero.']],
    wear: [
      ['Una máquina rinde menos porque se gastó.', 'A machine works worse because it wore out.'],
      ['El polvo, los cambios de temperatura y el uso desgastan las piezas.', 'Dust, temperature changes and use wear out parts.'],
      ['Repárala o haz mantenimiento (usa materiales).', 'Repair it or do maintenance (uses materials).'],
      ['El polvo de la Luna es fino y raspa: los astronautas del Apolo contaron que dañaba trajes y juntas.', 'Moon dust is fine and scratchy: Apollo astronauts said it damaged suits and seals.']],
    sensor_drift: [
      ['El aparato mide mal el oxígeno.', 'The device measures oxygen wrongly.'],
      ['Los sensores se desajustan con el tiempo y hay que calibrarlos.', 'Sensors drift over time and must be calibrated.'],
      ['Calibra el oxígeno en la sala de agua.', 'Calibrate oxygen in the water room.'],
      ['El aire normal tiene unas 21 partes de oxígeno de cada 100.', 'Normal air has about 21 parts of oxygen in every 100.']]
  };
  for (const ty in EVJ) { const E = DATA.EVT[ty], J = EVJ[ty]; ['what', 'cause', 'act', 'data'].forEach((k, i) => lv(E[k], J[i][0], J[i][1])); }

  /* ---------- Misiones ---------- */
  const MJ = {
    1: { b: ['La máquina que recicla el agua falla. Mantén el aire y el agua bien durante un día.', 'The water recycling machine is failing. Keep the air and water healthy for a day.'],
      v: [['Aire y agua en verde durante 24 horas seguidas.', 'Air and water in green for 24 hours in a row.'], ['Pon el reciclador en modo máximo y mantén aire y agua en verde 24 horas.', 'Set the recycler to max mode and keep air and water green for 24 hours.']],
      l: ['Cuánto gastamos, qué reciclamos y qué guardamos.', 'How much we use, what we recycle and what we save.'] },
    2: { b: ['Llega poca luz a los paneles y el reactor está dañado. Ahorra energía para que lo importante nunca se apague.', 'Little light reaches the panels and the reactor is damaged. Save power so the important things never go off.'],
      v: [['Durante 12 horas: batería con carga y soporte vital encendido. Repara el reactor.', 'For 12 hours: battery charged and life support on. Repair the reactor.'], ['Igual, pero prueba el minijuego de repartir la energía.', 'Same, but try the energy sharing mini-game.']],
      l: ['De dónde sale la energía, cómo se guarda y qué es lo primero que hay que cuidar.', 'Where energy comes from, how it is stored and what to protect first.'] },
    3: { b: ['El Sol va a lanzar partículas, como pasó de verdad hace años. ¡Prepárate!', 'The Sun will throw particles, like it really did years ago. Get ready!'],
      v: [['Activa el refugio antes de que lleguen y quédate dentro.', 'Turn on the shelter before they arrive and stay inside.'], ['Igual, y mantén encendido lo importante.', 'Same, and keep the important things running.']],
      l: ['Las tormentas del Sol, la radiación y cómo protegerse.', 'Storms from the Sun, radiation and how to stay safe.'] },
    4: { b: ['Elige el mejor lugar para explorar según lo que se pide.', 'Choose the best place to explore for what is asked.'],
      v: [['Compara los lugares y elige el mejor para lo que se pide.', 'Compare the places and pick the best for what is asked.'], ['Igual, con otro pedido.', 'Same, with another request.']],
      l: ['Cómo se elige un buen lugar: suelo, luz y riesgos.', 'How to choose a good place: ground, light and risks.'] },
    5: { b: ['Las paredes del escudo están gastadas y el refugio es chico. Mejóralos con materiales.', 'The shield walls are worn and the shelter is small. Improve them with materials.'],
      v: [['Escudo más fuerte y refugio para casi todos, sin quedarte sin batería.', 'Stronger shield and a shelter for almost everyone, without running out of battery.'], ['Escudo al máximo y refugio mediano, sin quedarte sin batería.', 'Maximum shield and a medium shelter, without running out of battery.']],
      l: ['Cómo protegen las paredes, los materiales y los refugios.', 'How walls, materials and shelters protect.'] },
    6: { b: ['Siembra, riega y da luz a las plantas. Cada planta tarda 7 días del juego.', 'Plant, water and light the plants. Each plant takes 7 game days.'],
      v: [['Cosecha al menos 5 kilos de comida.', 'Harvest at least 5 kilos of food.'], ['Cosecha al menos 7 kilos con 2 plantas distintas.', 'Harvest at least 7 kilos with 2 different plants.']],
      l: ['Qué necesitan las plantas: agua, luz y abono.', 'What plants need: water, light and nutrients.'] },
    7: { b: ['Conduce el rover, recoge piedras y vuelve a la base. La antena falla: ¿esperas ayuda o decides tú?', 'Drive the rover, collect rocks and come back. The antenna is failing: do you wait for help or decide yourself?'],
      v: [['Recoge las muestras pedidas y vuelve con batería.', 'Collect the requested samples and return with battery left.'], ['Igual, aunque falle la comunicación.', 'Same, even if communication fails.']],
      l: ['Cómo exploran los robots y por qué la Tierra tarda en contestar.', 'How robots explore and why Earth is slow to answer.'] }
  };
  const MSJ = {
    1: [['Ve a la sala de agua y aire.', 'Go to the water and air room.'], ['Arregla la bomba (minijuego de cables).', 'Fix the pump (wire mini-game).'], ['Elige el modo del reciclador y el riego.', 'Pick the recycler mode and watering.'], ['Espera un día mirando los indicadores.', 'Wait a day watching the meters.']],
    2: [['Ve a la sala del reactor.', 'Go to the reactor room.'], ['Arregla el reactor (cables).', 'Fix the reactor (wires).'], ['Apaga luces de plantas o usa el modo de emergencia.', 'Turn off plant lights or use emergency mode.'], ['Gira los paneles solares.', 'Turn the solar panels.']],
    3: [['Abre «Blindaje y refugio» en la bahía del rover.', 'Open "Shielding & shelter" in the rover bay.'], ['Activa el protocolo de refugio.', 'Turn on the shelter protocol.'], ['Métete tú también en el refugio (zona amarilla).', 'Walk into the shelter yourself (yellow zone).'], ['Espera a que pase la tormenta.', 'Wait for the storm to pass.']],
    4: [['Abre la consola de mando, pestaña Misiones.', 'Open the command console, Missions tab.'], ['Lee qué se pide.', 'Read what is asked.'], ['Compara los lugares y elige.', 'Compare the places and choose.']],
    5: [['Ve a la bahía del rover, consola de escudo.', 'Go to the rover bay, shield console.'], ['Refuerza el escudo.', 'Reinforce the shield.'], ['Amplía el refugio.', 'Expand the shelter.'], ['¿Faltan materiales? Recicla basura o explora con el rover.', 'Short of materials? Recycle waste or explore with the rover.']],
    6: [['Ve al invernadero.', 'Go to the greenhouse.'], ['Siembra en los huecos vacíos.', 'Plant in the empty slots.'], ['Ajusta la luz y el agua.', 'Adjust light and water.'], ['Acelera el tiempo (x4) y cosecha.', 'Speed up time (x4) and harvest.']],
    7: [['(Opcional) Pide a la Tierra una ruta segura; tardará en llegar.', '(Optional) Ask Earth for a safe route; it will take time.'], ['Ve a la bahía del rover.', 'Go to the rover bay.'], ['Conduce, esquiva rocas y recoge muestras.', 'Drive, dodge rocks and collect samples.'], ['Vuelve antes de que se acabe la batería.', 'Return before the battery runs out.']]
  };
  for (const id in MJ) {
    const M = DATA.MIS[id], J = MJ[id];
    lv(M.brief, J.b[0], J.b[1]);
    J.v.forEach((x, i) => lv(M.vars[i], x[0], x[1]));
    lv(M.steps, MSJ[id].map((x) => x[0]), MSJ[id].map((x) => x[1]));
    lv(M.learn, J.l[0], J.l[1]);
  }

  /* ---------- Conversaciones: Junior en palabras cotidianas, Ingeniero con terminología ---------- */
  const T = NPCDATA.TALK;
  lv(T.bridge[1], 'Arriba ves los indicadores: aire, agua, energía y comida. Verde es bien, amarillo es cuidado y rojo es urgente.', 'At the top you see the meters: air, water, power and food. Green is fine, yellow is careful and red is urgent.');
  av(T.bridge[1], 'El HUD muestra O₂, H₂O, energía, radiación, alimentos y bienestar con umbrales de advertencia (ámbar) y críticos (rojo). Pulsa un indicador para ver valores, producción y consumo.', 'The HUD shows O₂, H₂O, power, radiation, food and wellbeing with warning (amber) and critical (red) thresholds. Tap a meter for values, production and use.');
  av(T.life[1], 'Aquí se monitoriza el bienestar de la tripulación: moral y descanso dependen de temperatura, presión, composición del aire, alimentos y alertas activas.', 'Crew wellbeing is monitored here: morale and rest depend on temperature, pressure, air composition, food and active alerts.');
  av(T.reactor[1], 'El reactor, los paneles solares y la batería alimentan cuatro niveles de prioridad. Si la demanda supera la generación más la descarga de la batería, se recorta primero lo menos esencial.', 'The reactor, solar panels and battery feed four priority levels. If demand exceeds generation plus battery discharge, the least essential load is shed first.');
  lv(T.water[1], 'Aquí el agua usada se limpia para volver a beberla, y otra máquina saca oxígeno del agua.', 'Used water is cleaned here to drink again, and another machine gets oxygen from water.');
  lv(T.water[2], 'Tenemos el reciclador, el generador de oxígeno y los tanques. Sin agua no hay aire: por eso cuidamos cada gota.', 'We have the recycler, the oxygen generator and the tanks. Without water there is no air: that is why we save every drop.');
  av(T.water[1], 'El procesador recupera agua con eficiencia del 85–93 %; el generador de O₂ la divide por electrólisis (2 H₂O → 2 H₂ + O₂).', 'The processor recovers water at 85–93% efficiency; the O₂ generator splits it by electrolysis (2 H₂O → 2 H₂ + O₂).');
  av(T.water[2], 'Sistemas: reciclador, generador de O₂ y depósitos. Estequiometría: 1 kg de O₂ consume 1,125 L de agua más electricidad.', 'Systems: recycler, O₂ generator and tanks. Stoichiometry: 1 kg of O₂ consumes 1.125 L of water plus electricity.');
  lv(T.lab[1], 'Aquí miramos piedras y polvo para saber dónde estamos y qué peligros hay.', 'Here we look at rocks and dust to learn where we are and what dangers exist.');
  av(T.lab[1], 'Se analizan muestras de regolito y datos ambientales para caracterizar el entorno y sus riesgos.', 'Regolith samples and environmental data are analyzed to characterize the environment and its risks.');
  av(T.rad[1], 'Desde aquí se opera el rover y se gestiona el blindaje: el espesor reduce más las partículas de tormentas solares que los rayos cósmicos galácticos.', 'The rover is run from here and shielding is managed: thickness stops solar-storm particles better than galactic cosmic rays.');

  lv(T.lab[2], 'Tenemos la mesa de análisis, el lector de colores y el cuaderno de investigaciones.', 'We have the analysis table, the color reader and the research notebook.');
  lv(T.lab[3], 'Misión «Exploración científica»: analiza una muestra, usa el lector de colores y mira el cuaderno.', 'Mission "Science exploration": analyze a sample, use the color reader and check the notebook.');
  lv(NPCDATA.KEY.spec_open, 'Usa el lector de colores', 'Use the color reader');
  lv(DATA.QUIZ[3].q, 'Si el Sol lanza una tormenta, ¿recibes toda esa radiación sí o sí?', 'If the Sun throws a storm, do you always get all that radiation?');
  lv(DATA.QUIZ[3].why, 'Un aviso del Sol cuenta lo que pasa en el Sol. Lo que recibes depende de dónde estés y de cómo te protejas.', 'A warning from the Sun tells what happens on the Sun. What you receive depends on where you are and how you protect yourself.');

  /* ---------- Alertas por recursos ---------- */
  const RJ = { o2: [['Se está acabando el aire', 'The air is running low'], ['Revisa la máquina de oxígeno y que haya agua; arregla las fugas.', 'Check the oxygen machine and that there is water; fix leaks.'], ['Sin aire habría que irse de la base.', 'Without air we would have to leave the base.']],
    water: [['Queda poca agua', 'Water is running low'], ['Recicla más agua, riega menos o saca agua del hielo.', 'Recycle more water, water less or get water from ice.'], ['Sin agua no podemos beber ni hacer aire.', 'Without water we cannot drink or make air.']],
    power: [['La batería está baja', 'The battery is low'], ['Apaga las luces de las plantas, sube el reactor o gira los paneles.', 'Turn off the plant lights, raise the reactor or turn the panels.'], ['Se apagarán máquinas, y al final las más importantes.', 'Machines will shut down, and in the end the most important ones.']],
    food: [['Queda poca comida', 'Food is running low'], ['Cosecha lo que esté maduro y siembra más.', 'Harvest what is ripe and plant more.'], ['Sin comida la misión termina.', 'Without food the mission ends.']],
    well: [['La tripulación está cansada', 'The crew is tired'], ['Arregla las alertas, descansa y cuida la temperatura.', 'Fix the alerts, rest and keep the temperature right.'], ['Control podría pedir que volvamos.', 'Control could ask us to come back.']],
    dose: [['Hemos recibido bastante radiación', 'We have received a lot of radiation'], ['Refuerza el escudo y usa el refugio en las tormentas.', 'Reinforce the shield and use the shelter in storms.'], ['Si pasamos el límite del juego, la misión termina.', 'If we pass the game limit, the mission ends.']] };
  for (const k in RJ) { const R = NPCDATA.RES[k]; ['d', 'a', 'c'].forEach((f, i) => lv(R[f], RJ[k][i][0], RJ[k][i][1])); }

  /* ---------- Fichas botánicas ---------- */
  const PJ = { romaine: ['Le gusta la luz, el agua sin encharcar y la tierra con abono. Prefiere el fresquito.', 'It likes light, water without flooding and fed soil. It prefers cool weather.'],
    mizuna: ['Crece rápido. Sus hojitas finas se secan pronto: vigila el agua.', 'It grows fast. Its thin leaves dry quickly: watch the water.'],
    radish: ['Quiere buena luz y agua pareja; la raíz roja engorda al final. Con demasiada agua se pudre.', 'It wants good light and even water; the red root swells at the end. Too much water rots it.'],
    chili: ['Necesita mucha luz, calorcito y mucho abono. Podarla ayuda a que dé chiles.', 'It needs lots of light, warmth and plenty of nutrients. Pruning helps it make chilies.'],
    zinnia: ['Quiere mucha luz y no demasiada agua: si se encharca se enferma. No se come, pero alegra.', 'It wants lots of light and not too much water: it gets sick if waterlogged. Not edible, but cheerful.'] };
  for (const sp in PJ) lv(NPCDATA.PLANT[sp].needs, PJ[sp][0], PJ[sp][1]);

  /* ---------- Preguntas: Junior (causa-efecto) y Avanzado (razonar con datos) ---------- */
  DATA.QUIZ_A = {
    1: { q: { es: 'El sistema procesa 17,5 L/día de agua usada con una recuperación del 85 %. ¿Cuánta agua se pierde al día?', en: 'The system processes 17.5 L/day of used water at 85% recovery. How much water is lost per day?' },
      o: [{ es: 'Unos 2,6 L: es el 15 % que no se recupera', en: 'About 2.6 L: the 15% that is not recovered' }, { es: 'Unos 14,9 L: es lo que sí se recupera', en: 'About 14.9 L: what is recovered' }, { es: 'Nada: el reciclaje es siempre del 100 %', en: 'None: recycling is always 100%' }], a: 0,
      why: { es: 'Pérdida = consumo × (1 − eficiencia) = 17,5 × 0,15 ≈ 2,6 L/día. Subir la eficiencia unos puntos ahorra mucha agua en semanas.', en: 'Loss = use × (1 − efficiency) = 17.5 × 0.15 ≈ 2.6 L/day. A few efficiency points save a lot of water over weeks.' } },
    2: { q: { es: 'Generación 4,7 kW, demanda 10 kW y batería de 90 kWh. ¿Cuánto aguanta aproximadamente y qué decisión es más razonable?', en: 'Generation 4.7 kW, demand 10 kW and a 90 kWh battery. About how long does it last and what is the most reasonable decision?' },
      o: [{ es: 'Unas 17 h; recortar las cargas de prioridad 4 y reparar el reactor', en: 'About 17 h; shed priority-4 loads and repair the reactor' }, { es: 'Unas 90 h; no hace falta hacer nada', en: 'About 90 h; nothing needs to be done' }, { es: 'Unas 2 h; apagar el soporte vital', en: 'About 2 h; shut down life support' }], a: 0,
      why: { es: 'Déficit 5,3 kW → 90 kWh ÷ 5,3 kW ≈ 17 h. Se protege primero lo esencial y se actúa sobre la generación (reactor) y la demanda no esencial.', en: 'Deficit 5.3 kW → 90 kWh ÷ 5.3 kW ≈ 17 h. Essentials are protected first, then generation (reactor) and non-essential demand are tackled.' } },
    3: { q: { es: 'Un evento de DONKI clase X aparece en el catálogo. ¿Qué dato necesitas para estimar tu dosis?', en: 'A class-X DONKI event appears in the catalog. What data do you need to estimate your dose?' },
      o: [{ es: 'Tu ubicación y el blindaje (y la duración del evento)', en: 'Your location and shielding (and the event duration)' }, { es: 'Solo la letra de la clase', en: 'Only the class letter' }, { es: 'Ninguno: la dosis es la misma para todos', en: 'None: the dose is the same for everyone' }], a: 0,
      why: { es: 'El catálogo describe el fenómeno solar, no la exposición. La dosis depende del flujo de partículas, la duración y la protección interpuesta.', en: 'The catalog describes the solar phenomenon, not exposure. Dose depends on particle flux, duration and the shielding in between.' } },
    4: { q: { es: 'Para una base solar a largo plazo, ¿qué sitio es mejor: iluminación 5/5 y pendiente 2/5, o iluminación 1/5 y pendiente 4/5? Justifícalo.', en: 'For a long-term solar base, which site is better: lighting 5/5 and slope 2/5, or lighting 1/5 and slope 4/5? Justify it.' },
      o: [{ es: 'El primero: la energía solar depende sobre todo de la iluminación y la pendiente se puede ingenierizar', en: 'The first: solar power depends mostly on lighting and slope can be engineered' }, { es: 'El segundo: el terreno plano siempre pesa más', en: 'The second: flat ground always counts more' }, { es: 'Da igual: no cambian la energía', en: 'No difference: they do not change power' }], a: 0,
      why: { es: 'La ponderación depende del objetivo: para energía, la iluminación domina. Para aterrizar una nave pesada, la pendiente pesaría más.', en: 'Weighting depends on the goal: for power, lighting dominates. For landing a heavy craft, slope would weigh more.' } },
    5: { q: { es: 'Con la misma masa de blindaje, ¿qué reduce más: las partículas de una tormenta solar o los rayos cósmicos galácticos?', en: 'With the same shielding mass, which is reduced more: solar-storm particles or galactic cosmic rays?' },
      o: [{ es: 'Las partículas solares, que son menos energéticas', en: 'Solar particles, which are less energetic' }, { es: 'Los rayos cósmicos, que son menos energéticos', en: 'Cosmic rays, which are less energetic' }, { es: 'Los dos por igual', en: 'Both equally' }], a: 0,
      why: { es: 'Los protones de tormentas solares tienen menor energía y se frenan en pocos centímetros de material; los rayos cósmicos penetran más y generan partículas secundarias.', en: 'Solar-storm protons are less energetic and stop in a few centimeters of material; cosmic rays penetrate more and make secondary particles.' } },
    6: { q: { es: 'Subes la luz LED de una jardinera del 60 % al 100 %. ¿Qué efecto esperas en el sistema?', en: 'You raise a planter LED from 60% to 100%. What system effect do you expect?' },
      o: [{ es: 'Más crecimiento hasta el límite de la especie y +0,24 kW de demanda', en: 'More growth up to the species limit and +0.24 kW of demand' }, { es: 'Más crecimiento sin ningún coste', en: 'More growth at no cost' }, { es: 'Menos consumo de agua', en: 'Lower water use' }], a: 0,
      why: { es: 'La luz solo ayuda hasta cubrir la necesidad de la especie; más allá solo gasta energía. 0,6 kW × 0,4 = 0,24 kW por jardinera.', en: 'Light only helps up to the species need; beyond that it only wastes energy. 0.6 kW × 0.4 = 0.24 kW per planter.' } },
    7: { q: { es: 'Con un retraso de ida de 12 min, ¿cuánto tardas como mínimo en recibir una respuesta y qué implica para operar un rover?', en: 'With a 12 min one-way delay, what is the minimum time to get a reply and what does it mean for driving a rover?' },
      o: [{ es: '24 min; hay que planificar con antelación y dar autonomía al rover', en: '24 min; plan ahead and give the rover autonomy' }, { es: '12 min; se puede conducir en tiempo real', en: '12 min; it can be driven in real time' }, { es: '0 min: las ondas viajan instantáneamente', en: '0 min: waves travel instantly' }], a: 0,
      why: { es: 'Ida y vuelta = 2 × 12 = 24 min (más el tiempo de proceso). Por eso los rovers de Marte siguen planes enviados antes y navegan de forma autónoma.', en: 'Round trip = 2 × 12 = 24 min (plus processing). That is why Mars rovers follow plans sent earlier and navigate autonomously.' } }
  };
})();
