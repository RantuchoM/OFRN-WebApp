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

- **Reglas**: solo columnas **Check-In** y **Check-Out** (sin columnas extra). Al lado de cada control hay una **tilde** visible (`IconCheck`): Early en check-in, Late en check-out. Crear/vincular sigue en `EventCellEditor` (portal `z-[100]`).
- **Tilde on** → el mismo evento pasa a tipo 40/41, queda en la FK extra (`id_evento_checkin_early` / `id_evento_checkout_late`) **y** en la FK habitual (noches de calendario + 0,5). **Off** → tipo 22/23 y se limpia la FK extra.
- **EventForm**: hora canónica si el tipo es 40/41 y la hora está vacía (o placeholder 12:00 / mapeo invertido).
- **Prompt al guardar** (Check-in 22 con hora **&lt; 14:00** → «¿Es early check-in?»; Check-Out 23 con hora **&gt; 10:00** → «¿Es late check-out?»). Sí = tipo 40/41 (y en reglas, tilda + vincula extra). No = deja 22/23. `ConfirmModal` portal `document.body`, `z-[10050]` (por encima del form de agenda `z-[100]` y del creator de reglas `z-[200]`).
- **Validación de regla** (no persiste): check-in / early posterior a check-out / late; comida inicial posterior a la final. Error visible en la fila.

## Reportes hotel

Noches calendario = check-out − check-in. **+0,5** si hay early; **+0,5** si hay late (se acumulan). Cunas no facturan. Columna o nota explícita (`ofrnRoomingExport.js`, `RoomingReport.jsx`, pedido inicial).

Util: `src/utils/hotelStayEvents.js`.

## Checklist

- [x] Tipos 40/41 + FKs en reglas; migración linked
- [x] UnifiedAgenda / EventForm / reglas / rooming
- [x] Reglas: tilde al lado de Check-In / Check-Out (sin columnas Early/Late)
- [x] +0,5 noche en PDF/Excel/pedido inicial
- [x] Horas 14:00 / 10:00 al generar
- [x] Prompt ¿early? / ¿late? al editar hora
- [x] Validación CI&gt;CO y comida inicial&gt;final
