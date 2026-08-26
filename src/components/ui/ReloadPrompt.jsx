import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { IconLoader, IconRefresh, IconX } from "./Icons";
import { hasUnsavedWork } from "../../utils/unsavedWork";

/** Rutas públicas de Entradas: actualización silenciosa sin overlay ni banner. */
export function isEntradasPublicRoute(pathname = "") {
  return String(pathname || "").startsWith("/entradas");
}

const VERSION_POLL_MS = 2 * 60 * 1000;
const ENTRADAS_SW_POLL_MS = 5 * 60 * 1000;
const RESTART_MESSAGE_MS = 400;
/** iOS PWA a veces no dispara `controlling`; recarga única de respaldo. */
const RELOAD_FALLBACK_MS = 2500;
const RELOAD_GUARD_KEY = "ofrn:pwa-reload-guard";
const PRELOAD_RELOAD_KEY = "ofrn:preload-reload";
const RELOAD_GUARD_WINDOW_MS = 15_000;
const RELOAD_GUARD_MAX = 2;
const LOCAL_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID ?? "";

function readReloadGuard() {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return { count: 0, startedAt: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0, startedAt: 0 };
  }
}

function markReloadAttempt() {
  const now = Date.now();
  const prev = readReloadGuard();
  const inWindow = prev.startedAt && now - prev.startedAt < RELOAD_GUARD_WINDOW_MS;
  const count = inWindow ? prev.count + 1 : 1;
  const startedAt = inWindow ? prev.startedAt : now;
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ count, startedAt }));
  } catch {
    /* ignore */
  }
  return count;
}

