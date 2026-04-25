/**
 * Sincroniza un evento de Google Calendar por recorrido (scrn_viajes.google_calendar_event_id).
 * POST body: { viaje_id } o { transporte_id } (admin: recorre todos los viajes del transporte).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { google } from "npm:googleapis@126.0.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (obj: unknown, status: number) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ymd = (s: string | null | undefined) =>
  s && String(s).trim().length >= 10 ? String(s).trim().slice(0, 10) : null;
const addOneDayUtc = (d: string) => {
  const x = new Date(d + "T12:00:00.000Z");
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
};
const tope = (t: { capacidad_max?: number }) => Math.max(0, (Number(t?.capacidad_max) || 0) - 1);
const cupo = (v: { plazas_pasajeros?: number | null }, t: { capacidad_max?: number }) =>
  v?.plazas_pasajeros == null
    ? tope(t)
    : Math.min(Math.max(0, Math.floor(Number(v.plazas_pasajeros) || 0)), tope(t));
const pad2 = (n: number) => String(Math.max(0, Math.trunc(n || 0))).padStart(2, "0");

function getCalendarId() {
  return Deno.env.get("GOOGLE_CALENDAR_SCRN_ID") || Deno.env.get("GOOGLE_CALENDAR_ID") || "";
}
function getBaseUrl() {
  return Deno.env.get("APP_BASE_URL") || Deno.env.get("FRONTEND_URL") || "https://ofrn-web-app.vercel.app";
}
function fmtAr(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const tz = new Date(d.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  return `${String(tz.getDate()).padStart(2, "0")}/${String(tz.getMonth() + 1).padStart(2, "0")}/${tz.getFullYear()} ${String(tz.getHours()).padStart(2, "0")}:${String(tz.getMinutes()).padStart(2, "0")}`;
}

async function getCalendar() {
  const email =
    Deno.env.get("GOOGLE_CLIENT_EMAIL_TRANSPORTE") || Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const key = (
    Deno.env.get("GOOGLE_PRIVATE_KEY_TRANSPORTE") || Deno.env.get("GOOGLE_PRIVATE_KEY")
  )?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_EMAIL_TRANSPORTE/GOOGLE_PRIVATE_KEY (o GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY)",
    );
  }
  const jwt = new google.auth.JWT(email, undefined, key, ["https://www.googleapis.com/auth/calendar"]);
  await jwt.authorize();
  return google.calendar({ version: "v3", auth: jwt });
}

/** Carga extra pasajeros; si no existe columna `estado`, reintenta sin ella. */
async function loadReservaPasajeros(admin: any, reservaIds: number[]) {
  if (!reservaIds.length) return { rows: [] as any[], conEstado: true };
  let paxRes = await admin
    .from("scrn_reserva_pasajeros")
    .select("id_reserva, nombre, apellido, id_perfil, estado")
    .in("id_reserva", reservaIds);
  if (paxRes.error) {
    paxRes = await admin
      .from("scrn_reserva_pasajeros")
      .select("id_reserva, nombre, apellido, id_perfil")
      .in("id_reserva", reservaIds);
    return { rows: paxRes.data || [], conEstado: false };
  }
  return { rows: paxRes.data || [], conEstado: true };
}

async function tipoTransporteEmoji(admin: any, nombreTipo: string | null | undefined) {
  const n = (nombreTipo || "").trim();
  if (!n) return "";
  const { data: row, error } = await admin
    .from("scrn_tipos_transporte")
    .select("emoji")
    .eq("nombre", n)
    .limit(1)
    .maybeSingle();
  if (error) return "";
  return String((row as { emoji?: string } | null)?.emoji || "").trim();
}

