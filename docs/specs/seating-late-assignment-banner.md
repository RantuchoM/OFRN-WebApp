# Spec: Banner de cambios de seating de último momento

## Objetivo
En **Seating**, cuando la gira está a **18 días o menos** de empezar (`programas.fecha_desde`), avisar si en **esta visita** a la pantalla se crean o modifican asignaciones de particella. El aviso sirve para notificar a los músicos (copiar mails / detalle / **enviar mail**).

## Qué cuenta como “cambio”
No es solo “se agregó una obra al programa”. El caso típico: la obra ya estaba y el músico **no sabía** que le asignaron o le cambiaron la parte.

- **Alta:** sin asignación → `Clarinete 2`
- **Modificación:** `Flauta 1` → `Flauta 2`
- **Otras diferencias** vs. el snapshot de apertura (agregar/quitar una segunda parte, desasignar)

Cuenta **cualquier** cambio del mapa efectivo que ve la tabla, no solo el select manual:
- `ParticellaSelect` / `MultiParticellaSelect`
- **IconBulb** de una celda (sugerencia aplicada)
- **Aceptar todas** de una fila (contenedor o músico)
- **Aceptar sugerencias / Aceptar todas las sugerencias** (bulk `applyBulkParticellaAssignments`)

No hace falta un segundo edit manual. El hook diffea `assignments` + `musicianAssignments` + ítems de contenedor (misma fuente que la grilla tras el apply).

Remociones de obra del programa no se listan por sí solas. Si al desasignar queda distinto al snapshot, sí aparece (`Clarinete 2` → `sin asignación`).

## Ventana
- Hoy (fecha local `yyyy-MM-dd`) ∈ [`fecha_desde` − 18 días, `fecha_desde`].
- Fuera de esa ventana el banner no se muestra aunque haya cambios de sesión.
- No se inventan columnas: se usa `fecha_desde` del programa.

## Ciclo de vida (solo esta visita)
- Snapshot in-memory al terminar la primera carga de Seating (asignaciones + ítems de contenedores de todas las configs).
- Se acumulan diferencias **mientras Seating está montado** (asignación individual, de contenedor de cuerdas, músico que entra a un atril que ya tiene parte, o apply de sugerencias IconBulb / bulk).
- El snapshot se toma una vez por visita cuando la primera carga terminó; no se rehace si `loading` parpadea. El diff usa firma estable del mapa (no identidad de objeto) para no perder applies de bombilla/bulk.
- Al **salir de Seating** el acumulador se limpia. No hay `localStorage` ni persistencia en DB.
- Volver a Seating más tarde es una visita nueva: solo aparecen cambios nuevos de esa visita.
- Enviar mails **no** persiste ni limpia el banner; el aviso sigue hasta salir de Seating.
- **No se puede salir de Seating sin decidir** si hay mails pendientes (lista no vacía en la ventana de 18 días, músicos con `mail` aún no enviados con éxito en esta visita). Incluye pestañas de gira (Agenda, Repertorio, Personal, etc.), cambio de tab de la app, sub-tabs internos de Repertorio (Repertorio / Mis Partes) y “Volver”. El diálogo (Portal `z-[100]`) ofrece **Enviar mails** / **No enviar** / Permanecer. Enviar usa el mismo pipeline; No enviar limpia la lista de sesión y deja salir. Si ya se notificó a todos los que tienen mail, no vuelve a pedir. Cerrar (X) o Permanecer = seguir en Seating. `BrowserRouter` no tiene `useBlocker`: se interceptan `AppNavLink`, `updateView` y `handleTabChange`. No se usa `beforeunload`. Atrás del navegador no está enganchado.

## Roster
- Músicos = integrantes numéricos del roster de seating (`useGiraRoster` + `isConfirmedConvocadoForSeatingReports`).
- Ausentes / no confirmados / roles de soporte excluidos **no** entran al aviso.
- Mails: campo `mail`; vacíos se omiten (toast si se intenta notificar sin destinatario).

