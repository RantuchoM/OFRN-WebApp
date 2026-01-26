import React, { useMemo } from 'react';

export default function FoodMatrix({ roster }) {
  const { matrix, columns } = useMemo(() => {
    // 1. Filtrar ausentes para que solo cuenten los incluidos actualmente
    const activeRoster = (roster || []).filter(p => p.estado_gira !== 'ausente');

    // 2. Detectar todos los tipos de alimentación únicos en el personal activo
    const dietTypes = [...new Set(activeRoster.map(p => (p.alimentacion || 'Estándar').trim()))];
    
    // 3. Inicializar la estructura de datos
    const initialMatrix = {
      loc: { tot: 0 },
      viaj: { tot: 0 },
      total: { tot: 0 }
    };
    
    dietTypes.forEach(type => {
      initialMatrix.loc[type] = 0;
      initialMatrix.viaj[type] = 0;
      initialMatrix.total[type] = 0;
    });

    // 4. Llenar la matriz con los datos del personal activo
    activeRoster.forEach(p => {
      const row = p.is_local ? 'loc' : 'viaj';
      const type = (p.alimentacion || 'Estándar').trim();
      
      initialMatrix[row][type]++;
      initialMatrix[row].tot++;
      initialMatrix.total[type]++;
      initialMatrix.total.tot++;
    });

    return { matrix: initialMatrix, columns: dietTypes };
  }, [roster]);

  // Si no hay nadie activo, no renderizamos el cuadro
  if (matrix.total.tot === 0) return null;

  const cellClass = "px-1.5 py-0.5 text-right text-[10px]";
  const labelClass = "px-1.5 py-0.5 text-left text-[10px] font-bold text-slate-500";

  return (
    <div className="inline-block bg-white border border-slate-200 rounded-lg p-2 shadow-sm select-none leading-tight">
      <table className="border-collapse">
        <thead>
          <tr className="text-slate-400 font-bold text-[9px] uppercase tracking-tighter">
            <th className="px-1"></th>
            {columns.map(col => (
              <th key={col} className={cellClass} title={col}>
                {col.substring(0, 4)}
              </th>
            ))}
            <th className={`${cellClass} text-slate-300`}>Tot</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {/* Fila Locales */}
          <tr>
            <td className={labelClass}>Loc</td>
            {columns.map(col => (
              <td key={col} className={`${cellClass} font-semibold text-slate-600`}>{matrix.loc[col]}</td>
            ))}
            <td className={`${cellClass} text-slate-400 font-medium`}>{matrix.loc.tot}</td>
          </tr>
          {/* Fila Viajantes */}
          <tr>
            <td className={labelClass}>Viaj</td>
            {columns.map(col => (
              <td key={col} className={`${cellClass} font-semibold text-slate-600`}>{matrix.viaj[col]}</td>
            ))}
            <td className={`${cellClass} text-slate-400 font-medium`}>{matrix.viaj.tot}</td>
          </tr>
          {/* Fila Totales */}
          <tr className="border-t border-slate-200 bg-slate-50/50">
            <td className={`${labelClass} text-indigo-600`}>Total</td>
            {columns.map(col => (
              <td key={col} className={`${cellClass} font-bold text-indigo-600`}>{matrix.total[col]}</td>
            ))}
            <td className={`${cellClass} font-black text-indigo-700`}>{matrix.total.tot}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}