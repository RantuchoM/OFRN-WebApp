import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './views/LoginView/LoginView';

import MusiciansView from './views/Musicians/MusiciansView';
import EnsemblesView from './views/Ensembles/EnsemblesView';
import GirasView from './views/Giras/GirasView';
import RepertoireView from './views/Repertoire/RepertoireView';
import LocationsView from './views/Locations/LocationsView';
import UsersManager from './views/Users/UsersManager';

import { supabase } from './services/supabase';
import { IconLogOut, IconUsers } from './components/ui/Icons';

// Componente para el contenido principal protegido
function AppContent() {
    const { user, loading, logout, isAdmin } = useAuth(); 
    
    const [activeTab, setActiveTab] = useState('giras');
    const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);

    // --- CORRECCIÓN CLAVE: ACEPTAR AMBOS NOMBRES DE ROL ---
    const userRole = user?.rol_sistema || '';
    const isPersonal = userRole === 'consulta_personal' || userRole === 'personal';

    useEffect(() => {
        const fetchInstrumentos = async () => {
            const { data } = await supabase.from('instrumentos').select('*').order('id');
            if (data) setCatalogoInstrumentos(data);
        };
        fetchInstrumentos();
    }, []);

    // 1. Cargando
    if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
    
    // 2. No Logueado -> Login
    if (!user) return <LoginView />;

    // 3. Logueado pero PENDIENTE -> Pantalla de Espera
    if (userRole === 'pendiente') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 p-8 text-center">
                <div className="bg-amber-100 p-4 rounded-full mb-4 text-amber-600">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Cuenta en Revisión</h2>
                <p className="max-w-md">Hola <b>{user.nombre} {user.apellido}</b>. Tu cuenta ha sido creada pero requiere aprobación de un administrador para acceder a los datos.</p>
                <button onClick={logout} className="mt-8 text-indigo-600 hover:underline text-sm">Cerrar Sesión</button>
            </div>
        );
    }

    // Definición de pestañas disponibles
    const allTabs = [
        { id: 'musicos', label: 'Músicos', icon: 'users' },
        { id: 'ensambles', label: 'Ensambles', icon: 'layers' },
        { id: 'giras', label: 'Giras', icon: 'map' },
        { id: 'repertorio', label: 'Repertorio', icon: 'music' },
        { id: 'lugares', label: 'Lugares', icon: 'building' },
    ];

    // --- FILTRADO DE PESTAÑAS ---
    // Si es personal, forzamos que solo vea 'giras' y que la tab activa sea 'giras'
    const visibleTabs = isPersonal 
        ? allTabs.filter(t => t.id === 'giras') 
        : allTabs;

    // Efecto de seguridad: si estoy en una tab prohibida, volver a giras
    useEffect(() => {
        if (isPersonal && activeTab !== 'giras') {
            setActiveTab('giras');
        }
    }, [isPersonal, activeTab]);

    // 4. Logueado y Autorizado -> App Completa
    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-50 print:hidden">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tight">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Orquesta Manager
                    </div>
                    
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg print:hidden">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                {tab.label}
                            </button>
                        ))}

                        {/* BOTÓN USUARIOS (SOLO ADMIN) */}
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('usuarios')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'usuarios' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                <IconUsers size={16}/> Usuarios
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
                    <div className="text-right hidden md:block leading-tight">
                        <div className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                            {user.nombre} {user.apellido}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                            {userRole.replace('_', ' ') || 'Invitado'}
                        </div>
                    </div>
                    <button 
                        onClick={logout} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 group"
                        title="Cerrar Sesión"
                    >
                         <IconLogOut size={18} className="group-hover:stroke-red-600"/>
                    </button>
                </div>
            </nav>

            <main className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 p-6 overflow-hidden">
                    {/* Renderizado Condicional Seguro */}
                    {activeTab === 'musicos' && !isPersonal && <MusiciansView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />}
                    {activeTab === 'ensambles' && !isPersonal && <EnsemblesView supabase={supabase} />}
                    
                    {/* Giras es visible para todos, pero GirasView ya filtra internamente el contenido */}
                    {activeTab === 'giras' && <GirasView supabase={supabase} />}
                    
                    {activeTab === 'repertorio' && !isPersonal && <RepertoireView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />}
                    {activeTab === 'lugares' && !isPersonal && <LocationsView supabase={supabase} />}
                    
                    {activeTab === 'usuarios' && isAdmin && <UsersManager supabase={supabase} />}
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}