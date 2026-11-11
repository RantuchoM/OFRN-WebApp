# Spec: Jefes de fila (contenedores de cuerdas)

## Objetivo
Habilitar un **jefe/a de fila** por contenedor de cuerdas, con permisos acotados para reordenar atriles de su contenedor y asignar particellas individuales (`M-`) a miembros de ese contenedor. Distintos bloques/configs pueden tener distintos jefes.

## Reglas
- **Derivado, sin columna**: jefe = ítem con `atril_num === 1` y `lado === 0` (`1a`).
- El jefe **no puede moverse a sí mismo** de `1a`.
- Solo reordenar dentro de su contenedor + overrides individuales. No toca asignación grupal `C-`, CRUD de contenedores ni otros contenedores.
- **Reorder en Seating**: el jefe no usa el panel Cuerdas; reordena con flechas ↑↓ a la derecha de cada nombre en la fila expandida del contenedor (el asiento `1a` no tiene flechas / no se mueve). El RPC exige el set completo de ítems del contenedor: si la grilla filtra por bloque/grupo, el payload une el swap visible con el resto sin tocar.
- Si un **editor** mueve a alguien que cambia el `1a`, debe confirmar con advertencia de cambio de jefe/permisos.
- **Notificación del jefe (sin ventana):** cualquier cambio de atril/silla o asignación de partes hecho por el jefe **siempre** ofrece el mail (no aplica el filtro de ~2 semanas / 18 días). El jefe puede omitir (Descartar / No enviar). Editores/producción siguen con la ventana tardía habitual.
- Si el cambio lo hace el jefe, el mail `SEATING_CAMBIO` aclara que lo efectuó el/la jefe de fila; Marko recibe un **único resumen por lote** (`SEATING_CAMBIO_JEFE_RESUMEN` → `marko.scrn@gmail.com`) con particellas y/o atril/silla; no un CC por músico.
- **Marko siempre al cerrar el lote:** si el jefe notifica a músicos *o* omite (Omitir mails / No notificar músicos / Descartar atril / salir sin avisar), Marko igual recibe el resumen. No se manda Marko por cada edit intermedio ni si se deshacen los cambios.
- **Cron de respaldo (~1h):** cada cambio del jefe hace upsert en `seating_jefe_marko_pendiente` (reinicia `last_change_at`). Si el lote queda abierto > ~60 min, `seating-jefe-marko-cron` (pg_cron `*/15`) reclama y envía `SEATING_CAMBIO_JEFE_RESUMEN`. Cualquier envío manual/omit limpia el pendiente (`clear_seating_jefe_marko_pendiente`).
- Cambio de atril/silla: plantilla `SEATING_ATRIL_CAMBIO`. Tras reordenar con flechas, banner “Notificar atriles” (bloque + contenedor + atril/silla). Al notificar atriles, Marko también recibe el resumen con esas ubicaciones.
- **Fechas en mails:** asuntos y cuerpos de plantillas de gira muestran con claridad el rango de fechas de la gira (bloque “Fechas de la gira” + `{fechas}` en asunto) para no confundir cuando se trabaja varias giras por anticipado.
- El modal “Músicos y cambios” permite **Deshacer** (uno o todos) con confirmación, restaurando la asignación al snapshot de apertura de Seating.
- **Asignación inicial lista (por bloque):** columna `programas_repertorios.seating_inicial_listo`. En Seating, junto a las pestañas de bloque, el editor/admin tilda «Asignación inicial lista» (persistente). Al activarla puede **marcar y anunciar** (`REPERTORIO_PARTES_LISTOS` a musico/mus_prod) o **solo marcar**. Los jefes de fila solo editan atriles/M- del bloque cuando está tildado. El botón «Anunciar partes listos» en Repertorio sigue disponible como atajo de mail (no escribe la marca del bloque).

## Seguridad
- RPCs `SECURITY DEFINER` con `p_actor_id`:
  - `reorder_contenedor_items_jefe`
  - `assign_particella_individual_jefe`
- UI de jefe solo escribe vía esos RPCs.

## Checklist
- [x] Spec viva
- [x] Helpers `seatingJefeDeFila.js`
- [x] Migración RPCs + plantilla mail (`20261111160000_jefes_de_fila_rpcs.sql`, applied linked)
- [x] UI jefe (reorder + M- en Seating / GlobalStringsManager modo jefe)
- [x] Warning editor al cambiar `1a`
- [x] `SEATING_CAMBIO` con actor jefe (+ plantilla `actor_nota` en Gestión)
- [x] Botón + envío `REPERTORIO_PARTES_LISTOS` (Repertorio → Anunciar partes listos)
- [x] Tilde persistente por bloque en Seating (`seating_inicial_listo`) + gate jefes
- [x] Modelos enviados a `ofrn.archivo@gmail.com` con gira 15 (Cantos del Presente / CF 01/26)
- [x] Resumen Marko incluye atril/silla (`SEATING_CAMBIO_JEFE_RESUMEN` + notificar atriles)
- [x] Jefe: mail siempre ofrecido (sin ventana 18 días); puede omitir
- [x] Plantillas: fechas de gira claras en asunto y cuerpo
- [x] Marko resumen al omitir/descartar/salir (no solo al notificar músicos)
- [x] Cron Marko ~1h (`seating_jefe_marko_pendiente` + `seating-jefe-marko-cron`)
