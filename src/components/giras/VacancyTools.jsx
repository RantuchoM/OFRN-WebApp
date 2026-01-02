import React, { useState, useEffect } from 'react';
import { IconUserPlus, IconExchange, IconLoader, IconCheck, IconX } from '../ui/Icons';
import SearchableSelect from '../ui/SearchableSelect'; 

// --- MODAL 1: CREAR VACANTE (PLACEHOLDER) ---
export const AddVacancyModal = ({ isOpen, onClose, giraId, supabase, onRefresh, localities, instruments }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        rol: '', // Se usa como "Apellido" visual (ej: "Oboe 2")
        genero: 'F', 
        id_localidad: '',
        id_instr: '' // NUEVO: Instrumento
    });

    const localityOptions = localities.map(l => ({ id: l.id, label: l.localidad }));
    // Mapeamos instrumentos para el select (asumiendo que instruments viene como [{id: 'oboe', instrumento: 'Oboe'}, ...])
    const instrumentOptions = instruments.map(i => ({ id: i.id, label: i.instrumento }));

    // Reiniciar form al abrir
    useEffect(() => {
        if(isOpen) setFormData({ rol: '', genero: 'F', id_localidad: '', id_instr: '' });
    }, [isOpen]);

    const handleCreate = async () => {
        if (!formData.rol || !formData.id_localidad) return alert("Rol y Localidad requeridos.");
        
        setLoading(true);
        try {
            const generatedId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
            const uniqueToken = Date.now().toString().slice(-6);

            // --- LÓGICA DE NOMBRADO MEJORADA ---
            // Usamos el nomenclador si existe, si no, un string vacío.
            const etiquetaGira = giraNomenclador ? `(${giraNomenclador})` : '';
            
            // Construimos el "Apellido" visual: "Oboe 2 (G-2024)"
            const apellidoCompuesto = `${formData.rol} ${etiquetaGira}`.trim();

            const { error: userError } = await supabase
                .from('integrantes')
                .insert([{
                    id: generatedId,
                    nombre: 'Vacante',
                    apellido: apellidoCompuesto, // <--- AQUÍ GUARDAMOS CON IDENTIFICADOR
                    es_simulacion: true,
                    genero: formData.genero,
                    id_localidad: formData.id_localidad,
                    id_instr: formData.id_instr || null,
                    dni: `SIM-${uniqueToken}`, 
                    mail: `vacante-${uniqueToken}@placeholder.system`
                }]);

            if (userError) throw userError;

            // 2. Asignarlo a la Gira
            const { error: linkError } = await supabase
                .from('giras_integrantes')
                .insert([{
                    id_gira: giraId,
                    id_integrante: newPlaceholder.id,
                    rol: 'musico', // Rol genérico en la gira
                    estado: 'confirmado' 
                }]);

            if (linkError) throw linkError;

            onRefresh();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al crear vacante: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-in zoom-in-95">
                <div className="p-4 border-b bg-amber-50 rounded-t-lg flex justify-between items-center">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                        <IconUserPlus size={18}/> Nueva Vacante
                    </h3>
                    <button onClick={onClose}><IconX/></button>
                </div>
                
                <div className="p-5 space-y-4">
                    <p className="text-xs text-slate-500 italic">
                        Crea un integrante simulado para reservar recursos logísticos.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">ETIQUETA / ROL *</label>
                        <input 
                            autoFocus
                            type="text" 
                            className="w-full border p-2 rounded text-sm focus:border-amber-500 outline-none"
                            placeholder="Ej: Oboe 2, Refuerzo..."
                            value={formData.rol}
                            onChange={e => setFormData({...formData, rol: e.target.value})}
                        />
                    </div>

                    {/* NUEVO: SELECTOR DE INSTRUMENTO */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">INSTRUMENTO (Opcional)</label>
                        <SearchableSelect 
                            options={instrumentOptions}
                            value={formData.id_instr}
                            onChange={v => setFormData({...formData, id_instr: v})}
                            placeholder="Seleccionar instrumento..."
                            className="text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">GÉNERO *</label>
                            <select 
                                className="w-full border p-2 rounded text-sm bg-white outline-none"
                                value={formData.genero}
                                onChange={e => setFormData({...formData, genero: e.target.value})}
                            >
                                <option value="F">Femenino</option>
                                <option value="M">Masculino</option>
                                <option value="-">No Binario</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">ORIGEN *</label>
                            <SearchableSelect 
                                options={localityOptions}
                                value={formData.id_localidad}
                                onChange={v => setFormData({...formData, id_localidad: v})}
                                placeholder="Ciudad..."
                                className="text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t flex justify-end gap-2 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded">Cancelar</button>
                    <button 
                        onClick={handleCreate} 
                        disabled={loading}
                        className="px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                        {loading ? <IconLoader className="animate-spin"/> : <IconCheck/>} Crear Vacante
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL 2: SWAP (ASIGNAR TITULAR) ---
// (Este se mantiene casi igual, solo aseguramos que importe SearchableSelect)
export const SwapVacancyModal = ({ isOpen, onClose, giraId, placeholder, supabase, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [selectedRealId, setSelectedRealId] = useState(null);

    useEffect(() => {
        if(isOpen) fetchCandidates();
    }, [isOpen]);

    const fetchCandidates = async () => {
        setSearching(true);
        // Filtramos para no mostrar vacantes en la lista de candidatos
        const { data } = await supabase
            .from('integrantes')
            .select('id, nombre, apellido, dni, instrumentos(instrumento)')
            .eq('es_simulacion', false)
            .order('apellido');
        
        const options = (data || []).map(p => ({
            id: p.id,
            label: `${p.apellido}, ${p.nombre}`,
            subLabel: p.dni || 'Sin DNI'
        }));
        setCandidates(options);
        setSearching(false);
    };

    const handleSwap = async () => {
        if (!selectedRealId) return;
        if (!confirm(`¿Confirmar asignación? \n\nToda la logística de "${placeholder.apellido}" será transferida.`)) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('materializar_reemplazo', {
                p_id_gira: giraId,
                p_id_placeholder: placeholder.id,
                p_id_real: parseInt(selectedRealId)
            });

            if (error) throw error;

            onClose();
            
            if (data && data.alerta_alojamiento) {
                alert(`⚠️ Músico asignado, PERO desalojado de la habitación por diferencia de género.\nRevisa el Rooming.`);
            } else {
                alert("✅ Asignación exitosa con transferencia de logística.");
            }
            onRefresh();

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !placeholder) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-in slide-in-from-bottom-10">
                <div className="p-4 border-b bg-indigo-600 text-white rounded-t-lg flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <IconExchange size={18} className="text-indigo-200"/> Asignar Titular
                    </h3>
                    <button onClick={onClose} className="hover:text-indigo-200"><IconX/></button>
                </div>
                <div className="p-6">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded mb-6 flex justify-between items-center">
                        <div>
                            <span className="text-[10px] font-bold text-amber-500 uppercase block">VACANTE A CUBRIR</span>
                            <span className="font-bold text-slate-700">{placeholder.apellido}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 block">CONFIGURACIÓN</span>
                            <span className="text-xs bg-white border px-2 py-1 rounded font-mono">
                                {placeholder.genero === 'F' ? 'Mujer' : 'Hombre'} • {placeholder.localidad_nombre || 'Sin Loc.'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">Seleccionar Músico Real</label>
                        {searching ? (
                            <div className="text-xs text-slate-400">Cargando padrón...</div>
                        ) : (
                            <SearchableSelect 
                                options={candidates}
                                value={selectedRealId}
                                onChange={setSelectedRealId}
                                placeholder="Buscar por apellido o DNI..."
                                className="h-10 text-base"
                            />
                        )}
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-3 bg-slate-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded text-sm">Cancelar</button>
                    <button onClick={handleSwap} disabled={loading || !selectedRealId} className="px-6 py-2 font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-md disabled:opacity-50 flex items-center gap-2 text-sm">
                        {loading ? <IconLoader className="animate-spin"/> : <IconExchange/>} Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};