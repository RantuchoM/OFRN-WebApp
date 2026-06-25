import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconAlertCircle,
  IconCheck,
  IconDrive,
  IconFilter,
  IconLoader,
  IconPlus,
  IconSearch,
  IconX,
} from "../ui/Icons";
import InstrumentationFilterModal from "./InstrumentationFilterModal";
import OrganicoVientosAddField from "./OrganicoVientosAddField";
import { fetchRosterForGira } from "../../hooks/useGiraRoster";
import { formatSecondsToTime } from "../../utils/time";
import {
  calculateInstrumentation,
  computeInstrumentationConvokedFromRoster,
  workMatchesInstrumentationFilter,
} from "../../utils/instrumentation";
import {
  buildMaxInstrumentationFilterDefaults,
  getInstrumentationFilterLabel,
} from "../../utils/instrumentationFilterPresets";
import {
  getObraEstadoMobileCardStyles,
  getObraEstadoPickerRowClass,
} from "../../utils/obraEstadoStyles";

const LIBRARY_PAGE_SIZE = 80;

const normalizeSearchText = (value) =>
  String(value || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const sanitizePreviewHtml = (content) => {
  let html = String(content || "");
  if (!html) return "";
  const EMPTY_INLINE_TAG_RE =
    /<(?:span|i|em|strong|b|u|small|font)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:span|i|em|strong|b|u|small|font)>/gi;
  let prev = "";
  while (prev !== html) {
    prev = html;
    html = html.replace(EMPTY_INLINE_TAG_RE, "");
  }
  html = html.replace(
    /(?:\s*<(?:div|p)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:div|p)>)+\s*$/gi,
    "",
  );
  html = html.replace(/(?:\s|&nbsp;|<br\s*\/?>)+$/gi, "");
  return html.trim();
};

