import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    IconTruck, IconPlus, IconTrash, IconLoader, 
    IconCheck, IconSearch, IconBus, IconSettings, IconX 
} from '../../components/ui/Icons';
import DateInput from '../../components/ui/DateInput';
import TimeInput from '../../components/ui/TimeInput';

// --- IMPORTAMOS LOS COMPONENTES DE TRANSPORTE ---
import GirasTransportesManager from '../Giras/GirasTransportesManager';
import TransportRuleEditor from '../../components/logistics/TransportRuleEditor';

// --- HELPERS Y CONFIG ---
const CATEGORIA_OPTIONS = [
    { val: 'SOLISTAS', label: 'Solistas' },
    { val: 'DIRECTORES', label: 'Directores' },
    { val: 'PRODUCCION', label: 'Producción' },
    { val: 'LOCALES', label: 'Locales' },
    { val: 'NO_LOCALES', label: 'No Locales' },
];

const SERVICIOS_COMIDA = ["Desayuno", "Almuerzo", "Merienda", "Cena"];
const PROVEEDORES_COMIDA = ["-", "No lleva", "Hotel", "Colectivo", "Refrigerio", "Vianda"];

const getProviderColorClass = (provider) => {
    switch (provider) {
        case 'Hotel': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
        case 'Colectivo': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'Refrigerio': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
        case 'Vianda': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'No lleva': return 'bg-slate-100 text-slate-400 border-slate-200 line-through decoration-slate-400 opacity-70';
        case '-': return 'bg-white text-slate-300 border-slate-100';
        default: return 'bg-white text-slate-600 border-slate-200';
    }
};

const getSourceBadge = (type) => {
    const config = {
        'G': { color: 'bg-slate-100 text-slate-500 border-slate-200', title: 'General' },
        'R': { color: 'bg-blue-100 text-blue-600 border-blue-200', title: 'Región' },
        'L': { color: 'bg-cyan-100 text-cyan-600 border-cyan-200', title: 'Localidad' },
        'C': { color: 'bg-purple-100 text-purple-600 border-purple-200', title: 'Categoría' },
        'P': { color: 'bg-amber-100 text-amber-600 border-amber-200', title: 'Personal' },
        '-': { color: 'hidden', title: 'N/A' }
    }[type] || { color: 'hidden', title: '' };

    return <span className={`text-[9px] font-bold px-1 rounded border cursor-help ${config.color}`} title={config.title}>{type}</span>;
};

