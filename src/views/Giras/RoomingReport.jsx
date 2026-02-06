// src/views/Giras/RoomingReport.jsx
import React, { useRef } from "react";
import { IconFileText, IconPrinter, IconX } from "../../components/ui/Icons";
import { differenceInCalendarDays } from "date-fns";

const RoomingReportModal = ({ bookings, rooms, onClose, logisticsMap }) => {
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
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    const formatDate = (d) => d ? d.toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'}) : '-';
    const formatTime = (d) => d ? d.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}) : '';
    const formatDOB = (isoString) => isoString ? isoString.split('-').reverse().join('/') : '-';
    const getEmptyStats = () => ({ total: 0, std: 0, plus: 0, matri: 0, cuna: 0 });

    // --- HELPER ACTUALIZADO PARA CAMPOS DE BD ---
    const getLogisticsDates = (log) => {
        let dateIn = null;
        let dateOut = null;

        // Check-In
        if (log?.checkin) {
            let dStr, tStr;
            if (typeof log.checkin === 'object') {
                // Prioridad: Campos BD (fecha, hora_inicio) -> Alias (date, time, hora)
                dStr = log.checkin.fecha || log.checkin.date;
                tStr = log.checkin.hora_inicio || log.checkin.hora || log.checkin.time || '14:00';
            } else {
                // Fallback string simple
                dStr = log.checkin;
                tStr = log.checkin_time || '14:00';
            }
            // Slice(0,5) asegura formato HH:MM si viene HH:MM:SS
            if (dStr) dateIn = new Date(`${dStr}T${tStr.slice(0, 5)}`);
        }

        // Check-Out
        if (log?.checkout) {
            let dStr, tStr;
            if (typeof log.checkout === 'object') {
                dStr = log.checkout.fecha || log.checkout.date;
                tStr = log.checkout.hora_inicio || log.checkout.hora || log.checkout.time || '10:00';
            } else {
                dStr = log.checkout;
                tStr = log.checkout_time || '10:00';
            }
            if (dStr) dateOut = new Date(`${dStr}T${tStr.slice(0, 5)}`);
        }

        return { dateIn, dateOut };
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><IconFileText size={20} className="text-indigo-600"/> Reporte de Rooming por Hotel</h3>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"><IconPrinter size={16}/> Imprimir / PDF</button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><IconX size={24}/></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-8 bg-white" ref={componentRef}>
                    <h1 className="mb-4">Listado de Distribución de Habitaciones</h1>
                    {bookings.map(bk => {
                        const hotelRooms = rooms.filter(r => r.id_hospedaje === bk.id);
                        if (hotelRooms.length === 0) return null;

                        const processedRooms = hotelRooms.map(r => {
                            const occupantsWithDates = r.occupants.map(occ => {
                                const log = logisticsMap[occ.id] || {};
                                const { dateIn, dateOut } = getLogisticsDates(log);
                                return {
                                    ...occ,
                                    dateIn,
                                    dateOut,
                                };
                            });
                            
                            occupantsWithDates.sort((a, b) => {
                                if(!a.dateIn) return 1; if(!b.dateIn) return -1;
                                return a.dateIn - b.dateIn;
                            });

                            const effectiveCheckIn = occupantsWithDates.length > 0 && occupantsWithDates[0].dateIn ? occupantsWithDates[0].dateIn : null;
                            const sortedByOut = [...occupantsWithDates].sort((a, b) => {
                                if(!a.dateOut) return 1; if(!b.dateOut) return -1;
                                return b.dateOut - a.dateOut;
                            });
                            const effectiveCheckOut = sortedByOut.length > 0 && sortedByOut[0].dateOut ? sortedByOut[0].dateOut : null;

                            const count = r.occupants.length;
                            let capacityType = count === 1 ? 'Simple' : count === 2 ? 'Doble' : count === 3 ? 'Triple' : count === 4 ? 'Cuádruple' : count > 4 ? 'Múltiple' : 'Vacía';
                            const isPlus = r.tipo === 'Plus';
                            const isMatri = r.es_matrimonial;
                            const hasCuna = r.con_cuna;

                            return { 
                                ...r, occupants: occupantsWithDates, effectiveCheckIn, effectiveCheckOut,
                                capacityType, isPlus, isMatri, hasCuna, 
                                typeMain: `${capacityType} ${isPlus ? 'Plus' : 'estándar'}`,
                                typeMainCapital: `${capacityType} ${isPlus ? 'Plus' : 'Estándar'}`,
                                typeExtras: [isMatri && "Matrimonial", hasCuna && "Cuna"].filter(Boolean)
                            };
                        });

                        processedRooms.sort((a, b) => {
                             if(!a.effectiveCheckIn) return 1;
                             if(!b.effectiveCheckIn) return -1;
                             return a.effectiveCheckIn - b.effectiveCheckIn;
                        });

                        let totalBedNights = 0;
                        processedRooms.forEach(room => {
                            room.occupants.forEach(occ => {
                                if (occ.dateIn && occ.dateOut) {
                                    const nights = differenceInCalendarDays(occ.dateOut, occ.dateIn);
                                    if (nights > 0) totalBedNights += nights;
                                }
                            });
                        });

                        const stats = { 'Simple': getEmptyStats(), 'Doble': getEmptyStats(), 'Triple': getEmptyStats(), 'Cuádruple': getEmptyStats(), 'Múltiple': getEmptyStats() };
                        processedRooms.forEach(r => {
                            if (stats[r.capacityType]) {
                                stats[r.capacityType].total++;
                                if (r.isPlus) stats[r.capacityType].plus++; else stats[r.capacityType].std++;
                                if (r.isMatri) stats[r.capacityType].matri++;
                                if (r.hasCuna) stats[r.capacityType].cuna++;
                            }
                        });
                        const activeCategories = Object.entries(stats).filter(([_, data]) => data.total > 0);
                        const grandTotal = (key) => activeCategories.reduce((acc, [_, data]) => acc + data[key], 0);

                        const dateGroups = {};
                        processedRooms.forEach(r => {
                            if(!r.effectiveCheckIn || !r.effectiveCheckOut) return;
                            const dateKey = `${formatDate(r.effectiveCheckIn)} al ${formatDate(r.effectiveCheckOut)}`;
                            if (!dateGroups[dateKey]) dateGroups[dateKey] = {};
                            const capLower = r.capacityType.toLowerCase();
                            const capPlural = capLower.endsWith('e') ? capLower + 's' : capLower + 'es'; 
                            let baseDesc = `${capPlural} ${r.isPlus ? 'plus' : 'estándar'}`;
                            if (r.isMatri) baseDesc += ' matrimonial';
                            if (r.hasCuna) baseDesc += ' c/cuna';
                            if (!dateGroups[dateKey][baseDesc]) dateGroups[dateKey][baseDesc] = 0;
                            dateGroups[dateKey][baseDesc]++;
                        });

                        const sortedDateKeys = Object.keys(dateGroups).sort((a, b) => {
                            const parseD = (str) => { const [d, m] = str.split(' al ')[0].split('/'); return parseInt(m) * 100 + parseInt(d); };
                            return parseD(a) - parseD(b);
                        });

                        return (
                            <div key={bk.id} className="mb-8 no-break">
                                <h2>🏨 {bk.hoteles?.nombre || 'Hotel sin nombre'} <span style={{fontWeight:'normal', fontSize:'0.8em'}}>({bk.hoteles?.localidades?.localidad})</span></h2>
                                <div className="mb-6 no-break">
                                    <h3>Resumen General de Habitaciones</h3>
                                    <table className="summary-table" style={{width: 'auto', minWidth: '50%'}}>
                                        <thead><tr><th style={{textAlign:'left'}}>Tipo</th><th>Total</th><th>Estándar</th><th>Plus</th><th>Matrimonial</th><th>Con Cuna</th></tr></thead>
                                        <tbody>
                                            {activeCategories.map(([type, data]) => (
                                                <tr key={type}><td>{type}</td><td className="center" style={{fontWeight:'bold'}}>{data.total}</td><td className="center text-muted">{data.std || '-'}</td><td className="center text-muted">{data.plus || '-'}</td><td className="center text-muted">{data.matri || '-'}</td><td className="center text-muted">{data.cuna || '-'}</td></tr>
                                            ))}
                                            <tr className="total-row" style={{borderTop:'2px solid #cbd5e1'}}><td>TOTAL GENERAL</td><td className="center">{grandTotal('total')}</td><td className="center">{grandTotal('std')}</td><td className="center">{grandTotal('plus')}</td><td className="center">{grandTotal('matri')}</td><td className="center">{grandTotal('cuna')}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mb-6 no-break">
                                    <h3>Desglose por Rango de Fechas</h3>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                        {sortedDateKeys.map(dateRange => (
                                            <div key={dateRange} className="date-group"><div className="date-header">{dateRange}</div><ul className="room-list">{Object.entries(dateGroups[dateRange]).map(([desc, count]) => (<li key={desc}><b>{count}</b> {desc}</li>))}</ul></div>
                                        ))}
                                        <div style={{marginTop: '15px', borderTop: '2px solid #cbd5e1', paddingTop: '10px', textAlign: 'right', color:'#b45309', fontWeight: 'bold'}}>Cantidad total de camas (noches): <span style={{fontSize:'14px', marginLeft:'5px'}}>{totalBedNights}</span></div>
                                    </div>
                                </div>
                                <div className="page-break"></div>
                                <h3>Lista de Pasajeros (Ordenado por Check-In)</h3>
                                <table>
                                    <thead><tr><th style={{width: '30px'}} className="center">#</th><th style={{width: '180px'}}>Detalle Habitación</th><th>Apellido y Nombre</th><th style={{width: '70px'}}>DNI</th><th style={{width: '70px'}}>F. Nac</th><th style={{width: '85px'}}>Check In</th><th style={{width: '85px'}}>Check Out</th></tr></thead>
                                    <tbody>
                                        {processedRooms.map((r, idx) => {
                                            const occupants = r.occupants; const rowSpan = occupants.length || 1;
                                            return (
                                                <React.Fragment key={r.id}>
                                                    {occupants.map((occ, i) => (
                                                        <tr key={occ.id}>
                                                            {i === 0 && (<><td rowSpan={rowSpan} className="center group-header">{idx + 1}</td><td rowSpan={rowSpan} className="group-header"><div className="room-type">{r.typeMainCapital}</div>{r.typeExtras.map(extra => <div key={extra} className="room-extra">+ {extra}</div>)}{r.notas_internas && <div className="room-note">Nota: {r.notas_internas}</div>}<div className="room-dates"><div>In: {formatDate(r.effectiveCheckIn)} {formatTime(r.effectiveCheckIn)}</div><div>Out: {formatDate(r.effectiveCheckOut)} {formatTime(r.effectiveCheckOut)}</div></div></td></>)}
                                                            <td style={{verticalAlign: 'middle'}}><b>{occ.apellido}</b>, {occ.nombre}</td><td className="date-col">{occ.dni || '-'}</td><td className="date-col">{formatDOB(occ.fecha_nac)}</td><td className="date-col">{formatDate(occ.dateIn)} <span className="text-muted" style={{marginLeft:'2px'}}>{formatTime(occ.dateIn)}</span></td><td className="date-col">{formatDate(occ.dateOut)} <span className="text-muted" style={{marginLeft:'2px'}}>{formatTime(occ.dateOut)}</span></td>
                                                        </tr>
                                                    ))}
                                                    {occupants.length === 0 && (<tr><td className="center group-header"><b>{idx + 1}</b></td><td className="group-header"><div className="room-type">{r.typeMainCapital}</div>{r.typeExtras.map(extra => <div key={extra} className="room-extra">+ {extra}</div>)}</td><td colSpan="5" style={{color:'#cbd5e1', fontStyle:'italic', verticalAlign:'middle'}}>Sin asignar</td></tr>)}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RoomingReportModal;