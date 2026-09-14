/**
 * Exportación agrupada del MealsReport (cuadro de dietas + nominados).
 * - Por artista FIMBA: una hoja / .txt por propuesta tagueada
 * - Por locación: una hoja / .txt por lugar de comida
 * Excel multi-hoja (Índice + grupo) y ZIP de textos pedido.
 */

import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  buildMealsPedidoText,
  ARTISTAS_FIMBA_DIET,
  isStandardMealDiet,
} from "./mealsReportText";
import {
  buildMealsReportBundlesByArtista as buildArtistBundles,
  buildMealsReportBundlesByLocacion as buildLocacionBundles,
  sortMealReportRows,
} from "./mealsReportBundles";
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
  let base = String(label || "Grupo")
    .replace(/[\\/*?[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
  if (!base) base = "Grupo";
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

function flattenCasos(rows = []) {
  const out = [];
  for (const row of sortMealReportRows(rows)) {
    for (const caso of row.casos || []) {
      out.push({
        fecha: formatFechaShort(row.fecha),
        hora: row.hora || "",
        servicio: row.servicioLabel || row.servicio || "",
        lugar: row.lugar || "",
        origen: caso.origen || "",
        artista: caso.artista || "",
        apellido: caso.apellido || "",
        nombre: caso.nombre || "",
        alimentacion: caso.alimentacion || "",
        nota: caso.nota || "",
      });
    }
  }
  return out;
}

/**
 * Agrupa filas del reporte por artista tagueado (requiere_comidas !== false).
 */
export function buildMealsReportBundlesByArtista(
  reportRows = [],
  fimbaPartsByPropuesta = new Map(),
  labelFn,
  onlyArtistaIds = null,
) {
  return buildArtistBundles(
    reportRows,
    fimbaPartsByPropuesta,
    labelFn,
    onlyArtistaIds,
    fimbaArtistMealDietBreakdown,
  );
}

/**
 * Agrupa filas del reporte por locación (lugar de comida).
 */
export function buildMealsReportBundlesByLocacion(
  reportRows = [],
  onlyLocKeys = null,
) {
  return buildLocacionBundles(reportRows, onlyLocKeys);
}

async function buildMealsGroupedWorkbookBuffer(bundles, giraNombre, groupLabel) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "OFRN / FIMBA";
  wb.created = new Date();

  const index = wb.addWorksheet("Indice");
  index.columns = [
    { header: groupLabel, key: "grupo", width: 32 },
    { header: "Servicios", key: "servicios", width: 12 },
    { header: "Nominados", key: "nominados", width: 12 },
    { header: "Hoja", key: "hoja", width: 28 },
  ];
  const usedNames = new Set(["indice"]);

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  const specFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FEF3C7" },
  };

  for (const bundle of bundles) {
    const sheetName = excelSheetName(bundle.nombre, usedNames);
    const nominados = flattenCasos(bundle.rows);
    index.addRow({
      grupo: bundle.nombre,
      servicios: bundle.rows.length,
      nominados: nominados.length,
      hoja: sheetName,
    });

    const diets = collectDiets(bundle.rows);
    const ws = wb.addWorksheet(sheetName);
    const summaryCols = [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Hora", key: "hora", width: 8 },
      { header: "Servicio", key: "servicio", width: 18 },
      { header: "Lugar", key: "lugar", width: 32 },
      { header: "Total", key: "Total", width: 10 },
      ...diets.map((d) => ({
        header: d === ARTISTAS_FIMBA_DIET ? "Art." : d,
        key: d,
        width: 12,
      })),
    ];

    ws.mergeCells(1, 1, 1, Math.max(summaryCols.length, 8));
    ws.getCell(1, 1).value = `${giraNombre || "Gira"} — ${bundle.nombre}`;
    ws.getCell(1, 1).font = { bold: true, size: 12 };

    ws.getCell(2, 1).value = "Cuadro por dieta";
    ws.getCell(2, 1).font = { bold: true, italic: true, color: { argb: "FF475569" } };

    const headerRow = ws.getRow(3);
    summaryCols.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true };
      cell.fill = headerFill;
      ws.getColumn(i + 1).width = col.width;
    });

    let excelRow = 4;
    for (const row of bundle.rows) {
      const dataRow = ws.getRow(excelRow);
      dataRow.getCell(1).value = formatFechaShort(row.fecha);
      dataRow.getCell(2).value = row.hora || "";
      dataRow.getCell(3).value = row.servicioLabel || row.servicio || "";
      dataRow.getCell(4).value = row.lugar || "";
      dataRow.getCell(5).value = row.counts?.Total ?? 0;
      diets.forEach((d, i) => {
        dataRow.getCell(6 + i).value = row.counts?.[d] || "";
      });
      excelRow += 1;
    }

    excelRow += 1;
    ws.mergeCells(excelRow, 1, excelRow, 8);
    ws.getCell(excelRow, 1).value =
      "Nominados y especificaciones alimenticias";
    ws.getCell(excelRow, 1).font = {
      bold: true,
      italic: true,
      color: { argb: "FF475569" },
    };
    excelRow += 1;

    const casoHeaders = [
      "Fecha",
      "Hora",
      "Servicio",
      "Lugar",
      "Origen",
      "Artista",
      "Apellido",
      "Nombre",
      "Alimentación",
      "Nota",
    ];
    const casoHeaderRow = ws.getRow(excelRow);
    casoHeaders.forEach((h, i) => {
      const cell = casoHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.fill = headerFill;
      const widths = [14, 8, 18, 28, 10, 22, 18, 16, 16, 28];
      if (ws.getColumn(i + 1).width < widths[i]) {
        ws.getColumn(i + 1).width = widths[i];
      }
    });
    excelRow += 1;

    if (nominados.length === 0) {
      ws.getCell(excelRow, 1).value = "Sin nominados en este grupo.";
      ws.getCell(excelRow, 1).font = { italic: true, color: { argb: "FF64748B" } };
    } else {
      for (const caso of nominados) {
        const dataRow = ws.getRow(excelRow);
        [
          caso.fecha,
          caso.hora,
          caso.servicio,
          caso.lugar,
          caso.origen,
          caso.artista,
          caso.apellido,
          caso.nombre,
          caso.alimentacion,
          caso.nota,
        ].forEach((v, i) => {
          dataRow.getCell(i + 1).value = v;
        });
        if (!isStandardMealDiet(caso.alimentacion)) {
          for (let i = 1; i <= 10; i += 1) {
            dataRow.getCell(i).fill = specFill;
          }
        }
        excelRow += 1;
      }
    }
  }

  index.getRow(1).font = { bold: true };
  return wb.xlsx.writeBuffer();
}

