# Spec: Early check-in y Late check-out

## Objetivo

Tratar **Early check-in** y **Late check-out** como tipos de evento de agenda de primera clase (no flags booleanos OFRN). Se generan desde reglas logísticas, se editan en EventForm, se ven en UnifiedAgenda, hotelería/rooming y suman **media noche** cada uno en reportes de hotel.

## Catálogo

| `tipos_evento.id` | Nombre | Categoría | Color | Hora al generar |
| --- | --- | --- | --- | --- |
| 22 | Check-in | Otros (5) | existente | 12:00 (logística) |
| 23 | Check-Out | Otros (5) | existente | 12:00 (logística) |
| 40 | Early check-in | Otros (5) | `#0284c7` | **14:00** |
| 41 | Late check-out | Otros (5) | `#ea580c` | **10:00** |

Otros (5) = visibles en el filtro de UnifiedAgenda (no Transporte; no Logística id 3, que arranca destildada para músicos). EventForm lista el catálogo completo.

## Modelo

`giras_logistica_reglas`:

| Columna | Rol |
| --- | --- |
| `id_evento_checkin` / `id_evento_checkout` | Estadía habitual |
| `id_evento_checkin_early` | Early check-in opcional (tipo 40) |
| `id_evento_checkout_late` | Late check-out opcional (tipo 41) |

Ausente = cero habitaciones (sin cambio). Vacantes: las noches siguen la logística del ocupante de la cama; no volcar a `ausente`.

## UI

- **Reglas**: solo columnas **Check-In** y **Check-Out** (sin columnas extra). Al lado de cada control hay una **tilde** visible (`IconCheck`): Early en check-in, Late en check-out. Crear/vincular sigue en `EventCellEditor` (portal `z-[100]`). En el creator («Crear nuevo») la misma tilde va al lado del botón.
- **Tilde on** → el mismo evento pasa a tipo 40/41, queda en la FK extra (`id_evento_checkin_early` / `id_evento_checkout_late`) **y** en la FK habitual (noches de calendario + 0,5). **Off** → tipo 22/23 y se limpia la FK extra.
- **EventForm**: tilde visible al lado de tipo + horas (no una columna oculta). Check-in (22) o Early (40) → **Early check-in**; Check-out (23) o Late (41) → **Late check-out**. Tildar cambia `id_tipo_evento` 22↔40 / 23↔41. Hora canónica si el tipo es 40/41 y la hora está vacía (o placeholder 12:00 / mapeo invertido), salvo que el usuario ya haya tocado la hora.
- **Prompt** (`ConfirmModal` portal `document.body`, `z-[11000]`, por encima del form de agenda `z-[100]`/`z-[10050]` y del creator de reglas `z-[200]`):
  - Al **guardar** o al **cambiar hora**, con tilde off: Check-in 22 y hora **&lt; 14:00** → «¿Es early check-in?»; Check-Out 23 y hora **&gt; 10:00** → «¿Es late check-out?».
  - Sí = tipo 40/41 (y en reglas, tilda + vincula extra). No = deja 22/23. Iconos de `Icons.jsx`.
- **Validación de regla** (no persiste): check-in / early posterior a check-out / late; comida inicial posterior a la final. Error visible en la fila.

## Reportes hotel

Un solo cálculo: `hotelNightsFromStay` / `stayExtraFlagsFromStay` en `src/utils/hotelStayEvents.js`.

Noches calendario = check-out − check-in (días civiles). **+0,5** early y **+0,5** late (se acumulan). Cunas no facturan. Ausente = 0 habitaciones. Vacantes: noches del ocupante de la cama.

**Cuándo hay extra** (cualquiera alcanza):

- Early: tipo 40, FK `id_evento_checkin_early` (tilde), o check-in **antes de las 14:00** (el **12:00** de logística no cuenta).
- Late: tipo 41, FK `id_evento_checkout_late` (tilde), o check-out **después de las 10:00** (el **12:00** de logística no cuenta). Un check-out **17:00** suma 0,5 aunque el evento siga siendo tipo 23.

La celda de noches muestra el total con medio (p. ej. **3,5**) y marca `Early +0,5` / `Late +0,5`. Superficies: pedido inicial (tabla, PDF, ajuste de plazas), rooming PDF/Excel (`ofrnRoomingExport.js`, `RoomingReport.jsx`), badges en rooming, **Mi Alojamiento**.

**Texto de pedido inicial** (`buildInitialOrderTextSummary` / `formatStayRangeText`): las primeras líneas llevan el número de noches (incl. medias) y las etiquetas **Early check-in** / **Late check-out** si aplica, **sin** paréntesis de extras (`(Early +0,5)`, `(Late +0,5)`, `(+0,5)`, `(3,5 noches)`). Ejemplo: `7 hombres, 1 mujer. Check-in: jueves, 18/6 - check-out: sábado, 20/6, 3,5 noches, Early check-in`. Las marcas `Early +0,5` / `Late +0,5` siguen en tabla/PDF/Excel del pedido y en el resto de reportes de hotel.

FIMBA sigue con sus flags booleanos propios; no comparte este helper OFRN.

## Checklist

- [x] Tipos 40/41 + FKs en reglas; migración linked
- [x] UnifiedAgenda / EventForm / reglas / rooming
- [x] EventForm: tilde visible al lado de tipo/horas (22/40 Early, 23/41 Late)
- [x] Prompt ¿early? / ¿late? al guardar y al cambiar hora (tilde off)
- [x] Reglas: tilde al lado de Check-In / Check-Out (sin columnas Early/Late)
- [x] Creator de reglas: misma tilde junto a «Crear nuevo»
- [x] +0,5 noche en PDF/Excel/pedido inicial/ajuste/detalle/Mi Alojamiento (celda 3,5 + marca Early/Late)
- [x] Texto pedido inicial: primeras líneas con noches + Early/Late, sin paréntesis `(+0,5)` / `(3,5 noches)`
- [x] Horas 14:00 / 10:00 al generar
- [x] Validación CI&gt;CO y comida inicial&gt;final
