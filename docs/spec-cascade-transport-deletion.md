# Spec: Eliminación en cascada de transportes y eventos

## Objetivo

Garantizar la integridad referencial al quitar un vehículo de la planificación de una gira: deben eliminarse o desvincularse los eventos de traslado y el resto de registros logísticos que apuntan a ese `giras_transportes`, de modo que la agenda global no deje paradas huérfanas ni filas inconsistentes.

## Modelo real en este repositorio

En el esquema actual **no** existe la tabla `giras_eventos`. Los traslados y paradas ligados al vehículo de la gira viven en:

| Tabla / columna | Rol |
|-----------------|-----|
| `eventos.id_gira_transporte` | FK a `giras_transportes(id)` — eventos de agenda de ese vehículo |
| `giras_logistica_rutas.id_transporte_fisico` | Reglas de subida/bajada por transporte físico de la gira |
| `giras_logistica_reglas_transportes.id_gira_transporte` | Reglas adicionales por transporte |
| `giras_logistica_admision.id_transporte_fisico` | Admisión al transporte |

Los pasajeros asignados al vehículo en esta app se modelan en columnas de `giras_transportes` (p. ej. `pasajeros_ids`), no en una tabla `giras_transporte_pasajeros`; al borrar la fila de `giras_transportes` esa asignación desaparece con el registro.

## Implementación (aplicación)

1. **Conteo previo** (`countEventosByGiraTransporte` en `src/services/giraService.js`): cuenta filas en `eventos` con el mismo `id_gira_transporte`, filtrando `is_deleted = false`, para el texto de confirmación.
2. **Eliminación ordenada** (`deleteGiraTransporteCascade` en el mismo servicio):
   - Obtiene todos los `eventos.id` con ese `id_gira_transporte` (incluye borrados lógicos si los hubiera, para no dejar FKs colgando).
   - Elimina `giras_logistica_reglas_transportes` donde `id_gira_transporte` coincide.
   - Pone en `null` referencias a esos eventos en `giras_logistica_rutas` y `giras_logistica_reglas` (misma idea que al borrar una parada suelta).
   - Elimina los `eventos` vinculados al transporte.
   - Elimina `giras_logistica_rutas` y `giras_logistica_admision` con `id_transporte_fisico` igual al transporte.
   - Elimina la fila en `giras_transportes`.

3. **UI** (`src/views/Giras/GirasTransportesManager.jsx`): antes de borrar se abre `ConfirmModal` con el mensaje: *«¿Estás seguro? Se eliminarán también X evento(s) de traslado asociado(s) a este vehículo.»* Tras un borrado correcto se usa `toast.success`; ante error, `toast.error`.

Con esto, **la integridad referencial queda garantizada en la práctica** para este flujo, sin depender de que Postgres elimine en cascada por FK.

## Criterios de aceptación

- [x] Al eliminar un transporte, el modal indica cuántos eventos de traslado se eliminarán junto con el vehículo.
- [x] Tras confirmar, la agenda de la gira no debe mostrar paradas que seguían atadas a ese `giras_transportes` (se refresca estado vía `fetchData` + `refresh`).

## SQL opcional (Supabase / Postgres)

El proyecto **no** requiere este cambio si se usa la eliminación en aplicación descrita arriba.

Si en el futuro se quisiera que el motor borre solo los `eventos` al borrar un `giras_transportes`, habría que ajustar la FK de `eventos` hacia `giras_transportes` con `ON DELETE CASCADE`. Eso **solo es seguro** si todas las tablas que referencian `eventos` también propagan borrado o no impiden el delete; hoy muchas FKs apuntan a `eventos` sin cascada explícita en el esquema exportado.

```sql
-- OPCIONAL y solo tras validar dependencias de eventos (asistencia, logs, etc.)
ALTER TABLE public.eventos
  DROP CONSTRAINT IF EXISTS eventos_id_gira_transporte_fkey,
  ADD CONSTRAINT eventos_id_gira_transporte_fkey
    FOREIGN KEY (id_gira_transporte)
    REFERENCES public.giras_transportes(id)
    ON DELETE CASCADE;
```

**Nota:** El SQL que mencionaba `giras_eventos` e `id_transporte` → `transportes(id)` no aplica a este esquema; el vínculo correcto es `eventos.id_gira_transporte` → `giras_transportes(id)`.

## Estado

**Implementado:** eliminación en cascada coordinada en `giraService.js` + confirmación con conteo en `GirasTransportesManager.jsx`. La integridad referencial para este caso está cubierta a nivel de aplicación.
