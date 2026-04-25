import { supabase } from "./supabase";

/**
 * Sincroniza un evento de día completo en Google Calendar para un transporte SCRN
 * (Edge Function sync-scrn-transporte-calendar). No bloquea la UI; errores en consola.
 */
export async function syncTransporteGoogleCalendar(transporteId) {
  const id = Number(transporteId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "transporte_id inválido" };
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { ok: false, error: "No hay sesión activa" };
    }
    const { data, error } = await supabase.functions.invoke("sync-scrn-transporte-calendar", {
      body: { transporte_id: id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      console.error("sync-scrn-transporte-calendar:", {
        message: error.message || String(error),
        name: error.name,
        details: error.context ? "ver Network > Response body" : undefined,
      });
      return { ok: false, error: error.message || String(error) };
    }
    return { ok: true, data: data || null };
  } catch (e) {
    console.error("sync-scrn-transporte-calendar:", e);
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function syncViajeGoogleCalendar(viajeId) {
  const id = Number(viajeId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: "viaje_id inválido" };
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { ok: false, error: "No hay sesión activa" };
    }
    const { data, error } = await supabase.functions.invoke("sync-scrn-transporte-calendar", {
      body: { viaje_id: id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      console.error("sync-scrn-transporte-calendar:", {
        message: error.message || String(error),
        name: error.name,
        details: error.context ? "ver Network > Response body" : undefined,
      });
      return { ok: false, error: error.message || String(error) };
    }
    return { ok: true, data: data || null };
  } catch (e) {
    console.error("sync-scrn-transporte-calendar:", e);
    return { ok: false, error: e?.message || String(e) };
  }
}
