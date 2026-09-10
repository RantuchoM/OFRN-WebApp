# Spec: Fusionar personas y motivos de no-eliminación

## Objetivo

En **Personas**, poder unificar dos fichas duplicadas (toda la actividad y datos pasan a una sola) y, al intentar borrar, ver **por qué** no se puede (p. ej. convocatoria a una gira) en lugar de un fallo silencioso o un CASCADE que borre historial.

## Contexto

- IDs de integrantes son numéricos (`bigint`). No usar UUID.
- `DELETE` directo sobre `integrantes` era peligroso: varias FKs son `ON DELETE CASCADE` (`giras_integrantes`, horas, ensambles, etc.), así que un duplicado “borrable” podía **llevarse la convocatoria y el historial**. Otras FKs `NO ACTION` fallaban sin mensaje útil en la UI.
- Patrón de referencia: RPC atómico `merge_locaciones` (`docs/specs/hoteles-locaciones-mirror.md`).

## Fusionar (source → target)

1. Modal tipo compositores/locaciones: **duplicado (se borra)** → **destino (se conserva)**.
2. Atómico: `public.merge_integrantes(p_source_id, p_target_id)` (una transacción). Un fallo hace rollback.
3. **Datos de ficha**: el destino conserva sus valores no vacíos; los huecos se rellenan desde el duplicado. `rol_sistema` = unión. `fecha_alta` = la más temprana. `fecha_baja` = NULL si alguna de las dos sigue activa.
4. **Actividad**: se remapean FKs y arrays (`id_integrantes_asignados`, `id_musicos_asignados`, `target_ids` de logística, `asignaciones_config` de habitaciones). Si hay UNIQUE (`id_gira` + persona, etc.), se conserva la fila del destino y se descarta la del duplicado.
5. **Acceso**: si solo el duplicado tiene `perfiles.id_integrante`, pasa al destino. Si ambos tienen perfil, el del destino se queda; el del duplicado se desvincula (`id_integrante` NULL).
6. **Cuentas protegidas** (`integrantes_is_protected_email`): no pueden ser el duplicado a borrar.
7. Tras fusionar, se elimina el registro source.

## Eliminar

1. Antes de borrar: `public.get_integrante_delete_blockers(p_id)`.
2. Si hay actividad relevante, **no se borra**. El modal lista motivos con nombres (giras, ensambles, horas, logística personal, habitaciones, seating, viáticos, obras, perfil de acceso, cuenta protegida, …).
3. Atajos de sesión (`web_push_subscriptions`, `user_ui_settings`, lecturas de novedades, recordatorios de check-in) **no bloquean**.
4. Si no hay bloqueos: confirmación y `public.delete_integrante(p_id)` (vuelve a chequear y borra).
5. Desde el aviso de bloqueo se puede abrir **Fusionar** con el duplicado preseleccionado.

## UI (Personas)

- Botón **Fusionar** en la barra de acciones.
- Con exactamente 2 filas seleccionadas, el mismo botón en la barra de lote precarga ambos IDs.
- El tacho de cada fila (desktop) y de la tarjeta móvil consulta blockers.

## Estado

- [x] Spec
- [x] RPC `get_integrante_delete_blockers` / `merge_integrantes` / `delete_integrante` (fix UNION uuid/bigint: `20260910144325`; `target_ids` text[] admisión/rutas: `20260910145259`)
- [x] Cliente `src/services/mergeIntegrantes.js`
- [x] Modal + Personas (`MusiciansView`)