export { buildMealsGroupedWorkbookBuffer };

async function writeGroupedWorkbook(fileName, bundles, giraNombre, groupLabel) {
  const buf = await buildMealsGroupedWorkbookBuffer(
    bundles,
    giraNombre,
    groupLabel,
  );
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${safeFilePart(fileName)}.xlsx`,
  );
}

async function writeGroupedTextZip(fileName, bundles, groupKind) {
  const { default: PizZip } = await import("pizzip");
  const zip = new PizZip();
  const used = new Set();
  const kindLabel = groupKind === "locacion" ? "locación" : "artista";

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
      includeCasos: true,
    });
    const header = `Pedido de alimentación — ${bundle.nombre} (por ${kindLabel})\n\n`;
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
 *   groupBy: 'artista' | 'locacion',
 *   reportRows: object[],
 *   fimbaPartsByPropuesta?: Map|Record,
 *   labelFn?: Function,
 *   onlyArtistaIds?: string[]|null,
 *   onlyLocKeys?: string[]|null,
 *   giraNombre?: string,
 *   modes?: Array<'excel'|'zip'>,
 * }} opts
 */
export async function exportMealsReportGrouped(opts = {}) {
  const {
    groupBy = "artista",
    reportRows = [],
    fimbaPartsByPropuesta = new Map(),
    labelFn,
    onlyArtistaIds = null,
    onlyLocKeys = null,
    giraNombre = "Gira",
    modes = ["excel", "zip"],
  } = opts;

  const bundles =
    groupBy === "locacion"
      ? buildMealsReportBundlesByLocacion(reportRows, onlyLocKeys)
      : buildMealsReportBundlesByArtista(
          reportRows,
          fimbaPartsByPropuesta,
          labelFn,
          onlyArtistaIds,
        );

  const emptyMsg =
    groupBy === "locacion"
      ? "No hay locaciones con comidas para exportar."
      : "No hay artistas con comidas para exportar.";

  if (!bundles.length) {
    toast.message(emptyMsg);
    return { ok: false, count: 0 };
  }

  const slug = groupBy === "locacion" ? "por_locacion" : "por_artista";
  const groupLabel = groupBy === "locacion" ? "Locación" : "Artista";
  const noun = groupBy === "locacion" ? "locación" : "artista";
  const nounPlural = groupBy === "locacion" ? "locaciones" : "artistas";
  const base = `FIMBA_Comidas_${slug}_${safeFilePart(giraNombre)}_${stamp()}`;
  const wanted = new Set(modes);

  try {
    if (wanted.has("excel")) {
      await writeGroupedWorkbook(base, bundles, giraNombre, groupLabel);
    }
    if (wanted.has("zip")) {
      await writeGroupedTextZip(`${base}_textos`, bundles, groupBy);
    }
    toast.success(
      `Exportados ${bundles.length} ${
        bundles.length === 1 ? noun : nounPlural
      }`,
    );
    return { ok: true, count: bundles.length };
  } catch (err) {
    console.error("exportMealsReportGrouped:", err);
    toast.error(err?.message || "No se pudo exportar el reporte de comidas");
    return { ok: false, count: 0, error: err };
  }
}

/** Compat: export por artista (Excel + ZIP). */
export async function exportMealsReportByArtista(opts = {}) {
  return exportMealsReportGrouped({ ...opts, groupBy: "artista" });
}

export async function exportMealsReportByLocacion(opts = {}) {
  return exportMealsReportGrouped({ ...opts, groupBy: "locacion" });
}
