import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconFolderMusic,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconLink,
  IconLoader,
  IconChevronDown,
  IconFilter,
  IconUsers,
  IconTag,
  IconDrive,
  IconAlertCircle,
  IconMusic,
  IconClock,
  IconHistory,
  IconX,
  IconCalendar,
  IconCheck,
  IconList,
  IconSettings,
  IconEyeOff,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconMoreVertical,
} from "../../components/ui/Icons";
import { format, isBefore, isToday, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";
import WorkForm from "./WorkForm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ComposersManager from "./ComposersManager";
import TagsManager from "./TagsManager";
import TagMultiSelect from "../../components/filters/TagMultiSelect";
import RepertoireSelectionBar from "../../components/repertoire/RepertoireSelectionBar";
import InstrumentationFilterModal from "../../components/repertoire/InstrumentationFilterModal";
import { calculateInstrumentation, workMatchesInstrumentationFilter } from "../../utils/instrumentation";
import { getInstrumentationFilterLabel } from "../../utils/instrumentationFilterPresets";
import { matchesMultiTokenSearch, normalizeForSearch } from "../../utils/sanitize";
import {
  loadRepertoireSelection,
  saveRepertoireSelection,
  clearRepertoireSelection,
} from "../../utils/repertoireSelectionStorage";
import { useAuth } from "../../context/AuthContext";
import AssignProgramModal from "../../components/repertoire/AssignProgramModal";
import {
  fetchPlaceholderOpcionesForObra,
  fetchProgramIdsWithPlaceholders,
} from "../../services/repertorioPlaceholderOpciones";
import { stripHtml } from "../../utils/eventDisplayUtils";
import {
  getObraEstadoArchiveMobileCardClass,
  getObraEstadoArchiveRowClass,
  getObraEstadoBadgeClass,
  getObraEstadoTitleTag,
} from "../../utils/obraEstadoStyles";

// --- ICONOS ADICIONALES ---
const IconColumns = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M10 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
    <path d="M19 20h-5V4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z" />
  </svg>
);
const IconCalendarPlus = ({ size = 20, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M10 16h4" />
    <path d="M12 14v4" />
  </svg>
);

// --- 1. HELPERS & UTILIDADES ---

const sanitizePreviewHtml = (html) => {
  let value = String(html || "");
  if (!value) return "";
  // El editor puede dejar tags inline vacíos dentro de bloques vacíos
  // (p.ej. <div><i>\n</i></div>), que igualmente ocupan alto.
  const EMPTY_INLINE_TAG_RE =
    /<(?:span|i|em|strong|b|u|small|font)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:span|i|em|strong|b|u|small|font)>/gi;
  let prev = "";
  while (prev !== value) {
    prev = value;
    value = value.replace(EMPTY_INLINE_TAG_RE, "");
  }
  // El editor deja bloques vacíos al final (<div><br></div>, <p>&nbsp;</p>, etc. con o sin atributos)
  value = value.replace(
    /(?:\s*<(?:div|p)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:div|p)>)+\s*$/gi,
    "",
  );
  // También recortamos <br> sueltos y espacios al final
  value = value.replace(/(?:\s|&nbsp;|<br\s*\/?>)+$/gi, "");
  return value.trim();
};

const RichTextPreview = ({ content, className = "" }) => {
  const sanitized = sanitizePreviewHtml(content);
  if (!sanitized) return null;
  return (
    <div
      className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:pl-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

const ORCHESTRA_MAP = {
  flauta: 0, flautas: 0, fl: 0,
  oboe: 1, oboes: 1, ob: 1,
  clarinete: 2, clarinetes: 2, cl: 2,
  fagot: 3, fagotes: 3, bn: 3, fg: 3,
  corno: 4, cornos: 4, hn: 4, cor: 4,
  trompeta: 5, trompetas: 5, tpt: 5,
  trombon: 6, trombones: 6, tbn: 6,
  tuba: 7, tubas: 7, tba: 7,
};

const getInstrumentValue = (workString, instrumentKey) => {
  if (!workString) return 0;
  const key = instrumentKey.toLowerCase();

  if (key === "timp") return /timp/i.test(workString) ? 1 : 0;
  if (key === "perc") {
    const match = workString.match(/perc(?:\.x|x|\+)?(\d+)?/i);
    return match ? (match[1] ? parseInt(match[1]) : 1) : 0;
  }
  if (key === "harp") return /hp|arp|harp/i.test(workString) ? 1 : 0;
  if (key === "key") return /key|pno|pf|cel/i.test(workString) ? 1 : 0;
  if (key === "str") return hasStrings(workString) ? 1 : 0;

  const cleanStr = workString.replace(/\([^)]*\)/g, "");
  const allParts = cleanStr
    .replace(/-/g, ".")
    .split(".")
    .map((p) => p.trim())
    .filter((p) => p !== "" && !isNaN(p));

  const indexMap = {
    fl: 0, ob: 1, cl: 2, bn: 3, fg: 3, hn: 4, tpt: 5, tp: 5, tbn: 6, tb: 6, tba: 7, tu: 7,
  };

  const index = indexMap[key];
  if (index === undefined || index >= allParts.length) return 0;
  const val = parseInt(allParts[index]);
  return isNaN(val) ? 0 : val;
};

const hasStrings = (text) => {
  if (!text) return false;
  return /str|cuerd|viol|vln|vla|vlc|cb|arco|contrab/i.test(text);
};

// --- 2. MODALES ---

const HistoryModal = ({ work, onClose, supabase, isEditor }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [opcionesSlots, setOpcionesSlots] = useState([]);
  const [programsWithPlaceholders, setProgramsWithPlaceholders] = useState(
    () => new Set(),
  );

  useEffect(() => {
    const fetchHistory = async () => {
      if (!work?.id) return;
      setLoading(true);
      try {
        const [{ data, error }, opciones] = await Promise.all([
          supabase
            .from("repertorio_obras")
            .select(`
            programas_repertorios (
              nombre,
              programas (id, nombre_gira, fecha_desde, mes_letra, nomenclador, tipo)
            )
          `)
            .eq("id_obra", work.id),
          isEditor
            ? fetchPlaceholderOpcionesForObra(supabase, work.id)
            : Promise.resolve([]),
        ]);
        if (error) throw error;
        const historyData = data
          .map((item) => ({
            bloque: item.programas_repertorios?.nombre,
            gira: item.programas_repertorios?.programas,
          }))
          .filter((h) => h.gira);
        historyData.sort(
          (a, b) => new Date(b.gira.fecha_desde) - new Date(a.gira.fecha_desde),
        );
        setHistory(historyData || []);
        setOpcionesSlots(opciones || []);

        const programIds = [
          ...new Set(
            [
              ...historyData.map((h) => h.gira?.id),
              ...(opciones || []).map(
                (o) =>
                  o.repertorio_obras?.programas_repertorios?.programas?.id,
              ),
            ].filter(Boolean),
          ),
        ];
        const withPh = await fetchProgramIdsWithPlaceholders(
          supabase,
          programIds,
        );
        setProgramsWithPlaceholders(withPh);
      } catch (err) {
        console.error("Error history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [work, supabase, isEditor]);

  const goToGiraRepertoire = (giraId) => {
    setSearchParams({ tab: "giras", view: "REPERTOIRE", giraId: String(giraId) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <IconHistory className="text-indigo-600" /> Historial
            </h3>
            <div className="text-xs text-slate-500 line-clamp-1">
              <RichTextPreview content={work.titulo} />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded">
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-8 text-indigo-500"><IconLoader className="animate-spin inline" /></div>
          ) : history.length === 0 && opcionesSlots.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic text-sm">Sin historial registrado.</div>
          ) : (
            <div className="space-y-3">
              {isEditor && opcionesSlots.length > 0 && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase text-violet-800">
                    Opción en slots a definir
                  </div>
                  {opcionesSlots.map((op) => {
                    const slot = op.repertorio_obras;
                    const prog =
                      slot?.programas_repertorios?.programas;
                    const bloque = slot?.programas_repertorios?.nombre;
                    return (
                      <div
                        key={op.id}
                        className="text-xs text-slate-700 bg-white/80 rounded border border-violet-100 px-2 py-1.5"
                      >
                        <span className="font-semibold text-violet-900">
                          {slot?.titulo_placeholder || "Slot a definir"}
                        </span>
                        {prog && (
                          <span className="text-slate-500">
                            {" "}
                            · {prog.nomenclador} {prog.nombre_gira}
                            {bloque ? ` (${bloque})` : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center gap-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase mb-0.5 flex flex-wrap items-center gap-1">
                      <span>
                        {item.gira.nomenclador} · {item.gira.mes_letra}
                        {item.gira.tipo && (
                          <span className="text-slate-500 font-medium ml-1">
                            · {item.gira.tipo}
                          </span>
                        )}
                      </span>
                      {programsWithPlaceholders.has(item.gira.id) && (
                        <span className="inline-flex items-center text-[8px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded border border-violet-200 font-semibold normal-case tracking-normal">
                          Tiene slots a definir
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-800">{item.gira.nombre_gira}</div>
                    {item.bloque && <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 inline-block px-1.5 rounded border border-slate-100">Bloque: {item.bloque}</div>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.gira.fecha_desde && (
                      <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                        <IconCalendar size={12} /> {format(new Date(item.gira.fecha_desde), "MMM yy", { locale: es })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => goToGiraRepertoire(item.gira.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 opacity-80 group-hover:opacity-100 transition-opacity"
                      title="Ir al repertorio de esta gira"
                    >
                      <IconExternalLink size={12} /> Ir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ColumnManager = ({ visibleColumns, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const columns = [
    { key: "compositor", label: "Compositor" },
    { key: "obra", label: "Obra" },
    { key: "arreglador", label: "Arreglador" },
    { key: "organico", label: "Orgánico" },
    { key: "duracion", label: "Duración" },
    { key: "estado", label: "Estado" },
    { key: "proxima_gira", label: "Próxima Gira" },
    { key: "fecha", label: "F. Esperada" },
    { key: "observaciones", label: "Observaciones" },
    { key: "tags", label: "Palabras Clave" },
  ];
  return (
    <div className="relative" ref={wrapperRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`p-2 rounded-full transition-colors flex items-center gap-2 text-xs font-bold ${isOpen ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-slate-100"}`} title="Mostrar/Ocultar Columnas"><IconColumns size={18} /> <span className="hidden sm:inline">Columnas</span></button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">Columnas Visibles</div>
          <div className="p-2 space-y-1">
            {columns.map((col) => (
              <label key={col.key} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700">
                <input type="checkbox" className="accent-indigo-600" checked={visibleColumns[col.key]} onChange={(e) => onChange(col.key, e.target.checked)} /> {col.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function RepertoireView({ supabase, catalogoInstrumentos }) {
  const { isEditor } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [works, setWorks] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- NUEVOS ESTADOS PARA PAGINACIÓN LOCAL ---
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Modales
  const [showComposersManager, setShowComposersManager] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [historyWork, setHistoryWork] = useState(null);
  const [assignWork, setAssignWork] = useState(null);
  const [showInstrFilter, setShowInstrFilter] = useState(false);
  const [showMobileInstrFilter, setShowMobileInstrFilter] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mobileQuickSearch, setMobileQuickSearch] = useState("");
  const [mobileWorkActionMenuId, setMobileWorkActionMenuId] = useState(null);
  const [deleteWorkConfirm, setDeleteWorkConfirm] = useState(null);
  const [deletingWork, setDeletingWork] = useState(false);
  const [showSolicitudes, setShowSolicitudes] = useState(false);
  const solicitudesRef = useRef(null);
  const mobileFiltersRef = useRef(null);
  const mobileInstrFilterAnchorRef = useRef(null);
  const mobileWorkActionMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (solicitudesRef.current && !solicitudesRef.current.contains(e.target)) setShowSolicitudes(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileFiltersRef.current && !mobileFiltersRef.current.contains(e.target)) {
        setShowMobileFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        mobileWorkActionMenuRef.current &&
        !mobileWorkActionMenuRef.current.contains(e.target)
      ) {
        setMobileWorkActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Visibilidad Columnas
  const [visibleColumns, setVisibleColumns] = useState({
    compositor: true,
    obra: true,
    arreglador: true,
    organico: true,
    duracion: true,
    estado: true,
    proxima_gira: true,
    fecha: false,
    observaciones: false,
    tags: false,
    acciones: true,
  });

  // Filtros
  const [filters, setFilters] = useState({ titulo: "", compositor: "", arreglador: "", estado: "Todos", solicitante: "", duracionMin: "", duracionMax: "", fechaDesde: "", fechaHasta: "", observaciones: "" });
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [instrFilters, setInstrFilters] = useState([]);
  const [stringsFilter, setStringsFilter] = useState("all");
  const [strictMode, setStrictMode] = useState(false);
  const [showLegacyOficialSinDrive, setShowLegacyOficialSinDrive] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: "titulo", direction: "asc" });
  const [selectionOrderedIds, setSelectionOrderedIds] = useState(
    () => loadRepertoireSelection().orderedIds,
  );
  const [selectionName, setSelectionName] = useState(
    () => loadRepertoireSelection().name || "",
  );

  const worksById = useMemo(
    () => new Map(works.map((w) => [w.id, w])),
    [works],
  );
  const selectedWorks = useMemo(
    () =>
      selectionOrderedIds
        .map((id) => worksById.get(id))
        .filter(Boolean),
    [selectionOrderedIds, worksById],
  );
  const selectionIdSet = useMemo(
    () => new Set(selectionOrderedIds),
    [selectionOrderedIds],
  );

  const persistSelection = (orderedIds) => {
    const saved = saveRepertoireSelection(orderedIds, selectionName);
    setSelectionOrderedIds(saved.orderedIds);
  };

  const updateSelectionName = (name) => {
    setSelectionName(name);
    saveRepertoireSelection(selectionOrderedIds, name);
  };

  const toggleWorkSelection = (workId) => {
    setSelectionOrderedIds((prev) => {
      if (prev.includes(workId)) {
        const next = prev.filter((id) => id !== workId);
        saveRepertoireSelection(next);
        return next;
      }
      const next = [...prev, workId];
      saveRepertoireSelection(next);
      return next;
    });
  };

  const removeFromSelection = (workId) => {
    setSelectionOrderedIds((prev) => {
      const next = prev.filter((id) => id !== workId);
      saveRepertoireSelection(next);
      return next;
    });
  };

  const refreshSelectionWorks = async (workIds) => {
    const ids = workIds?.length ? workIds : selectionOrderedIds;
    await Promise.all(ids.map((id) => fetchWorkById(id)));
  };

  const loadSelectionFromDrive = (orderedIds, name) => {
    const saved = saveRepertoireSelection(orderedIds, name);
    setSelectionOrderedIds(saved.orderedIds);
    setSelectionName(saved.name);
  };

  const legacyOficialSinDriveCount = useMemo(
    () =>
      works.filter(
        (w) => w.estado === "Oficial" && !(w.link_drive || "").trim(),
      ).length,
    [works],
  );

  // Lista de solicitantes que tienen al menos una obra en Solicitud o Pendiente (para el filtro)
  const solicitantesOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    works.forEach((w) => {
      if ((w.estado === "Solicitud" || w.estado === "Pendiente") && w.id_usuario_carga) {
        if (seen.has(w.id_usuario_carga)) return;
        seen.add(w.id_usuario_carga);
        const u = w.usuario_carga;
        const label = u ? [u.apellido, u.nombre].filter(Boolean).join(", ") : `Usuario ${w.id_usuario_carga}`;
        list.push({ value: w.id_usuario_carga, label });
      }
    });
    return list.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
  }, [works]);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({});
  const WORK_SELECT = `
    *,
    obras_compositores (
      rol,
      compositores (
        apellido,
        nombre,
        paises (nombre)
      )
    ),
    obras_palabras_clave (
      palabras_clave (id, tag)
    ),
    usuario_carga:integrantes!id_usuario_carga (
      apellido,
      nombre
    ),
    repertorio_obras (
      programas_repertorios (
        programas (
          id,
          nombre_gira,
          fecha_desde,
          fecha_hasta
        )
      )
    )
  `;

  useEffect(() => { fetchWorks(); fetchTags(); }, []);

  // Abrir obra por editId (ej. desde ArreglosDashboard)
  const editIdParam = searchParams.get("editId");
  useEffect(() => {
    if (!editIdParam || works.length === 0) return;
    const work = works.find((w) => String(w.id) === String(editIdParam));
    if (work) {
      startEdit(work);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete("editId");
        return p;
      });
    }
  }, [works, editIdParam]);

  // Abrir formulario de nueva obra (ej. desde ArreglosDashboard "Nueva Obra")
  const newObraParam = searchParams.get("newObra");
  useEffect(() => {
    if (newObraParam !== "1") return;
    setIsAdding(true);
    setFormData({});
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("newObra");
      return p;
    });
  }, [newObraParam]);

  // Resetear página al filtrar
  useEffect(() => { setCurrentPage(1); }, [filters, selectedTags, instrFilters, stringsFilter, strictMode, sortConfig, pageSize, mobileQuickSearch]);

  const setSortByFechaEstimada = (direction) => {
    setSortConfig({ key: "fecha_esperada", direction });
    setFilters((prev) => ({ ...prev, estado: "Solicitud" }));
  };

  const setSolicitanteFilter = (value) => {
    setFilters((prev) => ({ ...prev, solicitante: value, estado: value ? "Solicitud" : prev.estado }));
  };

  const fetchTags = async () => {
    const { data } = await supabase.from("palabras_clave").select("*").order("tag");
    if (data) setAvailableTags(data);
  };

  const processWork = (w) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const listComposers = w.obras_compositores?.filter(
      (oc) => oc.rol === "compositor" || !oc.rol,
    );
    const listArrangers = w.obras_compositores?.filter(
      (oc) => oc.rol === "arreglador",
    );
    const instValues = {};
    ["fl", "ob", "cl", "bn", "hn", "tpt", "tbn", "tba", "timp", "perc", "harp", "key"].forEach(
      (k) => {
        instValues[k] = getInstrumentValue(w.instrumentacion, k);
      },
    );
    let nextProgram = null;
    let nextProgramStart = null;
    let lastPastProgram = null;
    let lastPastProgramStart = null;
    (w.repertorio_obras || []).forEach((rel) => {
      const prog = rel.programas_repertorios?.programas;
      if (!prog || !prog.fecha_desde) return;
      const startDate = parseISO(prog.fecha_desde);
      if (isBefore(startDate, today)) {
        if (!lastPastProgramStart || isBefore(lastPastProgramStart, startDate)) {
          lastPastProgram = prog;
          lastPastProgramStart = startDate;
        }
        return;
      }
      if (!nextProgramStart || isBefore(startDate, nextProgramStart)) {
        nextProgram = prog;
        nextProgramStart = startDate;
      }
    });
    const displayProgram = nextProgram || lastPastProgram;
    const proximaGiraEsPasada = !nextProgram && !!lastPastProgram;
    return {
      ...w,
      instValues,
      compositor_full:
        listComposers
          ?.map(
            (oc) =>
              `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`,
          )
          .join(" / ") || "",
      arreglador_full:
        listArrangers
          ?.map(
            (oc) =>
              `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`,
          )
          .join(" / ") || "",
      pais_nombre:
        listComposers
          ?.map((oc) => oc.compositores?.paises?.nombre)
          .filter(Boolean)
          .join(" / ") || "",
      tags_objects:
        w.obras_palabras_clave?.map((opc) => opc.palabras_clave) || [],
      tags_ids:
        w.obras_palabras_clave?.map(
          (opc) => opc.palabras_clave?.id,
        ) || [],
      proxima_gira_nombre: displayProgram?.nombre_gira || null,
      proxima_gira_fecha_desde: displayProgram?.fecha_desde || null,
      proxima_gira_fecha_hasta: displayProgram?.fecha_hasta || null,
      proxima_gira_es_pasada: proximaGiraEsPasada,
    };
  };

  const upsertWorkLocally = (rawWork) => {
    const processedWork = processWork(rawWork);
    setWorks((prev) => {
      const existingIndex = prev.findIndex((w) => w.id === processedWork.id);
      const next =
        existingIndex >= 0
          ? prev.map((w) => (w.id === processedWork.id ? processedWork : w))
          : [...prev, processedWork];
      return next.sort((a, b) =>
        (a.titulo || "").localeCompare(b.titulo || "", "es", { sensitivity: "base" }),
      );
    });
  };

  const fetchWorkById = async (id) => {
    if (!id) return;
    const { data, error: dbError } = await supabase
      .from("obras")
      .select(WORK_SELECT)
      .eq("id", id)
      .single();
    if (dbError) throw dbError;
    if (data) upsertWorkLocally(data);
  };

  const fetchWorks = async () => {
    setLoading(true);
    setError(null);
    try {
      const CHUNK = 1000;
      let offset = 0;
      const allData = [];

      for (;;) {
        const { data, error: dbError } = await supabase
          .from("obras")
          .select(WORK_SELECT)
          .order("titulo")
          .range(offset, offset + CHUNK - 1);

        if (dbError) throw dbError;
        if (!data?.length) break;
        allData.push(...data);
        if (data.length < CHUNK) break;
        offset += CHUNK;
      }

      setWorks(allData.map(processWork));
    } catch (err) {
      console.error("Error fetching works:", err);
      setError("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <IconChevronDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-50 transition-opacity ml-1" />;
    return <IconChevronDown size={14} className={`text-indigo-600 transition-transform ml-1 ${sortConfig.direction === "desc" ? "rotate-180" : ""}`} />;
  };

  const clearAllFilters = () => {
    setFilters({ titulo: "", compositor: "", arreglador: "", estado: "Todos", solicitante: "", duracionMin: "", duracionMax: "", fechaDesde: "", fechaHasta: "", observaciones: "" });
    setSelectedTags(new Set()); setInstrFilters([]); setStringsFilter("all"); setStrictMode(false);
    setShowLegacyOficialSinDrive(false);
    setMobileQuickSearch("");
  };

  // --- FILTRADO Y ORDENAMIENTO ---
  const allFilteredWorks = useMemo(() => {
    return works.filter((work) => {
      if (
        mobileQuickSearch.trim() &&
        !matchesMultiTokenSearch(
          [
            stripHtml(work.titulo),
            work.compositor_full,
            work.arreglador_full,
          ],
          mobileQuickSearch,
        )
      ) {
        return false;
      }
      if (
        filters.titulo &&
        !normalizeForSearch(work.titulo).includes(normalizeForSearch(filters.titulo))
      )
        return false;
      if (
        filters.compositor &&
        !normalizeForSearch(work.compositor_full).includes(
          normalizeForSearch(filters.compositor),
        )
      )
        return false;
      if (
        filters.arreglador &&
        !normalizeForSearch(work.arreglador_full).includes(
          normalizeForSearch(filters.arreglador),
        )
      )
        return false;
      if (filters.estado !== "Todos" && work.estado !== filters.estado) return false;
      if (
        showLegacyOficialSinDrive &&
        !(work.estado === "Oficial" && !(work.link_drive || "").trim())
      ) {
        return false;
      }
      if (filters.solicitante && String(work.id_usuario_carga) !== String(filters.solicitante)) return false;

      const duration = work.duracion_segundos || 0;
      if (filters.duracionMax && duration > parseInt(filters.duracionMax) * 60) return false;
      if (filters.duracionMin && duration < parseInt(filters.duracionMin) * 60) return false;

      if (filters.fechaDesde && (!work.fecha_esperada || new Date(work.fecha_esperada) < new Date(filters.fechaDesde))) return false;
      if (filters.fechaHasta && (!work.fecha_esperada || new Date(work.fecha_esperada) > new Date(filters.fechaHasta))) return false;

      if (
        filters.observaciones &&
        !normalizeForSearch(work.observaciones).includes(
          normalizeForSearch(filters.observaciones),
        )
      )
        return false;
      if (selectedTags.size > 0 && !work.tags_ids.some((id) => selectedTags.has(id))) return false;

      if (
        instrFilters.length > 0 ||
        stringsFilter !== "all" ||
        strictMode
      ) {
        if (
          !workMatchesInstrumentationFilter(work, {
            instrFilters,
            stringsFilter,
            strictMode,
          })
        ) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === "fecha_esperada" || sortConfig.key === "proxima_gira_fecha_desde") {
        const fallback =
          sortConfig.direction === "asc" ? "9999-12-31" : "0000-01-01";
        valA = valA || fallback;
        valB = valB || fallback;
      }
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [works, filters, selectedTags, instrFilters, stringsFilter, sortConfig, strictMode, showLegacyOficialSinDrive, mobileQuickSearch]);

  const filteredWorkIds = useMemo(
    () => allFilteredWorks.map((w) => w.id),
    [allFilteredWorks],
  );
  const filteredWorkIdSet = useMemo(
    () => new Set(filteredWorkIds),
    [filteredWorkIds],
  );
  const filteredSelectionState = useMemo(() => {
    if (filteredWorkIds.length === 0) return "none";
    const selectedCount = filteredWorkIds.filter((id) =>
      selectionIdSet.has(id),
    ).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === filteredWorkIds.length) return "all";
    return "some";
  }, [filteredWorkIds, selectionIdSet]);

  const filteredSelectAllRef = useRef(null);
  useEffect(() => {
    if (filteredSelectAllRef.current) {
      filteredSelectAllRef.current.indeterminate =
        filteredSelectionState === "some";
    }
  }, [filteredSelectionState]);

  const toggleFilteredSelection = () => {
    setSelectionOrderedIds((prev) => {
      const prevSet = new Set(prev);
      const allFilteredSelected =
        filteredWorkIds.length > 0 &&
        filteredWorkIds.every((id) => prevSet.has(id));
      let next;
      if (allFilteredSelected) {
        next = prev.filter((id) => !filteredWorkIdSet.has(id));
      } else {
        const toAdd = filteredWorkIds.filter((id) => !prevSet.has(id));
        next = [...prev, ...toAdd];
      }
      saveRepertoireSelection(next);
      return next;
    });
  };

  // --- SUB-LISTA PAGINADA ---
  const totalPages = Math.ceil(allFilteredWorks.length / pageSize);
  const paginatedWorks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allFilteredWorks.slice(start, start + pageSize);
  }, [allFilteredWorks, currentPage, pageSize]);

  const getGridTemplate = () => {
    let cols = "36px ";
    if (visibleColumns.compositor) cols += "minmax(150px, 1.2fr) ";
    if (visibleColumns.obra) cols += "minmax(200px, 2fr) ";
    if (visibleColumns.arreglador) cols += "minmax(120px, 0.8fr) ";
    if (visibleColumns.organico) cols += "minmax(120px, 0.8fr) ";
    if (visibleColumns.duracion) cols += "100px ";
    if (visibleColumns.estado) cols += "100px ";
    if (visibleColumns.proxima_gira) cols += "minmax(140px, 1fr) ";
    if (visibleColumns.fecha) cols += "100px ";
    if (visibleColumns.observaciones) cols += "minmax(150px, 1fr) ";
    if (visibleColumns.tags) cols += "minmax(150px, 1fr) ";
    cols += "120px";
    return cols;
  };

  const handleSave = async (savedId = null, shouldClose = true) => {
    if (shouldClose) setLoading(true);
    try {
      if (savedId) {
        await fetchWorkById(savedId);
      }
      if (shouldClose) {
        setIsAdding(false);
        setEditingId(null);
        setFormData({});
      }
      return savedId;
    }
    catch (err) {
      await fetchWorks();
      alert("Error: " + err.message);
      return null;
    } finally { setLoading(false); }
  };
  const requestDeleteWork = (work) => {
    setDeleteWorkConfirm({ id: work.id, titulo: work.titulo });
  };

  const confirmDeleteWork = async () => {
    const id = deleteWorkConfirm?.id;
    if (!id) return;
    setDeletingWork(true);
    setLoading(true);
    try {
      const { error: deleteError } = await supabase.from("obras").delete().eq("id", id);
      if (deleteError) {
        alert("Error: " + deleteError.message);
        throw deleteError;
      }
      setWorks((prev) => prev.filter((w) => w.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setFormData({});
      }
      if (selectionIdSet.has(id)) {
        removeFromSelection(id);
      }
    } finally {
      setDeletingWork(false);
      setLoading(false);
    }
  };
  const startEdit = (work) => {
    setEditingId(work.id);
    const { compositor_full, arreglador_full, pais_nombre, tags_objects, tags_ids, instValues, ...rawData } = work;
    setFormData(rawData); setIsAdding(false);
  };
  const formatDuration = (secs) => {
    if (!secs && secs !== 0) return "-";
    const m = Math.floor(secs / 60); const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  const getDateStatusClass = (dateStr) => {
    if (!dateStr) return "text-slate-400";
    const d = parseISO(dateStr);
    if (isBefore(d, new Date()) && !isToday(d)) return "text-red-600 font-bold bg-red-50 px-1 rounded";
    if (isToday(d)) return "text-amber-600 font-bold bg-amber-50 px-1 rounded";
    if (isBefore(d, addDays(new Date(), 7))) return "text-indigo-600 font-bold";
    return "text-slate-600";
  };

  const selectedSolicitanteLabel =
    solicitantesOptions.find((o) => String(o.value) === String(filters.solicitante))
      ?.label || filters.solicitante;

  const selectedTagObjects = useMemo(
    () => availableTags.filter((tag) => selectedTags.has(tag.id)),
    [availableTags, selectedTags],
  );

  const mobileActiveFilterChips = useMemo(() => {
    const chips = [];
    const addTextFilter = (key, label) => {
      if (!filters[key]) return;
      chips.push({
        key,
        label: `${label}: ${filters[key]}`,
        tone: "slate",
        onRemove: () => setFilters((prev) => ({ ...prev, [key]: "" })),
      });
    };

    if (mobileQuickSearch.trim()) {
      chips.push({
        key: "quickSearch",
        label: `Buscar: ${mobileQuickSearch.trim()}`,
        tone: "indigo",
        onRemove: () => setMobileQuickSearch(""),
      });
    }
    addTextFilter("titulo", "Obra");
    addTextFilter("compositor", "Comp.");
    addTextFilter("arreglador", "Arr.");
    if (filters.estado !== "Todos") {
      chips.push({
        key: "estado",
        label: filters.estado,
        tone: "amber",
        onRemove: () => setFilters((prev) => ({ ...prev, estado: "Todos" })),
      });
    }
    if (filters.solicitante) {
      chips.push({
        key: "solicitante",
        label: `Solic.: ${selectedSolicitanteLabel}`,
        tone: "amber",
        onRemove: () => setSolicitanteFilter(""),
      });
    }
    if (filters.duracionMin || filters.duracionMax) {
      chips.push({
        key: "duracion",
        label: `Dur. ${filters.duracionMin || "0"}-${filters.duracionMax || "∞"} min`,
        tone: "indigo",
        onRemove: () =>
          setFilters((prev) => ({ ...prev, duracionMin: "", duracionMax: "" })),
      });
    }
    if (filters.fechaDesde || filters.fechaHasta) {
      chips.push({
        key: "fecha",
        label: `Fecha ${filters.fechaDesde || "…"}-${filters.fechaHasta || "…"}`,
        tone: "indigo",
        onRemove: () =>
          setFilters((prev) => ({ ...prev, fechaDesde: "", fechaHasta: "" })),
      });
    }
    addTextFilter("observaciones", "Obs.");
    selectedTagObjects.forEach((tag) => {
      chips.push({
        key: `tag-${tag.id}`,
        label: tag.tag,
        tone: "indigo",
        onRemove: () => {
          const next = new Set(selectedTags);
          next.delete(tag.id);
          setSelectedTags(next);
        },
      });
    });
    if (instrFilters.length > 0 || stringsFilter !== "all" || strictMode) {
      chips.push({
        key: "organico",
        label: getInstrumentationFilterLabel(instrFilters, stringsFilter, strictMode),
        tone: "yellow",
        onRemove: () => {
          setInstrFilters([]);
          setStringsFilter("all");
          setStrictMode(false);
          setShowMobileInstrFilter(false);
        },
      });
    }
    if (showLegacyOficialSinDrive) {
      chips.push({
        key: "legacy",
        label: "Oficial sin Drive",
        tone: "rose",
        onRemove: () => setShowLegacyOficialSinDrive(false),
      });
    }
    return chips;
  }, [
    filters,
    instrFilters,
    selectedSolicitanteLabel,
    selectedTagObjects,
    selectedTags,
    showLegacyOficialSinDrive,
    stringsFilter,
    strictMode,
    mobileQuickSearch,
  ]);

  const mobileFilterCount = mobileActiveFilterChips.length;

  const chipToneClasses = {
    slate: "bg-white text-slate-600 border-slate-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="space-y-3 md:space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
      <div className="bg-white p-2.5 md:p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-row justify-between items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconFolderMusic className="text-indigo-600" /> Archivo</h2>
          <div className="text-xs text-slate-500 bg-slate-100 px-2 md:px-3 py-1 rounded-full shrink-0">{allFilteredWorks.length} resultados</div>
        </div>
        <div className="flex shrink-0 flex-nowrap md:flex-wrap gap-1.5 md:gap-3 items-center overflow-x-auto no-scrollbar md:overflow-visible">
          <div className="relative" ref={solicitudesRef}>
            <button
              type="button"
              onClick={() => setShowSolicitudes((v) => !v)}
              className={`hidden md:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded border transition-colors ${filters.solicitante || (sortConfig.key === "fecha_esperada" && filters.estado === "Solicitud") ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
            >
              Solicitudes
              <IconChevronDown size={14} className={showSolicitudes ? "rotate-180" : ""} />
            </button>
            {showSolicitudes && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px] flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Solicitado por</label>
                  <select className="text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none bg-white w-full" value={filters.solicitante} onChange={(e) => setSolicitanteFilter(e.target.value)}>
                    <option value="">Todos</option>
                    {solicitantesOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Orden fecha</span>
                  <div className="flex rounded overflow-hidden border border-slate-300">
                    <button type="button" className={`flex-1 px-2 py-1 text-xs font-medium ${sortConfig.key === "fecha_esperada" && sortConfig.direction === "asc" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => setSortByFechaEstimada("asc")} title="Fecha ascendente (sin fecha al final)">Asc</button>
                    <button type="button" className={`flex-1 px-2 py-1 text-xs font-medium border-l border-slate-300 ${sortConfig.key === "fecha_esperada" && sortConfig.direction === "desc" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => setSortByFechaEstimada("desc")} title="Fecha descendente (sin fecha al final)">Desc</button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Al usar estos filtros se muestra solo estado Solicitud.</p>
              </div>
            )}
          </div>
          <button onClick={clearAllFilters} className="hidden md:inline text-xs text-slate-400 hover:text-red-500 font-bold underline px-2">Limpiar Filtros</button>
          {legacyOficialSinDriveCount > 0 && (
            <button
              type="button"
              onClick={() => setShowLegacyOficialSinDrive((v) => !v)}
              className={`hidden md:inline-flex text-xs font-bold px-3 py-1.5 rounded border transition-colors ${
                showLegacyOficialSinDrive
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-white border-rose-200 text-rose-700 hover:bg-rose-50"
              }`}
              title='Mostrar obras "Oficial" sin link de Drive'
            >
              Legacy: Oficial sin Drive ({legacyOficialSinDriveCount})
            </button>
          )}
          <div className="flex gap-0.5 md:gap-1 border-r border-slate-200 pr-1.5 md:pr-3">
            <button onClick={() => setShowComposersManager(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full" title="Compositores"><IconUsers size={20} /></button>
            <button onClick={() => setShowTagsManager(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full" title="Tags"><IconTag size={20} /></button>
          </div>
          <div className="hidden md:block">
            <ColumnManager visibleColumns={visibleColumns} onChange={(key, val) => setVisibleColumns((prev) => ({ ...prev, [key]: val }))} />
          </div>
          <button onClick={() => { setIsAdding(true); setFormData({}); }} className="md:ml-2 bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm" title="Nueva obra" aria-label="Nueva obra"><IconPlus size={16} /> <span className="hidden md:inline">Nuevo</span></button>
        </div>
      </div>

      <div className="hidden md:block">
        <RepertoireSelectionBar
          supabase={supabase}
          orderedIds={selectionOrderedIds}
          selectedWorks={selectedWorks}
          selectionName={selectionName}
          onSelectionNameChange={updateSelectionName}
          worksById={worksById}
          works={works}
          availableTags={availableTags}
          onUpdateOrder={persistSelection}
          onRefreshWorks={refreshSelectionWorks}
          onLoadFromDrive={loadSelectionFromDrive}
          onClear={() => {
            clearRepertoireSelection();
            setSelectionOrderedIds([]);
            setSelectionName("");
          }}
          onRemove={removeFromSelection}
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm relative">
        {isAdding || editingId ? (
          <div className="absolute inset-0 z-20 w-full bg-white p-2 sm:p-3 overflow-y-auto overflow-x-hidden">
            <WorkForm supabase={supabase} formData={formData} setFormData={setFormData} onSave={handleSave} onCancel={() => { setIsAdding(false); setEditingId(null); setFormData({}); }} isNew={isAdding} catalogoInstrumentos={catalogoInstrumentos} />
          </div>
        ) : (
          <>
          <div className="hidden md:flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto relative">
              <div className="min-w-full inline-block align-middle">
                {/* HEADERS */}
                <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-sm">
                  <div className="grid gap-4 px-4 py-3 items-end" style={{ gridTemplateColumns: getGridTemplate() }}>
                    <div
                      className="flex flex-col items-center justify-end pb-2 gap-0.5"
                      title="Tildar/destildar todo lo filtrado (no afecta obras fuera del filtro actual)"
                    >
                      <input
                        ref={filteredSelectAllRef}
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:opacity-30"
                        checked={filteredSelectionState === "all"}
                        disabled={filteredWorkIds.length === 0}
                        onChange={toggleFilteredSelection}
                        aria-label="Tildar o destildar todo lo filtrado"
                      />
                      <span className="text-[8px] font-bold text-slate-400 leading-none hidden lg:block">
                        Filtro
                      </span>
                    </div>
                    {visibleColumns.compositor && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("compositor_full")}>Compositor <SortIcon column="compositor_full" /></div><input className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Buscar..." value={filters.compositor} onChange={(e) => setFilters({ ...filters, compositor: e.target.value })} /></div>}
                    {visibleColumns.obra && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("titulo")}>Obra <SortIcon column="titulo" /></div><input className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Buscar..." value={filters.titulo} onChange={(e) => setFilters({ ...filters, titulo: e.target.value })} /></div>}
                    {visibleColumns.arreglador && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("arreglador_full")}>Arreglador <SortIcon column="arreglador_full" /></div><input className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Buscar..." value={filters.arreglador} onChange={(e) => setFilters({ ...filters, arreglador: e.target.value })} /></div>}
                    {visibleColumns.organico && <div className="space-y-2 relative"><div className="flex items-center text-xs font-bold text-slate-500 uppercase">Orgánico</div><button onClick={() => setShowInstrFilter(!showInstrFilter)} className={`w-full text-xs p-1.5 border rounded flex items-center justify-between ${instrFilters.length > 0 || stringsFilter !== "all" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold" : "bg-white border-slate-300 text-slate-500"}`}><span>{getInstrumentationFilterLabel(instrFilters, stringsFilter, strictMode)}</span><IconFilter size={10} /></button>{showInstrFilter && <InstrumentationFilterModal onClose={() => setShowInstrFilter(false)} currentFilters={instrFilters} stringsFilter={stringsFilter} setStringsFilter={setStringsFilter} strictMode={strictMode} setStrictMode={setStrictMode} onApply={(newRules) => { setInstrFilters(newRules); setShowInstrFilter(false); }} />}</div>}
                    {visibleColumns.duracion && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase">Duración (min)</div><div className="flex gap-1"><input className="w-full text-xs p-1 border border-slate-300 rounded text-center outline-none" placeholder="Min" type="number" value={filters.duracionMin} onChange={(e) => setFilters({ ...filters, duracionMin: e.target.value })} /><input className="w-full text-xs p-1 border border-slate-300 rounded text-center outline-none" placeholder="Max" type="number" value={filters.duracionMax} onChange={(e) => setFilters({ ...filters, duracionMax: e.target.value })} /></div></div>}
                    {visibleColumns.estado && (
                      <div className="space-y-2">
                        <div
                          className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                          onClick={() => handleSort("estado")}
                        >
                          Estado <SortIcon column="estado" />
                        </div>
                        <select
                          className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none bg-white"
                          value={filters.estado}
                          onChange={(e) =>
                            setFilters({ ...filters, estado: e.target.value })
                          }
                        >
                          <option value="Todos">Todos</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="Para arreglar">Para arreglar</option>
                          <option value="Entregado">Entregado</option>
                          <option value="Oficial">Oficial</option>
                          <option value="Solicitud">Solicitud</option>
                          <option value="Informativo">Informativo</option>
                        </select>
                      </div>
                    )}
                    {visibleColumns.proxima_gira && (
                      <div className="space-y-2">
                        <div
                          className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                          onClick={() =>
                            handleSort("proxima_gira_fecha_desde")
                          }
                        >
                          Próxima Gira{" "}
                          <SortIcon column="proxima_gira_fecha_desde" />
                        </div>
                      </div>
                    )}
                    {visibleColumns.fecha && (
                      <div className="space-y-2">
                        <div
                          className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                          onClick={() => handleSort("fecha_esperada")}
                        >
                          F. Esp. <SortIcon column="fecha_esperada" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <input
                            type="date"
                            className="text-[9px] border border-slate-300 rounded p-0.5 w-full"
                            value={filters.fechaDesde}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                fechaDesde: e.target.value,
                              })
                            }
                          />
                          <input
                            type="date"
                            className="text-[9px] border border-slate-300 rounded p-0.5 w-full"
                            value={filters.fechaHasta}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                fechaHasta: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                    {visibleColumns.observaciones && <div className="space-y-2 animate-in fade-in slide-in-from-top-1"><div className="flex items-center text-xs font-bold text-slate-500 uppercase">Observaciones</div><input className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Buscar texto..." value={filters.observaciones} onChange={(e) => setFilters({ ...filters, observaciones: e.target.value })} /></div>}
                    {visibleColumns.tags && <div className="space-y-2 animate-in fade-in slide-in-from-top-1"><div className="flex items-center text-xs font-bold text-slate-500 uppercase">Tags</div><div className="relative"><TagMultiSelect tags={availableTags} selectedIds={selectedTags} onChange={setSelectedTags} /></div></div>}
                    <div className="flex justify-end pb-2"><span className="text-[10px] text-slate-300 font-bold uppercase">Acciones</span></div>
                  </div>
                </div>

                {/* CUERPO FILAS */}
                <div className="flex flex-col divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <div className="p-20 text-center text-indigo-500"><IconLoader className="animate-spin inline mr-2" /> Cargando...</div>
                  ) : paginatedWorks.map((work) => (
                    <div
                      key={work.id}
                      className={`grid gap-4 px-4 py-3 items-center transition-colors group text-sm border-l-[3px] border-transparent ${getObraEstadoArchiveRowClass(work.estado)}`}
                      style={{ gridTemplateColumns: getGridTemplate() }}
                      title={work.estado === "Entregado" ? "Pendiente de validación por Archivista" : undefined}
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-indigo-600 cursor-pointer"
                          checked={selectionIdSet.has(work.id)}
                          onChange={() => toggleWorkSelection(work.id)}
                          title={
                            selectionIdSet.has(work.id)
                              ? "Quitar de la selección"
                              : "Agregar a la selección"
                          }
                          aria-label={
                            selectionIdSet.has(work.id)
                              ? "Quitar de la selección"
                              : "Agregar a la selección"
                          }
                        />
                      </div>
                      {visibleColumns.compositor && <div className="truncate font-medium text-slate-700">{work.compositor_full || <span className="text-slate-300 italic">-</span>}</div>}
                      {visibleColumns.obra && (
                        <div className="min-w-0 flex flex-col justify-center gap-1 w-full">
                          <div className="text-slate-800 leading-tight line-clamp-2"><RichTextPreview content={work.titulo} /></div>
                          {work.comentarios?.trim() && (
                            <div
                              className="w-full p-1 rounded shadow-sm border border-amber-200/80 bg-amber-50/90 text-amber-900 text-[9px] leading-tight line-clamp-1 hover:line-clamp-2 transition-[line-clamp] cursor-default"
                              title={work.comentarios.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}
                            >
                              <span className="whitespace-pre-wrap break-words">{work.comentarios.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}</span>
                            </div>
                          )}
                          <div className="flex gap-2">{work.link_audio && <a href={work.link_audio} target="_blank" className="text-green-600 bg-green-50 p-0.5 rounded hover:scale-110"><IconMusic size={10} /></a>}{work.link_partitura && <a href={work.link_partitura} target="_blank" className="text-blue-600 bg-blue-50 p-0.5 rounded hover:scale-110"><IconLink size={10} /></a>}</div>
                        </div>
                      )}
                      {visibleColumns.arreglador && <div className="truncate text-slate-500 text-xs">{work.arreglador_full || "-"}</div>}
                      {visibleColumns.organico && <div className="flex justify-center"><span className={`bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-mono text-xs w-full text-center leading-tight ${instrFilters.length > 0 || stringsFilter !== "all" ? "bg-yellow-50 text-yellow-700 border-yellow-200 font-bold" : ""}`}>{work.instrumentacion || "-"}</span></div>}
                      {visibleColumns.duracion && <div className="text-center font-mono text-slate-500 text-xs">{formatDuration(work.duracion_segundos)}</div>}
                      {visibleColumns.estado && (
                        <div className="text-center">
                          {work.estado === "Solicitud" ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`${getObraEstadoBadgeClass("Solicitud")} text-[10px] px-2 py-0.5 rounded-full font-bold border`}>
                                Pendiente
                              </span>
                              {work.usuario_carga &&
                                (work.usuario_carga.apellido ||
                                  work.usuario_carga.nombre) && (
                                  <span
                                    className="text-[10px] text-slate-600 leading-tight"
                                    title="Solicitante"
                                  >
                                    {[
                                      work.usuario_carga.apellido,
                                      work.usuario_carga.nombre,
                                    ]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </span>
                                )}
                              {work.fecha_esperada && (
                                <span
                                  className="text-[10px] text-slate-500 leading-tight"
                                  title="F. finalización esperada"
                                >
                                  {format(
                                    parseISO(work.fecha_esperada),
                                    "dd/MM/yy",
                                    { locale: es },
                                  )}
                                </span>
                              )}
                            </div>
                          ) : work.estado === "Para arreglar" ? (
                            <span className={`${getObraEstadoBadgeClass(work.estado)} text-[10px] px-2 py-0.5 rounded-full font-bold border`}>
                              Para arreglar
                            </span>
                          ) : work.estado === "Entregado" ? (
                            <span className={`${getObraEstadoBadgeClass(work.estado)} text-[10px] px-2 py-0.5 rounded-full font-bold border`} title="Revisión Archivista">
                              Entregado
                            </span>
                          ) : work.estado === "Informativo" ? (
                            <span className={`${getObraEstadoBadgeClass(work.estado)} text-[10px] px-2 py-0.5 rounded-full font-bold border`}>
                              Informativo
                            </span>
                          ) : work.estado === "Oficial" || work.estado === "Pendiente" ? (
                            <span className={`${getObraEstadoBadgeClass(work.estado)} text-[10px] px-2 py-0.5 rounded-full border`}>
                              {work.estado}
                            </span>
                          ) : (
                            <span className={`${getObraEstadoBadgeClass(work.estado)} text-[10px] px-2 py-0.5 rounded-full border`}>
                              {work.estado || "Oficial"}
                            </span>
                          )}
                        </div>
                      )}
                      {visibleColumns.proxima_gira && (
                        <div
                          className={`text-xs text-center ${work.proxima_gira_es_pasada ? "text-slate-500" : "text-slate-700"}`}
                        >
                          {work.proxima_gira_nombre ? (
                            <div className="leading-tight">
                              {work.proxima_gira_es_pasada && (
                                <div className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                                  Última
                                </div>
                              )}
                              <div className="truncate">
                                {work.proxima_gira_nombre}
                              </div>
                              {work.proxima_gira_fecha_hasta && (
                                <div className="text-[10px] text-slate-500">
                                  {work.proxima_gira_es_pasada
                                    ? format(
                                        parseISO(work.proxima_gira_fecha_hasta),
                                        "dd/MM/yy",
                                      )
                                    : `(hasta ${format(
                                        parseISO(work.proxima_gira_fecha_hasta),
                                        "dd/MM/yy",
                                      )})`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      )}
                      {visibleColumns.fecha && (
                        <div className="text-center">
                          {work.fecha_esperada ? (
                            <span
                              className={`text-xs ${getDateStatusClass(
                                work.fecha_esperada,
                              )}`}
                            >
                              {format(
                                parseISO(work.fecha_esperada),
                                "dd/MM/yy",
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      )}
                      {visibleColumns.observaciones && <div className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-1 rounded border border-slate-100"><RichTextPreview content={work.observaciones || "-"} /></div>}
                      {visibleColumns.tags && <div className="flex flex-wrap gap-1">{work.tags_objects.length > 0 ? work.tags_objects.map((t) => <span key={t.id} className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded border border-indigo-100 truncate max-w-[80px]">{t.tag}</span>) : <span className="text-slate-300 text-[10px]">-</span>}</div>}
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setAssignWork(work)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><IconCalendarPlus size={16} /></button>
                        <button onClick={() => setHistoryWork(work)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded"><IconHistory size={16} /></button>
                        {work.link_drive && <a href={work.link_drive} target="_blank" className="p-1.5 text-green-600 hover:bg-green-50 rounded"><IconDrive size={16} /></a>}
                        <button onClick={() => startEdit(work)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"><IconEdit size={16} /></button>
                        <button onClick={() => requestDeleteWork(work)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><IconTrash size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {!loading && paginatedWorks.length === 0 && <div className="p-12 text-center text-slate-400 italic">No se encontraron resultados.</div>}
                </div>
              </div>
            </div>

            {/* CONTROLES PAGINACIÓN (IZQUIERDA) */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Ver:</span>
                  <select 
                    className="text-xs border rounded p-1 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {[25, 50, 100, 200].map(v => <option key={v} value={v}>{v} obras</option>)}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-1 rounded border bg-white disabled:opacity-30 hover:bg-indigo-50 text-indigo-600 transition-colors"
                  >
                    <IconChevronLeft size={14} />
                  </button>
                  <div className="text-xs font-medium text-slate-600">
                    Pág. <span className="font-bold text-indigo-600">{currentPage}</span> / {totalPages || 1}
                  </div>
                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-1 rounded border bg-white disabled:opacity-30 hover:bg-indigo-50 text-indigo-600 transition-colors"
                  >
                    <IconChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="text-[10px] font-medium text-slate-400 uppercase">Mostrando {paginatedWorks.length} de {allFilteredWorks.length} obras</div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
            <div className="relative shrink-0 border-b border-slate-200 bg-slate-50 p-2" ref={mobileFiltersRef}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters((v) => !v)}
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    showMobileFilters || mobileFilterCount > 0
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-300 bg-white text-slate-600"
                  }`}
                  aria-expanded={showMobileFilters}
                  aria-label="Filtros avanzados"
                  title="Filtros avanzados"
                >
                  <IconFilter size={18} />
                </button>
                <div className="relative min-w-0 flex-1">
                  <IconSearch
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={mobileQuickSearch}
                    onChange={(e) => setMobileQuickSearch(e.target.value)}
                    placeholder="Beeth Sinf…"
                    aria-label="Búsqueda rápida"
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-xs outline-none focus:border-indigo-500"
                  />
                  {mobileQuickSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => setMobileQuickSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Limpiar búsqueda rápida"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>
                <RepertoireSelectionBar
                  variant="mobile-menu"
                  supabase={supabase}
                  orderedIds={selectionOrderedIds}
                  selectedWorks={selectedWorks}
                  selectionName={selectionName}
                  onSelectionNameChange={updateSelectionName}
                  worksById={worksById}
                  works={works}
                  availableTags={availableTags}
                  onUpdateOrder={persistSelection}
                  onRefreshWorks={refreshSelectionWorks}
                  onLoadFromDrive={loadSelectionFromDrive}
                  onClear={() => {
                    clearRepertoireSelection();
                    setSelectionOrderedIds([]);
                    setSelectionName("");
                  }}
                  onRemove={removeFromSelection}
                  mobileExtraActions={
                    <button
                      type="button"
                      onClick={toggleFilteredSelection}
                      disabled={filteredWorkIds.length === 0}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold disabled:opacity-40 ${
                        filteredSelectionState !== "none"
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <IconCheck size={14} />
                      {filteredSelectionState === "all"
                        ? "Quitar obras filtradas"
                        : "Seleccionar obras filtradas"}
                    </button>
                  }
                />
                <div className="hidden min-w-0 shrink sm:block">
                  <p className="truncate text-xs font-bold text-slate-700">
                    {allFilteredWorks.length} obra{allFilteredWorks.length === 1 ? "" : "s"}
                  </p>
                  <p className="truncate text-[10px] text-slate-400">
                    Pág. {currentPage}/{totalPages || 1}
                  </p>
                </div>
                {mobileFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600"
                    aria-label="Limpiar filtros"
                    title="Limpiar filtros"
                  >
                    <IconX size={17} />
                  </button>
                )}
              </div>

              <p className="mt-1 truncate text-[10px] text-slate-400 sm:hidden">
                {allFilteredWorks.length} obra{allFilteredWorks.length === 1 ? "" : "s"} · Pág.{" "}
                {currentPage}/{totalPages || 1} · {selectionOrderedIds.length} seleccionada
                {selectionOrderedIds.length === 1 ? "" : "s"}
              </p>

              {mobileActiveFilterChips.length > 0 && (
                <div className="mt-2 flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {mobileActiveFilterChips.map((chip) => (
                    <span
                      key={chip.key}
                      className={`inline-flex max-w-[12rem] shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${chipToneClasses[chip.tone] || chipToneClasses.slate}`}
                    >
                      <span className="truncate">{chip.label}</span>
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="rounded-full p-0.5 opacity-70 hover:bg-white hover:opacity-100"
                        aria-label={`Quitar filtro ${chip.label}`}
                      >
                        <IconX size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {showMobileFilters && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[68vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                      <IconFilter size={13} className="text-indigo-500" />
                      Filtros
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowMobileFilters(false)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100"
                      aria-label="Cerrar filtros"
                    >
                      <IconX size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Obra</span>
                      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                        <IconSearch size={13} className="text-slate-400" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                          placeholder="Buscar título..."
                          value={filters.titulo}
                          onChange={(e) => setFilters({ ...filters, titulo: e.target.value })}
                        />
                      </div>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Compositor</span>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none"
                          placeholder="Nombre..."
                          value={filters.compositor}
                          onChange={(e) => setFilters({ ...filters, compositor: e.target.value })}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Arreglador</span>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none"
                          placeholder="Nombre..."
                          value={filters.arreglador}
                          onChange={(e) => setFilters({ ...filters, arreglador: e.target.value })}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Estado</span>
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none"
                          value={filters.estado}
                          onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                        >
                          <option value="Todos">Todos</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="Para arreglar">Para arreglar</option>
                          <option value="Entregado">Entregado</option>
                          <option value="Oficial">Oficial</option>
                          <option value="Solicitud">Solicitud</option>
                          <option value="Informativo">Informativo</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Solicitante</span>
                        <select
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none"
                          value={filters.solicitante}
                          onChange={(e) => setSolicitanteFilter(e.target.value)}
                        >
                          <option value="">Todos</option>
                          {solicitantesOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Min</span>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none"
                          value={filters.duracionMin}
                          onChange={(e) => setFilters({ ...filters, duracionMin: e.target.value })}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Max</span>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none"
                          value={filters.duracionMax}
                          onChange={(e) => setFilters({ ...filters, duracionMax: e.target.value })}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Desde</span>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none"
                          value={filters.fechaDesde}
                          onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Hasta</span>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none"
                          value={filters.fechaHasta}
                          onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
                        />
                      </label>
                    </div>

                    <label className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Observaciones</span>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none"
                        placeholder="Buscar texto..."
                        value={filters.observaciones}
                        onChange={(e) => setFilters({ ...filters, observaciones: e.target.value })}
                      />
                    </label>

                    <div className="space-y-1">
                      <TagMultiSelect tags={availableTags} selectedIds={selectedTags} onChange={setSelectedTags} />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1" ref={mobileInstrFilterAnchorRef}>
                        <button
                          type="button"
                          onClick={() => setShowMobileInstrFilter((v) => !v)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-xs font-bold ${
                            instrFilters.length > 0 || stringsFilter !== "all" || strictMode
                              ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          <span className="truncate">
                            {getInstrumentationFilterLabel(instrFilters, stringsFilter, strictMode)}
                          </span>
                          <IconFilter size={12} />
                        </button>
                      </div>
                      {legacyOficialSinDriveCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowLegacyOficialSinDrive((v) => !v)}
                          className={`h-8 shrink-0 rounded-lg border px-2 text-[10px] font-bold ${
                            showLegacyOficialSinDrive
                              ? "border-rose-300 bg-rose-50 text-rose-700"
                              : "border-rose-200 bg-white text-rose-700"
                          }`}
                          title='Mostrar obras "Oficial" sin link de Drive'
                        >
                          Legacy
                        </button>
                      )}
                    </div>

                    <div className="mt-1 flex justify-end gap-2 border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                      >
                        <IconX size={12} />
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMobileFilters(false)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        <IconCheck size={12} />
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showMobileInstrFilter && (
                <InstrumentationFilterModal
                  onClose={() => setShowMobileInstrFilter(false)}
                  currentFilters={instrFilters}
                  stringsFilter={stringsFilter}
                  setStringsFilter={setStringsFilter}
                  strictMode={strictMode}
                  setStrictMode={setStrictMode}
                  onApply={(newRules) => {
                    setInstrFilters(newRules);
                    setShowMobileInstrFilter(false);
                  }}
                  anchorRef={mobileInstrFilterAnchorRef}
                />
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white p-2">
              {loading ? (
                <div className="p-10 text-center text-indigo-500">
                  <IconLoader className="inline animate-spin" /> Cargando...
                </div>
              ) : paginatedWorks.length === 0 ? (
                <div className="p-10 text-center text-sm italic text-slate-400">
                  No se encontraron resultados.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {paginatedWorks.map((work) => (
                    <li
                      key={work.id}
                      className={`rounded-lg border border-slate-200 p-1.5 shadow-sm transition-colors ${getObraEstadoArchiveMobileCardClass(work.estado)}`}
                    >
                      <div className="flex items-stretch gap-1.5">
                        <div className="flex w-5 shrink-0 flex-col items-center gap-1 pt-0.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-indigo-600"
                            checked={selectionIdSet.has(work.id)}
                            onChange={() => toggleWorkSelection(work.id)}
                            aria-label={selectionIdSet.has(work.id) ? "Quitar de la selección" : "Agregar a la selección"}
                          />
                          {work.link_drive && (
                            <a href={work.link_drive} target="_blank" className="mt-1.5 rounded bg-white/70 p-0.5 text-green-600" aria-label="Abrir Drive">
                              <IconDrive size={14} />
                            </a>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] font-bold leading-tight text-slate-800">
                              <div className="line-clamp-2 min-w-0">
                                <RichTextPreview content={work.titulo} />
                              </div>
                              {(() => {
                                const tag = getObraEstadoTitleTag(work.estado, { variant: "mobile" });
                                return tag ? (
                                  <span className={tag.className}>{tag.label}</span>
                                ) : null;
                              })()}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">
                              {work.compositor_full || "Sin compositor"}
                            </div>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-1 pr-1">
                            {work.arreglador_full && (
                              <span className="max-w-[9rem] truncate rounded border border-slate-200 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                Arr. {work.arreglador_full}
                              </span>
                            )}
                            <span className="rounded border border-slate-200 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                              {formatDuration(work.duracion_segundos)}
                            </span>
                            <span className={`max-w-[9.5rem] truncate rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                              instrFilters.length > 0 || stringsFilter !== "all"
                                ? "border-yellow-200 bg-yellow-50 text-yellow-700 font-bold"
                                : "border-slate-200 bg-white/80 text-slate-500"
                            }`}>
                              {work.instrumentacion || "-"}
                            </span>
                            {work.proxima_gira_nombre && (
                              <span className="max-w-[10rem] truncate rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                {work.proxima_gira_es_pasada ? "Últ. " : ""}
                                {work.proxima_gira_nombre}
                              </span>
                            )}
                          </div>

                          {work.tags_objects?.length > 0 && (
                            <div className="mt-1 flex gap-1 overflow-hidden">
                              {work.tags_objects.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="max-w-[6rem] truncate rounded border border-indigo-100 bg-indigo-50 px-1 py-0.5 text-[9px] font-bold text-indigo-600"
                                >
                                  {tag.tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {(work.link_audio || work.link_partitura) && (
                            <div className="mt-1 flex items-center gap-1">
                              {work.link_audio && (
                                <a href={work.link_audio} target="_blank" className="rounded bg-white/70 p-0.5 text-green-600" aria-label="Abrir audio">
                                  <IconMusic size={12} />
                                </a>
                              )}
                              {work.link_partitura && (
                                <a href={work.link_partitura} target="_blank" className="rounded bg-white/70 p-0.5 text-blue-600" aria-label="Abrir partitura">
                                  <IconLink size={12} />
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="relative flex w-6 shrink-0 justify-center pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setMobileWorkActionMenuId((prev) =>
                                prev === work.id ? null : work.id,
                              )
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-slate-500 hover:bg-white hover:text-indigo-600"
                            aria-label="Acciones de obra"
                            aria-expanded={mobileWorkActionMenuId === work.id}
                          >
                            <IconMoreVertical size={16} />
                          </button>
                          {mobileWorkActionMenuId === work.id && (
                            <div
                              ref={mobileWorkActionMenuRef}
                              className="absolute right-0 top-7 z-30 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-xs font-bold shadow-xl"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignWork(work);
                                  setMobileWorkActionMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-blue-700 hover:bg-blue-50"
                              >
                                <IconCalendarPlus size={13} /> Asignar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryWork(work);
                                  setMobileWorkActionMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-indigo-700 hover:bg-indigo-50"
                              >
                                <IconHistory size={13} /> Historial
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  startEdit(work);
                                  setMobileWorkActionMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                              >
                                <IconEdit size={13} /> Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMobileWorkActionMenuId(null);
                                  requestDeleteWork(work);
                                }}
                                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-red-600 hover:bg-red-50"
                              >
                                <IconTrash size={13} /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-2 py-2">
              <select
                className="rounded border border-slate-200 bg-white p-1 text-[11px] font-bold text-slate-600"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Cantidad de obras por página"
              >
                {[25, 50, 100, 200].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded border bg-white p-1 text-indigo-600 transition-colors disabled:opacity-30"
                  aria-label="Página anterior"
                >
                  <IconChevronLeft size={15} />
                </button>
                <div className="text-[11px] font-bold text-slate-600">
                  {currentPage}/{totalPages || 1}
                </div>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded border bg-white p-1 text-indigo-600 transition-colors disabled:opacity-30"
                  aria-label="Página siguiente"
                >
                  <IconChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {showComposersManager && <ComposersManager supabase={supabase} onClose={() => { setShowComposersManager(false); fetchWorks(); }} />}
      {showTagsManager && <TagsManager supabase={supabase} onClose={() => { setShowTagsManager(false); fetchWorks(); fetchTags(); }} />}
      {historyWork && (
        <HistoryModal
          work={historyWork}
          onClose={() => setHistoryWork(null)}
          supabase={supabase}
          isEditor={isEditor}
        />
      )}
      {assignWork && (
        <AssignProgramModal
          work={assignWork}
          onClose={() => setAssignWork(null)}
          supabase={supabase}
          isEditor={isEditor}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteWorkConfirm}
        onClose={() => {
          if (deletingWork) return;
          setDeleteWorkConfirm(null);
        }}
        onConfirm={confirmDeleteWork}
        title="Eliminar obra"
        message={
          deleteWorkConfirm
            ? `¿Eliminar «${stripHtml(deleteWorkConfirm.titulo) || "esta obra"}» del archivo? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmLoading={deletingWork}
        loadingText="Eliminando…"
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md transition-all active:scale-[0.98]"
      />
    </div>
  );
}