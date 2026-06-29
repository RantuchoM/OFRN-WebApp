# Spec: Modo Sandbox — Gestión Instrumentación

## Objetivo

Simular cambios de convocatoria gira por gira (ensambles, familias, exclusiones y personas) sin escribir en producción hasta confirmar, visualizando el impacto en instrumentación y en la distribución de servicios Sinfónico + Camerata Filarmónica por ensamble regional.

## Ubicación

**Gestión** → **Instrumentación** → toggle **Sandbox**.

Vista orquestadora: `src/views/Management/InstrumentationSandbox.jsx`.

## Layout (filas con borrador inline + histograma)

| Zona | Contenido |
|------|-----------|
| Cada fila (izq.) | Meta (título con enlace a roster en nueva pestaña), **chips ensamble/familia convocados y excluidos** en la misma línea, matriz Conv/Req compacta + **`Str: (…).…`**; botón **Ver obras** en la esquina superior izquierda de la matriz (celda sobre «Conv») → `InstrumentationSummaryModal`. |
| Cada fila (der., ~11rem) | Desplegables **Agregar / Quitar / Excluir**; **+ músico / - músico** con búsqueda; chips del delta del borrador. |
| Histograma (columna derecha global) | Servicios Sinf+CF por ensamble regional: **suma anual**; hover en celda: «Con *n* servicios…» donde *n* es el encabezado de columna (no el número de la celda). |

## Persistencia

- `instrumentacion_sandbox` — escenario singleton (`singleton_key = 'active'`).
- `instrumentacion_sandbox_gira` — borrador por gira: `fuentes` + `integrantes` (jsonb).

Migración: `supabase/migrations/20260629120000_instrumentacion_sandbox.sql`. En proyectos sin RLS global, aplicar también `20260629130100_instrumentacion_sandbox_disable_rls.sql`.

## Flujos

1. **Editar en la fila:** desplegables **Agregar** / **Quitar** / **Excluir** y + músico / - músico. Al cambiar ensambles o familias, los chips muestran **solo la fuente** (no un chip por integrante); los chips de persona aparecen solo con override manual (+/- músico).
2. Autosave (~400 ms); recálculo incremental de esa fila + histograma. Los chips acumulan **todo el delta vs producción**; al guardar no se pierden cambios previos de la misma fila. La **×** en un chip revierte ese cambio; si el borrador queda idéntico a producción, se descarta solo. Saves obsoletos no sobrescriben el borrador (`saveGenerationRef`). Borrador con `integrantes: []` se interpreta como producción al calcular roster.
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
