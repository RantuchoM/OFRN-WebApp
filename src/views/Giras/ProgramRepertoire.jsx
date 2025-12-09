import React from 'react';
import { IconLoader } from '../../components/ui/Icons';
import RepertoireManager from '../../components/repertoire/RepertoireManager';

export default function ProgramRepertoire({ supabase, program, onBack }) {
    if (!program) return <div className="p-10 text-center"><IconLoader className="animate-spin text-indigo-600"/></div>;

    return (
        <div className="flex flex-col h-full bg-slate-100 animate-in fade-in">
            {/* Header de la Vista Completa */}
            <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-1">
                        <span>←</span> Volver
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{program.nombre_gira}</h2>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 border rounded text-slate-500 font-medium">{program.tipo}</span>
                    </div>
                </div>
            </div>

            {/* Contenido (Reutilizando el Manager) */}
            <div className="flex-1 overflow-y-auto p-4">
                <RepertoireManager 
                    supabase={supabase} 
                    programId={program.id} 
                />
            </div>
        </div>
    );
}