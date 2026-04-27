import QRCode from "qrcode";
import {
  blobToBase64NoPrefix,
  buildEntradasReservaPdfBlob,
  downloadEntradasReservaPdfBlob,
  makeEntradasReservaFilename,
} from "../utils/entradasReservaPdf";
import { supabase } from "./supabase";

export async function getEntradasSessionProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { session: null, profile: null };

  const { data: profile } = await supabase
    .from("entrada_usuario")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  return { session, profile: profile || null };
}

export async function ensureEntradaProfile({ nombre, apellido }) {
  const { data, error } = await supabase.rpc("entrada_ensure_profile", {
    p_nombre: nombre,
    p_apellido: apellido,
  });
  if (error) throw error;
  return data;
}

export async function listProgramasConConciertos() {
  const { data, error } = await supabase
    .from("entrada_programa")
    .select(
      "id, slug_publico, nombre, detalle_richtext, activo, entrada_concierto(id, slug_publico, nombre, fecha_hora, lugar_nombre, capacidad_maxima, reservas_habilitadas, activo, imagen_drive_url, ofrn_programa_id, ofrn_evento_id)",
    )
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getConciertoBySlug(slug) {
  const { data, error } = await supabase
    .from("entrada_concierto")
    .select(
      "*, entrada_programa(id, nombre, slug_publico, detalle_richtext), entrada_reserva!left(id, cantidad_solicitada, estado), evento:eventos!entrada_concierto_ofrn_evento_id_fkey(id, fecha, hora_inicio, id_locacion, descripcion, locaciones(id, nombre, localidades(localidad)))",
    )
    .eq("slug_publico", slug)
    .eq("activo", true)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export function computeDisponibles(concierto) {
  const ocupadas = (concierto?.entrada_reserva || [])
    .filter((r) => r.estado === "activa")
    .reduce((acc, row) => acc + Number(row.cantidad_solicitada || 0), 0);
  return Math.max(0, Number(concierto?.capacidad_maxima || 0) - ocupadas);
}

export async function crearReserva({ conciertoId, cantidad }) {
  const { data, error } = await supabase.rpc("entrada_crear_reserva", {
    p_concierto_id: conciertoId,
    p_cantidad: cantidad,
  });
  if (error) throw error;
  const payload = Array.isArray(data) ? data[0] : data;
  return payload;
}

export async function enviarMailReserva({ reservaId, qrReservaToken, qrEntradaTokens, pdfBase64 }) {
  const { error } = await supabase.functions.invoke("entradas-send-reserva-email", {
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
    fechaHora: concierto?.fecha_hora,
    lugarNombre: concierto?.lugar_nombre,
    detalleRichtext: concierto?.detalle_richtext,
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
    fechaHora: concierto?.fecha_hora,
    lugarNombre: concierto?.lugar_nombre,
    detalleRichtext: concierto?.detalle_richtext,
    codigoReserva: reserva?.codigo_reserva,
    cantidad: Number(reserva?.cantidad_solicitada) || 0,
    linkConcierto: linkCatalogoConcierto(concierto),
    qrReservaDataUrl: reservaQrDataUrl,
    entriesQrDataUrls: entriesQrDataUrls || [],
  });
  return { blob, filename: makeEntradasReservaFilename(reserva?.codigo_reserva) };
}

export async function descargarPdfDesdeReservaRow(reserva) {
  if (!reserva?.qr_reserva_token) {
    throw new Error(
      "No hay códigos guardados en el sistema para esta reserva. Solo se puede descargar el PDF de reservas creadas después de la actualización de almacenamiento de QR.",
    );
  }
  const sorted = [...(reserva.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const tokens = sorted.map((e) => e.qr_entrada_token).filter(Boolean);
  if (tokens.length !== Number(reserva.cantidad_solicitada) || !tokens.length) {
    throw new Error("Faltan datos de entradas para generar el PDF. Contactá a la administración.");
  }
  const { blob, filename } = await buildEntradasReservaPdfConQr({
    concierto: reserva.concierto,
    reserva,
    qrReservaToken: reserva.qr_reserva_token,
    qrEntradaTokens: tokens,
  });
  downloadEntradasReservaPdfBlob(blob, filename);
}

export async function blobToPdfBase64ForMail(blob) {
  return blobToBase64NoPrefix(blob);
}

export async function cancelarReserva(reservaId) {
  const { error } = await supabase.rpc("entrada_cancelar_reserva", {
    p_reserva_id: reservaId,
  });
  if (error) throw error;
}

export async function enviarMailCancelacionReserva({ reservaId }) {
  const { error } = await supabase.functions.invoke("entradas-send-reserva-email", {
    body: {
      action: "cancelacion",
      reservaId,
      appUrl: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function tokenToQrDataUrl(token) {
  return QRCode.toDataURL(token, { margin: 1, width: 320 });
}

export async function listConciertoIdsConReservaActiva() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("entrada_reserva")
    .select("concierto_id")
    .eq("estado", "activa");
  if (error) throw error;
  return (data || []).map((r) => Number(r.concierto_id));
}

export async function listarMisReservas() {
  const { data, error } = await supabase
    .from("entrada_reserva")
    .select(
      "id, codigo_reserva, cantidad_solicitada, estado, created_at, qr_reserva_token, concierto:entrada_concierto(id, nombre, fecha_hora, slug_publico, lugar_nombre, detalle_richtext), entradas:entrada_reserva_entrada(id, orden, estado_ingreso, ingresada_at, qr_entrada_token)",
    )
    .order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function previewEntradaQr(token, conciertoId = null) {
  const { data, error } = await supabase.rpc("entrada_preview_qr", {
    p_token: token,
    p_concierto_id: conciertoId == null || conciertoId === "" ? null : Number(conciertoId),
  });
  if (error) throw error;
  return data;
}

export async function validarYConsumirQr({ token, modo = "auto", confirmarParcial, conciertoId = null }) {
  const { data, error } = await supabase.rpc("entrada_validar_y_consumir_qr", {
    p_token: token,
    p_modo: modo,
    p_confirmar_parcial: Boolean(confirmarParcial),
    p_concierto_id: conciertoId == null || conciertoId === "" ? null : Number(conciertoId),
  });
  if (error) throw error;
  return data;
}

export async function listAdminData() {
  const [programasRes, conciertosRes, usuariosRes] = await Promise.all([
    supabase.from("entrada_programa").select("*").order("id", { ascending: false }),
    supabase
      .from("entrada_concierto")
      .select(
        "*, programa:entrada_programa(id, nombre), evento:eventos!entrada_concierto_ofrn_evento_id_fkey(id, fecha, hora_inicio, id_locacion, descripcion, locaciones(id, nombre, localidades(localidad)), programas(id, nomenclador, subtitulo))",
      )
      .order("fecha_hora", { ascending: false }),
    supabase.from("entrada_usuario").select("*").order("apellido", { ascending: true }),
  ]);
  if (programasRes.error) throw programasRes.error;
  if (conciertosRes.error) throw conciertosRes.error;
  if (usuariosRes.error) throw usuariosRes.error;
  return {
    programas: programasRes.data || [],
    conciertos: conciertosRes.data || [],
    usuarios: usuariosRes.data || [],
  };
}

export async function getAdminConciertoStats(conciertoId) {
  const conciertoIdNum = Number(conciertoId);
  if (!Number.isFinite(conciertoIdNum) || conciertoIdNum <= 0) {
    throw new Error("Concierto inválido.");
  }

  const [conciertoRes, reservasRes] = await Promise.all([
    supabase.from("entrada_concierto").select("id, capacidad_maxima").eq("id", conciertoIdNum).maybeSingle(),
    supabase
      .from("entrada_reserva")
      .select("id, estado, cantidad_solicitada, entrada_reserva_entrada(id, estado_ingreso)")
      .eq("concierto_id", conciertoIdNum),
  ]);

  if (conciertoRes.error) throw conciertoRes.error;
  if (reservasRes.error) throw reservasRes.error;

  const reservas = reservasRes.data || [];
  const reservadas = reservas
    .filter((r) => r?.estado === "activa")
    .reduce((acc, r) => acc + Number(r?.cantidad_solicitada || 0), 0);
  const ingresadas = reservas.reduce((acc, r) => {
    const entradas = Array.isArray(r?.entrada_reserva_entrada) ? r.entrada_reserva_entrada : [];
    return acc + entradas.filter((e) => e?.estado_ingreso === "ingresada").length;
  }, 0);
  const capacidad = Number(conciertoRes.data?.capacidad_maxima || 0);
  const disponibles = Math.max(0, capacidad - reservadas);
  const noUtilizadas = Math.max(0, reservadas - ingresadas);

  return { reservadas, disponibles, ingresadas, noUtilizadas, capacidad };
}

export async function adminUpsertPrograma(payload) {
  const { data, error } = await supabase.rpc("entrada_admin_upsert_programa", {
    p_id: payload.id ?? null,
    p_nombre: payload.nombre,
    p_detalle_richtext: payload.detalle_richtext ?? "",
    p_activo: payload.activo ?? true,
  });
  if (error) throw error;
  return data;
}

export async function adminUpsertConcierto(payload) {
  const { data, error } = await supabase.rpc("entrada_admin_upsert_concierto", {
    p_id: payload.id ?? null,
    p_ofrn_evento_id: payload.ofrn_evento_id,
    p_nombre: payload.nombre,
    p_detalle_richtext: payload.detalle_richtext ?? "",
    p_imagen_drive_url: payload.imagen_drive_url ?? "",
    p_capacidad_maxima: Number(payload.capacidad_maxima || 0),
    p_reservas_habilitadas: payload.reservas_habilitadas ?? true,
    p_activo: payload.activo ?? true,
  });
  if (error) throw error;
  return data;
}

export async function adminUpdateUsuarioRol({ id, rol }) {
  const { error } = await supabase.from("entrada_usuario").update({ rol }).eq("id", id);
  if (error) throw error;
}
