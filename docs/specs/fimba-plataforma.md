# FIMBA — Plataforma de festival (dependiente de OFRN)

Spec viva del vertical (foundation + transporte + agenda unificada + hotelería).

## Producto

FIMBA es una aplicación de festival con skin propia bajo `/fimba/*`, que reutiliza la flota/logística de la gira OFRN enlazada y no clona el esquema de `integrantes`.

### Modelo de datos

| Tabla | Rol |
|-------|-----|
| `fimba_ediciones` | Edición del festival; **1:1** con `programas` vía `id_gira` |
| `fimba_propuestas` | UI «Artista»: cupos, colores, tokens, fechas checkin/out, flags `checkin_early` / `checkout_late`, `id_hotel` opcional → `hoteles`, `observaciones_logisticas` (texto libre) |
| `fimba_participantes` | Personas del artista (entidad propia; `id_integrante` opcional bigint). **`genero`**: `femenino` \| `masculino` \| `otro` \| `sin_especificar` (default). No vive en la propuesta: el artista es el grupo; el sexo/género es de cada persona. |
| `fimba_usuarios` | Usuarios externos por edición: mail + `rol_fimba` (`editor_general` \| `consulta`) + `clave_acceso` / `token_login`. Staff OFRN (`isManagement`) no se registra aquí. |
| `eventos.audiencia_ofrn` | `none` \| `tutti` \| `grupos` |
| `eventos_fimba_propuestas` | Tags artista ↔ evento |
| `fimba_evento_transportes` | Plazas FIMBA de un **trayecto** sobre una **unidad de flota** (`giras_transportes`) (legacy / asignación modal; residual sintético de boarding) |
| `fimba_propuesta_rutas` | Subida/bajada FIMBA por **artista + cantidad de plazas** en una unidad (`giras_transportes`); análogo a `giras_logistica_rutas` sin id_integrante |
| `fimba_contrataciones` | Planilla expedientes/contrataciones por edición: nº expediente, nombre (texto y/o `id_propuesta`), monto, fecha límite resol., tipo, flags firma/doc/ADM, `ultimo_estado_conocido` (denorm.), `orden` |
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
- **Planilla trayectos (UI):** scroll horizontal en `.fimba-planilla-scroll` (`overflow-x: auto`); tabla `width: max-content` (no se aplasta a 0). Columnas: Origen · Fecha · Com·Fin · Actividad · Locación · + · Destino · Vehículo · Mov. · Δ · Tránsito/cap · Artistas · acciones. Sticky izq.: Origen + Fecha + Com·Fin. Se eliminaron Cap/Libres/# PAX sueltos (cap y libres van en **Tránsito/cap** + tooltip; pax en badges de Artistas). Shell Transportes full-bleed (`.fimba-main:has(.fimba-transport-wide)` sin `max-width` de 1200px).

**Capacidad / en tránsito (criterio OFRN)** se calcula **por unidad** (`giras_transportes`), con paradas ordenadas por fecha+hora:

```
OFRN: subida/bajada por persona vía giras_logistica_rutas → logistics.transports.subidaId/bajadaId
      asientos = 1 + (instrumentos.plaza_extra ? 1 : 0)   // = GirasTransportesManager / ofrnSeatWeight
      a bordo al salir de i (en_transito cap): upIdx ≤ i && (sin bajada | downIdx > i)
      presente en parada i (labels «en el lugar»): upIdx ≤ i && (sin bajada | downIdx ≥ i)  // isPresentAtStop
FIMBA (rutas explícitas): fimba_propuesta_rutas (id_propuesta, id_gira_transporte, plazas, id_evento_subida, id_evento_bajada)
      headcount por cantidad (no nomina de id_participante); default plazas = para_transporte
FIMBA (legacy sintético): plazas en fimba_evento_transportes (o suma para_transporte de tags si plazas=0)
      sube en el evento de asignación; baja en la siguiente parada de la unidad
      solo si no hay subida explícita en fimba_propuesta_rutas para ese board-event+unidad
en_transito = Σ asientos OFRN a bordo (isOnBoardAfterStop) + Σ plazas FIMBA a bordo
en_lugar (labels Artistas columna Transportes):
  Orquesta n     = Σ ofrnSeatWeight present at stop (isPresentAtStop) sobre unidad(es) de la fila
  {nombre} n     = Σ plazas FIMBA presentes en parada por propuesta (explicit + residual synthetic)
libres = max(0, capacidad_maxima − en_transito); overbook si en_transito > capacidad
```

No usa tipos_evento Arribo/Salida: la parada es el evento; el sentido sube/baja viene de las reglas (OFRN / `fimba_propuesta_rutas`) o del sintético FIMBA.

