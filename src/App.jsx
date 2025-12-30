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
  IconList
} from './components/ui/Icons';

// --- MODAL CALENDARIO ---
const CalendarSelectionModal = ({ isOpen, onClose, userId }) => {
  if (!isOpen || !userId) return null;

  const BASE_URL = "https://muxrbuivopnawnxlcjxq.supabase.co/functions/v1/calendar-export";

  const generateLinks = (mode) => {
    let sourceLink = `${BASE_URL}?uid=${userId}`;
    if (mode === 'essential') {
      sourceLink += '&mode=essential';
    }
    sourceLink += '&file=agenda.ics';

    const webcalLink = sourceLink.replace(/^https?:\/\//, 'webcal://');

    return {
      https: sourceLink,
      webcal: webcalLink,
      google: `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalLink)}`
    };
  };

  const handleAction = (platform, mode) => {
    const links = generateLinks(mode);

    if (platform === 'COPY') {
      navigator.clipboard.writeText(links.https).then(() => {
        alert("🔗 Enlace copiado al portapapeles.\n\nSi Google Calendar te da error al pegar este enlace manual, prueba cambiar 'https' por 'webcal' al inicio.");
      });
    } else if (platform === 'GOOGLE') {
      window.open(links.google, '_blank');
    } else if (platform === 'IOS') {
      window.location.href = links.webcal;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <IconCalendar size={20} className="text-indigo-600"/> 
                    Sincronizar Calendario
                </h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                  <IconX size={20}/>
                </button>
            </div>

            <div className="p-6 space-y-6">
                <p className="text-sm text-slate-600">
                  Selecciona tu dispositivo para suscribirte automáticamente:
                </p>

                {/* OPCIÓN 1: SOLO MUSICAL */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider">
                       <IconMusic size={16}/> Solo Musical (Ensayos/Conciertos)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleAction('GOOGLE', 'essential')} className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all font-bold text-xs">
                           Google / Android
                        </button>
                        <button onClick={() => handleAction('IOS', 'essential')} className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-all font-bold text-xs">
                           iPhone / Mac
                        </button>
                    </div>
                    <button onClick={() => handleAction('COPY', 'essential')} className="w-full text-xs text-slate-400 hover:text-indigo-600 hover:underline text-center py-1">
                        Copiar enlace manual
                    </button>
                </div>

                <div className="h-px bg-slate-100"></div>

                {/* OPCIÓN 2: AGENDA COMPLETA */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider">
                       <IconLayoutDashboard size={16}/> Agenda Completa (+Logística)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => handleAction('GOOGLE', 'full')} className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all font-bold text-xs">
                           Google / Android
                        </button>
                        <button onClick={() => handleAction('IOS', 'full')} className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-all font-bold text-xs">
                           iPhone / Mac
                        </button>
                    </div>
                    <button onClick={() => handleAction('COPY', 'full')} className="w-full text-xs text-slate-400 hover:text-indigo-600 hover:underline text-center py-1">
                        Copiar enlace manual
                    </button>
                </div>
            </div>
            
            <div className="px-6 py-3 bg-slate-50 text-[10px] text-slate-400 text-center border-t border-slate-100">
              ⚠️ Nota: Google Calendar puede tardar varias horas en actualizar cambios.
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
  const isManagement = ['admin', 'editor', 'coord_general'].includes(userRole);
  const isDirector = userRole === 'director';
  const isPersonal = ['musico', 'archivista', 'personal', 'consulta_personal'].includes(userRole);

  // Estado principal de navegación
  const [mode, setMode] = useState(isPersonal ? 'FULL_AGENDA' : 'GIRAS');
  const [activeGiraId, setActiveGiraId] = useState(null);
  
  // Estado extra para deep linking de pestañas internas (ej: repertorio)
  const [initialGiraView, setInitialGiraView] = useState(null);

  // 1. CHEQUEAR PERMISOS
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;
      
      if (userRole !== "invitado") {
        const { data } = await supabase.from("instrumentos").select("*").order("id");
        if (data) setCatalogoInstrumentos(data);
      }

      if (['admin', 'editor', 'produccion_general'].includes(userRole)) {
        setIsEnsembleCoordinator(true);
      } else {
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

  // 2. REDIRECCIÓN FORZADA (Seguridad)
  useEffect(() => {
    if (isPersonal && !isEnsembleCoordinator) {
        const allowedModes = ['FULL_AGENDA', 'GIRAS', 'AGENDA', 'MY_MEALS', 'COMMENTS', 'MY_PARTS'];
        if (!allowedModes.includes(mode)) {
            setMode('FULL_AGENDA');
        }
    }
  }, [mode, isPersonal, isEnsembleCoordinator]);

  // 3. LEER URL AL INICIO (Deep Linking)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const giraIdParam = params.get('giraId');
    const viewParam = params.get('view'); // Nuevo: captura ?view=REPERTOIRE

    if (tabParam) {
      const modeMap = {
        'giras': 'GIRAS',
        'agenda': 'FULL_AGENDA',
        'repertorio': 'REPERTOIRE',
        'ensambles': 'ENSAMBLES',
        'musicos': 'MUSICIANS',
        'usuarios': 'USERS',
        'datos': 'DATA',
        'locaciones': 'LOCATIONS',
        'coordinacion': 'COORDINACION',
        'avisos': 'COMMENTS',
        'comidas': 'MY_MEALS'
      };

      const newMode = modeMap[tabParam.toLowerCase()];
      
      if (newMode) {
        setMode(newMode);
        if (newMode === 'GIRAS' && giraIdParam) {
          setActiveGiraId(giraIdParam);
          if (viewParam) {
             setInitialGiraView(viewParam); // Guardamos la vista interna
          }
        }
      }
    }
  }, []); // Solo al montar

  // 4. ESCRIBIR URL AL CAMBIAR ESTADO (Sync URL) - NUEVO
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams();
    
    // Mapeo inverso de Modos a Tabs URL
    const modeToTab = {
        'GIRAS': 'giras',
        'FULL_AGENDA': 'agenda',
        'REPERTOIRE': 'repertorio',
        'ENSAMBLES': 'ensambles',
        'MUSICIANS': 'musicos',
        'USERS': 'usuarios',
        'DATA': 'datos',
        'LOCATIONS': 'locaciones',
        'COORDINACION': 'coordinacion',
        'COMMENTS': 'avisos',
        'MY_MEALS': 'comidas'
    };

    if (modeToTab[mode]) {
        params.set('tab', modeToTab[mode]);
    }

    if (mode === 'GIRAS' && activeGiraId) {
        params.set('giraId', activeGiraId);
        // Nota: No sincronizamos 'view' interno aquí porque requeriría 
        // callback desde GirasView, pero al menos la gira se mantiene.
    }

    // Actualizamos la URL sin recargar
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);

  }, [mode, activeGiraId, user]);

  const updateView = (newMode, giraId = null) => {
    setMode(newMode);
    if (giraId) setActiveGiraId(giraId);
    setMobileMenuOpen(false); 
  };

  // --- DEFINICIÓN DE MENÚS ---
  const allMenuItems = [
    { id: 'FULL_AGENDA', label: 'Agenda General', icon: <IconCalendar size={20}/>, show: true },
    { id: 'GIRAS', label: 'Giras', icon: <IconTruck size={20}/>, show: true },
    { id: 'ENSAMBLES', label: 'Ensambles', icon: <IconMusic size={20}/>, show: isManagement },
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
      case 'GIRAS': 
        // Pasamos initialTab recuperado de la URL
        return <GirasView initialGiraId={activeGiraId} initialTab={initialGiraView} updateView={updateView} supabase={supabase} />;
      case 'AGENDA': 
        return <GirasView initialGiraId={activeGiraId} initialTab="agenda" updateView={updateView} supabase={supabase} />;
      case 'FULL_AGENDA': return <AgendaGeneral onViewChange={updateView} supabase={supabase} />;
      case 'ENSAMBLES': return <EnsemblesView supabase={supabase} />;
      case 'COORDINACION': return <EnsembleCoordinatorView supabase={supabase} />;
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
    { id: isPersonal ? 'FULL_AGENDA' : 'GIRAS'},
    { id: 'FULL_AGENDA', icon: <IconCalendar size={24}/>, label: 'Agenda' },
    { id: 'GIRAS', icon: <IconTruck size={24}/>, label: 'Giras' },
    { id: 'COMMENTS', icon: <IconMessageCircle size={24}/>, label: 'Avisos' },
    { id: 'MENU', icon: <IconMenu size={24}/>, label: 'Menú', action: () => setMobileMenuOpen(true) }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* --- SIDEBAR DESKTOP --- */}
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