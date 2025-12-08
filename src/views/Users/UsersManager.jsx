import React, { useState, useEffect } from "react";
import {
  IconUsers,
  IconSearch,
  IconCheck,
  IconX,
  IconLoader,
  IconAlertCircle,
  IconMail,
  IconPlus,
  IconLock,
  IconTrash,
} from "../../components/ui/Icons";

export default function UsersManager({ supabase }) {
  const [integrantes, setIntegrantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Estado para Crear Nuevo Integrante (Antes "Invitar")
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMember, setNewMember] = useState({
    nombre: "",
    apellido: "",
    mail: "",
    clave_acceso: "",
    rol_sistema: "consulta_general",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Solo consultamos integrantes. La tabla perfiles ya no existe/no se usa.
      const { data, error } = await supabase
        .from("integrantes")
        .select("*")
        .order("apellido", { ascending: true });

      if (error) throw error;
      setIntegrantes(data || []);
    } catch (error) {
      console.error("Error fetching integrantes:", error);
      alert("Error cargando usuarios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Crear un nuevo integrante en la base de datos
  const handleCreateMember = async (e) => {
    e.preventDefault();
    setCreating(true);

    // Validación básica
    if (!newMember.mail || !newMember.clave_acceso) {
      alert("Email y Clave son obligatorios");
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from("integrantes")
      .insert([newMember])
      .select()
      .single();

    setCreating(false);

    if (error) {
      alert("Error al crear: " + error.message);
    } else {
      alert("Integrante creado exitosamente.");
      setIntegrantes([...integrantes, data]); // Actualizamos la lista local
      setShowCreateModal(false);
      setNewMember({
        nombre: "",
        apellido: "",
        mail: "",
        clave_acceso: "",
        rol_sistema: "consulta_general",
      });
    }
  };

  // Actualizar Rol o Clave directamente
  const handleUpdateUser = async (userId, field, value) => {
    // Actualización optimista (UI primero)
    const updatedList = integrantes.map((u) =>
      u.id === userId ? { ...u, [field]: value } : u
    );
    setIntegrantes(updatedList);

    const { error } = await supabase
      .from("integrantes")
      .update({ [field]: value })
      .eq("id", userId);

    if (error) {
      alert("Error actualizando: " + error.message);
      fetchData(); // Revertir si falló
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "¿Estás seguro de eliminar este integrante? Esto borrará su historial."
      )
    )
      return;

    const { error } = await supabase.from("integrantes").delete().eq("id", id);
    if (error) {
      alert("Error: " + error.message);
    } else {
      setIntegrantes(integrantes.filter((u) => u.id !== id));
    }
  };

  const filteredUsers = integrantes.filter(
    (u) =>
      (u.nombre && u.nombre.toLowerCase().includes(search.toLowerCase())) ||
      (u.apellido && u.apellido.toLowerCase().includes(search.toLowerCase())) ||
      (u.mail && u.mail.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IconUsers className="text-indigo-600" /> Gestión de Usuarios /
            Integrantes
          </h2>
          <div className="relative w-64">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch size={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o mail..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-2"
        >
          <IconPlus size={16} /> Nuevo Integrante
        </button>
      </div>

      {/* Modal Crear Nuevo (Reemplaza al Invite) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">
                Alta de Nuevo Integrante
              </h3>
              <button onClick={() => setShowCreateModal(false)}>
                <IconX
                  size={20}
                  className="text-slate-400 hover:text-slate-600"
                />
              </button>
            </div>
            <form
              onSubmit={handleCreateMember}
              className="p-6 grid grid-cols-2 gap-4"
            >
              <div className="col-span-1">
                <label className="label-text">Nombre</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={newMember.nombre}
                  onChange={(e) =>
                    setNewMember({ ...newMember, nombre: e.target.value })
                  }
                />
              </div>
              <div className="col-span-1">
                <label className="label-text">Apellido</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={newMember.apellido}
                  onChange={(e) =>
                    setNewMember({ ...newMember, apellido: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="label-text">Email (Usuario)</label>
                <input
                  type="email"
                  className="input-field"
                  required
                  value={newMember.mail}
                  onChange={(e) =>
                    setNewMember({ ...newMember, mail: e.target.value })
                  }
                />
              </div>
              <div className="col-span-1">
                <label className="label-text">Clave de Acceso</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  placeholder="Ej: orquesta2024"
                  value={newMember.clave_acceso}
                  onChange={(e) =>
                    setNewMember({ ...newMember, clave_acceso: e.target.value })
                  }
                />
              </div>
              <div className="col-span-1">
                <label className="label-text">Rol Inicial</label>
                <select
                  className="input-field"
                  value={newMember.rol_sistema}
                  onChange={(e) =>
                    setNewMember({ ...newMember, rol_sistema: e.target.value })
                  }
                >
                  <option value="consulta_personal">
                    👤 Consulta Personal (Solo mis giras)
                  </option>

                  <option value="consulta_general">
                    👁️ Consulta General (Ver todo)
                  </option>
                  <option value="editor">✏️ Editor</option>
                  <option value="admin">🛡️ Administrador</option>
                </select>
              </div>

              <div className="col-span-2 mt-4">
                <button
                  disabled={creating}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 flex justify-center items-center gap-2"
                >
                  {creating ? (
                    <IconLoader className="animate-spin" size={18} />
                  ) : (
                    "Guardar Nuevo Integrante"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">Integrante / Usuario</th>
                <th className="p-4">Rol de Sistema</th>
                <th className="p-4">Gestión de Acceso</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-700">
                      {u.nombre} {u.apellido}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <IconMail size={12} /> {u.mail || "Sin email"}
                    </div>
                  </td>

                  <td className="p-4">
                    <select
                      // Dentro del map de la tabla
                      className={`border rounded px-2 py-1 text-xs font-bold uppercase cursor-pointer outline-none ${
                        u.rol_sistema === "admin"
                          ? "bg-purple-100 text-purple-700 border-purple-200"
                          : u.rol_sistema === "editor"
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                          : // Agregamos estilo para Consulta Personal
                          u.rol_sistema === "consulta_personal"
                          ? "bg-blue-100 text-blue-700 border-blue-200"
                          : "bg-slate-100 text-slate-600 border-slate-200" // Consulta General por defecto
                      }`}
                      value={u.rol_sistema || "consulta_general"}
                      onChange={(e) =>
                        handleUpdateUser(u.id, "rol_sistema", e.target.value)
                      }
                    >
                      <option value="consulta_personal">
                        👤 Consulta Personal (Solo mis giras)
                      </option>

                      <option value="consulta_general">
                        👁️ Consulta General (Ver todo)
                      </option>
                      <option value="editor">✏️ Editor</option>
                      <option value="admin">🛡️ Administrador</option>
                    </select>
                  </td>

                  <td className="p-4">
                    {/* Input simple para cambiar contraseña rápidamente ya que no hay "Reset Password" por mail */}
                    <div className="flex items-center gap-2">
                      <IconLock size={14} className="text-slate-300" />
                      <input
                        type="text" // Visible para el admin
                        className="border-b border-slate-200 bg-transparent text-xs py-1 focus:border-indigo-500 outline-none w-32 placeholder:text-slate-300"
                        placeholder="Nueva Clave"
                        onBlur={(e) => {
                          if (e.target.value) {
                            if (
                              window.confirm(
                                `¿Cambiar clave a "${e.target.value}"?`
                              )
                            ) {
                              handleUpdateUser(
                                u.id,
                                "clave_acceso",
                                e.target.value
                              );
                              e.target.value = ""; // Limpiar visualmente
                            }
                          }
                        }}
                      />
                    </div>
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Eliminar Integrante"
                    >
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-400 italic">
              No se encontraron integrantes.
            </div>
          )}
        </div>
      </div>

      <style>{`
                .label-text { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
                .input-field { width: 100%; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; }
                .input-field:focus { border-color: #6366f1; ring: 2px; }
            `}</style>
    </div>
  );
}