function clearReloadGuards() {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
    sessionStorage.removeItem(PRELOAD_RELOAD_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchRemoteBuildId() {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.buildId ?? null;
  } catch {
    return null;
  }
}

function UpdateAvailableBanner({ onUpdate, onDismiss, subtitle }) {
  return (
    <div
      className="fixed top-3 right-3 z-[9999] w-[min(240px,calc(100vw-1.5rem))] rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-1 pl-2.5 pr-1 pt-2 pb-1.5">
        <div className="flex-1 pt-0.5">
          <p className="text-[11px] leading-snug font-semibold text-slate-700">
            Nueva versión disponible
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Ocultar aviso por ahora"
        >
          <IconX size={12} />
        </button>
      </div>
      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={onUpdate}
          className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-indigo-700"
        >
          <IconRefresh size={11} />
          Actualizar
        </button>
      </div>
    </div>
  );
}

/**
 * Actualizaciones de deploy (Vercel + PWA):
 * - Staff: nunca fuerza reload mid-sesión; banner «Nueva versión / Actualizar».
 * - Al cambiar de ruta sin trabajo dirty: aplica la SW waiting (navegación limpia).
 * - Si hay dirty (FIMBA planilla/modal, data-unsaved-work): solo banner.
 * - /entradas: sigue en modo silencioso (público).
 * - version.json: detecta build nuevo aunque el SW tarde en needRefresh.
 */
function ReloadPrompt() {
  const { pathname } = useLocation();
  const entradasSilentUpdate = isEntradasPublicRoute(pathname);
  const swRegistrationRef = useRef(null);
  const restartStartedRef = useRef(false);
  const reloadPendingRef = useRef(false);
  const fallbackTimerRef = useRef(null);
  const pathnameRef = useRef(pathname);
  const [isRestarting, setIsRestarting] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  /** Build remoto distinto del embebido (sin depender solo del SW). */
  const [buildOutdated, setBuildOutdated] = useState(false);

  const reloadPageWithGuard = useCallback(() => {
    if (reloadPendingRef.current) return false;
    const count = markReloadAttempt();
    if (count > RELOAD_GUARD_MAX) {
      console.warn("[PWA] Recargas repetidas detectadas; se detiene la actualización automática.");
      reloadPendingRef.current = false;
      restartStartedRef.current = false;
      setIsRestarting(false);
      return false;
    }
    reloadPendingRef.current = true;
    window.location.reload();
    return true;
  }, []);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current != null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const scheduleIosFallbackReload = useCallback(() => {
    clearFallbackTimer();
    fallbackTimerRef.current = window.setTimeout(() => {
      fallbackTimerRef.current = null;
      reloadPageWithGuard();
    }, RELOAD_FALLBACK_MS);
  }, [clearFallbackTimer, reloadPageWithGuard]);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      swRegistrationRef.current = r ?? null;
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
    onNeedReload() {
      clearFallbackTimer();
      reloadPageWithGuard();
    },
  });

  const updateAvailable = needRefresh || buildOutdated;

  const applyWaitingServiceWorker = useCallback(async () => {
    const registration = swRegistrationRef.current;
    if (registration?.waiting) {
      scheduleIosFallbackReload();
      try {
        await updateServiceWorker(true);
        return true;
      } catch (error) {
        console.error("SW update failed", error);
        clearFallbackTimer();
        reloadPendingRef.current = false;
        restartStartedRef.current = false;
        setIsRestarting(false);
        return false;
      }
    }
    // Sin SW waiting (solo version.json): hard reload.
    clearFallbackTimer();
    return reloadPageWithGuard();
  }, [
    clearFallbackTimer,
    reloadPageWithGuard,
    scheduleIosFallbackReload,
    updateServiceWorker,
  ]);

  const beginApplyUpdate = useCallback(() => {
    if (restartStartedRef.current) return;
    restartStartedRef.current = true;
    setIsRestarting(true);
    window.setTimeout(() => {
      void applyWaitingServiceWorker();
    }, RESTART_MESSAGE_MS);
  }, [applyWaitingServiceWorker]);

  const checkForNewVersion = useCallback(async () => {
    swRegistrationRef.current?.update();
    if (!LOCAL_BUILD_ID) return;
    const remote = await fetchRemoteBuildId();
    if (!remote) return;
    if (remote === LOCAL_BUILD_ID) {
      clearReloadGuards();
      setBuildOutdated(false);
      return;
    }
    setBuildOutdated(true);
  }, []);

  // Al cambiar de ruta: si hay update pendiente y no hay dirty → aplicar.
  // Si hay dirty → dejar el banner (no interrumpir edición).
  useEffect(() => {
    const prevPath = pathnameRef.current;
    pathnameRef.current = pathname;
    void checkForNewVersion();

    if (prevPath === pathname) return;
    if (entradasSilentUpdate) return;
    if (!needRefresh && !buildOutdated) return;
    if (restartStartedRef.current) return;
    if (hasUnsavedWork()) {
      setBannerDismissed(false);
      return;
    }
    beginApplyUpdate();
  }, [
    pathname,
    checkForNewVersion,
    entradasSilentUpdate,
    needRefresh,
    buildOutdated,
    beginApplyUpdate,
  ]);

  // Entradas: auto-aplicar. Staff: solo reabrir banner si el update vuelve tras estar al día.
  useEffect(() => {
    if (!needRefresh && !buildOutdated) {
      setBannerDismissed(false);
      return;
    }
    if (entradasSilentUpdate) {
      if (restartStartedRef.current) return;
      beginApplyUpdate();
    }
  }, [entradasSilentUpdate, needRefresh, buildOutdated, beginApplyUpdate]);

  useEffect(() => {
    if (!LOCAL_BUILD_ID) return undefined;

    void checkForNewVersion();
    const intervalId = window.setInterval(checkForNewVersion, VERSION_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForNewVersion();
    };
    const onFocus = () => void checkForNewVersion();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkForNewVersion]);

  const handleApplyUpdate = useCallback(() => {
    if (restartStartedRef.current) return;

    if (hasUnsavedWork()) {
      const ok = window.confirm(
        "Hay cambios sin guardar. Si actualizás ahora, se pueden perder. ¿Actualizar de todos modos?"
      );
      if (!ok) return;
    }

    const registration = swRegistrationRef.current;
    if (!registration?.waiting && !buildOutdated) {
      void registration?.update();
      void checkForNewVersion();
      return;
    }

    beginApplyUpdate();
  }, [beginApplyUpdate, buildOutdated, checkForNewVersion]);

  useEffect(() => {
    if (!offlineReady) return;
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!entradasSilentUpdate) return undefined;

    const poll = () => swRegistrationRef.current?.update();
    const intervalId = window.setInterval(poll, ENTRADAS_SW_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", poll);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", poll);
    };
  }, [entradasSilentUpdate]);

  useEffect(() => () => clearFallbackTimer(), [clearFallbackTimer]);

  const showBanner =
    updateAvailable && !entradasSilentUpdate && !isRestarting && !bannerDismissed;

  const bannerSubtitle = hasUnsavedWork()
    ? "Hay cambios sin guardar: guardá o descartá antes de actualizar."
    : "Podés seguir trabajando; actualizá cuando te convenga.";

  return (
    <>
      {showBanner && (
        <UpdateAvailableBanner
          onUpdate={handleApplyUpdate}
          onDismiss={() => {
            // Solo oculta el banner; needRefresh/buildOutdated siguen para
            // aplicar en la próxima navegación limpia.
            setBannerDismissed(true);
          }}
          subtitle={bannerSubtitle}
        />
      )}
      {isRestarting && !entradasSilentUpdate && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6"
          role="alert"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="bg-white border-2 border-indigo-500 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center">
            <IconLoader size={32} className="text-indigo-600" />
            <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-snug">
              Estamos reiniciando la aplicación para que disfrutes de la versión más
              actualizada
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ReloadPrompt;
