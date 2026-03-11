import React, { useEffect, useMemo, useState } from "react";
import {
  IconLoader,
  IconAlertTriangle,
  IconChevronDown,
} from "../../components/ui/Icons";
import { getInstrumentValue } from "../../utils/instrumentation";
import { fetchRosterForGira } from "../../hooks/useGiraRoster";
import DateInput from "../../components/ui/DateInput";

const INSTRUMENT_COLUMNS = [
  { id: "Fl", label: "Fl" },
  { id: "Ob", label: "Ob" },
  { id: "Cl", label: "Cl" },
  { id: "Fg", label: "Fg" },
  { id: "Cr", label: "Cr" },
  { id: "Tp", label: "Tp" },
  { id: "Tb", label: "Tb" },
  { id: "Tba", label: "Tba" },
  { id: "Tim", label: "Tim" },
  { id: "Perc", label: "Perc" },
  { id: "Har", label: "Har" },
  { id: "Pno", label: "Pno" },
];

function createEmptyInstrumentationMap() {
  return {
    Fl: 0,
    Ob: 0,
    Cl: 0,
    Fg: 0,
    Cr: 0,
    Tp: 0,
    Tb: 0,
    Tba: 0,
    Tim: 0,
    Perc: 0,
    Har: 0,
    Pno: 0,
  };
}

function computeRequiredForProgram(blocks = []) {
  const acc = createEmptyInstrumentationMap();
  if (!blocks || blocks.length === 0) return acc;

  blocks.forEach((block) => {
    (block.repertorio_obras || []).forEach((ro) => {
      if (!ro || ro.excluir) return;
      const obra = ro.obras;
      if (!obra) return;
      const instString = obra.instrumentacion || "";
      if (!instString) return;

      // Percusión: interpretar formatos "Timp.+n" / "Perc.xn" como total de instrumentistas
      let percTotalForWork = 0;
      let timVal = 0;
      let percVal = 0;

      const timpMatch = instString.match(/Timp\.\s*(?:\+(\d+))?/i);
      if (timpMatch) {
        timVal = 1;
        const extra = parseInt(timpMatch[1] || "0", 10) || 0;
        percTotalForWork += 1 + extra;
      }

      const percMatch = instString.match(/Perc(?:\.x(\d+))?/i);
      if (percMatch) {
        const explicitPerc = percMatch[1]
          ? parseInt(percMatch[1], 10) || 0
          : 1;
        percVal = explicitPerc;
        percTotalForWork += explicitPerc;
      }

      if (!timpMatch && !percMatch) {
        timVal = getInstrumentValue(instString, "timp") || 0;
        percVal = getInstrumentValue(instString, "perc") || 0;
        percTotalForWork = timVal + percVal;
      }

      const values = {
        Fl: getInstrumentValue(instString, "fl") || 0,
        Ob: getInstrumentValue(instString, "ob") || 0,
        Cl: getInstrumentValue(instString, "cl") || 0,
        Fg: getInstrumentValue(instString, "bn") || 0,
        Cr: getInstrumentValue(instString, "hn") || 0,
        Tp: getInstrumentValue(instString, "tpt") || 0,
        Tb: getInstrumentValue(instString, "tbn") || 0,
        Tba: getInstrumentValue(instString, "tba") || 0,
        // Para requerido máximo: usar total de percusionistas por obra
        Tim: 0,
        Perc: percTotalForWork,
        Har: getInstrumentValue(instString, "harp") || 0,
        Pno: getInstrumentValue(instString, "key") || 0,
        Str: getInstrumentValue(instString, "str") || 0,
      };

      Object.keys(values).forEach((k) => {
        if (values[k] > acc[k]) acc[k] = values[k];
      });
    });
  });

  return acc;
}

