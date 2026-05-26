/** Clave interna para la fila general (id_localidad IS NULL en BD). */
export const DESTAQUES_GENERAL_CONFIG_KEY = "__general__";

/** Gastos estimados + rendiciones editables en el panel masivo. */
export const DESTAQUES_MONETARY_FIELDS = [
  "gastos_movilidad",
  "gasto_combustible",
  "gasto_alojamiento",
  "gastos_capacit",
  "gastos_movil_otros",
  "gasto_otros",
  "rendicion_transporte_otros",
  "rendicion_gasto_combustible",
  "rendicion_gasto_alojamiento",
  "rendicion_gastos_capacit",
  "rendicion_gastos_movil_otros",
  "rendicion_gasto_otros",
  "rendicion_viatico_monto",
];

/** Logística física (checks + patentes / detalle) en panel masivo de destaques. */
export const DESTAQUES_LOGISTICS_FIELDS = [
  "check_aereo",
  "check_terrestre",
  "check_patente_oficial",
  "patente_oficial",
  "check_patente_particular",
  "patente_particular",
  "check_otros",
  "transporte_otros",
];

const LOGISTICS_BOOLEAN_FIELDS = new Set([
  "check_aereo",
  "check_terrestre",
  "check_patente_oficial",
  "check_patente_particular",
  "check_otros",
]);

export const hasOwnDestaqueValue = (row, field) =>
  row != null && row[field] !== null && row[field] !== undefined;

export const resolveDestaqueField = (localRow, generalRow, field) => {
  if (hasOwnDestaqueValue(localRow, field)) return localRow[field];
  const g = generalRow?.[field];
  return g !== null && g !== undefined ? g : 0;
};

export const resolveDestaqueLogisticsField = (localRow, generalRow, field) => {
  if (hasOwnDestaqueValue(localRow, field)) return localRow[field];
  const g = generalRow?.[field];
  if (g !== null && g !== undefined) return g;
  return LOGISTICS_BOOLEAN_FIELDS.has(field) ? false : "";
};

/** Objeto listo para exportación / visualización (general + overrides locales). */
export const mergeDestaqueLocationConfig = (generalRow, localRow) => {
  const merged = { ...(localRow || {}) };
  DESTAQUES_MONETARY_FIELDS.forEach((field) => {
    merged[field] = resolveDestaqueField(localRow, generalRow, field);
  });
  DESTAQUES_LOGISTICS_FIELDS.forEach((field) => {
    merged[field] = resolveDestaqueLogisticsField(localRow, generalRow, field);
  });
  return merged;
};
