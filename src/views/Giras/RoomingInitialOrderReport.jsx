import React, { useRef, useMemo } from "react";
import { IconFileText, IconPrinter, IconX } from "../../components/ui/Icons";
import { buildInitialOrderSections, getSuggestedRoomsLabel, showSuggestedRooms } from "../../utils/roomingInitialOrder";

function sumSectionTotals(sections) {
  return sections.reduce(
    (acc, section) => ({
      totalPax: acc.totalPax + section.totalPax,
      totalBedNights: acc.totalBedNights + section.totalBedNights,
      grandTotalStdNights:
        acc.grandTotalStdNights + section.grandTotalStdNights,
      grandTotalPlusNights:
        acc.grandTotalPlusNights + section.grandTotalPlusNights,
      totalSuggestedRooms:
        acc.totalSuggestedRooms + section.totalSuggestedRooms,
    }),
    {
      totalPax: 0,
      totalBedNights: 0,
      grandTotalStdNights: 0,
      grandTotalPlusNights: 0,
      totalSuggestedRooms: 0,
    },
  );
}

function SectionSummaryBox({ title, totals, className = "", bedsPerRoom = 2 }) {
  const roomsLabel = getSuggestedRoomsLabel(bedsPerRoom);
  return (
    <div
      className={`mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-8 summary-box ${className}`.trim()}
    >
      {title && (
        <div className="w-full text-[10px] font-bold uppercase text-indigo-800 tracking-wide -mb-2">
          {title}
        </div>
      )}
      <div className="summary-item">
        <div className="text-xs text-slate-500 uppercase font-bold summary-label">
          Total Pax
        </div>
        <div className="text-2xl font-bold text-slate-800 summary-value">
          {totals.totalPax}
        </div>
      </div>
      <div className="pl-6 border-l border-slate-200 summary-item summary-divider">
        <div className="text-xs text-slate-500 uppercase font-bold text-slate-600 summary-label">
          Total Noches Bás
        </div>
        <div className="text-2xl font-bold text-slate-600 summary-value text-slate">
          {totals.grandTotalStdNights}
        </div>
      </div>
      <div className="summary-item">
        <div className="text-xs text-slate-500 uppercase font-bold text-amber-700 summary-label">
          Total Noches Sup
        </div>
        <div className="text-2xl font-bold text-amber-600 summary-value text-amber">
          {totals.grandTotalPlusNights}
        </div>
      </div>
      <div className="pl-6 border-l border-slate-200 summary-item summary-divider">
        <div className="text-xs text-slate-500 uppercase font-bold text-indigo-700 summary-label">
          Total Camas
        </div>
        <div className="text-2xl font-bold text-indigo-600 summary-value text-indigo">
          {totals.totalBedNights}
        </div>
      </div>
      {roomsLabel && (
        <div className="summary-item summary-divider">
          <div className="text-xs text-slate-500 uppercase font-bold text-slate-700 summary-label">
            {roomsLabel}
          </div>
          <div className="text-2xl font-bold text-slate-800 summary-value">
            {totals.totalSuggestedRooms}
          </div>
        </div>
      )}
    </div>
  );
}

