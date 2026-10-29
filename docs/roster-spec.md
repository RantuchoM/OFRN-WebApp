# Especificación Técnica: Gestión de Roster y Convocados

## 1. Propósito
Definir las reglas para determinar qué integrantes participan efectivamente en una gira y cómo se calculan sus estados.

## 2. Fuentes de Convocatoria (Tablas)
- **giras_fuentes**: Define quiénes "deberían" ir por defecto (ej: 'Todos los Violines' o 'Ensamble de Vientos').
- **giras_integrantes**: Es la tabla de verdad final. Contiene excepciones y staff.
    - Si un integrante tiene `estado: 'ausente'`, NUNCA debe figurar en listas de logística ni estadísticas.
    - Si un integrante está aquí con `estado: 'confirmado'`, debe incluirse siempre (aunque no pertenezca a la fuente original).

## 3. Resolución de Roster (Lógica de Negocio)
Para obtener la lista de personas que viajan:
1. Identificar integrantes por `ENSAMBLE` o `FAMILIA` desde `giras_fuentes`.
   - **Ensamble:** el tramo en `integrantes_ensambles` debe cubrir `programas.fecha_desde` (`fecha_desde` / `fecha_hasta` del vínculo).
   - **Orquesta:** el integrante debe estar activo en el rango del programa (`fecha_alta` ≤ fin del programa y sin `fecha_baja` o `fecha_baja` ≥ inicio). Si el programa no tiene `fecha_hasta`, el fin es `fecha_desde` (programa de un día).
2. Añadir registros manuales de `giras_integrantes` (sin aplicar vigencias de orquesta/ensamble).
3. **FILTRO CRÍTICO**: Eliminar a cualquier integrante que tenga un registro en `giras_integrantes` con `estado = 'ausente'` y sin `abona_reemplazo` / `abona_licencia`.
4. **Exclusión de ensamble:** miembros que entran solo por `ENSAMBLE` o `FAMILIA` y pertenecen a un `EXCL_ENSAMBLE` activo en la fecha del programa se eliminan. Una fila personal **presente** (`giras_integrantes.estado` distinto de `ausente`) **no** se elimina y **cuenta** en Gestión → Convocatorias y Gestión → Servicios, aunque el ensamble esté excluido y aunque `fecha_alta` / `fecha_baja` no cubran el programa.

### 3.1 Rol por defecto (`giras_integrantes.rol` / `rol_gira`)
Al agregar o convocar (auto-roster, alta individual, ficha nueva en gira): `inferDefaultTourRole` en `giraUtils.js`.

- Si el integrante está en **Prod.** (ensamble `Prod.` / Producción) **y** en un ensamble músico (p. ej. VS), el default es **`mus_prod`**, no `musico`. Prod. gana sobre el ensamble músico y sobre `instrumentos.rol_gira_default`.
- Solo Prod. → `produccion` (o el default del instrumento, p. ej. chofer).
- Solo músico → `musico` / default de instrumento.
- `musico` persistido se interpreta como default automático (`resolveTourRoleOverride`); `solista` / `produccion` / etc. se respetan.

### 3.2 Función de convocatoria (`giras_integrantes.funcion`)

Aparte de `rol`. Valores: `reemplazo`, `refuerzo`, `pasante`, o null. Solo se puede elegir si la persona **no es Estable** y el rol efectivo es **`musico`**. Son excluyentes.

