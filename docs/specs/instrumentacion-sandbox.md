# Spec: Modo Sandbox — Gestión Instrumentación

## Objetivo

Simular cambios de convocatoria gira por gira (ensambles, familias, exclusiones y personas) sin escribir en producción hasta confirmar, visualizando el impacto en instrumentación y en la distribución de servicios Sinfónico + Camerata Filarmónica por ensamble regional.

## Ubicación

**Gestión** → **Instrumentación** → toggle **Sandbox**.

Vista orquestadora: `src/views/Management/InstrumentationSandbox.jsx`.

## Layout (filas con borrador inline + histograma)

| Zona | Contenido |
|------|-----------|
| Cada fila (izq.) | Meta (título con enlace a roster en nueva pestaña), **chips ensamble/familia convocados y excluidos** en la misma línea, matriz Conv/Req compacta con **celdas pintadas** (verde ok, naranja/azul déficit o exceso, violeta cambio de borrador; si borrador y aún déficit → celda violeta y número rojo) + bloque **Str:** a la derecha de la matriz; botón **Ver obras** en la esquina superior izquierda de la matriz (celda sobre «Conv») → `InstrumentationSummaryModal`. |
| Cada fila (der., ~11rem) | Desplegables **Agregar / Quitar / Excluir** (portal `fixed` hacia abajo y ancho hacia la derecha; 2 columnas si hay muchas opciones); **+ músico / - músico** con búsqueda; chips del delta del borrador. |
| Histograma (columna derecha global) | Servicios Sinf+CF por ensamble regional: **suma anual**; hover en celda: «Con *n* servicios…» donde *n* es el encabezado de columna (no el número de la celda). |

## Persistencia

- `instrumentacion_sandbox` — escenario singleton (`singleton_key = 'active'`).
- `instrumentacion_sandbox_gira` — borrador por gira: `fuentes` + `integrantes` (jsonb).

Migración: `supabase/migrations/20260629120000_instrumentacion_sandbox.sql`. En proyectos sin RLS global, aplicar también `20260629130100_instrumentacion_sandbox_disable_rls.sql`.

## Flujos

1. **Editar en la fila:** desplegables **Agregar** / **Quitar** / **Excluir** y + músico / - músico. **Agregar** lista ensambles/familias no incluidos (ensambles excluidos se muestran como «(excluido)» y al elegirlos se quitan de `EXCL_ENSAMBLE`). **Quitar** lista solo familias incluidas y ensambles incluidos que tengan **al menos un músico convocado** (no ausente) perteneciente a ese ensamble en el roster efectivo. **Excluir** lista ensambles regionales aún no excluidos. Al cambiar ensambles o familias, los chips muestran **solo la fuente** (no un chip por integrante); los chips de persona aparecen solo con override manual (+/- músico).
2. Autosave (~400 ms); recálculo incremental de esa fila + histograma. Si fuentes e integrantes vuelven a producción, el borrador se **elimina** automáticamente (`deleteGiraDraft`). Los chips acumulan **todo el delta vs producción**; al guardar no se pierden cambios previos de la misma fila. La **×** en un chip revierte ese cambio; si el borrador queda idéntico a producción, se descarta solo. Saves obsoletos no sobrescriben el borrador (`saveGenerationRef`). Borrador con `integrantes: []` se interpreta como producción al calcular roster **y** al comparar para descarte. **Aplicar** y el borde violeta de la fila usan `hasPendingChanges` (delta real), no solo la existencia de fila en DB.
3. **Ver obras:** modal con desglose por obra (usa `obras.instrumentacion` si particellas/seating no alcanzan) + compositor desde join `obras_compositores`.
4. **Descartar:** en la misma fila, elimina borrador de esa gira.
5. **Aplicar cambios:** en la fila, modal con **motivo único** (obligatorio) → escribe en `giras_fuentes` / `giras_integrantes` → elimina borrador de la gira.
6. **Aplicar todos los cambios:** botón en barra superior → modal con motivo único.
7. **Descartar cambios:** botón en barra superior → confirma y elimina todos los borradores del escenario (sin tocar producción).

## Notificaciones al aplicar

