const fmtFechaHora = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

export function formatEntradasPreviewError(preview) {
  if (!preview || preview.ok) return "";
  if (preview.reason === "token_no_encontrado") {
    return "Ese código no corresponde a entradas OFRN o está incompleto.";
  }
  if (preview.reason === "token_vacio") {
    return "Cargá un código para ver el detalle.";
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
      return "No reconocemos este código. Asegurate de leer un QR de entradas OFRN o pegá el texto completo del token.";
    case "entrada_ya_usada": {
      const when = r.ingresada_at
        ? ` Ese ingreso se registró el ${fmtFechaHora(r.ingresada_at)}.`
        : " Ya estaba usada.";
      return `Entrada nº ${r.entrada_orden ?? "—"} de la reserva ${r.codigo_reserva || "—"}.${when}`;
    }
    case "reserva_totalmente_usada": {
      const u = r.ultima_ingresada_at
        ? ` Último ingreso: ${fmtFechaHora(r.ultima_ingresada_at)}.`
        : "";
      return `La reserva ${r.codigo_reserva || "—"} no tiene plazas pendientes: todas las entradas ya ingresaron.${u}`;
    }
    case "reserva_no_activa": {
      const c = r.codigo_reserva ? ` (${r.codigo_reserva})` : "";
      return `Esa reserva no está activa${c} (p. ej. cancelada o anulada).`;
    }
    case "modo_invalido":
      return "Lector en modo no soportado.";
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
    return n === 1
      ? "Ingreso grupal: 1 persona registrada con el QR de reserva."
      : `Ingreso grupal: ${n} personas registradas con el QR de reserva.`;
  }
  return "Ingreso registrado.";
}
