import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  IconPlus,
  IconX,
  IconCheck,
  IconTrash,
  IconMusic,
  IconMapPin,
  IconClock,
  IconCalendar,
  IconEdit,
  IconRefresh,
  IconUsers,
  IconLayers,
  IconLoader,
  IconAlertTriangle,
  IconChevronDown,
  IconSearch,
  IconUserPlus,
  IconUserMinus,
  IconLink,
  IconCopy,
  IconCloud,
  IconSettings,
  IconFileText,
} from "../../components/ui/Icons";
import LocationMultiSelect from "../../components/filters/LocationMultiSelect";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import MusicianForm from "../Musicians/MusicianForm";
import SearchableSelect from "../../components/ui/SearchableSelect";
import PersonSelectWithCreate from "../../components/filters/PersonSelectWithCreate";
import LocationSelectWithCreate from "../../components/forms/LocationSelectWithCreate";
import { getProgramStyle } from "../../utils/giraUtils";

// --- COMPONENTE INTERNO: Modal de Edición de Concierto ---
const ConcertFormModal = ({
  supabase,
  giraId,
  initialData,
  onClose,
  onSuccess,
  locationsList,
  onRefreshLocations,
}) => {
  const [formData, setFormData] = useState({
    fecha: initialData?.fecha || "",
    hora_inicio: initialData?.hora_inicio || "20:00",
    hora_fin: initialData?.hora_fin || "22:00",
    id_locacion: initialData?.id_locacion || "",
    descripcion: initialData?.descripcion || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.fecha) return alert("Falta la fecha");
    setLoading(true);
    try {
      const payload = {
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        id_locacion:
          formData.id_locacion && formData.id_locacion !== ""
            ? formData.id_locacion
            : null,
        id_gira: giraId,
        id_tipo_evento: 1, // ID FIJO PARA CONCIERTO
        descripcion: formData.descripcion || "Concierto",
      };

      let result;

      if (initialData?.id) {
        result = await supabase
          .from("eventos")
          .update(payload)
          .eq("id", initialData.id);
      } else {
        result = await supabase.from("eventos").insert([payload]);
      }

      if (result.error) throw result.error;

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este concierto?")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("eventos")
        .delete()
        .eq("id", initialData.id);
      if (error) throw error;
      onSuccess();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const locOptions = locationsList.map((l) => ({
    id: l.id,
    label: `${l.nombre} (${l.localidades?.localidad || "Sin loc."})`,
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconMusic className="text-pink-600" />
            {initialData ? "Editar Concierto" : "Nuevo Concierto"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Fecha
            </label>
            <DateInput
              value={formData.fecha}
              onChange={(v) => setFormData({ ...formData, fecha: v })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Inicio
              </label>
              <TimeInput
                value={formData.hora_inicio}
                onChange={(v) => setFormData({ ...formData, hora_inicio: v })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Fin Estimado
              </label>
              <TimeInput
                value={formData.hora_fin}
                onChange={(v) => setFormData({ ...formData, hora_fin: v })}
                className="w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Lugar / Sala
            </label>
            {onRefreshLocations ? (
              <LocationSelectWithCreate
                supabase={supabase}
                options={locOptions}
                value={formData.id_locacion}
                onChange={(v) => setFormData({ ...formData, id_locacion: v })}
                onRefresh={onRefreshLocations}
                placeholder="Buscar sala..."
              />
            ) : (
              <SearchableSelect
                options={locOptions}
                value={formData.id_locacion}
                onChange={(v) => setFormData({ ...formData, id_locacion: v })}
                placeholder="Buscar sala..."
              />
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
              Descripción / Título
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-pink-200 outline-none"
              placeholder="Ej: Gran Concierto de Gala"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
            />
          </div>
        </div>
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-between items-center">
          {initialData ? (
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
            >
              <IconTrash size={14} /> Eliminar
            </button>
          ) : (
            <div></div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <IconLoader className="animate-spin" />
              ) : (
                <IconCheck size={14} />
              )}{" "}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE INTERNO: MultiSelect Dropdown ---
const SourceMultiSelect = ({
  title,
  options,
  selectedSet,
  onToggle,
  color = "fixed-indigo",
  icon: Icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const count = selectedSet.size;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center px-3 py-2 text-xs font-bold uppercase border rounded-lg transition-all ${isOpen ? `border-${color}-400 ring-1 ring-${color}-400 bg-${color}-50 text-${color}-900` : count > 0 ? `bg-${color}-50 text-${color}-800 border-${color}-200 hover:border-${color}-300` : "bg-white text-slate-500 border-slate-300 hover:border-slate-400"}`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && (
            <Icon
              size={14}
              className={count > 0 ? `text-${color}-600` : "text-slate-400"}
            />
          )}
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] bg-${color}-200 text-${color}-800`}
            >
              {count}
            </span>
          )}
          <IconChevronDown
            size={14}
            className={`transition-transform ${isOpen ? "rotate-180" : ""} opacity-50`}
          />
        </div>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
          {options.length === 0 ? (
            <div className="p-2 text-center text-xs text-slate-400 italic">
              No hay opciones
            </div>
          ) : (
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(opt.value, opt.label);
                    }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${isSelected ? `bg-${color}-50 text-${color}-900 font-medium` : "hover:bg-slate-50 text-slate-600"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? `bg-${color}-500 border-${color}-500` : "border-slate-300 bg-white"}`}
                    >
                      {isSelected && (
                        <IconCheck size={12} className="text-white" />
                      )}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE INTERNO: Buscador de Staff ---
const StaffSearchInput = ({ options, onSelect, onCreateNew }) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (val) => {
    onSelect(val);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <div className="relative">
        <IconSearch
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          className="w-full border border-slate-300 pl-8 p-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-fuchsia-200 focus:border-fuchsia-400"
          placeholder="Buscar o crear nuevo..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>
      {isOpen && search.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs text-slate-700 border-b border-slate-50 last:border-0"
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div
              onClick={() => {
                onCreateNew(search);
                setSearch("");
                setIsOpen(false);
              }}
              className="px-3 py-2 bg-fuchsia-50 hover:bg-fuchsia-100 cursor-pointer text-xs text-fuchsia-700 font-bold border-t border-fuchsia-200 flex items-center gap-2"
            >
              <IconPlus size={14} /> Crear "{search}" como Invitado (Detallado)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function GiraForm({
  supabase,
  giraId,
  formData,
  setFormData,
  onCancel,
  onSave,
  onRefresh,
  loading,
  isNew = false,
  locationsList = [],
  selectedLocations = new Set(),
  setSelectedLocations,
  ensemblesList = [],
  allIntegrantes = [],
  selectedSources = [],
  setSelectedSources,
  selectedStaff = [],
  setSelectedStaff,
  enableAutoSave = false,
  isCoordinator = false,
  coordinatedEnsembles = null, // Puede ser Set o Array
}) {
  const [isCreatingDetailed, setIsCreatingDetailed] = useState(false);
  const [tempName, setTempName] = useState({ nombre: "", apellido: "" });
  const [fieldStatuses, setFieldStatuses] = useState({});
  const fieldStatusTimersRef = useRef({});
  const [globalSaving, setGlobalSaving] = useState(false);
  const [isShifting, setIsShifting] = useState(false);
  const [shiftNewDate, setShiftNewDate] = useState("");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [staffRole, setStaffRole] = useState("director");
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | pending | saving | saved | error
  const trackedFields = useMemo(
    () => [
      "nombre_gira",
      "subtitulo",
      "tipo",
      "fecha_desde",
      "fecha_hasta",
      "zona",
      "estado",
      "token_publico",
      "otros_comentarios",
    ],
    [],
  );
  const [lastSavedValues, setLastSavedValues] = useState({});

  useEffect(() => {
    if (syncStatus === "saved") {
      const timeout = setTimeout(() => {
        setSyncStatus("idle");
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [syncStatus]);

  useEffect(() => {
    if (isNew || !enableAutoSave) return;
    const baseline = {};
    trackedFields.forEach((field) => {
      baseline[field] = formData[field] ?? "";
    });
    setLastSavedValues(baseline);
  }, [giraId, isNew, enableAutoSave, trackedFields]);

  useEffect(() => {
    if (isNew || !enableAutoSave || syncStatus === "saving") return;
    if (Object.keys(lastSavedValues).length === 0) return;
    const hasPendingChanges = trackedFields.some(
      (field) => (formData[field] ?? "") !== (lastSavedValues[field] ?? ""),
    );
    if (hasPendingChanges && syncStatus !== "error") {
      setSyncStatus("pending");
    }
  }, [
    formData,
    isNew,
    enableAutoSave,
    syncStatus,
    trackedFields,
    lastSavedValues,
  ]);

  // Estados para Conciertos
  const [concerts, setConcerts] = useState([]);
  const [showConcertModal, setShowConcertModal] = useState(false);
  const [editingConcert, setEditingConcert] = useState(null);

  // Cargar locaciones disponibles para conciertos
  const [allLocationsForConcerts, setAllLocationsForConcerts] = useState([]);

  const fetchConcertLocations = useCallback(async () => {
    const { data } = await supabase
      .from("locaciones")
      .select("id, nombre, localidades(localidad)")
      .order("nombre");
    setAllLocationsForConcerts(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchConcertLocations();
  }, [fetchConcertLocations]);

  // Cargar Conciertos de la Gira
  const fetchConcerts = async () => {
    if (!giraId || isNew) return;
    const { data } = await supabase
      .from("eventos")
      .select(
        "id, fecha, hora_inicio, hora_fin, descripcion, id_locacion, locaciones(nombre)",
      )
      .eq("id_gira", giraId)
      .eq("id_tipo_evento", 1)
      .order("fecha", { ascending: true });
    setConcerts(data || []);
  };

  useEffect(() => {
    fetchConcerts();
  }, [giraId, isNew]);

  const FAMILIES = ["Cuerdas", "Maderas", "Bronces", "Percusión", "-"];

  const setFieldStatus = useCallback((field, status, resetAfterMs = 0) => {
    if (fieldStatusTimersRef.current[field]) {
      clearTimeout(fieldStatusTimersRef.current[field]);
      delete fieldStatusTimersRef.current[field];
    }
    setFieldStatuses((prev) => ({ ...prev, [field]: status }));
    if (resetAfterMs > 0) {
      fieldStatusTimersRef.current[field] = setTimeout(() => {
        setFieldStatuses((prev) => ({ ...prev, [field]: "idle" }));
        delete fieldStatusTimersRef.current[field];
      }, resetAfterMs);
    }
  }, []);

  const getFieldStatusClass = useCallback(
    (field, defaultClass = "bg-white") => {
      const status = fieldStatuses[field] || "idle";
      if (status === "saving")
        return "bg-yellow-100 text-yellow-900 border-yellow-300 ring-1 ring-yellow-300 transition-colors duration-200";
      if (status === "saved")
        return "bg-green-100 text-green-900 border-green-300 ring-1 ring-green-300 transition-colors duration-1000";
      if (status === "error")
        return "bg-red-100 text-red-900 border-red-300 ring-1 ring-red-300 transition-colors duration-200";
      return defaultClass;
    },
    [fieldStatuses],
  );

  const StatusIndicator = ({ field }) => {
    const status = fieldStatuses[field] || "idle";
    if (status === "idle") return null;
    return (
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          status === "saving"
            ? "bg-amber-500 animate-pulse"
            : status === "saved"
              ? "bg-emerald-500"
              : "bg-red-500"
        }`}
      />
    );
  };

  // --- LÓGICA DE VALIDACIÓN COORDINADOR ---
  // Normalizamos IDs a String para comparaciones seguras
  const myEnsembleIds = useMemo(() => {
    if (!coordinatedEnsembles) return new Set();
    const set = new Set();
    // Maneja tanto Set como Array
    coordinatedEnsembles.forEach((id) => set.add(String(id)));
    return set;
  }, [coordinatedEnsembles]);

  const processedEnsembles = useMemo(() => {
    if (!ensemblesList) return [];
    if (!isCoordinator || myEnsembleIds.size === 0) return ensemblesList;

    return [...ensemblesList]
      .sort((a, b) => {
        const aMine = myEnsembleIds.has(String(a.value));
        const bMine = myEnsembleIds.has(String(b.value));
        if (aMine && !bMine) return -1;
        if (!aMine && bMine) return 1;
        return a.label.localeCompare(b.label);
      })
      .map((e) => ({
        ...e,
        label: myEnsembleIds.has(String(e.value)) ? `★ ${e.label}` : e.label,
      }));
  }, [ensemblesList, isCoordinator, myEnsembleIds]);

  // Auto-seleccionar si el coordinador tiene solo 1 ensamble
  useEffect(() => {
    if (isNew && isCoordinator && myEnsembleIds.size === 1) {
      const myEnsembleIdStr = Array.from(myEnsembleIds)[0];
      const isAlreadySelected = selectedSources.some(
        (s) => s.tipo === "ENSAMBLE" && String(s.valor_id) === myEnsembleIdStr,
      );

      if (!isAlreadySelected) {
        const ensembleObj = ensemblesList.find(
          (e) => String(e.value) === myEnsembleIdStr,
        );
        if (ensembleObj) {
          setSelectedSources((prev) => [
            ...prev,
            {
              tipo: "ENSAMBLE",
              valor_id: ensembleObj.value,
              label: ensembleObj.label,
            },
          ]);
        }
      }
    }
  }, [isNew, isCoordinator, myEnsembleIds, ensemblesList]);
  // 1. Error específico de Coordinador (para mostrar el mensaje)
  const coordinatorError = useMemo(() => {
    if (!isCoordinator || myEnsembleIds.size === 0) return false;

    // Si no es tipo Ensamble
    if (formData.tipo !== "Ensamble") return true;

    // Si no seleccionó uno de sus ensambles
    const hasMyEnsemble = selectedSources.some(
      (s) => s.tipo === "ENSAMBLE" && myEnsembleIds.has(String(s.valor_id)),
    );
    return !hasMyEnsemble;
  }, [isCoordinator, myEnsembleIds, formData.tipo, selectedSources]);

  // 2. Error de Fechas (Nuevo requerimiento)
  const dateError = useMemo(() => {
    return !formData.fecha_desde || !formData.fecha_hasta;
  }, [formData.fecha_desde, formData.fecha_hasta]);

  // 3. Estado general del botón Guardar
  const isSaveDisabled = loading || coordinatorError || dateError;

  const handleAutoSave = async (fieldName, valueOverride = null) => {
    if (isNew || !enableAutoSave || !giraId) return;
    const value = valueOverride !== null ? valueOverride : formData[fieldName];
    setSyncStatus("saving");
    setFieldStatus(fieldName, "saving");
    setGlobalSaving(true);
    try {
      const { error } = await supabase
        .from("programas")
        .update({ [fieldName]: value })
        .eq("id", giraId);
      if (error) throw error;
      setLastSavedValues((prev) => ({ ...prev, [fieldName]: value ?? "" }));
      if (onRefresh) onRefresh();
      setSyncStatus("saved");
      setFieldStatus(fieldName, "saved", 2000);
    } catch (err) {
      console.error("Error auto-guardando:", err);
      setSyncStatus("error");
      setFieldStatus(fieldName, "error");
    } finally {
      setTimeout(() => {
        setGlobalSaving(false);
      }, 500);
    }
  };

  const handleDifusionAutoSave = async (fieldName, valueOverride = null) => {
    if (isNew || !enableAutoSave || !giraId) return;
    const value = valueOverride !== null ? valueOverride : formData[fieldName];
    setSyncStatus("saving");
    setFieldStatus(fieldName, "saving");
    setGlobalSaving(true);
    try {
      const { data: updatedRows, error: updateError } = await supabase
        .from("gira_difusion")
        .update({ [fieldName]: value })
        .eq("id_gira", giraId)
        .select("id_gira");

      if (updateError) throw updateError;

      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabase.from("gira_difusion").insert(
          [{ id_gira: giraId, [fieldName]: value }],
        );
        if (insertError) throw insertError;
      }

      setLastSavedValues((prev) => ({ ...prev, [fieldName]: value ?? "" }));
      if (onRefresh) onRefresh();
      setSyncStatus("saved");
      setFieldStatus(fieldName, "saved", 2000);
    } catch (err) {
      console.error("Error auto-guardando difusión:", err);
      setSyncStatus("error");
      setFieldStatus(fieldName, "error");
    } finally {
      setTimeout(() => {
        setGlobalSaving(false);
      }, 500);
    }
  };

  const toggleSource = async (tipo, value, label) => {
    const isId = tipo !== "FAMILIA";
    const exists = selectedSources.some(
      (s) =>
        s.tipo === tipo &&
        (isId ? s.valor_id === value : s.valor_texto === value),
    );

    if (exists) {
      setSelectedSources((prev) =>
        prev.filter(
          (s) =>
            !(
              s.tipo === tipo &&
              (isId ? s.valor_id === value : s.valor_texto === value)
            ),
        ),
      );
    } else {
      const cleanLabel = label.replace("★ ", "");
      setSelectedSources((prev) => [
        ...prev,
        {
          tipo,
          label: cleanLabel,
          valor_id: isId ? value : null,
          valor_texto: !isId ? value : null,
        },
      ]);
    }

    if (!isNew && enableAutoSave) {
      setSyncStatus("saving");
      setGlobalSaving(true);
      try {
        if (exists) {
          let query = supabase
            .from("giras_fuentes")
            .delete()
            .eq("id_gira", giraId)
            .eq("tipo", tipo);
          if (isId) query = query.eq("valor_id", value);
          else query = query.eq("valor_texto", value);
          await query;
        } else {
          await supabase.from("giras_fuentes").insert([
            {
              id_gira: giraId,
              tipo,
              valor_id: isId ? value : null,
              valor_texto: !isId ? value : null,
            },
          ]);
        }
        setSyncStatus("saved");
      } catch (error) {
        console.error("Error guardando fuente:", error);
        setSyncStatus("error");
      } finally {
        setGlobalSaving(false);
      }
    }
  };

  const handleSelectStaff = async (payload) => {
    if (!payload) return;
    let idInt = null;
    let label = "";

    if (typeof payload === "object") {
      idInt = payload.id;
      label = payload.label || "";
    } else {
      idInt = payload;
      const person = allIntegrantes.find((i) => i.value === idInt);
      label = person?.label || "";
    }

    if (!idInt) return;

    const exists = selectedStaff.some(
      (s) => s.id_integrante === idInt && s.rol === staffRole,
    );
    if (exists) return;

    setSelectedStaff([
      ...selectedStaff,
      { id_integrante: idInt, rol: staffRole, label },
    ]);

    if (!isNew && enableAutoSave) {
      setSyncStatus("saving");
      setGlobalSaving(true);
      try {
        const { error } = await supabase.from("giras_integrantes").insert([
          {
            id_gira: giraId,
            id_integrante: idInt,
            rol: staffRole,
            estado: "confirmado",
          },
        ]);
        if (error) throw error;
        setSyncStatus("saved");
      } catch (error) {
        console.error("Error agregando integrante a gira:", error);
        setSyncStatus("error");
      } finally {
        setGlobalSaving(false);
      }
    }
  };

  const removeStaff = async (index) => {
    const staffToRemove = selectedStaff[index];
    const newStaff = [...selectedStaff];
    newStaff.splice(index, 1);
    setSelectedStaff(newStaff);
    if (!isNew && enableAutoSave && staffToRemove) {
      setSyncStatus("saving");
      setGlobalSaving(true);
      try {
        const { error } = await supabase
          .from("giras_integrantes")
          .delete()
          .eq("id_gira", giraId)
          .eq("id_integrante", staffToRemove.id_integrante)
          .eq("rol", staffToRemove.rol);
        if (error) throw error;
        setSyncStatus("saved");
      } catch (error) {
        console.error("Error eliminando integrante de gira:", error);
        setSyncStatus("error");
      } finally {
        setGlobalSaving(false);
      }
    }
  };

  const handleLocationChange = async (newSet) => {
    const added = [...newSet].filter((x) => !selectedLocations.has(x));
    const removed = [...selectedLocations].filter((x) => !newSet.has(x));
    setSelectedLocations(newSet);
    if (!isNew && enableAutoSave) {
      setSyncStatus("saving");
      setGlobalSaving(true);
      try {
        if (added.length) {
          const { error: insertError } = await supabase
            .from("giras_localidades")
            .insert(
              added.map((lid) => ({ id_gira: giraId, id_localidad: lid })),
            );
          if (insertError) throw insertError;
        }
        if (removed.length) {
          const { error: deleteError } = await supabase
            .from("giras_localidades")
            .delete()
            .eq("id_gira", giraId)
            .in("id_localidad", removed);
          if (deleteError) throw deleteError;
        }
        setSyncStatus("saved");
      } catch (error) {
        console.error("Error actualizando localidades de gira:", error);
        setSyncStatus("error");
      } finally {
        setGlobalSaving(false);
      }
    }
  };

  const removeLocation = async (locId) => {
    const newLocs = new Set(selectedLocations);
    newLocs.delete(locId);
    setSelectedLocations(newLocs);
    if (!isNew && enableAutoSave) {
      setSyncStatus("saving");
      setGlobalSaving(true);
      try {
        const { error } = await supabase
          .from("giras_localidades")
          .delete()
          .eq("id_gira", giraId)
          .eq("id_localidad", locId);
        if (error) throw error;
        setSyncStatus("saved");
      } catch (error) {
        console.error("Error eliminando localidad de gira:", error);
        setSyncStatus("error");
      } finally {
        setGlobalSaving(false);
      }
    }
  };

  const handleCreateGuest = (searchText) => {
    const parts = searchText.trim().split(" ");
    setTempName({
      nombre: parts[0] || "",
      apellido: parts.slice(1).join(" ") || "",
    });
    setIsCreatingDetailed(true);
  };

  const handleDetailedSave = async (newMusician) => {
    if (!isNew && giraId) {
      setSyncStatus("saving");
      setGlobalSaving(true);
      try {
        const { error } = await supabase.from("giras_integrantes").insert([
          {
            id_gira: giraId,
            id_integrante: newMusician.id,
            rol: staffRole,
            estado: "confirmado",
          },
        ]);
        if (error) throw error;
        setSyncStatus("saved");
      } catch (error) {
        console.error("Error guardando músico detallado en gira:", error);
        setSyncStatus("error");
      } finally {
        setGlobalSaving(false);
      }
    }
    setSelectedStaff((prev) => [
      ...prev,
      {
        id_integrante: newMusician.id,
        rol: staffRole,
        label: `${newMusician.apellido}, ${newMusician.nombre}`,
      },
    ]);
    setIsCreatingDetailed(false);
  };

  const togglePublicLink = async () => {
    const newToken = formData.token_publico ? null : self.crypto.randomUUID();
    setFormData((prev) => ({ ...prev, token_publico: newToken }));
    if (enableAutoSave) await handleAutoSave("token_publico", newToken);
  };
  const regenerateLink = async () => {
    if (!confirm("Se invalidará el enlace anterior. ¿Seguir?")) return;
    const newToken = self.crypto.randomUUID();
    setFormData((prev) => ({ ...prev, token_publico: newToken }));
    if (enableAutoSave) await handleAutoSave("token_publico", newToken);
  };
  const copyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/share/${formData.token_publico}`,
    );
    alert("Copiado");
  };
  const handleShiftProgram = async () => {
    alert("En desarrollo");
    setIsShifting(false);
  };

  const getProgramBackgroundClass = () => {
    const style = getProgramStyle(formData.tipo);
    const colorTokens = (style?.color || "").split(" ");
    const bgToken = colorTokens.find((token) => token.startsWith("bg-"));
    return bgToken || "bg-white";
  };

  const programTypeOptions = [
    {
      value: "Sinfónico",
      label: "SINFÓNICO",
      style: { backgroundColor: "#eef2ff", color: "#3730a3" },
    },
    {
      value: "Camerata Filarmónica",
      label: "CAMERATA FILARMÓNICA",
      style: { backgroundColor: "#fdf2f8", color: "#a21caf" },
    },
    {
      value: "Ensamble",
      label: "ENSAMBLE",
      style: { backgroundColor: "#ecfdf5", color: "#047857" },
    },
    {
      value: "Jazz Band",
      label: "JAZZ BAND",
      style: { backgroundColor: "#fffbeb", color: "#b45309" },
    },
    {
      value: "Comisión",
      label: "COMISIÓN",
      style: { backgroundColor: "#f0f9ff", color: "#0369a1" },
    },
  ];

  const getProgramTypeSelectBaseClass = () => {
    const style = getProgramStyle(formData.tipo);
    const tokens = (style?.color || "").split(" ");
    return tokens.filter((t) => t.startsWith("bg-") || t.startsWith("text-") || t.startsWith("border-")).join(" ");
  };

  return (
    <div
      className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 relative ${isNew ? "bg-fixed-indigo-50 border-fixed-indigo-200" : `${getProgramBackgroundClass()} ring-2 ring-fixed-indigo-500 border-fixed-indigo-500 z-10`}`}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 border-b border-fixed-indigo-100 pb-2 gap-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <h3 className="text-fixed-indigo-900 font-bold flex items-center gap-2">
            {isNew ? (
              <>
                {" "}
                <IconPlus size={18} />{" "}
                {isCoordinator
                  ? "Nuevo Programa de Ensamble"
                  : "Nuevo Programa"}{" "}
              </>
            ) : (
              <>
                {" "}
                <IconEdit size={18} /> Configuración del Programa{" "}
              </>
            )}
          </h3>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-1/2 md:w-auto md:min-w-[180px]">
              <select
                value={formData.estado || "Borrador"}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setFormData({ ...formData, estado: newVal });
                  handleAutoSave("estado", newVal);
                }}
                className={`w-full md:w-[200px] h-9 p-1.5 rounded-lg border appearance-none outline-none text-sm text-center font-bold uppercase tracking-wide focus:ring-2 focus:ring-fixed-indigo-500 ${getFieldStatusClass(
                  "estado",
                  formData.estado === "Vigente"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : formData.estado === "Pausada"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-slate-50 border-slate-200 text-slate-600",
                )}`}
              >
                <option value="Borrador">BORRADOR</option>
                <option value="Vigente">VIGENTE</option>
                <option value="Pausada">PAUSADA</option>
              </select>
            </div>
            <div className="relative w-1/2 md:w-auto md:min-w-[180px]">
              <select
                value={formData.tipo || "Sinfónico"}
                disabled={isCoordinator}
                onChange={(e) => {
                  const next = e.target.value;
                  setFormData({ ...formData, tipo: next });
                  handleAutoSave("tipo", next);
                }}
                className={`w-full md:w-[220px] h-9 p-1.5 rounded-lg border appearance-none outline-none text-sm text-center uppercase font-bold focus:ring-2 focus:ring-fixed-indigo-500 ${isCoordinator ? "opacity-80 bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed" : getFieldStatusClass("tipo", getProgramTypeSelectBaseClass())}`}
              >
                {programTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} style={opt.style}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isNew && !isShifting && (
            <button
              onClick={() => setIsShifting(true)}
              className="w-full md:w-auto text-xs bg-fixed-indigo-50 text-fixed-indigo-700 px-3 py-1 rounded-full border border-fixed-indigo-100 hover:bg-fixed-indigo-100 flex items-center justify-center gap-1 transition-colors"
            >
              <IconCalendar size={14} /> Trasladar Gira
            </button>
          )}
        </div>
      </div>

      {isShifting && (
        <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-lg animate-in slide-in-from-top-2">
          <h4 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2">
            <IconRefresh size={16} /> Trasladar Gira Completa
          </h4>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <DateInput
                label="Nueva Fecha Inicio"
                value={shiftNewDate}
                onChange={setShiftNewDate}
              />
            </div>
            <button
              onClick={handleShiftProgram}
              disabled={shiftLoading}
              className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded mb-1"
            >
              {shiftLoading ? "..." : "Confirmar"}
            </button>
            <button
              onClick={() => setIsShifting(false)}
              className="px-3 py-1 bg-white border border-amber-200 text-amber-700 text-xs rounded mb-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* DATOS GENERALES */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-12 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 w-full">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block min-h-[16px]">
              Título
            </label>
            <input
              type="text"
              className={`w-full h-[46px] border border-slate-300 p-2 rounded focus:ring-2 focus:ring-fixed-indigo-500 outline-none font-medium text-lg ${getFieldStatusClass("nombre_gira", "bg-white")}`}
              value={formData.nombre_gira}
              onChange={(e) =>
                setFormData({ ...formData, nombre_gira: e.target.value })
              }
              onBlur={() => handleAutoSave("nombre_gira")}
            />
          </div>
          <div className="w-full sm:w-1/3">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block min-h-[16px]">
              Subtítulo
            </label>
            <input
              type="text"
              className={`w-full h-[46px] border border-slate-300 p-2 rounded focus:ring-2 focus:ring-fixed-indigo-500 outline-none text-sm ${getFieldStatusClass("subtitulo", "bg-white")}`}
              placeholder="Ej. Ciclo 2025"
              value={formData.subtitulo || ""}
              onChange={(e) =>
                setFormData({ ...formData, subtitulo: e.target.value })
              }
              onBlur={() => handleAutoSave("subtitulo")}
            />
          </div>
        </div>
        <div className="col-span-12 md:col-span-2">
          <DateInput
            label="Fecha Inicio"
            value={formData.fecha_desde}
            className={getFieldStatusClass("fecha_desde", "bg-white h-[42px]")}
            onChange={(val) => {
              setFormData({ ...formData, fecha_desde: val });
              handleAutoSave("fecha_desde", val);
            }}
          />
        </div>
        <div className="col-span-12 md:col-span-2">
          <DateInput
            label="Fecha Fin"
            value={formData.fecha_hasta}
            className={getFieldStatusClass("fecha_hasta", "bg-white h-[42px]")}
            onChange={(val) => {
              setFormData({ ...formData, fecha_hasta: val });
              handleAutoSave("fecha_hasta", val);
            }}
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block min-h-[16px]">
            Zona
          </label>
          <input
            type="text"
            className={`w-full h-[42px] border border-slate-300 p-2 rounded ${getFieldStatusClass("zona", "bg-white")}`}
            value={formData.zona || ""}
            onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
            onBlur={() => handleAutoSave("zona")}
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <div className="flex items-center gap-1 mb-1 min-h-[16px] overflow-x-auto whitespace-nowrap">
            <label className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
              Localía
            </label>
            {Array.from(selectedLocations).map((locId) => {
              const locName = locationsList.find(
                (l) => l.id === locId,
              )?.localidad;
              if (!locName) return null;
              return (
                <span
                  key={locId}
                  className="inline-flex items-center gap-1 px-1.5 h-4 bg-fixed-indigo-50 text-fixed-indigo-700 border border-fixed-indigo-100 rounded text-[10px] font-bold uppercase leading-none animate-in zoom-in-95 shrink-0"
                >
                  {locName}
                  <button
                    onClick={() => removeLocation(locId)}
                    className="hover:text-red-500 rounded-full p-0"
                  >
                    <IconX size={10} />
                  </button>
                </span>
              );
            })}
          </div>
          <LocationMultiSelect
            locations={locationsList}
            selectedIds={selectedLocations}
            onChange={handleLocationChange}
            showLabel={false}
            buttonClassName="h-[42px]"
          />
        </div>
        <div className="col-span-12 pt-2 border-t border-slate-100 mt-2">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-1">
            <IconFileText size={14} />
            Observaciones para Difusión y Redes
          </label>
          <textarea
            rows={3}
            className={`w-full border border-slate-300 p-2 rounded text-sm focus:ring-2 focus:ring-fixed-indigo-500 outline-none ${getFieldStatusClass("otros_comentarios", "bg-white")}`}
            value={formData.otros_comentarios || ""}
            onChange={(e) =>
              setFormData({ ...formData, otros_comentarios: e.target.value })
            }
            onBlur={() => handleDifusionAutoSave("otros_comentarios")}
            placeholder="Comentarios útiles para equipo de difusión y redes..."
          />
        </div>
      </div>

      {/* SECCIÓN DE CONCIERTOS */}
      {!isNew && (
        <div className="mt-6 pt-4 border-t border-fixed-indigo-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-pink-700 flex items-center gap-2">
              <IconMusic size={16} /> Conciertos y Funciones
            </h4>
            <button
              onClick={() => {
                setEditingConcert(null);
                setShowConcertModal(true);
              }}
              className="text-xs bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100 hover:bg-pink-100 flex items-center gap-1 transition-colors"
            >
              <IconPlus size={14} /> Agregar Concierto
            </button>
          </div>
          {concerts.length === 0 ? (
            <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-400 italic">
              No hay conciertos cargados para este programa.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {concerts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setEditingConcert(c);
                    setShowConcertModal(true);
                  }}
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-pink-300 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-pink-50 text-pink-700 w-10 h-10 rounded flex flex-col items-center justify-center border border-pink-100 shrink-0">
                      <span className="text-[10px] font-bold uppercase leading-none">
                        {new Date(c.fecha + "T00:00:00").toLocaleDateString(
                          "es-AR",
                          { weekday: "short" },
                        )}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {new Date(c.fecha + "T00:00:00").getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">
                        {c.descripcion}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <IconClock size={10} /> {c.hora_inicio?.slice(0, 5)} hs{" "}
                        <span className="text-slate-300">|</span>{" "}
                        <IconMapPin size={10} />{" "}
                        {c.locaciones?.nombre || "Sin Sala"}
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                    <IconEdit size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PERSONAL */}
      <div className="mt-6 pt-4 border-t border-fixed-indigo-100 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-3">
          <h4 className="text-sm font-bold text-fixed-indigo-900 flex items-center gap-2">
            <IconLayers size={16} /> Configuración de Personal
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative">
              <SourceMultiSelect
                title="Ensambles"
                color="emerald"
                icon={IconMusic}
                options={processedEnsembles}
                selectedSet={
                  new Set(
                    selectedSources
                      .filter((s) => s.tipo === "ENSAMBLE")
                      .map((s) => s.valor_id),
                  )
                }
                onToggle={(val, lbl) => toggleSource("ENSAMBLE", val, lbl)}
              />
            </div>

            <SourceMultiSelect
              title="Familias"
              color="fixed-indigo"
              icon={IconUsers}
              options={FAMILIES.map((f) => ({ value: f, label: f }))}
              selectedSet={
                new Set(
                  selectedSources
                    .filter((s) => s.tipo === "FAMILIA")
                    .map((s) => s.valor_texto),
                )
              }
              onToggle={(val, lbl) => toggleSource("FAMILIA", val, lbl)}
            />
            <SourceMultiSelect
              title="Excluir Ens."
              color="red"
              icon={IconAlertTriangle}
              options={ensemblesList}
              selectedSet={
                new Set(
                  selectedSources
                    .filter((s) => s.tipo === "EXCL_ENSAMBLE")
                    .map((s) => s.valor_id),
                )
              }
              onToggle={(val, lbl) => toggleSource("EXCL_ENSAMBLE", val, lbl)}
            />
          </div>
          <div className="flex flex-wrap gap-2 min-h-[30px] content-start bg-slate-50 p-2 rounded-lg border border-slate-100">
            {selectedSources.length === 0 ? (
              <span className="text-[10px] text-slate-400 italic">
                Nada seleccionado
              </span>
            ) : (
              selectedSources.map((s, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase border animate-in zoom-in-95 shadow-sm bg-white ${s.tipo === "EXCL_ENSAMBLE" ? "border-red-200 text-red-700" : s.tipo === "FAMILIA" ? "border-fixed-indigo-200 text-fixed-indigo-700" : "border-emerald-200 text-emerald-700"}`}
                >
                  {s.tipo === "EXCL_ENSAMBLE" && "🚫 "}
                  {s.label.replace("★ ", "")}
                  <button
                    onClick={() =>
                      toggleSource(s.tipo, s.valor_id || s.valor_texto, s.label)
                    }
                    className="ml-1 hover:text-black hover:bg-black/5 rounded-full p-0.5"
                  >
                    <IconX size={10} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-5">
          <h4 className="text-sm font-bold text-fixed-indigo-900 mb-2 flex items-center gap-2">
            <IconUsers size={16} /> Staff Artístico
          </h4>
          <div className="flex flex-col gap-2 p-3 rounded-lg border bg-fuchsia-50/30 border-fuchsia-100">
            <div className="flex gap-2 items-center">
              <select
                className="w-1/3 border border-slate-300 p-1.5 rounded text-xs outline-none bg-white font-bold text-fuchsia-800"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
              >
                <option value="director">Director</option>
                <option value="solista">Solista</option>
              </select>
              <div className="flex-1">
                <PersonSelectWithCreate
                  supabase={supabase}
                  value={null}
                  onChange={handleSelectStaff}
                  isMulti={false}
                  placeholder="Buscá o creá un nuevo invitado con el '+' ->"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 content-start min-h-[20px]">
              {selectedStaff.map((s, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border shadow-sm animate-in zoom-in-95 bg-white ${s.rol === "Director" ? "text-purple-700 border-purple-200" : "text-fuchsia-700 border-fuchsia-200"}`}
                >
                  <span className="opacity-50 uppercase mr-0.5 text-[9px]">
                    {s.rol.slice(0, 3)}:
                  </span>{" "}
                  {s.label}
                  <button
                    onClick={() => removeStaff(idx)}
                    className="ml-1 hover:text-red-600 rounded-full hover:bg-slate-100 p-0.5"
                  >
                    <IconX size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN: LINK PÚBLICO --- */}
      {!isNew && enableAutoSave && (
        <div
          className={`mt-6 p-6 rounded-xl shadow-sm border transition-colors ${formData.token_publico ? "bg-fixed-indigo-50/50 border-fixed-indigo-200" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <IconLink
                  className={
                    formData.token_publico
                      ? "text-fixed-indigo-600"
                      : "text-slate-400"
                  }
                />{" "}
                Enlace de Invitado General
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Permite ver la agenda y detalles de esta gira a cualquier
                persona con el enlace.
              </p>
            </div>
            <button
              onClick={togglePublicLink}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.token_publico ? "bg-fixed-indigo-600" : "bg-slate-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.token_publico ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
          {formData.token_publico && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-fixed-indigo-200 rounded-lg px-3 py-2 text-sm text-slate-600 font-mono truncate select-all">
                  {`${window.location.origin}/share/${formData.token_publico}`}
                </div>
                <button
                  onClick={copyLink}
                  className="bg-fixed-indigo-600 hover:bg-fixed-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <IconCopy size={16} /> Copiar
                </button>
                <button
                  onClick={regenerateLink}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg transition-colors"
                >
                  <IconRefresh size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="flex flex-col items-end gap-2 mt-8 pt-3 border-t border-fixed-indigo-100/50">
        {/* Mensaje de Error Coordinador (Solo si no está cargando) */}
        {!loading && coordinatorError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded font-bold animate-pulse flex items-center gap-2">
            <IconAlertTriangle size={14} />
            Debes seleccionar el tipo 'Ensamble' y al menos uno de tus ensambles
            asignados.
          </div>
        )}

        {/* Mensaje de Error Fechas (Solo si no está cargando) */}
        {!loading && dateError && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded font-bold flex items-center gap-2">
            <IconCalendar size={14} />
            Las fechas de inicio y fin son obligatorias.
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium disabled:opacity-50"
          >
            <IconX size={16} /> Cerrar
          </button>

          {(!enableAutoSave || isNew) && (
            <button
              onClick={(e) => {
                if (isSaveDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Feedback visual explícito si hacen click forzados
                  if (coordinatorError)
                    alert(
                      "Error: Verifica el tipo de programa y los ensambles.",
                    );
                  else if (dateError)
                    alert("Error: Faltan las fechas de la gira.");
                  return;
                }
                onSave(e);
              }}
              // Visualmente deshabilitado, pero permitimos click para validación si se requiere
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-white text-sm font-bold shadow-sm transition-all ${
                isSaveDisabled
                  ? "bg-slate-400 opacity-70 cursor-not-allowed"
                  : "bg-fixed-indigo-600 hover:bg-fixed-indigo-700"
              }`}
            >
              {loading ? (
                <IconLoader className="animate-spin" size={16} />
              ) : (
                <IconCheck size={16} />
              )}
              {loading
                ? "Procesando..."
                : isNew
                  ? "Crear Programa"
                  : "Guardar Todo"}
            </button>
          )}
        </div>
      </div>
      {/* MODAL DETALLADO DE MÚSICO (flujo detallado previo) */}
      {isCreatingDetailed && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200">
              <MusicianForm
                supabase={supabase}
                musician={{
                  nombre: tempName.nombre,
                  apellido: tempName.apellido,
                  condicion: "Invitado",
                }}
                onSave={handleDetailedSave}
              onCancel={() => setIsCreatingDetailed(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL CONCIERTO */}
      {showConcertModal && (
        <ConcertFormModal
          supabase={supabase}
          giraId={giraId}
          initialData={editingConcert}
          onClose={() => setShowConcertModal(false)}
          onRefreshLocations={fetchConcertLocations}
          onSuccess={() => {
            setShowConcertModal(false);
            fetchConcerts();
          }}
          locationsList={allLocationsForConcerts}
        />
      )}
    </div>
  );
}
