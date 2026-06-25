/**
 * Paleta y clases Tailwind unificadas para estados de obra (`obras.estado`).
 * Consumidores: RepertoireView, RepertoireManager, RepertoireWorkPickerModal, WorkForm.
 */

export function normalizeObraEstado(estado) {
  return estado || "Oficial";
}

function pick(map, estado, fallback) {
  return map[normalizeObraEstado(estado)] ?? fallback;
}

/** Grilla desktop del Archivo (RepertoireView). */
export function getObraEstadoArchiveRowClass(estado) {
  return pick(
    {
      Informativo: "bg-blue-50/40 hover:bg-blue-50/65",
      Solicitud: "bg-amber-50/40 hover:bg-amber-50/65",
      "Para arreglar":
        "bg-orange-100/50 hover:bg-orange-100/75 border-l-[3px] border-orange-500/70",
      Entregado:
        "bg-sky-50/45 hover:bg-sky-50/75 border-l-[3px] border-sky-300/60",
      Oficial: "bg-emerald-50/35 hover:bg-emerald-50/55",
      Pendiente: "bg-slate-50/45 hover:bg-slate-100/70",
    },
    estado,
    "bg-slate-50/35 hover:bg-slate-50/55",
  );
}

/** Tarjeta móvil del Archivo (RepertoireView). */
export function getObraEstadoArchiveMobileCardClass(estado) {
  return pick(
    {
      Informativo: "bg-blue-50/75 hover:bg-blue-50",
      Solicitud: "bg-amber-50/75 hover:bg-amber-50",
      "Para arreglar":
        "bg-orange-100/80 hover:bg-orange-100 border-l-[3px] border-orange-500/80",
      Entregado:
        "bg-sky-50/80 hover:bg-sky-50 border-l-[3px] border-sky-300/70",
      Oficial: "bg-emerald-50/70 hover:bg-emerald-50",
      Pendiente: "bg-slate-100/75 hover:bg-slate-100",
    },
    estado,
    "bg-slate-50/75 hover:bg-slate-100",
  );
}

/** Filas del picker de obras (RepertoireWorkPickerModal). */
export function getObraEstadoPickerRowClass(estado) {
  return getObraEstadoArchiveRowClass(estado);
}

/**
 * Tarjeta móvil con barra lateral (RepertoireManager, RepertoireWorkPickerModal).
 * @returns {{ borderClass: string, cardBorderClass: string }}
 */
export function getObraEstadoMobileCardStyles(estado) {
  const key = normalizeObraEstado(estado);
  const map = {
    Informativo: {
      borderClass: "bg-blue-500",
      cardBorderClass: "border-blue-400 bg-blue-50/50",
    },
    Solicitud: {
      borderClass: "bg-amber-500",
      cardBorderClass: "border-amber-300 bg-amber-50/50",
    },
    "Para arreglar": {
      borderClass: "bg-orange-600",
      cardBorderClass: "border-orange-400 bg-orange-100/60",
    },
    Entregado: {
      borderClass: "bg-sky-500",
      cardBorderClass: "border-sky-300 bg-sky-50/50",
    },
    Oficial: {
      borderClass: "bg-emerald-500",
      cardBorderClass: "border-emerald-300 bg-emerald-50/60",
    },
    Pendiente: {
      borderClass: "bg-slate-400",
      cardBorderClass: "border-slate-200 bg-slate-50/50",
    },
  };
  return (
    map[key] ?? {
      borderClass: "bg-slate-300",
      cardBorderClass: "border-slate-200",
    }
  );
}

