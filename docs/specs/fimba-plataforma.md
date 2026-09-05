# FIMBA — Plataforma de festival (dependiente de OFRN)

Spec viva del vertical (foundation + transporte + agenda unificada + hotelería).

## Producto

FIMBA es una aplicación de festival con skin propia bajo `/fimba/*`, que reutiliza la flota/logística de la gira OFRN enlazada y no clona el esquema de `integrantes`.

### Modelo de datos

| Tabla | Rol |
|-------|-----|
| `fimba_ediciones` | Edición del festival; **1:1** con `programas` vía `id_gira`. `token_consulta` = enlace consulta **general** de la edición (`/fimba/c/:token`). |
| `fimba_agenda_consultas` | Enlace de **agenda fija**: UUID propio + filtros congelados (propuestas/grupos/locación/origen). `/fimba/c/:token/agenda` sin query. Independiente del token de edición. |
| `fimba_propuestas` | UI «Artista»: cupos, colores, tokens, **estadía vía eventos** (`id_evento_checkin` / `id_evento_checkout` → `eventos`, tipos 22/23; espejo `checkin_at` / `checkout_at`), flags `checkin_early` / `checkout_late`, **`requiere_hotel`** / **`requiere_comidas`** (default true; false excluye de reportes/exportaciones), `id_hotel` opcional → `hoteles`, `observaciones_logisticas` (texto libre), **`rider`** (HTML rich-text logístico). Columna **`orden`**: se asigna al crear (legado / metadata); **no** ordena UI staff. **Display** de planillas y pickers = alfabético por `nombre` (`localeCompare` es, `sensitivity: "base"`, desempate `id`) vía `listFimbaPropuestas` / `sortFimbaPropuestasByNombre`. **Sin** carpeta Drive (vive en contrataciones) |
| `fimba_participantes` | Personas del artista (entidad propia; `id_integrante` opcional bigint). **`genero`**: `femenino` \| `masculino` \| `otro` \| `sin_especificar` (default). Alta/edición acepta aliases (`M`/`F`/`hombre`/`mujer`, etc.) vía `canonicalizeFimbaGenero`. Reportes hotelería mapean a Hombre/Mujer/Sin género — **sin** default a masculino. **Override de estadía** por persona: `id_evento_checkin` / `id_evento_checkout` (+ espejo `checkin_at` / `checkout_at`); `NULL` = hereda el artista. Early/Late siguen en la propuesta. |
| `fimba_usuarios` | Usuarios por edición: mail + `rol_fimba` (`editor_general` \| `consulta`) + `clave_acceso` / `token_login`. Staff OFRN management no requiere fila (full); fila `consulta` **sí** fuerza RO aunque sea management. |
| `eventos.audiencia_ofrn` | `none` \| `tutti` \| `grupos` |
| `eventos.asientos_equipaje` | Asientos de **equipaje** del evento/parada (no headcount de pasajeros). Legacy `# PAX` / `audiencia` se mantiene en sync. |
| `eventos.observaciones_equipaje` | Notas de equipaje del evento (antes `Obs:` en `descripcion`) |
| `eventos.observaciones_internas` | HTML rich-text **staff-only** (editores/técnicos OFRN; FIMBA `canEditPropuestaMeta`). Imágenes → bucket `eventos-internas` path `eventos/{id|draft}/…`. **No** en consulta FIMBA, tokens `/a` `/e` `/c`, ni exports públicos. UI: `FimbaRichTextEditor` en `FimbaEventoFormModal` + `EventForm` OFRN. |
| `eventos.observaciones_aforo` | Texto libre de **aforo del espectáculo** (por concierto `id_tipo_evento = 1`, no por locación). Distinto de `locaciones.capacidad` (número) y de `fimba_venue_info.observaciones` (metadata venue por edición). UI: columna inline en `FimbaVenuesPage` espectáculos + `FimbaEventoFormModal` (concierto) + `EventForm` OFRN. Consulta RO. |
| `eventos.backline_descripcion` | HTML rich-text planilla **Backline** (por concierto o ensayo incluido; Quill FIMBA: listas/links/etc.). Distinto de `eventos.descripcion` (Detalle agenda). |
| `eventos.backline_monto` | Monto ARS opcional del backline (planilla Backline). |
| `eventos.backline_estado` | Color de estado Backline: `verde` \| `celeste` \| `amarillo` \| `naranja` \| `NULL`. UI: un círculo (o «—» vacío) + popover de opciones; tinte de fila. |
| `eventos.planta_escenario_url` | URL externa de planta (p.ej. Google Drive). Complementa vínculo interno `stage_plot_eventos` → RiderMaker (`stage_plots`). |
| `eventos.planta_escenario_nombre` | Nombre legible del archivo/planta Drive (chip Backline). Se actualiza al guardar/cambiar URL (API Drive o manual); fallback heurístico si NULL. |
| `eventos.backline_incluido` | Boolean (`NOT NULL DEFAULT false`). **Planilla Backline:** conciertos (`id_tipo_evento = 1`) siempre se listan; ensayos (categoría Ensayos / `id_categoria = 2`) solo si `true`. Quitar ensayo de Backline → `false` (no borra el evento). Conciertos existentes se marcaron `true` al migrar (claridad; la UI no depende del flag para tipo 1). |
| `eventos.descripcion` | Campo OFRN compartido. En FIMBA: encode de **Detalle** (HTML rich-text via Quill `FimbaRichTextEditor` en modal + Agenda row-edit; preview sanitizado) + líneas `Destino:` / `Vuelo:`. |
| `eventos_fimba_propuestas` | Tags artista ↔ evento |
| `fimba_evento_transportes` | **Reserva técnica** anónima de un trayecto sobre una unidad (`giras_transportes`): staff/TBD/holgura. **No** es headcount de artistas (eso va en Sube) |
| `fimba_propuesta_rutas` | **Sube/Baja** FIMBA por **artista + cantidad** (+ equipaje por regla) en una unidad; análogo a `giras_logistica_rutas` sin id_integrante. **`es_chofer`** (bool, default false): **por subida/trayecto** (esta fila de boarding), **no** atributo permanente del artista/persona; ride a bordo con label Chofer; **no** suma plazas a `en_transito` / cupo / libres hasta la bajada |
| `giras_logistica_rutas.es_chofer` | Misma semántica OFRN: flag en la **regla de subida** (alcance Persona típico), no en `integrantes`. Misma persona puede ser chofer en un tramo y pasajero en otro |
| `fimba_contrataciones` | Planilla expedientes/contrataciones por edición: nº expediente, nombre (texto y/o `id_propuesta`), monto, tipo, flags firma/doc/ADM, `ultimo_estado_conocido` (denorm.), `orden`, **`carpeta_documentacion`** (URL/ID carpeta Google Drive del expediente). **Sin** `fecha_limite_resol` (dropped) |
| `fimba_contrataciones_estado_log` | Log append-only de cambios a «Último estado conocido»: `estado` text, `created_at`, `created_by_label`, `created_by_integrante_id` / `created_by_fimba_usuario_id` opcional |
| `fimba_propuestas_habitaciones` | Slots de habitación por artista: `tipo` SGL/DBL/TPL/QAD, `matrimonial` (false en SGL; default twin), `orden`, `label` opcional |
| `fimba_habitaciones_ocupantes` | Persona en habitación: `id_habitacion` + `id_participante` **único** + `orden`. Capacidad ≤ tipo; misma propuesta |

### Vehículos vs trayectos (mapa OFRN — regla dura)

No confundir catálogo, unidad de flota y trayecto. FIMBA **no** tiene `fimba_transportes`.

| Concepto UI | Tabla OFRN | Qué es |
|-------------|------------|--------|
| **Nombre del vehículo** (UI FIMBA) | `transportes.nombre` (+ patente) | Identidad que ve el usuario: “Charter 1”, “Furgón 1”, “Camión PFU469”. Catálogo reutilizable (color, icon, patente base). |
| **Vehículo / unidad de flota** | `giras_transportes` | Fila de flota de **esa** gira: `id_transporte` + `capacidad_maxima` + patente + `detalle` |
| **Nota / detalle OFRN** | `giras_transportes.detalle` | Texto libre OFRN (ruta, tramo, nota operativa). **No** es el nombre del vehículo. Suele ser largo (“Salida Charter Viedma…”). |
| **Parada OFRN** (tramo de gira) | `eventos` con `id_gira_transporte` | Horario de la unidad en la agenda OFRN (sube/baja) |
| **Trayecto FIMBA** | `eventos` (planilla FIMBA; p.ej. tipo traslado) | **Cada fila de la planilla** = un evento con ventana horaria A→B. Asigna uno o más vehículos y plazas. No es la unidad. |
| **Asignación reserva técnica FIMBA** | `fimba_evento_transportes` | `(id_evento trayecto, id_gira_transporte unidad, plazas)` — solo cupo anónimo |

```
transportes  1──*  giras_transportes  1──*  eventos (paradas OFRN, FK id_gira_transporte)
                         │
                         └──* fimba_evento_transportes *──1  eventos (trayectos FIMBA)
```

**Display de flota en FIMBA**

- `labelGiraTransporte(gt)` = `transportes.nombre` + patente si hay (fallback a `detalle` solo si falta catálogo).
- `detalleGiraTransporte(gt)` = `detalle` secundario si aporta algo distinto del nombre.
- Capacidad en listado de vehículos = **capacidad_maxima** + **pico en tránsito** (plazas a bordo al salir de cada parada, máx. de la secuencia) y libres en pico.
- **Planilla trayectos (UI):** scroll horizontal en `.fimba-planilla-scroll` (`overflow-x: auto`); tabla `width: max-content` (no se aplasta a 0). Columnas: Origen · Fecha · Com·Fin · Actividad · Locación · + · Destino · **Vuelo** · Vehículo · **Artistas** · **Subidas** · **Bajadas** · Tránsito/cap · acciones. Sticky izq.: Origen + Fecha + Com·Fin (**compactas**: checkbox ~1.75rem; Origen ~4.25rem + badge chico; Fecha ~4.5rem; Com·Fin ~5rem; `left` sticky recalculado). **Destino** (calculada): max ~7.5rem, texto truncado + `title` (CSS: `.fimba-planilla-destino` `overflow:hidden` + inner `display:flex; width:100%; min-width:0` + text `flex:1 1 0%` / `text-overflow:ellipsis` — estable al zoom del browser; no `inline-flex` shrink-to-fit); IconEdit / «+» intermedio siguen accesibles. **Acciones:** kebab ⋮ (`IconMoreVertical`, menú portal z-110) con Editar / Duplicar / Eliminar; en edición de fila siguen visibles **tilde** + **X** (fuera del kebab). **Vuelo** = línea `Vuelo:` de `eventos.descripcion` (`decodeFimbaTrasladoDescripcion` / `ev.vuelo`; paridad con Agenda). **Artistas** = tags `eventos_fimba_propuestas` (paridad chips con Agenda). Subidas/Bajadas = boarding por parada (`fimba_propuesta_rutas` + reglas OFRN). **Tránsito/cap** = a bordo al salir / capacidad; hover (portal z-110) lista grupos/artistas + Orquesta + Reserva del evento. Toolbar: **Programar transporte** + **Ver otros eventos** (ver bullets Trayectos). Columna **+**: alta inline de parada intermedia (no modal; spinner en el botón mientras crea). Shell FIMBA (`.fimba-main` / `.fimba-header-inner`): `width: 90%` + `max-width: 90vw` (sin tope fijo en px; en mobile ≤640px usa 100% + padding).
- **Modo edición (Transportes):** mismo toggle que Artistas (`Modo edición` / `Salir de modo edición`, `IconPencil`, magenta). Off = vista; on = celdas inline + semáforo por fila (`fimba-sync-*`, sin leyenda). **Consulta / token RO** (`readOnly`): sin toggle. **Fuera de modo edición:** doble clic **en cualquier parte de la fila** (excepto checkbox, boarding Sube/Baja, «+», acciones, Destino) entra a **edición de fila completa**: todas las celdas inline-editables (Fecha / Com·Fin / Detalle+obs / Locación / Vuelo) quedan editables a la vez; **no** autosave en blur/cambio. A la derecha: **tilde** (`IconCheck`) confirma y persiste (`patchFimbaEventoPlanilla`); **X** (`IconX`) o **Esc** descarta el borrador. El kebab **Editar** (antes lápiz suelto) abre `FimbaEventoFormModal` completo. **Locación** usa `LocationSelectWithCreate` (buscar + crear in situ → `id_locacion`), nunca un `<select>` plano. **En modo edición (planilla):** autosave al blur/Enter (texto) o al cambiar (fecha, locación, selects) como antes. Patch liviano `patchFimbaEventoPlanilla` (fecha, horas, actividad, vuelo, obs., **`id_locacion`**; `stripDestino: true` en transporte) — **no** reescribe flota/tags/grupos/`id_gira_transporte` ni `FimbaStopRulesManager`. Vehículo inline solo FIMBA puro con 0–1 unidad (`setFimbaEventoTransportes`, conserva plazas). **Destino** (columna calculada): no se edita como locación de la fila; doble clic / IconEdit abre flujo «crear siguiente parada» (`FimbaDestinoStopModal`). **«+»** crea la parada intermedia al instante (spinner en el botón; `clientValidated` salta hard-block de libres; inserta fila optimistic en estado local + limpia `hora_fin` del tramo previo; soft refresh eventos/rutas en background) y abre **edición de fila** con foco locación; tags/vehículo heredados de la fila. Mientras crea, los demás **+** quedan deshabilitados; error → banner `fimba-error`. Tránsito y Subidas/Bajadas = chips + modal. Flota: catálogo, nota OFRN, categoría y plazas inline con el mismo semáforo.

**Capacidad / en tránsito (criterio OFRN)** se calcula **por unidad** (`giras_transportes`), con paradas ordenadas por fecha+hora. **Regla dura:** un mismo `giras_transportes` = **una sola línea de ocupación** (OFRN + FIMBA juntos; no hay conteos separados por organización).

```
Secuencia unificada por id_gira_transporte:
  paradas = OFRN (id_gira_transporte) ∪ trayectos FIMBA tipo transporte con
            fimba_evento_transportes ∪ endpoints ↑/↓ explícitos (fimba_propuesta_rutas
            o giras_logistica_rutas). Orden: fecha + hora_inicio.
  Concierto/hotel/etc. con fila de flota pero sin tipo transporte ni ↑/↓ real
  → NO entran a la secuencia (no inventan hop subida/bajada).

OFRN: subida/bajada por persona vía giras_logistica_rutas → logistics.transports.subidaId/bajadaId
      asientos = 1 + (instrumentos.plaza_extra ? 1 : 0)   // = GirasTransportesManager / ofrnSeatWeight
      a bordo al salir de i (en_transito cap): upIdx ≤ i && (sin bajada | downIdx > i)
      presente en parada i (labels «en el lugar»): upIdx ≤ i && (sin bajada | downIdx ≥ i)  // isPresentAtStop
      es_chofer en la regla ganadora de subida → capacitySeats=0 (rideCapacitySeats); display sí cuenta
FIMBA (rutas explícitas): fimba_propuesta_rutas (id_propuesta, id_gira_transporte, plazas, es_chofer, id_evento_subida, id_evento_bajada)
      headcount por cantidad (no nomina de id_participante); default plazas = para_transporte
      ride abierto = subida sin bajada → ocupa bus + tope artista; bajada cierra el ride y libera plazas
      (no es un segundo consumo de planificada+equip.; hop-off + subida luego = nuevo ride)
      **Chofer = por subida/trayecto** (columna en la fila de ruta), no rol permanente de artista/integrante:
      es_chofer=true → plazas de display en chips/A bordo; capacitySeats=0 (rideCapacitySeats) en
      en_transito / board|alight cupo / sumRidesOccupyingWindow / libres (Programar transporte)
FIMBA (legacy sintético): solo eventos **tipo transporte** con
      `fimba_evento_transportes.plazas > 0`
      residual = plazas_evento − Σ plazas explícitas (Sube) que suben en ese evento/unidad
      Chip **«Reserva del evento»** solo si residual > 0 (nunca inventa nombre de artista desde tags)
      `plazas = 0` **no** inventa headcount desde tags (capacidad ≠ reserva técnica)
      sube en el trayecto; baja en la **siguiente parada de la secuencia unificada**
      (incluye paradas OFRN del mismo vehículo; no se saltean)
Δ (Impacto) = board_seats − alight_seats en esa parada (OFRN + FIMBA)
en_transito = Σ asientos OFRN a bordo (isOnBoardAfterStop) + Σ plazas FIMBA a bordo
libres (planilla) = max(0, capacidad_maxima − en_transito); overbook si en_transito > capacidad
en_lugar (histórico / helper `resolveStopArtistasLabels`; planilla Transportes usa Subidas/Bajadas):
  Orquesta n     = Σ ofrnSeatWeight present at stop (isPresentAtStop) sobre unidad(es) de la fila
  {nombre} n     = Σ plazas FIMBA presentes en parada por propuesta (explicit + residual synthetic)

Libres (modal / listVehiclesAvailability), misma flota compartida:
  ocupadas_ofrn  = Σ OFRN cuyo ride [subida,bajada) solapa la ventana (1+plaza_extra)
  ocupadas_fimba = Σ FIMBA (explícito+residual) cuyo ride solapa la ventana
                 (excluye subidas del evento en edición)
  libres = max(0, capacidad − ocupadas_ofrn − ocupadas_fimba)
```

No usa tipos_evento Arribo/Salida: la parada es el evento; el sentido sube/baja viene de las reglas (OFRN / `fimba_propuesta_rutas`) o del sintético FIMBA sobre la secuencia unificada.

Helper puro: `src/utils/fimbaTransportBoarding.js`. Carga OFRN: `loadFimbaTransportLogisticsSummary` (reusa `calculateLogisticsSummary` + passengers/admissionRules/regions/localities + **`routeRules`** = `giras_logistica_rutas`). Rutas FIMBA: `listFimbaPropuestaRutas` / `upsertFimbaPropuestaRutaStop` / `clearFimbaPropuestaRutaStop`. Auditoría extremos no-trayecto: `listOffTrayectoRideEndpoints` + `isOffTrayectoRideEndpoint`. Aserciones: `scripts/verify-fimba-boarding-delta.mjs`.

**UI subidas/bajadas (planilla Transportes):** columnas **Subidas** / **Bajadas** (paridad con `GirasTransportesManager` Suben/Bajan). Cada celda: conteo + chips (nombre + plazas) + `+`. Clic en celda / vacío → `FimbaStopRulesManager` (portal z-[100]). × en chip FIMBA → `clearFimbaPropuestaRutaStop` (confirm). **Chips OFRN** = una por regla de `giras_logistica_rutas` en ese extremo (`summarizeOfrnStopRules` / label = localidad|categoría|apellido|Todos + plazas con `ofrnSeatWeight`); clic → tab **Orquesta**. Fallback compacto «Orquesta n» solo si hay asientos boarding sin reglas listables. Chip **«Reserva del evento»** → tab Artistas. RO/token: chips visibles, sin add/remove. Helper: `resolveStopBoardAlightChips` (recibe `ofrnRouteRules` + passengers/localities/regions). **Truncación de label:** `formatBoardChipLabel` — si el nombre supera `BOARD_CHIP_NAME_MAX_CHARS` (18), muestra `{nombre}… {n}` para que la cantidad no se pierda; nombre completo en `title`/tooltip. CSS de `.fimba-planilla-board-chip-label`: `overflow:hidden` + `text-overflow:ellipsis` + `min-width:0` / `flex:1 1 0%` como red de seguridad si la celda/chip se estrecha al zoom; **no poner backticks en comentarios de `FIMBA_CSS`** (es template literal: rompe Vite/Vercel). Tras mutar Orquesta → soft refresh `logistics` (recalcula chips + tránsito sin full reload).
- pestaña **Artistas FIMBA**: lista de **reglas activas** (`fimba_propuesta_rutas`: grupo/artista + cantidad + **asientos/obs. equipaje** + badge **Chofer** si `es_chofer` **de esa subida**). Cantidad, equipaje y **toggle Es chofer (en esta subida)** editables inline → `upsertFimbaPropuestaRutaStop`. Alta: elegir grupo/artista + cantidad + equipaje + checkbox **Es chofer** (solo subidas; **por trayecto**, no consume cupo). Fila **Reserva del evento** = plazas técnicas `fimba_evento_transportes` (editable en subida vía `upsertFimbaEventoTransportePlazas`); residual = reserva − Σ reglas de artista en esa parada. En bajada, el residual técnico que aligera se muestra (lectura). **Borrar regla:** la card usa `.fimba-row-deleting` (opacity + pulse) y deshabilita × hasta `clearFimbaPropuestaRutaStop` termina. Botón **Bajar todo** (solo bajadas): cierra todos los rides FIMBA **abiertos** a bordo en ese vehículo/parada (`alightAllFimbaAboardAtStop`); reserva residual sintética ya baja en hop. Orquesta OFRN se baja aparte (pestaña Orquesta → **Bajar todo** / `alightAllOfrnAboardAtStop`).
  - **Subida:** dropdown = artistas con tope restante **en esta parada** (`disp. remaining/tope` = planificada + extra equip. − plazas ya a bordo *aquí*, `isFimbaRideAboardAtStop`). Un ride abierto de un tramo **posterior** (p.ej. 18/09) **no** bloquea subir el 15/09. `upsertFimbaPropuestaRutaStop` solo conflicto si ya están a bordo en *esta* parada. Reserva técnica (`plazas=0`) **no** aparece como regla activa ni consume asientos. Chofer: skip assert de cupo vehículo.
  - **Bajada — A bordo (arriba):** `listFimbaAboardAtStop` (misma lógica que opciones de bajada). Lista nombre + plazas + badge Chofer; botón **Bajar** si `canAlightHere` (ride abierto **o** bajada posterior aún no alcanzada — badge «baja más adelante») → `upsertFimbaPropuestaRutaStop` type=down (cierra o adelanta). Formulario manual y **Bajar todo** (también adelanta cerrados presentes). Dropdown = quienes **ya están a bordo** de *este* vehículo. Tras bajar, `isOnBoardAfterStop` deja de contarlos y el tope del artista se libera. Quien nunca subió a esta unidad va al final, deshabilitado. Multi-vehículo: cada unidad tiene su propio ride; hop-off + subida posterior = nuevo ride.
- pestaña **Orquesta OFRN**: embebe `StopRulesManager` **inline** (`embedded`) en la misma modal (sin segundo full-screen; evita stack z-[70] detrás del backdrop FIMBA). Props: `event`, `type`, `transportId` (vehículo), `giraId`, `passengers`/`admissionRules`/`regions`/`localities` OFRN, `giraGrupos` (`giras_grupos` + integrantes), `sortedEvents` (secuencia del vehículo), `supabase`. Tabla: `giras_logistica_rutas` (IDs integrantes numéricos; **`es_chofer` por regla de subida/trayecto**, no en `integrantes`). Modal standalone OFRN usa `z-[100]`; confirms embebidos `z-[110]`. Jerarquía de match = misma que Giras (no reimplementada).
  - **Alcances de regla:** General · Región · Localidad · Categoría · **Grupo** · Persona. **Grupo** = `giras_grupos` de la gira (`target_ids = [id_grupo]` text; fuerza 4, paridad Categoría). Match = miembros de `giras_grupos_integrantes` (roster enriquecido con `grupo_ids`; ausentes excluidos). Al crear, auto-incluye miembros en `giras_logistica_admision` Persona del vehículo (paridad Persona). UI: mismo formulario «Agregar Nueva Regla» → ALCANCE **Grupo** → picker multi de grupos. Chips planilla muestran el nombre del grupo.
  - **Chofer UX (Gestionar Subidas):** solo alcance **Persona** + tipo subida. (1) En **Agregar Nueva Regla**, checkbox **Es chofer — en esta subida/trayecto** junto a **+ Asignar Parada**. (2) En **Reglas Activas** (fila Individual, p.ej. Figueroa): badge **Chofer** + checkbox **Es chofer en esta subida** para marcar sin re-agregar. Capacidad: `calculateLogisticsSummary` propaga `transports.es_chofer` desde la regla ganadora de subida → `extractOfrnRidesForVehicle` pone `capacitySeats=0` vía `rideCapacitySeats`.
  - **Fix bajada:** al asignar bajada/subida, si ya existe ride abierto (mismo alcance/objetivo con ese extremo vacío) → **UPDATE** de la fila (no insert huérfano). `calculateLogisticsSummary` usa `id_evento_subida`/`id_evento_bajada` como fuente de verdad (fallback si el embed PostgREST falta). `matchesRule`/`getMatchStrength` reconocen **Categoria** y **Grupo** vía `target_ids` (SOLISTAS… / id `giras_grupos`).
  - **Bajadas — a bordo:** lista `listOfrnPeopleAboardAtStop` (presentes en parada vía `isPresentAtStop`; conteo = Σ `ofrnSeatWeight`; badge Chofer si el ride abierto lo tiene). Botón **Bajar** por persona y **Bajar todo** → `alightOfrnPeopleAtStop` / `alightAllOfrnAboardAtStop` (reglas **Persona** fuerza 5 que cierran rides abiertos). Soft refresh `onRefresh('ofrn')` → slice logistics.
- **Feedback borrar fila trayecto:** `FimbaTransportPage` marca `deletingEventId` → `tr.fimba-row-deleting` + trash disabled/spinner hasta `deleteFimbaTraslado` termina (finally limpia). CSS en `FimbaLayout` (`.fimba-row-deleting` / `@keyframes fimba-row-deleting-pulse`).
- **Tránsito/cap hover:** tooltip portal `z-[110]` (`.fimba-transito-tooltip`) con desglose a bordo al salir (`resolveAboardAfterStopBreakdown` / `stop.a_bordo`): artistas FIMBA, **Orquesta** (con apellidos si ≤4 a bordo), Reserva del evento — formato `Nombre — n`.

En UI FIMBA (`/transportes`):

1. **Vehículos** — listado de `giras_transportes` de `fimba_ediciones.id_gira` + alta/edición embebida (`addFimbaVehiculo` / `updateFimbaVehiculo`, mismo path que OFRN: catálogo, detalle, plazas, categoría). Columnas: **Vehículo**, **Nota OFRN**, categoría, **Capacidad**, **Pico en tránsito**, **Libres (pico)** + lápiz editar (el lápiz se oculta en **Modo edición**; ahí las celdas son inline).
2. **Trayectos** — planilla cronológica; columnas de boarding por unidad (filtrar un vehículo para la secuencia completa). **Modo edición** (staff, no RO): fecha / com·fin / actividad+obs / **Locación** (`LocationSelectWithCreate` → `id_locacion`) / **Vuelo** inline / vehículo FIMBA 0–1; semáforo sticky a la izquierda. Fuera de modo edición: doble clic en la **fila** → edición completa + tilde confirma / X·Esc cancela; lápiz = modal completo.

