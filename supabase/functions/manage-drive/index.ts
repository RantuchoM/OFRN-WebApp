import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@126.0.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// IDs de Carpetas Madre (Asegúrate de que estas carpetas existan en TU Drive personal)
const ROOT_FOLDER_ID = "1QkvJSUm9u6n9tsPGW2s_-L_e_1ENkBhD"; // Programas
const VIATICOS_ROOT_FOLDER_ID = "1PRWEbGKUBxfhF9HIf2DgpOWKDRwslsCc"; // Viáticos

// --- UTILS ---
const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const getFormattedDateString = (startStr: string, endStr: string) => {
  if (!startStr) return "SinFecha";
  const [y1, m1, d1] = startStr.split("-").map(Number);
  const dateStart = new Date(Date.UTC(y1, m1 - 1, d1));
  let dateEnd = dateStart;
  if (endStr) {
    const [y2, m2, d2] = endStr.split("-").map(Number);
    dateEnd = new Date(Date.UTC(y2, m2 - 1, d2));
  }
  const monthName = MONTHS[dateStart.getUTCMonth()];
  const dayStartStr = dateStart.getUTCDate().toString().padStart(2, "0");
  const dayEndStr = dateEnd.getUTCDate().toString().padStart(2, "0");
  if (dateStart.getUTCMonth() !== dateEnd.getUTCMonth()) {
    const monthEnd = MONTHS[dateEnd.getUTCMonth()];
    return `${monthName} ${dayStartStr}-${monthEnd} ${dayEndStr}`;
  }
  return `${monthName} ${dayStartStr}-${dayEndStr}`;
};

const getTypeAbbreviation = (type: string) => {
  if (!type) return "Sinf";
  const t = type.toLowerCase();
  if (t.includes("camerata") || t.includes("filarmónica")) return "CF";
  if (t.includes("ensamble")) return "Ens";
  if (t.includes("jazz")) return "JB";
  return "Sinf";
};

