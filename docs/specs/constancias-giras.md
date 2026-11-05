# Spec: Constancias de convocatoria y participación a giras

## Objetivo

Los integrantes pueden solicitar **constancias** de giras **Sinfónico** y **Camerata Filarmónica** a las que asistieron o asistirán. Hay dos tipos de documento (misma plantilla visual; cambia el cuerpo). Editores/admins aprueban o deniegan en Gestión; al aprobar se envía un PDF por mail.

| Tipo | Texto clave | Elegibilidad extra |
|------|-------------|--------------------|
| **Convocatoria** | «ha sido convocado/a como {función} a participar…» (p.ej. violinista; editable en Gestión) | Gira elegible (pasada o futura) |
| **Participación realizada** (`Constancia de participación realizada`) | «participó como {función} de los ensayos y conciertos…» (editable en Gestión) | Solo giras **pasadas** (`fecha_hasta` &lt; hoy) |

Una persona puede pedir **una de cada tipo por gira** (`UNIQUE (id_integrante, id_gira, tipo)`).

## UX

| Superficie | Comportamiento |
|------------|----------------|
| Header (junto a Mi Perfil) | Botón **Constancias** → modal «Mis Constancias» |
| Badge (músico) | Solicitudes propias aprobadas/denegadas aún no vistas |
| Badge (editor/admin) | Cantidad de solicitudes **pendientes** (abiertas) |
| Modal | Primero carga **Mis solicitudes** (más recientes primero; muestra 5 y «Mostrar más»; cada ítem con mes_letra \| nomenclador \| zona + fechas); en **aprobadas**: **Reenviar** (mail propio) y **Descargar** PDF; el desplegable de giras solo se carga al elegir tipo |
| Gestión `/management/constancias` | Lista (Tipo + columna **como…** editable), filtros estado/tipo, aprobar, denegar, **Aprobar todas**; **fechas del PDF** editables en pendientes/denegadas; logística no local como sugerencia. **Generar** preaprobada. En **aprobadas**: editar fechas/rol en borrador local + **Reemitir**; muestra quién emitió/reemitió (`resuelto_por`). Denegadas: quién denegó + **Deshacer**. **Reenviar** / **Descargar**. Móvil: tarjetas; tabla desde `md`. Mis Constancias **no** muestra el resolutor |

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
- **Fechas del cuerpo**: por defecto `programas.fecha_desde` / `fecha_hasta`. En Gestión (solo no aprobadas) se pueden editar. Sugerencia para no locales: ventana de viaje de logística (primera subida ↑ / última bajada ↓ a/desde origen). Locales: sin sugerencia de viaje.
- **Instrumento / función**: al solicitar, se toma el instrumento **efectivo de la gira** (`giras_integrantes.id_instr` si el Roster lo modificó respecto al perfil; si no, `integrantes.id_instr`). De ahí se lee `instrumentos.funcion` → `snap_funcion` (editable en Gestión, p.ej. «concertino»). Ambos PDFs: convocatoria «como {snap_funcion} a participar…»; participación «participó como {snap_funcion} de…».
- **Localidades** concatenadas de tramos / `giras_localidades`
- **Emisión**: `Viedma, {reemitida_at || fecha de aprobación}`
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
