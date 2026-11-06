import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
import { IconRefresh, IconX } from "./Icons";
import {
  applyPwaUpdate,
  isSilentVersionUpdateRoute,
  isTransporteScrnRoute,
  resolveServiceWorkerRegistration,
} from "../../utils/pwaApplyUpdate";
import { hasUnsavedWork } from "../../utils/unsavedWork";
import {
  clearFreshNav,
  freshNavRecently,
  freshStartHref,
  markFreshNav,
  FRESH_OPEN_KEY,
} from "../../utils/freshStart.js";

/** Idle poll: 15 min, and only while the tab is visible. Focus / visibility / navegación siguen chequeando al toque. */
const VERSION_POLL_MS = 15 * 60 * 1000;
const SILENT_SW_POLL_MS = 15 * 60 * 1000;
/** Una auto-aplicación por entrada a Transporte. Sobrevive el reload del apply y corta el bucle. */
const TRANSPORTE_AUTO_KEY = "ofrn:transporte-auto-apply-at";
const TRANSPORTE_AUTO_WINDOW_MS = 60_000;
const LOCAL_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID ?? "";

function clearVersionMatchStamps() {
  clearFreshNav(sessionStorage);
  clearTransporteAutoStamp();
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

function readFreshOpen() {
  try {
    const on = sessionStorage.getItem(FRESH_OPEN_KEY) === "1";
    if (on) sessionStorage.removeItem(FRESH_OPEN_KEY);
    return on;
  } catch {
    return false;
  }
}

async function fetchRemoteBuildId({ reload = false } = {}) {
  try {
    // Sin cache-buster en el poll habitual: el browser respeta max-age de /version.json.
    // Tras /refrescar.html se revalida una vez, porque ese archivo puede seguir 60 s con el build viejo.
    const res = await fetch("/version.json", reload ? { cache: "reload" } : undefined);
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
 * - Al cambiar de ruta sin trabajo dirty: abre `/refrescar.html?next=` (mismo rescate que el botón).
 * - Si hay dirty (FIMBA planilla/modal, data-unsaved-work): solo banner.
 * - /entradas, /viaticos-manual y /rendiciones-manual: al detectar build nuevo
 *   van solas a `/refrescar.html`, sin banner. El sello de 60 s corta el bucle.
 * - /transporte-scrn: al detectar build nuevo, el mismo destino, una vez por entrada.
 *   El botón queda para reintentar, con estética SCRN.
 * - version.json: poll 15 min (pestaña visible) + check en foco/navegación; cache browser 60 s.
 * - Un tap: `location.replace` a `/refrescar.html?next=` (la página suelta el SW y vuelve).
 *   Sin red: toast. El auto-apply no repite dentro de 60 s; el tap sí.
 */
function ReloadPromptProd() {
  const { pathname, search } = useLocation();
  const silentVersionUpdate = isSilentVersionUpdateRoute(pathname);
  const isTransporte = isTransporteScrnRoute(pathname);
  const transporteAutoFiredRef = useRef(false);
  const swRegistrationRef = useRef(null);
  const pathnameRef = useRef(pathname);
  const searchRef = useRef(search);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  /** Build remoto distinto del embebido (sin depender solo del SW). */
  const [buildOutdated, setBuildOutdated] = useState(false);
  /** Entrada desde /refrescar.html: la página ya es la versión nueva. */
  const [openedFresh, setOpenedFresh] = useState(readFreshOpen);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
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
  });

  const updateAvailable = needRefresh || buildOutdated;

  const openFreshStart = useCallback(
    (manual) => {
      const online = typeof navigator === "undefined" || navigator.onLine !== false;
      if (!online) {
        if (!silentVersionUpdate) {
          toast.error(
            "No hay conexión para completar la actualización. Intentá de nuevo cuando tengas red.",
          );
        }
        return false;
      }
      if (!manual && freshNavRecently(sessionStorage)) return false;
      markFreshNav(sessionStorage);
      if (isTransporte) markTransporteAutoStamp();
      const next = `${pathnameRef.current}${searchRef.current || ""}`;
      try {
        window.location.replace(freshStartHref(next));
      } catch (error) {
        console.error("SW update failed", error);
        if (!silentVersionUpdate) {
          toast.error(
            "No se pudo actualizar. Cerrá la app y volvé a abrirla, o intentá de nuevo.",
          );
        }
        return false;
      }
      return true;
    },
    [isTransporte, silentVersionUpdate],
  );

  const checkForNewVersion = useCallback(async () => {
    const registration = await resolveServiceWorkerRegistration(
      swRegistrationRef.current,
    );
    if (registration) swRegistrationRef.current = registration;
    registration?.update();
    if (!LOCAL_BUILD_ID) {
      if (openedFresh) setOpenedFresh(false);
      return;
    }
    const remote = await fetchRemoteBuildId({ reload: openedFresh });
    if (openedFresh) setOpenedFresh(false);
    if (!remote) return;
    if (remote === LOCAL_BUILD_ID) {
      clearVersionMatchStamps();
      setBuildOutdated(false);
      return;
    }
    setBuildOutdated(true);
  }, [openedFresh]);

  // Al cambiar de ruta: si hay update pendiente y no hay dirty → aplicar.
  // Si hay dirty → dejar el banner (no interrumpir edición).
  useEffect(() => {
    const prevPath = pathnameRef.current;
    pathnameRef.current = pathname;
    searchRef.current = search;
    void checkForNewVersion();

    if (openedFresh) return;
    // El shell viejo a veces se sirve en esta URL. No es un cambio de sección:
    // mandar otra vez a refrescar tira el `next` y abre el inicio.
    if (pathname === "/refrescar.html") return;
    if (prevPath === pathname) return;
    if (silentVersionUpdate) return;
    if (!needRefresh && !buildOutdated) return;
    if (hasUnsavedWork()) {
      setBannerDismissed(false);
      return;
    }
    openFreshStart(false);
  }, [
    pathname,
    search,
    checkForNewVersion,
    silentVersionUpdate,
    needRefresh,
    buildOutdated,
    openFreshStart,
    openedFresh,
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
    if (openedFresh) return;
    if (!needRefresh && !buildOutdated) {
      setBannerDismissed(false);
      return;
    }
    if (silentVersionUpdate) {
      openFreshStart(false);
      return;
    }
    if (!isTransporte) return;
    if (transporteAutoFiredRef.current) return;
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
    openFreshStart(false);
  }, [silentVersionUpdate, isTransporte, needRefresh, buildOutdated, openFreshStart, openedFresh]);

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
    if (hasUnsavedWork()) {
      const ok = window.confirm(
        "Hay cambios sin guardar. Si actualizás ahora, se pueden perder. ¿Actualizar de todos modos?"
      );
      if (!ok) return;
    }
    openFreshStart(true);
  }, [openFreshStart]);

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
    updateAvailable && !openedFresh && !silentVersionUpdate && !bannerDismissed;

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
    </>
  );
}

export default ReloadPrompt;
