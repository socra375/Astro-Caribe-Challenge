# Space Explorer

Simulador educativo 2D (vista cenital) para niños y niñas de 7 a 12 años. El jugador administra un puesto avanzado en la **Luna** (región del cráter Shackleton) o en **Marte** (Jezero, Arcadia Planitia, Valles Marineris y Gale como escenarios de comparación). Aprende que cada recurso es limitado, que toda decisión tiene consecuencias y que la ingeniería espacial también se relaciona con retos de **República Dominicana** y del planeta.

- Un solo archivo jugable: `index.html` (HTML5 + Canvas 2D + CSS3 + JavaScript puro + Web Audio API + localStorage).
- Sin bibliotecas, motores, frameworks ni servidores. Funciona sin Internet.
- Español por defecto, inglés opcional.

## Jugar en línea
- **GitHub Pages:** https://socra375.github.io/Astro-Caribe-Challenge/ (se publica automáticamente con cada cambio en `main`; requiere activar Pages una vez en *Settings → Pages → Source: GitHub Actions*).
- También funciona sin Internet: descarga `index.html` y ábrelo con doble clic.

## Cómo ejecutar

1. Descarga o clona el repositorio.
2. Abre `index.html` con doble clic en Chrome, Edge o Firefox.

No hace falta instalar nada. Si el navegador bloquea `localStorage` (modo privado estricto o `file://` restringido), el juego avisa y usa una sesión temporal.

## Controles

| Acción | Ordenador | Táctil |
|---|---|---|
| Moverse | WASD o flechas | Joystick virtual (abajo a la izquierda) |
| Interactuar | E, Enter o Espacio | Botón grande **E** o botón de interacción |
| Pausa | P o botón ❚❚ | Botón ❚❚ |
| Mapa completo (pausa el tiempo) | M o botón del mapa | Botón del mapa |
| Elegir personaje (opcional) | C o botón de tripulación | Botón de tripulación |
| Repetir último mensaje de voz | V o botón 🔁 de los subtítulos | Botón 🔁 |
| Silenciar | N o botón 🔊 | Botón 🔊 |
| Usar la herramienta elegida (o interactuar con el objeto cercano) | F | Botón **F** |
| Elegir herramienta · linterna | 1–6 · L | Barra de herramientas |
| Rover: acelerar · frenar y retroceder · girar | W/↑ · S/↓ · A/D o ←/→ | Joystick: la palanca fija el rumbo y la aceleración |
| Subir/bajar del rover · compartimento · misiones | E · G · O | Botón E · barra de herramientas · panel del objetivo |
| Radio EarthLink (tecla configurable, R por defecto) | R | Botón de la radio del HUD |
| Cerrar panel | Esc | ✕ |
| Velocidad del tiempo | botón x1 / x2 / x4 | igual |

Los minijuegos tienen controles de teclado y de puntero o táctiles (se explican en cada pantalla de instrucciones).

## Dos modalidades en un mismo juego
Al empezar se elige una modalidad, que se guarda con la partida. Comparten mapa, personajes, instalaciones, misiones, motor de simulación y base científica; cambian la profundidad, el lenguaje, la interfaz y algunas mecánicas.

| | Explorador Junior (7 a 12 años) | Ingeniero de Misión (13 años en adelante) |
|---|---|---|
| Indicadores | 4 simples: aire, agua, energía y comida (barra + «Bien / Cuidado / ¡Urgente!»), sin unidades | 5 detallados: soporte vital (O₂ y H₂O), energía, radiación, alimentos y bienestar, con valores, unidades y tendencia (↑ ↓ →) |
| Lenguaje | Palabras cotidianas, una idea por frase, ejemplos sencillos | Terminología técnica, nombres de sistemas, unidades y relaciones entre variables |
| Fallos | Menos tipos (sin sensores descalibrados ni fallo térmico) y presentados de forma progresiva: día 1 averías simples, día 2 plagas, día 3 comunicaciones y presión, día 4 tormentas solares | Todos los fallos desde el principio y **encadenados**: el polvo desgasta los paneles, una tormenta solar puede cortar el enlace y la falta de agua sin reparar daña las plantas |
| Reparar | Minijuego sencillo con más tiempo (×1,4) | **Diagnóstico previo**: hay que elegir la causa a partir de la telemetría; acertar desbloquea la reparación y la adelanta un 20 %, fallar cuesta 1 h |
| Energía | Reparto automático por prioridades | Prioridades de reparto configurables para laboratorio, rover, extractor, obras, luces y bombas |
| Comunicaciones | Retraso reducido (40 %) para que sea ágil, explicado en pantalla | Retraso completo (escala 1 min-luz ≈ 1 h) y respuestas con datos antiguos |
| Decisiones | «¿Qué pasará?»: qué mejora y qué se gasta en palabras (un poco / bastante / mucho) | Panel de consecuencias numérico: ahora, 12 h sin actuar y 12 h con la decisión, con unidades |
| Recursos | Tarjetas con barra y una frase | Tabla con producción, consumo y umbrales, gráficos de tendencia y tabla de datos clasificados (real / histórico / modelo / jugabilidad) con su fuente |
| NPC y alertas | Orientación paso a paso con ejemplos | Valores en vivo del sistema (eficiencia, kW, kPa…) y diagnóstico |
| Preguntas | Cortas, con botones grandes e icono (causa-efecto) | De razonamiento con cálculos, interpretación de datos y justificación |
| Ayudas | Pistas y flecha activadas | Desactivadas por defecto, y el ingeniero repara de forma autónoma más despacio y solo tras el diagnóstico |
| Dificultad | Fija y guiada | «Estándar» o «Exigente» |

La modalidad avanzada añade sistemas (diagnóstico, cadenas, prioridades, datos), no solo menos recursos. Los dos niveles explican el mismo fenómeno: el texto técnico es la versión avanzada del mismo contenido. Las pruebas comprueban que ambas completan la campaña, que Junior no usa jerga y que Ingeniero no es infantil.

## Características

### Interfaz limpia
Sin emojis decorativos: el juego usa iconografía propia en SVG (módulo `Icons`, también para el canvas). Las explicaciones largas están en paneles plegables «Más información». Los avisos repetidos se fusionan, y los gráficos solo aparecen en el modo Ingeniero.

### Mapa y exploración
Diseño cenital 2D tipo «corte arquitectónico»: se ve la silueta completa de la base con su casco exterior, el techo retirado para mostrar los interiores, y el terreno planetario que la rodea. No es una cuadrícula de habitaciones: cada sala tiene forma y tamaño propios y hay tres módulos unidos por túneles presurizados.
- **Módulo central, habitabilidad:** puente de mando (proa achaflanada), atrio central, dormitorios y enfermería (cápsulas), cocina y comedor, soporte vital y almacén de alimentos.
- **Módulo científico:** invernadero (cúpula con jardineras, bastidores hidropónicos y riego), laboratorio (octógono) y almacén de muestras.
- **Módulo técnico:** reactor y energía (octógono con núcleo, turbinas y baterías), taller de mantenimiento, gestión de residuos, y la bahía del rover con el refugio contra la radiación y la esclusa que da a la plataforma de aterrizaje.
- **Exterior planetario:** paneles solares en campos, antenas, plataforma de aterrizaje con balizas, vehículos, contenedores, módulos auxiliares, equipos científicos, farolas y rutas de exploración navegables con huellas de rover. Las sombras de la base y de los objetos se proyectan sobre el terreno. **La Luna** (gris, cráteres marcados, bloques sueltos, sombras largas) y **Marte** (ocre y rojizo, dunas, mesas de roca, polvo y viento) tienen geografía distinta, no solo otro color.
- **Profundidad 2D:** casco con paneles, remaches y ventanas iluminadas, cimientos, suelos propios por sala (cubierta, rejilla, hexágonos, losetas, hazard…), oclusión ambiental en las paredes, mobiliario con sombra, tuberías y cables.
- **Animaciones y eventos:** ventiladores y turbinas que giran, hologramas, balizas parpadeantes, luz de advertencia de la esclusa, polvo en suspensión, vapor. **Corte eléctrico:** la base se oscurece y parpadea. **Tormenta de polvo marciana:** tinte y rachas de polvo. **Incidente radiológico:** el refugio late en ámbar. **Llegada de un vehículo:** un rover vuelve por la ruta del este cuando regresa de una expedición.
- Puertas automáticas animadas (horizontales y verticales), esclusa con enclavamiento (nunca abre las dos puertas a la vez). Los NPC y el mapa usan rutas por la cuadrícula real, sin atravesar paredes ni objetos.
- **Dos cámaras sobre el mismo mundo y las mismas coordenadas:**
  - **Cámara principal (exploración):** sigue al personaje con suavidad y un zoom cercano (unas 15 casillas en el lado corto de la pantalla en escritorio y 11,5 en móvil, ajustado a la resolución). El astronauta se ve grande y se muestra sobre todo la sala actual y las zonas cercanas conectadas por pasillos, con sus paredes, puertas, objetos y compañeros. Las secciones lejanas quedan veladas (las salas a un salto de la actual, contando los pasillos como parte del camino, se ven; las demás se oscurecen) y hay una viñeta de visión cercana, así que la base se descubre recorriéndola. No hay minimapa permanente de toda la base.
  - **Cámara del mapa (M):** al pulsar M la cámara se aleja con una transición suave hasta mostrar toda la colonia; al cerrar (M o Esc) vuelve al zoom anterior y recupera el seguimiento, sin cambiar la posición ni la orientación del personaje.
  - **Exterior:** a pie, cámara cercana; al conducir, centrada en el rover con algo de adelanto y un zoom que se abre con la velocidad y el terreno lento, sin que el vehículo se vea diminuto.
  - Zoom manual con + y −, rueda o pellizco (limitado para no perder la orientación) y vista general (Z). Las colisiones y la física no cambian.
