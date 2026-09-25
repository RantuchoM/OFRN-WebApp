# Spec: Votación Concerto Competition

## Estado

- [x] Menú «Concerto Competition» y vista `ConcertoCompetitionView`
- [x] Boleta: cada puntaje se sincroniza al click; el promedio cuenta todos los puntajes guardados
- [x] Cierre de la ventana por el editor, sin exigir participación
- [x] Gestión de edición, instancias y participantes
- [x] Resultados en vivo (promedio y cantidad de boletas, sin votos individuales)
- [x] Participantes en columnas, con obra de catálogo vinculada al bloque «Concerto Competition» de la gira
- [x] `repertorio_obras.notas_especificas` del bloque es la proyección del participante (nombres y observación)

## Contrato de datos

Cliente: `src/services/supabase.js`. No hay `select` / `insert` / `update` / `delete` sobre `concerto_votos`.

Tablas:

- `concerto_ediciones` (`id`, `nombre`, `visible_desde`, `visible_hasta`)
- `concerto_instancias` (`id`, `id_edicion`, `id_gira`, `titulo`, `abre_en`, `cierra_en`, `orden`). `id_gira` → `programas.id`
- `concerto_participantes` (`id`, `id_instancia`, `observaciones`, `orden`, `id_repertorio_obra`)
- `concerto_participante_integrantes` (`id_participante`, `id_integrante`)

RPCs:

- `concerto_guardar_boleta({ p_id_votante, p_id_instancia, p_puntajes })`. `p_puntajes` es JSON `[{ id_participante, puntaje }, ...]`, uno o varios. Hace upsert de esos puntajes y no borra el resto de la boleta de ese votante. Respuesta `{ ok, error }`.
- `concerto_mi_boleta({ p_id_votante, p_id_instancia })` → `{ id_participante, puntaje }`.
- `concerto_promedios({ p_id_viewer, p_id_instancia })` → `{ id_participante, promedio, cantidad }`. Promedio y cantidad de todos los puntajes de `concerto_votos` de ese participante, aunque la boleta esté incompleta. No devuelve al votante. Solo si el viewer es editor o admin.
- `concerto_borrar_puntaje({ p_id_votante, p_id_instancia, p_id_participante })` → `{ ok, error }`. Borra solo ese puntaje de ese votante, y solo si `abre_en <= now <= cierra_en`.

`user.id` del `AuthContext` es `integrantes.id` (numérico).

## Electorado

El conjunto convocado de la gira sale de `fetchRosterForGira` en `src/hooks/useGiraRoster.js`. Concerto no recalcula ensambles, familias ni exclusiones.

De ese resultado, es electorado de la instancia quien:

- `condicion` es `estable` (sin distinguir mayúsculas),
- `es_simulacion` no es `true`,
- `id_gira` de la instancia no es null,
- en el roster, `estado_gira` no es `ausente` (el util deja a los ausentes en la lista).

`concerto_guardar_boleta` no tiene un segundo motor de convocatoria. Exige estable y no vacante, y rechaza si ya hay una fila personal en `giras_integrantes` de esa gira con estado `ausente`. Si está convocado solo por ensamble, esa decisión la toma el cliente con el util. Una llamada directa a la RPC, siendo estable y sin marca de ausente, no vuelve a filtrar por ensamble.

## Menú

Ítem label **Concerto Competition**, ícono `IconTrophy` (copa de competencia en `src/components/ui/Icons.jsx`), tab `?tab=competition` (`CONCERTO`). Queda en la lista desplazable de `allMenuItems`, inmediatamente encima de Feedback. El encabezado de la vista (`ConcertoCompetitionView`) usa el mismo `IconTrophy` junto al título.

- **Admin o editor** (`roles` efectivos de `rol_sistema`; `curador` solo no alcanza, y no se usa `isEditor` porque incluye curador): el ítem se muestra siempre, también fuera de la vigencia, para reabrir fechas y sumar giras.
- **Músico:** el ítem se muestra solo si ahora está entre `visible_desde` y `visible_hasta` de alguna edición y `fetchRosterForGira` lo deja como electorado de al menos una instancia de esa edición.

Al entrar, si hay ediciones, se muestra la vigente o, si ninguna lo está, la de `visible_hasta` más reciente.

## Cierre y boleta

Son dos reglas distintas.

**Cerrar la votación** lo hace el editor o admin guardando `cierra_en`. Puede ser una hora ya pasada. No hace falta que vote todo el electorado, ni una parte, ni nadie. Guardar la ventana no se deshabilita por falta de boletas, no hay bloqueo y no se exige un porcentaje de participación. La cantidad de boletas que ya entraron al promedio se muestra en Resultados y no es condición de cierre.

