import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FRONTEND_URL = "https://ofrn-web-app.vercel.app";

// --- HELPERS (Mantener iguales) ---
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
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hh, mm, ss] = (timeStr || "00:00:00").split(":").map(Number);
  const d = new Date(year, month - 1, day, hh, mm, ss || 0);
  d.setHours(d.getHours() + hours);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
};

const formatDateOnly = (dateStr: string) => dateStr.replace(/-/g, "");

const addDays = (dateStr: string, days: number) => {
  const date = new Date(dateStr);
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0].replace(/-/g, "");
};

const cleanText = (text: string, stripNewlines = false) => {
  if (!text) return "";
  let processed = text.replace(/<[^>]*>/g, "").replace(/,/g, "\\,").replace(/;/g, "\\;");
  return stripNewlines ? processed.replace(/\r?\n|\r/g, " ").trim() : processed.replace(/\n/g, "\\n");
};

const membershipActiveOnProgramDate = (row: any, ref: string): boolean => {
  const refD = String(ref || "").slice(0, 10);
  const from = row?.fecha_desde ? String(row.fecha_desde).slice(0, 10) : "";
  const until = row?.fecha_hasta != null && row?.fecha_hasta !== "" ? String(row.fecha_hasta).slice(0, 10) : null;
  return refD >= from && (until === null || refD <= until);
};

