# Spec: Gestión → Seguimiento de viáticos

## Objetivo

Informe en **Gestión → Seguimiento viáticos** (`/management/viaticos_seguimiento`) que consolida **todos los viáticos individuales** (`giras_viaticos_detalle`) del año seleccionado en una planilla estilo Sheets, con tipificación y marca de color editables.

## Alcance

- Fuente: solo `giras_viaticos_detalle` (no manuales, no destaques, no SCRN).
- **Solo lectura:** persona/rol/tramo, salida, regreso, programa, monto.
- **Editable y persistido:** `seguimiento_tipo` (`viatico` | `reintegro`) y `seguimiento_color` (`amarillo` | `verde` | `celeste` | `rojo`).
- Filtro por año de `programas.fecha_desde` (default: año calendario actual) + búsqueda por nombre/programa.
- Filtros por columna (valores únicos con checkboxes) en persona, salida, regreso, programa, monto, tipo y color.
- Export Excel con las mismas columnas y colores de fila.

## Columnas (UI)

| Columna | Origen |
|--------|--------|
| Persona / Tramo / Rol | `Apellido, Nombre` + `etiqueta_tramo`/`Tramo N` + `cargo` o `giras_integrantes.rol` |
| Salida | `backup_fecha/hora_salida` (fallback eventos de tramo) + vehículo (`patente_oficial` / particular / otros) |
| Regreso | Idem llegada |
| Programa | `formatProgramNomenMes` (`mes_letra \| nomenclador \| zona`) |
| Anticipo | Total anticipado (viático efectivo + gastos), previo a rendición. Ojo 👁 despliega desglose (Viático + Movilidad/Combustible/Alojamiento/Capacit./Mov. Otros/Otros) |
| Dev/Reint | Si rendido &lt; anticipo → **Dev**; si rendido &gt; anticipo → **Reint** (`calcDevolucionReintegro`) |
| Rendición | Suma de `rendicion_viaticos` + gastos rendidos. Ojo 👁 muestra los mismos conceptos en modo rendición (apilado naranja/verde/diff si ambos ojos activos) |
| Tipo | select persistido (`seguimiento_tipo`) |
| Color | select persistido (`seguimiento_color`); pinta la fila |

## Base de datos

Migración `20260831201720_giras_viaticos_detalle_seguimiento.sql`:

- `seguimiento_tipo text` nullable, check `viatico|reintegro`
- `seguimiento_color text` nullable, check `amarillo|verde|celeste|rojo`

## Archivos

| Área | Archivo |
|------|---------|
| Servicio | `src/services/viaticosSeguimientoService.js` |
| Vista | `src/views/Management/ViaticosSeguimientoReport.jsx` |
| Shell Gestión | `src/views/Management/ManagementView.jsx`, `src/constants/managementPalette.js`, `src/App.jsx` |
| Migración | `supabase/migrations/20260831201720_giras_viaticos_detalle_seguimiento.sql` |

## Checklist

- [x] Migración aplicada en proyecto linked (Local = Remote)
- [x] Informe en menú Gestión + Ctrl+K
- [x] Carga consolidada por año
- [x] Patch de tipo/color
- [x] Export Excel
- [x] Spec
- [x] Columna `backup_viatico` asegurada en remoto (`20260831202349_…_ensure`)

## Fuera de alcance

- Editar montos desde Gestión.
- Sync con Google Sheets.
- Viáticos manuales / destaques.
