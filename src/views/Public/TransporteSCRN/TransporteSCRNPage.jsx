import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabaseOficinaExterna as supabase } from "../../../services/supabase";
import { verifyEntradasMagicLink } from "../../../services/entradaService";
import { clearMagicTokenFromUrl, readMagicTokenFromSearch } from "../../../utils/entradasMagicLink";
import LoginSCRN from "./LoginSCRN";
import TransporteSCRNMain from "./TransporteSCRNMain";

export default function TransporteSCRNPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const [magicLinkPending, setMagicLinkPending] = useState(false);
  const activeUserIdRef = useRef(null);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setProfileChecked(true);
      return;
    }
    try {
      setProfileChecked(false);
      const { data, error } = await supabase
        .from("scrn_perfiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("Error cargando perfil SCRN:", error);
        return;
      }
      setProfile(data || null);
    } catch (error) {
      console.error("Excepcion cargando perfil SCRN:", error);
    } finally {
      setProfileChecked(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let didTimeout = false;
    const watchdog = window.setTimeout(() => {
      didTimeout = true;
      if (isMounted) {
        setLoading(false);
        setBootError(
          "La inicializacion demoro demasiado. Revisa conexion o configuracion de Supabase.",
        );
      }
    }, 10000);

    const initialize = async () => {
      try {
        const magicToken = readMagicTokenFromSearch();
        if (magicToken) {
          setMagicLinkPending(true);
          setBootError("");
          try {
            await verifyEntradasMagicLink({ token: magicToken, app: "scrn" });
            clearMagicTokenFromUrl();
          } catch (error) {
            if (!isMounted) return;
            clearMagicTokenFromUrl();
            setBootError(error?.message || "No se pudo acceder con el enlace del email.");
            setProfile(null);
            setProfileChecked(true);
            setLoading(false);
            return;
          } finally {
            if (isMounted) setMagicLinkPending(false);
          }
        }

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(currentSession || null);
        activeUserIdRef.current = currentSession?.user?.id || null;
        if (currentSession?.user?.id) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setProfileChecked(true);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error inicializando SCRN:", error);
        setBootError(
          "No se pudo inicializar la sesion. Verifica la URL/SB_KEY y tu conexion.",
        );
      } finally {
        if (!didTimeout) {
          window.clearTimeout(watchdog);
        }
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUserId = nextSession?.user?.id || null;
      const prevUserId = activeUserIdRef.current;
      const sameUser = Boolean(nextUserId && prevUserId && nextUserId === prevUserId);

      // Evita "pseudo-recargas" de UI en refresh/foco si la sesión no cambió.
      if (event === "TOKEN_REFRESHED" || (sameUser && event !== "SIGNED_OUT")) {
        setSession(nextSession || null);
        return;
      }

      setSession(nextSession || null);
      setBootError("");

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setProfileChecked(true);
        setLoading(false);
        return;
      }

      if (nextSession?.user?.id) {
        activeUserIdRef.current = nextSession.user.id;
        setLoading(true);
        loadProfile(nextSession.user.id).finally(() => setLoading(false));
      } else {
        activeUserIdRef.current = null;
        setProfile(null);
        setProfileChecked(true);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      window.clearTimeout(watchdog);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const handleProfileSaved = async () => {
    if (!session?.user?.id) return;
    await loadProfile(session.user.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (loading || magicLinkPending || (session?.user && !profileChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          {magicLinkPending ? "Accediendo con enlace seguro…" : "Cargando transporte SCRN…"}
        </div>
      </div>
    );
  }

  if (!session?.user || !profile) {
    return (
      <LoginSCRN
        user={session?.user || null}
        profile={profile}
        onProfileSaved={handleProfileSaved}
        bootError={bootError}
      />
    );
  }

  return (
    <TransporteSCRNMain
      user={session.user}
      profile={profile}
      onLogout={handleLogout}
      onProfileRefresh={handleProfileSaved}
    />
  );
}
