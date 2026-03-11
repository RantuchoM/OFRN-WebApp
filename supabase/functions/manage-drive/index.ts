import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@126.0.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- CONFIGURACIÓN DE CONSTANTES ---
const PROGRAMAS_ARCOS_ROOT_ID = "1te6NHhnYbEJmZNyYFI4_qz2qK0axqqtJ"; // <--- AGREGAR
const OBRAS_REAL_STORAGE_ID = "1p2mIZhko_BGDKwxJUwzhb9pl8JXChFvO";
const ROOT_FOLDER_ID = "1vlIkMhbc61ZPHRuXwbwVYi2E42rGok9z";
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const GIRAS_ROOT_ID = "1PRWEbGKUBxfhF9HIf2DgpOWKDRwslsCc";
const ARCHIVO_OBRAS_FOLDER_ID = "10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi";
// =================================================================================
// HELPERS GENERALES
// =================================================================================

const extractFileId = (url: string) => {
  if (!url) return null;
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
};

// Saneamiento de rutas: Álvarez -> alvarez (Evita errores en Storage)
const sanitizePath = (str: string) => {
  if (!str) return "archivo";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .toLowerCase();
};

// Extrae el path relativo para borrar archivos del Bucket
const extractStoragePath = (url: string, bucket: string) => {
  if (!url || !url.includes(bucket)) return null;
  const parts = url.split(`${bucket}/`);
  return parts.length > 1 ? parts[1] : null;
};

const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Copia recursivamente el contenido de una carpeta Drive a otra carpeta destino (solo contenido, no la carpeta raíz). */
async function copyFolderContentsRecursive(
  drive: any,
  sourceFolderId: string,
  destParentId: string,
  opts: { supportsAllDrives?: boolean } = {}
): Promise<void> {
  const listOpts: any = {
    q: `'${sourceFolderId}' in parents and trashed = false`,
    fields: "nextPageToken, files(id, name, mimeType)",
    pageSize: 100,
    ...opts,
  };
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({ ...listOpts, pageToken });
    const files = res.data?.files || [];
    for (const f of files) {
      const name = (f.name || "sin_nombre").slice(0, 255);
      if (f.mimeType === FOLDER_MIME) {
        const newFolder = await drive.files.create({
          requestBody: {
            name,
            mimeType: FOLDER_MIME,
            parents: [destParentId],
          },
          fields: "id",
          ...opts,
        });
        await copyFolderContentsRecursive(drive, f.id, newFolder.data.id, opts);
      } else {
        await drive.files.copy({
          fileId: f.id,
          requestBody: { name, parents: [destParentId] },
          fields: "id",
          ...opts,
        });
      }
    }
    pageToken = res.data?.nextPageToken;
  } while (pageToken);
}

const getAuthClient = () => {
  const clientId = Deno.env.get("G_CLIENT_ID");
  const clientSecret = Deno.env.get("G_CLIENT_SECRET");
  const refreshToken = Deno.env.get("G_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Credenciales faltantes");
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
};

