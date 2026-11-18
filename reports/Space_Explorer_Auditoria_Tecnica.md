# Space Explorer — Auditoría técnica integral

**Fecha de elaboración:** 18 de noviembre de 2026
**Versión auditada:** rama `claude/vibrant-thompson-h3dm51`, commit `05e7a1c` (incluye el PR 25, aún sin fusionar; `main` está en `a563654`)
**Alcance:** diagnóstico de solo lectura. No se modificó ningún archivo del juego; este informe y su PDF son los únicos archivos añadidos (carpeta `reports/`).

---

## 1. Resumen ejecutivo

Space Explorer es un juego educativo 2D de gestión y exploración (una base en la Luna o en Marte) que se distribuye como **un único archivo `index.html` de 1,17 MB**, sin dependencias externas ni bibliotecas, construido a partir de 36 archivos en `src/`.

**Veredicto:** el proyecto es amplio y está bien integrado: motor de simulación puro y probado, 5 niveles de estación con elevadores reales, supervivencia con condiciones de derrota explicadas, flujo de inicio con edad, misión y dificultad, comunicaciones con la Tierra, rover, viaje y aterrizaje. Tiene **654 comprobaciones automáticas más 100 simulaciones del motor**, y todas pasan en esta versión.

Lo que más preocupa **no es la falta de funciones, sino tres cosas de robustez y verificación**:

1. **El bucle principal no tiene protección contra errores** (hallazgo comprobado experimentalmente): una sola excepción transitoria en el dibujado congela la simulación para siempre, sin mensaje al jugador.
2. **Rendimiento en móviles de gama media**: con la CPU limitada ×4 el juego baja a ~42 fps; con ×6, a ~35 fps. En escritorio y con CPU sin limitar mantiene 60 fps.
3. **Casi todo se ha probado con Chromium sin GPU, voz simulada y emulación táctil.** No hay evidencia en dispositivos reales, con altavoces reales ni con jugadores reales. El equilibrio de dificultad solo se ha medido con bots.

Además hay defectos menores concretos: verbos de interacción sin traducir (`use` aparece tal cual en pantalla), HUD móvil que ocupa cerca de un tercio de la altura, y documentación con secciones duplicadas y contradictorias.

**Calificación global estimada: 7,0 / 10** (ver sección 6).

### Metodología y límites de esta auditoría

| Qué se hizo | Cómo |
|---|---|
| Revisión estática | Estructura de `src/`, orden de compilación, conteo de funciones, búsqueda de referencias, TODO, manejadores de eventos y llamadas de red |
| Ejecución de las pruebas | Las 9 suites y las 100 simulaciones del motor, sobre el código real |
| Sondas en el navegador | Medición de fps y de CPU del hilo principal (Chromium + protocolo de depuración), inyección de un fallo, partidas pasivas simuladas, inventario de datos en ejecución |
| Revisión visual | Capturas reales de menú, puente, reactor, exterior, mapa y móvil (390 × 844); hoja de personajes del repositorio |

**No se hizo y queda pendiente de verificación:** pruebas en móviles/tabletas reales, con mandos, con voces y altavoces reales, sesiones con jugadores reales, perfilado con las herramientas del navegador en un dispositivo real, accesibilidad con lector de pantalla.

---

## 2. Arquitectura y tecnologías detectadas

### 2.1 Tecnologías

- **JavaScript sin framework ni bibliotecas.** 0 etiquetas `<script src>`; HTML, CSS y JS en un solo archivo. Dibujo con **Canvas 2D** (arte generado por código; solo 2 imágenes incrustadas en base64, una de ellas el logo de 32 KB en una línea).
- **Audio:** Web Audio API (sonidos y ambiente sintetizados) y Web Speech API (voces del sistema).
- **Persistencia:** `localStorage` (clave `jamt.v1`) con respaldo en memoria si no está disponible.
- **Red:** una sola llamada, a la API DONKI de NASA (`api.nasa.gov`, con `DEMO_KEY`), opcional, con tiempo máximo de 7 s, caché y funcionamiento sin conexión.
- **Compilación:** `tools/build.sh` concatena `src/` en `index.html` y comprueba la sintaxis; la integración continua exige que `index.html` coincida con `src/`.
- **Pruebas:** Playwright + Chromium sin conexión (9 suites) y un motor probado en Node (`tests/run-selftest.js`).
- **Despliegue:** Vercel (producción desde `main`) y un flujo de GitHub Pages.