function computeConvokedForProgram(roster = []) {
  const all = createEmptyInstrumentationMap();
  const real = createEmptyInstrumentationMap();
  const vacants = createEmptyInstrumentationMap();
  if (!roster || roster.length === 0) return { all, real, vacants };

  roster.forEach((m) => {
    if (m.estado_gira === "ausente") return;
    const role = m.rol_gira || "musico";
    if (["staff", "produccion", "chofer"].includes(role)) return;

    const isVacancy = !!m.es_simulacion;
    const idInstr = String(m.id_instr || "");
    const name = (m.instrumentos?.instrumento || "").toLowerCase();
    const familia = (m.instrumentos?.familia || "").toLowerCase();

    const add = (key) => {
      all[key] += 1;
      if (isVacancy) vacants[key] += 1;
      else real[key] += 1;
    };

    // Excluir cuerdas del conteo de instrumentación (solo vientos / perc / otros)
    if (["01", "02", "03", "04"].includes(idInstr)) {
      return;
    }

    if (name.includes("flaut") || name.includes("picc")) {
      add("Fl");
      return;
    }
    if (name.includes("oboe") || name.includes("corno ing")) {
      add("Ob");
      return;
    }
    if (
      name.includes("clarin") ||
      name.includes("requinto") ||
      name.includes("basset")
    ) {
      add("Cl");
      return;
    }
    if (name.includes("fagot") || name.includes("contraf")) {
      add("Fg");
      return;
    }
    if (name.includes("corno") || name.includes("trompa")) {
      add("Cr");
      return;
    }
    if (name.includes("trompet") || name.includes("fliscorno")) {
      add("Tp");
      return;
    }
    if (name.includes("trombon") || name.includes("trombón")) {
      add("Tb");
      return;
    }
    if (name.includes("tuba") || name.includes("bombard")) {
      add("Tba");
      return;
    }
    if (name.includes("timbal")) {
      add("Tim");
      return;
    }
    if (
      name.includes("perc") ||
      name.includes("bombo") ||
      name.includes("platillo") ||
      name.includes("caja")
    ) {
      add("Perc");
      return;
    }
    if (name.includes("arpa")) {
      add("Har");
      return;
    }
    if (
      name.includes("piano") ||
      name.includes("teclado") ||
      name.includes("celesta") ||
      name.includes("órgano") ||
      name.includes("organo")
    ) {
      add("Pno");
      return;
    }

    // No sumar cuerdas por familia acá: el panel de auditoría se centra en
    // vientos / percusión / otros para instrumentación estándar.
  });

  return { all, real, vacants };
}

function normalizeForCompare(_key, value) {
  return value || 0;
}

function hasInstrumentationMismatch(required, convoked) {
  const requiredPercTotal = (required.Tim || 0) + (required.Perc || 0);
  const convokedPercTotal = (convoked.Tim || 0) + (convoked.Perc || 0);

  const keys = [
    "Fl",
    "Ob",
    "Cl",
    "Fg",
    "Cr",
    "Tp",
    "Tb",
    "Tba",
    "Perc",
    "Har",
    "Pno",
  ];

  return keys.some((k) => {
    if (k === "Perc") {
      return (
        normalizeForCompare("Perc", requiredPercTotal) !==
        normalizeForCompare("Perc", convokedPercTotal)
      );
    }
    const r = normalizeForCompare(k, required[k] || 0);
    const c = normalizeForCompare(k, convoked[k] || 0);
    return r !== c;
  });
}