const InitialOrderReportModal = ({
  roster,
  logisticsMap,
  rooms = [],
  adjustmentsByRange = {},
  onClose,
  programName,
  bookings = [],
  segmentRows = [],
  segments = [],
  cortesCount = 0,
  excludedPersonIds = [],
  selectedTramoIndices = null,
  bedsPerRoom = 2,
}) => {
    const componentRef = useRef();
    const showRoomsColumn = showSuggestedRooms(bedsPerRoom);

    const handlePrint = () => {
        const printContent = componentRef.current;
        if (!printContent) return;
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Pedido Inicial de Alojamiento</title>
                    <style>
                        * { box-sizing: border-box; }
                        body { font-family: 'Segoe UI', sans-serif; padding: 0; margin: 0; font-size: 11px; color: #334155; }
                        .initial-order-print-root { padding: 0; }
                        h1 { font-size: 16px; color: #1e1b4b; border-bottom: 2px solid #1e1b4b; padding-bottom: 4px; margin: 0 0 2px; }
                        h2 { font-size: 11px; margin: 0 0 8px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
                        h3 { font-size: 10px; margin: 6px 0 3px; color: #475569; font-weight: bold; text-transform: uppercase; }
                        .tramo-title { font-size: 10px; font-weight: bold; color: #312e81; border-bottom: 1px solid #c7d2fe; padding-bottom: 2px; margin: 8px 0 4px; }
                        .print-note { display: none; }

                        .summary-box {
                            display: flex;
                            flex-direction: row;
                            flex-wrap: wrap;
                            gap: 14px;
                            padding: 8px 10px;
                            background-color: #f8fafc !important;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            margin-bottom: 8px;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .summary-item { display: flex; flex-direction: column; }
                        .summary-divider { border-left: 1px solid #cbd5e1; padding-left: 12px; }
                        .summary-label {
                            font-size: 8px;
                            text-transform: uppercase;
                            font-weight: bold;
                            color: #64748b;
                            margin-bottom: 2px;
                        }
                        .summary-value { font-size: 14px; font-weight: bold; color: #1e293b; line-height: 1.1; }
                        .text-indigo { color: #4f46e5 !important; }
                        .text-amber { color: #d97706 !important; }
                        .text-slate { color: #475569 !important; }

                        table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9px; table-layout: fixed; }
                        th, td { border: 1px solid #e2e8f0; padding: 3px 4px; text-align: center; overflow: hidden; text-overflow: ellipsis; }
                        th { background-color: #f1f5f9 !important; font-weight: 700; color: #475569; text-transform: uppercase; vertical-align: middle; font-size: 8px; -webkit-print-color-adjust: exact; }
                        td:first-child { text-align: left; }
                        .total-row { background-color: #f8fafc !important; font-weight: bold; color: #0f172a; font-size: 9px; -webkit-print-color-adjust: exact; }
                        .date-col { font-family: 'Consolas', monospace; color: #0f172a; font-weight: 600; text-align: left; white-space: nowrap; font-size: 8px; }
                        .highlight { color: #2563eb; font-weight: bold; }
                        .bg-std { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
                        .bg-plus { background-color: #fff7ed !important; -webkit-print-color-adjust: exact; }
                        .text-std { color: #475569; }
                        .text-plus { color: #b45309; font-weight: bold; }
                        .text-total { color: #4f46e5; font-weight: bold; }
                        .section-tramo-block { page-break-inside: avoid; break-inside: avoid; margin-top: 4px; }
                        .per-tramo-summary { display: none !important; }
                        .grand-summary-footer { display: none !important; }
                        .print-only-top-summary { display: block !important; margin-bottom: 8px; }
                        .desglose-heading { display: none; }
                        .screen-only { display: none !important; }

                        @media print {
                            @page { size: A4 portrait; margin: 8mm; }
                            html, body {
                                width: 100%;
                                height: 100%;
                                margin: 0;
                                padding: 0;
                                overflow: hidden;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .initial-order-print-root {
                                page-break-inside: avoid;
                                break-inside: avoid;
                            }
                            button { display: none !important; }
                        }
                    </style>
                </head>
                <body>${printContent.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();

        const runPrint = () => {
            const doc = printWindow.document;
            const root =
                doc.querySelector(".initial-order-print-root") || doc.body;
            const pageHeightPx = ((297 - 16) * 96) / 25.4;
            const contentHeight = root.scrollHeight;
            if (contentHeight > pageHeightPx) {
                const scale = pageHeightPx / contentHeight;
                root.style.transform = `scale(${scale})`;
                root.style.transformOrigin = "top left";
                root.style.width = `${100 / scale}%`;
                doc.body.style.height = `${Math.ceil(contentHeight * scale)}px`;
                doc.body.style.overflow = "hidden";
            }
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };

        if (printWindow.document.readyState === "complete") {
            setTimeout(runPrint, 50);
        } else {
            printWindow.onload = () => setTimeout(runPrint, 50);
        }
    };

    const reportSections = useMemo(
      () =>
        buildInitialOrderSections({
          roster,
          logisticsMap,
          rooms,
          bookings,
          segmentRows,
          segments,
          cortesCount,
          adjustmentsByRange,
          excludedPersonIds,
          bedsPerRoom,
        }),
      [
        roster,
        logisticsMap,
        rooms,
        adjustmentsByRange,
        segments,
        segmentRows,
        bookings,
        cortesCount,
        excludedPersonIds,
        bedsPerRoom,
      ],
    );

    const effectiveSelectedIndices = useMemo(() => {
      if (Array.isArray(selectedTramoIndices) && selectedTramoIndices.length) {
        return new Set(selectedTramoIndices);
      }
      return new Set(reportSections.map((_, idx) => idx));
    }, [selectedTramoIndices, reportSections.length]);

    const visibleSections = useMemo(
      () =>
        reportSections.filter((_, idx) => effectiveSelectedIndices.has(idx)),
      [reportSections, effectiveSelectedIndices],
    );

    /** Varios tramos visibles → layout multi; uno solo → como pedido clásico. */
    const showMultiLayout = visibleSections.length > 1;

    const displayTotals = useMemo(() => {
      if (visibleSections.length === 1) return visibleSections[0];
      return sumSectionTotals(visibleSections);
    }, [visibleSections]);

    const grandTotals = useMemo(
      () => sumSectionTotals(visibleSections),
      [visibleSections],
    );

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <IconFileText size={20} className="text-emerald-600"/> Pedido Inicial de Alojamiento
                    </h3>
                    <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handlePrint}
                          disabled={visibleSections.length === 0}
                          className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <IconPrinter size={16}/> Imprimir
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                            <IconX size={24}/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 bg-white" ref={componentRef}>
                    <div className="initial-order-print-root">
                    <h1 style={{margin:0}}>Pedido de Plazas</h1>
                    {programName && <h2>{programName}</h2>}

                    {showMultiLayout && (
                      <div
                        className="print-only-top-summary"
                        style={{ display: "none" }}
                      >
                        <SectionSummaryBox
                          title={`Total general (${visibleSections.length} tramos)`}
                          totals={grandTotals}
                          bedsPerRoom={bedsPerRoom}
                        />
                      </div>
                    )}

                    {!showMultiLayout && visibleSections.length > 0 && (
                      <SectionSummaryBox totals={displayTotals} bedsPerRoom={bedsPerRoom} />
                    )}

                    {visibleSections.length === 0 && (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        Seleccioná al menos un tramo para ver el pedido.
                      </p>
                    )}

                    {visibleSections.map((section, visIdx) => (
                      <div
                        key={section.segmentId ?? section.title ?? visIdx}
                        className={`section-tramo-block${visIdx > 0 ? " mt-8" : ""}`}
                      >
                        {showMultiLayout && section.title && (
                          <div className="tramo-title mb-3 text-sm font-bold text-indigo-900 border-b border-indigo-200 pb-1">
                            {section.title}
                          </div>
                        )}
                        {showMultiLayout && section.sortedGroups.length > 0 && (
                          <SectionSummaryBox
                            className="per-tramo-summary"
                            title={`Resumen · ${section.title ?? "Gira"}`}
                            totals={section}
                            bedsPerRoom={bedsPerRoom}
                          />
                        )}
                        <h3 className="desglose-heading">Desglose por Fechas y Categoría</h3>
                        <p className="print-note text-[10px] text-slate-400 mb-2 italic">
                          * Referencia: (Pax × Noches) = Total Camas Noche
                        </p>

                        <table>
                          <thead>
                            <tr>
                              <th style={{width: '22%'}}>Fecha In / Out</th>
                              <th style={{width: '7%'}}>Noches</th>
                              <th style={{width: '8%'}}>Total Pax</th>
                              <th className="bg-std text-std" style={{width: '8%'}}>Pax Bás</th>
                              <th className="bg-std text-std" style={{width: '9%'}}>Camas Bás</th>
                              <th className="bg-plus text-plus" style={{width: '8%'}}>Pax Sup</th>
                              <th className="bg-plus text-plus" style={{width: '9%'}}>Camas Sup</th>
                              <th style={{width: '10%'}}>Total Camas</th>
                              {showRoomsColumn && (
                                <th style={{width: '11%'}}>Habs Sugeridas</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {section.computedRows.map((row, idx) => {
                              const { group, stdPax, plusPax, totalRowPax, stdNights, plusNights, totalRowNights, suggestedRooms } = row;
                              return (
                                <tr key={idx}>
                                  <td className="date-col">{group.rangeLabel}</td>
                                  <td className="highlight">{group.nights}</td>
                                  <td>{totalRowPax}</td>
                                  <td className="bg-std">{stdPax > 0 ? stdPax : '-'}</td>
                                  <td className="bg-std font-bold">{stdNights > 0 ? stdNights : '-'}</td>
                                  <td className="bg-plus">{plusPax > 0 ? plusPax : '-'}</td>
                                  <td className="bg-plus font-bold text-plus">{plusNights > 0 ? plusNights : '-'}</td>
                                  <td className="text-total">{totalRowNights}</td>
                                  {showRoomsColumn && <td>{suggestedRooms}</td>}
                                </tr>
                              );
                            })}
                            {section.sortedGroups.length === 0 && (
                              <tr>
                                <td colSpan={showRoomsColumn ? 9 : 8} style={{textAlign:'center', color: '#94a3b8', padding: '20px'}}>
                                  No hay requerimientos en este tramo.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {section.sortedGroups.length > 0 && (
                            <tfoot>
                              <tr className="total-row">
                                <td style={{textAlign:'right'}}>TOTALES</td>
                                <td></td>
                                <td>{section.totalPax}</td>
                                <td className="bg-std">{section.totalStdPax}</td>
                                <td className="bg-std">{section.grandTotalStdNights}</td>
                                <td className="bg-plus">{section.totalPlusPax}</td>
                                <td className="bg-plus">{section.grandTotalPlusNights}</td>
                                <td className="text-total">{section.totalBedNights}</td>
                                {showRoomsColumn && (
                                  <td>{section.totalSuggestedRooms}</td>
                                )}
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    ))}

                    {showMultiLayout && (
                      <div className="grand-summary-footer mt-8 pt-6 border-t border-slate-200">
                        <SectionSummaryBox
                          title={`Total general (${visibleSections.length} tramos)`}
                          totals={grandTotals}
                          bedsPerRoom={bedsPerRoom}
                        />
                      </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InitialOrderReportModal;