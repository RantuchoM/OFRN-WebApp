# FIMBA — Plataforma de festival (dependiente de OFRN)

Spec viva del vertical (foundation + transporte + agenda unificada + hotelería).

## Producto

FIMBA es una aplicación de festival con skin propia bajo `/fimba/*`, que reutiliza la flota/logística de la gira OFRN enlazada y no clona el esquema de `integrantes`.

### Modelo de datos

| Tabla | Rol |
|-------|-----|
| `fimba_ediciones` | Edición del festival; **1:1** con `programas` vía `id_gira` |
| `fimba_propuestas` | UI «Artista»: cupos, colores, tokens, fechas checkin/out, flags `checkin_early` / `checkout_late`, **`requiere_hotel`** / **`requiere_comidas`** (default true; false excluye de reportes/exportaciones), `id_hotel` opcional → `hoteles`, `observaciones_logisticas` (texto libre), **`rider`** (HTML rich-text logístico). **Sin** carpeta Drive (vive en contrataciones) |
| `fimba_participantes` | Personas del artista (entidad propia; `id_integrante` opcional bigint). **`genero`**: `femenino` \| `masculino` \| `otro` \| `sin_especificar` (default). No vive en la propuesta: el artista es el grupo; el sexo/género es de cada persona. |
| `fimba_usuarios` | Usuarios externos por edición: mail + `rol_fimba` (`editor_general` \| `consulta`) + `clave_acceso` / `token_login`. Staff OFRN (`isManagement`) no se registra aquí. |
| `eventos.audiencia_ofrn` | `none` \| `tutti` \| `grupos` |
| `eventos.asientos_equipaje` | Asientos de **equipaje** del evento/parada (no headcount de pasajeros). Legacy `# PAX` / `audiencia` se mantiene en sync. |
| `eventos.observaciones_equipaje` | Notas de equipaje del evento (antes `Obs:` en `descripcion`) |
| `eventos_fimba_propuestas` | Tags artista ↔ evento |
| `fimba_evento_transportes` | Plazas FIMBA de un **trayecto** sobre una **unidad de flota** (`giras_transportes`) (legacy / asignación modal; residual sintético de boarding) |
| `fimba_propuesta_rutas` | Subida/bajada FIMBA por **artista + cantidad de plazas** (+ `asientos_equipaje` / `observaciones_equipaje` por regla) en una unidad (`giras_transportes`); análogo a `giras_logistica_rutas` sin id_integrante |
| `fimba_contrataciones` | Planilla expedientes/contrataciones por edición: nº expediente, nombre (texto y/o `id_propuesta`), monto, fecha límite resol., tipo, flags firma/doc/ADM, `ultimo_estado_conocido` (denorm.), `orden`, **`carpeta_documentacion`** (URL/ID carpeta Google Drive del expediente) |
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
| **Asignación plazas FIMBA** | `fimba_evento_transportes` | `(id_evento trayecto, id_gira_transporte unidad, plazas)` |

```
transportes  1──*  giras_transportes  1──*  eventos (paradas OFRN, FK id_gira_transporte)
                         │
                         └──* fimba_evento_transportes *──1  eventos (trayectos FIMBA)
```

**Display de flota en FIMBA**

- `labelGiraTransporte(gt)` = `transportes.nombre` + patente si hay (fallback a `detalle` solo si falta catálogo).
- `detalleGiraTransporte(gt)` = `detalle` secundario si aporta algo distinto del nombre.
- Capacidad en listado de vehículos = **capacidad_maxima** + **pico en tránsito** (plazas a bordo al salir de cada parada, máx. de la secuencia) y libres en pico.
- **Planilla trayectos (UI):** scroll horizontal en `.fimba-planilla-scroll` (`overflow-x: auto`); tabla `width: max-content` (no se aplasta a 0). Columnas: Origen · Fecha · Com·Fin · Actividad · Locación · + · Destino · Vehículo · **Subidas** · **Bajadas** · Tránsito/cap · acciones. Sticky izq.: Origen + Fecha + Com·Fin. Se eliminaron Mov. / Δ / Artistas / ↑↓ (quién sube/baja vive en Subidas/Bajadas; Δ sigue en el cálculo interno de boarding). **Tránsito/cap** = a bordo al salir / capacidad; hover (portal z-110) lista grupos/artistas + Orquesta + Reserva del evento. Shell Transportes full-bleed (`.fimba-main:has(.fimba-transport-wide)` sin `max-width` de 1200px).
- **Modo edición (Transportes):** mismo toggle que Artistas (`Modo edición` / `Salir de modo edición`, `IconPencil`, magenta). Off = vista; on = celdas inline + semáforo por fila (`fimba-sync-*`, sin leyenda). **Consulta / token RO** (`readOnly`): sin toggle. Autosave al blur/Enter (texto) o al cambiar (fecha, selects). Patch liviano `patchFimbaEventoPlanilla` (fecha, horas, actividad, destino texto, vuelo, obs.) — **no** reescribe flota/tags/grupos/`id_gira_transporte` ni `FimbaStopRulesManager`. Vehículo inline solo FIMBA puro con 0–1 unidad (`setFimbaEventoTransportes`, conserva plazas). Destino (columna calculada), Tránsito y alta de paradas siguen en modal; Subidas/Bajadas = chips + modal. Flota: catálogo, nota OFRN, categoría y plazas inline con el mismo semáforo.

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
FIMBA (rutas explícitas): fimba_propuesta_rutas (id_propuesta, id_gira_transporte, plazas, id_evento_subida, id_evento_bajada)
      headcount por cantidad (no nomina de id_participante); default plazas = para_transporte
      ride abierto = subida sin bajada → ocupa bus + tope artista; bajada cierra el ride y libera plazas
      (no es un segundo consumo de planificada+equip.; hop-off + subida luego = nuevo ride)
FIMBA (legacy sintético): solo eventos **tipo transporte** con plazas en fimba_evento_transportes
      (o suma para_transporte de tags si plazas=0)
      residual = plazas_evento − Σ plazas explícitas que suben en ese evento/unidad
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

Helper puro: `src/utils/fimbaTransportBoarding.js`. Carga OFRN: `loadFimbaTransportLogisticsSummary` (reusa `calculateLogisticsSummary` + passengers/admissionRules/regions/localities + **`routeRules`** = `giras_logistica_rutas`). Rutas FIMBA: `listFimbaPropuestaRutas` / `upsertFimbaPropuestaRutaStop` / `clearFimbaPropuestaRutaStop`. Aserciones: `scripts/verify-fimba-boarding-delta.mjs`.

**UI subidas/bajadas (planilla Transportes):** columnas **Subidas** / **Bajadas** (paridad con `GirasTransportesManager` Suben/Bajan). Cada celda: conteo + chips (nombre + plazas) + `+`. Clic en celda / vacío → `FimbaStopRulesManager` (portal z-[100]). × en chip FIMBA → `clearFimbaPropuestaRutaStop` (confirm). **Chips OFRN** = una por regla de `giras_logistica_rutas` en ese extremo (`summarizeOfrnStopRules` / label = localidad|categoría|apellido|Todos + plazas con `ofrnSeatWeight`); clic → tab **Orquesta**. Fallback compacto «Orquesta n» solo si hay asientos boarding sin reglas listables. Chip **«Reserva del evento»** → tab Artistas. RO/token: chips visibles, sin add/remove. Helper: `resolveStopBoardAlightChips` (recibe `ofrnRouteRules` + passengers/localities/regions). Tras mutar Orquesta → soft refresh `logistics` (recalcula chips + tránsito sin full reload).
- pestaña **Artistas FIMBA**: lista de **reglas activas** (`fimba_propuesta_rutas`: grupo/artista + cantidad + **asientos/obs. equipaje**). Cantidad y equipaje editables inline → `upsertFimbaPropuestaRutaStop`. Alta: elegir grupo/artista + cantidad + equipaje. Fila **Reserva del evento** = plazas técnicas `fimba_evento_transportes` (editable en subida vía `upsertFimbaEventoTransportePlazas`); residual = reserva − Σ reglas de artista en esa parada. En bajada, el residual técnico que aligera se muestra (lectura). Botón **Bajar todo** (solo bajadas): cierra todos los rides FIMBA **abiertos** a bordo en ese vehículo/parada (`alightAllFimbaAboardAtStop`); reserva residual sintética ya baja en hop. Orquesta OFRN se baja aparte (pestaña Orquesta → **Bajar todo** / `alightAllOfrnAboardAtStop`).
  - **Subida:** dropdown = artistas con tope restante (`disp. remaining/tope` = planificada + extra equip. − plazas de rides **abiertos**). Consume tope / ocupa el bus.
  - **Bajada:** objetivo = **liberar plazas**. Dropdown = quienes **ya están a bordo** de *este* vehículo (ride abierto: subida sin bajada, o presentes en la parada). Label `a bordo N`. Guardar setea `id_evento_bajada` (+ plazas del ride). Tras bajar, `isOnBoardAfterStop` deja de contarlos y el tope del artista se libera. Quien nunca subió a esta unidad va al final, deshabilitado. Multi-vehículo: cada unidad tiene su propio ride; hop-off + subida posterior = nuevo ride.
