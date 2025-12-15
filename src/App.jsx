import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginView from "./views/LoginView/LoginView";

import MusiciansView from "./views/Musicians/MusiciansView";
import EnsemblesView from "./views/Ensembles/EnsemblesView";
import GirasView from "./views/Giras/GirasView";
import RepertoireView from "./views/Repertoire/RepertoireView";
import LocationsView from "./views/Locations/LocationsView";
import UsersManager from "./views/Users/UsersManager";

import { supabase } from "./services/supabase";
import { IconLogOut, IconUsers, IconMenu, IconX } from "./components/ui/Icons";

// Componente para el contenido principal protegido
function AppContent() {
  const { user, loading, logout, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState("giras");
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Estado para menú móvil

  // --- CORRECCIÓN CLAVE: ACEPTAR AMBOS NOMBRES DE ROL ---
  const userRole = user?.rol_sistema || "";
  const isPersonal =
    userRole === "consulta_personal" || userRole === "personal";

  // HOOK 1: Cargar instrumentos
  useEffect(() => {
    const fetchInstrumentos = async () => {
      const { data } = await supabase
        .from("instrumentos")
        .select("*")
        .order("id");
      if (data) setCatalogoInstrumentos(data);
    };
    fetchInstrumentos();
  }, []);

  // HOOK 2: Efecto de seguridad
  useEffect(() => {
    if (isPersonal && activeTab !== "giras") {
      setActiveTab("giras");
    }
  }, [isPersonal, activeTab]);

  // Cierra el menú móvil al cambiar de tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // 1. Cargando
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-slate-400">
        Cargando...
      </div>
    );

  // 2. No Logueado -> Login
  if (!user) return <LoginView />;

  // 3. Logueado pero PENDIENTE
  if (userRole === "pendiente") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 p-8 text-center">
        <div className="bg-amber-100 p-4 rounded-full mb-4 text-amber-600">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Cuenta en Revisión</h2>
        <p className="max-w-md">
          Hola <b>{user.nombre} {user.apellido}</b>. Tu cuenta requiere aprobación.
        </p>
        <button onClick={logout} className="mt-8 text-indigo-600 hover:underline text-sm">
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // Definición de pestañas
  const allTabs = [
    { id: "musicos", label: "Músicos", icon: "users" },
    { id: "ensambles", label: "Ensambles", icon: "layers" },
    { id: "giras", label: "Giras", icon: "map" },
    { id: "repertorio", label: "Repertorio", icon: "music" },
    { id: "lugares", label: "Lugares", icon: "building" },
  ];

  const LogoOrquesta = () => (
    <img
      src="/pwa-192x192.png"
      alt="Logo Orquesta"
      className="w-10 h-10 md:w-12 md:h-12 object-contain"
    />
  );

  const visibleTabs = isPersonal ? allTabs.filter((t) => t.id === "giras") : allTabs;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-50 print:hidden relative">
        
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tight">
            <LogoOrquesta />
            <span className="hidden md:inline">Manager</span>
          </div>

          {/* TABS DE ESCRITORIO (Ocultos en móvil) */}
          <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("usuarios")}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === "usuarios"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <IconUsers size={16} /> Usuarios
              </button>
            )}
          </div>
        </div>

        {/* INFO USUARIO Y LOGOUT (Escritorio) */}
        <div className="hidden md:flex items-center gap-4 border-l border-slate-200 pl-6">
          <div className="text-right leading-tight">
            <div className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
              {user.nombre} {user.apellido}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
              {userRole.replace("_", " ") || "Invitado"}
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 group"
            title="Cerrar Sesión"
          >
            <IconLogOut size={18} className="group-hover:stroke-red-600" />
          </button>
        </div>

        {/* BOTÓN MENÚ MÓVIL (Visible solo en móvil) */}
        <button 
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          onClick={() => setMobileMenuOpen(true)}
        >
          <IconMenu size={24} />
        </button>
      </nav>

      {/* MENÚ MÓVIL (Overlay) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white md:hidden animate-in slide-in-from-right duration-200 flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-slate-100">
             <div className="flex items-center gap-2 font-black text-indigo-700 text-lg">
                <LogoOrquesta /> <span>Menú</span>
             </div>
             <button 
               onClick={() => setMobileMenuOpen(false)}
               className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
             >
               <IconX size={24} />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full text-left p-4 rounded-xl text-lg font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => handleTabChange("usuarios")}
                className={`w-full text-left p-4 rounded-xl text-lg font-bold transition-all flex items-center gap-2 ${
                  activeTab === "usuarios"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <IconUsers size={20} /> Usuarios
              </button>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                 {user.nombre[0]}
              </div>
              <div>
                <div className="font-bold text-slate-800">{user.nombre} {user.apellido}</div>
                <div className="text-xs text-slate-500 uppercase">{userRole.replace("_", " ")}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full py-3 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <IconLogOut size={20} /> Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 p-0 md:p-6 overflow-hidden">
           {/* Contenedor interno con padding ajustado para móvil (p-2) y escritorio (p-0 porque el padre ya tiene p-6) */}
           <div className="h-full w-full p-2 md:p-0 overflow-hidden">
            {activeTab === "musicos" && !isPersonal && (
              <MusiciansView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />
            )}
            {activeTab === "ensambles" && !isPersonal && (
              <EnsemblesView supabase={supabase} />
            )}
            {activeTab === "giras" && <GirasView supabase={supabase} />}
            {activeTab === "repertorio" && !isPersonal && (
              <RepertoireView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />
            )}
            {activeTab === "lugares" && !isPersonal && (
              <LocationsView supabase={supabase} />
            )}
            {activeTab === "usuarios" && isAdmin && (
              <UsersManager supabase={supabase} />
            )}
          </div>
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