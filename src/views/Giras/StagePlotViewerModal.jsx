import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconEye,
  IconFileText,
  IconLoader,
  IconPhoto,
  IconWhatsAppFilled,
  IconX,
} from "../../components/ui/Icons";
import { useGiraRoster } from "../../hooks/useGiraRosterQuery";
import {
  resolveStagePlotForEvent,
  listStagePlotsByPrograma,
  listStagePlotsLinkedToEvent,
} from "../../services/stagePlotService";
import {
  applyStagePlotStagePatch,
  normalizeStagePlotPayload,
} from "../../utils/stagePlotPayload";
import {
  exportStagePlotJpg,
  exportStagePlotPdf,
  shareStagePlotJpgViaWhatsApp,
} from "../../utils/stagePlotPdf";
import { isConfirmedConvocadoForSeatingReports } from "../../utils/seatingRosterGate";
import StagePlotOpacityControls, {
  opacitiesToStagePatch,
  readStagePlotOpacities,
} from "./StagePlotOpacityControls";
import StagePlotLivePreview from "./StagePlotLivePreview";
import { useStagePlotNarrowViewport } from "./StagePlotMobileEditor";

/**
 * Vista de solo lectura para técnicos: elige lienzo, 4 opacidades Lienzo,
 * preview en vivo + PDF/JPG/WhatsApp con las mismas opacidades.
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
  const [eventScoped, setEventScoped] = useState(false);
  const [payload, setPayload] = useState(() => normalizeStagePlotPayload(null));
  const [exporting, setExporting] = useState(false);
  const isNarrow = useStagePlotNarrowViewport();

  const programId =
    evento?.id_gira ?? gira?.id ?? evento?.programas?.id ?? null;
  const giraRefForRoster = gira || evento?.programas || { id: programId };
  const { roster } = useGiraRoster(supabase, open ? giraRefForRoster : null);
  const pdfRoster = useMemo(
    () => (roster || []).filter(isConfirmedConvocadoForSeatingReports),
    [roster],
  );

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
      let rows = list || [];
      let preferred = null;
      let reason = "default";
      let scoped = false;
      if (evento?.id) {
        const linked = await listStagePlotsLinkedToEvent(supabase, evento.id);
        if (cancelled) return;
        if (linked.error) {
          toast.error(linked.error.message || "No se pudieron cargar las plantas");
          setPlots([]);
          setLoading(false);
          return;
        }
        if (linked.data?.length) {
          rows = linked.data;
          preferred = linked.data[0];
          reason = "event_link";
          scoped = true;
        } else {
          const resolved = await resolveStagePlotForEvent(supabase, {
            ...evento,
            id_gira: programId,
          });
          if (!cancelled && resolved.data) {
            preferred = resolved.data;
            reason = resolved.reason;
          }
        }
      }
      if (!preferred && rows.length) preferred = rows[0];
      if (cancelled) return;
      setPlots(rows);
      setEventScoped(scoped);
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
        await exportStagePlotPdf(giraRef, payload, activeNombre, {
          roster: pdfRoster,
          groups: payload.groups,
        });
      } else if (kind === "whatsapp") {
        const mode = await shareStagePlotJpgViaWhatsApp(
          giraRef,
          payload,
          activeNombre,
        );
        if (mode === "shared") {
          toast.success("Listo para enviar por WhatsApp");
        } else if (mode === "downloaded-fallback") {
          toast.success(
            "Imagen descargada. Adjuntála en el chat de WhatsApp que se abrió.",
          );
        }
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

  const reasonLabel = eventScoped
    ? plots.length > 1
      ? "Plantas de este concierto"
      : "Planta de este concierto"
    : resolveReason === "bloque"
      ? "Por bloque de repertorio"
      : resolveReason === "default" && evento?.id
        ? "Lienzo por defecto de la gira"
        : null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4"
      style={{ zIndex: 100 }}
      role="dialog"
      aria-modal="true"
      aria-label="Ver escenario"
    >
      <div
        className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl ${
          isNarrow ? "max-w-lg" : "max-w-5xl"
        }`}
      >
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
              {plots.length > 1 && (
                <p className="text-[11px] font-medium text-slate-500">
                  Elegí la planta por nombre. PDF, JPG y WhatsApp exportan la que está marcada.
                </p>
              )}
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Plantas">
                {plots.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={p.id === activeId}
                    onClick={() => {
                      if (p.id === activeId) return;
                      setActiveId(p.id);
                      setPayload(normalizeStagePlotPayload(p.payload));
                    }}
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

              <StagePlotLivePreview
                payload={payload}
                contentKey={activeId}
                maxStagePx={isNarrow ? 720 : 1100}
                minHeightClass={
                  isNarrow
                    ? "min-h-[200px] h-[38vh]"
                    : "min-h-[320px] h-[min(52vh,560px)]"
                }
              />

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
                  Vista de solo lectura. La preview usa las opacidades de
                  abajo; PDF/JPG/WhatsApp exportan con las mismas.
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
            onClick={() => handleExport("whatsapp")}
            title="Descargar o compartir la imagen por WhatsApp"
            className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            <IconWhatsAppFilled size={14} /> WhatsApp
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
