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
  IconMenu,
  IconPlus,
  IconX,
  IconTrash,
  IconDownload,
  IconBulb,
  IconInfo,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import {
  calculateInstrumentation,
  calculateInstrumentationFromSeatingAssignments,
  calculateInstrumentationCountsFromParts,
  getInstrumentationUnassignedFamilies,
  getInstrumentationConsolidatedFamilies,
  computeInstrumentationRequiredConsolidated,
  maxInstrumentationColumnMap,
  getEffectiveRequiredColumnMap,
  instrumentationColumnMapToString,
  getPercComparableTotal,
  formatPercussionLabel,
  countsTowardInstrumentationConvoked,
  rosterHasInstrumentationMembers,
  getInstrumentationBadgeBaseClass,
} from "../../utils/instrumentation";
import {
  ParticellaSelect,
  CreateParticellaModal,
} from "../../components/seating/SeatingControls";
import { exportSeatingToExcel } from "../../utils/seatingExcelExporter";
import {
  seatingItemMatrixPosition,
  sortSeatingItems,
} from "../../services/giraService";
import {
  confirmedSeatingRosterKeySet,
  isConfirmedConvocadoForSeatingReports,
  isMusicianOnConfirmedSeatingRoster,
} from "../../utils/seatingRosterGate";
import {
  didParseCellSeatingStringsStandPairs,
  seatingStringsGridEvenRowCount,
} from "../../utils/seatingPdfStringsTableHooks";
import { dedupeSeatingStringItems } from "../../utils/seatingStringItemsDedupe";
import {
  seatingPartsRepresentSameSlot,
  getPercussionSeatingFamily,
} from "../../utils/drivePartMatcher";
import {
  buildSeatingPartSortOptions,
  sortWindMusiciansForSeating,
} from "../../utils/seatingWindOrder";
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

