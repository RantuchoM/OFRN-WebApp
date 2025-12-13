import React, { useState, useEffect, useRef, useCallback } from "react";
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
  IconExternalLink,
  IconDrive,
  IconFolderMusic,
  IconAlertCircle,
} from "../../components/ui/Icons";
import { formatSecondsToTime, inputToSeconds } from "../../utils/time";
import { calculateInstrumentation } from "../../utils/instrumentation";
import DriveMatcherModal from "../../components/repertoire/DriveMatcherModal";
import LinksManagerModal from "../../components/repertoire/LinksManagerModal";
import { INSTRUMENT_GROUPS } from "../../utils/instrumentGroups"; // <--- IMPORTAR GRUPOS
const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );
};

const capitalizeWords = (str) =>
  !str ? "" : str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

// Hook simple de debounce
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
  isNew,
  catalogoInstrumentos,
}) {
  // Estado local del formulario
  const [formData, setFormData] = useState({
    id: null,
    titulo: "",
    duracion: "",
    link_drive: "",
    link_youtube: "",
    instrumentacion: "",
    anio: "",
    estado: "Oficial",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle, saving, saved, error
  const [particellas, setParticellas] = useState([]);

  // Listas auxiliares
  const [instrumentList, setInstrumentList] = useState(
    catalogoInstrumentos || []
  );
  const [composersList, setComposersList] = useState([]);

  // UI Helpers
  const [genInstrument, setGenInstrument] = useState("");
  const [genQuantity, setGenQuantity] = useState(1);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [showInstrumentOptions, setShowInstrumentOptions] = useState(false);
  const instrumentInputRef = useRef(null);

  const [selectedComposer, setSelectedComposer] = useState(null);
  const [composerQuery, setComposerQuery] = useState("");
  const [showComposerOptions, setShowComposerOptions] = useState(false);

  const [selectedArranger, setSelectedArranger] = useState(null);
  const [arrangerQuery, setArrangerQuery] = useState("");
  const [showArrangerOptions, setShowArrangerOptions] = useState(false);

  const [showDriveMatcher, setShowDriveMatcher] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLinksId, setEditingLinksId] = useState(null);

  useEffect(() => {
    if (instrumentList.length === 0) fetchInstruments();
    fetchComposers();

    if (initialData) {
      setFormData({
        id: initialData.id,
        titulo: initialData.titulo || "",
        duracion: initialData.duracion_segundos
          ? formatSecondsToTime(initialData.duracion_segundos)
          : "",
        link_drive: initialData.link_drive || "",
        link_youtube: initialData.link_youtube || "",
        instrumentacion: initialData.instrumentacion || "",
        anio: initialData.anio_composicion || "",
        estado: initialData.estado || "Oficial",
      });
    }

    if (initialData?.id) {
      fetchParticellas(initialData.id);
      fetchWorkDetails(initialData.id);
    }
  }, [initialData?.id]);

  // --- FETCHERS ---
  const fetchWorkDetails = async (workId) => {
    const { data } = await supabase
      .from("obras")
      .select("*, obras_compositores(rol, compositores(id, apellido, nombre))")
      .eq("id", workId)
      .single();

    if (data) {
      setFormData((prev) => ({
        ...prev,
        id: data.id, // Asegurar ID
        link_drive: data.link_drive || "",
        link_youtube: data.link_youtube || "",
        instrumentacion: data.instrumentacion || "",
        anio: data.anio_composicion || "",
        titulo: data.titulo || prev.titulo,
        duracion: data.duracion_segundos
          ? formatSecondsToTime(data.duracion_segundos)
          : prev.duracion,
        estado: data.estado || "Oficial",
      }));

      if (data.obras_compositores) {
        const comp = data.obras_compositores.find(
          (oc) => !oc.rol || oc.rol === "compositor"
        )?.compositores;
        const arr = data.obras_compositores.find(
          (oc) => oc.rol === "arreglador"
        )?.compositores;
        if (comp) {
          setSelectedComposer(comp);
          setComposerQuery(`${comp.apellido}, ${comp.nombre}`);
        }
        if (arr) {
          setSelectedArranger(arr);
          setArrangerQuery(`${arr.apellido}, ${arr.nombre}`);
        }
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
      .select("*")
      .order("apellido");
    if (data) setComposersList(data);
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

  // --- AUTOGUARDADO ---
  const saveFieldToDb = async (field, value) => {
    if (!formData.id) return; // No guardamos si no existe la obra aún
    setSaveStatus("saving");
    try {
      const payload = {};
      // Mapeo especial para campos procesados
      if (field === "duracion")
        payload["duracion_segundos"] = inputToSeconds(value);
      else if (field === "anio")
        payload["anio_composicion"] = value ? parseInt(value) : null;
      else payload[field] = value === "" ? null : value; // Strings vacíos a null opcionalmente

      await supabase.from("obras").update(payload).eq("id", formData.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);

      // Refrescar padre silenciosamente si es necesario (opcional)
      if (onSave) onSave(formData.id);
    } catch (e) {
      console.error("Autosave error:", e);
      setSaveStatus("error");
    }
  };

  const debouncedSave = useDebouncedCallback(saveFieldToDb, 1000);

  // Wrapper para inputs: actualiza estado local instantáneo + dispara autoguardado
  const updateField = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    // Si tenemos ID, disparamos el autoguardado
    if (formData.id) debouncedSave(field, val);
  };

  // --- GESTIÓN COMPOSITORES ---
  const updateComposerRelation = async (type, personObj) => {
    // type: 'compositor' | 'arreglador'
    if (!formData.id) return; // Solo si existe obra

    try {
      // Borrar relación previa de ese tipo
      await supabase
        .from("obras_compositores")
        .delete()
        .eq("id_obra", formData.id)
        .eq("rol", type);

      if (personObj && personObj.id) {
        // Validar unicidad: no insertar si ya existe (ej: mismo compositor y arreglador)
        // Primero verificamos si esa persona ya está en la obra con OTRO rol, si la BD no lo permite.
        // Supabase permite multiples roles si la PK es (id_obra, id_compositor, rol).
        // Pero si tu PK es (id_obra, id_compositor), entonces hay conflicto.
        // Asumimos conflicto y chequeamos.

        const { data: existing } = await supabase
          .from("obras_compositores")
          .select("*")
          .eq("id_obra", formData.id)
          .eq("id_compositor", personObj.id);

        if (existing && existing.length > 0) {
          // Si ya existe, no hacemos nada o actualizamos rol?
          // Mejor lógica: si ya es compositor y lo pongo de arreglador, no hago insert nuevo si va a fallar.
          // Si tu tabla permite duplicados por rol, adelante. Si no, skip.
          // Asumimos que SI permite (id, id_obra, id_compositor, rol).
          await supabase.from("obras_compositores").insert({
            id_obra: formData.id,
            id_compositor: personObj.id,
            rol: type,
          });
        } else {
          await supabase.from("obras_compositores").insert({
            id_obra: formData.id,
            id_compositor: personObj.id,
            rol: type,
          });
        }
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Error updating composer:", e);
    }
  };

  // --- GESTIÓN DE PARTES (DIRECTA A DB) ---
  const handlePartsChange = async (newPartsList) => {
    // 1. Actualización Optimista Local
    setParticellas(newPartsList);
    const newInstr = calculateInstrumentation(newPartsList);
    setFormData((prev) => ({ ...prev, instrumentacion: newInstr }));

    // Si no hay obra guardada, paramos aquí (solo memoria)
    if (!formData.id) return;

    setIsSaving(true);
    try {
      // 2. Diffing y Persistencia en DB
      // IDs que existen en la nueva lista
      const activeIds = newPartsList.filter((p) => p.id).map((p) => p.id);

      // Borrar los que ya no están
      const idsToDelete = particellas
        .filter((p) => p.id && !activeIds.includes(p.id))
        .map((p) => p.id);
      if (idsToDelete.length > 0) {
        await supabase.from("obras_particellas").delete().in("id", idsToDelete);
      }

      // Upsert (Insertar/Actualizar)
      // Nota: Supabase upsert requiere que le pasemos ID si es update, o sin ID si es insert.
      const upserts = newPartsList.map((p) => ({
        id: p.id, // null para nuevos
        id_obra: formData.id,
        id_instrumento: p.id_instrumento,
        nombre_archivo: p.nombre_archivo,
        nota_organico: p.nota_organico,
        url_archivo: JSON.stringify(p.links || []),
      }));

      // Separamos para evitar problemas con IDs null en upsert masivo
      const toInsert = upserts
        .filter((u) => !u.id)
        .map(({ id, ...rest }) => rest);
      const toUpdate = upserts.filter((u) => u.id);

      if (toInsert.length > 0)
        await supabase.from("obras_particellas").insert(toInsert);
      if (toUpdate.length > 0) {
        // Upsert masivo para updates funciona bien si la tabla tiene PK
        await supabase.from("obras_particellas").upsert(toUpdate);
      }

      // 3. Recargar IDs reales para evitar problemas futuros (Crear -> Editar -> Error)
      await fetchParticellas(formData.id);

      // 4. Guardar instrumentación actualizada en la obra
      await supabase
        .from("obras")
        .update({ instrumentacion: newInstr })
        .eq("id", formData.id);

      // Notificar al padre (RepertoireManager) que hubo cambios para que refresque si quiere
      if (onSave) onSave(formData.id);
    } catch (e) {
      console.error("Error guardando partes:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Wrappers locales para la UI que llaman a handlePartsChange
  // --- LÓGICA DE AGREGAR PARTES (ACTUALIZADA) ---

  // 1. Combinamos Grupos + Instrumentos Reales para el filtrado
  const allOptions = [...INSTRUMENT_GROUPS, ...instrumentList];
  const filteredInstruments = allOptions.filter((i) =>
    i.instrumento.toLowerCase().includes(instrumentQuery.toLowerCase())
  );

  const handleAddParts = () => {
    let selectedId = genInstrument;

    // Autoselección si hay match único
    if (
      !selectedId &&
      filteredInstruments.length > 0 &&
      instrumentQuery.length >= 2
    ) {
      // Priorizamos match exacto
      const match =
        filteredInstruments.find(
          (i) => i.instrumento.toLowerCase() === instrumentQuery.toLowerCase()
        ) || filteredInstruments[0];
      if (match) selectedId = match.id;
    }

    if (!selectedId || genQuantity < 1) return;

    // A. VERIFICAR SI ES UN GRUPO
    const selectedGroup = INSTRUMENT_GROUPS.find((g) => g.id === selectedId);
    let newParts = [];

    if (selectedGroup) {
      // Es un grupo: Iteramos sus definiciones y creamos las partes
      // (Ignoramos 'genQuantity' o lo usamos como multiplicador de secciones si quisieras, aquí lo ignoramos para simplificar)
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
      // B. ES UN INSTRUMENTO INDIVIDUAL (Lógica anterior)
      const selectedInstrObj = instrumentList.find((i) => i.id === selectedId);
      if (!selectedInstrObj) return; // Seguridad

      const baseName = capitalizeWords(selectedInstrObj.instrumento);
      for (let i = 1; i <= genQuantity; i++) {
        const name = genQuantity > 1 ? `${baseName} ${i}` : baseName;
        newParts.push({
          tempId: Date.now() + i + Math.random(),
          id: null,
          id_instrumento: selectedId,
          nombre_archivo: name,
          links: [],
          nota_organico: "",
          instrumento_nombre: selectedInstrObj.instrumento,
        });
      }
    }

    // Guardado (igual que antes)
    const updated = [...particellas, ...newParts].sort((a, b) => {
      // Truco para ordenar: si no es número, asumimos que los grupos van primero o por orden de creación
      // Mejor mantener el orden de inserción para los grupos y luego por ID para el resto si se desea.
      // Por ahora mantenemos tu sort por ID instrumento:
      return a.id_instrumento.localeCompare(b.id_instrumento);
    });

    handlePartsChange(updated); // Usamos tu función centralizada de guardado

    // Reset UI
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
    // Actualizamos estado local rápido para UX, y usamos debounce para guardar si es texto
    const updated = particellas.map((p) =>
      p.tempId === tempId ? { ...p, [field]: value } : p
    );
    setParticellas(updated);
    // Aquí deberíamos usar un debounce específico para partes si queremos ser muy finos,
    // o guardar en onBlur. Por simplicidad, guardamos directo (puede ser pesado si escribes rápido).
    // MEJORA: Solo guardar en onBlur o Enter para nombre_archivo.
    // Para este ejemplo, llamaremos a handlePartsChange directo (Live Save).
    if (field !== "nombre_archivo") handlePartsChange(updated); // Guardar cambios de estructura/nota directo
  };

  // Guardado específico al terminar de editar nombre
  const handleBlurPart = () => {
    handlePartsChange(particellas);
  };

  const handleRemovePart = (tempId) => {
    const updated = particellas.filter((p) => p.tempId !== tempId);
    handlePartsChange(updated);
  };

  // --- CREACIÓN INICIAL ---
  const handleCreateInitial = async () => {
    if (!formData.titulo) return alert("Título requerido");
    setIsSaving(true);
    try {
      const payload = {
        titulo: formData.titulo,
        duracion_segundos: inputToSeconds(formData.duracion),
        estado: formData.estado,
        // ... otros campos iniciales
      };

      const { data, error } = await supabase
        .from("obras")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      // Actualizamos estado para pasar a modo edición/autoguardado
      setFormData((prev) => ({ ...prev, id: data.id }));

      // Si había partes en memoria (raro, pero posible), guardarlas ahora
      if (particellas.length > 0) {
        // Llamar lógica de guardado de partes con el nuevo ID
        // ... (simplificado: el usuario probablemente agregue partes DESPUES de crear)
      }

      if (onSave) onSave(data.id); // Notificar padre
      setSaveStatus("saved");
    } catch (e) {
      alert("Error creando: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Selectores UI
  const filteredComposers = composersList.filter((c) =>
    `${c.apellido}, ${c.nombre}`
      .toLowerCase()
      .includes(composerQuery.toLowerCase())
  );
  const filteredArrangers = composersList.filter((c) =>
    `${c.apellido}, ${c.nombre}`
      .toLowerCase()
      .includes(arrangerQuery.toLowerCase())
  );

  // Manejo selección compositor (Guarda en DB)
  const handleSelectComposer = (c) => {
    setSelectedComposer(c);
    setShowComposerOptions(false);
    setComposerQuery(`${c.apellido}, ${c.nombre}`);
    updateComposerRelation("compositor", c);
  };

  const handleSelectArranger = (c) => {
    setSelectedArranger(c);
    setShowArrangerOptions(false);
    setArrangerQuery(`${c.apellido}, ${c.nombre}`);
    updateComposerRelation("arreglador", c);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IconMusic className="text-indigo-600" />{" "}
            {formData.id ? "Editar Obra" : "Nueva Obra"}
          </h2>
          {/* Indicador de Estado */}
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
        <div className="col-span-full">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
            Título de la Obra
          </label>
          <textarea
            rows={2}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-lg font-bold"
            value={formData.titulo}
            onChange={(e) => updateField("titulo", e.target.value)}
            placeholder="Ej: Sinfonía n.5"
            autoFocus
          />
        </div>

        {/* COMPOSITOR */}
        <div className="relative">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
            Compositor
          </label>
          {selectedComposer ? (
            <div className="flex justify-between items-center p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-bold">
              <span>
                {selectedComposer.apellido}, {selectedComposer.nombre}
              </span>
              <button
                onClick={() => {
                  setSelectedComposer(null);
                  setComposerQuery("");
                  updateComposerRelation("compositor", null);
                }}
              >
                <IconX size={16} />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                className="input"
                placeholder="Buscar..."
                value={composerQuery}
                onChange={(e) => {
                  setComposerQuery(e.target.value);
                  setShowComposerOptions(true);
                }}
                onFocus={() => setShowComposerOptions(true)}
              />
              {showComposerOptions && composerQuery && (
                <div className="absolute top-full left-0 w-full bg-white border shadow-xl z-50 max-h-48 overflow-y-auto">
                  {filteredComposers.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 hover:bg-slate-50 cursor-pointer text-sm"
                      onClick={() => handleSelectComposer(c)}
                    >
                      {c.apellido}, {c.nombre}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ARREGLADOR */}
        <div className="relative">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
            Arreglador
          </label>
          {selectedArranger ? (
            <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-700 font-bold">
              <span>
                {selectedArranger.apellido}, {selectedArranger.nombre}
              </span>
              <button
                onClick={() => {
                  setSelectedArranger(null);
                  setArrangerQuery("");
                  updateComposerRelation("arreglador", null);
                }}
              >
                <IconX size={16} />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                className="input"
                placeholder="Buscar..."
                value={arrangerQuery}
                onChange={(e) => {
                  setArrangerQuery(e.target.value);
                  setShowArrangerOptions(true);
                }}
                onFocus={() => setShowArrangerOptions(true)}
              />
              {showArrangerOptions && arrangerQuery && (
                <div className="absolute top-full left-0 w-full bg-white border shadow-xl z-50 max-h-48 overflow-y-auto">
                  {filteredArrangers.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 hover:bg-slate-50 cursor-pointer text-sm"
                      onClick={() => handleSelectArranger(c)}
                    >
                      {c.apellido}, {c.nombre}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
              Duración
            </label>
            <input
              type="text"
              className="input"
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
              className="input"
              value={formData.anio}
              onChange={(e) => updateField("anio", e.target.value)}
              placeholder="1804"
            />
          </div>
        </div>
        <div className="col-span-full">
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
        <div className="col-span-full relative">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block flex items-center gap-2">
            Link Drive <IconDrive size={12} />
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input text-blue-600"
              value={formData.link_drive}
              onChange={(e) => updateField("link_drive", e.target.value)}
              placeholder="https://drive.google.com/..."
            />
            {formData.id && formData.link_drive && (
              <button
                onClick={() => setShowDriveMatcher(true)}
                className="bg-blue-600 text-white px-3 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-1 whitespace-nowrap text-sm font-bold animate-in zoom-in"
              >
                <IconLink size={16} /> Asignar Archivos
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">
          Gestión de Particellas
        </h3>

        {/* Si no hay ID, bloqueamos la gestión de partes para evitar inconsistencias */}
        {!formData.id ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-sm text-slate-500">
            <IconAlertCircle className="inline mr-2" /> Guarda la obra primero
            para gestionar particellas.
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
                  placeholder="Buscar (ej: Viol)"
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
                        {i.instrumento}
                      </div>
                    ))}
                    {filteredInstruments.length === 0 && (
                      <div className="p-2 text-xs text-slate-400 italic">
                        No encontrado
                      </div>
                    )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {particellas.map((p) => (
                <div
                  key={p.tempId}
                  className="flex items-center gap-2 p-2 border rounded bg-white hover:shadow-sm transition-shadow group"
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
                      className="w-full text-sm font-medium border-none p-0 focus:ring-0 text-slate-700 truncate"
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
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {p.links &&
                        p.links.map((l, i) => (
                          <a
                            key={i}
                            href={l.url}
                            target="_blank"
                            className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1 truncate max-w-[150px] hover:underline"
                            title={l.url}
                          >
                            <IconLink size={10} /> {l.description || "Link"}
                          </a>
                        ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    className="w-12 text-xs text-center border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none"
                    placeholder="Org."
                    value={p.nota_organico || ""}
                    onChange={(e) =>
                      handleEditPart(p.tempId, "nota_organico", e.target.value)
                    }
                    onBlur={handleBlurPart}
                    title="Nota para cálculo"
                  />
                  <button
                    onClick={() => openLinkModal(p)}
                    className={`p-1 rounded transition-colors ${
                      p.links?.length
                        ? "text-blue-600"
                        : "text-slate-300 hover:text-blue-500"
                    }`}
                  >
                    <IconLink size={14} />
                  </button>
                  <button
                    onClick={() => handleRemovePart(p.tempId)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
              {particellas.length === 0 && (
                <div className="col-span-full text-center py-8 text-slate-400 italic bg-slate-50 rounded border border-dashed">
                  No hay particellas definidas.
                </div>
              )}
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

        {/* Botón de CREAR solo si es nueva, luego es autoguardado */}
        {!formData.id ? (
          <button
            onClick={handleCreateInitial}
            disabled={isSaving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-lg flex justify-center items-center gap-2"
          >
            {isSaving ? <IconLoader className="animate-spin" /> : <IconCheck />}{" "}
            Crear Obra
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
        onPartsChange={handlePartsChange} // <--- ESTO CONECTA TODO
        supabase={supabase}
        catalogoInstrumentos={instrumentList}
      />

      {/* (LinksManagerModal aquí si lo necesitas para edición manual, no cambió) */}
    </div>
  );
}
