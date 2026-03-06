import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  IconUsers,
  IconSearch,
  IconCheck,
  IconX,
  IconLoader,
  IconMail,
  IconPlus,
  IconLock,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconCopy,
  IconEdit,
} from "../../components/ui/Icons";
import ConfirmModal from "../../components/ui/ConfirmModal";
import SearchableSelect from "../../components/ui/SearchableSelect";

// Roles asignables en Gestión de Usuarios (multi-selección, alineado con AuthContext)
const ROLES_OPTIONS = [
  { id: "personal", label: "👤 Personal" },
  { id: "consulta_personal", label: "👁️ Consulta Personal" },
  { id: "consulta_general", label: "👁️ Consulta General" },
  { id: "musico", label: "🎵 Músico" },
  { id: "difusion", label: "📢 Difusión" },
  { id: "arreglador", label: "📝 Arreglador" },
  { id: "archivista", label: "📁 Archivista" },
  { id: "editor", label: "✏️ Editor" },
  { id: "coord_general", label: "⚙️ Coord. General" },
  { id: "produccion_general", label: "🎬 Producción General" },
  { id: "director", label: "🎼 Director" },
  { id: "admin", label: "🛡️ Administrador" },
];

function normalizeRolSistema(rolSistema) {
  if (rolSistema == null) return [];
  if (Array.isArray(rolSistema)) return rolSistema.map((r) => String(r).trim()).filter(Boolean);
  const s = String(rolSistema).trim();
  return s ? [s] : [];
}