// Construye una matriz de atriles a partir de la lista plana de items
// Cada entrada contiene hasta dos músicos: left (lado 0) y right (lado 1)
const buildSeatingStands = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const byAtril = new Map();

  items.forEach((item, idx) => {
    // Compatibilidad: matriz (atril_num, lado) o `orden` (1-based nuevo o legado 0-based).
    const { atril_num: atril, lado } = seatingItemMatrixPosition(item, idx);
    if (atril == null || lado == null) return;

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

const getMusicianSeatingTooltip = (musician) => {
  if (!musician) return "";
  const ensembles = Array.isArray(musician.ensambles)
    ? musician.ensambles
        .map((ens) => ens?.ensamble)
        .filter(Boolean)
        .filter((name) => name.trim().toLowerCase() !== "producción")
        .sort((a, b) => {
          const aIsCf = a.trim().toUpperCase().startsWith("CF");
          const bIsCf = b.trim().toUpperCase().startsWith("CF");
          if (aIsCf === bIsCf) return a.localeCompare(b, "es");
          return aIsCf ? 1 : -1;
        })
        .join(", ")
    : "";
  const residence =
    musician?._loc_residencia?.localidad || musician?.residencia?.localidad || "";
  const tooltipParts = [];
  if (ensembles) tooltipParts.push(ensembles);
  if (residence) tooltipParts.push(`(${residence})`);
  return tooltipParts.join(" ");
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

const getMusicianPartIds = (musicianAssignments, key) => {
  const ids = musicianAssignments?.[key];
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id, index) =>
      id &&
      ids.findIndex((candidate) => String(candidate) === String(id)) === index,
  );
};

const MultiParticellaSelect = ({
  options,
  values = [],
  onSlotChange,
  onRequestCreate,
  preferredInstrumentId,
  counts,
  compact = false,
}) => {
  const [extraSlots, setExtraSlots] = useState(0);
  const filledCount = values.length;
  const slotCount = Math.max(1, filledCount + extraSlots);
  const hasEmptyTrailing = slotCount > filledCount;

  useEffect(() => {
    setExtraSlots(0);
  }, [filledCount]);

  const handleSlotChange = (slotIndex, value) => {
    if (
      value &&
      values.some(
        (existing, index) =>
          index !== slotIndex && String(existing) === String(value),
      )
    ) {
      return;
    }
    onSlotChange(slotIndex, value);
    if (value && slotIndex >= filledCount) {
      setExtraSlots(0);
    }
  };

  const handleRemoveSlot = (slotIndex) => {
    onSlotChange(slotIndex, null);
    if (slotIndex >= filledCount) {
      setExtraSlots((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="flex flex-col gap-1 items-stretch">
      {Array.from({ length: slotCount }).map((_, slotIndex) => (
        <div key={slotIndex} className="flex items-stretch gap-1">
          <div className="min-w-0 flex-1">
            <ParticellaSelect
              options={options}
              value={values[slotIndex] || null}
              onChange={(val) => handleSlotChange(slotIndex, val)}
              onRequestCreate={() => onRequestCreate?.(slotIndex)}
              disabled={false}
              placeholder={slotIndex === 0 ? "Asignar" : `${slotIndex + 1}a parte`}
              preferredInstrumentId={preferredInstrumentId}
              counts={counts}
            />
          </div>
          {slotIndex === 0 ? (
            <button
              type="button"
              onClick={() => setExtraSlots((prev) => prev + 1)}
              disabled={hasEmptyTrailing}
              className={`${compact ? "w-7" : "w-8"} min-h-[24px] shrink-0 inline-flex items-center justify-center rounded border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-default transition-colors`}
              title="Asociar otra parte"
              aria-label="Asociar otra parte"
            >
              <IconPlus size={compact ? 12 : 14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleRemoveSlot(slotIndex)}
              className={`${compact ? "w-7" : "w-8"} min-h-[24px] shrink-0 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors`}
              title="Quitar parte"
              aria-label="Quitar parte"
            >
              <IconX size={compact ? 12 : 14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// --- COMPONENTE MÓVIL OPTIMIZADO ---
const MobileSeatingTable = ({
  user,
  obras,
  assignments,
  musicianAssignments = {},
  filteredRoster,
  windMusicians = [],
  containers,
  particellas,
  isEditor = false,
  availablePartsByWork = {},
  particellaCounts = {},
  onAssign,
  onMusicianSlotAssign,
  onRequestCreate,
  musiciansWithoutParts = new Set(),
  musicianTooltipById = {},
}) => {
  // Estado para acordeón
  const [expandedIds, setExpandedIds] = useState(() => {
    const myContainer = containers.find((c) =>
      c.items.some((i) => i.id_musico === user.id),
    );
    return myContainer ? [myContainer.id] : [];
  });
  const [editingObraId, setEditingObraId] = useState(null);

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

  const getCompactTitle = (title) => {
    if (!title) return "";
    const clean = title.replace(/<[^>]*>?/gm, "");
    return clean.replace(/\s+/g, " ").trim();
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
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 9);
  };

  const showFullTitle = (obra) => {
    alert(`${obra.composer}\n\n${obra.title.replace(/<[^>]*>?/gm, "")}`);
  };

  const windsAndPerc = windMusicians;

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
              {obras.map((obra) => {
                const isEditingThisWork =
                  isEditor && editingObraId === obra.obra_id;
                return (
                  <th
                    key={obra.id}
                    className={`p-0.5 min-w-[72px] max-w-[84px] border-l border-slate-600 text-center align-bottom pb-1 ${
                      isEditingThisWork ? "bg-indigo-700" : ""
                    }`}
                  >
                    <div className="flex flex-col leading-none gap-0.5">
                      <button
                        type="button"
                        onClick={() => showFullTitle(obra)}
                        className="min-w-0 active:bg-slate-700 rounded"
                      >
                        <span className="text-[8px] text-slate-400 font-normal truncate block">
                          {getShortComposer(obra.composer)}
                        </span>
                        <span className="text-[10px] font-bold text-white truncate mt-0.5 block max-w-[78px] mx-auto">
                          {getCompactTitle(obra.title)}
                        </span>
                      </button>
                      {isEditor && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingObraId((current) =>
                              current === obra.obra_id ? null : obra.obra_id,
                            )
                          }
                          className={`mx-auto inline-flex items-center justify-center gap-0.5 rounded-full border px-1 py-0 text-[8px] font-bold transition-colors ${
                            isEditingThisWork
                              ? "bg-white text-indigo-700 border-white"
                              : "bg-slate-700 text-slate-100 border-slate-500 hover:bg-slate-600"
                          }`}
                          title={
                            isEditingThisWork
                              ? "Cerrar edición"
                              : "Editar seating de esta obra"
                          }
                        >
                          <IconEdit size={10} />
                          <span className="sr-only">
                            {isEditingThisWork ? "Cerrar edición" : "Editar"}
                          </span>
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
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
                      const isEditingThisWork =
                        isEditor && editingObraId === obra.obra_id;
                      const availableParts =
                        availablePartsByWork[obra.obra_id] || [];
                      return (
                        <td
                          key={obra.id}
                          onClick={(event) => {
                            if (isEditingThisWork) event.stopPropagation();
                          }}
                          className="p-1 border-l border-slate-200 text-center align-middle"
                        >
                          {isEditingThisWork ? (
                            <ParticellaSelect
                              options={availableParts}
                              value={containerPartId}
                              onChange={(val) =>
                                onAssign?.("C", c.id, obra.obra_id, val)
                              }
                              onRequestCreate={() =>
                                onRequestCreate?.(
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
                          ) : (
                            <span className="text-[10px] font-bold text-slate-700 block truncate max-w-[75px]">
                              {getPartName(containerPartId)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* FILAS HIJAS: MÚSICOS (Solo si expandido) */}
                  {isExpanded &&
                    buildSeatingStands(sortSeatingItems(c.items || [])).flatMap(
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
                                    title={
                                      isPlaceholder
                                        ? ""
                                        : musicianTooltipById[musicianId] || ""
                                    }
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

                                const musicianKey = `M-${musicianId}-${obra.obra_id}`;
                                const containerPartId =
                                  assignments[`C-${c.id}-${obra.obra_id}`];
                                const individualPartIds = getMusicianPartIds(
                                  musicianAssignments,
                                  musicianKey,
                                );
                                const showPart =
                                  individualPartIds.length > 0 &&
                                  individualPartIds.some(
                                    (partId) =>
                                      String(partId) !== String(containerPartId),
                                  );

                                return (
                                  <td
                                    key={`${item.id}-${obra.id}-${ladoLabel}`}
                                    className="p-1 border-l border-slate-100 border-b border-slate-50 text-center align-middle"
                                  >
                                    {showPart ? (
                                      <span className="text-[8px] leading-none text-indigo-600 font-bold bg-indigo-50 px-0.5 rounded truncate whitespace-nowrap max-w-[82px] block mx-auto">
                                        {individualPartIds
                                          .filter(
                                            (partId) =>
                                              String(partId) !==
                                              String(containerPartId),
                                          )
                                          .map(getPartName)
                                          .join("+")}
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

                        pushRow(left, "Afuera");
                        pushRow(right, "Adentro");

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
                        title={musicianTooltipById[m.id] || ""}
                      >
                        {m.apellido}, {m.nombre?.charAt(0)}.
                      </span>
                      <span className="text-[8px] text-slate-400 truncate mt-0.5">
                        {m.instrumentos?.instrumento}
                      </span>
                    </div>
                  </td>
                  {obras.map((obra) => {
                    const key = `M-${m.id}-${obra.obra_id}`;
                    const partIds = getMusicianPartIds(musicianAssignments, key);
                    const isEditingThisWork =
                      isEditor && editingObraId === obra.obra_id;
                    const availableParts =
                      availablePartsByWork[obra.obra_id] || [];
                    return (
                      <td
                        key={`${m.id}-${obra.id}`}
                        className="p-1 border-l border-slate-100 text-center align-middle"
                      >
                        {isEditingThisWork ? (
                          <MultiParticellaSelect
                            options={availableParts}
                            values={partIds}
                            onSlotChange={(slotIndex, val) =>
                              onMusicianSlotAssign?.(
                                m.id,
                                obra.obra_id,
                                val,
                                slotIndex,
                              )
                            }
                            onRequestCreate={(slotIndex) =>
                              onRequestCreate?.(
                                obra.obra_id,
                                m.id_instr,
                                "M",
                                m.id,
                                slotIndex,
                              )
                            }
                            preferredInstrumentId={m.id_instr}
                            counts={particellaCounts}
                            compact
                          />
                        ) : (
                          <span className="text-[8px] leading-none text-slate-700 font-medium block truncate whitespace-nowrap max-w-[82px]">
                            {partIds.map(getPartName).join("+") || "-"}
                          </span>
                        )}
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
const ContainerInfoCell = ({ container, myStandInfo, musicianTooltipById }) => {
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
            {(() => {
              const sorted = sortSeatingItems(container.items || []);
              return sorted.map((item, idx) => {
                const pos = seatingItemMatrixPosition(item, idx);
                const standNum = pos.atril_num ?? 1;
                const isEndOfDesk =
                  pos.lado === 1 && idx !== sorted.length - 1;

                return (
                  <div
                    key={item.id}
                    className={`text-[9px] text-slate-700 truncate leading-tight py-1 flex justify-between px-1 ${
                      isEndOfDesk ? "border-b-2 border-slate-300 mb-2 pb-1" : ""
                    }`}
                  >
                    <span title={musicianTooltipById?.[item.id_musico] || ""}>
                      {item.integrantes?.apellido},{" "}
                      {item.integrantes?.nombre?.charAt(0)}.
                    </span>
                    <span className="text-slate-400 text-[8px] ml-1">
                      Atril {standNum}
                    </span>
                  </div>
                );
              });
            })()}
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
  canAccessStringsConfig = false,
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
  const canViewStringsConfig = canManageSeating || canAccessStringsConfig;
  const canEditStringsConfig = isEditor || canAccessStringsConfig;

  const [filteredRoster, setFilteredRoster] = useState([]);
  const [particellas, setParticellas] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [musicianAssignments, setMusicianAssignments] = useState({});
  const [containers, setContainers] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [showInstrumentationModal, setShowInstrumentationModal] =
    useState(false);
  const [showParticellaModal, setShowParticellaModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAcceptingAllSuggestions, setIsAcceptingAllSuggestions] =
    useState(false);
  const [instrumentList, setInstrumentList] = useState([]);
  const [createModalInfo, setCreateModalInfo] = useState(null);
  const [fetchedBlocks, setFetchedBlocks] = useState([]);
  const [showMobileActionsMenu, setShowMobileActionsMenu] = useState(false);
  const mobileActionsMenuRef = useRef(null);
  const musicianTooltipById = useMemo(() => {
    const map = {};
    (filteredRoster || []).forEach((m) => {
      map[m.id] = getMusicianSeatingTooltip(m);
    });
    return map;
  }, [filteredRoster]);

  useEffect(() => {
    if (!showMobileActionsMenu) return undefined;
    const handleClickOutside = (event) => {
      if (
        mobileActionsMenuRef.current &&
        !mobileActionsMenuRef.current.contains(event.target)
      ) {
        setShowMobileActionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileActionsMenu]);

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
    const filtered = filteredRoster.filter((m) => {
      const idInstr = String(m.id_instr || "");
      const role = (m.rol_gira || "").toLowerCase();
      const esCuerda = ["01", "02", "03", "04"].includes(idInstr);
      const esSolista = role.includes("solista");
      // Excepción: solistas de cuerdas también entran en la lista individual
      if (esCuerda && esSolista) return true;
      return !esCuerda;
    });
    return sortWindMusiciansForSeating(
      filtered,
      buildSeatingPartSortOptions({
        obras,
        musicianAssignments,
        particellas,
      }),
    );
  }, [filteredRoster, obras, musicianAssignments, particellas]);

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
      if (key.startsWith("M-")) {
        getMusicianPartIds(musicianAssignments, key).forEach((partId) => {
          counts[partId] = (counts[partId] || 0) + 1;
        });
        return;
      }
      const partId = assignments[key];
      if (partId) counts[partId] = (counts[partId] || 0) + 1;
    });

    return counts;
  }, [assignments, musicianAssignments, containers, obras, otherMusicians]);

  const assignedPartIdsByObra = useMemo(() => {
    const byObra = {};
    obras.forEach((obra) => {
      byObra[obra.obra_id] = new Set();
    });

    otherMusicians.forEach((m) => {
      obras.forEach((obra) => {
        const key = `M-${m.id}-${obra.obra_id}`;
        getMusicianPartIds(musicianAssignments, key).forEach((partId) => {
          byObra[obra.obra_id].add(String(partId));
        });
      });
    });

    containers.forEach((c) => {
      obras.forEach((obra) => {
        const partId = assignments[`C-${c.id}-${obra.obra_id}`];
        if (partId) byObra[obra.obra_id].add(String(partId));
      });
    });

    return byObra;
  }, [assignments, musicianAssignments, containers, obras, otherMusicians]);

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

  /** Sugerencias bombilla (IconBulb) por músico: derivadas siempre de assignations + obras. Para cada celda vacía se usa la etiqueta de parte de la obra más cercana en el programa donde ese músico ya tiene asignación (primero columnas anteriores, luego posteriores). Así una obra nueva muestra sugerencia sin tener que re-asignar en la sesión. */
  const derivedMusicianSuggestions = useMemo(() => {
    const result = {};

    otherMusicians.forEach((m) => {
      const forMusician = {};
      const musicianId = m.id;

      obras.forEach((targetObra, tIdx) => {
        const targetObraId = targetObra.obra_id;
        const targetKey = `M-${musicianId}-${targetObraId}`;
        if (getMusicianPartIds(musicianAssignments, targetKey).length > 0) return;

        const available = availablePartsByWork[targetObraId] || [];
        if (!available.length) return;

        const assignedInObra = assignedPartIdsByObra[targetObraId] || new Set();
        const hasUnassigned = available.some(
          (p) => !assignedInObra.has(String(p.id)),
        );
        if (!hasUnassigned) return;

        const beforeReversed = obras.slice(0, tIdx).reverse();
        const after = obras.slice(tIdx + 1);
        const candidateObras = [...beforeReversed, ...after];

        for (const cand of candidateObras) {
          const candKey = `M-${musicianId}-${cand.obra_id}`;
          const partId = getMusicianPartIds(musicianAssignments, candKey)[0];
          if (!partId) continue;
          const part = particellas.find((p) => String(p.id) === String(partId));
          if (!part) continue;
          if (getPercussionSeatingFamily(part) === "aux") continue;
          const match = available.find(
            (p) =>
              !assignedInObra.has(String(p.id)) &&
              seatingPartsRepresentSameSlot(part, p),
          );
          if (match) {
            forMusician[targetObraId] = match.id;
            break;
          }
        }
      });

      if (Object.keys(forMusician).length > 0) {
        result[musicianId] = forMusician;
      }
    });

    return result;
  }, [
    otherMusicians,
    obras,
    assignments,
    musicianAssignments,
    particellas,
    availablePartsByWork,
    assignedPartIdsByObra,
  ]);

  const obrasWithInstrumentation = useMemo(() => {
    if (!obras || obras.length === 0) return [];
    return obras.map((obra) => {
      const parts = availablePartsByWork[obra.obra_id] || [];
      const partsColumnMap = calculateInstrumentationCountsFromParts(parts);
      const unassignedFamilies = getInstrumentationUnassignedFamilies(
        parts,
        particellaCounts,
      );
      const fromAssignments = calculateInstrumentationFromSeatingAssignments({
        obraId: obra.obra_id,
        containers,
        assignments,
        musicianAssignments,
        particellas,
      });

      let instString = "";
      let consolidatedFamilies = [];
      let effectiveColumnMap = partsColumnMap;

      if (fromAssignments.hasAssignments) {
        consolidatedFamilies = getInstrumentationConsolidatedFamilies(
          partsColumnMap,
          fromAssignments.columnMap,
          unassignedFamilies,
        );
        effectiveColumnMap = getEffectiveRequiredColumnMap(
          partsColumnMap,
          fromAssignments.columnMap,
          unassignedFamilies,
          consolidatedFamilies,
        );
        instString = instrumentationColumnMapToString(effectiveColumnMap);
      } else {
        instString = calculateInstrumentation(parts) || "";
      }

      return {
        ...obra,
        instrumentacion_effective: instString,
        instrumentation_effective_column_map: effectiveColumnMap,
        instrumentation_consolidated_families: consolidatedFamilies,
        instrumentation_unassigned_families: unassignedFamilies,
        instrumentation_from_assignments: fromAssignments.hasAssignments,
        instrumentation_parts_column_map: partsColumnMap,
        instrumentation_assigned_column_map: fromAssignments.hasAssignments
          ? fromAssignments.columnMap
          : null,
      };
    });
  }, [
    obras,
    availablePartsByWork,
    containers,
    assignments,
    musicianAssignments,
    particellas,
    particellaCounts,
  ]);

  const instrumentationRequired = useMemo(
    () =>
      maxInstrumentationColumnMap(
        obrasWithInstrumentation.map(
          (obra) => obra.instrumentation_effective_column_map,
        ),
      ),
    [obrasWithInstrumentation],
  );

  const instrumentationPartsMax = useMemo(
    () =>
      maxInstrumentationColumnMap(
        obrasWithInstrumentation.map((obra) => obra.instrumentation_parts_column_map),
      ),
    [obrasWithInstrumentation],
  );

  // Sugerencia basada en nombre de contenedor (cuerdas)
  const getContainerSuggestedPart = useCallback(
    (container, obraId) => {
      const available = availablePartsByWork[obraId] || [];
      if (!available.length) return null;

      const assignedInObra = assignedPartIdsByObra[obraId] || new Set();
      const hasUnassigned = available.some(
        (p) => !assignedInObra.has(String(p.id)),
      );
      if (!hasUnassigned) return null;

      const rawName = container?.nombre || "";
      const normalizedContainer = normalizePartLabel(rawName);
      if (!normalizedContainer) return null;

      return (
        available.find((p) => {
          if (assignedInObra.has(String(p.id))) return false;
          if (seatingPartsRepresentSameSlot({ nombre_archivo: rawName }, p))
            return true;
          const label = normalizePartLabel(getPartLabelFromPart(p));
          return (
            label === normalizedContainer ||
            label.includes(normalizedContainer) ||
            normalizedContainer.includes(label)
          );
        }) || null
      );
    },
    [availablePartsByWork, assignedPartIdsByObra],
  );

  const pendingParticellaSuggestionsCount = useMemo(() => {
    if (!isEditor) return 0;
    let count = 0;
    containers.forEach((c) => {
      if (!c.items?.length) return;
      obras.forEach((obra) => {
        const obraId = obra.obra_id;
        if (assignments[`C-${c.id}-${obraId}`]) return;
        if (getContainerSuggestedPart(c, obraId)) count += 1;
      });
    });
    otherMusicians.forEach((m) => {
      const suggestions = derivedMusicianSuggestions[m.id] || {};
      obras.forEach((obra) => {
        const obraId = obra.obra_id;
        if (getMusicianPartIds(musicianAssignments, `M-${m.id}-${obraId}`).length > 0)
          return;
        if (suggestions[obraId]) count += 1;
      });
    });
    return count;
  }, [
    isEditor,
    containers,
    obras,
    assignments,
    musicianAssignments,
    getContainerSuggestedPart,
    derivedMusicianSuggestions,
    otherMusicians,
  ]);

  useEffect(() => {
    if (program?.id && !rosterLoading) fetchInitialData();
  }, [program.id, rosterLoading, rawRoster]);

  const isString = (id) => ["01", "02", "03", "04"].includes(id);

  const instrumentationConvoked = useMemo(() => {
    const acc = createEmptyInstrumentationMap();
    if (!filteredRoster || filteredRoster.length === 0) return acc;

    filteredRoster.forEach((m) => {
      if (m.estado_gira === "ausente") return;
      if (!countsTowardInstrumentationConvoked(m.rol_gira)) return;

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

  const showInstrumentationBadges =
    canSeeInstrumentationBadges &&
    (obras.length > 0 || rosterHasInstrumentationMembers(filteredRoster));

  const instrumentationRequiredConsolidated = useMemo(
    () =>
      computeInstrumentationRequiredConsolidated(
        instrumentationRequired,
        instrumentationConvoked,
        instrumentationPartsMax,
      ),
    [
      instrumentationPartsMax,
      instrumentationRequired,
      instrumentationConvoked,
    ],
  );

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

    const harpCount = map.Har || 0;
    const keyCount = map.Pno || 0;
    const hasStr = (map.Str || 0) > 0;

    const percTotal = (map.Tim || 0) + (map.Perc || 0);
    let standardStr = `${fl}.${ob}.${cl}.${bn} - ${hn}.${tpt}.${tbn}.${tba}`;

    const percStr = formatPercussionLabel(percTotal);
    if (percStr) standardStr += ` - ${percStr}`;

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

  const renderInstrumentationStandardDiff = (
    displayMap,
    requiredMap,
    convokedMap,
    validatedAdaptation = false,
    consolidatedFamilies = {},
    showConsolidatedHighlight = false,
    skipDiffHighlight = false,
  ) => {
    const fl = displayMap.Fl || 0;
    const ob = displayMap.Ob || 0;
    const cl = displayMap.Cl || 0;
    const bn = displayMap.Fg || 0;
    const hn = displayMap.Cr || 0;
    const tpt = displayMap.Tp || 0;
    const tbn = displayMap.Tb || 0;
    const tba = displayMap.Tba || 0;

    const harpCount = displayMap.Har || 0;
    const keyCount = displayMap.Pno || 0;
    const hasStr = (displayMap.Str || 0) > 0;

    const displayPercTotal = (displayMap.Tim || 0) + (displayMap.Perc || 0);
    const requiredPercTotal =
      (requiredMap.Tim || 0) + (requiredMap.Perc || 0);
    const convokedPercTotal =
      (convokedMap.Tim || 0) + (convokedMap.Perc || 0);

    const getRequiredCount = (key) => {
      if (key === "Tim" || key === "Perc") {
        return requiredPercTotal;
      }
      return normalizeForCompare(key, requiredMap[key] || 0);
    };

    const getConvokedCount = (key) => {
      if (key === "Tim" || key === "Perc") {
        return convokedPercTotal;
      }
      return normalizeForCompare(key, convokedMap[key] || 0);
    };

    const isRequiredDifferentFromConvoked = (key) =>
      getRequiredCount(key) !== getConvokedCount(key);

    const isConsolidatedMatch = (key) =>
      getRequiredCount(key) === getConvokedCount(key) &&
      getRequiredCount(key) > 0 &&
      consolidatedFamilies[key];

    const highlightClass = validatedAdaptation
      ? "bg-sky-200 text-sky-800 font-extrabold"
      : "bg-orange-200 text-black font-extrabold";
    const consolidatedClass =
      "bg-violet-200 text-violet-900 font-extrabold";

    const tokenClass = (key, showConsolidatedHighlight = false) => {
      if (skipDiffHighlight) return "text-slate-700";
      if (isRequiredDifferentFromConvoked(key)) return highlightClass;
      if (showConsolidatedHighlight && isConsolidatedMatch(key)) {
        return consolidatedClass;
      }
      return "text-slate-700";
    };

    const tokenNumber = (value, key) => {
      const base =
        "inline-flex items-center justify-center rounded-sm px-0.5 py-0 text-[9px] leading-none";
      return (
        <span
          key={key}
          className={`${base} ${tokenClass(key, showConsolidatedHighlight)}`}
        >
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
    const percStr = formatPercussionLabel(displayPercTotal);
    if (percStr) {
      parts.push(" - ");
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[9px] leading-none";
      parts.push(
        <span
          key="perc"
          className={`${base} ${tokenClass("Perc", showConsolidatedHighlight)}`}
        >
          {percStr}
        </span>,
      );
    }

    // Hp
    if (harpCount > 0) {
      parts.push(" - ");
      const hpText = harpCount > 1 ? `${harpCount}Hp` : "Hp";
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[9px] leading-none";
      parts.push(
        <span
          key="harp"
          className={`${base} ${tokenClass("Har", showConsolidatedHighlight)}`}
        >
          {hpText}
        </span>,
      );
    }

    // Key
    if (keyCount > 0) {
      parts.push(" - ");
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[9px] leading-none";
      parts.push(
        <span
          key="key"
          className={`${base} ${tokenClass("Pno", showConsolidatedHighlight)}`}
        >
          Key
        </span>,
      );
    }

    // Str
    if (hasStr) {
      parts.push(" - ");
      const base =
        "inline-flex items-center justify-center rounded px-0.5 text-[10px]";
      parts.push(
        <span
          key="str"
          className={`${base} ${tokenClass("Str", showConsolidatedHighlight)}`}
        >
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
      // Misma regla que informes PDF/Excel y GiraRoster (confirmado + roles de línea)
      const musicians = rawRoster.filter(isConfirmedConvocadoForSeatingReports);
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
        .eq("id_programa", program.id)
        .order("id", { ascending: true });
      const finalMap = {};
      const musicianMap = {};
      assigns?.forEach((row) => {
        const obraId = row.id_obra;
        if (row.id_contenedor) {
          finalMap[`C-${row.id_contenedor}-${obraId}`] = row.id_particella;
        } else if (row.id_musicos_asignados) {
          row.id_musicos_asignados.forEach((mId) => {
            const key = `M-${mId}-${obraId}`;
            if (!musicianMap[key]) musicianMap[key] = [];
            if (
              !musicianMap[key].some(
                (partId) => String(partId) === String(row.id_particella),
              )
            ) {
              musicianMap[key].push(row.id_particella);
            }
          });
        }
      });
      setAssignments(finalMap);
      setMusicianAssignments(musicianMap);
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

      const rosterKeys = confirmedSeatingRosterKeySet(rawRoster);
      const dedupedItems = dedupeSeatingStringItems(items || [], conts);

      setContainers(
        conts.map((c) => {
          const containerItems =
            dedupedItems.filter((i) => Number(i.id_contenedor) === Number(c.id)) || [];
          const presentItems = containerItems.filter((item) =>
            isMusicianOnConfirmedSeatingRoster(rosterKeys, item.id_musico),
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

      const rawMaxMembers = Math.max(
        ...containers.map((c) => c.items?.length || 0),
        0,
      );
      const maxMembers = seatingStringsGridEvenRowCount(rawMaxMembers);
      const containerHeaders = containers.map((c) => c.nombre.toUpperCase());
      const containerBody = [];
      for (let i = 0; i < maxMembers; i++) {
        containerBody.push(
          containers.map((c) => {
            const sorted = sortSeatingItems(c.items || []);
            const item = sorted[i];
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
        didParseCell: didParseCellSeatingStringsStandPairs,
      });

      const finalY = doc.lastAutoTable.finalY;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Asignación de Particellas", 14, finalY + 8);

      const otherMusicians = sortWindMusiciansForSeating(
        filteredRoster.filter((m) => !isString(m.id_instr)),
        buildSeatingPartSortOptions({
          obras,
          musicianAssignments,
          particellas,
        }),
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
          const partIds = getMusicianPartIds(
            musicianAssignments,
            `M-${m.id}-${o.obra_id}`,
          );
          const labels = partIds
            .map((pid) => particellas.find((x) => String(x.id) === String(pid)))
            .filter(Boolean)
            .map((p) => p.nombre_archivo);
          row.push(labels.length > 0 ? labels.join(" + ") : "-");
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
        musicianAssignments,
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
  const openCreateModal = (
    obraId,
    defaultInstrId,
    targetType,
    targetId,
    targetSlot = 0,
  ) => {
    setCreateModalInfo({
      obraId,
      targetType,
      targetId,
      targetSlot,
      defaultInstrId,
    });
  };

  const handleConfirmCreate = async (instrumentId, name) => {
    if (!createModalInfo) return;
    const { obraId, targetType, targetId, targetSlot } = createModalInfo;
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
    if (targetType === "M") {
      handleMusicianSlotAssign(
        targetId,
        obraId,
        data.id,
        Number(targetSlot) || 0,
      );
    } else {
      handleAssign(targetType, targetId, obraId, data.id);
    }
    setCreateModalInfo(null);
  };

  const handleAcceptAllParticellaSuggestions = async () => {
    if (!isEditor || pendingParticellaSuggestionsCount === 0) return;
    setIsAcceptingAllSuggestions(true);
    try {
      for (const c of containers) {
        if (!c.items?.length) continue;
        for (const obra of obras) {
          const obraId = obra.obra_id;
          if (assignments[`C-${c.id}-${obraId}`]) continue;
          const suggested = getContainerSuggestedPart(c, obraId);
          if (suggested) {
            // eslint-disable-next-line no-await-in-loop
            await handleAssign("C", c.id, obraId, suggested.id);
          }
        }
      }
      for (const m of otherMusicians) {
        const suggestions = derivedMusicianSuggestions[m.id] || {};
        for (const obra of obras) {
          const obraId = obra.obra_id;
          if (getMusicianPartIds(musicianAssignments, `M-${m.id}-${obraId}`).length > 0)
            continue;
          const partId = suggestions[obraId];
          if (partId) {
            // eslint-disable-next-line no-await-in-loop
            await handleAssign("M", m.id, obraId, partId);
          }
        }
      }
    } finally {
      setIsAcceptingAllSuggestions(false);
    }
  };

  const handleAssign = async (targetType, targetId, obraId, particellaId) => {
    if (targetType === "M") {
      await handleMusicianSlotAssign(targetId, obraId, particellaId, 0);
      return;
    }
    await handleContainerAssign(targetId, obraId, particellaId);
  };

  const handleMusicianSlotAssign = async (
    targetId,
    obraId,
    particellaId,
    slotIndex = 0,
  ) => {
    if (!isEditor) return;
    const key = `M-${targetId}-${obraId}`;
    const prev = [...(musicianAssignments[key] || [])];
    let next = [...prev];

    if (particellaId == null) {
      if (slotIndex < next.length) next.splice(slotIndex, 1);
    } else {
      while (next.length <= slotIndex) next.push(null);
      next = next.map((id, index) =>
        index !== slotIndex && id && String(id) === String(particellaId)
          ? null
          : id,
      );
      next[slotIndex] = particellaId;
      next = next.filter(Boolean);
    }

    const nextPartIds = next.filter(
      (id, index) =>
        id &&
        next.findIndex((candidate) => String(candidate) === String(id)) ===
          index,
    );

    setMusicianAssignments((prevState) => {
      const copy = { ...prevState };
      if (nextPartIds.length === 0) delete copy[key];
      else copy[key] = nextPartIds;
      return copy;
    });

    const { data: existing } = await supabase
      .from("seating_asignaciones")
      .select("*")
      .eq("id_programa", program.id)
      .eq("id_obra", obraId);

    const updates = [];
    const rowTargets = new Map();
    (existing || [])
      .filter((row) => !row.id_contenedor)
      .forEach((row) => {
        const ids = row.id_musicos_asignados || [];
        if (ids.some((id) => String(id) === String(targetId))) {
          rowTargets.set(
            row.id,
            ids.filter((id) => String(id) !== String(targetId)),
          );
        }
      });

    nextPartIds.forEach((partId) => {
      const targetRow = existing?.find(
        (row) =>
          !row.id_contenedor && String(row.id_particella) === String(partId),
      );
      if (targetRow) {
        const baseIds =
          rowTargets.get(targetRow.id) ||
          (targetRow.id_musicos_asignados || []).filter(
            (id) => String(id) !== String(targetId),
          );
        rowTargets.set(targetRow.id, [...new Set([...baseIds, targetId])]);
      } else {
        updates.push(
          supabase.from("seating_asignaciones").insert({
            id_programa: program.id,
            id_obra: obraId,
            id_particella: partId,
            id_musicos_asignados: [targetId],
          }),
        );
      }
    });

    (existing || [])
      .filter((row) => !row.id_contenedor && rowTargets.has(row.id))
      .forEach((row) => {
        const nextIds = rowTargets.get(row.id) || [];
        if (nextIds.length === 0) {
          updates.push(
            supabase.from("seating_asignaciones").delete().eq("id", row.id),
          );
        } else {
          updates.push(
            supabase
              .from("seating_asignaciones")
              .update({ id_musicos_asignados: nextIds })
              .eq("id", row.id),
          );
        }
      });
    await Promise.all(updates);
  };

  const handleContainerAssign = async (targetId, obraId, particellaId) => {
    if (!isEditor) return;
    const key = `C-${targetId}-${obraId}`;

    setAssignments((prev) => {
      const copy = { ...prev };
      if (!particellaId) delete copy[key];
      else copy[key] = particellaId;
      return copy;
    });

    await supabase.from("seating_asignaciones").delete().match({
      id_programa: program.id,
      id_contenedor: targetId,
      id_obra: obraId,
    });
    if (particellaId) {
      await supabase.from("seating_asignaciones").insert({
        id_programa: program.id,
        id_obra: obraId,
        id_particella: particellaId,
        id_contenedor: targetId,
        id_musicos_asignados: null,
      });
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
        if (getMusicianPartIds(musicianAssignments, individualKey).length > 0) {
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
  }, [containers, otherMusicians, obras, assignments, musicianAssignments]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <CreateParticellaModal
        isOpen={!!createModalInfo}
        onClose={() => setCreateModalInfo(null)}
        onConfirm={handleConfirmCreate}
        instrumentList={instrumentList}
        defaultInstrumentId={createModalInfo?.defaultInstrId}
      />

      {(loading || rosterLoading || isExporting || isAcceptingAllSuggestions) && (
        <div className="absolute inset-0 bg-white/80 z-[60] flex flex-col items-center justify-center gap-2">
          <IconLoader className="animate-spin text-indigo-600" size={32} />
          {isExporting && (
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest animate-pulse">
              Generando Reporte...
            </span>
          )}
          {isAcceptingAllSuggestions && (
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest animate-pulse">
              Aplicando sugerencias...
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

      <div className="px-2 sm:px-4 py-1.5 sm:py-2 border-b border-slate-200 bg-white flex items-start md:items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 pt-1 md:pt-0">
          <IconUsers size={18} className="text-indigo-600 shrink-0" />
          <span className="truncate">Seating & Particellas</span>
          {showInstrumentationBadges && (() => {
            const organicoRevisado = !!program?.organico_revisado;
            const organicoComentario = program?.organico_comentario ?? null;
            const hasWorks = obras.length > 0;
            const badgeBaseClass = getInstrumentationBadgeBaseClass({
              hasWorks,
              organicoRevisado,
              mismatch: hasInstrumentationMismatch,
              hasVacancies,
            });
            return (
              <div className="hidden md:flex flex-wrap items-center gap-1 ml-3">
                {organicoRevisado && (
                  <IconCheckCircle size={14} className="text-sky-600 shrink-0" title="Adaptación validada" />
                )}
                {organicoComentario && (
                  <span className="text-sky-600 cursor-help shrink-0" title={organicoComentario}>
                    <IconInfo size={14} />
                  </span>
                )}
                {obras.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowInstrumentationModal(true)}
                    className={`px-2 py-0 rounded-full text-[10px] font-semibold border transition-colors max-w-[260px] truncate ${badgeBaseClass}`}
                    title={formatInstrumentationStandard(instrumentationRequired)}
                  >
                    <span className="mr-1">Req:</span>
                    {renderInstrumentationStandardDiff(
                      instrumentationRequired,
                      instrumentationRequired,
                      instrumentationConvoked,
                      organicoRevisado,
                      instrumentationRequiredConsolidated,
                      true,
                    )}
                  </button>
                )}
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
                    instrumentationConvoked,
                    organicoRevisado,
                    undefined,
                    false,
                    !hasWorks,
                  )}
                </button>
              </div>
            );
          })()}
        </h2>
        <div className="relative shrink-0 md:hidden" ref={mobileActionsMenuRef}>
          <button
            type="button"
            onClick={() => setShowMobileActionsMenu((current) => !current)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center justify-between gap-1.5 transition-colors bg-slate-800 text-white hover:bg-slate-900 shadow-sm"
            aria-expanded={showMobileActionsMenu}
            aria-haspopup="menu"
          >
            <span className="inline-flex items-center gap-2">
              <IconMenu size={16} />
              Menú Seating
            </span>
            <IconChevronDown
              size={14}
              className={`transition-transform ${showMobileActionsMenu ? "rotate-180" : ""}`}
            />
          </button>
          {showMobileActionsMenu && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95"
              role="menu"
            >
              {showInstrumentationBadges && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileActionsMenu(false);
                    setShowInstrumentationModal(true);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 ${
                    hasInstrumentationMismatch && obras.length > 0
                      ? "text-orange-700"
                      : "text-slate-700"
                  }`}
                  role="menuitem"
                >
                  <IconAlertTriangle
                    size={16}
                    className={
                      hasInstrumentationMismatch && obras.length > 0
                        ? "text-orange-500"
                        : "text-slate-500"
                    }
                  />
                  Comparativo Seating
                </button>
              )}
              {isEditor && pendingParticellaSuggestionsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileActionsMenu(false);
                    handleAcceptAllParticellaSuggestions();
                  }}
                  disabled={
                    isAcceptingAllSuggestions || loading || isExporting
                  }
                  className="w-full px-3 py-2.5 text-left text-xs font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-2 border-b border-slate-100"
                  role="menuitem"
                >
                  {isAcceptingAllSuggestions ? (
                    <IconLoader className="animate-spin" size={16} />
                  ) : (
                    <IconBulb size={16} className="text-amber-500" />
                  )}
                  Aceptar sugerencias
                </button>
              )}
              {canDownloadSeatingReports && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileActionsMenu(false);
                      handleExportReport();
                    }}
                    disabled={isExporting}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 border-b border-slate-100"
                    role="menuitem"
                  >
                    <IconDownload size={16} className="text-indigo-600" />
                    Descargar reporte PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileActionsMenu(false);
                      handleExportExcel();
                    }}
                    disabled={isExporting}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 border-b border-slate-100"
                    role="menuitem"
                  >
                    <IconDownload size={16} className="text-emerald-600" />
                    Descargar Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileActionsMenu(false);
                      setShowParticellaModal(true);
                    }}
                    disabled={isExporting}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 border-b border-slate-100"
                    role="menuitem"
                  >
                    <IconLayers size={16} className="text-slate-700" />
                    Descargar particellas
                  </button>
                </>
              )}
              {canViewStringsConfig && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileActionsMenu(false);
                      setShowRotationModal(true);
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                    role="menuitem"
                  >
                    <IconLayers size={16} className="text-emerald-600" />
                    Rotación de cuerdas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileActionsMenu(false);
                      setShowHistory(!showHistory);
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                    role="menuitem"
                  >
                    <IconHistory size={16} className="text-indigo-600" />
                    {showHistory ? "Ocultar historial" : "Ver historial"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileActionsMenu(false);
                      setShowConfig(!showConfig);
                    }}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                    role="menuitem"
                  >
                    <IconSettings size={16} className="text-slate-600" />
                    {showConfig
                      ? "Ocultar configuración de cuerdas"
                      : isEditor
                        ? "Configurar cuerdas"
                        : "Ver grupos de cuerdas"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowMobileActionsMenu(false);
                  onBack();
                }}
                className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-2"
                role="menuitem"
              >
                ← Volver
              </button>
            </div>
          )}
        </div>
        <div className="hidden md:flex md:w-auto gap-2 overflow-visible">
          {isEditor && pendingParticellaSuggestionsCount > 0 && (
            <button
              type="button"
              onClick={handleAcceptAllParticellaSuggestions}
              disabled={
                isAcceptingAllSuggestions || loading || isExporting
              }
              className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 shadow-sm disabled:opacity-50 shrink-0"
              title={`${pendingParticellaSuggestionsCount} sugerencia${pendingParticellaSuggestionsCount === 1 ? "" : "s"} pendiente${pendingParticellaSuggestionsCount === 1 ? "" : "s"}`}
            >
              {isAcceptingAllSuggestions ? (
                <IconLoader className="animate-spin" size={16} />
              ) : (
                <IconBulb size={16} className="text-amber-500" />
              )}
              <span className="hidden sm:inline">
                Aceptar todas las sugerencias
              </span>
              <span className="sm:hidden">Sugerencias</span>
            </button>
          )}
          {canDownloadSeatingReports && (
            <>
              <button
                onClick={handleExportReport}
                disabled={isExporting}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                <IconDownload size={16} />{" "}
                <span className="hidden sm:inline">Reporte</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                <IconDownload size={16} />{" "}
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={() => setShowParticellaModal(true)}
                disabled={isExporting}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all bg-slate-800 text-white hover:bg-slate-900 shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
              >
                <IconDownload size={16} />
                <IconLayers size={14} />
                <span className="hidden sm:inline">Descargar Particellas</span>
              </button>
            </>
          )}
          {canViewStringsConfig && (
            <>
              <button
                onClick={() => setShowRotationModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm shrink-0"
              >
                <IconLayers size={16} />{" "}
                <span className="hidden sm:inline">Rotación</span>
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm shrink-0"
              >
                <IconHistory size={16} />{" "}
                <span className="hidden sm:inline">Historial</span>
              </button>
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-colors shrink-0 ${showConfig ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                <IconSettings size={16} /> {isEditor ? "Cuerdas" : "Ver Grupos"}
              </button>
            </>
          )}
          <button
            onClick={onBack}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 sm:ml-4 shrink-0"
          >
            ← Volver
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-1 md:p-4 flex flex-col">
        <Suspense
          fallback={
            <div className="p-4 text-center text-slate-400">Cargando...</div>
          }
        >
          {showConfig && canViewStringsConfig && (
            <GlobalStringsManager
              programId={program.id}
              roster={filteredRoster}
              containers={containers}
              onUpdate={fetchContainers}
              supabase={supabase}
              readOnly={!canEditStringsConfig}
            />
          )}
        </Suspense>

        {/* --- VISTA MÓVIL --- */}
        <div className="md:hidden flex-1 overflow-hidden">
          <MobileSeatingTable
            user={user}
            obras={obras}
            assignments={assignments}
            musicianAssignments={musicianAssignments}
            filteredRoster={filteredRoster}
            windMusicians={otherMusicians}
            containers={containers}
            particellas={particellas}
            isEditor={isEditor}
            availablePartsByWork={availablePartsByWork}
            particellaCounts={particellaCounts}
            onAssign={handleAssign}
            onMusicianSlotAssign={handleMusicianSlotAssign}
            onRequestCreate={openCreateModal}
            musiciansWithoutParts={musiciansWithoutParts}
            musicianTooltipById={musicianTooltipById}
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
                                musicianTooltipById={musicianTooltipById}
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
                    const musicianSuggestions =
                      derivedMusicianSuggestions[m.id] || {};
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
                                title={musicianTooltipById[m.id] || ""}
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
                          const key = `M-${m.id}-${obra.obra_id}`;
                          const partIds = getMusicianPartIds(musicianAssignments, key);
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
                                  <MultiParticellaSelect
                                    options={availableParts}
                                    values={partIds}
                                    onSlotChange={(slotIndex, val) =>
                                      handleMusicianSlotAssign(
                                        m.id,
                                        obra.obra_id,
                                        val,
                                        slotIndex,
                                      )
                                    }
                                    onRequestCreate={(slotIndex) =>
                                      openCreateModal(
                                        obra.obra_id,
                                        m.id_instr,
                                        "M",
                                        m.id,
                                        slotIndex,
                                      )
                                    }
                                    preferredInstrumentId={m.id_instr}
                                    counts={particellaCounts}
                                  />
                                  {!partIds.length && suggestedPart && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await handleAssign(
                                          "M",
                                          m.id,
                                          obra.obra_id,
                                          suggestedPart.id,
                                        );
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
                                    title={partIds
                                      .map(
                                        (partId) =>
                                          availableParts.find(
                                            (p) =>
                                              String(p.id) === String(partId),
                                          )?.nombre_archivo,
                                      )
                                      .filter(Boolean)
                                      .join(" + ")}
                                  >
                                    {partIds
                                      .map(
                                        (partId) =>
                                          availableParts.find(
                                            (p) =>
                                              String(p.id) === String(partId),
                                          )?.nombre_archivo,
                                      )
                                      .filter(Boolean)
                                      .join(" + ") || "-"}
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
