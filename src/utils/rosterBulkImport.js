import ExcelJS from "exceljs";
import * as XLSXNS from "xlsx";
import { saveBlobFile, XLSX_MIME } from "./downloadBlob";
import {
  DIET_OPTIONS,
  canonicalizeMealDiet,
  foldDietKey,
  isStandardOfrnDiet,
} from "./dietOptions";

const XLSX = XLSXNS.default || XLSXNS;

export const GENERO_OPTIONS = ["M", "F", "-"];

export const ROSTER_IMPORT_HEADERS = [
  "Apellido",
  "Nombre",
  "Género",
  "Fecha de nacimiento",
  "DNI",
  "CUIL",
  "Teléfono",
  "Mail",
  "Alimentación",
  "Instrumento",
];

const HEADER_ALIASES = {
  apellido: "apellido",
  nombre: "nombre",
  genero: "genero",
  género: "genero",
  sexo: "genero",
  "fecha de nacimiento": "fecha_nac",
  fecha_nacimiento: "fecha_nac",
  fecha_nac: "fecha_nac",
  dni: "dni",
  cuil: "cuil",
  telefono: "telefono",
  teléfono: "telefono",
  mail: "mail",
  email: "mail",
  correo: "mail",
  alimentacion: "alimentacion",
  alimentación: "alimentacion",
  dieta: "alimentacion",
  instrumento: "instrumento",
};

const TEMPLATE_DATA_ROWS = 200;
const TEMPLATE_FILE_NAME = "Plantilla_carga_masiva_roster.xlsx";

/**
 * Enlace «Hacer una copia» de la plantilla maestra en Google Sheets.
 * Configurar en `.env`: VITE_ROSTER_BULK_SHEETS_COPY_URL=https://docs.google.com/spreadsheets/d/<ID>/copy
 */
export const ROSTER_BULK_SHEETS_COPY_URL = String(
  import.meta.env?.VITE_ROSTER_BULK_SHEETS_COPY_URL || "",
).trim();

/** Normaliza un URL de Sheet (edit/view) al endpoint /copy. */
export function toGoogleSheetsCopyUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/\/copy(?:[/?#]|$)/i.test(raw)) return raw;
  const m = raw.match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i,
  );
  if (m?.[1]) return `https://docs.google.com/spreadsheets/d/${m[1]}/copy`;
  return raw;
}

function foldKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cellToText(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value).trim();
}

/**
 * Parsea fecha desde serial Excel, Date, YYYY-MM-DD o DD/MM/YYYY.
 * @returns {string|null} ISO date YYYY-MM-DD o null
 */
export function parseImportDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF?.parse_date_code?.(value);
    if (parsed?.y) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    // Fallback: serial Excel (días desde 1899-12-30)
    const utc = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    if (Number.isNaN(utc.getTime())) return null;
    const y = utc.getUTCFullYear();
    const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
    const d = String(utc.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const text = String(value).trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return null;
}

/**
 * @param {string} raw
 * @returns {{ value: string|null, error?: string }}
 */
export function resolveImportGenero(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { value: null };

  const upper = trimmed.toUpperCase();
  if (GENERO_OPTIONS.includes(upper)) return { value: upper };
  if (trimmed === "-") return { value: "-" };

  const key = foldKey(trimmed);
  if (key === "m" || key === "masculino" || key === "hombre" || key === "varon") {
    return { value: "M" };
  }
  if (key === "f" || key === "femenino" || key === "mujer") {
    return { value: "F" };
  }
  if (key === "-" || key === "ns" || key === "n/c" || key === "nc") {
    return { value: "-" };
  }

  return {
    value: null,
    error: `Género «${trimmed}» no es válido (M, F o -)`,
  };
}

/**
 * @param {string} raw
 * @param {string[]} dietOptions
 * @returns {{ value: string|null, error?: string }}
 */
export function resolveImportDiet(raw, dietOptions = DIET_OPTIONS) {
  const trimmed = String(raw || "").trim();
  // Vacío → null (el indicador de roster avisa; Comidas trata null como Estándar)
  if (!trimmed) return { value: null };

  if (isStandardOfrnDiet(trimmed)) {
    return { value: canonicalizeMealDiet(trimmed) };
  }

  const key = foldDietKey(trimmed);
  const match = (dietOptions || DIET_OPTIONS).find(
    (opt) => foldDietKey(opt) === key,
  );
  if (match) return { value: match };

  return {
    value: null,
    error: `Alimentación «${trimmed}» no es válida`,
  };
}

/**
 * @param {string} raw
 * @param {Map<string, { id: string, instrumento: string, rol_gira_default?: string|null }>} instrumentsByFoldedName
 */
