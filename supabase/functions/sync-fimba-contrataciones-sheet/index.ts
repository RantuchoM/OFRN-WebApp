/**
 * Backup de fimba_contrataciones → Google Sheet(s) (tab "Contrataciones").
 * Full replace de datos (preserva/reescribe header). Manual + cron diario.
 * Escribe el mismo payload a N spreadsheets (lista de IDs).
 * Auth Google: G_CLIENT_ID / G_CLIENT_SECRET / G_REFRESH_TOKEN (cuenta Archivo).
 * Columna Carpeta: Drive smart chips (chipRuns / richLinkProperties); fallback URL.
 * Layout B–K (col A intacta): Nº exp. | Carpeta | Nombre | Monto | Tipo | 4 flags | Estado.
 * Monto (E): número + CURRENCY ARS. Flags (G–J): TRUE/FALSE nativos;
 * checkbox UI vía setDataValidation best-effort (omitido si columnas tipadas).
 */
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { google } from "npm:googleapis@126.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-fimba-contrataciones-sheet-cron-secret",
};

const CRON_SECRET =
  Deno.env.get("FIMBA_CONTRATACIONES_SHEET_CRON_SECRET") ||
  Deno.env.get("CONCIERTOS_SHEET_CRON_SECRET") ||
  "";

const SYNC_LOCK_MS = 90_000;

/** Primary sheet FIMBA 2026 (enlace compartido canónico en UI). */
const PRIMARY_SHEET_ID = "1rAd7j4phD6hx3jHujTUHM5KiBZNmfotz11tE3NHFox8";
/** Mirror / segundo backup (Contrataciones FIMBA 2026). */
const SECONDARY_SHEET_ID = "1qz7_kj7hO57A5DY8rw5S12bZvd8wilO2hWJeli-SivQ";

const DEFAULT_SHEET_IDS = [PRIMARY_SHEET_ID, SECONDARY_SHEET_ID];

/** Known tab gids for stable edit URLs (optional). */
const SHEET_GID_BY_ID: Record<string, string> = {
  [PRIMARY_SHEET_ID]: "475656054",
  [SECONDARY_SHEET_ID]: "1998379859",
};

const SHEET_TAB =
  Deno.env.get("FIMBA_CONTRATACIONES_SHEET_TAB") || "Contrataciones";

/**
 * Target spreadsheet IDs (order preserved; first = primary for sync-state URL).
 * Prefer `FIMBA_CONTRATACIONES_SHEET_IDS` (comma-separated or JSON array).
 * Else single `FIMBA_CONTRATACIONES_SHEET_ID`, else both defaults.
 */