### 2.2 Tamaño

| Medida | Valor |
|---|---|
| `index.html` | 1.168.035 bytes |
| Archivos en `src/` | 36 (10.642 líneas; muchas líneas largas, la mayor es el logo) |
| Funciones con nombre | 559 |
| Líneas de pruebas | 2.985 |

### 2.3 Organización por capas (según el orden de `build.sh`)

| Capa | Archivos | Función |
|---|---|---|
| 02 Datos | `02_data`, `02b_npc`, `02c_levels`, `02d_icons`, `02e_voice`, `02f_logo` | Textos es/en, NPC, niveles, iconos, voz, audio y `Store` |
| 03 Motores puros | `03_sim` (1.052 líneas), `03c_expo`, `03d_earthlink`, `03e_landing`, `03f_trip`, `03g_station`, `03h_surv` | Simulación, exploración, radio, aterrizaje, viaje, elevadores y supervivencia, sin acceso al DOM |
| 04 Mundo y arte | `04_world` (948), `04a_layout`, `04b_chars`, `04c_flora`, `04d_art`, `04e_field`, `04f_rover`, `04g_landart`, `04h_tripart` | Mapas por piso, colisiones, cámara, personajes, rover, terreno |
| 05 Minijuegos | `05_minigames` | 6 minijuegos |
| 06 Interfaz | `06a`…`06o` | Un único módulo `Game` repartido en 15 archivos |

### 2.4 Puntos fuertes de la arquitectura

- Los **motores puros** (`Sim`, `Station`, `Surv`, `Trip`) no tocan el DOM, así que se prueban en Node y en el navegador sin interfaz.
- Solo **2 de 559 funciones** con nombre no tienen ninguna referencia (`setPickable` en `04_world.js` y `landAbort` en `06k_landing.js`): el código muerto es mínimo.
- Los módulos de pisos (`FL[]`, `placeNear`, `rvis`) y la máquina de estados de elevadores (`Station`) están desacoplados del dibujado.
- Guardado con versión (`sv: 2`), migración (`Sim.migrate`) y copia de seguridad de partidas anteriores.

### 2.5 Puntos débiles de la arquitectura

- **`Game` es un módulo gigante** repartido en 15 archivos que comparten un único ámbito (cierra `06c_ui.js`). Funciona, pero un cambio en cualquier archivo `06*` puede afectar a todos, y el orden de concatenación es crítico.
- **Todo es global** (`Sim`, `World`, `Store`, `Game`…) y `Game._debug` expone funciones de prueba (`newRun`, `setSpeed`, etc.) también en producción.
- 63 llamadas a `addEventListener` frente a 5 a `removeEventListener`. La mayoría están sobre elementos permanentes, pero **no se ha verificado** que no haya fugas en paneles que se abren y cierran (pendiente).
- Muchas líneas de más de 400 caracteres (hasta 18 por archivo): dificulta la lectura y las revisiones.

---

## 3. Funcionalidades existentes (implementadas y comprobadas)

"Comprobada" significa: cubierta por una suite automática que pasa, o verificada por mí en esta auditoría. No significa probada con jugadores ni en dispositivos reales.

| Sistema | Evidencia |
|---|---|
| **Movimiento y controles** (teclado, joystick táctil, botón de acción) | Suites `e2e`, `camera`, `expo`; capturas móviles |
| **Estación de 5 niveles** (piso 1 Operaciones, piso 2 planta baja, piso 3 Energía, nivel G garaje, nivel 3A pasarela del núcleo) con elevador de tripulación, escaleras animadas y teletransporte | `floors` (111 comprobaciones) |
| **Elevadores**: máquina de estados real, trayecto a pantalla completa, NPC que usan la cabina real, plataforma del rover | `floors` |
| **Mapa general** con selector de pisos y **minimapa** | `floors`, captura |
| **Simulación de recursos** (aire, agua, energía, comida, radiación, integridad), 5 oficios, 10 tipos de evento, 3 dificultades, 5 cultivos | `e2e`, 100 simulaciones del motor |
| **Supervivencia y derrota**: frío, avería del rover, hambre, dosis de radiación, núcleo; avisos previos; reintento | `survival` (27) y mis simulaciones pasivas (sección 7.3) |
| **Misiones**: 4 de familiarización y 7 avanzadas; 4 misiones de inicio (Estación, Ciencia, etc.) | `e2e`, `start` |
| **Seis minijuegos** (cableado, balance, O₂, solar, rover, invernadero) | `e2e` |
| **Agricultura**, **ciencia** (muestras, espectrómetro), **trece instalaciones** | `e2e` |
| **Exploración exterior y rover**, traje, señal, radiación | `expo` (109), `camera` |
| **EarthLink Radio** (comunicaciones con retraso, llamadas de NPC) | `earthlink` (67), con voz simulada |
| **Viaje y aterrizaje** (cuenta atrás, crucero animado, descenso) | `travel`, `landing` |
| **Flujo de inicio** (carga real, 5 franjas de edad, 4 misiones, 3 dificultades, resumen) | `start` (43) |
| **Guardado y carga** con migración y copia de seguridad | `e2e`, `floors` |
| **Idiomas** español e inglés | Revisión del diccionario (con la salvedad del apartado 5, P-03) |
| **Contraste de color** (WCAG) | `contrast.js` |
| **Reducción de movimiento**: CSS y ajuste del juego | `06a_ui.js:40`, reglas en `01_head.html` |

