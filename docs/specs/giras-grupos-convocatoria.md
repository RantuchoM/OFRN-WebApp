# Grupos de convocatoria por gira

## Objetivo

Permitir agrupar integrantes de una gira y asignar esos grupos a eventos (ensayos, comidas, transportes), de modo que cada músico solo vea en agenda los eventos de grupos a los que pertenece.

## Reglas

- Una gira puede tener 0..N grupos (opcionales).
- Una persona puede pertenecer a varios grupos; un evento puede tener uno o más grupos.
- **Ausentes** (`giras_integrantes.estado === 'ausente'`): la membresía en DB se conserva, pero no aparece tag en roster ni cuenta para visibilidad de eventos.
- **Eventos sin `eventos_grupos`**: comportamiento histórico (visible según reglas de roster/ensamble existentes). Son los “eventos generales”.
- **Eventos con ≥1 grupo**: el músico solo los ve si pertenece (efectivamente) a al menos uno.
- **Editores / management** (`admin`, `editor`, `coord_general`, `director`): ven **todos** los eventos; las cards muestran chips del grupo.
- **Comidas (AND)**: elegibilidad / `is_convoked` = `convocados` ∩ grupos del evento. Vacío en un eje = no filtra ese eje. Ej.: “Solo alojados” + Grupo A → solo alojados que además son del Grupo A.
- **UI de grupos**: solo si la gira tiene ≥1 grupo creado; si no, se ve como antes.

## Modelo

| Tabla | Rol |
|-------|-----|
| `giras_grupos` | Nombre, color, orden por `id_gira` → `programas` |
| `giras_grupos_integrantes` | Membresía `(id_grupo, id_integrante)` |
| `eventos_grupos` | Asignación `(id_evento, id_grupo)` — ensayos, comidas, paradas |
| `giras_transportes_grupos` | Grupos default por vehículo `(id_gira_transporte, id_grupo)` |

Migraciones: `20260724120000_giras_grupos.sql`, `20260728200000_giras_transportes_grupos.sql`.

## UI

- **Roster** (`GiraRoster`): botón “Grupos de convocatoria” → CRUD de grupos y tabla de miembros (solo confirmados) con columnas Nombre / Instrumento / Localidad (residencia) / Ensamble/s, filtros por columna y ordenación (al cargar o reordenar, los ya seleccionados quedan arriba; tildar no reordena). Tags junto al nombre en `RosterTableRow` (no en ausentes); los editores pueden quitar del grupo con la cruz del chip (confirmación).
  - **Móvil**: el header duplicado (Volver + título) se oculta; la toolbar queda compacta/scrolleable con el botón **Grupos** siempre con etiqueta visible; modal en sheet inferior (`RosterGroupsModal`) scrolleable.
- **Filtro global** (`GirasView` header sticky, a la izquierda de los tabs Agenda/Logística/…): `GiraGruposFilterControl` + estado en `useGiraGruposFilter` (sessionStorage por gira). Mismo filtro alimenta Agenda, Comidas y Transportes. Resumen plegado: nombres unidos con ` + ` (`summaryMode="names"`), no `Grupos (N)`.
- **Agenda** (`EventForm`, `IndependentRehearsalForm`): multi-select de grupos de la gira; persistencia en create/edit/duplicate. El filtro de toolbar local se oculta cuando el shell ya muestra el filtro global.
- **Chips** en `UnifiedAgenda` apilados en vertical en columna propia; el `IconTag` queda a la izquierda del primer chip (o solo, si no hay grupos).
- **Tag rápido** (`IconTag` junto al ojo/técnico): abre `EventGruposAssignModal` con **checklist** de grupos (no desplegable) para asignar sin abrir el form completo. Solo editores/admins y solo si la gira ya tiene grupos.
- **Comidas** (`MealsManager`): columna Grupos (junto a Convocados) cuando hay grupos; persiste en `eventos_grupos`. Contadores usan AND con convocados. Vacante solo si no hay comida ese día/servicio; para solapar (varios almuerzos/cenas el mismo día) usar `+`.
- **Transportes** (`GirasTransportesManager`): default de grupos en la card del vehículo (`giras_transportes_grupos`); botón **Aplicar** copia a todas las paradas; paradas nuevas heredan el default; override por parada vía `EventGruposAssignModal` (IconTag). Con filtro de grupos activo, **no se listan vehículos** asignados a otros grupos (ni sus paradas).
- Al eliminar un grupo: el panel lista eventos asociados y permite **conservarlos desasociados** o **enviarlos a la papelera** (`is_deleted`) junto con el grupo.

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
- [x] Comidas: varios eventos del mismo servicio por día (+ sibling)
- [x] Transportes: default vehículo, copia al crear, bulk Aplicar, override por parada
