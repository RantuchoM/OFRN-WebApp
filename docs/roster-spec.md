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
3. **FILTRO CRÍTICO**: Eliminar a cualquier integrante que tenga un registro en `giras_integrantes` con `estado = 'ausente'`.
4. **Exclusión de ensamble:** miembros de ensambles en `EXCL_ENSAMBLE` activos en la fecha del programa se eliminan siempre.

## 4. Vacantes (integrantes simulados)

- Las vacantes son filas en `integrantes` con `es_simulacion = true` y `condicion = 'Refuerzo'`, vinculadas a la gira vía `giras_integrantes` (`rol = 'musico'`, `estado = 'confirmado'`). El ID lo asigna la BD (IDENTITY). El rótulo de plaza va en `integrantes.apellido`.
- **Apariencia seating / cuerdas:** el nombre sigue siendo el rótulo actual (`{apellido}, {nombre}` → p. ej. `{etiqueta}, Vacante`). En Seating (atriles de cuerdas, filas de vientos) y en Configuración/Disposición de Cuerdas (pool, celdas de atril, preview de reordenar) las plazas ocupadas por vacante llevan borde ámbar `border-amber-400` (mismo token que Nómina `border-l-amber-400` / badge VACANTE `border-amber-200`). No cambia RPCs ni asignación.
- **Crear** (`crear_vacante`, transaccional): modal "Nueva vacante" (`AddVacancyModal`) o "Vacantes auto" en Auditoría de instrumentación. Inserta integrante + `giras_integrantes` en una sola transacción. Auto: no duplica la misma etiqueta/instrumento ya presente; género NULL (no F fijo); salta Tim y **no inventa cuerdas** (01–04). Las vacantes de cuerda ya creadas sí se listan en la fila Vacantes (columna Str). Pueden entrar a un **grupo de la gira** (`giras_grupos_integrantes`) como cualquier convocado (reservan el slot).
- **Asignar titular** (`materializar_reemplazo`): modal "Asignar titular" (`SwapVacancyModal`). Transfiere en la misma transacción: nómina, reglas `target_ids`, transporte actual (`id_integrante` + `target_ids`), admisión/rutas, RSVP comidas legacy, viáticos, seating (`id_musicos_asignados` y `seating_contenedores_items`), check-in/asistencia, accesos, exclusiones hotel y **grupos**.
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