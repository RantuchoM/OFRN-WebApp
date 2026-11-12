export const CONSTANCIAS_TIPOS_GIRA = ["Sinfónico", "Camerata Filarmónica"];

/** Tipos de documento persistidos (uno de cada por persona + gira). */
export const CONSTANCIA_TIPOS = {
  convocatoria: "convocatoria",
  participacion: "participacion",
};

/**
 * Modo UI: PDF de participación sin firma, sin solicitud.
 * No se guarda en `constancias_solicitudes`.
 */
export const CONSTANCIA_MODO_PARA_FIRMAR = "participacion_para_firmar";

export const CONSTANCIA_TIPO_LABEL = {
  convocatoria: "Constancia de convocatoria",
  participacion: "Constancia de participación realizada",
  [CONSTANCIA_MODO_PARA_FIRMAR]: "Participación (para firmar)",
};

/** Etiqueta corta para chips / filtros. */
export const CONSTANCIA_TIPO_LABEL_SHORT = {
  convocatoria: "Convocatoria",
  participacion: "Participación realizada",
  [CONSTANCIA_MODO_PARA_FIRMAR]: "Participación (para firmar)",
};

export const CONSTANCIA_ESTADOS = {
  pendiente: "pendiente",
  aprobada: "aprobada",
  denegada: "denegada",
};

export const CONSTANCIA_ESTADO_LABEL = {
  pendiente: "Pendiente de revisión",
  aprobada: "Aprobada",
  denegada: "Denegada",
};

/** Ciudad sede para el membrete de emisión. */
export const CONSTANCIA_CIUDAD_EMISION = "Viedma";

/** Destinatario operativo al crear una solicitud (+alias para filtro Gmail). */
export const CONSTANCIA_MAIL_OFICINA = "filarmonica.scrn+constancias@gmail.com";

/** Buzón de Archivo para modelos de revisión. */
export const CONSTANCIA_MAIL_MODELOS = "ofrn.archivo@gmail.com";
