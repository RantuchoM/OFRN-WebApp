# Vista tabulada del listado de programas

Modo opcional del listado (`view` lista) en Giras. La vista tradicional sigue siendo las tarjetas. El toggle **Tarjetas / Tabla** de la barra superior cambia el modo. El último modo queda en `integrantes.giras_vista_lista` (`cards` o `table`); null abre en tarjetas. El caché de sesión (`app_user`) copia ese valor para no parpadear al entrar.

En móvil, fechas, tipo y estado no van en una fila con scroll: el botón **Filtros** los despliega en columna, con las fechas a ancho completo. Desde `md` siguen en la barra.

## Columnas (dos líneas)

| Línea | Fecha | Tipo | Zona | Ensambles / Familia | Título | Directores | Orgánico | Menú |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Día, o rango `dd-dd`, en el mismo bloque que la tarjeta | Tipo (etiqueta corta de `getProgramStyle`) | Zona | `giras_fuentes` en línea, separados por `\|`, con salto si no entran (familia Producción omitida; exclusiones tachadas) | `nombre_gira` (abre agenda, o difusión si el rol es difusión) | Directores confirmados | Orgánico convocado, sin etiqueta (`programas.organico_convocado`) | Repertorio y `GiraActionMenu` |
| 2 | Mes en mayúsculas (`OCT` o `OCT - NOV`) | Tag `mes_letra` + nomenclador | Localías con pin | | Subtítulo | Solistas confirmados | | |

Estado distinto de Vigente: mismo criterio de tinta que la tarjeta (vigente con el color del tipo, borrador en gris, pausada en ámbar) y sigla de tres letras junto al tipo. El nomenclador va en el tag con borde del tipo (`mes_letra` + nomenclador). La localía lleva pin. Ensambles y familias van en la misma línea, separados por `|`, y bajan de renglón si no entran; se muestran todos. Esa columna tiene tope (`11rem`) para que el ancho libre priorice el título. El orgánico es el texto guardado en `programas.organico_convocado`. Si todavía no hay fecha de cálculo, la fila lo pide en segundo plano (de a dos programas) y muestra `…`.

## Orgánico convocado (cache)

Columnas en `programas`: `organico_convocado` (texto estándar), `organico_convocado_map` (conteo por familia) y `organico_convocado_at`. El cálculo no se duplica en SQL: `fetchRosterForGira` (`lite`) + `computeConvoked` + `formatInstrumentationStandard`.

Se refresca en dos momentos:

1. **Al tocar el programa.** Al cargar o refrescar el roster, al cambiar fechas, fuentes o staff, al guardar ausencias o roles, al aplicar un borrador del sandbox y al sumar un solista desde repertorio.
2. **Una vez por día, a las 07:00 ART** (10:00 UTC), la función `organico-convocado-refresh` recorre los programas vigentes o futuros (día de Argentina), los de cálculo más viejo primero, hasta unos 90 segundos. Cubre cambios de instrumento, ensamble o condición que no pasan por la ficha del programa. El cron usa `rosterRefresh.mjs` (bundle del mismo servicio). Si cambia el cálculo del roster, hay que regenerar ese archivo y volver a desplegar la función.
3. **A mano, en Gestión → Auditoría de instrumentación.** El botón **Recalcular vigentes** recorre esa misma tanda completa y muestra el avance. Cada programa tiene un botón de refresco para recalcular solo ese orgánico.

La tabla, los badges de programa (mientras el roster no llegó, y el mapa que después se vuelve a guardar) y el Conv de Gestión leen ese cache. Un bloque de repertorio con filtro de grupo sigue contando solo a ese grupo, en vivo. El sandbox, si el borrador no cambia el roster, muestra el mismo cache; si hay borrador, el lado draft se calcula en vivo.

Cada fila tiene el icono de repertorio (abre `RepertoireManager`) y, a la derecha, el de agenda (muestra u oculta los conciertos de esa fila). El de la barra, al lado del repertorio, hace lo mismo en todas las filas.

## Conciertos

Aparecen debajo de la fila solo cuando el botón de agenda está activo, en tipografía más chica e indentados (`pl-14`). No hay renglón resumen. Listan fecha, hora, locación y localía. Pasados quedan atenuados. Sin conciertos en un programa que no es Comisión: aviso ámbar y, si se puede editar, acceso a la sección de conciertos del formulario.

## Hecho

- [x] Toggle en la barra superior, solo en la vista lista.
- [x] Tabla con el mismo filtro, alta, menú y resaltado que las tarjetas.
- [x] **Editar programa** (menú Edición, tarjetas y tabla) abre `GiraForm` en un modal (`z-[100]`, portal a `document.body`). La fila o la tarjeta queda en la lista. La pestaña Edición de la agenda hace lo mismo sobre la agenda, sin reemplazar el listado de eventos.
- [x] El botón de repertorio de la barra también abre el repertorio en la tabla.
- [x] Fila teñida como la tarjeta, tag de nomenclador, pin de localía, ensambles con barras e icono de repertorio.
- [x] Conciertos indentados, visibles solo con el botón de agenda (fila o barra), sin renglón resumen.
- [x] Orgánico leído de `programas.organico_convocado`, con refresco al guardar y por cron.
- [x] **Prueba móvil (`< md`):** primera fila Fecha, Tipo, Zona y Ensambles. Debajo, centrados: título, subtítulo, directores encadenados y solistas encadenados (cada uno en su línea; se omite la línea si está vacía). Sin columna de orgánico y sin encabezado. El menú queda a la derecha, y debajo los íconos de repertorio y conciertos. Desde `md` la grilla de ocho columnas no cambia.
