# Spec: Gestión → Seguimiento de viáticos

## Objetivo

Informe en **Gestión → Seguimiento viáticos** (`/management/viaticos_seguimiento`) que consolida **todos los viáticos individuales** (`giras_viaticos_detalle`) del año seleccionado en una planilla estilo Sheets, con marca de color editable.

## Alcance

- Fuente: solo `giras_viaticos_detalle` (no manuales, no destaques, no SCRN).
- **Solo lectura:** persona/rol/tramo, salida, regreso, programa, monto.
- **Editable y persistido:** `seguimiento_color` (`amarillo` | `verde` | `celeste` | `rojo`).
- Filtro por año de `programas.fecha_desde` (default: año calendario actual) + búsqueda por nombre/programa.
- Filtros por columna (valores únicos con checkboxes) en persona, salida, regreso, programa, monto y color.
- Export Excel con las mismas columnas y colores de fila.

## Columnas (UI)

| Columna | Origen |
|--------|--------|
| Persona / Tramo / Rol | `Apellido, Nombre` + `etiqueta_tramo`/`Tramo N` + `cargo` o `giras_integrantes.rol` |
| Salida | `backup_fecha/hora_salida` (fallback eventos de tramo) + vehículo (`patente_oficial` / particular / otros) |
| Regreso | Idem llegada |
| Programa | `formatProgramNomenMes` (`mes_letra \| nomenclador \| zona`) |
| Anticipo | Total anticipado (viático efectivo + gastos), previo a rendición. Ojo 👁 despliega desglose (Viático + Movilidad/Combustible/Alojamiento/Capacit./Mov. Otros/Otros) |
| Dev/Reint | Si rendido &lt; anticipo → **Dev** (celeste); si rendido &gt; anticipo → **Reint** (rojo). Colores invertidos respecto al diseño inicial. |
| Rendición | Suma de `rendicion_viaticos` + gastos rendidos. Ojo 👁 muestra los mismos conceptos en modo rendición (apilado naranja/verde/diff si ambos ojos activos) |
| Color | desplegable persistido (`seguimiento_color`) con muestra de color; pinta la fila |

La columna **Tipo** (`seguimiento_tipo`: Viatico / Reintegro) se retiró de la planilla. El campo sigue en DB por compatibilidad pero ya no se edita ni exporta desde Gestión.

## Base de datos

Migración `20260831201720_giras_viaticos_detalle_seguimiento.sql`:

- `seguimiento_tipo text` nullable, check `viatico|reintegro` (legado, no se usa en UI)
- `seguimiento_color text` nullable, check `amarillo|verde|celeste|rojo`

## Archivos

| Área | Archivo |
|------|--------|
| Servicio | `src/services/viaticosSeguimientoService.js` |
| Vista | `src/views/Management/ViaticosSeguimientoReport.jsx` |
| Shell Gestión | `src/views/Management/ManagementView.jsx`, `src/constants/managementPalette.js`, `src/App.jsx` |
| Migración | `supabase/migrations/20260831201720_giras_viaticos_detalle_seguimiento.sql` |

## Checklist

- [x] Migración aplicada en proyecto linked (Local = Remote)
- [x] Informe en menú Gestión + Ctrl+K
- [x] Carga consolidada por año
- [x] Patch de color
- [x] Export Excel
- [x] Spec
- [x] Columna `backup_viatico` asegurada en remoto (`20260831202349_…_ensure`)
- [x] Colores Dev/Reint invertidos (Dev = celeste, Reint = rojo)
- [x] Columna Tipo retirada de UI y Excel
- [x] Desplegable de color con swatch visible

## Fuera de alcance

- Editar montos desde Gestión.
- Sync con Google Sheets.
- Viáticos manuales / destaques.
