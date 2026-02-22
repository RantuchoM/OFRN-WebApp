import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addDays, parseISO, differenceInCalendarDays } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, giraId, newStartDate, newName, notify } = await req.json();

    if (!giraId) throw new Error("Falta el ID de la gira (giraId)");

    // 1. DELETE (No requiere fecha)
    if (action === "delete") {
        console.log(`[INIT] Acción: DELETE | Gira ID: ${giraId}`);
        await deleteGira(supabaseClient, giraId);
        return new Response(JSON.stringify({ success: true, message: "Gira eliminada completamente" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 2. MOVE / DUPLICATE (Requieren fecha)
    if (!newStartDate) throw new Error("Faltan datos requeridos: newStartDate");

    const { data: originalGira, error: errGira } = await supabaseClient
      .from("programas")
      .select("*")
      .eq("id", giraId)
      .single();

    if (errGira || !originalGira) throw new Error(`Error leyendo gira original: ${errGira?.message || "No encontrada"}`);

    const daysDiff = differenceInCalendarDays(parseISO(newStartDate), parseISO(originalGira.fecha_desde));
    console.log(`[INIT] Acción: ${action} | Gira ID: ${giraId} | Delta: ${daysDiff} días`);

    if (action === "move") {
      await moveGira(supabaseClient, giraId, daysDiff);
      return new Response(
        JSON.stringify({ success: true, message: "Gira trasladada correctamente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "duplicate") {
      if (!newName) throw new Error("Se requiere newName para duplicar");

      const result = await duplicateGira(supabaseClient, originalGira, daysDiff, newName);

      return new Response(
        JSON.stringify({
          success: true,
          data: result.newGira,
          logs: result.logs,
          message: "Proceso de duplicación finalizado",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Acción no válida");
  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// ────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────
const shiftDate = (dateStr: string | null, days: number): string | null => {
  if (!dateStr) return null;
  const isTimestamp = dateStr.includes("T");
  const result = addDays(parseISO(dateStr), days);
  return isTimestamp ? result.toISOString() : result.toISOString().split("T")[0];
};

// ────────────────────────────────────────────────
// DUPLICACIÓN COMPLETA
// ────────────────────────────────────────────────
async function duplicateGira(
  supabase: any,
  original: any,
  days: number,
  newName: string
) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  // 1. CREAR NUEVA GIRA
  log("1. Insertando nueva gira...");
  const { data: newGira, error: errIns } = await supabase
    .from("programas")
    .insert({
      nombre_gira: newName,
      subtitulo: original.subtitulo,
      tipo: original.tipo,
      nomenclador: original.nomenclador,
      descripcion: original.descripcion,
      zona: original.zona,
      mes_letra: original.mes_letra,
      fecha_desde: shiftDate(original.fecha_desde, days),
      fecha_hasta: shiftDate(original.fecha_hasta, days),
      fecha_confirmacion_limite: shiftDate(
        original.fecha_confirmacion_limite,
        days
      ),
      google_drive_folder_id: null,
      estado: 'Borrador',
      token_publico: null,
    })
    .select()
    .single();

  if (errIns) throw errIns;

  const newGiraId = newGira.id;

  // DICCIONARIOS
  const mapTransportes: Record<string, number> = {};
  const mapEventos: Record<string, number> = {};

  // 2. FUENTES
  try {
    const { data: fuentes } = await supabase
      .from("giras_fuentes")
      .select("*")
      .eq("id_gira", original.id);

    if (fuentes?.length) {
      await supabase.from("giras_fuentes").insert(
        fuentes.map((f: any) => ({
          id_gira: newGiraId,
          tipo: f.tipo,
          valor_id: f.valor_id,
          valor_texto: f.valor_texto,
        }))
      );
      log(` -> OK. ${fuentes.length} fuentes copiadas.`);
    }
  } catch (e: any) {
    log(`Error Fuentes: ${e.message}`);
  }

  // 3. TRANSPORTES
  try {
    const { data: transportes } = await supabase
      .from("giras_transportes")
      .select("*")
      .eq("id_gira", original.id);

    if (transportes?.length) {
      for (const t of transportes) {
        const { data: newT, error } = await supabase
          .from("giras_transportes")
          .insert({
            id_gira: newGiraId,
            id_transporte: t.id_transporte,
            detalle: t.detalle,
            costo: t.costo,
            capacidad_maxima: t.capacidad_maxima,
          })
          .select()
          .single();

        if (error) throw error;
        mapTransportes[String(t.id)] = newT.id;
      }
      log(` -> OK. ${transportes.length} transportes copiados.`);
    }
  } catch (e: any) {
    log(`Error Transportes: ${e.message}`);
  }

  // 4. EVENTOS
  try {
    const { data: oldEvents } = await supabase
      .from("eventos")
      .select("*")
      .eq("id_gira", original.id);

    if (oldEvents?.length) {
      for (const ev of oldEvents) {
        const nuevoTransporteId = ev.id_gira_transporte
          ? mapTransportes[String(ev.id_gira_transporte)] ?? null
          : null;

        const { data: newEv, error } = await supabase
          .from("eventos")
          .insert({
            id_gira: newGiraId,
            id_tipo_evento: ev.id_tipo_evento,
            id_locacion: ev.id_locacion,
            fecha: shiftDate(ev.fecha, days),
            hora_inicio: ev.hora_inicio,
            hora_fin: ev.hora_fin,
            descripcion: ev.descripcion,
            convocados: ev.convocados,
            visible_agenda: ev.visible_agenda,
            google_event_id: null,
            id_gira_transporte: nuevoTransporteId,
          })
          .select()
          .single();

        if (error) throw error;
        mapEventos[String(ev.id)] = newEv.id;
      }
      log(` -> OK. ${oldEvents.length} eventos copiados.`);
    }
  } catch (e: any) {
    log(`Error Eventos: ${e.message}`);
  }

  // 5. REGLAS DE TRANSPORTE
  try {
    const oldTransportIds = Object.keys(mapTransportes);
    if (oldTransportIds.length) {
      const { data: rulesT } = await supabase
        .from("giras_logistica_reglas_transportes")
        .select("*")
        .in("id_gira_transporte", oldTransportIds);

      if (rulesT?.length) {
        const newRulesT = rulesT.map((rt: any) => ({
          id_gira_transporte: mapTransportes[String(rt.id_gira_transporte)],
          id_evento_subida: rt.id_evento_subida ? mapEventos[String(rt.id_evento_subida)] ?? null : null,
          id_evento_bajada: rt.id_evento_bajada ? mapEventos[String(rt.id_evento_bajada)] ?? null : null,
          detalle: rt.detalle,
          orden: rt.orden,
          alcance: rt.alcance,
          id_integrante: rt.id_integrante,
          id_region: rt.id_region,
          id_localidad: rt.id_localidad,
          instrumento_familia: rt.instrumento_familia,
          target_ids: rt.target_ids,
          es_exclusion: rt.es_exclusion,
          solo_logistica: rt.solo_logistica,
        }));

        const validRules = newRulesT.filter((r: any) => r.id_gira_transporte);
        if (validRules.length > 0) {
            await supabase.from("giras_logistica_reglas_transportes").insert(validRules);
            log(` -> OK. ${validRules.length} reglas de transporte insertadas.`);
        }
      }
    }
  } catch (e: any) {
    log(`Error Reglas Transporte: ${e.message}`);
  }

  // 6. INTEGRANTES
  try {
    const { data: roster } = await supabase.from("giras_integrantes").select("*").eq("id_gira", original.id);
    if (roster?.length) {
      const newRoster = roster.map((m: any) => ({
        id_gira: newGiraId,
        id_integrante: m.id_integrante,
        rol: m.rol,
        estado: "Pendiente",
        token_publico: null,
      }));
      await supabase.from("giras_integrantes").insert(newRoster);
      log(` → OK. ${roster.length} integrantes copiados.`);
    }
  } catch (e: any) {
    log(`Error Integrantes: ${e.message}`);
  }

  // 7. REGLAS LOGISTICAS (sin columnas de fecha; vinculadas por evento)
  try {
    const { data: reglas } = await supabase.from("giras_logistica_reglas").select("*").eq("id_gira", original.id);
    if (reglas?.length) {
      const newReglas = reglas.map((r: any) => ({
        id_gira: newGiraId,
        alcance: r.alcance,
        prioridad: r.prioridad,
        id_integrante: r.id_integrante,
        id_localidad: r.id_localidad,
        id_region: r.id_region,
        instrumento_familia: r.instrumento_familia,
        hora_checkin: r.hora_checkin,
        hora_checkout: r.hora_checkout,
        comida_inicio_servicio: r.comida_inicio_servicio,
        comida_fin_servicio: r.comida_fin_servicio,
        prov_desayuno: r.prov_desayuno,
        prov_almuerzo: r.prov_almuerzo,
        prov_merienda: r.prov_merienda,
        prov_cena: r.prov_cena,
        target_ids: r.target_ids,
      }));
      await supabase.from("giras_logistica_reglas").insert(newReglas);
      log(` → OK. ${reglas.length} reglas logísticas copiadas.`);
    }
  } catch (e: any) {
    log(`Error Reglas Logísticas: ${e.message}`);
  }

  // 8. AGENDA COMIDAS
  try {
    const { data: comidas } = await supabase.from("programas_agenda_comidas").select("*").eq("id_gira", original.id);
    if (comidas?.length) {
      const newComidas = comidas.map((c: any) => ({
        id_gira: newGiraId,
        fecha: shiftDate(c.fecha, days),
        servicio: c.servicio,
        convocados: c.convocados,
        hora: c.hora,
        visible_agenda: c.visible_agenda,
        descripcion: c.descripcion,
        id_locacion: c.id_locacion,
      }));
      await supabase.from("programas_agenda_comidas").insert(newComidas);
      log(` → OK. ${comidas.length} entradas de agenda de comidas copiadas.`);
    }
  } catch (e: any) {
    log(`Error Agenda Comidas: ${e.message}`);
  }

  // 9. REPERTORIO
  try {
    const { data: reps } = await supabase.from("programas_repertorios").select("*").eq("id_programa", original.id);
    if (reps?.length) {
      for (const rep of reps) {
        const { data: newRep, error: errRepIns } = await supabase
          .from("programas_repertorios")
          .insert({
            id_programa: newGiraId,
            nombre: rep.nombre,
            orden: rep.orden,
            google_drive_folder_id: null,
          })
          .select()
          .single();

        if (errRepIns) continue;

        if (newRep) {
          const { data: obras } = await supabase.from("repertorio_obras").select("*").eq("id_repertorio", rep.id);
          if (obras?.length) {
            const newObras = obras.map((o: any) => ({
              id_repertorio: newRep.id,
              id_obra: o.id_obra,
              orden: o.orden,
              notas_especificas: o.notas_especificas,
              id_solista: o.id_solista,
              usar_seating_provisorio: o.usar_seating_provisorio,
              seating_provisorio: o.seating_provisorio,
              excluir: o.excluir,
              google_drive_shortcut_id: null,
            }));
            await supabase.from("repertorio_obras").insert(newObras);
          }
        }
      }
      log(` → OK. ${reps.length} repertorios copiados.`);
    }
  } catch (e: any) {
    log(`Error Repertorio: ${e.message}`);
  }

  // 10. HOTELES
  try {
    const { data: hoteles } = await supabase.from("programas_hospedajes").select("*").eq("id_programa", original.id);
    if (hoteles?.length) {
      const newHoteles = hoteles.map((h: any) => ({
        id_programa: newGiraId,
        id_hotel: h.id_hotel,
      }));
      await supabase.from("programas_hospedajes").insert(newHoteles);
      log(` → OK. ${hoteles.length} hoteles copiados.`);
    }
  } catch (e: any) {
    log(`Error Hoteles: ${e.message}`);
  }

  // 11. DIFUSIÓN
  try {
    const { data: difusion } = await supabase.from("gira_difusion").select("*").eq("id_gira", original.id);
    if (difusion?.length) {
      const newDifusion = difusion.map((d: any) => ({
        id_gira: newGiraId,
        link_foto_home: d.link_foto_home,
        link_foto_banner: d.link_foto_banner,
        link_logo_1: d.link_logo_1,
        link_logo_2: d.link_logo_2,
        otros_comentarios: d.otros_comentarios,
      }));
      await supabase.from("gira_difusion").insert(newDifusion);
      log(` → OK. ${difusion.length} entradas de difusión copiadas.`);
    }
  } catch (e: any) {
    log(`Error Difusión: ${e.message}`);
  }

  // 12. DESTACQUES
  try {
    const { data: destaques } = await supabase.from("giras_destaques_config").select("*").eq("id_gira", original.id);
    if (destaques?.length) {
      const newDestaques = destaques.map((d: any) => ({
        id_gira: newGiraId,
        id_localidad: d.id_localidad,
        fecha_llegada: shiftDate(d.fecha_llegada, days),
        hora_llegada: d.hora_llegada,
        fecha_salida: shiftDate(d.fecha_salida, days),
        hora_salida: d.hora_salida,
        dias_computables: d.dias_computables,
        porcentaje_liquidacion: d.porcentaje_liquidacion,
      }));
      await supabase.from("giras_destaques_config").insert(newDestaques);
      log(` → OK. ${destaques.length} destaques copiados.`);
    }
  } catch (e: any) {
    log(`Error Destaques: ${e.message}`);
  }

  // 13. LOCALIDADES (¡NUEVO!)
  try {
    const { data: locs } = await supabase.from("giras_localidades").select("*").eq("id_gira", original.id);
    if (locs?.length) {
      const newLocs = locs.map((l: any) => ({
        id_gira: newGiraId,
        id_localidad: l.id_localidad
      }));
      await supabase.from("giras_localidades").insert(newLocs);
      log(` -> OK. ${locs.length} localidades copiadas.`);
    }
  } catch (e: any) {
    log(`Error Localidades: ${e.message}`);
  }

  return { newGira, logs };
}

// ────────────────────────────────────────────────
// LÓGICA DE TRASLADO (MOVE) — Modelo basado en eventos
// Solo programas (fecha_desde/hasta) + eventos (fecha). Reglas logísticas
// ya no tienen columnas de fecha; comidas/destaques/viáticos se mantienen.
// ────────────────────────────────────────────────
async function moveGira(supabase: any, giraId: number, days: number) {
  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  const { data: gira, error: errGira } = await supabase.from("programas").select("*").eq("id", giraId).single();
  if (errGira || !gira) throw new Error(errGira?.message || "Gira no encontrada");

  log("1. Actualizando fechas del programa...");
  const { error: errProg } = await supabase
    .from("programas")
    .update({
      fecha_desde: shiftDate(gira.fecha_desde, days),
      fecha_hasta: shiftDate(gira.fecha_hasta, days),
      fecha_confirmacion_limite: shiftDate(gira.fecha_confirmacion_limite, days),
    })
    .eq("id", giraId);
  if (errProg) throw errProg;

  log("2. Desplazando eventos...");
  const { data: eventos, error: errEv } = await supabase
    .from("eventos")
    .select("id, fecha")
    .eq("id_gira", giraId);
  if (errEv) throw errEv;
  if (eventos?.length) {
    for (const ev of eventos) {
      const { error: uErr } = await supabase
        .from("eventos")
        .update({ fecha: shiftDate(ev.fecha, days) })
        .eq("id", ev.id);
      if (uErr) throw uErr;
    }
    log(`   ${eventos.length} evento(s) actualizado(s).`);
  }

  log("3. Moviendo agenda de comidas...");
  const { data: comidas } = await supabase
    .from("programas_agenda_comidas")
    .select("id, fecha")
    .eq("id_gira", giraId);
  if (comidas?.length) {
    for (const c of comidas) {
      await supabase
        .from("programas_agenda_comidas")
        .update({ fecha: shiftDate(c.fecha, days) })
        .eq("id", c.id);
    }
  }

  log("4. Moviendo destaques...");
  const { data: destaques } = await supabase
    .from("giras_destaques_config")
    .select("*")
    .eq("id_gira", giraId);
  if (destaques?.length) {
    for (const d of destaques) {
      await supabase
        .from("giras_destaques_config")
        .update({
          fecha_llegada: shiftDate(d.fecha_llegada, days),
          fecha_salida: shiftDate(d.fecha_salida, days),
        })
        .eq("id", d.id);
    }
  }

  log("5. Moviendo viáticos...");
  const { data: viaticos } = await supabase
    .from("giras_viaticos_detalle")
    .select("*")
    .eq("id_gira", giraId);
  if (viaticos?.length) {
    for (const v of viaticos) {
      await supabase
        .from("giras_viaticos_detalle")
        .update({
          fecha_salida: shiftDate(v.fecha_salida, days),
          fecha_llegada: shiftDate(v.fecha_llegada, days),
        })
        .eq("id", v.id);
    }
  }

  log("✔ Gira movida correctamente");
  return { ok: true, logs };
}

// ────────────────────────────────────────────────
// ELIMINACIÓN EN CASCADA MANUAL
// ────────────────────────────────────────────────
async function deleteGira(supabase: any, giraId: number) {
    const log = (msg: string) => console.log(msg);
    log(`Iniciando borrado en cascada para Gira ${giraId}...`);

    // 1. REGLAS DE TRANSPORTE
    const { data: transportes } = await supabase.from("giras_transportes").select("id").eq("id_gira", giraId);
    if (transportes?.length) {
        const idsTransportes = transportes.map((t: any) => t.id);
        await supabase.from("giras_logistica_reglas_transportes").delete().in("id_gira_transporte", idsTransportes);
    }

    // 2. OBRAS DE REPERTORIO
    const { data: repertorios } = await supabase.from("programas_repertorios").select("id").eq("id_programa", giraId);
    if (repertorios?.length) {
        const idsReps = repertorios.map((r: any) => r.id);
        await supabase.from("repertorio_obras").delete().in("id_repertorio", idsReps);
    }

    // 3. HIJOS DIRECTOS
    await supabase.from("giras_transportes").delete().eq("id_gira", giraId);
    await supabase.from("programas_repertorios").delete().eq("id_programa", giraId);
    await supabase.from("eventos").delete().eq("id_gira", giraId);
    await supabase.from("giras_logistica_reglas").delete().eq("id_gira", giraId);
    await supabase.from("giras_integrantes").delete().eq("id_gira", giraId);
    await supabase.from("giras_fuentes").delete().eq("id_gira", giraId);
    await supabase.from("giras_progreso").delete().eq("id_gira", giraId);
    await supabase.from("programas_agenda_comidas").delete().eq("id_gira", giraId);
    await supabase.from("giras_destaques_config").delete().eq("id_gira", giraId);
    await supabase.from("giras_viaticos_detalle").delete().eq("id_gira", giraId);
    await supabase.from("giras_viaticos_config").delete().eq("id_gira", giraId); 
    await supabase.from("programas_hospedajes").delete().eq("id_programa", giraId);
    await supabase.from("gira_difusion").delete().eq("id_gira", giraId);
    await supabase.from("giras_localidades").delete().eq("id_gira", giraId);
    await supabase.from("giras_notificaciones_logs").delete().eq("id_gira", giraId);
    await supabase.from("giras_accesos").delete().eq("id_gira", giraId);

    // 4. ELIMINAR EL PADRE
    const { error } = await supabase.from("programas").delete().eq("id", giraId);
    
    if (error) {
        throw new Error(`Error eliminando la gira principal: ${error.message}`);
    }
    log("--- GIRA ELIMINADA CON ÉXITO ---");
}