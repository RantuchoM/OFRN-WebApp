import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconLoader, IconX } from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";
import DateInput from "../ui/DateInput";

const TIPOS = [
  { id: "cambio_menor", label: "Cambio menor" },
  { id: "correccion", label: "Corrección" },
  { id: "parte_alternativa", label: "Parte alternativa" },
];

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export default function ArregloAjusteSolicitarModal({
  isOpen,
  onClose,
  obrasOptions,
  integrantesArregladorOptions,
  defaultArregladorId,
  defaultObraId = null,
  solicitanteLabel,
  saving,
  onSubmit,
}) {
  const [obraId, setObraId] = useState(defaultObraId);
  const [tipo, setTipo] = useState("cambio_menor");
  const [brief, setBrief] = useState("");
  const [partesAfectadas, setPartesAfectadas] = useState("");
  const [fechaEsperada, setFechaEsperada] = useState("");
  const [arregladorId, setArregladorId] = useState(defaultArregladorId || null);

  useEffect(() => {
    if (!isOpen) return;
    setObraId(defaultObraId);
    setTipo("cambio_menor");
    setBrief("");
    setPartesAfectadas("");
    setFechaEsperada("");
    setArregladorId(defaultArregladorId || null);
  }, [isOpen, defaultObraId, defaultArregladorId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    onSubmit?.({
      id_obra: obraId,
      tipo,
      brief: brief.trim(),
      partes_afectadas: partesAfectadas.trim(),
      fecha_esperada: fechaEsperada || null,
      id_integrante_arreglador: arregladorId,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajuste-solicitar-title"
      >
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h3 id="ajuste-solicitar-title" className="text-sm font-bold text-slate-800">
              Solicitar ajuste
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pedido menor sobre una obra ya entregada/oficial. No crea un arreglo nuevo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 overflow-y-auto">
          {solicitanteLabel ? (
            <p className="text-[11px] text-slate-500">
              Solicitado por: <span className="font-semibold text-slate-700">{solicitanteLabel}</span>
            </p>
          ) : null}

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Obra madre
            </label>
            <SearchableSelect
              options={obrasOptions}
              value={obraId}
              onChange={setObraId}
              placeholder="Buscar obra Entregado/Oficial…"
              disabled={!!defaultObraId || saving}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={saving}
              className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2"
            >
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Brief
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              disabled={saving}
              placeholder="Qué hay que ajustar…"
              className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2 resize-y min-h-[4rem]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
              Partes afectadas (opcional)
            </label>
            <input
              type="text"
              value={partesAfectadas}
              onChange={(e) => setPartesAfectadas(e.target.value)}
              disabled={saving}
              placeholder="Ej. Flauta 1, Clarinete en A"
              className="w-full text-sm border border-slate-300 rounded-lg px-2.5 py-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Fecha estimada
              </label>
                              <DateInput
                value={fechaEsperada}
                onChange={setFechaEsperada}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Arreglador
              </label>
              <SearchableSelect
                options={integrantesArregladorOptions}
                value={arregladorId}
                onChange={setArregladorId}
                placeholder="Asignar…"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !obraId || !arregladorId}
            className="px-3 py-2 text-sm rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-40 inline-flex items-center gap-2"
          >
            {saving ? <IconLoader size={14} className="animate-spin" /> : null}
            Crear y notificar
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

export { stripHtml as stripHtmlAjuste };