export function resolveImportInstrument(raw, instrumentsByFoldedName) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return { id_instr: null, instrumento: null, rol_gira_default: null };
  }
  const hit = instrumentsByFoldedName?.get(foldKey(trimmed));
  if (!hit) {
    return {
      id_instr: null,
      instrumento: null,
      rol_gira_default: null,
      error: `Instrumento «${trimmed}» no encontrado`,
    };
  }
  return {
    id_instr: hit.id,
    instrumento: hit.instrumento,
    rol_gira_default: hit.rol_gira_default ?? null,
  };
}

/**
 * Construye mapa nombre→instrumento (fold key).
 * @param {Array<{ id: string|number, instrumento?: string, rol_gira_default?: string|null }>} instruments
 */
export function buildInstrumentLookup(instruments) {
  const map = new Map();
  for (const row of instruments || []) {
    const name = String(row?.instrumento || "").trim();
    if (!name) continue;
    map.set(foldKey(name), {
      id: row.id,
      instrumento: name,
      rol_gira_default: row.rol_gira_default ?? null,
    });
  }
  return map;
}

/**
 * Plantilla Excel con dropdowns (hoja oculta de listas).
 * @param {{ dietOptions?: string[], instrumentNames?: string[] }} opts
 */
export async function buildRosterImportTemplate({
  dietOptions = DIET_OPTIONS,
  instrumentNames = [],
} = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OFRN WebApp";
  workbook.created = new Date();

  const diets = (dietOptions.length ? dietOptions : DIET_OPTIONS).slice();
  const instruments = (instrumentNames || []).filter(Boolean);

  // Personas primero para que sea la hoja activa al abrir
  const sheet = workbook.addWorksheet("Personas");
  ROSTER_IMPORT_HEADERS.forEach((header, idx) => {
    const cell = sheet.getCell(1, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4338CA" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  sheet.getRow(1).height = 20;
  sheet.columns = [
    { width: 18 },
    { width: 16 },
    { width: 10 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 28 },
    { width: 16 },
    { width: 22 },
  ];

  const lastDataRow = TEMPLATE_DATA_ROWS + 1;

  // Formato + validación de fecha (columna D)
  sheet.getColumn(4).numFmt = "dd/mm/yyyy";
  sheet.dataValidations.add(`D2:D${lastDataRow}`, {
    type: "date",
    operator: "between",
    allowBlank: true,
    formulae: [new Date(Date.UTC(1900, 0, 1)), new Date(Date.UTC(2100, 11, 31))],
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Fecha de nacimiento",
    error: "Ingresá una fecha válida (ej. 15/03/2000)",
    showInputMessage: true,
    promptTitle: "Fecha",
    prompt: "Formato: DD/MM/AAAA",
  });

  // Listas en hoja oculta (después de Personas)
  const lists = workbook.addWorksheet("_listas");
  lists.state = "hidden";
  diets.forEach((label, i) => {
    lists.getCell(i + 1, 1).value = label;
  });
  instruments.forEach((label, i) => {
    lists.getCell(i + 1, 2).value = label;
  });
  GENERO_OPTIONS.forEach((label, i) => {
    lists.getCell(i + 1, 3).value = label;
  });

  const dietEnd = Math.max(diets.length, 1);
  const instrEnd = Math.max(instruments.length, 1);
  const generoEnd = GENERO_OPTIONS.length;

  sheet.dataValidations.add(`C2:C${lastDataRow}`, {
    type: "list",
    allowBlank: true,
    formulae: [`'_listas'!$C$1:$C$${generoEnd}`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Género",
    error: "Elegí M, F o -",
  });

  // Alimentación = I, Instrumento = J (tras agregar CUIL)
  sheet.dataValidations.add(`I2:I${lastDataRow}`, {
    type: "list",
    allowBlank: true,
    formulae: [`'_listas'!$A$1:$A$${dietEnd}`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Alimentación",
    error: "Elegí un valor de la lista",
  });

  sheet.dataValidations.add(`J2:J${lastDataRow}`, {
    type: "list",
    allowBlank: true,
    formulae: [`'_listas'!$B$1:$B$${instrEnd}`],
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Instrumento",
    error: "Elegí un instrumento de la lista",
  });

  workbook.views = [{ activeTab: 0 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME });
  await saveBlobFile(blob, TEMPLATE_FILE_NAME);
  return TEMPLATE_FILE_NAME;
}

function mapHeader(raw) {
  const key = foldKey(raw).replace(/\s+/g, " ");
  return HEADER_ALIASES[key] || null;
}

/**
 * @param {File|ArrayBuffer|Uint8Array} file
 * @param {{ instrumentsByName?: Map, dietOptions?: string[] }} opts
 */
export async function parseRosterImportFile(file, opts = {}) {
  const {
    instrumentsByName = new Map(),
    dietOptions = DIET_OPTIONS,
  } = opts;

  const buffer =
    file instanceof ArrayBuffer
      ? file
      : file instanceof Uint8Array
        ? file
        : await file.arrayBuffer();

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    workbook.SheetNames.find((n) => foldKey(n) === "personas") ||
    workbook.SheetNames.find((n) => foldKey(n) !== "_listas") ||
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { rows: [], validCount: 0, errorCount: 0, parseError: "Hoja vacía" };
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!matrix.length) {
    return { rows: [], validCount: 0, errorCount: 0, parseError: "Archivo vacío" };
  }

  const headerRow = matrix[0] || [];
  const colMap = {};
  headerRow.forEach((h, idx) => {
    const mapped = mapHeader(h);
    if (mapped) colMap[mapped] = idx;
  });

  if (colMap.apellido == null || colMap.nombre == null) {
    return {
      rows: [],
      validCount: 0,
      errorCount: 0,
      parseError:
        "Faltan columnas obligatorias «Apellido» y «Nombre». Usá la plantilla descargable.",
    };
  }

  /** @type {Array<object>} */
  const rows = [];
  const dniSeen = new Map();

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    const excelRow = i + 1;
    const get = (key) => {
      const idx = colMap[key];
      if (idx == null) return "";
      return line[idx];
    };

    const apellido = cellToText(get("apellido"));
    const nombre = cellToText(get("nombre"));
    if (!apellido && !nombre) continue;

    const errors = [];
    const warnings = [];

    if (!apellido) errors.push("Apellido obligatorio");
    if (!nombre) errors.push("Nombre obligatorio");

    const fechaRaw = get("fecha_nac");
    let fecha_nac = null;
    if (fechaRaw !== "" && fechaRaw != null) {
      fecha_nac = parseImportDate(fechaRaw);
      if (!fecha_nac) {
        errors.push(
          `Fecha de nacimiento inválida («${cellToText(fechaRaw)}»)`,
        );
      }
    }

    const generoRes = resolveImportGenero(get("genero"));
    if (generoRes.error) errors.push(generoRes.error);

    const dni = cellToText(get("dni")).replace(/\s+/g, "");
    const cuil = cellToText(get("cuil")).replace(/\s+/g, "");
    const telefono = cellToText(get("telefono"));
    const mail = cellToText(get("mail"));

    const dietRes = resolveImportDiet(get("alimentacion"), dietOptions);
    if (dietRes.error) errors.push(dietRes.error);

    const instrRes = resolveImportInstrument(
      get("instrumento"),
      instrumentsByName,
    );
    if (instrRes.error) errors.push(instrRes.error);

    if (dni) {
      const dniKey = foldKey(dni);
      if (dniSeen.has(dniKey)) {
        errors.push(
          `DNI duplicado en el archivo (también en fila ${dniSeen.get(dniKey)})`,
        );
      } else {
        dniSeen.set(dniKey, excelRow);
      }
    }

    rows.push({
      excelRow,
      apellido,
      nombre,
      genero: generoRes.value,
      fecha_nac,
      dni: dni || null,
      cuil: cuil || null,
      telefono: telefono || null,
      mail: mail || null,
      alimentacion: dietRes.value,
      id_instr: instrRes.id_instr,
      instrumento: instrRes.instrumento,
      rol_gira_default: instrRes.rol_gira_default,
      errors,
      warnings,
      ok: errors.length === 0,
    });
  }

  const validCount = rows.filter((r) => r.ok).length;
  const errorCount = rows.length - validCount;

  return { rows, validCount, errorCount, parseError: null };
}

/**
 * Marca filas con DNI ya existentes en el padrón.
 * @param {Array<object>} rows
 * @param {Set<string>} existingDniFolded
 */
export function applyExistingDniErrors(rows, existingDniFolded) {
  if (!existingDniFolded?.size) return rows;
  return rows.map((row) => {
    if (!row.dni) return row;
    const key = foldKey(row.dni);
    if (!existingDniFolded.has(key)) return row;
    const errors = [...(row.errors || [])];
    if (!errors.some((e) => e.includes("ya existe"))) {
      errors.push(`DNI ${row.dni} ya existe en el padrón`);
    }
    return { ...row, errors, ok: false };
  });
}

export function foldDniKey(dni) {
  return foldKey(String(dni || "").replace(/\s+/g, ""));
}
