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
    id_instr: "", // Se gestiona validación en submit
    dni: "",
    cuil: "",
    mail: "",
    telefono: "",
    condicion: "Planta",
    genero: "M", // Valor por defecto seguro para Enums (M/F)
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
  });

  // Carga de Catálogos (Instrumentos y Localidades)
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
          locData.map((l) => ({ id: l.id, label: l.localidad }))
        );
      }
    };
    fetchCatalogs();
  }, [supabase]);

  // Cargar datos del músico al editar
  useEffect(() => {
    if (musician) {
      setFormData((prev) => ({ ...prev, ...musician }));
    }
  }, [musician]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData };

      // --- LIMPIEZA DE DATOS (Vacíos -> Null) ---
      
      // 1. Fechas
      if (!payload.fecha_nac) payload.fecha_nac = null;
      if (!payload.fecha_alta) payload.fecha_alta = null;
      if (!payload.fecha_baja) payload.fecha_baja = null;

      // 2. Claves Foráneas (Integers)
      if (!payload.id_instr) payload.id_instr = null;
      if (!payload.id_localidad) payload.id_localidad = null;
      if (!payload.id_loc_viaticos) payload.id_loc_viaticos = null;

      // 3. Campos Texto Opcionales
      if (!payload.cuil) payload.cuil = null;

      // --- LIMPIEZA DE CAMPOS RELACIONALES (Solo lectura) ---
      delete payload.instrumento;
      delete payload.instrumentos;
      delete payload.ensamble;
      delete payload.integrantes_ensambles;
      delete payload.localidades;
      delete payload.residencia;
      delete payload.viaticos;
      delete payload.nombre_completo;
      delete payload.rol_gira;
      delete payload.estado_gira;
      delete payload.es_adicional;
      delete payload.id_gira;
      delete payload.token_publico;
      delete payload.is_local; 

      // --- GESTIÓN DE ID ---
      // Si NO hay ID (es creación), generamos uno numérico usando timestamp
      // para satisfacer la restricción NOT NULL de int8.
      if (!payload.id) {
          payload.id = Date.now(); 
      }

      // Guardado
      const { data, error } = await supabase
        .from("integrantes")
        .upsert([payload])
        .select()
        .single();

      if (error) throw error;
      onSave(data);
    } catch (error) {
      console.error(error);
      alert("Error al guardar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-slate-300 p-2 rounded text-sm focus:ring-2 focus:ring-indigo-200 outline-none transition-all";
  const labelClass =
    "text-[10px] font-bold uppercase text-slate-400 mb-1 block";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full mx-auto flex flex-col max-h-[90vh]">
      
      {/* Header Fijo */}
      <div className="bg-slate-50 p-4 border-b flex justify-between items-center shrink-0 rounded-t-xl">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <IconUser className="text-indigo-500" />
          {formData.id ? `Editando: ${formData.apellido}` : "Nuevo Integrante"}
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-red-500 transition-colors"
        >
          <IconX />
        </button>
      </div>

      {/* Tabs Selector Fijo */}
      <div className="flex border-b text-xs font-bold uppercase tracking-wider shrink-0 bg-white">
        {[
          { id: "personal", label: "Personal", icon: <IconId size={14} /> },
          {
            id: "docs",
            label: "Documentos/Links",
            icon: <IconLink size={14} />,
          },
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
          {activeTab === "personal" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Apellido</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.apellido}
                    onChange={(e) =>
                      setFormData({ ...formData, apellido: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* DNI, CUIL, Fecha Nac */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>DNI</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.dni}
                    onChange={(e) =>
                      setFormData({ ...formData, dni: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>CUIL</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.cuil}
                    onChange={(e) =>
                      setFormData({ ...formData, cuil: e.target.value })
                    }
                  />
                </div>
                <div>
                  <DateInput
                    label="Fecha Nacimiento"
                    value={formData.fecha_nac}
                    onChange={(val) =>
                      setFormData({ ...formData, fecha_nac: val })
                    }
                  />
                </div>
              </div>

              {/* Contacto e Instrumento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Mail Personal</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={formData.mail}
                    onChange={(e) =>
                      setFormData({ ...formData, mail: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Instrumento</label>
                  <select
                    className={inputClass}
                    value={formData.id_instr || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, id_instr: e.target.value })
                    }
                  >
                    <option value="">Seleccionar instrumento...</option>
                    {catalogoInstrumentos?.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.instrumento}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Condición y Género */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Condición</label>
                  <select
                    className={inputClass}
                    value={formData.condicion}
                    onChange={(e) =>
                      setFormData({ ...formData, condicion: e.target.value })
                    }
                  >
                    <option value="Planta">Planta</option>
                    <option value="Contratado">Contratado</option>
                    <option value="Invitado">Invitado</option>
                    <option value="Refuerzo">Refuerzo</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Género</label>
                  <select
                    className={inputClass}
                    value={formData.genero}
                    onChange={(e) =>
                      setFormData({ ...formData, genero: e.target.value })
                    }
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="-">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nacionalidad</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.nacionalidad}
                    onChange={(e) =>
                      setFormData({ ...formData, nacionalidad: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* FECHAS ALTA / BAJA */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <DateInput
                    label="Fecha de Alta"
                    value={formData.fecha_alta}
                    onChange={(val) =>
                      setFormData({ ...formData, fecha_alta: val })
                    }
                  />
                </div>
                <div>
                  <DateInput
                    label="Fecha de Baja"
                    value={formData.fecha_baja}
                    onChange={(val) =>
                      setFormData({ ...formData, fecha_baja: val })
                    }
                  />
                </div>
              </div>

              {/* SECCIÓN LOCALIDADES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 relative z-50">
                <div className="relative z-50">
                  <label className={`${labelClass} flex items-center gap-1`}>
                    <IconMapPin size={10} /> Localidad de Residencia
                  </label>
                  <SearchableSelect
                    options={locationsOptions}
                    value={formData.id_localidad}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, id_localidad: val }))
                    }
                    placeholder="Buscar localidad..."
                    className="w-full"
                  />
                </div>
                <div className="relative z-40">
                  <label
                    className={`${labelClass} flex items-center gap-1 text-indigo-500`}
                  >
                    <IconMapPin size={10} /> Localidad para Viáticos
                  </label>
                  <SearchableSelect
                    options={locationsOptions}
                    value={formData.id_loc_viaticos}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, id_loc_viaticos: val }))
                    }
                    placeholder="Buscar localidad..."
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="h-20 md:h-32"></div> 
            </div>
          )}

          {activeTab === "docs" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <label className={labelClass}>Link Documentación (Full)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className={inputClass}
                  value={formData.documentacion}
                  onChange={(e) =>
                    setFormData({ ...formData, documentacion: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Link Documentación Reducida</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className={inputClass}
                  value={formData.docred}
                  onChange={(e) =>
                    setFormData({ ...formData, docred: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Link Firma Digital (PNG)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className={inputClass}
                  value={formData.firma}
                  onChange={(e) =>
                    setFormData({ ...formData, firma: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Link Bio / Web</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.link_bio}
                    onChange={(e) =>
                      setFormData({ ...formData, link_bio: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Link Foto (Popup)</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.link_foto_popup}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        link_foto_popup: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "acceso" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-4 text-xs text-amber-800">
                Datos para el inicio de sesión del músico en la plataforma.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email de Acceso</label>
                  <input
                    type="email"
                    name="email_usuario_nuevo"
                    autoComplete="none"
                    className={inputClass}
                    value={formData.email_acceso || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email_acceso: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Clave</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className={inputClass}
                      value={formData.clave_acceso || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          clave_acceso: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
                <label className={labelClass}>Rol en el Sistema</label>
                <select
                  className={inputClass}
                  value={formData.rol_sistema}
                  onChange={(e) =>
                    setFormData({ ...formData, rol_sistema: e.target.value })
                  }
                >
                  <option value="personal">Músico (Solo lectura)</option>
                  <option value="editor">Editor (Logística)</option>
                  <option value="admin">Administrador Total</option>
                </select>
              </div>
            </div>
          )}

          {/* Footer de Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 rounded transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {loading ? <IconLoader className="animate-spin" /> : <IconSave />}
              {formData.id ? "Guardar Cambios" : "Crear Integrante"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}