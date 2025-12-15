import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    IconPlus, IconSearch, IconAlertCircle, IconEdit, IconX, 
    IconColumns, IconFilter, IconCheck, IconLoader, IconSortAsc, IconSortDesc,
    IconTrash 
} from '../../components/ui/Icons';
import InstrumentFilter from '../../components/filters/InstrumentFilter';
import MusicianForm from './MusicianForm';

// --- CONFIGURACIÓN ---
const CONDITION_OPTIONS = ['Estable', 'Contratado', 'Refuerzo', 'Invitado', 'Becario'];

const AVAILABLE_COLUMNS = [
    { key: 'instrumento', label: 'Instrumento', width: '130px', type: 'select', sortKey: 'instrumentos.instrumento' },
    { key: 'condicion', label: 'Condición', width: '110px', type: 'select', sortKey: 'condicion' },
    { key: 'ensambles', label: 'Ensambles Asignados', width: '200px', type: 'multiselect', sortKey: null },
    { key: 'localidad', label: 'Localidad', width: '130px', type: 'select', sortKey: 'localidades.localidad' },
    { key: 'telefono', label: 'Teléfono', width: '110px', type: 'text', sortKey: 'telefono' },
    { key: 'mail', label: 'Email', width: '180px', type: 'text', sortKey: 'mail' },
    { key: 'dni', label: 'DNI', width: '90px', type: 'text', sortKey: 'dni' },
    { key: 'cuil', label: 'CUIL', width: '110px', type: 'text', sortKey: 'cuil' },
    { key: 'fecha_nac', label: 'F. Nac', width: '90px', type: 'date', sortKey: 'fecha_nac' },
    { key: 'alimentacion', label: 'Dieta', width: '100px', type: 'text', sortKey: 'alimentacion' },
    { key: 'nacionalidad', label: 'Nacionalidad', width: '110px', type: 'text', sortKey: 'nacionalidad' },
];

// --- HELPER: RESOLVER PATH DE OBJETOS ---
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((o, i) => (o ? o[i] : null), obj);
};

// --- CELDA EDITABLE ---
const EditableCell = ({ value, rowId, field, type, options, onSave, className = "" }) => {
    const [localValue, setLocalValue] = useState(value || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setLocalValue(value || ""); }, [value]);

    const handleBlur = async () => {
        // Solo guardar si el valor cambió
        if (String(localValue) !== String(value || "")) {
            setIsSaving(true);
            await onSave(rowId, field, localValue);
            setIsSaving(false);
        }
    };

    const baseClass = `w-full h-full bg-transparent px-2 py-1.5 outline-none text-xs border border-transparent focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all rounded ${className}`;

    if (isSaving) return <div className="px-2 py-1"><IconLoader size={12} className="animate-spin text-indigo-500"/></div>;

    if (type === 'select') {
        return (
            <select 
                value={localValue} 
                onChange={(e) => setLocalValue(e.target.value)} 
                onBlur={handleBlur}
                className={`${baseClass} cursor-pointer appearance-none`}
            >
                <option value="">-</option>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        );
    }
    if (type === 'date') {
        return (
            <input 
                type="date" 
                value={localValue ? localValue.split('T')[0] : ""} 
                onChange={(e) => setLocalValue(e.target.value)} 
                onBlur={handleBlur}
                className={baseClass}
            />
        );
    }
    return <input type="text" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={handleBlur} className={baseClass} />;
};

