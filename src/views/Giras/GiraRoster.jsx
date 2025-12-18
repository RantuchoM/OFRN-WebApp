// src/views/Giras/GiraRoster.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  IconUsers, IconPlus, IconX, IconTrash, IconLoader, IconSearch,
  IconAlertCircle, IconCheck, IconChevronDown, IconMusic, IconMail, IconSettingsWheel, IconMap
} from "../../components/ui/Icons";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import MusicianForm from "../Musicians/MusicianForm"; // Importación necesaria

// --- HELPERS DE UI ---
const sortRosterList = (list, criterion) => {
  return [...list].sort((a, b) => {
    if (a.estado_gira === 'ausente' && b.estado_gira !== 'ausente') return 1;
    if (a.estado_gira !== 'ausente' && b.estado_gira === 'ausente') return -1;

    switch (criterion) {
      case 'localidad': {
        const locA = a.localidades?.localidad || 'zzz';
        const locB = b.localidades?.localidad || 'zzz';
        return locA.localeCompare(locB) || (a.apellido || "").localeCompare(b.apellido || "");
      }
      case 'region': {
        const regA = a.localidades?.regiones?.region || 'zzz';
        const regB = b.localidades?.regiones?.region || 'zzz';
        if (regA !== regB) return regA.localeCompare(regB);
        const locA = a.localidades?.localidad || 'zzz';
        const locB = b.localidades?.localidad || 'zzz';
        return locA.localeCompare(locB) || (a.apellido || "").localeCompare(b.apellido || "");
      }
      case 'instrumento': {
        const instA = String(a.id_instr || '999');
        const instB = String(b.id_instr || '999');
        if (instA !== instB) return instA.localeCompare(instB);
        return (a.apellido || "").localeCompare(b.apellido || "");
      }
      case 'rol':
      default: {
        const rolesPrio = { director: 1, solista: 2, musico: 3, produccion: 4, staff: 5, chofer: 6 };
        const pA = rolesPrio[a.rol_gira || 'musico'] || 99;
        const pB = rolesPrio[b.rol_gira || 'musico'] || 99;
        if (pA !== pB) return pA - pB;
        return (a.apellido || "").localeCompare(b.apellido || "");
      }
    }
  });
};