- **No** master `fimba_transportes`.
- Alta también posible en OFRN: gira → Logística → Transporte.
- Sin vehículos: trayectos solo **SIN SERVICIO** (cero filas en `fimba_evento_transportes`).
- **Modal asignación** (`FimbaEventoFormModal`, create y edit): tabla de **toda la flota** con columnas **Cap. / OFRN / FIMBA / Libres / Reserva técnica**. **Modelo:** Sube nombrado (`fimba_propuesta_rutas`) = headcount artistas; `fimba_evento_transportes.plazas` = solo reserva técnica anónima (staff/TBD/holgura). **No** auto-rellena reserva con tope de artistas al marcar vehículo. Orden flota por mejor ajuste a tope artistas (referencia UI; headcount vía Sube). Avisos ámbar: (1) tags + vehículo sin Sube; (2) tags + reserva>0 sin Sube («saldrá como Reserva del evento»). Sin botón «Repartir» tope→plazas. Hard-block al guardar: reserva > asientos; reserva > **libres** (ya no vs tope artista). En eventos de **transporte**: sección **Artistas · Sube / Baja** (`FimbaEventoArtistasBoardingTable`). Multi-vehículo: selector de unidad. Create / sin vehículo: tags encolables; Sube/Baja deshabilitados hasta guardar. **Bajar todo** en cabecera. **Sección Orquesta OFRN** debajo. Planilla: `FimbaStopRulesManager` (chips Subidas/Bajadas + Orquesta). Chip **«Reserva del evento»** solo residual > 0. **Libres de ventana** (`listVehiclesAvailability`): `capacidad − ocupadas_ofrn − ocupadas_fimba` (Sube explícito + residual sintético).
  - **Cierre del modal:** Enter en inputs (Sube/Baja, equipaje, etc.) **no** dispara Guardar ni cierra vía `onSaved` (sí Enter en Detalle contentEditable / textarea / botón). Saves inline de reglas (`onBoardingRefresh`) refrescan planilla **sin** cerrar el modal ni pisar el borrador (debounce ~400–450 ms; solo slice `rutas`). Cerrar (backdrop / X / Escape / Cancelar) con borrador dirty → confirm «¿Descartar cambios?»; limpio → cierra. Dirty = campos del evento (tipo, fechas, **locación** (`id_locacion`), **Detalle**/actividad HTML, vehículos/plazas, equipaje tocado, tags, audiencia/grupos); reglas Sube/Baja ya persistidas en DB **no** marcan dirty del formulario. Inline Sube/Baja: estado local del modal (seed desde `propuestaRoutes`); no re-list tras cada blur.
- **Detalle (modal + Agenda row-edit):** Quill `FimbaRichTextEditor` (toolbar compact: B/I/U, listas, link). Obligatorio (texto visible). Persistido como parte libre del encode FIMBA junto a `Destino:` / `Vuelo:`. Preview: `FimbaEventDetallePreview` con `sanitizeFimbaRiderHtml` + **clamp** (~3–4 líneas, `title` = texto completo). Columna `.fimba-detalle-cell` (~14–22 rem). Planilla Transportes: preview clamp; Modo edición sigue texto plano / markup → modal.
- **Observaciones internas (modal):** solo si `canEditPropuestaMeta` (OFRN management / `editor_general`). Oculto por completo a consulta y tokens. Quill (`FimbaRichTextEditor`) + imágenes (pegar / toolbar / drop) → `eventos-internas`. Persiste con Guardar junto al resto del evento (`saveFimbaEvento`). Mismo campo en OFRN `EventForm` (`canEditEventObservacionesInternas`).
- **Duplicar evento:** `duplicateFimbaEvento` + botón `IconCopy` (Agenda, Transportes, agenda artista editable). Copia shell: tipo, fecha/horas, detalle (`actividad` + « - Copia»), destino/vuelo, `id_locacion`, equipaje, **observaciones_internas**, tags artistas, flota/plazas, audiencia OFRN/grupos. **No** copia `fimba_propuesta_rutas` ni reglas OFRN de boarding. Tras OK: upsert de la fila nueva (`getFimbaAgendaEvento`) + abre modal editar la copia. Oculto en `readOnly` / ride segments.
- Locación (parada actual): `locaciones.nombre` (+ ciudad) vía `eventos.id_locacion`. Editable en **`FimbaEventoFormModal`** y en planilla Transportes (doble clic / modo edición) con `LocationSelectWithCreate` (label **Locación (parada actual)** en transporte; **Locación** en no-transporte). Persiste con Guardar (`saveFimbaEvento.id_locacion`) o `patchFimbaEventoPlanilla` (null limpia). **No** usar texto `Destino:` en `descripcion` para transporte. Filtros Agenda/Backline (multi-select de locaciones existentes) **no** crean locaciones — ahí `MultiSelectDropdown` está bien.
- **Destino (planilla Transportes + modal transporte)**: **calculado**, no persistido en el evento actual. Fuente = siguiente parada **asignada a este vehículo** (`fimba_evento_transportes` / `eventos.id_gira_transporte`), no un endpoint de ride que vive en otra unidad. Helper: `nextAssignedStopInVehicleSequence`. Label: `formatNextStopDestino(next)` → locación del next; sin locación → **`(Sin locación)`**; sin next asignado → **`Sin siguiente parada`**. La secuencia de boarding (quién sube/baja) sigue incluyendo endpoints para el Δ.
- **Pausas de vehículo**: si dos eventos consecutivos **del mismo vehículo** repiten la misma `id_locacion` (o la misma locación normalizada cuando falta id), el tramo intermedio se interpreta como **pausa**. Implementado en `isVehiclePauseBetweenStops` (`fimbaTransportBoarding.js`); se expone como `pause_after` en `boardingMetricsForEventRow` cuando `options.enablePause !== false`. En esa fila **no** se calcula `hasta` ni `locación hasta`/Destino (`next_event` queda `null` → `hora_fin_display.value = null` → muestra `—`; `destino_siguiente = TRANSPORT_DESTINO_SIN_SIGUIENTE`). Antes de la fila de la segunda parada se inserta una **fila divisora** (`fimba-pause-divider-row`) con `IconPause` + etiqueta **"Pausa · vehículo libre"** (fondo cian tenue, borde punteado). **Regla de producto (2026-09-04):** en planilla Transportes, pausas (cálculo blank Destino/Hora fin, divisor, badge «Pausa», «+» / «Crear recorrido intermedio») **solo** con **exactamente un** vehículo en el filtro (`selectedVehiculoIds.length === 1` → `showVehiclePauses`). **Todos** / filtro vacío / multi-select → `enablePause: false` (secuencia mezclada; pausa same-vehicle no tiene sentido). Con un vehículo filtrado, la detección sigue usando `primaryVehicleId` + `previousAssignedStopInVehicleSequence` / `nextAssignedStopInVehicleSequence` (cubre OFRN↔FIMBA). Modal evento / Programar transporte no usan este gate de filtro. **Fix 2026-09-03:** el divisor previo (`pauseBeforeRow`) ya no toma el evento anterior crudo con `sorted[idx - 1]`; ahora busca la **parada asignada anterior** con `previousAssignedStopInVehicleSequence`, simétrica a `nextAssignedStopInVehicleSequence`. Así, endpoints intermedios de rides u otras filas no asignadas a esa unidad no “rompen” el divisor, y la pausa se renderiza entre las dos filas visibles correctas (ej. OFRN `13/09 16:00` → FIMBA `16/09` en Bariloche).
- **Separador de día (planilla Transportes + Agenda):** cuando `fecha` (yyyy-MM-dd) cambia entre filas consecutivas de `eventosFiltrados`, se inserta una fila divisora **`fimba-day-divider-row`** **antes** de la primera fila del nuevo día (nunca antes de la primera fila de la tabla). CSS en `FimbaLayout`: franja **ámbar** (borde sólido + fondo tenue) con etiqueta centrada **`formatFechaLargaEs`** (`es-AR`: «Domingo, 20 de septiembre de 2026»), color `#92400e` — distinta del divisor de pausa (cian punteado + «Pausa · vehículo libre»). Orden de filas auxiliares: día → pausa (si aplica) → evento. Respeta filtro de vehículo y mezcla OFRN+FIMBA (usa solo la lista visible).
  - **Acciones en el divisor de pausa** (ocultas en `readOnly`): dos `IconPlus` en los **vértices** izquierdos del divisor (CSS absoluto `.fimba-pause-divider-add--top/bottom` en `FimbaLayout`: anclados a la esquina borde punteado × borde izquierdo con solo `translateY(±50%)` y `left: 11px` — sin `translateX(-50%)`, porque `.fimba-planilla-scroll` (`overflow-x: auto`) clippea lo que sale a la izquierda; `z-index` 7/8 sobre filas OFRN/sticky; tooltip **"Crear parada después de esta"** en ambos) + enlace central **"Crear recorrido intermedio"** junto a «Pausa · vehículo libre».
    - **«+» superior:** `createDestinoStopEvent` con `hora_inicio` = 1 h **después** del último evento antes de la pausa (`offsetEventDateTime(..., +60)`; puede rolar de día). Mismo vehículo; hereda tags artista/grupo de la fila ancla (`prevEv`) vía `inheritStopTagsFromEvent` (fallback: filtro artista global); spinner; tras OK insert optimistic + highlight + edición de fila (locación).
    - **«+» inferior:** igual con `hora_inicio` = 1 h **antes** del siguiente evento (`offsetEventDateTime(..., -60)`); ancla tags = `nextEv` (fallback `prevEv` / filtro artista).
    - **Crear recorrido intermedio:** abre `FimbaRecorridoIntermedioModal` (portal `document.body`, z-100). Formulario de **6 columnas** × 3 filas: **Detalle** · Locación · Fecha · Hora · **Subida** · **Bajada**. Defaults de detalle: `Salida` / `Llegada` / `Retorno` (editables → `actividad`/`descripcion` vía `createDestinoStopEvent`). Locación actual locked en filas 1 y 3; waypoint editable en fila 2. Fechas editables (default = día del prev). **Subida/Bajada** compactas (select artista FIMBA o grupo OFRN + plazas; mismo patrón que Programar transporte) con **colores de planilla**: headers `.fimba-planilla-board-th-up` (verde) / `.fimba-planilla-board-th-down` (rosa) y celdas `.fimba-planilla-board-cell` + tono ↑/↓ de `PlanillaBoardCell` (borde/fondo verde o magenta al asignar; placeholder «Asignar subida» / «Asignar bajada»). Semántica sugerida ida-vuelta (flexible por fila): **ida** ↑ Salida · ↓ Llegada; **vuelta** ↑ Llegada · ↓ Retorno. Artista → `fimba_propuesta_rutas`; grupo OFRN → regla `giras_logistica_rutas` alcance **Grupo** (↑ y ↓; miembros del roster; `upsertOfrnGrupoRutaStop`). **Tags** compartidos (3 paradas): picker draft `FimbaEventArtistasTagsPicker` (`draftMode` + `onApply`); seed desde `inheritStopTagsFromEvent(prevEv)`. Al confirmar: `createRecorridoIntermedioStops` con `detalle*` / tags / `boardingSalida|Waypoint|Retorno` → crea + aplica boarding en orden cronológico. Spinner; highlight de las tres filas.
- **UI modal evento transporte (`FimbaEventoFormModal`)**: layout **Hora com | Hora fin** → **Locación (parada actual)** (`LocationSelectWithCreate`, `id_locacion` del evento en edición) → **caja gris legacy** «Destino / locación (legacy — migración)» (solo si hay texto `Destino:` en `descripcion` al abrir o en el borrador; transporte = lectura + tachito; no-transporte = editable mientras exista legacy; eventos nuevos o tras limpiar/guardar sin línea `Destino:` **no** muestran la caja) con **`IconTrash`** en la fila del título (derecha) para quitar el texto legacy del borrador (`destino` → `""`; oculta la caja; al guardar `saveFimbaEvento` ya no reescribe la línea `Destino:`) → **Siguiente evento calculado** → Detalle → Vuelo. El bloque legacy **Destino (siguiente parada)** bajo Hora Fin + botón **«Elegir destino…»** se **retiró** del modal (redundante con la sección siguiente). Flujo primario «a dónde vamos» = resumen calculado + **Crear evento rápido** (Hora + locación). Texto legacy `Destino:` en `descripcion` se decodifica con `decodeFimbaTrasladoDescripcion` al abrir el modal. Columna Destino en planilla Transportes conserva acción IconEdit → `FimbaDestinoStopModal`. **Doble clic** en cualquier celda de fila (Agenda / Transportes / agenda artista editable) abre el mismo modal de edición que el lápiz; no dispara sobre botones/inputs (`stopPropagation` / `closest`).
- **Siguiente evento calculado (modal transporte)**: sección **entre** Locación y **Detalle** (solo `usa_transporte`). Header **Siguiente evento calculado**; resumen read-only del next stop (`boardingMetricsForEventRow.next_event`: locación, hora com, actividad) o **Sin siguiente parada**. Subcopy **¿No es aquí donde quieres ir?** + formulario inline **Crear evento rápido** (Hora + `LocationSelectWithCreate` + **Guardar evento**) cuando evento guardado con vehículo y no `readOnly`; deshabilitado con hint si falta guardar/vehículo. Tras OK: mensaje de éxito + **Ir a evento para ver sus detalles** (`onOpenEventoEdit` → Transportes reabre modal edit del id creado). Misma persistencia que planilla Destino vía helper compartido `createDestinoStopEvent` (`src/utils/fimbaDestinoStopCreate.js`). Consulta/`readOnly`: resumen visible, sin alta inline.
- **Libres de ventana en pausa**: en el modal **Programar transporte**, `rankVehiclesForProgrammedTrip` detecta si el hueco origen→siguiente es una pausa (`isPauseGap = isVehiclePauseBetweenStops(origen, siguiente)`). Si es pausa: `libresEstimados = capacidad_maxima` (100% libre, sin descontar `enTransitoOrigen`), `isPauseGap: true` en el resultado del ranking, y el score sube a **1100** («Pausa: vehículo libre en esta locación»), por encima del hueco normal (1000). Esto evita subestimar disponibilidad por pasajeros del tramo anterior.
- **Persistencia:** `saveFimbaEvento` con `usa_transporte` **no** escribe línea `Destino:` en `eventos.descripcion`. `patchFimbaEventoPlanilla` en Transportes pasa `stripDestino: true` (limpia legacy). La locación de la **nueva** parada va en `id_locacion` del evento creado.
- **Elegir / cambiar destino creando evento** (IconEdit en columna Destino; botón bajo Hora Fin en modal; **Crear evento rápido** inline en modal): abre `FimbaDestinoStopModal` (portal z-100) **o** formulario inline en `FimbaEventoFormModal`. Lógica compartida: `buildDestinoStopSchedule` + `createDestinoStopEvent` (`src/utils/fimbaDestinoStopCreate.js`). Campos modal: **Destino (lugar de salida)** (`LocationSelectWithCreate` → `id_locacion`, obligatorio), **Hora inicio (desde Hora Fin)**, **Detalle**. Inline: Hora + Locación (+ **Guardar evento**). Al Guardar **siempre crea** fila nueva en la secuencia del mismo vehículo (nunca edita el next existente):
  - **`hora_inicio`** de la parada creada = hora del form, o hora com del next **asignado** (`resolveHoraFinDisplay`), o midpoint/+30m. No se usa `hora_fin` persistida del actual.
  - **`id_locacion`** de la parada creada = lugar elegido (lugar de salida / locación de esa parada).
  - Con next real asignado → inserta intermedia. Sin next → crea la cola del vehículo.
  - Tras crear: **no** se escribe `hora_fin` en la parada actual (se limpia si había huérfana). El tramo termina en la hora com de la parada nueva. La parada nueva puede copiar `hora_fin` = `hora_inicio` del next que queda después (gap-fill).
  - Plazas 0, sin texto destino en descripcion. Tags: hereda propuestas/grupos/Tutti de la fila fuente (`inheritStopTagsFromEvent`); si no hay propuestas en la fila y hay filtro artista, usa ese. Requiere evento actual ya persistido (`id`).
- **Modo edición planilla:** columna **Locación** = `LocationSelectWithCreate` (patch `id_locacion`); columna **Vuelo** = inline editable (`patchFimbaEventoPlanilla`); columna Destino = solo lectura calculada + acción (doble clic / IconEdit → crear siguiente parada; oculta en consulta/`readOnly`). No hay input inline de destino sobre la fila actual.
- **Columna «+» entre Locación y Destino**: botón *Insertar evento intermedio* (solo si la fila tiene vehículo primary; oculto/`disabled` en `readOnly`). Abre `FimbaEventoFormModal` en **create** prefíillado: mismo `id_gira` (vía edición), mismo `id_gira_transporte` → `fimba_evento_transportes` (plazas 0), `audiencia_ofrn = none`, tipo por `eventTypeIdForCategoria` del bus (11/12/35), actividad «Parada intermedia», locación vacía. **Fecha/horas** vía `defaultGapFillEventSchedule` (completar hueco **hasta→desde**):
  - `hora_inicio` = fin del tramo = `hora_inicio` del next asignado (`resolveHoraFinDisplay`).
  - Con next asignado: `hora_fin` del draft = `hora_inicio` de ese next.
  - Sin next: `hora_fin` null; si tampoco hay fin usable → `hora_inicio` = actual **+ 30 min** (puede rolar día; reusa lógica de `defaultIntermediateStopSchedule`).
  - Fecha = día del evento actual (salvo rollover +30m).
- **Hora fin (planilla Transportes)**: **no** se toma de `eventos.hora_fin` guardada. Display = `hora_inicio` del siguiente evento **asignado a este vehículo** (`hora_fin_display.isCalculated` / `source: next_event`); cian itálico. Sin next con hora → **—** (`source: missing`); no se muestra un fin huérfano como si viniera de la agenda. Helper: `resolveHoraFinDisplay` + `nextAssignedStopInVehicleSequence`. El input de fin en planilla/modal transporte es solo lectura. `saveFimbaEvento` con `usa_transporte` persiste `hora_fin` null. **Elegir destino** usa esa hora (o fallback) como `hora_inicio` de la parada nueva y **limpia** `hora_fin` del actual. El botón «+» gap-fill no escribe `hora_fin` en vecinos.
- **`saveFimbaEvento`**: acepta `id_locacion` (null limpia; ausente en payload no toca en edit).

### Capacidad (artistas)

```
tope_personas = cantidad_planificada
para_hotel_comida = tope_personas
para_transporte = tope_personas + plazas_extra_materiales
```

`plazas_extra_materiales` **solo** afecta transporte (no hotel ni comidas). UI label: **Extra Equip.** (columna/campo; error/help: “extra equip.”). Columna DB sin renombrar.

Hotelería: **PAX planificada** = `cantidad_planificada`; nominados = participantes activos; **por confirmar** = max(0, PAX − nominados). Noches de cabecera = check-out − check-in del **artista** (rango del grupo). **Pax-noche / camas-noche** = suma de estadías individuales (`resolveParticipanteStay`: override de participante o rango del artista; cupos sin nombre usan el rango del grupo).

**Check-in / check-out = eventos (paridad OFRN):** igual que `giras_logistica_reglas.id_evento_checkin|checkout`, FIMBA usa FKs a `eventos` con `tipos_evento` **22 = Check-in** / **23 = Check-Out**. Horas canónicas FIMBA: **14:00** (in) / **10:00** (out); `audiencia_ofrn = none` (no se reutilizan los Check-in/Out OFRN a las 12:00 de logística). Un evento por `(gira, fecha, tipo, hora)` compartido entre artistas/personas del mismo día cuando se usa `ensureFimbaStayEvent` (path **legacy** de fechas) **si comparten hotel**; si el hotel difiere, `syncFimbaStayEventsLocacionFromHotel` bifurca a `(fecha, tipo, hora, id_locacion)`. `checkin_at` / `checkout_at` quedan como **espejo** de `eventos.fecha`. Flags **Early** (`checkin_early`) y **Late** (`checkout_late`) por artista: booleanes `default false` junto a la estadía (hora/comida del día de llegada/salida del **grupo**, no del override individual).

**Locación de estadía = hotel del artista:** `fimba_propuestas.id_hotel` → `hoteles.id_locacion` es la fuente de verdad para `eventos.id_locacion` de check-in/out (propuesta + overrides de su nómina).
- UI `FimbaStayEventCell` **no** pide locación libre al crear; caption «Locación = hotel del artista».
- `createFimbaStayEvent` (con `id_propuesta`) y `createFimbaPropuesta` / `updateFimbaPropuesta` (cambio de hotel o de FKs de estadía) llaman `syncFimbaStayEventsLocacionFromHotel`.
- Si el evento está compartido con otro artista de **otro** hotel → bifurca (find-or-create por locación) y reasigna FKs de esa propuesta/participantes; strip de línea legacy `Destino:` al setear `id_locacion`.
- Backfill edición 1 / gira 12: `supabase/scripts/fimba_sync_stay_event_locacion_from_hotel_edicion1.sql`.

**Estadía del artista (grupo) + override por integrante:**
1. **Artista (`fimba_propuestas`)** — UX primaria en Datos generales (`FimbaArtistaMetaSection`): mismo picker `FimbaStayEventCell` con `variant="group"`:
   - **Vincular evento** / **Crear nuevo** → setea `id_evento_checkin|checkout` + espejo de fecha (`updateFimbaPropuesta` vía `stayPatchFromEventId`) + sync locación ← hotel.
   - Chip Agenda (fecha · hora · detalle/locación); **Desvincular** limpia FK + espejo.
   - Early/Late checkboxes se mantienen (comida del día de llegada/salida del grupo).
   - Inputs de fecha sola quedan en caja gris **legacy** (migración): al guardar llaman `ensureFimbaStayEvent` (evento canónico 14:00/10:00). Preferir el picker.
2. **Integrante (`fimba_participantes`)** — planilla ficha / token `/e`: hereda el grupo o vincula evento propio (`variant="override"`):
   - **Vincular evento** / **Crear nuevo** → FK del participante + espejo; sync locación ← hotel del artista.
   - **Usar grupo**: limpia FKs/espejo (hereda).
3. Si el integrante asocia el **mismo** evento del grupo → se normaliza a heredar (FK null). Tag en `eventos_fimba_propuestas` es opcional; la FK es la fuente de verdad.
4. UI: chip «Agenda»; caption «Grupo · …» en override; badges **Llegada anticipada** / **Check-in propio** / **Salida posterior**. Hotelería, nómina expandida y token consulta muestran etiqueta completa (`formatStayEventLabel`). **Planilla Artistas** (RO): etiqueta compacta fecha·hora (`formatStayEventLabelCompact`); detalle completo en `title`.
5. Agenda (`listFimbaAgenda`): incluye eventos referenciados por FKs de propuesta/participante (además de tags/flota); al filtrar artista aparecen los check-in/out propios de su nómina.
6. APIs: `listFimbaStayEvents`, `createFimbaStayEvent`, `syncFimbaStayEventsLocacionFromHotel`, `updateFimbaPropuesta({ id_evento_* | id_hotel })`, `updateFimbaParticipante({ id_evento_* })`; componente `FimbaStayEventCell` (`variant` group|override).

**Planilla Artistas (UI scroll):** contenedor `.fimba-artistas-scroll` (`overflow-x: auto`; card `.fimba-artistas-card` sin clip). Tabla `width: max-content; min-width: 100%` (paridad agenda/trayectos). Columna **Artista** acotada (`max-width` ~16rem / 256px): `overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap` en nombre (vista) e input (planilla); nombre completo en `title` al hover. Scroll horizontal queda como red de seguridad para HOT./COM./OBS./Check-out. Columna Obs. con wrap (`white-space: normal`).

**Cubiertos / comidas por estadía** (`src/utils/fimbaMealsStay.js`): a partir de check-in/out **por persona** (o del artista si la celda está vacía) + Early/Late + PAX planificada.
- Llegada: cena; almuerzo solo si Early.
- Días intermedios: desayuno + almuerzo + cena.
- Salida: desayuno; almuerzo solo si Late.
- UI: Hotelería (matriz general + por artista) y modal Reportes comidas; Excel comidas con hojas «Por día» / «Por artista y día»; desglose opcional por régimen (nominados + por confirmar). Sin merienda.
- Pedido hotel (`buildFimbaPedidoGroups`): agrupa por hotel **y** rango efectivo de cada persona (un cuarteto con 15/9 y 16/9 genera dos líneas).
**Rooming (habitaciones por artista)** — inventario de slots ≠ headcount hotel:
- **No** se confunde con `cantidad_planificada` / PAX hotel: la planificada sigue contando pax para cupos/noches; el rooming es acomodo físico de personas nominadas.
- Tipos: **SGL=1**, **DBL=2**, **TPL=3**, **QAD=4**. Multi: flag **Matrimonial** (default **Twin** = `matrimonial=false`). SGL fuerza `matrimonial=false`.
- Admin (staff ficha artista / modal Hotelería): define **cantidad por tipo** → `syncFimbaHabitacionesFromCounts` materializa filas en `fimba_propuestas_habitaciones` (agrega vacías; borra solo vacías al bajar cupo; no borra ocupadas → warning).
- **Feedback live de cupos (antes de Aplicar):** plazas borrador = `Σ count(tipo)×capacidad` vía `totalPlazasFromHabitacionCounts` (SGL×1+DBL×2+TPL×3+QAD×4). Necesarias = participantes **activos** (= ocupadas + sin habitación). UI: *Faltan X* / *Cubre el total (exacto)* / *Sobran X plazas*; resumen cabecera re-calcula inventorio en borrador.
- Editor token `/fimba/e/:token` y staff: asigna **participantes activos** a plazas (`fimba_habitaciones_ocupantes`); una persona en una sola habitación; select por plaza.
- Consulta `/fimba/a/:token`: rooming **solo lectura**.
- UI: `FimbaRoomingPanel` (admin | assign | readonly).
- Checklist: rooming live cupos feedback ✓.

### Exportaciones y reportes (hotelería · comidas · transporte)

Puerto de flujos OFRN (ExcelJS + file-saver + jsPDF/autoTable + `window.print`) parametrizado a datos FIMBA.

**Utils:** `src/utils/fimbaExport.js` (Excel multi-hoja) · `src/utils/fimbaReports.js` (pedido texto/PDF, rooming print, comidas print, **riders print**, CNRT/paradas/hoja de ruta reusando `transportExport` / `roadmapExport`) · `src/utils/fimbaAgendaPdf.js` (agenda PDF reusando `exportAgendaToPDF`).

