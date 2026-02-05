import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  IconLoader, IconFilter, IconPlus, IconCheck, IconX, IconUser, IconTrash, IconEdit, IconChevronDown
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

const MultiSelect = ({ options, selected, onChange, placeholder = "Seleccionar..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (id) => {
        const newSelected = new Set(selected);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        onChange(newSelected);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-48 px-3 py-1.5 text-xs font-bold border rounded-lg bg-white transition-colors ${selected.size > 0 ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-slate-300 text-slate-500'}`}
            >
                <span className="truncate">
                    {selected.size > 0 ? `${selected.size} ensambles` : placeholder}
                </span>
                <IconChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                    <div className="p-1">
                        {options.map(opt => (
                            <div 
                                key={opt.id} 
                                onClick={() => toggleOption(opt.id)}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected.has(opt.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                    {selected.has(opt.id) && <IconCheck size={10} className="text-white"/>}
                                </div>
                                <span className={`text-xs ${selected.has(opt.id) ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                    {opt.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

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
  const [ensemblesList, setEnsemblesList] = useState([]); 
  
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMusician, setSelectedMusician] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]); 
  const [recordToEdit, setRecordToEdit] = useState(null);

  const MAIN_CONCEPTOS = CONCEPTOS.filter(c => c.id !== "h_otros");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: musData } = await supabase
        .from("integrantes")
        .select(`
            id, nombre, apellido, condicion, 
            instrumentos(nombre:instrumento, familia),
            integrantes_ensambles(
                ensambles(id, ensamble)
            )
        `)
        .order("apellido");
      
      const { data: hoursData } = await supabase.from("horas_catedra").select("*").order("created_at", { ascending: true });
      const { data: ensData } = await supabase.from("ensambles").select("id, ensamble").order("ensamble");

      setMusicians(musData || []);
      setAllRecords(hoursData || []);
      setEnsemblesList(ensData ? ensData.map(e => ({ id: e.id, label: e.ensamble })) : []);

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

        const hasNews = totalCult !== prevTotalCult || totalEdu !== prevTotalEdu;

        const concepts = {};
        CONCEPTOS.forEach(c => {
            concepts[c.id] = (cult[c.id] || 0) + (edu[c.id] || 0);
        });

        const myEnsembles = m.integrantes_ensambles?.map(ie => ie.ensambles) || [];

        return {
            ...m,
            myEnsembles,
            cult, edu,
            totalCult, totalEdu,
            concepts, 
            hasNews,
            records 
        };
    }).filter(m => {
        const full = `${m.apellido} ${m.nombre}`.toLowerCase();
        const matchesSearch = searchTerm === "" || full.includes(searchTerm.toLowerCase());
        
        let matchesEnsemble = true;
        if (selectedEnsembles.size > 0) {
            matchesEnsemble = m.myEnsembles.some(e => selectedEnsembles.has(e.id));
        }

        // Filtro de Actividad (Nómina)
        const hasActiveHours = (m.totalCult + m.totalEdu) > 0;

        if (searchTerm !== "") {
             return matchesSearch && matchesEnsemble;
        }

        return matchesSearch && matchesEnsemble && hasActiveHours;
    });
  }, [musicians, allRecords, selectedMonth, selectedYear, searchTerm, selectedEnsembles]);

  // --- CÁLCULO DE TOTALES (CORREGIDO) ---
  const footerTotals = useMemo(() => {
      const totals = {
          concepts: {},
          totalCult: 0,
          totalEdu: 0,
          totalOtros: 0, // Total de la columna Otros
          totalGeneral: 0
      };
      
      CONCEPTOS.forEach(c => totals.concepts[c.id] = 0);

      reportData.forEach(item => {
          CONCEPTOS.forEach(c => {
              totals.concepts[c.id] += (item.concepts[c.id] || 0);
          });
          totals.totalCult += item.totalCult;
          totals.totalEdu += item.totalEdu;
      });

      // El total de "Otros" está en concepts['h_otros']
      totals.totalOtros = totals.concepts['h_otros'] || 0;

      // Cálculo Final: (Cultura + Educación) - Otros
      totals.totalGeneral = (totals.totalCult + totals.totalEdu) - totals.totalOtros;
      
      return totals;
  }, [reportData]);

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
            
            <div className="flex items-center gap-2">
                <div className="relative">
                    <input type="text" placeholder="Buscar músico..." className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-48 outline-none focus:ring-2 ring-indigo-100" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    <IconUser size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                
                <MultiSelect 
                    options={ensemblesList} 
                    selected={selectedEnsembles} 
                    onChange={setSelectedEnsembles}
                    placeholder="Filtrar Ensambles"
                />
            </div>

            <div className="ml-auto flex gap-2">
                <button onClick={() => { setSelectedMusician(null); setRecordToEdit(null); setModalOpen(true); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                    <IconPlus size={14} /> Nueva Novedad
                </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative"> {/* Agregado relative */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-20"> {/* Agregado pb-20 para dar aire al final del scroll */}
                <table className="w-full border-collapse text-left text-sm bg-white rounded-xl shadow-sm border-spacing-0"> {/* Eliminado overflow-hidden de aquí para que el sticky funcione mejor */}
                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-30 shadow-sm">
                        <tr>
                            <th className="p-3 border-b bg-slate-100 z-40 sticky left-0 min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Integrante</th>
                            <th className="p-3 border-b bg-slate-100 z-30 border-l border-slate-200">Ensambles</th>
                            
                            {MAIN_CONCEPTOS.map(c => (
                                <th key={c.id} className="p-3 border-b text-center border-l border-slate-200 w-12 text-[9px] bg-slate-100">{c.label}</th>
                            ))}
                            
                            <th className="p-3 border-b text-center bg-orange-50 text-orange-600 border-l border-orange-100">Total Cult</th>
                            <th className="p-3 border-b text-center bg-blue-50 text-blue-600 border-l border-blue-100">Total Edu</th>
                            <th className="p-3 border-b text-center bg-slate-200 text-slate-600 border-l border-slate-300 w-14">Otros</th>
                            <th className="p-3 border-b text-right w-10 bg-slate-100"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {reportData.map(item => (
                            <tr 
                                key={item.id} 
                                onClick={() => handleSelectRow(item)}
                                className={`
                                    cursor-pointer transition-colors border-l-4 
                                    ${selectedMusician?.id === item.id 
                                        ? 'bg-indigo-50 border-l-indigo-500 ring-1 ring-inset ring-indigo-200' 
                                        : item.hasNews 
                                            ? 'bg-cyan-50 border-l-cyan-400 hover:bg-cyan-100' 
                                            : 'border-l-transparent hover:bg-slate-50'}
                                `}
                            >
                                <td className={`p-3 sticky left-0 z-20 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${item.hasNews && selectedMusician?.id !== item.id ? 'bg-cyan-50' : selectedMusician?.id === item.id ? 'bg-indigo-50' : 'bg-white'}`}>
                                    <div className="font-bold text-slate-700 truncate w-48 leading-tight">{item.apellido}, {item.nombre}</div>
                                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                        <span className="truncate max-w-[100px]">{item.instrumentos?.nombre || "S/D"}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="truncate uppercase text-[9px] tracking-wide">{item.instrumentos?.familia || "-"}</span>
                                    </div>
                                </td>

                                <td className="p-2 border-l border-slate-100 align-middle">
                                    <div className="flex flex-wrap gap-1 w-40">
                                        {item.myEnsembles.length > 0 ? item.myEnsembles.map(e => (
                                            <span key={e.id} className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                                                {e.ensamble}
                                            </span>
                                        )) : <span className="text-[9px] text-slate-300 italic">-</span>}
                                    </div>
                                </td>
                                
                                {MAIN_CONCEPTOS.map(c => (
                                    <td key={c.id} className={`p-2 text-center text-xs font-bold border-l border-slate-100 ${item.concepts[c.id] > 0 ? 'text-slate-700' : 'text-slate-200'}`}>
                                        {item.concepts[c.id] || "-"}
                                    </td>
                                ))}

                                <td className="p-3 text-center border-l border-orange-100 bg-orange-50/30 font-black text-orange-700">
                                    {item.totalCult}
                                </td>
                                <td className="p-3 text-center border-l border-blue-100 bg-blue-50/30 font-black text-blue-700">
                                    {item.totalEdu}
                                </td>
                                <td className={`p-3 text-center border-l border-slate-200 font-bold ${item.concepts['h_otros'] > 0 ? 'bg-slate-100 text-slate-700' : 'text-slate-300'}`}>
                                    {item.concepts['h_otros'] || "-"}
                                </td>

                                <td className="p-3 text-right">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedMusician(item); setRecordToEdit(null); setModalOpen(true); }}
                                        className="p-1.5 rounded hover:bg-white text-slate-400 hover:text-indigo-600 opacity-50 hover:opacity-100 transition-all"
                                    >
                                        <IconPlus size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    
                    {/* --- FOOTER STICKY CORREGIDO --- */}
                    <tfoot className="sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        {/* FILA 1: SUBTOTALES */}
                        <tr className="text-xs font-bold text-slate-600">
                            {/* Celda "Subtotales" (Intersección: z-50 para ganar a todo) */}
                            <td className="p-3 sticky left-0 bottom-[38px] z-50 bg-slate-100 border-t border-r border-slate-300 text-right uppercase tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                Subtotales
                            </td>
                            
                            <td className="p-3 border-t border-l border-slate-300 bg-slate-100"></td>
                            
                            {MAIN_CONCEPTOS.map(c => (
                                <td key={c.id} className="p-2 text-center border-t border-l border-slate-300 bg-slate-100">
                                    {footerTotals.concepts[c.id] > 0 ? footerTotals.concepts[c.id] : "-"}
                                </td>
                            ))}
                            
                            <td className="p-3 text-center border-t border-l border-orange-200 bg-orange-100 text-orange-800">{footerTotals.totalCult}</td>
                            <td className="p-3 text-center border-t border-l border-blue-200 bg-blue-100 text-blue-800">{footerTotals.totalEdu}</td>
                            <td className="p-3 text-center border-t border-l border-slate-400 bg-slate-300 text-slate-800">{footerTotals.totalOtros}</td>
                            <td className="bg-slate-100 border-t border-slate-300"></td>
                        </tr>

                        {/* FILA 2: TOTAL GENERAL */}
                        <tr className="bg-slate-800 text-white text-sm font-black">
                            {/* Celda "Total General" (Intersección: z-50) */}
                            <td className="p-3 sticky left-0 bottom-0 z-50 bg-slate-800 border-r border-slate-700 text-right uppercase tracking-widest text-indigo-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                Total General
                            </td>
                            
                            <td colSpan={MAIN_CONCEPTOS.length + 1} className="bg-slate-800 border-t border-slate-700"></td> 
                            
                            <td colSpan={3} className="p-3 text-center border-l border-slate-600 bg-slate-700 border-t border-slate-600">
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-white text-xs opacity-70">({footerTotals.totalCult} + {footerTotals.totalEdu})</span>
                                    <span className="text-slate-400 font-normal">-</span>
                                    <span className="text-slate-300 text-xs font-normal">Otros ({footerTotals.totalOtros})</span>
                                    <span className="text-slate-400 font-normal">=</span>
                                    <span className="text-xl text-emerald-400 ml-2">{footerTotals.totalGeneral} hs</span>
                                </div>
                            </td>
                            <td className="bg-slate-800 border-t border-slate-700"></td>
                        </tr>
                    </tfoot>
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
                                        <button onClick={() => handleEditRecord(h)} className="p-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-colors" title="Editar"><IconEdit size={12}/></button>
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