import React, { useState, useEffect } from "react";
import {
  IconEdit,
  IconCheck,
  IconX,
  IconLoader,
  IconLink,
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconPhoto 
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";

// --- UTILIDAD: RENDERER DE TEXTO RICO (Importado o Definido Localmente) ---
const RichTextPreview = ({ content, className = "" }) => {
    if (!content) return null;
    return (
        <div 
            className={`whitespace-pre-wrap [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:ml-1 inline-block ${className}`} 
            dangerouslySetInnerHTML={{ __html: content }} 
        />
    );
};

// --- UTILIDAD NUEVA: CONVERTIR LINK DRIVE A IMAGEN (CDN) ---
const getDirectDriveLink = (url) => {
  if (!url) return null;
  const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|drive\.google\.com\/file\/u\/[0-9]\/d\/)([-a-zA-Z0-9]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`; // URL CDN Correcta para imágenes públicas
  }
  return url;
};

// --- UTILIDADES DE FORMATO ---
const formatDateExtended = (dateStr, timeStr) => {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T12:00:00`);
  const options = { weekday: "long", day: "numeric", month: "long" };
  const datePart = date.toLocaleDateString("es-ES", options);
  const timePart = timeStr ? ` | ${timeStr.slice(0, 5)} hs` : "";
  return datePart.charAt(0).toUpperCase() + datePart.slice(1) + timePart;
};

const formatHeaderDates = (events) => {
  if (!events || events.length === 0) return "Fechas a confirmar";
  const dates = events
    .map((e) => new Date(e.fecha + "T12:00:00"))
    .sort((a, b) => a - b);
  const groups = {};
  dates.forEach((date) => {
    const month = date.toLocaleDateString("es-ES", { month: "long" });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    if (!groups[monthCap]) groups[monthCap] = [];
    groups[monthCap].push(date.getDate());
  });
  return Object.entries(groups)
    .map(([month, days]) => {
      const uniqueDays = [...new Set(days)].sort((a, b) => a - b);
      const dayStr = uniqueDays.join(" y ");
      return `${month} ${dayStr}`;
    })
    .join(" | ");
};

