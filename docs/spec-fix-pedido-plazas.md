## Fix: Pedido Inicial de Alojamiento (Pedido de Plazas)

### Contexto

El reporte `Pedido Inicial de Alojamiento` (`RoomingInitialOrderReport.jsx`) había dejado de renderizar datos correctamente después de la migración al nuevo sistema de logística basado en eventos.  
La nueva lógica de `useLogistics` construye objetos de logística donde los hitos (`checkin`, `checkout`, etc.) pueden venir:

- Como **string plano** (fecha ISO) con horas en campos separados (`checkin_time`, `checkout_time`), o
- Como **objetos de evento enriquecidos**, con campos como `fecha`, `hora_inicio`, `date`, `time`, etc.

El reporte seguía asumiendo que `log.checkin` y `log.checkout` eran siempre strings.

### Cambios en `RoomingInitialOrderReport.jsx`

- Se introdujo un helper `getLogisticsDates(log)` que:
  - Acepta tanto `log.checkin`/`log.checkout` como string o como objeto.
  - Cuando es objeto, prioriza:
    - Fecha: `checkin.fecha` / `checkout.fecha` (fallback: `date`).
    - Hora: `checkin.hora_inicio` / `checkout.hora_inicio` (fallbacks: `hora`, `time`, `checkin_time` / `checkout_time`).
  - Construye `Date` seguros usando solo `HH:MM` y devuelve `{ dateIn, dateOut }`.
- En el loop sobre `roster`:
  - Se reemplazó la concatenación directa de strings:
    - Antes: ``${log.checkin}T${log.checkin_time || '14:00'}``
    - Ahora: se usa `getLogisticsDates(log)` y se aborta el cómputo si falta alguna de las dos fechas.
  - Se mantiene el cálculo de noches con `differenceInCalendarDays(dateOut, dateIn)` y la agrupación por rango `fecha/hora In - fecha/hora Out`.
- **Robustez**:
  - Si no hay fecha de check-in o check-out resoluble, el integrante se omite del conteo para evitar `NaN` y resultados inconsistentes.

### Confirmación de `logisticsMap` en `RoomingManager.jsx`

- `RoomingManager` usa `useLogistics(supabase, program)` y, dentro de `fetchInitialData`, construye:
  - `logisticsMap[person.id] = person.logistics;`
- El hook `useLogistics`:
  - Calcula `log` con la nueva lógica de reglas/eventos en `calculateLogisticsSummary`.
  - Expone ese mismo objeto como `logistics` en cada persona (`return { ...person, habitacion, ...log, logistics: log }`).
- Resultado:
  - `logisticsMap` inyectado en ambos reportes (`RoomingReportModal` y `InitialOrderReportModal`) es consistente con el nuevo esquema de objetos de evento.
  - El `RoomingReportModal` ya tenía un helper robusto (`getLogisticsDates`) para leer estos objetos; `InitialOrderReportModal` ahora replica esa estrategia.

### Efecto funcional

- El reporte **Pedido Inicial de Alojamiento** vuelve a mostrar:
  - Totales de Pax únicos.
  - Noches Std / Plus y total general.
  - Desglose por rangos de fechas y categorías.
- La lógica es compatible tanto con datos antiguos (strings manuales) como con el nuevo modelo basado en eventos, evitando errores de fechas inválidas o `NaN` en los totales.

### Títulos de tramo en pedido (completado)

- [x] Pedido tabular y exportación texto: solo `Tramo 1`, `Tramo 2`, … (sin fechas).
- [x] Modal de ajuste previo: `Tramo N · Localidad1, Localidad2` (localías visibles, sin fechas en el título).
- [x] `resolveTramoLocalidadLabels`: resuelve nombres desde `giras_tramo_localidades` (join `localidades`), catálogo o `giras_localidades` legacy.

### Exportación a texto (completado)

- [x] Botón **Texto pedido** en `RoomingInitialOrderReport.jsx` (mismo patrón que `MealsReport.jsx`).
- [x] Helper `buildInitialOrderTextSummary` en `roomingInitialOrder.js`: genera líneas por rango de fechas y categoría.
- [x] Formato estándar: `{n} pasajeros. Check-in: jueves, 18/6 - check-out: sábado, 20/6`.
- [x] Formato superior (Plus): `{n} pasajeros habitación superior (single). Check-in: …`.
- [x] Bloque **Resumen** al final (y por tramo si hay varios): total pax, desglose estándar/superior, noches básicas/superiores, camas noche y habitaciones sugeridas.
- [x] La vista tabular / impresión existente se mantiene sin cambios; el texto es opcional vía modal con copiar al portapapeles.

