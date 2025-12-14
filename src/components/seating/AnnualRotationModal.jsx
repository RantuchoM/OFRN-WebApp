import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { IconHistory, IconX, IconLoader, IconFilter } from "../ui/Icons";

const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body
  );
};

export default function AnnualRotationModal({ isOpen, onClose, currentProgram, roster, supabase }) {
  const [loading, setLoading] = useState(false);
  const [selectedInstrId, setSelectedInstrId] = useState("");
  const [instrumentsList, setInstrumentsList] = useState([]);
  
  // Datos procesados
  const [rows, setRows] = useState([]); // Filas de la tabla (Obras)
  const [musicianColumns, setMusicianColumns] = useState([]); // Columnas dinámicas (Músicos)

  // 1. Extraer instrumentos disponibles en el roster
  useEffect(() => {
    if (isOpen && roster.length > 0) {
      const uniqueMap = new Map();
      roster.forEach(m => {
        if (m.instrumentos && m.id_instr) {
          if (!uniqueMap.has(m.id_instr)) {
            uniqueMap.set(m.id_instr, m.instrumentos.instrumento);
          }
        }
      });
      
      const list = Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setInstrumentsList(list);

      if (list.length > 0 && !selectedInstrId) {
        setSelectedInstrId(list[0].id);
      }
    }
  }, [isOpen, roster]);

  // 2. Generar reporte
  useEffect(() => {
    if (isOpen && selectedInstrId && currentProgram) {
      fetchAnnualData();
    }
  }, [isOpen, selectedInstrId, currentProgram]);

  const fetchAnnualData = async () => {
    setLoading(true);
    try {
      // A. Definir columnas de músicos (Músicos estables del instrumento)
      const targetMusicians = roster.filter(m => m.id_instr === selectedInstrId);
      targetMusicians.sort((a, b) => a.apellido.localeCompare(b.apellido));
      setMusicianColumns(targetMusicians);

      if (targetMusicians.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // B. Fechas (Año actual)
      const year = currentProgram.fecha_desde ? parseInt(currentProgram.fecha_desde.split('-')[0]) : new Date().getFullYear();
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      // C. Programas (Giras)
      const { data: programs, error: progError } = await supabase
        .from("programas")
        .select("id, nomenclador, mes_letra, fecha_desde")
        .gte("fecha_desde", startOfYear)
        .lte("fecha_desde", endOfYear)
        .order("fecha_desde", { ascending: true });

      if (progError || !programs || programs.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const programIds = programs.map(p => p.id);

      // D. Obras (A través de bloques)
      const { data: repObras, error: repError } = await supabase
        .from("repertorio_obras")
        .select(`
          id, orden, 
          programas_repertorios!inner ( id_programa ), 
          obras (
            id, 
            titulo, 
            obras_compositores (
              compositores (apellido)
            )
          )
        `)
        .in("programas_repertorios.id_programa", programIds)
        .order("orden");

      if (repError) throw repError;

      // E. Asignaciones (Seating)
      const { data: assignments } = await supabase
        .from("seating_asignaciones")
        .select(`
          id_programa, id_obra, id_particella, id_musicos_asignados,
          obras_particellas (nombre_archivo)
        `)
        .in("id_programa", programIds);

      // F. Construir filas (Una fila por Obra en cada Gira)
      const reportRows = [];

      programs.forEach(prog => {
        // Obras de este programa
        const worksInProg = repObras?.filter(ro => ro.programas_repertorios?.id_programa === prog.id) || [];
        
        // Ordenar por orden de ejecución dentro de la gira
        worksInProg.sort((a, b) => (a.orden || 0) - (b.orden || 0));

        worksInProg.forEach(ro => {
          // Extraer nombre compositor
          let composerName = "Anónimo";
          if (ro.obras?.obras_compositores && ro.obras.obras_compositores.length > 0) {
             composerName = ro.obras.obras_compositores
                .map(oc => oc.compositores?.apellido)
                .filter(Boolean)
                .join(" / ");
          }

          const row = {
            id: `${prog.id}-${ro.id}`, // Key única
            gira: `${prog.mes_letra} - ${prog.nomenclador}`,
            compositor: composerName,
            obra: ro.obras?.titulo || "Sin título",
            assignments: {} // Mapa: { musicoId: "Flauta 1" }
          };

          let hasAnyAssignment = false; // Flag para filtrar

          // Llenar asignaciones para esta fila
          targetMusicians.forEach(mus => {
            const assign = assignments?.find(a => 
              a.id_programa === prog.id &&
              a.id_obra === ro.obras.id &&
              a.id_musicos_asignados && 
              a.id_musicos_asignados.includes(mus.id)
            );

            if (assign) {
              row.assignments[mus.id] = assign.obras_particellas?.nombre_archivo || "Asignado";
              hasAnyAssignment = true; // ¡Encontramos al menos uno!
            } else {
              row.assignments[mus.id] = "-";
            }
          });

          // Solo agregamos la fila si al menos un músico tocó algo
          if (hasAnyAssignment) {
              reportRows.push(row);
          }
        });
      });

      setRows(reportRows);

    } catch (error) {
      console.error("Error generando reporte anual:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="bg-white w-full max-w-7xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <IconHistory className="text-indigo-600" /> Rotación Anual
            </h3>
            
            <div className="relative">
                <IconFilter className="absolute left-2 top-2 text-slate-400" size={14}/>
                <select 
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 outline-none focus:border-indigo-500 font-medium"
                    value={selectedInstrId}
                    onChange={(e) => setSelectedInstrId(e.target.value)}
                >
                    {instrumentsList.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                </select>
            </div>
          </div>
          
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <IconX size={22} />
          </button>
        </div>

        {/* CONTENIDO (TABLA) */}
        <div className="flex-1 overflow-auto bg-white relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 bg-white/80 z-10">
              <IconLoader className="animate-spin text-indigo-600" size={32} />
              <span className="text-sm text-slate-500 font-medium">Analizando programación anual...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>No se encontraron datos para este instrumento en el año actual.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm text-slate-700">
                <tr>
                  {/* COLUMNAS FIJAS */}
                  <th className="p-3 w-40 bg-slate-100 border-b border-r border-slate-200 font-bold sticky left-0 z-30">Gira</th>
                  <th className="p-3 w-40 bg-slate-100 border-b border-r border-slate-200 font-bold">Compositor</th>
                  <th className="p-3 w-64 bg-slate-100 border-b border-r border-slate-200 font-bold">Obra</th>
                  
                  {/* COLUMNAS DINÁMICAS (MÚSICOS) */}
                  {musicianColumns.map(m => (
                    <th key={m.id} className="p-2 min-w-[100px] bg-slate-50 border-b border-r border-slate-200 font-bold text-center">
                      <div className="truncate" title={`${m.apellido}, ${m.nombre}`}>
                        {m.apellido}, {m.nombre.charAt(0)}.
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors group">
                    
                    {/* GIRA (STICKY) */}
                    <td className="p-2 border-r border-slate-200 bg-white group-hover:bg-indigo-50/10 sticky left-0 z-10 font-bold text-indigo-900 truncate">
                        {row.gira}
                    </td>

                    {/* COMPOSITOR */}
                    <td className="p-2 border-r border-slate-100 text-slate-600 truncate max-w-[150px]" title={row.compositor}>
                        {row.compositor}
                    </td>

                    {/* OBRA */}
                    <td className="p-2 border-r border-slate-100 text-slate-800 font-medium truncate max-w-[250px]" title={row.obra}>
                        {row.obra}
                    </td>

                    {/* CELDAS DE MÚSICOS */}
                    {musicianColumns.map(m => {
                      const partName = row.assignments[m.id];
                      const isAssigned = partName !== "-";
                      
                      return (
                        <td key={m.id} className="p-2 border-r border-slate-100 text-center relative">
                          {isAssigned ? (
                            <span className="inline-block px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium text-[10px] truncate max-w-full" title={partName}>
                              {partName}
                            </span>
                          ) : (
                            <span className="text-slate-200 text-[10px]">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <span className="text-xs text-slate-400 italic">
                * Matriz de asignaciones para el año {new Date(currentProgram?.fecha_desde).getFullYear()}. (Solo obras con participación)
            </span>
            <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded hover:bg-slate-50 text-xs shadow-sm">
                Cerrar Reporte
            </button>
        </div>
      </div>
    </ModalPortal>
  );
}