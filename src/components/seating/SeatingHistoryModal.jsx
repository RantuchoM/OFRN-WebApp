import React, { useState, useEffect, useMemo } from "react";
import { IconHistory, IconX, IconLoader, IconPlus } from "../ui/Icons";

export default function SeatingHistoryModal({ isOpen, onClose, roster, supabase }) {
  const [historyData, setHistoryData] = useState({});
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 6;

  // Filtrar solo cuerdas
  const stringMusicians = useMemo(() => {
    return roster.filter((m) => ["01", "02", "03", "04"].includes(m.id_instr));
  }, [roster]);

  useEffect(() => {
    if (isOpen) {
      setPrograms([]);
      setHistoryData({});
      setPage(0);
      fetchHistory(0, true);
    }
  }, [isOpen]);

  const fetchHistory = async (pageIndex = 0, reset = false) => {
    setLoading(true);
    try {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      // 1. Obtener giras (solo las que tienen contenedores)
      // Traemos descendente (más reciente primero) para la paginación eficiente
      const { data: progs } = await supabase
        .from("programas")
        .select("id, mes_letra, nomenclador, fecha_desde, seating_contenedores!inner(id)")
        .order("fecha_desde", { ascending: false })
        .range(from, to);

      if (!progs || progs.length === 0) {
        setLoading(false);
        if (!reset && pageIndex > 0) alert("No hay más giras anteriores.");
        return;
      }

      const progIds = progs.map((p) => p.id);

      // 2. Obtener la data de seating
      const { data: items } = await supabase
        .from("seating_contenedores_items")
        .select(`orden, id_musico, seating_contenedores!inner (id_programa, nombre)`)
        .in("seating_contenedores.id_programa", progIds);

      // 3. Mapear datos
      const newMap = {};
      items?.forEach((item) => {
        const mId = item.id_musico;
        const pId = item.seating_contenedores.id_programa;
        const label = `${item.seating_contenedores.nombre} (${item.orden + 1})`;
        if (!newMap[mId]) newMap[mId] = {};
        newMap[mId][pId] = label;
      });

      // Acumulamos los programas
      setPrograms((prev) => (reset ? progs : [...prev, ...progs]));
      
      // Acumulamos el mapa de datos
      setHistoryData((prev) => {
        const merged = { ...prev };
        Object.keys(newMap).forEach((mId) => {
          merged[mId] = { ...(merged[mId] || {}), ...newMap[mId] };
        });
        return reset ? newMap : merged;
      });
      setPage(pageIndex);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchHistory(page + 1);
  };

  // Preparamos las columnas para visualización:
  // 'programs' tiene [Reciente -> Antiguo]
  // Invertimos para mostrar [Antiguo -> Reciente] (Línea de tiempo)
  const displayPrograms = useMemo(() => [...programs].reverse(), [programs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[85vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <IconHistory className="text-indigo-600" /> Historial de Seating (Cuerdas)
          </h3>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-400 italic">Orden cronológico (Antiguo → Reciente)</span>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto p-0 relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 w-48 bg-slate-100 border-b border-r border-slate-200 font-bold text-slate-600 sticky left-0 z-20">
                  Músico
                </th>
                
                {/* Botón "Cargar Anteriores" al principio (Izquierda) */}
                <th className="p-2 min-w-[50px] bg-slate-50 border-b border-r border-slate-200 text-center align-middle">
                  {!loading && (
                    <button
                      onClick={handleLoadMore}
                      className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Cargar giras anteriores"
                    >
                      <IconPlus size={16} />
                    </button>
                  )}
                </th>

                {/* Columnas de Programas */}
                {displayPrograms.map((p) => (
                  <th
                    key={p.id}
                    className="p-2 min-w-[120px] bg-slate-50 border-b border-r border-slate-200 text-slate-600 font-bold text-center"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      {p.mes_letra}
                    </div>
                    <div className="text-indigo-900">{p.nomenclador}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stringMusicians.map((musician, idx) => (
                <tr
                  key={musician.id}
                  className={idx % 2 === 0 ? "bg-white hover:bg-indigo-50/30" : "bg-slate-50/30 hover:bg-indigo-50/30"}
                >
                  <td className="p-2 border-r border-slate-200 font-medium text-slate-700 sticky left-0 bg-inherit truncate">
                    {musician.apellido}, {musician.nombre}
                  </td>
                  {/* Celda vacía bajo el botón de carga */}
                  <td className="bg-slate-50/50 border-r border-slate-100"></td>

                  {/* Celdas de datos */}
                  {displayPrograms.map((p) => {
                    const cellData = historyData[musician.id]?.[p.id];
                    return (
                      <td
                        key={p.id}
                        className="p-2 border-r border-slate-100 text-center text-slate-600"
                      >
                        {cellData ? (
                          <span className="inline-block px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium text-[10px]">
                            {cellData}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-30">
              <IconLoader className="animate-spin text-indigo-600" size={30} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-right rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded font-bold text-xs hover:bg-slate-50 shadow-sm"
          >
            Cerrar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}