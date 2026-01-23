import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IconMusic,
  IconPlus,
  IconLoader,
  IconCheck,
  IconX,
  IconLink,
  IconDrive,
  IconList,
  IconUser,
  IconInfo,
  IconBold,
  IconItalic,
  IconTrash,
  IconUnderline,
} from "../../components/ui/Icons";
import { formatSecondsToTime, inputToSeconds } from "../../utils/time";
import { calculateInstrumentation } from "../../utils/instrumentation";
import DriveMatcherModal from "../../components/repertoire/DriveMatcherModal";
import LinksManagerModal from "../../components/repertoire/LinksManagerModal";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { INSTRUMENT_GROUPS } from "../../utils/instrumentGroups";

// --- COMPONENTE EDITOR WYSIWYG (Lo que ves es lo que obtienes) ---
const WysiwygEditor = ({ value, onChange, placeholder, className = "" }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sincronizar contenido inicial o externo
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      // Solo actualizamos si está vacío o es drásticamente diferente para no perder cursor
      if (!editorRef.current.innerHTML || value === "" || value === null) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        execCmd("bold");
      }
      if (key === "i") {
        e.preventDefault();
        execCmd("italic");
      }
      if (key === "u") {
        e.preventDefault();
        execCmd("underline");
      }
    }
  };

  const promptLink = () => {
    const url = prompt("Ingrese la URL:");
    if (url) execCmd("createLink", url);
  };

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-shadow bg-white flex flex-col ${
        isFocused
          ? "ring-2 ring-indigo-500 border-indigo-500"
          : "border-slate-300"
      } ${className}`}
    >
      {/* TOOLBAR */}
      <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 p-1.5 select-none shrink-0">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("bold");
          }}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
          title="Negrita (Ctrl+B)"
        >
          <IconBold size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("italic");
          }}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
          title="Cursiva (Ctrl+I)"
        >
          <IconItalic size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("underline");
          }}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
          title="Subrayado (Ctrl+U)"
        >
          <IconUnderline size={14} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("insertUnorderedList");
          }}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
          title="Lista"
        >
          <IconList size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            promptLink();
          }}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
          title="Enlace"
        >
          <IconLink size={14} />
        </button>
      </div>

      {/* ÁREA EDITABLE */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 p-3 text-sm outline-none overflow-y-auto min-h-[80px] max-h-[300px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
        data-placeholder={placeholder}
        style={{ whiteSpace: "pre-wrap" }} // Respetar saltos de línea visuales
      />
      {!value && !isFocused && (
        <div className="absolute top-[46px] left-3 text-slate-400 text-sm pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
};

// --- UTILIDADES ---
const capitalizeWords = (str) =>
  !str ? "" : str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

function useDebouncedCallback(callback, delay) {
  const handler = useRef(null);
  return useCallback(
    (...args) => {
      if (handler.current) clearTimeout(handler.current);
      handler.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

export default function WorkForm({
  supabase,
  formData: initialData,
  onCancel,
  onSave,
  catalogoInstrumentos,
}) {
  const [formData, setFormData] = useState({
    id: null,
    titulo: "",
    duracion: "",
    link_drive: "",
    link_youtube: "",
    //link_drive: "",
    //link_audio: "",
    instrumentacion: "",
    anio: "",
    estado: "Oficial",
    comentarios: "",
    observaciones: "",
  });

  const [selectedComposers, setSelectedComposers] = useState([]);
  const [selectedArrangers, setSelectedArrangers] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [particellas, setParticellas] = useState([]);
  // --- NUEVO ESTADO PARA ARCOS ---
  const [arcos, setArcos] = useState([]);

  const [instrumentList, setInstrumentList] = useState(
    catalogoInstrumentos || []
  );
  const [composersOptions, setComposersOptions] = useState([]);

  const [genInstrument, setGenInstrument] = useState("");
  const [genQuantity, setGenQuantity] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [showInstrumentOptions, setShowInstrumentOptions] = useState(false);
  const instrumentInputRef = useRef(null);

  const [showDriveMatcher, setShowDriveMatcher] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinksId, setEditingLinksId] = useState(null);

  useEffect(() => {
    if (instrumentList.length === 0) fetchInstruments();
    fetchComposers();

    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        duracion: initialData.duracion_segundos
          ? formatSecondsToTime(initialData.duracion_segundos)
          : "",
        //link_audio: initialData.link_audio || "",
        //link_drive: initialData.link_drive || "",
      }));
    }

    if (initialData?.id) {
      fetchParticellas(initialData.id);
      fetchArcos(initialData.id); // <--- FETCH ARCOS
      fetchWorkDetails(initialData.id);
    }
  }, [initialData?.id]);

  const fetchWorkDetails = async (workId) => {
    const { data } = await supabase
      .from("obras")
      .select("*, obras_compositores(rol, compositores(id, apellido, nombre))")
      .eq("id", workId)
      .single();

    if (data) {
      setFormData((prev) => ({
        ...prev,
        id: data.id,
        titulo: data.titulo || prev.titulo,
        duracion: data.duracion_segundos
          ? formatSecondsToTime(data.duracion_segundos)
          : prev.duracion,
        link_drive: data.link_drive || "",
        link_youtube: data.link_youtube || "",
        //link_audio: data.link_audio || "",
        //link_drive: data.link_drive || "",
        instrumentacion: data.instrumentacion || "",
        anio: data.anio_composicion || "",
        estado: data.estado || "Oficial",
        comentarios: data.comentarios || "",
        observaciones: data.observaciones || "",
      }));

      if (data.obras_compositores) {
        const comps = data.obras_compositores
          .filter((oc) => oc.rol === "compositor")
          .map((oc) => oc.compositores?.id)
          .filter(Boolean);
        const arrs = data.obras_compositores
          .filter((oc) => oc.rol === "arreglador")
          .map((oc) => oc.compositores?.id)
          .filter(Boolean);
        setSelectedComposers(comps);
        setSelectedArrangers(arrs);
      }
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
    if (data) {
      const options = data.map((c) => ({
        id: c.id,
        label: `${c.apellido}, ${c.nombre}`,
      }));
      setComposersOptions(options);
    }
  };

  const fetchParticellas = async (workId) => {
    const { data } = await supabase
      .from("obras_particellas")
      .select("*, instrumentos(instrumento)")
      .eq("id_obra", workId);
    if (data) {
      const mapped = data.map((p) => {
        let linksArray = [];
        try {
          linksArray = JSON.parse(p.url_archivo) || [];
          if (!Array.isArray(linksArray))
            linksArray = [{ url: p.url_archivo, description: "Enlace" }];
        } catch (e) {
          if (p.url_archivo)
            linksArray = [{ url: p.url_archivo, description: "Enlace" }];
        }
        return {
          tempId: p.id,
          id: p.id,
          id_instrumento: p.id_instrumento,
          nombre_archivo: p.nombre_archivo,
          nota_organico: p.nota_organico,
          instrumento_nombre: p.instrumentos?.instrumento,
          links: linksArray,
        };
      });
      setParticellas(
        mapped.sort((a, b) => a.id_instrumento.localeCompare(b.id_instrumento))
      );
    }
  };

  const saveFieldToDb = async (field, value) => {
    if (!formData.id) return;
    setSaveStatus("saving");
    try {
      const payload = {};
      if (field === "duracion")
        payload["duracion_segundos"] = inputToSeconds(value);
      else if (field === "anio")
        payload["anio_composicion"] = value ? parseInt(value) : null;
      else payload[field] = value === "" ? null : value;

      await supabase.from("obras").update(payload).eq("id", formData.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (onSave) onSave(formData.id, false);
    } catch (e) {
      console.error("Autosave error:", e);
      setSaveStatus("error");
    }
  };

  const debouncedSave = useDebouncedCallback(saveFieldToDb, 1000);

  const updateField = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (formData.id) debouncedSave(field, val);
  };

  const updateComposerRelations = async (type, ids) => {
    if (!formData.id) return;
    setSaveStatus("saving");
    try {
      await supabase
        .from("obras_compositores")
        .delete()
        .eq("id_obra", formData.id)
        .eq("rol", type);
      if (ids && ids.length > 0) {
        const inserts = ids.map((id) => ({
          id_obra: formData.id,
          id_compositor: id,
          rol: type,
        }));
        await supabase.from("obras_compositores").insert(inserts);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (onSave) onSave(formData.id, false);
    } catch (e) {
      console.error("Error updating relations:", e);
      setSaveStatus("error");
    }
  };

  const handleComposersChange = (newIds) => {
    setSelectedComposers(newIds);
    updateComposerRelations("compositor", newIds);
  };
  const handleArrangersChange = (newIds) => {
    setSelectedArrangers(newIds);
    updateComposerRelations("arreglador", newIds);
  };

  const handlePartsChange = async (newPartsList, overrideId = null) => {
    const targetId = overrideId || formData.id;
    setParticellas(newPartsList);
    const instr = calculateInstrumentation(newPartsList);
    setFormData((prev) => ({ ...prev, instrumentacion: instr }));

    if (!targetId) return;
    setIsSaving(true);
    try {
      const activeIds = newPartsList.filter((p) => p.id).map((p) => p.id);
      if (!overrideId) {
        const { data: currentParts } = await supabase
          .from("obras_particellas")
          .select("id")
          .eq("id_obra", targetId);
        if (currentParts) {
          const dbIdsToDelete = currentParts
            .filter((dbPart) => !activeIds.includes(dbPart.id))
            .map((x) => x.id);
          if (dbIdsToDelete.length > 0)
            await supabase
              .from("obras_particellas")
              .delete()
              .in("id", dbIdsToDelete);
        }
      }
      const upserts = newPartsList.map((p) => ({
        id: p.id,
        id_obra: targetId,
        id_instrumento: p.id_instrumento,
        nombre_archivo: p.nombre_archivo,
        nota_organico: p.nota_organico,
        url_archivo: JSON.stringify(p.links || []),
      }));
      const toInsert = upserts
        .filter((u) => !u.id)
        .map(({ id, ...rest }) => rest);
      const toUpdate = upserts.filter((u) => u.id);
      if (toInsert.length)
        await supabase.from("obras_particellas").insert(toInsert);
      if (toUpdate.length) {
        for (const item of toUpdate) {
          await supabase
            .from("obras_particellas")
            .update(item)
            .eq("id", item.id);
        }
      }
      if (!overrideId) await fetchParticellas(targetId);
      await supabase
        .from("obras")
        .update({ instrumentacion: instr })
        .eq("id", targetId);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (onSave) onSave(targetId, false);
    } catch (e) {
      console.error("Error syncing parts:", e);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateInitial = async () => {
    if (!formData.titulo) return alert("Título requerido");
    setIsSaving(true);
    try {
      const payload = {
        titulo: formData.titulo,
        duracion_segundos: inputToSeconds(formData.duracion),
        anio_composicion: formData.anio ? parseInt(formData.anio) : null,
        instrumentacion: calculateInstrumentation(particellas),
        estado: formData.estado,
        comentarios: formData.comentarios,
        observaciones: formData.observaciones,
        //link_audio: formData.link_audio,
        link_drive: formData.link_drive,
      };

      const { data, error } = await supabase
        .from("obras")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      const newId = data.id;

      const inserts = [];
      selectedComposers.forEach((id) =>
        inserts.push({ id_obra: newId, id_compositor: id, rol: "compositor" })
      );
      selectedArrangers.forEach((id) =>
        inserts.push({ id_obra: newId, id_compositor: id, rol: "arreglador" })
      );
      if (inserts.length > 0)
        await supabase.from("obras_compositores").insert(inserts);

      if (particellas.length > 0) await handlePartsChange(particellas, newId);
      setFormData((prev) => ({ ...prev, id: newId }));

      if (onSave) onSave(newId, true);
      setSaveStatus("saved");
    } catch (e) {
      alert("Error creando: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const allOptions = [...INSTRUMENT_GROUPS, ...instrumentList];
  const filteredInstruments = allOptions.filter((i) =>
    i.instrumento.toLowerCase().includes(instrumentQuery.toLowerCase())
  );

  const handleAddParts = () => {
    let selectedId = genInstrument;
    if (
      !selectedId &&
      filteredInstruments.length > 0 &&
      instrumentQuery.length >= 2
    ) {
      const match =
        filteredInstruments.find(
          (i) => i.instrumento.toLowerCase() === instrumentQuery.toLowerCase()
        ) || filteredInstruments[0];
      if (match) selectedId = match.id;
    }
    if (!selectedId || genQuantity < 1) return;

    const selectedGroup = INSTRUMENT_GROUPS.find((g) => g.id === selectedId);
    let newParts = [];

    if (selectedGroup) {
      selectedGroup.definitions.forEach((def) => {
        newParts.push({
          tempId: Date.now() + Math.random(),
          id: null,
          id_instrumento: def.id_instrumento,
          nombre_archivo: def.nombre_archivo,
          links: [],
          nota_organico: "",
          instrumento_nombre: def.instrumento_base,
        });
      });
    } else {
      const selectedInstrObj = instrumentList.find((i) => i.id === selectedId);
      if (!selectedInstrObj) return;
      const baseName = capitalizeWords(selectedInstrObj.instrumento);
      for (let i = 1; i <= genQuantity; i++) {
        newParts.push({
          tempId: Date.now() + i + Math.random(),
          id: null,
          id_instrumento: selectedId,
          nombre_archivo: genQuantity > 1 ? `${baseName} ${i}` : baseName,
          links: [],
          nota_organico: "",
          instrumento_nombre: selectedInstrObj.instrumento,
        });
      }
    }
    const updated = [...particellas, ...newParts].sort((a, b) =>
      a.id_instrumento.localeCompare(b.id_instrumento)
    );
    handlePartsChange(updated);
    setGenInstrument("");
    setInstrumentQuery("");
    setGenQuantity(1);
    setShowInstrumentOptions(false);
    setTimeout(() => {
      if (instrumentInputRef.current) {
        instrumentInputRef.current.focus();
        instrumentInputRef.current.value = "";
      }
    }, 10);
  };

  const handleGenKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddParts();
    }
  };
  const handleEditPart = (tempId, field, value) => {
    const updated = particellas.map((p) =>
      p.tempId === tempId ? { ...p, [field]: value } : p
    );
    setParticellas(updated);
  };
  const handleBlurPart = () => {
    handlePartsChange(particellas);
  };
  const handleRemovePart = (tempId) => {
    const updated = particellas.filter((p) => p.tempId !== tempId);
    handlePartsChange(updated);
  };

  // --- LÓGICA DE ARCOS (BOWINGS) ---
  const fetchArcos = async (workId) => {
    const { data } = await supabase
      .from("obras_arcos")
      .select("*")
      .eq("id_obra", workId)
      .order("created_at", { ascending: false });
    if (data) setArcos(data);
  };

  const handleSaveArco = async (arco) => {
    if (!formData.id) return alert("Guarda la obra primero.");
    setSaveStatus("saving");
    try {
      const payload = { ...arco, id_obra: formData.id };
      delete payload.tempId; // Limpiar ID temporal si existe

      const query = arco.id
        ? supabase.from("obras_arcos").update(payload).eq("id", arco.id)
        : supabase.from("obras_arcos").insert([payload]);

      const { error } = await query;
      if (error) throw error;

      await fetchArcos(formData.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  };

  const handleDeleteArco = async (id) => {
    if (!confirm("¿Eliminar este set de arcos?")) return;
    try {
      await supabase.from("obras_arcos").delete().eq("id", id);
      await fetchArcos(formData.id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IconMusic className="text-indigo-600" />{" "}
            {formData.id ? "Editar Obra" : "Nueva Solicitud"}
          </h2>
          {formData.id && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 transition-all">
              {saveStatus === "saving" && (
                <>
                  <IconLoader
                    className="animate-spin text-blue-500"
                    size={10}
                  />{" "}
                  <span className="text-blue-500">Guardando...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <IconCheck className="text-emerald-500" size={10} />{" "}
                  <span className="text-emerald-500">Guardado</span>
                </>
              )}
              {saveStatus === "error" && (
                <span className="text-red-500">Error al guardar</span>
              )}
            </span>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600"
        >
          <IconX size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TÍTULO Y ESTADO */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 relative">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-2">
              Título de la Obra{" "}
              <IconInfo
                size={12}
                title="Admite negrita (Ctrl+B) y cursiva (Ctrl+I)"
              />
            </label>
            <WysiwygEditor
              value={formData.titulo}
              onChange={(val) => updateField("titulo", val)}
              placeholder="Ej: Sinfonía n.5"
              className="shadow-sm min-h-[58px]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Estado
            </label>
            <select
              className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm h-[58px] bg-white cursor-pointer"
              value={formData.estado}
              onChange={(e) => updateField("estado", e.target.value)}
            >
              <option value="Oficial">Oficial</option>
              <option value="Solicitud">Solicitud</option>
            </select>
          </div>
        </div>

        {/* COMPOSITORES Y ARREGLADORES */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div>
            <label className="text-[10px] font-bold uppercase text-indigo-600 mb-1 flex items-center gap-1">
              <IconUser size={12} /> Compositores
            </label>
            <SearchableSelect
              options={composersOptions}
              value={selectedComposers}
              onChange={handleComposersChange}
              isMulti={true}
              placeholder="Buscar y seleccionar..."
              className="bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
              <IconUser size={12} /> Arregladores
            </label>
            <SearchableSelect
              options={composersOptions}
              value={selectedArrangers}
              onChange={handleArrangersChange}
              isMulti={true}
              placeholder="Buscar y seleccionar..."
              className="bg-white"
            />
          </div>
        </div>

        {/* DURACIÓN Y AÑO */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Duración
            </label>
            <input
              type="text"
              className="input text-center"
              value={formData.duracion}
              onChange={(e) => updateField("duracion", e.target.value)}
              placeholder="00:00"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Año
            </label>
            <input
              type="number"
              className="input text-center"
              value={formData.anio}
              onChange={(e) => updateField("anio", e.target.value)}
              placeholder="1804"
            />
          </div>
        </div>

        {/* INSTRUMENTACIÓN */}
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
            Instrumentación
          </label>
          <input
            type="text"
            className="input font-mono bg-slate-50 w-full"
            value={formData.instrumentacion}
            onChange={(e) => updateField("instrumentacion", e.target.value)}
          />
        </div>

        {/* LINKS */}
        <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Link Audio
            </label>
            <input
              type="text"
              className="input text-blue-600 text-xs"
              value={formData.link_audio}
              onChange={(e) => updateField("link_audio", e.target.value)}
              placeholder="Spotify / YouTube..."
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Link Partitura
            </label>
            <input
              type="text"
              className="input text-blue-600 text-xs"
              value={formData.link_drive}
              onChange={(e) => updateField("link_drive", e.target.value)}
              placeholder="Drive PDF..."
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
              Link Carpeta <IconDrive size={10} />
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input text-blue-600 text-xs flex-1"
                value={formData.link_drive}
                onChange={(e) => updateField("link_drive", e.target.value)}
                placeholder="Carpeta de Drive..."
              />
              {formData.id && formData.link_drive && (
                <button
                  onClick={() => setShowDriveMatcher(true)}
                  className="bg-blue-600 text-white px-2 rounded shadow hover:bg-blue-700 flex items-center justify-center"
                  title="Asignar Archivos"
                >
                  <IconLink size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* OBSERVACIONES */}
        <div className="col-span-full">
          <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-2">
            Observaciones{" "}
            <IconInfo
              size={12}
              title="Información adicional (Ediciones, Movimientos, etc.)"
            />
          </label>
          <WysiwygEditor
            value={formData.observaciones}
            onChange={(val) => updateField("observaciones", val)}
            placeholder="Detalles sobre la obra..."
          />
        </div>

        {/* COMENTARIOS */}
        <div className="col-span-full">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
            Notas / Instrumentación Detallada
          </label>
          <WysiwygEditor
            value={formData.comentarios}
            onChange={(val) => updateField("comentarios", val)}
            placeholder="Desglose detallado..."
          />
        </div>
      </div>

      {/* GESTIÓN DE ARCOS */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
          Gestión de Arcos / Bowings
        </h3>
        {!formData.id ? (
          <div className="text-center py-4 text-slate-400 italic bg-slate-50 rounded border border-dashed text-xs">
            Debes guardar la obra primero para gestionar arcos.
          </div>
        ) : (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 gap-2 mb-2">
              {arcos.length === 0 && (
                <span className="text-xs text-slate-400 italic">
                  No hay arcos registrados.
                </span>
              )}
              {arcos.map((arco) => (
                <div
                  key={arco.id}
                  className="flex gap-2 items-center bg-white p-2 rounded border shadow-sm"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      type="text"
                      className="input text-xs font-bold"
                      defaultValue={arco.nombre}
                      onBlur={(e) =>
                        handleSaveArco({ ...arco, nombre: e.target.value })
                      }
                      placeholder="Nombre (ej: Versión 2024)"
                    />
                    <input
                      type="text"
                      className="input text-xs"
                      defaultValue={arco.descripcion}
                      onBlur={(e) =>
                        handleSaveArco({ ...arco, descripcion: e.target.value })
                      }
                      placeholder="Descripción (Opcional)"
                    />
                    <div className="flex items-center gap-1">
                      <IconLink size={14} className="text-slate-400" />
                      <input
                        type="text"
                        className="input text-xs text-blue-600"
                        defaultValue={arco.link}
                        onBlur={(e) =>
                          handleSaveArco({ ...arco, link: e.target.value })
                        }
                        placeholder="Link a Drive/PDF"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteArco(arco.id)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Formulario Nuevo Arco Rápido */}
            <div className="flex gap-2 items-center mt-3 border-t border-dashed pt-3">
              <span className="text-xs font-bold text-indigo-600">Nuevo:</span>
              <input
                id="newArcoName"
                type="text"
                className="input text-xs w-1/3"
                placeholder="Nombre"
              />
              <input
                id="newArcoDesc"
                type="text"
                className="input text-xs w-1/3"
                placeholder="Descripción"
              />
              <input
                id="newArcoLink"
                type="text"
                className="input text-xs w-1/3"
                placeholder="Link"
              />
              <button
                onClick={() => {
                  const name = document.getElementById("newArcoName").value;
                  const desc = document.getElementById("newArcoDesc").value;
                  const link = document.getElementById("newArcoLink").value;
                  if (!name) return;
                  handleSaveArco({
                    nombre: name,
                    descripcion: desc,
                    link: link,
                  });
                  // Limpiar inputs
                  document.getElementById("newArcoName").value = "";
                  document.getElementById("newArcoDesc").value = "";
                  document.getElementById("newArcoLink").value = "";
                }}
                className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
              >
                <IconPlus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">
          Gestión de Particellas
        </h3>
        {!formData.id ? (
          <div className="text-center py-4 text-slate-400 italic bg-slate-50 rounded border border-dashed text-xs">
            Debes crear la solicitud primero para gestionar los archivos
            individuales.
            {particellas.length > 0 && (
              <div className="mt-2 text-indigo-600 font-bold">
                Se crearán {particellas.length} partes automáticamente.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2 items-end bg-slate-50 p-3 rounded mb-4 border border-slate-200 shadow-sm">
              <div className="flex-1 relative">
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                  Instrumento
                </label>
                <input
                  ref={instrumentInputRef}
                  type="text"
                  className="input"
                  placeholder="Buscar (ej: Cuerdas)"
                  value={instrumentQuery}
                  onChange={(e) => {
                    setInstrumentQuery(e.target.value);
                    setGenInstrument("");
                    setShowInstrumentOptions(true);
                  }}
                  onFocus={() => setShowInstrumentOptions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowInstrumentOptions(false), 200)
                  }
                  onKeyDown={handleGenKeyDown}
                />
                {showInstrumentOptions && instrumentQuery && (
                  <div className="absolute top-full left-0 w-full bg-white border shadow-xl max-h-48 overflow-y-auto z-50 rounded mt-1">
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
                          className={
                            i.isGroup ? "font-bold text-indigo-700" : ""
                          }
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
                  onKeyDown={handleGenKeyDown}
                />
              </div>
              <button
                onClick={handleAddParts}
                className="bg-indigo-600 text-white px-4 py-2 rounded h-[38px] hover:bg-indigo-700 shadow-sm"
              >
                <IconPlus />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {particellas.map((p) => (
                <div
                  key={p.tempId}
                  className="flex items-center gap-2 p-2 border rounded bg-white hover:shadow-md transition-all group"
                >
                  <span
                    className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 select-none"
                    title={p.instrumento_nombre}
                  >
                    {p.id_instrumento}
                  </span>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      className="w-full text-sm font-medium border-none p-0 focus:ring-0 text-slate-700 truncate bg-transparent"
                      value={p.nombre_archivo}
                      onChange={(e) =>
                        handleEditPart(
                          p.tempId,
                          "nombre_archivo",
                          e.target.value
                        )
                      }
                      onBlur={handleBlurPart}
                    />
                    {p.links && p.links.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 flex items-center gap-1 w-fit">
                          <IconLink size={8} /> {p.links.length}
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    className="w-8 text-xs text-center border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none bg-transparent"
                    placeholder="Org."
                    value={p.nota_organico || ""}
                    onChange={(e) =>
                      handleEditPart(p.tempId, "nota_organico", e.target.value)
                    }
                    onBlur={handleBlurPart}
                  />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingLinksId(p.tempId);
                        setIsLinkModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1"
                    >
                      <IconLink size={14} />
                    </button>
                    <button
                      onClick={() => handleRemovePart(p.tempId)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-4 pt-6 border-t bg-white sticky bottom-0 z-10 py-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border rounded text-slate-600 font-bold hover:bg-slate-50"
        >
          Cerrar
        </button>
        {!formData.id ? (
          <button
            onClick={handleCreateInitial}
            disabled={isSaving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2"
          >
            {isSaving ? <IconLoader className="animate-spin" /> : <IconCheck />}{" "}
            Crear Solicitud
          </button>
        ) : (
          <div className="flex-1 flex justify-center items-center text-xs text-slate-400 italic">
            Cambios guardados automáticamente
          </div>
        )}
      </div>

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
        onSave={(links) => {
          const updated = particellas.map((p) =>
            p.tempId === editingLinksId ? { ...p, links } : p
          );
          handlePartsChange(updated);
        }}
      />
    </div>
  );
}