const RichTextPreview = ({ content, className = "" }) => {
  const sanitized = sanitizePreviewHtml(content);
  if (!sanitized) return null;
  return (
    <div
      className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:ml-1 leading-tight ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

const getComposers = (obra) =>
  obra.obras_compositores?.length > 0
    ? obra.obras_compositores
        .filter((oc) => !oc.rol || oc.rol === "compositor")
        .map(
          (oc) => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`,
        )
        .join(" / ")
    : obra.compositores
      ? `${obra.compositores.apellido}, ${obra.compositores.nombre}`
      : "Anónimo";

const getArranger = (obra) => {
  const arr = obra.obras_compositores?.find((oc) => oc.rol === "arreglador");
  return arr
    ? `${arr.compositores.apellido}, ${arr.compositores.nombre}`
    : "-";
};

const splitNamesLabel = (value) =>
  String(value || "")
    .split("/")
    .map((part) => {
      const [apellido, ...resto] = part.split(",");
      return {
        apellido: (apellido || "").trim(),
        nombre: resto.join(",").trim(),
      };
    })
    .filter((p) => p.apellido || p.nombre);

const MultiLineTitle = ({ content }) => {
  if (!content) return null;
  let clean = content.replace(/^<p>|<\/p>$/g, "");
  const rawParts = clean.split(/<br\s*\/?>|<\/div><div>|\n/i);
  const parts = rawParts
    .map((p) => p.replace(/<div>|<\/div>/g, ""))
    .filter((p) => p.trim() !== "");
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col text-slate-800">
      <div
        className="text-[15px] font-bold leading-tight"
        dangerouslySetInnerHTML={{ __html: parts[0] }}
      />
      {parts.length > 1 && (
        <div className="mt-0.5 text-[11px] font-medium opacity-60 leading-tight">
          {parts.slice(1).map((line, idx) => (
            <div key={idx} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Modal reutilizable «Buscar / Agregar obra» con filtros de catálogo.
 * mode: select → una obra y callback; toggle → marcar/desmarcar (opciones placeholder).
 */
export default function RepertoireWorkPickerModal({
  supabase,
  onClose,
  programId = null,
  applyGiraInstrumentationDefaults = true,
  mode = "select",
  selectedWorkIds = [],
  onSelectWork,
  onToggleWork,
  title = "Buscar Obra",
  accent = "indigo",
  showCreateRequest = true,
  onCreateRequest,
  allowPlaceholderReserve = false,
  placeholderReserve = null,
  overlayClassName = "z-[9999]",
}) {
  const [filters, setFilters] = useState({
    compositor: "",
    titulo: "",
    arreglador: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [instrFilters, setInstrFilters] = useState([]);
  const [stringsFilter, setStringsFilter] = useState("all");
  const [strictMode, setStrictMode] = useState(false);
  const [showInstrFilter, setShowInstrFilter] = useState(false);
  const instrFilterAnchorRef = useRef(null);
  const mobileInstrFilterAnchorRef = useRef(null);
  const [instrFilterAnchor, setInstrFilterAnchor] = useState(instrFilterAnchorRef);
  const [worksLibrary, setWorksLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryPage, setLibraryPage] = useState(0);
  const [libraryHasMore, setLibraryHasMore] = useState(false);
  const [libraryError, setLibraryError] = useState(null);
  const [observacionesPreviewWork, setObservacionesPreviewWork] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [giraInstrHint, setGiraInstrHint] = useState(null);

  const selectedSet = useMemo(
    () => new Set((selectedWorkIds || []).map((id) => Number(id))),
    [selectedWorkIds],
  );

  const accentPrimary =
    accent === "violet"
      ? "bg-violet-700 hover:bg-violet-800"
      : "bg-fixed-indigo-600 hover:bg-fixed-indigo-700";
  const accentFilterActive =
    accent === "violet"
      ? "bg-violet-50 border-violet-300 text-violet-700"
      : "bg-indigo-50 border-indigo-300 text-indigo-700";
  const accentRowSelected =
    accent === "violet" ? "ring-2 ring-violet-400 bg-violet-50/60" : "ring-2 ring-indigo-400 bg-indigo-50/60";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 180);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    if (!programId || !applyGiraInstrumentationDefaults) return;
    let cancelled = false;
    (async () => {
      try {
        const { roster } = await fetchRosterForGira(
          supabase,
          { id: programId },
          { lite: true },
        );
        if (cancelled) return;
        const convoked = computeInstrumentationConvokedFromRoster(roster);
        const defaults = buildMaxInstrumentationFilterDefaults(convoked);
        setInstrFilters(defaults.rules);
        setStringsFilter(defaults.stringsFilter);
        setStrictMode(defaults.strictMode);
        const total = Object.values(convoked).reduce(
          (s, n) => s + (Number(n) || 0),
          0,
        );
        if (total > 0) {
          setGiraInstrHint(
            `Filtro inicial: orgánico máximo convocado en la gira (${defaults.rules.filter((r) => r.value > 0).length} familias).`,
          );
        }
      } catch (e) {
        console.warn("RepertoireWorkPickerModal: orgánico gira", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programId, applyGiraInstrumentationDefaults, supabase]);

  const hasActiveInstrFilter =
    instrFilters.length > 0 || stringsFilter !== "all" || strictMode;

  const fetchLibrary = useCallback(
    async ({ page = 0, append = false } = {}) => {
      setLoadingLibrary(true);
      setLibraryError(null);
      const composerFilter = normalizeSearchText(debouncedFilters.compositor);
      const arrangerFilter = normalizeSearchText(debouncedFilters.arreglador);
      const useBroadFetch =
        composerFilter.length >= 2 ||
        arrangerFilter.length >= 2 ||
        hasActiveInstrFilter;
      const from = page * LIBRARY_PAGE_SIZE;
      const to = from + LIBRARY_PAGE_SIZE - 1;
      let query = supabase
        .from("obras")
        .select(
          `*, obras_compositores (rol, compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag)), obras_particellas (nombre_archivo, nota_organico, es_solista, instrumentos (instrumento, abreviatura))`,
        )
        .order("titulo");

      if (useBroadFetch) {
        query = query.range(0, 1999);
      } else {
        query = query.range(from, to);
      }

      const tituloFilter = normalizeSearchText(debouncedFilters.titulo);
      if (tituloFilter.length >= 2) {
        query = query.ilike("titulo", `%${debouncedFilters.titulo.trim()}%`);
      }

      const { data, error } = await query;
      if (error) {
        setLibraryError(error.message || "No se pudo cargar la biblioteca.");
        setLoadingLibrary(false);
        return;
      }
      const mapped = (data || []).map((w) => ({
        ...w,
        compositor_full: getComposers(w),
        arreglador_full: getArranger(w),
        titulo_plain: normalizeSearchText(w.titulo),
        compositor_plain: normalizeSearchText(getComposers(w)),
        arreglador_plain: normalizeSearchText(getArranger(w)),
      }));
      setWorksLibrary((prev) => (append ? [...prev, ...mapped] : mapped));
      setLibraryPage(page);
      setLibraryHasMore(!useBroadFetch && mapped.length === LIBRARY_PAGE_SIZE);
      setLoadingLibrary(false);
    },
    [supabase, debouncedFilters, hasActiveInstrFilter],
  );

  const shouldFetchLibrary = useMemo(() => {
    const composerFilter = normalizeSearchText(debouncedFilters.compositor);
    const titleFilter = normalizeSearchText(debouncedFilters.titulo);
    const arrangerFilter = normalizeSearchText(debouncedFilters.arreglador);
    return (
      composerFilter.length >= 2 ||
      titleFilter.length >= 2 ||
      arrangerFilter.length >= 2 ||
      hasActiveInstrFilter
    );
  }, [debouncedFilters, hasActiveInstrFilter]);

  useEffect(() => {
    if (!shouldFetchLibrary) {
      setWorksLibrary([]);
      setLibraryPage(0);
      setLibraryHasMore(false);
      return;
    }
    fetchLibrary({ page: 0, append: false });
  }, [shouldFetchLibrary, debouncedFilters, fetchLibrary]);

  const filteredLibrary = useMemo(
    () =>
      worksLibrary.filter((w) => {
        const tituloFilter = normalizeSearchText(debouncedFilters.titulo);
        const compositorFilter = normalizeSearchText(debouncedFilters.compositor);
        const arregladorFilter = normalizeSearchText(debouncedFilters.arreglador);

        if (
          tituloFilter &&
          !String(w.titulo_plain || normalizeSearchText(w.titulo)).includes(
            tituloFilter,
          )
        ) {
          return false;
        }
        if (
          compositorFilter &&
          !String(w.compositor_plain || normalizeSearchText(w.compositor_full)).includes(
            compositorFilter,
          )
        ) {
          return false;
        }
        if (
          arregladorFilter &&
          !String(w.arreglador_plain || normalizeSearchText(w.arreglador_full)).includes(
            arregladorFilter,
          )
        ) {
          return false;
        }

        if (
          instrFilters.length > 0 ||
          stringsFilter !== "all" ||
          strictMode
        ) {
          if (
            !workMatchesInstrumentationFilter(w, {
              instrFilters,
              stringsFilter,
              strictMode,
            })
          ) {
            return false;
          }
        }
        return true;
      }),
    [worksLibrary, debouncedFilters, instrFilters, stringsFilter, strictMode],
  );

  const handleRowAction = async (workId) => {
    if (mode === "toggle") {
      setTogglingId(workId);
      try {
        await onToggleWork?.(workId, !selectedSet.has(Number(workId)));
      } finally {
        setTogglingId(null);
      }
      return;
    }
    onSelectWork?.(workId);
  };

  const renderActionButton = (w) => {
    const isSelected = selectedSet.has(Number(w.id));
    const busy = togglingId === w.id;
    if (mode === "toggle") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => handleRowAction(w.id)}
          className={`px-2 py-1 rounded font-bold shadow-sm transition-colors text-[10px] min-h-9 flex items-center gap-1 ${
            isSelected
              ? `${accent === "violet" ? "bg-violet-700 text-white hover:bg-violet-800" : "bg-emerald-600 text-white hover:bg-emerald-700"}`
              : `bg-white border ${accent === "violet" ? "border-violet-200 text-violet-700 hover:bg-violet-50" : "border-fixed-indigo-200 text-fixed-indigo-600 hover:bg-fixed-indigo-600 hover:text-white"}`
          }`}
        >
          {busy ? (
            <IconLoader size={12} className="animate-spin" />
          ) : isSelected ? (
            <>
              <IconCheck size={12} /> En opciones
            </>
          ) : (
            <>
              <IconPlus size={12} /> Agregar
            </>
          )}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => handleRowAction(w.id)}
        className={`bg-white border px-2 py-1 rounded font-bold hover:text-white shadow-sm transition-colors text-[10px] min-h-9 ${accent === "violet" ? "border-violet-200 text-violet-700 hover:bg-violet-700" : "border-fixed-indigo-200 text-fixed-indigo-600 hover:bg-fixed-indigo-600"}`}
      >
        Seleccionar
      </button>
    );
  };

  const reserve = placeholderReserve;

  const renderFilterFields = (anchorRef, { mobile = false } = {}) => {
    const openInstrFilter = () => {
      setInstrFilterAnchor(anchorRef);
      setShowInstrFilter((prev) => !prev);
    };

    if (mobile) {
      const rowLabel =
        "w-[4.75rem] shrink-0 text-[10px] font-bold text-slate-500 text-right";
      const rowInput =
        "flex-1 min-w-0 p-1 border border-slate-300 rounded text-[11px] outline-none focus:border-indigo-500 bg-white";
      const organicoBtnClass =
        "flex-1 min-w-0 text-[10px] p-1 border rounded flex items-center justify-between gap-1 min-h-[1.75rem]";

      return (
        <>
          <div className="flex items-center gap-2 min-w-0">
            <span className={rowLabel}>Compositor:</span>
            <input
              type="text"
              placeholder="Buscar..."
              autoFocus
              className={rowInput}
              value={filters.compositor}
              onChange={(e) =>
                setFilters({ ...filters, compositor: e.target.value })
              }
            />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className={rowLabel}>Obra:</span>
            <input
              type="text"
              placeholder="Buscar..."
              className={rowInput}
              value={filters.titulo}
              onChange={(e) =>
                setFilters({ ...filters, titulo: e.target.value })
              }
            />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className={rowLabel}>Arreglador:</span>
            <input
              type="text"
              placeholder="Buscar..."
              className={rowInput}
              value={filters.arreglador}
              onChange={(e) =>
                setFilters({ ...filters, arreglador: e.target.value })
              }
            />
          </div>
          <div className="flex items-center gap-2 min-w-0 relative">
            <span className={rowLabel}>Orgánico:</span>
            <button
              ref={anchorRef}
              type="button"
              onClick={openInstrFilter}
              className={`${organicoBtnClass} ${
                hasActiveInstrFilter
                  ? accentFilterActive + " font-bold"
                  : "bg-white border-slate-300 text-slate-500"
              }`}
            >
              <span className="truncate text-left">
                {getInstrumentationFilterLabel(
                  instrFilters,
                  stringsFilter,
                  strictMode,
                )}
              </span>
              <IconFilter size={10} className="shrink-0" />
            </button>
          </div>
        </>
      );
    }

    const labelClass = "text-xs font-bold text-slate-500 uppercase";
    const fieldGap = "space-y-2";
    const inputClass =
      "w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500";
    const organicoBtnClass =
      "w-full text-xs p-1.5 border rounded flex items-center justify-between gap-2 min-h-[2rem]";

    return (
      <>
        <div className={`${fieldGap} min-w-0`}>
          <div className={labelClass}>Compositor</div>
          <input
            type="text"
            placeholder="Buscar..."
            autoFocus
            className={inputClass}
            value={filters.compositor}
            onChange={(e) =>
              setFilters({ ...filters, compositor: e.target.value })
            }
          />
        </div>
        <div className={`${fieldGap} min-w-0`}>
          <div className={labelClass}>Obra</div>
          <input
            type="text"
            placeholder="Buscar..."
            className={inputClass}
            value={filters.titulo}
            onChange={(e) =>
              setFilters({ ...filters, titulo: e.target.value })
            }
          />
        </div>
        <div className={`${fieldGap} min-w-0`}>
          <div className={labelClass}>Arreglador</div>
          <input
            type="text"
            placeholder="Buscar..."
            className={inputClass}
            value={filters.arreglador}
            onChange={(e) =>
              setFilters({ ...filters, arreglador: e.target.value })
            }
          />
        </div>
        <div className={`${fieldGap} relative min-w-0`}>
          <div className={labelClass}>Orgánico</div>
          <button
            ref={anchorRef}
            type="button"
            onClick={openInstrFilter}
            className={`${organicoBtnClass} ${
              hasActiveInstrFilter
                ? accentFilterActive + " font-bold"
                : "bg-white border-slate-300 text-slate-500"
            }`}
          >
            <span className="truncate text-left">
              {getInstrumentationFilterLabel(
                instrFilters,
                stringsFilter,
                strictMode,
              )}
            </span>
            <IconFilter size={10} className="shrink-0" />
          </button>
        </div>
      </>
    );
  };

  const renderResultsBody = () => {
    const emptyPad = "p-4 md:p-8";
    const emptyText = "text-xs md:text-sm";

    if (loadingLibrary) {
      return (
        <div className={`${emptyPad} text-center text-fixed-indigo-600`}>
          <IconLoader className="animate-spin inline" />
        </div>
      );
    }
    if (!shouldFetchLibrary) {
      return (
        <div className={`${emptyPad} text-center`}>
          <div className={`${emptyText} font-semibold text-slate-600`}>
            Escribí compositor, obra o arreglador, o elegí un filtro de orgánico.
          </div>
        </div>
      );
    }
    if (libraryError) {
      return (
        <div className={`${emptyPad} text-center ${emptyText} font-semibold text-red-600`}>
          {libraryError}
        </div>
      );
    }
    if (filteredLibrary.length === 0) {
      return (
        <div className={`${emptyPad} text-center ${emptyText} font-semibold text-slate-600`}>
          Sin coincidencias con los filtros actuales.
        </div>
      );
    }

    return (
      <>
        <div className="md:hidden bg-slate-50 p-2 space-y-1">
          {filteredLibrary.map((w) => {
            const isSelected = selectedSet.has(Number(w.id));
            const { borderClass, cardBorderClass } =
              getObraEstadoMobileCardStyles(w.estado);
                    const instr =
                      w.instrumentacion ||
                      calculateInstrumentation(w.obras_particellas) ||
                      "-";
            return (
              <div
                key={w.id}
                className={`rounded-lg border shadow-sm p-2 relative overflow-hidden ${cardBorderClass} ${
                  mode === "toggle" && isSelected ? accentRowSelected : ""
                }`}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${borderClass}`}
                />
                <div className="flex gap-2 pl-2 pr-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <span
                        className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate"
                        title={w.compositor_full}
                      >
                        {w.compositor_full}
                      </span>
                      <span className="shrink-0 text-[10px] font-mono bg-white/70 px-1.5 py-0.5 rounded border border-slate-100">
                        {formatSecondsToTime(w.duracion_segundos) || "-"}
                      </span>
                    </div>

                    <div className="mb-1">
                      <div className="flex items-start gap-1 flex-wrap">
                        <MultiLineTitle content={w.titulo} />
                        {w.estado === "Informativo" && (
                          <span className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded border border-blue-200 align-text-top shrink-0">
                            INFO
                          </span>
                        )}
                      </div>
                      {w.arreglador_full !== "-" && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                          Arr: {w.arreglador_full}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`text-[10px] font-mono text-slate-500 bg-white/70 px-1 rounded ${
                          hasActiveInstrFilter
                            ? "font-bold text-yellow-700 bg-yellow-50"
                            : ""
                        }`}
                      >
                        {instr}
                      </span>
                      {w.anio_composicion ? (
                        <span className="text-[10px] text-slate-400">
                          {w.anio_composicion}
                        </span>
                      ) : null}
                      {w.link_drive ? (
                        <a
                          href={w.link_drive}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 inline-flex rounded-full bg-blue-50 p-0.5"
                          aria-label="Abrir Drive"
                        >
                          <IconDrive size={14} />
                        </a>
                      ) : null}
                      {normalizeSearchText(w.observaciones) ? (
                        <button
                          type="button"
                          onClick={() => setObservacionesPreviewWork(w)}
                          className="inline-flex rounded border border-yellow-200 bg-yellow-50 text-yellow-700 p-0.5"
                          aria-label="Ver observaciones"
                        >
                          <IconAlertCircle size={12} />
                        </button>
                      ) : null}
                    </div>

                    <div className="flex justify-end">
                      {renderActionButton(w)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <table className="hidden md:table w-full table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "4.25rem" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "3rem" }} />
            <col style={{ width: "2.75rem" }} />
            <col style={{ width: "2.75rem" }} />
            <col style={{ width: "5.5rem" }} />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 font-bold shadow-sm">
            <tr>
              <th className="p-2 text-center">Compositor</th>
              <th className="p-2">Obra</th>
              <th className="p-2">Arreglador</th>
              <th className="p-2 text-center">Duración</th>
              <th className="p-2 text-center">Instr.</th>
              <th className="p-2 text-center">Año</th>
              <th className="p-2 text-center">Drive</th>
              <th className="p-2 text-center">Notas</th>
              <th className="p-2 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredLibrary.map((w) => {
              const isSelected = selectedSet.has(Number(w.id));
              return (
                <tr
                  key={w.id}
                  className={`group ${getObraEstadoPickerRowClass(w.estado)} ${mode === "toggle" && isSelected ? accentRowSelected : ""}`}
                >
                  <td className="p-2 text-center text-slate-600">
                    <div className="truncate" title={w.compositor_full}>
                      {splitNamesLabel(w.compositor_full)
                        .slice(0, 2)
                        .map((c, idx) => (
                          <div
                            key={idx}
                            className={`min-w-0 leading-tight ${idx > 0 ? "pt-1 mt-1 border-t border-slate-100" : ""}`}
                          >
                            <div className="truncate text-[11px] font-semibold text-slate-700">
                              {c.apellido}
                            </div>
                            {c.nombre ? (
                              <div className="truncate text-[10px] font-medium text-slate-500 leading-tight">
                                {c.nombre}
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </td>
                  <td className="p-2 text-slate-800 truncate">
                    <RichTextPreview content={w.titulo} />
                  </td>
                  <td className="p-2 text-slate-500 truncate max-w-0">
                    {w.arreglador_full !== "-" ? w.arreglador_full : ""}
                  </td>
                  <td className="p-2 text-center font-mono text-[10px] text-slate-400">
                    {formatSecondsToTime(w.duracion_segundos)}
                  </td>
                  <td className="p-2 text-center font-mono text-[10px] text-slate-500 bg-slate-50/50 rounded">
                    <div className="line-clamp-3 break-all whitespace-normal">
                      {w.instrumentacion ||
                        calculateInstrumentation(w.obras_particellas) ||
                        "-"}
                    </div>
                  </td>
                  <td className="p-2 text-center text-slate-500">
                    {w.anio_composicion || "-"}
                  </td>
                  <td className="p-2 text-center">
                    {w.link_drive ? (
                      <a
                        href={w.link_drive}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 inline-block p-1 bg-blue-50 rounded-full"
                      >
                        <IconDrive size={14} />
                      </a>
                    ) : (
                      <span className="text-slate-200">-</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {normalizeSearchText(w.observaciones) ? (
                      <button
                        type="button"
                        onClick={() => setObservacionesPreviewWork(w)}
                        className="inline-flex rounded border border-yellow-200 bg-yellow-50 text-yellow-700 p-1"
                      >
                        <IconAlertCircle size={12} />
                      </button>
                    ) : (
                      <span className="text-slate-200">-</span>
                    )}
                  </td>
                  <td className="p-2 text-right">{renderActionButton(w)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {libraryHasMore && (
          <div className="p-2 border-t flex justify-center">
            <button
              type="button"
              disabled={loadingLibrary}
              onClick={() =>
                fetchLibrary({ page: libraryPage + 1, append: true })
              }
              className="px-3 py-1.5 text-xs font-bold rounded border border-fixed-indigo-200 text-fixed-indigo-600"
            >
              {loadingLibrary ? "Cargando..." : "Cargar más"}
            </button>
          </div>
        )}
      </>
    );
  };

  return createPortal(
    <>
      <div
        className={`fixed inset-0 ${overlayClassName} flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="bg-white w-full max-w-5xl h-[85vh] md:h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b flex justify-between items-center bg-slate-50 gap-2 shrink-0">
            <h3 className="font-bold text-slate-700 flex gap-2 shrink-0 items-center">
              <IconSearch size={18} /> {title}
            </h3>
            <div className="flex items-center gap-2">
              {allowPlaceholderReserve && reserve && (
                <button
                  type="button"
                  onClick={reserve.onToggleOpen}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 border transition-colors ${
                    reserve.open
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-white border-violet-200 text-violet-800 hover:bg-violet-50"
                  }`}
                >
                  <IconPlus size={12} /> Repertorio sin definir
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={20} />
              </button>
            </div>
          </div>

          {allowPlaceholderReserve && reserve?.open && (
            <div className="p-3 border-b bg-violet-50/50 space-y-3 shrink-0">
              <p className="text-xs text-violet-800">
                Reserva de planificación para este bloque: no crea obra en el
                catálogo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Título de la reserva *
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-violet-200 rounded text-sm outline-none focus:border-violet-400 bg-white"
                    placeholder='Ej: "Dos obras corales"'
                    value={reserve.draft.titulo}
                    onChange={(e) =>
                      reserve.onDraftChange((d) => ({
                        ...d,
                        titulo: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Duración estimada
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-violet-200 rounded text-sm font-mono bg-white"
                    placeholder="mm:ss o minutos"
                    value={reserve.draft.duracion}
                    onChange={(e) =>
                      reserve.onDraftChange((d) => ({
                        ...d,
                        duracion: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    Orgánico estimado
                  </label>
                  <OrganicoVientosAddField
                    variant="inline"
                    allowSuffix
                    value={reserve.draft.instrumentacion}
                    onChange={(v) =>
                      reserve.onDraftChange((d) => ({
                        ...d,
                        instrumentacion: v,
                      }))
                    }
                    className="w-full p-2 border border-violet-200 rounded text-sm font-mono text-center bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => reserve.onToggleOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={reserve.saving || !reserve.draft.titulo.trim()}
                  onClick={reserve.onSubmit}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-violet-700 text-white disabled:opacity-50 flex items-center gap-1"
                >
                  {reserve.saving ? (
                    <IconLoader size={12} className="animate-spin" />
                  ) : (
                    <IconPlus size={12} />
                  )}
                  Agregar al bloque
                </button>
              </div>
            </div>
          )}

          {giraInstrHint && (
            <p className="text-[10px] text-slate-500 px-3 py-1.5 border-b bg-slate-50/80 shrink-0">
              {giraInstrHint}
            </p>
          )}

          <div className="md:hidden shrink-0 p-2 border-b bg-white space-y-1.5">
            {renderFilterFields(mobileInstrFilterAnchorRef, { mobile: true })}
            {showCreateRequest && onCreateRequest && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={onCreateRequest}
                  className={`${accentPrimary} text-white px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1`}
                >
                  <IconPlus size={11} /> Crear Solicitud
                </button>
              </div>
            )}
          </div>

          <div className="hidden md:grid p-2 border-b grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,9rem)_minmax(14rem,2.75fr)_auto] gap-4 bg-white items-end shrink-0">
            {renderFilterFields(instrFilterAnchorRef)}
            {showCreateRequest && onCreateRequest && (
              <div className="flex justify-end pb-0.5">
                <button
                  type="button"
                  onClick={onCreateRequest}
                  className={`${accentPrimary} text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1`}
                >
                  <IconPlus size={12} /> Crear Solicitud
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {renderResultsBody()}
          </div>

          {mode === "toggle" && (
            <div className="p-2 border-t bg-slate-50 text-[10px] text-slate-500 shrink-0 flex justify-between items-center">
              <span>
                {selectedSet.size} obra{selectedSet.size !== 1 ? "s" : ""} en
                opciones
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-100"
              >
                Listo
              </button>
            </div>
          )}
        </div>
      </div>

      {showInstrFilter && (
        <InstrumentationFilterModal
          anchorRef={instrFilterAnchor}
          onClose={() => setShowInstrFilter(false)}
          currentFilters={instrFilters}
          stringsFilter={stringsFilter}
          setStringsFilter={setStringsFilter}
          strictMode={strictMode}
          setStrictMode={setStrictMode}
          onApply={(newRules) => {
            setInstrFilters(newRules);
            setShowInstrFilter(false);
          }}
        />
      )}

      {observacionesPreviewWork && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => setObservacionesPreviewWork(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b bg-slate-50 flex justify-between">
              <h3 className="text-sm font-bold text-slate-700">
                Observaciones generales
              </h3>
              <button
                type="button"
                onClick={() => setObservacionesPreviewWork(null)}
                className="text-slate-400"
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="p-4">
              <RichTextPreview content={observacionesPreviewWork.observaciones} />
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
