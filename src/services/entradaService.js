import QRCode from "qrcode";
import { supabase, supabaseEntradasPublic, supabaseOficinaExterna } from "./supabase";
import {
  blobToBase64NoPrefix,
  buildEntradasReservaPdfBlob,
  downloadEntradasReservaPdfBlob,
  makeEntradasReservaFilename,
} from "../utils/entradasReservaPdf";
import {
  aplicarDatosEventoAConciertoEntrada,
  ENTRADA_CONCIERTO_EVENTO_EMBED,
  fechaHoraDesdeConciertoEntrada,
  localidadDesdeConciertoEntrada,
  localidadLabelDesdeProgramaEntrada,
  lugarNombreDesdeConciertoEntrada,
} from "../utils/entradasConciertoEvento";
import { conciertoAdminSoloRecordatoriosProgramados } from "../utils/entradasReservasApertura";
import { formatEntradasAuthError } from "../utils/entradasAuthMessages";

async function assertEntradasAuthInvokeResult({ data, error }, action = "request") {
  if (data?.error) {
    throw new Error(formatEntradasAuthError(data.error, { action }));
  }
  if (!error) return data;

  let serverMessage = "";
  try {
    const ctx = error?.context;
    if (ctx instanceof Response) {
      const body = await ctx.clone().json();
      serverMessage = String(body?.error || body?.message || "").trim();
    }
  } catch {
    /* cuerpo no JSON o ya consumido */
  }

  throw new Error(formatEntradasAuthError(serverMessage || error, { action }));
}

export {
  compareConciertosPorFechaHora,
  fechaHoraDesdeConciertoEntrada,
  localidadDesdeConciertoEntrada,
  localidadLabelDesdeProgramaEntrada,
  lugarNombreDesdeConciertoEntrada,
} from "../utils/entradasConciertoEvento";

function programaPdfFieldsFromConcierto(concierto) {
  const ep = concierto?.entrada_programa;
  return {
    programaNombre: ep?.nombre ? String(ep.nombre) : "",
    programaDetalleRichtext: ep?.detalle_richtext ? String(ep.detalle_richtext) : "",
  };
}

export async function getEntradasSessionProfile() {
  const {
    data: { session },
  } = await supabaseEntradasPublic.auth.getSession();
  if (!session?.user) return { session: null, profile: null };

  const { data: profile } = await supabaseEntradasPublic
    .from("entrada_usuario")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  return { session, profile: profile || null };
}

export async function ensureEntradaProfile({ nombre, apellido }) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_ensure_profile", {
    p_nombre: nombre,
    p_apellido: apellido,
  });
  if (error) throw error;
  return data;
}

export async function requestEntradasEmailCode(email, app = "entradas") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const { data, error } = await supabase.functions.invoke("entradas-auth-email", {
    body: {
      action: "request_code",
      email: normalizedEmail,
      app,
    },
  });
  return assertEntradasAuthInvokeResult({ data, error }, "request");
}

async function signInAfterEntradasAuthPayload(data, app = "entradas") {
  if (data?.error) throw new Error(data.error);
  if (!data?.email || !data?.password) {
    throw new Error("No se pudo completar el acceso.");
  }
  const authClient =
    app === "scrn" || app === "viaticos_manual"
      ? supabaseOficinaExterna
      : supabaseEntradasPublic;
  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (signInError) throw signInError;
}

export async function verifyEntradasEmailCode({ email, code, app = "entradas" }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCode = String(code || "").trim();
  const { data, error } = await supabase.functions.invoke("entradas-auth-email", {
    body: {
      action: "verify_code",
      email: normalizedEmail,
      code: normalizedCode,
    },
  });
  const payload = await assertEntradasAuthInvokeResult({ data, error }, "verify");
  await signInAfterEntradasAuthPayload(payload, app);
}

export async function verifyEntradasMagicLink({ token, app = "entradas" }) {
  const normalizedToken = String(token || "").trim().toLowerCase();
  const { data, error } = await supabase.functions.invoke("entradas-auth-email", {
    body: {
      action: "verify_magic_link",
      token: normalizedToken,
    },
  });
  const payload = await assertEntradasAuthInvokeResult({ data, error }, "verify");
  await signInAfterEntradasAuthPayload(payload, app);
}