async function syncOneViaje(
  admin: any,
  calendar: any,
  calendarId: string,
  viaje: any,
  transporte: any,
) {
  const existingId = String(viaje?.google_calendar_event_id || "").trim() || null;
  const clear = async (action: string) => {
    if (existingId) {
      try {
        await calendar.events.delete({ calendarId, eventId: existingId });
      } catch (e: any) {
        if (e?.code !== 404) throw e;
      }
    }
    const { error: uErr } = await admin
      .from("scrn_viajes")
      .update({ google_calendar_event_id: null })
      .eq("id", viaje.id);
    if (uErr) throw new Error(`scrn_viajes: ${uErr.message}`);
    return { ok: true, action, viaje_id: viaje.id, google_calendar_event_id: null as string | null };
  };

  if (!transporte?.activo) return clear("cleared_inactive_transporte");
  const desde = ymd(viaje.fecha_salida);
  const hasta = [ymd(viaje.fecha_salida), ymd(viaje.fecha_llegada_estimada), ymd(viaje.fecha_retorno)]
    .filter(Boolean)
    .sort() as string[];
  const ultimo = hasta.length ? hasta[hasta.length - 1]! : null;
  if (!desde || !ultimo) return clear("cleared_no_fechas");

  const { data: reservas, error: resErr } = await admin
    .from("scrn_reservas")
    .select("id, id_usuario")
    .eq("id_viaje", viaje.id)
    .neq("estado", "cancelada");
  if (resErr) throw new Error(`scrn_reservas: ${resErr.message}`);

  const reservaList = reservas || [];
  const reservaIds = reservaList.map((r: { id: number }) => r.id);
  const userIds = [...new Set(reservaList.map((r: { id_usuario: string }) => r.id_usuario).filter(Boolean))];
  const { data: perfiles } = userIds.length
    ? await admin.from("scrn_perfiles").select("id, nombre, apellido").in("id", userIds)
    : { data: [] };
  const perfilMap: Record<string, any> = {};
  (perfiles || []).forEach((p: any) => (perfilMap[p.id] = p));

  const { rows: paxRaw, conEstado: paxConEstado } = await loadReservaPasajeros(admin, reservaIds);
  const pax = paxRaw.filter((p: any) => (paxConEstado ? String(p.estado || "") !== "cancelada" : true));

  const pasajeros = [
    ...reservaList.map((r: any) => {
      const p = perfilMap[r.id_usuario];
      return `${(p?.apellido || "-").trim()}, ${(p?.nombre || "-").trim()}`;
    }),
    ...pax.map((p: any) => `${(p.apellido || "-").trim()}, ${(p.nombre || "-").trim()}`),
  ]
    .filter(Boolean)
    .filter((x: string, i: number, arr: string[]) => arr.indexOf(x) === i)
    .sort((a: string, b: string) => a.localeCompare(b, "es-AR"));

  const ocupadas = pasajeros.length;
  const plazas = cupo(viaje, transporte);
  const libres = Math.max(plazas - ocupadas, 0);
  const vacEmoji = libres <= 0 ? "🔴" : libres <= 2 ? "🟡" : "🟢";
  const tipoEmoji = await tipoTransporteEmoji(admin, transporte?.tipo);
  const prefijos = [vacEmoji, tipoEmoji].filter(Boolean).join(" ");
  const titulo = `${prefijos} ${(viaje.motivo || "Sin motivo").trim()} [${pad2(ocupadas)}/${pad2(plazas)}] | ${(transporte?.nombre || "Transporte").trim()}`
    .replace(/\s+/g, " ")
    .trim();
  const link = `${getBaseUrl().replace(/\/$/, "")}/transporte-scrn?view=agenda&action=solicitar&viajeId=${viaje.id}`;
  const descripcion = [
    `Ciudad de origen: ${viaje.origen || "-"}: ${fmtAr(viaje.fecha_salida)}`,
    `Ciudad de destino: ${viaje.destino_final || "-"}: ${fmtAr(viaje.fecha_retorno || viaje.fecha_llegada_estimada)}`,
    `Observaciones: ${(viaje.observaciones || "").trim() || (transporte?.observaciones_estado || "").trim() || "-"}`,
    `Solicitar plaza: ${link}`,
    "-----------",
    "Pasajeros:",
    ...(pasajeros.length ? pasajeros : ["(sin pasajeros cargados)"]),
  ].join("\n");

  const requestBody = {
    summary: titulo.slice(0, 1000),
    description: descripcion.slice(0, 8000),
    start: { date: desde },
    end: { date: addOneDayUtc(ultimo) },
    transparency: "transparent",
  };

  let googleId: string | null = existingId;
  let action = existingId ? "updated" : "created";
  if (existingId) {
    try {
      const upd = await calendar.events.update({ calendarId, eventId: existingId, requestBody });
      googleId = upd.data.id || existingId;
    } catch (e: any) {
      if (e?.code !== 404) throw e;
      const ins = await calendar.events.insert({ calendarId, requestBody });
      googleId = ins.data.id || null;
      action = "recreated";
    }
  } else {
    const ins = await calendar.events.insert({ calendarId, requestBody });
    googleId = ins.data.id || null;
  }
  const { error: upErr } = await admin
    .from("scrn_viajes")
    .update({ google_calendar_event_id: googleId })
    .eq("id", viaje.id);
  if (upErr) throw new Error(`scrn_viajes: ${upErr.message}`);
  return { ok: true, action, viaje_id: viaje.id, google_calendar_event_id: googleId };
}