export default function UsersManager({ supabase }) {
  const [integrantes, setIntegrantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edición explícita: { userId, field: 'mail' | 'clave_acceso' } o null
  const [editingField, setEditingField] = useState(null);
  // Valores originales al abrir edición (para revertir y para confirmar solo si cambió)
  const [editOriginal, setEditOriginal] = useState(null);
  // Modal de confirmación antes de guardar cambio
  const [confirmSave, setConfirmSave] = useState(null);

  const [newMember, setNewMember] = useState({
    nombre: "",
    apellido: "",
    mail: "",
    clave_acceso: "",
    rol_sistema: ["personal"],
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

  const handleLocalChange = (userId, field, newValue) => {
    setIntegrantes((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, [field]: newValue } : u)),
    );
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copiado al portapapeles"),
      () => toast.error("No se pudo copiar")
    );
  };

  const startEdit = (user, field) => {
    setEditingField({ userId: user.id, field });
    setEditOriginal({ userId: user.id, mail: user.mail || "", clave_acceso: user.clave_acceso || "" });
    if (field === "clave_acceso") {
      setVisiblePasswords((prev) => new Set(prev).add(user.id));
    }
  };

  const cancelEdit = (userId) => {
    if (!editOriginal || editOriginal.userId !== userId) {
      setEditingField(null);
      setEditOriginal(null);
      return;
    }
    setIntegrantes((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, mail: editOriginal.mail, clave_acceso: editOriginal.clave_acceso }
          : u
      )
    );
    setEditingField(null);
    setEditOriginal(null);
  };

  const isEditing = (userId, field) =>
    editingField?.userId === userId && editingField?.field === field;

  const performSave = async (userId, field, value) => {
    const payload = field === "mail" ? { mail: (value || "").trim() } : { clave_acceso: value || "" };
    const { error } = await supabase
      .from("integrantes")
      .update(payload)
      .eq("id", userId);
    if (error) {
      toast.error("Error al actualizar: " + error.message);
      fetchData();
    } else {
      toast.success(field === "mail" ? "Email actualizado" : "Clave actualizada");
    }
    setEditingField(null);
    setEditOriginal(null);
    setConfirmSave(null);
    fetchData();
  };

  const saveEdit = (user, field) => {
    const current = field === "mail" ? (user.mail || "").trim() : (user.clave_acceso || "");
    const original = field === "mail" ? (editOriginal?.mail ?? "") : (editOriginal?.clave_acceso ?? "");
    if (current === original) {
      setEditingField(null);
      setEditOriginal(null);
      return;
    }
    setConfirmSave({
      userId: user.id,
      field,
      value: current,
      userName: `${user.nombre} ${user.apellido}`,
      label: field === "mail" ? "email" : "clave",
    });
  };

  const handleConfirmSave = () => {
    if (!confirmSave) return;
    performSave(confirmSave.userId, confirmSave.field, confirmSave.value);
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
        rol_sistema: ["personal"],
      });
    }
  };

  const handleUpdateUser = async (userId, field, value) => {
    const updatedList = integrantes.map((u) =>
      u.id === userId ? { ...u, [field]: value } : u,
    );
    setIntegrantes(updatedList);

    const payload = field === "rol_sistema" && Array.isArray(value) ? { rol_sistema: value } : { [field]: value };
    const { error } = await supabase
      .from("integrantes")
      .update(payload)
      .eq("id", userId);

    if (error) {
      toast.error("Error actualizando: " + error.message);
      fetchData();
    } else if (field === "rol_sistema") {
      toast.success("Roles actualizados");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este integrante?")) return;
    const { error } = await supabase.from("integrantes").delete().eq("id", id);
    if (error) alert("Error: " + error.message);
    else setIntegrantes(integrantes.filter((u) => u.id !== id));
  };

  const filteredUsers = integrantes.filter(
    (u) =>
      (u.nombre && u.nombre.toLowerCase().includes(search.toLowerCase())) ||
      (u.apellido && u.apellido.toLowerCase().includes(search.toLowerCase())) ||
      (u.mail && u.mail.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <IconUsers className="text-indigo-600" /> Gestión de Usuarios
          </h2>
          <div className="relative w-64">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch size={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar..."
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

      {/* Modal Crear Nuevo con el nuevo Rol */}
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
                <label className="label-text">Email</label>
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
                <label className="label-text">Clave</label>
                <input
                  type="text"
                  className="input-field"
                  required
                  value={newMember.clave_acceso}
                  onChange={(e) =>
                    setNewMember({ ...newMember, clave_acceso: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="label-text">Roles de sistema (varios permitidos)</label>
                <SearchableSelect
                  options={ROLES_OPTIONS}
                  value={Array.isArray(newMember.rol_sistema) ? newMember.rol_sistema : [newMember.rol_sistema || "personal"]}
                  onChange={(ids) =>
                    setNewMember({ ...newMember, rol_sistema: ids && ids.length ? ids : ["personal"] })
                  }
                  placeholder="Seleccionar roles..."
                  isMulti
                  className="input-field min-h-[38px]"
                  dropdownMinWidth={280}
                />
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

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="p-4 w-1/3">Integrante</th>
                <th className="p-4 w-1/4">Rol de Sistema</th>
                <th className="p-4 w-1/4">Clave</th>
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
                    <td className="p-4">
                      <div className="font-bold text-slate-700 mb-1">
                        {u.nombre} {u.apellido}
                      </div>
                      <div className="flex items-center gap-2">
                        <IconMail
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                        <input
                          type="text"
                          readOnly={!isEditing(u.id, "mail")}
                          className="bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full text-xs text-slate-600 disabled:bg-transparent"
                          value={u.mail || ""}
                          onChange={(e) =>
                            handleLocalChange(u.id, "mail", e.target.value)
                          }
                        />
                        {!isEditing(u.id, "mail") ? (
                          <>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(u.mail)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Copiar"
                            >
                              <IconCopy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(u, "mail")}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Editar"
                            >
                              <IconEdit size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(u, "mail")}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                              title="Guardar"
                            >
                              <IconCheck size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelEdit(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Cancelar"
                            >
                              <IconX size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="p-4 min-w-[200px]">
                      <SearchableSelect
                        options={ROLES_OPTIONS}
                        value={normalizeRolSistema(u.rol_sistema)}
                        onChange={(ids) =>
                          handleUpdateUser(u.id, "rol_sistema", ids && ids.length ? ids : ["personal"])
                        }
                        placeholder="Roles..."
                        isMulti
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white min-h-[36px] w-full outline-none focus:ring-2 focus:ring-indigo-500"
                        dropdownMinWidth={280}
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 w-full max-w-[220px]">
                        <IconLock size={14} className="text-slate-300 shrink-0" />
                        <input
                          type={isPasswordVisible ? "text" : "password"}
                          readOnly={!isEditing(u.id, "clave_acceso")}
                          className="bg-transparent text-xs outline-none w-full text-slate-600 font-mono disabled:bg-transparent"
                          value={u.clave_acceso || ""}
                          onChange={(e) =>
                            handleLocalChange(
                              u.id,
                              "clave_acceso",
                              e.target.value,
                            )
                          }
                        />
                        {!isEditing(u.id, "clave_acceso") ? (
                          <>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(u.clave_acceso)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Copiar"
                            >
                              <IconCopy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(u, "clave_acceso")}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 shrink-0"
                              title="Editar"
                            >
                              <IconEdit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 shrink-0"
                              title={isPasswordVisible ? "Ocultar" : "Ver"}
                            >
                              {isPasswordVisible ? (
                                <IconEyeOff size={14} />
                              ) : (
                                <IconEye size={14} />
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(u, "clave_acceso")}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 shrink-0"
                              title="Guardar"
                            >
                              <IconCheck size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelEdit(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 shrink-0"
                              title="Cancelar"
                            >
                              <IconX size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 shrink-0"
                            >
                              {isPasswordVisible ? (
                                <IconEyeOff size={14} />
                              ) : (
                                <IconEye size={14} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-slate-400 hover:text-red-600 p-2"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmSave}
        onClose={() => {
          if (confirmSave && editOriginal?.userId === confirmSave.userId) {
            setIntegrantes((prev) =>
              prev.map((u) =>
                u.id === confirmSave.userId
                  ? {
                      ...u,
                      ...(confirmSave.field === "mail"
                        ? { mail: editOriginal.mail }
                        : { clave_acceso: editOriginal.clave_acceso }),
                    }
                  : u
              )
            );
          }
          setConfirmSave(null);
          setEditingField(null);
          setEditOriginal(null);
        }}
        onConfirm={handleConfirmSave}
        title={confirmSave ? `¿Actualizar ${confirmSave.label}?` : ""}
        message={
          confirmSave
            ? `Se actualizará el ${confirmSave.label} de ${confirmSave.userName}.`
            : ""
        }
        confirmText="Guardar"
        cancelText="Cancelar"
      />

      <style>{`
        .label-text { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .input-field { width: 100%; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; }
        .input-field:focus { border-color: #6366f1; }
      `}</style>
    </div>
  );
}
