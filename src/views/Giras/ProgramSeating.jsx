import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  Suspense,
  useCallback,
} from "react";
import {
  IconUsers,
  IconLoader,
  IconSettings,
  IconLayers,
  IconExternalLink,
  IconAlertCircle,
  IconAlertTriangle,
  IconCheckCircle,
  IconFolder,
  IconHistory,
  IconChevronDown,
  IconEdit,
  IconTrash,
  IconDownload,
  IconBulb,
  IconInfo,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import { getInstrumentValue, calculateInstrumentation } from "../../utils/instrumentation";
import {
  ParticellaSelect,
  CreateParticellaModal,
} from "../../components/seating/SeatingControls";
import { exportSeatingToExcel } from "../../utils/seatingExcelExporter";
import { createPortal } from "react-dom";

// Librerías para reporte PDF
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Tooltip por obra: lista las particellas sin asignar (Flauta 1, Oboe 2, etc.) */
function ObraUnassignedTooltip({ parts }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const show = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const update = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [pos]);

  const labels = parts.map((p) =>
    (p.nombre_archivo || p.instrumentos?.instrumento || "Particella").replace(
      /\.(pdf|docx?)$/i,
      ""
    )
  );

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="absolute top-1 right-1 cursor-help"
        role="status"
        aria-label={`Falta asignar: ${labels.join(", ")}`}
      >
        <IconAlertTriangle size={16} className="text-amber-400" />
      </span>
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] -translate-x-1/2 -translate-y-full px-3 py-2 min-w-[140px] max-w-[220px] bg-slate-800 text-white text-xs font-medium rounded-lg shadow-lg border border-slate-700 animate-in fade-in duration-150"
            style={{ top: pos.top, left: pos.left }}
            role="tooltip"
          >
            <div className="font-bold text-amber-300 text-[10px] uppercase tracking-wider mb-1">
              Falta asignar:
            </div>
            <ul className="space-y-0.5">
              {labels.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-800"
              aria-hidden
            />
          </div>,
          document.body
        )}
    </>
  );
}

const EXCLUDED_ROLES = [
  "staff",
  "produccion",
  "producción",
  "chofer",
  "archivo",
  "utilero",
  "asistente",
  "iluminador",
  "iluminacion",
  "sonido",
  "acompañante",
];

// Construye una matriz de atriles a partir de la lista plana de items
// Cada entrada contiene hasta dos músicos: left (lado 0) y right (lado 1)
const buildSeatingStands = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const byAtril = new Map();

  items.forEach((item) => {
    // Compatibilidad: si atril_num/lado vienen nulos (datos viejos),
    // los derivamos desde orden siguiendo la convención matricial.
    const rawOrden =
      item.orden != null ? Number(item.orden) : Number(item?.orden ?? 0);
    const atril =
      item.atril_num != null && !Number.isNaN(Number(item.atril_num))
        ? Number(item.atril_num)
        : Math.floor(rawOrden / 2) + 1;
    const lado =
      item.lado != null && !Number.isNaN(Number(item.lado))
        ? Number(item.lado)
        : rawOrden % 2;

    const key = atril;
    const current = byAtril.get(key) || { atril, left: null, right: null };

    if (lado === 0) current.left = item;
    else if (lado === 1) current.right = item;

    byAtril.set(key, current);
  });

  return Array.from(byAtril.values()).sort((a, b) => a.atril - b.atril);
};

// Helpers nombres de partes (para matching inteligente)
const stripExtension = (name = "") =>
  name.replace(/\.(pdf|docx?)$/i, "").trim();

const getPartLabelFromPart = (part) => {
  if (!part) return "";
  const base =
    part.nombre_archivo ||
    part.instrumentos?.instrumento ||
    "";
  return stripExtension(base);
};

// Elimina tildes/acentos para comparar "Violin" ~ "Violín"
const removeDiacritics = (str = "") =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizePartLabel = (label = "") => {
  const lower = removeDiacritics(label.toLowerCase());
  // Unificamos romanos simples a números: I/II/III/IV -> 1/2/3/4
  const numerized = lower
    .replace(/\biv\b/g, "4")
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\bi\b/g, "1");
  return numerized.replace(/\s+/g, " ").trim();
};

