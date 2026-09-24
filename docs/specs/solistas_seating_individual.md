## Spec: Visualización Individual de Solistas en Seating

### Objetivo
Permitir que cualquier músico marcado con el rol de `solista` en la gira pueda tener asignaciones de particellas individuales por obra, apareciendo en la lista de **“Vientos, Percusión y Solistas”**, incluso si pertenece a la sección de cuerdas (`id_instr` de "01" a "04").

### Reglas de Implementación
1. **Filtro de Cuerdas**: La lógica actual excluye a IDs `"01"`, `"02"`, `"03"`, `"04"` de la lista inferior. Se debe añadir una excepción: músicos con `rol_gira === "solista"` siempre se consideran para la lista inferior, aunque su `id_instr` sea de cuerdas.
2. **Doble Presencia**: El músico seguirá apareciendo en su `Container` (atril). En el detalle expandido del contenedor, el editor puede asignarle una particella distinta a la del grupo (mismo override `id_musicos_asignados` que vientos/solistas). La fila de **Vientos, Percusión y Solistas** sigue siendo el lugar para **varias partes** (`+` / slots).
3. **Persistencia**: Las asignaciones individuales ya utilizan el prefijo `M-{id_musico}-{obra_id}`, por lo que la base de datos ya soporta esta funcionalidad sin cambios en el esquema.
4. **Partes individuales múltiples**: En las celdas individuales de Seating (desktop y edición móvil) se pueden asociar varias particellas a la misma persona mediante el botón `+` junto al desplegable principal. Cada pulsación agrega un slot adicional. Se persiste como filas separadas de `seating_asignaciones` para el mismo `id_obra` y `id_musico`, sin cambiar el esquema.
5. **Edición móvil acotada por obra**: En vista móvil para editores, cada obra muestra un botón `Editar` junto al título. Al activarlo, solo esa columna muestra desplegables; el resto del Seating permanece en modo lectura para reducir ruido visual.
6. **Mis Partes**: Si una persona tiene asignación individual múltiple en una obra, todas las partes se muestran en `Mis Partes` y sus enlaces quedan disponibles para descarga.
7. **Menú móvil de Seating**: Los controles superiores de Seating en móvil se agrupan dentro de un desplegable `Menú Seating` ubicado junto al título; cada acción debe mostrar icono y texto, incluyendo el acceso al comparativo de Seating.
8. **Numeración ZIP de Mis Partes**: La descarga masiva usa el orden real de concierto como prefijo (`01`, `02`, `04`, etc.). Si una obra tiene varias partes descargables, sus archivos se nombran con sufijos alfabéticos sobre el mismo número de obra (`04a`, `04b`, `04c`, etc.).
9. **Compacidad móvil**: La vista móvil prioriza el área de la tabla; varias partes en una celda se muestran compactas en una sola línea (`Ob 1+Ob EH+Fg`), los títulos de obra muestran todo lo que entra antes de truncarse y el botón de edición por obra se muestra solo como lápiz. La subnavegación `Repertorio / Seating / Mis Partes` debe usar espaciados móviles reducidos y mantener `Mis Partes` en una sola línea.

### Criterios de Aceptación
- Un violín con `rol_gira === "solista"` aparece listado en la tabla inferior (“Vientos, Percusión y Solistas”).
- Se le puede asignar una particella específica mediante el dropdown `ParticellaSelect` (fila inferior y/o detalle del contenedor).
- El override del solista no cambia el default de los tuttistas del mismo contenedor; cada tuttista hereda el grupo hasta que el **editor** lo sobreescriba en el detalle del contenedor.
- En Seating desktop y en edición móvil por obra, una persona de vientos/solistas puede tener varias partes individuales (slots dinámicos con `+`). Los tuttistas de cuerdas usan un desplegable simple por obra.
- En `Mis Partes`, una asignación múltiple se ve como varias partes separadas para la misma obra.
- En móvil, los controles superiores de Seating están dentro del desplegable `Menú Seating` con texto visible para cada acción y acceso al comparativo.
- En el ZIP de `Mis Partes`, la numeración salta obras no tocadas y las asignaciones múltiples usan sufijos alfabéticos (`a`, `b`, `c`…).
- En la tabla móvil de Seating, varias partes en una celda se muestran compactas en una sola línea (`Ob 1+Ob EH+Fg`).
- En la cabecera móvil de obras, no se limita el título a la primera palabra; se trunca por ancho disponible.
- En móvil, la pestaña `Mis Partes` no se parte en dos líneas.

## Tuttistas de cuerdas — override por persona (2026-09-23)

El **editor** (producción) asigna partes en la grilla de Seating, no el músico en Mis Partes.

### Comportamiento
1. Al expandir un contenedor (p. ej. VIOLÍN 1), cada fila de persona muestra un `ParticellaSelect` por columna de obra.
2. Valor mostrado por defecto = particella del contenedor (`C-{id_contenedor}-{id_obra}`). Vacantes (`es_simulacion`) incluidas; ausentes no (filtro `useGiraRoster` / `isMusicianOnConfirmedSeatingRoster`).
3. Si el editor elige otra parte, se persiste override en `seating_asignaciones.id_musicos_asignados` (`M-{id_musico}-{id_obra}`), reutilizando `handleMusicianSlotAssign`.
4. Si vuelve a la misma parte del contenedor (o quita asignación) y la persona tiene **una sola** parte individual, se borra el override y vuelve a heredar. Si tiene **varias** (solista con slots `+`), se conserva la fila como en vientos.
5. El dropdown de contenedor sigue siendo el default del grupo; quien no tiene override lo sigue.
6. Mis Partes (`MyPartsViewer`) no gana UI de elección: solo **lee** el override (prioridad individual sobre contenedor, ya existente).

### UI
- Escritorio: filas de persona debajo de la fila del contenedor (alineadas a las columnas de obra).
- Móvil: en modo Editar de esa obra, el mismo desplegable en las filas hijas; en lectura, `〃` si hereda y el nombre de parte si hay override.
- Vientos/percusión: `MultiParticellaSelect` con `+` sin cambios.

