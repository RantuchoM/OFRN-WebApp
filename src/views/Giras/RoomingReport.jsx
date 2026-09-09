// src/views/Giras/RoomingReport.jsx
import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconFileText,
  IconPrinter,
  IconX,
  IconFileExcel,
  IconHotel,
  IconLoader,
} from "../../components/ui/Icons";
import {
  buildOfrnRoomingSegmentSections,
  exportOfrnRoomingExcel,
  listOfrnRoomingHotels,
  totalBedNightsFromRooms,
} from "../../utils/ofrnRoomingExport";
import { toast } from "sonner";

const formatDate = (d) =>
  d
    ? d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
    : "-";
const formatTime = (d) =>
  d
    ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : "";
const formatDOB = (isoString) =>
  isoString ? isoString.split("-").reverse().join("/") : "-";

const getEmptyStats = () => ({
  total: 0,
  std: 0,
  plus: 0,
  matri: 0,
  cuna: 0,
});

/**
 * Reporte de rooming OFRN: vista / PDF / Excel, filtrable por hotel.
 */
const RoomingReportModal = ({
  bookings,
  rooms,
  onClose,
  logisticsMap,
  segmentRows = [],
  segments = [],
  cortesCount = 0,
  programName = "",
}) => {
  const componentRef = useRef();
  const [hotelBookingId, setHotelBookingId] = useState("all");
  const [excelBusy, setExcelBusy] = useState(false);

  const hotelOptions = useMemo(
    () => listOfrnRoomingHotels(bookings, rooms),
    [bookings, rooms],
  );

  const segmentSections = useMemo(
    () =>
      buildOfrnRoomingSegmentSections({
        bookings,
        rooms,
        logisticsMap,
        segmentRows,
        segments,
        cortesCount,
        hotelBookingId,
      }),
    [
      bookings,
      rooms,
      logisticsMap,
      segmentRows,
      segments,
      cortesCount,
      hotelBookingId,
    ],
  );

  const handlePrint = () => {
    const printContent = componentRef.current;
    if (!printContent) return;
    const printWindow = window.open(
      "about:blank",
      `Print${Date.now()}`,
      "left=50000,top=50000,width=0,height=0",
    );
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión.");
      return;
    }

    printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Rooming</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; padding: 20px; font-size: 11px; color: #334155; }
                        h1 { font-size: 18px; color: #1e1b4b; border-bottom: 2px solid #1e1b4b; padding-bottom: 5px; margin-bottom: 15px; }
                        h2 { font-size: 14px; margin-top: 25px; color: #1e293b; background: #f1f5f9; padding: 8px; border-radius: 4px; border-left: 5px solid #6366f1; page-break-after: avoid; }
                        h3 { font-size: 12px; color: #64748b; margin-bottom: 8px; margin-top: 15px; text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
                        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
                        th { background-color: #e2e8f0; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 10px; vertical-align: middle; }
                        .date-group { margin-bottom: 15px; page-break-inside: avoid; }
                        .date-header { font-weight: bold; font-size: 12px; color: #0f172a; border-bottom: 1px solid #cbd5e1; display: inline-block; margin-bottom: 5px; padding-right: 10px; }
                        ul.room-list { list-style-type: disc; margin: 5px 0 10px 25px; padding: 0; }
                        ul.room-list li { margin-bottom: 2px; color: #475569; }
                        .summary-table th { background-color: #dbeafe; color: #1e3a8a; text-align: center; }
                        .summary-table td.center { text-align: center; vertical-align: middle; }
                        .summary-table .total-row { background-color: #f8fafc; font-weight: bold; }
                        .date-col { white-space: nowrap; font-family: 'Consolas', monospace; font-size: 11px; vertical-align: middle; }
                        .center { text-align: center; vertical-align: middle; }
                        .group-header { background-color: #f8fafc; }
                        .room-type { font-weight: 700; color: #334155; }
                        .room-extra { font-size: 10px; color: #64748b; margin-top: 2px; }
                        .room-note { font-size: 10px; font-style: italic; color: #94a3b8; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 2px; }
                        .room-dates { margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #475569; font-family: 'Consolas', monospace; }
                        .text-muted { color: #94a3b8; font-size: 10px; }
                        .page-break { page-break-before: always; }
                        @media print {
                            @page { margin: 10mm; size: auto; }
                            body { padding: 0; -webkit-print-color-adjust: exact; }
                            .no-break { page-break-inside: avoid; }
                            h2 { page-break-after: avoid; }
                            thead { display: table-header-group; }
                            tr { page-break-inside: avoid; }
                            .page-break { page-break-before: always; }
                        }
                    </style>
                </head>
                <body>${printContent.innerHTML}</body>
            </html>
        `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleExcel = async () => {
    setExcelBusy(true);
    try {
      await exportOfrnRoomingExcel({
        bookings,
        rooms,
        logisticsMap,
        segmentRows,
        segments,
        cortesCount,
        hotelBookingId,
        programName,
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo exportar el Excel.");
    } finally {
      setExcelBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconFileText size={20} className="text-indigo-600" /> Reporte de
            Rooming por Hotel
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <IconHotel size={14} className="text-indigo-500" />
              Hotel
              <select
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white font-semibold text-slate-800 max-w-[220px]"
                value={String(hotelBookingId)}
                onChange={(e) => setHotelBookingId(e.target.value)}
                title="Filtrar export / vista por hotel"
              >
                <option value="all">
                  Todos ({hotelOptions.length} hotel
                  {hotelOptions.length === 1 ? "" : "es"})
                </option>
                {hotelOptions.map((h) => (
                  <option key={h.bookingId} value={String(h.bookingId)}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={excelBusy || segmentSections.length === 0}
              onClick={handleExcel}
              className="bg-emerald-700 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-emerald-800 flex items-center gap-2 shadow-sm disabled:opacity-50"
              title={
                hotelBookingId === "all"
                  ? "Excel: Habitaciones + plazas; con varios hoteles, una hoja extra por hotel"
                  : "Excel de este hotel"
              }
            >
              {excelBusy ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconFileExcel size={16} />
              )}
              Excel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={segmentSections.length === 0}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <IconPrinter size={16} /> Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="Cerrar"
            >
              <IconX size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-white" ref={componentRef}>
          <h1 className="mb-4">Listado de Distribución de Habitaciones</h1>
          {hotelBookingId !== "all" && hotelOptions.length > 0 && (
            <p className="text-sm text-slate-500 mb-4">
              Filtro:{" "}
              {hotelOptions.find(
                (h) => String(h.bookingId) === String(hotelBookingId),
              )?.label || "Hotel"}
            </p>
          )}
          {segmentSections.length === 0 && (
            <p className="text-amber-700">
              No hay habitaciones para el hotel seleccionado.
            </p>
          )}
          {segmentSections.map((section, sectionIdx) => (
            <div
              key={section.segmentRow?.id ?? `all-${sectionIdx}`}
              className={sectionIdx > 0 ? "page-break mt-8" : ""}
            >
              {section.tramoTitle && (
                <h2
                  className="mb-4 text-base font-bold text-indigo-900 border-b border-indigo-200 pb-2"
                  style={{ pageBreakAfter: "avoid" }}
                >
                  {section.tramoTitle}
                </h2>
              )}
              {section.hotels.map((hotel, hotelIdx) => {
                const processedRooms = hotel.rooms;
                const totalBedNights = totalBedNightsFromRooms(processedRooms);

                const stats = {
                  Simple: getEmptyStats(),
                  Doble: getEmptyStats(),
                  Triple: getEmptyStats(),
                  Cuádruple: getEmptyStats(),
                  Múltiple: getEmptyStats(),
                };
                processedRooms.forEach((r) => {
                  if (stats[r.capacityType]) {
                    stats[r.capacityType].total++;
                    if (r.isPlus) stats[r.capacityType].plus++;
                    else stats[r.capacityType].std++;
                    if (r.isMatri) stats[r.capacityType].matri++;
                    if (r.hasCuna) stats[r.capacityType].cuna++;
                  }
                });
                const activeCategories = Object.entries(stats).filter(
                  ([_, data]) => data.total > 0,
                );
                const grandTotal = (key) =>
                  activeCategories.reduce(
                    (acc, [_, data]) => acc + data[key],
                    0,
                  );

                const dateGroups = {};
                processedRooms.forEach((r) => {
                  if (!r.effectiveCheckIn || !r.effectiveCheckOut) return;
                  const dateKey = `${formatDate(r.effectiveCheckIn)} al ${formatDate(r.effectiveCheckOut)}`;
                  if (!dateGroups[dateKey]) dateGroups[dateKey] = {};
                  const capLower = r.capacityType.toLowerCase();
                  const capPlural = capLower.endsWith("e")
                    ? `${capLower}s`
                    : `${capLower}es`;
                  let baseDesc = `${capPlural} ${r.isPlus ? "superior" : "básico"}`;
                  if (r.isMatri) baseDesc += " matrimonial";
                  if (r.hasCuna) baseDesc += " c/cuna";
                  if (!dateGroups[dateKey][baseDesc])
                    dateGroups[dateKey][baseDesc] = 0;
                  dateGroups[dateKey][baseDesc]++;
                });

                const sortedDateKeys = Object.keys(dateGroups).sort((a, b) => {
                  const parseD = (str) => {
                    const [d, m] = str.split(" al ")[0].split("/");
                    return parseInt(m, 10) * 100 + parseInt(d, 10);
                  };
                  return parseD(a) - parseD(b);
                });

                return (
                  <div
                    key={hotel.bookingId}
                    className={`mb-8 no-break${hotelIdx > 0 ? " page-break" : ""}`}
                  >
                    <h2>
                      🏨 {hotel.hotelName}{" "}
                      <span
                        style={{ fontWeight: "normal", fontSize: "0.8em" }}
                      >
                        {hotel.localidad ? `(${hotel.localidad})` : ""}
                        {hotel.stayLabel ? ` · ${hotel.stayLabel}` : ""}
                      </span>
                    </h2>
                    <div className="mb-6 no-break">
                      <h3>Resumen General de Habitaciones</h3>
                      <table
                        className="summary-table"
                        style={{ width: "auto", minWidth: "50%" }}
                      >
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left" }}>Tipo</th>
                            <th>Total</th>
                            <th>Básico</th>
                            <th>Superior</th>
                            <th>Matrimonial</th>
                            <th>Con Cuna</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeCategories.map(([type, data]) => (
                            <tr key={type}>
                              <td>{type}</td>
                              <td
                                className="center"
                                style={{ fontWeight: "bold" }}
                              >
                                {data.total}
                              </td>
                              <td className="center text-muted">
                                {data.std || "-"}
                              </td>
                              <td className="center text-muted">
                                {data.plus || "-"}
                              </td>
                              <td className="center text-muted">
                                {data.matri || "-"}
                              </td>
                              <td className="center text-muted">
                                {data.cuna || "-"}
                              </td>
                            </tr>
                          ))}
                          <tr
                            className="total-row"
                            style={{ borderTop: "2px solid #cbd5e1" }}
                          >
                            <td>TOTAL GENERAL</td>
                            <td className="center">{grandTotal("total")}</td>
                            <td className="center">{grandTotal("std")}</td>
                            <td className="center">{grandTotal("plus")}</td>
                            <td className="center">{grandTotal("matri")}</td>
                            <td className="center">{grandTotal("cuna")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mb-6 no-break">
                      <h3>Desglose por Rango de Fechas</h3>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                        {sortedDateKeys.map((dateRange) => (
                          <div key={dateRange} className="date-group">
                            <div className="date-header">{dateRange}</div>
                            <ul className="room-list">
                              {Object.entries(dateGroups[dateRange]).map(
                                ([desc, count]) => (
                                  <li key={desc}>
                                    <b>{count}</b> {desc}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        ))}
                        <div
                          style={{
                            marginTop: "15px",
                            borderTop: "2px solid #cbd5e1",
                            paddingTop: "10px",
                            textAlign: "right",
                            color: "#b45309",
                            fontWeight: "bold",
                          }}
                        >
                          Cantidad total de camas (noches):{" "}
                          <span
                            style={{ fontSize: "14px", marginLeft: "5px" }}
                          >
                            {totalBedNights}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="page-break"></div>
                    <h3>Lista de Pasajeros (Ordenado por Check-In)</h3>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: "30px" }} className="center">
                            #
                          </th>
                          <th style={{ width: "180px" }}>Detalle Habitación</th>
                          <th>Apellido y Nombre</th>
                          <th style={{ width: "40px" }} className="center">
                            Sexo
                          </th>
                          <th style={{ width: "70px" }}>DNI</th>
                          <th style={{ width: "70px" }}>F. Nac</th>
                          <th style={{ width: "85px" }}>Check In</th>
                          <th style={{ width: "85px" }}>Check Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedRooms.map((r, idx) => {
                          const occupants = r.occupants;
                          const rowSpan = occupants.length || 1;
                          return (
                            <React.Fragment key={r.id}>
                              {occupants.map((occ, i) => (
                                <tr key={occ.id}>
                                  {i === 0 && (
                                    <>
                                      <td
                                        rowSpan={rowSpan}
                                        className="center group-header"
                                      >
                                        {idx + 1}
                                      </td>
                                      <td
                                        rowSpan={rowSpan}
                                        className="group-header"
                                      >
                                        <div className="room-type">
                                          {r.typeMainCapital}
                                        </div>
                                        {r.typeExtras.map((extra) => (
                                          <div
                                            key={extra}
                                            className="room-extra"
                                          >
                                            + {extra}
                                          </div>
                                        ))}
                                        {r.notas_internas && (
                                          <div className="room-note">
                                            Nota: {r.notas_internas}
                                          </div>
                                        )}
                                        <div className="room-dates">
                                          <div>
                                            In:{" "}
                                            {formatDate(r.effectiveCheckIn)}{" "}
                                            {formatTime(r.effectiveCheckIn)}
                                          </div>
                                          <div>
                                            Out:{" "}
                                            {formatDate(r.effectiveCheckOut)}{" "}
                                            {formatTime(r.effectiveCheckOut)}
                                          </div>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                  <td style={{ verticalAlign: "middle" }}>
                                    <b>{occ.apellido}</b>, {occ.nombre}
                                    {occ.ocupa_cama === false ? " (Cuna)" : ""}
                                  </td>
                                  <td
                                    className="center"
                                    style={{ verticalAlign: "middle" }}
                                  >
                                    {occ.genero || "-"}
                                  </td>
                                  <td className="date-col">
                                    {occ.dni || "-"}
                                  </td>
                                  <td className="date-col">
                                    {formatDOB(occ.fecha_nac)}
                                  </td>
                                  <td className="date-col">
                                    {formatDate(occ.dateIn)}{" "}
                                    <span
                                      className="text-muted"
                                      style={{ marginLeft: "2px" }}
                                    >
                                      {formatTime(occ.dateIn)}
                                    </span>
                                  </td>
                                  <td className="date-col">
                                    {formatDate(occ.dateOut)}{" "}
                                    <span
                                      className="text-muted"
                                      style={{ marginLeft: "2px" }}
                                    >
                                      {formatTime(occ.dateOut)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {occupants.length === 0 && (
                                <tr>
                                  <td className="center group-header">
                                    <b>{idx + 1}</b>
                                  </td>
                                  <td className="group-header">
                                    <div className="room-type">
                                      {r.typeMainCapital}
                                    </div>
                                    {r.typeExtras.map((extra) => (
                                      <div key={extra} className="room-extra">
                                        + {extra}
                                      </div>
                                    ))}
                                  </td>
                                  <td
                                    colSpan="6"
                                    style={{
                                      color: "#cbd5e1",
                                      fontStyle: "italic",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    Sin asignar
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RoomingReportModal;
