import React from 'react';
import { IconPlus, IconX, IconCheck } from '../../components/ui/Icons';
import LocationMultiSelect from '../../components/filters/LocationMultiSelect'; // IMPORTAR

export default function GiraForm({ 
    formData, 
    setFormData, 
    onCancel, 
    onSave, 
    loading, 
    isNew = false,
    locationsList = [], // Nueva prop
    selectedLocations = new Set(), // Nueva prop
    setSelectedLocations // Nueva prop
}) {
    return (
        <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative'}`}>
            {isNew && <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2 border-b border-indigo-100 pb-2"><IconPlus size={18}/> Nueva Gira</h3>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre de la Gira */}
                <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre de la Gira</label>
                    <input 
                        type="text" 
                        placeholder="Ej: Gira Patagónica 2025"
                        className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-lg" 
                        value={formData.nombre_gira} 
                        onChange={(e) => setFormData({...formData, nombre_gira: e.target.value})}
                    />
                </div>

                {/* Fechas */}
                <div className="md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Fecha Inicio</label>
                    <input 
                        type="date" 
                        className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
                        value={formData.fecha_desde} 
                        onChange={(e) => setFormData({...formData, fecha_desde: e.target.value})}
                    />
                </div>
                <div className="md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Fecha Fin</label>
                    <input 
                        type="date" 
                        className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" 
                        value={formData.fecha_hasta} 
                        onChange={(e) => setFormData({...formData, fecha_hasta: e.target.value})}
                    />
                </div>

                {/* SELECTOR DE LOCALIDADES (OCUPA TODO EL ANCHO) */}
                <div className="md:col-span-2 pt-2 border-t border-slate-100 mt-2">
                    <LocationMultiSelect 
                        locations={locationsList} 
                        selectedIds={selectedLocations} 
                        onChange={setSelectedLocations} 
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium"><IconX size={16}/> Cancelar</button>
                <button onClick={onSave} disabled={loading} className="flex items-center gap-1 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm"><IconCheck size={16}/> Guardar</button>
            </div>
        </div>
    );
}