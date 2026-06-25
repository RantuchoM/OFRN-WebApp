export const BAJA_MOTIVO_OPCIONES = [
  { id: "balance_orquestal", label: "Balance Orquestal" },
  { id: "razones_personales", label: "Razones personales" },
  { id: "enfermedad", label: "Enfermedad" },
  { id: "otro", label: "Otro" },
];

export const BAJA_MOTIVO_BALANCE_ORQUESTAL_ID = "balance_orquestal";

export const BALANCE_ORQUESTAL_MAIL_FOOTNOTE =
  "Desde la dirección artística se hicieron ajustes en el seating, por lo tanto se te informa que quedás desafectado de tu fila en esta gira. No obstante, si llegáramos a requerir de sus servicios (por enfermedad de algún/a colega u otra razón) te la haremos saber a la mayor brevedad posible.";

export function resolveBajaMotivoText(selectedId, otroText) {
  if (!selectedId) return "";
  if (selectedId === "otro") return String(otroText || "").trim();
  return BAJA_MOTIVO_OPCIONES.find((o) => o.id === selectedId)?.label || "";
}

export function isBalanceOrquestalMotivo(motivoId, motivoText) {
  if (motivoId === BAJA_MOTIVO_BALANCE_ORQUESTAL_ID) return true;
  return /balance\s*orquestal/i.test(String(motivoText || "").trim());
}

function buildMailNotification({ motivoText, motivoId, reason }) {
  const reasonFootnote = isBalanceOrquestalMotivo(motivoId, motivoText)
    ? BALANCE_ORQUESTAL_MAIL_FOOTNOTE
    : "";
  return { reason, reasonFootnote, motivoBajaId: motivoId || null };
}

export function buildAusenteMailNotification({ motivoText, motivoId }) {
  return buildMailNotification({
    motivoText,
    motivoId,
    reason: `Se te marcó como ausente. Motivo: ${motivoText}`,
  });
}

export function buildBajaGiraMailNotification({ motivoText, motivoId }) {
  return buildMailNotification({
    motivoText,
    motivoId,
    reason: `Baja de la gira. Motivo: ${motivoText}`,
  });
}

export function buildExclusionEnsambleMailNotification({
  motivoText,
  motivoId,
  ensLabel,
}) {
  const ensamblePart = ensLabel
    ? `Se excluyó al ensamble ${ensLabel}`
    : "Se te excluyó de la gira";
  return buildMailNotification({
    motivoText,
    motivoId,
    reason: `${ensamblePart}. Motivo: ${motivoText}`,
  });
}
