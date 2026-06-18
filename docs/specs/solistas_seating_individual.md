## Spec: Visualización Individual de Solistas en Seating

### Objetivo
Permitir que cualquier músico marcado con el rol de `solista` en la gira pueda tener asignaciones de particellas individuales por obra, apareciendo en la lista de **“Vientos, Percusión y Solistas”**, incluso si pertenece a la sección de cuerdas (`id_instr` de "01" a "04").

### Reglas de Implementación
1. **Filtro de Cuerdas**: La lógica actual excluye a IDs `"01"`, `"02"`, `"03"`, `"04"` de la lista inferior. Se debe añadir una excepción: músicos con `rol_gira === "solista"` siempre se consideran para la lista inferior, aunque su `id_instr` sea de cuerdas.
2. **Doble Presencia**: El músico seguirá apareciendo en su `Container` (atril) para referencia visual de ubicación, pero su asignación de particella se gestionará en la tabla inferior para permitir flexibilidad (por ejemplo, un violín solista que toca una parte distinta a la del resto de la fila).
3. **Persistencia**: Las asignaciones individuales ya utilizan el prefijo `M-{id_musico}-{obra_id}`, por lo que la base de datos ya soporta esta funcionalidad sin cambios en el esquema.
4. **Segunda parte individual**: En las celdas individuales de Seating (desktop y edición móvil) se puede asociar una segunda particella a la misma persona mediante un botón `+` junto al desplegable. Se persiste como una segunda fila de `seating_asignaciones` para el mismo `id_obra` y `id_musico`, sin cambiar el esquema.
5. **Edición móvil acotada por obra**: En vista móvil para editores, cada obra muestra un botón `Editar` junto al título. Al activarlo, solo esa columna muestra desplegables; el resto del Seating permanece en modo lectura para reducir ruido visual.
6. **Mis Partes**: Si una persona tiene doble asignación individual en una obra, ambas partes se muestran en `Mis Partes` y sus enlaces quedan disponibles para descarga.
7. **Menú móvil de Seating**: Los controles superiores de Seating en móvil se agrupan dentro de un desplegable `Menú Seating`; cada acción debe mostrar icono y texto.
8. **Numeración ZIP de Mis Partes**: La descarga masiva usa el orden real de concierto como prefijo (`01`, `02`, `04`, etc.). Si una obra tiene doble asignación descargable, sus archivos se nombran con sufijos `a`/`b` sobre el mismo número de obra (`04a`, `04b`).

### Criterios de Aceptación
- Un violín con `rol_gira === "solista"` aparece listado en la tabla inferior (“Vientos, Percusión y Solistas”).
- Se le puede asignar una particella específica mediante el dropdown `ParticellaSelect`.
- El cambio no afecta a los músicos de fila (tuttistas) que permanecen gestionados solo por contenedor.
- En Seating desktop y en edición móvil por obra, una persona puede tener parte principal y segunda parte.
- En `Mis Partes`, una doble asignación se ve como dos partes separadas para la misma obra.
- En móvil, los controles superiores de Seating están dentro del desplegable `Menú Seating` con texto visible para cada acción.
- En el ZIP de `Mis Partes`, la numeración salta obras no tocadas y las dobles asignaciones usan `a`/`b`.

