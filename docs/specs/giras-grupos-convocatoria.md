# Grupos de convocatoria por gira

## Objetivo

Permitir agrupar integrantes de una gira y asignar esos grupos a eventos (ensayos, comidas, transportes) y a **bloques de repertorio**, de modo que cada músico solo vea en agenda los eventos de grupos a los que pertenece, y el seating de un bloque se calcule solo con quienes tocan ese bloque.

## Reglas

- Una gira puede tener 0..N grupos (opcionales).
- Una persona puede pertenecer a varios grupos; un evento puede tener uno o más grupos.
- **Ausentes** (`giras_integrantes.estado === 'ausente'`): la membresía en DB se conserva, pero no aparece tag en roster ni cuenta para visibilidad de eventos.
- **Eventos sin `eventos_grupos`**: comportamiento histórico (visible según reglas de roster/ensamble existentes). Son los “eventos generales”.
- **Eventos con ≥1 grupo**: el músico solo los ve si pertenece (efectivamente) a al menos uno.
- **Editores / management** (`admin`, `editor`, `coord_general`, `director`): ven **todos** los eventos; las cards muestran chips del grupo.
- **Comidas (AND)**: elegibilidad / `is_convoked` = `convocados` ∩ grupos del evento. Vacío en un eje = no filtra ese eje. Ej.: “Solo alojados” + Grupo A → solo alojados que además son del Grupo A. **Grupos sin convocados** (p. ej. Catering FIMBA con chip Crimson y Convocados vacío) → miembros del grupo con cobertura logística. **Prioridad grupo sobre Nadie:** si `eventos_grupos` / `selectedGrupos` ≥1, `GRP:NONE` se **ignora** y cuentan los miembros del grupo (AND con tags positivos si los hay). Solo `GRP:NONE` sin grupos, o ambos ejes vacíos → 0 OFRN (artistas FIMBA aditivos).
- **UI de grupos**: solo si la gira tiene ≥1 grupo creado; si no, se ve como antes.
- **Bloques de repertorio** (`programas_repertorios_grupos`): vacío = el bloque aplica a todo el roster (comportamiento histórico). Con ≥1 grupo = seating y Mis Partes se restringen a miembros de esos grupos (unión). Ausentes siguen fuera del seating (`estado === 'ausente'` / no confirmado). Editores ven todos los bloques; los chips muestran el grupo.

## Modelo

| Tabla | Rol |
|-------|-----|
| `giras_grupos` | Nombre, color, orden por `id_gira` → `programas` |
| `giras_grupos_integrantes` | Membresía `(id_grupo, id_integrante)` |
| `eventos_grupos` | Asignación `(id_evento, id_grupo)` — ensayos, comidas, paradas |
| `giras_transportes_grupos` | Grupos default por vehículo `(id_gira_transporte, id_grupo)` |
| `programas_repertorios_grupos` | Asignación `(id_repertorio, id_grupo)` — bloques de repertorio. Vacío = todos |

Migraciones: `20260724120000_giras_grupos.sql`, `20260728200000_giras_transportes_grupos.sql`, `20260813140000_programas_repertorios_grupos.sql`.

## UI

- **Roster** (`GiraRoster`): botón “Grupos de convocatoria” → CRUD de grupos y tabla de miembros (solo confirmados) con columnas Nombre / Instrumento / Localidad (residencia) / Ensamble/s, filtros por columna y ordenación (al cargar o reordenar, los ya seleccionados quedan arriba; tildar no reordena). **Shift+click** en checkbox o fila: marca (tilda) el rango inclusivo en el listado **visible/filtrado** (ancla + destino + intermedios); el ancla es el último click sin Shift. Detección de Shift vía `keydown`/`keyup` (mismo patrón que Personal) y un solo handler por interacción (checkbox=`onChange`, fila=`onClick`) para no desmarcar extremos. Tras filtros/orden, cambio de grupo, “Marcar filtrados” o “Limpiar”, se resetea el ancla. Tags junto al nombre en `RosterTableRow` (no en ausentes); los editores pueden quitar del grupo con la cruz del chip (confirmación).
  - **Butacas filtradas**: junto al botón **Grupos**, chip de ocupación del roster visible (misma fórmula que transportes: personas + `plaza_extra` = butacas; si hay instrumentos con plaza extra: `N + M ins = T butacas`). Cuenta solo filas del roster **filtrado** (`localRoster`).
  - **Móvil**: el header duplicado (Volver + título) se oculta; la toolbar queda compacta/scrolleable con el botón **Grupos** siempre con etiqueta visible; modal en sheet inferior (`RosterGroupsModal`) scrolleable.
- **Filtro global** (`GirasView` header sticky, a la izquierda de los tabs Agenda/Logística/…): `GiraGruposFilterControl` + estado en `useGiraGruposFilter` (sessionStorage v2 por gira). Primera opción del multi-select: **Actividades Tutti** (= eventos **sin** filas en `eventos_grupos` / generales). Luego los `giras_grupos` nombrados. **Combinación aditiva (OR):** Tutti ∪ grupos tildados; vacío = sin filtro. Permite filtrar solo Tutti (antes el toggle «+ Gen.» solo aparecía con un grupo ya elegido). Mismo filtro alimenta Agenda, Comidas y Transportes. Resumen plegado: nombres unidos con ` + ` (`summaryMode="names"`), no `Grupos (N)`; si las opciones traen `color`, el resumen se dibuja como chips con el color del grupo y el listado del desplegable pinta el checkbox/fila con ese color.
- **Agenda** (`EventForm`, `IndependentRehearsalForm`): multi-select de grupos de la gira; persistencia en create/edit/duplicate. El filtro de toolbar local se oculta cuando el shell ya muestra el filtro global.
- **Chips** en `UnifiedAgenda` apilados en vertical en columna propia; el `IconTag` queda a la izquierda del primer chip (o solo, si no hay grupos).
- **Tag rápido** (`IconTag` junto al ojo/técnico): abre `EventGruposAssignModal` con **checklist** de grupos (no desplegable) para asignar sin abrir el form completo. Solo editores/admins y solo si la gira ya tiene grupos.
- **Comidas** (`MealsManager`): columna Grupos (junto a Convocados) cuando hay grupos; persiste en `eventos_grupos` vía `setEventoGrupos` en `saveRow` (debounce al cambiar `selectedGrupos`). Contadores usan AND con convocados (`mealRowHasOfrnAudience` / `effectiveMealConvocados`: grupos solos sí cuentan OFRN; **grupo gana a `GRP:NONE`**; ambos vacíos / `GRP:NONE` solo → 0 OFRN). Convocado **`GRP:NONE`** («Nadie (orquesta no come)»): sin grupos → 0 OFRN; con grupos → miembros del grupo. Artistas FIMBA aditivos; en `eventos.convocados`, no toca `audiencia_ofrn`. Badge Comensales: `formatComensalesBadgeLabel` + `−N` deducción. Vacante solo si no hay comida ese día/servicio; para solapar (varios almuerzos/cenas el mismo día) usar `+`. En modo OFRN (`!fimbaMode`) se ocultan comidas solo-artista FIMBA (`isFimbaArtistOnlyMealEvent`); FIMBA Comidas las conserva. Tags FIMBA: `FimbaEventArtistasTagsCell` persiste `eventos_fimba_propuestas`; `saveRow` embebe join y conserva `propuestas` al limpiar convocados. Columnas **H. Inic.** / **H. Fin** (`eventos.hora_fin`; vacío por defecto, sin auto-fill en comidas).
- **Filtros matriz Comidas (2026-09):** multi-select **Locación** + **Artista** (tags FIMBA; visible en `fimbaMode` o si hay tags en filas) combinables con chips **Todos|Comidas|Catering** y servicios D/A/M/C/Cat. Chip / opción **Solo orquesta** (`MEAL_FILTER_ORCHESTRA_ONLY`, siempre visible en FIMBA): filas sin tags de artista y con audiencia OFRN (`mealRowIsSoloOrquesta`; excluye `GRP:NONE` **solo** y ambos ejes vacíos; `GRP:NONE`+grupo sí cuenta). Vacantes no se ocultan por locación/artista. **Limpiar filtros** resetea tipo, servicios (default A/M/C+Cat), locación y artista. **Vista vs fuente:** `grid` = lista completa en memoria; `filteredGrid`/`visibleGrid` = solo hide (`filterMealManagerRows`); mutaciones (save/recalc/delete) van por **id** sobre `grid`, nunca se reescribe el source con el set filtrado.
- **Convocados — destildar chips (2026-09-08):** `toggleMealConvocadosSelection` en columna Convocados (`MultiGroupSelect`). Cada chip tiene × para quitarlo; Tutti y Nadie se pueden apagar (la selección puede quedar vacía; no hay mínimo de un tag). Encender Tutti o Nadie sigue siendo exclusivo. Locales / Ensambles / categorías no exclusivas se combinan.
- **Exports filtrados (OFRN):** `LogisticsDashboard` sostiene `mealFilters` compartidos entre Manager → Asistencia → Reporte. PDF / Texto pedido / columnas de asistencia / dietas (`tipos de alimentación`) usan ese set; vacío/default = todo lo cargado. FIMBA Reporte: **Por artista** y **Por locación** (Excel multi-hoja / ZIP textos, con nominados y especificaciones alimenticias) + alertas cobertura A/M/C con auto-create. **Por locación** también está en Logística OFRN.
- **Pitfall reporte (2026-09):** `MealsReport` no debe poner en deps de fetch la identidad de `roster` / `hospedajeExcluidosIds` / `segments` ni defaults `= []` / `?? []` (nueva ref cada render → spinner infinito, peor en FIMBA `fimbaMode` que fetchéa con roster vacío). Usar fingerprints primitivos + `EMPTY_*` congelados; `useGiraSegmentos` / `useLogistics.summary` también con fallback estable. Manager/Asistencia solo refetch por `gira?.id` (no comparten el bucle).
- **Renombrar nombres:** botón Renombrar actualiza tramo auto (servicio + convocados **sin** palabra «Nadie») + sufijo siglas artistas ` - XX / YY`; conserva aclaraciones de producción.
- **Borrar fila:** spinner + fila gris (`deletingRows`) mientras corre el delete; quita la fila al OK y refresca vacantes en background (no cuelga el spinner en `refreshGridData`).
- **Deducción orquesta ↔ grupo (2026-09):** evento **sin** `eventos_grupos` (= orquesta/general: Tutti, Solo alojados, etc.) vs evento(s) **con** grupo(s) del **mismo turno** `fecha|servicio` (`mealTurnoKey`) → los elegibles del grupo se restan del conteo/listado orquesta (`findCoincidingGrupoMealRows` + `deductGrupoMembersFromOrchestraEligible`). **Locación irrelevante** (p. ej. Merienda Solo alojados en un lugar y Crimson en otro). UI Manager: `−N` en Comensales + «Descontados» en el modal. Paridad en **Reporte** y **Asistencia**. No aplica a tags FIMBA (aditivos). Ausentes fuera. `mealCoincidenceKey` (con locación) queda solo por compatibilidad.
- **Sobre-inclusión mismo turno (2026-09-07):** turno = `fecha|servicio` (`mealTurnoKey`; misma clave que la deducción). Banner + icono fila + modal si integrante OFRN o artista FIMBA aparece en ≥2 comidas del turno (post-deducción).
- **Edición masiva Comidas (2026-09-07):** barra flotante (portal `document.body`, `z-[100]`) con conteo + hora/lugar/convocados + Aplicar / limpiar selección; no tapa el thead sticky.
- **Sticky thead Comidas (2026-09-07):** `position:sticky` en cada `th` (`top:0`, fondo sólido, z-20; acciones `right-0` z-30) dentro del scrollport `overflow-auto`; FIMBA Comidas fija altura de página para que el scroll sea interno.
- **Recalc de turno al editar (2026-09-07):** al cambiar campos que afectan pax/elegibilidad (`convocados`, `selectedGrupos`, artistas/propuestas, locación, fecha/hora/tipo→servicio) — en `handleGridChange`, `saveRow`, tags FIMBA o editor móvil — se rematerializan **todas** las filas del mismo `mealTurnoKey` (y del turno anterior si cambió fecha/servicio) para refrescar comensales, deducción orquesta↔grupo y avisos de sobre-inclusión. `selectedGrupos: []` es autoritativo (no cae al embed viejo). OFRN y FIMBA (`fimbaMode`).
- **Catering en gestor:** categoría Catering entra al gestor junto a Comidas (`isMealRelatedEvent`); filtro **Todos | Comidas | Catering** + chip servicio **Cat**. Cobertura logística de Catering = **día calendario** dentro de `comida_inicio`..`comida_fin` (el slot sintético 4 no se compara contra D–C). Inicio/fin de regla = slot día+tipo (`docs/specs/logistica-comida-slot.md`), no un `eventos.id`.
- **Filas «duplicadas» en matriz:** suelen ser eventos reales con el mismo slot OFRN pero distinto tag FIMBA; Manager muestra chips Artistas (sin badge `×N`). No borrar en lote sin confirmación.
- **Asistencia / Reporte de comidas:** mismos ejes Locación + Artista + Todos|Comidas|Catering (+ servicios); embed `eventos_grupos` + prop `giraGrupos` para AND de elegibilidad OFRN (paridad Manager). Exports (PDF / Texto pedido / columnas asistencia) usan el set filtrado y siguen desglosando **tipos de alimentación** (`alimentacion` / dietas).
- **Asistencia por turno (2026-09-07):** `MealsAttendance` colapsa columnas a **una por `mealTurnoKey`** (`fecha|servicio`), no una por evento. Celda = evento resuelto post-deducción (`resolveAttendanceEventForPerson`: prioriza comida de grupo). Persistencia en ese `id_evento`; al guardar/limpiar se borran filas residuales en eventos hermanos del turno. Helpers: `buildMealAttendanceTurnColumns`, `mergeAttendanceStatuses` en `mealLogistics.js`.
- **Transportes** (`GirasTransportesManager`): default de grupos en la card del vehículo (`giras_transportes_grupos`); botón **Aplicar** copia a todas las paradas; paradas nuevas heredan el default; override por parada vía `EventGruposAssignModal` (IconTag). Con filtro de grupos activo, **no se listan vehículos** asignados a otros grupos (ni sus paradas).
- **Admisión al bus** (`TransportAdmissionModal` / `giras_logistica_admision`): alcance nativo **Grupo** (prioridad 4, paridad Categoría). UI: ALCANCE → Grupo → multi-select de `giras_grupos` de la gira. Persistencia: una fila por grupo con `alcance: "Grupo"`, `target_ids: [id_grupo]` (text). Match vía `matchesRule` / `personMatchesGrupoRule` + roster enriquecido con `grupo_ids` (`enrichRosterWithGrupoIds`); ausentes excluidos. No expande a N filas Persona desde esta UI. Las reglas de trayecto Grupo en `StopRulesManager` siguen pudiendo auto-incluir miembros como Persona (comportamiento de boarding intacto). Modal portal `document.body`, `z-[100]`.
- Al eliminar un grupo: el panel lista eventos asociados y permite **conservarlos desasociados** o **enviarlos a la papelera** (`is_deleted`) junto con el grupo. Los bloques de repertorio quedan desasociados (CASCADE en `programas_repertorios_grupos`; el bloque permanece como “todos”).
- **Repertorio** (`RepertoireManager`): multi-select de grupos en el header del bloque, solo si la gira tiene grupos; placeholder “Todos…”. Músicos ven chips (sin control) cuando hay asignación. **Control de orgánico (Req/Conv + tilde de revisado)** en el header de cada bloque (admins/editores): compara las obras del bloque con el roster de su/s grupo/s; `organico_revisado` vive en `programas_repertorios`.
- **Mis Partes** (`MyPartsViewer`): chips en el divisor del bloque; si el bloque tiene grupos, solo se listan obras si el músico pertenece a alguno (mismo criterio que agenda).
- **Seating** (`ProgramSeating`): pestañas de bloque muestran chips; el roster visible (vientos + atriles) se filtra a miembros del grupo del bloque activo. Sin grupo en el bloque = roster completo confirmado. El control de orgánico (Req/Conv y modal) usa obras y convocados del bloque activo. Config de cuerdas, PDF/Excel y descarga de particellas siguen usando el roster/programa completo. Chip del grupo: pestaña **activa** = nombre completo; pestaña **inactiva** = iniciales (`GiraGrupoChips compact`, p. ej. “King Crimson (OFRN)” → **KCO**); tooltip siempre con el nombre completo.