- pestaña **Orquesta OFRN**: embebe `StopRulesManager` **inline** (`embedded`) en la misma modal (sin segundo full-screen; evita stack z-[70] detrás del backdrop FIMBA). Props: `event`, `type`, `transportId` (vehículo), `giraId`, `passengers`/`admissionRules`/`regions`/`localities` OFRN, `sortedEvents` (secuencia del vehículo), `supabase`. Tabla: `giras_logistica_rutas` (IDs integrantes numéricos). Modal standalone OFRN usa `z-[100]`; confirms embebidos `z-[110]`. Jerarquía de match = misma que Giras (no reimplementada).
  - **Fix bajada:** al asignar bajada/subida, si ya existe ride abierto (mismo alcance/objetivo con ese extremo vacío) → **UPDATE** de la fila (no insert huérfano). `calculateLogisticsSummary` usa `id_evento_subida`/`id_evento_bajada` como fuente de verdad (fallback si el embed PostgREST falta). `matchesRule`/`getMatchStrength` reconocen **Categoria** vía `target_ids` (SOLISTAS, …).
  - **Bajadas — a bordo:** lista `listOfrnPeopleAboardAtStop` (presentes en parada vía `isPresentAtStop`; conteo = Σ `ofrnSeatWeight`). Botón **Bajar** por persona y **Bajar todo** → `alightOfrnPeopleAtStop` / `alightAllOfrnAboardAtStop` (reglas **Persona** fuerza 5 que cierran rides abiertos). Soft refresh `onRefresh('ofrn')` → slice logistics.
- **Tránsito/cap hover:** tooltip portal `z-[110]` (`.fimba-transito-tooltip`) con desglose a bordo al salir (`resolveAboardAfterStopBreakdown` / `stop.a_bordo`): artistas FIMBA, **Orquesta** (con apellidos si ≤4 a bordo), Reserva del evento — formato `Nombre — n`.

En UI FIMBA (`/transportes`):

1. **Vehículos** — listado de `giras_transportes` de `fimba_ediciones.id_gira` + alta/edición embebida (`addFimbaVehiculo` / `updateFimbaVehiculo`, mismo path que OFRN: catálogo, detalle, plazas, categoría). Columnas: **Vehículo**, **Nota OFRN**, categoría, **Capacidad**, **Pico en tránsito**, **Libres (pico)** + lápiz editar (el lápiz se oculta en **Modo edición**; ahí las celdas son inline).
2. **Trayectos** — planilla cronológica; columnas de boarding por unidad (filtrar un vehículo para la secuencia completa). **Modo edición** (staff, no RO): fecha / com·fin / actividad+obs / locación texto (+ vuelo si hay) / vehículo FIMBA 0–1; semáforo sticky a la izquierda.

- **No** master `fimba_transportes`.
- Alta también posible en OFRN: gira → Logística → Transporte.
- Sin vehículos: trayectos solo **SIN SERVICIO** (cero filas en `fimba_evento_transportes`).
- **Modal asignación** (`FimbaEventoFormModal`, create y edit): tabla de **toda la flota** de la gira con columnas **Cap. / OFRN / FIMBA / Libres / Plazas**. Orden por **mejor ajuste** a `need` = tope transporte de artistas taggeados (`plazasACubrir` / mismo número que **Repartir**): fits (`capacidad ≥ need`) por leftover asc `(cap − need)` luego `cap` asc; no-fits por `cap` desc; si `need` ≤ 0, orden original. Multi-vehículo: checkbox + input **plazas por unidad** (n / m / p). Banner «Disponibles…». Botón **Repartir N plazas** (solo tope artista taggeado; **no** usa asientos de equipaje como headcount). Resumen vs tope artista. Campos **Asientos Equipaje** / **Observaciones Equipaje** → `eventos.asientos_equipaje` / `observaciones_equipaje` (default equipaje = Σ `plazas_extra_materiales`). En eventos de **transporte**: sección **Artistas · Sube / Baja** (`FimbaEventoArtistasBoardingTable`) — tabla Tag | Sube | Baja (tags = `eventos_fimba_propuestas`; celdas = `upsertFimbaPropuestaRutaStop` / `clearFimbaPropuestaRutaStop` + equipaje por regla). Alta de tag: `SearchableSelect` («Buscar artista…»). Multi-vehículo: selector de unidad en cabecera. Create / sin vehículo: tags encolables; Sube/Baja deshabilitados hasta guardar. **Bajar todo** en cabecera. Reserva técnica = plazas del vehículo (no panel StopRules duplicado). **Sección Orquesta OFRN** (debajo de artistas): botones **Subir orquesta** / **Bajar orquesta** abren `StopRulesManager` **embedded** para el evento+vehículo (`giras_logistica_rutas`); resumen de reglas actuales; soft refresh `onBoardingRefresh('ofrn')` → slice logistics. Eventos no-transporte: chip cloud de tags. Planilla sigue usando `FimbaStopRulesManager` (chips Subidas/Bajadas + Orquesta). Hard-block al guardar: plazas > asientos; plazas > **libres**; Σ > tope artistas. **Libres de ventana** (`listVehiclesAvailability`): `capacidad − ocupadas_ofrn − ocupadas_fimba`, donde OFRN = asientos de roster (1+`plaza_extra`) con ride que solapa la franja, y FIMBA = plazas a bordo (explícitas `fimba_propuesta_rutas` + residual sintético de `fimba_evento_transportes.plazas`). Al editar, se excluyen las plazas FIMBA que suben en el propio evento. Misma fórmula en validación de `saveFimbaEvento`. Plazas del evento cuentan en planilla vía rides sintéticos (residual si ya hay ↑ artista).
  - **Cierre del modal:** Enter en inputs (Sube/Baja, equipaje, etc.) **no** dispara Guardar ni cierra vía `onSaved`. Saves inline de reglas (`onBoardingRefresh`) refrescan planilla **sin** cerrar el modal ni pisar el borrador (debounce ~400–450 ms; solo slice `rutas`). Cerrar (backdrop / X / Escape / Cancelar) con borrador dirty → confirm «¿Descartar cambios?»; limpio → cierra. Dirty = campos del evento (tipo, fechas, actividad, vehículos/plazas, equipaje tocado, tags, audiencia/grupos); reglas Sube/Baja ya persistidas en DB **no** marcan dirty del formulario. Inline Sube/Baja: estado local del modal (seed desde `propuestaRoutes`); no re-list tras cada blur.
- Locación: `locaciones.nombre` (+ ciudad) o texto `destino` del trayecto FIMBA.
- **Destino (planilla Transportes)**: **calculado** = siguiente parada del **mismo vehículo** (`giras_transportes.id` / primary de la fila tras filtro de flota). Secuencia = `sortedEvents` de `buildVehicleBoardingSequence` (`sortEventsBySchedule` por fecha+`hora_inicio`). Label: `formatEventLocation(next)` (locación → destino texto → ciudad); si no hay locación, título `actividad` / `tipo_nombre` del next; sin next → `—`. Helpers: `nextEventInVehicleSequence` / `formatNextStopDestino` en `fimbaTransportBoarding.js` (expuestos también via `boardingMetricsForEventRow.destino_siguiente`).
- **IconEdit junto a Destino** (no el lápiz de acciones de fila): abre modal compacto «Definir destino» (`FimbaDestinoStopModal`, portal `fimba-modal-backdrop` z-100). Campos: **Detalle** (actividad), **Destino** (`LocationSelectWithCreate` → `id_locacion`), **Hora**. Al Guardar **siempre crea** una fila nueva en la secuencia del mismo vehículo (nunca edita el next existente):
  - Si ya hay next real → inserta intermedia entre actual y next (hora default = midpoint vía `defaultIntermediateStopSchedule`; Destino de la fila actual pasa a ser la nueva parada).
  - Si no hay next (Destino `—`) → crea la siguiente parada en cola (default hora = actual + 30 min).
  - Persistencia: `saveFimbaEvento` con tipo por `eventTypeIdForCategoria`, `audiencia_ofrn = none`, plazas 0 en `fimba_evento_transportes`, `id_locacion` opcional, `hora_fin` null; luego `reload` de planilla.