async function downloadDriveFile(fileId: string, token: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

const getTypeAbbreviation = (type: string) => {
  if (!type) return "Sinf";
  const t = type.toLowerCase();
  const tSanitized = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (tSanitized.includes("comision")) return "Comis";
  if (t.includes("camerata") || t.includes("filarmónica")) return "CF";
  if (t.includes("ensamble")) return "Ens";
  if (t.includes("jazz")) return "JB";
  return "Sinf";
};

const isOrquestaType = (tipo: string) => {
  if (!tipo) return true;
  const t = tipo.toLowerCase();
  return !t.includes("ensamble");
};

function getEnsembleSigla(ensambleNombre: string, siglaFromDb?: string | null): string {
  if (siglaFromDb?.trim()) return siglaFromDb.trim().toUpperCase();
  if (!ensambleNombre?.trim()) return "Ens";
  const words = ensambleNombre.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Ens";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 4);
}

function fiscalYearFromDate(fechaDesde: string): string {
  if (!fechaDesde) return "";
  const y = fechaDesde.slice(0, 4);
  return y.length === 4 ? y.slice(2) : "";
}

// =================================================================================
// NOMENCLADOR: auditoría automática por año fiscal (orquestas cronológico, ensambles por sigla)
// =================================================================================

type ProgramRow = {
  id: number;
  fecha_desde: string;
  tipo?: string;
  nomenclador?: string | null;
  giras_fuentes?: Array<{ tipo: string; valor_id: number | null; valor_texto: string | null }>;
};

async function fetchProgramsByFiscalYear(
  supabase: any,
  year2: string,
  programIds?: number[]
): Promise<ProgramRow[]> {
  const yearFull = year2.length === 2 ? `20${year2}` : year2;
  const start = `${yearFull}-01-01`;
  const end = `${yearFull}-12-31`;
  let q = supabase
    .from("programas")
    .select("id, fecha_desde, tipo, nomenclador, giras_fuentes(tipo, valor_id, valor_texto)")
    .gte("fecha_desde", start)
    .lte("fecha_desde", end)
    .order("fecha_desde", { ascending: true })
    .order("id", { ascending: true });
  if (programIds?.length) q = q.in("id", programIds);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function computeOrquestaNomenclador(
  programsOrdered: ProgramRow[],
  programId: number,
  tipo: string,
  year2: string
): string {
  const prefix = getTypeAbbreviation(tipo || "");
  const idx = programsOrdered.findIndex((p) => p.id === programId);
  const num = idx >= 0 ? idx + 1 : 1;
  return `${prefix} ${String(num).padStart(2, "0")}/${year2}`;
}

function computeEnsambleNomenclador(
  programsInYear: ProgramRow[],
  prog: ProgramRow,
  ensembleIdToSigla: Map<number, string>,
  year2: string
): string {
  const sources = (prog.giras_fuentes || []).filter((f) => f.tipo === "ENSAMBLE" && f.valor_id != null);
  if (sources.length === 0) return "";

  const parts: string[] = [];
  for (const s of sources) {
    const eid = s.valor_id!;
    const sigla =
      ensembleIdToSigla.get(eid) ||
      (s.valor_texto?.trim() ? getEnsembleSigla(s.valor_texto.trim(), null) : "Ens");
    const girasWithThisEnsemble = programsInYear.filter((p) =>
      (p.giras_fuentes || []).some((f) => f.tipo === "ENSAMBLE" && f.valor_id === eid)
    );
    const ordenado = [...girasWithThisEnsemble].sort(
      (a, b) => (a.fecha_desde || "").localeCompare(b.fecha_desde || "") || a.id - b.id
    );
    const idx = ordenado.findIndex((p) => p.id === prog.id);
    const num = idx >= 0 ? idx + 1 : 1;
    parts.push(`${sigla} ${String(num).padStart(2, "0")}`);
  }
  return parts.join(" | ") + ` /${year2}`;
}

async function loadEnsembleSiglas(supabase: any, ensembleIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (ensembleIds.length === 0) return map;
  const { data: rows } = await supabase
    .from("ensambles")
    .select("id, ensamble")
    .in("id", [...new Set(ensembleIds)]);
  for (const r of rows || []) {
    map.set(r.id, getEnsembleSigla(r.ensamble ?? "", null));
  }
  return map;
}

async function auditAndApplyNomencladores(
  supabase: any,
  programsToSync: ProgramRow[],
  limitIds?: number[]
): Promise<{ updated: number; updatedIds: number[]; list: ProgramRow[] }> {
  if (programsToSync.length === 0) return { updated: 0, updatedIds: [], list: [] };

  const byYear = new Map<string, number[]>();
  for (const p of programsToSync) {
    const yy = fiscalYearFromDate(p.fecha_desde);
    if (!yy) continue;
    if (!byYear.has(yy)) byYear.set(yy, []);
    byYear.get(yy)!.push(p.id);
  }

  const updates: Array<{ id: number; nomenclador: string }> = [];

  for (const [year2] of byYear) {
    const programsInYear = await fetchProgramsByFiscalYear(supabase, year2);

    const orquestaByPrefix = new Map<string, ProgramRow[]>();
    const ensembleIds = new Set<number>();

    for (const p of programsInYear) {
      if (isOrquestaType(p.tipo || "")) {
        const prefix = getTypeAbbreviation(p.tipo || "");
        if (!orquestaByPrefix.has(prefix)) orquestaByPrefix.set(prefix, []);
        orquestaByPrefix.get(prefix)!.push(p);
      } else {
        (p.giras_fuentes || [])
          .filter((f) => f.tipo === "ENSAMBLE" && f.valor_id != null)
          .forEach((f) => ensembleIds.add(f.valor_id!));
      }
    }

    const ensembleSiglas = await loadEnsembleSiglas(supabase, [...ensembleIds]);

    for (const p of programsInYear) {
      let computed = "";
      if (isOrquestaType(p.tipo || "")) {
        const list = orquestaByPrefix.get(getTypeAbbreviation(p.tipo || "")) || [];
        computed = computeOrquestaNomenclador(list, p.id, p.tipo || "", year2);
      } else {
        computed = computeEnsambleNomenclador(programsInYear, p, ensembleSiglas, year2);
      }
      if (
        computed &&
        computed !== (p.nomenclador || "") &&
        (!limitIds || limitIds.includes(p.id))
      ) {
        updates.push({ id: p.id, nomenclador: computed });
      }
    }
  }

  for (const u of updates) {
    await supabase.from("programas").update({ nomenclador: u.nomenclador }).eq("id", u.id);
  }

  const updatedIds = updates.map((x) => x.id);
  const listWithNewNomenclador = programsToSync.map((p) => {
    const up = updates.find((u) => u.id === p.id);
    return up ? { ...p, nomenclador: up.nomenclador } : p;
  });

  return { updated: updates.length, updatedIds, list: listWithNewNomenclador };
}

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
  return `${monthName} ${dateStart.getUTCDate().toString().padStart(2, "0")}-${dateEnd.getUTCDate().toString().padStart(2, "0")}`;
};

// =================================================================================
// SYNC METADATA: carpeta raíz del programa (sin tocar repertorio)
// =================================================================================
async function syncProgramRootFolder(supabase: any, drive: any, prog: any) {
  const dateStart = prog.fecha_desde;
  const [y, m] = (dateStart || "").split("-").map(Number);
  const monthPrefix = prog.mes_letra || (m ? m.toString().padStart(2, "0") : "00");
  const dateRangeStr = getFormattedDateString(prog.fecha_desde, prog.fecha_hasta);
  const fName = `${monthPrefix} - ${dateRangeStr}${prog.zona ? ` ${prog.zona}` : ""} - ${prog.nomenclador || "SinNombre"}`;

  let fId = prog.google_drive_folder_id;
  try {
    if (fId) {
      await drive.files.update({ fileId: fId, requestBody: { name: fName } });
    } else {
      const f = await drive.files.create({
        requestBody: { name: fName, mimeType: "application/vnd.google-apps.folder", parents: [ROOT_FOLDER_ID] },
        fields: "id"
      });
      fId = f.data.id;
      await supabase.from("programas").update({ google_drive_folder_id: fId }).eq("id", prog.id);
    }
  } catch (e) {
    console.error(`[Drive Error] Carpeta Principal programa ${prog.id}:`, (e as Error).message);
  }

   return fId;
}

// =================================================================================
// SYNC REPERTORIO: sólo subcarpetas de bloques + shortcuts numerados
// =================================================================================
async function syncProgramRepertoireShortcuts(supabase: any, drive: any, prog: any) {
  const fId = prog.google_drive_folder_id;
  if (!fId) {
    throw new Error(
      "El programa no tiene carpeta principal en Drive. Ejecuta primero sync_program_metadata."
    );
  }

  for (const [rI, rep] of (prog.programas_repertorios || []).entries()) {
    const rName = `${(rI + 1).toString().padStart(2, "0")}. ${rep.nombre}`;
    let rId = rep.google_drive_folder_id;
    if (!rId) {
      const resR = await drive.files.create({
        requestBody: { name: rName, mimeType: "application/vnd.google-apps.folder", parents: [fId] },
        fields: "id"
      });
      rId = resR.data.id;
      await supabase.from("programas_repertorios").update({ google_drive_folder_id: rId }).eq("id", rep.id);
    } else {
      try {
        await drive.files.update({ fileId: rId, requestBody: { name: rName } });
      } catch (e) {
        const resR = await drive.files.create({ requestBody: { name: rName, mimeType: "application/vnd.google-apps.folder", parents: [fId] }, fields: "id" });
        rId = resR.data.id;
        await supabase.from("programas_repertorios").update({ google_drive_folder_id: rId }).eq("id", rep.id);
      }
    }
    const driveContent = await drive.files.list({ q: `'${rId}' in parents and trashed = false`, fields: "files(id, name)" });
    const existingDriveFiles = driveContent.data.files || [];
    const validShortcutsInDb = new Set<string>();
    const obrasSorted = (rep.repertorio_obras || []).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
    for (const [oI, oW] of obrasSorted.entries()) {
      const posNumber = (oI + 1).toString().padStart(2, "0");
      const targetId = extractFileId(oW.obras?.link_drive);
      if (!targetId || oW.excluir) continue;
      let originalFolderName = oW.obras.titulo;
      try {
        const metaObra = await drive.files.get({ fileId: targetId, fields: "name" });
        originalFolderName = metaObra.data.name || originalFolderName;
      } catch (e) {
        console.error(`Acceso denegado a obra original ${targetId}`);
      }
      const sName = `${posNumber} - ${originalFolderName}`;
      let currentShortcutId = oW.google_drive_shortcut_id;
      let shortcutExists = false;
      if (currentShortcutId) {
        const found = existingDriveFiles.find((f: any) => f.id === currentShortcutId);
        if (found) {
          try {
            await drive.files.update({ fileId: currentShortcutId, requestBody: { name: sName } });
            shortcutExists = true;
            validShortcutsInDb.add(currentShortcutId);
          } catch (e) {
            shortcutExists = false;
          }
        }
      }
      if (!shortcutExists) {
        try {
          const s = await drive.files.create({
            requestBody: { name: sName, mimeType: "application/vnd.google-apps.shortcut", parents: [rId], shortcutDetails: { targetId: targetId } },
            fields: "id"
          });
          currentShortcutId = s.data.id;
          await supabase.from("repertorio_obras").update({ google_drive_shortcut_id: currentShortcutId }).eq("id", oW.id);
          validShortcutsInDb.add(currentShortcutId);
        } catch (e) {
          console.error("Error creando shortcut:", (e as Error).message);
        }
      }
    }
    for (const file of existingDriveFiles) {
      if (!validShortcutsInDb.has(file.id)) {
        try {
          await drive.files.delete({ fileId: file.id });
        } catch (e) { }
      }
    }
  }
}

// =================================================================================
// SYNC UN PROGRAMA COMPLETO (metadata + repertorio) — compatible con lógica previa
// =================================================================================
async function syncOneProgram(supabase: any, drive: any, prog: any) {
  const folderId = await syncProgramRootFolder(supabase, drive, prog);
  const progWithFolder = { ...prog, google_drive_folder_id: folderId };
  await syncProgramRepertoireShortcuts(supabase, drive, progWithFolder);
}

// =================================================================================
// MOTORES DE PDF REUTILIZABLES (UNIFICACIÓN)
// =================================================================================

async function generateDJInternal(m: any, templateRes: ArrayBuffer, firmaRes: ArrayBuffer | null) {
  const pdfDoc = await PDFDocument.load(templateRes);
  const form = pdfDoc.getForm();
  const hoy = new Date();
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  const safeSet = (f: string, v: string) => { try { form.getTextField(f).setText(v || ""); } catch (e) { } };

  safeSet("dia", hoy.getDate().toString());
  safeSet("mes", meses[hoy.getMonth()]);
  safeSet("anio", hoy.getFullYear().toString());
  safeSet("nombre_apellido", `${m.nombre} ${m.apellido}`);
  safeSet("cuit", m.cuil || m.dni || "");
  safeSet("domicilio", m.domicilio || "");
  safeSet("ciudad", m.residencia?.localidad || "");
  safeSet("provincia", "Río Negro");
  safeSet("email", m.mail || "");
  safeSet("telefono", m.telefono || "");
  let domicilioLaboralTexto = "Zatti 287, de la localidad de Viedma"; // Valor por defecto
  if (m.laboral) {
    const direccionSede = m.laboral.direccion || "";
    // La relación localidades puede venir como objeto o array, manejamos ambos casos
    const localidadObj = Array.isArray(m.laboral.localidades) 
      ? m.laboral.localidades[0] 
      : m.laboral.localidades;
    const nombreCiudad = localidadObj?.localidad || "";
    
    console.log("[generateDJInternal] laboral:", JSON.stringify(m.laboral));
    console.log("[generateDJInternal] localidadObj:", JSON.stringify(localidadObj));
    console.log("[generateDJInternal] nombreCiudad:", nombreCiudad);

    if (direccionSede && nombreCiudad) {
      domicilioLaboralTexto = `${direccionSede}, de la localidad de ${nombreCiudad}`;
    } else if (nombreCiudad) {
      domicilioLaboralTexto = `de la localidad de ${nombreCiudad}`;
    }
  }
  safeSet("domicilio_laboral", domicilioLaboralTexto);


  if (firmaRes) {
    try {
      const firmaImg = await pdfDoc.embedPng(firmaRes);
      const field = form.getField("firma_inserta");
      const widget = field.acroField.getWidgets()[0];
      const rect = widget.getRectangle();
      pdfDoc.getPages()[0].drawImage(firmaImg, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    } catch (e) { console.error("Error firma:", e.message); }
  }
  form.flatten();
  return await pdfDoc.save();
}

async function assemblePDFInternal(sources: string[], layout: "full" | "mosaic") {
  const pdfDoc = await PDFDocument.create();
  if (layout === "full") {
    for (const url of sources) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (url.toLowerCase().includes('.pdf')) {
        const extDoc = await PDFDocument.load(bytes);
        const pages = await pdfDoc.copyPages(extDoc, extDoc.getPageIndices());
        pages.forEach(p => pdfDoc.addPage(p));
      } else {
        const img = await pdfDoc.embedJpg(bytes).catch(() => pdfDoc.embedPng(bytes));
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
    }
  } else {
    // --- MOSAICO CON PROPORCIÓN CONSERVADA Y CENTRADO ---
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const pos = [{ x: 40, y: 440 }, { x: 305, y: 440 }, { x: 40, y: 40 }, { x: 305, y: 40 }];
    const boxW = 250;
    const boxH = 350;

    for (const [i, url] of sources.entries()) {
      if (i >= 4) break;
      const res = await fetch(url);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      try {
        if (url.toLowerCase().includes('.pdf')) {
          const extDoc = await PDFDocument.load(bytes);
          const [embeddedPage] = await pdfDoc.embedPdf(extDoc, [0]);
          const { width: pW, height: pH } = embeddedPage.size();

          const scale = Math.min(boxW / pW, boxH / pH);
          const dW = pW * scale;
          const dH = pH * scale;
          const offX = (boxW - dW) / 2;
          const offY = (boxH - dH) / 2;

          page.drawPage(embeddedPage, {
            x: pos[i].x + offX,
            y: pos[i].y + offY,
            width: dW,
            height: dH
          });
        } else {
          const img = await pdfDoc.embedJpg(bytes).catch(() => pdfDoc.embedPng(bytes));
          const { width: iW, height: iH } = img;

          const scale = Math.min(boxW / iW, boxH / iH);
          const dW = iW * scale;
          const dH = iH * scale;
          const offX = (boxW - dW) / 2;
          const offY = (boxH - dH) / 2;

          page.drawImage(img, {
            x: pos[i].x + offX,
            y: pos[i].y + offY,
            width: dW,
            height: dH
          });
        }
      } catch (e) { console.error("Mosaico err", e); }
    }
  }
  return await pdfDoc.save();
}

// =================================================================================
// SERVER PRINCIPAL
// =================================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    
    // Detectar si es un webhook de Supabase (contiene 'record')
    let action = body.action;
    let musicianId = body.musicianId;
    
    if (body.record && body.record.id) {
      // Es un webhook automático: procesar como assemble_full_pack
      // Solo procesar INSERT o UPDATE, ignorar DELETE
      const webhookType = body.type || body.eventType;
      if (webhookType === 'DELETE') {
        console.log(`[WEBHOOK] Ignorando DELETE para integrante ID: ${body.record.id}`);
        return new Response(JSON.stringify({ message: "DELETE event ignored" }), { headers: corsHeaders });
      }
      action = 'assemble_full_pack';
      musicianId = body.record.id;
      console.log(`[WEBHOOK] Detectado webhook ${webhookType || 'INSERT/UPDATE'} para integrante ID: ${musicianId}`);
    }
    
    const {
      layout, sources, fileName, programId, folderUrl,
      folderName, parentId, fileBase64, mimeType, sourceUrl, targetParentId,
      newName, nombreSet, obraTitulo, targetDriveId, fileId, targetEmail, role,
      giraId,
      id_obra, link_origen, titulo: tituloObra, nombre_carpeta
    } = body;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authClient = getAuthClient();
    const tokenResponse = await authClient.getAccessToken();
    const token = tokenResponse.token;
    const drive = google.drive({ version: "v3", auth: authClient });

    // --- ACCIÓN: ENTREGAR OBRA AL ARCHIVO (vista arreglador: copia real de archivos + actualiza obras + mail) ---
    if (action === "entregar_obra_archivo") {
      if (!id_obra || !link_origen) throw new Error("Faltan id_obra o link_origen");
      const sourceId = extractFileId(link_origen);
      if (!sourceId) throw new Error("Link de Drive inválido");

      const { data: obra, error: obraError } = await supabase
        .from("obras")
        .select("id, titulo")
        .eq("id", id_obra)
        .single();
      if (obraError || !obra) throw new Error("Obra no encontrada");
      const tituloParaMail = tituloObra || (obra.titulo || "").replace(/<[^>]*>/g, "").trim() || "Sin título";
      const nombreCarpeta = tituloParaMail.slice(0, 200).replace(/[/\\?*:\[\]]/g, "_");

      const driveOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true };

      try {
        const nuevaCarpeta = await drive.files.create({
          requestBody: {
            name: nombreCarpeta,
            mimeType: FOLDER_MIME,
            parents: [ARCHIVO_OBRAS_FOLDER_ID],
          },
          fields: "id, webViewLink",
        });
        const destFolderId = nuevaCarpeta.data.id;

        await copyFolderContentsRecursive(drive, sourceId, destFolderId, driveOpts);

        const meta = await drive.files.get({
          fileId: destFolderId,
          fields: "webViewLink",
          ...driveOpts,
        });
        const nuevoEnlace = meta.data.webViewLink || `https://drive.google.com/drive/folders/${destFolderId}`;

        const { error: updateError } = await supabase
          .from("obras")
          .update({ link_drive: nuevoEnlace, estado: "Entregado" })
          .eq("id", id_obra);
        if (updateError) throw updateError;

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceKey) {
          await fetch(`${supabaseUrl}/functions/v1/mails_produccion`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              action: "enviar_mail",
              templateId: "obra_entregada",
              email: "ofrn.archivo@gmail.com",
              nombre: "Sistema",
              gira: null,
              detalle: {
                titulo: tituloParaMail,
                id_obra: id_obra,
                link_drive: nuevoEnlace,
              },
            }),
          }).catch((e) => console.error("[entregar_obra_archivo] Error enviando mail:", e));
        }

        return new Response(
          JSON.stringify({ success: true, link_drive: nuevoEnlace }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e: any) {
        console.error("[entregar_obra_archivo]:", e?.message);
        throw new Error(e?.message || "Error al copiar o actualizar");
      }
    }

    // --- ACCIÓN: COPIAR CARPETA AL ARCHIVO (solo copia; para "Nuevo arreglo" clon) ---
    if (action === "copiar_carpeta_a_archivo") {
      if (!link_origen || !nombre_carpeta) throw new Error("Faltan link_origen o nombre_carpeta");
      const sourceId = extractFileId(link_origen);
      if (!sourceId) throw new Error("Link de Drive inválido");

      const driveOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true };
      const nombreCarpeta = String(nombre_carpeta).slice(0, 200).replace(/[/\\?*:\[\]]/g, "_");

      const nuevaCarpeta = await drive.files.create({
        requestBody: {
          name: nombreCarpeta,
          mimeType: FOLDER_MIME,
          parents: [ARCHIVO_OBRAS_FOLDER_ID],
        },
        fields: "id, webViewLink",
      });
      const destFolderId = nuevaCarpeta.data.id!;

      await copyFolderContentsRecursive(drive, sourceId, destFolderId, driveOpts);

      const meta = await drive.files.get({
        fileId: destFolderId,
        fields: "webViewLink",
        ...driveOpts,
      });
      const linkDrive = meta.data.webViewLink || `https://drive.google.com/drive/folders/${destFolderId}`;

      return new Response(
        JSON.stringify({ success: true, link_drive: linkDrive }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACCIÓN: REEMPLAZAR ARCHIVOS EN CARPETA DE OBRA (nueva versión mismo arreglo) ---
    if (action === "reemplazar_archivos_obra") {
      if (!id_obra || !link_origen) throw new Error("Faltan id_obra o link_origen");

      const { data: obra, error: obraError } = await supabase
        .from("obras")
        .select("id, link_drive, titulo")
        .eq("id", id_obra)
        .single();
      if (obraError || !obra?.link_drive) throw new Error("Obra no encontrada o sin carpeta en Drive");

      const destFolderId = extractFileId(obra.link_drive);
      const sourceFolderId = extractFileId(link_origen);
      if (!destFolderId || !sourceFolderId) throw new Error("Links de Drive inválidos");

      const driveOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true };

      const [destRes, sourceRes] = await Promise.all([
        drive.files.list({
          q: `'${destFolderId}' in parents and trashed = false`,
          fields: "files(id, name, webViewLink, mimeType)",
          pageSize: 200,
          ...driveOpts,
        }),
        drive.files.list({
          q: `'${sourceFolderId}' in parents and trashed = false`,
          fields: "files(id, name, mimeType)",
          pageSize: 200,
          ...driveOpts,
        }),
      ]);

      const destFiles = (destRes.data?.files || []).filter((f: any) => f.mimeType !== FOLDER_MIME);
      const sourceFiles = (sourceRes.data?.files || []).filter((f: any) => f.mimeType !== FOLDER_MIME);

      const norm = (name: string) => (name || "").toLowerCase().trim();
      const destByName = new Map<string, { id: string; webViewLink: string; mimeType: string }>();
      destFiles.forEach((f: any) => destByName.set(norm(f.name), { id: f.id, webViewLink: f.webViewLink || "", mimeType: f.mimeType || "application/octet-stream" }));

      for (const src of sourceFiles) {
        const name = (src.name || "sin_nombre").slice(0, 255);
        const key = norm(name);
        const dest = destByName.get(key);
        if (dest) {
          const content = await downloadDriveFile(src.id, token);
          if (content && content.length > 0) {
            const mime = src.mimeType || "application/octet-stream";
            const uploadRes = await fetch(
              `https://www.googleapis.com/upload/drive/v3/files/${dest.id}?uploadType=media`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": mime,
                },
                body: content,
              }
            );
            if (!uploadRes.ok) {
              const errText = await uploadRes.text();
              console.error("[reemplazar_archivos_obra] update file:", dest.id, uploadRes.status, errText);
            }
          }
        } else {
          const copied = await drive.files.copy({
            fileId: src.id,
            requestBody: { name, parents: [destFolderId] },
            fields: "id, webViewLink",
            ...driveOpts,
          });
          destByName.set(key, {
            id: copied.data.id!,
            webViewLink: copied.data.webViewLink || `https://drive.google.com/file/d/${copied.data.id}/view`,
            mimeType: src.mimeType || "application/octet-stream",
          });
        }
      }

      const { data: particellas, error: partError } = await supabase
        .from("obras_particellas")
        .select("id, nombre_archivo, url_archivo")
        .eq("id_obra", id_obra);
      if (!partError && particellas?.length) {
        const destList = Array.from(destByName.entries());
        for (const part of particellas) {
          const partName = (part.nombre_archivo || "").trim();
          if (!partName) continue;
          const key = norm(partName);
          const baseKey = key.replace(/\.[^.]+$/, "");
          const entry = destList.find(([k]) => k === key || k.replace(/\.[^.]+$/, "") === baseKey);
          if (entry) {
            const [, info] = entry;
            if (info.webViewLink && info.webViewLink !== part.url_archivo) {
              await supabase.from("obras_particellas").update({ url_archivo: info.webViewLink }).eq("id", part.id);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACCIÓN: CREAR CARPETA DE VIÁTICOS/GIRA (Insertar esto) ---
    if (action === "create_viaticos_folder") {
      if (!giraId) throw new Error("ID de gira no proporcionado");

      // 1. Obtener datos de la gira desde la BD para armar el nombre
      const { data: giraData, error: gError } = await supabase
        .from("programas")
        .select("mes_letra, nomenclador, zona, nombre_gira") // Seleccionamos los campos necesarios
        .eq("id", giraId)
        .single();

      if (gError || !giraData) {
        throw new Error("No se pudo obtener información de la gira para nombrar la carpeta.");
      }

      // 2. Construir el nombre: "mes_letra nomenclador | zona | nombre_gira"
      // Ejemplo: "03a Sinf 01/24 | Valle Medio | Concierto Apertura"
      const parte1 = `${giraData.mes_letra || ''} ${giraData.nomenclador || ''}`.trim();
      const parte2 = giraData.zona || '';
      const parte3 = giraData.nombre_gira || 'Gira sin nombre';

      // Usamos filter(Boolean) para que no queden separadores " | " sueltos si falta algún dato (ej: si no hay zona)
      const folderName = [parte1, parte2, parte3].filter(Boolean).join(" | ");

      // 3. Crear carpeta en Drive en la NUEVA ubicación
      const file = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [GIRAS_ROOT_ID] // <--- ID ESPECÍFICO SOLICITADO
        },
        fields: "id, webViewLink",
      });

      const folderId = file.data.id;
      const folderUrl = file.data.webViewLink;

      // 4. Permisos (Opcional)
      if (targetEmail) {
        try {
          await drive.permissions.create({
            fileId: folderId,
            requestBody: { role: "writer", type: "user", emailAddress: targetEmail },
          });
        } catch (e) { console.error("Error permisos:", e); }
      }

      // 5. Guardar SOLO EL ID en la base de datos
      const { error: dbError } = await supabase
        .from("giras_viaticos_config")
        .upsert({
          id_gira: giraId,
          link_drive: folderId,
        }, { onConflict: 'id_gira' });

      if (dbError) throw new Error(`Error BD: ${dbError.message}`);

      return new Response(
        JSON.stringify({ success: true, folderId, folderUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACCIÓN: COMBO EXPEDIENTE COMPLETO ---
    if (action === "assemble_full_pack") {
      let { data: m, error: mError } = await supabase.from("integrantes").select(`*, residencia:localidades!id_localidad(localidad), laboral:locaciones!id_domicilio_laboral(nombre, direccion, id_localidad, localidades:localidades!id_localidad(localidad))`).eq("id", musicianId).single();
      if (mError) {
        console.error("[assemble_full_pack] Error consultando integrante:", mError);
        // Intentar sin la relación laboral si falla
        const { data: mBasic, error: basicError } = await supabase.from("integrantes").select(`*, residencia:localidades!id_localidad(localidad)`).eq("id", musicianId).single();
        if (basicError || !mBasic) throw new Error(`Error al obtener datos del músico: ${mError.message}`);
        m = mBasic;
      }
      if (!m) throw new Error("Músico no encontrado");

      // Si hay id_domicilio_laboral, obtener la locación y su localidad por separado
      if (m.id_domicilio_laboral && !m.laboral) {
        const { data: locacion } = await supabase.from("locaciones").select("nombre, direccion, id_localidad, localidades:localidades!id_localidad(localidad)").eq("id", m.id_domicilio_laboral).single();
        if (locacion) m.laboral = locacion;
      }

      // LIMPIEZA PREVIA DEL BUCKET
      const oldFiles = [
        extractStoragePath(m.link_declaracion, "musician-docs"),
        extractStoragePath(m.documentacion, "musician-docs"),
        extractStoragePath(m.docred, "musician-docs")
      ].filter(Boolean) as string[];

      if (oldFiles.length > 0) {
        await supabase.storage.from("musician-docs").remove(oldFiles);
      }

      const TEMPLATE_URL = "https://raw.githubusercontent.com/rantuchom/OFRN-webapp/main/public/plantillas/plantilla_dj.pdf";
      const [pdfRes, firmaRes] = await Promise.all([
        fetch(TEMPLATE_URL).then(r => r.arrayBuffer()),
        m.firma ? fetch(m.firma).then(r => r.arrayBuffer()) : null
      ]);

      const djBytes = await generateDJInternal(m, pdfRes, firmaRes);
      const cleanSurname = sanitizePath(m.apellido);
      const djPath = `docs/dj_${cleanSurname}_${Date.now()}.pdf`;

      await supabase.storage.from("musician-docs").upload(djPath, djBytes, { contentType: 'application/pdf', upsert: true });
      const { data: { publicUrl: djUrl } } = supabase.storage.from("musician-docs").getPublicUrl(djPath);

      const packSources = [m.link_dni_img, m.link_cuil, m.link_cbu_img, djUrl].filter(u => !!u);
      const [fullBytes, mosaicBytes] = await Promise.all([
        assemblePDFInternal(packSources, "full"),
        assemblePDFInternal(packSources, "mosaic")
      ]);

      const fullPath = `docs/full_${cleanSurname}_${Date.now()}.pdf`;
      const mosPath = `docs/mos_${cleanSurname}_${Date.now()}.pdf`;

      await Promise.all([
        supabase.storage.from("musician-docs").upload(fullPath, fullBytes, { contentType: 'application/pdf', upsert: true }),
        supabase.storage.from("musician-docs").upload(mosPath, mosaicBytes, { contentType: 'application/pdf', upsert: true })
      ]);

      const { data: { publicUrl: fullUrl } } = supabase.storage.from("musician-docs").getPublicUrl(fullPath);
      const { data: { publicUrl: mosUrl } } = supabase.storage.from("musician-docs").getPublicUrl(mosPath);

      await supabase.from("integrantes").update({ link_declaracion: djUrl, documentacion: fullUrl, docred: mosUrl, last_modified_at: new Date().toISOString() }).eq("id", m.id);

      return new Response(JSON.stringify({ success: true, urls: { dj: djUrl, full: fullUrl, mosaic: mosUrl } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // --- ACCIÓN: DESCARGAR CONTENIDO DE ARCHIVO (Para Fusionar PDFs) ---
    if (action === "get_file_content") {
      const fileId = extractFileId(sourceUrl);
      if (!fileId) throw new Error("ID de archivo inválido");

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Error descargando desde Drive");

      const arrayBuffer = await response.arrayBuffer();
      // Convertimos a Base64 para enviar al frontend de forma segura
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      return new Response(JSON.stringify({ success: true, fileBase64: base64 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    // --- ACCIÓN: CREAR CARPETA DE ARCOS (BOWINGS) ---
    if (action === "create_bowing_set") {
      // 1. Obtener o crear carpeta del Programa dentro de la raíz de Arcos
      const { data: prog } = await supabase.from("programas").select("nomenclador").eq("id", programId).single();
      const programFolderName = prog?.nomenclador || `Prog_${programId}`;

      const parentSearch = await drive.files.list({
        q: `name = '${programFolderName}' and '${PROGRAMAS_ARCOS_ROOT_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id)"
      });

      let programFolderId;
      if (parentSearch.data.files?.length) {
        programFolderId = parentSearch.data.files[0].id;
      } else {
        const pf = await drive.files.create({
          requestBody: { name: programFolderName, mimeType: "application/vnd.google-apps.folder", parents: [PROGRAMAS_ARCOS_ROOT_ID] },
          fields: "id"
        });
        programFolderId = pf.data.id;
      }

      // 2. Crear la carpeta específica del Set (ej: Arcos 2024 - Titulo Obra)
      const setFolderName = `${nombreSet} - ${obraTitulo}`;
      const res = await drive.files.create({
        requestBody: { name: setFolderName, mimeType: "application/vnd.google-apps.folder", parents: [programFolderId] },
        fields: "id, webViewLink"
      });

      return new Response(JSON.stringify({ success: true, folderId: res.data.id, webViewLink: res.data.webViewLink }), { headers: corsHeaders });
    }

    // --- ACCIÓN: VINCULAR ARCO EXISTENTE (SHORTCUT) ---
    if (action === "link_existing_arco") {
      // 1. Obtener o crear carpeta del Programa en Arcos
      const { data: prog } = await supabase.from("programas").select("nomenclador").eq("id", programId).single();
      const programFolderName = prog?.nomenclador || `Prog_${programId}`;

      const parentSearch = await drive.files.list({
        q: `name = '${programFolderName}' and '${PROGRAMAS_ARCOS_ROOT_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id)"
      });

      let programFolderId;
      if (parentSearch.data.files?.length) {
        programFolderId = parentSearch.data.files[0].id;
      } else {
        const pf = await drive.files.create({
          requestBody: { name: programFolderName, mimeType: "application/vnd.google-apps.folder", parents: [PROGRAMAS_ARCOS_ROOT_ID] },
          fields: "id"
        });
        programFolderId = pf.data.id;
      }

      // 2. Crear acceso directo (Shortcut) al arco original
      const shortcutName = `${nombreSet} - ${obraTitulo}`;
      const res = await drive.files.create({
        requestBody: {
          name: shortcutName,
          mimeType: "application/vnd.google-apps.shortcut",
          parents: [programFolderId],
          shortcutDetails: { targetId: targetDriveId }
        },
        fields: "id, webViewLink"
      });

      return new Response(JSON.stringify({ success: true, shortcutId: res.data.id }), { headers: corsHeaders });
    }

    // --- ACCIÓN: LIMPIAR SHORTCUTS AL ELIMINAR OBRA ---
    if (action === "delete_work_shortcuts") {
      const { data: prog } = await supabase.from("programas").select("nomenclador").eq("id", programId).single();
      const programFolderName = prog?.nomenclador || `Prog_${programId}`;

      const parentSearch = await drive.files.list({
        q: `name = '${programFolderName}' and '${PROGRAMAS_ARCOS_ROOT_ID}' in parents and trashed = false`,
        fields: "files(id)"
      });

      if (parentSearch.data.files?.length) {
        const pId = parentSearch.data.files[0].id;
        // Buscar archivos que contengan el título de la obra
        const toDelete = await drive.files.list({
          q: `'${pId}' in parents and name contains '${obraTitulo}' and trashed = false`,
          fields: "files(id)"
        });
        for (const file of (toDelete.data.files || [])) {
          await drive.files.delete({ fileId: file.id });
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }
    // --- ACCIÓN: GENERAR DJ INDIVIDUAL ---
    if (action === "generate_dj_bucket") {
      let { data: m, error: mError } = await supabase.from("integrantes").select(`*, residencia:localidades!id_localidad(localidad), laboral:locaciones!id_domicilio_laboral(nombre, direccion, id_localidad, localidades:localidades!id_localidad(localidad))`).eq("id", musicianId).single();
      if (mError) {
        console.error("[generate_dj_bucket] Error consultando integrante:", mError);
        // Intentar sin la relación laboral si falla
        const { data: mBasic, error: basicError } = await supabase.from("integrantes").select(`*, residencia:localidades!id_localidad(localidad)`).eq("id", musicianId).single();
        if (basicError || !mBasic) throw new Error(`Error al obtener datos del músico: ${mError.message}`);
        m = mBasic;
      }
      if (!m) throw new Error("Músico no encontrado");

      // Si hay id_domicilio_laboral, obtener la locación y su localidad por separado
      if (m.id_domicilio_laboral && !m.laboral) {
        const { data: locacion } = await supabase.from("locaciones").select("nombre, direccion, id_localidad, localidades:localidades!id_localidad(localidad)").eq("id", m.id_domicilio_laboral).single();
        if (locacion) m.laboral = locacion;
      }

      const oldDj = extractStoragePath(m.link_declaracion, "musician-docs");
      if (oldDj) await supabase.storage.from("musician-docs").remove([oldDj]);

      const TEMPLATE_URL = "https://raw.githubusercontent.com/rantuchom/OFRN-webapp/main/public/plantillas/plantilla_dj.pdf";
      const [pdfRes, firmaRes] = await Promise.all([
        fetch(TEMPLATE_URL).then(r => r.arrayBuffer()),
        m.firma ? fetch(m.firma).then(r => r.arrayBuffer()) : null
      ]);
      const djBytes = await generateDJInternal(m, pdfRes, firmaRes);
      const djFileName = `docs/dj_${sanitizePath(m.apellido)}_${Date.now()}.pdf`;
      await supabase.storage.from("musician-docs").upload(djFileName, djBytes, { contentType: 'application/pdf', upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("musician-docs").getPublicUrl(djFileName);
      await supabase.from("integrantes").update({ link_declaracion: publicUrl }).eq("id", m.id);
      return new Response(JSON.stringify({ success: true, url: publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACCIÓN: ENSAMBLAR INDIVIDUAL (BUCKET) ---
    if (action === "assemble_docs_bucket") {
      const pdfBytes = await assemblePDFInternal(sources, layout);
      const finalPath = `results/${sanitizePath(fileName)}_${Date.now()}.pdf`;
      await supabase.storage.from("musician-docs").upload(finalPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("musician-docs").getPublicUrl(finalPath);
      return new Response(JSON.stringify({ success: true, url: publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACCIÓN: MIGRAR DRIVE A BUCKET ---
    if (action === "migrate_docs_drive_to_bucket") {
      const { count: totalPendientes } = await supabase.from("integrantes").select("*", { count: 'exact', head: true })
        .or("documentacion.ilike.%drive.google.com%,docred.ilike.%drive.google.com%");

      const { data: musicians } = await supabase.from("integrantes").select("id, apellido, nombre, documentacion, docred")
        .or("documentacion.ilike.%drive.google.com%,docred.ilike.%drive.google.com%").limit(10);

      let procesados = 0;
      for (const m of (musicians || [])) {
        for (const field of ["documentacion", "docred"]) {
          const driveUrl = m[field];
          if (driveUrl?.includes("drive.google.com")) {
            const fId = extractFileId(driveUrl);
            if (!fId) continue;
            try {
              const meta = await drive.files.get({ fileId: fId, fields: "name, mimeType" });
              const bytes = await downloadDriveFile(fId, token!);
              if (bytes) {
                const cleanName = sanitizePath(meta.data.name || "archivo");
                const filePath = `docs/${m.id}_${field}_${cleanName}`;
                await supabase.storage.from("musician-docs").upload(filePath, bytes, { contentType: meta.data.mimeType, upsert: true });
                const { data: { publicUrl } } = supabase.storage.from("musician-docs").getPublicUrl(filePath);
                await supabase.from("integrantes").update({ [field]: publicUrl }).eq("id", m.id);
                procesados++;
              }
            } catch (e) { console.error(`Err migración ${m.apellido}:`, e.message); }
          }
        }
      }
      return new Response(JSON.stringify({ success: true, procesados, restantes: (totalPendientes || 0) - procesados }), { headers: corsHeaders });
    }

    // --- ACCIÓN: SUBIR A DRIVE DESDE UNA URL (Exportación Viáticos) ---
    if (action === "upload_from_url") {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`No se pudo descargar el archivo`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify({ name: newName, parents: [targetParentId] })], { type: "application/json" }));
      form.append("file", new Blob([bytes], { type: "application/pdf" }));

      const upRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
      });
      const upData = await upRes.json();
      if (upData.error) throw new Error(upData.error.message);
      return new Response(JSON.stringify({ success: true, fileId: upData.id, webViewLink: upData.webViewLink }), { headers: corsHeaders });
    }

    // --- ACCIÓN: DRIVE - UPLOAD FILE (General) ---
    if (action === "upload_file") {
      const finalParentId = parentId || extractFileId(folderUrl);
      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify({ name: fileName, parents: [finalParentId] })], { type: "application/json" }));
      form.append("file", new Blob([bytes], { type: mimeType }));
      const upRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form
      });
      const upData = await upRes.json();
      return new Response(JSON.stringify({ success: true, webViewLink: upData.webViewLink, fileId: upData.id }), { headers: corsHeaders });
    }

    // --- BUSCA ESTE BLOQUE EN TU EDGE FUNCTION ---
    if (action === "list_folder_files") {
      console.log("DEBUG [Edge]: Iniciando list_folder_files.");
      console.log("DEBUG [Edge]: URL recibida:", folderUrl);

      const folderId = extractFileId(folderUrl);
      console.log("DEBUG [Edge]: ID de carpeta extraído:", folderId);

      if (!folderId) {
        console.error("DEBUG [Edge]: No se pudo extraer el ID de la URL provista.");
      }

      try {
        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: "files(id, name, webViewLink, mimeType)",
          pageSize: 100,
          orderBy: "name",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        console.log(`DEBUG [Edge]: Google API respondió. Archivos encontrados: ${res.data.files?.length || 0}`);

        return new Response(JSON.stringify({ success: true, files: res.data.files || [] }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json" // <--- ESTO ES LO QUE FALTA
            }
          });
      } catch (error) {
        console.error("DEBUG [Edge]: Error al llamar a Google Drive API:", error.message);
        throw error;
      }
    }
    // =================================================================================
    // ACCIÓN: SINCRONIZAR ARCOS (V4 - DRIVE AS SOURCE OF TRUTH)
    // =================================================================================
    if (action === "sync_bowing_to_program") {
      const { programId, obraTitulo, nombreSet, targetDriveId, obraId } = body;

      if (!programId || !obraId) throw new Error("Faltan parámetros (programId, obraId)");

      // --- 0. OBTENER DATOS DE BD ---
      const { data: prog } = await supabase.from("programas").select("*").eq("id", programId).single();
      const { data: obra } = await supabase.from("obras").select("*").eq("id", obraId).single();

      if (!prog || !obra) throw new Error("No se encontraron registros de Programa u Obra");

      const tourRootId = prog.google_drive_folder_id;
      if (!tourRootId) throw new Error("La gira no tiene carpeta principal (D1). Sincroniza la gira primero.");

      // -----------------------------------------------------------------------
      // NIVEL OBRAS (Biblioteca Central)
      // -----------------------------------------------------------------------

      // --- 1. GESTIONAR CARPETA MAESTRA DE LA OBRA (O2) ---
      let workMasterId = obra.id_folder_arcos;
      // Nombre por defecto (solo si hay que crearla), saneado
      let workDriveName = obra.titulo.replace(/<[^>]*>?/gm, '').trim();

      let workMasterExists = false;

      if (workMasterId) {
        try {
          // IMPORTANTE: Leemos el nombre REAL de Drive
          const f = await drive.files.get({ fileId: workMasterId, fields: "id, name, trashed" });
          if (!f.data.trashed) {
            workMasterExists = true;
            workDriveName = f.data.name; // <--- TOMAMOS EL NOMBRE DE DRIVE
          }
        } catch (e) { }
      }

      if (!workMasterExists) {
        // Buscar por nombre (fallback)
        const q = `name = '${workDriveName}' and '${OBRAS_REAL_STORAGE_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const search = await drive.files.list({ q, fields: "files(id, name)" });

        if (search.data.files && search.data.files.length > 0) {
          workMasterId = search.data.files[0].id;
          workDriveName = search.data.files[0].name; // <--- TOMAMOS EL NOMBRE DE DRIVE
        } else {
          // Crear
          const newMaster = await drive.files.create({
            requestBody: {
              name: workDriveName,
              mimeType: "application/vnd.google-apps.folder",
              parents: [OBRAS_REAL_STORAGE_ID]
            },
            fields: "id, name"
          });
          workMasterId = newMaster.data.id;
          workDriveName = newMaster.data.name;
        }
        await supabase.from("obras").update({ id_folder_arcos: workMasterId }).eq("id", obraId);
      }

      // --- 2. GESTIONAR EL SET REAL DE ARCOS (O3) ---
      let finalSetId = targetDriveId;
      let setDriveName = nombreSet || "Set Arcos";

      if (finalSetId) {
        // CASO A: VINCULAR EXISTENTE -> Leemos el nombre REAL de Drive
        try {
          const originalFile = await drive.files.get({ fileId: finalSetId, fields: "name" });
          setDriveName = originalFile.data.name; // <--- TOMAMOS EL NOMBRE DE DRIVE
        } catch (e) { console.error("Error leyendo set original:", e); }
      } else {
        // CASO B: CREAR NUEVO -> Usamos el nombre propuesto (que será el de Drive)
        const newSet = await drive.files.create({
          requestBody: {
            name: setDriveName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [workMasterId]
          },
          fields: "id, webViewLink, name"
        });
        finalSetId = newSet.data.id;
        setDriveName = newSet.data.name;
      }

      // -----------------------------------------------------------------------
      // NIVEL GIRA (Estructura Operativa)
      // -----------------------------------------------------------------------

      // --- 3. GESTIONAR CARPETA DE ARCOS DE LA GIRA (G1) ---
      const tourArcosName = `Arcos ${prog.nomenclador || 'Gira'}`;
      let tourArcosId = prog.id_folder_arcos;
      let tourArcosExists = false;

      if (tourArcosId) {
        try {
          const f = await drive.files.get({ fileId: tourArcosId, fields: "id, name, trashed" });
          if (!f.data.trashed) {
            tourArcosExists = true;
            if (f.data.name !== tourArcosName) {
              await drive.files.update({ fileId: tourArcosId, requestBody: { name: tourArcosName } });
            }
          }
        } catch (e) { }
      }

      if (!tourArcosExists) {
        const newFolder = await drive.files.create({
          requestBody: {
            name: tourArcosName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [PROGRAMAS_ARCOS_ROOT_ID]
          },
          fields: "id"
        });
        tourArcosId = newFolder.data.id;
        await supabase.from("programas").update({ id_folder_arcos: tourArcosId }).eq("id", programId);
      }

      // --- 4. GESTIONAR ACCESO DIRECTO A G1 (S1) ---
      let shortcutG1Id = prog.id_shortcut_arcos_drive;
      let shortcutG1Exists = false;

      if (shortcutG1Id) {
        try {
          const s = await drive.files.get({ fileId: shortcutG1Id, fields: "trashed" });
          if (!s.data.trashed) shortcutG1Exists = true;
        } catch (e) { }
      }

      if (!shortcutG1Exists) {
        const qS1 = `'${tourRootId}' in parents and mimeType = 'application/vnd.google-apps.shortcut' and name = '${tourArcosName}' and trashed = false`;
        const searchS1 = await drive.files.list({ q: qS1, fields: "files(id)" });

        if (searchS1.data.files && searchS1.data.files.length > 0) {
          shortcutG1Id = searchS1.data.files[0].id;
        } else {
          const s1 = await drive.files.create({
            requestBody: {
              name: tourArcosName,
              mimeType: "application/vnd.google-apps.shortcut",
              parents: [tourRootId],
              shortcutDetails: { targetId: tourArcosId }
            },
            fields: "id"
          });
          shortcutG1Id = s1.data.id;
        }
        await supabase.from("programas").update({ id_shortcut_arcos_drive: shortcutG1Id }).eq("id", programId);
      }

      // --- 5. GESTIONAR SHORTCUT DEL SET (S2) ---

      // CONSTRUCCIÓN DEL NOMBRE ESTANDARIZADO
      // Lógica: Si el nombre del set ya empieza con "Arcos", no lo duplicamos.
      let prefix = "Arcos ";
      if (setDriveName.toLowerCase().startsWith("arcos")) prefix = "";

      const standardizedName = `${prefix}${setDriveName} - ${workDriveName}`;

      // LIMPIEZA: Borrar shortcuts previos que contengan el nombre de la OBRA
      // (Porque la obra es lo único constante si cambias de set)
      const safeWorkName = workDriveName.replace(/'/g, "\\'");
      const qCleanup = `'${tourArcosId}' in parents and mimeType = 'application/vnd.google-apps.shortcut' and name contains '${safeWorkName}' and trashed = false`;

      try {
        const candidates = await drive.files.list({ q: qCleanup, fields: "files(id, name)" });
        if (candidates.data.files && candidates.data.files.length > 0) {
          for (const file of candidates.data.files) {
            // Verificamos que sea realmente de esta obra
            if (file.name.toLowerCase().includes(workDriveName.toLowerCase())) {
              console.log(`[Clean] Reemplazando: ${file.name}`);
              await drive.files.delete({ fileId: file.id });
            }
          }
        }
      } catch (e) { console.error("Error limpieza S2:", e); }

      // CREAR NUEVO
      const s2 = await drive.files.create({
        requestBody: {
          name: standardizedName,
          mimeType: "application/vnd.google-apps.shortcut",
          parents: [tourArcosId],
          shortcutDetails: { targetId: finalSetId }
        },
        fields: "id"
      });
      const shortcutS2Id = s2.data.id;

      return new Response(JSON.stringify({
        success: true,
        realFolderId: finalSetId,
        shortcutId: shortcutS2Id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ACCIÓN: SYNC PROGRAM METADATA (nomenclador + mes_letra + carpeta raíz) ---
    if (action === "sync_program_metadata") {
      const targetProgramId = programId || body.id || body.id_gira;
      if (!targetProgramId) {
        throw new Error("ID de programa no proporcionado para sync_program_metadata.");
      }

      const { data: progBasic, error: progError } = await supabase
        .from("programas")
        .select("id, fecha_desde, tipo, nomenclador, giras_fuentes(tipo, valor_id, valor_texto)")
        .eq("id", targetProgramId)
        .single();

      if (progError || !progBasic) {
        console.error("[SYNC_METADATA] Error DB:", progError);
        throw new Error("No se encontró el programa especificado.");
      }

      const {
        updated: nomencladorUpdated,
        updatedIds,
        list: listAfterAudit
      } = await auditAndApplyNomencladores(
        supabase,
        [progBasic as ProgramRow],
        [targetProgramId]
      );

      const finalProgramId =
        updatedIds[0] ?? listAfterAudit[0]?.id ?? targetProgramId;

      const { data: progFull, error: fullError } = await supabase
        .from("programas")
        .select("id, fecha_desde, fecha_hasta, mes_letra, zona, nomenclador, google_drive_folder_id")
        .eq("id", finalProgramId)
        .single();

      if (fullError || !progFull) {
        console.error("[SYNC_METADATA] Error cargando programa completo:", fullError);
        throw new Error("No se pudo cargar el programa para Drive.");
      }

      const folderId = await syncProgramRootFolder(supabase, drive, progFull);

      return new Response(
        JSON.stringify({
          success: true,
          programId: finalProgramId,
          folderId,
          nomencladorUpdated: nomencladorUpdated ?? 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACCIÓN: SYNC REPERTOIRE SHORTCUTS (sólo subcarpetas y accesos directos) ---
    if (action === "sync_repertoire_shortcuts") {
      const targetProgramId = programId || body.id || body.id_gira;
      if (!targetProgramId) {
        throw new Error("ID de programa no proporcionado para sync_repertoire_shortcuts.");
      }

      const { data: progFull, error: progError } = await supabase
        .from("programas")
        .select(`
          *,
          programas_repertorios(
            *,
            repertorio_obras(*, obras(*))
          ),
          giras_fuentes(*)
        `)
        .eq("id", targetProgramId)
        .single();

      if (progError || !progFull) {
        console.error("[SYNC_REPERTOIRE] Error DB:", progError);
        throw new Error("No se encontró el programa especificado.");
      }

      if (!progFull.google_drive_folder_id) {
        throw new Error(
          "El programa no tiene carpeta principal en Drive. Ejecuta primero sync_program_metadata."
        );
      }

      await syncProgramRepertoireShortcuts(supabase, drive, progFull);

      return new Response(
        JSON.stringify({
          success: true,
          programId: targetProgramId,
          synced: 1
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACCIÓN: SYNC / DELETE PROGRAM ---
    if (action === "sync_program" || action === "delete_program") {
      const targetProgramId = programId || body.id || body.id_gira;
      console.log(`[SYNC] Acción: ${action}, ID: ${targetProgramId ?? "TODOS (vigentes)"}`);

      // delete_program siempre requiere ID
      if (action === "delete_program") {
        if (!targetProgramId) throw new Error("ID de programa no proporcionado para eliminar.");
        const { data: prog, error: progError } = await supabase
          .from("programas")
          .select("id, google_drive_folder_id")
          .eq("id", targetProgramId)
          .single();
        if (progError || !prog) throw new Error("No se encontró el programa especificado.");
        if (prog.google_drive_folder_id) {
          try {
            await drive.files.delete({ fileId: prog.google_drive_folder_id });
          } catch (e) {
            console.error("Error borrando carpeta:", (e as Error).message);
          }
        }
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // sync_program: auditoría de nomencladores (backend centraliza la "estantería" del año)
      const selectProgramas = `
        *,
        programas_repertorios(*, repertorio_obras(*, obras(*))),
        giras_fuentes(*)
      `;
      let programsToAudit: ProgramRow[];
      if (!targetProgramId) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: programas, error: listError } = await supabase
          .from("programas")
          .select("id, fecha_desde, tipo, nomenclador, giras_fuentes(tipo, valor_id, valor_texto)")
          .eq("estado", "Vigente")
          .gte("fecha_hasta", today);
        if (listError) {
          console.error("[SYNC] Error listando programas:", listError);
          throw new Error("No se pudieron listar las giras vigentes.");
        }
        programsToAudit = (programas || []) as ProgramRow[];
        console.log(`[SYNC] Auditoría de nomencladores para ${programsToAudit.length} programa(s) vigente(s).`);
      } else {
        const { data: prog, error: progError } = await supabase
          .from("programas")
          .select("id, fecha_desde, tipo, nomenclador, giras_fuentes(tipo, valor_id, valor_texto)")
          .eq("id", targetProgramId)
          .single();
        if (progError || !prog) {
          console.error("[SYNC] Error DB:", progError);
          throw new Error("No se encontró el programa especificado.");
        }
        programsToAudit = [prog as ProgramRow];
      }

      const { updated: nomencladorUpdated, updatedIds, list: listAfterAudit } =
        await auditAndApplyNomencladores(supabase, programsToAudit);
      if (nomencladorUpdated > 0) {
        console.log(`[SYNC] Nomencladores actualizados en DB: ${nomencladorUpdated}`);
      }

      const idsToSync = [...new Set([...listAfterAudit.map((p) => p.id), ...updatedIds])];
      let list: any[] = [];
      if (idsToSync.length > 0) {
        const { data: fullPrograms, error: fullError } = await supabase
          .from("programas")
          .select(selectProgramas)
          .in("id", idsToSync);
        if (fullError) {
          console.error("[SYNC] Error cargando programas completos:", fullError);
          throw new Error("No se pudieron cargar los programas para Drive.");
        }
        list = fullPrograms || [];
      }
      for (const prog of list) {
        try {
          await syncOneProgram(supabase, drive, prog);
        } catch (e) {
          console.error(`[SYNC] Error en programa ${prog.id}:`, (e as Error).message);
        }
      }
      console.log("[SYNC] Sincronización Drive finalizada.");
      return new Response(
        JSON.stringify({
          success: true,
          synced: list.length,
          nomencladorUpdated: nomencladorUpdated ?? 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- ACCIÓN: COPIAR UN ARCHIVO ÚNICO ---
    if (action === "copy_file") {
      const res = await drive.files.copy({
        fileId: extractFileId(sourceUrl),
        requestBody: { name: newName, parents: [targetParentId] },
        fields: "id, webViewLink, name",
        supportsAllDrives: true,
      });
      return new Response(
        JSON.stringify({ success: true, file: res.data }),
        { headers: corsHeaders },
      );
    }

    // --- ACCIÓN: COPIAR VARIOS ARCHIVOS EN BATCH (Scores para Arcos, etc.) ---
    if (action === "COPY_FILES_BATCH") {
      const files = Array.isArray(body.files) ? body.files : [];
      if (!files.length) {
        throw new Error("No se recibieron archivos para copiar (files vacío).");
      }

      // Permite reparar giras sin carpeta de Arcos:
      // si no se proporciona destinationFolderId pero sí giraId/programId,
      // se crea (o reutiliza) la carpeta "Arcos <nomenclador>" y su shortcut.
      const giraIdForBatch: number | null =
        body.giraId ?? body.programId ?? body.id_gira ?? null;
      let cachedTourArcosId: string | null = null;

      const ensureTourArcosFolderForBatch = async (): Promise<string> => {
        if (cachedTourArcosId) return cachedTourArcosId;
        if (!giraIdForBatch) {
          throw new Error(
            "No se pudo resolver la carpeta de Arcos: falta giraId/programId en la petición.",
          );
        }

        const { data: prog, error: progError } = await supabase
          .from("programas")
          .select(
            "id, nomenclador, google_drive_folder_id, id_folder_arcos, id_shortcut_arcos_drive",
          )
          .eq("id", giraIdForBatch)
          .single();

        if (progError || !prog) {
          throw new Error("No se encontró el programa para crear carpeta de Arcos.");
        }

        const tourRootId = prog.google_drive_folder_id;
        if (!tourRootId) {
          throw new Error(
            "La gira no tiene carpeta principal en Drive. Ejecuta primero sync_program_metadata.",
          );
        }

        const tourArcosName = `Arcos ${prog.nomenclador || "Gira"}`;
        let tourArcosId = prog.id_folder_arcos as string | null;
        let tourArcosExists = false;

        if (tourArcosId) {
          try {
            const f = await drive.files.get({
              fileId: tourArcosId,
              fields: "id, name, trashed",
            });
            if (!f.data.trashed) {
              tourArcosExists = true;
              if (f.data.name !== tourArcosName) {
                await drive.files.update({
                  fileId: tourArcosId,
                  requestBody: { name: tourArcosName },
                });
              }
            }
          } catch {
            // Si falla, lo recreamos más abajo.
          }
        }

        if (!tourArcosExists) {
          const newFolder = await drive.files.create({
            requestBody: {
              name: tourArcosName,
              mimeType: "application/vnd.google-apps.folder",
              parents: [PROGRAMAS_ARCOS_ROOT_ID],
            },
            fields: "id",
          });
          tourArcosId = newFolder.data.id!;
          await supabase
            .from("programas")
            .update({ id_folder_arcos: tourArcosId })
            .eq("id", giraIdForBatch);
        }

        // Shortcut G1 en la carpeta principal de la gira
        let shortcutG1Id = prog.id_shortcut_arcos_drive as string | null;
        let shortcutG1Exists = false;
        if (shortcutG1Id) {
          try {
            const s = await drive.files.get({
              fileId: shortcutG1Id,
              fields: "trashed",
            });
            if (!s.data.trashed) shortcutG1Exists = true;
          } catch {
            // lo recreamos abajo
          }
        }

        if (!shortcutG1Exists) {
          const qS1 =
            `'${tourRootId}' in parents and mimeType = 'application/vnd.google-apps.shortcut' ` +
            `and name = '${tourArcosName}' and trashed = false`;
          const searchS1 = await drive.files.list({
            q: qS1,
            fields: "files(id)",
          });

          if (searchS1.data.files && searchS1.data.files.length > 0) {
            shortcutG1Id = searchS1.data.files[0].id!;
          } else {
            const s1 = await drive.files.create({
              requestBody: {
                name: tourArcosName,
                mimeType: "application/vnd.google-apps.shortcut",
                parents: [tourRootId],
                shortcutDetails: { targetId: tourArcosId },
              },
              fields: "id",
            });
            shortcutG1Id = s1.data.id!;
          }

          await supabase
            .from("programas")
            .update({ id_shortcut_arcos_drive: shortcutG1Id })
            .eq("id", giraIdForBatch);
        }

        cachedTourArcosId = tourArcosId!;
        return cachedTourArcosId;
      };

      const results: Array<{
        sourceId: string;
        destinationFolderId: string;
        newFileId?: string;
        webViewLink?: string | null;
        name?: string | null;
        error?: string;
      }> = [];

      for (const entry of files) {
        const rawId = entry?.fileId || entry?.sourceId;
        let destFolder = entry?.destinationFolderId || entry?.targetFolderId;
        const newNameForCopy: string | undefined = entry?.newName;
        const prefixLabel: string | undefined = entry?.prefixLabel;

        const fileId = typeof rawId === "string" ? rawId : extractFileId(rawId);

        if (!destFolder && giraIdForBatch != null) {
          destFolder = await ensureTourArcosFolderForBatch();
        }

        if (!fileId || !destFolder) {
          results.push({
            sourceId: rawId ?? "",
            destinationFolderId: destFolder ?? "",
            error: "Parámetros inválidos (fileId o destinationFolderId faltantes).",
          });
          continue;
        }

        try {
          // Si no se provee newName, usamos el nombre original del archivo en Drive
          // y aplicamos opcionalmente un prefijo (por ejemplo "[ARCOS] ").
          let finalName = newNameForCopy;
          if (!finalName) {
            const meta = await drive.files.get({
              fileId,
              fields: "name",
              supportsAllDrives: true,
            });
            const originalName = (meta.data.name || "archivo").slice(0, 255);
            finalName = prefixLabel ? `${prefixLabel}${originalName}` : originalName;
          }

          // Evitar duplicados: si ya existe un archivo con ese nombre en la carpeta destino, lo saltamos.
          const safeNameForQuery = finalName.replace(/'/g, "\\'");
          const existing = await drive.files.list({
            q: `'${destFolder}' in parents and name = '${safeNameForQuery}' and trashed = false`,
            fields: "files(id)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
          if (existing.data.files && existing.data.files.length > 0) {
            results.push({
              sourceId: fileId,
              destinationFolderId: destFolder,
              name: finalName,
              error: "ALREADY_EXISTS",
            });
            continue;
          }

          const copied = await drive.files.copy({
            fileId,
            requestBody: {
              name: finalName,
              parents: [destFolder],
            },
            fields: "id, webViewLink, name",
            supportsAllDrives: true,
          });

          results.push({
            sourceId: fileId,
            destinationFolderId: destFolder,
            newFileId: copied.data.id || undefined,
            webViewLink: copied.data.webViewLink || null,
            name: copied.data.name || null,
          });
        } catch (e: any) {
          console.error("[COPY_FILES_BATCH] Error copiando archivo:", e?.message || e);
          results.push({
            sourceId: fileId,
            destinationFolderId: destFolder,
            error: e?.message || "Error desconocido al copiar archivo.",
          });
        }
      }

      const copiedCount = results.filter((r) => !r.error && r.newFileId).length;

      return new Response(
        JSON.stringify({
          success: true,
          copied: copiedCount,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- ACCIÓN: BORRAR / PERMISOS MASIVOS ---
    if (action === "delete_file") {
      try { await drive.files.delete({ fileId }); } catch (e) { }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }
    if (action === "fix_permissions") {
      const tIds = [PROGRAMAS_ARCOS_ROOT_ID, OBRAS_REAL_STORAGE_ID, ROOT_FOLDER_ID];
      for (const id of tIds) try { await drive.permissions.create({ fileId: id, requestBody: { role: role || 'writer', type: 'user', emailAddress: targetEmail } }); } catch (e) { }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ message: "Action not found" }), { headers: corsHeaders, status: 404 });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});

