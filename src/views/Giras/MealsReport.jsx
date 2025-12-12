// src/views/Giras/MealsReport.jsx
import React, { useState, useEffect, useMemo } from "react";
import { IconLoader, IconPrinter } from "../../components/ui/Icons";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useGiraRoster } from "../../hooks/useGiraRoster";

const SERVICE_IDS = {
    7: "Desayuno",
    8: "Almuerzo",
    9: "Merienda",
    10: "Cena"
};

export default function MealsReport({ supabase, gira }) {
    // 1. Usar Hook Centralizado
    const { roster, loading: rosterLoading } = useGiraRoster(supabase, gira);
    
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    
    // Filtros
    const [selectedTypes, setSelectedTypes] = useState(new Set(["Desayuno", "Almuerzo", "Merienda", "Cena"]));
    const [includePending, setIncludePending] = useState(false);

    useEffect(() => {
        if(gira?.id && !rosterLoading) fetchReportData();
    }, [gira?.id, rosterLoading, includePending, roster]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            // 2. Filtrar Roster: Solo Confirmados
            const activeRoster = roster.filter(p => p.estado_gira === 'confirmado');

            if (activeRoster.length === 0) {
                setReportData([]);
                setLoading(false);
                return;
            }

            // 3. Obtener Eventos
            const { data: events } = await supabase
                .from("eventos")
                .select("*, tipos_evento(nombre), locaciones(nombre), convocados") 
                .eq("id_gira", gira.id)
                .in("id_tipo_evento", [7, 8, 9, 10])
                .order("fecha", { ascending: true })
                .order("hora_inicio", { ascending: true });

            if (!events || events.length === 0) {
                setReportData([]);
                setLoading(false);
                return;
            }

            // 4. Obtener Asistencias
            const eventIds = events.map(e => e.id);
            const { data: attendance } = await supabase
                .from("eventos_asistencia")
                .select("id_evento, id_integrante, estado")
                .in("id_evento", eventIds)
                .in("id_integrante", activeRoster.map(p => p.id));

            const attendanceMap = {};
            attendance?.forEach(a => {
                attendanceMap[`${a.id_evento}-${a.id_integrante}`] = a.estado;
            });

            // 5. Helper Convocatoria (Simplificado usando propiedades del hook)
            const isConvoked = (convocadosList, person) => {
                if (!convocadosList || convocadosList.length === 0) return false;
                return convocadosList.some(tag => {
                    if (tag === "GRP:TUTTI") return true;
                    // Aquí usamos la propiedad calculada por el hook: is_local
                    if (tag === "GRP:LOCALES") return person.is_local;
                    if (tag === "GRP:NO_LOCALES") return !person.is_local;
                    
                    if (tag === "GRP:PRODUCCION") return person.rol_gira === 'produccion';
                    if (tag === "GRP:SOLISTAS") return person.rol_gira === 'solista';
                    if (tag === "GRP:DIRECTORES") return person.rol_gira === 'director';
                    
                    if (tag.startsWith("LOC:")) return person.id_localidad === parseInt(tag.split(":")[1]);
                    if (tag.startsWith("FAM:")) return person.instrumentos?.familia === tag.split(":")[1];
                    return false;
                });
            };

            // 6. Procesar Datos
            const processed = events.map(evt => {
                const counts = { Total: 0 };
                
                activeRoster.forEach(person => {
                    // Verificar convocatoria
                    if (!isConvoked(evt.convocados, person)) return;

                    const status = attendanceMap[`${evt.id}-${person.id}`];
                    let shouldCount = false;

                    if (status === 'P') shouldCount = true;
                    else if (status === 'A') shouldCount = false;
                    else if (includePending && !status) shouldCount = true;

                    if (shouldCount) {
                        const diet = person.alimentacion || "Estándar";
                        counts[diet] = (counts[diet] || 0) + 1;
                        counts.Total++;
                    }
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

    const allDiets = useMemo(() => {
        const diets = new Set();
        reportData.forEach(row => {
            Object.keys(row.counts).forEach(k => {
                if (k !== 'Total') diets.add(k);
            });
        });
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

    const calculateGroupTotals = (services) => {
        const totals = { Total: 0 };
        allDiets.forEach(d => totals[d] = 0);

        filteredReport.filter(r => services.includes(r.servicio)).forEach(row => {
            totals.Total += row.counts.Total || 0;
            allDiets.forEach(d => {
                totals[d] += row.counts[d] || 0;
            });
        });
        return totals;
    };

    const mainMealsTotal = calculateGroupTotals(['Almuerzo', 'Cena']);
    const lightMealsTotal = calculateGroupTotals(['Desayuno', 'Merienda']);

    if (rosterLoading) return <div className="flex justify-center py-20"><IconLoader className="animate-spin text-indigo-500" size={32}/></div>;

    return (
        <div className="flex flex-col h-full bg-white animate-in fade-in">
            {/* HEADER CON FILTROS */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-slate-50 print:hidden">
                <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-bold text-slate-800">Reporte de Comidas</h2>
                    <div className="flex items-center gap-4">
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

                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700">
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" checked={includePending} onChange={() => setIncludePending(!includePending)} />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </div>
                            Incluir Pendientes
                        </label>
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
                            <p className="text-slate-500 text-sm">
                                Reporte de Cantidades - Comidas 
                                {includePending && <span className="ml-2 font-bold text-amber-600">(Incluye pendientes como confirmados)</span>}
                            </p>
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
                            <tfoot className="border-t-4 border-slate-300 bg-slate-50 text-sm">
                                <tr>
                                    <td colSpan={4} className="py-3 px-4 text-right font-bold text-slate-700 uppercase tracking-wide">
                                        Total Almuerzos + Cenas
                                    </td>
                                    <td className="py-3 px-2 text-right font-black text-lg text-slate-900 border-l border-slate-200">
                                        {mainMealsTotal.Total}
                                    </td>
                                    {allDiets.map(d => (
                                        <td key={d} className="py-3 px-2 text-right border-l border-slate-200 font-bold text-slate-700">
                                            {mainMealsTotal[d] || 0}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-t border-slate-200">
                                    <td colSpan={4} className="py-3 px-4 text-right font-bold text-slate-500 uppercase tracking-wide">
                                        Total Desayunos + Meriendas
                                    </td>
                                    <td className="py-3 px-2 text-right font-black text-lg text-slate-600 border-l border-slate-200">
                                        {lightMealsTotal.Total}
                                    </td>
                                    {allDiets.map(d => (
                                        <td key={d} className="py-3 px-2 text-right border-l border-slate-200 font-bold text-slate-500">
                                            {lightMealsTotal[d] || 0}
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}