**La boleta** guarda cada puntaje en el click, sin botón Guardar y sin esperar al resto. No se puntúa a uno mismo ni al dúo: esos controles no están. Se puede cambiar un puntaje ya elegido; ese click también se sincroniza. Con la ventana abierta, el puntaje ya elegido tiene un tachito (`IconTrash`) que borra solo ese puntaje (`concerto_borrar_puntaje`). Mientras el request está en curso la boleta dice «Sincronizando…». Al terminar bien dice «Sincronizado.» y aparece un aviso. Si falla, muestra el error y el puntaje vuelve al último que sí quedó guardado.

El promedio (`concerto_promedios`) incluye cada puntaje ya guardado para ese participante, también si el votante no puntuó al resto. Un solo 10 se ve como 10, con cantidad 1. Quien no tiene puntajes queda en «—». Eso no impide que el editor cierre la instancia.

## Ventana de una instancia

- Abierta: `abre_en` y `cierra_en` definidos, y `abre_en <= now <= cierra_en`.
- Si falta `abre_en` o `cierra_en`: «Falta que definan la ventana de votación.» Sin puntajes ni promedios.
- Si `now < abre_en`: «La votación todavía no abre.»
- Si `now > cierra_en`: «La votación está cerrada.»

Fechas de edición e instancia: `datetime-local` interpretado como hora de Argentina (`America/Argentina/Buenos_Aires`) y guardado como timestamptz con offset `-03`.

## Escala

10, 9,5, 9, 8,5, 8, 7,5 y 7. En pantalla, con coma.

Textos en la boleta:

- La votación valora la interpretación de cada participante. No es un orden de mérito ni una clasificación.
- Cada músico asigna de 7 a 10, considerando musicalidad y expresividad, solidez técnica, interpretación y estilo, presencia solista.
- 10 Interpretación excepcional.
- 9,5 Sobresaliente, con detalles menores por ajustar.
- 9 Muy sólida y musicalmente convincente.
- 8,5 Muy buena, con algunos aspectos mejorables.
- 8 Buena, con fortalezas claras y aspectos a trabajar.
- 7,5 Correcta, aunque con varios aspectos por desarrollar.
- 7 Aceptable, con aspectos importantes por mejorar.
- La puntuación se refiere solo a la interpretación escuchada en esta instancia.

La boleta previa se carga con `concerto_mi_boleta`. El error de `concerto_guardar_boleta` se muestra en la boleta, en el lugar del aviso de sincronización.

## Músico

Una tarjeta por instancia en la que es electorado.

Fuera de la ventana abierta: la línea 1 es el nombre y, si hay obra vinculada, « - » más `obras.titulo`; debajo, más chicas, las observaciones (sin segunda línea si están vacías). Sin controles de puntaje y sin promedios. Texto de si todavía no abre, está cerrada, o falta definir la ventana.

Con la ventana abierta: escala arriba y una fila por participante que no lo incluye, con las mismas dos líneas y los siete puntajes. Cada click persiste ese puntaje.

## Editor y admin

Aunque también sea músico, ve el panel de gestión.

