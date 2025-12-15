// src/views/Giras/ProgramRepertoire.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { IconLoader, IconMusic, IconUsers } from '../../components/ui/Icons';
import RepertoireManager from '../../components/repertoire/RepertoireManager';
import ProgramSeating from '../Giras/ProgramSeating'; 

export default function ProgramRepertoire({ supabase, program, onBack }) {
    const [activeTab, setActiveTab] = useState('repertoire'); // 'repertoire' | 'seating'
    const [repertorios, setRepertorios] = useState(program.programas_repertorios || []); // Datos iniciales
    
    // Estado para forzar la recarga del Manager y obtener datos frescos
    const [repertoireKey, setRepertoireKey] = useState(0);

    if (!program) return <div className="p-10 text-center"><IconLoader className="animate-spin text-indigo-600"/></div>;

    // Lógica para actualizar los bloques de repertorio desde RepertoireManager
    const handleRepertoireUpdate = (newBlocks) => {
        setRepertorios(newBlocks);
        setRepertoireKey(prev => prev + 1); // Forzar re-render de Seating/Manager si es necesario
    };
    
    // Obtenemos los IDs de músicos confirmados de la GiraRoster o una versión ligera
    const rosterIds = useMemo(() => {
        // Esta función se mantiene ligera aquí. La lógica de filtrado pesado está en ProgramSeating.
        return [];
    }, [program]);

    const handleBack = () => {
        if (activeTab === 'seating') {
            setActiveTab('repertoire');
        } else {
            onBack();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 animate-in fade-in">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-1">
                        <span>←</span> {activeTab === 'seating' ? 'Volver al Repertorio' : 'Volver a Programas'}
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{program.nombre_gira}</h2>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 border rounded text-slate-500 font-medium">{program.tipo}</span>
                    </div>
                </div>
                
                {/* Selector de Vistas */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('repertoire')} 
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'repertoire' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <IconMusic size={16}/> Repertorio
                    </button>
                    <button 
                        onClick={() => setActiveTab('seating')} 
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'seating' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <IconUsers size={16}/> Seating
                    </button>
                    
                </div>
            </div>

            {/* Contenido (Reutilizando el Manager) */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'repertoire' && (
                    <div className="p-4">
                        <RepertoireManager 
                            supabase={supabase} 
                            programId={program.id} 
                            initialData={program.programas_repertorios} 
                            onUpdate={handleRepertoireUpdate} // Manejar la actualización del Manager
                        />
                    </div>
                )}
                
                {activeTab === 'seating' && (
                    <ProgramSeating
                        key={repertoireKey} // Forzar re-render si el repertorio cambió
                        supabase={supabase}
                        program={program}
                        repertoireBlocks={repertorios}
                        onBack={() => setActiveTab('repertoire')}
                    />
                )}
            </div>
        </div>
    );
}