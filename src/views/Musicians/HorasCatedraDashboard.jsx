import React, { useState, useEffect, useMemo } from "react";
import {
  IconLoader, IconFilter, IconPlus, IconCheck, IconX, IconCalendar, IconUser, IconInfo, IconTrash, IconRefresh
} from "../../components/ui/Icons";
import NovedadModal from "./NovedadModal";

const CONCEPTOS = [
  { id: "h_basico", label: "Básico" },
  { id: "h_ensayos", label: "Ens" },
  { id: "h_ensamble", label: "Ensamb" },
  { id: "h_categoria", label: "Cat" },
  { id: "h_coordinacion", label: "Coord" },
  { id: "h_desarraigo", label: "Des" },
  { id: "h_otros", label: "Otros" },
];

const getHoursForDate = (records, date, origen) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  const validRecords = records.filter(r => {
      if (r.origen !== origen) return false;
      const startOk = (r.anio_inicio < year) || (r.anio_inicio === year && r.mes_inicio <= month);
      const endOk = !r.anio_fin || (r.anio_fin > year) || (r.anio_fin === year && r.mes_fin >= month);
      return startOk && endOk;
  });

  validRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return validRecords[0] || null;
};

export default function HorasCatedraDashboard({ supabase }) {
  const [loading, setLoading] = useState(true);
  const [musicians, setMusicians] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMusician, setSelectedMusician] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]); 
  const [recordToEdit, setRecordToEdit] = useState(null);

  // Filtramos conceptos para mostrar en la tabla principal (excluyendo Otros que va al final)
  const MAIN_CONCEPTOS = CONCEPTOS.filter(c => c.id !== "h_otros");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: musData } = await supabase.from("integrantes").select("id, nombre, apellido, condicion, instrumentos(familia)").order("apellido");
      const { data: hoursData } = await supabase.from("horas_catedra").select("*").order("created_at", { ascending: true });
      setMusicians(musData || []);
      setAllRecords(hoursData || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const reportData = useMemo(() => {
    const targetDate = new Date(selectedYear, selectedMonth - 1, 1);
    const prevDate = new Date(selectedYear, selectedMonth - 2, 1);

    return musicians.map(m => {
        const records = allRecords.filter(r => r.id_integrante === m.id);
        
        const cult = getHoursForDate(records, targetDate, "CULTURA") || {};
        const edu = getHoursForDate(records, targetDate, "EDUCACION") || {};
        
        const prevCult = getHoursForDate(records, prevDate, "CULTURA") || {};
        const prevEdu = getHoursForDate(records, prevDate, "EDUCACION") || {};

        const sumRecord = (rec) => CONCEPTOS.reduce((acc, c) => acc + (rec[c.id] || 0), 0);

        const totalCult = sumRecord(cult);
        const totalEdu = sumRecord(edu);
        
        const prevTotalCult = sumRecord(prevCult);
        const prevTotalEdu = sumRecord(prevEdu);

        // Detectar Novedades (Cambio en totales)
        const hasNews = totalCult !== prevTotalCult || totalEdu !== prevTotalEdu;

        const concepts = {};
        CONCEPTOS.forEach(c => {
            concepts[c.id] = (cult[c.id] || 0) + (edu[c.id] || 0);
        });

        return {
            ...m,
            cult, edu,
            totalCult, totalEdu,
            concepts, 
            hasNews,
            records 
        };
    }).filter(m => {
        if (searchTerm === "") return m.totalCult > 0 || m.totalEdu > 0;
        const full = `${m.apellido} ${m.nombre}`.toLowerCase();
        return full.includes(searchTerm.toLowerCase());
    });
  }, [musicians, allRecords, selectedMonth, selectedYear, searchTerm]);

  const handleSelectRow = (item) => {
    setSelectedMusician(item);
    const sorted = [...item.records].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    const historyLines = [];
    
    ["CULTURA", "EDUCACION"].forEach(org => {
        const orgRecords = sorted.filter(r => r.origen === org);
        orgRecords.forEach((rec, idx) => {
            const prev = idx > 0 ? orgRecords[idx-1] : null;
            let diffs = [];
            
            CONCEPTOS.forEach(c => {
                const val = rec[c.id] || 0;
                const prevVal = prev ? (prev[c.id] || 0) : 0;
                const diff = val - prevVal;
                if (diff !== 0) diffs.push(`${c.label} ${diff > 0 ? '+' : ''}${diff}`);
            });

            if (diffs.length === 0 && idx > 0) diffs.push("Renovación / Sin cambios numéricos");
            if (idx === 0) {
                const totalInitial = CONCEPTOS.reduce((acc, c) => acc + (rec[c.id] || 0), 0);
                diffs.push(`Inicio Asignación (Total: ${totalInitial} hs)`);
            }

            historyLines.push({ ...rec, diffText: diffs.join(", "), dateSort: new Date(rec.created_at) });
        });
    });
    
    setSelectedHistory(historyLines.sort((a,b) => b.dateSort - a.dateSort));
  };

  const handleEditRecord = (record) => {
      setRecordToEdit(record);
      setModalOpen(true);
  };

  const handleDeleteRecord = async (id) => {
      if(!confirm("¿Estás seguro de eliminar este registro histórico?")) return;
      const { error } = await supabase.from("horas_catedra").delete().eq("id", id);
      if (error) return alert("Error al eliminar: " + error.message);
      await fetchData(); 
      if(selectedMusician) setSelectedMusician(null); 
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
        {/* HEADER CONTROL */}
        <div className="bg-white border-b border-slate-200 p-4 flex flex-wrap items-center gap-4 shrink-0">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                <IconFilter className="text-indigo-500" /> Nómina Horas
            </h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
                <input type="number" min="1" max="12" className="w-12 bg-transparent text-center font-bold outline-none text-sm" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}/>
                <span className="text-slate-300 font-light">/</span>
                <input type="number" min="2020" max="2030" className="w-16 bg-transparent text-center font-bold outline-none text-sm" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}/>
            </div>
            <div className="relative">
                <input type="text" placeholder="Buscar músico..." className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-48 outline-none focus:ring-2 ring-indigo-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                <IconUser size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="ml-auto flex gap-2">
                <button onClick={() => { setSelectedMusician(null); setRecordToEdit(null); setModalOpen(true); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                    <IconPlus size={14} /> Nueva Novedad
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <table className="w-full border-collapse text-left text-sm bg-white rounded-xl shadow-sm overflow-hidden">
                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-3 border-b bg-slate-100 z-20 sticky left-0">Integrante</th>
                            {/* CONCEPTOS PRINCIPALES */}
                            {MAIN_CONCEPTOS.map(c => (
                                <th key={c.id} className="p-3 border-b text-center border-l border-slate-200 w-12 text-[9px]">{c.label}</th>
                            ))}
                            {/* TOTALES */}
                            <th className="p-3 border-b text-center bg-orange-50 text-orange-600 border-l border-orange-100">Total Cult</th>
                            <th className="p-3 border-b text-center bg-blue-50 text-blue-600 border-l border-blue-100">Total Edu</th>
                            {/* OTROS (Externo a totales visualmente) */}
                            <th className="p-3 border-b text-center bg-slate-200 text-slate-600 border-l border-slate-300 w-14">Otros</th>
                            
                            <th className="p-3 border-b text-right w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {reportData.map(item => (
                            <tr 
                                key={item.id} 
                                onClick={() => handleSelectRow(item)}
                                // Lógica de color de fila: Seleccionado (Indigo) > Novedad (Celeste/Cyan) > Normal
                                className={`
                                    cursor-pointer transition-colors border-l-4 
                                    ${selectedMusician?.id === item.id 
                                        ? 'bg-indigo-50 border-l-indigo-500 ring-1 ring-inset ring-indigo-200' 
                                        : item.hasNews 
                                            ? 'bg-cyan-50 border-l-cyan-400 hover:bg-cyan-100' 
                                            : 'border-l-transparent hover:bg-slate-50'}
                                `}
                            >
                                <td className={`p-3 sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${item.hasNews && selectedMusician?.id !== item.id ? 'bg-cyan-50' : 'bg-white'}`}>
                                    <div className="font-bold text-slate-700 truncate w-40">{item.apellido}, {item.nombre}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{item.instrumentos?.familia || "-"}</div>
                                </td>
                                
                                {/* Celdas de Conceptos Principales */}
                                {MAIN_CONCEPTOS.map(c => (
                                    <td key={c.id} className={`p-2 text-center text-xs font-bold border-l border-slate-100 ${item.concepts[c.id] > 0 ? 'text-slate-700' : 'text-slate-200'}`}>
                                        {item.concepts[c.id] || "-"}
                                    </td>
                                ))}

                                {/* Totales */}
                                <td className="p-3 text-center border-l border-orange-100 bg-orange-50/30 font-black text-orange-700">
                                    {item.totalCult}
                                </td>
                                <td className="p-3 text-center border-l border-blue-100 bg-blue-50/30 font-black text-blue-700">
                                    {item.totalEdu}
                                </td>

                                {/* Otros (A la derecha) */}
                                <td className={`p-3 text-center border-l border-slate-200 font-bold ${item.concepts['h_otros'] > 0 ? 'bg-slate-100 text-slate-700' : 'text-slate-300'}`}>
                                    {item.concepts['h_otros'] || "-"}
                                </td>

                                <td className="p-3 text-right">
                                    {/* Indicador de Novedad visual extra si se quiere, o botón de acción */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedMusician(item); setRecordToEdit(null); setModalOpen(true); }}
                                        className="p-1.5 rounded hover:bg-white text-slate-400 hover:text-indigo-600 opacity-50 hover:opacity-100 transition-all"
                                        title="Agregar Novedad"
                                    >
                                        <IconPlus size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedMusician && (
                <div className="w-96 bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-300 z-20">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                        <div>
                            <h4 className="font-black text-slate-700 text-sm">Historial</h4>
                            <p className="text-xs text-slate-500 truncate w-60">{selectedMusician.apellido}, {selectedMusician.nombre}</p>
                        </div>
                        <button onClick={() => setSelectedMusician(null)}><IconX className="text-slate-400 hover:text-red-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        {selectedHistory.map((h) => (
                            <div key={h.id} className="relative pl-4 border-l-2 border-slate-200 pb-6 last:pb-0 group">
                                <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white ${h.origen === 'CULTURA' ? 'bg-orange-400' : 'bg-blue-400'}`}></div>
                                <div className="flex justify-between items-start mb-1">
                                    <div className="text-[10px] font-bold text-slate-400">
                                        {h.mes_inicio}/{h.anio_inicio} • <span className={h.origen === 'CULTURA' ? 'text-orange-500' : 'text-blue-500'}>{h.origen}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditRecord(h)} className="p-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-colors" title="Editar"><IconRefresh size={12}/></button>
                                        <button onClick={() => handleDeleteRecord(h.id)} className="p-1 bg-slate-50 hover:bg-red-50 border border-slate-200 rounded text-slate-400 hover:text-red-500 transition-colors" title="Eliminar"><IconTrash size={12}/></button>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 shadow-sm leading-relaxed">
                                    {h.diffText}
                                </div>
                                {h.observaciones && <p className="text-[10px] italic text-slate-400 mt-1 pl-1 border-l-2 border-slate-200">"{h.observaciones}"</p>}
                            </div>
                        ))}
                        {selectedHistory.length === 0 && <p className="text-center text-xs text-slate-400 italic">Sin registros históricos.</p>}
                    </div>
                    <div className="p-4 border-t bg-slate-50 shrink-0">
                        <button onClick={() => { setRecordToEdit(null); setModalOpen(true); }} className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                            <IconPlus size={14} /> Nueva Novedad
                        </button>
                    </div>
                </div>
            )}
        </div>

        <NovedadModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)}
            supabase={supabase}
            musician={selectedMusician} 
            allMusicians={musicians}
            recordToEdit={recordToEdit} 
            onSuccess={() => { fetchData(); if(selectedMusician) handleSelectRow({...selectedMusician, records: allRecords.filter(r=>r.id_integrante===selectedMusician.id)}); }} 
        />
    </div>
  );
}