Helper puro: `src/utils/fimbaTransportBoarding.js`. Carga OFRN: `loadFimbaTransportLogisticsSummary` (reusa `calculateLogisticsSummary` + passengers/admissionRules/regions/localities). Rutas FIMBA: `listFimbaPropuestaRutas` / `upsertFimbaPropuestaRutaStop` / `clearFimbaPropuestaRutaStop`.

**UI subidas/bajadas (planilla Transportes):** botones **↑ / ↓** por fila → `FimbaStopRulesManager` (portal z-[100]):
- pestaña **Artistas FIMBA**: cantidad + vehículo → `fimba_propuesta_rutas` (paridad operativa con StopRules, pero plazas).
- pestaña **Orquesta OFRN**: embebe `StopRulesManager` **inline** (`embedded`) en la misma modal (sin segundo full-screen; evita stack z-[70] detrás del backdrop FIMBA). Props: `event`, `type`, `transportId` (vehículo), `giraId`, `passengers`/`admissionRules`/`regions`/`localities` OFRN, `supabase`. Tabla: `giras_logistica_rutas` (IDs integrantes numéricos). Modal standalone OFRN usa `z-[100]`.

En UI FIMBA (`/transportes`):

1. **Vehículos** — listado de `giras_transportes` de `fimba_ediciones.id_gira` + alta/edición embebida (`addFimbaVehiculo` / `updateFimbaVehiculo`, mismo path que OFRN: catálogo, detalle, plazas, categoría). Columnas: **Vehículo**, **Nota OFRN**, categoría, **Capacidad**, **Pico en tránsito**, **Libres (pico)** + lápiz editar.
2. **Trayectos** — planilla cronológica; columnas de boarding por unidad (filtrar un vehículo para la secuencia completa).

- **No** master `fimba_transportes`.
- Alta también posible en OFRN: gira → Logística → Transporte.
- Sin vehículos: trayectos solo **SIN SERVICIO** (cero filas en `fimba_evento_transportes`).
- **Modal asignación** (`FimbaEventoFormModal`): multi-vehículo con plazas editables; labels `Nombre · N libres / Cap`; resumen Σ asignadas vs tope artista (`para_transporte`); hard-block al guardar si plazas > libres o Σ > tope. Libres de ventana vía `listVehiclesAvailability` (solape FIMBA); planilla Transportes usa en tránsito rolling.
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
- **Hora fin (planilla Transportes)**: valor persistido `eventos.hora_fin` (editable en modal evento / `saveFimbaEvento`). Si null/vacío → display = `hora_inicio` del next stop del mismo vehículo (`hora_fin_display.isCalculated`); estilo cian itálico vs hora guardada en normal. Helper: `resolveHoraFinDisplay`. Al insertar una intermedia, Destino/Hora fin calculados de la fila anterior se actualizan al apuntar al nuevo next (sin escribir `hora_fin` en vecinos).
- **`saveFimbaEvento`**: acepta `id_locacion` (null limpia; ausente en payload no toca en edit).

### Capacidad (artistas)

```
tope_personas = cantidad_planificada
para_hotel_comida = tope_personas
para_transporte = tope_personas + plazas_extra_materiales
```

`plazas_extra_materiales` **solo** afecta transporte (no hotel ni comidas). UI label: **Extra Equip.** (columna/campo; error/help: “extra equip.”). Columna DB sin renombrar.

Hotelería: **PAX planificada** = `cantidad_planificada`; nominados = participantes activos; **por confirmar** = max(0, PAX − nominados). Noches = check-out − check-in. Flags **Early** (`checkin_early`) y **Late** (`checkout_late`) por artista: booleanes `default false` junto a las fechas (OFRN hospedaje usa fecha+hora en `programas_hospedajes`; FIMBA prioriza flags operativos sin horas).

**Rooming (habitaciones por artista)** — inventario de slots ≠ headcount hotel:
- **No** se confunde con `cantidad_planificada` / PAX hotel: la planificada sigue contando pax para cupos/noches; el rooming es acomodo físico de personas nominadas.
- Tipos: **SGL=1**, **DBL=2**, **TPL=3**, **QAD=4**. Multi: flag **Matrimonial** (default **Twin** = `matrimonial=false`). SGL fuerza `matrimonial=false`.
- Admin (staff ficha artista / modal Hotelería): define **cantidad por tipo** → `syncFimbaHabitacionesFromCounts` materializa filas en `fimba_propuestas_habitaciones` (agrega vacías; borra solo vacías al bajar cupo; no borra ocupadas → warning).
- Editor token `/fimba/e/:token` y staff: asigna **participantes activos** a plazas (`fimba_habitaciones_ocupantes`); una persona en una sola habitación; select por plaza.
- Consulta `/fimba/a/:token`: rooming **solo lectura**.
- UI: `FimbaRoomingPanel` (admin | assign | readonly).

