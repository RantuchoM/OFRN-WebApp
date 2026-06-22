import { savedPaxParadasVal } from "../views/Public/TransporteSCRN/viajeReservaParadasUtils";

export const EMPTY_VIATICOS_OPCIONES = {
  porcentaje: 100,
  temporada_alta: false,
  gasto_alojamiento: 0,
  gasto_pasajes: 0,
  gasto_combustible: 0,
  gasto_otros: 0,
  gastos_capacit: 0,
  gastos_movil_otros: 0,
  gasto_ceremonial: 0,
};

const GASTO_KEYS = [
  "gasto_alojamiento",
  "gasto_pasajes",
  "gasto_combustible",
  "gasto_otros",
  "gastos_capacit",
  "gastos_movil_otros",
  "gasto_ceremonial",
];

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const hasText = (v) => String(v ?? "").trim() !== "";

export function normalizeViaticosOpciones(raw) {
  const base = { ...EMPTY_VIATICOS_OPCIONES };
  if (!raw || typeof raw !== "object") return base;

  const pct = Number(raw.porcentaje);
  if ([100, 80, 0].includes(pct)) base.porcentaje = pct;

  base.temporada_alta = Boolean(raw.temporada_alta);

  for (const key of GASTO_KEYS) {
    base[key] = toNumber(raw[key]);
  }

  return base;
}

/** Paradas efectivas para titular (reserva) o pasajero extra. */
export function resolveParadasEfectivas({ reserva, pax = null }) {
  if (!pax) {
    return {
      tramo: reserva?.tramo || "ambos",
      localidad_subida: reserva?.localidad_subida || "",
      localidad_bajada: reserva?.localidad_bajada || "",
      obs_subida: reserva?.obs_subida || "",
      obs_bajada: reserva?.obs_bajada || "",
    };
  }

  return {
    tramo: savedPaxParadasVal(pax, reserva, "tramo") || "ida",
    localidad_subida: savedPaxParadasVal(pax, reserva, "localidad_subida") || "",
    localidad_bajada: savedPaxParadasVal(pax, reserva, "localidad_bajada") || "",
    obs_subida: savedPaxParadasVal(pax, reserva, "obs_subida") || "",
    obs_bajada: savedPaxParadasVal(pax, reserva, "obs_bajada") || "",
  };
}

function formatDateLocal(iso) {
  if (!iso) return { fecha: "", hora: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { fecha: "", hora: "" };

  const pad = (n) => String(n).padStart(2, "0");
  const fecha = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { fecha, hora };
}

/** Fechas de comisión según tramo del pasajero. */
export function resolveFechasComision({ viaje, tramo }) {
  const t = String(tramo || "ambos").toLowerCase();
  const salidaIso = viaje?.fecha_salida || null;
  const llegadaIso = viaje?.fecha_llegada_estimada || null;
  const retornoIso = viaje?.fecha_retorno || null;

  if (t === "ida") {
    return {
      salida: formatDateLocal(salidaIso),
      llegada: formatDateLocal(llegadaIso),
    };
  }

  if (t === "vuelta") {
    const inicioVuelta = retornoIso || llegadaIso;
    return {
      salida: formatDateLocal(inicioVuelta),
      llegada: formatDateLocal(salidaIso),
    };
  }

  // ambos (ida y vuelta)
  return {
    salida: formatDateLocal(salidaIso),
    llegada: formatDateLocal(retornoIso || llegadaIso),
  };
}

function buildTransporteDetalle({ viaje, paradas }) {
  const parts = [];
  if (viaje?.origen && viaje?.destino_final) {
    parts.push(`${viaje.origen} → ${viaje.destino_final}`);
  }
  if (paradas.localidad_subida) {
    parts.push(`Sube: ${paradas.localidad_subida}`);
    if (hasText(paradas.obs_subida)) parts.push(`(${paradas.obs_subida})`);
  }
  if (paradas.localidad_bajada) {
    parts.push(`Baja: ${paradas.localidad_bajada}`);
    if (hasText(paradas.obs_bajada)) parts.push(`(${paradas.obs_bajada})`);
  }
  const tramoLbl = { ida: "Ida", vuelta: "Vuelta", ambos: "Ida y vuelta" };
  if (paradas.tramo) {
    parts.push(`Tramo: ${tramoLbl[paradas.tramo] || paradas.tramo}`);
  }
  return parts.join(" · ");
}

/**
 * Construye partial DEFAULT_FORM + scrn_origen para viaticos-manual.
 * @param {{ viaje, transporte, reserva, pax, perfil, viaticosOpciones, rol }} params
 */
export function buildScrnViaticoPrefill({
  viaje,
  transporte,
  reserva,
  pax = null,
  perfil = null,
  viaticosOpciones = null,
  rol = "titular",
}) {
  const paradas = resolveParadasEfectivas({ reserva, pax });
  const fechas = resolveFechasComision({ viaje, tramo: paradas.tramo });
  const opciones = normalizeViaticosOpciones(viaticosOpciones);

  const transporteEntity = transporte || viaje?.scrn_transportes || null;
  const patente = transporteEntity?.patente || "";

  const nombre =
    perfil?.nombre ||
    (pax?.nombre && !pax?.id_perfil ? pax.nombre : "") ||
    "";
  const apellido =
    perfil?.apellido ||
    (pax?.apellido && !pax?.id_perfil ? pax.apellido : "") ||
    "";

  const prefill = {
    apellido: apellido || "",
    nombre: nombre || "",
    dni: perfil?.dni || "",
    cargo: perfil?.cargo || "",

    motivo: viaje?.motivo || "",
    lugar_comision: paradas.localidad_bajada || viaje?.destino_final || "",

    fecha_salida: fechas.salida.fecha,
    hora_salida: fechas.salida.hora,
    fecha_llegada: fechas.llegada.fecha,
    hora_llegada: fechas.llegada.hora,

    porcentaje: opciones.porcentaje,
    temporada_alta: opciones.temporada_alta,

    check_terrestre: true,
    check_patente_oficial: Boolean(patente),
    patente_oficial: patente,
    transporte_otros_detalle: buildTransporteDetalle({ viaje, paradas }),

  };

  for (const key of GASTO_KEYS) {
    prefill[key] = opciones[key];
  }

  prefill.scrn_origen = {
    reserva_id: reserva?.id ?? null,
    pax_id: pax?.id ?? null,
    viaje_id: viaje?.id ?? reserva?.id_viaje ?? null,
    rol: rol === "pasajero" ? "pasajero" : "titular",
  };

  return prefill;
}

/** Viaje aún elegible para viático (hoy/futuro o hasta 30 días post-salida). */
export function isViajeElegibleParaViatico(fechaSalidaIso) {
  if (!fechaSalidaIso) return false;
  const salida = new Date(fechaSalidaIso);
  if (Number.isNaN(salida.getTime())) return false;
  const limite = new Date(salida);
  limite.setDate(limite.getDate() + 30);
  return Date.now() <= limite.getTime();
}

export function puedeAbrirViaticoDesdeReserva({ reserva, viaje, estadoPasajero = null }) {
  const estado = String(estadoPasajero ?? reserva?.estado ?? "").toLowerCase();
  if (estado === "cancelada" || estado === "rechazada") return false;
  return isViajeElegibleParaViatico(viaje?.fecha_salida);
}