// --- CELDA MULTI-SELECT PARA ENSAMBLES (PORTAL) ---
const EnsembleManagerCell = ({ musicianId, assignedEnsembles, allEnsembles, supabase, onRefresh }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX,
                width: '220px',
                zIndex: 99999
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClick = (e) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.ens-portal')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const toggleEnsemble = async (ensembleId) => {
        const isAssigned = assignedEnsembles.some(e => e.id === ensembleId);
        if (isAssigned) {
            await supabase.from('integrantes_ensambles').delete().match({ id_integrante: musicianId, id_ensamble: ensembleId });
        } else {
            await supabase.from('integrantes_ensambles').insert({ id_integrante: musicianId, id_ensamble: ensembleId });
        }
        onRefresh(); 
    };

    return (
        <div className="w-full h-full relative" ref={containerRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full h-full px-2 py-1 flex items-center flex-wrap gap-1 cursor-pointer hover:bg-slate-50 min-h-[30px]">
                {assignedEnsembles.length > 0 ? (
                    assignedEnsembles.map(e => (
                        <span key={e.id} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 truncate max-w-[100px]">{e.ensamble}</span>
                    ))
                ) : (
                    <span className="text-slate-300 text-[10px] italic">Sin asignar</span>
                )}
            </div>
            {isOpen && createPortal(
                <div className="ens-portal fixed bg-white border border-slate-300 shadow-xl rounded-lg p-1 animate-in fade-in zoom-in-95" style={dropdownStyle}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 border-b border-slate-100">Vincular Ensamble</div>
                    <div className="max-h-48 overflow-y-auto">
                        {allEnsembles.map(ens => {
                            const isAssigned = assignedEnsembles.some(e => e.id === ens.id);
                            return (
                                <div key={ens.id} onClick={() => toggleEnsemble(ens.id)} className={`flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs ${isAssigned ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-700'}`}>
                                    <div className={`w-3 h-3 border rounded flex items-center justify-center ${isAssigned ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                        {isAssigned && <IconCheck size={8} className="text-white"/>}
                                    </div>
                                    {ens.ensamble}
                                </div>
                            );
                        })}
                    </div>
                </div>, document.body
            )}
        </div>
    );
};

// --- SELECTOR DE COLUMNAS (PORTAL) ---
const ColumnSelector = ({ visibleCols, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const [dropdownStyle, setDropdownStyle] = useState({});

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const leftPos = Math.min(rect.left + window.scrollX, window.innerWidth - 210); 
            setDropdownStyle({
                top: rect.bottom + window.scrollY + 5,
                left: leftPos,
                width: '200px',
                zIndex: 99999
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClick = (e) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(e.target) && !e.target.closest('.col-portal')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const toggleCol = (key) => {
        const newSet = new Set(visibleCols);
        if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
        onChange(newSet);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-bold transition-colors ${isOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                <IconColumns size={16}/> Columnas
            </button>
            {isOpen && createPortal(
                <div className="col-portal fixed bg-white border border-slate-300 shadow-2xl rounded-lg z-[99999] p-2 animate-in fade-in zoom-in-95" style={dropdownStyle}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2 border-b border-slate-100 pb-1">Mostrar / Ocultar</div>
                    {AVAILABLE_COLUMNS.map(col => (
                        <div key={col.key} onClick={() => toggleCol(col.key)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs text-slate-700 select-none">
                            <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${visibleCols.has(col.key) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {visibleCols.has(col.key) && <IconCheck size={10} className="text-white"/>}
                            </div>
                            {col.label}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default function MusiciansView({ supabase, catalogoInstrumentos }) {
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // FILTROS Y ORDEN
    const [searchText, setSearchText] = useState("");
    const [selectedInstruments, setSelectedInstruments] = useState(new Set()); 
    const [conditionFilter, setConditionFilter] = useState(""); 
    const [sortConfig, setSortConfig] = useState({ key: 'apellido', direction: 'asc' }); 
    
    // UI
    const [visibleColumns, setVisibleColumns] = useState(new Set(['instrumento', 'condicion', 'ensambles', 'localidad', 'mail'])); 
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // DATA AUXILIAR
    const [ensemblesList, setEnsemblesList] = useState([]); 
    const [locationsList, setLocationsList] = useState([]);
    const [musicianEnsembles, setMusicianEnsembles] = useState(new Set()); 
    
    const [editFormData, setEditFormData] = useState({ 
        nombre: '', apellido: '', id_instr: '', genero: '', telefono: '', dni: '', mail: '',
        alimentacion: '', nacionalidad: '', cuil: '', fecha_nac: '', fecha_alta: '', fecha_baja: '', 
        email_google: '', id_localidad: '', condicion: 'Estable'
    });

    useEffect(() => {
        const allIds = new Set(catalogoInstrumentos.map(i => i.id));
        allIds.add('null');
        setSelectedInstruments(allIds);
        
        const init = async () => {
            await fetchLocations();
            await fetchEnsemblesAndData(allIds, ""); 
        };
        init();
    }, [catalogoInstrumentos]);

    // EFECTO DE BÚSQUEDA AUTOMÁTICA (DEBOUNCE)
    useEffect(() => {
        const timer = setTimeout(() => {
            // Solo refrescamos si ya tenemos datos cargados inicialmente
            if (ensemblesList.length > 0) {
                fetchEnsemblesAndData(selectedInstruments, conditionFilter);
            }
        }, 300); // 300ms de espera al escribir

        return () => clearTimeout(timer);
    }, [searchText]); // Se ejecuta al escribir en searchText

    const fetchLocations = async () => {
        const { data } = await supabase.from('localidades').select('id, localidad').order('localidad');
        if (data) setLocationsList(data);
    };

    const fetchEnsemblesAndData = async (instruments, cond) => {
        setLoading(true);
        setError(null);
        try {
            let currentEnsembles = ensemblesList;
            if (currentEnsembles.length === 0) {
                const { data: ens } = await supabase.from('ensambles').select('id, ensamble').order('ensamble');
                if (ens) {
                    setEnsemblesList(ens);
                    currentEnsembles = ens;
                }
            }

            let query = supabase.from('integrantes')
                .select('*, instrumentos(instrumento), localidades(localidad)')
                .order('apellido', { ascending: true });
            
            if (searchText.trim()) query = query.or(`nombre.ilike.%${searchText.trim()}%,apellido.ilike.%${searchText.trim()}%`);
            
            const instrumentArray = Array.from(instruments);
            const realIds = instrumentArray.filter(id => id !== 'null');
            const includeNull = instruments.has('null');
            
            if (realIds.length === 0 && !includeNull) { setResultados([]); setLoading(false); return; }
            
            let orConditions = [];
            if (realIds.length > 0) orConditions.push(`id_instr.in.(${realIds.join(',')})`);
            if (includeNull) orConditions.push(`id_instr.is.null`);
            if (orConditions.length > 0) query = query.or(orConditions.join(','));

            if (cond) query = query.eq('condicion', cond);
            
            const { data: musicians, error: musError } = await query;
            if (musError) throw musError;

            const { data: relations } = await supabase.from('integrantes_ensambles').select('id_integrante, id_ensamble');
            
            const mergedData = musicians.map(m => {
                const myRel = relations ? relations.filter(r => r.id_integrante === m.id) : [];
                const myEnsembles = myRel.map(r => {
                    const ens = currentEnsembles.find(e => e.id === r.id_ensamble);
                    return ens ? { id: ens.id, ensamble: ens.ensamble } : null;
                }).filter(Boolean);

                return { ...m, integrantes_ensambles: myEnsembles };
            });

            setResultados(mergedData);
        } catch (err) { setError("Error: " + err.message); } finally { setLoading(false); }
    };

    const refreshData = () => fetchEnsemblesAndData(selectedInstruments, conditionFilter);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedResultados = useMemo(() => {
        const sorted = [...resultados];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                const valA = getNestedValue(a, sortConfig.key) || '';
                const valB = getNestedValue(b, sortConfig.key) || '';
                if (typeof valA === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            });
        }
        return sorted;
    }, [resultados, sortConfig]);

    const handleSearch = (e) => { 
        e.preventDefault(); 
        // Ya no necesitamos llamar refreshData aquí porque el useEffect lo hace
    };

    const handleFilterChange = (newInstrSet, newCond) => {
        setSelectedInstruments(newInstrSet);
        setConditionFilter(newCond);
        fetchEnsemblesAndData(newInstrSet, newCond);
    };

    const handleInlineUpdate = async (id, field, value) => {
        try {
            let updatePayload = {};
            
            // CORRECCIÓN: Parseo seguro de IDs numéricos para evitar errores de BD
            if (field === 'instrumento') {
                const instrId = value && value !== "" ? value : null;
                updatePayload = { id_instr: instrId };
            }
            else if (field === 'localidad') {
                const locId = value && value !== "" ? parseInt(value, 10) : null;
                updatePayload = { id_localidad: locId };
            }
            else if (field === 'nombre' || field === 'apellido') {
                updatePayload = { [field]: value };
            }
            else {
                updatePayload = { [field]: value === "" ? null : value };
            }

            const { error } = await supabase.from('integrantes').update(updatePayload).eq('id', id);
            if (error) throw error;

            setResultados(prev => prev.map(p => {
                if (p.id === id) {
                    let nestedUpdates = {};
                    if (field === 'instrumento') {
                        // value viene como string del select, usamos == para comparar
                        const instrObj = catalogoInstrumentos.find(i => i.id == value);
                        nestedUpdates = { 
                            id_instr: value ? value : null, 
                            instrumentos: { instrumento: instrObj ? instrObj.instrumento : '' } 
                        };
                    }
                    if (field === 'localidad') {
                        const locObj = locationsList.find(l => l.id == value);
                        nestedUpdates = { 
                            id_localidad: value ? parseInt(value, 10) : null, 
                            localidades: { localidad: locObj ? locObj.localidad : '' } 
                        };
                    }
                    return { ...p, ...updatePayload, ...nestedUpdates };
                }
                return p;
            }));
        } catch (err) { alert("No se pudo guardar: " + err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Estás seguro de eliminar este integrante? Esta acción no se puede deshacer.")) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('integrantes').delete().eq('id', id);
            if (error) throw error;
            setResultados(prev => prev.filter(item => item.id !== id));
        } catch (err) { alert("Error al eliminar: " + err.message); } finally { setLoading(false); }
    };

    const instrumentOptions = catalogoInstrumentos.map(i => ({ value: i.id, label: i.instrumento }));
    const locationOptions = locationsList.map(l => ({ value: l.id, label: l.localidad }));
    const conditionOptions = CONDITION_OPTIONS.map(c => ({ value: c, label: c }));

    // Funciones del Modal (sin cambios lógicos)
    const prepareDataForSave = (formData) => { const data = { ...formData }; if (!data.id_instr) data.id_instr = null; if (!data.id_localidad) data.id_localidad = null; if (!data.fecha_nac) data.fecha_nac = null; if (data.dni) data.dni = parseInt(data.dni, 10); return data; };
    const updateEnsembleRelationsModal = async (musicianId, selectedIds) => { await supabase.from('integrantes_ensambles').delete().eq('id_integrante', musicianId); if (selectedIds.size > 0) { const inserts = Array.from(selectedIds).map(ensId => ({ id_integrante: musicianId, id_ensamble: parseInt(ensId, 10) })); await supabase.from('integrantes_ensambles').insert(inserts); } };
    const guardarEdicionModal = async (id) => { setLoading(true); try { const updateData = prepareDataForSave(editFormData); const { error } = await supabase.from('integrantes').update(updateData).eq('id', id); if (error) throw error; await updateEnsembleRelationsModal(id, musicianEnsembles); await refreshData(); setEditingId(null); } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); } };
    const crearIntegrante = async () => { setLoading(true); try { const newId = Math.floor(10000000 + Math.random() * 90000000); const insertData = { ...prepareDataForSave(editFormData), id: newId }; const { error } = await supabase.from('integrantes').insert([insertData]); if (error) throw error; await updateEnsembleRelationsModal(newId, musicianEnsembles); setIsAdding(false); setEditFormData({ nombre: '', apellido: '', id_instr: '', genero: '', telefono: '', dni: '', mail: '', alimentacion: '', nacionalidad: '', cuil: '', fecha_nac: '', fecha_alta: '', fecha_baja: '', email_google: '', id_localidad: '', condicion: 'Estable' }); setMusicianEnsembles(new Set()); await refreshData(); } catch (err) { alert("Error: " + err.message); } finally { setLoading(false); } };
    const startEditModal = async (item) => { setEditingId(item.id); setEditFormData({ nombre: item.nombre || '', apellido: item.apellido || '', id_instr: item.id_instr || '', genero: item.genero || '', telefono: item.telefono || '', dni: item.dni || '', mail: item.mail || '', alimentacion: item.alimentacion || '', nacionalidad: item.nacionalidad || '', cuil: item.cuil || '', fecha_nac: item.fecha_nac || '', fecha_alta: item.fecha_alta || '', fecha_baja: item.fecha_baja || '', email_google: item.email_google || '', id_localidad: item.id_localidad || '', condicion: item.condicion || 'Estable' }); const { data } = await supabase.from('integrantes_ensambles').select('id_ensamble').eq('id_integrante', item.id); if (data) { setMusicianEnsembles(new Set(data.map(r => r.id_ensamble))); } else { setMusicianEnsembles(new Set()); } };
    const startAdd = () => { setEditingId(null); setEditFormData({ nombre: '', apellido: '', id_instr: '', genero: '', telefono: '', dni: '', mail: '', alimentacion: '', nacionalidad: '', cuil: '', fecha_nac: '', fecha_alta: '', fecha_baja: '', email_google: '', id_localidad: '', condicion: 'Estable' }); setMusicianEnsembles(new Set()); setIsAdding(true); };
    
    return (
        <div className="space-y-4 h-full flex flex-col overflow-hidden animate-in fade-in">
            {/* BARRA SUPERIOR */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 shrink-0 flex flex-col md:flex-row gap-3 items-center">
                <form onSubmit={handleSearch} className="flex-1 w-full relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch size={16} /></div>
                    <input type="text" className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-300 rounded-lg hover:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Buscá por nombre o apellido..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                </form>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                    <div className="min-w-[150px]">
                        <InstrumentFilter catalogo={catalogoInstrumentos} selectedIds={selectedInstruments} onChange={(s) => handleFilterChange(s, conditionFilter)} />
                    </div>
                    <div className="relative group min-w-[140px]">
                        <select className="w-full appearance-none pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer" value={conditionFilter} onChange={(e) => handleFilterChange(selectedInstruments, e.target.value)}>
                            <option value="">Todas</option>
                            {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <IconFilter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▼</div>
                    </div>
                    <ColumnSelector visibleCols={visibleColumns} onChange={setVisibleColumns}/>
                    <button onClick={startAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-sm transition-colors flex-shrink-0" title="Agregar Integrante"><IconPlus size={20} /></button>
                </div>
            </div>

            {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><IconAlertCircle size={16}/>{error}</div>)}

            {/* TABLA DE RESULTADOS */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                            <tr>
                                <th className="p-2 w-10 text-center bg-slate-50 sticky left-0 z-20">#</th>
                                <th className="p-2 w-40 sticky left-10 bg-slate-50 border-r border-slate-200 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('apellido')}>
                                    <div className="flex items-center gap-1">Apellido {sortConfig.key === 'apellido' && (sortConfig.direction === 'asc' ? <IconSortAsc size={12}/> : <IconSortDesc size={12}/>)}</div>
                                </th>
                                <th className="p-2 w-40 border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('nombre')}>
                                    <div className="flex items-center gap-1">Nombre {sortConfig.key === 'nombre' && (sortConfig.direction === 'asc' ? <IconSortAsc size={12}/> : <IconSortDesc size={12}/>)}</div>
                                </th>
                                {AVAILABLE_COLUMNS.map(col => visibleColumns.has(col.key) && (
                                    <th key={col.key} className={`p-2 border-r border-slate-200 whitespace-nowrap ${col.sortKey ? 'cursor-pointer hover:bg-slate-100' : ''}`} style={{width: col.width}} onClick={() => col.sortKey && handleSort(col.sortKey)}>
                                        <div className="flex items-center gap-1">{col.label} {col.sortKey && sortConfig.key === col.sortKey && (sortConfig.direction === 'asc' ? <IconSortAsc size={12}/> : <IconSortDesc size={12}/>)}</div>
                                    </th>
                                ))}
                                <th className="p-2 text-right w-20 sticky right-0 bg-slate-50 z-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {loading && resultados.length === 0 ? (
                                <tr><td colSpan="100" className="p-10 text-center text-slate-400"><IconLoader className="animate-spin inline mr-2"/> Cargando datos...</td></tr>
                            ) : sortedResultados.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="p-1 text-center text-slate-400 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">{idx + 1}</td>
                                    
                                    <td className="p-0 sticky left-10 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200 font-bold">
                                        <EditableCell value={item.apellido} rowId={item.id} field="apellido" onSave={handleInlineUpdate} className="font-bold" />
                                    </td>
                                    <td className="p-0 border-r border-slate-200">
                                        <EditableCell value={item.nombre} rowId={item.id} field="nombre" onSave={handleInlineUpdate} />
                                    </td>

                                    {visibleColumns.has('instrumento') && (
                                        <td className="p-0 border-r border-slate-200">
                                            <EditableCell value={item.id_instr} rowId={item.id} field="instrumento" type="select" options={instrumentOptions} onSave={handleInlineUpdate} />
                                        </td>
                                    )}
                                    {visibleColumns.has('condicion') && (
                                        <td className="p-0 border-r border-slate-200">
                                            <EditableCell value={item.condicion} rowId={item.id} field="condicion" type="select" options={conditionOptions} onSave={handleInlineUpdate} />
                                        </td>
                                    )}
                                    {visibleColumns.has('ensambles') && (
                                        <td className="p-0 border-r border-slate-200 align-top">
                                            <EnsembleManagerCell 
                                                musicianId={item.id}
                                                assignedEnsembles={item.integrantes_ensambles || []}
                                                allEnsembles={ensemblesList}
                                                supabase={supabase}
                                                onRefresh={refreshData} 
                                            />
                                        </td>
                                    )}
                                    {visibleColumns.has('localidad') && (
                                        <td className="p-0 border-r border-slate-200">
                                            <EditableCell value={item.id_localidad} rowId={item.id} field="localidad" type="select" options={locationOptions} onSave={handleInlineUpdate} />
                                        </td>
                                    )}
                                    {visibleColumns.has('telefono') && <td className="p-0 border-r border-slate-200"><EditableCell value={item.telefono} rowId={item.id} field="telefono" onSave={handleInlineUpdate} /></td>}
                                    {visibleColumns.has('mail') && <td className="p-0 border-r border-slate-200"><EditableCell value={item.mail} rowId={item.id} field="mail" onSave={handleInlineUpdate} className="text-blue-600 truncate" /></td>}
                                    {visibleColumns.has('dni') && <td className="p-0 border-r border-slate-200"><EditableCell value={item.dni} rowId={item.id} field="dni" onSave={handleInlineUpdate} /></td>}
                                    {visibleColumns.has('cuil') && <td className="p-0 border-r border-slate-200"><EditableCell value={item.cuil} rowId={item.id} field="cuil" onSave={handleInlineUpdate} /></td>}
                                    {visibleColumns.has('fecha_nac') && <td className="p-0 border-r border-slate-200"><EditableCell value={item.fecha_nac} rowId={item.id} field="fecha_nac" type="date" onSave={handleInlineUpdate} /></td>}
                                    {visibleColumns.has('alimentacion') && <td className="p-0 border-r border-slate-200"><EditableCell value={item.alimentacion} rowId={item.id} field="alimentacion" onSave={handleInlineUpdate} /></td>}
                                    {visibleColumns.has('nacionalidad') && <td className="p-0 border-r border-slate-200"><EditableCell value={item.nacionalidad} rowId={item.id} field="nacionalidad" onSave={handleInlineUpdate} /></td>}

                                    <td className="p-1 text-center sticky right-0 bg-white group-hover:bg-slate-50 z-10 border-l border-slate-100 flex justify-end gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); startEditModal(item); }} className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Ver ficha completa">
                                            <IconEdit size={16}/>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                                            <IconTrash size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 p-2 text-[10px] text-slate-400 text-center">
                    {resultados.length} registros cargados • Haz clic en una celda para editar
                </div>
            </div>

            {/* MODAL DE EDICIÓN / ALTA */}
            {(isAdding || editingId) && createPortal(
                <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">{isAdding ? 'Nuevo Integrante' : 'Editar Integrante'}</h3>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600"><IconX size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <MusicianForm 
                                supabase={supabase}
                                musicianId={editingId}
                                formData={editFormData} 
                                setFormData={setEditFormData} 
                                onCancel={() => { setIsAdding(false); setEditingId(null); }} 
                                onSave={isAdding ? crearIntegrante : () => guardarEdicionModal(editingId)} 
                                loading={loading} 
                                isNew={isAdding} 
                                catalogoInstrumentos={catalogoInstrumentos} 
                                ensemblesList={ensemblesList} 
                                locationsList={locationsList} 
                                musicianEnsembles={musicianEnsembles} 
                                setMusicianEnsembles={setMusicianEnsembles} 
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}