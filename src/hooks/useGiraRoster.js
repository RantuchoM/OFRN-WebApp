// src/hooks/useGiraRoster.js
import { useState, useEffect, useCallback } from 'react';

export function useGiraRoster(supabase, gira) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]); // Para saber qué ensambles/familias componen la gira

  const fetchRoster = useCallback(async () => {
    if (!gira?.id) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener Fuentes (Ensambles, Familias, Exclusiones)
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

      // 2. Obtener Overrides Manuales (Giras Integrantes)
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
            ? supabase.from("integrantes").select("id, instrumentos!inner(familia)").in("instrumentos.familia", Array.from(inclFamilies)).then(res => res.data || []) 
            : Promise.resolve([]),
        exclEnsembles.size > 0 
            ? supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", Array.from(exclEnsembles)).then(res => res.data || []) 
            : Promise.resolve([]),
      ]);

      const baseIncludedIds = new Set([...membersEns.map((m) => m.id_integrante), ...membersFam.map((m) => m.id)]);
      const excludedIds = new Set(membersExcl.map((m) => m.id_integrante));
      const manualIds = new Set(overrides.map((o) => o.id_integrante));
      
      // Unión de todos los IDs potenciales
      const allPotentialIds = new Set([...baseIncludedIds, ...excludedIds, ...manualIds]);

      if (allPotentialIds.size === 0) {
        setRoster([]);
        setLoading(false);
        return;
      }

      // 4. Obtener Datos Completos de los Integrantes
      const { data: musicians, error: errMusicians } = await supabase
        .from("integrantes")
        .select(`
            id, nombre, apellido, fecha_alta, fecha_baja, condicion, 
            telefono, mail, alimentacion, id_instr, id_localidad,
            instrumentos(instrumento, familia),
            localidades(localidad, regiones(region))
        `)
        .in("id", Array.from(allPotentialIds));

      if (errMusicians) throw errMusicians;

      // 5. Obtener Localidades de la Gira (para calcular is_local)
      const { data: tourLocs } = await supabase
         .from('giras_localidades')
         .select('id_localidad')
         .eq('id_gira', gira.id);
      
      const tourLocSet = new Set(tourLocs?.map(l => l.id_localidad));

      // 6. PROCESAMIENTO FINAL (La "Lógica de Negocio")
      const giraInicio = new Date(gira.fecha_desde);
      const giraFin = new Date(gira.fecha_hasta);
      const finalRoster = [];

      musicians.forEach((m) => {
        const id = m.id;
        const manualData = overrideMap[id];
        const isBaseIncluded = baseIncludedIds.has(id);
        const isExcluded = excludedIds.has(id);
        const isManual = manualIds.has(id);

        let keep = false;
        let estadoReal = "confirmado";
        let rolReal = "musico";
        let esAdicional = false;

        // Regla: Familia 'Prod.' implica rol producción por defecto
        if (!isManual && m.instrumentos?.familia?.includes('Prod')) {
            rolReal = 'produccion';
        }

        if (isManual) {
          estadoReal = manualData.estado;
          rolReal = manualData.rol;
          // Si está manual y confirmado, es un "Adicional" (alguien agregado a mano)
          if (estadoReal === "confirmado") {
            keep = true;
            esAdicional = true;
          } else if (estadoReal === "ausente") {
             // Si está manual como ausente, se mantiene en la lista pero marcado como ausente
             keep = true;
             esAdicional = false; 
          }
        } else {
          // Si viene por fuentes automáticas
          if (isBaseIncluded && !isExcluded) {
            // Chequeo de fechas de alta/baja
            if ((m.fecha_alta && new Date(m.fecha_alta) > giraInicio) || (m.fecha_baja && new Date(m.fecha_baja) < giraFin)) {
              keep = false; // No estaba activo en las fechas de la gira
            } else {
              keep = true;
            }
          }
        }

        if (keep) {
          finalRoster.push({
            ...m,
            // Propiedades calculadas estandarizadas
            estado_gira: estadoReal,
            rol_gira: rolReal,
            es_adicional: esAdicional,
            is_local: tourLocSet.has(m.id_localidad), // Calculado centralmente
            nombre_completo: `${m.apellido}, ${m.nombre}` // Helper útil
          });
        }
      });

      // Ordenamiento por defecto (Rol > Apellido)
      const sorted = finalRoster.sort((a, b) => {
         // Ausentes al final
         if (a.estado_gira === 'ausente' && b.estado_gira !== 'ausente') return 1;
         if (a.estado_gira !== 'ausente' && b.estado_gira === 'ausente') return -1;
         
         const rolesPrio = { director: 1, solista: 2, musico: 3, produccion: 4, staff: 5, chofer: 6 };
         const pA = rolesPrio[a.rol_gira] || 99;
         const pB = rolesPrio[b.rol_gira] || 99;
         
         if (pA !== pB) return pA - pB;
         return a.apellido.localeCompare(b.apellido);
      });

      setRoster(sorted);

    } catch (err) {
      console.error("Error fetching roster:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, gira?.id, gira?.fecha_desde, gira?.fecha_hasta]);

  // Cargar al inicio o al cambiar la gira
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