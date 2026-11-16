import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconDownload,
  IconLoader,
  IconUpload,
  IconX,
} from "../../components/ui/Icons";
import {
  importStagePlotIntoPrograma,
  listProgramasWithStagePlots,
  listStagePlotsByPrograma,
} from "../../services/stagePlotService";
import {
  buildStagePlotTransferDocument,
  downloadStagePlotTransferFile,
  readStagePlotTransferFile,
} from "../../utils/stagePlotTransfer";

/**
 * Importar Escenario: archivo JSON, otra gira, u otro lienzo de esta gira.
 */
export default function StagePlotImportModal({
  open,
  onClose,
  supabase,
  targetProgram,
  onImported,
  /** Plot activo: se excluye al importar desde la misma gira. */
  excludePlotId = null,
  /** Export del plot activo (opcional, pestaña Exportar). */
  exportDoc = null,
}) {
  const [tab, setTab] = useState("file"); // file | gira | export
  const [busy, setBusy] = useState(false);
  const [giras, setGiras] = useState([]);
  const [sourceProgramId, setSourceProgramId] = useState("");
  const [sourcePlots, setSourcePlots] = useState([]);
  const [sourcePlotId, setSourcePlotId] = useState("");
  const fileRef = useRef(null);

  const targetProgramId = Number(targetProgram?.id);
  const isSameGira =
    Number.isFinite(targetProgramId) &&
    Number(sourceProgramId) === targetProgramId;

  useEffect(() => {
    if (!open || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      // Incluye la gira actual (para clonar otro lienzo de la misma gira).
      const { data, error } = await listProgramasWithStagePlots(supabase);
      if (cancelled) return;
      if (error) {
        console.error(error);
        setGiras([]);
        return;
      }
      const tid = Number(targetProgram?.id);
      let list = [...(data || [])];
      if (Number.isFinite(tid)) {
        const idx = list.findIndex((g) => Number(g.id) === tid);
        if (idx > 0) {
          const [cur] = list.splice(idx, 1);
          list.unshift(cur);
        } else if (idx < 0) {
          list.unshift({
            id: tid,
            nombre_gira: targetProgram?.nombre_gira || `Gira ${tid}`,
            nomenclador: targetProgram?.nomenclador || null,
            mes_letra: targetProgram?.mes_letra || null,
            fecha_desde: targetProgram?.fecha_desde || null,
          });
        }
      }
      setGiras(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase, targetProgram]);

  useEffect(() => {
    if (!open || !supabase || !sourceProgramId) {
      setSourcePlots([]);
      setSourcePlotId("");
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await listStagePlotsByPrograma(
        supabase,
        sourceProgramId,
      );
      if (cancelled) return;
      if (error) {
        toast.error(error.message || "No se pudieron listar lienzos");
        setSourcePlots([]);
        return;
      }
      const tid = Number(targetProgram?.id);
      const sameGira =
        Number.isFinite(tid) && Number(sourceProgramId) === tid;
      const plots = (data || []).filter(
        (p) => !(sameGira && excludePlotId && p.id === excludePlotId),
      );
      setSourcePlots(plots);
      setSourcePlotId(plots[0]?.id || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase, sourceProgramId, targetProgram?.id, excludePlotId]);

  const doImportPayload = async ({ payload, nombre }) => {
    setBusy(true);
    try {
      const { data, error } = await importStagePlotIntoPrograma(
        supabase,
        targetProgram.id,
        { payload, nombre, clearBloqueIds: true },
      );
      if (error) throw error;
      toast.success("Escenario importado como nuevo lienzo");
      onImported?.(data);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Error al importar");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const parsed = await readStagePlotTransferFile(file);
      if (!parsed.ok) throw new Error(parsed.error);
      await doImportPayload({
        payload: parsed.doc.payload,
        nombre: parsed.doc.nombre,
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Archivo inválido");
      setBusy(false);
    }
  };

  const handleImportFromGira = async () => {
    const plot = sourcePlots.find((p) => p.id === sourcePlotId);
    if (!plot) {
      toast.error("Elegí un lienzo de origen");
      return;
    }
    await doImportPayload({
      payload: plot.payload,
      nombre: plot.nombre || undefined,
    });
  };

  const handleExportFile = () => {
    if (!exportDoc) return;
    try {
      const doc = buildStagePlotTransferDocument(exportDoc);
      downloadStagePlotTransferFile(
        doc,
        exportDoc.nombre ||
          targetProgram?.nomenclador ||
          targetProgram?.nombre_gira ||
          "escenario",
      );
    } catch (err) {
      toast.error(err?.message || "No se pudo exportar");
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-4"
      style={{ zIndex: 100 }}
      role="dialog"
      aria-modal="true"
      aria-label="Importar escenario"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-bold text-slate-800">
            Exportar / Importar Escenario
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-3 pt-2">
          {[
            ["file", "Archivo"],
            ["gira", "Desde gira"],
            ["export", "Exportar"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-t px-3 py-1.5 text-xs font-medium ${
                tab === id
                  ? "bg-white text-indigo-700 ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3 px-4 py-4">
          {tab === "file" && (
            <>
              <p className="text-xs text-slate-500">
                Importá un archivo <code>.ofrn-escenario.json</code>. Se crea un
                lienzo nuevo (sin bloques ni eventos de la gira origen).
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  handleFile(f);
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {busy ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconUpload size={14} />
                )}
                Elegir archivo…
              </button>
            </>
          )}

          {tab === "gira" && (
            <>
              <p className="text-xs text-slate-500">
                Copiá un lienzo desde esta gira u otra que ya tenga Escenario. Se
                crea un lienzo nuevo (sin bloques ni eventos del origen).
              </p>
              <label className="block text-xs font-medium text-slate-600">
                Gira origen
                <select
                  value={sourceProgramId}
                  onChange={(e) => setSourceProgramId(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">— Elegir —</option>
                  {giras.map((g) => {
                    const same =
                      Number.isFinite(targetProgramId) &&
                      Number(g.id) === targetProgramId;
                    const label = [
                      g.nomenclador,
                      g.nombre_gira,
                      same ? "(esta gira)" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <option key={g.id} value={g.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>
              {sourceProgramId && (
                <label className="block text-xs font-medium text-slate-600">
                  Lienzo
                  <select
                    value={sourcePlotId}
                    onChange={(e) => setSourcePlotId(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                    disabled={sourcePlots.length === 0}
                  >
                    {sourcePlots.length === 0 ? (
                      <option value="">
                        {isSameGira
                          ? "No hay otros lienzos en esta gira"
                          : "Sin lienzos"}
                      </option>
                    ) : (
                      sourcePlots.map((p, i) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre?.trim() || `Lienzo ${i + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              )}
              <button
                type="button"
                disabled={busy || !sourcePlotId}
                onClick={handleImportFromGira}
                className="inline-flex items-center gap-1.5 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {busy ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconUpload size={14} />
                )}
                Importar lienzo
              </button>
            </>
          )}

          {tab === "export" && (
            <>
              <p className="text-xs text-slate-500">
                Descargá el lienzo activo como JSON para llevarlo a otra gira.
              </p>
              <button
                type="button"
                disabled={!exportDoc}
                onClick={handleExportFile}
                className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <IconDownload size={14} /> Descargar JSON
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
