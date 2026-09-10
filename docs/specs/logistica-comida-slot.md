# Spec: Ventana de comidas por slot (día + tipo)

## Objetivo
La cobertura de comidas de una regla logística (`comida_inicio` / `comida_fin`) identifica un **slot** — tipo base + día — no un `eventos.id`. Varios almuerzos el mismo día (convocatorias distintas) son instancias del mismo slot. Borrar o fusionar un evento no desasocia la regla.

Check-in y check-out siguen vinculados a un evento concreto.

## Modelo

`giras_logistica_reglas`:

| Columna | Rol |
| --- | --- |
| `comida_inicio_fecha` | Día del slot de inicio |
| `comida_inicio_servicio` | Tipo base: `Desayuno` / `Almuerzo` / `Merienda` / `Cena` |
| `comida_fin_fecha` / `comida_fin_servicio` | Idem fin |

Se **eliminan** `id_evento_comida_inicio` e `id_evento_comida_fin`.

La elegibilidad (`isPersonEligibleForMealSlot` / `mealSlotKey`) no cambia: sigue comparando fecha+servicio. Catering sigue por día calendario dentro de inicio..fin.

## UI (Logística)

Picker de slot: chips D/A/M/C + calendario **sin tope de mes** (producción a veces viaja antes/después). Los días de `fecha_desde`…`fecha_hasta` se destacan; el resto es seleccionable. Abre en el mes del slot o del inicio de gira.

Tarjetas de celda (Inicio/Fin y Check-in/Check-out): fondo blanco, borde 2px del color del tipo, chip centrado + fecha/hora en negro (`text-slate-900`), `min-h-[56px]`, acciones al hover. Comidas: `getMealServiceStyle`. Check-in/out: `tipos_evento.color` (ids 22/23) y hora en la línea de fecha.

## Migración de giras existentes

Backfill desde el evento ancla (incluye `is_deleted`): fecha del evento; servicio = base ya guardada en la regla si es D/A/M/C/Catering, si no primera palabra del tipo (`Cena Técnica` → `Cena`) o ids 7–10. Luego se dropean las FKs. Eventos hard-deleted (FK ya null) no son recuperables.

## Traslado / duplicación

Al mover o duplicar, `comida_*_fecha` se desplaza el mismo delta que el resto de la gira. No se copian FKs de comida.

## Checklist

- [x] Columnas fecha restauradas + backfill + drop FKs de comida
- [x] Motor de cobertura/asistencia lee solo slot
- [x] Picker tipo + día (meses libres; días de gira destacados)
- [x] `manage-gira` move/duplicate desplaza fechas de slot
- [x] Matriz Comidas usa fechas de regla para el rango
- [x] Migración aplicada en remoto (`20260910134517`) + `manage-gira` deploy
