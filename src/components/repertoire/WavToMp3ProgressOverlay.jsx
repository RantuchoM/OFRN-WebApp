import React from "react";
import { IconAlertCircle, IconCheck, IconLoader, IconX } from "../ui/Icons";
import { formatBytesForUi } from "../../utils/driveAudioConvert";

const STAGES = [
  { id: "download", label: "Descargando" },
  { id: "convert", label: "Convirtiendo" },
  { id: "upload", label: "Subiendo" },
];

/**
 * Overlay interno del matcher (z-[110]) durante WAV → MP3.
 * En error o resumen de lote permite cerrar el aviso; el matcher ya no queda bloqueado.
 */
export default function WavToMp3ProgressOverlay({ job, onDismiss }) {
  if (!job) return null;
  const stage = job.stage || "download";
  const failed = stage === "error";
  const done = stage === "done";
  const summary = stage === "summary";
  const hasRatio = Number.isFinite(Number(job.percent));
  const indeterminate = Boolean(job.indeterminate) || (!failed && !done && !summary && !hasRatio);
  const pct = hasRatio
    ? Math.min(100, Math.max(0, Math.round(Number(job.percent))))
    : 0;
  const bytesLabel =
    job.bytesLabel ||
    (job.total
      ? `${formatBytesForUi(job.received)} / ${formatBytesForUi(job.total)}`
      : job.received
        ? formatBytesForUi(job.received)
        : "");
  const batchTotal = Number(job.batchTotal) || 0;
  const batchIndex = Number(job.batchIndex) || 0;
  const showBatch = batchTotal > 0 && (batchIndex > 0 || summary);
  const okCount = Number(job.okCount) || 0;
  const failCount = Number(job.failCount) || (job.failures?.length ?? 0);
  const failures = Array.isArray(job.failures) ? job.failures : [];

  return (
    <div
      className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy={!failed && !done && !summary}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-2xl">
        <div className="mb-3 flex items-start gap-2.5">
          {failed ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <IconX size={18} />
            </div>
          ) : summary && failCount > 0 ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <IconAlertCircle size={18} />
            </div>
          ) : done || (summary && failCount === 0) ? (
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <IconCheck size={18} />
            </div>
          ) : (
            <IconLoader
              className="mt-0.5 shrink-0 animate-spin text-indigo-600"
              size={20}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800">
              {failed
                ? "No se pudo convertir"
                : summary
                  ? "Lote terminado"
                  : done
                    ? "MP3 listo"
                    : "Convertir a MP3"}
            </p>
            {showBatch && !failed ? (
              <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-indigo-700">
                {summary
                  ? `${okCount} de ${batchTotal}`
                  : `${batchIndex} de ${batchTotal}`}
              </p>
            ) : null}
            {!summary ? (
              <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-500">
                {job.fileName || "Audio"}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                {okCount} convertido{okCount === 1 ? "" : "s"}
                {failCount > 0
                  ? ` · ${failCount} con error`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {summary ? (
          <>
            {failures.length > 0 ? (
              <ul className="mb-1 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                {failures.map((item, idx) => (
                  <li
                    key={item.id || `${item.name}-${idx}`}
                    className="text-[11px] leading-snug text-rose-900"
                  >
                    <span className="font-bold">{item.name || "Audio"}: </span>
                    {item.message || "Error al convertir."}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-[11px] text-slate-500">
              Los WAV originales se conservaron en Drive. Podés reintentar los
              que fallaron.
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-4 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-900"
            >
              Entendido
            </button>
          </>
        ) : !failed ? (
          <>
            <ol className="mb-3 flex gap-1">
              {STAGES.map((s) => {
                const active = s.id === stage;
                const passed =
                  STAGES.findIndex((x) => x.id === s.id) <
                  STAGES.findIndex((x) => x.id === stage);
                return (
                  <li
                    key={s.id}
                    className={`flex-1 rounded-full px-1 py-1 text-center text-[10px] font-bold ${
                      active
                        ? "bg-indigo-600 text-white"
                        : passed || done
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.label}
                  </li>
                );
              })}
            </ol>
            <div className="mb-1.5 flex justify-between gap-2 text-[11px]">
              <span className="font-medium text-slate-600">
                {job.label || STAGES.find((s) => s.id === stage)?.label || ""}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {indeterminate
                  ? bytesLabel || "…"
                  : bytesLabel
                    ? `${pct}% · ${bytesLabel}`
                    : `${pct}%`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              {indeterminate ? (
                <div className="h-full w-full animate-pulse rounded-full bg-indigo-400" />
              ) : (
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-amber-900">
              No cierres esta pestaña ni el matcher hasta que termine
              {showBatch ? " el lote" : ""}.
            </p>
          </>
        ) : (
          <>
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] leading-snug text-rose-900">
              {job.error || "Error al convertir."}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-4 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-900"
            >
              Entendido
            </button>
          </>
        )}
      </div>
    </div>
  );
}
