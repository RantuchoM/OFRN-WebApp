import { supabaseOficinaExterna } from "./supabase";
import {
  buildScrnViaticoPrefill,
  puedeAbrirViaticoDesdeReserva,
} from "../utils/scrnViaticoPrefill";
import {
  ensureOficinaExternaProfile,
  getOficinaExternaSessionProfile,
  logoutOficinaExterna,
  requestOficinaExternaEmailCode,
  verifyOficinaExternaEmailCode,
  verifyOficinaExternaMagicLink,
  VIATICOS_APP,
} from "./oficinaExternaAuthService";

export async function getViaticosManualSessionProfile() {
  return getOficinaExternaSessionProfile();
}

export async function ensureViaticosManualProfile({ nombre, apellido }) {
  return ensureOficinaExternaProfile({ nombre, apellido });
}

export async function requestViaticosManualEmailCode(email) {
  return requestOficinaExternaEmailCode(email, VIATICOS_APP);
}

export async function verifyViaticosManualEmailCode({ email, code }) {
  return verifyOficinaExternaEmailCode({ email, code, app: VIATICOS_APP });
}

export async function verifyViaticosManualMagicLink({ token }) {
  return verifyOficinaExternaMagicLink({ token, app: VIATICOS_APP });
}

export async function logoutViaticosManual() {
  return logoutOficinaExterna();
}

