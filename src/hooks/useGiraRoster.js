import { useState, useEffect, useCallback } from 'react';

export function useGiraRoster(supabase, gira) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]); 

  const fetchRoster = useCallback(async () => {
    if (!gira?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener Fuentes
      const { data: fuentes, error: errFuentes } = await supabase
        .from("giras_fuentes")
        .select("*")
        .eq("id_gira", gira.id);

      if (errFuentes) throw errFuentes;
      setSources(fuentes || []);

      const inclEnsembles = new Set();
      const inclFamilies = new Set();
      const exclEnsembles = new Set();

      fuentes?.forEach((f) => {
        if (f.tipo === "ENSAMBLE") inclEnsembles.add(f.valor_id);
        if (f.tipo === "FAMILIA") inclFamilies.add(f.valor_texto);
        if (f.tipo === "EXCL_ENSAMBLE") exclEnsembles.add(f.valor_id);
      });

      // 2. Obtener Overrides Manuales
      const { data: overrides, error: errOverrides } = await supabase
        .from("giras_integrantes")
        .select("id_integrante, estado, rol")
        .eq("id_gira", gira.id);

      if (errOverrides) throw errOverrides;

      const overrideMap = {};
      overrides?.forEach((o) => (overrideMap[o.id_integrante] = { estado: o.estado, rol: o.rol }));

      // 3. Obtener IDs desde las fuentes
      const [membersEns, membersFam, membersExcl] = await Promise.all([
        inclEnsembles.size > 0 
            ? supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", Array.from(inclEnsembles)).then(res => res.data || []) 
            : Promise.resolve([]),
        inclFamilies.size > 0 
            ? supabase.from("integrantes")
                .select("id, instrumentos!inner(familia)")
                .eq("condicion", "Estable") 
                .in("instrumentos.familia", Array.from(inclFamilies))
                .then(res => res.data || []) 
            : Promise.resolve([]),
        exclEnsembles.size > 0 
            ? supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", Array.from(exclEnsembles)).then(res => res.data || []) 
            : Promise.resolve([]),
      ]);

      const baseIncludedIds = new Set([...membersEns.map((m) => m.id_integrante), ...membersFam.map((m) => m.id)]);
      const excludedIds = new Set(membersExcl.map((m) => m.id_integrante));
      const manualIds = new Set(overrides.map((o) => o.id_integrante));
      
      const allPotentialIds = new Set([...baseIncludedIds, ...excludedIds, ...manualIds]);

      if (allPotentialIds.size === 0) {
        setRoster([]);
        setLoading(false);
        return;
      }

      // 4. Obtener Datos Completos (CORRECCIÓN: Se agregaron dni, fecha_nacimiento, genero)
      const { data: musicians, error: errMusicians } = await supabase
        .from("integrantes")
        .select(`
            id, nombre, apellido, fecha_alta, fecha_baja, condicion, 
            telefono, mail, alimentacion, id_instr, id_localidad,
            documentacion, docred, firma,
            dni, fecha_nac, genero,
            instrumentos(instrumento, familia),
            localidades(localidad, id_region, regiones(region)) 
        `)
        .in("id", Array.from(allPotentialIds));

      if (errMusicians) throw errMusicians;

      // 5. Localidades de la Gira
      const { data: tourLocs } = await supabase
         .from('giras_localidades')
         .select('id_localidad')
         .eq('id_gira', gira.id);
      
      const tourLocSet = new Set(tourLocs?.map(l => l.id_localidad));

      // 6. PROCESAMIENTO FINAL
      const giraInicio = new Date(gira.fecha_desde);
      const giraFin = new Date(gira.fecha_hasta);
      giraFin.setHours(23, 59, 59, 999);

      const finalRoster = [];

      musicians.forEach((m) => {
        const id = m.id;
        const manualData = overrideMap[id];
        const isManual = manualIds.has(id);
        const isExcluded = excludedIds.has(id);
        const isBaseIncluded = baseIncludedIds.has(id);

        let keep = false;
        let estadoReal = "confirmado";
        let rolReal = "musico";
        let esAdicional = false;

        // B. Determinar si es miembro "Base" válido
        let isBaseValid = false;
        if (isBaseIncluded && !isExcluded) {
           const alta = m.fecha_alta ? new Date(m.fecha_alta) : null;
           const baja = m.fecha_baja ? new Date(m.fecha_baja) : null;
           // Lógica de fechas
           const startsBeforeEnd = !alta || (alta <= giraFin);
           const endsAfterStart = !baja || (baja >= giraInicio);
           if (startsBeforeEnd && endsAfterStart) {
               isBaseValid = true;
           }
        }

        // Determinar Rol Automático
        if (m.instrumentos?.familia?.includes('Prod')) {
            rolReal = 'produccion';
        }

        // C. Aplicar Lógica de Manual vs Automático
        if (isManual) {
            estadoReal = manualData.estado;
            rolReal = manualData.rol || rolReal;
            keep = true;
            if (isBaseValid) {
                esAdicional = false;
            } else {
                esAdicional = (estadoReal === 'confirmado');
            }
        } else {
            if (isBaseValid) {
                keep = true;
                estadoReal = "confirmado";
                esAdicional = false;
            }
        }

        if (keep) {
          finalRoster.push({
            ...m,
            estado_gira: estadoReal,
            rol_gira: rolReal,
            es_adicional: esAdicional,
            is_local: tourLocSet.has(m.id_localidad),
            nombre_completo: `${m.apellido}, ${m.nombre}`
          });
        }
      });

      // Ordenamiento
      const sorted = finalRoster.sort((a, b) => {
         if (a.estado_gira === 'ausente' && b.estado_gira !== 'ausente') return 1;
         if (a.estado_gira !== 'ausente' && b.estado_gira === 'ausente') return -1;
         
         const rolesPrio = { director: 1, solista: 2, musico: 3, produccion: 4, staff: 5, chofer: 6 };
         const pA = rolesPrio[a.rol_gira] || 99;
         const pB = rolesPrio[b.rol_gira] || 99;
         
         if (pA !== pB) return pA - pB;
         return (a.apellido || "").localeCompare(b.apellido || "");
      });

      setRoster(sorted);

    } catch (err) {    
      console.error("Error fetching roster:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, gira?.id, gira?.fecha_desde, gira?.fecha_hasta]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  return { 
    roster, 
    loading, 
    error, 
    sources,
    refreshRoster: fetchRoster 
  };
}