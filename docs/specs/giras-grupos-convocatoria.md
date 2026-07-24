# Grupos de convocatoria por gira

## Objetivo

Permitir agrupar integrantes de una gira y asignar esos grupos a eventos (sobre todo ensayos), de modo que cada músico solo vea en agenda los eventos de grupos a los que pertenece.

## Reglas

- Una gira puede tener 0..N grupos (opcionales).
- Una persona puede pertenecer a varios grupos; un evento puede tener uno o más grupos.
- **Ausentes** (`giras_integrantes.estado === 'ausente'`): la membresía en DB se conserva, pero no aparece tag en roster ni cuenta para visibilidad de eventos.
- **Eventos sin `eventos_grupos`**: comportamiento histórico (visible según reglas de roster/ensamble existentes).
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

- **Roster** (`GiraRoster`): botón “Grupos de convocatoria” → CRUD de grupos y checklist de miembros (solo confirmados). Tags junto al nombre en `RosterTableRow` (no en ausentes).
- **Agenda** (`EventForm`, `IndependentRehearsalForm`): multi-select de grupos de la gira; persistencia en create/edit/duplicate.
- **Chips** en `UnifiedAgenda` (móvil y desktop) junto a ensambles cuando el evento tiene grupos.

## Visibilidad

Implementada en `useAgendaData` sobre el select que incluye `eventos_grupos ( giras_grupos (...) )` y membresías del usuario efectivo.

## Checklist

- [x] Migración `giras_grupos` / `giras_grupos_integrantes` / `eventos_grupos`
- [x] Spec viva
- [x] CRUD + tags en roster (`RosterGroupsModal`, `RosterTableRow`, `GiraRoster`)
- [x] Filtro en `useAgendaData` (editores ven todo)
- [x] Chips + asignación en `EventForm` / `IndependentRehearsalForm` / `UnifiedAgenda`
- [x] Push migración a main
