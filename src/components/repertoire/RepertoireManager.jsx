import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconMusic,
  IconPlus,
  IconTrash,
  IconSearch,
  IconLoader,
  IconCheck,
  IconX,
  IconLink,
  IconChevronDown,
  IconChevronUp,
  IconAlertCircle,
  IconEdit,
  IconYoutube,
  IconDrive,
  IconEyeOff,
  IconSettings,
  IconFilter,
  IconGripVertical,
} from "../ui/Icons";
import { updateWorkPosition, normalizeRepertorioBlockOrden } from "../../services/giraService";
import { formatSecondsToTime } from "../../utils/time";
import {
  calculateInstrumentation,
  calculateTotalDuration,
  getInstrumentValue,
  hasStrings,
} from "../../utils/instrumentation";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import { useAuth } from "../../context/AuthContext";
import WorkForm from "../../views/Repertoire/WorkForm";
const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body,
  );
};

// --- RENDERER DE TEXTO RICO ---
const RichTextPreview = ({ content, className = "" }) => {
  if (!content) return null;
  return (
    <div
      className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:ml-1 leading-tight ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};
// --- NUEVO: RENDERER DE TÍTULO INTELIGENTE (MULTI-LÍNEA) ---
const MultiLineTitle = ({ content }) => {
  if (!content) return null;

  // Limpieza básica
  let clean = content.replace(/^<p>|<\/p>$/g, "");

  // Separar por saltos de línea (html o texto)
  const rawParts = clean.split(/<br\s*\/?>|<\/div><div>|\n/i);
  const parts = rawParts
    .map((p) => p.replace(/<div>|<\/div>/g, ""))
    .filter((p) => p.trim() !== "");

  if (parts.length === 0) return null;

  return (
    <div className="flex flex-col text-slate-800">
      {/* Primera línea: Tamaño normal y Negrita */}
      <div
        className="text-[15px] font-bold leading-tight"
        dangerouslySetInnerHTML={{ __html: parts[0] }}
      />

      {/* Líneas subsiguientes: Más pequeñas y tenues */}
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

// --- FILTRO POR ORGÁNICO (misma estructura que RepertoireView) ---
const InstrumentationFilterModal = ({
  onClose,
  onApply,
  currentFilters,
  stringsFilter,
  setStringsFilter,
  strictMode,
  setStrictMode,
  anchorRef,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.left });
    }
  };

  useLayoutEffect(() => {
    if (!anchorRef?.current) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  const BASE_INSTRUMENTS = [
    { id: "fl", label: "Flautas" }, { id: "ob", label: "Oboes" }, { id: "cl", label: "Clarinetes" }, { id: "bn", label: "Fagotes" },
    { id: "hn", label: "Cornos" }, { id: "tpt", label: "Trompetas" }, { id: "tbn", label: "Trombones" }, { id: "tba", label: "Tubas" },
  ];
  const [rules, setRules] = useState(() => {
    const existingMap = {};
    currentFilters.forEach((r) => { existingMap[r.instrument] = r; });
    return BASE_INSTRUMENTS.map((base) => {
      if (existingMap[base.id]) return { ...existingMap[base.id], isBase: true, label: base.label };
      return { id: base.id, instrument: base.id, operator: "eq", value: "", isBase: true, label: base.label };
    }).concat(currentFilters.filter((r) => !BASE_INSTRUMENTS.some((b) => b.id === r.instrument)));
  });
  const addRule = () => setRules([...rules, { id: Date.now(), instrument: "perc", operator: "eq", value: 0, isBase: false }]);
  const removeRule = (id) => setRules(rules.filter((r) => r.id !== id));
  const updateRule = (id, field, val) => setRules(rules.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const handleApply = () => onApply(rules.filter((r) => r.value !== "" && r.value !== null));
  const INSTRUMENTS_OPTS = [{ label: "Percusión", value: "perc" }, { label: "Timbal", value: "timp" }, { label: "Arpa", value: "harp" }, { label: "Piano/Cel", value: "key" }, { label: "Cuerdas", value: "str" }];

  const content = (
    <div
      className={`w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-[10000] p-4 animate-in fade-in zoom-in-95 ${!anchorRef ? "absolute top-full left-0 mt-2" : ""}`}
      style={anchorRef ? { position: "fixed", top: position.top, left: position.left } : undefined}
    >
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between">Filtro por Orgánico <button type="button" onClick={onClose}><IconX size={14} /></button></h4>
      <div className="mb-3">
        <label className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${strictMode ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
          <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${strictMode ? "bg-indigo-500" : "bg-slate-300"}`} /><span className="text-xs font-bold">Modo Estricto</span></div>
          <span className="text-[9px] uppercase tracking-wider font-bold">{strictMode ? "Solo Selección" : "Admitir Otros"}</span>
          <input type="checkbox" className="hidden" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
        </label>
      </div>
      <div className="mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Sección Cuerdas</label>
        <div className="flex gap-1">
          {["all", "with", "without"].map((m) => (
            <button key={m} type="button" onClick={() => setStringsFilter(m)} className={`flex-1 text-[10px] font-bold py-1 px-2 rounded border ${stringsFilter === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
              {m === "all" ? "Indif." : m === "with" ? "Con" : "Sin"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto mb-3 pr-1 custom-scrollbar">
        {rules.map((rule) => {
          const isActive = rule.value !== "" && rule.value !== null;
          return (
            <div key={rule.id} className={`flex gap-2 items-center text-xs p-1 rounded transition-colors ${isActive ? "bg-indigo-50 border border-indigo-100" : ""}`}>
              <div className="w-24 font-bold text-slate-600 truncate flex items-center">{rule.isBase ? <span className="capitalize">{rule.label}</span> : <select className="w-full bg-transparent border-none outline-none p-0 cursor-pointer" value={rule.instrument} onChange={(e) => updateRule(rule.id, "instrument", e.target.value)}>{INSTRUMENTS_OPTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</select>}</div>
              <select className={`border rounded p-1 outline-none text-center w-14 ${isActive ? "border-indigo-300 bg-white" : "border-slate-200 bg-slate-50"}`} value={rule.operator} onChange={(e) => updateRule(rule.id, "operator", e.target.value)}><option value="eq">=</option><option value="gte">≥</option><option value="lte">≤</option></select>
              <input type="number" min={0} className={`border rounded p-1 w-12 text-center outline-none focus:border-indigo-500 ${isActive ? "border-indigo-300 bg-white font-bold text-indigo-700" : "border-slate-200"}`} placeholder="-" value={rule.value} onChange={(e) => updateRule(rule.id, "value", e.target.value)} />
              {!rule.isBase && <button type="button" onClick={() => removeRule(rule.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={12} /></button>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
        <button type="button" onClick={addRule} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><IconPlus size={10} /> Extra</button>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setRules((prev) => prev.map((r) => r.isBase ? { ...r, value: "" } : r).filter((r) => r.isBase)); setStringsFilter("all"); setStrictMode(false); onApply([]); }} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-2">Limpiar</button>
          <button type="button" onClick={handleApply} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-bold">Filtrar</button>
        </div>
      </div>
    </div>
  );

  return anchorRef
    ? createPortal(content, document.body)
    : content;
};

// --- COMPONENTE INTERNO: SELECTOR DE SOLISTA ---
const SoloistSelect = ({ currentId, musicians, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const selectedMusician = musicians.find((m) => m.id === currentId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = musicians.filter((m) =>
    `${m.apellido}, ${m.nombre}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {!isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          className="w-full text-[10px] text-slate-700 truncate cursor-pointer hover:bg-fixed-indigo-50 p-1 rounded border border-transparent hover:border-fixed-indigo-100 min-h-[24px] flex items-center"
        >
          {selectedMusician ? (
            <span className="font-bold text-fixed-indigo-700">
              {selectedMusician.apellido}, {selectedMusician.nombre}
            </span>
          ) : (
            <span className="text-slate-400 italic">- Seleccionar -</span>
          )}
        </div>
      ) : (
        <div className="absolute top-0 left-0 w-64 bg-white border border-fixed-indigo-200 shadow-xl rounded z-50 animate-in zoom-in-95 duration-100">
          <input
            type="text"
            autoFocus
            placeholder="Buscar apellido..."
            className="w-full p-2 text-xs border-b border-slate-100 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto">
            <div
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="p-2 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer border-b border-slate-50 italic"
            >
              - Quitar Solista -
            </div>
            {filtered.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setIsOpen(false);
                }}
                className={`p-2 text-xs cursor-pointer hover:bg-fixed-indigo-50 flex justify-between ${
                  currentId === m.id
                    ? "bg-fixed-indigo-50 font-bold text-fixed-indigo-700"
                    : "text-slate-600"
                }`}
              >
                <span>
                  {m.apellido}, {m.nombre}
                </span>
                <span className="text-[9px] text-slate-400 ml-2 truncate max-w-[80px]">
                  {m.instrumentos?.instrumento}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function RepertoireManager({
  supabase,
  programId,
  giraId,
  initialData = [],
  isCompact = false,
  readOnly = undefined,
  onSyncArco,
}) {
  const { user, isEditor: isGlobalEditor, isAdmin } = useAuth();

  const isEditor = readOnly !== undefined ? !readOnly : isGlobalEditor;
  // Notas internas (post-it) visibles para quien puede editar en general, aunque la vista esté en readOnly
  const canSeeInternalNotes = isGlobalEditor || isAdmin;

  const [repertorios, setRepertorios] = useState(initialData);
  const [musicians, setMusicians] = useState([]);

  const [seatingMap, setSeatingMap] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [editingBlock, setEditingBlock] = useState({ id: null, nombre: "" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [activeRepertorioId, setActiveRepertorioId] = useState(null);
  const [activeWorkItem, setActiveWorkItem] = useState(null);
  const [worksLibrary, setWorksLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [instrumentList, setInstrumentList] = useState([]);
  const [commentsState, setCommentsState] = useState(null);
  const [filters, setFilters] = useState({
    compositor: "",
    titulo: "",
    arreglador: "",
  });
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [limitToSelected, setLimitToSelected] = useState(false);
  const [workFormData, setWorkFormData] = useState({});
  const [showAddModalInstrFilter, setShowAddModalInstrFilter] = useState(false);
  const [addModalInstrFilters, setAddModalInstrFilters] = useState([]);
  const [addModalStringsFilter, setAddModalStringsFilter] = useState("all");
  const [addModalStrictMode, setAddModalStrictMode] = useState(false);
  const addModalInstrFilterAnchorRef = useRef(null);
  const [savingPosition, setSavingPosition] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  // --- CALCULAR MAPA DE ARCOS DISPONIBLES ---
  const arcosByWork = useMemo(() => {
    const map = {};
    repertorios.forEach((rep) => {
      rep.repertorio_obras?.forEach((item) => {
        const workId = item.obras?.id ?? item.id_obra;
        if (workId == null) return;
        const list = item.obras?.obras_arcos;
        const arr = Array.isArray(list) ? list : list != null ? [list] : [];
        map[workId] = arr;
      });
    });
    return map;
  }, [repertorios]);
  const userInstrumentId = useMemo(() => {
    if (!user || musicians.length === 0) return null;
    const me = musicians.find((m) => m.id === user.id);
    return me?.id_instr;
  }, [musicians, user]);

  useEffect(() => {
    if (!initialData.length && programId) fetchFullRepertoire();
    else if (initialData.length) {
      setRepertorios(
        initialData.map((r) => ({
          ...r,
          repertorio_obras:
            r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
        })),
      );
      fetchFullRepertoire();
    }
    if (musicians.length === 0) fetchMusicians();

    // CALL THE NEW FETCH
    fetchSeating();
  }, [programId, user?.id]);
  useEffect(() => {
    if (isAddModalOpen || isEditWorkModalOpen) {
      if (worksLibrary.length === 0) fetchLibrary();
      if (instrumentList.length === 0) fetchInstruments();
    }
  }, [isAddModalOpen, isEditWorkModalOpen]);

  const fetchMusicians = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, id_instr, instrumentos(instrumento)")
      .order("apellido");
    if (data) setMusicians(data);
  };

  const fetchSeating = async () => {
    if (!programId) return;

    const { data: containers } = await supabase
      .from("seating_contenedores")
      .select("id, nombre")
      .eq("id_programa", programId);

    const { data: items } = await supabase
      .from("seating_contenedores_items")
      .select("id_contenedor, id_musico, orden")
      .in("id_contenedor", containers?.map((c) => c.id) || []);

    const { data: asigns } = await supabase
      .from("seating_asignaciones")
      .select("id_obra, id_particella, id_contenedor, id_musicos_asignados")
      .eq("id_programa", programId);

    setAssignments(asigns || []);

    const newMap = {};
    items?.forEach((item) => {
      if (item.id_musico) {
        const container = containers.find((c) => c.id === item.id_contenedor);

        // Cálculo de la parte numérica: 0 y 1 -> 1, 2 y 3 -> 2, etc.
        const deskNumber = Math.floor((item.orden || 0) / 2) + 1;

        // Identificador de asiento: Par -> 'a', Impar -> 'b'
        const deskSuffix = (item.orden || 0) % 2 === 0 ? "a" : "b";

        newMap[String(item.id_musico)] = {
          containerId: item.id_contenedor,
          containerName: container?.nombre,
          desk: `${deskNumber}${deskSuffix}`, // Resultado: "1a", "1b", etc.
        };
      }
    });
    setSeatingMap(newMap);
  };
  const MultiSoloistSelect = ({
    selectedIds = [],
    musicians,
    onAdd,
    onRemove,
    isEditor,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef(null);

    // Filtrar músicos seleccionados para mostrar los chips
    const selectedMusicians = musicians.filter((m) =>
      selectedIds?.includes(m.id),
    );

    // Filtrar opciones para el desplegable (excluyendo los ya seleccionados)
    const availableOptions = musicians.filter(
      (m) =>
        !selectedIds?.includes(m.id) &&
        `${m.apellido}, ${m.nombre}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );

    return (
      <div className="flex flex-wrap gap-1 items-center p-1" ref={wrapperRef}>
        {/* Renderizado de Chips */}
        {selectedMusicians.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-1 bg-fixed-indigo-100 text-fixed-indigo-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold border border-fixed-indigo-200"
          >
            {/* Cambiamos m.apellido por m.apellido, m.nombre y aumentamos el max-w */}
            <span className="truncate max-w-[120px]">
              {m.apellido}, {m.nombre}
            </span>
            {isEditor && (
              <button
                onClick={() => onRemove(m.id)}
                className="hover:text-red-600 transition-colors"
              >
                <IconX size={10} strokeWidth={3} />
              </button>
            )}
          </div>
        ))}
        {/* Botón de Añadir / Buscador */}
        {isEditor && (
          <div className="relative">
            {!isOpen ? (
              <button
                onClick={() => setIsOpen(true)}
                className="text-[10px] text-slate-400 hover:text-fixed-indigo-600 p-1 italic"
              >
                + Añadir
              </button>
            ) : (
              <div className="absolute top-0 left-0 w-64 bg-white border border-fixed-indigo-200 shadow-xl rounded z-50">
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar..."
                  className="w-full p-2 text-xs border-b outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                />
                <div className="max-h-40 overflow-y-auto">
                  {availableOptions.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        onAdd(m.id);
                        setSearch("");
                        setIsOpen(false);
                      }}
                      className="p-2 text-xs cursor-pointer hover:bg-fixed-indigo-50 flex justify-between"
                    >
                      <span>
                        {m.apellido}, {m.nombre}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {m.instrumentos?.instrumento}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  const fetchInstruments = async () => {
    const { data } = await supabase
      .from("instrumentos")
      .select("id, instrumento")
      .order("id");
    if (data) setInstrumentList(data);
  };

  // src/components/repertoire/RepertoireManager.jsx

  const fetchFullRepertoire = async () => {
    if (repertorios.length === 0) setLoading(true);
    const { data: reps, error } = await supabase
      .from("programas_repertorios")
      .select(
        `*, repertorio_obras (
          id, 
          orden, 
          notas_especificas, 
          ids_solistas,
          google_drive_shortcut_id, 
          excluir, 
          id_arco_seleccionado, 
          obras (
              id, titulo, duracion_segundos, estado, link_drive, link_youtube, anio_composicion, instrumentacion, observaciones, comentarios,
              obras_arcos (id, nombre, link, descripcion, id_drive_folder),
              compositores (id, apellido, nombre), 
              obras_compositores (rol, compositores(id, apellido, nombre)),
          obras_particellas (id, nombre_archivo, nota_organico, id_instrumento, url_archivo, es_solista, instrumentos (instrumento, abreviatura))
          )
      )`,
      )
      .eq("id_programa", programId)
      .order("orden", { ascending: true });

    if (error) {
      console.error("Error al cargar repertorio:", error);
      setLoading(false);
      return;
    }

    setRepertorios(
      reps.map((r) => ({
        ...r,
        repertorio_obras:
          r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
      })),
    );
    setLoading(false);
  };

  const fetchLibrary = async () => {
    setLoadingLibrary(true);
    const { data, error } = await supabase
      .from("obras")
      .select(
        `*, obras_compositores (rol, compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag)), obras_particellas (nombre_archivo, nota_organico, es_solista, instrumentos (instrumento, abreviatura))`,
      )
      .order("titulo");
    if (!error && data)
      setWorksLibrary(
        data.map((w) => ({
          ...w,
          compositor_full: getComposers(w),
          arreglador_full: getArranger(w),
        })),
      );
    setLoadingLibrary(false);
  };

  const autoSyncDrive = async () => {
    setSyncingDrive(true);
    try {
      await supabase.functions.invoke("manage-gira", {
        body: { action: "sync_program", programId: programId },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleWorkSaved = async (savedWorkId, isNew = false) => {
    if (isNew && activeRepertorioId) {
      await addWorkToBlock(savedWorkId, activeRepertorioId);
      if (isAddModalOpen) setIsAddModalOpen(false);
    }
    fetchFullRepertoire();
    if (!isNew) {
      autoSyncDrive();
    }
  };

  const openEditModal = (item) => {
    setActiveWorkItem(item);
    setWorkFormData({ ...item.obras, id: item.obras.id });
    setIsEditWorkModalOpen(true);
  };

  const openCreateModal = () => {
    setWorkFormData({
      id: null,
      titulo: "",
      duracion_segundos: 0,
      link_drive: "",
      link_youtube: "",
      estado: "Solicitud",
    });
    setIsEditWorkModalOpen(true);
  };

  const startEditBlock = (rep) => {
    setEditingBlock({ id: rep.id, nombre: rep.nombre });
  };
  const saveBlockName = async () => {
    if (!editingBlock.nombre.trim()) return;
    setRepertorios(
      repertorios.map((r) =>
        r.id === editingBlock.id ? { ...r, nombre: editingBlock.nombre } : r,
      ),
    );
    await supabase
      .from("programas_repertorios")
      .update({ nombre: editingBlock.nombre })
      .eq("id", editingBlock.id);
    setEditingBlock({ id: null, nombre: "" });
  };

  const moveWork = async (repertorioId, workId, direction) => {
    if (!isEditor) return;
    const repIndex = repertorios.findIndex((r) => r.id === repertorioId);
    if (repIndex === -1) return;
    const currentRep = repertorios[repIndex];
    const obras = [...(currentRep.repertorio_obras || [])];
    if (obras.length === 0) return;
    const workIndex = obras.findIndex((o) => o.id === workId);
    if (workIndex === -1) return;
    const targetIndex = workIndex + direction;
    if (targetIndex < 0 || targetIndex >= obras.length) return;
    const itemA = obras[workIndex];
    const itemB = obras[targetIndex];
    [itemA.orden, itemB.orden] = [itemB.orden, itemA.orden];
    [obras[workIndex], obras[targetIndex]] = [itemB, itemA];
    const newRepertorios = [...repertorios];
    newRepertorios[repIndex].repertorio_obras = obras;
    setRepertorios(newRepertorios);
    await supabase
      .from("repertorio_obras")
      .update({ orden: itemA.orden })
      .eq("id", itemA.id);
    await supabase
      .from("repertorio_obras")
      .update({ orden: itemB.orden })
      .eq("id", itemB.id);
    autoSyncDrive();
  };

  const addWorkToBlock = async (workId, targetRepertorioId = null) => {
    const repId = targetRepertorioId || activeRepertorioId;
    if (!repId) return;

    const currentRep = repertorios.find((r) => r.id === repId);
    const maxOrder =
      currentRep?.repertorio_obras?.reduce(
        (max, o) => (o.orden > max ? o.orden : max),
        0,
      ) || 0;

    await supabase
      .from("repertorio_obras")
      .insert([{ id_repertorio: repId, id_obra: workId, orden: maxOrder + 1 }]);

    if (isAddModalOpen && !targetRepertorioId) {
      setIsAddModalOpen(false);
      fetchFullRepertoire();
    }
    autoSyncDrive();
  };

  // --- ELIMINAR OBRA (CON LIMPIEZA DE SHORTCUTS ROBUSTA) ---
  const removeWork = async (itemId) => {
    if (!confirm("¿Quitar obra?")) return;

    // Buscar la obra para obtener su título (necesario para borrar el shortcut por nombre)
    let workTitle = null;
    repertorios.forEach((rep) => {
      const found = rep.repertorio_obras?.find((o) => o.id === itemId);
      if (found && found.obras) {
        workTitle = found.obras.titulo;
      }
    });

    try {
      setLoading(true);

      // 1. Llamar a Edge Function para limpiar shortcuts asociados a este título en la carpeta de arcos
      if (workTitle) {
        await supabase.functions.invoke("manage-drive", {
          body: {
            action: "delete_work_shortcuts",
            programId: programId || giraId,
            obraTitulo: workTitle,
          },
        });
      }

      // 2. Borrar registro de BD
      await supabase.from("repertorio_obras").delete().eq("id", itemId);

      // 3. Actualizar UI
      fetchFullRepertoire();
    } catch (error) {
      console.error("Error al eliminar obra:", error);
      alert("Error al eliminar obra.");
    } finally {
      setLoading(false);
    }
  };
  const addRepertoireBlock = async () => {
    const nombre = prompt("Nombre del bloque:", "Nuevo Bloque");
    if (!nombre) return;
    await supabase
      .from("programas_repertorios")
      .insert([
        { id_programa: programId, nombre, orden: repertorios.length + 1 },
      ]);
    fetchFullRepertoire();
  };

  const deleteRepertoireBlock = async (id) => {
    if (!confirm("¿Eliminar bloque?")) return;
    await supabase.from("programas_repertorios").delete().eq("id", id);
    fetchFullRepertoire();
    autoSyncDrive();
  };

  const updateWorkDetail = async (itemId, field, value) => {
    setRepertorios(
      repertorios.map((r) => ({
        ...r,
        repertorio_obras: r.repertorio_obras.map((o) =>
          o.id === itemId ? { ...o, [field]: value } : o,
        ),
      })),
    );
    await supabase
      .from("repertorio_obras")
      .update({ [field]: value })
      .eq("id", itemId);
    if (field === "ids_solistas" && Array.isArray(value) && giraId) {
      try {
        for (const solistId of value) {
          await supabase.from("giras_integrantes").upsert(
            {
              id_gira: giraId,
              id_integrante: solistId,
              rol: "solista",
              estado: "confirmado",
            },
            { onConflict: "id_gira, id_integrante" },
          );
        }
      } catch (e) {
        console.error("Error al sincronizar plantel:", e);
      }
    }
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
  // --- LÓGICA PARA IDENTIFICAR INSTRUMENTOS DE CUERDA ---
  const isStringInstrument = useMemo(() => {
    if (!user || musicians.length === 0) return false;
    const me = musicians.find((m) => m.id === user.id);
    const instr = me?.instrumentos?.instrumento?.toLowerCase() || "";
    // Detectamos si el nombre del instrumento contiene palabras clave de cuerdas
    return [
      "violín",
      "violin",
      "viola",
      "violoncello",
      "cello",
      "contrabajo",
    ].some((s) => instr.includes(s));
  }, [musicians, user]);

  const isTourStarted = !!giraId;
  const getMyPartUrl = (obra) => {
    if (!user || !assignments.length) return null;

    const userId = String(user.id);
    const mySeating = seatingMap[userId];

    const assignment = assignments.find((a) => {
      const matchObra = String(a.id_obra) === String(obra.id);
      if (!matchObra) return false;
      const matchUser = a.id_musicos_asignados?.some(
        (id) => String(id) === userId,
      );
      const matchContainer =
        mySeating?.containerId &&
        String(a.id_contenedor) === String(mySeating.containerId);
      return matchUser || matchContainer;
    });

    if (!assignment) return null;

    const myPart = obra.obras_particellas?.find(
      (p) => String(p.id) === String(assignment.id_particella),
    );

    if (!myPart) return null;

    let url = myPart.url_archivo;
    try {
      if (url?.startsWith("[")) url = JSON.parse(url)[0]?.url;
    } catch (e) {}

    return { url, name: myPart.nombre_archivo };
  };
  const renderMyPartBadge = (obra) => {
    const isDebugWork = true;

    if (!user || !assignments.length) {
      if (isDebugWork && !user)
        if (isDebugWork && !assignments.length)
          //console.log(`DEBUG BADGE [${obra.titulo}]: No hay user`);
          //console.log(`DEBUG BADGE [${obra.titulo}]: No hay assignments`);
          return null;
    }

    const userId = String(user.id);
    const mySeating = seatingMap[userId];

    const assignment = assignments.find((a) => {
      const matchObra = String(a.id_obra) === String(obra.id);
      if (!matchObra) return false;

      const matchUser = a.id_musicos_asignados?.some(
        (id) => String(id) === userId,
      );

      const matchContainer =
        mySeating?.containerId &&
        String(a.id_contenedor) === String(mySeating.containerId);

      return matchUser || matchContainer;
    });

    if (!assignment) return null;

    const myPart = obra.obras_particellas?.find(
      (p) => String(p.id) === String(assignment.id_particella),
    );

    if (!myPart) {
      return null;
    }

    const label = isStringInstrument
      ? "𝄞"
      : (myPart.nombre_archivo || "Parte").replace(/\.[^/.]+$/, "");
    let url = myPart.url_archivo;
    try {
      if (url?.startsWith("[")) url = JSON.parse(url)[0]?.url;
    } catch (e) {}

    const isGlyph = label === "𝄞";

    return (
      <a
        href={url || "#"}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => !url && e.preventDefault()}
        className={`mt-1 inline-flex items-center gap-1 rounded border transition-all shadow-sm group w-fit ${
          isGlyph ? "px-1.5 py-0 min-w-[22px] justify-center" : "px-2 py-0.5"
        } ${
          url
            ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-600 hover:text-white"
            : "bg-slate-100 text-slate-400 border-slate-200 cursor-help"
        }`}
        title={url ? `Abrir: ${myPart.nombre_archivo}` : "Archivo pendiente"}
      >
        {!isGlyph && (
          <IconDrive
            size={10}
            className={
              url ? "text-emerald-400 group-hover:text-white" : "opacity-50"
            }
          />
        )}
        <span
          className={`font-black uppercase tracking-tight ${isGlyph ? "text-[12px]" : "text-[9px]"}`}
        >
          {label}
        </span>
      </a>
    );
  };
  const filteredLibrary = worksLibrary.filter((w) => {
    if (filters.titulo && !w.titulo?.toLowerCase().includes(filters.titulo.toLowerCase())) return false;
    if (filters.compositor && !w.compositor_full?.toLowerCase().includes(filters.compositor.toLowerCase())) return false;
    if (filters.arreglador && !w.arreglador_full?.toLowerCase().includes(filters.arreglador.toLowerCase())) return false;

    const instr = w.instrumentacion || calculateInstrumentation(w.obras_particellas) || "";
    const hasStr = hasStrings(instr);

    if (addModalStringsFilter !== "all") {
      if (addModalStringsFilter === "with" && !hasStr) return false;
      if (addModalStringsFilter === "without" && hasStr) return false;
    }

    if (addModalInstrFilters.length > 0 || addModalStringsFilter !== "all" || addModalStrictMode) {
      const passActiveRules = addModalInstrFilters.every((rule) => {
        const countInWork = getInstrumentValue(instr, rule.instrument);
        const targetVal = parseInt(rule.value, 10) || 0;
        if (rule.operator === "eq") return countInWork === targetVal;
        if (rule.operator === "gte") return countInWork >= targetVal;
        if (rule.operator === "lte") return countInWork <= targetVal;
        return true;
      });
      if (!passActiveRules) return false;

      if (addModalStrictMode) {
        const activeKeys = new Set(addModalInstrFilters.map((r) => r.instrument));
        const masterList = ["fl", "ob", "cl", "bn", "hn", "tpt", "tbn", "tba", "timp", "perc", "harp", "key"];
        for (const key of masterList) {
          if (!activeKeys.has(key) && (getInstrumentValue(instr, key) || 0) > 0) return false;
        }
        if (addModalStringsFilter === "all" && hasStr) return false;
        if (instr.includes("+")) return false;
      }
    }
    return true;
  });
  // --- MANEJADOR CAMBIO DE ARCO (BD + DRIVE VIA PADRE) ---
  const handleArcoSelectionChange = async (item, newArcoId) => {
    // 1. Actualización optimista en BD (Repertorio)
    updateWorkDetail(item.id, "id_arco_seleccionado", newArcoId);

    // 2. Si es deselección, terminamos
    if (!newArcoId) return;

    // 3. Obtener datos del arco seleccionado
    const selectedArco = arcosByWork[item.obras.id]?.find(
      (a) => a.id == newArcoId,
    );
    if (!selectedArco) return;

    // Intentar obtener ID de Drive
    let targetId = selectedArco.id_drive_folder;
    if (!targetId && selectedArco.link) {
      const match = selectedArco.link.match(/[-\w]{25,}/);
      if (match) targetId = match[0];
    }

    if (!targetId) {
      console.warn("No hay ID de Drive para vincular shortcut.");
      return;
    }

    // 4. Delegar al padre la sincronización con Drive
    if (onSyncArco) {
      onSyncArco(item.obras, selectedArco.nombre, targetId)
        .then(() => console.log("Arcos vinculados correctamente."))
        .catch((err) => console.error("Error vinculando arcos:", err));
    }
  };
  // --- Crear Set de Arcos (columna Arcos en tabla) ---
  const handleCreateBowingSetForManager = async (workId, workTitle, nombre) => {
    if (!onSyncArco) throw new Error("Función de sincronización no disponible.");
    const result = await onSyncArco(
      { id: workId, titulo: workTitle },
      nombre,
      null,
    );
    return result;
  };

  // --- Drag & Drop: fila ordenable con handle GripVertical ---
  const SortableRepertorioRow = ({
    item,
    rep,
    idx,
    rowClassName,
    isEditor,
    isCompact,
    moveWork,
    dragOverId,
    children,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: item.id,
      data: { id_repertorio: rep.id, index: idx },
    });
    const isOver = dragOverId === item.id;
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`${rowClassName} ${isOver ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50/80" : ""}`}
      >
        <td className="p-1 text-center w-8 align-middle">
          {isEditor && !isCompact && (
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 inline-flex touch-none"
              title="Arrastrar para reordenar"
            >
              <IconGripVertical size={16} />
            </div>
          )}
        </td>
        <td className="p-1 text-center font-bold text-slate-500">
          <span>{idx + 1}</span>
        </td>
        {children}
      </tr>
    );
  };

  const BLOCK_ZONE_START = (repId) => `block-${repId}-start`;
  const BLOCK_ZONE_END = (repId) => `block-${repId}-end`;

  const BlockDropZoneRow = ({ zoneId, label }) => {
    const { setNodeRef, isOver } = useDroppable({ id: zoneId });
    return (
      <tr ref={setNodeRef}>
        <td
          colSpan={13}
          className={`min-h-[28px] py-1 px-2 border-2 border-dashed rounded text-[10px] text-slate-400 transition-colors ${
            isOver ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-slate-200 bg-slate-50/50"
          }`}
        >
          {label}
        </td>
      </tr>
    );
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const itemId = active.id;
    const overId = over.id;
    let sourceRep = null;
    let sourceIdx = -1;
    let targetRep = null;
    let targetIdx = -1;

    for (const r of repertorios) {
      const i = (r.repertorio_obras || []).findIndex((o) => o.id === itemId);
      if (i >= 0) {
        sourceRep = r;
        sourceIdx = i;
        break;
      }
    }
    if (!sourceRep) return;

    const obras = (r) => r.repertorio_obras || [];
    if (typeof overId === "string" && overId.startsWith("block-")) {
      const parts = overId.split("-");
      const repId = parseInt(parts[1], 10);
      const zone = parts[2];
      targetRep = repertorios.find((r) => r.id === repId);
      if (!targetRep) return;
      targetIdx = zone === "start" ? 0 : obras(targetRep).length;
    } else {
      for (const r of repertorios) {
        const i = obras(r).findIndex((o) => o.id === overId);
        if (i >= 0) {
          targetRep = r;
          targetIdx = i;
          break;
        }
      }
    }
    if (!targetRep) return;

    const movedToOtherBlock = sourceRep.id !== targetRep.id;
    const nuevoIdBloque = targetRep.id;
    // Si soltamos en "inicio", usar orden 0 para que tras normalizar quede primero (evita empate con el actual orden 1).
    const nuevoOrden = targetIdx === 0 ? 0 : targetIdx + 1;

    setSavingPosition(true);
    try {
      await updateWorkPosition(supabase, itemId, nuevoIdBloque, nuevoOrden);
      await normalizeRepertorioBlockOrden(supabase, sourceRep.id);
      if (movedToOtherBlock) {
        await normalizeRepertorioBlockOrden(supabase, targetRep.id);
      }
      await fetchFullRepertoire();
      autoSyncDrive();
    } catch (err) {
      console.error("Error reordenando obra:", err);
    } finally {
      setSavingPosition(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const allRepertorioObraIds = useMemo(
    () => repertorios.flatMap((r) => (r.repertorio_obras || []).map((o) => o.id)),
    [repertorios],
  );

  const activeDragItemData = useMemo(() => {
    if (!activeDragId) return null;
    for (const r of repertorios) {
      const item = (r.repertorio_obras || []).find((o) => o.id === activeDragId);
      if (item) return { item, rep: r };
    }
    return null;
  }, [activeDragId, repertorios]);

  return (
    <div className={containerClasses(isCompact)}>
      {savingPosition && (
        <div className="sticky top-0 z-20 flex items-center justify-center py-2 bg-amber-100 border-b border-amber-200 text-amber-800 text-sm font-bold shadow-sm">
          <IconLoader size={16} className="animate-spin mr-2" />
          Guardando orden...
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          setDragOverId(null);
          setActiveDragId(active.id);
        }}
        onDragOver={({ over }) => setDragOverId(over?.id ?? null)}
        onDragEnd={(e) => {
          setDragOverId(null);
          setActiveDragId(null);
          handleDragEnd(e);
        }}
      >
        <SortableContext items={allRepertorioObraIds} strategy={verticalListSortingStrategy}>
      {repertorios.map((rep) => {
        // Calculamos el atril para el usuario actual en este bloque (si aplica)
        const userSeating = user ? seatingMap[user.id] : null;

        return (
          <div
            key={rep.id}
            className={`border border-slate-200 ${
              isCompact ? "mb-4 rounded shadow-sm" : "shadow-sm bg-white mb-6"
            } ${activeDragId ? "overflow-visible z-10" : ""}`}
          >
            {/* --- HEADER DEL BLOQUE (TÍTULO Y DURACIÓN) --- */}
            <div className="bg-fixed-indigo-50/50 p-2 border-b border-slate-200 flex justify-between items-center h-10 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <IconMusic size={14} className="text-fixed-indigo-600" />
                {editingBlock.id === rep.id ? (
                  <input
                    autoFocus
                    type="text"
                    className="w-full text-xs p-1 border border-fixed-indigo-300 rounded outline-none"
                    value={editingBlock.nombre}
                    onChange={(e) =>
                      setEditingBlock({
                        ...editingBlock,
                        nombre: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveBlockName();
                    }}
                    onBlur={saveBlockName}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2 group cursor-pointer"
                      onClick={() => isEditor && startEditBlock(rep)}
                    >
                      {rep.nombre}{" "}
                      {isEditor && (
                        <IconEdit
                          size={12}
                          className="opacity-0 group-hover:opacity-100 text-slate-400"
                        />
                      )}
                    </span>

                    {/* Badge de Atril (si el usuario tiene asignación) */}
                    {userSeating && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-fixed-indigo-200 rounded text-[10px] text-fixed-indigo-700 shadow-sm animate-in fade-in">
                        <span className="font-bold">
                          {userSeating.containerName}
                        </span>
                        <span className="text-fixed-indigo-200">|</span>
                        <span className="font-medium">
                          Atril {userSeating.desk}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-1.5 rounded border">
                  Total: {calculateTotalDuration(rep.repertorio_obras)}
                </span>
                {isEditor && (
                  <button
                    onClick={() => deleteRepertoireBlock(rep.id)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <IconTrash size={12} />
                  </button>
                )}
              </div>
            </div>
            {/* ============================================================ */}
            {/* VISTA MÓVIL: TARJETAS COMPACTAS (LESS SPACING)             */}
            {/* ============================================================ */}
            <div className="md:hidden bg-slate-50 p-2 space-y-1">
              {rep.repertorio_obras.map((item, idx) => {
                // LÓGICA DE BORDE IZQUIERDO:
                const myPartData = getMyPartUrl(item.obras);
                // Está cargada si existe myPartData y tiene URL
                const hasUploadedPart = !!myPartData?.url;

                const estado = item.obras.estado;
                let borderClass = "bg-slate-300";
                let cardBorderClass = "border-slate-200";

                if (estado === "Informativo") {
                  borderClass = "bg-blue-500";
                  cardBorderClass = "border-blue-400 bg-blue-50/50";
                } else if (estado === "Solicitud") {
                  borderClass = "bg-amber-500";
                  cardBorderClass = "border-amber-300 bg-amber-50/50";
                } else if (estado === "Oficial") {
                  borderClass = "bg-emerald-500";
                  cardBorderClass = "border-emerald-300 bg-emerald-50/60";
                } else if (!estado && hasUploadedPart) {
                  borderClass = "bg-emerald-500";
                  cardBorderClass = "border-emerald-300 bg-emerald-50/40";
                }

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border shadow-sm p-2 relative overflow-hidden ${cardBorderClass}`}
                  >
                    {/* Barra lateral de estado */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${borderClass}`}
                    ></div>

                    <div className="flex gap-2 pl-2 pr-1">
                      <div className="flex-1 min-w-0">
                        {/* Fila 1: Orden, Compositor, Duración */}
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full relative">
                              {idx + 1}
                              {/* ICONO OJO TACHADO SI ESTÁ EXCLUIDA (Solo visual) */}
                              {item.excluir && (
                                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 border border-red-100">
                                  <IconEyeOff size={8} className="text-red-500" />
                                </div>
                              )}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate max-w-[150px]">
                              {getComposers(item.obras)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-600 border border-slate-100">
                            {formatSecondsToTime(item.obras.duracion_segundos)}
                          </span>
                        </div>

                        {/* Fila 2: Título Multi-línea */}
                        <div className="mb-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <MultiLineTitle content={item.obras.titulo} />
                            {item.obras.estado === "Informativo" && (
                              <span className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded border border-blue-200 align-text-top">
                                INFO
                              </span>
                            )}
                          </div>
                          {canSeeInternalNotes &&
                            (item.obras.estado === "Solicitud" ||
                              item.obras.estado === "Pendiente") &&
                            (item.obras.nota_interna ||
                              item.obras.observaciones ||
                              item.obras.comentarios) && (
                              <div className="group relative w-fit mt-1">
                                <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded-sm shadow-sm flex items-center gap-1 cursor-help transform -rotate-1 hover:rotate-0 transition-transform origin-left max-w-[160px]">
                                  <span className="text-[9px]">📝</span>
                                  <span className="truncate font-normal">
                                    {(item.obras.nota_interna ||
                                      item.obras.observaciones ||
                                      item.obras.comentarios)
                                      ?.replace(/<[^>]*>?/gm, "")
                                      .trim()
                                      .slice(0, 60)}
                                    {((item.obras.nota_interna ||
                                      item.obras.observaciones ||
                                      item.obras.comentarios)
                                      ?.replace(/<[^>]*>?/gm, "")
                                      .trim().length || 0) > 60
                                      ? "…"
                                      : ""}
                                  </span>
                                </div>
                                <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-56 bg-yellow-50 border border-yellow-200 shadow-xl p-2 rounded text-xs font-normal text-slate-700 z-[60] whitespace-normal animate-in fade-in zoom-in-95">
                                  {(item.obras.nota_interna ||
                                    item.obras.observaciones ||
                                    item.obras.comentarios)
                                    ?.replace(/<[^>]*>?/gm, " ")
                                    .replace(/\s+/g, " ")
                                    .trim()}
                                </div>
                              </div>
                            )}
                          {getArranger(item.obras) !== "-" && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                              Arr: {getArranger(item.obras)}
                            </p>
                          )}
                        </div>

                        {/* Fila 3: Instrumentación + Mi Parte */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1 rounded">
                            {item.obras.instrumentacion ||
                              calculateInstrumentation(
                                item.obras.obras_particellas,
                              ) ||
                              "-"}
                          </span>
                          {renderMyPartBadge(item.obras)}
                        </div>

                        {/* Fila 4: Notas */}
                        {item.notas_especificas && (
                          <div className="mb-2">
                            <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 text-[10px] p-1.5 rounded relative">
                              <IconAlertCircle
                                size={10}
                                className="absolute top-2 left-1 opacity-50"
                              />
                              <div className="pl-3 leading-tight">
                                <RichTextPreview content={item.notas_especificas} />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Fila 5: Solistas */}
                        {(item.ids_solistas || item.id_solista) && (
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            {(
                              item.ids_solistas ||
                              (item.id_solista ? [item.id_solista] : [])
                            ).map((id) => {
                              const m = musicians.find((mus) => mus.id === id);
                              return m ? (
                                <span
                                  key={id}
                                  className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100"
                                >
                                  ★ {`${m.apellido}, ${m.nombre}`}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Fila 6: Botonera inferior */}
                        <div className="pt-1 border-t border-slate-50 flex justify-between items-center">
                          <div className="flex gap-3">
                            {(item.google_drive_shortcut_id ||
                              item.obras.link_drive) && (
                              <a
                                href={item.obras.link_drive}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 flex items-center gap-1 text-[10px] font-medium"
                              >
                                <IconDrive size={12} /> Drive
                              </a>
                            )}
                            {item.obras.link_youtube && (
                              <a
                                href={item.obras.link_youtube}
                                target="_blank"
                                rel="noreferrer"
                                className="text-red-600 flex items-center gap-1 text-[10px] font-medium"
                              >
                                <IconYoutube size={12} /> Video
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <CommentButton
                              supabase={supabase}
                              entityType="OBRA"
                              entityId={item.id}
                              onClick={() =>
                                setCommentsState({
                                  type: "OBRA",
                                  id: item.id,
                                  title: item.obras.titulo,
                                })
                              }
                              className="text-slate-400 hover:text-fixed-indigo-600 p-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Columna de acciones (orden / editar / borrar) */}
                      {isEditor && (
                        <div className="flex flex-col items-center justify-between py-1">
                          <button
                            onClick={() => moveWork(rep.id, item.id, -1)}
                            disabled={idx === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 disabled:opacity-25"
                            title="Mover arriba"
                          >
                            <IconChevronDown size={14} className="rotate-180" />
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            className="w-7 h-7 mt-1 mb-1 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200"
                            title="Editar obra"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            onClick={() => moveWork(rep.id, item.id, 1)}
                            disabled={idx === rep.repertorio_obras.length - 1}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 disabled:opacity-25"
                            title="Mover abajo"
                          >
                            <IconChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => removeWork(item.id)}
                            className="w-7 h-7 mt-1 flex items-center justify-center rounded-full bg-red-50 text-red-500 shadow-sm hover:bg-red-100"
                            title="Eliminar obra"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ============================================================ */}
            {/* VISTA ESCRITORIO: TABLA (Visible solo en md o superior)      */}
            {/* ============================================================ */}
            <div className={`hidden md:block pb-4 ${activeDragId ? "overflow-visible" : "overflow-x-auto"}`}>
              <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1200px]">
                {/* --- NUEVO: DEFINICIÓN DE ANCHOS INDEPENDIENTE DE HEADER --- */}
                <colgroup>
                  <col className="w-8" />
                  <col className="w-8" />
                  <col className="w-10" />
                  <col className="w-[88px]" />
                  <col className="w-[280px]" />
                  <col className="w-[150px]" />
                  <col className="w-14" />
                  <col className="w-[96px]" />
                  <col className="w-[72px]" />
                  <col className="w-28" />
                  <col className="w-[160px]" />
                  <col className="w-12" />
                  <col className="w-[72px]" />
                  <col className="w-10" />
                </colgroup>

                <thead className={tableHeaderClasses(isCompact)}>
                  <tr>
                    <th className="p-1 w-8" aria-label="Arrastrar" />
                    <th className="p-1 text-center">#</th>
                    <th className="p-1 text-center">GD</th>
                    <th className="p-1">Compositor</th>
                    <th className="p-1">Obra</th>
                    <th className="p-1 text-center">Instr.</th>
                    <th className="p-1 text-center">Dur.</th>
                    <th className="p-1">Solista</th>
                    <th className="p-1">Arr.</th>
                    <th className="p-1">Notas</th>
                    <th className="p-1 text-center">Arcos</th>
                    <th className="p-1 text-center">YT</th>
                    <th className="p-1 text-right"></th>
                    <th className="p-1 text-center">Excl.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isEditor && !isCompact && activeDragId && (
                    <BlockDropZoneRow
                      zoneId={BLOCK_ZONE_START(rep.id)}
                      label={
                        (rep.repertorio_obras || []).length === 0
                          ? "Soltar aquí para agregar la primera obra"
                          : "Soltar aquí para colocar al inicio"
                      }
                    />
                  )}
                  {(rep.repertorio_obras || []).map((item, idx) => (
                    <SortableRepertorioRow
                      key={item.id}
                      item={item}
                      rep={rep}
                      idx={idx}
                      rowClassName={`group ${
                        item.obras.estado === "Informativo"
                          ? "bg-blue-50 hover:bg-blue-100 border-l-2 border-blue-400"
                          : item.obras.estado !== "Oficial"
                            ? "bg-amber-50 hover:bg-amber-100"
                            : "bg-emerald-50 hover:bg-emerald-100 border-l-2 border-emerald-400"
                      }`}
                      isEditor={isEditor}
                      isCompact={isCompact}
                      moveWork={moveWork}
                      dragOverId={dragOverId}
                    >
                      <td className="p-1 text-center">
                        {item.obras.estado === "Informativo" ? (
                          <span className="text-slate-300 text-[10px]" title="Obra informativa (sin archivo)">—</span>
                        ) : item.google_drive_shortcut_id ? (
                          item.obras.link_drive ? (
                            <a
                              href={item.obras.link_drive}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex justify-center text-slate-600 hover:text-fixed-indigo-600"
                              title="Abrir carpeta original en Drive"
                            >
                              <IconDrive className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <IconDrive className="w-3.5 h-3.5 mx-auto text-slate-600" />
                          )
                        ) : item.obras.link_drive ? (
                          <a
                            href={item.obras.link_drive}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-2 h-2 bg-amber-400 rounded-full mx-auto"
                            title="Abrir carpeta original en Drive"
                          ></a>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>
                      <td className="p-1 text-slate-600 align-middle">
                        <div className="flex flex-col justify-center">
                          <span
                            className="truncate text-[11px] font-medium leading-tight"
                            title={getComposers(item.obras)}
                          >
                            {getComposers(item.obras)}
                          </span>
                          {renderMyPartBadge(item.obras)}
                        </div>
                      </td>
                      <td
                        className="p-1 text-slate-800"
                        title={item.obras.titulo?.replace(/<[^>]*>?/gm, "")}
                      >
                        <div className="flex flex-col gap-1 w-full min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <RichTextPreview content={item.obras.titulo} />
                            {item.obras.estado === "Informativo" && (
                              <span className="ml-1 text-[8px] bg-blue-100 text-blue-600 px-1 rounded border border-blue-200 align-text-top">
                                INFO
                              </span>
                            )}
                            {(item.obras.estado === "Solicitud" || item.obras.estado === "Pendiente") && (
                              <span className="ml-1 text-[8px] bg-amber-100 text-amber-700 px-1 rounded border border-amber-200 align-text-top">
                                PEND
                              </span>
                            )}
                          </div>
                          {canSeeInternalNotes && (item.obras.estado === "Solicitud" || item.obras.estado === "Pendiente") && (item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios) && (
                            <div className="group relative w-fit">
                              <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded-sm shadow-sm flex items-center gap-1 cursor-help transform -rotate-1 hover:rotate-0 transition-transform origin-left max-w-[160px]">
                                <span className="text-[9px]">📝</span>
                                <span className="truncate font-normal">
                                  {(item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios)?.replace(/<[^>]*>?/gm, "").trim().slice(0, 60)}
                                  {((item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios)?.replace(/<[^>]*>?/gm, "").trim().length || 0) > 60 ? "…" : ""}
                                </span>
                              </div>
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-56 bg-yellow-50 border border-yellow-200 shadow-xl p-2 rounded text-xs font-normal text-slate-700 z-[60] whitespace-normal animate-in fade-in zoom-in-95">
                                {(item.obras.nota_interna || item.obras.observaciones || item.obras.comentarios)?.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim()}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-1 text-center whitespace-pre-line text-[10px] text-slate-500 font-mono">
                        {item.obras.instrumentacion ||
                          calculateInstrumentation(
                            item.obras.obras_particellas,
                          ) ||
                          "-"}
                      </td>
                      <td className="p-1 text-center font-mono">
                        {formatSecondsToTime(item.obras.duracion_segundos)}
                      </td>
                      <td className="p-0 border-l border-slate-100 align-middle">
                        {isEditor ? (
                          <div className="px-1">
                            <MultiSoloistSelect
                              selectedIds={
                                item.ids_solistas ||
                                (item.id_solista ? [item.id_solista] : [])
                              }
                              musicians={musicians}
                              isEditor={true}
                              onAdd={(newId) => {
                                const current =
                                  item.ids_solistas ||
                                  (item.id_solista ? [item.id_solista] : []);
                                updateWorkDetail(item.id, "ids_solistas", [
                                  ...current,
                                  newId,
                                ]);
                              }}
                              onRemove={(removeId) => {
                                const current =
                                  item.ids_solistas ||
                                  (item.id_solista ? [item.id_solista] : []);
                                updateWorkDetail(
                                  item.id,
                                  "ids_solistas",
                                  current.filter((id) => id !== removeId),
                                );
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 p-1">
                            {(
                              item.ids_solistas ||
                              (item.id_solista ? [item.id_solista] : [])
                            ).length > 0 ? (
                              (
                                item.ids_solistas ||
                                (item.id_solista ? [item.id_solista] : [])
                              ).map((id) => {
                                const m = musicians.find(
                                  (mus) => mus.id === id,
                                );
                                return m ? (
                                  <span
                                    key={id}
                                    className="text-[10px] font-bold text-fixed-indigo-700 bg-fixed-indigo-50 px-1.5 py-0.5 rounded border border-fixed-indigo-100 truncate max-w-[100px]"
                                  >
                                    {m.apellido}, {m.nombre[0]}.
                                  </span>
                                ) : null;
                              })
                            ) : (
                              <span className="text-[10px] text-slate-300 italic p-1">
                                -
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-1 truncate text-slate-500">
                        {getArranger(item.obras)}
                      </td>
                      <td className="p-0 border-l border-slate-100 align-middle">
                        {isEditor ? (
                          <input
                            type="text"
                            className="w-full bg-transparent p-1 text-[10px] outline-none"
                            placeholder="..."
                            value={item.notas_especificas || ""}
                            onChange={(e) =>
                              updateWorkDetail(
                                item.id,
                                "notas_especificas",
                                e.target.value,
                              )
                            }
                          />
                        ) : (
                          <div className="block p-1 text-[10px]">
                            <RichTextPreview content={item.notas_especificas} />
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-4 align-middle w-[160px] min-w-[140px]">
                        <div className="flex flex-row items-center gap-2 w-full max-w-[160px]">
                          <div className="relative flex-1 min-w-0 group">
                            <div
                              className={`flex items-center justify-between px-2 py-1 rounded-full border text-[10px] font-medium truncate transition-all ${item.id_arco_seleccionado ? "bg-fixed-indigo-50 border-fixed-indigo-200 text-fixed-indigo-700 group-hover:border-fixed-indigo-300" : "bg-white border-slate-200 text-slate-400 border-dashed group-hover:border-fixed-indigo-300 group-hover:text-fixed-indigo-400"}`}
                            >
                              <span className="truncate w-full text-center">
                                {item.id_arco_seleccionado
                                  ? (arcosByWork[item.obras?.id ?? item.id_obra] ?? []).find(
                                      (a) => a.id == item.id_arco_seleccionado,
                                    )?.nombre
                                  : "+ Asignar Arcos"}
                              </span>
                            </div>
                            <select
                              value={item.id_arco_seleccionado || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "NEW_SET_ACTION") {
                                  const nombreSet = prompt(
                                    "Nombre para el nuevo set de arcos:",
                                    `Arcos ${new Date().getFullYear()}`,
                                  );
                                  if (!nombreSet?.trim()) return;
                                  handleCreateBowingSetForManager(
                                    item.obras?.id ?? item.id_obra,
                                    item.obras?.titulo ?? "",
                                    nombreSet.trim(),
                                  ).then((result) => {
                                    if (result?.newArcoId) {
                                      handleArcoSelectionChange(item, result.newArcoId);
                                      fetchFullRepertoire();
                                    }
                                  }).catch((err) => {
                                    console.error("Error creando set de arcos:", err);
                                    alert(err?.message || "Error al crear set de arcos.");
                                  });
                                } else {
                                  handleArcoSelectionChange(
                                    item,
                                    val === "" ? null : val,
                                  );
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              title={
                                item.id_arco_seleccionado
                                  ? (arcosByWork[item.obras?.id ?? item.id_obra] ?? []).find(
                                      (a) => a.id == item.id_arco_seleccionado,
                                    )?.nombre
                                  : "Seleccionar set de arcos"
                              }
                            >
                              <option value="">-- Sin definir --</option>
                              {(arcosByWork[item.obras?.id ?? item.id_obra] ?? []).map((arco) => (
                                <option key={arco.id} value={arco.id}>
                                  {arco.nombre}
                                </option>
                              ))}
                              <option disabled>──────────</option>
                              <option value="NEW_SET_ACTION">
                                + Crear Nuevo Set...
                              </option>
                            </select>
                          </div>
                          {item.id_arco_seleccionado && (arcosByWork[item.obras?.id ?? item.id_obra] ?? []).find((a) => a.id == item.id_arco_seleccionado)?.link && (
                            <a
                              href={(arcosByWork[item.obras?.id ?? item.id_obra] ?? []).find((a) => a.id == item.id_arco_seleccionado)?.link}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-fixed-indigo-600 hover:bg-fixed-indigo-50 rounded-full transition-colors"
                              title="Ver carpeta en Drive"
                            >
                              <IconLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-1 text-center">
                        {item.obras.link_youtube ? (
                          <a
                            href={item.obras.link_youtube}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-600"
                          >
                            <IconYoutube size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>
                      <td className="p-1 text-right">
                        <div className="flex justify-end gap-1">
                          <CommentButton
                            supabase={supabase}
                            entityType="OBRA"
                            entityId={item.id}
                            onClick={() =>
                              setCommentsState({
                                type: "OBRA",
                                id: item.id,
                                title: item.obras.titulo,
                              })
                            }
                            className="p-1"
                          />
                          {isEditor && (
                            <>
                              <button
                                onClick={() => openEditModal(item)}
                                className="text-slate-300 hover:text-fixed-indigo-600 p-1"
                              >
                                <IconEdit size={12} />
                              </button>
                              <button
                                onClick={() => removeWork(item.id)}
                                className="text-slate-300 hover:text-red-600 p-1"
                              >
                                <IconTrash size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-1 text-center align-middle">
                        {isEditor ? (
                          <input
                            type="checkbox"
                            className="cursor-pointer accent-red-600"
                            checked={!!item.excluir}
                            onChange={(e) =>
                              updateWorkDetail(
                                item.id,
                                "excluir",
                                e.target.checked,
                              )
                            }
                            title="Excluir de la programación"
                          />
                        ) : item.excluir ? (
                          <span className="text-red-600 font-bold text-[10px]">
                            NO
                          </span>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>
                    </SortableRepertorioRow>
                  ))}
                  {isEditor && !isCompact && activeDragId && (rep.repertorio_obras || []).length > 0 && (
                    <BlockDropZoneRow
                      zoneId={BLOCK_ZONE_END(rep.id)}
                      label="Soltar aquí para colocar al final"
                    />
                  )}
                </tbody>
              </table>
            </div>

            {isEditor && (
              <div className="bg-slate-50 border-t p-1">
                <button
                  onClick={() => {
                    setActiveRepertorioId(rep.id);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full py-1 text-slate-400 hover:text-fixed-indigo-600 text-[10px] font-bold uppercase flex justify-center gap-1 hover:bg-slate-100"
                >
                  <IconPlus size={10} /> Agregar Obra
                </button>
              </div>
            )}
          </div>
        );
      })}
        </SortableContext>

        <DragOverlay dropAnimation={null} zIndex={9998}>
          {activeDragItemData ? (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-2 flex items-center gap-3 min-w-[280px] pointer-events-none">
              <IconGripVertical size={16} className="text-slate-400 shrink-0" />
              <span className="text-slate-500 font-bold text-xs w-5 text-center shrink-0">#</span>
              <span className="text-[11px] text-slate-600 truncate max-w-[120px]">
                {getComposers(activeDragItemData.item.obras)}
              </span>
              <span className="text-[11px] font-medium text-slate-800 truncate max-w-[180px]" title={activeDragItemData.item.obras?.titulo?.replace(/<[^>]*>?/gm, "")}>
                <RichTextPreview content={activeDragItemData.item.obras?.titulo} />
              </span>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {formatSecondsToTime(activeDragItemData.item.obras?.duracion_segundos)}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!isCompact && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {syncingDrive && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                <IconLoader className="animate-spin inline mr-1" />
                Sincronizando carpetas de Drive
              </span>
            )}
          </div>
          {isEditor && (
            <button
              onClick={addRepertoireBlock}
              className="bg-fixed-indigo-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2"
            >
              <IconPlus size={16} /> Bloque
            </button>
          )}
        </div>
      )}

      {/* MODAL BUSCAR */}
      {isAddModalOpen && isEditor && (
        <ModalPortal>
          <div className="bg-white w-full max-w-5xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex gap-2">
                <IconSearch size={18} /> Buscar Obra
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="p-2 border-b grid grid-cols-1 md:grid-cols-5 gap-4 bg-white items-end">
              <div className="space-y-2">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Compositor</div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  autoFocus
                  className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                  value={filters.compositor}
                  onChange={(e) =>
                    setFilters({ ...filters, compositor: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Arreglador</div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                  value={filters.arreglador}
                  onChange={(e) =>
                    setFilters({ ...filters, arreglador: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Obra</div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:border-indigo-500"
                  value={filters.titulo}
                  onChange={(e) =>
                    setFilters({ ...filters, titulo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 relative">
                <div className="flex items-center text-xs font-bold text-slate-500 uppercase">Orgánico</div>
                <button
                  ref={addModalInstrFilterAnchorRef}
                  type="button"
                  onClick={() => setShowAddModalInstrFilter(!showAddModalInstrFilter)}
                  className={`w-full text-xs p-1.5 border rounded flex items-center justify-between ${addModalInstrFilters.length > 0 || addModalStringsFilter !== "all" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold" : "bg-white border-slate-300 text-slate-500"}`}
                >
                  <span>
                    {addModalInstrFilters.length > 0 ? `${addModalInstrFilters.length} reglas` : addModalStringsFilter !== "all" ? (addModalStringsFilter === "with" ? "Con Cuerdas" : "Sin Cuerdas") : "Filtrar"}
                  </span>
                  <IconFilter size={10} />
                </button>
                {showAddModalInstrFilter && (
                  <InstrumentationFilterModal
                    anchorRef={addModalInstrFilterAnchorRef}
                    onClose={() => setShowAddModalInstrFilter(false)}
                    currentFilters={addModalInstrFilters}
                    stringsFilter={addModalStringsFilter}
                    setStringsFilter={setAddModalStringsFilter}
                    strictMode={addModalStrictMode}
                    setStrictMode={setAddModalStrictMode}
                    onApply={(newRules) => {
                      setAddModalInstrFilters(newRules);
                      setShowAddModalInstrFilter(false);
                    }}
                  />
                )}
              </div>
              <div className="flex justify-end pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    openCreateModal();
                  }}
                  className="bg-fixed-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-fixed-indigo-700 flex items-center gap-1"
                >
                  <IconPlus size={12} /> Crear Solicitud
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingLibrary ? (
                <div className="p-8 text-center text-fixed-indigo-600">
                  <IconLoader className="animate-spin inline" />
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 font-bold shadow-sm">
                    <tr>
                      <th className="p-2 w-1/4">Compositor</th>
                      <th className="p-2 w-1/4">Arreglador</th>
                      <th className="p-2 w-1/3">Obra</th>
                      <th className="p-2 text-center w-16">Duración</th>
                      <th className="p-2 text-center w-24">Instr.</th>
                      <th className="p-2 text-center w-12">Año</th>
                      <th className="p-2 text-center w-10">Drive</th>
                      <th className="p-2 text-right w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredLibrary.map((w) => (
                      <tr key={w.id} className="hover:bg-fixed-indigo-50 group">
                        <td className="p-2 text-slate-600 font-medium truncate">
                          {w.compositor_full}
                        </td>
                        <td className="p-2 text-slate-500 truncate">
                          {w.arreglador_full !== "-" ? w.arreglador_full : ""}
                        </td>
                        <td className="p-2 text-slate-800 font-bold truncate">
                          <RichTextPreview content={w.titulo} />
                        </td>
                        <td className="p-2 text-center font-mono text-[10px] text-slate-400">
                          {formatSecondsToTime(w.duracion_segundos)}
                        </td>
                        <td className="p-2 text-center font-mono text-[10px] text-slate-500 bg-slate-50/50 rounded">
                          {w.instrumentacion ||
                            calculateInstrumentation(w.obras_particellas) ||
                            "-"}
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
                              className="text-blue-600 hover:text-blue-800 inline-block p-1 bg-blue-50 rounded-full"
                            >
                              <IconDrive size={14} />
                            </a>
                          ) : (
                            <span className="text-slate-200">-</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => addWorkToBlock(w.id)}
                            className="bg-white border border-fixed-indigo-200 text-fixed-indigo-600 px-2 py-0.5 rounded font-bold hover:bg-fixed-indigo-600 hover:text-white shadow-sm transition-colors text-[10px]"
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL EDITAR (WORKFORM) */}
      {isEditWorkModalOpen && isEditor && (
        <ModalPortal>
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <WorkForm
              supabase={supabase}
              formData={workFormData}
              onCancel={() => setIsEditWorkModalOpen(false)}
              onSave={handleWorkSaved}
              catalogoInstrumentos={instrumentList}
              context="program"
              onInsertExistingWork={async (workId) => {
                await addWorkToBlock(workId, activeRepertorioId);
                setIsEditWorkModalOpen(false);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {commentsState && (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-black/20 backdrop-blur-[1px]"
          onClick={() => setCommentsState(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            <CommentsManager
              supabase={supabase}
              entityType={commentsState.type}
              entityId={commentsState.id}
              title={commentsState.title}
              onClose={() => setCommentsState(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const containerClasses = (isCompact) => (isCompact ? "bg-white" : "space-y-8");
const tableHeaderClasses = (isCompact) =>
  isCompact
    ? "hidden"
    : "bg-blue-200 text-slate-700 border-b-2 border-slate-400 font-bold uppercase tracking-tight";
