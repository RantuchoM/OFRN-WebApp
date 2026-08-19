# Spec: Validación de Adaptaciones de Orgánico

## Contexto
En la OFRN, el orgánico convocado puede diferir del teórico de la obra por decisiones artísticas. Se marca esa diferencia como **revisada por bloque de repertorio** para no pintar alertas cuando la adaptación está validada.

## Fuente de verdad (BD)
- **Tabla `programas_repertorios`** (por bloque):
  - `organico_revisado` (BOOLEAN, DEFAULT FALSE)
  - `organico_comentario` (TEXT, nullable)
- Migración: `supabase/migrations/20260819120000_programas_repertorios_organico_validation.sql` (backfill desde `programas`).
- **`programas.organico_revisado` / `organico_comentario`**: **obsoletos**. No se escriben desde la app. Conservados por compatibilidad.

## Agregado de programa
Cuando una vista muestra el programa entero (roster, auditoría resumen, sandbox):
- **Revisado** = todos los bloques tienen `organico_revisado === true`.
- **Comentario** = comentarios no vacíos unidos (`Bloque: texto` si hay más de un bloque).
- Helper: `aggregateOrganicoFromBlocks` en `src/utils/instrumentation.js`.

## Modal de Control (`InstrumentationSummaryModal`)
La sección **"Validación de Orgánico"** aparece si hay `repertorioId` + `supabase`:
- Checkbox y textarea guardan con debounce 500 ms en **`programas_repertorios`**.
- `onOrganicoSave` recibe `{ organico_revisado, organico_comentario, id_repertorio }`.
- Sin `repertorioId` (p. ej. roster con varios bloques): solo comparativo, sin tilde.

## Lógica de UI (Colores de los chips)
Prioridad del fondo Req/Conv:
- **Celeste**: orgánico revisado del alcance actual (bloque, o todos los bloques en vistas de programa).
- **Naranja**: mismatch y no revisado.
- **Amarillo**: sin mismatch pero hay vacantes (`es_simulacion`).
- **Verde**: sin mismatch y sin vacantes.

## Impacto en archivos

### RepertoireManager
- Chips Req/Conv **por bloque** (admin/editor) con tilde y comentario de ese bloque. Un recuadro apilado (Conv arriba, Req abajo).

### ProgramSeating
- Req/Conv y modal del **bloque activo** (pestaña); persistencia en ese `programas_repertorios`.

### GiraRoster
- Chips del header: agregado de todos los bloques (celeste si todos están revisados).
- El modal abre con **pestañas por bloque**: obras y convocados de ese bloque (roster filtrado por grupos del bloque). Tilde y comentario se guardan en el bloque activo.

### InstrumentationAudit
- Resumen Conv/Req Max usa el agregado (azul si todos los bloques revisados).
- Expandido: un checkbox + textarea **por bloque**.

### Sandbox
- Matriz usa el agregado; el modal guarda en el bloque único si hay uno solo.

## Notas
- Tooltip de comentario: atributo nativo `title`.
- Un solo bloque se siente como “tilde general”; con varios bloques cada uno se valida aparte.
