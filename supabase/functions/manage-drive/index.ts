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
const PARTICELLA_SETS_ROOT_ID = "1BK8yhY1dvAZRrDwEDXg3VR3QlnmdOH4u";
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const GIRAS_ROOT_ID = "1PRWEbGKUBxfhF9HIf2DgpOWKDRwslsCc";
const ARCHIVO_OBRAS_FOLDER_ID = "10JQJW7YX7UNmWciqgJ-EiqaldM_e0Tvi";
/** Carpeta «Misceláneos» del Archivo (selecciones ad-hoc del catálogo). */
const ARCHIVO_MISC_FOLDER_ID = "10-gPJSotDGO4yvHXo9pG_Kcg7XAMa5za";
/** Carpeta compartida «Para acomodar» (staging antes de archivo oficial). */
const PARA_ACOMODAR_FOLDER_ID = "10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI";
/** Carpeta «ENSAMBLES» dentro de Partituras (accesos directos por ensamble). */
const ENSAMBLES_ROOT_FOLDER_ID = "1KgrMdi_vv3dYxPLsI80iiz3uM9aAgWPi";
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";
const DRIVE_SHARED_OPTS = { supportsAllDrives: true, includeItemsFromAllDrives: true };
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

// Extrae el path relativo para borrar archivos del Bucket (evita falsos positivos con split por nombre de bucket)
const extractStoragePath = (url: string, bucket: string) => {
  if (!url || typeof url !== "string") return null;
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
  ];
  for (const m of markers) {
    const i = url.indexOf(m);
    if (i === -1) continue;
    let path = url.slice(i + m.length);
    path = path.split("?")[0].split("#")[0];
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  }
  const needle = `${bucket}/`;
  const idx = url.indexOf(needle);
  if (idx === -1) return null;
  let path = url.slice(idx + needle.length);
  path = path.split("?")[0].split("#")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

/** Supabase JS no lanza en upload fallido: hay que leer `error` o la BD guarda URLs rotas (404). */
const throwIfStorageUploadError = (
  result: { error?: { message?: string } | null },
  label: string,
) => {
  if (result?.error?.message) {
    throw new Error(`${label}: ${result.error.message}`);
  }
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

function stripHtmlTitulo(html: string): string {
  return (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function getTituloPrimeraLinea(html: string): string {
  return stripHtmlTitulo(html).split(/\r?\n/)[0]?.trim() || "";
}

function buildParaAcomodarFolderNameFromRelations(
  tituloHtml: string,
  rels: { rol: string; compositores?: { apellido?: string; nombre?: string } | null }[],
): string | null {
  const titulo = getTituloPrimeraLinea(tituloHtml);
  const compRow = rels.find((r) => r.rol === "compositor");
  const comp = compRow?.compositores;
  if (!titulo || !comp?.apellido) return null;

  const arrRow = rels.find((r) => r.rol === "arreglador");
  const arrApellido = arrRow?.compositores?.apellido;
  if (arrApellido) {
    return `${comp.apellido}-${arrApellido} - ${titulo}`;
  }

  const inicial = comp.nombre ? `${comp.nombre.charAt(0).toUpperCase()}.` : "";
  const prefijo = inicial ? `${comp.apellido}, ${inicial}` : comp.apellido;
  return `${prefijo} - ${titulo}`;
}

async function isDriveItemUnderFolder(
  drive: ReturnType<typeof google.drive>,
  itemId: string,
  ancestorFolderId: string,
  opts: Record<string, unknown>,
  depth = 0,
): Promise<boolean> {
  if (!itemId || depth > 25) return false;
  if (itemId === ancestorFolderId) return true;
  try {
    const meta = await drive.files.get({
      fileId: itemId,
      fields: "parents",
      ...opts,
    });
    const parents: string[] = meta.data?.parents || [];
    for (const p of parents) {
      if (p === ancestorFolderId) return true;
      if (await isDriveItemUnderFolder(drive, p, ancestorFolderId, opts, depth + 1)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function copyLinkIntoDriveFolder(
  drive: ReturnType<typeof google.drive>,
  linkOrigen: string,
  sourceId: string,
  parentFolderId: string,
  nombreCarpeta: string,
  driveOpts: { supportsAllDrives?: boolean; includeItemsFromAllDrives?: boolean },
): Promise<{ link_drive: string; folder_name: string }> {
  const safeName = String(nombreCarpeta).slice(0, 200).replace(/[/\\?*:\[\]]/g, "_");

  let sourceMime = "";
  let sourceName = "archivo";
  try {
    const sourceMeta = await drive.files.get({
      fileId: sourceId,
      fields: "mimeType, name",
      ...driveOpts,
    });
    sourceMime = sourceMeta.data?.mimeType || "";
    sourceName = (sourceMeta.data?.name || "archivo").slice(0, 255);
  } catch (e) {
    if (isDriveAccessDeniedError(e)) {
      const perm = await requestDriveAccessForServiceAccount(drive, sourceId, driveOpts);
      const payload = driveAccessDeniedPayload({
        permissionRequested: perm.ok,
        sourceFileId: sourceId,
        linkOrigen: linkOrigen,
        requestDetail: perm.ok ? undefined : perm.detail,
      });
      throw Object.assign(new Error(payload.error), { drivePayload: payload });
    }
    throw e;
  }

  const nuevaCarpeta = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: FOLDER_MIME,
      parents: [parentFolderId],
    },
    fields: "id, webViewLink",
    ...driveOpts,
  });
  const destFolderId = nuevaCarpeta.data.id!;

  if (sourceMime === FOLDER_MIME) {
    await copyFolderContentsRecursive(drive, sourceId, destFolderId, driveOpts);
  } else {
    await drive.files.copy({
      fileId: sourceId,
      requestBody: { name: sourceName, parents: [destFolderId] },
      fields: "id",
      ...driveOpts,
    });
  }

  const meta = await drive.files.get({
    fileId: destFolderId,
    fields: "webViewLink",
    ...driveOpts,
  });
  const linkDrive =
    meta.data.webViewLink || `https://drive.google.com/drive/folders/${destFolderId}`;

  return { link_drive: linkDrive, folder_name: safeName };
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

/** Cuenta OAuth del Archivo (G_REFRESH_TOKEN); no es la cuenta personal del navegador del usuario. */
const DRIVE_SERVICE_EMAIL = Deno.env.get("G_DRIVE_ACCOUNT_EMAIL") || "ofrn.archivo@gmail.com";

function isDriveAccessDeniedError(e: unknown): boolean {
  const err = e as { code?: number; message?: string; response?: { status?: number; data?: { error?: { message?: string } } } };
  const status = err?.code ?? err?.response?.status;
  if (status === 403 || status === 404) return true;
  const msg = String(
    err?.message || err?.response?.data?.error?.message || "",
  ).toLowerCase();
  return (
    msg.includes("not found") ||
    msg.includes("file not found") ||
    msg.includes("insufficient") ||
    msg.includes("forbidden") ||
    msg.includes("permission") ||
    msg.includes("caller does not have")
  );
}

async function requestDriveAccessForServiceAccount(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  opts: { supportsAllDrives?: boolean; includeItemsFromAllDrives?: boolean } = {},
): Promise<{ ok: boolean; detail?: string }> {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: DRIVE_SERVICE_EMAIL,
      },
      sendNotificationEmail: true,
      emailMessage:
        "El Archivo de la OFRN necesita acceso a este archivo o carpeta para copiarlo a «Para acomodar».",
      supportsAllDrives: true,
      ...opts,
    });
    return { ok: true };
  } catch (pe: unknown) {
    const detail = (pe as { message?: string })?.message;
    return { ok: false, detail };
  }
}

function driveAccessDeniedPayload(opts: {
  permissionRequested: boolean;
  sourceFileId: string;
  linkOrigen?: string;
  requestDetail?: string;
}) {
  const email = DRIVE_SERVICE_EMAIL;
  let msg =
    `La cuenta de Google Drive del Archivo (${email}) no puede acceder al archivo o carpeta de origen.`;
  if (opts.permissionRequested) {
    msg +=
      "\n\nSe envió una solicitud de acceso por correo a esa cuenta. Cuando la aceptes (o compartas manualmente), pulsa «Reintentar copia».";
  } else {
    msg +=
      `\n\nCompartí el enlace con ${email} (lector o editor) desde Google Drive, o pulsa «Solicitar acceso al Archivo» si tenés permiso para invitar a esa cuenta.`;
    if (opts.requestDetail) {
      msg += `\n\nDetalle: ${opts.requestDetail}`;
    }
  }
  return {
    error: msg,
    code: "DRIVE_ACCESS_DENIED",
    service_account_email: email,
    permission_requested: opts.permissionRequested,
    source_file_id: opts.sourceFileId,
    link_origen: opts.linkOrigen ?? null,
  };
}

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

/** Nombre del ensamble para nomenclador (sin truncar a siglas de 3 letras). */
function getEnsembleDisplayNameForNomenclador(ensambleNombre: string): string {
  const t = ensambleNombre?.trim();
  if (!t) return "Ens";
  return t;
}

function fiscalYearFromDate(fechaDesde: string): string {
  if (!fechaDesde) return "";
  const y = fechaDesde.slice(0, 4);
  return y.length === 4 ? y.slice(2) : "";
}

// =================================================================================
// NOMENCLADOR: auditoría automática por año fiscal (orquestas cronológico, ensambles por nombre + índice/año)
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
  ensembleIdToName: Map<number, string>,
  year2: string
): string {
  const sources = (prog.giras_fuentes || []).filter((f) => f.tipo === "ENSAMBLE" && f.valor_id != null);
  if (sources.length === 0) return "";

  const parts: string[] = [];
  for (const s of sources) {
    const eid = s.valor_id!;
    const name =
      ensembleIdToName.get(eid) ||
      (s.valor_texto?.trim() ? s.valor_texto.trim() : "Ens");
    const girasWithThisEnsemble = programsInYear.filter((p) =>
      (p.giras_fuentes || []).some((f) => f.tipo === "ENSAMBLE" && f.valor_id === eid)
    );
    const ordenado = [...girasWithThisEnsemble].sort(
      (a, b) => (a.fecha_desde || "").localeCompare(b.fecha_desde || "") || a.id - b.id
    );
    const idx = ordenado.findIndex((p) => p.id === prog.id);
    const num = idx >= 0 ? idx + 1 : 1;
    parts.push(`${name} ${String(num).padStart(2, "0")}/${year2}`);
  }
  return parts.join(" | ");
}