- **Mapa completo (tecla M; Esc para cerrar; botón del HUD):** muestra el mismo mundo que la exploración (no hay una segunda distribución), con zoom y desplazamiento, las trece instalaciones, pasillos y puertas, el exterior, ficha de cada sala (función, estado de sistemas, quién está dentro), alertas, objetivo activo y de la expedición, destino marcado, esclusa, salas bloqueadas, el rover (en el borde si está lejos), tu posición y la de los NPC. La ruta se calcula sobre el grafo real de puertas y pasillos y respeta las salas bloqueadas. Con el mapa abierto el tiempo simulado queda en pausa.
- La arquitectura es original y la referencia es solo compositiva (vista cenital con la silueta exterior y los interiores expuestos). No se reproducen mapas, siluetas, habitaciones, colores identificativos ni recursos de ningún juego existente. Inspiración arquitectónica general: módulos presurizados, túneles, esclusas y campos solares de los conceptos de bases lunares y marcianas publicados por la NASA; ninguna imagen se copia.

### Exploración exterior y rover
La exploración exterior es una de las experiencias principales: se sale equipado, se conduce un rover por un terreno amplio, se baja a investigar, se recogen muestras, se gestionan los recursos y se vuelve a estudiar lo encontrado.
- **Preparación:** en la bahía del rover hay un vestuario con trajes (consola «Traje y expedición»). Muestra una revisión de siete equipos (integridad del traje, oxígeno, energía, batería del rover, capacidad de almacenamiento, herramientas y objetivo), permite equipar y quitar el traje, recargarlo con el oxígeno de la base y repararlo con materiales. Cualquier astronauta puede hacerlo sin cambiar de personaje; cada especialista aporta una bonificación (comandante: más alcance de radio; ingeniera: el rover gasta menos batería; científico: el escáner llega más lejos; médica: menos radiación y oxígeno; agrónomo: recoge suelo más rápido).
- **Esclusa:** sin traje no se puede salir. Con el traje puesto, al entrar en la cámara y avanzar hacia fuera se despresuriza (3 s) y se abre la puerta exterior; al volver se presuriza antes de abrir la interior. El sentido de la marcha decide el ciclo, así que no hay ciclos accidentales.
- **Traje:** el personaje cambia visualmente (casco sellado con visor dorado, mochila de soporte vital, antena y luces de estado). El HUD exterior compacto muestra oxígeno, energía, integridad, radiación acumulada, rover, temperatura, señal de radio, carga y el objetivo actual. Los recursos se consumen con el tiempo, más al moverse o trabajar y menos dentro del rover; un traje dañado pierde aire más deprisa; la linterna y el frío o el calor extremo gastan más energía.
- **Rover R-1:** vehículo original estacionado junto a la esclusa. Aceleración gradual, velocidad máxima, frenado, marcha atrás, giro como un coche (puede girar casi parado), resistencia del terreno, colisiones con rocas, cráteres grandes, edificios y paredes, y un pequeño daño por golpes fuertes. Ruedas que giran, suspensión visual, polvo y regolito levantados, huellas, faros, indicador de batería y animación de subida y bajada con rampa. Sin batería queda una reserva lenta para poder volver. El astronauta baja siempre a un punto libre junto a una puerta del rover; no se puede bajar en marcha.
- **Terreno amplio (unas 280 × 260 casillas, la base ocupa el centro):** rutas con huellas y postes-guía parpadeantes, cráteres (los grandes cierran el paso al rover; hay rutas alternativas), rocas sólidas, zonas de suelo con distinta movilidad, seis puntos de interés, repetidores de radio y refugios. La base se ve a distancia y una flecha azul indica el camino de regreso; el radar sustituye al minimapa cuando se está fuera. De noche, con polvo o en una ráfaga de radiación, el entorno cambia (visibilidad, tinte, destellos).
- **Luna y Marte son distintos:** la Luna tiene regolito profundo, hielo de agua en un cráter en sombra permanente, ráfagas de radiación solar y sin viento; Marte tiene arena y pendientes, dunas, sedimentos de un delta fósil, viento y tormentas de polvo que reducen la visibilidad y la señal. Cada escenario tiene sus propios puntos de interés y muestras.
- **Seguridad y recuperación:** avisos con histéresis (oxígeno, energía, temperatura, radiación, integridad, batería, señal, ráfaga, tormenta) por radio y con subtítulos; recomendación de regreso; refugios con depósito de emergencia de un solo uso; y, si el aire se agota, el traje se rompe o la dosis llega al límite, la base recoge al astronauta (pasan unas horas y baja la moral), remolca el rover y lo deja junto a la esclusa con aire de reserva: nunca se queda atrapado.
- **Radio:** la señal depende de la distancia a la base, de los repetidores activados (se activan desde el terreno), de las tormentas y de la salud de las comunicaciones. Sin señal suficiente no se puede enviar el informe a la Tierra. Cada personaje conserva su voz: la médica avisa de oxígeno y radiación, la ingeniera de energía, rover y señal, el científico de hallazgos y Control de Misión pide datos.
- **Herramientas con función real:** recolector (recoge muestras o interactúa con el objeto cercano), contenedor portátil (2 muestras selladas), escáner geológico (revela muestras ocultas y puntos de interés; gasta energía y tiene recarga), cámara (fotografía puntos de interés), sensor ambiental (temperatura, radiación, suelo, viento, señal y visibilidad) y linterna (gasta energía).
- **Muestras:** son las mismas de la base: cada una crea un registro único en el sistema de muestras con ID, nombre, tipo, planeta, coordenadas simuladas (25 m por casilla), día y hora de la misión, quién la recogió, estado de conservación, descripción y ubicación actual (contenedor de mano, compartimento del rover o almacén de la base). No hay duplicados ni al recoger ni al guardar y cargar. El rover tiene 6 casillas y 12 kg (simulados); se pueden organizar, retirar y descargar. Al volver se descargan en el almacén; allí se clasifican y se analizan en el laboratorio, y el resultado se guarda en el registro de investigaciones.
- **Cuatro misiones progresivas** (Primer recorrido, Reconocimiento geológico, Exploración ampliada, Condiciones adversas) con objetivos claros y exploración libre fuera de ellos; la cuarta abre una ventana de mal tiempo propia del escenario.
- **Dos niveles:** Explorador Junior usa porcentajes y frases sencillas; Ingeniero de Misión añade minutos de oxígeno, mSv, temperatura exterior, kg y la explicación de qué valores son reales y cuáles se han simplificado (en la realidad, un traje dura horas y la radiación de la superficie ronda ~1,4 mSv/día en la Luna y ~0,7 mSv/día en Marte; aquí se acelera para notarse en minutos).

### EarthLink Radio (comunicaciones con la Tierra)
Radio portátil integrada en el traje del comandante (botón de la radio en el HUD o tecla configurable, R por defecto; se cambia desde la propia radio y no admite las teclas que ya usa el juego). La radio no pausa el tiempo: los mensajes avanzan mientras se compone la respuesta. Se abre con animación y sonido de conexión.
- **La Tierra y el enlace:** planeta animado, ondas hacia la base (color, ruido y paquetes en tránsito reflejan el estado real), centro de control, estado (conexión estable, señal débil, interferencia, sin conexión, transmisión pendiente, mensaje recibido), distancia (Luna 384 400 km; Marte según la posición orbital), **retardo real** de ida (Luna ≈ 1,3 s; Marte entre 3 y 22 min) y, por separado, el **retardo comprimido del juego**, canal activo y pendientes.
- **Estado calculado con la simulación:** el enlace depende de la salud de la antena (fallo de antena), la energía, las tormentas solares y de polvo (interferencia), los daños en equipos exteriores y, durante una expedición, de la distancia y los repetidores. Tras una tormenta solar la antena puede quedar dañada y se repara con mantenimiento de comunicaciones en el taller; el fallo de antena se repara en el puente. Ningún fallo bloquea para siempre: los incidentes terminan y los mensajes en cola salen cuando vuelve la señal («Señal recuperada»).
- **Seis canales** con función y participantes propios: Centro de Control (informe, pronóstico, ruta segura, suministros, confirmar órdenes), Ingeniería (procedimiento de reparación, energía, repuestos), Medicina (soporte vital y salud), Ciencia (enviar datos de una muestra, información científica), Agricultura (sensores del invernadero) y Emergencias (informar de una emergencia, pedir recogida en el exterior).
- **Comunicación bidireccional con opciones de respuesta** (sin reconocimiento de voz). Los especialistas también transmiten: cuando surge una avería o hay una muestra analizada, el especialista propone consultar a la Tierra y el comandante lo autoriza; el mensaje sale con la voz de ese especialista y Tierra responde con la suya.
- **Voces:** se añaden los perfiles `npc_earth_control_es` y `npc_earth_control_en` (14 perfiles `npc_*`). Cada personaje habla con su `voiceURI`, velocidad, tono y volumen cuando están disponibles; no se inventan voces del navegador y se usan las alternativas existentes si falta una. Los subtítulos de la radio siguen los límites de palabra del TTS; sin TTS avanzan por tiempo y todo funciona igual. No se reproduce voz antes de la primera interacción del jugador.
- **Retraso configurable:** escala ×0,25, ×0,5, ×1 y ×2 sobre el retraso comprimido (Junior ya lo reduce). Se muestran los dos tiempos y nunca se presenta el comprimido como físico. Las respuestas mantienen el orden de envío; con interferencia el retraso es 1,8 veces mayor y con señal débil 1,4.
- **Consecuencias reales:** pedir ayuda técnica desbloquea el diagnóstico y adelanta la reparación; el pronóstico revela un evento próximo real; una emergencia puede activar una misión y deja una orden (confirmarla activa el protocolo de refugio); los suministros aprobados llegan tras un tiempo y solo si hay necesidad; la ruta segura marca un punto de interés en el radar de la expedición; el informe de sensores de cultivo identifica plagas reales; la consulta médica deja órdenes según la dosis; enviar datos de una muestra da ciencia; la petición de recogida activa la evacuación. Tierra también avisa por su cuenta de tormentas próximas (si hay enlace).
- **Informes con datos reales:** energía, oxígeno, agua, alimentos, protección y dosis de radiación, cultivos, tripulación, investigaciones y averías activas, tomados del estado actual de la simulación (Junior: porcentajes; Ingeniero: unidades y balance). Tierra evalúa exactamente esos datos.
- **Audio:** sonidos de conexión, transmisión, recepción, interferencia y fin de transmisión, y un **volumen de radio propio**, independiente de voces, música y alertas.
- **Dos niveles:** Junior ofrece opciones cortas y guiadas; Ingeniero, terminología y unidades. Las opciones y los principios científicos son los mismos.

