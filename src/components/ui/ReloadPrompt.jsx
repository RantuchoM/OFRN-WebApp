import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { IconLoader, IconRefresh, IconX } from "./Icons";

/** Rutas públicas de Entradas: actualización silenciosa sin overlay ni banner. */
export function isEntradasPublicRoute(pathname = "") {
  return String(pathname || "").startsWith("/entradas");
}

const VERSION_POLL_MS = 2 * 60 * 1000;
const ENTRADAS_SW_POLL_MS = 5 * 60 * 1000;
const RESTART_MESSAGE_MS = 400;
const LOCAL_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID ?? "";

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

function UpdateAvailableBanner({ onUpdate, onDismiss }) {
  return (
    <div
      className="fixed top-3 right-3 z-[9999] w-[min(220px,calc(100vw-1.5rem))] rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-1 pl-2.5 pr-1 pt-2 pb-1.5">
        <p className="flex-1 text-[11px] leading-snug text-slate-600 pt-0.5">
          Nueva versión disponible
        </p>
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

function ReloadPrompt() {
  const { pathname } = useLocation();
  const entradasSilentUpdate = isEntradasPublicRoute(pathname);
  const swRegistrationRef = useRef(null);
  const restartStartedRef = useRef(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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
  });

  const markUpdateAvailable = useCallback(() => {
    setUpdateAvailable(true);
    setBannerDismissed(false);
  }, []);

  const checkForNewVersion = useCallback(async () => {
    swRegistrationRef.current?.update();
    if (!LOCAL_BUILD_ID) return;
    const remote = await fetchRemoteBuildId();
    if (remote && remote !== LOCAL_BUILD_ID) {
      markUpdateAvailable();
    }
  }, [markUpdateAvailable]);

  useEffect(() => {
    if (!needRefresh) return;
    if (entradasSilentUpdate) {
      void updateServiceWorker(true);
      return;
    }
    markUpdateAvailable();
  }, [entradasSilentUpdate, needRefresh, updateServiceWorker, markUpdateAvailable]);

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
    restartStartedRef.current = true;
    setIsRestarting(true);
    window.setTimeout(() => {
      void updateServiceWorker(true);
    }, RESTART_MESSAGE_MS);
  }, [updateServiceWorker]);

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

  const showBanner =
    updateAvailable && !entradasSilentUpdate && !isRestarting && !bannerDismissed;

  return (
    <>
      {showBanner && (
        <UpdateAvailableBanner
          onUpdate={handleApplyUpdate}
          onDismiss={() => setBannerDismissed(true)}
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