// --- COMPONENTE: GESTOR DE LOGOS GENERALES ---
const GeneralLogosManager = ({ supabase }) => {
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLogo, setNewLogo] = useState({ nombre: "", url: "" });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ nombre: "", url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("logos_generales")
      .select("*")
      .order("created_at", { ascending: false });
    setLogos(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newLogo.nombre || !newLogo.url) return alert("Completa ambos campos");
    setAdding(true);
    const { error } = await supabase.from("logos_generales").insert([newLogo]);
    if (error) alert("Error al agregar: " + error.message);
    else {
      setNewLogo({ nombre: "", url: "" });
      fetchLogos();
    }
    setAdding(false);
  };

  const handleEditClick = (logo) => {
    setEditingId(logo.id);
    setEditFormData({ nombre: logo.nombre, url: logo.url });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ nombre: "", url: "" });
  };

  const handleSaveEdit = async (id) => {
    if (!editFormData.nombre || !editFormData.url)
      return alert("Completa ambos campos");
    setSaving(true);
    const { error } = await supabase
      .from("logos_generales")
      .update(editFormData)
      .eq("id", id);

    setSaving(false);
    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      setEditingId(null);
      fetchLogos();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este logo?")) return;
    const { error } = await supabase.from("logos_generales").delete().eq("id", id);
    if (error) alert("Error al eliminar: " + error.message);
    else fetchLogos();
  };

  return (
    <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <IconLink size={14} /> Logos Generales Disponibles
      </h4>

      <div className="space-y-3 mb-4">
        {loading ? (
          <div className="text-xs text-slate-400">Cargando logos...</div>
        ) : logos.length === 0 ? (
          <div className="text-xs text-slate-400 italic">
            No hay logos cargados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {logos.map((logo) => {
              const isEditing = editingId === logo.id;
              const imgSrc = getDirectDriveLink(isEditing ? editFormData.url : logo.url);

              return isEditing ? (
                <div key={logo.id} className="bg-indigo-50 p-3 rounded border border-indigo-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-center bg-white p-2 rounded border border-indigo-100 mb-1">
                      <img 
                        src={imgSrc} 
                        alt="Preview" 
                        className="h-10 object-contain" 
                        referrerPolicy="no-referrer"
                        onError={(e) => e.target.style.display='none'}
                      />
                  </div>
                  <input
                    type="text"
                    className="w-full text-xs p-2 border border-indigo-300 rounded bg-white outline-none"
                    value={editFormData.nombre}
                    onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                    placeholder="Nombre"
                  />
                  <input
                    type="text"
                    className="w-full text-xs p-2 border border-indigo-300 rounded bg-white outline-none"
                    value={editFormData.url}
                    onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                    placeholder="URL"
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button onClick={handleCancelEdit} disabled={saving} className="p-1.5 text-slate-400 hover:text-slate-600"><IconX size={16} /></button>
                    <button onClick={() => handleSaveEdit(logo.id)} disabled={saving} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"><IconCheck size={16} /></button>
                  </div>
                </div>
              ) : (
                <div key={logo.id} className="bg-white p-2 rounded border border-slate-200 shadow-sm flex items-center gap-3 group hover:border-indigo-300 transition-colors">
                  <div className="w-10 h-10 shrink-0 bg-slate-50 rounded flex items-center justify-center overflow-hidden border border-slate-100 p-1">
                    <img
                      src={imgSrc}
                      alt={logo.nombre}
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-700">
                      {logo.nombre}
                    </p>
                    <a href={logo.url} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline truncate block">
                      {logo.url}
                    </a>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditClick(logo)} className="text-slate-300 hover:text-indigo-600 p-1"><IconEdit size={14} /></button>
                    <button onClick={() => handleDelete(logo.id)} className="text-slate-300 hover:text-red-500 p-1"><IconTrash size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-end pt-3 border-t border-slate-200">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-bold text-slate-400">Nuevo Nombre</label>
          <input type="text" className="w-full text-xs p-2 border rounded bg-white outline-none" placeholder="Ej: Logo Gobierno" value={newLogo.nombre} onChange={(e) => setNewLogo({ ...newLogo, nombre: e.target.value })} />
        </div>
        <div className="flex-[2] w-full">
          <label className="text-[10px] font-bold text-slate-400">Nueva URL</label>
          <input type="text" className="w-full text-xs p-2 border rounded bg-white outline-none" placeholder="https://..." value={newLogo.url} onChange={(e) => setNewLogo({ ...newLogo, url: e.target.value })} />
        </div>
        <button onClick={handleAdd} disabled={adding || editingId !== null} className="bg-indigo-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 h-[34px]">
          {adding ? <IconLoader className="animate-spin" size={12} /> : <IconPlus size={14} />} Agregar
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE DE CAMPO EDITABLE ---
const EditableField = ({ label, value, timestamp, editorId, onSave, allIntegrantes, isLink = false, textArea = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const [loading, setLoading] = useState(false);

  const editorInfo = allIntegrantes.find((i) => i.id == editorId);
  const editorLabel = editorInfo ? `${editorInfo.nombre} ${editorInfo.apellido}` : "Desconocido";

  const handleSave = async () => {
    setLoading(true);
    await onSave(tempValue);
    setLoading(false);
    setIsEditing(false);
  };

  return (
    <div className="mb-2 group">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        {!isEditing && (
          <button onClick={() => { setTempValue(value || ""); setIsEditing(true); }} className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Editar">
            <IconEdit size={14} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="flex items-start gap-2 animate-in fade-in zoom-in-95">
          {textArea ? (
            <textarea className="w-full text-sm p-2 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white shadow-sm" rows={3} value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
          ) : (
            <input type="text" className="w-full text-sm p-2 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white shadow-sm" value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="Pegar enlace o texto..." />
          )}
          <button onClick={handleSave} disabled={loading} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
            {loading ? <IconLoader className="animate-spin" size={16} /> : <IconCheck size={16} />}
          </button>
          <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-slate-600"><IconX size={16} /></button>
        </div>
      ) : (
        <div className="relative">
          <div className="text-sm text-slate-800 break-words min-h-[20px]">
            {value ? (
              isLink ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                  <IconLink size={14} /> {value}
                </a>
              ) : ( <p className="whitespace-pre-wrap">{value}</p> )
            ) : ( <span className="text-slate-300 italic text-xs">Sin información cargada</span> )}
          </div>
          {(timestamp || editorId) && value && (
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Editado por <strong>{editorLabel}</strong> el {new Date(timestamp).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE DE PREVISUALIZACIÓN DE LOGO ESPECÍFICO ---
const SpecificLogoPreview = ({ url }) => {
  if (!url) return null;
  const directLink = getDirectDriveLink(url);
  
  return (
    <div className="mt-2 mb-4 p-2 bg-slate-50 border border-slate-200 rounded flex justify-center items-center h-16 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-slate-200 pointer-events-none">
            <IconPhoto size={24} />
        </div>
        <img 
            src={directLink} 
            alt="Logo Preview" 
            className="h-full object-contain relative z-10"
            referrerPolicy="no-referrer"
            onError={(e) => e.target.style.display = 'none'}
        />
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function GiraDifusion({ supabase, gira, onBack }) {
  const { user } = useAuth();
  const [difusionData, setDifusionData] = useState(null);
  const [allIntegrantes, setAllIntegrantes] = useState([]);
  const [localEvents, setLocalEvents] = useState([]);
  const [localRepertorio, setLocalRepertorio] = useState([]); 
  const [localidadesMap, setLocalidadesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [artistsDetails, setArtistsDetails] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: integrantes } = await supabase.from("integrantes").select("id, nombre, apellido, link_bio, link_foto_popup, mail, email_google");
        setAllIntegrantes(integrantes || []);

        const artistMap = {};
        integrantes?.forEach((i) => {
          artistMap[i.id] = { link_bio: i.link_bio, link_foto_popup: i.link_foto_popup };
        });
        setArtistsDetails(artistMap);

        const { data: localidadesData } = await supabase.from("localidades").select("id, localidad");
        const locMap = {};
        if (localidadesData) { localidadesData.forEach((l) => { locMap[l.id] = l.localidad; }); }
        setLocalidadesMap(locMap);

        const { data: eventosData } = await supabase.from("eventos").select("*, locaciones(id, nombre, id_localidad), tipos_evento(id, nombre)").eq("id_gira", gira.id).order("fecha", { ascending: true });
        setLocalEvents(eventosData || []);

        const { data: repData } = await supabase.from("programas_repertorios").select(`id, nombre, orden, repertorio_obras (id, orden, excluir, obras (id, titulo, obras_compositores (rol, compositores (nombre, apellido))))`).eq("id_programa", gira.id).order("orden");
        if (repData) {
            const sortedRep = repData.map(r => ({ ...r, repertorio_obras: (r.repertorio_obras || []).sort((a,b) => a.orden - b.orden) }));
            setLocalRepertorio(sortedRep);
        }

        const { data: existingData, error: fetchError } = await supabase.from("gira_difusion").select("*").eq("id_gira", gira.id).maybeSingle();
        if (fetchError) throw fetchError;

        if (existingData) { setDifusionData(existingData); } else {
          const { data: newData, error: insertError } = await supabase.from("gira_difusion").insert([{ id_gira: gira.id }]).select().maybeSingle();
          if (insertError) throw insertError;
          setDifusionData(newData);
        }
      } catch (error) {
        console.error("Error crítico cargando difusión:", error);
      } finally {
        setLoading(false);
      }
    };
    if (gira?.id) loadData();
  }, [gira?.id, supabase]);

  const handleUpdateDifusion = async (fieldBaseName, value) => {
    try {
      const currentEditor = allIntegrantes.find((i) => i.id == user.id || (user.email && (i.mail === user.email || i.email_google === user.email)));
      const editorIdToSave = currentEditor ? currentEditor.id : null;
      const updatePayload = {
        [fieldBaseName]: value,
        [`timestamp_${fieldBaseName}`]: new Date().toISOString(),
        [`editor_${fieldBaseName}`]: editorIdToSave,
      };
      
      const { data, error } = await supabase
        .from("gira_difusion")
        .update(updatePayload)
        .eq("id_gira", gira.id) 
        .select();

      if (error) throw error;
      if (data && data.length > 0) setDifusionData(data[0]);
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + (err.message || "Verifica permisos"));
    }
  };

  const handleUpdateIntegrante = async (integranteId, field, value) => {
    try {
      const { error } = await supabase.from("integrantes").update({ [field]: value }).eq("id", integranteId);
      if (error) throw error;
      setArtistsDetails((prev) => ({ ...prev, [integranteId]: { ...prev[integranteId], [field]: value } }));
    } catch (err) {
      alert("Error actualizando integrante: " + err.message);
    }
  };

  const filteredEvents = localEvents.filter((e) => e.id_tipo_evento === 1);
  const getCitiesList = () => {
    const cities = [...new Set(filteredEvents.map((e) => { const idLoc = e.locaciones?.id_localidad; return localidadesMap[idLoc] || null; }))].filter((c) => c);
    return cities.join(" / ");
  };
  const getGroupedEvents = () => {
    const groups = {};
    filteredEvents.forEach((ev) => {
      const key = ev.locaciones?.id || "unknown";
      const venueName = ev.locaciones?.nombre || "Locación a confirmar";
      const idLoc = ev.locaciones?.id_localidad;
      const cityName = localidadesMap[idLoc] || "";
      if (!groups[key]) groups[key] = { locacion: venueName, localidad: cityName, dates: [] };
      groups[key].dates.push({ fecha: ev.fecha, hora: ev.hora_inicio });
    });
    return Object.values(groups);
  };
  const staff = gira.giras_integrantes?.filter((gi) => ["director", "solista"].includes(gi.rol) && gi.estado === "confirmado") || [];
  
  const getComposerName = (obra) => {
    if (obra.obras_compositores && obra.obras_compositores.length > 0) {
      const compositores = obra.obras_compositores.filter((oc) => oc.rol === "compositor" && oc.compositores).map((oc) => oc.compositores);
      if (compositores.length > 0) return compositores.map((c) => `${c.nombre} ${c.apellido}`).join("\n");
    }
    if (obra.compositores) {
        const c = Array.isArray(obra.compositores) ? obra.compositores[0] : obra.compositores;
        if(c && c.nombre && c.apellido) return `${c.nombre} ${c.apellido}`;
    }
    return "Autor Desconocido";
  };

  if (loading) return ( <div className="p-10 flex justify-center"><IconLoader className="animate-spin text-indigo-600" size={32} /></div> );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><IconArrowLeft size={20} /></button>
        <div><h2 className="text-lg font-bold text-slate-800">Material de Prensa</h2><p className="text-xs text-slate-500">Gestión de contenidos para difusión</p></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-8 pb-20">
        
        {/* --- SECCIÓN HOME --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">Sección Home</h3>
          
          {/* FOTO HOME + PREVIEW */}
          <div>
            <EditableField
                label="Link Foto Home"
                value={difusionData?.link_foto_home}
                timestamp={difusionData?.timestamp_link_foto_home}
                editorId={difusionData?.editor_link_foto_home}
                allIntegrantes={allIntegrantes}
                onSave={(val) => handleUpdateDifusion("link_foto_home", val)}
                isLink
            />
            {difusionData?.link_foto_home && <SpecificLogoPreview url={difusionData.link_foto_home} />}
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3 mt-4">
            <div className="text-xs text-slate-400 font-bold uppercase mb-2">Vista Previa Datos Fijos</div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">{gira.nombre_gira}</h4>
              <p className="text-slate-600 font-medium">{gira.subtitulo}</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-indigo-600 font-bold text-lg">{formatHeaderDates(filteredEvents)}</p>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wide mt-1">{getCitiesList()}</p>
            </div>
          </div>
        </section>

        {/* --- SECCIÓN DETALLE --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">Sección Detalle</h3>

          {/* BANNER + PREVIEW */}
          <div>
            <EditableField
                label="Link Foto Banner"
                value={difusionData?.link_foto_banner}
                timestamp={difusionData?.timestamp_link_foto_banner}
                editorId={difusionData?.editor_link_foto_banner}
                allIntegrantes={allIntegrantes}
                onSave={(val) => handleUpdateDifusion("link_foto_banner", val)}
                isLink
            />
            {difusionData?.link_foto_banner && <SpecificLogoPreview url={difusionData.link_foto_banner} />}
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-4 mb-6">
            <div className="text-xs text-slate-400 font-bold uppercase mb-2">Vista Previa Agenda Detallada</div>
            <h4 className="text-lg font-bold text-slate-800 mb-3">{gira.nombre_gira}</h4>
            <div className="space-y-4">
              {getGroupedEvents().length > 0 ? (
                getGroupedEvents().map((group, idx) => (
                  <div key={idx} className="border-l-2 border-indigo-400 pl-3">
                    {group.dates.map((d, i) => ( <p key={i} className="text-slate-700 font-medium text-sm">{formatDateExtended(d.fecha, d.hora)}</p> ))}
                    <div className="mt-1">
                      <p className="text-sm font-bold text-slate-800">{group.locacion}</p>
                      {group.localidad && <p className="text-xs text-slate-500 uppercase">{group.localidad}</p>}
                    </div>
                  </div>
                ))
              ) : ( <div className="text-slate-400 italic text-sm p-2 border border-dashed border-slate-300 rounded">No se encontraron conciertos (ID Tipo Evento = 1).</div> )}
            </div>
          </div>

          <GeneralLogosManager supabase={supabase} />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <EditableField
                    label="Link Logo 1 (Específico Gira)"
                    value={difusionData?.link_logo_1}
                    timestamp={difusionData?.timestamp_link_logo_1}
                    editorId={difusionData?.editor_link_logo_1}
                    allIntegrantes={allIntegrantes}
                    onSave={(val) => handleUpdateDifusion("link_logo_1", val)}
                    isLink
                />
                {difusionData?.link_logo_1 && <SpecificLogoPreview url={difusionData.link_logo_1} />}
            </div>
            <div>
                <EditableField
                    label="Link Logo 2 (Específico Gira)"
                    value={difusionData?.link_logo_2}
                    timestamp={difusionData?.timestamp_link_logo_2}
                    editorId={difusionData?.editor_link_logo_2}
                    allIntegrantes={allIntegrantes}
                    onSave={(val) => handleUpdateDifusion("link_logo_2", val)}
                    isLink
                />
                {difusionData?.link_logo_2 && <SpecificLogoPreview url={difusionData.link_logo_2} />}
            </div>
          </div>
        </section>

        {/* --- SECCIÓN PROGRAMA --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">Sección Programa</h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <ul className="space-y-2">
              {localRepertorio.map((rep) => (
                <React.Fragment key={rep.id}>
                  {rep.repertorio_obras?.filter((o) => !o.excluir).map((obraItem) => {
                      return (
                        <li key={obraItem.id} className="text-sm border-b border-slate-200 last:border-0 pb-1 flex flex-wrap gap-x-2">
                          <span className="font-bold text-slate-700">{getComposerName(obraItem.obras)}</span>
                          <span className="text-slate-300 hidden sm:inline">|</span>
                          {/* CAMBIO: Usamos RichTextPreview para que se vea el formato */}
                          <div className="text-slate-600 italic inline-block flex-1 min-w-[200px]">
                              <RichTextPreview content={obraItem.obras.titulo} />
                          </div>
                        </li>
                      );
                    })}
                </React.Fragment>
              ))}
              {localRepertorio.length === 0 && <p className="text-slate-400 italic text-sm">No hay repertorio cargado.</p>}
            </ul>
          </div>
        </section>

        {/* --- SECCIÓN ARTISTAS (Con preview de fotos) --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 border-b border-indigo-100 pb-2">Sección Artistas</h3>
          <div className="space-y-6">
            {staff.map((person) => {
              const fullName = `${person.integrantes?.nombre} ${person.integrantes?.apellido}`;
              const details = artistsDetails[person.id_integrante] || {};
              return (
                <div key={person.id_integrante} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-slate-800">{fullName}</h4>
                    <div className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase">{person.rol}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Link Bio</label>
                      <div className="flex gap-2">
                        <input type="text" className="w-full text-xs p-2 border rounded bg-white shadow-sm" placeholder="Enlace..." defaultValue={details.link_bio || ""} onBlur={(e) => { if (e.target.value !== details.link_bio) { handleUpdateIntegrante(person.id_integrante, "link_bio", e.target.value); } }} />
                        {details.link_bio && <a href={details.link_bio} target="_blank" rel="noreferrer" className="p-2 bg-indigo-50 rounded hover:bg-indigo-100 text-indigo-600"><IconLink size={14} /></a>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Link Foto Pop-up</label>
                      <div className="flex gap-2">
                        <input type="text" className="w-full text-xs p-2 border rounded bg-white shadow-sm" placeholder="Enlace..." defaultValue={details.link_foto_popup || ""} onBlur={(e) => { if (e.target.value !== details.link_foto_popup) { handleUpdateIntegrante(person.id_integrante, "link_foto_popup", e.target.value); } }} />
                        {details.link_foto_popup && <a href={details.link_foto_popup} target="_blank" rel="noreferrer" className="p-2 bg-indigo-50 rounded hover:bg-indigo-100 text-indigo-600"><IconLink size={14} /></a>}
                      </div>
                      {details.link_foto_popup && <SpecificLogoPreview url={details.link_foto_popup} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="p-4 bg-slate-100 rounded border border-slate-200 text-center">
              <span className="font-serif font-bold text-slate-700 text-lg">Orquesta Filarmónica de Río Negro</span>
            </div>
          </div>
        </section>

        {/* --- COMENTARIOS --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <EditableField label="Otros Comentarios" value={difusionData?.otros_comentarios} timestamp={difusionData?.timestamp_otros_comentarios} editorId={difusionData?.editor_otros_comentarios} allIntegrantes={allIntegrantes} onSave={(val) => handleUpdateDifusion("otros_comentarios", val)} textArea />
        </section>
      </div>
    </div>
  );
}