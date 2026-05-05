import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { IconX } from "../ui/Icons";
import {
  getInstrumentValue,
  countsTowardInstrumentationConvoked,
} from "../../utils/instrumentation";

const INSTRUMENT_COLUMNS = [
  { id: "Fl", label: "Fl", key: "fl" },
  { id: "Ob", label: "Ob", key: "ob" },
  { id: "Cl", label: "Cl", key: "cl" },
  { id: "Fg", label: "Fg", key: "bn" },
  { id: "Cr", label: "Cr", key: "hn" },
  { id: "Tp", label: "Tp", key: "tpt" },
  { id: "Tb", label: "Tb", key: "tbn" },
  { id: "Tba", label: "Tba", key: "tba" },
  { id: "Perc", label: "Perc", key: "perc" },
  { id: "Har", label: "Har", key: "harp" },
  { id: "Pno", label: "Pno", key: "key" },
];

const SAVE_DEBOUNCE_MS = 500;

export default function InstrumentationSummaryModal({
  isOpen,
  onClose,
  works = [],
  required = {},
  convoked = {},
  roster = [],
  programId = null,
  supabase = null,
  organicoRevisado: initialOrganicoRevisado = false,
  organicoComentario: initialOrganicoComentario = null,
  onOrganicoSave = null,
}) {
  const [organicoRevisado, setOrganicoRevisado] = useState(initialOrganicoRevisado);
  const [organicoComentario, setOrganicoComentario] = useState(initialOrganicoComentario ?? "");
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setOrganicoRevisado(initialOrganicoRevisado);
    setOrganicoComentario(initialOrganicoComentario ?? "");
  }, [isOpen, initialOrganicoRevisado, initialOrganicoComentario]);

  const persistOrganico = useCallback(
    (payload) => {
      if (!programId || !supabase) return;
      supabase
        .from("programas")
        .update(payload)
        .eq("id", programId)
        .then(() => {
          onOrganicoSave?.(payload);
        })
        .catch((e) => console.error("Error guardando validación de orgánico:", e));
    },
    [programId, supabase, onOrganicoSave],
  );

  const scheduleSave = useCallback(
    (nextRevisado, nextComentario) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        persistOrganico({
          organico_revisado: !!nextRevisado,
          organico_comentario: (nextComentario && nextComentario.trim()) || null,
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [persistOrganico],
  );

  const handleRevisadoChange = (e) => {
    const v = e.target.checked;
    setOrganicoRevisado(v);
    scheduleSave(v, organicoComentario);
  };

  const handleComentarioChange = (e) => {
    const v = e.target.value;
    setOrganicoComentario(v);
    scheduleSave(organicoRevisado, v);
  };

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    [],
  );

  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  const showValidationSection = programId && supabase;

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

  const convokedNamesByColumn = useMemo(() => {
    const out = {
      Fl: [],
      Ob: [],
      Cl: [],
      Fg: [],
      Cr: [],
      Tp: [],
      Tb: [],
      Tba: [],
      Tim: [],
      Perc: [],
      Har: [],
      Pno: [],
    };
    const confirmed = (roster || []).filter(
      (m) => String(m.estado_gira || "").toLowerCase() === "confirmado",
    );

    confirmed.forEach((m) => {
      if (!countsTowardInstrumentationConvoked(m.rol_gira)) return;
      const name = `${m.apellido || ""}, ${m.nombre || ""}`.trim();
      if (!name) return;

      const idInstr = String(m.id_instr || "");
      const instrumentName = String(
        m.instrumentos?.instrumento || "",
      ).toLowerCase();

      // Mismo criterio audit: excluir cuerdas del conteo/tips de instrumentación
      if (["01", "02", "03", "04"].includes(idInstr)) return;
      if (instrumentName.includes("flaut") || instrumentName.includes("picc")) {
        out.Fl.push(name);
        return;
      }
      if (
        instrumentName.includes("oboe") ||
        instrumentName.includes("corno ing")
      ) {
        out.Ob.push(name);
        return;
      }
      if (
        instrumentName.includes("clarin") ||
        instrumentName.includes("requinto") ||
        instrumentName.includes("basset")
      ) {
        out.Cl.push(name);
        return;
      }
      if (
        instrumentName.includes("fagot") ||
        instrumentName.includes("contraf")
      ) {
        out.Fg.push(name);
        return;
      }
      if (
        instrumentName.includes("corno") ||
        instrumentName.includes("trompa")
      ) {
        out.Cr.push(name);
        return;
      }
      if (
        instrumentName.includes("trompet") ||
        instrumentName.includes("fliscorno")
      ) {
        out.Tp.push(name);
        return;
      }
      if (
        instrumentName.includes("trombon") ||
        instrumentName.includes("trombón")
      ) {
        out.Tb.push(name);
        return;
      }
      if (
        instrumentName.includes("tuba") ||
        instrumentName.includes("bombard")
      ) {
        out.Tba.push(name);
        return;
      }
      if (instrumentName.includes("timbal")) {
        out.Tim.push(name);
        return;
      }
      if (
        instrumentName.includes("perc") ||
        instrumentName.includes("bombo") ||
        instrumentName.includes("platillo") ||
        instrumentName.includes("caja")
      ) {
        out.Perc.push(name);
        return;
      }
      if (instrumentName.includes("arpa")) {
        out.Har.push(name);
        return;
      }
      if (
        instrumentName.includes("piano") ||
        instrumentName.includes("teclado") ||
        instrumentName.includes("celesta") ||
        instrumentName.includes("órgano") ||
        instrumentName.includes("organo")
      ) {
        out.Pno.push(name);
      }
    });
    return out;
  }, [roster]);

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
    let standardStr = `${fl}.${ob}.${cl}.${bn} - ${hn}.${tpt}.${tbn}.${tba}`;

    if (percTotal === 1) {
      standardStr += " - Perc";
    } else if (percTotal > 1) {
      standardStr += ` - Perc.x${percTotal}`;
    }

    if (harpCount > 0)
      standardStr += ` - ${harpCount > 1 ? harpCount : ""}Hp`;
    if (keyCount > 0) standardStr += ` - Key`;
    const isStandardEmpty =
      standardStr.startsWith("0.0.0.0 - 0.0.0.0") &&
      percTotal === 0 &&
      harpCount === 0 &&
      keyCount === 0;

    if (isStandardEmpty) return "s/d";

    return standardStr
      .replace("0.0.0.0 - 0.0.0.0 - ", "")
      .replace("0.0.0.0 - 0.0.0.0", "");
  };

  const normalizeCompare = (_id, value) => value || 0;

  const hasMismatch = useMemo(() => {
    const requiredPercTotal = (required.Tim || 0) + (required.Perc || 0);
    const convokedPercTotal = (convoked.Tim || 0) + (convoked.Perc || 0);

    return INSTRUMENT_COLUMNS.some((col) => {
      if (col.id === "Perc") {
        const r = normalizeCompare("Perc", requiredPercTotal);
        const c = normalizeCompare("Perc", convokedPercTotal);
        return r !== c;
      }
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
    return r - c;
  };

  const getPercTotalForInstrumentation = (instString) => {
    if (!instString) return 0;
    let percTotalForWork = 0;
    const timpMatch = instString.match(/Timp\.\s*(?:\+(\d+))?/i);
    if (timpMatch) {
      const extra = parseInt(timpMatch[1] || "0", 10) || 0;
      percTotalForWork += 1 + extra;
    }
    const percMatch = instString.match(/Perc(?:\.x(\d+))?/i);
    if (percMatch) {
      const explicitPerc = percMatch[1] ? parseInt(percMatch[1], 10) || 0 : 1;
      percTotalForWork += explicitPerc;
    }
    if (!timpMatch && !percMatch) {
      percTotalForWork =
        (getInstrumentValue(instString, "timp") || 0) +
        (getInstrumentValue(instString, "perc") || 0);
    }
    return percTotalForWork;
  };

  const renderCellContent = (work, col) => {
    const inst = work.instrumentacion_effective || work.instrumentacion || "";
    let count = 0;
    if (inst) {
      count =
        col.id === "Perc"
          ? getPercTotalForInstrumentation(inst)
          : getInstrumentValue(inst, col.key) || 0;
    }

    const obs = observationsByWorkId[work.obra_id];

    let convBase = convoked[col.id] || 0;
    if (col.id === "Perc") {
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

        {showValidationSection && (
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
            <div className="text-[10px] font-bold uppercase text-slate-500 mb-2">
              Validación de Orgánico
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!organicoRevisado}
                  onChange={handleRevisadoChange}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  Orgánico revisado (adaptación validada)
                </span>
              </label>
              <div className="flex-1 min-w-0">
                <textarea
                  placeholder="Comentario sobre adaptaciones artísticas (opcional)"
                  value={organicoComentario}
                  onChange={handleComentarioChange}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

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
                          {(() => {
                            const namesList =
                              col.id === "Perc"
                                ? [
                                    ...(convokedNamesByColumn.Tim || []),
                                    ...(convokedNamesByColumn.Perc || []),
                                  ]
                                : convokedNamesByColumn[col.id] || [];
                            const tooltipText =
                              namesList.length > 0
                                ? namesList.join("\n")
                                : "Sin convocados";
                            const value =
                              col.id === "Perc"
                                ? (convoked.Tim || 0) + (convoked.Perc || 0)
                                : convoked[col.id] || 0;
                            return <span title={tooltipText}>{value}</span>;
                          })()}
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