// --- COMPONENTE MULTI-SELECT (Sin cambios) ---
const MultiSelectCell = ({ options, selectedIds, onChange, placeholder = "Seleccionar..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 250),
                zIndex: 99999
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClick = (e) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.ms-portal-dropdown')) {
                setIsOpen(false);
            }
        };
        const handleScroll = () => { if(isOpen) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const toggleSelection = (val) => {
        const current = Array.isArray(selectedIds) ? selectedIds : [];
        const newSelection = current.includes(val) ? current.filter(id => id !== val) : [...current, val];
        onChange(newSelection);
    };

    const selectedOptions = options.filter(opt => (selectedIds || []).includes(opt.val));
    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

    const dropdownContent = (
        <div className="ms-portal-dropdown fixed bg-white border border-slate-300 shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100" style={dropdownStyle}>
            <div className="p-2 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                    <IconSearch size={14} className="absolute left-2 top-2 text-slate-400"/>
                    <input type="text" className="w-full pl-7 pr-2 py-1.5 text-xs border rounded outline-none focus:border-indigo-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
                </div>
            </div>
            <div className="overflow-y-auto max-h-60 p-1 space-y-0.5">
                {filteredOptions.map(opt => {
                    const isSelected = (selectedIds || []).includes(opt.val);
                    return (
                        <div key={opt.val} onClick={() => toggleSelection(opt.val)} className={`px-3 py-2 text-xs cursor-pointer rounded flex items-center gap-2 ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                            <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {isSelected && <IconCheck size={10} className="text-white"/>}
                            </div>
                            <span>{opt.label}</span>
                        </div>
                    );
                })}
                {filteredOptions.length === 0 && <div className="p-3 text-center text-xs text-slate-400">No hay resultados</div>}
            </div>
        </div>
    );

    return (
        <div className="relative w-full h-full min-h-[32px]" ref={containerRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full h-full min-h-[32px] px-2 py-1 bg-white cursor-pointer hover:bg-slate-50 flex flex-col justify-center gap-0.5 text-xs">
                {selectedOptions.length === 0 && <span className="text-slate-400 italic">{placeholder}</span>}
                {selectedOptions.map(opt => (
                    <div key={opt.val} className="flex items-center justify-between bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[10px] text-indigo-700 leading-tight">
                        <span className="truncate max-w-[140px]">{opt.label}</span>
                        <span className="text-indigo-400 text-[8px] ml-1">✕</span>
                    </div>
                ))}
            </div>
            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default function LogisticsManager({ supabase, gira, onBack }) {
    const [rules, setRules] = useState([]);
    const [roster, setRoster] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [savingRows, setSavingRows] = useState(new Set());
    const debounceRef = useRef({});
    const [tourLocalityIds, setTourLocalityIds] = useState(new Set());
    const [catalogs, setCatalogs] = useState({ musicians: [], locations: [], regions: [] });
    
    // ESTADOS PARA TRANSPORTE
    const [viewMode, setViewMode] = useState('RULES');
    const [editingTransportRule, setEditingTransportRule] = useState(null);

    useEffect(() => { fetchData(); }, [gira.id, viewMode]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: tourLocs } = await supabase.from('giras_localidades').select('id_localidad').eq('id_gira', gira.id);
            const locIds = new Set(tourLocs?.map(l => l.id_localidad) || []);
            setTourLocalityIds(locIds);

            // FETCH DE REGLAS CON DATOS DE TRANSPORTE ANIDADOS
            const { data: rulesData } = await supabase
                .from('giras_logistica_reglas')
                .select(`
                    *, 
                    integrantes(nombre, apellido), 
                    localidades(localidad), 
                    regiones(region),
                    giras_logistica_reglas_transportes (
                        id, 
                        orden,
                        giras_transportes (
                            detalle,
                            transportes ( nombre )
                        )
                    )
                `)
                .eq('id_gira', gira.id)
                .order('prioridad', { ascending: true }); 
            
            const normalizedRules = (rulesData || []).map(r => {
                let initialIds = [];
                if (r.target_ids && Array.isArray(r.target_ids) && r.target_ids.length > 0) {
                    initialIds = r.target_ids;
                } else {
                    const legacyId = r.id_integrante || r.id_localidad || r.id_region || r.instrumento_familia;
                    if (legacyId) initialIds = [legacyId];
                }

                // Procesar lista de nombres de transporte
                const transportsList = (r.giras_logistica_reglas_transportes || [])
                    .sort((a,b) => a.orden - b.orden)
                    .map(t => {
                        const nombre = t.giras_transportes?.transportes?.nombre || 'Vehículo';
                        const detalle = t.giras_transportes?.detalle;
                        return detalle ? `${nombre} (${detalle})` : nombre;
                    });

                return {
                    ...r,
                    alcance: r.alcance === 'Instrumento' ? 'Categoria' : r.alcance,
                    ref_values: initialIds,
                    transport_count: r.giras_logistica_reglas_transportes?.length || 0,
                    transport_names: transportsList // Array de strings con los nombres
                };
            });
            setRules(normalizedRules);

            const { data: mus } = await supabase.from('integrantes').select('id, nombre, apellido').order('apellido');
            const { data: loc } = await supabase.from('localidades').select('id, localidad').order('localidad');
            const { data: reg } = await supabase.from('regiones').select('id, region').order('region');
            
            setCatalogs({ musicians: mus || [], locations: loc || [], regions: reg || [] });
            await fetchRosterForLogistics(locIds);

        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const fetchRosterForLogistics = async (currentTourLocIds) => {
        // ... (Lógica de roster sin cambios)
        const { data: fuentes } = await supabase.from("giras_fuentes").select("*").eq("id_gira", gira.id);
        const { data: overrides } = await supabase.from("giras_integrantes").select("id_integrante, estado, rol").eq("id_gira", gira.id);
        
        const inclEnsembles = fuentes?.filter(f => f.tipo === 'ENSAMBLE').map(f => f.valor_id) || [];
        const inclFamilies = fuentes?.filter(f => f.tipo === 'FAMILIA').map(f => f.valor_texto) || [];
        const exclEnsembles = fuentes?.filter(f => f.tipo === 'EXCL_ENSAMBLE').map(f => f.valor_id) || [];

        let ids = new Set();
        if (inclEnsembles.length > 0) {
            const { data } = await supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", inclEnsembles);
            data?.forEach(r => ids.add(r.id_integrante));
        }
        if (inclFamilies.length > 0) {
            const { data } = await supabase.from("integrantes").select("id, instrumentos!inner(familia)").in("instrumentos.familia", inclFamilies);
            data?.forEach(m => ids.add(m.id));
        }
        overrides?.forEach(o => { if(o.estado !== 'ausente') ids.add(o.id_integrante); });

        let rosterData = [];
        if (ids.size > 0) {
            const { data } = await supabase.from('integrantes')
                .select('id, nombre, apellido, id_localidad, instrumentos(instrumento, familia), localidades(id, id_region)')
                .in('id', Array.from(ids));
            rosterData = data || [];
        }

        const overrideMap = new Map(overrides?.map(o => [o.id_integrante, o]));
        let excludedIds = new Set();
        if (exclEnsembles.length > 0) {
             const { data } = await supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", exclEnsembles);
             data?.forEach(r => excludedIds.add(r.id_integrante));
        }

        const finalRoster = rosterData.filter(m => {
            const ov = overrideMap.get(m.id);
            if (ov) return ov.estado !== 'ausente'; 
            if (excludedIds.has(m.id)) return false; 
            return true;
        }).map(m => {
            const ov = overrideMap.get(m.id);
            let role = ov?.rol || 'musico';
            if (!ov && m.instrumentos?.familia?.includes('Prod')) role = 'produccion';
            return { ...m, rol_gira: role, is_local: currentTourLocIds.has(m.id_localidad) };
        }).sort((a,b) => a.apellido.localeCompare(b.apellido));

        setRoster(finalRoster);
    };

    const logisticsSummary = useMemo(() => {
        if (!roster.length) return [];
        const getSourceCode = (scope) => {
            switch(scope) {
                case 'General': return 'G'; case 'Region': return 'R'; case 'Localidad': return 'L';
                case 'Categoria': return 'C'; case 'Instrumento': return 'C'; case 'Persona': return 'P'; default: return '-';
            }
        };

        return roster.map(person => {
            const applicableRules = rules.filter(r => {
                const scope = r.alcance === 'Instrumento' ? 'Categoria' : r.alcance;
                if (scope === 'General') return true;
                const targets = r.ref_values || [];
                
                if (scope === 'Persona' && targets.includes(person.id)) return true;
                if (scope === 'Localidad' && targets.includes(person.id_localidad)) return true;
                if (scope === 'Region' && person.localidades?.id_region && targets.includes(person.localidades.id_region)) return true;
                if (scope === 'Categoria') {
                    if (targets.includes('SOLISTAS') && person.rol_gira === 'solista') return true;
                    if (targets.includes('DIRECTORES') && person.rol_gira === 'director') return true;
                    if (targets.includes('PRODUCCION') && person.rol_gira === 'produccion') return true;
                    if (targets.includes('LOCALES') && person.is_local) return true;
                    if (targets.includes('NO_LOCALES') && !person.is_local) return true;
                }
                return false;
            });

            applicableRules.sort((a, b) => a.prioridad - b.prioridad);

            let final = { 
                checkin: null, checkin_src: '-', checkin_time: null, checkin_time_src: '-', 
                checkout: null, checkout_src: '-', checkout_time: null, checkout_time_src: '-',
                comida_inicio: null, comida_inicio_svc: null, comida_inicio_src: '-',
                comida_fin: null, comida_fin_svc: null, comida_fin_src: '-',
                prov_des: null, prov_alm: null, prov_mer: null, prov_cen: null, prov_src: '-',
                transports: [], transports_src: '-' // NUEVO CAMPO
            };

            applicableRules.forEach(r => {
                const src = getSourceCode(r.alcance === 'Instrumento' ? 'Categoria' : r.alcance);
                if (r.fecha_checkin) { final.checkin = r.fecha_checkin; final.checkin_src = src; }
                if (r.hora_checkin) { final.checkin_time = r.hora_checkin; final.checkin_time_src = src; }
                if (r.fecha_checkout) { final.checkout = r.fecha_checkout; final.checkout_src = src; }
                if (r.hora_checkout) { final.checkout_time = r.hora_checkout; final.checkout_time_src = src; }
                if (r.comida_inicio_fecha) { 
                    final.comida_inicio = r.comida_inicio_fecha; 
                    final.comida_inicio_svc = r.comida_inicio_servicio; 
                    final.comida_inicio_src = src; 
                }
                if (r.comida_fin_fecha) { 
                    final.comida_fin = r.comida_fin_fecha; 
                    final.comida_fin_svc = r.comida_fin_servicio; 
                    final.comida_fin_src = src; 
                }
                if (r.prov_desayuno || r.prov_almuerzo || r.prov_merienda || r.prov_cena) {
                    if(r.prov_desayuno) final.prov_des = r.prov_desayuno;
                    if(r.prov_almuerzo) final.prov_alm = r.prov_almuerzo;
                    if(r.prov_merienda) final.prov_mer = r.prov_merienda;
                    if(r.prov_cena) final.prov_cen = r.prov_cena;
                    final.prov_src = src;
                }
                // LOGICA DE TRANSPORTE: Si la regla tiene transportes, sobrescribe
                if (r.transport_names && r.transport_names.length > 0) {
                    final.transports = r.transport_names;
                    final.transports_src = src;
                }
            });
            return { ...person, logistics: final };
        });
    }, [roster, rules]);

    // ... (Funciones addEmptyRow, updateRuleInDb, handleRowChange, deleteRow, renderSelectionCell, ServiceSelect, ProviderSelect... SIN CAMBIOS)
    const addEmptyRow = async () => {
        setLoading(true);
        const newRowPayload = {
            id_gira: gira.id, alcance: 'General', prioridad: 0, target_ids: [],
            fecha_checkin: null, hora_checkin: null, fecha_checkout: null, hora_checkout: null,
            comida_inicio_fecha: null, comida_inicio_servicio: null, comida_fin_fecha: null, comida_fin_servicio: null,
            prov_desayuno: null, prov_almuerzo: null, prov_merienda: null, prov_cena: null
        };
        const { data, error } = await supabase.from('giras_logistica_reglas').insert([newRowPayload]).select().single();
        if (!error) {
            setRules(prev => [...prev, { ...data, alcance: 'General', ref_values: [], transport_count: 0, transport_names: [] }]);
        } else {
            alert("Error al crear: " + error.message);
        }
        setLoading(false);
    };

    const updateRuleInDb = async (row) => {
        setSavingRows(prev => new Set(prev).add(row.id));
        const payload = {
            alcance: row.alcance === 'Categoria' ? 'Instrumento' : row.alcance,
            prioridad: row.prioridad,
            target_ids: row.ref_values,
            // ... campos de transporte no se actualizan aquí directamente, eso lo hace el modal
            id_integrante: null, id_localidad: null, id_region: null, instrumento_familia: null,
            fecha_checkin: row.fecha_checkin || null, hora_checkin: row.hora_checkin || null,
            fecha_checkout: row.fecha_checkout || null, hora_checkout: row.hora_checkout || null,
            comida_inicio_fecha: row.comida_inicio_fecha || null,
            comida_inicio_servicio: row.comida_inicio_servicio || null,
            comida_fin_fecha: row.comida_fin_fecha || null,
            comida_fin_servicio: row.comida_fin_servicio || null,
            prov_desayuno: row.prov_desayuno || null,
            prov_almuerzo: row.prov_almuerzo || null,
            prov_merienda: row.prov_merienda || null,
            prov_cena: row.prov_cena || null,
        };
        await supabase.from('giras_logistica_reglas').update(payload).eq('id', row.id);
        setSavingRows(prev => { const next = new Set(prev); next.delete(row.id); return next; });
    };

    const handleRowChange = (index, field, value) => {
        let updatedRow = null;
        setRules(prev => {
            const newRules = [...prev];
            const row = { ...newRules[index] };
            row[field] = value;
            if (field === 'alcance') {
                row.ref_values = [];
                switch (value) {
                    case 'Persona': row.prioridad = 4; break;
                    case 'Categoria': row.prioridad = 3; break;
                    case 'Localidad': row.prioridad = 2; break;
                    case 'Region': row.prioridad = 1; break;
                    default: row.prioridad = 0; break;
                }
            }
            newRules[index] = row;
            updatedRow = row;
            return newRules;
        });
        if (updatedRow) {
            const rowId = updatedRow.id;
            if (debounceRef.current[rowId]) clearTimeout(debounceRef.current[rowId]);
            setSavingRows(prev => new Set(prev).add(rowId));
            debounceRef.current[rowId] = setTimeout(() => updateRuleInDb(updatedRow), 1000);
        }
    };

    const deleteRow = async (index) => {
        const row = rules[index];
        if (!confirm("¿Eliminar regla?")) return;
        setLoading(true);
        await supabase.from('giras_logistica_reglas').delete().eq('id', row.id);
        setRules(rules.filter((_, i) => i !== index));
        setLoading(false);
    };

    const renderSelectionCell = (row, index) => {
        if (row.alcance === 'General') return <div className="text-xs text-slate-400 italic px-2 py-2 flex items-center">Aplica a todos</div>;
        let options = [];
        if (row.alcance === 'Persona') options = catalogs.musicians.map(m => ({ val: m.id, label: `${m.apellido}, ${m.nombre}` }));
        else if (row.alcance === 'Localidad') options = catalogs.locations.map(l => ({ val: l.id, label: l.localidad }));
        else if (row.alcance === 'Region') options = catalogs.regions.map(r => ({ val: r.id, label: r.region }));
        else if (row.alcance === 'Categoria') options = CATEGORIA_OPTIONS;
        return <MultiSelectCell options={options} selectedIds={row.ref_values} onChange={(newIds) => handleRowChange(index, 'ref_values', newIds)} />;
    };

    const ServiceSelect = ({ value, onChange }) => (
        <select className="w-full text-[10px] bg-transparent outline-none border-none p-0.5 cursor-pointer hover:bg-slate-100 rounded" value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">--</option>
            {SERVICIOS_COMIDA.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
    );
    const ProviderSelect = ({ value, onChange }) => (
        <select className={`w-full text-[10px] bg-transparent outline-none border-none p-1 text-center cursor-pointer rounded ${getProviderColorClass(value)}`} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">-</option>
            {PROVEEDORES_COMIDA.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
    );
    const formatDate = (d) => d ? d.split('-').reverse().slice(0,2).join('/') : '-';
    const EmptyCellAlert = ({ val, children, className = "" }) => !val ? <div className={`w-full h-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-300 ${className}`}>-</div> : children;

    // --- RENDER PRINCIPAL ---
    if (viewMode === 'FLEET') {
        return (
            <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
                 <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex items-center gap-4">
                    <button onClick={() => setViewMode('RULES')} className="text-slate-400 hover:text-indigo-600 font-medium text-sm">← Volver a Reglas</button>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><IconSettings className="text-slate-600"/> Gestión de Flota y Transportes</h2>
                 </div>
                 <div className="flex-1 overflow-auto p-4">
                    <GirasTransportesManager supabase={supabase} giraId={gira.id}/>
                 </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 font-medium text-sm">← Volver</button>
                    <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><IconTruck className="text-indigo-600"/> Logística Unificada</h2></div>
                </div>
                
                <div className="flex items-center gap-3">
                     
                     {loading && <IconLoader className="animate-spin text-indigo-600"/>}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-8">
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">1. Definición de Reglas</h3>
                        <div className="text-[10px] text-slate-400 italic">Orden: General → Particular</div>
                    </div>
                    <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-x-auto pb-2">
                        <table className="w-full text-left text-sm border-collapse min-w-[1700px]">
                            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-300 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="border-r border-slate-300 px-2 py-2 w-32 shrink-0 bg-slate-100 sticky left-0 z-20">Criterio</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-64 shrink-0 bg-slate-100 sticky left-32 z-20 shadow-r">Selección</th>
                                    
                                    {/* COLUMNA TRANSPORTE */}
                                    <th className="border-r border-slate-300 px-2 py-2 w-48 bg-slate-200 text-slate-700 text-center">Transporte</th>

                                    <th className="border-r border-slate-300 px-2 py-2 w-32 bg-blue-50/50 text-blue-800 border-b-2 border-b-blue-200">Check-In Día</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-24 bg-blue-50/50 text-blue-800 border-b-2 border-b-blue-200">Hora</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-32 bg-amber-50/50 text-amber-800 border-b-2 border-b-amber-200">Check-Out Día</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-24 bg-amber-50/50 text-amber-800 border-b-2 border-b-amber-200">Hora</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-48 bg-emerald-50/50 text-emerald-800 border-b-2 border-b-emerald-200">Inicio Comidas</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-48 bg-red-50/50 text-red-800 border-b-2 border-b-red-200">Fin Comidas</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Desayuno</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Almuerzo</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Merienda</th>
                                    <th className="border-r border-slate-300 px-2 py-2 w-28 bg-slate-50/50 text-center">Cena</th>
                                    <th className="px-2 py-2 w-10 text-center sticky right-0 bg-slate-100 z-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {rules.map((row, index) => (
                                    <tr key={row.id} className="hover:bg-slate-50 group">
                                        <td className="border-r border-slate-200 p-0 bg-white sticky left-0 z-10"><select className="w-full h-full bg-transparent outline-none text-xs font-bold text-indigo-700 px-2 py-3 cursor-pointer" value={row.alcance} onChange={(e) => handleRowChange(index, 'alcance', e.target.value)}><option value="General">General</option><option value="Region">Región</option><option value="Localidad">Localidad</option><option value="Categoria">Categoría</option><option value="Persona">Persona</option></select></td>
                                        <td className="border-r border-slate-200 p-0 bg-white sticky left-32 z-10 shadow-lg shadow-black/5">{renderSelectionCell(row, index)}</td>
                                        
                                        {/* CELDA TRANSPORTE - LISTA VERTICAL */}
                                        <td className="border-r border-slate-200 p-1 text-center bg-slate-50/30 align-top">
                                            <div 
                                                onClick={() => setEditingTransportRule(row)}
                                                className="w-full h-full min-h-[30px] flex flex-col items-start gap-1 p-1 cursor-pointer hover:bg-slate-100/50 rounded"
                                            >
                                                {row.transport_names && row.transport_names.length > 0 ? (
                                                    row.transport_names.map((name, i) => (
                                                        <span key={i} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm w-full text-left truncate font-medium text-slate-700 flex items-center gap-1">
                                                            <IconBus size={8} className="text-slate-400"/> {name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[9px] text-slate-400 italic w-full text-center">+ Configurar</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="border-r border-slate-200 p-1"><DateInput value={row.fecha_checkin} onChange={(v) => handleRowChange(index, 'fecha_checkin', v)} /></td>
                                        <td className="border-r border-slate-200 p-1"><TimeInput value={row.hora_checkin} onChange={(v) => handleRowChange(index, 'hora_checkin', v)} /></td>
                                        <td className="border-r border-slate-200 p-1"><DateInput value={row.fecha_checkout} onChange={(v) => handleRowChange(index, 'fecha_checkout', v)} /></td>
                                        <td className="border-r border-slate-200 p-1"><TimeInput value={row.hora_checkout} onChange={(v) => handleRowChange(index, 'hora_checkout', v)} /></td>
                                        <td className="border-r border-slate-200 p-1"><div className="flex items-center gap-1 w-full"><div className="w-24 shrink-0"><DateInput value={row.comida_inicio_fecha} onChange={v => handleRowChange(index, 'comida_inicio_fecha', v)} /></div><div className="flex-1 min-w-[80px]"><ServiceSelect value={row.comida_inicio_servicio} onChange={v => handleRowChange(index, 'comida_inicio_servicio', v)} /></div></div></td>
                                        <td className="border-r border-slate-200 p-1"><div className="flex items-center gap-1 w-full"><div className="w-24 shrink-0"><DateInput value={row.comida_fin_fecha} onChange={v => handleRowChange(index, 'comida_fin_fecha', v)} /></div><div className="flex-1 min-w-[80px]"><ServiceSelect value={row.comida_fin_servicio} onChange={v => handleRowChange(index, 'comida_fin_servicio', v)} /></div></div></td>
                                        <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_desayuno} onChange={v => handleRowChange(index, 'prov_desayuno', v)} /></td>
                                        <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_almuerzo} onChange={v => handleRowChange(index, 'prov_almuerzo', v)} /></td>
                                        <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_merienda} onChange={v => handleRowChange(index, 'prov_merienda', v)} /></td>
                                        <td className="border-r border-slate-200 p-1"><ProviderSelect value={row.prov_cena} onChange={v => handleRowChange(index, 'prov_cena', v)} /></td>
                                        <td className="p-2 text-center sticky right-0 bg-white z-10 border-l border-slate-100">{savingRows.has(row.id) ? <div className="flex items-center justify-center"><IconLoader size={16} className="animate-spin text-indigo-500"/></div> : <button onClick={() => deleteRow(index)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><IconTrash size={16}/></button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={addEmptyRow} className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 border-t border-slate-200 transition-colors sticky left-0"><IconPlus size={14}/> Agregar Fila</button>
                    </div>
                </div>

                {/* 2. RESUMEN CALCULADO */}
                <div className="pb-10">
                    <div className="flex justify-between items-end mb-2">
                        <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">2. Resumen Calculado por Persona</h3>
                        <div className="flex gap-2 text-[9px] bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                            <span className="font-bold text-slate-400 uppercase mr-1">Fuente:</span>
                            {['G','R','L','C','P'].map(t => <div key={t} className="flex items-center gap-1">{getSourceBadge(t)}</div>)}
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[1400px]"> {/* Aumentado min-w para columna extra */}
                            <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3 w-64 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Apellido, Nombre</th>
                                    
                                    {/* NUEVA COLUMNA TRANSPORTE */}
                                    <th className="p-3 text-center border-r border-slate-100 w-48">Transporte Asignado</th>

                                    <th className="p-3 text-center bg-blue-50/30 border-r border-slate-100">Check-In</th>
                                    <th className="p-3 text-center bg-amber-50/30 border-r border-slate-200 border-r-2">Check-Out</th>
                                    <th className="p-3 text-center bg-emerald-50/30 border-r border-slate-100 w-40">Inicio Comidas</th>
                                    <th className="p-3 text-center bg-red-50/30 border-r border-slate-200 border-r-2 w-40">Fin Comidas</th>
                                    <th className="p-3 text-center w-64">Proveedores (D / A / M / C)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {logisticsSummary.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                                            <div className="font-bold">{item.apellido}, {item.nombre}</div>
                                            <div className="flex gap-1 mt-0.5">
                                                {item.is_local && <span className="text-[9px] text-orange-600 bg-orange-100 px-1 rounded border border-orange-200">LOCAL</span>}
                                                <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">{item.rol_gira !== 'musico' ? item.rol_gira.toUpperCase() : item.instrumentos?.instrumento}</span>
                                            </div>
                                        </td>

                                        {/* CELDA RESUMEN TRANSPORTE */}
                                        <td className="p-3 align-top border-r border-slate-100 bg-slate-50/10">
                                            <div className="flex flex-col gap-1 items-start min-h-[20px]">
                                                {item.logistics.transports && item.logistics.transports.length > 0 ? (
                                                    item.logistics.transports.map((t, idx) => (
                                                        <div key={idx} className="flex items-center gap-1.5 text-[10px] w-full">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></div>
                                                            <span className="font-medium text-slate-700">{t}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-300 text-[9px] italic mx-auto">-</span>
                                                )}
                                                {/* Badge de fuente si hay datos */}
                                                {item.logistics.transports && item.logistics.transports.length > 0 && (
                                                    <div className="mt-1 ml-auto scale-75 origin-right opacity-60">
                                                        {getSourceBadge(item.logistics.transports_src)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-3 text-center bg-blue-50/5 border-r border-slate-100">
                                            <EmptyCellAlert val={item.logistics.checkin}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-blue-700 font-bold">{formatDate(item.logistics.checkin)}</span>
                                                    {getSourceBadge(item.logistics.checkin_src)}
                                                    <span className="text-slate-400 font-normal ml-1 border-l border-slate-300 pl-2">{item.logistics.checkin_time?.slice(0,5)}</span>
                                                </div>
                                            </EmptyCellAlert>
                                        </td>
                                        <td className="p-3 text-center bg-amber-50/5 border-r border-slate-200 border-r-2">
                                            <EmptyCellAlert val={item.logistics.checkout}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-amber-700 font-bold">{formatDate(item.logistics.checkout)}</span>
                                                    {getSourceBadge(item.logistics.checkout_src)}
                                                    <span className="text-slate-400 font-normal ml-1 border-l border-slate-300 pl-2">{item.logistics.checkout_time?.slice(0,5)}</span>
                                                </div>
                                            </EmptyCellAlert>
                                        </td>
                                        <td className="p-3 text-center bg-emerald-50/5 border-r border-slate-100">
                                            <EmptyCellAlert val={item.logistics.comida_inicio}>
                                                <div className="flex flex-col items-center leading-tight">
                                                    <div className="flex gap-1 items-center">
                                                        <span className="font-bold text-emerald-800">{formatDate(item.logistics.comida_inicio)}</span>
                                                        {getSourceBadge(item.logistics.comida_inicio_src)}
                                                    </div>
                                                    <span className="text-[9px] uppercase text-emerald-600 font-bold">{item.logistics.comida_inicio_svc}</span>
                                                </div>
                                            </EmptyCellAlert>
                                        </td>
                                        <td className="p-3 text-center bg-red-50/5 border-r border-slate-200 border-r-2">
                                            <EmptyCellAlert val={item.logistics.comida_fin}>
                                                <div className="flex flex-col items-center leading-tight">
                                                    <div className="flex gap-1 items-center">
                                                        <span className="font-bold text-red-800">{formatDate(item.logistics.comida_fin)}</span>
                                                        {getSourceBadge(item.logistics.comida_fin_src)}
                                                    </div>
                                                    <span className="text-[9px] uppercase text-red-600 font-bold">{item.logistics.comida_fin_svc}</span>
                                                </div>
                                            </EmptyCellAlert>
                                        </td>
                                        <td className="p-2 text-[9px] align-middle">
                                            <div className="grid grid-cols-4 gap-1">
                                                <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_des)}`}>
                                                    <div className="font-bold opacity-50 text-[7px] mb-0.5">DES</div>{item.logistics.prov_des || '-'}
                                                </div>
                                                <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_alm)}`}>
                                                    <div className="font-bold opacity-50 text-[7px] mb-0.5">ALM</div>{item.logistics.prov_alm || '-'}
                                                </div>
                                                <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_mer)}`}>
                                                    <div className="font-bold opacity-50 text-[7px] mb-0.5">MER</div>{item.logistics.prov_mer || '-'}
                                                </div>
                                                <div className={`text-center border p-1 rounded ${getProviderColorClass(item.logistics.prov_cen)}`}>
                                                    <div className="font-bold opacity-50 text-[7px] mb-0.5">CEN</div>{item.logistics.prov_cen || '-'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* MODAL PARA EDITAR TRANSPORTE */}
            {editingTransportRule && createPortal(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-[100] animate-in fade-in">
                    <div className="animate-in zoom-in-95 duration-200">
                        <TransportRuleEditor 
                            supabase={supabase} 
                            ruleId={editingTransportRule.id} 
                            giraId={gira.id}
                            onClose={() => {
                                setEditingTransportRule(null);
                                fetchData(); // Recargar conteos al cerrar
                            }} 
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}