- **Columna «+» entre Locación y Destino**: botón *Agregar parada intermedia* (solo si la fila tiene vehículo primary). Abre `FimbaEventoFormModal` en **create** prefíillado: mismo `id_gira` (vía edición), mismo `id_gira_transporte` → `fimba_evento_transportes` (plazas 0; `saveFimbaEvento` deja `eventos.id_gira_transporte` null en alta multi-model), `audiencia_ofrn = none`, tipo por `eventTypeIdForCategoria` del bus (11/12/35), actividad «Parada intermedia», locación vacía. **Fecha/hora default** (`defaultIntermediateStopSchedule`):
  - Con next stop en la secuencia del vehicle: midpoint del datetime `(fecha, hora_inicio)` actual y del siguiente (si el next es otro día, la fecha del midpoint puede ser la del next).
  - Sin next: `hora_inicio` actual **+ 30 min** (puede rolar al día siguiente).
  - Si no hay fecha parseable: conserva `fecha` actual y `hora_inicio` actual o `12:00`.
- **Hora fin (planilla Transportes)**: valor persistido `eventos.hora_fin` (editable en modal evento / `saveFimbaEvento` **y** en Modo edición inline). Si null/vacío → display = `hora_inicio` del next stop del mismo vehículo (`hora_fin_display.isCalculated`); estilo cian itálico vs hora guardada en normal. Helper: `resolveHoraFinDisplay`. Al insertar una intermedia, Destino/Hora fin calculados de la fila anterior se actualizan al apuntar al nuevo next (sin escribir `hora_fin` en vecinos).
- **`saveFimbaEvento`**: acepta `id_locacion` (null limpia; ausente en payload no toca en edit).

### Capacidad (artistas)

```
tope_personas = cantidad_planificada
para_hotel_comida = tope_personas
para_transporte = tope_personas + plazas_extra_materiales
```

`plazas_extra_materiales` **solo** afecta transporte (no hotel ni comidas). UI label: **Extra Equip.** (columna/campo; error/help: “extra equip.”). Columna DB sin renombrar.

Hotelería: **PAX planificada** = `cantidad_planificada`; nominados = participantes activos; **por confirmar** = max(0, PAX − nominados). Noches = check-out − check-in. Flags **Early** (`checkin_early`) y **Late** (`checkout_late`) por artista: booleanes `default false` junto a las fechas (OFRN hospedaje usa fecha+hora en `programas_hospedajes`; FIMBA prioriza flags operativos sin horas).

**Cubiertos / comidas por estadía** (`src/utils/fimbaMealsStay.js`): a partir de check-in/out + Early/Late + PAX planificada.
- Llegada: cena; almuerzo solo si Early.
- Días intermedios: desayuno + almuerzo + cena.
- Salida: desayuno; almuerzo solo si Late.
- UI: Hotelería (matriz general + por artista) y modal Reportes comidas; Excel comidas con hojas «Por día» / «Por artista y día»; desglose opcional por régimen (nominados + por confirmar). Sin merienda.
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

**Utils:** `src/utils/fimbaExport.js` (Excel multi-hoja) · `src/utils/fimbaReports.js` (pedido texto/PDF, rooming print, comidas print, **riders print**, CNRT/paradas/hoja de ruta reusando `transportExport` / `roadmapExport`).

**UI:** `FimbaHoteleriaReports` (hub = `RoomingReportsHubModal` OFRN) · `FimbaComidasReportModal` · `FimbaTransportReportsMenu` (por vehículo; modal rango = `CnrtExportModal`).

**Permisos:** quien puede **ver** la sección puede exportar (staff OFRN management, `editor_general`, `consulta` por usuario o token de edición, tokens de artista en su ficha). No se limita al modo edición: lectura + export.

**Por artista (Hotelería):** cada tarjeta de artista en `/fimba/edicion/:id/hoteleria` tiene fila **Reportes de este artista**: Pedido hotel (hub pedido/texto/detalle/rooming acotado a esa `id_propuesta`), Rooming PDF, Excel rooming, Excel hotelería. Reusa `fimbaReports` / `fimbaExport` con `hoteleriaRows = [row]`. Los botones de cabecera (**Reportes hotelería**, Exportar hotelería/comidas) siguen siendo de toda la edición (o del filtro Artista del select). Misma disponibilidad en `readOnly` (consulta / token RO): export OK, sin Editar.

#### Matriz OFRN → FIMBA

| OFRN (nombre UI) | Formato OFRN | FIMBA ubicación | Formato FIMBA | Notas / gaps |
|------------------|--------------|-----------------|--------------|--------------|
| **Pedido Inicial** (Rooming hub) | Print + vista | Hotelería → **Reportes hotelería** (edición) o tarjeta artista → **Pedido hotel**; ficha Artista → Pedido hotel | Print/PDF + Excel plazas | Por hotel + check-in/out artista (no tramos de gira). Sexo = `fimba_participantes.genero`; sin nombre = sin sexo |
| **Texto pedido** (hotel) | Clipboard | Mismo hub → Texto pedido | Clipboard + print | Mismo texto estilo «N hombres, M mujeres. Check-in…» |
| **Detalle de pasajeros** | Print | Hub → Detalle | Print/PDF | Orden por ingreso; sin habitaciones |
| **Reporte de habitaciones** (RoomingReport) | Print/PDF | Hub → Reporte habitaciones; tarjeta Hotelería / `FimbaRoomingPanel` / Artista → Rooming PDF | Print/PDF + Excel rooming | Inventario `fimba_propuestas_habitaciones` + ocupantes |
| **Excel hotelería** (resumen/personas) | — (FIMBA) | Hotelería cabecera (edición) o tarjeta artista → Excel hotelería | Excel 3 hojas | Scope = filas pasadas al builder |
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

**Gaps honestos (UI tooltip / modal):** boarding FIMBA es por **plazas de artista** (`fimba_propuesta_rutas`), no nómina de participantes en el bus. CNRT/hoja de ruta rellenan con participantes de la propuesta (heurística por orden) y documentan plazas sin nominar. MealsReport por servicio/evento no existe en el modelo FIMBA.

### Agenda

- Agenda unificada = filas `eventos` de la gira con:
  1. **FIMBA**: tags `eventos_fimba_propuestas` y/o asignaciones `fimba_evento_transportes`
  2. **OFRN orquesta**: misma `id_gira` con `audiencia_ofrn ∈ {tutti, grupos}` o `NULL` (general histórico). No incluyen `audiencia_ofrn = 'none'`.
- Pure FIMBA (`audiencia_ofrn=none` + solo propuestas/flota) sigue listándose vía (1).
- Un evento puede ser **ambos** (tags FIMBA + convocatoria OFRN).
- **Agenda de artista** (`id_propuesta` en `listFimbaAgenda` / ficha `FimbaConsultaAgenda` / filtro artista en planilla):
  - Eventos tagged al artista **+** bloques calculados **a bordo** (traslados suben→bajan).
  - Fuente: `fimba_propuesta_rutas` con `plazas > 0` y `id_evento_subida` resuelto (`buildArtistaTrasladoAgendaBlocks` / `listFimbaArtistaTrasladoBlocks`).
  - Cada fila de ruta = un tramo continuo en un vehículo: `hora_inicio` = parada de subida; `hora_fin` = `hora_inicio` de la parada de bajada (si no hay bajada → fin vacío; si baja otro día → nota en observaciones).
  - Actividad tipo `Traslado · Origen → Destino`; badge «Traslado» (cian); vehículo `labelGiraTransporte`; # PAX = plazas de la ruta.
  - Varios rides (hop off/on) = varios bloques; multi-vehículo el mismo día = filas separadas.
  - `es_ride_segment: true` → **siempre solo lectura** (no edit/delete; se editan en planilla Transportes Subidas/Bajadas). Desactivar con `include_ride_segments: false`.
  - **No** inventa sintético legacy sin `id_propuesta` en ride (solo rutas explícitas). Sin rutas / día sin bus → sin bloques de traslado.
- Filtro planilla: **Todos / Solo FIMBA / Solo OFRN** (chips; **default Solo FIMBA**). Multi-select de **categoría de tipo** (`id_categoria` / `categorias_tipos_eventos`, dropdown `MultiSelectDropdown`; vacío = todas) alineado a UnifiedAgenda (no chips por `id_tipo_evento`). Multi-select de **locación** (`id_locacion` de filas cargadas; vacío = todas; sin `id_locacion` se ocultan si el filtro está activo). **Búsqueda** debounced 250ms (patrón UnifiedAgenda: pill + clear) sobre actividad, tipo, categoría, locación/ciudad/dirección, destino, vuelo, obs., artistas, grupos y vehículos. Opciones derivadas de filas cargadas. Filtro por artista desactiva merge OFRN puro.
- Trayectos (`solo_traslados` / página Transportes):
  - Incluye **paradas/traslados OFRN** de la gira (`id_gira`) además de trayectos FIMBA.
  - Criterio fila trayecto (`isFimbaTrasladoEvent`): `actividadUsaTransporte` **o** `eventos.id_gira_transporte` set. Un Concierto con solo `fimba_evento_transportes` **no** entra a la planilla Transportes (no es parada de boarding); si tiene ↑/↓ en `fimba_propuesta_rutas`, entra a la **secuencia de boarding** del vehículo vía `isVehicleBoardingSequenceEvent` (endpoint).
  - Merge OFRN: misma convocatoria agenda (tutti/grupos/null) **+**, en modo trayectos, paradas de flota (`id_gira_transporte ∈ giras_transportes` de la gira) aunque `audiencia_ofrn = none`.
  - **No** mezcla ensayos/ensambles OFRN (solo filas que pasan el criterio transporte).
  - Filtro origen chips (**default Todos**); multi-select **vehículo** por `giras_transportes.id` (vacío = todos; FIMBA vía `fimba_evento_transportes`, OFRN vía `id_gira_transporte`).
