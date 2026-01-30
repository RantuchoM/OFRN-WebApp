import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  IconAlertCircle,
  IconEdit,
  IconYoutube,
  IconDrive,
} from "../ui/Icons";
import { formatSecondsToTime } from "../../utils/time";
import {
  calculateInstrumentation,
  calculateTotalDuration,
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
}) {
  const { user, isEditor: isGlobalEditor } = useAuth();

  const isEditor = readOnly !== undefined ? !readOnly : isGlobalEditor;

  const [repertorios, setRepertorios] = useState(initialData);
  const [musicians, setMusicians] = useState([]);

  // --- CORRECCIÓN AQUÍ: Definimos seatingMap correctamente ---
  const [seatingMap, setSeatingMap] = useState({});
  const [assignments, setAssignments] = useState([]); // <--- AGREGAR ESTO
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
  const [workFormData, setWorkFormData] = useState({});
  // --- CALCULAR MAPA DE ARCOS DISPONIBLES ---
  const arcosByWork = useMemo(() => {
    const map = {};
    repertorios.forEach((rep) => {
      rep.repertorio_obras?.forEach((item) => {
        if (item.obras && item.obras.obras_arcos) {
          map[item.obras.id] = item.obras.obras_arcos;
        }
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
  }, [programId, user?.id]); // <--- AÑADIR user?.id AQUÍ
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

  // --- FETCH SEATING LOGIC ---
  // --- FETCH SEATING LOGIC ACTUALIZADA ---
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
        newMap[String(item.id_musico)] = {
          containerId: item.id_contenedor, // <--- IMPORTANTE
          containerName: container?.nombre,
          desk: Math.floor(item.orden || 0) + 1,
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
              id, titulo, duracion_segundos, estado, link_drive, link_youtube, anio_composicion, instrumentacion, 
              obras_arcos (id, nombre, link, descripcion),
              compositores (id, apellido, nombre), 
              obras_compositores (rol, compositores(id, apellido, nombre)),
              obras_particellas (id, nombre_archivo, nota_organico, id_instrumento, url_archivo, instrumentos (instrumento))
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
        `*, obras_compositores (rol, compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag)), obras_particellas (nombre_archivo, nota_organico, instrumentos (instrumento))`,
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
      await supabase.functions.invoke("manage-drive", {
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
    const obras = [...repertorios[repIndex].repertorio_obras];
    const workIndex = obras.findIndex((o) => o.id === workId);
    if (
      (direction === -1 && workIndex === 0) ||
      (direction === 1 && workIndex === obras.length - 1)
    )
      return;
    const itemA = obras[workIndex];
    const itemB = obras[workIndex + direction];
    [itemA.orden, itemB.orden] = [itemB.orden, itemA.orden];
    [obras[workIndex], obras[workIndex + direction]] = [itemB, itemA];
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

  // --- LÓGICA PARA SABER SI LA GIRA EMPEZÓ (Simplificada) ---
  // Si hay un giraId presente, asumimos que estamos en contexto de gira.
  // Para una lógica más precisa, podrías comparar la fecha actual con la de la gira.
  const isTourStarted = !!giraId;
  // --- HELPER PARA RENDERIZAR BADGE DE MI PARTE + ATRIL ---
  // --- HELPER PARA RENDERIZAR BADGE DE MI PARTE + ATRIL (MODIFICADO) ---
  const renderMyPartBadge = (obra) => {
    // Solo logueamos una obra específica para no inundar la consola, por ejemplo la primera
    const isDebugWork = true;

    if (!user || !assignments.length) {
      if (isDebugWork && !user)
        console.log(`DEBUG BADGE [${obra.titulo}]: No hay user`);
      if (isDebugWork && !assignments.length)
        console.log(`DEBUG BADGE [${obra.titulo}]: No hay assignments`);
      return null;
    }

    const userId = String(user.id);
    const mySeating = seatingMap[userId];

    // Buscamos la asignación
    const assignment = assignments.find((a) => {
      const matchObra = String(a.id_obra) === String(obra.id);
      if (!matchObra) return false;

      // Verificación por Músico (convertimos todo a String para comparar)
      const matchUser = a.id_musicos_asignados?.some(
        (id) => String(id) === userId,
      );

      // Verificación por Contenedor
      const matchContainer =
        mySeating?.containerId &&
        String(a.id_contenedor) === String(mySeating.containerId);

      return matchUser || matchContainer;
    });

    if (isDebugWork) {
      console.log(`DEBUG BADGE [${obra.titulo}]:`, {
        userId,
        myContainerId: mySeating?.containerId,
        foundAssignment: !!assignment,
        particellaId: assignment?.id_particella,
      });
    }

    if (!assignment) return null;

    const myPart = obra.obras_particellas?.find(
      (p) => String(p.id) === String(assignment.id_particella),
    );

    if (!myPart) {
      if (isDebugWork)
        console.log(
          `DEBUG BADGE [${obra.titulo}]: Asignación hallada pero particella no encontrada en array de obra`,
        );
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
  const filteredLibrary = worksLibrary.filter(
    (w) =>
      (!filters.titulo ||
        w.titulo.toLowerCase().includes(filters.titulo.toLowerCase())) &&
      (!filters.compositor ||
        w.compositor_full
          ?.toLowerCase()
          .includes(filters.compositor.toLowerCase())) &&
      (!filters.arreglador ||
        w.arreglador_full
          ?.toLowerCase()
          .includes(filters.arreglador.toLowerCase())),
  );
  // --- MANEJADOR CAMBIO DE ARCO (BD + DRIVE) ---
  const handleArcoSelectionChange = async (item, newArcoId) => {
    // 1. Actualización optimista en BD
    // Nota: updateWorkDetail devuelve una promesa, pero no necesitamos esperarla para seguir
    updateWorkDetail(item.id, "id_arco_seleccionado", newArcoId);

    // 2. Si es null (deselección), no hay que crear shortcut
    if (!newArcoId) return;

    // 3. Obtener datos del arco
    const selectedArco = arcosByWork[item.obras.id]?.find(
      (a) => a.id == newArcoId,
    );

    if (!selectedArco) return;

    // INTENTO DE RECUPERACIÓN DE ID:
    // Si no tiene id_drive_folder (legacy), intentamos sacarlo del link
    let targetId = selectedArco.id_drive_folder;
    if (!targetId && selectedArco.link) {
      const match = selectedArco.link.match(/[-\w]{25,}/);
      if (match) targetId = match[0];
    }

    if (!targetId) {
      console.warn(
        "No se pudo obtener ID de Drive para el arco seleccionado. Solo se actualizó BD.",
      );
      return;
    }

    console.log(
      "Iniciando Sync Drive para:",
      item.obras.titulo,
      "->",
      selectedArco.nombre,
    );

    // 4. Llamar a Edge Function
    supabase.functions
      .invoke("manage-drive", {
        body: {
          action: "link_existing_arco",
          programId: programId || giraId,
          targetDriveId: targetId,
          obraTitulo: item.obras.titulo,
          nombreSet: selectedArco.nombre,
        },
      })
      .then(({ data, error }) => {
        if (error) console.error("Error en Edge Function:", error);
        else console.log("Drive Sync exitoso:", data);
      })
      .catch((err) => console.error("Error de red/fetch:", err));
  };
  // --- NUEVA FUNCIÓN: Crear Set de Arcos ---
  const handleCreateBowingSet = async (workId, workTitle) => {
    // Validación previa
    if (!programId && !giraId) {
      alert("Error: No se identifica el ID del programa/gira.");
      return;
    }

    const nombreSet = prompt(
      "Nombre para el nuevo set de arcos:",
      `Arcos ${new Date().getFullYear()}`,
    );
    if (!nombreSet) return;

    try {
      setLoading(true);

      // 1. Llamar a Edge Function
      const { data: driveData, error: driveError } =
        await supabase.functions.invoke("manage-drive", {
          body: {
            action: "create_bowing_set",
            // Aseguramos enviar un ID válido (programId suele ser el id numérico de la tabla programas)
            programId: programId || giraId,
            nombreSet: nombreSet,
            obraTitulo: workTitle,
          },
        });

      // Manejo detallado del error 400/500
      if (driveError) {
        // Intentamos leer el mensaje que envió la Edge Function (ej: "La gira no tiene carpeta...")
        let serverMessage = driveError.message;
        try {
          // A veces el error viene en el cuerpo de la respuesta si es un 400 manejado
          if (
            driveError.context &&
            typeof driveError.context.json === "function"
          ) {
            const body = await driveError.context.json();
            if (body.error) serverMessage = body.error;
          }
        } catch (e) {}

        throw new Error(serverMessage);
      }

      if (!driveData || !driveData.success) {
        throw new Error("La respuesta del servidor no fue exitosa.");
      }

      // 2. Crear registro en BD
      const { data: newArco, error: dbError } = await supabase
        .from("obras_arcos")
        .insert({
          id_obra: workId,
          nombre: nombreSet,
          link: driveData.webViewLink,
          id_drive_folder: driveData.folderId,
          descripcion: `Creado automáticamente desde Gira`,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Asignar este nuevo arco a la obra
      // Buscamos el item específico en la estructura de repertorios
      let targetItem = null;
      for (const r of repertorios) {
        const found = r.repertorio_obras.find((o) => o.obras.id === workId);
        if (found) {
          targetItem = found;
          break;
        }
      }

      if (targetItem) {
        await updateWorkDetail(
          targetItem.id,
          "id_arco_seleccionado",
          newArco.id,
        );
        // Recargar forzada para refrescar los arcos disponibles en el select
        window.location.reload();
      }
    } catch (error) {
      console.error("Error creando set de arcos:", error);
      // Mensaje amigable si es el error de la carpeta
      if (
        error.message.includes("no tiene carpeta") ||
        error.message.includes("Bad Request")
      ) {
        alert(
          "Error: La Gira no tiene carpeta en Drive.\n\nPor favor, haz clic en el botón de sincronizar (icono de nube/recarga) en el panel principal de la gira primero.",
        );
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className={containerClasses(isCompact)}>
      {repertorios.map((rep) => {
        // 1. Calculamos el seating para este usuario (si existe)
        const userSeating = user ? seatingMap[user.id] : null;

        return (
          <div
            key={rep.id}
            className={`border border-slate-200 ${
              isCompact ? "mb-4 rounded shadow-sm" : "shadow-sm bg-white mb-6"
            }`}
          >
            {/* HEADER BLOQUE */}
            <div className="bg-fixed-indigo-50/50 p-2 border-b border-slate-200 flex justify-between items-center h-10">
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

                    {/* --- AQUÍ MOSTRAMOS EL ATRIL (si existe) --- */}
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

            {/* TABLA OBRAS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1000px]">
                <thead className={tableHeaderClasses(isCompact)}>
                  <tr>
                    <th className="p-1 w-8 text-center">#</th>
                    <th className="p-1 w-8 text-center">GD</th>
                    <th className="p-1 w-32">Compositor</th>
                    <th className="p-1 w-110">Obra</th>
                    <th className="p-1 w-58 text-center">Instr.</th>
                    <th className="p-1 w-12 text-center">Dur.</th>
                    <th className="p-1 w-32">Solista</th>
                    <th className="p-1 w-24">Arr.</th>
                    <th className="p-1 w-30">Notas</th>
                    <th className="p-1 w-24 text-center">Arcos</th>

                    <th className="p-1 w-8 text-center">YT</th>
                    <th className="p-1 w-16 text-right"></th>
                    <th className="p-1 w-8 text-center">Excl.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rep.repertorio_obras.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-yellow-50 group">
                      <td className="p-1 text-center font-bold text-slate-500">
                        <div className="flex flex-col items-center">
                          {isEditor && !isCompact && (
                            <button
                              onClick={() => moveWork(rep.id, item.id, -1)}
                              disabled={idx === 0}
                              className="text-slate-300 hover:text-fixed-indigo-600 disabled:opacity-0 p-0.5"
                            >
                              <IconChevronDown
                                size={8}
                                className="rotate-180"
                              />
                            </button>
                          )}
                          <span>{idx + 1}</span>
                          {isEditor && !isCompact && (
                            <button
                              onClick={() => moveWork(rep.id, item.id, 1)}
                              disabled={idx === rep.repertorio_obras.length - 1}
                              className="text-slate-300 hover:text-fixed-indigo-600 disabled:opacity-0 p-0.5"
                            >
                              <IconChevronDown size={8} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-1 text-center">
                        {item.google_drive_shortcut_id ? (
                          <IconDrive className="w-3.5 h-3.5 mx-auto text-slate-600" />
                        ) : item.obras.link_drive ? (
                          <a
                            href={item.obras.link_drive}
                            target="_blank"
                            className="block w-2 h-2 bg-amber-400 rounded-full mx-auto"
                          ></a>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </td>

                      {/* CELDA COMPOSITOR (VERTICAL) */}
                      <td className="p-1 text-slate-600 align-middle">
                        <div className="flex flex-col justify-center">
                          <span
                            className="truncate text-[11px] font-medium leading-tight"
                            title={getComposers(item.obras)}
                          >
                            {getComposers(item.obras)}
                          </span>
                          {/* Badge simplificado (solo Icono) */}
                          {renderMyPartBadge(item.obras)}
                        </div>
                      </td>

                      <td
                        className="p-1 text-slate-800"
                        title={item.obras.titulo?.replace(/<[^>]*>?/gm, "")}
                      >
                        <RichTextPreview content={item.obras.titulo} />
                        {item.obras.estado !== "Oficial" && (
                          <span className="ml-1 text-[8px] bg-amber-100 text-amber-700 px-1 rounded border border-amber-200 align-text-top">
                            PEND
                          </span>
                        )}
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
                          /* VISTA EDICIÓN: Permite añadir y quitar solistas */
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
                          /* VISTA LECTURA: Solo muestra los nombres de los solistas seleccionados */
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
                      {/* --- COLUMNA ARCOS (DISEÑO CHIP) --- */}
                      <td className="px-2 py-4 align-middle">
                        <div className="flex flex-row items-center gap-2 w-full max-w-[160px]">
                          {/* Contenedor del "Chip" Select */}
                          <div className="relative flex-1 min-w-0 group">
                            {/* 1. CAPA VISUAL (LO QUE EL USUARIO VE) */}
                            <div
                              className={`flex items-center justify-between px-2 py-1 rounded-full border text-[10px] font-medium truncate transition-all ${
                                item.id_arco_seleccionado
                                  ? "bg-fixed-indigo-50 border-fixed-indigo-200 text-fixed-indigo-700 group-hover:border-fixed-indigo-300"
                                  : "bg-white border-slate-200 text-slate-400 border-dashed group-hover:border-fixed-indigo-300 group-hover:text-fixed-indigo-400"
                              }`}
                            >
                              <span className="truncate w-full text-center">
                                {item.id_arco_seleccionado
                                  ? arcosByWork[item.obras.id]?.find(
                                      (a) => a.id == item.id_arco_seleccionado,
                                    )?.nombre
                                  : "+ Asignar Arcos"}
                              </span>
                            </div>

                            {/* 2. CAPA INTERACTIVA (SELECT INVISIBLE ENCIMA) */}
                            <select
                              value={item.id_arco_seleccionado || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "NEW_SET_ACTION") {
                                  handleCreateBowingSet(
                                    item.obras.id,
                                    item.obras.titulo,
                                  );
                                } else {
                                  handleArcoSelectionChange(
                                    item,
                                    val === "" ? null : val,
                                  );
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              title={
                                // Tooltip nativo al pasar el mouse
                                item.id_arco_seleccionado
                                  ? arcosByWork[item.obras.id]?.find(
                                      (a) => a.id == item.id_arco_seleccionado,
                                    )?.nombre
                                  : "Seleccionar set de arcos"
                              }
                            >
                              <option value="">-- Sin definir --</option>

                              {arcosByWork[item.obras.id]?.map((arco) => (
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

                          {/* BOTÓN LINK DRIVE (Visible solo si hay selección) */}
                          {item.id_arco_seleccionado && (
                            <a
                              href={
                                arcosByWork[item.obras.id]?.find(
                                  (a) => a.id == item.id_arco_seleccionado,
                                )?.link
                              }
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
                                <IconX size={12} />
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
                    </tr>
                  ))}
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

      {!isCompact && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {syncingDrive && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                <IconLoader className="animate-spin inline mr-1" />
                Syncing...
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
            <div className="p-2 border-b grid grid-cols-1 md:grid-cols-5 gap-2 bg-white">
              <input
                type="text"
                placeholder="Compositor..."
                autoFocus
                className="w-full p-1.5 border rounded text-xs outline-none focus:border-fixed-indigo-500"
                value={filters.compositor}
                onChange={(e) =>
                  setFilters({ ...filters, compositor: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Arreglador..."
                className="w-full p-1.5 border rounded text-xs outline-none focus:border-fixed-indigo-500"
                value={filters.arreglador}
                onChange={(e) =>
                  setFilters({ ...filters, arreglador: e.target.value })
                }
              />
              <div className="relative col-span-2">
                <IconSearch
                  className="absolute left-2 top-2.5 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Título..."
                  className="w-full pl-7 p-1.5 border rounded text-xs outline-none focus:border-fixed-indigo-500"
                  value={filters.titulo}
                  onChange={(e) =>
                    setFilters({ ...filters, titulo: e.target.value })
                  }
                />
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  openCreateModal();
                }}
                className="bg-fixed-indigo-600 text-white px-3 rounded text-xs font-bold hover:bg-fixed-indigo-700 flex justify-center items-center gap-1"
              >
                <IconPlus size={12} /> Crear Solicitud
              </button>
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
      {/* BOTÓN TEMPORAL DE ADMIN PARA ARREGLAR PERMISOS */}
    </div>
  );
}

const containerClasses = (isCompact) => (isCompact ? "bg-white" : "space-y-8");
const tableHeaderClasses = (isCompact) =>
  isCompact
    ? "hidden"
    : "bg-blue-200 text-slate-700 border-b-2 border-slate-400 font-bold uppercase tracking-tight";