function formatInstrumentationStandard(map) {
  const fl = map.Fl || 0;
  const ob = map.Ob || 0;
  const cl = map.Cl || 0;
  const bn = map.Fg || 0;
  const hn = map.Cr || 0;
  const tpt = map.Tp || 0;
  const tbn = map.Tb || 0;
  const tba = map.Tba || 0;

  const hasTimp = (map.Tim || 0) > 0;
  const percCount = map.Perc || 0;
  const harpCount = map.Har || 0;
  const keyCount = map.Pno || 0;
  const hasStr = (map.Str || 0) > 0;

  let standardStr = `${fl}.${ob}.${cl}.${bn} - ${hn}.${tpt}.${tbn}.${tba}`;

  let percStr = "";
  if (hasTimp) {
    percStr = percCount > 0 ? `Timp.+${percCount}` : "Timp";
  } else {
    if (percCount === 1) percStr = "Perc";
    else if (percCount > 1) percStr = `Perc.x${percCount}`;
  }
  if (percStr) standardStr += ` - ${percStr}`;

  if (harpCount > 0)
    standardStr += ` - ${harpCount > 1 ? harpCount : ""}Hp`;
  if (keyCount > 0) standardStr += ` - Key`;
  if (hasStr) standardStr += " - Str";

  const isStandardEmpty =
    standardStr.startsWith("0.0.0.0 - 0.0.0.0") &&
    !hasTimp &&
    percCount === 0 &&
    !hasStr &&
    harpCount === 0 &&
    keyCount === 0;

  if (isStandardEmpty) return "s/d";

  return standardStr
    .replace("0.0.0.0 - 0.0.0.0 - ", "")
    .replace("0.0.0.0 - 0.0.0.0", "");
}

