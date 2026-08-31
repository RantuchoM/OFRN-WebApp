# Spec: Espejo hoteles ↔ locaciones

## Contexto

Cada hotel maestro (`hoteles`) tiene una locación espejo (`locaciones`) vinculada por `hoteles.id_locacion`. Los datos compartidos deben mantenerse sincronizados para agenda, mapas y administración en **Datos**.

## Campos espejados

| Hotel (`hoteles`) | Locación (`locaciones`) |
|-------------------|-------------------------|
| `nombre` | `nombre` |
| `direccion` | `direccion` |
| `id_localidad` | `id_localidad` |
| `link_mapa` | `link_mapa` |
| `telefono` (text) | `telefono` (bigint) |
| `email` | `mail` |

## Reglas

1. **Alta de hotel**: si `id_locacion` es NULL, el trigger crea la locación y asigna el FK.
2. **Edición en Datos → Hoteles**: actualiza hotel y propaga a la locación vinculada.
3. **Edición en Datos → Locaciones** (vinculada a hotel): propaga a `hoteles`.
4. **Anti-recursión**: variable de sesión `app.hotel_loc_mirror`.
5. **Triggers AFTER** en ambas tablas (evita `ERROR 27000` de tuplas modificadas en la misma sentencia).
6. **Backfill** corre antes de crear los triggers.
5. **Backfill**: `id_localidad` del hotel es referencia en pares desincronizados.

## UI (Datos)

- Pestaña **Hoteles**: columnas incluyen **Google Maps** (`link_mapa`).
- Pestaña **Locaciones**: mantiene `link_mapa` para venues no hoteleros.
- **UniversalTable** (todas las pestañas Datos):
  - Columnas **redimensionables** (arrastre en el borde derecho del header; anchos persistidos en `localStorage` por tabla).
  - Al editar celdas de texto, el input se **expande** (posición fija) para ver el contenido completo.
- **Unificar locaciones** (botón arriba de la tabla en pestaña Locaciones):
  - Modal tipo fusión de compositores: elegir duplicado (se borra) y destino (se conserva).
  - Remapea FKs: `eventos.id_locacion`, `programas_agenda_comidas.id_locacion`, `plantillas_recorridos_tramos` (origen/destino), `integrantes.id_domicilio_laboral`, `hoteles.id_locacion`, `fimba_venue_info.id_locacion` (si hay choque UNIQUE por edición, se conserva la fila del destino).
  - Si **ambas** locaciones tienen hotel espejo, la fusión se bloquea (hay que resolver hoteles primero).
  - **Atómico**: RPC `public.merge_locaciones(p_source_id, p_target_id)` (migración `20260831130551_merge_locaciones_rpc`); un fallo hace rollback de todos los remaps. Cliente: `src/services/mergeLocaciones.js` → `supabase.rpc`.

## Estado

- [x] Migración `20260610140000_hoteles_locaciones_mirror.sql`
- [x] Columna `link_mapa` en `hoteles`
- [x] Triggers bidireccionales
- [x] Backfill de `id_localidad` y locaciones huérfanas
- [x] Campo Google Maps en `DataView` → Hoteles
- [x] Anchos de columna redimensionables + editor expandible en `UniversalTable`
- [x] Unificar locaciones (merge duplicados + remap FKs)
- [x] RPC atómico `merge_locaciones` (rollback si falla a mitad)