### Agenda

- Agenda unificada = filas `eventos` de la gira con:
  1. **FIMBA**: tags `eventos_fimba_propuestas` y/o asignaciones `fimba_evento_transportes`
  2. **OFRN orquesta**: misma `id_gira` con `audiencia_ofrn ∈ {tutti, grupos}` o `NULL` (general histórico). No incluyen `audiencia_ofrn = 'none'`.
- Pure FIMBA (`audiencia_ofrn=none` + solo propuestas/flota) sigue listándose vía (1).
- Un evento puede ser **ambos** (tags FIMBA + convocatoria OFRN).
- Filtro planilla: **Todos / Solo FIMBA / Solo OFRN** (chips; **default Solo FIMBA**). Multi-select de **categoría de tipo** (`id_categoria` / `categorias_tipos_eventos`, dropdown `MultiSelectDropdown`; vacío = todas) alineado a UnifiedAgenda (no chips por `id_tipo_evento`). Multi-select de **locación** (`id_locacion` de filas cargadas; vacío = todas; sin `id_locacion` se ocultan si el filtro está activo). **Búsqueda** debounced 250ms (patrón UnifiedAgenda: pill + clear) sobre actividad, tipo, categoría, locación/ciudad/dirección, destino, vuelo, obs., artistas, grupos y vehículos. Opciones derivadas de filas cargadas. Filtro por artista desactiva merge OFRN puro.
- Trayectos (`solo_traslados` / página Transportes):
  - Incluye **paradas/traslados OFRN** de la gira (`id_gira`) además de trayectos FIMBA.
  - Criterio fila trayecto (`isFimbaTrasladoEvent`): `actividadUsaTransporte` **o** filas `fimba_evento_transportes` **o** `eventos.id_gira_transporte` set.
  - Merge OFRN: misma convocatoria agenda (tutti/grupos/null) **+**, en modo trayectos, paradas de flota (`id_gira_transporte ∈ giras_transportes` de la gira) aunque `audiencia_ofrn = none`.
  - **No** mezcla ensayos/ensambles OFRN (solo filas que pasan el criterio transporte).
  - Filtro origen chips (**default Todos**); multi-select **vehículo** por `giras_transportes.id` (vacío = todos; FIMBA vía `fimba_evento_transportes`, OFRN vía `id_gira_transporte`).
- Visual: badges origen FIMBA / OFRN; filas pure-OFRN muting cyan; columna convocatoria (Tutti / chips de grupo) en Agenda; en Transportes columnas origen + vehículo(s).
- Columna **Artistas**:
  - **Agenda** (sin secuencia de bus): chips de propuestas; **`Orquesta {n}`** con `n` = |roster contabilizado de la gira| (grupos ∩ countedIds; sin ausentes). Fallback `eventos.audiencia` si no hay roster.
  - **Transportes** (contexto boarding por unidad): `resolveStopArtistasLabels` — **`Orquesta {n}`** = pax OFRN **presentes en la parada** (`isPresentAtStop` + `ofrnSeatWeight`); **`{nombre_propuesta} {n}`** = plazas FIMBA presentes (`fimba_propuesta_rutas` + residual sintético). Con filtro de vehículo, `n` refleja esa secuencia; multi-unidad suma; etiqueta 0/oculta si no hay presencia real (no inventa roster estático en cada fila).
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
| Consulta edición `/fimba/c/:token` | UUID `token_consulta` de la **edición** (`fimba_ediciones`); session `localStorage.fimba_consulta_edicion`; shell **solo lectura** de esa edición: Artistas, Agenda, Transportes, Hotelería; **sin** Usuarios ni Contrataciones; sin create/edit/delete |
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

**Roles:** `editor_general` = acceso completo a esa edición (artistas, agenda, transportes, hotelería, contrataciones, usuarios). `consulta` = solo lectura en el shell de la edición (mismos tabs operativos, **sin** Usuarios ni Contrataciones; `readOnly` vía `FimbaAccessContext`).

**Enlace consulta general (`fimba_ediciones.token_consulta`):** UUID único NOT NULL default `gen_random_uuid()`. Gestión en `/fimba/edicion/:id/usuarios` (sección «Enlace consulta general edición»: copiar / regenerar). Ruta entry `/fimba/c/:token` → `FimbaEdicionConsultaEntry` → escribe `fimba_consulta_edicion` y redirige a `/fimba/edicion/:id`. Regenerar invalida el token anterior.

