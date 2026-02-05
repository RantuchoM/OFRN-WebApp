import { useState, useEffect, useCallback, useRef } from "react";

export function useGiraRoster(supabase, gira) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  
  // Referencia para evitar parpadeos de carga en re-renders
  const hasDataRef = useRef(false);

  const fetchRoster = useCallback(async () => {
    // Si no hay ID de gira, no hacemos nada
    if (!gira?.id) {
        setLoading(false);
        return;
    }
    
    // Solo activamos loading visual si no tenemos datos previos
    if (!hasDataRef.current) {
        setLoading(true);
    }
    
    setError(null);

    try {
      // 1. OBTENER FUENTES (Ensambles, Familias, Exclusiones)
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

      // 2. OBTENER OVERRIDES MANUALES (Agregados/Borrados puntuales en la gira)
      const { data: overrides, error: errOverrides } = await supabase
        .from("giras_integrantes")
        .select("id_integrante, estado, rol")
        .eq("id_gira", gira.id);

      if (errOverrides) throw errOverrides;

      const overrideMap = {};
      overrides?.forEach(
        (o) => (overrideMap[o.id_integrante] = { estado: o.estado, rol: o.rol })
      );

      // 3. RESOLVER IDS DE INTEGRANTES
      const [membersEns, membersFam, membersExcl] = await Promise.all([
        inclEnsembles.size > 0
          ? supabase
              .from("integrantes_ensambles")
              .select("id_integrante")
              .in("id_ensamble", Array.from(inclEnsembles))
              .then((res) => res.data || [])
          : Promise.resolve([]),
        inclFamilies.size > 0
          ? supabase
              .from("integrantes")
              .select("id, instrumentos!inner(familia)")
              .eq("condicion", "Estable")
              .in("instrumentos.familia", Array.from(inclFamilies))
              .then((res) => res.data || [])
          : Promise.resolve([]),
        exclEnsembles.size > 0
          ? supabase
              .from("integrantes_ensambles")
              .select("id_integrante")
              .in("id_ensamble", Array.from(exclEnsembles))
              .then((res) => res.data || [])
          : Promise.resolve([]),
      ]);

      const baseIncludedIds = new Set([
        ...membersEns.map((m) => m.id_integrante),
        ...membersFam.map((m) => m.id),
      ]);
      const excludedIds = new Set(membersExcl.map((m) => m.id_integrante));
      const manualIds = new Set(overrides.map((o) => o.id_integrante));

      const allPotentialIds = new Set([
        ...baseIncludedIds,
        ...excludedIds,
        ...manualIds,
      ]);

      if (allPotentialIds.size === 0) {
        setRoster([]);
        setLoading(false);
        hasDataRef.current = true;
        return;
      }

      // 4. OBTENER DATOS COMPLETOS (Chunking optimizado)
      const allIds = Array.from(allPotentialIds);
      const chunkSize = 20; 
      const chunks = [];
      for (let i = 0; i < allIds.length; i += chunkSize) {
        chunks.push(allIds.slice(i, i + chunkSize));
      }

      // CAMBIO CLAVE: AGREGAR integrantes_ensambles EN EL SELECT
      const musiciansResults = await Promise.all(
        chunks.map((chunk) => 
           supabase
            .from("integrantes")
            .select(
              `
                id, nombre, apellido, fecha_alta, fecha_baja, condicion, 
                telefono, mail, alimentacion, es_simulacion, id_instr,
                id_localidad, id_loc_viaticos,
                documentacion, docred, firma, nota_interna, cargo, jornada, motivo,
                dni, fecha_nac, genero, cuil,
                instrumentos(instrumento, familia, plaza_extra), 
                residencia:localidades!id_localidad(id, localidad, id_region, regiones(region)), 
                viaticos:localidades!id_loc_viaticos(id, localidad, id_region, regiones(region)),
                integrantes_ensambles(
                    id_ensamble,
                    ensambles(id, ensamble)
                )
            `
            )
            .in("id", chunk)
        )
      );

      let musicians = [];
      for (const res of musiciansResults) {
          if (res.error) throw res.error;
          if (res.data) musicians = [...musicians, ...res.data];
      }

      // 5. OBTENER LOCALIDADES DE LA GIRA (Para marcar quién es local)
      const { data: tourLocs } = await supabase
        .from("giras_localidades")
        .select("id_localidad")
        .eq("id_gira", gira.id);

      const tourLocSet = new Set(tourLocs?.map((l) => l.id_localidad));

      // 6. PROCESAMIENTO Y LÓGICA DE NEGOCIO
      const giraInicio = gira.fecha_desde ? new Date(gira.fecha_desde) : new Date();
      const giraFin = gira.fecha_hasta ? new Date(gira.fecha_hasta) : new Date();
      giraFin.setHours(23, 59, 59, 999);

      const finalRoster = [];

      musicians.forEach((m) => {
        const id = m.id;
        const manualData = overrideMap[id];
        const isManual = manualIds.has(id);
        const isExcluded = excludedIds.has(id);
        const isBaseIncluded = baseIncludedIds.has(id);

        // --- LÓGICA DE UBICACIÓN (Prioridad: Viáticos > Residencia) ---
        const localidadEfectiva = m.viaticos || m.residencia;
        
        // Creamos el objeto procesado
        const processedMember = {
            ...m,
            localidades: localidadEfectiva, // Fallback aplicado
            nombre_completo: `${m.apellido}, ${m.nombre}`,
            // Preservamos los originales por si se necesitan
            _loc_residencia: m.residencia,
            _loc_viaticos: m.viaticos,
            // Aplanamos la estructura de ensambles para facilitar el uso en la vista
            ensambles: m.integrantes_ensambles?.map(ie => ie.ensambles) || []
        };

        let keep = false;
        let estadoReal = "confirmado";
        let rolReal = "musico";
        let esAdicional = false;

        // Validar vigencia de contrato (fechas alta/baja)
        let isBaseValid = false;
        if (isBaseIncluded && !isExcluded) {
          const alta = m.fecha_alta ? new Date(m.fecha_alta) : null;
          const baja = m.fecha_baja ? new Date(m.fecha_baja) : null;
          const startsBeforeEnd = !alta || alta <= giraFin;
          const endsAfterStart = !baja || baja >= giraInicio;
          if (startsBeforeEnd && endsAfterStart) {
            isBaseValid = true;
          }
        }

        // Auto-detectar Producción desde familia de instrumento
        if (m.instrumentos?.familia?.includes("Prod")) {
          rolReal = "produccion";
        }

        // Aplicar lógica de inclusión
        if (isManual) {
          estadoReal = manualData.estado;
          rolReal = manualData.rol || rolReal;
          keep = true;
          if (isBaseValid) {
            esAdicional = false; // Era base, se modificó manualmente
          } else {
            esAdicional = estadoReal === "confirmado"; // No era base, se agregó manualmente
          }
        } else {
          if (isBaseValid) {
            keep = true;
            estadoReal = "confirmado";
            esAdicional = false;
          }
        }

        if (keep) {
          // Determinar si es local basado en la localidad efectiva
          const locationId = localidadEfectiva?.id;
          const isLocal = locationId ? tourLocSet.has(locationId) : false;

          finalRoster.push({
            ...processedMember,
            estado_gira: estadoReal,
            rol_gira: rolReal,
            es_adicional: esAdicional,
            is_local: isLocal,
          });
        }
      });

      // Ordenamiento por jerarquía y apellido
      const sorted = finalRoster.sort((a, b) => {
        if (a.estado_gira === "ausente" && b.estado_gira !== "ausente") return 1;
        if (a.estado_gira !== "ausente" && b.estado_gira === "ausente") return -1;

        const rolesPrio = {
          director: 1,
          solista: 2,
          musico: 3,
          produccion: 4,
          staff: 5,
          chofer: 6,
        };
        const pA = rolesPrio[a.rol_gira] || 99;
        const pB = rolesPrio[b.rol_gira] || 99;

        if (pA !== pB) return pA - pB;
        return (a.apellido || "").localeCompare(b.apellido || "");
      });

      setRoster(sorted);
      hasDataRef.current = true;

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
    refreshRoster: fetchRoster,
  };
}