- **Reemplazo:** `id_cubre_a` obligatorio (integrante ausente de la misma gira). Fila celeste y tag «Reemplazo de {apellido}».
- **Refuerzo:** tag y fila violeta. No apunta a un ausente.
- **Pasante:** tag y fila verde. En logística no entra al cálculo automático de hotel ni de transporte (solo alcance Persona, asignación manual). En comidas solo matchea `GRP:TUTTI`.
- **Indiv:** no se persiste. Con rol `musico`, sin función y con fila en `giras_integrantes` (convocado de a uno, no solo por ensamble o familia), la nómina conserva el color de fila de hoy y muestra el tag Indiv. Quien entra solo por ensamble o familia no lleva esa tercera línea. Otros roles tampoco.
- El tag está en la tercera línea de la columna Rol / Instr. Tocarlo (o el nombre del rol, si no es músico) abre el modal de rol. Las opciones Indiv, Reemplazo, Refuerzo y Pasante usan el color de la función (gris, celeste, violeta, verde) en ese modal, en Convocar y al asignar titular de una vacante. Al salir de `musico` o si la persona es Estable, `funcion` e `id_cubre_a` quedan nulos.
- Convocar abre un modal: Individual (tildes, búsqueda por nombre o instrumento) y Grupal en cuatro listas: Ensambles, Cameratas (fila en `ensambles_cf` como `id_ensamble_cf`, o nombre con prefijo CF / Jazz Band), Familias y Excluir ensambles. Al abrir, lo tildado queda arriba. Camerata no es un tipo de fuente nuevo: sigue en `ENSAMBLE` / `EXCL_ENSAMBLE`.
- Actualizar propone el mail de baja (destildar ensamble o familia, o excluir) y el de alta (sumar ensamble, camerata o familia, o sacar una exclusión). El texto distingue ensamble y familia. Si se confirma notificar, los mails quedan en el panel inferior. Con esa cola abierta no se puede cambiar de pantalla ni cerrar la pestaña hasta Enviar o Cancelar.

## 4. Vacantes (integrantes simulados)

- Las vacantes son filas en `integrantes` con `es_simulacion = true` y `condicion = 'Refuerzo'`, vinculadas a la gira vía `giras_integrantes` (`rol = 'musico'`, `estado = 'confirmado'`). El ID lo asigna la BD (IDENTITY). El rótulo de plaza va en `integrantes.apellido`.
- **Apariencia seating / cuerdas:** el nombre sigue siendo el rótulo actual (`{apellido}, {nombre}` → p. ej. `{etiqueta}, Vacante`). En Seating (atriles de cuerdas, filas de vientos) y en Configuración/Disposición de Cuerdas (pool, celdas de atril, preview de reordenar) las plazas ocupadas por vacante llevan borde ámbar `border-amber-400` (mismo token que Nómina `border-l-amber-400` / badge VACANTE `border-amber-200`). Reemplazo, Refuerzo y Pasante se identifican junto al nombre (y en reportes PDF/Excel de seating). Indiv no se imprime ahí. No cambia RPCs ni asignación.
- **Crear** (`crear_vacante`, transaccional): modal "Nueva vacante" (`AddVacancyModal`) o "Vacantes auto" en Auditoría de instrumentación. Inserta integrante + `giras_integrantes` en una sola transacción. Auto: no duplica la misma etiqueta/instrumento ya presente; género NULL (no F fijo); salta Tim y **no inventa cuerdas** (01–04). Las vacantes de cuerda ya creadas sí se listan en la fila Vacantes (columna Str). Pueden entrar a un **grupo de la gira** (`giras_grupos_integrantes`) como cualquier convocado (reservan el slot).
- **Asignar titular** (`materializar_reemplazo`): modal "Asignar titular" (`SwapVacancyModal`). Transfiere en la misma transacción: nómina, reglas `target_ids`, transporte actual (`id_integrante` + `target_ids`), admisión/rutas, RSVP comidas legacy, viáticos, seating (`id_musicos_asignados` y `seating_contenedores_items`), check-in/asistencia, accesos, exclusiones hotel y **grupos**. Si el titular no es Estable, el modal permite Reemplazo (con ausente), Refuerzo o Pasante; después de la RPC se guarda `funcion` / `id_cubre_a` en la fila del titular.
  - Si el titular ya está en la gira como **ausente**: se **bloquea** (no se vuelca logística).
  - Si ya está confirmado: se borra la fila de la vacante en `giras_integrantes` y se transfiere la logística a la fila existente.
  - Si no está: se reemplaza `id_integrante` en la fila de la vacante y `estado = 'confirmado'`.
  - **Grupos (verdad de la plaza):** si la vacante está en uno o más `giras_grupos`, el titular queda **solo** en esos grupos de la gira (sin duplicar). Si estaba en otro grupo, sale de ese y entra al de la vacante. `giras_grupos_integrantes` no tiene columna de orden de membresía (el `orden` es del grupo). Si la vacante no está en ningún grupo, no se toca la membresía previa del titular. Se elimina el ID simulado del grupo.
  - **Hotelería (única excepción):** F vs M o `−` vs F/M → se saca de la habitación (`alerta_alojamiento`). Ambos NULL → hereda. Un NULL vs F/M/`−` → desaloja. Se actualizan `id_integrantes_asignados` y `asignaciones_config`. Si el titular ya estaba en otra habitación de la gira y hereda, se lo saca de la anterior (sin dos camas).
