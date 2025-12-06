import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@126.0.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROOT_FOLDER_ID = "1QkvJSUm9u6n9tsPGW2s_-L_e_1ENkBhD";

// --- UTILS PARA NOMBRES ---
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const getFormattedDateString = (startStr: string, endStr: string) => {
    if (!startStr) return "SinFecha";
    // Forzamos la interpretación de la fecha como UTC para evitar problemas de timezone
    // Asumimos que el string viene "YYYY-MM-DD"
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const dateStart = new Date(Date.UTC(y1, m1 - 1, d1));
    
    let dateEnd = dateStart;
    if (endStr) {
        const [y2, m2, d2] = endStr.split('-').map(Number);
        dateEnd = new Date(Date.UTC(y2, m2 - 1, d2));
    }
    
    const monthName = MONTHS[dateStart.getUTCMonth()];
    const dayStartStr = dateStart.getUTCDate().toString().padStart(2, '0');
    const dayEndStr = dateEnd.getUTCDate().toString().padStart(2, '0');

    // Si cruza de mes (ej: Sep 30 - Oct 03)
    if (dateStart.getUTCMonth() !== dateEnd.getUTCMonth()) {
        const monthEnd = MONTHS[dateEnd.getUTCMonth()];
        return `${monthName} ${dayStartStr}-${monthEnd} ${dayEndStr}`;
    }
    
    return `${monthName} ${dayStartStr}-${dayEndStr}`;
};

