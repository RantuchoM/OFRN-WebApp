import React from "react";
import { IconUtensils, IconX, IconCheck } from "../ui/Icons";
import { getDeadlineStatus } from "../../utils/agendaHelpers";

/**
 * Modal de acción de comida (confirmar / asistencia) para la agenda.
 * Muestra el evento de comida, estado de convocatoria/cierre y botones Asistiré / No iré.
 */
export default function AgendaMealActionModal({
  event,
  onClose,
  onToggleAttendance,
  isManagement,
  isEditor,
}) {
  if (!event) return null;

  const dl = getDeadlineStatus(event.programas?.fecha_confirmacion_limite);
  const isConvoked = event.is_convoked;
  const isClosed = dl.status === "CLOSED";
  const isAdmin = isManagement || isEditor;
  const canOverride = isAdmin && isClosed;
  const isLocked = !isConvoked || (isClosed && !isAdmin);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconUtensils className="text-indigo-600" />
            {event.tipos_evento?.nombre}
          </h3>
          <button onClick={onClose}>
            <IconX className="text-slate-400" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <p className="text-sm text-slate-600 text-center mb-2">
            {event.descripcion ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: event.descripcion,
                }}
              />
            ) : (
              "¿Vas a asistir a esta comida?"
            )}
          </p>

          {/* MENSAJES DE ESTADO */}
          {!isConvoked && (
            <div className="text-xs text-center text-slate-500 font-bold bg-slate-100 p-2 rounded border border-slate-200 mb-2">
              🚫 No estás convocado a esta comida
            </div>
          )}

          {isConvoked && isClosed && !canOverride && (
            <div className="text-xs text-center text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 mb-2">
              🔒 Votación Cerrada
            </div>
          )}

          {isConvoked && canOverride && (
            <div className="text-xs text-center text-amber-700 font-bold bg-amber-50 p-2 rounded border border-amber-100 mb-2">
              🔓 Votación Cerrada (Acceso Admin)
            </div>
          )}

          {isConvoked && !isClosed && (
            <div className="text-xs text-center text-indigo-600 font-bold bg-indigo-50 p-2 rounded border border-indigo-100 mb-2">
              ⏳ Cierra en: {dl.message}
            </div>
          )}

          {/* BOTONES DE ACCIÓN */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onToggleAttendance(event.id, "P")}
              disabled={isLocked}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all 
                ${
                  event.mi_asistencia === "P"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                    : "bg-white border-slate-100 text-slate-600"
                }
                ${isLocked ? "opacity-40 cursor-not-allowed grayscale pointer-events-none" : "hover:border-emerald-200"}
              `}
            >
              <IconCheck size={24} />
              <span className="text-xs font-bold">Asistiré</span>
            </button>

            <button
              onClick={() => onToggleAttendance(event.id, "A")}
              disabled={isLocked}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all 
                ${
                  event.mi_asistencia === "A"
                    ? "bg-rose-50 border-rose-500 text-rose-700"
                    : "bg-white border-slate-100 text-slate-600"
                }
                ${isLocked ? "opacity-40 cursor-not-allowed grayscale pointer-events-none" : "hover:border-rose-200"}
              `}
            >
              <IconX size={24} />
              <span className="text-xs font-bold">No iré</span>
            </button>
          </div>

          {/* BOTÓN BORRAR (Solo si no está bloqueado) */}
          {event.mi_asistencia && !isLocked && (
            <button
              onClick={() => onToggleAttendance(event.id, null)}
              className="text-xs text-slate-400 underline mt-4 hover:text-slate-600 w-full text-center"
            >
              Borrar mi selección
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