- Nombre y vigencia (`visible_desde`, `visible_hasta`) de la edición se ven como texto. Editar los habilita; «Guardar cambios» vuelve a lectura.
- Crear otra edición (nombre + vigencia).
- Alta de instancia: gira (`programas`, hasta 500 recientes) y título. Baja de instancia. Junto al nomenclador y el nombre de la gira, la cabecera muestra `fecha_desde` / `fecha_hasta` como `dd/mm - dd/mm`; no reemplaza Abre/Cierra.
- Por instancia: título, `abre_en`, `cierra_en` y observaciones se ven como texto. Editar habilita esos campos de esa instancia. «Guardar cambios» los persiste y vuelve a lectura. Guardar no depende de los votos. Si la edición o una instancia tiene cambios sin guardar, salir (otra pestaña, otra vista o cancelar) pide el diálogo de confirmación de la app: «Hay cambios sin guardar.» Cancelar sin cambios no pregunta.
- Alta de participante: buscador de integrantes (nombre y apellido; sin vacantes `es_simulacion`), segundo integrante opcional, observaciones. La grilla muestra una fila por participante (el dúo sigue siendo una fila). En el modal del lápiz, Guardar dice «Guardando» mientras persiste; la X con cambios pide «Hay cambios sin guardar.» (Guardar persiste y cierra, Cancelar descarta y cierra) y sin cambios cierra directo.
- Columnas: Participantes, Observaciones (texto libre; se editan con el Editar de la instancia y se guardan con «Guardar cambios»), Obra de repertorio (buscador `RepertoireWorkPickerModal`), Drive, Orgánico y acciones compactas (orden, editar integrantes, mover, quitar). Drive y orgánico salen de la obra de catálogo; si no hay vínculo, esas celdas quedan vacías. Vincular, reordenar, quitar y agregar siguen siendo acciones directas.
- Mover a otra instancia de la misma edición (`id_instancia` y `orden` al final de la destino) es un menú, no un select a lo ancho. Quitar y mover sacan la fila del bloque de la gira de origen y, si el destino tiene gira y obra vinculada, la agregan al bloque de destino.
- Participante sin integrante vinculado: aviso para asignarlo.
- Resultados: `concerto_promedios`, en el orden del campo `orden`, no por promedio, también con la ventana abierta. Cada fila es «Nombre - título» (`obras.titulo` de la obra vinculada; solo el nombre si no hay vínculo) y, debajo y más chico, las observaciones. Promedio con coma y cantidad de puntajes guardados, aunque la boleta esté incompleta. Si nadie puntuó todavía, la sección sigue visible, con cada participante en «—» y el texto «Todavía no hay puntajes.» (sin ceros inventados). No se listan votos individuales. El músico que solo vota no ve esta sección. Se pide al entrar y con Actualizar.
- Si el editor también es electorado y la ventana está abierta, vota en la misma pantalla, en la sección «Tu votación», aparte de la gestión.

Modales con portal a `document.body` y `z-[100]`. Iconos solo de `src/components/ui/Icons.jsx`. Textos en español. El buscador de obras es el modal que ya usa Programación/Repertorio, sin el filtro inicial de orgánico de la gira: las obras del concurso no tienen por qué caber en el seating convocado. Abrirlo no cambia el ancho de la página: el modal no crece con el contenido y el sidebar no se encoge.

## Obra de repertorio y bloque de la gira

`concerto_participantes.observaciones` es el texto libre (antes se llamaba `obra`). No se copia al título del catálogo ni a `repertorio_obras.titulo_concierto`. Junto con los nombres del participante, se proyecta en `repertorio_obras.notas_especificas` (el post-it de notas de la obra en el programa).

`concerto_participantes.id_repertorio_obra` apunta a `repertorio_obras.id` (`ON DELETE SET NULL`). Esa fila tiene `id_obra`. Drive (`obras.link_drive`, ícono `IconDrive`) y orgánico (`obras.instrumentacion`, o el cálculo de particellas si el texto está vacío) se leen de ahí. No hay columnas de título, orgánico ni URL en el participante.

Cada instancia usa `concerto_instancias.id_gira` → `programas.id`. Al vincular, desvincular, quitar, mover o reordenar desde esta pantalla se reconcilia solo el bloque `programas_repertorios.nombre = 'Concerto Competition'` de esa gira:

- Si no existe y hay al menos una obra vinculada, se crea.
- Si ya existe, se reutiliza (el de menor `id` si hubiera más de uno con el mismo nombre).
- Las filas del bloque son las `repertorio_obras` de los participantes de las instancias de esa gira que tienen obra vinculada. El `orden` del bloque sigue el orden de la instancia y, dentro, el de los participantes.
- Un participante sin obra vinculada no genera fila.
- `notas_especificas` de cada fila vinculada queda así: primera línea, los nombres como en la tabla (`formatParticipanteNombres`: «Nombre Apellido», o «Nombre Apellido y Nombre Apellido» si hay dúo; el orden de los dos es `id_integrante`); si hay observación, un salto de línea y el texto de `concerto_participantes.observaciones`. Sin observación, solo el nombre. Sin integrantes vinculados no se inventa un nombre: si hay observación, la nota es solo ese texto; si no hay ninguna de las dos, la nota queda vacía. No se copia el título de la obra. La escribe la misma reconciliación. Guardar observaciones, o editar el participante, también actualiza esa nota en la fila ya vinculada, sin reordenar el bloque ni tocar Drive.
- Las filas de ese bloque que ningún participante referencia se borran en esa reconciliación. Otros bloques de la gira no se tocan.
- Si el bloque se queda sin filas, se deja vacío. Es lo mismo que hace el repertorio al borrar la última obra de un bloque (`removeWork` borra la fila y no el bloque).
- Si alguien borra la fila desde Repertorio, la FK queda en null. Esta pantalla no la vuelve a crear hasta que el editor vincule de nuevo.
- Sin gira en la instancia no se puede vincular. La semilla no trae obras de catálogo: el bloque se llena cuando el editor vincula.