serve(async (req) => {
  // 200 + cuerpo: evita 204 con body (ilegal) que puede romper CORS/preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) {
    return json({ error: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }
  const admin = createClient(url, key);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return json({ error: "Falta Authorization" }, 401);
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    return json({ error: `No autorizado: ${userErr?.message || "token inválido"}` }, 401);
  }

  const { data: perfil, error: pe } = await admin
    .from("scrn_perfiles")
    .select("es_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (pe) {
    return json({ error: pe.message }, 500);
  }
  if (!perfil?.es_admin) {
    return json({ error: "Solo administradores" }, 403);
  }

  let body: { viaje_id?: unknown; transporte_id?: unknown };
  try {
    body = (await req.json()) as { viaje_id?: unknown; transporte_id?: unknown };
  } catch {
    return json({ error: "Body JSON inválido" }, 400);
  }

  const viajeId = Number(body.viaje_id);
  const transporteId = Number(body.transporte_id);
  const calendarId = getCalendarId();
  if (!calendarId) {
    return json({ error: "Falta GOOGLE_CALENDAR_SCRN_ID/GOOGLE_CALENDAR_ID" }, 500);
  }

  let calendar: Awaited<ReturnType<typeof getCalendar>>;
  try {
    calendar = await getCalendar();
  } catch (e: any) {
    console.error("sync-scrn-transporte-calendar google:", e);
    return json({ error: e?.message || String(e) }, 500);
  }

  try {
    if (Number.isFinite(viajeId) && viajeId > 0) {
      const { data: vRow, error: vErr } = await admin
        .from("scrn_viajes")
        .select("*")
        .eq("id", viajeId)
        .maybeSingle();
      if (vErr) return json({ error: vErr.message }, 500);
      if (!vRow) return json({ error: "viaje_id inválido" }, 404);
      const { data: tRow, error: tErr } = await admin
        .from("scrn_transportes")
        .select("*")
        .eq("id", vRow.id_transporte)
        .maybeSingle();
      if (tErr) return json({ error: tErr.message }, 500);
      if (!tRow) return json({ error: "Transporte del viaje no encontrado" }, 404);
      const result = await syncOneViaje(admin, calendar, calendarId, vRow, tRow);
      return json(result, 200);
    }

    if (!Number.isFinite(transporteId) || transporteId <= 0) {
      return json({ error: "Indicá viaje_id o transporte_id válido" }, 400);
    }

    const { data: transporte, error: tErr2 } = await admin
      .from("scrn_transportes")
      .select("*")
      .eq("id", transporteId)
      .maybeSingle();
    if (tErr2) return json({ error: tErr2.message }, 500);
    if (!transporte) return json({ error: "Transporte no encontrado" }, 404);
    const { data: viajes, error: vjErr } = await admin
      .from("scrn_viajes")
      .select("*")
      .eq("id_transporte", transporteId)
      .order("fecha_salida", { ascending: true });
    if (vjErr) return json({ error: vjErr.message }, 500);
    const items: unknown[] = [];
    for (const v of viajes || []) {
      // eslint-disable-next-line no-await-in-loop
      items.push(await syncOneViaje(admin, calendar, calendarId, v, transporte));
    }
    return json(
      { ok: true, action: "bulk_by_transporte", transporte_id: transporteId, items },
      200,
    );
  } catch (error: any) {
    console.error("sync-scrn-transporte-calendar:", error);
    return json({ error: error?.message || String(error) }, 500);
  }
});