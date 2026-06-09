import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabaseViaticosManualPublic } from "../services/supabase";
import {
  getViaticosManualSessionProfile,
  logoutViaticosManual,
  verifyViaticosManualMagicLink,
} from "../services/viaticosManualService";
import { clearMagicTokenFromUrl, readMagicTokenFromSearch } from "../utils/entradasMagicLink";
import {
  clearGuestBypass,
  readGuestBypass,
  setGuestBypass,
} from "../utils/viaticosManualStorage";

const ViaticosManualAuthContext = createContext(null);

export function ViaticosManualAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState("");
  const [profileChecked, setProfileChecked] = useState(false);
  const [magicLinkPending, setMagicLinkPending] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [guestBypass, setGuestBypassState] = useState(() => readGuestBypass());
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const activeUserIdRef = useRef(null);
  const loadSavedViaticoRef = useRef(null);
  const loadSavedRendicionRef = useRef(null);

  const registerLoadHandlers = useCallback(({ onLoadViatico, onLoadRendicion }) => {
    loadSavedViaticoRef.current = onLoadViatico || null;
    loadSavedRendicionRef.current = onLoadRendicion || null;
    return () => {
      loadSavedViaticoRef.current = null;
      loadSavedRendicionRef.current = null;
    };
  }, []);

  const loadSavedViatico = useCallback((record) => {
    loadSavedViaticoRef.current?.(record);
  }, []);

  const loadSavedRendicion = useCallback((record) => {
    loadSavedRendicionRef.current?.(record);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const payload = await getViaticosManualSessionProfile();
      setSession(payload.session);
      setProfile(payload.profile);
      activeUserIdRef.current = payload.session?.user?.id || null;
    } catch (error) {
      setBootError(error?.message || "No se pudo inicializar la sesión.");
    } finally {
      setProfileChecked(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const magicToken = readMagicTokenFromSearch();
      setLoading(true);
      setBootError("");

      if (magicToken) {
        setMagicLinkPending(true);
        try {
          await verifyViaticosManualMagicLink({ token: magicToken });
          clearMagicTokenFromUrl();
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
    } = supabaseViaticosManualPublic.auth.onAuthStateChange((event, nextSession) => {
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
      setTimeout(() => {
        if (!cancelled) loadProfile();
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const onLogout = useCallback(async () => {
    await logoutViaticosManual();
    clearGuestBypass();
    setGuestBypassState(false);
    setSession(null);
    setProfile(null);
    activeUserIdRef.current = null;
  }, []);

  const continueAsGuest = useCallback(() => {
    setGuestBypass();
    setGuestBypassState(true);
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const openSavedPanel = useCallback(() => setSavedPanelOpen(true), []);
  const closeSavedPanel = useCallback(() => setSavedPanelOpen(false), []);

  const isAuthenticated = Boolean(session?.user && profile);
  const needsProfile = Boolean(session?.user && !profile && profileChecked);
  const canAccessApp = isAuthenticated || guestBypass;

  useEffect(() => {
    if (!isAuthenticated) return;
    clearGuestBypass();
    setGuestBypassState(false);
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading: loading || magicLinkPending || (session?.user && !profileChecked),
      bootError,
      isAuthenticated,
      isGuest: guestBypass && !isAuthenticated,
      guestBypass,
      canAccessApp,
      needsProfile,
      loginOpen,
      savedPanelOpen,
      openLogin,
      closeLogin,
      continueAsGuest,
      openSavedPanel,
      closeSavedPanel,
      onLogout,
      loadProfile,
      setBootError,
      registerLoadHandlers,
      loadSavedViatico,
      loadSavedRendicion,
    }),
    [
      session,
      profile,
      loading,
      magicLinkPending,
      profileChecked,
      bootError,
      isAuthenticated,
      guestBypass,
      canAccessApp,
      needsProfile,
      loginOpen,
      savedPanelOpen,
      openLogin,
      closeLogin,
      continueAsGuest,
      openSavedPanel,
      closeSavedPanel,
      onLogout,
      loadProfile,
      registerLoadHandlers,
      loadSavedViatico,
      loadSavedRendicion,
    ],
  );

  return (
    <ViaticosManualAuthContext.Provider value={value}>
      {children}
    </ViaticosManualAuthContext.Provider>
  );
}

export function useViaticosManualAuth() {
  const ctx = useContext(ViaticosManualAuthContext);
  if (!ctx) {
    throw new Error("useViaticosManualAuth debe usarse dentro de ViaticosManualAuthProvider");
  }
  return ctx;
}
