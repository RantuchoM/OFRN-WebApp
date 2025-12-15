// src/components/forms/EventForm.jsx

import React from 'react';
import { 
    IconLoader, IconX, IconCheck, IconEdit 
} from '../ui/Icons';
import DateInput from '../ui/DateInput';
import TimeInput from '../ui/TimeInput';

export default function EventForm({ 
    formData, setFormData, onSave, onClose, loading, eventTypes = [], locations = [], isNew = false 
}) {
    // Helper para manejar el cambio en el input de ubicación con búsqueda
    const handleLocationChange = (e) => {
        const inputValue = e.target.value;
        // Buscamos si el texto ingresado coincide con alguna opción del datalist
        const selectedLocation = locations.find(l => {
            const label = `${l.nombre} (${l.localidades?.localidad || l.localidad?.localidad || 'S/D'})`;
            return label === inputValue;
        });

        if (selectedLocation) {
            setFormData({...formData, id_locacion: selectedLocation.id});
        } else {
            // Si está borrando o escribiendo algo nuevo que no coincide, limpiamos el ID
            if (inputValue === '') {
                setFormData({...formData, id_locacion: ''});
            }
        }
    };

    // Obtenemos el valor actual para mostrar en el input (Nombre + Localidad)
    const currentLocation = locations.find(l => l.id == formData.id_locacion);
    const currentLocationLabel = currentLocation 
        ? `${currentLocation.nombre} (${currentLocation.localidades?.localidad || currentLocation.localidad?.localidad || 'S/D'})` 
        : '';

    return (
        <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <IconEdit size={18}/> {isNew ? 'Nuevo Evento' : 'Editar Evento'}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX/></button>
            </div>
            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                    <input type="text" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        value={formData.descripcion || ''} 
                        onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                        autoFocus 
                        placeholder="Ej: Ensayo General"/>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <DateInput label="Fecha*" 
                        value={formData.fecha || ''} 
                        onChange={val => setFormData({...formData, fecha: val})} 
                    />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                        <select className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={formData.id_tipo_evento || ''} 
                            onChange={e => setFormData({...formData, id_tipo_evento: e.target.value})}
                        >
                            <option value="">-- Seleccionar --</option>
                            {eventTypes.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>
                </div>

                {/* CAMPOS DE HORA INICIO Y FIN */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <TimeInput label="Hora Inicio*" 
                        value={formData.hora_inicio || ''} 
                        onChange={val => setFormData({...formData, hora_inicio: val})} 
                    />
                    <TimeInput label="Hora Fin" 
                        value={formData.hora_fin || ''} 
                        onChange={val => setFormData({...formData, hora_fin: val})} 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ubicación</label>
                    <input 
                        list="locations-list" 
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="Escriba para buscar..."
                        defaultValue={currentLocationLabel}
                        onChange={handleLocationChange}
                    />
                    <datalist id="locations-list">
                        {locations.map(l => (
                            <option key={l.id} value={`${l.nombre} (${l.localidades?.localidad || l.localidad?.localidad || 'S/D'})`} />
                        ))}
                    </datalist>
                </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
                <button onClick={onSave} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                    {loading ? <IconLoader className="animate-spin"/> : <IconCheck/>} Guardar
                </button>
            </div>
        </div>
    );
}