function resolveSheetIds(): string[] {
  const multi = Deno.env.get("FIMBA_CONTRATACIONES_SHEET_IDS")?.trim();
  if (multi) {
    let parsed: string[] = [];
    if (multi.startsWith("[")) {
      try {
        const json = JSON.parse(multi);
        if (Array.isArray(json)) {
          parsed = json.map((x) => String(x || "").trim()).filter(Boolean);
        }
      } catch {
        parsed = [];
      }
    }
    if (parsed.length === 0) {
      parsed = multi
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (parsed.length > 0) {
      return [...new Set(parsed)];
    }
  }
  const single = Deno.env.get("FIMBA_CONTRATACIONES_SHEET_ID")?.trim();
  if (single) return [single];
  return [...DEFAULT_SHEET_IDS];
}

const lockedSheetUrl = (id: string) => {
  const gid = SHEET_GID_BY_ID[id];
  return gid
    ? `https://docs.google.com/spreadsheets/d/${id}/edit#gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${id}/edit`;
};
/**
 * Columnas del tab "Contrataciones" (GSheet legacy + campos webapp).
 * Configurable vía env FIMBA_CONTRATACIONES_SHEET_HEADERS (JSON array) si hace falta.
 */
const DEFAULT_HEADERS = [
  "Número de expediente",
  "Carpeta",
  "Nombre",
  "Monto",
  "Tipo de contratación",
  "Envio a la firma de MFM nota",
  "Nota firmada",
  "Falta recibir documentacion",
  "Enviado a ADM",
  "Ultimo Estado Conocido",
];

function resolveHeaders(): string[] {
  const raw = Deno.env.get("FIMBA_CONTRATACIONES_SHEET_HEADERS");
  if (!raw) return DEFAULT_HEADERS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((h) => typeof h === "string")) {
      return parsed as string[];
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_HEADERS;
}

type SyncState = {
  id: number;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  sheet_tab: string | null;
  id_edicion: number | null;
  pending: boolean;
  syncing_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  last_row_count: number | null;
};

/**
 * Monto as plain number for Sheets. Display = CURRENCY format, not a string.
 * Empty / invalid → "" so the cell stays blank (not 0).
 */
function parseMonto(value: unknown): number | "" {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return n;
}

/**
 * Mapped data block starts at sheet column B (0-based index 1).
 * Field indices below are 0-based within the block; sheetCol() adds the offset.
 * Column A is left untouched.
 */
const DATA_START_COL = 1; // B

/** 0-based index of Monto in DEFAULT_HEADERS → sheet col E. */
const MONTO_COL = 3;

/** ARS-style currency pattern; separators follow spreadsheet locale (es-AR → 1.234,56). */
const MONTO_CURRENCY_PATTERN = '"$"#,##0.00';

/** Sheets-native boolean (cell shows TRUE/FALSE; checkbox-friendly). */
function formatBool(v: unknown): boolean {
  return (
    v === true ||
    v === "true" ||
    v === 1 ||
    v === "1" ||
    v === "TRUE" ||
    v === "Sí" ||
    v === "sí" ||
    v === "SI" ||
    v === "si"
  );
}

/** 0-based indices of flag columns in DEFAULT_HEADERS → sheet cols G–J. */
const BOOL_COL_START = 5; // Envio a la firma de MFM nota
const BOOL_COL_END = 9; // exclusive — Enviado a ADM is 8

/** 0-based sheet column for a field index in the mapped block. */
function sheetCol(fieldIndex: number): number {
  return DATA_START_COL + fieldIndex;
}

/** A1-style column letter from 0-based sheet column index. */
function colLetter(sheetIndex: number): string {
  let s = "";
  let x = sheetIndex;
  do {
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26) - 1;
  } while (x >= 0);
  return s;
}

function driveFolderUrl(raw: string | null | undefined): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) {
    return `https://drive.google.com/drive/folders/${s}`;
  }
  return s;
}

