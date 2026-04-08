# Spec: Reporte Matriz de Asistencia (Músicos vs. Programas)

## Objetivo

Visualizar en un cuadro de doble entrada la participación de integrantes en los diferentes programas/giras de la orquesta, permitiendo filtrar por ensamble y tipo de programa.

## Requerimientos Funcionales

1. **Selector de Árbol (Lado Izquierdo/Filtros):**
   - Jerarquía: Ensamble > Integrantes.
   - Capacidad de tildar/destildar nodos completos o individuales.
2. **Selector de Programas (Filtros):**
   - Checkboxes por `tipo_programa` (Sinfónico, Cámara, etc.).
   - Toggle: "Mostrar programas anteriores del año" (Filtra por fecha >= actual por defecto).
3. **Matriz de Datos:**
   - **Eje Y (Filas):** Nombre y Apellido del integrante.
     - Subtexto: Instrumento y Ensamble (tamaño pequeño).
     - Orden: Por `id_instrumento` (prioridad orquestal).
   - **Eje X (Columnas):** Programas.
     - Etiqueta: `nomenclador` + `mes_letra`.
     - Hover: Título y subtítulo del programa.
     - Link: Acceso directo a la sección de repertorio del programa.
     - Orden: Cronológico ascendente.
4. **Intersección:**
   - Mostrar una cruz (X) si el integrante pertenece a la gira (resolviendo `giras_fuentes` y validando que no esté en `giras_integrantes` como 'ausente').

## Lógica de Negocio (Reglas de Oro)

- El ID del integrante es numérico (PK Integer).
- La resolución de integrantes por gira debe usar la lógica de `resolveGiraRosterIds` definida en `src/services/giraService.js` (reexportada desde `src/services/supabase.js` para consumo unificado). Incluye fuentes `ENSAMBLE`, `FAMILIA`, `EXCL_ENSAMBLE` y overrides en `giras_integrantes` (excluyendo `estado === 'ausente'`).
- En base de datos, el vínculo del integrante al instrumento es `integrantes.id_instr` → `instrumentos.id` (orden de filas alineado a la tabla maestra de instrumentos).

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
| Tooltip en cabecera con título/subtítulo y enlace a repertorio (`?tab=giras&view=REPERTOIRE&giraId=`) | Completado |
| Cruce con `resolveGiraRosterIds` (misma lógica que nómina) | Completado |
| Tabla con primera columna y primera fila sticky (Tailwind) | Completado |
| Ubicación: **Gestión** (`?tab=management`) → pestaña **Convocatorias** | Completado |
| Agregación de datos en `fetchAsistenciaMatrixBaseData` (`src/services/giraService.js`) | Completado |

**Nota:** El orden orquestal de filas usa `integrantes.id_instr` (PK en `instrumentos`), coherente con la jerarquía definida en datos maestros; `src/utils/instrumentation.js` aplica a analítica de partituras, no a esta lista de personas.
