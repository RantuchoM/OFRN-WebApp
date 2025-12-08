import React, { useState, useEffect, useRef } from "react";
import {
  IconPlus,
  IconAlertCircle,
  IconMap,
  IconEdit,
  IconTrash,
  IconUsers,
  IconLoader,
  IconMapPin,
  IconCalendar,
  IconMusic,
  IconFilter,
  IconClock,
  IconDrive,
  IconHotel,
  IconMoreVertical,
  IconEye,
  IconTruck,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext"; // Importamos el contexto de usuario
import GiraForm from "./GiraForm";
import GiraRoster from "./GiraRoster";
import GiraAgenda from "./GiraAgenda";
import ProgramRepertoire from "./ProgramRepertoire";
import ProgramHoteleria from "./ProgramHoteleria";
import LogisticsManager from "./LogisticsManager";
import { formatSecondsToTime } from "../../utils/time";
import AgendaGeneral from "./AgendaGeneral";
import MusicianCalendar from "./MusicianCalendar";

// --- COMPONENTE MENÚ DE ACCIONES (CORREGIDO) ---
const ActionMenu = ({ onAction, isOpen, setIsOpen, hasDrive, canEdit }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  const handleItemClick = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    onAction(e, action);
  };

  // if (selectedGiraAgenda) ... (resto de tus condicionales)

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-full transition-colors ${
          isOpen
            ? "bg-indigo-100 text-indigo-700"
            : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
        }`}
      >
        <IconMoreVertical size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="p-1 space-y-0.5">
            {hasDrive && (
              <button
                type="button"
                onMouseDown={(e) => handleItemClick(e, "drive")}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
              >
                <IconDrive size={16} /> Abrir Drive
              </button>
            )}
            <button
              type="button"
              onMouseDown={(e) => handleItemClick(e, "agenda")}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
            >
              <IconCalendar size={16} /> Agenda
            </button>
            <button
              type="button"
              onMouseDown={(e) => handleItemClick(e, "repertoire")}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
            >
              <IconMusic size={16} /> Repertorio
            </button>

            {canEdit && (
              <>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "hotel")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconHotel size={16} /> Hotelería
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "logistics")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconTruck size={16} /> Logística
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "roster")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <IconUsers size={16} /> Personal
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "edit")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                >
                  <IconEdit size={16} /> Editar Datos
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => handleItemClick(e, "delete")}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <IconTrash size={16} /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function GirasView({ supabase }) {
  const { user, isEditor } = useAuth();
  const [giras, setGiras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showRepertoire, setShowRepertoire] = useState(false);
  const [showFullAgenda, setShowFullAgenda] = useState(false); // Lista
  const [showCalendar, setShowCalendar] = useState(false); // Calendario (NUEVO)

  // Filtros
  const [filterType, setFilterType] = useState("Todos");
  const today = new Date().toISOString().split("T")[0];
  const [filterDateStart, setFilterDateStart] = useState(today);
  const [filterDateEnd, setFilterDateEnd] = useState("");

  // Navegación y Edición
  const [selectedGira, setSelectedGira] = useState(null);
  const [selectedGiraAgenda, setSelectedGiraAgenda] = useState(null);
  const [selectedGiraRepertoire, setSelectedGiraRepertoire] = useState(null);
  const [selectedGiraHotel, setSelectedGiraHotel] = useState(null);
  const [selectedGiraLogistics, setSelectedGiraLogistics] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    nombre_gira: "",
    fecha_desde: "",
    fecha_hasta: "",
    tipo: "Sinfónico",
    zona: "",
  });
  const [selectedLocations, setSelectedLocations] = useState(new Set());

  const [locationsList, setLocationsList] = useState([]);
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    fetchGiras();
    fetchLocationsList();
    fetchEnsemblesList();
  }, [user.id]);

  const fetchGiras = async () => {
    setLoading(true);
    try {
      // --- CORRECCIÓN: Aceptar ambos roles ---
      const userRole = user?.rol_sistema || "";
      const isPersonal =
        userRole === "consulta_personal" || userRole === "personal";

      // 1. Si es personal, buscar sus ensambles y familia
      let myEnsembles = new Set();
      let myFamily = null;

      if (isPersonal) {
        const { data: me } = await supabase
          .from("integrantes")
          .select(
            "*, instrumentos(familia), integrantes_ensambles(id_ensamble)"
          )
          .eq("id", user.id)
          .single();

        if (me) {
          myFamily = me.instrumentos?.familia;
          me.integrantes_ensambles?.forEach((ie) =>
            myEnsembles.add(ie.id_ensamble)
          );
        }
      }

      // 2. Traer Programas
      const { data, error } = await supabase
        .from("programas")
        .select(
          `
        *, 

        giras_localidades(id_localidad, localidades(localidad)),
        giras_fuentes(*),
        eventos (
            id, fecha, hora_inicio, 
            locaciones(nombre), 
            tipos_evento(nombre)
        ),
        giras_integrantes (
            id_integrante, estado, rol,
            integrantes (nombre, apellido)
        ),
        programas_repertorios (
            id, nombre, orden,
            repertorio_obras (
                id, orden,
                obras (
                    id, titulo, duracion_segundos, estado,
                    compositores (apellido, nombre),
                    obras_compositores (rol, compositores(apellido, nombre))
                )
            )
        )
    `
        )
        .order("fecha_desde", { ascending: true });

      if (error) throw error;

      let result = data || [];

      // 3. Filtro Lógico para Consulta Personal
      if (isPersonal) {
        result = result.filter((gira) => {
          const overrides = gira.giras_integrantes || [];
          const sources = gira.giras_fuentes || [];

          // A) Revisar si estoy explícitamente en la lista (Manual)
          const myOverride = overrides.find((o) => o.id_integrante === user.id);

          // Si estoy como 'ausente', NO la veo
          if (myOverride && myOverride.estado === "ausente") return false;

          // Si estoy explícitamente (y no ausente), la veo
          if (myOverride) return true;

          // B) Si no hay regla explícita, revisar Fuentes (Dinámico)
          // (Si la gira no tiene fuentes, se asume que no hay convocados dinámicos)
          const matchesEnsemble = sources.some(
            (s) => s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)
          );
          const matchesFamily = sources.some(
            (s) => s.tipo === "FAMILIA" && s.valor_texto === myFamily
          );

          return matchesEnsemble || matchesFamily;
        });
      }

      setGiras(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationsList = async () => {
    const { data } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    if (data) setLocationsList(data);
  };
  const fetchEnsemblesList = async () => {
    const { data } = await supabase.from("ensambles").select("id, ensamble");
    if (data) setEnsemblesList(data);
  };

  const updateGiraLocations = async (giraId, locationIds) => {
    await supabase.from("giras_localidades").delete().eq("id_gira", giraId);
    if (locationIds.size > 0) {
      const inserts = Array.from(locationIds).map((locId) => ({
        id_gira: giraId,
        id_localidad: parseInt(locId),
      }));
      await supabase.from("giras_localidades").insert(inserts);
    }
  };

  const triggerDriveSync = async (programId) => {
    setSyncing(true);
    try {
      await supabase.functions.invoke("manage-drive", {
        body: { action: "sync_program", programId: programId },
      });
    } catch (err) {
      console.error("Error invocando función:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nombre_gira) return alert("El nombre es obligatorio");
    setLoading(true);
    try {
      let targetId = editingId;
      if (editingId) {
        const { error } = await supabase
          .from("programas")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("programas")
          .insert([formData])
          .select();
        if (error) throw error;
        if (data && data.length > 0) targetId = data[0].id;
      }

      if (targetId) {
        await updateGiraLocations(targetId, selectedLocations);
        triggerDriveSync(targetId);
      }

      await fetchGiras();
      closeForm();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchGiras();
    closeForm();
  };

  const handleDelete = async (e, id) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Eliminar este programa?")) return;
    setLoading(true);
    await supabase.functions.invoke("manage-drive", {
      body: { action: "delete_program", programId: id },
    });
    const { error } = await supabase.from("programas").delete().eq("id", id);
    if (error) alert("Error: " + error.message);
    else await fetchGiras();
    setLoading(false);
  };

  const startEdit = async (gira) => {
    setEditingId(gira.id);
    setFormData({
      nombre_gira: gira.nombre_gira,
      fecha_desde: gira.fecha_desde || "",
      fecha_hasta: gira.fecha_hasta || "",
      tipo: gira.tipo || "Sinfónico",
      zona: gira.zona || "",
    });
    const { data } = await supabase
      .from("giras_localidades")
      .select("id_localidad")
      .eq("id_gira", gira.id);
    if (data) setSelectedLocations(new Set(data.map((d) => d.id_localidad)));
    else setSelectedLocations(new Set());
    setIsAdding(false);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      nombre_gira: "",
      fecha_desde: "",
      fecha_hasta: "",
      tipo: "Sinfónico",
      zona: "",
    });
    setSelectedLocations(new Set());
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const getProgramLabel = (currentGira) => {
    if (!currentGira.fecha_desde) return currentGira.tipo;
    const currentYear = currentGira.fecha_desde.split("-")[0];
    const sameTypePrograms = giras
      .filter(
        (g) =>
          g.tipo === currentGira.tipo &&
          g.fecha_desde &&
          g.fecha_desde.startsWith(currentYear)
      )
      .sort((a, b) => new Date(a.fecha_desde) - new Date(b.fecha_desde));
    const index = sameTypePrograms.findIndex((g) => g.id === currentGira.id);
    if (index === -1) return currentGira.tipo;
    const number = (index + 1).toString().padStart(2, "0");
    return `${currentGira.tipo} ${number}`;
  };

  const getConcerts = (gira) => {
    if (!gira.eventos) return [];
    return gira.eventos
      .filter((e) =>
        e.tipos_evento?.nombre?.toLowerCase().includes("concierto")
      )
      .sort(
        (a, b) =>
          new Date(a.fecha + "T" + a.hora_inicio) -
          new Date(b.fecha + "T" + b.hora_inicio)
      );
  };

  const getGroupChips = (gira) => {
    if (!gira.giras_fuentes) return [];
    return gira.giras_fuentes.map((fuente) => {
      if (fuente.tipo === "ENSAMBLE") {
        const ens = ensemblesList.find((e) => e.id === fuente.valor_id);
        return ens ? ens.ensamble : "Ensamble";
      }
      return fuente.valor_texto;
    });
  };

  const filteredGiras = giras.filter((g) => {
    if (filterType !== "Todos" && g.tipo !== filterType) return false;
    if (filterDateStart && g.fecha_hasta < filterDateStart) return false;
    if (filterDateEnd && g.fecha_desde > filterDateEnd) return false;
    return true;
  });

  const handleMenuAction = (e, action, gira) => {
    e.stopPropagation();
    setOpenMenuId(null);

    switch (action) {
      case "repertoire":
        setSelectedGiraRepertoire(gira);
        break;
      case "agenda":
        setSelectedGiraAgenda(gira);
        break;
      case "hotel":
        setSelectedGiraHotel(gira);
        break;
      case "roster":
        setSelectedGira(gira);
        break;
      case "logistics":
        setSelectedGiraLogistics(gira);
        break;
      case "drive":
        if (gira.google_drive_folder_id) {
          window.open(
            `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
            "_blank"
          );
        } else {
          alert("Esta gira no tiene carpeta de Drive asociada.");
        }
        break;
      case "edit":
        startEdit(gira);
        break;
      case "delete":
        handleDelete(null, gira.id);
        break;
      default:
        break;
    }
  };
  if (showFullAgenda)
    return (
      <AgendaGeneral
        supabase={supabase}
        onBack={() => setShowFullAgenda(false)}
      />
    );
  // Vista de Calendario (Grilla) - NUEVA
  if (showCalendar) {
    return (
      <MusicianCalendar
        supabase={supabase}
        onBack={() => setShowCalendar(false)}
      />
    );
  }
  if (selectedGiraAgenda)
    return (
      <GiraAgenda
        supabase={supabase}
        gira={selectedGiraAgenda}
        onBack={() => setSelectedGiraAgenda(null)}
      />
    );
  if (selectedGiraRepertoire)
    return (
      <ProgramRepertoire
        supabase={supabase}
        program={selectedGiraRepertoire}
        onBack={() => setSelectedGiraRepertoire(null)}
      />
    );
  if (selectedGira)
    return (
      <GiraRoster
        supabase={supabase}
        gira={selectedGira}
        onBack={() => setSelectedGira(null)}
      />
    );
  if (selectedGiraHotel)
    return (
      <ProgramHoteleria
        supabase={supabase}
        program={selectedGiraHotel}
        onBack={() => setSelectedGiraHotel(null)}
      />
    );
  if (selectedGiraLogistics)
    return (
      <LogisticsManager
        supabase={supabase}
        gira={selectedGiraLogistics}
        onBack={() => setSelectedGiraLogistics(null)}
      />
    );

  return (
    <div className="space-y-6 h-full flex flex-col overflow-hidden animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <IconMap className="text-indigo-600" /> Programas
          </h2>
          {syncing && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1">
              <IconLoader className="animate-spin" size={12} /> Drive...
            </span>
          )}

          <button
            onClick={() => setShowRepertoire(!showRepertoire)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ml-4 ${
              showRepertoire
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <IconEye size={14} />{" "}
            {showRepertoire ? "Ocultar Obras" : "Ver Obras"}
          </button>
          {/* ... dentro del header div ... */}
          <button
            onClick={() => setShowFullAgenda(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          >
            <IconCalendar size={14} /> Agenda Completa
          </button>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
          >
            <IconCalendar size={14} /> Calendario
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <IconCalendar size={14} className="text-slate-400" />
            <input
              type="date"
              className="bg-transparent text-xs text-slate-600 outline-none w-24"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              title="Desde"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              className="bg-transparent text-xs text-slate-600 outline-none w-24"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              title="Hasta"
            />
            {(filterDateStart || filterDateEnd) && (
              <button
                onClick={() => {
                  setFilterDateStart("");
                  setFilterDateEnd("");
                }}
                className="text-slate-400 hover:text-red-500 ml-1"
              >
                <IconTrash size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <IconFilter size={14} className="text-slate-400" />
            <select
              className="bg-transparent text-sm text-slate-600 font-medium outline-none cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Sinfónico">Sinfónico</option>
              <option value="Camerata Filarmónica">Camerata Filarmónica</option>
              <option value="Ensamble">Ensamble</option>
            </select>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
            {filteredGiras.length}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <IconAlertCircle className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-2">
        {/* SOLO MOSTRAR BOTÓN CREAR SI ES EDITOR O ADMIN */}
        {isEditor && !isAdding && !editingId && (
          <button
            onClick={() => {
              setIsAdding(true);
              setFormData({
                nombre_gira: "",
                fecha_desde: "",
                fecha_hasta: "",
                tipo: "Sinfónico",
                zona: "",
              });
              setSelectedLocations(new Set());
            }}
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <IconPlus size={20} /> Crear Nuevo Programa
          </button>
        )}

        {(isAdding || editingId) && (
          <GiraForm
            supabase={supabase}
            giraId={editingId}
            formData={formData}
            setFormData={setFormData}
            onCancel={closeForm}
            onSave={handleSave}
            onRefresh={handleRefresh}
            loading={loading}
            isNew={isAdding}
            locationsList={locationsList}
            selectedLocations={selectedLocations}
            setSelectedLocations={setSelectedLocations}
          />
        )}

        {filteredGiras.map((gira) => {
          if (editingId === gira.id) return null;
          const locs =
            gira.giras_localidades
              ?.map((gl) => gl.localidades?.localidad)
              .filter(Boolean) || [];
          const programLabel = getProgramLabel(gira);
          const concerts = getConcerts(gira);
          const groups = getGroupChips(gira);

          const directors = gira.giras_integrantes
            ?.filter((r) => r.rol === "director" && r.estado !== "ausente")
            .map((r) => `${r.integrantes.nombre} ${r.integrantes.apellido}`)
            .join(", ");
          const soloists = gira.giras_integrantes
            ?.filter((r) => r.rol === "solista" && r.estado !== "ausente")
            .map((r) => `${r.integrantes.nombre} ${r.integrantes.apellido}`)
            .join(", ");
          const hasStaff = directors || soloists;

          const repertorioData = (gira.programas_repertorios || []).sort(
            (a, b) => (a.orden || 0) - (b.orden || 0)
          );

          return (
            <div
              key={gira.id}
              className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group relative"
              style={{ zIndex: openMenuId === gira.id ? 50 : 0 }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 pr-4">
                  <div
                    className="flex flex-wrap items-center gap-3 text-slate-700 cursor-pointer"
                    onClick={() => setSelectedGiraRepertoire(gira)}
                  >
                    <h3 className="text-xl font-bold group-hover:text-indigo-700 transition-colors whitespace-nowrap">
                      {gira.nombre_gira}
                    </h3>

                    <span className="text-slate-300 text-lg hidden sm:inline">
                      |
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold uppercase tracking-wide whitespace-nowrap">
                      {programLabel}
                    </span>

                    {gira.zona && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">
                          |
                        </span>
                        <span className="text-xs text-slate-500 border border-slate-200 bg-slate-50 px-2 py-0.5 rounded uppercase whitespace-nowrap">
                          {gira.zona}
                        </span>
                      </>
                    )}

                    {groups.length > 0 && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">
                          |
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {groups.map((grp, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
                            >
                              {grp}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    <span className="text-slate-300 hidden sm:inline">|</span>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap">
                      <IconCalendar
                        size={14}
                        className="text-slate-400 mb-0.5"
                      />
                      <span>
                        {formatDate(gira.fecha_desde)} -{" "}
                        {formatDate(gira.fecha_hasta)}
                      </span>
                    </div>

                    {locs.length > 0 && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">
                          |
                        </span>
                        <div className="flex items-center gap-1 text-sm text-slate-500 whitespace-nowrap truncate">
                          <IconMapPin
                            size={14}
                            className="text-slate-400 mb-0.5"
                          />
                          <span>{locs.join(", ")}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {hasStaff && (
                    <div className="text-xs text-slate-600 mt-2 mb-1 pl-2 border-l-2 border-indigo-100">
                      {directors && (
                        <span>
                          <span
                            className="font-bold text-indigo-700 uppercase"
                            style={{ fontSize: "10px" }}
                          >
                            Dir:
                          </span>{" "}
                          {directors}
                        </span>
                      )}
                      {directors && soloists && (
                        <span className="mx-2 text-slate-300">|</span>
                      )}
                      {soloists && (
                        <span>
                          <span
                            className="font-bold text-amber-600 uppercase"
                            style={{ fontSize: "10px" }}
                          >
                            Solista/s:
                          </span>{" "}
                          {soloists}
                        </span>
                      )}
                    </div>
                  )}

                  {concerts.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                      {concerts.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100"
                        >
                          <IconMusic size={12} className="text-indigo-400" />
                          <span className="font-bold">
                            {formatDate(c.fecha)}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>{c.hora_inicio?.slice(0, 5)}</span>
                          <span className="text-slate-300">|</span>
                          <span className="truncate max-w-[200px]">
                            {c.locaciones?.nombre || "Sin lugar"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 pt-1">
                  <ActionMenu
                    onAction={(e, action) => handleMenuAction(e, action, gira)}
                    isOpen={openMenuId === gira.id}
                    setIsOpen={(isOpen) =>
                      setOpenMenuId(isOpen ? gira.id : null)
                    }
                    hasDrive={!!gira.google_drive_folder_id}
                    canEdit={isEditor} // Pasamos permiso
                  />
                </div>
              </div>

              {showRepertoire && (
                <div className="mt-4 border-t border-slate-100 pt-3 animate-in fade-in slide-in-from-top-2">
                  {repertorioData.length > 0 ? (
                    <div className="space-y-4">
                      {repertorioData.map((rep) => {
                        const obras = (rep.repertorio_obras || []).sort(
                          (a, b) => (a.orden || 0) - (b.orden || 0)
                        );
                        return (
                          <div key={rep.id}>
                            <h5 className="text-[10px] uppercase font-bold text-slate-400 mb-1 pl-1 tracking-wider">
                              {rep.nombre}
                            </h5>
                            <div className="overflow-x-auto rounded border border-slate-100">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                  <tr>
                                    <th className="p-2 w-10 text-center">#</th>
                                    <th className="p-2">Compositor</th>
                                    <th className="p-2">Obra</th>
                                    <th className="p-2 text-right w-20">
                                      Dur.
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {obras.map((item, idx) => {
                                    const obra = item.obras;
                                    const composers =
                                      obra.obras_compositores?.length > 0
                                        ? obra.obras_compositores
                                            .map(
                                              (oc) =>
                                                `${oc.compositores.apellido}`
                                            )
                                            .join("/")
                                        : obra.compositores?.apellido || "-";

                                    return (
                                      <tr
                                        key={item.id}
                                        className="hover:bg-slate-50"
                                      >
                                        <td className="p-2 text-center text-slate-400">
                                          {idx + 1}
                                        </td>
                                        <td className="p-2 font-medium text-slate-700">
                                          {composers}
                                        </td>
                                        <td className="p-2 text-slate-600">
                                          {obra.titulo}
                                        </td>
                                        <td className="p-2 text-right font-mono text-slate-500">
                                          {formatSecondsToTime(
                                            obra.duracion_segundos
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {obras.length === 0 && (
                                    <tr>
                                      <td
                                        colSpan="4"
                                        className="p-2 text-center text-slate-300 italic"
                                      >
                                        Sin obras
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded border border-dashed border-slate-200">
                      No hay repertorio cargado.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!loading && filteredGiras.length === 0 && (
          <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No hay programas que coincidan con los filtros.
          </div>
        )}
      </div>
    </div>
  );
}