- **Eliminar** (`eliminar_vacante` vía `deleteVacancyFromGira`): en filas `es_simulacion` la papelera (`IconTrash`, `text-red-500`) va **a la izquierda de ASIGNAR** en una fila inferior, fuera del grid 2×2 de mail/teléfono/editar/link (ese cluster no cambia de tamaño ni posición). El modal «Asignar titular» reutiliza el mismo `handleDeleteVacancy`. Confirma en UI que se borra la **plaza vacante** (no un músico real) y limpia en una transacción habitaciones + `asignaciones_config`, seating, transporte/`target_ids`, admisión/rutas, viáticos, RSVP, accesos, exclusiones, **grupos**, check-in/asistencia, luego borra `giras_integrantes` y el integrante simulado. No toca `pasajeros_ids` (columna inexistente). No hay otra papelera en la fila vacante (Estado muestra «—»; el trash de adicionales es desconvocar, no aplica).
- **Logística territorial:** niveles 3–1 (localidad/región/general) solo si `condicion === 'estable'`. Las vacantes (Refuerzo) solo matchean ID personal o categoría/grupo.
- La RPC rota `liberar_plaza_generar_vacante` está **eliminada** (no hay control de UI; era SECURITY DEFINER y usaba columnas viejas).

## 5. Consumo en Servicios
- La función `resolveGiraRosterIds` en `giraService.js` es la implementación de referencia para esta lógica.

## 6. Alta, autor e historial

- Cada fila de `giras_integrantes` guarda `created_at` (alta de esa fila) y `creado_por` (integrante que la dio de alta). Ediciones de rol, instrumento o motivo no pisan esos campos.
- El historial de altas, bajas, ausencias y vueltas a presente de una persona está en el modal de motivo (stick-it ámbar de la fila), solo si está en `giras_integrantes`. No se muestra la fecha de alta bajo el nombre ni un botón de historial en el encabezado. Quien entra solo por ensamble o familia no tiene stick ni historial en la fila.
- `giras_integrantes_historial` registra `alta`, `baja`, `ausente` y `presente`, con actor y motivo. Las filas anteriores a este registro tienen alta con la fecha original y autor vacío.
- Las bajas del cliente pasan por `baja_giras_integrantes` (`p_actor`, motivo). Vacantes (`crear_vacante`, `materializar_reemplazo`, `eliminar_vacante`) reciben `p_actor`. Asignar titular sobre la fila de la vacante deja una baja de la plaza y un alta del titular, y `created_at` pasa a ser esa asignación.
- La app no usa `auth.uid()`. El actor es el integrante de la sesión (`creado_por` / `movido_por`, o `app.gira_actor_id` dentro de la RPC).

## 7. Embeds PostgREST (`giras_integrantes` ↔ `integrantes`)
- Hay **cuatro** FKs a `integrantes`: `id_integrante`, `creado_por`, `movido_por`, `id_cubre_a`. Un embed bare `integrantes(...)` dispara `PGRST201`.
- Para la persona de la fila: `integrantes!giras_integrantes_id_integrante_fkey(...)` (la clave JSON sigue siendo `integrantes`).
- Para el autor del alta: `creado_por_ref:integrantes!giras_integrantes_creado_por_fkey(...)`.
- Para a quién cubre un reemplazo: `cubre_a:integrantes!giras_integrantes_id_cubre_a_fkey(...)`.
- Deep-link / listado: `GIRAS_LIST_SELECT` en `useGirasList.js` (también `EnsembleCoordinatorView`, `GiraFormEditPortal`).
- `useGiraRosterQuery` usa `EMPTY_ROSTER` / `EMPTY_SOURCES` estables (no `?? []` inline) para no re-disparar efectos de sync/historial en cada render.
