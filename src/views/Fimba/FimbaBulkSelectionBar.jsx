import React from "react";
import { createPortal } from "react-dom";
import { IconEdit, IconLoader, IconTrash, IconX } from "../../components/ui/Icons";

/**
 * Barra flotante bottom-left al tildar 1+ eventos (Agenda / Transportes).
 * Portal a document.body; z-80 (debajo de modales z-100).
 */
export default function FimbaBulkSelectionBar({
  count = 0,
  onEdit,
  onDelete,
  onClear,
  deleting = false,
}) {
  const n = Math.max(0, Number(count) || 0);
  if (n < 1) return null;

  return createPortal(
    <div
      className="fimba-bulk-selection-bar fimba-no-print"
      role="status"
      aria-live="polite"
    >
      <span className="fimba-bulk-selection-count">
        {n} seleccionado{n === 1 ? "" : "s"}
      </span>
      <div className="fimba-bulk-selection-actions">
        <button
          type="button"
          className="fimba-btn fimba-btn-primary fimba-bulk-selection-btn"
          onClick={onEdit}
          disabled={deleting}
        >
          <IconEdit size={14} /> Editar en lote
        </button>
        <button
          type="button"
          className="fimba-btn fimba-bulk-selection-btn fimba-bulk-selection-btn-danger"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? (
            <IconLoader size={14} className="animate-spin" />
          ) : (
            <IconTrash size={14} />
          )}
          {deleting ? "Eliminando…" : "Eliminar"}
        </button>
        <button
          type="button"
          className="fimba-btn fimba-btn-ghost fimba-bulk-selection-btn fimba-bulk-selection-clear"
          onClick={onClear}
          disabled={deleting}
          title="Limpiar selección"
          aria-label="Limpiar selección"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
