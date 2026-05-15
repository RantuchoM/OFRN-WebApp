import { formatEntradasIngresoConRecepcionista } from "./entradasIngresoDisplay";

const fmtIngreso = (at, porNombre) => {
  const t = formatEntradasIngresoConRecepcionista(at, porNombre);
  return t ? ` ${t}.` : "";
};

export function formatEntradasPreviewError(preview) {
  if (!preview || preview.ok) return "";
  if (preview.reason === "token_no_encontrado") {
    return "Ese código no corresponde a entradas OFRN o está incompleto.";
  }
  if (preview.reason === "token_vacio") {
    return "Cargá un código para ver el detalle.";
  }
  if (preview.reason === "concierto_distinto") {
    return "Este QR no corresponde al concierto elegido en la lista. Cambiá el concierto o usá un código de ese evento.";
  }
  if (preview.reason === "codigo_ambiguo") {
    return "Ese código de 10 dígitos coincide con más de una reserva. Elegí el concierto correcto y volvé a intentar.";
  }
  if (preview.reason === "error") {
    return preview.detalle || "Error al consultar el código.";
  }
  return "No se pudo analizar el código.";
}

export function formatEntradasValidacionError(result) {
  if (!result) return "Error desconocido";
  const r = result;
  switch (r.reason) {
    case "token_no_encontrado":
      return "No reconocemos este código. Escaneá un QR OFRN o ingresá los 10 dígitos de una reserva válida.";
    case "codigo_ambiguo":
      return "Ese código de 10 dígitos coincide con más de una reserva. Elegí el concierto correcto y probá de nuevo.";
    case "entrada_ya_usada": {
      const when = r.ingresada_at
        ? fmtIngreso(r.ingresada_at, r.ingresada_por_nombre)
        : " Ya estaba usada.";
      return `Entrada nº ${r.entrada_orden ?? "—"} de la reserva ${r.codigo_reserva || "—"}.${when}`;
    }
    case "reserva_totalmente_usada": {
      const u = r.ultima_ingresada_at
        ? fmtIngreso(r.ultima_ingresada_at, r.ultima_ingresada_por_nombre)
        : "";
      return `La reserva ${r.codigo_reserva || "—"} no tiene plazas pendientes: todas las entradas ya ingresaron.${u}`;
    }
    case "reserva_no_activa": {
      const c = r.codigo_reserva ? ` (${r.codigo_reserva})` : "";
      return `Esa reserva no está activa${c} (p. ej. cancelada o anulada).`;
    }
    case "concierto_distinto":
      return "Ese QR es de otro concierto. Elegí el evento correcto en la lista o escaneá un código de este concierto.";
    case "modo_invalido":
      return "Lector en modo no soportado.";
    case "sin_plazas_seleccionadas":
      return "Marcá al menos una plaza para ingresar ahora.";
    case "ordenes_invalidas":
      return "Las plazas seleccionadas no son válidas o ya ingresaron.";
    default:
      return `No se pudo validar: ${r.reason || "error"}.`;
  }
}

export function formatEntradasValidacionSuccess(result) {
  if (!result?.ok) return "Listo.";
  if (result.tipo === "entrada") {
    return `Ingreso individual listo (entrada nº ${result.entrada_orden ?? "—"}).`;
  }
  if (result.tipo === "reserva") {
    const n = result.pendientes_consumidas ?? 0;
    const rest = Number(result.pendientes_restantes ?? 0);
    const base =
      n === 1
        ? "Ingreso grupal: 1 persona registrada."
        : `Ingreso grupal: ${n} personas registradas.`;
    if (rest > 0) {
      return `${base} Quedan ${rest} plaza${rest === 1 ? "" : "s"} pendiente${rest === 1 ? "" : "s"} (QR individual después).`;
    }
    return base;
  }
  return "Ingreso registrado.";
}
