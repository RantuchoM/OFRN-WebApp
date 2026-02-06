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
  IconEye,
  IconEyeOff,
} from "../../components/ui/Icons";

export default function UsersManager({ supabase }) {
  const [integrantes, setIntegrantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Estado para controlar qué contraseñas son visibles
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());

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

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // Maneja el cambio de texto en inputs (Mail o Clave) solo en la UI local
  const handleLocalChange = (userId, field, newValue) => {
    setIntegrantes((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, [field]: newValue } : u))
    );
  };

  // Guardar cambio de EMAIL (Confirmación + Update)
  const handleEmailBlur = async (user) => {
    // Si el mail está vacío no hacemos nada (o podrías validar formato)
    if (!user.mail || user.mail.trim() === "") return;

    // Podrías comparar con el valor original si tuvieras un estado previo, 
    // por ahora pedimos confirmación simple al salir del campo.
    const confirm = window.confirm(
      `¿Actualizar el email de ${user.nombre} a "${user.mail}"?`
    );

    if (confirm) {
      const { error } = await supabase
        .from("integrantes")
        .update({ mail: user.mail.trim() })
        .eq("id", user.id);

      if (error) {
        alert("Error al actualizar email: " + error.message);
        fetchData(); // Revertir
      }
    } else {
      fetchData(); // Revertir si cancela
    }
  };

  // Guardar cambio de PASSWORD (Confirmación + Update)
  const handlePasswordBlur = async (user) => {
    if (!user.clave_acceso) return;

    const confirm = window.confirm(
      `¿Estás seguro de cambiar la clave para ${user.nombre}?`
    );

    if (confirm) {
      const { error } = await supabase
        .from("integrantes")
        .update({ clave_acceso: user.clave_acceso })
        .eq("id", user.id);

      if (error) {
        alert("Error al actualizar clave: " + error.message);
        fetchData();
      }
    } else {
      fetchData();
    }
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setCreating(true);

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
      setIntegrantes([...integrantes, data]);
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

  const handleUpdateUser = async (userId, field, value) => {
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
      fetchData();
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

      {/* Modal Crear Nuevo */}
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
                    👤 Consulta Personal
                  </option>
                  <option value="consulta_general">
                    👁️ Consulta General
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
                <th className="p-4 w-1/3">Integrante / Email</th>
                <th className="p-4 w-1/4">Rol de Sistema</th>
                <th className="p-4 w-1/4">Clave de Acceso</th>
                <th className="p-4 text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isPasswordVisible = visiblePasswords.has(u.id);
                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* COLUMNA 1: Nombre + Email Editable */}
                    <td className="p-4">
                      <div className="font-bold text-slate-700 mb-1">
                        {u.nombre} {u.apellido}
                      </div>
                      <div className="flex items-center gap-2 max-w-[250px]">
                        <IconMail size={14} className="text-slate-400 shrink-0" />
                        <input
                          type="text"
                          className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full text-xs text-slate-600 transition-all placeholder:text-slate-300"
                          value={u.mail || ""}
                          onChange={(e) =>
                            handleLocalChange(u.id, "mail", e.target.value)
                          }
                          onBlur={() => handleEmailBlur(u)}
                          placeholder="Sin email"
                        />
                      </div>
                    </td>

                    {/* COLUMNA 2: Rol */}
                    <td className="p-4">
                      <select
                        className={`border rounded px-2 py-1 text-xs font-bold uppercase cursor-pointer outline-none w-full ${
                          u.rol_sistema === "admin"
                            ? "bg-purple-100 text-purple-700 border-purple-200"
                            : u.rol_sistema === "editor"
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                            : u.rol_sistema === "consulta_personal"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                        value={u.rol_sistema || "consulta_general"}
                        onChange={(e) =>
                          handleUpdateUser(u.id, "rol_sistema", e.target.value)
                        }
                      >
                        <option value="consulta_personal">
                          👤 Consulta Personal
                        </option>
                        <option value="consulta_general">
                          👁️ Consulta General
                        </option>
                        <option value="editor">✏️ Editor</option>
                        <option value="admin">🛡️ Administrador</option>
                      </select>
                    </td>

                    {/* COLUMNA 3: Password Editable */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 w-full max-w-[180px] hover:border-indigo-300 transition-colors">
                        <IconLock
                          size={14}
                          className="text-slate-300 shrink-0"
                        />
                        <input
                          type={isPasswordVisible ? "text" : "password"}
                          className="bg-transparent text-xs outline-none w-full text-slate-600 font-mono tracking-wide"
                          value={u.clave_acceso || ""}
                          onChange={(e) =>
                            handleLocalChange(u.id, "clave_acceso", e.target.value)
                          }
                          onBlur={() => handlePasswordBlur(u)}
                          placeholder="Sin clave"
                        />
                        <button
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0 p-1 rounded-full hover:bg-slate-100"
                          title={
                            isPasswordVisible
                              ? "Ocultar clave"
                              : "Mostrar clave"
                          }
                        >
                          {isPasswordVisible ? (
                            <IconEyeOff size={14} />
                          ) : (
                            <IconEye size={14} />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                        title="Eliminar Integrante"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
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