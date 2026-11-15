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
  const GUIDE = { bridge: 'commander', life: 'medic', med: 'medic', reactor: 'engineer', water: 'medic', gh: 'agri', lab: 'scientist', rad: 'engineer', food: 'agri', kitchen: 'medic', samples: 'scientist', workshop: 'engineer', waste: 'engineer' };

  // 5 pasos: presentarse · para qué sirve · sistemas · misión · cómo interactuar
  const TALK = {
    med: [
      { es: 'Soy Sofía. Esta es la enfermería: aquí revisamos cómo está la tripulación.', en: 'I am Sofía. This is the sick bay: here we check how the crew is doing.' },
      { es: 'Miramos el ánimo, el descanso y la radiación recibida. Si alguien está mal, lo vemos aquí primero.', en: 'We look at morale, rest and the radiation received. If someone is struggling, we see it here first.' },
      { es: 'La consola 🩺 muestra el estado de cada persona. Son datos del juego, no diagnósticos médicos reales.', en: 'The 🩺 console shows each person\'s status. These are game data, not real medical diagnoses.' }
    ],
    food: [
      { es: '¡Hola! Soy Teo. Este es el almacén de alimentos, separado del invernadero.', en: 'Hi! I am Teo. This is the food storage, separate from the greenhouse.' },
      { es: 'Aquí entran las cosechas y las raciones de reserva. Lo fresco se estropea antes que lo envasado, sobre todo sin frío.', en: 'Harvests and reserve rations come in here. Fresh food spoils sooner than packed food, especially without cold.' },
      { es: 'En la consola 🧺 ves cuánta comida queda, para cuántos días, y puedes encender o apagar el frío. Es un modelo simplificado.', en: 'At the 🧺 console you see how much food is left, for how many days, and you can turn the cold on or off. It is a simplified model.' },
      { es: 'Tu misión: abre la consola del almacén y mira las reservas. Después te abro la cocina.', en: 'Your mission: open the storage console and check the supplies. Then I will open the kitchen for you.' }
    ],
    kitchen: [
      { es: 'Soy Sofía otra vez. Esta es la cocina y el comedor.', en: 'Sofía again. This is the kitchen and mess.' },
      { es: 'Comer bien mantiene el ánimo. Aquí eliges el tamaño de las raciones y preparas comidas con recetas sencillas.', en: 'Eating well keeps morale up. Here you choose ration size and prepare meals with simple recipes.' },
      { es: 'Planificar es clave: raciones pequeñas ahorran comida pero cansan; las grandes animan pero gastan más.', en: 'Planning is key: small rations save food but tire people; large ones cheer them up but use more.' },
      { es: 'Tu misión: prepara una comida en la consola 🥗. Una ensalada fresca o una ración caliente valen.', en: 'Your mission: prepare a meal at the 🥗 console. A fresh salad or a hot ration both work.' }
    ],
    samples: [
      { es: 'Soy Leo. Este es el almacén de muestras: aquí llegan las muestras que trae el rover.', en: 'I am Leo. This is the sample storage: samples brought by the rover arrive here.' },
      { es: 'Cada muestra tiene un identificador, su origen, la fecha y su estado. Si no se guarda a tiempo, se deteriora.', en: 'Every sample has an ID, an origin, a date and a condition. If it is not stored in time, it degrades.' },
      { es: 'Son muestras ficticias del juego, no muestras reales de la NASA. Se clasifican, se guardan y se mandan al laboratorio.', en: 'These are fictional game samples, not real NASA samples. They are classified, stored and sent to the lab.' },
      { es: 'Tu misión: clasifica y guarda una muestra en la consola 🧪.', en: 'Your mission: classify and store one sample at the 🧪 console.' }
    ],
    workshop: [
      { es: 'Soy Ana. Este es el taller de mantenimiento.', en: 'I am Ana. This is the maintenance workshop.' },
      { es: 'Aquí se fabrican repuestos con los materiales de la base. Con un repuesto a mano, el mantenimiento es más rápido y no gasta materiales.', en: 'Spare parts are made here from the base materials. With a part at hand, maintenance is faster and uses no materials.' },
      { es: 'Tu misión: fabrica un repuesto en la consola 🛠. Cuesta 6 kg de materiales y unas horas.', en: 'Your mission: make a spare part at the 🛠 console. It costs 6 kg of materials and a few hours.' }
    ],
    waste: [
      { es: 'Ana de nuevo. Esto es la gestión de residuos.', en: 'Ana again. This is waste management.' },
      { es: 'Nada se tira: separamos, clasificamos y reciclamos los residuos para recuperar materiales. Es economía circular.', en: 'Nothing is thrown away: we sort, classify and recycle waste to recover materials. That is circular economy.' },
      { es: 'Tu misión: en la consola ♻️ separa un lote de residuos y luego recíclalo. Separar antes rinde más.', en: 'Your mission: at the ♻️ console sort a batch of waste and then recycle it. Sorting first gives more.' }
    ],
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
    x1: { t: { es: 'Almacén de alimentos', en: 'Food storage' }, b: { es: 'Conoce el almacén y consulta las reservas de comida.', en: 'Get to know the storage and check the food supplies.' } },
    x2: { t: { es: 'Cocina y comedor', en: 'Kitchen & mess' }, b: { es: 'Planifica las raciones y prepara una comida.', en: 'Plan the rations and prepare a meal.' } },
    x3: { t: { es: 'Almacén de muestras', en: 'Sample storage' }, b: { es: 'Clasifica y guarda una muestra.', en: 'Classify and store a sample.' } },
    x4: { t: { es: 'Taller de mantenimiento', en: 'Maintenance workshop' }, b: { es: 'Fabrica un repuesto.', en: 'Make a spare part.' } },
    x5: { t: { es: 'Gestión de residuos', en: 'Waste management' }, b: { es: 'Separa y recicla residuos.', en: 'Sort and recycle waste.' } },
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
    log_open: { es: 'Consulta el registro de investigaciones', en: 'Check the research log' },
    talk_food: { es: 'Visita el almacén de alimentos', en: 'Visit the food storage' },
    store_open: { es: 'Abre la consola del almacén y mira las reservas', en: 'Open the storage console and check the supplies' },
    talk_kitchen: { es: 'Visita la cocina y comedor', en: 'Visit the kitchen and mess' },
    cook1: { es: 'Prepara una comida', en: 'Prepare a meal' },
    talk_samples: { es: 'Visita el almacén de muestras', en: 'Visit the sample storage' },
    sstore1: { es: 'Clasifica y guarda una muestra', en: 'Classify and store a sample' },
    talk_workshop: { es: 'Visita el taller de mantenimiento', en: 'Visit the maintenance workshop' },
    craft1: { es: 'Fabrica un repuesto', en: 'Make a spare part' },
    talk_waste: { es: 'Visita la gestión de residuos', en: 'Visit waste management' },
    sort1: { es: 'Separa un lote de residuos', en: 'Sort a batch of waste' },
    recycle1: { es: 'Recicla residuos en materiales', en: 'Recycle waste into materials' }
  };
  // Dónde guiar al jugador para cada objetivo (consola o sala)
  const KEYTARGET = { talk_bridge: 'room:bridge', cmd_resources: 'cmd', talk_life: 'room:life', med_open: 'med', talk_reactor: 'room:reactor', power_action: 'reactor',
    talk_water: 'room:water', rec_fixed: 'water', o2_cal: 'o2', water_hold: 'water', talk_gh: 'room:gh', plant3: 'plant', water1: 'plant', feed1: 'plant', harvest1: 'plant:0:0',
    talk_lab: 'room:lab', analyze1: 'lab', spec_open: 'spec', log_open: 'log',
    talk_food: 'room:food', store_open: 'store', talk_kitchen: 'room:kitchen', cook1: 'kitchen', talk_samples: 'room:samples', sstore1: 'sampler', talk_workshop: 'room:workshop', craft1: 'work', talk_waste: 'room:waste', sort1: 'wastec', recycle1: 'wastec' };

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

  // Opciones de diagnóstico (modo Ingeniero). El orden debe coincidir con Sim.DIAG_OK.
  const DIAG = {
    water_fail: { opts: [{ es: 'Obstrucción en la bomba o el filtro (cae el caudal con alimentación normal)', en: 'Pump or filter blockage (flow drops with normal power)' }, { es: 'Falta de energía en el reciclador', en: 'Lack of power to the recycler' }, { es: 'Sensor de nivel del depósito descalibrado', en: 'Tank level sensor out of calibration' }] },
    pressure_leak: { opts: [{ es: 'Fallo del compresor', en: 'Compressor failure' }, { es: 'Fuga en una junta (la presión cae aunque el compresor está alimentado)', en: 'Seal leak (pressure drops even though the compressor is powered)' }, { es: 'Sensor de presión averiado', en: 'Faulty pressure sensor' }] },
    comms_blackout: { opts: [{ es: 'Conjunción solar: el Sol queda entre la Tierra y la base', en: 'Solar conjunction: the Sun sits between Earth and the base' }, { es: 'Falta de energía en la antena', en: 'Lack of power to the antenna' }, { es: 'Fallo del equipo de la antena (la alimentación es normal)', en: 'Antenna hardware fault (power is normal)' }] },
    thermal_fail: { opts: [{ es: 'Falta de energía para la calefacción', en: 'Not enough power for heating' }, { es: 'Circuito térmico degradado (alimentación normal, eficacia baja)', en: 'Degraded thermal loop (normal supply, low effectiveness)' }, { es: 'Temperatura exterior inusualmente baja', en: 'Unusually low outside temperature' }] },
    wear: { opts: [{ es: 'Desgaste del equipo: la salud del sistema bajó', en: 'Equipment wear: system health dropped' }, { es: 'Falta de materiales de repuesto', en: 'Lack of spare materials' }, { es: 'Error de operación de la tripulación', en: 'Crew operating error' }] },
    sensor_drift: { opts: [{ es: 'Fallo del generador de O₂', en: 'O₂ generator failure' }, { es: 'Fuga de gas', en: 'Gas leak' }, { es: 'Deriva del sensor: la lectura se desvía y la producción es normal', en: 'Sensor drift: the reading deviates while production is normal' }] }
  };
  // Datos del modelo clasificados: real (medición NASA/normas), hist (registro histórico), model (modelo simplificado), game (valor de jugabilidad)
  const PARAMS = [
    { k: 'real', n: { es: 'O₂ consumido por persona', en: 'O₂ used per person' }, v: '0,84 kg/día', s: 'NASA' },
    { k: 'real', n: { es: 'Agua por kg de O₂ (electrólisis)', en: 'Water per kg of O₂ (electrolysis)' }, v: '1,125 L/kg', s: '2 H₂O → 2 H₂ + O₂' },
    { k: 'real', n: { es: 'Rango seguro de O₂ en cabina', en: 'Safe cabin O₂ range' }, v: '19,5–23,5 %', s: 'OSHA 29 CFR 1910.146' },
    { k: 'real', n: { es: 'Dosis de fondo Marte', en: 'Mars background dose' }, v: '≈ 0,64 mSv/día', s: 'MSL/RAD (Hassler et al., Science 2014)' },
    { k: 'real', n: { es: 'Dosis de fondo Luna', en: 'Moon background dose' }, v: '≈ 1,37 mSv/día', s: "Chang'e-4 LND (Zhang et al., Sci. Adv. 2020)" },
    { k: 'real', n: { es: 'Retraso de la luz Tierra–Marte', en: 'Earth–Mars light delay' }, v: '≈ 3–22 min', s: 'NASA' },
    { k: 'hist', n: { es: 'Eventos solares usados', en: 'Solar events used' }, v: '2003-10-28 X17 · 2017-09-06 X9.3 · 2024-05-10 G5', s: 'NASA DONKI' },
    { k: 'hist', n: { es: 'Opportunity deja de comunicar', en: 'Opportunity stops communicating' }, v: '2018-06-10', s: 'NASA JPL' },
    { k: 'model', n: { es: 'Eficiencia del reciclador de agua', en: 'Water recycler efficiency' }, v: '85 % eco · 93 % máx.', s: es0('Menor que el mejor valor de la ISS (>90 %)', 'Below the ISS best (>90%)') },
    { k: 'model', n: { es: 'Tormenta solar sin blindaje', en: 'Unshielded solar storm' }, v: '2,0–2,8 mSv/h, 14–22 h', s: es0('Modelo, no medición', 'Model, not a measurement') },
    { k: 'model', n: { es: 'Reactor / paneles', en: 'Reactor / panels' }, v: '6–10 kW / 12–18 kW', s: es0('Reducido respecto a diseños de NASA (~40 kWe)', 'Scaled down from NASA designs (~40 kWe)') },
    { k: 'game', n: { es: 'Ciclo de cultivo', en: 'Crop cycle' }, v: es0('7 días simulados', '7 simulated days'), s: es0('Compresión educativa', 'Educational compression') },
    { k: 'game', n: { es: 'Escala de comunicaciones', en: 'Communication scale' }, v: es0('1 min-luz ≈ 1 h simulada', '1 light-min ≈ 1 simulated h'), s: es0('Para que el retraso se note', 'So the delay is noticeable') },
    { k: 'game', n: { es: 'Límite de dosis de la partida', en: 'Game dose limit' }, v: '120 / 80 / 60 mSv', s: es0('Umbral del juego, no límite médico', 'Game threshold, not a medical limit') }
  ];
  function es0(a, b) { return (typeof LANG !== 'undefined' && LANG === 'en') ? b : a; }
  return { DIAG, PARAMS, PEOPLE, GUIDE, TALK, CAMP, KEY, KEYTARGET, INC_NPC, INC_CONSOLE, CONSEQ, RES, RES_ROOM, PLANT, ACCESS };
})();