/** Fila desktop del repertorio de programa (RepertoireManager). */
export function getObraEstadoProgramRowClass(estado) {
  const key = normalizeObraEstado(estado);
  const map = {
    Informativo: "bg-blue-50 hover:bg-blue-100 border-l-2 border-blue-400",
    "Para arreglar":
      "bg-orange-100/70 hover:bg-orange-100 border-l-2 border-orange-600",
    Solicitud: "bg-amber-50 hover:bg-amber-100 border-l-2 border-amber-400",
    Pendiente: "bg-amber-50 hover:bg-amber-100 border-l-2 border-amber-400",
    Entregado: "bg-sky-50 hover:bg-sky-100 border-l-2 border-sky-400",
    Oficial: "bg-emerald-50 hover:bg-emerald-100 border-l-2 border-emerald-400",
  };
  return map[key] ?? "bg-amber-50 hover:bg-amber-100";
}

/** Chip de columna Estado en RepertoireView (solo clases de color; el texto puede variar). */
export function getObraEstadoBadgeClass(estado) {
  return pick(
    {
      Solicitud: "bg-amber-100 text-amber-700 border-amber-200",
      "Para arreglar": "bg-orange-200 text-orange-900 border-orange-400",
      Entregado: "bg-sky-100 text-sky-800 border-sky-200",
      Informativo: "bg-blue-50 text-blue-600 border-blue-200",
      Oficial: "bg-slate-100 text-slate-500 border-slate-200",
      Pendiente: "bg-slate-100 text-slate-500 border-slate-200",
    },
    estado,
    "bg-slate-100 text-slate-500 border-slate-200",
  );
}

const TITLE_TAG_BASE = {
  Informativo:
    "bg-blue-100 text-blue-600 border-blue-200",
  Solicitud:
    "bg-amber-100 text-amber-700 border-amber-200",
  Pendiente:
    "bg-amber-100 text-amber-700 border-amber-200",
  "Para arreglar":
    "bg-orange-200 text-orange-900 border-orange-400 font-semibold",
};

const TITLE_TAG_LABELS = {
  Informativo: "INFO",
  Solicitud: "PEND",
  Pendiente: "PEND",
  "Para arreglar": "Para arr.",
};

/**
 * Tag inline junto al título de la obra.
 * @param {"compact"|"mobile"} variant — compact: RepertoireManager; mobile: pill en Archivo móvil
 * @returns {{ label: string, className: string } | null}
 */
export function getObraEstadoTitleTag(estado, { variant = "compact" } = {}) {
  const key = estado || "";
  if (!TITLE_TAG_LABELS[key]) return null;

  const color = TITLE_TAG_BASE[key];
  if (variant === "mobile" && key === "Para arreglar") {
    return {
      label: "Para arreglar",
      className: `shrink-0 text-[8px] ${color} px-1.5 py-0.5 rounded-full font-bold border uppercase tracking-wide`,
    };
  }

  return {
    label: TITLE_TAG_LABELS[key],
    className: `text-[8px] ${color} px-1 rounded border align-text-top`,
  };
}

/** Barra superior de WorkForm según estado. */
export function getObraEstadoFormHeaderClass(estado) {
  const map = {
    Borrador: "bg-slate-500",
    Solicitud: "bg-amber-600",
    Pendiente: "bg-slate-600",
    "Para arreglar": "bg-amber-700",
    Entregado: "bg-sky-600",
    Informativo: "bg-blue-600",
    Oficial: "bg-emerald-600",
  };
  return map[estado] ?? "bg-slate-600";
}

/** Fondo/borde del bloque WorkForm según estado. */
export function getObraEstadoFormShellClass(estado) {
  const map = {
    Borrador: "bg-slate-100/95 border-slate-300/90",
    Solicitud: "bg-amber-50/85 border-amber-200/80",
    Pendiente: "bg-slate-50/90 border-slate-200/80",
    "Para arreglar": "bg-orange-50/85 border-orange-200/80",
    Entregado: "bg-sky-50/85 border-sky-200/80",
    Informativo: "bg-blue-50/85 border-blue-200/80",
    Oficial: "bg-emerald-50/90 border-emerald-200/80",
  };
  return map[estado] ?? "bg-white border-slate-200";
}
