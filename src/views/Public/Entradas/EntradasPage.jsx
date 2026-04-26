import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../services/supabase";
import { getEntradasSessionProfile } from "../../../services/entradaService";
import LoginEntradas from "./LoginEntradas";
import EntradasMain from "./EntradasMain";

export default function EntradasPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const activeUserIdRef = useRef(null);

  const loadProfile = useCallback(async () => {
    try {
      const payload = await getEntradasSessionProfile();
      setSession(payload.session);
      setProfile(payload.profile);
      activeUserIdRef.current = payload.session?.user?.id || null;
    } catch (error) {
      setBootError(error?.message || "No se pudo inicializar Entradas.");
    } finally {
      setProfileChecked(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUserId = nextSession?.user?.id || null;
      const sameUser = nextUserId && activeUserIdRef.current === nextUserId;
      if (event === "TOKEN_REFRESHED" || (sameUser && event !== "SIGNED_OUT")) {
        setSession(nextSession || null);
        return;
      }
      setLoading(true);
      setProfileChecked(false);
      setSession(nextSession || null);
      loadProfile();
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (loading || (session?.user && !profileChecked)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cargando entradas...</span>
      </div>
    );
  }

  if (!session?.user || !profile) {
    return (
      <LoginEntradas
        user={session?.user || null}
        profile={profile}
        onProfileSaved={loadProfile}
        bootError={bootError}
      />
    );
  }

  return <EntradasMain user={session.user} profile={profile} onLogout={onLogout} onProfileRefresh={loadProfile} />;
}
