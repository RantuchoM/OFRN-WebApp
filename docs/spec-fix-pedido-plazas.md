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

### Prioridad de fechas check-in/out (completado)

- [x] Bug: con tramos o habitación asignada, `getStayDatesForTramo` usaba **booking → tramo** y **nunca** la logística personal (el fallback a logística solo corría sin `fecha_desde`/`fecha_hasta` de segmento). Resultado: varias personas con CI/CO distintos quedaban con el bloque del hotel/tramo.
- [x] Prioridad alineada con `RoomingReport`: por lado (in y out) **logística personal → booking → tramo (+ cortes)**.
- [x] `getLogisticsDates` ignora `{}` vacío de `useLogistics`, normaliza `fecha` a `YYYY-MM-DD` y valida `Date` (string legacy, evento enriquecido o campos `date`/`time`).
- [x] Helper de parseo en `RoomingReport.jsx` actualizado con el mismo criterio para coherencia.

### Check-in temprano vs. inicio de tramo (completado)

- [x] Si el integrante hace check-in **antes** de la primera noche contada en el tramo (p. ej. Producción 04/08 16:00 con tramo oficial desde 05/08), el rango del pedido conserva la **fecha y hora reales** de logística, no medianoche del primer día del tramo.
- [x] Fix en `buildClippedRange` (`roomingInitialOrder.js`): ya no usa `startOfDay` ciego al recortar; compara `dIn` con el inicio de la primera noche elegible.
- [x] La **noche del día de check-in** se incluye en el conteo del tramo correspondiente aunque el tramo oficial empiece después (`isEarlyCheckInNight` + `collectEligibleNights`). Cada tramo calcula sus noches de forma independiente.

### Check-out posterior al fin de gira/tramo (completado)

- [x] Caso gira 10 (`Paisajes de España`): `fecha_hasta` 22/08; habitación Plus matrimonial (IDs `48028286` + acompañante) con regla de logística → evento check-out **24/08 08:00**. El pedido de texto mostraba check-out **domingo 23** porque `collectEligibleNights` descartaba la noche del 23 (posterior al fin oficial) y `buildClippedRange` inventaba salida el 23.
- [x] `isLateCheckOutNight`: en el **último** tramo, incluye noches entre el fin oficial y la mañana de check-out personal (simétrico a llegada anticipada).
- [x] Con eso, el rango del pedido conserva el check-out real (p. ej. lunes 24) y cuenta la noche del domingo.

### Títulos de tramo en pedido (completado)

- [x] Pedido tabular y exportación texto: solo `Tramo 1`, `Tramo 2`, … (sin fechas).
- [x] Modal de ajuste previo: `Tramo N · Localidad1, Localidad2` (localías visibles, sin fechas en el título).
- [x] `resolveTramoLocalidadLabels`: resuelve nombres desde `giras_tramo_localidades` (join `localidades`), catálogo o `giras_localidades` legacy.

### Exportación a texto (completado)

- [x] Botón **Texto pedido** en `RoomingInitialOrderReport.jsx` (mismo patrón que `MealsReport.jsx`).
- [x] Helper `buildInitialOrderTextSummary` en `roomingInitialOrder.js`: genera líneas por rango de fechas y categoría.
- [x] Formato estándar: `{n} pasajeros. Check-in: jueves, 18/6 - check-out: sábado, 20/6`.
- [x] Formato superior (Plus): `{n} pasajeros habitación superior (single). Check-in: …` para Plus **no** matrimoniales; `{n} pasajeros habitación superior (matrimonial). Check-in: …` cuando la habitación asignada tiene `es_matrimonial`. Los ajustes manuales Plus (sin flag) van como single.
- [x] Bloque **Resumen** al final (y por tramo si hay varios): total pax, desglose estándar/superior, noches básicas/superiores, camas noche y habitaciones sugeridas.
- [x] La vista tabular / impresión existente se mantiene sin cambios; el texto es opcional vía modal con copiar al portapapeles.

