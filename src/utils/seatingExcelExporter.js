import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { sortSeatingItems } from "../services/giraService";
import { integranteKey } from "./integranteIds";
import {
  confirmedSeatingRosterKeySet,
  isConfirmedConvocadoForSeatingReports,
  isMusicianOnConfirmedSeatingRoster,
} from "./seatingRosterGate";
import { seatingStringsGridEvenRowCount } from "./seatingPdfStringsTableHooks";

const isStringInstrument = (id) =>
  ["01", "02", "03", "04"].includes(String(id ?? "").trim());

const cleanHTML = (str) =>
  typeof str === "string" ? str.replace(/<[^>]*>?/gm, "") : "";

const truncate = (str, n) =>
  str && str.length > n ? str.substr(0, n - 1) + "..." : str;

const getComposerName = (obra) => {
  if (obra.obras_compositores?.length > 0) {
    const comps = obra.obras_compositores
      .filter((oc) => oc.rol === "compositor" && oc.compositores)
      .map((oc) => oc.compositores);
    if (comps.length > 0) {
      return comps.map((c) => `${c.nombre} ${c.apellido}`).join("\n");
    }
  }
  return "Autor Desconocido";
};

const autoFitColumns = (worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value;
      const text =
        cellValue && typeof cellValue === "object" && "richText" in cellValue
          ? cellValue.richText.map((t) => t.text).join("")
          : cellValue?.toString() || "";
      const len = text.split("\n").reduce((m, part) => Math.max(m, part.length), 0);
      if (len > maxLength) maxLength = len;
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 40);
  });
};

