import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { IconLoader, IconRefresh, IconX } from "./Icons";
import {
  applyPwaUpdate,
  isSilentVersionUpdateRoute,
  isTransporteScrnRoute,
  resolveServiceWorkerRegistration,
} from "../../utils/pwaApplyUpdate";
import { hasUnsavedWork } from "../../utils/unsavedWork";

/** Idle poll: 15 min, and only while the tab is visible. Focus / visibility / navegación siguen chequeando al toque. */
const VERSION_POLL_MS = 15 * 60 * 1000;
const SILENT_SW_POLL_MS = 15 * 60 * 1000;
const RELOAD_GUARD_KEY = "ofrn:pwa-reload-guard";
const PRELOAD_RELOAD_KEY = "ofrn:preload-reload";
const RELOAD_GUARD_WINDOW_MS = 15_000;
const RELOAD_GUARD_MAX = 2;
/** Una auto-aplicación por entrada a Transporte. Sobrevive el reload del apply y corta el bucle. */
const TRANSPORTE_AUTO_KEY = "ofrn:transporte-auto-apply-at";
const TRANSPORTE_AUTO_WINDOW_MS = 60_000;
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

function readTransporteAutoStamp() {
  try {
    const n = Number(sessionStorage.getItem(TRANSPORTE_AUTO_KEY) || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function markTransporteAutoStamp() {
  try {
    sessionStorage.setItem(TRANSPORTE_AUTO_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function clearTransporteAutoStamp() {
  try {
    sessionStorage.removeItem(TRANSPORTE_AUTO_KEY);
  } catch {
    /* ignore */
  }
}

function transporteAutoRecentlyFired() {
  const stamp = readTransporteAutoStamp();
  return stamp > 0 && Date.now() - stamp < TRANSPORTE_AUTO_WINDOW_MS;
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

function UpdateAvailableBanner({ onUpdate, onDismiss, subtitle, tone = "staff" }) {
  const scrn = tone === "scrn";
  return (
    <div
      className={
        scrn
          ? "scrn-square fixed top-3 right-3 z-[9999] w-[min(260px,calc(100vw-1.5rem))] border border-[#c5d0dc] bg-white shadow-sm"
          : "fixed top-3 right-3 z-[9999] w-[min(240px,calc(100vw-1.5rem))] rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
      }
      role="status"
      aria-live="polite"
    >
      <div
        className={
          scrn
            ? "flex items-start gap-1 border-t-4 border-[#0054a6] px-3 pb-1.5 pt-2.5"
            : "flex items-start gap-1 pl-2.5 pr-1 pt-2 pb-1.5"
        }
      >
        <div className="flex-1 pt-0.5">
          {scrn ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0054a6]">
              Transporte SCRN
            </p>
          ) : null}
          <p
            className={
              scrn
                ? "text-xs font-black leading-snug text-slate-900"
                : "text-[11px] leading-snug font-semibold text-slate-700"
            }
          >
            Nueva versión disponible
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={
            scrn
              ? "shrink-0 p-0.5 text-slate-400 hover:bg-[#e8f1fa] hover:text-[#003d7a]"
              : "shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }
          aria-label="Ocultar aviso por ahora"
        >
          <IconX size={12} />
        </button>
      </div>
      <div className={scrn ? "px-3 pb-3" : "px-2 pb-2"}>
        <button
          type="button"
          onClick={onUpdate}
          className={
            scrn
              ? "scrn-btn-primary inline-flex w-full items-center justify-center gap-1.5 px-2 py-1.5 text-[10px]"
              : "w-full inline-flex items-center justify-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-indigo-700"
          }
        >
          <IconRefresh size={12} />
          Actualizar versión
        </button>
      </div>
    </div>
  );
}

/**
 * En `vite` serve no hay SW ni banner: igual se llama `applyPwaUpdate` una vez
 * al entrar a Transporte, sin nuke ni reload (allowNuke recargaría en bucle).
 * El sello en sessionStorage sobrevive un reload y corta un segundo intento.
 */
let transporteDevProbeStarted = false;

function TransporteDevUpdateProbe() {
  const { pathname } = useLocation();
  const isTransporte = isTransporteScrnRoute(pathname);

  useEffect(() => {
    if (!isTransporte) {
      transporteDevProbeStarted = false;
      clearTransporteAutoStamp();
      return;
    }
    if (transporteDevProbeStarted) return;
    if (transporteAutoRecentlyFired()) {
      transporteDevProbeStarted = true;
      document.documentElement.dataset.transporteVersionUpdate = "skipped-guard";
      return;
    }
    transporteDevProbeStarted = true;
    markTransporteAutoStamp();
    document.documentElement.dataset.transporteVersionUpdate = "called";
    void applyPwaUpdate({
      allowNuke: false,
      reload: () => false,
    });
  }, [isTransporte]);

  return null;
}

function ReloadPrompt() {
  // En `vite` local, Vite ya maneja HMR. Poll de version.json + auto-reload
  // es solo para deploys: con APP_BUILD_ID aleatorio por restart de Vite
  // disparaba "Nueva versión" / hard reload al cambiar de ruta.
  if (import.meta.env.DEV) {
    return <TransporteDevUpdateProbe />;
  }

  return <ReloadPromptProd />;
}

/**
 * Actualizaciones de deploy (Vercel + PWA):
 * - Staff: nunca fuerza reload mid-sesión; banner «Nueva versión / Actualizar versión».
 * - Al cambiar de ruta sin trabajo dirty: aplica la SW waiting (navegación limpia).
 * - Si hay dirty (FIMBA planilla/modal, data-unsaved-work): solo banner.
 * - /entradas, /viaticos-manual y /rendiciones-manual: al cargar (y al detectar
 *   build nuevo) recargan solas, sin banner ni overlay.
 * - /transporte-scrn: al detectar build nuevo, aplica solo (mismo `beginApplyUpdate`
 *   que el botón). Una vez por entrada (sessionStorage 60 s) para no recargar en bucle.
 *   El botón queda para reintentar, con estética SCRN. Viáticos y rendiciones no cambian.
 * - version.json: poll 15 min (pestaña visible) + check en foco/navegación; cache browser 60 s.
 * - Un tap: espera waiting (updatefound → installed) → skipWaiting → controllerchange → reload.
 *   Si no hay waiting y el build está desfasado: unregister + clear caches + reload.
 */
function ReloadPromptProd() {
  const { pathname } = useLocation();
  const silentVersionUpdate = isSilentVersionUpdateRoute(pathname);
  const isTransporte = isTransporteScrnRoute(pathname);
  const transporteAutoFiredRef = useRef(false);
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
      if (!silentVersionUpdate) {
        toast.error(message);
      }
      return false;
    },
    [silentVersionUpdate, resetApplyUi],
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
    if (isTransporte) markTransporteAutoStamp();
    restartStartedRef.current = true;
    setIsRestarting(true);
    void applyWaitingServiceWorker();
  }, [applyWaitingServiceWorker, isTransporte]);

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
      clearTransporteAutoStamp();
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
    if (silentVersionUpdate) return;
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
    silentVersionUpdate,
    needRefresh,
    buildOutdated,
    beginApplyUpdate,
  ]);

  // Salir de Transporte libera el sello: la próxima entrada puede auto-aplicar de nuevo.
  useEffect(() => {
    if (isTransporte) return;
    transporteAutoFiredRef.current = false;
    clearTransporteAutoStamp();
  }, [isTransporte]);

  // Rutas silenciosas: auto-aplicar sin banner.
  // Transporte: mismo apply que el botón, una vez por entrada, si hay versión nueva.
  useEffect(() => {
    if (!needRefresh && !buildOutdated) {
      setBannerDismissed(false);
      return;
    }
    if (silentVersionUpdate) {
      if (restartStartedRef.current) return;
      beginApplyUpdate();
      return;
    }
    if (!isTransporte) return;
    if (restartStartedRef.current || transporteAutoFiredRef.current) return;
    if (hasUnsavedWork()) {
      setBannerDismissed(false);
      return;
    }
    if (transporteAutoRecentlyFired()) {
      transporteAutoFiredRef.current = true;
      return;
    }
    transporteAutoFiredRef.current = true;
    markTransporteAutoStamp();
    beginApplyUpdate();
  }, [silentVersionUpdate, isTransporte, needRefresh, buildOutdated, beginApplyUpdate]);

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
    if (!silentVersionUpdate) return undefined;

    const poll = () => swRegistrationRef.current?.update();
    const intervalId = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      poll();
    }, SILENT_SW_POLL_MS);

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
  }, [silentVersionUpdate]);

  const showBanner =
    updateAvailable && !silentVersionUpdate && !isRestarting && !bannerDismissed;

  const bannerSubtitle = hasUnsavedWork()
    ? "Hay cambios sin guardar: guardá o descartá antes de actualizar."
    : "Podés seguir trabajando; actualizá cuando te convenga.";

  return (
    <>
      {showBanner && (
        <UpdateAvailableBanner
          tone={isTransporte ? "scrn" : "staff"}
          onUpdate={handleApplyUpdate}
          onDismiss={() => {
            // Solo oculta el banner; needRefresh/buildOutdated siguen para
            // aplicar en la próxima navegación limpia.
            setBannerDismissed(true);
          }}
          subtitle={bannerSubtitle}
        />
      )}
      {isRestarting && !silentVersionUpdate && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6"
          role="alert"
          aria-live="assertive"
          aria-busy="true"
        >
          <div
            className={
              isTransporte
                ? "scrn-square flex max-w-sm flex-col items-center gap-4 border border-[#c5d0dc] border-t-4 border-t-[#0054a6] bg-white p-8 text-center shadow-sm"
                : "bg-white border-2 border-indigo-500 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center"
            }
          >
            <IconLoader size={32} className={isTransporte ? "text-[#0054a6]" : "text-indigo-600"} />
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
