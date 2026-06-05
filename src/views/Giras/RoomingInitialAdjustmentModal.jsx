import React, { useMemo, useState, useCallback, useEffect } from "react";
import { IconFileText, IconX } from "../../components/ui/Icons";
import {
  buildInitialDateGroups,
  computeSuggestedRooms,
  getAdjustmentForRange,
  getSuggestedRoomsLabel,
  INITIAL_ORDER_BEDS_PER_ROOM_OPTIONS,
  makeAdjustmentKey,
  resolveSegmentBookingIds,
  showSuggestedRooms,
} from "../../utils/roomingInitialOrder";
import {
  formatTramoTitle,
  getTramoLocalidadIds,
  isLocalInPedidoTramo,
} from "../../utils/giraTramos";
import { normalize } from "../../utils/giraUtils";

function computeSectionTotals(section, adjustments, bedsPerRoom) {
  let basePax = 0;
  let totalPax = 0;
  let totalBeds = 0;
  let suggestedRooms = 0;

  section.sortedKeys.forEach((rangeKey) => {
    const g = section.groups[rangeKey];
    const adj = getAdjustmentForRange(
      adjustments,
      section.segmentId,
      rangeKey,
    );
    const totalF = g.baseF + (adj.std_f || 0) + (adj.plus_f || 0);
    const totalM = g.baseM + (adj.std_m || 0) + (adj.plus_m || 0);
    const pax = totalF + totalM;
    basePax += g.baseCount;
    totalPax += pax;
    totalBeds += pax * g.nights;
    suggestedRooms += computeSuggestedRooms(totalF, totalM, bedsPerRoom);
  });

  return { basePax, totalPax, totalBeds, suggestedRooms };
}

function SectionSummaryBox({ title, totals, bedsPerRoom }) {
  const roomsLabel = getSuggestedRoomsLabel(bedsPerRoom);
  return (
    <div className="flex flex-wrap gap-4 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
      {title && (
        <div className="w-full text-[10px] font-bold uppercase text-indigo-800 tracking-wide">
          {title}
        </div>
      )}
      <div>
        <div className="text-slate-500 font-semibold uppercase text-[10px]">
          Pax Base
        </div>
        <div className="text-lg font-bold text-slate-800">{totals.basePax}</div>
      </div>
      <div>
        <div className="text-slate-500 font-semibold uppercase text-[10px]">
          Pax Totales
        </div>
        <div className="text-lg font-bold text-indigo-700">{totals.totalPax}</div>
      </div>
      {roomsLabel && (
        <div>
          <div className="text-slate-500 font-semibold uppercase text-[10px]">
            {roomsLabel}
          </div>
          <div className="text-lg font-bold text-emerald-700">
            {totals.suggestedRooms}
          </div>
        </div>
      )}
      <div>
        <div className="text-slate-500 font-semibold uppercase text-[10px]">
          Total Camas Noche
        </div>
        <div className="text-lg font-bold text-amber-700">{totals.totalBeds}</div>
      </div>
    </div>
  );
}

