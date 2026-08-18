import React, { useCallback, useEffect, useRef, useState } from "react";
import "../../../styles/entradas-filarmonica.css";
import { entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import { supabaseEntradasPublic } from "../../../services/supabase";
import { getEntradasSessionProfile, verifyEntradasMagicLink } from "../../../services/entradaService";
import {
  clearMagicTokenFromUrl,
  readMagicTokenFromSearch,
  readPasswordResetFlagFromSearch,
} from "../../../utils/entradasMagicLink";
import LoginEntradas from "./LoginEntradas";
import EntradasMain from "./EntradasMain";

export default function EntradasPage() {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const [magicLinkPending, setMagicLinkPending] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
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
    let cancelled = false;

    (async () => {
      const magicToken = readMagicTokenFromSearch();
      const resetFromUrl = readPasswordResetFlagFromSearch();
      setLoading(true);
      setBootError("");

      if (magicToken) {
        setMagicLinkPending(true);
        try {
          const result = await verifyEntradasMagicLink({ token: magicToken, app: "entradas" });
          clearMagicTokenFromUrl();
          if (!cancelled && (result?.purpose === "reset" || resetFromUrl)) {
            setPendingPasswordReset(true);
          }
        } catch (error) {
          if (!cancelled) {
            clearMagicTokenFromUrl();
            setBootError(error?.message || "No se pudo acceder con el enlace del email.");
            setProfileChecked(true);
            setLoading(false);
          }
          return;
        } finally {
          if (!cancelled) setMagicLinkPending(false);
        }
      }

      if (!cancelled) await loadProfile();
    })();

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabaseEntradasPublic.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") return;

      const nextUserId = nextSession?.user?.id || null;
      const sameUser = nextUserId && activeUserIdRef.current === nextUserId;
      if (event === "TOKEN_REFRESHED" || (sameUser && event !== "SIGNED_OUT")) {
        setSession(nextSession || null);
        return;
      }

      setLoading(true);
      setProfileChecked(false);
      setSession(nextSession || null);
      // Evita deadlock de Supabase: no llamar getSession dentro del callback sync.
      setTimeout(() => {
        if (!cancelled) loadProfile();
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const onLogout = async () => {
    await supabaseEntradasPublic.auth.signOut();
    setSession(null);
    setProfile(null);
    setPendingPasswordReset(false);
  };

  const onPasswordSaved = async (nextProfile) => {
    if (nextProfile) setProfile(nextProfile);
    setPendingPasswordReset(false);
    await loadProfile();
  };

  if (loading || magicLinkPending || (session?.user && !profileChecked)) {
    return (
      <div className={`${ui.page} flex items-center justify-center`}>
        <span className={`text-sm font-semibold uppercase tracking-wide ${ui.textMuted}`}>
          {magicLinkPending ? "Accediendo con enlace seguro…" : "Cargando entradas…"}
        </span>
      </div>
    );
  }

  if (!session?.user || !profile || pendingPasswordReset) {
    return (
      <LoginEntradas
        user={session?.user || null}
        profile={profile}
        onProfileSaved={loadProfile}
        onPasswordSaved={onPasswordSaved}
        pendingPasswordReset={pendingPasswordReset}
        bootError={bootError}
      />
    );
  }

  return (
    <EntradasMain
      user={session.user}
      profile={profile}
      onLogout={onLogout}
      onProfileRefresh={loadProfile}
      onProfileUpdated={setProfile}
    />
  );
}
