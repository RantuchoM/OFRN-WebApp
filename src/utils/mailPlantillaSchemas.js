/**
 * Esquemas de plantillas de mail (texto editable; layout fijo en mails_produccion).
 * Placeholders: {nombre}, {gira}, {nomenclador}, {motivo}, {titular}, {quien_cubre}, etc.
 */

export const MAIL_PLANTILLA_FAMILIAS = [
  { id: "convocatoria", label: "Convocatoria / roster / cobertura" },
  { id: "giras", label: "Giras / fechas" },
  { id: "viaticos", label: "Viáticos y comidas" },
  { id: "repertorio", label: "Repertorio / arreglos" },
  { id: "acceso", label: "Acceso y perfil" },
  { id: "constancias", label: "Constancias" },
  { id: "otros", label: "Otros" },
];

/** @typedef {{ key: string, label: string, multiline?: boolean }} MailSlotDef */

/**
 * @typedef {object} MailPlantillaSchema
 * @property {string} templateId
 * @property {string} variantKey
 * @property {string} familia
 * @property {string} titulo
 * @property {string} asunto
 * @property {MailSlotDef[]} slotDefs
 * @property {Record<string, string>} slots
 * @property {string[]} placeholders
 * @property {Record<string, string>} [previewVars]
 */

const PH_CONVOCATORIA = [
  "nombre",
  "gira",
  "nomenclador",
  "motivo",
  "titular",
  "quien_cubre",
  "ensamble",
  "familia",
  "fecha_desde",
  "fecha_hasta",
  "zona",
];

function conv(variantKey, titulo, asunto, slots, extraPlaceholders = []) {
  const slotDefs = Object.keys(slots).map((key) => ({
    key,
    label: SLOT_LABELS[key] || key,
    multiline: key === "footnote" || key === "lead" || key === "cuerpo" || key === "intro",
  }));
  return {
    templateId: "convocatoria_gira",
    variantKey,
    familia: "convocatoria",
    titulo,
    asunto,
    slotDefs,
    slots,
    placeholders: [...new Set([...PH_CONVOCATORIA, ...extraPlaceholders])],
    previewVars: {
      nombre: "{nombre}",
      gira: "{gira}",
      nomenclador: "{nomenclador}",
      motivo: "{motivo}",
      titular: "{titular}",
      quien_cubre: "{quien_cubre}",
      ensamble: "{ensamble}",
      familia: "{familia}",
    },
  };
}

const SLOT_LABELS = {
  titulo_interno: "Título interno del mail",
  saludo: "Saludo",
  lead: "Párrafo principal",
  reason: "Motivo (bloque amarillo)",
  footnote: "Nota al pie (gris)",
  cierre: "Cierre",
  intro: "Introducción",
  cuerpo: "Cuerpo / párrafos",
  firma_nombre: "Firma — nombre",
  firma_cargo: "Firma — cargo",
  firma_org: "Firma — organización",
  footer: "Pie de página",
  aviso_fecha: "Aviso de fecha límite",
  link_texto: "Texto del enlace",
  titulo_caja: "Título de la caja",
};