const RoomingInitialAdjustmentModal = ({
  roster,
  logisticsMap,
  rooms = [],
  bookings = [],
  segmentRows = [],
  segments = [],
  cortesCount = 0,
  locationsList = [],
  excludedPersonIds = [],
  onClose,
  onConfirm,
}) => {
  const [adjustments, setAdjustments] = useState({});
  const [bedsPerRoom, setBedsPerRoom] = useState(2);
  const defaultSegmentId = segmentRows[0]?.id ?? null;

  const sections = useMemo(() => {
    const hasTramos = cortesCount > 0 && segmentRows.length > 0;
    const buildOne = (segRow, idx) => {
      const tramoIndice = Number(
        segRow?.indice != null && !Number.isNaN(Number(segRow.indice))
          ? segRow.indice
          : idx,
      );
      const bookingIds = segRow
        ? resolveSegmentBookingIds(
            bookings,
            segRow,
            segmentRows,
            defaultSegmentId,
          )
        : null;
      const segmentSpec = segments.find(
        (s) => Number(s.indice) === tramoIndice,
      );
      const tramoLocalidadIds = getTramoLocalidadIds(
        segRow,
        segmentSpec,
        segmentRows,
        tramoIndice,
      );
      const locNames = tramoLocalidadIds
        .map(
          (id) =>
            locationsList.find((l) => Number(l.id) === Number(id))?.localidad,
        )
        .filter(Boolean);
      const excludedSet =
        excludedPersonIds instanceof Set
          ? excludedPersonIds
          : excludedPersonIds?.length
            ? new Set(excludedPersonIds.map(Number))
            : null;
      const localsCount = roster.filter((p) => {
        const est = normalize(p.estado_gira || p.estado);
        if (est === "ausente" || est === "baja") return false;
        if (excludedSet?.has(Number(p.id))) return false;
        return isLocalInPedidoTramo(
          p,
          segmentSpec,
          tramoLocalidadIds,
          segRow,
          segments,
          segmentRows,
          tramoIndice,
        );
      }).length;
      const { groups, sortedKeys } = buildInitialDateGroups({
        roster,
        logisticsMap,
        segments,
        segmentRow: segRow,
        segmentRows,
        rooms,
        bookings,
        segmentBookingIds: bookingIds,
        defaultSegmentId,
        tramoIndice,
        excludedPersonIds: excludedSet,
      });
      const baseTitle =
        segRow && hasTramos
          ? formatTramoTitle(idx, segRow.fecha_desde, segRow.fecha_hasta)
          : null;
      const locLabel =
        locNames.length > 0
          ? locNames.join(", ")
          : "sin localidades definidas";
      const localsNote =
        localsCount > 0
          ? ` · ${localsCount} local${localsCount !== 1 ? "es" : ""}`
          : "";
      return {
        segmentId: segRow?.id ?? null,
        title: baseTitle
          ? `${baseTitle} · ${locLabel}${localsNote}`
          : null,
        groups,
        sortedKeys,
        localsCount,
      };
    };

    if (!hasTramos) return [buildOne(null, 0)];
    return segmentRows.map((segRow, idx) => buildOne(segRow, idx));
  }, [
    roster,
    logisticsMap,
    rooms,
    bookings,
    segmentRows,
    segments,
    cortesCount,
    defaultSegmentId,
    locationsList,
    excludedPersonIds,
  ]);

  const handleChange = (segmentId, rangeKey, field, rawValue) => {
    const num = Number(rawValue);
    const safe = Number.isNaN(num) || num < 0 ? 0 : Math.floor(num);
    const key = makeAdjustmentKey(segmentId, rangeKey);
    setAdjustments((prev) => {
      const prevRange = getAdjustmentForRange(prev, segmentId, rangeKey);
      return {
        ...prev,
        [key]: {
          ...prevRange,
          [field]: safe,
        },
      };
    });
  };

  const sectionTotalsList = useMemo(
    () =>
      sections.map((section) =>
        computeSectionTotals(section, adjustments, bedsPerRoom),
      ),
    [sections, adjustments, bedsPerRoom],
  );

  const hasTramoPicker = sections.length > 1;

  const [selectedTramoIndices, setSelectedTramoIndices] = useState(
    () => new Set(sections.map((_, idx) => idx)),
  );

  const sectionKey = sections
    .map((s) => s.segmentId ?? s.title ?? "")
    .join("|");

  useEffect(() => {
    setSelectedTramoIndices(new Set(sections.map((_, idx) => idx)));
  }, [sectionKey, sections.length]);

  const toggleTramo = useCallback((idx) => {
    setSelectedTramoIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size <= 1) return prev;
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const selectAllTramos = useCallback(() => {
    setSelectedTramoIndices(new Set(sections.map((_, idx) => idx)));
  }, [sections]);

  const visibleSectionEntries = useMemo(
    () =>
      sections
        .map((section, idx) => ({
          section,
          idx,
          totals: sectionTotalsList[idx],
        }))
        .filter(({ idx }) => selectedTramoIndices.has(idx)),
    [sections, sectionTotalsList, selectedTramoIndices],
  );

  const showMultiLayout = visibleSectionEntries.length > 1;

  const visibleGrandTotals = useMemo(
    () =>
      visibleSectionEntries.reduce(
        (acc, { totals }) => ({
          basePax: acc.basePax + totals.basePax,
          totalPax: acc.totalPax + totals.totalPax,
          totalBeds: acc.totalBeds + totals.totalBeds,
          suggestedRooms: acc.suggestedRooms + totals.suggestedRooms,
        }),
        { basePax: 0, totalPax: 0, totalBeds: 0, suggestedRooms: 0 },
      ),
    [visibleSectionEntries],
  );

  const hasAnyRange = visibleSectionEntries.some(
    ({ section }) => section.sortedKeys.length > 0,
  );

  const showRoomsColumn = showSuggestedRooms(bedsPerRoom);

  const renderTable = (section) => {
    if (section.sortedKeys.length === 0) {
      return (
        <p className="text-xs text-slate-400 italic py-3">
          No hay rangos de alojamiento en este tramo.
        </p>
      );
    }

    return (
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
            {showRoomsColumn && (
              <th className="border border-slate-200 bg-slate-50 px-2 py-1">
                Habs Sugeridas
              </th>
            )}
            <th className="border border-slate-200 bg-slate-50 px-2 py-1">
              Total Camas
            </th>
          </tr>
        </thead>
        <tbody>
          {section.sortedKeys.map((rangeKey) => {
            const g = section.groups[rangeKey];
            const adj = getAdjustmentForRange(
              adjustments,
              section.segmentId,
              rangeKey,
            );
            const totalF = g.baseF + (adj.std_f || 0) + (adj.plus_f || 0);
            const totalM = g.baseM + (adj.std_m || 0) + (adj.plus_m || 0);
            const totalPaxRow = totalF + totalM;
            const suggestedRoomsRow = computeSuggestedRooms(
              totalF,
              totalM,
              bedsPerRoom,
            );
            const totalBedsRow = totalPaxRow * g.nights;

            return (
              <tr key={`${section.segmentId}-${rangeKey}`}>
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
                      handleChange(
                        section.segmentId,
                        rangeKey,
                        "std_f",
                        e.target.value,
                      )
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
                      handleChange(
                        section.segmentId,
                        rangeKey,
                        "std_m",
                        e.target.value,
                      )
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
                      handleChange(
                        section.segmentId,
                        rangeKey,
                        "plus_f",
                        e.target.value,
                      )
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
                      handleChange(
                        section.segmentId,
                        rangeKey,
                        "plus_m",
                        e.target.value,
                      )
                    }
                  />
                </td>
                <td className="border border-slate-200 px-2 py-1 text-center font-semibold text-slate-800">
                  {totalPaxRow}
                </td>
                {showRoomsColumn && (
                  <td className="border border-slate-200 px-2 py-1 text-center">
                    {suggestedRoomsRow}
                  </td>
                )}
                <td className="border border-slate-200 px-2 py-1 text-center">
                  {totalBedsRow}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconFileText size={20} className="text-indigo-600" />
            Ajuste de Pedido de Plazas
            {cortesCount > 0 && segmentRows.length > 1 && (
              <span className="text-[10px] font-normal text-slate-500">
                · {segmentRows.length} tramos
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <IconX size={24} />
          </button>
        </div>

        {hasTramoPicker && (
          <div className="px-4 py-2 border-b border-slate-100 bg-white shrink-0 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              Tramos
            </span>
            {sections.map((section, idx) => {
              const active = selectedTramoIndices.has(idx);
              const label =
                section.title?.match(/^Tramo \d+/i)?.[0] || `T${idx + 1}`;
              return (
                <button
                  key={section.segmentId ?? idx}
                  type="button"
                  onClick={() => toggleTramo(idx)}
                  title={section.title || `Tramo ${idx + 1}`}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            {selectedTramoIndices.size < sections.length && (
              <button
                type="button"
                onClick={selectAllTramos}
                className="text-[10px] font-bold text-indigo-600 hover:underline ml-1"
              >
                Todos
              </button>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">
              {visibleSectionEntries.length === 1
                ? "Vista de tramo único"
                : `${visibleSectionEntries.length} tramos en el pedido`}
            </span>
          </div>
        )}

        <div className="px-4 py-2 border-b border-slate-100 bg-white shrink-0 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            Base habitación
          </span>
          {INITIAL_ORDER_BEDS_PER_ROOM_OPTIONS.map((opt) => {
            const active = bedsPerRoom === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBedsPerRoom(opt.value)}
                title={opt.title}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                  active
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          <span className="text-[10px] text-slate-400 ml-auto">
            {showRoomsColumn
              ? "F con F, M con M · ceil(pax ÷ base)"
              : "Solo pax y camas noche"}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-white text-sm">
          <p className="text-[11px] text-slate-500 mb-3">
            Agregá pax adicionales (STD / PLUS, Mujeres / Varones) por rango de
            Check-In / Check-Out
            {cortesCount > 0 ? ", en cada tramo de la gira" : ""}. No se
            modifican los integrantes, solo el pedido final.
          </p>

          {!hasAnyRange ? (
            <div className="text-center text-slate-400 py-10 text-sm italic">
              No hay rangos de alojamiento detectados para esta gira.
            </div>
          ) : (
            <>
              {!showMultiLayout && visibleSectionEntries[0] && (
                <SectionSummaryBox
                  totals={visibleSectionEntries[0].totals}
                  bedsPerRoom={bedsPerRoom}
                />
              )}

              {visibleSectionEntries.map(({ section, totals }, visIdx) => (
                <div
                  key={section.segmentId ?? `vis-${visIdx}`}
                  className={visIdx > 0 ? "mt-8 pt-6 border-t border-slate-200" : ""}
                >
                  {showMultiLayout && section.title && (
                    <h4 className="text-sm font-bold text-indigo-900 mb-3">
                      {section.title}
                    </h4>
                  )}
                  {renderTable(section)}
                  {showMultiLayout && section.sortedKeys.length > 0 && (
                    <SectionSummaryBox
                      title={`Resumen · ${section.title ?? "Gira"}`}
                      totals={totals}
                      bedsPerRoom={bedsPerRoom}
                    />
                  )}
                </div>
              ))}

              {showMultiLayout && (
                <SectionSummaryBox
                  title={`Total general (${visibleSectionEntries.length} tramos)`}
                  totals={visibleGrandTotals}
                  bedsPerRoom={bedsPerRoom}
                />
              )}
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
            onClick={() =>
              onConfirm({
                adjustments,
                selectedTramoIndices: [...selectedTramoIndices],
                bedsPerRoom,
              })
            }
            className="px-4 py-1.5 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            disabled={!hasAnyRange}
          >
            Continuar al Pedido
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomingInitialAdjustmentModal;
