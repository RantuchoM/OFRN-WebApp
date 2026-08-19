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
- **Comidas (AND)**: elegibilidad / `is_convoked` = `convocados` ∩ grupos del evento. Vacío en un eje = no filtra ese eje. Ej.: “Solo alojados” + Grupo A → solo alojados que además son del Grupo A.
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

- **Roster** (`GiraRoster`): botón “Grupos de convocatoria” → CRUD de grupos y tabla de miembros (solo confirmados) con columnas Nombre / Instrumento / Localidad (residencia) / Ensamble/s, filtros por columna y ordenación (al cargar o reordenar, los ya seleccionados quedan arriba; tildar no reordena). **Shift+click** en checkbox o fila: marca (tilda) el rango inclusivo en el listado **visible/filtrado** en el orden en pantalla; el ancla es el último click sin Shift (`lastClickedVisibleIndex`). Click sin Shift solo alterna esa fila y actualiza el ancla. Tras filtros/orden, cambio de grupo, “Marcar filtrados” o “Limpiar”, se resetea el ancla. Tags junto al nombre en `RosterTableRow` (no en ausentes); los editores pueden quitar del grupo con la cruz del chip (confirmación).
  - **Butacas filtradas**: junto al botón **Grupos**, chip de ocupación del roster visible (misma fórmula que transportes: personas + `plaza_extra` = butacas; si hay instrumentos con plaza extra: `N + M ins = T butacas`). Cuenta solo filas del roster **filtrado** (`localRoster`).
  - **Móvil**: el header duplicado (Volver + título) se oculta; la toolbar queda compacta/scrolleable con el botón **Grupos** siempre con etiqueta visible; modal en sheet inferior (`RosterGroupsModal`) scrolleable.
- **Filtro global** (`GirasView` header sticky, a la izquierda de los tabs Agenda/Logística/…): `GiraGruposFilterControl` + estado en `useGiraGruposFilter` (sessionStorage por gira). Mismo filtro alimenta Agenda, Comidas y Transportes. Resumen plegado: nombres unidos con ` + ` (`summaryMode="names"`), no `Grupos (N)`; si las opciones traen `color`, el resumen se dibuja como chips con el color del grupo y el listado del desplegable pinta el checkbox/fila con ese color.
- **Agenda** (`EventForm`, `IndependentRehearsalForm`): multi-select de grupos de la gira; persistencia en create/edit/duplicate. El filtro de toolbar local se oculta cuando el shell ya muestra el filtro global.
- **Chips** en `UnifiedAgenda` apilados en vertical en columna propia; el `IconTag` queda a la izquierda del primer chip (o solo, si no hay grupos).
- **Tag rápido** (`IconTag` junto al ojo/técnico): abre `EventGruposAssignModal` con **checklist** de grupos (no desplegable) para asignar sin abrir el form completo. Solo editores/admins y solo si la gira ya tiene grupos.
- **Comidas** (`MealsManager`): columna Grupos (junto a Convocados) cuando hay grupos; persiste en `eventos_grupos`. Contadores usan AND con convocados. Vacante solo si no hay comida ese día/servicio; para solapar (varios almuerzos/cenas el mismo día) usar `+`.
- **Transportes** (`GirasTransportesManager`): default de grupos en la card del vehículo (`giras_transportes_grupos`); botón **Aplicar** copia a todas las paradas; paradas nuevas heredan el default; override por parada vía `EventGruposAssignModal` (IconTag). Con filtro de grupos activo, **no se listan vehículos** asignados a otros grupos (ni sus paradas).
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
- [x] Multiselect de grupos en toolbar (editores/admins, si hay grupos) + toggle eventos generales
- [x] Precarga de grupos al crear evento desde filtro activo
- [x] Migración `giras_transportes_grupos` + deploy linked
- [x] Filtro global en header `GirasView` + sessionStorage + `summaryMode="names"`
- [x] Color del grupo en chips del trigger y en las filas del desplegable (`MultiSelectDropdown`)
- [x] Comidas: varios eventos del mismo servicio por día (+ sibling)
- [x] Transportes: default vehículo, copia al crear, bulk Aplicar, override por parada
- [x] Roster: chip de butacas (personas + plaza_extra) del listado filtrado al lado del botón Grupos
- [x] Migración `programas_repertorios_grupos` + deploy linked
- [x] Asignación de grupos en bloques de repertorio (`RepertoireManager`, oculto si la gira no tiene grupos)
- [x] Chips en Mis Partes + filtro de visibilidad por membresía
- [x] Seating: roster del bloque activo filtrado por grupo (`useGiraRoster` + ausencia/confirmado intactos)
- [x] Seating: chip de grupo compacto (iniciales) en pestaña inactiva; nombre completo en la activa
- [x] Tabla de miembros: Shift+click rango sobre el listado visible/filtrado (`RosterGroupsModal`)
- [x] Control de orgánico por bloque de repertorio (Req/Conv en header del bloque; seating usa el bloque activo)
