// src/views/Giras/ProgramSeating.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { IconMusic, IconUsers, IconLoader, IconX, IconChevronDown, IconSearch, IconCheck, IconEye, IconEyeOff, IconEdit } from '../../components/ui/Icons';
import { useAuth } from '../../context/AuthContext'; 

// --- SUBCOMPONENTE: SELECTOR DE PARTICELLA ---
const ParticellaSelect = ({ options, value, onChange, placeholder = "-", disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const selectedOption = options.find(o => o.id === value);
    
    if (disabled) {
        return (
            <div className="w-full h-full min-h-[30px] px-1 py-1 text-xs border border-transparent rounded flex items-center justify-center text-slate-700 bg-slate-50/50">
                <span className="truncate block w-full text-[10px] text-center">
                    {selectedOption ? (selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento) : "-"}
                </span>
            </div>
        );
    }

    const filteredOptions = options.filter(o => 
        (o.nombre_archivo || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.instrumentos?.instrumento || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (id) => {
        onChange(id);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-full min-h-[28px] text-left px-1 py-0.5 text-xs border rounded transition-colors flex items-center justify-between gap-0.5 
                    ${value 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' 
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
            >
                <span className="truncate block w-full text-[10px]">
                    {selectedOption ? (selectedOption.nombre_archivo || selectedOption.instrumentos?.instrumento) : placeholder}
                </span>
                <IconChevronDown size={8} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} opacity-50`}/>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 w-48 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95">
                    <div className="p-1 border-b border-slate-50 bg-slate-50 sticky top-0">
                        <input 
                            type="text" 
                            autoFocus
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-indigo-400"
                            placeholder="Buscar..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        <button onClick={() => handleSelect(null)} className="w-full text-left px-2 py-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 rounded flex items-center gap-2 mb-1">
                            <IconX size={10}/> Quitar
                        </button>
                        {filteredOptions.map(opt => (
                            <button key={opt.id} onClick={() => handleSelect(opt.id)} className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-indigo-50 flex items-center justify-between group ${value === opt.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}>
                                <div className="truncate">
                                    <span className="block font-medium truncate">{opt.instrumentos?.instrumento}</span>
                                    <span className="text-[9px] text-slate-400 font-normal truncate">{opt.nombre_archivo}</span>
                                </div>
                                {value === opt.id && <IconCheck size={10} className="text-indigo-600 shrink-0"/>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function ProgramSeating({ supabase, program, onBack, repertoireBlocks = [] }) {
    const { isEditor } = useAuth(); 
    const [roster, setRoster] = useState([]);
    const [particellas, setParticellas] = useState([]);
    const [assignments, setAssignments] = useState({}); 
    
    // Estados para Seating Provisorio
    const [provisionalConfig, setProvisionalConfig] = useState({}); 
    const [provisionalData, setProvisionalData] = useState({}); 
    
    const [loading, setLoading] = useState(true);
    const [showNonMusicians, setShowNonMusicians] = useState(false);

    const saveTimeoutRef = useRef(null);

    // Lista consolidada de obras (Columnas)
    const obras = useMemo(() => {
        if (!repertoireBlocks || repertoireBlocks.length === 0) return [];
        return repertoireBlocks.flatMap(block => block.repertorio_obras.map(ro => {
            const comp = ro.obras.obras_compositores?.find(oc => oc.rol === 'compositor' || !oc.rol)?.compositores;
            const compName = comp?.apellido || 'Anónimo';
            const title = ro.obras.titulo || 'Obra';
            
            // Lógica para título corto (2 palabras máx)
            const shortTitle = title.split(/\s+/).slice(0, 2).join(' ');

            return {
                id: ro.id,
                obra_id: ro.obras.id,
                titulo: title,
                composer: compName,
                shortTitle: shortTitle,
                fullTitle: `${compName} - ${title}`,
            };
        }));
    }, [repertoireBlocks]);

    useEffect(() => {
        if (program?.id) fetchInitialData();
    }, [program.id, repertoireBlocks]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. OBRAS & PARTICELLAS & CONFIG PROVISORIA
            const workIds = [...new Set(obras.map(o => o.obra_id))];
            const repObraIds = [...new Set(obras.map(o => o.id))];

            let partsData = [];
            // Chunking para evitar error 400 en particellas
            const chunkArray = (arr, size) => {
                 const res = [];
                 for(let i=0; i<arr.length; i+=size) res.push(arr.slice(i, i+size));
                 return res;
            };

            if (workIds.length > 0) {
                 const chunks = chunkArray(workIds, 10);
                 for(const chunk of chunks) {
                     const { data } = await supabase.from('obras_particellas')
                        .select('id, id_obra, nombre_archivo, id_instrumento, instrumentos(id, instrumento)')
                        .in('id_obra', chunk);
                     if(data) partsData = [...partsData, ...data];
                 }
            }
            setParticellas(partsData);

            if(repObraIds.length > 0) {
                const { data: repData } = await supabase.from('repertorio_obras')
                    .select('id, usar_seating_provisorio, seating_provisorio')
                    .in('id', repObraIds);
                
                const provConfig = {};
                const provData = {};
                repData?.forEach(item => {
                    provConfig[item.id] = item.usar_seating_provisorio;
                    provData[item.id] = item.seating_provisorio || {};
                });
                setProvisionalConfig(provConfig);
                setProvisionalData(provData);
            }

            // 2. ROSTER (Actualizado desde DB)
            const { data: fuentesDB } = await supabase.from("giras_fuentes").select("*").eq("id_gira", program.id);
            const { data: overridesDB } = await supabase.from("giras_integrantes").select("id_integrante, estado, rol").eq("id_gira", program.id);
            
            const fuentes = fuentesDB || [];
            const overrides = overridesDB || [];
            
            const inclEnsemblesIds = fuentes.filter(f => f.tipo === 'ENSAMBLE').map(f => f.valor_id);
            const inclFamiliesIds = fuentes.filter(f => f.tipo === 'FAMILIA').map(f => f.valor_texto);
            const exclEnsemblesIds = fuentes.filter(f => f.tipo === 'EXCL_ENSAMBLE').map(f => f.valor_id);

            let candidateIds = new Set();
            if (inclEnsemblesIds.length > 0) {
                const { data } = await supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", inclEnsemblesIds);
                data?.forEach(r => candidateIds.add(r.id_integrante));
            }
            if (inclFamiliesIds.length > 0) {
                const { data } = await supabase.from("integrantes").select("id, instrumentos!inner(familia)").in("instrumentos.familia", inclFamiliesIds);
                data?.forEach(m => candidateIds.add(m.id));
            }
            overrides.forEach(o => candidateIds.add(o.id_integrante));

            let excludedIdsByEnsemble = new Set();
            if (exclEnsemblesIds.length > 0) {
                 const { data } = await supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", exclEnsemblesIds);
                 data?.forEach(r => excludedIdsByEnsemble.add(r.id_integrante));
            }

            let rosterData = [];
            const idsArray = Array.from(candidateIds);
            const chunkArrayIds = (arr, size) => {
                 const res = [];
                 for(let i=0; i<arr.length; i+=size) res.push(arr.slice(i, i+size));
                 return res;
            };

            if (idsArray.length > 0) {
                const chunks = chunkArrayIds(idsArray, 40);
                for (const chunk of chunks) {
                    const { data } = await supabase.from('integrantes')
                        .select('id, nombre, apellido, id_instr, fecha_alta, fecha_baja, instrumentos(id, instrumento)')
                        .in('id', chunk);
                    if (data) rosterData = [...rosterData, ...data];
                }
            }

            const overrideMap = new Map(overrides.map(o => [String(o.id_integrante), o]));
            
            const finalRoster = rosterData.map(m => {
                const mIdStr = String(m.id);
                const ov = overrideMap.get(mIdStr);
                const role = ov?.rol || 'musico';
                const status = ov?.estado || 'confirmado';

                if (ov) {
                    if (status === 'ausente') return null;
                    return { ...m, rol_gira: role };
                }

                if (excludedIdsByEnsemble.has(m.id)) return null;

                const giraStart = new Date(program.fecha_desde);
                const giraEnd = new Date(program.fecha_hasta);
                if (m.fecha_alta && new Date(m.fecha_alta) > giraStart) return null;
                if (m.fecha_baja && new Date(m.fecha_baja) < giraEnd) return null;

                return { ...m, rol_gira: role };
            }).filter(Boolean);

            finalRoster.sort((a, b) => {
                const instrIdA = a.id_instr || 9999;
                const instrIdB = b.id_instr || 9999;
                if (instrIdA !== instrIdB) return instrIdA - instrIdB;
                return (a.apellido || '').localeCompare(b.apellido || '');
            });

            setRoster(finalRoster);

            // 4. ASIGNACIONES
            const { data: assignData } = await supabase.from('seating_asignaciones').select('*').eq('id_programa', program.id);
            const assignMap = {};
            (assignData || []).forEach(row => {
                assignMap[row.id_particella] = row.id_musicos_asignados || [];
            });
            setAssignments(assignMap);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGICA UPDATES ---
    const handleAssignmentChange = async (musicianId, obraId, newParticellaId) => {
        if (!isEditor) return; 

        const partsOfThisWork = particellas.filter(p => p.id_obra === obraId).map(p => p.id);
        let oldParticellaId = null;
        for (const pId of partsOfThisWork) {
            if (assignments[pId]?.includes(musicianId)) {
                oldParticellaId = pId; break;
            }
        }
        if (oldParticellaId === newParticellaId) return;

        const nextAssignments = { ...assignments };
        if (oldParticellaId) nextAssignments[oldParticellaId] = (nextAssignments[oldParticellaId] || []).filter(id => id !== musicianId);
        if (newParticellaId) {
            const current = nextAssignments[newParticellaId] || [];
            if (!current.includes(musicianId)) nextAssignments[newParticellaId] = [...current, musicianId];
        }
        setAssignments(nextAssignments);

        const promises = [];
        if (oldParticellaId) {
            const newOccupantsOld = nextAssignments[oldParticellaId];
            if (newOccupantsOld.length === 0) promises.push(supabase.from('seating_asignaciones').delete().match({ id_programa: program.id, id_particella: oldParticellaId }));
            else promises.push(supabase.from('seating_asignaciones').update({ id_musicos_asignados: newOccupantsOld }).match({ id_programa: program.id, id_particella: oldParticellaId }));
        }
        if (newParticellaId) {
            const newOccupantsNew = nextAssignments[newParticellaId];
            promises.push(supabase.from('seating_asignaciones').upsert({ id_programa: program.id, id_particella: newParticellaId, id_musicos_asignados: newOccupantsNew, id_obra: obraId }, { onConflict: 'id_programa, id_particella' }));
        }
        await Promise.all(promises);
    };

    const handleProvisionalChange = (repObraId, musicianId, text) => {
        if (!isEditor) return; 

        setProvisionalData(prev => ({
            ...prev,
            [repObraId]: { ...(prev[repObraId] || {}), [musicianId]: text }
        }));

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            setProvisionalData(currentData => {
                const newDataForObra = { ...(currentData[repObraId] || {}), [musicianId]: text };
                supabase.from('repertorio_obras').update({ seating_provisorio: newDataForObra }).eq('id', repObraId).then(({ error }) => { if(error) console.error("Error saving provisional:", error); });
                return currentData; 
            });
        }, 1000);
    };

    const toggleProvisionalMode = async (repObraId) => {
        if (!isEditor) return;
        const newVal = !provisionalConfig[repObraId];
        setProvisionalConfig(prev => ({ ...prev, [repObraId]: newVal }));
        await supabase.from('repertorio_obras').update({ usar_seating_provisorio: newVal }).eq('id', repObraId);
    };

    const getAssignmentValue = (musicianId, obraId) => {
        const partsOfThisWork = particellas.filter(p => p.id_obra === obraId);
        for (const part of partsOfThisWork) {
            if (assignments[part.id]?.includes(musicianId)) return part.id;
        }
        return null;
    };

    const EXCLUDED_ROLES = ['staff', 'producción', 'produccion', 'chofer', 'archivo', 'utilero'];
    const musicians = roster.filter(m => m.id_instr && !EXCLUDED_ROLES.includes(m.rol_gira?.toLowerCase()));
    const nonMusicians = roster.filter(m => !m.id_instr || EXCLUDED_ROLES.includes(m.rol_gira?.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {loading && <div className="absolute inset-0 bg-white/80 z-30 flex items-center justify-center"><IconLoader className="animate-spin text-indigo-600" size={32}/></div>}
            
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><IconUsers className="text-indigo-600"/> Seating (Asignación)</h2>
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-indigo-600">← Volver</button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto pb-10">
                        <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                            <thead className="bg-slate-800 text-white font-bold sticky top-0 z-20 shadow-md">
                                <tr>
                                    <th className="p-2 w-56 sticky left-0 bg-slate-800 z-30 border-r border-slate-600 pl-4">Músico / Obra</th>
                                    {obras.map(obra => (
                                        <th key={obra.id} className="p-1 min-w-[100px] border-l border-slate-600 font-normal align-bottom">
                                            <div className="flex flex-col gap-1 items-center text-center group/header w-full">
                                                <div className="w-full cursor-help px-1" title={obra.fullTitle}>
                                                    <div className="text-[10px] font-bold uppercase text-slate-400 truncate">{obra.composer}</div>
                                                    <div className="text-[10px] font-medium text-white truncate">{obra.shortTitle}</div>
                                                </div>
                                                {isEditor && (
                                                    <button 
                                                        onClick={() => toggleProvisionalMode(obra.id)}
                                                        className={`px-1 py-0.5 rounded text-[8px] font-bold border transition-colors w-full ${provisionalConfig[obra.id] ? 'bg-amber-400 text-amber-900 border-amber-500' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'}`}
                                                        title="Modo: Particella / Texto"
                                                    >
                                                        {provisionalConfig[obra.id] ? 'TXT' : 'PART'}
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {musicians.map(musician => (
                                    <tr key={musician.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 z-10 pl-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 truncate text-sm">{musician.apellido}, {musician.nombre}</span>
                                                <span className="text-[10px] text-indigo-500 truncate font-semibold flex items-center gap-1">
                                                    {musician.instrumentos?.instrumento || 'S/D'}
                                                </span>
                                            </div>
                                        </td>
                                        {obras.map(obra => {
                                            const isProvisional = provisionalConfig[obra.id];
                                            const availableParts = particellas.filter(p => p.id_obra === obra.obra_id);

                                            return (
                                                <td key={`${musician.id}-${obra.id}`} className="p-1 border-l border-slate-100 relative min-w-[100px]">
                                                    {isProvisional ? (
                                                        <input 
                                                            type="text" 
                                                            placeholder={isEditor ? "Escribir..." : "-"} 
                                                            readOnly={!isEditor}
                                                            className={`w-full border rounded px-1 py-0.5 text-[10px] outline-none transition-colors 
                                                                ${isEditor 
                                                                    ? 'bg-amber-50/50 border-amber-200 text-amber-900 focus:bg-white focus:ring-1 focus:ring-amber-500 placeholder:text-amber-300' 
                                                                    : 'bg-transparent border-transparent text-slate-600'
                                                                }`}
                                                            value={provisionalData[obra.id]?.[musician.id] || ''}
                                                            onChange={(e) => handleProvisionalChange(obra.id, musician.id, e.target.value)}
                                                        />
                                                    ) : (
                                                        <>
                                                            {availableParts.length > 0 ? (
                                                                <ParticellaSelect 
                                                                    options={availableParts} 
                                                                    value={getAssignmentValue(musician.id, obra.obra_id)}
                                                                    onChange={(newPartId) => handleAssignmentChange(musician.id, obra.obra_id, newPartId)}
                                                                    disabled={!isEditor}
                                                                />
                                                            ) : (
                                                                <div className="text-center text-[10px] text-slate-300 italic border border-transparent py-0.5 select-none">-</div>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {musicians.length === 0 && (
                                    <tr><td colSpan={obras.length + 1} className="p-8 text-center text-slate-400 italic">No hay músicos en el roster.</td></tr>
                                )}
                            </tbody>
                        </table>

                        {nonMusicians.length > 0 && (
                            <div className="mt-8 border-t-2 border-slate-200 pt-4 px-4 pb-20">
                                <button 
                                    onClick={() => setShowNonMusicians(!showNonMusicians)} 
                                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg w-full justify-center"
                                >
                                    {showNonMusicians ? <IconEyeOff size={14}/> : <IconEye size={14}/>}
                                    {showNonMusicians ? 'Ocultar' : 'Ver'} {nonMusicians.length} integrantes adicionales (Staff / Sin Instrumento)
                                </button>
                                
                                {showNonMusicians && (
                                    <div className="mt-4 animate-in slide-in-from-top-4 fade-in">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <tbody className="divide-y divide-slate-100">
                                                {nonMusicians.map(m => (
                                                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-2 w-56 border-r border-slate-200 text-slate-500 pl-4">
                                                            <span className="font-bold">{m.apellido}, {m.nombre}</span>
                                                            <span className="text-[10px] text-slate-400 block">{m.rol_gira ? m.rol_gira.toUpperCase() : 'SIN ROL'}</span>
                                                        </td>
                                                        {obras.map(obra => (
                                                            <td key={`${m.id}-${obra.id}`} className="p-1 border-l border-slate-100 bg-slate-50/50">
                                                                <span className="text-[10px] text-slate-300 text-center block">-</span>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}