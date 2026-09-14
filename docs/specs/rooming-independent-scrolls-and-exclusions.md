# Spec: Scrolls Independientes y Exclusiones de Alojamiento

## Contexto

Mejorar la experiencia de usuario en `RoomingManager.jsx` permitiendo una navegación fluida en listas largas y gestionar músicos que no requieren hotel mediante una tabla de exclusión.

## Objetivos

1. **Scrolls Independientes:** Las columnas de músicos y la zona de hoteles deben tener scroll propio.
2. **Auto-scroll:** El contenedor de hoteles debe desplazarse automáticamente cuando un elemento arrastrado se acerca a los límites superior/inferior.
3. **Gestión de No Alojados:** Implementar una tabla de exclusión para músicos que no requieren hotel en una gira específica.

## Cambios en Base de Datos (SQL)

- Nueva tabla `giras_hospedajes_excluidos` con `id_programa` e `id_integrante`.
- FK con `ON DELETE CASCADE` para limpiar datos si se borra la gira o el integrante.

## Reglas de Negocio

- Un integrante en esta tabla **no** aparece en las columnas laterales de "Mujeres/Hombres" del Rooming.
- Se habilita una zona de descarte (icono de casa) donde al soltar un músico se inserta en esta tabla.
- Los excluidos se visualizan de forma compacta ("No alojados (N)"); al hacer clic se despliega la lista para revertir la exclusión.

## Vista músico: Mi Alojamiento

El modal **Mi Alojamiento** (`GiraCard` + `getMyRoomingStatus`) es self-service del integrante: hotel, tramo (si hay varios) y check-in/out. **No** muestra nombres de compañeros de habitación. El rooming interno (`RoomingManager`, reportes, Excel/PDF de staff) sigue listando ocupantes.

- [x] Ocultar compañeros en Mi Alojamiento (vista músico)
- [x] Check-in/out: **una sola regla ganadora** (`pickWinningLogisticsRule`: fuerza 5 ID personal > 4 categoría/rol > 3–1 territorio/general si `condicion === 'estable'`). No se unen fechas de reglas más débiles. Eventos vía `id, fecha, hora_inicio` (la columna `hora` no existe en `eventos`; pedirla vaciaba la logística y caía al tramo). Luego `getOccupancyStayDates` (booking explícito + noches de tramo, conservando llegada anticipada). `ausente` / exclusión hotelera → sin cama. Payload sin compañeros. Modal `z-[100]`.
- [x] Caso gira 12 Gabriela Iglesias (`3305423`): regla región 212 = 16/09 14:00–19/09 23:45; regla personal 214 = **14/09 16:00–19/09 23:45** (Hotel Internacional). Mi Alojamiento debe mostrar el personal.

## Por qué esta solución

- **Independencia:** No se modifica `giras_integrantes`; el roster principal de la gira permanece inalterado.
- **Limpieza:** `ON DELETE CASCADE` evita registros huérfanos.
- **UX:** Scrolls independientes y estación de trabajo con muchos músicos.
