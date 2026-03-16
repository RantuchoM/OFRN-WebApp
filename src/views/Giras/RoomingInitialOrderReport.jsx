import React, { useRef } from "react";
import { IconFileText, IconPrinter, IconX } from "../../components/ui/Icons";
import { differenceInCalendarDays } from "date-fns";

// Helper compatible con objetos de evento y strings simples
const getLogisticsDates = (log) => {
  let dateIn = null;
  let dateOut = null;

  // Check-In
  if (log?.checkin) {
    let dStr;
    let tStr;
    if (typeof log.checkin === "object") {
      // Prioridad: campos de evento ({ fecha, hora_inicio }) y alias ({ date, time, hora })
      dStr = log.checkin.fecha || log.checkin.date;
      tStr =
        log.checkin.hora_inicio ||
        log.checkin.hora ||
        log.checkin.time ||
        log.checkin_time ||
        "14:00";
    } else {
      // Fallback: string plano + hora opcional en la raíz
      dStr = log.checkin;
      tStr = log.checkin_time || "14:00";
    }
    if (dStr) {
      const safeTime = (tStr || "14:00").slice(0, 5);
      dateIn = new Date(`${dStr}T${safeTime}`);
    }
  }

  // Check-Out
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

const InitialOrderReportModal = ({
  roster,
  logisticsMap,
  rooms = [],
  adjustmentsByRange = {},
  onClose,
  programName,
}) => {
    const componentRef = useRef();

    const handlePrint = () => {
        const printContent = componentRef.current;
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Pedido Inicial de Alojamiento</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; padding: 20px; font-size: 12px; color: #334155; }
                        h1 { font-size: 20px; color: #1e1b4b; border-bottom: 2px solid #1e1b4b; padding-bottom: 10px; margin-bottom: 5px; }
                        h2 { font-size: 14px; margin-top: 0; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; }
                        
                        /* ESTILOS PARA EL CUADRO DE RESUMEN EN PDF */
                        .summary-box {
                            display: flex; /* Para ponerlos uno al lado del otro */
                            flex-direction: row;
                            gap: 30px;
                            padding: 15px;
                            background-color: #f8fafc !important; /* bg-slate-50 */
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            margin-bottom: 20px;
                            -webkit-print-color-adjust: exact; /* Forzar impresión de fondo */
                            print-color-adjust: exact;
                        }
                        .summary-item {
                            display: flex;
                            flex-direction: column;
                        }
                        .summary-divider {
                            border-left: 1px solid #cbd5e1;
                            padding-left: 20px;
                        }
                        .summary-label {
                            font-size: 10px;
                            text-transform: uppercase;
                            font-weight: bold;
                            color: #64748b;
                            margin-bottom: 4px;
                        }
                        .summary-value {
                            font-size: 20px;
                            font-weight: bold;
                            color: #1e293b;
                        }
                        .text-indigo { color: #4f46e5 !important; }
                        .text-amber { color: #d97706 !important; }
                        .text-slate { color: #475569 !important; }

                        /* TABLAS */
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
                        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center; }
                        th { background-color: #f1f5f9 !important; font-weight: 700; color: #475569; text-transform: uppercase; vertical-align: middle; -webkit-print-color-adjust: exact; }
                        td:first-child { text-align: left; }
                        
                        .total-row { background-color: #f8fafc !important; font-weight: bold; color: #0f172a; font-size: 12px; -webkit-print-color-adjust: exact; }
                        .date-col { font-family: 'Consolas', monospace; color: #0f172a; font-weight: 600; text-align: left; white-space: nowrap;}
                        .highlight { color: #2563eb; font-weight: bold; }
                        
                        .bg-std { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
                        .bg-plus { background-color: #fff7ed !important; -webkit-print-color-adjust: exact; }
                        .text-std { color: #475569; }
                        .text-plus { color: #b45309; font-weight: bold; }
                        .text-total { color: #4f46e5; font-weight: bold; font-size: 1.1em; }

                        @media print {
                            @page { margin: 10mm; }
                            body { -webkit-print-color-adjust: exact; }
                            button { display: none !important; }
                        }
                    </style>
                </head>
                <body>${printContent.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const isPersonInPlus = (personId) => {
        if (!rooms || rooms.length === 0) return false;
        return rooms.some((r) => {
            if (r.tipo !== "Plus") return false;
            const cfg = Array.isArray(r.asignaciones_config)
                ? r.asignaciones_config
                : [];
            // Consideramos "Plus" solo si ocupa cama en una habitación Plus
            return cfg.some(
                (c) => c && c.id === personId && c.ocupa_cama !== false,
            );
        });
    };

    const dateGroups = {};

    roster.forEach((person) => {
        const log = logisticsMap[person.id];
        if (!log) return;

        // Resolver fechas y horas desde objetos de evento o strings manuales
        const { dateIn: dIn, dateOut: dOut } = getLogisticsDates(log);
        if (!dIn || !dOut) return;

        if (isNaN(dIn.getTime()) || isNaN(dOut.getTime())) return;

        const nights = differenceInCalendarDays(dOut, dIn);
        if (nights <= 0) return; 

        const formatD = (d) => d.toLocaleDateString("es-AR", {day:"2-digit", month:"2-digit"});
        const formatT = (d) => d.toLocaleTimeString("es-AR", {hour:"2-digit", minute:"2-digit"});

        const key = `${formatD(dIn)} ${formatT(dIn)} - ${formatD(dOut)} ${formatT(dOut)}`;
        
        if (!dateGroups[key]) {
            dateGroups[key] = {
                rangeLabel: key,
                checkIn: dIn,
                checkOut: dOut,
                nights: nights,
                baseCount: 0,
                baseStd: 0,
                basePlus: 0,
                baseM: 0,
                baseF: 0
            };
        }
        
        const group = dateGroups[key];
        group.baseCount++;
        if (isPersonInPlus(person.id)) {
            group.basePlus++;
        } else {
            group.baseStd++;
        }
        const isFemale = person.genero === "F";
        if (isFemale) group.baseF++;
        else group.baseM++;
    });

    const sortedGroups = Object.values(dateGroups).sort(
      (a, b) => a.checkIn - b.checkIn,
    );

    const computedRows = sortedGroups.map((group) => {
      const adj = adjustmentsByRange[group.rangeLabel] || {};
      const extraStd = (adj.std_m || 0) + (adj.std_f || 0);
      const extraPlus = (adj.plus_m || 0) + (adj.plus_f || 0);
      const stdPax = group.baseStd + extraStd;
      const plusPax = group.basePlus + extraPlus;
      const totalRowPax = stdPax + plusPax;
      const stdNights = stdPax * group.nights;
      const plusNights = plusPax * group.nights;
      const totalRowNights = totalRowPax * group.nights;

      const totalF = group.baseF + (adj.std_f || 0) + (adj.plus_f || 0);
      const totalM = group.baseM + (adj.std_m || 0) + (adj.plus_m || 0);
      const roomsF = Math.ceil(totalF / 2);
      const roomsM = Math.ceil(totalM / 2);
      const suggestedRooms = roomsF + roomsM;

      return {
        group,
        stdPax,
        plusPax,
        totalRowPax,
        stdNights,
        plusNights,
        totalRowNights,
        suggestedRooms,
      };
    });

    const totalPax = computedRows.reduce(
      (acc, row) => acc + row.totalRowPax,
      0,
    );
    const totalBedNights = computedRows.reduce(
      (acc, row) => acc + row.totalRowNights,
      0,
    );
    const grandTotalStdNights = computedRows.reduce(
      (acc, row) => acc + row.stdNights,
      0,
    );
    const grandTotalPlusNights = computedRows.reduce(
      (acc, row) => acc + row.plusNights,
      0,
    );
    const totalStdPax = computedRows.reduce((acc, row) => acc + row.stdPax, 0);
    const totalPlusPax = computedRows.reduce(
      (acc, row) => acc + row.plusPax,
      0,
    );
    const totalSuggestedRooms = computedRows.reduce(
      (acc, row) => acc + row.suggestedRooms,
      0,
    );

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <IconFileText size={20} className="text-emerald-600"/> Pedido Inicial de Alojamiento
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                            <IconPrinter size={16}/> Imprimir
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                            <IconX size={24}/>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-8 bg-white" ref={componentRef}>
                    <h1 style={{margin:0}}>Pedido de Plazas</h1>
                    {programName && <h2>{programName}</h2>}

                    {/* CUADRO DE RESUMEN CON CLASES PARA IMPRESIÓN */}
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex gap-8 summary-box">
                        <div className="summary-item">
                            <div className="text-xs text-slate-500 uppercase font-bold summary-label">Total Pax Únicos</div>
                            <div className="text-2xl font-bold text-slate-800 summary-value">{totalPax}</div>
                        </div>
                        <div className="pl-6 border-l border-slate-200 summary-item summary-divider">
                            <div className="text-xs text-slate-500 uppercase font-bold text-slate-600 summary-label">Total Noches Std</div>
                            <div className="text-2xl font-bold text-slate-600 summary-value text-slate">{grandTotalStdNights}</div>
                        </div>
                        <div className="summary-item">
                            <div className="text-xs text-slate-500 uppercase font-bold text-amber-700 summary-label">Total Noches Plus</div>
                            <div className="text-2xl font-bold text-amber-600 summary-value text-amber">{grandTotalPlusNights}</div>
                        </div>
                        <div className="pl-6 border-l border-slate-200 summary-item summary-divider">
                            <div className="text-xs text-slate-500 uppercase font-bold text-indigo-700 summary-label">Total General</div>
                            <div className="text-2xl font-bold text-indigo-600 summary-value text-indigo">{totalBedNights}</div>
                        </div>
                        <div className="summary-item summary-divider">
                            <div className="text-xs text-slate-500 uppercase font-bold text-slate-700 summary-label">Habs Sugeridas (DOBLE)</div>
                            <div className="text-2xl font-bold text-slate-800 summary-value">{totalSuggestedRooms}</div>
                        </div>
                    </div>

                    <h3>Desglose por Fechas y Categoría</h3>
                    <p className="text-[10px] text-slate-400 mb-2 italic">
                        * Referencia: (Pax × Noches) = Total Camas Noche
                    </p>

                    <table>
                        <thead>
                            <tr>
                                <th>Fecha In / Out</th>
                                <th style={{width: '60px'}}>Noches</th>
                                <th style={{width: '60px'}}>Total Pax</th>
                                <th className="bg-std text-std" style={{width: '60px'}}>Pax Std</th>
                                <th className="bg-std text-std" style={{width: '80px'}}>Camas Std</th>
                                <th className="bg-plus text-plus" style={{width: '60px'}}>Pax Plus</th>
                                <th className="bg-plus text-plus" style={{width: '80px'}}>Camas Plus</th>
                                <th style={{width: '100px'}}>Total Camas</th>
                                <th style={{width: '110px'}}>Habs Sugeridas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {computedRows.map((row, idx) => {
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
                                        <td>{suggestedRooms}</td>
                                    </tr>
                                );
                            })}
                            {sortedGroups.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{textAlign:'center', color: '#94a3b8', padding: '20px'}}>
                                        No hay requerimientos definidos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {sortedGroups.length > 0 && (
                            <tfoot>
                                <tr className="total-row">
                                    <td style={{textAlign:'right'}}>TOTALES</td>
                                    <td></td>
                                    <td>{totalPax}</td>
                                    <td className="bg-std">{totalStdPax}</td>
                                    <td className="bg-std">{grandTotalStdNights}</td>
                                    <td className="bg-plus">{totalPlusPax}</td>
                                    <td className="bg-plus">{grandTotalPlusNights}</td>
                                    <td className="text-total">{totalBedNights}</td>
                                    <td>{totalSuggestedRooms}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InitialOrderReportModal;