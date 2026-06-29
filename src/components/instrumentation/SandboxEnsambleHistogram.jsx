import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function formatSpanishNameList(labels = []) {
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}

function buildHistogramTooltipText(n, ensambleLabel, members) {
  const servicio = n === 1 ? "servicio" : "servicios";
  const names = formatSpanishNameList(members.map((m) => m.label));
  return `Con ${n} ${servicio} del ensamble ${ensambleLabel}: ${names}`;
}

function HistogramCellTooltip({ anchorRef, open, text, draftNote }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxW = 280;
    let left = rect.left + rect.width / 2 - maxW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - maxW - 8));
    setPos({ top: rect.bottom + 6, left });
  }, [open, anchorRef, text]);

  if (!open || !text || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed z-[110] w-[17.5rem] max-w-[min(17.5rem,calc(100vw-1rem))] rounded-lg border border-slate-200 bg-white shadow-xl p-2 text-[10px] leading-snug text-slate-700 pointer-events-none"
      style={{ top: pos.top, left: pos.left }}
    >
      <p>{text}</p>
      {draftNote && (
        <p className="text-[9px] text-violet-700 mt-1">{draftNote}</p>
      )}
    </div>,
    document.body,
  );
}

function HistogramDataCell({
  val,
  serviceCount,
  ensambleLabel,
  members,
  isDraft,
  baselineVal,
  className,
}) {
  const cellRef = useRef(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const hasMembers = val > 0 && members?.length > 0;

  const tooltipText = hasMembers
    ? buildHistogramTooltipText(serviceCount, ensambleLabel, members)
    : "";

  const draftNote =
    isDraft && baselineVal != null
      ? `Productivo: ${baselineVal} → Borrador: ${val}`
      : null;

  return (
    <td
      ref={cellRef}
      className={`${className} ${hasMembers ? "cursor-help" : ""}`}
      onMouseEnter={() => hasMembers && setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
    >
      {val || "·"}
      <HistogramCellTooltip
        anchorRef={cellRef}
        open={tooltipOpen}
        text={tooltipText}
        draftNote={draftNote}
      />
    </td>
  );
}

export default function SandboxEnsambleHistogram({ histogram, loading }) {
  const { columns = [], rows = [], columnTotals = {} } = histogram || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-slate-400">
        Calculando histograma…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="p-3 text-xs text-slate-500">
        Sin ensambles regionales o sin datos en el año.
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="border-collapse text-[10px] min-w-full">
        <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
          <tr>
            <th className="sticky left-0 z-20 bg-slate-100 border border-slate-200 px-2 py-1.5 text-left font-bold text-slate-700 min-w-[8rem]">
              Ensamble
            </th>
            {columns.map((c) => (
              <th
                key={c}
                className="border border-slate-200 px-1.5 py-1.5 text-center font-bold text-slate-600 min-w-[2rem]"
                title={`${c} servicio${c === 1 ? "" : "s"} Sinf+CF`}
              >
                {c}
              </th>
            ))}
            <th className="border border-slate-200 px-1.5 py-1.5 text-center font-bold text-slate-500 bg-slate-50">
              Σ
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50/80">
              <td
                className={`sticky left-0 z-[1] border border-slate-200 px-2 py-1 font-medium text-slate-800 bg-white ${
                  row.hasDelta ? "border-l-2 border-l-violet-400" : ""
                }`}
                title={`${row.memberCount} integrantes`}
              >
                <span className="line-clamp-2">{row.label}</span>
              </td>
              {columns.map((c) => {
                const val = row.buckets[c] || 0;
                const delta = row.deltaBuckets?.[c] ?? 0;
                const isDraft = delta !== 0;
                return (
                  <HistogramDataCell
                    key={c}
                    val={val}
                    serviceCount={c}
                    ensambleLabel={row.label}
                    members={row.bucketMembers?.[c]}
                    isDraft={isDraft}
                    baselineVal={row.baselineBuckets?.[c]}
                    className={`border border-slate-200 px-1 py-1 text-center font-mono ${
                      isDraft
                        ? "bg-violet-100 text-violet-900 font-bold"
                        : val > 0
                          ? "text-slate-800"
                          : "text-slate-300"
                    }`}
                  />
                );
              })}
              <td className="border border-slate-200 px-1 py-1 text-center font-mono text-slate-600 bg-slate-50/80">
                {row.memberCount}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold">
            <td className="sticky left-0 z-[1] border border-slate-200 px-2 py-1 bg-slate-100 text-slate-700">
              Total
            </td>
            {columns.map((c) => (
              <td
                key={c}
                className="border border-slate-200 px-1 py-1 text-center font-mono text-slate-700"
              >
                {columnTotals[c] || "·"}
              </td>
            ))}
            <td className="border border-slate-200 px-1 py-1 text-center font-mono text-slate-500">
              {rows.reduce((s, r) => s + r.memberCount, 0)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="px-2 py-1.5 text-[9px] text-slate-500 border-t border-slate-100">
        Columnas = total de servicios Sinfónico + Camerata Filarmónica en el
        año. Violeta = celda afectada por borrador. Pasá el mouse sobre un
        número para ver los músicos.
      </p>
    </div>
  );
}