## Visibilidad

Implementada en `useAgendaData` sobre el select que incluye `eventos_grupos ( giras_grupos (...) )` y membresías del usuario efectivo. `is_convoked` de comidas también exige pertenecer a algún grupo del evento.

El filtro de header es una vista editorial adicional (no cambia la visibilidad base de músicos).

## Checklist

- [x] Migración `giras_grupos` / `giras_grupos_integrantes` / `eventos_grupos`
- [x] Spec viva
- [x] CRUD + tags en roster (`RosterGroupsModal`, `RosterTableRow`, `GiraRoster`)
- [x] Filtro en `useAgendaData` (editores ven todo)
- [x] Chips + asignación en `EventForm` / `IndependentRehearsalForm` / `UnifiedAgenda`
- [x] Push migración a main
- [x] Acceso al gestor de grupos en vista móvil del roster (header compacto + botón visible)
- [x] Tabla de miembros con 4 columnas, filtros y orden
- [x] Cruz en chips de grupo del roster para quitar (con confirmación)
- [x] Al eliminar grupo: listar eventos y elegir conservar (desasociar) o eliminar (papelera)
- [x] IconTag por evento + modal rápido de asignación (`EventGruposAssignModal`)
- [x] Multiselect de grupos en toolbar (editores/admins, si hay grupos) + **Actividades Tutti** (primera opción; reemplaza toggle «+ Gen.»)
- [x] Precarga de grupos al crear evento desde filtro activo
- [x] Migración `giras_transportes_grupos` + deploy linked
- [x] Filtro global en header `GirasView` + sessionStorage + `summaryMode="names"`
- [x] Color del grupo en chips del trigger y en las filas del desplegable (`MultiSelectDropdown`)
- [x] Comidas: varios eventos del mismo servicio por día (+ sibling)
- [x] Comidas: badge comensales `n OFRN · m artistas`, `GRP:NONE`, turno over-inclusion, FIMBA polish
- [x] Comidas: recalc de turno (`fecha|servicio`) al editar convocados/grupos/artistas (hermanas + deducción/avisos)
- [x] MealsReport: fetch estable (fingerprints; sin bucle por `[]` / segments fallback) — Manager/Asistencia OK
- [x] Comidas: grupos sin convocados cuentan OFRN (`mealRowHasOfrnAudience`); Catering cobertura por día; Report/Asistencia AND grupos
- [x] Comidas: grupo gana a `GRP:NONE` (`effectiveMealConvocados` / `mealRowHasOfrnAudience`; Manager/Report/Asistencia)
- [x] Comidas: deducción orquesta↔grupo por turno (`mealTurnoKey`, sin locación); sticky thead + edición masiva flotante
- [x] Transportes: default vehículo, copia al crear, bulk Aplicar, override por parada
- [x] Roster: chip de butacas (personas + plaza_extra) del listado filtrado al lado del botón Grupos
- [x] Migración `programas_repertorios_grupos` + deploy linked
- [x] Asignación de grupos en bloques de repertorio (`RepertoireManager`, oculto si la gira no tiene grupos)
- [x] Chips en Mis Partes + filtro de visibilidad por membresía
- [x] Seating: roster del bloque activo filtrado por grupo (`useGiraRoster` + ausencia/confirmado intactos)
- [x] Seating: chip de grupo compacto (iniciales) en pestaña inactiva; nombre completo en la activa
- [x] Tabla de miembros: Shift+click rango inclusivo (extremos incluidos; `shiftKeyHeldRef` + un handler por interacción)
- [x] Control de orgánico por bloque de repertorio (Req/Conv en header del bloque; seating usa el bloque activo)
- [x] Admisión al bus: alcance nativo Grupo en `TransportAdmissionModal` (`giras_logistica_admision`, `target_ids` = id grupo, prio 4; match = `grupo_ids`)
- [x] Asistencia: una columna por turno (`fecha|servicio`); resolve evento post-deducción + save seguro
- [x] Comidas: filtro **Solo orquesta** (sin artistas FIMBA + audiencia OFRN) en Gestor/Asistencia/Reporte
- [x] Comidas: destildar chips de Convocados (× + toggle Tutti/Nadie; vacío permitido)