**Guard (`FimbaStaffGuard`):** (1) OFRN `isManagement` → allow; (2) `fimba_user` editor/consulta con match `id_edicion` (consulta bloquea `/usuarios` y `/contrataciones`); (3) sesión token `fimba_consulta_edicion` igual RO; (4) sin sesión → `/fimba/login`; (5) OFRN no-management sin sesión FIMBA → mensaje + link login FIMBA.

**`FimbaAccessContext` / `resolveFimbaAccess`:** prioridad OFRN management → editor_general → consulta user/token. Expone `readOnly`, `canSeeUsuarios`, `canSeeContrataciones`, `canManageUsers`. Section toggle oculta Usuarios + Contrataciones en RO.

**UI:** `/fimba/login` (brand FIMBA); `/fimba/edicion/:id/usuarios` (alta / desactivar / regenerar clave + enlace consulta edición); header sesión externa con **Salir** (limpia también token consulta); home redirige externos/token a su edición.

**RLS (v1):** igual que la intranet OFRN — tablas accesibles con anon key; seguridad a nivel app + tokens UUID + claves de invitación. Hardening RLS/RPC queda como TODO.

**No** se clona el esquema de `integrantes`. IDs de personas OFRN (`id_integrante`) son numéricos cuando se vinculan.

### Skin

- Brand: logo textual «FIMBA»
- Acento `#d73289`, deep `#94216D`, cyan `#00b1eb` / `#2AC4EA`, texto `#222`
- Fuentes: DM Sans / Rubik (Google Fonts en layout FIMBA) con fallbacks
- **Tokens CSS** (`--fimba-*`): definidos en `.fimba-root` **y** `.fimba-modal-backdrop` porque los modales usan `createPortal(..., document.body)` y salen del árbol de `.fimba-root`. Sin eso, `var(--fimba-*)` se invalida en el portal → botones selected/primary con `color: #fff` quedaban invisibles (blanco sobre blanco).
- Primary: `.fimba-btn-primary` con hex explícito `#d73289` + texto blanco; chips segmento: `.fimba-chip` / `.fimba-chip-on` (hex fijo, no herencia).
- **Nav secciones** (staff): `FimbaSectionToggle` en header sticky (top-right) cuando hay `edicionId` — **Artistas | Agenda | Transportes | Hotelería | Contrataciones | Usuarios** (`IconMusic` / `IconCalendar` / `IconBus` / `IconBed` / `IconClipboardCheck` / `IconUsers`); activo `#d73289`. **Siempre sale del contexto artista**: `base = /fimba/edicion/:id` (nunca concatena `/artista/:n`). Artistas → `/fimba/edicion/:id` (activo también en ficha artista index). Agenda/Transportes/Hotelería/Contrataciones/Usuarios → `/fimba/edicion/:id/{segment}` edición-root. Rutas anidadas `/artista/:id/{agenda|…}` siguen válidas para deep links locales en ficha; el toggle superior no las usa. **Consulta RO** (token `/fimba/c` o `rol_fimba=consulta`): oculta Contrataciones y Usuarios. En home de ediciones (`/fimba`) no se muestra.

- **Contrataciones** (`/fimba/edicion/:id/contrataciones`): planilla Excel de `fimba_contrataciones`. Nombre = select artista opcional (`id_propuesta` nullable) + texto libre (`nombre`). Fecha límite resol. en **negrita roja**. Flags boolean con color: envío firma MFM (azul), nota firmada (verde), falta documentación (rojo), enviado ADM (púrpura). Autosave + semáforo por fila (mismo patrón que participantes).

---

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
- [x] Tags artista en `eventos_fimba_propuestas`; # PAX en `eventos.audiencia` (default planificada + extra)
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
- [x] Migración `20260811140000_fimba_habitaciones` deploy linked
- [x] Migración `20260810180000_fimba_propuestas_id_hotel` deploy linked
- [x] Migración `20260810190000_fimba_propuestas_checkin_early_checkout_late` deploy linked
- [x] Migración `20260811090000_fimba_propuestas_observaciones_logisticas` deploy linked
- [x] Lista artistas (`/fimba/edicion/:id`): IN/OUT + Early/Late visibles; modo planilla con autosave + semáforo (patrón MealsManager / GiraForm)
- [x] `observaciones_logisticas` por artista: planilla + ficha + modal + export TSV hotelería
- [x] Display vehículo FIMBA = catálogo (`transportes.nombre`) + patente; `detalle` = nota OFRN secundaria; trayecto = cada evento de la planilla
- [x] En tránsito / boarding: helper `fimbaTransportBoarding.js` + `loadFimbaTransportLogisticsSummary` (equivalencia hoja de ruta OFRN)
- [x] `fimba_propuesta_rutas` + UI ↑/↓ `FimbaStopRulesManager` (plazas artista + StopRules OFRN)
- [x] Labels planilla Transportes: `Orquesta {en_lugar}` + `{nombre} {n}` desde `isPresentAtStop` (no roster estático por fila)
- [x] `fimba_contrataciones` + planilla staff `/fimba/edicion/:id/contrataciones` (inline edit + semáforo; migración `20260811110000`)
- [x] «Último estado conocido»: presets color UI (Factura presentada/emitida/pedida, Pagado) + texto libre; log append-only `fimba_contrataciones_estado_log` (`20260811130000`); historial modal con fecha + autor