export const exportSeatingToExcel = async (
  _supabase,
  gira,
  localRepertorio,
  roster,
  assignments,
  containers,
  particellas,
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Seating", {
      views: [{ state: "frozen", ySplit: 3 }],
      properties: { tabColor: { argb: "FF1E293B" } },
    });

    // --- HEADER PRINCIPAL ---
    const title =
      `Seating | ${gira?.mes_letra || ""} - ${gira?.nomenclador || ""}. ${
        gira?.nombre_gira || ""
      }`.trim();
    const headerRow = sheet.addRow([title]);
    headerRow.font = {
      bold: true,
      size: 14,
      color: { argb: "FFFFFFFF" },
      name: "Calibri",
    };
    headerRow.alignment = { horizontal: "left", vertical: "middle" };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    sheet.mergeCells(1, 1, 1, 6);

    const dateRow = sheet.addRow([
      `Generado: ${new Date().toLocaleDateString()}`,
    ]);
    dateRow.font = { size: 10, color: { argb: "FF64748B" }, name: "Calibri" };
    dateRow.alignment = { horizontal: "left" };

    sheet.addRow([]);

    // --- SECCIÓN 1: DISPOSICIÓN DE CUERDAS ---
    const section1TitleRow = sheet.addRow(["Disposición de Cuerdas"]);
    section1TitleRow.font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFFFF" },
      name: "Calibri",
    };
    section1TitleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    section1TitleRow.alignment = { horizontal: "center" };
    sheet.mergeCells(section1TitleRow.number, 1, section1TitleRow.number, 6);

    const validContainers = containers || [];
    const rosterKeys = confirmedSeatingRosterKeySet(roster);

    const itemsConfirmedOnly = (items = []) =>
      (items || []).filter((item) =>
        isMusicianOnConfirmedSeatingRoster(rosterKeys, item.id_musico),
      );

    const rawMaxRows =
      validContainers.length > 0
        ? Math.max(
            ...validContainers.map(
              (c) => itemsConfirmedOnly(c.items).length || 0,
            ),
            0,
          )
        : 0;
    const maxRows = seatingStringsGridEvenRowCount(rawMaxRows);

    if (validContainers.length > 0 && maxRows > 0) {
      const headerValues = validContainers.map((c) => c.nombre?.toUpperCase() || "");
      const tableHeaderRow = sheet.addRow(headerValues);
      tableHeaderRow.font = {
        bold: true,
        size: 10,
        color: { argb: "FFFFFFFF" },
        name: "Calibri",
      };
      tableHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F2937" },
      };
      tableHeaderRow.alignment = { horizontal: "center", vertical: "middle" };

      validContainers.forEach((_, colIndex) => {
        const cell = tableHeaderRow.getCell(colIndex + 1);
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5F5" } },
          left: { style: "thin", color: { argb: "FFCBD5F5" } },
          bottom: { style: "thin", color: { argb: "FFCBD5F5" } },
          right: { style: "thin", color: { argb: "FFCBD5F5" } },
        };
      });

      const thinEdge = { style: "thin", color: { argb: "FFE5E7EB" } };
      const thickStandSep = { style: "medium", color: { argb: "FF475569" } };

      for (let i = 0; i < maxRows; i++) {
        const rowValues = validContainers.map((c) => {
          const sorted = sortSeatingItems(itemsConfirmedOnly(c.items));
          const item = sorted[i];
          if (!item?.integrantes) return "";
          return `${item.integrantes.apellido}, ${item.integrantes.nombre || ""}.`;
        });
        const row = sheet.addRow(rowValues);
        const isEven = i % 2 === 0;
        row.font = { size: 10, name: "Calibri" };
        row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        const sepAfterStandPair = i % 2 === 1;
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFF9FAFB" : "FFE5E7EB" },
          };
          cell.border = {
            top: thinEdge,
            left: thinEdge,
            right: thinEdge,
            bottom: sepAfterStandPair ? thickStandSep : thinEdge,
          };
        });
      }
    } else {
      const noDataRow = sheet.addRow(["No hay grupos de Seating cargados."]);
      noDataRow.font = {
        italic: true,
        color: { argb: "FF9CA3AF" },
        name: "Calibri",
      };
    }

    sheet.addRow([]);

    // --- SECCIÓN 2: ASIGNACIÓN DE PARTICELLAS (VIENTOS Y OTROS) ---
    const section2TitleRow = sheet.addRow([
      "Asignación de Particellas (Vientos y Otros)",
    ]);
    section2TitleRow.font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFFFF" },
      name: "Calibri",
    };
    section2TitleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    section2TitleRow.alignment = { horizontal: "center" };

    const obrasList =
      localRepertorio
        ?.flatMap((block) =>
          block.repertorio_obras?.map((ro) => {
            if (!ro.obras) return null;
            const title = ro.obras.titulo || "Obra";
            const cleanTitle =
              typeof title === "string" ? cleanHTML(title) : "Obra";
            return {
              obra_id: ro.obras.id,
              title: cleanTitle,
              composer: getComposerName(ro.obras),
            };
          }) || [],
        )
        .filter(Boolean) || [];

    if (obrasList.length > 0 && Array.isArray(roster) && roster.length > 0) {
      // IDs de músicos ya presentes en cuerdas
      const stringMusicianIds = new Set(
        (containers || [])
          .flatMap((c) => itemsConfirmedOnly(c.items || []))
          .map((i) => integranteKey(i.id_musico ?? i.id_integrante)),
      );

      const otherMusicians = roster
        .filter((m) => {
          if (!isConfirmedConvocadoForSeatingReports(m)) return false;
          const instrId = String(m.id_instr ?? "").trim();
          const mId = integranteKey(m.id);
          if (stringMusicianIds.has(mId)) return false;
          if (isStringInstrument(instrId)) return false;
          return true;
        })
        .sort((a, b) => {
          const instrA = a.id_instr || "9999";
          const instrB = b.id_instr || "9999";
          if (instrA !== instrB) return instrA.localeCompare(instrB);
          return (a.apellido || "").localeCompare(b.apellido || "");
        });

      const headerValues = [
        "Músico",
        ...obrasList.map(
          (o) =>
            `${truncate(cleanHTML(o.composer), 12)}\n${truncate(
              cleanHTML(o.title),
              18,
            )}`,
        ),
      ];

      const headerRow2 = sheet.addRow(headerValues);
      headerRow2.font = {
        bold: true,
        size: 9,
        color: { argb: "FFFFFFFF" },
        name: "Calibri",
      };
      headerRow2.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      headerRow2.eachCell((cell, colNumber) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colNumber === 1 ? "FF111827" : "FF1F2937" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5F5" } },
          left: { style: "thin", color: { argb: "FFCBD5F5" } },
          bottom: { style: "thin", color: { argb: "FFCBD5F5" } },
          right: { style: "thin", color: { argb: "FFCBD5F5" } },
        };
      });

      otherMusicians.forEach((m, index) => {
        const rowValues = [
          `${m.apellido || ""}, ${m.nombre || ""}`,
          ...obrasList.map((o) => {
            const key = `M-${m.id}-${o.obra_id}`;
            const partId = assignments?.[key];
            const part = particellas?.find(
              (p) => String(p.id) === String(partId),
            );
            return part?.nombre_archivo || "-";
          }),
        ];

        const row = sheet.addRow(rowValues);
        const isEven = index % 2 === 0;
        row.font = { size: 9, name: "Calibri" };
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: colNumber === 1 ? "left" : "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb:
                colNumber === 1
                  ? isEven
                    ? "FFF9FAFB"
                    : "FFE5E7EB"
                  : isEven
                    ? "FFFFFFFF"
                    : "FFF9FAFB",
            },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });
      });
    } else {
      const noDataRow = sheet.addRow([
        "No hay repertorio o músicos de vientos/otros para mostrar asignaciones.",
      ]);
      noDataRow.font = {
        italic: true,
        color: { argb: "FF9CA3AF" },
        name: "Calibri",
      };
    }

    autoFitColumns(sheet);

    const safeName = (gira?.nomenclador || gira?.nombre_gira || "Gira")
      .toString()
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Seating_${safeName}.xlsx`,
    );
  } catch (err) {
    console.error("Error generando Excel Seating:", err);
    alert("Error al generar el Excel de Seating: " + err.message);
  }
};