**UI:** `FimbaHoteleriaReports` (hub = `RoomingReportsHubModal` OFRN) · `FimbaComidasReportModal` · `FimbaTransportReportsMenu` (por vehículo; modal rango = `CnrtExportModal`).

**Permisos:** quien puede **ver** la sección puede exportar (staff OFRN management, `editor_general`, `consulta` por usuario o token de edición, tokens de artista en su ficha). No se limita al modo edición: lectura + export.

**Por artista (Hotelería):** cada tarjeta de artista en `/fimba/edicion/:id/hoteleria` tiene fila **Reportes de este artista**: Pedido hotel (hub pedido/texto/detalle/rooming acotado a esa `id_propuesta`), Rooming PDF, Excel rooming, Excel hotelería. Reusa `fimbaReports` / `fimbaExport` con `hoteleriaRows = [row]`. Los botones de cabecera (**Reportes hotelería**, **Excel rooming**, Exportar hotelería/comidas) siguen siendo de toda la edición (o del filtro Artista del select). Misma disponibilidad en `readOnly` (consulta / token RO): export OK, sin Editar. Ficha `/artista/:id` y token `/e` cargan `listFimbaHabitaciones` al abrir Pedido hotel (el row de ficha ya no manda `habitaciones: []`).

#### Matriz OFRN → FIMBA

| OFRN (nombre UI) | Formato OFRN | FIMBA ubicación | Formato FIMBA | Notas / gaps |
|------------------|--------------|-----------------|--------------|--------------|
| **Pedido Inicial** (Rooming hub) | Print + vista | Hotelería → **Reportes hotelería** (edición) o tarjeta artista → **Pedido hotel**; ficha Artista → Pedido hotel | Print/PDF + Excel plazas | Por hotel + check-in/out artista (no tramos de gira). Sexo hotelero vía `mapFimbaGeneroToSex` (`src/utils/fimbaGenero.js`): `masculino`/`m`/`hombre`→**Hombre**, `femenino`/`f`/`mujer`→**Mujer**; `otro` / `sin_especificar` / vacío → **Sin género** (nunca se asume hombre). Sin nombre = sin género. Detalle/Excel muestran Hombre/Mujer (no «Masculino»). |
| **Texto pedido** (hotel) | Clipboard | Mismo hub → Texto pedido | Clipboard + print | Mismo texto estilo «N hombres, M mujeres. Check-in…»; ambiguos como «sin género / sin nombre» |
| **Detalle de pasajeros** | Print | Hub → Detalle | Print/PDF + Excel | Orden por ingreso; **check-in/out por persona** (hereda artista si vacío); sin columna habitación |
| **Reporte de habitaciones** (RoomingReport) | Print/PDF | Hub → Reporte habitaciones; tarjeta Hotelería / `FimbaRoomingPanel` / Artista → Rooming PDF / **Excel rooming** | Print/PDF + Excel 2 hojas + texto clipboard | Hoja **Habitaciones** = 1 fila/hab. con ocupantes `(IN → OUT)` (pegar en Word); hoja **Rooming plazas** = 1 fila/cama. Inventario `fimba_propuestas_habitaciones` + ocupantes. Ficha artista carga habitaciones al abrir Pedido hotel. |
| **Excel hotelería** (resumen/personas) | — (FIMBA) | Hotelería cabecera (edición) o tarjeta artista → Excel hotelería | Excel 4 hojas | **1. Habitaciones** (rooming discriminado) · 2. Rooming plazas · 3. Personas (IN/OUT) · 4. Resumen artistas (cupos + obs. logísticas/vuelos, al final para no confundir con rooming) |
| **MealsReport** por evento | Print/PDF + texto | Hotelería / Artista → **Reportes comidas** | Print/PDF + texto + Excel | Cubiertos por día (check-in/out) + regímenes nominados; **sin** asistencia por evento OFRN |
| **Texto pedido** (comidas) | Clipboard | Reportes comidas | Clipboard | Resumen regímenes + detalle |
| **Excel comidas** | — | Hotelería / Artista / modal comidas | Excel 2 hojas | Ya existía |
| **Exportar CNRT** | PDF/Excel | Transportes → menú ⬇ por vehículo → Exportar CNRT | PDF/Excel (`downloadStyledPassengers`) | OFRN = DNI personal; FIMBA = nominados del artista hasta plazas, resto sintético «Plaza N». Aviso post-export |
| **Cronograma de paradas** | PDF (/Excel vía handler) | Menú vehículo → Cronograma de paradas | PDF/Excel (`generateStopsOnly*`) | Secuencia `buildVehicleBoardingSequence.sortedEvents` |
| **Hoja de ruta** | PDF/Excel | Menú vehículo → Hoja de ruta | PDF/Excel (`buildRoadmapExportData` + generate*) | Sin alinear viáticos OFRN; ups/downs desde rides |
| **Abordaje + secuencia** | Excel FIMBA | Menú / Exportar flota | Excel | Ya existía (`fimbaExport`) |
| **Cuadro de firmas** / itinerario plantilla / admisión | OFRN only | — | — | No aplica a flota festival (destaques orquesta) |
| **Combined stops** multi-bus | OFRN | — | — | No portado; flota Excel cubre multi-hoja abordaje |
| **Riders** (FIMBA) | — | **Rider** → Imprimir / PDF | Print/PDF (`printFimbaRiders`) | Solo artistas con **texto o imágenes** (vacío = sin texto visible **y** sin `<img>`). Staff + consulta usuario; no token `/c`. Imágenes del bucket `fimba-riders` (espera load antes de print) |
| **Agenda** (vista filtrada) | PDF | Agenda planilla → **Descargar PDF**; ficha/consulta artista → **Descargar PDF** | PDF (`exportFimbaAgendaToPDF` → `exportAgendaToPDF`) | Misma tabla UnifiedAgenda; respeta filtros; sin columna Gira |
| **Vista actual (todas las pestañas)** | Print / PDF nativo | Header FIMBA → **Imprimir / PDF** (`window.print`) | `@media print` en `FimbaLayout` | Sin jsPDF extra. Oculta nav/toolbars/botones; conserva planilla. Consulta OK. Escenario = excepción (lienzo). |

**Gaps honestos (UI tooltip / modal):** boarding FIMBA es por **plazas de artista** (`fimba_propuesta_rutas`), no nómina de participantes en el bus. CNRT/hoja de ruta rellenan con participantes de la propuesta (heurística por orden) y documentan plazas sin nominar. MealsReport por servicio/evento no existe en el modelo FIMBA.

### Agenda

- Agenda unificada = filas `eventos` de la gira con:
  1. **FIMBA**: tags `eventos_fimba_propuestas` y/o asignaciones `fimba_evento_transportes` y/o **check-in/out** (`id_evento_checkin|checkout` en propuestas o participantes de la edición)
  2. **OFRN orquesta**: misma `id_gira` con `audiencia_ofrn ∈ {tutti, grupos}` o `NULL` (general histórico). No incluyen `audiencia_ofrn = 'none'`.
- Pure FIMBA (`audiencia_ofrn=none` + solo propuestas/flota/estadía) sigue listándose vía (1).
- Un evento puede ser **ambos** (tags FIMBA + convocatoria OFRN).
- **Agenda OFRN (`UnifiedAgenda`)**: chip staff **con FIMBA** (default OFF) para incluir/ocultar eventos solo-FIMBA (`audiencia_ofrn=none` sin grupos ni `id_gira_transporte`). Músicos no ven el chip: solo-FIMBA siempre oculto; eventos con convocatoria OFRN/grupos siguen las reglas normales de roster.
- **Consulta Backline / Rider (editores/admins)**: en planilla FIMBA (`FimbaAgendaPage`) y agenda OFRN (`UnifiedAgenda`), íconos de fila abren modales **solo lectura** (portal `document.body`, `z-[100]`, card):
  - **Backline** (`IconLayers`): visible si `isFimbaBacklinePlanillaEvent` (concierto tipo 1 **o** `backline_incluido`) y gate staff. Card: estado, artistas, grupos OFRN, venue, fecha/hora, descripción HTML sanitizada, planta Drive (abrir/preview) + escenario RiderMaker (viewer), monto ARS.
  - **Rider** (`IconFileText`): visible si el evento tiene al menos un artista FIMBA con `rider` no vacío. Card(s): una por propuesta tagueada con HTML sanitizado (`sanitizeFimbaRiderHtml`).
  - **Gate FIMBA:** `canSeeContrataciones` (OFRN management / `editor_general` — mismos que Contrataciones; **no** consulta ni tokens `/c` `/a` `/e`).
  - **Gate OFRN:** `isEditor` (admin / editor / curador).
  - Helpers: `src/utils/fimbaAgendaConsulta.js`. UI: `FimbaBacklineConsultaModal.jsx`, `FimbaRiderConsultaModal.jsx`. Datos agenda: `listFimbaAgenda` + `useAgendaData` EVENT_SELECT incluyen campos backline / `stage_plot_eventos` / tags con `rider`.
- **Agenda de artista** (`id_propuesta` en `listFimbaAgenda` / ficha `FimbaConsultaAgenda` / filtro artista en planilla):
  - Eventos tagged al artista **+** paradas reales de transporte donde sube, baja o está a bordo (`fimba_propuesta_rutas` + secuencia unificada del vehículo).
  - **Sin filas sintéticas** «A bordo» ni `es_ride_segment`: todos los eventos visibles son filas `eventos` editables con badge **FIMBA** / **OFRN** según `classifyFimbaEventOrigen`.
  - Filtro: `eventMatchesPropuestaRouteFilter` / `eventMatchesAgendaEntityFilter` (tags ∪ ↑/↓ ∪ paradas intermedias a bordo). **Regresión 2026-09-02:** `isFimbaRideAboardAtStop` con secuencia exige que el evento esté en la secuencia del vehículo (ride abierto ya no marca conciertos/check-ins ajenos → bug «171 de 171»).
  - **Fix 2026-09-03 — Bajada en paradas con tipo no-transporte:** `buildFimbaBajadaArtistOptions` acepta `currentEvent` en opts; si el evento no está en `sortedEvents` (por ser `id_tipo_evento = 16` "Nuevo evento" u otro tipo no-transporte), lo inyecta en posición cronológica antes de calcular `currentIdx`. `FimbaStopRulesManager` pasa `currentEvent: event` al calcular `bajadaOptions`. Garantiza que artistas con ride abierto aparezcan como «a bordo» aunque la parada no sea tipo Traslado (ej. «Deja en aeropuerto» creado manualmente).
  - **Data fix 2026-09-04 — Domingo 20/09 gt 226 airport→hotel:** se borraron los 3 «Traslado Hotel al Aeropuerto» mal armados (eventos **3903**, **3951**, **3953** + rutas **14/16/28**) que generaban sobre cupo en Camioneta CHEVROLET (`giras_transportes` **226**). Se recrearon 9 paradas (3 bloques Salida→Traslado Sube→Deja Baja) para Espel 4 @01:00, Traver 2 @03:00, Liebeskind 2 @05:00 — script `supabase/scripts/fimba_rebuild_domingo_2009_aeropuerto_hotel_gt226.sql` (aplicado linked). Sábado Espel 4411/3950/4412 intacto.
  - **Fix 2026-09-04 — Bajada adelantable + endpoints fuera de planilla:** (1) Paradas «+» intermedias usan `eventTypeIdForCategoria` → tipo Traslado (11) y **sí** entran a `isVehicleBoardingSequenceEvent`. (2) Si el ride ya tiene `id_evento_bajada` en un evento **no** listado en trayectos (p.ej. Concierto), ese endpoint faltaba en la secuencia → `downIdx = −1` (cupo “forever open” / sobre cupo) y la UI mostraba «OK» sin botón Bajar porque `upsertFimbaPropuestaRutaStop` solo cerraba rides abiertos. Ahora: embeds `evento_subida`/`evento_bajada` en rutas + `collectMissingRideEndpointEvents` mergean stubs a la secuencia; bajada **adelanta** rides cerrados aún presentes; lista «A bordo» usa `canAlightHere` (badge «baja más adelante»).
  - **UX 2026-09-04 — Auditar ↑/↓ fuera de trayecto (Transportes):** panel ámbar **«Subidas/bajadas fuera de trayecto»** arriba de la planilla cuando hay rides FIMBA (`fimba_propuesta_rutas`) u OFRN (`giras_logistica_rutas` / logistics) cuyo extremo ↑ o ↓ es un evento **no** tipo transporte (`isOffTrayectoRideEndpoint` / `!isTransportTipoEvent`). Lista: ↑/↓ · artista|integrante · plazas · FIMBA|OFRN · vehículo · fecha · tipo+hora. **Corregir** abre `FimbaStopRulesManager` (Subidas/Bajadas) en ese extremo + vehículo + tab Artistas|Orquesta — **no** el form de actividad (ahí no hay boarding si el Concierto no tiene «Asignar vehículo»). **Quitar bajada/subida** (FIMBA, `rutaId` en `listOffTrayectoRideEndpoints` → `clearFimbaPropuestaRutaStop`) quita el extremo en un clic. Filtra por vehículo seleccionado. Helper: `listOffTrayectoRideEndpoints`. Chips Subidas/Bajadas: badge ámbar `↓ Concierto` / `↑ Ensayo` (`pairOffTrayecto`) cuando el **par** del ride está fuera de trayecto. Embeds de ruta: `tipos_evento` + `eventos.descripcion` (decode → `actividad` en cliente; **no** existe columna `eventos.actividad`). En el gestor: banner ámbar si `isOffTrayectoRideEndpoint(event)` explica basura = quitar extremo / reasignar a Traslado.
  - **UX 2026-09-04 — Corregir fuera de trayecto (King Crimson / Concierto):** antes «Abrir» abría `FimbaEventoFormModal` con `forceTransporte: false` → solo tags de artistas, sin Sube/Baja. Ahora el path de corrección es el gestor de boarding + acción directa Quitar.
  - **Fix 2026-09-03 — «+» inline hereda filtro artista activo:** `createDestinoStopEvent` acepta `idPropuestasTags?: Array<number|string>`; los pasa como `id_propuestas` al `saveFimbaEvento`. `openIntermediateStop` en `FimbaTransportPage` pasa `idPropuestasTags: filtroArtista ? [filtroArtista] : []`. La nueva parada ya aparece con el tag del artista filtrado.
  - **Fix 2026-09-04 — «+» hereda tags de la fila (no solo filtro):** `inheritStopTagsFromEvent(sourceEv, { fallbackPropuestaId })` en `fimbaDestinoStopCreate.js` copia `ev.propuestas` → `id_propuestas`, `ev.grupos` → `id_grupos` + `audiencia_ofrn=grupos`, o `audiencia_ofrn=tutti` si aplica. Fallback al filtro artista global **solo** si la fila no tiene propuestas. Cableado en `openIntermediateStop`, `createPauseOffsetStop` (ancla prev/next), `openRecorridoIntermedio`, `FimbaDestinoStopModal` y quick-create del modal. `createDestinoStopEvent` / `createRecorridoIntermedioStops` aceptan `idGruposTags` + `audienciaOfrn`.
  - **UX 2026-09-04 — Planilla Transportes más compacta:** sticky Origen/Fecha/Com·Fin + checkbox más angostos; Destino max ~7.5rem con ellipsis+title; acciones en kebab ⋮ (Editar/Duplicar/Eliminar, portal z-110); ✓/X de row-edit siguen fuera del menú.
  - **Fix 2026-09-04 — Ellipsis Destino/chips al zoom:** en `FimbaLayout` (`FIMBA_CSS`), Destino dejó de usar `inline-flex` + `flex:1 1 auto` (clip sin «…» en zoom); ahora flex de bloque `width:100%` + `flex-basis:0%` + `overflow:hidden` en td/inner. Chips boarding: ellipsis CSS de respaldo en `.fimba-planilla-board-chip-label`.
  - **Perf/UX 2026-09-04 — «+» intermedio más rápido + edición de fila:** (1) `createDestinoStopEvent` usa `clientValidated: true` (plazas 0) para no llamar `listVehiclesAvailability`. (2) Tras create, `FimbaTransportPage` inserta la fila en estado local (`buildOptimisticDestinoStopRow`) y no `await` soft refresh. (3) Fuera de modo planilla, doble clic en la fila → edición completa con tilde/`IconCheck` (confirmar) y X/Esc (cancelar); sin autosave por celda.
  - **Perf 2026-09-04 — Carga Agenda/Transportes + HMR dev:** (1) Path helpers (`parseFimbaSectionIds`, `isFimbaArtistasPath`, `resolveFimbaPrintMeta`, …) viven en `src/utils/fimbaPaths.js`; `useFimbaAccess` en `src/hooks/useFimbaAccess.js` + context base en `fimbaAccessContextBase.js` — rompe el ciclo `FimbaAccessContext` ↔ `FimbaSectionToggle` que invalidaba Fast Refresh en bucle (terminal Vite listando todos los `Fimba/*.jsx` + Agenda atrapada en «Cargando…» al remount). (2) Agenda: spinner solo espera edición + propuestas + grupos + flota + `listFimbaAgenda`; `loadFimbaTransportLogisticsSummary` + `listFimbaPropuestaRutas` llenan Destino/As.Equipaje/boarding en background (`reloadGenRef` descarta stale). (3) Transportes: misma defer de logistics OFRN en primera pintura; grupos/tipos en paralelo con trayectos/rutas (flota sigue antes de `listFimbaTraslados`).
  - **Dev reloads 2026-09-05:** reinicios ocasionales en local = (a) `ReloadPrompt` + `APP_BUILD_ID` aleatorio tras restart de Vite → hard reload al cambiar sección (mitigado: Prompt off en DEV + build id `local-dev`); (b) `AuthProvider` desmontaba todo el árbol mientras `loading` (mitigado: hidrata `localStorage` y siempre renderiza children); (c) Fast Refresh fallback al editar archivos con exports mixtos (p.ej. `buildAgendaCardMenuItems` sacado de `FimbaAgendaEventCard`). HMR amplio al tocar `FimbaLayout`/`FIMBA_CSS` o `fimbaService.js` sigue esperado. Detalle: `docs/specs/pwa-version-updates.md` § Dev local.
  - **Feature 2026-09-03 — Acciones en divisor de pausa (Transportes):** «+» superior/inferior (±1 h) + modal **Crear recorrido intermedio** (3 paradas ida-vuelta). Helpers `offsetEventDateTime` / `createRecorridoIntermedioStops` en `fimbaDestinoStopCreate.js`; UI en `FimbaTransportPage` + `FimbaRecorridoIntermedioModal`.
  - **Feature 2026-09-04 — Recorrido intermedio enriquecido (create-time):** modal con Detalle (defaults Salida/Llegada/Retorno) · Locación · Fecha · Hora · Subida · Bajada + tags compartidos. `createRecorridoIntermedioStops` acepta `detalle*` / boarding payloads; `applyStopBoardingAtCreate` + `normalizeBoardingPassenger`. Tags picker en `draftMode`. Spec boarding: ↑ salida / ↓ llegada (ida); ↑ llegada / ↓ retorno (vuelta).
  - **Product 2026-09-04 — Pausas solo con 1 vehículo filtrado:** `showVehiclePauses = selectedVehiculoIds.length === 1`. Multi / Todos → sin `fimba-pause-divider-row`, sin blank Destino/Hora fin por pausa (`boardingMetricsForEventRow(..., { enablePause: false })`).
  - Carga consulta/API: `listFimbaAgenda` amplía ids con paradas del vehículo de las rutas del artista y filtra con secuencias de boarding.
  - Planilla staff: carga FIMBA (`listFimbaAgenda({ include_ofrn: false })`) + filtro artista **en memoria** con `propuestaRoutes` + `sequencesByVehicle` (sin `buildAllFimbaAgendaRideBlocks`). Orquesta solo si el usuario marca Tutti o un grupo.
- **Planilla UI (scroll):** contenedor `.fimba-agenda-scroll` (`overflow-x: auto`; card `.fimba-agenda-card` sin `overflow: hidden`). Cabecera de columnas (`thead th`) **sticky** con `top: 0` y z-index 20 (fondo blanco + borde inferior). **Importante:** `overflow-x: auto` crea el scrollport de sticky; un `top` no-cero (p.ej. altura del site header o del banner de filtros) empuja el thead hacia el tbody y lo deja entre la 1ª y 2ª fila. Banner **Filtros activos** en flujo normal (no sticky; margen inferior 12px, fondo `#fceef6`). Misma clase de tabla en `FimbaAgendaPage` y `FimbaConsultaAgenda`.
- **UX 2026-09-04 — Vista móvil Agenda / enlaces artista (cards):** en viewports **&lt; 768px** (`.fimba-agenda-mobile`) se oculta la planilla (`.fimba-agenda-desktop`) y se muestra una **card por evento** (`FimbaAgendaEventCard`): hora · tipo/categoría · detalle clamp 3 líneas · locación/destino/vuelo/vehículo · tags artistas/OFRN · separadores de día ámbar (`FimbaAgendaDayDividerMobile` + `formatFechaLargaEs`). Staff: checkbox bulk + lápiz + kebab ⋮ (portal z-110: editar / intermedio / duplicar / backline / rider / eliminar). Consulta token / artista RO: misma card sin acciones de edición. Desktop ≥768px y **print** siguen en planilla. CSS en `FimbaLayout` (`FIMBA_CSS`).
- **UX 2026-09-04 — Día de semana sobre FECHA (Transportes + Agenda):** en vista (no en el `<input type="date">` de edición inline/fila), la celda Fecha muestra weekday **completo** ES (`Domingo`…`Sábado`, `formatWeekdayFullLocal` en `dates.js`) centrado **absoluto** encima de `DD/MM/YYYY` (`.fimba-fecha-weekday` 11px slate-400, `bottom: calc(100% + 0.2rem)`). Solo la fecha está en flujo → misma baseline horizontal que la columna hora; el día “cuelga” por encima. Misma pila en Transportes, Agenda y ConsultaAgenda. Edición de fecha sin cambio.
- **Feature 2026-09-04 — Multi-select + «Editar en lote» (Agenda + Transportes):** columna checkbox a la izquierda de cada fila (oculto en `readOnly` / consulta). Header = seleccionar todos los **visibles filtrados**; toolbar rosa al haber ≥1: contador + **Editar en lote** + Limpiar selección. Modal portal `document.body` z-100 (`FimbaBulkEditModal`). Secciones (horarios / tags / vehículo) arrancan **desmarcadas**; Aplicar solo corre las que el usuario activa y queda disabled si ninguna tiene acción. **Horarios (ambos tabs):** (A) anclar nueva fecha/hora del evento más temprano y conservar offsets relativos; (B) desplazar todos ± horas/minutos. Persistencia: `hora_inicio` (+ `fecha` si rola día); `hora_fin` solo si no es fin derivado de transporte (`eventUsesDerivedHoraFin`). APIs: `bulkShiftFimbaEventosSchedule`. **Agenda-only tags:** agregar/quitar artistas (`eventos_fimba_propuestas` vía `setEventoFimbaPropuestas`) y grupos OFRN (`eventos_grupos` + `audiencia_ofrn` vía `bulkPatchFimbaEventosTags` / `setEventoGrupos`). **Transportes-only:** **Mudar** a otro vehículo (`bulkReassignFimbaEventosVehiculo` → `setFimbaEventoTransportes`; conserva plazas; omite pure-OFRN y filas contexto). Selección se poda al cambiar filtros.
- Filtro planilla: **Todos / Solo FIMBA / Solo OFRN** (chips; **default Solo FIMBA** — no vuelca la convocatoria orquesta; ocultos cuando hay Tutti o un grupo OFRN). Banner **Filtros activos** compacto (una fila en desktop: chips + contador + acciones; padding reducido; wrap solo si hace falta) cuando hay algún filtro no por defecto (chips resumen + contador «X de Y eventos» donde **Y = agenda base cargada** (`eventos.length`) y **X = tras todos los filtros** + **Limpiar filtros**; con filtro artista/grupo/tutti activo, staff `ofrn` / `editor_general` ve también **Copiar enlace de consulta** junto a Limpiar; hint corto inline solo si «Solo FIMBA», sin grupos OFRN y **sin** filtro artista — no fuerza segunda línea). Multi-select con **checkboxes** (`MultiSelectDropdown`) de **categoría de tipo** (`id_categoria` / `categorias_tipos_eventos`; vacío = todas). Opciones = **tabla `categorias_tipos_eventos`** (catálogo vivo de Datos) ∪ tipos OFRN ∪ categorías de filas cargadas (`mergeFimbaAgendaCategories`). Alta nueva en BD (p.ej. **Catering**, **Reunión**) aparece aunque no haya tipo ni eventos. Multi-select de **locación** (`id_locacion` de filas cargadas; vacío = todas; sin `id_locacion` se ocultan si el filtro está activo). Multi-select de **artista** (`fimba_propuestas.id`; vacío = toda la edición). Multi-select de **grupos OFRN** (`giras_grupos.id` de la gira enlazada + opción **Tutti** sentinel `tutti`, **off por defecto**; placeholder «Ninguno»). Triggers acotados al ancho del contenedor (~220px; grupos ~180px); panel desplegable max 320px con labels truncados (`…`). **Toolbar UI:** fila superior `fimba-agenda-toolbar-head` con título «Planilla» + acciones (**Copiar enlace de consulta** solo staff `ofrn` / `editor_general` + **Descargar PDF**); debajo, **todos los filtros en una fila horizontal** (`fimba-agenda-filters-row`: Buscar → chips origen → categoría → locación → artista → grupos; `flex-wrap: nowrap` desde 1100px; wrap solo en viewports estrechos). **Búsqueda** debounced 250ms (patrón UnifiedAgenda: pill + clear) sobre actividad, tipo, categoría, locación/ciudad/dirección, destino calculado, vuelo, obs., artistas, grupos y vehículos. **Artista** acota la agenda FIMBA (no fuerza origen Todos ni incluye Tutti). **Tutti / grupos OFRN** son opt-in: **incluyen** esas convocatorias orquesta (unión con FIMBA / artista) y recién ahí `listFimbaAgenda({ include_ofrn: true })`. Chip **Todos** / **Solo OFRN** también pide orquesta. **Carga:** FIMBA al montar (`include_ofrn: false`); orquesta en soft refresh al marcar Tutti/grupo o Todos/OFRN. El resto de filtros (artista, grupo, origen, categoría, locación, búsqueda) aplican **en memoria**. Solo el mount inicial muestra «Cargando agenda…» y **no** espera logistics OFRN ni `fimba_propuesta_rutas` (van en background; Destino/As.Equipaje se completan al llegar); mutaciones (guardar/eliminar) y el opt-in OFRN usan soft refresh con «Actualizando…» inline. **Días sin filas:** la planilla no inserta separadores por fecha; si un día no tiene eventos visibles (p. ej. solo OFRN ocultos por «Solo FIMBA»), ese día no aparece — no es hueco de datos.
- **Enlaces compartibles (query params)** — `/fimba/edicion/:id/agenda`:

| Param | Tipo | Semántica |
|-------|------|-----------|
| `propuestas` | CSV numérico | IDs `fimba_propuestas` (multi-select artista). Ej. `5,7` |
| `artistas` | CSV numérico | Alias de `propuestas` (misma semántica) |
| `artista` | numérico o CSV | Alias legacy (un id o lista `5,7`) |
| `grupos` | CSV numérico | IDs `giras_grupos` OFRN. Ej. `3`. Token `tutti` en el CSV también activa Tutti |
| `grupo` | id o nombre | Alias: `3` o `Alba` (nombre → id al cargar grupos de la gira); `tutti` = opt-in Tutti |
| `ofrn` | id o nombre | Alias de `grupo` |
| `tutti` | `1` \| `true` | Opt-in convocatoria Tutti / general histórica. Off si se omite |
| `locacion` | CSV numérico | IDs `locaciones` (multi). Ej. `42` o `42,43` |
| `origen` | `fimba` \| `ofrn` \| `all` | Chips origen; omitido = **Solo FIMBA** (default); con Tutti/grupo se fuerza `all` en el enlace. Artista solo **no** fuerza `all` |

Helpers: `src/utils/fimbaAgendaUrlParams.js` (`parseFimbaAgendaUrlSearchParams`, `buildFimbaAgendaSharePath`, `buildFimbaAgendaConsultaSharePath` = token único sin query, `buildFimbaAgendaConsultaLegacySharePath` = token de edición + query, `canonicalizeAgendaConsultaFilters`, `retainSelectedFilterIds`, `eventMatchesAgendaEntityFilter`, `eventMatchesTuttiAudiencia`, `eventMatchesPropuestaRouteFilter`, `hasOfrnConvocatoriaFilter`, `resolveGrupoIdsFromNames`). Carga server: `listFimbaAgenda` acepta `id_propuestas[]` + `id_grupos[]` + `include_ofrn` (API/consulta artista; incluye paradas de rutas sin sintéticos; orquesta omitida si `include_ofrn: false`). Planilla staff: carga FIMBA y filtra artista en cliente; orquesta al marcar Tutti/grupo. UI: sincroniza query params al cambiar filtros (`replace` en ruta staff `/fimba/edicion/:id/agenda`); botón **Copiar enlace de consulta** (solo staff `ofrn` / `editor_general`) **crea o reusa** una fila `fimba_agenda_consultas` (token UUID único + filtros congelados) y copia `/fimba/c/{token}/agenda` **sin query string**. Regenerar `fimba_ediciones.token_consulta` **no** invalida estos enlaces (son independientes). En consulta (`agendaOnly`): filtros de planilla **ocultos**; la vista es fija (sesión `agenda_query_locked`); no hay Limpiar ni chips origen/artista/grupo. Enlaces legacy `/fimba/c/{token_edicion}/agenda?propuestas=…` siguen funcionando: al abrir se congelan en sesión.

**Ejemplo FIMBA 2026 (edición 1):** Alba Carmona (`5`) + Daniel Ruggiero cuarteto (`7`) + grupo OFRN Alba (`3`):

- Staff (requiere login): `/fimba/edicion/1/agenda?propuestas=5,7&grupos=3&tutti=1&origen=all`
- **Público consulta (sin login):** `/fimba/c/{uuid-único}/agenda` (token de `fimba_agenda_consultas`, vista fija)
- Legacy (sigue válido): `/fimba/c/dabafb9c-1deb-4f30-a443-a3968dcfe7f4/agenda?propuestas=5,7&grupos=3&origen=all`

Equivalentes de lectura: `?artistas=5,7&grupo=Alba` · entry `/fimba/c/:token/agenda?…` → `FimbaEdicionConsultaEntry` valida token (**primero** `fimba_agenda_consultas`, luego `fimba_ediciones.token_consulta`), persiste `localStorage.fimba_consulta_edicion` con **`agenda_only: true`** y **`agenda_query_locked: true`** (filtros congelados), redirige a `/fimba/edicion/:id/agenda` en shell RO **solo agenda** (sin nav; sin controles de filtro). Token único de agenda: redirect **sin query**. Token de edición + query legacy: query se congela en sesión (cambiar la URL no cambia la vista). Entry `/fimba/c/:token` (sin `/agenda`, token de edición) → consulta edición completa RO (Artistas, Agenda, Transportes, Hotelería, Venues) como antes.
- **Columnas planilla Agenda / consulta artista:** **Evento** (badges FIMBA/OFRN; antes «Origen») · Fecha · Com·Fin · Tipo · Detalle · **Origen** · **Destino** · **Vuelo** · Vehículo · As. Equipaje · …
  - **Origen** = parada actual: `formatAgendaOrigenLabel(ev, { skipDestinoFallback: true })` → `locacion_nombre` / `locaciones` (+ ciudad); **no** mezcla texto legacy `Destino:` en la línea principal. Sin locación de catálogo → **`(Sin locación)`** (`TRANSPORT_DESTINO_SIN_LOCACION`). Si persiste línea `Destino:` en `descripcion`, tag gris debajo (`resolveLegacyDestinoFromDescripcion`) para identificar y limpiar datos viejos.
  - **Destino** = **calculado** (no persistido): misma fuente que Transportes — `resolveAgendaDestinoLabel` → `resolveTransportDestinoFromNextStop` + secuencias `buildAllVehicleBoardingSequences` (ya cargadas para As. Equipaje). Solo filas transporte; resto «—». Sin next stop → **`Sin siguiente parada`** (`TRANSPORT_DESTINO_SIN_SIGUIENTE`). Next sin locación → **`(Sin locación)`** (nunca actividad/tipo).
  - **Vuelo** = `eventos` decode `Vuelo:` (columna propia; vacío «—»).
  - **Edición de fila (inline, paridad Transportes):** doble clic en la fila (excepto checkbox, acciones, inputs, Quill) entra a **edición completa** de campos patchables; **no** autosave. Tilde (`IconCheck`) confirma → `patchFimbaEventoPlanilla` una vez; **X** / **Esc** descarta borrador. **Acciones:** kebab ⋮ (`FimbaAgendaCardMenu` / `buildAgendaCardMenuItems`, portal z-110) con Editar / Insertar intermedio / Duplicar / Eliminar (+ Ver Backline / Rider si aplica); ✓/X de row-edit fuera del menú. Omitido en `readOnly` / consulta. Checkbox + «Editar en lote» intactos. Helpers: `src/utils/fimbaPlanillaRowEdit.js` (`draftFromEvent`, `agendaRowEditFieldsEqual`).
    - **Inline-editables:** Fecha · Hora com · Hora fin (deshabilitada si `eventUsesDerivedHoraFin`) · **Detalle** (`FimbaRichTextEditor` compact + obs. equipaje) · Origen/locación (`LocationSelectWithCreate` → `id_locacion`) · Vuelo.
    - **Modal-only / no inline:** Tipo · Destino (calculado) · Vehículo · OFRN · As. Equipaje (métrica) · badges Evento. Tags Artistas siguen con `FimbaEventArtistasTagsCell`.
  - **UX 2026-09-04 — Agenda Detalle + kebab:** columna Detalle más ancha + clamp de altura; row-edit/modal con Quill; acciones de fila en ⋮ (libera ancho horizontal).
  - **Feature 2026-09-04 — Agenda row-edit como Transportes:** antes el doble clic abría el modal; ahora mirror UX de Transportes (fuera de modo planilla).
- **Descargar PDF** (toolbar planilla staff + cabecera agenda artista / consulta): reusa `exportAgendaToPDF` / `buildAgendaPdfExportItems` (mismo pipeline UnifiedAgenda) vía adapter `src/utils/fimbaAgendaPdf.js`. Exporta la **vista filtrada** actual (origen, categoría, locación, búsqueda, artista). Skin FIMBA (`IconPrinter` + label). Columna Gira oculta. Descripción PDF = Detalle (`actividad`) + origen/destino/vuelo + tags artistas + vehículos extra (el chip de transporte OFRN solo muestra la 1ª unidad). *PDF aún puede usar layout legacy destino/vuelo — pendiente alinear.*
- Trayectos (`solo_traslados` / página Transportes):
  - Incluye **paradas/traslados OFRN** de la gira (`id_gira`) además de trayectos FIMBA.
  - Criterio fila trayecto (`isFimbaTrasladoEvent`): `actividadUsaTransporte` **o** `eventos.id_gira_transporte` set. Un Concierto con solo `fimba_evento_transportes` **no** entra a la planilla Transportes (no es parada de boarding); si tiene ↑/↓ en `fimba_propuesta_rutas`, entra a la **secuencia de boarding** del vehículo vía `isVehicleBoardingSequenceEvent` (endpoint).
  - **Auditoría visible:** banner **Subidas/bajadas fuera de trayecto** (opción A) + badge en chips del par trayecto (opción B barata). **Corregir** → StopRules; **Quitar bajada/subida** FIMBA en el banner. Ver bullet Agenda «UX 2026-09-04 — Auditar ↑/↓ fuera de trayecto».
  - Merge OFRN: misma convocatoria agenda (tutti/grupos/null) **+**, en modo trayectos, paradas de flota (`id_gira_transporte ∈ giras_transportes` de la gira) aunque `audiencia_ofrn = none`.
  - **No** mezcla ensayos/ensambles OFRN por defecto (solo filas que pasan el criterio transporte). Opt-in: **Ver otros eventos**.
  - Filtro origen chips (**default Todos**); filtro **vehículo** por `giras_transportes.id` (vacío = todos; FIMBA vía `fimba_evento_transportes`, OFRN vía `id_gira_transporte`). **UX chips (2026-09-04):** clic en el **cuerpo** del chip = selección **exclusiva** (reemplaza el filtro por ese id); **Todos** limpia a `[]` (sin filtro). En chips no seleccionados: **«+»** (`IconPlus`) **suma** al multi-select; en seleccionados (cuando no es Todos): **«−»** (`IconMinus`) **quita**; vacío tras quitar = Todos. Pausas siguen solo con `selectedVehiculoIds.length === 1`. Sin query param de vehículo (solo `artista` en URL). CSS: `.fimba-veh-filter-chip` en `FimbaLayout`.
  - **Ver otros eventos** (toolbar Trayectos, chip `IconEye`): multi-select **Categoría** (`categorias_tipos_eventos`, sin cat. Transporte) + **Artistas FIMBA** + **Grupos OFRN**. Vacío = off. Activo → carga `listFimbaAgenda` (no-transporte) y **intercala** filas de contexto por fecha/hora (`sortFimbaAgendaRows`). Match: `eventMatchesOtrosEventosContext` (categoría AND tags: unión propuestas∪grupos del evento; no usa rutas de boarding). Filas contexto: clase `fimba-row-contexto`, badge tipo/categoría, sin Subidas/Bajadas / Tránsito / «+»; el filtro vehículo **no** las oculta. Ejemplo: Conciertos+Ensayos + Alba Carmona + Alba C. (OFRN).
  - **«+» entre Locación y Destino:** crea parada intermedia **inline** (`createDestinoStopEvent` + `allowEmptyLocacion`, horario `defaultIntermediateStopSchedule` midpoint / +30m). Mismo vehículo primary de la fila; tags artista/grupo heredados de la fila (`inheritStopTagsFromEvent`; fallback filtro artista). No abre modal create. **Perf 2026-09-04:** `clientValidated: true` (plazas 0) evita `listVehiclesAvailability`; tras OK inserta fila **optimistic** (`buildOptimisticDestinoStopRow`) + limpia `hora_fin` del prev en estado local; soft refresh eventos/rutas **sin bloquear** UI; highlight + **edición de fila** con foco locación (tilde confirma). El lápiz de Destino sigue abriendo `FimbaDestinoStopModal` (requiere locación; también hereda tags de la fila). `hora_fin` del tramo previo se limpia en DB (fin = hora com de la nueva parada).
  - **Programar transporte** (`FimbaProgramarTransporteModal`, portal z-100): botón toolbar. Form en filas: **salida** = locación + fecha + hora; **llegada** = locación + fecha + hora (`.fimba-prog-trip-row`; mobile: locación full-width, fecha|hora debajo); luego artista FIMBA **o** grupo OFRN + cantidad. Dropdown muestra `Nombre · N`. **Cantidad** default = headcount al elegir: artista → `cantidad_planificada` (`computeFimbaCapacity.tope_personas`); grupo OFRN → `|giras_grupos_integrantes|` (`listFimbaGiraGrupos` vía `fetchGiraGrupos`). Usuario puede bajarla (referencia UI; plazas reales del grupo = roster). Lista flota rankeada (`rankVehiclesForProgrammedTrip` en `fimbaProgramarTransporte.js`). Cada oferta muestra **Origen** / **Siguiente destino** del itinerario (`formatItineraryAnchor`: `17/09 - 12 hs. Hotel x`). Al elegir: crea **dos** paradas (desde/hasta) mismo vehículo; artista → `fimba_propuesta_rutas` ↑ en desde + ↓ en hasta; grupo OFRN → tags `audiencia_ofrn=grupos` + regla `giras_logistica_rutas` alcance **Grupo** ↑ desde / ↓ hasta (`upsertOfrnGrupoRutaStop`; auto-admisión Persona de miembros). Highlight + edición de fila (detalle) en la fila desde.
  - **Heurística ranking Programar** (score desc.): (1) +1000 hueco Origen→Siguiente cubre [salida,llegada] sin paradas interiores; agenda libre +700; solape −200; (2) +200 si libres en origen ≥ cantidad (−300 si no); (3) +120 misma locación salida / +80 llegada; (4) penaliza distancia temporal origen↔salida y llegada↔siguiente; (5) motivos cortos en la tarjeta.
- Visual: badges origen FIMBA / OFRN; filas pure-OFRN muting cyan; filas contexto grises; columna convocatoria (Tutti / chips de grupo) en Agenda; en Transportes columnas origen + vehículo(s).
  - **Feature 2026-09-05 — Regla Subida/Bajada por Grupo OFRN:** alcance `Grupo` en `StopRulesManager` / `giras_logistica_rutas` (`target_ids` = id `giras_grupos`; fuerza 4). Paridad ↑/↓ con Persona/Categoría; Programar transporte y Recorrido intermedio dejan de usar solo reserva técnica anónima para grupos. Match vía `grupo_ids` en roster (`enrichRosterWithGrupoIds`). Sin migración (reusa `target_ids` text[]).
- **Columna «As. Equipaje» (Agenda / consulta artista):** label histórico; valor = **personas a bordo al salir** (`resolveEventAboardCount` / Σ `en_transito` de las unidades del evento; misma fuente que Tránsito/cap). Tooltip aclara que **no** es `eventos.asientos_equipaje`. Filas sin transporte → «—». El campo de equipaje del modal sigue siendo reserva de asientos de material.
- **Tags OFRN grupos/Tutti vs FIMBA artistas:** chips de convocatoria OFRN (Agenda `fimba-badge-ofrn-grupo`, modal `fimba-chip-ofrn`, planilla Subidas/Bajadas `fimba-planilla-board-chip-ofrn`, Backline/Venues `GiraGrupoChips` / `.fimba-ofrn-grupo-chips`) usan `border-radius: 2px` (cuadrados, **nunca** píldora) y muestran el **nombre completo** de `giras_grupos.nombre` (no iniciales/`compact`). Tags de artista FIMBA siguen en píldora (`border-radius: 999px`). Colores del grupo / magenta FIMBA / cian OFRN se mantienen.
- **Insertar evento intermedio (Agenda)**: en acciones de fila (`IconPlus` cian; oculto en `readOnly` / ride segments), abre create modal con gap-fill `defaultGapFillEventSchedule` respecto al **siguiente evento del mismo día** en la planilla filtrada (orden contractual; excluye rides). Prefill: misma `fecha`, `hora_inicio` = fin efectivo del actual, `hora_fin` = `hora_inicio` del next (o vacío si es el último del día). Sin vehículo heredado; usuario completa tipo/actividad/tags.
- Columna **Artistas** (Agenda y Transportes) / **Subidas·Bajadas** (solo Transportes, boarding):
  - **Agenda** (sin secuencia de bus): chips de propuestas; **`Orquesta {n}`** con `n` = |roster contabilizado de la gira| (grupos ∩ countedIds; sin ausentes). Fallback `eventos.audiencia` si no hay roster. Convocatoria OFRN (Tutti/grupos) vive en col. **OFRN**.
  - **Transportes — Artistas**: misma fuente de propuestas + chips OFRN Tutti/grupos (no hay col. OFRN aparte) + `orquesta_label` si aplica. Complementa (no reemplaza) Subidas/Bajadas.
  - **UX 2026-09-04 — vacío accionable (no «Edición»):** el texto muerto «Edición» era un *fallback* de planilla cuando no había tags de artista ni `orquesta_label` (= evento visible en toda la edición, **no** `audiencia_ofrn=tutti` ni disabled). Reemplazado por `FimbaEventArtistasTagsCell`: RO → «Sin artistas»; editable → botón **+ Artistas** / clic en chips abre picker compacto `FimbaEventArtistasTagsPicker` (portal z-100): multi-select artistas FIMBA (propuestas de la edición) + audiencia OFRN (Ninguna / Tutti / grupos de gira). Guarda con `setEventoFimbaPropuestas` + `setEventoGrupos` + `eventos.audiencia_ofrn`. Reusa catálogos ya cargados en Agenda/Transportes; si faltan, fetch vía `listFimbaPropuestas` / `listFimbaGiraGrupos`. El form completo (`FimbaEventoFormModal` + `focusTags`) queda para el lápiz / edición de fila, no para etiquetar desde la celda.
  - **Transportes — Subidas / Bajadas**: vía `resolveStopBoardAlightChips` — chips FIMBA `{nombre} {plazas}` (o `{nombre}… {n}` si largo, `formatBoardChipLabel`) desde `fimba_propuesta_rutas`; chip **Chofer** (`.fimba-planilla-board-chip-chofer`) si `es_chofer`; chips OFRN por regla (`summarizeOfrnStopRules`, fallback «Orquesta n»); **Reserva del evento** (residual técnico, no removible). **Tránsito/cap** hover = a bordo al salir (`a_bordo`, Orquesta con apellidos si pocos; chofer etiquetado, plazas display).
- **Tipos = catálogo OFRN** (`tipos_evento` + `categorias_tipos_eventos`), mismo shape que `EventForm` / UnifiedAgenda. Persistencia: **`eventos.id_tipo_evento`** (FK). Sin tabla ni strings de tipo FIMBA-only.
- **Catering** (2026-09): categoría `categorias_tipos_eventos.nombre = 'Catering'` (id 9) + tipo `tipos_evento.nombre = 'Catering'` (id 34, color `#ea580c`). **No** es Comidas (`id_categoria = 4`): no entra a logística de viandas / `isMealEvent`. Subtipos extra se agregan en Datos → Tipos de Evento (misma categoría). Filtros FIMBA leen la tabla de categorías (una fila nueva aparece sola; no hace falta tipo para el dropdown).
- UI modal: filtro por categoría + select de tipo (nombre + color de catálogo). Planilla: badge con `tipo_nombre` / `tipo_color` y subtítulo de categoría.
- **Tinte de fila por tipo (Agenda):** cada fila/card usa un lavado muy suave del mismo hex que el chip (`ev.tipo_color` / `tipos_evento.color`) vía `fimbaTipoRowTintStyle` (`FIMBA_TIPO_ROW_TINT_ALPHA = 14` ≈ 8%; el chip sigue en `22`). Aplica en planilla staff (`FimbaAgendaPage`), cards móviles (`FimbaAgendaEventCard`) y agenda artista (`FimbaConsultaAgenda`). Separadores de día sin cambio. Clase `fimba-has-tipo-tint` hace transparentes los `td` de filas OFRN/ambos para que el wash del `<tr>` se vea; barra inset de origen se mantiene. Row-edit magenta tiene prioridad sobre el tinte.
- **Detección transporte** (`actividadUsaTransporte`): categoría id `6` («Transporte») **o** ids OFRN `11/12/28/31/35` (EventForm usa 11/12; logística también 35; catálogo tiene 28/31). Checkbox «Asignar vehículo(s)» permite flota en otros tipos.
- Defaults: agenda nuevo → `id_tipo_evento = 16` («Nuevo evento»); Transportes / `forceTransporte` → `11`; **`audiencia_ofrn = 'none'`** salvo toggle.
- **Audiencia OFRN** (modal staff): **Ninguna | Tutti | Grupos** (multi-select real de `giras_grupos` de la gira; no enum genérico). Persistencia:
  - `eventos.audiencia_ofrn = 'none' | 'tutti' | 'grupos'`
  - `grupos` → replace `eventos_grupos` con ids seleccionados (misma API que UnifiedAgenda `setEventoGrupos`)
  - `tutti` / `none` → limpia `eventos_grupos`
- Edición staff de eventos pure-OFRN: **permitida** (mismas tags FIMBA + audiencia); no se toca `id_gira_transporte` en update (preserva paradas OFRN).
- Transportes = subconjunto agenda (`solo_traslados`, con OFRN transporte) + panel **Vehículos** + planilla **Trayectos** (origen + filtro flota).
- Clasificación origen: FIMBA = tags propuestas y/o `fimba_evento_transportes`; OFRN = audiencia orquesta **o** `id_gira_transporte` (parada flota).
- Modal compartido: `FimbaEventoFormModal.jsx`.

### Auth / acceso

| Superficie | Mecanismo |
|------------|-----------|
| Staff OFRN `/fimba/*` | Login OFRN; **`isManagement`**. Full acceso a todas las ediciones. **No** hace falta fila en `fimba_usuarios` salvo override (abajo). Link sidebar: `isManagement`. |
| OFRN + fila `consulta` | Si el mail OFRN tiene `fimba_usuarios` activo con `rol_fimba=consulta` para la edición, **`resolveFimbaAccess`** fuerza RO (`source: ofrn_fimba_consulta`) aunque sea management (p.ej. `produccion_general`). |
| Usuario FIMBA edición | Tabla `fimba_usuarios` (mail + `clave_acceso` + `rol_fimba` + `id_edicion`). Login `/fimba/login` → `localStorage.fimba_user`. **`editor_general`**: full edición; **`consulta`**: shell RO (sin Usuarios/Contrataciones). |
| Consulta artista `/fimba/a/:token` | UUID `token_consulta` de la **propuesta**; **solo lectura**: datos del artista (check-in/out, planificada, hotel), **agenda** filtrada por tags `eventos_fimba_propuestas`, participantes |
| Consulta edición `/fimba/c/:token` | UUID `token_consulta` de la **edición** (`fimba_ediciones`); session `localStorage.fimba_consulta_edicion`; shell **solo lectura** de esa edición: Artistas, Agenda, Transportes, Hotelería, Venues; **sin** Usuarios, Contrataciones **ni Rider**; sin create/edit/delete |
| Consulta agenda `/fimba/c/:token/agenda` | UUID de **`fimba_agenda_consultas`** (vista fija) **o** `token_consulta` de edición (legacy + query); session con **`agenda_only` + `agenda_query_locked`**; shell RO **solo `/agenda`**; **sin filtros editables** |
| Edición artista `/fimba/e/:token` | UUID `token_edicion`; planilla Excel de participantes; **agenda editable**; **rooming / acomodo** (sin editar inventarios de cupos) |

#### Usuarios FIMBA por edición (`fimba_usuarios`)

| Campo | Notas |
|-------|--------|
| `mail` | NOT NULL; unique con `id_edicion` case-insensitive (`lower(mail)`) |
| `clave_acceso` | Clave temporal (texto plain app-level v1; no Supabase Auth) |
| `rol_fimba` | check: `editor_general` \| `consulta` |
| `id_edicion` | FK `fimba_ediciones` ON DELETE CASCADE |
| `nombre` | opcional |
| `activo` | default true |
| `token_login` | UUID único nullable — magic link `?token=` en `/fimba/login` |

**Roles:** `editor_general` = acceso completo a esa edición (artistas, agenda, transportes, hotelería, rider, contrataciones, usuarios). `consulta` = solo lectura en el shell de la edición (mismos tabs operativos + **Rider RO + PDF**, **sin** Usuarios ni Contrataciones; `readOnly` vía `FimbaAccessContext`).

**Enlace consulta general (`fimba_ediciones.token_consulta`):** UUID único NOT NULL default `gen_random_uuid()`. Gestión en `/fimba/edicion/:id/usuarios` (sección «Enlace consulta general edición»: copiar / regenerar). Ruta entry `/fimba/c/:token` → `FimbaEdicionConsultaEntry` → escribe `fimba_consulta_edicion` y redirige a `/fimba/edicion/:id`. **Enlace filtrado de agenda:** tabla `fimba_agenda_consultas` (token UUID propio, filtros congelados; «Copiar enlace de consulta» en Agenda). Regenerar el token de edición **no** invalida los enlaces de agenda. Enlaces viejos con query string siguen abriendo (consulta fija vía sesión).

**Guard (`FimbaStaffGuard`):** (1) OFRN `isManagement` → allow (si hay fila `consulta` para la edición → RO, bloquea `/usuarios` y `/contrataciones`); (2) `fimba_user` editor/consulta con match `id_edicion` (consulta bloquea `/usuarios` y `/contrataciones`); (3) sesión token `fimba_consulta_edicion` igual RO; si **`agenda_only`** y `source === token_consulta` → redirect a `/fimba/edicion/:id/agenda` (preserva query) fuera de agenda — **no** aplica el redirect si OFRN/fimba_user tienen prioridad sobre un leftover de token; (4) sin sesión → `/fimba/login`; (5) OFRN no-management sin sesión FIMBA → mensaje + link login FIMBA.

**`FimbaAccessContext` / `resolveFimbaAccess`:** prioridad OFRN+`fimba_usuarios.consulta` (override RO) → OFRN management → editor_general → consulta user/token. Override vía `listFimbaUsuariosByMail` + `useOfrnFimbaUsuarioOverride`. Expone `readOnly`, **`agendaOnly`**, `canSeeUsuarios`, `canSeeContrataciones`, **`canEditPropuestaMeta`**, **`canSeeRider`**, `canManageUsers`. Section toggle oculta Usuarios + Contrataciones en RO; oculta **Rider** en token `/fimba/c`; **oculta todo el toggle** si `agendaOnly`.

