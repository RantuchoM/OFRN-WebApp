import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './services/supabase';

// Vistas
import LoginView from './views/LoginView/LoginView';
import GirasView from './views/Giras/GirasView';
import EnsemblesView from './views/Ensembles/EnsemblesView';
import MusiciansView from './views/Musicians/MusiciansView';
import LocationsView from './views/Locations/LocationsView';
import RepertoireView from './views/Repertoire/RepertoireView';
import DataView from './views/Data/DataView';
import UsersManager from './views/Users/UsersManager';
import AgendaGeneral from './views/Giras/AgendaGeneral';
import LogisticsDashboard from './views/Giras/LogisticsDashboard';
import GlobalCommentsViewer from './components/comments/GlobalCommentsViewer';
import EnsembleCoordinatorView from './views/Ensembles/EnsembleCoordinatorView';
import MyPartsViewer from './views/Giras/MyPartsViewer';
import MealsAttendancePersonal from './views/Giras/MealsAttendancePersonal';
import PublicLinkHandler from './views/Public/PublicLinkHandler';

import { 
  IconLayoutDashboard, 
  IconTruck, 
  IconMusic, 
  IconUsers, 
  IconMapPin, 
  IconFileText, 
  IconDatabase, 
  IconSettings, 
  IconLogOut, 
  IconCalendar, 
  IconMessageCircle,
  IconMenu,
  IconX,
  IconCheck,
  IconUtensils,
  IconChevronLeft,
  IconChevronRight,
  IconList // Usado para Coordinación
} from './components/ui/Icons';