export async function listProgramasConConciertos() {
  const { data, error } = await supabaseEntradasPublic
    .from("entrada_programa")
    .select(
      `id, slug_publico, nombre, detalle_richtext, activo, entrada_concierto(id, slug_publico, nombre, capacidad_maxima, reservas_habilitadas, apertura_reservas_at, activo, imagen_drive_url, ofrn_programa_id, ofrn_evento_id, ${ENTRADA_CONCIERTO_EVENTO_EMBED})`,
    )
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data || []).map((programa) => ({
    ...programa,
    entrada_concierto: (programa.entrada_concierto || []).map(aplicarDatosEventoAConciertoEntrada),
  }));
}

export async function getConciertoBySlug(slug) {
  const { data, error } = await supabaseEntradasPublic
    .from("entrada_concierto")
    .select(
      `*, entrada_programa(id, nombre, slug_publico, detalle_richtext), evento:eventos!entrada_concierto_ofrn_evento_id_fkey(id, fecha, hora_inicio, id_locacion, descripcion, locaciones(id, nombre, localidades(localidad)))`,
    )
    .eq("slug_publico", slug)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const concierto = aplicarDatosEventoAConciertoEntrada(data);
  const map = await fetchConciertosDisponibilidad([concierto.id]);
  return aplicarDisponibilidadAConcierto(concierto, map);
}

/** Agregado vía RPC (RLS no permite sumar reservas ajenas). */
export async function fetchConciertosDisponibilidad(conciertoIds) {
  const ids = [...new Set((conciertoIds || []).map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) return {};

  const { data, error } = await supabaseEntradasPublic.rpc("entrada_conciertos_disponibilidad", {
    p_concierto_ids: ids,
  });
  if (error) throw error;

  const map = {};
  for (const row of data || []) {
    const id = Number(row.concierto_id);
    if (!id) continue;
    map[id] = {
      porcentaje: Number(row.porcentaje_disponible ?? 0),
      plazas: Number(row.plazas_disponibles ?? 0),
    };
  }
  return map;
}

export function aplicarDisponibilidadAConcierto(concierto, map) {
  if (!concierto?.id) return concierto;
  const d = map?.[Number(concierto.id)];
  if (!d) return concierto;
  return { ...concierto, disponibilidad: d };
}

export function programasConDisponibilidad(programas, map) {
  return (programas || []).map((programa) => ({
    ...programa,
    entrada_concierto: (programa.entrada_concierto || []).map((c) => aplicarDisponibilidadAConcierto(c, map)),
  }));
}

export function porcentajeDisponibleConcierto(concierto) {
  const p = concierto?.disponibilidad?.porcentaje;
  return p == null || Number.isNaN(Number(p)) ? null : Math.max(0, Math.min(100, Math.round(Number(p))));
}

/** Sin plazas libres según RPC de disponibilidad o, en su defecto, capacidad − reservas activas cargadas. */
export function conciertoSinPlazasDisponibles(concierto) {
  const pct = porcentajeDisponibleConcierto(concierto);
  if (pct != null) return pct <= 0;
  return computeDisponibles(concierto) <= 0;
}

export function computeDisponibles(concierto) {
  const desdeRpc = concierto?.disponibilidad?.plazas;
  if (desdeRpc != null && !Number.isNaN(Number(desdeRpc))) {
    return Math.max(0, Number(desdeRpc));
  }
  const ocupadas = (concierto?.entrada_reserva || [])
    .filter((r) => r.estado === "activa")
    .reduce((acc, row) => acc + Number(row.cantidad_solicitada || 0), 0);
  return Math.max(0, Number(concierto?.capacidad_maxima || 0) - ocupadas);
}

export function todosConciertoIdsEnProgramas(programas) {
  const ids = [];
  for (const p of programas || []) {
    for (const c of p.entrada_concierto || []) {
      if (c?.id) ids.push(Number(c.id));
    }
  }
  return ids;
}

export async function crearReserva({ conciertoId, cantidad }) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_crear_reserva", {
    p_concierto_id: conciertoId,
    p_cantidad: cantidad,
  });
  if (error) throw error;
  const payload = Array.isArray(data) ? data[0] : data;
  return payload;
}