---

## Checklist de entrega (v1)

### Datos / deploy

- [x] Spec `docs/specs/fimba-plataforma.md`
- [x] Migración `supabase/migrations/20260810170000_fimba_plataforma_base.sql`
- [x] Migración `supabase/migrations/20260810180000_fimba_propuestas_id_hotel.sql`
- [x] Migración `20260810190000_fimba_propuestas_checkin_early_checkout_late.sql`
- [x] Migración `20260811090000_fimba_propuestas_observaciones_logisticas.sql` + deploy linked
- [x] Migración `20260810210000_fimba_usuarios.sql` + deploy linked
- [x] Migración `20260811120000_fimba_ediciones_token_consulta.sql` (`token_consulta` en ediciones) + deploy linked
- [x] Deploy a proyecto linked + verificación `migration list`
- [x] Servicio `src/services/fimbaService.js` (edición, propuestas, participantes, capacidad, agenda, hotel; `checkin_early` / `checkout_late`; `observaciones_logisticas`; usuarios FIMBA)
- [x] Login / sesión FIMBA: `FimbaLoginPage` + `fimbaUserSession` + guard dual
- [x] Servicio transporte: vehículos (`listFimbaFlota` / `addFimbaVehiculo` / `updateFimbaVehiculo`), CRUD trayectos, asignaciones, métricas de ventana

### UI staff

- [x] Rutas `/fimba/*` en `App.jsx` / `FimbaStaffApp`
- [x] Link sidebar «FIMBA» (solo management)
- [x] Home: listar / crear edición (elige `id_gira`)
- [x] Edición: CRUD artistas + nav sticky header Artistas | Agenda | Transportes | Hotelería | Contrataciones | Usuarios (`FimbaSectionToggle`; siempre edición-root, sin `/artista`)
- [x] Usuarios staff: listado/alta/edición `fimba_usuarios` en `/fimba/edicion/:id/usuarios` (`FimbaUsuariosPage`)
- [x] Enlace consulta general edición: `fimba_ediciones.token_consulta` + `/fimba/c/:token` + sección en Usuarios (copiar/regenerar); shell RO sin Usuarios/Contrataciones
- [x] Rol `consulta` (login) entra al shell en read-only (mismo recorte de secciones)
- [x] Contrataciones staff: planilla `fimba_contrataciones` en `/fimba/edicion/:id/contrataciones` (inline + semáforo; artista opcional + nombre libre; estado presets + historial)
- [x] Migración `20260811130000_fimba_contrataciones_estado_log` + deploy linked
- [x] Edición planilla: columnas check-in/out (+ Early/Late) + hotel; **Modo edición** (celdas inline) + **semáforo** por fila (verde guardado / amarillo pendiente·guardando / rojo error)
- [x] Planilla artistas: sin columnas **Color** / **Estado** (dot de color junto al nombre; color/estado solo en modal editar)
- [x] Edición: filas de artista **expandibles** (chevron); nómina lazy `listFimbaParticipantes`; subheader nominados/planificada; nested table read-only con col **Género** (también en modo planilla). Keys de expand normalizados (`propuestaKey`); estado como object (no `Set`); load fuera del setState; soft-reload no desmonta la planilla; errores de nómina visibles + Reintentar
- [x] Detalle artista: participantes + `genero` + tipo_alimentacion; deep links opcionales `/artista/:id/{agenda|transportes|hoteleria}` (toggle superior → secciones edición-root sin `/artista`)
- [x] Detalle artista / token edición: **planilla Excel de participantes** (`FimbaArtistaPage` → `ParticipantesPlanilla`): celdas apellido, nombre, documento, **genero**, tipo_alimentacion, activo; semáforo por fila (MealsManager / planilla artistas); Enter o blur guarda; Tab navega; fila inferior = alta `createFimbaParticipante`; delete por fila; consulta token read-only
- [x] Regenerar / copiar tokens consulta y edición
- [x] Editor transportes: panel **Vehículos** (alta + editar lápiz: catálogo, detalle, plazas, categoría; nombre catálogo+patente, detalle OFRN sec.) + planilla **Trayectos** (= eventos FIMBA + paradas OFRN; filtros origen/vehículo)
- [x] Agenda unificada planilla (fecha, horas, tipo, actividad, destino/vuelo, vehículos, PAX, tags)
- [x] Planilla agenda: badges FIMBA/OFRN + convocatoria + filtro origen (default Solo FIMBA) + multi-select **categoría** y **locación** + búsqueda debounced (tipo/actividad/lugar/personas/vehículos)
- [x] Hotelería reporte + edición checkin/out/early/late/hotel + export TSV (cols Early/Late) + cupos habitaciones + rooming resumen
- [x] Ficha artista + token edición: panel **Hotelería / rooming** (`FimbaRoomingPanel`); consulta token RO

