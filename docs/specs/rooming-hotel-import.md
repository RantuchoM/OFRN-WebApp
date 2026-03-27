# Spec: Importación de Estructura y Asignaciones de Hotelería

## Contexto

Permitir la clonación de un hotel completo, incluyendo la distribución de músicos en habitaciones, desde un programa origen al actual.

## Objetivos

1. **Importación íntegra:** Copiar `programas_hospedajes` y `hospedaje_habitaciones` incluyendo `id_integrantes_asignados`, `asignaciones_config`, `tipo`, `es_matrimonial`, `con_cuna`, `notas_internas`, `orden` y `configuracion`.
2. **Validación automática:** El `fetchInitialData` de `RoomingManager` solo muestra ocupantes confirmados en el roster resuelto; los IDs importados que no correspondan quedan almacenados pero no visibles como personas en la habitación (huecos hasta reasignar).

## Reglas de negocio

- Un **bulk insert** de habitaciones minimiza round-trips a Supabase.
- No se permite importar si el mismo `id_hotel` ya está cargado en el programa actual (evita duplicar la reserva).
- La tabla `giras_hospedajes_excluidos` documenta a quienes no se les gestiona hotel; la importación no la modifica.

## Realtime / suscripciones

En la revisión del código (`RoomingManager`, `useLogistics`, `useGiraRoster`) **no** hay `subscribe()` a canales Realtime; la carga es por queries y efectos. No se requirió cleanup adicional.

## Estado de implementación

**Completado:** modal de importación (`ImportHotelModal.jsx`), `handleImportHotel` con inserción de reserva + habitaciones en bloque, preview por programa/hotel, filtro por defecto `tipo === 'Sinfónico'`, layout de columnas `h-[calc(100vh-200px)]` en desktop.

Los iconos de la UI siguen el set existente del proyecto (`Icons.jsx`), alineado con el resto de la app.
