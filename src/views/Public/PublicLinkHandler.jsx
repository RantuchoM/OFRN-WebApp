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
        // 1. INTENTO A: Buscar si es un TOKEN PERSONAL (Músico)
        const { data: personalLink } = await supabase
          .from("giras_integrantes")
          .select(`id_gira, id_integrante, integrantes (*), programas (*)`)
          .eq("token_publico", token)
          .maybeSingle();

        if (personalLink) {
          const mockUser = {
            ...personalLink.integrantes,
            rol_sistema: "invitado",
            active_gira_id: personalLink.id_gira,
            isGeneral: false,
            token_original: token // <--- ¡IMPORTANTE! Guardamos el token
          };
          loginAsGuest(mockUser);
          navigate(`/?tab=giras&view=AGENDA&giraId=${personalLink.id_gira}`, { replace: true });
          return;
        }

        // 2. INTENTO B: Buscar si es un TOKEN GENERAL (Gira completa)
        const { data: generalLink } = await supabase
          .from("programas")
          .select("*")
          .eq("token_publico", token)
          .maybeSingle();

        if (generalLink) {
          const mockUser = {
            id: "guest-general",
            nombre: "Invitado",
            apellido: "General",
            rol_sistema: "invitado",
            active_gira_id: generalLink.id,
            isGeneral: true,
            token_original: token // <--- ¡IMPORTANTE! Guardamos el token
          };
          loginAsGuest(mockUser);
          navigate(`/?tab=giras&view=AGENDA&giraId=${generalLink.id}`, { replace: true });
          return;
        }

        throw new Error("El enlace es inválido o ha expirado.");

      } catch (err) {
        console.error(err);
        setError(err.message);
      }
    };

    validateToken();
  }, [token, loginAsGuest, navigate]);

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <IconAlertCircle className="text-red-500 mb-4" size={48} />
        <h1 className="text-xl font-bold text-slate-800">Enlace no válido</h1>
        <p className="text-slate-500 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-indigo-600 gap-3">
      <IconLoader className="animate-spin" size={32} />
      <span className="font-medium animate-pulse">Validando acceso...</span>
    </div>
  );
}