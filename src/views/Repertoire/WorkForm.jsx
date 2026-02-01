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
  IconYoutube,
  IconCalendar, 
  IconFileText, 
  IconMessageSquare 
} from "../../components/ui/Icons";
import { formatSecondsToTime, inputToSeconds } from "../../utils/time";
import { calculateInstrumentation } from "../../utils/instrumentation";
import DriveMatcherModal from "../../components/repertoire/DriveMatcherModal";
import LinksManagerModal from "../../components/repertoire/LinksManagerModal";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { INSTRUMENT_GROUPS } from "../../utils/instrumentGroups";

// --- COMPONENTE EDITOR WYSIWYG ---
const WysiwygEditor = ({ value, onChange, placeholder, className = "" }) => {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      if (!editorRef.current.innerHTML || value === "" || value === null) {
        editorRef.current.innerHTML = value || "";
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

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-shadow bg-white flex flex-col ${isFocused ? "ring-2 ring-indigo-500 border-indigo-500" : "border-slate-300"} ${className}`}
    >
      <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 p-1.5 select-none shrink-0">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("bold");
          }}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
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
        >
          <IconItalic size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("insertUnorderedList");
          }}
          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
        >
          <IconList size={14} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 p-3 text-sm outline-none overflow-y-auto min-h-[80px] max-h-[300px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
        style={{ whiteSpace: "pre-wrap" }}
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
    [callback, delay],
  );
}

// --- COMPONENTE PRINCIPAL ---
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
    instrumentacion: "",
    anio: "",
    estado: "Oficial",
    fecha_esperada: "", 
    comentarios: "",
    observaciones: "",
  });

  const [selectedComposers, setSelectedComposers] = useState([]);
  const [selectedArrangers, setSelectedArrangers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [particellas, setParticellas] = useState([]);
  const [arcos, setArcos] = useState([]);
  const [instrumentList, setInstrumentList] = useState(
    catalogoInstrumentos || [],
  );
  const [composersOptions, setComposersOptions] = useState([]);
  const [genInstrument, setGenInstrument] = useState("");
  const [genQuantity, setGenQuantity] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [showInstrumentOptions, setShowInstrumentOptions] = useState(false);
  const [showDriveMatcher, setShowDriveMatcher] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinksId, setEditingLinksId] = useState(null);
  const instrumentInputRef = useRef(null);

  useEffect(() => {
    if (instrumentList.length === 0) fetchInstruments();
    fetchComposers();
    if (initialData?.id) {
      fetchParticellas(initialData.id);
      fetchArcos(initialData.id);
      fetchWorkDetails(initialData.id);
    } else if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData?.id]);

  const fetchWorkDetails = async (workId) => {
    const { data } = await supabase
      .from("obras")
      .select("*, obras_compositores(rol, id_compositor)")
      .eq("id", workId)
      .single();

    if (data) {
      setFormData({
        ...data,
        duracion: data.duracion_segundos
          ? formatSecondsToTime(data.duracion_segundos)
          : "",
        anio: data.anio_composicion || "",
        fecha_esperada: data.fecha_esperada || "",
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

  const fetchParticellas = async (workId) => {
    const { data } = await supabase
      .from("obras_particellas")
      .select("*, instrumentos(instrumento)")
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
            };
          })
          .sort((a, b) => a.id_instrumento.localeCompare(b.id_instrumento)),
      );
    }
  };

  const fetchArcos = async (workId) => {
    const { data } = await supabase
      .from("obras_arcos")
      .select("*")
      .eq("id_obra", workId)
      .order("created_at", { ascending: false });
    if (data) setArcos(data);
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
      else if (field === "fecha_esperada")
        payload["fecha_esperada"] = value || null;
      else payload[field] = value === "" ? null : value;
      
      await supabase.from("obras").update(payload).eq("id", formData.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (onSave) onSave(formData.id, false);
    } catch (e) {
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

  const handlePartsChange = async (newPartsList, overrideId = null) => {
    const targetId = overrideId || formData.id;
    setParticellas(newPartsList);
    const instr = calculateInstrumentation(newPartsList);
    setFormData((prev) => ({ ...prev, instrumentacion: instr }));

    if (!targetId) return;
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

      if (results.length > 0 && !overrideId) {
        const merged = newPartsList.map((p) => {
          const dbMatch = results.find(
            (s) =>
              s.id_instrumento === p.id_instrumento &&
              s.nombre_archivo === p.nombre_archivo,
          );
          return dbMatch ? { ...p, id: dbMatch.id } : p;
        });
        setParticellas(merged);
      }

      await supabase
        .from("obras")
        .update({ instrumentacion: instr })
        .eq("id", targetId);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (onSave) onSave(targetId, false);
    } catch (e) {
      console.error("Error al guardar particellas:", e);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateInitial = async () => {
    if (!formData.titulo) return alert("Título requerido");
    setIsSaving(true);
    const payload = {
      titulo: formData.titulo,
      duracion_segundos: inputToSeconds(formData.duracion),
      anio_composicion: formData.anio ? parseInt(formData.anio) : null,
      instrumentacion: calculateInstrumentation(particellas),
      estado: formData.estado,
      fecha_esperada: formData.estado === 'Solicitud' ? formData.fecha_esperada : null,
      comentarios: formData.comentarios,
      observaciones: formData.observaciones,
      link_drive: formData.link_drive,
      link_youtube: formData.link_youtube,
    };
    const { data, error } = await supabase
      .from("obras")
      .insert([payload])
      .select()
      .single();
    if (!error) {
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
      if (relations.length > 0)
        await supabase.from("obras_compositores").insert(relations);
      if (particellas.length > 0) await handlePartsChange(particellas, newId);
      setFormData((prev) => ({ ...prev, id: newId }));
      if (onSave) onSave(newId, true);
    }
    setIsSaving(false);
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

  const handleSaveArco = async (arco) => {
    if (!formData.id) return alert("Guarda la obra primero.");
    const payload = { ...arco, id_obra: formData.id };
    delete payload.tempId;
    const query = arco.id
      ? supabase.from("obras_arcos").update(payload).eq("id", arco.id)
      : supabase.from("obras_arcos").insert([payload]);
    await query;
    fetchArcos(formData.id);
  };

  const handleDeleteArco = async (id) => {
    if (confirm("¿Eliminar?")) {
      await supabase.from("obras_arcos").delete().eq("id", id);
      fetchArcos(formData.id);
    }
  };

  const allOptions = [...INSTRUMENT_GROUPS, ...instrumentList];
  const filteredInstruments = allOptions.filter((i) =>
    i.instrumento.toLowerCase().includes(instrumentQuery.toLowerCase()),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <IconMusic className="text-indigo-600" />{" "}
          {formData.id ? "Editar Obra" : "Nueva Solicitud"}
        </h2>
        <div className="flex items-center gap-4">
          {saveStatus === "saving" && (
            <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1">
              <IconLoader size={12} className="animate-spin" /> Guardando...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-500 flex items-center gap-1">
              <IconCheck size={12} /> Guardado
            </span>
          )}
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={24} />
          </button>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
            Título
          </label>
          <WysiwygEditor
            value={formData.titulo}
            onChange={(v) => updateField("titulo", v)}
            placeholder="Ej: Sinfonía n.5"
            className="min-h-[58px]"
          />
        </div>
        
        {/* LOGICA DE ESTADO Y FECHA */}
        <div className={formData.estado === "Solicitud" ? "flex flex-col gap-2" : ""}>
          <div className="w-full">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Estado
            </label>
            <select
              className="w-full border p-2 rounded-lg font-bold text-sm h-[58px] bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              value={formData.estado}
              onChange={(e) => updateField("estado", e.target.value)}
            >
              <option value="Oficial">Oficial</option>
              <option value="Solicitud">Solicitud</option>
            </select>
          </div>
          
          {formData.estado === "Solicitud" && (
            <div className="w-full animate-in slide-in-from-top-2 fade-in">
              <label className="text-[10px] font-bold uppercase text-amber-600 mb-1 flex items-center gap-1 truncate">
                <IconCalendar size={10} /> F. Esperada
              </label>
              <input 
                type="date"
                className="w-full border border-amber-200 bg-amber-50 text-amber-800 p-2 rounded-lg text-xs h-[58px] outline-none focus:ring-2 focus:ring-amber-500"
                value={formData.fecha_esperada || ""}
                onChange={(e) => updateField("fecha_esperada", e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase text-indigo-600 mb-1 flex items-center gap-1">
            <IconUser size={12} /> Compositores
          </label>
          <SearchableSelect
            options={composersOptions}
            value={selectedComposers}
            isMulti
            onChange={(ids) => {
              setSelectedComposers(ids);
              updateComposerRelations("compositor", ids);
            }}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <IconUser size={12} /> Arregladores
          </label>
          <SearchableSelect
            options={composersOptions}
            value={selectedArrangers}
            isMulti
            onChange={(ids) => {
              setSelectedArrangers(ids);
              updateComposerRelations("arreglador", ids);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:col-span-2">
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
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
            Instrumentación
          </label>
          <input
            type="text"
            className="input font-mono bg-slate-50"
            value={formData.instrumentacion}
            onChange={(e) => updateField("instrumentacion", e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase text-indigo-600 mb-1 flex items-center gap-1">
            <IconDrive size={12} /> Carpeta Drive de Material
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input text-xs text-blue-600"
              value={formData.link_drive}
              onChange={(e) => updateField("link_drive", e.target.value)}
              placeholder="URL carpeta..."
            />
            {formData.id && formData.link_drive && (
              <button
                onClick={() => setShowDriveMatcher(true)}
                className="bg-blue-600 text-white px-3 rounded shadow hover:bg-blue-700 transition-colors"
              >
                <IconLink size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase text-red-600 mb-1 flex items-center gap-1">
            <IconYoutube size={12} /> Link Audio / Video
          </label>
          <input
            type="text"
            className="input text-xs"
            value={formData.link_youtube}
            onChange={(e) => updateField("link_youtube", e.target.value)}
            placeholder="Spotify / Youtube..."
          />
        </div>
      </div>

      {/* --- SECCIÓN NUEVA: OBSERVACIONES Y COMENTARIOS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <IconFileText size={12}/> Observaciones (Públicas)
          </label>
          <WysiwygEditor
            value={formData.observaciones}
            onChange={(v) => updateField("observaciones", v)}
            placeholder="Notas sobre ediciones, versiones, etc..."
            className="min-h-[100px] border-slate-200"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
            <IconMessageSquare size={12}/> Comentarios (Internos)
          </label>
          <textarea
            className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none bg-slate-50"
            value={formData.comentarios || ""}
            onChange={(e) => updateField("comentarios", e.target.value)}
            placeholder="Notas privadas para la gestión..."
          />
        </div>
      </div>

      {/* ARCOS */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
          Gestión de Arcos / Bowings
        </h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          {arcos.map((a) => (
            <div
              key={a.id}
              className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm group"
            >
              <input
                type="text"
                className="input text-xs font-bold border-none"
                defaultValue={a.nombre}
                onBlur={(e) => handleSaveArco({ ...a, nombre: e.target.value })}
              />
              <input
                type="text"
                className="input text-xs border-none flex-1"
                defaultValue={a.descripcion}
                onBlur={(e) =>
                  handleSaveArco({ ...a, descripcion: e.target.value })
                }
              />
              <input
                type="text"
                className="input text-xs text-blue-600 border-none w-1/3"
                defaultValue={a.link}
                onBlur={(e) => handleSaveArco({ ...a, link: e.target.value })}
              />
              <button
                onClick={() => handleDeleteArco(a.id)}
                className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2 items-center pt-2 border-t border-dashed">
            <input
              id="newArcN"
              className="input text-xs w-1/4"
              placeholder="Nombre Set"
            />
            <input
              id="newArcD"
              className="input text-xs flex-1"
              placeholder="Descripción"
            />
            <input
              id="newArcL"
              className="input text-xs w-1/3"
              placeholder="Link Drive"
            />
            <button
              onClick={() => {
                const n = document.getElementById("newArcN"),
                  d = document.getElementById("newArcD"),
                  l = document.getElementById("newArcL");
                if (n.value)
                  handleSaveArco({
                    nombre: n.value,
                    descripcion: d.value,
                    link: l.value,
                  });
                n.value = "";
                d.value = "";
                l.value = "";
              }}
              className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
            >
              <IconPlus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* PARTICELLAS - LISTA TABULADA */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">
          Gestión de Particellas
        </h3>
        
        {/* BARRA DE CREACIÓN */}
        <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-xl mb-4 border border-slate-200 shadow-sm">
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
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            {/* ENCABEZADO */}
            <div className="grid grid-cols-12 gap-2 bg-slate-50 border-b border-slate-200 px-4 py-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                <div className="col-span-1 text-center">ID</div>
                <div className="col-span-5">Nombre de Particella</div>
                <div className="col-span-2 text-center">Nota Org.</div>
                <div className="col-span-2 text-center">Enlaces</div>
                <div className="col-span-2 text-right">Acciones</div>
            </div>

            {/* FILAS */}
            <div className="divide-y divide-slate-100">
                {particellas.map((p) => (
                    <div key={p.tempId} className="grid grid-cols-12 gap-2 px-4 py-2 items-center hover:bg-slate-50 transition-colors group text-sm">
                        {/* 1. ID INSTRUMENTO */}
                        <div className="col-span-1 flex justify-center">
                            <span className="w-8 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                                {p.id_instrumento}
                            </span>
                        </div>

                        {/* 2. NOMBRE */}
                        <div className="col-span-5">
                            <input
                                className="w-full bg-transparent border-none p-0 text-slate-700 font-bold focus:ring-0 placeholder:text-slate-300 focus:bg-white focus:shadow-sm rounded px-1 transition-all"
                                value={p.nombre_archivo}
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

                        {/* 3. NOTA ORGANICO */}
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

                        {/* 4. ENLACES */}
                        <div className="col-span-2 flex justify-center">
                            <button
                                onClick={() => {
                                    setEditingLinksId(p.tempId);
                                    setIsLinkModalOpen(true);
                                }}
                                className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${p.links?.length > 0 ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                            >
                                <IconLink size={12}/>
                                {p.links?.length > 0 ? `${p.links.length} Link(s)` : "Sin Links"}
                            </button>
                        </div>

                        {/* 5. ACCIONES */}
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
                        No hay particellas cargadas. Usa el buscador arriba para agregar instrumentos.
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* FOOTER ACCIONES */}
      <div className="flex gap-4 pt-6 border-t bg-white sticky bottom-0 z-10 py-4 shadow-[0_-10px_20px_-15px_rgba(0,0,0,0.1)]">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors"
        >
          Cerrar
        </button>
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
        onSave={(links) => {
          const updated = particellas.map((p) =>
            p.tempId === editingLinksId ? { ...p, links } : p,
          );
          handlePartsChange(updated);
        }}
      />
    </div>
  );
}