import React, { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconHelpCircle, IconX } from "../ui/Icons";

/**
 * Tag "Borrador" + ? : solo para quien puede editar el programa
 * (editor/admin/curador, o coordinador de ensamble en sus programas).
 * Explica que no sale a agenda/difusión y ofrece pasarlo a Vigente.
 */
export default function ProgramBorradorHelpBadge({
  gira,
  supabase,
  canPromote = false,
  onPromoted,
  className = "",
  labelClassName = "border border-current px-1 rounded text-[9px] uppercase font-bold",
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Músicos / viewers: no mostrar ayuda ni CTA (queda el tag plano en el padre).
  if (!canPromote) return null;
  if (!gira || (gira.estado || "Borrador") !== "Borrador") return null;

  const label = compact ? "Bor" : "Borrador";

  const close = () => {
    if (!saving) setOpen(false);
  };

  const promoteToVigente = async () => {
    if (!canPromote || !supabase || !gira?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("programas")
        .update({ estado: "Vigente" })
        .eq("id", gira.id);
      if (error) throw error;
      toast.success("Programa pasado a Vigente");
      setOpen(false);
      if (typeof onPromoted === "function") await onPromoted(gira.id);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <span
        className={`inline-flex items-center gap-0.5 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={labelClassName}>{label}</span>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-white/70 transition-colors p-0.5"
          title="¿Qué significa Borrador?"
          aria-label="Ayuda sobre estado Borrador"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <IconHelpCircle size={compact ? 12 : 14} />
        </button>
      </span>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={close}
            role="presentation"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="borrador-help-title"
            >
              <div className="bg-slate-700 p-4 text-white flex justify-between items-center">
                <h3
                  id="borrador-help-title"
                  className="font-bold text-sm flex items-center gap-2"
                >
                  <IconHelpCircle size={18} />
                  Programa en borrador
                </h3>
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="hover:rotate-90 transition-transform disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <IconX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-3 text-sm text-slate-700">
                <p>
                  Este programa aún está en <strong>Borrador</strong>. Mientras
                  siga así, no aparecerá en la agenda ni estará disponible para
                  su difusión.
                </p>
                {gira.nombre_gira ? (
                  <p className="text-xs text-slate-500 truncate">
                    {gira.nombre_gira}
                  </p>
                ) : null}
              </div>

              <div className="px-5 pb-5 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={promoteToVigente}
                  disabled={saving}
                  className="px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Pasar a Vigente"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
