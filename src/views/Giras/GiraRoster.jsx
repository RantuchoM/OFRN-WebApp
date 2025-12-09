// src/views/Giras/GiraRoster.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  IconUsers,
  IconPlus,
  IconX,
  IconTrash,
  IconLoader,
  IconSearch,
  IconAlertCircle,
  IconCheck,
  IconChevronDown,
  IconMusic,
} from "../../components/ui/Icons";

// --- COMPONENTE METRIC BADGE ---
const MetricBadge = ({ label, items, colorBase, icon }) => {
  const count = items.length;
  if (count === 0) return null;
  return (
    <div className="relative group cursor-help z-30">
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${colorBase}`}
      >
        {icon}
        <span>
          {count} {label}
        </span>
      </div>
      <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50 overflow-hidden">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
          Listado de {label}
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {items.map((m) => (
            <div
              key={m.id}
              className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex justify-between"
            >
              <span>
                {m.apellido}, {m.nombre}
              </span>
              <span className="text-[10px] text-slate-400 ml-2 truncate max-w-[60px]">
                {m.instrumentos?.instrumento}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MULTI SELECT DROPDOWN ---
const MultiSelectDropdown = ({
  options,
  selected,
  onChange,
  label,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleOption = (val) => {
    const newSet = new Set(selected);
    if (newSet.has(val)) newSet.delete(val);
    else newSet.add(val);
    onChange(newSet);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-white border border-slate-300 rounded text-sm text-left"
      >
        <span
          className={
            selected.size ? "text-indigo-700 font-medium" : "text-slate-400"
          }
        >
          {selected.size > 0 ? `${selected.size} seleccionados` : placeholder}
        </span>
        <IconChevronDown size={14} className="text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 max-h-48 overflow-y-auto p-1">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded text-sm"
            >
              <div
                className={`w-4 h-4 border rounded flex items-center justify-center ${
                  selected.has(opt.value)
                    ? "bg-indigo-600 border-indigo-600"
                    : "border-slate-300"
                }`}
              >
                {selected.has(opt.value) && (
                  <IconCheck size={10} className="text-white" />
                )}
              </div>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function GiraRoster({ supabase, gira, onBack }) {
  const [roster, setRoster] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados UI
  const [addMode, setAddMode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Dropdowns (Fuentes de Inclusión)
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [familiesList, setFamiliesList] = useState([]);
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());

  // NUEVO: Dropdowns (Fuentes de EXCLUSIÓN)
  const [selectedExclEnsembles, setSelectedExclEnsembles] = useState(new Set());

  useEffect(() => {
    loadAllData();
    fetchDropdownData();
  }, [gira.id]);

  useEffect(() => {
    if (addMode === "individual" && searchTerm.length > 2)
      searchIndividual(searchTerm);
    else setSearchResults([]);
  }, [searchTerm, addMode]);

  const fetchDropdownData = async () => {
    const { data: ens } = await supabase
      .from("ensambles")
      .select("id, ensamble");
    if (ens)
      setEnsemblesList(ens.map((e) => ({ value: e.id, label: e.ensamble })));

    const { data: inst } = await supabase
      .from("instrumentos")
      .select("familia");
    if (inst) {
      const fams = [...new Set(inst.map((i) => i.familia).filter(Boolean))];
      setFamiliesList(fams.map((f) => ({ value: f, label: f })));
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. FUENTES DE INCLUSIÓN Y EXCLUSIÓN
      const { data: fuentes } = await supabase
        .from("giras_fuentes")
        .select("*")
        .eq("id_gira", gira.id);
      setSources(fuentes || []);

      const inclEnsembles = new Set();
      const inclFamilies = new Set();
      const exclEnsembles = new Set(); // Nuevo set para exclusiones

      fuentes?.forEach((f) => {
        if (f.tipo === "ENSAMBLE") inclEnsembles.add(f.valor_id);
        if (f.tipo === "FAMILIA") inclFamilies.add(f.valor_texto);
        if (f.tipo === "EXCL_ENSAMBLE") exclEnsembles.add(f.valor_id); // Nuevo tipo
      });

      setSelectedEnsembles(inclEnsembles);
      setSelectedFamilies(inclFamilies);
      setSelectedExclEnsembles(exclEnsembles); // Cargar estado de exclusión

      // 2. EXCEPCIONES Y ROLES (giras_integrantes)
      const { data: overrides } = await supabase
        .from("giras_integrantes")
        .select("id_integrante, estado, rol")
        .eq("id_gira", gira.id);

      const overrideMap = {};
      overrides?.forEach(
        (o) => (overrideMap[o.id_integrante] = { estado: o.estado, rol: o.rol })
      );

      // --- PASO 3: CALCULAR SETS DE MÚSICOS ---

      const [membersEns, membersFam, membersExcl] = await Promise.all([
        // A) Miembros de ensambles INCLUIDOS
        inclEnsembles.size > 0
          ? supabase
              .from("integrantes_ensambles")
              .select("id_integrante")
              .in("id_ensamble", Array.from(inclEnsembles))
              .then((res) => res.data || [])
          : Promise.resolve([]),

        // B) Miembros de familias INCLUIDAS
        inclFamilies.size > 0
          ? supabase
              .from("integrantes")
              .select("id, instrumentos!inner(familia)")
              .in("instrumentos.familia", Array.from(inclFamilies))
              .then((res) => res.data || [])
          : Promise.resolve([]),

        // C) Miembros de ensambles EXCLUIDOS
        exclEnsembles.size > 0
          ? supabase
              .from("integrantes_ensambles")
              .select("id_integrante")
              .in("id_ensamble", Array.from(exclEnsembles))
              .then((res) => res.data || [])
          : Promise.resolve([]),
      ]);

      const baseIncludedIds = new Set([
        ...membersEns.map((m) => m.id_integrante),
        ...membersFam.map((m) => m.id),
      ]);
      const excludedIds = new Set(membersExcl.map((m) => m.id_integrante));
      const manualIds = new Set(overrides.map((o) => o.id_integrante));

      const allPotentialIds = new Set([
        ...baseIncludedIds,
        ...excludedIds,
        ...manualIds,
      ]);

      if (allPotentialIds.size === 0) {
        setRoster([]);
        setLoading(false);
        return;
      }

      // 4. TRAER DATOS COMPLETOS
      const { data: musicians } = await supabase
        .from("integrantes")
        .select(
          "id, nombre, apellido, fecha_alta, fecha_baja, condicion, instrumentos(instrumento, familia)"
        )
        .in("id", Array.from(allPotentialIds));

      if (!musicians) {
        setRoster([]);
        return;
      }

      const giraInicio = new Date(gira.fecha_desde);
      const giraFin = new Date(gira.fecha_hasta);

      const finalRoster = [];
      musicians.forEach((m) => {
        const id = m.id;
        const manualData = overrideMap[id];
        const isBaseIncluded = baseIncludedIds.has(id);
        const isExcluded = excludedIds.has(id);
        const isManual = manualIds.has(id);

        let keep = false;
        let estadoReal = "confirmado";
        let rolReal = "musico";
        let esAdicional = false;

        if (isManual) {
          // REGLA 1: Manual Override
          estadoReal = manualData.estado;
          rolReal = manualData.rol;
          if (estadoReal === "confirmado") {
            keep = true;
            esAdicional = true;
          } // Manualmente agregado/incluido
          // Si es 'ausente', DISCARD, handled by 'keep = false' default
        } else {
          // REGLA 2: Lógica Dinámica (Inclusión - Exclusión)
          if (isBaseIncluded && !isExcluded) {
            // Aplicar filtro de fecha solo a miembros dinámicos (no manuales)
            if (
              (m.fecha_alta && new Date(m.fecha_alta) > giraInicio) ||
              (m.fecha_baja && new Date(m.fecha_baja) < giraFin)
            ) {
              keep = false; // Filtrado por fecha
            } else {
              keep = true; // Incluido por grupo/familia y no excluido por Ensamble
            }
          }
        }

        if (keep) {
          finalRoster.push({
            ...m,
            estado_gira: estadoReal,
            rol_gira: rolReal,
            es_adicional: esAdicional, // Marcamos si es override manual (no viene de grupo dinámico)
          });
        }
      });

      const sortedRoster = finalRoster.sort((a, b) => {
        // Ordenar: Producción/Director primero, luego Alfabético
        const rolesPrio = {
          produccion: 1,
          director: 2,
          staff: 3,
          solista: 4,
          musico: 5,
          chofer: 6,
        };
        const pA = rolesPrio[a.rol_gira] || 99;
        const pB = rolesPrio[b.rol_gira] || 99;

        if (pA !== pB) return pA - pB;
        return (a.apellido || "").localeCompare(b.apellido || "");
      });

      setRoster(sortedRoster);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES DE GRUPO ---
  const handleUpdateGroups = async () => {
    setLoading(true);

    // 1. ELIMINAR TODAS LAS FUENTES EXISTENTES
    await supabase.from("giras_fuentes").delete().eq("id_gira", gira.id);

    const inserts = [];

    // 2. INSERTAR INCLUSIONES
    selectedEnsembles.forEach((id) =>
      inserts.push({ id_gira: gira.id, tipo: "ENSAMBLE", valor_id: id })
    );
    selectedFamilies.forEach((fam) =>
      inserts.push({ id_gira: gira.id, tipo: "FAMILIA", valor_texto: fam })
    );

    // 3. INSERTAR EXCLUSIONES (NUEVO TIPO)
    selectedExclEnsembles.forEach((id) =>
      inserts.push({ id_gira: gira.id, tipo: "EXCL_ENSAMBLE", valor_id: id })
    );

    if (inserts.length > 0)
      await supabase.from("giras_fuentes").insert(inserts);

    setAddMode(null);
    loadAllData();
  };

  const removeSource = async (id, tipo) => {
    let msg = "¿Quitar fuente de la lista?";
    if (tipo === "EXCL_ENSAMBLE")
      msg = "¿Quitar Ensamble de la lista de EXCLUSIÓN?";

    if (!confirm(msg)) return;
    setLoading(true);
    await supabase.from("giras_fuentes").delete().eq("id", id);
    loadAllData();
  };

  const searchIndividual = async (term) => {
    const { data } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido, instrumentos(instrumento)")
      .or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%`)
      .limit(5);
    const currentIds = new Set(roster.map((r) => r.id));
    setSearchResults(data ? data.filter((m) => !currentIds.has(m.id)) : []);
  };

  const addManualMusician = async (musicianId) => {
    const { error } = await supabase
      .from("giras_integrantes")
      .insert({
        id_gira: gira.id,
        id_integrante: musicianId,
        estado: "confirmado",
        rol: "musico",
      });
    if (!error) {
      setSearchTerm("");
      loadAllData();
    }
  };

  // --- CAMBIAR ROL ---
  const changeRole = async (musician, newRole) => {
    // Optimistic update
    setRoster((prev) =>
      prev.map((m) => (m.id === musician.id ? { ...m, rol_gira: newRole } : m))
    );

    // Guardar en DB (upsert para crear la relación si venía de un grupo dinámico)
    await supabase.from("giras_integrantes").upsert(
      {
        id_gira: gira.id,
        id_integrante: musician.id,
        rol: newRole,
        estado: musician.estado_gira,
      },
      { onConflict: "id_gira, id_integrante" }
    );
  };

  const toggleStatus = async (musician) => {
    const newStatus =
      musician.estado_gira === "confirmado" ? "ausente" : "confirmado";
    setRoster((prev) =>
      prev.map((m) =>
        m.id === musician.id ? { ...m, estado_gira: newStatus } : m
      )
    );

    if (newStatus === "ausente") {
      // Al marcar AUSENTE: Siempre crear/actualizar el override
      await supabase.from("giras_integrantes").upsert(
        {
          id_gira: gira.id,
          id_integrante: musician.id,
          estado: newStatus,
          rol: musician.rol_gira,
        },
        { onConflict: "id_gira, id_integrante" }
      );
    } else {
      // Al marcar PRESENTE: ELIMINAR el override para restaurar estado dinámico.
      // Esto revierte el control a la lógica de inclusión/exclusión.
      await supabase
        .from("giras_integrantes")
        .delete()
        .eq("id_gira", gira.id)
        .eq("id_integrante", musician.id);
    }
  };

  const removeMemberManual = async (id) => {
    if (!confirm("¿Eliminar registro manual?")) return;
    const { error } = await supabase
      .from("giras_integrantes")
      .delete()
      .eq("id_integrante", id)
      .eq("id_gira", gira.id);
    if (!error) loadAllData();
  };

  const listaAusentes = roster.filter((r) => r.estado_gira === "ausente");
  const listaAdicionales = roster.filter((r) => r.es_adicional);
  const listaConfirmados = roster.filter((r) => r.estado_gira === "confirmado");

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1"
          >
            ← Volver
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {gira.nombre_gira}
            </h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {sources.map((s) => {
                const label =
                  s.tipo === "ENSAMBLE" || s.tipo === "EXCL_ENSAMBLE"
                    ? ensemblesList.find((e) => e.value === s.valor_id)?.label
                    : s.valor_texto;
                const typeClass =
                  s.tipo === "EXCL_ENSAMBLE"
                    ? "bg-red-50 text-red-700 border-red-100"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100";

                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${typeClass}`}
                  >
                    {label}
                    <button
                      onClick={() => removeSource(s.id, s.tipo)}
                      className="ml-1 hover:text-black/70"
                    >
                      <IconX size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <MetricBadge
            label="Confirmados"
            items={listaConfirmados}
            colorBase="bg-emerald-50 text-emerald-700 border-emerald-100"
            icon={<IconCheck size={14} />}
          />
          <MetricBadge
            label="Ausentes"
            items={listaAusentes}
            colorBase="bg-red-50 text-red-700 border-red-100"
            icon={<IconX size={14} />}
          />
          <MetricBadge
            label="Manuales"
            items={listaAdicionales}
            colorBase="bg-amber-50 text-amber-700 border-amber-100"
            icon={<span className="text-xs">+</span>}
          />
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="p-4 bg-white border-b border-slate-100 flex gap-3 items-start overflow-visible z-20">
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setAddMode(addMode === "groups" ? null : "groups")}
            className={`px-3 py-1 rounded text-xs font-bold ${
              addMode === "groups"
                ? "bg-white shadow text-indigo-700"
                : "text-slate-500"
            }`}
          >
            Grupos
          </button>
          <button
            onClick={() =>
              setAddMode(addMode === "individual" ? null : "individual")
            }
            className={`px-3 py-1 rounded text-xs font-bold ${
              addMode === "individual"
                ? "bg-white shadow text-indigo-700"
                : "text-slate-500"
            }`}
          >
            Individual
          </button>
        </div>

        {addMode === "groups" && (
          <div className="flex gap-3 flex-wrap animate-in slide-in-from-left-2 items-start bg-slate-50 p-3 rounded border border-slate-200">
            <div className="w-48">
              <MultiSelectDropdown
                label="Ensambles a Incluir"
                placeholder="Seleccionar..."
                options={ensemblesList}
                selected={selectedEnsembles}
                onChange={setSelectedEnsembles}
              />
            </div>
            <div className="w-48">
              <MultiSelectDropdown
                label="Familias a Incluir"
                placeholder="Seleccionar..."
                options={familiesList}
                selected={selectedFamilies}
                onChange={setSelectedFamilies}
              />
            </div>
            <div className="w-48">
              <MultiSelectDropdown
                label="Ensambles a EXCLUIR"
                placeholder="Seleccionar..."
                options={ensemblesList}
                selected={selectedExclEnsembles}
                onChange={setSelectedExclEnsembles}
              />
            </div>
            <button
              onClick={handleUpdateGroups}
              disabled={loading}
              className="mt-5 bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              Actualizar Lista
            </button>
          </div>
        )}

        {addMode === "individual" && (
          <div className="relative w-64 animate-in slide-in-from-left-2 mt-1">
            <input
              type="text"
              placeholder="Buscar apellido..."
              className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border mt-1 rounded shadow-xl z-50 max-h-60 overflow-y-auto">
                {searchResults.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addManualMusician(m.id)}
                    className="w-full text-left p-2 hover:bg-slate-50 text-xs border-b last:border-0"
                  >
                    <b>
                      {m.apellido}, {m.nombre}
                    </b>{" "}
                    <span className="text-slate-400">
                      ({m.instrumentos?.instrumento})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3 pl-4 w-32">Rol</th>
                <th className="p-3">Músico</th>
                <th className="p-3">Instrumento</th>
                <th className="p-3">Condición</th>
                <th className="p-3 text-center">Asistencia</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.map((m) => (
                <tr
                  key={m.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    m.estado_gira === "ausente" ? "bg-red-50/40" : ""
                  }`}
                >
                  {/* SELECTOR DE ROL */}
                  <td className="p-3 pl-4">
                    <select
                      className={`text-xs font-bold uppercase border-none bg-transparent outline-none cursor-pointer ${
                        ["director", "produccion", "chofer"].includes(
                          m.rol_gira
                        )
                          ? "text-indigo-700"
                          : "text-slate-500"
                      }`}
                      value={m.rol_gira || "musico"}
                      onChange={(e) => changeRole(m, e.target.value)}
                    >
                      <option value="musico">Músico</option>
                      <option value="director">Director</option>
                      <option value="solista">Solista</option>
                      <option value="staff">Staff</option>
                      <option value="produccion">Producción</option>
                      <option value="chofer">Chofer</option>
                    </select>
                  </td>

                  <td className="p-3 font-medium text-slate-700">
                    {m.apellido}, {m.nombre}
                  </td>
                  <td className="p-3 text-slate-500">
                    {m.instrumentos?.instrumento || "-"}
                  </td>
                  <td className="p-3">
                    {/* ETIQUETA CONDICIÓN */}
                    {m.condicion && m.condicion !== "Estable" ? (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-bold uppercase">
                        {m.condicion}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Estable
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleStatus(m)}
                      className={`w-24 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider transition-all ${
                        m.estado_gira === "ausente"
                          ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {m.estado_gira === "ausente" ? "Ausente" : "Presente"}
                    </button>
                  </td>
                  <td className="p-3 text-right pr-4">
                    {m.es_adicional && (
                      <button
                        onClick={() => removeMemberManual(m.id)}
                        className="text-slate-300 hover:text-red-500 p-1"
                      >
                        <IconTrash size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {roster.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="p-12 text-center text-slate-400 italic"
                  >
                    Lista vacía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
