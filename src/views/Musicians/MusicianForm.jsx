import React, { useState, useEffect } from 'react';
import { IconPlus, IconX, IconCheck, IconCalendar, IconLoader, IconChevronDown } from '../../components/ui/Icons';
import EnsembleMultiSelect from '../../components/filters/EnsembleMultiSelect';
import DateInput from '../../components/ui/DateInput';

const GENERO_OPCIONES = ["F", "M", "-"];

export default function MusicianForm({ 
    supabase,
    musicianId,
    formData, 
    setFormData, 
    onCancel, 
    onSave, 
    loading, 
    isNew = false, 
    catalogoInstrumentos, 
    ensemblesList, 
    locationsList = [], // Recibimos las localidades
    musicianEnsembles, 
    setMusicianEnsembles 
}) {
    // ... (El código del historial se mantiene igual, no lo toco) ...
    // Solo mostramos el render del formulario

    return (
        <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative'}`}>
            {isNew && <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2 border-b border-indigo-100 pb-2"><IconPlus size={18}/> Nuevo Integrante</h3>}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Apellido</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})}/></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Instrumento</label><select className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.id_instr} onChange={(e) => setFormData({...formData, id_instr: e.target.value})}><option value="">-- Sin Asignar --</option>{catalogoInstrumentos.map(inst => (<option key={inst.id} value={inst.id}>{inst.instrumento}</option>))}</select></div>
                
                {/* CAMPO LOCALIDAD (NUEVO) */}
                <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Localidad de Residencia</label>
                    <select className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.id_localidad || ''} onChange={(e) => setFormData({...formData, id_localidad: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {locationsList.map(loc => <option key={loc.id} value={loc.id}>{loc.localidad}</option>)}
                    </select>
                </div>
                
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">DNI (Número)</label><input type="number" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">CUIL</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.cuil} onChange={(e) => setFormData({...formData, cuil: e.target.value})}/></div>
                
                <div className="md:col-span-1"><DateInput label="Fecha Nacimiento" value={formData.fecha_nac} onChange={(val) => setFormData({...formData, fecha_nac: val})} /></div>
                <div className="md:col-span-1"><div className="bg-emerald-50/50 p-1 rounded"><DateInput label="Fecha de Alta" value={formData.fecha_alta} onChange={(val) => setFormData({...formData, fecha_alta: val})} /></div></div>
                <div className="md:col-span-1"><div className="bg-red-50/50 p-1 rounded"><DateInput label="Fecha de Baja" value={formData.fecha_baja} onChange={(val) => setFormData({...formData, fecha_baja: val})} /></div></div>

                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Teléfono</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})}/></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Email Contacto</label><input type="email" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})}/></div>
                <div className="md:col-span-2 relative"><label className="text-[10px] uppercase font-bold text-indigo-500 mb-1 flex items-center gap-1">Email Google Calendar</label><input type="email" className="w-full border border-indigo-200 bg-indigo-50/30 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.email_google || ''} onChange={(e) => setFormData({...formData, email_google: e.target.value})}/></div>
                
                <div className="md:col-span-4 border-t border-slate-100 pt-3 mt-1">
                    <EnsembleMultiSelect ensembles={ensemblesList} selectedEnsembleIds={musicianEnsembles} onChange={setMusicianEnsembles} />
                </div>
            </div>

            {/* --- SECCIÓN HISTORIAL OMITIDA EN EL EJEMPLO PARA BREVEDAD (Pero debe estar) --- */}

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium"><IconX size={16}/> Cancelar</button>
                <button onClick={onSave} disabled={loading} className="flex items-center gap-1 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm"><IconCheck size={16}/> Guardar</button>
            </div>
        </div>
    );
}