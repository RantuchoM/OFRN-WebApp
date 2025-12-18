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
// 1. IMPORTAR HOOK
import { useSearchParams } from "react-router-dom";

// ... (Imports de Lazy Loading se mantienen igual) ...
const MusiciansView = React.lazy(() =>
  import("./views/Musicians/MusiciansView")
);
const EnsemblesView = React.lazy(() =>
  import("./views/Ensembles/EnsemblesView")
);
const GirasView = React.lazy(() => import("./views/Giras/GirasView"));
const RepertoireView = React.lazy(() =>
  import("./views/Repertoire/RepertoireView")
);
const DataView = React.lazy(() => import("./views/Data/DataView"));
const UsersManager = React.lazy(() => import("./views/Users/UsersManager"));

const PageLoader = () => (
  <div className="h-full w-full flex items-center justify-center text-slate-400 gap-2">
    <IconLoader className="animate-spin" /> Cargando módulo...
  </div>
);

function AppContent() {
  const { user, loading, logout, isAdmin } = useAuth();

  // 2. REEMPLAZAR EL STATE SIMPLE POR URL SEARCH PARAMS
  const [searchParams, setSearchParams] = useSearchParams();
  // Si no hay ?tab=... en la URL, usamos "giras" por defecto
  const activeTab = searchParams.get("tab") || "giras";

  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole = user?.rol_sistema || "";
  const isPersonal =
    userRole === "consulta_personal" || userRole === "personal";

  useEffect(() => {
    const fetchInstrumentos = async () => {
      const { data } = await supabase
        .from("instrumentos")
        .select("*")
        .order("id");
      if (data) setCatalogoInstrumentos(data);
    };
    if (user) fetchInstrumentos();
  }, [user]);

  // Redirección de seguridad para personal
  useEffect(() => {
    if (isPersonal && activeTab !== "giras") {
      setSearchParams({ tab: "giras" }, { replace: true }); // Usar setSearchParams
    }
  }, [isPersonal, activeTab, setSearchParams]);

  const handleTabChange = (tabId) => {
    // 3. AL CAMBIAR TAB, ACTUALIZAMOS LA URL (ESTO CREA HISTORIAL)
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

  // ... (Bloque de cuenta pendiente se mantiene igual) ...
  if (userRole === "pendiente") {
    /* ... */
  }

  const allTabs = [
    { id: "musicos", label: "Músicos", icon: "users" },
    { id: "ensambles", label: "Ensambles", icon: "layers" },
    { id: "giras", label: "Giras", icon: "map" },
    { id: "repertorio", label: "Repertorio", icon: "music" },
    { id: "datos", label: "Datos", icon: "database" },
  ];

  const visibleTabs = isPersonal
    ? allTabs.filter((t) => t.id === "giras")
    : allTabs;

  const LogoOrquesta = () => (
    <img
      src="/pwa-192x192.png"
      alt="Logo"
      className="w-10 h-10 md:w-12 md:h-12 object-contain"
    />
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans ">
      {/* ... (NAVBAR SE MANTIENE IGUAL) ... */}
      <nav className="bg-white print:hidden border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 shadow-sm z-50 relative">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2 text-indigo-700 font-black text-xl tracking-tight">
            <LogoOrquesta /> <span className="hidden md:inline">Manager</span>
          </div>
          <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-lg">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)} // Usar la nueva función
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {/* ... Botón usuarios igual ... */}
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
        </div>
        {/* ... Resto del Navbar y Menú Móvil igual, solo asegurate de usar handleTabChange ... */}
        {/* ... */}
      </nav>

      {/* ... (MOBILE MENU y MAIN SE MANTIENEN IGUAL) ... */}
      {mobileMenuOpen && (
        // ... Asegúrate de usar handleTabChange(tab.id) en los botones del menú móvil
        <div className="fixed inset-0 z-[100] bg-white md:hidden animate-in slide-in-from-right duration-200 flex flex-col">
          {/* ... */}
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
          {/* ... */}
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        {/* ... El contenido del main es igual, usando activeTab que ahora viene de la URL ... */}
        <div className="absolute inset-0 p-0 md:p-6 overflow-hidden">
          <div className="h-full w-full p-2 md:p-0 overflow-hidden">
            <Suspense fallback={<PageLoader />}>
              {activeTab === "musicos" && !isPersonal && (
                <MusiciansView
                  supabase={supabase}
                  catalogoInstrumentos={catalogoInstrumentos}
                />
              )}
              {activeTab === "ensambles" && !isPersonal && (
                <EnsemblesView supabase={supabase} />
              )}
              {activeTab === "giras" && <GirasView supabase={supabase} />}
              {activeTab === "repertorio" && !isPersonal && (
                <RepertoireView
                  supabase={supabase}
                  catalogoInstrumentos={catalogoInstrumentos}
                />
              )}
              {activeTab === "datos" && !isPersonal && (
                <DataView supabase={supabase} />
              )}
              {activeTab === "usuarios" && isAdmin && (
                <UsersManager supabase={supabase} />
              )}
            </Suspense>
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