export async function enviarMailReserva({ reservaId, qrReservaToken, qrEntradaTokens, pdfBase64 }) {
  const { error } = await supabaseEntradasPublic.functions.invoke("entradas-send-reserva-email", {
    body: {
      action: "confirmacion",
      reservaId,
      qrReservaToken,
      qrEntradaTokens,
      pdfBase64: pdfBase64 || undefined,
      appUrl: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function buscarBeneficiarioPorEmail(email) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_buscar_beneficiario", {
    p_email: String(email || "").trim(),
  });
  if (error) throw error;
  return data;
}

export async function crearReservaTercero({ conciertoId, cantidad, emailBeneficiario, beneficiarioReferencia }) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_crear_reserva_tercero", {
    p_concierto_id: conciertoId,
    p_cantidad: cantidad,
    p_email_beneficiario: emailBeneficiario ? String(emailBeneficiario).trim() : null,
    p_beneficiario_referencia: beneficiarioReferencia ? String(beneficiarioReferencia).trim() : null,
  });
  if (error) throw error;
  const payload = Array.isArray(data) ? data[0] : data;
  return payload;
}

export async function asociarEmailTercero({ reservaId, email }) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_asociar_email_tercero", {
    p_reserva_id: reservaId,
    p_email: String(email || "").trim(),
  });
  if (error) throw error;
  return data;
}

export async function cancelarReservaTercero(reservaId) {
  const { error } = await supabaseEntradasPublic.rpc("entrada_admin_cancelar_reserva_tercero", {
    p_reserva_id: reservaId,
  });
  if (error) throw error;
}

export async function actualizarReferenciaTercero(reservaId, referencia) {
  const { error } = await supabaseEntradasPublic
    .from("entrada_reserva")
    .update({ beneficiario_referencia: referencia ? String(referencia).trim() : null })
    .eq("id", reservaId);
  if (error) throw error;
}

const RESERVA_TERCEROS_SELECT = `id, codigo_reserva, cantidad_solicitada, estado, created_at, qr_reserva_token,
  reservada_por, email_beneficiario, beneficiario_referencia, usuario_id,
  concierto:entrada_concierto(id, nombre, slug_publico, detalle_richtext, fecha_hora, ofrn_evento_id,
    entrada_programa(id, nombre, detalle_richtext), ${ENTRADA_CONCIERTO_EVENTO_EMBED}),
  entradas:entrada_reserva_entrada(id, orden, estado_ingreso, ingresada_at, qr_entrada_token),
  titular:entrada_usuario!entrada_reserva_usuario_id_fkey(id, nombre, apellido, email)`;

/**
 * Genera el PDF (detalle + QRs) y devuelve blob y nombre de archivo. No lanza; el caller hace el toast.
 */
export function linkCatalogoConcierto(concierto) {
  const sl = concierto?.slug_publico;
  return sl
    ? `${window.location.origin}/entradas?view=catalogo&concierto=${encodeURIComponent(sl)}`
    : `${window.location.origin}/entradas`;
}

export async function buildEntradasReservaPdfConQr({
  concierto,
  reserva,
  qrReservaToken,
  qrEntradaTokens = [],
}) {
  const linkConcierto = linkCatalogoConcierto(concierto);

  const qrReservaDataUrl = await tokenToQrDataUrl(qrReservaToken);
  const entriesQrDataUrls = await Promise.all((qrEntradaTokens || []).map((t) => tokenToQrDataUrl(t)));
  const blob = await buildEntradasReservaPdfBlob({
    conciertoNombre: concierto?.nombre,
    fechaHora: fechaHoraDesdeConciertoEntrada(concierto),
    lugarNombre: lugarNombreDesdeConciertoEntrada(concierto),
    detalleRichtext: concierto?.detalle_richtext,
    ...programaPdfFieldsFromConcierto(concierto),
    codigoReserva: reserva?.codigo_reserva,
    cantidad: Number(reserva?.cantidad_solicitada) || 0,
    linkConcierto,
    qrReservaDataUrl,
    entriesQrDataUrls,
  });
  const filename = makeEntradasReservaFilename(reserva?.codigo_reserva);
  return { blob, filename };
}

