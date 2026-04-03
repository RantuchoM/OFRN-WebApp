# Especificación técnica: Anticipos y fechas de rendición personalizados

## 1. Objetivo

Permitir que la administración de la OFRN pueda sobrescribir el cálculo automático de anticipos para casos excepcionales y definir una fecha de rendición específica por gira, distinta a la calculada automáticamente.

## 2. Base de datos (Supabase)

### 2.1 Tabla `giras_viaticos_detalle` (uso real en la app)

La pantalla de viáticos por gira persiste filas en **`giras_viaticos_detalle`**, no en `giras_viaticos`.
**Importante:** ejecutar solo `ALTER TABLE giras_viaticos ... anticipo_custom` no es suficiente; el PATCH del front va a **`giras_viaticos_detalle`**. Sin la columna ahí, PostgREST devuelve **400**.

- **`anticipo_custom`** (`numeric`, nullable): monto manual de anticipo. Si es `null`, se usa el viático calculado (`días × valor diario efectivo`) o, en la vista, la lógica de histórico/backup cuando el toggle correspondiente está activo.

### 2.2 Tabla `giras_viaticos` (legacy / esquema)

En el esquema del repo también existe la columna homónima en `giras_viaticos` para alinear con migraciones que referencien esa tabla; la UI actual no la escribe.

### 2.3 Tabla `giras_viaticos_config`

- **`rendicion_fecha`** (`date`, nullable): fecha límite para presentar la rendición. Si es `null`, en UI y PDF se usa el **primer lunes estrictamente posterior** a `programas.fecha_hasta`.

### 2.4 SQL de migración (referencia)

```sql
ALTER TABLE public.giras_viaticos_detalle
ADD COLUMN IF NOT EXISTS anticipo_custom numeric DEFAULT NULL;

ALTER TABLE public.giras_viaticos
ADD COLUMN IF NOT EXISTS anticipo_custom numeric DEFAULT NULL;

ALTER TABLE public.giras_viaticos_config
ADD COLUMN IF NOT EXISTS rendicion_fecha date DEFAULT NULL;

COMMENT ON COLUMN public.giras_viaticos_detalle.anticipo_custom IS 'Anticipo manual que reemplaza al calculado en exportaciones y totales';
COMMENT ON COLUMN public.giras_viaticos_config.rendicion_fecha IS 'Fecha límite de rendición personalizada para la gira';
```

## 3. Lógica de negocio implementada

### 3.1 Anticipo personalizado (`useViaticosIndividuales` + `ViaticosTable`)

- **`anticipoParaTotal`** en el hook: `anticipo_custom` si viene informado; si no, `subtotal` calculado. **`totalFinal`** = anticipo efectivo + suma de gastos de la fila.
- **Visualización** con modo **Rendiciones** activo (toggle “Rendic.”):
  - Fondo **naranja** (`bg-orange-100`): valor automático (sin `anticipo_custom`).
  - Fondo **azul** (`bg-blue-100`): valor manual (`anticipo_custom` no nulo).
  - **IconEdit**: enfoca el input numérico del anticipo.
  - **IconRefresh**: solo si hay manual; guarda `anticipo_custom = null` en BD.
- Si el usuario confirma un monto igual al cálculo vigente (histórico o actual), se normaliza a `null` para no dejar override innecesario.

### 3.2 Fecha de rendición (`ViaticosManager`)

- Campo **“Rendición hasta”** junto a Motivo/Lugar, con `DateInput`.
- Valor mostrado: `config.rendicion_fecha` o, si falta, `firstMondayAfter(gira.fecha_hasta)` desde `src/utils/dates.js`.
- Persistencia: `updateConfig` → debounce → `giras_viaticos_config.rendicion_fecha`.

### 3.3 Exportación y correo

- **`getEffectiveSubtotalForExport`**: prioridad `anticipo_custom` → histórico (backup) → `subtotal` actual.
- En PDF, la fecha de rendición va en el acrofield **`lugar_y_fecha`** (pie del formulario): ciudad del integrante + fecha límite (`rendicion_fecha` o primer lunes posterior a `fecha_hasta`), mismo formato textual que antes (`"Ciudad, dd de mes de yy"`). Si no hay fecha válida, se usa la fecha de hoy como respaldo.

## 4. Archivos tocados

| Área | Archivo |
|------|---------|
| Fechas | `src/utils/dates.js` (`firstMondayAfter`) |
| Hook | `src/hooks/viaticos/useViaticosIndividuales.js` |
| Tabla | `src/views/Giras/Viaticos/ViaticosTable.jsx` |
| Manager | `src/views/Giras/Viaticos/ViaticosManager.jsx` |
| PDF | `src/utils/pdfFormExporter.js` |
| Esquema | `supabase/schema.sql` |
