# Space Explorer → Roblox: plan por fases y mapa de módulos

**Estado:** propuesta para aprobación. No se ha escrito código de Roblox.
**Base:** `main` en `51cfbc1`. Cifras de `wc -l` sobre `src/`; el informe de auditoría está en `reports/Space_Explorer_Auditoria_Tecnica.md`.

## 0. Antes de empezar

- **Solo se puede probar en Studio con el MCP `Roblox_Studio` conectado.** Ese MCP existe en tu PC, no en el entorno en la nube. Cada fase se ejecuta en tu sesión local de Claude Code, dentro de un clon de `socra375/Space-Explorer`.
- **Lo que el juego es hoy:** 2D cenital en un canvas, con un único `index.html` de 1,17 MB generado desde `src/`. Roblox usa Luau y motor 3D. Ningún archivo se traduce línea a línea: se porta la lógica y se rehace el arte.
- **Alcance elegido:** juego completo. Se hará por fases; cada una debe funcionar y verificarse en Studio antes de empezar la siguiente.

## 1. Qué se reutiliza tal cual

Estos módulos son lógica pura, sin DOM ni canvas. Se portan casi literalmente a Luau y se prueban con los mismos casos:

| Origen (`src/`) | Líneas | Destino Roblox | Notas |
|---|---|---|---|
| `03_sim.js` | 1052 | `ServerScriptService/Sim` (ModuleScript) | Motor de recursos, eventos, misiones, derrota. Es el núcleo y el mayor riesgo de error de traducción. |
| `03h_surv.js` | 42 | `ReplicatedStorage/Surv` | Frío, hambre, dosis, avisos. Pequeño y autocontenido. |
| `03g_station.js` | 120 | `ReplicatedStorage/Station` | Máquina de estados de elevadores y cabinas. Se reutiliza tal cual. |
| `03c_expo.js`, `03d_earthlink.js` | 343, 318 | `ReplicatedStorage/Expo`, `Earthlink` | Exploración y radio con retraso. Sin cambios de diseño. |
| `03e_landing.js`, `03f_trip.js` | 154, 50 | `ReplicatedStorage/Landing`, `Trip` | Cálculo de aterrizaje y viaje. |
| `02_data.js`, `02b_npc.js`, `02c_levels.js` | 508, 218, 169 | `ReplicatedStorage/Data` | Textos, NPC, niveles. Hay que pasar los textos a tablas de Luau. |

**Criterio de éxito de esta capa:** las pruebas de `tests/run-selftest.js` (100 partidas) deben dar el mismo resultado en Luau. Hoy pasan en Node; ese es el listón.

## 2. Qué se rehace

| Origen | Motivo | Destino |
|---|---|---|
| `04_world.js` (948), `04a_layout.js` (243) | Mundo 2D con colisiones por celda y cámara cenital | Mundo 3D: un modelo por piso, colisiones de Roblox, `Layout` solo como datos de posición |
| `04b_chars.js` (453), `04g_landart.js` (248), `04d_art.js` (252) | Arte dibujado por código en canvas | Modelos 3D o plantillas de Roblox Studio; los personajes pueden ser `Humanoid` con accesorios |
| `04f_rover.js` (144), `04e_field.js` (269) | Rover y terreno exterior en 2D | Vehículo con `VehicleSeat` o physics; terreno con `Terrain` |
| `04c_flora.js` (189) | Plantas en el invernadero | Modelos de planta con `ProximityPrompt` |
| `05_minigames.js` (309) | Minijuegos dibujados en canvas | Interfaces de `ScreenGui` con lógica en Luau |
| `06a`…`06o` (≈ 4 500 líneas de interfaz) | Un módulo `Game` con HTML y canvas | `StarterGui` con `ScreenGui`; el orden de capas deja de importar |
| `06j_earthlink.js`, `06h_audio.js` | Web Speech API y Web Audio | Sonidos de Roblox (`Sound`) y texto con `TextChatService` o diálogo propio. **La voz del navegador no existe en Roblox**: habrá que decidir si se usa texto, grabaciones o `TextToSpeech` si está disponible. |
| `06c_ui.js` → `fetch` de DONKI | Llamada HTTP desde el navegador | `HttpService` solo desde el servidor. Si no hay acceso HTTP, se quita o se usa caché fija. |
| `localStorage` (`Store`) | Guardado en el navegador | `DataStoreService` (solo servidor). Hay que decidir si el progreso es por jugador o por servidor. |

