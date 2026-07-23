/**
 * Sincroniza conciertos del año (id_tipo_evento = 1) a un Google Sheet vivo.
 * Crea el Sheet en Drive de Archivo si no existe; reescribe la hoja completa.
 */
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { google } from "npm:googleapis@126.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-conciertos-sheet-cron-secret",
};

const CRON_SECRET = Deno.env.get("CONCIERTOS_SHEET_CRON_SECRET") ?? "";
/** Evita solapar dos syncs concurrentes; el segundo queda `pending`. */
const SYNC_LOCK_MS = 90_000;
/** Sheet compartido (no recrear: el enlace ya circula). Override: CONCIERTOS_SHEET_ID. */
const LOCKED_SHEET_ID =
  Deno.env.get("CONCIERTOS_SHEET_ID") ||
  "1Mkc-vPhOCQlxia6n-LdqKp5limVEXyWSh-khv8gDeJg";
const lockedSheetUrl = (id: string) =>
  `https://docs.google.com/spreadsheets/d/${id}/edit?gid=0#gid=0`;
const SHEET_TAB = "Conciertos";
const ID_TIPO_CONCIERTO = 1;

const HEADERS = [
  "Fecha",
  "Hora",
  "Locación",
  "Localidad",
  "Tipo de programa",
  "Programa",
];

/** Anchos en px tomados del Sheet ajustado manualmente (jul 2026). */
const COLUMN_WIDTHS_PX = [199, 58, 254, 161, 122, 339];

const COLOR = {
  metaBg: { red: 0.97, green: 0.98, blue: 0.99 },
  metaFg: { red: 0.40, green: 0.45, blue: 0.50 },
  headerBg: { red: 0.12, green: 0.25, blue: 0.40 },
  headerFg: { red: 1, green: 1, blue: 1 },
  band1: { red: 1, green: 1, blue: 1 },
  band2: { red: 0.94, green: 0.96, blue: 0.98 },
  border: { red: 0.75, green: 0.78, blue: 0.82 },
};

function solidBorder(width = 1) {
  return {
    style: "SOLID",
    width,
    color: COLOR.border,
  };
}

const CELL_BORDERS = {
  top: solidBorder(),
  bottom: solidBorder(),
  left: solidBorder(),
  right: solidBorder(),
};

type SyncState = {
  id: number;
  spreadsheet_id: string | null;
  spreadsheet_url: string | null;
  pending: boolean;
  syncing_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  last_row_count: number | null;
};

function yearBounds(year: number) {
  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
    title: `Conciertos ${year} — OFRN`,
  };
}

/** Fecha larga es-AR: "miércoles, 22 de julio de 2026" */
function formatFechaLarga(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const iso = dateStr.slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateStr;
  const raw = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

async function fetchConciertosYear(
  supabase: ReturnType<typeof createClient>,
  dateFrom: string,
  dateTo: string,
) {
  const { data, error } = await supabase
    .from("eventos")
    .select(
      `
      id,
      fecha,
      hora_inicio,
      id_tipo_evento,
      programas (
        nombre_gira,
        nomenclador,
        mes_letra,
        tipo
      ),
      locaciones ( nombre, localidades ( localidad ) )
    `,
    )
    .eq("id_tipo_evento", ID_TIPO_CONCIERTO)
    .eq("is_deleted", false)
    .gte("fecha", dateFrom)
    .lte("fecha", dateTo)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) throw new Error(`Query conciertos: ${error.message}`);
  const events = data || [];

  return events.map((evt: any) => {
    const programa = [
      [evt.programas?.nomenclador, evt.programas?.mes_letra].filter(Boolean).join(" - "),
      evt.programas?.nombre_gira || "",
    ]
      .filter(Boolean)
      .join(" — ");
    return [
      formatFechaLarga(evt.fecha) || "-",
      evt.hora_inicio ? String(evt.hora_inicio).slice(0, 5) : "",
      evt.locaciones?.nombre || "-",
      evt.locaciones?.localidades?.localidad || "-",
      evt.programas?.tipo || "-",
      programa || "-",
    ];
  });
}

