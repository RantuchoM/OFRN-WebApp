import React, { useState, useEffect, useMemo } from "react";
import { IconLoader, IconPrinter } from "../../components/ui/Icons";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const SERVICE_IDS = {
    7: "Desayuno",
    8: "Almuerzo",
    9: "Merienda",
    10: "Cena"
};

export default function MealsReport({ supabase, gira, roster }) {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    
    // Filtros
    const [selectedTypes, setSelectedTypes] = useState(new Set(["Desayuno", "Almuerzo", "Merienda", "Cena"]));

    useEffect(() => {
        if(gira?.id) fetchReportData();
    }, [gira?.id]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // 1. Eventos
            const { data: events } = await supabase
                .from("eventos")
                .select("*, tipos_evento(nombre), locaciones(nombre)")
                .eq("id_gira", gira.id)
                .in("id_tipo_evento", [7, 8, 9, 10])
                .order("fecha", { ascending: true })
                .order("hora_inicio", { ascending: true });

            // 2. Asistencias (Solo los 'P'resentes)
            const { data: attendance } = await supabase
                .from("eventos_asistencia")
                .select("id_evento, id_integrante")
                .eq("estado", "P")
                .in("id_evento", events.map(e => e.id));

            // 3. Crear Mapa de Dietas del Roster para acceso rápido
            const dietMap = {};
            roster.forEach(p => {
                // Usamos la columna 'alimentacion' que confirmamos existe
                dietMap[p.id] = p.alimentacion || "Estándar"; 
            });

            // 4. Procesar Datos
            const processed = events.map(evt => {
                const attendees = attendance.filter(a => a.id_evento === evt.id);
                
                // Contar dietas
                const counts = { Total: 0 };
                attendees.forEach(a => {
                    const diet = dietMap[a.id_integrante] || "Estándar";
                    counts[diet] = (counts[diet] || 0) + 1;
                    counts.Total++;
                });

                return {
                    id: evt.id,
                    fecha: evt.fecha,
                    hora: evt.hora_inicio?.slice(0,5),
                    servicio: SERVICE_IDS[evt.id_tipo_evento] || evt.tipos_evento?.nombre,
                    lugar: evt.locaciones?.nombre || "Sin ubicación",
                    counts
                };
            });

            setReportData(processed);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Obtener todas las dietas únicas encontradas para generar columnas dinámicas
    const allDiets = useMemo(() => {
        const diets = new Set();
        reportData.forEach(row => {
            Object.keys(row.counts).forEach(k => {
                if (k !== 'Total') diets.add(k);
            });
        });
        // Ordenar: Estándar primero, luego alfabético
        return Array.from(diets).sort((a,b) => {
            if(a === 'Estándar') return -1;
            if(b === 'Estándar') return 1;
            return a.localeCompare(b);
        });
    }, [reportData]);

    const filteredReport = reportData.filter(r => selectedTypes.has(r.servicio));

    const toggleFilter = (type) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if(next.has(type)) next.delete(type);
            else next.add(type);
            return next;
        });
    };

    return (
        <div className="flex flex-col h-full bg-white animate-in fade-in">
            {/* HEADER CON FILTROS */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50 print:hidden">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800">Reporte de Comidas</h2>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-1">
                        {["Desayuno", "Almuerzo", "Merienda", "Cena"].map(type => (
                            <button
                                key={type}
                                onClick={() => toggleFilter(type)}
                                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                                    selectedTypes.has(type) 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {type.charAt(0)}
                            </button>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={() => window.print()} 
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                    <IconPrinter size={18}/> Imprimir
                </button>
            </div>

            {/* TABLA DE REPORTE */}
            <div className="flex-1 overflow-auto p-8 print:p-0">
                {loading ? <div className="flex justify-center py-10"><IconLoader className="animate-spin text-indigo-500"/></div> : (
                    <div className="print:w-full">
                        <div className="mb-6 hidden print:block">
                            <h1 className="text-2xl font-bold text-slate-800">{gira.nombre_gira}</h1>
                            <p className="text-slate-500 text-sm">Reporte de Cantidades - Comidas</p>
                        </div>

                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-800 text-slate-800">
                                    <th className="py-2 px-2 w-24">Fecha</th>
                                    <th className="py-2 px-2 w-16">Hora</th>
                                    <th className="py-2 px-2 w-32">Servicio</th>
                                    <th className="py-2 px-2">Lugar</th>
                                    <th className="py-2 px-2 text-right font-black bg-slate-100 w-20">TOTAL</th>
                                    {allDiets.map(d => (
                                        <th key={d} className="py-2 px-2 text-right w-24 text-xs uppercase text-slate-500 font-bold border-l border-slate-200">
                                            {d}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredReport.map(row => (
                                    <tr key={row.id} className="break-inside-avoid">
                                        <td className="py-3 px-2 font-medium">
                                            {format(parseISO(row.fecha), "EEE dd/MM", { locale: es })}
                                        </td>
                                        <td className="py-3 px-2 text-slate-500">{row.hora}</td>
                                        <td className="py-3 px-2">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                                row.servicio === 'Almuerzo' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                row.servicio === 'Cena' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                                'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}>
                                                {row.servicio}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-slate-600">{row.lugar}</td>
                                        <td className="py-3 px-2 text-right font-black text-lg bg-slate-50">
                                            {row.counts.Total}
                                        </td>
                                        {allDiets.map(d => (
                                            <td key={d} className="py-3 px-2 text-right border-l border-slate-100 text-slate-600 font-mono">
                                                {row.counts[d] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {filteredReport.length === 0 && (
                                    <tr><td colSpan={5 + allDiets.length} className="p-8 text-center text-slate-400 italic">No hay datos para mostrar</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}