serve(async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("uid");
  const mode = url.searchParams.get("mode");
  const isAdmin = url.searchParams.get("admin") === "true"; // Nuevo
  const adminType = url.searchParams.get("type"); // Nuevo (ej: "Sinfónico")
  const debug = url.searchParams.get("debug") === "true";
  if (!userId && !isAdmin) return new Response("Falta UID o Auth", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let profile = null;
  if (!isAdmin) {
    const { data } = await supabase.from("integrantes").select("*, instrumentos(familia), integrantes_ensambles(id_ensamble, fecha_desde, fecha_hasta)").eq("id", userId).single();
    profile = data;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateFilter = thirtyDaysAgo.toISOString().split('T')[0];

  const { data: eventos } = await supabase
    .from("eventos")
    .select(`
      id, fecha, hora_inicio, hora_fin, descripcion, convocados, 
      tipos_evento(nombre, id_categoria), locaciones(nombre, direccion),
      programas(id, nomenclador, nombre_gira, google_drive_folder_id, fecha_desde, fecha_hasta, tipo, zona, giras_integrantes(id_integrante, estado, rol), giras_fuentes(tipo, valor_id, valor_texto)),
      eventos_programas_asociados(programas(id, nomenclador, nombre_gira, google_drive_folder_id, fecha_desde, fecha_hasta, zona, giras_integrantes(id_integrante, estado, rol), giras_fuentes(tipo, valor_id, valor_texto)))
    `)
    .gte("fecha", startDateFilter)
    .or("is_deleted.eq.false,is_deleted.is.null")
    .order("fecha", { ascending: true })
    .limit(1000);


  const { data: allPrograms } = await supabase
    .from("programas")
    .select(`id, nombre_gira, fecha_desde, fecha_hasta, nomenclador, mes_letra, zona, google_drive_folder_id, tipo, giras_integrantes(id_integrante, estado), giras_fuentes(tipo, valor_id, valor_texto)`)
    .gte("fecha_hasta", startDateFilter)
    .limit(5000);

  // --- LÓGICA UNIFICADA ---
  const shouldShowItem = (item: any, isProgram = false) => {
    // Modo Admin: Filtra solo por tipo de gira (si se envió adminType)
    if (isAdmin) {
      if (!adminType) return true;

      // Obtenemos los programas asociados al evento o el programa mismo
      const progs = isProgram ? [item] : [...(item.programas ? [item.programas] : []), ...(item.eventos_programas_asociados?.map((e: any) => e.programas) || [])];

      // Normalización para comparación segura (evita errores de tildes o case-sensitive)
      const normalizedType = adminType.toLowerCase().trim();

      return progs.some((p: any) => {
        // Aquí validamos contra el campo que define el tipo en tu tabla programas
        // Si el campo se llama 'tipo' en tu tabla, úsalo aquí:
        const pType = (p?.tipo || p?.nombre_gira || p?.nomenclador || "").toLowerCase();
        return pType.includes(normalizedType);
      });
    }

    // Modo Usuario (Personal)
    if (!isProgram && item.convocados?.length > 0) {
      if (item.convocados.includes("GRP:TUTTI") || (item.convocados.includes("GRP:LOCALES") && profile?.is_local) || item.convocados.includes(`FAM:${profile?.instrumentos?.familia}`)) return true;
    }

    const progs = isProgram ? [item] : [...(item.programas ? [item.programas] : []), ...(item.eventos_programas_asociados?.map((e: any) => e.programas) || [])];
    return progs.some((prog: any) => {
      const myOverride = prog.giras_integrantes?.find((gi: any) => String(gi.id_integrante) === String(userId));
      if (myOverride) return myOverride.estado !== "ausente";
      const refD = String(prog.fecha_desde || "").slice(0, 10);
      return prog.giras_fuentes?.some((s: any) =>
        (s.tipo === "ENSAMBLE" && profile?.integrantes_ensambles?.some((ie: any) => Number(ie.id_ensamble) === Number(s.valor_id) && membershipActiveOnProgramDate(ie, refD))) ||
        (s.tipo === "FAMILIA" && s.valor_texto === profile?.instrumentos?.familia)
      );
    });
  };

  const eventosFiltrados = (eventos || []).filter((e: any) => {
    // 1. Validar visibilidad general (o bypass si es admin)
    if (!shouldShowItem(e, false)) return false;

    // 2. Filtro de Categoría (Solo si NO es admin, o si el modo es estrictamente essential)
    if (mode === 'musical') {
      const catId = e.tipos_evento?.id_categoria;
      if (catId != 1 && catId != 2) return false;
    }
    return true;
  });

  const programasFiltrados = (allPrograms || []).filter((p: any) => {
    if (isAdmin) {
      if (!adminType) return true;
      // Normalización robusta
      const pName = (p.tipo || p.nombre_gira || p.nomenclador || "").toLowerCase();
      return pName.includes(adminType.toLowerCase().trim());
    }
    return shouldShowItem(p, true);
  });
  const generationStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  // --- CONSTRUCCIÓN DEL BUFFER ICS ---
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OrquestaManager//App//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Agenda Orquesta",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  eventosFiltrados.forEach((evt: any) => {
    if (!evt.fecha || !evt.hora_inicio) return;

    const tipoNombre = evt.tipos_evento?.nombre || "Evento";
    let rawDesc = evt.descripcion || "";
    const listaObras: string[] = [];
    let mainProgramId = null;
    let driveFolderId = null;

    if (evt.programas) {
      listaObras.push(evt.programas.nomenclador || evt.programas.nombre_gira);
      mainProgramId = evt.programas.id;
      driveFolderId = evt.programas.google_drive_folder_id;
    }
    if (evt.eventos_programas_asociados && evt.eventos_programas_asociados.length > 0) {
      evt.eventos_programas_asociados.forEach((ep: any) => {
        const p = ep.programas;
        if (p) {
          const nombre = p.nomenclador || p.nombre_gira;
          if (nombre && !listaObras.includes(nombre)) listaObras.push(nombre);
          if (!mainProgramId) mainProgramId = p.id;
          if (!driveFolderId) driveFolderId = p.google_drive_folder_id;
        }
      });
    }

    const obrasStr = listaObras.join(", ");
    const summaryText = obrasStr ? `[${obrasStr}] ${rawDesc}` : rawDesc;
    const summary = `[${tipoNombre.toUpperCase()}] ${cleanText(summaryText, true)}`;

    let descBody = `Tipo: ${tipoNombre}\\n${cleanText(evt.descripcion || "")}`;
    if (obrasStr) {
      descBody += `\\n\\nObras: ${cleanText(obrasStr)}`;
    }

    if (driveFolderId) {
      descBody += `\\n\\n📂 Drive: https://drive.google.com/drive/folders/${driveFolderId}`;
    }
    if (mainProgramId) {
      descBody += `\\n\\n🔗 Ver en App:\\n${FRONTEND_URL}/?tab=giras&view=REPERTOIRE&giraId=${mainProgramId}`;
    }

    const loc = `${cleanText(evt.locaciones?.nombre || "", true)} ${cleanText(evt.locaciones?.direccion || "", true)}`;
    const dtStart = formatDateTime(evt.fecha, evt.hora_inicio);
    const dtEnd = (evt.hora_fin && evt.hora_fin !== evt.hora_inicio)
      ? formatDateTime(evt.fecha, evt.hora_fin)
      : addHours(evt.fecha, evt.hora_inicio, 1);

    icsLines.push(
      "BEGIN:VEVENT",
      `UID:evt_${evt.id}@orquestamanager.app`,
      `DTSTAMP:${generationStamp}`,
      `DTSTART;TZID=America/Argentina/Buenos_Aires:${dtStart}`,
      `DTEND;TZID=America/Argentina/Buenos_Aires:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${descBody}`,
      `LOCATION:${loc}`,
      "SEQUENCE:0",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  });

  programasFiltrados.forEach((prog: any) => {
    if (!prog.fecha_desde) return;

    const dtStart = formatDateOnly(prog.fecha_desde);
    const dtEnd = prog.fecha_hasta ? addDays(prog.fecha_hasta, 1) : addDays(prog.fecha_desde, 1);
    const title = `🏁 ${prog.nomenclador || ""}${prog.zona ? ` | ${prog.zona}` : ""}`;
    let description = `${cleanText(prog.nombre_gira || "")}`;

    if (prog.google_drive_folder_id) {
      description += `\\n\\n📂 Carpeta Drive:\\nhttps://drive.google.com/drive/folders/${prog.google_drive_folder_id}`;
    }
    description += `\\n\\n🔗 Ver en App:\\n${FRONTEND_URL}/?tab=giras&view=REPERTOIRE&giraId=${prog.id}`;

    icsLines.push(
      "BEGIN:VEVENT",
      `UID:prog_${prog.id}@orquestamanager.app`,
      `DTSTAMP:${generationStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${cleanText(title, true)}`,
      `DESCRIPTION:${description}`,
      "SEQUENCE:0",
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    );
  });

  icsLines.push("END:VCALENDAR");
  const responseText = icsLines.join("\r\n");

  if (debug) {
    return new Response(responseText, { headers: { "Content-Type": "text/plain" } });
  }

  return new Response(responseText, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda_orquesta.ics"`,
    },
  });
});