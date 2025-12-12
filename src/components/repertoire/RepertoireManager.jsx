import React, { useState, useEffect } from "react";
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
  IconExternalLink,
} from "../ui/Icons";
import { formatSecondsToTime, inputToSeconds } from "../../utils/time";
import CommentsManager from "../comments/CommentsManager";
import CommentButton from "../comments/CommentButton";
import { useAuth } from "../../context/AuthContext";

// Icono Drive local
const IconDrive = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 87.3 78"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="m6.6 66.85 25.3-43.8 25.3 43.8z" fill="#0066da" />
    <path d="m43.65 23.05-25.3 43.8h25.3z" fill="#00ac47" />
    <path d="m73.55 66.85-12.65-21.9-25.3 21.9z" fill="#ea4335" />
    <path d="m43.65 23.05h33.65l-12.65 21.9-25.3-21.9z" fill="#00832d" />
    <path d="m6.6 66.85h33.65l12.65-21.9-33.65-21.9z" fill="#2684fc" />
    <path d="m77.3 23.05-25.3 43.8h25.3z" fill="#ffba00" />
    <path d="m6.6 66.85 25.3-43.8 25.3 43.8z" opacity=".25" />
    <path d="m6.6 66.85h66.95l-12.65-21.9h-41.65z" fill="#0066da" />
    <path d="m43.65 23.05 20.9 36.2h-16.7l-29.5-51.1z" fill="#00ac47" />
    <path d="m73.55 66.85-20.9-36.2h-16.7l12.3 21.9z" fill="#ea4335" />
    <path d="m43.65 23.05h33.65l-12.65 21.9h-21z" fill="#00832d" />
    <path d="m6.6 66.85h33.65l12.65-21.9-21-36.2z" fill="#2684fc" />
    <path d="m77.3 23.05-25.3 43.8h25.3z" fill="#ffba00" />
  </svg>
);

// --- PORTAL PARA MODALES ---
const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );
};