/** Drive file/folder URIs that Sheets can write as smart chips (richLink). */
function isDriveChipUri(uri: string): boolean {
  const s = String(uri || "").trim();
  if (!s || s.length > 2000) return false;
  try {
    const u = new URL(s);
    if (!/^https?:$/i.test(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    return host === "drive.google.com" || host === "docs.google.com";
  } catch {
    return false;
  }
}

function carpetaColumnIndex(headers: string[]): number {
  const i = headers.findIndex(
    (h) => String(h || "").trim().toLowerCase() === "carpeta",
  );
  return i >= 0 ? i : 1; // default: 2.ª field del mapping → sheet col C
}

/** Chip cell: placeholder `@` + richLink to Drive folder/file. */
function driveChipCell(uri: string) {
  return {
    userEnteredValue: { stringValue: "@" },
    chipRuns: [
      {
        chip: {
          richLinkProperties: { uri },
        },
      },
    ],
  };
}

async function resolveEdicionId(
  supabase: ReturnType<typeof createClient>,
  requested: number | null,
  stateEdicion: number | null,
): Promise<number> {
  if (requested != null && Number.isFinite(requested) && requested > 0) {
    return requested;
  }
  if (stateEdicion != null && Number.isFinite(stateEdicion) && stateEdicion > 0) {
    return stateEdicion;
  }
  const { data, error } = await supabase
    .from("fimba_ediciones")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Resolver edición: ${error.message}`);
  if (!data?.id) throw new Error("No hay ediciones FIMBA para sincronizar");
  return Number(data.id);
}

type SheetCell = string | boolean | number;

/** Field index of Nombre in the mapped row (= sheet col D). */
const NOMBRE_FIELD_INDEX = 2;
/** Field index of Carpeta in the mapped row (= sheet col C). */
const CARPETA_FIELD_INDEX = 1;
/** Field index of Nº expediente in the mapped row (= sheet col B). */
const EXPEDIENTE_FIELD_INDEX = 0;

/**
 * Export order: col D (Nombre) ascending.
 * Locale-aware, case-insensitive, numeric; empty Nombre last.
 * Tie-break by Carpeta then nº expediente.
 */
function compareRowsByNombreAsc(a: SheetCell[], b: SheetCell[]): number {
  const na = String(a[NOMBRE_FIELD_INDEX] ?? "").trim();
  const nb = String(b[NOMBRE_FIELD_INDEX] ?? "").trim();
  const aEmpty = !na;
  const bEmpty = !nb;
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
  if (!aEmpty) {
    const byNombre = na.localeCompare(nb, "es", {
      sensitivity: "base",
      numeric: true,
    });
    if (byNombre !== 0) return byNombre;
  }
  const byCarpeta = String(a[CARPETA_FIELD_INDEX] ?? "")
    .trim()
    .localeCompare(String(b[CARPETA_FIELD_INDEX] ?? "").trim(), "es", {
      sensitivity: "base",
      numeric: true,
    });
  if (byCarpeta !== 0) return byCarpeta;
  return String(a[EXPEDIENTE_FIELD_INDEX] ?? "").localeCompare(
    String(b[EXPEDIENTE_FIELD_INDEX] ?? ""),
    "es",
    {
      sensitivity: "base",
      numeric: true,
    },
  );
}

async function fetchContratacionesRows(
  supabase: ReturnType<typeof createClient>,
  edicionId: number,
): Promise<SheetCell[][]> {
  const { data, error } = await supabase
    .from("fimba_contrataciones")
    .select(
      `
      id,
      orden,
      numero_expediente,
      nombre,
      monto,
      tipo_contratacion,
      envio_firma_mfm_nota,
      nota_firmada,
      falta_documentacion,
      enviado_adm,
      ultimo_estado_conocido,
      carpeta_documentacion,
      fimba_propuestas:id_propuesta ( nombre )
    `,
    )
    .eq("id_edicion", edicionId)
    .order("orden", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw new Error(`Query contrataciones: ${error.message}`);

  const rows = (data || []).map((row: Record<string, unknown>) => {
    const prop = row.fimba_propuestas as { nombre?: string } | null;
    const nombre =
      String(row.nombre || "").trim() ||
      String(prop?.nombre || "").trim() ||
      "";
    return [
      String(row.numero_expediente || "").trim(),
      driveFolderUrl(row.carpeta_documentacion as string | null),
      nombre,
      parseMonto(row.monto),
      String(row.tipo_contratacion || "").trim(),
      formatBool(row.envio_firma_mfm_nota),
      formatBool(row.nota_firmada),
      formatBool(row.falta_documentacion),
      formatBool(row.enviado_adm),
      String(row.ultimo_estado_conocido || "").trim(),
    ] as SheetCell[];
  });

  rows.sort(compareRowsByNombreAsc);
  return rows;
}

async function getOAuthClient() {
  const clientId = Deno.env.get("G_CLIENT_ID");
  const clientSecret = Deno.env.get("G_CLIENT_SECRET");
  const refreshToken = Deno.env.get("G_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan credenciales Google (G_CLIENT_ID / G_CLIENT_SECRET / G_REFRESH_TOKEN). Configurar secrets de la Edge Function.",
    );
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

async function ensureSpreadsheet(
  drive: ReturnType<typeof google.drive>,
  spreadsheetId: string,
) {
  const meta = await drive.files.get({
    fileId: spreadsheetId,
    fields: "id, webViewLink, trashed, name",
    supportsAllDrives: true,
  });
  if (!meta.data.id || meta.data.trashed) {
    throw new Error(
      `El Sheet fijado (${spreadsheetId}) no está accesible o está en la papelera.`,
    );
  }
  return {
    spreadsheetId: meta.data.id,
    spreadsheetUrl: lockedSheetUrl(meta.data.id),
  };
}

async function applyCarpetaDriveChips(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetId: number,
  carpetaFieldIndex: number,
  rows: SheetCell[][],
) {
  const carpetaSheetCol = sheetCol(carpetaFieldIndex);
  const chipRows: { rowIndex: number; uri: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const uri = String(rows[i]?.[carpetaFieldIndex] || "").trim();
    if (isDriveChipUri(uri)) {
      chipRows.push({ rowIndex: i + 1, uri }); // +1 = debajo del header
    }
  }
  if (chipRows.length === 0) return { chipsWritten: 0, chipsFailed: false };

  // Contiguous blocks → fewer updateCells requests
  type Block = { startRow: number; uris: string[] };
  const blocks: Block[] = [];
  for (const item of chipRows) {
    const last = blocks[blocks.length - 1];
    if (last && last.startRow + last.uris.length === item.rowIndex) {
      last.uris.push(item.uri);
    } else {
      blocks.push({ startRow: item.rowIndex, uris: [item.uri] });
    }
  }

  const CHIP_BATCH = 80;
  const requests = blocks.map((block) => ({
    updateCells: {
      rows: block.uris.map((uri) => ({ values: [driveChipCell(uri)] })),
      fields: "userEnteredValue,chipRuns",
      range: {
        sheetId,
        startRowIndex: block.startRow,
        endRowIndex: block.startRow + block.uris.length,
        startColumnIndex: carpetaSheetCol,
        endColumnIndex: carpetaSheetCol + 1,
      },
    },
  }));

  try {
    for (let i = 0; i < requests.length; i += CHIP_BATCH) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: requests.slice(i, i + CHIP_BATCH) },
      });
    }
    return { chipsWritten: chipRows.length, chipsFailed: false };
  } catch (e) {
    console.error(
      "[sync-fimba-contrataciones-sheet] chipRuns falló; se dejan URLs/hipervínculos",
      e,
    );
    return { chipsWritten: 0, chipsFailed: true };
  }
}

async function rewriteSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  headers: string[],
  rows: SheetCell[][],
): Promise<{
  chipsWritten: number;
  chipsFailed: boolean;
  checkboxValidationApplied: boolean;
}> {
  const ss = await sheets.spreadsheets.get({ spreadsheetId });
  let sheetId =
    ss.data.sheets?.find((s) => s.properties?.title === SHEET_TAB)?.properties
      ?.sheetId ?? null;

  if (sheetId == null) {
    const add = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_TAB } } }],
      },
    });
    sheetId = add.data.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  }

  const carpetaCol = carpetaColumnIndex(headers);
  // Celdas con URL Drive: vacías en values.update; luego chipRuns (smart chip).
  // Si chips fallan, reescribimos esas celdas con la URL (hipervínculo).
  const chipEligible = rows.map((row) =>
    isDriveChipUri(String(row[carpetaCol] || "").trim()),
  );
  const valuesForGrid = rows.map((row, i) => {
    if (!chipEligible[i]) return row;
    const copy = [...row];
    copy[carpetaCol] = "";
    return copy;
  });

  const dataStartLetter = colLetter(DATA_START_COL);
  const clearEndRow = Math.max(rows.length + 5, 200);
  // Full replace of mapped block starting at B (column A left untouched).
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_TAB}!${dataStartLetter}1:Z${clearEndRow}`,
  });

  // USER_ENTERED: JSON booleans → celdas TRUE/FALSE nativas (checkbox-friendly).
  const values = [headers, ...valuesForGrid];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TAB}!${dataStartLetter}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  let chipResult = { chipsWritten: 0, chipsFailed: false };
  if (chipEligible.some(Boolean)) {
    chipResult = await applyCarpetaDriveChips(
      sheets,
      spreadsheetId,
      sheetId,
      carpetaCol,
      rows,
    );
    if (chipResult.chipsFailed) {
      // Fallback: URLs como hipervínculos (comportamiento anterior)
      const letter = colLetter(sheetCol(carpetaCol));
      const data: { range: string; values: SheetCell[][] }[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (!chipEligible[i]) continue;
        data.push({
          range: `${SHEET_TAB}!${letter}${i + 2}`,
          values: [[rows[i][carpetaCol]]],
        });
      }
      if (data.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          requestBody: {
            valueInputOption: "USER_ENTERED",
            data,
          },
        });
      }
    }
  }

  // Congelar header + moneda en E (crítico). Checkboxes G–J son best-effort:
  // Sheets con "tipos de columna" / chip columns rechazan setDataValidation
  // ("No se puede realizar esta operación en columnas de tipo").
  // Los booleanos TRUE/FALSE ya se escribieron arriba; la sync no debe fallar.
  const dataEndRow = Math.max(rows.length + 1, 2);
  const montoSheetCol = sheetCol(MONTO_COL);
  const boolStartSheet = sheetCol(BOOL_COL_START);
  const boolEndSheet = sheetCol(BOOL_COL_END);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 1 },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: dataEndRow,
              startColumnIndex: montoSheetCol,
              endColumnIndex: montoSheetCol + 1,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: "CURRENCY",
                  pattern: MONTO_CURRENCY_PATTERN,
                },
              },
            },
            fields: "userEnteredFormat.numberFormat",
          },
        },
      ],
    },
  });

  let checkboxValidationApplied = false;
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: dataEndRow,
                startColumnIndex: boolStartSheet,
                endColumnIndex: boolEndSheet,
              },
              rule: {
                condition: { type: "BOOLEAN" },
                showCustomUi: true,
                strict: true,
              },
            },
          },
        ],
      },
    });
    checkboxValidationApplied = true;
  } catch (e) {
    console.warn(
      "[sync-fimba-contrataciones-sheet] setDataValidation checkbox omitido (columnas tipadas u otro rechazo); se dejan TRUE/FALSE",
      e,
    );
  }

  return { ...chipResult, checkboxValidationApplied };
}