**Totales de pruebas:** e2e 195, expo 109, camera 28, earthlink 67, landing 45, travel 29, start 43, survival 27, floors 111 = **654**, más contraste y 100 simulaciones. Todas pasan en esta versión.

---

## 4. Funcionalidades incompletas, ausentes o con límites declarados

### 4.1 Implementadas parcialmente

| Funcionalidad | Estado real |
|---|---|
| **Rediseño compacto de las salas** | **No hecho.** Las salas conservan su forma y posición originales; solo se repartieron por pisos. |
| **Doble altura del núcleo** | Real (nivel 3A con pasarela caminable y mirador), pero el reactor y su sala siguen en el piso 3 con la forma original. |
| **NPC y elevadores** | Usan la cabina real, pero de uno en uno, y no usan la plataforma del rover. |
| **Rover en el garaje** | Queda aparcado y cargando; no se conduce dentro. |
| **Zonas de aterrizaje** | La zona cambia posición, ruta, condiciones y costes, pero **no** la distribución de la base. |
| **Señal de radio** | Depende de la distancia; el relieve no la bloquea. |
| **Seguridad de instalaciones y turnos de dormitorios** | No existen como sistemas propios (documentado). |
| **Muestras científicas** | Son ficticias (no son muestras reales de NASA). |

### 4.2 Interfaz sin funcionamiento real

No encontré botones o paneles puramente decorativos en los recorridos que ejercité. Las referencias a OSDR, RadLab, Mars Trek y CSA son **enlaces y datos incorporados**, documentados como tales (no consultas en vivo). *(Pendiente de verificar: un barrido manual de todos los botones de todos los paneles.)*

### 4.3 Ausentes

| Funcionalidad | Observación |
|---|---|
| Varias ranuras de guardado, exportar/importar partida | Hay una única ranura (`run`) |
| Soporte de mandos | 0 referencias a la API de gamepad |
| PWA / service worker / manifiesto | Funciona sin conexión por ser un archivo local |
| Telemetría o datos de uso | No existe; el equilibrio no puede validarse con jugadores |
| Gestión global de errores | No hay `window.onerror` ni `unhandledrejection` (ver P-01) |
| Pruebas con dispositivos reales, voces y altavoces reales | No existen |

---

## 5. Errores y problemas encontrados

Cada problema indica si está **verificado** (reproducido o leído en el código) o **pendiente de verificación**.

### Tabla resumen

| ID | Problema | Gravedad | Estado |
|---|---|---|---|
| P-01 | Bucle principal sin protección: un error congela el juego | **Alta** | Verificado (experimento) |
| P-02 | Rendimiento justo en móviles de gama media | **Alta** | Medido con CPU limitada; real pendiente |
| P-03 | Verbos de interacción sin traducir (`use`) | Media | Verificado (captura) |
| P-04 | HUD móvil muy ocupado y solapamientos | Media | Verificado (captura 390 × 844) |
| P-05 | Dificultad solo validada con bots | Media | Medido; con jugadores, pendiente |
| P-06 | Una sola ranura de guardado, sin exportar | Media | Verificado en código |
| P-07 | Documentación duplicada y contradictoria | Baja | Verificado |
| P-08 | `Game._debug` y globales expuestos en producción | Baja | Verificado |
| P-09 | Código muerto (2 funciones) | Baja | Verificado |
| P-10 | Dependencia opcional de NASA con clave compartida (`DEMO_KEY`) | Baja | Verificado en código |
| P-11 | Posibles fugas de manejadores de eventos | Baja | Pendiente de verificación |
| P-12 | Memoria con el lienzo estático grande en móviles antiguos | Media | Declarado en README; pendiente |

### Detalle

#### P-01 · Bucle principal sin protección ante errores — **Alta**
- **Sistema:** `src/06a_ui.js`, función `frame()` (líneas 310–335); no hay manejador global de errores.
- **Descripción:** `requestAnimationFrame(frame)` se llama al **final** de la función, sin `try/catch`. Si cualquier cosa lanza una excepción dentro (dibujado, `World.update`, `Sim.step`…), el siguiente fotograma nunca se programa.
- **Verificación:** inyecté un único fallo en `World.render` durante un fotograma. Antes del fallo el reloj de simulación avanzaba; después quedó parado en 0,72 h y no volvió a avanzar en 3 s (`simulacionSigueAvanzando: false`).
- **Consecuencia para el jugador:** la pantalla se queda congelada, sin mensaje y sin posibilidad de guardar; solo recarga la página. Se pierde como máximo el progreso desde el último autoguardado (cada 15 s).
- **Posible solución:** proteger el cuerpo del fotograma con `try/catch`, reprogramar siempre el siguiente fotograma, contar errores consecutivos y, si se repiten, guardar y mostrar un aviso con opción de volver al menú; añadir `window.onerror`/`unhandledrejection` con registro.
- **Proteger:** el orden de las llamadas del bucle (elevadores, trayecto, ambiente, mundo, simulación), el autoguardado y `startGameOver`, y que las pruebas puedan seguir inyectando estados.

#### P-02 · Rendimiento justo en móviles de gama media — **Alta** (medido en emulación)
- **Sistema:** dibujado por fotograma (`04_world.js`), lienzos estáticos por piso.
- **Datos:** ver la tabla de la sección 8. Con la CPU limitada ×4 la ocupación del hilo principal es del 96–99 % y los fps bajan a ~42 (p95 de 33 ms); con ×6, ~35 fps.
- **Consecuencia:** en teléfonos de gama media o antigua el movimiento se notaría poco fluido. La simulación está protegida por un límite de `dt` (0,05 s), así que no se acelera, pero tampoco se ve suave.
- **Posible solución:** perfilar en un dispositivo real con las herramientas del navegador para localizar el coste exacto; opciones habituales *(suposición, sin verificar)*: reducir la resolución interna en móvil, limitar efectos de iluminación y partículas, dibujar solo lo visible.
- **Proteger:** el aspecto visual ya validado y las pruebas de capturas/contraste.

#### P-03 · Verbos de interacción sin traducir — **Media**
- **Sistema:** `src/04a_layout.js` (consolas) y `src/02_data.js` (diccionario).
- **Descripción:** las consolas usan los verbos `use`, `equip`, `inner` y `outer`, que **no existen** en el diccionario. El juego muestra la clave tal cual.
- **Verificación:** la captura de escritorio y la móvil muestran «[E] use · Teletransporte de pisos» y «use · Teletransporte de pisos» en una interfaz en español. Nueve consolas usan `use`. Para `equip`, `inner` y `outer` solo se comprobó que faltan en el diccionario; **pendiente de verificar** si se muestran por otra ruta.
- **Consecuencia:** texto en inglés suelto en la interfaz en español, y sin mayúscula en inglés.
- **Posible solución:** añadir las claves al diccionario es/en.
- **Proteger:** las pruebas que buscan textos de los botones.

#### P-04 · HUD móvil muy ocupado y solapamientos — **Media**
- **Sistema:** HUD y botones flotantes (`06a_ui.js`, CSS en `01_head.html`).
- **Verificación (captura 390 × 844):** las 4 fichas de recursos y 2 filas de botones ocupan cerca de un tercio de la altura. Los botones de zoom se superponen a la etiqueta de la sala y el botón de acción «use · Teletransporte…» cubre el aviso inferior.
- **Consecuencia:** menos espacio de juego y avisos tapados en el móvil.
- **Posible solución:** fichas compactas o plegables en pantallas estrechas, reubicar zoom y acción, evitar solapamientos con avisos.
- **Proteger:** las comprobaciones de que no hay desplazamiento horizontal en móvil.

