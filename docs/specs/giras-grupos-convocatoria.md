# Grupos de convocatoria por gira

## Objetivo

Permitir agrupar integrantes de una gira y asignar esos grupos a eventos (sobre todo ensayos), de modo que cada músico solo vea en agenda los eventos de grupos a los que pertenece.

## Reglas

- Una gira puede tener 0..N grupos (opcionales).
- Una persona puede pertenecer a varios grupos; un evento puede tener uno o más grupos.
- **Ausentes** (`giras_integrantes.estado === 'ausente'`): la membresía en DB se conserva, pero no aparece tag en roster ni cuenta para visibilidad de eventos.
- **Eventos sin `eventos_grupos`**: comportamiento histórico (visible según reglas de roster/ensamble existentes). Son los “eventos generales”.
- **Eventos con ≥1 grupo**: el músico solo los ve si pertenece (efectivamente) a al menos uno.
- **Editores / management** (`admin`, `editor`, `coord_general`, `director`): ven **todos** los eventos; las cards muestran chips del grupo.

## Modelo

| Tabla | Rol |
|-------|-----|
| `giras_grupos` | Nombre, color, orden por `id_gira` → `programas` |
| `giras_grupos_integrantes` | Membresía `(id_grupo, id_integrante)` |
| `eventos_grupos` | Asignación `(id_evento, id_grupo)` |

Migración: `supabase/migrations/20260724120000_giras_grupos.sql`.

## UI

- **Roster** (`GiraRoster`): botón “Grupos de convocatoria” → CRUD de grupos y tabla de miembros (solo confirmados) con columnas Nombre / Instrumento / Localidad (residencia) / Ensamble/s, filtros por columna y ordenación (al cargar o reordenar, los ya seleccionados quedan arriba; tildar no reordena). Tags junto al nombre en `RosterTableRow` (no en ausentes); los editores pueden quitar del grupo con la cruz del chip (confirmación).
  - **Móvil**: el header duplicado (Volver + título) se oculta; la toolbar queda compacta/scrolleable con el botón **Grupos** siempre con etiqueta visible; modal en sheet inferior (`RosterGroupsModal`) scrolleable.
- **Agenda** (`EventForm`, `IndependentRehearsalForm`): multi-select de grupos de la gira; persistencia en create/edit/duplicate.
- **Chips** en `UnifiedAgenda` apilados en vertical en columna propia; el `IconTag` queda a la izquierda del primer chip (o solo, si no hay grupos).
- **Tag rápido** (`IconTag` junto al ojo/técnico): abre `EventGruposAssignModal` con **checklist** de grupos (no desplegable) para asignar sin abrir el form completo. Solo editores/admins y solo si la gira ya tiene grupos.
- **Filtro de grupos** (toolbar, entre Filtros y “Ver como…”): control unificado (multiselect + segmento “+ Gen.” pegado) para incluir o no eventos generales. Solo editores/admins si hay grupos en la gira.
- **Crear evento (+)**: si el filtro de grupos tiene selección, el form precarga `selectedGrupos` con esos IDs.
- Al eliminar un grupo: el panel lista eventos asociados y permite **conservarlos desasociados** o **enviarlos a la papelera** (`is_deleted`) junto con el grupo.

## Visibilidad

Implementada en `useAgendaData` sobre el select que incluye `eventos_grupos ( giras_grupos (...) )` y membresías del usuario efectivo.

El filtro de toolbar en `UnifiedAgenda` es una vista editorial adicional (no cambia la visibilidad base de músicos).

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