// Helper para capitalizar
const capitalizeWords = (str) => {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

// --- MODAL GESTOR DE LINKS ---
const LinksManagerModal = ({ isOpen, onClose, links, onSave, partName }) => {
  const [localLinks, setLocalLinks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setLocalLinks(Array.isArray(links) ? links : []);
    }
  }, [isOpen, links]);

  const addLink = () =>
    setLocalLinks([...localLinks, { description: "", url: "" }]);
  const removeLink = (idx) =>
    setLocalLinks(localLinks.filter((_, i) => i !== idx));
  const updateLink = (idx, field, val) => {
    const newLinks = [...localLinks];
    newLinks[idx] = { ...newLinks[idx], [field]: val };
    setLocalLinks(newLinks);
  };

  const handleSave = () => {
    const validLinks = localLinks.filter((l) => l.url.trim() !== "");
    onSave(validLinks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <IconLink size={18} /> Enlaces:{" "}
            <span className="text-indigo-600">{partName}</span>
          </h3>
          <button onClick={onClose}>
            <IconX size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4">
          {localLinks.map((link, idx) => (
            <div
              key={idx}
              className="flex gap-2 items-start bg-slate-50 p-2 rounded border border-slate-200"
            >
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  placeholder="Descripción (ej: En Si Bemol)"
                  className="w-full text-xs p-1 border rounded"
                  value={link.description}
                  onChange={(e) =>
                    updateLink(idx, "description", e.target.value)
                  }
                />
                <div className="flex items-center gap-1">
                  <IconExternalLink size={12} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="https://..."
                    className="w-full text-xs p-1 border rounded text-blue-600"
                    value={link.url}
                    onChange={(e) => updateLink(idx, "url", e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={() => removeLink(idx)}
                className="text-red-400 hover:text-red-600 p-1 mt-1"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          {localLinks.length === 0 && (
            <p className="text-center text-xs text-slate-400 italic py-2">
              Sin enlaces configurados.
            </p>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-2 border-t">
          <button
            onClick={addLink}
            className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded"
          >
            <IconPlus size={12} /> Agregar otro
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-indigo-700"
          >
            Listo
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

// --- LÓGICA DE CÁLCULO DE INSTRUMENTACIÓN ---
// --- LÓGICA DE CÁLCULO DE INSTRUMENTACIÓN ---
const calculateInstrumentation = (parts) => {
  if (!parts || parts.length === 0) return "";

  const families = {
    fl: { count: 0, notes: [] },
    ob: { count: 0, notes: [] },
    cl: { count: 0, notes: [] },
    bn: { count: 0, notes: [] },
    hn: { count: 0, notes: [] },
    tpt: { count: 0, notes: [] },
    tbn: { count: 0, notes: [] },
    tba: { count: 0, notes: [] },
    timp: false,
    perc: { count: 0, notes: [] },
    str: false,
    key: { count: 0, notes: [] },
    harp: { count: 0, notes: [] },
  };

  parts.forEach((p) => {
    // Usamos nombre_archivo (lo que editas) para detectar "Perc Timb" o "Perc 1"
    // Y usamos instrumento_nombre (la base de datos) para asegurar detección de otros instrumentos
    const name = (p.nombre_archivo || "").toLowerCase();
    const baseName = (p.instrumento_nombre || "").toLowerCase();
    const note = p.nota_organico ? p.nota_organico.trim() : null;

    const add = (famKey) => {
      families[famKey].count++;
      if (note) families[famKey].notes.push(note);
    };

    // 1. Lógica Específica de Timbales (Prioridad a tu nomenclatura)
    if (
      name.startsWith("perc timb") ||
      name.startsWith("perc timp") ||
      baseName.includes("timbal")
    ) {
      families.timp = true;
    }
    // 2. Lógica de Percusión General
    else if (
      name.startsWith("perc") ||
      baseName.includes("percusión") ||
      baseName.includes("percusion") ||
      baseName.includes("bombo") ||
      baseName.includes("platillo") ||
      baseName.includes("caja")
    ) {
      add("perc");
    }

    // 3. Resto de Familias (Usamos baseName para mayor seguridad al detectar el tipo)
    // Maderas
    else if (
      baseName.includes("flauta") ||
      baseName.includes("piccolo") ||
      baseName.includes("flautín")
    )
      add("fl");
    else if (
      baseName.includes("oboe") ||
      baseName.includes("corno inglés") ||
      baseName.includes("corno ingles")
    )
      add("ob");
    else if (
      baseName.includes("clarinete") ||
      baseName.includes("requinto") ||
      baseName.includes("basset")
    )
      add("cl");
    else if (baseName.includes("fagot") || baseName.includes("contrafagot"))
      add("bn");
    // Metales
    else if (baseName.includes("corno") || baseName.includes("trompa"))
      add("hn");
    else if (baseName.includes("trompeta") || baseName.includes("fliscorno"))
      add("tpt");
    else if (baseName.includes("trombón") || baseName.includes("trombon"))
      add("tbn");
    else if (baseName.includes("tuba") || baseName.includes("bombardino"))
      add("tba");
    // Otros
    else if (baseName.includes("arpa")) add("harp");
    else if (
      baseName.includes("piano") ||
      baseName.includes("celesta") ||
      baseName.includes("clavecín")
    )
      add("key");
    else if (
      baseName.includes("violín") ||
      baseName.includes("violin") ||
      baseName.includes("viola") ||
      baseName.includes("cello") ||
      baseName.includes("violoncello") ||
      baseName.includes("contrabajo")
    )
      families.str = true;
  });

  const fmt = (fam) => {
    if (fam.count === 0) return "0";
    let s = `${fam.count}`;
    if (fam.notes.length > 0) s += `(${fam.notes.join(", ")})`;
    return s;
  };

  // Formateador especial para Percusión según tus reglas
  const fmtPerc = () => {
    let s = "";
    if (families.timp) {
      // Si hay Timbales
      if (families.perc.count > 0) {
        s = `Timp.+${families.perc.count}`;
      } else {
        s = "Timp";
      }
    } else {
      // Si NO hay Timbales
      if (families.perc.count === 1) s = "Perc";
      else if (families.perc.count > 1) s = `Perc.x${families.perc.count}`;
    }

    // Agregamos notas si existen (ej: Perc.x2(Gong))
    if (families.perc.notes.length > 0 && s !== "") {
      s += `(${families.perc.notes.join(", ")})`;
    }
    return s;
  };

  // Construcción del string final
  let str = `${fmt(families.fl)}.${fmt(families.ob)}.${fmt(families.cl)}.${fmt(
    families.bn
  )} - ${fmt(families.hn)}.${fmt(families.tpt)}.${fmt(families.tbn)}.${fmt(
    families.tba
  )}`;

  const percStr = fmtPerc();
  if (percStr) str += ` - ${percStr}`;

  if (families.harp.count > 0)
    str += ` - ${families.harp.count > 1 ? families.harp.count : ""}Hp${
      families.harp.notes.length ? `(${families.harp.notes.join(", ")})` : ""
    }`;
  if (families.key.count > 0)
    str += ` - Key${
      families.key.notes.length ? `(${families.key.notes.join(", ")})` : ""
    }`;
  if (families.str) str += " - Str";

  return str;
};

// --- FUNCIÓN FALTANTE QUE CAUSABA EL ERROR ---
const calculateTotalDuration = (works) => {
  if (!works) return "00:00";
  const totalSeconds = works.reduce(
    (acc, item) => acc + (item.obras?.duracion_segundos || 0),
    0
  );
  return formatSecondsToTime(totalSeconds);
};

export default function RepertoireManager({
  supabase,
  programId,
  initialData = [],
  isCompact = false,
}) {
  const { isEditor } = useAuth();
  const [repertorios, setRepertorios] = useState(initialData);
  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);

  // Edición de Bloque
  const [editingBlock, setEditingBlock] = useState({ id: null, nombre: "" });

  // Modales y Formularios
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditWorkModalOpen, setIsEditWorkModalOpen] = useState(false);
  const [activeRepertorioId, setActiveRepertorioId] = useState(null);
  const [worksLibrary, setWorksLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [composersList, setComposersList] = useState([]);
  const [instrumentList, setInstrumentList] = useState([]);

  // Estado para el Generador de Particellas y Links
  const [particellas, setParticellas] = useState([]);
  const [genInstrument, setGenInstrument] = useState("");
  const [genQuantity, setGenQuantity] = useState(1);

  // Modal de Links
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinksId, setEditingLinksId] = useState(null); // tempId de la particella

  const [filters, setFilters] = useState({
    titulo: "",
    compositor: "",
    tags: "",
  });

  // Formulario de Solicitud/Edición
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [workFormData, setWorkFormData] = useState({
    id: null,
    titulo: "",
    duracion: "",
    link_drive: "",
    link_youtube: "",
    instrumentacion: "",
    anio: "",
    estado: "",
  });

  // Selectores Inteligentes
  const [composerQuery, setComposerQuery] = useState("");
  const [selectedComposer, setSelectedComposer] = useState(null);
  const [showComposerOptions, setShowComposerOptions] = useState(false);

  const [arrangerQuery, setArrangerQuery] = useState("");
  const [selectedArranger, setSelectedArranger] = useState(null);
  const [showArrangerOptions, setShowArrangerOptions] = useState(false);

  const [commentsState, setCommentsState] = useState(null);

  // --- CARGA INICIAL ---
  useEffect(() => {
    if (!initialData.length && programId) {
      fetchFullRepertoire();
    } else if (initialData.length) {
      const sorted = initialData.map((r) => ({
        ...r,
        repertorio_obras:
          r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
      }));
      setRepertorios(sorted);
    }
    if (musicians.length === 0) fetchMusicians();
  }, [programId]);

  useEffect(() => {
    if (isAddModalOpen || isEditWorkModalOpen) {
      if (worksLibrary.length === 0) fetchLibrary();
      if (composersList.length === 0) fetchComposers();
      if (instrumentList.length === 0) fetchInstruments();
    }
  }, [isAddModalOpen, isEditWorkModalOpen]);

  // --- EFECTO DE CÁLCULO DE INSTRUMENTACIÓN ---
  useEffect(() => {
    // Eliminamos la condición "length > 0" para que calcule siempre.
    // Si no hay particellas, calculateInstrumentation devuelve "" y limpia el campo, lo cual es correcto.
    if (showRequestForm || isEditWorkModalOpen) {
      const autoInstr = calculateInstrumentation(particellas);

      setWorkFormData((prev) => {
        // Solo actualizamos si el valor cambió para evitar renderizados infinitos
        if (prev.instrumentacion !== autoInstr) {
          return { ...prev, instrumentacion: autoInstr };
        }
        return prev;
      });
    }
  }, [particellas, showRequestForm, isEditWorkModalOpen]);
  // --- FETCHERS ---
  const fetchMusicians = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, instrumentos(instrumento)")
      .order("apellido");
    if (data) setMusicians(data);
  };

  const fetchComposers = async () => {
    const { data } = await supabase
      .from("compositores")
      .select("*")
      .order("apellido");
    if (data) setComposersList(data);
  };

  const fetchInstruments = async () => {
    const { data } = await supabase
      .from("instrumentos")
      .select("id, instrumento")
      .order("id");
    if (data) setInstrumentList(data);
  };

  const fetchFullRepertoire = async () => {
    setLoading(true);
    // AGREGADO: obras_particellas (nombre_archivo, nota_organico, instrumentos (instrumento))
    const { data: reps, error } = await supabase
      .from("programas_repertorios")
      .select(
        `
            *, 
            repertorio_obras (
                id, orden, notas_especificas, id_solista, google_drive_shortcut_id, 
                obras (
                    id, titulo, duracion_segundos, estado, link_drive, link_youtube, anio_composicion, instrumentacion, 
                    compositores (id, apellido, nombre), 
                    obras_compositores (rol, compositores(id, apellido, nombre)),
                    obras_particellas (nombre_archivo, nota_organico, instrumentos (instrumento)) 
                ), 
                integrantes (id, apellido, nombre)
            )
        `
      )
      .eq("id_programa", programId)
      .order("orden", { ascending: true });

    if (error) console.error("Error fetching repertoire:", error);
    else {
      const sorted = reps.map((r) => ({
        ...r,
        repertorio_obras:
          r.repertorio_obras?.sort((a, b) => a.orden - b.orden) || [],
      }));
      setRepertorios(sorted);
    }
    setLoading(false);
  };

  const fetchLibrary = async () => {
    setLoadingLibrary(true);
    const { data, error } = await supabase
      .from("obras")
      .select(
        `*, obras_compositores (compositores (apellido, nombre)), obras_palabras_clave (palabras_clave (tag))`
      )
      .order("titulo");
    if (!error && data) {
      const processed = data.map((w) => ({
        ...w,
        compositor_full: getComposers(w),
      }));
      setWorksLibrary(processed);
    }
    setLoadingLibrary(false);
  };

  const autoSyncDrive = async () => {
    setSyncingDrive(true);
    try {
      await supabase.functions.invoke("manage-drive", {
        body: { action: "sync_program", programId: programId },
      });
    } catch (err) {
      console.error("Error auto-syncing Drive:", err);
    } finally {
      setSyncingDrive(false);
    }
  };

  // --- MANEJO DEL REPERTORIO ---
  const startEditBlock = (rep) => {
    setEditingBlock({ id: rep.id, nombre: rep.nombre });
  };
  const saveBlockName = async () => {
    if (!editingBlock.nombre.trim()) return;
    const newRepertorios = repertorios.map((r) =>
      r.id === editingBlock.id ? { ...r, nombre: editingBlock.nombre } : r
    );
    setRepertorios(newRepertorios);
    await supabase
      .from("programas_repertorios")
      .update({ nombre: editingBlock.nombre })
      .eq("id", editingBlock.id);
    setEditingBlock({ id: null, nombre: "" });
  };

  const moveWork = async (repertorioId, workId, direction) => {
    if (!isEditor) return;
    const repIndex = repertorios.findIndex((r) => r.id === repertorioId);
    if (repIndex === -1) return;
    const obras = [...repertorios[repIndex].repertorio_obras];
    const workIndex = obras.findIndex((o) => o.id === workId);
    if (workIndex === -1) return;
    if (direction === -1 && workIndex === 0) return;
    if (direction === 1 && workIndex === obras.length - 1) return;

    const itemA = obras[workIndex];
    const itemB = obras[workIndex + direction];
    const tempOrder = itemA.orden;
    itemA.orden = itemB.orden;
    itemB.orden = tempOrder;
    obras[workIndex] = itemB;
    obras[workIndex + direction] = itemA;

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

  const deleteRepertoireBlock = async (id) => {
    if (!confirm("¿Eliminar bloque y sus obras?")) return;
    const { error } = await supabase
      .from("programas_repertorios")
      .delete()
      .eq("id", id);
    if (!error) {
      await fetchFullRepertoire();
      autoSyncDrive();
    }
  };

  const addWorkToBlock = async (workId) => {
    if (!activeRepertorioId) return;
    const currentRep = repertorios.find((r) => r.id === activeRepertorioId);
    const maxOrder =
      currentRep?.repertorio_obras?.reduce(
        (max, o) => (o.orden > max ? o.orden : max),
        0
      ) || 0;
    await supabase.from("repertorio_obras").insert([
      {
        id_repertorio: activeRepertorioId,
        id_obra: workId,
        orden: maxOrder + 1,
      },
    ]);

    setIsAddModalOpen(false);
    setShowRequestForm(false);
    setWorkFormData({
      id: null,
      titulo: "",
      duracion: "",
      link_drive: "",
      link_youtube: "",
      instrumentacion: "",
      anio: "",
      estado: "",
    });
    setComposerQuery("");
    setSelectedComposer(null);
    setArrangerQuery("");
    setSelectedArranger(null);
    setParticellas([]);

    await fetchFullRepertoire();
    autoSyncDrive();
  };

  const removeWork = async (itemId) => {
    if (!confirm("¿Quitar obra del programa?")) return;
    await supabase.from("repertorio_obras").delete().eq("id", itemId);
    await fetchFullRepertoire();
    autoSyncDrive();
  };

  const addRepertoireBlock = async () => {
    const nombre = prompt("Nombre del bloque (ej: Obertura):", "Nuevo Bloque");
    if (!nombre) return;
    const nextOrder = repertorios.length + 1;
    await supabase
      .from("programas_repertorios")
      .insert([{ id_programa: programId, nombre, orden: nextOrder }]);
    fetchFullRepertoire();
  };

  const updateWorkDetail = async (itemId, field, value) => {
    const newRepertorios = repertorios.map((rep) => ({
      ...rep,
      repertorio_obras: rep.repertorio_obras.map((obra) =>
        obra.id === itemId ? { ...obra, [field]: value } : obra
      ),
    }));
    setRepertorios(newRepertorios);
    await supabase
      .from("repertorio_obras")
      .update({ [field]: value })
      .eq("id", itemId);
  };

  // --- LÓGICA DE PARTICELLAS Y LINKS ---
  const handleAddParts = () => {
    if (!genInstrument || genQuantity < 1) return;
    const selectedInstrObj = instrumentList.find((i) => i.id === genInstrument);
    if (!selectedInstrObj) return;

    const newParts = [];
    const baseName = capitalizeWords(selectedInstrObj.instrumento);

    for (let i = 1; i <= genQuantity; i++) {
      const name = genQuantity > 1 ? `${baseName} ${i}` : baseName;

      newParts.push({
        tempId: Date.now() + i + Math.random(),
        id: null,
        id_instrumento: genInstrument,
        nombre_archivo: name,
        links: [], // Array para múltiples links
        nota_organico: "",
        instrumento_nombre: selectedInstrObj.instrumento,
      });
    }
    setParticellas((prev) => {
      const combined = [...prev, ...newParts];
      return combined.sort((a, b) =>
        a.id_instrumento.localeCompare(b.id_instrumento)
      );
    });
    setGenInstrument("");
    setGenQuantity(1);
  };

  const handleRemovePart = (tempId) => {
    setParticellas((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const handleEditPart = (tempId, field, value) => {
    setParticellas((prev) =>
      prev.map((p) => (p.tempId === tempId ? { ...p, [field]: value } : p))
    );
  };

  // Gestión del Modal de Links
  const openLinkModal = (part) => {
    setEditingLinksId(part.tempId);
    setIsLinkModalOpen(true);
  };

  const handleSaveLinks = (newLinks) => {
    setParticellas((prev) =>
      prev.map((p) =>
        p.tempId === editingLinksId ? { ...p, links: newLinks } : p
      )
    );
  };

  // --- EDICIÓN Y CREACIÓN ---

  const openEditWorkModal = async (item) => {
    const w = item.obras;

    let comp = null;
    let arr = null;

    if (w.obras_compositores) {
      comp =
        w.obras_compositores.find((oc) => oc.rol === "compositor")
          ?.compositores || w.compositores;
      arr = w.obras_compositores.find(
        (oc) => oc.rol === "arreglador"
      )?.compositores;
    }

    setWorkFormData({
      id: w.id,
      titulo: w.titulo,
      duracion: formatSecondsToTime(w.duracion_segundos),
      link_drive: w.link_drive || "",
      link_youtube: w.link_youtube || "",
      instrumentacion: w.instrumentacion || "",
      anio: w.anio_composicion || "",
      estado: w.estado || "Oficial",
    });

    setSelectedComposer(comp);
    setComposerQuery(
      comp
        ? `${comp.apellido}, ${comp.nombre || ""}`
        : w.datos_provisorios?.compositor_texto || ""
    );
    setSelectedArranger(arr);
    setArrangerQuery(arr ? `${arr.apellido}, ${arr.nombre || ""}` : "");

    // Cargar Particellas Existentes
    const { data: existingParts } = await supabase
      .from("obras_particellas")
      .select("*, instrumentos(instrumento)")
      .eq("id_obra", w.id);

    if (existingParts) {
      const mapped = existingParts.map((p) => {
        // Parsear links: puede ser JSON o texto antiguo
        let linksArray = [];
        if (p.url_archivo) {
          try {
            const parsed = JSON.parse(p.url_archivo);
            if (Array.isArray(parsed)) linksArray = parsed;
            else linksArray = [{ description: "Enlace", url: p.url_archivo }]; // Es string simple
          } catch (e) {
            linksArray = [{ description: "Enlace", url: p.url_archivo }]; // Fallo parse, es texto
          }
        }

        return {
          tempId: p.id,
          id: p.id,
          id_instrumento: p.id_instrumento,
          nombre_archivo: p.nombre_archivo,
          links: linksArray,
          nota_organico: p.nota_organico || "",
          instrumento_nombre: p.instrumentos?.instrumento || "Desconocido",
        };
      });
      setParticellas(mapped);
    } else {
      setParticellas([]);
    }

    setIsEditWorkModalOpen(true);
  };

  const handleSaveWork = async () => {
    if (!workFormData.titulo) return alert("Título requerido");
    setLoading(true);

    try {
      let finalComposerId = selectedComposer?.id;
      if (!finalComposerId && composerQuery.trim()) {
        const { data: newComp } = await supabase
          .from("compositores")
          .insert([
            {
              apellido: composerQuery.split(",")[0].trim(),
              nombre: composerQuery.split(",")[1]?.trim() || "",
            },
          ])
          .select()
          .single();
        if (newComp) finalComposerId = newComp.id;
      }

      let finalArrangerId = selectedArranger?.id;
      if (!finalArrangerId && arrangerQuery.trim()) {
        const { data: newArr } = await supabase
          .from("compositores")
          .insert([
            {
              apellido: arrangerQuery.split(",")[0].trim(),
              nombre: arrangerQuery.split(",")[1]?.trim() || "",
            },
          ])
          .select()
          .single();
        if (newArr) finalArrangerId = newArr.id;
      }

      const duracionSegundos = inputToSeconds(workFormData.duracion);
      const anioLimpio = workFormData.anio ? parseInt(workFormData.anio) : null;

      const payload = {
        titulo: workFormData.titulo,
        duracion_segundos: isNaN(duracionSegundos) ? 0 : duracionSegundos,
        link_drive: workFormData.link_drive || null,
        link_youtube: workFormData.link_youtube || null,
        instrumentacion: workFormData.instrumentacion || null,
        anio_composicion: isNaN(anioLimpio) ? null : anioLimpio,
        estado: workFormData.estado,
      };

      let targetWorkId = workFormData.id;

      if (!workFormData.id) {
        // CREATE
        const {
          data: { user },
        } = await supabase.auth.getUser();
        payload.estado = "Solicitud";
        payload.solicitado_por = user?.id;

        const { data: newWork, error } = await supabase
          .from("obras")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        targetWorkId = newWork.id;

        await linkComposers(newWork.id, finalComposerId, finalArrangerId);
        await addWorkToBlock(newWork.id);
      } else {
        // UPDATE
        const { error } = await supabase
          .from("obras")
          .update(payload)
          .eq("id", workFormData.id);
        if (error) throw error;

        await supabase
          .from("obras_compositores")
          .delete()
          .eq("id_obra", workFormData.id);
        await linkComposers(workFormData.id, finalComposerId, finalArrangerId);

        setIsEditWorkModalOpen(false);
        fetchFullRepertoire();
      }

      // --- GESTIÓN DE PARTICELLAS ---
      if (targetWorkId) {
        const { data: currentDbParts } = await supabase
          .from("obras_particellas")
          .select("id")
          .eq("id_obra", targetWorkId);
        const currentDbIds = currentDbParts
          ? currentDbParts.map((p) => p.id)
          : [];

        const stateIds = new Set(particellas.map((p) => p.id).filter(Boolean));
        const idsToDelete = currentDbIds.filter((id) => !stateIds.has(id));

        if (idsToDelete.length > 0) {
          await supabase
            .from("obras_particellas")
            .delete()
            .in("id", idsToDelete);
        }

        const toInsert = [];
        const toUpdate = [];

        particellas.forEach((p) => {
          const rowData = {
            id_obra: targetWorkId,
            id_instrumento: p.id_instrumento,
            nombre_archivo: p.nombre_archivo,
            nota_organico: p.nota_organico,
            url_archivo: JSON.stringify(p.links), // Guardamos como JSON string
          };

          if (p.id) {
            toUpdate.push({ id: p.id, ...rowData });
          } else {
            toInsert.push(rowData);
          }
        });

        if (toInsert.length > 0) {
          await supabase.from("obras_particellas").insert(toInsert);
        }

        if (toUpdate.length > 0) {
          await Promise.all(
            toUpdate.map((p) =>
              supabase
                .from("obras_particellas")
                .update({
                  nombre_archivo: p.nombre_archivo,
                  nota_organico: p.nota_organico,
                  url_archivo: p.url_archivo,
                })
                .eq("id", p.id)
            )
          );
        }
      }
    } catch (error) {
      alert("Error al guardar: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const linkComposers = async (workId, compId, arrId) => {
    const links = [];
    if (compId)
      links.push({ id_obra: workId, id_compositor: compId, rol: "compositor" });
    if (arrId)
      links.push({ id_obra: workId, id_compositor: arrId, rol: "arreglador" });
    if (links.length > 0)
      await supabase.from("obras_compositores").insert(links);
  };

  // --- UTILIDADES DE RENDER ---
  const getComposers = (obra) => {
    if (obra.estado !== "Oficial" && !obra.obras_compositores?.length) {
      return obra.datos_provisorios?.compositor_texto || "S/D";
    }
    if (obra.obras_compositores?.length > 0) {
      const list = obra.obras_compositores.filter(
        (oc) => oc.rol === "compositor" || !oc.rol
      );
      if (list.length > 0)
        return list
          .map(
            (oc) =>
              `${oc.compositores?.apellido}, ${oc.compositores?.nombre || ""}`
          )
          .join(" / ");
    }
    return obra.compositores
      ? `${obra.compositores.apellido}, ${obra.compositores.nombre || ""}`
      : "Anónimo";
  };

  const getArranger = (obra) => {
    const arr = obra.obras_compositores?.find((oc) => oc.rol === "arreglador");
    return arr ? `${arr.compositores.apellido}` : "-";
  };

  const filteredLibrary = worksLibrary.filter((work) => {
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
    return true;
  });

  const filteredComposers = composersList.filter((c) =>
    `${c.apellido}, ${c.nombre || ""}`
      .toLowerCase()
      .includes(composerQuery.toLowerCase())
  );
  const filteredArrangers = composersList.filter((c) =>
    `${c.apellido}, ${c.nombre || ""}`
      .toLowerCase()
      .includes(arrangerQuery.toLowerCase())
  );

  const containerClasses = isCompact ? "bg-white" : "space-y-8";
  const headerClasses = isCompact
    ? "bg-slate-50 p-2 border-b border-slate-200"
    : "bg-indigo-100/50 p-2 border-b border-slate-300";
  const tableHeaderClasses = isCompact
    ? "hidden"
    : "bg-blue-200 text-slate-700 border-b-2 border-slate-400 font-bold uppercase tracking-tight";

  // --- RENDER FORM ---
  const renderWorkForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
          Título de la Obra
        </label>
        <textarea
          rows={2}
          className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          value={workFormData.titulo}
          onChange={(e) =>
            setWorkFormData({ ...workFormData, titulo: e.target.value })
          }
          placeholder="Ej: Sinfonía n.5"
        />
      </div>

      {workFormData.id && (
        <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded border border-indigo-100">
          <input
            type="checkbox"
            id="acquiredCheck"
            checked={workFormData.estado === "Oficial"}
            onChange={(e) =>
              setWorkFormData({
                ...workFormData,
                estado: e.target.checked ? "Oficial" : "Solicitud",
              })
            }
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <label
            htmlFor="acquiredCheck"
            className="text-xs font-bold text-indigo-800 cursor-pointer select-none"
          >
            Obra Adquirida / En Archivo (Quitar etiqueta "Pendiente")
          </label>
        </div>
      )}

      <div className="relative">
        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
          Compositor
        </label>
        {selectedComposer ? (
          <div className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-bold">
            <span>
              {selectedComposer.apellido}, {selectedComposer.nombre}
            </span>
            <button
              onClick={() => {
                setSelectedComposer(null);
                setComposerQuery("");
              }}
              className="text-indigo-400 hover:text-indigo-900"
            >
              <IconX size={16} />
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              value={composerQuery}
              onChange={(e) => {
                setComposerQuery(e.target.value);
                setShowComposerOptions(true);
              }}
              onFocus={() => setShowComposerOptions(true)}
              placeholder="Buscar o crear..."
            />
            {showComposerOptions && composerQuery && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
                {filteredComposers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedComposer(c);
                      setShowComposerOptions(false);
                      setComposerQuery("");
                    }}
                    className="p-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <span className="font-bold text-slate-700">
                      {c.apellido}
                    </span>
                    , <span className="text-slate-500">{c.nombre}</span>
                  </div>
                ))}
                {filteredComposers.length === 0 && (
                  <div className="p-3 text-center text-slate-500 text-xs italic">
                    Se creará:{" "}
                    <span className="font-bold text-indigo-600">
                      "{composerQuery}"
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative">
        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
          Arreglador
        </label>
        {selectedArranger ? (
          <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 font-bold">
            <span>
              {selectedArranger.apellido}, {selectedArranger.nombre}
            </span>
            <button
              onClick={() => {
                setSelectedArranger(null);
                setArrangerQuery("");
              }}
              className="text-emerald-400 hover:text-emerald-900"
            >
              <IconX size={16} />
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
              value={arrangerQuery}
              onChange={(e) => {
                setArrangerQuery(e.target.value);
                setShowArrangerOptions(true);
              }}
              onFocus={() => setShowArrangerOptions(true)}
              placeholder="Buscar o crear..."
            />
            {showArrangerOptions && arrangerQuery && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
                {filteredArrangers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedArranger(c);
                      setShowArrangerOptions(false);
                      setArrangerQuery("");
                    }}
                    className="p-2 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <span className="font-bold text-slate-700">
                      {c.apellido}
                    </span>
                    , <span className="text-slate-500">{c.nombre}</span>
                  </div>
                ))}
                {filteredArrangers.length === 0 && (
                  <div className="p-3 text-center text-slate-500 text-xs italic">
                    Se creará:{" "}
                    <span className="font-bold text-emerald-600">
                      "{arrangerQuery}"
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
            Instrumentación
          </label>
          <input
            type="text"
            className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
            value={workFormData.instrumentacion}
            onChange={(e) =>
              setWorkFormData({
                ...workFormData,
                instrumentacion: e.target.value,
              })
            }
            placeholder="Ej: 2.2.2.2"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
            Duración (mm:ss)
          </label>
          <input
            type="text"
            className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            value={workFormData.duracion}
            onChange={(e) =>
              setWorkFormData({ ...workFormData, duracion: e.target.value })
            }
            placeholder="00:00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
            Año
          </label>
          <input
            type="text"
            className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
            value={workFormData.anio}
            onChange={(e) =>
              setWorkFormData({ ...workFormData, anio: e.target.value })
            }
            placeholder="Ej: 1804"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
            Link Youtube
          </label>
          <input
            type="text"
            className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500 outline-none"
            value={workFormData.link_youtube}
            onChange={(e) =>
              setWorkFormData({ ...workFormData, link_youtube: e.target.value })
            }
            placeholder="https://youtube..."
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
          Link Drive
        </label>
        <input
          type="text"
          className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          value={workFormData.link_drive}
          onChange={(e) =>
            setWorkFormData({ ...workFormData, link_drive: e.target.value })
          }
          placeholder="https://drive..."
        />
      </div>

      {/* --- SECCIÓN GENERADOR DE PARTICELLAS --- */}
      <div className="pt-4 border-t border-slate-100 mt-4">
        <h3 className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex justify-between items-center">
          <span>Instrumentación / Partes</span>
          {particellas.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[9px]">
              {particellas.length} partes
            </span>
          )}
        </h3>

        <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-2 flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
              Instrumento
            </label>
            <select
              className="w-full border p-1.5 text-xs rounded"
              value={genInstrument}
              onChange={(e) => setGenInstrument(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {instrumentList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.instrumento}
                </option>
              ))}
            </select>
          </div>
          <div className="w-16">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
              Cant.
            </label>
            <input
              type="number"
              min="1"
              className="w-full border p-1.5 text-xs rounded text-center"
              value={genQuantity}
              onChange={(e) => setGenQuantity(parseInt(e.target.value) || 1)}
            />
          </div>
          <button
            type="button"
            onClick={handleAddParts}
            disabled={!genInstrument}
            className="bg-indigo-600 text-white p-1.5 rounded disabled:opacity-50"
          >
            <IconPlus size={16} />
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {particellas.map((part) => (
            <div
              key={part.tempId}
              className="flex items-center gap-2 p-1 border border-slate-100 bg-white rounded group"
            >
              {/* ID Instrumento */}
              <span
                className="w-6 h-6 rounded-full bg-slate-100 text-[9px] flex items-center justify-center font-bold text-slate-500 shrink-0 cursor-help"
                title={part.instrumento_nombre}
              >
                {part.id_instrumento}
              </span>

              {/* Nombre Parte */}
              <input
                type="text"
                className="flex-1 text-xs border-none p-0 focus:ring-0 text-slate-700 bg-transparent font-medium"
                value={part.nombre_archivo}
                onChange={(e) =>
                  handleEditPart(part.tempId, "nombre_archivo", e.target.value)
                }
                placeholder="Nombre parte..."
              />

              {/* Nota Orgánico (Nueva columna) */}
              <input
                type="text"
                className="w-12 text-[10px] border-b border-dashed border-slate-300 focus:border-indigo-500 bg-transparent text-center focus:ring-0 px-0 placeholder:text-slate-200 text-slate-500"
                placeholder="N. Org."
                value={part.nota_organico || ""}
                onChange={(e) =>
                  handleEditPart(part.tempId, "nota_organico", e.target.value)
                }
                title="Nota para el cálculo de orgánico (ej: +Picc)"
              />

              {/* Botón Links */}
              <button
                onClick={() => openLinkModal(part)}
                className={`p-1 rounded transition-colors ${
                  part.links && part.links.length > 0
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-300 hover:text-blue-500"
                }`}
                title={`${part.links?.length || 0} enlace(s)`}
              >
                <IconLink size={14} />
              </button>

              {/* Borrar */}
              <button
                onClick={() => handleRemovePart(part.tempId)}
                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              >
                <IconTrash size={12} />
              </button>
            </div>
          ))}
          {particellas.length === 0 && (
            <div className="text-center text-[10px] text-slate-300 italic py-2">
              No se han agregado partes
            </div>
          )}
        </div>
      </div>

      {/* MODAL INTERNO DE LINKS */}
      <LinksManagerModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setEditingLinksId(null);
        }}
        links={
          particellas.find((p) => p.tempId === editingLinksId)?.links || []
        }
        partName={
          particellas.find((p) => p.tempId === editingLinksId)?.nombre_archivo
        }
        onSave={handleSaveLinks}
      />
    </div>
  );

  return (
    <div className={containerClasses}>
      {!isCompact && (
        <div className="flex justify-between items-center mb-4">
          <div>
            {syncingDrive && (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 animate-pulse">
                <IconLoader size={10} className="animate-spin" /> Sincronizando
                Drive...
              </span>
            )}
          </div>
          {isEditor && (
            <button
              onClick={addRepertoireBlock}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-2"
            >
              <IconPlus size={16} /> Nuevo Bloque
            </button>
          )}
        </div>
      )}

      {repertorios.length === 0 && !loading && (
        <div className="text-center py-4 text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
          Sin repertorio asignado.
          {isCompact && isEditor && (
            <button
              onClick={addRepertoireBlock}
              className="ml-2 text-indigo-600 font-bold hover:underline"
            >
              Agregar Bloque
            </button>
          )}
        </div>
      )}

      {repertorios.map((rep) => (
        <div
          key={rep.id}
          className={`border border-slate-200 ${
            isCompact
              ? "mb-4 rounded-lg overflow-hidden shadow-sm"
              : "shadow-sm bg-white"
          }`}
        >
          <div
            className={`${headerClasses} flex justify-between items-center h-10`}
          >
            <div className="flex items-center gap-2 flex-1">
              <IconMusic size={14} className="text-indigo-600 shrink-0" />
              {editingBlock.id === rep.id ? (
                <input
                  type="text"
                  autoFocus
                  className="w-full text-xs p-1 border border-indigo-300 rounded outline-none"
                  value={editingBlock.nombre}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, nombre: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveBlockName();
                  }}
                  onBlur={saveBlockName}
                />
              ) : (
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2 group/title cursor-default">
                  {rep.nombre}
                  {isEditor && (
                    <button
                      onClick={() => startEditBlock(rep)}
                      className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5"
                    >
                      <IconEdit size={12} />
                    </button>
                  )}
                </h3>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-white/50 px-1.5 rounded border border-slate-200">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1100px]">
              <thead className={tableHeaderClasses}>
                <tr>
                  <th className="p-1 w-8 text-center">#</th>
                  <th className="p-1 w-8 text-center">GD</th>
                  <th className="p-1 w-32">Compositor</th>
                  <th className="p-1 w-72">Obra</th>
                  <th className="p-1 w-20 text-center">Instr.</th>
                  <th className="p-1 w-12 text-center">Dur.</th>
                  <th className="p-1 w-24">Solista</th>
                  <th className="p-1 w-24">Arr.</th>
                  <th className="p-1">Notas</th>
                  <th className="p-1 w-8 text-center">YT</th>
                  <th className="p-1 w-16 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rep.repertorio_obras.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-yellow-50 transition-colors group text-slate-700 align-top"
                  >
                    <td className="p-1 text-center bg-slate-50/50">
                      <div className="flex flex-col items-center justify-center pt-1">
                        {!isCompact && isEditor && (
                          <button
                            onClick={() => moveWork(rep.id, item.id, -1)}
                            className="text-slate-300 hover:text-indigo-600 disabled:opacity-0 p-0.5"
                            disabled={idx === 0}
                          >
                            <IconChevronDown size={8} className="rotate-180" />
                          </button>
                        )}
                        <span className="font-bold text-[10px] text-slate-500">
                          {idx + 1}
                        </span>
                        {!isCompact && isEditor && (
                          <button
                            onClick={() => moveWork(rep.id, item.id, 1)}
                            className="text-slate-300 hover:text-indigo-600 disabled:opacity-0 p-0.5"
                            disabled={idx === rep.repertorio_obras.length - 1}
                          >
                            <IconChevronDown size={8} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-1 text-center pt-2">
                      {item.google_drive_shortcut_id ? (
                        <IconDrive className="w-3.5 h-3.5 mx-auto" />
                      ) : item.obras.link_drive ? (
                        <a
                          href={item.obras.link_drive}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-2 h-2 bg-amber-400 rounded-full mx-auto"
                          title="Link externo"
                        ></a>
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
                    </td>
                    <td
                      className="p-1 truncate font-medium text-slate-600 pt-2"
                      title={getComposers(item.obras)}
                    >
                      {getComposers(item.obras)}
                    </td>

                    <td
                      className={`p-1 font-bold text-slate-800 ${
                        isCompact ? "col-span-2" : ""
                      }`}
                      title={item.obras.titulo}
                    >
                      <div className="flex flex-wrap items-start gap-1.5">
                        <span className="whitespace-normal leading-tight">
                          {item.obras.titulo}
                        </span>
                        {item.obras.estado !== "Oficial" && (
                          <span className="shrink-0 text-[8px] bg-amber-100 text-amber-700 px-1 rounded border border-amber-200 mt-0.5 select-none">
                            PEND
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-1 text-center truncate text-[10px] text-slate-500 pt-2">
                      {item.obras.instrumentacion ||
                        calculateInstrumentation(
                          item.obras.obras_particellas?.map((p) => ({
                            nombre_archivo: p.nombre_archivo,
                            nota_organico: p.nota_organico,
                            instrumento_nombre: p.instrumentos?.instrumento,
                          }))
                        ) ||
                        "-"}
                    </td>
                    <td className="p-1 text-center font-mono text-[10px] pt-2">
                      {formatSecondsToTime(item.obras.duracion_segundos)}
                    </td>
                    <td className="p-0 border-l border-slate-100">
                      {isEditor && !isCompact ? (
                        <select
                          className="w-full bg-transparent p-1 text-[10px] outline-none text-slate-600 pt-2"
                          value={item.id_solista || ""}
                          onChange={(e) =>
                            updateWorkDetail(
                              item.id,
                              "id_solista",
                              e.target.value || null
                            )
                          }
                        >
                          <option value="">-</option>
                          {musicians.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.apellido}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="block p-1 text-[10px] truncate pt-2">
                          {item.integrantes
                            ? `${item.integrantes.apellido}`
                            : "-"}
                        </span>
                      )}
                    </td>
                    <td className="p-1 truncate text-[10px] text-slate-500 pt-2">
                      {getArranger(item.obras)}
                    </td>
                    <td className="p-0 border-l border-slate-100">
                      {isEditor && !isCompact ? (
                        <input
                          type="text"
                          className="w-full bg-transparent p-1 text-[10px] outline-none placeholder:text-slate-200 pt-2"
                          placeholder="..."
                          value={item.notas_especificas || ""}
                          onChange={(e) =>
                            updateWorkDetail(
                              item.id,
                              "notas_especificas",
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        <span
                          className="block p-1 text-[10px] truncate text-slate-500 pt-2"
                          title={item.notas_especificas}
                        >
                          {item.notas_especificas || ""}
                        </span>
                      )}
                    </td>
                    <td className="p-1 text-center pt-2">
                      {item.obras.link_youtube ? (
                        <a
                          href={item.obras.link_youtube}
                          target="_blank"
                          rel="noreferrer"
                          className="text-red-600 hover:text-red-800"
                        >
                          <IconYoutube size={14} />
                        </a>
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
                    </td>
                    <td className="p-1 text-right pt-2">
                      <div className="flex justify-end gap-1 items-center">
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
                              onClick={() => openEditWorkModal(item)}
                              className="text-slate-300 hover:text-indigo-600 p-1"
                              title="Editar Obra"
                            >
                              <IconEdit size={12} />
                            </button>
                            <button
                              onClick={() => removeWork(item.id)}
                              className="text-slate-300 hover:text-red-600 p-1"
                              title="Quitar"
                            >
                              <IconX size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditor && (
            <div className="bg-slate-50 border-t border-slate-200 p-1">
              <button
                onClick={() => {
                  setActiveRepertorioId(rep.id);
                  setIsAddModalOpen(true);
                }}
                className="w-full py-1 text-slate-400 hover:text-indigo-600 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors"
              >
                <IconPlus size={10} /> Agregar Obra
              </button>
            </div>
          )}
        </div>
      ))}

      {isAddModalOpen && isEditor && (
        <ModalPortal>
          <div className="bg-white w-full max-w-3xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <IconSearch size={18} /> Buscar Obra
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={20} />
              </button>
            </div>
            {!showRequestForm ? (
              <>
                <div className="p-2 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-2 bg-white shrink-0">
                  <div className="relative">
                    <IconSearch
                      className="absolute left-2 top-2.5 text-slate-400"
                      size={14}
                    />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Título..."
                      className="w-full pl-7 p-1.5 border rounded text-xs bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                      value={filters.titulo}
                      onChange={(e) =>
                        setFilters({ ...filters, titulo: e.target.value })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Compositor..."
                    className="w-full p-1.5 border rounded text-xs bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
                    value={filters.compositor}
                    onChange={(e) =>
                      setFilters({ ...filters, compositor: e.target.value })
                    }
                  />
                  <button
                    onClick={() => {
                      setShowRequestForm(true);
                      setWorkFormData({
                        id: null,
                        titulo: "",
                        duracion: "",
                        link_drive: "",
                        link_youtube: "",
                        instrumentacion: "",
                        anio: "",
                        estado: "",
                      });
                      setSelectedComposer(null);
                      setComposerQuery("");
                      setSelectedArranger(null);
                      setArrangerQuery("");
                      setParticellas([]);
                    }}
                    className="bg-indigo-600 text-white px-3 rounded text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1"
                  >
                    <IconPlus size={12} /> Crear Solicitud
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadingLibrary ? (
                    <div className="p-8 text-center text-indigo-600">
                      <IconLoader className="animate-spin inline" />
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase sticky top-0 font-bold">
                        <tr>
                          <th className="p-2">Obra</th>
                          <th className="p-2">Compositor</th>
                          <th className="p-2 text-center">Duración</th>
                          <th className="p-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLibrary.map((work) => (
                          <tr
                            key={work.id}
                            className="hover:bg-indigo-50 transition-colors group"
                          >
                            <td className="p-2 font-medium text-slate-700">
                              {work.titulo}
                            </td>
                            <td className="p-2 text-slate-500">
                              {work.compositor_full}
                            </td>
                            <td className="p-2 text-center font-mono text-[10px] text-slate-400">
                              {formatSecondsToTime(work.duracion_segundos)}
                            </td>
                            <td className="p-2 text-right">
                              <button
                                onClick={() => addWorkToBlock(work.id)}
                                className="bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
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
              </>
            ) : (
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50">
                <div className="max-w-lg mx-auto bg-white p-5 rounded-xl border shadow-sm text-sm">
                  <h4 className="font-bold text-base text-indigo-900 mb-4 flex items-center gap-2">
                    <IconAlertCircle className="text-amber-500" /> Solicitud de
                    Obra
                  </h4>
                  {renderWorkForm()}
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => setShowRequestForm(false)}
                      className="flex-1 py-2 border rounded hover:bg-slate-50 text-slate-600 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveWork}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <IconLoader className="animate-spin" />
                      ) : (
                        <IconCheck />
                      )}{" "}
                      Crear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalPortal>
      )}

      {isEditWorkModalOpen && isEditor && (
        <ModalPortal>
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <IconEdit className="text-indigo-600" /> Editar Obra
              </h3>
              <button
                onClick={() => setIsEditWorkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={20} />
              </button>
            </div>
            {renderWorkForm()}
            <div className="flex gap-2 mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsEditWorkModalOpen(false)}
                className="flex-1 py-2 border rounded hover:bg-slate-50 text-slate-600 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWork}
                className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <IconLoader className="animate-spin" />
                ) : (
                  <IconCheck />
                )}{" "}
                Guardar Cambios
              </button>
            </div>
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
    </div>
  );
}