#### P-05 · Dificultad solo validada con bots — **Media**
- **Datos:** las simulaciones con política «inteligente» ganan el 100 % (75/75, en modalidades junior y avanzada). Un jugador pasivo pierde entre el día 6 y el día 30 según la dificultad (sección 7.3).
- **Consecuencia:** no se sabe si un niño o un adulto reales encuentran el juego demasiado fácil o demasiado difícil; los bots no reproducen errores humanos.
- **Solución:** sesiones con jugadores de cada franja de edad y, si se desea, telemetría anónima local.
- **Proteger:** las dificultades de `Sim.DIFFS` y las pruebas de «sin derrotas por sorpresa».

#### P-06 · Una sola ranura de guardado — **Media**
- `Store.set('run', …)` guarda una única partida; no hay exportar/importar. El almacenamiento total es pequeño (≈ 7 KB por partida). Si `localStorage` falla, el progreso dura solo la sesión; el menú lo avisa.
- **Solución:** varias ranuras y exportar/importar un archivo.
- **Proteger:** formato `sv: 2`, `Sim.migrate`, `World.state/restore` y la copia de seguridad.

#### P-07 · Documentación duplicada y contradictoria — **Baja**
- `README.md`: las secciones «Supervivencia y Game Over» (líneas 41 y 80) e «Inicio…» (58 y 97) aparecen dos veces. La sección «Familiarización, NPC guía y desbloqueo de secciones» dice que todas las salas son accesibles desde el principio, pero su tabla sigue titulando la columna «Desbloquea».
- **Solución:** unificar secciones y renombrar la columna.

#### P-08 · `Game._debug` y globales en producción — **Baja**
- Cualquier persona puede ejecutar desde la consola `Game._debug.newRun(...)`, cambiar la velocidad o saltar de nivel. Para un juego educativo gratuito el riesgo es bajo; las pruebas dependen de esa interfaz.
- **Solución (si interesa):** conservarla solo con un parámetro de depuración, **cuidando que las pruebas sigan funcionando**.

#### P-09 · Código muerto — **Baja**
- `setPickable` (`04_world.js`) y `landAbort` (`06k_landing.js`) no tienen referencias. Eliminarlas es seguro tras comprobarlo con las pruebas.

#### P-10 · Dependencia opcional de NASA con clave compartida — **Baja**
- `06c_ui.js:292` llama a DONKI con `DEMO_KEY`, que es una clave de pruebas con límite de peticiones. Hay tiempo máximo de 7 s, caché y funcionamiento sin conexión; en el entorno de pruebas sin red solo aparece un error de recurso en la consola. Sin impacto en el juego.

#### P-11 · Fugas de manejadores de eventos — **Baja, pendiente**
- 63 `addEventListener` frente a 5 `removeEventListener`. No se ha demostrado ninguna fuga; hay que perfilarlo abriendo y cerrando paneles muchas veces.

#### P-12 · Memoria del lienzo estático — **Media, pendiente**
- El README declara un lienzo estático de 4352 × 3200 px (≈ 14 Mpx) para el exterior, que podría quedarse corto en móviles antiguos. En esta auditoría el montón de JavaScript fue de unos 7 MB y los nodos del DOM menos de 900, pero **no se midió la memoria gráfica** (no disponible sin GPU).

---

## 6. Evaluación del videojuego (1–10)

