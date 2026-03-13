# Spec: Validación de Adaptaciones de Orgánico (Tabla: Programas)

## Contexto
En la OFRN, el orgánico convocado puede diferir del teórico de la obra por decisiones artísticas. Esta spec permite marcar dichas diferencias como "Revisadas" para evitar alertas visuales erróneas.

## Cambios en BD
- **Tabla `programas`**:
  - `organico_revisado` (BOOLEAN, DEFAULT FALSE): Indica si el director ha validado las adaptaciones de instrumentación.
  - `organico_comentario` (TEXT, nullable): Descripción de las adaptaciones artísticas validadas para este programa.
- Migración: `supabase/migrations/20250313_programas_organico_validation.sql`.

## Modal de Control de Instrumentación
El **InstrumentationSummaryModal** (abierto desde los chips en ProgramSeating, GiraRoster y ProgramRepertoire) incluye una sección **"Validación de Orgánico"** cuando se le pasan `programId` y `supabase`:
- **Checkbox** "Orgánico revisado (adaptación validada)" → actualiza `organico_revisado`.
- **Textarea** para comentario opcional → actualiza `organico_comentario`.
- Guardado automático con debounce (500 ms) en la tabla `programas`. Tras guardar se llama `onOrganicoSave` para que el padre pueda refrescar el programa (p. ej. `handleGiraUpdate` en GirasView).

## Lógica de UI (Colores de los chips)
El **fondo general de los chips** de instrumentación (Req/Conv) sigue esta prioridad:
- **Celeste** (`bg-sky-100 text-sky-700 border-sky-300`): El bool "Orgánico revisado" está tildado (`organico_revisado === true`). Indica adaptación validada.
- **Naranja** (`bg-orange-100 text-orange-700 border-orange-300`): Hay diferencias entre requerido y convocado y el bool no está tildado (errores sin validar).
- **Amarillo** (`bg-amber-100 text-amber-700 border-amber-300`): No hay diferencias de instrumentación pero hay vacantes por cubrir (algún integrante con `es_simulacion === true` en el roster).
- **Verde** (`bg-emerald-50 text-emerald-700 border-emerald-200`): Todo en orden (sin diferencias y sin vacantes pendientes).

Orden de evaluación: primero se mira `organico_revisado` (celeste); si no, si hay mismatch → naranja; si no hay mismatch pero hay vacantes → amarillo; si no → verde.

## Impacto en Archivos (Implementado)

### 1. Vista de Auditoría de Instrumentación (`src/views/Management/InstrumentationAudit.jsx`)
- Query a `programas` incluye `organico_revisado`, `organico_comentario`.
- Sección **"Validación de Orgánico"** en el desglose expandido de cada programa:
  - Toggle para `organico_revisado`.
  - Textarea para `organico_comentario`.
  - Guardado automático con debounce (500 ms) a la tabla `programas`.
- Celdas de la tabla de resumen (Conv / Req Max): si hay discrepancia y `organico_revisado` → estilo azul (`bg-blue-100 text-blue-700 border-blue-300`); si discrepancia y no revisado → naranja (`bg-orange-500 text-white`).
- **Iconografía**: IconCheckCircle cuando `organico_revisado` es true; IconInfo con tooltip nativo para `organico_comentario` cuando existe.

### 2. InstrumentationSummaryModal (`src/components/seating/InstrumentationSummaryModal.jsx`)
- Nuevas props opcionales: `programId`, `supabase`, `organicoRevisado`, `organicoComentario`, `onOrganicoSave`.
- Si `programId` y `supabase` están definidos, se muestra la sección "Validación de Orgánico" con checkbox y textarea; guardado con debounce 500 ms y llamada a `onOrganicoSave` para refrescar el programa en el padre.

### 3. InstrumentationBadges (`src/components/instrumentation/InstrumentationBadges.jsx`)
- Props: `organicoRevisado`, `organicoComentario`, `programId`, `supabase`, `onOrganicoSave`.
- Fondo de los chips según la lógica de cuatro estados: celeste / naranja / amarillo / verde (ver sección anterior). Se usa `hasVacancies = roster.some(r => r.es_simulacion)` para el estado amarillo.
- Diferencias resaltadas dentro del chip: celeste (sky) si validado, naranja si no.
- IconCheckCircle (sky) cuando `organicoRevisado`; IconInfo con `title={organicoComentario}` cuando hay comentario.
- Al abrir el modal se le pasan `programId`, `supabase`, valores actuales y `onOrganicoSave` para poder editar y guardar desde el modal.

### 4. GiraRoster (`src/views/Giras/GiraRoster.jsx`)
- Recibe `onRefreshGira` (p. ej. `handleGiraUpdate` de GirasView).
- Pasa a `InstrumentationBadges`: `programId={gira?.id}`, `supabase`, `organicoRevisado`, `organicoComentario`, `onOrganicoSave={onRefreshGira}`.

### 5. ProgramRepertoire (`src/views/Giras/ProgramRepertoire.jsx`)
- Recibe `onRefreshGira`; pasa a `InstrumentationBadges`: `programId={program?.id}`, `supabase`, `organicoRevisado`, `organicoComentario`, `onOrganicoSave={onRefreshGira}`.

### 6. ProgramSeating (`src/views/Giras/ProgramSeating.jsx`)
- Recibe `onRefreshGira`; usa `program.organico_revisado`, `program.organico_comentario` y `hasVacancies = rawRoster.some(r => r.es_simulacion)`.
- Botones Req/Conv: misma lógica de cuatro colores (celeste / naranja / amarillo / verde).
- InstrumentationSummaryModal recibe `programId`, `supabase`, `organicoRevisado`, `organicoComentario`, `onOrganicoSave={onRefreshGira}` para poder editar validación desde el modal.
- Resaltado interno en chips: sky si validado, naranja si no.

## GirasView
- Pasa `onRefreshGira={handleGiraUpdate}` a **GiraRoster**, **ProgramRepertoire** y **ProgramSeating**. Tras guardar en el modal se invoca este callback y se refresca el programa en la lista (`handleGiraUpdate` hace select del programa actualizado y actualiza `giras`).

## Queries a `programas`
- **InstrumentationAudit**: select explícito incluye `organico_revisado`, `organico_comentario`.
- **GirasView** (listado de giras): `select('*', ...)` → incluye todas las columnas.
- **handleGiraUpdate** (GirasView): `select("*")` → incluye todas las columnas.
- El resto de vistas (GiraRoster, ProgramRepertoire, ProgramSeating) reciben el programa ya cargado desde GirasView o contexto, con las nuevas columnas presentes.

## Notas
- **Tooltip** para `organico_comentario`: se usa el atributo nativo `title` (estilo coherente con nota interna tipo post-it donde se reutilice).
- **Consistencia**: al centralizar en la tabla `programas`, cualquier cambio en la auditoría se refleja en el Dashboard de los músicos y en las vistas técnicas de los coordinadores (Roster, Repertorio, Seating).
