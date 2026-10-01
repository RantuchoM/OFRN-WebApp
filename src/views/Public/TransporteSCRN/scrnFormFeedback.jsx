import React from "react";
import { splitLocalDateTime } from "./ScrnDateTimeField";

/** Mensaje bajo el control que falló. */
export function ScrnCampoError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-[11px] font-semibold text-rose-700">{children}</p>;
}

function conectorDe(etiqueta) {
  const text = String(etiqueta || "").trim();
  if (text.startsWith("el ")) return `del ${text.slice(3)}`;
  if (text.startsWith("la ")) return `de la ${text.slice(3)}`;
  return `de ${text}`;
}

/**
 * Valida un string `YYYY-MM-DDTHH:mm` (o fecha sin hora, que `joinLocalDateTime` deja como `YYYY-MM-DDT`).
 * Vacío es válido si el campo no es obligatorio.
 * `etiqueta` es el nombre del campo con artículo: "el turno de limpieza", "la salida".
 */
export function mensajeFechaHoraLocal(
  value,
  { required = false, etiqueta = "la fecha y hora" } = {},
) {
  const s = String(value ?? "").trim();
  const de = conectorDe(etiqueta);
  if (!s) return required ? `Completá ${etiqueta}.` : "";
  const { date, time } = splitLocalDateTime(s);
  if (!date) return `La fecha ${de} no es válida.`;
  if (!time || time.length < 5) return `Completá la hora ${de}.`;
  const d = new Date(`${date}T${time}`);
  if (Number.isNaN(d.getTime())) return `La fecha y hora ${de} no son válidas.`;
  return "";
}

/** ISO UTC solo si la fecha local está completa. Nunca llama a `toISOString` con un valor inválido. */
export function isoDesdeFechaHoraLocal(
  value,
  { required = false, etiqueta = "la fecha y hora" } = {},
) {
  const error = mensajeFechaHoraLocal(value, { required, etiqueta });
  if (error) return { iso: null, error };
  if (!String(value ?? "").trim()) return { iso: null, error: "" };
  const { date, time } = splitLocalDateTime(value);
  return { iso: new Date(`${date}T${time}`).toISOString(), error: "" };
}

/** Texto corto para mostrar un turno o una salida, aunque la hora esté vacía. */
export function etiquetaFechaHora(value, vacio = "—") {
  const s = String(value ?? "").trim();
  if (!s) return vacio;
  const { date, time } = splitLocalDateTime(s);
  if (date && (!time || time.length < 5)) {
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y} (falta la hora)`;
  }
  const parsed = date && time ? new Date(`${date}T${time}`) : new Date(s);
  if (Number.isNaN(parsed.getTime())) return vacio;
  return parsed.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Errores de alta/edición de recorrido, pegados al campo. */
export function erroresRecorrido(form, { requireChofer = false } = {}) {
  const errors = {};
  if (!String(form?.motivo || "").trim()) errors.motivo = "Completá el título del recorrido.";
  if (!form?.id_transporte) errors.id_transporte = "Elegí un transporte.";
  if (requireChofer && !form?.id_chofer) errors.id_chofer = "Seleccioná el chofer del recorrido.";
  if (!String(form?.origen || "").trim()) errors.origen = "Elegí el origen.";
  if (!String(form?.destino_final || "").trim()) errors.destino_final = "Elegí el destino.";
  const salida = mensajeFechaHoraLocal(form?.fecha_salida, {
    required: true,
    etiqueta: "la salida",
  });
  if (salida) errors.fecha_salida = salida;
  const llega = mensajeFechaHoraLocal(form?.fecha_llegada_estimada, {
    required: true,
    etiqueta: "la llegada a origen",
  });
  if (llega) errors.fecha_llegada_estimada = llega;
  const retorno = mensajeFechaHoraLocal(form?.fecha_retorno, {
    required: false,
    etiqueta: "el retorno",
  });
  if (retorno) errors.fecha_retorno = retorno;
  if (!errors.fecha_salida && !errors.fecha_llegada_estimada) {
    const salidaDate = new Date(form.fecha_salida);
    const llegaDate = new Date(form.fecha_llegada_estimada);
    if (llegaDate < salidaDate) {
      errors.fecha_llegada_estimada = "La llegada a origen no puede ser anterior a la salida.";
    }
  }
  if (!errors.fecha_salida && !errors.fecha_retorno && String(form?.fecha_retorno || "").trim()) {
    const salidaDate = new Date(form.fecha_salida);
    const retornoDate = new Date(form.fecha_retorno);
    if (!Number.isNaN(retornoDate.getTime()) && retornoDate < salidaDate) {
      errors.fecha_retorno = "El retorno no puede ser anterior a la salida.";
    }
  }
  return errors;
}

function esMensajeTecnico(raw) {
  const text = String(raw || "").trim();
  if (!text) return true;
  if (
    /invalid time value|invalid date|invalid input syntax|null value|violates|constraint|PGRST|JWT|stack|relation |column |row-level|failed to fetch|check constraint|duplicate key/i.test(
      text,
    )
  ) {
    return true;
  }
  if (
    !/[áéíóúñü¿¡]/i.test(text) &&
    /\b(the|invalid|error|failed|null|undefined|permission|denied|syntax)\b/i.test(text)
  ) {
    return true;
  }
  return false;
}

/**
 * Aviso general (red, permiso, base). No devuelve la excepción cruda ni el stack.
 * Si el texto ya está en español claro, se conserva.
 */
export function mensajeErrorGeneral(err, fallback = "No se pudo guardar. Probá de nuevo.") {
  if (!err) return fallback;
  if (typeof err === "string") return esMensajeTecnico(err) ? fallback : err;
  const code = String(err.code || "");
  const raw = String(err.message || "");
  if (code === "42501" || /row-level security|permission denied/i.test(raw)) {
    return "No tenés permiso para hacer este cambio.";
  }
  if (code === "23505") return "Ya existe un registro con esos datos.";
  if (code === "23503") return "No se puede guardar porque está vinculado a otro registro.";
  if (code === "23502") return "Falta un dato obligatorio.";
  if (code === "23514" || /check constraint/i.test(raw)) {
    return "Hay un dato que no cumple las reglas del formulario.";
  }
  if (code === "22P02" || /invalid input syntax|invalid time value|invalid date/i.test(raw)) {
    return "Hay un dato con formato inválido. Revisá fecha, hora y números.";
  }
  if (code === "42P01" || /does not exist|relation /i.test(raw)) {
    return "Esa función todavía no está disponible. Avisá a quien administra el sistema.";
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return "No hay conexión. Revisá la red e intentá de nuevo.";
  }
  if (/jwt|not authenticated|auth session missing/i.test(raw)) {
    return "La sesión venció. Volvé a entrar e intentá de nuevo.";
  }
  if (esMensajeTecnico(raw)) return fallback;
  return raw || fallback;
}
