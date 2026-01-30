import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "../../components/ui/Icons";
import { format, isBefore, isToday, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";
import WorkForm from "./WorkForm";
import ComposersManager from "./ComposersManager";
import TagsManager from "./TagsManager";
import TagMultiSelect from "../../components/filters/TagMultiSelect";
import { calculateInstrumentation } from "../../utils/instrumentation";
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

const RichTextPreview = ({ content, className = "" }) => {
  if (!content) return null;
  return (
    <div
      className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:pl-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

// Mapa de orquestación (Posiciones estándar Vientos/Metales)
const ORCHESTRA_MAP = {
  flauta: 0,
  flautas: 0,
  fl: 0,
  oboe: 1,
  oboes: 1,
  ob: 1,
  clarinete: 2,
  clarinetes: 2,
  cl: 2,
  fagot: 3,
  fagotes: 3,
  bn: 3,
  fg: 3,
  corno: 4,
  cornos: 4,
  hn: 4,
  cor: 4,
  trompeta: 5,
  trompetas: 5,
  tpt: 5,
  trombon: 6,
  trombones: 6,
  tbn: 6,
  tuba: 7,
  tubas: 7,
  tba: 7,
};

// Helper para parsear números de la notación 2.2.2.2
const getInstrumentValue = (workString, instrumentName) => {
  if (!workString) return 0;
  const cleanStr = workString.replace(/-/g, ".").replace(/\s/g, "");
  const parts = cleanStr.split(".");
  const normalizedName = instrumentName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const key = Object.keys(ORCHESTRA_MAP).find((k) =>
    normalizedName.includes(k),
  );
  if (key === undefined) return 0;
  const index = ORCHESTRA_MAP[key];
  if (index >= parts.length) return 0;
  const valStr = parts[index];
  const val = parseInt(valStr);
  return isNaN(val) ? 0 : val;
};

// Helper para detectar cuerdas en el string
const hasStrings = (text) => {
  if (!text) return false;
  // Busca: str, cuerd, viol, vln, vla, vlc, cb, arco, contrab
  return /str|cuerd|viol|vln|vla|vlc|cb|arco|contrab/i.test(text);
};

// --- 2. MODALES ---

const HistoryModal = ({ work, onClose, supabase }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!work?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("repertorio_obras")
          .select(
            `
                        programas_repertorios (
                            nombre,
                            programas (id, nombre_gira, fecha_desde, mes_letra, nomenclador)
                        )
                    `,
          )
          .eq("id_obra", work.id);

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
      } catch (err) {
        console.error("Error history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [work, supabase]);

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
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-8 text-indigo-500">
              <IconLoader className="animate-spin inline" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic text-sm">
              Sin historial registrado.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center"
                >
                  <div>
                    <div className="text-[10px] font-bold text-indigo-700 uppercase mb-0.5">
                      {item.gira.mes_letra} | {item.gira.nomenclador}
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      {item.gira.nombre_gira}
                    </div>
                    {item.bloque && (
                      <div className="text-[10px] text-slate-500 mt-1 bg-slate-50 inline-block px-1.5 rounded border border-slate-100">
                        Bloque: {item.bloque}
                      </div>
                    )}
                  </div>
                  {item.gira.fecha_desde && (
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                      <IconCalendar size={12} />{" "}
                      {format(new Date(item.gira.fecha_desde), "MMM yy", {
                        locale: es,
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE ASIGNACIÓN A GIRA ---
const AssignProgramModal = ({ work, onClose, supabase }) => {
  const [loading, setLoading] = useState(false);
  const [giras, setGiras] = useState([]);
  const [selectedGiraId, setSelectedGiraId] = useState("");
  const [bloques, setBloques] = useState([]);
  const [selectedBloqueId, setSelectedBloqueId] = useState("");
  const [isCreatingBloque, setIsCreatingBloque] = useState(false);
  const [newBloqueName, setNewBloqueName] = useState("");

  useEffect(() => {
    const fetchGiras = async () => {
      const { data } = await supabase
        .from("programas")
        .select("id, nombre_gira, mes_letra, nomenclador")
        .order("fecha_desde", { ascending: false })
        .limit(20);
      if (data) setGiras(data);
    };
    fetchGiras();
  }, []);

  useEffect(() => {
    if (!selectedGiraId) {
      setBloques([]);
      return;
    }
    const fetchBloques = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("programas_repertorios")
        .select("id, nombre, orden")
        .eq("id_programa", selectedGiraId)
        .order("orden", { ascending: true });
      setBloques(data || []);
      setLoading(false);
      setSelectedBloqueId("");
      setIsCreatingBloque(false);
    };
    fetchBloques();
  }, [selectedGiraId]);

  const handleAssign = async () => {
    setLoading(true);
    try {
      let targetBloqueId = selectedBloqueId;
      if (isCreatingBloque && newBloqueName) {
        const lastOrder =
          bloques.length > 0
            ? Math.max(...bloques.map((b) => b.orden || 0))
            : 0;
        const { data: newBlock, error: blockError } = await supabase
          .from("programas_repertorios")
          .insert([
            {
              id_programa: selectedGiraId,
              nombre: newBloqueName,
              orden: lastOrder + 1,
            },
          ])
          .select()
          .single();
        if (blockError) throw blockError;
        targetBloqueId = newBlock.id;
      }
      if (!targetBloqueId) {
        alert("Selecciona o crea un bloque.");
        setLoading(false);
        return;
      }
      const { count } = await supabase
        .from("repertorio_obras")
        .select("id", { count: "exact", head: true })
        .eq("id_repertorio", targetBloqueId);
      const { error: assignError } = await supabase
        .from("repertorio_obras")
        .insert([
          {
            id_repertorio: targetBloqueId,
            id_obra: work.id,
            orden: (count || 0) + 1,
          },
        ]);
      if (assignError) throw assignError;
      alert(`✅ "${work.titulo}" asignada.`);
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 border border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Asignar a Gira</h3>
            <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">
              {work.titulo}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              1. Seleccionar Gira
            </label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedGiraId}
              onChange={(e) => setSelectedGiraId(e.target.value)}
            >
              <option value="">-- Seleccionar --</option>
              {giras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.mes_letra} | {p.nombre_gira} ({p.nomenclador})
                </option>
              ))}
            </select>
          </div>
          {selectedGiraId && (
            <div className="animate-in slide-in-from-top-2 fade-in">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                2. Bloque de Repertorio
              </label>
              {!isCreatingBloque ? (
                <div className="flex gap-2">
                  <select
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedBloqueId}
                    onChange={(e) => setSelectedBloqueId(e.target.value)}
                    disabled={bloques.length === 0}
                  >
                    <option value="">
                      {bloques.length === 0
                        ? "-- Sin bloques --"
                        : "-- Seleccionar Bloque --"}
                    </option>
                    {bloques.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setIsCreatingBloque(true);
                      setSelectedBloqueId("");
                    }}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 hover:bg-indigo-100"
                    title="Crear Bloque"
                  >
                    <IconPlus size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full p-2 border border-indigo-300 rounded-lg text-sm outline-none ring-2 ring-indigo-100"
                    placeholder="Nombre (ej: Programa I)"
                    value={newBloqueName}
                    onChange={(e) => setNewBloqueName(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => setIsCreatingBloque(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <IconX size={18} />
                  </button>
                </div>
              )}
              {bloques.length === 0 && !isCreatingBloque && (
                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                  <IconAlertCircle size={10} /> Gira sin bloques.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-6 border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={
              loading ||
              !selectedGiraId ||
              (!selectedBloqueId && !newBloqueName)
            }
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-sm flex items-center gap-2"
          >
            {loading ? (
              <IconLoader className="animate-spin" size={14} />
            ) : (
              <IconCheck size={14} />
            )}{" "}
            {loading ? "..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE FILTRO ORGÁNICO MEJORADO ---
const InstrumentationFilterModal = ({
  onClose,
  onApply,
  currentFilters,
  stringsFilter,
  setStringsFilter,
}) => {
  const BASE_INSTRUMENTS = [
    { id: "fl", instrument: "flauta", label: "Flautas" },
    { id: "ob", instrument: "oboe", label: "Oboes" },
    { id: "cl", instrument: "clarinete", label: "Clarinetes" },
    { id: "fg", instrument: "fagot", label: "Fagotes" },
    { id: "hn", instrument: "corno", label: "Cornos" },
    { id: "tp", instrument: "trompeta", label: "Trompetas" },
    { id: "tb", instrument: "trombon", label: "Trombones" },
    { id: "tu", instrument: "tuba", label: "Tubas" },
  ];

  const [rules, setRules] = useState(() => {
    const existingMap = {};
    currentFilters.forEach((r) => {
      existingMap[r.instrument] = r;
    });
    const baseRules = BASE_INSTRUMENTS.map((base) => {
      if (existingMap[base.instrument])
        return {
          ...existingMap[base.instrument],
          isBase: true,
          label: base.label,
        };
      return {
        id: base.id,
        instrument: base.instrument,
        operator: "eq",
        value: "",
        isBase: true,
        label: base.label,
      };
    });
    const extraRules = currentFilters.filter(
      (r) => !BASE_INSTRUMENTS.some((b) => b.instrument === r.instrument),
    );
    return [...baseRules, ...extraRules];
  });

  const addRule = () =>
    setRules([
      ...rules,
      {
        id: Date.now(),
        instrument: "perc",
        operator: "eq",
        value: 0,
        isBase: false,
      },
    ]);
  const removeRule = (id) => setRules(rules.filter((r) => r.id !== id));
  const updateRule = (id, field, val) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const handleApply = () => {
    const activeRules = rules.filter((r) => r.value !== "" && r.value !== null);
    onApply(activeRules);
  };

  const INSTRUMENTS_OPTS = [
    { label: "Percusión", value: "perc" },
    { label: "Timbal", value: "timp" },
    { label: "Arpa", value: "harp" },
    { label: "Piano/Cel", value: "key" },
    { label: "Cuerdas", value: "str" },
  ];

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between">
        Filtro por Orgánico
        <button onClick={onClose}>
          <IconX size={14} />
        </button>
      </h4>

      {/* SECCIÓN CUERDAS */}
      <div className="mb-4 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
        <label className="text-[10px] font-bold uppercase text-indigo-600 block mb-1">
          Sección Cuerdas
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => setStringsFilter("all")}
            className={`flex-1 text-[10px] font-bold py-1 px-2 rounded border ${stringsFilter === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setStringsFilter("with")}
            className={`flex-1 text-[10px] font-bold py-1 px-2 rounded border ${stringsFilter === "with" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
          >
            Con
          </button>
          <button
            onClick={() => setStringsFilter("without")}
            className={`flex-1 text-[10px] font-bold py-1 px-2 rounded border ${stringsFilter === "without" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
          >
            Sin
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto mb-3 pr-1 custom-scrollbar">
        {rules.map((rule) => {
          const isActive = rule.value !== "" && rule.value !== null;
          return (
            <div
              key={rule.id}
              className={`flex gap-2 items-center text-xs p-1 rounded transition-colors ${isActive ? "bg-indigo-50 border border-indigo-100" : ""}`}
            >
              <div className="w-24 font-bold text-slate-600 truncate flex items-center">
                {rule.isBase ? (
                  <span className="capitalize">{rule.label}</span>
                ) : (
                  <select
                    className="w-full bg-transparent border-none outline-none p-0 cursor-pointer"
                    value={rule.instrument}
                    onChange={(e) =>
                      updateRule(rule.id, "instrument", e.target.value)
                    }
                  >
                    {INSTRUMENTS_OPTS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <select
                className={`border rounded p-1 outline-none text-center w-14 ${isActive ? "border-indigo-300 bg-white" : "border-slate-200 bg-slate-50"}`}
                value={rule.operator}
                onChange={(e) =>
                  updateRule(rule.id, "operator", e.target.value)
                }
              >
                <option value="eq">=</option>
                <option value="gte">≥</option>
                <option value="lte">≤</option>
              </select>
              <input
                type="number"
                min="0"
                className={`border rounded p-1 w-12 text-center outline-none focus:border-indigo-500 ${isActive ? "border-indigo-300 bg-white font-bold text-indigo-700" : "border-slate-200"}`}
                placeholder="-"
                value={rule.value}
                onChange={(e) => updateRule(rule.id, "value", e.target.value)}
              />
              {!rule.isBase && (
                <button
                  onClick={() => removeRule(rule.id)}
                  className="text-slate-300 hover:text-red-500"
                >
                  <IconTrash size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
        <button
          onClick={addRule}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <IconPlus size={10} /> Extra
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setRules((prev) =>
                prev
                  .map((r) => (r.isBase ? { ...r, value: "" } : r))
                  .filter((r) => r.isBase),
              );
              setStringsFilter("all");
              onApply([]);
            }}
            className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-2"
          >
            Limpiar
          </button>
          <button
            onClick={handleApply}
            className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-bold"
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE GESTOR DE COLUMNAS ---
const ColumnManager = ({ visibleColumns, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target))
        setIsOpen(false);
    };
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
    { key: "fecha", label: "F. Esperada" },
    { key: "observaciones", label: "Observaciones" },
    { key: "tags", label: "Palabras Clave" },
  ];

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-colors flex items-center gap-2 text-xs font-bold ${isOpen ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-slate-100"}`}
        title="Mostrar/Ocultar Columnas"
      >
        <IconColumns size={18} />{" "}
        <span className="hidden sm:inline">Columnas</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
            Columnas Visibles
          </div>
          <div className="p-2 space-y-1">
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  className="accent-indigo-600"
                  checked={visibleColumns[col.key]}
                  onChange={(e) => onChange(col.key, e.target.checked)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. COMPONENTE PRINCIPAL ---

export default function RepertoireView({ supabase, catalogoInstrumentos }) {
  const [works, setWorks] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modales
  const [showComposersManager, setShowComposersManager] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [historyWork, setHistoryWork] = useState(null);
  const [assignWork, setAssignWork] = useState(null);
  const [showInstrFilter, setShowInstrFilter] = useState(false);

  // Visibilidad Columnas
  const [visibleColumns, setVisibleColumns] = useState({
    compositor: true,
    obra: true,
    arreglador: true,
    organico: true,
    duracion: true,
    estado: true,
    fecha: false,
    observaciones: false,
    tags: false,
    acciones: true,
  });

  // Filtros
  const [filters, setFilters] = useState({
    titulo: "",
    compositor: "",
    arreglador: "",
    estado: "Todos",
    duracionMin: "",
    duracionMax: "",
    fechaDesde: "",
    fechaHasta: "",
    observaciones: "",
  });

  const [selectedTags, setSelectedTags] = useState(new Set());
  const [instrFilters, setInstrFilters] = useState([]);
  const [stringsFilter, setStringsFilter] = useState("all"); // Nuevo Filtro
  const [sortConfig, setSortConfig] = useState({
    key: "titulo",
    direction: "asc",
  });

  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({});
  // --- FUNCIÓN DE MANTENIMIENTO ---
// --- FUNCIÓN DE MANTENIMIENTO (CORREGIDA) ---
  const handleMassRecalculation = async () => {
    const confirmMsg = "Esto recalculará la instrumentación de TODAS las obras basándose en sus particellas cargadas. \n\n¿Deseas continuar? (Esto puede tardar unos segundos)";
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      console.log("⏳ Iniciando recálculo masivo...");
      
      // 1. CORRECCIÓN: Traemos también el nombre real del instrumento desde la tabla 'instrumentos'
      const { data: allWorks, error } = await supabase
        .from("obras")
        .select(`
          id, 
          titulo, 
          instrumentacion, 
          obras_particellas (
            id_instrumento, 
            nombre_archivo, 
            nota_organico,
            instrumentos ( instrumento ) 
          )
        `);

      if (error) throw error;

      let updatedCount = 0;
      const updates = [];

      // 2. Procesar cada obra
      for (const work of allWorks) {
        // CORRECCIÓN: Mapeamos los datos para que tengan el formato exacto que espera tu script
        const formattedParts = (work.obras_particellas || []).map(p => ({
            id_instrumento: p.id_instrumento,
            nombre_archivo: p.nombre_archivo,
            nota_organico: p.nota_organico,
            // Aquí está la clave: le pasamos el nombre real (ej: "Flauta") en lugar del ID
            instrumento_nombre: p.instrumentos?.instrumento || p.id_instrumento 
        }));

        const calculatedString = calculateInstrumentation(formattedParts);

        // 3. Comparar
        if ((work.instrumentacion || "").trim() !== calculatedString.trim()) {
          updates.push({
            id: work.id,
            instrumentacion: calculatedString
          });
          // console.log(`Cambio en ${work.titulo}: ${calculatedString}`);
        }
      }

      // 4. Guardar en lotes
      if (updates.length > 0) {
        console.log(`💾 Actualizando ${updates.length} obras...`);
        
        // Procesamos de a 20 para ser seguros y rápidos
        const batchSize = 20;
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await Promise.all(batch.map(u => 
                supabase.from("obras").update({ instrumentacion: u.instrumentacion }).eq("id", u.id)
            ));
        }
        
        updatedCount = updates.length;
        alert(`✅ Proceso finalizado.\n\nSe corrigieron ${updatedCount} obras.`);
        fetchWorks();
      } else {
        alert("✅ Todo está al día. No hubo cambios.");
      }

    } catch (err) {
      console.error(err);
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchWorks();
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase
      .from("palabras_clave")
      .select("*")
      .order("tag");
    if (data) setAvailableTags(data);
  };
  const fetchWorks = async () => {
    setLoading(true);
    let query = supabase
      .from("obras")
      .select(
        `*, obras_compositores (rol, compositores (apellido, nombre, paises (nombre))), obras_palabras_clave (palabras_clave (id, tag))`,
      )
      .order("titulo");
    const { data, error } = await query;
    if (error) setError(error.message);
    else {
      const processed = data.map((w) => {
        const listComposers = w.obras_compositores?.filter(
          (oc) => oc.rol === "compositor" || !oc.rol,
        );
        const listArrangers = w.obras_compositores?.filter(
          (oc) => oc.rol === "arreglador",
        );
        return {
          ...w,
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
            w.obras_palabras_clave?.map((opc) => opc.palabras_clave?.id) || [],
        };
      });
      setWorks(processed);
    }
    setLoading(false);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column)
      return (
        <IconChevronDown
          size={14}
          className="text-slate-300 opacity-0 group-hover:opacity-50 transition-opacity ml-1"
        />
      );
    return (
      <IconChevronDown
        size={14}
        className={`text-indigo-600 transition-transform ml-1 ${sortConfig.direction === "desc" ? "rotate-180" : ""}`}
      />
    );
  };
  const clearAllFilters = () => {
    setFilters({
      titulo: "",
      compositor: "",
      arreglador: "",
      estado: "Todos",
      duracionMin: "",
      duracionMax: "",
      fechaDesde: "",
      fechaHasta: "",
      observaciones: "",
    });
    setSelectedTags(new Set());
    setInstrFilters([]);
    setStringsFilter("all");
  };

  // --- FILTRADO PRINCIPAL ---
  const processedWorks = useMemo(() => {
    return works
      .filter((work) => {
        if (
          filters.titulo &&
          !work.titulo?.toLowerCase().includes(filters.titulo.toLowerCase())
        )
          return false;
        if (
          filters.compositor &&
          !work.compositor_full
            ?.toLowerCase()
            .includes(filters.compositor.toLowerCase())
        )
          return false;
        if (
          filters.arreglador &&
          !work.arreglador_full
            ?.toLowerCase()
            .includes(filters.arreglador.toLowerCase())
        )
          return false;
        if (filters.estado !== "Todos" && work.estado !== filters.estado)
          return false;

        const duration = work.duracion_segundos || 0;
        if (
          filters.duracionMax &&
          duration > parseInt(filters.duracionMax) * 60
        )
          return false;
        if (
          filters.duracionMin &&
          duration < parseInt(filters.duracionMin) * 60
        )
          return false;

        if (
          filters.fechaDesde &&
          (!work.fecha_esperada ||
            new Date(work.fecha_esperada) < new Date(filters.fechaDesde))
        )
          return false;
        if (
          filters.fechaHasta &&
          (!work.fecha_esperada ||
            new Date(work.fecha_esperada) > new Date(filters.fechaHasta))
        )
          return false;

        if (
          filters.observaciones &&
          !work.observaciones
            ?.toLowerCase()
            .includes(filters.observaciones.toLowerCase())
        )
          return false;

        if (
          selectedTags.size > 0 &&
          !work.tags_ids.some((id) => selectedTags.has(id))
        )
          return false;

        // Filtro de Cuerdas (Nuevo)
        if (stringsFilter !== "all") {
          const hasStr = hasStrings(work.instrumentacion);
          if (stringsFilter === "with" && !hasStr) return false;
          if (stringsFilter === "without" && hasStr) return false;
        }

        if (instrFilters.length > 0) {
          const passAll = instrFilters.every((rule) => {
            const countInWork = getInstrumentValue(
              work.instrumentacion,
              rule.instrument,
            );
            const targetVal = parseInt(rule.value);
            if (rule.operator === "eq") return countInWork === targetVal;
            if (rule.operator === "gte") return countInWork >= targetVal;
            if (rule.operator === "lte") return countInWork <= targetVal;
            return true;
          });
          if (!passAll) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === "fecha_esperada") {
          if (!valA) valA = "9999-12-31";
          if (!valB) valB = "9999-12-31";
        }
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA == null) valA = "";
        if (valB == null) valB = "";
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [works, filters, selectedTags, instrFilters, stringsFilter, sortConfig]);

  const getGridTemplate = () => {
    let cols = "";
    if (visibleColumns.compositor) cols += "minmax(150px, 1.2fr) ";
    if (visibleColumns.obra) cols += "minmax(200px, 2fr) ";
    if (visibleColumns.arreglador) cols += "minmax(120px, 0.8fr) ";
    if (visibleColumns.organico) cols += "minmax(120px, 0.8fr) ";
    if (visibleColumns.duracion) cols += "100px ";
    if (visibleColumns.estado) cols += "100px ";
    if (visibleColumns.fecha) cols += "100px ";
    if (visibleColumns.observaciones) cols += "minmax(150px, 1fr) ";
    if (visibleColumns.tags) cols += "minmax(150px, 1fr) ";
    cols += "120px";
    return cols;
  };

  const handleSave = async (savedId = null, shouldClose = true) => {
    if (shouldClose) setLoading(true);
    try {
      await fetchWorks();
      if (shouldClose) {
        setIsAdding(false);
        setEditingId(null);
        setFormData({});
      }
      return savedId;
    } catch (err) {
      alert("Error: " + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar obra?")) return;
    setLoading(true);
    await supabase.from("obras").delete().eq("id", id);
    await fetchWorks();
    setLoading(false);
  };
  const startEdit = (work) => {
    setEditingId(work.id);
    const {
      compositor_full,
      arreglador_full,
      pais_nombre,
      tags_objects,
      tags_ids,
      ...rawData
    } = work;
    setFormData(rawData);
    setIsAdding(false);
  };
  const formatDuration = (secs) => {
    if (!secs && secs !== 0) return "-";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const getDateStatusClass = (dateStr) => {
    if (!dateStr) return "text-slate-400";
    const d = parseISO(dateStr);
    if (isBefore(d, new Date()) && !isToday(d))
      return "text-red-600 font-bold bg-red-50 px-1 rounded";
    if (isToday(d)) return "text-amber-600 font-bold bg-amber-50 px-1 rounded";
    if (isBefore(d, addDays(new Date(), 7))) return "text-indigo-600 font-bold";
    return "text-slate-600";
  };

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <IconFolderMusic className="text-indigo-600" /> Archivo de Obras
          </h2>
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {processedWorks.length} resultados
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={clearAllFilters}
            className="text-xs text-slate-400 hover:text-red-500 font-bold underline px-2"
          >
            Limpiar Filtros
          </button>
          {/* Botón temporal de recálculo 
          <button
            onClick={handleMassRecalculation}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-bold underline px-2 flex items-center gap-1"
            title="Recalcular strings de instrumentación"
          >
            <IconList size={14} /> Actualizar Orgánicos
          </button> */}
          <div className="flex gap-1 border-r border-slate-200 pr-3">
            <button
              onClick={() => setShowComposersManager(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
              title="Compositores"
            >
              <IconUsers size={20} />
            </button>
            <button
              onClick={() => setShowTagsManager(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
              title="Tags"
            >
              <IconTag size={20} />
            </button>
          </div>
          <ColumnManager
            visibleColumns={visibleColumns}
            onChange={(key, val) =>
              setVisibleColumns((prev) => ({ ...prev, [key]: val }))
            }
          />
          <button
            onClick={() => {
              setIsAdding(true);
              setFormData({});
            }}
            className="ml-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
          >
            <IconPlus size={16} /> Nuevo
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
          {error}
        </div>
      )}
      {showComposersManager && (
        <ComposersManager
          supabase={supabase}
          onClose={() => {
            setShowComposersManager(false);
            fetchWorks();
          }}
        />
      )}
      {showTagsManager && (
        <TagsManager
          supabase={supabase}
          onClose={() => {
            setShowTagsManager(false);
            fetchWorks();
            fetchTags();
          }}
        />
      )}
      {historyWork && (
        <HistoryModal
          work={historyWork}
          onClose={() => setHistoryWork(null)}
          supabase={supabase}
        />
      )}
      {assignWork && (
        <AssignProgramModal
          work={assignWork}
          onClose={() => setAssignWork(null)}
          supabase={supabase}
        />
      )}

      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm relative">
        {isAdding || editingId ? (
          <div className="absolute inset-0 z-20 bg-white p-4 overflow-y-auto">
            <WorkForm
              supabase={supabase}
              formData={formData}
              setFormData={setFormData}
              onSave={handleSave}
              onCancel={() => {
                setIsAdding(false);
                setEditingId(null);
                setFormData({});
              }}
              isNew={isAdding}
              catalogoInstrumentos={catalogoInstrumentos}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto relative">
            <div className="min-w-full inline-block align-middle">
              <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-sm">
                <div
                  className="grid gap-4 px-4 py-3 items-end"
                  style={{ gridTemplateColumns: getGridTemplate() }}
                >
                  {visibleColumns.compositor && (
                    <div className="space-y-2">
                      <div
                        className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                        onClick={() => handleSort("compositor_full")}
                      >
                        Compositor <SortIcon column="compositor_full" />
                      </div>
                      <input
                        className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                        placeholder="Buscar..."
                        value={filters.compositor}
                        onChange={(e) =>
                          setFilters({ ...filters, compositor: e.target.value })
                        }
                      />
                    </div>
                  )}
                  {visibleColumns.obra && (
                    <div className="space-y-2">
                      <div
                        className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                        onClick={() => handleSort("titulo")}
                      >
                        Obra <SortIcon column="titulo" />
                      </div>
                      <input
                        className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                        placeholder="Buscar..."
                        value={filters.titulo}
                        onChange={(e) =>
                          setFilters({ ...filters, titulo: e.target.value })
                        }
                      />
                    </div>
                  )}
                  {visibleColumns.arreglador && (
                    <div className="space-y-2">
                      <div
                        className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600"
                        onClick={() => handleSort("arreglador_full")}
                      >
                        Arreglador <SortIcon column="arreglador_full" />
                      </div>
                      <input
                        className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                        placeholder="Buscar..."
                        value={filters.arreglador}
                        onChange={(e) =>
                          setFilters({ ...filters, arreglador: e.target.value })
                        }
                      />
                    </div>
                  )}
                  {visibleColumns.organico && (
                    <div className="space-y-2 relative">
                      <div className="flex items-center text-xs font-bold text-slate-500 uppercase">
                        Orgánico
                      </div>
                      <button
                        onClick={() => setShowInstrFilter(!showInstrFilter)}
                        className={`w-full text-xs p-1.5 border rounded flex items-center justify-between ${instrFilters.length > 0 || stringsFilter !== "all" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold" : "bg-white border-slate-300 text-slate-500"}`}
                      >
                        <span>
                          {instrFilters.length > 0
                            ? `${instrFilters.length} reglas`
                            : stringsFilter !== "all"
                              ? stringsFilter === "with"
                                ? "Con Cuerdas"
                                : "Sin Cuerdas"
                              : "Filtrar"}
                        </span>
                        <IconFilter size={10} />
                      </button>
                      {showInstrFilter && (
                        <InstrumentationFilterModal
                          onClose={() => setShowInstrFilter(false)}
                          currentFilters={instrFilters}
                          stringsFilter={stringsFilter}
                          setStringsFilter={setStringsFilter}
                          onApply={(newRules) => {
                            setInstrFilters(newRules);
                            setShowInstrFilter(false);
                          }}
                        />
                      )}
                    </div>
                  )}
                  {visibleColumns.duracion && (
                    <div className="space-y-2">
                      <div className="flex items-center text-xs font-bold text-slate-500 uppercase">
                        Duración (min)
                      </div>
                      <div className="flex gap-1">
                        <input
                          className="w-full text-xs p-1 border border-slate-300 rounded text-center outline-none"
                          placeholder="Min"
                          type="number"
                          value={filters.duracionMin}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              duracionMin: e.target.value,
                            })
                          }
                        />
                        <input
                          className="w-full text-xs p-1 border border-slate-300 rounded text-center outline-none"
                          placeholder="Max"
                          type="number"
                          value={filters.duracionMax}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              duracionMax: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
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
                        <option value="Oficial">Oficial</option>
                        <option value="Solicitud">Solicitud</option>
                      </select>
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
                  {visibleColumns.observaciones && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center text-xs font-bold text-slate-500 uppercase">
                        Observaciones
                      </div>
                      <input
                        className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none"
                        placeholder="Buscar texto..."
                        value={filters.observaciones}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            observaciones: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                  {visibleColumns.tags && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center text-xs font-bold text-slate-500 uppercase">
                        Tags
                      </div>
                      <div className="relative">
                        <TagMultiSelect
                          tags={availableTags}
                          selectedIds={selectedTags}
                          onChange={setSelectedTags}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end pb-2">
                    <span className="text-[10px] text-slate-300 font-bold uppercase">
                      Acciones
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-slate-100 bg-white">
                {processedWorks.map((work) => (
                  <div
                    key={work.id}
                    className="grid gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors group text-sm"
                    style={{ gridTemplateColumns: getGridTemplate() }}
                  >
                    {visibleColumns.compositor && (
                      <div
                        className="truncate font-medium text-slate-700"
                        title={work.compositor_full}
                      >
                        {work.compositor_full || (
                          <span className="text-slate-300 italic">-</span>
                        )}
                      </div>
                    )}
                    {visibleColumns.obra && (
                      <div className="min-w-0 flex flex-col justify-center">
                        <div
                          className="text-slate-800 leading-tight line-clamp-2"
                          title={work.titulo.replace(/<[^>]*>?/gm, "")}
                        >
                          <RichTextPreview content={work.titulo} />
                        </div>
                        <div className="flex gap-2 mt-1">
                          {work.link_audio && (
                            <a
                              href={work.link_audio}
                              target="_blank"
                              className="text-green-600 bg-green-50 p-0.5 rounded hover:scale-110"
                              title="Audio"
                            >
                              <IconMusic size={10} />
                            </a>
                          )}
                          {work.link_partitura && (
                            <a
                              href={work.link_partitura}
                              target="_blank"
                              className="text-blue-600 bg-blue-50 p-0.5 rounded hover:scale-110"
                              title="Partitura"
                            >
                              <IconLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {visibleColumns.arreglador && (
                      <div
                        className="truncate text-slate-500 text-xs"
                        title={work.arreglador_full}
                      >
                        {work.arreglador_full || "-"}
                      </div>
                    )}
                    {visibleColumns.organico && (
                      <div className="flex justify-center">
                        <span
                          className={`bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-mono text-xs w-full text-center whitespace-normal break-words leading-tight ${instrFilters.length > 0 || stringsFilter !== "all" ? "bg-yellow-50 text-yellow-700 border-yellow-200 font-bold" : ""}`}
                          title={work.instrumentacion}
                        >
                          {work.instrumentacion || "-"}
                        </span>
                      </div>
                    )}{" "}
                    {visibleColumns.duracion && (
                      <div className="text-center font-mono text-slate-500 text-xs">
                        {formatDuration(work.duracion_segundos)}
                      </div>
                    )}
                    {visibleColumns.estado && (
                      <div className="text-center">
                        {work.estado === "Solicitud" ? (
                          <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">
                            Pendiente
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                            Oficial
                          </span>
                        )}
                      </div>
                    )}
                    {visibleColumns.fecha && (
                      <div className="text-center">
                        {work.fecha_esperada ? (
                          <span
                            className={`text-xs ${getDateStatusClass(work.fecha_esperada)}`}
                          >
                            {format(parseISO(work.fecha_esperada), "dd/MM/yy")}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </div>
                    )}
                    {visibleColumns.observaciones && (
                      <div className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-1 rounded border border-slate-100">
                        <RichTextPreview content={work.observaciones || "-"} />
                      </div>
                    )}
                    {visibleColumns.tags && (
                      <div className="flex flex-wrap gap-1">
                        {work.tags_objects.length > 0 ? (
                          work.tags_objects.map((t) => (
                            <span
                              key={t.id}
                              className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded border border-indigo-100 truncate max-w-[80px]"
                            >
                              {t.tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                      </div>
                    )}
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setAssignWork(work)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Asignar a Gira"
                      >
                        <IconCalendarPlus size={16} />
                      </button>
                      <button
                        onClick={() => setHistoryWork(work)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded"
                        title="Historial"
                      >
                        <IconHistory size={16} />
                      </button>
                      {work.link_drive && (
                        <a
                          href={work.link_drive}
                          target="_blank"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Drive"
                        >
                          <IconDrive size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => startEdit(work)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(work.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {processedWorks.length === 0 && !loading && (
                  <div className="p-12 text-center text-slate-400 italic">
                    No se encontraron obras con los filtros actuales.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
