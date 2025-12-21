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

export default function MusicianForm({ supabase, musician, onSave, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    const fetchInstruments = async () => {
      const { data } = await supabase
        .from("instrumentos")
        .select("id, instrumento")
        .order("instrumento");
      if (data) setCatalogoInstrumentos(data);
    };
    fetchInstruments();
  }, [supabase]);
  useEffect(() => {
    if (musician) {
      setFormData((prev) => ({ ...prev, ...musician }));
    }
  }, [musician]); // Se dispara cada vez que seleccionas un músico diferente para editar
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  // Inicialización y corrección de edición:
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    id_instr: "",
    dni: "",
    cuil: "",
    mail: "",
    telefono: "",
    condicion: "Planta",
    genero: "Masculino",
    alimentacion: "",
    nacionalidad: "Argentina",
    fecha_nac: "",
    email_google: "",
    id_localidad: null,
    link_bio: "",
    link_foto_popup: "",
    documentacion: "",
    docred: "",
    firma: "",
    email_acceso: "",
    rol_sistema: "user",
    clave_acceso: "",
  });

  useEffect(() => {
    if (musician) {
      setFormData({ ...formData, ...musician });
    }
  }, [musician]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Creamos una copia de los datos del formulario
      const payload = { ...formData };

      // 2. Eliminamos las propiedades que NO son columnas de la tabla 'integrantes'
      // El objeto 'instrumento' que viene del join al leer
      delete payload.instrumento;
      delete payload.instrumentos; // Por si acaso viene en plural
      delete payload.ensamble;
      delete payload.integrantes_ensambles;
          delete payload.localidades;


      // Nota: Asegúrate de que 'id_instr' sí vaya en el payload, ya que es la clave foránea real.

      const { data, error } = await supabase
        .from("integrantes")
        .upsert([payload]) // Enviamos el payload limpio
        .select()
        .single();

      if (error) throw error;
      onSave(data);
    } catch (error) {
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
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

      {/* Tabs Selector */}
      <div className="flex border-b text-xs font-bold uppercase tracking-wider">
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

      <form onSubmit={handleSubmit} className="p-6">
        {activeTab === "personal" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
            <div className="grid grid-cols-3 gap-4">
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
                <label className={labelClass}>Fecha Nacimiento</label>
                <input
                  type="date"
                  className={inputClass}
                  value={formData.fecha_nac}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_nac: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                  {/* Usamos el catálogo que ya recibe el componente o MusicianView */}
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
            <div className="grid grid-cols-3 gap-4">
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
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
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
                  name="email_usuario_nuevo" // Nombre diferente para despistar al navegador
                  autoComplete="none" // Intento de bloqueo
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
                    autoComplete="new-password" // Esto evita que el navegador rellene tu clave actual
                    placeholder="••••••••"
                    className={inputClass}
                    value={formData.clave_acceso || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, clave_acceso: e.target.value })
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

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
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
  );
}
