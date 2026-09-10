import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconAlertTriangle,
  IconCheck,
  IconLoader,
  IconMerge,
  IconSearch,
  IconX,
} from "../ui/Icons";
import { matchesMultiTokenSearch } from "../../utils/sanitize";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { mergeIntegrantes } from "../../services/mergeIntegrantes";
import { isProtectedIntegrante } from "../../utils/protectedIntegrantes";

function personLabel(p) {
  const apellido = String(p?.apellido || "").trim();
  const nombre = String(p?.nombre || "").trim();
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre || `(sin nombre)`;
}

function MergePersonPick({
  label,
  placeholder,
  options,
  value,
  onChange,
  colorClass,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const selected = options.find((o) => String(o.id) === String(value));

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (selected) setQuery(personLabel(selected));
    else if (value) setQuery(`#${value}`);
    else setQuery("");
  }, [selected, value]);

  const filtered = options.filter((item) =>
    matchesMultiTokenSearch(
      [item.apellido, item.nombre, item.dni, item.mail, String(item.id)],
      query,
    ),
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <label className={`text-[10px] font-bold uppercase mb-1 block ${colorClass}`}>
        {label}
      </label>
      <input
        type="text"
        className="w-full p-2 pr-8 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-violet-200"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (value) onChange("");
        }}
        onFocus={() => setIsOpen(true)}
      />
      <IconSearch
        size={14}
        className={`absolute right-2 top-8 pointer-events-none ${colorClass}`}
      />
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-[110]">
          {filtered.length > 0 ? (
            filtered.slice(0, 80).map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  onChange(String(opt.id));
                  setIsOpen(false);
                  setQuery(personLabel(opt));
                }}
                className="w-full text-left p-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
              >
                <span className="font-bold text-slate-800">{opt.apellido}</span>
                {opt.nombre ? `, ${opt.nombre}` : ""}
                <span className="text-[10px] text-slate-400 font-mono ml-1">
                  #{opt.id}
                </span>
                <div className="text-[10px] text-slate-500 truncate">
                  {[opt.instrumentos?.instrumento || opt.instrumento, opt.condicion, opt.dni]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-xs text-slate-400 text-center italic">
              Sin coincidencias
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MergeIntegrantesModal({
  isOpen,
  onClose,
  people,
  supabase,
  initialSourceId = "",
  initialTargetId = "",
  onMergeSuccess,
}) {
  const { confirm, alert, dialog } = useConfirmDialog();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [merging, setMerging] = useState(false);
  const [catalog, setCatalog] = useState(people || []);

  useEffect(() => {
    if (!isOpen) {
      setSourceId("");
      setTargetId("");
      setMerging(false);
      return;
    }
    setSourceId(initialSourceId ? String(initialSourceId) : "");
    setTargetId(initialTargetId ? String(initialTargetId) : "");
    setCatalog(people || []);
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("integrantes")
        .select(
          "id, apellido, nombre, condicion, dni, mail, instrumentos(instrumento)",
        )
        .order("apellido");
      if (!cancelled && !error && Array.isArray(data)) setCatalog(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialSourceId, initialTargetId, supabase]);

  const options = useMemo(
    () =>
      [...(catalog || [])]
        .filter((p) => p?.id != null)
        .sort((a, b) =>
          personLabel(a).localeCompare(personLabel(b), "es"),
        ),
    [catalog],
  );

  if (!isOpen) return null;

  const handleMerge = async () => {
    if (!sourceId || !targetId) {
      await alert({
        title: "Faltan personas",
        message: "Seleccioná el duplicado y el destino.",
      });
      return;
    }
    if (String(sourceId) === String(targetId)) {
      await alert({
        title: "Misma persona",
        message: "No podés fusionar una persona consigo misma.",
      });
      return;
    }

    const source = options.find((p) => String(p.id) === String(sourceId));
    const target = options.find((p) => String(p.id) === String(targetId));
    if (source && isProtectedIntegrante(source)) {
      await alert({
        title: "Cuenta protegida",
        message: "No se puede fusionar (borrar) una cuenta protegida.",
      });
      return;
    }

    if (
      !(await confirm({
        title: "Fusionar personas",
        message: `ESTA ACCIÓN ES IRREVERSIBLE.\n\nSe eliminará «${personLabel(source)}» (#${sourceId}) y toda su actividad (giras, horas, logística, habitaciones, seating, documentos) pasará a «${personLabel(target)}» (#${targetId}).\n\nLos datos vacíos del destino se completan con los del duplicado.\n\n¿Continuar?`,
        destructive: true,
        confirmText: "Fusionar",
        overlayClassName: "z-[110]",
      }))
    ) {
      return;
    }

    setMerging(true);
    try {
      const result = await mergeIntegrantes(supabase, sourceId, targetId);
      if (!result.ok) {
        await alert({
          title: "No se pudo fusionar",
          message: result.error,
        });
        return;
      }
      await alert({
        title: "Personas fusionadas",
        message: result.summary,
        confirmText: "Listo",
      });
      onMergeSuccess?.({ sourceId, targetId });
      onClose();
    } finally {
      setMerging(false);
    }
  };

  const modal = (
    <>
      {dialog}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <button
          type="button"
          className="absolute inset-0"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6 border border-slate-200 flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-black text-slate-800 text-lg uppercase flex items-center gap-2">
              <IconMerge className="text-violet-600" size={20} /> Fusionar
              personas
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <IconX size={20} />
            </button>
          </div>

          <div className="space-y-4 bg-violet-50 p-4 rounded-xl border border-violet-100 overflow-visible">
            <p className="text-xs text-violet-900 mb-2 flex gap-2">
              <IconAlertTriangle size={16} className="shrink-0" />
              Elegí el duplicado (se borra) y el destino (se conserva). Se
              combinan ficha, giras, logística, habitaciones, seating y el resto
              de la actividad.
            </p>

            <MergePersonPick
              label="1. Eliminar (duplicado)"
              placeholder="Buscar por apellido, nombre o DNI..."
              options={options.filter((p) => String(p.id) !== String(targetId))}
              value={sourceId}
              onChange={setSourceId}
              colorClass="text-red-600"
            />

            <div className="flex justify-center text-slate-300 font-bold text-xs py-1">
              ↓ SE FUSIONA EN ↓
            </div>

            <MergePersonPick
              label="2. Mantener (correcta)"
              placeholder="Buscar por apellido, nombre o DNI..."
              options={options.filter((p) => String(p.id) !== String(sourceId))}
              value={targetId}
              onChange={setTargetId}
              colorClass="text-emerald-700"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-bold min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleMerge}
              disabled={merging || !sourceId || !targetId}
              className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-bold shadow-sm flex items-center gap-2 min-h-[44px]"
            >
              {merging ? (
                <IconLoader className="animate-spin" size={14} />
              ) : (
                <IconCheck size={14} />
              )}
              {merging ? "Fusionando…" : "Confirmar fusión"}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
