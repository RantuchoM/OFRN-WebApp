import React from 'react';
import { IconPlus, IconX, IconCheck } from '../../components/ui/Icons';
import EnsembleMultiSelect from '../../components/filters/EnsembleMultiSelect';

// Opciones de Género
const GENERO_OPCIONES = ["F", "M", "-"];

export default function MusicianForm({ formData, setFormData, onCancel, onSave, loading, isNew = false, catalogoInstrumentos, ensemblesList, musicianEnsembles, setMusicianEnsembles }) {
    return (
        <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-white ring-2 ring-indigo-500 border-indigo-500 z-10 relative'}`}>
            {isNew && <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2 border-b border-indigo-100 pb-2"><IconPlus size={18}/> Nuevo Integrante</h3>}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Fila 1: Datos Principales */}
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Apellido</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})}/></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Instrumento</label><select className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.id_instr} onChange={(e) => setFormData({...formData, id_instr: e.target.value})}><option value="">-- Sin Asignar --</option>{catalogoInstrumentos.map(inst => (<option key={inst.id} value={inst.id}>{inst.instrumento}</option>))}</select></div>
                
                {/* Fila 2: Identificación */}
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">DNI (Número)</label><input type="number" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.dni} onChange={(e) => setFormData({...formData, dni: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">CUIL</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.cuil} onChange={(e) => setFormData({...formData, cuil: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nacionalidad</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.nacionalidad} onChange={(e) => setFormData({...formData, nacionalidad: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Fecha Nacimiento</label><input type="date" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.fecha_nac} onChange={(e) => setFormData({...formData, fecha_nac: e.target.value})}/></div>

                {/* Fila 3: Contacto y Otros */}
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Teléfono</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Email</label><input type="email" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.mail} onChange={(e) => setFormData({...formData, mail: e.target.value})}/></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Género</label>
                    <select className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.genero} onChange={(e) => setFormData({...formData, genero: e.target.value})}>
                        <option value="">-- Seleccionar --</option>
                        {GENERO_OPCIONES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Alimentación</label><input type="text" className="w-full border border-slate-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={formData.alimentacion} onChange={(e) => setFormData({...formData, alimentacion: e.target.value})}/></div>
                
                {/* Fila 4: Ensambles */}
                <div className="md:col-span-4 border-t border-slate-100 pt-3 mt-1">
                    <EnsembleMultiSelect ensembles={ensemblesList} selectedEnsembleIds={musicianEnsembles} onChange={setMusicianEnsembles} />
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-indigo-100/50">
                <button onClick={onCancel} className="flex items-center gap-1 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium"><IconX size={16}/> Cancelar</button>
                <button onClick={onSave} disabled={loading} className="flex items-center gap-1 px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium shadow-sm"><IconCheck size={16}/> Guardar</button>
            </div>
        </div>
    );
}