### Tripulación (bots)
El jugador es el comandante. Cuatro bots con especialidades y efectos reales en el modelo:

| Especialidad | Efecto en la simulación |
|---|---|
| Ingeniera | Repara incidentes de forma autónoma y lenta; las obras avanzan un 30 % más rápido |
| Científico | Análisis de muestras un 50 % más rápido |
| Médica | +6 puntos al objetivo de moral |
| Agrónomo | Cultivos un 15 % más rápidos |

Durante una tormenta solar, si el protocolo de refugio está activo, los bots caminan al refugio y **pierden temporalmente sus bonus**: es una compensación real del modelo.

### Diseño de personajes
![Hoja de personajes](docs/personajes.png)

Los cinco astronautas son originales y están dibujados por código (módulo `Chars`, archivo `src/04b_chars.js`) con trazados, polígonos y curvas por capas. No hay imágenes externas ni spritesheets. Proporción de unas 3,5 cabezas, casco separado del torso por un anillo de cuello, hombros, brazos con codo articulado y guantes, cinturón técnico, piernas separadas con rodilleras y botas voluminosas. Cada especialidad se reconoce **por la silueta**, no solo por el color:

| Personaje | Casco | Soporte vital | Rasgo de silueta | Accesorio |
|---|---|---|---|---|
| Comandante (jugador) | Visor envolvente angular con marco dorado, cresta de navegación, antena | Dos depósitos, regulador central, panel de diagnóstico | Hombreras con alerón | Navegador holográfico en el antebrazo |
| Ingeniera | Escudo abatible, rejilla y focos de trabajo; visor de rendija segmentado | Bastidor de carga con llave integrada y franjas de seguridad | Más ancha, blindaje en hombros y rodillas, cinturón de herramientas | Herramienta multifunción |
| Científico | Visor hexagonal con HUD, mástil de sensores | Mochila ligera con carrusel de cápsulas de muestras | Más esbelto, mástil alto | Escáner de muestras con haz |
| Médica | Cúpula con visor doble y lámpara anular | Mochila redondeada con módulo de primeros auxilios | Cúpula, mochila redonda que asoma, bolsas en las caderas | Escáner biomédico de anillo y banda biométrica |
| Agrónomo | Ala parasol, visor redondeado, sensor en forma de hoja | Tubos de semillas, depósito de riego y manguera al guante | Ala ancha, bolsas de semillas | Módulo de análisis de plantas |

- **Vistas:** frente, espalda, perfil derecho y perfil izquierdo (espejado), coherentes con la vista cenital del mapa. El rostro se ve parcialmente tras el visor (con expresiones: neutral, concentración, alerta y alegría).
- **Animaciones:** reposo (respiración), caminar (brazos y piernas independientes, rodillas que se doblan), interactuar, reparar (con chispas), transportar (caja de muestras), alerta (con «!») y celebrar. Con «reducir animaciones», los saltos y vaivenes se eliminan y el balanceo de extremidades se reduce a la mitad.
- **Pivote y tamaño:** pies en (0,0), altura ≈ 64 unidades; en el juego se dibujan a escala 0,82 (≈1,6 baldosas). La colisión sigue siendo el círculo pequeño de los pies, así que el movimiento, las puertas y los controles no cambian. En pantallas estrechas la cámara se acerca (≈11 baldosas de ancho) para que los personajes sigan siendo legibles.
- **Cuándo se usa cada pose:** el jugador interactúa mientras hay un panel abierto, repara durante el minijuego de cableado, transporta tras recoger una muestra, se alerta si hay una alerta crítica y celebra al completar una misión. Los bots reparan, interactúan en su sala, transportan muestras o plantas al desplazarse, se alertan en el refugio y celebran con el equipo.
- **Hoja de presentación:** `index.html?sheet` o «Manual → Hoja de personajes». Muestra las tres vistas, ampliaciones de casco, soporte vital y accesorio, paleta y las 7 animaciones en vivo, todo con el mismo código que se usa en el juego.
- Los emblemas son originales. La médica usa una pantalla de pulso, no una cruz roja (emblema protegido).

### Familiarización, NPC guía y desbloqueo de secciones
Al empezar solo están abiertas tres secciones: **Puente de mando, Módulo de vida y Reactor y energía**. Las demás tienen las puertas cerradas (en rojo y con 🔒 en el mapa y el minimapa); al acercarse, el juego explica qué misión las abre. Cada sección se desbloquea **al cumplir objetivos reales**, no al pulsar un botón:

| Misión de familiarización | Objetivos (detectados por el motor) | Desbloquea · guía |
|---|---|---|
| 1. Activación de la colonia | Escuchar al guía, revisar Recursos, visitar el módulo de vida y la enfermería, visitar el reactor y **ajustar la energía** (reactor, modo emergencia o minijuego solar/balance) | Agua y oxígeno · Sofía |
| 2. Recuperación del ciclo de agua | **Reparar** la bomba averiada, **calibrar** el oxígeno y **mantener** reciclaje ≥ 78 % y agua ≥ 30 % durante 6 h | Invernadero · Teo |
| 3. Primer cultivo | **Sembrar** 3 semillas, **regar**, **añadir nutrientes** y **cosechar** una planta madura | Laboratorio · Leo |
| 4. Exploración científica | **Analizar** una muestra, usar el espectrómetro y consultar el registro | Protección radiológica y bahía del rover · Ana |

- Al entrar por primera vez en una sección, su guía mantiene una **conversación corta de 5 pasos**: se presenta, explica para qué sirve la sección, sus sistemas, la misión y cómo usar la consola. No se repite; se puede volver a escuchar en «Pausa → Conversaciones».
- Guías: Control de Misión (puente, mientras el jugador es el comandante), Sofía (médica: vida y agua/O₂), Ana (ingeniera: reactor y bahía del rover), Teo (agrónomo: invernadero) y Leo (científico: laboratorio). No hay un sexto personaje «de exploración»: la bahía del rover la presenta Ana, que opera el rover según la tabla de permisos.
- Las **siete misiones avanzadas** se activan al terminar la familiarización. Antes de eso, los eventos aleatorios solo ocurren en secciones abiertas y con la mitad de frecuencia.

### Tripulación y especialistas
El **comandante** controla la partida y puede hacerlo todo: explorar, reparar, cultivar, administrar recursos, conducir el rover y resolver emergencias. Cambiar de personaje es **opcional**: botón de tripulación del HUD o tecla C (también el vestuario del puente). El cambio es inmediato, conserva la posición, las misiones y el progreso, y el personaje anterior sigue en la base como NPC.

| Personaje | Ventaja real al jugar con él |
|---|---|
| Comandante | Puede hacer todo; coordina misiones y comunicaciones |
| Ingeniera Ana | Repara mejor (+15 % en el cableado), fabrica repuestos más rápido y acelera obras un 30 % |
| Médica Sofía | Sube la moral objetivo y ofrece una revisión detallada de la tripulación en la enfermería (estimación del modelo, no diagnóstico médico) |
| Científico Leo | Analiza muestras más rápido (2 h en lugar de 3) |
| Agrónomo Teo | Las plantas crecen un 15 % más rápido y se gastan menos nutrientes |

Los NPC no controlados trabajan en sus zonas (la médica en la enfermería, el científico en el laboratorio y el almacén de muestras, el agrónomo en el invernadero y el almacén de alimentos, la ingeniera en reactor, soporte vital y taller) y de noche (desde el día 2) se retiran a los dormitorios. Las emergencias nunca se bloquean.

