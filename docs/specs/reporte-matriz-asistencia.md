# Spec: Reporte Matriz de Asistencia (Músicos vs. Programas)

## Objetivo

Visualizar en un cuadro de doble entrada la participación de integrantes en los diferentes programas/giras de la orquesta, permitiendo filtrar por ensamble y tipo de programa.

## Requerimientos Funcionales

1. **Selector de Árbol (Lado Izquierdo/Filtros):**
   - Jerarquía: Ensamble > Integrantes.
   - Capacidad de tildar/destildar nodos completos o individuales.
2. **Selector de Programas (Filtros):**
   - Checkboxes por `tipo_programa` (Sinfónico, Cámara, etc.).
3. **Barra de controles de la matriz (encabezado):**
   - Toggle: "Agrupar por ensambles".
   - Toggle: "Mostrar histórico" (`IconHistory`) — incluye programas anteriores del mismo año calendario; por defecto solo muestra programas con fecha >= hoy.
4. **Matriz de Datos:**
   - **Eje Y (Filas):** Nombre y Apellido del integrante.
     - Subtexto: Instrumento y Ensamble (tamaño pequeño).
     - Orden: Por `id_instrumento` (prioridad orquestal).
   - **Eje X (Columnas):** Programas.
     - Etiqueta: `nomenclador` + `mes_letra`.
     - Click en cabecera: popover tipo mini `GiraCard` (móvil slide 1) con tipo/zona, fechas, localidades, título/subtítulo, ensambles/familias convocados y excluidos (`giras_fuentes`), y enlace a repertorio.
     - Link: Acceso directo a la sección de repertorio del programa.
     - Orden: Cronológico ascendente.
5. **Intersección:**
   - Mostrar **X** si el integrante está convocado con vigencia de legajo en el programa.
   - Mostrar **\*** (gris) si figura en nómina pero su `fecha_alta` es posterior al programa (convocado manual antes del alta); **no suma** en columnas de totales.

## Lógica de Negocio (Reglas de Oro)

- El ID del integrante es numérico (PK Integer).
- La resolución de integrantes por gira debe usar la lógica de `resolveGiraRosterIds` definida en `src/services/giraService.js` (reexportada desde `src/services/supabase.js` para consumo unificado). Incluye fuentes `ENSAMBLE`, `FAMILIA`, `EXCL_ENSAMBLE` y overrides en `giras_integrantes` (excluyendo `estado === 'ausente'`).
- **Vigencias:** convocatoria base exige tramo activo en `integrantes_ensambles` (fecha del programa) y alta/baja del integrante en la orquesta (`integranteActiveOnProgramRange` en `ensembleMembership.js`). Sin `fecha_hasta` en el programa, el rango termina en `fecha_desde`. Los overrides manuales (`giras_integrantes` confirmado) aparecen en nómina; si el alta es posterior al programa se marcan con `*` (pre-alta) y no cuentan en totales (`resolveGiraRosterForMatrix`).
- **Abona reemplazo:** `giras_integrantes.abona_reemplazo` con `estado = ausente` cuenta en totales de servicios y muestra **R** en celeste en la matriz (misma semántica que X para conteos). Migración `20260625120000_giras_integrantes_abona_reemplazo.sql`. Modal de baja individual en roster (`RosterBajaModal`) o toggle **R** sobre la **A** en filas ausentes (`RosterTableRow`; fila cyan, flash al cambiar). Pasar de ausente a presente usa el mismo modal con confirmación y notificación (`action: presente`). Resumen anual de giras (`useGirasYearSummary`) incluye esas giras en el conteo personal.
- En base de datos, el vínculo del integrante al instrumento es `integrantes.id_instr` → `instrumentos.id` (orden de filas alineado a la tabla maestra de instrumentos).
- **Override por gira:** si `giras_integrantes.id_instr` está definido para un programa, la matriz muestra el instrumento efectivo en los programas visibles donde el integrante está en roster (`buildMatrixIntegranteInstrumentDisplay` en `giraUtils.js`). Si toca distintos instrumentos en varias giras, el subtexto une los nombres (`Clarinete / Violín`).

## SQL (Supabase Editor)

No se requieren tablas nuevas; se sugiere una vista para optimizar la carga de la matriz si el rendimiento en el cliente decae, aunque inicialmente lo manejamos vía JS en el componente.

## Estado de Implementación

| Requisito | Estado |
|-----------|--------|
| Documentación en `/docs/specs/reporte-matriz-asistencia.md` | Completado |
| Vista `src/views/Giras/AsistenciaMatrixReport.jsx` | Completado |
| Árbol Ensamble > Integrantes con checkboxes (nodo e hojas) | Completado |
| Filtros por tipo de programa (`programas.tipo`) y toggle de programas pasados del año en curso | Completado |
| Matriz: filas con nombre, subtexto instrumento + ensambles, orden por `id_instr` | Completado |
| Matriz: columnas por programa, orden `fecha_desde` ascendente, cabecera `nomenclador` + `mes_letra` | Completado |
| Popover en cabecera (mini GiraCard + convocatorias + enlace repertorio `?tab=giras&view=REPERTOIRE&giraId=`) | Completado |
| Cruce con `resolveGiraRosterForMatrix` (X contabilizado, `*` pre-alta sin totales) | Completado |
| Tabla con primera columna y primera fila sticky (Tailwind) | Completado |
| Ubicación: **Gestión** (`?tab=management`) → pestaña **Convocatorias** | Completado |
| Agregación de datos en `fetchAsistenciaMatrixBaseData` (`src/services/giraService.js`) | Completado |
| Overrides `giras_integrantes.id_instr` + instrumento efectivo en matriz/export | Completado |
| `abona_reemplazo` en ausentes: marca R celeste + conteo en totales y resumen anual | Completado |
| Panel lateral: chevron `IconChevronDown` (rotación), contador seleccionados por ensamble, filas con hover | Completado |

**Nota:** El orden orquestal de filas usa `id_instr` como texto (`localeCompare` numérico), no `parseInt`. La analítica de partituras sigue en `src/utils/instrumentation.js`.
