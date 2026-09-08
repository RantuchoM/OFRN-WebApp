import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { IconLoader, IconRefresh, IconX } from "./Icons";
import {
  applyPwaUpdate,
  resolveServiceWorkerRegistration,
} from "../../utils/pwaApplyUpdate";
import { hasUnsavedWork } from "../../utils/unsavedWork";

/** Rutas públicas de Entradas: actualización silenciosa sin overlay ni banner. */
function isEntradasPublicRoute(pathname = "") {
  return String(pathname || "").startsWith("/entradas");
}

/** Idle poll: 15 min, and only while the tab is visible. Focus / visibility / navegación siguen chequeando al toque. */
const VERSION_POLL_MS = 15 * 60 * 1000;
const ENTRADAS_SW_POLL_MS = 15 * 60 * 1000;
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

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

async function fetchRemoteBuildId() {
  try {
    // Sin cache-buster ni no-store: el browser puede respetar max-age de /version.json
    // y no generar un Edge Request en Vercel en cada navegación/foco.
    const res = await fetch("/version.json");
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
          Actualizar versión
        </button>
      </div>
    </div>
  );
}

function ReloadPrompt() {
  // En `vite` local, Vite ya maneja HMR. Poll de version.json + auto-reload
  // es solo para deploys: con APP_BUILD_ID aleatorio por restart de Vite
  // disparaba "Nueva versión" / hard reload al cambiar de ruta.
  if (import.meta.env.DEV) {
    return null;
  }

  return <ReloadPromptProd />;
}

/**
 * Actualizaciones de deploy (Vercel + PWA):
 * - Staff: nunca fuerza reload mid-sesión; banner «Nueva versión / Actualizar versión».
 * - Al cambiar de ruta sin trabajo dirty: aplica la SW waiting (navegación limpia).
 * - Si hay dirty (FIMBA planilla/modal, data-unsaved-work): solo banner.
 * - /entradas: sigue en modo silencioso (público).
 * - version.json: poll 15 min (pestaña visible) + check en foco/navegación; cache browser 60 s.
 * - Un tap: espera waiting (updatefound → installed) → skipWaiting → controllerchange → reload.
 *   Si no hay waiting y el build está desfasado: unregister + clear caches + reload.
 */
function ReloadPromptProd() {
  const { pathname } = useLocation();
  const entradasSilentUpdate = isEntradasPublicRoute(pathname);
  const swRegistrationRef = useRef(null);
  const restartStartedRef = useRef(false);
  const reloadPendingRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const [isRestarting, setIsRestarting] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  /** Build remoto distinto del embebido (sin depender solo del SW). */
  const [buildOutdated, setBuildOutdated] = useState(false);

  const resetApplyUi = useCallback(() => {
    reloadPendingRef.current = false;
    restartStartedRef.current = false;
    setIsRestarting(false);
  }, []);

  const reloadPageWithGuard = useCallback(() => {
    if (reloadPendingRef.current) return false;
    const count = markReloadAttempt();
    if (count > RELOAD_GUARD_MAX) {
      console.warn("[PWA] Recargas repetidas detectadas; se detiene la actualización automática.");
      resetApplyUi();
      return false;
    }
    reloadPendingRef.current = true;
    window.location.reload();
    return true;
  }, [resetApplyUi]);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) swRegistrationRef.current = r;
    },
    onRegisteredSW(_swUrl, r) {
      if (r) swRegistrationRef.current = r;
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
    onNeedReload() {
      reloadPageWithGuard();
    },
  });

  const updateAvailable = needRefresh || buildOutdated;

  const failApplyUpdate = useCallback(
    (message) => {
      console.warn("[PWA] No se pudo aplicar la actualización:", message);
      resetApplyUi();
      if (!entradasSilentUpdate) {
        toast.error(message);
      }
      return false;
    },
    [entradasSilentUpdate, resetApplyUi],
  );

  const applyWaitingServiceWorker = useCallback(async () => {
    try {
      const registration = await resolveServiceWorkerRegistration(
        swRegistrationRef.current,
      );
      if (registration) swRegistrationRef.current = registration;
      const result = await applyPwaUpdate({
        registration,
        updateServiceWorker,
        allowNuke: true,
        reload: reloadPageWithGuard,
      });
      if (!result.ok) {
        return failApplyUpdate(
          result.error ||
            "No se pudo actualizar. Cerrá la app y volvé a abrirla, o intentá de nuevo.",
        );
      }
      return true;
    } catch (error) {
      console.error("SW update failed", error);
      return failApplyUpdate(
        "No se pudo actualizar. Cerrá la app y volvé a abrirla, o intentá de nuevo.",
      );
    }
  }, [failApplyUpdate, reloadPageWithGuard, updateServiceWorker]);

  const beginApplyUpdate = useCallback(() => {
    if (restartStartedRef.current) return;
    restartStartedRef.current = true;
    setIsRestarting(true);
    void applyWaitingServiceWorker();
  }, [applyWaitingServiceWorker]);

  const checkForNewVersion = useCallback(async () => {
    const registration = await resolveServiceWorkerRegistration(
      swRegistrationRef.current,
    );
    if (registration) swRegistrationRef.current = registration;
    registration?.update();
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
    const intervalId = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      void checkForNewVersion();
    }, VERSION_POLL_MS);

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

    // Un tap siempre entra al apply: espera waiting si hace falta.
    // El early-return previo (update() sin await) era un no-op silencioso.
    beginApplyUpdate();
  }, [beginApplyUpdate]);

  useEffect(() => {
    if (!offlineReady) return;
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!entradasSilentUpdate) return undefined;

    const poll = () => swRegistrationRef.current?.update();
    const intervalId = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      poll();
    }, ENTRADAS_SW_POLL_MS);

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
            <p className="text-[11px] font-semibold text-slate-500 leading-snug">
              Un momento: estamos activando la versión nueva.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default ReloadPrompt;