### Las 13 instalaciones y su progresión
Al empezar están abiertos el puente, los dormitorios, la enfermería, el reactor y el soporte vital. La campaña de familiarización abre el invernadero, el laboratorio y la bahía. Después, una **ampliación opcional** abre en cadena las demás zonas, cada una con presentación por un NPC, explicación, misión introductoria, sistema interactivo y recompensa: almacén de alimentos → cocina → almacén de muestras → taller → gestión de residuos. No bloquea las misiones ni las emergencias.

| Instalación | Qué se puede hacer (acciones reales de la simulación) |
|---|---|
| Almacén de alimentos | Ver reservas frescas y de reserva, autonomía y consumo; encender o apagar el frío (gasta 0,1 kW; sin frío lo fresco se estropea unas 10 veces más rápido); registro de entradas (cosechas) y salidas (cocina) |
| Cocina y comedor | Plan de raciones (reducidas, normales, abundantes: cambian el consumo y el ánimo); preparar una ensalada fresca o una ración caliente (una cada 8 h) |
| Almacén de muestras | Registro con identificador único, origen, fecha, categoría, estante y estado; clasificar, guardar (8 estantes), enviar al laboratorio y registrar el análisis; sin guardar se deterioran a las 24 h. Son muestras **ficticias de juego**, no muestras reales de NASA |
| Taller de mantenimiento | Fabricar repuestos (6 kg de materiales) que acortan el mantenimiento y no gastan materiales; mantener los equipos |
| Gestión de residuos | Separar un lote antes de reciclar (8 kg de materiales recuperados en lugar de 5) y reciclar |
| Enfermería | Estado de la tripulación y condiciones de habitabilidad (datos del juego, no diagnósticos médicos reales) |

El deterioro de alimentos, las raciones y las muestras son modelos educativos simplificados.

### Voces, subtítulos y audio
- **Texto a voz** con la Web Speech API. Perfiles internos del juego `npc_<rol>_<idioma>` (comandante, ingeniero, médico, científico, agrónomo y narrador, en español e inglés) con `profileId`, `characterRole`, `language`, `preferredVoiceURI`, `preferredVoiceName`, `fallbackLanguage`, `rate`, `pitch` y `volume`. Son identificadores propios del juego, no de ningún proveedor.
- Las voces se detectan en el dispositivo con `getVoices()` y se actualizan con `voiceschanged`. Prioridad: `voiceURI` guardada, nombre exacto, voz del idioma, voz predeterminada del navegador y, si no hay nada, solo texto. Si el dispositivo tiene una sola voz para el idioma, el panel avisa de que todos los personajes la comparten (con tono y velocidad distintos): **no se afirma que sean voces diferentes**.
- Se narran las llamadas de radio (con el NPC de la especialidad), las conversaciones, las nuevas misiones, las instrucciones de los minijuegos y los resúmenes de misión. No se narran los cambios pequeños de indicadores ni las confirmaciones. Cola sin solapes; las alertas críticas interrumpen. No suena nada antes de la primera interacción.
- **Subtítulos** equivalentes (con botones de repetir y detener; tecla V repite el último mensaje). **Panel de audio** (menú ☰): volumen general, de voces, de música y de alertas, velocidad de narración, interruptores de voz, música, sonidos y subtítulos, idioma, y selección, prueba y guardado de la voz de cada personaje. La música ambiental es opcional y viene apagada.
- Sin síntesis de voz, o con `localStorage` bloqueado, el juego sigue siendo completamente funcional con textos.

### Llamadas de radio de los NPC
Las averías, eventos ambientales y umbrales de recursos generan una **llamada interna** en la parte inferior de la pantalla, sin mover a nadie por el mapa. Cada llamada incluye retrato, nombre, especialidad, tipo de alerta, descripción, ubicación exacta (por ejemplo, las jardineras con plaga), qué hacer y qué pasa si se ignora. Botones: **Entendido**, **Marcar ubicación** (marcador en el minimapa y flecha en pantalla), **Consultar sistema** (abre el panel de la instalación) y **Ver explicación** (panel «¿Por qué ocurrió?»).

| Tema | Quién llama |
|---|---|
| Oxígeno, presión, sensor de O₂, bienestar | Médica |
| Agua (reciclador) | Ingeniera; reservas de agua: médica |
| Energía, reactor, paneles, temperatura, desgaste | Ingeniera |
| Cultivos y alimentos | Agrónomo |
| Radiación, dosis, análisis | Científico |
| Comunicaciones y objetivos generales | Comandante |

Cola con prioridad (crítica > advertencia > información). Las críticas se quedan hasta pulsar «Entendido»; las advertencias desaparecen a los 18 s y la información a los 9 s. Una llamada interrumpida por otra más urgente vuelve a la cola, y los mensajes idénticos se fusionan en lugar de repetirse.

### Invernadero interactivo
![Especies, etapas y estados](docs/plantas.png)

- **Cinco especies cultivadas realmente en la ISS** (sistemas Veggie y Advanced Plant Habitat de NASA), dibujadas por código con silueta propia: lechuga romana roja (roseta erguida de hojas onduladas), mizuna (mata ancha de hojas finas y dentadas), rábano (hojas lobuladas y raíz roja que asoma al madurar), chile (planta ramificada con hojas en punta, flores y frutos) y zinnia (tallo con hojas opuestas, botón y flor).
- **Cinco etapas:** semilla, brote (cotiledones con forma propia, como los acorazonados del rábano), planta joven, desarrollo avanzado y planta madura. Cada planta tiene variaciones naturales (tamaño, inclinación, número de hojas, color de la flor) para que no haya clones.
- **Estado visible:** marchitez y tono pardo si falta agua, charcos y hojas viejas amarillas si sobra, tallo largo y pálido con poca luz, clorosis sin nutrientes y pequeños insectos si hay plaga.
- **Jardineras:** sustrato, tubo de riego con goteros, sensor de humedad con piloto de color, barra LED que brilla según la potencia, etiqueta de especie e indicador de crecimiento por planta.
- **18 plantas independientes** (6 jardineras × 3). Pulsa E junto a una planta o tócala para abrir su ficha: especie, etapa, tiempo de cultivo, salud, humedad, nutrientes, iluminación, temperatura y progreso, con orientación de Teo y un dato real de la ISS.
- **Acciones con coste real:** sembrar (1 semilla, 0,5 L de agua y 0,2 L de nutrientes), regar (0,3 L), añadir nutrientes (0,3 L de solución, o 0,22 L si eres el agrónomo), luz LED de la jardinera (0,6 kW al 100 %, compite con los demás sistemas por la energía), inspeccionar, identificar problemas (las plagas no se ven del todo hasta identificarlas), podar (cuando hay exceso de ramas, plaga identificada o daño) y cosechar (suma alimentos; devuelve semillas y residuos orgánicos). La zinnia no es comestible y sube la moral.
- **Modelo:** el crecimiento depende de la luz frente a la necesidad de la especie, de la humedad (ideal 35–75 %), de los nutrientes, de la temperatura óptima, de la salud y del bonus del agrónomo. La sequía, el encharcamiento, la falta de luz o de nutrientes, las plagas y la temperatura dañan la salud; a 0 la planta muere. El riego automático con sensores repone hasta el 65 % (el goteo ahorra un 45 % de agua) y la solución nutritiva se fabrica con residuos orgánicos (economía circular).
- El **ciclo de 7 días** es una simplificación de jugabilidad, no la duración biológica real de cada cultivo; el juego lo indica en la ficha de cada planta.

### Simulación de recursos (el núcleo)
Motor `Sim` independiente de la interfaz (estado JSON puro, RNG con semilla, tiempo en horas simuladas). Cinco indicadores principales:

1. **Soporte vital**: oxígeno (kg), agua (L), concentración de O₂ en cabina, reciclaje, presión y temperatura.
2. **Energía**: paneles solares (alineación, polvo, ciclo día/noche en Marte), reactor (potencia y desgaste), batería, demanda y reparto por prioridades.
3. **Protección contra radiación**: efectividad del blindaje, dosis estimada por tripulante, plazas del refugio y eventos solares.
4. **Alimentos**: reservas, 18 plantas individuales en 6 jardineras, semillas, solución nutritiva, luz LED, riego, temperatura y crecimiento.
5. **Bienestar**: moral y descanso, que dependen de las condiciones de habitabilidad y de las alertas.

Cada recurso tiene valor, máximo, consumo por hora, producción por hora, umbral de advertencia y umbral crítico. Todo se mantiene dentro de límites válidos en una única función `normalize()`.

**Cadenas de efectos** (ejemplos reales del modelo):
- Más luz en el invernadero → más crecimiento → más consumo eléctrico → menos batería para otros sistemas.
- El oxígeno se fabrica por electrólisis: consume **agua** (1,125 L por kg de O₂) y **electricidad**.
- Reforzar el blindaje consume **materiales**, **energía** durante 6 h y **tiempo**.
- Los residuos se reciclan en materiales (economía circular), que sirven para el blindaje y el mantenimiento.
- El extractor de hielo (ISRU) produce agua a cambio de electricidad.

**Reparto eléctrico por prioridades**: 1) soporte vital, 2) comunicaciones y blindaje, 3) laboratorio, rover, obras y extractor de hielo, 4) luces y bombas del invernadero. Si falta energía se recorta primero la prioridad 4.

