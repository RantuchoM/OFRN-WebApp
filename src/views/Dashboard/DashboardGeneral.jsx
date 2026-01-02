import React, { useState, useEffect, useMemo } from "react";
import {
  IconSpiralNotebook,
  IconUsers,
  IconLoader,
  IconMap,
  IconFilter
} from "../../components/ui/Icons";
import DashboardTourCard from "./DashboardTourCard";
import DateInput from "../../components/ui/DateInput"; 

export default function DashboardGeneral({ supabase, onViewChange }) {
  const [loading, setLoading] = useState(true);
  const [girasData, setGirasData] = useState([]);
  const [totalVacantes, setTotalVacantes] = useState(0);

  // --- ESTADOS PARA FILTROS ---
  const todayISO = new Date().toISOString().split('T')[0];

  // 1. Filtros de Tipo
  const [filterTypes, setFilterTypes] = useState(new Set(["Sinfónico", "Ensamble", "Camerata Filarmónica"])); 
  
  // 2. NUEVO: Filtros de Estado (Por defecto ocultamos Borrador en el Dashboard)
  const [filterStatus, setFilterStatus] = useState(new Set(["Vigente", "Pausada"]));

  // 3. Filtros de Fecha
  const [filterDateStart, setFilterDateStart] = useState(todayISO);
  const [filterDateEnd, setFilterDateEnd] = useState("");

  const PROGRAM_TYPES = [
    "Sinfónico",
    "Camerata Filarmónica",
    "Ensamble",
    "Jazz Band",
  ];

  useEffect(() => {
    fetchDashboardData();
  }, [supabase]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      // 1. GIRAS (Agregamos 'estado' a la selección)
      const { data: giras } = await supabase
        .from("programas")
        .select("id, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, estado") // <--- Agregado 'estado'
        .gte("fecha_hasta", today) 
        .order("fecha_desde", { ascending: true });

      if (!giras) throw new Error("No se pudieron cargar las giras");
      const giraIds = giras.map((g) => g.id);

      // 2. PROGRESO
      const { data: progresos } = await supabase
        .from("giras_progreso")
        .select("*")
        .in("id_gira", giraIds);

      // 3. VACANTES
      const { data: vacantes } = await supabase
        .from("vista_vacantes_pendientes")
        .select("*")
        .in("id_gira", giraIds);

      // 4. MAPEO
      const girasWithData = giras.map((g) => {
        const prog = progresos?.filter((p) => p.id_gira === g.id) || [];
        const statusMap = {};
        prog.forEach((p) => (statusMap[p.seccion_clave] = p.estado));
        
        const misVacantes = vacantes?.filter((v) => v.id_gira === g.id) || [];

        return {
          ...g,
          statusMap,
          vacantesCount: misVacantes.length,
        };
      });

      setGirasData(girasWithData);
      setTotalVacantes(vacantes?.length || 0);

    } catch (error) {
      console.error("Error dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATE OPTIMISTA ---
  const handleStatusUpdate = (giraId, sectionKey, newStatus) => {
      setGirasData(prev => prev.map(g => {
          if (g.id !== giraId) return g;
          return {
              ...g,
              statusMap: {
                  ...g.statusMap,
                  [sectionKey]: newStatus
              }
          };
      }));
  };

  const toggleFilterType = (type) => {
      setFilterTypes(prev => {
          const next = new Set(prev);
          if (next.has(type)) next.delete(type);
          else next.add(type);
          return next;
      });
  };

  const toggleFilterStatus = (status) => {
      setFilterStatus(prev => {
          const next = new Set(prev);
          if (next.has(status)) next.delete(status);
          else next.add(status);
          return next;
      });
  };

  // --- LÓGICA DE FILTRADO ---
  const filteredGiras = useMemo(() => {
    return girasData.filter((g) => {
      // 1. Filtro Tipo
      if (filterTypes.size > 0 && !filterTypes.has(g.tipo)) return false;
      
      // 2. NUEVO: Filtro Estado
      // Si es null (legacy), asumimos Borrador o Vigente. Aquí asumimos Borrador para obligar a actualizar.
      const estadoActual = g.estado || "Borrador";
      if (filterStatus.size > 0 && !filterStatus.has(estadoActual)) return false;

      // 3. Filtro Fechas
      if (filterDateStart && g.fecha_hasta < filterDateStart) return false;
      if (filterDateEnd && g.fecha_desde > filterDateEnd) return false;

      return true;
    });
  }, [girasData, filterTypes, filterDateStart, filterDateEnd, filterStatus]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <IconLoader className="animate-spin mr-2" /> Cargando...
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      
      {/* HEADER FIJO */}
      <div className="bg-white border-b border-slate-200 shadow-sm z-10 flex-shrink-0 flex flex-col">
        
        {/* Fila Superior: Título y Badges */}
        <div className="p-6 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <IconSpiralNotebook className="text-indigo-600" /> Dashboard General
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Visión general operativa.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 flex flex-col items-center min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Activas
              </span>
              <span className="text-xl font-bold text-indigo-600">
                {girasData.length}
              </span>
            </div>
            <div className={`px-4 py-2 rounded-xl border flex flex-col items-center min-w-[100px] ${totalVacantes > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${totalVacantes > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
                Vacantes
              </span>
              <span className={`text-xl font-bold ${totalVacantes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {totalVacantes}
              </span>
            </div>
          </div>
        </div>

        {/* Fila Inferior: Barra de Filtros */}
        <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mr-2 shrink-0">
                <IconFilter size={14}/> Filtrar:
            </div>

            {/* Toggles de Tipo */}
            <div className="flex flex-wrap gap-2">
                {PROGRAM_TYPES.map(type => {
                    const isActive = filterTypes.has(type);
                    return (
                        <button
                            key={type}
                            onClick={() => toggleFilterType(type)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                isActive 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {type}
                        </button>
                    )
                })}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

            {/* NUEVO: Toggles de Estado */}
            <div className="flex items-center gap-1">
                {['Vigente', 'Borrador', 'Pausada'].map(status => {
                    const isActive = filterStatus.has(status);
                    const colors = {
                        'Vigente': isActive ? 'bg-green-100 text-green-700 border-green-200' : 'text-slate-500 hover:bg-white bg-slate-100 border-transparent',
                        'Borrador': isActive ? 'bg-slate-200 text-slate-700 border-slate-300' : 'text-slate-500 hover:bg-white bg-slate-100 border-transparent',
                        'Pausada': isActive ? 'bg-amber-100 text-amber-700 border-amber-200' : 'text-slate-500 hover:bg-white bg-slate-100 border-transparent'
                    };
                    
                    return (
                        <button
                            key={status}
                            onClick={() => toggleFilterStatus(status)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${colors[status]}`}
                        >
                            {status}
                        </button>
                    )
                })}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

            {/* Filtro Fechas */}
            <div className="flex items-center gap-2">
                <div className="w-32">
                    <DateInput 
                        value={filterDateStart}
                        onChange={(val) => setFilterDateStart(val)}
                        placeholder="Desde"
                    />
                </div>
                <span className="text-slate-400 text-xs">–</span>
                <div className="w-32">
                    <DateInput 
                        value={filterDateEnd}
                        onChange={(val) => setFilterDateEnd(val)}
                        placeholder="Hasta"
                    />
                </div>
            </div>
            
            {/* Botón Limpiar */}
            {(filterDateStart !== todayISO || filterDateEnd || filterTypes.size < PROGRAM_TYPES.length || filterStatus.size < 2) && (
                <button 
                    onClick={() => {
                        setFilterTypes(new Set(PROGRAM_TYPES));
                        setFilterStatus(new Set(["Vigente", "Pausada"])); // Reset default
                        setFilterDateStart(todayISO);
                        setFilterDateEnd("");
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline ml-auto font-medium"
                >
                    Resetear
                </button>
            )}
        </div>
      </div>

      {/* Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
        
        {/* LISTA DE TARJETAS */}
        <div className="flex flex-col gap-4 pb-20">
          <div className="flex justify-between items-end">
             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Giras Filtradas {filteredGiras.length !== girasData.length && <span className="text-indigo-500">({filteredGiras.length})</span>}
             </h2>
          </div>

          {filteredGiras.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <IconMap size={32} className="mx-auto mb-2 opacity-50"/>
                  <p>No hay giras que coincidan con los filtros actuales.</p>
              </div>
          ) : (
              filteredGiras.map((gira) => (
                <DashboardTourCard
                  key={gira.id}
                  gira={gira}
                  onViewChange={onViewChange}
                  supabase={supabase}
                  onStatusChange={handleStatusUpdate}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}