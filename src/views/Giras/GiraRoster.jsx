import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  IconUsers,
  IconPlus,
  IconX,
  IconTrash,
  IconLoader,
  IconSearch,
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconMusic,
  IconSettingsWheel,
  IconMap,
  IconUserPlus,
  IconPencil,
  IconCopy,
  IconFilter,
  IconArrowRight,
  IconSend,
  IconBell,
} from "../../components/ui/Icons";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import { useRosterDropdownData } from "../../hooks/useRosterDropdownData";
import { DEFAULT_ROL_ID } from "../../utils/giraUtils";
import MusicianForm from "../Musicians/MusicianForm";
import {
  AddVacancyModal,
  SwapVacancyModal,
} from "../../components/giras/VacancyTools";
import RosterTableRow from "../../components/giras/RosterTableRow";
import NotificationQueuePanel from "../../components/giras/NotificationQueuePanel";
import { toast } from "sonner";
import PersonSelectWithCreate from "../../components/filters/PersonSelectWithCreate";
import UniversalExporter from "../../components/ui/UniversalExporter";

// --- CONSTANTES ---
// ROLES_GIRA eliminado en favor de DB
const CONDICIONES = [
  "Estable",
  "Contratado",
  "Refuerzo",
  "Invitado",
  "Becario",
];