### Panel de consecuencias
Antes de cada decisión importante, el juego **clona el estado**, simula 12 horas con y sin la decisión (sin eventos aleatorios) y muestra: estado actual, recurso que se usará, qué aumenta, qué disminuye, riesgos y beneficios. Así la vista previa coincide con el modelo y no es un texto inventado.

### Siete misiones
1. Estabilizar el soporte vital.
2. Recuperar el suministro eléctrico.
3. Prepararse ante un evento solar (inspirado en registros reales de DONKI).
4. Seleccionar un sitio de exploración (comparación de pendiente, iluminación, geografía y riesgo).
5. Calibrar la protección radiológica (con RadLab como referencia de la ISS, claramente diferenciada).
6. Cultivar alimentos (ciclo de 7 días simulados; puede correr en paralelo con otra misión).
7. Explorar con el rover, con una falla de comunicaciones con la Tierra.

Cada misión tiene dos variantes de objetivo elegidas por la semilla, pasos, límite de tiempo cuando corresponde, estrellas (1–3), recompensas y una ficha de Conexión con la Tierra con pregunta de comprensión. Las misiones fallidas se pueden repetir con condiciones distintas.

### Comunicaciones con retraso
- Luna: ≈1,3 s de retraso real de la luz. Marte: entre ~3 y ~22 minutos según las posiciones orbitales (cada partida elige un valor en ese rango).
- **Escala del juego (simplificación G):** 1 minuto-luz ≈ 1 hora simulada, para que el retraso se note. La Luna usa un mínimo jugable de 0,3 h.
- Se muestra el mensaje enviado, el tiempo estimado, la respuesta pendiente y el mensaje recibido. La Tierra responde con **datos antiguos** (los de cuando envió el mensaje), lo que enseña a usar protocolos autónomos.
- La ruta segura pedida a la Tierra revela todos los peligros en el minijuego del rover; sin ella se conduce solo con sensores (autonomía).

### Seis minijuegos (30–60 s, 3 niveles, modo práctica)
Cableado eléctrico · Balance energético · Calibración de oxígeno · Orientación de paneles solares · Navegación del rover · Gestión del invernadero.
Cada uno tiene instrucciones, condiciones de éxito y error, resultado, explicación científica y **modifica la simulación** (salvo en modo práctica).

### Eventos y alertas
Tormenta solar, caída de generación (sombras del terreno lunar), tormenta de polvo (Marte), falla del reciclaje, fuga de presión, problema de comunicaciones, falla de cultivos, problema de temperatura, deterioro de equipos y sensor de O₂ descalibrado. Tres niveles: crítico (rojo, ⛔), advertencia (ámbar, ⚠) e información (azul, ℹ); los iconos evitan depender solo del color. Cada evento tiene un panel **«¿Por qué ocurrió?»** con: qué sucedió, sistema afectado, causa, qué hacer, dato científico y fuente con fecha. Los incidentes sin reparar escalan de gravedad.

### Victoria y finales no violentos
Se gana al completar las 7 misiones con los sistemas operativos y sin alertas críticas activas. Si se agota un recurso esencial, se supera el límite de dosis del modelo o un incidente crítico queda sin resolver, la misión termina con **evacuación preventiva** o **intervención de emergencia**: la tripulación siempre vuelve sana. Después aparece el informe final con cuatro apartados (resultado, recursos, aprendizaje, impacto en la Tierra).

### Accesibilidad y diseño adaptable
Ordenador, tablet y móvil (joystick virtual y botones grandes). Pausa, volumen, silencio, reducir animaciones (respeta `prefers-reduced-motion`), ayudas en pantalla, tres tamaños de texto, foco visible y navegación por teclado en los paneles. Contraste WCAG AA comprobado por script (`tests/contrast.js`).

### Estación de tres pisos
La base se reparte en tres pisos sin cambiar la forma de las salas ni el terreno exterior:

- **Piso 1 · Operaciones:** puente de mando, atrio, cocina y comedor, almacén de alimentos, dormitorios, enfermería, invernadero, laboratorio, almacén de muestras y soporte vital.
- **Piso 2 · Exploración (planta baja):** esclusa, bahía y garaje del rover, taller y residuos. Es el único con exterior: el terreno, el rover y la nave no cambian.
- **Piso 3 · Energía:** el núcleo energético.

Cada piso tiene su **elevador de tripulación**. El jugador entra, pulsa `E` en el panel, y si la cabina está en otro piso la llama; el trayecto es real (puertas que se cierran, movimiento con el piso que cambia, puertas que se abren) y solo entonces cambia de piso. Si el elevador se avería hay una **escalera de emergencia** (7 s por piso), así nunca se bloquea la campaña. Los **NPC** también cambian de piso por el elevador: caminan hasta él, hacen el trayecto con duración y salen en el piso de destino; el ingeniero va al reactor (piso 3) y los demás a sus salas.

**Teletransporte de la sala de comandos:** una consola del puente (`E`) permite elegir directamente uno de los tres pisos, con una breve animación, y llegas a la cabina del elevador de ese piso. Es un atajo extra; los elevadores siguen siendo la forma de ir andando.

**Núcleo energético (piso 3):** una cámara octogonal enorme de 38×48 casillas (más de 2,5 veces la sala anterior) con el **reactor de 14×14** como elemento dominante: anillo atornillado, capas concéntricas y brillo que depende de la producción. Lo rodean una **pasarela elevada** con barandilla, **cuatro torres de refrigeración** con ondas de refrigerante animadas, cuatro turbinas que giran y echan vapor, seis transformadores, baterías, racks, una mesa de control y una **zona restringida** señalizada con franjas de advertencia. Los paneles de energía, paneles solares y balance están en la galería de control del sur.

**Acceso restringido:** con una **avería crítica en el reactor** o una **ráfaga de radiación**, la puerta del núcleo se cierra (en rojo) **solo para el jugador**; el ingeniero puede entrar a reparar, así la campaña no se bloquea. Junto a la puerta se explica el motivo; en el panel del elevador del piso 3 aparece el estado de seguridad y el botón **Aplicar protocolo de seguridad**, que exige el traje de protección puesto y autoriza la entrada unos 50 s. No hay procedimientos reales de reactores: es un modelo de juego.

**Elevador del rover:** es independiente del de tripulación. Es una **plataforma exterior** junto a la esclusa, donde aparca el rover. Se usa desde su panel (`E` junto a la plataforma): **solo se mueve si el rover está bien colocado encima** (centrado, alineado, parado y sin nadie dentro); si no, explica qué falta. Al bajar, las puertas se cierran sobre el foso, las luces pasan a ámbar y rojo, suena la maquinaria y el rover desaparece del exterior; queda **guardado en el garaje** (no se ve, no se puede subir ni aparece en el mapa) conservando batería y muestras. Para volver a usarlo se sube desde el mismo panel. El estado se guarda con la partida.

El **mapa general (M)** tiene un selector de pisos: mirar otro piso no mueve al jugador. Las **alertas y llamadas** indican piso y sala. Al empezar o cargar, el arte de los tres pisos se dibuja de antemano (≈ 1 s) para que cambiar de piso no produzca tirones.

### Viaje espacial (antes de la llegada)
Una partida nueva empieza dentro de la nave, antes del aterrizaje (ocurre una vez por campaña; las partidas anteriores se migran con el viaje ya completado):

1. **Cabina y encendido:** los 5 tripulantes ocupan sus asientos (los mismos personajes del juego). El jugador controla al comandante y puede cambiar de personaje; el comandante siempre puede hacerlo todo. Minijuego de encendido en **secuencia lógica con dependencias** (energía → soporte vital / navegación → comunicaciones → seguridad): cada activación enciende su luz, suena y se explica con la voz del especialista; un orden incorrecto explica qué falta y se puede reintentar.
2. **Lanzamiento:** comprobación de seguridad, cuenta regresiva, ignición, ascenso con vibración, cielo que se oscurece y tripulación que informa. Se puede omitir después de verlo una vez.
3. **Crucero (≈ 2–3 min):** navegación (orientación, trayectoria, corrección; brújula con tolerancia de ±5°), reporte a Control Tierra con retraso del destino y voces propias (tripulación con su voz, Tierra con su perfil), y soporte vital con cuatro eventos (consumo elevado, filtro saturado, distribución irregular, estabilizado) que enseñan que el oxígeno se reparte, se filtra y se regula, no se «rellena» con un botón.
4. **Consecuencias (pequeñas, no bloquean):** reportar a Tierra reduce las desviaciones un 30 %; no corregirlas hace que actúe el piloto automático y el tanque de la nave queda en observación; el soporte vital sin errores sube la moral (+4) y con más de 3 errores la baja (−6).

Junior: menos indicadores (O₂ y estado general), explicaciones sencillas y ayuda automática de la médica tras dos errores. Ingeniero: CO₂, presión y filtro con valores, desviaciones mayores y registro de correcciones. Ambos enseñan los mismos conceptos. **Todos los valores del viaje son simulados** (no son cálculos orbitales).

### Llegada y aterrizaje planetario
Una partida nueva **no empieza dentro de la base**: empieza con la llegada de la nave. La secuencia ocurre una sola vez por campaña (al cargar una partida no se repite) y se puede volver a ver como vista previa desde «Archivo de misión» (menú principal) o «Ver la llegada otra vez» (pausa), sin cambiar la partida.

