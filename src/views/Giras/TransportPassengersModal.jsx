import React, { useState, useEffect, useMemo } from "react";
import { IconX, IconCheck, IconSearch } from "../../components/ui/Icons";
import { normalize } from "../../hooks/useLogistics";

export default function TransportPassengersModal({
  isOpen,
  onClose,
  transporte,
  roster,
  supabase,
  giraId,
  onUpdate,
}) {
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("todos");

  // Al abrir, cargar quiénes están asignados a ESTE transporte en la tabla de Admisión
  useEffect(() => {
    if (isOpen && transporte) {
      fetchAssignments();
    }
  }, [isOpen, transporte]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Buscamos reglas de INCLUSION PERSONAL para este transporte
      // Nota: Aquí solo gestionamos asignaciones manuales (persona). Las reglas grupales no se editan aquí.
      const { data, error } = await supabase
        .from("giras_logistica_admision")
        .select("id_integrante")
        .eq("id_gira", giraId)
        .eq("id_transporte_fisico", transporte.id)
        .eq("alcance", "persona")
        .eq("tipo", "INCLUSION");

      if (error) throw error;
      setAssignedIds(new Set(data.map(r => r.id_integrante)));
    } catch (error) {
      console.error("Error fetching passengers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassenger = async (personId) => {
    const isAssigned = assignedIds.has(personId);
    
    // Optimistic UI update
    const nextSet = new Set(assignedIds);
    if (isAssigned) nextSet.delete(personId);
    else nextSet.add(personId);
    setAssignedIds(nextSet);

    try {
      if (isAssigned) {
        // ELIMINAR asignación (Inclusión personal)
        await supabase
          .from("giras_logistica_admision")
          .delete()
          .eq("id_gira", giraId)
          .eq("id_transporte_fisico", transporte.id)
          .eq("alcance", "persona")
          .eq("id_integrante", personId);
      } else {
        // AGREGAR asignación
        await supabase
          .from("giras_logistica_admision")
          .insert({
            id_gira: giraId,
            id_transporte_fisico: transporte.id,
            alcance: "persona",
            tipo: "INCLUSION",
            id_integrante: personId,
            prioridad: 5 // Prioridad máxima
          });
      }
      onUpdate && onUpdate(); // Refrescar hooks principales
    } catch (error) {
      console.error("Error updating passenger:", error);
      // Revertir en caso de error
      setAssignedIds(prev => {
          const revert = new Set(prev);
          if(isAssigned) revert.add(personId); else revert.delete(personId);
          return revert;
      });
    }
  };

  // Mapa de transportes por persona desde el summary/logistics
  const transportByPersonId = useMemo(() => {
    const map = {};
    (roster || []).forEach((p) => {
      const list =
        p.logistics?.transports?.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          subidaScope: t.subidaScope,
          bajadaScope: t.bajadaScope,
        })) || [];
      map[p.id] = list;
    });
    return map;
  }, [roster]);

  const isOverriddenByPersonal = (person) => {
    const personTransports = transportByPersonId[person.id] || [];
    if (!personTransports.length || !transporte) return false;

    const current = personTransports.find(
      (t) => String(t.id) === String(transporte.id),
    );
    if (!current) return false;

    const isLocalHere =
      !["persona", "integrante"].includes(current.subidaScope) &&
      !["persona", "integrante"].includes(current.bajadaScope);

    if (!isLocalHere) return false;

    const personalElsewhere = personTransports.some(
      (t) =>
        String(t.id) !== String(transporte.id) &&
        (["persona", "integrante"].includes(t.subidaScope) ||
          ["persona", "integrante"].includes(t.bajadaScope)),
    );

    return personalElsewhere;
  };

  const hasMultiPersonalConflict = (person) => {
    const personTransports = transportByPersonId[person.id] || [];
    const personalTransports = personTransports.filter(
      (t) =>
        ["persona", "integrante"].includes(t.subidaScope) ||
        ["persona", "integrante"].includes(t.bajadaScope),
    );
    return personalTransports.length > 1;
  };

  // Filtrado de lista base (búsqueda y rol)
  const filteredRoster = roster.filter((p) => {
    const matchSearch = `${p.nombre} ${p.apellido}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchRole =
      filterRole === "todos" ||
      (filterRole === "musicos" &&
        (!p.rol_gira || normalize(p.rol_gira).includes("music"))) ||
      (filterRole === "staff" &&
        ["staff", "produccion", "tecnico"].includes(normalize(p.rol_gira)));
    return matchSearch && matchRole;
  });

  // Aplicar jerarquía de exclusión: quitamos a quienes llegan aquí solo por Localidad
  // pero tienen una regla Personal que los lleva a otro transporte.
  const effectiveRoster = filteredRoster.filter(
    (p) => !isOverriddenByPersonal(p),
  );

  // Conteo efectivo de asignados (respetando prioridad personal)
  const effectiveAssignedCount = Array.from(assignedIds).filter((id) => {
    const person = roster.find((p) => String(p.id) === String(id));
    if (!person) return true;
    return !isOverriddenByPersonal(person);
  }).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Gestionar Pasajeros</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              {transporte?.nombre} <span className="mx-1">•</span>{" "}
              {effectiveAssignedCount} Asignados
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <IconX size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b bg-white flex gap-2">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Buscar persona..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="text-sm border rounded-lg px-3 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="musicos">Músicos</option>
            <option value="staff">Staff / Prod</option>
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Cargando asignaciones...</div>
          ) : effectiveRoster.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No se encontraron personas.</div>
          ) : (
            effectiveRoster.map((p) => {
              const isSelected = assignedIds.has(p.id);
              const hasConflict = hasMultiPersonalConflict(p);
              const conflictTransports =
                (transportByPersonId[p.id] || [])
                  .filter(
                    (t) =>
                      ["persona", "integrante"].includes(t.subidaScope) ||
                      ["persona", "integrante"].includes(t.bajadaScope),
                  )
                  .map((t) => t.nombre)
                  .join(" / ") || "";

              const rowClasses = hasConflict
                ? "bg-amber-900 text-amber-50 border-amber-700"
                : isSelected
                  ? "bg-indigo-50 border-indigo-200 shadow-sm"
                  : "bg-white border-slate-100 hover:border-indigo-300 hover:shadow-sm";

              const title = hasConflict
                ? `Conflicto de asignación: ${conflictTransports}`
                : undefined;

              return (
                <div
                  key={p.id}
                  onClick={() => handleTogglePassenger(p.id)}
                  title={title}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${rowClasses}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                        {p.apellido}, {p.nombre}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold flex gap-2">
                        <span>{p.rol_gira || "Invitado"}</span>
                        {p.instrumentos?.nombre && <span>• {p.instrumentos.nombre}</span>}
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"}`}>
                    {isSelected && <IconCheck size={12} className="text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-slate-50 border-t text-[10px] text-slate-400 text-center">
          Los cambios se guardan automáticamente en la base de datos de Admisión.
        </div>
      </div>
    </div>
  );
}