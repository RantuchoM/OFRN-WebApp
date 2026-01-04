import React, { useState, useEffect, useRef } from "react";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconLoader,
  IconYoutube,
  IconPhoto,
  IconLink,
  IconList,
  IconInfo,
  IconAlertTriangle,
} from "../ui/Icons";
import { useAuth } from "../../context/AuthContext";

// --- UTILIDADES ---
const processDriveLink = (url) => {
  if (!url) return null;
  const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|drive\.google\.com\/file\/u\/[0-9]\/d\/)([-a-zA-Z0-9]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`; // URL CDN más compatible
  }
  return url;
};

const getYoutubeEmbed = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// --- RENDERER DE CONTENIDO ---
const NewsContentRenderer = ({ content }) => {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={idx} />;

        const ytId = getYoutubeEmbed(trimmed);
        if (ytId && trimmed.startsWith("http")) {
          return (
            <div key={idx} className="aspect-video w-full max-w-lg mx-auto rounded-lg overflow-hidden shadow-sm my-4">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${ytId}`}
                title="YouTube video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        }

        if ((trimmed.startsWith("http") && trimmed.includes("drive.google.com")) || trimmed.match(/\.(jpeg|jpg|gif|png)$/i)) {
           const imgSrc = processDriveLink(trimmed);
           return (
             <div key={idx} className="flex justify-center my-4">
               <img 
                 src={imgSrc} 
                 alt="Adjunto" 
                 referrerPolicy="no-referrer"
                 className="max-h-80 rounded-lg shadow-sm border border-slate-100 object-contain" 
                 onError={(e) => e.target.style.display = 'none'}
               />
             </div>
           );
        }

        return <div key={idx} dangerouslySetInnerHTML={{ __html: line }} />;
      })}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function NewsManager({ supabase }) {
  const { user } = useAuth(); // user viene directo de la tabla 'integrantes'
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState("list"); 
  const [formData, setFormData] = useState({
    id: null,
    titulo: "",
    contenido: "",
    modulo: "General",
    importancia: "normal",
    visibilidad: "todos",
  });
  const [saving, setSaving] = useState(false);
  const textAreaRef = useRef(null);

  // El ID ya debería estar en el objeto user si el login fue exitoso con select("*")
  const currentUserId = user?.id; 

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sistema_novedades")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) console.error("Error fetching news:", error);
    else setNews(data || []);
    setLoading(false);
  };

  const handleCreate = () => {
    setFormData({ id: null, titulo: "", contenido: "", modulo: "General", importancia: "normal", visibilidad: "todos" });
    setViewMode("create");
  };

  const handleEdit = (item) => {
    setFormData(item);
    setViewMode("edit");
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta novedad? Se borrará para todos.")) return;
    const { error } = await supabase.from("sistema_novedades").delete().eq("id", id);
    if (error) alert("Error al eliminar: " + error.message);
    else fetchNews();
  };

  const handleSave = async () => {
    if (!formData.titulo || !formData.contenido) return alert("Título y contenido son obligatorios");
    
    // Validación crítica del ID
    if (!currentUserId) {
        console.error("User object in context:", user);
        return alert("Error crítico: No se detecta tu ID de usuario (int8). Intenta cerrar sesión y volver a entrar.");
    }

    setSaving(true);
    try {
      const payload = {
        titulo: formData.titulo,
        contenido: formData.contenido,
        modulo: formData.modulo,
        importancia: formData.importancia,
        visibilidad: formData.visibilidad,
        creado_por: currentUserId, // ID directo del contexto (int8)
      };

      console.log("Guardando Novedad:", payload); // Debug para verificar qué se envía

      let error;
      if (viewMode === "edit" && formData.id) {
        const res = await supabase.from("sistema_novedades").update(payload).eq("id", formData.id);
        error = res.error;
      } else {
        const res = await supabase.from("sistema_novedades").insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      
      setViewMode("list");
      fetchNews();
    } catch (err) {
      console.error("Error guardando:", err);
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- EDITOR HELPERS ---
  const insertTag = (startTag, endTag = "") => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.contenido;
    
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}${startTag}${selection}${endTag}${after}`;
    setFormData({ ...formData, contenido: newText });
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + startTag.length, end + startTag.length);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IconInfo className="text-indigo-600" /> Centro de Novedades
          </h2>
          <p className="text-sm text-slate-500">
             Gestor de Comunicación {currentUserId ? `(ID: ${currentUserId})` : "(Sin ID detectado)"}
          </p>
        </div>
        {viewMode === "list" && (
          <button 
            onClick={handleCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <IconPlus size={18} /> Nueva Noticia
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* LISTADO LATERAL */}
        {(viewMode === "list" || window.innerWidth > 1024) && (
          <div className={`w-full lg:w-1/3 border-r border-slate-200 bg-white overflow-y-auto ${viewMode !== "list" ? "hidden lg:block" : ""}`}>
            {loading ? (
              <div className="p-10 text-center"><IconLoader className="animate-spin inline text-indigo-500" /></div>
            ) : news.length === 0 ? (
              <div className="p-10 text-center text-slate-400 italic">No hay noticias publicadas.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {news.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group ${formData.id === item.id && viewMode !== 'list' ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                    onClick={() => handleEdit(item)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex gap-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            item.importancia === 'alta' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.modulo}
                          </span>
                          {item.visibilidad === 'admins' && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                                  Solo Admins
                              </span>
                          )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1">{item.titulo}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.contenido.replace(/<[^>]*>?/gm, '')}</p>
                    
                    <div className="mt-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
                            title="Eliminar"
                        >
                            <IconTrash size={14} />
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ÁREA DE EDICIÓN */}
        {viewMode !== "list" && (
          <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden animate-in slide-in-from-right-4 duration-300">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-700">
                {viewMode === "create" ? "Redactar Nueva Noticia" : "Editar Noticia"}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setViewMode("list")} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded text-xs font-bold">Cancelar</button>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                    {saving ? <IconLoader className="animate-spin" size={14}/> : <IconCheck size={14}/>}
                    {viewMode === "create" ? "Publicar" : "Guardar Cambios"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    
                    {/* Campos */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Título</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                                placeholder="Ej: Nueva función disponible"
                                value={formData.titulo}
                                onChange={e => setFormData({...formData, titulo: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Módulo</label>
                            <select 
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
                                value={formData.modulo}
                                onChange={e => setFormData({...formData, modulo: e.target.value})}
                            >
                                <option value="General">General</option>
                                <option value="Giras">Giras</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Usuarios">Usuarios</option>
                                <option value="Repertorio">Repertorio</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Visibilidad</label>
                            <select 
                                className={`w-full p-2 border border-slate-300 rounded text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200 ${formData.visibilidad === 'admins' ? 'text-amber-600 bg-amber-50' : 'text-slate-700'}`}
                                value={formData.visibilidad}
                                onChange={e => setFormData({...formData, visibilidad: e.target.value})}
                            >
                                <option value="todos">Todos</option>
                                <option value="admins">Solo Admins</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.importancia === 'alta'}
                                onChange={e => setFormData({...formData, importancia: e.target.checked ? 'alta' : 'normal'})}
                                className="rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span className={`text-xs font-bold uppercase ${formData.importancia === 'alta' ? 'text-rose-600' : 'text-slate-500'}`}>
                                Marcar como Importante <IconAlertTriangle size={12} className="inline mb-0.5"/>
                            </span>
                        </label>
                    </div>

                    {/* EDITOR VISUAL */}
                    <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 flex-wrap items-center">
                            <button onClick={() => insertTag("<b>", "</b>")} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 font-bold text-xs" title="Negrita">B</button>
                            <button onClick={() => insertTag("<i>", "</i>")} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 italic text-xs" title="Cursiva">I</button>
                            <div className="w-px h-4 bg-slate-300 mx-1"></div>
                            <button onClick={() => insertTag("<ul>\n<li>", "</li>\n</ul>")} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Lista"><IconList size={14}/></button>
                            <button onClick={() => insertTag('<a href="" target="_blank" class="text-indigo-600 underline">', '</a>')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Enlace"><IconLink size={14}/></button>
                            <div className="w-px h-4 bg-slate-300 mx-1"></div>
                            <button onClick={() => insertTag("\nhttps://drive.google.com/...", "\n")} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 flex items-center gap-1 text-xs" title="Pegar Link Drive"><IconPhoto size={14}/> Foto</button>
                            <button onClick={() => insertTag("\nhttps://youtu.be/...", "\n")} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 flex items-center gap-1 text-xs" title="Pegar Link YouTube"><IconYoutube size={14}/> Video</button>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row min-h-0">
                            {/* Input */}
                            <textarea
                                ref={textAreaRef}
                                className="flex-1 p-4 resize-none outline-none text-sm font-mono text-slate-700 bg-slate-50/30 leading-relaxed border-r border-slate-100"
                                placeholder="Escribe aquí... Usa los botones para insertar multimedia."
                                value={formData.contenido}
                                onChange={e => setFormData({...formData, contenido: e.target.value})}
                            />
                            
                            {/* Preview */}
                            <div className="flex-1 p-4 bg-white overflow-y-auto">
                                <div className="text-[10px] font-bold text-slate-300 uppercase mb-4 tracking-widest text-center border-b border-slate-100 pb-2">Vista Previa</div>
                                <NewsContentRenderer content={formData.contenido} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100 flex gap-2">
                        <IconInfo size={16} className="shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-bold">Tips de Formato:</p>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                <li>Para <strong>imágenes</strong>: Pega el enlace de Google Drive en una línea nueva.</li>
                                <li>Para <strong>videos</strong>: Pega el enlace de YouTube en una línea nueva.</li>
                                <li>Para saltos de línea simples, usa "Enter".</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}