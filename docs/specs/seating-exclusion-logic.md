# Spec: Filtrado Estricto de Exclusiones en Seating

## Objetivo
Garantizar que los miembros de ensambles excluidos no aparezcan en ninguna instancia del Seating, independientemente de si su familia de instrumento está convocada.

## Reglas de Filtrado
1. **Prioridad de Fuente**: Si una gira tiene una fuente de tipo `ENSAMBLE` con un `valor_id` específico y esta se marca como excluida (o simplemente no se incluye en la resolución activa), sus miembros deben ser omitidos.
2. **Jerarquía de Resolución**: 
   - El Roster debe calcularse primero.
   - El Seating debe consumir el `enrichedRoster` que ya viene filtrado por `giraService`.
   - Si un músico aparece en el Seating pero su ensamble está excluido, significa que el componente de Seating está usando una lista de integrantes "maestra" en lugar de la lista "filtrada por gira".

## Acción Correctiva
Refactorizar el selector de músicos en la vista de Seating para validar contra el estado de resolución de `giraService`.

## Grupos de convocatoria por bloque
- El seating consume `useGiraRoster` (ausentes / no confirmados fuera) y, si el **bloque activo** tiene filas en `programas_repertorios_grupos`, recorta el roster visible a la unión de miembros de esos grupos.
- Bloque sin grupos = roster confirmado completo (comportamiento histórico).
- El **panel de edición** de cuerdas usa el mismo recorte por grupo del bloque activo (disponibles + atriles visibles). Los ítems de músicos fuera del filtro quedan ocultos pero persisten en la config compartida.
- **UI pestañas:** chip de grupo en pestaña inactiva = iniciales (`compact`); pestaña activa = nombre completo. No cambia el filtro.

## Configs de cuerdas multi-bloque (2026-08-27)
- Tabla `seating_cuerdas_configs` (`id_programa`, `nombre`, `sort_order`, `bloque_ids[]`). Contenedores: `seating_contenedores.id_config` (NOT NULL).
- **1 config** en la gira → aplica a **todos** los bloques (aunque `bloque_ids` esté vacío).
- **N configs (alternativas)** → asociación **1:1** bloque↔config (`bloque_ids` con un solo id). Resolución: (1) dueño 1:1 del bloque; (2) config con `bloque_ids={}` (fallback); (3) primera por `sort_order`.
- Sin UI de chips «Asociar»: al crear/duplicar / «Config para este bloque» se reclama el bloque activo en exclusiva (`claimCuerdasBloqueOneToOne`).
- Unicidad de músico: **una vez por config** (no por programa). El mismo integrante puede estar en atriles distintos en configs distintas.
- Helper: `src/utils/seatingCuerdasConfig.js`. UI: pills en la fila de Bloques + Duplicar; oferta «Config para este bloque» si la disposición es compartida.
- PDF: una sección de disposición por config. Mis Partes resuelve contenedor según el bloque de la obra.

## Deduplicación de Cuerdas en Contenedores
- **Regla:** dentro de **una** config de cuerdas, cada `id_musico` debe aparecer como máximo una vez en `seating_contenedores_items` para los contenedores de esa config.
- **Lectura:** si existen filas duplicadas persistidas, las vistas de Seating, reportes, listados y composición `Str` deben mostrar solo la posición visual más alta. La prioridad visual se resuelve por `seating_contenedores.orden`, luego `atril_num`, `lado`, `orden` e `id` de la fila.
- **Escritura:** cualquier cambio realizado desde el manager de cuerdas (crear/editar/eliminar contenedor, agregar/mover/quitar músicos, importar o reordenar) dispara una limpieza persistente que borra las filas duplicadas y conserva la misma fila ganadora que se muestra en lectura.
- **Estado:** implementado en `src/utils/seatingStringItemsDedupe.js`, `ProgramSeating.jsx`, `GlobalStringsManager.jsx` y consumidores directos de seating.

## Undo / redo — disposición de cuerdas (2026-08-28)
- [x] **In-memory** (no localStorage): stack por sesión en `useUndoStack` + snapshots en `seatingCuerdasUndo.js` (`cloneCuerdasSnapshot` / `applyCuerdasSnapshot`). Se resetea al cambiar config o programa.
- [x] **Atajos:** Ctrl+Z deshacer · Ctrl+Y / Ctrl+Shift+Z rehacer (ignorados en inputs/modales de edición).
- [x] **UI:** botones Deshacer/Rehacer en toolbar de `GlobalStringsManager`; hint «Ctrl+Z deshacer».
- [x] **Cubre:** drag-and-drop (mover/agregar desde pool), quitar músico, crear/editar/eliminar grupo, grupos base, aplicar sugerencias, reordenar modal, importar disposición.
- [x] **No cubre:** CRUD de configs (crear/duplicar/eliminar/renombrar config de cuerdas).
- [x] **Persistencia al undo:** restaura contenedores + ítems en Supabase (preserva IDs cuando la DB lo permite) y refresca vía `onUpdate`.
- **Por qué no localStorage:** evita desfase con la DB, otras pestañas o usuarios; el caso de uso es corregir el último movimiento en la misma sesión (igual que stage plot).