| Criterio | Nota | Justificación |
|---|---|---|
| **Diseño visual** | 7 | Identidad coherente: logo y menú cuidados, paleta oscura con acentos cian, mapa por pisos muy legible, hoja de personajes con diseño propio por rol. Pero el puente muestra losas planas grandes sin detalle (mesa holográfica vacía) y consolas que son cuadrados pequeños con un icono. |
| **Experiencia de usuario** | 6 | Flujo de inicio claro, accesibilidad cuidada (contraste, reducción de movimiento, aria en controles). Baja por verbos sin traducir, HUD móvil ocupado, solapamientos y la queja real de clics perdidos en paneles (corregida en el PR 25). |
| **Jugabilidad** | 7 | Sistemas conectados, avisos antes de perder, derrotas explicadas, dificultad que realmente cambia el resultado. Sin jugadores reales no se conoce el equilibrio, y no hay mandos. |
| **Animaciones** | 6 | Elevadores, escaleras, viaje y trajes animados con transiciones de pantalla completa. Muchos efectos son funcionales más que vistosos; pocas partículas ambientales. |
| **Calidad de personajes** | 7,5 | Cinco personajes con vistas frente/espalda/lateral, casco, soporte vital y accesorios diferenciados. |
| **Calidad de escenarios** | 7 | Pisos con mobiliario, exterior con huellas y terreno; el núcleo y el garaje son los mejor resueltos. Interiores con salas rectangulares y detalles repetidos. |
| **Rendimiento** | 6 | 60 fps en escritorio; 42 fps con CPU ×4. Arranque de 120 ms; 7 MB de montón. |
| **Estabilidad** | 5 | 654 pruebas pasan y no hubo errores de página, pero el bucle no tiene red de seguridad (P-01). |
| **Profundidad educativa** | 8 | Datos con fuentes citadas, límites declarados, guía docente, edades y modalidades, modelos simplificados explicados. |
| **Integración de sistemas** | 7 | Elevadores, NPC, supervivencia, guardado y misiones comparten estado. Algunas integraciones son parciales (rover/garaje, NPC en la cabina). |

**Promedio: 6,7 · Estimación global redondeada: 7,0.**

---

## 7. Evaluación de jugabilidad

### 7.1 Movimiento y control
Teclado (WASD/flechas, E, P, M) y joystick táctil con botón de acción. Probados por automatización; **no se han probado en dispositivos táctiles reales ni con mandos** (no hay soporte de gamepad).

### 7.2 Mecánicas

| Mecánica | Clasificación |
|---|---|
| Movimiento del jugador | Implementada y comprobada (automática) |
| Interacción con objetos y consolas | Implementada y comprobada; con el error P-03 en textos |
| Comunicación con la Tierra | Implementada y comprobada con voz **simulada** |
| Comportamiento de los NPC (rutas, cabina, descanso nocturno) | Implementada y comprobada; uso de la cabina de uno en uno |
| Energía, oxígeno, agua y alimentos | Implementada y comprobada (motor puro) |
| Agricultura | Implementada y comprobada |
| Investigación científica | Implementada y comprobada |
| Exploración exterior y rover | Implementada y comprobada; rover no conducible en el garaje |
| Misiones y progresión de campaña | Implementada y comprobada (con bots) |
| Eventos y emergencias | Implementada y comprobada (10 tipos) |
| Condiciones de derrota y reinicio | Implementada y comprobada (`survival`) |
| Seguridad de instalaciones, turnos de dormitorios | Ausente como sistema propio |

### 7.3 Datos medidos: jugador pasivo (sin intervenir)

20 partidas por celda, semilla fija, 60 días máximo, escenario Luna, dificultad independiente:

| Modalidad / dificultad | Resultado (partidas de 20) | Mediana de días hasta el final |
|---|---|---|
| Junior / Explorador | 20 derrota por comida | 30 |
| Junior / Ingeniero | 8 comida, 11 abortadas por incidentes, 1 dosis | 17 |
| Junior / Comandante | 19 abortadas por incidentes, 1 comida | 6 |
| Avanzada / Explorador | 11 abortadas, 9 comida | 16 |
| Avanzada / Ingeniero | 18 abortadas, 2 comida | 7 |
| Avanzada / Comandante | 19 abortadas, 1 comida | 6 |

**Lectura:** la dificultad cambia de verdad el resultado y las derrotas llegan por causas tangibles (comida, incidentes sin atender, dosis), no al azar. Las simulaciones con política «inteligente» ganan el 100 %, así que el límite superior de dificultad no está medido con humanos.

---

## 8. Problemas de rendimiento

Medido en Chromium **sin GPU** (rasterizado por software): las cifras de ocupación del hilo principal incluyen el dibujado por software y son una cota superior en escritorio. La limitación de CPU emula un procesador más lento, no un teléfono real.

| Escenario | Ocupación del hilo principal | Tiempo de script | Montón JS |
|---|---|---|---|
| Escritorio · interior (piso 1) | 36,9 % | 11,0 % | 6,7 MB |
| Escritorio · exterior | 40,8 % | 13,1 % | 7,2 MB |
| Escritorio · garaje | 32,9 % | 8,2 % | 7,4 MB |
| Escritorio · núcleo 3A | 42,2 % | 16,4 % | 7,2 MB |
| Móvil dpr 3 · CPU ×1 · exterior | 23,2 % | 8,4 % | 6,3 MB |
| Móvil dpr 3 · CPU ×4 · interior | 98,5 % | 37,1 % | 6,7 MB |
| Móvil dpr 3 · CPU ×4 · exterior | 99,5 % | 41,2 % | 7,2 MB |
| Móvil dpr 3 · CPU ×4 · núcleo 3A | 96,2 % | 41,6 % | 7,0 MB |