1. **Aproximación** (≈ 17 s): la nave cruza en vista lateral mientras el planeta crece hasta ocupar la pantalla y aparece la zona. Panel con datos del destino (gravedad, atmósfera, temperatura, día, retraso de señal).
2. **Zona de aterrizaje:** mapa esquemático con 4 zonas por escenario, con terreno, pendiente, rocas, exposición, recursos cercanos, comunicaciones y espacio libre. Cada una tiene consecuencias pequeñas que **nunca bloquean la campaña**: la zona de recursos revela muestras ocultas desde el inicio, la expuesta sube la dosis en las salidas (×1,25) y mejora la antena (×1,12), la resguardada hace lo contrario, y el terreno difícil cuesta materiales o la nivelación de la plataforma.
3. **Revisión de la nave:** diagnóstico de cinco piezas (motor, patas, compuerta, tanques, baliza). Una queda «en observación» (según la semilla); se puede reajustar o continuar con ella.
4. **Descenso** (A aproximación · B descenso · C contacto · D completado): en la Luna no hay aire (solo motores, pluma fina, polvo balístico que viaja lejos); en Marte hay escudo térmico, paracaídas, pluma ancha y una nube de polvo con arrastre que el viento mueve. El jugador **enciende los motores** (anillo de tiempo; si no pulsa, se encienden tarde y el motor queda en observación). La nave aterriza centrada en la plataforma elegida, con sacudida y polvo proporcionales al terreno.
5. **Despliegue** (9 pasos visibles: compuertas, módulos, paneles solares, antenas, energía, conexión, soporte vital, bahía del rover, verificación). Decisiones: nivelar o no la plataforma (si el terreno es difícil) y **qué sistema se activa primero** (energía, soporte vital o comunicaciones: ventaja inicial pequeña).

**La nave es permanente:** queda en el mapa exterior como obstáculo sólido, con una ruta de rover desde la base, marcador en el mapa y el radar, y diodos de estado. Funciona como **baliza y relé de radio** (amplía la señal 34 baldosas a su alrededor) y se puede revisar con `E`: cada pieza tiene estado y se repara con 3 de materiales. Se guardan destino, zona, estado del aterrizaje, despliegue, posición, instalaciones y decisiones.

**Omitir:** «Omitir (acelerar)» (o `Esc`) está disponible solo después de verla una vez; acelera la animación pero las decisiones siguen esperando. Con narración TTS, subtítulos, sonidos de motor, contacto y confirmación y la música ambiental si está activada en «Audio y voces».

## Datos científicos y fuentes

El juego distingue tres tipos de números (también en la pantalla «Fuentes científicas»):

- **R — Dato real** medido o publicado.
- **M — Estimación** derivada de un modelo.
- **G — Simplificación** para jugabilidad.

| Parámetro | Valor | Tipo | Fuente / nota |
|---|---|---|---|
| Consumo de O₂ por persona | 0,84 kg/día | R | Valor de diseño de soporte vital de NASA |
| Agua para electrólisis | 1,125 L por kg de O₂ | R | Estequiometría 2 H₂O → 2 H₂ + O₂ |
| Banda segura de O₂ en cabina | 19,5 % – 23,5 % | R | Normas de seguridad ocupacional (OSHA 29 CFR 1910.146) |
| Dosis de fondo en Marte | ≈0,64 mSv/día | R | MSL/RAD, cráter Gale (Hassler et al., *Science*, 2014) |
| Dosis de fondo en la Luna | ≈1,37 mSv/día | R | Chang'e-4 LND, cara oculta (Zhang et al., *Science Advances*, 2020) |
| Irradiancia solar en Marte | ≈43 % de la terrestre | R | NASA Mars Fact Sheet |
| Duración del sol marciano | 24,66 h | R | NASA |
| Gravedad Luna / Marte | 1,62 / 3,71 m/s² | R | NASA |
| Retraso de la luz Tierra–Marte | ~3 a ~22 min | R | NASA |
| Recuperación de agua de la ISS | >90 %, 98 % en 2023 | R | NASA (2023) |
| Eficiencia del reciclador | 0,85 (eco) / 0,93 (máx.) | M | Inferior al mejor valor de la ISS |
| Ración diaria | 0,62 kg/persona | M | Orden de magnitud de menús deshidratados |
| Agua de uso por persona | 3,5 L/día | G | Mínimo del modelo |
| Reactor | 6 kW (Luna), 10 kW (Marte) | G | Reducido; NASA estudia sistemas de fisión de ~40 kWe |
| Paneles | 12 kW (Luna), 18 kW (Marte) pico | G | Mayor superficie en Marte por la menor irradiancia y el polvo |
| Ciclo de cultivo | 7 días simulados | G | Compresión educativa (base: material de la CSA) |
| Retraso de mensajes en juego | 1 min-luz ≈ 1 h simulada | G | Para que el retraso sea perceptible |
| Tormenta solar | 2,0–2,8 mSv/h sin blindaje, 14–22 h | G | Modelo simplificado, no es una medición |
| Límite de dosis de la partida | 120 / 80 / 60 mSv | G | Umbral del juego por dificultad, no es un límite médico |
| Tiempo | 1 s real = 0,4 h simuladas (x1) | G | Un día ≈ 1 minuto |

### Fuentes oficiales consideradas
- NASA Open APIs — https://api.nasa.gov/
- DONKI (NASA CCMC) — https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA OSDR — https://osdr.nasa.gov/bio/repo/
- RadLab — https://visualization.osdr.nasa.gov/radlab/gui/data-api/
- NASA Mars Trek — https://trek.nasa.gov/mars/ · Moon Trek — https://trek.nasa.gov/moon/
- Agencia Espacial Canadiense, producción de alimentos — https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/
- Oficina Nacional de Estadística — https://www.one.gob.do/
- Ministerio de Energía y Minas — https://mem.gob.do/
- Ministerio de Medio Ambiente y Recursos Naturales — https://ambiente.gob.do/
- INDRHI, ONAMET y Ministerio de Agricultura (referencias cualitativas)

### Cómo se usa cada conjunto de datos (y sus límites)
- **DONKI**: la Misión 3 se inspira en tres registros históricos guardados localmente (erupción X17 del 2003-10-28, X9.3 del 2017-09-06 y tormenta geomagnética G5 del 2024-05-10). Un evento de DONKI **no equivale** a una dosis recibida por una persona.
- **RadLab**: se presenta como referencia de dosimetría de la **ISS**, que orbita dentro del campo magnético terrestre. **No** son mediciones de la Luna ni de Marte.
- **OSDR**: se cita como repositorio de investigación biológica, **no** como monitorización médica en tiempo real.
- **Mars Trek / Moon Trek**: los sitios de la Misión 4 llevan valoraciones **cualitativas** del juego (1–5) basadas en descripciones públicas; no son mediciones ni certifican que un lugar sea seguro.
- **CSA**: inspira el contenido de cultivo; el ciclo de 7 días es una compresión educativa.

### República Dominicana
**No se inventan estadísticas dominicanas.** Las fichas de Conexión con la Tierra usan explicaciones cualitativas (gestión del agua, energía solar y almacenamiento, invernaderos y riego por goteo, preparación ante huracanes, residuos y protección ambiental) y remiten a las instituciones oficiales. Las referencias normativas citadas son la Ley 57-07 (incentivo a energías renovables) y la Ley 225-20 (gestión integral de residuos sólidos). La temporada de huracanes del Atlántico (1 de junio a 30 de noviembre) se cita como dato general. Los "Prueba tú" interactivos usan **ejemplos ilustrativos** marcados como tales; el calculador de retraso Tierra–Marte usa física real (distancia ÷ velocidad de la luz).

Los Objetivos de Desarrollo Sostenible (2, 3, 4, 6, 7, 9, 11, 12, 13 y 17) aparecen con una frase que explica la relación concreta con la decisión de ingeniería, y cada ficha incluye un apartado de **límites para transferir la solución**.

## Integración con NASA y funcionamiento sin conexión
- Al abrir el juego, si hay conexión, se intenta una única petición a `https://api.nasa.gov/DONKI/FLR` (últimos 30 días) con `DEMO_KEY` y un tiempo máximo de 7 s. Si responde, las erupciones aparecen en «Fuentes científicas» y en el panel «¿Por qué ocurrió?» de las tormentas, con la fecha de consulta.
- Si no hay conexión, se alcanza el límite de `DEMO_KEY` o la API falla, el juego usa los registros históricos locales y lo indica («no es en tiempo real»). **La indisponibilidad de una API nunca impide jugar.**
- La última respuesta válida se guarda en `localStorage` como respaldo.

### Claves de API
- Solo se usa `DEMO_KEY`, la clave pública de pruebas de api.nasa.gov, con límites de uso bajos. **No es una clave privada** y no hay credenciales en el código.
- Para un uso intensivo (por ejemplo, un aula entera conectada a la vez), cada centro puede obtener su propia clave gratuita en https://api.nasa.gov/ y sustituir `DEMO_KEY` en la función `fetchDonki` de `index.html`. No la publiques en un repositorio público.