- Visual: badges origen FIMBA / OFRN; filas pure-OFRN muting cyan; columna convocatoria (Tutti / chips de grupo) en Agenda; en Transportes columnas origen + vehículo(s).
- Columna **Artistas** (Agenda) / **Subidas·Bajadas** (Transportes):
  - **Agenda** (sin secuencia de bus): chips de propuestas; **`Orquesta {n}`** con `n` = |roster contabilizado de la gira| (grupos ∩ countedIds; sin ausentes). Fallback `eventos.audiencia` si no hay roster.
  - **Transportes**: columnas **Subidas** / **Bajadas** vía `resolveStopBoardAlightChips` — chips FIMBA `{nombre} {plazas}` desde `fimba_propuesta_rutas`; chips OFRN por regla (`summarizeOfrnStopRules`, fallback «Orquesta n»); **Reserva del evento** (residual técnico, no removible). **Tránsito/cap** hover = a bordo al salir (`a_bordo`, Orquesta con apellidos si pocos).
- **Tipos = catálogo OFRN** (`tipos_evento` + `categorias_tipos_eventos`), mismo shape que `EventForm` / UnifiedAgenda. Persistencia: **`eventos.id_tipo_evento`** (FK). Sin tabla ni strings de tipo FIMBA-only.
- UI modal: filtro por categoría + select de tipo (nombre + color de catálogo). Planilla: badge con `tipo_nombre` / `tipo_color` y subtítulo de categoría.
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
| Staff OFRN `/fimba/*` | Login OFRN; **`isManagement`**. Full acceso a todas las ediciones. **No** hace falta fila en `fimba_usuarios`. |
| Usuario FIMBA edición | Tabla `fimba_usuarios` (mail + `clave_acceso` + `rol_fimba` + `id_edicion`). Login `/fimba/login` → `localStorage.fimba_user`. **`editor_general`**: full edición; **`consulta`**: shell RO (sin Usuarios/Contrataciones). |
| Consulta artista `/fimba/a/:token` | UUID `token_consulta` de la **propuesta**; **solo lectura**: datos del artista (check-in/out, planificada, hotel), **agenda** filtrada por tags `eventos_fimba_propuestas`, participantes |
| Consulta edición `/fimba/c/:token` | UUID `token_consulta` de la **edición** (`fimba_ediciones`); session `localStorage.fimba_consulta_edicion`; shell **solo lectura** de esa edición: Artistas, Agenda, Transportes, Hotelería; **sin** Usuarios, Contrataciones **ni Rider**; sin create/edit/delete |
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

**Enlace consulta general (`fimba_ediciones.token_consulta`):** UUID único NOT NULL default `gen_random_uuid()`. Gestión en `/fimba/edicion/:id/usuarios` (sección «Enlace consulta general edición»: copiar / regenerar). Ruta entry `/fimba/c/:token` → `FimbaEdicionConsultaEntry` → escribe `fimba_consulta_edicion` y redirige a `/fimba/edicion/:id`. Regenerar invalida el token anterior.

**Guard (`FimbaStaffGuard`):** (1) OFRN `isManagement` → allow; (2) `fimba_user` editor/consulta con match `id_edicion` (consulta bloquea `/usuarios` y `/contrataciones`); (3) sesión token `fimba_consulta_edicion` igual RO; (4) sin sesión → `/fimba/login`; (5) OFRN no-management sin sesión FIMBA → mensaje + link login FIMBA.

**`FimbaAccessContext` / `resolveFimbaAccess`:** prioridad OFRN management → editor_general → consulta user/token. Expone `readOnly`, `canSeeUsuarios`, `canSeeContrataciones`, **`canEditPropuestaMeta`**, **`canSeeRider`**, `canManageUsers`. Section toggle oculta Usuarios + Contrataciones en RO; oculta **Rider** en token `/fimba/c`.

- **`canEditPropuestaMeta`**: true solo para **OFRN management** y **`editor_general`** (misma base operativa que contrataciones). **false** para `consulta`, token `/fimba/c`, y por default en rutas token (sin provider / source `none`). **No** se infiere de `!readOnly`: los editores de artista `/fimba/e/:token` pueden planilla/agenda/rooming pero **no** meta administrativa de la propuesta (incl. rider).
- **`canSeeRider`**: true para OFRN management, `editor_general` y **`consulta` (usuario FIMBA)**. **false** para token `/fimba/c` y tokens artista `/a` `/e`. Pestaña + ficha rider = logística interna.

**UI:** `/fimba/login` (brand FIMBA); `/fimba/edicion/:id/usuarios` (alta / desactivar / regenerar clave + enlace consulta edición); header sesión externa con **Salir** (limpia también token consulta); home redirige externos/token a su edición.

**RLS (v1):** igual que la intranet OFRN — tablas accesibles con anon key; seguridad a nivel app + tokens UUID + claves de invitación. Hardening RLS/RPC queda como TODO.

**No** se clona el esquema de `integrantes`. IDs de personas OFRN (`id_integrante`) son numéricos cuando se vinculan.

### Skin

- Brand: logo textual «FIMBA»
- Acento `#d73289`, deep `#94216D`, cyan `#00b1eb` / `#2AC4EA`, texto `#222`
- Fuentes: DM Sans / Rubik (Google Fonts en layout FIMBA) con fallbacks
- **Tokens CSS** (`--fimba-*`): definidos en `.fimba-root` **y** `.fimba-modal-backdrop` porque los modales usan `createPortal(..., document.body)` y salen del árbol de `.fimba-root`. Sin eso, `var(--fimba-*)` se invalida en el portal → botones selected/primary con `color: #fff` quedaban invisibles (blanco sobre blanco).
- Primary: `.fimba-btn-primary` con hex explícito `#d73289` + texto blanco; chips segmento: `.fimba-chip` / `.fimba-chip-on` (hex fijo, no herencia).
- **Nav secciones** (staff): `FimbaSectionToggle` en header sticky (top-right) cuando hay `edicionId` — **Artistas | Agenda | Transportes | Hotelería | Rider | Contrataciones | Usuarios** (`IconMusic` / `IconCalendar` / `IconBus` / `IconBed` / `IconFileText` / `IconClipboardCheck` / `IconUsers`); activo `#d73289`. **Siempre sale del contexto artista**: `base = /fimba/edicion/:id` (nunca concatena `/artista/:n`). Artistas → `/fimba/edicion/:id` (activo también en ficha artista index). Agenda/Transportes/Hotelería/Rider/Contrataciones/Usuarios → `/fimba/edicion/:id/{segment}` edición-root. Rutas anidadas `/artista/:id/{agenda|…}` siguen válidas para deep links locales en ficha; el toggle superior no las usa. **Consulta usuario FIMBA** (`rol_fimba=consulta`): oculta Contrataciones y Usuarios; **muestra Rider** (RO + PDF). **Token `/fimba/c`**: oculta Contrataciones, Usuarios **y Rider**. Tokens `/a` `/e`: sin toggle de edición. En home de ediciones (`/fimba`) no se muestra.

- **Contrataciones** (`/fimba/edicion/:id/contrataciones`): planilla Excel de `fimba_contrataciones`. Nombre = select artista opcional (`id_propuesta` nullable; «Sin artista» en gris) + texto libre en la **misma fila**. **Monto** en ARS (es-AR) al blur; **total superior** suma montos de filas **visibles** (filtro activo). Headers **ordenables** (asc/desc; textos es; montos numéricos; vacíos al final). Filtro de nombre en el **header de la columna Nombre** (input compacto junto al título/sort). Fecha límite resol. en **negrita roja**. Flags boolean con color. Acciones por fila: **Drive** (icono carpeta → modal z-100), historial estados, eliminar. «Último estado» = presets coloreados + **Otro…**. Autosave + semáforo por fila (campos de la planilla; carpeta Drive se guarda en el modal). Columnas compactas (th+td, headers wrap): **Nº expediente** 6.5–7.25rem; **Tipo contrat.** 5.75–6.5rem; 4 flags check 3.6rem fijos. Tabla `min-width` 1080px (antes 1320). Nombre / monto / estado / Drive sin achicar.
- **Finanzas en ficha artista** (`/fimba/edicion/:id/artista/:artistaId`): bloque «Finanzas / contrataciones» con filas de `fimba_contrataciones` donde `id_propuesta` = artista (nombre, monto es-AR RO, **«Último estado» editable** con el mismo `EstadoConocidoInput` de la planilla, nº expediente RO, tipo RO). Por cada contratación: join de **Documentación Drive** (Explorar lazy si hay `carpeta_documentacion`; empty-state + link a planilla si no). Persistencia estado: `updateFimbaContratacion` → `appendFimbaContratacionEstado`. Compartido: `FimbaEstadoConocido.jsx` + `FimbaDocumentacionDrivePreview.jsx`. Vacío → «Sin contrataciones». **Visibilidad estricta:** solo `canSeeContrataciones` (editor_general / OFRN management). **No** consulta / tokens `/c` `/a` `/e`.