async function getOAuthClient() {
  const clientId = Deno.env.get("G_CLIENT_ID");
  const clientSecret = Deno.env.get("G_CLIENT_SECRET");
  const refreshToken = Deno.env.get("G_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Faltan G_CLIENT_ID / G_CLIENT_SECRET / G_REFRESH_TOKEN");
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

async function ensureSpreadsheet(
  drive: ReturnType<typeof google.drive>,
  _sheets: ReturnType<typeof google.sheets>,
  existingId: string | null,
  _title: string,
) {
  const spreadsheetId = LOCKED_SHEET_ID || existingId;
  if (!spreadsheetId) {
    throw new Error(
      "Falta CONCIERTOS_SHEET_ID / LOCKED_SHEET_ID: no se crea un Sheet nuevo para no romper enlaces compartidos.",
    );
  }

  const meta = await drive.files.get({
    fileId: spreadsheetId,
    fields: "id, webViewLink, trashed, name",
    supportsAllDrives: true,
  });
  if (!meta.data.id || meta.data.trashed) {
    throw new Error(
      `El Sheet fijado (${spreadsheetId}) no está accesible o está en la papelera. No se recrea para preservar el enlace compartido.`,
    );
  }

  return {
    spreadsheetId: meta.data.id,
    spreadsheetUrl: lockedSheetUrl(meta.data.id),
  };
}

async function rewriteSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  rows: string[][],
  syncedAt: string,
) {
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

  // Releer hoja para bandings actuales (tras posible create)
  const ssFresh = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetMetaFresh = ssFresh.data.sheets?.find(
    (s) => s.properties?.sheetId === sheetId,
  );
  const existingBandings = sheetMetaFresh?.bandedRanges || [];
  const deleteBandingRequests = existingBandings
    .filter((b) => b.bandedRangeId != null)
    .map((b) => ({
      deleteBanding: { bandedRangeId: b.bandedRangeId! },
    }));

  const dataStartRow = 2; // 0-based: fila 3 en UI (tras meta + header)
  const dataEndRow = dataStartRow + rows.length;
  const colCount = HEADERS.length;
  // Limpiar formato/valores en un rango amplio para no dejar restos de syncs viejos
  const clearEndRow = Math.max(dataEndRow + 5, 200);
  const clearEndCol = Math.max(colCount + 4, 12);

  // Limpiar merges viejos de syncs anteriores (ya no fusionamos celdas)
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            unmergeCells: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: Math.max(clearEndRow, 5),
                startColumnIndex: 0,
                endColumnIndex: clearEndCol,
              },
            },
          },
        ],
      },
    });
  } catch {
    /* ok si no había merge */
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_TAB}!A1:Z${clearEndRow}`,
  });

  const metaLabel = `Última sync: ${syncedAt}  ·  ${rows.length} conciertos`;
  const values = [[metaLabel, "", "", "", "", ""], HEADERS, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TAB}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  const widthRequests = COLUMN_WIDTHS_PX.map((pixelSize, i) => ({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: i,
        endIndex: i + 1,
      },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  }));

  const requests: any[] = [
    ...deleteBandingRequests,
    // Reset formato residual
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: clearEndRow,
          startColumnIndex: 0,
          endColumnIndex: clearEndCol,
        },
        cell: { userEnteredFormat: {} },
        fields: "userEnteredFormat",
      },
    },
    ...widthRequests,
    // Fila meta (solo A1; sin merge)
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLOR.metaBg,
            textFormat: {
              italic: true,
              fontSize: 9,
              foregroundColor: COLOR.metaFg,
            },
            verticalAlignment: "MIDDLE",
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,verticalAlignment)",
      },
    },
    // Header
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: COLOR.headerBg,
            textFormat: {
              bold: true,
              fontSize: 10,
              foregroundColor: COLOR.headerFg,
            },
            horizontalAlignment: "CENTER",
            verticalAlignment: "MIDDLE",
            borders: CELL_BORDERS,
          },
        },
        fields:
          "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)",
      },
    },
    // Datos: bordes + wrap + alineación
    ...(rows.length > 0
      ? [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: dataStartRow,
                endRowIndex: dataEndRow,
                startColumnIndex: 0,
                endColumnIndex: colCount,
              },
              cell: {
                userEnteredFormat: {
                  wrapStrategy: "WRAP",
                  verticalAlignment: "MIDDLE",
                  borders: CELL_BORDERS,
                  textFormat: { fontSize: 10 },
                },
              },
              fields:
                "userEnteredFormat(wrapStrategy,verticalAlignment,borders,textFormat)",
            },
          },
          {
            addBanding: {
              bandedRange: {
                range: {
                  sheetId,
                  startRowIndex: dataStartRow,
                  endRowIndex: dataEndRow,
                  startColumnIndex: 0,
                  endColumnIndex: colCount,
                },
                rowProperties: {
                  firstBandColor: COLOR.band1,
                  secondBandColor: COLOR.band2,
                },
              },
            },
          },
          // Hora centrada
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: dataStartRow,
                endRowIndex: dataEndRow,
                startColumnIndex: 1,
                endColumnIndex: 2,
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                  borders: CELL_BORDERS,
                },
              },
              fields:
                "userEnteredFormat(horizontalAlignment,verticalAlignment,borders)",
            },
          },
          // Tipo de programa centrado
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: dataStartRow,
                endRowIndex: dataEndRow,
                startColumnIndex: 4,
                endColumnIndex: 5,
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                  borders: CELL_BORDERS,
                },
              },
              fields:
                "userEnteredFormat(horizontalAlignment,verticalAlignment,borders)",
            },
          },
        ]
      : []),
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 2 },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 1,
          endIndex: 2,
        },
        properties: { pixelSize: 28 },
        fields: "pixelSize",
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

async function authorizeRequest(req: Request, supabaseUrl: string, serviceKey: string) {
  const cronHdr = req.headers.get("x-conciertos-sheet-cron-secret") ?? "";
  if (CRON_SECRET && cronHdr === CRON_SECRET) {
    return { ok: true as const, via: "cron" as const };
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "No autorizado" };
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceKey;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false as const, status: 401, error: "Sesión inválida" };
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: integ } = await admin
    .from("integrantes")
    .select("rol_sistema")
    .eq("id", userData.user.id)
    .maybeSingle();

  const rolesRaw = integ?.rol_sistema;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.map((r) => String(r).toLowerCase())
    : [String(rolesRaw || "").toLowerCase()].filter(Boolean);
  const allowed = roles.some((r) =>
    [
      "admin",
      "editor",
      "curador",
      "difusion",
      "coord_general",
      "consulta_general",
      "produccion_general",
      "director",
    ].includes(r),
  );
  if (!allowed) {
    return { ok: false as const, status: 403, error: "Sin permiso para sincronizar" };
  }
  return { ok: true as const, via: "user" as const };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL / SERVICE_ROLE faltantes" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = await authorizeRequest(req, supabaseUrl, serviceKey);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let force = false;
  let flushPending = false;
  let year = new Date().getFullYear();
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      force = body?.force === true;
      flushPending = body?.flushPending === true;
      if (Number.isFinite(Number(body?.year))) year = Number(body.year);
    }
  } catch {
    /* defaults */
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: stateRow, error: stateErr } = await supabase
    .from("conciertos_sheet_sync")
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
    pending: true,
    syncing_at: null,
    last_synced_at: null,
    last_error: null,
    last_row_count: null,
  }) as SyncState;

  if (state.syncing_at) {
    const syncingSince = Date.parse(state.syncing_at);
    if (!Number.isNaN(syncingSince) && Date.now() - syncingSince < SYNC_LOCK_MS) {
      await supabase
        .from("conciertos_sheet_sync")
        .update({ pending: true })
        .eq("id", 1);
      // force/UI: esperar no aplica; marcar pending para el cron
      if (!force && !flushPending) {
        return new Response(
          JSON.stringify({
            success: true,
            busy: true,
            spreadsheetUrl: state.spreadsheet_url,
            message: "Sync en curso; queda pendiente otro pase",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (flushPending) {
        return new Response(
          JSON.stringify({
            success: true,
            busy: true,
            message: "Sync en curso; pending se reintentará",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  }

  // Cron de pending: sincronizar de inmediato si hay cola
  if (flushPending) {
    if (!state.pending) {
      return new Response(
        JSON.stringify({ success: true, noop: true, message: "Nada pendiente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    force = true;
  }

  await supabase
    .from("conciertos_sheet_sync")
    .update({
      syncing_at: new Date().toISOString(),
      pending: false,
    })
    .eq("id", 1);

  try {
    const { dateFrom, dateTo, title } = yearBounds(year);
    const rows = await fetchConciertosYear(supabase, dateFrom, dateTo);
    const authClient = await getOAuthClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const sheets = google.sheets({ version: "v4", auth: authClient });

    const sheetMeta = await ensureSpreadsheet(
      drive,
      sheets,
      state.spreadsheet_id,
      title,
    );

    const syncedAt = new Date().toISOString();
    await rewriteSheet(sheets, sheetMeta.spreadsheetId, rows, syncedAt);

    await supabase
      .from("conciertos_sheet_sync")
      .update({
        spreadsheet_id: sheetMeta.spreadsheetId,
        spreadsheet_url: sheetMeta.spreadsheetUrl,
        pending: false,
        syncing_at: null,
        last_synced_at: syncedAt,
        last_error: null,
        last_row_count: rows.length,
        year,
      })
      .eq("id", 1);

    return new Response(
      JSON.stringify({
        success: true,
        year,
        rowCount: rows.length,
        spreadsheetId: sheetMeta.spreadsheetId,
        spreadsheetUrl: sheetMeta.spreadsheetUrl,
        syncedAt,
        via: auth.via,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("[sync-conciertos-sheet]", e);
    await supabase
      .from("conciertos_sheet_sync")
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