Migración: `supabase/migrations/20260924220000_concerto_participantes_observaciones_repertorio.sql` (después de `20260924210000`, que todavía lee `obra`). Aplicada al proyecto linked.

## Archivos

- `src/App.jsx`: ítem de menú, tab y vista.
- `src/utils/appNavigation.js`: tab `competition`. `src/utils/documentTitle.js` titula por el modo `CONCERTO`, no por la query.
- `src/utils/concertoCompeticion.js`: electorado, horarios, RPCs, participantes, reconciliación del bloque y proyección de `notas_especificas`.
- `src/views/Concerto/ConcertoCompetitionView.jsx`
- `src/views/Concerto/ConcertoParticipantesTable.jsx`
- `src/views/Concerto/ConcertoBallot.jsx`
- `src/views/Concerto/ConcertoModals.jsx`
- `supabase/migrations/20260924220000_concerto_participantes_observaciones_repertorio.sql`
- `supabase/migrations/20260924232306_concerto_boleta_guardado_parcial.sql`: `concerto_guardar_boleta` acepta un puntaje (o varios) por upsert y no reemplaza el resto de la boleta.
- `supabase/migrations/20260925005109_concerto_promedios_puntajes_parciales.sql`: `concerto_promedios` promedia todos los puntajes guardados del participante.
- `supabase/migrations/20260925010247_concerto_borrar_puntaje.sql`: `concerto_borrar_puntaje` borra un puntaje del votante si la ventana está abierta.

## Verificación (24 sep 2026)

Comparado con `supabase/migrations/20260924180000_concerto_competicion_votacion.sql`: columnas, argumentos de las tres RPCs y la escala (7 a 10 de a 0,5) coinciden con la UI. Los votos no se leen ni escriben fuera de las RPCs.

En `http://localhost:5173/?tab=competition`, con la sesión ya abierta:

- El ítem se llama «Concerto Competition» y queda inmediatamente encima de Feedback, en la lista desplazable. La edición «Concerto Competition 2026» carga vigencia 1 sep 2026 00:00 a 30 nov 2026 23:59 (hora Argentina).
- Se ven las tres instancias, con gira, participantes y obras. Resultados vacíos (sin votos).
- Guardar `abre_en`/`cierra_en` de La Fuerza del Legado no quedó bloqueado por falta de votos. Después se volvió a dejar la ventana en null.
- No se abrió una boleta de músico: las ventanas siguen sin definir y abrirlas publicaría la votación. Tamara Santander figura vinculada (Tamara Belén Cortés Araya); no apareció el aviso de participante sin integrante. Réquiem de Mozart muestra gira «Sinf 14/26. W.A Mozart».

## Verificación de la grilla (24 sep 2026)

En `http://localhost:5173/?tab=competition` la lista apilada pasó a una tabla con Participantes, Observaciones, Obra de repertorio, Drive, Orgánico y acciones compactas. Las observaciones de la semilla siguen en el campo (por ejemplo el texto de Glière). Las ventanas `abre_en`/`cierra_en` siguen vacías.

Se vinculó «Hommage a Mozart» a Jorge Fidel Montoya Vasquez: la fila mostró el título, el orgánico `2.2.2.2 - 2.2.0.0 - Perc - Str` y el enlace de Drive de `obras.link_drive`. En la gira 13 quedó el bloque «Concerto Competition» con esa fila (`repertorio_obras` 650). Al desvincular, la fila salió del bloque y el participante volvió a «Vincular». El bloque vacío de esa prueba se borró a mano; la app, igual que el repertorio al quitar la última obra, lo habría dejado vacío.

## Verificación del click (24 sep 2026)

`concerto_guardar_boleta` acepta un solo puntaje y, en un segundo llamado, actualiza esa fila sin duplicarla. La prueba se revirtió: no quedó ningún voto. En el navegador, la sesión abierta es de staff y no muestra «Tu votación», así que el texto «Sincronizando…» / «Sincronizado.» no se vio en un click real.

## Verificación de la nota (25 sep 2026)

Jorge Fidel Montoya Vasquez sigue vinculado a `repertorio_obras` 651 (obra 3649, gira 13). `notas_especificas` quedó en dos líneas, con un solo salto `\n`:

```
Jorge Fidel Montoya Vasquez
concierto para corno y orquesta de Reinhold Glière
```

No se tocaron `obras.link_drive`, `obras.instrumentacion`, `obras_particellas`, votos ni fechas. En el repertorio de la gira 13 el post-it de esa fila muestra esas dos líneas, aparte del título de catálogo.