/** Evita doble generación de toDataURL cuando ya se obtuvieron QRs en pantalla. */
export async function buildEntradasReservaPdfConDataUrls({ concierto, reserva, reservaQrDataUrl, entriesQrDataUrls }) {
  const blob = await buildEntradasReservaPdfBlob({
    conciertoNombre: concierto?.nombre,
    fechaHora: fechaHoraDesdeConciertoEntrada(concierto),
    lugarNombre: lugarNombreDesdeConciertoEntrada(concierto),
    detalleRichtext: concierto?.detalle_richtext,
    ...programaPdfFieldsFromConcierto(concierto),
    codigoReserva: reserva?.codigo_reserva,
    cantidad: Number(reserva?.cantidad_solicitada) || 0,
    linkConcierto: linkCatalogoConcierto(concierto),
    qrReservaDataUrl: reservaQrDataUrl,
    entriesQrDataUrls: entriesQrDataUrls || [],
  });
  return { blob, filename: makeEntradasReservaFilename(reserva?.codigo_reserva) };
}

/** Token para QR grupal: guardado en BD o código de reserva (válido en recepción). */
export function tokenQrReservaGrupo(reserva) {
  const stored = String(reserva?.qr_reserva_token || "").trim();
  if (stored) return stored;
  return String(reserva?.codigo_reserva || "").trim();
}

export function entradasConTokensCompletos(reserva) {
  const n = Number(reserva?.cantidad_solicitada) || 0;
  if (!n || !tokenQrReservaGrupo(reserva)) return false;
  const sorted = [...(reserva.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const tokens = sorted.map((e) => e.qr_entrada_token).filter(Boolean);
  return tokens.length === n;
}

/** Completa tokens de plazas en BD si faltan (reservas legacy). */
export async function asegurarQrTokensReserva(reservaId) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_asegurar_qr_tokens", {
    p_reserva_id: Number(reservaId),
  });
  if (error) throw error;
  if (!data?.ok) {
    throw new Error("No se pudieron obtener los códigos QR de la reserva.");
  }
  return data;
}

export function mergeAsegurarQrEnReserva(reserva, payload) {
  if (!reserva || !payload?.ok) return reserva;
  const byId = new Map((payload.entradas || []).map((e) => [Number(e.id), e]));
  return {
    ...reserva,
    qr_reserva_token: payload.qr_reserva_token ?? reserva.qr_reserva_token,
    entradas: (reserva.entradas || []).map((row) => {
      const patch = byId.get(Number(row.id));
      if (!patch?.qr_entrada_token) return row;
      return { ...row, qr_entrada_token: patch.qr_entrada_token };
    }),
  };
}

export async function descargarPdfDesdeReservaRow(reserva) {
  let row = reserva;
  if (!entradasConTokensCompletos(row)) {
    const payload = await asegurarQrTokensReserva(row.id);
    row = mergeAsegurarQrEnReserva(row, payload);
  }
  const grupoToken = tokenQrReservaGrupo(row);
  if (!grupoToken) {
    throw new Error("No hay código de reserva para generar el PDF.");
  }
  const sorted = [...(row.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const tokens = sorted.map((e) => e.qr_entrada_token).filter(Boolean);
  if (tokens.length !== Number(row.cantidad_solicitada) || !tokens.length) {
    throw new Error("Faltan datos de entradas para generar el PDF. Contactá a la administración.");
  }
  const { blob, filename } = await buildEntradasReservaPdfConQr({
    concierto: row.concierto,
    reserva: row,
    qrReservaToken: grupoToken,
    qrEntradaTokens: tokens,
  });
  downloadEntradasReservaPdfBlob(blob, filename);
}

export async function blobToPdfBase64ForMail(blob) {
  return blobToBase64NoPrefix(blob);
}

export async function cancelarReserva(reservaId) {
  const { error } = await supabaseEntradasPublic.rpc("entrada_cancelar_reserva", {
    p_reserva_id: reservaId,
  });
  if (error) throw error;
}

/** Recepción: cancela reserva activa (plazas pendientes → anuladas). */
export async function recepcionCancelarReserva(reservaId) {
  const { error } = await supabaseEntradasPublic.rpc("entrada_recepcion_cancelar_reserva", {
    p_reserva_id: reservaId,
  });
  if (error) throw error;
}

/** Recepción: anula plazas pendientes por número de orden (1..n). */
export async function recepcionAnularEntradas(reservaId, ordenes) {
  const nums = (ordenes || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_recepcion_anular_entradas", {
    p_reserva_id: reservaId,
    p_ordenes: nums,
  });
  if (error) throw error;
  return data;
}

/** Recepción: deshace ingresos (ingresada → pendiente) de plazas indicadas. */
export async function recepcionRevertirIngresos(reservaId, ordenes) {
  const nums = (ordenes || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_recepcion_revertir_ingresos", {
    p_reserva_id: reservaId,
    p_ordenes: nums,
  });
  if (error) throw error;
  return data;
}

