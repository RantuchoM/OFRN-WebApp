# Spec: Gestión → Servicios (cantidad de servicios)

## Objetivo

Informe en **Gestión → Servicios** con cantidad de servicios por integrante, con filtros alineados a **Gestión → Convocatorias** (árbol de ensambles / cameratas / regiones, tipos de programa, toggle “Año actual”, agrupar por ensamble).

## Valor de servicio por tipo de evento

| Origen | Condición | Valor |
|--------|-----------|--------|
| Ensayo de ensamble (`id_tipo_evento = 13`) | Convocatoria vigente (misma regla que check-in / resumen anual); no técnico | **1** |
| Concierto (`id_tipo_evento = 1`, `es_didactico = false`) | En roster del programa (X / R / L) | **1** |
| Concierto didáctico (`id_tipo_evento = 1`, `es_didactico = true`) | Idem roster | **½** |
| Ensayo de gira (`id_tipo_evento` ∈ {2 Ensayo, 3 Ensayo General}) | Duración ≥ **2 h** (120 min) | **1** |
| Ensayo de gira | Duración ≥ **1:15** (75 min) y &lt; 120 min | **½** |
| Ensayo de gira | Duración &lt; 75 min | **No cuenta** (marcadores / slots cortos) |

- Eventos `tecnica = true` o `is_deleted = true` no cuentan.
- Programas en estado **Borrador**: sus eventos de gira no cuentan.
- **Grupos de convocatoria:** si el evento tiene `eventos_grupos`, solo cuentan integrantes de al menos un grupo asignado (mismos criterios de visibilidad agenda para músicos).

## Columnas de la matriz

1. **Ensayos ensamble** — suma de servicios de type 13  
2. **Ens. gira ½** — valor acumulado de ensayos de gira de media carga  
3. **Ens. gira 1** — valor acumulado de ensayos de gira de carga completa  
4. **Conciertos** — conciertos no didácticos  
5. **Didácticos** — conciertos con `es_didactico`  
6. **Total** — suma de las anteriores  

## Licencias y reemplazos

- `giras_integrantes.estado = ausente` + `abona_reemplazo` o `abona_licencia` cuenta servicios de gira (ensayos + conciertos), igual que en Convocatorias.
- En celda se muestra desglose `N+R+L` cuando hay parte de reemplazo y/o licencia:
  - base en color normal
  - **+parte reemplazo** en celeste (`sky`, como badge R del roster)
  - **+parte licencia** en ámbar (`amber`, como badge L)
- Ensayos de ensamble no usan R/L de gira (convocatoria por ensamble / custom).

## Filtros (paridad Convocatorias)

- Toggle Ensambles / Cameratas / Regiones + árbol con selección por modo (mismas etiquetas cortas que Convocatorias; título completo debajo).
- Tipos de programa (`TIPOS_PROGRAMA_ASISTENCIA_MATRIZ`; **todos activos por defecto**).
- Toggle **“Año actual”** (`showPastInYear`, **activo por defecto**): incluye programas y eventos pasados del año calendario en curso además de los futuros.
- Agrupar filas por ensamble.

Los eventos de gira solo se consideran si su `id_gira` está en el conjunto de programas filtrados. Los ensayos de ensamble se filtran por **fecha del evento** con la misma regla de “hoy vs año actual”.

## Base de datos

- Columna `eventos.es_didactico boolean NOT NULL DEFAULT false` (migración `20260810120000_eventos_es_didactico.sql`).
- Checkbox en form de evento (tipo Concierto) para marcar didáctico; el área completa de didácticos puede ampliarse después.

## Archivos

| Pieza | Ruta |
|-------|------|
| UI | `src/views/Management/ServiciosCantidadReport.jsx` |
| Cálculo | `src/utils/serviciosCantidad.js` |
| Fetch | `src/services/serviciosCantidadService.js` |
| Menú Gestión | `ManagementView.jsx`, `App.jsx`, `managementPalette.js`, `documentTitle.js` |

## Estado de implementación

| Requisito | Estado |
|-----------|--------|
| Spec en `/docs/specs/gestion-servicios-cantidad.md` | Completado |
| Migración `es_didactico` + deploy linked | Completado |
| Checkbox didáctico en EventForm / persistencia agenda | Completado |
| Vista Gestión → Servicios + filtros tipo Convocatorias | Completado |
| Columnas valor + total y desglose R/L 3+1 | Completado |
| Export Excel | Completado |
