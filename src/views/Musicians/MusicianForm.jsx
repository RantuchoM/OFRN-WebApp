import React, { useState, useEffect } from "react";
import {
  IconSave,
  IconX,
  IconLoader,
  IconLink,
  IconUser,
  IconId,
  IconFileText,
  IconMapPin,
  IconPlus
} from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";
import DateInput from "../../components/ui/DateInput";

export default function MusicianForm({ supabase, musician, onSave, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [showPassword, setShowPassword] = useState(false);

  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const [locationsOptions, setLocationsOptions] = useState([]);

  // Inicialización del Formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    id_instr: "", // Se gestiona como string en el form, se convierte a int/null al enviar
    dni: "",
    cuil: "",
    mail: "",
    telefono: "",
    condicion: "Estable",
    genero: "M", 
    alimentacion: "",
    nacionalidad: "Argentina",
    fecha_nac: "",
    fecha_alta: "",
    fecha_baja: "",
    email_google: "",
    id_localidad: null,
    id_loc_viaticos: null,
    link_bio: "",
    link_foto_popup: "",
    documentacion: "",
    docred: "",
    firma: "",
    email_acceso: "",
    rol_sistema: "user",
    clave_acceso: "",
    es_simulacion: false,
    ...musician 
  });

  // Carga de Catálogos
  useEffect(() => {
    const fetchCatalogs = async () => {
      // 1. Instrumentos
      const { data: instrData } = await supabase
        .from("instrumentos")
        .select("id, instrumento")
        .order("instrumento");
      if (instrData) setCatalogoInstrumentos(instrData);

      // 2. Localidades
      const { data: locData } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");

      if (locData) {
        setLocationsOptions(
          locData.map((l) => ({ id: l.id, label: l.localidad, value: l.id }))
        );
      }
    };
    fetchCatalogs();
  }, [supabase]);

  // Cargar datos del músico al editar
  useEffect(() => {
    if (musician) {
      setFormData((prev) => ({
         ...prev, 
         ...musician,
         id_localidad: musician.id_localidad || null,
         id_loc_viaticos: musician.id_loc_viaticos || null,
         // El select HTML espera string para el value controlado
         id_instr: musician.id_instr ? String(musician.id_instr) : "" 
      }));
    }
  }, [musician]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. LIMPIEZA Y NORMALIZACIÓN DEL PAYLOAD
      const sanitizeId = (val) => {
          if (!val) return null;
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? null : parsed;
      };

      const payload = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni: formData.dni,
        cuil: formData.cuil || null,
        mail: formData.mail,
        telefono: formData.telefono,
        condicion: formData.condicion,
        genero: formData.genero,
        nacionalidad: formData.nacionalidad,
        alimentacion: formData.alimentacion,
        fecha_nac: formData.fecha_nac || null,
        fecha_alta: formData.fecha_alta || null,
        fecha_baja: formData.fecha_baja || null,
        email_google: formData.email_google,
        link_bio: formData.link_bio,
        link_foto_popup: formData.link_foto_popup,
        documentacion: formData.documentacion,
        docred: formData.docred,
        firma: formData.firma,
        email_acceso: formData.email_acceso,
        rol_sistema: formData.rol_sistema,
        clave_acceso: formData.clave_acceso,
        es_simulacion: formData.es_simulacion,
        
        // Claves Foráneas Sanitizadas
        id_instr: (formData.id_instr && formData.id_instr !== "") ? String(formData.id_instr) : null, // id_instr es TEXT en tu DB según esquema
        id_localidad: sanitizeId(formData.id_localidad),
        id_loc_viaticos: sanitizeId(formData.id_loc_viaticos)
      };

      // Nota Importante sobre id_instr: En el esquema que pasaste dice:
      // "column_name": "id_instr", "data_type": "text"
      // Si es TEXT, no usamos parseInt. Si es INT8, sí. 
      // He asumido TEXT según tu JSON ("udt_name": "text"). Si falla, cambia a parseInt.

      // --- GESTIÓN DE ID ---
      if (musician?.id) {
         payload.id = musician.id;
      } else {
         // Insert nuevo
         if (!payload.fecha_alta) payload.fecha_alta = new Date().toISOString().split('T')[0];
         // No enviamos ID en insert si es serial/bigint autoincrement, 
         // pero tu esquema dice bigint. Si no es autoincrement, hay que generarlo.
         // Asumimos autoincrement por defecto en Supabase. Si falla, descomentar:
         // payload.id = Date.now(); 
      }

      const { data, error } = await supabase
        .from("integrantes")
        .upsert([payload]) // Upsert maneja insert/update basado en ID
        .select()
        .single();

      if (error) throw error;
      onSave(data);
      //onClose(); // Cerrar modal al guardar
      
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-slate-300 p-2 rounded text-sm focus:ring-2 focus:ring-indigo-200 outline-none transition-all";
  const labelClass = "text-[10px] font-bold uppercase text-slate-400 mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        {/* Header Fijo */}
        <div className="bg-slate-50 p-4 border-b flex justify-between items-center shrink-0 rounded-t-xl">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {musician ? <IconUser className="text-indigo-500" /> : <IconPlus className="text-indigo-600" />}
            {musician ? `Editando: ${musician.apellido}` : "Nuevo Integrante"}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-red-500 transition-colors">
            <IconX size={20} />
          </button>
        </div>

        {/* Tabs Selector Fijo */}
        <div className="flex border-b text-xs font-bold uppercase tracking-wider shrink-0 bg-white">
          {[
            { id: "personal", label: "Personal", icon: <IconId size={14} /> },
            { id: "docs", label: "Documentos/Links", icon: <IconLink size={14} /> },
            { id: "acceso", label: "Sistema", icon: <IconFileText size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                  : "border-transparent text-slate-400 hover:bg-slate-50"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Cuerpo Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* TAB PERSONAL */}
            {activeTab === "personal" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Apellido</label>
                    <input type="text" required className={inputClass} value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Nombre</label>
                    <input type="text" required className={inputClass} value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className={labelClass}>DNI</label><input type="text" className={inputClass} value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} /></div>
                  <div><label className={labelClass}>CUIL</label><input type="text" className={inputClass} value={formData.cuil} onChange={(e) => setFormData({ ...formData, cuil: e.target.value })} /></div>
                  <div><DateInput label="Fecha Nacimiento" value={formData.fecha_nac} onChange={(val) => setFormData({ ...formData, fecha_nac: val })} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Mail Personal</label><input type="email" className={inputClass} value={formData.mail} onChange={(e) => setFormData({ ...formData, mail: e.target.value })} /></div>
                  <div>
                    <label className={labelClass}>Instrumento</label>
                    <select className={inputClass} value={formData.id_instr} onChange={(e) => setFormData({ ...formData, id_instr: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {catalogoInstrumentos?.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.instrumento}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className={labelClass}>Teléfono</label><input type="text" className={inputClass} value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Condición</label>
                    <select className={inputClass} value={formData.condicion} onChange={(e) => setFormData({ ...formData, condicion: e.target.value })}>
                      <option value="Estable">Estable</option>
                      <option value="Contratado">Contratado</option>
                      <option value="Invitado">Invitado</option>
                      <option value="Refuerzo">Refuerzo</option>
                      <option value="Pasante">Pasante</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Género</label>
                    <select className={inputClass} value={formData.genero} onChange={(e) => setFormData({ ...formData, genero: e.target.value })}>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="No Binario">No Binario</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Nacionalidad</label><input type="text" className={inputClass} value={formData.nacionalidad} onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })} /></div>
                </div>
                
                {/* Fechas Admin */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                    <div><DateInput label="Fecha Alta" value={formData.fecha_alta} onChange={val => setFormData({...formData, fecha_alta: val})} /></div>
                    <div><DateInput label="Fecha Baja" value={formData.fecha_baja} onChange={val => setFormData({...formData, fecha_baja: val})} /></div>
                </div>

                {/* Localidades */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="relative z-50">
                      <label className={labelClass}><IconMapPin size={10} /> Localidad Residencia</label>
                      <SearchableSelect 
                          options={locationsOptions} 
                          value={formData.id_localidad} 
                          onChange={(val) => setFormData(prev => ({...prev, id_localidad: val}))}
                          placeholder="Buscar localidad..."
                      />
                    </div>
                    <div className="relative z-40">
                      <label className={`${labelClass} text-indigo-500`}><IconMapPin size={10} /> Base Viáticos</label>
                      <SearchableSelect 
                          options={locationsOptions}
                          value={formData.id_loc_viaticos} 
                          onChange={(val) => setFormData(prev => ({...prev, id_loc_viaticos: val}))}
                          placeholder="Igual a residencia..."
                      />
                    </div>
                </div>
                <div className="h-32"></div> 
              </div>
            )}

            {/* TAB DOCUMENTOS */}
            {activeTab === "docs" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div><label className={labelClass}>Link Documentación (Full)</label><input type="text" className={inputClass} value={formData.documentacion} onChange={(e) => setFormData({ ...formData, documentacion: e.target.value })} /></div>
                 <div><label className={labelClass}>Link Doc. Reducida</label><input type="text" className={inputClass} value={formData.docred} onChange={(e) => setFormData({ ...formData, docred: e.target.value })} /></div>
                 <div><label className={labelClass}>Link Firma Digital</label><input type="text" className={inputClass} value={formData.firma} onChange={(e) => setFormData({ ...formData, firma: e.target.value })} /></div>
                 <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelClass}>Link Bio</label><input type="text" className={inputClass} value={formData.link_bio} onChange={(e) => setFormData({ ...formData, link_bio: e.target.value })} /></div>
                   <div><label className={labelClass}>Link Foto</label><input type="text" className={inputClass} value={formData.link_foto_popup} onChange={(e) => setFormData({ ...formData, link_foto_popup: e.target.value })} /></div>
                 </div>
              </div>
            )}

            {/* TAB SISTEMA */}
            {activeTab === "acceso" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelClass}>Email Acceso</label><input type="email" className={inputClass} value={formData.email_acceso} onChange={(e) => setFormData({ ...formData, email_acceso: e.target.value })} /></div>
                   <div>
                       <label className={labelClass}>Clave</label>
                       <div className="relative">
                           <input type={showPassword ? "text" : "password"} className={inputClass} value={formData.clave_acceso} onChange={(e) => setFormData({ ...formData, clave_acceso: e.target.value })} />
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                               {showPassword ? "🙈" : "👁️"}
                           </button>
                       </div>
                   </div>
                   <div>
                      <label className={labelClass}>Rol</label>
                      <select className={inputClass} value={formData.rol_sistema} onChange={(e) => setFormData({ ...formData, rol_sistema: e.target.value })}>
                          <option value="user">Usuario</option>
                          <option value="admin">Administrador</option>
                          <option value="editor">Editor</option>
                      </select>
                   </div>
                   <div className="flex items-center gap-2 mt-6">
                        <input type="checkbox" checked={formData.es_simulacion} onChange={e => setFormData({...formData, es_simulacion: e.target.checked})} className="rounded text-indigo-600"/>
                        <label className="text-sm text-slate-600">Usuario de Simulación</label>
                   </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
              <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50">
                {loading ? <IconLoader className="animate-spin" /> : <IconSave />} {formData.id ? "Cerrar" : "Crear Integrante"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}