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
- [x] Fix en `buildClippedRange` (`roomingInitialOrder.js`): primera noche de la estadía personal (`firstIdx === 0`) conserva `dIn`; si el bloque elegible empieza a mitad de estadía, usa la fecha de esa primera noche con la hora de logística (no reutiliza el check-in original: eso duplicaba rangos).
- [x] **Todas** las noches entre check-in personal y el inicio oficial del tramo se imputan al **primer** tramo (`isEarlyCheckInNight` + `collectEligibleNights`), no solo la noche del día de llegada.
- [x] Bug gira 12 (pedido texto): tramo 16–20/9 + llegada 14/9 → solo se contaba la noche del 14; el 15 quedaba hueco y `groupConsecutiveNights` partía en dos líneas idénticas en pax (`14/9–15/9` fantasma + `14/9–21/9`). Con noches previas continua → una sola línea `14/9–21/9`.

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

### Desglose por sexo en texto de pedido (completado)

- [x] Contadores por género × categoría en grupos de fechas (aseStdM/F, asePlusSingleM/F, asePlusMatriM/F); los ajustes manuales std_m/f y plus_m/f se suman al desglose.
- [x] Texto hotelería: líneas separadas por sexo, p. ej. `{n} pasajeros hombres. Check-in: …` / `{n} pasajeros mujeres. Check-in: …` (también en superior single/matrimonial).
- [x] Bloque Resumen: línea `Sexo: X hombres · Y mujeres`.
- [x] Reporte de Rooming (RoomingReport.jsx): columna **Sexo** (genero) en la lista de pasajeros.

### Detalle de pasajeros en Pedido Inicial (completado)

- [x] Botón **Detalle** en RoomingInitialOrderReport.jsx (junto a Texto pedido / Imprimir).
- [x] Helper `buildInitialOrderPassengerDetailSections`: mismo universo que el pedido (tramos, exclusiones, locales, cunas); una fila por persona; orden por check-in (luego apellido/nombre).
- [x] Reporte imprimible estilo lista de pasajeros del Rooming, **sin** columnas de habitación: #, Apellido y Nombre, Sexo, DNI, F. Nac, Check In, Check Out.
- [x] Separador por día de ingreso en Detalle (fila `Ingreso DD/MM` con cantidad).

### Hub de Reportes (completado)

- [x] Un solo botón **Reportes** en Rooming (desktop y móvil) abre `RoomingReportsHubModal`.
- [x] Opciones: Pedido Inicial, Detalle de pasajeros, Texto pedido, Reporte de habitaciones.
- [x] Pedido / Detalle / Texto pasan por el ajuste previo; `initialView` abre Detalle o Texto al confirmar.
- [x] Reporte de habitaciones abre el modal de Rooming existente.
