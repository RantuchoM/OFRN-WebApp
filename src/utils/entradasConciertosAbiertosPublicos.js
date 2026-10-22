import {
  fetchConciertosDisponibilidad,
  listProgramasConConciertos,
  porcentajeDisponibleConcierto,
  programasConDisponibilidad,
  todosConciertoIdsEnProgramas,
} from "../services/entradaService";
import {
  entradaConciertoReservasAbiertas,
  inicioDelDiaArgentinaMs,
} from "./entradasReservasApertura";
import {
  compareConciertosPorFechaHora,
  fechaHoraDesdeConciertoEntrada,
  localidadDesdeConciertoEntrada,
} from "./entradasConciertoEvento";
import { formatEntradasConciertoFechaHora } from "./entradasReservaCopy";

function conciertoAunVigente(concierto, inicioDiaMs) {
  const fh = fechaHoraDesdeConciertoEntrada(concierto);
  if (!fh) return false;
  const t = new Date(fh);
  if (Number.isNaN(t.getTime())) return false;
  return t.getTime() >= inicioDiaMs;
}

/** Conciertos con reservas abiertas y vigentes (hoy en adelante), con disponibilidad. */
export async function listEntradasConciertosAbiertosPublicos() {
  const programas = await listProgramasConConciertos();
  const ids = todosConciertoIdsEnProgramas(programas);
  const dispMap = ids.length ? await fetchConciertosDisponibilidad(ids) : {};
  const withDisp = programasConDisponibilidad(programas, dispMap);
  const inicioDia = inicioDelDiaArgentinaMs();
  const flat = [];
  for (const programa of withDisp) {
    for (const concierto of programa.entrada_concierto || []) {
      if (concierto?.activo === false) continue;
      if (!entradaConciertoReservasAbiertas(concierto)) continue;
      if (!conciertoAunVigente(concierto, inicioDia)) continue;
      const pct = porcentajeDisponibleConcierto(concierto);
      const llena = pct != null ? pct <= 0 : false;
      flat.push({
        id: Number(concierto.id),
        nombre: concierto.nombre || programa.nombre || "Concierto",
        fechaLabel: formatEntradasConciertoFechaHora(concierto.fecha_hora),
        localidadLabel: localidadDesdeConciertoEntrada(concierto) || "",
        lugarNombre: concierto.lugar_nombre || "",
        porcentaje: pct,
        llena,
        label: buildFuncionOptionLabel({
          nombre: concierto.nombre || programa.nombre || "Concierto",
          fechaLabel: formatEntradasConciertoFechaHora(concierto.fecha_hora),
          pct,
          llena,
        }),
        concierto,
      });
    }
  }
  flat.sort((a, b) => compareConciertosPorFechaHora(a.concierto, b.concierto));
  return flat;
}

export function buildFuncionOptionLabel({ nombre, fechaLabel, pct, llena }) {
  const disp =
    llena || pct === 0
      ? "llena"
      : pct == null
        ? "disponibilidad n/d"
        : `${pct}% disponible`;
  return `${nombre} — ${fechaLabel} · ${disp}`;
}

export function isValidEntradasAyudaEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}