- **`canEditPropuestaMeta`**: true solo para **OFRN management** y **`editor_general`** (misma base operativa que contrataciones). **false** para `consulta`, token `/fimba/c`, y por default en rutas token (sin provider / source `none`). **No** se infiere de `!readOnly`: los editores de artista `/fimba/e/:token` pueden planilla/agenda/rooming pero **no** meta administrativa de la propuesta (incl. rider).
- **`canSeeRider`**: true para OFRN management, `editor_general` y **`consulta` (usuario FIMBA)**. **false** para token `/fimba/c` y tokens artista `/a` `/e`. Pestaña + ficha rider = logística interna.

**UI:** `/fimba/login` (brand FIMBA); `/fimba/edicion/:id/usuarios` (alta / desactivar / regenerar clave + enlace consulta edición); header con **Salir** / **Salir de consulta** (`useConfirmDialog` → `ConfirmDialog`): limpia `fimba_consulta_edicion` y/o `fimba_user`; token puro → `/`; dual OFRN+token → `/fimba` staff; usuario FIMBA → `/fimba/login`. Pantalla «Sin acceso» del guard también ofrece Salir con el mismo confirm. Home redirige externos/token a su edición.

**RLS (v1):** igual que la intranet OFRN — tablas accesibles con anon key; seguridad a nivel app + tokens UUID + claves de invitación. Hardening RLS/RPC queda como TODO.

**No** se clona el esquema de `integrantes`. IDs de personas OFRN (`id_integrante`) son numéricos cuando se vinculan.

### Skin

- Brand: logo textual «FIMBA»
- Acento `#d73289`, deep `#94216D`, cyan `#00b1eb` / `#2AC4EA`, texto `#222`
- Fuentes: DM Sans / Rubik (Google Fonts en layout FIMBA) con fallbacks
- **Modo nocturno:** misma preferencia global OFRN (`localStorage.theme_mode` + clase `html.dark` vía `ThemeController` / evento `theme-changed`). FIMBA **no** redefine fondos oscuros propios: hereda el filtro invert+hue de `src/index.css` (igual que Giras/intranet). Toggle sol/luna en el header de `FimbaLayout` (`.fimba-theme-toggle`, dentro de `.fimba-header-actions` → oculto al imprimir). Swatches de color de artista (`.fimba-swatch`) se re-invierten bajo `html.dark` para conservar el color autorado. **Print:** `filter: none` en `@media print` (index.css) + fondos blancos forzados en FIMBA print CSS.
- **Ancho shell:** `.fimba-main` y `.fimba-header-inner` usan `width: 90%` / `max-width: 90vw` (piso al hacer zoom out; sin `max-width` fijo 1100/1200px). Mobile ≤640px: `width: 100%` + padding lateral.
- **Imprimir / PDF (shell):** botón compartido en el header de `FimbaLayout` (`IconPrinter`, tooltip: abre el diálogo del sistema → Guardar como PDF). Disponible para staff, `consulta` y tokens que ven la pestaña (no en `/fimba/login`). **Enfoque:** `@media print` (no librería html2pdf/jsPDF extra). Chrome oculto: nav de secciones, Salir/OFRN, toolbars de filtros (`fimba-no-print`, `.fimba-agenda-filters-row`), kebab/lápices/botones `.fimba-btn`, columna **+** y acciones de planilla, chips × de boarding, «Programar transporte», semáforo de modo edición, toolbar Quill, modales/toasts. **Se conserva:** planillas/tablas/contenido, banner de filtros activos (sin botones), chips/badges con `print-color-adjust: exact`. Cabecera de impresión: edición + título de pestaña + fecha (`resolveFimbaPrintMeta`). **Orientación:** la elige el usuario en el diálogo de impresión del navegador (no se fuerza `@page { size: landscape }` ni `A4 landscape`). **Page breaks:** `page-break-inside: avoid` **solo en `tr`** (filas). **No** en `.fimba-card` / wrappers de planilla (`.fimba-agenda-card`, `.fimba-planilla-card`, etc.) — si el card entero es unbreakable y no cabe bajo el H1, el navegador lo empuja a la página 2 y deja la 1 casi vacía. Scroll wrappers → `overflow: visible` + `height: auto` (sin `min-height: 100vh` en print). **Global print (`src/index.css`):** las reglas legacy de Giras (`body > * { display:none }` + solo portals `fixed`) **no** deben aplicarse cuando `.fimba-root` está montado; si no, el preview PDF queda en blanco (solo footer URL). Con FIMBA: `#root` visible; siblings de body ocultos; no se oculta `header` global (el banner vive en `.fimba-header`). Reportes especializados (Rider `printFimbaRiders`, Agenda jsPDF, rooming/CNRT) siguen en sus botones de página. **Escenario** (`/escenario`, fuera del layout): nota de impresión; el canvas no se captura bien.
- **Tokens CSS** (`--fimba-*`): definidos en `.fimba-root` **y** `.fimba-modal-backdrop` porque los modales usan `createPortal(..., document.body)` y salen del árbol de `.fimba-root`. Sin eso, `var(--fimba-*)` se invalida en el portal → botones selected/primary con `color: #fff` quedaban invisibles (blanco sobre blanco).
- Primary: `.fimba-btn-primary` con hex explícito `#d73289` + texto blanco; chips segmento: `.fimba-chip` / `.fimba-chip-on` (hex fijo, no herencia).
- **Nav secciones** (staff): `FimbaSectionToggle` en header sticky (top-right) cuando hay `edicionId` — **Artistas | Agenda | Transportes | Hotelería | Rider | Contrataciones | Usuarios** (`IconMusic` / `IconCalendar` / `IconBus` / `IconBed` / `IconFileText` / `IconClipboardCheck` / `IconUsers`); activo `#d73289`. **Siempre sale del contexto artista**: `base = /fimba/edicion/:id` (nunca concatena `/artista/:n`). Artistas → `/fimba/edicion/:id` (activo también en ficha artista index). Agenda/Transportes/Hotelería/Rider/Contrataciones/Usuarios → `/fimba/edicion/:id/{segment}` edición-root. Rutas anidadas `/artista/:id/{agenda|…}` siguen válidas para deep links locales en ficha; el toggle superior no las usa. **Consulta usuario FIMBA** (`rol_fimba=consulta`): oculta Contrataciones y Usuarios; **muestra Rider** (RO + PDF). **Token `/fimba/c`**: oculta Contrataciones, Usuarios **y Rider**. **Token `/fimba/c/.../agenda` (`agendaOnly`)**: sin toggle (solo agenda). Tokens `/a` `/e`: sin toggle de edición. En home de ediciones (`/fimba`) no se muestra.
- **Buscar Artistas o Integrantes** (`FimbaArtistaPersonSearchField`): en planilla Artistas y toolbar Hotelería. Debounce ~180ms; `matchesFimbaArtistaPersonSearch` (tokens AND, sin tildes). Campos: nombre de propuesta + `apellido`/`nombre` de participantes (Hotelería = `row.personas` batcheadas; Artistas = un `listFimbaParticipantesForPropuestas` al montar/cambiar lista). AND con select Artista (Hotelería). Query vacía = todas las filas/cards en orden alfabético.

- **Contrataciones** (`/fimba/edicion/:id/contrataciones`): planilla Excel de `fimba_contrataciones`. Columnas separadas **Artista** (`id_propuesta` → nombre de `fimba_propuestas`; «Sin artista» en gris si null) y **Nombre** (texto libre `nombre`). Vista RO de Nombre: **line-clamp 2** + ellipsis + `title` con texto completo (no infla filas). En row-edit, Nombre usa **textarea** compacta (`rows={2}`, `max-height` ~4.5rem + scroll; Enter no confirma — tilde / Esc). **Monto** en ARS (es-AR); **total superior** suma montos de filas **visibles** (filtro activo; usa borrador solo de la fila en edición). Headers **ordenables** (asc/desc; textos es; montos numéricos; vacíos al final; Artista ordena por nombre de propuesta). Filtro de búsqueda en el **header de la columna Nombre** (input compacto; haystack = nombre libre + artista). Flags boolean (`envio_firma_mfm_nota` / `nota_firmada` / `falta_documentacion` / `enviado_adm`): UI con **check tildado** (SVG relleno + ✓ blanco) o cuadro vacío, colores azul/verde/rojo/violeta por columna (**nunca** texto «Sí» en la planilla web); headers abreviados **Firma / Firmada / Doc. / ADM** con `title` completo; sync a Google Sheet escribe booleanos nativos **TRUE/FALSE** (checkbox UI en columnas G–J vía expand de Sheets Table + `setDataValidation` best-effort; layout **B–K**, col A intacta — Sheet **Nombre** sigue siendo `nombre` ∥ fallback propuesta, sin columna Artista aparte). «Último estado» = presets coloreados + **Otro…**. **Layout compacto (UX 2026-09-04):** scroll horizontal en `.fimba-ctr-scroll`; columna de **acciones sticky-right**; fuera de edición: **carpeta Drive** + **kebab** (historial / eliminar); en row-edit: tilde / X. Columnas: **Nº exp.** · **Tipo** · 4 flags ~2.5rem; tabla `min-width` ~960px. Artista + Nombre en dos columnas.
  - **Edición de fila (inline, paridad Agenda/Transportes) — Feature 2026-09-04:** celdas **no** editables por defecto (sin click-to-edit ni autosave on blur). **Doble clic** en la fila → modo edición completa con borrador local; **tilde** (`IconCheck`) confirma → `updateFimbaContratacion` / `createFimbaContratacion` una vez; **X** / **Esc** descarta. Fila vacía inferior = alta (siempre editable; tilde/Enter crea). Semáforo por fila durante dirty/saving/saved. Omitido si `readOnly`. Carpeta Drive sigue en modal (no es campo inline). `flushDirty` antes de **Actualizar** Sheet sigue persistiendo la fila en edición + alta pendiente.
    - **Inline-editables:** Nº expediente · Artista (`id_propuesta`, columna propia) · Nombre libre (columna propia; textarea compacta en edit) · Monto · Tipo contratación · 4 flags boolean · Último estado conocido.
    - **Modal-only / no inline:** `carpeta_documentacion` (icono carpeta → `ContratacionDriveModal`).
    - **Sort freeze while editing:** si hay `editingRowId`, el orden de la planilla usa valores **comprometidos** (`draftFromRow` / fila persistida), no el borrador. Así editar la columna de sort activo no reordena en vivo; al confirmar (tilde) o cancelar (X/Esc) se vuelve a ordenar con datos committed.
  - **Fix 2026-09-04 — Artista ≠ Nombre:** se deshace el stack en una sola celda; headers **Artista** + **Nombre** restaurados. Nombre RO con clamp 2 líneas.
  - **UX 2026-09-04 — Compact + acciones visibles:** no cortar carpeta/✓/X al borde derecho; flags con labels cortos + tooltips; kebab para secundarias.
- **Finanzas en ficha artista** (`/fimba/edicion/:id/artista/:artistaId`): bloque «Finanzas / contrataciones» con filas de `fimba_contrataciones` donde `id_propuesta` = artista (nombre, monto es-AR RO, **«Último estado» editable** con el mismo `EstadoConocidoInput` de la planilla, nº expediente RO, tipo RO). Por cada contratación: join de **Documentación Drive** (Explorar lazy si hay `carpeta_documentacion`; empty-state + link a planilla si no). Persistencia estado: `updateFimbaContratacion` → `appendFimbaContratacionEstado`. Compartido: `FimbaEstadoConocido.jsx` + `FimbaDocumentacionDrivePreview.jsx`. Vacío → «Sin contrataciones». **Visibilidad estricta:** solo `canSeeContrataciones` (editor_general / OFRN management). **No** consulta / tokens `/c` `/a` `/e`.

- **Datos generales / meta del artista** (ex modal «Editar artista»): componente compartido `FimbaArtistaMetaSection` — **inline** en ficha `FimbaArtistaPage` y **modal** desde Hotelería (`HotelMetaEditModal`).
  - Campos: nombre, color (swatches), cantidad planificada, Extra Equip., helper hotel/comida·transporte, **check-in/out vía picker de eventos** (`FimbaStayEventCell` group) + Early/Late + fechas legacy, toggles `requiere_hotel` / `requiere_comidas`, hotel opcional, observaciones logísticas, **rider** (rich text; solo ficha si `canSeeRider`), estado.
  - Persistencia: `updateFimbaPropuesta` (mismo patch que el alta; `rider` HTML o `null` si vacío).
  - **Autosave + semáforo** (solo `canEditPropuestaMeta`): sin botón «Guardar cambios». Debounce ~500 ms en texto/números/rider; ~80 ms en color, fechas, flags, hotel y estado. Blur en campos de texto hace flush. Estado `idle|dirty|saving|saved|error` con dot FIMBA (`fimba-sync-*`: verde guardado/sincronizado, ámbar pendiente/guardando, rojo error). Draft incompleto (nombre vacío, números a medio tipear) se queda en yellow sin thrash de error; validación dura (rango, fechas cruzadas) y fallos de red → rojo y draft conservado.
  - **Edición:** solo si `canEditPropuestaMeta` (editor_general / OFRN management). **No** editable por consulta, `/fimba/c`, `/fimba/a`, ni **`/fimba/e`** (editores de token siguen con nómina/agenda/rooming acomodo).
  - Sin permiso: sección «Datos del artista» en solo lectura (ficha).
  - **Hotelería:** botón **Editar datos** (lápiz) por tarjeta → portal z-100 con el mismo form (`variant=plain`, sin rider) + bloque **Cupos de habitaciones** (Aplicar cupos → `syncFimbaHabitacionesFromCounts`). Tras autosave meta o aplicar cupos: `refreshRow(propuestaId)` + patch liviano del select de artistas (sin full reload).
  - **Rider en ficha:** visible RO para consulta staff (`canSeeRider`); **oculto** en tokens `/a` `/e` y en token `/c` (`!canSeeRider`). Editor: Quill inline + mismo autosave. Imágenes inline (pegar / file picker / drag) → bucket `fimba-riders` (solo `canEditPropuestaMeta`).
  - **Documentación Drive** en la ficha: se muestra en Finanzas desde contrataciones vinculadas (no campo de meta).
  - Planilla edición: lápiz → `navigate`/`Link` a `/fimba/edicion/:id/artista/:artistaId` (ficha). Modal solo **«Nuevo artista»**. «Modo edición» de celdas en planilla se mantiene para generales.

- **Rider (pestaña edición)** (`/fimba/edicion/:id/rider`): consolida el rider de **todos** los artistas. Acordeón (abierto si hay contenido); vacíos listados para cargar. **Buscar artista…** (input con lupa, debajo del subtítulo): filtra el acordeón por `propuesta.nombre` con `normalizeForSearch` (sin tildes/mayúsculas); vacío = lista completa; PDF/Imprimir sigue usando todos los artistas con contenido. **Vista por defecto:** HTML sanitizado (`sanitizeFimbaRiderHtml` + `.fimba-rider-html`, misma preview que consulta/Agenda); vacío = «Sin rider». **Edición** (`canEditPropuestaMeta`): lápiz `IconEdit` en el header del acordeón abre Quill (`FimbaRichTextEditor`); tilde `IconCheck` («Listo») hace flush del autosave existente y vuelve a preview. Autosave + semáforo por artista (debounce ~500 ms / blur) **solo mientras** el editor está montado — no se inventa otro path. Consulta usuario FIMBA: RO + **Imprimir / PDF** (sin lápiz). Token `/c` y tokens artista: sin pestaña ni ruta (guard + `Navigate`). Editor: react-quill (toolbar ES; skin magenta; **imagen** en toolbar). PDF (`printFimbaRiders` / `window.print`): título «Riders — FIMBA {edición}»; **solo artistas con contenido** (`isFimbaRiderEmpty`: null, whitespace, `<p></p>` / `<br>` sin texto **y** sin `<img>` — una imagen sola cuenta). HTML sanitizado al renderizar/imprimir (`<img>` solo si `src` es el bucket `fimba-riders`). Espera a que las imágenes carguen antes de `window.print`.
#### Imágenes inline en rider (`fimba-riders`)

| | |
|--|--|
| **Bucket** | `fimba-riders` (**público**, `file_size_limit` 8 MB; mime jpeg/png/gif/webp) |
| **Por qué público** | PDF/print y consulta RO necesitan `<img src>` durable. Signed URLs expiran y rompen el PDF. Misma convención que `musician-docs` / `news-content` / `manual-content`. |
| **Path** | `edicion/{id}/propuesta/{id}/{uuid}.{ext}` |
| **URL persistida** | `getPublicUrl` → `https://{proyecto}.supabase.co/storage/v1/object/public/fimba-riders/...` dentro del HTML de `fimba_propuestas.rider` |
| **UX editor** | Solo `canEditPropuestaMeta`: botón imagen (file picker), **pegar** del portapapeles (capture, evita base64 de Quill), **drag&drop** sobre el editor. Mensajes ES. Consulta RO solo renderiza `<img>` existentes. |
| **Compresión** | Canvas cliente: max ancho 1600 px, JPEG 82% (sin deps nuevas). GIF se deja intacto. |
| **RLS Storage** | SELECT/INSERT/UPDATE/DELETE `anon` + `authenticated`; INSERT/UPDATE/DELETE con `name LIKE 'edicion/%/propuesta/%'`. FIMBA `editor_general` usa **anon key** (sin JWT Auth); el gate real es la app (`canEditPropuestaMeta`). No es world-writable sin la anon key del frontend (igual que el resto de FIMBA v1). |
| **Sanitize** | `sanitizeFimbaRiderHtml` deja `<img>` solo si el host es el proyecto y el path es `/storage/v1/object/public\|sign/fimba-riders/`. Strips `data:` / `blob:` / `javascript:` y hosts ajenos. |
| **Vacío** | `normalizeFimbaRiderHtml` → `null` si no hay texto visible **ni** imágenes. |
| **Migración** | `20260813130000_fimba_riders_storage` |

**Limitaciones:** máx. 8 MB (pre-compresión); formatos JPG/PNG/GIF/WebP; GIF no se redimensiona; no hay borrado in-app de objetos huérfanos al quitar el `<img>` del HTML; URLs públicas (cualquiera con el link ve la imagen); no signed-URL refresh (no hace falta).

### Documentación Drive por contratación (`fimba_contrataciones.carpeta_documentacion`)

| | |
|--|--|
| **Columna** | `fimba_contrataciones.carpeta_documentacion` `text` nullable (source of truth) |
| **Qué guarda** | URL de carpeta Drive y/o ID; al persistir se normaliza a `https://drive.google.com/drive/folders/{id}` si hay ID extraíble (`[-\w]{25,}`) |
| **Producto** | Drive vive en el **expediente/contratación**, no en la propuesta/artista. Un artista puede tener 0–N carpetas (join de sus contrataciones). |
| **UI edit** | Planilla **Contrataciones** → botón **carpeta** por fila → modal portal `document.body` z-100: input URL/ID + Guardar (autosave on blur) + semáforo + **Explorar** / **Abrir en Drive** + preview list (**`autoExplore`**: lista al abrir el modal si hay URL) |
| **UI artista** | Ficha → **Finanzas / contrataciones** (`canSeeContrataciones`): por cada contrato, preview RO del join o empty-state con link a planilla. **No** editar URL en ficha meta. Explorar **lazy** (sin `autoExplore`) |
| **Preview** | Compartido `src/views/Fimba/FimbaDocumentacionDrivePreview.jsx`. Prop `autoExplore` (default false): modal Contrataciones lista al montar; ficha Artista lazy hasta Explorar. Prefetch post-list: depth **2**, concurrency **4**, max **40**. Cero API al montar la planilla. Con `canUpload`, drop de archivos OS sobre listado/vacío → sube a la carpeta del breadcrumb |
| **Subida (+) / drag&drop / renombrar** | En modal Contrataciones: staff planilla (`canSeeContrataciones`). En ficha artista: `canUpload` = `canEditPropuestaMeta`. Viewers no renombran ni tienen drop. Destino = **carpeta del breadcrumb** (panel Explorar abierto). Sigue requiriendo share **editor** de la cuenta Archivo |
| **Helpers** | `listFimbaDriveFolderFiles` / `downloadFimbaDriveFile` / `uploadFimbaDriveFile` / `renameFimbaDriveFile` / `normalizeCarpetaDocumentacion` en `fimbaService.js`; CRUD select/update de `carpeta_documentacion` en contrataciones |
| **Migración de datos** | `20260811160000`: para cada propuesta con carpeta, se copia a la **primera** contratación del mismo `id_propuesta` (`orden ASC, id ASC`) **solo si** esa fila aún no tiene carpeta. Multi-contrato: **solo la 1.ª** recibe el valor. Luego **DROP** de `fimba_propuestas.carpeta_documentacion` |
| **Legacy** | Columna en propuestas de `20260811150000` eliminada en `20260811160000` (app ya no la selecciona/escribe) |

**Limitaciones (producto / ops) — sin cambios de stack Drive:**

1. **Compartir:** carpeta accesible por cuenta Archivo (`G_DRIVE_ACCOUNT_EMAIL`); “cualquiera con el enlace” no basta. Escritura (subir/renombrar) exige rol **editor** para esa cuenta.
2. **Secrets:** `G_CLIENT_*` / `G_REFRESH_TOKEN`; sin ellos listado/descarga/subida/renombrar fallan; Abrir en Drive sigue ok en browser.
3. **Descarga:** token temporal + `alt=media` / export; no carpetas; nativos no exportados → error.
4. **Subida:** tope cliente ~4 MB; sin delete in-app. **Drag&drop desde el Explorador** (Windows Explorer / Finder) sobre el listado o empty-state del preview: overlay magenta «Soltá para subir a esta carpeta»; varios archivos en paralelo acotado (2); errores por archivo; mismo refresh/cache que +. **No** sube árboles de carpetas (el navegador no entrega el tree de forma fiable; se omiten DirectoryEntry). Viewers (`!canUpload`) ignoran el drop. Mientras hay rename inline, no se captura el drop. Requiere panel abierto (Explorar / autoExplore) y carpeta actual del breadcrumb.
5. **Renombrar:** `renameFimbaDriveFile` (token + PATCH metadata `name`); archivos y carpetas; Docs/Sheets nativos solo cambian título Drive. Enter/blur confirma, Escape cancela; lápiz o doble clic en nombre. Sin acción nueva en `manage-drive` (reusa `get_temp_token`).
6. **Profundidad:** ~100 ítems por listado.
7. **Prefetch:** BFS depth 2 / conc 4 / max 40 solo tras Explorar exitoso.
8. **Iframe:** no se usa.
9. **Edge:** reutiliza `list_folder_files`, `get_temp_token`, `upload_file` (sin redeploy manage-drive en este slice).

Migraciones: `20260811150000` (histórica en propuestas) + `20260811160000_fimba_contrataciones_carpeta_documentacion` (**Local = Remote**).

## Decisiones cerradas (este slice)

- [x] Tablas `fimba_*` en `public` (no schema aparte)
- [x] `fimba_ediciones.id_gira` UNIQUE → un festival por programa
- [x] Propuestas = Artista en UI; tokens genéricos UUID únicos
- [x] Documento único por propuesta (índice) y por edición (trigger) si documento no vacío y activo
- [x] `cantidad_planificada` 1–200; `plazas_extra_materiales` ≥ 0 default 0
- [x] `eventos.audiencia_ofrn` + backfill: con `eventos_grupos` → `grupos`, si no → `tutti`
- [x] Staff gate = `isManagement` (documentado; no solo admin)
- [x] Usuarios FIMBA por edición (`fimba_usuarios` + `/fimba/login` + guard dual OFRN/FIMBA)
- [x] Rutas token fuera del shell OFRN; staff con guard + brand FIMBA
- [x] Modales vía `createPortal(..., document.body)`, `z-index` 100
- [x] Iconos solo de `src/components/ui/Icons.jsx`
- [x] Migración `20260810170000_fimba_plataforma_base` creada y deploy a linked
- [x] Vehículos FIMBA = `giras_transportes` de la gira (sin master FIMBA); catálogo = `transportes`
- [x] Trayectos FIMBA = `eventos` con `id_gira` de la edición, `audiencia_ofrn = 'none'`, tipo traslado (`id_tipo_evento = 11`)
- [x] Multi-vehículo + plazas en `fimba_evento_transportes`; **SIN SERVICIO** = cero filas de vehículo
- [x] Create/edit trayecto: flota Cap/OFRN/FIMBA/Libres/**Reserva técnica**; sin auto-fill tope→plazas; avisos ámbar sin Sube; hard-block asientos + libres (no vs tope artista)
- [x] Tags artista en `eventos_fimba_propuestas`; **Asientos Equipaje** en `eventos.asientos_equipaje` (+ sync legacy `audiencia`); obs. en `observaciones_equipaje`; pasajeros = **Sube** `fimba_propuesta_rutas` (+ residual reserva técnica)
- [x] Agenda columna «As. Equipaje» = a bordo al salir (`resolveEventAboardCount`); `plazas=0` no inventa headcount; banner modal `(cap N)`; **no** auto-default plazas desde tope
- [x] **Modelo plazas vs Sube (2026-08-31):** Sube = headcount artista; plazas = reserva técnica anónima. Script `supabase/scripts/fimba_plazas_to_sube_gira12.sql` aplicado linked (Case A 30 + OK_ZERO 1 + SKIP_NON_TRANSPORT 3; manual: evento 3911 sin tag). Verify 3910 = Ruggiero ×4, plazas=0.
- [x] **Unificación Viento Sur (2026-09-01):** merge `giras_grupos` Atlas (OFRN) id=4 → Viento Sur id=5; eliminada `fimba_propuestas` duplicada id=19; 5 eventos (3986,4082,4228–4230) pasan a `eventos_grupos` + `audiencia_ofrn=grupos`. Script `supabase/scripts/merge_viento_sur_ofrn_fimba_gira12.sql` aplicado linked.
- [x] **Observaciones internas** (`eventos.observaciones_internas` HTML + bucket `eventos-internas`): `FimbaEventoFormModal` si `canEditPropuestaMeta`; OFRN `EventForm` si `canEditEventObservacionesInternas` (editores/técnicos/gestión sin consulta); migración `20260826140000` Local = Remote
- [x] Equipaje también en `fimba_propuesta_rutas` (CRUD en StopRules / tabla Tag·Sube·Baja); **Bajar todo**; editor transporte = tabla Tag|Sube|Baja (no cloud + StopRules embebido)
- [x] OFRN bajada desde FIMBA: cierra rides abiertos (UPDATE); logistics usa `id_evento_*`; Categoria vía `target_ids`; **Bajar todo** / lista a bordo Orquesta (`alightAllOfrnAboardAtStop`)
- [x] Migración `20260825084834_fimba_equipaje_asientos_obs` Local = Remote (deploy linked)
- [x] Capacidad en UI: por unidad rolling en tránsito (OFRN subida/bajada + plaza_extra + plazas FIMBA) vs `capacidad_maxima`; overbook y libres; locación en planilla
- [x] UI distingue **Vehículos** vs **Trayectos**; alta/edición de vehículo embebida (`addFimbaVehiculo` / `updateFimbaVehiculo`)
- [x] Agenda unificada (multi-tipo actividad) + filtro artista
- [x] Planilla muestra orquesta OFRN (tutti/grupos) + badges origen + filtro Todos/FIMBA/OFRN (**default Solo FIMBA**) + categoría (dropdown multi). **Tutti** en Grupos OFRN (off por defecto); orquesta se carga al marcar Tutti o un grupo
- [x] Trayectos/Transportes: merge paradas OFRN (tipo transporte / `id_gira_transporte`) + filtro origen default **Todos** + chips vehículo (cuerpo exclusivo; +/− multi-select)
- [x] Audiencia OFRN: None | Tutti | multi-select `giras_grupos` → `eventos_grupos`
- [x] Tipos de evento desde catálogo OFRN (`tipos_evento`); sin presets hardcodeados FIMBA
- [x] Detección transporte alineada a categoría 6 + ids OFRN (11/12/28/31/35)
- [x] Hotelería: reporte por artista (checkin/out, early/late, noches, nominados, por confirmar) + hotel opcional (`fimba_propuestas.id_hotel`)
- [x] Estadía por persona: `fimba_participantes.id_evento_checkin|checkout` (+ espejo fechas; NULL = hereda artista). Planilla + token `/e`; pedido hotel parte grupos; comidas/pax-noche por estadía efectiva.
- [x] Check-in/out → eventos (paridad OFRN): FKs `id_evento_checkin|checkout` en propuestas/participantes; tipos 22/23 @ 14:00/10:00; backfill edición 1/gira 12; `ensureFimbaStayEvent` al guardar fechas legacy de artista.
- [x] Locación check-in/out ← hotel del artista (`syncFimbaStayEventsLocacionFromHotel`; UI sin picker libre; fork si evento compartido con otro hotel); backfill edición 1 (`fimba_sync_stay_event_locacion_from_hotel_edicion1.sql`, linked 2026-09-04).
- [x] Override UX integrantes: picker **vincular evento existente** / **crear nuevo** (`FimbaStayEventCell` `variant=override`, paridad EventCellEditor); chip Agenda con fecha·hora·detalle/locación; «Usar grupo» limpia FK; normaliza mismo evento del grupo → hereda; agenda lista eventos vía FK estadía.
- [x] UX artista (grupo): mismo picker en Datos generales (`variant=group`); Desvincular; fechas sola = caja **legacy**; Early/Late conservados; Hotelería/planilla RO muestran `formatStayEventLabel`.
- [x] Migración `20260828034520_fimba_participantes_stay` deploy linked
- [x] Rooming por artista: `fimba_propuestas_habitaciones` + `fimba_habitaciones_ocupantes` (SGL/DBL/TPL/QAD + matrimonial); inventario admin + acomodo token
- [x] Cupos rooming: feedback live de plazas borrador vs roster activo (faltan / exacto / sobran) antes de «Aplicar cupos»
- [x] Migración `20260811140000_fimba_habitaciones` deploy linked
- [x] Migración `20260810180000_fimba_propuestas_id_hotel` deploy linked
- [x] Migración `20260810190000_fimba_propuestas_checkin_early_checkout_late` deploy linked
- [x] Migración `20260811090000_fimba_propuestas_observaciones_logisticas` deploy linked
- [x] Lista artistas (`/fimba/edicion/:id`): IN/OUT + Early/Late visibles; modo planilla con autosave + semáforo (patrón MealsManager / GiraForm)
- [x] `observaciones_logisticas` por artista: planilla + ficha (sección datos/meta; **no** editable por token `/e`) + export TSV hotelería
- [x] Meta artista (color, cupos, hotel, fechas, estado, obs., rider): `FimbaArtistaMetaSection` en ficha + modal **Editar datos** en Hotelería (`canEditPropuestaMeta`); lápiz planilla → ficha; modal alta solo en planilla
- [x] Rider por artista (`fimba_propuestas.rider` HTML) + pestaña `/rider` + PDF solo con contenido (`20260813120000`)
- [x] Rider imágenes inline: bucket `fimba-riders` (público) + paste/picker/drop + PDF espera load (`20260813130000`)
- [x] Drive docs en **contrataciones** (`carpeta_documentacion`); ficha artista muestra join multi-contrato; componente `FimbaDocumentacionDrivePreview`
- [x] Drive docs: renombrar archivo/carpeta in-app (`renameFimbaDriveFile` + lápiz/doble clic; gate `canUpload`; sin redeploy edge)
- [x] Explorar on-demand + prefetch subcarpetas (depth 2 / conc 4 / max 40) + copiar/descargar/upload (+ `canEditPropuestaMeta`)
- [x] Drive docs: drag&drop de archivos OS al preview (carpeta breadcrumb; overlay FIMBA; tope 4 MB; sin árboles de carpetas)
- [x] Migración `20260811150000` (propuestas, histórica) + `20260811160000` (contrataciones + copy 1.ª fila + deprecate propuestas col) deploy linked
- [x] Display vehículo FIMBA = catálogo (`transportes.nombre`) + patente; `detalle` = nota OFRN secundaria; trayecto = cada evento de la planilla
- [x] En tránsito / boarding: helper `fimbaTransportBoarding.js` + `loadFimbaTransportLogisticsSummary` (equivalencia hoja de ruta OFRN)
- [x] Boarding unificado por vehículo: OFRN+FIMBA misma secuencia/Δ/a bordo; sintético solo tipo transporte; Concierto sin ↑/↓ no entra; `scripts/verify-fimba-boarding-delta.mjs`
- [x] Auditoría ↑/↓ fuera de trayecto (Transportes): banner + badge chip par; FIMBA+OFRN; `listOffTrayectoRideEndpoints`; **Corregir** → StopRules; **Quitar** FIMBA en banner
- [x] `fimba_propuesta_rutas` + UI Subidas/Bajadas (`FimbaStopRulesManager`: plazas artista + StopRules OFRN)
- [x] Bajada FIMBA libera plazas: dropdown a bordo / cierra ride (`id_evento_bajada`); tope **en la parada** = rides presentes (`isFimbaRideAboardAtStop`); un ride abierto posterior no bloquea Sube; **2026-09-04** adelantar bajada + merge endpoints Concierto fuera de planilla
- [x] Hora fin del tramo = hora com del next **asignado** a la unidad (no `hora_fin` huérfana ni endpoint de otro vehículo); Reserva del evento solo si `plazas>0`
- [x] Labels planilla Transportes: `Orquesta {en_lugar}` + `{nombre} {n}` desde `isPresentAtStop` (no roster estático por fila)
- [x] Transportes **Modo edición** + semáforo (planilla trayectos + flota); `patchFimbaEventoPlanilla` sin tocar boarding/↑↓
- [x] `fimba_contrataciones` + planilla staff `/fimba/edicion/:id/contrataciones` (row-edit + semáforo; migración `20260811110000`)
- [x] Planilla Contrataciones: columnas compactas expediente / tipo / 4 checks (th+td; headers abreviados + title); scroll `.fimba-ctr-scroll`; acciones sticky-right; kebab secundarias; textarea Nombre capped; tabla min-width ~960px; **sin** fecha límite resol. (columna dropped)
- [x] Feature 2026-09-04 — Contrataciones row-edit como Agenda/Transportes: doble clic → borrador; tilde confirma; X/Esc descarta; sin autosave blur; Drive modal intacto; Actualizar/`flushDirty` OK
- [x] Fix 2026-09-04 — Contrataciones: columnas **Artista** + **Nombre** separadas (no stack); Nombre RO line-clamp 2 + `title`; edit = textarea compacta; Sheet mapping D intacto (`nombre` ∥ propuesta)
- [x] UX 2026-09-04 — Contrataciones compact: no cortar botones (sticky-right + kebab historial/eliminar; flags Firma/Firmada/Doc./ADM)
- [x] Fix 2026-09-04 — Contrataciones: con fila en edición, sort usa datos committed (no draft) para no reordenar hasta tilde/cancel
- [x] «Último estado conocido»: presets color UI (Factura presentada/emitida/pedida, Pagado) + texto libre; log append-only `fimba_contrataciones_estado_log` (`20260811130000`); historial modal con fecha + autor
- [x] Backup GSheet Contrataciones: Edge `sync-fimba-contrataciones-sheet` + cron diario + botón Actualizar + contador cambios + leave guard (`20260831170559`); dual-write primary+mirror vía `FIMBA_CONTRATACIONES_SHEET_IDS`
- [x] Fix 2026-09-04 — checkboxes G–J en Sheet (v3): Table1 quedaba en `endRowIndex=26`; `updateTable` expand fallaba por bandedRanges huérfanos («No se pueden añadir colores de fondo alternos…»). Sync ahora: `deleteBanding` + clear bg en zona de expansión → `updateTable` range hasta última fila + `columnType: BOOLEAN` en G–J. `setDataValidation` solo fallback en filas **fuera** de la Table (typed cols rechazan validation, incl. TEXT). Deployed v16 `muxrbuivopnawnxlcjxq`; verificado `tableCheckboxExpanded=true` + `checkboxValidationMode=full` en primary+mirror.

---

## Checklist de entrega (v1)

### Datos / deploy

- [x] Spec `docs/specs/fimba-plataforma.md`
- [x] Migración `supabase/migrations/20260810170000_fimba_plataforma_base.sql`
- [x] Migración `supabase/migrations/20260810180000_fimba_propuestas_id_hotel.sql`
- [x] Migración `20260810190000_fimba_propuestas_checkin_early_checkout_late.sql`
- [x] Migración `20260811090000_fimba_propuestas_observaciones_logisticas.sql` + deploy linked
- [x] Migración `20260811150000_fimba_propuestas_carpeta_documentacion.sql` + deploy linked
- [x] Migración `20260811160000_fimba_contrataciones_carpeta_documentacion.sql` + deploy linked
- [x] Migración `20260810210000_fimba_usuarios.sql` + deploy linked
- [x] Migración `20260811120000_fimba_ediciones_token_consulta.sql` (`token_consulta` en ediciones) + deploy linked
- [x] Deploy a proyecto linked + verificación `migration list`
- [x] Migración `20260813120000_fimba_propuestas_rider.sql` + `20260813130000_fimba_riders_storage.sql` + deploy linked
- [x] Servicio `src/services/fimbaService.js` (edición, propuestas, participantes, capacidad, agenda, hotel; `checkin_early` / `checkout_late`; `observaciones_logisticas`; usuarios FIMBA)
- [x] Login / sesión FIMBA: `FimbaLoginPage` + `fimbaUserSession` + guard dual
- [x] Servicio transporte: vehículos (`listFimbaFlota` / `addFimbaVehiculo` / `updateFimbaVehiculo`), CRUD trayectos, asignaciones, métricas de ventana

### UI staff

- [x] Rutas `/fimba/*` en `App.jsx` / `FimbaStaffApp`
- [x] Link sidebar «FIMBA» (solo management)
- [x] Home: listar / crear edición (elige `id_gira`)
- [x] Edición: CRUD artistas + nav sticky header Artistas | Agenda | Transportes | Hotelería | Rider | Contrataciones | Usuarios (`FimbaSectionToggle`; siempre edición-root, sin `/artista`)
- [x] Planilla / listas de artistas **alfabéticas** por `nombre` (`es`, `sensitivity: "base"` → id): `listFimbaPropuestas` + `sortFimbaPropuestasByNombre` (`fimbaAgendaSort`). Aplica Artistas, Hotelería (cards + filtro), Rider, Contrataciones (select), Transportes (filtro), pickers de evento/boarding. Columna `orden` de propuesta **no** define el display (sin drag-reorder de artistas). Agenda filtro artista ya estaba alineado.
- [x] **Buscar Artistas o Integrantes** (Artistas planilla + Hotelería): input debounced ~180ms; match sin tildes (`normalizeForSearch` / tokens AND) sobre `propuesta.nombre` y nómina (`apellido`/`nombre` de `fimba_participantes`; join OFRN si viniera embebido). Hotelería filtra cards con `personas` ya batcheadas; Artistas indexa con un `listFimbaParticipantesForPropuestas` al cargar (sin N+1 por tecla) y compone AND con filtros existentes (select Artista en Hotelería). Vacío = lista alfabética completa.
- [x] Usuarios staff: listado/alta/edición `fimba_usuarios` en `/fimba/edicion/:id/usuarios` (`FimbaUsuariosPage`)
- [x] Enlace consulta general edición: `fimba_ediciones.token_consulta` + `/fimba/c/:token` + sección en Usuarios (copiar/regenerar); shell RO sin Usuarios/Contrataciones
- [x] Rol `consulta` (login) entra al shell en read-only (mismo recorte de secciones; **sí** ve Rider RO + PDF)
- [x] Pestaña **Rider** `/fimba/edicion/:id/rider`: consolida riders; búsqueda por nombre (`normalizeForSearch`); **preview sanitizado + lápiz → Quill** (autosave existente); PDF `printFimbaRiders`; imágenes inline (`fimba-riders`); oculta en token `/c`- [x] Contrataciones staff: planilla `fimba_contrataciones` en `/fimba/edicion/:id/contrataciones` (row-edit + semáforo; artista opcional + nombre libre; estado presets + historial)
- [x] Ficha artista: finanzas/contrataciones form (solo `canSeeContrataciones` = editor_general / OFRN; oculto a consulta y tokens); «Último estado» editable con `EstadoConocidoInput` compartido + `updateFimbaContratacion`/estado log
- [x] Migración `20260811130000_fimba_contrataciones_estado_log` + deploy linked
- [x] Edición planilla: columnas check-in/out (+ Early/Late) + hotel; **Modo edición** (celdas inline) + **semáforo** por fila (verde guardado / amarillo pendiente·guardando / rojo error)
- [x] Planilla artistas: sin columnas **Color** / **Estado** (dot de color junto al nombre; color/estado en ficha artista con `canEditPropuestaMeta`)
- [x] Planilla artistas: lápiz → `/fimba/edicion/:id/artista/:artistaId` (ficha general); modal solo **Nuevo artista**
- [x] Ficha artista: sección **Datos generales** (meta/logística + rider rich-text + carpeta documentación Drive con preview) editable solo `canEditPropuestaMeta` con **autosave + semáforo** (sin botón Guardar); RO para consulta staff; rider **oculto** en tokens `/a` `/e` `/c`; nómina/agenda/rooming independientes
- [x] Documentación Drive en contrataciones: modal planilla + preview ficha artista (join multi-contrato) + Explorar lazy + copiar/descargar/subir + drag&drop OS
- [x] Edición: filas de artista **expandibles** (chevron); nómina lazy `listFimbaParticipantes`; subheader nominados/planificada; nested table read-only con col **Género** (también en modo planilla). Keys de expand normalizados (`propuestaKey`); estado como object (no `Set`); load fuera del setState; soft-reload no desmonta la planilla; errores de nómina visibles + Reintentar
- [x] Detalle artista: participantes + `genero` + tipo_alimentacion (+ nota «Otros…»); deep links opcionales `/artista/:id/{agenda|transportes|hoteleria}` (toggle superior → secciones edición-root sin `/artista`)
- [x] Detalle artista / token edición: **planilla Excel de participantes** (`FimbaArtistaPage` → `ParticipantesPlanilla`): celdas apellido, nombre, documento, **genero**, **check-in / check-out** (`FimbaStayEventCell`: vincular evento 22/23 o crear; vacío/Usar grupo = hereda artista), alimentación (select presets + **Otros...** → `nota_alimentacion`), activo; semáforo por fila; Enter o blur guarda; Tab navega; fila inferior = alta `createFimbaParticipante`; delete por fila; consulta token read-only
- [x] Alimentación: CHECK en `fimba_participantes.tipo_alimentacion` (regular/vegetariano/vegano/celiaco/sin_tacc/otro); free text en **`nota_alimentacion`** (sin migración); UI `AlimentacionInput` (select + input **siempre en fila** al elegir Otros…; `flex-wrap: nowrap` + `width:auto !important` / estilos inline p/ vencer `.fimba-cell-input{width:100%}`; `FimbaAlimentacionStyles` montado en `ParticipantesPlanilla`, no solo en finanzas). **Detalle comidas / Excel / PDF / texto:** solo excepciones (≠ `regular`) + fechas check-in→check-out **efectivas de la persona**.
- [x] Regenerar / copiar tokens consulta y edición
- [x] Editor transportes: panel **Vehículos** (alta + editar lápiz: catálogo, detalle, plazas, categoría; nombre catálogo+patente, detalle OFRN sec.) + planilla **Trayectos** (= eventos FIMBA + paradas OFRN; filtros origen/vehículo)
- [x] Agenda unificada planilla (fecha, horas, tipo, actividad, origen / destino calculado / vuelo, vehículos, PAX, tags)
- [x] Planilla agenda: badges FIMBA/OFRN + convocatoria + filtro origen (default **Solo FIMBA**) + banner filtros activos + multi-select **categoría**, **locación**, **artista** y **grupos OFRN** (incluye **Tutti** off) + búsqueda debounced (tipo/actividad/lugar/personas/vehículos)
- [x] Categoría **Catering** (`20260901140559_catering_categoria_tipo`): catálogo + tipo. Filtros de agenda/modal leen **`categorias_tipos_eventos`** (`listTiposEventoForFimba` + `mergeFimbaAgendaCategories`): alta en Datos impacta sin code. No es Comidas/id 4.
- [x] Agenda OFRN (`UnifiedAgenda`): toggle staff **con FIMBA** (default OFF); músicos siempre ocultan solo-FIMBA
- [x] Agenda **consulta Backline / Rider** (editores/admins): íconos de fila + modales RO card en `FimbaAgendaPage` + `UnifiedAgenda`
- [x] Agenda **Descargar PDF**: reusa UnifiedAgenda (`exportAgendaToPDF`) vía `fimbaAgendaPdf.js`; toolbar planilla + agenda artista/consulta; vista filtrada
- [x] Agenda **móvil cards** (&lt;768px): `FimbaAgendaEventCard` compartida en `FimbaAgendaPage` + `FimbaConsultaAgenda`; planilla desktop intacta; day dividers + kebab z-110
- [x] UX 2026-09-04 — Agenda Detalle: columna más ancha + clamp; Quill en row-edit/modal; acciones planilla en kebab ⋮ (`FimbaAgendaCardMenu`)
- [x] Planilla agenda **orden contractual**: fecha → hora_inicio → detalle/actividad (`localeCompare` es, `sensitivity: "base"`) → tipo → id. Se **reaplica tras cada filtro** (origen/categoría/locación/búsqueda); limpiar filtros no deja orden residual. Tags de artistas en fila y select Artista: alfabético ES. Merge de bloques Traslado (rides) usa el mismo comparador (no solo fecha+hora).
- [x] Hotelería reporte + edición checkin/out/early/late/hotel + export TSV (cols Early/Late) + cupos habitaciones + rooming resumen
- [x] Hotelería: carga batch (participantes + habitaciones), refresh por artista post-edición sin full reload
- [x] Transportes: carga deduplicada (cache edicion/propuestas/flota; sin hotelería completa); spinner solo 1ª carga; soft refresh por slice (rutas / eventos / logistics OFRN) tras ↑↓, reserva, evento, destino
- [x] Transportes perf (save/load): Sube/Baja inline = upsert + patch local + debounce refresh rutas (sin 2× list + await planilla); Guardar evento = pre-checks paralelos + tags/veh/grupos en paralelo + `clientValidated` (sin re-fetch logistics); post-Guardar solo slice `eventos`
- [x] Hotelería: exports por artista en cada tarjeta (Pedido hotel hub + Rooming PDF + Excel rooming/hotelería; cabecera edición intacta)
- [x] Hotelería: **Editar datos** por tarjeta = `FimbaArtistaMetaSection` (autosave) + cupos; `refreshRow` post-save; gate `canEditPropuestaMeta`
- [x] Ficha artista + token edición: panel **Hotelería / rooming** (`FimbaRoomingPanel`); consulta token RO
- [x] **Venues** `/fimba/edicion/:id/venues`: acordeones anidados (venue → Información / Espectáculos; colapsados al cargar), badge con rango de fechas, indent del cuerpo; metadata operativa (`fimba_venue_info`), stage plot; consulta RO + Ver escenario. Redirect legacy `/espacios` → `/venues`.
- [x] **Observaciones aforo** (`eventos.observaciones_aforo`): por concierto; inline en Venues + `FimbaEventoFormModal` + `EventForm` OFRN; migración `20260831123130` Local = Remote
- [x] **Backline** `/fimba/edicion/:id/backline`: planilla = conciertos **siempre** + ensayos `backline_incluido`; columna **Estado** (`backline_estado`); import sheet 2026. Migraciones `20260902164456` + `20260902182459` + `20260902182918` Local = Remote
- [x] **Imprimir / PDF** en header FIMBA (`window.print` + `@media print` en `FimbaLayout`); orientación = diálogo del navegador (sin `@page size`); Escenario con nota (canvas)
- [x] **Modo nocturno (2026-09-04):** toggle sol/luna en header FIMBA = preferencia global OFRN (`theme_mode` / `html.dark` / invert); swatches re-invertidos; print sin filtro

### UI tokens

- [x] `/fimba/a/:token` solo lectura (tabla participantes con **Género**, sin planilla)
- [x] `/fimba/e/:token` edición externa = planilla de participantes + **agenda editable** + **rooming (acomodo)**
- [x] `/fimba/c/:token` consulta general edición = shell staff read-only (Artistas/Agenda/Transportes/Hotelería; no Usuarios/Contrataciones/**Rider**)
- [x] Consulta token: **agenda de read-only** del artista (`listFimbaAgenda(edicion, { id_propuesta })` → tags `eventos_fimba_propuestas` **+** bloques traslado suben→bajan desde `fimba_propuesta_rutas`; sin merge pure-OFRN como staff al filtrar artista)
- [x] Consulta artista `/fimba/a`: rooming read-only (`FimbaRoomingPanel`)
- [x] Consulta: columnas planilla lean — fecha, horas, tipo, actividad, origen / destino calculado / vuelo, vehículo(s) si transporte, # PAX; sin create/edit/delete ni filtros origen/categoría
- [x] Consulta: datos básicos artista — check-in/out (+ Early/Late), planificada, hotel si hay; skin FIMBA; errores de carga de agenda en banner
- [x] Detalle artista staff + token edición: sección **Agenda** editable (`FimbaConsultaAgenda` `editable`) — listado tags propuesta, **Nuevo evento** / editar / eliminar vía `FimbaEventoFormModal` con `lockPropuesta` (tag obligatorio a ese artista); refresh tras save/delete; consulta `/fimba/a` sin cambios (RO)
- [x] Agenda artista: bloques **Traslado** calculados (board→alight / plazas > 0) mergeados cronológicamente; RO aunque el resto de la agenda sea editable; planilla staff con filtro artista igual
- [x] Agenda planilla: multi-filtro artistas + grupos OFRN + **Tutti** opt-in + query params compartibles (`fimbaAgendaUrlParams`, `tutti=1`) + **Copiar enlace de consulta** (staff) + carga `listFimbaAgenda({ include_ofrn })` solo con Tutti/grupo o chip Todos/OFRN
- [x] **Tutti en Grupos OFRN (2026-09-02):** opción Tutti off por defecto; planilla default Solo FIMBA; filtro artista ya no fuerza origen Todos ni incluye convocatoria orquesta; marcar Tutti o un grupo carga `include_ofrn` (unión con agenda FIMBA)
- [x] **Filtro artista Agenda (2026-09-02):** ride abierto ya no hace match de eventos fuera de la secuencia del vehículo (`isFimbaRideAboardAtStop`); contador banner = `filtrados de base cargada`
- [x] Enlace público `/fimba/c/:token/agenda`: sesión `agenda_only` + lockdown nav/rutas (solo agenda RO; redirect fuera de `/agenda`)
- [x] **Token único por consulta de agenda (2026-09-02):** `fimba_agenda_consultas` (UUID + filtros congelados); Copiar enlace no usa el token de edición ni query string; UX consulta sin filtros editables; `retainSelectedFilterIds` no borra `?propuestas=` antes de cargar el catálogo

### Stub / deferred

- [x] Tabla `fimba_evento_transportes` en SQL
- [x] Helper métricas FIMBA por ventana (`listVehiclesAvailability` batch / `computeFimbaVehicleWindowMetrics` / `sumFimbaPlazasInWindow`) — libres = cap − OFRN − FIMBA (rides)
- [x] Helper boarding rolling `fimbaTransportBoarding` + carga logística OFRN (`loadFimbaTransportLogisticsSummary`)
- [x] Planilla Transportes: columna **Destino** (next **asignado** al vehículo) + **Hora fin** derivada de `next.hora_inicio` (cian itálico; — si no hay)
- [x] Modal transporte: **Destino** bajo **Hora Fin**; «Elegir destino…» → `FimbaDestinoStopModal` (hora_fin → nueva hora_inicio; locación → id_locacion; stripDestino)
- [x] Planilla Transportes: **+** entre Locación y Destino → create modal evento intermedio (gap-fill hasta→desde; mismo vehículo; `audiencia_ofrn=none`)
- [x] Agenda planilla: **+** en acciones de fila → create modal evento intermedio (gap-fill vs next mismo día; sin vehículo)
- [x] UI de asignación multi-vehículo por evento (trayectos): tabla flota Cap/OFRN/FIMBA/Libres/**Reserva técnica** + avisos sin Sube + hard-block asientos/libres (reserva ≠ tope artista)
- [x] Agenda grilla FIMBA (planilla multi-tipo)
- [x] Reportes hotel (lista + cupos; sin rooming graph)
- [x] Paridad reportes OFRN→FIMBA: pedido/texto/detalle/rooming (print+Excel); **detalle con IN/OUT por persona**; **rooming Excel 2 hojas** (habitación + plazas) + texto para Word; comidas (texto/PDF/Excel + **cubiertos por día** check-in/out general/artista; sin asistencia por-evento); CNRT + paradas + hoja de ruta (PDF/Excel) por vehículo
- [x] Hotelería: matriz noches/comidas (`fimbaMealsStay`) — desayuno/almuerzo/cena por día; Early/Late; PAX planificada; desglose régimen opcional
- [x] Toggles por artista `requiere_hotel` / `requiere_comidas` (default true): planilla Artistas, ficha, modal Hotelería; exclusiones en totales/exportaciones hotel y comidas
- [x] Alta/edición de vehículo embebida en FIMBA (`giras_transportes` / catálogo `transportes` en alta; update alineado a OFRN)
- [x] Helper real de disponibilidad vs cupos OFRN (en tránsito rolling en planilla Transportes; roster + plaza_extra; FIMBA plazas)
- [x] UI `audiencia_ofrn` multi-grupos en modal FIMBA (+ planilla orquesta); EventForm OFRN / tags artistas en eventos OFRN genéricos aún parcial
- [ ] Import CSV participantes (UI). **Datos 1ª ed. (2026-08-24):** CPN 104 pax + rooming; PDF aéreos (Cecilia, Ruggiero, Atlas, Guillo + altas Chango/Hamilton/Marley); PDF dietas CPN (12 regímenes); pendientes en `docs/fimba-pendientes-carga-2026-08-24.md`
- [x] Token consulta: vista rooming (RO con `FimbaRoomingPanel`)
- [x] Token edición: agenda editable del artista (create/edit/delete + tag fijo; no planilla unificada staff)
- [x] Rooming FIMBA (inventario por tipo + ocupantes; **no** graph estilo Giras completo)
- [ ] Rooming graph / packing automático estilo Giras (deferred)
- [ ] Link deep desde ficha de gira (opcional; hoy: link inverso edición → gira + sidebar)
- [ ] RLS / RPC por token (hardening)

---

## Cómo probar

### Foundation

1. Login OFRN con rol de management.
2. Sidebar → **FIMBA** o ir a `/fimba`.
3. **Nueva edición** → el select debe listar giras recientes sin escribir; la búsqueda por nomenclador/nombre filtra.
4. Crear artistas con cupos; abrir artista → planilla de participantes (Excel): cargar personas en celdas; fila inferior = alta; Enter/blur guarda; semáforo por fila; delete opcional. **Check-in/out por fila** (vacío = fechas del artista, hint gris); un integrante el 15 y el resto el 16 (Daniel Ruggiero cuarteto) debe verse distinto en nómina, Hotelería y pedido hotel.
5. En listado de edición: ver **Check-in / Check-out / Hotel**; badges **Early** / **Late** si aplican; activar **Modo edición** y editar celdas (nombre, planificada, extras, fechas + early/late, hotel, obs.). Semáforo: amarillo al editar, verde al guardar, rojo si falla Supabase/validación. **Lápiz** → ficha artista (color/estado/meta completa).
6. Expandir fila de artista (chevron / nombre): ver nested nómina (nominados/planificada); vacío = «Sin nómina cargada» + link. Multi-expand OK; lazy load por artista.
7. Copiar enlace consulta y abrir en incógnito (`/fimba/a/...`); verificar solo lectura (participantes tabla RO, sin planilla editable).
8. En consulta: ver **Datos del artista** (check-in/out, planificada) + **Agenda** filtrada a ese artista (eventos tagged); sin botones de editar/eliminar eventos.
9. Enlace edición (`/fimba/e/...`): planilla de participantes + **Agenda** + **rooming** (acomodo); **sin** editar meta (color, cupos admin, hotel, estado, obs. log., rider); sin login OFRN. **Sin** campo Rider (logística interna).
10. Staff ficha artista (`/fimba/edicion/:id/artista/:artistaId`): **Datos generales** (meta editable solo editor_general/OFRN, incl. rider rich-text) + agenda + rooming (cupos + acomodo) + enlaces tokens + participantes. **Editor_general / OFRN:** bloque finanzas (contrataciones del artista); consulta ve meta/rider RO; tokens `/a` `/e` y `/c` no ven rider.
11. Edición → **Rider** (`/fimba/edicion/:id/rider`): listar artistas; **vista fija** (HTML sanitizado) + lápiz para editar (generales) o RO (consulta usuario); **Imprimir / PDF** solo incluye artistas con texto o imágenes. Pegar / file picker / drop de imagen (editores, en modo edición) → bucket `fimba-riders`. Token `/c`: pestaña oculta. Desde Agenda (staff editor): ícono `IconFileText` en filas con rider → modal consulta RO.
### Agenda

1. Edición → **Agenda** (`/fimba/edicion/:id/agenda`).
2. Ver planilla mixta: eventos FIMBA + orquesta OFRN (badges origen). Filtrar **Todos / Solo FIMBA / Solo OFRN**.
3. **Nuevo evento**: tipo del catálogo OFRN (filtro categoría opcional), fecha, horas, tag artistas, Asientos Equipaje. Default tipo «Nuevo evento» (16).
4. Tipos Transporte / traslados OFRN abren flota + SIN SERVICIO; otros: sin vehículo salvo «Asignar vehículo(s) al trayecto».
5. **Audiencia OFRN**: Ninguna | Tutti | Grupos (multi-select real de grupos de la gira). Al guardar con Grupos se escriben `eventos_grupos`.
6. Editar un ensayo pure-OFRN desde FIMBA (staff) y agregar tags artista / cambiar audiencia — se guarda sin romper FK de transporte OFRN.
7. Filtrar por artista (oculta pure OFRN; solo tagged). Columna Tipo = nombre/color de `tipos_evento`. Default origen **Todos**; chip «Solo FIMBA» oculta traslados/convocatoria solo-OFRN (p. ej. transporte desde 12/09 si el primer FIMBA es 17/09). Banner «Filtros activos» + **Limpiar filtros**. Dropdown multi-select de **categoría** (tabla `categorias_tipos_eventos`; vacío = todas). Incluye **Catering**.
8. **Multi-filtro + enlace:** en dropdowns **Artista** y **Grupos OFRN**, tildar varios (checkboxes) → URL staff `?propuestas=5,7&grupos=3&origen=all`; **Copiar enlace de consulta** (staff) crea token único `/fimba/c/{uuid}/agenda` y abrir en incógnito → misma vista filtrada, **fija** (sin filtros ni nav Transportes/Hotelería). Enlace legacy con query se congela al abrir.
9. Columna **As. Equipaje**: en filas con transporte muestra personas a bordo al salir (no `asientos_equipaje` del modal); sin transporte → «—». Hover del header explica la métrica.
10. **Íconos consulta Backline / Rider** (solo `canSeeContrataciones`): en columna acciones, junto a editar. Backline si el evento es fila de planilla Backline; Rider si hay rider de artista tagueado. Modales RO en card (sin editar Quill/estado/planta).
11. **Imprimir / PDF** (header): diálogo del sistema; vista previa sin nav/filtros/Descargar PDF; cabecera edición + Agenda + fecha; orientación editable en el diálogo; filas de planilla visibles.
12. **Móvil (&lt;768px):** DevTools device / phone → cards por evento (no planilla); day divider; tap/lápiz abre modal; kebab acciones. Consulta `/fimba/a/…` o `/fimba/c/…/agenda` igual en cards RO.

### Transportes (vehículos ≠ trayectos)

1. FIMBA: **Transportes** (`/fimba/edicion/:id/transportes`).
2. Panel **Vehículos**: lista `giras_transportes`; **Agregar vehículo**; columnas Capacidad / Pico en tránsito / Libres (pico).
3. Alternativa: OFRN Logística → Transporte de la misma gira.
4. Planilla **Trayectos**: filas FIMBA + paradas/traslados OFRN (badges origen). Default origen **Todos**.
5. Chips **Vehículo**: vacío = todos; seleccionar unidad filtra filas y ancla métricas de boarding a esa secuencia. **Pausas** (divisor «Pausa · vehículo libre», blank Destino/Hora fin, «+» / recorrido intermedio) **solo** si hay **exactamente 1** chip activo; Todos / multi → sin pausas.
6. Columnas planilla: **Origen** · **Fecha** · **Com·Fin** · **Actividad** · **Locación** · **+** · **Destino** · **Vehículo** · **Subidas** · **Bajadas** · **Tránsito/cap** · acciones. Sticky izq. Origen/Fecha/Com. Scroll horizontal en wrapper (tabla `max-content`). Chips Subidas/Bajadas (clic → modal; × quita FIMBA; Reserva del evento **solo si residual > 0**). **Hora fin** = hora com del next **asignado** (itálica/cián); **—** si no hay. Alerta **Sobre cupo** si en_transito > capacidad; Tránsito/cap hover = desglose a bordo.
7. Paridad OFRN: músico con `plaza_extra` cuenta 2 plazas; subida/bajada desde reglas de ruta de la gira.
8. **Nuevo trayecto** (y **Editar evento**): flota con **Cap. / OFRN / FIMBA / Libres / Reserva técnica**. Reserva = cupo anónimo (staff/TBD); **no** auto-rellena con tope de artistas. Headcount artistas → tabla **Tag | Sube | Baja**. Avisos ámbar si hay tags sin Sube (o reserva anónima sin Sube). SIN SERVICIO = cero vehículos. Hard-block: reserva ≤ asientos/libres (no vs tope artista).
9. **+** entre Locación y Destino en una fila con vehículo: modal «Parada intermedia» pre-filled (gap-fill hasta→desde vía `defaultGapFillEventSchedule`; mismo bus; plazas 0); al guardar aparece en secuencia y recalcula Destino/Hora fin de vecinos.
10. Agenda: **+** en acciones de fila → create con mismas reglas de horario vs next del día.
11. Modal asignación: `listVehiclesAvailability` → libres = max(0, capacidad − OFRN − FIMBA) (Sube + residual reserva). Excluye FIMBA del evento en edición. Persistencia: N filas `fimba_evento_transportes` (reserva) + reglas `fimba_propuesta_rutas` (Sube).
12. **Tope Sube en parada (2026-09-02):** disp. = plazas a bordo *en este evento*, no Σ rides abiertos de toda la edición. Evento **3910** (15/09 Chevrolet AF599YN, sin horas propias): el 09:50 cian era `hora_inicio` del evento **3867** (Toyota AB808YX, endpoint de otra ruta). Fin del tramo ya no toma endpoints ajenos ni `hora_fin` huérfana. Reserva `plazas=0` no figura como regla activa.
13. **Imprimir / PDF** (header): sin «Programar transporte», filtros de vehículo/origen, columna **+** ni lápices; planilla trayectos; orientación editable en el diálogo.

**Carga (`FimbaTransportPage`):** spinner full-page solo en la **primera** visita. `listFimbaTraslados` / `listFimbaPropuestaRutas` aceptan `edicion` + `propuestas` (+ `flota`) cacheados para no re-fetch. Participantes CNRT = batch liviano (`listFimbaParticipantesForPropuestas`, sin habitaciones) en background. Tras editar: refresh quirúrgico — rutas (↑↓ FIMBA), eventos+rutas (reserva/modal evento), logistics (Orquesta OFRN); la planilla permanece visible.

### Hotelería

1. Edición → **Hotelería** (`/fimba/edicion/:id/hoteleria`).
2. Ver PAX planificados, nominados, por confirmar; expandir personas; badges Early/Late junto a fechas; badges de **inventario** (ej. «3 DBL, 1 SGL») y ocupadas/plazas rooming.
3. **Editar datos** (`canEditPropuestaMeta`): modal portal con `FimbaArtistaMetaSection` (nombre, color, planificada, extra equip., check-in/out vía eventos + Early/Late + legacy fechas, requiere hotel/comidas, hotel, obs. logísticas, estado; autosave + semáforo). Debajo: **cupos por tipo** (Aplicar cupos). Tras guardar meta o cupos, la tarjeta se actualiza con `getFimbaHoteleriaRow` / `refreshRow` (sin recargar toda la edición ni spinner full-page). Consulta / RO: sin botón.
4. Cabecera: **Reportes hotelería** / **Excel rooming** / comidas / Excel hotelería (toda la edición o filtro Artista). **Excel rooming** y la 1ª hoja de **Exportar hotelería** son el rooming discriminado (quién en cada hab. + IN/OUT), no el resumen de cupos/vuelos. Por tarjeta: **Pedido hotel**, Rooming PDF, Excel rooming, Excel hotelería (scope = esa propuesta; OK en readOnly).
5. Hub **Detalle de pasajeros**: columnas Check-in / Check-out por persona + Excel. Hub **Reporte de habitaciones**: tabla con IN/OUT por ocupante, **Excel** (2 hojas) y **Copiar texto** (pegar en Word). Expandir artista: columna Habitación + lista rooming; **Copiar tabla (TSV)** (inventario tipos + obs. log.).
6. Ficha artista o `/fimba/e/:token`: panel **Hotelería / rooming** — staff aplica cupos; editor asigna personas a plazas; matrimonial en multi; consulta `/fimba/a` RO.

**Carga (`listFimbaHoteleria`):** participantes + habitaciones en **batch** (2 queries por edición, no N+1 secuencial). La página deduplica edición/propuestas y muestra spinner solo en la primera carga; cambio de filtro Artista = refresh inline.

### Venues (locaciones de la edición)

1. Edición → **Venues** (`/fimba/edicion/:id/venues`) — pestaña del toggle superior (entre Hotelería y Rider). Legacy `/espacios` redirige aquí.
2. **Scope:** solo conciertos (`eventos.id_tipo_evento = 1`) con `id_locacion` de la gira enlazada (`fimba_ediciones.id_gira`). No es el listado global OFRN de Gestión → Espacios (ese módulo sigue usando **estado de venue**).
3. Agrupado por **locación**: acordeón de venue **colapsado al cargar** (sin auto-expand). Al expandir, cuerpo **indentado** bajo el nombre del venue con dos acordeones anidados independientes — **Información** y **Espectáculos** — ambos cerrados por defecto hasta que el usuario los abra. Badge del header: `n espectáculos {fecha_primero - fecha_último}` (`dd/MM/yyyy`; una sola fecha si coinciden).
4. **Campos por venue** (editable staff no RO; consulta RO):

| Campo UI | Origen DB | Notas |
|----------|-----------|-------|
| Nombre | `locaciones.nombre` | Editable (catálogo compartido) |
| Dirección | `locaciones.direccion` | Editable |
| Localidad | `locaciones` → `localidades` | Solo lectura |
| Aforo | `locaciones.capacidad` | Cantidad de personas; editable (catálogo compartido); no en `fimba_venue_info` |
| Observaciones aforo (espectáculo) | `eventos.observaciones_aforo` | Por concierto; editable inline en tabla de espectáculos; RO en consulta |
| Referente | `fimba_venue_info.referente_nombre` | Por edición + locación |
| Teléfono referente | `fimba_venue_info.referente_telefono` | |
| Rider disponible | `fimba_venue_info.rider_disponible` | Texto libre (sí/no/enlace) |
| Sillas disponibles | `fimba_venue_info.sillas_disponibles` | Texto libre |
| Agua | `fimba_venue_info.agua` | Texto libre |
| Observaciones | `fimba_venue_info.observaciones` | |
| Espectáculos | `eventos` (conciertos en la locación) | Acordeón anidado «Espectáculos» (tabla) |
| Agenda | link | `/fimba/edicion/:id/agenda?locacion=:id_locacion` · filtros compartibles: `?propuestas=5,7&grupos=3&origen=all` (ver § Agenda) |

5. Medidas de escenario en header: `locaciones.escenario_ancho_cm` × `escenario_profundo_cm`.
6. Por espectáculo: fecha/hora, actividad, bloque repertorio, artistas taggeados, grupos OFRN, **observaciones aforo** (`eventos.observaciones_aforo`; autosave inline si `!readOnly`).
7. Filtros: fecha desde/hasta, locación.
8. Acciones por espectáculo:
   - **Ver escenario** → `StagePlotViewerModal`.
   - **Editar escenario** (`!readOnly`: editor_general / OFRN management) → `/fimba/edicion/:id/escenario` (standalone RiderMaker; primer plot de la gira). Consulta → solo Ver.
   - **Editar evento** → `FimbaEventoFormModal` (staff no RO; incluye obs. aforo si tipo concierto).
9. Autosave debounced + semáforo en `FimbaVenueInfoSection` (patrón meta artista).
10. **Permisos edición venue info:** `!readOnly` — OFRN management, `editor_general` FIMBA; consulta (user/token `/c`) y OFRN con fila `fimba_usuarios.consulta` = solo lectura.
11. **Sin** estado de venue (`id_estado_venue`, `eventos_venue_log`) en esta vista.

**Servicios:** `listFimbaConcertVenues` (incluye `locaciones.capacidad` + `observaciones_aforo`), `listFimbaVenueInfo`, `upsertFimbaVenueInfo`, `updateLocacionBasics` (nombre / dirección / **capacidad**), `updateEventoObservacionesAforo` en `fimbaService.js`. UI: `FimbaVenuesPage.jsx`, `FimbaVenueInfoSection.jsx` (`hideTitle` cuando anidado). Helpers: `src/utils/venueDisplayUtils.js` (`formatVenueShowsDateRange` para badge).

**Migraciones:** `20260827230000_fimba_venue_info.sql` — tabla `fimba_venue_info` (`id_edicion`, `id_locacion` unique). `20260831123130_eventos_observaciones_aforo.sql` — `eventos.observaciones_aforo` text (Local = Remote).

### Backline (planilla por concierto + ensayos manuales)

1. Edición → **Backline** (`/fimba/edicion/:id/backline`) — pestaña del toggle (entre Venues y Rider).
2. **Scope:**
   - **Conciertos** `eventos.id_tipo_evento = 1` de la gira enlazada (`fimba_ediciones.id_gira`) — **siempre** en la planilla.
   - **Ensayos** (tipos con `tipos_evento.id_categoria = 2` / categoría **Ensayos**) solo si `eventos.backline_incluido = true` (alta manual).
   - Locación opcional (muestra «Sin locación»). Soft-delete excluido.
3. **Agregar ensayos:** botón arriba de la planilla **«Seleccionar ensayo y Agregar»** → modal multi-select de ensayos de la gira aún no incluidos → `setEventosBacklineIncluido(..., true)`.
4. **Quitar ensayo:** ícono basura en filas no-concierto → confirma → `backline_incluido = false` (el evento de agenda **no** se elimina). Conciertos no se quitan así.
5. **Columnas** (planilla horizontal, shell 90%):

| UI | Origen | Notas |
|----|--------|-------|
| Estado | `eventos.backline_estado` | Un círculo = color actual (o estilo vacío «—»); click abre popover portal z-110 con `verde`/`celeste`/`amarillo`/`naranja` + Sin estado; tinte de fila; autosave; RO = disco |
| Artista | `eventos_fimba_propuestas` + `eventos_grupos` | Chips FIMBA (píldora) + `GiraGrupoChips` OFRN con **nombre completo** y esquinas rectangulares (no `compact`/iniciales); en ensayos, badge de `tipos_evento.nombre`; preview Detalle agenda debajo |
| Venue | `locaciones.nombre` (+ localidad) | Lectura |
| Fecha | `fecha` + `hora_inicio` | Formato largo ES |
| Descripción | `eventos.backline_descripcion` | Click-to-edit: preview HTML colapsado + `FimbaRichTextEditor` (`toolbar="compact"`) al foco; toolbar wrap dentro de la celda (CSS flex + magenta); listas/links/headers (sin strike/indent/align/imagen); autosave debounce + al cerrar (click fuera / Esc) si `!readOnly`. **Layout:** col `.fimba-backline-desc-cell` con `min-w-0` / max ~18rem / `overflow:hidden` + `overflow-wrap:anywhere` en preview Quill/links (URLs Drive no empujan Planta/Monto) |
| Planta de Escenario | `eventos.planta_escenario_url` + `planta_escenario_nombre` + `stage_plot_eventos` → `stage_plots` | **Chip Drive** si hay URL (nombre persistido / heurística → preview iframe). Si **no** hay URL pero sí vínculo RiderMaker (`stage_plot_eventos`): chip con `stage_plots.nombre` o «Escenario asignado» (click = Ver escenario). «Sin planta» **solo** sin URL **y** sin plot vinculado. Menú **⋮**: Ver planta, Abrir Drive, Editar URL/nombre (+ «Desde Drive»), Actualizar nombre, Ver/Editar/Elegir/Cambiar/Crear/Desvincular escenario RiderMaker. **Elegir / Cambiar** → modal lista + vincular / crear vacío o duplicar referencia; **Desvincular** → `unlinkEventFromStagePlot`. **Editar** lienzo → `/fimba/edicion/:id/escenario/:plotId` |
| Monto | `eventos.backline_monto` | ARS es-AR (`parseFimbaMonto` / `formatFimbaMonto`); blur; input **alineado a la izquierda** |

6. Filtros: fecha desde/hasta (default **vacío** = toda la edición; no default=hoy), artista multi, locación multi. Options de locación usan `{ id, label }` (SearchableSelect). Empty multi-array = sin filtro.
7. **Imprimir / PDF** (header): filtros DateInput/SearchableSelect ocultos; planilla Backline (estado/artista/venue/desc/planta/monto); orientación editable en el diálogo. Acciones ⋮ y «Seleccionar ensayo» no salen.
7. **Permisos:** misma edición que Venues (`!readOnly` escribe; consulta / token `/c` RO). **Editar Escenario** (Konva) disponible para `editor_general` y OFRN management vía ruta standalone FIMBA; consulta solo Ver. Agregar/quitar ensayos solo si `!readOnly`.
8. **RiderMaker:** reusa `stage_plots` / `stage_plot_eventos` / `ProgramStagePlotEditor` en shell `/fimba/edicion/:id/escenario/:plotId` (sin chrome FIMBA ni Giras). `canEditOverride={!readOnly}`. Print nativo no captura el lienzo: nota en `FimbaEscenarioPage`; imprimir la planilla Backline en su lugar.

**Servicios:** `listFimbaBacklineConcerts`, `listFimbaBacklineEnsayosDisponibles`, `setEventosBacklineIncluido`, `updateEventoBackline` (incl. `planta_escenario_nombre`), `resolvePlantaEscenarioLabel` / `guessDriveLinkLabel` / `buildDriveFilePreviewUrl` / `fetchFimbaDriveFileName`, `isFimbaBacklineEnsayoRow`, `isFimbaBacklinePlanillaEvent`, `FIMBA_BACKLINE_ESTADOS` / `canonicalizeFimbaBacklineEstado` en `fimbaService.js`; stage plot helpers en `stagePlotService.js`. UI: `FimbaBacklinePage.jsx` (`BacklinePlantaCell` chip+⋮+preview, `SelectEnsayosBacklineModal`, `BacklineEstadoCell` círculo + popover); consulta desde agendas: `FimbaBacklineConsultaModal.jsx` + helpers `fimbaAgendaConsulta.js`.

**Migraciones:**
- `20260902164456_fimba_eventos_backline.sql` — `backline_descripcion`, `backline_monto`, `planta_escenario_url`
- `20260902182459_fimba_eventos_backline_incluido.sql` — `backline_incluido boolean NOT NULL DEFAULT false` (+ seed `true` en conciertos)
- `20260902182918_fimba_eventos_backline_estado.sql` — `backline_estado` CHECK (`verde|celeste|amarillo|naranja`)
- `20260902184930_fimba_eventos_planta_escenario_nombre.sql` — `planta_escenario_nombre` (chip Drive)
- Local = Remote

**Import sheet 2026:** `supabase/scripts/import_fimba_backline_sheet_2026.sql` (Compilado Backlines FIMBA 2026 → gira 12; incluye ensayos Hotelera con `backline_incluido`).

### Contrataciones

1. Edición → **Contrataciones** (`/fimba/edicion/:id/contrataciones`).
2. Planilla: nº expediente, nombre (artista opcional en gris vacío + texto libre lado a lado), monto (ARS es-AR), tipo, 4 flags de estado (check tildado / cuadro vacío, color por columna), último estado. Anchos fijos/compactos en expediente, tipo y checks (headers wrap); nombre/monto/estado/Drive no se comprimen.
3. Barra superior **Total montos** = suma de `monto` de filas visibles (tras filtro de nombre; magenta FIMBA). Cabeceras clickeables para ordenar; filtro nombre en header de columna Nombre.
4. **Edición de fila:** doble clic → inputs/checks editables; **tilde** confirma (un save); **X** / **Esc** descarta. Fila vacía inferior = alta (tilde/Enter crea). Sin autosave on blur. Semáforo dirty/saving/saved. `readOnly` → solo lectura (sin fila nueva / sin row-edit). Mientras hay fila en edición, el sort **no** reordena por el borrador (usa valores committed); al confirmar/cancelar vuelve el orden normal.
5. **Último estado conocido** (planilla y ficha artista): `<select>` nativo con presets coloreados + opción **Otro…** (solo UI; DB = texto libre):
   - Factura presentada (azul claro)
   - Factura emitida (violeta claro)
   - Factura pedida (rosa claro)
   - Pagado (verde claro)
   «Otro…» revela input libre; valor custom existente → select en Otro… + texto editable. Color del select si matchea preset. **No** se duplica badge bajo el control (badge solo en modal historial / planilla RO). Componente: `FimbaEstadoConocido.jsx` (`EstadoConocidoInput` / `EstadoConocidoBadge`).
6. Cada cambio de estado **inserta** en `fimba_contrataciones_estado_log` y actualiza el denormalizado `ultimo_estado_conocido` vía `updateFimbaContratacion` → `appendFimbaContratacionEstado` (al confirmar la fila en planilla; en ficha artista: commit al elegir preset o blur de texto libre). Autor = sesión OFRN (nombre/mail integrantes) o `fimba_user` (nombre/mail).
7. Botón historial (ícono) por fila en planilla → modal «Ver historial»: estado + timestamp + quién, cronológico (badge solo en modal).
8. **Documentación Drive** (modal carpeta / ficha artista con Explorar): con permiso de subida, arrastrar archivos desde el Explorador al listado → overlay «Soltá para subir a esta carpeta»; aterrizan en la carpeta del breadcrumb. Viewers no ven overlay. Carpetas OS se omiten; archivos > ~4 MB se rechazan.
9. **Backup Google Sheets** (webapp → Sheet, no al revés):
   - **Targets** (mismo payload/layout; tab **Contrataciones**):
     1. Primary: [`1rAd7j4phD6hx3jHujTUHM5KiBZNmfotz11tE3NHFox8`](https://docs.google.com/spreadsheets/d/1rAd7j4phD6hx3jHujTUHM5KiBZNmfotz11tE3NHFox8/edit#gid=475656054) (gid `475656054`) — URL canónica en UI.
     2. Mirror: [`1qz7_kj7hO57A5DY8rw5S12bZvd8wilO2hWJeli-SivQ`](https://docs.google.com/spreadsheets/d/1qz7_kj7hO57A5DY8rw5S12bZvd8wilO2hWJeli-SivQ/edit#gid=1998379859) (gid `1998379859`).
   - Lista configurable: secret/env `FIMBA_CONTRATACIONES_SHEET_IDS` (IDs separados por coma o JSON array). Si no está set, usa ambos defaults. Legacy `FIMBA_CONTRATACIONES_SHEET_ID` = un solo target.
   - Botón **Actualizar** (solo `canSeeContrataciones` + no RO) y cron diario escriben a **todos** los IDs. Fallo parcial: se intenta el resto; respuesta incluye `sheetsSucceeded` / `sheetsFailed` / `primaryOk` / `partial`; `last_error` no oculta fallo del primary.
   - **Auth app (no Google UX):** staff OFRN envía `ofrnAuth` `{id, mail}` validado contra `integrantes` + roles management; editor FIMBA envía `fimbaAuth`; cron usa header secret. Google Sheets/Drive usa **solo** secrets de proyecto `G_CLIENT_ID` / `G_CLIENT_SECRET` / `G_REFRESH_TOKEN` (misma cuenta Archivo que `manage-drive` / `sync-conciertos-sheet` / mails). **No** hay OAuth Google por usuario en el frontend.
   - Contador **«N cambios sin sincronizar»** (altas/edits/bajas/carpeta Drive desde última sync de sesión).
   - Salida bloqueada si hay cambios: ConfirmDialog **No salir** | **Salir y Actualizar** (tabs FIMBA + volver + `beforeunload`). Sin opción «salir sin actualizar».
   - Cron diario `ofrn-fimba-contrataciones-sheet-daily` 11:00 UTC (pg_cron → Edge). Auth cron: Vault `fimba_contrataciones_sheet_cron_secret` o fallback `db_backup` / `conciertos` (mismo valor que `CONCIERTOS_SHEET_CRON_SECRET` en secrets de Edge).
   - Estado: tabla `fimba_contrataciones_sheet_sync` (última sync / error / filas; URL = primary si OK).
   - **Column mapping** (bloque desde **col B**; col A intacta; configurable `FIMBA_CONTRATACIONES_SHEET_HEADERS` JSON): **B** Número de expediente → `numero_expediente`; **C** Carpeta → `carpeta_documentacion` (**Drive smart chips** vía Sheets API `chipRuns` + `richLinkProperties.uri`; fallback hipervínculo URL si chips fallan; requiere scope Drive en `G_REFRESH_TOKEN`); **D** Nombre → `nombre` ∥ propuesta; **E Monto** → número plano (`number`) + formato Sheets `CURRENCY` patrón `"$"#,##0.00` (separadores según locale del Sheet, tip. es-AR); **F** Tipo de contratación → `tipo_contratacion`; **G–J** 4 flags (`envio_firma_mfm_nota` / `nota_firmada` / `falta_documentacion` / `enviado_adm`) → booleanos JSON `true`/`false` vía `values.update` + `USER_ENTERED` (celdas Sheets **TRUE/FALSE**); UI checkbox: el tab usa **Sheets Table** («Table1», cols A–K). Cada sync: (1) borra `bandedRanges` huérfanos que solapan la zona de expansión y limpia fondo en esas filas (sin esto `updateTable` falla con «colores de fondo alternos»); (2) `updateTable` `columnProperties` → `BOOLEAN` en G–J; (3) `updateTable` `range.endRowIndex` hasta última fila de datos. Checkboxes = Table BOOLEAN (no `setDataValidation`: cualquier columna tipada de Table —BOOLEAN/TEXT/CURRENCY— rechaza validation con «No se puede realizar esta operación en columnas de tipo»). Fallback: `setDataValidation` BOOLEAN **solo** en filas **fuera** del rango de la Table si el expand falla. Respuesta: `checkboxValidationApplied`, `tableCheckboxExpanded`, `checkboxValidationMode` (`full` | `beyond_table` | `none`); **K** Ultimo Estado Conocido → `ultimo_estado_conocido`. Clear/write: `Contrataciones!B1:…` (sin Fecha / sin `fecha_limite_resol`).
   - **Orden de filas en el Sheet:** ascendente por **col D (Nombre)**; `localeCompare` `es`, `sensitivity: "base"`, `numeric: true`; **vacías al final**; desempate Carpeta → nº expediente. (No usa `orden` de DB en el export.)
   - **Ops:** compartir **ambos** Sheets (primary + mirror, y cualquier ID extra en `FIMBA_CONTRATACIONES_SHEET_IDS`) con la cuenta Archivo del refresh token (`G_REFRESH_TOKEN`) como **editor**. El usuario final **no** inicia sesión en Google. Chips de carpeta: la cuenta Archivo debe poder ver las carpetas (misma cuenta que `manage-drive`).

---

## Rutas

| Ruta | UI |
|------|-----|
| `/fimba/login` | Login externo FIMBA (mail + clave o `?token=`) |
| `/fimba` | Home ediciones (staff OFRN; externos redirigen a su edición) |
| `/fimba/edicion/:id` | Artistas + planilla (+ check-in/out + early/late) + nav |
| `/fimba/edicion/:id/agenda` | Agenda unificada |
| `/fimba/edicion/:id/transportes` | Vehículos + trayectos |
| `/fimba/edicion/:id/hoteleria` | Hotelería |
| `/fimba/edicion/:id/venues` | Venues de la edición (metadata + espectáculos + escenario). Legacy `/espacios` → redirect |
| `/fimba/edicion/:id/backline` | Planilla Backline (conciertos siempre + ensayos con `backline_incluido`) |
| `/fimba/edicion/:id/escenario/:plotId?` | Editor Escenario standalone (RiderMaker; sin FimbaLayout) |
| `/fimba/edicion/:id/contrataciones` | Contrataciones / expedientes (`fimba_contrataciones`) |
| `/fimba/edicion/:id/usuarios` | Usuarios FIMBA de la edición (`fimba_usuarios`) |
| `/fimba/edicion/:id/artista/:artistaId` | Detalle artista: agenda + rooming + planilla participantes + tokens (+ finanzas solo `canSeeContrataciones`) |
| `/fimba/edicion/:id/artista/:artistaId/agenda` | Agenda filtrada (planilla unificada staff) |
| `/fimba/edicion/:id/artista/:artistaId/transportes` | Trayectos filtrados |
| `/fimba/edicion/:id/artista/:artistaId/hoteleria` | Hotelería filtrada |
| `/fimba/a/:token` | Consulta token (agenda RO + datos artista + participantes RO + rooming RO) |
| `/fimba/e/:token` | Edición token (planilla participantes + agenda + rooming acomodo) |
| `/fimba/c/:token` | Consulta general edición (shell RO; sin Usuarios/Contrataciones/Rider) |
| `/fimba/c/:token/agenda?…` | Entry consulta directo a agenda filtrada (preserva query params) |

---

## Archivos clave

| Path | Notas |
|------|--------|
| `supabase/migrations/20260810170000_fimba_plataforma_base.sql` | Schema base; `fimba_evento_transportes` → FK `giras_transportes` |
| `supabase/migrations/20260810180000_fimba_propuestas_id_hotel.sql` | `id_hotel` opcional |
| `supabase/migrations/20260810190000_fimba_propuestas_checkin_early_checkout_late.sql` | `checkin_early` / `checkout_late` boolean default false |
| `supabase/migrations/20260902122628_fimba_checkin_checkout_eventos.sql` | FKs `id_evento_checkin|checkout` en propuestas/participantes + backfill gira 12 @ 14:00/10:00 |
| `supabase/scripts/fimba_checkin_checkout_eventos_gira12.sql` | Doc/verificación backfill estadía→eventos |
| `supabase/scripts/fimba_associate_stay_events_edicion1.sql` | Re-asociación idempotente fechas→eventos 22/23 (edición 1); aplicado linked 2026-09-02 (0 deltas; 16×2 prop + 4 part ya OK) |
| `supabase/scripts/fimba_sync_stay_event_locacion_from_hotel_edicion1.sql` | Locación check-in/out ← hotel (`hoteles.id_locacion`); fork si conflicto; aplicado linked 2026-09-04 (22 matched, 0 mismatch, +6 forks) |
| `src/utils/fimbaStay.js` | `resolveParticipanteStay` / tipos 22/23 + horas; `formatStayEventLabel`; `classifyStayOverride` / `normalizeParticipanteStayAgainstGroup` / `normalizeParticipanteStayEventAgainstGroup` |
| `src/views/Fimba/FimbaStayEventCell.jsx` | Picker vincular/crear evento check-in|out (portal); `variant=group` / `override`; **sin** locación libre (deriva del hotel del artista) |
| `src/services/fimbaService.js` | `listFimbaStayEvents` / `createFimbaStayEvent` / `syncFimbaStayEventsLocacionFromHotel`; update propuesta/participante por `id_evento_*` + espejo + sync locación ← hotel |
| `supabase/migrations/20260811090000_fimba_propuestas_observaciones_logisticas.sql` | `observaciones_logisticas` text |
| `supabase/migrations/20260811150000_fimba_propuestas_carpeta_documentacion.sql` | (histórica) add en propuestas; supersedida por 20260811160000 |
| `supabase/migrations/20260811160000_fimba_contrataciones_carpeta_documentacion.sql` | `fimba_contrataciones.carpeta_documentacion`; copy 1.ª por artista; null propuestas usadas; col propuestas DEPRECATED |
| `src/views/Fimba/FimbaDocumentacionDrivePreview.jsx` | Preview Drive compartido (Explorar gate, list, copy, download, upload + drag&drop OS, prefetch) |
| `src/views/Fimba/FimbaContratacionesPage.jsx` | Planilla + modal Drive por fila |
| `src/views/Fimba/FimbaArtistaPage.jsx` | Meta sin Drive; Finanzas join docs por contrato |
| `supabase/migrations/20260810210000_fimba_usuarios.sql` | Tabla `fimba_usuarios` (mail+rol por edición) |
| `supabase/migrations/20260811110000_fimba_contrataciones.sql` | Tabla `fimba_contrataciones` (planilla expedientes) |
| `supabase/migrations/20260811120000_fimba_ediciones_token_consulta.sql` | `fimba_ediciones.token_consulta` UUID único (enlace `/fimba/c/:token`) |
| `supabase/migrations/20260811130000_fimba_contrataciones_estado_log.sql` | Log append-only de `ultimo_estado_conocido` (estado + autor + timestamp) |
| `supabase/migrations/20260811140000_fimba_habitaciones.sql` | `fimba_propuestas_habitaciones` + `fimba_habitaciones_ocupantes` |
| `src/services/fimbaService.js` | Flota, trayectos, agenda/hotel/rooming, usuarios FIMBA, contrataciones, rider upload `fimba-riders` |
| `src/utils/fimbaEventCategories.js` | `normalizeCategoriasTiposEventos` / `categoriesFromTiposEvento` / `mergeFimbaAgendaCategories` (filtro = tabla BD ∪ tipos ∪ filas) |
| `supabase/migrations/20260901140559_catering_categoria_tipo.sql` | Seed categoría + tipo Catering |
| `src/utils/fimbaUserSession.js` | Sesiones `fimba_user` + `fimba_consulta_edicion` + `resolveFimbaAccess` |
| `src/hooks/useFimbaUserSession.js` | Hook reactivo de sesión FIMBA usuario |
| `src/hooks/useFimbaConsultaEdicionSession.js` | Hook sesión enlace consulta edición |
| `src/context/FimbaAccessContext.jsx` | `readOnly` / `canEditPropuestaMeta` / flags de secciones en shell staff |
| `src/views/Fimba/FimbaLoginPage.jsx` | Form `/fimba/login` |
| `src/views/Fimba/FimbaEdicionConsultaEntry.jsx` | Entry `/fimba/c/:token` (+ `/agenda`): token único de agenda o token de edición; session locked |
| `src/utils/fimbaTransportBoarding.js` | Secuencia + en tránsito + chips (`resolveStopBoardAlightChips` / `summarizeOfrnStopRules` / `formatBoardChipLabel`) + tooltip a bordo + opciones bajada |
| `src/views/Fimba/FimbaStopRulesManager.jsx` | Modal planilla: reglas grupo+cantidad+equipaje; Reserva; **Bajar todo** FIMBA; StopRules OFRN `embedded` (+ Bajar todo orquesta) |
| `src/views/Fimba/FimbaEventoArtistasBoardingTable.jsx` | Editor transporte: Tag \| Sube \| Baja + `SearchableSelect` alta; sync `fimba_propuesta_rutas` |
| `src/views/Fimba/FimbaEventoFormModal.jsx` | Modal agenda + flota; **Detalle** rich-text; **Observaciones internas**; Asientos/Obs. Equipaje; **Reserva técnica** (no auto-fill tope); Sube/Baja; Orquesta OFRN; dirty-guard cierre |
| `supabase/scripts/fimba_plazas_to_sube_gira12.sql` | One-shot data: legado plazas→Sube (gira 12); aplicado linked 2026-08-31 |
| `supabase/scripts/merge_viento_sur_ofrn_fimba_gira12.sql` | One-shot data: merge Atlas→Viento Sur + FIMBA artista→grupo OFRN (gira 12); aplicado linked 2026-09-01 |
| `src/views/Fimba/FimbaEventDetalleField.jsx` | Preview Detalle (sanitize + clamp) + editor contentEditable B/I/U legacy; Quill vive en `FimbaRichTextEditor` |
| `src/views/Fimba/FimbaRichTextEditor.jsx` | Quill FIMBA (magenta, ES); `toolbar` `full`\|`compact`; imagen paste/picker/drop; upload inyectable (`uploadFile`) o rider; RO = HTML sanitizado; toolbar CSS wrap (`display:flex` + `flex-wrap`) |
| `src/utils/eventosInternas.js` | Vacío/sanitize allowlist bucket `eventos-internas` |
| `src/services/eventosInternasService.js` | Upload imágenes path `eventos/{id|draft}/…` |
| `supabase/migrations/20260826140000_eventos_observaciones_internas.sql` | Columna + bucket `eventos-internas` (Local = Remote) |
| `supabase/migrations/20260831123130_eventos_observaciones_aforo.sql` | `eventos.observaciones_aforo` text (Local = Remote) |
| `src/components/forms/EventForm.jsx` | OFRN: campo Observaciones internas (mismo Quill + bucket) |
| `src/services/fimbaService.js` | … + `duplicateFimbaEvento` (shell+tags+flota; sin boarding rides) |
| `src/views/Giras/StopRulesManager.jsx` | Reglas `giras_logistica_rutas`; cierra rides abiertos; lista a bordo + **Bajar todo**/Bajar; confirms z-110 embedded |
| `src/services/fimbaService.js` | Rutas FIMBA + `alightAllFimbaAboardAtStop` + `alightAllOfrnAboardAtStop` / `alightOfrnPeopleAtStop` |
| `src/views/Fimba/FimbaLayout.jsx` | Skin + header sticky + toggle secciones + **modo nocturno** (sol/luna ↔ `theme_mode` / `html.dark`) + sesión/logout + **Imprimir / PDF** (`window.print` + `@media print`) |
| `src/views/Fimba/FimbaSectionToggle.jsx` | Segmented control; `resolveFimbaPrintMeta`; Backline entre Venues y Rider; oculta Contrataciones/Usuarios en consulta; Rider si `canSeeRider` |
| `src/views/Fimba/FimbaRiderPage.jsx` | Pestaña Rider: búsqueda + acordeón; preview HTML sanitizado; `IconEdit` → Quill + autosave; Imprimir/PDF || `src/views/Fimba/FimbaRiderConsultaModal.jsx` | Modal RO Rider desde agendas (card por artista) |
| `src/views/Fimba/FimbaBacklineConsultaModal.jsx` | Modal RO Backline desde agendas (card campos planilla) |
| `src/utils/fimbaAgendaConsulta.js` | Helpers ícono/visibilidad Backline+Rider en agendas |
| `src/utils/fimbaRider.js` | Vacío = sin texto ni imágenes; sanitize `<img>` allowlist bucket |
| `supabase/migrations/20260813130000_fimba_riders_storage.sql` | Bucket `fimba-riders` público + policies |
| `src/views/Fimba/FimbaContratacionesPage.jsx` | Planilla expedientes: row-edit (doble clic / tilde / Esc) + semáforo; modal Documentación Drive; estado presets + historial; **Actualizar** GSheet + contador cambios + leave guard |
| `src/views/Fimba/FimbaSheetLeaveGuardContext.jsx` | Intercepta tabs/links FIMBA si hay cambios sin sync a Sheets |
| `supabase/functions/sync-fimba-contrataciones-sheet/index.ts` | Backup full-replace tab Contrataciones |
| `supabase/migrations/20260831170559_fimba_contrataciones_sheet_sync.sql` | Tabla estado + pg_cron diario |
| `src/views/Fimba/FimbaEstadoConocido.jsx` | Control compartido «Último estado» (presets + Otro… + badge historial) |
| `src/views/Fimba/FimbaUsuariosPage.jsx` | Usuarios FIMBA + enlace consulta general edición |
| `src/views/Fimba/FimbaStaffGuard.jsx` | isManagement **o** fimba_user **o** token consulta edición |
| `src/views/Fimba/FimbaEdicionPage.jsx` | Artistas + modo planilla + semáforo; alta modal; lápiz → ficha; lista **alfabética** por nombre; scroll horizontal `.fimba-artistas-scroll` + labels check-in/out compactos |
| `src/utils/fimbaAgendaSort.js` | `compareEsText` / `sortFimbaPropuestasByNombre` / orden contractual agenda |
| `src/views/Fimba/FimbaArtistaMetaSection.jsx` | Datos generales / meta (autosave + semáforo); ficha + modal Hotelería |
| `src/views/Fimba/FimbaArtistaPage.jsx` | Detalle: meta + finanzas (Drive desde contratos) + agenda + rooming + planilla; finanzas si `canSeeContrataciones` |
| `src/views/Fimba/FimbaConsultaAgenda.jsx` | Agenda por tag artista + ride segments RO; create/edit/delete en tagged; **móvil cards** |
| `src/views/Fimba/FimbaAgendaEventCard.jsx` | Card móvil + `FimbaAgendaCardMenu` / `buildAgendaCardMenuItems` (también kebab planilla desktop) |
| `src/utils/fimbaAgendaUrlParams.js` | Query staff + token único de consulta (`fimba_agenda_consultas`) + `retainSelectedFilterIds` |
| `scripts/verify-fimba-agenda-tutti-filter.mjs` | Aserciones Tutti opt-in + fingerprint consulta + catálogo vacío no borra URL |
| `src/views/Fimba/FimbaAgendaPage.jsx` | Planilla agenda (+ **móvil cards**); Copiar enlace → token único; `agendaOnly` oculta filtros; íconos consulta Backline/Rider (editores) |
| `supabase/migrations/20260902153808_fimba_agenda_consultas.sql` | Tabla `fimba_agenda_consultas` (token UUID + filtros congelados) |
| `src/utils/fimbaTransportBoarding.js` | Boarding + filtros agenda por rutas (`eventMatchesPropuestaRouteFilter`) |
| `src/views/Fimba/FimbaTransportPage.jsx` | Vehículos + trayectos + columnas boarding / locación |
| `src/views/Fimba/FimbaHoteleriaPage.jsx` | Hotelería + **Editar datos** (meta compartida + cupos) + hub reportes + exports por tarjeta + comidas |
| `src/views/Fimba/FimbaVenuesPage.jsx` | Venues: metadata operativa + espectáculos + stage plot (scope edición) |
| `src/views/Fimba/FimbaBacklinePage.jsx` | Backline: chip planta Drive (`planta_escenario_nombre`) + preview; menú ⋮ Drive/RiderMaker; ensayos `backline_incluido` |
| `src/views/Fimba/FimbaEscenarioPage.jsx` | Shell Escenario FIMBA (`canEditOverride`) |
| `src/views/Fimba/FimbaVenueInfoSection.jsx` | Card editable venue info (autosave + semáforo) |
| `supabase/migrations/20260827230000_fimba_venue_info.sql` | Tabla `fimba_venue_info` |
| `supabase/migrations/20260902164456_fimba_eventos_backline.sql` | Columnas backline en `eventos` |
| `supabase/migrations/20260902182459_fimba_eventos_backline_incluido.sql` | `backline_incluido` |
| `supabase/migrations/20260902182918_fimba_eventos_backline_estado.sql` | `backline_estado` color enum |
| `supabase/scripts/import_fimba_backline_sheet_2026.sql` | Import Compilado Backlines sheet → gira 12 |
| `supabase/migrations/20260902182459_fimba_eventos_backline_incluido.sql` | `eventos.backline_incluido` (ensayos en planilla) |
| `src/utils/venueDisplayUtils.js` | Helpers venues (agrupación, fechas, badge rango) |
| `src/views/Fimba/FimbaHoteleriaReports.jsx` | Hub OFRN + vistas print/Excel pedido hotel |
| `src/views/Fimba/FimbaComidasReportModal.jsx` | Comidas: texto / PDF / Excel |
| `src/views/Fimba/FimbaTransportReportsMenu.jsx` | CNRT · paradas · hoja de ruta · Excel por vehículo |
| `src/utils/fimbaExport.js` | Excel hotelería / comidas / abordaje flota |
| `src/utils/fimbaReports.js` | Pedido/rooming/comidas/riders print (imágenes + waitForImages) + adapters CNRT/paradas/roadmap |
| `src/views/Fimba/FimbaRoomingPanel.jsx` | Panel hotelería/rooming (admin cupos + acomodo / RO) + PDF |
| `src/views/Fimba/*` | Shell, staff, tokens |

