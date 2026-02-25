## Especificación: Columna "Próxima Gira" en Repertorio

### Objetivo

- **Propósito**: Permitir ver, para cada obra del archivo, en cuál gira futura está programada a continuación, y ordenar el repertorio por urgencia de ejecución.
- **Ámbito**: Vista `RepertoireView` (tabla de obras) en el front-end. No modifica el modelo de datos en Supabase, solo las consultas y el procesamiento en cliente.

### Modelo de Datos (lectura)

- **Tabla base**: `obras`
- **Relaciones relevantes**:
  - `repertorio_obras` (relación obra ↔ bloque de repertorio).
  - `programas_repertorios` (bloque de repertorio dentro de una gira).
  - `programas` (giras).
- **Select Supabase deseado en `fetchWorks`**:
  - Desde `obras`, incluir:
    - `obras_compositores (rol, compositores (apellido, nombre, paises (nombre)))`
    - `obras_palabras_clave (palabras_clave (id, tag))`
    - `usuario_carga:integrantes!id_usuario_carga (apellido, nombre)`
    - `repertorio_obras (programas_repertorios (programas (id, nombre_gira, fecha_desde, fecha_hasta)))`

### Definición de "Próxima Gira"

- **Fecha de referencia**: El día actual (\( CURRENT\_DATE \)), interpretado como fecha sin hora.
- **Conjunto de giras candidatas para una obra**:
  - Todas las entradas de `programas` asociadas a la obra a través de:
    - `obras` → `repertorio_obras` → `programas_repertorios` → `programas`.
- **Filtro de giras futuras**:
  - Solo se consideran giras con `programas.fecha_desde >= CURRENT_DATE`.
  - Se ignoran giras sin `fecha_desde` válida.
- **Selección de la "Próxima Gira"**:
  - Entre las giras futuras candidatas, se elige la que tenga la `fecha_desde` más cercana (mínima) respecto de la fecha de hoy.
  - Si la obra está en varios bloques de la misma gira, esa gira cuenta una sola vez.
  - Si no hay giras futuras, la obra **no tiene "Próxima Gira"**.

### Campos derivados en la obra (front-end)

Para cada obra procesada en `RepertoireView` se añaden los campos:

- **`proxima_gira_nombre`**: `string | null`
  - Nombre de la gira (`programas.nombre_gira`) seleccionada como próxima.
  - `null` si la obra no tiene giras futuras.
- **`proxima_gira_fecha_desde`**: `string | null`
  - Fecha de inicio (`programas.fecha_desde`) de la próxima gira, en el formato devuelto por Supabase.
  - Se usará exclusivamente como clave de ordenamiento.
- **`proxima_gira_fecha_hasta`**: `string | null`
  - Fecha de fin (`programas.fecha_hasta`) de la próxima gira.
  - Se usa solo para mostrar texto en la UI.

### Reglas de Negocio

- **Obras sin giras futuras**:
  - En la tabla se muestra un guion simple: `"-"`.
  - Internamente, los campos derivados se mantienen como `null`.
- **Referencia temporal**:
  - La comparación se hace respecto a la fecha actual del navegador (`new Date()`), normalizada a comienzo de día para emular `CURRENT_DATE`.
- **Orden lógico**:
  - Al ordenar por `proxima_gira_fecha_desde` ascendente:
    - Las obras sin próxima gira aparecen al final.
    - Las obras con próxima gira se ordenan de la más próxima a la más lejana.

### Requerimientos Técnicos

- **Consulta Supabase en `fetchWorks`**:
  - Ampliar el `select` de `obras` para incluir la cadena de relaciones:
    - `repertorio_obras (programas_repertorios (programas (id, nombre_gira, fecha_desde, fecha_hasta)))`.
- **Procesamiento en cliente (`processed`)**:
  - A partir de los datos anidados, construir la lista de giras asociadas a cada obra.
  - Filtrar por `fecha_desde >= hoy`.
  - Seleccionar la gira con `fecha_desde` mínima.
  - Calcular y adjuntar los campos:
    - `proxima_gira_nombre`
    - `proxima_gira_fecha_desde`
    - `proxima_gira_fecha_hasta`
- **Librería de fechas**:
  - Utilizar `date-fns` (ya presente en el proyecto) para:
    - Parsear cadenas de fecha (`parseISO`).
    - Comparar fechas (`isBefore`).

### UI / UX en `RepertoireView`

- **Nueva columna**: `"Próxima Gira"`.
- **Formato de visualización**:
  - Cuando existe próxima gira:
    - `{nombre_gira} (hasta {fecha_hasta})`
    - `fecha_hasta` se muestra como `dd/MM/yy`.
  - Cuando no existe próxima gira:
    - Mostrar `"-"` en estilo apagado.
- **Gestor de columnas (`ColumnManager`)**:
  - Registrar un nuevo item con:
    - `key: "proxima_gira"`
    - `label: "Próxima Gira"`
  - Integrar en el estado `visibleColumns` del componente principal:
    - `proxima_gira: true` por defecto.
- **Layout (`gridTemplate`)**:
  - Incluir la columna `"Próxima Gira"` en la definición de `gridTemplateColumns`, preferentemente:
    - Después de la columna `"Estado"` y antes de `"F. Esperada"`.

### Ordenamiento

- **Clave de orden**:
  - Usar el campo derivado `proxima_gira_fecha_desde` como `sortConfig.key`.
- **Comportamiento esperado**:
  - Orden ascendente:
    - Obras con próxima gira se ordenan de más próxima a más lejana.
    - Obras sin próxima gira se colocan al final (usando un valor de relleno muy futuro).
  - Orden descendente:
    - Obras con próxima gira se ordenan de más lejana a más próxima.
    - Obras sin próxima gira se colocan al inicio o al final según convención elegida; para este proyecto se mantendrán también al final para consistencia visual.
- **Integración con `handleSort`**:
  - El `header` de la nueva columna debe llamar a `handleSort("proxima_gira_fecha_desde")`.
  - `SortIcon` debe reflejar el estado de orden actual para esa clave.

### Casos de Borde

- **Giras sin `fecha_desde`**:
  - Se ignoran para el cálculo de "Próxima Gira".
- **Giras con `fecha_desde` en el pasado**:
  - No se consideran para "Próxima Gira".
- **Obras en varias giras futuras**:
  - Se selecciona siempre la de `fecha_desde` más cercana respecto a hoy.
- **Obras en varios bloques de la misma gira**:
  - No se hace diferenciación por bloque; la próxima gira es esa gira.

### Estado de Implementación

- **Estado**: Completado
- **Última revisión**: 2026-02-25
- **Notas**:
  - `fetchWorks` en `RepertoireView` ya incluye la relación `repertorio_obras → programas_repertorios → programas` y calcula los campos derivados de próxima gira.
  - La vista de repertorio muestra la columna `"Próxima Gira"` con formato `{nombre_gira} (hasta dd/MM/yy)` y permite ordenar por `proxima_gira_fecha_desde`.
  - La columna está integrada en `ColumnManager` y en el sistema de `visibleColumns`.

