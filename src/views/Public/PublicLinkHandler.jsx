import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../context/AuthContext";
import { IconLoader, IconAlertCircle } from "../../components/ui/Icons";

export default function PublicLinkHandler() {
  const { token } = useParams();
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) return;

      try {
        console.log("🔍 Validando token:", token);

        // ---------------------------------------------------------
        // 1. INTENTO A: Buscar si es un TOKEN PERSONAL (Músico)
        // ---------------------------------------------------------
        const { data: personalLink, error: errPersonal } = await supabase
          .from("giras_accesos")
          .select(`id_gira, id_integrante, integrantes (*), programas (*)`)
          .eq("token", token)
          .maybeSingle();

        if (personalLink) {
          console.log("✅ Acceso Personal concedido:", personalLink.integrantes.apellido);
          const mockUser = {
            ...personalLink.integrantes,
            rol_sistema: "invitado",
            active_gira_id: personalLink.id_gira,
            isGeneral: false,
            token_original: token
          };
          loginAsGuest(mockUser);
          navigate(`/?tab=giras&view=AGENDA&giraId=${personalLink.id_gira}`, { replace: true });
          return;
        }

        // ---------------------------------------------------------
        // 2. INTENTO B: Buscar si es un TOKEN GENERAL (Gira/Programa)
        // ---------------------------------------------------------
        const { data: generalLink, error: errGeneral } = await supabase
          .from("programas")
          .select("*")
          .eq("token_publico", token)
          .maybeSingle();

        if (errGeneral) {
            console.error("Error consultando programas:", errGeneral);
        }

        if (generalLink) {
          console.log("✅ Acceso General concedido a:", generalLink.nombre_gira);
          
          // Creamos un usuario "ficticio" para la sesión general
          const mockUser = {
            id: "guest-general", // ID fijo para invitado general
            nombre: "Invitado",
            apellido: "General",
            rol_sistema: "invitado",
            active_gira_id: generalLink.id,
            isGeneral: true,
            token_original: token
          };
          
          loginAsGuest(mockUser);
          
          // Redirigimos a la vista de Agenda de esa Gira
          navigate(`/?tab=giras&view=AGENDA&giraId=${generalLink.id}`, { replace: true });
          return;
        }

        // Si llegó hasta acá, no encontró nada
        throw new Error("El enlace es inválido, ha expirado o no tienes permisos.");

      } catch (err) {
        console.error("❌ Error validando token:", err);
        setError(err.message);
      }
    };

    validateToken();
  }, [token, loginAsGuest, navigate]);

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
            <IconAlertCircle className="text-red-500 mb-4 mx-auto" size={48} />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Acceso Denegado</h1>
            <p className="text-slate-500 text-sm mb-6">{error}</p>
            <button 
                onClick={() => navigate('/login')} 
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
            >
                Ir al Inicio de Sesión
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-indigo-600 gap-4">
      <IconLoader className="animate-spin" size={40} />
      <span className="font-medium animate-pulse text-sm uppercase tracking-widest">Validando credenciales...</span>
    </div>
  );
}