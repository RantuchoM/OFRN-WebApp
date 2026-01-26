import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconColumns,
  IconCheck,
  IconLoader,
  IconTrash,
  IconFilter,
  IconMusic,
  IconAlertTriangle, // Nuevo ícono para pendientes
} from "../../components/ui/Icons";
import InstrumentFilter from "../../components/filters/InstrumentFilter";
import MusicianForm from "./MusicianForm";

// --- CONFIGURACIÓN DE PENDIENTES ---
const MISSING_DATA_OPTIONS = [
  { key: "domicilio", label: "Domicilio" },
  { key: "link_dni_img", label: "Foto DNI" },
  { key: "link_cuil", label: "Const. CUIL" },
  { key: "link_cbu_img", label: "Const. CBU" },
  { key: "firma", label: "Firma Digital" },
];

// --- CONFIGURACIÓN ---
const CONDITION_OPTIONS = [
  "Estable",
  "Contratado",
  "Refuerzo",
  "Invitado",
  "Becario",
];
const DIET_OPTIONS = [
  "General",
  "Celíaca",
  "Diabética",
  "Vegetariana",
  "Vegana",
  "Sin Sal",
  "Sin Lactosa",
];
const HighlightText = ({ text, highlight }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = String(text).split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
};
const MissingDataFilter = ({ selectedFields, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: "200px",
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  const toggleField = (key) => {
    const newSet = new Set(selectedFields);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    onChange(newSet);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-all relative ${
          selectedFields.size > 0
            ? "bg-orange-50 border-orange-300 text-orange-700"
            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <IconAlertTriangle size={14} /> Pendientes
        {selectedFields.size > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white font-black">
            {selectedFields.size}
          </span>
        )}
      </button>
      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998]"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="fixed bg-white border border-slate-300 shadow-2xl rounded-lg z-[99999] p-2 animate-in fade-in slide-in-from-top-1"
              style={dropdownStyle}
            >
              <div className="text-[10px] font-black text-slate-400 uppercase mb-2 px-2 border-b border-slate-100 pb-1">
                Falta subir...
              </div>
              {MISSING_DATA_OPTIONS.map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => toggleField(opt.key)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700 select-none"
                >
                  <div
                    className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedFields.has(opt.key) ? "bg-orange-500 border-orange-500" : "border-slate-300"}`}
                  >
                    {selectedFields.has(opt.key) && (
                      <IconCheck size={10} className="text-white" />
                    )}
                  </div>
                  {opt.label}
                </div>
              ))}
              {selectedFields.size > 0 && (
                <button
                  onClick={() => onChange(new Set())}
                  className="w-full mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-red-500 hover:text-red-700 text-center uppercase"
                >
                  Limpiar Pendientes
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};
const getConditionStyles = (condition) => {
  switch (condition) {
    case "Estable":
      return "bg-emerald-50/60 hover:bg-emerald-100/60 transition-colors";
    case "Invitado":
      return "bg-amber-50/60 hover:bg-amber-100/60 transition-colors";
    case "Contratado":
    case "Becario":
      return "bg-indigo-50/40 hover:bg-indigo-100/40 transition-colors";
    case "Refuerzo":
      return "bg-slate-50/50 hover:bg-slate-100/50 transition-colors";
    default:
      return "bg-white hover:bg-slate-50";
  }
};

const AVAILABLE_COLUMNS = [
  {
    key: "id_instr",
    label: "Instrumento",
    width: "130px",
    type: "select",
    sortKey: "instrumentos.instrumento",
    displayKey: "instrumentos.instrumento",
  },
  {
    key: "condicion",
    label: "Condición",
    width: "110px",
    type: "select",
    sortKey: "condicion",
  },
  {
    key: "ensambles",
    label: "Ensambles Asignados",
    width: "200px",
    sortKey: null,
    render: (item, { ensemblesList, supabase, refreshData }) => (
      <EnsembleManagerCell
        musicianId={item.id}
        assignedEnsembles={item.integrantes_ensambles || []}
        allEnsembles={ensemblesList}
        supabase={supabase}
        onRefresh={refreshData}
      />
    ),
  },
  {
    key: "id_localidad",
    label: "Residencia",
    width: "130px",
    type: "select",
    sortKey: "residencia.localidad",
    displayKey: "residencia.localidad",
  },
  {
    key: "id_loc_viaticos",
    label: "Viáticos (Loc)",
    width: "130px",
    type: "select",
    sortKey: "viaticos.localidad",
    displayKey: "viaticos.localidad",
  },
  {
    key: "telefono",
    label: "Teléfono",
    width: "110px",
    type: "text",
    sortKey: "telefono",
  },
  {
    key: "mail",
    label: "Email",
    width: "180px",
    type: "text",
    sortKey: "mail",
  },
  { key: "dni", label: "DNI", width: "90px", type: "text", sortKey: "dni" },
  { key: "cuil", label: "CUIL", width: "110px", type: "text", sortKey: "cuil" },
  {
    key: "fecha_nac",
    label: "F. Nac",
    width: "90px",
    type: "date",
    sortKey: "fecha_nac",
  },
  {
    key: "alimentacion",
    label: "Dieta",
    width: "120px", // Aumenté un poco el ancho para que quepa "Vegetariana"
    type: "select",
    sortKey: "alimentacion",
  },
  {
    key: "nacionalidad",
    label: "Nacionalidad",
    width: "110px",
    type: "text",
    sortKey: "nacionalidad",
  },
  {
    key: "email_acceso",
    label: "Email Acceso",
    width: "150px",
    type: "text",
    sortKey: "email_acceso",
  },
  {
    key: "clave_acceso",
    label: "Clave",
    width: "110px",
    type: "text",
    sortKey: "clave_acceso",
  },
  {
    key: "documentacion",
    label: "Link Doc Full",
    width: "150px",
    type: "text",
  },
  { key: "docred", label: "Link Doc Red", width: "150px", type: "text" },
  { key: "firma", label: "Firma Digital", width: "150px", type: "text" },
];

const getNestedValue = (obj, path) => {
  if (!path) return null;
  return path.split(".").reduce((o, i) => (o ? o[i] : null), obj);
};

// --- COMPONENTE FILTRO MULTIPLE DE CONDICIÓN ---
const ConditionFilter = ({ selectedConds, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: "180px",
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  const toggleCond = (cond) => {
    const newSet = new Set(selectedConds);
    if (newSet.has(cond)) newSet.delete(cond);
    else newSet.add(cond);
    onChange(newSet);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-all relative ${
          selectedConds.size > 0
            ? "bg-amber-50 border-amber-300 text-amber-700"
            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <IconFilter size={14} /> Condición
        {selectedConds.size > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white">
            {selectedConds.size}
          </span>
        )}
      </button>
      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998]"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="fixed bg-white border border-slate-300 shadow-2xl rounded-lg z-[99999] p-2 animate-in fade-in slide-in-from-top-1"
              style={dropdownStyle}
            >
              <div className="text-[10px] font-black text-slate-400 uppercase mb-2 px-2 border-b border-slate-100 pb-1">
                Filtrar por
              </div>
              {CONDITION_OPTIONS.map((cond) => (
                <div
                  key={cond}
                  onClick={() => toggleCond(cond)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700 select-none"
                >
                  <div
                    className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedConds.has(cond) ? "bg-amber-500 border-amber-500" : "border-slate-300"}`}
                  >
                    {selectedConds.has(cond) && (
                      <IconCheck size={10} className="text-white" />
                    )}
                  </div>
                  {cond}
                </div>
              ))}
              {selectedConds.size > 0 && (
                <button
                  onClick={() => onChange(new Set())}
                  className="w-full mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-red-500 hover:text-red-700 text-center uppercase"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

// --- CELDA EDITABLE ---
const EditableCell = ({
  value,
  rowId,
  field,
  type,
  options,
  onSave,
  className = "",
  highlight = "", // <--- Nueva prop
}) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // <--- Estado para alternar

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleBlur = async () => {
    setIsEditing(false);
    if (String(localValue) !== String(value || "")) {
      setIsSaving(true);
      await onSave(rowId, field, localValue);
      setIsSaving(false);
    }
  };

  const baseClass = `w-full h-full bg-transparent px-2 py-1.5 outline-none text-xs border border-transparent focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all rounded ${className}`;

  if (isSaving)
    return (
      <div className="px-2 py-1">
        <IconLoader size={12} className="animate-spin text-indigo-500" />
      </div>
    );

  // --- MODO LECTURA: Aquí aplicamos el Highlight ---
  if (!isEditing) {
    let displayValue = localValue;

    // Si es select, buscamos el texto (ej: "Violín") en lugar del ID
    if (type === "select" && options) {
      const selectedOpt = options.find(
        (opt) => String(opt.value) === String(localValue),
      );
      displayValue = selectedOpt ? selectedOpt.label : localValue;
    }

    return (
      <div
        onClick={() => setIsEditing(true)}
        className="w-full h-full px-2 py-1.5 cursor-text min-h-[32px] flex items-center hover:bg-slate-50 transition-colors"
      >
        <HighlightText text={displayValue || "-"} highlight={highlight} />
      </div>
    );
  }

  // --- MODO EDICIÓN: Inputs normales ---
  if (type === "select") {
    const valueExistsInOptions = options.some(
      (opt) => String(opt.value) === String(localValue),
    );
    return (
      <select
        autoFocus // <--- Para que puedas escribir apenas haces clic
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        className={`${baseClass} cursor-pointer appearance-none ${!valueExistsInOptions && localValue ? "text-orange-600 font-bold" : ""}`}
      >
        <option value="">-</option>
        {!valueExistsInOptions && localValue && (
          <option value={localValue}>⚠️ {localValue} (No estándar)</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      autoFocus
      type={type === "date" ? "date" : "text"}
      value={
        type === "date" && localValue ? localValue.split("T")[0] : localValue
      }
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      className={baseClass}
    />
  );
};

// --- CELDA ENSAMBLES ---
const EnsembleManagerCell = ({
  musicianId,
  assignedEnsembles,
  allEnsembles,
  supabase,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: "220px",
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  const toggleEnsemble = async (ensembleId) => {
    const isAssigned = assignedEnsembles.some((e) => e.id === ensembleId);
    if (isAssigned) {
      await supabase
        .from("integrantes_ensambles")
        .delete()
        .match({ id_integrante: musicianId, id_ensamble: ensembleId });
    } else {
      await supabase
        .from("integrantes_ensambles")
        .insert({ id_integrante: musicianId, id_ensamble: ensembleId });
    }
    onRefresh();
  };

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full px-2 py-1 flex items-center flex-wrap gap-1 cursor-pointer hover:bg-slate-50 min-h-[30px]"
      >
        {assignedEnsembles.length > 0 ? (
          assignedEnsembles.map((e) => (
            <span
              key={e.id}
              className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 truncate max-w-[100px]"
            >
              {e.ensamble}
            </span>
          ))
        ) : (
          <span className="text-slate-300 text-[10px] italic">Sin asignar</span>
        )}
      </div>
      {isOpen &&
        createPortal(
          <div
            className="fixed bg-white border border-slate-300 shadow-xl rounded-lg p-1 z-[99999]"
            style={dropdownStyle}
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 border-b border-slate-100">
              Vincular Ensamble
            </div>
            <div className="max-h-48 overflow-y-auto">
              {allEnsembles.map((ens) => {
                const isAssigned = assignedEnsembles.some(
                  (e) => e.id === ens.id,
                );
                return (
                  <div
                    key={ens.id}
                    onClick={() => toggleEnsemble(ens.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs ${isAssigned ? "text-indigo-700 bg-indigo-50/50" : "text-slate-700"}`}
                  >
                    <div
                      className={`w-3 h-3 border rounded flex items-center justify-center ${isAssigned ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}
                    >
                      {isAssigned && (
                        <IconCheck size={8} className="text-white" />
                      )}
                    </div>
                    {ens.ensamble}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

// --- SELECTOR DE COLUMNAS ---
const ColumnSelector = ({ visibleCols, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 5,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 210),
        width: "200px",
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-colors ${isOpen ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"}`}
      >
        <IconColumns size={16} /> Columnas
      </button>
      {isOpen &&
        createPortal(
          <div
            className="fixed bg-white border border-slate-300 shadow-2xl rounded-lg z-[99999] p-2"
            style={dropdownStyle}
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2 border-b border-slate-100 pb-1">
              Mostrar / Ocultar
            </div>
            {AVAILABLE_COLUMNS.map((col) => (
              <div
                key={col.key}
                onClick={() => {
                  const newSet = new Set(visibleCols);
                  if (newSet.has(col.key)) newSet.delete(col.key);
                  else newSet.add(col.key);
                  onChange(newSet);
                }}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700 select-none"
              >
                <div
                  className={`w-4 h-4 border rounded flex items-center justify-center ${visibleCols.has(col.key) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}
                >
                  {visibleCols.has(col.key) && (
                    <IconCheck size={10} className="text-white" />
                  )}
                </div>
                {col.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
const getMissingFieldsList = (item) => {
  const missing = [];
  if (!item.domicilio) missing.push("Domicilio");
  if (!item.link_dni_img) missing.push("DNI");
  if (!item.link_cuil) missing.push("CUIL");
  if (!item.link_cbu_img) missing.push("CBU");
  if (!item.firma) missing.push("Firma");
  return missing;
};
const EnsembleFilter = ({ ensembles, selectedIds, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: "220px",
        zIndex: 99999,
      });
    }
  }, [isOpen]);

  const toggleEnsemble = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    onChange(newSet);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-all relative ${
          selectedIds.size > 0
            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <IconMusic size={14} /> Ensambles
        {selectedIds.size > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white font-black">
            {selectedIds.size}
          </span>
        )}
      </button>
      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[99998]"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="fixed bg-white border border-slate-300 shadow-2xl rounded-lg z-[99999] p-2 animate-in fade-in slide-in-from-top-1"
              style={dropdownStyle}
            >
              <div className="text-[10px] font-black text-slate-400 uppercase mb-2 px-2 border-b border-slate-100 pb-1">
                Filtrar por Ensamble
              </div>
              <div className="max-h-60 overflow-y-auto">
                {ensembles.map((ens) => (
                  <div
                    key={ens.id}
                    onClick={() => toggleEnsemble(ens.id)}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700 select-none"
                  >
                    <div
                      className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.has(ens.id) ? "bg-indigo-500 border-indigo-500" : "border-slate-300"}`}
                    >
                      {selectedIds.has(ens.id) && (
                        <IconCheck size={10} className="text-white" />
                      )}
                    </div>
                    {ens.ensamble}
                  </div>
                ))}
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => onChange(new Set())}
                  className="w-full mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-red-500 hover:text-red-700 text-center uppercase"
                >
                  Limpiar Ensambles
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};
// --- COMPONENTE PRINCIPAL ---
export default function MusiciansView({ supabase, catalogoInstrumentos }) {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [searchText, setSearchText] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState(new Set());
  const [conditionFilters, setConditionFilters] = useState(
    new Set(["Estable"]),
  );
  // Dentro de export default function MusiciansView...
  const [onlyVigente, setOnlyVigente] = useState(true); // Filtro vigente activo por defecto
  const [missingFieldsFilters, setMissingFieldsFilters] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    key: "apellido",
    direction: "asc",
  });
  const [visibleColumns, setVisibleColumns] = useState(
    new Set(["id_instr", "condicion", "id_localidad", "mail", "telefono"]),
  );
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    const allIds = new Set(catalogoInstrumentos.map((i) => i.id));
    allIds.add("null");
    setSelectedInstruments(allIds);
    fetchLocations();
  }, [catalogoInstrumentos]);

  useEffect(() => {
    fetchData();
  }, [
    searchText,
    conditionFilters,
    selectedInstruments,
    missingFieldsFilters,
    onlyVigente,
  ]);

  const fetchData = () =>
    fetchEnsemblesAndData(
      selectedInstruments,
      conditionFilters,
      missingFieldsFilters,
    );

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    if (data) setLocationsList(data);
  };

  // --- LÓGICA DE FILTRADO EN EL SERVIDOR ---
  const fetchEnsemblesAndData = async (
    instruments,
    conditions,
    missingFields,
  ) => {
    setLoading(true);
    try {
      // 1. Cargamos la lista maestra de ensambles para los dropdowns si no existe
      if (ensemblesList.length === 0) {
        const { data: ens } = await supabase
          .from("ensambles")
          .select("id, ensamble")
          .order("ensamble");
        if (ens) setEnsemblesList(ens);
      }

      // 2. Consulta principal con JOINS relacionales
      let query = supabase.from("integrantes").select(`
        *, 
        instrumentos(instrumento), 
        residencia:localidades!id_localidad(localidad),
        viaticos:localidades!id_loc_viaticos(localidad),
        integrantes_ensambles(
          ensambles(id, ensamble)
        )
    `);

      // --- FILTROS ---
      if (searchText.trim())
        query = query.or(
          `nombre.ilike.%${searchText.trim()}%,apellido.ilike.%${searchText.trim()}%`,
        );

      const realIds = Array.from(instruments).filter((id) => id !== "null");
      if (realIds.length > 0 || instruments.has("null")) {
        let orParts = [];
        if (realIds.length > 0)
          orParts.push(`id_instr.in.(${realIds.join(",")})`);
        if (instruments.has("null")) orParts.push(`id_instr.is.null`);
        query = query.or(orParts.join(","));
      }

      if (conditions.size > 0)
        query = query.in("condicion", Array.from(conditions));

      if (missingFields.size > 0) {
        const missingOrParts = [];
        missingFields.forEach((field) => {
          missingOrParts.push(`${field}.is.null`);
          missingOrParts.push(`${field}.eq.""`);
        });
        query = query.or(missingOrParts.join(","));
      }

      if (onlyVigente) {
        const hoy = new Date().toISOString().split("T")[0];
        query = query.or(`fecha_alta.lte.${hoy},fecha_alta.is.null`);
        query = query.or(`fecha_baja.gte.${hoy},fecha_baja.is.null`);
      }

      const { data: musicians, error } = await query;
      if (error) throw error;

      // 3. Formateo de la data para aplanarla
      // Supabase devuelve los ensambles como: integrantes_ensambles: [{ ensambles: { id, ensamble } }]
      // Lo convertimos a lo que el componente espera: [ { id, ensamble } ]
      const formatted = (musicians || []).map((m) => ({
        ...m,
        integrantes_ensambles:
          m.integrantes_ensambles?.map((ie) => ie.ensambles).filter(Boolean) ||
          [],
      }));

      setResultados(formatted);
    } catch (err) {
      console.error("Error en fetchData:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInlineUpdate = async (id, field, value) => {
    try {
      let updatePayload = { [field]: value === "" ? null : value };
      if (field === "id_instr") updatePayload = { id_instr: value || null };
      if (field === "id_localidad")
        updatePayload = { id_localidad: value ? parseInt(value) : null };
      if (field === "id_loc_viaticos")
        updatePayload = { id_loc_viaticos: value ? parseInt(value) : null };

      const { error } = await supabase
        .from("integrantes")
        .update(updatePayload)
        .eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const startEditModal = async (item) => {
    setEditingId(item.id);
    setEditFormData({ ...item });
  };

  const [columnFilters, setColumnFilters] = useState({}); // { id_instr: 'vlo', mail: '@gmail' }
  // Filtro y Ordenamiento Combinado
  const processedResultados = useMemo(() => {
    let filtered = [...resultados];

    // 1. FILTRO POR ENSAMBLES (Multi-selección)
    if (selectedEnsembles.size > 0) {
      filtered = filtered.filter((item) =>
        // Verificamos si alguno de los ensambles del músico está en el filtro
        item.integrantes_ensambles?.some((ens) =>
          selectedEnsembles.has(ens.id),
        ),
      );
    }

    // 2. FILTROS POR COLUMNA (Los que ya tenías)
    Object.keys(columnFilters).forEach((key) => {
      const term = columnFilters[key].toLowerCase().trim();
      if (term) {
        filtered = filtered.filter((item) => {
          const colCfg = AVAILABLE_COLUMNS.find((c) => c.key === key);
          const val =
            colCfg && colCfg.displayKey
              ? getNestedValue(item, colCfg.displayKey)
              : key === "apellido_nombre"
                ? `${item.apellido} ${item.nombre}`
                : item[key];

          return String(val || "")
            .toLowerCase()
            .includes(term);
        });
      }
    });

    // 3. ORDENAMIENTO (Igual que antes)
    return filtered.sort((a, b) => {
      /* ... tu lógica de sort ... */
    });
  }, [
    resultados,
    sortConfig,
    selectedEnsembles,
    visibleColumns,
    columnFilters,
  ]);
  const instrumentOptions = catalogoInstrumentos.map((i) => ({
    value: i.id,
    label: i.instrumento,
  }));
  const locationOptions = locationsList.map((l) => ({
    value: l.id,
    label: l.localidad,
  }));
  const conditionOptions = CONDITION_OPTIONS.map((c) => ({
    value: c,
    label: c,
  }));

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden animate-in fade-in">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row gap-3 items-center">
        {/* 1. FILTRO DE ENSAMBLES (NUEVO) */}
        <EnsembleFilter
          ensembles={ensemblesList}
          selectedIds={selectedEnsembles}
          onChange={setSelectedEnsembles}
        />

        {/* 2. FILTRO DE INSTRUMENTOS */}
        <InstrumentFilter
          catalogo={catalogoInstrumentos}
          selectedIds={selectedInstruments}
          onChange={(s) => setSelectedInstruments(s)}
        />

        {/* 3. FILTRO DE CONDICIÓN */}
        <ConditionFilter
          selectedConds={conditionFilters}
          onChange={setConditionFilters}
        />

        {/* 4. FILTRO VIGENTES */}
        <button
          onClick={() => setOnlyVigente(!onlyVigente)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-all ${
            onlyVigente
              ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${onlyVigente ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
          />
          Vigentes
        </button>

        {/* 5. FILTRO PENDIENTES */}
        <MissingDataFilter
          selectedFields={missingFieldsFilters}
          onChange={setMissingFieldsFilters}
        />

        {/* 6. SELECTOR DE COLUMNAS */}
        <ColumnSelector
          visibleCols={visibleColumns}
          onChange={setVisibleColumns}
        />

        {/* 7. BOTÓN AGREGAR (Mantenemos el estilo original) */}
        <button
          onClick={() => {
            setEditingId(null);
            setIsAdding(true);
          }}
          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 shadow-md transition-all md:ml-auto"
        >
          <IconPlus size={20} />
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] z-30 border-b border-slate-200">
              {/* FILA 1: TÍTULOS Y ORDENAMIENTO */}
              <tr className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                <th className="p-2 w-10 text-center sticky left-0 bg-slate-50 z-50">
                  #
                </th>
                <th
                  className="p-2 w-40 sticky left-10 bg-slate-50 border-r z-50 cursor-pointer hover:bg-slate-100"
                  onClick={() =>
                    setSortConfig({
                      key: "apellido",
                      direction:
                        sortConfig.key === "apellido" &&
                        sortConfig.direction === "asc"
                          ? "desc"
                          : "asc",
                    })
                  }
                >
                  Apellido y Nombre{" "}
                  {sortConfig.key === "apellido" &&
                    (sortConfig.direction === "asc" ? "↑" : "↓")}
                </th>
                {AVAILABLE_COLUMNS.map(
                  (col) =>
                    visibleColumns.has(col.key) && (
                      <th
                        key={col.key}
                        className="p-2 border-r cursor-pointer hover:bg-slate-100"
                        style={{ width: col.width }}
                        onClick={() =>
                          setSortConfig({
                            key: col.sortKey || col.key,
                            direction:
                              sortConfig.key === (col.sortKey || col.key) &&
                              sortConfig.direction === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                      >
                        {col.label}{" "}
                        {sortConfig.key === (col.sortKey || col.key) &&
                          (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </th>
                    ),
                )}
                <th className="p-2 text-right w-20 sticky right-0 bg-slate-50 z-40">
                  Acciones
                </th>
              </tr>

              {/* FILA 2: INPUTS DE BÚSQUEDA (FILTROS) */}
              <tr className="sticky top-[33px] z-30 bg-white border-b border-slate-200">
                <th className="p-1 sticky left-0 bg-white z-40 border-r"></th>
                <th className="p-1 sticky left-10 bg-white border-r z-40">
                  <div className="relative">
                    <IconSearch
                      size={10}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300"
                    />
                    <input
                      type="text"
                      placeholder="Filtrar nombre..."
                      className="w-full text-[9px] pl-5 pr-1 py-1 border rounded bg-slate-50 focus:bg-white outline-none font-normal"
                      value={columnFilters.apellido_nombre || ""}
                      onChange={(e) =>
                        setColumnFilters({
                          ...columnFilters,
                          apellido_nombre: e.target.value,
                        })
                      }
                    />
                  </div>
                </th>
                {AVAILABLE_COLUMNS.map(
                  (col) =>
                    visibleColumns.has(col.key) && (
                      <th
                        key={`filter-${col.key}`}
                        className="p-1 border-r bg-white"
                      >
                        <input
                          type="text"
                          placeholder={`Buscar...`}
                          className="w-full text-[9px] p-1 border rounded bg-slate-50 focus:bg-white outline-none font-normal"
                          value={columnFilters[col.key] || ""}
                          onChange={(e) =>
                            setColumnFilters({
                              ...columnFilters,
                              [col.key]: e.target.value,
                            })
                          }
                        />
                      </th>
                    ),
                )}
                <th className="p-1 sticky right-0 bg-white z-40 text-center border-l">
                  {(Object.values(columnFilters).some((v) => v) ||
                    searchText) && (
                    <button
                      onClick={() => {
                        setColumnFilters({});
                      }}
                      className="text-[8px] bg-red-50 text-red-500 px-2 py-1 rounded-md hover:bg-red-100 font-black uppercase"
                    >
                      Limpiar
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {processedResultados.map((item, idx) => {
                const conditionClass = getConditionStyles(item.condicion);
                return (
                  <tr key={item.id} className={`${conditionClass} group`}>
                    <td
                      className={`p-1 text-center sticky left-0 z-10 border-r shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${conditionClass.split(" ")[0]}`}
                    >
                      {idx + 1}
                    </td>
                    <td
                      className={`p-1 sticky left-10 z-10 border-r font-bold shadow-[1px_0_0_0_rgba(0,0,0,0.05)] ${conditionClass.split(" ")[0]}`}
                    >
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="truncate">
                          <HighlightText
                            text={`${item.apellido}, ${item.nombre}`}
                            highlight={columnFilters.apellido_nombre || ""} // Ya no usamos searchText
                          />
                        </span>

                        {/* INDICADOR DE PENDIENTES */}
                        {(() => {
                          const missing = getMissingFieldsList(item);
                          if (missing.length === 0) return null;

                          return (
                            <div
                              className="text-orange-500 hover:text-orange-600 cursor-help shrink-0 bg-orange-100 p-0.5 rounded-md transition-colors"
                              title={`⚠️ INFORMACIÓN PENDIENTE:\n• ${missing.join("\n• ")}`}
                            >
                              <IconAlertTriangle size={14} />
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    {AVAILABLE_COLUMNS.map(
                      (col) =>
                        visibleColumns.has(col.key) && (
                          <td key={col.key} className="p-0 border-r">
                            {col.render ? (
                              col.render(item, {
                                ensemblesList,
                                supabase,
                                refreshData: fetchData,
                              })
                            ) : (
                              <EditableCell
                                value={
                                  col.type === "select"
                                    ? item[col.key]
                                    : col.displayKey
                                      ? getNestedValue(item, col.displayKey)
                                      : item[col.key]
                                }
                                rowId={item.id}
                                field={col.key}
                                type={col.type}
                                options={
                                  col.key === "id_instr"
                                    ? instrumentOptions
                                    : col.key === "id_localidad" ||
                                        col.key === "id_loc_viaticos"
                                      ? locationOptions
                                      : col.key === "alimentacion" // <--- AGREGA ESTA CONDICIÓN
                                        ? DIET_OPTIONS.map((d) => ({
                                            value: d,
                                            label: d,
                                          }))
                                        : conditionOptions
                                }
                                onSave={handleInlineUpdate}
                                highlight={columnFilters[col.key] || ""}
                              />
                            )}
                          </td>
                        ),
                    )}
                    <td
                      className={`p-1 text-center sticky right-0 z-10 border-l flex justify-end gap-1 shadow-[-1px_0_0_0_rgba(0,0,0,0.05)] ${conditionClass.split(" ")[0]}`}
                    >
                      <button
                        onClick={() => startEditModal(item)}
                        className="text-slate-400 hover:text-indigo-600 p-1"
                      >
                        <IconEdit size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm("¿Eliminar?")) {
                            await supabase
                              .from("integrantes")
                              .delete()
                              .eq("id", item.id);
                            fetchData();
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(isAdding || editingId) &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <MusicianForm
              supabase={supabase}
              musician={isAdding ? { condicion: "Invitado" } : editFormData}
              onSave={(data, shouldClose = true) => {
                if (shouldClose) {
                  setIsAdding(false);
                  setEditingId(null);
                } else {
                  setEditFormData((prev) => ({ ...prev, ...data }));
                }
                fetchData();
              }}
              onCancel={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
