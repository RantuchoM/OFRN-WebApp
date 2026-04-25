import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../services/supabase";
import { scrnTransporteColorFromEntity } from "./scrnTransporteColor";

const empty = {
  dimensiones_aprox: "",
  peso_kg: "",
  descripcion: "",
};

export default function EnviarPaqueteModal({
  isOpen,
  onClose,
  viaje,
  user,
  isAdmin = false,
  onSubmitted,
}) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm(empty);
    setError("");
  }, [isOpen, viaje?.id]);

  if (!isOpen || !viaje) return null;

  const t = viaje.scrn_transportes;
  const bodegaLlena = Boolean(viaje.paquetes_bodega_llena);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id || bodegaLlena) return;
    const dim = String(form.dimensiones_aprox || "").trim();
    const desc = String(form.descripcion || "").trim();
    const pesoN = parseFloat(String(form.peso_kg).replace(",", "."));
    if (!dim || !desc || Number.isNaN(pesoN) || pesoN <= 0) {
      setError("Completá dimensiones, peso (mayor a 0) y descripción.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      id_usuario: user.id,
      id_transporte: Number(viaje.id_transporte),
      id_viaje: Number(viaje.id),
      dimensiones_aprox: dim,
      peso_kg: pesoN,
      descripcion: desc,
      estado: isAdmin ? "aceptada" : "pendiente",
    };
    const { error: upErr } = await supabase.from("scrn_solicitudes_paquete").insert(payload);
    setSaving(false);
    if (upErr) {
      setError(upErr.message || "No se pudo guardar el envío.");
      return;
    }
    onSubmitted?.();
    onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-extrabold text-slate-800">Enviar un paquete</h3>
          <p className="text-xs text-slate-500">
            {viaje.origen} — {viaje.destino_final}
          </p>
          {t ? (
            <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
              <span
                className="inline-block h-3.5 w-3.5 rounded border border-slate-300 shrink-0"
                style={{ backgroundColor: scrnTransporteColorFromEntity(t) }}
                aria-hidden
              />
              <span>
                <span className="font-semibold text-slate-700">Transporte:</span> {t.nombre}
                {t.tipo ? ` · ${t.tipo}` : ""}
              </span>
            </p>
          ) : null}
          {bodegaLlena ? (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/90 rounded-lg px-2 py-1.5 mt-2">
              La bodega de paquetería está marcada como llena para este recorrido. No se pueden
              enviar nuevas solicitudes hasta que un administrador lo indique otra vez.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">
              {isAdmin
                ? "Completá los datos. Como admin, se registra directamente como aceptado."
                : "Completá los datos. Un administrador revisará y aceptará o rechazará el envío."}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Dimensiones aproximadas
            </label>
            <input
              required
              value={form.dimensiones_aprox}
              onChange={(e) => setForm((p) => ({ ...p, dimensiones_aprox: e.target.value }))}
              placeholder='Ej. 40 × 30 × 20 cm, o "caja chica"'
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={bodegaLlena}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Peso (kg)
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={form.peso_kg}
              onChange={(e) => setForm((p) => ({ ...p, peso_kg: e.target.value }))}
              placeholder="Ej. 2.5"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={bodegaLlena}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
              Descripción del contenido
            </label>
            <textarea
              required
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              rows={4}
              placeholder="Qué contiene, fragilidad, destinatario, etc."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-24"
              disabled={bodegaLlena}
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold uppercase text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || bodegaLlena}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold uppercase"
            >
              {saving ? "Guardando…" : isAdmin ? "Guardar envío" : "Solicitar envío"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