## Migraciones

| Versión | Nombre | Deploy |
|---------|--------|--------|
| **20260810170000** | `fimba_plataforma_base` | Local = Remote |
| **20260810180000** | `fimba_propuestas_id_hotel` | Local = Remote (`migration list` OK) |
| **20260810190000** | `fimba_propuestas_checkin_early_checkout_late` | Local = Remote (`migration list` OK) |
| **20260810200000** | `fimba_propuesta_rutas` | Local = Remote |
| **20260810210000** | `fimba_usuarios` | Local = Remote (`migration list` OK) |
| **20260811090000** | `fimba_propuestas_observaciones_logisticas` | Local = Remote (`migration list` OK) |
| **20260811150000** | `fimba_propuestas_carpeta_documentacion` | Local = Remote (histórica) |
| **20260811160000** | `fimba_contrataciones_carpeta_documentacion` | Local = Remote (deploy linked) |
| **20260811110000** | `fimba_contrataciones` | Local = Remote (deploy linked) |
| **20260811140000** | `fimba_habitaciones` | Local = Remote (deploy linked) |
| **20260811120000** | `fimba_ediciones_token_consulta` | Local = Remote |
| **20260811130000** | `fimba_contrataciones_estado_log` | Local = Remote (SQL linked + repair applied) |
| **20260813120000** | `fimba_propuestas_rider` | Local = Remote (deploy linked) |
| **20260824152341** | `fimba_propuestas_requiere_hotel_comidas` | Local = Remote (deploy linked) |
| **20260825084834** | `fimba_equipaje_asientos_obs` | Local = Remote (SQL linked + repair applied) |
| **20260904033451** | `fimba_propuesta_rutas_es_chofer` | Local = Remote (`es_chofer` bool **por subida/trayecto**; SQL linked + repair applied) |
| **20260904145033** | `giras_logistica_rutas_es_chofer` | Local = Remote (OFRN: mismo flag en regla de boarding; no en integrantes) |
| **20260831123130** | `eventos_observaciones_aforo` | Local = Remote (`db push` + `migration list` OK) |
| **20260902164456** | `fimba_eventos_backline` | Local = Remote (`db push`; cols backline en `eventos`) |
| **20260902182459** | `fimba_eventos_backline_incluido` | Local = Remote (`db push`; `backline_incluido`) |
| **20260902182918** | `fimba_eventos_backline_estado` | Local = Remote (`backline_estado` CHECK) |
| **20260831170559** | `fimba_contrataciones_sheet_sync` | Local = Remote (SQL linked + repair applied; cron daily live) |
| **20260901140559** | `catering_categoria_tipo` | Local = Remote (SQL linked: cat. 9 + tipo 34) |
| **20260902122628** | `fimba_checkin_checkout_eventos` | Local = Remote (`db push`; 12 eventos + 16×2 prop + 4×2 part) |

