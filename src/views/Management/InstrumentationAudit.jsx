import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconLoader,
  IconAlertTriangle,
  IconChevronDown,
  IconUsers,
  IconPencil,
  IconFolder,
  IconX,
  IconCheckCircle,
  IconInfo,
} from "../../components/ui/Icons";
import { getInstrumentValue } from "../../utils/instrumentation";
import { fetchRosterForGira } from "../../hooks/useGiraRoster";
import { getProgramStyle } from "../../utils/giraUtils";
import DateInput from "../../components/ui/DateInput";
import WorkForm from "../Repertoire/WorkForm";

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

/** Mapa columna -> lista "Apellido, Nombre" de convocados confirmados para tooltips. */
function getConvokedNamesByColumn(roster = []) {
  const out = createEmptyInstrumentationMap();
  Object.keys(out).forEach((k) => (out[k] = []));

  const confirmed = (roster || []).filter(
    (m) => String(m.estado_gira || "").toLowerCase() === "confirmado",
  );
  const skipRoles = ["staff", "produccion", "chofer"];
  confirmed.forEach((m) => {
    if (skipRoles.includes((m.rol_gira || "").toLowerCase())) return;
    const name = `${m.apellido || ""}, ${m.nombre || ""}`.trim();
    if (!name) return;
    const idInstr = String(m.id_instr || "");
    const instrumentName = (m.instrumentos?.instrumento || "").toLowerCase();
    const familia = (m.instrumentos?.familia || "").toLowerCase();

    if (["01", "02", "03", "04"].includes(idInstr)) return;
    if (instrumentName.includes("flaut") || instrumentName.includes("picc")) {
      out.Fl.push(name);
      return;
    }
    if (instrumentName.includes("oboe") || instrumentName.includes("corno ing")) {
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
    if (instrumentName.includes("fagot") || instrumentName.includes("contraf")) {
      out.Fg.push(name);
      return;
    }
    if (instrumentName.includes("corno") || instrumentName.includes("trompa")) {
      out.Cr.push(name);
      return;
    }
    if (instrumentName.includes("trompet") || instrumentName.includes("fliscorno")) {
      out.Tp.push(name);
      return;
    }
    if (instrumentName.includes("trombon") || instrumentName.includes("trombón")) {
      out.Tb.push(name);
      return;
    }
    if (instrumentName.includes("tuba") || instrumentName.includes("bombard")) {
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

function buildDriveUrl(linkDrive) {
  const s = (linkDrive || "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://drive.google.com/drive/folders/${s}`;
}

/** Mismo código de colores que RepertoireManager según estado de la obra. */
function getWorkEstadoCellClasses(estado) {
  if (estado === "Informativo")
    return "border-l-4 border-blue-400 bg-blue-50 hover:bg-blue-100";
  if (estado === "Oficial")
    return "border-l-4 border-emerald-400 bg-emerald-50 hover:bg-emerald-100";
  if (estado)
    return "border-l-4 border-amber-400 bg-amber-50 hover:bg-amber-100";
  return "border-l-2 border-slate-200 bg-white";
}

/** Lazy: solo se monta cuando la gira está expandida. Renderiza el desglose de obras con acciones. */
function ProgramWorksTable({
  program,
  visibleColumns,
  convokedAll,
  requiredPercTotal,
  convokedPercTotal,
  required,
  onOpenWorkForm,
}) {
  const works = useMemo(() => {
    const blocks = program._blocks || [];
    return blocks
      .flatMap((block) =>
        (block.repertorio_obras || []).map((ro) => {
          if (!ro || ro.excluir) return null;
          const obra = ro.obras;
          if (!obra) return null;
          const ocList = Array.isArray(obra.obras_compositores)
            ? obra.obras_compositores
            : obra.obras_compositores
              ? [obra.obras_compositores]
              : [];
          const composerEntry = ocList.find((oc) => oc.rol === "compositor") || ocList[0];
          const comp = composerEntry?.compositores;
          const composerLabel = comp
            ? `${comp.apellido || ""}, ${comp.nombre || ""}`.trim()
            : "";
          return {
            id: ro.id,
            obra_id: obra.id,
            title: obra.titulo || "Obra",
            composerLabel: composerLabel || null,
            estado: obra.estado || null,
            instrumentacion: obra.instrumentacion || "",
            link_drive: obra.link_drive || null,
          };
        }),
      )
      .filter(Boolean);
  }, [program._blocks]);

  const keyMap = {
    Fl: "fl",
    Ob: "ob",
    Cl: "cl",
    Fg: "bn",
    Cr: "hn",
    Tp: "tpt",
    Tb: "tbn",
    Tba: "tba",
    Perc: "perc",
    Har: "harp",
    Pno: "key",
  };

  return (
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
            {works.map((w) => (
              <tr key={w.id} className="hover:bg-slate-50/60">
                <td
                  className={`sticky left-0 z-10 px-3 py-1.5 text-[11px] text-slate-800 border-r border-slate-200 max-w-[260px] ${getWorkEstadoCellClasses(w.estado)}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {w.composerLabel && (
                        <div className="text-[10px] text-slate-500 truncate">
                          {w.composerLabel}
                        </div>
                      )}
                      <div className="font-semibold truncate">{w.title}</div>
                    </div>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenWorkForm(w.obra_id)}
                        className="p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        title="Editar obra"
                      >
                        <IconPencil size={14} />
                      </button>
                      {w.link_drive && (
                        <a
                          href={buildDriveUrl(w.link_drive)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-slate-500 hover:bg-slate-200 hover:text-green-700"
                          title="Abrir carpeta Drive"
                        >
                          <IconFolder size={14} />
                        </a>
                      )}
                    </span>
                  </div>
                </td>
                {visibleColumns.map((col) => {
                  const inst = w.instrumentacion || "";
                  let count = 0;
                  if (inst) {
                    if (col.id === "Perc") {
                      let percTotalForWork = 0;
                      const timpMatch = inst.match(/Timp\.\s*(?:\+(\d+))?/i);
                      if (timpMatch) {
                        const extra = parseInt(timpMatch[1] || "0", 10) || 0;
                        percTotalForWork += 1 + extra;
                      }
                      const percMatch = inst.match(/Perc(?:\.x(\d+))?/i);
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
                  const convBase =
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
  );
}

export default function InstrumentationAudit({ supabase }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [selectedType, setSelectedType] = useState("Sinfónico");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [dateFrom, setDateFrom] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [dateTo, setDateTo] = useState("");
  const [workFormOpen, setWorkFormOpen] = useState(false);
  const [workFormInitialData, setWorkFormInitialData] = useState({});

  const navigateToRoster = (giraId) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "giras");
    next.set("view", "ROSTER");
    next.set("giraId", String(giraId));
    setSearchParams(next);
  };

  const openWorkForm = (obraId) => {
    setWorkFormInitialData(obraId != null ? { id: obraId } : {});
    setWorkFormOpen(true);
  };
  const closeWorkForm = () => {
    setWorkFormOpen(false);
    setWorkFormInitialData({});
  };

  const organicoSaveTimeoutRef = useRef(null);
  const saveOrganicoValidation = useCallback(
    (programId, payload) => {
      setPrograms((prev) =>
        prev.map((q) =>
          q.id === programId ? { ...q, ...payload } : q,
        ),
      );
      if (organicoSaveTimeoutRef.current)
        clearTimeout(organicoSaveTimeoutRef.current);
      organicoSaveTimeoutRef.current = setTimeout(async () => {
        organicoSaveTimeoutRef.current = null;
        try {
          await supabase
            .from("programas")
            .update(payload)
            .eq("id", programId);
        } catch (e) {
          console.error("Error guardando validación de orgánico:", e);
        }
      }, 500);
    },
    [supabase],
  );
  useEffect(
    () => () => {
      if (organicoSaveTimeoutRef.current)
        clearTimeout(organicoSaveTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: programRows, error: progError } = await supabase
          .from("programas")
          .select(
            "id, nombre_gira, nomenclador, mes_letra, fecha_desde, fecha_hasta, tipo, zona, organico_revisado, organico_comentario",
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
                 obras ( id, titulo, instrumentacion, link_drive, estado, obras_compositores ( rol, compositores ( apellido, nombre ) ) )
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
            _roster: rosterByProgram[p.id] || [],
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto min-w-0">
          <h3 className="text-sm font-bold text-slate-800 shrink-0">
            Auditoría de Instrumentación
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Desde</span>
            <DateInput
              label=""
              value={dateFrom}
              onChange={setDateFrom}
              className="w-28"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Hasta</span>
            <DateInput
              label=""
              value={dateTo}
              onChange={setDateTo}
              className="w-28"
            />
          </div>
          <label className="sr-only">Tipo de programa</label>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-44 shrink-0"
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
          {hasAnyMismatch && (
            <div className="flex items-center gap-1 text-[11px] text-orange-600 shrink-0">
              <IconAlertTriangle size={12} className="shrink-0" />
              <span>Diferencias Req/Conv.</span>
            </div>
          )}
          {loading && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0 ml-auto">
              <IconLoader className="animate-spin" size={14} />
              Cargando...
            </span>
          )}
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

          const convokedNamesByColumn = getConvokedNamesByColumn(p._roster || []);
          const programStyle = getProgramStyle(p.tipo);
          const cardClasses = programStyle?.color
            ? programStyle.color
            : "bg-white text-slate-800 border border-slate-200";

          return (
            <div
              key={p.id}
              className={`rounded-xl shadow-sm overflow-hidden border ${cardClasses}`}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(p.id)}
                className="w-full flex items-stretch gap-3 px-4 py-3 hover:opacity-95 transition-opacity text-left"
              >
                <div className="flex flex-col items-start gap-0.5 min-w-[220px] max-w-xs">
                  <span className="text-xs font-bold truncate">
                    {p.mes_letra
                      ? `${p.mes_letra} | ${p.nomenclador || ""}. ${
                          p.nombre_gira || ""
                        }`
                      : `${p.nomenclador || ""}. ${p.nombre_gira || ""}`}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {fechaDesde || "s/d"}{" "}
                    {fechaHasta && fechaHasta !== fechaDesde
                      ? `→ ${fechaHasta}`
                      : ""}
                    {p.zona ? ` · ${p.zona}` : ""}
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
                                : null;

                            const mismatchStyle = p.organico_revisado
                              ? "bg-blue-100 text-blue-700 border border-blue-300 font-bold rounded"
                              : "bg-orange-500 text-white font-bold rounded";
                            return (
                              <td
                                key={col.id}
                                title={tooltipText ?? undefined}
                                className={`px-1.5 py-1 text-center font-mono cursor-default ${
                                  highlight ? mismatchStyle : "text-slate-800"
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
                            const reqMismatchStyle = p.organico_revisado
                              ? "bg-blue-100 text-blue-700 border border-blue-300 font-bold rounded"
                              : "bg-orange-500 text-white font-bold rounded";

                            return (
                              <td
                                key={col.id}
                                className={`px-1.5 py-1 text-center font-mono ${
                                  highlight ? reqMismatchStyle : "text-slate-800"
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
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToRoster(p.id);
                      }}
                      className="p-2 rounded-lg border border-current opacity-70 hover:opacity-100 transition-opacity"
                      title="Ir a Nómina / Staff"
                    >
                      <IconUsers size={16} />
                    </button>
                    <IconChevronDown
                      size={16}
                      className={`opacity-70 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
              </button>

              {isOpen && (
                <>
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        Validación de Orgánico
                      </span>
                      {p.organico_revisado && (
                        <IconCheckCircle
                          size={14}
                          className="text-blue-600 shrink-0"
                          title="Adaptación validada"
                        />
                      )}
                      {p.organico_comentario && (
                        <span
                          className="text-blue-600 cursor-help"
                          title={p.organico_comentario}
                        >
                          <IconInfo size={14} />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!p.organico_revisado}
                          onChange={(e) =>
                            saveOrganicoValidation(p.id, {
                              organico_revisado: e.target.checked,
                              organico_comentario: p.organico_comentario ?? null,
                            })
                          }
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-medium text-slate-700">
                          Orgánico revisado (adaptación validada)
                        </span>
                      </label>
                      <div className="flex-1 min-w-0">
                        <textarea
                          placeholder="Comentario sobre adaptaciones artísticas (opcional)"
                          value={p.organico_comentario ?? ""}
                          onChange={(e) =>
                            saveOrganicoValidation(p.id, {
                              organico_revisado: p.organico_revisado ?? false,
                              organico_comentario: e.target.value.trim() || null,
                            })
                          }
                          className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                  <ProgramWorksTable
                    program={p}
                    visibleColumns={visibleColumns}
                    convokedAll={convokedAll}
                    requiredPercTotal={requiredPercTotal}
                    convokedPercTotal={convokedPercTotal}
                    required={required}
                    onOpenWorkForm={openWorkForm}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {workFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-1.5 sm:p-2">
          <div className="relative my-4 flex w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl sm:my-6 max-h-[92vh]">
            <div className="flex items-center justify-between shrink-0 px-3 py-2.5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h3 className="text-sm font-bold text-slate-700">
                {workFormInitialData?.id ? "Editar obra" : "Nueva obra"}
              </h3>
              <button
                type="button"
                onClick={closeWorkForm}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0 w-full">
              <WorkForm
                key={`workform-audit-${workFormInitialData?.id ?? "new"}`}
                supabase={supabase}
                formData={workFormInitialData}
                setFormData={(fn) => {
                  if (typeof fn === "function")
                    setWorkFormInitialData((prev) => fn(prev));
                }}
                onSave={(savedId, shouldClose) => {
                  if (shouldClose !== false) closeWorkForm();
                }}
                onCancel={closeWorkForm}
                isNew={!workFormInitialData?.id}
                catalogoInstrumentos={[]}
                context="archive"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