**Riesgo principal:** el HUD, los paneles y el mapa del juego actual ocupan una gran parte del código. Rehacerlos en `ScreenGui` es la parte con más trabajo visual.

## 3. Fases

Cada fase termina con una prueba en Studio que lo demuestra. No se avanza si la prueba no pasa.

### Fase 1 — Motor de simulación
- **Entregable:** `Sim`, `Surv`, `Station` en Luau, sin interfaz.
- **Prueba:** las 100 partidas de `run-selftest` en Luau dan el mismo resultado que en Node, con los mismos seeds.
- **Dependencias:** ninguna.
- **Riesgo:** alto. Diferencias de redondeo o de orden de tablas cambian resultados. Mitigación: comparar partida a partida, no solo el resumen.

### Fase 2 — Un piso jugable en 3D
- **Entregable:** el piso 1 (Operaciones) como modelo en Studio, con el jugador (`Humanoid`), colisiones y una consola que llama a `Sim`.
- **Prueba:** entrar, interactuar con una consola y ver cambiar un recurso en el HUD.
- **Dependencias:** fase 1.
- **Riesgo:** medio. Decidir la escala y la cámara.

### Fase 3 — HUD, paneles y supervivencia
- **Entregable:** barras de recursos, avisos, pantalla de derrota con reintento.
- **Prueba:** forzar una derrota por frío y comprobar la pantalla y el reintento.
- **Dependencias:** fase 2.

### Fase 4 — Pisos restantes y elevadores
- **Entregable:** pisos 2 y 3, nivel G y nivel 3A, elevador de tripulación con animación y plataforma del rover.
- **Prueba:** ir de un piso a otro en el elevador y ver el número de piso cambiar.
- **Dependencias:** fase 3.

### Fase 5 — Exterior, rover y viaje
- **Entregable:** terreno, rover conducible, viaje y aterrizaje.
- **Prueba:** salir a la superficie, conducir el rover y volver por la esclusa.
- **Dependencias:** fase 4.
- **Riesgo:** alto. Es el bloque más grande y el que más depende de la física.

### Fase 6 — Misiones, minijuegos, NPC y radio
- **Entregable:** misiones, seis minijuegos, NPC con diálogo y comunicación con la Tierra con retraso.
- **Prueba:** completar una misión de familiarización.
- **Dependencias:** fase 3.

### Fase 7 — Guardado, audio y pulido
- **Entregable:** `DataStoreService`, música y efectos, accesibilidad.
- **Prueba:** cerrar y reabrir en Studio y recuperar la partida.
- **Dependencias:** todas.

## 4. Decisiones que necesito de ti antes de la fase 1

1. **Progreso:** ¿guardar por jugador (`DataStoreService`) o por servidor?
2. **Voz:** el juego usa voz del navegador. ¿Lo sustituimos por texto, por grabaciones o no lo portamos?
3. **Escenario:** ¿Luna y Marte como dos mapas o un solo mapa con dos zonas?
4. **Público:** el juego original es para niños de 5 a 17+. ¿La versión Roblox es para la misma franja? Si se publica en Roblox, hay que revisar normas de contenido para menores.

## 5. Lo que no sé todavía

- [Suposición] Que el MCP de Studio permita crear los modelos del piso 1 sin trabajo manual extra. Lo confirmaremos al comienzo de la fase 2.
- [Suposición] Que la traducción de `03_sim.js` a Luau sea de unos días, no de semanas. Depende de cuántas diferencias de comportamiento aparezcan en la fase 1.
- No he medido el rendimiento en Roblox. El juego actual se mide en Chromium sin GPU; esa cifra no sirve como referencia.
