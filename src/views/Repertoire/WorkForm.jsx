import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IconMusic,
  IconPlus,
  IconLoader,
  IconCheck,
  IconX,
  IconLink,
  IconList,
  IconUser,
  IconInfo,
  IconBold,
  IconItalic,
  IconTrash,
  IconUnderline,
  IconYoutube,
  IconCalendar,
  IconFileText,
  IconMessageSquare,
  IconUserPlus,
  IconCopy,
  IconAlertCircle,
  IconEdit,
  IconFolder,
} from "../../components/ui/Icons";
import { formatSecondsToTime, inputToSeconds } from "../../utils/time";
import { useAuth } from "../../context/AuthContext";
import { calculateInstrumentation } from "../../utils/instrumentation";
import DriveMatcherModal from "../../components/repertoire/DriveMatcherModal";
import LinksManagerModal from "../../components/repertoire/LinksManagerModal";
import BowingSetManager from "../../components/repertoire/BowingSetManager";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { INSTRUMENT_GROUPS } from "../../utils/instrumentGroups";
import { toast } from "sonner";
import DateInput from "../../components/ui/DateInput";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback";

// --- COMPONENTE EDITOR WYSIWYG ---
const WysiwygEditor = ({ value, onChange, placeholder, className = "", fillHeight = false }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Establecer formato neutro por defecto al montar
    document.execCommand("defaultParagraphSeparator", false, "div");
    // Sincronizar siempre que cambie value (p. ej. al aplicar sugerencia de título) para que la vista se actualice
    if (editorRef.current && value !== undefined) {
      const next = value ?? "";
      if (editorRef.current.innerHTML !== next) {
        editorRef.current.innerHTML = next;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const execCmd = (command, val = null) => {
    document.execCommand(command, false, val);
    editorRef.current.focus();
  };

  // Limpiar formato al pegar para evitar tamaños gigantes o fuentes extrañas
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === "b") { e.preventDefault(); execCmd("bold"); }
      if (key === "i") { e.preventDefault(); execCmd("italic"); }
      if (key === "u") { e.preventDefault(); execCmd("underline"); }
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-shadow bg-white/95 flex flex-col relative ${fillHeight ? "h-full min-h-0" : ""} ${isFocused ? "ring-2 ring-indigo-500 border-indigo-500" : "border-slate-300"} ${className}`}>
      <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 p-1.5 select-none shrink-0">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd("bold"); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-600">
          <IconBold size={14} />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd("italic"); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-600">
          <IconItalic size={14} />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd("insertUnorderedList"); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-600">
          <IconList size={14} />
        </button>
        {/* Botón para resetear formato si algo queda raro */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); execCmd("removeFormat"); }} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 ml-auto" title="Limpiar formato">
          <IconX size={14} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`flex-1 p-3 text-sm outline-none overflow-y-auto min-h-[80px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline leading-relaxed ${
          fillHeight ? "min-h-0 max-h-none" : "max-h-[min(18rem,50vh)]"
        }`}
      />
      {!value && !isFocused && (
        <div className="absolute top-[46px] left-3 text-slate-400 text-sm pointer-events-none italic">
          {placeholder}
        </div>
      )}
    </div>
  );
};

// --- MODAL NUEVO COMPOSITOR (fuera de WorkForm para no perder estado/foco en re-renders) ---
export function QuickComposerModal({ isOpen, onClose, onCreated, supabase }) {
  const [data, setData] = useState({
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    fecha_defuncion: "",
    id_pais: null,
  });
  const [loading, setLoading] = useState(false);
  const [paisesOptions, setPaisesOptions] = useState([]);

  useEffect(() => {
    if (isOpen && supabase) {
      supabase
        .from("paises")
        .select("id, nombre")
        .order("nombre")
        .then(({ data: list }) => {
          if (list) setPaisesOptions(list.map((p) => ({ id: p.id, label: p.nombre })));
        });
    }
  }, [isOpen, supabase]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!data.apellido) return alert("El apellido es obligatorio");
    setLoading(true);
    const payload = {
      nombre: data.nombre.trim() || null,
      apellido: data.apellido.trim(),
      id_pais: data.id_pais ? Number(data.id_pais) : null,
      fecha_nacimiento: (data.fecha_nacimiento || "").trim() || null,
      fecha_defuncion: (data.fecha_defuncion || "").trim() || null,
    };
    const { data: newComp, error } = await supabase
      .from("compositores")
      .insert([payload])
      .select()
      .single();

    setLoading(false);
    if (!error && newComp) {
      onCreated(newComp);
      setData({ nombre: "", apellido: "", fecha_nacimiento: "", fecha_defuncion: "", id_pais: null });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <IconUserPlus size={18} className="text-indigo-600" /> Nuevo
          Compositor
        </h3>
        <div className="space-y-3">
          <input
            className="input text-sm"
            placeholder="Apellido (Obligatorio)"
            value={data.apellido}
            onChange={(e) => setData((prev) => ({ ...prev, apellido: e.target.value }))}
            autoFocus
          />
          <input
            className="input text-sm"
            placeholder="Nombre"
            value={data.nombre}
            onChange={(e) => setData((prev) => ({ ...prev, nombre: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <DateInput
              label="Nacimiento (opc.)"
              value={data.fecha_nacimiento || ""}
              onChange={(v) => setData((prev) => ({ ...prev, fecha_nacimiento: v }))}
              className="border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
            <DateInput
              label="Defunción (opc.)"
              value={data.fecha_defuncion || ""}
              onChange={(v) => setData((prev) => ({ ...prev, fecha_defuncion: v }))}
              className="border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-0.5 block">País (opc.)</label>
            <SearchableSelect
              options={paisesOptions}
              value={data.id_pais}
              onChange={(id) => setData((prev) => ({ ...prev, id_pais: id }))}
              placeholder="Seleccionar país..."
              isMulti={false}
              className="text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !data.apellido}
            className="flex-1 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "..." : "Crear y Vincular"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- UTILIDADES ---
const capitalizeWords = (str) =>
  !str ? "" : str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

const getYoutubeVideoId = (url) => {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#&?]+)/);
  return m ? m[1] : null;
};

/** Barra superior del formulario, estilo MusicianForm (condición) */
const getEstadoHeaderClass = (estado) => {
  const m = {
    Solicitud: "bg-amber-600",
    Pendiente: "bg-slate-600",
    "Para arreglar": "bg-amber-700",
    Entregado: "bg-sky-600",
    Informativo: "bg-blue-600",
    Oficial: "bg-emerald-600",
  };
  return m[estado] || "bg-slate-600";
};

/** Fondo/borde del bloque formulario según estado (p. ej. Oficial) */
const getEstadoShellClass = (estado) => {
  if (estado === "Oficial") {
    return "bg-emerald-50/90 border-emerald-200/80";
  }
  return "bg-white border-slate-200";
};

// --- COMPONENTE PRINCIPAL ---
export default function WorkForm({
  supabase,
  formData: initialData,
  onCancel,
  onSave,
  catalogoInstrumentos,
  context = "archive", // "archive" (RepertoireView) | "program" (RepertoireManager)
  onInsertExistingWork, // opcional: insertar obra ya existente en bloque de repertorio
}) {
  const { user } = useAuth();
  const isProgramContext = context === "program";
  const DEFAULT_ARREGLADOR_INTEGRANTE_ID = 4340365;

  const [formData, setFormData] = useState({
    id: null,
    titulo: "",
    duracion: "",
    link_drive: "",
    link_youtube: "",
    instrumentacion: "",
    anio: "",
    estado: "Solicitud",
    id_arreglador: null,
    id_integrante_arreglador: null,
    fecha_esperada: "",
    comentarios: "",
    observaciones: "",
  });
  const [isQuickCompOpen, setIsQuickCompOpen] = useState(false);
  const [quickCompType, setQuickCompType] = useState("compositor"); // o "arreglador"
  const [selectedComposers, setSelectedComposers] = useState([]);
  const [selectedArrangers, setSelectedArrangers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [particellas, setParticellas] = useState([]);
  const [instrumentList, setInstrumentList] = useState(
    catalogoInstrumentos || [],
  );
  const [composersOptions, setComposersOptions] = useState([]);
  const [integrantesArregladorOptions, setIntegrantesArregladorOptions] = useState([]);
  const [tagsOptions, setTagsOptions] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [genInstrument, setGenInstrument] = useState("");
  const [genQuantity, setGenQuantity] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [showInstrumentOptions, setShowInstrumentOptions] = useState(false);
  const [showDriveMatcher, setShowDriveMatcher] = useState(false);
  const [showDriveField, setShowDriveField] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinksId, setEditingLinksId] = useState(null);
  const instrumentInputRef = useRef(null);
  // Auto-enrichment: YouTube suggestions and year
  const [youtubeSuggestions, setYoutubeSuggestions] = useState([]);
  const [loadingYouTube, setLoadingYouTube] = useState(false);
  const [loadingYear, setLoadingYear] = useState(false);
  const [suggestedYear, setSuggestedYear] = useState(null);
  const [loadingTitleSuggestions, setLoadingTitleSuggestions] = useState(false);
  const [suggestedTitleWithMovements, setSuggestedTitleWithMovements] = useState(null);
  const [showYoutubePopover, setShowYoutubePopover] = useState(false);
  const enrichmentTriggerRef = useRef(null);
  const fieldStatusResetRef = useRef(null);
  /** Evita que guardados async antiguos pisen `nota_organico` u otros campos al escribir rápido. */
  const partsSaveGenerationRef = useRef(0);
  const partsPendingPersistRef = useRef(0);
  const [fieldStatus, setFieldStatus] = useState({
    titulo: "idle",
    anio: "idle",
    duracion: "idle",
    link_youtube: "idle",
    link_drive: "idle",
    instrumentacion: "idle",
    observaciones: "idle",
  });
  const [duplicateWorks, setDuplicateWorks] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const handleQuickCompCreated = (newComp) => {
    const newOption = {
      id: newComp.id,
      label: `${newComp.apellido}, ${newComp.nombre}`,
    };

    // 1. Actualizar la lista de opciones para que aparezca en los Selects
    setComposersOptions((prev) =>
      [...prev, newOption].sort((a, b) => a.label.localeCompare(b.label)),
    );

    // 2. Vincularlo automáticamente según el tipo que abrió el modal
    if (quickCompType === "compositor") {
      const next = [...selectedComposers, newComp.id];
      setSelectedComposers(next);
      if (formData.id) updateComposerRelations("compositor", next);
    } else {
      const next = [...selectedArrangers, newComp.id];
      setSelectedArrangers(next);
      if (formData.id) updateComposerRelations("arreglador", next);
    }
    toast.success("Compositor creado y vinculado");
  };
  const fetchIntegrantesArreglador = async () => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, mail")
      .order("apellido");
    if (data)
      setIntegrantesArregladorOptions(
        data.map((i) => ({ id: i.id, label: `${i.apellido || ""}, ${i.nombre || ""}`.trim() || `ID ${i.id}`, mail: i.mail })),
      );
  };

  useEffect(() => {
    if (instrumentList.length === 0) fetchInstruments();
    fetchComposers();
    fetchIntegrantesArreglador();
    fetchTagsOptions();
    if (initialData?.id) {
      fetchParticellas(initialData.id);
      fetchWorkDetails(initialData.id);
    } else if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData?.id]);

  const fetchWorkDetails = async (workId) => {
    const { data } = await supabase
      .from("obras")
      .select(
        "*, obras_compositores(rol, id_compositor), obras_palabras_clave (palabras_clave (id, tag))",
      )
      .eq("id", workId)
      .single();

    if (data) {
      const idIntArreglador =
        data.estado === "Para arreglar" && (data.id_integrante_arreglador == null || data.id_integrante_arreglador === "")
          ? DEFAULT_ARREGLADOR_INTEGRANTE_ID
          : data.id_integrante_arreglador;
      setFormData({
        ...data,
        duracion: data.duracion_segundos
          ? formatSecondsToTime(data.duracion_segundos)
          : "",
        anio: data.anio_composicion || "",
        fecha_esperada: data.fecha_esperada || "",
        id_integrante_arreglador: idIntArreglador,
      });
      setSelectedComposers(
        data.obras_compositores
          .filter((oc) => oc.rol === "compositor")
          .map((oc) => oc.id_compositor),
      );
      setSelectedArrangers(
        data.obras_compositores
          .filter((oc) => oc.rol === "arreglador")
          .map((oc) => oc.id_compositor),
      );
      setSelectedTags(
        (data.obras_palabras_clave || [])
          .map((opc) => opc.palabras_clave?.id)
          .filter(Boolean),
      );
    }
  };

  const fetchInstruments = async () => {
    const { data } = await supabase
      .from("instrumentos")
      .select("id, instrumento")
      .order("id");
    if (data) setInstrumentList(data);
  };

  const fetchComposers = async () => {
    const { data } = await supabase
      .from("compositores")
      .select("id, nombre, apellido")
      .order("apellido");
    if (data)
      setComposersOptions(
        data.map((c) => ({ id: c.id, label: `${c.apellido}, ${c.nombre}` })),
      );
  };

  const fetchTagsOptions = async () => {
    const { data } = await supabase
      .from("palabras_clave")
      .select("id, tag")
      .order("tag");
    if (data) setTagsOptions(data);
  };

  // --- Auto-enrichment: título + compositor → YouTube suggestions + year ---
  const stripHtml = (html) =>
    (html || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
  const parseDurationToSeconds = (value) => {
    if (value == null) return null;
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    const str = String(value).trim();
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    // ISO 8601 (e.g. PT5M30S, PT1H2M10S)
    const iso = str.toUpperCase().match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (iso) {
      const h = parseInt(iso[1] || "0", 10);
      const m = parseInt(iso[2] || "0", 10);
      const s = parseInt(iso[3] || "0", 10);
      return h * 3600 + m * 60 + s;
    }
    return null;
  };

  const fetchYoutubeSuggestions = useCallback(
    async (titulo, compositorLabel) => {
      const query = `${titulo} - ${compositorLabel} Score-Video`.trim();
      if (!query) return [];
      setLoadingYouTube(true);
      setYoutubeSuggestions([]);
      try {
        const { data, error } = await supabase.functions.invoke("youtube-search", {
          body: { query },
        });
        if (error) throw error;
        const list = (data?.results ?? []).slice(0, 5).map((r) => ({
          id: r.id || r.link?.split("v=")[1] || "",
          title: r.title ?? "",
          link: r.link || (r.id ? `https://www.youtube.com/watch?v=${r.id}` : ""),
          thumbnailUrl: r.thumbnailUrl ?? r.snippet?.thumbnails?.default?.url ?? null,
          duration: r.duration ?? r.contentDetails?.duration ?? null,
          durationSeconds: r.durationSeconds ?? null,
        }));
        setYoutubeSuggestions(list);
        if (list.length) {
          setShowYoutubePopover(true);
          toast.success("Sugerencias de video disponibles");
        } else if (data?.error) {
          toast.error(data.error || "Sin resultados");
        }
        return list;
      } catch (e) {
        console.warn("youtube-search:", e);
        toast.error("Error al buscar en YouTube. Comprueba que YOUTUBE_API_KEY esté configurada.");
        return [];
      } finally {
        setLoadingYouTube(false);
      }
    },
    [supabase],
  );

  const fetchYearSuggestion = useCallback(
    async (titulo, compositorApellido) => {
      if (!titulo || !compositorApellido) return;
      setLoadingYear(true);
      setSuggestedYear(null);
      try {
        const { data, error } = await supabase.functions.invoke("ask-ai", {
          body: {
            type: "FIND_WORK_METADATA",
            titulo: stripHtml(titulo),
            compositorApellido,
          },
        });
        if (error) {
          console.warn("FIND_WORK_METADATA error:", error);
          return;
        }
        const rawYear = data?.year;
        const y =
          typeof rawYear === "number"
            ? Math.floor(rawYear)
            : typeof rawYear === "string"
              ? parseInt(rawYear, 10)
              : null;
        if (y != null && !Number.isNaN(y) && y >= 1000 && y <= 2100) {
          setSuggestedYear(y);
          toast.success("Año de composición sugerido");
        }
        if (data?.error) console.warn("FIND_WORK_METADATA:", data.error);
      } catch (e) {
        console.warn("FIND_WORK_METADATA:", e);
      } finally {
        setLoadingYear(false);
      }
    },
    [supabase],
  );

  const fetchTitleWithMovementsSuggestion = useCallback(async () => {
    const titulo = stripHtml(formData.titulo);
    const firstId = selectedComposers?.[0];
    const opt = composersOptions.find((c) => c.id === firstId);
    const compositorApellido = opt?.label?.split(",")[0]?.trim() ?? "";
    const compositorNombre = opt?.label?.split(",")[1]?.trim() ?? "";
    if (!titulo || !compositorApellido) {
      toast.error("Indica título y al menos un compositor para buscar sugerencias");
      return;
    }
    setLoadingTitleSuggestions(true);
    setSuggestedTitleWithMovements(null);
    try {
      const { data, error } = await supabase.functions.invoke("ask-ai", {
        body: {
          type: "FIND_TITLE_WITH_MOVEMENTS",
          titulo,
          compositorApellido,
          compositorNombre,
        },
      });
      if (error) {
        console.warn("FIND_TITLE_WITH_MOVEMENTS error:", error);
        toast.error(error.message || "Error al buscar sugerencias");
        return;
      }
      const text = data?.titleWithMovements ?? data?.title_with_movements;
      if (text && typeof text === "string") {
        setSuggestedTitleWithMovements(text);
        toast.success("Sugerencia de título con movimientos");
      } else if (data?.error) {
        toast.error(data.error || "Sin sugerencia");
      }
    } catch (e) {
      console.warn("FIND_TITLE_WITH_MOVEMENTS:", e);
      toast.error("Error al buscar sugerencias: " + (e.message || "Error desconocido"));
    } finally {
      setLoadingTitleSuggestions(false);
    }
  }, [supabase, formData.titulo, selectedComposers, composersOptions]);

  const checkDuplicateWorks = useCallback(
    async (rawTitulo, composerIds) => {
      const cleanTitle = stripHtml(rawTitulo);
      const search = cleanTitle.trim();
      if (!search || search.length <= 3 || !composerIds?.length) {
        setDuplicateWorks([]);
        setCheckingDuplicates(false);
        return;
      }

      setCheckingDuplicates(true);
      try {
        let query = supabase
          .from("obras")
          .select(
            "id, titulo, instrumentacion, obras_compositores!inner(id_compositor, rol)",
          )
          .ilike("titulo", `%${search}%`)
          .in("obras_compositores.id_compositor", composerIds)
          .eq("obras_compositores.rol", "compositor")
          .limit(10);

        if (formData.id) {
          query = query.neq("id", formData.id);
        }

        const { data, error } = await query;
        if (error) {
          console.warn("Error buscando duplicados de obras:", error);
          setDuplicateWorks([]);
          return;
        }
        setDuplicateWorks(data || []);
      } catch (e) {
        console.warn("checkDuplicateWorks:", e);
        setDuplicateWorks([]);
      } finally {
        setCheckingDuplicates(false);
      }
    },
    [supabase, formData.id],
  );

  const debouncedCheckDuplicates = useDebouncedCallback(
    (tituloValue, composerIds) => {
      checkDuplicateWorks(tituloValue, composerIds);
    },
    600,
  );

  useEffect(() => {
    debouncedCheckDuplicates(formData.titulo, selectedComposers);
  }, [formData.titulo, selectedComposers, debouncedCheckDuplicates]);

  useEffect(() => {
    const titulo = stripHtml(formData.titulo);
    const hasComposer = selectedComposers?.length > 0;
    const anioEmpty = !(formData.anio || "").toString().trim();
    const linkDriveEmpty = !(formData.link_drive || "").trim();
    if (!titulo || !hasComposer) {
      setSuggestedYear(null);
      return;
    }
    if (enrichmentTriggerRef.current) clearTimeout(enrichmentTriggerRef.current);
    enrichmentTriggerRef.current = setTimeout(() => {
      const firstComposerId = selectedComposers[0];
      const composerOption = composersOptions.find((c) => c.id === firstComposerId);
      const composerLabel = composerOption?.label ?? "";
      const compositorApellido = composerLabel.split(",")[0]?.trim() ?? "";
      if (anioEmpty) fetchYearSuggestion(titulo, compositorApellido);
    }, 800);
    return () => {
      if (enrichmentTriggerRef.current) clearTimeout(enrichmentTriggerRef.current);
    };
  }, [formData.titulo, formData.anio, formData.id, selectedComposers, composersOptions, fetchYearSuggestion]);

  useEffect(() => {
    if ((formData.link_youtube || "").trim()) {
      setShowYoutubePopover(false);
      setYoutubeSuggestions([]);
    }
  }, [formData.link_youtube]);

  useEffect(() => () => {
    if (fieldStatusResetRef.current) clearTimeout(fieldStatusResetRef.current);
  }, []);

  const applyYoutubeSuggestion = (item) => {
    const link = (item.link || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : "")).trim();
    if (!link) {
      setYoutubeSuggestions([]);
      setShowYoutubePopover(false);
      toast.info("Sin enlace en este resultado. Pega la URL del video manualmente.");
      return;
    }
    const sec =
      parseDurationToSeconds(item.durationSeconds) ??
      parseDurationToSeconds(item.duration);
    const durStr = sec != null ? formatSecondsToTime(sec) : formData.duracion;
    setYoutubeSuggestions([]);
    setShowYoutubePopover(false);
    updateField("link_youtube", link);
    if (sec != null) updateField("duracion", durStr);
    if (formData.id) {
      saveFieldToDb("link_youtube", link);
      if (sec != null) saveFieldToDb("duracion", durStr);
    }
    toast.success("Video y duración aplicados");
  };

  const applyYearSuggestion = () => {
    if (suggestedYear == null) return;
    const val = String(suggestedYear);
    setFormData((prev) => ({ ...prev, anio: val }));
    if (formData.id) saveFieldToDb("anio", val);
    setSuggestedYear(null);
    toast.success("Año aplicado");
  };

  const searchYoutubeOnDemand = async () => {
    const titulo = stripHtml(formData.titulo);
    const firstId = selectedComposers?.[0];
    const opt = composersOptions.find((c) => c.id === firstId);
    const composerLabel = opt?.label ?? "";
    if (!titulo || !composerLabel) {
      toast.error("Indica título y al menos un compositor para buscar en YouTube.");
      return;
    }
    await fetchYoutubeSuggestions(titulo, composerLabel);
  };

  // --- FUNCIÓN PARA CREACIÓN RÁPIDA DE COMPOSITORES ---
  const handleQuickCreateComposer = async (inputValue, type) => {
    // Esperamos formato "Apellido, Nombre"
    let apellido = inputValue.trim();
    let nombre = "";

    if (inputValue.includes(",")) {
      const parts = inputValue.split(",");
      apellido = parts[0].trim();
      nombre = parts[1].trim();
    }

    if (!apellido) return;

    try {
      setSaveStatus("saving");
      const { data, error } = await supabase
        .from("compositores")
        .insert([{ apellido, nombre }])
        .select()
        .single();

      if (error) throw error;

      // Actualizar opciones locales
      const newOption = {
        id: data.id,
        label: `${data.apellido}, ${data.nombre}`,
      };
      setComposersOptions((prev) =>
        [...prev, newOption].sort((a, b) => a.label.localeCompare(b.label)),
      );

      // Vincular al formulario
      if (type === "compositor") {
        const nextIds = [...selectedComposers, data.id];
        setSelectedComposers(nextIds);
        if (formData.id) updateComposerRelations("compositor", nextIds);
      } else {
        const nextIds = [...selectedArrangers, data.id];
        setSelectedArrangers(nextIds);
        if (formData.id) updateComposerRelations("arreglador", nextIds);
      }

      toast.success(`Creado: ${data.apellido}`);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Error al crear compositor");
      setSaveStatus("error");
    }
  };

  const fetchParticellas = async (workId) => {
    const { data } = await supabase
      .from("obras_particellas")
      .select("*, instrumentos(instrumento, abreviatura)")
      .eq("id_obra", workId);
    if (data) {
      setParticellas(
        data
          .map((p) => {
            let links = [];
            try {
              links = JSON.parse(p.url_archivo) || [];
            } catch {
              if (p.url_archivo)
                links = [{ url: p.url_archivo, description: "Enlace" }];
            }
            return {
              tempId: p.id,
              ...p,
              links,
              instrumento_nombre: p.instrumentos?.instrumento,
              instrumento_abreviatura: p.instrumentos?.abreviatura || null,
              es_solista: !!p.es_solista,
            };
          })
          .sort((a, b) => a.id_instrumento.localeCompare(b.id_instrumento)),
      );
    }
  };

  const setFieldStatusWithReset = (field, status) => {
    if (fieldStatusResetRef.current) clearTimeout(fieldStatusResetRef.current);
    setFieldStatus((prev) => ({ ...prev, [field]: status }));
    if (status === "success") {
      fieldStatusResetRef.current = setTimeout(() => {
        setFieldStatus((prev) => ({ ...prev, [field]: "idle" }));
        fieldStatusResetRef.current = null;
      }, 2000);
    }
  };

  const getInputClass = (field, baseClass = "") => {
    const s = fieldStatus[field] || "idle";
    const statusClass =
      s === "success"
        ? "bg-emerald-50 border-emerald-500"
        : s === "error"
          ? "bg-red-50 border-red-500"
          : "";
    return ["input", "min-h-10", statusClass, baseClass].filter(Boolean).join(" ");
  };

  const enviarEncargoArreglo = (
    obraId,
    tituloStr,
    idIntegranteArregladorVal,
    linkDrive,
    observacionesStr,
    fechaEsperada,
    dificultad,
    instrumentacion,
  ) => {
    const integranteOpt = integrantesArregladorOptions.find((i) => Number(i.id) === Number(idIntegranteArregladorVal));
    const arregladorLabel = integranteOpt ? integranteOpt.label : "";
    const emailTo = integranteOpt?.mail || null;
    if (!emailTo) {
      console.warn("encargo_arreglo: sin email para integrante", idIntegranteArregladorVal);
      toast.error("No se encontró email del arreglador para enviar el encargo.");
      return;
    }
    const detalle = {
      titulo: tituloStr,
      arreglador: arregladorLabel,
      id_obra: obraId,
      link_drive: linkDrive || null,
      observaciones: observacionesStr || null,
      fecha_esperada: fechaEsperada || null,
      dificultad: dificultad || null,
      instrumentacion: instrumentacion || null,
    };
    supabase.functions
      .invoke("mails_produccion", {
        body: {
          action: "enviar_mail",
          templateId: "encargo_arreglo",
          email: emailTo,
          bcc: ["ofrn.archivo@gmail.com"],
          nombre: user ? `${user.nombre} ${user.apellido}` : "Sistema",
          gira: null,
          detalle,
        },
      })
      .then(({ error }) => {
        if (error) console.error("mails_produccion (encargo_arreglo):", error);
        else toast.success("Mail de encargo enviado al Arreglador y al Archivista.");
      });
  };

  const saveFieldToDb = async (field, value) => {
    if (!formData.id) return;
    if (field === "estado" && value === "Para arreglar" && !formData.id_integrante_arreglador) {
      toast.error("Al marcar 'Para arreglar' debes asignar un Arreglador (integrante a notificar).");
      return;
    }
    setSaveStatus("saving");
    setFieldStatus((prev) => ({ ...prev, [field]: "saving" }));
    try {
      const payload = {};
      if (field === "duracion")
        payload["duracion_segundos"] = inputToSeconds(value);
      else if (field === "anio")
        payload["anio_composicion"] = value ? parseInt(value) : null;
      else if (field === "fecha_esperada")
        payload["fecha_esperada"] = value || null;
      else if (field === "estado") {
        payload["estado"] = value;
        if (value === "Para arreglar" && formData.id_integrante_arreglador)
          payload["id_integrante_arreglador"] = formData.id_integrante_arreglador;
      } else if (field === "id_arreglador") {
        payload["id_arreglador"] = value ? Number(value) : null;
      } else if (field === "id_integrante_arreglador") {
        payload["id_integrante_arreglador"] = value ? Number(value) : null;
      } else payload[field] = value === "" ? null : value;

      await supabase.from("obras").update(payload).eq("id", formData.id);
      setSaveStatus("saved");
      setFieldStatusWithReset(field, "success");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (onSave) onSave(formData.id, false);

      // Encargo arreglo: solo al pasar a "Para arreglar" o al asignar integrante arreglador (no en cada guardado)
      const acabaDePasarParaArreglar = field === "estado" && value === "Para arreglar";
      const acabaDeAsignarArreglador = field === "id_integrante_arreglador" && value && formData.estado === "Para arreglar";
      const idIntegranteParaMail = field === "id_integrante_arreglador" ? (value ? Number(value) : null) : formData.id_integrante_arreglador;
      if ((acabaDePasarParaArreglar || acabaDeAsignarArreglador) && idIntegranteParaMail) {
        enviarEncargoArreglo(
          formData.id,
          stripHtml(formData.titulo),
          idIntegranteParaMail,
          formData.link_drive,
          (formData.observaciones || "").trim(),
          formData.fecha_esperada || null,
          formData.dificultad || null,
          formData.instrumentacion || null,
        );
      }

      // manage-drive: al pasar a Entregado
      if (field === "estado" && value === "Entregado" && (formData.link_drive || "").trim()) {
        supabase.functions
          .invoke("manage-drive", {
            body: {
              link_origen: formData.link_drive,
              id_carpeta_destino: "10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi",
            },
          })
          .then(({ error }) => {
            if (error) console.error("manage-drive:", error);
            else toast.success("Copia al Archivo iniciada.");
          });
      }
    } catch (e) {
      setSaveStatus("error");
      setFieldStatus((prev) => ({ ...prev, [field]: "error" }));
    }
  };

  const debouncedSave = useDebouncedCallback(saveFieldToDb, 1000);

  const updateField = (field, val) => {
    if (field === "estado" && val === "Para arreglar") {
      setFormData((prev) => {
        const hasIntegrante = prev.id_integrante_arreglador != null && prev.id_integrante_arreglador !== "";
        return {
          ...prev,
          estado: val,
          id_integrante_arreglador: hasIntegrante ? prev.id_integrante_arreglador : DEFAULT_ARREGLADOR_INTEGRANTE_ID,
        };
      });
      if (formData.id) {
        debouncedSave("estado", val);
        if (!formData.id_integrante_arreglador) saveFieldToDb("id_integrante_arreglador", DEFAULT_ARREGLADOR_INTEGRANTE_ID);
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (formData.id) debouncedSave(field, val);
  };

  const updateComposerRelations = async (type, ids) => {
    if (!formData.id) return;
    setSaveStatus("saving");
    await supabase
      .from("obras_compositores")
      .delete()
      .eq("id_obra", formData.id)
      .eq("rol", type);
    if (ids.length > 0) {
      await supabase.from("obras_compositores").insert(
        ids.map((id) => ({
          id_obra: formData.id,
          id_compositor: id,
          rol: type,
        })),
      );
    }
    setSaveStatus("saved");
    if (onSave) onSave(formData.id, false);
  };

  const updateTagRelations = async (ids) => {
    if (!formData.id) {
      return;
    }
    setSaveStatus("saving");
    await supabase.from("obras_palabras_clave").delete().eq("id_obra", formData.id);
    if (ids.length > 0) {
      await supabase.from("obras_palabras_clave").insert(
        ids.map((id) => ({
          id_obra: formData.id,
          id_palabra_clave: id,
        })),
      );
    }
    setSaveStatus("saved");
    if (onSave) onSave(formData.id, false);
  };

  const handlePartsChange = async (newPartsList, overrideId = null) => {
    const targetId = overrideId || formData.id;
    setParticellas(newPartsList);
    const instr = calculateInstrumentation(newPartsList);
    setFormData((prev) => ({ ...prev, instrumentacion: instr }));

    if (!targetId) return;

    const thisGeneration = ++partsSaveGenerationRef.current;
    partsPendingPersistRef.current += 1;
    setIsSaving(true);
    try {
      if (!overrideId) {
        const activeIds = newPartsList.filter((p) => p.id).map((p) => p.id);
        const { data: currentParts } = await supabase
          .from("obras_particellas")
          .select("id")
          .eq("id_obra", targetId);
        if (currentParts) {
          const idsToDelete = currentParts
            .filter((dbP) => !activeIds.includes(dbP.id))
            .map((x) => x.id);
          if (idsToDelete.length > 0)
            await supabase
              .from("obras_particellas")
              .delete()
              .in("id", idsToDelete);
        }
      }

      const toUpdate = [];
      const toInsert = [];

      newPartsList.forEach((p) => {
        const row = {
          id_obra: targetId,
          id_instrumento: p.id_instrumento,
          nombre_archivo: p.nombre_archivo,
          nota_organico: p.nota_organico,
          url_archivo: JSON.stringify(p.links || []),
          es_solista: !!p.es_solista,
        };
        if (p.id) {
          row.id = p.id;
          toUpdate.push(row);
        } else {
          toInsert.push(row);
        }
      });

      let results = [];
      if (toUpdate.length > 0) {
        const { data: updData } = await supabase
          .from("obras_particellas")
          .upsert(toUpdate)
          .select();
        if (updData) results = [...results, ...updData];
      }
      if (toInsert.length > 0) {
        const { data: insData, error: insErr } = await supabase
          .from("obras_particellas")
          .insert(toInsert)
          .select();
        if (insErr) throw insErr;
        if (insData) results = [...results, ...insData];
      }

      if (
        results.length > 0 &&
        !overrideId &&
        thisGeneration === partsSaveGenerationRef.current
      ) {
        setParticellas((prev) =>
          prev.map((p) => {
            const dbMatch = results.find(
              (s) =>
                s.id_instrumento === p.id_instrumento &&
                s.nombre_archivo === p.nombre_archivo,
            );
            return dbMatch ? { ...p, id: dbMatch.id } : p;
          }),
        );
      }

      if (thisGeneration === partsSaveGenerationRef.current) {
        await supabase
          .from("obras")
          .update({ instrumentacion: instr })
          .eq("id", targetId);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        if (onSave) onSave(targetId, false);
      }
    } catch (e) {
      console.error("Error al guardar particellas:", e);
      setSaveStatus("error");
    } finally {
      partsPendingPersistRef.current = Math.max(
        0,
        partsPendingPersistRef.current - 1,
      );
      if (partsPendingPersistRef.current === 0) setIsSaving(false);
    }
  };

  const handleCreateInitial = async () => {
    if (!formData.titulo) {
      alert("El título de la obra es obligatorio.");
      return;
    }
    if (!user || !user.id) {
      alert("Error de sesión: No se pudo identificar al usuario actual.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        titulo: formData.titulo,
        duracion_segundos: inputToSeconds(formData.duracion),
        anio_composicion: formData.anio ? parseInt(formData.anio) : null,
        instrumentacion: calculateInstrumentation(particellas),
        estado: formData.estado,
        id_integrante_arreglador: formData.estado === "Para arreglar" && formData.id_integrante_arreglador ? formData.id_integrante_arreglador : null,
        fecha_esperada:
          formData.estado === "Solicitud" || formData.estado === "Para arreglar"
            ? formData.fecha_esperada || null
            : null,
        comentarios: formData.comentarios,
        observaciones: formData.observaciones,
        link_drive: formData.link_drive,
        link_youtube: formData.link_youtube,
        id_usuario_carga: user.id,
      };

      const { data, error } = await supabase
        .from("obras")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newId = data.id;

        const relations = [
          ...selectedComposers.map((id) => ({
            id_obra: newId,
            id_compositor: id,
            rol: "compositor",
          })),
          ...selectedArrangers.map((id) => ({
            id_obra: newId,
            id_compositor: id,
            rol: "arreglador",
          })),
        ];

        if (relations.length > 0) {
          await supabase.from("obras_compositores").insert(relations);
        }

        if (selectedTags.length > 0) {
          await supabase.from("obras_palabras_clave").insert(
            selectedTags.map((id) => ({
              id_obra: newId,
              id_palabra_clave: id,
            })),
          );
        }

        if (particellas.length > 0) {
          await handlePartsChange(particellas, newId);
        }

        setFormData((prev) => ({ ...prev, id: newId }));

        const composerLabels = (selectedComposers || [])
          .map((id) => composersOptions.find((c) => c.id === id)?.label)
          .filter(Boolean);
        const arrangerLabels = (selectedArrangers || [])
          .map((id) => composersOptions.find((c) => c.id === id)?.label)
          .filter(Boolean);
        supabase.functions
          .invoke("mails_produccion", {
            body: {
              action: "enviar_mail",
              templateId: "nueva_obra",
              email: "ofrn.archivo@gmail.com",
              nombre: `${user.nombre} ${user.apellido}`,
              gira: null,
              detalle: {
                titulo: stripHtml(formData.titulo),
                compositores: composerLabels.join("; ") || null,
                arregladores: arrangerLabels.length ? arrangerLabels.join("; ") : null,
                duracion: formData.duracion,
                anio: formData.anio || null,
                estado: formData.estado || null,
                instrumentacion: payload.instrumentacion,
                link_drive: formData.link_drive || null,
                link_youtube: (formData.link_youtube || "").trim() || null,
                observaciones: (formData.observaciones || "").trim() || null,
                comentarios: (formData.comentarios || "").trim() || null,
              },
            },
          })
          .then(({ error }) => {
            if (error) console.error("Error enviando alerta de obra:", error);
          });

        if (formData.estado === "Para arreglar" && formData.id_integrante_arreglador) {
          enviarEncargoArreglo(
            newId,
            stripHtml(formData.titulo),
            formData.id_integrante_arreglador,
            formData.link_drive,
            (formData.observaciones || "").trim(),
            formData.fecha_esperada || null,
            formData.dificultad || null,
            payload.instrumentacion || null,
          );
        }

        if (onSave) onSave(newId, true);
      }
    } catch (err) {
      console.error(err);
      alert("Error al crear la obra: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateAsArrangement = async () => {
    if (!formData.id || !user?.id) {
      toast.error("No se puede duplicar: obra no guardada o sesión inválida.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        titulo: formData.titulo,
        duracion_segundos: inputToSeconds(formData.duracion),
        anio_composicion: formData.anio ? parseInt(formData.anio) : null,
        estado: formData.estado,
        id_integrante_arreglador: formData.estado === "Para arreglar" && formData.id_integrante_arreglador ? formData.id_integrante_arreglador : null,
        fecha_esperada:
          formData.estado === "Solicitud" || formData.estado === "Para arreglar"
            ? (formData.fecha_esperada || null)
            : null,
        observaciones: formData.observaciones || null,
        comentarios: formData.comentarios || null,
        link_youtube: formData.link_youtube || null,
        link_drive: null,
        id_usuario_carga: user.id,
      };

      const { data, error } = await supabase
        .from("obras")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const newId = data.id;

      const { data: relations, error: relError } = await supabase
        .from("obras_compositores")
        .select("rol, id_compositor")
        .eq("id_obra", formData.id);

      if (relError) throw relError;
      if (relations?.length > 0) {
        await supabase.from("obras_compositores").insert(
          relations.map((r) => ({ id_obra: newId, id_compositor: r.id_compositor, rol: r.rol })),
        );
      }

      await fetchWorkDetails(newId);
      if (onSave) onSave(newId, true);
      toast.success("Nuevo arreglo creado. Puedes editar instrumentación y Drive.");
    } catch (err) {
      console.error(err);
      toast.error("Error al crear el nuevo arreglo: " + (err.message || "Error desconocido"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddParts = () => {
    let selectedId = genInstrument;
    const filtered = [...INSTRUMENT_GROUPS, ...instrumentList].filter((i) =>
      i.instrumento.toLowerCase().includes(instrumentQuery.toLowerCase()),
    );
    if (!selectedId && filtered.length > 0 && instrumentQuery.length >= 2)
      selectedId = filtered[0].id;
    if (!selectedId) return;

    const group = INSTRUMENT_GROUPS.find((g) => g.id === selectedId);
    let newParts = [];
    if (group) {
      newParts = group.definitions.map((def) => ({
        tempId: Math.random(),
        id: null,
        id_instrumento: def.id_instrumento,
        nombre_archivo: def.nombre_archivo,
        links: [],
        nota_organico: "",
        instrumento_nombre: def.instrumento_base,
        es_solista: false,
      }));
    } else {
      const instr = instrumentList.find((i) => i.id === selectedId);
      for (let i = 1; i <= genQuantity; i++) {
        newParts.push({
          tempId: Math.random(),
          id: Math.random(),
          id_instrumento: selectedId,
          nombre_archivo:
            genQuantity > 1
              ? `${capitalizeWords(instr.instrumento)} ${i}`
              : capitalizeWords(instr.instrumento),
          links: [],
          nota_organico: "",
          instrumento_nombre: instr.instrumento,
          es_solista: false,
        });
      }
    }
    handlePartsChange(
      [...particellas, ...newParts].sort((a, b) =>
        a.id_instrumento.localeCompare(b.id_instrumento),
      ),
    );
    setInstrumentQuery("");
    setGenInstrument("");
    setGenQuantity(1);
  };

  const allOptions = [...INSTRUMENT_GROUPS, ...instrumentList];
  const filteredInstruments = allOptions.filter((i) =>
    i.instrumento.toLowerCase().includes(instrumentQuery.toLowerCase()),
  );

  const copyDriveUrl = useCallback(() => {
    const u = (formData.link_drive || "").trim();
    if (!u) {
      toast.error("No hay enlace de Drive");
      return;
    }
    navigator.clipboard.writeText(u).then(
      () => toast.success("Enlace de Drive copiado"),
      () => toast.error("No se pudo copiar"),
    );
  }, [formData.link_drive]);

  const openDriveInBrowser = useCallback(() => {
    const u = (formData.link_drive || "").trim();
    if (!u) {
      toast.error("No hay enlace de Drive");
      return;
    }
    const url = /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [formData.link_drive]);

  const estadoHeaderClass = getEstadoHeaderClass(formData.estado);
  const estadoShellClass = getEstadoShellClass(formData.estado);
  const isOficial = formData.estado === "Oficial";

  return (
    <div
      className={`w-full max-w-full space-y-0 overflow-hidden rounded-2xl border pb-20 ${estadoShellClass}`}
    >
      {/* HEADER: título de página + Estado (como MusicianForm) */}
      <div
        className={`px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 text-white border-b border-white/20 ${estadoHeaderClass}`}
      >
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-5">
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2 tracking-tight">
            <IconMusic className="shrink-0 opacity-90" size={22} />
            {formData.id ? "Editar Obra" : "Nueva Solicitud"}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
              Estado
            </span>
            <select
              className="bg-white/95 text-slate-900 border border-white/50 rounded-lg px-2.5 py-1.5 text-sm sm:text-base font-bold tracking-tight outline-none focus:ring-2 focus:ring-white/50 min-w-[10rem] max-w-full"
              value={formData.estado ?? ""}
              onChange={(e) => updateField("estado", e.target.value)}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Para arreglar">Para arreglar</option>
              <option value="Entregado">Entregado (Revisión Archivista)</option>
              <option value="Oficial">Oficial (Disponible)</option>
              <option value="Solicitud">Solicitud</option>
              <option value="Informativo">Informativo</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 shrink-0 self-end w-full sm:w-auto">
          {saveStatus === "saving" && (
            <span className="text-xs text-white/90 drop-shadow-sm flex items-center gap-1.5">
              <IconLoader size={12} className="animate-spin" /> Guardando
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-white drop-shadow-sm flex items-center gap-1.5">
              <IconCheck size={12} /> Guardado
            </span>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="bg-white/90 p-1.5 rounded-full text-slate-600 hover:text-red-500 shadow-sm transition-all"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>
      </div>

      {formData.estado === "Para arreglar" && (
        <div className="px-3 sm:px-4 py-2.5 space-y-2 bg-amber-50/90 border-b border-amber-200/80 text-slate-800">
          <div>
            <label className="text-[10px] font-bold uppercase text-amber-700 mb-1 block">
              Arreglador a notificar (integrante, para envío de mail)
            </label>
            <SearchableSelect
              options={
                integrantesArregladorOptions.some((o) => Number(o.id) === Number(DEFAULT_ARREGLADOR_INTEGRANTE_ID))
                  ? integrantesArregladorOptions
                  : [{ id: DEFAULT_ARREGLADOR_INTEGRANTE_ID, label: `Integrante (ID ${DEFAULT_ARREGLADOR_INTEGRANTE_ID})` }, ...integrantesArregladorOptions]
              }
              value={formData.id_integrante_arreglador ?? null}
              onChange={(id) => updateField("id_integrante_arreglador", id)}
              placeholder="Seleccionar integrante..."
              isMulti={false}
              className="text-sm border-amber-200 bg-white"
            />
          </div>
          <DateInput
            label="Fecha estimada de entrega"
            value={formData.fecha_esperada || ""}
            onChange={(v) => updateField("fecha_esperada", v)}
            className="border border-amber-200 bg-white text-amber-900 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {formData.estado === "Entregado" && (
        <div className="px-3 sm:px-4 py-2 flex items-center gap-2 bg-sky-50/95 border-b border-sky-200/80 text-sky-800 text-xs">
          <IconInfo size={14} className="shrink-0" />
          Se iniciará la copia automática a la carpeta del Archivo.
        </div>
      )}

      {formData.estado === "Solicitud" && (
        <div className="px-3 sm:px-4 py-2.5 border-b border-amber-200/60 bg-amber-50/50">
          <DateInput
            label="F. Esperada (dd/mm/aaaa)"
            value={formData.fecha_esperada || ""}
            onChange={(v) => updateField("fecha_esperada", v)}
            className="border border-amber-200 bg-white text-amber-800 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      <div className="space-y-4 p-2 sm:p-3">
        {/* Compositores / Arregladores (ancho = resto de filas) */}
        <div className="w-full min-w-0 max-w-full grid grid-cols-1 md:grid-cols-9 gap-3 md:gap-4 items-end">
          <div className="md:col-span-4 min-w-0">
            <label className="text-[10px] font-bold uppercase text-indigo-600 mb-1 flex items-center gap-1">
              <IconUser size={12} /> Compositores
            </label>
            <SearchableSelect
              options={composersOptions}
              value={selectedComposers}
              isMulti
              dropdownMinWidth={350}
              onChange={(ids) => {
                setSelectedComposers(ids);
                updateComposerRelations("compositor", ids);
              }}
            />
          </div>

          <div className="md:col-span-4 min-w-0">
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
              <IconUser size={12} /> Arregladores
            </label>
            <SearchableSelect
              options={composersOptions}
              value={selectedArrangers}
              isMulti
              dropdownMinWidth={350}
              onChange={(ids) => {
                setSelectedArrangers(ids);
                updateComposerRelations("arreglador", ids);
              }}
            />
          </div>

          <div className="md:col-span-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setQuickCompType("compositor"); // Por defecto vincula a compositor, pero el modal lo crea globalmente
                setIsQuickCompOpen(true);
              }}
              className="w-full h-10 flex items-center justify-center bg-white/90 text-indigo-600 rounded-lg border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 transition-all shadow-sm"
              title="Crear nuevo Compositor/Arreglador al vuelo"
            >
              <IconUserPlus size={18} />
            </button>
          </div>
        </div>

        {/* 2:1:1 = 50% / 25% / 25% — flex+stretch: las tres columnas comparten el mismo alto útil */}
        <div className="w-full min-w-0 max-w-full flex min-h-0 flex-col gap-3 lg:min-h-0 lg:flex-row lg:items-stretch lg:gap-3">
          <div className="min-w-0 flex min-h-0 w-full flex-col lg:w-auto lg:min-w-0 lg:basis-0 lg:flex-[2]">
            <div className="mb-1 flex shrink-0 items-center justify-between gap-2 flex-wrap">
            <label className="text-[10px] font-bold uppercase text-slate-400">
              Título
            </label>
            <button
              type="button"
              onClick={fetchTitleWithMovementsSuggestion}
              disabled={
                loadingTitleSuggestions ||
                !stripHtml(formData.titulo) ||
                !selectedComposers?.length
              }
              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {loadingTitleSuggestions ? (
                <IconLoader size={10} className="animate-spin" />
              ) : null}
              Buscar sugerencias
            </button>
            </div>
            <div className="min-h-0 flex-1 flex flex-col">
              <WysiwygEditor
                value={formData.titulo ?? ""}
                onChange={(v) => updateField("titulo", v)}
                placeholder="Ej: Sinfonía n.5"
                fillHeight
                className="min-h-0"
              />
            </div>

          {duplicateWorks.length > 0 && (
            <div className="mt-2 shrink-0 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900 p-3 flex gap-3">
              <div className="shrink-0 mt-0.5">
                <IconAlertCircle size={16} className="text-amber-500" />
              </div>
              <div className="space-y-1">
                <div className="font-semibold uppercase tracking-wide text-[11px] flex items-center gap-2">
                  <span>Posibles duplicados encontrados</span>
                  {checkingDuplicates && (
                    <IconLoader size={10} className="animate-spin text-amber-600" />
                  )}
                </div>
                <p className="text-[11px] text-amber-800">
                  Revisa si alguna de estas obras ya existe en el archivo antes de crear una nueva.
                </p>
                <ul className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                  {duplicateWorks.map((obra) => (
                    <li
                      key={obra.id}
                      className="flex flex-col gap-1 rounded px-2 py-1 bg-amber-100/70 border border-amber-200/70"
                    >
                      <div>
                        <span
                          className="font-semibold text-[11px] text-amber-900"
                          dangerouslySetInnerHTML={{ __html: obra.titulo || "" }}
                        />
                        {obra.instrumentacion && (
                          <span className="block text-[10px] text-amber-800/90">
                            {obra.instrumentacion}
                          </span>
                        )}
                      </div>
                      {isProgramContext && typeof onInsertExistingWork === "function" && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await onInsertExistingWork(obra.id);
                              onCancel();
                            } catch (e) {
                              console.warn("onInsertExistingWork error:", e);
                              toast.error("No se pudo insertar esta obra en el programa.");
                            }
                          }}
                          className="self-start mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                        >
                          Insertar esta obra en programa
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {suggestedTitleWithMovements && (
            <div className="mt-2 shrink-0 p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm">
              <pre className="whitespace-pre-wrap font-sans text-slate-700 mb-2">
                {suggestedTitleWithMovements}
              </pre>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const escape = (s) =>
                      s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const isMovementLine = (line) =>
                      /^\s*[IVXLCDM]+\./i.test(line.trim());
                    const html = suggestedTitleWithMovements
                      .split("\n")
                      .map((line, i) => {
                        const escaped = escape(line);
                        if (i > 0 && isMovementLine(line)) {
                          return `<p>&nbsp;&nbsp;${escaped.trim()}</p>`;
                        }
                        return `<p>${escaped}</p>`;
                      })
                      .join("");
                    updateField("titulo", html);
                    setSuggestedTitleWithMovements(null);
                    toast.success("Título aplicado");
                  }}
                  className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded"
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestedTitleWithMovements(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
          </div>

          <div className="min-w-0 flex w-full min-h-0 flex-col gap-2 lg:w-auto lg:min-w-0 lg:basis-0 lg:flex-1">
            <div className="shrink-0">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                Duración
                {loadingYouTube && <IconLoader size={12} className="animate-spin text-indigo-500" />}
              </label>
              <input
                type="text"
                className={getInputClass("duracion", "text-center w-full min-w-0")}
                value={formData.duracion ?? ""}
                onChange={(e) => updateField("duracion", e.target.value)}
                placeholder="00:00"
              />
            </div>
            <div className="shrink-0">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
                Año
                {loadingYear && <IconLoader size={12} className="animate-spin text-indigo-500" />}
              </label>
              <input
                type="number"
                className={getInputClass("anio", "text-center w-full min-w-0")}
                value={formData.anio ?? ""}
                onChange={(e) => updateField("anio", e.target.value)}
                placeholder=""
              />
              {suggestedYear != null && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-600">Año sugerido: {suggestedYear}.</span>
                  <button
                    type="button"
                    onClick={applyYearSuggestion}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Cargar
                  </button>
                </div>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                Instrumentación
              </label>
              <textarea
                className={getInputClass("instrumentacion", "block min-h-[5rem] w-full flex-1 resize-none py-2 text-[11px] font-mono leading-snug bg-white/90")}
                value={formData.instrumentacion ?? ""}
                onChange={(e) => updateField("instrumentacion", e.target.value)}
                placeholder="Orgánico…"
              />
            </div>
          </div>

          <div className="min-w-0 flex w-full min-h-0 flex-col gap-2 lg:w-auto lg:min-w-0 lg:basis-0 lg:flex-1">
            <div className="min-w-0 shrink-0">
              <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                Palabras Clave / Tags
              </label>
              <SearchableSelect
                options={tagsOptions.map((t) => ({ id: t.id, label: t.tag }))}
                value={selectedTags}
                isMulti
                placeholder="Agregar palabras clave..."
                onChange={(ids) => {
                  setSelectedTags(ids);
                  if (formData.id) updateTagRelations(ids);
                }}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="shrink-0">
                <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
                <label className="text-[10px] font-bold uppercase text-red-600 flex items-center gap-1 shrink-0">
                  <IconYoutube size={12} /> Link Audio / Video
                  {loadingYouTube && <IconLoader size={12} className="animate-spin text-red-500" />}
                </label>
                <button
                  type="button"
                  onClick={searchYoutubeOnDemand}
                  disabled={loadingYouTube || !stripHtml(formData.titulo) || !selectedComposers?.length}
                  className="text-[10px] font-medium text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 self-start sm:self-auto"
                >
                  <IconYoutube size={10} />
                  Sugerencias
                </button>
                </div>
                <input
                  type="text"
                  className={getInputClass("link_youtube", "text-xs w-full min-w-0 block")}
                  value={formData.link_youtube ?? ""}
                  onChange={(e) => updateField("link_youtube", e.target.value)}
                  onFocus={() => youtubeSuggestions.length > 0 && setShowYoutubePopover(true)}
                  placeholder="Spotify / Youtube…"
                />
              </div>
              {showYoutubePopover && youtubeSuggestions.length > 0 && !formData.link_youtube?.trim() && (
                <div className="shrink-0 bg-white/95 border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-56 flex flex-col">
                  <div className="p-1.5 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 shrink-0">
                    Sugerencias
                  </div>
                  <ul className="max-h-40 overflow-y-auto min-h-0 text-left">
                    {youtubeSuggestions.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => applyYoutubeSuggestion(item)}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-indigo-50 flex items-center gap-2"
                        >
                          {(item.thumbnailUrl ?? item.snippet?.thumbnails?.default?.url) ? (
                            <img
                              src={item.thumbnailUrl ?? item.snippet?.thumbnails?.default?.url}
                              alt=""
                              className="w-10 h-7 object-cover rounded shrink-0"
                            />
                          ) : (
                            <IconYoutube size={14} className="text-red-500 shrink-0" />
                          )}
                          <span className="truncate flex-1 min-w-0" title={item.title ?? item.snippet?.title}>
                            {item.title ?? item.snippet?.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setShowYoutubePopover(false)}
                    className="w-full py-1 text-[10px] text-slate-500 hover:bg-slate-100 border-t border-slate-100 shrink-0"
                  >
                    Cerrar
                  </button>
                </div>
              )}
              {formData.link_youtube?.trim() && getYoutubeVideoId(formData.link_youtube) && (
                <div className="relative min-h-[10rem] w-full min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  <iframe
                    title="Vista previa del video"
                    src={`https://www.youtube.com/embed/${getYoutubeVideoId(formData.link_youtube)}`}
                    className="absolute inset-0 h-full w-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 1:2:2 = 20% | 40% | 40% — ancho = fila de arriba */}
        <div className="w-full min-w-0 max-w-full grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2fr)] lg:items-stretch lg:gap-3 lg:min-h-0">
          <div className="min-w-0 flex h-full min-h-0 flex-col gap-2">
            <div className="text-[10px] font-bold uppercase text-indigo-600 tracking-wide">
              Drive
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={copyDriveUrl}
                className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold uppercase text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80"
              >
                <IconCopy size={14} className="text-indigo-600 shrink-0" />
                Copiar
              </button>
              <button
                type="button"
                onClick={() => setShowDriveField((v) => !v)}
                className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold uppercase text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80"
              >
                <IconEdit size={14} className="text-indigo-600 shrink-0" />
                Editar
              </button>
              <button
                type="button"
                onClick={openDriveInBrowser}
                className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold uppercase text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/80"
              >
                <IconFolder size={14} className="text-amber-600 shrink-0" />
                Abrir
              </button>
              <button
                type="button"
                disabled={!formData.id || !((formData.link_drive || "").trim())}
                onClick={() => setShowDriveMatcher(true)}
                className="flex items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold uppercase text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/80 disabled:cursor-not-allowed disabled:opacity-40"
                title="Escanear y emparejar particellas (Drive)"
              >
                <IconLink size={16} className="text-blue-600" />
              </button>
            </div>
            {showDriveField && (
              <input
                type="text"
                className={getInputClass("link_drive", "text-xs w-full min-w-0 text-blue-700")}
                value={formData.link_drive ?? ""}
                onChange={(e) => updateField("link_drive", e.target.value)}
                placeholder="Pegar URL de la carpeta…"
                autoFocus
              />
            )}
          </div>
          <div className="min-w-0 flex h-full min-h-0 flex-col">
            <div className="mb-1 flex shrink-0 items-center justify-between gap-2 flex-wrap">
              <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <IconFileText size={12} /> Observaciones (Públicas)
              </label>
              {stripHtml(formData.titulo) && selectedComposers?.length > 0 && (() => {
                const titulo = stripHtml(formData.titulo);
                const opt = composersOptions.find((c) => c.id === selectedComposers[0]);
                const compositorLabel = opt?.label ?? "";
                const query = [compositorLabel.replace(/,/g, " ").trim(), titulo].filter(Boolean).join(" ");
                if (!query) return null;
                const imslpSearchUrl = `https://www.google.com/search?q=site:imslp.org+${encodeURIComponent(query).replace(/%20/g, "+")}`;
                return (
                  <a
                    href={imslpSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    title="Abrir búsqueda en IMSLP (compositor y obra, no consume tokens)"
                  >
                    <IconLink size={10} />
                    IMSLP
                  </a>
                );
              })()}
            </div>
            <div className="min-h-0 flex-1 flex flex-col">
              <WysiwygEditor
                value={formData.observaciones ?? ""}
                onChange={(v) => updateField("observaciones", v)}
                placeholder="Notas sobre ediciones, versiones, etc…"
                fillHeight
                className="min-h-[100px] border-slate-200"
              />
            </div>
          </div>
          <div className="min-w-0 flex h-full min-h-0 flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex shrink-0 items-center gap-1">
              <IconMessageSquare size={12} /> Comentarios (Internos)
            </label>
            <textarea
              className="w-full min-h-[6rem] flex-1 resize-y border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80"
              value={formData.comentarios || ""}
              onChange={(e) => updateField("comentarios", e.target.value)}
              placeholder="Notas privadas para la gestión…"
            />
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full px-3 sm:px-4 md:px-5">
      {/* ARCOS: workId desde estado o desde prop inicial (p. ej. al abrir modal desde RepertoireManager) */}
      <BowingSetManager
        mode="edit"
        supabase={supabase}
        workId={formData.id ?? initialData?.id}
      />
      </div>

      {/* PARTICELLAS */}
      <div className="w-full min-w-0 max-w-full border-t border-slate-200/80 pt-6 px-3 sm:px-4 md:px-5">
        <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">
          Gestión de Particellas
        </h3>

        {/* BARRA DE CREACIÓN */}
        <div className="flex gap-2 items-end bg-white/60 p-3 rounded-xl mb-4 border border-slate-200/80 shadow-sm">
          <div className="flex-1 relative">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Instrumento / Grupo
            </label>
            <input
              ref={instrumentInputRef}
              className="input"
              placeholder="Buscar..."
              value={instrumentQuery}
              onChange={(e) => {
                setInstrumentQuery(e.target.value);
                setShowInstrumentOptions(true);
              }}
              onFocus={() => setShowInstrumentOptions(true)}
            />
            {showInstrumentOptions && instrumentQuery && (
              <div className="absolute top-full left-0 w-full bg-white border shadow-xl max-h-48 overflow-y-auto z-50 rounded-lg mt-1">
                {filteredInstruments.map((i) => (
                  <div
                    key={i.id}
                    className="p-2 hover:bg-indigo-50 cursor-pointer text-xs border-b border-slate-50 last:border-0"
                    onMouseDown={() => {
                      setGenInstrument(i.id);
                      setInstrumentQuery(i.instrumento);
                      setShowInstrumentOptions(false);
                    }}
                  >
                    <span
                      className={i.isGroup ? "font-bold text-indigo-700" : ""}
                    >
                      {i.instrumento}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-20">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Cant.
            </label>
            <input
              type="number"
              min="1"
              className="input text-center"
              value={genQuantity}
              onChange={(e) => setGenQuantity(parseInt(e.target.value))}
            />
          </div>
          <button
            onClick={handleAddParts}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg h-[38px] hover:bg-indigo-700 shadow-sm"
          >
            <IconPlus />
          </button>
        </div>

        {/* TABLA DE PARTICELLAS */}
        <div className="bg-white/90 rounded-lg border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 border-b border-slate-200 px-4 py-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            <div className="col-span-1 text-center">ID</div>
            <div className="col-span-4">Nombre de Particella</div>
            <div className="col-span-1 text-center text-[10px] font-bold text-slate-500">Solista</div>
            <div className="col-span-2 text-center">Nota Org.</div>
            <div className="col-span-2 text-center">Enlaces</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          <div className="divide-y divide-slate-100">
            {particellas.map((p) => (
              <div
                key={p.tempId}
                className={`grid grid-cols-12 gap-2 px-4 py-2 items-center transition-colors group text-sm ${p.es_solista ? "bg-sky-50 hover:bg-sky-100" : "hover:bg-slate-50"}`}
              >
                <div className="col-span-1 flex justify-center">
                  <span className="w-8 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                    {p.id_instrumento}
                  </span>
                </div>
                <div className="col-span-4">
                  <input
                    className="w-full bg-transparent border-none p-0 text-slate-700 font-bold focus:ring-0 placeholder:text-slate-300 focus:bg-white focus:shadow-sm rounded px-1 transition-all"
                    value={p.nombre_archivo ?? ""}
                    onChange={(e) =>
                      setParticellas((prev) =>
                        prev.map((x) =>
                          x.tempId === p.tempId
                            ? { ...x, nombre_archivo: e.target.value }
                            : x,
                        ),
                      )
                    }
                    onBlur={() => handlePartsChange(particellas)}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <label className="flex items-center gap-1 cursor-pointer" title="Solista">
                    <input
                      type="checkbox"
                      checked={!!p.es_solista}
                      onChange={(e) => {
                        const next = particellas.map((x) =>
                          x.tempId === p.tempId ? { ...x, es_solista: e.target.checked } : x,
                        );
                        setParticellas(next);
                        handlePartsChange(next);
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500">Solista</span>
                  </label>
                </div>
                <div className="col-span-2 flex justify-center">
                  <input
                    className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-xs text-slate-500 outline-none transition-all"
                    placeholder="-"
                    value={p.nota_organico || ""}
                    onChange={(e) =>
                      setParticellas((prev) =>
                        prev.map((x) =>
                          x.tempId === p.tempId
                            ? { ...x, nota_organico: e.target.value }
                            : x,
                        ),
                      )
                    }
                    onBlur={() => handlePartsChange(particellas)}
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => {
                      setEditingLinksId(p.tempId);
                      setIsLinkModalOpen(true);
                    }}
                    className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${p.links?.length > 0 ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                  >
                    <IconLink size={12} />
                    {p.links?.length > 0
                      ? `${p.links.length} Link(s)`
                      : "Sin Links"}
                  </button>
                </div>
                <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      handlePartsChange(
                        particellas.filter((x) => x.tempId !== p.tempId),
                      )
                    }
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            ))}

            {particellas.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50">
                No hay particellas cargadas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACCIONES */}
      <div
        className={`sticky bottom-0 z-10 flex gap-3 border-t pt-6 px-2 py-3 backdrop-blur-sm shadow-[0_-10px_20px_-12px_rgba(0,0,0,0.06)] sm:gap-4 sm:px-3 sm:py-4 rounded-b-2xl ${
          isOficial
            ? "border-emerald-200/80 bg-emerald-50/95"
            : "border-slate-200/80 bg-white/90"
        }`}
      >
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
        >
          Cerrar
        </button>
        {formData.id && (
          <button
            type="button"
            onClick={handleDuplicateAsArrangement}
            disabled={isSaving}
            className="flex-1 py-3 border-2 border-indigo-400 rounded-xl text-indigo-600 font-bold hover:bg-indigo-50 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <IconLoader className="animate-spin" size={18} /> : <IconCopy size={18} />}
            Nuevo Arreglo
          </button>
        )}
        {!formData.id ? (
          <button
            onClick={handleCreateInitial}
            disabled={isSaving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2"
          >
            {isSaving ? <IconLoader className="animate-spin" /> : <IconCheck />}{" "}
            Crear Solicitud
          </button>
        ) : (
          <div className="flex-1 flex justify-center items-center text-xs text-slate-400 italic font-medium">
            Cambios guardados automáticamente
          </div>
        )}
      </div>

      {/* MODALES */}
      <DriveMatcherModal
        isOpen={showDriveMatcher}
        onClose={() => setShowDriveMatcher(false)}
        folderUrl={formData.link_drive}
        parts={particellas}
        onPartsChange={handlePartsChange}
        supabase={supabase}
        catalogoInstrumentos={instrumentList}
      />

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
        isSolista={!!particellas.find((p) => p.tempId === editingLinksId)?.es_solista}
        onSave={(links) => {
          const updated = particellas.map((p) =>
            p.tempId === editingLinksId ? { ...p, links } : p,
          );
          handlePartsChange(updated);
        }}
      />
      <QuickComposerModal 
        isOpen={isQuickCompOpen}
        onClose={() => setIsQuickCompOpen(false)}
        onCreated={handleQuickCompCreated}
        supabase={supabase}
      />
    </div>
  );
}
