import React, { useState, useEffect } from "react";
import {
  IconX,
  IconSave,
  IconAlertTriangle,
  IconMapPin,
  IconClock,
  IconCalendar,
  IconArrowRight,
  IconTrash,
  IconUser,
} from "../../components/ui/Icons";

// --- UTILIDADES ---
const formatTime = (time) => (time ? time.slice(0, 5) : "--:--");
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
};

// --- COMPONENTE INTERNO: SELECTOR DE PARADA (Timeline Style) ---
const StopSelectorModal = ({
  isOpen,
  onClose,
  events,
  onSelect,
  title,
  currentSelectedId,
  minDateTimeStr,
}) => {
  if (!isOpen) return null;

  // Filtrar eventos si hay restricción de fecha (para bajadas)
  const displayEvents = minDateTimeStr
    ? events.filter((e) => e.fecha + e.hora_inicio > minDateTimeStr)
    : events;

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-lg shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center rounded-t-lg">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <IconMapPin className="text-indigo-600" /> {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
          {displayEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">
              No hay paradas disponibles posteriores a la subida seleccionada.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-500 sticky top-0 shadow-sm z-10 text-xs uppercase">
                <tr>
                  <th className="p-3 w-20">Hora</th>
                  <th className="p-3">Parada / Locación</th>
                  <th className="p-3">Ciudad</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayEvents.map((evt) => {
                  const isSelected =
                    String(evt.id) === String(currentSelectedId);
                  return (
                    <tr
                      key={evt.id}
                      onClick={() => onSelect(evt.id)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-50 border-l-4 border-indigo-500"
                          : "hover:bg-slate-50 border-l-4 border-transparent"
                      }`}
                    >
                      <td className="p-3 align-middle">
                        <div className="font-bold text-slate-700">
                          {formatTime(evt.hora_inicio)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDate(evt.fecha)}
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <div className="font-medium text-slate-800">
                          {evt.locaciones?.nombre || "Sin Nombre"}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">
                          {evt.locaciones?.direccion}
                        </div>
                      </td>
                      <td className="p-3 align-middle text-slate-500 text-xs">
                        {evt.locaciones?.localidades?.localidad || "-"}
                      </td>
                      <td className="p-3 text-right align-middle">
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                            Actual
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t bg-slate-50 flex justify-between items-center rounded-b-lg">
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-red-500 hover:text-red-700 hover:underline px-2"
          >
            Quitar selección
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function BoardingManagerModal({
  isOpen,
  onClose,
  transportId,
  passengers,
  events,
  onSaveBoarding,
  onDeleteBoarding, // <--- AGREGAR ESTO
}) {
  const [localData, setLocalData] = useState({});
  const [filter, setFilter] = useState("all");
  const [selector, setSelector] = useState({
    isOpen: false,
    pId: null,
    field: null,
  });

  const relevantPax = passengers.filter((p) =>
    p.logistics?.transports?.some((t) => t.id === transportId)
  );

  useEffect(() => {
    if (isOpen && relevantPax.length > 0) {
      const initial = {};
      relevantPax.forEach((p) => {
        const tData = p.logistics?.transports?.find(
          (t) => t.id === transportId
        );
        initial[p.id] = {
          subida: tData?.subidaId || "",
          bajada: tData?.bajadaId || "",
          // Guardamos las prioridades iniciales para comparar
          subidaPrio: tData?.subidaPrio || 0,
          bajadaPrio: tData?.bajadaPrio || 0,
          changed: false,
        };
      });
      setLocalData(initial);
    }
  }, [isOpen, transportId, passengers]);

  const handleOpenSelector = (pId, field) => {
    setSelector({ isOpen: true, pId, field });
  };

  const handleSelectStop = (eventId) => {
    const { pId, field } = selector;
    if (pId) {
      // Si seleccionamos Bajada, verificar consistencia temporal opcionalmente,
      // pero aquí confiamos en el filtro del modal.

      setLocalData((prev) => ({
        ...prev,
        [pId]: {
          ...prev[pId],
          [field]: eventId || "", // null se convierte en string vacía
          changed: true,
        },
      }));
    }
    setSelector({ isOpen: false, pId: null, field: null });
  };

  const handleSaveRow = async (pId) => {
    const data = localData[pId];
    if (!data) return;
    await onSaveBoarding(pId, data.subida, data.bajada);
    // Actualizamos el estado local asumiendo éxito,
    // y marcamos que ahora es "Personal" (Prio 5) visualmente hasta que recargue todo
    setLocalData((prev) => ({
      ...prev,
      [pId]: {
        ...prev[pId],
        changed: false,
        // Al guardar manualmente, se convierte en excepción personal (prio 5)
        [`${selector.field}Prio`]: 5,
      },
    }));
  };

  if (!isOpen) return null;

  const displayedPax = relevantPax.filter((p) => {
    if (filter === "all") return true;
    const data = localData[p.id];
    return !data?.subida || !data?.bajada;
  });

  const sortedEvents = [...events].sort((a, b) =>
    (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio)
  );

  const renderStopButton = (pId, field, value, prio) => {
    const evt = events.find((e) => String(e.id) === String(value));
    const isPersonal = prio >= 5; // Regla de Persona
    const isEmpty = !value;

    // Clase base del botón
    let btnClass =
      "w-full text-left border rounded px-3 py-2 text-xs flex items-center justify-between transition-all shadow-sm group relative ";

    if (isEmpty) {
      btnClass += "border-red-200 bg-red-50/50 hover:border-red-400";
    } else if (isPersonal) {
      btnClass +=
        "border-indigo-300 bg-indigo-50/30 hover:border-indigo-500 ring-1 ring-indigo-100"; // Estilo distintivo
    } else {
      btnClass += "border-slate-200 bg-white hover:border-emerald-400";
    }

    return (
      <button
        onClick={() => handleOpenSelector(pId, field)}
        className={btnClass}
        title={
          isPersonal
            ? "Excepción Personal cargada manualmente"
            : "Asignación por Regla General"
        }
      >
        {isPersonal && !isEmpty && (
          <div
            className="absolute -top-1.5 -right-1.5 bg-indigo-100 text-indigo-600 rounded-full p-0.5 border border-indigo-200 shadow-sm"
            title="Personalizado"
          >
            <IconUser size={10} />
          </div>
        )}

        {evt ? (
          <div className="flex flex-col items-start leading-tight overflow-hidden">
            <span
              className={`font-bold text-[11px] truncate w-full ${
                isPersonal ? "text-indigo-800" : "text-slate-700"
              }`}
            >
              {evt.locaciones?.nombre}
            </span>
            <div className="flex gap-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-0.5">
                <IconClock size={10} /> {formatTime(evt.hora_inicio)}
              </span>
              <span className="truncate opacity-80">
                {evt.locaciones?.localidades?.localidad}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-400 italic font-normal text-xs">
            -- Seleccionar --
          </span>
        )}

        <IconMapPin
          size={14}
          className={
            isEmpty
              ? "text-red-300"
              : isPersonal
              ? "text-indigo-400"
              : "text-slate-300"
          }
        />
      </button>
    );
  };

  // Cálculo para filtro de fechas en Bajada
  let minDateForSelector = null;
  if (selector.isOpen && selector.field === "bajada") {
    const currentStartId = localData[selector.pId]?.subida;
    if (currentStartId) {
      const startEvt = events.find(
        (e) => String(e.id) === String(currentStartId)
      );
      if (startEvt) minDateForSelector = startEvt.fecha + startEvt.hora_inicio;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-lg shadow-xl flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
          <div>
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              Gestión de Abordaje
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-normal">
                {relevantPax.length} Pasajeros
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Define subida y bajada de forma individual.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <IconX size={24} />
          </button>
        </div>

        <div className="p-2 border-b bg-white flex gap-2 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs rounded-full border ${
                filter === "all"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("incomplete")}
              className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 ${
                filter === "incomplete"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {filter !== "incomplete" && <IconAlertTriangle size={12} />}{" "}
              Incompletos
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mr-2">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-slate-300"></div> Regla
              Gral.
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-indigo-300"></div>{" "}
              Excepción (Personal)
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-2 font-semibold w-1/4">Pasajero</th>
                <th className="p-2 font-semibold text-emerald-700 w-1/3">
                  Subida (Origen)
                </th>
                <th className="p-2 font-semibold text-rose-700 w-1/3">
                  Bajada (Destino)
                </th>
                <th className="p-2 w-16 text-center">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedPax.map((p) => {
                const data = localData[p.id] || { subida: "", bajada: "" };
                const isIncomplete = !data.subida || !data.bajada;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isIncomplete ? "bg-amber-50/20" : ""
                    }`}
                  >
                    <td className="p-2 align-middle">
                      <div className="font-bold text-slate-700">
                        {p.apellido}, {p.nombre}
                      </div>
                      <div className="text-xs text-slate-400">
                        {p.instrumento || "Staff"}
                      </div>
                      {isIncomplete && (
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                          <IconAlertTriangle size={10} /> Incompleto
                        </span>
                      )}
                    </td>

                    <td className="p-2 align-middle">
                      {renderStopButton(
                        p.id,
                        "subida",
                        data.subida,
                        data.subidaPrio
                      )}
                    </td>

                    <td className="p-2 align-middle">
                      {renderStopButton(
                        p.id,
                        "bajada",
                        data.bajada,
                        data.bajadaPrio
                      )}
                    </td>

                    <td className="p-2 text-center align-middle">
                      {data.changed ? (
                        <button
                          onClick={() => handleSaveRow(p.id)}
                          className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors shadow-md transform hover:scale-105"
                          title="Guardar cambios"
                        >
                          <IconSave size={16} />
                        </button>
                      ) : (
                        // Si tiene regla personal (prio >= 5) y no hay cambios pendientes, mostrar borrar
                        (data.subidaPrio >= 5 || data.bajadaPrio >= 5) && (
                          <button
                            onClick={() => onDeleteBoarding(p.id)}
                            className="bg-white border border-rose-200 text-rose-500 p-2 rounded-full hover:bg-rose-50 hover:text-rose-700 transition-colors shadow-sm"
                            title="Eliminar excepción (Volver a regla general)"
                          >
                            <IconTrash size={16} />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayedPax.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="p-12 text-center text-slate-400 italic"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <IconAlertTriangle size={32} className="opacity-20" />
                      <span>
                        Todos los pasajeros visibles tienen sus paradas
                        asignadas.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StopSelectorModal
        isOpen={selector.isOpen}
        onClose={() => setSelector({ ...selector, isOpen: false })}
        events={sortedEvents}
        onSelect={handleSelectStop}
        currentSelectedId={localData[selector.pId]?.[selector.field]}
        title={
          selector.field === "subida"
            ? "Seleccionar Subida"
            : "Seleccionar Bajada"
        }
        minDateTimeStr={minDateForSelector}
      />
    </div>
  );
}