- **Datos generales / meta del artista** (ex modal «Editar artista»): vive **inline** en la ficha `FimbaArtistaPage` (`ArtistaMetaSection`), no en modal desde la planilla.
  - Campos: nombre, color (swatches), cantidad planificada, Extra Equip., helper hotel/comida·transporte, check-in/out + Early/Late, hotel opcional, observaciones logísticas, **rider** (rich text), estado.
  - Persistencia: `updateFimbaPropuesta` (mismo patch que el alta; `rider` HTML o `null` si vacío).
  - **Autosave + semáforo** (solo `canEditPropuestaMeta`): sin botón «Guardar cambios». Debounce ~500 ms en texto/números/rider; ~80 ms en color, fechas, flags, hotel y estado. Blur en campos de texto hace flush. Estado `idle|dirty|saving|saved|error` con dot FIMBA (`fimba-sync-*`: verde guardado/sincronizado, ámbar pendiente/guardando, rojo error). Draft incompleto (nombre vacío, números a medio tipear) se queda en yellow sin thrash de error; validación dura (rango, fechas cruzadas) y fallos de red → rojo y draft conservado.
  - **Edición:** solo si `canEditPropuestaMeta` (editor_general / OFRN management). **No** editable por consulta, `/fimba/c`, `/fimba/a`, ni **`/fimba/e`** (editores de token siguen con nómina/agenda/rooming acomodo).
  - Sin permiso: sección «Datos del artista» en solo lectura.
  - **Rider en ficha:** visible RO para consulta staff (`canSeeRider`); **oculto** en tokens `/a` `/e` y en token `/c` (`!canSeeRider`). Editor: Quill inline + mismo autosave. Imágenes inline (pegar / file picker / drag) → bucket `fimba-riders` (solo `canEditPropuestaMeta`).
  - **Documentación Drive** en la ficha: se muestra en Finanzas desde contrataciones vinculadas (no campo de meta).
  - Planilla edición: lápiz → `navigate`/`Link` a `/fimba/edicion/:id/artista/:artistaId` (ficha). Modal solo **«Nuevo artista»**. «Modo edición» de celdas en planilla se mantiene para generales.

- **Rider (pestaña edición)** (`/fimba/edicion/:id/rider`): consolida el rider de **todos** los artistas. Acordeón (abierto si hay contenido); vacíos listados para cargar. Autosave + semáforo por artista (`canEditPropuestaMeta`). Consulta usuario FIMBA: RO + **Imprimir / PDF**. Token `/c` y tokens artista: sin pestaña ni ruta (guard + `Navigate`). Editor: `FimbaRichTextEditor` (react-quill ya en el proyecto; toolbar ES; skin magenta; **imagen** en toolbar). PDF (`printFimbaRiders` / `window.print`): título «Riders — FIMBA {edición}»; **solo artistas con contenido** (`isFimbaRiderEmpty`: null, whitespace, `<p></p>` / `<br>` sin texto **y** sin `<img>` — una imagen sola cuenta). HTML sanitizado al renderizar/imprimir (`<img>` solo si `src` es el bucket `fimba-riders`). Espera a que las imágenes carguen antes de `window.print`.

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
- [x] Create/edit trayecto: flota Cap/OFRN/FIMBA/Libres/Plazas; n/m/p; Repartir; hard-block asientos + libres (OFRN+FIMBA) + tope artista
- [x] Tags artista en `eventos_fimba_propuestas`; **Asientos Equipaje** en `eventos.asientos_equipaje` (+ sync legacy `audiencia`); obs. en `observaciones_equipaje`; pasajeros = reglas boarding + tags (no este campo)
- [x] Equipaje también en `fimba_propuesta_rutas` (CRUD en StopRules / tabla Tag·Sube·Baja); **Bajar todo**; editor transporte = tabla Tag|Sube|Baja (no cloud + StopRules embebido)
- [x] OFRN bajada desde FIMBA: cierra rides abiertos (UPDATE); logistics usa `id_evento_*`; Categoria vía `target_ids`; **Bajar todo** / lista a bordo Orquesta (`alightAllOfrnAboardAtStop`)
- [x] Migración `20260825084834_fimba_equipaje_asientos_obs` Local = Remote (deploy linked)
- [x] Capacidad en UI: por unidad rolling en tránsito (OFRN subida/bajada + plaza_extra + plazas FIMBA) vs `capacidad_maxima`; overbook y libres; locación en planilla
- [x] UI distingue **Vehículos** vs **Trayectos**; alta/edición de vehículo embebida (`addFimbaVehiculo` / `updateFimbaVehiculo`)
- [x] Agenda unificada (multi-tipo actividad) + filtro artista
- [x] Planilla muestra orquesta OFRN (tutti/grupos) + badges origen + filtro Todos/FIMBA/OFRN (default FIMBA) + categoría (dropdown multi)
- [x] Trayectos/Transportes: merge paradas OFRN (tipo transporte / `id_gira_transporte`) + filtro origen default **Todos** + chips por vehículo (`giras_transportes`)
- [x] Audiencia OFRN: None | Tutti | multi-select `giras_grupos` → `eventos_grupos`
- [x] Tipos de evento desde catálogo OFRN (`tipos_evento`); sin presets hardcodeados FIMBA
- [x] Detección transporte alineada a categoría 6 + ids OFRN (11/12/28/31/35)
- [x] Hotelería: reporte por artista (checkin/out, early/late, noches, nominados, por confirmar) + hotel opcional (`fimba_propuestas.id_hotel`)
- [x] Rooming por artista: `fimba_propuestas_habitaciones` + `fimba_habitaciones_ocupantes` (SGL/DBL/TPL/QAD + matrimonial); inventario admin + acomodo token
- [x] Cupos rooming: feedback live de plazas borrador vs roster activo (faltan / exacto / sobran) antes de «Aplicar cupos»
- [x] Migración `20260811140000_fimba_habitaciones` deploy linked
- [x] Migración `20260810180000_fimba_propuestas_id_hotel` deploy linked
- [x] Migración `20260810190000_fimba_propuestas_checkin_early_checkout_late` deploy linked
- [x] Migración `20260811090000_fimba_propuestas_observaciones_logisticas` deploy linked
- [x] Lista artistas (`/fimba/edicion/:id`): IN/OUT + Early/Late visibles; modo planilla con autosave + semáforo (patrón MealsManager / GiraForm)
- [x] `observaciones_logisticas` por artista: planilla + ficha (sección datos/meta; **no** editable por token `/e`) + export TSV hotelería
- [x] Meta artista (color, cupos, hotel, fechas, estado, obs., rider): **inline en ficha** `FimbaArtistaPage` con `canEditPropuestaMeta`; lápiz planilla → ficha; modal solo alta
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
- [x] `fimba_propuesta_rutas` + UI Subidas/Bajadas (`FimbaStopRulesManager`: plazas artista + StopRules OFRN)
- [x] Bajada FIMBA libera plazas: dropdown a bordo / cierra ride (`id_evento_bajada`); tope = solo rides abiertos
- [x] Labels planilla Transportes: `Orquesta {en_lugar}` + `{nombre} {n}` desde `isPresentAtStop` (no roster estático por fila)
- [x] Transportes **Modo edición** + semáforo (planilla trayectos + flota); `patchFimbaEventoPlanilla` sin tocar boarding/↑↓
- [x] `fimba_contrataciones` + planilla staff `/fimba/edicion/:id/contrataciones` (inline edit + semáforo; migración `20260811110000`)
- [x] Planilla Contrataciones: columnas compactas expediente / tipo / 4 checks (th+td; headers wrap); tabla min-width 1080px
- [x] «Último estado conocido»: presets color UI (Factura presentada/emitida/pedida, Pagado) + texto libre; log append-only `fimba_contrataciones_estado_log` (`20260811130000`); historial modal con fecha + autor

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
- [x] Usuarios staff: listado/alta/edición `fimba_usuarios` en `/fimba/edicion/:id/usuarios` (`FimbaUsuariosPage`)
- [x] Enlace consulta general edición: `fimba_ediciones.token_consulta` + `/fimba/c/:token` + sección en Usuarios (copiar/regenerar); shell RO sin Usuarios/Contrataciones
- [x] Rol `consulta` (login) entra al shell en read-only (mismo recorte de secciones; **sí** ve Rider RO + PDF)
- [x] Pestaña **Rider** `/fimba/edicion/:id/rider`: consolida riders; autosave editores; PDF `printFimbaRiders`; imágenes inline (`fimba-riders`); oculta en token `/c`
- [x] Contrataciones staff: planilla `fimba_contrataciones` en `/fimba/edicion/:id/contrataciones` (inline + semáforo; artista opcional + nombre libre; estado presets + historial)
- [x] Ficha artista: finanzas/contrataciones form (solo `canSeeContrataciones` = editor_general / OFRN; oculto a consulta y tokens); «Último estado» editable con `EstadoConocidoInput` compartido + `updateFimbaContratacion`/estado log
- [x] Migración `20260811130000_fimba_contrataciones_estado_log` + deploy linked
- [x] Edición planilla: columnas check-in/out (+ Early/Late) + hotel; **Modo edición** (celdas inline) + **semáforo** por fila (verde guardado / amarillo pendiente·guardando / rojo error)
- [x] Planilla artistas: sin columnas **Color** / **Estado** (dot de color junto al nombre; color/estado en ficha artista con `canEditPropuestaMeta`)
- [x] Planilla artistas: lápiz → `/fimba/edicion/:id/artista/:artistaId` (ficha general); modal solo **Nuevo artista**
- [x] Ficha artista: sección **Datos generales** (meta/logística + rider rich-text + carpeta documentación Drive con preview) editable solo `canEditPropuestaMeta` con **autosave + semáforo** (sin botón Guardar); RO para consulta staff; rider **oculto** en tokens `/a` `/e` `/c`; nómina/agenda/rooming independientes
- [x] Documentación Drive en contrataciones: modal planilla + preview ficha artista (join multi-contrato) + Explorar lazy + copiar/descargar/subir + drag&drop OS
- [x] Edición: filas de artista **expandibles** (chevron); nómina lazy `listFimbaParticipantes`; subheader nominados/planificada; nested table read-only con col **Género** (también en modo planilla). Keys de expand normalizados (`propuestaKey`); estado como object (no `Set`); load fuera del setState; soft-reload no desmonta la planilla; errores de nómina visibles + Reintentar
- [x] Detalle artista: participantes + `genero` + tipo_alimentacion (+ nota «Otros…»); deep links opcionales `/artista/:id/{agenda|transportes|hoteleria}` (toggle superior → secciones edición-root sin `/artista`)
- [x] Detalle artista / token edición: **planilla Excel de participantes** (`FimbaArtistaPage` → `ParticipantesPlanilla`): celdas apellido, nombre, documento, **genero**, alimentación (select presets + **Otros...** → `nota_alimentacion`), activo; semáforo por fila; Enter o blur guarda; Tab navega; fila inferior = alta `createFimbaParticipante`; delete por fila; consulta token read-only
- [x] Alimentación: CHECK en `fimba_participantes.tipo_alimentacion` (regular/vegetariano/vegano/celiaco/sin_tacc/otro); free text en **`nota_alimentacion`** (sin migración); UI `AlimentacionInput` (select + input **siempre en fila** al elegir Otros…; `flex-wrap: nowrap` + `width:auto !important` / estilos inline p/ vencer `.fimba-cell-input{width:100%}`; `FimbaAlimentacionStyles` montado en `ParticipantesPlanilla`, no solo en finanzas). **Detalle comidas / Excel / PDF / texto:** solo excepciones (≠ `regular`) + fechas check-in→check-out del artista.
- [x] Regenerar / copiar tokens consulta y edición
- [x] Editor transportes: panel **Vehículos** (alta + editar lápiz: catálogo, detalle, plazas, categoría; nombre catálogo+patente, detalle OFRN sec.) + planilla **Trayectos** (= eventos FIMBA + paradas OFRN; filtros origen/vehículo)
- [x] Agenda unificada planilla (fecha, horas, tipo, actividad, destino/vuelo, vehículos, PAX, tags)
- [x] Planilla agenda: badges FIMBA/OFRN + convocatoria + filtro origen (default Solo FIMBA) + multi-select **categoría** y **locación** + búsqueda debounced (tipo/actividad/lugar/personas/vehículos)
- [x] Hotelería reporte + edición checkin/out/early/late/hotel + export TSV (cols Early/Late) + cupos habitaciones + rooming resumen
- [x] Hotelería: carga batch (participantes + habitaciones), refresh por artista post-edición sin full reload
- [x] Transportes: carga deduplicada (cache edicion/propuestas/flota; sin hotelería completa); spinner solo 1ª carga; soft refresh por slice (rutas / eventos / logistics OFRN) tras ↑↓, reserva, evento, destino
- [x] Transportes perf (save/load): Sube/Baja inline = upsert + patch local + debounce refresh rutas (sin 2× list + await planilla); Guardar evento = pre-checks paralelos + tags/veh/grupos en paralelo + `clientValidated` (sin re-fetch logistics); post-Guardar solo slice `eventos`
- [x] Hotelería: exports por artista en cada tarjeta (Pedido hotel hub + Rooming PDF + Excel rooming/hotelería; cabecera edición intacta)
- [x] Ficha artista + token edición: panel **Hotelería / rooming** (`FimbaRoomingPanel`); consulta token RO