- Se detectan músicos **nuevos** (confirmados en borrador, no activos en producción) con mail.
- Si `notificaciones_habilitadas !== false` y `notificacion_inicial_enviada === true`, se envía mail `convocatoria_gira` (variante ALTA) con `reason`: `Se te convoca a la gira. {motivo}` — **mismo motivo para todos**.
- Checkbox en modal para omitir envío.

Funciones: `applyGiraDraftWithNotifications`, `applyAllSandboxDrafts`, `discardAllSandboxDrafts`, `computeAddedMusiciansForDraft`.

## Componentes

| Archivo | Rol |
|---------|-----|
| `InstrumentationSandbox.jsx` | Layout filas + subcolumna + histograma, apply all, modal |
| `SandboxProgramCard.jsx` | Fila compacta (solo lectura + selección) |
| `SandboxConvocatoriaInline.jsx` | Borrador inline por fila (chips toggle) |
| `SandboxProgramList.jsx` | Lista de tarjetas |
| `SandboxApplyModal.jsx` | Motivo único + confirmación |
| `SandboxEnsambleHistogram.jsx` | Histograma derecho |
| `instrumentacionSandboxService.js` | CRUD, apply, notificaciones |
| `instrumentacionSandbox.js` | Cálculos overlay e histograma |

## Estado de implementación

| Requisito | Estado |
|-----------|--------|
| Migración DB + RLS | Completado (remoto OFRN) |
| Borrador inline por fila (chips) | Completado |
| Aplicar uno / aplicar todos | Completado |
| Descartar todos los borradores | Completado |
| Notificaciones alta con motivo único | Completado |
| Histograma sin columnas vacías | Completado |
| Layout filas con borrador derecho + histograma | Completado |

## Fuera de alcance

- Múltiples escenarios nombrados.
- Vacantes simuladas en sandbox.
- Histograma tipo Ensamble.

## Performance (DB)

Migración `20260629140000_instrumentacion_perf_indexes.sql`: índices en `giras_fuentes`, `giras_integrantes`, `programas_repertorios`, `repertorio_obras`, `obras_particellas`, `seating_*`, `programas` (tipo/fechas), `integrantes` (estables), `instrumentos.familia`, `giras_localidades`. Aplicada en remoto OFRN vía `supabase db query --linked`.

## Performance (frontend Sandbox)

- [x] **`computeAllSandboxProgramMetrics`**: convocatoria productiva en batch (`batchFetchProductionConvocatoria`), seating labels en batch (`batchFetchMusicianSeatingContainerLabels`), roster draft solo si fuentes/integrantes difieren de producción.
- [x] **`buildSandboxRosterByGiraIdBatch`**: histograma Sinf+CF con prefetch compartido (integrantes, ensambles, familias, vigencia) — una pasada baseline + draft en memoria.
- [x] Histograma no se recarga en cada autosave de borrador; solo al cambiar año/filtros o tras apply/discard masivo; incremental vía `refreshGiraMetrics`.

## `obras.instrumentacion` (sync BD)

- [x] Trigger `obras_particellas_sync_instrumentacion` recalcula `obras.instrumentacion` ante cambios en `obras_particellas`.
- Función SQL: `public.calculate_obra_instrumentacion` — paridad con `calculateInstrumentation` en `src/utils/instrumentation.js` (aviso PARIDAD BD en ese archivo).
- Migración: `20260630120000_obras_instrumentacion_sync_trigger.sql` (+ backfill de obras con particellas).
- Sin particellas: el campo sigue siendo aproximación manual editable en WorkForm.
- Con particellas: SSOT en BD; el JS calcula solo para preview en pantalla (`WorkForm` ya no hace `UPDATE obras.instrumentacion` al guardar particellas).
- [x] `WorkForm`: campo instrumentación **solo lectura** cuando hay particellas (aproximación manual solo sin particellas).

## `repertorio_obras.tiene_asignaciones_multiples`

- [x] Columna bool en `repertorio_obras`; trigger en `seating_asignaciones` la actualiza por par `(id_programa, id_obra)`.
- `true`: algún músico tiene **más de una particella** asignada en seating para esa obra en ese programa.
- Auditoría / sandbox: si `false` → `buildWorkInstrumentationAuditRow` usa `obras.instrumentacion` (`preferObrasInstrumentacion`); si `true` → cálculo completo con seating.
- Migración: `20260630130000_repertorio_obras_asignaciones_multiples.sql`.