export async function enviarMailCancelacionReserva({ reservaId }) {
  const { error } = await supabaseEntradasPublic.functions.invoke("entradas-send-reserva-email", {
    body: {
      action: "cancelacion",
      reservaId,
      appUrl: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function tokenToQrDataUrl(token, { used = false } = {}) {
  return QRCode.toDataURL(token, {
    margin: 1,
    width: 320,
    color: {
      dark: used ? "#dc2626" : "#000000",
      light: "#ffffff",
    },
  });
}

export async function listConciertoIdsConReservaActiva() {
  const {
    data: { session },
  } = await supabaseEntradasPublic.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabaseEntradasPublic
    .from("entrada_reserva")
    .select("concierto_id")
    .eq("estado", "activa")
    .eq("usuario_id", session.user.id)
    .is("reservada_por", null);
  if (error) throw error;
  return (data || []).map((r) => Number(r.concierto_id));
}

function mapReservaConConcierto(reserva) {
  return {
    ...reserva,
    concierto: reserva.concierto ? aplicarDatosEventoAConciertoEntrada(reserva.concierto) : reserva.concierto,
  };
}

export async function listarMisReservas() {
  const {
    data: { session },
  } = await supabaseEntradasPublic.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabaseEntradasPublic
    .from("entrada_reserva")
    .select(
      `id, codigo_reserva, cantidad_solicitada, estado, created_at, qr_reserva_token, concierto:entrada_concierto(id, nombre, slug_publico, detalle_richtext, ofrn_evento_id, entrada_programa(id, nombre, detalle_richtext), ${ENTRADA_CONCIERTO_EVENTO_EMBED}), entradas:entrada_reserva_entrada(id, orden, estado_ingreso, ingresada_at, qr_entrada_token)`,
    )
    .eq("usuario_id", session.user.id)
    .is("reservada_por", null)
    .order("id", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReservaConConcierto);
}

export async function listarEntradasTercerosAdmin() {
  const {
    data: { session },
  } = await supabaseEntradasPublic.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabaseEntradasPublic
    .from("entrada_reserva")
    .select(RESERVA_TERCEROS_SELECT)
    .eq("reservada_por", session.user.id)
    .eq("estado", "activa")
    .order("id", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReservaConConcierto);
}

export async function previewEntradaQr(token, conciertoId = null) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_preview_qr", {
    p_token: token,
    p_concierto_id: conciertoId == null || conciertoId === "" ? null : Number(conciertoId),
  });
  if (error) throw error;
  return data;
}

export async function validarYConsumirQr({
  token,
  modo = "auto",
  confirmarParcial,
  conciertoId = null,
  ordenesIngresar = null,
}) {
  const ordenes =
    Array.isArray(ordenesIngresar) && ordenesIngresar.length > 0
      ? ordenesIngresar.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : null;
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_validar_y_consumir_qr", {
    p_token: token,
    p_modo: modo,
    p_confirmar_parcial: Boolean(confirmarParcial),
    p_concierto_id: conciertoId == null || conciertoId === "" ? null : Number(conciertoId),
    p_ordenes_ingresar: ordenes,
  });
  if (error) throw error;
  return data;
}

