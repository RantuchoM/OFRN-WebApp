/**
 * Datos que bloquean la generación del expediente de documentación
 * (DJ + PDF full + mosaico). La constancia de CBU es opcional.
 */
export const EXPEDIENTE_REQUIRED_FIELDS = [
  { key: "domicilio", label: "Domicilio" },
  { key: "link_dni_img", label: "DNI" },
  { key: "link_cuil", label: "CUIL" },
  { key: "firma", label: "Firma" },
];

/**
 * Columnas de `integrantes` que se imprimen en la DJ o que se pegan
 * en el PDF full y en el mosaico. Un cambio en cualquiera rearma los tres.
 * La dirección de la sede vive en `locaciones`: cambiarla ahí no pasa por esta lista.
 */
export const EXPEDIENTE_SOURCE_FIELDS = [
  "nombre",
  "apellido",
  "dni",
  "cuil",
  "domicilio",
  "id_localidad",
  "id_loc_viaticos",
  "id_domicilio_laboral",
  "mail",
  "telefono",
  "condicion",
  "firma",
  "link_dni_img",
  "link_cuil",
  "link_cbu_img",
];

const SOURCE_KEYS = new Set(EXPEDIENTE_SOURCE_FIELDS);

export function affectsExpediente(field) {
  return SOURCE_KEYS.has(field);
}

const REQUIRED_KEYS = new Set(EXPEDIENTE_REQUIRED_FIELDS.map((f) => f.key));

export function isExpedienteFieldRequired(key) {
  return REQUIRED_KEYS.has(key);
}

export function isExpedienteFieldEmpty(person, key) {
  return !String(person?.[key] ?? "").trim();
}

/** @returns {string[]} etiquetas de lo que falta para armar el expediente */
export function missingExpedienteLabels(person) {
  return EXPEDIENTE_REQUIRED_FIELDS.filter((field) =>
    isExpedienteFieldEmpty(person, field.key),
  ).map((field) => field.label);
}
