import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconEye,
  IconFileText,
  IconLoader,
  IconPhoto,
  IconX,
} from "../../components/ui/Icons";
import {
  resolveStagePlotForEvent,
  listStagePlotsByPrograma,
} from "../../services/stagePlotService";
import {
  applyStagePlotStagePatch,
  normalizeStagePlotPayload,
} from "../../utils/stagePlotPayload";
import {
  exportStagePlotJpg,
  exportStagePlotPdf,
} from "../../utils/stagePlotPdf";
import StagePlotOpacityControls, {
  opacitiesToStagePatch,
  readStagePlotOpacities,
} from "./StagePlotOpacityControls";

/**
 * Vista de solo lectura para técnicos: elige lienzo, 4 opacidades Lienzo, PDF/JPG.
 */
export default function StagePlotViewerModal({
  open,
  onClose,
  supabase,
  evento,
  gira,
}) {
  const [loading, setLoading] = useState(true);
  const [plots, setPlots] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [resolveReason, setResolveReason] = useState(null);
  const [payload, setPayload] = useState(() => normalizeStagePlotPayload(null));
  const [exporting, setExporting] = useState(false);

  const programId =
    evento?.id_gira ?? gira?.id ?? evento?.programas?.id ?? null;

  useEffect(() => {
    if (!open || !supabase || !programId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: list, error } = await listStagePlotsByPrograma(
        supabase,
        programId,
      );
      if (cancelled) return;
      if (error) {
        toast.error(error.message || "No se pudieron cargar los escenarios");
        setPlots([]);
        setLoading(false);
        return;
      }
      setPlots(list || []);

      let preferred = null;
      let reason = "default";
      if (evento?.id) {
        const resolved = await resolveStagePlotForEvent(supabase, {
          ...evento,
          id_gira: programId,
        });
        if (!cancelled && resolved.data) {
          preferred = resolved.data;
          reason = resolved.reason;
        }
      }
      if (!preferred && list?.length) preferred = list[0];
      if (cancelled) return;
      setResolveReason(reason);
      setActiveId(preferred?.id || null);
      setPayload(normalizeStagePlotPayload(preferred?.payload));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase, programId, evento?.id, evento?.id_repertorio]);

  useEffect(() => {
    if (!activeId) return;
    const plot = plots.find((p) => p.id === activeId);
    if (plot) setPayload(normalizeStagePlotPayload(plot.payload));
  }, [activeId, plots]);

  const stage = payload.stage || {};
  const op = readStagePlotOpacities(stage);

  const patchOp = (nextOp) => {
    setPayload((prev) =>
      applyStagePlotStagePatch(prev, opacitiesToStagePatch(nextOp)),
    );
  };

  const activeNombre = useMemo(() => {
    const p = plots.find((x) => x.id === activeId);
    return p?.nombre || "Escenario";
  }, [plots, activeId]);

  const handleExport = async (kind) => {
    setExporting(true);
    try {
      const giraRef = gira || evento?.programas || { id: programId };
      if (kind === "pdf") {
        await exportStagePlotPdf(giraRef, payload, activeNombre);
      } else {
        await exportStagePlotJpg(giraRef, payload, activeNombre);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo exportar");
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  const reasonLabel =
    resolveReason === "event_link"
      ? "Asociado a este evento"
      : resolveReason === "bloque"
        ? "Por bloque de repertorio"
        : resolveReason === "default"
          ? "Lienzo por defecto de la gira"
          : null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-4"
      style={{ zIndex: 100 }}
      role="dialog"
      aria-modal="true"
      aria-label="Ver escenario"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <IconEye size={18} className="text-indigo-600" />
              Ver escenario
            </h2>
            <p className="truncate text-xs text-slate-500">
              {gira?.nombre_gira ||
                evento?.programas?.nombre_gira ||
                "Gira"}
              {reasonLabel ? ` · ${reasonLabel}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <IconLoader className="animate-spin text-indigo-500" size={28} />
            </div>
          ) : plots.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Esta gira aún no tiene un plano de escenario.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {plots.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      p.id === activeId
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p.nombre?.trim() || `Lienzo ${idx + 1}`}
                  </button>
                ))}
              </div>

              <StagePlotOpacityControls
                value={op}
                onChange={patchOp}
                disabled={exporting}
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">{activeNombre}</p>
                <p className="mt-1">
                  {Math.round(stage.widthCm || 0)} ×{" "}
                  {Math.round(stage.heightCm || 0)} cm ·{" "}
                  {(payload.items || []).length} ítems ·{" "}
                  {(payload.formations || []).length} formaciones
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Vista de solo lectura. Descargá PDF o JPG con las opacidades
                  aplicadas (cuadrícula, radial, formaciones y recuadros).
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            disabled={exporting || !plots.length}
            onClick={() => handleExport("jpg")}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <IconPhoto size={14} /> JPG
          </button>
          <button
            type="button"
            disabled={exporting || !plots.length}
            onClick={() => handleExport("pdf")}
            className="inline-flex items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            <IconFileText size={14} /> PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