async function loadEnsembleDisplayNames(supabase: any, ensembleIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (ensembleIds.length === 0) return map;
  const { data: rows } = await supabase
    .from("ensambles")
    .select("id, ensamble")
    .in("id", [...new Set(ensembleIds)]);
  for (const r of rows || []) {
    map.set(r.id, getEnsembleDisplayNameForNomenclador(r.ensamble ?? ""));
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

    const ensembleDisplayNames = await loadEnsembleDisplayNames(supabase, [...ensembleIds]);

    for (const p of programsInYear) {
      let computed = "";
      if (isOrquestaType(p.tipo || "")) {
        const list = orquestaByPrefix.get(getTypeAbbreviation(p.tipo || "")) || [];
        computed = computeOrquestaNomenclador(list, p.id, p.tipo || "", year2);
      } else {
        computed = computeEnsambleNomenclador(programsInYear, p, ensembleDisplayNames, year2);
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

function isEnsambleProgram(tipo: string | undefined | null): boolean {
  if (!tipo) return false;
  return tipo.toLowerCase().includes("ensamble");
}

function getProgramDriveFolderName(prog: {
  fecha_desde?: string;
  fecha_hasta?: string;
  mes_letra?: string | null;
  zona?: string | null;
  nomenclador?: string | null;
}): string {
  const dateStart = prog.fecha_desde;
  const [, m] = (dateStart || "").split("-").map(Number);
  const monthPrefix = prog.mes_letra || (m ? m.toString().padStart(2, "0") : "00");
  const dateRangeStr = getFormattedDateString(prog.fecha_desde || "", prog.fecha_hasta || "");
  return `${monthPrefix} - ${dateRangeStr}${prog.zona ? ` ${prog.zona}` : ""} - ${prog.nomenclador || "SinNombre"}`;
}

function isEnsembleConvocatoriaSource(tipo: string | undefined | null): boolean {
  const t = (tipo || "").toUpperCase().replace(/\s+/g, "_");
  return (t === "ENSAMBLE" || t === "ENSAMBLES") && !t.startsWith("EXCL");
}

function getEnsembleSourceIds(prog: {
  giras_fuentes?: Array<{ tipo: string; valor_id: number | null }>;
}): number[] {
  const ids = (prog.giras_fuentes || [])
    .filter((f) => isEnsembleConvocatoriaSource(f.tipo) && f.valor_id != null)
    .map((f) => f.valor_id!);
  return [...new Set(ids)];
}

async function syncEnsambleRootFolder(
  supabase: any,
  drive: any,
  ensamble: { id: number; ensamble: string | null; google_drive_folder_id?: string | null },
): Promise<string | null> {
  const folderName = (ensamble.ensamble || "").trim() || "Ensamble";
  let folderId = ensamble.google_drive_folder_id || null;

  try {
    if (folderId) {
      await drive.files.update({
        fileId: folderId,
        requestBody: { name: folderName },
        ...DRIVE_SHARED_OPTS,
      });
    } else {
      const q =
        `'${ENSAMBLES_ROOT_FOLDER_ID}' in parents and mimeType = '${FOLDER_MIME}' ` +
        `and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
      const search = await drive.files.list({ q, fields: "files(id)", pageSize: 1, ...DRIVE_SHARED_OPTS });
      if (search.data.files?.length) {
        folderId = search.data.files[0].id!;
      } else {
        const created = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: FOLDER_MIME,
            parents: [ENSAMBLES_ROOT_FOLDER_ID],
          },
          fields: "id",
          ...DRIVE_SHARED_OPTS,
        });
        folderId = created.data.id!;
      }
      await supabase
        .from("ensambles")
        .update({ google_drive_folder_id: folderId })
        .eq("id", ensamble.id);
    }
  } catch (e) {
    console.error(`[Drive Error] Carpeta ensamble ${ensamble.id} (${folderName}):`, (e as Error).message);
    return null;
  }

  return folderId;
}

async function findShortcutByTargetInFolder(
  drive: any,
  parentFolderId: string,
  targetId: string,
): Promise<string | null> {
  try {
    const q =
      `'${parentFolderId}' in parents and mimeType = '${SHORTCUT_MIME}' and trashed = false`;
    const res = await drive.files.list({
      q,
      fields: "files(id, shortcutDetails)",
      pageSize: 200,
      ...DRIVE_SHARED_OPTS,
    });
    const match = (res.data.files || []).find(
      (f: { shortcutDetails?: { targetId?: string } }) => f.shortcutDetails?.targetId === targetId,
    );
    return match?.id ?? null;
  } catch (e) {
    console.error(`[Drive] Error buscando shortcut en carpeta ${parentFolderId}:`, (e as Error).message);
    return null;
  }
}

async function removeEnsambleProgramShortcuts(
  supabase: any,
  drive: any,
  programId: number,
  ensambleIds?: number[],
): Promise<number> {
  let q = supabase
    .from("programas_ensamble_drive_shortcuts")
    .select("id, id_ensamble, google_drive_shortcut_id")
    .eq("id_programa", programId);
  if (ensambleIds?.length) q = q.in("id_ensamble", ensambleIds);
  const { data: rows } = await q;
  let removed = 0;

  for (const row of rows || []) {
    if (row.google_drive_shortcut_id) {
      try {
        await drive.files.delete({ fileId: row.google_drive_shortcut_id, ...DRIVE_SHARED_OPTS });
      } catch (e) {
        console.error(`[Drive] Error borrando shortcut ensamble prog ${programId}:`, (e as Error).message);
      }
    }
    await supabase.from("programas_ensamble_drive_shortcuts").delete().eq("id", row.id);
    removed++;
  }

  return removed;
}

async function syncEnsambleProgramShortcuts(
  supabase: any,
  drive: any,
  prog: any,
): Promise<{ created: number; updated: number; removed: number }> {
  const stats = { created: 0, updated: 0, removed: 0 };

  if (!isEnsambleProgram(prog.tipo)) {
    const removed = await removeEnsambleProgramShortcuts(supabase, drive, prog.id);
    stats.removed = removed;
    return stats;
  }

  const programFolderId = prog.google_drive_folder_id;
  if (!programFolderId) return stats;

  const shortcutName = getProgramDriveFolderName(prog);
  const currentEnsembleIds = getEnsembleSourceIds(prog);

  const { data: existingRows } = await supabase
    .from("programas_ensamble_drive_shortcuts")
    .select("id, id_ensamble, google_drive_shortcut_id")
    .eq("id_programa", prog.id);

  const existingByEnsamble = new Map(
    (existingRows || []).map((r: { id_ensamble: number; id: number; google_drive_shortcut_id: string | null }) => [
      r.id_ensamble,
      r,
    ]),
  );

  const toRemove = (existingRows || [])
    .filter((r: { id_ensamble: number }) => !currentEnsembleIds.includes(r.id_ensamble))
    .map((r: { id_ensamble: number }) => r.id_ensamble);
  if (toRemove.length) {
    stats.removed += await removeEnsambleProgramShortcuts(supabase, drive, prog.id, toRemove);
  }

  if (currentEnsembleIds.length === 0) return stats;

  const { data: ensamblesRows } = await supabase
    .from("ensambles")
    .select("id, ensamble, google_drive_folder_id")
    .in("id", currentEnsembleIds);

  for (const ens of ensamblesRows || []) {
    const ensembleFolderId = await syncEnsambleRootFolder(supabase, drive, ens);
    if (!ensembleFolderId) continue;

    const prev = existingByEnsamble.get(ens.id) as
      | { id: number; google_drive_shortcut_id: string | null }
      | undefined;
    let shortcutId = prev?.google_drive_shortcut_id ?? null;

    if (shortcutId) {
      try {
        const meta = await drive.files.get({ fileId: shortcutId, fields: "trashed", ...DRIVE_SHARED_OPTS });
        if (meta.data.trashed) shortcutId = null;
      } catch {
        shortcutId = null;
      }
    }

    if (!shortcutId) {
      shortcutId = await findShortcutByTargetInFolder(drive, ensembleFolderId, programFolderId);
    }

    if (shortcutId) {
      try {
        await drive.files.update({
          fileId: shortcutId,
          requestBody: { name: shortcutName },
          ...DRIVE_SHARED_OPTS,
        });
        stats.updated++;
      } catch (e) {
        console.error(`[Drive] Error renombrando shortcut ensamble prog ${prog.id}:`, (e as Error).message);
        shortcutId = null;
      }
    }

    if (!shortcutId) {
      try {
        const created = await drive.files.create({
          requestBody: {
            name: shortcutName,
            mimeType: SHORTCUT_MIME,
            parents: [ensembleFolderId],
            shortcutDetails: { targetId: programFolderId },
          },
          fields: "id",
          ...DRIVE_SHARED_OPTS,
        });
        shortcutId = created.data.id!;
        stats.created++;
      } catch (e) {
        console.error(`[Drive] Error creando shortcut ensamble prog ${prog.id}:`, (e as Error).message);
        continue;
      }
    }

    if (prev) {
      const { error: updateError } = await supabase
        .from("programas_ensamble_drive_shortcuts")
        .update({ google_drive_shortcut_id: shortcutId })
        .eq("id", prev.id);
      if (updateError) {
        console.error(`[DB] Error actualizando shortcut prog ${prog.id} ens ${ens.id}:`, updateError.message);
      }
    } else {
      const { error: upsertError } = await supabase.from("programas_ensamble_drive_shortcuts").upsert(
        {
          id_programa: prog.id,
          id_ensamble: ens.id,
          google_drive_shortcut_id: shortcutId,
        },
        { onConflict: "id_programa,id_ensamble" },
      );
      if (upsertError) {
        console.error(`[DB] Error upsert shortcut prog ${prog.id} ens ${ens.id}:`, upsertError.message);
      }
    }
  }

  return stats;
}

async function runEnsembleDriveBackfill(supabase: any, drive: any) {
  const programs: any[] = [];
  const pageSize = 50;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("programas")
      .select(`
        id, fecha_desde, fecha_hasta, mes_letra, zona, nomenclador, google_drive_folder_id, tipo,
        giras_fuentes(tipo, valor_id)
      `)
      .eq("tipo", "Ensamble")
      .not("google_drive_folder_id", "is", null)
      .order("id")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;
    programs.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const programIds = programs.map((p) => p.id);
  if (programIds.length === 0) {
    return {
      ensemblesSynced: 0,
      programsSynced: 0,
      programsTotal: 0,
      programsFetched: 0,
      shortcutsCreated: 0,
      shortcutsUpdated: 0,
      shortcutsRemoved: 0,
    };
  }

  const ensembleIds = new Set<number>();
  for (const p of programs || []) {
    getEnsembleSourceIds(p).forEach((id) => ensembleIds.add(id));
  }

  let ensemblesSynced = 0;
  if (ensembleIds.size > 0) {
    const { data: ensRows } = await supabase
      .from("ensambles")
      .select("id, ensamble, google_drive_folder_id")
      .in("id", [...ensembleIds]);
    for (const ens of ensRows || []) {
      const fid = await syncEnsambleRootFolder(supabase, drive, ens);
      if (fid) ensemblesSynced++;
    }
  }

  let programsSynced = 0;
  let shortcutsCreated = 0;
  let shortcutsUpdated = 0;
  let shortcutsRemoved = 0;
  let programsSkipped = 0;

  const { data: allExistingShortcuts } = await supabase
    .from("programas_ensamble_drive_shortcuts")
    .select("id_programa, id_ensamble");
  const shortcutsByProgram = new Map<number, Set<number>>();
  for (const row of allExistingShortcuts || []) {
    if (!shortcutsByProgram.has(row.id_programa)) {
      shortcutsByProgram.set(row.id_programa, new Set());
    }
    shortcutsByProgram.get(row.id_programa)!.add(row.id_ensamble);
  }

  for (const prog of programs || []) {
    const neededEnsembles = getEnsembleSourceIds(prog);
    const existing = shortcutsByProgram.get(prog.id) || new Set<number>();
    const needsSync =
      neededEnsembles.length > 0 &&
      (neededEnsembles.some((id) => !existing.has(id)) ||
        neededEnsembles.length !== existing.size);
    if (!needsSync) {
      programsSkipped++;
      continue;
    }

    try {
      const s = await syncEnsambleProgramShortcuts(supabase, drive, prog);
      programsSynced++;
      shortcutsCreated += s.created;
      shortcutsUpdated += s.updated;
      shortcutsRemoved += s.removed;
    } catch (e) {
      console.error(`[BACKFILL] Error programa ${prog.id}:`, (e as Error).message);
    }
  }

  return {
    ensemblesSynced,
    programsSynced,
    programsTotal: programIds.length,
    programsFetched: programs.length,
    programsSkipped,
    shortcutsCreated,
    shortcutsUpdated,
    shortcutsRemoved,
  };
}

// =================================================================================
// SYNC METADATA: carpeta raíz del programa (sin tocar repertorio)
// =================================================================================
async function syncProgramRootFolder(supabase: any, drive: any, prog: any) {
  const fName = getProgramDriveFolderName(prog);

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

function stripHtmlPlain(html: string | undefined | null): string {
  if (!html) return "";
  return String(html).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function sanitizeDriveFolderName(name: string): string {
  return name.trim().slice(0, 200).replace(/[/\\?*:\[\]]/g, "_") || "Selección sin nombre";
}

// =================================================================================
// SYNC SELECCIÓN ARCHIVO: carpeta en Misceláneos + shortcuts numerados
// =================================================================================
async function syncArchivoSelectionShortcuts(
  drive: ReturnType<typeof google.drive>,
  selectionName: string,
  works: Array<{ link_drive?: string; titulo?: string }>,
) {
  const folderName = sanitizeDriveFolderName(selectionName);
  const listRes = await drive.files.list({
    q: `'${ARCHIVO_MISC_FOLDER_ID}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: "files(id, name)",
    ...DRIVE_SHARED_OPTS,
  });
  let selectionFolderId = (listRes.data.files || []).find((f) => f.name === folderName)?.id ?? null;

  if (!selectionFolderId) {
    const created = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: FOLDER_MIME,
        parents: [ARCHIVO_MISC_FOLDER_ID],
      },
      fields: "id, webViewLink",
      ...DRIVE_SHARED_OPTS,
    });
    selectionFolderId = created.data.id ?? null;
  }

  if (!selectionFolderId) {
    throw new Error("No se pudo crear la carpeta de selección en Drive.");
  }

  const driveContent = await drive.files.list({
    q: `'${selectionFolderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType)",
    ...DRIVE_SHARED_OPTS,
  });
  const existingDriveFiles = driveContent.data.files || [];
  const validShortcutIds = new Set<string>();
  let shortcutsCreated = 0;
  let shortcutsUpdated = 0;
  let skippedNoDrive = 0;

  for (const [index, work] of works.entries()) {
    const targetId = extractFileId(work.link_drive || "");
    if (!targetId) {
      skippedNoDrive += 1;
      continue;
    }

    const posNumber = index + 1;
    let originalFolderName = stripHtmlPlain(work.titulo) || "Sin título";
    try {
      const metaObra = await drive.files.get({
        fileId: targetId,
        fields: "name",
        ...DRIVE_SHARED_OPTS,
      });
      originalFolderName = metaObra.data.name || originalFolderName;
    } catch (e) {
      console.error(`[archivo_selection] Acceso denegado a obra ${targetId}:`, (e as Error).message);
    }

    const sName = `${posNumber} - ${originalFolderName}`;
    const prefix = `${posNumber} - `;
    const existingShortcut = existingDriveFiles.find(
      (f) => f.mimeType === SHORTCUT_MIME && (f.name === sName || f.name?.startsWith(prefix)),
    );

    if (existingShortcut?.id) {
      try {
        await drive.files.update({
          fileId: existingShortcut.id,
          requestBody: {
            name: sName,
            shortcutDetails: { targetId },
          },
          ...DRIVE_SHARED_OPTS,
        });
        validShortcutIds.add(existingShortcut.id);
        shortcutsUpdated += 1;
        continue;
      } catch (e) {
        console.error(`[archivo_selection] Error actualizando shortcut ${existingShortcut.id}:`, (e as Error).message);
        try {
          await drive.files.delete({ fileId: existingShortcut.id, ...DRIVE_SHARED_OPTS });
        } catch (_) { /* ignore */ }
      }
    }

    try {
      const created = await drive.files.create({
        requestBody: {
          name: sName,
          mimeType: SHORTCUT_MIME,
          parents: [selectionFolderId],
          shortcutDetails: { targetId },
        },
        fields: "id",
        ...DRIVE_SHARED_OPTS,
      });
      if (created.data.id) {
        validShortcutIds.add(created.data.id);
        shortcutsCreated += 1;
      }
    } catch (e) {
      console.error(`[archivo_selection] Error creando shortcut:`, (e as Error).message);
    }
  }

  for (const file of existingDriveFiles) {
    if (file.mimeType === SHORTCUT_MIME && file.id && !validShortcutIds.has(file.id)) {
      try {
        await drive.files.delete({ fileId: file.id, ...DRIVE_SHARED_OPTS });
      } catch (e) {
        console.error(`[archivo_selection] Error borrando shortcut huérfano:`, (e as Error).message);
      }
    }
  }

  const folderMeta = await drive.files.get({
    fileId: selectionFolderId,
    fields: "webViewLink",
    ...DRIVE_SHARED_OPTS,
  });

  return {
    folderId: selectionFolderId,
    folderUrl: folderMeta.data.webViewLink || `https://drive.google.com/drive/folders/${selectionFolderId}`,
    folderName,
    shortcutsCreated,
    shortcutsUpdated,
    shortcutsTotal: validShortcutIds.size,
    skippedNoDrive,
  };
}

function parseArchivoSelectionOrder(name: string | undefined | null, fallback: number): number {
  const match = String(name || "").match(/^(\d+)\s*-\s*/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

async function listArchivoMiscFolders(drive: ReturnType<typeof google.drive>) {
  const folders: Array<{ id: string; name: string; webViewLink?: string | null; modifiedTime?: string | null }> = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${ARCHIVO_MISC_FOLDER_ID}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
      fields: "nextPageToken, files(id, name, webViewLink, modifiedTime)",
      pageSize: 200,
      orderBy: "name",
      pageToken,
      ...DRIVE_SHARED_OPTS,
    });
    for (const f of res.data.files || []) {
      if (f.id && f.name) {
        folders.push({
          id: f.id,
          name: f.name,
          webViewLink: f.webViewLink,
          modifiedTime: f.modifiedTime,
        });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return folders;
}

async function loadArchivoSelectionFromDriveFolder(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
) {
  const folderMeta = await drive.files.get({
    fileId: folderId,
    fields: "id, name, webViewLink",
    ...DRIVE_SHARED_OPTS,
  });

  const items: Array<{ order: number; targetDriveId: string; shortcutName: string }> = [];
  let skippedNonMatchable = 0;
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, shortcutDetails)",
      pageSize: 200,
      orderBy: "name",
      pageToken,
      ...DRIVE_SHARED_OPTS,
    });

    for (const f of res.data.files || []) {
      if (f.mimeType === SHORTCUT_MIME && f.shortcutDetails?.targetId) {
        items.push({
          order: parseArchivoSelectionOrder(f.name, items.length + 1),
          targetDriveId: f.shortcutDetails.targetId,
          shortcutName: f.name || "",
        });
        continue;
      }
      if (f.mimeType === FOLDER_MIME && f.id) {
        items.push({
          order: parseArchivoSelectionOrder(f.name, items.length + 1),
          targetDriveId: f.id,
          shortcutName: f.name || "",
        });
        continue;
      }
      skippedNonMatchable += 1;
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  items.sort((a, b) => a.order - b.order || a.shortcutName.localeCompare(b.shortcutName, "es"));

  return {
    folderId,
    folderName: folderMeta.data.name || "Selección",
    folderUrl:
      folderMeta.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`,
    items,
    itemsTotal: items.length,
    skippedNonMatchable,
  };
}

// =================================================================================
// SYNC UN PROGRAMA COMPLETO (metadata + repertorio) — compatible con lógica previa
// =================================================================================
async function syncOneProgram(supabase: any, drive: any, prog: any) {
  const folderId = await syncProgramRootFolder(supabase, drive, prog);
  const progWithFolder = { ...prog, google_drive_folder_id: folderId };
  try {
    await syncProgramRepertoireShortcuts(supabase, drive, progWithFolder);
  } catch (e) {
    console.error(`[SYNC] Repertorio programa ${prog.id}:`, (e as Error).message);
  }
  await syncEnsambleProgramShortcuts(supabase, drive, progWithFolder);
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
  const usaBaseViaticos = Boolean(m.id_loc_viaticos && m.id_domicilio_laboral);
  const localidadViaticos = m.viaticos?.localidad
    || (Array.isArray(m.viaticos) ? m.viaticos[0]?.localidad : null)
    || "";
  const domicilioResidencia = (m.domicilio || "").trim();
  const domicilioLaboralDireccion = (m.laboral?.direccion || "").trim();

  safeSet(
    "domicilio",
    usaBaseViaticos && domicilioLaboralDireccion
      ? domicilioLaboralDireccion
      : domicilioResidencia,
  );
  safeSet(
    "ciudad",
    usaBaseViaticos && localidadViaticos
      ? localidadViaticos
      : (m.residencia?.localidad || ""),
  );
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
  const isPdfBytes = (bytes: Uint8Array) =>
    bytes?.length >= 4 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46; // F
  const isJpegBytes = (bytes: Uint8Array) =>
    bytes?.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPngBytes = (bytes: Uint8Array) =>
    bytes?.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isLikelyHtml = (bytes: Uint8Array) => {
    try {
      const sample = new TextDecoder().decode(bytes.slice(0, 200)).toLowerCase();
      return sample.includes("<!doctype html") || sample.includes("<html");
    } catch {
      return false;
    }
  };

  if (layout === "full") {
    for (const url of sources) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (isLikelyHtml(bytes)) {
          console.warn("[assemblePDFInternal] Fuente no descargable (HTML):", url);
          continue;
        }
        if (isPdfBytes(bytes)) {
          const extDoc = await PDFDocument.load(bytes);
          const pages = await pdfDoc.copyPages(extDoc, extDoc.getPageIndices());
          pages.forEach(p => pdfDoc.addPage(p));
          continue;
        }
        if (isJpegBytes(bytes) || isPngBytes(bytes)) {
          const img = isJpegBytes(bytes)
            ? await pdfDoc.embedJpg(bytes)
            : await pdfDoc.embedPng(bytes);
          const page = pdfDoc.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          continue;
        }
        console.warn("[assemblePDFInternal] Tipo de archivo no soportado, se omite:", url);
      } catch (e) {
        console.error("[assemblePDFInternal] Error procesando fuente:", url, e);
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
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (isLikelyHtml(bytes)) {
          console.warn("[assemblePDFInternal/mosaic] Fuente no descargable (HTML):", url);
          continue;
        }
        if (isPdfBytes(bytes)) {
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
        } else if (isJpegBytes(bytes) || isPngBytes(bytes)) {
          const img = isJpegBytes(bytes)
            ? await pdfDoc.embedJpg(bytes)
            : await pdfDoc.embedPng(bytes);
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
        } else {
          console.warn("[assemblePDFInternal/mosaic] Tipo no soportado, se omite:", url);
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
      // Solo procesar INSERT o UPDATE, ignorarL DELETE
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
      layout,
      sources,
      fileName,
      programId,
      folderUrl,
      folderName,
      parentId,
      fileBase64,
      mimeType,
      sourceUrl,
      targetParentId,
      newName,
      nombreSet,
      obraTitulo,
      targetDriveId,
      fileId,
      targetEmail,
      role,
      giraId,
      id_obra,
      link_origen,
      id_carpeta_destino,
      titulo: tituloObra,
      nombre_carpeta,
      // Nuevos parámetros para operaciones de copia simples (server-side bypass)
      destinationFolderId,
      fileId: directFileId,
      selectionName,
      works: selectionWorks,
      repertoireBlockId,
      selectionFolderId,
    } = body;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authClient = getAuthClient();
    const tokenResponse = await authClient.getAccessToken();
    const token = tokenResponse.token;
    const drive = google.drive({ version: "v3", auth: authClient });

    // --- ACCIÓN: ENTREGAR OBRA AL ARCHIVO (copia a «Para acomodar» + Entregado + mail) ---
    if (action === "entregar_obra_archivo") {
      if (!id_obra || !link_origen) throw new Error("Faltan id_obra o link_origen");
      const sourceId = extractFileId(link_origen);
      if (!sourceId) throw new Error("Link de Drive inválido");

      const { data: obra, error: obraError } = await supabase
        .from("obras")
        .select(`
          id,
          titulo,
          link_drive,
          obras_compositores (rol, compositores (apellido, nombre))
        `)
        .eq("id", id_obra)
        .single();
      if (obraError || !obra) throw new Error("Obra no encontrada");

      const tituloParaMail =
        (tituloObra as string) ||
        getTituloPrimeraLinea(obra.titulo || "") ||
        "Sin título";
      const nombreFromBody = (body.nombre_carpeta as string | undefined)?.trim();
      const nombreCanonico = buildParaAcomodarFolderNameFromRelations(
        obra.titulo || "",
        (obra.obras_compositores as { rol: string; compositores?: { apellido?: string; nombre?: string } | null }[]) || [],
      );
      const nombreCarpeta = nombreFromBody || nombreCanonico || tituloParaMail;

      const driveOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true };

      try {
        let nuevoEnlace: string;
        let copied = false;

        const alreadyInParaAcomodar = await isDriveItemUnderFolder(
          drive,
          sourceId,
          PARA_ACOMODAR_FOLDER_ID,
          driveOpts,
        );

        if (alreadyInParaAcomodar) {
          const meta = await drive.files.get({
            fileId: sourceId,
            fields: "webViewLink",
            ...driveOpts,
          });
          nuevoEnlace =
            meta.data.webViewLink ||
            `https://drive.google.com/drive/folders/${sourceId}`;
        } else {
          const copyResult = await copyLinkIntoDriveFolder(
            drive,
            link_origen,
            sourceId,
            PARA_ACOMODAR_FOLDER_ID,
            nombreCarpeta,
            driveOpts,
          );
          nuevoEnlace = copyResult.link_drive;
          copied = true;
        }

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
          JSON.stringify({
            success: true,
            link_drive: nuevoEnlace,
            copied_to_para_acomodar: copied,
            folder_name: nombreCarpeta,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (e: any) {
        if (e?.drivePayload?.code === "DRIVE_ACCESS_DENIED") {
          return new Response(JSON.stringify(e.drivePayload), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        console.error("[entregar_obra_archivo]:", e?.message);
        throw new Error(e?.message || "Error al copiar o actualizar");
      }
    }

    // --- ACCIÓN: SOLICITAR ACCESO DEL ARCHIVO A UN LINK DE ORIGEN ---
    if (action === "solicitar_acceso_drive_origen") {
      if (!link_origen) throw new Error("Falta link_origen");
      const sourceId = extractFileId(link_origen);
      if (!sourceId) throw new Error("Link de Drive inválido");
      const driveOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true };
      const perm = await requestDriveAccessForServiceAccount(drive, sourceId, driveOpts);
      if (!perm.ok) {
        const payload = driveAccessDeniedPayload({
          permissionRequested: false,
          sourceFileId: sourceId,
          linkOrigen: link_origen,
          requestDetail: perm.detail,
        });
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          permission_requested: true,
          service_account_email: DRIVE_SERVICE_EMAIL,
          message: `Solicitud enviada a ${DRIVE_SERVICE_EMAIL}. Aceptala en Drive y reintenta la copia.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- ACCIÓN: COPIAR LINK (archivo o carpeta) DENTRO DE UNA CARPETA DESTINO CON NOMBRE NUEVO ---
    if (action === "copiar_link_a_carpeta") {
      if (!link_origen || !nombre_carpeta) {
        throw new Error("Faltan link_origen o nombre_carpeta");
      }
      const sourceId = extractFileId(link_origen);
      if (!sourceId) throw new Error("Link de Drive inválido");

      const parentFolderId =
        (id_carpeta_destino as string) ||
        (body.parentId as string) ||
        PARA_ACOMODAR_FOLDER_ID;
      const driveOpts = { supportsAllDrives: true, includeItemsFromAllDrives: true };
      const nombreCarpeta = String(nombre_carpeta).slice(0, 200).replace(/[/\\?*:\[\]]/g, "_");

      let sourceMime = "";
      let sourceName = "archivo";
      try {
        const sourceMeta = await drive.files.get({
          fileId: sourceId,
          fields: "mimeType, name",
          ...driveOpts,
        });
        sourceMime = sourceMeta.data?.mimeType || "";
        sourceName = (sourceMeta.data?.name || "archivo").slice(0, 255);
      } catch (e) {
        if (isDriveAccessDeniedError(e)) {
          const perm = await requestDriveAccessForServiceAccount(drive, sourceId, driveOpts);
          const payload = driveAccessDeniedPayload({
            permissionRequested: perm.ok,
            sourceFileId: sourceId,
            linkOrigen: link_origen,
            requestDetail: perm.ok ? undefined : perm.detail,
          });
          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        throw e;
      }

      try {
        const nuevaCarpeta = await drive.files.create({
          requestBody: {
            name: nombreCarpeta,
            mimeType: FOLDER_MIME,
            parents: [parentFolderId],
          },
          fields: "id, webViewLink",
          ...driveOpts,
        });
        const destFolderId = nuevaCarpeta.data.id!;

        if (sourceMime === FOLDER_MIME) {
          await copyFolderContentsRecursive(drive, sourceId, destFolderId, driveOpts);
        } else {
          await drive.files.copy({
            fileId: sourceId,
            requestBody: { name: sourceName, parents: [destFolderId] },
            fields: "id",
            ...driveOpts,
          });
        }

        const meta = await drive.files.get({
          fileId: destFolderId,
          fields: "webViewLink",
          ...driveOpts,
        });
        const linkDrive =
          meta.data.webViewLink || `https://drive.google.com/drive/folders/${destFolderId}`;

        return new Response(
          JSON.stringify({ success: true, link_drive: linkDrive, folder_name: nombreCarpeta }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (e) {
        if (isDriveAccessDeniedError(e)) {
          const perm = await requestDriveAccessForServiceAccount(drive, sourceId, driveOpts);
          const payload = driveAccessDeniedPayload({
            permissionRequested: perm.ok,
            sourceFileId: sourceId,
            linkOrigen: link_origen,
            requestDetail: perm.ok ? undefined : perm.detail,
          });
          return new Response(JSON.stringify(payload), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        throw e;
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
      let { data: m, error: mError } = await supabase.from("integrantes").select(`*, residencia:localidades!id_localidad(localidad), viaticos:localidades!id_loc_viaticos(localidad), laboral:locaciones!id_domicilio_laboral(nombre, direccion, id_localidad, localidades:localidades!id_localidad(localidad))`).eq("id", musicianId).single();
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

      throwIfStorageUploadError(
        await supabase.storage.from("musician-docs").upload(djPath, djBytes, { contentType: 'application/pdf', upsert: true }),
        `upload DJ (${djPath})`,
      );
      const { data: { publicUrl: djUrl } } = supabase.storage.from("musician-docs").getPublicUrl(djPath);

      const packSources = [m.link_dni_img, m.link_cuil, m.link_cbu_img, djUrl].filter(u => !!u);
      const [fullBytes, mosaicBytes] = await Promise.all([
        assemblePDFInternal(packSources, "full"),
        assemblePDFInternal(packSources, "mosaic")
      ]);

      const fullPath = `docs/full_${cleanSurname}_${Date.now()}.pdf`;
      const mosPath = `docs/mos_${cleanSurname}_${Date.now()}.pdf`;

      const [upFull, upMos] = await Promise.all([
        supabase.storage.from("musician-docs").upload(fullPath, fullBytes, { contentType: 'application/pdf', upsert: true }),
        supabase.storage.from("musician-docs").upload(mosPath, mosaicBytes, { contentType: 'application/pdf', upsert: true })
      ]);
      throwIfStorageUploadError(upFull, `upload expediente full (${fullPath})`);
      throwIfStorageUploadError(upMos, `upload expediente mosaic (${mosPath})`);

      const { data: { publicUrl: fullUrl } } = supabase.storage.from("musician-docs").getPublicUrl(fullPath);
      const { data: { publicUrl: mosUrl } } = supabase.storage.from("musician-docs").getPublicUrl(mosPath);

      await supabase.from("integrantes").update({ link_declaracion: djUrl, documentacion: fullUrl, docred: mosUrl, last_modified_at: new Date().toISOString() }).eq("id", m.id);

      return new Response(JSON.stringify({ success: true, urls: { dj: djUrl, full: fullUrl, mosaic: mosUrl } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // --- ACCIÓN: OBTENER TOKEN TEMPORAL DE GOOGLE (para descarga directa desde el cliente) ---
    if (action === "get_temp_token") {
      const tokenResponse = await authClient.getAccessToken();
      const accessToken = tokenResponse?.token;
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "No se pudo obtener Access Token de Google" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          accessToken,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
    // --- ACCIÓN: OBTENER SOLO METADATOS (nombre) DE UN ARCHIVO DE DRIVE ---
    if (action === "get_file_name") {
      const fileId = extractFileId(sourceUrl);
      if (!fileId) throw new Error("ID de archivo inválido");

      console.log("[get_file_name] sourceUrl:", sourceUrl, "fileId:", fileId);

      const meta = await drive.files.get(
        {
          fileId,
          fields: "name",
          supportsAllDrives: true,
        },
      );

      console.log("[get_file_name] drive.files.get ->", meta.data?.name);

      return new Response(
        JSON.stringify({
          success: true,
          name: meta.data?.name ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      let { data: m, error: mError } = await supabase.from("integrantes").select(`*, residencia:localidades!id_localidad(localidad), viaticos:localidades!id_loc_viaticos(localidad), laboral:locaciones!id_domicilio_laboral(nombre, direccion, id_localidad, localidades:localidades!id_localidad(localidad))`).eq("id", musicianId).single();
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
      throwIfStorageUploadError(
        await supabase.storage.from("musician-docs").upload(djFileName, djBytes, { contentType: 'application/pdf', upsert: true }),
        `upload DJ (${djFileName})`,
      );
      const { data: { publicUrl } } = supabase.storage.from("musician-docs").getPublicUrl(djFileName);
      await supabase.from("integrantes").update({ link_declaracion: publicUrl }).eq("id", m.id);
      return new Response(JSON.stringify({ success: true, url: publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACCIÓN: ENSAMBLAR INDIVIDUAL (BUCKET) ---
    if (action === "assemble_docs_bucket") {
      const pdfBytes = await assemblePDFInternal(sources, layout);
      const finalPath = `results/${sanitizePath(fileName)}_${Date.now()}.pdf`;
      throwIfStorageUploadError(
        await supabase.storage.from("musician-docs").upload(finalPath, pdfBytes, { contentType: 'application/pdf', upsert: true }),
        `upload assemble_docs (${finalPath})`,
      );
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
                throwIfStorageUploadError(
                  await supabase.storage.from("musician-docs").upload(filePath, bytes, { contentType: meta.data.mimeType, upsert: true }),
                  `migración Drive→bucket (${filePath})`,
                );
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

    // --- ACCIÓN: SUBIR SET DE PARTICELLAS A CARPETA FIJA ---
    if (action === "upload_particella_set") {
      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const form = new FormData();
      form.append(
        "metadata",
        new Blob(
          [
            JSON.stringify({
              name: fileName,
              parents: [PARTICELLA_SETS_ROOT_ID],
            }),
          ],
          { type: "application/json" },
        ),
      );
      form.append("file", new Blob([bytes], { type: mimeType || "application/pdf" }));

      const upRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      const upData = await upRes.json();
      if (upData.error) {
        throw new Error(upData.error.message || "Error subiendo set de particellas");
      }

      return new Response(
        JSON.stringify({
          success: true,
          fileId: upData.id,
          webViewLink: upData.webViewLink,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- ACCIÓN: LISTAR ARCHIVOS DE UNA CARPETA (SOLO NIVEL SUPERIOR) ---
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

        console.log(
          `DEBUG [Edge]: Google API respondió. Archivos encontrados (nivel 1): ${
            res.data.files?.length || 0
          }`,
        );

        return new Response(
          JSON.stringify({ success: true, files: res.data.files || [] }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error(
          "DEBUG [Edge]: Error al llamar a Google Drive API (list_folder_files):",
          (error as Error).message,
        );
        throw error;
      }
    }

    // --- ACCIÓN: LISTAR ARCHIVOS DE UNA CARPETA Y TODAS SUS SUBCARPETAS ---
    if (action === "list_folder_files_subfolders") {
      console.log("DEBUG [Edge]: Iniciando list_folder_files_subfolders.");
      console.log("DEBUG [Edge]: URL recibida:", folderUrl);

      const rootFolderId = extractFileId(folderUrl);
      console.log(
        "DEBUG [Edge]: ID de carpeta raíz extraído:",
        rootFolderId,
      );

      if (!rootFolderId) {
        console.error(
          "DEBUG [Edge]: No se pudo extraer el ID de la URL provista para list_folder_files_subfolders.",
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: "ID de carpeta inválido en list_folder_files_subfolders",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      const allFiles: any[] = [];
      const queue: string[] = [rootFolderId];

      try {
        while (queue.length > 0) {
          const currentFolderId = queue.shift()!;
          console.log(
            "DEBUG [Edge]: Listando contenido de carpeta:",
            currentFolderId,
          );

          let pageToken: string | undefined;
          do {
            const res = await drive.files.list({
              q: `'${currentFolderId}' in parents and trashed = false`,
              fields:
                "nextPageToken, files(id, name, webViewLink, mimeType)",
              pageSize: 100,
              orderBy: "name",
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
              pageToken,
            });

            const files = res.data.files || [];
            console.log(
              `DEBUG [Edge]: Carpeta ${currentFolderId} -> elementos encontrados: ${files.length}`,
            );

            for (const f of files) {
              if (f.mimeType === "application/vnd.google-apps.folder") {
                // Es subcarpeta: la encolamos para seguir profundizando
                if (f.id) queue.push(f.id);
              } else {
                // Es archivo "real": lo añadimos a la colección
                allFiles.push(f);
              }
            }

            pageToken = res.data.nextPageToken || undefined;
          } while (pageToken);
        }

        console.log(
          `DEBUG [Edge]: list_folder_files_subfolders completado. Archivos totales: ${allFiles.length}`,
        );

        return new Response(
          JSON.stringify({ success: true, files: allFiles }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error(
          "DEBUG [Edge]: Error en list_folder_files_subfolders:",
          (error as Error).message,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: (error as Error).message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
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
        .select("id, fecha_desde, fecha_hasta, mes_letra, zona, nomenclador, google_drive_folder_id, tipo, giras_fuentes(*)")
        .eq("id", finalProgramId)
        .single();

      if (fullError || !progFull) {
        console.error("[SYNC_METADATA] Error cargando programa completo:", fullError);
        throw new Error("No se pudo cargar el programa para Drive.");
      }

      const folderId = await syncProgramRootFolder(supabase, drive, progFull);
      const progWithFolder = { ...progFull, google_drive_folder_id: folderId };
      const ensembleStats = await syncEnsambleProgramShortcuts(supabase, drive, progWithFolder);

      return new Response(
        JSON.stringify({
          success: true,
          programId: finalProgramId,
          folderId,
          nomencladorUpdated: nomencladorUpdated ?? 0,
          ensembleShortcuts: ensembleStats,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACCIÓN: LISTAR CARPETAS DE MISCeláneos (selecciones del archivo) ---
    if (action === "list_archivo_misc_folders") {
      const folders = await listArchivoMiscFolders(drive);
      return new Response(
        JSON.stringify({ success: true, folders }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- ACCIÓN: CARGAR SELECCIÓN DESDE CARPETA DE MISCeláneos ---
    if (action === "load_archivo_selection_from_drive") {
      const folderId = selectionFolderId || body.folderId;
      if (!folderId || !String(folderId).trim()) {
        throw new Error("ID de carpeta requerido.");
      }
      const result = await loadArchivoSelectionFromDriveFolder(drive, String(folderId).trim());
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- ACCIÓN: SYNC SELECCIÓN ARCHIVO (Misceláneos + shortcuts numerados) ---
    if (action === "sync_archivo_selection_shortcuts") {
      if (!selectionName || !String(selectionName).trim()) {
        throw new Error("Nombre de selección requerido.");
      }
      if (!Array.isArray(selectionWorks) || selectionWorks.length === 0) {
        throw new Error("No hay obras en la selección.");
      }

      const result = await syncArchivoSelectionShortcuts(
        drive,
        String(selectionName).trim(),
        selectionWorks,
      );

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- ACCIÓN: ELIMINAR BLOQUE DE REPERTORIO (+ carpeta Drive) ---
    if (action === "delete_repertoire_block") {
      const blockId = repertoireBlockId || body.id_repertorio || body.blockId;
      if (!blockId) {
        throw new Error("ID de bloque de repertorio requerido.");
      }

      const { data: block, error: blockError } = await supabase
        .from("programas_repertorios")
        .select("id, id_programa, google_drive_folder_id, nombre")
        .eq("id", blockId)
        .single();

      if (blockError || !block) {
        throw new Error("No se encontró el bloque de repertorio.");
      }

      if (block.google_drive_folder_id) {
        try {
          await drive.files.delete({
            fileId: block.google_drive_folder_id,
            ...DRIVE_SHARED_OPTS,
          });
        } catch (e) {
          console.error(
            `[delete_repertoire_block] Error borrando carpeta ${block.google_drive_folder_id}:`,
            (e as Error).message,
          );
          throw new Error(
            `No se pudo borrar la carpeta en Drive: ${(e as Error).message}`,
          );
        }
      }

      const { error: obrasError } = await supabase
        .from("repertorio_obras")
        .delete()
        .eq("id_repertorio", blockId);
      if (obrasError) throw obrasError;

      const { error: blockDeleteError } = await supabase
        .from("programas_repertorios")
        .delete()
        .eq("id", blockId);
      if (blockDeleteError) throw blockDeleteError;

      return new Response(
        JSON.stringify({
          success: true,
          programId: block.id_programa,
          deletedFolderId: block.google_drive_folder_id || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // --- ACCIÓN: BACKFILL carpetas ensambles + accesos directos ---
    if (action === "sync_ensemble_drive_backfill") {
      console.log("[BACKFILL] Iniciando sync_ensemble_drive_backfill");
      const result = await runEnsembleDriveBackfill(supabase, drive);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- ACCIÓN: SYNC / DELETE PROGRAM ---
    if (action === "sync_program" || action === "delete_program") {
      const targetProgramId = programId || body.id || body.id_gira;
      console.log(`[SYNC] Acción: ${action}, ID: ${targetProgramId ?? "TODOS (vigentes)"}`);

      // delete_program siempre requiere ID
      if (action === "delete_program") {
        if (!targetProgramId) throw new Error("ID de programa no proporcionado para eliminar.");
        await removeEnsambleProgramShortcuts(supabase, drive, targetProgramId);
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
    // --- ACCIÓN: COPIAR UN ARCHIVO ÚNICO (Server-Side, sin mover bytes) ---
    if (action === "copy_file") {
      /**
       * Soporta dos variantes de payload:
       * - Legacy: { sourceUrl, targetParentId, newName }
       * - Nueva:  { fileId, destinationFolderId, newName }
       *
       * En ambos casos se usa drive.files.copy, que ejecuta la copia íntegramente
       * en servidores de Google (costo de egress prácticamente nulo).
       */
      const legacySourceId = sourceUrl ? extractFileId(sourceUrl) : null;
      const effectiveFileId = (directFileId as string) || fileId || legacySourceId;
      const effectiveParentId = (destinationFolderId as string) || targetParentId;

      if (!effectiveFileId || !effectiveParentId) {
        throw new Error("Faltan parámetros para copy_file (fileId / destinationFolderId).");
      }

      const copyRes = await drive.files.copy({
        fileId: effectiveFileId,
        requestBody: {
          name: newName,
          parents: [effectiveParentId],
        },
        fields: "id, webViewLink, name",
        supportsAllDrives: true,
      });

      return new Response(
        JSON.stringify({ success: true, file: copyRes.data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
          const safeNameForQuery = (finalName || "").replace(/'/g, "\\'");
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
            name: finalName || undefined,
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