| fps (móvil dpr 3, exterior) | CPU ×1 | CPU ×4 | CPU ×6 |
|---|---|---|---|
| Media | 60 | 42,3 | 34,7 |
| Fotograma p95 | 16,8 ms | 33,4 ms | 49,9 ms |

Otros datos: carga de la página 107–120 ms; crear una partida ≈ 0,8 s; nodos del DOM entre 386 y 857; guardado de ≈ 7 KB; 4 lienzos en el DOM durante el juego (el código crea otros por piso en memoria).

---

## 9. Evaluación visual (detalle)

| Elemento | Observación (basada en capturas reales) |
|---|---|
| **Menú principal** | Muy bueno: logo, fondo de planetas, botón principal destacado, 8 opciones. En móvil el logo ocupa ~la mitad de la pantalla y se necesita desplazarse. |
| **HUD** | Fichas de recursos legibles y barra superior ordenada; en móvil es voluminoso (P-04). |
| **Botones y paneles** | Estilo coherente (bordes azules, esquinas redondeadas). Un único «lenguaje» visual en todo el juego. |
| **Mapa general** | Excelente: arte propio por piso, etiquetas, puertas y selector de niveles. |
| **Minimapa** | Funcional y legible. |
| **Interior: puente** | La mesa holográfica central es un rectángulo azul sin detalle: parece prototipo. Consolas pequeñas con un icono. |
| **Interior: núcleo** | Reactor grande con anillos y transformadores con detalle: buen nivel. |
| **Exterior** | Terreno con cráteres y huellas, plataforma del rover con luces; plano pero coherente. |
| **Personajes** | Lo más cuidado del juego (hoja de personajes en `docs/personajes.png`). |
| **Vehículos** | Rover con animación y detalles (batería, antena, faros). |
| **Transiciones** | Pantalla completa en elevadores y viaje; correctas. |
| **Iluminación y partículas** | Presentes (sol, linterna, polvo), discretas. |

**Elementos que parecen prototipo:** losas azules lisas en el puente (mesa y otras superficies), consolas como cuadrados con icono, texto de verbo sin traducir. **Faltas de coherencia:** ninguna grave; el estilo es consistente.

---

## 10. Lista de mejoras priorizadas

### Prioridad 1 — robustez y errores que afectan al sistema
| Mejora | Dependencias / riesgos |
|---|---|
| **1.1** Proteger el bucle principal y añadir manejo global de errores (P-01) | Mantener el orden del bucle y el autoguardado. Riesgo bajo si se cubre con una prueba de inyección de fallos. |
| **1.2** Traducir los verbos de interacción (P-03) | Solo diccionario. Riesgo mínimo. |
| **1.3** Probar en dispositivos reales (móvil, tableta) y con voces/altavoces reales | No toca código; necesita dispositivos. |

### Prioridad 2 — jugabilidad y experiencia
| Mejora | Dependencias / riesgos |
|---|---|
| **2.1** Rendimiento móvil (P-02): perfilado real y optimización dirigida | Riesgo medio: tocar el dibujado puede cambiar el aspecto. Proteger capturas/contraste. |
| **2.2** HUD móvil compacto y sin solapamientos (P-04) | Proteger pruebas de móvil. Riesgo bajo. |
| **2.3** Sesiones de juego con jugadores reales por franja de edad (P-05) | Sin código. Puede revelar ajustes de `Sim.DIFFS`. |
| **2.4** Varias ranuras y exportar/importar partida (P-06) | Riesgo medio: formato `sv: 2`, `Sim.migrate`, `World.state/restore`. |
| **2.5** Rover conducible en el garaje y varios NPC en la cabina | Riesgo medio-alto: `Station`, colisiones y las 111 pruebas de pisos. |