### UI tokens

- [x] `/fimba/a/:token` solo lectura (tabla participantes con **Género**, sin planilla)
- [x] `/fimba/e/:token` edición externa = planilla de participantes + **agenda editable** + **rooming (acomodo)**
- [x] `/fimba/c/:token` consulta general edición = shell staff read-only (Artistas/Agenda/Transportes/Hotelería; no Usuarios/Contrataciones/**Rider**)
- [x] Consulta token: **agenda de read-only** del artista (`listFimbaAgenda(edicion, { id_propuesta })` → tags `eventos_fimba_propuestas` **+** bloques traslado suben→bajan desde `fimba_propuesta_rutas`; sin merge pure-OFRN como staff al filtrar artista)
- [x] Consulta artista `/fimba/a`: rooming read-only (`FimbaRoomingPanel`)
- [x] Consulta: columnas planilla lean — fecha, horas, tipo, actividad, destino/vuelo, vehículo(s) si transporte, # PAX; sin create/edit/delete ni filtros origen/categoría
- [x] Consulta: datos básicos artista — check-in/out (+ Early/Late), planificada, hotel si hay; skin FIMBA; errores de carga de agenda en banner
- [x] Detalle artista staff + token edición: sección **Agenda** editable (`FimbaConsultaAgenda` `editable`) — listado tags propuesta, **Nuevo evento** / editar / eliminar vía `FimbaEventoFormModal` con `lockPropuesta` (tag obligatorio a ese artista); refresh tras save/delete; consulta `/fimba/a` sin cambios (RO)
- [x] Agenda artista: bloques **Traslado** calculados (board→alight / plazas > 0) mergeados cronológicamente; RO aunque el resto de la agenda sea editable; planilla staff con filtro artista igual

### Stub / deferred

- [x] Tabla `fimba_evento_transportes` en SQL
- [x] Helper métricas FIMBA por ventana (`listVehiclesAvailability` batch / `computeFimbaVehicleWindowMetrics` / `sumFimbaPlazasInWindow`) — libres = cap − OFRN − FIMBA (rides)
- [x] Helper boarding rolling `fimbaTransportBoarding` + carga logística OFRN (`loadFimbaTransportLogisticsSummary`)
- [x] Planilla Transportes: columna **Destino** (next stop mismo vehículo) + **Hora fin** guardada o calculada (`next.hora_inicio`) con estilo distinto
- [x] Planilla Transportes: **+** entre Locación y Destino → create modal parada intermedia (midpoint / +30m; mismo vehículo; `audiencia_ofrn=none`)
- [x] UI de asignación multi-vehículo por evento (trayectos): tabla flota Cap/OFRN/FIMBA/Libres/Plazas + banner + **Repartir** + resumen vs tope + hard-block asientos/libres(OFRN+FIMBA)/tope en modal y `saveFimbaEvento`
- [x] Agenda grilla FIMBA (planilla multi-tipo)
- [x] Reportes hotel (lista + cupos; sin rooming graph)
- [x] Paridad reportes OFRN→FIMBA: pedido/texto/detalle/rooming (print+Excel); comidas (texto/PDF/Excel + **cubiertos por día** check-in/out general/artista; sin asistencia por-evento); CNRT + paradas + hoja de ruta (PDF/Excel) por vehículo
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
4. Crear artistas con cupos; abrir artista → planilla de participantes (Excel): cargar personas en celdas; fila inferior = alta; Enter/blur guarda; semáforo por fila; delete opcional.
5. En listado de edición: ver **Check-in / Check-out / Hotel**; badges **Early** / **Late** si aplican; activar **Modo edición** y editar celdas (nombre, planificada, extras, fechas + early/late, hotel, obs.). Semáforo: amarillo al editar, verde al guardar, rojo si falla Supabase/validación. **Lápiz** → ficha artista (color/estado/meta completa).
6. Expandir fila de artista (chevron / nombre): ver nested nómina (nominados/planificada); vacío = «Sin nómina cargada» + link. Multi-expand OK; lazy load por artista.
7. Copiar enlace consulta y abrir en incógnito (`/fimba/a/...`); verificar solo lectura (participantes tabla RO, sin planilla editable).
8. En consulta: ver **Datos del artista** (check-in/out, planificada) + **Agenda** filtrada a ese artista (eventos tagged); sin botones de editar/eliminar eventos.
9. Enlace edición (`/fimba/e/...`): planilla de participantes + **Agenda** + **rooming** (acomodo); **sin** editar meta (color, cupos admin, hotel, estado, obs. log., rider); sin login OFRN. **Sin** campo Rider (logística interna).
10. Staff ficha artista (`/fimba/edicion/:id/artista/:artistaId`): **Datos generales** (meta editable solo editor_general/OFRN, incl. rider rich-text) + agenda + rooming (cupos + acomodo) + enlaces tokens + participantes. **Editor_general / OFRN:** bloque finanzas (contrataciones del artista); consulta ve meta/rider RO; tokens `/a` `/e` y `/c` no ven rider.
11. Edición → **Rider** (`/fimba/edicion/:id/rider`): listar artistas; editar (generales) o RO (consulta usuario); **Imprimir / PDF** solo incluye artistas con texto o imágenes. Pegar / file picker / drop de imagen (editores) → bucket `fimba-riders`. Token `/c`: pestaña oculta.

### Agenda

1. Edición → **Agenda** (`/fimba/edicion/:id/agenda`).
2. Ver planilla mixta: eventos FIMBA + orquesta OFRN (badges origen). Filtrar **Todos / Solo FIMBA / Solo OFRN**.
3. **Nuevo evento**: tipo del catálogo OFRN (filtro categoría opcional), fecha, horas, tag artistas, Asientos Equipaje. Default tipo «Nuevo evento» (16).
4. Tipos Transporte / traslados OFRN abren flota + SIN SERVICIO; otros: sin vehículo salvo «Asignar vehículo(s) al trayecto».
5. **Audiencia OFRN**: Ninguna | Tutti | Grupos (multi-select real de grupos de la gira). Al guardar con Grupos se escriben `eventos_grupos`.
6. Editar un ensayo pure-OFRN desde FIMBA (staff) y agregar tags artista / cambiar audiencia — se guarda sin romper FK de transporte OFRN.
7. Filtrar por artista (oculta pure OFRN; solo tagged). Columna Tipo = nombre/color de `tipos_evento`. Default origen **Solo FIMBA**; dropdown multi-select de **categoría** (`id_categoria`; vacío = todas).

### Transportes (vehículos ≠ trayectos)

1. FIMBA: **Transportes** (`/fimba/edicion/:id/transportes`).
2. Panel **Vehículos**: lista `giras_transportes`; **Agregar vehículo**; columnas Capacidad / Pico en tránsito / Libres (pico).
3. Alternativa: OFRN Logística → Transporte de la misma gira.
4. Planilla **Trayectos**: filas FIMBA + paradas/traslados OFRN (badges origen). Default origen **Todos**.
5. Chips **Vehículo**: vacío = todos; seleccionar unidad filtra filas y ancla métricas de boarding a esa secuencia.
6. Columnas planilla: **Origen** · **Fecha** · **Com·Fin** · **Actividad** · **Locación** · **+** · **Destino** · **Vehículo** · **Subidas** · **Bajadas** · **Tránsito/cap** · acciones. Sticky izq. Origen/Fecha/Com. Scroll horizontal en wrapper (tabla `max-content`). Chips Subidas/Bajadas (clic → modal; × quita FIMBA; Reserva del evento visible). **Hora fin** en celda Com·Fin (itálica/cián si calculada). Alerta **Sobre cupo** si en_transito > capacidad; Tránsito/cap hover = desglose a bordo.
7. Paridad OFRN: músico con `plaza_extra` cuenta 2 plazas; subida/bajada desde reglas de ruta de la gira.
8. **Nuevo trayecto** (y **Editar evento**): la flota aparece en tabla con **Cap. / OFRN / FIMBA / Libres / Plazas**. Elegí 3 buses y poné p.ej. 44 + 44 + 32 (organismo 120). **Repartir N plazas** llena los marcados (o toda la flota si no hay ninguno) sin pasar cupo. SIN SERVICIO = cero vehículos. Default al tildar = min(resto tope artista, cupo). Asientos Equipaje default = Σ extras taggeados; no alimenta Repartir. En transporte: tabla **Tag | Sube | Baja** (`SearchableSelect` para agregar; Sube/Baja tras guardar). En Gestionar Bajadas (planilla): **Bajar todo**.
9. **+** entre Locación y Destino en una fila con vehículo: modal «Parada intermedia» pre-filled (fecha/hora midpoint o +30m; mismo bus; plazas 0); al guardar aparece en secuencia y recalcula Destino/Hora fin de vecinos.
10. Modal asignación: `listVehiclesAvailability` → libres = max(0, capacidad − OFRN a bordo − FIMBA a bordo) en la ventana (rides que solapan fecha/hora; OFRN con `plaza_extra`; FIMBA = explícitas + residual sintético de `fimba_evento_transportes`). Excluye plazas FIMBA del evento en edición. Hard-block: plazas ≤ capacidad; plazas ≤ libres; Σ ≤ tope artistas. UI: columnas Cap/OFRN/FIMBA/Libres/Plazas. Persistencia: N filas `fimba_evento_transportes`. Conteo alineado a planilla (OFRN+FIMBA); residual sintético si ↑ parcial; solape de puntos (mismo inicio sin hora_fin).

**Carga (`FimbaTransportPage`):** spinner full-page solo en la **primera** visita. `listFimbaTraslados` / `listFimbaPropuestaRutas` aceptan `edicion` + `propuestas` (+ `flota`) cacheados para no re-fetch. Participantes CNRT = batch liviano (`listFimbaParticipantesForPropuestas`, sin habitaciones) en background. Tras editar: refresh quirúrgico — rutas (↑↓ FIMBA), eventos+rutas (reserva/modal evento), logistics (Orquesta OFRN); la planilla permanece visible.

### Hotelería

1. Edición → **Hotelería** (`/fimba/edicion/:id/hoteleria`).
2. Ver PAX planificados, nominados, por confirmar; expandir personas; badges Early/Late junto a fechas; badges de **inventario** (ej. «3 DBL, 1 SGL») y ocupadas/plazas rooming.
3. **Editar**: check-in/out, toggles Early/Late, hotel del catálogo `hoteles`, **cupos por tipo** (Single/Doble/Triple/Cuádruple). Tras guardar, la tarjeta del artista se actualiza con `getFimbaHoteleriaRow` (sin recargar toda la edición ni spinner full-page).
4. Cabecera: **Reportes hotelería** / comidas / Excel (toda la edición o filtro Artista). Por tarjeta: **Pedido hotel**, Rooming PDF, Excel rooming, Excel hotelería (scope = esa propuesta; OK en readOnly).
5. Expandir artista: columna Habitación + lista rooming; **Copiar tabla (Excel)** (TSV + cols habitaciones).
6. Ficha artista o `/fimba/e/:token`: panel **Hotelería / rooming** — staff aplica cupos; editor asigna personas a plazas; matrimonial en multi; consulta `/fimba/a` RO.

**Carga (`listFimbaHoteleria`):** participantes + habitaciones en **batch** (2 queries por edición, no N+1 secuencial). La página deduplica edición/propuestas y muestra spinner solo en la primera carga; cambio de filtro Artista = refresh inline.

### Contrataciones

1. Edición → **Contrataciones** (`/fimba/edicion/:id/contrataciones`).
2. Planilla: nº expediente, nombre (artista opcional en gris vacío + texto libre lado a lado), monto (ARS es-AR), fecha límite (rojo), tipo, 4 flags de estado, último estado. Anchos fijos/compactos en expediente, tipo y checks (headers wrap); nombre/monto/estado/Drive no se comprimen.
3. Barra superior **Total montos** = suma de `monto` de filas visibles (tras filtro de nombre; magenta FIMBA). Cabeceras clickeables para ordenar; filtro nombre en header de columna Nombre.
4. Fila vacía inferior = alta; blur/Enter/check guarda con semáforo; eliminar por fila.
5. **Último estado conocido** (planilla y ficha artista): `<select>` nativo con presets coloreados + opción **Otro…** (solo UI; DB = texto libre):
   - Factura presentada (azul claro)
   - Factura emitida (violeta claro)
   - Factura pedida (rosa claro)
   - Pagado (verde claro)
   «Otro…» revela input libre; valor custom existente → select en Otro… + texto editable. Color del select si matchea preset. **No** se duplica badge bajo el control (badge solo en modal historial). Componente: `FimbaEstadoConocido.jsx` (`EstadoConocidoInput` / `EstadoConocidoBadge`).
6. Cada cambio de estado **inserta** en `fimba_contrataciones_estado_log` y actualiza el denormalizado `ultimo_estado_conocido` vía `updateFimbaContratacion` → `appendFimbaContratacionEstado`. Autor = sesión OFRN (nombre/mail integrantes) o `fimba_user` (nombre/mail). En ficha artista: commit al elegir preset o blur de texto libre; semáforo local en la etiqueta.
7. Botón historial (ícono) por fila en planilla → modal «Ver historial»: estado + timestamp + quién, cronológico (badge solo en modal).
8. **Documentación Drive** (modal carpeta / ficha artista con Explorar): con permiso de subida, arrastrar archivos desde el Explorador al listado → overlay «Soltá para subir a esta carpeta»; aterrizan en la carpeta del breadcrumb. Viewers no ven overlay. Carpetas OS se omiten; archivos > ~4 MB se rechazan.

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
| `/fimba/edicion/:id/contrataciones` | Contrataciones / expedientes (`fimba_contrataciones`) |
| `/fimba/edicion/:id/usuarios` | Usuarios FIMBA de la edición (`fimba_usuarios`) |
| `/fimba/edicion/:id/artista/:artistaId` | Detalle artista: agenda + rooming + planilla participantes + tokens (+ finanzas solo `canSeeContrataciones`) |
| `/fimba/edicion/:id/artista/:artistaId/agenda` | Agenda filtrada (planilla unificada staff) |
| `/fimba/edicion/:id/artista/:artistaId/transportes` | Trayectos filtrados |
| `/fimba/edicion/:id/artista/:artistaId/hoteleria` | Hotelería filtrada |
| `/fimba/a/:token` | Consulta token (agenda RO + datos artista + participantes RO + rooming RO) |
| `/fimba/e/:token` | Edición token (planilla participantes + agenda + rooming acomodo) |
| `/fimba/c/:token` | Consulta general edición (shell RO; sin Usuarios/Contrataciones) |

---

## Archivos clave

| Path | Notas |
|------|--------|
| `supabase/migrations/20260810170000_fimba_plataforma_base.sql` | Schema base; `fimba_evento_transportes` → FK `giras_transportes` |
| `supabase/migrations/20260810180000_fimba_propuestas_id_hotel.sql` | `id_hotel` opcional |
| `supabase/migrations/20260810190000_fimba_propuestas_checkin_early_checkout_late.sql` | `checkin_early` / `checkout_late` boolean default false |
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
| `src/utils/fimbaUserSession.js` | Sesiones `fimba_user` + `fimba_consulta_edicion` + `resolveFimbaAccess` |
| `src/hooks/useFimbaUserSession.js` | Hook reactivo de sesión FIMBA usuario |
| `src/hooks/useFimbaConsultaEdicionSession.js` | Hook sesión enlace consulta edición |
| `src/context/FimbaAccessContext.jsx` | `readOnly` / `canEditPropuestaMeta` / flags de secciones en shell staff |
| `src/views/Fimba/FimbaLoginPage.jsx` | Form `/fimba/login` |
| `src/views/Fimba/FimbaEdicionConsultaEntry.jsx` | Entry `/fimba/c/:token` → session + redirect |
| `src/utils/fimbaTransportBoarding.js` | Secuencia + en tránsito + chips (`resolveStopBoardAlightChips` / `summarizeOfrnStopRules`) + tooltip a bordo + opciones bajada |
| `src/views/Fimba/FimbaStopRulesManager.jsx` | Modal planilla: reglas grupo+cantidad+equipaje; Reserva; **Bajar todo** FIMBA; StopRules OFRN `embedded` (+ Bajar todo orquesta) |
| `src/views/Fimba/FimbaEventoArtistasBoardingTable.jsx` | Editor transporte: Tag \| Sube \| Baja + `SearchableSelect` alta; sync `fimba_propuesta_rutas` |
| `src/views/Fimba/FimbaEventoFormModal.jsx` | Modal agenda + flota; Asientos/Obs. Equipaje; Repartir; tabla Sube/Baja; **Orquesta OFRN** (StopRules embedded + sortedEvents); dirty-guard cierre |
| `src/views/Giras/StopRulesManager.jsx` | Reglas `giras_logistica_rutas`; cierra rides abiertos; lista a bordo + **Bajar todo**/Bajar; confirms z-110 embedded |
| `src/services/fimbaService.js` | Rutas FIMBA + `alightAllFimbaAboardAtStop` + `alightAllOfrnAboardAtStop` / `alightOfrnPeopleAtStop` |
| `src/views/Fimba/FimbaLayout.jsx` | Skin + header sticky + toggle + sesión/logout FIMBA |
| `src/views/Fimba/FimbaSectionToggle.jsx` | Segmented control; oculta Contrataciones/Usuarios en consulta; Rider si `canSeeRider` |
| `src/views/Fimba/FimbaRiderPage.jsx` | Pestaña Rider: acordeón + autosave + Imprimir/PDF (texto o imágenes) |
| `src/views/Fimba/FimbaRichTextEditor.jsx` | Quill FIMBA (magenta, ES); imagen paste/picker/drop; RO = HTML sanitizado |
| `src/utils/fimbaRider.js` | Vacío = sin texto ni imágenes; sanitize `<img>` allowlist bucket |
| `supabase/migrations/20260813130000_fimba_riders_storage.sql` | Bucket `fimba-riders` público + policies |
| `src/views/Fimba/FimbaContratacionesPage.jsx` | Planilla expedientes: inline + semáforo; modal Documentación Drive; estado presets + historial |
| `src/views/Fimba/FimbaEstadoConocido.jsx` | Control compartido «Último estado» (presets + Otro… + badge historial) |
| `src/views/Fimba/FimbaUsuariosPage.jsx` | Usuarios FIMBA + enlace consulta general edición |
| `src/views/Fimba/FimbaStaffGuard.jsx` | isManagement **o** fimba_user **o** token consulta edición |
| `src/views/Fimba/FimbaEdicionPage.jsx` | Artistas + modo planilla + semáforo; alta modal; lápiz → ficha |
| `src/views/Fimba/FimbaArtistaPage.jsx` | Detalle: meta + finanzas (Drive desde contratos) + agenda + rooming + planilla; finanzas si `canSeeContrataciones` |
| `src/views/Fimba/FimbaConsultaAgenda.jsx` | Agenda por tag artista + ride segments RO; create/edit/delete en tagged |
| `src/views/Fimba/FimbaAgendaPage.jsx` | Planilla agenda (tipo/color catálogo); ride segments al filtrar artista |
| `src/utils/fimbaTransportBoarding.js` | Boarding + `buildArtistaTrasladoAgendaBlocks` / merge |
| `src/views/Fimba/FimbaTransportPage.jsx` | Vehículos + trayectos + columnas boarding / locación |
| `src/views/Fimba/FimbaHoteleriaPage.jsx` | Hotelería + hub reportes edición + **exports por tarjeta artista** (pedido/rooming/Excel) + comidas |
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
   - Abrir en incógnito: shell RO de esa edición (Artistas, Agenda, Transportes, Hotelería; **sin Rider**).
   - **Regenerar** invalida el enlace anterior (`fimba_ediciones.token_consulta`).
4. **Logout FIMBA**: botón **Salir** en el header (sesión usuario y/o token consulta).
5. Staff OFRN sigue entrando por login intranet (`isManagement`) sin registro en `fimba_usuarios`.

## Incidente: Agenda → ediciones (2026-08-10)

- **Síntoma:** click **Agenda** (y similares) parecía caer en listado de ediciones.
- **Causa:** `FimbaStaffApp` tenía catch-all `<Route path="*" element={<Navigate to="/fimba" replace />} />`. Cualquier no-match (ruta incompleta durante HMR, path mal resuelto, chunk en error) **redirigía en silencio al home de ediciones**, indistinguible de un enlace roto a agenda.
- **Links:** ya apuntaban a absolutos `/fimba/edicion/:id/agenda|transportes|hoteleria` (y variante artista); el guard no alteraba el path.
- **Fix:** rutas staff anidadas (`edicion/:id` → `agenda` / `transportes` / `hoteleria`); 404 con mensaje + link manual (sin auto-redirect a `/fimba`).
