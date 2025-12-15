// src/components/roster/InstrumentationManager.jsx
import React, { useState, useMemo } from 'react';
import { IconMusic, IconLoader, IconEye } from '../ui/Icons'; // Asegúrate de que la ruta a Icons sea correcta
import { useGiraRoster } from '../../hooks/useGiraRoster'; // Ajusta la ruta a tu hook
import { calculateInstrumentation } from '../../utils/instrumentation'; // Ajusta la ruta a tu util

// --- SUB-COMPONENTE: Calcula y Muestra (Solo se monta al hacer click) ---
const InstrumentationCalculator = ({ supabase, gira }) => {
    const { roster, loading } = useGiraRoster(supabase, gira);

    const instrString = useMemo(() => {
        if (!roster || roster.length === 0) return null;
        
        // Filtramos solo confirmados y excluimos roles no orquestales
        const activeMusicians = roster.filter(r => 
            r.estado_gira === 'confirmado' && 
            !['director', 'solista', 'produccion', 'staff', 'chofer'].includes(r.rol_gira)
        );

        if (activeMusicians.length === 0) return "Sin músicos";

        const partsForCalc = activeMusicians.map((m) => ({
            instrumentos: m.instrumentos 
        }));

        const result = calculateInstrumentation(partsForCalc);
        return result || "0.0.0.0 - 0.0.0.0";
    }, [roster]);

    if (loading) {
        return (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                <IconLoader className="animate-spin" size={10} /> Calculando...
            </span>
        );
    }

    return (
        <span 
            className="flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 animate-in fade-in"
            title="Instrumentación calculada"
        >
            <IconMusic size={10} className="text-indigo-400" />
            {instrString}
        </span>
    );
};

// --- COMPONENTE PRINCIPAL: Botón de Activación ---
export default function InstrumentationManager({ supabase, gira }) {
    const [isActive, setIsActive] = useState(false);

    if (isActive) {
        return <InstrumentationCalculator supabase={supabase} gira={gira} />;
    }

    return (
        <button 
            onClick={(e) => {
                e.stopPropagation(); // Evita abrir la tarjeta de la gira
                setIsActive(true);
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-slate-100 px-2 py-0.5 rounded transition-all border border-transparent hover:border-slate-200"
            title="Calcular orgánico actual"
        >
            <IconEye size={12} />
            Orgánico
        </button>
    );
}