import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import imageCompression from "browser-image-compression";
import { 
  IconX, IconUser, IconMail, IconPhone, IconMapPin, 
  IconCamera, IconLoader, IconCheck, IconCalendar, IconTrash 
} from "../ui/Icons"; 
import SearchableSelect from "../ui/SearchableSelect";

const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );
};

// Paleta de colores predefinida (Tailwind shades 500/400)
const AVATAR_COLORS = [
  "#64748b", // Slate (Default)
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ec4899"  // Pink
];

export default function ProfileEditModal({ isOpen, onClose, user, supabase, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const [locationsOptions, setLocationsOptions] = useState([]);
  
  const [formData, setFormData] = useState({
    mail: "", 
    telefono: "",
    domicilio: "",
    id_localidad: null,
    avatar_url: "",
    avatar_color: "#64748b", // Color por defecto
    last_modified_at: null
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  // Cargar datos
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchInitialData();
    }
  }, [isOpen, user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Localidades
      const { data: locData } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      
      if (locData) {
        setLocationsOptions(
          locData.map((l) => ({ id: l.id, label: l.localidad, value: l.id }))
        );
      }

      // 2. Datos Usuario
      const { data: userData, error } = await supabase
        .from("integrantes")
        .select("mail, telefono, domicilio, id_localidad, avatar_url, avatar_color, last_modified_at")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (userData) {
        setFormData({
          mail: userData.mail || "",
          telefono: userData.telefono || "",
          domicilio: userData.domicilio || "",
          id_localidad: userData.id_localidad || null,
          avatar_url: userData.avatar_url || "",
          avatar_color: userData.avatar_color || "#64748b",
          last_modified_at: userData.last_modified_at
        });
        setPreviewUrl(userData.avatar_url);
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSaving(true);

    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 500, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);

      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') 
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error) {
      console.error("Error subiendo avatar:", error);
      alert("Error al subir la imagen.");
      setPreviewUrl(formData.avatar_url); 
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = () => {
    if(!confirm("¿Quitar foto de perfil?")) return;
    setFormData(prev => ({ ...prev, avatar_url: null }));
    setPreviewUrl(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = {
        mail: formData.mail,
        telefono: formData.telefono,
        domicilio: formData.domicilio,
        id_localidad: formData.id_localidad,
        avatar_url: formData.avatar_url,
        avatar_color: formData.avatar_color,
        last_modified_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("integrantes")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      if (onUpdate) onUpdate(); 
      onClose();
    } catch (error) {
      console.error("Error actualizando:", error);
      alert("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[90vh]">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 text-lg">Mi Perfil</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="py-10 flex justify-center text-indigo-600">
              <IconLoader className="animate-spin" size={32} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* --- ZONA AVATAR --- */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  {/* Círculo del Avatar */}
                  <div 
                    className="w-28 h-28 rounded-full shadow-md overflow-hidden flex items-center justify-center border-4 border-white ring-1 ring-slate-100 transition-colors duration-300"
                    style={{ backgroundColor: previewUrl ? 'white' : formData.avatar_color }}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <IconUser size={48} className="text-white/90" />
                    )}
                  </div>

                  {/* Botón Cámara (Subir) */}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110 z-10 border-2 border-white"
                    title="Subir foto"
                  >
                    <IconCamera size={16} />
                  </button>

                  {/* Botón Eliminar (Solo si hay foto) */}
                  {previewUrl && (
                    <button 
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-transform hover:scale-110 z-10 border-2 border-white"
                      title="Eliminar foto"
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                </div>

                {/* Selector de Color (Solo si NO hay foto) */}
                {!previewUrl && (
                  <div className="flex gap-2 p-1.5 bg-slate-50 rounded-full border border-slate-100">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({...formData, avatar_color: color})}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${formData.avatar_color === color ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                        title="Elegir color"
                      />
                    ))}
                  </div>
                )}

                <div className="text-center">
                    <h2 className="font-bold text-slate-800 text-lg">{user.nombre} {user.apellido}</h2>
                    <p className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1 uppercase font-bold">
                        {user.rol_sistema?.replace('_', ' ')}
                    </p>
                </div>
              </div>

              {/* --- CAMPOS --- */}
              <div className="space-y-4">
                
                {/* Mail */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <IconMail size={14}/> Email / Usuario
                  </label>
                  <input 
                    type="email" 
                    value={formData.mail}
                    onChange={(e) => setFormData({...formData, mail: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder="nombre@ejemplo.com"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <IconPhone size={14}/> Teléfono
                  </label>
                  <input 
                    type="tel" 
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    placeholder="+54 9 ..."
                  />
                </div>

                {/* Ubicación */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">
                    <IconMapPin size={14}/> Ubicación
                  </label>
                  <div className="space-y-2">
                    <div className="relative z-50"> 
                       <SearchableSelect 
                          options={locationsOptions}
                          value={formData.id_localidad}
                          onChange={(val) => setFormData(prev => ({...prev, id_localidad: val}))}
                          placeholder="Buscar Ciudad / Localidad..."
                          className="w-full"
                       />
                    </div>
                    <input 
                      type="text" 
                      value={formData.domicilio}
                      onChange={(e) => setFormData({...formData, domicilio: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      placeholder="Calle, Altura, Piso, Depto..."
                    />
                  </div>
                </div>
              </div>

              {/* Info Footer */}
              {formData.last_modified_at && (
                <div className="pt-4 border-t border-slate-50 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                    <IconCalendar size={12} />
                    <span>Actualizado: {new Date(formData.last_modified_at).toLocaleDateString()} {new Date(formData.last_modified_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              )}

              {/* Actions */}
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {saving ? <IconLoader className="animate-spin" /> : <IconCheck />}
                Guardar Cambios
              </button>

            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}