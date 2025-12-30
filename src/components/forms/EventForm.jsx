import React, { useMemo } from 'react';
import { 
    IconLoader, IconX, IconCheck, IconEdit, IconTrash, IconCopy 
} from '../ui/Icons';
import DateInput from '../ui/DateInput';
import TimeInput from '../ui/TimeInput';
import SearchableSelect from '../ui/SearchableSelect';

export default function EventForm({ 
    formData, 
    setFormData, 
    onSave, 
    onClose, 
    onDelete,      // Nueva prop para eliminar
    onDuplicate,   // Nueva prop para duplicar
    loading, 
    eventTypes = [], 
    locations = [], 
    isNew = false 
}) {
    
    // 1. Preparamos las opciones para el Select de Ubicaciones
    const locationOptions = useMemo(() => {
        return locations.map(l => ({
            id: l.id,
            label: `${l.nombre} (${l.localidades?.localidad || l.localidad?.localidad || 'S/D'})`,
        }));
    }, [locations]);

    // Helper para actualizar campos simples
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* HEADER */}
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <IconEdit size={18}/> {isNew ? 'Nuevo Evento' : 'Editar Evento'}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                    <IconX size={20}/>
                </button>
            </div>

            {/* BODY */}
            <div className="p-5 space-y-5 overflow-y-auto">
                
                {/* Descripción */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descripción</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                        value={formData.descripcion || ''} 
                        onChange={e => handleChange('descripcion', e.target.value)} 
                        autoFocus 
                        placeholder="Ej: Ensayo General"
                    />
                </div>
                
                {/* Fecha y Tipo */}
                <div className="grid grid-cols-2 gap-4">
                    <DateInput 
                        label="Fecha*" 
                        value={formData.fecha || ''} 
                        onChange={val => handleChange('fecha', val)} 
                    />
                    
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Evento</label>
                        <div className="relative">
                            <select 
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white" 
                                value={formData.id_tipo_evento || ''} 
                                onChange={e => handleChange('id_tipo_evento', e.target.value)}
                            >
                                <option value="">-- Seleccionar --</option>
                                {eventTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Horarios */}
                <div className="grid grid-cols-2 gap-4">
                    <TimeInput 
                        label="Hora Inicio*" 
                        value={formData.hora_inicio || ''} 
                        onChange={val => handleChange('hora_inicio', val)} 
                    />
                    <TimeInput 
                        label="Hora Fin" 
                        value={formData.hora_fin || ''} 
                        onChange={val => handleChange('hora_fin', val)} 
                    />
                </div>

                {/* Ubicación con SearchableSelect */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ubicación / Sala</label>
                    <SearchableSelect 
                        options={locationOptions}
                        value={formData.id_locacion}
                        onChange={(val) => handleChange('id_locacion', val)}
                        placeholder="Buscar ubicación..."
                        className="w-full"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">
                        Escribe para buscar por nombre o ciudad.
                    </p>
                </div>
            </div>

            {/* FOOTER */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                {/* Acciones Secundarias (Eliminar / Duplicar) - Solo si NO es nuevo */}
                <div className="flex gap-2">
                    {!isNew && (
                        <>
                            {onDelete && (
                                <button 
                                    onClick={onDelete} 
                                    disabled={loading}
                                    className="p-2 text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                    title="Eliminar evento"
                                >
                                    <IconTrash size={16}/> <span className="hidden sm:inline">Eliminar</span>
                                </button>
                            )}
                            {onDuplicate && (
                                <button 
                                    onClick={onDuplicate} 
                                    disabled={loading}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                    title="Duplicar evento"
                                >
                                    <IconCopy size={16}/> <span className="hidden sm:inline">Duplicar</span>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Acciones Principales */}
                <div className="flex gap-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onSave} 
                        disabled={loading} 
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
                    >
                        {loading ? <IconLoader className="animate-spin"/> : <IconCheck size={18}/>} 
                        {isNew ? 'Crear' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}