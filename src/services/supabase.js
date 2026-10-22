import { createClient } from "@supabase/supabase-js";

// En un proyecto real, esto iría en un archivo .env, pero para empezar está bien aquí
const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

const OFICINA_EXTERNA_SESSION_KEY = "sb-ofrn-oficina-externa-session";

/**
 * Vite HMR re-ejecuta este módulo y volvía a llamar createClient → GoTrue
 * pelea el mismo navigator.lock (`sb-…-auth-token`) y spamea
 * «Lock was not released within 5000ms». Un solo cliente por pestaña.
 */
const g = globalThis;

function getOrCreateClient(slot, factory) {
  if (!g[slot]) g[slot] = factory();
  return g[slot];
}

/** Copia sesión OTP previa (viáticos-manual o SCRN) al storage unificado. */
function migrateLegacyOficinaExternaSession() {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(OFICINA_EXTERNA_SESSION_KEY)) return;
  const legacyKeys = [
    "sb-ofrn-viaticos-manual-session",
    "sb-muxrbuivopnawnxlcjxq-auth-token",
  ];
  for (const key of legacyKeys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      localStorage.setItem(OFICINA_EXTERNA_SESSION_KEY, raw);
      break;
    }
  }
}

migrateLegacyOficinaExternaSession();

export const supabase = getOrCreateClient("__ofrn_supabase", () =>
  createClient(SB_URL, SB_KEY),
);

/**
 * Sesión aislada del resto de la app: no se borra al cerrar sesión en la intranet.
 * Persistida en localStorage + auto-refresh: el dispositivo permanece logueado
 * mientras el refresh token sea válido (no se limpia al cerrar el navegador).
 */
export const supabaseEntradasPublic = getOrCreateClient(
  "__ofrn_supabase_entradas",
  () =>
    createClient(SB_URL, SB_KEY, {
      auth: {
        storageKey: "sb-ofrn-entradas-public-session",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }),
);

/** Sesión compartida: transporte-scrn + viáticos-manual + rendiciones-manual. */
export const supabaseOficinaExterna = getOrCreateClient(
  "__ofrn_supabase_oficina",
  () =>
    createClient(SB_URL, SB_KEY, {
      auth: {
        storageKey: OFICINA_EXTERNA_SESSION_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }),
);

/** @deprecated Alias de supabaseOficinaExterna (misma sesión unificada). */
export const supabaseViaticosManualPublic = supabaseOficinaExterna;
/** Implementación canónica (incl. EXCL_ENSAMBLE y familias vía instrumentos) en giraService.js */
export { resolveGiraRosterIds } from "./giraService";
