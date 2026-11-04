# Spec: Constancias de convocatoria a giras

## Objetivo

Los integrantes pueden solicitar una **constancia** de convocatoria a giras **Sinfónico** y **Camerata Filarmónica** a las que asistieron o asistirán. Editores/admins aprueban o deniegan en Gestión; al aprobar se envía un PDF por mail.

## UX

| Superficie | Comportamiento |
|------------|----------------|
| Header (junto a Mi Perfil) | Botón **Constancias** → modal «Mis Constancias» |
| Badge (músico) | Solicitudes propias aprobadas/denegadas aún no vistas |
| Badge (editor/admin) | Cantidad de solicitudes **pendientes** (abiertas) |
| Gestión `/management/constancias` | Lista, aprobar, denegar (modal con motivo), **Aprobar todas**; en aprobadas: **Reenviar** / **Descargar**; en denegadas: **Deshacer** (vuelve a pendiente, sin mail) |

En Mis Constancias el estado **pendiente** deja claro que hay que esperar la resolución.

## Elegibilidad

- `programas.tipo` ∈ `Sinfónico` \| `Camerata Filarmónica`
- Persona en nómina de la gira (`resolveGiraRosterIds`) y **no** `giras_integrantes.estado = 'ausente'`
- Una solicitud por persona y gira (`UNIQUE (id_integrante, id_gira)`). Si fue denegada, puede volver a solicitar (reabre o reemplaza).

## Plantilla PDF (aplanada, con imágenes del Word)

Assets en `public/plantillas/constancia/`:
- `image2.png` — logo CULTURA RN (header)
- `image1.png` — firma Leonardo Spelzini
- Referencia: `public/plantillas/modelo_constancia.docx`

Texto (mismo del Word):

> {Ciudad emisión},  {fecha emisión}  
> A quien corresponda  
> Por medio de la presente… como {instrumento} … {rango fechas} en {localidades}.  
> Sin otro particular…

- **Instrumento** (no rol tipo concertino)
- **Localidades** concatenadas de tramos / `giras_localidades`
- **Emisión**: `Viedma, {fecha de aprobación}`
- Generación: **jsPDF** (logo + **Calibri** 13pt embebida + firma) → re-save pdf-lib **aplanado**. Fecha a la **derecha**; cuerpo/cierre **justificados**, interlineado **1.5**, sangría 1ª línea ~40 mm. Sin «el Sr.» / «la Sra.»; coma tras el nombre; sin coma tras el instrumento; participio según género (convocado/convocada).
- Fuente: `public/fonts/Calibri.ttf`

## Mail (`mails_produccion`, mismo estilo que convocatoria Pike / `es_modelo`)

| Evento | Template | Destinatario | Contenido |
|--------|----------|--------------|-----------|
| Solicitud creada | `constancia_solicitud` | `filarmonica.scrn+constancias@gmail.com` | Asunto: `Solicitud de constancia \| {nombre} \| {gira}`; cuerpo con datos + CTA a `/management/constancias?solicitud={id}` |
| Aprobación | `constancia_aprobada` | mail del integrante | Aviso + PDF aplanado adjunto |
| Denegación | `constancia_denegada` | mail del integrante | Motivo |

Modelos de revisión (`es_modelo: true`) → `ofrn.archivo@gmail.com`.

## Datos

Tabla `constancias_solicitudes`: solicitud + snapshot de datos del PDF + `estado` (`pendiente` \| `aprobada` \| `denegada`) + `motivo_denegacion` + `visto_solicitante` + auditoría de resolución.

## Estado de implementación

- [x] Spec
- [x] Migración + RLS permisiva (mismo patrón que gestión)
- [x] Service + PDF + mail
- [x] Modal Mis Constancias + botón header + badges
- [x] Hub Gestión (aprobar / denegar / aprobar todas)
