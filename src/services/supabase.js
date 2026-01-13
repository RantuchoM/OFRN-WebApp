import { createClient } from '@supabase/supabase-js';

// En un proyecto real, esto iría en un archivo .env, pero para empezar está bien aquí
const SB_URL = "https://muxrbuivopnawnxlcjxq.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11eHJidWl2b3BuYXdueGxjanhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODI5MzIsImV4cCI6MjA4MDM1ODkzMn0._tMDAJg2r5vfR1y0JPYd3LVDB66CcyXtj5dY4RqrxIg";

export const supabase = createClient(SB_URL, SB_KEY);
export const resolveGiraRosterIds = async (supabase, giraId) => {
    const [fuentes, overrides] = await Promise.all([
        supabase.from('giras_fuentes').select('*').eq('id_gira', giraId),
        supabase.from('giras_integrantes').select('id_integrante, estado').eq('id_gira', giraId)
    ]);

    let ids = new Set();
    
    // Resolver fuentes dinámicas
    for (const f of (fuentes.data || [])) {
        if (f.tipo === 'ENSAMBLE' && f.valor_id) {
            const { data } = await supabase.from('integrantes_ensambles').select('id_integrante').eq('id_ensamble', f.valor_id);
            data?.forEach(i => ids.add(i.id_integrante));
        } else if (f.tipo === 'FAMILIA' && f.valor_texto) {
            const { data } = await supabase.from('integrantes').select('id').eq('familia_instrumento', f.valor_texto);
            data?.forEach(i => ids.add(i.id));
        }
    }

    // Overrides
    const manuales = (overrides.data || []).filter(o => o.estado !== 'ausente');
    const ausentes = new Set((overrides.data || []).filter(o => o.estado === 'ausente').map(o => o.id_integrante));
    
    manuales.forEach(o => ids.add(o.id_integrante));
    return Array.from(ids).filter(id => !ausentes.has(id));
};