## Guardado
**Migración de partidas anteriores:** las partidas guardadas con el formato anterior a los pisos se adaptan al cargarlas: el jugador aparece en el piso que corresponde a su posición guardada (p. ej. en el reactor → piso 3), con la estación, el viaje y la llegada ya completados. **Antes de migrar se guarda una copia intacta** del formato anterior (una sola vez por partida, sin pisar otra copia distinta), se avisa en pantalla y el menú principal ofrece «Restaurar copia de seguridad». Al volver a guardar, la partida pasa al formato nuevo (versión 2, con piso). Probado con una partida anterior simulada; **no** se ha probado con partidas guardadas reales de otras versiones.

`localStorage` (clave `jamt.v1`) guarda partida en curso, ajustes, idioma, estadísticas, logros y fichas desbloqueadas. Todo acceso va dentro de `try/catch`; si está bloqueado, el juego usa memoria temporal. Autoguardado cada 15 s, al pausar y al cambiar de pestaña.

## Arquitectura de `index.html`
Un solo archivo, organizado en módulos internos con responsabilidades separadas:

| Módulo | Responsabilidad |
|---|---|
| `DATA` | Textos bilingües, misiones, eventos, fuentes, fichas, sitios y preguntas |
| `Store` | Almacenamiento seguro con respaldo en memoria |
| `Sfx` | Sonidos y música ambiental originales sintetizados con Web Audio API |
| `Voice` | Texto a voz (Web Speech API): perfiles internos, selección de voces, cola y subtítulos |
| `Sim` | Motor de simulación puro (entre los marcadores `/*SIM-START*/` y `/*SIM-END*/`) |
| `SelfTest` | 100 simulaciones automáticas sobre `Sim` |
| `Icons` | Iconos SVG por rutas (DOM y canvas) y conversión de pictogramas |
| `Chars` | Los cinco astronautas: dibujo por capas, 4 direcciones y 7 poses |
| `Flora` | Las cinco especies vegetales: 5 etapas, variación natural y estados de estrés |
| `NPCDATA` | Guías, conversaciones, campaña, contenido de las llamadas y fichas botánicas |
| `Layout` | Arquitectura de la base como datos: formas de sala, túneles, puertas, mobiliario, consolas y escenografía exterior de cada escenario |
| `Art` | Dibujo estático por capas (terreno, sombras, casco, suelos, mobiliario, exterior) |
| `Station` | Estado de la estación por pisos: elevadores de tripulación y de rover como máquinas de estados (puertas, movimiento, averías, escalera de emergencia). Serializable y guardado en la partida |
| `Trip` / `TripArt` | Viaje: encendido con dependencias, navegación, soporte vital y consecuencias (motor puro) y dibujo de la cabina, el lanzamiento y la brújula |
| `Land` / `LandArt` | Llegada: zonas de aterrizaje y sus consecuencias, estado de la nave (motor puro) y dibujo de la aproximación, el descenso, el polvo y el despliegue |
| `World` | Cuadrícula, colisiones, puertas, rutas, esclusa, bots, cámara con zoom, efectos animados, partículas y minimapa |
| `MG` | Seis minijuegos |
| `Game` | Bucle principal, entrada, HUD, consolas, panel de consecuencias, comunicaciones, fichas, informe y menús |

Para facilitar el mantenimiento, el mismo código está dividido por módulos en `src/`. `tools/build.sh` concatena esos archivos y regenera `index.html`; edita `src/` y reconstruye en lugar de editar `index.html` a mano.

## Pruebas
Requieren Node.js; las de navegador, además, Playwright con Chromium.

```bash
node tests/run-selftest.js 100
```

```bash
node tests/contrast.js
```

```bash
node tests/e2e.js
```

```bash
node tests/expo.js
```

```bash
node tests/earthlink.js
```

```bash
node tests/camera.js
```

```bash
node tests/landing.js
```

```bash
node tests/travel.js
```

```bash
node tests/floors.js
```

**Integración continua:** `.github/workflows/pruebas.yml` ejecuta en GitHub Actions, en cada PR y en cada cambio en `main`, la comprobación de que `index.html` coincide con `src/`, las 100 simulaciones, el contraste, las pruebas e2e, las de exploración exterior, las de EarthLink Radio y las de cámaras en Chromium. Guarda las capturas como artefacto. Un PR solo está «en verde» si pasan todas.

También puedes abrir `index.html?selftest` o usar «Configuración → Ejecutar 100 simulaciones de prueba». Las pruebas trabajan sobre copias del motor y no modifican el progreso del jugador.

**Resultados obtenidos al construir esta versión:**
- `run-selftest.js`: 100 simulaciones (Luna/Marte × 3 dificultades, 75 con una política activa y 25 pasivas), **0 errores**: sin NaN, sin valores negativos, todos los recursos y plantas dentro de sus límites y finales coherentes. La política activa completa la familiarización y gana las 75 partidas (50 en Junior y 25 en Ingeniero, con diagnóstico previo); la pasiva nunca gana (se agotan alimentos o quedan incidentes críticos sin resolver).
- `contrast.js`: 14/14 pares de tokens cumplen WCAG AA.
- `camera.js` (Chromium, sin Internet): **28/28** comprobaciones del sistema de dos cámaras: personaje claro (≥ 70 px en escritorio y ≥ 55 px en móvil), base completa nunca visible en la exploración normal, zoom orientable, seguimiento suave, secciones lejanas veladas con puertas y pasillos cercanos visibles, paredes y rejilla intactas, el mapa M aleja la cámara con transición, muestra toda la base, vuelve al zoom y a la posición anteriores con M y con Esc, mismo mundo y mismas coordenadas, movimiento y colisiones intactos, exterior a pie y en rover (zoom con la velocidad), mapa disponible fuera y móvil de 390 × 844 px.
- `earthlink.js` (Chromium, sin Internet, con la Web Speech API **simulada**): **67/67** comprobaciones de EarthLink Radio: apertura y cierre por botón y tecla (y tecla configurable, rechazo de teclas en uso), representación de la Tierra y datos (distancia, retardo real y comprimido, canal, pendientes), los seis estados calculados con la simulación, seis canales con funciones distintas, envío con retraso, orden de los mensajes, escala configurable, perfiles de voz (incluidos `npc_earth_control_*`) con voiceURI, velocidad, tono y volumen, cada especialista con su voz, subtítulos sincronizados con los límites de palabra, volumen de radio independiente, fallo de antena con mensajes en cola y recuperación al reparar, interferencia, pérdida de energía, daño exterior y reparación, el fallo termina solo, propuestas de especialistas, consecuencias (diagnóstico, pronóstico, misión, órdenes, suministros, ruta, plagas, dosis, muestras, recogida), informes con valores reales, historial (acotado, persistente al guardar y cargar), modos 7-12 y 13+, Marte (3–22 min), ausencia de voz antes de interactuar, funcionamiento sin TTS, sin red y en móvil de 390 × 844 px.
- `expo.js` (Chromium, sin Internet): **109/109** comprobaciones de la exploración exterior: traje (equipar, quitar, aspecto, reparar, revisión), esclusa con y sin traje, subir, bajar y volver a subir (también junto a rocas), conducción real con teclado (aceleración gradual, velocidad máxima, giro, resistencia, frenado y marcha atrás), colisiones con rocas, casco y edificios, batería agotada, consumo de oxígeno y energía y sus variaciones, radiación (refugio y ráfagas), alertas con histéresis por radio, evacuación de emergencia, señal y repetidores, tarjeta y recogida de muestras con registro único, muestras ocultas y escáner, contenedor y compartimento limitados, organizar y retirar, descarga solo cerca de la base, almacén, análisis y registro científico, herramientas, puntos de interés, refugio, las cuatro misiones, diferencias entre la Luna y Marte, accesibilidad por rutas a pie y en rover de todos los objetivos, HUD en los dos niveles, guardado y carga sin duplicados, migración de partidas antiguas, rendimiento y controles táctiles en un móvil de 390 × 844 px.
- `floors.js` (Chromium, sin Internet): **63/63** comprobaciones de los pisos: reparto de salas, solo la planta baja con exterior, cada piso como ranura independiente (probado con un cuarto piso de prueba), `setFloor`, piso guardado y partidas anteriores en el piso 1, red de seguridad al colocar al jugador, NPC que cambian de piso por el elevador sin teletransporte, teletransporte de la sala de comandos, elevador con llamada, trayecto real y llegada, escalera de emergencia con el elevador averiado, alertas con piso, selector de pisos del mapa, la migración de una partida anterior con copia de seguridad y restauración, el elevador del rover (no se mueve sin el vehículo bien colocado; guarda el rover en el garaje con su batería y muestras; vuelve a subirlo), el núcleo energético (escala, equipamiento, consolas alcanzables, puerta de seguridad que bloquea solo al jugador, protocolo con traje, caducidad), y los elevadores (tripulación y rover) como máquinas de estados con su avance en el bucle y en el guardado.
- `travel.js` (Chromium, sin Internet, con la Web Speech API **simulada**): **41/41** comprobaciones del viaje: dependencias del encendido, cabina con 5 tripulantes, cambio de personaje, errores que explican y no bloquean, lanzamiento y omisión solo tras la primera vez, navegación y correcciones con consecuencias, soporte vital con los 4 eventos, reporte a Tierra con la voz del comandante y la respuesta con la de Control Tierra, diferencias Junior/Ingeniero, enlace con el aterrizaje, guardado sin repetir el viaje y panel en móvil.
- `landing.js` (Chromium, sin Internet): **45/45** comprobaciones de la llegada: las 4 zonas de cada escenario tienen sitio libre y ruta, la nave aterriza centrada en Luna y Marte, el suelo es gris o rojizo, Marte usa escudo térmico y paracaídas y la Luna no, la primera vez no se puede omitir y después sí, narración y subtítulos, el despliegue completa 9 pasos y activa el relé, las decisiones (zona, ignición, nivelado, prioridad, reparación) tienen consecuencias, la campaña empieza tras aterrizar, el guardado conserva zona y nave, **cargar no repite el aterrizaje**, la repetición no cambia la partida, el coste de dibujo es < 12 ms por cuadro y el panel cabe en móvil.
- `e2e.js` (Chromium, sin Internet): **190/190** comprobaciones: inicio, escenario y dificultad, movimiento, colisiones, puertas, interacción, misiones, pausa con paneles abiertos, panel de consecuencias, minijuego que repara un incidente, comunicaciones con retraso y respuesta, evento con «¿Por qué ocurrió?», guardado y recuperación, ficha y pregunta, cambio de idioma, informe final, cero errores de consola, `localStorage` bloqueado, móvil de 390 × 844 px con joystick táctil y sin desplazamiento horizontal, SelfTest en el navegador y personajes: las 140 combinaciones de personaje × dirección × pose se dibujan sin errores, las piernas aparecen separadas y las siluetas (solo la máscara de forma, sin color) difieren entre especialidades: el solapamiento máximo entre dos personajes es 0,875 de frente y 0,877 de perfil, por debajo del umbral de 0,9. Además, la familiarización completa con acciones reales: cinco secciones al empezar, puertas bloqueadas, cada guía presentándose al entrar y desbloqueo de cada sección al terminar su misión. Fase de instalaciones: las 13 salas existen y son alcanzables por rutas reales transitables desde el puente; el almacén de alimentos, la cocina, el almacén de muestras, el taller y la gestión de residuos cambian el estado de la simulación como se describe; la cadena de ampliación se abre paso a paso sin bloquear misiones; las partidas guardadas antiguas se migran. Mapa: M abre y cierra, Esc cierra, botón del HUD, pausa del tiempo, ficha de sala, ruta y destino marcado. Rediseño visual: salas con formas y tamaños distintos, túneles, puertas horizontales y verticales, rutas de exploración navegables, objetos exteriores sólidos, geografía distinta en la Luna y en Marte (cráteres y rocas frente a dunas y mesas), zoom y vista general, efectos de corte eléctrico y tormenta de polvo, y rendimiento (arte construido en menos de 4 s y dibujado por fotograma por debajo de 40 ms; en este entorno sin GPU: ~0,3 s y ~5 ms). Audio con la Web Speech API **simulada** (Chromium sin voces reales): perfiles, detección con `voiceschanged`, prioridad de selección, sin solapes, volúmenes, subtítulos, TTS desactivado, ausencia total de TTS y `localStorage` bloqueado. Modalidades: la pantalla de inicio ofrece las dos, se guardan y se recuperan con la partida, Junior muestra 4 indicadores sin unidades y Ingeniero 5 con unidades, los textos de Junior no contienen jerga técnica en español ni en inglés (frases de 190 caracteres como máximo) y los de Ingeniero conservan los términos, las explicaciones cambian de nivel manteniendo el fenómeno, Junior no recibe sensores descalibrados ni fallos térmicos, las cadenas de eventos solo ocurren en Ingeniero, el diagnóstico bloquea la reparación hasta acertar (y el error cuesta 1 h), las llamadas y las conversaciones de los NPC cambian de nivel, hay preguntas distintas por nivel, el informe se adapta, la interfaz no contiene emojis y el móvil de 390 px no tiene scroll horizontal en ninguno de los dos modos. Plantas: selección individual, sembrar gasta semillas, regar gasta agua, los nutrientes gastan solución, subir el LED aumenta la demanda eléctrica, cosechar suma alimentos, la nutrición cambia el crecimiento (0,148 frente a 0,022 en 24 h), las cinco especies tienen siluetas distintas (solapamiento máximo 0,633) y las cinco etapas crecen en tamaño. Especialistas y alertas: el vestuario cambia de rol y deja al anterior como NPC, los permisos no bloquean las reparaciones de emergencia, cada fallo lo comunica el NPC adecuado, «Marcar ubicación» coloca el marcador, los mensajes repetidos no se acumulan y las alertas críticas tienen prioridad.