### UI tokens

- [x] `/fimba/a/:token` solo lectura (tabla participantes con **Género**, sin planilla)
- [x] `/fimba/e/:token` edición externa = planilla de participantes + **agenda editable** + **rooming (acomodo)**
- [x] `/fimba/c/:token` consulta general edición = shell staff read-only (Artistas/Agenda/Transportes/Hotelería; no Usuarios/Contrataciones)
- [x] Consulta token: **agenda de read-only** del artista (`listFimbaAgenda(edicion, { id_propuesta })` → tags `eventos_fimba_propuestas`; sin merge pure-OFRN como staff al filtrar artista)
- [x] Consulta artista `/fimba/a`: rooming read-only (`FimbaRoomingPanel`)
- [x] Consulta: columnas planilla lean — fecha, horas, tipo, actividad, destino/vuelo, vehículo(s) si transporte, # PAX; sin create/edit/delete ni filtros origen/categoría
- [x] Consulta: datos básicos artista — check-in/out (+ Early/Late), planificada, hotel si hay; skin FIMBA; errores de carga de agenda en banner
- [x] Detalle artista staff + token edición: sección **Agenda** editable (`FimbaConsultaAgenda` `editable`) — listado tags propuesta, **Nuevo evento** / editar / eliminar vía `FimbaEventoFormModal` con `lockPropuesta` (tag obligatorio a ese artista); refresh tras save/delete; consulta `/fimba/a` sin cambios (RO)

### Stub / deferred

- [x] Tabla `fimba_evento_transportes` en SQL
- [x] Helper métricas FIMBA por ventana (`listVehiclesAvailability` batch / `computeFimbaVehicleWindowMetrics` / `sumFimbaPlazasInWindow`)
- [x] Helper boarding rolling `fimbaTransportBoarding` + carga logística OFRN (`loadFimbaTransportLogisticsSummary`)
- [x] Planilla Transportes: columna **Destino** (next stop mismo vehículo) + **Hora fin** guardada o calculada (`next.hora_inicio`) con estilo distinto
- [x] Planilla Transportes: **+** entre Locación y Destino → create modal parada intermedia (midpoint / +30m; mismo vehículo; `audiencia_ofrn=none`)
- [x] UI de asignación multi-vehículo por evento (trayectos): checkboxes flota + plazas editables + label `N libres / Cap` + resumen vs tope artista + hard-block libres/tope en modal y `saveFimbaEvento`
- [x] Agenda grilla FIMBA (planilla multi-tipo)
- [x] Reportes hotel (lista + cupos; sin rooming graph)
- [x] Alta/edición de vehículo embebida en FIMBA (`giras_transportes` / catálogo `transportes` en alta; update alineado a OFRN)
- [x] Helper real de disponibilidad vs cupos OFRN (en tránsito rolling en planilla Transportes; roster + plaza_extra; FIMBA plazas)
- [x] UI `audiencia_ofrn` multi-grupos en modal FIMBA (+ planilla orquesta); EventForm OFRN / tags artistas en eventos OFRN genéricos aún parcial
- [ ] Import CSV participantes
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
5. En listado de edición: ver **Check-in / Check-out / Hotel**; badges **Early** / **Late** si aplican; activar **Modo edición** y editar celdas (nombre, planificada, extras, fechas + early/late, color, estado, hotel). Semáforo: amarillo al editar, verde al guardar, rojo si falla Supabase/validación.
6. Expandir fila de artista (chevron / nombre): ver nested nómina (nominados/planificada); vacío = «Sin nómina cargada» + link. Multi-expand OK; lazy load por artista.
7. Copiar enlace consulta y abrir en incógnito (`/fimba/a/...`); verificar solo lectura (participantes tabla RO, sin planilla editable).
8. En consulta: ver **Datos del artista** (check-in/out, planificada) + **Agenda** filtrada a ese artista (eventos tagged); sin botones de editar/eliminar eventos.
9. Enlace edición (`/fimba/e/...`): planilla de participantes + **Agenda** + **rooming** (acomodo); sin login OFRN.
10. Staff ficha artista (`/fimba/edicion/:id/artista/:artistaId`): agenda + rooming (cupos + acomodo) + enlaces tokens + participantes.

