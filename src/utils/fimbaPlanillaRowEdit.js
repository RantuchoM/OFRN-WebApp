/**
 * Helpers compartidos para edición de fila / planilla FIMBA
 * (Transportes + Agenda): borrador local + comparación antes de patch.
 */
import { decodeFimbaTrasladoDescripcion } from "../services/fimbaService";

export function sliceTimeInput(t) {
  if (!t) return "";
  return String(t).slice(0, 5);
}

/** id_locacion como string para inputs / LocationSelectWithCreate. */
export function draftLocacionId(ev) {
  const raw = ev?.id_locacion ?? ev?.locaciones?.id ?? null;
  return raw != null && raw !== "" ? String(raw) : "";
}

/**
 * Campos que `patchFimbaEventoPlanilla` puede persistir desde planilla/fila.
 * Agenda incluye `hora_fin` y conserva `destino` legacy en el encode.
 */
export const AGENDA_ROW_EDIT_FIELDS = [
  "fecha",
  "hora_inicio",
  "hora_fin",
  "actividad",
  "vuelo",
  "observaciones",
  "id_locacion",
  "destino",
];

/** Borrador de fila para edición inline (Agenda / Transportes). */
export function draftFromEvent(ev) {
  const decoded = decodeFimbaTrasladoDescripcion(ev?.descripcion, {
    observaciones_equipaje: ev?.observaciones_equipaje,
  });
  return {
    fecha: ev?.fecha || "",
    hora_inicio: sliceTimeInput(ev?.hora_inicio),
    hora_fin: sliceTimeInput(ev?.hora_fin),
    actividad: decoded.actividad || ev?.actividad || "",
    destino: decoded.destino || ev?.destino || "",
    vuelo: decoded.vuelo || ev?.vuelo || "",
    observaciones:
      ev?.observaciones_equipaje ||
      decoded.observaciones ||
      ev?.observaciones ||
      "",
    id_locacion: draftLocacionId(ev),
  };
}

export function agendaRowEditFieldsEqual(a, b) {
  return AGENDA_ROW_EDIT_FIELDS.every(
    (k) => String(a?.[k] ?? "") === String(b?.[k] ?? ""),
  );
}

/** ConfirmDialog (useConfirmDialog + secondaryAction) al salir de row-edit dirty. */
export const UNSAVED_INLINE_ROW_EDIT_CONFIRM = {
  title: "Cambios sin guardar",
  message:
    "Hay cambios sin guardar en la fila en edición. Guardá, descartá o quedate en la fila actual.",
  confirmText: "Guardar",
  cancelText: "Cancelar",
  secondaryAction: {
    label: "Descartar",
    value: "discard",
    className:
      "w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors",
  },
};

/**
 * Prompt Guardar / Cancelar / Descartar al abandonar una fila inline dirty.
 * @returns {Promise<boolean>} true si se puede continuar (saved o discarded).
 */
export async function resolveLeaveDirtyInlineRowEdit(confirm, { save, discard }) {
  const choice = await confirm(UNSAVED_INLINE_ROW_EDIT_CONFIRM);
  if (choice === "confirm" || choice === true) {
    return !!(await save());
  }
  if (choice === "discard" || choice === "secondary") {
    discard?.();
    return true;
  }
  return false;
}
