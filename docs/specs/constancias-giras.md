# Spec: Constancias de convocatoria y participación a giras

## Objetivo

Los integrantes pueden solicitar **constancias** de giras **Sinfónico** y **Camerata Filarmónica** a las que asistieron o asistirán. Hay dos tipos de documento (misma plantilla visual; cambia el cuerpo). Editores/admins aprueban o deniegan en Gestión; al aprobar se envía un PDF por mail.

| Tipo | Texto clave | Elegibilidad extra |
|------|-------------|--------------------|
| **Convocatoria** | «ha sido convocado/a como {instrumento} a participar…» | Gira elegible (pasada o futura) |
| **Participación realizada** (`Constancia de participación realizada`) | «participó de los ensayos y conciertos…» (sin instrumento) | Solo giras **pasadas** (`fecha_hasta` &lt; hoy) |

Una persona puede pedir **una de cada tipo por gira** (`UNIQUE (id_integrante, id_gira, tipo)`).

## UX

| Superficie | Comportamiento |
|------------|----------------|
| Header (junto a Mi Perfil) | Botón **Constancias** → modal «Mis Constancias» |
| Badge (músico) | Solicitudes propias aprobadas/denegadas aún no vistas |
| Badge (editor/admin) | Cantidad de solicitudes **pendientes** (abiertas) |
| Modal | Selector **Convocatoria / Participación realizada** + gira filtrada |
| Gestión `/management/constancias` | Lista (columna Tipo), filtros por estado y por tipo (Todos / Convocatoria / Participación realizada), aprobar, denegar (modal con motivo), **Aprobar todas** (= pendientes del filtro de tipo actual); en aprobadas: **Reenviar** / **Descargar**; en denegadas: **Deshacer** (vuelve a pendiente, sin mail) |

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

- **Instrumento** solo en convocatoria (no rol tipo concertino)
- **Localidades** concatenadas de tramos / `giras_localidades`
- **Emisión**: `Viedma, {fecha de aprobación}`
- Generación: **jsPDF** (logo + **Calibri** 13pt embebida + firma) → re-save pdf-lib **aplanado**. Fecha a la **derecha**; cuerpo/cierre **justificados**, interlineado **1.5**, sangría 1ª línea ~40 mm. Sin «el Sr.» / «la Sra.»; coma tras el nombre; sin coma tras el instrumento (convocatoria); participio según género en convocatoria.
- Fuente: `public/fonts/Calibri.ttf`

## Mail (`mails_produccion`, mismo estilo que convocatoria Pike / `es_modelo`)

| Evento | Template | Destinatario | Contenido |
|--------|----------|--------------|-----------|
| Solicitud creada | `constancia_solicitud` | `filarmonica.scrn+constancias@gmail.com` | Asunto: `Solicitud de constancia ({tipo}) \| {nombre} \| {gira}`; cuerpo con Tipo + datos + CTA |
| Aprobación | `constancia_aprobada` | mail del integrante | Aviso + PDF aplanado adjunto |
| Denegación | `constancia_denegada` | mail del integrante | Motivo |

Modelos de revisión (`es_modelo: true`) → `ofrn.archivo@gmail.com`.

## Datos

Tabla `constancias_solicitudes`: `tipo` (`convocatoria` \| `participacion`) + snapshot PDF + `estado` (`pendiente` \| `aprobada` \| `denegada`) + `motivo_denegacion` + `visto_solicitante` + auditoría de resolución. Unique `(id_integrante, id_gira, tipo)`.

## Estado de implementación

- [x] Spec
- [x] Migración + RLS permisiva (mismo patrón que gestión)
- [x] Tipo participación + UNIQUE por tipo
- [x] Service + PDF + mail
- [x] Modal Mis Constancias + botón header + badges
- [x] Hub Gestión (aprobar / denegar / aprobar todas / deshacer denegación)
