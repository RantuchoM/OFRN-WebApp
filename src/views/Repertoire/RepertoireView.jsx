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

const HistoryModal = ({ work, onClose, supabase }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!work?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("repertorio_obras")
          .select(`
            programas_repertorios (
              nombre,
              programas (id, nombre_gira, fecha_desde, mes_letra, nomenclador, tipo)
            )
          `)
          .eq("id_obra", work.id);
        if (error) throw error;
        const historyData = data.map((item) => ({
          bloque: item.programas_repertorios?.nombre,
          gira: item.programas_repertorios?.programas,
        })).filter((h) => h.gira);
        historyData.sort((a, b) => new Date(b.gira.fecha_desde) - new Date(a.gira.fecha_desde));
        setHistory(historyData || []);
      } catch (err) {
        console.error("Error history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [work, supabase]);

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
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic text-sm">Sin historial registrado.</div>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center gap-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase mb-0.5">
                      {item.gira.nomenclador} · {item.gira.mes_letra}
                      {item.gira.tipo && <span className="text-slate-500 font-medium ml-1">· {item.gira.tipo}</span>}
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
      const { data } = await supabase.from("programas").select("id, nombre_gira, mes_letra, nomenclador").order("fecha_desde", { ascending: false }).limit(20);
      if (data) setGiras(data);
    };
    fetchGiras();
  }, []);

  useEffect(() => {
    if (!selectedGiraId) { setBloques([]); return; }
    const fetchBloques = async () => {
      setLoading(true);
      const { data } = await supabase.from("programas_repertorios").select("id, nombre, orden").eq("id_programa", selectedGiraId).order("orden", { ascending: true });
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
        const lastOrder = bloques.length > 0 ? Math.max(...bloques.map((b) => b.orden || 0)) : 0;
        const { data: newBlock, error: blockError } = await supabase.from("programas_repertorios").insert([{ id_programa: selectedGiraId, nombre: newBloqueName, orden: lastOrder + 1 }]).select().single();
        if (blockError) throw blockError;
        targetBloqueId = newBlock.id;
      }
      if (!targetBloqueId) { alert("Selecciona o crea un bloque."); setLoading(false); return; }
      const { count } = await supabase.from("repertorio_obras").select("id", { count: "exact", head: true }).eq("id_repertorio", targetBloqueId);
      const { error: assignError } = await supabase.from("repertorio_obras").insert([{ id_repertorio: targetBloqueId, id_obra: work.id, orden: (count || 0) + 1 }]);
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
            <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">{work.titulo}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">1. Seleccionar Gira</label>
            <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={selectedGiraId} onChange={(e) => setSelectedGiraId(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {giras.map((p) => <option key={p.id} value={p.id}>{p.mes_letra} | {p.nombre_gira} ({p.nomenclador})</option>)}
            </select>
          </div>
          {selectedGiraId && (
            <div className="animate-in slide-in-from-top-2 fade-in">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">2. Bloque de Repertorio</label>
              {!isCreatingBloque ? (
                <div className="flex gap-2">
                  <select className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={selectedBloqueId} onChange={(e) => setSelectedBloqueId(e.target.value)} disabled={bloques.length === 0}>
                    <option value="">{bloques.length === 0 ? "-- Sin bloques --" : "-- Seleccionar Bloque --"}</option>
                    {bloques.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                  <button onClick={() => { setIsCreatingBloque(true); setSelectedBloqueId(""); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 hover:bg-indigo-100" title="Crear Bloque"><IconPlus size={18} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" className="w-full p-2 border border-indigo-300 rounded-lg text-sm outline-none ring-2 ring-indigo-100" placeholder="Nombre (ej: Programa I)" value={newBloqueName} onChange={(e) => setNewBloqueName(e.target.value)} autoFocus />
                  <button onClick={() => setIsCreatingBloque(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><IconX size={18} /></button>
                </div>
              )}
              {bloques.length === 0 && !isCreatingBloque && <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><IconAlertCircle size={10} /> Gira sin bloques.</p>}
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-6 border-t pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
          <button onClick={handleAssign} disabled={loading || !selectedGiraId || (!selectedBloqueId && !newBloqueName)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-bold shadow-sm flex items-center gap-2">
            {loading ? <IconLoader className="animate-spin" size={14} /> : <IconCheck size={14} />} {loading ? "..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
};

const InstrumentationFilterModal = ({ onClose, onApply, currentFilters, stringsFilter, setStringsFilter, strictMode, setStrictMode }) => {
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

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex justify-between">Filtro por Orgánico <button onClick={onClose}><IconX size={14} /></button></h4>
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
          {["all", "with", "without"].map(m => (
            <button key={m} onClick={() => setStringsFilter(m)} className={`flex-1 text-[10px] font-bold py-1 px-2 rounded border ${stringsFilter === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
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
              <input type="number" min="0" className={`border rounded p-1 w-12 text-center outline-none focus:border-indigo-500 ${isActive ? "border-indigo-300 bg-white font-bold text-indigo-700" : "border-slate-200"}`} placeholder="-" value={rule.value} onChange={(e) => updateRule(rule.id, "value", e.target.value)} />
              {!rule.isBase && <button onClick={() => removeRule(rule.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={12} /></button>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center border-t border-slate-100 pt-3">
        <button onClick={addRule} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><IconPlus size={10} /> Extra</button>
        <div className="flex gap-2">
          <button onClick={() => { setRules(prev => prev.map(r => r.isBase ? { ...r, value: "" } : r).filter(r => r.isBase)); setStringsFilter("all"); setStrictMode(false); onApply([]); }} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-2">Limpiar</button>
          <button onClick={handleApply} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-bold">Filtrar</button>
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
  const columns = [{ key: "compositor", label: "Compositor" }, { key: "obra", label: "Obra" }, { key: "arreglador", label: "Arreglador" }, { key: "organico", label: "Orgánico" }, { key: "duracion", label: "Duración" }, { key: "estado", label: "Estado" }, { key: "fecha", label: "F. Esperada" }, { key: "observaciones", label: "Observaciones" }, { key: "tags", label: "Palabras Clave" }];
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
  const [showSolicitudes, setShowSolicitudes] = useState(false);
  const solicitudesRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (solicitudesRef.current && !solicitudesRef.current.contains(e.target)) setShowSolicitudes(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Visibilidad Columnas
  const [visibleColumns, setVisibleColumns] = useState({ compositor: true, obra: true, arreglador: true, organico: true, duracion: true, estado: true, fecha: false, observaciones: false, tags: false, acciones: true });

  // Filtros
  const [filters, setFilters] = useState({ titulo: "", compositor: "", arreglador: "", estado: "Todos", solicitante: "", duracionMin: "", duracionMax: "", fechaDesde: "", fechaHasta: "", observaciones: "" });
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [instrFilters, setInstrFilters] = useState([]);
  const [stringsFilter, setStringsFilter] = useState("all");
  const [strictMode, setStrictMode] = useState(false);

  const [sortConfig, setSortConfig] = useState({ key: "titulo", direction: "asc" });

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

  useEffect(() => { fetchWorks(); fetchTags(); }, []);
  
  // Resetear página al filtrar
  useEffect(() => { setCurrentPage(1); }, [filters, selectedTags, instrFilters, stringsFilter, strictMode, sortConfig, pageSize]);

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

  const fetchWorks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from("obras")
        .select(`*, obras_compositores (rol, compositores (apellido, nombre, paises (nombre))), obras_palabras_clave (palabras_clave (id, tag)), usuario_carga:integrantes!id_usuario_carga(apellido, nombre)`)
        .order("titulo");

      if (dbError) throw dbError;

      if (data) {
        const processed = data.map((w) => {
          const listComposers = w.obras_compositores?.filter((oc) => oc.rol === "compositor" || !oc.rol);
          const listArrangers = w.obras_compositores?.filter((oc) => oc.rol === "arreglador");
          
          // Pre-cálculo de valores para el filtro orgánico/estricto
          const instValues = {};
          ['fl', 'ob', 'cl', 'bn', 'hn', 'tpt', 'tbn', 'tba', 'timp', 'perc', 'harp', 'key'].forEach(k => {
            instValues[k] = getInstrumentValue(w.instrumentacion, k);
          });

          return {
            ...w,
            instValues,
            compositor_full: listComposers?.map((oc) => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`).join(" / ") || "",
            arreglador_full: listArrangers?.map((oc) => `${oc.compositores?.apellido}, ${oc.compositores?.nombre}`).join(" / ") || "",
            pais_nombre: listComposers?.map((oc) => oc.compositores?.paises?.nombre).filter(Boolean).join(" / ") || "",
            tags_objects: w.obras_palabras_clave?.map((opc) => opc.palabras_clave) || [],
            tags_ids: w.obras_palabras_clave?.map((opc) => opc.palabras_clave?.id) || [],
          };
        });
        setWorks(processed);
      }
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
  };

  // --- FILTRADO Y ORDENAMIENTO ---
  const allFilteredWorks = useMemo(() => {
    return works.filter((work) => {
      if (filters.titulo && !work.titulo?.toLowerCase().includes(filters.titulo.toLowerCase())) return false;
      if (filters.compositor && !work.compositor_full?.toLowerCase().includes(filters.compositor.toLowerCase())) return false;
      if (filters.arreglador && !work.arreglador_full?.toLowerCase().includes(filters.arreglador.toLowerCase())) return false;
      if (filters.estado !== "Todos" && work.estado !== filters.estado) return false;
      if (filters.solicitante && String(work.id_usuario_carga) !== String(filters.solicitante)) return false;

      const duration = work.duracion_segundos || 0;
      if (filters.duracionMax && duration > parseInt(filters.duracionMax) * 60) return false;
      if (filters.duracionMin && duration < parseInt(filters.duracionMin) * 60) return false;

      if (filters.fechaDesde && (!work.fecha_esperada || new Date(work.fecha_esperada) < new Date(filters.fechaDesde))) return false;
      if (filters.fechaHasta && (!work.fecha_esperada || new Date(work.fecha_esperada) > new Date(filters.fechaHasta))) return false;

      if (filters.observaciones && !work.observaciones?.toLowerCase().includes(filters.observaciones.toLowerCase())) return false;
      if (selectedTags.size > 0 && !work.tags_ids.some((id) => selectedTags.has(id))) return false;

      if (stringsFilter !== "all") {
        const hasStr = hasStrings(work.instrumentacion);
        if (stringsFilter === "with" && !hasStr) return false;
        if (stringsFilter === "without" && hasStr) return false;
      }

      if (instrFilters.length > 0 || stringsFilter !== "all" || strictMode) {
        const passActiveRules = instrFilters.every((rule) => {
          const countInWork = work.instValues[rule.instrument] || 0;
          const targetVal = parseInt(rule.value) || 0;
          if (rule.operator === "eq") return countInWork === targetVal;
          if (rule.operator === "gte") return countInWork >= targetVal;
          if (rule.operator === "lte") return countInWork <= targetVal;
          return true;
        });
        if (!passActiveRules) return false;

        if (strictMode) {
          const activeKeys = new Set(instrFilters.map((r) => r.instrument));
          const masterList = ["fl", "ob", "cl", "bn", "hn", "tpt", "tbn", "tba", "timp", "perc", "harp", "key"];
          for (const key of masterList) {
            if (!activeKeys.has(key) && (work.instValues[key] || 0) > 0) return false;
          }
          if (stringsFilter === "all" && hasStrings(work.instrumentacion)) return false;
          if (work.instrumentacion?.includes("+")) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === "fecha_esperada") {
        const fallback = sortConfig.direction === "asc" ? "9999-12-31" : "0000-01-01";
        valA = valA || fallback; valB = valB || fallback;
      }
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [works, filters, selectedTags, instrFilters, stringsFilter, sortConfig, strictMode]);

  // --- SUB-LISTA PAGINADA ---
  const totalPages = Math.ceil(allFilteredWorks.length / pageSize);
  const paginatedWorks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allFilteredWorks.slice(start, start + pageSize);
  }, [allFilteredWorks, currentPage, pageSize]);

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
    try { await fetchWorks(); if (shouldClose) { setIsAdding(false); setEditingId(null); setFormData({}); } return savedId; }
    catch (err) { alert("Error: " + err.message); return null; } finally { setLoading(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar obra?")) return;
    setLoading(true); await supabase.from("obras").delete().eq("id", id); await fetchWorks(); setLoading(false);
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

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><IconFolderMusic className="text-indigo-600" /> Archivo de Obras</h2>
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{allFilteredWorks.length} resultados</div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative" ref={solicitudesRef}>
            <button
              type="button"
              onClick={() => setShowSolicitudes((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded border transition-colors ${filters.solicitante || (sortConfig.key === "fecha_esperada" && filters.estado === "Solicitud") ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
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
          <button onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-red-500 font-bold underline px-2">Limpiar Filtros</button>
          <div className="flex gap-1 border-r border-slate-200 pr-3">
            <button onClick={() => setShowComposersManager(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full" title="Compositores"><IconUsers size={20} /></button>
            <button onClick={() => setShowTagsManager(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full" title="Tags"><IconTag size={20} /></button>
          </div>
          <ColumnManager visibleColumns={visibleColumns} onChange={(key, val) => setVisibleColumns((prev) => ({ ...prev, [key]: val }))} />
          <button onClick={() => { setIsAdding(true); setFormData({}); }} className="ml-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"><IconPlus size={16} /> Nuevo</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm relative">
        {isAdding || editingId ? (
          <div className="absolute inset-0 z-20 bg-white p-4 overflow-y-auto">
            <WorkForm supabase={supabase} formData={formData} setFormData={setFormData} onSave={handleSave} onCancel={() => { setIsAdding(false); setEditingId(null); setFormData({}); }} isNew={isAdding} catalogoInstrumentos={catalogoInstrumentos} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto relative">
              <div className="min-w-full inline-block align-middle">
                {/* HEADERS */}
                <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-sm">
                  <div className="grid gap-4 px-4 py-3 items-end" style={{ gridTemplateColumns: getGridTemplate() }}>
                    {visibleColumns.compositor && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("compositor_full")}>Compositor <SortIcon column="compositor_full" /></div><input className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Buscar..." value={filters.compositor} onChange={(e) => setFilters({ ...filters, compositor: e.target.value })} /></div>}
                    {visibleColumns.obra && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("titulo")}>Obra <SortIcon column="titulo" /></div><input className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Buscar..." value={filters.titulo} onChange={(e) => setFilters({ ...filters, titulo: e.target.value })} /></div>}
                    {visibleColumns.arreglador && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("arreglador_full")}>Arreglador <SortIcon column="arreglador_full" /></div><input className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Buscar..." value={filters.arreglador} onChange={(e) => setFilters({ ...filters, arreglador: e.target.value })} /></div>}
                    {visibleColumns.organico && <div className="space-y-2 relative"><div className="flex items-center text-xs font-bold text-slate-500 uppercase">Orgánico</div><button onClick={() => setShowInstrFilter(!showInstrFilter)} className={`w-full text-xs p-1.5 border rounded flex items-center justify-between ${instrFilters.length > 0 || stringsFilter !== "all" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold" : "bg-white border-slate-300 text-slate-500"}`}><span>{instrFilters.length > 0 ? `${instrFilters.length} reglas` : stringsFilter !== "all" ? (stringsFilter === "with" ? "Con Cuerdas" : "Sin Cuerdas") : "Filtrar"}</span><IconFilter size={10} /></button>{showInstrFilter && <InstrumentationFilterModal onClose={() => setShowInstrFilter(false)} currentFilters={instrFilters} stringsFilter={stringsFilter} setStringsFilter={setStringsFilter} strictMode={strictMode} setStrictMode={setStrictMode} onApply={(newRules) => { setInstrFilters(newRules); setShowInstrFilter(false); }} />}</div>}
                    {visibleColumns.duracion && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase">Duración (min)</div><div className="flex gap-1"><input className="w-full text-xs p-1 border border-slate-300 rounded text-center outline-none" placeholder="Min" type="number" value={filters.duracionMin} onChange={(e) => setFilters({ ...filters, duracionMin: e.target.value })} /><input className="w-full text-xs p-1 border border-slate-300 rounded text-center outline-none" placeholder="Max" type="number" value={filters.duracionMax} onChange={(e) => setFilters({ ...filters, duracionMax: e.target.value })} /></div></div>}
                    {visibleColumns.estado && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("estado")}>Estado <SortIcon column="estado" /></div><select className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none bg-white" value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })}><option value="Todos">Todos</option><option value="Oficial">Oficial</option><option value="Solicitud">Solicitud</option></select></div>}
                    {visibleColumns.fecha && <div className="space-y-2"><div className="flex items-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:text-indigo-600" onClick={() => handleSort("fecha_esperada")}>F. Esp. <SortIcon column="fecha_esperada" /></div><div className="flex flex-col gap-0.5"><input type="date" className="text-[9px] border border-slate-300 rounded p-0.5 w-full" value={filters.fechaDesde} onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })} /><input type="date" className="text-[9px] border border-slate-300 rounded p-0.5 w-full" value={filters.fechaHasta} onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })} /></div></div>}
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
                    <div key={work.id} className="grid gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors group text-sm" style={{ gridTemplateColumns: getGridTemplate() }}>
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
                              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">Pendiente</span>
                              {work.usuario_carga && (work.usuario_carga.apellido || work.usuario_carga.nombre) && (
                                <span className="text-[10px] text-slate-600 leading-tight" title="Solicitante">{[work.usuario_carga.apellido, work.usuario_carga.nombre].filter(Boolean).join(", ")}</span>
                              )}
                              {work.fecha_esperada && (
                                <span className="text-[10px] text-slate-500 leading-tight" title="F. finalización esperada">{format(parseISO(work.fecha_esperada), "dd/MM/yy", { locale: es })}</span>
                              )}
                            </div>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">Oficial</span>
                          )}
                        </div>
                      )}
                      {visibleColumns.fecha && <div className="text-center">{work.fecha_esperada ? <span className={`text-xs ${getDateStatusClass(work.fecha_esperada)}`}>{format(parseISO(work.fecha_esperada), "dd/MM/yy")}</span> : <span className="text-slate-300">-</span>}</div>}
                      {visibleColumns.observaciones && <div className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-1 rounded border border-slate-100"><RichTextPreview content={work.observaciones || "-"} /></div>}
                      {visibleColumns.tags && <div className="flex flex-wrap gap-1">{work.tags_objects.length > 0 ? work.tags_objects.map((t) => <span key={t.id} className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded border border-indigo-100 truncate max-w-[80px]">{t.tag}</span>) : <span className="text-slate-300 text-[10px]">-</span>}</div>}
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setAssignWork(work)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><IconCalendarPlus size={16} /></button>
                        <button onClick={() => setHistoryWork(work)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded"><IconHistory size={16} /></button>
                        {work.link_drive && <a href={work.link_drive} target="_blank" className="p-1.5 text-green-600 hover:bg-green-50 rounded"><IconDrive size={16} /></a>}
                        <button onClick={() => startEdit(work)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"><IconEdit size={16} /></button>
                        <button onClick={() => handleDelete(work.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><IconTrash size={16} /></button>
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
        )}
      </div>

      {showComposersManager && <ComposersManager supabase={supabase} onClose={() => { setShowComposersManager(false); fetchWorks(); }} />}
      {showTagsManager && <TagsManager supabase={supabase} onClose={() => { setShowTagsManager(false); fetchWorks(); fetchTags(); }} />}
      {historyWork && <HistoryModal work={historyWork} onClose={() => setHistoryWork(null)} supabase={supabase} />}
      {assignWork && <AssignProgramModal work={assignWork} onClose={() => setAssignWork(null)} supabase={supabase} />}
    </div>
  );
}