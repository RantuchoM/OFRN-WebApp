/**
 * src/services/giraService.js
 * Servicio autónomo para cálculos On-Demand en el Dashboard
 */

/**
 * 1. FUNCIÓN INTERNA (NO EXPORTADA)
 * Resuelve los IDs de los integrantes de una gira basándose en las fuentes (Ensambles, Familias)
 * y las excepciones manuales (giras_integrantes).
 */
const resolveGiraRosterIds = async (supabase, giraId) => {
  try {
    // A. Traemos configuración de fuentes y overrides
    const [fuentesRes, overridesRes] = await Promise.all([
      supabase.from('giras_fuentes').select('*').eq('id_gira', giraId),
      supabase.from('giras_integrantes').select('id_integrante, estado').eq('id_gira', giraId)
    ]);

    const fuentes = fuentesRes.data || [];
    const overrides = overridesRes.data || [];
    
    let integrantesIds = new Set();

    // B. Resolver fuentes dinámicas
    // Por Ensamble
    const ensambleIds = fuentes
      .filter(f => f.tipo === 'ENSAMBLE')
      .map(f => f.valor_id);
      
    if (ensambleIds.length > 0) {
      const { data: ensambleMembers } = await supabase
        .from('integrantes_ensambles')
        .select('id_integrante')
        .in('id_ensamble', ensambleIds);
      
      ensambleMembers?.forEach(i => integrantesIds.add(i.id_integrante));
    }

    // Por Familia de Instrumento
    const familias = fuentes
      .filter(f => f.tipo === 'FAMILIA')
      .map(f => f.valor_texto);
      
    if (familias.length > 0) {
      // Nota: Ajusta 'instrumento_familia' si tu columna se llama diferente en la DB
      // o si requieres un join con la tabla instrumentos.
      // Asumimos que en la tabla integrantes existe esa columna o similar.
      const { data: familiaMembers } = await supabase
        .from('integrantes')
        .select('id')
        .in('instrumento_familia', familias); 
        
      familiaMembers?.forEach(i => integrantesIds.add(i.id));
    }

    // C. Procesar Overrides (giras_integrantes)
    // Agregamos a los que están forzados manualmente (Staff, invitados, o correcciones)
    overrides.forEach(o => {
      if (o.estado !== 'ausente') {
        integrantesIds.add(o.id_integrante);
      }
    });

    // D. Aplicar Bajas/Ausentes
    // Si alguien está marcado como 'ausente' en giras_integrantes, lo sacamos.
    const ausentesIds = new Set(
      overrides.filter(o => o.estado === 'ausente').map(o => o.id_integrante)
    );

    // Convertimos a array filtrando los ausentes
    return Array.from(integrantesIds).filter(id => !ausentesIds.has(id));

  } catch (error) {
    console.error("[GiraService] Error resolviendo roster IDs:", error);
    return [];
  }
};

/**
 * 2. FUNCIÓN PRINCIPAL (EXPORTADA)
 * Devuelve el Roster con datos de Logística (Habitación, Transporte)
 * para ser consumido por los calculadores de estadísticas.
 */
export const getEnrichedRosterOnDemand = async (supabase, giraId) => {
  try {
    // 1. Obtener la lista limpia de IDs de personas que viajan
    const finalRosterIds = await resolveGiraRosterIds(supabase, giraId);
    
    if (!finalRosterIds || finalRosterIds.length === 0) return [];

    // 2. Traer datos en paralelo:
    //    - Detalles de las personas
    //    - Habitaciones asignadas en esta gira
    //    - Transportes asignados en esta gira
    const [paxRes, hospedajesRes, transportesRes] = await Promise.all([
      supabase
        .from('integrantes')
        .select('*, localidades(localidad)')
        .in('id', finalRosterIds),
      
      supabase
        .from('programas_hospedajes')
        .select('id, hospedaje_habitaciones(*)')
        .eq('id_programa', giraId),
        
      supabase
        .from('giras_transportes')
        .select('id, pasajeros_ids')
        .eq('id_gira', giraId)
    ]);

    const fullRoster = paxRes.data || [];
    
    // Aplanamos todas las habitaciones de todos los hoteles de la gira
    // (hospedaje_habitaciones viene anidado dentro de cada hospedaje)
    const allRooms = hospedajesRes.data?.flatMap(h => h.hospedaje_habitaciones || []) || [];
    const allTransports = transportesRes.data || [];

    // 3. Cruzar datos (Enriquecer)
    return fullRoster.map(pax => {
      // Buscar si tiene habitación (el ID del integrante está en el array de asignados)
      const habitacion = allRooms.find(r => 
        r.id_integrantes_asignados?.includes(pax.id)
      ) || null;

      // Buscar si tiene transporte
      const transporte = allTransports.find(t => 
        t.pasajeros_ids?.includes(pax.id)
      ) || null;

      return {
        ...pax,
        habitacion,
        transporte,
        // Inyectamos estado 'confirmado' para que el filtro del calculator lo tome como activo
        estado_gira: 'confirmado' 
      };
    });

  } catch (error) {
    console.error("[GiraService] Error en enrichedRoster on demand:", error);
    return [];
  }
};