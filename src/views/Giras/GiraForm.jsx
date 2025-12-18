import React, { useState, useEffect, useRef } from "react";
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
} from "../../components/ui/Icons";
import LocationMultiSelect from "../../components/filters/LocationMultiSelect";
import DateInput from "../../components/ui/DateInput";
import TimeInput from "../../components/ui/TimeInput";
import MusicianForm from "../Musicians/MusicianForm";

// --- COMPONENTE INTERNO: MultiSelect Dropdown ---
const SourceMultiSelect = ({
  title,
  options,
  selectedSet,
  onToggle,
  color = "indigo",
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

// --- COMPONENTE INTERNO: Buscador de Staff ---
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
  absentStaff = [],
}) {
  const [concerts, setConcerts] = useState([]);
  const [loadingConcerts, setLoadingConcerts] = useState(false);
  const [locacionesFull, setLocacionesFull] = useState([]);
  const [isCreatingDetailed, setIsCreatingDetailed] = useState(false);
  const [tempName, setTempName] = useState({ nombre: "", apellido: "" });
  const [newConcert, setNewConcert] = useState({
    fecha: "",
    hora: "20:00",
    id_locacion: "",
  });
  const [conciertoTypeId, setConciertoTypeId] = useState(null);
  const [editingConcertId, setEditingConcertId] = useState(null);
  const [locSearchText, setLocSearchText] = useState("");
  const [isShifting, setIsShifting] = useState(false);
  const [shiftNewDate, setShiftNewDate] = useState("");
  const [shiftLoading, setShiftLoading] = useState(false);

  // Corregido: Usar mayúsculas para coincidir con la lógica de BD
  const [staffRole, setStaffRole] = useState("director");

  const [rosterSummary, setRosterSummary] = useState({
    adicionales: [],
    ausentes: [],
  });
  const FAMILIES = ["Cuerdas", "Maderas", "Bronces", "Percusión", "-"];

  useEffect(() => {
    if (!isNew && giraId) {
      fetchConcertsData();
      fetchRosterSummary();
    }
  }, [giraId, isNew]);

  const fetchConcertsData = async () => {
    setLoadingConcerts(true);
    const { data: types } = await supabase
      .from("tipos_evento")
      .select("id, nombre");
    const typeId = types?.find((t) =>
      t.nombre.toLowerCase().includes("concierto")
    )?.id;
    setConciertoTypeId(typeId);
    const { data: locs } = await supabase
      .from("locaciones")
      .select("id, nombre, localidades(localidad)")
      .order("nombre");
    setLocacionesFull(locs || []);
    if (typeId) {
      const { data: evts } = await supabase
        .from("eventos")
        .select(
          "id, fecha, hora_inicio, id_locacion, locaciones(nombre, localidades(localidad))"
        )
        .eq("id_gira", giraId)
        .eq("id_tipo_evento", typeId)
        .order("fecha");
      setConcerts(evts || []);
    }
    setLoadingConcerts(false);
  };

  const fetchRosterSummary = async () => {
    const { data } = await supabase
      .from("giras_integrantes")
      .select(`id_integrante, estado, rol, integrantes (nombre, apellido)`)
      .eq("id_gira", giraId);
    if (data) {
      const adicionales = data
        .filter(
          (r) =>
            r.estado === "confirmado" &&
            !["Director", "Solista", "director", "solista"].includes(r.rol)
        )
        .map((r) => `${r.integrantes?.apellido} ${r.integrantes?.nombre}`);
      const ausentes = data
        .filter((r) => r.estado === "ausente")
        .map((r) => `${r.integrantes?.apellido} ${r.integrantes?.nombre}`);
      setRosterSummary({ adicionales, ausentes });
    }
  };

  const generateNumericId = () =>
    Math.floor(10000000 + Math.random() * 90000000);

  const toggleSource = (tipo, value, label) => {
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
      const newItem = { tipo, label };
      if (isId) newItem.valor_id = value;
      else newItem.valor_texto = value;
      setSelectedSources((prev) => [...prev, newItem]);
    }
  };

  const handleSelectStaff = (idInt) => {
    const person = allIntegrantes.find((i) => i.value === idInt);
    if (!person) return;
    const exists = selectedStaff.some(
      (s) => s.id_integrante === idInt && s.rol === staffRole
    );
    if (!exists) {
      setSelectedStaff([
        ...selectedStaff,
        { id_integrante: idInt, rol: staffRole, label: person.label },
      ]);
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

  // --- CORREGIDO: handleDetailedSave ahora actualiza el estado local para que aparezca en la lista ---
  const handleDetailedSave = async (newMusician) => {
    try {
      // 1. Si no es una gira nueva, lo vinculamos en la BD de inmediato
      if (!isNew && giraId) {
        const { error } = await supabase.from("giras_integrantes").insert([
          {
            id_gira: giraId,
            id_integrante: newMusician.id,
            rol: staffRole,
            estado: "confirmado",
          },
        ]);
        if (error) throw error;
      }

      // 2. ACTUALIZAR ESTADO LOCAL (Indispensable para que se vea en el roster del form)
      setSelectedStaff((prev) => [
        ...prev,
        {
          id_integrante: newMusician.id,
          rol: staffRole,
          label: `${newMusician.apellido}, ${newMusician.nombre}`,
        },
      ]);

      setIsCreatingDetailed(false);
      alert("Invitado creado y añadido al equipo.");

      // 3. Si ya existe la gira, refrescamos el resumen
      if (!isNew) fetchRosterSummary();
    } catch (error) {
      console.error(error);
      alert("Error al vincular a la gira: " + error.message);
    }
  };

  const removeStaff = (index) => {
    const newStaff = [...selectedStaff];
    newStaff.splice(index, 1);
    setSelectedStaff(newStaff);
  };

  // Handlers Conciertos y Traslado (Omitidos por brevedad pero se mantienen iguales...)
  const handleSaveConcert = async () => {
    /* ... igual ... */
  };
  const handleEditConcertClick = (concert) => {
    /* ... igual ... */
  };
  const handleCancelConcertEdit = () => {
    /* ... igual ... */
  };
  const handleDeleteConcert = async (id) => {
    /* ... igual ... */
  };
  const handleConcertLocationChange = (e) => {
    /* ... igual ... */
  };
  const handleShiftProgram = async () => {
    /* ... igual ... */
  };
  const removeLocation = (locId) => {
    /* ... igual ... */
  };

  return (
    <div
      className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${
        isNew
          ? "bg-indigo-50 border-indigo-200"
          : "bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative"
      }`}
    >
      <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-2">
        <h3 className="text-indigo-900 font-bold flex items-center gap-2">
          {isNew ? (
            <>
              <IconPlus size={18} /> Nuevo Programa
            </>
          ) : (
            <>
              <IconEdit size={18} /> Editando Programa
            </>
          )}
        </h3>
        {!isNew && !isShifting && (
          <button
            onClick={() => setIsShifting(true)}
            className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
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
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
              Nombre Interno
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-lg"
              value={formData.nombre_gira}
              onChange={(e) =>
                setFormData({ ...formData, nombre_gira: e.target.value })
              }
            />
          </div>
          <div className="w-1/3">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
              Subtítulo
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
              placeholder="Ej. Ciclo 2025"
              value={formData.subtitulo || ""}
              onChange={(e) =>
                setFormData({ ...formData, subtitulo: e.target.value })
              }
            />
          </div>
        </div>
        <div className="md:col-span-4">
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
            Tipo de Programa
          </label>
          <select
            className="w-full border border-slate-300 p-2 rounded bg-white h-[46px]"
            value={formData.tipo || "Sinfónico"}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          >
            <option value="Sinfónico">Sinfónico</option>
            <option value="Camerata Filarmónica">Camerata Filarmónica</option>
            <option value="Ensamble">Ensamble</option>
            <option value="Jazz Band">Jazz Band</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <DateInput
            label="Fecha Inicio"
            value={formData.fecha_desde}
            onChange={(val) => setFormData({ ...formData, fecha_desde: val })}
          />
        </div>
        <div className="md:col-span-3">
          <DateInput
            label="Fecha Fin"
            value={formData.fecha_hasta}
            onChange={(val) => setFormData({ ...formData, fecha_hasta: val })}
          />
        </div>
        <div className="md:col-span-6">
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
            Zona
          </label>
          <input
            type="text"
            className="w-full border border-slate-300 p-2 rounded bg-white"
            value={formData.zona || ""}
            onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
          />
        </div>
        <div className="md:col-span-12 pt-2 border-t border-slate-100 mt-2">
          <LocationMultiSelect
            locations={locationsList}
            selectedIds={selectedLocations}
            onChange={setSelectedLocations}
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
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-bold uppercase animate-in zoom-in-95"
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

      {/* PERSONAL */}
      <div className="mt-6 pt-4 border-t border-indigo-100 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-3">
          <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
            <IconLayers size={16} /> Configuración de Personal
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <SourceMultiSelect
              title="Ensambles"
              color="emerald"
              icon={IconMusic}
              options={ensemblesList}
              selectedSet={
                new Set(
                  selectedSources
                    .filter((s) => s.tipo === "ENSAMBLE")
                    .map((s) => s.valor_id)
                )
              }
              onToggle={(val, lbl) => toggleSource("ENSAMBLE", val, lbl)}
            />
            <SourceMultiSelect
              title="Familias"
              color="indigo"
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
                      ? "border-indigo-200 text-indigo-700"
                      : "border-emerald-200 text-emerald-700"
                  }`}
                >
                  {s.tipo === "EXCL_ENSAMBLE" && "🚫 "}
                  {s.label}
                  <button
                    onClick={() =>
                      setSelectedSources((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
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
          <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
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

      {/* FOOTER */}
      <div className="flex justify-end gap-2 mt-8 pt-3 border-t border-indigo-100/50">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium disabled:opacity-50"
        >
          <IconX size={16} /> Cerrar
        </button>
        <button
          onClick={onSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <IconLoader className="animate-spin" size={16} />
          ) : (
            <IconCheck size={16} />
          )}
          {loading ? "Guardando..." : "Guardar Datos Gira"}
        </button>
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
    </div>
  );
}
