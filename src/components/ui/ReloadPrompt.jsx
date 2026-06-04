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
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 px-4 py-2.5 bg-indigo-700 text-white shadow-lg border-b border-indigo-800"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-center">
        Hay una versión nueva de la aplicación.
      </p>
      <button
        type="button"
        onClick={onUpdate}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-800 hover:bg-indigo-50"
      >
        <IconRefresh size={14} />
        Actualizar
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1.5 text-indigo-100 hover:bg-indigo-600 hover:text-white"
        aria-label="Ocultar aviso por ahora"
      >
        <IconX size={16} />
      </button>
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
