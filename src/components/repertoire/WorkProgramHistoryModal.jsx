import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconCalendar,
  IconExternalLink,
  IconHistory,
  IconLoader,
  IconX,
} from "../ui/Icons";
import AppNavLink from "../ui/AppNavLink";
import {
  fetchDirectRepertorioAssignmentsForObra,
  fetchPlaceholderOpcionesForObra,
  fetchProgramIdsWithPlaceholders,
} from "../../services/repertorioPlaceholderOpciones";

function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function isModifiedNavClick(event) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

/**
 * Historial de programas/giras donde la obra está asignada (`repertorio_obras`).
 * Portal a document.body. Overlay por encima de WorkForm (`z-[9999]`) con `z-[10050]`.
 */
export default function WorkProgramHistoryModal({
  work,
  onClose,
  supabase,
  isEditor = false,
  overlayClassName = "z-[10050]",
  onNavigate = null,
}) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [opcionesSlots, setOpcionesSlots] = useState([]);
  const [programsWithPlaceholders, setProgramsWithPlaceholders] = useState(
    () => new Set(),
  );

  useEffect(() => {
    const fetchHistory = async () => {
      if (!work?.id) return;
      setLoading(true);
      try {
        const [rows, opciones] = await Promise.all([
          fetchDirectRepertorioAssignmentsForObra(supabase, work.id),
          isEditor
            ? fetchPlaceholderOpcionesForObra(supabase, work.id)
            : Promise.resolve([]),
        ]);
        const historyData = (rows || [])
          .map((item) => ({
            id: item.id,
            bloque: item.programas_repertorios?.nombre,
            gira: item.programas_repertorios?.programas,
          }))
          .filter((h) => h.gira);
        historyData.sort(
          (a, b) =>
            new Date(b.gira.fecha_desde || 0) - new Date(a.gira.fecha_desde || 0),
        );
        setHistory(historyData);
        setOpcionesSlots(opciones || []);

        const programIds = [
          ...new Set(
            [
              ...historyData.map((h) => h.gira?.id),
              ...(opciones || []).map(
                (o) => o.repertorio_obras?.programas_repertorios?.programas?.id,
              ),
            ].filter(Boolean),
          ),
        ];
        const withPh = await fetchProgramIdsWithPlaceholders(supabase, programIds);
        setProgramsWithPlaceholders(withPh);
      } catch (err) {
        console.error("Error history:", err);
        setHistory([]);
        setOpcionesSlots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [work?.id, supabase, isEditor]);

  useEffect(() => {
    if (!onClose) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleGoClick = (event) => {
    if (event.defaultPrevented || isModifiedNavClick(event)) return;
    onClose?.();
    onNavigate?.();
  };

  const empty = history.length === 0 && opcionesSlots.length === 0;

  return createPortal(
    <div
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <IconHistory className="text-indigo-600" /> Historial
            </h3>
            <div className="text-xs text-slate-500 line-clamp-1">
              {stripHtml(work?.titulo) || "Obra"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
            aria-label="Cerrar historial"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-8 text-indigo-500">
              <IconLoader className="animate-spin inline" />
            </div>
          ) : empty ? (
            <div className="text-center py-8 text-slate-400 italic text-sm">
              Esta obra no está asignada a ningún programa.
            </div>
          ) : (
            <div className="space-y-3">
              {isEditor && opcionesSlots.length > 0 && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase text-violet-800">
                    Opción en slots a definir
                  </div>
                  {opcionesSlots.map((op) => {
                    const slot = op.repertorio_obras;
                    const prog = slot?.programas_repertorios?.programas;
                    const bloque = slot?.programas_repertorios?.nombre;
                    return (
                      <div
                        key={op.id}
                        className="text-xs text-slate-700 bg-white/80 rounded border border-violet-100 px-2 py-1.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-violet-900">
                            {slot?.titulo_placeholder || "Slot a definir"}
                          </span>
                          {prog && (
                            <span className="text-slate-500">
                              {" "}
                              · {prog.nomenclador} {prog.nombre_gira}
                              {bloque ? ` (${bloque})` : ""}
                            </span>
                          )}
                        </div>
                        {prog?.id != null && (
                          <AppNavLink
                            mode="GIRAS"
                            view="REPERTOIRE"
                            giraId={prog.id}
                            onClick={handleGoClick}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
                            title="Ir al repertorio de esta gira"
                          >
                            <IconExternalLink size={11} /> Ir
                          </AppNavLink>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center gap-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase mb-0.5 flex flex-wrap items-center gap-1">
                      <span>
                        {item.gira.nomenclador} · {item.gira.mes_letra}
                        {item.gira.tipo && (
                          <span className="text-slate-500 font-medium ml-1">
                            · {item.gira.tipo}
                          </span>
                        )}
                      </span>
                      {programsWithPlaceholders.has(item.gira.id) && (
                        <span className="inline-flex items-center text-[8px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded border border-violet-200 font-semibold normal-case tracking-normal">
                          Tiene slots a definir
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {item.gira.nombre_gira}
                    </div>
                    {item.bloque && (
                      <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 inline-block px-1.5 rounded border border-slate-100">
                        Bloque: {item.bloque}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.gira.fecha_desde && (
                      <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                        <IconCalendar size={12} />{" "}
                        {format(new Date(item.gira.fecha_desde), "MMM yy", {
                          locale: es,
                        })}
                      </div>
                    )}
                    <AppNavLink
                      mode="GIRAS"
                      view="REPERTOIRE"
                      giraId={item.gira.id}
                      onClick={handleGoClick}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 opacity-80 group-hover:opacity-100 transition-opacity"
                      title="Ir al repertorio de esta gira"
                    >
                      <IconExternalLink size={12} /> Ir
                    </AppNavLink>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
