import React, { useMemo, useState } from "react";
import { IconFileText, IconX } from "../../components/ui/Icons";
import { differenceInCalendarDays } from "date-fns";

// Mismo helper que en RoomingInitialOrderReport: soporta eventos y strings
const getLogisticsDates = (log) => {
  let dateIn = null;
  let dateOut = null;

  if (log?.checkin) {
    let dStr;
    let tStr;
    if (typeof log.checkin === "object") {
      dStr = log.checkin.fecha || log.checkin.date;
      tStr =
        log.checkin.hora_inicio ||
        log.checkin.hora ||
        log.checkin.time ||
        log.checkin_time ||
        "14:00";
    } else {
      dStr = log.checkin;
      tStr = log.checkin_time || "14:00";
    }
    if (dStr) {
      const safeTime = (tStr || "14:00").slice(0, 5);
      dateIn = new Date(`${dStr}T${safeTime}`);
    }
  }

  if (log?.checkout) {
    let dStr;
    let tStr;
    if (typeof log.checkout === "object") {
      dStr = log.checkout.fecha || log.checkout.date;
      tStr =
        log.checkout.hora_inicio ||
        log.checkout.hora ||
        log.checkout.time ||
        log.checkout_time ||
        "10:00";
    } else {
      dStr = log.checkout;
      tStr = log.checkout_time || "10:00";
    }
    if (dStr) {
      const safeTime = (tStr || "10:00").slice(0, 5);
      dateOut = new Date(`${dStr}T${safeTime}`);
    }
  }

  return { dateIn, dateOut };
};

const DEFAULT_ADJ = { std_m: 0, std_f: 0, plus_m: 0, plus_f: 0 };