### Prioridad 3 — visual y animaciones
| Mejora | Dependencias / riesgos |
|---|---|
| **3.1** Dar detalle a las losas lisas del puente y a los muebles genéricos | Riesgo bajo; atención a las colisiones (`solid`) de cada mueble. |
| **3.2** Consolas con identidad propia (no cuadrados con icono) | Mantener los puntos de interacción. |
| **3.3** Más partículas y efectos ambientales en interiores | Cuidar el rendimiento (P-02). |
| **3.4** Pulir transiciones entre menús y partida | Bajo. |

### Prioridad 4 — contenido y detalles
| Mejora | Dependencias / riesgos |
|---|---|
| **4.1** Rediseño compacto de las salas (pendiente histórico) | **Riesgo alto**: afecta `Layout`, puertas, rutas de NPC, mapa, colisiones, arte y casi todas las suites. Solo con plan y pruebas dedicadas. |
| **4.2** Soporte de mandos | Riesgo bajo; añadir y probar. |
| **4.3** PWA (service worker y manifiesto) | Riesgo bajo; el despliegue ya existe. |
| **4.4** Limpieza: documentación duplicada (P-07), código muerto (P-09), `_debug` (P-08) | Cuidar las pruebas que usan `_debug`. |
| **4.5** Seguridad de instalaciones y turnos de dormitorios | Nuevos sistemas; integrar con `Sim`. |

---

## 11. Plan de trabajo por fases

| Fase | Contenido | Resultado esperado | Criterio de salida |
|---|---|---|---|
| **0. Línea base** | Fijar versión; ejecutar las 9 suites; registrar tiempos | Punto de partida medible | Todas las pruebas en verde |
| **1. Robustez** | 1.1, 1.2 y limpieza menor (P-09) | El juego no se congela ante un error; sin texto en inglés suelto | Prueba de inyección de fallos y de diccionario |
| **2. Verificación real** | 1.3 y 2.3 | Datos de dispositivos y jugadores reales | Informe de campo |
| **3. Móvil y rendimiento** | 2.1, 2.2 | ≥ 50 fps en un móvil de gama media; HUD sin solapamientos | Medición en dispositivo |
| **4. Guardado y jugabilidad** | 2.4 y ajustes de dificultad según la fase 2 | Varias ranuras; dificultad validada | Pruebas de guardado/migración |
| **5. Pulido visual** | 3.1–3.4 | Interiores sin aspecto de prototipo | Capturas aprobadas |
| **6. Contenido** | 2.5, 4.2, 4.3, 4.5 | Más profundidad | Suites en verde |
| **7. Rediseño de salas** | 4.1 | Estación compacta | Plan y pruebas propias |

**Regla de trabajo:** cada fase se entrega en un PR independiente, con las suites completas en verde sobre el commit exacto, y sin tocar sistemas que no sean el objetivo de la fase.

---

## 12. Conclusiones y recomendaciones

1. **Conservar la base.** La arquitectura (motores puros + capa de interfaz), el guardado versionado y la batería de pruebas son valiosos. No hay motivo técnico para reconstruir nada.
2. **Primero la red de seguridad.** Proteger el bucle principal es el cambio más pequeño y de mayor valor: pasa de «un error congela todo» a «un error se registra y el juego continúa».
3. **Medir antes de optimizar.** Hay una señal clara (42 fps con CPU ×4) pero la causa exacta no está identificada; hay que perfilar en un dispositivo real.
4. **Salir del laboratorio.** Casi todo se verificó con Chromium sin GPU, voz simulada y táctil emulado. Una ronda de pruebas con dispositivos y jugadores reales puede cambiar prioridades.
5. **No prometer lo que no está.** El rediseño compacto de las salas sigue sin hacerse, y la doble altura del núcleo es real pero acotada. Conviene mantener esos límites visibles en la documentación.
6. **Presentación y docencia.** El valor educativo (fuentes, límites, guía docente, franjas de edad) es el punto más sólido del proyecto; los cambios visuales deben reforzarlo, no sustituirlo.

---

## Anexo A. Reproducibilidad

- Pruebas: `tests/*.js` (Playwright, Chromium sin conexión) y `node tests/run-selftest.js 100`.
- Las sondas de esta auditoría (fps, CPU, inyección de fallo, partidas pasivas) se ejecutaron sobre `index.html` sin modificarlo; los resultados completos están en las tablas de las secciones 7 y 8.
- Para actualizar este informe: editar `Space_Explorer_Auditoria_Tecnica.md` y regenerar el PDF con `NODE_PATH=$(npm root -g) node reports/build_pdf.js` (usa Chromium de Playwright, gratuito).