### Agenda

1. Edición → **Agenda** (`/fimba/edicion/:id/agenda`).
2. Ver planilla mixta: eventos FIMBA + orquesta OFRN (badges origen). Filtrar **Todos / Solo FIMBA / Solo OFRN**.
3. **Nuevo evento**: tipo del catálogo OFRN (filtro categoría opcional), fecha, horas, tag artistas, # PAX. Default tipo «Nuevo evento» (16).
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
6. Columnas planilla: **Origen** · **Fecha** · **Com·Fin** · **Actividad** · **Locación** · **+** · **Destino** · **Vehículo** · **Mov.** · **Δ** · **Tránsito/cap** · **Artistas** · acciones. Sticky izq. Origen/Fecha/Com. Scroll horizontal en wrapper (tabla `max-content`). Sin Cap/Libres/# PAX sueltos. **Hora fin** en celda Com·Fin (itálica/cián si calculada). Alerta **Sobre cupo** si en_transito > capacidad; libres vía tooltip de Tránsito/cap.
7. Paridad OFRN: músico con `plaza_extra` cuenta 2 plazas; subida/bajada desde reglas de ruta de la gira.
8. **Nuevo trayecto**: multi-vehículo + plazas por unidad (ej. coro 90 → Bus A 50 + Bus B 40); SIN SERVICIO; default plazas = min(restante tope artista, libres bus); # PAX = planificada + extra.
9. **+** entre Locación y Destino en una fila con vehículo: modal «Parada intermedia» pre-filled (fecha/hora midpoint o +30m; mismo bus; plazas 0); al guardar aparece en secuencia y recalcula Destino/Hora fin de vecinos.
10. Modal asignación: `listVehiclesAvailability` → libres = max(0, capacidad_maxima − Σ plazas `fimba_evento_transportes` de eventos solapados en fecha/hora); anota usos OFRN por FK (sin restar roster). Hard-block: plazas por bus ≤ libres; Σ plazas ≤ Σ `para_transporte` de artistas taggeados. Persistencia: N filas `fimba_evento_transportes`.

### Hotelería

1. Edición → **Hotelería** (`/fimba/edicion/:id/hoteleria`).
2. Ver PAX planificados, nominados, por confirmar; expandir personas; badges Early/Late junto a fechas; badges de **inventario** (ej. «3 DBL, 1 SGL») y ocupadas/plazas rooming.
3. **Editar**: check-in/out, toggles Early/Late, hotel del catálogo `hoteles`, **cupos por tipo** (Single/Doble/Triple/Cuádruple).
4. Expandir artista: columna Habitación + lista rooming; **Copiar tabla (Excel)** (TSV + cols habitaciones).
5. Ficha artista o `/fimba/e/:token`: panel **Hotelería / rooming** — staff aplica cupos; editor asigna personas a plazas; matrimonial en multi; consulta `/fimba/a` RO.

### Contrataciones

1. Edición → **Contrataciones** (`/fimba/edicion/:id/contrataciones`).
2. Planilla: nº expediente, nombre (artista opcional + texto libre), monto, fecha límite (rojo), tipo, 4 flags de estado, último estado.
3. Fila vacía inferior = alta; blur/Enter/check guarda con semáforo; eliminar por fila.
4. **Último estado conocido**: combobox con presets coloreados (solo UI; DB = texto libre):
   - Factura presentada (azul claro)
   - Factura emitida (violeta claro)
   - Factura pedida (rosa claro)
   - Pagado (verde claro)
   Texto libre permitido; badge de color solo si matchea un preset (case-insensitive).