export default function InstrumentationAudit({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [selectedType, setSelectedType] = useState("Sinfónico");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [dateFrom, setDateFrom] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: programRows, error: progError } = await supabase
          .from("programas")
          .select(
            "id, nombre_gira, nomenclador, mes_letra, fecha_desde, fecha_hasta, tipo, zona",
          )
          .order("fecha_desde", { ascending: true });
        if (progError) throw progError;

        const basePrograms = programRows || [];
        const programIds = basePrograms.map((p) => p.id);

        let blocksByProgram = {};
        if (programIds.length > 0) {
          const { data: blocks, error: blocksError } = await supabase
            .from("programas_repertorios")
            .select(
              `id, id_programa, orden, nombre,
               repertorio_obras (
                 id, orden, excluir,
                 obras ( id, titulo, instrumentacion )
               )`,
            )
            .in("id_programa", programIds);
          if (blocksError) throw blocksError;
          (blocks || []).forEach((b) => {
            const pid = b.id_programa;
            if (!pid) return;
            if (!blocksByProgram[pid]) blocksByProgram[pid] = [];
            blocksByProgram[pid].push({
              ...b,
              repertorio_obras: (b.repertorio_obras || [])
                .slice()
                .sort((a, b2) => (a.orden || 0) - (b2.orden || 0)),
            });
          });
        }

        const rosterByProgram = {};
        if (basePrograms.length > 0) {
          const results = await Promise.all(
            basePrograms.map(async (prog) => {
              try {
                const { roster } = await fetchRosterForGira(supabase, prog);
                return { id: prog.id, roster: roster || [] };
              } catch (e) {
                console.error(
                  "Error cargando roster para programa en auditoría:",
                  prog.id,
                  e,
                );
                return { id: prog.id, roster: [] };
              }
            }),
          );
          results.forEach(({ id, roster }) => {
            rosterByProgram[id] = roster;
          });
        }

        const enriched = basePrograms.map((p) => {
          const blocks = (blocksByProgram[p.id] || []).slice().sort(
            (a, b) => (a.orden || 0) - (b.orden || 0),
          );
          const required = computeRequiredForProgram(blocks);
          const { all, vacants } = computeConvokedForProgram(
            rosterByProgram[p.id] || [],
          );
          return {
            ...p,
            _blocks: blocks,
            instrumentationRequired: required,
            instrumentationConvoked: all,
            instrumentationVacants: vacants,
          };
        });

        setPrograms(enriched);
      } catch (err) {
        console.error(
          "Error cargando datos para InstrumentationAudit:",
          err,
        );
        // Fallback suave: dejamos la UI vacía pero no bloqueamos el módulo
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const programTypeOptions = useMemo(() => {
    const tipos = new Set();
    programs.forEach((p) => {
      if (p.tipo) tipos.add(p.tipo);
    });
    return Array.from(tipos)
      .sort((a, b) => a.localeCompare(b))
      .map((tipo) => ({
        id: tipo,
        label: tipo,
      }));
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (selectedType && p.tipo !== selectedType) return false;

      const progFrom = p.fecha_desde || p.fecha_hasta || null;
      const progTo = p.fecha_hasta || p.fecha_desde || null;

      if (dateFrom && progTo && progTo < dateFrom) return false;
      if (dateTo && progFrom && progFrom > dateTo) return false;

      return true;
    });
  }, [programs, selectedType, dateFrom, dateTo]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasAnyMismatch = useMemo(
    () =>
      filteredPrograms.some((p) =>
        hasInstrumentationMismatch(
          p.instrumentationRequired || createEmptyInstrumentationMap(),
          p.instrumentationConvoked || createEmptyInstrumentationMap(),
        ),
      ),
    [filteredPrograms],
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-slate-800">
              Auditoría de Instrumentación
            </h3>
            <p className="text-xs text-slate-500">
              Compará la instrumentación requerida por las obras con la
              instrumentación actualmente convocada por programa.
            </p>
            {hasAnyMismatch && (
              <div className="flex items-center gap-1 text-[11px] text-orange-600">
                <IconAlertTriangle size={12} className="shrink-0" />
                <span>
                  Hay programas con diferencias entre lo requerido y lo
                  convocado.
                </span>
              </div>
            )}
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <IconLoader className="animate-spin" size={14} />
              Cargando datos...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-1">
            <DateInput label="Fecha desde" value={dateFrom} onChange={setDateFrom} />
            <DateInput label="Fecha hasta" value={dateTo} onChange={setDateTo} />
          </div>
          <div className="md:col-span-1">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Tipo de programa
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {programTypeOptions.length === 0 && (
                <option value="Sinfónico">Sinfónico</option>
              )}
              {programTypeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
            <p>
              El cálculo de instrumentación requerida usa{" "}
              <code className="text-[10px]">
                getInstrumentValue
              </code>{" "}
              sobre los strings estándar de cada obra (ej.{" "}
              <code className="text-[10px]">
                2.2.2.2 - 4.3.3.1 - Timp+2 Perc - Hp - Key - Str
              </code>
              ).
            </p>
            <p>
              La fila <span className="font-semibold">Req Max</span> muestra el
              máximo requerido por obra, mientras que{" "}
              <span className="font-semibold">Conv</span> refleja el personal
              actualmente convocado (excluyendo ausentes).
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {filteredPrograms.length === 0 && !loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-500 flex items-center gap-2">
            <IconAlertTriangle size={14} className="text-slate-400" />
            <span>
              No hay programas que coincidan con el filtro seleccionado.
            </span>
          </div>
        )}

        {filteredPrograms.map((p) => {
          const required =
            p.instrumentationRequired || createEmptyInstrumentationMap();
          const convokedAll =
            p.instrumentationConvoked || createEmptyInstrumentationMap();
          const vacants =
            p.instrumentationVacants || createEmptyInstrumentationMap();
          const isOpen = expandedIds.has(p.id);
          const mismatches = hasInstrumentationMismatch(required, convokedAll);

          const fechaDesde = p.fecha_desde || "";
          const fechaHasta = p.fecha_hasta || "";

          const requiredPercTotal =
            (required.Tim || 0) + (required.Perc || 0);
          const convokedPercTotal =
            (convokedAll.Tim || 0) + (convokedAll.Perc || 0);

          const visibleColumns = INSTRUMENT_COLUMNS.filter((col) => {
            if (col.id === "Tim") return false;
            if (col.id === "Har" || col.id === "Pno") {
              const reqVal = required[col.id] || 0;
              const convVal = convokedAll[col.id] || 0;
              const vacVal = vacants[col.id] || 0;
              return reqVal > 0 || convVal > 0 || vacVal > 0;
            }
            return true;
          });

          return (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleExpanded(p.id)}
                className="w-full flex items-stretch gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col items-start gap-0.5 text-left min-w-[220px] max-w-xs">
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {p.mes_letra
                      ? `${p.mes_letra} | ${p.nomenclador || ""}. ${
                          p.nombre_gira || ""
                        }`
                      : `${p.nomenclador || ""}. ${p.nombre_gira || ""}`}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {fechaDesde || "s/d"}{" "}
                    {fechaHasta && fechaHasta !== fechaDesde
                      ? `→ ${fechaHasta}`
                      : ""}
                    {p.zona ? ` · ${p.zona}` : ""}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    Formato requerido:{" "}
                    <span className="font-mono">
                      {formatInstrumentationStandard(required)}
                    </span>
                  </span>
                </div>

                <div className="flex-1 flex items-stretch gap-3 min-w-0">
                  <div className="w-full border border-slate-200 rounded-lg overflow-x-auto bg-slate-50/60">
                    <table className="w-full text-[10px] min-w-[560px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <th className="px-2 py-1 text-left font-semibold">
                            Resumen
                          </th>
                          {visibleColumns.map((col) => (
                            <th
                              key={col.id}
                              className="px-1.5 py-1 text-center font-semibold"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="px-2 py-1 font-semibold text-slate-700">
                            Conv
                          </td>
                          {visibleColumns.map((col) => {
                            const convVal =
                              col.id === "Perc"
                                ? convokedPercTotal
                                : convokedAll[col.id] || 0;
                            const reqVal =
                              col.id === "Perc"
                                ? requiredPercTotal
                                : required[col.id] || 0;
                            const highlight = convVal > reqVal;

                            return (
                              <td
                                key={col.id}
                                className={`px-1.5 py-1 text-center font-mono ${
                                  highlight
                                    ? "bg-orange-500 text-white font-bold rounded"
                                    : "text-slate-800"
                                }`}
                              >
                                {convVal}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="bg-white">
                          <td className="px-2 py-1 font-semibold text-slate-700">
                            Req Max
                          </td>
                          {visibleColumns.map((col) => {
                            const convVal =
                              col.id === "Perc"
                                ? convokedPercTotal
                                : convokedAll[col.id] || 0;
                            const reqVal =
                              col.id === "Perc"
                                ? requiredPercTotal
                                : required[col.id] || 0;
                            const highlight = reqVal > convVal;

                            return (
                              <td
                                key={col.id}
                                className={`px-1.5 py-1 text-center font-mono ${
                                  highlight
                                    ? "bg-orange-500 text-white font-bold rounded"
                                    : "text-slate-800"
                                }`}
                              >
                                {reqVal}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="px-2 py-1 font-semibold text-slate-700">
                            Sug.
                          </td>
                          {visibleColumns.map((col) => {
                            let delta;
                            if (col.id === "Perc") {
                              delta = requiredPercTotal - convokedPercTotal;
                            } else {
                              delta =
                                (required[col.id] || 0) -
                                (convokedAll[col.id] || 0);
                            }
                            const label =
                              delta > 0
                                ? `+${delta}`
                                : delta < 0
                                ? `${delta}`
                                : "·";
                            const isActive = delta !== 0 && col.id !== "Str";
                            return (
                              <td
                                key={col.id}
                                className="px-1.5 py-1 text-center font-mono"
                              >
                                <span
                                  className={
                                    isActive
                                      ? "font-semibold text-orange-700"
                                      : "text-slate-300"
                                  }
                                >
                                  {label}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="bg-white">
                          <td className="px-2 py-1 font-semibold text-slate-700">
                            Vacantes
                          </td>
                          {visibleColumns.map((col) => {
                            const v =
                              col.id === "Perc"
                                ? (vacants.Tim || 0) + (vacants.Perc || 0)
                                : vacants[col.id] || 0;
                            return (
                              <td
                                key={col.id}
                                className={`px-1.5 py-1 text-center font-mono ${
                                  v > 0
                                    ? "bg-amber-200 text-black font-semibold rounded"
                                    : "text-slate-300"
                                }`}
                              >
                                {v > 0 ? v : "·"}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                    <IconChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                  <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
                    <table className="w-full text-xs min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-[10px] font-bold text-left uppercase tracking-wide border-r border-slate-200 w-64">
                            Obra
                          </th>
                          {visibleColumns.map((col) => (
                            <th
                              key={col.id}
                              className="px-2 py-1.5 text-center border-r border-slate-200 text-[10px] font-bold uppercase tracking-wide"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(p._blocks || [])
                          .flatMap((block) =>
                            (block.repertorio_obras || []).map((ro) => {
                              if (!ro || ro.excluir) return null;
                              const obra = ro.obras;
                              if (!obra) return null;
                              return {
                                id: ro.id,
                                obra_id: obra.id,
                                title: obra.titulo || "Obra",
                                instrumentacion: obra.instrumentacion || "",
                              };
                            }),
                          )
                          .filter(Boolean)
                          .map((w) => (
                            <tr key={w.id} className="hover:bg-slate-50/60">
                              <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-[11px] text-slate-800 border-r border-slate-200 max-w-[260px]">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold truncate">
                                    {w.title}
                                  </span>
                                  {w.instrumentacion && (
                                    <span
                                      className="text-[9px] font-mono text-slate-400 truncate"
                                      title={w.instrumentacion}
                                    >
                                      {w.instrumentacion}
                                    </span>
                                  )}
                                </div>
                              </td>
                          {visibleColumns.map((col) => {
                            const keyMap = {
                              Fl: "fl",
                              Ob: "ob",
                              Cl: "cl",
                              Fg: "bn",
                              Cr: "hn",
                              Tp: "tpt",
                              Tb: "tbn",
                              TbB: "tba",
                              Perc: "perc",
                              Har: "harp",
                              Pno: "key",
                            };
                            const inst = w.instrumentacion || "";
                            let count = 0;
                            if (inst) {
                              if (col.id === "Perc") {
                                // Usar misma lógica que para requerido máximo: total de percusionistas por obra
                                let percTotalForWork = 0;

                                const timpMatch = inst.match(
                                  /Timp\.\s*(?:\+(\d+))?/i,
                                );
                                if (timpMatch) {
                                  const extra =
                                    parseInt(timpMatch[1] || "0", 10) || 0;
                                  percTotalForWork += 1 + extra;
                                }

                                const percMatch = inst.match(
                                  /Perc(?:\.x(\d+))?/i,
                                );
                                if (percMatch) {
                                  const explicitPerc = percMatch[1]
                                    ? parseInt(percMatch[1], 10) || 0
                                    : 1;
                                  percTotalForWork += explicitPerc;
                                }

                                if (!timpMatch && !percMatch) {
                                  percTotalForWork =
                                    (getInstrumentValue(inst, "timp") || 0) +
                                    (getInstrumentValue(inst, "perc") || 0);
                                }

                                count = percTotalForWork;
                              } else {
                                count =
                                  getInstrumentValue(inst, keyMap[col.id]) || 0;
                              }
                            }

                            let convBase =
                              col.id === "Perc"
                                ? convokedPercTotal
                                : convokedAll[col.id] || 0;

                            const isOver = count > convBase;

                            return (
                              <td
                                key={col.id}
                                className="px-2 py-1.5 text-center border-r border-slate-200"
                              >
                                <span
                                  className={`font-mono text-xs font-extrabold ${
                                    isOver
                                      ? "bg-orange-500 text-white rounded px-1"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {count || "-"}
                                </span>
                              </td>
                            );
                          })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