## UI (copy exacta)
Texto del banner:

> Tené en cuenta que a estos músicos se les agregaron obras a menos de dos semanas de la gira. Para notificarlos puedes copiar los mails

Botones del **banner**:
1. **Ver músicos (n) y cambios** — modal Portal a `document.body`, `z-[100]`, lista apellido + cambios por obra.
2. **Copiar mails** — mails separados por coma; toast `sonner`.
3. **Notificar por mail** — confirma y envía un mail por músico (mismo flujo que el modal).

Dentro del **modal** (junto a la lista):
- **Enviar** por fila (músico con `mail`) y **Enviar a todos** en el footer.
- Confirmación (`useConfirmDialog` / Portal `z-[100]`) antes de disparar.
- **Copiar detalle** — texto:
  ```
  Apellido, Nombre
  - Obra 1: sin asignación → Clarinete 2
  - Obra 2: Flauta 1 → Flauta 2
  ```

Iconos solo de `src/components/ui/Icons.jsx`.

## Mail (pipeline de convocatoria)
No hay un stack de correo aparte. Se reutiliza `sendConvocatoriaNotificationTasks` → Edge Function `mails_produccion`, template `convocatoria_gira`.

- **Envío:** inmediato tras confirmar (igual que “Confirmar y notificar” de altas/bajas de roster). No pasa por `NotificationQueuePanel` (la cola se desmontaría al salir de Seating).
- **Una tarea por músico** (no BCC masivo): cada cuerpo lleva solo las novedades de esa persona.
- **Variante:** `SEATING_CAMBIO`.
- **Asunto:** `Novedades de seating | {nombre_gira}`.
- **Cuerpo (tuteo, tono de alta/baja):** saludo, gira + nomenclador, fechas/zona, lista `obra: desde → hasta`, enlace de repertorio si hay, cierre operativo.
- **From / reply:** `From` = `"Filarmónica SCRN" <${GMAIL_USER}>` (el de roster/convocatoria). **Reply-To** = `filarmonica.scrn@gmail.com` (ya aplicado a todo `mails_produccion`, incluida `SEATING_CAMBIO` / `convocatoria_gira`).
- Fallback: si la función aún no tiene la variante, `reason` lleva las mismas líneas (bloque “Motivo” del else genérico).

## Implementación
- `src/utils/seatingLateAssignmentChanges.js` — ventana, mapa efectivo M-/C-, diff, copy, builders de tarea de mail, pendientes vs enviados.
- `src/utils/seatingLateMailLeaveGuard.js` — registro + “¿el destino sale de Seating?”.
- `src/hooks/useSeatingLateAssignmentChanges.js` — estado de visita + `dismissSession`.
- `src/components/seating/SeatingLateAssignmentBanner.jsx` — banner + modal + envío + diálogo de salida.
- `src/utils/convocatoriaNotificationSend.js` — pasa `novedades` y nombre/apellido al detalle.
- `supabase/functions/mails_produccion/index.ts` — variante `SEATING_CAMBIO`.
- Integrado en `ProgramSeating.jsx` (Disposición y Escenario). Interceptores: `AppNavLink`, `GirasView.updateView`, `ProgramRepertoire.handleTabChange`, `App.updateView`, command palette.

## Estado
- [x] Detección sesión-local de altas/cambios de particella
- [x] Applies IconBulb / “Aceptar sugerencias” entran al listado (mismo mapa que la tabla)
- [x] Gate de 18 días vs `fecha_desde`
- [x] Banner (Ver músicos + Copiar mails) + modal con Copiar detalle
- [x] Limpieza al desmontar Seating
- [x] Mail enviable por músico (variante `SEATING_CAMBIO`, confirmación, skip sin mail)
- [x] Reply-To `filarmonica.scrn@gmail.com` (ya en `mails_produccion`; From sin cambio)
- [x] No salir de Seating sin Enviar / No enviar si hay pendientes de esta visita
