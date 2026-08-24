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
import { formatEntradasAuthError, isEntradasNetworkError } from "../utils/entradasAuthMessages";
import { pickEntradasAuthSessionFields } from "../utils/entradasAuthSession";
import { adminConciertoAttendanceTotals } from "../utils/entradasIngresoDisplay";
import { entradasTodasIngresadas } from "../utils/entradasMisReservas";

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

export async function requestEntradasMagicLink(email, app = "entradas") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const { data, error } = await supabase.functions.invoke("entradas-auth-email", {
    body: {
      action: "request_magic_link",
      email: normalizedEmail,
      app,
    },
  });
  return assertEntradasAuthInvokeResult({ data, error }, "request");
}

export async function requestEntradasPasswordReset(email, app = "entradas") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const { data, error } = await supabase.functions.invoke("entradas-auth-email", {
    body: {
      action: "request_password_reset",
      email: normalizedEmail,
      app,
    },
  });
  return assertEntradasAuthInvokeResult({ data, error }, "request");
}

export async function signInEntradasWithPassword(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const plain = String(password || "");
  const trySignIn = () =>
    supabaseEntradasPublic.auth.signInWithPassword({
      email: normalizedEmail,
      password: plain,
    });

  let { error } = await trySignIn();
  if (error) {
    try {
      await supabase.functions.invoke("entradas-auth-email", {
        body: { action: "bootstrap_ofrn_password", email: normalizedEmail },
      });
      ({ error } = await trySignIn());
    } catch {
      /* el mensaje que importa es el del login */
    }
  }
  if (error) {
    throw new Error(formatEntradasAuthError(error, { action: "password" }));
  }
}

function ofrnIntegranteLoginEmail(integrante) {
  const mail = String(integrante?.mail || "").trim().toLowerCase();
  if (mail.includes("@")) return mail;
  const acceso = String(integrante?.email_acceso || "").trim().toLowerCase();
  return acceso.includes("@") ? acceso : "";
}

export async function signInEntradasFromOfrnApp(integrante) {
  const email = ofrnIntegranteLoginEmail(integrante);
  const password = String(integrante?.clave_acceso || "");
  if (!email || !password) return false;
  if (integrante?.id === "guest-general") return false;

  const { data, error } = await supabase.functions.invoke("entradas-auth-email", {
    body: { action: "sso_ofrn", email, password },
  });
  const payload = await assertEntradasAuthInvokeResult({ data, error }, "verify");
  await signInAfterEntradasAuthPayload(payload, "entradas");

  const sessionProfile = await getEntradasSessionProfile();
  if (!sessionProfile.profile) {
    await ensureEntradaProfile({
      nombre: String(integrante?.nombre || "").trim() || "—",
      apellido: String(integrante?.apellido || "").trim() || "—",
    });
  }
  return true;
}

const MIN_ENTRADAS_PASSWORD_LENGTH = 8;

