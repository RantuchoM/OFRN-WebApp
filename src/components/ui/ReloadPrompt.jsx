import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRegisterSW } from "virtual:pwa-register/react";
import { IconLoader } from "./Icons";

/** Rutas públicas de Entradas: actualización silenciosa sin overlay. */
export function isEntradasPublicRoute(pathname = "") {
  return String(pathname || "").startsWith("/entradas");
}

const ENTRADAS_SW_POLL_MS = 5 * 60 * 1000;
const RESTART_MESSAGE_MS = 1600;

function ReloadPrompt() {
  const { pathname } = useLocation();
  const entradasSilentUpdate = isEntradasPublicRoute(pathname);
  const swRegistrationRef = useRef(null);
  const restartStartedRef = useRef(false);
  const [isRestarting, setIsRestarting] = useState(false);

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

  useEffect(() => {
    if (!entradasSilentUpdate || !needRefresh) return;
    void updateServiceWorker(true);
  }, [entradasSilentUpdate, needRefresh, updateServiceWorker]);

  useEffect(() => {
    if (entradasSilentUpdate || !needRefresh || restartStartedRef.current) return;

    restartStartedRef.current = true;
    setIsRestarting(true);

    const timerId = window.setTimeout(() => {
      void updateServiceWorker(true);
    }, RESTART_MESSAGE_MS);

    return () => window.clearTimeout(timerId);
  }, [entradasSilentUpdate, needRefresh, updateServiceWorker]);

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

  if (entradasSilentUpdate || !isRestarting) return null;

  return (
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
  );
}

export default ReloadPrompt;