const MetricBadge = ({ label, items, colorBase, icon }) => {
  const count = items.length;
  if (count === 0) return null;
  return (
    <div className="relative group cursor-help z-30">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${colorBase}`}>
        {icon}
        <span>{count} {label}</span>
      </div>
      <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50 overflow-hidden">
        <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
          Listado de {label}
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {items.map((m) => (
            <div key={m.id} className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded flex justify-between">
              <span>{m.apellido}, {m.nombre}</span>
              <span className="text-[10px] text-slate-400 ml-2 truncate max-w-[60px]">{m.instrumentos?.instrumento}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MultiSelectDropdown = ({ options, selected, onChange, label, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
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
      <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">{label}</label>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-2 bg-white border border-slate-300 rounded text-sm text-left">
        <span className={selected.size ? "text-indigo-700 font-medium" : "text-slate-400"}>
          {selected.size > 0 ? `${selected.size} seleccionados` : placeholder}
        </span>
        <IconChevronDown size={14} className="text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 max-h-48 overflow-y-auto p-1">
          {options.map((opt) => (
            <div key={opt.value} onClick={() => toggleOption(opt.value)} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded text-sm">
              <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.has(opt.value) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                {selected.has(opt.value) && <IconCheck size={10} className="text-white" />}
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
  const { roster: rawRoster, loading: hookLoading, sources, refreshRoster } = useGiraRoster(supabase, gira);

  const [localRoster, setLocalRoster] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);

  // UI States
  const [addMode, setAddMode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  const [sortBy, setSortBy] = useState('rol');
  const [visibleColumns, setVisibleColumns] = useState({
    telefono: false,
    mail: false,
    alimentacion: false,
    localidad: false
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef(null);

  // --- NUEVOS ESTADOS PARA CREACIÓN DETALLADA ---
  const [isCreatingDetailed, setIsCreatingDetailed] = useState(false);
  const [tempName, setTempName] = useState({ nombre: "", apellido: "" });

  // Dropdowns States
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [familiesList, setFamiliesList] = useState([]);
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());
  const [selectedExclEnsembles, setSelectedExclEnsembles] = useState(new Set());

  // Init UI Data
  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (rawRoster) {
        setLocalRoster(sortRosterList(rawRoster, sortBy));
    }
  }, [rawRoster, sortBy]);

  useEffect(() => {
      const inclEnsembles = new Set();
      const inclFamilies = new Set();
      const exclEnsembles = new Set();
      sources?.forEach((f) => {
        if (f.tipo === "ENSAMBLE") inclEnsembles.add(f.valor_id);
        if (f.tipo === "FAMILIA") inclFamilies.add(f.valor_texto);
        if (f.tipo === "EXCL_ENSAMBLE") exclEnsembles.add(f.valor_id);
      });
      setSelectedEnsembles(inclEnsembles);
      setSelectedFamilies(inclFamilies);
      setSelectedExclEnsembles(exclEnsembles);
  }, [sources]);

  useEffect(() => {
    if (addMode === "individual" && searchTerm.length > 0) {
        searchIndividual(searchTerm);
    } else {
        setSearchResults([]);
    }
  }, [searchTerm, addMode]);

  useEffect(() => {
      const handleClickOutside = (event) => {
        if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
          setShowColumnMenu(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDropdownData = async () => {
    const { data: ens } = await supabase.from("ensambles").select("id, ensamble");
    if (ens) setEnsemblesList(ens.map((e) => ({ value: e.id, label: e.ensamble })));
    const { data: inst } = await supabase.from("instrumentos").select("familia");
    if (inst) {
      const fams = [...new Set(inst.map((i) => i.familia).filter(Boolean))];
      setFamiliesList(fams.map((f) => ({ value: f, label: f })));
    }
  };

  const generateNumericId = () => Math.floor(10000000 + Math.random() * 90000000);

  // --- LOGICA DE CREACIÓN ---
  const handleOpenDetailedCreate = () => {
    const parts = searchTerm.trim().split(" ");
    setTempName({
      nombre: parts[0] || "",
      apellido: parts.slice(1).join(" ") || "",
    });
    setIsCreatingDetailed(true);
  };

  const handleDetailedSave = async (newMusician) => {
    try {
      const { error } = await supabase.from("giras_integrantes").insert([
        {
          id_gira: gira.id,
          id_integrante: newMusician.id,
          rol: "musico", // Rol predeterminado para adiciones manuales
          estado: "confirmado",
        },
      ]);
      if (error) throw error;
      
      setIsCreatingDetailed(false);
      setSearchTerm("");
      refreshRoster();
      alert("Invitado creado y añadido al roster.");
    } catch (error) {
      alert("Error al vincular: " + error.message);
    }
  };

  const changeRole = async (musician, newRole) => {
    setLocalRoster(prev => {
        const newList = prev.map(m => m.id === musician.id ? { ...m, rol_gira: newRole } : m);
        return sortRosterList(newList, sortBy);
    });
    await supabase.from("giras_integrantes").upsert(
      { id_gira: gira.id, id_integrante: musician.id, rol: newRole, estado: musician.estado_gira },
      { onConflict: "id_gira, id_integrante" }
    );
    refreshRoster();
  };

  const toggleStatus = async (musician) => {
    const newStatus = musician.estado_gira === "confirmado" ? "ausente" : "confirmado";
    setLocalRoster(prev => {
        const newList = prev.map(m => m.id === musician.id ? { ...m, estado_gira: newStatus } : m);
        return sortRosterList(newList, sortBy);
    });
    if (newStatus === "ausente") {
      await supabase.from("giras_integrantes").upsert(
        { id_gira: gira.id, id_integrante: musician.id, estado: newStatus, rol: musician.rol_gira },
        { onConflict: "id_gira, id_integrante" }
      );
    } else {
      if(musician.es_adicional) {
          await supabase.from("giras_integrantes").update({ estado: 'confirmado' }).eq("id_gira", gira.id).eq("id_integrante", musician.id);
      } else {
          await supabase.from("giras_integrantes").delete().eq("id_gira", gira.id).eq("id_integrante", musician.id);
      }
    }
    refreshRoster();
  };

  const handleUpdateGroups = async () => {
    setLoadingAction(true);
    await supabase.from("giras_fuentes").delete().eq("id_gira", gira.id);
    const inserts = [];
    selectedEnsembles.forEach((id) => inserts.push({ id_gira: gira.id, tipo: "ENSAMBLE", valor_id: id }));
    selectedFamilies.forEach((fam) => inserts.push({ id_gira: gira.id, tipo: "FAMILIA", valor_texto: fam }));
    selectedExclEnsembles.forEach((id) => inserts.push({ id_gira: gira.id, tipo: "EXCL_ENSAMBLE", valor_id: id }));
    if (inserts.length > 0) await supabase.from("giras_fuentes").insert(inserts);
    setAddMode(null);
    setLoadingAction(false);
    refreshRoster();
  };

  const removeSource = async (id, tipo) => {
    if (!confirm(tipo === "EXCL_ENSAMBLE" ? "¿Quitar exclusión?" : "¿Quitar fuente?")) return;
    setLoadingAction(true);
    await supabase.from("giras_fuentes").delete().eq("id", id);
    setLoadingAction(false);
    refreshRoster();
  };

  const addManualMusician = async (musicianId) => {
    const { error } = await supabase.from("giras_integrantes").insert({ id_gira: gira.id, id_integrante: musicianId, estado: "confirmado", rol: "musico" });
    if (!error) { 
        setSearchTerm(""); 
        refreshRoster();
    }
  };

  const removeMemberManual = async (id) => {
    if (!confirm("¿Eliminar registro manual?")) return;
    const { error } = await supabase.from("giras_integrantes").delete().eq("id_integrante", id).eq("id_gira", gira.id);
    if (!error) refreshRoster();
  };

  const searchIndividual = async (term) => {
    const cleanTerm = term.trim();
    let query = supabase.from("integrantes").select("id, nombre, apellido, instrumentos(instrumento)");
    if (cleanTerm.includes(" ")) {
        const parts = cleanTerm.split(" ");
        const first = parts[0];
        const second = parts.slice(1).join(" ");
        query = query.ilike('nombre', `%${first}%`).ilike('apellido', `%${second}%`);
    } else {
        query = query.or(`nombre.ilike.%${cleanTerm}%,apellido.ilike.%${cleanTerm}%`);
    }
    const { data } = await query.limit(5);
    const currentIds = new Set(localRoster.map((r) => r.id));
    setSearchResults(data ? data.filter((m) => !currentIds.has(m.id)) : []);
  };

  const copyMails = () => {
    const mails = localRoster.filter(m => m.estado_gira !== 'ausente' && m.mail).map(m => m.mail).join(', ');
    if (!mails) return alert("No hay correos.");
    navigator.clipboard.writeText(mails).then(() => alert("Correos copiados."));
  };

  const toggleColumn = (col) => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));

  const getRowClass = (m) => {
      if (m.estado_gira === 'ausente') return 'bg-red-50 text-red-800 opacity-60 grayscale-[50%]';
      const rol = m.rol_gira || 'musico';
      if (rol === 'director') return 'bg-indigo-50 border-l-4 border-l-indigo-500';
      if (rol === 'solista') return 'bg-fuchsia-50 border-l-4 border-l-fuchsia-500';
      if (['produccion', 'staff', 'chofer'].includes(rol)) return 'bg-slate-100 border-l-4 border-l-slate-400 text-slate-600';
      if (m.es_adicional) return 'bg-amber-50/60 border-l-4 border-l-amber-200';
      return 'bg-white border-l-4 border-l-transparent hover:bg-slate-50';
  };

  const listaAusentes = localRoster.filter((r) => r.estado_gira === "ausente");
  const listaAdicionales = localRoster.filter((r) => r.es_adicional);
  const listaConfirmados = localRoster.filter((r) => r.estado_gira === "confirmado");

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4 relative z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm flex items-center gap-1">← Volver</button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{gira.nombre_gira}</h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              {sources.map((s) => {
                const label = s.tipo === "ENSAMBLE" || s.tipo === "EXCL_ENSAMBLE" ? ensemblesList.find((e) => e.value === s.valor_id)?.label : s.valor_texto;
                const typeClass = s.tipo === "EXCL_ENSAMBLE" ? "bg-red-50 text-red-700 border-red-100" : "bg-indigo-50 text-indigo-700 border-indigo-100";
                return (
                  <span key={s.id} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${typeClass}`}>
                    {label}
                    <button onClick={() => removeSource(s.id, s.tipo)} className="ml-1 hover:text-black/70"><IconX size={12} /></button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <MetricBadge label="Confirmados" items={listaConfirmados} colorBase="bg-emerald-50 text-emerald-700 border-emerald-100" icon={<IconCheck size={14} />} />
          <MetricBadge label="Ausentes" items={listaAusentes} colorBase="bg-red-50 text-red-700 border-red-100" icon={<IconX size={14} />} />
          <MetricBadge label="Manuales" items={listaAdicionales} colorBase="bg-amber-50 text-amber-700 border-amber-100" icon={<span className="text-xs">+</span>} />
        </div>
      </div>

      {/* TOOLBAR SUPERIOR */}
      <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-4 z-40 relative">
        <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Ordenar:</span>
            <div className="flex bg-slate-100 p-0.5 rounded text-xs font-medium">
                {['rol', 'localidad', 'region', 'instrumento'].map(crit => (
                     <button key={crit} onClick={() => setSortBy(crit)} className={`px-2 py-1 rounded capitalize ${sortBy === crit ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>{crit}</button>
                ))}
            </div>
        </div>
        <div className="flex items-center gap-2">
             <button onClick={copyMails} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-bold transition-colors">
                <IconMail size={14}/> Copiar Mails
             </button>
             <div className="relative" ref={columnMenuRef}>
                <button onClick={() => setShowColumnMenu(!showColumnMenu)} className={`flex items-center gap-1 px-3 py-1.5 border rounded text-xs font-bold transition-all ${showColumnMenu ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                    <IconSettingsWheel size={14}/> Columnas
                </button>
                {showColumnMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2">
                        {Object.keys(visibleColumns).map(col => (
                            <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                <input type="checkbox" checked={visibleColumns[col]} onChange={() => toggleColumn(col)} className="rounded text-indigo-600" />
                                <span className="text-xs text-slate-700 capitalize">{col}</span>
                            </label>
                        ))}
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* TOOLBAR INFERIOR */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex gap-3 items-start overflow-visible z-20">
        <div className="flex bg-white border border-slate-200 p-1 rounded-lg shrink-0">
          <button onClick={() => setAddMode(addMode === "groups" ? null : "groups")} className={`px-3 py-1 rounded text-xs font-bold ${addMode === "groups" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"}`}>Grupos</button>
          <button onClick={() => setAddMode(addMode === "individual" ? null : "individual")} className={`px-3 py-1 rounded text-xs font-bold ${addMode === "individual" ? "bg-indigo-50 text-indigo-700" : "text-slate-500"}`}>Individual</button>
        </div>

        {addMode === "groups" && (
          <div className="flex gap-3 flex-wrap animate-in slide-in-from-left-2 items-start bg-white p-3 rounded border border-slate-200 shadow-sm">
            <div className="w-40"><MultiSelectDropdown label="Ensambles" placeholder="Seleccionar..." options={ensemblesList} selected={selectedEnsembles} onChange={setSelectedEnsembles} /></div>
            <div className="w-40"><MultiSelectDropdown label="Familias" placeholder="Seleccionar..." options={familiesList} selected={selectedFamilies} onChange={setSelectedFamilies} /></div>
            <div className="w-40"><MultiSelectDropdown label="EXCLUIR Ens." placeholder="Seleccionar..." options={ensemblesList} selected={selectedExclEnsembles} onChange={setSelectedExclEnsembles} /></div>
            <button onClick={handleUpdateGroups} disabled={loadingAction} className="mt-5 bg-indigo-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-indigo-700 shadow-sm disabled:opacity-50 h-[38px]">Actualizar</button>
          </div>
        )}

        {addMode === "individual" && (
          <div className="relative w-64 animate-in slide-in-from-left-2 mt-1">
            <input type="text" placeholder="Buscar nombre o apellido..." className="w-full border p-2 rounded text-sm outline-none bg-white shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <div className="absolute top-full left-0 w-full bg-white border mt-1 rounded shadow-xl z-50 max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((m) => (
                  <button key={m.id} onClick={() => addManualMusician(m.id)} className="w-full text-left p-2 hover:bg-slate-50 text-xs border-b">
                    <b>{m.apellido}, {m.nombre}</b> <span className="text-slate-400">({m.instrumentos?.instrumento})</span>
                  </button>
                ))
              ) : searchTerm.trim().length > 0 && (
                <button onClick={handleOpenDetailedCreate} className="w-full text-left p-3 bg-fuchsia-50 hover:bg-fuchsia-100 text-xs text-fuchsia-700 font-bold border-t border-fuchsia-200 flex items-center gap-2 transition-colors">
                  <IconPlus size={14} /> Crear "{searchTerm}" como Invitado
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-y-auto p-4 z-10">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3 pl-4 w-28">Rol</th>
                <th className="p-3">Músico</th>
                <th className="p-3">Instrumento</th>
                {visibleColumns.localidad && <th className="p-3">Ubicación</th>}
                {visibleColumns.telefono && <th className="p-3">Teléfono</th>}
                {visibleColumns.mail && <th className="p-3">Mail</th>}
                {visibleColumns.alimentacion && <th className="p-3">Alim.</th>}
                <th className="p-3 text-center w-16">Asist.</th>
                <th className="p-3 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {localRoster.map((m) => (
                <tr key={m.id} className={`transition-colors ${getRowClass(m)}`}>
                  <td className="p-3 pl-4">
                    <select className={`text-[11px] font-bold uppercase border-none bg-transparent outline-none cursor-pointer w-full ${["director", "solista"].includes(m.rol_gira) ? "text-indigo-900" : "text-slate-500"}`} value={m.rol_gira || "musico"} onChange={(e) => changeRole(m, e.target.value)}>
                      <option value="director">Director</option>
                      <option value="solista">Solista</option>
                      <option value="musico">Músico</option>
                      <option value="produccion">Producción</option>
                      <option value="staff">Staff</option>
                      <option value="chofer">Chofer</option>
                    </select>
                  </td>
                  <td className="p-3 font-medium text-slate-800">
                    <div className="flex flex-col leading-tight">
                        <span>{m.apellido}, {m.nombre}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">{m.instrumentos?.instrumento || "-"}</td>
                  {visibleColumns.localidad && (
                      <td className="p-3 text-xs text-slate-600">
                          {m.localidades ? (
                            <div>
                                <span className="font-semibold">{m.localidades.localidad}</span>
                                <span className="text-[10px] text-slate-400 block">{m.localidades.regiones?.region}</span>
                            </div>
                          ) : <span className="text-slate-300">-</span>}
                      </td>
                  )}
                  {visibleColumns.telefono && <td className="p-3 text-xs text-slate-600 truncate max-w-[120px]">{m.telefono || "-"}</td>}
                  {visibleColumns.mail && <td className="p-3 text-xs text-slate-600 truncate max-w-[150px]" title={m.mail}>{m.mail || "-"}</td>}
                  {visibleColumns.alimentacion && <td className="p-3 text-xs text-slate-600 truncate max-w-[100px]">{m.alimentacion || "-"}</td>}
                  <td className="p-3 text-center">
                    <button onClick={() => toggleStatus(m)} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all shadow-sm mx-auto ${m.estado_gira === "ausente" ? "bg-white text-red-600 border border-red-200 hover:bg-red-50" : "bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600"}`}>
                      {m.estado_gira === "ausente" ? "A" : "P"}
                    </button>
                  </td>
                  <td className="p-3 text-right pr-4">
                    {m.es_adicional && (
                      <button onClick={() => removeMemberManual(m.id)} className="text-slate-300 hover:text-red-500 p-1"><IconTrash size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {(localRoster.length === 0 && !hookLoading) && (
                <tr><td colSpan="10" className="p-12 text-center text-slate-400 italic">Lista vacía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DETALLADO DE MÚSICO --- */}
      {isCreatingDetailed && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 shadow-2xl" style={{ zIndex: 99999 }}>
          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200">
            <MusicianForm
              supabase={supabase}
              musician={{ 
                id: generateNumericId(), 
                nombre: tempName.nombre, 
                apellido: tempName.apellido, 
                condicion: "Invitado" 
              }}
              onSave={handleDetailedSave}
              onCancel={() => setIsCreatingDetailed(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}