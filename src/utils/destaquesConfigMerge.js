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

export const hasOwnDestaqueValue = (row, field) =>
  row != null && row[field] !== null && row[field] !== undefined;

export const resolveDestaqueField = (localRow, generalRow, field) => {
  if (hasOwnDestaqueValue(localRow, field)) return localRow[field];
  const g = generalRow?.[field];
  return g !== null && g !== undefined ? g : 0;
};

/** Objeto listo para exportación / visualización (general + overrides locales). */
export const mergeDestaqueLocationConfig = (generalRow, localRow) => {
  const merged = { ...(localRow || {}) };
  DESTAQUES_MONETARY_FIELDS.forEach((field) => {
    merged[field] = resolveDestaqueField(localRow, generalRow, field);
  });
  return merged;
};
