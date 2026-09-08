/**
 * Exportación automática por artista FIMBA del MealsReport (cuadro + texto).
 * - Excel multi-hoja (Índice + una hoja por artista)
 * - ZIP de textos pedido (.txt por artista)
 */

import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  buildMealsPedidoText,
  scopeMealsReportRowToArtista,
  ARTISTAS_FIMBA_DIET,
} from "./mealsReportText";
import { fimbaArtistMealDietBreakdown } from "./mealLogistics";

function safeFilePart(s) {
  return String(s || "FIMBA")
    .replace(/[^\w\-ÁÉÍÓÚáéíóúñÑüÜ. +]+/gi, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function excelSheetName(label, used) {
  let base = String(label || "Artista")
    .replace(/[\\/*?[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
  if (!base) base = "Artista";
  let name = base;
  let i = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = `_${i}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

function formatFechaShort(iso) {
  try {
    return format(parseISO(iso), "EEE dd/MM", { locale: es });
  } catch {
    return iso;
  }
}

function collectDiets(rows) {
  const diets = new Set();
  rows.forEach((row) => {
    Object.keys(row.counts || {}).forEach((k) => {
      if (k !== "Total") diets.add(k);
    });
  });
  return Array.from(diets).sort((a, b) => {
    const rank = (d) => {
      if (d === "Estándar" || d === "Regular") return 0;
      if (d === ARTISTAS_FIMBA_DIET) return 2;
      return 1;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, "es");
  });
}

/**
 * Agrupa filas del reporte por artista tagueado (requiere_comidas !== false).
 *
 * @param {object[]} reportRows filas ya filtradas (excepto artista) del MealsReport
 * @param {Map|Record} fimbaPartsByPropuesta
 * @param {(tipo, nota?) => string} labelFn
 * @param {string[]|null} onlyArtistaIds si se pasa, limita el batch
 */
export function buildMealsReportBundlesByArtista(
  reportRows = [],
  fimbaPartsByPropuesta = new Map(),
  labelFn,
  onlyArtistaIds = null,
) {
  const allow =
    onlyArtistaIds?.length > 0
      ? new Set(onlyArtistaIds.map(String))
      : null;

  /** @type {Map<string, { id: string, nombre: string, rows: object[] }>} */
  const map = new Map();

  for (const row of reportRows || []) {
    const props = row.propuestas || [];
    for (const p of props) {
      if (!p?.id) continue;
      if (p.requiere_comidas === false) continue;
      const id = String(p.id);
      if (allow && !allow.has(id)) continue;
      if (!map.has(id)) {
        map.set(id, {
          id,
          nombre: p.nombre || `Artista ${p.id}`,
          rows: [],
        });
      }
      const scoped = scopeMealsReportRowToArtista(
        row,
        id,
        fimbaPartsByPropuesta,
        labelFn,
        fimbaArtistMealDietBreakdown,
      );
      map.get(id).rows.push(scoped);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

async function writeArtistWorkbook(fileName, bundles, giraNombre) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "OFRN / FIMBA";
  wb.created = new Date();

  const index = wb.addWorksheet("Indice");
  index.columns = [
    { header: "Artista", key: "artista", width: 28 },
    { header: "Servicios", key: "servicios", width: 12 },
    { header: "Hoja", key: "hoja", width: 28 },
  ];
  const usedNames = new Set(["indice"]);

  for (const bundle of bundles) {
    const sheetName = excelSheetName(bundle.nombre, usedNames);
    index.addRow({
      artista: bundle.nombre,
      servicios: bundle.rows.length,
      hoja: sheetName,
    });

    const diets = collectDiets(bundle.rows);
    const ws = wb.addWorksheet(sheetName);
    const cols = [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Hora", key: "hora", width: 8 },
      { header: "Servicio", key: "servicio", width: 18 },
      { header: "Lugar", key: "lugar", width: 32 },
      { header: "Total", key: "Total", width: 10 },
      ...diets.map((d) => ({
        header: d === ARTISTAS_FIMBA_DIET ? "Art." : d,
        key: d,
        width: 10,
      })),
    ];
    ws.columns = cols;
    ws.getRow(1).font = { bold: true };

    ws.insertRow(1, [
      `${giraNombre || "Gira"} — ${bundle.nombre}`,
    ]);
    ws.mergeCells(1, 1, 1, cols.length);
    ws.getRow(1).font = { bold: true, size: 12 };
    ws.getRow(2).font = { bold: true };

    for (const row of bundle.rows) {
      const data = {
        fecha: formatFechaShort(row.fecha),
        hora: row.hora || "",
        servicio: row.servicioLabel || row.servicio || "",
        lugar: row.lugar || "",
        Total: row.counts?.Total ?? 0,
      };
      for (const d of diets) {
        data[d] = row.counts?.[d] || "";
      }
      ws.addRow(data);
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeFilePart(fileName)}.xlsx`,
  );
}

async function writeArtistTextZip(fileName, bundles) {
  const { default: PizZip } = await import("pizzip");
  const zip = new PizZip();
  const used = new Set();

  for (const bundle of bundles) {
    let name = `${safeFilePart(bundle.nombre)}_pedido.txt`;
    let i = 2;
    while (used.has(name.toLowerCase())) {
      name = `${safeFilePart(bundle.nombre)}_${i}_pedido.txt`;
      i += 1;
    }
    used.add(name.toLowerCase());
    const text = buildMealsPedidoText(bundle.rows, {
      includeStayBlocks: false,
    });
    const header = `Pedido de alimentación — ${bundle.nombre}\n\n`;
    zip.file(name, header + (text || "(sin servicios)"));
  }

  const blob = zip.generate({
    type: "blob",
    compression: "DEFLATE",
  });
  saveAs(blob, `${safeFilePart(fileName)}.zip`);
}

/**
 * @param {{
 *   reportRows: object[],
 *   fimbaPartsByPropuesta?: Map|Record,
 *   labelFn?: Function,
 *   onlyArtistaIds?: string[]|null,
 *   giraNombre?: string,
 *   modes?: Array<'excel'|'zip'>,
 * }} opts
 */
export async function exportMealsReportByArtista(opts = {}) {
  const {
    reportRows = [],
    fimbaPartsByPropuesta = new Map(),
    labelFn,
    onlyArtistaIds = null,
    giraNombre = "Gira",
    modes = ["excel", "zip"],
  } = opts;

  const bundles = buildMealsReportBundlesByArtista(
    reportRows,
    fimbaPartsByPropuesta,
    labelFn,
    onlyArtistaIds,
  );

  if (!bundles.length) {
    toast.message("No hay artistas con comidas para exportar.");
    return { ok: false, count: 0 };
  }

  const base = `FIMBA_Comidas_por_artista_${safeFilePart(giraNombre)}_${stamp()}`;
  const wanted = new Set(modes);

  try {
    if (wanted.has("excel")) {
      await writeArtistWorkbook(base, bundles, giraNombre);
    }
    if (wanted.has("zip")) {
      await writeArtistTextZip(`${base}_textos`, bundles);
    }
    toast.success(
      `Exportados ${bundles.length} artista${bundles.length === 1 ? "" : "s"}`,
    );
    return { ok: true, count: bundles.length };
  } catch (err) {
    console.error("exportMealsReportByArtista:", err);
    toast.error(err?.message || "No se pudo exportar por artista");
    return { ok: false, count: 0, error: err };
  }
}