5. Cada cambio de estado **inserta** en `fimba_contrataciones_estado_log` y actualiza el denormalizado `ultimo_estado_conocido`. Autor = sesión OFRN (nombre/mail integrantes) o `fimba_user` (nombre/mail).
6. Botón historial (ícono) por fila → modal «Ver historial»: estado + timestamp + quién, cronológico.

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
| `/fimba/edicion/:id/artista/:artistaId` | Detalle artista: agenda + rooming + planilla participantes + tokens |
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
| `supabase/migrations/20260810210000_fimba_usuarios.sql` | Tabla `fimba_usuarios` (mail+rol por edición) |
| `supabase/migrations/20260811110000_fimba_contrataciones.sql` | Tabla `fimba_contrataciones` (planilla expedientes) |
| `supabase/migrations/20260811120000_fimba_ediciones_token_consulta.sql` | `fimba_ediciones.token_consulta` UUID único (enlace `/fimba/c/:token`) |
| `supabase/migrations/20260811130000_fimba_contrataciones_estado_log.sql` | Log append-only de `ultimo_estado_conocido` (estado + autor + timestamp) |
| `supabase/migrations/20260811140000_fimba_habitaciones.sql` | `fimba_propuestas_habitaciones` + `fimba_habitaciones_ocupantes` |
| `src/services/fimbaService.js` | Flota, trayectos, agenda/hotel/rooming, usuarios FIMBA, contrataciones, token consulta edición |
| `src/utils/fimbaUserSession.js` | Sesiones `fimba_user` + `fimba_consulta_edicion` + `resolveFimbaAccess` |
| `src/hooks/useFimbaUserSession.js` | Hook reactivo de sesión FIMBA usuario |
| `src/hooks/useFimbaConsultaEdicionSession.js` | Hook sesión enlace consulta edición |
| `src/context/FimbaAccessContext.jsx` | `readOnly` / flags de secciones en shell staff |
| `src/views/Fimba/FimbaLoginPage.jsx` | Form `/fimba/login` |
| `src/views/Fimba/FimbaEdicionConsultaEntry.jsx` | Entry `/fimba/c/:token` → session + redirect |
| `src/utils/fimbaTransportBoarding.js` | Secuencia subida/bajada + en tránsito + headcounts `isPresentAtStop` / labels Artistas |
| `src/views/Fimba/FimbaStopRulesManager.jsx` | Modal ↑/↓: plazas FIMBA (`fimba_propuesta_rutas`) + StopRules OFRN embutido (`embedded`) |
| `src/views/Fimba/FimbaLayout.jsx` | Skin + header sticky + toggle + sesión/logout FIMBA |
| `src/views/Fimba/FimbaSectionToggle.jsx` | Segmented control; oculta Contrataciones/Usuarios en consulta |
| `src/views/Fimba/FimbaContratacionesPage.jsx` | Planilla expedientes: inline + semáforo; estado presets/colores + modal historial |
| `src/views/Fimba/FimbaUsuariosPage.jsx` | Usuarios FIMBA + enlace consulta general edición |
| `src/views/Fimba/FimbaStaffGuard.jsx` | isManagement **o** fimba_user **o** token consulta edición |
| `src/views/Fimba/FimbaEdicionPage.jsx` | Artistas + modo planilla + semáforo por fila |
| `src/views/Fimba/FimbaArtistaPage.jsx` | Detalle: agenda (editable o RO) + planilla participantes + tokens |
| `src/views/Fimba/FimbaConsultaAgenda.jsx` | Agenda por tag artista; RO consulta o `editable` create/edit/delete |
| `src/views/Fimba/FimbaEventoFormModal.jsx` | Modal agenda + flota; `lockPropuesta` fuerza tag artista |
| `src/views/Fimba/FimbaAgendaPage.jsx` | Planilla agenda (tipo/color catálogo) |
| `src/views/Fimba/FimbaTransportPage.jsx` | Vehículos + trayectos + columnas boarding / locación |
| `src/views/Fimba/FimbaHoteleriaPage.jsx` | Reporte hotel + cupos inventario + resumen rooming |
| `src/views/Fimba/FimbaRoomingPanel.jsx` | Panel hotelería/rooming (admin cupos + acomodo / RO) |
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
| **20260811110000** | `fimba_contrataciones` | Local = Remote (deploy linked) |
| **20260811140000** | `fimba_habitaciones` | Local = Remote (deploy linked) |
| **20260811120000** | `fimba_ediciones_token_consulta` | Local = Remote |
| **20260811130000** | `fimba_contrataciones_estado_log` | Local = Remote (SQL linked + repair applied) |

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
   - Abrir en incógnito: shell RO de esa edición (Artistas, Agenda, Transportes, Hotelería).
   - **Regenerar** invalida el enlace anterior (`fimba_ediciones.token_consulta`).
4. **Logout FIMBA**: botón **Salir** en el header (sesión usuario y/o token consulta).
5. Staff OFRN sigue entrando por login intranet (`isManagement`) sin registro en `fimba_usuarios`.

## Incidente: Agenda → ediciones (2026-08-10)

- **Síntoma:** click **Agenda** (y similares) parecía caer en listado de ediciones.
- **Causa:** `FimbaStaffApp` tenía catch-all `<Route path="*" element={<Navigate to="/fimba" replace />} />`. Cualquier no-match (ruta incompleta durante HMR, path mal resuelto, chunk en error) **redirigía en silencio al home de ediciones**, indistinguible de un enlace roto a agenda.
- **Links:** ya apuntaban a absolutos `/fimba/edicion/:id/agenda|transportes|hoteleria` (y variante artista); el guard no alteraba el path.
- **Fix:** rutas staff anidadas (`edicion/:id` → `agenda` / `transportes` / `hoteleria`); 404 con mensaje + link manual (sin auto-redirect a `/fimba`).
