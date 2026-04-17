import { useState, useEffect, useCallback, useRef } from "react";
import { integranteKey } from "../utils/integranteIds";

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const inferDefaultTourRole = (member) => {
  const family = normalizeText(member?.instrumentos?.familia);
  const instrument = normalizeText(member?.instrumentos?.instrumento);
  const cargo = normalizeText(member?.cargo);
  const haystack = `${family} ${instrument} ${cargo}`;

  if (
    /\b(chofer|conductor)\b/.test(haystack) ||
    family === "chofer" ||
    instrument === "chofer"
  ) {
    return "chofer";
  }

  // Producción solo para perfiles explícitos de soporte técnico/producción.
  if (
    /\b(produccion|staff|iluminacion|fotografia|fotografo|foto|escenario|tecnico|tecnica|sonido|backline|roadie|asistente|asistencia|coordinacion|logistica|stage|montaje|audiovisual|prensa)\b/.test(
      haystack,
    )
  ) {
    return "produccion";
  }

  return "musico";
};

/**
 * Obtiene el roster completo de una gira (fuentes + overrides + lógica de negocio).
 * Reutilizable desde el hook useGiraRoster y desde handleDeleteGira (notificación de baja).
 * @returns {Promise<{ roster: Array, sources: Array }>}
 */
