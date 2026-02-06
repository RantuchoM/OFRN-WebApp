import React, { useState, useEffect, useRef, useMemo } from "react";
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
} from "../../components/ui/Icons";
import LocationMultiSelect from "../../components/filters/LocationMultiSelect";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import MusicianForm from "../Musicians/MusicianForm";
import SearchableSelect from "../../components/ui/SearchableSelect"; // Asegúrate de importar esto

// --- COMPONENTE INTERNO: Modal de Edición de Concierto ---
const ConcertFormModal = ({
  supabase,
  giraId,
  initialData,
  onClose,
  onSuccess,
  locationsList,
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
      // Saneamiento de datos: id_locacion debe ser NULL si está vacío
      const payload = {
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        id_locacion: formData.id_locacion && formData.id_locacion !== "" ? formData.id_locacion : null,
        id_gira: giraId,
        id_tipo_evento: 1, // ID FIJO PARA CONCIERTO
        descripcion: formData.descripcion || "Concierto",
      };

      let result;

      if (initialData?.id) {
        result = await supabase.from("eventos").update(payload).eq("id", initialData.id);
      } else {
        result = await supabase.from("eventos").insert([payload]);
      }

      // --- CORRECCIÓN IMPORTANTE: VERIFICAR ERRORES ---
      if (result.error) {
        throw result.error;
      }

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
      const { error } = await supabase.from("eventos").delete().eq("id", initialData.id);
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
            <SearchableSelect
              options={locOptions}
              value={formData.id_locacion}
              onChange={(v) => setFormData({ ...formData, id_locacion: v })}
              placeholder="Buscar sala..."
            />
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
              )}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE INTERNO: MultiSelect Dropdown (Existente) ---
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
        className={`w-full flex justify-between items-center px-3 py-2 text-xs font-bold uppercase border rounded-lg transition-all 
                    ${
                      isOpen
                        ? `border-${color}-400 ring-1 ring-${color}-400 bg-${color}-50 text-${color}-900`
                        : count > 0
                        ? `bg-${color}-50 text-${color}-800 border-${color}-200 hover:border-${color}-300`
                        : "bg-white text-slate-500 border-slate-300 hover:border-slate-400"
                    }`}
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
            className={`transition-transform ${
              isOpen ? "rotate-180" : ""
            } opacity-50`}
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
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs select-none transition-colors ${
                      isSelected
                        ? `bg-${color}-50 text-${color}-900 font-medium`
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? `bg-${color}-500 border-${color}-500`
                          : "border-slate-300 bg-white"
                      }`}
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

// --- COMPONENTE INTERNO: Buscador de Staff (Existente) ---
const StaffSearchInput = ({ options, onSelect, onCreateNew }) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
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
  coordinatedEnsembles = null, // Set de IDs
}) {
  const [isCreatingDetailed, setIsCreatingDetailed] = useState(false);
  const [tempName, setTempName] = useState({ nombre: "", apellido: "" });
  const [savingField, setSavingField] = useState(null);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [isShifting, setIsShifting] = useState(false);
  const [shiftNewDate, setShiftNewDate] = useState("");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [staffRole, setStaffRole] = useState("director");
  
  // Estados para Conciertos
  const [concerts, setConcerts] = useState([]);
  const [showConcertModal, setShowConcertModal] = useState(false);
  const [editingConcert, setEditingConcert] = useState(null);
  
  // Cargar locaciones disponibles para conciertos (de la tabla locaciones completa)
  const [allLocationsForConcerts, setAllLocationsForConcerts] = useState([]);

  useEffect(() => {
    const fetchLocs = async () => {
        const { data } = await supabase
            .from("locaciones")
            .select("id, nombre, localidades(localidad)")
            .order("nombre");
        setAllLocationsForConcerts(data || []);
    };
    fetchLocs();
  }, [supabase]);

  // Cargar Conciertos de la Gira (solo si no es nueva)
  const fetchConcerts = async () => {
    if (!giraId || isNew) return;
    const { data } = await supabase
        .from("eventos")
        .select("id, fecha, hora_inicio, hora_fin, descripcion, id_locacion, locaciones(nombre)")
        .eq("id_gira", giraId)
        .eq("id_tipo_evento", 1) // Solo conciertos
        .order("fecha", { ascending: true });
    setConcerts(data || []);
  };

  useEffect(() => {
    fetchConcerts();
  }, [giraId, isNew]);

  const FAMILIES = ["Cuerdas", "Maderas", "Bronces", "Percusión", "-"];

  const StatusIndicator = ({ field }) => {
    if (savingField === field)
      return <IconLoader size={14} className="animate-spin text-fixed-indigo-600" />;
    return null;
  };

  const processedEnsembles = useMemo(() => {
    if (!ensemblesList) return [];
    if (!isCoordinator || !coordinatedEnsembles) return ensemblesList;

    return [...ensemblesList]
      .sort((a, b) => {
        const aMine = coordinatedEnsembles.has(a.value);
        const bMine = coordinatedEnsembles.has(b.value);
        if (aMine && !bMine) return -1;
        if (!aMine && bMine) return 1;
        return a.label.localeCompare(b.label);
      })
      .map((e) => ({
        ...e,
        label: coordinatedEnsembles.has(e.value) ? `★ ${e.label}` : e.label,
      }));
  }, [ensemblesList, isCoordinator, coordinatedEnsembles]);

  const myEnsembleIds = useMemo(() => {
    if (!coordinatedEnsembles) return new Set();
    const set = new Set();
    coordinatedEnsembles.forEach(id => set.add(String(id)));
    return set;
  }, [coordinatedEnsembles]);

  useEffect(() => {
    if (isNew && isCoordinator && myEnsembleIds.size === 1) {
      const myEnsembleIdStr = Array.from(myEnsembleIds)[0];
      const isAlreadySelected = selectedSources.some(
        s => s.tipo === 'ENSAMBLE' && String(s.valor_id) === myEnsembleIdStr
      );

      if (!isAlreadySelected) {
        const ensembleObj = ensemblesList.find(e => String(e.value) === myEnsembleIdStr);
        if (ensembleObj) {
            setSelectedSources(prev => [
                ...prev, 
                { tipo: 'ENSAMBLE', valor_id: ensembleObj.value, label: ensembleObj.label }
            ]);
        }
      }
    }
  }, [isNew, isCoordinator, myEnsembleIds, ensemblesList]); 

  const isSaveDisabled = useMemo(() => {
    if (loading) return true;
    if (isCoordinator && myEnsembleIds.size > 0) {
        if (formData.tipo !== 'Ensamble') return true;
        const hasMyEnsemble = selectedSources.some(s => 
            s.tipo === 'ENSAMBLE' && myEnsembleIds.has(String(s.valor_id))
        );
        if (!hasMyEnsemble) return true;
    }
    return false;
  }, [loading, isCoordinator, myEnsembleIds, formData.tipo, selectedSources]);

  const handleAutoSave = async (fieldName, valueOverride = null) => {
    if (isNew || !enableAutoSave || !giraId) return;

    const value = valueOverride !== null ? valueOverride : formData[fieldName];
    setSavingField(fieldName);
    setGlobalSaving(true);

    try {
      const { error } = await supabase
        .from("programas")
        .update({ [fieldName]: value })
        .eq("id", giraId);

      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error auto-guardando:", err);
    } finally {
      setTimeout(() => {
        setSavingField(null);
        setGlobalSaving(false);
      }, 500);
    }
  };

  const toggleSource = async (tipo, value, label) => {
    const isId = tipo !== "FAMILIA";
    const exists = selectedSources.some(
      (s) =>
        s.tipo === tipo &&
        (isId ? s.valor_id === value : s.valor_texto === value)
    );

    if (exists) {
      setSelectedSources((prev) =>
        prev.filter(
          (s) =>
            !(
              s.tipo === tipo &&
              (isId ? s.valor_id === value : s.valor_texto === value)
            )
        )
      );
    } else {
      const cleanLabel = label.replace("★ ", "");
      const newItem = {
        tipo,
        label: cleanLabel,
        valor_id: isId ? value : null,
        valor_texto: !isId ? value : null,
      };
      setSelectedSources((prev) => [...prev, newItem]);
    }

    if (!isNew && enableAutoSave) {
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
      } catch (error) {
        console.error("Error guardando fuente:", error);
      } finally {
        setGlobalSaving(false);
      }
    }
  };

  const handleSelectStaff = async (idInt) => {
    const person = allIntegrantes.find((i) => i.value === idInt);
    if (!person) return;
    const exists = selectedStaff.some(
      (s) => s.id_integrante === idInt && s.rol === staffRole
    );
    if (exists) return;
    setSelectedStaff([...selectedStaff, { id_integrante: idInt, rol: staffRole, label: person.label }]);
    if (!isNew && enableAutoSave) {
        setGlobalSaving(true);
        await supabase.from("giras_integrantes").insert([{ id_gira: giraId, id_integrante: idInt, rol: staffRole, estado: "confirmado" }]);
        setGlobalSaving(false);
    }
  };

  const removeStaff = async (index) => {
    const staffToRemove = selectedStaff[index];
    const newStaff = [...selectedStaff];
    newStaff.splice(index, 1);
    setSelectedStaff(newStaff);
    if (!isNew && enableAutoSave && staffToRemove) {
        setGlobalSaving(true);
        await supabase.from("giras_integrantes").delete().eq("id_gira", giraId).eq("id_integrante", staffToRemove.id_integrante).eq("rol", staffToRemove.rol);
        setGlobalSaving(false);
    }
  };

  const handleLocationChange = async (newSet) => {
    const added = [...newSet].filter((x) => !selectedLocations.has(x));
    const removed = [...selectedLocations].filter((x) => !newSet.has(x));
    setSelectedLocations(newSet);
    if (!isNew && enableAutoSave) {
        setGlobalSaving(true);
        if (added.length) await supabase.from("giras_localidades").insert(added.map(lid => ({ id_gira: giraId, id_localidad: lid })));
        if (removed.length) await supabase.from("giras_localidades").delete().eq("id_gira", giraId).in("id_localidad", removed);
        setGlobalSaving(false);
    }
  };

  const removeLocation = async (locId) => {
    const newLocs = new Set(selectedLocations);
    newLocs.delete(locId);
    setSelectedLocations(newLocs);
    if (!isNew && enableAutoSave) {
        setGlobalSaving(true);
        await supabase.from("giras_localidades").delete().eq("id_gira", giraId).eq("id_localidad", locId);
        setGlobalSaving(false);
    }
  };

  const handleCreateGuest = (searchText) => {
    const parts = searchText.trim().split(" ");
    setTempName({ nombre: parts[0] || "", apellido: parts.slice(1).join(" ") || "" });
    setIsCreatingDetailed(true);
  };

  const handleDetailedSave = async (newMusician) => {
    if (!isNew && giraId) {
        setGlobalSaving(true);
        await supabase.from("giras_integrantes").insert([{ id_gira: giraId, id_integrante: newMusician.id, rol: staffRole, estado: "confirmado" }]);
        setGlobalSaving(false);
    }
    setSelectedStaff(prev => [...prev, { id_integrante: newMusician.id, rol: staffRole, label: `${newMusician.apellido}, ${newMusician.nombre}` }]);
    setIsCreatingDetailed(false);
  };

  const togglePublicLink = async () => {
    const newToken = formData.token_publico ? null : self.crypto.randomUUID();
    setFormData(prev => ({ ...prev, token_publico: newToken }));
    if (enableAutoSave) await handleAutoSave("token_publico", newToken);
  };
  const regenerateLink = async () => {
    if (!confirm("Se invalidará el enlace anterior. ¿Seguir?")) return;
    const newToken = self.crypto.randomUUID();
    setFormData(prev => ({ ...prev, token_publico: newToken }));
    if (enableAutoSave) await handleAutoSave("token_publico", newToken);
  };
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${formData.token_publico}`);
    alert("Copiado");
  };
  const generateNumericId = () => Math.floor(10000000 + Math.random() * 90000000);
  const handleShiftProgram = async () => { alert("En desarrollo"); setIsShifting(false); };

  return (
    <div
      className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 relative ${
        isNew
          ? "bg-fixed-indigo-50 border-fixed-indigo-200"
          : "bg-white ring-2 ring-fixed-indigo-500 border-fixed-indigo-500 z-10"
      }`}
    >
      {/* INDICADOR GLOBAL DE GUARDADO */}
      {!isNew && enableAutoSave && (
        <div
          className={`absolute top-2 right-14 flex items-center gap-2 text-[10px] font-bold uppercase transition-opacity duration-300 ${
            globalSaving
              ? "opacity-100 text-fixed-indigo-600"
              : "opacity-0 text-slate-400"
          }`}
        >
          <IconCloud size={12} /> {globalSaving ? "Guardando..." : "Guardado"}
        </div>
      )}

      <div className="flex justify-between items-center mb-4 border-b border-fixed-indigo-100 pb-2">
        <h3 className="text-fixed-indigo-900 font-bold flex items-center gap-2">
          {isNew ? (
            <>
              {" "}
              <IconPlus size={18} /> {isCoordinator ? "Nuevo Programa de Ensamble" : "Nuevo Programa"}{" "}
            </>
          ) : (
            <>
              {" "}
              <IconEdit size={18} /> Configuración de Gira{" "}
            </>
          )}
        </h3>
        {!isNew && !isShifting && (
          <button
            onClick={() => setIsShifting(true)}
            className="text-xs bg-fixed-indigo-50 text-fixed-indigo-700 px-3 py-1 rounded-full border border-fixed-indigo-100 hover:bg-fixed-indigo-100 flex items-center gap-1 transition-colors"
          >
            <IconCalendar size={14} /> Trasladar Gira
          </button>
        )}
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
        <div className="md:col-span-8 flex gap-4">
          <div className="flex-1 relative">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
              Nombre Interno (Obligatorio)
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-fixed-indigo-500 outline-none bg-white font-medium text-lg"
              value={formData.nombre_gira}
              onChange={(e) =>
                setFormData({ ...formData, nombre_gira: e.target.value })
              }
              onBlur={() => handleAutoSave("nombre_gira")}
            />
            <div className="absolute right-2 top-8">
              <StatusIndicator field="nombre_gira" />
            </div>
          </div>
          <div className="w-1/3 relative">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
              Subtítulo
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-fixed-indigo-500 outline-none bg-white text-sm"
              placeholder="Ej. Ciclo 2025"
              value={formData.subtitulo || ""}
              onChange={(e) =>
                setFormData({ ...formData, subtitulo: e.target.value })
              }
              onBlur={() => handleAutoSave("subtitulo")}
            />
            <div className="absolute right-2 top-8">
              <StatusIndicator field="subtitulo" />
            </div>
          </div>
        </div>
        <div className="md:col-span-4 relative">
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
            Tipo de Programa
          </label>
          <select
            className={`w-full border border-slate-300 p-2 rounded bg-white h-[46px] ${isCoordinator ? 'opacity-80 bg-slate-100 cursor-not-allowed font-medium text-slate-600' : ''}`}
            value={formData.tipo || "Sinfónico"}
            disabled={isCoordinator}
            onChange={(e) => {
              setFormData({ ...formData, tipo: e.target.value });
              handleAutoSave("tipo", e.target.value);
            }}
          >
            <option value="Sinfónico">Sinfónico</option>
            <option value="Camerata Filarmónica">Camerata Filarmónica</option>
            <option value="Ensamble">Ensamble</option>
            <option value="Jazz Band">Jazz Band</option>
            <option value="Comisión">Comisión</option>
          </select>
          {!isCoordinator && (
            <div className="absolute right-8 top-8">
              <StatusIndicator field="tipo" />
            </div>
          )}
        </div>

        <div className="md:col-span-3">
          <DateInput
            label="Fecha Inicio"
            value={formData.fecha_desde}
            onChange={(val) => {
              setFormData({ ...formData, fecha_desde: val });
              handleAutoSave("fecha_desde", val);
            }}
          />
        </div>
        <div className="md:col-span-3">
          <DateInput
            label="Fecha Fin"
            value={formData.fecha_hasta}
            onChange={(val) => {
              setFormData({ ...formData, fecha_hasta: val });
              handleAutoSave("fecha_hasta", val);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 uppercase">
            Estado
          </label>
          <div className="relative">
            <select
              value={formData.estado || "Borrador"}
              onChange={(e) => {
                const newVal = e.target.value;
                setFormData({ ...formData, estado: newVal });
                handleAutoSave("estado", newVal);
              }}
              className={`w-full p-2 pl-9 rounded-lg border appearance-none outline-none font-medium focus:ring-2 focus:ring-fixed-indigo-500 ${
                formData.estado === "Vigente"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : formData.estado === "Pausada"
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <option value="Borrador">📝 Borrador</option>
              <option value="Vigente">✅ Vigente</option>
              <option value="Pausada">⏸️ Pausada</option>
            </select>
            <IconSettings
              size={16}
              className="absolute left-3 top-3 text-slate-400 pointer-events-none"
            />
            <div className="absolute right-8 top-3">
              <StatusIndicator field="estado" />
            </div>
          </div>
        </div>
        <div className="md:col-span-6 relative">
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
            Zona
          </label>
          <input
            type="text"
            className="w-full border border-slate-300 p-2 rounded bg-white"
            value={formData.zona || ""}
            onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
            onBlur={() => handleAutoSave("zona")}
          />
          <div className="absolute right-2 top-8">
            <StatusIndicator field="zona" />
          </div>
        </div>
        <div className="md:col-span-12 pt-2 border-t border-slate-100 mt-2">
          <LocationMultiSelect
            locations={locationsList}
            selectedIds={selectedLocations}
            onChange={handleLocationChange}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {Array.from(selectedLocations).map((locId) => {
              const locName = locationsList.find(
                (l) => l.id === locId
              )?.localidad;
              if (!locName) return null;
              return (
                <span
                  key={locId}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-fixed-indigo-50 text-fixed-indigo-700 border border-fixed-indigo-100 rounded text-xs font-bold uppercase animate-in zoom-in-95"
                >
                  {locName}
                  <button
                    onClick={() => removeLocation(locId)}
                    className="hover:text-red-500 rounded-full p-0.5"
                  >
                    <IconX size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN DE CONCIERTOS (SOLO VISIBLE SI NO ES NUEVO) */}
      {!isNew && (
        <div className="mt-6 pt-4 border-t border-fixed-indigo-100">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-pink-700 flex items-center gap-2">
                    <IconMusic size={16} /> Conciertos y Funciones
                </h4>
                <button
                    onClick={() => { setEditingConcert(null); setShowConcertModal(true); }}
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
                    {concerts.map(c => (
                        <div key={c.id} 
                             onClick={() => { setEditingConcert(c); setShowConcertModal(true); }}
                             className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:border-pink-300 hover:shadow-sm cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-pink-50 text-pink-700 w-10 h-10 rounded flex flex-col items-center justify-center border border-pink-100 shrink-0">
                                    <span className="text-[10px] font-bold uppercase leading-none">{new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-AR', {weekday: 'short'})}</span>
                                    <span className="text-lg font-bold leading-none">{new Date(c.fecha + 'T00:00:00').getDate()}</span>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-700">{c.descripcion}</div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <IconClock size={10} /> {c.hora_inicio?.slice(0,5)} hs
                                        <span className="text-slate-300">|</span>
                                        <IconMapPin size={10} /> {c.locaciones?.nombre || "Sin Sala"}
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
          <div className="grid grid-cols-3 gap-2">
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
                        .map((s) => s.valor_id)
                    )
                }
                onToggle={(val, lbl) => toggleSource("ENSAMBLE", val, lbl)}
                />
                {!isSaveDisabled && isCoordinator && (
                    <div className="absolute top-full left-0 mt-1 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-100 animate-pulse hidden">
                        * Requerido
                    </div>
                )}
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
                    .map((s) => s.valor_texto)
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
                    .map((s) => s.valor_id)
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
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase border animate-in zoom-in-95 shadow-sm bg-white ${
                    s.tipo === "EXCL_ENSAMBLE"
                      ? "border-red-200 text-red-700"
                      : s.tipo === "FAMILIA"
                      ? "border-fixed-indigo-200 text-fixed-indigo-700"
                      : "border-emerald-200 text-emerald-700"
                  }`}
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
            <div className="flex gap-2">
              <select
                className="w-1/3 border border-slate-300 p-1.5 rounded text-xs outline-none bg-white font-bold text-fuchsia-800"
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
              >
                <option value="director">Director</option>
                <option value="solista">Solista</option>
              </select>
              <StaffSearchInput
                options={allIntegrantes}
                onSelect={handleSelectStaff}
                onCreateNew={handleCreateGuest}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-1 content-start min-h-[20px]">
              {selectedStaff.map((s, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border shadow-sm animate-in zoom-in-95 bg-white ${
                    s.rol === "Director"
                      ? "text-purple-700 border-purple-200"
                      : "text-fuchsia-700 border-fuchsia-200"
                  }`}
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
          className={`mt-6 p-6 rounded-xl shadow-sm border transition-colors ${
            formData.token_publico
              ? "bg-fixed-indigo-50/50 border-fixed-indigo-200"
              : "bg-slate-50 border-slate-200"
          }`}
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
                />
                Enlace de Invitado General
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Permite ver la agenda y detalles de esta gira a cualquier
                persona con el enlace.
              </p>
            </div>
            <button
              onClick={togglePublicLink}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                formData.token_publico ? "bg-fixed-indigo-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.token_publico ? "translate-x-6" : "translate-x-1"
                }`}
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
        
        {isSaveDisabled && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded font-bold animate-pulse">
                ⚠️ Debes seleccionar un tipo 'Ensamble' y al menos uno de tus ensambles coordinados
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
                        alert("No se puede guardar: Debes seleccionar un tipo 'Ensamble' y al menos uno de tus ensambles coordinados");
                        return;
                    }
                    onSave(e);
                }}
                disabled={isSaveDisabled}
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
                {loading ? "Procesando..." : isNew ? "Crear Programa" : "Guardar Todo"}
            </button>
            )}
        </div>
      </div>

      {/* MODAL DETALLADO DE MÚSICO */}
      {isCreatingDetailed && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200">
            <MusicianForm
              supabase={supabase}
              musician={{
                id: generateNumericId(),
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
            onSuccess={() => { setShowConcertModal(false); fetchConcerts(); }}
            locationsList={allLocationsForConcerts}
        />
      )}
    </div>
  );
}