// --- MODAL CALENDARIO ---
const CalendarSelectionModal = ({ isOpen, onClose, userId }) => {
  if (!isOpen || !userId) return null;
  const BASE_URL = "https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/calendar-export";

  const handleCopy = (mode) => {
    let link = `${BASE_URL}?uid=${userId}`;
    if (mode === 'essential') link += '&mode=essential';

    navigator.clipboard.writeText(link).then(() => {
        alert(`🔗 ¡Enlace copiado!\n\nModo: ${mode === 'essential' ? 'Solo Ensayos y Conciertos' : 'Agenda Completa'}\n\nPégalo en Google Calendar > Agregar > Desde URL.`);
        onClose();
    }).catch(() => {
        prompt("Copia este enlace manualmente:", link);
        onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <IconCalendar size={18} className="text-indigo-600"/> 
                    Sincronizar Calendario
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconX size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 mb-2">Elige qué eventos quieres ver en tu calendario personal:</p>
                <button onClick={() => handleCopy('essential')} className="w-full text-left p-4 rounded-lg border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-colors group">
                    <div className="font-bold text-indigo-700 mb-1 flex items-center gap-2"><IconMusic size={16}/> Solo Musical</div>
                    <p className="text-xs text-indigo-600/80">Únicamente Ensayos y Conciertos.</p>
                </button>
                <button onClick={() => handleCopy('full')} className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <div className="font-bold text-slate-700 mb-1 flex items-center gap-2"><IconLayoutDashboard size={16}/> Agenda Completa</div>
                    <p className="text-xs text-slate-500">Incluye logística, viajes y comidas.</p>
                </button>
            </div>
        </div>
    </div>
  );
};

// --- APP PROTEGIDA ---
const ProtectedApp = () => {
  const { user, signOut } = useAuth();
  
  // Estados de UI
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Estados de Lógica / Permisos
  const [isEnsembleCoordinator, setIsEnsembleCoordinator] = useState(false);
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);

  // Roles
  const userRole = user?.rol_sistema || "";
  // Roles de "Gestión" pura
  const isManagement = ['admin', 'editor', 'coord_general'].includes(userRole);
  const isDirector = userRole === 'director';
  // Roles "Personales"
  const isPersonal = ['musico', 'archivista', 'personal', 'consulta_personal'].includes(userRole);

  // Estado principal de navegación
  const [mode, setMode] = useState(isPersonal ? 'FULL_AGENDA' : 'DASHBOARD');
  const [activeGiraId, setActiveGiraId] = useState(null);

  // 1. CHEQUEAR PERMISOS (Instrumentos y Coordinación)
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      
      // Cargar instrumentos
      if (userRole !== "invitado") {
        const { data } = await supabase.from("instrumentos").select("*").order("id");
        if (data) setCatalogoInstrumentos(data);
      }

      // Chequear si es coordinador de ensamble
      // Si es admin/editor, es coordinador automáticamente
      if (['admin', 'editor', 'produccion_general'].includes(userRole)) {
        setIsEnsembleCoordinator(true);
      } else {
        // Si no es admin, buscamos en la tabla si tiene asignaciones
        const { count, error } = await supabase
          .from("ensambles_coordinadores")
          .select("id", { count: "exact", head: true })
          .eq("id_integrante", user.id);

        if (!error && count > 0) {
          setIsEnsembleCoordinator(true);
        }
      }
    };
    checkPermissions();
  }, [user, userRole]);

  // 2. REDIRECCIÓN FORZADA PARA PERSONAL
  // Evitar que músicos accedan a vistas no permitidas por URL o estado
  useEffect(() => {
    if (isPersonal && !isEnsembleCoordinator) {
        const allowedModes = ['FULL_AGENDA', 'GIRAS', 'AGENDA', 'MY_MEALS', 'COMMENTS', 'MY_PARTS'];
        if (!allowedModes.includes(mode)) {
            setMode('FULL_AGENDA');
        }
    }
  }, [mode, isPersonal, isEnsembleCoordinator]);

  const updateView = (newMode, giraId = null) => {
    setMode(newMode);
    if (giraId) setActiveGiraId(giraId);
    setMobileMenuOpen(false); 
  };

  // --- DEFINICIÓN DE MENÚS ---
  const allMenuItems = [
    { id: 'DASHBOARD', label: 'Inicio', icon: <IconLayoutDashboard size={20}/>, show: !isPersonal },
    { id: 'FULL_AGENDA', label: 'Agenda General', icon: <IconCalendar size={20}/>, show: true },
    { id: 'GIRAS', label: 'Giras', icon: <IconTruck size={20}/>, show: true },
    
    // ENSAMBLES: Solo para gestión (Admin, Editor, Coord Gral)
    { id: 'ENSAMBLES', label: 'Ensambles', icon: <IconMusic size={20}/>, show: isManagement },
    
    // COORDINACIÓN: Para admins O coordinadores asignados (menú restaurado)
    { id: 'COORDINACION', label: 'Coordinación', icon: <IconList size={20}/>, show: isEnsembleCoordinator },

    { id: 'REPERTOIRE', label: 'Repertorio', icon: <IconFileText size={20}/>, show: !isPersonal || userRole === 'archivista' },
    { id: 'MUSICIANS', label: 'Músicos', icon: <IconUsers size={20}/>, show: isManagement || isDirector },
    { id: 'LOCATIONS', label: 'Locaciones', icon: <IconMapPin size={20}/>, show: isManagement || isDirector },
    { id: 'DATA', label: 'Datos', icon: <IconDatabase size={20}/>, show: isManagement },
    { id: 'USERS', label: 'Usuarios', icon: <IconSettings size={20}/>, show: userRole === 'admin' },
  ];

  const visibleMenuItems = allMenuItems.filter(i => i.show);

  // --- RENDERIZADO DE CONTENIDO ---
  const renderContent = () => {
    switch (mode) {
      case 'DASHBOARD':
        if (isManagement || isDirector) return <LogisticsDashboard updateView={updateView} supabase={supabase} />;
        if (userRole === 'archivista') return <RepertoireView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />;
        return <AgendaGeneral onViewChange={updateView} supabase={supabase} />;

      case 'GIRAS': return <GirasView initialGiraId={activeGiraId} updateView={updateView} supabase={supabase} />;
      case 'AGENDA': return <GirasView initialGiraId={activeGiraId} initialTab="agenda" updateView={updateView} supabase={supabase} />;
      case 'FULL_AGENDA': return <AgendaGeneral onViewChange={updateView} supabase={supabase} />;
      
      // Vista de Gestión Global de Ensambles
      case 'ENSAMBLES': 
        return <EnsemblesView supabase={supabase} />;
      
      // Vista Específica de Coordinación (Pasar lista, armar filas)
      case 'COORDINACION':
        return <EnsembleCoordinatorView supabase={supabase} />;
      
      case 'MUSICIANS': return <MusiciansView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />;
      case 'LOCATIONS': return <LocationsView supabase={supabase} />;
      case 'REPERTOIRE': return <RepertoireView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />;
      case 'DATA': return <DataView supabase={supabase} />;
      case 'USERS': return <UsersManager supabase={supabase} />;
      case 'COMMENTS': return <GlobalCommentsViewer supabase={supabase} />;
      case 'MY_PARTS': return <MyPartsViewer supabase={supabase} />;
      case 'MY_MEALS': return <MealsAttendancePersonal supabase={supabase} />;

      default: return <div className="p-10 text-center text-slate-400">Vista no encontrada: {mode}</div>;
    }
  };

  const mobileNavItems = [
    { id: isPersonal ? 'FULL_AGENDA' : 'DASHBOARD', icon: <IconLayoutDashboard size={24}/>, label: 'Inicio' },
    { id: 'FULL_AGENDA', icon: <IconCalendar size={24}/>, label: 'Agenda' },
    { id: 'GIRAS', icon: <IconTruck size={24}/>, label: 'Giras' },
    { id: 'COMMENTS', icon: <IconMessageCircle size={24}/>, label: 'Avisos' },
    { id: 'MENU', icon: <IconMenu size={24}/>, label: 'Menú', action: () => setMobileMenuOpen(true) }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* --- SIDEBAR DESKTOP (COLAPSABLE) --- */}
      <aside 
        className={`hidden md:flex bg-slate-900 text-slate-300 flex-col shadow-xl z-20 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`p-4 border-b border-slate-800 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-3`}>
          {!sidebarCollapsed && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 shrink-0">O</div>
                <div className="whitespace-nowrap"><h1 className="font-bold text-white text-lg tracking-tight">OF<span className="text-indigo-400">RN</span></h1></div>
              </div>
          )}
          {sidebarCollapsed && <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 shrink-0">O</div>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
            {sidebarCollapsed ? <IconChevronRight size={20}/> : <IconChevronLeft size={20}/>}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1">
          {visibleMenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => updateView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                mode === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium' 
                  : 'hover:bg-slate-800 hover:text-white'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span className={`transition-transform duration-200 shrink-0 ${mode === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
              {!sidebarCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
              {mode === item.id && !sidebarCollapsed && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={signOut} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-rose-900/30 hover:text-rose-400 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`} title="Cerrar Sesión">
            <IconLogOut size={20} /> {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-2">
             <div className="md:hidden w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-2">O</div>
             <h2 className="text-xl font-bold text-slate-800 hidden sm:block">{allMenuItems.find(m => m.id === mode)?.label || 'Panel'}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setCalendarModalOpen(true)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors border border-indigo-200 shadow-sm group" title="Sincronizar con Google Calendar">
                <IconCalendar size={16} className="group-hover:scale-110 transition-transform"/><span className="text-xs font-bold">Sincronizar</span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700 leading-tight">{user.nombre} {user.apellido}</span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-1.5 rounded">{userRole.replace('_', ' ')}</span>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-slate-400 overflow-hidden">
                 <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-slate-50">
          {renderContent()}
        </main>

        <div className="md:hidden h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-30 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           {mobileNavItems.map(item => (
             <button key={item.id} onClick={item.action || (() => updateView(item.id))} className={`flex flex-col items-center justify-center w-full h-full gap-1 ${mode === item.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                {item.icon}<span className="text-[9px] font-bold">{item.label}</span>
             </button>
           ))}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm md:hidden flex flex-col p-6 animate-in fade-in slide-in-from-bottom-10 duration-200">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-white text-2xl font-bold">Menú</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full text-white"><IconX size={24}/></button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2">
              {visibleMenuItems.map(item => (
                <button key={item.id} onClick={() => updateView(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium transition-all ${mode === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-300'}`}>
                  {item.icon}{item.label}
                </button>
              ))}
              <button onClick={() => { setMobileMenuOpen(false); setCalendarModalOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 mt-4">
                  <IconCalendar size={24}/> Sincronizar Calendario
              </button>
           </div>
           <button onClick={signOut} className="mt-6 w-full py-4 bg-rose-600 rounded-xl text-white font-bold flex items-center justify-center gap-2">
              <IconLogOut size={20}/> Cerrar Sesión
           </button>
        </div>
      )}

      <CalendarSelectionModal isOpen={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} userId={user?.id} />
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;
  if (!user) return <LoginView />;
  return <ProtectedApp />;
};

function App() {
  return (
    <AuthProvider>
        <Routes>
          <Route path="/public/*" element={<PublicLinkHandler />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
    </AuthProvider>
  );
}

export default App;