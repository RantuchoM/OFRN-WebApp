import React, { useState, useEffect } from "react";
import {
  IconUsers,
  IconPlus,
  IconX,
  IconCheck,
  IconTrash,
  IconLoader,
  IconSearch,
  IconAlertCircle,
  IconFilter,
} from "../../components/ui/Icons";

// --- COMPONENTE INTERNO PARA LAS METRICAS CON HOVER ---
const MetricBadge = ({ label, items, colorBase, icon }) => {
  const count = items.length;
  if (count === 0) return null; // No mostrar si es 0

  return (
    <div className="relative group cursor-help z-30">
      {/* BADGE VISIBLE */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${colorBase}`}
      >
        {icon}
        <span>
          {count} {label}
        </span>
      </div>

      {/* TOOLTIP / LISTA FLOTANTE */}
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
        {count > 0 && (
          <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-100 text-[10px] text-center text-slate-400 italic">
            {count} integrante{count !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
};

export default function GiraRoster({ supabase, gira, onBack }) {
  const [roster, setRoster] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para UI de agregar
  const [addMode, setAddMode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Dropdowns
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [familiesList, setFamiliesList] = useState([]);
  const [selectedEnsemble, setSelectedEnsemble] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");

  useEffect(() => {
    loadAllData();
    fetchDropdownData();
  }, [gira.id]);

  useEffect(() => {
    if (addMode === "individual" && searchTerm.length > 2)
      searchIndividual(searchTerm);
    else setSearchResults([]);
  }, [searchTerm, addMode]);

  // --- CARGA DE DATOS ---
  const fetchDropdownData = async () => {
    const { data: ens } = await supabase
      .from("ensambles")
      .select("id, ensamble");
    if (ens) setEnsemblesList(ens);
    const { data: inst } = await supabase
      .from("instrumentos")
      .select("familia");
    if (inst)
      setFamiliesList([...new Set(inst.map((i) => i.familia).filter(Boolean))]);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fuentes
      const { data: fuentes } = await supabase
        .from("giras_fuentes")
        .select("*")
        .eq("id_gira", gira.id);
      setSources(fuentes || []);

      // 2. Excepciones
      const { data: overrides } = await supabase
        .from("giras_integrantes")
        .select("id_integrante, estado")
        .eq("id_gira", gira.id);
      const overrideMap = {};
      overrides?.forEach((o) => (overrideMap[o.id_integrante] = o.estado));

      const idsToFetch = new Set();
      const dynamicIds = new Set();

      // A) Ensambles
      const ensambleIds = fuentes
        .filter((f) => f.tipo === "ENSAMBLE")
        .map((f) => f.valor_id);
      if (ensambleIds.length > 0) {
        const { data: rels } = await supabase
          .from("integrantes_ensambles")
          .select("id_integrante")
          .in("id_ensamble", ensambleIds);
        rels?.forEach((r) => {
          idsToFetch.add(r.id_integrante);
          dynamicIds.add(r.id_integrante);
        });
      }

      // B) Familias
      const familiaNames = fuentes
        .filter((f) => f.tipo === "FAMILIA")
        .map((f) => f.valor_texto);
      if (familiaNames.length > 0) {
        const { data: famMembers } = await supabase
          .from("integrantes")
          .select("id, instrumentos!inner(familia)")
          .in("instrumentos.familia", familiaNames);
        famMembers?.forEach((m) => {
          idsToFetch.add(m.id);
          dynamicIds.add(m.id);
        });
      }

      // C) Manuales
      overrides?.forEach((o) => idsToFetch.add(o.id_integrante));

      if (idsToFetch.size === 0) {
        setRoster([]);
        setLoading(false);
        return;
      }

      // TRAER DATOS COMPLETOS (Incluyendo fechas de alta/baja)
      const { data: musicians } = await supabase
        .from("integrantes")
        .select("*, instrumentos(instrumento, familia)")
        .in("id", Array.from(idsToFetch));

      if (!musicians) {
        setRoster([]);
        return;
      }

      // --- FILTRADO POR FECHAS ---
      const giraInicio = new Date(gira.fecha_desde);
      const giraFin = new Date(gira.fecha_hasta);

      const finalRoster = musicians
        .filter((m) => {
          const esManual = overrideMap[m.id]; // Si fue agregado/modificado a mano

          // Si está agregado MANUALMENTE en esta gira, lo mostramos siempre (ignora fechas)
          if (esManual) return true;

          // Si viene por GRUPO (dinámico), aplicamos filtro de fechas
          if (dynamicIds.has(m.id)) {
            // 1. Chequear Alta: Debe haber entrado antes o durante la gira
            // Si no tiene fecha_alta, asumimos que es antiguo (válido)
            if (m.fecha_alta) {
              const alta = new Date(m.fecha_alta);
              if (alta > giraInicio) return false; // Entró después de que empezó la gira
            }

            // 2. Chequear Baja: No debe haberse ido antes de que termine la gira
            if (m.fecha_baja) {
              const baja = new Date(m.fecha_baja);
              if (baja < giraFin) return false; // Se fue antes de la gira
            }

            return true; // Pasó los filtros
          }

          return false;
        })
        .map((m) => {
          const estadoReal = overrideMap[m.id] || "confirmado";
          const esDinamico = dynamicIds.has(m.id);
          return {
            ...m,
            estado_gira: estadoReal,
            es_adicional: !esDinamico,
          };
        })
        .sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));

      setRoster(finalRoster);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES ---
  const addSource = async (tipo, valor) => {
    setLoading(true);
    const payload = {
      id_gira: gira.id,
      tipo,
      valor_id: tipo === "ENSAMBLE" ? valor : null,
      valor_texto: tipo === "FAMILIA" ? valor : null,
    };
    const exists = sources.some(
      (s) =>
        s.tipo === payload.tipo &&
        (s.valor_id == payload.valor_id || s.valor_texto == payload.valor_texto)
    );
    if (exists) {
      setLoading(false);
      return alert("Ya agregado.");
    }
    const { error } = await supabase.from("giras_fuentes").insert(payload);
    if (!error) {
      setAddMode(null);
      loadAllData();
    }
  };

  const removeSource = async (id) => {
    if (!confirm("¿Quitar grupo?")) return;
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
      });
    if (!error) {
      setSearchTerm("");
      loadAllData();
    }
  };

  const toggleStatus = async (musician) => {
    const newStatus =
      musician.estado_gira === "confirmado" ? "ausente" : "confirmado";
    setRoster((prev) =>
      prev.map((m) =>
        m.id === musician.id ? { ...m, estado_gira: newStatus } : m
      )
    );
    const { error } = await supabase
      .from("giras_integrantes")
      .upsert(
        { id_gira: gira.id, id_integrante: musician.id, estado: newStatus },
        { onConflict: "id_gira, id_integrante" }
      );
    if (error) loadAllData();
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

  // --- LISTAS FILTRADAS PARA METRICAS ---
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
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {gira.nombre_gira}
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border">
                ID: {gira.id}
              </span>
            </h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {sources.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide"
                >
                  {s.tipo === "ENSAMBLE"
                    ? ensemblesList.find((e) => e.id === s.valor_id)
                        ?.ensamble || "Ensamble"
                    : s.valor_texto}
                  <button
                    onClick={() => removeSource(s.id)}
                    className="ml-1 hover:text-red-500"
                  >
                    <IconX size={12} />
                  </button>
                </span>
              ))}
              {sources.length === 0 && (
                <span className="text-xs text-slate-400 italic">
                  Sin grupos vinculados
                </span>
              )}
            </div>
          </div>
        </div>

        {/* METRICAS INTERACTIVAS */}
        <div className="flex gap-3 items-center">
          <div className="text-xs font-bold text-slate-400 uppercase mr-1">
            Resumen:
          </div>

          {/* Confirmados */}
          <div className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-100 cursor-default">
            {listaConfirmados.length} Confirmados
          </div>

          {/* Ausentes (Hover) */}
          <MetricBadge
            label="Ausentes"
            items={listaAusentes}
            colorBase="bg-red-50 text-red-700 border-red-100 hover:bg-red-100 hover:border-red-200"
          />

          {/* Adicionales (Hover) */}
          <MetricBadge
            label="Adicionales"
            items={listaAdicionales}
            colorBase="bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 hover:border-amber-200"
            icon={<span className="text-[10px] mr-1">+</span>}
          />

          <div className="text-xs text-slate-400 ml-1">
            Total: <b>{roster.length}</b>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 max-w-6xl mx-auto w-full gap-4">
        {/* TOOLBAR */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between z-20 overflow-visible">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase mr-2">
              Agregar:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() =>
                  setAddMode(addMode === "ensamble" ? null : "ensamble")
                }
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  addMode === "ensamble"
                    ? "bg-white shadow text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Ensamble
              </button>
              <button
                onClick={() =>
                  setAddMode(addMode === "familia" ? null : "familia")
                }
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  addMode === "familia"
                    ? "bg-white shadow text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Familia
              </button>
              <button
                onClick={() =>
                  setAddMode(addMode === "individual" ? null : "individual")
                }
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  addMode === "individual"
                    ? "bg-white shadow text-indigo-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Individual
              </button>
            </div>
          </div>

          <div className="flex-1 w-full flex justify-end">
            {addMode === "ensamble" && (
              <div className="flex gap-2 animate-in slide-in-from-left-2 w-full max-w-xs">
                <select
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                  value={selectedEnsemble}
                  onChange={(e) => setSelectedEnsemble(e.target.value)}
                >
                  <option value="">Seleccionar Ensamble...</option>
                  {ensemblesList.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.ensamble}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addSource("ENSAMBLE", selectedEnsemble)}
                  disabled={!selectedEnsemble}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  <IconPlus size={16} />
                </button>
              </div>
            )}
            {addMode === "familia" && (
              <div className="flex gap-2 animate-in slide-in-from-left-2 w-full max-w-xs">
                <select
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm outline-none"
                  value={selectedFamily}
                  onChange={(e) => setSelectedFamily(e.target.value)}
                >
                  <option value="">Seleccionar Familia...</option>
                  {familiesList.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addSource("FAMILIA", selectedFamily)}
                  disabled={!selectedFamily}
                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  <IconPlus size={16} />
                </button>
              </div>
            )}
            {addMode === "individual" && (
              <div className="relative w-full max-w-xs animate-in slide-in-from-left-2">
                <input
                  type="text"
                  placeholder="Buscar apellido..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full right-0 w-64 bg-white border border-slate-200 mt-1 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => addManualMusician(m.id)}
                        className="w-full text-left p-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0 group"
                      >
                        <div className="font-bold text-slate-700 group-hover:text-indigo-700">
                          {m.apellido}, {m.nombre}
                        </div>
                        <div className="text-xs text-slate-400">
                          {m.instrumentos?.instrumento}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TABLA */}
        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-sm relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center text-indigo-600">
              <IconLoader className="animate-spin" />
            </div>
          )}

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3 pl-4">Músico</th>
                <th className="p-3">Instrumento</th>
                <th className="p-3">Origen</th>
                <th className="p-3 text-center">Asistencia</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.map((musician) => {
                const isAbsent = musician.estado_gira === "ausente";
                return (
                  <tr
                    key={musician.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isAbsent ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="p-3 pl-4 font-medium text-slate-700">
                      {musician.apellido}, {musician.nombre}
                    </td>
                    <td className="p-3 text-slate-500">
                      {musician.instrumentos?.instrumento || "-"}
                    </td>
                    <td className="p-3">
                      {musician.es_adicional ? (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                          Adicional
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Grupo
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleStatus(musician)}
                        className={`w-24 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider transition-all ${
                          isAbsent
                            ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {isAbsent ? "Ausente" : "Presente"}
                      </button>
                    </td>
                    <td className="p-3 text-right pr-4">
                      {musician.es_adicional && (
                        <button
                          onClick={() => removeMemberManual(musician.id)}
                          className="text-slate-300 hover:text-red-500 p-1"
                          title="Eliminar adicional"
                        >
                          <IconTrash size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {roster.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="5"
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
