import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CONFIGURACIÓN ---
const FRONTEND_URL = "https://ofrn-web-app.vercel.app"; 

// --- HELPERS ---
const formatDateTime = (dateStr: string, timeStr: string) => {
  if (!dateStr) return null;
  const cleanDate = dateStr.replace(/-/g, "");
  let cleanTime = "000000";
  if (timeStr) {
    const parts = timeStr.split(":");
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1] ? parts[1].padStart(2, "0") : "00";
    const ss = parts[2] ? parts[2].split(".")[0].padStart(2, "0") : "00";
    cleanTime = `${hh}${mm}${ss}`;
  }
  return `${cleanDate}T${cleanTime}`;
};

const addHours = (dateStr: string, timeStr: string, hours: number) => {
  const d = new Date(`${dateStr}T${timeStr}`);
  d.setHours(d.getHours() + hours);
  const iso = d.toISOString();
  const [datePart, timePart] = iso.split("T");
  return formatDateTime(datePart, timePart.split(".")[0]);
};

const formatDateOnly = (dateStr: string) => {
  return dateStr.replace(/-/g, "");
};

const addDays = (dateStr: string, days: number) => {
  const date = new Date(dateStr);
  date.setUTCHours(12, 0, 0, 0); 
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0].replace(/-/g, "");
};

const cleanText = (text: string) => {
  if (!text) return "";
  return text.replace(/,/g, "\\,").replace(/\n/g, "\\n").replace(/;/g, "\\;");
};