export async function listAdminData() {
  const [programasRes, conciertosRes, usuariosRes, reservasLocRes] = await Promise.all([
    supabaseEntradasPublic.from("entrada_programa").select("*").order("id", { ascending: false }),
    supabaseEntradasPublic
      .from("entrada_concierto")
      .select(
        "*, programa:entrada_programa(id, nombre), evento:eventos!entrada_concierto_ofrn_evento_id_fkey(id, fecha, hora_inicio, id_locacion, descripcion, locaciones(id, nombre, localidades(localidad)), programas(id, nomenclador, subtitulo))",
      )
      .order("id", { ascending: false }),
    supabaseEntradasPublic.from("entrada_usuario").select("*").order("apellido", { ascending: true }),
    supabaseEntradasPublic
      .from("entrada_reserva")
      .select(
        "usuario_id, concierto:entrada_concierto(evento:eventos!entrada_concierto_ofrn_evento_id_fkey(locaciones(localidades(localidad))))",
      ),
  ]);
  if (programasRes.error) throw programasRes.error;
  if (conciertosRes.error) throw conciertosRes.error;
  if (usuariosRes.error) throw usuariosRes.error;
  if (reservasLocRes.error) throw reservasLocRes.error;

  const locByUser = new Map();
  for (const row of reservasLocRes.data || []) {
    const uid = row.usuario_id;
    if (!uid) continue;
    const loc = localidadDesdeConciertoEntrada(row.concierto);
    if (!loc) continue;
    if (!locByUser.has(uid)) locByUser.set(uid, new Set());
    locByUser.get(uid).add(loc);
  }

  const usuarios = (usuariosRes.data || []).map((u) => ({
    ...u,
    localidades_reserva: Array.from(locByUser.get(u.id) || []).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    ),
  }));

  return {
    programas: programasRes.data || [],
    conciertos: (conciertosRes.data || []).map(aplicarDatosEventoAConciertoEntrada),
    usuarios,
  };
}

export async function getAdminConciertoStats(conciertoId) {
  const conciertoIdNum = Number(conciertoId);
  if (!Number.isFinite(conciertoIdNum) || conciertoIdNum <= 0) {
    throw new Error("Concierto inválido.");
  }

  const conciertoRes = await supabaseEntradasPublic
    .from("entrada_concierto")
    .select(`id, capacidad_maxima, reservas_habilitadas, apertura_reservas_at, activo, ofrn_evento_id, ${ENTRADA_CONCIERTO_EVENTO_EMBED}`)
    .eq("id", conciertoIdNum)
    .maybeSingle();

  if (conciertoRes.error) throw conciertoRes.error;

  const conciertoRow = conciertoRes.data
    ? aplicarDatosEventoAConciertoEntrada(conciertoRes.data)
    : null;
  const capacidad = Number(conciertoRow?.capacidad_maxima || 0);
  const aperturaPendiente = conciertoAdminSoloRecordatoriosProgramados(conciertoRow);

  const recordatoriosPendRes = await supabaseEntradasPublic
    .from("entrada_recordatorio_apertura")
    .select("id", { count: "exact", head: true })
    .eq("concierto_id", conciertoIdNum)
    .is("apertura_notificado_at", null);

  if (recordatoriosPendRes.error) throw recordatoriosPendRes.error;

  const recordatoriosAperturaPendientes = recordatoriosPendRes.count ?? 0;

  if (aperturaPendiente) {
    return {
      aperturaPendiente: true,
      reservadas: 0,
      disponibles: capacidad,
      ingresadas: 0,
      noUtilizadas: 0,
      capacidad,
      recordatoriosApertura: recordatoriosAperturaPendientes,
      recordatoriosAperturaPendientes,
    };
  }

  const [recordatoriosRes, recordatoriosPendAbiertasRes, reservasRes] = await Promise.all([
    supabaseEntradasPublic
      .from("entrada_recordatorio_apertura")
      .select("id", { count: "exact", head: true })
      .eq("concierto_id", conciertoIdNum),
    supabaseEntradasPublic
      .from("entrada_recordatorio_apertura")
      .select("id", { count: "exact", head: true })
      .eq("concierto_id", conciertoIdNum)
      .is("apertura_notificado_at", null),
    supabaseEntradasPublic
      .from("entrada_reserva")
      .select("id, estado, cantidad_solicitada, entrada_reserva_entrada(id, estado_ingreso)")
      .eq("concierto_id", conciertoIdNum),
  ]);

  if (recordatoriosRes.error) throw recordatoriosRes.error;
  if (recordatoriosPendAbiertasRes.error) throw recordatoriosPendAbiertasRes.error;
  if (reservasRes.error) throw reservasRes.error;

  const recordatoriosApertura = recordatoriosRes.count ?? 0;
  const recordatoriosAperturaPendientesAbiertas = recordatoriosPendAbiertasRes.count ?? 0;

  const reservas = reservasRes.data || [];
  const reservadas = reservas
    .filter((r) => r?.estado === "activa")
    .reduce((acc, r) => acc + Number(r?.cantidad_solicitada || 0), 0);
  const ingresadas = reservas.reduce((acc, r) => {
    const entradas = Array.isArray(r?.entrada_reserva_entrada) ? r.entrada_reserva_entrada : [];
    return acc + entradas.filter((e) => e?.estado_ingreso === "ingresada").length;
  }, 0);
  const disponibles = Math.max(0, capacidad - reservadas);
  const noUtilizadas = Math.max(0, reservadas - ingresadas);

  return {
    aperturaPendiente: false,
    reservadas,
    disponibles,
    ingresadas,
    noUtilizadas,
    capacidad,
    recordatoriosApertura,
    recordatoriosAperturaPendientes: recordatoriosAperturaPendientesAbiertas,
  };
}

