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

export function buildPresenteMailNotification() {
  return {
    reason: "Habías solicitado ser cubierto/a pero ya no es necesario.",
    reasonFootnote: "",
    motivoBajaId: null,
    /** Reemplaza el párrafo estándar de ALTA en mails_produccion. */
    altaLead:
      "Volviste a ser dado/a de <strong>alta</strong> en la gira <strong>{gira}</strong> ({nomenclador}).",
  };
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

/** Asunto AUSENTE: Ausencia en gira | {motivo} | {gira} */
export function buildAusenteMailAsunto({ motivoText, giraNombre }) {
  const m = String(motivoText || "").trim();
  const g = String(giraNombre || "").trim();
  if (m && g) return `Ausencia en gira | ${m} | ${g}`;
  if (g) return `Ausencia en gira | ${g}`;
  return "Ausencia en gira";
}

/**
 * Asunto BAJA.
 * Balance: Baja de gira por balance orquestal | {gira}
 * Exclusión ensamble: Baja en la gira | Se excluyó al ensamble | {gira}
 * Genérico (catálogo editado): Ausencia en gira | Motivo: {motivo} | {gira}
 * Con suffix (restituir): Baja de gira | {suffix} | {gira}
 */
export function buildBajaMailAsunto({
  motivoText,
  motivoId,
  giraNombre,
  exclusionKind = null,
  suffix = "",
} = {}) {
  const g = String(giraNombre || "").trim();
  const m = String(motivoText || "").trim();
  const s = String(suffix || "").trim();
  if (exclusionKind === "ensamble") {
    return g
      ? `Baja en la gira | Se excluyó al ensamble | ${g}`
      : "Baja en la gira | Se excluyó al ensamble";
  }
  if (exclusionKind === "familia") {
    return g
      ? `Baja en la gira | Se excluyó la familia | ${g}`
      : "Baja en la gira | Se excluyó la familia";
  }
  if (s) {
    return g ? `Baja de gira | ${s} | ${g}` : `Baja de gira | ${s}`;
  }
  if (isBalanceOrquestalMotivo(motivoId, motivoText)) {
    return g
      ? `Baja de gira por balance orquestal | ${g}`
      : "Baja de gira por balance orquestal";
  }
  if (m && g) return `Ausencia en gira | Motivo: ${m} | ${g}`;
  if (g) return `Baja de gira | ${g}`;
  return "Baja de gira";
}

export function buildAltaMailAsunto({
  giraNombre,
  suffix = "",
} = {}) {
  const g = String(giraNombre || "").trim();
  const s = String(suffix || "").trim();
  if (s && g) return `Alta en gira | ${s} | ${g}`;
  if (g) return `Alta en gira | ${g}`;
  return "Alta en gira";
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

export function buildExclusionFamiliaMailNotification({
  motivoText,
  motivoId,
  familiaLabel,
}) {
  const familiaPart = familiaLabel
    ? `Se excluyó la familia de ${familiaLabel}`
    : "Se te excluyó de la gira";
  return buildMailNotification({
    motivoText,
    motivoId,
    reason: `${familiaPart}. Motivo: ${motivoText}`,
  });
}

export function buildInclusionFamiliaMailNotification({ familiaLabel }) {
  const reason = familiaLabel
    ? `Se te convoca con la familia de ${familiaLabel}`
    : "Se te convoca a la gira";
  return { reason, reasonFootnote: "", motivoBajaId: null };
}

export function buildInclusionEnsambleMailNotification({ ensambleLabel }) {
  const reason = ensambleLabel
    ? `Se te convoca con el ensamble ${ensambleLabel}`
    : "Se te convoca a la gira";
  return { reason, reasonFootnote: "", motivoBajaId: null };
}

export function buildInclusionGrupalMailNotification(person) {
  const ensamble = person?.ensambleLabel || "";
  const familia = person?.familiaLabel || "";
  if (person?.causeKind === "mixto" && ensamble && familia) {
    return {
      reason: `Se te convoca con el ensamble ${ensamble} y la familia de ${familia}`,
      reasonFootnote: "",
      motivoBajaId: null,
    };
  }
  if (person?.causeKind === "ensamble" || (ensamble && !familia)) {
    return buildInclusionEnsambleMailNotification({
      ensambleLabel: ensamble || person?.causeLabel,
    });
  }
  return buildInclusionFamiliaMailNotification({
    familiaLabel: familia || person?.causeLabel,
  });
}

/** Alta del cubridor al asignar cobertura. */
export function buildCoberturaAltaCubreMail({ titularLabel = "" } = {}) {
  const who = String(titularLabel || "").trim();
  return {
    reason: who
      ? `Se te convoca para cubrir a ${who} en esta gira`
      : "Se te convoca en cobertura de esta gira",
    reasonFootnote: "",
    motivoBajaId: null,
  };
}

/** Baja del cubridor al cambiar/retirar cobertura. */
export function buildCoberturaFinCubreMail({ titularLabel = "" } = {}) {
  const who = String(titularLabel || "").trim();
  return {
    reason: who ? `Fin de cobertura de ${who}.` : "Fin de cobertura",
    reasonFootnote: "",
    motivoBajaId: null,
  };
}

/** Titular restituido tras cobertura (opción Restituir). */
export function buildCoberturaRestituirTitularMail({ coverLabel = "" } = {}) {
  const who = String(coverLabel || "").trim();
  return {
    reason: who
      ? `Se te restituye en la gira. Quedás nuevamente convocado/a como presente; ${who} deja de cubrirte y sale de la nómina.`
      : "Se te restituye en la gira. Quedás nuevamente convocado/a como presente; quien te cubría deja de participar.",
    reasonFootnote: "",
    motivoBajaId: null,
    asuntoSuffix: "Anulación de cobertura",
  };
}

/** Quien cubría, al restituir al titular. */
export function buildCoberturaRestituirCubreMail({ titularLabel = "" } = {}) {
  const who = String(titularLabel || "").trim();
  return {
    reason: who
      ? `Finalizó tu cobertura en esta gira. ${who} vuelve a la nómina; ya no se requiere tu participación.`
      : "Finalizó tu cobertura en esta gira. La persona a la que cubrías vuelve a la nómina; ya no se requiere tu participación.",
    reasonFootnote: "",
    motivoBajaId: null,
    asuntoSuffix: "Anulación de cobertura",
  };
}

/** Titular ausente con cobertura: baja de ambos (no se requiere el servicio). */
export function buildCoberturaBajaAmbosTitularMail({ coverLabel = "" } = {}) {
  const who = String(coverLabel || "").trim();
  return {
    reason: who
      ? `Baja de la gira: no se requiere tu participación en este servicio. ${who}, quien te cubría, también queda desafectado/a.`
      : "Baja de la gira: no se requiere tu participación en este servicio. Quien te cubría también queda desafectado/a.",
    reasonFootnote: "",
    motivoBajaId: null,
  };
}

/** Quien cubría, cuando se da de baja al titular y a la cobertura. */
export function buildCoberturaBajaAmbosCubreMail({ titularLabel = "" } = {}) {
  const who = String(titularLabel || "").trim();
  return {
    reason: who
      ? `Baja de la gira: la cobertura deja de ser necesaria porque tampoco se convoca a ${who}.`
      : "Baja de la gira: la cobertura deja de ser necesaria porque tampoco se convoca a quien cubrías.",
    reasonFootnote: "",
    motivoBajaId: null,
  };
}

/**
 * Catálogo de plantillas de mail de roster/cobertura (para docs y revisión).
 * `reason` puede incluir placeholders entre {llaves}.
 */
export const GIRA_ROSTER_MAIL_TEMPLATES = [
  {
    id: "alta_individual",
    variant: "ALTA",
    titulo: "Alta individual / convocatoria",
    reason: "Se te convoca individualmente",
  },
  {
    id: "alta_titular_vacante",
    variant: "ALTA",
    titulo: "Asignación como titular (vacante)",
    reason: "Se te asignó en forma individual.",
  },
  {
    id: "presente",
    variant: "ALTA",
    titulo: "Ausente → presente",
    reason: "Habías solicitado ser cubierto/a pero ya no es necesario.",
  },
  {
    id: "ausente",
    variant: "AUSENTE",
    titulo: "Marcar ausente",
    reason: "Se te marcó como ausente. Motivo: {motivo}",
  },
  {
    id: "baja_gira",
    variant: "BAJA",
    titulo: "Baja / desconvocatoria",
    reason: "Baja de la gira. Motivo: {motivo}",
  },
  {
    id: "exclusion_ensamble",
    variant: "BAJA",
    titulo: "Exclusión de ensamble",
    reason: "Se excluyó al ensamble {ensamble}. Motivo: {motivo}",
  },
  {
    id: "exclusion_familia",
    variant: "BAJA",
    titulo: "Exclusión de familia",
    reason: "Se excluyó la familia de {familia}. Motivo: {motivo}",
  },
  {
    id: "inclusion_ensamble",
    variant: "ALTA",
    titulo: "Inclusión de ensamble",
    reason: "Se te convoca con el ensamble {ensamble}",
  },
  {
    id: "inclusion_familia",
    variant: "ALTA",
    titulo: "Inclusión de familia",
    reason: "Se te convoca con la familia de {familia}",
  },
  {
    id: "inclusion_mixta",
    variant: "ALTA",
    titulo: "Inclusión ensamble + familia",
    reason:
      "Se te convoca con el ensamble {ensamble} y la familia de {familia}",
  },
  {
    id: "cobertura_alta_cubre",
    variant: "ALTA",
    titulo: "Alta por cobertura (quien cubre)",
    reason: buildCoberturaAltaCubreMail({ titularLabel: "{titular}" }).reason,
  },
  {
    id: "cobertura_baja_cubre_cambio",
    variant: "BAJA",
    titulo: "Fin de cobertura (cambio o retiro del cubridor)",
    reason: buildCoberturaFinCubreMail({ titularLabel: "{titular}" }).reason,
  },
  {
    id: "cobertura_restituir_titular",
    variant: "ALTA",
    titulo: "Restituir titular tras cobertura",
    reason: buildCoberturaRestituirTitularMail({
      coverLabel: "{quien_cubre}",
    }).reason,
  },
  {
    id: "cobertura_restituir_cubre",
    variant: "BAJA",
    titulo: "Baja del cubridor al restituir titular",
    reason: buildCoberturaRestituirCubreMail({
      titularLabel: "{titular}",
    }).reason,
  },
  {
    id: "cobertura_baja_ambos_titular",
    variant: "BAJA",
    titulo: "Baja de ambos — titular",
    reason: buildCoberturaBajaAmbosTitularMail({
      coverLabel: "{quien_cubre}",
    }).reason,
  },
  {
    id: "cobertura_baja_ambos_cubre",
    variant: "BAJA",
    titulo: "Baja de ambos — quien cubre",
    reason: buildCoberturaBajaAmbosCubreMail({
      titularLabel: "{titular}",
    }).reason,
  },
  {
    id: "balance_orquestal_footnote",
    variant: "BAJA",
    titulo: "Nota al pie (motivo Balance orquestal)",
    reason: BALANCE_ORQUESTAL_MAIL_FOOTNOTE,
    esNotaAlPie: true,
  },
];
