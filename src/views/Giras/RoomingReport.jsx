import React, { useRef } from "react";
import { IconFileText, IconPrinter, IconX } from "../../components/ui/Icons";

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
                        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; } /* Vertical align top para renglones */
                        th { background-color: #e2e8f0; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 10px; vertical-align: middle; }
                        
                        /* Tabla Resumen */
                        .summary-table th { background-color: #dbeafe; color: #1e3a8a; text-align: center; }
                        .summary-table td.center { text-align: center; vertical-align: middle; }
                        .summary-table .total-row { background-color: #f8fafc; font-weight: bold; }
                        
                        /* Tabla Detalle */
                        .date-col { white-space: nowrap; font-family: 'Consolas', monospace; font-size: 11px; vertical-align: middle; }
                        .center { text-align: center; vertical-align: middle; }
                        .group-header { background-color: #f8fafc; }
                        
                        /* Estilos para renglones de habitación */
                        .room-type { font-weight: 700; color: #334155; }
                        .room-extra { font-size: 10px; color: #64748b; margin-top: 2px; }
                        .room-note { font-size: 10px; font-style: italic; color: #94a3b8; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 2px; }
                        
                        .text-muted { color: #94a3b8; font-size: 10px; }
                        
                        @media print {
                            @page { margin: 10mm; size: auto; }
                            body { padding: 0; -webkit-print-color-adjust: exact; }
                            .no-break { page-break-inside: avoid; }
                            h2 { page-break-after: avoid; }
                            thead { display: table-header-group; }
                            tr { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
             printWindow.print();
             printWindow.close();
        }, 500);
    };

    const formatDate = (d) => d ? d.toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'}) : '-';
    const formatTime = (d) => d ? d.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}) : '';
    const formatDOB = (isoString) => isoString ? isoString.split('-').reverse().join('/') : '-';

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

                        // --- 1. PROCESAMIENTO DE DATOS ---
                        const processedRooms = hotelRooms.map(r => {
                            // Enriquecer ocupantes con fechas y ordenarlos
                            const occupantsWithDates = r.occupants.map(occ => {
                                const log = logisticsMap[occ.id] || {};
                                return {
                                    ...occ,
                                    dateIn: log.checkin ? new Date(log.checkin + 'T' + (log.checkin_time || '14:00')) : null,
                                    dateOut: log.checkout ? new Date(log.checkout + 'T' + (log.checkout_time || '10:00')) : null,
                                };
                            });
                            
                            // Ordenar ocupantes: primero el que llega antes
                            occupantsWithDates.sort((a, b) => {
                                if(!a.dateIn) return 1; if(!b.dateIn) return -1;
                                return a.dateIn - b.dateIn;
                            });

                            const effectiveCheckIn = occupantsWithDates.length > 0 && occupantsWithDates[0].dateIn ? occupantsWithDates[0].dateIn : null;

                            // Clasificación y Textos
                            const count = r.occupants.length;
                            let capacityType = count === 1 ? 'Simple' : count === 2 ? 'Doble' : count === 3 ? 'Triple' : count === 4 ? 'Cuádruple' : count > 4 ? 'Múltiple' : 'Vacía';
                            const isPlus = r.tipo === 'Plus';
                            const isMatri = r.es_matrimonial;
                            const hasCuna = r.con_cuna;

                            const typeMain = `${capacityType} ${isPlus ? 'Plus' : 'Std'}`;
                            const typeExtras = [];
                            if(isMatri) typeExtras.push("Matrimonial");
                            if(hasCuna) typeExtras.push("Cuna");

                            return { 
                                ...r, 
                                occupants: occupantsWithDates, 
                                effectiveCheckIn,
                                capacityType, isPlus, isMatri, hasCuna, 
                                typeMain, typeExtras
                            };
                        });

                        // Ordenar habitaciones por fecha del primer check-in
                        processedRooms.sort((a, b) => {
                             if(!a.effectiveCheckIn) return 1;
                             if(!b.effectiveCheckIn) return -1;
                             return a.effectiveCheckIn - b.effectiveCheckIn;
                        });

                        // --- 2. CÁLCULO DE ESTADÍSTICAS ---
                        const stats = {
                            'Simple': { total: 0, std: 0, plus: 0, matri: 0, cuna: 0 },
                            'Doble': { total: 0, std: 0, plus: 0, matri: 0, cuna: 0 },
                            'Triple': { total: 0, std: 0, plus: 0, matri: 0, cuna: 0 },
                            'Cuádruple': { total: 0, std: 0, plus: 0, matri: 0, cuna: 0 },
                            'Múltiple': { total: 0, std: 0, plus: 0, matri: 0, cuna: 0 },
                        };

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

                        return (
                            <div key={bk.id} className="mb-8 no-break">
                                <h2>🏨 {bk.hoteles?.nombre || 'Hotel sin nombre'} <span style={{fontWeight:'normal', fontSize:'0.8em'}}>({bk.hoteles?.localidades?.localidad})</span></h2>
                                
                                {/* TABLA RESUMEN */}
                                <div className="mb-6 no-break">
                                    <h3>Resumen de Habitaciones</h3>
                                    <table className="summary-table" style={{width: 'auto', minWidth: '50%'}}>
                                        <thead>
                                            <tr>
                                                <th style={{textAlign:'left'}}>Tipo</th>
                                                <th>Total</th>
                                                <th>Estándar</th>
                                                <th>Plus</th>
                                                <th>Matrimonial</th>
                                                <th>Con Cuna</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeCategories.map(([type, data]) => (
                                                <tr key={type}>
                                                    <td>{type}</td>
                                                    <td className="center" style={{fontWeight:'bold'}}>{data.total}</td>
                                                    <td className="center text-muted">{data.std || '-'}</td>
                                                    <td className="center text-muted">{data.plus || '-'}</td>
                                                    <td className="center text-muted">{data.matri || '-'}</td>
                                                    <td className="center text-muted">{data.cuna || '-'}</td>
                                                </tr>
                                            ))}
                                            <tr className="total-row" style={{borderTop:'2px solid #cbd5e1'}}>
                                                <td>TOTAL GENERAL</td>
                                                <td className="center">{grandTotal('total')}</td>
                                                <td className="center">{grandTotal('std')}</td>
                                                <td className="center">{grandTotal('plus')}</td>
                                                <td className="center">{grandTotal('matri')}</td>
                                                <td className="center">{grandTotal('cuna')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* TABLA DETALLE */}
                                <h3>Lista de Pasajeros (Ordenado por Check-In)</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{width: '30px'}} className="center">#</th>
                                            <th style={{width: '140px'}}>Detalle Habitación</th>
                                            <th>Apellido y Nombre</th>
                                            <th style={{width: '70px'}}>DNI</th>
                                            <th style={{width: '70px'}}>F. Nac</th>
                                            <th style={{width: '85px'}}>Check In</th>
                                            <th style={{width: '85px'}}>Check Out</th>
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
                                                                    <td rowSpan={rowSpan} className="center group-header">{idx + 1}</td>
                                                                    <td rowSpan={rowSpan} className="group-header">
                                                                        <div className="room-type">{r.typeMain}</div>
                                                                        {r.typeExtras.map(extra => (
                                                                            <div key={extra} className="room-extra">+ {extra}</div>
                                                                        ))}
                                                                        {r.notas_internas && <div className="room-note">Nota: {r.notas_internas}</div>}
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td style={{verticalAlign: 'middle'}}><b>{occ.apellido}</b>, {occ.nombre}</td>
                                                            <td className="date-col">{occ.dni || '-'}</td>
                                                            <td className="date-col">{formatDOB(occ.fecha_nac)}</td>
                                                            <td className="date-col">
                                                                {formatDate(occ.dateIn)} <span className="text-muted" style={{marginLeft:'2px'}}>{formatTime(occ.dateIn)}</span>
                                                            </td>
                                                            <td className="date-col">
                                                                {formatDate(occ.dateOut)} <span className="text-muted" style={{marginLeft:'2px'}}>{formatTime(occ.dateOut)}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {occupants.length === 0 && (
                                                        <tr>
                                                            <td className="center group-header"><b>{idx + 1}</b></td>
                                                            <td className="group-header">
                                                                <div className="room-type">{r.typeMain}</div>
                                                                {r.typeExtras.map(extra => <div key={extra} className="room-extra">+ {extra}</div>)}
                                                            </td>
                                                            <td colSpan="5" style={{color:'#cbd5e1', fontStyle:'italic', verticalAlign:'middle'}}>Sin asignar</td>
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
            </div>
        </div>
    );
};

export default RoomingReportModal;