import React, { useEffect, useState, Suspense } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginView from "./views/LoginView/LoginView";
import { supabase } from "./services/supabase";
import {
  IconLogOut,
  IconUsers,
  IconMenu,
  IconX,
  IconLoader,
} from "./components/ui/Icons";
import { useSearchParams, Routes, Route } from "react-router-dom";
import PublicLinkHandler from "./views/Public/PublicLinkHandler";

// Lazy Loading
const MusiciansView = React.lazy(() => import("./views/Musicians/MusiciansView"));
const EnsemblesView = React.lazy(() => import("./views/Ensembles/EnsemblesView"));
const GirasView = React.lazy(() => import("./views/Giras/GirasView"));
const RepertoireView = React.lazy(() => import("./views/Repertoire/RepertoireView"));
const DataView = React.lazy(() => import("./views/Data/DataView"));
const UsersManager = React.lazy(() => import("./views/Users/UsersManager"));
const EnsembleCoordinatorView = React.lazy(() => import("./views/Ensembles/EnsembleCoordinatorView"));

const PageLoader = () => (
  <div className="h-full w-full flex items-center justify-center text-slate-400 gap-2">
    <IconLoader className="animate-spin" /> Cargando módulo...
  </div>
);

function ProtectedApp() {
  const { user, loading, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "giras";

  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // NUEVO ESTADO: Saber si es coordinador de algún ensamble
  const [isEnsembleCoordinator, setIsEnsembleCoordinator] = useState(false);

  const userRole = user?.rol_sistema || "";
  
  const isPersonal =
    userRole === "consulta_personal" || 
    userRole === "personal" || 
    userRole === "invitado";

  // 1. CHEQUEO DE PERMISOS EXTRA
  useEffect(() => {
    const checkPermissions = async () => {
        if (!user) return;

        // A. Cargar Instrumentos (Si no es invitado)
        if (userRole !== 'invitado') {
            const { data } = await supabase.from("instrumentos").select("*").order("id");
            if (data) setCatalogoInstrumentos(data);
        }

        // B. Chequear si es Coordinador de Ensamble (aunque sea rol personal)
        // Si ya es admin o produccion, no hace falta chequear DB, ya tiene acceso total
        if (['admin', 'produccion_general', 'editor'].includes(userRole)) {
            setIsEnsembleCoordinator(true); 
        } else {
            // Buscamos si tiene asignaciones en la tabla
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

  // 2. REDIRECCIÓN DE SEGURIDAD AJUSTADA
  useEffect(() => {
    // Si es personal Y NO es coordinador, y trata de salir de giras -> lo devolvemos
    if (isPersonal && !isEnsembleCoordinator && activeTab !== "giras") {
      setSearchParams({ tab: "giras" }, { replace: true });
    }
    // Nota: Si es personal PERO es coordinador, le permitimos estar en 'coordinacion'
    // (La lógica de tabs visibles abajo se encarga de que no entre a 'datos' o 'usuarios')
  }, [isPersonal, isEnsembleCoordinator, activeTab, setSearchParams]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
    setMobileMenuOpen(false);
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  if (!user) return <LoginView />;

  const allTabs = [
    { id: "musicos", label: "Músicos", icon: "users" },
    { id: "ensambles", label: "Ensambles", icon: "layers" },
    { id: "giras", label: "Giras", icon: "map" },
    { id: "coordinacion", label: "Coordinación", icon: "clipboard" },
    { id: "repertorio", label: "Repertorio", icon: "music" },
    { id: "datos", label: "Datos", icon: "database" },
  ];

  // 3. LÓGICA DE TABS VISIBLES
  let visibleTabs = allTabs;

  if (isPersonal) {
      // Si es personal, por defecto solo Giras
      visibleTabs = allTabs.filter((t) => t.id === "giras");
      
      // PERO si es coordinador, le agregamos la pestaña de Coordinación
      if (isEnsembleCoordinator) {
          const coordTab = allTabs.find(t => t.id === "coordinacion");
          if (coordTab) visibleTabs.push(coordTab);
      }
  }

  const LogoOrquesta = () => (
    <img src="/pwa-192x192.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans ">
      <nav className="bg-white print:hidden border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-50 relative">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tight">
            <LogoOrquesta /> <span className="hidden md:inline">Manager</span>
          </div>
          
          {userRole !== 'invitado' && (
            <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg">
                {visibleTabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
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
                    onClick={() => handleTabChange("usuarios")}
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
          )}
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-white md:hidden animate-in slide-in-from-right duration-200 flex flex-col">
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
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 p-0 md:p-6 overflow-hidden">
          <div className="h-full w-full p-2 md:p-0 overflow-hidden">
            <Suspense fallback={<PageLoader />}>
              {activeTab === "giras" && <GirasView supabase={supabase} />}
              
              {activeTab === "musicos" && !isPersonal && (
                <MusiciansView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />
              )}
              {activeTab === "ensambles" && !isPersonal && <EnsemblesView supabase={supabase} />}
              
              {/* VISTA DE COORDINACIÓN (Visible para Staff o Coordinadores Específicos) */}
              {activeTab === "coordinacion" && (!isPersonal || isEnsembleCoordinator) && (
                 <EnsembleCoordinatorView supabase={supabase} />
              )}

              {activeTab === "repertorio" && !isPersonal && (
                <RepertoireView supabase={supabase} catalogoInstrumentos={catalogoInstrumentos} />
              )}
              {activeTab === "datos" && !isPersonal && <DataView supabase={supabase} />}
              {activeTab === "usuarios" && isAdmin && <UsersManager supabase={supabase} />}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/share/:token" element={<PublicLinkHandler />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}