const RoomingInitialAdjustmentModal = ({
  roster,
  logisticsMap,
  onClose,
  onConfirm,
}) => {
  const [adjustments, setAdjustments] = useState({});

  const { groups, sortedKeys } = useMemo(() => {
    const byKey = {};

    roster.forEach((person) => {
      const log = logisticsMap[person.id];
      if (!log) return;

      const { dateIn, dateOut } = getLogisticsDates(log);
      if (!dateIn || !dateOut) return;
      if (isNaN(dateIn.getTime()) || isNaN(dateOut.getTime())) return;

      const nights = differenceInCalendarDays(dateOut, dateIn);
      if (nights <= 0) return;

      const formatD = (d) =>
        d.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
        });
      const formatT = (d) =>
        d.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        });

      const key = `${formatD(dateIn)} ${formatT(dateIn)} - ${formatD(
        dateOut,
      )} ${formatT(dateOut)}`;

      if (!byKey[key]) {
        byKey[key] = {
          rangeLabel: key,
          checkIn: dateIn,
          checkOut: dateOut,
          nights,
          baseCount: 0,
          baseM: 0,
          baseF: 0,
        };
      }

      const isFemale = person.genero === "F";
      byKey[key].baseCount += 1;
      if (isFemale) byKey[key].baseF += 1;
      else byKey[key].baseM += 1;
    });

    const keys = Object.keys(byKey).sort(
      (a, b) => byKey[a].checkIn - byKey[b].checkIn,
    );

    return { groups: byKey, sortedKeys: keys };
  }, [roster, logisticsMap]);

  const handleChange = (rangeKey, field, rawValue) => {
    const num = Number(rawValue);
    const safe = Number.isNaN(num) || num < 0 ? 0 : Math.floor(num);
    setAdjustments((prev) => {
      const prevRange = prev[rangeKey] || DEFAULT_ADJ;
      return {
        ...prev,
        [rangeKey]: {
          ...prevRange,
          [field]: safe,
        },
      };
    });
  };

  const totals = useMemo(() => {
    let basePax = 0;
    let totalPax = 0;
    let totalBeds = 0;
    let suggestedRooms = 0;

    sortedKeys.forEach((key) => {
      const g = groups[key];
      const adj = adjustments[key] || DEFAULT_ADJ;

      const totalF = g.baseF + (adj.std_f || 0) + (adj.plus_f || 0);
      const totalM = g.baseM + (adj.std_m || 0) + (adj.plus_m || 0);
      const pax = totalF + totalM;
      const roomsF = Math.ceil(totalF / 2);
      const roomsM = Math.ceil(totalM / 2);
      const rooms = roomsF + roomsM;

      basePax += g.baseCount;
      totalPax += pax;
      // Camas noche = pax * noches
      totalBeds += pax * g.nights;
      suggestedRooms += rooms;
    });

    return {
      basePax,
      totalPax,
      totalBeds,
      suggestedRooms,
    };
  }, [sortedKeys, groups, adjustments]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconFileText size={20} className="text-indigo-600" />
            Ajuste de Pedido de Plazas
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <IconX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-white text-sm">
          <p className="text-[11px] text-slate-500 mb-3">
            Aquí puedes agregar pax adicionales (STD / PLUS, Mujeres / Varones)
            por cada rango de Check-In / Check-Out. No se modifican los
            integrantes de la gira, solo el pedido final.
          </p>

          {sortedKeys.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm italic">
              No hay rangos de alojamiento detectados para esta gira.
            </div>
          ) : (
            <>
              <table className="w-full border-collapse text-xs mb-4">
                <thead>
                  <tr>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left">
                      Fecha In / Out
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                      Noches
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                      Base F
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                      Base M
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                      Base Total
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1 bg-slate-100">
                      + STD F
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1 bg-slate-100">
                      + STD M
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1 bg-amber-50">
                      + PLUS F
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1 bg-amber-50">
                      + PLUS M
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                      Total Pax
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                      Habs Sugeridas
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                      Total Camas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeys.map((key) => {
                    const g = groups[key];
                    const adj = adjustments[key] || DEFAULT_ADJ;

                    const totalF = g.baseF + (adj.std_f || 0) + (adj.plus_f || 0);
                    const totalM = g.baseM + (adj.std_m || 0) + (adj.plus_m || 0);
                    const totalPax = totalF + totalM;
                    const roomsF = Math.ceil(totalF / 2);
                    const roomsM = Math.ceil(totalM / 2);
                    const suggestedRooms = roomsF + roomsM;
                    const totalBeds = totalPax * g.nights;

                    return (
                      <tr key={key}>
                        <td className="border border-slate-200 px-2 py-1 font-mono text-[11px]">
                          {g.rangeLabel}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-700">
                          {g.nights}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center">
                          {g.baseF}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center">
                          {g.baseM}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center font-semibold">
                          {g.baseCount}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 bg-slate-50">
                          <input
                            type="number"
                            min="0"
                            className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right text-[11px]"
                            value={adj.std_f || 0}
                            onChange={(e) =>
                              handleChange(key, "std_f", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-slate-200 px-2 py-1 bg-slate-50">
                          <input
                            type="number"
                            min="0"
                            className="w-14 border border-slate-300 rounded px-1 py-0.5 text-right text-[11px]"
                            value={adj.std_m || 0}
                            onChange={(e) =>
                              handleChange(key, "std_m", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-slate-200 px-2 py-1 bg-amber-50">
                          <input
                            type="number"
                            min="0"
                            className="w-14 border border-amber-300 rounded px-1 py-0.5 text-right text-[11px]"
                            value={adj.plus_f || 0}
                            onChange={(e) =>
                              handleChange(key, "plus_f", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-slate-200 px-2 py-1 bg-amber-50">
                          <input
                            type="number"
                            min="0"
                            className="w-14 border border-amber-300 rounded px-1 py-0.5 text-right text-[11px]"
                            value={adj.plus_m || 0}
                            onChange={(e) =>
                              handleChange(key, "plus_m", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-800">
                          {totalPax}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center">
                          {suggestedRooms}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center">
                          {totalBeds}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex flex-wrap gap-4 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                <div>
                  <div className="text-slate-500 font-semibold uppercase text-[10px]">
                    Pax Base (Roster)
                  </div>
                  <div className="text-lg font-bold text-slate-800">
                    {totals.basePax}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-semibold uppercase text-[10px]">
                    Pax Totales (con Adicionales)
                  </div>
                  <div className="text-lg font-bold text-indigo-700">
                    {totals.totalPax}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-semibold uppercase text-[10px]">
                    Habitaciones Sugeridas (DOBLE)
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    {totals.suggestedRooms}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-semibold uppercase text-[10px]">
                    Total Camas Noche (Pax × Noches)
                  </div>
                  <div className="text-lg font-bold text-amber-700">
                    {totals.totalBeds}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 p-3 flex justify-end gap-2 bg-slate-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(adjustments)}
            className="px-4 py-1.5 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            disabled={sortedKeys.length === 0}
          >
            Continuar al Pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomingInitialAdjustmentModal;

