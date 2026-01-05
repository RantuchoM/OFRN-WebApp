import React, { useState, useEffect, useMemo } from "react";
import { 
    IconMapPin, 
    IconCheck, 
    IconUsers, 
    IconFileText, 
    IconCalendar, 
    IconClock,
    IconBus,
    IconLoader,
    IconAlertCircle
} from "../../../components/ui/Icons";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

export default function DestaquesLocationPanel({ roster, configs, onSaveConfig, onExportLocation }) {
  // Estado local para los inputs
  const [inputs, setInputs] = useState({});

  // 1. Agrupar Músicos por Localidad
  const groupedData = useMemo(() => {
    const groups = {};
    roster.forEach((p) => {
      // Usamos el ID de localidad resuelto en ViaticosManager (prioridad viáticos > residencia)
      // Si no tenemos ID (caso "Desconocida"), usamos un key genérico 'unknown'
      const locId = p.original_loc_viaticos || p.original_loc_residencia || 'unknown';
      const locName = p.localidad_nombre;

      if (!groups[locId]) {
        groups[locId] = { id: locId, name: locName, count: 0, people: [] };
      }
      groups[locId].people.push(p);
      groups[locId].count++;
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [roster]);

  // 2. Inicializar estado con configuraciones guardadas
  useEffect(() => {
    const initialInputs = {};
    groupedData.forEach(g => {
        const conf = configs[g.id] || {};
        initialInputs[g.id] = {
            fecha_salida: conf.fecha_salida || "",
            hora_salida: conf.hora_salida || "08:00",
            fecha_llegada: conf.fecha_llegada || "",
            hora_llegada: conf.hora_llegada || "20:00",
            dias_computables: conf.dias_computables || 0,
            monto_diario: conf.monto_diario || 0, // Mantenemos el monto para el cálculo
            patente: conf.patente || "" // Campo opcional
        };
    });
    setInputs(prev => ({ ...initialInputs, ...prev }));
  }, [configs, groupedData]);

  // 3. Helper para calcular días automáticamente
  const calculateDays = (salida, llegada) => {
    if (!salida || !llegada) return 0;
    const d1 = parseISO(salida);
    const d2 = parseISO(llegada);
    if (!isValid(d1) || !isValid(d2)) return 0;
    
    const diff = differenceInCalendarDays(d2, d1);
    // Lógica simple: Si es el mismo día cuenta como 1. Si son días distintos, diferencia + 1.
    // Ajusta esta fórmula según la regla de negocio de tu orquesta.
    return Math.max(0, diff + 1);
  };

  const handleInputChange = (locId, field, value) => {
    setInputs(prev => {
        const current = { ...prev[locId], [field]: value };
        
        // Recálculo automático de días si cambian las fechas
        if (field === 'fecha_salida' || field === 'fecha_llegada') {
            const dias = calculateDays(
                field === 'fecha_salida' ? value : current.fecha_salida,
                field === 'fecha_llegada' ? value : current.fecha_llegada
            );
            current.dias_computables = dias;
        }
        
        return { ...prev, [locId]: current };
    });
  };

  const handleSave = (group) => {
    const data = inputs[group.id];
    if (!data) return;
    
    // Validar mínimos
    if (data.dias_computables <= 0 && data.monto_diario <= 0) {
        if(!confirm("Estás guardando valores en 0. ¿Continuar?")) return;
    }

    onSaveConfig(group.id, data, group.people);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mt-8 overflow-hidden">
      <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center gap-3">
        <div className="bg-white p-2 rounded-full text-indigo-600 shadow-sm">
            <IconBus size={20} />
        </div>
        <div>
            <h3 className="font-bold text-indigo-900 text-sm">Logística y Destaques por Localidad</h3>
            <p className="text-xs text-indigo-600/80">Define horarios y montos masivos según el origen de los músicos.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="px-4 py-3 min-w-[150px]">Localidad</th>
                    <th className="px-2 py-3 text-center">Salida</th>
                    <th className="px-2 py-3 text-center">Llegada</th>
                    <th className="px-2 py-3 text-center w-20">Días</th>
                    <th className="px-2 py-3 text-center w-24">Monto Diario</th>
                    <th className="px-2 py-3 text-center w-24">Patente</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {groupedData.map(group => {
                    const data = inputs[group.id] || {};
                    return (
                        <tr key={group.id} className="hover:bg-slate-50 transition-colors group/row">
                            <td className="px-4 py-3">
                                <div className="font-bold text-slate-700">{group.name}</div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                    <IconUsers size={12}/> {group.count} personas
                                </div>
                            </td>
                            
                            {/* SALIDA */}
                            <td className="px-2 py-3 text-center">
                                <div className="flex flex-col gap-1 items-center">
                                    <input 
                                        type="date" 
                                        className="w-28 p-1 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                        value={data.fecha_salida || ""}
                                        onChange={(e) => handleInputChange(group.id, 'fecha_salida', e.target.value)}
                                    />
                                    <input 
                                        type="time" 
                                        className="w-20 p-1 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                        value={data.hora_salida || ""}
                                        onChange={(e) => handleInputChange(group.id, 'hora_salida', e.target.value)}
                                    />
                                </div>
                            </td>

                            {/* LLEGADA */}
                            <td className="px-2 py-3 text-center">
                                <div className="flex flex-col gap-1 items-center">
                                    <input 
                                        type="date" 
                                        className="w-28 p-1 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                        value={data.fecha_llegada || ""}
                                        onChange={(e) => handleInputChange(group.id, 'fecha_llegada', e.target.value)}
                                    />
                                    <input 
                                        type="time" 
                                        className="w-20 p-1 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                                        value={data.hora_llegada || ""}
                                        onChange={(e) => handleInputChange(group.id, 'hora_llegada', e.target.value)}
                                    />
                                </div>
                            </td>

                            {/* DÍAS */}
                            <td className="px-2 py-3 text-center">
                                <input 
                                    type="number" 
                                    className="w-14 p-1.5 border border-indigo-200 bg-indigo-50 rounded text-center text-indigo-700 font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={data.dias_computables || 0}
                                    onChange={(e) => handleInputChange(group.id, 'dias_computables', e.target.value)}
                                />
                            </td>

                            {/* MONTO */}
                            <td className="px-2 py-3 text-center">
                                <div className="relative inline-block w-20">
                                    <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                                    <input 
                                        type="number" 
                                        className="w-full pl-4 p-1.5 border border-slate-200 rounded text-right outline-none focus:border-indigo-500 text-xs"
                                        placeholder="0"
                                        value={data.monto_diario || ""}
                                        onChange={(e) => handleInputChange(group.id, 'monto_diario', e.target.value)}
                                    />
                                </div>
                            </td>

                            {/* PATENTE */}
                            <td className="px-2 py-3 text-center">
                                <input 
                                    type="text" 
                                    className="w-20 p-1.5 border border-slate-200 rounded text-center text-xs uppercase placeholder:normal-case outline-none focus:border-indigo-500"
                                    placeholder="Opcional"
                                    value={data.patente || ""}
                                    onChange={(e) => handleInputChange(group.id, 'patente', e.target.value)}
                                />
                            </td>

                            {/* ACCIONES */}
                            <td className="px-4 py-3 text-right">
                                <div className="flex flex-col gap-2 items-end">
                                    <button 
                                        onClick={() => handleSave(group)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded flex items-center gap-1 text-xs font-bold transition-colors shadow-sm w-fit"
                                    >
                                        <IconCheck size={14} /> Aplicar
                                    </button>
                                    <button 
                                        onClick={() => onExportLocation(group, data)}
                                        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 text-[10px] font-bold transition-colors w-fit"
                                    >
                                        <IconFileText size={12} /> Exportar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        {groupedData.length === 0 && (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                <IconAlertCircle size={24}/>
                <span>No se encontró información de localidades en el padrón.</span>
            </div>
        )}
      </div>
    </div>
  );
}