export async function fetchRosterForGira(supabase, gira) {
  if (!gira?.id) return { roster: [], sources: [] };

  const { data: fuentes, error: errFuentes } = await supabase
    .from("giras_fuentes")
    .select("*")
    .eq("id_gira", gira.id);
  if (errFuentes) throw errFuentes;

  const inclEnsembles = new Set();
  const inclFamilies = new Set();
  const exclEnsembles = new Set();
  fuentes?.forEach((f) => {
    if (f.tipo === "ENSAMBLE") inclEnsembles.add(f.valor_id);
    if (f.tipo === "FAMILIA") inclFamilies.add(f.valor_texto);
    if (f.tipo === "EXCL_ENSAMBLE") exclEnsembles.add(f.valor_id);
  });

  const { data: overrides, error: errOverrides } = await supabase
    .from("giras_integrantes")
    .select("id_integrante, estado, rol")
    .eq("id_gira", gira.id);
  if (errOverrides) throw errOverrides;

  const overrideMap = {};
  overrides?.forEach((o) => {
    const kid = integranteKey(o.id_integrante);
    if (!kid) return;
    overrideMap[kid] = { estado: o.estado, rol: o.rol };
  });

  const [membersEns, membersFam, membersExcl] = await Promise.all([
    inclEnsembles.size > 0
      ? supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", Array.from(inclEnsembles)).then((res) => res.data || [])
      : Promise.resolve([]),
    inclFamilies.size > 0
      ? supabase.from("integrantes").select("id, instrumentos!inner(familia)").eq("condicion", "Estable").in("instrumentos.familia", Array.from(inclFamilies)).then((res) => res.data || [])
      : Promise.resolve([]),
    exclEnsembles.size > 0
      ? supabase.from("integrantes_ensambles").select("id_integrante").in("id_ensamble", Array.from(exclEnsembles)).then((res) => res.data || [])
      : Promise.resolve([]),
  ]);

  const baseIncludedIds = new Set([
    ...membersEns.map((m) => integranteKey(m.id_integrante)),
    ...membersFam.map((m) => integranteKey(m.id)),
  ]);
  const excludedIds = new Set(
    membersExcl.map((m) => integranteKey(m.id_integrante)),
  );
  const manualIds = new Set(
    (overrides || []).map((o) => integranteKey(o.id_integrante)).filter(Boolean),
  );
  const allPotentialIds = new Set([
    ...baseIncludedIds,
    ...excludedIds,
    ...manualIds,
  ]);

  const allIds = Array.from(allPotentialIds).filter(Boolean);
  if (allIds.length === 0) return { roster: [], sources: fuentes || [] };
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < allIds.length; i += chunkSize) chunks.push(allIds.slice(i, i + chunkSize));

  const musiciansResults = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("integrantes")
        .select(
          `id, nombre, apellido, fecha_alta, fecha_baja, condicion, telefono, mail, alimentacion, es_simulacion, id_instr,
           id_localidad, id_loc_viaticos, id_domicilio_laboral, documentacion, docred, firma, nota_interna, cargo, jornada, motivo,
           dni, fecha_nac, genero, cuil,
           link_dni_img, link_cuil, link_cbu_img, link_declaracion,
           instrumentos(instrumento, familia, plaza_extra),
           residencia:localidades!id_localidad(id, localidad, id_region, regiones(region)),
           viaticos:localidades!id_loc_viaticos(id, localidad, id_region, regiones(region)),
           integrantes_ensambles(id_ensamble, ensambles(id, ensamble))`
        )
        // chunk son claves string unificadas; PostgREST acepta string para bigint
        .in(
          "id",
          chunk.map((k) => (Number.isSafeInteger(Number(k)) ? Number(k) : k)),
        )
    )
  );

  let musicians = [];
  for (const res of musiciansResults) {
    if (res.error) throw res.error;
    if (res.data) musicians = [...musicians, ...res.data];
  }

  const { data: tourLocs } = await supabase.from("giras_localidades").select("id_localidad").eq("id_gira", gira.id);
  const tourLocSet = new Set(tourLocs?.map((l) => l.id_localidad));

  const giraInicio = gira.fecha_desde ? new Date(gira.fecha_desde) : new Date();
  const giraFin = gira.fecha_hasta ? new Date(gira.fecha_hasta) : new Date();
  giraFin.setHours(23, 59, 59, 999);

  const finalRoster = [];
  musicians.forEach((m) => {
    const id = integranteKey(m.id);
    const manualData = overrideMap[id];
    const isManual = manualIds.has(id);
    const isExcluded = excludedIds.has(id);
    const isBaseIncluded = baseIncludedIds.has(id);

    const localidadEfectiva = m.viaticos || m.residencia;
    const processedMember = {
      ...m,
      localidades: localidadEfectiva,
      nombre_completo: `${m.apellido}, ${m.nombre}`,
      _loc_residencia: m.residencia,
      _loc_viaticos: m.viaticos,
      ensambles: m.integrantes_ensambles?.map((ie) => ie.ensambles) || [],
    };

    let keep = false;
    let estadoReal = "confirmado";
    let rolReal = inferDefaultTourRole(m);
    let esAdicional = false;

    let isBaseValid = false;
    if (isBaseIncluded && !isExcluded) {
      const alta = m.fecha_alta ? new Date(m.fecha_alta) : null;
      const baja = m.fecha_baja ? new Date(m.fecha_baja) : null;
      if ((!alta || alta <= giraFin) && (!baja || baja >= giraInicio)) isBaseValid = true;
    }
    // Convocatoria explícita en giras_integrantes debe verse siempre; si no, EXCL_ENSAMBLE
    // ocultaba filas aunque el INSERT ya hubiera creado el vínculo (409 "duplicado").
    if (isManual) {
      estadoReal = manualData?.estado ?? "confirmado";
      rolReal = manualData?.rol || rolReal;
      keep = true;
      esAdicional = isBaseValid ? false : estadoReal === "confirmado";
    } else if (isExcluded) {
      keep = false;
    } else {
      if (isBaseValid) {
        keep = true;
        estadoReal = "confirmado";
      }
    }

    if (keep) {
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

  const sorted = finalRoster.sort((a, b) => {
    if (a.estado_gira === "ausente" && b.estado_gira !== "ausente") return 1;
    if (a.estado_gira !== "ausente" && b.estado_gira === "ausente") return -1;
    const rolesPrio = { director: 1, solista: 2, musico: 3, produccion: 4, staff: 5, chofer: 6 };
    const pA = rolesPrio[a.rol_gira] || 99;
    const pB = rolesPrio[b.rol_gira] || 99;
    if (pA !== pB) return pA - pB;
    return (a.apellido || "").localeCompare(b.apellido || "");
  });

  return { roster: sorted, sources: fuentes || [] };
}

export function useGiraRoster(supabase, gira) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);
  const hasDataRef = useRef(false);

  const fetchRoster = useCallback(async () => {
    if (!gira?.id) {
      setLoading(false);
      return;
    }
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const { roster: nextRoster, sources: nextSources } = await fetchRosterForGira(supabase, gira);
      setRoster(nextRoster);
      setSources(nextSources);
      hasDataRef.current = true;
      return nextRoster;
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