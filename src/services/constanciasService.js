import {
  CONSTANCIAS_TIPOS_GIRA,
  CONSTANCIA_ESTADOS,
  CONSTANCIA_TIPOS,
  CONSTANCIA_TIPO_LABEL,
  CONSTANCIA_MODO_PARA_FIRMAR,
  CONSTANCIA_MAIL_OFICINA,
  CONSTANCIA_MAIL_MODELOS,
} from "../constants/constancias";
import { resolveGiraRosterIds } from "./giraService";
import { integranteIdForDb, integranteKey } from "../utils/integranteIds";
import { legalNombre, legalApellido } from "../utils/integranteDisplayName";
import {
  generateConstanciaPdf,
  formatRangoFechasConstancia,
  formatLocalidadesConstancia,
} from "../utils/constanciaPdf";
import { formatProgramSelectLabel } from "../utils/giraUtils";
import { suggestConstanciaFechasFromLogistics } from "./constanciaLogisticsFechas";

const SOLICITUD_SELECT = `
  id, id_integrante, id_gira, tipo, estado, motivo_denegacion,
  solicitado_at, resuelto_at, resuelto_por, visto_solicitante,
  mail_enviado_at, mail_error, reemitida_at,
  snap_nombre, snap_apellido, snap_dni, snap_genero, snap_instrumento,
  snap_funcion,
  snap_fecha_desde, snap_fecha_hasta, snap_localidades,
  snap_gira_nombre, snap_gira_tipo,
  integrantes!constancias_solicitudes_id_integrante_fkey (
    id, nombre, apellido, mail, dni, genero, id_instr,
    instrumentos ( instrumento, funcion )
  ),
  resuelto_por_ref:integrantes!constancias_solicitudes_resuelto_por_fkey (
    id, nombre, apellido, nombre_preferencia, apellido_preferencia
  ),
  programas!constancias_solicitudes_id_gira_fkey (
    id, nombre_gira, nomenclador, mes_letra, zona, tipo,
    fecha_desde, fecha_hasta, estado
  )
`;

/**
 * Nombre y apellido legales para el PDF / mail oficial.
 * Nunca usa `nombre_preferencia` / `apellido_preferencia` (ni seating).
 * Si el objeto pasó por `applySeatingDisplayNames`, lee `nombre_legal` /
 * `apellido_legal`; si viene de la tabla, `nombre` / `apellido`.
 */
function legalNombreApellidoConstancia(person) {
  return {
    nombre: legalNombre(person),
    apellido: legalApellido(person),
  };
}

/** Relee nombre/apellido legales frescos de `integrantes` (sin preferencia). */
async function fetchIntegranteLegalNombreApellido(supabase, idIntegrante) {
  const id = integranteIdForDb(idIntegrante);
  if (!id) return { nombre: "", apellido: "" };
  const { data, error } = await supabase
    .from("integrantes")
    .select("nombre, apellido")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return legalNombreApellidoConstancia(data);
}

/** YYYY-MM-DD local (sin UTC shift). */
function todayIsoLocal() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Gira ya terminada (fecha_hasta estrictamente anterior a hoy). */
export function isGiraPasadaConstancia(programa) {
  const hasta = String(programa?.fecha_hasta || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return false;
  return hasta < todayIsoLocal();
}

export function normalizeConstanciaTipo(tipo) {
  if (tipo === CONSTANCIA_TIPOS.participacion) {
    return CONSTANCIA_TIPOS.participacion;
  }
  return CONSTANCIA_TIPOS.convocatoria;
}

function appOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://ofrn-web-app.vercel.app";
}

export function constanciaGestionLink(solicitudId) {
  const base = `${appOrigin()}/management/constancias`;
  if (solicitudId == null) return base;
  return `${base}?solicitud=${encodeURIComponent(String(solicitudId))}`;
}

