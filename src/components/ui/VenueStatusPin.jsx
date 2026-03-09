import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { IconMapPin, IconX, IconLoader } from "./Icons";
import { getVenueStatusById } from "../../utils/venueUtils";

/**
 * Pin reutilizable que muestra el estado de venue (semáforo) y abre un modal
 * con el historial de cambios (eventos_venue_log) al hacer clic.
 *
 * @param {object} props
 * @param {number|null} props.eventId - ID del evento (para cargar historial desde eventos_venue_log)
 * @param {number|null} props.idEstadoVenue - ID del estado actual (venue_status_types), define el color del pin
 * @param {string} [props.label] - Etiqueta opcional para el modal (ej. nombre del evento/fecha)
 * @param {object} props.supabase - Cliente Supabase para consultar el historial
 * @param {string} [props.className] - Clases CSS adicionales para el contenedor del pin
 * @param {number} [props.size] - Tamaño del icono (default 14)
 */
export default function VenueStatusPin({
  eventId,
  idEstadoVenue,
  label = "",
  supabase,
  className = "",
  size = 14,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const venueStatus = getVenueStatusById(idEstadoVenue);
  const pinColor = venueStatus ? venueStatus.color : "#9ca3af"; // gris sin datos

  const openHistory = useCallback(async () => {
    if (!eventId || !supabase) return;
    setIsOpen(true);
    setLoading(true);
    setLogs([]);
    try {
      const { data, error } = await supabase
        .from("eventos_venue_log")
        .select(
          "id, created_at, nota, status:venue_status_types(nombre,color,slug), integrante:integrantes(nombre,apellido)"
        )
        .eq("id_evento", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error obteniendo historial de estado de venue:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setLogs([]);
  }, []);

  const hasStatus = !!venueStatus;

  return (
    <>
      {hasStatus ? (
        <button
          type="button"
          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-opacity hover:opacity-90 ${className}`}
          style={{ backgroundColor: pinColor }}
          onClick={(e) => {
            e.stopPropagation();
            openHistory();
          }}
          title={
            venueStatus
              ? `Historial de estado de venue: ${venueStatus.nombre}`
              : "Historial de estado de venue"
          }
        >
          <IconMapPin size={size} className="text-white" />
        </button>
      ) : (
        <span
          className={`shrink-0 flex items-center justify-center text-slate-400 ${className}`}
          title="Sin estado de venue"
        >
          <IconMapPin size={size} />
        </span>
      )}

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={closeModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="venue-history-title"
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3
                    id="venue-history-title"
                    className="text-sm font-bold text-slate-800"
                  >
                    Historial de estado de venue
                  </h3>
                  {label && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {label}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600"
                  onClick={closeModal}
                  aria-label="Cerrar"
                >
                  <IconX size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-8 text-slate-500 text-sm gap-2">
                    <IconLoader className="animate-spin" size={18} />
                    <span>Cargando historial...</span>
                  </div>
                )}
                {!loading &&
                  (logs.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">
                      No hay cambios registrados para este venue.
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {logs.map((log) => (
                        <li key={log.id} className="p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {log.status && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                  style={{
                                    backgroundColor: `${log.status.color}20`,
                                    color: "#0f172a",
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: log.status.color,
                                    }}
                                  />
                                  {log.status.nombre}
                                </span>
                              )}
                              {log.integrante && (
                                <span className="text-[11px] text-slate-500">
                                  {log.integrante.apellido},{" "}
                                  {log.integrante.nombre}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {format(
                                parseISO(log.created_at),
                                "dd/MM/yyyy HH:mm",
                                { locale: es }
                              )}
                            </span>
                          </div>
                          {log.nota && (
                            <p className="mt-1 text-[12px] text-slate-600 whitespace-pre-wrap">
                              {log.nota}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
