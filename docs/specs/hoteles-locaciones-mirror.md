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

## Estado

- [x] Migración `20260610140000_hoteles_locaciones_mirror.sql`
- [x] Columna `link_mapa` en `hoteles`
- [x] Triggers bidireccionales
- [x] Backfill de `id_localidad` y locaciones huérfanas
- [x] Campo Google Maps en `DataView` → Hoteles
