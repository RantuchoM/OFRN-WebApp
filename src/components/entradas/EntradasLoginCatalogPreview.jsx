import React, { useEffect, useState } from "react";
import EntradasDisponibilidadBar from "./EntradasDisponibilidadBar";
import {
  fetchConciertosDisponibilidad,
  listProgramasConConciertos,
  programasConDisponibilidad,
  todosConciertoIdsEnProgramas,
} from "../../services/entradaService";
import {
  entradaConciertoReservasAbiertas,
  inicioDelDiaArgentinaMs,
} from "../../utils/entradasReservasApertura";
import {
  compareConciertosPorFechaHora,
  fechaHoraDesdeConciertoEntrada,
  localidadDesdeConciertoEntrada,
} from "../../utils/entradasConciertoEvento";
import { formatEntradasConciertoFechaHora } from "../../utils/entradasReservaCopy";

function conciertoAunVigente(concierto, inicioDiaMs) {
  const fh = fechaHoraDesdeConciertoEntrada(concierto);
  if (!fh) return false;
  const t = new Date(fh);
  if (Number.isNaN(t.getTime())) return false;
  return t.getTime() >= inicioDiaMs;
}

/**
 * Catálogo público (sin sesión): conciertos con reservas abiertas + barra de disponibilidad.
 */
export default function EntradasLoginCatalogPreview({ ui, isDark }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
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
            flat.push({
              ...concierto,
              programaNombre: programa.nombre || "",
              localidadLabel: localidadDesdeConciertoEntrada(concierto) || "",
            });
          }
        }
        flat.sort(compareConciertosPorFechaHora);
        if (!cancelled) setItems(flat);
      } catch (loadError) {
        if (!cancelled) {
          setItems([]);
          setError(loadError?.message || "No se pudieron cargar los conciertos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && !error && items.length === 0) return null;

  return (
    <section className="w-full max-w-lg space-y-3" aria-label="Conciertos con reservas abiertas">
      <div className="text-center space-y-1 px-1">
        <h2 className={`${ui.sectionTitle} text-base sm:text-lg`}>Conciertos abiertos</h2>
        <p className={`text-sm sm:text-base leading-relaxed ${ui.textMuted}`}>
          Mirás la disponibilidad acá. Para reservar, entrá con tu mail arriba.
        </p>
      </div>

      {loading && (
        <div className={`${ui.section} p-4 space-y-3`} aria-busy="true">
          <div className={`h-4 w-2/3 rounded animate-pulse ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
          <div className={`h-3 w-full rounded animate-pulse ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
          <EntradasDisponibilidadBar concierto={null} isDark={isDark} loading />
        </div>
      )}

      {error && (
        <div
          className={
            isDark
              ? "rounded-md border border-amber-800 bg-amber-950/40 px-3 py-3 text-sm text-amber-200"
              : "rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"
          }
          role="status"
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <ul className="space-y-3 list-none p-0 m-0">
          {items.map((concierto) => (
            <li key={concierto.id} className={`${ui.section} p-4 sm:p-5 space-y-2`}>
              {concierto.localidadLabel ? (
                <p className={`${ui.programaLocalidad} text-xs sm:text-sm`}>{concierto.localidadLabel}</p>
              ) : null}
              <p className={`text-base sm:text-lg font-bold leading-snug ${ui.textStrong}`}>
                {concierto.nombre || concierto.programaNombre || "Concierto"}
              </p>
              <p className={`text-sm sm:text-base ${ui.textSoft}`}>
                {formatEntradasConciertoFechaHora(concierto.fecha_hora)}
              </p>
              {concierto.lugar_nombre ? (
                <p className={`text-sm ${ui.textMuted}`}>{concierto.lugar_nombre}</p>
              ) : null}
              <EntradasDisponibilidadBar concierto={concierto} isDark={isDark} className="pt-1" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