async function invokeConstanciaMail(supabase, { templateId, email, nombre, gira, detalle }) {
  const { data, error } = await supabase.functions.invoke("mails_produccion", {
    body: {
      action: "enviar_mail",
      templateId,
      email,
      nombre: nombre || "",
      gira: gira || "",
      detalle: detalle || {},
    },
  });
  if (error) {
    let detail = error.message || String(error);
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) detail = body.error;
      } else if (data?.error) {
        detail = data.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

async function fetchLocalidadesGira(supabase, idGira) {
  const names = [];
  const seen = new Set();

  const push = (name) => {
    const n = String(name || "").trim();
    if (!n || seen.has(n.toLowerCase())) return;
    seen.add(n.toLowerCase());
    names.push(n);
  };

  const { data: tramos } = await supabase
    .from("giras_tramo_segmentos")
    .select(
      "indice, giras_tramo_localidades ( id_localidad, localidades ( localidad ) )",
    )
    .eq("id_gira", idGira)
    .order("indice");

  (tramos || []).forEach((seg) => {
    (seg.giras_tramo_localidades || []).forEach((row) => {
      push(row?.localidades?.localidad);
    });
  });

  if (names.length === 0) {
    const { data: gl } = await supabase
      .from("giras_localidades")
      .select("id_localidad, localidades ( localidad )")
      .eq("id_gira", idGira);
    (gl || []).forEach((row) => push(row?.localidades?.localidad));
  }

  return names;
}

function pickInstrumentoRow(row) {
  if (!row) return null;
  const instrumento = String(row.instrumento || "").trim();
  const funcion = String(row.funcion || "").trim();
  if (!instrumento && !funcion) return null;
  return {
    instrumento: instrumento || "integrante",
    funcion: funcion || (instrumento ? instrumento.toLowerCase() : "integrante"),
  };
}

/**
 * Instrumento/función para la constancia.
 * Misma regla que GiraRoster: `giras_integrantes.id_instr` solo se guarda si
 * el instrumento de la gira difiere del de perfil; si está seteado, manda ese.
 */
async function resolveInstrumentoYFuncion(supabase, integrante, idGira) {
  const idInt = integranteIdForDb(integrante.id);
  const { data: ov } = await supabase
    .from("giras_integrantes")
    .select("id_instr")
    .eq("id_gira", idGira)
    .eq("id_integrante", idInt)
    .maybeSingle();

  const idInstrGira =
    ov?.id_instr != null && String(ov.id_instr).trim() !== ""
      ? ov.id_instr
      : null;
  const idInstrPerfil =
    integrante?.id_instr != null && String(integrante.id_instr).trim() !== ""
      ? integrante.id_instr
      : null;
  const idInstrEfectivo = idInstrGira ?? idInstrPerfil;

  if (idInstrEfectivo != null) {
    const { data: instr } = await supabase
      .from("instrumentos")
      .select("instrumento, funcion")
      .eq("id", idInstrEfectivo)
      .maybeSingle();
    const picked = pickInstrumentoRow(instr);
    if (picked) return picked;
  }

  // Fallback si el join de perfil ya vino en el integrante
  if (!idInstrGira) {
    const fromInt = pickInstrumentoRow(integrante?.instrumentos);
    if (fromInt) return fromInt;
  }

  return { instrumento: "integrante", funcion: "integrante" };
}

export async function buildConstanciaSnapshot(supabase, integrante, programa) {
  const localidades = await fetchLocalidadesGira(supabase, programa.id);
  const { instrumento, funcion } = await resolveInstrumentoYFuncion(
    supabase,
    integrante,
    programa.id,
  );
  // Documento oficial: siempre nombre/apellido reales (no preferencia).
  const legal = legalNombreApellidoConstancia(integrante);
  return {
    snap_nombre: legal.nombre,
    snap_apellido: legal.apellido,
    snap_dni: String(integrante.dni || "").replace(/\s+/g, ""),
    snap_genero: integrante.genero || null,
    snap_instrumento: instrumento,
    snap_funcion: funcion,
    snap_fecha_desde: programa.fecha_desde || null,
    snap_fecha_hasta: programa.fecha_hasta || null,
    snap_localidades: formatLocalidadesConstancia(localidades),
    snap_gira_nombre: programa.nombre_gira || formatProgramSelectLabel(programa),
    snap_gira_tipo: programa.tipo || null,
    _localidades_list: localidades,
  };
}

/**
 * Giras Sinfónico / Camerata Filarmónica donde la persona está en nómina y no ausente.
 * @param {object} [opts]
 * @param {string} [opts.tipo] convocatoria | participacion | participacion_para_firmar
 *   — participación realizada: solo giras pasadas;
 *   — para firmar: pasadas y futuras (como convocatoria).
 */
export async function listGirasElegiblesConstancia(
  supabase,
  integranteId,
  { tipo } = {},
) {
  const id = integranteIdForDb(integranteId);
  if (!id) return [];
  const soloPasadas = tipo === CONSTANCIA_TIPOS.participacion;
  // para_firmar y convocatoria: no filtran por fecha_hasta

  const { data: programas, error } = await supabase
    .from("programas")
    .select(
      "id, nombre_gira, nomenclador, mes_letra, zona, tipo, fecha_desde, fecha_hasta, estado",
    )
    .in("tipo", CONSTANCIAS_TIPOS_GIRA)
    .neq("estado", "Borrador")
    .order("fecha_desde", { ascending: false });
  if (error) throw error;

  const { data: overrides } = await supabase
    .from("giras_integrantes")
    .select("id_gira, estado")
    .eq("id_integrante", id);
  const ausenteByGira = new Map(
    (overrides || []).map((o) => [String(o.id_gira), String(o.estado || "").toLowerCase()]),
  );

  const key = integranteKey(id);
  const elegibles = [];
  const batch = programas || [];
  const CONCURRENCY = 6;
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const slice = batch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async (prog) => {
        if (ausenteByGira.get(String(prog.id)) === "ausente") return null;
        if (soloPasadas && !isGiraPasadaConstancia(prog)) {
          return null;
        }
        const ids = await resolveGiraRosterIds(supabase, prog.id);
        const inRoster = (ids || []).some((x) => integranteKey(x) === key);
        return inRoster ? prog : null;
      }),
    );
    results.forEach((p) => {
      if (p) elegibles.push(p);
    });
  }
  return elegibles;
}