// --- COMPONENTE MÓVIL OPTIMIZADO ---
const MobileSeatingTable = ({
  user,
  obras,
  assignments,
  filteredRoster,
  containers,
  particellas,
  isEditor = false,
  musiciansWithoutParts = new Set(),
}) => {
  // Estado para acordeón
  const [expandedIds, setExpandedIds] = useState(() => {
    const myContainer = containers.find((c) =>
      c.items.some((i) => i.id_musico === user.id),
    );
    return myContainer ? [myContainer.id] : [];
  });

  const toggleContainer = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // --- HELPERS DE TEXTO ---
  const getShortComposer = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1].toUpperCase();
  };

  const getFirstWord = (title) => {
    if (!title) return "";
    const clean = title.replace(/<[^>]*>?/gm, "");
    return clean.split(" ")[0];
  };

  const getPartName = (partId) => {
    if (!partId) return "-";
    const part = particellas.find((p) => p.id === partId);
    if (!part) return "?";

    // Abreviaciones para ahorrar espacio horizontal
    return part.nombre_archivo
      .replace(/Violin/i, "Vln")
      .replace(/Violoncello/i, "Vlc")
      .replace(/Contrabajo/i, "Cb")
      .replace(/Flauta/i, "Fl")
      .replace(/Oboe/i, "Ob")
      .replace(/Clarinete/i, "Cl")
      .replace(/Fagot/i, "Fg")
      .replace(/Corno/i, "Hn")
      .replace(/Trompeta/i, "Tpt")
      .replace(/Trombon/i, "Tbn")
      .replace(/Tuba/i, "Tb")
      .substring(0, 10);
  };

  const showFullTitle = (obra) => {
    alert(`${obra.composer}\n\n${obra.title.replace(/<[^>]*>?/gm, "")}`);
  };

  const windsAndPerc = filteredRoster.filter((m) => {
    const idInstr = String(m.id_instr || "");
    const role = (m.rol_gira || "").toLowerCase();
    const esCuerda = ["01", "02", "03", "04"].includes(idInstr);
    const esSolista = role.includes("solista");
    // Solistas de cuerdas también aparecen en la tabla móvil
    if (esCuerda && esSolista) return true;
    return !esCuerda;
  });

  return (
    <div className="relative w-full border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col h-full">
      <div className="overflow-auto max-h-full">
        <table className="w-full text-left border-collapse">
          {/* --- HEADER --- */}
          <thead className="bg-slate-800 text-white sticky top-0 z-30 shadow-md">
            <tr>
              <th className="p-1 pl-2 w-[32vw] min-w-[110px] max-w-[140px] sticky left-0 z-40 bg-slate-800 border-r border-slate-600 text-[10px] font-bold uppercase tracking-tight align-bottom">
                Grupo / Músico
              </th>
              {obras.map((obra) => (
                <th
                  key={obra.id}
                  onClick={() => showFullTitle(obra)}
                  className="p-1 min-w-[70px] max-w-[80px] border-l border-slate-600 text-center cursor-pointer active:bg-slate-700 align-bottom pb-2"
                >
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] text-slate-400 font-normal truncate">
                      {getShortComposer(obra.composer)}
                    </span>
                    <span className="text-[10px] font-bold text-white truncate mt-0.5">
                      {getFirstWord(obra.title)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {/* --- CUERDAS (ACORDEÓN) --- */}
            {containers.map((c) => {
              const isExpanded = expandedIds.includes(c.id);
              const isMyContainer = c.items.some(
                (i) => i.id_musico === user.id,
              );

              return (
                <React.Fragment key={c.id}>
                  {/* FILA PADRE: NOMBRE GRUPO + ASIGNACIÓN GRUPAL */}
                  <tr
                    onClick={() => toggleContainer(c.id)}
                    className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors border-b border-slate-300"
                  >
                    <td
                      className={`p-1.5 pl-2 sticky left-0 z-20 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isMyContainer ? "bg-amber-100 border-l-4 border-l-amber-500" : "bg-slate-100"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-[10px] text-slate-800 uppercase truncate">
                          {c.nombre}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-slate-500">
                            ({c.items.length})
                          </span>
                          <IconChevronDown
                            size={14}
                            className={`text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Loop Obras (Asignación Contenedor) */}
                    {obras.map((obra) => {
                      const containerPartId =
                        assignments[`C-${c.id}-${obra.obra_id}`];
                      return (
                        <td
                          key={obra.id}
                          className="p-1 border-l border-slate-200 text-center align-middle"
                        >
                          <span className="text-[10px] font-bold text-slate-700 block truncate max-w-[75px]">
                            {getPartName(containerPartId)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* FILAS HIJAS: MÚSICOS (Solo si expandido) */}
                  {isExpanded &&
                    buildSeatingStands(c.items).flatMap(
                      ({ atril, left, right }) => {
                        const rows = [];

                        const pushRow = (item, ladoLabel) => {
                          const isPlaceholder = !item;
                          const musicianId = item?.id_musico;
                          const isMe =
                            !isPlaceholder &&
                            String(musicianId) === String(user.id);
                          const hasNoParts =
                            !isPlaceholder &&
                            musiciansWithoutParts.has(String(musicianId));

                          rows.push(
                            <tr
                              key={`${c.id}-${atril}-${ladoLabel}`}
                              className={`transition-colors ${
                                isPlaceholder
                                  ? "bg-slate-50"
                                  : isEditor && hasNoParts
                                    ? "bg-orange-50 hover:bg-orange-100/80"
                                    : isMe
                                      ? "bg-amber-50"
                                      : "bg-white"
                              }`}
                            >
                              <td
                                className={`p-1 pl-4 sticky left-0 z-20 border-r border-slate-200 border-b border-slate-50 align-middle ${
                                  isMe ? "bg-amber-50" : "bg-white"
                                }`}
                              >
                                <div className="flex flex-col leading-none border-l-2 border-slate-200 pl-2">
                                  <span
                                    className={`text-[10px] font-medium truncate ${
                                      isPlaceholder
                                        ? "text-slate-300 italic"
                                        : isMe
                                          ? "text-amber-900 font-bold"
                                          : "text-slate-600"
                                    }`}
                                  >
                                    {isPlaceholder
                                      ? "Hueco"
                                      : `${item.integrantes?.apellido}, ${item.integrantes?.nombre?.charAt(0)}.`}
                                  </span>
                                  <span className="text-[8px] text-slate-400 mt-0.5">
                                    Atril {atril} · {ladoLabel}
                                  </span>
                                </div>
                              </td>

                              {obras.map((obra) => {
                                if (isPlaceholder) {
                                  return (
                                    <td
                                      key={`${c.id}-${atril}-${ladoLabel}-${obra.id}`}
                                      className="p-1 border-l border-slate-100 border-b border-slate-50 text-center align-middle"
                                    >
                                      <span className="text-[10px] text-slate-200 select-none">
                                        —
                                      </span>
                                    </td>
                                  );
                                }

                                const individualPartId =
                                  assignments[
                                    `M-${musicianId}-${obra.obra_id}`
                                  ];
                                const containerPartId =
                                  assignments[`C-${c.id}-${obra.obra_id}`];
                                const showPart =
                                  individualPartId &&
                                  individualPartId !== containerPartId;

                                return (
                                  <td
                                    key={`${item.id}-${obra.id}-${ladoLabel}`}
                                    className="p-1 border-l border-slate-100 border-b border-slate-50 text-center align-middle"
                                  >
                                    {showPart ? (
                                      <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded truncate max-w-[70px] block mx-auto">
                                        {getPartName(individualPartId)}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-300 select-none">
                                        〃
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>,
                          );
                        };

                        pushRow(left, "Izq");
                        pushRow(right, "Der");

                        return rows;
                      },
                    )}
                </React.Fragment>
              );
            })}

            {/* --- VIENTOS Y PERCUSIÓN (SEPARADOR) --- */}
            {windsAndPerc.length > 0 && (
              <tr className="bg-slate-200">
                <td
                  className="sticky left-0 bg-slate-200 z-20 p-1.5 pl-2 text-[9px] font-bold text-slate-600 border-r border-slate-300 uppercase tracking-wider"
                  colSpan={obras.length + 1}
                >
                  Vientos, Percusión y Solistas
                </td>
              </tr>
            )}

            {windsAndPerc.map((m) => {
              const isMe = String(m.id) === String(user.id);
              const hasNoParts = musiciansWithoutParts.has(String(m.id));
              return (
                <tr
                  key={m.id}
                  className={
                    isEditor && hasNoParts
                      ? "bg-orange-50 hover:bg-orange-100/80"
                      : isMe
                        ? "bg-amber-50"
                        : "even:bg-slate-50/50"
                  }
                >
                  <td
                    className={`p-1 pl-2 sticky left-0 z-20 border-r border-slate-200 align-middle ${isMe ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white"}`}
                  >
                    <div className="flex flex-col leading-none">
                      <span
                        className={`font-bold text-[10px] truncate ${isMe ? "text-amber-900" : "text-slate-800"}`}
                      >
                        {m.apellido}, {m.nombre?.charAt(0)}.
                      </span>
                      <span className="text-[8px] text-slate-400 truncate mt-0.5">
                        {m.instrumentos?.instrumento}
                      </span>
                    </div>
                  </td>
                  {obras.map((obra) => {
                    const partId = assignments[`M-${m.id}-${obra.obra_id}`];
                    return (
                      <td
                        key={`${m.id}-${obra.id}`}
                        className="p-1 border-l border-slate-100 text-center align-middle"
                      >
                        <span className="text-[9px] text-slate-700 font-medium block truncate max-w-[75px]">
                          {getPartName(partId)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- CELDA DE INFO (ESCRITORIO) ---
const ContainerInfoCell = ({ container, myStandInfo }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col h-full justify-start min-w-[140px]">
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex flex-col overflow-hidden">
          <span
            className="font-bold text-[10px] text-indigo-900 truncate uppercase tracking-wider"
            title={container.nombre}
          >
            {container.nombre}
          </span>
          {myStandInfo && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-200 w-fit mt-0.5">
              {myStandInfo}
            </span>
          )}
          {!myStandInfo && container.capacidad && (
            <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded-full border border-slate-200 w-fit mt-0.5">
              {container.items.length}/{container.capacidad}
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full text-left text-[9px] py-1 px-1.5 rounded flex items-center justify-between transition-colors border ${
            expanded
              ? "bg-indigo-100 text-indigo-800 border-indigo-200"
              : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200"
          }`}
        >
          <span className="font-bold">{container.items.length} músicos</span>
          <IconChevronDown
            size={10}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {expanded && (
          <div className="mt-1 space-y-0.5 border-l-2 border-indigo-200 pl-1 ml-1 animate-in slide-in-from-top-1 bg-white/50 rounded-r">
            {container.items.length === 0 && (
              <span className="text-[9px] text-slate-400 italic block pl-1">
                Vacío
              </span>
            )}
            {container.items.map((item, idx) => {
              const standNum = Math.floor(idx / 2) + 1;

              // Definimos si es el final del atril para poner el separador
              const isEndOfDesk =
                idx % 2 === 1 && idx !== container.items.length - 1;

              return (
                <div
                  key={item.id}
                  className={`text-[9px] text-slate-700 truncate leading-tight py-1 flex justify-between px-1 ${
                    isEndOfDesk ? "border-b-2 border-slate-300 mb-2 pb-1" : ""
                  }`}
                >
                  <span>
                    {item.integrantes?.apellido},{" "}
                    {item.integrantes?.nombre?.charAt(0)}.
                  </span>
                  <span className="text-slate-400 text-[8px] ml-1">
                    Atril {standNum}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- LAZY MODALS ---
const SeatingHistoryModal = React.lazy(
  () => import("../../components/seating/SeatingHistoryModal"),
);
const GlobalStringsManager = React.lazy(
  () => import("../../components/seating/GlobalStringsManager"),
);
const AnnualRotationModal = React.lazy(
  () => import("../../components/seating/AnnualRotationModal"),
);
const InstrumentationSummaryModal = React.lazy(
  () => import("../../components/seating/InstrumentationSummaryModal"),
);
const ParticellaDownloadModal = React.lazy(
  () => import("../../components/seating/ParticellaDownloadModal"),
);

export default function ProgramSeating({
  supabase,
  program,
  onBack,
  repertoireBlocks = [],
  onRefreshGira = null,
}) {
  const { isAdmin, isEditor, user } = useAuth();
  const { roster: rawRoster, loading: rosterLoading } = useGiraRoster(
    supabase,
    program,
  );

  const normalizedRoles = (() => {
    const raw = user?.rol_sistema;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
    }
    return [String(raw).toLowerCase().trim()].filter(Boolean);
  })();
  const hasSystemRole = (allowedRoles = []) =>
    normalizedRoles.some((r) => allowedRoles.includes(r));

  const canManageSeating = hasSystemRole(["admin", "editor", "coord_general"]);
  const canDownloadSeatingReports = hasSystemRole(["admin", "editor"]);
  const canSeeInstrumentationBadges = isAdmin || isEditor;

  const [filteredRoster, setFilteredRoster] = useState([]);
  const [particellas, setParticellas] = useState([]);
  const [assignments, setAssignments] = useState({});
   // Sugerencias inteligentes por músico: { [id_musico]: { [id_obra]: id_particella } }
  const [suggestions, setSuggestions] = useState({});
  const [containers, setContainers] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [showInstrumentationModal, setShowInstrumentationModal] =
    useState(false);
  const [showParticellaModal, setShowParticellaModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [instrumentList, setInstrumentList] = useState([]);
  const [createModalInfo, setCreateModalInfo] = useState(null);
  const [fetchedBlocks, setFetchedBlocks] = useState([]);

  // Fetch Obras
  useEffect(() => {
    const fetchRepertoire = async () => {
      if (repertoireBlocks.length === 0 && program?.id) {
        setLoading(true);
        const { data } = await supabase
          .from("programas_repertorios")
          .select(
            `id, orden, nombre, repertorio_obras (id, orden, obras (id, titulo, link_drive, instrumentacion, obras_compositores (rol, compositores (apellido))))`,
          )
          .eq("id_programa", program.id)
          .order("orden");

        if (data) {
          const sortedData = data.map((block) => ({
            ...block,
            repertorio_obras:
              block.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
          }));
          setFetchedBlocks(sortedData);
        }
        setLoading(false);
      }
    };
    fetchRepertoire();
  }, [program.id, repertoireBlocks, supabase]);

  const rawBlocks =
    repertoireBlocks.length > 0 ? repertoireBlocks : fetchedBlocks;

  // Aseguramos orden estable de bloques y de obras dentro de cada bloque
  const effectiveBlocks = (rawBlocks || [])
    .slice()
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map((block) => ({
      ...block,
      repertorio_obras: (block.repertorio_obras || [])
        .slice()
        .sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    }));

  const obras = useMemo(() => {
    if (!effectiveBlocks || effectiveBlocks.length === 0) return [];

    return effectiveBlocks
      .flatMap((block) =>
        (block.repertorio_obras || []).map((ro) => {
          if (!ro.obras) return null;

          const ocList = Array.isArray(ro.obras.obras_compositores)
            ? ro.obras.obras_compositores
            : ro.obras.obras_compositores
              ? [ro.obras.obras_compositores]
              : [];

          const firstEntry =
            ocList.find(
              (oc) => String(oc?.rol || "").toLowerCase().trim() === "compositor",
            ) || null;

          const lastName =
            firstEntry && firstEntry.compositores
              ? firstEntry.compositores.apellido || ""
              : "";

          const compName = lastName || "S/D";
          const title = ro.obras.titulo || "Obra";
          const cleanTitle =
            typeof title === "string"
              ? title.replace(/<[^>]*>?/gm, "")
              : "Obra";

          return {
            id: ro.id,
            obra_id: ro.obras.id,
            link: ro.obras.link_drive,
            title: cleanTitle,
            composer: compName,
            shortTitle: cleanTitle.split(/\s+/).slice(0, 3).join(" "),
            fullTitle: `${compName} - ${cleanTitle}`,
            instrumentacion: ro.obras.instrumentacion || "",
          };
        }),
      )
      .filter(Boolean);
  }, [effectiveBlocks]);

  // Fetch Particellas (Triggered when works change)
  useEffect(() => {
    const fetchParts = async () => {
      if (obras.length === 0) return;
      const workIds = [...new Set(obras.map((o) => o.obra_id))];
      let partsData = [];
      // Chunk para no saturar URL
      for (let i = 0; i < workIds.length; i += 10) {
        const chunk = workIds.slice(i, i + 10);
        const { data } = await supabase
          .from("obras_particellas")
          .select(
            "id, id_obra, nombre_archivo, id_instrumento, url_archivo, instrumentos(id, instrumento)",
          )
          .in("id_obra", chunk);
        if (data) partsData = [...partsData, ...data];
      }
      setParticellas(partsData);
    };
    fetchParts();
  }, [obras, supabase]);

  const otherMusicians = useMemo(() => {
    return filteredRoster.filter((m) => {
      const idInstr = String(m.id_instr || "");
      const role = (m.rol_gira || "").toLowerCase();
      const esCuerda = ["01", "02", "03", "04"].includes(idInstr);
      const esSolista = role.includes("solista");
      // Excepción: solistas de cuerdas también entran en la lista individual
      if (esCuerda && esSolista) return true;
      return !esCuerda;
    });
  }, [filteredRoster]);

  const particellaCounts = useMemo(() => {
    const counts = {};

    // Contamos solo asignaciones visibles en la grilla actual para evitar "x2/x3"
    // inflados por músicos desvinculados o ausentes.
    const visibleKeys = new Set();

    containers.forEach((c) => {
      obras.forEach((obra) => {
        visibleKeys.add(`C-${c.id}-${obra.obra_id}`);
      });
      c.items.forEach((item) => {
        obras.forEach((obra) => {
          visibleKeys.add(`M-${item.id_musico}-${obra.obra_id}`);
        });
      });
    });

    otherMusicians.forEach((m) => {
      obras.forEach((obra) => {
        visibleKeys.add(`M-${m.id}-${obra.obra_id}`);
      });
    });

    visibleKeys.forEach((key) => {
      const partId = assignments[key];
      if (partId) counts[partId] = (counts[partId] || 0) + 1;
    });

    return counts;
  }, [assignments, containers, obras, otherMusicians]);

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
      Str: 0,
    };
  }

  // --- MEMOIZACIÓN CRÍTICA PARA RENDIMIENTO ---
  // Pre-calculamos las opciones disponibles por obra para no filtrar en cada celda
  const availablePartsByWork = useMemo(() => {
    const map = {};
    obras.forEach((o) => {
      map[o.obra_id] = particellas.filter((p) => p.id_obra === o.obra_id);
    });
    return map;
  }, [obras, particellas]);

  const obrasWithInstrumentation = useMemo(() => {
    if (!obras || obras.length === 0) return [];
    return obras.map((obra) => {
      const parts = availablePartsByWork[obra.obra_id] || [];
      const instString =
        obra.instrumentacion || calculateInstrumentation(parts) || "";
      return {
        ...obra,
        instrumentacion_effective: instString,
      };
    });
  }, [obras, availablePartsByWork]);

  const instrumentationRequired = useMemo(() => {
    if (!obrasWithInstrumentation || obrasWithInstrumentation.length === 0)
      return createEmptyInstrumentationMap();
    const acc = createEmptyInstrumentationMap();

    obrasWithInstrumentation.forEach((obra) => {
      const instString = obra.instrumentacion_effective || "";
      if (!instString) return;

      const values = {
        Fl: getInstrumentValue(instString, "fl") || 0,
        Ob: getInstrumentValue(instString, "ob") || 0,
        Cl: getInstrumentValue(instString, "cl") || 0,
        Fg: getInstrumentValue(instString, "bn") || 0,
        Cr: getInstrumentValue(instString, "hn") || 0,
        Tp: getInstrumentValue(instString, "tpt") || 0,
        Tb: getInstrumentValue(instString, "tbn") || 0,
        Tba: getInstrumentValue(instString, "tba") || 0,
        Tim: getInstrumentValue(instString, "timp") || 0,
        Perc: getInstrumentValue(instString, "perc") || 0,
        Har: getInstrumentValue(instString, "harp") || 0,
        Pno: getInstrumentValue(instString, "key") || 0,
        Str: getInstrumentValue(instString, "str") || 0,
      };

      Object.keys(values).forEach((k) => {
        if (values[k] > acc[k]) acc[k] = values[k];
      });
    });

    return acc;
  }, [obrasWithInstrumentation]);

  // Calcula sugerencias para un músico concreto a partir de una asignación reciente
  const updateSuggestionsAfterAssign = useCallback(
    (musicianId, originObraId, partId) => {
      const part = particellas.find(
        (p) => String(p.id) === String(partId),
      );
      if (!part) return;
      const targetLabel = normalizePartLabel(getPartLabelFromPart(part));
      if (!targetLabel) return;

      setSuggestions((prev) => {
        const nextForMusician = {};

        obras.forEach((obra) => {
          const obraId = obra.obra_id;
          if (obraId === originObraId) return;

          const key = `M-${musicianId}-${obraId}`;
          if (assignments[key]) return;

          const available = availablePartsByWork[obraId] || [];
          if (!available.length) return;

          // Si la obra ya tiene todas sus particellas usadas al menos una vez, no sugerimos más
          const hasUnassigned = available.some((p) => !particellaCounts[p.id]);
          if (!hasUnassigned) return;

          const match = available.find((p) => {
            const label = normalizePartLabel(getPartLabelFromPart(p));
            return label === targetLabel;
          });

          if (match) {
            nextForMusician[obraId] = match.id;
          }
        });

        if (Object.keys(nextForMusician).length === 0) {
          const copy = { ...prev };
          delete copy[musicianId];
          return copy;
        }

        return { ...prev, [musicianId]: nextForMusician };
      });
    },
    [obras, availablePartsByWork, particellas, assignments, particellaCounts],
  );

  // Sugerencia basada en nombre de contenedor (cuerdas)
  const getContainerSuggestedPart = useCallback(
    (container, obraId) => {
      const available = availablePartsByWork[obraId] || [];
      if (!available.length) return null;

      // Si la obra ya tiene todas sus particellas usadas al menos una vez, no sugerimos más
      const hasUnassigned = available.some((p) => !particellaCounts[p.id]);
      if (!hasUnassigned) return null;

      const rawName = container?.nombre || "";
      const normalizedContainer = normalizePartLabel(rawName);
      if (!normalizedContainer) return null;

      return (
        available.find((p) => {
          const label = normalizePartLabel(getPartLabelFromPart(p));
          return (
            label === normalizedContainer ||
            label.includes(normalizedContainer) ||
            normalizedContainer.includes(label)
          );
        }) || null
      );
    },
    [availablePartsByWork, particellaCounts],
  );

  useEffect(() => {
    if (program?.id && !rosterLoading) fetchInitialData();
  }, [program.id, rosterLoading, rawRoster]);

  const isString = (id) => ["01", "02", "03", "04"].includes(id);

  const instrumentationConvoked = useMemo(() => {
    const acc = createEmptyInstrumentationMap();
    if (!filteredRoster || filteredRoster.length === 0) return acc;

    filteredRoster.forEach((m) => {
      if (m.estado_gira === "ausente") return;

      const idInstr = String(m.id_instr || "");
      const name = (m.instrumentos?.instrumento || "").toLowerCase();
      const familia = (m.instrumentos?.familia || "").toLowerCase();

      const add = (key) => {
        acc[key] += 1;
      };

      if (["01", "02", "03", "04"].includes(idInstr)) {
        add("Str");
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

      if (familia.includes("cuerd")) {
        add("Str");
      }
    });

    return acc;
  }, [filteredRoster]);

  const normalizeForCompare = (key, value) => {
    if (key === "Str") {
      return value > 0 ? 1 : 0;
    }
    return value || 0;
  };

  const hasInstrumentationMismatch = useMemo(() => {
    const requiredPercTotal =
      (instrumentationRequired.Tim || 0) +
      (instrumentationRequired.Perc || 0);
    const convokedPercTotal =
      (instrumentationConvoked.Tim || 0) +
      (instrumentationConvoked.Perc || 0);

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
      "Str",
    ];
    return keys.some((k) => {
      if (k === "Perc") {
        return (
          normalizeForCompare("Perc", requiredPercTotal) !==
          normalizeForCompare("Perc", convokedPercTotal)
        );
      }
      const r = normalizeForCompare(k, instrumentationRequired[k] || 0);
      const c = normalizeForCompare(k, instrumentationConvoked[k] || 0);
      return r !== c;
    });
  }, [instrumentationRequired, instrumentationConvoked]);

  const hasVacancies = useMemo(
    () => (rawRoster || []).some((r) => !!r.es_simulacion),
    [rawRoster],
  );

  const formatInstrumentationStandard = (map) => {
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
  };

  const renderInstrumentationStandardDiff = (map, otherMap, validatedAdaptation = false) => {
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

    const percTotalThis = (map.Tim || 0) + (map.Perc || 0);
    const percTotalOther = (otherMap.Tim || 0) + (otherMap.Perc || 0);
    const isPercTotalDiff =
      normalizeForCompare("Perc", percTotalThis) !==
      normalizeForCompare("Perc", percTotalOther);

    const isDiff = (key) => {
      if (key === "Tim" || key === "Perc") {
        return isPercTotalDiff;
      }
      return (
        normalizeForCompare(key, map[key] || 0) !==
        normalizeForCompare(key, otherMap[key] || 0)
      );
    };

    const highlightClass = validatedAdaptation
      ? "bg-sky-200 text-sky-800 font-extrabold"
      : "bg-orange-200 text-black font-extrabold";

    const tokenNumber = (value, key) => {
      const diff = isDiff(key);
      const base =
        "inline-flex items-center justify-center rounded-sm px-0.5 py-0 text-[9px] leading-none";
      const diffClass = diff ? highlightClass : "text-slate-700";
      return (
        <span key={key} className={`${base} ${diffClass}`}>
          {value}.
        </span>
      );
    };

    const parts = [];
    // Maderas
    parts.push(tokenNumber(fl, "Fl"));
    parts.push(" ");
    parts.push(tokenNumber(ob, "Ob"));
    parts.push(" ");
    parts.push(tokenNumber(cl, "Cl"));
    parts.push(" ");
    parts.push(tokenNumber(bn, "Fg"));
    // Separador
    parts.push(" - ");
    // Metales
    parts.push(tokenNumber(hn, "Cr"));
    parts.push(" ");
    parts.push(tokenNumber(tpt, "Tp"));
    parts.push(" ");
    parts.push(tokenNumber(tbn, "Tb"));
    parts.push(" ");
    parts.push(tokenNumber(tba, "Tba"));

    // Percusión
    let percStr = "";
    if (hasTimp) {
      percStr = percCount > 0 ? `Timp.+${percCount}` : "Timp";
    } else {
      if (percCount === 1) percStr = "Perc";
      else if (percCount > 1) percStr = `Perc.x${percCount}`;
    }
    if (percStr) {
      parts.push(" - ");
      const diff = isPercTotalDiff;
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[9px] leading-none";
      const diffClass = diff ? highlightClass : "text-slate-700";
      parts.push(
        <span key="perc" className={`${base} ${diffClass}`}>
          {percStr}
        </span>,
      );
    }

    // Hp
    if (harpCount > 0) {
      parts.push(" - ");
      const hpText = harpCount > 1 ? `${harpCount}Hp` : "Hp";
      const diff = isDiff("Har");
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[9px] leading-none";
      const diffClass = diff ? highlightClass : "text-slate-700";
      parts.push(
        <span key="harp" className={`${base} ${diffClass}`}>
          {hpText}
        </span>,
      );
    }

    // Key
    if (keyCount > 0) {
      parts.push(" - ");
      const diff = isDiff("Pno");
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[9px] leading-none";
      const diffClass = diff ? highlightClass : "text-slate-700";
      parts.push(
        <span key="key" className={`${base} ${diffClass}`}>
          Key
        </span>,
      );
    }

    // Str
    if (hasStr) {
      parts.push(" - ");
      const diff = isDiff("Str");
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[10px]";
      const diffClass = diff ? highlightClass : "text-slate-700";
      parts.push(
        <span key="str" className={`${base} ${diffClass}`}>
          Str
        </span>,
      );
    }

    if (parts.length === 0) {
      return <span className="text-slate-400">s/d</span>;
    }

    return <>{parts}</>;
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: instruments } = await supabase
        .from("instrumentos")
        .select("id, instrumento")
        .order("instrumento");
      setInstrumentList(instruments || []);
      // Solo músicos confirmados del roster de la gira (exclusiones de ensamble ya aplicadas en useGiraRoster)
      const musicians = rawRoster.filter(
        (m) =>
          m.estado_gira === "confirmado" &&
          !EXCLUDED_ROLES.includes((m.rol_gira || "musico").toLowerCase()),
      );
      musicians.sort((a, b) => {
        const instrIdA = a.id_instr || "9999";
        const instrIdB = b.id_instr || "9999";
        if (instrIdA !== instrIdB) return instrIdA.localeCompare(instrIdB);
        return (a.apellido || "").localeCompare(b.apellido || "");
      });
      setFilteredRoster(musicians);
      await fetchContainers();

      const { data: assigns } = await supabase
        .from("seating_asignaciones")
        .select("*")
        .eq("id_programa", program.id);
      const finalMap = {};
      assigns?.forEach((row) => {
        const obraId = row.id_obra;
        if (row.id_contenedor)
          finalMap[`C-${row.id_contenedor}-${obraId}`] = row.id_particella;
        else if (row.id_musicos_asignados)
          row.id_musicos_asignados.forEach(
            (mId) => (finalMap[`M-${mId}-${obraId}`] = row.id_particella),
          );
      });
      setAssignments(finalMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContainers = async () => {
    const { data: conts } = await supabase
      .from("seating_contenedores")
      .select("*")
      .eq("id_programa", program.id)
      .order("orden");
    if (conts) {
      const { data: items } = await supabase
        .from("seating_contenedores_items")
        .select("*, integrantes(nombre, apellido, instrumentos(instrumento))")
        .in(
          "id_contenedor",
          conts.map((c) => c.id),
        )
        .order("atril_num", { ascending: true, nullsFirst: true })
        .order("lado", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true });

      // IDs de integrantes confirmados en esta gira (roster ya filtrado por exclusiones de ensamble)
      const confirmedRosterIds = new Set(
        rawRoster
          .filter((m) => m.estado_gira === "confirmado")
          .map((m) => Number(m.id)),
      );

      setContainers(
        conts.map((c) => {
          const containerItems =
            items?.filter((i) => Number(i.id_contenedor) === Number(c.id)) || [];
          // Solo ítems cuyo músico está en el roster confirmado de la gira (no ausentes ni excluidos)
          const presentItems = containerItems.filter((item) =>
            confirmedRosterIds.has(Number(item.id_musico)),
          );

          return {
            ...c,
            items: presentItems,
          };
        }),
      );
    }
  };

  // --- PDF EXPORT (Igual que antes) ---
  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const cleanHTML = (str) =>
        typeof str === "string" ? str.replace(/<[^>]*>?/gm, "") : "";
      const truncate = (str, n) =>
        str && str.length > n ? str.substr(0, n - 1) + "..." : str;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Seating | ${program?.mes_letra || ""} - ${program?.nomenclador || ""}. ${program?.nombre_gira || ""}`,
        14,
        12,
      );
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 16);
      doc.line(14, 18, 196, 18);

      const maxMembers = Math.max(
        ...containers.map((c) => c.items?.length || 0),
        0,
      );
      const containerHeaders = containers.map((c) => c.nombre.toUpperCase());
      const containerBody = [];
      for (let i = 0; i < maxMembers; i++) {
        containerBody.push(
          containers.map((c) => {
            const item = c.items[i];
            if (!item?.integrantes) return "";
            return `${item.integrantes.apellido}, ${item.integrantes.nombre || ""}.`;
          }),
        );
      }

      autoTable(doc, {
        startY: 22,
        head: [containerHeaders],
        body: containerBody,
        theme: "grid",
        styles: { fontSize: 6.5, cellPadding: 0.6, halign: "center" },
        headStyles: { fillColor: [63, 81, 181], textColor: 255, fontSize: 7 },
        margin: { left: 14, right: 14 },
      });

      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Asignación de Particellas", 14, finalY + 8);

      const otherMusicians = filteredRoster.filter(
        (m) => !isString(m.id_instr),
      );
      const tableHeaders = [
        [
          "Músico",
          ...obras.map(
            (o) =>
              `${truncate(cleanHTML(o.composer), 10)}\n${truncate(cleanHTML(o.title), 12)}`,
          ),
        ],
      ];
      const tableBody = otherMusicians.map((m) => {
        const row = [`${m.apellido}, ${m.nombre}`];
        obras.forEach((o) => {
          const pid = assignments[`M-${m.id}-${o.obra_id}`];
          const p = particellas.find((x) => String(x.id) === String(pid));
          row.push(p ? p.nombre_archivo : "-");
        });
        return row;
      });

      autoTable(doc, {
        startY: finalY + 12,
        head: tableHeaders,
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 6,
          cellPadding: 0.8,
          halign: "center",
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [30, 41, 59],
          halign: "center",
          fontSize: 5.5,
        },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [245, 245, 245], halign: "left" },
        },
        margin: { left: 14, right: 14 },
        pageBreak: "avoid",
      });
      doc.save("Seating_Reporte.pdf");
    } catch (err) {
      alert("Error PDF");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportSeatingToExcel(
        supabase,
        program,
        effectiveBlocks,
        filteredRoster,
        assignments,
        containers,
        particellas,
      );
    } catch (err) {
      console.error("Error exportando Excel Seating:", err);
      alert("Error al exportar el Excel de Seating: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Mapa rápido de rol por músico (para distinguir solistas)
  const roleByMusicianId = useMemo(() => {
    const map = {};
    (filteredRoster || []).forEach((m) => {
      const sid = String(m.id);
      map[sid] = m.rol_gira || "";
    });
    return map;
  }, [filteredRoster]);

  // --- MODALS & UPDATES ---
  const openCreateModal = (obraId, defaultInstrId, targetType, targetId) => {
    setCreateModalInfo({ obraId, targetType, targetId, defaultInstrId });
  };

  const handleConfirmCreate = async (instrumentId, name) => {
    if (!createModalInfo) return;
    const { obraId, targetType, targetId } = createModalInfo;
    const { data, error } = await supabase
      .from("obras_particellas")
      .insert({
        id_obra: obraId,
        id_instrumento: instrumentId,
        nombre_archivo: name,
      })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }

    // Optimista local update
    const instrName =
      instrumentList.find((i) => i.id === instrumentId)?.instrumento || "Nuevo";
    setParticellas((prev) => [
      ...prev,
      { ...data, instrumentos: { id: instrumentId, instrumento: instrName } },
    ]);
    handleAssign(targetType, targetId, obraId, data.id);
    setCreateModalInfo(null);
  };

  const handleAssign = async (targetType, targetId, obraId, particellaId) => {
    if (!isEditor) return;
    const key = `${targetType}-${targetId}-${obraId}`;

    // Update local state instantáneamente
    setAssignments((prev) => {
      const copy = { ...prev };
      if (!particellaId) delete copy[key];
      else copy[key] = particellaId;
      return copy;
    });

    // Reset o recalcular sugerencias según el caso
    if (targetType === "M") {
      if (particellaId) {
        updateSuggestionsAfterAssign(targetId, obraId, particellaId);
      } else {
        setSuggestions((prev) => {
          const copy = { ...prev };
          delete copy[targetId];
          return copy;
        });
      }
    }

    // DB Sync
    if (targetType === "C") {
      await supabase.from("seating_asignaciones").delete().match({
        id_programa: program.id,
        id_contenedor: targetId,
        id_obra: obraId,
      });
      if (particellaId)
        await supabase.from("seating_asignaciones").insert({
          id_programa: program.id,
          id_obra: obraId,
          id_particella: particellaId,
          id_contenedor: targetId,
          id_musicos_asignados: null,
        });
    } else {
      const { data: existing } = await supabase
        .from("seating_asignaciones")
        .select("*")
        .eq("id_programa", program.id)
        .eq("id_obra", obraId);
      const updates = [];
      existing?.forEach((row) => {
        if (row.id_musicos_asignados?.includes(targetId)) {
          const newArr = row.id_musicos_asignados.filter(
            (id) => id !== targetId,
          );
          if (newArr.length === 0 && !row.id_contenedor)
            updates.push(
              supabase.from("seating_asignaciones").delete().eq("id", row.id),
            );
          else
            updates.push(
              supabase
                .from("seating_asignaciones")
                .update({ id_musicos_asignados: newArr })
                .eq("id", row.id),
            );
        }
      });
      if (particellaId) {
        const targetRow = existing?.find(
          (r) => r.id_particella === particellaId && !r.id_contenedor,
        );
        if (targetRow) {
          const newArr = [
            ...new Set([...(targetRow.id_musicos_asignados || []), targetId]),
          ];
          updates.push(
            supabase
              .from("seating_asignaciones")
              .update({ id_musicos_asignados: newArr })
              .eq("id", targetRow.id),
          );
        } else {
          updates.push(
            supabase.from("seating_asignaciones").insert({
              id_programa: program.id,
              id_obra: obraId,
              id_particella: particellaId,
              id_musicos_asignados: [targetId],
            }),
          );
        }
      }
      await Promise.all(updates);
    }
  };

  // Músicos sin ninguna partitura asignada en el programa (solo aplicable en modo edición)
  const musiciansWithoutParts = useMemo(() => {
    const without = new Set();
    const allMusicians = [];
    const seen = new Set();

    // Primero, todos los músicos que están en contenedores (cuerdas)
    containers.forEach((c) =>
      c.items.forEach((item) => {
        const sid = String(item.id_musico);
        if (!seen.has(sid)) {
          seen.add(sid);
          allMusicians.push({ id: item.id_musico, container: c });
        }
      }),
    );

    // Luego, músicos que solo existen fuera de contenedores (winds / percusión / solistas fuera de cuerdas)
    otherMusicians.forEach((m) => {
      const sid = String(m.id);
      if (!seen.has(sid)) {
        seen.add(sid);
        allMusicians.push({ id: m.id, container: null });
      }
    });

    allMusicians.forEach(({ id, container }) => {
      const sid = String(id);
      const role = (roleByMusicianId[sid] || "").toLowerCase();
      const isSolista = role.includes("solista");
      let hasAnyPart = false;

      for (const obra of obras) {
        const individualKey = `M-${id}-${obra.obra_id}`;
        if (assignments[individualKey]) {
          hasAnyPart = true;
          break;
        }
        // Para músicos en contenedor, solo contamos la asignación grupal
        // como "tiene partitura" si NO es solista. Un solista debe tener
        // al menos una asignación individual M-{id}-{obra}.
        if (container && !isSolista) {
          const containerKey = `C-${container.id}-${obra.obra_id}`;
          if (assignments[containerKey]) {
            hasAnyPart = true;
            break;
          }
        }
      }

      if (!hasAnyPart) without.add(sid);
    });
    return without;
  }, [containers, otherMusicians, obras, assignments]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <CreateParticellaModal
        isOpen={!!createModalInfo}
        onClose={() => setCreateModalInfo(null)}
        onConfirm={handleConfirmCreate}
        instrumentList={instrumentList}
        defaultInstrumentId={createModalInfo?.defaultInstrId}
      />

      {(loading || rosterLoading || isExporting) && (
        <div className="absolute inset-0 bg-white/80 z-[60] flex flex-col items-center justify-center gap-2">
          <IconLoader className="animate-spin text-indigo-600" size={32} />
          {isExporting && (
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest animate-pulse">
              Generando Reporte...
            </span>
          )}
        </div>
      )}

      <Suspense fallback={null}>
        {showHistory && (
          <SeatingHistoryModal
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            roster={filteredRoster}
            supabase={supabase}
          />
        )}
        {showRotationModal && (
          <AnnualRotationModal
            isOpen={showRotationModal}
            onClose={() => setShowRotationModal(false)}
            currentProgram={program}
            roster={rawRoster}
            supabase={supabase}
          />
        )}
        {showInstrumentationModal && (
          <InstrumentationSummaryModal
            isOpen={showInstrumentationModal}
            onClose={() => setShowInstrumentationModal(false)}
            works={obrasWithInstrumentation}
            required={instrumentationRequired}
            convoked={instrumentationConvoked}
            roster={filteredRoster}
            programId={program?.id}
            supabase={supabase}
            organicoRevisado={!!program?.organico_revisado}
            organicoComentario={program?.organico_comentario ?? null}
            onOrganicoSave={onRefreshGira}
          />
        )}
        {showParticellaModal && (
          <ParticellaDownloadModal
            isOpen={showParticellaModal}
            onClose={() => setShowParticellaModal(false)}
            supabase={supabase}
            program={program}
            obras={obras}
            assignments={assignments}
            containers={containers}
            particellas={particellas}
            rawRoster={rawRoster}
          />
        )}
      </Suspense>

      <div className="px-4 py-2 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <IconUsers className="text-indigo-600" />
          <span>Seating & Particellas</span>
          {canSeeInstrumentationBadges && obras.length > 0 && (() => {
            const organicoRevisado = !!program?.organico_revisado;
            const organicoComentario = program?.organico_comentario ?? null;
            const badgeBaseClass =
              organicoRevisado
                ? "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200"
                : hasInstrumentationMismatch
                  ? "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
                  : hasVacancies
                    ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
            return (
              <div className="flex flex-wrap items-center gap-1 ml-3">
                {organicoRevisado && (
                  <IconCheckCircle size={14} className="text-sky-600 shrink-0" title="Adaptación validada" />
                )}
                {organicoComentario && (
                  <span className="text-sky-600 cursor-help shrink-0" title={organicoComentario}>
                    <IconInfo size={14} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowInstrumentationModal(true)}
                  className={`px-2 py-0 rounded-full text-[10px] font-semibold border transition-colors max-w-[260px] truncate ${badgeBaseClass}`}
                  title={formatInstrumentationStandard(instrumentationRequired)}
                >
                  <span className="mr-1">Req:</span>
                  {renderInstrumentationStandardDiff(
                    instrumentationRequired,
                    instrumentationConvoked,
                    organicoRevisado,
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstrumentationModal(true)}
                  className={`px-2 py-0 rounded-full text-[10px] font-semibold border transition-colors max-w-[260px] truncate ${badgeBaseClass}`}
                  title={formatInstrumentationStandard(instrumentationConvoked)}
                >
                  <span className="mr-1">Conv:</span>
                  {renderInstrumentationStandardDiff(
                    instrumentationConvoked,
                    instrumentationRequired,
                    organicoRevisado,
                  )}
                </button>
              </div>
            );
          })()}
        </h2>
        <div className="flex gap-2">
          {canDownloadSeatingReports && (
            <>
              <button
                onClick={handleExportReport}
                disabled={isExporting}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <IconDownload size={16} />{" "}
                <span className="hidden sm:inline">Reporte</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <IconDownload size={16} />{" "}
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={() => setShowParticellaModal(true)}
                disabled={isExporting}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all bg-slate-800 text-white hover:bg-slate-900 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <IconDownload size={16} />
                <IconLayers size={14} />
                <span className="hidden sm:inline">Descargar Particellas</span>
              </button>
            </>
          )}
          {(isEditor || canManageSeating) && (
            <>
              <button
                onClick={() => setShowRotationModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm"
              >
                <IconLayers size={16} />{" "}
                <span className="hidden sm:inline">Rotación</span>
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
              >
                <IconHistory size={16} />{" "}
                <span className="hidden sm:inline">Historial</span>
              </button>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${showConfig ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                <IconSettings size={16} /> {isEditor ? "Cuerdas" : "Ver Grupos"}
              </button>
            </>
          )}
          <button
            onClick={onBack}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 ml-4"
          >
            ← Volver
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2 md:p-4 flex flex-col">
        <Suspense
          fallback={
            <div className="p-4 text-center text-slate-400">Cargando...</div>
          }
        >
          {showConfig && (isEditor || canManageSeating) && (
            <GlobalStringsManager
              programId={program.id}
              roster={filteredRoster}
              containers={containers}
              onUpdate={fetchContainers}
              supabase={supabase}
              readOnly={!isEditor}
            />
          )}
        </Suspense>

        {/* --- VISTA MÓVIL --- */}
        <div className="md:hidden flex-1 overflow-hidden">
          <MobileSeatingTable
            user={user}
            obras={obras}
            assignments={assignments}
            filteredRoster={filteredRoster}
            containers={containers}
            particellas={particellas}
            isEditor={isEditor}
            musiciansWithoutParts={musiciansWithoutParts}
          />
        </div>

        {/* --- VISTA ESCRITORIO (OPTIMIZADA) --- */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-auto max-h-full">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px] table-fixed">
            <thead className="bg-slate-800 text-white font-bold sticky top-0 z-30 shadow-md">
              <tr>
                <th className="p-2 w-48 sticky left-0 bg-slate-800 z-40 border-r border-slate-600 pl-4">
                  Contenedor / Músico
                </th>
                {obras.map((obra) => {
                  // Pre-cálculo para el header (Unassigned Warning / Complete)
                  const obraParts = availablePartsByWork[obra.obra_id] || [];
                  const unassignedParts = obraParts.filter(
                    (p) => !particellaCounts[p.id],
                  );
                  const hasUnassigned = unassignedParts.length > 0;
                  const hasParts = obraParts.length > 0;

                  return (
                    <th
                      key={obra.id}
                      className="p-1 w-32 border-l border-slate-600 align-bottom relative group"
                    >
                      <div className="flex flex-col gap-0.5 items-center w-full pb-1 overflow-hidden">
                        {/* Carpeta (solo edición) */}
                        {isEditor && (
                          <div className="mb-0.5">
                            {obra.link ? (
                              <a
                                href={obra.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-white transition-colors"
                                title="Abrir carpeta de la obra"
                              >
                                <IconFolder size={14} />
                              </a>
                            ) : (
                              <span
                                className="text-slate-500/60"
                                title="Sin carpeta asignada"
                              >
                                <IconFolder size={14} />
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                          <span className="text-[9px] uppercase tracking-wide truncate">
                            {obra.composer}
                          </span>
                          {obra.link && !isEditor && (
                            <a
                              href={obra.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-300 hover:text-white"
                            >
                              <IconExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <div
                          className="text-[10px] font-bold text-white leading-tight text-center px-1 mb-1 w-full truncate"
                          title={obra.title}
                          dangerouslySetInnerHTML={{ __html: obra.title }}
                        />
                        {/* Indicador integridad (solo edición): check verde si completo, triángulo si falta asignar */}
                        {isEditor && (
                          <div className="absolute top-1 right-1">
                            {hasUnassigned ? (
                              <ObraUnassignedTooltip parts={unassignedParts} />
                            ) : hasParts ? (
                              <span
                                className="text-emerald-400"
                                title="Particellas asignadas"
                                aria-label="Particellas asignadas"
                              >
                                <IconCheckCircle size={16} />
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* CUERDAS */}
              {containers.length > 0 && (
                <>
                  <tr className="bg-indigo-50/50">
                    <td
                      colSpan={obras.length + 1}
                      className="p-1 px-4 text-[10px] font-bold text-indigo-800 uppercase"
                    >
                      Sección de Cuerdas
                    </td>
                  </tr>
                  {containers.map((c) => {
                    const isMyContainer = c.items.some(
                      (i) => i.id_musico === user.id,
                    );
                    const myStandText = isMyContainer ? "Tu lugar" : null;
                    // Para marcar el contenedor en naranja, solo consideramos
                    // integrantes no solistas que realmente no tienen ninguna partitura.
                    const hasNoParts = c.items.some((i) => {
                      const sid = String(i.id_musico);
                      const role = (roleByMusicianId[sid] || "").toLowerCase();
                      if (role.includes("solista")) return false;
                      return musiciansWithoutParts.has(sid);
                    });
                    const hasContainerSuggestions =
                      isEditor &&
                      obras.some((obra) => {
                        const currentVal =
                          assignments[`C-${c.id}-${obra.obra_id}`];
                        if (currentVal) return false;
                        const available =
                          availablePartsByWork[obra.obra_id] || [];
                        if (!available.length) return false;
                        const hasUnassigned = available.some(
                          (p) => !particellaCounts[p.id],
                        );
                        if (!hasUnassigned) return false;
                        return !!getContainerSuggestedPart(c, obra.obra_id);
                      });
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors group ${
                          isEditor && hasNoParts
                            ? "bg-orange-50 hover:bg-orange-100/80"
                            : isMyContainer
                              ? "bg-amber-50"
                              : "hover:bg-indigo-50/30"
                        }`}
                      >
                        <td
                          className={`p-2 sticky left-0 border-r border-slate-200 z-20 pl-4 align-top ${isEditor && hasNoParts ? "bg-orange-50" : isMyContainer ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white group-hover:bg-indigo-50/30"}`}
                        >
                          <div className="flex items-start gap-2">
                            {isEditor && hasNoParts && (
                              <span
                                title="Sin partitura asignada"
                                className="shrink-0 text-orange-500 mt-0.5"
                              >
                                <IconAlertCircle size={14} />
                              </span>
                            )}
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <ContainerInfoCell
                                container={c}
                                myStandInfo={myStandText}
                              />
                              {hasContainerSuggestions && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    for (const obra of obras) {
                                      const obraId = obra.obra_id;
                                      const key = `C-${c.id}-${obraId}`;
                                      if (assignments[key]) continue;
                                      const suggested =
                                        getContainerSuggestedPart(
                                          c,
                                          obraId,
                                        );
                                      if (suggested) {
                                        // eslint-disable-next-line no-await-in-loop
                                        await handleAssign(
                                          "C",
                                          c.id,
                                          obraId,
                                          suggested.id,
                                        );
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[9px] font-semibold border border-amber-200 hover:bg-amber-100 self-start"
                                >
                                  <IconBulb
                                    size={12}
                                    className="text-amber-500"
                                  />
                                  Aceptar todas
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        {obras.map((obra) => {
                          const currentVal =
                            assignments[`C-${c.id}-${obra.obra_id}`];
                          // Usamos la lista memoizada
                          const availableParts =
                            availablePartsByWork[obra.obra_id] || [];
                          const suggestedPart =
                            !currentVal && c.items.length > 0
                              ? getContainerSuggestedPart(c, obra.obra_id)
                              : null;

                          return (
                            <td
                              key={`${c.id}-${obra.id}`}
                              className={`p-1 border-l border-slate-100 relative align-top ${isMyContainer ? "bg-amber-50" : "bg-slate-50/30"}`}
                            >
                              {isEditor ? (
                                <div className="flex flex-col gap-1 items-stretch">
                                  <ParticellaSelect
                                    options={availableParts}
                                    value={currentVal}
                                    onChange={(val) =>
                                      handleAssign("C", c.id, obra.obra_id, val)
                                    }
                                    onRequestCreate={() =>
                                      openCreateModal(
                                        obra.obra_id,
                                        "00",
                                        "C",
                                        c.id,
                                      )
                                    }
                                    disabled={false}
                                    placeholder="Asignar"
                                    preferredInstrumentId={c.id_instrumento}
                                    counts={particellaCounts}
                                  />
                                  {suggestedPart && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAssign(
                                          "C",
                                          c.id,
                                          obra.obra_id,
                                          suggestedPart.id,
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-medium border border-amber-200 max-w-[90px] mx-auto hover:bg-amber-200 transition-colors"
                                    >
                                      <IconBulb
                                        size={12}
                                        className="text-amber-500"
                                      />
                                      <span className="truncate">
                                        {getPartLabelFromPart(suggestedPart)}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                /* LECTURA OPTIMIZADA: Texto plano */
                                <div className="flex items-center justify-center h-full px-2">
                                  <span
                                    className="text-xs text-slate-700 truncate"
                                    title={
                                      currentVal
                                        ? availableParts.find(
                                            (p) => p.id === currentVal,
                                          )?.nombre_archivo
                                        : ""
                                    }
                                  >
                                    {currentVal
                                      ? availableParts.find(
                                          (p) => p.id === currentVal,
                                        )?.nombre_archivo
                                      : "-"}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
              {/* VIENTOS */}
              {otherMusicians.length > 0 && (
                <>
                  <tr className="bg-slate-100/50">
                    <td
                      colSpan={obras.length + 1}
                      className="p-1 px-4 text-[10px] font-bold text-slate-600 uppercase"
                    >
                      Vientos, Percusión y Solistas
                    </td>
                  </tr>
                  {otherMusicians.map((m) => {
                    const isMe = String(m.id) === String(user.id);
                    const hasNoParts = musiciansWithoutParts.has(String(m.id));
                    const musicianSuggestions = suggestions[m.id] || {};
                    const hasSuggestions =
                      Object.keys(musicianSuggestions).length > 0;
                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors group ${
                          isEditor && hasNoParts
                            ? "bg-orange-50 hover:bg-orange-100/80"
                            : isMe
                              ? "bg-amber-50"
                              : "hover:bg-slate-50"
                        }`}
                      >
                        <td
                          className={`p-2 sticky left-0 border-r border-slate-200 z-20 pl-4 align-top ${isEditor && hasNoParts ? "bg-orange-50" : isMe ? "bg-amber-50 border-l-4 border-l-amber-400" : "bg-white group-hover:bg-slate-50"}`}
                        >
                          <div className="flex items-start gap-2">
                            {isEditor && hasNoParts && (
                              <span
                                title="Sin partitura asignada"
                                className="shrink-0 text-orange-500 mt-0.5"
                              >
                                <IconAlertCircle size={14} />
                              </span>
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span
                                className={`font-bold truncate text-xs ${isMe ? "text-amber-900" : "text-slate-700"}`}
                              >
                                {m.apellido}, {m.nombre}
                              </span>
                              <span className="text-[9px] text-slate-400 truncate">
                                {m.instrumentos?.instrumento}{" "}
                                {m.rol_gira && m.rol_gira !== "musico" && (
                                  <span className="text-amber-600">
                                    ({m.rol_gira})
                                  </span>
                                )}
                              </span>
                              {isEditor && hasSuggestions && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const entries = Object.entries(
                                      musicianSuggestions,
                                    );
                                    for (const [obraId, partId] of entries) {
                                      // obraId viene como string en el objeto
                                      await handleAssign(
                                        "M",
                                        m.id,
                                        Number(obraId),
                                        partId,
                                      );
                                    }
                                    setSuggestions((prev) => {
                                      const copy = { ...prev };
                                      delete copy[m.id];
                                      return copy;
                                    });
                                  }}
                                  className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[9px] font-semibold border border-amber-200 hover:bg-amber-100 self-start"
                                >
                                  <IconBulb
                                    size={12}
                                    className="text-amber-500"
                                  />
                                  Aceptar todas
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        {obras.map((obra) => {
                          const currentVal =
                            assignments[`M-${m.id}-${obra.obra_id}`];
                          const availableParts =
                            availablePartsByWork[obra.obra_id] || [];
                          const hasRealPartForInstrument = availableParts.some(
                            (p) =>
                              String(p.id_instrumento) ===
                              String(m.id_instr),
                          );
                          const suggestedPartId =
                            musicianSuggestions[obra.obra_id];
                          const suggestedPart = suggestedPartId
                            ? availableParts.find(
                                (p) => p.id === suggestedPartId,
                              )
                            : null;

                          const bgClass = !hasRealPartForInstrument
                            ? "bg-slate-100"
                            : isMe
                              ? "bg-amber-50"
                              : "";

                          return (
                            <td
                              key={`${m.id}-${obra.id}`}
                              className={`p-1 border-l border-slate-100 relative align-top ${bgClass}`}
                            >
                              {isEditor ? (
                                <div className="flex flex-col gap-1 items-stretch">
                                  <ParticellaSelect
                                    options={availableParts}
                                    value={currentVal}
                                    onChange={(val) =>
                                      handleAssign(
                                        "M",
                                        m.id,
                                        obra.obra_id,
                                        val,
                                      )
                                    }
                                    onRequestCreate={() =>
                                      openCreateModal(
                                        obra.obra_id,
                                        m.id_instr,
                                        "M",
                                        m.id,
                                      )
                                    }
                                    disabled={false}
                                    placeholder="Asignar"
                                    preferredInstrumentId={m.id_instr}
                                    counts={particellaCounts}
                                  />
                                  {!currentVal && suggestedPart && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await handleAssign(
                                          "M",
                                          m.id,
                                          obra.obra_id,
                                          suggestedPart.id,
                                        );
                                        setSuggestions((prev) => {
                                          const prevFor =
                                            prev[m.id] || {};
                                          const {
                                            [obra.obra_id]: _,
                                            ...restFor
                                          } = prevFor;
                                          const copy = { ...prev };
                                          if (Object.keys(restFor).length) {
                                            copy[m.id] = restFor;
                                          } else {
                                            delete copy[m.id];
                                          }
                                          return copy;
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-medium border border-amber-200 max-w-[90px] mx-auto hover:bg-amber-200 transition-colors"
                                    >
                                      <IconBulb
                                        size={12}
                                        className="text-amber-500"
                                      />
                                      <span className="truncate">
                                        {getPartLabelFromPart(suggestedPart)}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full px-2">
                                  <span
                                    className="text-xs text-slate-700 truncate"
                                    title={
                                      currentVal
                                        ? availableParts.find(
                                            (p) => p.id === currentVal,
                                          )?.nombre_archivo
                                        : ""
                                    }
                                  >
                                    {currentVal
                                      ? availableParts.find(
                                          (p) => p.id === currentVal,
                                        )?.nombre_archivo
                                      : "-"}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
