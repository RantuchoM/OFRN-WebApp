# Spec: Constancias de convocatoria y participación a giras

## Objetivo

Los integrantes pueden solicitar **constancias** de giras **Sinfónico** y **Camerata Filarmónica** a las que asistieron o asistirán. Hay dos tipos de documento (misma plantilla visual; cambia el cuerpo). Editores/admins aprueban o deniegan en Gestión; al aprobar se envía un PDF por mail.

| Tipo | Texto clave | Elegibilidad extra |
|------|-------------|--------------------|
| **Convocatoria** | «ha sido convocado/a como {función} a participar…» (o sin «como {función}» si el campo está vacío) | Gira elegible (pasada o futura) |
| **Participación realizada** (`Constancia de participación realizada`) | «participó como {función} de los ensayos…» (o «participó de los ensayos…» si vacío) | Solo giras **pasadas** (`fecha_hasta` &lt; hoy) |
| **Participación (para firmar)** | Mismo cuerpo que participación realizada; PDF **sin firma** | Giras pasadas **o futuras**; **no** crea solicitud ni mail. Si la gira **aún no terminó**, la fecha superior es el **lunes siguiente** al fin del cuerpo (o el **primer hábil** si ese lunes es feriado/puente en `feriados`); si ya pasó, usa la fecha de hoy |

Una persona puede pedir **una de cada tipo persistido por gira** (`UNIQUE (id_integrante, id_gira, tipo)`). El modo «para firmar» es solo descarga/impresión.

## UX

| Superficie | Comportamiento |
|------------|----------------|
| Header (junto a Mi Perfil) | Botón **Constancias** → modal «Mis Constancias» |
| Badge (músico) | Solicitudes propias aprobadas/denegadas aún no vistas |
| Badge (editor/admin) | Cantidad de solicitudes **pendientes** (abiertas) |
| Modal | Primero carga **Mis solicitudes** (más recientes primero; muestra 5 y «Mostrar más»; cada ítem con mes_letra \| nomenclador \| zona + fechas); en **aprobadas**: **Reenviar** / **Descargar**; al elegir gira, si no es local y la logística sale **antes** / vuelve **después** del rango del programa, ofrece tildes «Incluir día de salida/regreso» (el servidor valida contra logística). Tercera opción **Participación (para firmar)**: instruye al músico a **imprimirla y llevarla** (firma en persona); descarga PDF sin firma; giras futuras OK; sin solicitud |
| Gestión `/management/constancias` | Lista (Tipo + columna **como…** editable), filtros estado/tipo, aprobar, denegar, **Aprobar todas**; columna **Gira** con nombre + **desde–hasta del programa**; **fechas del PDF** editables (también a mano); chip **Igual a: Gira|Logística|Ninguna** por extremo abre menú para aplicar esa fecha. **Generar** preaprobada; también **Participación (para firmar)** → solo descarga plantilla. En **aprobadas**: lectura + lápiz para editar fechas/rol (borrador local) + **Reemitir**; muestra quién emitió/reemitió (`resuelto_por`). Denegadas: quién denegó + **Deshacer**. **Reenviar** / **Descargar**. Móvil: tarjetas; tabla desde `md`. Mis Constancias **no** muestra el resolutor |

En Mis Constancias el estado **pendiente** deja claro que hay que esperar la resolución.

## Elegibilidad (ambos tipos)

- `programas.tipo` ∈ `Sinfónico` \| `Camerata Filarmónica`
- Persona en nómina de la gira (`resolveGiraRosterIds`) y **no** `giras_integrantes.estado = 'ausente'`
- Si fue denegada del mismo tipo, puede volver a solicitar (reabre esa fila)

## Plantilla PDF (aplanada, con imágenes del Word)

Assets en `public/plantillas/constancia/`:
- `image2.png` — logo CULTURA RN (header)
- `image1.png` — firma Leonardo Spelzini
- Referencia convocatoria: `public/plantillas/modelo_constancia.docx`
- Referencia participación: `public/plantillas/modelo_constancia_participacion.docx`

Texto común:

> {Ciudad emisión},  {fecha emisión}  
> A quien corresponda  
> {cuerpo según tipo}  
> Sin otro particular…

