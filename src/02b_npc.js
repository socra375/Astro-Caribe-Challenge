/* =====================================================================
   NPC — Guías, conversaciones, campaña de familiarización, contenido de
   las llamadas de alerta y fichas botánicas (es/en).
   ===================================================================== */
const NPCDATA = (function () {
  const PEOPLE = {
    control: { name: { es: 'Control de Misión', en: 'Mission Control' }, spec: { es: 'Centro de control en la Tierra', en: 'Earth control center' } },
    commander: { name: { es: 'Comandante Vega', en: 'Commander Vega' }, spec: { es: 'Comandante · objetivos y navegación', en: 'Commander · goals and navigation' } },
    engineer: { name: { es: 'Ana', en: 'Ana' }, spec: { es: 'Ingeniera · energía, reactor y rover', en: 'Engineer · power, reactor and rover' } },
    scientist: { name: { es: 'Leo', en: 'Leo' }, spec: { es: 'Científico · laboratorio y radiación', en: 'Scientist · lab and radiation' } },
    medic: { name: { es: 'Sofía', en: 'Sofía' }, spec: { es: 'Médica · soporte vital y bienestar', en: 'Medic · life support and wellbeing' } },
    agri: { name: { es: 'Teo', en: 'Teo' }, spec: { es: 'Agrónomo · invernadero y cultivos', en: 'Agronomist · greenhouse and crops' } }
  };
  // Guía de cada sección (si el jugador lleva ese traje, habla Control de Misión)
  const GUIDE = { bridge: 'commander', life: 'medic', reactor: 'engineer', water: 'medic', gh: 'agri', lab: 'scientist', rad: 'engineer' };

  // 5 pasos: presentarse · para qué sirve · sistemas · misión · cómo interactuar
  const TALK = {
    bridge: [
      { es: '¡Bienvenida, bienvenido a bordo! Te hablo desde el puente de mando: aquí se toman las decisiones de la base.', en: 'Welcome aboard! I am speaking from the command bridge: this is where base decisions are made.' },
      { es: 'Arriba tienes el HUD: oxígeno, agua, energía, protección, alimentos y bienestar. Verde es bien, ámbar ⚠ es atención y rojo ⛔ es urgente.', en: 'At the top is the HUD: oxygen, water, energy, protection, food and wellbeing. Green is fine, amber ⚠ needs attention, red ⛔ is urgent.' },
      { es: 'Aquí están la consola de mando 🖥️ (misiones y recursos), las comunicaciones 📡, la Conexión con la Tierra 🌎 y el vestuario 🧥 para cambiar de especialista.', en: 'Here are the command console 🖥️ (missions and resources), communications 📡, Earth Connection 🌎 and the wardrobe 🧥 to switch specialists.' },
      { es: 'Tu primera misión es «Activación de la colonia»: conocer el puente, el módulo de vida y el reactor. El minimapa y la flecha amarilla te guían.', en: 'Your first mission is "Colony activation": get to know the bridge, the habitation module and the reactor. The minimap and the yellow arrow guide you.' },
      { es: 'Acércate a una consola brillante y pulsa E (o el botón grande). Empieza por la consola de mando y abre la pestaña Recursos.', en: 'Walk up to a glowing console and press E (or the big button). Start with the command console and open the Resources tab.' }
    ],
    life: [
      { es: 'Hola, soy Sofía, la médica. Este es el módulo de vida, donde la tripulación duerme, come y se recupera.', en: 'Hi, I am Sofía, the medic. This is the habitation module, where the crew sleeps, eats and recovers.' },
      { es: 'Aquí cuidamos el bienestar: descanso y moral. Una tripulación cansada comete más errores.', en: 'Here we look after wellbeing: rest and morale. A tired crew makes more mistakes.' },
      { es: 'Tienes las cabinas 🛏️ para descansar, la enfermería 🩺 con el estado de cada tripulante y la sala de bienestar 🎲.', en: 'You have the bunks 🛏️ to rest, the medical bay 🩺 with each crew member\'s status, and the wellbeing corner 🎲.' },
      { es: 'Para la misión, revisa a la tripulación en la enfermería: dosis de radiación, moral y temperatura.', en: 'For the mission, check the crew at the medical bay: radiation dose, morale and temperature.' },
      { es: 'Usa E junto a la enfermería. Descansar hace pasar el tiempo: mira antes el panel de consecuencias.', en: 'Press E next to the medical bay. Resting makes time pass: check the consequences panel first.' }
    ],
    reactor: [
      { es: '¡Hola! Soy Ana, la ingeniera. Esto es el reactor y la sala de energía.', en: 'Hi! I am Ana, the engineer. This is the reactor and power room.' },
      { es: 'Sin energía no hay oxígeno, ni agua limpia, ni calefacción. Aquí se genera y se reparte toda la electricidad.', en: 'Without power there is no oxygen, clean water or heating. All electricity is generated and shared here.' },
      { es: 'Tenemos el reactor ⚛️, las baterías, los paneles solares ☀️ y el balance energético ⚖️. Si algo se desgasta, hay que repararlo.', en: 'We have the reactor ⚛️, batteries, solar panels ☀️ and the energy balance ⚖️. Worn parts need repair.' },
      { es: 'Para terminar la activación, ajusta la energía: cambia la potencia del reactor o juega al minijuego de paneles o de balance.', en: 'To finish activation, adjust power: change reactor output or play the solar panel or balance mini-game.' },
      { es: 'Pulsa E en el panel de energía. Antes de confirmar, el panel de consecuencias te dirá qué sube y qué baja.', en: 'Press E at the power panel. Before you confirm, the consequences panel tells you what goes up and down.' }
    ],
    water: [
      { es: 'Te habla Sofía otra vez. Esta es la sala de reciclaje de agua y oxígeno: el corazón del soporte vital.', en: 'Sofía again. This is the water and oxygen recycling room: the heart of life support.' },
      { es: 'Aquí el agua usada se limpia para volver a beberla, y el generador separa el agua en oxígeno e hidrógeno.', en: 'Used water is cleaned here to drink again, and the generator splits water into oxygen and hydrogen.' },
      { es: 'Sistemas: el reciclador 💧, el generador de oxígeno 🫧 y los tanques. Para 1 kg de oxígeno hacen falta 1,125 L de agua.', en: 'Systems: the recycler 💧, the oxygen generator 🫧 and the tanks. 1 kg of oxygen needs 1.125 L of water.' },
      { es: 'Misión «Recuperación del ciclo de agua»: la bomba del reciclador falló. Repárala, calibra el oxígeno y mantén el agua estable 6 horas.', en: 'Mission "Water cycle recovery": the recycler pump failed. Repair it, calibrate oxygen and keep water stable for 6 hours.' },
      { es: 'Usa E en el panel de reciclaje y pulsa «Reparar». La consola de oxígeno abre el minijuego de calibración.', en: 'Press E at the recycling panel and tap "Repair". The oxygen console opens the calibration mini-game.' }
    ],
    gh: [
      { es: '¡Hola! Soy Teo, el agrónomo. Bienvenida, bienvenido al invernadero.', en: 'Hi! I am Teo, the agronomist. Welcome to the greenhouse.' },
      { es: 'Aquí cultivamos comida fresca. Las plantas también nos alegran el día, como pasó con las zinnias de la estación espacial.', en: 'We grow fresh food here. Plants also lift our spirits, as the space station zinnias did.' },
      { es: 'Cada jardinera tiene luz LED, riego por tubos, un sensor de humedad 🟢 y tres plantas. Cada planta necesita agua, luz y nutrientes.', en: 'Each planter has LED light, drip tubes, a moisture sensor 🟢 and three plants. Each plant needs water, light and nutrients.' },
      { es: 'Misión «Primer cultivo»: siembra 3 semillas, riega una planta, añade nutrientes y cosecha la lechuga que está casi lista.', en: 'Mission "First crop": plant 3 seeds, water a plant, add nutrients and harvest the lettuce that is almost ready.' },
      { es: 'Acércate a una planta y pulsa E (o tócala). Se abrirá su ficha con sus datos y las acciones posibles.', en: 'Walk up to a plant and press E (or tap it). Its card opens with its data and possible actions.' }
    ],
    lab: [
      { es: 'Hola, soy Leo, el científico. Este es el laboratorio.', en: 'Hi, I am Leo, the scientist. This is the lab.' },
      { es: 'Aquí estudiamos muestras del suelo y del ambiente para entender dónde estamos y qué riesgos hay.', en: 'We study soil and environment samples here to understand where we are and what risks exist.' },
      { es: 'Tenemos el análisis de muestras 🔬, el espectrómetro 🌈 y el registro de investigaciones 📚.', en: 'We have sample analysis 🔬, the spectrometer 🌈 and the research log 📚.' },
      { es: 'Misión «Exploración científica»: analiza una de las muestras del aterrizaje, usa el espectrómetro y consulta el registro.', en: 'Mission "Science exploration": analyze one of the landing samples, use the spectrometer and check the log.' },
      { es: 'Pulsa E en cada consola. El análisis tarda unas horas: puedes hacer otras cosas mientras tanto.', en: 'Press E at each console. Analysis takes a few hours: you can do other things meanwhile.' }
    ],
    rad: [
      { es: 'Soy Ana de nuevo: también piloto el rover. Esta es la bahía del rover y el refugio contra la radiación.', en: 'Ana again: I also drive the rover. This is the rover bay and the radiation shelter.' },
      { es: 'Desde aquí salimos a explorar y aquí nos protegemos cuando el Sol lanza tormentas de partículas.', en: 'We head out to explore from here, and we take cover here when the Sun throws particle storms.' },
      { es: 'Sistemas: el blindaje 🛡️, el refugio con rayas amarillas, el rover 🚙, el extractor de hielo 🧊 y la esclusa 🚪.', en: 'Systems: shielding 🛡️, the yellow-striped shelter, the rover 🚙, the ice extractor 🧊 and the airlock 🚪.' },
      { es: '¡Has terminado la familiarización! Ya puedes elegir las misiones avanzadas en la consola de mando.', en: 'You finished the familiarization! You can now pick advanced missions at the command console.' },
      { es: 'Desde ahora cada sección pide su especialista. Cambia de traje en el vestuario del puente. En emergencias, cualquiera puede reparar.', en: 'From now on each section needs its specialist. Change suits at the bridge wardrobe. In emergencies, anyone can repair.' }
    ]
  };

  const CAMP = {
    c1: { t: { es: 'Activación de la colonia', en: 'Colony activation' }, b: { es: 'Conoce el puente, el módulo de vida y el reactor, y pon en marcha la energía.', en: 'Get to know the bridge, habitation module and reactor, and get power going.' } },
    c2: { t: { es: 'Recuperación del ciclo de agua', en: 'Water cycle recovery' }, b: { es: 'Repara el reciclador, calibra el oxígeno y estabiliza el agua.', en: 'Repair the recycler, calibrate oxygen and stabilize water.' } },
    c3: { t: { es: 'Primer cultivo', en: 'First crop' }, b: { es: 'Aprende a sembrar, cuidar y cosechar plantas.', en: 'Learn to plant, tend and harvest crops.' } },
    c4: { t: { es: 'Exploración científica', en: 'Science exploration' }, b: { es: 'Analiza muestras y comprende las condiciones del entorno.', en: 'Analyze samples and understand the environment.' } }
  };
  const KEY = {
    talk_bridge: { es: 'Escucha a tu guía en el puente', en: 'Listen to your guide on the bridge' },
    cmd_resources: { es: 'Abre la pestaña Recursos de la consola de mando', en: 'Open the Resources tab of the command console' },
    talk_life: { es: 'Visita el módulo de vida', en: 'Visit the habitation module' },
    med_open: { es: 'Revisa a la tripulación en la enfermería', en: 'Check the crew at the medical bay' },
    talk_reactor: { es: 'Visita el reactor', en: 'Visit the reactor' },
    power_action: { es: 'Ajusta la energía (reactor, modo emergencia o minijuego solar/balance)', en: 'Adjust power (reactor, emergency mode or solar/balance mini-game)' },
    talk_water: { es: 'Visita la sala de agua y oxígeno', en: 'Visit the water and oxygen room' },
    rec_fixed: { es: 'Repara la bomba del reciclador', en: 'Repair the recycler pump' },
    o2_cal: { es: 'Calibra el oxígeno (minijuego)', en: 'Calibrate oxygen (mini-game)' },
    water_hold: { es: 'Mantén reciclaje ≥ 78 % y agua ≥ 30 % durante 6 h', en: 'Keep recycling ≥ 78% and water ≥ 30% for 6 h' },
    talk_gh: { es: 'Visita el invernadero', en: 'Visit the greenhouse' },
    plant3: { es: 'Siembra 3 semillas', en: 'Plant 3 seeds' },
    water1: { es: 'Riega una planta', en: 'Water a plant' },
    feed1: { es: 'Añade nutrientes a una planta', en: 'Add nutrients to a plant' },
    harvest1: { es: 'Cosecha una planta madura (jardinera 1)', en: 'Harvest a mature plant (planter 1)' },
    talk_lab: { es: 'Visita el laboratorio', en: 'Visit the lab' },
    analyze1: { es: 'Analiza una muestra', en: 'Analyze a sample' },
    spec_open: { es: 'Usa el espectrómetro', en: 'Use the spectrometer' },
    log_open: { es: 'Consulta el registro de investigaciones', en: 'Check the research log' }
  };
  // Dónde guiar al jugador para cada objetivo (consola o sala)
  const KEYTARGET = { talk_bridge: 'room:bridge', cmd_resources: 'cmd', talk_life: 'room:life', med_open: 'med', talk_reactor: 'room:reactor', power_action: 'reactor',
    talk_water: 'room:water', rec_fixed: 'water', o2_cal: 'o2', water_hold: 'water', talk_gh: 'room:gh', plant3: 'plant', water1: 'plant', feed1: 'plant', harvest1: 'plant:0:0',
    talk_lab: 'room:lab', analyze1: 'lab', spec_open: 'spec', log_open: 'log' };

  // Quién informa de cada incidente
  const INC_NPC = { solar_storm: 'scientist', power_drop: 'engineer', dust_storm: 'engineer', water_fail: 'engineer', pressure_leak: 'medic', comms_blackout: 'commander',
    crop_fail: 'agri', thermal_fail: 'engineer', wear: 'engineer', sensor_drift: 'medic' };
  const INC_CONSOLE = { solar_storm: 'shield', power_drop: 'reactor', dust_storm: 'reactor', water_fail: 'water', pressure_leak: 'med', comms_blackout: 'comms', crop_fail: 'gh', thermal_fail: 'med', sensor_drift: 'o2' };
  const CONSEQ = {
    solar_storm: { es: 'La tripulación recibiría mucha más radiación y la misión podría abortarse.', en: 'The crew would get much more radiation and the mission could be aborted.' },
    power_drop: { es: 'La batería se vaciará y se apagarán sistemas, empezando por el invernadero.', en: 'The battery will drain and systems will shut down, starting with the greenhouse.' },
    dust_storm: { es: 'Los paneles casi no producirán y la batería bajará durante días.', en: 'Panels will barely produce and the battery will drop for days.' },
    water_fail: { es: 'Perderemos agua cada hora; sin agua tampoco hay oxígeno.', en: 'We will lose water every hour; without water there is no oxygen either.' },
    pressure_leak: { es: 'Se escapa aire y oxígeno; si la presión baja mucho, habrá que evacuar.', en: 'Air and oxygen escape; if pressure drops too far, we must evacuate.' },
    comms_blackout: { es: 'No recibiremos avisos ni ayuda de la Tierra hasta repararla.', en: 'We will get no warnings or help from Earth until it is fixed.' },
    crop_fail: { es: 'La plaga se extenderá y perderemos plantas y comida.', en: 'The pest will spread and we will lose plants and food.' },
    thermal_fail: { es: 'La base se enfriará: baja el bienestar y las plantas crecen peor.', en: 'The base will cool down: wellbeing drops and plants grow worse.' },
    wear: { es: 'El equipo rendirá menos y puede averiarse del todo.', en: 'The equipment will perform worse and may fail completely.' },
    sensor_drift: { es: 'El oxígeno real puede salir del rango seguro sin que el sensor lo note.', en: 'Real oxygen may leave the safe range without the sensor noticing.' }
  };
  // Alertas por recursos
  const RES = {
    o2: { npc: 'medic', console: 'water', d: { es: 'Las reservas de oxígeno están bajas', en: 'Oxygen reserves are low' }, a: { es: 'Revisa el generador de O₂ y el agua disponible; repara fugas.', en: 'Check the O₂ generator and available water; fix leaks.' }, c: { es: 'Sin oxígeno habrá que evacuar la base.', en: 'Without oxygen the base must be evacuated.' } },
    water: { npc: 'medic', console: 'water', d: { es: 'El agua del tanque está bajando', en: 'Tank water is dropping' }, a: { es: 'Sube el reciclaje, reduce el riego o activa el extractor de hielo.', en: 'Raise recycling, reduce irrigation or turn on the ice extractor.' }, c: { es: 'Sin agua no hay bebida ni oxígeno.', en: 'Without water there is no drinking water or oxygen.' } },
    power: { npc: 'engineer', console: 'reactor', d: { es: 'La batería está baja', en: 'The battery is low' }, a: { es: 'Baja las luces LED, sube el reactor u orienta los paneles.', en: 'Dim the LEDs, raise the reactor or aim the panels.' }, c: { es: 'Se apagarán sistemas y, al final, el soporte vital.', en: 'Systems will shut down and, finally, life support.' } },
    food: { npc: 'agri', console: 'gh', d: { es: 'Quedan pocos alimentos', en: 'Food is running low' }, a: { es: 'Cosecha lo que esté maduro y siembra más.', en: 'Harvest what is ripe and plant more.' }, c: { es: 'Sin comida la misión tendrá que terminar.', en: 'Without food the mission will have to end.' } },
    well: { npc: 'medic', console: 'med', d: { es: 'La tripulación está cansada y desanimada', en: 'The crew is tired and low on morale' }, a: { es: 'Resuelve las alertas, descansa y cuida la temperatura.', en: 'Resolve alerts, rest and keep the temperature right.' }, c: { es: 'Control de Misión podría ordenar el regreso.', en: 'Mission Control could order a return home.' } },
    dose: { npc: 'scientist', console: 'shield', d: { es: 'La dosis de radiación acumulada es alta', en: 'Accumulated radiation dose is high' }, a: { es: 'Refuerza el blindaje y usa el refugio en las tormentas.', en: 'Reinforce shielding and use the shelter during storms.' }, c: { es: 'Si supera el límite del modelo, la misión se aborta.', en: 'If it passes the model limit, the mission is aborted.' } }
  };
  const RES_ROOM = { o2: 'water', water: 'water', power: 'reactor', food: 'gh', well: 'life', dose: 'rad' };

  // Fichas botánicas (dato real con fuente + necesidades)
  const PLANT = {
    romaine: { needs: { es: 'Luz media-alta, riego constante sin encharcar y nutrientes moderados. Prefiere temperaturas frescas (~20 °C).', en: 'Medium-high light, steady moisture without waterlogging, moderate nutrients. Likes cool temperatures (~20 °C).' }, fact: { es: 'En 2015 los astronautas de la ISS comieron por primera vez lechuga romana roja cultivada en el espacio (sistema Veggie de NASA).', en: 'In 2015 ISS astronauts first ate red romaine lettuce grown in space (NASA Veggie system).' } },
    mizuna: { needs: { es: 'Crece rápido con luz media. Sus hojas finas y dentadas pierden agua deprisa: vigila la humedad.', en: 'Grows fast with medium light. Its thin, toothed leaves lose water quickly: watch moisture.' }, fact: { es: 'La mizuna, una mostaza japonesa, fue uno de los cultivos de hoja del sistema Veggie de la ISS.', en: 'Mizuna, a Japanese mustard green, was one of the leafy crops in the ISS Veggie system.' } },
    radish: { needs: { es: 'Necesita buena luz y humedad regular; la raíz engorda en las últimas etapas. Exceso de agua = raíces que se pudren.', en: 'Needs good light and regular moisture; the root swells in the last stages. Too much water = rotting roots.' }, fact: { es: 'En 2020 se cultivaron rábanos en el Advanced Plant Habitat de la ISS (experimento Plant Habitat-02).', en: 'In 2020 radishes were grown in the ISS Advanced Plant Habitat (Plant Habitat-02 experiment).' } },
    chili: { needs: { es: 'Mucha luz, calor (~24 °C) y muchos nutrientes. Podar ayuda a que dé frutos.', en: 'Lots of light, warmth (~24 °C) and plenty of nutrients. Pruning helps it fruit.' }, fact: { es: 'En 2021 la tripulación de la ISS cultivó y probó chiles «Española Improved» (experimento Plant Habitat-04).', en: 'In 2021 the ISS crew grew and tasted "Española Improved" chiles (Plant Habitat-04 experiment).' } },
    zinnia: { needs: { es: 'Luz alta y humedad controlada: el exceso de agua la enferma. No es comestible, pero mejora la moral.', en: 'High light and controlled moisture: too much water makes it sick. Not edible, but it boosts morale.' }, fact: { es: 'En 2016 floreció una zinnia en la ISS; antes hubo que salvarla de hongos causados por exceso de humedad.', en: 'In 2016 a zinnia bloomed on the ISS; it first had to be saved from mold caused by excess humidity.' } }
  };
  const ACCESS = { cmd: ['commander'], comms: ['commander'], med: ['medic'], gh: ['agri'], plant: ['agri'], reactor: ['engineer'], solar: ['engineer'], balance: ['engineer'],
    water: ['engineer', 'medic'], o2: ['medic', 'engineer'], shield: ['scientist', 'engineer'], rover: ['engineer'], isru: ['engineer'], lab: ['scientist'], spec: ['scientist'], log: ['scientist'] };

  return { PEOPLE, GUIDE, TALK, CAMP, KEY, KEYTARGET, INC_NPC, INC_CONSOLE, CONSEQ, RES, RES_ROOM, PLANT, ACCESS };
})();