export function validateEntradasPassword(password) {
  const value = String(password || "");
  if (value.length < MIN_ENTRADAS_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_ENTRADAS_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

export async function setEntradasPassword(password) {
  const invalid = validateEntradasPassword(password);
  if (invalid) throw new Error(invalid);
  const { error } = await supabaseEntradasPublic.auth.updateUser({ password: String(password) });
  if (error) throw new Error(formatEntradasAuthError(error, { action: "password" }));

  const { data, error: markErr } = await supabaseEntradasPublic.rpc("entrada_mark_password_set");
  if (!markErr && data) return data;

  const {
    data: { user },
  } = await supabaseEntradasPublic.auth.getUser();
  if (user?.id) {
    const { data: row } = await supabaseEntradasPublic
      .from("entrada_usuario")
      .update({ password_set_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("*")
      .maybeSingle();
    if (row) return row;
  }
  return null;
}

/** Actualiza nombre/apellido del perfil propio en `entrada_usuario`. */
export async function updateEntradaProfile({ nombre, apellido }) {
  const n = String(nombre || "").trim();
  const a = String(apellido || "").trim();
  if (!n || !a) throw new Error("Completá nombre y apellido.");
  const {
    data: { user },
  } = await supabaseEntradasPublic.auth.getUser();
  if (!user?.id) throw new Error("Sesión no válida. Volvé a entrar.");
  const { data, error } = await supabaseEntradasPublic
    .from("entrada_usuario")
    .update({ nombre: n, apellido: a })
    .eq("id", user.id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No se pudo actualizar el perfil.");
  return data;
}

function entradasAuthClient(app = "entradas") {
  return app === "scrn" || app === "viaticos_manual"
    ? supabaseOficinaExterna
    : supabaseEntradasPublic;
}

async function signInAfterEntradasAuthPayload(data, app = "entradas") {
  if (data?.error) throw new Error(data.error);
  const fields = pickEntradasAuthSessionFields(data);
  const authClient = entradasAuthClient(app);

  if (fields.token_hash) {
    const types = ["email", "magiclink", "recovery"];
    for (const type of types) {
      const { error: otpError } = await authClient.auth.verifyOtp({
        token_hash: fields.token_hash,
        type,
      });
      if (!otpError) return data;
    }
  }

  if (fields.email && fields.password) {
    const { error: signInError } = await authClient.auth.signInWithPassword({
      email: fields.email,
      password: fields.password,
    });
    if (!signInError) return data;
    if (!fields.token_hash) {
      throw new Error(formatEntradasAuthError(signInError, { action: "password" }));
    }
  }

  throw new Error("No se pudo completar el acceso. Pedí un enlace nuevo e intentá de nuevo.");
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
  return { purpose: pickEntradasAuthSessionFields(payload).purpose };
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
    entrada_concierto: (programa.entrada_concierto || [])
      .filter((c) => c?.activo !== false)
      .map(aplicarDatosEventoAConciertoEntrada),
  }));
}

export async function getConciertoBySlug(slug) {
  const { data, error } = await supabaseEntradasPublic
    .from("entrada_concierto")
    .select(
      `*, entrada_programa!inner(id, nombre, slug_publico, detalle_richtext, activo), evento:eventos!entrada_concierto_ofrn_evento_id_fkey(id, fecha, hora_inicio, id_locacion, descripcion, locaciones(id, nombre, localidades(localidad)))`,
    )
    .eq("slug_publico", slug)
    .eq("activo", true)
    .eq("entrada_programa.activo", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.entrada_programa?.activo === false) return null;
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

export async function cambiarCantidadReserva({ reservaId, cantidad }) {
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_cambiar_cantidad_reserva", {
    p_reserva_id: reservaId,
    p_cantidad: cantidad,
  });
  if (error) throw error;
  const payload = Array.isArray(data) ? data[0] : data;
  return payload;
}

export async function enviarMailReserva({
  reservaId,
  qrReservaToken,
  qrEntradaTokens,
  pdfBase64,
  action = "confirmacion",
  cantidadAnterior,
}) {
  const { error } = await supabaseEntradasPublic.functions.invoke("entradas-send-reserva-email", {
    body: {
      action,
      reservaId,
      qrReservaToken,
      qrEntradaTokens,
      pdfBase64: pdfBase64 || undefined,
      appUrl: window.location.origin,
      ...(action === "cambio_cantidad" && cantidadAnterior != null
        ? { cantidadAnterior }
        : {}),
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
  const { error } = await supabaseEntradasPublic.rpc("entrada_actualizar_referencia_tercero", {
    p_reserva_id: reservaId,
    p_referencia: referencia ? String(referencia).trim() : null,
  });
  if (error) throw error;
}

const RESERVA_CONCIERTO_EMBED = `id, nombre, slug_publico, detalle_richtext, activo, reservas_habilitadas, apertura_reservas_at, ofrn_evento_id,
    entrada_programa(id, nombre, detalle_richtext), ${ENTRADA_CONCIERTO_EVENTO_EMBED}`;

const RESERVA_TERCEROS_SELECT = `id, codigo_reserva, cantidad_solicitada, estado, created_at, qr_reserva_token,
  reservada_por, email_beneficiario, beneficiario_referencia, usuario_id,
  concierto:entrada_concierto(${RESERVA_CONCIERTO_EMBED}),
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
  entradasRows = [],
}) {
  const linkConcierto = linkCatalogoConcierto(concierto);
  const rows = Array.isArray(entradasRows) && entradasRows.length
    ? entradasRows
    : [...(reserva?.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const qrReservaUsado = entradasTodasIngresadas(reserva);
  const entriesUsadas = (qrEntradaTokens || []).map((_, i) => rows[i]?.estado_ingreso === "ingresada");

  const qrReservaDataUrl = await tokenToQrDataUrl(qrReservaToken, { used: qrReservaUsado });
  const entriesQrDataUrls = await Promise.all(
    (qrEntradaTokens || []).map((t, i) => tokenToQrDataUrl(t, { used: entriesUsadas[i] })),
  );
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
    qrReservaUsado,
    entriesUsadas,
  });
  const filename = makeEntradasReservaFilename(reserva?.codigo_reserva);
  return { blob, filename };
}

/** Evita doble generación de toDataURL cuando ya se obtuvieron QRs en pantalla. */
export async function buildEntradasReservaPdfConDataUrls({ concierto, reserva, reservaQrDataUrl, entriesQrDataUrls }) {
  const rows = [...(reserva?.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const qrReservaUsado = entradasTodasIngresadas(reserva);
  const entriesUsadas = (entriesQrDataUrls || []).map((_, i) => rows[i]?.estado_ingreso === "ingresada");
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
    qrReservaUsado,
    entriesUsadas,
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
    entradasRows: sorted,
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
      `id, codigo_reserva, cantidad_solicitada, estado, created_at, qr_reserva_token, concierto:entrada_concierto(${RESERVA_CONCIERTO_EMBED}), entradas:entrada_reserva_entrada(id, orden, estado_ingreso, ingresada_at, qr_entrada_token)`,
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

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Consume QR con 1–2 reintentos ante error de red/timeout.
 * Con clientOpId usa RPC idempotente (cola offline).
 */
export async function validarYConsumirQr({
  token,
  modo = "auto",
  confirmarParcial,
  conciertoId = null,
  ordenesIngresar = null,
  clientOpId = null,
  retries = 2,
}) {
  const ordenes =
    Array.isArray(ordenesIngresar) && ordenesIngresar.length > 0
      ? ordenesIngresar.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : null;
  const useIdem = Boolean(clientOpId);
  const payload = useIdem
    ? {
        p_token: token,
        p_modo: modo,
        p_confirmar_parcial: Boolean(confirmarParcial),
        p_concierto_id: conciertoId == null || conciertoId === "" ? null : Number(conciertoId),
        p_ordenes_ingresar: ordenes,
        p_client_op_id: clientOpId,
      }
    : {
        p_token: token,
        p_modo: modo,
        p_confirmar_parcial: Boolean(confirmarParcial),
        p_concierto_id: conciertoId == null || conciertoId === "" ? null : Number(conciertoId),
        p_ordenes_ingresar: ordenes,
      };
  const rpcName = useIdem ? "entrada_validar_y_consumir_qr_idem" : "entrada_validar_y_consumir_qr";

  let lastError;
  const maxAttempts = Math.max(1, Number(retries) + 1);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { data, error } = await supabaseEntradasPublic.rpc(rpcName, payload);
      if (error) throw error;
      return data;
    } catch (err) {
      lastError = err;
      const canRetry = attempt < maxAttempts - 1 && isEntradasNetworkError(err);
      if (!canRetry) break;
      await sleepMs(400 * (attempt + 1));
    }
  }
  if (isEntradasNetworkError(lastError)) {
    throw new Error("No se pudo conectar para registrar el ingreso. Revisá la señal e intentá de nuevo.");
  }
  throw lastError;
}

/** Roster de recepción (hashes + estados) para caché local del dispositivo. */
export async function fetchRecepcionSnapshot(conciertoId) {
  const cid = Number(conciertoId);
  if (!Number.isFinite(cid) || cid <= 0) throw new Error("Concierto inválido.");
  try {
    const { data, error } = await supabaseEntradasPublic.rpc("entrada_recepcion_snapshot", {
      p_concierto_id: cid,
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.detalle || data?.reason || "No se pudo descargar el roster.");
    return data;
  } catch (err) {
    if (isEntradasNetworkError(err)) {
      throw new Error("Sin conexión: no se pudo actualizar el roster. Revisá la señal e intentá de nuevo.");
    }
    throw err;
  }
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
    const attendance = adminConciertoAttendanceTotals({ ingresadas: 0, sinEntrada: 0 });
    return {
      aperturaPendiente: true,
      reservadas: 0,
      disponibles: capacidad,
      ...attendance,
      noUtilizadas: 0,
      capacidad,
      recordatoriosApertura: recordatoriosAperturaPendientes,
      recordatoriosAperturaPendientes,
    };
  }

  const [recordatoriosRes, recordatoriosPendAbiertasRes, reservasRes, sinEntradaRes] = await Promise.all([
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
    supabaseEntradasPublic
      .from("entrada_concierto_sin_entrada")
      .select("cantidad")
      .eq("entrada_concierto_id", conciertoIdNum)
      .maybeSingle(),
  ]);

  if (recordatoriosRes.error) throw recordatoriosRes.error;
  if (recordatoriosPendAbiertasRes.error) throw recordatoriosPendAbiertasRes.error;
  if (reservasRes.error) throw reservasRes.error;
  if (sinEntradaRes.error) throw sinEntradaRes.error;

  const recordatoriosApertura = recordatoriosRes.count ?? 0;
  const recordatoriosAperturaPendientesAbiertas = recordatoriosPendAbiertasRes.count ?? 0;

  const reservas = reservasRes.data || [];
  const reservadas = reservas
    .filter((r) => r?.estado === "activa")
    .reduce((acc, r) => acc + Number(r?.cantidad_solicitada || 0), 0);
  const ingresadasQr = reservas.reduce((acc, r) => {
    const entradas = Array.isArray(r?.entrada_reserva_entrada) ? r.entrada_reserva_entrada : [];
    return acc + entradas.filter((e) => e?.estado_ingreso === "ingresada").length;
  }, 0);
  const attendance = adminConciertoAttendanceTotals({
    ingresadas: ingresadasQr,
    sinEntrada: Number(sinEntradaRes.data?.cantidad ?? 0),
  });
  const disponibles = Math.max(0, capacidad - reservadas);
  const noUtilizadas = Math.max(0, reservadas - attendance.ingresadas);

  return {
    aperturaPendiente: false,
    reservadas,
    disponibles,
    ...attendance,
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

const RESERVA_ADMIN_LIST_SELECT = `id, codigo_reserva, cantidad_solicitada, estado, created_at, email_beneficiario, beneficiario_referencia, reservada_por,
  concierto:entrada_concierto(id, nombre),
  usuario:entrada_usuario!entrada_reserva_usuario_id_fkey(id, nombre, apellido, email),
  entrada_reserva_entrada(id, estado_ingreso)`;

function countEntradasIngresadasReserva(row) {
  const entradas = Array.isArray(row?.entrada_reserva_entrada) ? row.entrada_reserva_entrada : [];
  return entradas.filter((e) => e?.estado_ingreso === "ingresada").length;
}

/** Etiqueta legible del titular/beneficiario para listados admin. */
export function usuarioLabelReservaAdmin(row) {
  const u = row?.usuario;
  const nombre = [u?.apellido, u?.nombre].filter(Boolean).join(", ");
  const emailBenef = String(row?.email_beneficiario || "").trim();
  const ref = String(row?.beneficiario_referencia || "").trim();
  if (emailBenef && row?.reservada_por) {
    return ref ? `${emailBenef} (${ref})` : emailBenef;
  }
  if (nombre && u?.email) return `${nombre} · ${u.email}`;
  if (nombre) return nombre;
  return u?.email || emailBenef || "—";
}

function mapReservaAdminListRow(row) {
  return {
    id: Number(row.id),
    codigoReserva: row.codigo_reserva,
    usuarioLabel: usuarioLabelReservaAdmin(row),
    email: String(row?.usuario?.email || row?.email_beneficiario || "").trim(),
    cantidad: Number(row?.cantidad_solicitada) || 0,
    ingresadas: countEntradasIngresadasReserva(row),
    createdAt: row.created_at,
    conciertoNombre: String(row?.concierto?.nombre || "").trim(),
    conciertoId: Number(row?.concierto?.id) || null,
  };
}

/**
 * Listado admin de reservas o recordatorios por categoría (misma lógica que mails).
 * @param {number[]} conciertoIds
 * @param {"reservaron"|"ingresaron"|"sinIngreso"|"recordatorio"} bucket
 */
export async function getAdminReservasList(conciertoIds, bucket) {
  const ids = [...new Set((conciertoIds || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) return [];

  if (bucket === "recordatorio") {
    const { data, error } = await supabaseEntradasPublic
      .from("entrada_recordatorio_apertura")
      .select(
        "id, email, created_at, concierto_id, concierto:entrada_concierto(id, nombre), usuario:entrada_usuario(nombre, apellido, email)",
      )
      .in("concierto_id", ids)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data || []).map((row) => {
      const u = row.usuario;
      const nombre = [u?.apellido, u?.nombre].filter(Boolean).join(", ");
      const email = String(row.email || "").trim();
      const usuarioLabel = nombre ? `${nombre} · ${email}` : email || "—";
      return {
        id: `rec-${row.id}`,
        codigoReserva: null,
        usuarioLabel,
        email,
        cantidad: null,
        ingresadas: null,
        createdAt: row.created_at,
        conciertoNombre: String(row?.concierto?.nombre || "").trim(),
        conciertoId: Number(row?.concierto_id) || null,
      };
    });
  }

  const { data, error } = await supabaseEntradasPublic
    .from("entrada_reserva")
    .select(RESERVA_ADMIN_LIST_SELECT)
    .in("concierto_id", ids)
    .eq("estado", "activa")
    .order("created_at", { ascending: false });
  if (error) throw error;

  let rows = data || [];
  if (bucket === "ingresaron") {
    rows = rows.filter((row) => countEntradasIngresadasReserva(row) > 0);
  } else if (bucket === "sinIngreso") {
    rows = rows.filter((row) => countEntradasIngresadasReserva(row) === 0);
  }

  return rows.map(mapReservaAdminListRow);
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

export async function adminSuspenderPrograma({ programaId, cancelarReservas = false }) {
  const id = Number(programaId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Programa inválido.");
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_suspender_programa", {
    p_programa_id: id,
    p_cancelar_reservas: Boolean(cancelarReservas),
  });
  if (error) throw error;
  return data;
}

export async function adminSuspenderConcierto({ conciertoId, cancelarReservas = false }) {
  const id = Number(conciertoId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Concierto inválido.");
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_suspender_concierto", {
    p_concierto_id: id,
    p_cancelar_reservas: Boolean(cancelarReservas),
  });
  if (error) throw error;
  return data;
}

export async function adminContarReservasRestaurables(scope, id) {
  const entityId = Number(id);
  if (!Number.isFinite(entityId) || entityId <= 0) throw new Error("Entidad inválida.");
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_contar_reservas_restaurables", {
    p_scope: scope === "programa" ? "programa" : "concierto",
    p_id: entityId,
  });
  if (error) throw error;
  return {
    reservas: Number(data?.reservas) || 0,
    plazas: Number(data?.plazas) || 0,
  };
}

export async function adminReactivarPrograma(programaId, { restaurarReservasSuspension = false } = {}) {
  const id = Number(programaId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Programa inválido.");
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_reactivar_programa", {
    p_programa_id: id,
    p_restaurar_reservas_suspension: Boolean(restaurarReservasSuspension),
  });
  if (error) throw error;
  return data;
}

export async function adminReactivarConcierto(conciertoId, { restaurarReservasSuspension = false } = {}) {
  const id = Number(conciertoId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Concierto inválido.");
  const { data, error } = await supabaseEntradasPublic.rpc("entrada_admin_reactivar_concierto", {
    p_concierto_id: id,
    p_restaurar_reservas_suspension: Boolean(restaurarReservasSuspension),
  });
  if (error) throw error;
  return data;
}

/** Aviso masivo tras suspender programa con cancelación de reservas. */
export async function enviarMailCancelacionPrograma({ programaNombre, notificar, appUrl }) {
  const { data, error } = await supabaseEntradasPublic.functions.invoke("entradas-send-cancelacion", {
    body: {
      programaNombre: programaNombre ? String(programaNombre) : "",
      notificar: Array.isArray(notificar) ? notificar : [],
      appUrl: appUrl || window.location.origin,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
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
