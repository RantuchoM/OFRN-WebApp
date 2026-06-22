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

- Las vacantes son filas en `integrantes` con `es_simulacion = true`, vinculadas a la gira vía `giras_integrantes`.
- **Crear**: modal "Nueva vacante" en el roster (`AddVacancyModal`).
- **Asignar titular**: modal "Asignar titular" (`SwapVacancyModal`) → RPC `materializar_reemplazo` (transfiere logística al músico real).
- **Eliminar sin asignar**: botón papelera en la fila del roster o "Eliminar vacante" en el modal de asignación → `deleteVacancyFromGira` en `giraService.js` (limpia rooming, transporte, viáticos y borra el integrante simulado).

## 5. Consumo en Servicios
- La función `resolveGiraRosterIds` en `giraService.js` es la implementación de referencia para esta lógica.