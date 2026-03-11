import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { IconX } from "../ui/Icons";
import { getInstrumentValue } from "../../utils/instrumentation";

const INSTRUMENT_COLUMNS = [
  { id: "Fl", label: "Fl", key: "fl" },
  { id: "Ob", label: "Ob", key: "ob" },
  { id: "Cl", label: "Cl", key: "cl" },
  { id: "Fg", label: "Fg", key: "bn" },
  { id: "Cr", label: "Cr", key: "hn" },
  { id: "Tp", label: "Tp", key: "tpt" },
  { id: "Tb", label: "Tb", key: "tbn" },
  { id: "Tba", label: "Tba", key: "tba" },
  { id: "Tim", label: "Tim", key: "timp" },
  { id: "Perc", label: "Perc", key: "perc" },
  { id: "Har", label: "Har", key: "harp" },
  { id: "Pno", label: "Pno", key: "key" },
  { id: "Str", label: "Cuerdas", key: "str" },
];

export default function InstrumentationSummaryModal({
  isOpen,
  onClose,
  works = [],
  required = {},
  convoked = {},
}) {
  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  const observationsByWorkId = useMemo(() => {
    const map = {};
    works.forEach((w) => {
      const s = w.instrumentacion_effective || w.instrumentacion || "";
      const matches = s.match(/\(([^)]*)\)/g);
      if (matches && matches.length > 0) {
        const txt = matches
          .map((m) => m.replace(/^\(/, "").replace(/\)$/, "").trim())
          .filter(Boolean)
          .join("; ");
        if (txt) map[w.obra_id] = txt;
      }
    });
    return map;
  }, [works]);

  const formatInstrumentationStandard = (map) => {
    const fl = map.Fl || 0;
    const ob = map.Ob || 0;
    const cl = map.Cl || 0;
    const bn = map.Fg || 0;
    const hn = map.Cr || 0;
    const tpt = map.Tp || 0;
    const tbn = map.Tb || 0;
    const tba = map.Tba || 0;

    const percTotal = (map.Tim || 0) + (map.Perc || 0);
    const harpCount = map.Har || 0;
    const keyCount = map.Pno || 0;
    const hasStr = (map.Str || 0) > 0;

    let standardStr = `${fl}.${ob}.${cl}.${bn} - ${hn}.${tpt}.${tbn}.${tba}`;

    if (percTotal === 1) {
      standardStr += " - Perc";
    } else if (percTotal > 1) {
      standardStr += ` - Perc.x${percTotal}`;
    }

    if (harpCount > 0)
      standardStr += ` - ${harpCount > 1 ? harpCount : ""}Hp`;
    if (keyCount > 0) standardStr += ` - Key`;
    if (hasStr) standardStr += " - Str";

    const isStandardEmpty =
      standardStr.startsWith("0.0.0.0 - 0.0.0.0") &&
      percTotal === 0 &&
      !hasStr &&
      harpCount === 0 &&
      keyCount === 0;

    if (isStandardEmpty) return "s/d";

    return standardStr
      .replace("0.0.0.0 - 0.0.0.0 - ", "")
      .replace("0.0.0.0 - 0.0.0.0", "");
  };

  const normalizeCompare = (id, value) => {
    if (id === "Str") {
      return value > 0 ? 1 : 0;
    }
    return value || 0;
  };

  const hasMismatch = useMemo(() => {
    const requiredPercTotal = (required.Tim || 0) + (required.Perc || 0);
    const convokedPercTotal = (convoked.Tim || 0) + (convoked.Perc || 0);

    return INSTRUMENT_COLUMNS.some((col) => {
      if (col.id === "Perc") {
        const r = normalizeCompare("Perc", requiredPercTotal);
        const c = normalizeCompare("Perc", convokedPercTotal);
        return r !== c;
      }
      if (col.id === "Tim") return false;

      const r = normalizeCompare(col.id, required[col.id] || 0);
      const c = normalizeCompare(col.id, convoked[col.id] || 0);
      return r !== c;
    });
  }, [required, convoked]);

  const getColumnDelta = (col) => {
    let r = required[col.id] || 0;
    let c = convoked[col.id] || 0;

    // Percusión: usar total de instrumentistas (Timp + Perc)
    if (col.id === "Perc") {
      r = (required.Tim || 0) + (required.Perc || 0);
      c = (convoked.Tim || 0) + (convoked.Perc || 0);
    }
    if (col.id === "Tim" || col.id === "Str") return 0;

    return r - c;
  };

  const renderCellContent = (work, col) => {
    const inst = work.instrumentacion_effective || work.instrumentacion || "";
    let count = 0;
    if (inst) {
      count = getInstrumentValue(inst, col.key) || 0;
    }
    if (col.id === "Str") {
      // Para cuerdas nos basta presencia/ausencia según el string
      const hasStr =
        getInstrumentValue(inst, "str") > 0 ||
        /str|cuerd|viol|vln|vla|vlc|cb|arco|contrab/i.test(inst);
      count = hasStr ? 1 : 0;
    }

    const obs = observationsByWorkId[work.obra_id];

    let convBase = convoked[col.id] || 0;
    if (col.id === "Tim" || col.id === "Perc") {
      convBase = (convoked.Tim || 0) + (convoked.Perc || 0);
    }
    const convLimit = convBase;
    const isOver = col.id !== "Str" && count > convLimit;

    if (!count && !obs) {
      return (
        <div
          className={`flex flex-col items-center gap-0.5 px-1 py-0.5 rounded ${
            isOver ? "bg-orange-200 text-black" : ""
          }`}
        >
          <span className="text-[10px] text-slate-300">-</span>
        </div>
      );
    }

    return (
      <div
        className={`flex flex-col items-center gap-0.5 px-1 py-0.5 rounded ${
          isOver ? "bg-orange-200 text-black" : ""
        }`}
      >
        <span className="font-mono text-xs font-extrabold text-slate-900">
          {count || "-"}
        </span>
        {obs && (
          <span
            className="text-[9px] text-slate-500 truncate max-w-[90px]"
            title={obs}
          >
            {obs}
          </span>
        )}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">
              Control de Instrumentación del Programa
            </h3>
            {hasMismatch && (
              <span className="text-[10px] text-orange-600 font-medium">
                Hay diferencias entre la instrumentación requerida y la
                convocada.
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="border border-slate-200 rounded-lg overflow-auto bg-white">
            <table className="w-full border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-[10px] font-bold text-left uppercase tracking-wide border-r border-slate-200 w-64">
                    Obra
                  </th>
                  {INSTRUMENT_COLUMNS.map((col) => (
                    <th
                      key={col.id}
                      className="px-2 py-1.5 text-center border-r border-slate-200"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-mono text-xs text-slate-800">
                          {convoked[col.id] || 0}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          {col.label}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-1 text-[10px] font-medium text-left border-r border-slate-200">
                    Δ Instrumentistas
                  </th>
                  {INSTRUMENT_COLUMNS.map((col) => {
                    const delta = getColumnDelta(col);
                    const label =
                      delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "";
                    const isActive = delta !== 0 && col.id !== "Str";
                    return (
                      <th
                        key={col.id}
                        className="px-2 py-1 text-center border-r border-slate-200"
                      >
                        <span
                          className={
                            isActive
                              ? "font-semibold text-orange-700"
                              : "text-slate-300"
                          }
                        >
                          {label || "·"}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {works.map((w) => (
                  <tr key={w.obra_id || w.id} className="hover:bg-slate-50/60">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-[11px] text-slate-800 border-r border-slate-200 max-w-[260px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold truncate">
                          {w.composer || "S/D"},{" "}
                          {w.shortTitle || w.title || "Obra"}
                        </span>
                        {(w.instrumentacion_effective || w.instrumentacion) && (
                          <span
                            className="text-[9px] font-mono text-slate-400 truncate"
                            title={
                              w.instrumentacion_effective || w.instrumentacion
                            }
                          >
                            {w.instrumentacion_effective || w.instrumentacion}
                          </span>
                        )}
                      </div>
                    </td>
                    {INSTRUMENT_COLUMNS.map((col) => (
                      <td
                        key={col.id}
                        className="px-2 py-1.5 text-center border-r border-slate-200"
                      >
                        {renderCellContent(w, col)}
                      </td>
                    ))}
                  </tr>
                ))}
                {works.length === 0 && (
                  <tr>
                    <td
                      colSpan={1 + INSTRUMENT_COLUMNS.length}
                      className="px-3 py-6 text-center text-xs text-slate-400"
                    >
                      No hay obras cargadas en este programa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