// Helper para convertir Hex a RGBA (para fondos suaves)
const hexToRgba = (hex, alpha = 0.1) => {
  if (!hex) return "transparent";
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split("");
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",")},${alpha})`;
  }
  return hex; // Fallback
};

import MultiSelectDropdown from "../../components/ui/MultiSelectDropdown";

const MetricBadge = ({ label, items, colorBase, icon }) => {
  const count = items.length;
  if (count === 0) return null;
  return (
    <div className="relative group cursor-help z-30">
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${colorBase}`}
      >
        {icon}{" "}
        <span>
          {count} {label}
        </span>
      </div>
      <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50 overflow-hidden">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
          Listado de {label}
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {items.map((m) => (
            <div
              key={m.id}
              className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex justify-between"
            >
              <span>
                {m.apellido}, {m.nombre}
              </span>
              <span className="text-[10px] text-slate-400 ml-2 truncate max-w-[60px]">
                {m.instrumentos?.instrumento}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function GiraRoster({
  supabase,
  gira,
  onBack,
  isEditor = true,
  onNotificacionInicialSent,
}) {
  const {
    roster: rawRoster,
    loading: hookLoading,
    sources,
    refreshRoster,
  } = useGiraRoster(supabase, gira);
  const {
    ensemblesList,
    instrumentsList,
    familiesList,
    localitiesList,
    rolesList,
  } = useRosterDropdownData(supabase);
  const [localRoster, setLocalRoster] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);

  const notificacionInicialEnviada = gira?.notificacion_inicial_enviada === true;
  const [sendingInitial, setSendingInitial] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const [notificacionesHabilitadas, setNotificacionesHabilitadas] = useState(
    gira?.notificaciones_habilitadas !== false, // default true
  );
  const [localNotificacionInicialEnviada, setLocalNotificacionInicialEnviada] = useState(
    gira?.notificacion_inicial_enviada === true,
  );

  // Sincronizar estado cuando cambia la gira
  useEffect(() => {
    setNotificacionesHabilitadas(gira?.notificaciones_habilitadas !== false);
    setLocalNotificacionInicialEnviada(gira?.notificacion_inicial_enviada === true);
  }, [gira?.id, gira?.notificaciones_habilitadas, gira?.notificacion_inicial_enviada]);

  // UI States
  const [addMode, setAddMode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [sortBy, setSortBy] = useState("rol");

  // Filtros Múltiples
  const [selectedFilterRoles, setSelectedFilterRoles] = useState(new Set());
  const [selectedFilterConditions, setSelectedFilterConditions] = useState(
    new Set(),
  );
  const [selectedFilterEnsemblesList, setSelectedFilterEnsemblesList] =
    useState(new Set());
  const [selectedFilterLocalities, setSelectedFilterLocalities] =
    useState(new Set());

  // Selección Múltiple (Filas)
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [visibleColumns, setVisibleColumns] = useState({
    telefono: true,
    mail: true,
    alimentacion: false,
    localidad: false,
    ensambles: true,
    genero: false,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef(null);

  const [showOrderMenu, setShowOrderMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const orderMenuRef = useRef(null);
  const filterMenuRef = useRef(null);
  const selectionMenuRef = useRef(null);

  // States Modales
  const [isCreatingDetailed, setIsCreatingDetailed] = useState(false);
  const [tempName, setTempName] = useState({ nombre: "", apellido: "" });
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [editingMusician, setEditingMusician] = useState(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  // Baja con confirmación 5s: ausente o desconvocar. No reordenar ni notificar hasta efectivizar.
  const [pendingBaja, setPendingBaja] = useState(null);
  const [bajaCountdownSeconds, setBajaCountdownSeconds] = useState(0);
  const bajaTimerRef = useRef(null);

  const notificationQueueRef = useRef(null);
  const pendingExitAfterFlushRef = useRef(false);

  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());
  const [selectedExclEnsembles, setSelectedExclEnsembles] = useState(new Set());

  // Localidades disponibles para filtro: residencias de músicos confirmados
  const confirmedLocalityOptions = useMemo(() => {
    if (!rawRoster) return [];
    const map = new Map();
    (rawRoster || []).forEach((m) => {
      if (m.estado_gira !== "confirmado") return;
      const locId =
        m.localidades?.id != null
          ? String(m.localidades.id)
          : m.id_localidad != null
          ? String(m.id_localidad)
          : null;
      const locName = m.localidades?.localidad;
      if (!locId || !locName) return;
      if (!map.has(locId)) map.set(locId, locName);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({
        value,
        label,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rawRoster]);

  const sortedRolesList = useMemo(
    () => [...(rolesList || [])].sort((a, b) => a.id.localeCompare(b.id)),
    [rolesList],
  );

  const sortedEnsemblesList = useMemo(
    () =>
      [...(ensemblesList || [])].sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || "")),
      ),
    [ensemblesList],
  );

  const sortedConditions = useMemo(
    () => [...CONDICIONES].sort((a, b) => a.localeCompare(b)),
    [],
  );

  // --- FILTRADO Y ORDENAMIENTO COMPLETO ---
  useEffect(() => {
    if (rawRoster) {
      let filtered = rawRoster.filter((m) => {
        // Search
        const matchesSearch =
          m.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.instrumentos?.instrumento
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase());

        // Filtros Múltiples
        const matchesRole =
          selectedFilterRoles.size === 0 ||
          selectedFilterRoles.has(m.rol_gira);
        const matchesCondition =
          selectedFilterConditions.size === 0 ||
          selectedFilterConditions.has(m.condicion);

        // Filtro Ensamble
        let matchesEnsemble = true;
        if (selectedFilterEnsemblesList.size > 0) {
          const musicianEnsembleIds =
            m.integrantes_ensambles?.map((ie) => ie.ensambles?.id) || [];
          matchesEnsemble = musicianEnsembleIds.some((id) =>
            selectedFilterEnsemblesList.has(id),
          );
          if (
            musicianEnsembleIds.length === 0 &&
            selectedFilterEnsemblesList.size > 0
          )
            matchesEnsemble = false;
        }

        // Filtro Localidad (residencia)
        let matchesLocality = true;
        if (selectedFilterLocalities.size > 0) {
          const locId =
            m.localidades?.id != null
              ? String(m.localidades.id)
              : m.id_localidad != null
              ? String(m.id_localidad)
              : null;
          matchesLocality =
            locId != null && selectedFilterLocalities.has(String(locId));
        }

        return (
          matchesSearch &&
          matchesRole &&
          matchesCondition &&
          matchesEnsemble &&
          matchesLocality
        );
      });

      // --- ORDENAMIENTO ---
      const sorted = [...filtered].sort((a, b) => {
        // 1. Ausentes siempre al final
        if (a.estado_gira === "ausente" && b.estado_gira !== "ausente")
          return 1;
        if (a.estado_gira !== "ausente" && b.estado_gira === "ausente")
          return -1;

        switch (sortBy) {
          case "localidad": {
            const locA = a.localidades?.localidad || "zzz";
            const locB = b.localidades?.localidad || "zzz";
            return (
              locA.localeCompare(locB) ||
              (a.apellido || "").localeCompare(b.apellido || "")
            );
          }
          case "region": {
            const regA = a.localidades?.regiones?.region || "zzz";
            const regB = b.localidades?.regiones?.region || "zzz";
            if (regA !== regB) return regA.localeCompare(regB);
            return (a.apellido || "").localeCompare(b.apellido || "");
          }
          case "instrumento": {
            const instA = String(a.id_instr || "999");
            const instB = String(b.id_instr || "999");
            if (instA !== instB) return instA.localeCompare(instB);
            return (a.apellido || "").localeCompare(b.apellido || "");
          }
          case "genero": {
            const gA = a.genero || "Z";
            const gB = b.genero || "Z";
            if (gA !== gB) return gA.localeCompare(gB);
            return (a.apellido || "").localeCompare(b.apellido || "");
          }
          case "rol":
          default: {
            // Mapa de prioridades dinámico basado en rolesList
            const roleOrderMap = {};
            rolesList.forEach((r) => {
              roleOrderMap[r.id] = r.orden;
            });

            // Fallback para roles no encontrados o nulos
            const pA =
              roleOrderMap[a.rol_gira] !== undefined
                ? roleOrderMap[a.rol_gira]
                : 999;
            const pB =
              roleOrderMap[b.rol_gira] !== undefined
                ? roleOrderMap[b.rol_gira]
                : 999;

            if (pA !== pB) return pA - pB;
            return (a.apellido || "").localeCompare(b.apellido || "");
          }
        }
      });

      setLocalRoster(sorted);
    }
  }, [
    rawRoster,
    sortBy,
    searchTerm,
    selectedFilterRoles,
    selectedFilterConditions,
    selectedFilterEnsemblesList,
    selectedFilterLocalities,
    rolesList,
  ]);

  useEffect(() => {
    const inclEnsembles = new Set();
    const inclFamilies = new Set();
    const exclEnsembles = new Set();
    sources?.forEach((f) => {
      if (f.tipo === "ENSAMBLE") inclEnsembles.add(f.valor_id);
      if (f.tipo === "FAMILIA") inclFamilies.add(f.valor_texto);
      if (f.tipo === "EXCL_ENSAMBLE") exclEnsembles.add(f.valor_id);
    });
    setSelectedEnsembles(inclEnsembles);
    setSelectedFamilies(inclFamilies);
    setSelectedExclEnsembles(exclEnsembles);
  }, [sources]);

  useEffect(() => {
    if (addMode === "individual" && searchTerm.length > 0)
      searchIndividual(searchTerm);
    else setSearchResults([]);
  }, [searchTerm, addMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(event.target)
      ) {
        setShowColumnMenu(false);
      }
      if (orderMenuRef.current && !orderMenuRef.current.contains(event.target)) {
        setShowOrderMenu(false);
      }
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target)
      ) {
        setShowFilterMenu(false);
      }
      if (
        selectionMenuRef.current &&
        !selectionMenuRef.current.contains(event.target)
      ) {
        setShowSelectionMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bloqueo de navegación: advertir al cerrar pestaña si hay mails pendientes
  useEffect(() => {
    if (pendingNotifications.length === 0) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pendingNotifications.length]);

  const generateNumericId = () =>
    Math.floor(10000000 + Math.random() * 90000000);

  const handleOpenDetailedCreate = () => {
    const parts = searchTerm.trim().split(" ");
    setTempName({
      nombre: parts[0] || "",
      apellido: parts.slice(1).join(" ") || "",
    });
    setIsCreatingDetailed(true);
  };

  // --- SELECCIÓN MÚLTIPLE (EXCLUYENDO AUSENTES) ---
  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set()); // Deseleccionar todo
    } else {
      // Seleccionar solo los NO AUSENTES
      const validIds = localRoster
        .filter((m) => m.estado_gira !== "ausente")
        .map((m) => m.id);
      setSelectedIds(new Set(validIds));
    }
  };

  const handleCopyEmails = () => {
    const emails = localRoster
      .filter((m) => selectedIds.has(m.id) && m.mail)
      .map((m) => m.mail)
      .join(", ");
    if (!emails) return toast.error("No hay correos en la selección.");
    navigator.clipboard
      .writeText(emails)
      .then(() => toast.success("Correos copiados."));
  };

  // --- CRUD GIRA ---
  const handleDeleteVacancy = async (vacancy) => {
    if (!confirm(`¿Eliminar definitivamente la vacante "${vacancy.apellido}"?`))
      return;

    setLoadingAction(true);
    try {
      const { error: linkError } = await supabase
        .from("giras_integrantes")
        .delete()
        .eq("id_gira", gira.id)
        .eq("id_integrante", vacancy.id);

      if (linkError) throw linkError;

      const { error: userError } = await supabase
        .from("integrantes")
        .delete()
        .eq("id", vacancy.id);

      if (userError) console.warn("Nota: FK User error", userError.message);

      refreshRoster();
    } catch (err) {
      toast.error("Error al eliminar vacante: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };
  const handleDetailedSave = async (newMusician) => {
    // newMusician trae los datos reales insertados en la tabla integrantes
    if (!newMusician?.id) return;

    try {
      // Vinculamos el nuevo integrante a la gira actual
      const { error } = await supabase.from("giras_integrantes").insert([
        {
          id_gira: gira.id,
          id_integrante: newMusician.id, // Usamos el ID real de la BD
          rol: "musico", // Rol por defecto
          estado: "confirmado",
        },
      ]);

      if (error) throw error;

      // Cerramos el modal de creación y refrescamos la lista
      setIsCreatingDetailed(false);
      setSearchTerm("");
      await refreshRoster(); // Refresco crítico
      toast.success("Músico creado y añadido a la gira.");
    } catch (error) {
      console.error(error);
      toast.error("Error al vincular: " + error.message);
    }
  };
  // Actualizar roster tras editar
  const handleEditSave = async () => {
    // NO cerramos el modal (setEditingMusician(null)) aquí.
    // Solo refrescamos los datos para que la tabla de fondo se actualice en tiempo real.
    await refreshRoster();
  };
  const handleCloseModal = (dataFinalDelFormulario) => {
    // 1. Cerramos el modal visualmente
    setEditingMusician(null);

    // 2. Si el formulario nos devolvió datos (porque se cerró con la X o botón Cerrar modificado)
    // actualizamos la tabla localmente sin recargar la BD.
    if (dataFinalDelFormulario && dataFinalDelFormulario.id) {
      setLocalRoster((prev) =>
        prev.map((m) =>
          m.id === dataFinalDelFormulario.id
            ? { ...m, ...dataFinalDelFormulario } // Mezclamos los datos nuevos
            : m,
        ),
      );
    }
  };
  const changeRole = async (musician, newRole) => {
    // Optimistic: Aunque la lista es dinámica, el rol es una string (FK o texto)
    setLocalRoster((prev) => {
      // Re-ordenar implicaría lógica compleja optimistic, mejor solo actualizar valor
      return prev.map((m) =>
        m.id === musician.id ? { ...m, rol_gira: newRole } : m,
      );
    });

    await supabase.from("giras_integrantes").upsert(
      {
        id_gira: gira.id,
        id_integrante: musician.id,
        rol: newRole,
        estado: musician.estado_gira,
      },
      { onConflict: "id_gira, id_integrante" },
    );
    refreshRoster();
  };

  const toggleStatus = async (musician) => {
    const newStatus =
      musician.estado_gira === "confirmado" ? "ausente" : "confirmado";
    if (notificacionInicialEnviada && notificacionesHabilitadas && musician.mail) {
      const variant = newStatus === "ausente" ? "AUSENTE" : "ALTA";
      const nombreCompleto = musician.nombre_completo || `${musician.nombre || ""} ${musician.apellido || ""}`.trim();
      const reason = newStatus === "ausente" ? "Se te marcó como ausente" : undefined;
      setPendingNotifications((prev) => [
        ...prev,
        {
          id: `toggle-${musician.id}-${Date.now()}`,
          variant,
          emails: [musician.mail],
          nombres: [nombreCompleto],
          reason,
        },
      ]);
    }
    setLocalRoster((prev) =>
      prev.map((m) =>
        m.id === musician.id ? { ...m, estado_gira: newStatus } : m,
      ),
    );
    // Siempre upsert/update: el registro NUNCA se elimina de giras_integrantes al pasar de Ausente a Presente.
    if (newStatus === "ausente") {
      await supabase.from("giras_integrantes").upsert(
        {
          id_gira: gira.id,
          id_integrante: musician.id,
          estado: newStatus,
          rol: musician.rol_gira,
        },
        { onConflict: "id_gira, id_integrante" },
      );
    } else {
      await supabase.from("giras_integrantes").upsert(
        {
          id_gira: gira.id,
          id_integrante: musician.id,
          estado: "confirmado",
          rol: musician.rol_gira,
        },
        { onConflict: "id_gira, id_integrante" },
      );
    }
    refreshRoster();
  };

  const handleUpdateGroups = async () => {
    setLoadingAction(true);
    const prevRoster = [...localRoster];
    const prevIds = new Set(prevRoster.map((m) => m.id));
    const prevIncludedEnsembles = new Set(
      (sources || []).filter((s) => s.tipo === "ENSAMBLE").map((s) => s.valor_id),
    );
    const prevExclEnsembles = new Set(
      (sources || []).filter((s) => s.tipo === "EXCL_ENSAMBLE").map((s) => s.valor_id),
    );
    await supabase.from("giras_fuentes").delete().eq("id_gira", gira.id);
    const inserts = [];
    selectedEnsembles.forEach((id) =>
      inserts.push({ id_gira: gira.id, tipo: "ENSAMBLE", valor_id: id }),
    );
    selectedFamilies.forEach((fam) =>
      inserts.push({ id_gira: gira.id, tipo: "FAMILIA", valor_texto: fam }),
    );
    selectedExclEnsembles.forEach((id) =>
      inserts.push({ id_gira: gira.id, tipo: "EXCL_ENSAMBLE", valor_id: id }),
    );
    if (inserts.length > 0)
      await supabase.from("giras_fuentes").insert(inserts);
    setAddMode(null);
    const newRoster = await refreshRoster();
    if (notificacionInicialEnviada && notificacionesHabilitadas && Array.isArray(newRoster)) {
      const newIds = new Set(newRoster.map((m) => m.id));
      const added = newRoster.filter(
        (m) =>
          !prevIds.has(m.id) &&
          m.mail &&
          m.estado_gira === "confirmado",
      );
      added.forEach((m) => {
        let reason = "Se te convoca a la gira";
        const musicianEnsembleIds =
          m.integrantes_ensambles?.map((ie) => ie.ensambles?.id).filter(Boolean) || [];
        const matchedEnsemble = [...selectedEnsembles].find((eid) =>
          musicianEnsembleIds.includes(eid),
        );
        if (matchedEnsemble) {
          const ensLabel = ensemblesList.find((e) => e.value === matchedEnsemble)?.label;
          reason = ensLabel ? `Se te convoca con el ensamble ${ensLabel}` : reason;
        } else if (m.instrumentos?.familia && selectedFamilies.has(m.instrumentos.familia)) {
          reason = `Se te convoca con la familia de ${m.instrumentos.familia}`;
        }
        setPendingNotifications((prev) => [
          ...prev,
          {
            id: `alta-groups-${m.id}-${Date.now()}`,
            variant: "ALTA",
            emails: [m.mail],
            nombres: [m.nombre_completo || `${m.apellido || ""}, ${m.nombre || ""}`.trim()],
            reason,
          },
        ]);
      });
      // Notificaciones por exclusión: ensamble destildado (quitado de incluidos) o agregado como EXCL_ENSAMBLE
      const uncheckedEnsembleIds = new Set(
        [...prevIncludedEnsembles].filter((id) => !selectedEnsembles.has(id)),
      );
      const causeEnsembleIds = new Set([
        ...uncheckedEnsembleIds,
        ...selectedExclEnsembles,
      ]);
      const removedIds = [...prevIds].filter((id) => !newIds.has(id));
      removedIds.forEach((removedId) => {
        const member = prevRoster.find((m) => m.id === removedId);
        if (!member?.mail) return;
        const memberEnsembleIds =
          member.integrantes_ensambles?.map((ie) => ie.ensambles?.id).filter(Boolean) || [];
        const excludedEnsembleId = [...causeEnsembleIds].find((eid) =>
          memberEnsembleIds.includes(eid),
        );
        if (!excludedEnsembleId) return;
        const ensLabel = ensemblesList.find((e) => e.value === excludedEnsembleId)?.label;
        const reason = ensLabel ? `Se excluyó al ensamble ${ensLabel}` : "Se te excluyó de la gira";
        setPendingNotifications((prev) => [
          ...prev,
          {
            id: `baja-excl-${removedId}-${Date.now()}`,
            variant: "BAJA",
            emails: [member.mail],
            nombres: [member.nombre_completo || `${member.apellido || ""}, ${member.nombre || ""}`.trim()],
            reason,
          },
        ]);
      });
    }
    setLoadingAction(false);
  };

  const removeSource = async (id, tipo) => {
    if (
      !confirm(
        tipo === "EXCL_ENSAMBLE" ? "¿Quitar exclusión?" : "¿Quitar fuente?",
      )
    )
      return;
    setLoadingAction(true);
    await supabase.from("giras_fuentes").delete().eq("id", id);
    setLoadingAction(false);
    refreshRoster();
  };

  const addManualMusician = async (musicianId, musicianData) => {
    const { error } = await supabase.from("giras_integrantes").insert({
      id_gira: gira.id,
      id_integrante: musicianId,
      estado: "confirmado",
      rol: "musico",
    });
    if (!error) {
      if (notificacionInicialEnviada && notificacionesHabilitadas && musicianData?.mail) {
        const nombreCompleto =
          musicianData.nombre_completo ||
          `${musicianData.apellido || ""}, ${musicianData.nombre || ""}`.trim();
        setPendingNotifications((prev) => [
          ...prev,
          {
            id: `alta-manual-${musicianId}-${Date.now()}`,
            variant: "ALTA",
            emails: [musicianData.mail],
            nombres: [nombreCompleto],
            reason: "Se te convoca individualmente",
          },
        ]);
      }
      setSearchTerm("");
      setSearchResults([]);
      refreshRoster();
    }
  };

  const removeMemberManual = async (id) => {
    if (!confirm("¿Eliminar registro manual?")) return;
    const member = localRoster.find((m) => m.id === id);
    if (notificacionInicialEnviada && notificacionesHabilitadas && member?.mail) {
      setPendingNotifications((prev) => [
        ...prev,
        {
          id: `baja-${id}-${Date.now()}`,
          variant: "BAJA",
          emails: [member.mail],
          nombres: [member.nombre_completo || `${member.nombre || ""} ${member.apellido || ""}`.trim()],
          reason: "Baja de la gira",
        },
      ]);
    }
    const { error } = await supabase
      .from("giras_integrantes")
      .delete()
      .eq("id_integrante", id)
      .eq("id_gira", gira.id);
    if (!error) refreshRoster();
  };

  // --- Baja con ventana 5s (ausente o desconvocar): no reordenar ni notificar hasta efectivizar ---
  const requestBaja = (musician, action) => {
    if (pendingBaja) return;
    setPendingBaja({
      integranteId: musician.id,
      action,
      musician,
      startedAt: Date.now(),
    });
    setBajaCountdownSeconds(5);
  };

  const cancelBaja = () => {
    if (bajaTimerRef.current) clearInterval(bajaTimerRef.current);
    bajaTimerRef.current = null;
    setPendingBaja(null);
    setBajaCountdownSeconds(0);
  };

  const efectivizeBaja = async () => {
    if (!pendingBaja) return;
    const { musician, action } = pendingBaja;
    if (action === "ausente") {
      await supabase.from("giras_integrantes").upsert(
        {
          id_gira: gira.id,
          id_integrante: musician.id,
          estado: "ausente",
          rol: musician.rol_gira,
        },
        { onConflict: "id_gira, id_integrante" },
      );
      if (notificacionInicialEnviada && notificacionesHabilitadas && musician.mail) {
        const nombreCompleto = musician.nombre_completo || `${musician.nombre || ""} ${musician.apellido || ""}`.trim();
        setPendingNotifications((prev) => [
          ...prev,
          {
            id: `toggle-${musician.id}-${Date.now()}`,
            variant: "AUSENTE",
            emails: [musician.mail],
            nombres: [nombreCompleto],
            reason: "Se te marcó como ausente",
          },
        ]);
      }
    } else {
      if (notificacionInicialEnviada && notificacionesHabilitadas && musician.mail) {
        setPendingNotifications((prev) => [
          ...prev,
          {
            id: `baja-${musician.id}-${Date.now()}`,
            variant: "BAJA",
            emails: [musician.mail],
            nombres: [musician.nombre_completo || `${musician.nombre || ""} ${musician.apellido || ""}`.trim()],
            reason: "Baja de la gira",
          },
        ]);
      }
      await supabase
        .from("giras_integrantes")
        .delete()
        .eq("id_integrante", musician.id)
        .eq("id_gira", gira.id);
    }
    if (bajaTimerRef.current) clearInterval(bajaTimerRef.current);
    bajaTimerRef.current = null;
    setPendingBaja(null);
    setBajaCountdownSeconds(0);
    await refreshRoster();
  };

  useEffect(() => {
    if (!pendingBaja) return;
    const startedAt = pendingBaja.startedAt;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, 5 - elapsed);
      setBajaCountdownSeconds(left);
      if (left <= 0) {
        if (bajaTimerRef.current) clearInterval(bajaTimerRef.current);
        bajaTimerRef.current = null;
        efectivizeBaja();
      }
    };
    tick();
    bajaTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (bajaTimerRef.current) clearInterval(bajaTimerRef.current);
    };
  }, [pendingBaja?.integranteId, pendingBaja?.action]);

  useEffect(() => {
    if (!pendingBaja) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingBaja]);

  const sendNotificacionInicial = async () => {
    const confirmados = localRoster.filter(
      (m) => m.estado_gira === "confirmado" && m.mail,
    );
    if (confirmados.length === 0) {
      toast.warning("No hay integrantes confirmados con email para notificar.");
      return;
    }
    setSendingInitial(true);
    const toastId = toast.loading("Enviando notificación inicial...");
    try {
      const linkRepertorio = `${window.location.origin}${window.location.pathname}?tab=giras&view=REPERTOIRE&giraId=${gira.id}`;
      const bcc = confirmados.map((m) => m.mail);
      const { error } = await supabase.functions.invoke("mails_produccion", {
        body: {
          action: "enviar_mail",
          templateId: "convocatoria_gira",
          bcc,
          nombre: confirmados[0]?.nombre_completo || "Participante",
          gira: gira.nombre_gira,
          detalle: {
            variant: "INITIAL_BROADCAST",
            link_repertorio: linkRepertorio,
            nomenclador: gira.nomenclador || gira.nombre_gira,
            fecha_desde: gira.fecha_desde || "",
            fecha_hasta: gira.fecha_hasta || "",
            zona: gira.zona || "",
          },
        },
      });
      if (error) throw error;

      await supabase
        .from("programas")
        .update({ notificacion_inicial_enviada: true })
        .eq("id", gira.id);

      await supabase.from("giras_notificaciones_logs").insert({
        id_gira: gira.id,
        tipo_notificacion: "INITIAL_BROADCAST",
      });

      setLocalNotificacionInicialEnviada(true);
      onNotificacionInicialSent?.();
      toast.success(
        `Notificación inicial enviada a ${bcc.length} integrante(s).`,
        { id: toastId },
      );
      refreshRoster();
    } catch (err) {
      console.error(err);
      const msg = err?.message || "";
      const isFetchError =
        msg.includes("Failed to send") ||
        msg.includes("fetch") ||
        msg.includes("NetworkError");
      const userMsg = isFetchError
        ? "No se pudo conectar con el servidor de correos. Revisá tu conexión o que las Edge Functions estén desplegadas en Supabase."
        : "Error al enviar notificación inicial: " + msg;
      toast.error(userMsg, { id: toastId });
    } finally {
      setSendingInitial(false);
    }
  };

  const bypassNotificaciones = async () => {
    const toastConfirmId = toast.custom(
      (t) => (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-4 min-w-[320px] max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <IconBell size={20} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 mb-1">
                Desactivar notificaciones
              </h3>
              <p className="text-sm text-slate-600">
                ¿Confirmas que esta gira no requiere envío de mails? Se
                desactivarán las notificaciones automáticas para este programa.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t);
                setSendingInitial(true);
                const toastId = toast.loading("Desactivando notificaciones...");
    try {
      // Actualizar ambos campos en una sola llamada para consistencia
      const { error } = await supabase
        .from("programas")
        .update({
          notificacion_inicial_enviada: true,
          notificaciones_habilitadas: false,
        })
        .eq("id", gira.id);

      if (error) throw error;

      // Actualizar estado local inmediatamente
      setLocalNotificacionInicialEnviada(true);
      setNotificacionesHabilitadas(false);
      // Limpiar cualquier notificación pendiente
      setPendingNotifications([]);

                toast.success("Notificaciones desactivadas para esta gira.", {
                  id: toastId,
                });
                onNotificacionInicialSent?.();
                refreshRoster();
              } catch (err) {
                console.error(err);
                toast.error("Error al desactivar notificaciones: " + err.message, {
                  id: toastId,
                });
              } finally {
                setSendingInitial(false);
              }
            }}
              className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      },
    );
  };

  const handleLiberarPlaza = async (integrante) => {
    if (
      !confirm(`¿Liberar plaza de ${integrante.nombre}? Se creará una vacante.`)
    )
      return;
    setLoadingAction(true);
    try {
      const { error } = await supabase.rpc("liberar_plaza_generar_vacante", {
        p_id_gira: gira.id,
        p_id_integrante_real: integrante.id,
      });
      if (error) throw error;
      toast.success("Plaza liberada.");
      refreshRoster();
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const searchIndividual = async (term) => {
    const cleanTerm = term.trim();
    let query = supabase
      .from("integrantes")
      .select("id, nombre, apellido, mail, instrumentos(instrumento), cuil");
    if (cleanTerm.includes(" ")) {
      const parts = cleanTerm.split(" ");
      query = query
        .ilike("nombre", `%${parts[0]}%`)
        .ilike("apellido", `%${parts.slice(1).join(" ")}%`);
    } else {
      query = query.or(
        `nombre.ilike.%${cleanTerm}%,apellido.ilike.%${cleanTerm}%`,
      );
    }
    const { data } = await query.limit(30);
    const currentIds = new Set(localRoster.map((r) => r.id));
    const withFlag = (data || []).map((m) => ({
      ...m,
      isAlreadyInTour: currentIds.has(m.id),
    }));
    setSearchResults(withFlag);
  };

  const copyGuestLink = async (integrante) => {
    // 1. Primero verificamos si ya tiene token en la tabla de accesos
    try {
      let token = null;

      // Consultar si existe
      const { data: existingAccess, error: fetchError } = await supabase
        .from("giras_accesos")
        .select("token")
        .eq("id_gira", gira.id)
        .eq("id_integrante", integrante.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingAccess) {
        token = existingAccess.token;
      } else {
        // Si no existe, confirmar creación
        if (!confirm(`¿Generar enlace privado para ${integrante.nombre}?`))
          return;

        // Crear nuevo registro en giras_accesos (NO TOCAMOS giras_integrantes)
        const { data: newAccess, error: insertError } = await supabase
          .from("giras_accesos")
          .insert({
            id_gira: gira.id,
            id_integrante: integrante.id,
            // El token se genera automático por default en DB, o lo pasamos aquí si preferimos
          })
          .select("token")
          .single();

        if (insertError) throw insertError;
        token = newAccess.token;
        toast.success("Enlace generado correctamente");
      }

      // 2. Copiar al portapapeles
      const url = `${window.location.origin}/share/${token}`;
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success(`Enlace copiado`))
        .catch(() => prompt("Copia este enlace:", url));
    } catch (err) {
      console.error(err);
      toast.error("Error gestionando enlace: " + err.message);
    }
  };

  const scrollToIntegranteInTable = (integranteId) => {
    const el = document.getElementById(`row-integrante-${integranteId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const toggleColumn = (col) =>
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));

  const sortLabelMap = {
    rol: "Rol",
    localidad: "Localidad",
    region: "Región",
    instrumento: "Instrumento",
    genero: "Género",
  };

  const currentSortLabel = sortLabelMap[sortBy] || "Rol";

  const handleSelectIndividual = async (payload) => {
    if (!payload) return;
    const idInt =
      typeof payload === "object" && payload.id ? payload.id : payload;
    if (!idInt) return;
    const already = localRoster.some((m) => m.id === idInt);
    if (already) {
      scrollToIntegranteInTable(idInt);
      return;
    }
    // Información mínima para notificaciones (sin mail conocido aquí)
    const label =
      typeof payload === "object" && payload.label ? payload.label : "";
    const [apellido, nombre] = label.split(",").map((p) => p.trim());
    await addManualMusician(idInt, {
      id: idInt,
      apellido: apellido || "",
      nombre: nombre || "",
      mail: null,
    });
  };

  // --- OBTENER ESTILOS DE FILA (MODIFICADO PARA DB ROLES) ---
  const getRowStyles = (m, isSelected) => {
    const baseStyle = {
      className: "border-l-4 transition-colors",
      style: {},
    };

    // 1. Estados prioritarios
    if (isSelected) {
      baseStyle.className += " bg-fixed-indigo-50/50 border-l-fixed-indigo-300";
      return baseStyle;
    }

    if (m.estado_gira === "ausente") {
      baseStyle.className +=
        " bg-red-50 text-red-800 opacity-60 grayscale-[50%] border-l-transparent";
      return baseStyle;
    }

    // 2. Sobrescritura de rol "musico" por condición especial (Vacante / Adicional)
    // Asumimos que si no es director, solista etc. (roles especiales), y es vacante, se pinta como vacante.
    // Si el rol es puramente 'musico', las condiciones pesan más.
    if (m.es_simulacion) {
      // Vacante
      baseStyle.className += " bg-amber-100 border-l-amber-400 text-slate-800";
      return baseStyle;
    }

    if (m.es_adicional && m.rol_gira === DEFAULT_ROL_ID) {
      // Adicional (manual) sin rol jerárquico
      baseStyle.className +=
        " bg-orange-100 hover:bg-orange-200 border-l-orange-400";
      return baseStyle;
    }

    // 3. Estilo dinámico basado en DB Roles
    const roleConfig = rolesList.find((r) => r.id === m.rol_gira);
    if (roleConfig && roleConfig.color) {
      baseStyle.style = {
        backgroundColor: hexToRgba(roleConfig.color, 0.15), // Fondo transparente del color
        borderLeftColor: roleConfig.color,
      };
      baseStyle.className += " hover:brightness-95"; // Efecto hover genérico
      return baseStyle;
    }

    // 4. Fallback por condición si no hay color de rol
    switch (m.condicion) {
      case "Estable":
        baseStyle.className += " bg-white hover:bg-slate-50 border-l-slate-200";
        break;
      case "Invitado":
        baseStyle.className +=
          " bg-amber-100 hover:bg-amber-200 border-l-amber-400";
        break;
      case "Refuerzo":
        baseStyle.className +=
          " bg-amber-100 hover:bg-amber-200 border-l-amber-400";
        break;
      default:
        baseStyle.className +=
          " bg-white hover:bg-slate-50 border-l-transparent";
    }

    return baseStyle;
  };

  const listaAusentes = localRoster.filter((r) => r.estado_gira === "ausente");
  const listaAdicionales = localRoster.filter((r) => r.es_adicional);
  const listaConfirmados = localRoster.filter(
    (r) => r.estado_gira === "confirmado",
  );
  const listaVacantes = localRoster.filter((r) => r.es_simulacion);

  const exportColumnsRoster = useMemo(
    () => [
      { header: "Apellido", key: "apellido", width: 22, type: "text", defaultSelected: true },
      { header: "Nombre", key: "nombre", width: 22, type: "text", defaultSelected: true },
      { header: "DNI", key: "dni", width: 18, type: "text", defaultSelected: true },
      { header: "CUIL", key: "cuil", width: 22, type: "text", defaultSelected: true },
      { header: "Legajo", key: "legajo", width: 18, type: "text", defaultSelected: false },
      { header: "Instrumento", key: "instrumento", width: 22, type: "text", defaultSelected: true },
      { header: "Teléfono", key: "telefono", width: 20, type: "text", defaultSelected: true },
      { header: "Email", key: "mail", width: 26, type: "text", defaultSelected: true },
      { header: "Fecha Nac.", key: "fecha_nac", width: 20, type: "date", defaultSelected: false },
      { header: "Nacionalidad", key: "nacionalidad", width: 22, type: "text", defaultSelected: false },
      { header: "Domicilio", key: "domicilio", width: 26, type: "text", defaultSelected: false },
      { header: "Residencia", key: "residencia", width: 26, type: "text", defaultSelected: false },
      { header: "Viáticos (Loc)", key: "viaticos", width: 26, type: "text", defaultSelected: false },
      { header: "Dieta", key: "alimentacion", width: 22, type: "text", defaultSelected: false },
      { header: "Cargo", key: "cargo", width: 22, type: "text", defaultSelected: false },
      { header: "Jornada", key: "jornada", width: 22, type: "text", defaultSelected: false },
      { header: "Motivo", key: "motivo", width: 30, type: "text", defaultSelected: false },
      { header: "Condición", key: "condicion", width: 18, type: "text", defaultSelected: true },
      { header: "Estado Gira", key: "estado_gira", width: 18, type: "text", defaultSelected: true },
    ],
    []
  );

  const exportDataRoster = useMemo(
    () =>
      localRoster.map((m) => ({
        apellido: m.apellido || "",
        nombre: m.nombre || "",
        dni: m.dni || "",
        cuil: m.cuil || "",
        legajo: m.legajo || "",
        instrumento: m.instrumentos?.instrumento || "",
        telefono: m.telefono || "",
        mail: m.mail || "",
        fecha_nac: m.fecha_nac || "",
      nacionalidad: m.nacionalidad || "",
      domicilio: m.domicilio || "",
      residencia: m._loc_residencia?.localidad || "",
      viaticos: m._loc_viaticos?.localidad || "",
      alimentacion: m.alimentacion || "",
      cargo: m.cargo || "",
      jornada: m.jornada || "",
      motivo: m.motivo || "",
        condicion: m.condicion || "",
        estado_gira: m.estado_gira || "",
      })),
    [localRoster]
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 relative z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (pendingBaja) {
                toast.warning(
                  "Hay una baja pendiente. Espera los 5 segundos o cancélala antes de salir.",
                );
                return;
              }
              if (pendingNotifications.length > 0) {
                setShowExitConfirmModal(true);
                return;
              }
              onBack();
            }}
            className="text-slate-400 hover:text-fixed-indigo-600 font-medium text-sm flex items-center gap-1"
          >
            ← Volver
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {gira.nombre_gira}
            </h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {sources.map((s) => (
                <span
                  key={s.id}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${
                    s.tipo === "EXCL_ENSAMBLE"
                      ? "bg-red-50 text-red-700"
                      : "bg-fixed-indigo-50 text-fixed-indigo-700"
                  }`}
                >
                  {s.tipo === "ENSAMBLE" || s.tipo === "EXCL_ENSAMBLE"
                    ? ensemblesList.find((e) => e.value === s.valor_id)?.label
                    : s.valor_texto}
                  <button
                    onClick={() => removeSource(s.id, s.tipo)}
                    className="ml-1 hover:text-black/70"
                  >
                    <IconX size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <MetricBadge
            label="Vacantes"
            items={listaVacantes}
            colorBase="bg-amber-100 text-amber-800 border-amber-300 shadow-sm"
            icon={<IconAlertCircle size={14} />}
          />
          <MetricBadge
            label="Confirmados"
            items={listaConfirmados}
            colorBase="bg-emerald-50 text-emerald-700 border-emerald-100"
            icon={<IconCheck size={14} />}
          />
          <MetricBadge
            label="Ausentes"
            items={listaAusentes}
            colorBase="bg-red-50 text-red-700 border-red-100"
            icon={<IconX size={14} />}
          />
          <MetricBadge
            label="Manuales"
            items={listaAdicionales}
            colorBase="bg-amber-50 text-amber-700 border-amber-100"
            icon={<span className="text-xs">+</span>}
          />
          <UniversalExporter
            data={exportDataRoster}
            columns={exportColumnsRoster}
            fileName={gira?.nomenclador || gira?.nombre_gira || "gira_roster"}
            orientation="l"
          />
        </div>
      </div>

      {/* BANNER NOTIFICACIÓN INICIAL */}
      {!localNotificacionInicialEnviada && (
        <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-800 font-medium flex-1 min-w-0">
            La notificación inicial de esta gira aún no ha sido enviada. Los cambios en la nómina no generarán mails hasta que la envíes.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={sendNotificacionInicial}
              disabled={sendingInitial || listaConfirmados.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-sm transition-colors"
            >
              {sendingInitial ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconSend size={16} />
              )}
              Notificar a todos ahora
            </button>
            <button
              type="button"
              onClick={bypassNotificaciones}
              disabled={sendingInitial}
              className="flex items-center gap-1.5 px-3 py-2 text-amber-700 hover:text-amber-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium underline decoration-amber-400 hover:decoration-amber-600 transition-colors"
              title="Marcar esta gira como que no requiere notificaciones"
            >
              <IconX size={14} />
              No requiere notificaciones
            </button>
          </div>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="px-4 py-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 z-40 relative">
        <div className="flex items-center gap-2 flex-wrap">
          {/* ORDEN */}
          <div className="relative" ref={orderMenuRef}>
            <button
              type="button"
              onClick={() => setShowOrderMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100"
            >
              Orden: {currentSortLabel}
              <IconChevronDown size={12} />
            </button>
            {showOrderMenu && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-50 text-xs">
                {["rol", "localidad", "region", "instrumento", "genero"].map(
                  (crit) => (
                    <button
                      key={crit}
                      type="button"
                      onClick={() => {
                        setSortBy(crit);
                        setShowOrderMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${
                        sortBy === crit ? "font-bold text-fixed-indigo-700" : ""
                      }`}
                    >
                      <span>{sortLabelMap[crit]}</span>
                      {sortBy === crit && (
                        <IconArrowRight size={10} className="rotate-90" />
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {/* FILTROS */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setShowFilterMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold bg-white text-slate-600 hover:bg-slate-50"
            >
              <IconFilter size={12} />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            {showFilterMenu && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-3 space-y-2 text-xs">
                <div className="font-bold text-slate-500 uppercase text-[10px]">
                  Rol
                  {selectedFilterRoles.size > 0 &&
                    ` (${selectedFilterRoles.size})`}
                </div>
                <MultiSelectDropdown
                  compact
                  label=""
                  placeholder="Todos"
                  options={sortedRolesList.map((r) => ({
                    value: r.id,
                    label:
                      r.id.charAt(0).toUpperCase() + r.id.slice(1),
                  }))}
                  value={Array.from(selectedFilterRoles)}
                  onChange={(arr) => setSelectedFilterRoles(new Set(arr))}
                />
                {selectedFilterRoles.size > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sortedRolesList
                      .filter((r) => selectedFilterRoles.has(r.id))
                      .map((r) => (
                        <span
                          key={r.id}
                          className="relative pl-2 pr-4 py-0.5 rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700 border border-indigo-100"
                        >
                          {r.id.charAt(0).toUpperCase() + r.id.slice(1)}
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedFilterRoles);
                              next.delete(r.id);
                              setSelectedFilterRoles(next);
                            }}
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                <div className="font-bold text-slate-500 uppercase text-[10px] mt-2">
                  Condición
                  {selectedFilterConditions.size > 0 &&
                    ` (${selectedFilterConditions.size})`}
                </div>
                <MultiSelectDropdown
                  compact
                  label=""
                  placeholder="Todas"
                  options={sortedConditions.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                  value={Array.from(selectedFilterConditions)}
                  onChange={(arr) =>
                    setSelectedFilterConditions(new Set(arr))
                  }
                />
                {selectedFilterConditions.size > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sortedConditions.filter((c) =>
                      selectedFilterConditions.has(c),
                    ).map((c) => (
                      <span
                        key={c}
                        className="relative pl-2 pr-4 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Set(selectedFilterConditions);
                            next.delete(c);
                            setSelectedFilterConditions(next);
                          }}
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-500 text-white flex items-center justify-center text-[8px]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="font-bold text-slate-500 uppercase text-[10px] mt-2">
                  Ensamble
                  {selectedFilterEnsemblesList.size > 0 &&
                    ` (${selectedFilterEnsemblesList.size})`}
                </div>
                <MultiSelectDropdown
                  compact
                  label=""
                  placeholder="Todos"
                  options={sortedEnsemblesList}
                  value={Array.from(selectedFilterEnsemblesList)}
                  onChange={(arr) =>
                    setSelectedFilterEnsemblesList(new Set(arr))
                  }
                />
                {selectedFilterEnsemblesList.size > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sortedEnsemblesList
                      .filter((e) =>
                        selectedFilterEnsemblesList.has(e.value),
                      )
                      .map((e) => (
                        <span
                          key={e.value}
                          className="relative pl-2 pr-4 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700 border border-emerald-200"
                        >
                          {e.label}
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedFilterEnsemblesList);
                              next.delete(e.value);
                              setSelectedFilterEnsemblesList(next);
                            }}
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                <div className="font-bold text-slate-500 uppercase text-[10px] mt-2">
                  Localidad (residencia)
                  {selectedFilterLocalities.size > 0 &&
                    ` (${selectedFilterLocalities.size})`}
                </div>
                <MultiSelectDropdown
                  compact
                  label=""
                  placeholder="Todas"
                  options={confirmedLocalityOptions}
                  value={Array.from(selectedFilterLocalities)}
                  onChange={(arr) =>
                    setSelectedFilterLocalities(new Set(arr))
                  }
                />
                {selectedFilterLocalities.size > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {confirmedLocalityOptions
                      .filter((l) =>
                        selectedFilterLocalities.has(l.value),
                      )
                      .map((l) => (
                        <span
                          key={l.value}
                          className="relative pl-2 pr-4 py-0.5 rounded-full bg-cyan-50 text-[10px] font-semibold text-cyan-700 border border-cyan-200"
                        >
                          {l.label}
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedFilterLocalities);
                              next.delete(l.value);
                              setSelectedFilterLocalities(next);
                            }}
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[8px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CONVOCAR (Grupos / Individual / Vacante) */}
          <div className="relative" ref={selectionMenuRef}>
            <button
              type="button"
              onClick={() => setShowSelectionMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold bg-white text-slate-600 hover:bg-slate-50"
            >
              <IconUsers size={12} />
              <span className="hidden sm:inline">Convocar</span>
              <IconChevronDown size={12} />
            </button>
            {showSelectionMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-3 text-xs space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Modos de convocatoria
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddMode((prev) => (prev === "groups" ? null : "groups"));
                    setShowSelectionMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 flex items-center justify-between ${
                    addMode === "groups" ? "font-bold text-fixed-indigo-700" : ""
                  }`}
                >
                  <span>Grupos</span>
                  {addMode === "groups" && (
                    <IconArrowRight size={10} className="rotate-90" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMode((prev) =>
                      prev === "individual" ? null : "individual",
                    );
                    setShowSelectionMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 flex items-center justify-between ${
                    addMode === "individual"
                      ? "font-bold text-fixed-indigo-700"
                      : ""
                  }`}
                >
                  <span>Individual</span>
                  {addMode === "individual" && (
                    <IconArrowRight size={10} className="rotate-90" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVacancyModalOpen(true);
                    setShowSelectionMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 flex items-center justify-between text-amber-700"
                >
                  <span>Nueva vacante</span>
                  <IconUserPlus size={12} />
                </button>
              </div>
            )}
          </div>

          {/* BOTÓN COPIAR MAILS (sigue disponible cuando hay selección) */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleCopyEmails}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-fixed-indigo-50 border border-fixed-indigo-200 text-fixed-indigo-700 rounded-lg text-xs font-bold hover:bg-fixed-indigo-100 transition-all"
            >
              <IconCopy size={12} />
              Copiar mails ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Notificaciones Automáticas */}
          <button
            type="button"
            onClick={async () => {
              const newValue = !notificacionesHabilitadas;
              setNotificacionesHabilitadas(newValue);
              // Si se desactiva, limpiar cola de notificaciones pendientes
              if (!newValue) {
                setPendingNotifications([]);
              }
              // Actualizar en BD
              await supabase
                .from("programas")
                .update({ notificaciones_habilitadas: newValue })
                .eq("id", gira.id);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-bold transition-all ${
              notificacionesHabilitadas
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200"
            }`}
            title={
              notificacionesHabilitadas
                ? "Notificaciones automáticas activadas"
                : "Notificaciones automáticas pausadas"
            }
          >
            <IconBell
              size={14}
              className={notificacionesHabilitadas ? "" : "opacity-50"}
            />
            <span className="hidden sm:inline">
              {notificacionesHabilitadas ? "Notif. ON" : "Notif. OFF"}
            </span>
          </button>

          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`flex items-center gap-1 px-3 py-1.5 border rounded text-xs font-bold transition-all ${
                showColumnMenu
                  ? "bg-fixed-indigo-50 border-fixed-indigo-200 text-fixed-indigo-700"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              <IconSettingsWheel size={14} /> Columnas
            </button>
            {showColumnMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2">
                {Object.keys(visibleColumns).map((col) => (
                  <label
                    key={col}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => toggleColumn(col)}
                      className="rounded text-fixed-indigo-600"
                    />
                    <span className="text-xs text-slate-700 capitalize">
                      {col}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTROLES AGREGAR (renderizados sólo cuando hay modo activo) */}
      {(addMode === "groups" || addMode === "individual") && (
        <div className="px-3 py-2 bg-slate-50/50 border-b border-slate-100 flex gap-3 items-start overflow-visible z-20">
          {addMode === "groups" && (
            <div className="flex gap-3 flex-wrap animate-in slide-in-from-left-2 items-start bg-white p-3 rounded border border-slate-200 shadow-sm">
            <div className="w-40">
              <MultiSelectDropdown
                label="Ensambles"
                placeholder="Seleccionar..."
                options={ensemblesList}
                value={Array.from(selectedEnsembles)}
                onChange={(arr) => setSelectedEnsembles(new Set(arr))}
              />
            </div>
            <div className="w-40">
              <MultiSelectDropdown
                label="Familias"
                placeholder="Seleccionar..."
                options={familiesList}
                value={Array.from(selectedFamilies)}
                onChange={(arr) => setSelectedFamilies(new Set(arr))}
              />
            </div>
            <div className="w-40">
              <MultiSelectDropdown
                label="EXCLUIR Ens."
                placeholder="Seleccionar..."
                options={ensemblesList}
                value={Array.from(selectedExclEnsembles)}
                onChange={(arr) => setSelectedExclEnsembles(new Set(arr))}
              />
            </div>
            <button
              onClick={handleUpdateGroups}
              disabled={loadingAction}
              className="mt-5 bg-fixed-indigo-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-fixed-indigo-700 shadow-sm disabled:opacity-50 h-[38px]"
            >
              Actualizar
            </button>
            </div>
          )}
          {addMode === "individual" && (
            <div className="w-72 animate-in slide-in-from-left-2">
              <PersonSelectWithCreate
                supabase={supabase}
                value={null}
                onChange={handleSelectIndividual}
                isMulti={false}
                placeholder="Buscar o crear invitado rápido..."
              />
            </div>
          )}
        </div>
      )}

      {/* TABLA */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 z-10 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
          <table className="w-full min-w-0 text-left text-sm border-collapse table-fixed" style={{ tableLayout: "fixed" }}>
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                {/* CHECKBOX HEADER */}
                <th className="py-2 px-1 md:px-3 w-[10%] md:w-10 text-center bg-slate-50 border-r border-slate-100">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-fixed-indigo-600 focus:ring-fixed-indigo-500 cursor-pointer"
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size ===
                        localRoster.filter((m) => m.estado_gira !== "ausente")
                          .length
                    }
                    ref={(input) => {
                      if (input) {
                        const available = localRoster.filter(
                          (m) => m.estado_gira !== "ausente",
                        ).length;
                        input.indeterminate =
                          selectedIds.size > 0 && selectedIds.size < available;
                      }
                    }}
                    onChange={toggleAll}
                  />
                </th>

                <th className="py-2 px-1 md:px-2 w-[25%] md:w-28 md:max-w-[7rem] border-r border-slate-100">
                  Rol / Instr.
                </th>
                <th className="py-2 px-1 md:px-3 bg-slate-50 border-r border-slate-100 w-[30%] md:w-56 md:max-w-[16rem]">
                  Apellido, Nombre
                </th>
                {visibleColumns.genero && (
                  <th className="hidden md:table-cell py-2 px-3 border-r border-slate-100 w-10 text-center">
                    Gén.
                  </th>
                )}
                {visibleColumns.ensambles && (
                <th className="hidden md:table-cell py-2 px-3 border-r border-slate-100">
                  Ensambles
                </th>
                )}
                {visibleColumns.localidad && (
                  <th className="hidden md:table-cell py-2 px-3 border-r border-slate-100">
                    Ubicación
                  </th>
                )}
                <th className="hidden md:table-cell py-2 px-3 border-r border-slate-100">
                  Contacto
                </th>
                {visibleColumns.alimentacion && (
                  <th className="hidden md:table-cell py-2 px-3 border-r border-slate-100">
                    Alim.
                  </th>
                )}
                <th className="py-2 px-1 md:px-3 text-center w-[15%] md:w-16 border-r border-slate-100">
                  Estado
                </th>
                <th className="py-2 px-1 md:px-3 text-right w-[20%] md:w-10"></th>
              </tr>
            </thead>
            <tbody>
              {localRoster.map((m, idx) => {
                const isSelected = selectedIds.has(m.id);
                const { className: rowClassName, style: rowStyle } =
                  getRowStyles(m, isSelected);
                return (
                  <RosterTableRow
                    key={m.id}
                    musician={m}
                    index={idx}
                    isSelected={isSelected}
                    rowClassName={rowClassName}
                    rowStyle={rowStyle}
                    visibleColumns={visibleColumns}
                    isEditor={isEditor}
                    rolesList={rolesList}
                    defaultRolId={DEFAULT_ROL_ID}
                    onToggleSelection={toggleSelection}
                    onChangeRole={changeRole}
                    onEdit={setEditingMusician}
                    onSwap={setSwapTarget}
                    onDeleteVacancy={handleDeleteVacancy}
                    onToggleStatus={toggleStatus}
                    onRequestBaja={requestBaja}
                    onCancelBaja={cancelBaja}
                    pendingBajaForRow={
                      pendingBaja && pendingBaja.integranteId === m.id
                        ? { action: pendingBaja.action, countdown: bajaCountdownSeconds }
                        : null
                    }
                    onCopyLink={copyGuestLink}
                  />
                );
              })}
              {localRoster.length === 0 && (
                <tr>
                  <td
                    colSpan="10"
                    className="p-8 text-center text-slate-400 italic"
                  >
                    No se encontraron músicos con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t bg-slate-50 text-[10px] text-slate-400 font-medium text-center">
          Mostrando {localRoster.length} de {rawRoster.length} integrantes
        </div>
      </div>

      {/* --- MODALES --- */}
      {/* --- MODAL CREACIÓN (DETALLADO) --- */}
      {isCreatingDetailed &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
          >
            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200">
              <MusicianForm
                supabase={supabase}
                // Pasamos ID null o undefined para que MusicianForm sepa que es nuevo
                musician={{
                  nombre: tempName.nombre,
                  apellido: tempName.apellido,
                  condicion: "Invitado",
                }}
                onSave={handleDetailedSave} // Al guardar/crear, vinculamos a la gira
                onCancel={handleCloseModal} // Al cancelar, cerramos
              />
            </div>
          </div>,
          document.body,
        )}

      {/* --- MODAL EDICIÓN --- */}
      {editingMusician &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
          >
            <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
              <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <IconPencil size={16} className="text-fixed-indigo-600" />
                  Editar {editingMusician.es_simulacion ? "Vacante" : "Músico"}
                </h3>
                <button
                  onClick={handleCloseModal} // Usamos el nuevo handler
                  className="text-slate-400 hover:text-red-500"
                >
                  <IconX size={20} />
                </button>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <MusicianForm
                  supabase={supabase}
                  musician={editingMusician}
                  onSave={handleEditSave} // Solo refresca, no cierra
                  onCancel={handleCloseModal} // Cierra el modal
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
      <AddVacancyModal
        isOpen={isVacancyModalOpen}
        onClose={() => setIsVacancyModalOpen(false)}
        giraId={gira.id}
        supabase={supabase}
        onRefresh={refreshRoster}
        regions={[]}
        localities={localitiesList}
        instruments={instrumentsList}
        giraNomenclador={gira.nomenclador || gira.nombre_gira.substring(0, 5)}
      />
      <SwapVacancyModal
        isOpen={!!swapTarget}
        onClose={() => setSwapTarget(null)}
        placeholder={swapTarget}
        giraId={gira.id}
        supabase={supabase}
        onRefresh={refreshRoster}
      />

      {notificacionInicialEnviada && (
        <NotificationQueuePanel
          ref={notificationQueueRef}
          pendingTasks={pendingNotifications}
          onFlush={() => {
            setPendingNotifications([]);
            if (pendingExitAfterFlushRef.current) {
              pendingExitAfterFlushRef.current = false;
              onBack();
            }
          }}
          onCancelAll={() => setPendingNotifications([])}
          onRemoveTask={(id) =>
            setPendingNotifications((prev) => prev.filter((t) => t.id !== id))
          }
          supabase={supabase}
          gira={{
            nombre_gira: gira.nombre_gira,
            nomenclador: gira.nomenclador,
            fecha_desde: gira.fecha_desde,
            fecha_hasta: gira.fecha_hasta,
            zona: gira.zona,
          }}
          linkRepertorio={`${typeof window !== "undefined" ? window.location.origin : ""}${typeof window !== "undefined" ? window.location.pathname : ""}?tab=giras&view=REPERTOIRE&giraId=${gira.id}`}
        />
      )}

      {/* Modal de confirmación al salir con notificaciones pendientes */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all border border-slate-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
                <IconAlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">
                  Notificaciones pendientes
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Tienes notificaciones de correo pendientes.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  pendingExitAfterFlushRef.current = true;
                  notificationQueueRef.current?.sendAllNow?.();
                  setShowExitConfirmModal(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <IconSend size={18} />
                Enviar todo ahora
              </button>
              <button
                type="button"
                onClick={() => {
                  notificationQueueRef.current?.cancelAll?.();
                  setShowExitConfirmModal(false);
                  onBack();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <IconTrash size={16} />
                Cancelar todos y salir
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Permanecer aquí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