/** @type {MailPlantillaSchema[]} */
export const MAIL_PLANTILLA_SCHEMAS = [
  // —— Convocatoria ——
  conv(
    "INITIAL_BROADCAST",
    "Convocatoria inicial (broadcast)",
    "Convocatoria a gira | {gira}",
    {
      titulo_interno: "Convocatoria a gira",
      lead: "Te convocamos a la gira <strong>{gira}</strong> ({nomenclador}).",
      cierre: "Cualquier consulta, respondé a este correo.",
      link_texto: "Ver repertorio y material de la gira",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA",
    "Alta en gira (genérica)",
    "Alta en gira | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Fuiste dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se te convoca individualmente",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA:titular_vacante",
    "Asignación como titular (vacante)",
    "Alta en gira | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Fuiste dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se te asignó en forma individual.",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA:presente",
    "Ausente → presente",
    "Alta en gira | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Volviste a ser dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Habías solicitado ser cubierto/a pero ya no es necesario.",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA:cobertura",
    "Alta por cobertura (quien cubre)",
    "Alta en gira | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Fuiste dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se te convoca para cubrir a {titular} en esta gira",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA:restituir_titular",
    "Restituir titular tras cobertura",
    "Alta en gira | Anulación de cobertura | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Fuiste dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason:
        "Se te restituye en la gira. Quedás nuevamente convocado/a como presente; {quien_cubre} deja de cubrirte y sale de la nómina.",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA:inclusion_ensamble",
    "Inclusión de ensamble",
    "Alta en gira | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Fuiste dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se te convoca con el ensamble {ensamble}",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA:inclusion_familia",
    "Inclusión de familia",
    "Alta en gira | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Fuiste dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se te convoca con la familia de {familia}",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "ALTA:inclusion_mixta",
    "Inclusión ensamble + familia",
    "Alta en gira | {gira}",
    {
      titulo_interno: "Alta en gira",
      lead: "Fuiste dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason:
        "Se te convoca con el ensamble {ensamble} y la familia de {familia}",
      cierre: "Saludos.",
      link_texto: "Ver repertorio y material",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "AUSENTE",
    "Marcar ausente",
    "Ausencia en gira | {motivo} | {gira}",
    {
      titulo_interno: "Ausencia en gira",
      lead: "Se registró tu situación de <strong>ausente</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se te marcó como ausente. Motivo: {motivo}",
      cierre: "Para cualquier cambio, contactá a la administración.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA",
    "Baja / desconvocatoria",
    "Ausencia en gira | Motivo: {motivo} | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Baja de la gira. Motivo: {motivo}",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA:balance",
    "Baja por balance orquestal",
    "Baja de gira por balance orquestal | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Baja de la gira. Motivo: Balance Orquestal",
      footnote:
        "Desde la dirección artística se hicieron ajustes en el seating, por lo tanto se te informa que quedás desafectado de tu fila en esta gira. No obstante, si llegáramos a requerir de sus servicios (por enfermedad de algún/a colega u otra razón) te la haremos saber a la mayor brevedad posible.",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA:exclusion_ensamble",
    "Exclusión de ensamble",
    "Baja en la gira | Se excluyó al ensamble | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se excluyó al ensamble {ensamble}. Motivo: {motivo}",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA:exclusion_familia",
    "Exclusión de familia",
    "Baja en la gira | Se excluyó la familia | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Se excluyó la familia de {familia}. Motivo: {motivo}",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA:cobertura_fin",
    "Fin de cobertura (cambio o retiro)",
    "Baja de gira | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "Fin de cobertura de {titular}.",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA:restituir_cubre",
    "Baja del cubridor al restituir titular",
    "Baja de gira | Anulación de cobertura | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason:
        "Finalizó tu cobertura en esta gira. {titular} vuelve a la nómina; ya no se requiere tu participación.",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA:ambos_titular",
    "Baja de ambos — titular",
    "Baja de gira | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason:
        "Baja de la gira: no se requiere tu participación en este servicio. {quien_cubre}, quien te cubría, también queda desafectado/a.",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "BAJA:ambos_cubre",
    "Baja de ambos — quien cubre",
    "Baja de gira | {gira}",
    {
      titulo_interno: "Baja de gira",
      lead: "Se registró tu <strong>baja</strong> de la gira <strong>{gira}</strong> ({nomenclador}).",
      reason:
        "Baja de la gira: la cobertura deja de ser necesaria porque tampoco se convoca a {titular}.",
      cierre: "Si tenés dudas, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "GIRA_ELIMINADA",
    "Gira cancelada / eliminada",
    "Gira cancelada | {gira}",
    {
      titulo_interno: "Gira cancelada",
      lead: "Te informamos que la gira <strong>{gira}</strong> ha sido <strong>cancelada definitivamente</strong> y eliminada del cronograma.",
      cierre: "Si tenés consultas, contactá a la administración.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  conv(
    "SEATING_CAMBIO",
    "Novedades de seating",
    "Novedades de seating | {gira}",
    {
      titulo_interno: "Novedades de seating",
      lead: "Hay novedades de seating en la gira <strong>{gira}</strong> ({nomenclador}).",
      reason: "{motivo}",
      cierre: "Saludos.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
  ),
  {
    templateId: "convocatoria_gira",
    variantKey: "ALTA_ACCESO_PERSONAL",
    familia: "convocatoria",
    titulo: "Convocado/a + acceso personal (refuerzo)",
    asunto: "Convocado/a a la gira | {gira}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "lead", label: SLOT_LABELS.lead, multiline: true },
      { key: "cta_ayuda", label: "Texto sobre el botón de acceso", multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Convocado/a a la gira",
      lead: "Te convocamos a la gira <strong>{gira}</strong> ({nomenclador}).",
      cta_ayuda: "Tu acceso personal a esta gira (no hace falta usuario ni contraseña):",
      cierre: "Cualquier consulta, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro",
    },
    placeholders: ["nombre", "gira", "nomenclador", "fecha_desde", "fecha_hasta"],
    previewVars: { nombre: "{nombre}", gira: "{gira}", nomenclador: "{nomenclador}" },
  },

  // —— Viáticos / comidas ——
  {
    templateId: "viaticos_simple",
    variantKey: "",
    familia: "viaticos",
    titulo: "Viáticos individuales",
    asunto: "Viáticos OFRN | {gira}",
    slotDefs: [
      { key: "saludo", label: SLOT_LABELS.saludo },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "aclaracion_comidas", label: "Aclaración comidas", multiline: true },
      { key: "aclaracion_rendibles", label: "Aclaración montos rendibles", multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre, multiline: true },
      { key: "firma_nombre", label: SLOT_LABELS.firma_nombre },
      { key: "firma_cargo", label: SLOT_LABELS.firma_cargo },
      { key: "firma_org", label: SLOT_LABELS.firma_org },
    ],
    slots: {
      saludo: "Hola {nombre}, ¿cómo estás?",
      intro: "Te comparto cómo serán los viáticos para esta gira (<strong>{gira}</strong>):",
      aclaracion_comidas:
        "El monto destinado a <span style=\"color:#15803d;font-weight:bold\">comidas</span> no se rinde, por lo cual no necesitas guardar los tickets.",
      aclaracion_rendibles:
        "El monto destinado a movilidad (pasajes) sí se rinde, así que debes conservar los pasajes y enviarlos firmados a filarmonica.scrn@gmail.com. En caso de gastar menos que el monto estimado deberás devolver la diferencia; y si gastaras más, se reintegrará el excedente.",
      cierre: "Nos mantenemos en contacto.<br>¡Beso y buena semana!",
      firma_nombre: "Carla Fernández",
      firma_cargo: "Administración",
      firma_org: "Orquesta Filarmónica de Río Negro",
    },
    placeholders: ["nombre", "gira"],
    previewVars: { nombre: "{nombre}", gira: "{gira}" },
  },
  {
    templateId: "confirmacion_comidas",
    variantKey: "",
    familia: "viaticos",
    titulo: "Confirmación de comidas",
    asunto: "Confirmación de Comidas | {gira}",
    slotDefs: [
      { key: "saludo", label: SLOT_LABELS.saludo },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "aviso_fecha", label: SLOT_LABELS.aviso_fecha, multiline: true },
      { key: "cuerpo", label: SLOT_LABELS.cuerpo, multiline: true },
      { key: "firma_nombre", label: SLOT_LABELS.firma_nombre },
      { key: "firma_cargo", label: SLOT_LABELS.firma_cargo },
      { key: "firma_org", label: SLOT_LABELS.firma_org },
    ],
    slots: {
      saludo: "Hola,",
      intro:
        "Está abierta la confirmación de comidas para la gira <strong>{nomenclador} - {gira}</strong>.",
      aviso_fecha:
        "⚠️ La misma se encontrará abierta hasta el <strong>{fecha_limite}</strong>.",
      cuerpo:
        "<strong>La confirmación es fundamental</strong> para poder garantizar que se dispondrá de las comidas necesarias para cada participante de la gira.",
      firma_nombre: "Carla Fernández",
      firma_cargo: "Administración",
      firma_org: "Orquesta Filarmónica de Río Negro",
    },
    placeholders: ["gira", "nomenclador", "fecha_limite"],
    previewVars: {
      gira: "{gira}",
      nomenclador: "{nomenclador}",
      fecha_limite: "{fecha_limite}",
    },
  },
  {
    templateId: "cambio_alimentacion",
    variantKey: "",
    familia: "viaticos",
    titulo: "Cambio de alimentación (aviso a producción)",
    asunto: "Cambio de alimentación | {nombre}",
    slotDefs: [
      { key: "saludo", label: SLOT_LABELS.saludo },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      saludo: "Hola producción,",
      intro: "Un integrante actualizó su tipo de alimentación desde Mi Perfil.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: ["nombre", "alimentacion_anterior", "alimentacion_nueva"],
    previewVars: { nombre: "{nombre}" },
  },

  // —— Repertorio ——
  {
    templateId: "nueva_obra",
    variantKey: "",
    familia: "repertorio",
    titulo: "Nueva obra en repertorio",
    asunto: "[Repertorio] Nueva Obra: {titulo}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Nueva Obra en Repertorio",
      footer: "Notificación automática del Sistema de Gestión.",
    },
    placeholders: [
      "nombre",
      "titulo",
      "compositores",
      "arregladores",
      "duracion",
      "instrumentacion",
      "estado",
      "anio",
      "link_drive",
      "link_youtube",
      "observaciones",
      "comentarios",
    ],
    previewVars: { titulo: "{titulo}", nombre: "{nombre}" },
  },
  {
    templateId: "cambio_fechas_gira",
    variantKey: "",
    familia: "giras",
    titulo: "Cambio de fechas de gira",
    asunto: "⚠️ CAMBIO DE FECHAS: {gira}",
    slotDefs: [
      { key: "saludo", label: SLOT_LABELS.saludo },
      { key: "lead", label: SLOT_LABELS.lead, multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      saludo: "Hola,",
      lead: "Te informamos que la gira <strong>{gira}</strong> ha sido <strong>trasladada</strong> de fechas.",
      cierre: "Cualquier consulta, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: [
      "gira",
      "zona",
      "fechas_viejas",
      "fechas_nuevas",
      "link_gira",
    ],
    previewVars: { gira: "{gira}" },
  },
  {
    templateId: "encargo_arreglo",
    variantKey: "",
    familia: "repertorio",
    titulo: "Encargo de arreglo",
    asunto: "[Repertorio] Para arreglar: {titulo}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Encargo de arreglo",
      intro: "Una obra del repertorio ha pasado a estado <strong>Para arreglar</strong>.",
      footer: "Notificación automática – Sistema de Gestión OFRN",
    },
    placeholders: [
      "nombre",
      "titulo",
      "solicitado_por",
      "arreglador",
      "id_obra",
      "fecha_esperada",
      "dificultad",
      "instrumentacion",
      "link_drive",
      "observaciones",
    ],
    previewVars: { titulo: "{titulo}", nombre: "{nombre}" },
  },
  {
    templateId: "versionado_arreglo",
    variantKey: "",
    familia: "repertorio",
    titulo: "Versionado de arreglo",
    asunto: "[Repertorio] {tipo_label}: {titulo}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Versionado de arreglo",
      footer: "Notificación automática – Sistema de Gestión OFRN",
    },
    placeholders: ["titulo", "tipo_label", "link_drive", "observacion"],
    previewVars: { titulo: "{titulo}", tipo_label: "{tipo_label}" },
  },
  {
    templateId: "encargo_ajuste",
    variantKey: "",
    familia: "repertorio",
    titulo: "Encargo de ajuste",
    asunto: "[Repertorio] Ajuste: {titulo}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Encargo de ajuste",
      intro:
        "Se solicitó un <strong>ajuste menor</strong> sobre una obra ya entregada/oficial (no es un arreglo nuevo).",
      footer: "Notificación automática – Sistema de Gestión OFRN",
    },
    placeholders: [
      "nombre",
      "titulo",
      "tipo",
      "solicitado_por",
      "arreglador",
      "id_obra",
      "id_ajuste",
      "fecha_esperada",
      "link_drive",
      "brief",
      "partes_afectadas",
    ],
    previewVars: { titulo: "{titulo}", nombre: "{nombre}" },
  },
  {
    templateId: "ajuste_entregado",
    variantKey: "",
    familia: "repertorio",
    titulo: "Ajuste entregado",
    asunto: "[Repertorio] Ajuste entregado: {titulo}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Ajuste entregado",
      intro:
        "Se agregaron <strong>partes nuevas versionadas</strong> a la carpeta de la obra (sin reemplazar las anteriores).",
      footer: "Notificación automática – Sistema de Gestión OFRN",
    },
    placeholders: [
      "titulo",
      "id_obra",
      "id_ajuste",
      "link_drive",
      "observacion",
    ],
    previewVars: { titulo: "{titulo}" },
  },
  {
    templateId: "obra_entregada",
    variantKey: "",
    familia: "repertorio",
    titulo: "Obra entregada",
    asunto: "[Repertorio] Obra entregada: {titulo}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Obra entregada",
      intro:
        "Una obra ha sido marcada como <strong>Entregado</strong> y su material fue copiado a la carpeta del Archivo.",
      footer: "Notificación automática – Sistema de Gestión OFRN",
    },
    placeholders: ["titulo", "id_obra", "link_drive"],
    previewVars: { titulo: "{titulo}" },
  },

  // —— Acceso ——
  {
    templateId: "acceso_clave",
    variantKey: "generada",
    familia: "acceso",
    titulo: "Contraseña generada",
    asunto: "Tu contraseña de acceso | OFRN",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Tu contraseña de acceso",
      intro: "Se generó una contraseña para que puedas entrar a la aplicación OFRN.",
      cierre:
        "Si no pediste este correo, respondé a este mensaje para avisar a administración.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: ["nombre", "mail", "clave_acceso", "link_app"],
    previewVars: { nombre: "{nombre}" },
  },
  {
    templateId: "acceso_clave",
    variantKey: "recuperada",
    familia: "acceso",
    titulo: "Contraseña recuperada",
    asunto: "Recuperación de contraseña | OFRN",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Recuperación de contraseña",
      intro: "Pediste recuperar tu contraseña de acceso a la aplicación OFRN.",
      cierre:
        "Si no pediste este correo, respondé a este mensaje para avisar a administración.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: ["nombre", "mail", "clave_acceso", "link_app"],
    previewVars: { nombre: "{nombre}" },
  },

  // —— Constancias ——
  {
    templateId: "constancia_solicitud",
    variantKey: "",
    familia: "constancias",
    titulo: "Solicitud de constancia (a producción)",
    asunto: "Solicitud de constancia | {gira}",
    slotDefs: [
      { key: "saludo", label: SLOT_LABELS.saludo },
      { key: "intro", label: SLOT_LABELS.intro, multiline: true },
      { key: "titulo_caja", label: SLOT_LABELS.titulo_caja },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      saludo: "Hola producción,",
      intro: "Hay una <strong>solicitud de constancia</strong> pendiente de revisión.",
      titulo_caja: "Solicitud de constancia",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: ["gira", "solicitante_nombre"],
    previewVars: { gira: "{gira}" },
  },
  {
    templateId: "constancia_aprobada",
    variantKey: "",
    familia: "constancias",
    titulo: "Constancia aprobada",
    asunto: "Constancia aprobada | {gira}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "lead", label: SLOT_LABELS.lead, multiline: true },
      { key: "cuerpo", label: SLOT_LABELS.cuerpo, multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Constancia aprobada",
      lead:
        "Tu solicitud de <strong>{tipo_constancia}</strong> para la gira <strong>{gira}</strong> fue <strong>aprobada</strong>.",
      cuerpo:
        "Adjuntamos el PDF de la constancia. También podés ver el estado en <strong>Mis Constancias</strong> en la app.",
      cierre: "Cualquier consulta, respondé a este correo.<br>¡Saludos!<br>Orquesta Filarmónica de Río Negro",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: ["nombre", "gira", "tipo_constancia"],
    previewVars: { nombre: "{nombre}", gira: "{gira}", tipo_constancia: "{tipo_constancia}" },
  },
  {
    templateId: "constancia_modificada",
    variantKey: "",
    familia: "constancias",
    titulo: "Constancia modificada / reemitida",
    asunto: "Constancia modificada | {gira}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "lead", label: SLOT_LABELS.lead, multiline: true },
      { key: "cuerpo", label: SLOT_LABELS.cuerpo, multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Tu constancia fue modificada",
      lead:
        "Actualizamos tu <strong>{tipo_constancia}</strong> de la gira <strong>{gira}</strong>. Adjuntamos el PDF vigente.",
      cuerpo:
        "Podés verla también en <strong>Mis Constancias</strong> en la app. Si tenías una versión anterior, usá este PDF.",
      cierre: "Cualquier consulta, respondé a este correo.<br>¡Saludos!<br>Orquesta Filarmónica de Río Negro",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: ["nombre", "gira", "tipo_constancia"],
    previewVars: { nombre: "{nombre}", gira: "{gira}", tipo_constancia: "{tipo_constancia}" },
  },
  {
    templateId: "constancia_denegada",
    variantKey: "",
    familia: "constancias",
    titulo: "Constancia denegada",
    asunto: "Constancia denegada | {gira}",
    slotDefs: [
      { key: "titulo_interno", label: SLOT_LABELS.titulo_interno },
      { key: "lead", label: SLOT_LABELS.lead, multiline: true },
      { key: "cierre", label: SLOT_LABELS.cierre, multiline: true },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      titulo_interno: "Constancia denegada",
      lead:
        "Tu solicitud de <strong>{tipo_constancia}</strong> para la gira <strong>{gira}</strong> no pudo ser aprobada.",
      cierre: "Cualquier consulta, respondé a este correo.",
      footer: "Orquesta Filarmónica de Río Negro – Sistema de Gestión",
    },
    placeholders: ["nombre", "gira", "tipo_constancia", "motivo"],
    previewVars: { nombre: "{nombre}", gira: "{gira}", motivo: "{motivo}" },
  },

  // —— Otros ——
  {
    templateId: "scrn_transporte_evento",
    variantKey: "",
    familia: "otros",
    titulo: "Transporte SCRN (aviso operativo)",
    asunto: "[SCRN] {titulo}",
    slotDefs: [
      { key: "saludo", label: SLOT_LABELS.saludo },
      { key: "footer", label: SLOT_LABELS.footer },
    ],
    slots: {
      saludo: "Hola equipo,",
      footer: "Notificación automática Transporte SCRN",
    },
    placeholders: ["titulo"],
    previewVars: { titulo: "{titulo}" },
  },
];

export function mailPlantillaSchemaKey(templateId, variantKey = "") {
  return `${templateId}::${variantKey || ""}`;
}

export function findMailPlantillaSchema(templateId, variantKey = "") {
  const exact = MAIL_PLANTILLA_SCHEMAS.find(
    (s) => s.templateId === templateId && s.variantKey === (variantKey || ""),
  );
  if (exact) return exact;
  // Fallback: variante base (antes de :)
  const base = String(variantKey || "").split(":")[0];
  if (base && base !== variantKey) {
    return MAIL_PLANTILLA_SCHEMAS.find(
      (s) => s.templateId === templateId && s.variantKey === base,
    ) || null;
  }
  return (
    MAIL_PLANTILLA_SCHEMAS.find(
      (s) => s.templateId === templateId && s.variantKey === "",
    ) || null
  );
}

/** Interpola `{clave}` con vars. No escapa HTML (los slots pueden traer markup permitido). */
export function interpolateMailText(template, vars = {}) {
  const src = String(template ?? "");
  return src.replace(/\{([a-z0-9_]+)\}/gi, (_, key) => {
    const v = vars[key];
    return v == null ? `{${key}}` : String(v);
  });
}

/**
 * Resuelve variant_key fina para convocatoria a partir de task/detalle.
 */
export function resolveConvocatoriaPlantillaVariant({
  variant,
  plantillaVariant,
  motivoId,
  motivoText,
  exclusionKind,
  inclusionKind,
} = {}) {
  if (plantillaVariant) return String(plantillaVariant);
  const v = String(variant || "INITIAL_BROADCAST").toUpperCase();
  if (v === "ALTA_ACCESO_PERSONAL") return "ALTA_ACCESO_PERSONAL";
  if (v === "INITIAL_BROADCAST") return "INITIAL_BROADCAST";
  if (v === "GIRA_ELIMINADA") return "GIRA_ELIMINADA";
  if (v === "SEATING_CAMBIO") return "SEATING_CAMBIO";
  if (v === "AUSENTE") return "AUSENTE";
  if (v === "ALTA") {
    if (inclusionKind === "mixto") return "ALTA:inclusion_mixta";
    if (inclusionKind === "ensamble") return "ALTA:inclusion_ensamble";
    if (inclusionKind === "familia") return "ALTA:inclusion_familia";
    return "ALTA";
  }
  if (v === "BAJA") {
    if (exclusionKind === "ensamble") return "BAJA:exclusion_ensamble";
    if (exclusionKind === "familia") return "BAJA:exclusion_familia";
    if (
      motivoId === "balance_orquestal" ||
      /balance\s*orquestal/i.test(String(motivoText || ""))
    ) {
      return "BAJA:balance";
    }
    return "BAJA";
  }
  return v;
}