// --- AUTH CLIENT HELPER ---
const getAuthClient = () => {
  const clientId = Deno.env.get("G_CLIENT_ID");
  const clientSecret = Deno.env.get("G_CLIENT_SECRET");
  const refreshToken = Deno.env.get("G_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan credenciales OAuth en Supabase Secrets (G_CLIENT_ID, G_CLIENT_SECRET, G_REFRESH_TOKEN)"
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      action,
      programId,
      folderUrl,
      folderName,
      parentId,
      fileName,
      fileBase64,
      mimeType,
      sourceUrl,
      targetParentId,
      newName
    } = body;

    // 1. Init Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Init Drive con OAuth2 (Tu cuenta personal)
    const authClient = getAuthClient();
    const drive = google.drive({ version: "v3", auth: authClient });

    // Helper Drive ID
    const extractFileId = (url: string) => {
      if (!url) return null;
      const match = url.match(/[-\w]{25,}/);
      return match ? match[0] : null;
    };

    // =================================================================================
    // ACCIÓN: LISTAR ARCHIVOS
    // =================================================================================
    if (action === "list_folder_files") {
      const folderId = extractFileId(folderUrl);
      if (!folderId) throw new Error("URL inválida");
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: "files(id, name, webViewLink, webContentLink, mimeType)",
        pageSize: 100,
        orderBy: "name",
      });
      return new Response(
        JSON.stringify({ success: true, files: res.data.files || [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =================================================================================
    // ACCIÓN: CREAR CARPETA (Viáticos)
    // =================================================================================
    if (action === "create_folder") {
      if (!folderName) throw new Error("Falta folderName");
      const targetParentId = parentId || VIATICOS_ROOT_FOLDER_ID;

      // Verificar existencia
      const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${targetParentId}' in parents and trashed=false`;
      const listRes = await drive.files.list({ q, fields: "files(id, name)" });

      if (listRes.data.files && listRes.data.files.length > 0) {
        return new Response(
          JSON.stringify({ folderId: listRes.data.files[0].id }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        const createRes = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [targetParentId],
          },
          fields: "id",
        });
        return new Response(JSON.stringify({ folderId: createRes.data.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =================================================================================
    // ACCIÓN: SUBIR ARCHIVO (Viáticos)
    // =================================================================================
    if (action === "upload_file") {
      if (!fileBase64 || !fileName || !parentId)
        throw new Error("Faltan datos");

      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const fileBlob = new Blob([bytes], {
        type: mimeType || "application/pdf",
      });

      // IMPORTANTE: Con OAuth, la librería maneja el token refresh automáticamente.
      // Pero para 'fetch' manual necesitamos obtener un access token válido.
      const tokenResponse = await authClient.getAccessToken();
      const accessToken = tokenResponse.token;

      const metadata = { name: fileName, parents: [parentId] };
      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      form.append("file", fileBlob);

      const uploadRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        }
      );

      if (!uploadRes.ok)
        throw new Error("Error subiendo: " + (await uploadRes.text()));
      const fileData = await uploadRes.json();

      return new Response(JSON.stringify({ fileId: fileData.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // =================================================================================
    // ACCIÓN: COPIAR ARCHIVO (Para Documentación)
    // =================================================================================
    if (action === "copy_file") {
      const fileId = extractFileId(sourceUrl);
      if (!fileId) {
        // No lanzamos error para no romper el loop masivo, devolvemos success:false
        return new Response(
          JSON.stringify({ success: false, message: "URL inválida o vacía" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const copyRes = await drive.files.copy({
          fileId: fileId,
          requestBody: {
            name: newName || undefined,
            parents: [targetParentId],
          },
          fields: "id, name, webViewLink",
        });

        return new Response(
          JSON.stringify({ success: true, file: copyRes.data }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (err: any) {
        console.error("Error copiando archivo:", err);
        // Retornamos success false pero con info
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    // =================================================================================
    // ACCIÓN: SYNC PROGRAMAS
    // =================================================================================
    if (action === "sync_program" || action === "delete_program") {
      let targetYear = new Date().getFullYear();
      let currentProgramData = null;

      if (programId) {
        const { data } = await supabase
          .from("programas")
          .select("*")
          .eq("id", programId)
          .maybeSingle();
        if (data) {
          currentProgramData = data;
          if (data.fecha_desde)
            targetYear = parseInt(data.fecha_desde.split("-")[0]);
        }
      }

      if (
        action === "delete_program" &&
        currentProgramData?.google_drive_folder_id
      ) {
        try {
          await drive.files.delete({
            fileId: currentProgramData.google_drive_folder_id,
          });
        } catch (e) {}
      }

      const startOfYear = `${targetYear}-01-01`;
      const endOfYear = `${targetYear}-12-31`;
      const { data: allPrograms } = await supabase
        .from("programas")
        .select("*, programas_repertorios(*, repertorio_obras(*, obras(*)))")
        .gte("fecha_desde", startOfYear)
        .lte("fecha_desde", endOfYear)
        .order("fecha_desde", { ascending: true });

      if (!allPrograms)
        return new Response(
          JSON.stringify({ success: true, message: "No programs" })
        );

      const typeCounters: Record<string, number> = { Sinf: 0, CF: 0, Ens: 0 };
      const monthCounters: Record<number, number> = {};

      for (const prog of allPrograms) {
        if (!prog.fecha_desde) continue;
        const [y, m, d] = prog.fecha_desde.split("-").map(Number);
        const monthIndex = m - 1;
        const monthNum = m.toString().padStart(2, "0");
        if (monthCounters[monthIndex] === undefined)
          monthCounters[monthIndex] = 0;
        const monthLetter = String.fromCharCode(97 + monthCounters[monthIndex]);
        monthCounters[monthIndex]++;

        const typeAbbr = getTypeAbbreviation(prog.tipo);
        typeCounters[typeAbbr] = (typeCounters[typeAbbr] || 0) + 1;
        const typeCountStr = typeCounters[typeAbbr].toString().padStart(2, "0");
        const shortYear = targetYear.toString().slice(-2);
        const nomencladorStr = `${typeAbbr} ${typeCountStr}/${shortYear}`;

        if (prog.nomenclador !== nomencladorStr)
          await supabase
            .from("programas")
            .update({ nomenclador: nomencladorStr })
            .eq("id", prog.id);
        if (prog.mes_letra !== `${monthNum}${monthLetter}`)
          await supabase
            .from("programas")
            .update({ mes_letra: `${monthNum}${monthLetter}` })
            .eq("id", prog.id);

        const datePart = getFormattedDateString(
          prog.fecha_desde,
          prog.fecha_hasta
        );
        const zonePart = prog.zona ? ` ${prog.zona}` : "";
        const folderName = `${monthNum}${monthLetter} - ${datePart}${zonePart} - ${nomencladorStr}`;

        let folderId = prog.google_drive_folder_id;
        let folderExists = false;

        if (folderId) {
          try {
            const currentFile = await drive.files.get({
              fileId: folderId,
              fields: "id, name, trashed",
            });
            if (!currentFile.data.trashed) {
              folderExists = true;
              if (currentFile.data.name !== folderName)
                await drive.files.update({
                  fileId: folderId,
                  requestBody: { name: folderName },
                });
            }
          } catch (e: any) {
            if (e.code === 404) console.log(`Carpeta ${folderId} 404.`);
          }
        }

        if (!folderExists) {
          const file = await drive.files.create({
            requestBody: {
              name: folderName,
              mimeType: "application/vnd.google-apps.folder",
              parents: [ROOT_FOLDER_ID],
            },
            fields: "id",
          });
          folderId = file.data.id;
          await supabase
            .from("programas")
            .update({ google_drive_folder_id: folderId })
            .eq("id", prog.id);
        }

        if (prog.id === programId && action === "sync_program") {
          const repertorios =
            prog.programas_repertorios?.sort(
              (a: any, b: any) => a.orden - b.orden
            ) || [];
          for (const [rIdx, rep] of repertorios.entries()) {
            const repPrefix = (rIdx + 1).toString().padStart(2, "0");
            const repName = `${repPrefix}. ${rep.nombre}`;
            let repId = rep.google_drive_folder_id;
            let repExists = false;

            if (repId) {
              try {
                const rf = await drive.files.get({
                  fileId: repId,
                  fields: "id, name, trashed",
                });
                if (!rf.data.trashed) {
                  repExists = true;
                  if (rf.data.name !== repName)
                    await drive.files.update({
                      fileId: repId,
                      requestBody: { name: repName },
                    });
                }
              } catch (e) {}
            }

            if (!repExists) {
              const f = await drive.files.create({
                requestBody: {
                  name: repName,
                  mimeType: "application/vnd.google-apps.folder",
                  parents: [folderId],
                },
                fields: "id",
              });
              repId = f.data.id;
              await supabase
                .from("programas_repertorios")
                .update({ google_drive_folder_id: repId })
                .eq("id", rep.id);
            }

            // === LÓGICA DE ACCESOS DIRECTOS RESTAURADA Y CORREGIDA ===
            const works =
              rep.repertorio_obras?.sort(
                (a: any, b: any) => a.orden - b.orden
              ) || [];

            // Iteramos usando .entries() para tener el índice (0, 1, 2...)
            // independientemente de los huecos en workItem.orden
            for (const [index, workItem] of works.entries()) {
              const obra = workItem.obras;
              // Verificar que tenga link de drive y que NO esté marcada para excluir
              if (!obra || !obra.link_drive || workItem.excluir) continue;

              const targetId = extractFileId(obra.link_drive);
              if (!targetId) continue;

              let shortcutId = workItem.google_drive_shortcut_id;
              let shortcutExists = false;

              // --- CORRECCIÓN: Usamos el índice del bucle + 1 ---
              const prefix = (index + 1).toString().padStart(2, "0");
              const shortcutName = `${prefix} - ${obra.titulo}`;

              // Validar si el shortcut guardado en DB aún existe y es correcto
              if (shortcutId) {
                try {
                  const sFile = await drive.files.get({
                    fileId: shortcutId,
                    fields: "id, trashed, shortcutDetails, name",
                  });
                  if (!sFile.data.trashed) {
                    if (sFile.data.shortcutDetails?.targetId === targetId) {
                      shortcutExists = true;
                      // Actualizar nombre si cambió el título O la posición en la lista
                      if (sFile.data.name !== shortcutName) {
                        await drive.files.update({
                          fileId: shortcutId,
                          requestBody: { name: shortcutName },
                        });
                      }
                    } else {
                      // El target cambió, borrar el viejo
                      await drive.files.delete({ fileId: shortcutId });
                      shortcutId = null;
                    }
                  } else {
                    shortcutId = null;
                  }
                } catch (e) {
                  // Error o 404
                  shortcutId = null;
                }
              }

              // Crear si no existe
              if (!shortcutExists) {
                try {
                  const newShortcut = await drive.files.create({
                    requestBody: {
                      name: shortcutName,
                      mimeType: "application/vnd.google-apps.shortcut",
                      parents: [repId],
                      shortcutDetails: { targetId: targetId },
                    },
                    fields: "id",
                  });

                  if (newShortcut.data.id) {
                    await supabase
                      .from("repertorio_obras")
                      .update({ google_drive_shortcut_id: newShortcut.data.id })
                      .eq("id", workItem.id);
                  }
                } catch (e) {
                  console.error(
                    `Error creando shortcut para ${obra.titulo}:`,
                    e
                  );
                }
              }
            }

            // 2. Limpieza de shortcuts huérfanos en la carpeta del repertorio
            try {
              const q = `'${repId}' in parents and mimeType = 'application/vnd.google-apps.shortcut' and trashed = false`;
              const childrenRes = await drive.files.list({
                q,
                fields: "files(id)",
              });

              const validIds = new Set(
                works
                  .map((w: any) => w.google_drive_shortcut_id)
                  .filter(Boolean)
              );

              for (const file of childrenRes.data.files || []) {
                if (file.id && !validIds.has(file.id)) {
                  // Este shortcut está en Drive pero no en nuestra DB para este bloque -> Borrar
                  try {
                    await drive.files.delete({ fileId: file.id });
                  } catch (e) {
                    console.error("Error borrando shortcut huérfano:", e);
                  }
                }
              }
            } catch (e) {
              console.error("Error limpiando shortcuts:", e);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("ERROR:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});