export async function listViaticosGuardados() {
  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getViaticoGuardado(id) {
  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveViaticoGuardado({ id, etiqueta, datos }) {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const payload = {
    usuario_id: session.user.id,
    etiqueta: String(etiqueta || "").trim(),
    datos,
  };

  if (id) {
    const { data, error } = await supabaseOficinaExterna
      .from("viaticos_manual_viatico")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Viáticos del usuario actual que se originaron desde un recorrido SCRN.
 * RLS limita el resultado a las filas propias (usuario_id = auth.uid()).
 * @returns {Promise<Array<{ id: string, created_at: string, scrn_origen: object }>>}
 */
export async function listViaticosScrnGenerados() {
  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .select("id, created_at, datos")
    .not("datos->scrn_origen", "is", null);
  if (error) throw error;
  return (data || [])
    .map((row) => ({
      id: row.id,
      created_at: row.created_at,
      scrn_origen: row?.datos?.scrn_origen || null,
    }))
    .filter((row) => row.scrn_origen && typeof row.scrn_origen === "object");
}

function labelRecorridoViatico(viaje, rolLabel) {
  const cuando = viaje?.fecha_salida
    ? new Date(viaje.fecha_salida).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "sin fecha";
  const ruta = [viaje?.origen, viaje?.destino_final].filter(Boolean).join(" → ") || "Recorrido";
  const motivo = viaje?.motivo ? ` · ${viaje.motivo}` : "";
  return `${cuando} · ${ruta}${motivo} (${rolLabel})`;
}

/**
 * Recorridos propios (titular o pasajero con perfil) elegibles para armar y exportar un viático.
 * Solo filas del usuario autenticado.
 */
export async function listMisRecorridosParaExportar() {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) return [];
  const uid = session.user.id;

  const { data: reservas, error } = await supabaseOficinaExterna
    .from("scrn_reservas")
    .select(
      "id, id_viaje, estado, tramo, localidad_subida, localidad_bajada, obs_subida, obs_bajada, viaticos_opciones",
    )
    .eq("id_usuario", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: paxRows, error: paxErr } = await supabaseOficinaExterna
    .from("scrn_reserva_pasajeros")
    .select(
      "id, id_reserva, id_perfil, estado, tramo, localidad_subida, localidad_bajada, obs_subida, obs_bajada, viaticos_opciones, nombre, apellido",
    )
    .eq("id_perfil", uid)
    .neq("estado", "cancelada");
  if (paxErr) throw paxErr;

  const titularIds = new Set((reservas || []).map((row) => row.id));
  const extraIds = [
    ...new Set(
      (paxRows || [])
        .map((row) => row.id_reserva)
        .filter((id) => id != null && !titularIds.has(id)),
    ),
  ];

  let extraReservas = [];
  if (extraIds.length) {
    const { data, error: extraErr } = await supabaseOficinaExterna
      .from("scrn_reservas")
      .select(
        "id, id_viaje, estado, tramo, localidad_subida, localidad_bajada, obs_subida, obs_bajada, viaticos_opciones",
      )
      .in("id", extraIds);
    if (extraErr) throw extraErr;
    extraReservas = data || [];
  }

  const allReservas = [...(reservas || []), ...extraReservas];
  const viajeIds = [...new Set(allReservas.map((row) => row.id_viaje).filter(Boolean))];
  let viajes = [];
  if (viajeIds.length) {
    const { data, error: viajesErr } = await supabaseOficinaExterna
      .from("scrn_viajes")
      .select("*, scrn_transportes(*)")
      .in("id", viajeIds);
    if (viajesErr) throw viajesErr;
    viajes = data || [];
  }
  const viajeMap = Object.fromEntries(viajes.map((viaje) => [viaje.id, viaje]));

  const { data: perfil } = await supabaseOficinaExterna
    .from("scrn_perfiles")
    .select("id, nombre, apellido, dni, cargo")
    .eq("id", uid)
    .maybeSingle();

  const options = [];
  for (const reserva of reservas || []) {
    const viaje = viajeMap[reserva.id_viaje];
    if (!viaje || !puedeAbrirViaticoDesdeReserva({ reserva, viaje })) continue;
    options.push({
      key: `t-${reserva.id}`,
      label: labelRecorridoViatico(viaje, "titular"),
      prefill: buildScrnViaticoPrefill({
        viaje,
        transporte: viaje.scrn_transportes,
        reserva,
        perfil,
        viaticosOpciones: reserva.viaticos_opciones,
        rol: "titular",
      }),
    });
  }

  const extraById = Object.fromEntries(extraReservas.map((row) => [row.id, row]));
  for (const pax of paxRows || []) {
    if (titularIds.has(pax.id_reserva)) continue;
    const reserva = extraById[pax.id_reserva];
    const viaje = reserva ? viajeMap[reserva.id_viaje] : null;
    if (!reserva || !viaje) continue;
    if (!puedeAbrirViaticoDesdeReserva({ reserva, viaje, estadoPasajero: pax.estado })) continue;
    options.push({
      key: `p-${pax.id}`,
      label: labelRecorridoViatico(viaje, "pasajero"),
      prefill: buildScrnViaticoPrefill({
        viaje,
        transporte: viaje.scrn_transportes,
        reserva,
        pax,
        perfil,
        viaticosOpciones: pax.viaticos_opciones,
        rol: "pasajero",
      }),
    });
  }

  return options;
}

export async function deleteViaticoGuardado(id) {
  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAllViaticosGuardados() {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_viatico")
    .delete()
    .eq("usuario_id", session.user.id);
  if (error) throw error;
}

export async function listRendicionesGuardadas() {
  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveRendicionGuardada({ id, viatico_origen_id, etiqueta, datos }) {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const payload = {
    usuario_id: session.user.id,
    viatico_origen_id: viatico_origen_id || null,
    etiqueta: String(etiqueta || "").trim(),
    datos,
  };

  if (id) {
    const { data, error } = await supabaseOficinaExterna
      .from("viaticos_manual_rendicion")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRendicionGuardada(id) {
  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAllRendicionesGuardadas() {
  const {
    data: { session },
  } = await supabaseOficinaExterna.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const { error } = await supabaseOficinaExterna
    .from("viaticos_manual_rendicion")
    .delete()
    .eq("usuario_id", session.user.id);
  if (error) throw error;
}

/** Nombre visible del registro: persona + fecha de inicio (siempre calculado desde datos). */
export function buildViaticoDisplayName(datos, fallback = "Viático sin identificar") {
  const apellido = String(datos?.apellido || "").trim();
  const nombre = String(datos?.nombre || "").trim();
  const fecha = String(datos?.fecha_salida || "").trim();
  const persona = [apellido, nombre].filter(Boolean).join(", ");
  const parts = [persona, fecha].filter(Boolean);
  return parts.length ? parts.join(" · ") : fallback;
}

export function buildRendicionDisplayName(datos, fallback = "Rendición sin identificar") {
  return buildViaticoDisplayName(datos, fallback);
}

/** @deprecated Usar buildViaticoDisplayName para el título y etiqueta solo como descriptiva. */
export function buildAutoEtiqueta(datos, fallback = "Sin título") {
  return buildViaticoDisplayName(datos, fallback);
}

export function resolveRecordLabels(record, type = "viatico") {
  const datos = record?.datos || {};
  const displayName =
    type === "rendicion"
      ? buildRendicionDisplayName(datos)
      : buildViaticoDisplayName(datos);
  const descriptiveLabel = String(record?.etiqueta || "").trim();
  return { displayName, descriptiveLabel };
}
