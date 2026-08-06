# Spec: Unicidad de alojamiento por hotel y tramo

## Contexto

En Rooming, una misma persona no debe figurar más de una vez en el mismo hotel del mismo tramo de una gira. En otro tramo de la misma gira sí puede volver a alojarse en ese hotel.

## Regla de negocio

Clave de unicidad: **`(programa / gira, tramo / segmento, hotel, integrante)`**.

- Mismo tramo + mismo hotel → cada `id_integrante` a lo sumo en una habitación.
- Mismo hotel en **otro** tramo de la misma gira → permitido (otro `programas_hospedajes` con distinto `id_segmento`).
- La UI de asignación del tramo activo sigue tratando el pool de “sin habitación” a nivel tramo (quien ya está en cualquier hotel del tramo no reaparece en Mujeres/Hombres), coherente con una sola estadía operativa por tramo.

## Implementación

- Utilidad: `src/utils/roomingUniqueness.js`
  - `normalizeIntegranteId` / `sameIntegranteId`
  - `enforceUniquePersonPerHotel` (dedupe entre habitaciones del mismo `id_hospedaje`)
  - `sanitizeImportedRoomAssignments` (importación sin repetir persona en el hotel)
  - `removePersonFromScopedRooms`
- `RoomingManager.jsx`:
  - Asignación (drag/drop, modal, nueva habitación): quita a la persona de **todas** las habitaciones del tramo visible antes de ubicarla; IDs normalizados.
  - `fetchInitialData`: hidrata con IDs numéricos; aplica `enforceUniquePersonPerHotel` y sincroniza a DB si hace falta.
  - Importación de hotel: sanitiza asignaciones antes del insert.
  - Traslado de habitación a otro hotel del tramo: limpia duplicados en el destino.
  - Fusión de hoteles: la recarga post-merge deduplica.

## Estado

- [x] Utilidad de unicidad por hotel
- [x] Enforcement en asignación / carga / import / traslado / fusión
- [x] Spec documentada