type AuthOk = { ok: true; via: "cron" | "ofrn" | "ofrn_session" | "fimba_editor" };
type AuthFail = { ok: false; status: number; error: string };

const OFRN_SYNC_ROLES = [
  "admin",
  "editor",
  "curador",
  "difusion",
  "coord_general",
  "consulta_general",
  "produccion_general",
  "director",
];

function rolesAllowOfrnSync(rolesRaw: unknown): boolean {
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.map((r) => String(r).toLowerCase())
    : [String(rolesRaw || "").toLowerCase()].filter(Boolean);
  return roles.some((r) => OFRN_SYNC_ROLES.includes(r));
}

async function authorizeRequest(
  req: Request,
  body: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
  edicionId: number | null,
): Promise<AuthOk | AuthFail> {
  const cronHdr =
    req.headers.get("x-fimba-contrataciones-sheet-cron-secret") ?? "";
  if (CRON_SECRET && cronHdr === CRON_SECRET) {
    return { ok: true, via: "cron" };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const admin = createClient(supabaseUrl, serviceKey);

  // Staff OFRN: login custom (integrantes + localStorage), sin JWT de GoTrue.
  // Validar id+mail contra BD (mismo patrón que fimbaAuth).
  const ofrnAuth = body?.ofrnAuth as
    | { id?: unknown; mail?: unknown }
    | undefined;
  if (ofrnAuth && typeof ofrnAuth === "object") {
    const id = Number(ofrnAuth.id);
    const mail = String(ofrnAuth.mail || "")
      .trim()
      .toLowerCase();
    if (Number.isFinite(id) && id > 0 && mail) {
      const { data: integ, error } = await admin
        .from("integrantes")
        .select("id, mail, rol_sistema")
        .eq("id", id)
        .maybeSingle();
      if (
        !error &&
        integ &&
        String(integ.mail || "")
          .trim()
          .toLowerCase() === mail &&
        rolesAllowOfrnSync(integ.rol_sistema)
      ) {
        return { ok: true, via: "ofrn_session" };
      }
    }
  }

  if (authHeader.startsWith("Bearer ")) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (!userErr && userData?.user) {
      // GoTrue UUID ≠ integrantes.id (bigint). Match por mail si existe claim.
      const userMail = String(
        userData.user.email ||
          (userData.user.user_metadata as { mail?: string } | undefined)?.mail ||
          "",
      )
        .trim()
        .toLowerCase();
      if (userMail) {
        const { data: integ } = await admin
          .from("integrantes")
          .select("rol_sistema")
          .ilike("mail", userMail)
          .maybeSingle();
        if (integ && rolesAllowOfrnSync(integ.rol_sistema)) {
          return { ok: true, via: "ofrn" };
        }
      }
    }
  }

  // Shell FIMBA externo: editor_general validado contra fimba_usuarios
  const fimbaAuth = body?.fimbaAuth as
    | { id?: unknown; mail?: unknown; id_edicion?: unknown }
    | undefined;
  if (fimbaAuth && typeof fimbaAuth === "object") {
    const id = Number(fimbaAuth.id);
    const mail = String(fimbaAuth.mail || "")
      .trim()
      .toLowerCase();
    const authEdicion = Number(fimbaAuth.id_edicion);
    if (Number.isFinite(id) && mail && Number.isFinite(authEdicion)) {
      const { data: fu, error } = await admin
        .from("fimba_usuarios")
        .select("id, mail, rol_fimba, id_edicion, activo")
        .eq("id", id)
        .maybeSingle();
      if (
        !error &&
        fu &&
        fu.activo !== false &&
        String(fu.mail || "")
          .trim()
          .toLowerCase() === mail &&
        String(fu.rol_fimba || "").trim() === "editor_general" &&
        Number(fu.id_edicion) === authEdicion &&
        (edicionId == null || Number(edicionId) === authEdicion)
      ) {
        return { ok: true, via: "fimba_editor" };
      }
    }
  }

  return {
    ok: false,
    status: 403,
    error:
      "Sin permiso para sincronizar. Requiere staff OFRN (sesión) o editor general FIMBA de la edición.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_URL / SERVICE_ROLE faltantes" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    if (req.method === "POST") {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const force = body?.force === true;
  const requestedEdicion =
    body?.edicionId != null && Number.isFinite(Number(body.edicionId))
      ? Number(body.edicionId)
      : null;

  const auth = await authorizeRequest(
    req,
    body,
    supabaseUrl,
    serviceKey,
    requestedEdicion,
  );
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: stateRow, error: stateErr } = await supabase
    .from("fimba_contrataciones_sheet_sync")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const state = (stateRow || {
    id: 1,
    spreadsheet_id: null,
    spreadsheet_url: null,
    sheet_tab: SHEET_TAB,
    id_edicion: null,
    pending: true,
    syncing_at: null,
    last_synced_at: null,
    last_error: null,
    last_row_count: null,
  }) as SyncState;

  if (state.syncing_at && !force) {
    const syncingSince = Date.parse(state.syncing_at);
    if (!Number.isNaN(syncingSince) && Date.now() - syncingSince < SYNC_LOCK_MS) {
      await supabase
        .from("fimba_contrataciones_sheet_sync")
        .update({ pending: true })
        .eq("id", 1);
      return new Response(
        JSON.stringify({
          success: true,
          busy: true,
          spreadsheetUrl: state.spreadsheet_url,
          message: "Sync en curso; reintentá en unos segundos",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  await supabase
    .from("fimba_contrataciones_sheet_sync")
    .update({
      syncing_at: new Date().toISOString(),
      pending: false,
    })
    .eq("id", 1);

  try {
    const edicionId = await resolveEdicionId(
      supabase,
      requestedEdicion,
      state.id_edicion != null ? Number(state.id_edicion) : null,
    );
    const rows = await fetchContratacionesRows(supabase, edicionId);
    const headers = resolveHeaders();
    const authClient = await getOAuthClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const sheets = google.sheets({ version: "v4", auth: authClient });

    const targetIds = resolveSheetIds();
    if (targetIds.length === 0) {
      throw new Error(
        "Falta FIMBA_CONTRATACIONES_SHEET_IDS / FIMBA_CONTRATACIONES_SHEET_ID",
      );
    }

    type SheetOk = {
      ok: true;
      spreadsheetId: string;
      spreadsheetUrl: string;
      chipsWritten: number;
      chipsFailed: boolean;
      checkboxValidationApplied: boolean;
    };
    type SheetFail = {
      ok: false;
      spreadsheetId: string;
      spreadsheetUrl: string;
      error: string;
    };
    const sheetResults: (SheetOk | SheetFail)[] = [];

    for (const targetId of targetIds) {
      try {
        const sheetMeta = await ensureSpreadsheet(drive, targetId);
        const rewriteResult = await rewriteSheet(
          sheets,
          sheetMeta.spreadsheetId,
          headers,
          rows,
        );
        sheetResults.push({
          ok: true,
          spreadsheetId: sheetMeta.spreadsheetId,
          spreadsheetUrl: sheetMeta.spreadsheetUrl,
          chipsWritten: rewriteResult.chipsWritten,
          chipsFailed: rewriteResult.chipsFailed,
          checkboxValidationApplied: rewriteResult.checkboxValidationApplied,
        });
      } catch (sheetErr) {
        const errMsg = (sheetErr as Error).message || String(sheetErr);
        console.error(
          `[sync-fimba-contrataciones-sheet] falló sheet ${targetId}:`,
          sheetErr,
        );
        sheetResults.push({
          ok: false,
          spreadsheetId: targetId,
          spreadsheetUrl: lockedSheetUrl(targetId),
          error: errMsg,
        });
      }
    }

    const succeeded = sheetResults.filter((r): r is SheetOk => r.ok);
    const failed = sheetResults.filter((r): r is SheetFail => !r.ok);
    const primaryId = targetIds[0];
    const primaryResult = sheetResults.find((r) => r.spreadsheetId === primaryId) ||
      sheetResults[0];
    const primaryOk = primaryResult?.ok === true;

    if (succeeded.length === 0) {
      const msg = failed
        .map((f) => `${f.spreadsheetId}: ${f.error}`)
        .join(" | ");
      throw new Error(
        msg || "Ningún spreadsheet de contrataciones pudo sincronizarse",
      );
    }

    // Sync-state URL = primary if it succeeded; else first success (never hide primary fail).
    const canonical: SheetOk = primaryOk
      ? (primaryResult as SheetOk)
      : succeeded[0];
    const syncedAt = new Date().toISOString();
    const partialError =
      failed.length > 0
        ? failed
            .map((f) => `${f.spreadsheetId}: ${f.error}`)
            .join(" | ")
        : null;
    const primaryFailNote =
      !primaryOk && primaryResult && !primaryResult.ok
        ? `PRIMARY FAILED (${primaryId}): ${primaryResult.error}`
        : null;
    const lastError =
      [primaryFailNote, partialError].filter(Boolean).join(" — ") || null;

    await supabase
      .from("fimba_contrataciones_sheet_sync")
      .update({
        spreadsheet_id: canonical.spreadsheetId,
        spreadsheet_url: canonical.spreadsheetUrl,
        sheet_tab: SHEET_TAB,
        id_edicion: edicionId,
        pending: !primaryOk, // keep pending if primary did not update
        syncing_at: null,
        last_synced_at: syncedAt,
        last_error: lastError,
        last_row_count: rows.length,
      })
      .eq("id", 1);

    const anyCheckboxSkipped = succeeded.some(
      (r) => !r.checkboxValidationApplied,
    );
    const warnings: string[] = [];
    if (!primaryOk) {
      warnings.push(
        `Sheet primario (${primaryId}) falló; se actualizaron ${succeeded.length} mirror(s).`,
      );
    }
    if (failed.length > 0 && primaryOk) {
      warnings.push(
        `${failed.length} sheet(s) fallaron: ${failed
          .map((f) => f.spreadsheetId)
          .join(", ")}`,
      );
    }
    if (anyCheckboxSkipped) {
      warnings.push(
        "Flags escritos como TRUE/FALSE; no se pudo aplicar UI checkbox en al menos un sheet (columnas tipadas u otro rechazo).",
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        partial: failed.length > 0,
        primaryOk,
        edicionId,
        rowCount: rows.length,
        spreadsheetId: canonical.spreadsheetId,
        spreadsheetUrl: canonical.spreadsheetUrl,
        sheetTab: SHEET_TAB,
        spreadsheetIds: targetIds,
        sheetsSucceeded: succeeded.map((r) => ({
          spreadsheetId: r.spreadsheetId,
          spreadsheetUrl: r.spreadsheetUrl,
          carpetaChipsWritten: r.chipsWritten,
          carpetaChipsFailed: r.chipsFailed,
          checkboxValidationApplied: r.checkboxValidationApplied,
        })),
        sheetsFailed: failed.map((r) => ({
          spreadsheetId: r.spreadsheetId,
          spreadsheetUrl: r.spreadsheetUrl,
          error: r.error,
        })),
        syncedAt,
        via: auth.via,
        carpetaChipsWritten: canonical.chipsWritten,
        carpetaChipsFailed: canonical.chipsFailed,
        checkboxValidationApplied: canonical.checkboxValidationApplied,
        ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("[sync-fimba-contrataciones-sheet]", e);
    await supabase
      .from("fimba_contrataciones_sheet_sync")
      .update({
        pending: true,
        syncing_at: null,
        last_error: msg,
      })
      .eq("id", 1);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