const getTypeAbbreviation = (type: string) => {
    if (!type) return "Sinf";
    const t = type.toLowerCase();
    if (t.includes("camerata") || t.includes("filarmónica") || t.includes("filarmonica")) return "CF";
    if (t.includes("ensamble")) return "Ens";
    return "Sinf";
};

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, programId } = await req.json();
    
    // 1. Init Clientes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) throw new Error("Faltan credenciales de Google");

    const jwtClient = new google.auth.JWT(clientEmail, undefined, privateKey, ["https://www.googleapis.com/auth/drive"]);
    await jwtClient.authorize();
    const drive = google.drive({ version: "v3", auth: jwtClient });

    // Helper Drive ID
    const extractFileId = (url: string) => {
      if (!url) return null;
      const match = url.match(/[-\w]{25,}/);
      return match ? match[0] : null;
    };

    // --- LÓGICA DE SINCRONIZACIÓN ---
    if (action === "sync_program" || action === "delete_program") {
      
      // 1. Identificar Año Objetivo
      let targetYear = new Date().getFullYear();
      let currentProgramData = null;

      if (programId) {
          // IMPORTANTE: Tabla 'programas'
          const { data } = await supabase.from("programas").select("*").eq("id", programId).maybeSingle();
          if (data) {
              currentProgramData = data;
              if (data.fecha_desde) targetYear = parseInt(data.fecha_desde.split('-')[0]);
          }
      }

      // Si es DELETE, intentar borrar carpeta física antes de recalcular
      if (action === "delete_program" && currentProgramData?.google_drive_folder_id) {
          try { 
              await drive.files.delete({ fileId: currentProgramData.google_drive_folder_id });
              console.log("Carpeta eliminada de Drive");
          } catch (e) { console.log("Carpeta ya no existía o error al borrar", e); }
      }

      // 2. RECALCULO GLOBAL DEL AÑO
      const startOfYear = `${targetYear}-01-01`;
      const endOfYear = `${targetYear}-12-31`;
      
      // Traemos TODOS los programas del año para ordenar nombres
      const { data: allPrograms, error: fetchError } = await supabase
        .from("programas")
        .select("*, programas_repertorios(*, repertorio_obras(*, obras(*)))")
        .gte("fecha_desde", startOfYear)
        .lte("fecha_desde", endOfYear)
        .order("fecha_desde", { ascending: true });

      if (fetchError) throw new Error("Error fetching programs: " + fetchError.message);
      if (!allPrograms) return new Response(JSON.stringify({ success: true, message: "No programs" }));

      // Contadores para nomenclatura
      const typeCounters: Record<string, number> = { "Sinf": 0, "CF": 0, "Ens": 0 };
      const monthCounters: Record<number, number> = {}; 

      // --- BUCLE PRINCIPAL DE RENOMBRES ---
      for (const prog of allPrograms) {
          if (!prog.fecha_desde) continue;
          
          // Cálculo de Prefijos (02a, 03b...)
          const [y, m, d] = prog.fecha_desde.split('-').map(Number); // Parse seguro local
          const monthIndex = m - 1; 
          const monthNum = m.toString().padStart(2, '0');
          
          if (monthCounters[monthIndex] === undefined) monthCounters[monthIndex] = 0;
          const monthLetter = String.fromCharCode(97 + monthCounters[monthIndex]); // 97 = 'a'
          monthCounters[monthIndex]++;

          // Cálculo de Tipo (Sinf 01/26)
          const typeAbbr = getTypeAbbreviation(prog.tipo);
          typeCounters[typeAbbr] = (typeCounters[typeAbbr] || 0) + 1;
          const typeCountStr = typeCounters[typeAbbr].toString().padStart(2, '0');
          const shortYear = targetYear.toString().slice(-2);

          // NOMBRE IDEAL
          const datePart = getFormattedDateString(prog.fecha_desde, prog.fecha_hasta);
          const zonePart = prog.zona ? ` ${prog.zona}` : "";
          
          // Formato: "02a - Feb 18-21 Bariloche - Sinf 01/26"
          const folderName = `${monthNum}${monthLetter} - ${datePart}${zonePart} - ${typeAbbr} ${typeCountStr}/${shortYear}`;

          // --- GESTIÓN CARPETA RAIZ DEL PROGRAMA ---
          let folderId = prog.google_drive_folder_id;
          let folderExists = false;

          // Verificar si existe realmente en Drive
          if (folderId) {
              try {
                  const currentFile = await drive.files.get({ fileId: folderId, fields: "id, name, trashed" });
                  if (!currentFile.data.trashed) {
                      folderExists = true;
                      // Renombrar si hace falta
                      if (currentFile.data.name !== folderName) {
                          console.log(`Renombrando: "${currentFile.data.name}" -> "${folderName}"`);
                          await drive.files.update({ fileId: folderId, requestBody: { name: folderName } });
                      }
                  }
              } catch (e: any) {
                  if (e.code === 404) console.log(`Carpeta ${folderId} no encontrada (404). Se recreará.`);
                  else console.error("Error verificando carpeta", e);
              }
          }

          // Crear si no existe (o si dio 404)
          if (!folderExists) {
              console.log(`Creando carpeta nueva: ${folderName}`);
              const file = await drive.files.create({
                  requestBody: { 
                      name: folderName, 
                      mimeType: "application/vnd.google-apps.folder", 
                      parents: [ROOT_FOLDER_ID] 
                  },
                  fields: "id"
              });
              folderId = file.data.id;
              // Guardar nuevo ID en DB
              await supabase.from("programas").update({ google_drive_folder_id: folderId }).eq("id", prog.id);
          }

          // --- PROCESAR CONTENIDO SOLO SI ES EL PROGRAMA ACTIVO (O SI QUEREMOS FORZAR TODO) ---
          // Para optimizar, procesamos contenido completo solo del programa actual.
          // Pero los nombres de carpetas raíz se actualizan para TODOS (para mantener el orden 01a, 02a...)
          
          if (prog.id === programId && action === "sync_program") {
              
              // A. REPERTORIOS (Bloques)
              const repertorios = prog.programas_repertorios?.sort((a:any, b:any) => a.orden - b.orden) || [];
              
              for (const [rIdx, rep] of repertorios.entries()) {
                  const repPrefix = (rIdx + 1).toString().padStart(2, '0');
                  const repName = `${repPrefix}. ${rep.nombre}`;
                  let repId = rep.google_drive_folder_id;
                  let repExists = false;

                  if (repId) {
                      try {
                          const rf = await drive.files.get({ fileId: repId, fields: "id, name, trashed" });
                          if (!rf.data.trashed) {
                              repExists = true;
                              if (rf.data.name !== repName) {
                                  await drive.files.update({ fileId: repId, requestBody: { name: repName } });
                              }
                          }
                      } catch (e) {}
                  }

                  if (!repExists) {
                      const f = await drive.files.create({
                          requestBody: { name: repName, mimeType: "application/vnd.google-apps.folder", parents: [folderId] },
                          fields: "id"
                      });
                      repId = f.data.id;
                      await supabase.from("programas_repertorios").update({ google_drive_folder_id: repId }).eq("id", rep.id);
                  }

                  // B. OBRAS (Accesos Directos)
                  // 1. Listar lo que hay
                  let driveShortcuts: any[] = [];
                  try {
                      const res = await drive.files.list({ 
                          q: `'${repId}' in parents and mimeType = 'application/vnd.google-apps.shortcut' and trashed = false`, 
                          fields: "files(id, name)" 
                      });
                      driveShortcuts = res.data.files || [];
                  } catch (e) {}

                  const activeIds = new Set();
                  const obras = rep.repertorio_obras?.sort((a:any, b:any) => a.orden - b.orden) || [];

                  for (const [oIdx, item] of obras.entries()) {
                      const targetId = extractFileId(item.obras?.link_drive);
                      if (!targetId) continue;

                      // Obtener nombre real del archivo original
                      let realName = item.obras.titulo;
                      try {
                          const origin = await drive.files.get({ fileId: targetId, fields: "name" });
                          if (origin.data.name) realName = origin.data.name;
                      } catch (e) {
                          console.log("No se pudo leer nombre original, usando titulo obra");
                      }

                      const scPrefix = (oIdx + 1).toString().padStart(2, '0');
                      const scName = `${scPrefix}. ${realName}`;
                      let scId = item.google_drive_shortcut_id;
                      let scExists = false;

                      if (scId) {
                          // Verificar existencia shortcut
                          try {
                              const scFile = await drive.files.get({ fileId: scId, fields: "id, name, trashed" });
                              if (!scFile.data.trashed) {
                                  scExists = true;
                                  // Renombrar si cambió orden o nombre original
                                  if (scFile.data.name !== scName) {
                                      await drive.files.update({ fileId: scId, requestBody: { name: scName } });
                                  }
                              }
                          } catch (e) { scId = null; } // Si da 404, scId a null para recrear
                      }

                      if (!scExists) {
                          try {
                              const created = await drive.files.create({
                                  requestBody: { 
                                      name: scName, 
                                      mimeType: "application/vnd.google-apps.shortcut", 
                                      parents: [repId],
                                      shortcutDetails: { targetId: targetId }
                                  },
                                  fields: "id"
                              });
                              scId = created.data.id;
                              await supabase.from("repertorio_obras").update({ google_drive_shortcut_id: scId }).eq("id", item.id);
                          } catch (e) { console.error("Error creando shortcut", e); }
                      }
                      
                      if (scId) activeIds.add(scId);
                  }

                  // 2. Borrar basura (Shortcuts que ya no están en la lista)
                  for (const file of driveShortcuts) {
                      if (!activeIds.has(file.id)) {
                          console.log("Borrando shortcut sobrante:", file.name);
                          try { await drive.files.delete({ fileId: file.id }); } catch (e) {}
                      }
                  }
              }
          }
      }
    }

    return new Response(JSON.stringify({ success: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 
    });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 
    });
  }
});