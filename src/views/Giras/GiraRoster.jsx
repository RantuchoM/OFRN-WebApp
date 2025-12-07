import React, { useState, useEffect, useRef } from "react";
import { IconUsers, IconPlus, IconX, IconTrash, IconLoader, IconSearch, IconAlertCircle, IconCheck, IconChevronDown } from "../../components/ui/Icons";

// --- MULTI SELECT COMPONENT ---
const MultiSelectDropdown = ({ options, selected, onChange, label, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const toggleOption = (val) => {
        const newSet = new Set(selected);
        if (newSet.has(val)) newSet.delete(val); else newSet.add(val);
        onChange(newSet);
    };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">{label}</label>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-2 bg-white border border-slate-300 rounded text-sm text-left">
                <span className={selected.size ? "text-indigo-700 font-medium" : "text-slate-400"}>
                    {selected.size > 0 ? `${selected.size} seleccionados` : placeholder}
                </span>
                <IconChevronDown size={14} className="text-slate-400"/>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 max-h-48 overflow-y-auto p-1">
                    {options.map(opt => (
                        <div key={opt.value} onClick={() => toggleOption(opt.value)} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded text-sm">
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.has(opt.value) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {selected.has(opt.value) && <IconCheck size={10} className="text-white"/>}
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
    const [loading, setLoading] = useState(false);

    // Dropdowns Data
    const [ensemblesList, setEnsemblesList] = useState([]);
    const [familiesList, setFamiliesList] = useState([]);

    // Selection States (Tildados)
    const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
    const [selectedFamilies, setSelectedFamilies] = useState(new Set());
    
    // UI States
    const [addMode, setAddMode] = useState(null); 
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => { 
        fetchDropdownData(); 
        loadAllData(); 
    }, [gira.id]);
    
    useEffect(() => { if (addMode === "individual" && searchTerm.length > 2) searchIndividual(searchTerm); else setSearchResults([]); }, [searchTerm, addMode]);

    const fetchDropdownData = async () => {
        const { data: ens } = await supabase.from("ensambles").select("id, ensamble");
        if (ens) setEnsemblesList(ens.map(e => ({ value: e.id, label: e.ensamble })));
        
        const { data: inst } = await supabase.from("instrumentos").select("familia");
        if (inst) {
            const fams = [...new Set(inst.map(i => i.familia).filter(Boolean))];
            setFamiliesList(fams.map(f => ({ value: f, label: f })));
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        try {
            // 1. Fuentes (Grupos)
            const { data: fuentes } = await supabase.from("giras_fuentes").select("*").eq("id_gira", gira.id);
            
            // --- ACTUALIZAR ESTADO DE CHECKBOXES ---
            const currentEnsembles = new Set();
            const currentFamilies = new Set();
            fuentes?.forEach(f => {
                if (f.tipo === 'ENSAMBLE') currentEnsembles.add(f.valor_id);
                if (f.tipo === 'FAMILIA') currentFamilies.add(f.valor_texto);
            });
            setSelectedEnsembles(currentEnsembles);
            setSelectedFamilies(currentFamilies);
            // ----------------------------------------

            // 2. Excepciones (Manuales)
            const { data: overrides } = await supabase.from("giras_integrantes").select("id_integrante, estado").eq("id_gira", gira.id);
            const overrideMap = {}; overrides?.forEach((o) => (overrideMap[o.id_integrante] = o.estado));

            // 3. Calcular IDs
            const idsToFetch = new Set(); const dynamicIds = new Set();

            const ensambleIds = fuentes.filter((f) => f.tipo === "ENSAMBLE").map((f) => f.valor_id);
            if (ensambleIds.length > 0) {
                const { data: rels } = await supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", ensambleIds);
                rels?.forEach((r) => { idsToFetch.add(r.id_integrante); dynamicIds.add(r.id_integrante); });
            }

            const familiaNames = fuentes.filter((f) => f.tipo === "FAMILIA").map((f) => f.valor_texto);
            if (familiaNames.length > 0) {
                const { data: famMembers } = await supabase.from("integrantes").select("id, instrumentos!inner(familia)").in("instrumentos.familia", familiaNames);
                famMembers?.forEach((m) => { idsToFetch.add(m.id); dynamicIds.add(m.id); });
            }

            overrides?.forEach((o) => idsToFetch.add(o.id_integrante));

            if (idsToFetch.size === 0) { setRoster([]); setLoading(false); return; }

            const { data: musicians } = await supabase.from("integrantes").select("*, instrumentos(instrumento, familia)").in("id", Array.from(idsToFetch));

            const giraInicio = new Date(gira.fecha_desde); const giraFin = new Date(gira.fecha_hasta);
            const finalRoster = (musicians || []).filter((m) => {
                const esManual = overrideMap[m.id];
                if (esManual) return true; // Si está manual, siempre va (salvo que sea 'ausente', que se filtra en render)
                if (dynamicIds.has(m.id)) {
                    if (m.fecha_alta && new Date(m.fecha_alta) > giraInicio) return false;
                    if (m.fecha_baja && new Date(m.fecha_baja) < giraFin) return false;
                    return true;
                }
                return false;
            }).map((m) => ({ ...m, estado_gira: overrideMap[m.id] || "confirmado", es_adicional: !dynamicIds.has(m.id) })).sort((a, b) => (a.apellido || "").localeCompare(b.apellido || ""));

            setRoster(finalRoster);
        } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); }
    };

    // --- ACCIÓN DE SINCRONIZAR GRUPOS (ALTA/BAJA) ---
    const handleSyncGroups = async () => {
        setLoading(true);
        
        // 1. Borrar todas las fuentes actuales de esta gira (limpieza)
        await supabase.from("giras_fuentes").delete().eq("id_gira", gira.id);

        // 2. Insertar las nuevas selecciones
        const inserts = [];
        selectedEnsembles.forEach(id => inserts.push({ id_gira: gira.id, tipo: 'ENSAMBLE', valor_id: id }));
        selectedFamilies.forEach(fam => inserts.push({ id_gira: gira.id, tipo: 'FAMILIA', valor_texto: fam }));

        if (inserts.length > 0) {
            await supabase.from("giras_fuentes").insert(inserts);
        }

        setAddMode(null);
        loadAllData(); // Recargar roster calculado
    };

    const searchIndividual = async (term) => {
        const { data } = await supabase.from("integrantes").select("id, nombre, apellido, instrumentos(instrumento)").or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%`).limit(5);
        const currentIds = new Set(roster.map((r) => r.id));
        setSearchResults(data ? data.filter((m) => !currentIds.has(m.id)) : []);
    };

    const addManualMusician = async (musicianId) => {
        await supabase.from("giras_integrantes").insert({ id_gira: gira.id, id_integrante: musicianId, estado: "confirmado" });
        setSearchTerm("");
        loadAllData();
    };

    const toggleStatus = async (musician) => {
        const newStatus = musician.estado_gira === "confirmado" ? "ausente" : "confirmado";
        setRoster((prev) => prev.map((m) => m.id === musician.id ? { ...m, estado_gira: newStatus } : m));
        await supabase.from("giras_integrantes").upsert({ id_gira: gira.id, id_integrante: musician.id, estado: newStatus }, { onConflict: "id_gira, id_integrante" });
    };

    const removeMemberManual = async (id) => {
        if (!confirm("¿Eliminar registro manual?")) return;
        await supabase.from("giras_integrantes").delete().eq("id_integrante", id).eq("id_gira", gira.id);
        loadAllData();
    };

    const listaConfirmados = roster.filter((r) => r.estado_gira === "confirmado");

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm">← Volver</button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{gira.nombre_gira}</h2>
                        <div className="text-xs text-slate-500 mt-1">Gestión de Personal</div>
                    </div>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100 text-xs font-bold">{listaConfirmados.length} Confirmados</div>
            </div>

            {/* Toolbar */}
            <div className="p-4 bg-white border-b border-slate-100 flex gap-3 items-start overflow-visible z-20">
                <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                    <button onClick={() => setAddMode(addMode === 'groups' ? null : 'groups')} className={`px-3 py-1 rounded text-xs font-bold ${addMode === 'groups' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>Grupos</button>
                    <button onClick={() => setAddMode(addMode === 'individual' ? null : 'individual')} className={`px-3 py-1 rounded text-xs font-bold ${addMode === 'individual' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}>Individual</button>
                </div>

                {/* PANEL AGREGAR GRUPOS */}
                {addMode === 'groups' && (
                    <div className="flex gap-3 flex-1 animate-in slide-in-from-left-2 items-start bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="w-48"><MultiSelectDropdown label="Ensambles" placeholder="Seleccionar..." options={ensemblesList} selected={selectedEnsembles} onChange={setSelectedEnsembles} /></div>
                        <div className="w-48"><MultiSelectDropdown label="Familias" placeholder="Seleccionar..." options={familiesList} selected={selectedFamilies} onChange={setSelectedFamilies} /></div>
                        <button onClick={handleSyncGroups} disabled={loading} className="mt-5 bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm disabled:opacity-50">
                            Actualizar Lista
                        </button>
                    </div>
                )}

                {/* PANEL INDIVIDUAL */}
                {addMode === 'individual' && (
                    <div className="relative w-64 animate-in slide-in-from-left-2 mt-1">
                        <input type="text" placeholder="Buscar apellido..." className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border mt-1 rounded shadow-xl z-50 max-h-60 overflow-y-auto">
                                {searchResults.map((m) => (
                                    <button key={m.id} onClick={() => addManualMusician(m.id)} className="w-full text-left p-2 hover:bg-slate-50 text-xs border-b last:border-0">
                                        <b>{m.apellido}, {m.nombre}</b> <span className="text-slate-400">({m.instrumentos?.instrumento})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold sticky top-0">
                            <tr><th className="p-3 pl-4">Músico</th><th className="p-3">Instrumento</th><th className="p-3">Origen</th><th className="p-3 text-center">Asistencia</th><th className="p-3 text-right"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roster.map((m) => (
                                <tr key={m.id} className={`hover:bg-slate-50 ${m.estado_gira === 'ausente' ? 'bg-red-50/30' : ''}`}>
                                    <td className="p-3 pl-4 font-medium text-slate-700">{m.apellido}, {m.nombre}</td>
                                    <td className="p-3 text-slate-500">{m.instrumentos?.instrumento || "-"}</td>
                                    <td className="p-3"><span className={`text-[10px] px-1.5 py-0.5 rounded ${m.es_adicional ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'text-slate-400'}`}>{m.es_adicional ? 'Adicional' : 'Grupo'}</span></td>
                                    <td className="p-3 text-center"><button onClick={() => toggleStatus(m)} className={`w-24 py-1 rounded text-[10px] font-bold border uppercase ${m.estado_gira === 'ausente' ? 'bg-white text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{m.estado_gira === 'ausente' ? 'Ausente' : 'Presente'}</button></td>
                                    <td className="p-3 text-right">{m.es_adicional && <button onClick={() => removeMemberManual(m.id)} className="text-slate-300 hover:text-red-500"><IconTrash size={16}/></button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}