export async function listMisConstancias(supabase, integranteId) {
  const id = integranteIdForDb(integranteId);
  const { data, error } = await supabase
    .from("constancias_solicitudes")
    .select(SOLICITUD_SELECT)
    .eq("id_integrante", id)
    .order("solicitado_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function countMisConstanciasNoVistas(supabase, integranteId) {
  const id = integranteIdForDb(integranteId);
  const { count, error } = await supabase
    .from("constancias_solicitudes")
    .select("id", { count: "exact", head: true })
    .eq("id_integrante", id)
    .eq("visto_solicitante", false)
    .in("estado", [CONSTANCIA_ESTADOS.aprobada, CONSTANCIA_ESTADOS.denegada]);
  if (error) throw error;
  return count || 0;
}

export async function countConstanciasPendientes(supabase, { tipo } = {}) {
  let q = supabase
    .from("constancias_solicitudes")
    .select("id", { count: "exact", head: true })
    .eq("estado", CONSTANCIA_ESTADOS.pendiente);
  if (tipo === CONSTANCIA_TIPOS.convocatoria || tipo === CONSTANCIA_TIPOS.participacion) {
    q = q.eq("tipo", tipo);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export async function listConstanciasGestion(supabase, { estado, tipo } = {}) {
  let q = supabase
    .from("constancias_solicitudes")
    .select(SOLICITUD_SELECT)
    .order("solicitado_at", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  if (tipo === CONSTANCIA_TIPOS.convocatoria || tipo === CONSTANCIA_TIPOS.participacion) {
    q = q.eq("tipo", tipo);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function markConstanciasVistas(supabase, integranteId) {
  const id = integranteIdForDb(integranteId);
  const { error } = await supabase
    .from("constancias_solicitudes")
    .update({ visto_solicitante: true, updated_at: new Date().toISOString() })
    .eq("id_integrante", id)
    .eq("visto_solicitante", false);
  if (error) throw error;
}

async function loadProgramaConstancia(supabase, idGira) {
  const { data: programa, error: progErr } = await supabase
    .from("programas")
    .select(
      "id, nombre_gira, nomenclador, mes_letra, zona, tipo, fecha_desde, fecha_hasta, estado",
    )
    .eq("id", idGira)
    .maybeSingle();
  if (progErr) throw progErr;
  if (!programa) throw new Error("Gira no encontrada");
  if (!CONSTANCIAS_TIPOS_GIRA.includes(programa.tipo)) {
    throw new Error("Solo Sinfónico o Camerata Filarmónica");
  }
  if (String(programa.estado || "") === "Borrador") {
    throw new Error("La gira aún no está publicada");
  }
  return programa;
}

/** Solo columnas legales (+ instrumento) para armar snapshot de constancia. */
async function loadIntegranteForConstancia(supabase, idIntegrante) {
  const idInt = integranteIdForDb(idIntegrante);
  if (!idInt) throw new Error("Integrante inválido");
  const { data: integrante, error: intErr } = await supabase
    .from("integrantes")
    .select(
      "id, nombre, apellido, mail, dni, genero, id_instr, instrumentos ( instrumento, funcion )",
    )
    .eq("id", idInt)
    .single();
  if (intErr) throw intErr;
  return integrante;
}

/**
 * Misma elegibilidad que el músico al solicitar: nómina, no ausente,
 * participación solo gira pasada.
 */
async function assertConstanciaElegibilidad(
  supabase,
  { idIntegrante, idGira, tipoNorm, asAdmin = false },
) {
  const idInt = integranteIdForDb(idIntegrante);
  if (!idInt) throw new Error("Integrante inválido");
  if (!idGira) throw new Error("Elegí una gira");

  const programa = await loadProgramaConstancia(supabase, idGira);
  if (
    tipoNorm === CONSTANCIA_TIPOS.participacion &&
    !isGiraPasadaConstancia(programa)
  ) {
    throw new Error(
      asAdmin
        ? "Participación realizada solo aplica a giras ya finalizadas"
        : "La constancia de participación realizada solo se puede pedir de giras ya finalizadas",
    );
  }

  const { data: ov } = await supabase
    .from("giras_integrantes")
    .select("estado")
    .eq("id_gira", idGira)
    .eq("id_integrante", idInt)
    .maybeSingle();
  if (String(ov?.estado || "").toLowerCase() === "ausente") {
    throw new Error(
      asAdmin
        ? "La persona figura ausente en esa gira"
        : "No podés solicitar constancia si figurás ausente en esa gira",
    );
  }

  const rosterIds = await resolveGiraRosterIds(supabase, idGira);
  const key = integranteKey(idInt);
  if (!(rosterIds || []).some((x) => integranteKey(x) === key)) {
    throw new Error(
      asAdmin
        ? "La persona no figura en la nómina de esa gira"
        : "No figurás en la nómina de esa gira",
    );
  }

  return { idInt, programa };
}

/**
 * Fechas de solicitud del músico: base = programa.
 * Solo amplía a la logística (no local) si tildó día de salida / regreso.
 */
async function resolveFechasSolicitudMusico(
  supabase,
  { idIntegrante, idGira, programa, incluirDiaSalida, incluirDiaRegreso },
) {
  const progDesde = normalizeSnapFecha(programa?.fecha_desde);
  const progHasta =
    normalizeSnapFecha(programa?.fecha_hasta) || progDesde;
  let desde = progDesde;
  let hasta = progHasta;

  if (!incluirDiaSalida && !incluirDiaRegreso) {
    return { desde, hasta };
  }

  const sug = await suggestConstanciaFechasFromLogistics(supabase, {
    idIntegrante,
    idGira,
  });
  if (sug?.isLocal === false) {
    const logDesde = normalizeSnapFecha(sug.fechaDesde);
    const logHasta = normalizeSnapFecha(sug.fechaHasta);
    if (
      incluirDiaSalida &&
      logDesde &&
      progDesde &&
      logDesde < progDesde
    ) {
      desde = logDesde;
    }
    if (
      incluirDiaRegreso &&
      logHasta &&
      progHasta &&
      logHasta > progHasta
    ) {
      hasta = logHasta;
    }
  }
  return { desde, hasta };
}

export async function solicitarConstancia(
  supabase,
  { user, idGira, tipo, incluirDiaSalida = false, incluirDiaRegreso = false },
) {
  const idInt = integranteIdForDb(user?.id);
  if (!idInt) throw new Error("Usuario inválido");
  const tipoNorm = normalizeConstanciaTipo(tipo);
  const tipoLabel =
    CONSTANCIA_TIPO_LABEL[tipoNorm] || "Constancia de convocatoria";

  const { programa } = await assertConstanciaElegibilidad(supabase, {
    idIntegrante: idInt,
    idGira,
    tipoNorm,
  });

  const integrante = await loadIntegranteForConstancia(supabase, idInt);
  const snap = await buildConstanciaSnapshot(supabase, integrante, programa);
  const { _localidades_list, ...snapRow } = snap;

  const fechasMusico = await resolveFechasSolicitudMusico(supabase, {
    idIntegrante: idInt,
    idGira,
    programa,
    incluirDiaSalida: Boolean(incluirDiaSalida),
    incluirDiaRegreso: Boolean(incluirDiaRegreso),
  });
  if (fechasMusico.desde) snapRow.snap_fecha_desde = fechasMusico.desde;
  if (fechasMusico.hasta) snapRow.snap_fecha_hasta = fechasMusico.hasta;

  const rowBase = {
    id_integrante: idInt,
    id_gira: Number(idGira),
    tipo: tipoNorm,
    estado: CONSTANCIA_ESTADOS.pendiente,
    motivo_denegacion: null,
    solicitado_at: new Date().toISOString(),
    resuelto_at: null,
    resuelto_por: null,
    visto_solicitante: true,
    mail_enviado_at: null,
    mail_error: null,
    updated_at: new Date().toISOString(),
    ...snapRow,
  };

  const { data: existing } = await supabase
    .from("constancias_solicitudes")
    .select("id, estado")
    .eq("id_integrante", idInt)
    .eq("id_gira", idGira)
    .eq("tipo", tipoNorm)
    .maybeSingle();

  let solicitud;
  if (existing?.id) {
    if (existing.estado === CONSTANCIA_ESTADOS.pendiente) {
      throw new Error(
        `Ya tenés una ${tipoLabel.toLowerCase()} pendiente para esta gira. Esperá la revisión.`,
      );
    }
    if (existing.estado === CONSTANCIA_ESTADOS.aprobada) {
      throw new Error(
        `Ya tenés una ${tipoLabel.toLowerCase()} aprobada para esta gira.`,
      );
    }
    const { data, error } = await supabase
      .from("constancias_solicitudes")
      .update(rowBase)
      .eq("id", existing.id)
      .select(SOLICITUD_SELECT)
      .single();
    if (error) throw error;
    solicitud = data;
  } else {
    const { data, error } = await supabase
      .from("constancias_solicitudes")
      .insert(rowBase)
      .select(SOLICITUD_SELECT)
      .single();
    if (error) throw error;
    solicitud = data;
  }

  const fechasLabel = formatRangoFechasConstancia(
    snap.snap_fecha_desde,
    snap.snap_fecha_hasta,
  );
  const solicitanteNombre = [snap.snap_nombre, snap.snap_apellido]
    .filter(Boolean)
    .join(" ");

  try {
    await notificarOficinaSolicitudConstancia(supabase, {
      solicitud,
      integranteMail: integrante.mail || "",
      fechasLabel,
      solicitanteNombre,
    });
  } catch (mailErr) {
    console.error("[constancias] mail oficina:", mailErr);
    const msg = String(mailErr?.message || mailErr);
    const soft = new Error(
      `Solicitud #${solicitud.id} guardada, pero no se pudo avisar a producción por mail: ${msg}`,
    );
    soft.solicitud = solicitud;
    soft.mailFailed = true;
    throw soft;
  }

  return solicitud;
}

/**
 * Editor/admin genera una constancia ya aprobada para un integrante + gira.
 * Envía el PDF por mail y queda visible en Mis Constancias (badge no vista).
 */
export async function generarConstanciaGestion(
  supabase,
  {
    idIntegrante,
    idGira,
    tipo,
    snapFuncion,
    resueltoPorId,
    fechaDesde,
    fechaHasta,
  },
) {
  const tipoNorm = normalizeConstanciaTipo(tipo);
  const tipoLabel =
    CONSTANCIA_TIPO_LABEL[tipoNorm] || "Constancia de convocatoria";

  const { idInt, programa } = await assertConstanciaElegibilidad(supabase, {
    idIntegrante,
    idGira,
    tipoNorm,
    asAdmin: true,
  });

  const integrante = await loadIntegranteForConstancia(supabase, idInt);
  if (!integrante.mail) {
    throw new Error("La persona no tiene email cargado; no se puede enviar el PDF");
  }

  const snap = await buildConstanciaSnapshot(supabase, integrante, programa);
  const { _localidades_list, ...snapRow } = snap;
  const como = String(
    snapFuncion !== undefined && snapFuncion !== null
      ? snapFuncion
      : snapRow.snap_funcion || "",
  ).trim();

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("constancias_solicitudes")
    .select("id, estado, solicitado_at")
    .eq("id_integrante", idInt)
    .eq("id_gira", idGira)
    .eq("tipo", tipoNorm)
    .maybeSingle();

  if (existing?.estado === CONSTANCIA_ESTADOS.aprobada) {
    throw new Error(
      `Ya hay una ${tipoLabel.toLowerCase()} aprobada para esta persona y gira. Usá Reenviar.`,
    );
  }

  const desdeOverride = normalizeSnapFecha(fechaDesde);
  const hastaOverride = normalizeSnapFecha(fechaHasta) || desdeOverride;

  const rowBase = {
    id_integrante: idInt,
    id_gira: Number(idGira),
    tipo: tipoNorm,
    estado: CONSTANCIA_ESTADOS.aprobada,
    motivo_denegacion: null,
    solicitado_at: existing?.solicitado_at || now,
    resuelto_at: now,
    resuelto_por: integranteIdForDb(resueltoPorId) || null,
    visto_solicitante: false,
    mail_enviado_at: null,
    mail_error: null,
    updated_at: now,
    ...snapRow,
    snap_funcion: como || null,
    ...(desdeOverride
      ? {
          snap_fecha_desde: desdeOverride,
          snap_fecha_hasta: hastaOverride || desdeOverride,
        }
      : {}),
  };

  let solicitud;
  if (existing?.id) {
    const { data, error } = await supabase
      .from("constancias_solicitudes")
      .update(rowBase)
      .eq("id", existing.id)
      .select(SOLICITUD_SELECT)
      .single();
    if (error) throw error;
    solicitud = data;
  } else {
    const { data, error } = await supabase
      .from("constancias_solicitudes")
      .insert(rowBase)
      .select(SOLICITUD_SELECT)
      .single();
    if (error) throw error;
    solicitud = data;
  }

  let mailError = null;
  try {
    await sendAprobacionMail(supabase, solicitud);
  } catch (err) {
    mailError = String(err?.message || err);
    console.error("[constancias] mail generación gestión:", err);
  }

  const { data: finalRow, error: upErr } = await supabase
    .from("constancias_solicitudes")
    .update({
      mail_enviado_at: mailError ? null : new Date().toISOString(),
      mail_error: mailError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitud.id)
    .select(SOLICITUD_SELECT)
    .single();
  if (upErr) throw upErr;

  if (mailError) {
    const soft = new Error(
      `Constancia #${finalRow.id} generada (aprobada), pero falló el mail: ${mailError}`,
    );
    soft.solicitud = finalRow;
    soft.mailFailed = true;
    throw soft;
  }

  return finalRow;
}

/**
 * Preview del texto «como…» (y datos legales) para el modal de generación.
 */
export async function previewConstanciaGestion(
  supabase,
  { idIntegrante, idGira },
) {
  const idInt = integranteIdForDb(idIntegrante);
  if (!idInt) throw new Error("Integrante inválido");
  if (!idGira) throw new Error("Elegí una gira");
  const programa = await loadProgramaConstancia(supabase, idGira);
  const integrante = await loadIntegranteForConstancia(supabase, idInt);
  const snap = await buildConstanciaSnapshot(supabase, integrante, programa);
  return {
    snap_nombre: snap.snap_nombre,
    snap_apellido: snap.snap_apellido,
    snap_instrumento: snap.snap_instrumento,
    snap_funcion: snap.snap_funcion,
    snap_fecha_desde: snap.snap_fecha_desde,
    snap_fecha_hasta: snap.snap_fecha_hasta,
    snap_gira_nombre: snap.snap_gira_nombre,
    mail: integrante.mail || "",
    programa,
  };
}

/** Reenvía / envía el aviso operativo de una solicitud pendiente. */
export async function notificarOficinaSolicitudConstancia(
  supabase,
  { solicitud, integranteMail = "", fechasLabel, solicitanteNombre },
) {
  const nombre =
    solicitanteNombre ||
    [solicitud.snap_nombre, solicitud.snap_apellido].filter(Boolean).join(" ");
  const fechas =
    fechasLabel ||
    formatRangoFechasConstancia(
      solicitud.snap_fecha_desde,
      solicitud.snap_fecha_hasta,
    );
  const tipoNorm = normalizeConstanciaTipo(solicitud.tipo);
  const prog = solicitud.programas || {};
  const mesLetra = String(prog.mes_letra || "").trim();
  const nomenclador = String(prog.nomenclador || "").trim();
  const zona = String(prog.zona || "").trim();
  const giraMetaParts = [mesLetra, nomenclador, zona].filter(Boolean);
  const giraMeta = giraMetaParts.join(" | ");
  const fechaDesdeIso = solicitud.snap_fecha_desde || prog.fecha_desde || "";
  const fechaHastaIso = solicitud.snap_fecha_hasta || prog.fecha_hasta || "";
  const fechasRangoCorto = (() => {
    const fmt = (iso) => {
      const d = String(iso || "").slice(0, 10);
      const [y, m, day] = d.split("-");
      if (!y || !m || !day) return "";
      return `${day}/${m}/${y}`;
    };
    const a = fmt(fechaDesdeIso);
    const b = fmt(fechaHastaIso);
    if (a && b) return `${a}–${b}`;
    return a || b || "";
  })();
  await invokeConstanciaMail(supabase, {
    templateId: "constancia_solicitud",
    email: CONSTANCIA_MAIL_OFICINA,
    nombre: "Producción",
    gira: solicitud.snap_gira_nombre,
    detalle: {
      solicitud_id: solicitud.id,
      solicitante_nombre: nombre,
      nombre: solicitud.snap_nombre,
      apellido: solicitud.snap_apellido,
      dni: solicitud.snap_dni,
      mail: integranteMail || solicitud.integrantes?.mail || "",
      instrumento: solicitud.snap_instrumento,
      funcion: solicitud.snap_funcion,
      gira_tipo: solicitud.snap_gira_tipo,
      gira_nombre: solicitud.snap_gira_nombre,
      mes_letra: mesLetra,
      nomenclador,
      zona,
      gira_meta: giraMeta,
      fechas_rango_corto: fechasRangoCorto,
      fechas_label: fechas,
      localidades: solicitud.snap_localidades,
      // Sin ?solicitud= : abre el panel sin resaltar una fila.
      link_solicitud: constanciaGestionLink(),
      tipo_constancia: tipoNorm,
      tipo_constancia_label: CONSTANCIA_TIPO_LABEL[tipoNorm] || tipoNorm,
    },
  });
}

function snapshotToPdfData(row, fechaEmision = new Date()) {
  // Vacío = el PDF omite «como {función}». No completar con instrumento.
  const como = String(row.snap_funcion || "").trim();
  // Preferir snap (congelado al solicitar/aprobar). Fallback legal del join,
  // nunca preferencia de seating.
  const fromJoin = legalNombreApellidoConstancia(row.integrantes);
  const nombre =
    String(row.snap_nombre || "").trim() || fromJoin.nombre;
  const apellido =
    String(row.snap_apellido || "").trim() || fromJoin.apellido;
  return {
    nombre,
    apellido,
    dni: row.snap_dni,
    genero: row.snap_genero,
    instrumento: row.snap_instrumento,
    como,
    fechaDesde: row.snap_fecha_desde,
    fechaHasta: row.snap_fecha_hasta,
    localidades: row.snap_localidades,
    fechaEmision,
    tipo: normalizeConstanciaTipo(row.tipo),
  };
}

/** Persiste el texto editable «como …» (solo pendientes). Vacío = sin función en el PDF. */
export async function updateConstanciaSnapFuncion(
  supabase,
  { solicitudId, snapFuncion },
) {
  const texto = String(snapFuncion ?? "").trim();
  const { data, error } = await supabase
    .from("constancias_solicitudes")
    .update({
      snap_funcion: texto || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .eq("estado", CONSTANCIA_ESTADOS.pendiente)
    .select(SOLICITUD_SELECT)
    .single();
  if (error) throw error;
  return data;
}

function normalizeSnapFecha(value) {
  const s = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * Edita el rango de fechas del PDF (solo no aprobadas: pendiente / denegada).
 */
export async function updateConstanciaSnapFechas(
  supabase,
  { solicitudId, fechaDesde, fechaHasta },
) {
  const desde = normalizeSnapFecha(fechaDesde);
  const hasta = normalizeSnapFecha(fechaHasta) || desde;
  if (!desde) throw new Error("Indicá la fecha desde");
  if (hasta < desde) {
    throw new Error("La fecha hasta no puede ser anterior a la desde");
  }

  const { data: row, error: readErr } = await supabase
    .from("constancias_solicitudes")
    .select("id, estado")
    .eq("id", solicitudId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!row) throw new Error("Solicitud no encontrada");
  if (row.estado === CONSTANCIA_ESTADOS.aprobada) {
    throw new Error("No se pueden editar fechas de una constancia ya aprobada");
  }

  const { data, error } = await supabase
    .from("constancias_solicitudes")
    .update({
      snap_fecha_desde: desde,
      snap_fecha_hasta: hasta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .neq("estado", CONSTANCIA_ESTADOS.aprobada)
    .select(SOLICITUD_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export { suggestConstanciaFechasFromLogistics };

function fechaEmisionDesdeSolicitud(row) {
  const iso = row?.reemitida_at || row?.resuelto_at;
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Genera el PDF de una solicitud (usa reemitida_at o resuelto_at). */
export async function buildConstanciaPdfFromSolicitud(row) {
  return generateConstanciaPdf(
    snapshotToPdfData(row, fechaEmisionDesdeSolicitud(row)),
  );
}

async function sendAprobacionMail(supabase, row) {
  const { base64, filename } = await buildConstanciaPdfFromSolicitud(row);
  const mail = row.integrantes?.mail || "";
  if (!mail) throw new Error("El solicitante no tiene email cargado");
  const legal = legalNombreApellidoConstancia(row.integrantes);
  const nombreSaludo =
    String(row.snap_nombre || "").trim() ||
    legal.nombre ||
    "Participante";
  const tipoNorm = normalizeConstanciaTipo(row.tipo);
  await invokeConstanciaMail(supabase, {
    templateId: "constancia_aprobada",
    email: mail,
    nombre: nombreSaludo,
    gira: row.snap_gira_nombre,
    detalle: {
      gira_nombre: row.snap_gira_nombre,
      pdf_base64: base64,
      pdf_filename: filename,
      tipo_constancia: tipoNorm,
      tipo_constancia_label: CONSTANCIA_TIPO_LABEL[tipoNorm] || tipoNorm,
    },
  });
}

async function sendModificacionMail(supabase, row) {
  const { base64, filename } = await buildConstanciaPdfFromSolicitud(row);
  const mail = row.integrantes?.mail || "";
  if (!mail) throw new Error("El solicitante no tiene email cargado");
  const legal = legalNombreApellidoConstancia(row.integrantes);
  const nombreSaludo =
    String(row.snap_nombre || "").trim() ||
    legal.nombre ||
    "Participante";
  const tipoNorm = normalizeConstanciaTipo(row.tipo);
  await invokeConstanciaMail(supabase, {
    templateId: "constancia_modificada",
    email: mail,
    nombre: nombreSaludo,
    gira: row.snap_gira_nombre,
    detalle: {
      gira_nombre: row.snap_gira_nombre,
      pdf_base64: base64,
      pdf_filename: filename,
      tipo_constancia: tipoNorm,
      tipo_constancia_label: CONSTANCIA_TIPO_LABEL[tipoNorm] || tipoNorm,
    },
  });
}

/** Reenvía el PDF por mail a una solicitud ya aprobada. */
export async function reenviarConstanciaAprobada(supabase, { solicitudId }) {
  const { data: row, error } = await supabase
    .from("constancias_solicitudes")
    .select(SOLICITUD_SELECT)
    .eq("id", solicitudId)
    .single();
  if (error) throw error;
  if (row.estado !== CONSTANCIA_ESTADOS.aprobada) {
    throw new Error("Solo se puede reenviar una constancia aprobada");
  }
  await sendAprobacionMail(supabase, row);
  const { data, error: upErr } = await supabase
    .from("constancias_solicitudes")
    .update({
      mail_enviado_at: new Date().toISOString(),
      mail_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .select(SOLICITUD_SELECT)
    .single();
  if (upErr) throw upErr;
  return data;
}

/**
 * Reemite una constancia aprobada: actualiza fechas/rol, regenera PDF,
 * marca reemitida_at y avisa al músico («Tu constancia fue modificada»).
 * Sin historial: sobrescribe la misma fila.
 */
export async function reemitirConstanciaAprobada(
  supabase,
  { solicitudId, snapFuncion, fechaDesde, fechaHasta, resueltoPorId },
) {
  const { data: row, error } = await supabase
    .from("constancias_solicitudes")
    .select(SOLICITUD_SELECT)
    .eq("id", solicitudId)
    .single();
  if (error) throw error;
  if (row.estado !== CONSTANCIA_ESTADOS.aprobada) {
    throw new Error("Solo se puede reemitir una constancia aprobada");
  }

  const como = String(
    snapFuncion !== undefined && snapFuncion !== null
      ? snapFuncion
      : row.snap_funcion || "",
  ).trim();

  const desde = normalizeSnapFecha(
    fechaDesde !== undefined ? fechaDesde : row.snap_fecha_desde,
  );
  const hasta =
    normalizeSnapFecha(
      fechaHasta !== undefined ? fechaHasta : row.snap_fecha_hasta,
    ) || desde;
  if (!desde) throw new Error("Indicá la fecha desde");
  if (hasta < desde) {
    throw new Error("La fecha hasta no puede ser anterior a la desde");
  }

  const now = new Date().toISOString();
  const { data: updated, error: upErr } = await supabase
    .from("constancias_solicitudes")
    .update({
      snap_funcion: como || null,
      snap_fecha_desde: desde,
      snap_fecha_hasta: hasta,
      reemitida_at: now,
      visto_solicitante: false,
      mail_enviado_at: null,
      mail_error: null,
      updated_at: now,
      ...(integranteIdForDb(resueltoPorId)
        ? { resuelto_por: integranteIdForDb(resueltoPorId) }
        : {}),
    })
    .eq("id", solicitudId)
    .eq("estado", CONSTANCIA_ESTADOS.aprobada)
    .select(SOLICITUD_SELECT)
    .single();
  if (upErr) throw upErr;

  let mailError = null;
  try {
    await sendModificacionMail(supabase, updated);
  } catch (err) {
    mailError = String(err?.message || err);
    console.error("[constancias] mail reemisión:", err);
  }

  const { data: finalRow, error: mailUpErr } = await supabase
    .from("constancias_solicitudes")
    .update({
      mail_enviado_at: mailError ? null : new Date().toISOString(),
      mail_error: mailError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .select(SOLICITUD_SELECT)
    .single();
  if (mailUpErr) throw mailUpErr;

  if (mailError) {
    const soft = new Error(
      `Constancia #${finalRow.id} reemitida, pero falló el mail: ${mailError}`,
    );
    soft.solicitud = finalRow;
    soft.mailFailed = true;
    throw soft;
  }

  return finalRow;
}

function triggerBrowserPdfDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Descarga el PDF en el navegador. */
export async function descargarConstanciaPdf(row) {
  const { blob, filename } = await buildConstanciaPdfFromSolicitud(row);
  triggerBrowserPdfDownload(blob, filename);
  return { filename };
}

/**
 * Plantilla de participación sin firma: descarga inmediata, sin solicitud ni mail.
 * Permite giras futuras. Texto = participación realizada; omitFirma.
 */
export async function descargarConstanciaParticipacionParaFirmar(
  supabase,
  {
    idIntegrante,
    idGira,
    snapFuncion,
    fechaDesde,
    fechaHasta,
    incluirDiaSalida = false,
    incluirDiaRegreso = false,
    asAdmin = false,
  },
) {
  const { idInt, programa } = await assertConstanciaElegibilidad(supabase, {
    idIntegrante,
    idGira,
    // Misma elegibilidad de nómina que convocatoria (incluye futuras).
    tipoNorm: CONSTANCIA_TIPOS.convocatoria,
    asAdmin: Boolean(asAdmin),
  });

  const integrante = await loadIntegranteForConstancia(supabase, idInt);
  const snap = await buildConstanciaSnapshot(supabase, integrante, programa);

  let desde = normalizeSnapFecha(fechaDesde) || snap.snap_fecha_desde;
  let hasta =
    normalizeSnapFecha(fechaHasta) ||
    snap.snap_fecha_hasta ||
    desde;

  if (!fechaDesde && !fechaHasta) {
    const fechasMusico = await resolveFechasSolicitudMusico(supabase, {
      idIntegrante: idInt,
      idGira,
      programa,
      incluirDiaSalida: Boolean(incluirDiaSalida),
      incluirDiaRegreso: Boolean(incluirDiaRegreso),
    });
    if (fechasMusico.desde) desde = fechasMusico.desde;
    if (fechasMusico.hasta) hasta = fechasMusico.hasta;
  }

  const como =
    snapFuncion !== undefined && snapFuncion !== null
      ? String(snapFuncion).trim()
      : String(snap.snap_funcion || "").trim();

  const { blob, filename } = await generateConstanciaPdf({
    nombre: snap.snap_nombre,
    apellido: snap.snap_apellido,
    dni: snap.snap_dni,
    genero: snap.snap_genero,
    instrumento: snap.snap_instrumento,
    como,
    fechaDesde: desde,
    fechaHasta: hasta,
    localidades: snap.snap_localidades,
    fechaEmision: new Date(),
    tipo: CONSTANCIA_TIPOS.participacion,
    omitFirma: true,
    paraFirmar: true,
  });

  triggerBrowserPdfDownload(blob, filename);
  return { filename, modo: CONSTANCIA_MODO_PARA_FIRMAR };
}

async function sendDenegacionMail(supabase, row, motivo) {
  const mail = row.integrantes?.mail || "";
  if (!mail) return;
  const legal = legalNombreApellidoConstancia(row.integrantes);
  const nombreSaludo =
    String(row.snap_nombre || "").trim() ||
    legal.nombre ||
    "Participante";
  const tipoNorm = normalizeConstanciaTipo(row.tipo);
  await invokeConstanciaMail(supabase, {
    templateId: "constancia_denegada",
    email: mail,
    nombre: nombreSaludo,
    gira: row.snap_gira_nombre,
    detalle: {
      gira_nombre: row.snap_gira_nombre,
      motivo_denegacion: motivo || "",
      tipo_constancia: tipoNorm,
      tipo_constancia_label: CONSTANCIA_TIPO_LABEL[tipoNorm] || tipoNorm,
    },
  });
}

export async function aprobarConstancia(
  supabase,
  { solicitudId, resueltoPorId, snapFuncion },
) {
  const { data: row, error } = await supabase
    .from("constancias_solicitudes")
    .select(SOLICITUD_SELECT)
    .eq("id", solicitudId)
    .single();
  if (error) throw error;
  if (row.estado !== CONSTANCIA_ESTADOS.pendiente) {
    throw new Error("La solicitud ya fue resuelta");
  }

  const comoExplicit = snapFuncion !== undefined && snapFuncion !== null;
  const como = String(
    comoExplicit ? snapFuncion : row.snap_funcion || "",
  ).trim();

  // Antes del PDF: forzar nombre/apellido legales actuales (no preferencia).
  const legal = await fetchIntegranteLegalNombreApellido(
    supabase,
    row.id_integrante,
  );
  const snapPatch = {
    snap_nombre: legal.nombre || row.snap_nombre,
    snap_apellido: legal.apellido || row.snap_apellido,
    ...(comoExplicit ? { snap_funcion: como || null } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data: updatedSnap, error: snapErr } = await supabase
    .from("constancias_solicitudes")
    .update(snapPatch)
    .eq("id", solicitudId)
    .select(SOLICITUD_SELECT)
    .single();
  if (snapErr) throw snapErr;
  const rowForPdf = updatedSnap;

  let mailError = null;
  try {
    await sendAprobacionMail(supabase, rowForPdf);
  } catch (err) {
    mailError = String(err?.message || err);
    console.error("[constancias] mail aprobación:", err);
  }

  const { data, error: upErr } = await supabase
    .from("constancias_solicitudes")
    .update({
      estado: CONSTANCIA_ESTADOS.aprobada,
      snap_nombre: rowForPdf.snap_nombre,
      snap_apellido: rowForPdf.snap_apellido,
      snap_funcion: comoExplicit
        ? como || null
        : rowForPdf.snap_funcion || null,
      motivo_denegacion: null,
      resuelto_at: new Date().toISOString(),
      resuelto_por: integranteIdForDb(resueltoPorId) || null,
      visto_solicitante: false,
      mail_enviado_at: mailError ? null : new Date().toISOString(),
      mail_error: mailError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .select(SOLICITUD_SELECT)
    .single();
  if (upErr) throw upErr;
  if (mailError) {
    const e = new Error(`Aprobada, pero falló el mail: ${mailError}`);
    e.solicitud = data;
    throw e;
  }
  return data;
}

export async function denegarConstancia(supabase, {
  solicitudId,
  resueltoPorId,
  motivo,
}) {
  const motivoTxt = String(motivo || "").trim();
  if (!motivoTxt) throw new Error("Indicá el motivo de la denegación");

  const { data: row, error } = await supabase
    .from("constancias_solicitudes")
    .select(SOLICITUD_SELECT)
    .eq("id", solicitudId)
    .single();
  if (error) throw error;
  if (row.estado !== CONSTANCIA_ESTADOS.pendiente) {
    throw new Error("La solicitud ya fue resuelta");
  }

  try {
    await sendDenegacionMail(supabase, row, motivoTxt);
  } catch (err) {
    console.error("[constancias] mail denegación:", err);
  }

  const { data, error: upErr } = await supabase
    .from("constancias_solicitudes")
    .update({
      estado: CONSTANCIA_ESTADOS.denegada,
      motivo_denegacion: motivoTxt,
      resuelto_at: new Date().toISOString(),
      resuelto_por: integranteIdForDb(resueltoPorId) || null,
      visto_solicitante: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .select(SOLICITUD_SELECT)
    .single();
  if (upErr) throw upErr;
  return data;
}

/** Vuelve una denegada a pendiente (sin mail). */
export async function deshacerDenegacionConstancia(supabase, { solicitudId }) {
  const { data: row, error } = await supabase
    .from("constancias_solicitudes")
    .select(SOLICITUD_SELECT)
    .eq("id", solicitudId)
    .single();
  if (error) throw error;
  if (row.estado !== CONSTANCIA_ESTADOS.denegada) {
    throw new Error("Solo se puede deshacer una solicitud denegada");
  }

  const { data, error: upErr } = await supabase
    .from("constancias_solicitudes")
    .update({
      estado: CONSTANCIA_ESTADOS.pendiente,
      motivo_denegacion: null,
      resuelto_at: null,
      resuelto_por: null,
      visto_solicitante: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", solicitudId)
    .eq("estado", CONSTANCIA_ESTADOS.denegada)
    .select(SOLICITUD_SELECT)
    .single();
  if (upErr) throw upErr;
  return data;
}

/**
 * Aprueba todas las pendientes del filtro actual (tipo opcional).
 * @param {{ resueltoPorId?: number, tipo?: string }} opts
 */
export async function aprobarTodasConstanciasPendientes(
  supabase,
  { resueltoPorId, tipo } = {},
) {
  const pendientes = await listConstanciasGestion(supabase, {
    estado: CONSTANCIA_ESTADOS.pendiente,
    tipo,
  });
  const results = { ok: 0, fail: 0, errors: [] };
  for (const row of pendientes) {
    try {
      await aprobarConstancia(supabase, {
        solicitudId: row.id,
        resueltoPorId,
      });
      results.ok += 1;
    } catch (err) {
      results.fail += 1;
      results.errors.push({ id: row.id, message: String(err?.message || err) });
    }
  }
  return results;
}

/** Envía los 3 modelos de mail a Archivo (estilo revisión Pike / es_modelo). */
export async function enviarModelosConstanciaArchivo(supabase, {
  email = CONSTANCIA_MAIL_MODELOS,
} = {}) {
  const sampleGira = "W.A Mozart";
  const sampleLink = constanciaGestionLink();
  const { base64, filename } = await generateConstanciaPdf({
    nombre: "Martin",
    apellido: "Pike",
    dni: "00000000",
    genero: "M",
    instrumento: "violín",
    fechaDesde: "2026-03-01",
    fechaHasta: "2026-03-05",
    localidades: ["Viedma"],
    fechaEmision: new Date(),
  });

  await invokeConstanciaMail(supabase, {
    templateId: "constancia_solicitud",
    email,
    nombre: "Archivo",
    gira: sampleGira,
    detalle: {
      es_modelo: true,
      solicitud_id: 999,
      solicitante_nombre: "Martin Pike",
      nombre: "Martin",
      apellido: "Pike",
      dni: "00000000",
      mail: "martinpike@hotmail.com",
      instrumento: "violín",
      gira_tipo: "Sinfónico",
      gira_nombre: sampleGira,
      fechas_label: formatRangoFechasConstancia("2026-03-01", "2026-03-05"),
      localidades: formatLocalidadesConstancia(["Viedma"]),
      link_solicitud: sampleLink,
    },
  });

  await invokeConstanciaMail(supabase, {
    templateId: "constancia_aprobada",
    email,
    nombre: "Martin",
    gira: sampleGira,
    detalle: {
      es_modelo: true,
      gira_nombre: sampleGira,
      pdf_base64: base64,
      pdf_filename: filename,
    },
  });

  await invokeConstanciaMail(supabase, {
    templateId: "constancia_denegada",
    email,
    nombre: "Martin",
    gira: sampleGira,
    detalle: {
      es_modelo: true,
      gira_nombre: sampleGira,
      motivo_denegacion:
        "Ejemplo de motivo: la persona no figura en la nómina definitiva de la gira.",
    },
  });

  return { ok: true, email };
}