serve(async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("uid");
  const mode = url.searchParams.get("mode");
  const debug = url.searchParams.get("debug") === "true";

  if (!userId) return new Response("Falta UID", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // 1. Obtener Perfil
  const { data: profile, error: profileError } = await supabase
    .from("integrantes")
    .select("*, instrumentos(familia), integrantes_ensambles(id_ensamble)")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return new Response(debug ? `Error perfil: ${JSON.stringify(profileError)}` : "Usuario no encontrado", { status: 404 });
  }

  const myEnsembles = new Set(
    profile.integrantes_ensambles?.map((ie: any) => ie.id_ensamble) || []
  );
  const myFamily = profile.instrumentos?.familia;
  
  const startDateFilter = '2024-01-01'; 

  // 2. Obtener Eventos
  const { data: eventos, error: eventosError } = await supabase
    .from("eventos")
    .select(`
      id, fecha, hora_inicio, hora_fin, descripcion, convocados, 
      tipos_evento(nombre, id_categoria), 
      locaciones(nombre, direccion),
      programas(
        id, nomenclador, nombre_gira, google_drive_folder_id,
        giras_integrantes(id_integrante, estado, rol),
        giras_fuentes(tipo, valor_id, valor_texto)
      ),
      eventos_programas_asociados(
        programas(id, nomenclador, nombre_gira)
      )
    `)
    .gte("fecha", startDateFilter)
    .order("fecha", { ascending: true });

  if (eventosError) {
      console.error("Error fetching eventos:", eventosError);
      if (debug) return new Response(`Error BD Eventos: ${JSON.stringify(eventosError)}`, { status: 500 });
  }

  // 3. Obtener Programas (Giras)
  const { data: allPrograms, error: progError } = await supabase
    .from("programas")
    .select(`
      id, nombre_gira, fecha_desde, fecha_hasta, nomenclador, mes_letra, zona, google_drive_folder_id,
      giras_integrantes(id_integrante, estado),
      giras_fuentes(tipo, valor_id, valor_texto)
    `)
    .gte("fecha_hasta", startDateFilter);

  if (progError) {
      console.error("Error fetching programas:", progError);
      if (debug) return new Response(`Error BD Programas: ${JSON.stringify(progError)}`, { status: 500 });
  }

  // --- LOGICA DE VISIBILIDAD ---
  const shouldShowItem = (item: any, isProgram = false) => {
    // A. Tags (Eventos)
    if (!isProgram && item.convocados && item.convocados.length > 0) {
      const tags = item.convocados;
      if (tags.includes("GRP:TUTTI")) return true;
      if (tags.includes("GRP:LOCALES") && profile.is_local) return true;
      if (tags.includes(`FAM:${myFamily}`)) return true;
      
      const locTag = tags.find((t: string) => t.startsWith("LOC:"));
      if (locTag) {
        const locId = parseInt(locTag.split(":")[1]);
        if (profile.id_localidad === locId) return true;
      }
    }

    // B. Programas (Giras o Eventos asociados)
    const prog = isProgram ? item : item.programas;
    
    // Si es evento de ensamble sin id_gira pero con programas asociados
    if (!isProgram && !prog && item.eventos_programas_asociados?.length > 0) {
       // Se asume visible si tiene programas múltiples
    }

    if (prog) {
      const myOverride = prog.giras_integrantes?.find(
        (gi: any) => String(gi.id_integrante) === String(userId)
      );
      if (myOverride) return myOverride.estado !== "ausente";

      const fuentes = prog.giras_fuentes || [];
      return fuentes.some(
        (s: any) =>
          (s.tipo === "ENSAMBLE" && myEnsembles.has(s.valor_id)) ||
          (s.tipo === "FAMILIA" && s.valor_texto === myFamily)
      );
    }
    
    return !isProgram && (!item.convocados || item.convocados.length === 0);
  };

  // Filtrado final
  const eventosFiltrados = (eventos || []).filter((e: any) => {
     if (!shouldShowItem(e, false)) return false;
     if (mode === 'essential') {
        const catId = e.tipos_evento?.id_categoria;
        if (catId != 1 && catId != 2) return false;
     }
     return true;
  });

  const programasFiltrados = (allPrograms || []).filter((p) => shouldShowItem(p, true));

  // --- GENERACIÓN ICS ---
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OrquestaManager//App//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Agenda Orquesta",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  // A. Eventos Puntuales (Ensayos, Conciertos, etc.)
  eventosFiltrados.forEach((evt: any) => {
    if (!evt.fecha || !evt.hora_inicio) return;

    const tipoNombre = evt.tipos_evento?.nombre || "Evento";
    let rawDesc = evt.descripcion || "";

    // -- 1. RESCATAR PROGRAMAS Y OBRAS --
    const listaObras: string[] = [];
    let mainProgramId = null; // ID para el enlace "Ver en App"
    
    // A. Desde Gira única
    if (evt.programas) {
        listaObras.push(evt.programas.nomenclador || evt.programas.nombre_gira);
        mainProgramId = evt.programas.id;
    }
    // B. Desde Múltiples programas (Ensayos Ensamble)
    if (evt.eventos_programas_asociados && evt.eventos_programas_asociados.length > 0) {
        evt.eventos_programas_asociados.forEach((ep: any) => {
            const p = ep.programas;
            if (p) {
                const nombre = p.nomenclador || p.nombre_gira;
                if (nombre) listaObras.push(nombre);
                // Si no hay programa principal asignado, tomamos el primero de la lista
                if (!mainProgramId) mainProgramId = p.id;
            }
        });
    }

    const obrasStr = listaObras.join(", ");

    if (obrasStr) {
       rawDesc = `[${obrasStr}] ${rawDesc}`;
    }

    const summary = `[${tipoNombre.toUpperCase()}] ${cleanText(rawDesc)}`;
    
    let descBody = `Tipo: ${tipoNombre}\\n${cleanText(evt.descripcion || "")}`;
    if (obrasStr) {
        descBody += `\\n\\nObras: ${cleanText(obrasStr)}`;
    }
    
    // -- 2. AGREGAR ENLACES --
    
    // Enlace a Drive (Solo si viene del programa principal)
    if (evt.programas && evt.programas.google_drive_folder_id) {
        const driveLink = `https://drive.google.com/drive/folders/${evt.programas.google_drive_folder_id}`;
        descBody += `\\n\\n📂 Drive: ${driveLink}`;
    }

    // NUEVO: Enlace a la App (Si encontramos algún programa asociado)
    if (mainProgramId) {
        const appLink = `${FRONTEND_URL}/?tab=giras&view=REPERTOIRE&giraId=${mainProgramId}`;
        descBody += `\\n\\n🔗 Ver en App:\\n${appLink}`;
    }

    const loc = `${cleanText(evt.locaciones?.nombre || "")} ${cleanText(evt.locaciones?.direccion || "")}`;
    const dtStart = formatDateTime(evt.fecha, evt.hora_inicio);
    let dtEnd;
    if (evt.hora_fin && evt.hora_fin !== evt.hora_inicio) {
      dtEnd = formatDateTime(evt.fecha, evt.hora_fin);
    } else {
      dtEnd = addHours(evt.fecha, evt.hora_inicio, 1);
    }

    icsLines.push(
      "BEGIN:VEVENT",
      `UID:evt_${evt.id}@orquestamanager.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${descBody}`,
      `LOCATION:${loc}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  });

  // B. Giras (Eventos de todo el día)
  programasFiltrados.forEach((prog: any) => {
    if (!prog.fecha_desde) return;

    const dtStart = formatDateOnly(prog.fecha_desde);
    const dtEnd = prog.fecha_hasta
      ? addDays(prog.fecha_hasta, 1)
      : addDays(prog.fecha_desde, 1);

    const zonaStr = prog.zona ? ` | ${prog.zona}` : "";
    const title = `🏁 ${prog.nomenclador || ""}${zonaStr}`;
    
    let description = `${cleanText(prog.nombre_gira || "")}`;
    
    // DRIVE LINK
    if (prog.google_drive_folder_id) {
        const driveLink = `https://drive.google.com/drive/folders/${prog.google_drive_folder_id}`;
        description += `\\n\\n📂 Carpeta Drive:\\n${driveLink}`;
    }
    
    // APP LINK
    const appLink = `${FRONTEND_URL}/?tab=giras&view=REPERTOIRE&giraId=${prog.id}`;
    description += `\\n\\n🔗 Ver en App:\\n${appLink}`;

    icsLines.push(
      "BEGIN:VEVENT",
      `UID:prog_${prog.id}@orquestamanager.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      "TRANSP:TRANSPARENT", 
      "END:VEVENT"
    );
  });

  icsLines.push("END:VCALENDAR");

  const responseText = icsLines.join("\r\n");

  if (debug) {
      return new Response(responseText, { headers: { "Content-Type": "text/plain" }});
  }

  return new Response(responseText, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda_orquesta.ics"`,
    },
  });
});