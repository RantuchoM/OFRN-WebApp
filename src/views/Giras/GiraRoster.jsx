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
  IconMail,
  IconSettingsWheel,
  IconLink,
  IconMap,
  IconUserPlus,
  IconExchange,
  IconUserMinus,
  IconPencil,
  IconWhatsAppFilled,
  IconCopy,
  IconFilter,
  IconArrowRight,
  IconPhone,
} from "../../components/ui/Icons";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import MusicianForm from "../Musicians/MusicianForm";
import {
  AddVacancyModal,
  SwapVacancyModal,
} from "../../components/giras/VacancyTools";
import { toast } from "sonner";

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

// --- HELPER WHATSAPP ---
const WhatsAppLink = ({ phone }) => {
  if (!phone) return null;
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = `549${cleanPhone}`;
  else if (cleanPhone.startsWith("0"))
    cleanPhone = `549${cleanPhone.substring(1)}`;
  const url = `https://wa.me/${cleanPhone}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-100 rounded-full transition-colors ml-1 shrink-0"
      title="Enviar WhatsApp"
      onClick={(e) => e.stopPropagation()}
    >
      <IconWhatsAppFilled size={14} />
    </a>
  );
};

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

const MultiSelectDropdown = ({
  options,
  selected,
  onChange,
  label,
  placeholder,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const toggleOption = (val) => {
    const newSet = new Set(selected);
    if (newSet.has(val)) newSet.delete(val);
    else newSet.add(val);
    onChange(newSet);
  };
  return (
    <div className={`relative ${compact ? "" : "w-full"}`} ref={dropdownRef}>
      {!compact && (
        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
          {label}
        </label>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between bg-white border border-slate-300 rounded text-sm text-left ${compact ? "px-3 py-1.5 text-xs font-bold" : "w-full p-2"}`}
      >
        <span
          className={
            selected.size
              ? "text-fixed-indigo-700 font-medium"
              : "text-slate-500"
          }
        >
          {selected.size > 0
            ? compact
              ? `${label}: ${selected.size}`
              : `${selected.size} seleccionados`
            : compact
              ? label
              : placeholder}
        </span>
        <IconChevronDown size={14} className="text-slate-400 ml-2" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 min-w-[200px] w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 max-h-48 overflow-y-auto p-1">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded text-sm"
            >
              <div
                className={`w-4 h-4 border rounded flex items-center justify-center ${
                  selected.has(opt.value)
                    ? "bg-fixed-indigo-600 border-fixed-indigo-600"
                    : "border-slate-300"
                }`}
              >
                {selected.has(opt.value) && (
                  <IconCheck size={10} className="text-white" />
                )}
              </div>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function GiraRoster({
  supabase,
  gira,
  onBack,
  isEditor = true,
}) {
  const {
    roster: rawRoster,
    loading: hookLoading,
    sources,
    refreshRoster,
  } = useGiraRoster(supabase, gira);
  const [localRoster, setLocalRoster] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);

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

  // States Modales
  const [isCreatingDetailed, setIsCreatingDetailed] = useState(false);
  const [tempName, setTempName] = useState({ nombre: "", apellido: "" });
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [editingMusician, setEditingMusician] = useState(null);

  // Data States
  const [localitiesList, setLocalitiesList] = useState([]);
  const [instrumentsList, setInstrumentsList] = useState([]);
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [familiesList, setFamiliesList] = useState([]);
  const [rolesList, setRolesList] = useState([]); // Nuevo State para Roles DB

  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());
  const [selectedExclEnsembles, setSelectedExclEnsembles] = useState(new Set());

  // Init UI Data
  useEffect(() => {
    fetchDropdownData();
  }, []);

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
          selectedFilterRoles.size === 0 || selectedFilterRoles.has(m.rol_gira);
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

        return (
          matchesSearch && matchesRole && matchesCondition && matchesEnsemble
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
    rolesList, // Dependencia agregada
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
      )
        setShowColumnMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDropdownData = async () => {
    const { data: ens } = await supabase
      .from("ensambles")
      .select("id, ensamble")
      .order("ensamble");
    if (ens)
      setEnsemblesList(ens.map((e) => ({ value: e.id, label: e.ensamble })));

    const { data: inst } = await supabase
      .from("instrumentos")
      .select("id, instrumento, familia")
      .order("instrumento");
    if (inst) {
      setInstrumentsList(inst);
      const fams = [...new Set(inst.map((i) => i.familia).filter(Boolean))];
      setFamiliesList(fams.map((f) => ({ value: f, label: f })));
    }

    const { data: locs } = await supabase
      .from("localidades")
      .select("id, localidad")
      .order("localidad");
    if (locs) setLocalitiesList(locs);

    // Fetch ROLES from DB
    const { data: rolesData } = await supabase
      .from("roles")
      .select("id, color, orden")
      .order("orden", { ascending: true });
    if (rolesData) setRolesList(rolesData);
  };

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
      alert("Error al eliminar vacante: " + err.message);
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
    // Optimistic
    setLocalRoster((prev) =>
      prev.map((m) =>
        m.id === musician.id ? { ...m, estado_gira: newStatus } : m,
      ),
    );
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
      if (musician.es_adicional) {
        await supabase
          .from("giras_integrantes")
          .update({ estado: "confirmado" })
          .eq("id_gira", gira.id)
          .eq("id_integrante", musician.id);
      } else {
        await supabase
          .from("giras_integrantes")
          .delete()
          .eq("id_gira", gira.id)
          .eq("id_integrante", musician.id);
      }
    }
    refreshRoster();
  };

  const handleUpdateGroups = async () => {
    setLoadingAction(true);
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
    setLoadingAction(false);
    refreshRoster();
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

  const addManualMusician = async (musicianId) => {
    const { error } = await supabase.from("giras_integrantes").insert({
      id_gira: gira.id,
      id_integrante: musicianId,
      estado: "confirmado",
      rol: "musico",
    });
    if (!error) {
      setSearchTerm("");
      refreshRoster();
    }
  };

  const removeMemberManual = async (id) => {
    if (!confirm("¿Eliminar registro manual?")) return;
    const { error } = await supabase
      .from("giras_integrantes")
      .delete()
      .eq("id_integrante", id)
      .eq("id_gira", gira.id);
    if (!error) refreshRoster();
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
      alert("Plaza liberada.");
      refreshRoster();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const searchIndividual = async (term) => {
    const cleanTerm = term.trim();
    let query = supabase
      .from("integrantes")
      .select("id, nombre, apellido, instrumentos(instrumento), cuil");
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
    const { data } = await query.limit(5);
    const currentIds = new Set(localRoster.map((r) => r.id));
    setSearchResults(data ? data.filter((m) => !currentIds.has(m.id)) : []);
  };

  const copyGuestLink = async (integrante) => {
    let token = integrante.token_publico;
    if (!token) {
      if (!confirm(`Generar enlace para ${integrante.nombre}?`)) return;
      try {
        const newToken = self.crypto.randomUUID();
        await supabase
          .from("giras_integrantes")
          .update({ token_publico: newToken })
          .eq("id_gira", gira.id)
          .eq("id_integrante", integrante.id);
        token = newToken;
        integrante.token_publico = newToken;
      } catch (err) {
        return alert("Error generando enlace.");
      }
    }
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() => alert(`Enlace copiado`))
      .catch(() => prompt("Copiar:", url));
  };

  const toggleColumn = (col) =>
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));

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
      baseStyle.className += " bg-amber-50 border-l-amber-400 text-slate-800";
      return baseStyle;
    }

    if (m.es_adicional && m.rol_gira === "musico") {
      // Adicional (manual) sin rol jerárquico
      baseStyle.className +=
        " bg-orange-50/50 hover:bg-orange-100/50 border-l-orange-300";
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
          " bg-amber-50/60 hover:bg-amber-100/60 border-l-amber-300";
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

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 relative z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
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
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="px-4 py-2 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 z-40 relative">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded text-xs font-medium mr-2">
            {["rol", "localidad", "region", "instrumento", "genero"].map(
              (crit) => (
                <button
                  key={crit}
                  onClick={() => setSortBy(crit)}
                  className={`px-2 py-1 rounded capitalize flex items-center gap-1 ${
                    sortBy === crit
                      ? "bg-white shadow text-fixed-indigo-700 font-bold"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {crit}
                  {sortBy === crit && (
                    <IconArrowRight size={10} className="rotate-90" />
                  )}
                </button>
              ),
            )}
          </div>

          <span className="text-[10px] uppercase font-bold text-slate-400">
            Filtros:
          </span>

          {/* MULTI FILTROS */}
          <MultiSelectDropdown
            compact
            label="Rol"
            placeholder="Todos"
            options={rolesList.map((r) => ({
              value: r.id,
              label: r.id.charAt(0).toUpperCase() + r.id.slice(1),
            }))}
            selected={selectedFilterRoles}
            onChange={setSelectedFilterRoles}
          />
          <MultiSelectDropdown
            compact
            label="Condición"
            placeholder="Todas"
            options={CONDICIONES.map((c) => ({ value: c, label: c }))}
            selected={selectedFilterConditions}
            onChange={setSelectedFilterConditions}
          />
          <MultiSelectDropdown
            compact
            label="Ensamble"
            placeholder="Todos"
            options={ensemblesList}
            selected={selectedFilterEnsemblesList}
            onChange={setSelectedFilterEnsemblesList}
          />

          {/* BOTÓN COPIAR MAILS */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleCopyEmails}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-fixed-indigo-50 border border-fixed-indigo-200 text-fixed-indigo-700 rounded-lg text-xs font-bold hover:bg-fixed-indigo-100 transition-all animate-in zoom-in ml-2"
            >
              <IconCopy size={14} /> Copiar ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
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

      {/* CONTROLES AGREGAR */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex gap-3 items-start overflow-visible z-20">
        <div className="flex bg-white border border-slate-200 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setAddMode(addMode === "groups" ? null : "groups")}
            className={`px-3 py-1 rounded text-xs font-bold ${
              addMode === "groups"
                ? "bg-fixed-indigo-50 text-fixed-indigo-700"
                : "text-slate-500"
            }`}
          >
            Grupos
          </button>
          <button
            onClick={() =>
              setAddMode(addMode === "individual" ? null : "individual")
            }
            className={`px-3 py-1 rounded text-xs font-bold ${
              addMode === "individual"
                ? "bg-fixed-indigo-50 text-fixed-indigo-700"
                : "text-slate-500"
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setIsVacancyModalOpen(true)}
            className="px-3 py-1 rounded text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-1 border-l border-slate-100 ml-1"
          >
            <IconUserPlus size={14} /> Nueva Vacante
          </button>
        </div>
        {addMode === "groups" && (
          <div className="flex gap-3 flex-wrap animate-in slide-in-from-left-2 items-start bg-white p-3 rounded border border-slate-200 shadow-sm">
            <div className="w-40">
              <MultiSelectDropdown
                label="Ensambles"
                placeholder="Seleccionar..."
                options={ensemblesList}
                selected={selectedEnsembles}
                onChange={setSelectedEnsembles}
              />
            </div>
            <div className="w-40">
              <MultiSelectDropdown
                label="Familias"
                placeholder="Seleccionar..."
                options={familiesList}
                selected={selectedFamilies}
                onChange={setSelectedFamilies}
              />
            </div>
            <div className="w-40">
              <MultiSelectDropdown
                label="EXCLUIR Ens."
                placeholder="Seleccionar..."
                options={ensemblesList}
                selected={selectedExclEnsembles}
                onChange={setSelectedExclEnsembles}
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
          <div className="relative w-64 animate-in slide-in-from-left-2 mt-1">
            <input
              type="text"
              placeholder="Buscar nombre o apellido..."
              className="w-full border p-2 rounded text-sm outline-none bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute top-full left-0 w-full bg-white border mt-1 rounded shadow-xl z-50 max-h-60 overflow-y-auto">
              {searchResults.length > 0
                ? searchResults.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addManualMusician(m.id)}
                      className="w-full text-left p-2 hover:bg-slate-50 text-xs border-b"
                    >
                      <b>
                        {m.apellido}, {m.nombre}
                      </b>{" "}
                      <span className="text-slate-400">
                        ({m.instrumentos?.instrumento})
                      </span>
                    </button>
                  ))
                : searchTerm.trim().length > 0 && (
                    <button
                      onClick={handleOpenDetailedCreate}
                      className="w-full text-left p-3 bg-fuchsia-50 hover:bg-fuchsia-100 text-xs text-fuchsia-700 font-bold border-t border-fuchsia-200 flex items-center gap-2 transition-colors"
                    >
                      <IconPlus size={14} /> Crear "{searchTerm}" como Invitado
                    </button>
                  )}
            </div>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-y-auto p-4 z-10">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                {/* CHECKBOX HEADER */}
                <th className="p-3 w-10 text-center bg-slate-50 border-r border-slate-100">
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

                <th className="p-3 w-48 border-r border-slate-100">
                  Rol / Instr.
                </th>
                <th className="p-3 bg-slate-50 border-r border-slate-100 w-1/4">
                  Apellido, Nombre
                </th>
                {visibleColumns.genero && (
                  <th className="p-3 border-r border-slate-100 w-10 text-center">
                    Gén.
                  </th>
                )}
                {visibleColumns.ensambles && (
                  <th className="p-3 border-r border-slate-100">Ensambles</th>
                )}
                {visibleColumns.localidad && (
                  <th className="p-3 border-r border-slate-100">Ubicación</th>
                )}
                <th className="p-3 border-r border-slate-100">Contacto</th>
                {visibleColumns.alimentacion && (
                  <th className="p-3 border-r border-slate-100">Alim.</th>
                )}
                <th className="p-3 text-center w-16 border-r border-slate-100">
                  Estado
                </th>
                <th className="p-3 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {localRoster.map((m, idx) => {
                const isSelected = selectedIds.has(m.id);
                const { className: rowClassName, style: rowStyle } =
                  getRowStyles(m, isSelected);

                return (
                  <tr
                    key={m.id}
                    className={rowClassName}
                    style={rowStyle} // Estilo dinámico DB
                  >
                    {/* CHECKBOX */}
                    <td className="p-3 text-center border-r border-slate-100/50">
                      <div>
                        {" "}
                        <span className="text-[10px] text-slate-400 font-mono w-5 text-right inline-block">
                          {idx + 1}
                        </span>{" "}
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-fixed-indigo-600 focus:ring-fixed-indigo-500 cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelection(m.id)}
                        />
                      </div>
                    </td>

                    {/* ROL / INSTR (Vertical) */}
                    <td className="p-3 pl-4 border-r border-slate-100/50">
                      {isEditor && !m.es_simulacion ? (
                        <select
                          className={`text-[11px] font-bold uppercase border-none bg-transparent outline-none cursor-pointer w-full -ml-1 text-slate-700`}
                          value={m.rol_gira || "musico"}
                          onChange={(e) => changeRole(m, e.target.value)}
                        >
                          {rolesList.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[11px] font-bold uppercase text-slate-600 block">
                          {m.rol_gira || "musico"}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                        {m.instrumentos?.instrumento || "-"}
                      </span>
                    </td>
                    {/* APELLIDO, NOMBRE (Expandido) */}
                    {/* APELLIDO, NOMBRE (Expandido con Nota Interna) */}
                    <td className="p-3 border-r border-slate-100/50 font-bold text-slate-700">
                      <div className="flex flex-col gap-1.5">
                        {/* Fila Nombre + Etiqueta Vacante */}
                        <div className="flex items-center gap-2">
                          {m.apellido}, {m.nombre}
                          {m.es_simulacion && (
                            <span className="bg-amber-100 text-amber-700 text-[9px] px-1 rounded border border-amber-200 font-black tracking-wider">
                              VACANTE
                            </span>
                          )}
                        </div>

                        {/* Nota Interna estilo Post-it */}
                        {m.nota_interna && (
                          <div className="group relative w-fit">
                            <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 text-[10px] px-2 py-0.5 rounded-sm shadow-sm flex items-center gap-1 cursor-help transform -rotate-1 hover:rotate-0 transition-transform origin-left max-w-[160px]">
                              <span className="text-[9px]">📝</span>
                              <span className="truncate font-normal">
                                {m.nota_interna}
                              </span>
                            </div>

                            {/* Tooltip Flotante con el texto completo */}
                            <div className="absolute left-0 top-full mt-1 hidden group-hover:block w-56 bg-yellow-50 border border-yellow-200 shadow-xl p-2 rounded text-xs font-normal text-slate-700 z-[60] whitespace-normal animate-in fade-in zoom-in-95">
                              {m.nota_interna}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* GÉNERO */}
                    {visibleColumns.genero && (
                      <td className="p-3 text-xs text-slate-600 text-center border-r border-slate-100/50">
                        {m.genero || "-"}
                      </td>
                    )}

                    {/* ENSAMBLES (NUEVO) */}
                    {visibleColumns.ensambles && (
                      <td className="p-3 border-r border-slate-100/50 max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {m.integrantes_ensambles &&
                          m.integrantes_ensambles.length > 0 ? (
                            m.integrantes_ensambles.map((ie) => (
                              <span
                                key={ie.ensambles?.id || Math.random()}
                                className="text-[9px] bg-white/50 border border-slate-300 px-1 rounded text-slate-500 truncate max-w-[80px]"
                              >
                                {ie.ensambles?.ensamble}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-300 text-[10px]">
                              -
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* UBICACIÓN */}
                    {visibleColumns.localidad && (
                      <td className="p-3 text-xs text-slate-600 border-r border-slate-100/50">
                        {m.localidades ? (
                          <div>
                            <span className="font-semibold block">
                              {m.localidades.localidad}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              {m.localidades.regiones?.region}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}

                    {/* CONTACTO */}
                    <td className="p-3 border-r border-slate-100/50 text-xs">
                      <div className="flex flex-col gap-1">
                        {m.telefono && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <IconPhone size={10} className="text-slate-400" />
                            <span>{m.telefono}</span>
                            <WhatsAppLink phone={m.telefono} />
                          </div>
                        )}
                        {m.mail && (
                          <div
                            className="flex items-center gap-1 max-w-[180px] truncate"
                            title={m.mail}
                          >
                            <IconMail
                              size={10}
                              className="text-slate-400 shrink-0"
                            />
                            <span className="text-slate-500 truncate">
                              {m.mail}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ALIMENTACIÓN */}
                    {visibleColumns.alimentacion && (
                      <td className="p-3 text-xs text-slate-600 truncate max-w-[100px] border-r border-slate-100/50">
                        {m.alimentacion || "-"}
                      </td>
                    )}

                    {/* ESTADO */}
                    <td className="p-3 text-center border-r border-slate-100/50">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => isEditor && toggleStatus(m)}
                          disabled={!isEditor}
                          className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold transition-all shadow-sm mx-auto ${
                            m.estado_gira === "ausente"
                              ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                              : "bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600"
                          }`}
                        >
                          {m.estado_gira === "ausente" ? "A" : "P"}
                        </button>
                      </div>
                    </td>

                    {/* ACCIONES (Botones Visibles pero tenues) */}
                    <td className="p-3 text-right pr-4">
                      <div className="flex justify-end items-center gap-1">
                        <button
                          onClick={() => setEditingMusician(m)}
                          className="p-1.5 text-slate-400 hover:text-fixed-indigo-600 hover:bg-white rounded transition-colors"
                          title="Editar"
                        >
                          <IconPencil size={14} />
                        </button>

                        {m.es_simulacion ? (
                          <>
                            <div className="w-px h-3 bg-slate-200 mx-1"></div>
                            <button
                              onClick={() => setSwapTarget(m)}
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"
                              title="Asignar titular"
                            >
                              <IconExchange size={10} /> ASIGNAR
                            </button>
                            <button
                              onClick={() => handleDeleteVacancy(m)}
                              className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Eliminar Vacante"
                            >
                              <IconTrash size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            {m.estado_gira === "confirmado" && (
                              <button
                                onClick={() => handleLiberarPlaza(m)}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Liberar Plaza"
                              >
                                <IconUserMinus size={14} />
                              </button>
                            )}
                            {m.es_adicional && (
                              <button
                                onClick={() => removeMemberManual(m.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar Manual"
                              >
                                <IconTrash size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => copyGuestLink(m)}
                              className="p-1.5 text-slate-400 hover:text-fixed-indigo-600 hover:bg-white rounded transition-colors"
                              title="Copiar Link"
                            >
                              <IconLink size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
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
    </div>
  );
}
