import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import MusiciansView from './views/Musicians/MusiciansView';
import EnsemblesView from './views/Ensembles/EnsemblesView';
import { IconDatabase, IconUsers, IconLayers } from './components/ui/Icons';

export default function App() {
    const [isConnected, setIsConnected] = useState(false);
    const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
    const [currentView, setCurrentView] = useState('musicians'); // 'musicians' | 'ensembles'

    useEffect(() => {
        const initApp = async () => {
            // Verificar conexión simple
            try {
                const { data, error } = await supabase.from('instrumentos').select('id, instrumento').order('instrumento');
                if (!error && data) {
                    setIsConnected(true);
                    setCatalogoInstrumentos(data);
                }
            } catch (err) {
                console.error("Error connecting to Supabase:", err);
            }
        };
        initApp();
    }, []);

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800">
            {/* NAVBAR SUPERIOR */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm shrink-0">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <IconDatabase size={28}/>
                            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Orquesta Manager</h1>
                        </div>
                        {/* PESTAÑAS DE NAVEGACIÓN */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setCurrentView('musicians')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === 'musicians' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <IconUsers size={16}/> Músicos
                            </button>
                            <button 
                                onClick={() => setCurrentView('ensembles')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentView === 'ensembles' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <IconLayers size={16}/> Ensambles
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Conectado
                            </span>
                        ) : ( <span className="text-xs text-slate-400">Conectando...</span> )}
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 overflow-hidden">
                <div className="max-w-6xl mx-auto px-4 py-6 h-full">
                    {isConnected && currentView === 'musicians' && (
                        <MusiciansView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />
                    )}
                    {isConnected && currentView === 'ensembles' && (
                        <EnsemblesView supabase={supabase} />
                    )}
                </div>
            </div>
        </div>
    );
}