### Auth usuarios FIMBA — cómo usar

1. **Crear usuario** (staff OFRN o editor_general de la edición):
   - Abrir edición → **Usuarios** (`/fimba/edicion/:id/usuarios`) o botón Usuarios / tab Usuarios.
   - **Agregar usuario**: mail, nombre opcional, rol (`editor_general` o `consulta`), contraseña temporal (generada o manual).
   - Tras crear/regenerar: se muestra la clave **una vez** para copiar/compartir.
2. **Login externo**:
   - Ir a `/fimba/login` → mail + contraseña.
   - Sesión en `localStorage.fimba_user` → redirect a `/fimba/edicion/{id_edicion}`.
   - `consulta` entra en read-only (sin Usuarios ni Contrataciones).
   - Alternativa: `/fimba/login?token={token_login}` (UUID de la fila).
3. **Enlace consulta general edición** (sin login de usuario):
   - En **Usuarios**: sección «Enlace consulta general edición» → copiar `/fimba/c/<token>`.
   - Abrir en incógnito: shell RO de esa edición (Artistas, Agenda, Transportes, Hotelería, Venues; **sin Rider**).
   - **Regenerar** invalida el enlace anterior (`fimba_ediciones.token_consulta`).
4. **Logout FIMBA**: botón **Salir** / **Salir de consulta** en el header (y en pantalla bloqueada del guard) con `useConfirmDialog`; limpia sesión usuario y/o token consulta según el caso.
5. Staff OFRN sigue entrando por login intranet (`isManagement`) sin registro en `fimba_usuarios`, salvo override `consulta` (mail en `fimba_usuarios` → RO).
6. **Seed staff OFRN FIMBA 2026** (`supabase/seed/fimba_edicion_1_usuarios_ofrn.sql`, aplicado linked 2026-08-26): Charbonnier / Vidondo / Fraile / Milanesi → `editor_general`; Claudio Rossi → `consulta`. Clave = `integrantes.clave_acceso` (misma que intranet; también sirve en `/fimba/login`).

## Incidente: Agenda → ediciones (2026-08-10)

- **Síntoma:** click **Agenda** (y similares) parecía caer en listado de ediciones.
- **Causa:** `FimbaStaffApp` tenía catch-all `<Route path="*" element={<Navigate to="/fimba" replace />} />`. Cualquier no-match (ruta incompleta durante HMR, path mal resuelto, chunk en error) **redirigía en silencio al home de ediciones**, indistinguible de un enlace roto a agenda.
- **Links:** ya apuntaban a absolutos `/fimba/edicion/:id/agenda|transportes|hoteleria` (y variante artista); el guard no alteraba el path.
- **Fix:** rutas staff anidadas (`edicion/:id` → `agenda` / `transportes` / `hoteleria`); 404 con mensaje + link manual (sin auto-redirect a `/fimba`).

## Deploys / PWA vs edición dirty

Los deploys en Vercel **no** deben forzar reload mid-form. Banner «Nueva versión — Actualizar»; `FimbaEventoFormModal` dirty y planillas (`.fimba-row-dirty`) bloquean auto-apply. Detalle: `docs/specs/pwa-version-updates.md`.