/**
 * Agrupa mails por categoría para todos los conciertos dados (p. ej. un programa de entradas).
 * Solo considera reservas **activas**. "Sin uso" = esa reserva no tiene ninguna entrada en estado `ingresada`.
 */
export async function getAdminProgramaMailBuckets(conciertoIds) {
  const ids = [...new Set((conciertoIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) {
    return {
      emailsReservaron: [],
      emailsIngresaron: [],
      emailsReservaSinIngreso: [],
      emailsRecordatorioApertura: [],
    };
  }

  const [reservasRes, recordatoriosRes] = await Promise.all([
    supabaseEntradasPublic
      .from("entrada_reserva")
      .select(
        "estado, entrada_reserva_entrada(estado_ingreso), usuario:entrada_usuario!entrada_reserva_usuario_id_fkey(email)",
      )
      .in("concierto_id", ids),
    supabaseEntradasPublic.from("entrada_recordatorio_apertura").select("email").in("concierto_id", ids),
  ]);

  if (reservasRes.error) throw reservasRes.error;
  if (recordatoriosRes.error) throw recordatoriosRes.error;

  const data = reservasRes.data;

  const emailsReservaron = new Set();
  const emailsIngresaron = new Set();
  const emailsReservaSinIngreso = new Set();

  for (const row of data || []) {
    if (row.estado !== "activa") continue;
    const email = String(row?.usuario?.email || "").trim();
    if (!email) continue;
    emailsReservaron.add(email);

    const entradas = Array.isArray(row?.entrada_reserva_entrada) ? row.entrada_reserva_entrada : [];
    const nIngresadas = entradas.filter((e) => e?.estado_ingreso === "ingresada").length;
    if (nIngresadas > 0) emailsIngresaron.add(email);
    if (nIngresadas === 0) emailsReservaSinIngreso.add(email);
  }

  const emailsRecordatorioApertura = new Set();
  for (const row of recordatoriosRes.data || []) {
    const email = String(row?.email || "").trim();
    if (email) emailsRecordatorioApertura.add(email);
  }

  const sortEs = (a, b) => a.localeCompare(b, "es", { sensitivity: "base" });
  return {
    emailsReservaron: Array.from(emailsReservaron).sort(sortEs),
    emailsIngresaron: Array.from(emailsIngresaron).sort(sortEs),
    emailsReservaSinIngreso: Array.from(emailsReservaSinIngreso).sort(sortEs),
    emailsRecordatorioApertura: Array.from(emailsRecordatorioApertura).sort(sortEs),
  };
}

export async function adminUpsertPrograma(payload) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_upsert_programa", {
    p_id: payload.id ?? null,
    p_nombre: payload.nombre,
    p_detalle_richtext: payload.detalle_richtext ?? "",
    p_activo: payload.activo ?? true,
  });
  if (error) throw error;
  return data;
}