**No probado:** Firefox, Edge y Safari reales, tablets o teléfonos físicos y lectores de pantalla. El código usa solo APIs estándar (Canvas 2D, Pointer Events, Web Audio, `fetch`), pero esas plataformas no se han verificado.

## Limitaciones conocidas
- **Voz:** las pruebas de texto a voz usan una Web Speech API simulada; no se han probado voces reales de ningún sistema operativo ni navegador. Las voces disponibles, su calidad y la reproducción antes de interactuar dependen del dispositivo. La música ambiental generativa y las voces no se han probado con altavoces reales.
- **Instalaciones:** el sistema transversal de «seguridad de instalaciones» y la organización de turnos de los dormitorios no están implementados como sistemas propios (hay descanso en las cabinas y los NPC duermen de noche desde el día 2). La médica «mejora diagnósticos» con una revisión detallada que es una estimación del modelo.
- **EarthLink Radio:** probada con una Web Speech API simulada (sin voces reales de ningún dispositivo); los sonidos son tonos generados, no se han probado con altavoces reales. La radio no usa la red. Los retardos reales son los de referencia (Luna ≈ 1,3 s; Marte 3–22 min según la posición orbital); el del juego es comprimido y configurable. La señal se calcula con reglas sencillas (antena, energía, tormentas, distancia y repetidores), no con un modelo de propagación. Las respuestas de la Tierra se generan con reglas sobre los datos reales de la partida (no es una IA conversacional).
- **Pisos (parcial):** la estación tiene tres pisos y elevador de tripulación usable, pero **no está terminada**: las salas conservan su forma y sus posiciones originales (el reparto es por piso, no un rediseño compacto), el piso 3 imita la «doble altura» solo con una pasarela elevada dibujada (no hay dos niveles reales ni se puede caminar por encima del reactor), la puerta de seguridad también deja pasar al jugador si va detrás de un NPC que la abre, **el elevador del rover es una versión simplificada** (la plataforma es exterior y guarda el rover en un garaje «abstracto»: no se puede conducir el rover por el interior del garaje ni viaja el conductor dentro), las puertas del elevador de tripulación no se dibujan en el mundo (solo en su panel) (las partidas anteriores sí se migran con copia de seguridad, ver «Guardado»). Los NPC no usan el estado `Station` (hacen su propio trayecto), así que pueden coincidir con el jugador en la cabina.
- **Viaje espacial:** probado con Chromium sin GPU y con una Web Speech API simulada; la «integración» con EarthLink Radio es una versión ligera (reporte y respuesta con voces y retraso del destino), no el motor completo de EarthLink, que necesita la simulación de la base en marcha. El estado del viaje se guarda al terminar el despliegue (no a mitad del viaje).
- **Llegada y aterrizaje:** probada con Chromium sin GPU y con una Web Speech API simulada; los números de altura y velocidad son didácticos, no una simulación física real. La base ya construida es la misma en todas las zonas: la zona elegida cambia la posición de la nave, la ruta, las condiciones y los costes, **no** la distribución de las salas. La nave sirve como baliza y relé de radio, no como almacén de muestras. Si se sale a mitad de la llegada, no se guarda esa partida (se guarda al terminar el despliegue).
- **Exploración exterior:** probada con Chromium sin GPU, con teclado y con el joystick simulado por ratón; no se ha probado en dispositivos táctiles reales ni con mandos. Los valores de radiación, autonomía del traje y capacidad del rover se han simplificado para jugar en minutos. Las muestras son ficticias (no son muestras reales de NASA). La señal de radio no se bloquea por el relieve (solo por distancia, tormentas y repetidores). El efecto de tormenta de polvo y de noche se ha revisado en capturas, no con personas.
- **Arte del mapa:** el aspecto se ha revisado con capturas en escritorio (1400 × 900) y móvil emulado (390 × 844) en ambos escenarios, no en dispositivos reales. El lienzo estático ocupa 4352 × 3200 px (≈14 M de píxeles): en móviles antiguos con poca memoria podría ir justo.
- **Nombre del juego:** el juego se llama Space Explorer; el subtítulo «Astro Caribe Challenge» es el nombre del reto.
- El modelo es educativo y simplificado; no sirve para diseñar una base real.
- No es una PWA: no hay *service worker* ni manifiesto. Funciona sin conexión porque es un único archivo local.
- Solo se integra DONKI en vivo. OSDR, RadLab, Mars Trek y CSA se citan como referencias con enlaces y datos incorporados, porque sus interfaces no ofrecen una consulta sencilla y útil desde un archivo local sin servidor.
- Los textos en inglés son más breves que en español en algunos paneles.
- El retraso de las comunicaciones y el ciclo de cultivo están comprimidos en el tiempo (documentado arriba).
- Con `file://`, algunos navegadores restringen `localStorage`; en ese caso el progreso dura solo la sesión.

## Licencia y créditos
Código, gráficos (dibujados por código) y sonidos (sintetizados) son originales de este proyecto. Los nombres de misiones y agencias se citan con fines educativos.