- **Nombre / apellido**: siempre el **legal** (`integrantes.nombre` / `apellido`), nunca `nombre_preferencia` / `apellido_preferencia`. Se congela en `snap_nombre` / `snap_apellido` al solicitar y se revalida al aprobar antes de generar el PDF.
- **Fechas del cuerpo**: por defecto `programas.fecha_desde` / `fecha_hasta`. El músico puede tildar día de salida/regreso si la logística (↑/↓, no local) cae fuera de ese rango; el server solo amplía hasta esas fechas de logística. En Gestión se editan a mano (aprobadas en borrador hasta Reemitir); chip **Igual a:** por extremo (Gira / Logística / Ninguna) permite elegir fecha de programa o de logística.
- **Instrumento / función**: al solicitar, se toma el instrumento **efectivo de la gira** → `instrumentos.funcion` → `snap_funcion` (editable en Gestión; puede quedar **vacío**). Si hay texto: convocatoria «como {snap_funcion} a participar…»; participación «participó como {snap_funcion} de…». Si está vacío: se omite «como …» y queda «ha sido convocado/a a participar…» / «participó de los ensayos…».
- **Localidades** concatenadas de tramos / `giras_localidades`
- **Emisión**: solicitudes aprobadas → `Viedma, {reemitida_at || fecha de aprobación}`. Plantilla **para firmar** de gira no terminada → lunes siguiente al `fecha_hasta` del cuerpo (primer hábil si feriado); gira pasada → hoy
- Generación: **jsPDF** (logo + **Calibri** 13pt embebida + firma) y después **aplanado real**: cada página se rasteriza con pdf.js (~216 dpi) y pdf-lib la guarda como una sola imagen. El PDF de **Descargar** y el adjunto del mail no tienen texto seleccionable ni campos. `form.flatten()` no alcanza: jsPDF no crea AcroForm, así que el archivo seguía editable. Fecha a la **derecha**; cuerpo/cierre **justificados**, interlineado **1.5**, sangría 1ª línea ~40 mm. Sin «el Sr.» / «la Sra.»; coma tras el nombre; participio según género en convocatoria.
- Fuente: `public/fonts/Calibri.ttf`

## Mail (`mails_produccion`, mismo estilo que convocatoria Pike / `es_modelo`)

| Evento | Template | Destinatario | Contenido |
|--------|----------|--------------|-----------|
| Solicitud creada | `constancia_solicitud` | `filarmonica.scrn+constancias@gmail.com` | Asunto: `Solicitud de constancia ({tipo}) \| {nombre} \| {gira}`; cuerpo con Tipo + datos + mes/nomenclador/zona + fechas + CTA a `/management/constancias` (sin `?solicitud=`, sin fila resaltada) |
| Aprobación | `constancia_aprobada` | mail del integrante | Aviso + PDF aplanado adjunto |
| Reemisión | `constancia_modificada` | mail del integrante | «Tu constancia fue modificada» + PDF vigente adjunto |
| Denegación | `constancia_denegada` | mail del integrante | Motivo |

Modelos de revisión (`es_modelo: true`) → `ofrn.archivo@gmail.com`.

## Datos

Tabla `constancias_solicitudes`: `tipo` (`convocatoria` \| `participacion`) + snapshot PDF (`snap_instrumento`, `snap_funcion`, `snap_fecha_*`, …) + `estado` + `motivo_denegacion` + `visto_solicitante` + `reemitida_at` (última reemisión in-place; sin historial) + auditoría. Unique `(id_integrante, id_gira, tipo)`.

Tabla `instrumentos`: columna `funcion` (rol formal precompletado; editable en UniversalTable / Datos → Instrumentos).

## Estado de implementación

- [x] Spec
- [x] Migración + RLS permisiva (mismo patrón que gestión)
- [x] Tipo participación + UNIQUE por tipo
- [x] Service + PDF + mail
- [x] Modal Mis Constancias + botón header + badges
- [x] Hub Gestión (aprobar / denegar / aprobar todas / deshacer denegación; vista móvil en tarjetas)
- [x] PDF/mail con nombre y apellido **legales** (no preferencia); revalidación al aprobar
- [x] `instrumentos.funcion` + columna editable «como…» en Gestión
- [x] Descarga y mail con PDF aplanado (imagen, sin texto extraíble) (2026-11-04)
- [x] Generar desde Gestión (preaprobada + mail al músico + panel Mis Constancias)
- [x] Fechas del PDF editables (no aprobadas) + sugerencia logística no locales
- [x] Reemitir aprobada (fechas/rol + mail `constancia_modificada` + `reemitida_at`)
- [x] Mis Constancias: tildes día salida/regreso según logística (no local)
- [x] Gestión: chip «Igual a:» por extremo (elige Gira / Logística; edición manual sigue)
- [x] Participación (para firmar): PDF sin firma, giras futuras, sin solicitud; UI instruye imprimir y llevar para firma en persona (Mis Constancias + Generar en Gestión)
- [x] Para firmar + gira futura: fecha superior = lunes post-gira (hábil vía tabla `feriados`)