export async function adminDeleteConcierto(conciertoId) {
  const id = Number(conciertoId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Concierto inválido.");
  const { error } = await supabaseEntradasPublic.rpc("entrada_admin_delete_concierto", {
    p_concierto_id: id,
  });
  if (error) throw error;
}

export async function adminDeletePrograma(programaId) {
  const id = Number(programaId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Programa inválido.");
  const { error } = await supabaseEntradasPublic.rpc("entrada_admin_delete_programa", {
    p_programa_id: id,
  });
  if (error) throw error;
}

/** Mail de prueba de cron (recordatorio / encuesta) al admin logueado. */
export async function enviarMailPruebaConciertoAdmin({ tipo, conciertoId, preview }) {
  const { data, error } = await supabaseEntradasPublic.functions.invoke("entradas-send-test-mail", {
    body: {
      tipo,
      conciertoId: conciertoId ? Number(conciertoId) : undefined,
      preview: preview || undefined,
      appUrl: window.location.origin,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function adminUpsertConcierto(payload) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_upsert_concierto", {
    p_id: payload.id ?? null,
    p_ofrn_evento_id: payload.ofrn_evento_id,
    p_nombre: payload.nombre,
    p_detalle_richtext: payload.detalle_richtext ?? "",
    p_imagen_drive_url: payload.imagen_drive_url ?? "",
    p_capacidad_maxima: Number(payload.capacidad_maxima || 0),
    p_reservas_habilitadas: payload.reservas_habilitadas ?? true,
    p_activo: payload.activo ?? true,
    p_limite_recordatorio_at: payload.limite_recordatorio_at ?? null,
    p_limite_cierre_reservas_at: payload.limite_cierre_reservas_at ?? null,
    p_limite_encuesta_at: payload.limite_encuesta_at ?? null,
    p_encuesta_url: payload.encuesta_url ? String(payload.encuesta_url).trim() : null,
    p_apertura_reservas_at: payload.apertura_reservas_at ?? null,
  });
  if (error) throw error;
  return data;
}

export async function adminUpdateUsuarioRol({ id, rol }) {
  const { error } = await supabaseEntradasPublic.from("entrada_usuario").update({ rol }).eq("id", id);
  if (error) throw error;
}

/** Pre-registra usuario Entradas (auth + perfil) antes del primer login OTP. Solo admin. */
export async function adminInviteEntradaUsuario({ email, nombre, apellido, rol = "recepcionista" }) {
  const { data, error } = await supabaseEntradasPublic.functions.invoke("entradas-admin-invite-user", {
    body: {
      email: String(email || "").trim().toLowerCase(),
      nombre: String(nombre || "").trim(),
      apellido: String(apellido || "").trim(),
      rol: String(rol || "recepcionista").trim().toLowerCase(),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Contador recepción: personas sin entrada/reserva (fila en `entrada_concierto_sin_entrada`). */
export async function fetchEntradaSinEntradaCount(conciertoId) {
  const id = Number(conciertoId);
  if (!Number.isFinite(id) || id <= 0) return 0;
  const { data, error } = await supabaseEntradasPublic
    .from("entrada_concierto_sin_entrada")
    .select("cantidad")
    .eq("entrada_concierto_id", id)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.cantidad ?? 0);
}

/** +1 / −1; solo recepción/admin. Retorna la cantidad resultante. */
export function buildEntradasRecordarmeUrl(slugPublico) {
  const slug = String(slugPublico || "").trim();
  if (!slug) return `${window.location.origin}/entradas/recordarme`;
  return `${window.location.origin}/entradas/recordarme?concierto=${encodeURIComponent(slug)}`;
}

export async function getRecordatorioAperturaInfo(slug) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_recordatorio_apertura_info", {
    p_slug: String(slug || "").trim(),
  });
  if (error) throw error;
  return data;
}

export async function consultarRecordatorioApertura({ slug, email }) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_consultar_recordatorio_apertura", {
    p_slug: String(slug || "").trim(),
    p_email: String(email || "").trim().toLowerCase(),
  });
  if (error) throw error;
  return data;
}

export async function suscribirRecordatorioApertura({ slug, email }) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_suscribir_recordatorio_apertura", {
    p_slug: String(slug || "").trim(),
    p_email: String(email || "").trim().toLowerCase(),
  });
  if (error) throw error;
  return data;
}

export async function listarRecordatoriosAperturaConciertoIds() {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_listar_recordatorios_apertura");
  if (error) throw error;
  return new Set((data || []).map((row) => Number(row.concierto_id)).filter((id) => Number.isFinite(id)));
}

export async function deltaEntradaSinEntrada(conciertoId, delta) {
  const id = Number(conciertoId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Concierto inválido.");
  if (delta !== 1 && delta !== -1) throw new Error("delta inválido.");
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_sin_entrada_delta", {
    p_concierto_id: id,
    p_delta: delta,
  });
  if (error) throw error;
  const n = data == null ? 0 : Number(data);
  return Number.isFinite(n) ? n : 0;
}
