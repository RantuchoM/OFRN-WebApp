// src/views/Giras/EventDetailModal.jsx
import React, { useState, useEffect } from 'react';
// CORRECCIÓN: Usamos los nombres reales de tu librería (con prefijo Icon)
import { 
  IconX, 
  IconEdit, 
  IconSave, 
  IconExternalLink, 
  IconCalendar, 
  IconMapPin, 
  IconClock 
} from '../../components/ui/Icons'; 

const toLocalISOString = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset() * 60000; 
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function EventDetailModal({ event, isOpen, onClose, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id,
        title: event.title || '',
        start: toLocalISOString(event.start),
        end: toLocalISOString(event.end),
        location: event.location || '',
        programType: event.programType || 'Sinfónico',
        programLabel: event.programLabel || event.programName || 'Programa',
        giraId: event.giraId
      });
      setIsEditing(false);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        if (name === 'start') {
            const oldStart = new Date(prev.start).getTime();
            const oldEnd = new Date(prev.end).getTime();
            const duration = oldEnd - oldStart;
            const newStart = new Date(value).getTime();

            if (!isNaN(newStart) && !isNaN(duration)) {
                const newEnd = new Date(newStart + duration);
                return {
                    ...prev,
                    start: value,
                    end: toLocalISOString(newEnd)
                };
            }
        }
        return { ...prev, [name]: value };
    });
  };

  const handleSaveClick = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const getBadgeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('sinfón')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (t.includes('camerata')) return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
    if (t.includes('ensamble')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-slate-50 px-5 py-4 border-b flex justify-between items-start">
          <div className='flex-1 pr-4'>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getBadgeColor(event.programType)}`}>
              {event.programType}
            </span>
            
            {isEditing ? (
              <input 
                name="title" 
                value={formData.title} 
                onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))} 
                className="block w-full text-lg font-bold mt-2 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            ) : (
              <h2 className="text-lg font-bold mt-2 text-slate-900 leading-tight">{event.title}</h2>
            )}
            {!isEditing && event.subtitle && <p className="text-slate-500 text-sm mt-0.5">{event.subtitle}</p>}
          </div>
          <div className="flex gap-1">
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                <IconEdit size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition">
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Inicio</label>
                    <input 
                        type="datetime-local" 
                        name="start" 
                        value={formData.start} 
                        onChange={handleTimeChange} 
                        className="w-full border border-slate-300 p-2 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fin</label>
                    <input 
                        type="datetime-local" 
                        name="end" 
                        value={formData.end} 
                        onChange={handleTimeChange} 
                        className="w-full border border-slate-300 p-2 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ubicación</label>
                <input type="text" name="location" value={formData.location} onChange={(e) => setFormData(prev => ({...prev, location: e.target.value}))} className="w-full border border-slate-300 p-2 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-700">
                    <IconCalendar size={16} className="text-slate-400"/>
                    <span className="font-medium">
                        {new Date(event.start).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                    <IconClock size={16} className="text-slate-400"/>
                    <span>
                        {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(event.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hs
                    </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                    <IconMapPin size={16} className="text-slate-400"/>
                    <span>{event.location || "Ubicación a confirmar"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2">
                <a 
                   href={event.giraId ? `/programas/${event.giraId}` : '#'} 
                   onClick={(e) => { if(!event.giraId) e.preventDefault(); }}
                   className="flex items-center justify-center w-full py-2.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-bold transition-colors text-xs border border-indigo-200"
                >
                  <IconExternalLink size={14} className="mr-2"/>
                  {formData.programLabel || "Ver Programa"}
                </a>
              </div>
            </>
          )}
        </div>

        {/* FOOTER EDICIÓN */}
        {isEditing && (
          <div className="p-3 bg-slate-50 border-t flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">CANCELAR</button>
            <button onClick={handleSaveClick} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm text-xs font-bold transition-transform active:scale-95">
              <IconSave size={14}/> GUARDAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}